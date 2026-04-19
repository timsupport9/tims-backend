const express = require('express');
const Task = require('../models/Task');
const Expert = require('../models/Expert');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const pendingTasks = await Task.countDocuments({ status: 'pending' });
    const inProgressTasks = await Task.countDocuments({ status: 'in-progress' });
    
    const tasksByPriority = await Task.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    
    const tasksBySpecialization = await Task.aggregate([
      { $group: { _id: '$specialization', count: { $sum: 1 } } }
    ]);
    
    const expertPerformance = await Expert.aggregate([
      { $match: { role: 'expert' } },
      { $project: { fullName: 1, tasksCompleted: 1, rating: 1 } },
      { $sort: { tasksCompleted: -1 } },
      { $limit: 5 }
    ]);
    
    const averageCompletionTime = await Task.aggregate([
      { $match: { status: 'completed', completedAt: { $exists: true } } },
      { $project: { timeDiff: { $subtract: ['$completedAt', '$createdAt'] } } },
      { $group: { _id: null, avgTime: { $avg: '$timeDiff' } } }
    ]);
    
    res.json({
      overview: {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        completionRate: totalTasks ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0
      },
      tasksByPriority,
      tasksBySpecialization,
      expertPerformance,
      averageCompletionTime: averageCompletionTime[0]?.avgTime / (1000 * 60 * 60) || 0 // hours
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
