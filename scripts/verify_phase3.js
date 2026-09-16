#!/usr/bin/env node
/**
 * DERRCS Phase 3 — Verification Script
 *
 * Demonstrates:
 *   Test 1 — Rejected invalid state transition (Reported -> Active, skips states)
 *   Test 2 — Escalation event fires after threshold (manual trigger via direct poll)
 *   Test 3 — Simulated RabbitMQ cluster.completed event routes to dispatchers room
 *
 * Prerequisites:
 *   1. The ingestion service must be running (npm run dev / npm start).
 *   2. Set the environment variables below or export them before running.
 *   3. You need a valid Dispatcher JWT and a ResponseUnit JWT + unitId.
 *
 * Usage:
 *   node scripts/verify_phase3.js
 *
 * Expected output:
 *   [TEST 1] ✅ Invalid transition correctly rejected: "..."
 *   [TEST 2] ✅ Escalation received: { incidentId, escalationLevel: 1, ... }
 *   [TEST 3] ✅ dispatcher:candidate:new received: { candidateId, ... }
 */

'use strict';

const http     = require('http');
const amqp     = require('amqplib');
const { io: ioClient } = require('socket.io-client');
const path     = require('path');
const dotenv   = require('dotenv');

// Load .env from repo root (adjust path if running from elsewhere)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ---------------------------------------------------------------------------
// Configuration — override via environment variables
// ---------------------------------------------------------------------------
const SERVICE_URL    = process.env.VERIFY_SERVICE_URL  || 'http://localhost:5000';
const RABBITMQ_URL   = process.env.RABBITMQ_URL
  || `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || 5672}`;
const EXCHANGE_NAME  = 'derrcs.events';

// Replace with real tokens and IDs from your running database
const DISPATCHER_JWT = process.env.VERIFY_DISPATCHER_JWT || 'REPLACE_WITH_DISPATCHER_JWT';
const UNIT_JWT       = process.env.VERIFY_UNIT_JWT       || 'REPLACE_WITH_UNIT_JWT';
const UNIT_ID        = process.env.VERIFY_UNIT_ID        || 'REPLACE_WITH_UNIT_UUID';
// An incident that is in Reported state (for TEST 1)
const REPORTED_INCIDENT_ID = process.env.VERIFY_INCIDENT_ID || 'REPLACE_WITH_INCIDENT_UUID';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function jsonPost(url, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = new URL(url);
    const req  = http.request({
      hostname: opts.hostname,
      port:     opts.port,
      path:     opts.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization':  `Bearer ${token}`,
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// TEST 1 — Rejected invalid state transition
// ---------------------------------------------------------------------------
async function test1_invalidTransition() {
  console.log('\n──────────────────────────────────────────────────');
  console.log('[TEST 1] Invalid state transition (Reported -> Active)');
  console.log('──────────────────────────────────────────────────');

  // The incidents route internally calls stateMachine.transition().
  // We attempt to close a Reported incident, which skips 4 states.
  const url = `${SERVICE_URL}/api/v1/incidents/${REPORTED_INCIDENT_ID}/close`;

  // Send a PATCH to an endpoint that should call stateMachine.transition(id, 'Closed')
  // For a quick verification without a dedicated /close route, we can call the
  // state machine directly via the library. Here we simulate what the HTTP
  // layer would do by hitting a valid endpoint with a broken payload:

  // Instead, demonstrate via a direct stateMachine call in a child process:
  const { transition, InvalidStateTransitionError } = await (async () => {
    try {
      // Resolve from the script's location
      return require('../services/ingestion/src/services/stateMachine');
    } catch {
      // If running from repo root
      return require('./services/ingestion/src/services/stateMachine');
    }
  })();

  const dotenvPath = path.resolve(__dirname, '../.env');
  dotenv.config({ path: dotenvPath });
  // Re-require db after env is loaded
  try {
    const result = await transition(REPORTED_INCIDENT_ID, 'Active', null);
    console.log('[TEST 1] ❌ Expected rejection but got:', result);
  } catch (err) {
    if (err.name === 'InvalidStateTransitionError') {
      console.log('[TEST 1] ✅ Invalid transition correctly rejected:');
      console.log(`         ${err.message}`);
      console.log(`         incidentId:   ${err.incidentId}`);
      console.log(`         currentState: ${err.currentState}`);
      console.log(`         targetState:  ${err.targetState}`);
    } else {
      console.log('[TEST 1] ⚠️  Unexpected error (check DB connection):', err.message);
    }
  }
}

// ---------------------------------------------------------------------------
// TEST 2 — Escalation event via Socket.IO
// ---------------------------------------------------------------------------
async function test2_escalation() {
  console.log('\n──────────────────────────────────────────────────');
  console.log('[TEST 2] Escalation event (connect as Dispatcher, wait for emission)');
  console.log('──────────────────────────────────────────────────');
  console.log('         Listening for dispatcher:incident:escalated for 60 s...');
  console.log('         (Ensure there is a Reported incident older than 5 minutes in DB)');

  return new Promise((resolve) => {
    const socket = ioClient(SERVICE_URL, {
      auth: { token: DISPATCHER_JWT },
      transports: ['websocket'],
    });

    const timer = setTimeout(() => {
      console.log('[TEST 2] ⏱️  No escalation received in 60 s — check thresholds and DB data.');
      socket.disconnect();
      resolve();
    }, 60_000);

    socket.on('connect', () => {
      console.log('[TEST 2] Dispatcher socket connected:', socket.id);
    });

    socket.on('dispatcher:incident:escalated', (payload) => {
      clearTimeout(timer);
      console.log('[TEST 2] ✅ Escalation received:');
      console.log('        ', JSON.stringify(payload, null, 2));
      socket.disconnect();
      resolve();
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      console.log('[TEST 2] ❌ Socket connection error:', err.message);
      socket.disconnect();
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// TEST 3 — RabbitMQ cluster.completed → dispatcher:candidate:new
// ---------------------------------------------------------------------------
async function test3_rabbitMQRouting() {
  console.log('\n──────────────────────────────────────────────────');
  console.log('[TEST 3] RabbitMQ cluster.completed → dispatcher:candidate:new');
  console.log('──────────────────────────────────────────────────');

  // Step A: Connect a Dispatcher Socket.IO client and listen for the event
  const received = new Promise((resolve) => {
    const socket = ioClient(SERVICE_URL, {
      auth: { token: DISPATCHER_JWT },
      transports: ['websocket'],
    });

    const timeout = setTimeout(() => {
      console.log('[TEST 3] ⏱️  No event received in 5 s.');
      socket.disconnect();
      resolve(null);
    }, 5_000);

    socket.on('connect', async () => {
      console.log('[TEST 3] Dispatcher socket connected:', socket.id);

      // Step B: Publish a cluster.completed message to RabbitMQ
      try {
        const conn    = await amqp.connect(RABBITMQ_URL);
        const channel = await conn.createChannel();
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

        const payload = {
          candidateId:   'test-candidate-' + Date.now(),
          clusterLabel:  'VERIFY-TEST-CLUSTER',
          emergencyType: 'Fire',
          reportCount:   3,
          location:      { lat: 8.5275, lng: 124.7459 },
          summary:       'Verification test cluster from verify_phase3.js',
          createdAt:     new Date().toISOString(),
        };

        channel.publish(
          EXCHANGE_NAME,
          'cluster.completed',
          Buffer.from(JSON.stringify(payload)),
          { contentType: 'application/json', persistent: true }
        );

        console.log('[TEST 3] Published cluster.completed to RabbitMQ:', payload.candidateId);
        await channel.close();
        await conn.close();
      } catch (err) {
        clearTimeout(timeout);
        console.log('[TEST 3] ❌ RabbitMQ publish error:', err.message);
        socket.disconnect();
        resolve(null);
      }
    });

    socket.on('dispatcher:candidate:new', (data) => {
      clearTimeout(timeout);
      resolve({ socket, data });
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      console.log('[TEST 3] ❌ Socket connection error:', err.message);
      resolve(null);
    });
  });

  const result = await received;
  if (result) {
    console.log('[TEST 3] ✅ dispatcher:candidate:new received:');
    console.log('        ', JSON.stringify(result.data, null, 2));
    result.socket.disconnect();
  }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
(async () => {
  console.log('==============================================');
  console.log('DERRCS Phase 3 — Verification Suite');
  console.log(`Service: ${SERVICE_URL}`);
  console.log('==============================================');

  if (
    DISPATCHER_JWT === 'REPLACE_WITH_DISPATCHER_JWT' ||
    REPORTED_INCIDENT_ID === 'REPLACE_WITH_INCIDENT_UUID'
  ) {
    console.warn('\n⚠️  WARNING: Placeholder values detected.');
    console.warn('   Set environment variables before running:');
    console.warn('   VERIFY_DISPATCHER_JWT, VERIFY_UNIT_JWT, VERIFY_UNIT_ID, VERIFY_INCIDENT_ID\n');
  }

  await test1_invalidTransition();
  await test3_rabbitMQRouting();
  await test2_escalation(); // runs last because it can block up to 60 s

  console.log('\n==============================================');
  console.log('Verification complete.');
  console.log('==============================================');
  process.exit(0);
})();
