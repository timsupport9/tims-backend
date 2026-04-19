const express = require('express');
const Task = require('../models/Task');
const Expert = require('../models/Expert');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const router = express.Router();

// Get all tasks
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get combined data (experts + tasks)
router.get('/data', authMiddleware, async (req, res) => {
  try {
    const experts = await Expert.find({}, '-password');
    const tasks = await Task.find();
    res.json({ experts, tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new task (admin only)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, description, specialization, dueDate } = req.body;
    
    const task = new Task({
      title,
      description,
      specialization,
      dueDate: dueDate || null,
      createdBy: req.user.email,
      status: 'pending'
    });
    
    await task.save();
    
    const broadcast = req.app.get('broadcastUpdates');
    if (broadcast) await broadcast();
    
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user is admin or assigned expert
    if (req.user.role !== 'admin' && task.assignedTo && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    task.status = status;
    
    // If task is completed, increment expert's tasksCompleted count
    if (status === 'completed' && task.assignedTo) {
      const expert = await Expert.findById(task.assignedTo);
      if (expert) {
        expert.tasksCompleted += 1;
        await expert.save();
      }
    }
    
    await task.save();
    
    const broadcast = req.app.get('broadcastUpdates');
    if (broadcast) await broadcast();
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign task to expert
router.patch('/:id/assign', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { expertId, expertName } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    task.assignedTo = expertId;
    task.assignedToName = expertName;
    task.status = 'in-progress';
    
    await task.save();
    
    const broadcast = req.app.get('broadcastUpdates');
    if (broadcast) await broadcast();
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Claim task (expert)
router.patch('/:id/claim', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (task.assignedTo) {
      return res.status(400).json({ error: 'Task already assigned' });
    }
    
    const expert = await Expert.findById(req.user.id);
    if (expert.specialization !== task.specialization) {
      return res.status(400).json({ error: 'Task specialization does not match your skills' });
    }
    
    task.assignedTo = req.user.id;
    task.assignedToName = expert.fullName;
    task.status = 'in-progress';
    
    await task.save();
    
    const broadcast = req.app.get('broadcastUpdates');
    if (broadcast) await broadcast();
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const broadcast = req.app.get('broadcastUpdates');
    if (broadcast) await broadcast();
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
