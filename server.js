// server.js - Simplified working version for Render
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',  // Allow all origins for initial deployment
    credentials: true
  }
});

// Simple middleware
app.use(cors());
app.use(express.json());

// In-memory storage (for immediate deployment without MongoDB)
let users = [];
let experts = [];
let tasks = [];
let taskComments = [];

// Simple JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'tims_secret_key_2026';

// Seed initial data
async function seedData() {
  // Check if admin exists
  const adminExists = users.find(u => u.email === 'admin@tims.com');
  if (!adminExists) {
    users.push({
      id: uuidv4(),
      email: 'admin@tims.com',
      password: await bcrypt.hash('admin123', 10),
      fullName: 'System Administrator',
      role: 'admin',
      createdAt: new Date().toISOString()
    });
  }

  // Seed experts
  if (experts.length === 0) {
    const expertsSeed = [
      { fullName: 'Sarah Johnson', email: 'sarah.j@tims.com', specialization: 'Network Security', isAvailable: true, tasksCompleted: 24, rating: 4.9 },
      { fullName: 'Michael Chen', email: 'michael.c@tims.com', specialization: 'Cloud Infrastructure', isAvailable: true, tasksCompleted: 18, rating: 4.7 },
      { fullName: 'Elena Rodriguez', email: 'elena.r@tims.com', specialization: 'Database Management', isAvailable: false, tasksCompleted: 32, rating: 5.0 }
    ];

    for (const exp of expertsSeed) {
      const expertId = uuidv4();
      experts.push({
        id: expertId,
        ...exp,
        createdAt: new Date().toISOString()
      });
      
      // Create user account for expert
      users.push({
        id: expertId,
        email: exp.email,
        password: await bcrypt.hash('expert123', 10),
        fullName: exp.fullName,
        role: 'expert',
        specialization: exp.specialization,
        createdAt: new Date().toISOString()
      });
    }
  }

  // Seed tasks
  if (tasks.length === 0) {
    tasks.push(
      {
        id: uuidv4(),
        title: 'Critical Security Patch',
        description: 'Apply security patches to production servers',
        specialization: 'Network Security',
        status: 'in-progress',
        priority: 'high',
        dueDate: '2026-05-10',
        createdBy: users[0]?.id,
        assignedTo: experts[0]?.id,
        assignedToName: experts[0]?.fullName,
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        title: 'Cloud Migration',
        description: 'Help client migrate to AWS',
        specialization: 'Cloud Infrastructure',
        status: 'pending',
        priority: 'high',
        dueDate: '2026-05-15',
        createdBy: users[0]?.id,
        createdAt: new Date().toISOString()
      }
    );
  }
}

// Helper functions
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function broadcastDataUpdate() {
  io.emit('data-update', { 
    experts: experts.map(e => ({ ...e, password: undefined })), 
    tasks: tasks 
  });
}

// API Routes
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const expertData = experts.find(e => e.id === user.id);
    const responseUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      specialization: expertData?.specialization || user.specialization,
      tasksCompleted: expertData?.tasksCompleted || 0,
      rating: expertData?.rating || 4.5
    };

    res.json({ token, user: responseUser });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/data', authenticateToken, (req, res) => {
  const expertsData = experts.map(e => ({
    id: e.id,
    fullName: e.fullName,
    email: e.email,
    specialization: e.specialization,
    isAvailable: e.isAvailable,
    tasksCompleted: e.tasksCompleted,
    rating: e.rating
  }));

  res.json({ experts: expertsData, tasks: tasks });
});

app.post('/api/experts', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { fullName, email, specialization } = req.body;
    
    const expertId = uuidv4();
    const newExpert = {
      id: expertId,
      fullName,
      email,
      specialization,
      isAvailable: true,
      tasksCompleted: 0,
      rating: 4.5,
      createdAt: new Date().toISOString()
    };
    
    experts.push(newExpert);
    
    users.push({
      id: expertId,
      email,
      password: await bcrypt.hash('expert123', 10),
      fullName,
      role: 'expert',
      specialization,
      createdAt: new Date().toISOString()
    });

    broadcastDataUpdate();
    res.status(201).json(newExpert);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expert' });
  }
});

app.patch('/api/experts/:userId/toggle', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const expert = experts.find(e => e.id === req.params.userId);
  if (!expert) {
    return res.status(404).json({ error: 'Expert not found' });
  }

  expert.isAvailable = !expert.isAvailable;
  broadcastDataUpdate();
  res.json({ success: true, isAvailable: expert.isAvailable });
});

app.post('/api/tasks', authenticateToken, (req, res) => {
  const { title, description, specialization, dueDate, priority = 'medium' } = req.body;
  
  const newTask = {
    id: uuidv4(),
    title,
    description,
    specialization,
    status: 'pending',
    priority,
    dueDate: dueDate || null,
    createdBy: req.user.id,
    assignedTo: null,
    assignedToName: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  tasks.push(newTask);
  broadcastDataUpdate();
  res.status(201).json(newTask);
});

app.patch('/api/tasks/:taskId/status', authenticateToken, (req, res) => {
  const task = tasks.find(t => t.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { status } = req.body;
  task.status = status;
  task.updatedAt = new Date().toISOString();

  if (status === 'completed' && task.assignedTo) {
    const expert = experts.find(e => e.id === task.assignedTo);
    if (expert) {
      expert.tasksCompleted = (expert.tasksCompleted || 0) + 1;
    }
  }

  broadcastDataUpdate();
  res.json({ success: true, status: task.status });
});

app.patch('/api/tasks/:taskId/assign', authenticateToken, (req, res) => {
  const task = tasks.find(t => t.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { expertId, expertName } = req.body;
  const expert = experts.find(e => e.id === expertId);
  if (!expert) {
    return res.status(404).json({ error: 'Expert not found' });
  }

  task.assignedTo = expertId;
  task.assignedToName = expertName || expert.fullName;
  task.status = 'in-progress';
  task.updatedAt = new Date().toISOString();

  broadcastDataUpdate();
  res.json({ success: true });
});

app.patch('/api/tasks/:taskId/claim', authenticateToken, (req, res) => {
  if (req.user.role !== 'expert') {
    return res.status(403).json({ error: 'Only experts can claim tasks' });
  }

  const task = tasks.find(t => t.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.assignedTo) {
    return res.status(400).json({ error: 'Task already assigned' });
  }

  const expert = experts.find(e => e.id === req.user.id);
  if (!expert) {
    return res.status(404).json({ error: 'Expert profile not found' });
  }

  task.assignedTo = req.user.id;
  task.assignedToName = req.user.fullName;
  task.status = 'in-progress';
  task.updatedAt = new Date().toISOString();

  broadcastDataUpdate();
  res.json({ success: true });
});

app.delete('/api/tasks/:taskId', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const taskIndex = tasks.findIndex(t => t.id === req.params.taskId);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks.splice(taskIndex, 1);
  broadcastDataUpdate();
  res.json({ success: true });
});

app.post('/api/tasks/:taskId/comments', authenticateToken, (req, res) => {
  const { text, author } = req.body;
  const newComment = {
    id: uuidv4(),
    taskId: req.params.taskId,
    text,
    author: author || req.user.fullName,
    authorId: req.user.id,
    timestamp: new Date().toISOString()
  };
  
  taskComments.push(newComment);
  io.emit('comment-added', { taskId: req.params.taskId, comment: newComment });
  res.status(201).json(newComment);
});

app.get('/api/stats', authenticateToken, (req, res) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  
  res.json({
    overview: {
      totalTasks,
      completedTasks,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
      completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0
    },
    byPriority: {
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    stats: {
      users: users.length,
      experts: experts.length,
      tasks: tasks.length
    }
  });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.emit('data-update', { experts, tasks });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;

seedData().then(() => {
  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔑 Admin: admin@tims.com / admin123`);
    console.log(`👤 Expert: sarah.j@tims.com / expert123`);
  });
});
