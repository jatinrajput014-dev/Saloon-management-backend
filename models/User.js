const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    loginId: { type: String, trim: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    role: {
      type: String,
      enum: ['head_admin', 'branch_admin', 'customer', 'stylist', 'HeadAdmin', 'BranchManager', 'Customer'],
      default: 'customer'
    },
    // If user is a branch admin or stylist, points to their branch
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null
    },
    memberTier: {
      type: String,
      enum: ['Regular Customer', 'Classic Member', 'Standard Customer', 'Customer'],
      default: 'Regular Customer'
    },
    loyaltyPoints: { type: Number, default: 100 },
    avatar: { type: String, default: '' },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
