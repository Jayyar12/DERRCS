/**
 * DERRCS Administrator Routes
 * Provides schema-backed account management, audit inspection, and safe
 * visibility of deployment-configured algorithm thresholds.
 */

'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const roleNames = ['Admin', 'Dispatcher', 'ResponseUnit'];

router.use(authenticate, authorize('Admin'));

/** @route GET /api/v1/admin/users */
router.get('/users', async (_req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.full_name, u.phone_number, u.is_active,
              u.created_at, u.updated_at, r.name AS role, ru.unit_code, ru.unit_type
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN response_units ru ON ru.user_id = u.id
       WHERE r.name <> 'Citizen'
       ORDER BY r.name, u.full_name`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Admin] Users list error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch users.' } });
  }
});

/** @route POST /api/v1/admin/users */
router.post('/users', async (req, res) => {
  const { username, password, fullName, phoneNumber, role } = req.body;
  if (!username || !password || !fullName || !role) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'username, password, fullName, and role are required.' } });
  }
  if (!roleNames.includes(role) || username.length > 50 || fullName.length > 100 || password.length < 8) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Use a valid staff role, a username/full name within limits, and a password of at least 8 characters.' } });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (role_id, username, password_hash, full_name, phone_number)
       VALUES ((SELECT id FROM roles WHERE name = $1), $2, $3, $4, $5)
       RETURNING id, username, full_name, phone_number, is_active, created_at`,
      [role, username.trim(), passwordHash, fullName.trim(), phoneNumber?.trim() || null]
    );
    return res.status(201).json({ success: true, data: { ...result.rows[0], role } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'That username already exists.' } });
    }
    console.error('[Admin] Create user error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create user.' } });
  }
});

/** @route PATCH /api/v1/admin/users/:userId */
router.patch('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const { fullName, phoneNumber, role, isActive, password } = req.body;
  if (role !== undefined && !roleNames.includes(role)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid staff role.' } });
  }
  if (password !== undefined && (typeof password !== 'string' || password.length < 8)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Password must have at least 8 characters.' } });
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'isActive must be a boolean.' } });
  }
  if (userId === req.user.userId && isActive === false) {
    return res.status(409).json({ success: false, error: { code: 'SELF_DEACTIVATION_BLOCKED', message: 'Administrators cannot deactivate their own active session.' } });
  }

  try {
    const result = await query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           phone_number = COALESCE($2, phone_number),
           role_id = COALESCE((SELECT id FROM roles WHERE name = $3), role_id),
           is_active = COALESCE($4, is_active),
           password_hash = COALESCE($5, password_hash),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, username, full_name, phone_number, is_active, updated_at`,
      [
        fullName?.trim() || null,
        phoneNumber?.trim() || null,
        role || null,
        isActive ?? null,
        password ? await bcrypt.hash(password, 12) : null,
        userId
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });
    }
    return res.status(200).json({ success: true, data: { ...result.rows[0], role: role || undefined } });
  } catch (err) {
    console.error('[Admin] Update user error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update user.' } });
  }
});

/** @route GET /api/v1/admin/audit-logs */
router.get('/audit-logs', async (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  try {
    const result = await query(
      `SELECT al.id, al.action, al.entity_name, al.entity_id, al.details, al.created_at,
              u.full_name AS actor_name, u.username AS actor_username
       FROM activity_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC LIMIT $1`,
      [limit]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Admin] Audit log error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch audit logs.' } });
  }
});

/** @route GET /api/v1/admin/config */
router.get('/config', (_req, res) => {
  // Values are deployment configuration. Exposing them read-only avoids
  // pretending a process-local update would survive a restart or reach Python.
  return res.status(200).json({
    success: true,
    data: {
      dbscanEpsilonMeters: Number(process.env.DBSCAN_EPSILON_METERS || 100),
      dbscanMinPoints: Number(process.env.DBSCAN_MIN_POINTS || 1),
      clusterTimeWindowHours: Number(process.env.CLUSTER_TIME_WINDOW_HOURS || 12),
      reportRateLimitPerMinute: Number(process.env.REPORT_RATE_LIMIT_PER_MINUTE || 10),
      reportedEscalationMinutes: 5,
      validatedEscalationMinutes: 10,
      editableAtRuntime: false
    }
  });
});

module.exports = router;
