const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  checkIn,
  checkOut,
  getAttendanceStatus
} = require('../controllers/attendanceController');

// Check-In Endpoint: POST /api/v1/attendance/checkin
router.post('/checkin', protect, checkIn);

// Check-Out Endpoint: POST /api/v1/attendance/checkout
router.post('/checkout', protect, checkOut);

// Today's Status Endpoint: GET /api/v1/attendance/status & GET /api/v1/attendance/today
router.get('/status', protect, getAttendanceStatus);
router.get('/today', protect, getAttendanceStatus);

module.exports = router;
