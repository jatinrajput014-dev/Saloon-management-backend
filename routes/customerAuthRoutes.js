const express = require('express');
const router = express.Router();
const {
  sendSignupOtp,
  verifySignup,
  sendForgotPasswordOtp,
  resetForgotPassword
} = require('../controllers/customerAuthController');

// Signup Flow
router.post('/signup/send-otp', sendSignupOtp);
router.post('/signup/verify', verifySignup);

// Forgot Password Flow
router.post('/forgot-password/send-otp', sendForgotPasswordOtp);
router.post('/forgot-password/reset', resetForgotPassword);

module.exports = router;
