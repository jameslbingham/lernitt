const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Auth Middleware
 * Verifies the user's token and attaches the user object to the request.
 */
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) throw new Error();

    req.token = token;
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

/**
 * Admin Middleware
 * Strictly restricts access to users with admin privileges.
 */
const isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.isAdmin === true)) {
    return next();
  }
  
  console.warn(`🛑 Unauthorized access attempt by ${req.user?.email || 'Unknown'}`);
  return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
};

module.exports = { auth, isAdmin };
