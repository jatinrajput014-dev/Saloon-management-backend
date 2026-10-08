const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      validate: {
        validator: function(v) {
          return /[a-zA-Z]/.test(v);
        },
        message: 'Promo / Coupon Code must contain at least 1 letter (cannot be purely numeric).'
      }
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    discountValue: { type: Number, required: true },
    minOrderAmount: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 100 },
    validFrom: { type: Date, default: Date.now },
    validUntil: { type: Date, required: true },
    usageLimit: { type: Number, default: 500 },
    usageCount: { type: Number, default: 0 },
    applicableBranches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
      }
    ],
    allBranchesApplicable: { type: Boolean, default: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', CouponSchema);
