const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Import models
const Expert = require('./models/Expert');
const Task = require('./models/Task');
const Message = require('./models/Message');
const Notification = require('./models/Notification');

// Import routes
const authRoutes = require('./routes/auth');
const expertRoutes = require('./routes/experts');
const taskRoutes = require('./routes/tasks');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const reportRoutes = require('./routes/reports');

// Import middleware
const { authMiddleware } = require('./middleware/auth');
const { logger } = require('./utils/logger');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// ======================== MIDDLEWARE ========================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development, enable in production
  crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  abortOnLimit: true
}));

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'tims_session_secret_2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/tims_support',
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.'
});
app.use('/api/login', authLimiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Static files (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// ======================== DATABASE CONNECTION ========================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tims_support';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  logger.info('MongoDB connected successfully');
  initializeDefaultData();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB error:', err);
  logger.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
  logger.warn('MongoDB disconnected');
});

// ======================== INITIALIZE DEFAULT DATA ========================

async function initializeDefaultData() {
  const bcrypt = require('bcryptjs');
  
  try {
    // Create upload directories if they don't exist
    const uploadDirs = ['./uploads', './uploads/attachments', './logs'];
    uploadDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
    
    // Check if admin exists
    const adminExists = await Expert.findOne({ role: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
      const admin = await Expert.create({
        fullName: 'System Administrator',
        email: process.env.ADMIN_EMAIL || 'admin@tims.com',
        password: hashedPassword,
        specialization: 'System Administration',
        role: 'admin',
        isAvailable: true,
        rating: 5.0,
        tasksCompleted: 0,
        phone: '+1 (555) 000-0001'
      });
      console.log('✅ Default admin created:', admin.email);
      logger.info('Default admin created');
    }
    
    // Check if default experts exist
    const expertCount = await Expert.countDocuments({ role: 'expert' });
    if (expertCount === 0) {
      const defaultExperts = [
        {
          fullName: 'John Smith',
          email: 'john@tims.com',
          password: await bcrypt.hash('expert123', 10),
          specialization: 'Network Support',
          role: 'expert',
          isAvailable: true,
          rating: 4.8,
          tasksCompleted: 0,
          phone: '+1 (555) 000-0002'
        },
        {
          fullName: 'Sarah Johnson',
          email: 'sarah@tims.com',
          password: await bcrypt.hash('expert123', 10),
          specialization: 'Database Administration',
          role: 'expert',
          isAvailable: true,
          rating: 4.9,
          tasksCompleted: 0,
          phone: '+1 (555) 000-0003'
        },
        {
          fullName: 'Mike Chen',
          email: 'mike@tims.com',
          password: await bcrypt.hash('expert123', 10),
          specialization: 'Cloud Services',
          role: 'expert',
          isAvailable: true,
          rating: 4.7,
          tasksCompleted: 0,
          phone: '+1 (555) 000-0004'
        },
        {
          fullName: 'Emma Wilson',
          email: 'emma@tims.com',
          password: await bcrypt.hash('expert123', 10),
          specialization: 'Security',
          role: 'expert',
          isAvailable: true,
          rating: 4.9,
          tasksCompleted: 0,
          phone: '+1 (555) 000-0005'
        }
      ];
      
      await Expert.insertMany(defaultExperts);
      console.log('✅ Default experts created');
      logger.info('Default experts created');
    }
    
    // Create sample tasks if none exist
    const taskCount = await Task.countDocuments();
    if (taskCount === 0) {
      const experts = await Expert.find({ role: 'expert' });
      const sampleTasks = [
        {
          title: 'Network Connectivity Issues',
          description: 'Users unable to connect to VPN from remote locations',
          specialization: 'Network Support',
          status: 'pending',
          priority: 'high',
          createdBy: 'admin@tims.com',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'Database Performance Optimization',
          description: 'Slow query performance affecting application response time',
          specialization: 'Database Administration',
          status: 'in-progress',
          priority: 'high',
          createdBy: 'admin@tims.com',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'Cloud Migration Planning',
          description: 'Plan migration of legacy systems to AWS cloud infrastructure',
          specialization: 'Cloud Services',
          status: 'pending',
          priority: 'medium',
          createdBy: 'admin@tims.com',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'Security Audit Required',
          description: 'Conduct comprehensive security audit of all systems',
          specialization: 'Security',
          status: 'pending',
          priority: 'urgent',
          createdBy: 'admin@tims.com',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        }
      ];
      
      // Assign some tasks randomly
      if (experts.length > 0) {
        sampleTasks[1].assignedTo = experts[0]._id;
        sampleTasks[1].assignedToName = experts[0].fullName;
      }
      
      await Task.insertMany(sampleTasks);
      console.log('✅ Sample tasks created');
      logger.info('Sample tasks created');
    }
    
    console.log('🎉 Database initialization completed');
  } catch (error) {
    console.error('Error initializing database:', error);
    logger.error('Error initializing database:', error);
  }
}

// ======================== SOCKET.IO HANDLING ========================

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tims_secret_key_2024');
    const expert = await Expert.findById(decoded.id).select('-password');
    
    if (!expert) {
      return next(new Error('User not found'));
    }
    
    socket.user = expert;
    socket.userId = expert._id.toString();
    next();
  } catch (err) {
    logger.error('Socket authentication error:', err);
    next(new Error('Invalid token'));
  }
});

// Connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id} - User: ${socket.user?.email || 'Unknown'}`);
  logger.info(`Socket connected: ${socket.id} - User: ${socket.user?.email}`);
  
  // Join user's personal room
  if (socket.userId) {
    socket.join(socket.userId);
    console.log(`User ${socket.user.email} joined room: ${socket.userId}`);
    
    // Update user's last active timestamp
    Expert.findByIdAndUpdate(socket.userId, { lastActive: new Date() }).catch(err => {
      logger.error('Error updating lastActive:', err);
    });
  }
  
  // Send initial data
  socket.on('request-initial-data', async () => {
    try {
      await sendRealtimeData(socket);
    } catch (error) {
      logger.error('Error sending initial data:', error);
      socket.emit('error', { message: 'Failed to load initial data' });
    }
  });
  
  // Handle notifications
  socket.on('notification', async (data) => {
    try {
      const notification = new Notification({
        userId: data.targetUser,
        type: data.type,
        message: data.message,
        metadata: data.metadata || {}
      });
      await notification.save();
      
      // Send to specific user or room
      if (data.targetUser) {
        io.to(data.targetUser).emit('new-notification', notification);
      } else if (data.targetSpecialization) {
        const experts = await Expert.find({ specialization: data.targetSpecialization });
        experts.forEach(exp => {
          io.to(exp._id.toString()).emit('new-notification', notification);
        });
      } else if (data.targetRole) {
        const experts = await Expert.find({ role: data.targetRole });
        experts.forEach(exp => {
          io.to(exp._id.toString()).emit('new-notification', notification);
        });
      } else {
        io.emit('new-notification', notification);
      }
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  });
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    if (data.receiverId) {
      socket.to(data.receiverId).emit('user-typing', {
        userId: socket.userId,
        userName: socket.user.fullName
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Broadcast updates to all connected clients
async function broadcastUpdates() {
  try {
    const experts = await Expert.find({}, '-password');
    const tasks = await Task.find().sort({ createdAt: -1 });
    io.emit('data-update', { experts, tasks });
    logger.info('Broadcasted updates to all clients');
  } catch (error) {
    logger.error('Error broadcasting updates:', error);
  }
}

async function sendRealtimeData(socket) {
  const experts = await Expert.find({}, '-password');
  const tasks = await Task.find().sort({ createdAt: -1 });
  socket.emit('data-update', { experts, tasks });
}

// ======================== ROUTES ========================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '2.0.0'
  });
});

// API Routes
app.use('/api', authRoutes);
app.use('/api/experts', expertRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);

// File upload endpoint
app.post('/api/upload', authMiddleware, async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No files were uploaded' });
    }
    
    const file = req.files.file;
    const fileName = `${Date.now()}_${file.name}`;
    const uploadPath = path.join(__dirname, 'uploads/attachments', fileName);
    
    await file.mv(uploadPath);
    
    res.json({
      filename: fileName,
      url: `/uploads/attachments/${fileName}`,
      size: file.size
    });
  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make broadcast function available to routes
app.set('broadcastUpdates', broadcastUpdates);
app.set('io', io);

// ======================== ERROR HANDLING ========================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  logger.error('Global error:', err);
  
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(status).json({ error: message });
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection:', reason);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// ======================== START SERVER ========================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`
  ════════════════════════════════════════════════════════
  🚀 TIMS Support Portal Server Started Successfully!
  ════════════════════════════════════════════════════════
  📍 Local:        http://localhost:${PORT}
  🌐 Network:      http://${HOST}:${PORT}
  💾 Database:     ${MONGODB_URI}
  🔌 WebSocket:    ws://localhost:${PORT}
  ⏰ Started at:   ${new Date().toLocaleString()}
  📦 Version:      2.0.0
  ════════════════════════════════════════════════════════
  `);
  
  logger.info(`Server started on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  logger.info('SIGTERM received, closing server');
  
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, server, io, broadcastUpdates };
