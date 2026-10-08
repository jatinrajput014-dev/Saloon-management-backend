const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Branch = require('../models/Branch');
const Service = require('../models/Service');
const Coupon = require('../models/Coupon');
const { protect, requireHeadAdmin, requireBranchAdmin, checkBranchAccess } = require('../middleware/authMiddleware');

function buildDateFilter(startDate, endDate) {
  if (!startDate && !endDate) return null;
  const filter = {};
  if (startDate) filter.$gte = startDate;
  if (endDate) filter.$lte = endDate;
  return filter;
}

// @route   GET /api/reports/head-admin
router.get('/head-admin', protect, requireHeadAdmin, async (req, res) => {
  try {
    const { branchId, status, startDate, endDate } = req.query;
    const filter = {};
    if (branchId && branchId !== 'all') filter.branch = branchId;
    if (status && status !== 'all') filter.status = status;
    const dateFilter = buildDateFilter(startDate, endDate);
    if (dateFilter) filter.date = dateFilter;

    const appointments = await Appointment.find(filter)
      .populate('branch', 'name city code status')
      .populate('services', 'name price duration')
      .populate('coupon', 'code discountValue discountType title')
      .sort({ date: -1 });

    const branches = await Branch.find({});
    const allServices = await Service.find({}).populate('category', 'name');
    const coupons = await Coupon.find({});

    const pendingCount = appointments.filter(a => a.status === 'pending').length;
    const acceptedCount = appointments.filter(a => a.status === 'accepted').length;
    const completedCount = appointments.filter(a => a.status === 'completed').length;
    const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;
    const rejectedCount = appointments.filter(a => a.status === 'rejected').length;
    const rescheduledCount = appointments.filter(a => a.status === 'rescheduled').length;
    const revenueApts = appointments.filter(a => ['completed', 'accepted'].includes(a.status));
    const totalRevenue = revenueApts.reduce((sum, a) => sum + (a.total || 0), 0);
    const totalDiscount = revenueApts.reduce((sum, a) => sum + (a.discount || 0), 0);

    const branchBreakdown = branches.map(b => {
      const bApts = appointments.filter(a => a.branch && a.branch._id && a.branch._id.toString() === b._id.toString());
      const bRev = bApts.filter(a => ['completed','accepted'].includes(a.status)).reduce((s,a) => s+(a.total||0), 0);
      return {
        branchId: b._id, branchName: b.name, city: b.city, status: b.status,
        totalAppointments: bApts.length,
        completedAppointments: bApts.filter(a=>a.status==='completed').length,
        pendingAppointments: bApts.filter(a=>a.status==='pending').length,
        totalRevenue: bRev,
        totalCustomers: new Set(bApts.map(a=>a.customerPhone||a.customerEmail)).size
      };
    });

    const serviceMap = {};
    allServices.forEach(s => {
      serviceMap[s._id.toString()] = { serviceId: s._id, serviceName: s.name, price: s.price, categoryName: s.category?s.category.name:'General', bookingCount:0, totalRevenue:0 };
    });
    appointments.forEach(apt => {
      if (apt.services && Array.isArray(apt.services)) {
        const pa = apt.services.length > 0 ? (apt.total||0)/apt.services.length : 0;
        apt.services.forEach(srv => {
          const id = srv._id ? srv._id.toString() : srv.toString();
          if (serviceMap[id]) { serviceMap[id].bookingCount += 1; if (['completed','accepted'].includes(apt.status)) serviceMap[id].totalRevenue += pa; }
        });
      }
    });

    const onlinePay = appointments.filter(a => a.paymentMethod === 'Online');
    const salonPay = appointments.filter(a => a.paymentMethod === 'Pay at Salon');
    const paidApts = appointments.filter(a => a.paymentStatus === 'paid');
    const paymentSummary = {
      online: { count: onlinePay.length, revenue: onlinePay.filter(a=>a.paymentStatus==='paid').reduce((s,a)=>s+(a.total||0),0) },
      payAtSalon: { count: salonPay.length, revenue: salonPay.filter(a=>a.paymentStatus==='paid').reduce((s,a)=>s+(a.total||0),0) },
      totalPaid: paidApts.length, totalPending: appointments.filter(a=>a.paymentStatus==='pending').length,
      totalCollected: paidApts.reduce((s,a)=>s+(a.total||0),0)
    };

    const couponUsage = coupons.map(c => {
      const ca = appointments.filter(a => a.couponCode === c.code);
      return { couponId: c._id, code: c.code, title: c.title, discountType: c.discountType, discountValue: c.discountValue, usageCount: ca.length, totalSavingsGiven: ca.reduce((s,a)=>s+(a.discount||0),0), active: c.active };
    });

    res.json({
      success: true,
      kpis: { totalAppointments: appointments.length, pendingCount, acceptedCount, completedCount, cancelledCount, rejectedCount, rescheduledCount, totalRevenue, totalDiscount },
      branchBreakdown, serviceBreakdown: Object.values(serviceMap).sort((a,b)=>b.bookingCount-a.bookingCount),
      paymentSummary, couponUsage, recentAppointments: appointments.slice(0,20)
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// @route   GET /api/reports/branch/:branchId
router.get('/branch/:branchId', protect, requireBranchAdmin, checkBranchAccess, async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const filter = { branch: req.params.branchId };
    if (status && status !== 'all') filter.status = status;
    const dateFilter = buildDateFilter(startDate, endDate);
    if (dateFilter) filter.date = dateFilter;

    const appointments = await Appointment.find(filter)
      .populate('services', 'name price duration')
      .populate('coupon', 'code discountValue discountType')
      .sort({ date: -1 });

    const allServices = await Service.find({ active: true }).populate('category', 'name');
    const totalAppointments = appointments.length;
    const pendingCount = appointments.filter(a=>a.status==='pending').length;
    const acceptedCount = appointments.filter(a=>a.status==='accepted').length;
    const completedCount = appointments.filter(a=>a.status==='completed').length;
    const cancelledCount = appointments.filter(a=>a.status==='cancelled').length;
    const rejectedCount = appointments.filter(a=>a.status==='rejected').length;
    const revenueApts = appointments.filter(a=>['completed','accepted'].includes(a.status));
    const totalRevenue = revenueApts.reduce((s,a)=>s+(a.total||0),0);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRevenue = appointments.filter(a=>a.date===todayStr&&['completed','accepted'].includes(a.status)).reduce((s,a)=>s+(a.total||0),0);
    const monthlyRevenue = appointments.filter(a=>a.date&&a.date.startsWith(todayStr.slice(0,7))&&['completed','accepted'].includes(a.status)).reduce((s,a)=>s+(a.total||0),0);
    const totalCustomers = new Set(appointments.map(a=>a.customerPhone||a.customerEmail)).size;

    const serviceMap = {};
    allServices.forEach(s => {
      serviceMap[s._id.toString()] = { serviceId: s._id, serviceName: s.name, price: s.price, categoryName: s.category?s.category.name:'General', bookingCount:0, totalRevenue:0 };
    });
    appointments.forEach(apt => {
      if (apt.services && Array.isArray(apt.services)) {
        const pa = apt.services.length > 0 ? (apt.total||0)/apt.services.length : 0;
        apt.services.forEach(srv => {
          const id = srv._id?srv._id.toString():srv.toString();
          if (serviceMap[id]) { serviceMap[id].bookingCount+=1; if (['completed','accepted'].includes(apt.status)) serviceMap[id].totalRevenue+=pa; }
        });
      }
    });

    res.json({
      success: true,
      kpis: { totalAppointments, pendingCount, acceptedCount, completedCount, cancelledCount, rejectedCount, totalRevenue, todayRevenue, monthlyRevenue, totalCustomers },
      serviceBreakdown: Object.values(serviceMap).sort((a,b)=>b.bookingCount-a.bookingCount),
      paymentSummary: { onlineCount: appointments.filter(a=>a.paymentMethod==='Online').length, payAtSalonCount: appointments.filter(a=>a.paymentMethod==='Pay at Salon').length, paidCount: appointments.filter(a=>a.paymentStatus==='paid').length, pendingPaymentCount: appointments.filter(a=>a.paymentStatus==='pending').length, totalCollected: revenueApts.filter(a=>a.paymentStatus==='paid').reduce((s,a)=>s+(a.total||0),0) },
      appointments
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
