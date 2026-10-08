const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes (Direct & Role-Scoped Aliases)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/branches', require('./routes/branchRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/v1/attendance', require('./routes/attendanceRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

// Aliases for Role-Based API Specification (/api/admin, /api/branch, /api/cx)
app.use('/api/admin/branches', require('./routes/branchRoutes'));
app.use('/api/admin/categories', require('./routes/serviceRoutes'));
app.use('/api/admin/services', require('./routes/serviceRoutes'));
app.use('/api/admin/coupons', require('./routes/couponRoutes'));
app.use('/api/admin/reports', require('./routes/reportRoutes'));

app.use('/api/branch/settings', require('./routes/branchRoutes'));
app.use('/api/branch/appointments', require('./routes/appointmentRoutes'));
app.use('/api/branch/reports', require('./routes/reportRoutes'));

app.use('/api/cx/branches', require('./routes/branchRoutes'));
app.use('/api/cx/categories', require('./routes/serviceRoutes'));
app.use('/api/cx/services', require('./routes/serviceRoutes'));
app.use('/api/cx/appointments', require('./routes/appointmentRoutes'));

const mongoose = require('mongoose');

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'online',
    database: dbStatusMap[dbState] || 'unknown',
    dbConnected: dbState === 1,
    system: 'Luxe Haus Multi-Branch Salon Management Platform',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Luxe Haus Server] Running on http://localhost:${PORT}`);
});
