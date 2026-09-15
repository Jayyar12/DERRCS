/**
 * DERRCS Response Units Route
 * GET /api/v1/units — Lists all available response units (Dispatcher)
 */

const express = require('express');
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @route  GET /api/v1/units
 * @desc   Returns all response units that are currently Available, with their location.
 * @access Dispatcher, Admin
 */
router.get('/', authenticate, authorize('Dispatcher', 'Admin'), async (req, res) => {
  try {
    const result = await query(
      `SELECT
         ru.id,
         ru.unit_code,
         ru.unit_type,
         ru.current_status,
         ST_AsGeoJSON(ru.current_location)::json AS current_location,
         ru.updated_at,
         u.full_name AS operator_name
       FROM response_units ru
       LEFT JOIN users u ON ru.user_id = u.id
       WHERE ru.current_status = 'Available'
       ORDER BY ru.unit_type, ru.unit_code`
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('[Units] List error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch response units.' }
    });
  }
});

module.exports = router;
