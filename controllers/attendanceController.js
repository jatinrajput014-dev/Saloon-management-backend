const Attendance = require('../models/Attendance');

/**
 * Helper to get current date in YYYY-MM-DD format
 */
const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Check-In Endpoint
 * Route: POST /api/v1/attendance/checkin
 */
exports.checkIn = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.body.user;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authentication required' });
    }

    const todayDate = getTodayDateString();

    // Check if user has already checked in today
    let attendance = await Attendance.findOne({ user: userId, date: todayDate });

    if (attendance && attendance.isCheckedIn) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in for today',
        isCheckedIn: true,
        data: attendance
      });
    }

    const now = new Date();

    if (attendance) {
      // Re-checkin for today
      attendance.checkInTime = now;
      attendance.checkOutTime = null;
      attendance.totalMinutes = 0;
      attendance.status = 'CHECKED_IN';
      attendance.isCheckedIn = true;
      await attendance.save();
    } else {
      // Create new attendance check-in record
      attendance = await Attendance.create({
        user: userId,
        date: todayDate,
        checkInTime: now,
        checkOutTime: null,
        totalMinutes: 0,
        status: 'CHECKED_IN',
        isCheckedIn: true
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Checked in successfully',
      isCheckedIn: true,
      data: {
        _id: attendance._id,
        user: attendance.user,
        date: attendance.date,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        totalMinutes: attendance.totalMinutes,
        status: attendance.status,
        isCheckedIn: attendance.isCheckedIn
      }
    });
  } catch (error) {
    console.error('Error in checkIn:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

/**
 * Check-Out Endpoint
 * Route: POST /api/v1/attendance/checkout
 */
exports.checkOut = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.body.user;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authentication required' });
    }

    const todayDate = getTodayDateString();

    const attendance = await Attendance.findOne({ user: userId, date: todayDate, isCheckedIn: true });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'No active check-in record found for today',
        isCheckedIn: false
      });
    }

    const now = new Date();
    const diffMs = now - new Date(attendance.checkInTime);
    const totalMinutes = Math.max(0, Math.round(diffMs / 60000));

    attendance.checkOutTime = now;
    attendance.totalMinutes = totalMinutes;
    attendance.status = 'CHECKED_OUT';
    attendance.isCheckedIn = false; // Set to false when checked out as per API guidelines

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: 'Checked out successfully',
      isCheckedIn: false,
      data: {
        _id: attendance._id,
        user: attendance.user,
        date: attendance.date,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        totalMinutes: attendance.totalMinutes,
        status: attendance.status,
        isCheckedIn: attendance.isCheckedIn
      }
    });
  } catch (error) {
    console.error('Error in checkOut:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

/**
 * Get Today's Attendance Status
 * Route: GET /api/v1/attendance/status
 */
exports.getAttendanceStatus = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.query.user;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authentication required' });
    }

    const todayDate = getTodayDateString();
    const attendance = await Attendance.findOne({ user: userId, date: todayDate });

    if (!attendance) {
      return res.status(200).json({
        success: true,
        message: 'No attendance record for today',
        isCheckedIn: false,
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance record retrieved successfully',
      isCheckedIn: attendance.isCheckedIn,
      data: attendance
    });
  } catch (error) {
    console.error('Error in getAttendanceStatus:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};
