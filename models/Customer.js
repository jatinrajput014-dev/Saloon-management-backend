const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: ''
    },
    age: {
      type: Number,
      min: 0,
      default: null
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    password: {
      type: String,
      select: false // Exclude password field by default in queries
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    emailOtp: {
      type: String,
      select: false // Exclude OTP field by default in queries
    },
    otpExpiresAt: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Customer', customerSchema);
