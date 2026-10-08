const bcrypt = require('bcryptjs');
const Customer = require('../models/Customer');
const User = require('../models/User');
const { sendOtpEmail } = require('../config/mailer');

// Utility to generate a 6-digit numeric OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Route 1: POST /api/auth/signup/send-otp
 * Accepts: email
 */
exports.sendSignupOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ success: false, message: "Email address must contain an '@' symbol (e.g. name@example.com)." });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if a verified user already exists
    let customer = await Customer.findOne({ email: cleanEmail });

    if (customer && customer.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'A verified account with this email already exists. Please log in.'
      });
    }

    // Generate 6-digit OTP and set 10-minute expiration
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (customer) {
      customer.emailOtp = otp;
      customer.otpExpiresAt = otpExpiresAt;
      await customer.save();
    } else {
      customer = await Customer.create({
        email: cleanEmail,
        emailOtp: otp,
        otpExpiresAt,
        isVerified: false
      });
    }

    // Send OTP using Nodemailer (with console fallback if SMTP is unconfigured)
    try {
      await sendOtpEmail(cleanEmail, otp, 'Signup Verification Code');
    } catch (mailErr) {
      console.warn(`[Mailer Warning] Could not send email via SMTP (${mailErr.message}). Demo OTP: ${otp}`);
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email.'
    });
  } catch (error) {
    console.error('Error in sendSignupOtp:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

/**
 * Route 2: POST /api/auth/signup/verify
 * Accepts: name, age, email, phone, password, confirmPassword, otp
 */
exports.verifySignup = async (req, res) => {
  try {
    const { name, age, email, phone, password, confirmPassword, otp } = req.body;

    if (!name || age === undefined || !email || !phone || !password || !confirmPassword || !otp) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (isNaN(age) || Number(age) < 1 || Number(age) >= 100) {
      return res.status(400).json({ success: false, message: 'Age must be under 100 (1-99).' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ success: false, message: "Email address must contain an '@' symbol (e.g. name@example.com)." });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    if (!/[a-zA-Z]/.test(password)) {
      return res.status(400).json({ success: false, message: 'Password must contain at least one alphabetic letter (a-z or A-Z).' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Find customer including OTP fields
    const customer = await Customer.findOne({ email: cleanEmail }).select('+emailOtp +otpExpiresAt');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'No registration request found for this email. Please send OTP first.' });
    }

    if (customer.isVerified) {
      return res.status(400).json({ success: false, message: 'Account is already verified.' });
    }

    // Verify OTP code and expiration
    if (!customer.emailOtp || customer.emailOtp !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
    }

    if (new Date() > new Date(customer.otpExpiresAt)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save all user details, clear OTP fields, and set isVerified to true
    customer.name = String(name).trim();
    customer.age = Number(age);
    customer.phone = String(phone).trim();
    customer.password = hashedPassword;
    customer.isVerified = true;
    customer.emailOtp = undefined;
    customer.otpExpiresAt = undefined;

    await customer.save();

    // Sync to User collection for unified system authentication
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({
        name: customer.name,
        email: customer.email,
        loginId: customer.email,
        password: password, // Pre-save hook in User schema will hash this
        phone: customer.phone,
        role: 'customer'
      });
    } else {
      user.name = customer.name;
      user.phone = customer.phone;
      user.loginId = customer.email;
      user.password = password;
      await user.save();
    }

    return res.status(201).json({
      success: true,
      message: 'User registered and verified successfully.',
      user: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        age: customer.age,
        isVerified: customer.isVerified
      }
    });
  } catch (error) {
    console.error('Error in verifySignup:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

/**
 * Route 3: POST /api/auth/forgot-password/send-otp
 * Accepts: email
 */
exports.sendForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if user exists
    const customer = await Customer.findOne({ email: cleanEmail });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'No account found with this email address.' });
    }

    // Generate 6-digit OTP and set 10-minute expiration
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    customer.emailOtp = otp;
    customer.otpExpiresAt = otpExpiresAt;
    await customer.save();

    // Send OTP via Nodemailer (with console fallback if SMTP is unconfigured)
    try {
      await sendOtpEmail(cleanEmail, otp, 'Password Reset OTP');
    } catch (mailErr) {
      console.warn(`[Mailer Warning] Could not send reset email via SMTP (${mailErr.message}). Demo OTP: ${otp}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset OTP sent successfully to your email.'
    });
  } catch (error) {
    console.error('Error in sendForgotPasswordOtp:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

/**
 * Route 4: POST /api/auth/forgot-password/reset
 * Accepts: email, otp, newPassword, confirmPassword
 */
exports.resetForgotPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Find customer including OTP fields
    const customer = await Customer.findOne({ email: cleanEmail }).select('+emailOtp +otpExpiresAt');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Verify OTP and expiration
    if (!customer.emailOtp || customer.emailOtp !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
    }

    if (new Date() > new Date(customer.otpExpiresAt)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
    }

    // Hash the new password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear OTP fields
    customer.password = hashedPassword;
    customer.emailOtp = undefined;
    customer.otpExpiresAt = undefined;

    await customer.save();

    // Sync updated password to User model
    const userDoc = await User.findOne({ email: cleanEmail });
    if (userDoc) {
      userDoc.password = newPassword;
      await userDoc.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully.'
    });
  } catch (error) {
    console.error('Error in resetForgotPassword:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};
