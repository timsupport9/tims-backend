// server.js - Enhanced version with additional features
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
const compression = require('compression');
const morgan = require('morgan');
const { body, param, query, validationResult } = require('express-validator');
const NodeCache = require('node-cache');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Cache setup
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Enhanced middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per hour
  message: 'Too many attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/login', strictLimiter);
app.use('/api/', limiter);

// In-memory storage with better organization
let users = [];
let experts = [];
let tasks = [];
let taskComments = [];
let notifications = [];
let auditLogs = [];
let reports = [];
let activityLogs = [];

// Enhanced JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'tims_secret_key_2026';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'tims_refresh_secret_2026';
let refreshTokens = [];

// Helper functions
function logActivity(userId, action, details, ip = null) {
  const log = {
    id: uuidv4(),
    userId,
    action,
    details,
    ip,
    timestamp: new Date().toISOString()
  };
  activityLogs.push(log);
  // Keep only last 1000 logs
  if (activityLogs.length > 1000) activityLogs.shift();
  return log;
}

function addNotification(userId, title, message, type = 'info') {
  const notification = {
    id: uuidv4(),
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  };
  notifications.push(notification);
  io.to(`user-${userId}`).emit('notification', notification);
  return notification;
}

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
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
}

function broadcastDataUpdate() {
  const cacheData = {
    experts: experts.map(e => ({ 
      ...e, 
      password: undefined,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt
    })),
    tasks: tasks.map(t => ({ ...t, comments: taskComments.filter(c => c.taskId === t.id) }))
  };
  io.emit('data-update', cacheData);
  cache.set('dashboardData', cacheData);
}

// Validation middleware
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({ 
      errors: errors.array().map(err => ({ field: err.param, message: err.msg }))
    });
  };
};

// Enhanced seed data
async function seedData() {
  // Check if admin exists
  const adminExists = users.find(u => u.email === 'admin@tims.com');
  if (!adminExists) {
    const adminId = uuidv4();
    users.push({
      id: adminId,
      email: 'admin@tims.com',
      password: await bcrypt.hash('admin123', 10),
      fullName: 'System Administrator',
      role: 'admin',
      isActive: true,
      lastLogin: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    logActivity(adminId, 'system_init', 'Admin account created');
  }

  // Seed experts
  if (experts.length === 0) {
    const expertsSeed = [
      { fullName: 'Sarah Johnson', email: 'sarah.j@tims.com', specialization: 'Network Security', isAvailable: true, tasksCompleted: 24, rating: 4.9, expertise: ['Firewalls', 'IDS/IPS', 'VPN', 'Security Audits'] },
      { fullName: 'Michael Chen', email: 'michael.c@tims.com', specialization: 'Cloud Infrastructure', isAvailable: true, tasksCompleted: 18, rating: 4.7, expertise: ['AWS', 'Azure', 'Docker', 'Kubernetes'] },
      { fullName: 'Elena Rodriguez', email: 'elena.r@tims.com', specialization: 'Database Management', isAvailable: false, tasksCompleted: 32, rating: 5.0, expertise: ['PostgreSQL', 'MongoDB', 'MySQL', 'Performance Tuning'] }
    ];

    for (const exp of expertsSeed) {
      const expertId = uuidv4();
      experts.push({
        id: expertId,
        ...exp,
        hourlyRate: 75,
        availabilityHours: '9 AM - 5 PM',
        timezone: 'UTC',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      users.push({
        id: expertId,
        email: exp.email,
        password: await bcrypt.hash('expert123', 10),
        fullName: exp.fullName,
        role: 'expert',
        specialization: exp.specialization,
        isActive: true,
        lastLogin: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Enhanced seed tasks
  if (tasks.length === 0) {
    const tasksSeed = [
      {
        title: 'Critical Security Patch',
        description: 'Apply security patches to production servers',
        specialization: 'Network Security',
        status: 'in-progress',
        priority: 'high',
        dueDate: '2026-05-10',
        estimatedHours: 4,
        actualHours: 0,
        attachments: [],
        tags: ['security', 'urgent', 'production']
      },
      {
        title: 'Cloud Migration Assessment',
        description: 'Help client assess and plan AWS migration',
        specialization: 'Cloud Infrastructure',
        status: 'pending',
        priority: 'high',
        dueDate: '2026-05-15',
        estimatedHours: 8,
        actualHours: 0,
        attachments: [],
        tags: ['cloud', 'migration', 'planning']
      },
      {
        title: 'Database Performance Optimization',
        description: 'Optimize slow queries and indexes',
        specialization: 'Database Management',
        status: 'pending',
        priority: 'medium',
        dueDate: '2026-05-20',
        estimatedHours: 6,
        actualHours: 0,
        attachments: [],
        tags: ['database', 'performance', 'optimization']
      }
    ];

    for (const task of tasksSeed) {
      const newTask = {
        id: uuidv4(),
        ...task,
        createdBy: users[0]?.id,
        assignedTo: task.specialization === 'Network Security' ? experts[0]?.id : null,
        assignedToName: task.specialization === 'Network Security' ? experts[0]?.fullName : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        progress: task.status === 'in-progress' ? 25 : 0
      };
      tasks.push(newTask);
    }
  }
}

// API Routes with enhanced features

// Authentication routes
app.post('/api/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], validate([
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
]), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email && u.isActive !== false);
    if (!user) {
      logActivity(null, 'login_failed', `Failed login attempt for email: ${email}`, req.ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      logActivity(user.id, 'login_failed', 'Invalid password', req.ip);
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lastLogin = new Date().toISOString();
    
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );
    
    refreshTokens.push(refreshToken);

    const expertData = experts.find(e => e.id === user.id);
    const responseUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      specialization: expertData?.specialization || user.specialization,
      tasksCompleted: expertData?.tasksCompleted || 0,
      rating: expertData?.rating || 4.5,
      isAvailable: expertData?.isAvailable || true,
      lastLogin: user.lastLogin
    };

    logActivity(user.id, 'login_success', 'User logged in successfully', req.ip);
    addNotification(user.id, 'Welcome Back!', `Welcome back, ${user.fullName}!`, 'success');

    res.json({ 
      token: accessToken,
      refreshToken,
      user: responseUser 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }
  
  if (!refreshTokens.includes(refreshToken)) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const user = users.find(u => u.id === decoded.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({ token: newAccessToken });
  } catch (err) {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

app.post('/api/logout', authenticateToken, (req, res) => {
  const { refreshToken } = req.body;
  const index = refreshTokens.indexOf(refreshToken);
  if (index > -1) refreshTokens.splice(index, 1);
  
  logActivity(req.user.id, 'logout', 'User logged out', req.ip);
  res.json({ success: true });
});

// Enhanced data routes
app.get('/api/data', authenticateToken, (req, res) => {
  const cachedData = cache.get('dashboardData');
  if (cachedData) {
    return res.json(cachedData);
  }

  const expertsData = experts.map(e => ({
    id: e.id,
    fullName: e.fullName,
    email: e.email,
    specialization: e.specialization,
    isAvailable: e.isAvailable,
    tasksCompleted: e.tasksCompleted,
    rating: e.rating,
    expertise: e.expertise,
    hourlyRate: e.hourlyRate,
    availabilityHours: e.availabilityHours
  }));

  const tasksWithComments = tasks.map(task => ({
    ...task,
    comments: taskComments.filter(c => c.taskId === task.id)
  }));

  const response = { experts: expertsData, tasks: tasksWithComments };
  cache.set('dashboardData', response);
  res.json(response);
});

// Enhanced expert management
app.post('/api/experts', authenticateToken, [
  body('fullName').notEmpty().trim(),
  body('email').isEmail(),
  body('specialization').notEmpty(),
  body('expertise').optional().isArray(),
  body('hourlyRate').optional().isNumeric()
], validate([
  body('fullName').isLength({ min: 2, max: 100 }),
  body('email').isEmail(),
  body('specialization').isLength({ min: 3 })
]), async (req, res) => {
  if (req.user.role !== 'admin') {
    logActivity(req.user.id, 'unauthorized_access', 'Attempted to create expert without admin role', req.ip);
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { fullName, email, specialization, expertise = [], hourlyRate = 75 } = req.body;
    
    // Check if expert already exists
    if (experts.find(e => e.email === email) || users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Expert with this email already exists' });
    }
    
    const expertId = uuidv4();
    const newExpert = {
      id: expertId,
      fullName,
      email,
      specialization,
      expertise,
      hourlyRate,
      isAvailable: true,
      tasksCompleted: 0,
      rating: 4.5,
      availabilityHours: '9 AM - 5 PM',
      timezone: 'UTC',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    experts.push(newExpert);
    
    users.push({
      id: expertId,
      email,
      password: await bcrypt.hash('expert123', 10),
      fullName,
      role: 'expert',
      specialization,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    logActivity(req.user.id, 'expert_created', `Created expert: ${fullName} (${email})`, req.ip);
    addNotification(req.user.id, 'Expert Created', `Expert ${fullName} has been successfully added`, 'success');
    
    broadcastDataUpdate();
    res.status(201).json(newExpert);
  } catch (error) {
    console.error('Create expert error:', error);
    res.status(500).json({ error: 'Failed to create expert' });
  }
});

app.delete('/api/experts/:expertId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const expertIndex = experts.findIndex(e => e.id === req.params.expertId);
  if (expertIndex === -1) {
    return res.status(404).json({ error: 'Expert not found' });
  }

  const expert = experts[expertIndex];
  
  // Check if expert has assigned tasks
  const assignedTasks = tasks.filter(t => t.assignedTo === expert.id && t.status !== 'completed');
  if (assignedTasks.length > 0) {
    return res.status(400).json({ error: 'Cannot delete expert with active tasks' });
  }

  experts.splice(expertIndex, 1);
  
  // Deactivate user account instead of deleting
  const user = users.find(u => u.id === expert.id);
  if (user) {
    user.isActive = false;
    user.updatedAt = new Date().toISOString();
  }

  logActivity(req.user.id, 'expert_deleted', `Deleted expert: ${expert.fullName}`, req.ip);
  addNotification(req.user.id, 'Expert Deleted', `Expert ${expert.fullName} has been removed`, 'warning');
  
  broadcastDataUpdate();
  res.json({ success: true });
});

// Enhanced task management
app.post('/api/tasks', authenticateToken, [
  body('title').notEmpty().trim(),
  body('description').optional().trim(),
  body('specialization').notEmpty(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('dueDate').optional().isISO8601(),
  body('estimatedHours').optional().isNumeric()
], validate([
  body('title').isLength({ min: 3, max: 200 }),
  body('description').isLength({ max: 2000 }),
  body('specialization').isLength({ min: 3 })
]), (req, res) => {
  const { 
    title, description, specialization, dueDate, 
    priority = 'medium', estimatedHours = 0, tags = [] 
  } = req.body;
  
  const newTask = {
    id: uuidv4(),
    title,
    description: description || '',
    specialization,
    status: 'pending',
    priority,
    dueDate: dueDate || null,
    estimatedHours,
    actualHours: 0,
    progress: 0,
    createdBy: req.user.id,
    assignedTo: null,
    assignedToName: null,
    tags,
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null
  };
  
  tasks.push(newTask);
  
  logActivity(req.user.id, 'task_created', `Created task: ${title}`, req.ip);
  addNotification(req.user.id, 'Task Created', `Task "${title}" has been created successfully`, 'info');
  
  // Notify available experts
  const availableExperts = experts.filter(e => e.isAvailable && e.specialization === specialization);
  availableExperts.forEach(expert => {
    addNotification(expert.id, 'New Task Available', `A new task matching your expertise is available: ${title}`, 'info');
  });
  
  broadcastDataUpdate();
  res.status(201).json(newTask);
});

app.patch('/api/tasks/:taskId/progress', authenticateToken, [
  param('taskId').isUUID(),
  body('progress').isInt({ min: 0, max: 100 }),
  body('actualHours').optional().isNumeric()
], validate([
  param('taskId').isUUID(),
  body('progress').isInt({ min: 0, max: 100 })
]), (req, res) => {
  const task = tasks.find(t => t.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { progress, actualHours } = req.body;
  
  if (req.user.role !== 'admin' && task.assignedTo !== req.user.id) {
    return res.status(403).json({ error: 'Only assigned expert or admin can update progress' });
  }
  
  task.progress = progress;
  if (actualHours !== undefined) task.actualHours = actualHours;
  task.updatedAt = new Date().toISOString();
  
  if (progress === 100) {
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    
    if (task.assignedTo) {
      const expert = experts.find(e => e.id === task.assignedTo);
      if (expert) {
        expert.tasksCompleted = (expert.tasksCompleted || 0) + 1;
        addNotification(expert.id, 'Task Completed', `Congratulations! You've completed task: ${task.title}`, 'success');
      }
    }
  }
  
  logActivity(req.user.id, 'task_progress_updated', `Updated progress of task ${task.title} to ${progress}%`, req.ip);
  broadcastDataUpdate();
  res.json({ success: true, progress: task.progress, status: task.status });
});

// Enhanced comments with mentions
app.post('/api/tasks/:taskId/comments', authenticateToken, [
  param('taskId').isUUID(),
  body('text').notEmpty().trim()
], validate([
  param('taskId').isUUID(),
  body('text').isLength({ min: 1, max: 1000 })
]), (req, res) => {
  const { text } = req.body;
  
  // Check for mentions
  const mentionRegex = /@(\w+)/g;
  const mentions = [...text.matchAll(mentionRegex)].map(m => m[1]);
  
  const newComment = {
    id: uuidv4(),
    taskId: req.params.taskId,
    text,
    author: req.user.fullName,
    authorId: req.user.id,
    mentions,
    timestamp: new Date().toISOString(),
    edited: false,
    editedAt: null
  };
  
  taskComments.push(newComment);
  
  // Notify mentioned users
  mentions.forEach(username => {
    const mentionedUser = users.find(u => u.fullName.toLowerCase().includes(username.toLowerCase()));
    if (mentionedUser && mentionedUser.id !== req.user.id) {
      addNotification(mentionedUser.id, 'You were mentioned', `${req.user.fullName} mentioned you in a comment on task`, 'mention');
    }
  });
  
  io.emit('comment-added', { taskId: req.params.taskId, comment: newComment });
  res.status(201).json(newComment);
});

// Enhanced stats with more metrics
app.get('/api/stats', authenticateToken, (req, res) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  
  const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
  
  const avgCompletionTime = tasks
    .filter(t => t.completedAt && t.createdAt)
    .reduce((acc, t) => {
      const completionTime = new Date(t.completedAt) - new Date(t.createdAt);
      return acc + completionTime;
    }, 0) / (completedTasks || 1);
  
  const expertPerformance = experts.map(e => ({
    id: e.id,
    name: e.fullName,
    tasksCompleted: e.tasksCompleted,
    rating: e.rating,
    avgTaskCompletionTime: tasks
      .filter(t => t.assignedTo === e.id && t.completedAt)
      .reduce((acc, t) => acc + (new Date(t.completedAt) - new Date(t.createdAt)), 0) / (e.tasksCompleted || 1)
  }));
  
  res.json({
    overview: {
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0,
      averageCompletionTimeHours: (avgCompletionTime / (1000 * 60 * 60)).toFixed(2)
    },
    byPriority: {
      urgent: tasks.filter(t => t.priority === 'urgent').length,
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length
    },
    byExpertise: experts.reduce((acc, e) => {
      acc[e.specialization] = (acc[e.specialization] || 0) + 1;
      return acc;
    }, {}),
    expertPerformance
  });
});

// Reports endpoint
app.get('/api/reports', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { type = 'weekly', format = 'json' } = req.query;
  
  const report = {
    id: uuidv4(),
    type,
    generatedAt: new Date().toISOString(),
    generatedBy: req.user.id,
    data: {
      tasks: tasks.map(t => ({
        ...t,
        comments: taskComments.filter(c => c.taskId === t.id).length,
        completionDays: t.completedAt ? Math.ceil((new Date(t.completedAt) - new Date(t.createdAt)) / (1000 * 60 * 60 * 24)) : null
      })),
      experts: experts.map(e => ({
        ...e,
        activeTasks: tasks.filter(t => t.assignedTo === e.id && t.status !== 'completed').length
      })),
      activityLogs: activityLogs.slice(-100)
    }
  };
  
  reports.push(report);
  res.json(report);
});

// Notification routes
app.get('/api/notifications', authenticateToken, (req, res) => {
  const userNotifications = notifications.filter(n => n.userId === req.user.id);
  res.json(userNotifications);
});

app.patch('/api/notifications/:notificationId/read', authenticateToken, (req, res) => {
  const notification = notifications.find(n => n.id === req.params.notificationId);
  if (!notification || notification.userId !== req.user.id) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  
  notification.read = true;
  res.json({ success: true });
});

// Activity logs for admin
app.get('/api/activity-logs', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { limit = 100, offset = 0 } = req.query;
  const paginatedLogs = activityLogs.slice(offset, offset + limit);
  res.json({
    logs: paginatedLogs,
    total: activityLogs.length,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

// Health check with detailed info
app.get('/api/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    stats: {
      users: users.filter(u => u.isActive !== false).length,
      experts: experts.length,
      tasks: tasks.length,
      comments: taskComments.length,
      notifications: notifications.length
    },
    performance: {
      memoryUsage: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      },
      cacheSize: cache.keys().length,
      uptimeHours: (process.uptime() / 3600).toFixed(2)
    }
  });
});

// Socket.io with rooms and better event handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      socket.join(`user-${decoded.id}`);
      if (decoded.role === 'admin') {
        socket.join('admin-room');
      }
      socket.emit('authenticated', { success: true });
      
      // Send initial data
      const initialData = cache.get('dashboardData') || { experts, tasks };
      socket.emit('data-update', initialData);
      
      // Send unread notifications
      const unreadNotifications = notifications.filter(n => n.userId === decoded.id && !n.read);
      unreadNotifications.forEach(n => socket.emit('notification', n));
      
    } catch (err) {
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
    }
  });
  
  socket.on('task-update', (data) => {
    if (socket.user) {
      broadcastDataUpdate();
      io.to('admin-room').emit('task-changed', data);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.user) {
      logActivity(socket.user.id, 'disconnect', 'User disconnected from WebSocket');
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;

seedData().then(() => {
  server.listen(PORT, () => {
    console.log(`✅ Enhanced TIMS Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔑 Admin: admin@tims.com / admin123`);
    console.log(`👤 Expert credentials:`);
    experts.forEach(e => console.log(`   ${e.email} / expert123`));
    console.log(`\n🚀 New features enabled:`);
    console.log(`   • Rate limiting & security headers`);
    console.log(`   • Refresh tokens & session management`);
    console.log(`   • Real-time notifications`);
    console.log(`   • Activity logging & audit trails`);
    console.log(`   • Task progress tracking`);
    console.log(`   • Report generation`);
    console.log(`   • User mentions in comments`);
    console.log(`   • Caching for better performance`);
    console.log(`   • Enhanced error handling`);
    console.log(`   • WebSocket authentication`);
  });
});
