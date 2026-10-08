const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Branch Name is required'],
      trim: true,
      minlength: [3, 'Branch Name must be at least 3 characters'],
      validate: {
        validator: (v) => /^(?=.*[a-zA-Z])[a-zA-Z0-9\s,.\-&']{3,100}$/.test(v),
        message: 'Branch Name cannot be purely numeric and must contain at least one letter'
      }
    },
    code: { type: String, required: true, unique: true, uppercase: true },
    city: { type: String, required: true },
    address: {
      type: String,
      required: [true, 'Branch Address is required'],
      validate: {
        validator: (v) => /^(?=.*[a-zA-Z])[a-zA-Z0-9\s,.\-#/]{3,200}$/.test(v),
        message: 'Branch Address cannot be purely numeric and must contain at least one letter'
      }
    },
    phone: {
      type: String,
      required: [true, 'Branch Phone Number is required'],
      validate: {
        validator: (v) => /^[0-9]{10}$/.test(v),
        message: 'Branch Phone must be exactly 10 numeric digits (0-9)'
      }
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'deactivated', 'inactive'],
      default: 'active'
    },
    openingTime: {
      type: String,
      default: '09:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'openingTime must be in HH:mm format']
    },
    closingTime: {
      type: String,
      default: '20:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'closingTime must be in HH:mm format']
    },
    workingDays: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    chairs: { type: Number, default: 8 },
    rating: { type: Number, default: 5.0 },
    reviewCount: { type: Number, default: 0 },
    image: { type: String, default: '' },
    amenities: [{ type: String }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Branch', BranchSchema);
