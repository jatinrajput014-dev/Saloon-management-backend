const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    date: {
      type: String,
      required: true // Format: YYYY-MM-DD
    },
    checkInTime: {
      type: Date,
      default: null
    },
    checkOutTime: {
      type: Date,
      default: null
    },
    totalMinutes: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['CHECKED_IN', 'CHECKED_OUT', 'ABSENT'],
      default: 'CHECKED_IN'
    },
    isCheckedIn: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Attendance', attendanceSchema);
