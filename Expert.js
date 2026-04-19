const express = require('express');
const bcrypt = require('bcryptjs');
const Expert = require('../models/Expert');
const Task = require('../models/Task');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const router = express.Router();

// Get all experts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const experts = await Expert.find({}, '-password');
    res.json(experts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new expert (admin only)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { fullName, email, specialization } = req.body;
    
    const existingExpert = await Expert.findOne({ email });
    if (existingExpert) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    const defaultPassword = 'expert123';
    const expert = new Expert({
      fullName,
      email,
      password: defaultPassword,
      specialization,
      role: 'expert'
    });
    
    await expert.save();
    
    const broadcast = req.app.get('broadcastUpdates');
    if (broadcast) await broadcast();
    
    res.status(201).json({ message: 'Expert created successfully', expert: { id: expert._id, fullName, email, specialization } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle expert availability
router.patch('/:id/toggle', authMiddleware, adminOnly, async (req, res) => {
  try {
    const expert = await Expert.findById(req.params.id);
    if (!expert) {
      return res.status(404).json({ error: 'Expert not found' });
    }
    
    expert.isAvailable = !expert.isAvailable;
    await expert.save();
    
    const broadcast = req.app.get('broadcastUpdates');
    if (broadcast) await broadcast();
    
    res.json({ message: 'Availability toggled', isAvailable: expert.isAvailable });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get expert statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const totalExperts = await Expert.countDocuments({ role: 'expert' });
    const availableExperts = await Expert.countDocuments({ role: 'expert', isAvailable: true });
    const avgRating = await Expert.aggregate([
      { $match: { role: 'expert' } },
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);
    
    res.json({
      totalExperts,
      availableExperts,
      avgRating: avgRating[0]?.avg || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
