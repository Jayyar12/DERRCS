/**
 * DERRCS Ingestion Service — Entry Point
 *
 * Responsibilities:
 *  1. Start Express + HTTP server.
 *  2. Initialize Socket.IO with JWT authentication middleware and room assignments.
 *  3. Connect to PostgreSQL (hard dependency — exits on failure).
 *  4. Connect to RabbitMQ and bind consumers:
 *       cluster.completed          → dispatchers room  (dispatcher:candidate:new)
 *       unit.assigned              → unit:<unit_id>    (unit:dispatch:alert)
 *       field.assessment.completed → dispatchers room  (dispatcher:field:resolved)
 *  5. Start the escalation background worker.
 *  6. Register graceful shutdown handlers.
 */

'use strict';

const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const dotenv     = require('dotenv');
const jwt        = require('jsonwebtoken');
const amqp       = require('amqplib');

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { testConnection }  = require('./config/db');
const { connectRabbitMQ, closeRabbitMQ, EXCHANGE_NAME } = require('./config/rabbitmq');
const escalationWorker    = require('./workers/escalationWorker');

// ---------------------------------------------------------------------------
// Express + HTTP server
// ---------------------------------------------------------------------------
const app    = express();
const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Socket.IO — with JWT authentication middleware
// ---------------------------------------------------------------------------
const io = new Server(server, {
  cors: {
    origin:  process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
  // Use polling as fallback; websocket preferred
  transports: ['websocket', 'polling'],
});

/**
 * Socket.IO authentication middleware.
 * Reads a Bearer token from socket.handshake.auth.token or
 * the Authorization header (for HTTP upgrade requests).
 * Attaches decoded { userId, username, role } to socket.data.user.
 */
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization || '').replace('Bearer ', '').trim();

    if (!token) {
      return next(new Error('SOCKET_UNAUTHORIZED: Missing auth token.'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.user = decoded; // { userId, username, role, unitId? }
    next();
  } catch (err) {
    next(new Error('SOCKET_UNAUTHORIZED: Invalid or expired token.'));
  }
});

/**
 * Connection handler — assigns each socket to the correct room(s):
 *  - Dispatchers and Admins → "dispatchers" room
 *  - ResponseUnits          → "unit:<unitId>" room
 *  - All authenticated      → personal "user:<userId>" room
 */
io.on('connection', (socket) => {
  const { userId, username, role, unitId } = socket.data.user;

  console.log(`[Socket.IO] Connected: ${socket.id} | user=${username} | role=${role}`);

  // Everyone gets a personal room
  socket.join(`user:${userId}`);

  if (role === 'Dispatcher' || role === 'Admin') {
    socket.join('dispatchers');
    console.log(`[Socket.IO] ${username} joined room: dispatchers`);
  }

  if (role === 'ResponseUnit') {
    if (unitId) {
      socket.join(`unit:${unitId}`);
      console.log(`[Socket.IO] ${username} joined room: unit:${unitId}`);
    } else {
      console.warn(`[Socket.IO] ResponseUnit ${username} has no unitId in token; skipping unit room.`);
    }
  }

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Disconnected: ${socket.id} | user=${username} | reason=${reason}`);
  });
});

// ---------------------------------------------------------------------------
// Express standard middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '../../../uploads')));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({
    status:    'healthy',
    service:   'derrcs-ingestion-service',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/v1/auth',        require('./routes/auth'));
app.use('/api/v1/reports',     require('./routes/reports'));
app.use('/api/v1/candidates',  require('./routes/candidates'));
app.use('/api/v1/incidents',   require('./routes/incidents'));
app.use('/api/v1/assignments', require('./routes/assignments'));
app.use('/api/v1/units',       require('./routes/units'));

// ---------------------------------------------------------------------------
// RabbitMQ consumer setup
// ---------------------------------------------------------------------------

/**
 * Emits a Socket.IO event to a room and returns whether any sockets received it.
 * Logs a warning when the room is empty but does NOT block the caller.
 *
 * @param {string} room    - Target Socket.IO room name.
 * @param {string} event   - Event name to emit.
 * @param {object} payload - Event payload.
 * @returns {boolean} true if the room had at least one socket, false otherwise.
 */
function emitToRoom(room, event, payload) {
  const socketsInRoom = io.sockets.adapter.rooms.get(room);
  if (!socketsInRoom || socketsInRoom.size === 0) {
    console.warn(`[Socket.IO] Room "${room}" is empty — event "${event}" buffered (no active connections).`);
    // Still emit; Socket.IO will broadcast to 0 recipients — not an error.
  }
  io.to(room).emit(event, payload);
  return !!(socketsInRoom && socketsInRoom.size > 0);
}

/**
 * Binds all RabbitMQ consumers to the shared topic exchange.
 * Each consumer asserts its own durable queue, binds a routing key,
 * and acks only AFTER the Socket.IO emit completes.
 *
 * Queues:
 *   ingestion.cluster.completed          ← cluster.completed
 *   ingestion.unit.assigned              ← unit.assigned
 *   ingestion.field.assessment.completed ← field.assessment.completed
 *
 * @param {import('amqplib').Channel} channel - An open AMQP channel.
 */
async function bindConsumers(channel) {
  // Prefetch 1 so consumers process messages one at a time;
  // prevents overwhelming Socket.IO on burst traffic.
  await channel.prefetch(1);

  // ─── Consumer 1: candidate.created → dispatchers ──────────────────────────
  const clusterQueue = 'ingestion.candidate.created';
  await channel.assertQueue(clusterQueue, { durable: true });
  await channel.bindQueue(clusterQueue, EXCHANGE_NAME, 'candidate.created');

  channel.consume(clusterQueue, (msg) => {
    if (!msg) return; // Broker sent null (queue cancelled)

    try {
      const payload = JSON.parse(msg.content.toString());
      emitToRoom('dispatchers', 'dispatcher:candidate:new', payload);
      channel.ack(msg);
    } catch (err) {
      console.error('[Consumer] candidate.created parse error:', err.message);
      // Nack without requeue to avoid poison-pill loops
      channel.nack(msg, false, false);
    }
  });

  console.log(`[RabbitMQ] Consumer bound: candidate.created → dispatcher:candidate:new`);

  // ─── Consumer 2a: assignment.recommended → dispatchers ───────────────────────────
  const recommendQueue = 'ingestion.assignment.recommended';
  await channel.assertQueue(recommendQueue, { durable: true });
  await channel.bindQueue(recommendQueue, EXCHANGE_NAME, 'assignment.recommended');

  channel.consume(recommendQueue, (msg) => {
    if (!msg) return;

    try {
      const payload  = JSON.parse(msg.content.toString());
      emitToRoom('dispatchers', 'dispatcher:assignment:recommended', payload);
      channel.ack(msg);
    } catch (err) {
      console.error('[Consumer] assignment.recommended parse error:', err.message);
      channel.nack(msg, false, false);
    }
  });

  console.log(`[RabbitMQ] Consumer bound: assignment.recommended → dispatcher:assignment:recommended`);

  // ─── Consumer 2b: unit.assigned → unit:<unit_id> ───────────────────────────
  const unitQueue = 'ingestion.unit.assigned';
  await channel.assertQueue(unitQueue, { durable: true });
  await channel.bindQueue(unitQueue, EXCHANGE_NAME, 'unit.assigned');

  channel.consume(unitQueue, (msg) => {
    if (!msg) return;

    try {
      const payload  = JSON.parse(msg.content.toString());
      const { unitId } = payload;

      if (!unitId) {
        console.error('[Consumer] unit.assigned message missing unitId; nacking.', payload);
        channel.nack(msg, false, false);
        return;
      }

      emitToRoom(`unit:${unitId}`, 'unit:dispatch:alert', payload);
      channel.ack(msg);
    } catch (err) {
      console.error('[Consumer] unit.assigned parse error:', err.message);
      channel.nack(msg, false, false);
    }
  });

  console.log(`[RabbitMQ] Consumer bound: unit.assigned → unit:dispatch:alert`);

  // ─── Consumer 3: field.assessment.submitted → dispatchers ─────────────────
  const fieldQueue = 'ingestion.field.assessment.submitted';
  await channel.assertQueue(fieldQueue, { durable: true });
  await channel.bindQueue(fieldQueue, EXCHANGE_NAME, 'field.assessment.submitted');

  channel.consume(fieldQueue, (msg) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());
      emitToRoom('dispatchers', 'dispatcher:field:resolved', payload);
      channel.ack(msg);
    } catch (err) {
      console.error('[Consumer] field.assessment.submitted parse error:', err.message);
      channel.nack(msg, false, false);
    }
  });

  console.log(`[RabbitMQ] Consumer bound: field.assessment.submitted → dispatcher:field:resolved`);
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
async function shutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);

  escalationWorker.stop();

  await closeRabbitMQ();

  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });

  // Force exit after 10 s if something hangs
  setTimeout(() => {
    console.error('[Server] Forced exit after 10 s timeout.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ---------------------------------------------------------------------------
// Startup sequence
// ---------------------------------------------------------------------------
const PORT = process.env.API_PORT || 5000;

testConnection().then(async () => {
  server.listen(PORT, () => {
    console.log('====================================================');
    console.log('DERRCS Ingestion & State Machine Service');
    console.log(`Server listening on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('====================================================');
  });

  // Start escalation background worker (requires DB + Socket.IO to be ready)
  escalationWorker.start(io);

  // Connect RabbitMQ and bind all consumers
  try {
    const channel = await connectRabbitMQ();
    if (channel) {
      await bindConsumers(channel);
    } else {
      console.error('[RabbitMQ] No channel returned; consumers not bound.');
    }
  } catch (err) {
    console.error('[RabbitMQ] Consumer setup failed:', err.message);
  }
});
