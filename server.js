// server.js - Complete Backend Server with All Features
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ======================== CONFIGURATION ========================
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'expert-platform-secret-key-2024';
const COMMISSION_RATE = 20; // 20% platform commission

// ======================== DATABASE ========================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/expert_platform',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// ======================== MIDDLEWARE ========================
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads', { recursive: true });
if (!fs.existsSync('uploads/consultations')) fs.mkdirSync('uploads/consultations', { recursive: true });

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/consultations'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'application/zip'];
        cb(allowed.includes(file.mimetype) ? null : new Error('Invalid file type'), allowed.includes(file.mimetype));
    }
});

// ======================== AUTH MIDDLEWARE ========================
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });
        const decoded = jwt.verify(token, JWT_SECRET);
        const result = await pool.query('SELECT id, name, email, role, status FROM users WHERE id = $1', [decoded.id]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });
        req.user = result.rows[0];
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Unauthorized' });
    next();
};

// ======================== DATABASE INITIALIZATION ========================
async function initializeDatabase() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Create tables
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                role VARCHAR(50) CHECK (role IN ('user', 'expert', 'admin')) DEFAULT 'user',
                status VARCHAR(50) CHECK (status IN ('pending', 'active', 'suspended', 'deleted')) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                deleted_at TIMESTAMP,
                deleted_by UUID,
                deletion_reason TEXT
            );

            CREATE TABLE IF NOT EXISTS expert_profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                expertise TEXT[] DEFAULT '{}',
                bio TEXT,
                hourly_rate DECIMAL(10,2) DEFAULT 0,
                total_earnings DECIMAL(10,2) DEFAULT 0,
                available_balance DECIMAL(10,2) DEFAULT 0,
                total_paid_out DECIMAL(10,2) DEFAULT 0,
                application_status VARCHAR(50) CHECK (application_status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved',
                average_rating DECIMAL(3,2) DEFAULT 0,
                total_reviews INT DEFAULT 0,
                tasks_completed INT DEFAULT 0,
                is_available BOOLEAN DEFAULT true,
                is_suspended BOOLEAN DEFAULT false,
                suspended_at TIMESTAMP,
                suspended_by UUID,
                suspension_reason TEXT,
                is_active BOOLEAN DEFAULT true,
                deactivated_at TIMESTAMP,
                deactivated_by UUID,
                deactivation_reason TEXT,
                approved_at TIMESTAMP,
                approved_by UUID,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS consultations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                assigned_expert_id UUID REFERENCES users(id),
                service_id UUID,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                consultation_type VARCHAR(50) DEFAULT 'chat',
                status VARCHAR(50) CHECK (status IN ('pending', 'assigned', 'in_progress', 'responded', 'closed', 'cancelled')) DEFAULT 'pending',
                total_amount DECIMAL(10,2),
                expert_fee DECIMAL(10,2),
                platform_fee DECIMAL(10,2),
                commission_amount DECIMAL(10,2),
                expert_payout DECIMAL(10,2),
                payment_status VARCHAR(50) DEFAULT 'pending',
                payment_method VARCHAR(50),
                payment_date TIMESTAMP,
                scheduled_date DATE,
                scheduled_start_time TIME,
                scheduled_end_time TIME,
                booking_slot_id UUID,
                cancellation_reason TEXT,
                cancelled_by UUID,
                cancelled_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS consultation_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
                sender_id UUID REFERENCES users(id),
                sender_role VARCHAR(50),
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS consultation_attachments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
                uploaded_by UUID REFERENCES users(id),
                file_name VARCHAR(255) NOT NULL,
                file_type VARCHAR(50),
                file_size BIGINT,
                file_url TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                event_type VARCHAR(50) DEFAULT 'workshop',
                assigned_expert_id UUID REFERENCES users(id),
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                max_participants INT DEFAULT 50,
                status VARCHAR(50) DEFAULT 'active',
                expert_payment DECIMAL(10,2) DEFAULT 0,
                created_by UUID REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS enrollments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                event_id UUID REFERENCES events(id) ON DELETE CASCADE,
                enrollment_type VARCHAR(50) DEFAULT 'event',
                status VARCHAR(50) DEFAULT 'enrolled',
                enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS expert_availability (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                expert_id UUID REFERENCES users(id) ON DELETE CASCADE,
                day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                is_available BOOLEAN DEFAULT true,
                recurrence VARCHAR(50) DEFAULT 'weekly',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS booking_slots (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                expert_id UUID REFERENCES users(id) ON DELETE CASCADE,
                slot_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                is_booked BOOLEAN DEFAULT false,
                consultation_id UUID REFERENCES consultations(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS expert_services (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                expert_id UUID REFERENCES users(id) ON DELETE CASCADE,
                service_name VARCHAR(255) NOT NULL,
                service_type VARCHAR(50) DEFAULT 'consultation',
                description TEXT,
                base_price DECIMAL(10,2) NOT NULL,
                commission_percentage DECIMAL(5,2) DEFAULT 20.00,
                duration_minutes INT DEFAULT 60,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS withdrawal_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                expert_id UUID REFERENCES users(id),
                amount DECIMAL(10,2) NOT NULL,
                withdrawal_method VARCHAR(50) DEFAULT 'bank_transfer',
                account_details JSONB DEFAULT '{}',
                status VARCHAR(50) DEFAULT 'pending',
                request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                holding_period_end DATE GENERATED ALWAYS AS (request_date::date + INTERVAL '7 days') STORED,
                approved_by UUID REFERENCES users(id),
                approved_at TIMESTAMP,
                processed_by UUID REFERENCES users(id),
                processed_at TIMESTAMP,
                transaction_reference VARCHAR(255),
                rejection_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS expert_payments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                expert_id UUID REFERENCES users(id),
                amount DECIMAL(10,2) NOT NULL,
                payment_type VARCHAR(50) DEFAULT 'payout',
                status VARCHAR(50) DEFAULT 'processed',
                reference_id UUID,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS client_payments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id UUID REFERENCES users(id),
                consultation_id UUID REFERENCES consultations(id),
                amount DECIMAL(10,2) NOT NULL,
                payment_method VARCHAR(50) DEFAULT 'credit_card',
                transaction_reference VARCHAR(255),
                payment_status VARCHAR(50) DEFAULT 'completed',
                payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS commission_transactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                consultation_id UUID REFERENCES consultations(id),
                expert_id UUID REFERENCES users(id),
                client_id UUID REFERENCES users(id),
                transaction_type VARCHAR(50) DEFAULT 'commission',
                amount DECIMAL(10,2) NOT NULL,
                commission_percentage DECIMAL(5,2),
                platform_amount DECIMAL(10,2),
                expert_amount DECIMAL(10,2),
                status VARCHAR(50) DEFAULT 'processed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS service_proofs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                consultation_id UUID REFERENCES consultations(id),
                expert_id UUID REFERENCES users(id),
                client_id UUID REFERENCES users(id),
                proof_type VARCHAR(50),
                proof_description TEXT,
                proof_files TEXT[] DEFAULT '{}',
                client_confirmed BOOLEAN DEFAULT false,
                client_confirmed_at TIMESTAMP,
                admin_verified BOOLEAN DEFAULT false,
                status VARCHAR(50) DEFAULT 'submitted',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS client_claims (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id UUID REFERENCES users(id),
                consultation_id UUID REFERENCES consultations(id),
                claim_type VARCHAR(50),
                claim_title VARCHAR(255) NOT NULL,
                claim_description TEXT,
                evidence_files TEXT[] DEFAULT '{}',
                claim_amount DECIMAL(10,2),
                status VARCHAR(50) DEFAULT 'filed',
                priority VARCHAR(20) DEFAULT 'medium',
                resolution TEXT,
                refund_amount DECIMAL(10,2),
                expert_response TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS support_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'open',
                admin_response TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                title VARCHAR(255) NOT NULL,
                message TEXT,
                type VARCHAR(50) DEFAULT 'system',
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bootcamps (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                duration_weeks INT,
                intensity VARCHAR(50),
                price DECIMAL(10,2) DEFAULT 0,
                max_students INT DEFAULT 30,
                assigned_expert_id UUID REFERENCES users(id),
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS short_courses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                duration_hours INT,
                price DECIMAL(10,2) DEFAULT 0,
                difficulty_level VARCHAR(50),
                assigned_expert_id UUID REFERENCES users(id),
                status VARCHAR(50) DEFAULT 'published',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tuition_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                subject_name VARCHAR(255),
                level_name VARCHAR(255),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                tutor_id UUID REFERENCES users(id),
                session_type VARCHAR(50),
                price_per_session DECIMAL(10,2) DEFAULT 0,
                status VARCHAR(50) DEFAULT 'available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS exam_preparations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                subject_name VARCHAR(255),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                exam_type VARCHAR(50),
                year INT,
                price DECIMAL(10,2) DEFAULT 0,
                total_questions INT,
                duration_minutes INT,
                difficulty VARCHAR(50),
                examiner_id UUID REFERENCES users(id),
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS career_guidance (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                career_path VARCHAR(255),
                counselor_id UUID REFERENCES users(id),
                session_type VARCHAR(50),
                price DECIMAL(10,2) DEFAULT 0,
                duration_minutes INT,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS eschool_enrollments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                enrollment_type VARCHAR(50) CHECK (enrollment_type IN ('bootcamp', 'short_course', 'tuition', 'exam_prep', 'career_guidance')),
                reference_id UUID NOT NULL,
                status VARCHAR(50) DEFAULT 'enrolled',
                enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS expert_applications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                expertise TEXT[] DEFAULT '{}',
                bio TEXT,
                hourly_rate DECIMAL(10,2),
                qualifications TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS consultation_feedback (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                consultation_id UUID REFERENCES consultations(id),
                user_id UUID REFERENCES users(id),
                rating INT CHECK (rating BETWEEN 1 AND 5),
                feedback_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create default admin if not exists
        const adminExists = await client.query("SELECT id FROM users WHERE email = 'admin@platform.com'");
        if (adminExists.rows.length === 0) {
            const adminHash = await bcrypt.hash('admin123', 12);
            await client.query(
                `INSERT INTO users (name, email, password_hash, role, status) 
                 VALUES ('Platform Admin', 'admin@platform.com', $1, 'admin', 'active')`,
                [adminHash]
            );
        }

        // Create default expert if not exists
        const expertExists = await client.query("SELECT id FROM users WHERE email = 'expert@platform.com'");
        if (expertExists.rows.length === 0) {
            const expertHash = await bcrypt.hash('expert123', 12);
            const expert = await client.query(
                `INSERT INTO users (name, email, password_hash, role, status) 
                 VALUES ('John Expert', 'expert@platform.com', $1, 'expert', 'active') RETURNING id`,
                [expertHash]
            );
            await client.query(
                `INSERT INTO expert_profiles (user_id, expertise, bio, hourly_rate, application_status, is_available)
                 VALUES ($1, ARRAY['Web Development', 'Cloud Computing'], 'Experienced developer', 150, 'approved', true)`,
                [expert.rows[0].id]
            );
        }

        // Create default user if not exists
        const userExists = await client.query("SELECT id FROM users WHERE email = 'user@platform.com'");
        if (userExists.rows.length === 0) {
            const userHash = await bcrypt.hash('user123', 12);
            await client.query(
                `INSERT INTO users (name, email, password_hash, role, status) 
                 VALUES ('Jane User', 'user@platform.com', $1, 'user', 'active')`,
                [userHash]
            );
        }

        await client.query('COMMIT');
        console.log('✅ Database initialized successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Database initialization error:', error.message);
    } finally {
        client.release();
    }
}

// ======================== HELPER FUNCTIONS ========================
function generateSlots(expertId, daysAhead = 14) {
    // Simplified slot generation - would generate booking_slots for the expert
    console.log(`Slots generated for expert ${expertId}`);
}

async function notifyUser(userId, title, message, type = 'system') {
    try {
        await pool.query(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
            [userId, title, message, type]
        );
        io.emit('notification', { user_id: userId, title, message, type });
    } catch (error) {
        console.error('Notification error:', error);
    }
}

async function notifyAdmins(title, message, type = 'system') {
    try {
        const admins = await pool.query("SELECT id FROM users WHERE role = 'admin'");
        for (const admin of admins.rows) {
            await notifyUser(admin.id, title, message, type);
        }
    } catch (error) {
        console.error('Notify admins error:', error);
    }
}

function calculateCommission(amount, rate = COMMISSION_RATE) {
    const commission = (amount * rate) / 100;
    return {
        total: amount,
        commissionRate: rate,
        commissionAmount: commission,
        expertAmount: amount - commission
    };
}

// ======================== SOCKET.IO ========================
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    socket.on('join_consultation', (consultationId) => {
        socket.join(`consultation_${consultationId}`);
    });

    socket.on('leave_consultation', (consultationId) => {
        socket.leave(`consultation_${consultationId}`);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
});

// ======================== API ROUTES ========================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ======================== AUTH ROUTES ========================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

        const hash = await bcrypt.hash(password, 12);
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, phone, role, status) 
             VALUES ($1, $2, $3, $4, 'user', 'pending') RETURNING id, name, email, role, status, created_at`,
            [name, email, hash, phone]
        );

        await notifyAdmins('New User Registration', `${name} (${email}) registered and needs approval`, 'approval');
        res.status(201).json({ message: 'Registration submitted for approval', user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        if (user.status === 'pending') return res.status(403).json({ error: 'Account pending approval', status: 'pending' });
        if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended', status: 'suspended' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        
        await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

        let profile = {};
        if (user.role === 'expert') {
            const expertResult = await pool.query('SELECT * FROM expert_profiles WHERE user_id = $1', [user.id]);
            profile = expertResult.rows[0] || {};
        }

        res.json({
            token,
            user: {
                id: user.id, name: user.name, email: user.email,
                role: user.role, status: user.status, phone: user.phone,
                profile, specialization: profile.expertise ? profile.expertise[0] : '',
                fullName: user.name
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
    res.json({ user: req.user });
});

// ======================== ADMIN ROUTES ========================

// Get all users
app.get('/api/admin/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { role, status, search } = req.query;
        let query = 'SELECT id, name, email, role, status, phone, created_at FROM users WHERE 1=1';
        const params = [];
        let idx = 1;

        if (role) { query += ` AND role = $${idx}`; params.push(role); idx++; }
        if (status) { query += ` AND status = $${idx}`; params.push(status); idx++; }
        if (search) { query += ` AND (name ILIKE $${idx} OR email ILIKE $${idx})`; params.push(`%${search}%`); idx++; }

        query += ' ORDER BY created_at DESC';
        const result = await pool.query(query, params);
        res.json({ users: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve user
app.put('/api/admin/users/:userId/approve', authenticate, authorize('admin'), async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE users SET status = 'active', updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND status = 'pending' RETURNING id, name, email, status`,
            [req.params.userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found or already approved' });
        await notifyUser(req.params.userId, 'Account Approved', 'Your account has been approved. Welcome!', 'approval');
        res.json({ user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Suspend user
app.put('/api/admin/users/:userId/suspend', authenticate, authorize('admin'), async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE users SET status = 'suspended', updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 RETURNING id, name, email, status`,
            [req.params.userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user role
app.put('/api/admin/users/:userId/role', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { role } = req.body;
        const result = await pool.query(
            `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
            [role, req.params.userId]
        );
        res.json({ user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all experts
app.get('/api/admin/experts', authenticate, authorize('admin'), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.name, u.email, u.status, u.phone, u.created_at,
                   ep.expertise, ep.bio, ep.hourly_rate, ep.total_earnings,
                   ep.available_balance, ep.average_rating, ep.total_reviews,
                   ep.tasks_completed, ep.is_available, ep.application_status
            FROM users u
            LEFT JOIN expert_profiles ep ON u.id = ep.user_id
            WHERE u.role = 'expert'
            ORDER BY u.created_at DESC
        `);
        res.json({ experts: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create expert (admin)
app.post('/api/admin/experts/create', authenticate, authorize('admin'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { name, email, password, phone, expertise, bio, hourly_rate } = req.body;

        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hash = await bcrypt.hash(password || 'Expert@123', 12);
        const user = await client.query(
            `INSERT INTO users (name, email, password_hash, phone, role, status) 
             VALUES ($1, $2, $3, $4, 'expert', 'active') RETURNING id, name, email, role, status`,
            [name, email, hash, phone]
        );

        await client.query(
            `INSERT INTO expert_profiles (user_id, expertise, bio, hourly_rate, application_status, approved_at, approved_by)
             VALUES ($1, $2, $3, $4, 'approved', CURRENT_TIMESTAMP, $5)`,
            [user.rows[0].id, expertise || [], bio, hourly_rate || 0, req.user.id]
        );

        await notifyUser(user.rows[0].id, 'Expert Account Created', 'Your expert account has been created by admin', 'approval');
        await client.query('COMMIT');
        res.status(201).json({ expert: user.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Suspend expert
app.post('/api/admin/experts/:expertId/suspend', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { suspension_type, reason, duration_days } = req.body;
        await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['suspended', req.params.expertId]);
        await pool.query(
            'UPDATE expert_profiles SET is_suspended = true, suspended_at = CURRENT_TIMESTAMP, suspended_by = $1, suspension_reason = $2 WHERE user_id = $3',
            [req.user.id, reason, req.params.expertId]
        );
        await notifyUser(req.params.expertId, 'Account Suspended', reason || 'Your account has been suspended', 'system');
        res.json({ message: 'Expert suspended successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reactivate expert
app.post('/api/admin/experts/:expertId/reactivate', authenticate, authorize('admin'), async (req, res) => {
    try {
        await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['active', req.params.expertId]);
        await pool.query('UPDATE expert_profiles SET is_suspended = false WHERE user_id = $1', [req.params.expertId]);
        await notifyUser(req.params.expertId, 'Account Reactivated', 'Your account has been reactivated', 'approval');
        res.json({ message: 'Expert reactivated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete expert
app.delete('/api/admin/experts/:expertId', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { reason } = req.body;
        await pool.query("UPDATE users SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP, deleted_by = $1, deletion_reason = $2 WHERE id = $3",
            [req.user.id, reason, req.params.expertId]);
        await pool.query('UPDATE expert_profiles SET is_active = false WHERE user_id = $1', [req.params.expertId]);
        res.json({ message: 'Expert deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle expert availability
app.patch('/api/experts/:userId/toggle', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE expert_profiles SET is_available = NOT is_available WHERE user_id = $1 RETURNING is_available',
            [req.params.userId]
        );
        res.json({ is_available: result.rows[0]?.is_available });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get expert applications
app.get('/api/admin/expert-applications', authenticate, authorize('admin'), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ea.*, u.name, u.email FROM expert_applications ea
            JOIN users u ON ea.user_id = u.id WHERE ea.status = 'pending' ORDER BY ea.created_at DESC
        `);
        res.json({ applications: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve expert application
app.put('/api/admin/expert-applications/:appId/approve', authenticate, authorize('admin'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const app = await pool.query('UPDATE expert_applications SET status = $1 WHERE id = $2 RETURNING *', ['approved', req.params.appId]);
        if (app.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Application not found' });
        }
        await client.query('UPDATE users SET role = $1 WHERE id = $2', ['expert', app.rows[0].user_id]);
        await client.query(
            `INSERT INTO expert_profiles (user_id, expertise, bio, hourly_rate, application_status, approved_at, approved_by)
             VALUES ($1, $2, $3, $4, 'approved', CURRENT_TIMESTAMP, $5)
             ON CONFLICT (user_id) DO UPDATE SET application_status = 'approved'`,
            [app.rows[0].user_id, app.rows[0].expertise, app.rows[0].bio, app.rows[0].hourly_rate, req.user.id]
        );
        await client.query('COMMIT');
        res.json({ message: 'Expert application approved' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// ======================== CONSULTATION ROUTES ========================

// Get all consultations
app.get('/api/common/consultations', authenticate, async (req, res) => {
    try {
        let query;
        if (req.user.role === 'admin') {
            query = `
                SELECT c.*, u.name as client_name, e.name as expert_name
                FROM consultations c
                JOIN users u ON c.user_id = u.id
                LEFT JOIN users e ON c.assigned_expert_id = e.id
                ORDER BY c.updated_at DESC
            `;
        } else if (req.user.role === 'expert') {
            query = `
                SELECT c.*, u.name as client_name
                FROM consultations c
                JOIN users u ON c.user_id = u.id
                WHERE c.assigned_expert_id = $1
                ORDER BY c.updated_at DESC
            `;
        } else {
            query = `
                SELECT c.*, e.name as expert_name
                FROM consultations c
                LEFT JOIN users e ON c.assigned_expert_id = e.id
                WHERE c.user_id = $1
                ORDER BY c.updated_at DESC
            `;
        }
        const result = await pool.query(query, [req.user.id]);
        res.json({ consultations: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create consultation request (user)
app.post('/api/user/consultations', authenticate, authorize('user'), async (req, res) => {
    try {
        const { title, description, consultation_type } = req.body;
        const result = await pool.query(
            `INSERT INTO consultations (user_id, title, description, consultation_type, status)
             VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
            [req.user.id, title, description, consultation_type || 'chat']
        );
        await notifyAdmins('New Consultation Request', `${req.user.name} requested: ${title}`);
        res.status(201).json({ consultation: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Assign expert to consultation (admin)
app.put('/api/admin/consultations/:id/assign', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { expert_id, expert_fee } = req.body;
        const commission = calculateCommission(expert_fee || 0);
        
        const result = await pool.query(
            `UPDATE consultations SET assigned_expert_id = $1, expert_fee = $2,
             platform_fee = $3, commission_amount = $4, expert_payout = $5,
             status = 'assigned', updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 AND status = 'pending' RETURNING *`,
            [expert_id, expert_fee, commission.commissionAmount, commission.commissionAmount,
             commission.expertAmount, req.params.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Consultation not found or already assigned' });

        await pool.query(
            `INSERT INTO commission_transactions (consultation_id, expert_id, client_id, transaction_type, amount, commission_percentage, platform_amount, expert_amount, status)
             VALUES ($1, $2, $3, 'commission', $4, $5, $6, $7, 'processed')`,
            [req.params.id, expert_id, result.rows[0].user_id, expert_fee, COMMISSION_RATE, commission.commissionAmount, commission.expertAmount]
        );

        await notifyUser(expert_id, 'New Consultation Assigned', `You have been assigned: ${result.rows[0].title}`, 'assignment');
        await notifyUser(result.rows[0].user_id, 'Expert Assigned', 'An expert has been assigned to your consultation', 'assignment');

        res.json({ consultation: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Book consultation with slot
app.post('/api/user/consultations/book', authenticate, upload.any(), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { expert_id, service_id, slot_id, title, description, consultation_type } = req.body;

        const slot = await client.query('SELECT * FROM booking_slots WHERE id = $1 AND is_booked = false FOR UPDATE', [slot_id]);
        if (slot.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Slot not available' });
        }

        const service = await client.query('SELECT * FROM expert_services WHERE id = $1', [service_id]);
        const amount = service.rows[0]?.base_price || 0;
        const commission = calculateCommission(amount);

        const consultation = await client.query(
            `INSERT INTO consultations (user_id, assigned_expert_id, service_id, title, description, consultation_type,
             scheduled_date, scheduled_start_time, scheduled_end_time, booking_slot_id,
             total_amount, expert_fee, commission_amount, expert_payout, status, payment_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'assigned', 'pending') RETURNING *`,
            [req.user.id, expert_id, service_id, title, description, consultation_type || 'chat',
             slot.rows[0].slot_date, slot.rows[0].start_time, slot.rows[0].end_time, slot_id,
             amount, amount, commission.commissionAmount, commission.expertAmount]
        );

        await client.query('UPDATE booking_slots SET is_booked = true, consultation_id = $1 WHERE id = $2', [consultation.rows[0].id, slot_id]);

        if (req.files) {
            for (const file of req.files) {
                await client.query(
                    `INSERT INTO consultation_attachments (consultation_id, uploaded_by, file_name, file_type, file_size, file_url)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [consultation.rows[0].id, req.user.id, file.originalname, file.mimetype, file.size, `/uploads/consultations/${file.filename}`]
                );
            }
        }

        await client.query('COMMIT');
        await notifyUser(expert_id, 'New Booking', `Consultation booked for ${slot.rows[0].slot_date}`, 'booking');
        res.status(201).json({ consultation: consultation.rows[0], commission });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Get chat messages
app.get('/api/user/consultations/:id/messages', authenticate, async (req, res) => {
    try {
        const consultation = await pool.query(
            'SELECT * FROM consultations WHERE id = $1 AND (user_id = $2 OR assigned_expert_id = $2 OR (SELECT role FROM users WHERE id = $2) = $3)',
            [req.params.id, req.user.id, 'admin']
        );
        if (consultation.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

        const messages = await pool.query(
            `SELECT cm.*, u.name as sender_name FROM consultation_messages cm
             JOIN users u ON cm.sender_id = u.id
             WHERE cm.consultation_id = $1 ORDER BY cm.created_at ASC`,
            [req.params.id]
        );

        await pool.query(
            'UPDATE consultation_messages SET is_read = true WHERE consultation_id = $1 AND sender_id != $2',
            [req.params.id, req.user.id]
        );

        res.json({ messages: messages.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send chat message
app.post('/api/user/consultations/:id/messages', authenticate, async (req, res) => {
    try {
        const { message } = req.body;
        const consultation = await pool.query(
            'SELECT * FROM consultations WHERE id = $1 AND (user_id = $2 OR assigned_expert_id = $2)',
            [req.params.id, req.user.id]
        );
        if (consultation.rows.length === 0 && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

        const result = await pool.query(
            `INSERT INTO consultation_messages (consultation_id, sender_id, sender_role, message)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.params.id, req.user.id, req.user.role, message]
        );

        await pool.query(
            "UPDATE consultations SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'assigned'",
            [req.params.id]
        );

        const user = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
        const messageData = { ...result.rows[0], sender_name: user.rows[0].name };

        io.to(`consultation_${req.params.id}`).emit('new_message', messageData);
        res.status(201).json({ message: messageData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload attachments
app.post('/api/user/consultations/:id/attachments', authenticate, upload.array('attachments', 5), async (req, res) => {
    try {
        const attachments = [];
        for (const file of req.files) {
            const result = await pool.query(
                `INSERT INTO consultation_attachments (consultation_id, uploaded_by, file_name, file_type, file_size, file_url)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [req.params.id, req.user.id, file.originalname, file.mimetype, file.size, `/uploads/consultations/${file.filename}`]
            );
            attachments.push(result.rows[0]);
        }
        res.status(201).json({ attachments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit service proof
app.post('/api/expert/service-proof', authenticate, authorize('expert'), async (req, res) => {
    try {
        const { consultation_id, proof_type, proof_description, proof_files } = req.body;
        const consultation = await pool.query('SELECT * FROM consultations WHERE id = $1 AND assigned_expert_id = $2', [consultation_id, req.user.id]);
        if (consultation.rows.length === 0) return res.status(400).json({ error: 'Cannot submit proof' });

        const result = await pool.query(
            `INSERT INTO service_proofs (consultation_id, expert_id, client_id, proof_type, proof_description, proof_files, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'submitted') RETURNING *`,
            [consultation_id, req.user.id, consultation.rows[0].user_id, proof_type, proof_description, proof_files]
        );

        await pool.query("UPDATE consultations SET status = 'responded', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [consultation_id]);
        await notifyUser(consultation.rows[0].user_id, 'Service Proof Submitted', 'Please confirm service completion', 'confirmation');
        await notifyAdmins('New Service Proof', `Expert submitted proof for consultation #${consultation_id}`);

        res.status(201).json({ proof: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Client confirms service
app.put('/api/user/service-proof/:proofId/confirm', authenticate, async (req, res) => {
    try {
        const proof = await pool.query('SELECT * FROM service_proofs WHERE id = $1 AND client_id = $2', [req.params.proofId, req.user.id]);
        if (proof.rows.length === 0) return res.status(404).json({ error: 'Proof not found' });

        await pool.query(
            `UPDATE service_proofs SET client_confirmed = true, client_confirmed_at = CURRENT_TIMESTAMP, status = 'client_confirmed'
             WHERE id = $1`,
            [req.params.proofId]
        );

        await pool.query("UPDATE consultations SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [proof.rows[0].consultation_id]);

        const commission = await pool.query('SELECT * FROM commission_transactions WHERE consultation_id = $1', [proof.rows[0].consultation_id]);
        if (commission.rows.length > 0) {
            await pool.query(
                'UPDATE expert_profiles SET total_earnings = total_earnings + $1, available_balance = available_balance + $1 WHERE user_id = $2',
                [commission.rows[0].expert_amount, proof.rows[0].expert_id]
            );
        }

        await notifyUser(proof.rows[0].expert_id, 'Service Confirmed', 'Client confirmed service completion. Funds available for withdrawal.', 'payment');
        res.json({ message: 'Service confirmed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ======================== EVENTS ROUTES ========================
app.get('/api/common/events', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.*, u.name as expert_name,
                   (SELECT COUNT(*) FROM enrollments WHERE event_id = e.id) as enrolled_count
            FROM events e LEFT JOIN users u ON e.assigned_expert_id = u.id
            ORDER BY e.created_at DESC
        `);
        res.json({ events: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/events', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { title, description, start_date, end_date, event_type, max_participants, assigned_expert_id, expert_payment } = req.body;
        const result = await pool.query(
            `INSERT INTO events (title, description, start_date, end_date, event_type, max_participants, assigned_expert_id, expert_payment, created_by, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active') RETURNING *`,
            [title, description, start_date, end_date, event_type, max_participants, assigned_expert_id, expert_payment, req.user.id]
        );
        if (assigned_expert_id) await notifyUser(assigned_expert_id, 'Event Assignment', `You've been assigned to: ${title}`, 'assignment');
        res.status(201).json({ event: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/user/events/:eventId/enroll', authenticate, async (req, res) => {
    try {
        const existing = await pool.query('SELECT * FROM enrollments WHERE user_id = $1 AND event_id = $2', [req.user.id, req.params.eventId]);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'Already enrolled' });

        const result = await pool.query(
            'INSERT INTO enrollments (user_id, event_id, status) VALUES ($1, $2, $3) RETURNING *',
            [req.user.id, req.params.eventId, 'enrolled']
        );
        res.status(201).json({ enrollment: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ======================== E-SCHOOL ROUTES ========================
app.get('/api/eschool/bootcamps', authenticate, async (req, res) => {
    const result = await pool.query('SELECT b.*, u.name as expert_name FROM bootcamps b LEFT JOIN users u ON b.assigned_expert_id = u.id ORDER BY b.created_at DESC');
    res.json({ bootcamps: result.rows });
});

app.post('/api/eschool/bootcamps', authenticate, authorize('admin'), async (req, res) => {
    const { title, description, category, duration_weeks, intensity, price, max_students, assigned_expert_id } = req.body;
    const result = await pool.query(
        `INSERT INTO bootcamps (title, description, category, duration_weeks, intensity, price, max_students, assigned_expert_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [title, description, category, duration_weeks, intensity, price, max_students, assigned_expert_id]
    );
    res.status(201).json({ bootcamp: result.rows[0] });
});

app.get('/api/eschool/short-courses', authenticate, async (req, res) => {
    const result = await pool.query('SELECT sc.*, u.name as instructor_name FROM short_courses sc LEFT JOIN users u ON sc.assigned_expert_id = u.id WHERE sc.status = $1', ['published']);
    res.json({ courses: result.rows });
});

app.post('/api/eschool/short-courses', authenticate, authorize('admin'), async (req, res) => {
    const { title, description, category, duration_hours, price, difficulty_level, assigned_expert_id } = req.body;
    const result = await pool.query(
        `INSERT INTO short_courses (title, description, category, duration_hours, price, difficulty_level, assigned_expert_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'published') RETURNING *`,
        [title, description, category, duration_hours, price, difficulty_level, assigned_expert_id]
    );
    res.status(201).json({ course: result.rows[0] });
});

app.get('/api/eschool/tuition', authenticate, async (req, res) => {
    const result = await pool.query('SELECT ts.*, u.name as tutor_name FROM tuition_sessions ts LEFT JOIN users u ON ts.tutor_id = u.id WHERE ts.status = $1', ['available']);
    res.json({ sessions: result.rows });
});

app.post('/api/eschool/tuition', authenticate, authorize('admin', 'expert'), async (req, res) => {
    const { title, description, subject_name, level_name, tutor_id, session_type, price_per_session } = req.body;
    const result = await pool.query(
        `INSERT INTO tuition_sessions (title, description, subject_name, level_name, tutor_id, session_type, price_per_session)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [title, description, subject_name, level_name, tutor_id, session_type, price_per_session]
    );
    res.status(201).json({ session: result.rows[0] });
});

app.get('/api/eschool/exam-prep', authenticate, async (req, res) => {
    const result = await pool.query('SELECT ep.*, u.name as examiner_name FROM exam_preparations ep LEFT JOIN users u ON ep.examiner_id = u.id WHERE ep.status = $1', ['active']);
    res.json({ exams: result.rows });
});

app.post('/api/eschool/exam-prep', authenticate, authorize('admin', 'expert'), async (req, res) => {
    const { title, description, subject_name, exam_type, year, price, total_questions, duration_minutes, difficulty, examiner_id } = req.body;
    const result = await pool.query(
        `INSERT INTO exam_preparations (title, description, subject_name, exam_type, year, price, total_questions, duration_minutes, difficulty, examiner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [title, description, subject_name, exam_type, year, price, total_questions, duration_minutes, difficulty, examiner_id]
    );
    res.status(201).json({ exam: result.rows[0] });
});

app.get('/api/eschool/career-guidance', authenticate, async (req, res) => {
    const result = await pool.query('SELECT cg.*, u.name as counselor_name FROM career_guidance cg LEFT JOIN users u ON cg.counselor_id = u.id WHERE cg.status = $1', ['active']);
    res.json({ guidance: result.rows });
});

app.post('/api/eschool/career-guidance', authenticate, authorize('admin', 'expert'), async (req, res) => {
    const { title, description, career_path, counselor_id, session_type, price, duration_minutes } = req.body;
    const result = await pool.query(
        `INSERT INTO career_guidance (title, description, career_path, counselor_id, session_type, price, duration_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [title, description, career_path, counselor_id, session_type, price, duration_minutes]
    );
    res.status(201).json({ guidance: result.rows[0] });
});

// Enroll in eSchool program
app.post('/api/eschool/enroll', authenticate, async (req, res) => {
    try {
        const { enrollment_type, reference_id } = req.body;
        const existing = await pool.query(
            'SELECT * FROM eschool_enrollments WHERE user_id = $1 AND enrollment_type = $2 AND reference_id = $3',
            [req.user.id, enrollment_type, reference_id]
        );
        if (existing.rows.length > 0) return res.status(400).json({ error: 'Already enrolled' });

        const result = await pool.query(
            'INSERT INTO eschool_enrollments (user_id, enrollment_type, reference_id) VALUES ($1, $2, $3) RETURNING *',
            [req.user.id, enrollment_type, reference_id]
        );
        res.status(201).json({ enrollment: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ======================== AVAILABILITY ROUTES ========================
app.get('/api/expert/availability/:expertId', authenticate, async (req, res) => {
    const result = await pool.query(
        'SELECT * FROM expert_availability WHERE expert_id = $1 ORDER BY day_of_week, start_time',
        [req.params.expertId]
    );
    res.json({ availability: result.rows });
});

app.put('/api/expert/availability', authenticate, authorize('expert'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { schedule } = req.body;
        await client.query('DELETE FROM expert_availability WHERE expert_id = $1', [req.user.id]);
        for (const slot of schedule) {
            await client.query(
                `INSERT INTO expert_availability (expert_id, day_of_week, start_time, end_time, recurrence)
                 VALUES ($1, $2, $3, $4, $5)`,
                [req.user.id, slot.day, slot.start, slot.end, slot.recurrence || 'weekly']
            );
        }
        await client.query('COMMIT');
        res.json({ message: 'Availability updated' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

app.post('/api/expert/time-off', authenticate, authorize('expert'), async (req, res) => {
    const { start_date, end_date, reason } = req.body;
    await pool.query(
        'UPDATE booking_slots SET is_booked = true WHERE expert_id = $1 AND slot_date BETWEEN $2 AND $3 AND is_booked = false',
        [req.user.id, start_date, end_date]
    );
    await notifyAdmins('Expert Time Off', `${req.user.name} requested time off: ${reason}`);
    res.json({ message: 'Time off processed' });
});

app.get('/api/expert/booking-slots', authenticate, async (req, res) => {
    const { expertId, date } = req.query;
    let query = 'SELECT * FROM booking_slots WHERE expert_id = $1 AND is_booked = false';
    const params = [expertId];
    if (date) { query += ' AND slot_date = $2'; params.push(date); }
    query += ' ORDER BY slot_date, start_time';
    const result = await pool.query(query, params);
    res.json({ slots: result.rows });
});

// ======================== EARNINGS & WITHDRAWAL ROUTES ========================
app.get('/api/expert/earnings', authenticate, authorize('expert'), async (req, res) => {
    try {
        const profile = await pool.query('SELECT * FROM expert_profiles WHERE user_id = $1', [req.user.id]);
        const payments = await pool.query(
            'SELECT * FROM expert_payments WHERE expert_id = $1 ORDER BY created_at DESC LIMIT 20',
            [req.user.id]
        );
        const withdrawals = await pool.query(
            'SELECT * FROM withdrawal_requests WHERE expert_id = $1 ORDER BY request_date DESC LIMIT 20',
            [req.user.id]
        );

        res.json({
            summary: profile.rows[0] || { total_earnings: 0, available_balance: 0, total_paid_out: 0 },
            payments: payments.rows,
            withdrawals: withdrawals.rows,
            monthlyEarnings: []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/expert/withdrawals', authenticate, authorize('expert'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { amount, withdrawal_method, account_details } = req.body;

        const balance = await client.query('SELECT available_balance FROM expert_profiles WHERE user_id = $1 FOR UPDATE', [req.user.id]);
        if (balance.rows.length === 0 || balance.rows[0].available_balance < amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const pending = await client.query(
            "SELECT COUNT(*) FROM withdrawal_requests WHERE expert_id = $1 AND status IN ('pending', 'approved', 'processing')",
            [req.user.id]
        );
        if (pending.rows[0].count > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'You have a pending withdrawal request' });
        }

        const withdrawal = await client.query(
            `INSERT INTO withdrawal_requests (expert_id, amount, withdrawal_method, account_details, status)
             VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
            [req.user.id, amount, withdrawal_method, JSON.stringify(account_details)]
        );

        await client.query(
            'UPDATE expert_profiles SET available_balance = available_balance - $1 WHERE user_id = $2',
            [amount, req.user.id]
        );

        await notifyAdmins('New Withdrawal Request', `${req.user.name} requested $${amount}`);
        await client.query('COMMIT');

        res.status(201).json({
            message: 'Withdrawal request submitted. 7-day holding period applies.',
            withdrawal: withdrawal.rows[0],
            holding_period_end: withdrawal.rows[0].holding_period_end
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Get all withdrawals (admin)
app.get('/api/admin/withdrawals', authenticate, authorize('admin'), async (req, res) => {
    const result = await pool.query(`
        SELECT wr.*, u.name as expert_name, u.email as expert_email,
               ep.available_balance, ep.total_earnings
        FROM withdrawal_requests wr
        JOIN users u ON wr.expert_id = u.id
        LEFT JOIN expert_profiles ep ON wr.expert_id = ep.user_id
        ORDER BY wr.request_date DESC
    `);
    res.json({ withdrawals: result.rows });
});

// Approve withdrawal (admin)
app.put('/api/admin/withdrawals/:id/approve', authenticate, authorize('admin'), async (req, res) => {
    try {
        const withdrawal = await pool.query('SELECT * FROM withdrawal_requests WHERE id = $1 AND status = $2', [req.params.id, 'pending']);
        if (withdrawal.rows.length === 0) return res.status(400).json({ error: 'Withdrawal not found or already processed' });

        const holdingEnd = new Date(withdrawal.rows[0].holding_period_end);
        if (new Date() < holdingEnd) {
            return res.status(400).json({ error: `Holding period not complete. Ends ${holdingEnd.toISOString()}` });
        }

        const result = await pool.query(
            'UPDATE withdrawal_requests SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            ['approved', req.user.id, req.params.id]
        );
        res.json({ withdrawal: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Process withdrawal payment (admin)
app.put('/api/admin/withdrawals/:id/process', authenticate, authorize('admin'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { transaction_reference } = req.body;
        const withdrawal = await pool.query('SELECT * FROM withdrawal_requests WHERE id = $1 AND status = $2', [req.params.id, 'approved']);
        if (withdrawal.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Withdrawal must be approved first' });
        }

        const result = await client.query(
            'UPDATE withdrawal_requests SET status = $1, processed_by = $2, processed_at = CURRENT_TIMESTAMP, transaction_reference = $3 WHERE id = $4 RETURNING *',
            ['completed', req.user.id, transaction_reference, req.params.id]
        );

        await client.query(
            'UPDATE expert_profiles SET total_paid_out = total_paid_out + $1 WHERE user_id = $2',
            [withdrawal.rows[0].amount, withdrawal.rows[0].expert_id]
        );

        await client.query(
            'INSERT INTO expert_payments (expert_id, amount, payment_type, reference_id, status, processed_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
            [withdrawal.rows[0].expert_id, withdrawal.rows[0].amount, 'withdrawal', req.params.id, 'processed']
        );

        await notifyUser(withdrawal.rows[0].expert_id, 'Payment Processed', `$${withdrawal.rows[0].amount} has been sent. Ref: ${transaction_reference}`, 'payment');
        await client.query('COMMIT');
        res.json({ withdrawal: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// ======================== CLIENT PAYMENTS ========================
app.post('/api/user/payments/process', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { consultation_id, amount, payment_method, transaction_reference } = req.body;

        const consultation = await client.query(
            "SELECT * FROM consultations WHERE id = $1 AND user_id = $2 AND payment_status = 'pending' FOR UPDATE",
            [consultation_id, req.user.id]
        );
        if (consultation.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Consultation not found or already paid' });
        }

        await client.query(
            `INSERT INTO client_payments (client_id, consultation_id, amount, payment_method, transaction_reference, payment_status)
             VALUES ($1, $2, $3, $4, $5, 'completed')`,
            [req.user.id, consultation_id, amount, payment_method, transaction_reference]
        );

        await client.query(
            "UPDATE consultations SET payment_status = 'paid', total_amount = $1, payment_date = CURRENT_TIMESTAMP, payment_method = $2 WHERE id = $3",
            [amount, payment_method, consultation_id]
        );

        const commission = calculateCommission(amount);
        await client.query(
            `INSERT INTO commission_transactions (consultation_id, expert_id, client_id, transaction_type, amount, commission_percentage, platform_amount, expert_amount, status)
             VALUES ($1, $2, $3, 'commission', $4, $5, $6, $7, 'processed')`,
            [consultation_id, consultation.rows[0].assigned_expert_id, req.user.id, amount, COMMISSION_RATE, commission.commissionAmount, commission.expertAmount]
        );

        await notifyUser(consultation.rows[0].assigned_expert_id, 'Payment Received', `Payment of $${amount} received. Funds available after service completion.`, 'payment');
        await client.query('COMMIT');
        res.json({ message: 'Payment processed', commission });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// ======================== CLAIMS ROUTES ========================
app.post('/api/user/claims', authenticate, async (req, res) => {
    try {
        const { consultation_id, claim_type, claim_title, claim_description, claim_amount, evidence_files } = req.body;

        const consultation = await pool.query('SELECT * FROM consultations WHERE id = $1 AND user_id = $2', [consultation_id, req.user.id]);
        if (consultation.rows.length === 0) return res.status(404).json({ error: 'Consultation not found' });

        const existing = await pool.query(
            "SELECT * FROM client_claims WHERE consultation_id = $1 AND client_id = $2 AND status NOT IN ('resolved_client_favor', 'resolved_expert_favor', 'full_refund', 'dismissed')",
            [consultation_id, req.user.id]
        );
        if (existing.rows.length > 0) return res.status(400).json({ error: 'Active claim already exists' });

        const result = await pool.query(
            `INSERT INTO client_claims (client_id, consultation_id, claim_type, claim_title, claim_description, claim_amount, evidence_files, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'filed') RETURNING *`,
            [req.user.id, consultation_id, claim_type, claim_title, claim_description, claim_amount, evidence_files]
        );

        await notifyAdmins('New Claim Filed', `${claim_title} - $${claim_amount || 0}`, 'dispute');
        await notifyUser(consultation.rows[0].assigned_expert_id, 'Claim Filed', `A claim has been filed regarding your consultation`, 'dispute');

        res.status(201).json({ claim: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/claims', authenticate, authorize('admin'), async (req, res) => {
    const result = await pool.query(`
        SELECT cc.*, u.name as client_name FROM client_claims cc
        JOIN users u ON cc.client_id = u.id ORDER BY cc.created_at DESC
    `);
    res.json({ claims: result.rows });
});

app.put('/api/admin/claims/:id/resolve', authenticate, authorize('admin'), async (req, res) => {
    const { resolution_status, resolution, refund_amount } = req.body;
    const result = await pool.query(
        'UPDATE client_claims SET status = $1, resolution = $2, refund_amount = $3, resolution_date = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
        [resolution_status, resolution, refund_amount, req.params.id]
    );
    res.json({ claim: result.rows[0] });
});

// ======================== SUPPORT ROUTES ========================
app.post('/api/user/support', authenticate, async (req, res) => {
    const { subject, message } = req.body;
    const result = await pool.query(
        'INSERT INTO support_requests (user_id, subject, message) VALUES ($1, $2, $3) RETURNING *',
        [req.user.id, subject, message]
    );
    await notifyAdmins('New Support Ticket', subject);
    res.status(201).json({ ticket: result.rows[0] });
});

app.get('/api/admin/support-tickets', authenticate, authorize('admin'), async (req, res) => {
    const result = await pool.query('SELECT sr.*, u.name FROM support_requests sr JOIN users u ON sr.user_id = u.id ORDER BY sr.created_at DESC');
    res.json({ tickets: result.rows });
});

// ======================== EXPERT APPLICATION ========================
app.post('/api/user/apply-expert', authenticate, async (req, res) => {
    try {
        const { expertise, bio, hourly_rate, qualifications } = req.body;
        const existing = await pool.query('SELECT * FROM expert_applications WHERE user_id = $1 AND status = $2', [req.user.id, 'pending']);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'Pending application exists' });

        const result = await pool.query(
            'INSERT INTO expert_applications (user_id, expertise, bio, hourly_rate, qualifications) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, expertise, bio, hourly_rate, qualifications]
        );
        await notifyAdmins('New Expert Application', `${req.user.name} applied to become an expert`, 'approval');
        res.status(201).json({ application: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ======================== FEEDBACK ========================
app.post('/api/user/consultations/:id/feedback', authenticate, async (req, res) => {
    try {
        const { rating, feedback_text } = req.body;
        const consultation = await pool.query("SELECT * FROM consultations WHERE id = $1 AND user_id = $2 AND status = 'closed'", [req.params.id, req.user.id]);
        if (consultation.rows.length === 0) return res.status(400).json({ error: 'Cannot provide feedback' });

        const existing = await pool.query('SELECT * FROM consultation_feedback WHERE consultation_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'Feedback already submitted' });

        await pool.query(
            'INSERT INTO consultation_feedback (consultation_id, user_id, rating, feedback_text) VALUES ($1, $2, $3, $4)',
            [req.params.id, req.user.id, rating, feedback_text]
        );

        await pool.query(
            `UPDATE expert_profiles SET average_rating = (
                SELECT AVG(rating) FROM consultation_feedback cf
                JOIN consultations c ON cf.consultation_id = c.id
                WHERE c.assigned_expert_id = $1
            ), total_reviews = total_reviews + 1 WHERE user_id = $1`,
            [consultation.rows[0].assigned_expert_id]
        );

        res.json({ message: 'Feedback submitted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ======================== NOTIFICATIONS ========================
app.get('/api/common/notifications', authenticate, async (req, res) => {
    const result = await pool.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
        [req.user.id]
    );
    res.json({ notifications: result.rows });
});

// ======================== ANALYTICS ========================
app.get('/api/admin/analytics', authenticate, authorize('admin'), async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM users WHERE role = 'user') as total_users,
                (SELECT COUNT(*) FROM users WHERE role = 'expert') as total_experts,
                (SELECT COUNT(*) FROM consultations WHERE status IN ('pending', 'assigned', 'in_progress')) as active_consultations,
                (SELECT COUNT(*) FROM events WHERE status = 'active') as active_events,
                (SELECT COUNT(*) FROM support_requests WHERE status = 'open') as open_tickets,
                (SELECT COALESCE(SUM(platform_fee), 0) FROM consultations WHERE status = 'closed') as total_revenue
        `);
        res.json({ stats: stats.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ======================== DATA ENDPOINT (Legacy compatibility) ========================
app.get('/api/data', authenticate, async (req, res) => {
    try {
        const experts = await pool.query(`
            SELECT u.id, u.name as "fullName", u.email, u.status,
                   ep.expertise, ep.specialization, ep.is_available as "isAvailable",
                   ep.tasks_completed as "tasksCompleted", ep.average_rating as rating
            FROM users u JOIN expert_profiles ep ON u.id = ep.user_id WHERE u.role = 'expert'
        `);

        const tasks = await pool.query(`
            SELECT c.id, c.title, c.description, c.status,
                   c.assigned_expert_id as "assignedTo",
                   c.scheduled_date as "dueDate",
                   c.consultation_type as specialization
            FROM consultations c
        `);

        res.json({ experts: experts.rows, tasks: tasks.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Legacy endpoints for compatibility
app.post('/api/experts', authenticate, authorize('admin'), async (req, res) => {
    const { fullName, email, specialization } = req.body;
    try {
        const hash = await bcrypt.hash('Expert@123', 12);
        const user = await pool.query(
            "INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, 'expert', 'active') RETURNING id",
            [fullName, email, hash]
        );
        await pool.query(
            "INSERT INTO expert_profiles (user_id, expertise, specialization, application_status) VALUES ($1, $2, $3, 'approved')",
            [user.rows[0].id, [specialization], specialization]
        );
        res.status(201).json({ message: 'Expert created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks', authenticate, authorize('admin'), async (req, res) => {
    const { title, description, specialization, dueDate } = req.body;
    const result = await pool.query(
        `INSERT INTO consultations (user_id, title, description, consultation_type, scheduled_date, status)
         VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
        [req.user.id, title, description, specialization, dueDate]
    );
    res.status(201).json(result.rows[0]);
});

app.patch('/api/tasks/:id/status', authenticate, async (req, res) => {
    const { status } = req.body;
    const result = await pool.query(
        'UPDATE consultations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, req.params.id]
    );
    res.json(result.rows[0]);
});

app.delete('/api/tasks/:id', authenticate, async (req, res) => {
    await pool.query('DELETE FROM consultations WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
});

app.patch('/api/tasks/:id/assign', authenticate, authorize('admin'), async (req, res) => {
    const { expertId, expertName } = req.body;
    const result = await pool.query(
        "UPDATE consultations SET assigned_expert_id = $1, status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
        [expertId, req.params.id]
    );
    res.json(result.rows[0]);
});

app.patch('/api/tasks/:id/claim', authenticate, async (req, res) => {
    const result = await pool.query(
        "UPDATE consultations SET assigned_expert_id = $1, status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND assigned_expert_id IS NULL RETURNING *",
        [req.user.id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Task already assigned' });
    res.json(result.rows[0]);
});

// ======================== COMMISSION CALCULATOR ========================
app.post('/api/expert/commission/calculate', authenticate, async (req, res) => {
    const { amount } = req.body;
    const commission = calculateCommission(amount);
    res.json(commission);
});

// ======================== START SERVER ========================
async function startServer() {
    try {
        await initializeDatabase();
        httpServer.listen(PORT, () => {
            console.log(`🚀 ExpertHub Server running on port ${PORT}`);
            console.log(`📡 Socket.IO ready for real-time connections`);
            console.log(`💰 Platform Commission Rate: ${COMMISSION_RATE}%`);
            console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
            console.log(`\n📋 Default Accounts:`);
            console.log(`   Admin: admin@platform.com / admin123`);
            console.log(`   Expert: expert@platform.com / expert123`);
            console.log(`   User: user@platform.com / user123`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = { app, io, pool };
