const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Branch = require('../models/Branch');
const { protect, requireHeadAdmin } = require('../middleware/authMiddleware');
const { validateSchema } = require('../middleware/validationMiddleware');

const generateToken = (userOrId, role) => {
  let id = userOrId;
  let userRole = role;
  if (userOrId && typeof userOrId === 'object') {
    id = userOrId._id || userOrId.id;
    userRole = userOrId.role;
  }
  return jwt.sign(
    { id, role: userRole || 'customer' },
    process.env.JWT_SECRET || 'luxe_secret_key_8801',
    { expiresIn: '7d' }
  );
};

// Mount Customer Auth Routes (Email & OTP authentication)
const customerAuthRoutes = require('./customerAuthRoutes');
router.use('/', customerAuthRoutes);

// @route   POST /api/auth/register
// @desc    Register a new customer account
// @access  Public
router.post('/register', validateSchema('customer'), async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      loginId: email,
      password: password || 'Welcome123!',
      phone,
      role: 'customer'
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        memberTier: user.memberTier,
        loyaltyPoints: user.loyaltyPoints
      },
      token: generateToken(user)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const Customer = require('../models/Customer');
const bcrypt = require('bcryptjs');

const handleDashboardLogin = async (req, res) => {
  try {
    const { email, loginId, password } = req.body;
    const identifier = (loginId || email || '').toLowerCase().trim();

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Email/Login ID and password are required' });
    }

    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({
          $or: [
            { email: identifier },
            { loginId: identifier }
          ]
        }).populate('branch', 'name code city status');
      } catch (dbErr) {
        console.warn('[Dashboard Login] DB query failed, checking fallback:', dbErr.message);
      }
    }

    // Demo Fallback User lookup if DB is disconnected or demo credentials supplied
    if (!user) {
      if ((identifier === 'admin@luxehaus.com' || identifier === 'admin' || identifier === 'headadmin') && password === 'admin123') {
        user = {
          _id: 'demo_head_admin_001',
          name: 'Head Admin',
          email: 'admin@luxehaus.com',
          loginId: 'admin@luxehaus.com',
          role: 'head_admin',
          active: true
        };
      } else if ((identifier === 'branch1@luxehaus.com' || identifier === 'jr@luxehaus.in' || identifier === 'branch' || identifier === 'branchadmin') && (password === 'branch123' || password === 'admin123')) {
        user = {
          _id: 'demo_branch_admin_001',
          name: 'Branch Admin',
          email: 'branch1@luxehaus.com',
          loginId: 'branch1@luxehaus.com',
          role: 'branch_admin',
          branch: { _id: 'BR-MAIN', name: 'Luxe Haus - Main Street', code: 'BR-MAIN', city: 'Mumbai', status: 'active' },
          active: true
        };
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const roleLower = (user.role || '').toLowerCase();
    if (roleLower === 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Customer accounts cannot log in to the Admin Dashboard. Please use the Customer Application.'
      });
    }

    if (user.active === false) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact Head Admin.' });
    }

    let isMatch = false;
    if (typeof user.matchPassword === 'function') {
      isMatch = await user.matchPassword(password);
    } else {
      isMatch = password === 'admin123' || password === 'branch123';
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Wrong password.' });
    }

    if ((roleLower === 'branch_admin' || roleLower === 'branchmanager') && !user.branch) {
      return res.status(403).json({ success: false, message: 'No branch assigned to this account. Contact Head Admin.' });
    }

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}! Signed in to Dashboard.`,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        loginId: user.loginId || user.email,
        role: user.role,
        branch: user.branch,
        memberTier: user.memberTier || 'VIP Member',
        loyaltyPoints: user.loyaltyPoints || 0,
        avatar: user.avatar || user.name.slice(0, 2).toUpperCase()
      },
      token: generateToken(user)
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/auth/dashboard/login
// @desc    Authenticate Head Admin or Branch Manager for Web Dashboard strictly
// @access  Public
router.post('/dashboard/login', handleDashboardLogin);

// @route   POST /api/auth/app/login
// @desc    Authenticate Customers for dedicated Customer Application strictly
// @access  Public
router.post('/app/login', async (req, res) => {
  try {
    const { email, loginId, password } = req.body;
    const identifier = loginId || email;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Check User collection first
    let user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { loginId: identifier.toLowerCase() }
      ]
    });

    if (user) {
      const roleLower = (user.role || '').toLowerCase();
      if (roleLower !== 'customer') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Admins and Managers must log in through the Admin Dashboard.'
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials. Wrong password.' });
      }

      return res.json({
        success: true,
        message: `Welcome back, ${user.name}!`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: 'customer',
          memberTier: user.memberTier,
          loyaltyPoints: user.loyaltyPoints
        },
        token: generateToken(user)
      });
    }

    // Check Customer collection (Email OTP registered customer)
    const customer = await Customer.findOne({ email: identifier.toLowerCase() }).select('+password');

    if (customer) {
      if (!customer.isVerified) {
        return res.status(403).json({ success: false, message: 'Account is not verified. Please complete OTP verification.' });
      }

      const isMatch = await bcrypt.compare(password, customer.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials. Wrong password.' });
      }

      return res.json({
        success: true,
        message: `Welcome back, ${customer.name || customer.email}!`,
        user: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          age: customer.age,
          role: 'customer',
          isVerified: customer.isVerified
        },
        token: generateToken(customer._id, 'customer')
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials. Customer account not found.' });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Centralized Unified Login (supports all roles with role detection)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, loginId, password } = req.body;
    const identifier = loginId || email;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Email/Login ID and password are required' });
    }

    if (!identifier.includes('@')) {
      return res.status(400).json({ success: false, message: "Email / Login ID must contain an '@' symbol (e.g. admin@luxehaus.com)." });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    if (!/[a-zA-Z]/.test(password)) {
      return res.status(400).json({ success: false, message: 'Password must contain at least one alphabetic letter (a-z or A-Z).' });
    }

    // First check User model (Admins, Staff, existing Users)
    let user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { loginId: identifier.toLowerCase() }
      ]
    }).populate('branch', 'name code city status');

    if (user) {
      if (!user.active) {
        return res.status(403).json({ success: false, message: 'Account is deactivated. Contact Head Admin.' });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials. Wrong password.' });
      }

      const roleLower = (user.role || '').toLowerCase();
      if ((roleLower === 'branch_admin' || roleLower === 'branchmanager') && !user.branch) {
        return res.status(403).json({ success: false, message: 'No branch assigned to this account. Contact Head Admin.' });
      }

      return res.json({
        success: true,
        message: `Welcome back, ${user.name}!`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          loginId: user.loginId,
          role: user.role,
          branch: user.branch,
          memberTier: user.memberTier,
          loyaltyPoints: user.loyaltyPoints,
          avatar: user.avatar
        },
        token: generateToken(user)
      });
    }

    // If not found in User model, check Customer model (Email OTP verified customers)
    const customer = await Customer.findOne({ email: identifier.toLowerCase() }).select('+password');

    if (customer) {
      if (!customer.isVerified) {
        return res.status(403).json({ success: false, message: 'Account is not verified. Please complete email OTP verification.' });
      }

      const isMatch = await bcrypt.compare(password, customer.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials. Wrong password.' });
      }

      return res.json({
        success: true,
        message: `Welcome back, ${customer.name || customer.email}!`,
        user: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          age: customer.age,
          role: 'customer',
          isVerified: customer.isVerified
        },
        token: generateToken(customer._id, 'customer')
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/admin-login
// @desc    Authenticate Head Admin or Branch Admin (Alias)
// @access  Public
router.post('/admin-login', handleDashboardLogin);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password')
    .populate('branch', 'name code city status');
  res.json({ success: true, user });
});

// @route   POST /api/auth/create-branch-admin
// @desc    Head Admin creates a Branch Admin credential for a branch
// @access  Private (Head Admin only)
router.post('/create-branch-admin', protect, requireHeadAdmin, async (req, res) => {
  try {
    const { name, email, loginId, password, phone, branchId } = req.body;

    if (!name || !email || !password || !branchId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password and branchId are required'
      });
    }

    // Verify branch exists
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    // Create the Branch Admin user
    const branchAdmin = await User.create({
      name,
      email: email.toLowerCase(),
      loginId: (loginId || email).toLowerCase(),
      password,
      phone: phone || branch.phone,
      role: 'branch_admin',
      branch: branch._id,
      active: true
    });

    // Link admin to branch
    branch.admin = branchAdmin._id;
    await branch.save();

    res.status(201).json({
      success: true,
      message: `Branch Admin "${name}" created for branch "${branch.name}"`,
      user: {
        id: branchAdmin._id,
        name: branchAdmin.name,
        email: branchAdmin.email,
        loginId: branchAdmin.loginId,
        role: branchAdmin.role,
        branch: {
          _id: branch._id,
          name: branch.name,
          code: branch.code,
          city: branch.city
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/branch-admins
// @desc    Head Admin can view all branch admins
// @access  Private (Head Admin only)
router.get('/branch-admins', protect, requireHeadAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: 'branch_admin' })
      .select('-password')
      .populate('branch', 'name code city status');

    res.json({ success: true, count: admins.length, admins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change own password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
