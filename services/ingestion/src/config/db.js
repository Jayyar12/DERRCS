/**
 * DERRCS Database Connection Pool
 * Uses the 'pg' library to manage connections to PostgreSQL with PostGIS.
 * All parameters are read from .env. Exits the process on startup failure.
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

/**
 * Runs a parameterized SQL query against the connection pool.
 * @param {string} text - SQL query string with $1, $2 placeholders.
 * @param {Array} params - Array of parameter values.
 */
const query = (text, params) => pool.query(text, params);

/**
 * Tests database connectivity on startup.
 * Logs success or exits the process with code 1 on failure.
 */
const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log(`[DB] Connected to PostgreSQL at ${result.rows[0].now}`);
  } catch (err) {
    console.error('[DB] Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }
};

module.exports = { pool, query, testConnection };