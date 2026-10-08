const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Service = require('../models/Service');
const { protect, requireHeadAdmin } = require('../middleware/authMiddleware');
const { validateSchema } = require('../middleware/validationMiddleware');

// --- Category Endpoints ---
// @route   GET /api/services/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: 1 });
    res.json({ success: true, count: categories.length, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/services/categories
router.post('/categories', protect, requireHeadAdmin, async (req, res) => {
  try {
    const { name, icon, description, color } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const category = await Category.create({ name, slug, icon, description, color });
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/services/categories/:id/toggle
router.patch('/categories/:id/toggle', protect, requireHeadAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    category.active = !category.active;
    await category.save();
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Service Catalog Endpoints ---
// @route   GET /api/services
router.get('/', async (req, res) => {
  try {
    const { branchId, categoryId } = req.query;
    const filter = { active: true };
    if (categoryId) filter.category = categoryId;
    if (branchId) {
      filter.$or = [{ branches: branchId }, { availableAtAllBranches: true }];
    }

    const services = await Service.find(filter).populate('category', 'name icon color');
    res.json({ success: true, count: services.length, services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/services
router.post('/', protect, requireHeadAdmin, validateSchema('service'), async (req, res) => {
  try {
    const { name, category, duration, price, description, popular, image, branches } = req.body;
    const service = await Service.create({
      name,
      category,
      duration,
      price,
      description,
      popular: !!popular,
      image,
      branches: branches || [],
      availableAtAllBranches: !branches || branches.length === 0
    });
    res.status(201).json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/services/:id
router.put('/:id', protect, requireHeadAdmin, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    const { name, category, duration, price, description, popular, image } = req.body;
    if (name) service.name = name;
    if (category) service.category = category;
    if (duration) service.duration = duration;
    if (price !== undefined) service.price = price;
    if (description) service.description = description;
    if (popular !== undefined) service.popular = popular;
    if (image !== undefined) service.image = image;

    await service.save();
    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/services/:id/toggle
router.patch('/:id/toggle', protect, requireHeadAdmin, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    service.active = !service.active;
    await service.save();
    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
