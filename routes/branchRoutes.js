const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { protect, requireHeadAdmin, requireBranchAdmin, checkBranchAccess } = require('../middleware/authMiddleware');
const { validateSchema } = require('../middleware/validationMiddleware');

// @route   GET /api/branches
// @desc    Get all branches (public can see active; head admin sees all)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { all } = req.query;
    const query = all === 'true' ? {} : { status: 'active' };
    const branches = await Branch.find(query).populate('admin', 'name email phone');
    res.json({ success: true, count: branches.length, branches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/branches
// @desc    Head Admin creates a new branch
// @access  Private (Head Admin only)
router.post('/', protect, requireHeadAdmin, validateSchema('branch'), async (req, res) => {
  try {
    const { name, code, city, address, phone, email, chairs, openingTime, closingTime, adminName, adminEmail, adminPassword, adminLoginId } = req.body;

    const branch = await Branch.create({
      name,
      code: code || `BR-${Date.now().toString().slice(-4)}`,
      city,
      address,
      phone,
      email,
      chairs: chairs || 8,
      openingTime: openingTime || '09:00',
      closingTime: closingTime || '20:00'
    });

    // Optionally create/assign Branch Admin user with specified password and loginId
    if (adminEmail) {
      const emailLower = adminEmail.toLowerCase();
      let adminUser = await User.findOne({ email: emailLower });
      if (!adminUser) {
        adminUser = await User.create({
          name: adminName || `${city} Branch Admin`,
          email: emailLower,
          loginId: (adminLoginId || adminEmail).toLowerCase(),
          password: adminPassword || 'branch123',
          phone: phone || '9999999999',
          role: 'branch_admin',
          branch: branch._id
        });
      } else {
        adminUser.role = 'branch_admin';
        adminUser.branch = branch._id;
        if (adminPassword) adminUser.password = adminPassword;
        if (adminLoginId) adminUser.loginId = adminLoginId.toLowerCase();
        await adminUser.save();
      }
      branch.admin = adminUser._id;
      await branch.save();
    }

    res.status(201).json({ success: true, branch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/branches/:id/toggle-status
// @desc    Head Admin toggles branch activation/deactivation
// @access  Private (Head Admin only)
router.patch('/:id/toggle-status', protect, requireHeadAdmin, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    branch.status = branch.status === 'active' ? 'deactivated' : 'active';
    await branch.save();

    res.json({
      success: true,
      message: `Branch is now ${branch.status}`,
      branch
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/branches/:id/settings
// @desc    Update branch settings (timings, chairs, contact)
// @access  Private (Branch Admin or Head Admin)
router.put('/:id/settings', protect, requireBranchAdmin, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const { name, phone, openingTime, closingTime, chairs, address, workingDays } = req.body;
    if (address !== undefined && address !== null) {
      const cleanAddr = String(address).trim();
      if (!cleanAddr) {
        return res.status(400).json({ success: false, message: 'Branch Address cannot be empty.' });
      }
      if (!/[a-zA-Z]/.test(cleanAddr)) {
        return res.status(400).json({ success: false, message: 'Branch Address cannot be purely numeric and must contain at least one alphabet letter.' });
      }
      branch.address = cleanAddr;
    }
    if (name) branch.name = name;
    if (phone) branch.phone = phone;
    if (openingTime) branch.openingTime = openingTime;
    if (closingTime) branch.closingTime = closingTime;
    if (chairs) branch.chairs = chairs;
    if (workingDays && Array.isArray(workingDays)) branch.workingDays = workingDays;

    await branch.save();
    res.json({ success: true, message: 'Branch settings saved', branch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/branches/:id/stats
// @desc    Get branch operational metrics & today appointments
// @access  Private (Branch Admin or Head Admin)
router.get('/:id/stats', protect, requireBranchAdmin, checkBranchAccess, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const appointments = await Appointment.find({ branch: branch._id });
    const todayApts = appointments.filter(a => a.date === todayStr);

    const todayRevenue = todayApts
      .filter(a => a.status === 'completed' || a.status === 'confirmed')
      .reduce((sum, a) => sum + a.total, 0);

    const totalRevenue = appointments
      .filter(a => a.status === 'completed' || a.status === 'confirmed')
      .reduce((sum, a) => sum + a.total, 0);

    res.json({
      success: true,
      branch,
      stats: {
        totalRevenue,
        todayRevenue,
        totalAppointments: appointments.length,
        todayAppointments: todayApts.length,
        chairs: branch.chairs,
        occupancyRate: Math.min(100, Math.round((todayApts.length / (branch.chairs * 4)) * 100))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/branches/:id/admins
// @desc    Generate / assign Branch Admin credentials
// @access  Private (Head Admin only)
router.post('/:id/admins', protect, requireHeadAdmin, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const { name, email, password, phone } = req.body;
    const loginId = (email || '').toLowerCase();

    if (!/^[a-zA-Z0-9._%+-]+@luxehaus\.in$/i.test(loginId)) {
      return res.status(400).json({
        success: false,
        message: 'Branch Admin ID must follow the domain format user@luxehaus.in (e.g., JR@luxehaus.in).'
      });
    }

    let adminUser = await User.findOne({ email: loginId });
    if (!adminUser) {
      adminUser = await User.create({
        name: name || `${branch.city} Branch Admin`,
        email: loginId,
        loginId: loginId,
        password: password || 'branch123',
        phone: phone || branch.phone || '9999999999',
        role: 'branch_admin',
        branch: branch._id
      });
    } else {
      adminUser.role = 'branch_admin';
      adminUser.branch = branch._id;
      if (password) adminUser.password = password;
      await adminUser.save();
    }

    branch.admin = adminUser._id;
    await branch.save();

    res.status(201).json({
      success: true,
      message: 'Branch Admin credentials generated successfully',
      admin: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        loginId: adminUser.loginId,
        branchId: branch._id
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
