// server/middleware/auth.js
/**
 * LERNITT ACADEMY - SECURITY MIDDLEWARE
 * ----------------------------------------------------------------------------
 * This module acts as the "Security Guard" for the Lernitt API.
 * - 'auth': Validates JWT tokens and identifies the requester.
 * - 'isAdmin': Restricts high-privilege routes to Bob (Admin) only.
 * ----------------------------------------------------------------------------
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * auth
 * Primary middleware for session validation.
 * ✅ VERIFIED: Correctly extracts Bearer token and verifies JWT signature.
 */
const auth = async (req, res, next) => {
  try {
    // Extract token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('No authentication token provided.');
    }

    // Verify token against the environment secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch the latest user profile from MongoDB
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new Error('Associated academic profile not found.');
    }

    // Attach credentials to the request object for downstream routes
    req.token = token;
    req.user = user;
    
    next();
  } catch (e) {
    // 401 Unauthorized: Triggers the "Log in again" banner in Header.jsx
    res.status(401).json({ 
      error: 'Academic session expired. Please re-authenticate.',
      code: 'UNAUTHORIZED'
    });
  }
};

/**
 * isAdmin
 * RBAC (Role-Based Access Control) for administrative operations.
 * ✅ SYNCED: Works with the AdminDashboard and Tutor Approval endpoints.
 */
const isAdmin = (req, res, next) => {
  // Check for 'admin' role or the explicit 'isAdmin' flag
  const isBob = req.user && (req.user.role === 'admin' || req.user.isAdmin === true);

  if (isBob) {
    return next();
  }
  
  // Security logging for unauthorized access attempts
  console.warn(`[SECURITY_ALERT] Unauthorized admin path access attempted by: ${req.user?.email || 'Guest'}`);
  
  // 403 Forbidden: Student/Tutor attempting to reach Bob's dashboard
  return res.status(403).json({ 
    error: 'Access restricted. Administrative privileges required for this operation.' 
  });
};

module.exports = { auth, isAdmin };
