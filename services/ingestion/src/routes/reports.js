/**
 * DERRCS Citizen Report Ingestion Route
 * POST /api/v1/reports
 * Validates input, saves to PostgreSQL with PostGIS spatial point, and returns the report ID.
 */

const express = require('express');
const { query } = require('../config/db');
const upload = require('../middleware/upload');

const router = express.Router();

/**
 * @route  POST /api/v1/reports
 * @desc   Submit a new citizen emergency report. Stores location as PostGIS point.
 * @access Public (rate-limited by IP)
 */
router.post('/', upload.single('photo'), async (req, res) => {
  const {
    sessionId,
    emergencyType,
    description,
    reporterCoordinates,
    emergencyCoordinates,
    standardizedAnswers
  } = req.body;

  // Parse nested JSON if sent as multipart/form-data string
  let parsedEmergency = emergencyCoordinates;
  let parsedReporter = reporterCoordinates;
  let parsedAnswers = standardizedAnswers;

  try {
    if (typeof emergencyCoordinates === 'string') parsedEmergency = JSON.parse(emergencyCoordinates);
    if (typeof reporterCoordinates === 'string') parsedReporter = JSON.parse(reporterCoordinates);
    if (typeof standardizedAnswers === 'string') parsedAnswers = JSON.parse(standardizedAnswers);
  } catch {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON in coordinates or standardizedAnswers.' }
    });
  }

  if (!emergencyType || !parsedEmergency) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'emergencyType and emergencyCoordinates are required.' }
    });
  }

  const { latitude: eLat, longitude: eLng } = parsedEmergency;

  if (eLat < -90 || eLat > 90 || eLng < -180 || eLng > 180) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Latitude must be between -90 and 90, and longitude between -180 and 180.'
      }
    });
  }

  // Build optional reporter location point
  let reporterPoint = null;
  if (parsedReporter) {
    const { latitude: rLat, longitude: rLng } = parsedReporter;
    reporterPoint = `ST_SetSRID(ST_MakePoint(${rLng}, ${rLat}), 4326)`;
  }

  // Resolve uploaded photo URL or use provided photoUrl
  const photoUrl = req.file
    ? `/uploads/${req.file.filename}`
    : (req.body.photoUrl || null);

  try {
    const result = await query(
      `INSERT INTO reports
         (session_id, emergency_type, description, reporter_location, emergency_location, photo_url, standardized_answers, status)
       VALUES
         ($1, $2, $3, ${reporterPoint || 'NULL'}, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $7, 'Received')
       RETURNING id, created_at`,
      [
        sessionId || null,
        emergencyType,
        description || null,
        eLng,
        eLat,
        photoUrl,
        parsedAnswers ? JSON.stringify(parsedAnswers) : null
      ]
    );

    const { id: reportId, created_at: receivedAt } = result.rows[0];

    // Publish report.ingested domain event to RabbitMQ for the clustering worker
    const { publishEvent } = require('../config/rabbitmq');
    publishEvent('report.ingested', {
      reportId,
      emergencyType,
      latitude: eLat,
      longitude: eLng,
      description: description || null,
      standardizedAnswers: parsedAnswers || null,
      sessionId: sessionId || null,
      receivedAt,
    });

    return res.status(201).json({
      success: true,
      data: {
        reportId,
        status: 'Received',
        receivedAt
      }
    });
  } catch (err) {
    console.error('[Reports] Ingestion error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to save report.' }
    });
  }
});

module.exports = router;
