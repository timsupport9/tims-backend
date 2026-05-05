require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: process.env.FRONTEND_URL || 'https://timssupportcentre.netlify.app', 
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true 
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://timssupportcentre.netlify.app',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ==================== PERSISTENT STORAGE ====================
const DATA_FILE = process.env.DATA_FILE_PATH || '/tmp/data.json';

class PersistentDB {
    constructor() {
        this.db = this.getEmptyDB();
        this.saveTimer = null;
    }

    getEmptyDB() {
        return {
            users: [],
            expertProfiles: [],
            consultations: [],
            consultationMessages: [],
            events: [],
            enrollments: [],
            withdrawalRequests: [],
            clientClaims: [],
            notifications: [],
            commissionConfig: [{ id: 'default', commission_type: 'default', percentage: 20.00, is_active: true }],
            expertServices: [],
            expertAvailability: [],
            bookingSlots: [],
            bootcamps: [],
            shortCourses: [],
            tuitionSessions: [],
            examPreparations: [],
            careerGuidance: [],
            eschoolEnrollments: [],
            supportRequests: [],
            clientPayments: [],
            commissionTransactions: [],
            expertEarningsSummary: [],
            serviceProofs: [],
            expertSuspensions: []
        };
    }

    async load() {
        try {
            const data = await fs.readFile(DATA_FILE, 'utf8');
            const loaded = JSON.parse(data);
            Object.assign(this.db, loaded);
            console.log('✅ Data loaded from file');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error loading data:', error);
            }
            console.log('⚠️ No existing data file, using fresh database');
        }
        return this.db;
    }

    async save() {
        try {
            await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
            await fs.writeFile(DATA_FILE, JSON.stringify(this.db, null, 2));
            console.log('✅ Data saved');
        } catch (error) {
            console.error('❌ Error saving data:', error);
        }
    }

    async saveDebounced() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.save(), 1000);
    }

    // Helper methods
    find(collection, predicate) {
        return this.db[collection].find(predicate);
    }

    filter(collection, predicate) {
        return this.db[collection].filter(predicate);
    }

    push(collection, item) {
        this.db[collection].push(item);
        this.saveDebounced();
        return item;
    }

    update(collection, predicate, updater) {
        const index = this.db[collection].findIndex(predicate);
        if (index !== -1) {
            this.db[collection][index] = updater(this.db[collection][index]);
            this.saveDebounced();
            return true;
        }
        return false;
    }

    deleteWhere(collection, predicate) {
        const filtered = this.db[collection].filter(item => !predicate(item));
        const deleted = this.db[collection].length !== filtered.length;
        this.db[collection] = filtered;
        if (deleted) this.saveDebounced();
        return deleted;
    }
}

const dbManager = new PersistentDB();
let db = null;

// ==================== SEED DATA ====================
async function seedDatabase() {
    db = await dbManager.load();
    
    if (db.users.length === 0) {
        const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
        const expertHash = await bcrypt.hash('expert123', 10);
        const userHash = await bcrypt.hash('user123', 10);

        // Admin
        const adminId = uuidv4();
        db.users.push({ id: adminId, name: 'Admin User', email: process.env.ADMIN_EMAIL || 'admin@platform.com', password_hash: adminHash, role: 'admin', status: 'active', phone: '', avatar_url: '', created_at: new Date().toISOString() });

        // Expert 1
        const expert1Id = uuidv4();
        db.users.push({ id: expert1Id, name: 'John Expert', email: 'expert@platform.com', password_hash: expertHash, role: 'expert', status: 'active', phone: '+1234567890', avatar_url: '', created_at: new Date().toISOString() });
        db.expertProfiles.push({ id: uuidv4(), user_id: expert1Id, expertise: ['Web Development', 'Cloud Computing', 'Python'], bio: 'Experienced full-stack developer with 10+ years', hourly_rate: 150.00, total_earnings: 2500.00, available_balance: 1800.00, application_status: 'approved', approved_at: new Date().toISOString(), approved_by: adminId, is_suspended: false, average_rating: 4.8, total_reviews: 25, is_active: true });
        db.expertEarningsSummary.push({ id: uuidv4(), expert_id: expert1Id, total_earned: 2500.00, total_commission_paid: 500.00, available_balance: 1800.00, pending_payout: 0, total_paid_out: 200.00, is_frozen: false });
        db.expertServices.push({ id: uuidv4(), expert_id: expert1Id, service_name: 'Technical Consultation', service_type: 'consultation', description: '1-on-1 technical consultation', base_price: 150.00, commission_percentage: 20.00, expert_earnings: 120.00, duration_minutes: 60, is_active: true });
        db.expertServices.push({ id: uuidv4(), expert_id: expert1Id, service_name: 'Code Review', service_type: 'document_review', description: 'In-depth code review session', base_price: 100.00, commission_percentage: 20.00, expert_earnings: 80.00, duration_minutes: 45, is_active: true });

        // Expert 2
        const expert2Id = uuidv4();
        db.users.push({ id: expert2Id, name: 'Sarah Consultant', email: 'sarah@platform.com', password_hash: expertHash, role: 'expert', status: 'active', phone: '', avatar_url: '', created_at: new Date().toISOString() });
        db.expertProfiles.push({ id: uuidv4(), user_id: expert2Id, expertise: ['Business Strategy', 'Marketing', 'Finance'], bio: 'Business consultant with MBA', hourly_rate: 200.00, total_earnings: 4000.00, available_balance: 3200.00, application_status: 'approved', approved_at: new Date().toISOString(), approved_by: adminId, is_suspended: false, average_rating: 4.5, total_reviews: 18, is_active: true });
        db.expertEarningsSummary.push({ id: uuidv4(), expert_id: expert2Id, total_earned: 4000.00, total_commission_paid: 800.00, available_balance: 3200.00, pending_payout: 0, total_paid_out: 0, is_frozen: false });
        db.expertServices.push({ id: uuidv4(), expert_id: expert2Id, service_name: 'Business Strategy Session', service_type: 'consultation', description: 'Strategic business planning', base_price: 200.00, commission_percentage: 20.00, expert_earnings: 160.00, duration_minutes: 90, is_active: true });

        // Regular User
        const userId = uuidv4();
        db.users.push({ id: userId, name: 'Jane User', email: 'user@platform.com', password_hash: userHash, role: 'user', status: 'active', phone: '', avatar_url: '', created_at: new Date().toISOString() });

        // Sample Consultations
        const cons1Id = uuidv4();
        db.consultations.push({ id: cons1Id, user_id: userId, assigned_expert_id: expert1Id, title: 'React Application Debugging', description: 'Need help debugging a complex React state issue', consultation_type: 'chat', status: 'in_progress', total_amount: 150.00, commission_amount: 30.00, expert_payout: 120.00, payment_status: 'paid', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() });
        db.consultationMessages.push({ id: uuidv4(), consultation_id: cons1Id, sender_id: userId, sender_role: 'user', sender_name: 'Jane User', message: 'Hi, I need help with my React app', is_read: true, created_at: new Date(Date.now() - 86000000).toISOString() });
        db.consultationMessages.push({ id: uuidv4(), consultation_id: cons1Id, sender_id: expert1Id, sender_role: 'expert', sender_name: 'John Expert', message: 'Sure! Can you share your code?', is_read: true, created_at: new Date(Date.now() - 85000000).toISOString() });

        const cons2Id = uuidv4();
        db.consultations.push({ id: cons2Id, user_id: userId, assigned_expert_id: expert2Id, title: 'Business Plan Review', description: 'Need expert review of my startup business plan', consultation_type: 'video', status: 'assigned', total_amount: 200.00, commission_amount: 40.00, expert_payout: 160.00, payment_status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

        // Sample Events
        db.events.push({ id: uuidv4(), title: 'Web Development Bootcamp', description: 'Full-stack web development intensive training', event_type: 'workshop', assigned_expert_id: expert1Id, start_date: new Date(Date.now() + 604800000).toISOString(), end_date: new Date(Date.now() + 1209600000).toISOString(), max_participants: 30, status: 'active', expert_payment: 500.00, created_by: adminId });
        db.events.push({ id: uuidv4(), title: 'Cloud Architecture Masterclass', description: 'Advanced cloud computing concepts', event_type: 'training', assigned_expert_id: expert1Id, start_date: new Date(Date.now() + 1209600000).toISOString(), end_date: new Date(Date.now() + 1814400000).toISOString(), max_participants: 20, status: 'active', expert_payment: 750.00, created_by: adminId });

        // Sample Withdrawal
        db.withdrawalRequests.push({ id: uuidv4(), expert_id: expert1Id, amount: 500.00, withdrawal_method: 'bank_transfer', account_details: { bank: 'Example Bank', account: '123456789' }, status: 'pending', request_date: new Date(Date.now() - 172800000).toISOString(), holding_period_end: new Date(Date.now() + 432000000).toISOString().split('T')[0] });

        // Sample Claim
        db.clientClaims.push({ id: uuidv4(), client_id: userId, consultation_id: cons1Id, claim_type: 'poor_quality', claim_title: 'Unsatisfactory consultation', claim_description: 'The expert did not fully address my issue', claim_amount: 150.00, status: 'filed', priority: 'medium', created_at: new Date().toISOString() });

        // Sample eSchool data
        db.bootcamps.push({ id: uuidv4(), title: 'Full-Stack Developer Bootcamp', description: 'Become a full-stack developer in 12 weeks', category: 'Tech', duration_weeks: 12, intensity: 'full-time', price: 999.00, max_students: 25, assigned_expert_id: expert1Id, status: 'active', start_date: new Date(Date.now() + 1209600000).toISOString() });
        db.shortCourses.push({ id: uuidv4(), title: 'Python for Beginners', description: 'Learn Python programming from scratch', category: 'Programming', duration_hours: 20, price: 199.00, difficulty_level: 'beginner', assigned_expert_id: expert1Id, status: 'published' });
        db.tuitionSessions.push({ id: uuidv4(), subject_id: 'math-ss', academic_level_id: 'senior-secondary', title: 'KCSE Mathematics Revision', description: 'Intensive math revision for KCSE', tutor_id: expert2Id, session_type: 'group', price_per_session: 30.00, duration_minutes: 90 });
        db.examPreparations.push({ id: uuidv4(), subject_id: 'math-ss', title: 'KCSE Math 2024 Mock Exam', description: 'Full mock exam with solutions', examiner_id: expert2Id, exam_type: 'KCSE', year: 2024, price: 49.00, total_questions: 50, duration_minutes: 180, difficulty: 'medium' });
        db.careerGuidance.push({ id: uuidv4(), title: 'Tech Career Path Planning', description: 'Plan your career in technology', career_path: 'Technology', counselor_id: expert1Id, session_type: 'one-on-one', price: 75.00, duration_minutes: 60 });

        // Notifications
        db.notifications.push({ id: uuidv4(), user_id: adminId, title: 'New User Registration', message: 'Jane User registered and needs approval', type: 'approval', is_read: false, created_at: new Date().toISOString() });
        db.notifications.push({ id: uuidv4(), user_id: expert1Id, title: 'New Consultation Assigned', message: 'You have a new consultation request', type: 'assignment', is_read: false, created_at: new Date().toISOString() });

        await dbManager.save();
        console.log('✅ Database seeded with sample data');
    }
}

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ==================== MIDDLEWARE ====================
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
        const user = db.users.find(u => u.id === decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found' });
        if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });
        if (user.status === 'deleted') return res.status(403).json({ error: 'Account deleted' });
        req.user = { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

function authorize(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
        next();
    };
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.users.find(u => u.email === email);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        if (user.status === 'pending') return res.status(403).json({ error: 'Account pending approval', status: 'pending' });
        if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended', status: 'suspended' });
        
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role }, 
            process.env.JWT_SECRET || 'your-secret-key-change-this', 
            { expiresIn: '24h' }
        );
        
        const profile = user.role === 'expert' ? db.expertProfiles.find(p => p.user_id === user.id) || {} : {};
        
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, phone: user.phone, profile } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (db.users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered' });
        
        const hash = await bcrypt.hash(password, 10);
        const user = { id: uuidv4(), name, email, password_hash: hash, role: 'user', status: 'pending', phone: phone || '', avatar_url: '', created_at: new Date().toISOString() };
        dbManager.push('users', user);
        
        // Notify admin
        db.users.filter(u => u.role === 'admin').forEach(a => {
            dbManager.push('notifications', { id: uuidv4(), user_id: a.id, title: 'New Registration', message: `${name} (${email}) needs approval`, type: 'approval', is_read: false, created_at: new Date().toISOString() });
        });
        
        res.status(201).json({ message: 'Registration submitted for approval', user: { id: user.id, name, email, role: 'user', status: 'pending' } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', authenticate, (req, res) => {
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const profile = user.role === 'expert' ? db.expertProfiles.find(p => p.user_id === user.id) || {} : {};
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, phone: user.phone, avatar_url: user.avatar_url, profile } });
});

// ==================== ADMIN ROUTES ====================
app.get('/api/admin/users', authenticate, authorize('admin'), (req, res) => {
    const users = db.users.map(u => {
        const profile = u.role === 'expert' ? db.expertProfiles.find(p => p.user_id === u.id) : null;
        return { ...u, password_hash: undefined, total_earnings: profile?.total_earnings, average_rating: profile?.average_rating, expertise: profile?.expertise };
    });
    res.json({ users });
});

app.put('/api/admin/users/:userId/approve', authenticate, authorize('admin'), (req, res) => {
    const user = db.users.find(u => u.id === req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.status = 'active';
    dbManager.update('users', u => u.id === req.params.userId, () => user);
    dbManager.push('notifications', { id: uuidv4(), user_id: user.id, title: 'Account Approved', message: 'Your account has been approved', type: 'approval', is_read: false, created_at: new Date().toISOString() });
    res.json({ message: 'User approved', user: { id: user.id, name: user.name, status: user.status } });
});

app.put('/api/admin/users/:userId/suspend', authenticate, authorize('admin'), (req, res) => {
    const user = db.users.find(u => u.id === req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.status = 'suspended';
    dbManager.update('users', u => u.id === req.params.userId, () => user);
    res.json({ message: 'User suspended' });
});

app.get('/api/admin/experts', authenticate, authorize('admin'), (req, res) => {
    const experts = db.users.filter(u => u.role === 'expert').map(u => {
        const profile = db.expertProfiles.find(p => p.user_id === u.id) || {};
        const earnings = db.expertEarningsSummary.find(e => e.expert_id === u.id) || {};
        return { id: u.id, name: u.name, email: u.email, status: u.status, expertise: profile.expertise, average_rating: profile.average_rating, total_earnings: earnings.total_earned, available_balance: earnings.available_balance, application_status: profile.application_status, completion_rate: 85 };
    });
    res.json({ experts });
});

app.post('/api/admin/experts/create', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { name, email, phone, expertise, bio, hourly_rate } = req.body;
        if (db.users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered' });
        
        const hash = await bcrypt.hash('Expert@123', 10);
        const expertId = uuidv4();
        dbManager.push('users', { id: expertId, name, email, password_hash: hash, role: 'expert', status: 'active', phone: phone || '', avatar_url: '', created_at: new Date().toISOString() });
        dbManager.push('expertProfiles', { id: uuidv4(), user_id: expertId, expertise: expertise || [], bio: bio || '', hourly_rate: parseFloat(hourly_rate) || 0, total_earnings: 0, available_balance: 0, application_status: 'approved', approved_at: new Date().toISOString(), approved_by: req.user.id, is_suspended: false, average_rating: 0, total_reviews: 0, is_active: true });
        dbManager.push('expertEarningsSummary', { id: uuidv4(), expert_id: expertId, total_earned: 0, total_commission_paid: 0, available_balance: 0, pending_payout: 0, total_paid_out: 0, is_frozen: false });
        
        dbManager.push('notifications', { id: uuidv4(), user_id: expertId, title: 'Welcome!', message: 'Your expert account is ready', type: 'approval', is_read: false, created_at: new Date().toISOString() });
        res.status(201).json({ message: 'Expert created', expert: { id: expertId, name, email, role: 'expert', status: 'active' } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/experts/:expertId/suspend', authenticate, authorize('admin'), (req, res) => {
    const user = db.users.find(u => u.id === req.params.expertId && u.role === 'expert');
    if (!user) return res.status(404).json({ error: 'Expert not found' });
    user.status = 'suspended';
    const profile = db.expertProfiles.find(p => p.user_id === user.id);
    if (profile) profile.is_suspended = true;
    dbManager.push('expertSuspensions', { id: uuidv4(), expert_id: user.id, suspended_by: req.user.id, suspension_type: req.body.suspension_type || 'temporary', reason: req.body.reason || 'Admin suspension', start_date: new Date().toISOString(), is_active: true });
    dbManager.push('notifications', { id: uuidv4(), user_id: user.id, title: 'Account Suspended', message: `Your account has been suspended. Reason: ${req.body.reason || 'Admin action'}`, type: 'system', is_read: false, created_at: new Date().toISOString() });
    dbManager.update('users', u => u.id === req.params.expertId, () => user);
    res.json({ message: 'Expert suspended' });
});

app.post('/api/admin/experts/:expertId/reactivate', authenticate, authorize('admin'), (req, res) => {
    const user = db.users.find(u => u.id === req.params.expertId && u.role === 'expert');
    if (!user) return res.status(404).json({ error: 'Expert not found' });
    user.status = 'active';
    const profile = db.expertProfiles.find(p => p.user_id === user.id);
    if (profile) profile.is_suspended = false;
    dbManager.push('notifications', { id: uuidv4(), user_id: user.id, title: 'Account Reactivated', message: 'Your account has been reactivated', type: 'approval', is_read: false, created_at: new Date().toISOString() });
    dbManager.update('users', u => u.id === req.params.expertId, () => user);
    res.json({ message: 'Expert reactivated' });
});

app.delete('/api/admin/experts/:expertId', authenticate, authorize('admin'), (req, res) => {
    const user = db.users.find(u => u.id === req.params.expertId && u.role === 'expert');
    if (!user) return res.status(404).json({ error: 'Expert not found' });
    user.status = 'deleted';
    dbManager.update('users', u => u.id === req.params.expertId, () => user);
    res.json({ message: 'Expert deleted' });
});

app.get('/api/admin/analytics', authenticate, authorize('admin'), (req, res) => {
    res.json({
        stats: {
            total_users: db.users.filter(u => u.role === 'user').length,
            total_experts: db.users.filter(u => u.role === 'expert' && u.status === 'active').length,
            active_consultations: db.consultations.filter(c => ['assigned', 'in_progress'].includes(c.status)).length,
            active_events: db.events.filter(e => e.status === 'active').length,
            total_revenue: db.clientPayments.reduce((s, p) => s + (p.amount || 0), 0),
            total_commission: db.commissionTransactions.reduce((s, t) => s + (t.platform_amount || 0), 0),
            pending_approvals: db.users.filter(u => u.status === 'pending').length,
            active_claims: db.clientClaims.filter(c => !['dismissed', 'resolved_client_favor', 'resolved_expert_favor', 'full_refund'].includes(c.status)).length,
            total_enrollments: db.eschoolEnrollments.length
        }
    });
});

app.get('/api/admin/withdrawals', authenticate, authorize('admin'), (req, res) => {
    const withdrawals = db.withdrawalRequests.map(w => {
        const expert = db.users.find(u => u.id === w.expert_id);
        return { ...w, expert_name: expert?.name, expert_email: expert?.email };
    });
    res.json({ withdrawals });
});

app.put('/api/admin/withdrawals/:id/approve', authenticate, authorize('admin'), (req, res) => {
    const w = db.withdrawalRequests.find(w => w.id === req.params.id);
    if (!w) return res.status(404).json({ error: 'Withdrawal not found' });
    w.status = 'approved';
    w.approved_by = req.user.id;
    w.approved_at = new Date().toISOString();
    dbManager.update('withdrawalRequests', w => w.id === req.params.id, () => w);
    res.json({ message: 'Withdrawal approved' });
});

app.put('/api/admin/withdrawals/:id/process', authenticate, authorize('admin'), (req, res) => {
    const w = db.withdrawalRequests.find(w => w.id === req.params.id);
    if (!w) return res.status(404).json({ error: 'Withdrawal not found' });
    w.status = 'completed';
    w.processed_by = req.user.id;
    w.processed_at = new Date().toISOString();
    w.transaction_reference = req.body.transaction_reference;
    const earnings = db.expertEarningsSummary.find(e => e.expert_id === w.expert_id);
    if (earnings) { earnings.pending_payout -= w.amount; earnings.total_paid_out += w.amount; }
    dbManager.update('withdrawalRequests', w => w.id === req.params.id, () => w);
    if (earnings) dbManager.update('expertEarningsSummary', e => e.expert_id === w.expert_id, () => earnings);
    res.json({ message: 'Payment processed' });
});

app.get('/api/admin/claims', authenticate, authorize('admin'), (req, res) => {
    const claims = db.clientClaims.map(c => {
        const client = db.users.find(u => u.id === c.client_id);
        return { ...c, client_name: client?.name };
    });
    res.json({ claims });
});

app.put('/api/admin/claims/:id/resolve', authenticate, authorize('admin'), (req, res) => {
    const claim = db.clientClaims.find(c => c.id === req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    claim.status = req.body.resolution_status || 'resolved';
    claim.resolution = req.body.resolution;
    claim.resolution_date = new Date().toISOString();
    claim.refund_amount = req.body.refund_amount || 0;
    dbManager.update('clientClaims', c => c.id === req.params.id, () => claim);
    res.json({ message: 'Claim resolved' });
});

app.get('/api/admin/commission-configs', authenticate, authorize('admin'), (req, res) => {
    res.json({ configs: db.commissionConfig });
});

app.post('/api/admin/commission-config', authenticate, authorize('admin'), (req, res) => {
    const config = { id: uuidv4(), ...req.body, is_active: true, created_at: new Date().toISOString() };
    dbManager.push('commissionConfig', config);
    res.status(201).json({ config });
});

// ==================== EXPERT ROUTES ====================
app.get('/api/expert/consultations', authenticate, authorize('expert'), (req, res) => {
    const consultations = db.consultations.filter(c => c.assigned_expert_id === req.user.id).map(c => {
        const client = db.users.find(u => u.id === c.user_id);
        const unread = db.consultationMessages.filter(m => m.consultation_id === c.id && m.sender_id !== req.user.id && !m.is_read).length;
        return { ...c, client_name: client?.name, client_email: client?.email, unread_messages: unread };
    });
    res.json({ consultations });
});

app.get('/api/expert/events', authenticate, authorize('expert'), (req, res) => {
    const events = db.events.filter(e => e.assigned_expert_id === req.user.id);
    res.json({ events });
});

app.get('/api/expert/earnings', authenticate, authorize('expert'), (req, res) => {
    const summary = db.expertEarningsSummary.find(e => e.expert_id === req.user.id) || { total_earned: 0, available_balance: 0, pending_payout: 0, total_paid_out: 0 };
    res.json({ summary });
});

app.get('/api/expert/services', authenticate, authorize('expert'), (req, res) => {
    const services = db.expertServices.filter(s => s.expert_id === req.user.id);
    res.json({ services });
});

app.post('/api/expert/services', authenticate, authorize('expert'), (req, res) => {
    const commission = db.commissionConfig.find(c => c.is_active)?.percentage || 20;
    const price = parseFloat(req.body.base_price) || 0;
    const service = {
        id: uuidv4(), expert_id: req.user.id,
        service_name: req.body.service_name, service_type: req.body.service_type || 'consultation',
        description: req.body.description || '', base_price: price,
        commission_percentage: commission, expert_earnings: price * (1 - commission / 100),
        duration_minutes: parseInt(req.body.duration_minutes) || 60, is_active: true
    };
    dbManager.push('expertServices', service);
    res.status(201).json({ service });
});

app.put('/api/expert/availability', authenticate, authorize('expert'), (req, res) => {
    dbManager.deleteWhere('expertAvailability', a => a.expert_id === req.user.id);
    const schedule = req.body.schedule || [];
    schedule.forEach(s => {
        dbManager.push('expertAvailability', { id: uuidv4(), expert_id: req.user.id, day_of_week: s.day, start_time: s.start, end_time: s.end, is_available: true, recurrence: s.recurrence || 'weekly' });
    });
    res.json({ message: 'Availability updated' });
});

// ==================== USER ROUTES ====================
app.get('/api/user/consultations', authenticate, authorize('user'), (req, res) => {
    const consultations = db.consultations.filter(c => c.user_id === req.user.id).map(c => {
        const expert = db.users.find(u => u.id === c.assigned_expert_id);
        return { ...c, expert_name: expert?.name };
    });
    res.json({ consultations });
});

app.post('/api/user/consultations', authenticate, authorize('user'), (req, res) => {
    const consultation = {
        id: uuidv4(), user_id: req.user.id, assigned_expert_id: null,
        title: req.body.title, description: req.body.description || '',
        consultation_type: req.body.consultation_type || 'chat',
        status: 'pending', payment_status: 'pending',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
    dbManager.push('consultations', consultation);
    db.users.filter(u => u.role === 'admin').forEach(a => {
        dbManager.push('notifications', { id: uuidv4(), user_id: a.id, title: 'New Consultation', message: `${req.user.name} requested: ${req.body.title}`, type: 'system', is_read: false, created_at: new Date().toISOString() });
    });
    res.status(201).json({ consultation });
});

app.get('/api/user/events', authenticate, authorize('user'), (req, res) => {
    res.json({ events: db.events.filter(e => e.status === 'active') });
});

app.post('/api/user/events/:eventId/enroll', authenticate, authorize('user'), (req, res) => {
    const eventId = req.params.eventId;
    if (db.enrollments.find(e => e.user_id === req.user.id && e.event_id === eventId)) {
        return res.status(400).json({ error: 'Already enrolled' });
    }
    dbManager.push('enrollments', { id: uuidv4(), user_id: req.user.id, event_id: eventId, enrollment_status: 'enrolled', enrolled_at: new Date().toISOString() });
    res.status(201).json({ message: 'Enrolled successfully' });
});

app.get('/api/user/enrollments', authenticate, authorize('user'), (req, res) => {
    const enrollments = db.enrollments.filter(e => e.user_id === req.user.id).map(e => {
        const event = db.events.find(ev => ev.id === e.event_id);
        return { ...e, event_title: event?.title, event_type: event?.event_type };
    });
    res.json({ enrollments });
});

app.post('/api/user/apply-expert', authenticate, authorize('user'), (req, res) => {
    const existing = db.expertProfiles.find(p => p.user_id === req.user.id);
    if (existing) return res.status(400).json({ error: 'Already applied or is an expert' });
    dbManager.push('expertProfiles', {
        id: uuidv4(), user_id: req.user.id, expertise: req.body.expertise || [],
        bio: req.body.bio || '', hourly_rate: parseFloat(req.body.hourly_rate) || 0,
        total_earnings: 0, available_balance: 0, application_status: 'pending',
        is_suspended: false, average_rating: 0, total_reviews: 0, is_active: true
    });
    res.status(201).json({ message: 'Application submitted for review' });
});

// ==================== CONSULTATION MESSAGES ====================
app.get('/api/consultations/:id/messages', authenticate, (req, res) => {
    const consultation = db.consultations.find(c => c.id === req.params.id);
    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
    if (req.user.role !== 'admin' && consultation.user_id !== req.user.id && consultation.assigned_expert_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const messages = db.consultationMessages.filter(m => m.consultation_id === req.params.id);
    messages.forEach(m => { if (m.sender_id !== req.user.id) m.is_read = true; });
    res.json({ messages });
});

app.post('/api/consultations/:id/messages', authenticate, (req, res) => {
    const consultation = db.consultations.find(c => c.id === req.params.id);
    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
    const message = {
        id: uuidv4(), consultation_id: req.params.id,
        sender_id: req.user.id, sender_role: req.user.role, sender_name: req.user.name,
        message: req.body.message, is_read: false, created_at: new Date().toISOString()
    };
    dbManager.push('consultationMessages', message);
    io.to(`consultation_${req.params.id}`).emit('new_message', message);
    res.status(201).json({ message });
});

// ==================== NOTIFICATIONS ====================
app.get('/api/notifications', authenticate, (req, res) => {
    const notifications = db.notifications.filter(n => n.user_id === req.user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ notifications });
});

// ==================== FINANCIAL ROUTES ====================
app.post('/api/financial/expert/withdrawals', authenticate, authorize('expert'), (req, res) => {
    const earnings = db.expertEarningsSummary.find(e => e.expert_id === req.user.id);
    if (!earnings || earnings.available_balance < req.body.amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }
    const withdrawal = {
        id: uuidv4(), expert_id: req.user.id, amount: parseFloat(req.body.amount),
        withdrawal_method: req.body.withdrawal_method || 'bank_transfer',
        account_details: req.body.account_details || {},
        status: 'pending', request_date: new Date().toISOString(),
        holding_period_end: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    };
    dbManager.push('withdrawalRequests', withdrawal);
    earnings.available_balance -= withdrawal.amount;
    earnings.pending_payout += withdrawal.amount;
    dbManager.update('expertEarningsSummary', e => e.expert_id === req.user.id, () => earnings);
    res.status(201).json({ message: 'Withdrawal requested', withdrawal });
});

// ==================== ESCHOOL ROUTES ====================
app.get('/api/eschool/bootcamps', authenticate, (req, res) => {
    res.json({ bootcamps: db.bootcamps });
});

app.get('/api/eschool/short-courses', authenticate, (req, res) => {
    res.json({ courses: db.shortCourses });
});

app.get('/api/eschool/tuition', authenticate, (req, res) => {
    res.json({ sessions: db.tuitionSessions });
});

app.get('/api/eschool/exam-prep', authenticate, (req, res) => {
    res.json({ exams: db.examPreparations });
});

app.get('/api/eschool/career-guidance', authenticate, (req, res) => {
    res.json({ guidance: db.careerGuidance });
});

app.post('/api/eschool/enroll', authenticate, (req, res) => {
    dbManager.push('eschoolEnrollments', {
        id: uuidv4(), user_id: req.user.id,
        enrollment_type: req.body.enrollment_type,
        reference_id: req.body.reference_id,
        status: 'enrolled', enrolled_at: new Date().toISOString()
    });
    res.status(201).json({ message: 'Enrolled successfully' });
});

// ==================== SOCKET.IO ====================
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication required'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
        const user = db.users.find(u => u.id === decoded.id);
        if (!user) return next(new Error('User not found'));
        socket.userId = user.id;
        next();
    } catch (err) {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id, 'User:', socket.userId);

    socket.on('join_consultation', (consultationId) => {
        const consultation = db.consultations.find(c => c.id === consultationId);
        if (consultation && (consultation.user_id === socket.userId || consultation.assigned_expert_id === socket.userId)) {
            socket.join(`consultation_${consultationId}`);
            console.log(`Socket ${socket.id} joined consultation ${consultationId}`);
        } else {
            socket.emit('error', 'Unauthorized to join this consultation');
        }
    });

    socket.on('leave_consultation', (consultationId) => {
        socket.leave(`consultation_${consultationId}`);
    });

    socket.on('typing', (data) => {
        socket.to(`consultation_${data.consultationId}`).emit('user_typing', {
            userId: socket.userId,
            typing: data.typing
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, saving data...');
    await dbManager.save();
    server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, saving data...');
    await dbManager.save();
    server.close(() => process.exit(0));
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;

seedDatabase().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 API available at http://localhost:${PORT}/api`);
        console.log(`🔐 Default credentials: ${process.env.ADMIN_EMAIL || 'admin@platform.com'} / ${process.env.ADMIN_PASSWORD || 'admin123'}`);
        console.log(`💾 Data persistence: ${DATA_FILE}`);
    });
}).catch(console.error);