/**
 * DERRCS JWT Authentication Middleware
 * Verifies Bearer tokens and enforces role-based access control.
 */

const jwt = require('jsonwebtoken');

/**
 * Verifies the JWT from the Authorization header.
 * Attaches decoded { userId, username, role } to req.user on success.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header.' }
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Token is invalid or has expired.' }
    });
  }
};

/**
 * Restricts access to one or more allowed roles.
 * Must be used after the authenticate middleware.
 * @param {...string} roles - Allowed role names (e.g. 'Dispatcher', 'Admin').
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: `Access denied. Required role(s): ${roles.join(', ')}.`
      }
    });
  }
  next();
};

module.exports = { authenticate, authorize };

