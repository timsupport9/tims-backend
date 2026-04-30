// backend/server.js
// Production-ready TIMS Support Portal Backend
// With MongoDB, Rate Limiting, CORS Policies, and Environment Validation

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// ======================== ENVIRONMENT VALIDATION ========================
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'FRONTEND_URL',
  'PORT'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
  console.error('\n⚠️  Please set these variables before starting the server.');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Environment variables with defaults for development
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URLS = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:3000', 'http://localhost:5500'];
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

console.log(`🚀 Starting server in ${NODE_ENV} mode`);
console.log(`📡 Frontend URLs allowed: ${FRONTEND_URLS.join(', ')}`);

// ======================== DATABASE MODELS (MongoDB) ========================
// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'expert'], required: true },
  specialization: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true }
});

// Expert Schema (extends user with expert-specific fields)
const expertSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  userId: { type: String, required: true, unique: true, ref: 'User' },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  specialization: { type: String, required: true },
  isAvailable: { type: Boolean, default: true },
  tasksCompleted: { type: Number, default: 0 },
  rating: { type: Number, default: 4.5, min: 0, max: 5 },
  skills: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Task Schema
const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  specialization: { type: String, required: true },
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: { type: Date },
  createdBy: { type: String, required: true, ref: 'User' },
  assignedTo: { type: String, ref: 'Expert' },
  assignedToName: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

// Comment Schema
const commentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  taskId: { type: String, required: true, ref: 'Task', index: true },
  text: { type: String, required: true },
  author: { type: String, required: true },
  authorId: { type: String, required: true, ref: 'User' },
  timestamp: { type: Date, default: Date.now }
});

// Activity Log Schema
const activityLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  action: { type: String, required: true },
  details: { type: String, required: true },
  userId: { type: String, ref: 'User' },
  userEmail: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
});

// Create indexes for better query performance
userSchema.index({ email: 1 });
taskSchema.index({ status: 1, priority: 1, specialization: 1 });
taskSchema.index({ assignedTo: 1 });
commentSchema.index({ taskId: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });

const User = mongoose.model('User', userSchema);
const Expert = mongoose.model('Expert', expertSchema);
const Task = mongoose.model('Task', taskSchema);
const Comment = mongoose.model('Comment', commentSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// ======================== MIDDLEWARE ========================
// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (FRONTEND_URLS.indexOf(origin) !== -1 || NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security: Prevent MongoDB injection
app.use(mongoSanitize());

// Compression for better performance
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health' // Skip rate limiting for health check
});

// Stricter limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, please try again after 15 minutes.' }
});

// Apply rate limiting
app.use('/api/', limiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

// ======================== SOCKET.IO WITH CORS ========================
const io = socketIo(server, {
  cors: {
    origin: FRONTEND_URLS,
    credentials: true,
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// ======================== HELPER FUNCTIONS ========================
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

async function broadcastDataUpdate() {
  try {
    const experts = await Expert.find().select('-__v').lean();
    const tasks = await Task.find().sort({ createdAt: -1 }).lean();
    
    io.emit('data-update', { experts, tasks });
  } catch (error) {
    console.error('Broadcast error:', error);
  }
}

async function addActivityLog(action, details, userId = null, userEmail = null) {
  try {
    const log = new ActivityLog({
      action,
      details,
      userId,
      userEmail,
      timestamp: new Date()
    });
    await log.save();
    
    // Keep only last 1000 logs for performance
    const count = await ActivityLog.countDocuments();
    if (count > 1000) {
      const oldestLogs = await ActivityLog.find().sort({ timestamp: 1 }).limit(count - 1000);
      await ActivityLog.deleteMany({ _id: { $in: oldestLogs.map(l => l._id) } });
    }
    
    io.emit('activity-log', { action, details, timestamp: log.timestamp });
    return log;
  } catch (error) {
    console.error('Activity log error:', error);
  }
}

// ======================== INITIALIZE DATABASE WITH SEED DATA ========================
async function initializeDatabase() {
  try {
    // Check if admin exists
    const adminExists = await User.findOne({ email: 'admin@tims.com' });
    if (!adminExists) {
      const adminId = uuidv4();
      const admin = new User({
        id: adminId,
        email: 'admin@tims.com',
        password: await bcrypt.hash('admin123', 10),
        fullName: 'System Administrator',
        role: 'admin',
        createdAt: new Date(),
        isActive: true
      });
      await admin.save();
      console.log('✅ Admin user created');
    }

    // Seed experts
    const expertsSeed = [
      { fullName: 'Sarah Johnson', email: 'sarah.j@tims.com', specialization: 'Network Security', isAvailable: true, tasksCompleted: 24, rating: 4.9, skills: ['Firewall', 'IDS/IPS', 'VPN'] },
      { fullName: 'Michael Chen', email: 'michael.c@tims.com', specialization: 'Cloud Infrastructure', isAvailable: true, tasksCompleted: 18, rating: 4.7, skills: ['AWS', 'Azure', 'Kubernetes'] },
      { fullName: 'Elena Rodriguez', email: 'elena.r@tims.com', specialization: 'Database Management', isAvailable: false, tasksCompleted: 32, rating: 5.0, skills: ['MySQL', 'PostgreSQL', 'MongoDB'] },
      { fullName: 'David Kim', email: 'david.k@tims.com', specialization: 'Frontend Support', isAvailable: true, tasksCompleted: 12, rating: 4.5, skills: ['React', 'Vue', 'Angular'] },
      { fullName: 'Priya Patel', email: 'priya.p@tims.com', specialization: 'DevOps', isAvailable: true, tasksCompleted: 27, rating: 4.8, skills: ['CI/CD', 'Docker', 'Jenkins'] }
    ];

    for (const expData of expertsSeed) {
      const expertExists = await Expert.findOne({ email: expData.email });
      if (!expertExists) {
        const expertId = uuidv4();
        
        // Create user account
        const user = new User({
          id: expertId,
          email: expData.email,
          password: await bcrypt.hash('expert123', 10),
          fullName: expData.fullName,
          role: 'expert',
          specialization: expData.specialization,
          createdAt: new Date(),
          isActive: true
        });
        await user.save();
        
        // Create expert profile
        const expert = new Expert({
          id: expertId,
          userId: expertId,
          fullName: expData.fullName,
          email: expData.email,
          specialization: expData.specialization,
          isAvailable: expData.isAvailable,
          tasksCompleted: expData.tasksCompleted,
          rating: expData.rating,
          skills: expData.skills,
          createdAt: new Date()
        });
        await expert.save();
        console.log(`✅ Expert created: ${expData.fullName}`);
      }
    }

    // Seed tasks if none exist
    const taskCount = await Task.countDocuments();
    if (taskCount === 0) {
      const admin = await User.findOne({ email: 'admin@tims.com' });
      const experts = await Expert.find();
      
      const tasksSeed = [
        {
          title: 'Critical Security Patch Deployment',
          description: 'Apply latest security patches to production servers. Vulnerability CVE-2026-001 needs immediate attention.',
          specialization: 'Network Security',
          status: 'in-progress',
          priority: 'high',
          dueDate: new Date('2026-05-10'),
          createdBy: admin.id,
          assignedTo: experts[0]?.id,
          assignedToName: experts[0]?.fullName
        },
        {
          title: 'Cloud Migration Assistance',
          description: 'Help client migrate legacy applications to AWS cloud infrastructure.',
          specialization: 'Cloud Infrastructure',
          status: 'pending',
          priority: 'high',
          dueDate: new Date('2026-05-15'),
          createdBy: admin.id
        },
        {
          title: 'Database Performance Optimization',
          description: 'Investigate slow queries and optimize database indexes for better performance.',
          specialization: 'Database Management',
          status: 'in-progress',
          priority: 'medium',
          dueDate: new Date('2026-05-12'),
          createdBy: admin.id,
          assignedTo: experts[2]?.id,
          assignedToName: experts[2]?.fullName
        },
        {
          title: 'UI Bug Fix - Dashboard Loading',
          description: 'Dashboard takes 10+ seconds to load. Investigate and fix performance issue.',
          specialization: 'Frontend Support',
          status: 'pending',
          priority: 'medium',
          dueDate: new Date('2026-05-08'),
          createdBy: admin.id
        },
        {
          title: 'CI/CD Pipeline Configuration',
          description: 'Set up automated deployment pipeline for microservices.',
          specialization: 'DevOps',
          status: 'completed',
          priority: 'low',
          dueDate: new Date('2026-05-05'),
          createdBy: admin.id,
          assignedTo: experts[4]?.id,
          assignedToName: experts[4]?.fullName,
          completedAt: new Date('2026-05-04')
        }
      ];

      for (const taskData of tasksSeed) {
        const task = new Task(taskData);
        await task.save();
      }
      console.log('✅ Seed tasks created');
    }

    console.log('📊 Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// ======================== API ROUTES ========================
// Authentication
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await addActivityLog('Failed Login', `Failed login attempt for ${email}`, null, email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Get expert details if role is expert
    let expertData = null;
    if (user.role === 'expert') {
      expertData = await Expert.findOne({ userId: user.id });
    }

    const responseUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      specialization: expertData?.specialization || user.specialization,
      tasksCompleted: expertData?.tasksCompleted || 0,
      rating: expertData?.rating || 4.5
    };

    await addActivityLog('User Login', `${user.fullName} logged in`, user.id, user.email);
    res.json({ token, user: responseUser });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all data
app.get('/api/data', authenticateToken, async (req, res) => {
  try {
    const experts = await Expert.find().select('-__v').lean();
    let tasks = await Task.find().sort({ createdAt: -1 }).lean();

    // Filter tasks for experts
    if (req.user.role === 'expert') {
      tasks = tasks.map(task => ({
        ...task,
        canEdit: task.assignedTo === req.user.id || !task.assignedTo
      }));
    }

    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
      availableExperts: experts.filter(e => e.isAvailable).length
    };

    res.json({ experts, tasks, stats });
  } catch (error) {
    console.error('Data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Create expert
app.post('/api/experts', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { fullName, email, specialization } = req.body;
    
    const existingExpert = await Expert.findOne({ email });
    if (existingExpert) {
      return res.status(400).json({ error: 'Expert with this email already exists' });
    }

    const expertId = uuidv4();
    
    // Create user account
    const user = new User({
      id: expertId,
      email,
      password: await bcrypt.hash('expert123', 10),
      fullName,
      role: 'expert',
      specialization,
      createdAt: new Date(),
      isActive: true
    });
    await user.save();
    
    // Create expert profile
    const newExpert = new Expert({
      id: expertId,
      userId: expertId,
      fullName,
      email,
      specialization,
      isAvailable: true,
      tasksCompleted: 0,
      rating: 4.5,
      createdAt: new Date()
    });
    await newExpert.save();

    await addActivityLog('Create Expert', `${fullName} added as ${specialization} expert`, req.user.id);
    await broadcastDataUpdate();
    res.status(201).json(newExpert);
  } catch (error) {
    console.error('Create expert error:', error);
    res.status(500).json({ error: 'Failed to create expert' });
  }
});

// Toggle expert availability
app.patch('/api/experts/:userId/toggle', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const expert = await Expert.findOne({ id: req.params.userId });
    if (!expert) {
      return res.status(404).json({ error: 'Expert not found' });
    }

    expert.isAvailable = !expert.isAvailable;
    expert.updatedAt = new Date();
    await expert.save();

    await addActivityLog('Toggle Availability', `${expert.fullName} is now ${expert.isAvailable ? 'available' : 'busy'}`, req.user.id);
    await broadcastDataUpdate();
    res.json({ success: true, isAvailable: expert.isAvailable });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
});

// Create task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, specialization, dueDate, priority = 'medium' } = req.body;
    
    const newTask = new Task({
      title,
      description,
      specialization,
      status: 'pending',
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newTask.save();
    await addActivityLog('Create Task', `"${title}" created with ${priority} priority`, req.user.id);
    await broadcastDataUpdate();
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task status
app.patch('/api/tasks/:taskId/status', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ id: req.params.taskId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { status } = req.body;
    const oldStatus = task.status;
    task.status = status;
    task.updatedAt = new Date();
    
    if (status === 'completed' && oldStatus !== 'completed') {
      task.completedAt = new Date();
      
      // Update expert's completed tasks count
      if (task.assignedTo) {
        const expert = await Expert.findOne({ id: task.assignedTo });
        if (expert) {
          expert.tasksCompleted = (expert.tasksCompleted || 0) + 1;
          await expert.save();
        }
      }
    }
    
    await task.save();

    await addActivityLog('Status Update', `Task "${task.title}" status changed from ${oldStatus} to ${status}`, req.user.id);
    await broadcastDataUpdate();
    res.json({ success: true, status: task.status });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Assign task to expert
app.patch('/api/tasks/:taskId/assign', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ id: req.params.taskId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { expertId, expertName } = req.body;
    const expert = await Expert.findOne({ id: expertId });
    if (!expert) {
      return res.status(404).json({ error: 'Expert not found' });
    }

    task.assignedTo = expertId;
    task.assignedToName = expertName || expert.fullName;
    task.status = 'in-progress';
    task.updatedAt = new Date();
    await task.save();

    await addActivityLog('Assign Task', `"${task.title}" assigned to ${expert.fullName}`, req.user.id);
    await broadcastDataUpdate();
    res.json({ success: true, assignedTo: expertId, assignedToName: expert.fullName });
  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({ error: 'Failed to assign task' });
  }
});

// Claim task (for experts)
app.patch('/api/tasks/:taskId/claim', authenticateToken, async (req, res) => {
  if (req.user.role !== 'expert') {
    return res.status(403).json({ error: 'Only experts can claim tasks' });
  }

  try {
    const task = await Task.findOne({ id: req.params.taskId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.assignedTo) {
      return res.status(400).json({ error: 'Task already assigned' });
    }

    const expert = await Expert.findOne({ userId: req.user.id });
    if (!expert) {
      return res.status(404).json({ error: 'Expert profile not found' });
    }

    task.assignedTo = expert.id;
    task.assignedToName = req.user.fullName;
    task.status = 'in-progress';
    task.updatedAt = new Date();
    await task.save();

    await addActivityLog('Claim Task', `${req.user.fullName} claimed "${task.title}"`, req.user.id);
    await broadcastDataUpdate();
    res.json({ success: true, message: 'Task claimed successfully' });
  } catch (error) {
    console.error('Claim task error:', error);
    res.status(500).json({ error: 'Failed to claim task' });
  }
});

// Delete task
app.delete('/api/tasks/:taskId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const task = await Task.findOne({ id: req.params.taskId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await Task.deleteOne({ id: req.params.taskId });
    // Also delete associated comments
    await Comment.deleteMany({ taskId: req.params.taskId });
    
    await addActivityLog('Delete Task', `"${task.title}" deleted`, req.user.id);
    await broadcastDataUpdate();
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Add comment to task
app.post('/api/tasks/:taskId/comments', authenticateToken, async (req, res) => {
  try {
    const { text, author } = req.body;
    const taskId = req.params.taskId;
    
    const task = await Task.findOne({ id: taskId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const newComment = new Comment({
      taskId,
      text,
      author: author || req.user.fullName,
      authorId: req.user.id,
      timestamp: new Date()
    });
    
    await newComment.save();
    
    // Emit real-time comment notification
    io.emit('comment-added', {
      taskId,
      comment: newComment,
      taskTitle: task.title
    });
    
    await addActivityLog('Add Comment', `${req.user.fullName} commented on "${task.title}"`, req.user.id);
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get task comments
app.get('/api/tasks/:taskId/comments', authenticateToken, async (req, res) => {
  try {
    const comments = await Comment.find({ taskId: req.params.taskId }).sort({ timestamp: -1 }).lean();
    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get statistics
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.find().lean();
    const experts = await Expert.find().lean();
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    
    const tasksByPriority = {
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length
    };
    
    const tasksBySpecialization = {};
    tasks.forEach(task => {
      tasksBySpecialization[task.specialization] = (tasksBySpecialization[task.specialization] || 0) + 1;
    });
    
    const topPerformers = [...experts]
      .sort((a, b) => (b.tasksCompleted || 0) - (a.tasksCompleted || 0))
      .slice(0, 5)
      .map(e => ({ name: e.fullName, completed: e.tasksCompleted || 0, rating: e.rating }));
    
    const recentActivity = await ActivityLog.find().sort({ timestamp: -1 }).limit(20).lean();
    
    res.json({
      overview: {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0
      },
      byPriority: tasksByPriority,
      bySpecialization: tasksBySpecialization,
      topPerformers,
      recentActivity
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get activity logs
app.get('/api/activities', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(limit).lean();
    res.json(logs);
  } catch (error) {
    console.error('Activities error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    database: dbStatus,
    stats: {
      users: await User.countDocuments(),
      experts: await Expert.countDocuments(),
      tasks: await Task.countDocuments(),
      comments: await Comment.countDocuments()
    }
  });
});

// ======================== SOCKET.IO CONNECTION HANDLER ========================
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

io.on('connection', async (socket) => {
  console.log(`🔌 User connected: ${socket.user.email} (${socket.user.role})`);
  
  // Send initial data on connection
  try {
    const experts = await Expert.find().select('-__v').lean();
    const tasks = await Task.find().sort({ createdAt: -1 }).lean();
    socket.emit('data-update', { experts, tasks });
  } catch (error) {
    console.error('Initial data emit error:', error);
  }
  
  socket.on('new-comment', async (commentData) => {
    io.emit('comment-added', commentData);
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.user.email}`);
  });
});

// ======================== ERROR HANDLING MIDDLEWARE ========================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ======================== START SERVER ========================
async function startServer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connected successfully');
    
    // Initialize database with seed data
    await initializeDatabase();
    
    // Start server
    server.listen(PORT, () => {
      console.log(`\n🚀 TIMS Backend Server running on port ${PORT}`);
      console.log(`📡 Environment: ${NODE_ENV}`);
      console.log(`🔒 CORS enabled for: ${FRONTEND_URLS.join(', ')}`);
      console.log(`📊 WebSocket ready for real-time updates`);
      console.log(`🔐 Rate limiting: ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 1000 / 60} minutes`);
      console.log(`\n📝 Test Credentials:`);
      console.log(`   Admin: admin@tims.com / admin123`);
      console.log(`   Expert: sarah.j@tims.com / expert123`);
      console.log(`   Expert: michael.c@tims.com / expert123`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

startServer();

// ======================== PACKAGE.JSON ========================
/*
{
  "name": "tims-backend-production",
  "version": "2.0.0",
  "description": "Production-ready TIMS Support Portal Backend with MongoDB, Rate Limiting, and Security Features",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node scripts/seed.js",
    "backup": "node scripts/backup.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "mongoose": "^8.0.0",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "uuid": "^9.0.1",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "express-mongo-sanitize": "^2.2.0",
    "compression": "^1.7.4",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
*/

// ======================== .ENV FILE EXAMPLE ========================
/*
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tims_db?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=https://timssupportcentre.netlify.app,https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
*/
