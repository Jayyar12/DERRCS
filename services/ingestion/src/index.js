const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { testConnection } = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

const PORT = process.env.API_PORT || 5000;

// Standard Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '../../../uploads')));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'derrcs-ingestion-service',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/reports', require('./routes/reports'));
app.use('/api/v1/candidates', require('./routes/candidates'));
app.use('/api/v1/incidents', require('./routes/incidents'));
app.use('/api/v1/assignments', require('./routes/assignments'));
app.use('/api/v1/units', require('./routes/units'));

// WebSocket Connection Handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Start server after confirming database connectivity
testConnection().then(() => {
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`DERRCS Ingestion & State Machine Service`);
    console.log(`Server listening on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`====================================================`);
  });
});
