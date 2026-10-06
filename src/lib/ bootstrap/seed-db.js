/* ============================================================
   Seed demo data into MySQL when tables are empty
   Mirrors src/lib/demo-store.js but writes to real tables.
   ============================================================ */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { poolOrThrow } = require('../lib/db');

async function seedDemoData() {
  const pool = poolOrThrow();
  const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM users');
  if (c > 0) return;

  const users = [
    { name: 'System Admin',     email: 'admin@platform.com',   pwd: 'admin123',   role: 'admin',   status: 'active', spec: 'Platform Operations', rate: 0  },
    { name: 'Dr. Sarah Kimani', email: 'expert@platform.com',  pwd: 'expert123',  role: 'expert',  status: 'active', spec: 'Data Science & AI',   rate: 75 },
    { name: 'John Mwangi',      email: 'learner@platform.com', pwd: 'learner123', role: 'learner', status: 'active', spec: null,                  rate: 0  },
    { name: 'Aisha Bello',      email: 'aisha@platform.com',   pwd: 'expert123',  role: 'expert',  status: 'active', spec: 'Business Strategy',   rate: 90 },
    { name: 'Kwame Mensah',     email: 'kwame@platform.com',   pwd: 'expert123',  role: 'expert',  status: 'active', spec: 'Full-Stack Dev',      rate: 80 },
    { name: 'Grace Ochieng',    email: 'grace@platform.com',   pwd: 'expert123',  role: 'expert',  status: 'active', spec: 'UX Design',           rate: 65 },
    { name: 'Pending Expert',   email: 'pending@platform.com', pwd: 'expert123',  role: 'expert',  status: 'pending', spec: 'Marketing',          rate: 55 },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.pwd, 10);
    const [r] = await pool.query(
      `INSERT INTO users (name,email,password_hash,role,status,specialization,hourly_rate,average_rating,total_earnings,wallet_balance,intent)
       VALUES (?,?,?,?,?,?,?,?,?,?, 'both')`,
      [u.name, u.email, hash, u.role, u.status, u.spec, u.rate,
       u.role === 'expert' ? 4.7 : 0,
       u.role === 'expert' ? 1250 : 0,
       u.role === 'expert' ? 320 : 0]
    );
    await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [r.insertId]);
  }

  /* Institution demo */
  try {
    const [inst] = await pool.query(
      `INSERT INTO institutions (name,type,industry,contact_email,contact_phone,address,status,default_capacity,pass_mark,primary_color,accent_color)
       VALUES ('Acme Academy','corporate','Banking & Fintech','ops@acme.com','+254 700 000 000','Nairobi, Kenya','active',30,70,'#1e3a8a','#059669')`
    );
    const instId = inst.insertId;

    const opsHash = await bcrypt.hash('ops123', 10);
    const [ops] = await pool.query(
      `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role,intent)
       VALUES ('Olivia Ops','ops@acme.com',?,'institution','active',?, 'operations_manager','both')`,
      [opsHash, instId]
    );
    await pool.query('INSERT INTO notification_prefs (user_id) VALUES (?)', [ops.insertId]);
    await pool.query(
      `UPDATE institutions SET ops_manager_id=?, ops_manager_name='Olivia Ops', ops_manager_email='ops@acme.com' WHERE id=?`,
      [ops.insertId, instId]
    );

    const coordHash = await bcrypt.hash('coord123', 10);
    await pool.query(
      `INSERT INTO users (name,email,password_hash,role,status,institution_id,institution_role,intent)
       VALUES ('Chris Coordinator','coord@acme.com',?,'institution','active',?, 'coordinator','both')`,
      [coordHash, instId]
    );

    await pool.query(
      `INSERT INTO programmes (institution_id,title,description,category,status,start_date,end_date,capacity)
       VALUES (?, 'Digital Banking Foundations','Core skills for modern banking transformation.','Fintech','active',
               DATE_ADD(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 77 DAY), 30)`,
      [instId]
    );
    await pool.query(
      `INSERT INTO programmes (institution_id,title,description,category,status,start_date,end_date,capacity)
       VALUES (?, 'Leadership & Change Management','Build high-performing teams through change.','Leadership','active',
               DATE_SUB(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 56 DAY), 20)`,
      [instId]
    );

    console.log('[db] demo institution seeded (ops@acme.com / ops123)');
  } catch (e) {
    console.warn('[db] institution seed skipped:', e.message);
  }
}

module.exports = { seedDemoData };
