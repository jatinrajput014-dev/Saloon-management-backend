const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Sends an OTP email to the specified email address.
 * @param {string} to - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} subject - Email subject line
 */
const sendOtpEmail = async (to, otp, subject = 'Your Verification Code') => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Auth Service'}" <${process.env.SMTP_USER || 'no-reply@auth.com'}>`,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">${subject}</h2>
        <p style="font-size: 16px; color: #555;">Use the following 6-digit OTP to complete your request. This code is valid for <strong>10 minutes</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4A90E2; background: #f0f4f8; padding: 10px 20px; border-radius: 8px;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #888;">If you did not request this code, please ignore this email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail };
