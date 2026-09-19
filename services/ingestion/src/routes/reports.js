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

  const eLat = Number(parsedEmergency.latitude);
  const eLng = Number(parsedEmergency.longitude);

  if (!Number.isFinite(eLat) || !Number.isFinite(eLng) || eLat < -90 || eLat > 90 || eLng < -180 || eLng > 180) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Latitude must be between -90 and 90, and longitude between -180 and 180.'
      }
    });
  }

  // Build optional reporter location point
  let normalizedReporterCoordinates = null;
  if (parsedReporter) {
    const rLat = Number(parsedReporter.latitude);
    const rLng = Number(parsedReporter.longitude);
    if (!Number.isFinite(rLat) || !Number.isFinite(rLng) || rLat < -90 || rLat > 90 || rLng < -180 || rLng > 180) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Reporter coordinates are invalid.' }
      });
    }
    normalizedReporterCoordinates = { latitude: rLat, longitude: rLng };
  }

  // Resolve uploaded photo URL or use provided photoUrl
  const photoUrl = req.file
    ? `/uploads/${req.file.filename}`
    : (req.body.photoUrl || null);

  try {
    // The emergency, not merely the reporter, must be within Tagoloan's
    // operational boundary. The boundary is seeded by 02-initial-seeds.sql.
    const boundaryResult = await query(
      `SELECT EXISTS (
         SELECT 1 FROM municipal_boundaries
         WHERE ST_Covers(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
       ) AS is_within_boundary`,
      [eLng, eLat]
    );
    if (!boundaryResult.rows[0]?.is_within_boundary) {
      return res.status(400).json({
        success: false,
        error: { code: 'OUT_OF_BOUNDS', message: 'Emergency coordinates must be within Tagoloan operational bounds.' }
      });
    }

    const result = await query(
      `INSERT INTO reports
         (session_id, emergency_type, description, reporter_location, emergency_location, photo_url, standardized_answers, status)
       VALUES
         ($1, $2, $3,
          CASE WHEN $4::double precision IS NULL THEN NULL
               ELSE ST_SetSRID(ST_MakePoint($5, $4), 4326) END,
          ST_SetSRID(ST_MakePoint($6, $7), 4326), $8, $9, 'Received')
       RETURNING id, created_at`,
      [
        sessionId || null,
        emergencyType,
        description || null,
        normalizedReporterCoordinates?.latitude || null,
        normalizedReporterCoordinates?.longitude || null,
        eLng,
        eLat,
        photoUrl,
        parsedAnswers ? JSON.stringify(parsedAnswers) : null
      ]
    );

    const { id: reportId, created_at: receivedAt } = result.rows[0];

    // Publish report.ingested domain event to RabbitMQ for the clustering worker
    const { publishEvent } = require('../config/rabbitmq');
    await publishEvent('report.ingested', {
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

/**
 * @route  GET /api/v1/reports
 * @desc   Fetch raw, unclustered reports
 * @access Public/Dispatchers
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
         id, 
         emergency_type, 
         description, 
         ST_Y(emergency_location::geometry) as latitude, 
         ST_X(emergency_location::geometry) as longitude, 
         created_at 
       FROM reports 
       WHERE status = 'Received' 
       ORDER BY created_at DESC 
       LIMIT 100`
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('[Reports] Fetch error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch reports.' }
    });
  }
});

module.exports = router;
