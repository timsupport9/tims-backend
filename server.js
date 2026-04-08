require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Allow all origins for demo (restrict in production)
const io = socketIo(server, {
  cors: { origin: '*', credentials: true }
});
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}
const PORT = process.env.PORT || 3001;

// Use /tmp for SQLite on Render (ephemeral, but works for demo)
const DB_PATH = process.env.DB_PATH || path.join('/tmp', 'tims_support.db');
let db;

async function initDatabase() {
  db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      fullName TEXT NOT NULL,
      specialization TEXT,
      rating REAL DEFAULT 5.0,
      tasksCompleted INTEGER DEFAULT 0,
      isAvailable INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      specialization TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      dueDate TEXT,
      assignedTo TEXT,
      assignedToName TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed admin
  const adminExists = await db.get("SELECT id FROM users WHERE email = 'admin@tims.com'");
  if (!adminExists) {
    const hashed = await bcrypt.hash('admin123', 10);
    await db.run("INSERT INTO users (id, email, password, role, fullName) VALUES (?,?,?,?,?)",
      ['admin_1', 'admin@tims.com', hashed, 'admin', 'TIMS Admin']);
    console.log('Admin created: admin@tims.com / admin123');
  }

  // Seed demo agents
  const agentCount = await db.get("SELECT COUNT(*) as c FROM users WHERE role='expert'");
  if (agentCount.c === 0) {
    const agents = [
      { name: 'Sarah Johnson', email: 'sarah@tims.com', spec: 'Technical Support' },
      { name: 'Michael Chen', email: 'michael@tims.com', spec: 'Billing & Accounts' },
      { name: 'Elena Rodriguez', email: 'elena@tims.com', spec: 'Product Onboarding' }
    ];
    for (const a of agents) {
      const hashed = await bcrypt.hash('agent123', 10);
      await db.run(
        "INSERT INTO users (id, email, password, role, fullName, specialization, isAvailable) VALUES (?,?,?,?,?,?,?)",
        [Date.now()+Math.random(), a.email, hashed, 'expert', a.name, a.spec, 1]
      );
    }
    console.log('Demo agents created');
  }

  // Seed sample tickets
  const ticketCount = await db.get("SELECT COUNT(*) as c FROM tasks");
  if (ticketCount.c === 0) {
    const tickets = [
      { title: 'Login error', desc: '500 after password reset', spec: 'Technical Support', due: '2025-04-20' },
      { title: 'Invoice overcharge', desc: 'March bill incorrect', spec: 'Billing & Accounts', due: '2025-04-18' },
      { title: 'Dark mode request', desc: 'Many users asking', spec: 'Product Onboarding', due: '2025-05-01' }
    ];
    for (const t of tickets) {
      await db.run(
        "INSERT INTO tasks (id, title, description, specialization, dueDate) VALUES (?,?,?,?,?)",
        [Date.now()+Math.random(), t.title, t.desc, t.spec, t.due]
      );
    }
    console.log('Sample tickets created');
  }
  console.log(`Database ready at ${DB_PATH}`);
}

async function getAllData() {
  const agents = await db.all("SELECT id, email, fullName, specialization, rating, tasksCompleted, isAvailable FROM users WHERE role='expert'");
  const tickets = await db.all("SELECT * FROM tasks ORDER BY createdAt DESC");
  return { experts: agents, tasks: tickets };
}

async function emitUpdates() {
  const data = await getAllData();
  io.emit('data-update', data);
}

function authenticateToken(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Routes
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.get("SELECT * FROM users WHERE email = ?", email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    const { password: _, ...userData } = user;
    res.json({ token, user: userData });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/data', authenticateToken, async (req, res) => {
  res.json(await getAllData());
});

app.post('/api/experts', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { fullName, email, specialization } = req.body;
  try {
    const id = Date.now().toString();
    const hashed = await bcrypt.hash('agent123', 10);
    await db.run(
      "INSERT INTO users (id, email, password, role, fullName, specialization, isAvailable, rating, tasksCompleted) VALUES (?,?,?,?,?,?,?,?,?)",
      [id, email, hashed, 'expert', fullName, specialization, 1, 5.0, 0]
    );
    await emitUpdates();
    res.json({ id, fullName, email, specialization });
  } catch (err) {
    res.status(400).json({ error: err.message.includes('UNIQUE') ? 'Email exists' : 'Failed' });
  }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { title, description, specialization, dueDate } = req.body;
  const id = Date.now().toString();
  await db.run(
    "INSERT INTO tasks (id, title, description, specialization, dueDate) VALUES (?,?,?,?,?)",
    [id, title, description, specialization, dueDate || null]
  );
  await emitUpdates();
  res.json({ id });
});

app.patch('/api/tasks/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  await db.run("UPDATE tasks SET status = ? WHERE id = ?", [status, req.params.id]);
  if (status === 'completed') {
    const task = await db.get("SELECT assignedTo FROM tasks WHERE id = ?", req.params.id);
    if (task?.assignedTo) await db.run("UPDATE users SET tasksCompleted = tasksCompleted + 1 WHERE id = ?", task.assignedTo);
  }
  await emitUpdates();
  res.json({ success: true });
});

app.patch('/api/tasks/:id/assign', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { expertId, expertName } = req.body;
  await db.run("UPDATE tasks SET assignedTo = ?, assignedToName = ?, status = 'in-progress' WHERE id = ?", [expertId, expertName, req.params.id]);
  await emitUpdates();
  res.json({ success: true });
});

app.patch('/api/tasks/:id/claim', authenticateToken, async (req, res) => {
  if (req.user.role !== 'expert') return res.status(403).json({ error: 'Agent only' });
  const task = await db.get("SELECT assignedTo FROM tasks WHERE id = ?", req.params.id);
  if (task.assignedTo) return res.status(400).json({ error: 'Already assigned' });
  const agent = await db.get("SELECT fullName FROM users WHERE id = ?", req.user.id);
  await db.run("UPDATE tasks SET assignedTo = ?, assignedToName = ?, status = 'in-progress' WHERE id = ?", [req.user.id, agent.fullName, req.params.id]);
  await emitUpdates();
  res.json({ success: true });
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  await db.run("DELETE FROM tasks WHERE id = ?", req.params.id);
  await emitUpdates();
  res.json({ success: true });
});

app.patch('/api/experts/:id/toggle', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const expert = await db.get("SELECT isAvailable FROM users WHERE id = ?", req.params.id);
  if (expert) await db.run("UPDATE users SET isAvailable = ? WHERE id = ?", [expert.isAvailable ? 0 : 1, req.params.id]);
  await emitUpdates();
  res.json({ success: true });
});

io.on('connection', async (socket) => {
  console.log('Client connected');
  socket.emit('data-update', await getAllData());
});

initDatabase().then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => { console.error('DB init failed', err); process.exit(1); });