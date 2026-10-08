const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes via JWT token (verifyToken)
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'luxe_secret_key_8801');
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User account not found' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

// Alias for protect
const verifyToken = protect;

// Only Head Admin can access
const requireHeadAdmin = (req, res, next) => {
  const role = (req.user?.role || '').toLowerCase();
  if (req.user && (role === 'head_admin' || role === 'headadmin')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied: Head Admin role required' });
  }
};

// Branch Admin / Manager or Head Admin can access (requireAdmin)
const requireBranchAdmin = (req, res, next) => {
  const role = (req.user?.role || '').toLowerCase();
  if (req.user && (role === 'branch_admin' || role === 'branchmanager' || role === 'head_admin' || role === 'headadmin')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied: Dashboard Admin / Branch Manager role required' });
  }
};

// Alias for requireBranchAdmin
const requireBranchManager = requireBranchAdmin;
const requireAdmin = requireBranchAdmin;

// Strictly Customer accounts only (rejects Dashboard Admins)
const requireCustomer = (req, res, next) => {
  const role = (req.user?.role || '').toLowerCase();
  if (req.user && role === 'customer') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied: Customer account required for this API' });
  }
};

// Restrict branch admin only to their assigned branch
const checkBranchAccess = (req, res, next) => {
  const role = (req.user?.role || '').toLowerCase();
  if (role === 'head_admin' || role === 'headadmin') return next();
  const targetBranchId = req.params.branchId || req.body.branchId;
  if (req.user.branch && req.user.branch.toString() === targetBranchId) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Not authorized for this branch' });
};

module.exports = {
  protect,
  verifyToken,
  requireHeadAdmin,
  requireBranchAdmin,
  requireBranchManager,
  requireAdmin,
  requireCustomer,
  checkBranchAccess
};
