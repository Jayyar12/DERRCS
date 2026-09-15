const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

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

// Citizen Report Ingestion Endpoint (Matches api-contracts.md)
app.post('/api/v1/reports', (req, res) => {
  const { sessionId, emergencyType, description, reporterCoordinates, emergencyCoordinates, photoUrl, standardizedAnswers } = req.body;

  if (!emergencyType || !emergencyCoordinates) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'emergencyType and emergencyCoordinates are required.'
      }
    });
  }

  const reportId = require('crypto').randomUUID();
  const receivedAt = new Date().toISOString();

  // Broadcast event to connected dispatchers via Socket.IO
  io.emit('report:received', {
    reportId,
    emergencyType,
    emergencyCoordinates,
    receivedAt
  });

  return res.status(201).json({
    success: true,
    data: {
      reportId,
      status: 'Received',
      receivedAt
    }
  });
});

// WebSocket Connection Handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`DERRCS Ingestion & State Machine Service`);
  console.log(`Server listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});
