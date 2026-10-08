const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const { protect, requireHeadAdmin } = require('../middleware/authMiddleware');
const { validateSchema } = require('../middleware/validationMiddleware');

// @route   GET /api/coupons
// @desc    Get all coupons
router.get('/', async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, count: coupons.length, coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/coupons
// @desc    Head Admin creates a new coupon
router.post('/', protect, requireHeadAdmin, validateSchema('coupon'), async (req, res) => {
  try {
    const { code, title, description, discountType, discountValue, minOrderAmount, maxDiscount, validUntil, usageLimit, applicableBranches } = req.body;
    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      title,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      validUntil,
      usageLimit,
      applicableBranches: applicableBranches || [],
      allBranchesApplicable: !applicableBranches || applicableBranches.length === 0
    });
    res.status(201).json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/coupons/validate
// @desc    Validate coupon code for customer checkout
router.post(['/validate', '/validate-coupon'], async (req, res) => {
  try {
    const { code, branchId, subtotal } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Coupon code required' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    if (!coupon.active) return res.status(400).json({ success: false, message: 'Coupon is inactive' });
    
    if (new Date(coupon.validUntil) < new Date()) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
    }

    if (subtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`
      });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    discount = Math.min(discount, subtotal);

    res.json({
      success: true,
      coupon,
      discount: Math.round(discount * 100) / 100,
      message: `Coupon '${coupon.code}' applied! You save ₹${discount.toFixed(2)}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/coupons/:id/toggle
router.patch('/:id/toggle', protect, requireHeadAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    coupon.active = !coupon.active;
    await coupon.save();
    res.json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
