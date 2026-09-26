CREATE DATABASE IF NOT EXISTS experthub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE experthub;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(40),
  role ENUM('admin','expert','learner') NOT NULL DEFAULT 'learner',
  status ENUM('pending','active','suspended','rejected') NOT NULL DEFAULT 'pending',
  avatar VARCHAR(255),
  bio TEXT,
  specialization VARCHAR(160),
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_earnings DECIMAL(12,2) DEFAULT 0,
  wallet_balance DECIMAL(12,2) DEFAULT 0,
  timezone VARCHAR(60) DEFAULT 'UTC',
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  twofa_enabled TINYINT(1) DEFAULT 0,
  twofa_secret VARCHAR(64),
  last_login_at TIMESTAMP NULL,
  rejected_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_role_status (role, status),
  INDEX idx_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(120) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id INT PRIMARY KEY,
  email_notifications TINYINT(1) DEFAULT 1,
  push_notifications TINYINT(1) DEFAULT 1,
  marketing TINYINT(1) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS consultations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  expert_id INT,
  title VARCHAR(200),
  description TEXT,
  consultation_type VARCHAR(40),
  status ENUM('pending','assigned','in_progress','completed','cancelled','disputed') DEFAULT 'pending',
  priority ENUM('low','normal','high','urgent') DEFAULT 'normal',
  expert_fee DECIMAL(10,2) DEFAULT 0,
  scheduled_at TIMESTAMP NULL,
  meeting_url VARCHAR(255),
  rating INT DEFAULT NULL,
  review_comment TEXT,
  closed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_expert (expert_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  consultation_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT,
  attachment_url VARCHAR(255),
  attachment_type VARCHAR(60),
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_consultation (consultation_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(60) DEFAULT 'General',
  expert_id INT,
  date DATE,
  start_time TIME,
  end_time TIME,
  location VARCHAR(200),
  meeting_url VARCHAR(255),
  capacity INT DEFAULT 100,
  price DECIMAL(10,2) DEFAULT 0,
  expert_payment DECIMAL(10,2) DEFAULT 0,
  status ENUM('draft','published','cancelled','completed') DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('registered','attended','cancelled') DEFAULT 'registered',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_event_user (event_id, user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(60),
  course_type ENUM('bootcamp','short_course','tuition','exam_prep','career') DEFAULT 'short_course',
  level ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
  expert_id INT,
  price DECIMAL(10,2) DEFAULT 0,
  duration_weeks INT DEFAULT 0,
  duration_hours INT DEFAULT 0,
  total_lessons INT DEFAULT 0,
  thumbnail VARCHAR(255),
  status ENUM('draft','published','archived') DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(200),
  content TEXT,
  video_url VARCHAR(255),
  position INT DEFAULT 1,
  duration_minutes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT,
  enrollment_type VARCHAR(40),
  reference_id INT,
  title VARCHAR(200),
  progress INT DEFAULT 0,
  completed_lessons TEXT,
  status ENUM('active','completed','dropped') DEFAULT 'active',
  certificate_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_title VARCHAR(200),
  serial VARCHAR(40) UNIQUE,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_hash VARCHAR(120)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expert_id INT NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '0=Sun..6=Sat',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(60) DEFAULT 'UTC',
  active TINYINT(1) DEFAULT 1,
  UNIQUE KEY uniq_expert_day (expert_id, day_of_week)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS time_off (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expert_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255),
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expert_id INT NOT NULL,
  author_id INT NOT NULL,
  consultation_id INT,
  rating INT NOT NULL,
  comment TEXT,
  status ENUM('pending','published','hidden') DEFAULT 'published',
  reply TEXT,
  replied_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expert (expert_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  discount_type ENUM('percent','fixed') DEFAULT 'percent',
  discount_value DECIMAL(10,2) DEFAULT 0,
  max_uses INT DEFAULT NULL,
  used_count INT DEFAULT 0,
  min_spend DECIMAL(10,2) DEFAULT 0,
  applies_to ENUM('all','course','bootcamp','event','consultation') DEFAULT 'all',
  active TINYINT(1) DEFAULT 1,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  reference VARCHAR(60) UNIQUE,
  description VARCHAR(255),
  amount DECIMAL(12,2),
  fee DECIMAL(12,2) DEFAULT 0,
  provider VARCHAR(40),
  provider_ref VARCHAR(120),
  status ENUM('pending','succeeded','failed','refunded') DEFAULT 'pending',
  direction ENUM('in','out') DEFAULT 'in',
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  reason VARCHAR(120),
  reference VARCHAR(60),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expert_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method ENUM('bank_transfer','mobile_money','paypal','stripe') DEFAULT 'bank_transfer',
  account_details TEXT,
  status ENUM('pending','processing','approved','rejected','paid') DEFAULT 'pending',
  rejection_reason VARCHAR(255),
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expert (expert_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  consultation_id INT,
  claim_type VARCHAR(40),
  claim_title VARCHAR(200),
  claim_description TEXT,
  claim_amount DECIMAL(12,2),
  status ENUM('open','investigating','resolved','rejected') DEFAULT 'open',
  resolution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reference VARCHAR(40) UNIQUE,
  subject VARCHAR(200),
  description TEXT,
  priority ENUM('low','normal','high','urgent') DEFAULT 'normal',
  category VARCHAR(60),
  status ENUM('open','pending','resolved','closed') DEFAULT 'open',
  assigned_to INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticket_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  title VARCHAR(200),
  message TEXT,
  type VARCHAR(40) DEFAULT 'info',
  link VARCHAR(255),
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_read (is_read)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_id INT,
  action VARCHAR(120),
  target VARCHAR(120),
  target_id INT,
  meta TEXT,
  ip VARCHAR(60),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_actor (actor_id),
  INDEX idx_action (action)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

/* Default settings */
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
('platform_name', 'ExpertHub'),
('support_email', 'support@experthub.com'),
('default_currency', 'USD'),
('default_timezone', 'UTC'),
('commission_consultation', '20'),
('commission_course', '20'),
('withdrawal_hold_days', '7'),
('min_payout', '50');
