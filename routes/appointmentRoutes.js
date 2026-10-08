const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Coupon = require('../models/Coupon');
const Service = require('../models/Service');
const Branch = require('../models/Branch');
const { protect, requireBranchAdmin, checkBranchAccess } = require('../middleware/authMiddleware');

// @route   POST /api/appointments
// @desc    Customer creates a new booking
// @access  Private (or Public with guest info)
router.post('/', async (req, res) => {
  try {
    const { branchId, customerId, customerName, customerPhone, customerEmail, serviceIds, stylistId, stylistName, date, timeSlot, couponCode, paymentMethod, notes } = req.body;

    const branch = await Branch.findById(branchId);
    if (!branch || branch.status === 'deactivated') {
      return res.status(400).json({ success: false, message: 'This salon branch is currently not accepting reservations' });
    }

    const services = await Service.find({ _id: { $in: serviceIds } });
    const subtotal = services.reduce((sum, s) => sum + s.price, 0);
    const duration = services.reduce((sum, s) => sum + s.duration, 0);

    let discount = 0;
    let couponRef = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim(), active: true });
      if (coupon && subtotal >= coupon.minOrderAmount) {
        couponRef = coupon._id;
        discount = coupon.discountType === 'percentage' 
          ? (subtotal * coupon.discountValue) / 100
          : coupon.discountValue;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
        coupon.usageCount += 1;
        await coupon.save();
      }
    }

    const total = Math.max(0, subtotal - discount);
    const code = 'APT-' + Math.floor(1000 + Math.random() * 9000);

    const appointment = await Appointment.create({
      appointmentCode: code,
      branch: branchId,
      customer: customerId || null,
      customerName,
      customerPhone,
      customerEmail,
      services: serviceIds,
      stylist: stylistId !== 'any' ? stylistId : null,
      stylistName: stylistName || 'Any Available Specialist',
      date,
      timeSlot,
      duration,
      subtotal,
      coupon: couponRef,
      couponCode: couponCode || null,
      discount,
      total,
      paymentMethod: paymentMethod || 'Credit Card (Apple Pay)',
      paymentStatus: paymentMethod === 'Pay at Salon' ? 'pending' : 'paid',
      status: 'confirmed',
      notes: notes || 'Booked via Customer Mobile App'
    });

    res.status(201).json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/appointments
// @desc    Head Admin: Get ALL appointments (optionally filtered)
// @access  Private (Head Admin only)
router.get('/', protect, async (req, res) => {
  try {
    const { branchId, status, date, startDate, endDate, paymentStatus } = req.query;
    const filter = {};
    if (branchId && branchId !== 'all') filter.branch = branchId;
    if (status && status !== 'all') filter.status = status;
    if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;
    if (date) filter.date = date;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const appointments = await Appointment.find(filter)
      .populate('services', 'name price duration')
      .populate('branch', 'name city code')
      .populate('coupon', 'code discountValue discountType')
      .sort({ date: -1, timeSlot: 1 });

    res.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/appointments/branch/:branchId
// @desc    Get branch appointments (Branch Admin)
router.get('/branch/:branchId', protect, requireBranchAdmin, checkBranchAccess, async (req, res) => {
  try {
    const { status, date, startDate, endDate } = req.query;
    const filter = { branch: req.params.branchId };
    if (status && status !== 'all') filter.status = status;
    if (date) filter.date = date;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const appointments = await Appointment.find(filter)
      .populate('services', 'name price duration')
      .populate('coupon', 'code discountValue discountType')
      .sort({ date: -1, timeSlot: 1 });

    res.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/appointments/my
// @desc    Get customer personal appointments
router.get('/my', protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({ customer: req.user._id })
      .populate('branch', 'name city address image')
      .populate('services', 'name price')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/appointments/:id/status
// @desc    Update appointment status (Branch Admin: accept, reject, complete, cancel)
router.patch('/:id/status', protect, requireBranchAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'accepted', 'rejected', 'rescheduled', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const apt = await Appointment.findById(req.params.id);
    if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    if (status === 'cancelled' && apt.canCancelOrReschedule && !apt.canCancelOrReschedule()) {
      return res.status(400).json({
        success: false,
        message: 'Cancellations and rescheduling are prohibited within 2 hours of appointment time.'
      });
    }

    apt.status = status;
    if (status === 'completed') apt.paymentStatus = 'paid';
    await apt.save();

    res.json({ success: true, appointment: apt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/appointments/:id/reschedule
// @desc    Reschedule appointment date & time slot
router.patch('/:id/reschedule', protect, requireBranchAdmin, async (req, res) => {
  try {
    const { date, timeSlot } = req.body;
    const apt = await Appointment.findById(req.params.id);
    if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    if (apt.canCancelOrReschedule && !apt.canCancelOrReschedule()) {
      return res.status(400).json({
        success: false,
        message: 'Cancellations and rescheduling are prohibited within 2 hours of appointment time.'
      });
    }

    apt.date = date;
    apt.timeSlot = timeSlot;
    apt.status = 'rescheduled';
    await apt.save();

    res.json({ success: true, message: 'Appointment rescheduled successfully', appointment: apt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/appointments/:id/payment
// @desc    Collect payment at salon by Branch Manager (supports Cash, UPI, Credit Card selection)
router.patch('/:id/payment', protect, requireBranchAdmin, async (req, res) => {
  try {
    const { paymentMethod, paymentStatus } = req.body;
    const apt = await Appointment.findById(req.params.id);
    if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    if (paymentMethod) apt.paymentMethod = paymentMethod;
    apt.paymentStatus = paymentStatus || 'paid';
    await apt.save();

    res.json({ success: true, message: 'Salon payment processed successfully', appointment: apt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/appointments/available-slots/:branchId
// @desc    Calculate available 12-hr / 24-hr time slots for date & branch
// @access  Public / Customer
router.get('/available-slots/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    const { date, duration } = req.query;

    const branch = await Branch.findById(branchId);
    if (!branch || branch.status === 'deactivated') {
      return res.status(400).json({ success: false, message: 'Branch is deactivated or unavailable' });
    }

    const serviceDuration = parseInt(duration) || 60;
    const [openH, openM] = (branch.openingTime || '09:00').split(':').map(Number);
    const [closeH, closeM] = (branch.closingTime || '20:00').split(':').map(Number);
    const openMinutes = openH * 60 + (openM || 0);
    const closeMinutes = closeH * 60 + (closeM || 0);

    const existingApts = await Appointment.find({
      branch: branchId,
      date: date,
      status: { $in: ['confirmed', 'accepted', 'pending', 'rescheduled'] }
    });

    const slots = [];
    for (let cur = openMinutes; cur + serviceDuration <= closeMinutes; cur += 30) {
      const slotStart = cur;
      const slotEnd = cur + serviceDuration;

      const isConflict = existingApts.some(apt => {
        const [aH, aM] = apt.timeSlot.split(':').map(Number);
        const aStart = aH * 60 + (aM || 0);
        const aEnd = aStart + (apt.duration || 60);
        return slotStart < aEnd && slotEnd > aStart;
      });

      if (!isConflict) {
        const hh = String(Math.floor(slotStart / 60)).padStart(2, '0');
        const mm = String(slotStart % 60).padStart(2, '0');
        const ampm = Math.floor(slotStart / 60) >= 12 ? 'PM' : 'AM';
        const display12 = `${String((Math.floor(slotStart / 60) % 12) || 12).padStart(2, '0')}:${mm} ${ampm}`;

        slots.push({ slot24: `${hh}:${mm}`, display: display12 });
      }
    }

    res.json({ success: true, date, branchId, availableSlots: slots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/appointments/:id/cancel
// @desc    Customer cancels appointment (Enforces strict 2-hour cut-off rule)
// @access  Private (Customer / Branch Admin)
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const apt = await Appointment.findById(req.params.id);
    if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    // Enforce strict 2-hour cut-off rule using model helper
    if (apt.canCancelOrReschedule && !apt.canCancelOrReschedule()) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation Rejected: Appointments cannot be cancelled within 2 hours of scheduled time.'
      });
    }

    apt.status = 'cancelled';
    await apt.save();

    res.json({ success: true, message: 'Appointment cancelled successfully', appointment: apt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

