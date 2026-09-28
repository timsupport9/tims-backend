/* ============================================================
   ExpertHub 2.0 — SPA frontend
   Complete build: consultation + e-school + institution modules
   Portion 1 of 4: Core, Config, State, Auth, Shell
   ============================================================ */

/* ---------- CONFIG ---------- */
const CONFIG = {
  API_BASE: '',
  CURRENCY: 'USD',
  CURRENCY_SYMBOL: '$',
  PLATFORM_COMMISSION: 20,
  WITHDRAWAL_HOLD_DAYS: 7,
  MIN_PAYOUT: 50,
  PER_PAGE: 20,
  DEFAULT_AVATAR: 'https://ui-avatars.com/api/?background=1e3a8a&color=fff&name=',
  PAYMENT_PROVIDERS: ['stripe','paystack','flutterwave','paypal','demo'],
  POLL_INTERVAL: 60000,
  USER_INTENTS: ['learn','consult','both'],
  INSTITUTION_TYPES: ['corporate','university','college','ngo','government','bootcamp'],
  INSTITUTION_ROLES: ['operations_manager','coordinator','instructor','viewer'],
  ASSESSMENT_TYPES: ['quiz','exam','project','practical','peer'],
  PROGRAMME_STATUSES: ['draft','active','paused','completed','archived'],
  SESSION_MODES: ['online','in_person','hybrid'],
  LIFECYCLE_STATUSES: ['invited','pending_approval','approved','active','on_hold','completed','certified','withdrawn','waitlisted'],
  SKILL_LEVELS: ['Not Assessed','Novice','Basic','Competent','Proficient','Expert'],
  SKILL_LEVEL_COLOURS: ['#e5e7eb','#fecaca','#fde68a','#bbf7d0','#86efac','#22c55e'],
  DELIVERY_MODES: ['online','in_person','hybrid','self_paced'],
  ATTENDANCE_STATUSES: ['present','late','absent','excused'],

  /* ---------- CONSULTATION ---------- */
  CONSULTATION_STATUSES: [
    'pending_payment','pending_expert_confirmation','confirmed','scheduled',
    'in_grace','in_session','awaiting_completion','completed',
    'no_show','cancelled','expired','disputed'
  ],
  CONSULTATION_TYPES: ['video','audio','chat'],
  SESSION_DURATIONS: [15, 30, 45, 60, 90],
  REFUND_POLICY: { over24h: 100, over2h: 50, under2h: 0 },
  DISPUTE_REASONS: ['no_show','poor_quality','wrong_expertise','technical_issues','other'],
  TIP_PRESETS: [5, 10, 20, 50],
  MAX_RESCHEDULES: 2,

  /* ---------- E-SCHOOL ---------- */
  COURSE_TYPES: ['bootcamp','short_course','tuition','exam_prep','career','certification'],
  LESSON_TYPES: ['video','reading','quiz','assignment','live','code','download'],
  QUIZ_QUESTION_TYPES: ['mcq','true_false','multi_select','short_answer','essay'],
  XP_REWARDS: {
    lesson_complete: 10, quiz_pass: 25, quiz_perfect: 50,
    assignment_submit: 20, course_complete: 200, daily_streak: 5,
    forum_answer: 15, first_lesson_today: 5,
  },
  BADGES: {
    first_lesson:   { name:'First Steps',       icon:'fa-shoe-prints' },
    first_course:   { name:'Course Champion',   icon:'fa-trophy' },
    five_courses:   { name:'Learning Machine',  icon:'fa-rocket' },
    perfect_quiz:   { name:'Perfect Score',     icon:'fa-star' },
    streak_7:       { name:'Week Warrior',      icon:'fa-fire' },
    streak_30:      { name:'Month Master',      icon:'fa-crown' },
    help_10:        { name:'Helpful Hand',      icon:'fa-hands-helping' },
    night_owl:      { name:'Night Owl',         icon:'fa-moon' },
    early_bird:     { name:'Early Bird',        icon:'fa-sun' },
  },
  COURSE_REFUND_WINDOW_DAYS: 14,
  TRIAL_DURATION_HOURS: 48,

  /* ---------- INSTITUTION ---------- */
  CAMPUS_TYPES: ['main','branch','satellite','partner'],
  BUDGET_PERIODS: ['monthly','quarterly','annual'],
  PROCTOR_MODES: ['none','webcam','lockdown','ai'],
  WELLNESS_RISK_LEVELS: ['low','medium','high','critical'],
  WELLNESS_SIGNALS: [
    'login_frequency','session_attendance','assignment_timeliness',
    'forum_engagement','quiz_performance','feedback_sentiment'
  ],
  SUCCESSION_BOXES: [
    { code:'star',        label:'Star',           readiness:'ready_now',  performance:'high',   potential:'high' },
    { code:'high_pot',    label:'High Potential', readiness:'ready_soon', performance:'medium', potential:'high' },
    { code:'enigma',      label:'Enigma',         readiness:'ready_later',performance:'low',    potential:'high' },
    { code:'current_star',label:'Current Star',   readiness:'ready_now',  performance:'high',   potential:'medium' },
    { code:'core',        label:'Core Player',    readiness:'ready_later',performance:'medium', potential:'medium' },
    { code:'inconsistent',label:'Inconsistent',   readiness:'developing', performance:'low',    potential:'medium' },
    { code:'trusted',     label:'Trusted Pro',    readiness:'ready_now',  performance:'high',   potential:'low' },
    { code:'dilemma',     label:'Dilemma',        readiness:'developing', performance:'medium', potential:'low' },
    { code:'risk',        label:'At Risk',        readiness:'not_ready',  performance:'low',    potential:'low' },
  ],
  SSO_PROVIDERS: ['saml','azure_ad','google_workspace','okta','onelogin','custom_oidc'],
  WEBHOOK_EVENTS: [
    'trainee.enrolled','trainee.completed','trainee.withdrawn',
    'certificate.issued','certificate.expired','programme.started',
    'programme.completed','assessment.submitted','assessment.graded',
    'session.scheduled','session.completed','budget.threshold_reached',
    'compliance.breach','instructor.assigned','report.scheduled'
  ],
  API_SCOPES: [
    'read:trainees','write:trainees','read:programmes','write:programmes',
    'read:cohorts','write:cohorts','read:assessments','write:assessments',
    'read:certificates','issue:certificates','read:analytics','read:budgets'
  ],
  ANNOUNCEMENT_SCOPES: ['all','campus','programme','cohort','department','role'],
  ANNOUNCEMENT_PRIORITIES: ['info','important','urgent','critical'],
  REPORT_FIELD_LIBRARY: {
    trainee:    ['id','name','email','department','job_title','campus','status','progress','joined_at','last_active'],
    programme:  ['id','title','category','status','enrolled_count','capacity','avg_progress','start_date','end_date'],
    cohort:     ['id','name','programme_title','instructor_name','capacity','trainee_count','start_date','end_date','status'],
    assessment: ['id','title','type','cohort_name','weight','due_date','submissions','avg_score','pass_rate'],
    certificate:['serial','trainee_name','programme_title','issued_at','expires_at','cpd_points','status'],
    budget:     ['department','allocated','spent','remaining','utilization_pct','period'],
    instructor: ['name','specialization','programmes','sessions','avg_rating','utilization_pct'],
  },
};

/* ---------- GLOBAL STATE ---------- */
let socket = null;
let authToken = null;
let refreshToken = null;
let currentUser = null;
let currentUserRole = null;
let appPhase = 'landing';
let activeTab = 'dashboard';
let activeESchoolTab = 'courses';
let activeInstTab = 'overview';
let currentChatId = null;
let chatTypingTimer = null;
let pollTimer = null;
let notificationsPanelOpen = false;
let selectedRows = {
  users: new Set(),
  trainees: new Set(),
  certificates: new Set(),
  programmes: new Set(),
  cohorts: new Set(),
  campuses: new Set(),
};

const S = {
  /* Core */
  users: [], experts: [], events: [], consultations: [], courses: [], notifications: [],
  reviews: [], transactions: [], payouts: [], enrollments: [], auditLogs: [], claims: [],
  tickets: [], coupons: [], certificates: [], wallet: { balance: 0, ledger: [] }, earnings: null,
  analytics: null, eventRegistrations: [], availability: [], timeOff: [], chatMessages: {},
  expertStats: null, expertPortfolio: [],

  page: {
    users: 1, experts: 1, courses: 1, consultations: 1, transactions: 1,
    institutionTrainees: 1, institutionEnrollments: 1, institutionCertificates: 1,
    institutionSessions: 1, institutionProgrammes: 1, institutionCohorts: 1,
  },

  institutions: [],

  programmes: [], cohorts: [], assessments: [], projects: [],
  trainees: [], instructors: [], myInstitution: null, institutionStats: null,
  institutionTeam: [], institutionEnrollments: [], institutionSessions: [],
  institutionCertificates: [], institutionSkills: [],
  institutionSkillsMatrix: { skills: [], matrix: [] },
  institutionApprovals: [], institutionBranding: null, institutionImports: [],
  institutionOrgUnits: [], institutionLearningPaths: [],
  institutionQuestions: [], institutionMaterials: [],
  institutionComplianceRules: [], institutionReportTemplates: [],
  institutionScheduledReports: [], institutionTraineeTotal: 0, institutionEnrollmentTotal: 0,

  userIntent: 'both',

  /* ---------- CONSULTATION EXTENSIONS ---------- */
  consultationSlots: [], consultationPackages: [], consultationTiers: [],
  consultationEscrow: {}, consultationDisputes: [], consultationFollowups: [],
  consultationRecordings: {}, expertQuestions: [], userShortlist: [], userPackages: [],
  expertConsultationAnalytics: null, adminConsultationAnalytics: null,
  expertPublicProfile: null, consultationMatchResults: [],
  instantConsultationExpert: null, corporateBudgets: [], consultationReviews: [],
  consultationReminders: [], consultationAttendees: [],

  /* ---------- E-SCHOOL EXTENSIONS ---------- */
  courseCurriculum: {}, currentLesson: null, currentLessonProgress: null,
  currentQuiz: null, currentQuizAttempts: [], currentAssignment: null,
  currentAssignmentSubmission: null, lessonNotes: [], courseDiscussions: [],
  coursePaths: [], currentCoursePath: null, courseBundles: [],
  userXP: null, userBadges: [], userStreak: null, userLevel: null,
  availableTrials: [], userRefunds: [], lessonQuestions: [],
  recentWatchHistory: [], studyPartners: [], courseReviews: [],
  enrolledCourseIds: new Set(), wishlistIds: new Set(),
  courseAnalytics: null, courseCertificates: [],

  /* ---------- INSTITUTION EXTENSIONS ---------- */
  campuses: [], activeCampusId: null,
  budgetAllocations: [], budgetTransactions: [],
  examProctorSessions: [], examProctorFlags: [],
  instructorMarketplace: [], instructorContracts: [],
  wellnessScores: [], wellnessAlerts: [],
  successionMatrix: { boxes: [], trainees: [], assignments: [] },
  ssoConfiguration: null,
  apiKeys: [], webhooks: [], announcements: [],
  reportBuilderDrafts: [], savedReportDefinitions: [],
  institutionAnalytics: null, skillsGapAnalysis: null, complianceRuns: [],
  blockchainCerts: [], announcementReads: [], apiCallLogs: [],
};

/* ---------- UTILS ---------- */
const $  = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
const esc = s => (s===null||s===undefined) ? '' : String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const fmtCur = (n, cur=CONFIG.CURRENCY) => {
  try { return new Intl.NumberFormat('en-US',{style:'currency',currency:cur,maximumFractionDigits:2}).format(Number(n)||0); }
  catch { return `${CONFIG.CURRENCY_SYMBOL}${(Number(n)||0).toFixed(2)}`; }
};
const fmtDate = d => { if (!d) return '—'; const x = new Date(d); return isNaN(x)?'—':x.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); };
const fmtDT   = d => { if (!d) return '—'; return new Date(d).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); };
const timeAgo = d => {
  if (!d) return '';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  if (s < 604800) return Math.floor(s/86400) + 'd ago';
  return fmtDate(d);
};
const avatar = u => u?.avatar || (CONFIG.DEFAULT_AVATAR + encodeURIComponent(u?.name || u?.email || 'User'));
const statusClass = s => `status status-${String(s||'unknown').toLowerCase().replace(/\s+/g,'_')}`;
const uid = () => Math.random().toString(36).slice(2,10);
const debounce = (fn, ms=350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const pct = n => `${Math.max(0, Math.min(100, Number(n)||0))}%`;

function downloadCsv(filename, rows) {
  if (!rows || !rows.length) return showToast('Nothing to export', 'warning');
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')].concat(
    rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(','))
  ).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function hexToRgba(hex, alpha) {
  const h = String(hex || '#1e3a8a').replace('#','');
  const full = h.length === 3 ? h.split('').map(c => c+c).join('') : h;
  const r = parseInt(full.slice(0,2), 16);
  const g = parseInt(full.slice(2,4), 16);
  const b = parseInt(full.slice(4,6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatBytes(b) {
  if (!b) return '0 B';
  const units = ['B','KB','MB','GB'];
  let i = 0;
  while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/* ---------- CONSULTATION UTILS ---------- */
function fmtInTz(date, tz = 'UTC', opts = {}) {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz, month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', ...opts,
    }).format(new Date(date));
  } catch { return fmtDT(date); }
}

function slotLabel(slot) {
  return `${fmtInTz(slot.start_time)} – ${fmtInTz(slot.end_time, 'UTC', { hour: '2-digit', minute: '2-digit' })}`;
}

function timeUntil(date) {
  if (!date) return '';
  const ms = new Date(date) - Date.now();
  if (ms < 0) return 'now';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

function consultationStatusClass(s) {
  const map = {
    pending_payment: 'status-pending',
    pending_expert_confirmation: 'status-pending',
    confirmed: 'status-active',
    scheduled: 'status-info',
    in_grace: 'status-warning',
    in_session: 'status-active',
    awaiting_completion: 'status-info',
    completed: 'status-active',
    no_show: 'status-rejected',
    cancelled: 'status-cancelled',
    expired: 'status-archived',
    disputed: 'status-rejected',
  };
  return map[s] || 'status-pending';
}

function refundPreview(scheduledAt) {
  if (!scheduledAt) return { pct: 100, label: 'Full refund available' };
  const hours = (new Date(scheduledAt) - Date.now()) / 3600000;
  if (hours > 24) return { pct: 100, label: 'More than 24h notice — full refund' };
  if (hours > 2) return { pct: 50, label: '2–24h notice — 50% refund' };
  return { pct: 0, label: 'Less than 2h notice — no refund' };
}

/* ---------- E-SCHOOL UTILS ---------- */
function xpForLevel(level) { return Math.pow(level - 1, 2) * 100; }
function levelFromXP(xp) { return Math.max(1, Math.floor(Math.sqrt((Number(xp)||0) / 100)) + 1); }
function xpProgressPercent(xp) {
  const level = levelFromXP(xp);
  const prev = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return Math.round(((xp - prev) / (next - prev)) * 100);
}

function lessonIcon(type) {
  return {
    video: 'fa-play-circle',
    reading: 'fa-book-open',
    quiz: 'fa-question-circle',
    assignment: 'fa-file-signature',
    live: 'fa-video',
    code: 'fa-code',
    download: 'fa-download',
  }[type] || 'fa-circle';
}

function lessonStatusLabel(status) {
  return {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    completed: 'Completed',
    skipped: 'Skipped',
  }[status] || status;
}

function timeAgoOrDate(d) { return timeAgo(d); }

function badgeIconFor(code) {
  const b = CONFIG.BADGES[code];
  return b ? b.icon : 'fa-medal';
}
function badgeNameFor(code) {
  const b = CONFIG.BADGES[code];
  return b ? b.name : code;
}

/* ---------- INSTITUTION UTILS ---------- */
function pctOf(value, total) {
  if (!total) return 0;
  return Math.round((Number(value) / Number(total)) * 100);
}

function campusLabel(id) {
  const c = (S.campuses || []).find(x => x.id === id);
  return c ? c.name : '—';
}

function riskLevelColour(level) {
  return { low:'#22c55e', medium:'#eab308', high:'#f97316', critical:'#dc2626' }[level] || '#94a3b8';
}

function budgetUtilClass(pct) {
  if (pct >= 95) return 'budget-critical';
  if (pct >= 80) return 'budget-warning';
  if (pct >= 50) return 'budget-ok';
  return 'budget-low';
}

function examIntegrityLabel(score) {
  if (score == null) return 'Not Scored';
  if (score >= 90) return 'Clean';
  if (score >= 70) return 'Minor Flags';
  if (score >= 50) return 'Review Needed';
  return 'Invalidated';
}

function renderMiniBar(pct, colour) {
  return `
    <div class="mini-bar">
      <span style="width:${Math.max(0, Math.min(100, pct))}%;background:${colour || 'var(--brand)'}"></span>
    </div>`;
}

function truncateHash(hash, chars = 12) {
  if (!hash) return '—';
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}…${hash.slice(-chars)}`;
}

/* ---------- THEME ---------- */
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.classList.toggle('dark', saved === 'dark');
}
function toggleTheme() {
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}

/* ---------- TOAST / LOADING / MODAL ---------- */
function showToast(msg, type='info', timeout=3400) {
  const c = $('#toast-container');
  if (!c) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const icon = { success:'check-circle', error:'times-circle', warning:'exclamation-triangle', info:'bell' }[type] || 'bell';
  el.innerHTML = `<i class="fas fa-${icon} toast-icon"></i><span class="toast-message">${esc(msg)}</span>`;
  c.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}
function showLoading(show) {
  let l = $('#globalLoader');
  if (show && !l) {
    l = document.createElement('div');
    l.id = 'globalLoader';
    l.className = 'loading-overlay';
    l.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(l);
  } else if (!show && l) l.remove();
}
function openModal({ title, body, footer, className='' }) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-overlay" id="modalBackdrop">
      <div class="modal-content ${className}" role="dialog">
        <header class="modal-header">
          <h3 class="modal-title">${esc(title||'')}</h3>
          <button class="modal-close" data-close-modal>&times;</button>
        </header>
        <section class="modal-body">${body||''}</section>
        ${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}
      </div>
    </div>`;
  $('#modalBackdrop').addEventListener('click', e => { if (e.target.id === 'modalBackdrop') closeModal(); });
  root.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
}
function closeModal() { $('#modal-root').innerHTML = ''; }
async function confirmDialog(msg, title='Confirm') {
  return new Promise(resolve => {
    openModal({
      title,
      body: `<p>${esc(msg)}</p>`,
      footer: `<button id="cfmNo" class="btn btn-secondary">Cancel</button><button id="cfmYes" class="btn btn-danger">Confirm</button>`,
    });
    $('#cfmYes').onclick = () => { closeModal(); resolve(true); };
    $('#cfmNo').onclick  = () => { closeModal(); resolve(false); };
  });
}

/* ---------- API ---------- */
async function apiCall(endpoint, method='GET', body=null, isFormData=false, _retry=false) {
  const headers = {};
  if (!isFormData && body !== null) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const options = { method, headers };
  if (body !== null) options.body = isFormData ? body : JSON.stringify(body);

  const res = await fetch(`${CONFIG.API_BASE}${endpoint}`, options);

  if (res.status === 401 && !_retry && refreshToken) {
    try {
      const r = await fetch(`${CONFIG.API_BASE}/api/auth/refresh`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ refresh: refreshToken }),
      });
      if (r.ok) {
        const d = await r.json();
        authToken = d.token;
        localStorage.setItem('token', authToken);
        return apiCall(endpoint, method, body, isFormData, true);
      }
    } catch (_) {}
    return logout();
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error || j.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ---------- SOCKET ---------- */
function initializeSocket() {
  if (socket) socket.disconnect();
  if (!authToken || typeof io === 'undefined') return;
  socket = io({ auth: { token: authToken } });
  socket.on('connect', () => console.log('[socket] connected'));
  socket.on('disconnect', () => console.log('[socket] disconnected'));
  socket.on('notification', n => {
    S.notifications.unshift(n);
    showToast(n.title || 'New notification', 'info');
    updateNotificationBadge();
    if (notificationsPanelOpen) renderNotificationsPanel();
  });
  socket.on('broadcast', b => showToast(`${b.title}: ${b.message}`, 'info', 6000));
  socket.on('new_message', msg => {
    const cid = msg.consultation_id;
    if (!S.chatMessages[cid]) S.chatMessages[cid] = [];
    S.chatMessages[cid].push(msg);
    if (currentChatId === cid) renderChatMessages(cid);
  });
  socket.on('typing', ({ consultation_id, user_id, is_typing }) => {
    if (currentChatId !== consultation_id) return;
    const el = $('#chat-typing');
    if (!el) return;
    el.textContent = (is_typing && user_id !== currentUser?.id) ? 'typing...' : '';
  });
  socket.on('presence', () => {});
  socket.on('institution:approval', d => {
    showToast(`New approval request: ${d.title}`, 'info');
    loadAllData().then(rerenderRoleContent);
  });
  socket.on('institution:assessment_due', d => {
    showToast(`Assessment due: ${d.title}`, 'warning', 6000);
  });
  socket.on('institution:certificate_expiring', d => {
    showToast(`Certificate expiring soon: ${d.serial}`, 'warning', 6000);
  });
  socket.on('consultation:reminder', d => {
    showToast(d.message || 'Session reminder', 'info', 6000);
  });
  socket.on('consultation:escrow_released', d => {
    showToast(`Escrow released: ${fmtCur(d.amount)}`, 'success');
    loadAllData().then(rerenderRoleContent);
  });
  socket.on('enrollment:certificate_issued', d => {
    showToast(`Certificate ready: ${d.course_title}`, 'success');
    loadAllData().then(rerenderRoleContent);
  });
  socket.on('wellness:alert', d => {
    showToast(`Wellness alert: ${d.trainee_name}`, 'warning', 6000);
  });
}

/* ---------- AUTH ---------- */
async function login(email, password) {
  const data = await apiCall('/api/auth/login', 'POST', { email, password });
  authToken = data.token;
  refreshToken = data.refresh;
  currentUser = data.user;
  currentUserRole = data.user.role;
  S.userIntent = data.user.intent || 'both';
  localStorage.setItem('token', authToken);
  localStorage.setItem('refresh', refreshToken);
  localStorage.setItem('user', JSON.stringify(currentUser));

  if (data.user.theme) {
    document.documentElement.classList.toggle('dark', data.user.theme === 'dark');
  }

  if (data.user.role === 'institution') {
    try {
      const b = await apiCall('/api/institution/branding');
      if (b && b.branding) {
        if (b.branding.primary_color) {
          document.documentElement.style.setProperty('--brand', b.branding.primary_color);
        }
        if (b.branding.accent_color) {
          document.documentElement.style.setProperty('--accent', b.branding.accent_color);
        }
      }
    } catch (_) {}
  }

  initializeSocket();
  await loadAllData();
  appPhase = 'dashboard';
  activeTab = 'dashboard';
  location.hash = currentUserRole === 'institution' ? '#/institution/dashboard' : '#/dashboard';
  renderDashboard();
  showToast(`Welcome back, ${currentUser.name}!`, 'success');
  startPolling();
}

async function register(payload) {
  const data = await apiCall('/api/auth/register', 'POST', payload);
  showToast(data.message || 'Registration submitted', 'success');
  return data;
}

async function logout() {
  try { await apiCall('/api/auth/logout', 'POST', { refresh: refreshToken }); } catch (_) {}
  if (socket) socket.disconnect();
  socket = null;
  authToken = null;
  refreshToken = null;
  currentUser = null;
  currentUserRole = null;
  S.userIntent = 'both';
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
  localStorage.removeItem('user');
  stopPolling();
  appPhase = 'landing';
  location.hash = '#/';
  renderLanding();
}

/* ============================================================
   DATA LOADERS
   ============================================================ */
async function loadAllData() {
  const tasks = [
    apiCall('/api/common/notifications').then(d => { S.notifications = d.notifications || []; }).catch(() => {}),
    apiCall('/api/common/events').then(d => { S.events = d.events || []; }).catch(() => {}),
    apiCall('/api/common/consultations').then(d => { S.consultations = d.consultations || []; }).catch(() => {}),
    apiCall('/api/eschool/courses').then(d => { S.courses = d.courses || []; }).catch(() => {}),
  ];

  if (currentUserRole === 'admin') {
    tasks.push(apiCall('/api/admin/users').then(d => { S.users = d.users || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/experts').then(d => { S.experts = d.experts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/analytics').then(d => { S.analytics = d; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/transactions').then(d => { S.transactions = d.transactions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/payouts').then(d => { S.payouts = d.payouts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/coupons').then(d => { S.coupons = d.coupons || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/claims').then(d => { S.claims = d.claims || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/tickets').then(d => { S.tickets = d.tickets || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/reviews').then(d => { S.reviews = d.reviews || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/audit-logs').then(d => { S.auditLogs = d.logs || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/institutions').then(d => { S.institutions = d.institutions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/disputes').then(d => { S.consultationDisputes = d.disputes || []; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/consultation-analytics').then(d => { S.adminConsultationAnalytics = d; }).catch(() => {}));
    tasks.push(apiCall('/api/admin/refunds').then(d => { S.userRefunds = d.refunds || []; }).catch(() => {}));
  } else if (currentUserRole === 'expert') {
    tasks.push(apiCall('/api/expert/earnings').then(d => { S.earnings = d.summary; S.wallet.ledger = d.ledger || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/reviews').then(d => { S.reviews = d.reviews || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/withdrawals').then(d => { S.payouts = d.payouts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/availability').then(d => { S.availability = d.availability || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/time-off').then(d => { S.timeOff = d.timeOff || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/dashboard-stats').then(d => { S.expertStats = d.stats; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/portfolio').then(d => { S.expertPortfolio = d.items || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/consultation-analytics').then(d => { S.expertConsultationAnalytics = d; }).catch(() => {}));
    tasks.push(apiCall('/api/experts/me/slots').then(d => { S.consultationSlots = d.slots || []; }).catch(() => {}));
    tasks.push(apiCall('/api/experts/me/tiers').then(d => { S.consultationTiers = d.tiers || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/course-analytics').then(d => { S.courseAnalytics = d; }).catch(() => {}));
  } else if (currentUserRole === 'institution') {
    /* Base institution data */
    tasks.push(apiCall('/api/institution/me').then(d => { S.myInstitution = d.institution; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/stats').then(d => { S.institutionStats = d.stats; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/branding').then(d => { S.institutionBranding = d.branding; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/programmes').then(d => { S.programmes = d.programmes || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/cohorts').then(d => { S.cohorts = d.cohorts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/trainees?per=100').then(d => {
      S.trainees = d.trainees || [];
      S.institutionTraineeTotal = d.total || S.trainees.length;
    }).catch(() => {}));
    tasks.push(apiCall('/api/institution/instructors').then(d => { S.instructors = d.instructors || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/enrollments?per=100').then(d => {
      S.institutionEnrollments = d.enrollments || [];
      S.institutionEnrollmentTotal = d.total || S.institutionEnrollments.length;
    }).catch(() => {}));
    tasks.push(apiCall('/api/institution/sessions').then(d => { S.institutionSessions = d.sessions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/certificates').then(d => { S.institutionCertificates = d.certificates || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/skills').then(d => { S.institutionSkills = d.skills || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/skills/matrix').then(d => { S.institutionSkillsMatrix = d || { skills: [], matrix: [] }; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/approvals').then(d => { S.institutionApprovals = d.approvals || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/assessments').then(d => { S.assessments = d.assessments || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/projects').then(d => { S.projects = d.projects || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/org-units').then(d => { S.institutionOrgUnits = d.units || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/learning-paths').then(d => { S.institutionLearningPaths = d.paths || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/question-bank').then(d => { S.institutionQuestions = d.questions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/materials').then(d => { S.institutionMaterials = d.materials || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/compliance-rules').then(d => { S.institutionComplianceRules = d.rules || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/report-templates').then(d => { S.institutionReportTemplates = d.templates || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/scheduled-reports').then(d => { S.institutionScheduledReports = d.reports || []; }).catch(() => {}));

    /* Institution extensions */
    tasks.push(apiCall('/api/institution/analytics').then(d => { S.institutionAnalytics = d; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/campuses').then(d => { S.campuses = d.campuses || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/budgets').then(d => { S.budgetAllocations = d.budgets || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/budget-transactions').then(d => { S.budgetTransactions = d.transactions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/instructor-marketplace').then(d => { S.instructorMarketplace = d.instructors || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/instructor-contracts').then(d => { S.instructorContracts = d.contracts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/wellness').then(d => { S.wellnessScores = d.scores || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/wellness-alerts').then(d => { S.wellnessAlerts = d.alerts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/succession').then(d => { S.successionMatrix = d || { boxes: [], trainees: [], assignments: [] }; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/sso').then(d => { S.ssoConfiguration = d.config; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/api-keys').then(d => { S.apiKeys = d.keys || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/webhooks').then(d => { S.webhooks = d.webhooks || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/announcements').then(d => { S.announcements = d.announcements || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/report-definitions').then(d => { S.savedReportDefinitions = d.definitions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/skills-gap').then(d => { S.skillsGapAnalysis = d; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/compliance-runs').then(d => { S.complianceRuns = d.runs || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/exam-proctor-sessions').then(d => { S.examProctorSessions = d.sessions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/institution/blockchain-certs').then(d => { S.blockchainCerts = d.certificates || []; }).catch(() => {}));

    if (currentUser?.institution_role === 'operations_manager') {
      tasks.push(apiCall('/api/institution/team').then(d => { S.institutionTeam = d.team || []; }).catch(() => {}));
    }
  } else {
    /* Learner */
    tasks.push(apiCall('/api/user/experts').then(d => { S.experts = d.experts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/enrollments').then(d => { S.enrollments = d.enrollments || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/wallet').then(d => {
      S.wallet.balance = d.balance;
      S.wallet.ledger = d.ledger || [];
    }).catch(() => {}));
    tasks.push(apiCall('/api/user/transactions').then(d => { S.transactions = d.transactions || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/claims').then(d => { S.claims = d.claims || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/tickets').then(d => { S.tickets = d.tickets || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/certificates').then(d => { S.certificates = d.certificates || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/preferences').then(d => { S.userIntent = d.intent || S.userIntent; }).catch(() => {}));

    /* Consultation extensions */
    tasks.push(apiCall('/api/user/shortlist').then(d => { S.userShortlist = d.shortlist || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/packages').then(d => { S.userPackages = d.packages || []; }).catch(() => {}));

    /* E-School extensions */
    tasks.push(apiCall('/api/user/wishlist').then(d => {
      S.wishlist = d.items || [];
      S.wishlistIds = new Set((d.items || []).map(w => String(w.course_id)));
    }).catch(() => {}));
    tasks.push(apiCall('/api/user/xp').then(d => {
      S.userXP = d.xp || 0;
      S.userLevel = d.level || 1;
      S.userStreak = { current: d.current_streak || 0, longest: d.longest_streak || 0 };
    }).catch(() => {}));
    tasks.push(apiCall('/api/user/badges').then(d => { S.userBadges = d.badges || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/learning-paths').then(d => { S.coursePaths = d.paths || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/bundles').then(d => { S.courseBundles = d.bundles || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/refunds').then(d => { S.userRefunds = d.refunds || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/watch-history').then(d => { S.recentWatchHistory = d.history || []; }).catch(() => {}));
    tasks.push(apiCall('/api/user/course-reviews').then(d => { S.courseReviews = d.reviews || []; }).catch(() => {}));

    S.enrolledCourseIds = new Set((S.enrollments || []).map(e => String(e.course_id)));
  }

  await Promise.allSettled(tasks);

  if (currentUserRole === 'learner' || currentUserRole === 'expert' || currentUserRole === 'admin') {
    S.enrolledCourseIds = new Set((S.enrollments || []).map(e => String(e.course_id)));
  }
}

async function reloadUsers()            { try { const d = await apiCall('/api/admin/users');          S.users = d.users || []; } catch (_) {} }
async function reloadExperts()          { try { const d = await apiCall('/api/admin/experts');        S.experts = d.experts || []; } catch (_) {} }
async function reloadConsultations()    { try { const d = await apiCall('/api/common/consultations'); S.consultations = d.consultations || []; } catch (_) {} }
async function reloadNotifications()    { try { const d = await apiCall('/api/common/notifications'); S.notifications = d.notifications || []; } catch (_) {} }
async function reloadWallet()           { try { const d = await apiCall('/api/user/wallet');          S.wallet.balance = d.balance; S.wallet.ledger = d.ledger || []; } catch (_) {} }
async function reloadEarnings()         { try { const d = await apiCall('/api/expert/earnings');      S.earnings = d.summary; S.wallet.ledger = d.ledger || []; } catch (_) {} }
async function reloadInstitutionProgrammes() { try { const d = await apiCall('/api/institution/programmes'); S.programmes = d.programmes || []; } catch (_) {} }
async function reloadInstitutionCohorts()    { try { const d = await apiCall('/api/institution/cohorts');    S.cohorts    = d.cohorts || []; } catch (_) {} }
async function reloadInstitutions()          { try { const d = await apiCall('/api/admin/institutions');     S.institutions = d.institutions || []; } catch (_) {} }

function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => {
    reloadNotifications().then(updateNotificationBadge);
  }, CONFIG.POLL_INTERVAL);
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
function updateNotificationBadge() {
  const b = $('#notif-badge');
  if (!b) return;
  const unread = S.notifications.filter(n => !n.is_read).length;
  b.textContent = unread;
  b.classList.toggle('hidden', unread === 0);
}

/* ---------- PAGINATION HELPER ---------- */
function paginationBar(resource, page, per, total) {
  const pages = Math.max(1, Math.ceil((total || 0) / (per || 25)));
  if (pages <= 1) return '';
  return `
    <div class="table-footer">
      <span>Page ${page} of ${pages} (${total} record${total === 1 ? '' : 's'})</span>
      <div style="display:flex;gap:6px">
        <button class="btn btn-secondary btn-xs" ${page <= 1 ? 'disabled' : ''}
                data-action="paginate" data-resource="${resource}" data-page="${page - 1}">
          <i class="fas fa-chevron-left"></i> Prev
        </button>
        <button class="btn btn-secondary btn-xs" ${page >= pages ? 'disabled' : ''}
                data-action="paginate" data-resource="${resource}" data-page="${page + 1}">
          Next <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>`;
}

/* ============================================================
   LANDING PAGE
   ============================================================ */
function renderLanding() {
  appPhase = 'landing';
  $('#app-root').innerHTML = `
    <div class="landing">
      <nav class="landing-nav">
        <div class="landing-brand">
          <div class="landing-brand-icon"><i class="fas fa-graduation-cap"></i></div>
          <span>ExpertHub</span>
        </div>
        <div class="landing-nav-actions">
          <button class="btn btn-ghost" id="navLogin"><i class="fas fa-right-to-bracket"></i> Sign in</button>
          <button class="btn btn-primary" id="navRegister"><i class="fas fa-user-plus"></i> Create account</button>
        </div>
      </nav>

      <main class="hero">
        <div>
          <span class="hero-badge"><span class="live-indicator"></span> Trusted by learners, experts and institutions</span>
          <h1 class="hero-title">Learn, consult and grow with <span class="hero-title-accent">real experts</span></h1>
          <p class="hero-subtitle">
            ExpertHub combines an E-School, bootcamps, short courses, tuition, exam prep,
            1-on-1 consultations and full corporate training in one modern platform.
          </p>
          <div class="hero-cta">
            <button class="btn btn-primary" id="heroStart"><i class="fas fa-rocket"></i> Get started free</button>
            <button class="btn btn-secondary" id="heroSignIn"><i class="fas fa-right-to-bracket"></i> I already have an account</button>
          </div>
          <div class="hero-stats">
            <div><div class="hero-stat-value">2k+</div><div class="hero-stat-label">Active learners</div></div>
            <div><div class="hero-stat-value">150+</div><div class="hero-stat-label">Verified experts</div></div>
            <div><div class="hero-stat-value">4.9 / 5</div><div class="hero-stat-label">Average rating</div></div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-card">
            <div class="hero-card-row">
              <div class="hero-card-icon"><i class="fas fa-school"></i></div>
              <div><div class="hero-card-title">E-School hub</div><div class="hero-card-desc">Bootcamps, courses, tuition and exams</div></div>
            </div>
            <div class="hero-card-row">
              <div class="hero-card-icon green"><i class="fas fa-comments"></i></div>
              <div><div class="hero-card-title">1-on-1 consultations</div><div class="hero-card-desc">Chat, audio and video calls</div></div>
            </div>
            <div class="hero-card-row">
              <div class="hero-card-icon yellow"><i class="fas fa-user-tie"></i></div>
              <div><div class="hero-card-title">Verified experts</div><div class="hero-card-desc">Approved by our admin team</div></div>
            </div>
          </div>
          <div class="hero-card">
            <div class="hero-card-row">
              <div class="hero-card-icon"><i class="fas fa-building-columns"></i></div>
              <div><div class="hero-card-title">Corporate training</div><div class="hero-card-desc">Programmes, cohorts, assessments and compliance</div></div>
            </div>
          </div>
        </div>
      </main>

      <section class="section alt">
        <h2 class="section-title">Everything you need to learn, earn and train</h2>
        <p class="section-sub">A complete platform for learners, experts, institutions and administrators.</p>
        <div class="features-grid">
          <div class="feature-card"><div class="feature-icon"><i class="fas fa-graduation-cap"></i></div><h3>Learn anything</h3><p>Bootcamps, short courses, tuition and exam prep curated by experts.</p></div>
          <div class="feature-card"><div class="feature-icon" style="background:linear-gradient(135deg,#10b981,#059669)"><i class="fas fa-user-tie"></i></div><h3>Teach and earn</h3><p>Experts get verified, manage consultations and withdraw earnings.</p></div>
          <div class="feature-card"><div class="feature-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706)"><i class="fas fa-comments"></i></div><h3>Real-time chat</h3><p>Live messaging, attachments, typing indicator and video calls.</p></div>
          <div class="feature-card"><div class="feature-icon" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9)"><i class="fas fa-building-columns"></i></div><h3>Corporate training</h3><p>Programmes, cohorts, assessments, certifications and compliance.</p></div>
          <div class="feature-card"><div class="feature-icon" style="background:linear-gradient(135deg,#ef4444,#b91c1c)"><i class="fas fa-shield-halved"></i></div><h3>Admin controlled</h3><p>Approvals, moderation, payouts and full audit logging built in.</p></div>
          <div class="feature-card"><div class="feature-icon" style="background:linear-gradient(135deg,#0ea5e9,#0369a1)"><i class="fas fa-chart-line"></i></div><h3>Deep analytics</h3><p>Track progress, scores and completion across all cohorts.</p></div>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Simple, transparent pricing</h2>
        <p class="section-sub">Choose the plan that fits your journey.</p>
        <div class="pricing-grid">
          <div class="pricing-card">
            <span class="pricing-badge">Learner</span>
            <h3 style="margin:0">Free</h3>
            <div class="pricing-price">$0<span>/mo</span></div>
            <ul class="pricing-features">
              <li><i class="fas fa-check"></i> Browse all courses</li>
              <li><i class="fas fa-check"></i> 1 free consultation per month</li>
              <li><i class="fas fa-check"></i> Community access</li>
              <li><i class="fas fa-check"></i> Progress tracking</li>
            </ul>
            <button class="btn btn-secondary btn-block" onclick="location.hash='#/register'">Get started</button>
          </div>
          <div class="pricing-card featured">
            <span class="pricing-badge">Expert</span>
            <h3 style="margin:0">Pro</h3>
            <div class="pricing-price">20%<span> commission</span></div>
            <ul class="pricing-features">
              <li><i class="fas fa-check"></i> Create unlimited courses</li>
              <li><i class="fas fa-check"></i> Accept consultations</li>
              <li><i class="fas fa-check"></i> Instant payouts (7-day hold)</li>
              <li><i class="fas fa-check"></i> Priority support</li>
            </ul>
            <button class="btn btn-primary btn-block" onclick="location.hash='#/register'">Become an expert</button>
          </div>
          <div class="pricing-card">
            <span class="pricing-badge">Enterprise</span>
            <h3 style="margin:0">Institution</h3>
            <div class="pricing-price">Let's talk</div>
            <ul class="pricing-features">
              <li><i class="fas fa-check"></i> Team accounts and ops manager</li>
              <li><i class="fas fa-check"></i> Programmes, cohorts and trainees</li>
              <li><i class="fas fa-check"></i> Assessments and capstone projects</li>
              <li><i class="fas fa-check"></i> Custom branding and SSO</li>
            </ul>
            <button class="btn btn-secondary btn-block" onclick="location.hash='#/register'">Register institution</button>
          </div>
        </div>
      </section>

      <section class="section alt">
        <h2 class="section-title">Loved by learners, experts and institutions</h2>
        <p class="section-sub">Real stories from our community.</p>
        <div class="testimonials-grid">
          <div class="testimonial">
            <p class="testimonial-text">"ExpertHub helped me switch careers in 6 months. The bootcamp was intense but amazing."</p>
            <div class="testimonial-author">
              <img class="testimonial-avatar" src="https://ui-avatars.com/api/?background=1e3a8a&color=fff&name=Jane+D" alt="" />
              <div><div class="testimonial-name">Jane D.</div><div class="testimonial-role">Software Engineer</div></div>
            </div>
          </div>
          <div class="testimonial">
            <p class="testimonial-text">"As an expert, I doubled my income in 3 months. The platform handles payments automatically."</p>
            <div class="testimonial-author">
              <img class="testimonial-avatar" src="https://ui-avatars.com/api/?background=059669&color=fff&name=Dr+S" alt="" />
              <div><div class="testimonial-name">Dr. Sarah K.</div><div class="testimonial-role">Data Science Expert</div></div>
            </div>
          </div>
          <div class="testimonial">
            <p class="testimonial-text">"We run 12 cohorts a year through ExpertHub. Trainee tracking and assessments just work."</p>
            <div class="testimonial-author">
              <img class="testimonial-avatar" src="https://ui-avatars.com/api/?background=6d28d9&color=fff&name=Acme" alt="" />
              <div><div class="testimonial-name">Acme Academy</div><div class="testimonial-role">Corporate Training</div></div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Frequently asked questions</h2>
        <p class="section-sub">Everything you need to know.</p>
        <div class="faq-list">
          ${[
            ['How does registration work?', 'Learners are approved instantly. Experts and institutions require admin approval.'],
            ['What is the platform commission?', 'We charge a flat 20% commission on all course sales and consultations.'],
            ['How long do payouts take?', 'Withdrawals have a 7-day holding period, then process within 3 to 5 business days.'],
            ['Can I switch from learner to expert?', 'Yes. Apply to become an expert from your dashboard. Our team reviews each application.'],
            ['Do you support corporate training?', 'Yes. Institutions get programmes, cohorts, assessments, projects, certifications and compliance tracking.'],
          ].map(([q, a]) => `<div class="faq-item"><div class="faq-q">${q}<i class="fas fa-chevron-down"></i></div><div class="faq-a">${a}</div></div>`).join('')}
        </div>
      </section>

      <footer class="landing-footer">
        ${new Date().getFullYear()} ExpertHub. E-School, Consultation and Corporate Training Platform.
      </footer>
    </div>`;

  $('#navLogin').onclick = $('#heroSignIn').onclick = () => { location.hash = '#/login'; };
  $('#navRegister').onclick = $('#heroStart').onclick = () => { location.hash = '#/register'; };
  $$('.faq-q').forEach(q => q.onclick = () => q.parentElement.classList.toggle('open'));
}

/* ============================================================
   AUTH SCREENS
   ============================================================ */
function renderLogin() {
  appPhase = 'login';
  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-graduation-cap"></i></div>
          <h1 class="auth-title">Expert<span class="auth-title-accent">Hub</span></h1>
          <p class="auth-subtitle">Sign in to your account</p>
          <p class="auth-status"><span class="live-indicator"></span> Secure connection</p>
        </header>
        <div id="loginError" class="alert alert-error hidden"></div>
        <form id="loginForm" class="auth-form">
          <label class="form-group">
            <span class="form-label">Email</span>
            <input id="loginEmail" type="email" required class="form-input" placeholder="you@example.com" />
          </label>
          <label class="form-group">
            <span class="form-label">Password</span>
            <div class="input-wrap">
              <input id="loginPassword" type="password" required class="form-input" placeholder="Password" />
              <button type="button" class="input-trailing" id="toggleLoginPwd"><i class="fas fa-eye"></i></button>
            </div>
          </label>
          <div class="form-row">
            <label class="checkbox-row"><input type="checkbox" id="rememberMe" checked /> Remember me</label>
            <a href="#/forgot" class="link">Forgot password?</a>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Sign in</button>
        </form>
        <p class="auth-footer">Don't have an account? <a href="#/register" class="link">Create one</a></p>
        <p class="auth-footer" style="margin-top:6px"><a href="#/" class="link"><i class="fas fa-arrow-left"></i> Back to home</a></p>
        <div class="alert alert-info" style="margin-top:18px;font-size:.8rem;flex-direction:column;align-items:flex-start;gap:6px">
          <strong>Demo accounts</strong>
          <span>admin@platform.com / admin123</span>
          <span>expert@platform.com / expert123</span>
          <span>learner@platform.com / learner123</span>
          <span>ops@acme.com / ops123 (Institution Ops Manager)</span>
        </div>
      </section>
    </main>`;

  $('#toggleLoginPwd').onclick = () => {
    const i = $('#loginPassword');
    i.type = i.type === 'password' ? 'text' : 'password';
  };
  $('#loginForm').onsubmit = async e => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const pwd = $('#loginPassword').value;
    const err = $('#loginError');
    err.classList.add('hidden');
    if (!email || !pwd) return showToast('Please fill all fields', 'error');
    try {
      showLoading(true);
      await login(email, pwd);
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('hidden');
    } finally { showLoading(false); }
  };
}

function renderRegister() {
  appPhase = 'register';
  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-user-plus"></i></div>
          <h1 class="auth-title">Create your <span class="auth-title-accent">account</span></h1>
          <p class="auth-subtitle">Learners are auto-approved. Experts and institutions need admin approval.</p>
        </header>
        <form id="registerForm" class="auth-form">
          <div class="role-picker">
            <button type="button" data-role="learner" class="role-pick role-pick-active">Learner</button>
            <button type="button" data-role="expert"  class="role-pick">Expert</button>
            <button type="button" data-role="institution" class="role-pick">Institution</button>
          </div>
          <label class="form-group"><span class="form-label">Full name</span><input id="regName" required class="form-input" placeholder="Jane Doe" /></label>
          <label class="form-group"><span class="form-label">Email</span><input id="regEmail" type="email" required class="form-input" placeholder="you@example.com" /></label>
          <label class="form-group"><span class="form-label">Phone (optional)</span><input id="regPhone" class="form-input" placeholder="+254..." /></label>
          <label class="form-group">
            <span class="form-label">Password</span>
            <input id="regPassword" type="password" required class="form-input" placeholder="Minimum 8 characters" />
            <div class="progress-bar"><span id="pwdBar"></span></div>
            <p id="pwdHint" class="form-hint"></p>
          </label>
          <label class="form-group"><span class="form-label">Confirm password</span><input id="regPassword2" type="password" required class="form-input" /></label>

          <div id="expertExtra" class="hidden" style="display:grid;gap:12px">
            <label class="form-group"><span class="form-label">Specialization</span><input id="regSpec" class="form-input" placeholder="e.g. Data Science" /></label>
            <label class="form-group"><span class="form-label">Hourly rate ($)</span><input id="regRate" type="number" class="form-input" placeholder="50" /></label>
            <label class="form-group"><span class="form-label">Short bio</span><textarea id="regBio" class="form-textarea" rows="3"></textarea></label>
          </div>

          <div id="institutionExtra" class="hidden" style="display:grid;gap:12px">
            <label class="form-group"><span class="form-label">Institution name</span><input id="regInstName" class="form-input" placeholder="Acme Corp Academy" /></label>
            <label class="form-group">
              <span class="form-label">Institution type</span>
              <select id="regInstType" class="form-select">
                ${CONFIG.INSTITUTION_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </label>
            <label class="form-group"><span class="form-label">Industry / Sector</span><input id="regInstIndustry" class="form-input" placeholder="e.g. Banking, Healthcare" /></label>
            <label class="form-group"><span class="form-label">Operations manager email</span><input id="regInstOpsEmail" class="form-input" placeholder="ops@acme.com" /></label>
          </div>

          <label class="checkbox-row"><input type="checkbox" id="regTerms" /> I agree to the Terms and Privacy Policy</label>
          <button type="submit" class="btn btn-primary btn-block">Create account</button>
        </form>
        <p class="auth-footer">Already have an account? <a href="#/login" class="link">Sign in</a></p>
        <p class="auth-footer" style="margin-top:6px"><a href="#/" class="link"><i class="fas fa-arrow-left"></i> Back to home</a></p>
      </section>
    </main>`;

  $$('.role-pick').forEach(b => b.onclick = () => {
    $$('.role-pick').forEach(x => x.classList.remove('role-pick-active'));
    b.classList.add('role-pick-active');
    const r = b.dataset.role;
    $('#expertExtra').classList.toggle('hidden', r !== 'expert');
    $('#institutionExtra').classList.toggle('hidden', r !== 'institution');
  });

  $('#regPassword').addEventListener('input', e => {
    const v = e.target.value;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    $('#pwdBar').style.width = (score * 25) + '%';
    $('#pwdHint').textContent = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score] || '';
  });

  $('#registerForm').onsubmit = async e => {
    e.preventDefault();
    const role = $('.role-pick-active')?.dataset.role || 'learner';
    const name = $('#regName').value.trim();
    const email = $('#regEmail').value.trim();
    const phone = $('#regPhone').value.trim();
    const pwd = $('#regPassword').value;
    const pwd2 = $('#regPassword2').value;
    const terms = $('#regTerms').checked;
    if (!name || !email || !pwd) return showToast('Fill required fields', 'error');
    if (pwd.length < 8) return showToast('Password must be at least 8 characters', 'error');
    if (pwd !== pwd2) return showToast('Passwords do not match', 'error');
    if (!terms) return showToast('Accept the terms to continue', 'error');

    const extra = role === 'expert'
      ? { specialization: $('#regSpec').value, hourly_rate: Number($('#regRate').value || 0), bio: $('#regBio').value }
      : role === 'institution'
      ? {
          institution_name: $('#regInstName').value,
          institution_type: $('#regInstType').value,
          industry: $('#regInstIndustry').value,
          ops_manager_email: $('#regInstOpsEmail').value,
        }
      : {};

    try {
      showLoading(true);
      await register({ name, email, password: pwd, phone, role, extra });
      if (role === 'learner') location.hash = '#/login';
      else if (role === 'institution') showToast('Institution registered. Awaiting admin verification.', 'info', 6000);
      else showToast('Awaiting admin approval before you can log in.', 'info', 6000);
    } catch (ex) {
      showToast(ex.message, 'error');
    } finally { showLoading(false); }
  };
}

function renderForgot() {
  appPhase = 'forgot';
  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-key"></i></div>
          <h2 class="auth-title">Reset your password</h2>
          <p class="auth-subtitle">We will send a reset link to your email.</p>
        </header>
        <label class="form-group"><span class="form-label">Email</span>
          <input id="fpEmail" type="email" class="form-input" placeholder="you@example.com" /></label>
        <button id="fpBtn" class="btn btn-primary btn-block" style="margin-top:14px">Send reset link</button>
        <a href="#/login" class="link link-center"><i class="fas fa-arrow-left"></i> Back to sign in</a>
      </section>
    </main>`;
  $('#fpBtn').onclick = async () => {
    const email = $('#fpEmail').value.trim();
    if (!email) return showToast('Enter your email', 'error');
    try {
      showLoading(true);
      await apiCall('/api/auth/forgot', 'POST', { email });
      showToast('If the email exists, a reset link was sent.', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}

function renderReset(token) {
  appPhase = 'reset';
  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-lock"></i></div>
          <h2 class="auth-title">Choose a new password</h2>
        </header>
        <label class="form-group"><span class="form-label">New password</span><input id="rsPassword" type="password" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Confirm password</span><input id="rsPassword2" type="password" class="form-input" /></label>
        <button id="rsBtn" class="btn btn-primary btn-block" style="margin-top:14px">Reset password</button>
      </section>
    </main>`;
  $('#rsBtn').onclick = async () => {
    const p1 = $('#rsPassword').value;
    const p2 = $('#rsPassword2').value;
    if (!p1 || p1 !== p2) return showToast('Passwords do not match', 'error');
    try {
      showLoading(true);
      await apiCall('/api/auth/reset', 'POST', { token, password: p1 });
      showToast('Password updated. Please sign in.', 'success');
      location.hash = '#/login';
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}

async function renderVerify(serial) {
  appPhase = 'verify';
  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card" style="max-width:640px">
        <div style="text-align:center">
          <div class="spinner" style="margin:40px auto;border-color:var(--border);border-top-color:var(--brand)"></div>
          <p class="form-hint">Verifying certificate...</p>
        </div>
      </section>
    </main>`;

  try {
    const res = await fetch(`/api/verify/${encodeURIComponent(serial)}`);
    const d = await res.json();
    const valid = d.valid;
    const c = d.certificate || {};

    $('#app-root').innerHTML = `
      <main class="auth-page">
        <section class="auth-card" style="max-width:640px;text-align:center">
          <div class="auth-logo" style="background:${valid
            ? 'linear-gradient(135deg,#059669,#065f46)'
            : 'linear-gradient(135deg,#dc2626,#b91c1c)'}">
            <i class="fas fa-${valid ? 'check' : 'times'}"></i>
          </div>
          <h1 class="auth-title">${valid ? 'Certificate Verified' : 'Certificate ' + (d.status === 'expired' ? 'Expired' : 'Not Found')}</h1>
          <p class="auth-subtitle">
            ${valid ? 'This certificate is authentic and currently valid.' : 'This certificate is not currently valid.'}
          </p>
          ${c.serial ? `
            <div style="text-align:left;margin-top:24px;padding:20px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface-2)">
              <p><strong>Holder:</strong> ${esc(c.trainee_name)}</p>
              <p><strong>Awarded:</strong> ${esc(c.title)}</p>
              <p><strong>Issued by:</strong> ${esc(c.institution_name || 'ExpertHub')}</p>
              ${c.awarding_body ? `<p><strong>Awarding body:</strong> ${esc(c.awarding_body)}</p>` : ''}
              ${c.cpd_points ? `<p><strong>CPD points:</strong> ${c.cpd_points}</p>` : ''}
              <p><strong>Serial:</strong> <code class="code">${esc(c.serial)}</code></p>
              <p><strong>Issued:</strong> ${fmtDate(c.issued_at)}</p>
              <p><strong>Expires:</strong> ${c.expires_at ? fmtDate(c.expires_at) : 'Never'}</p>
              ${c.blockchain_hash ? `
                <p style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border)">
                  <strong>Blockchain:</strong>
                  <code class="code">${truncateHash(c.blockchain_hash)}</code>
                  <span class="chip chip-green" style="margin-left:6px">
                    <i class="fas fa-cube"></i> On-chain</span>
                </p>
              ` : ''}
            </div>
          ` : ''}
          <a href="#/" class="link link-center">Back to ExpertHub</a>
        </section>
      </main>`;
  } catch (_) {
    $('#app-root').innerHTML = `
      <main class="auth-page">
        <section class="auth-card" style="text-align:center">
          <div class="auth-logo" style="background:linear-gradient(135deg,#dc2626,#b91c1c)">
            <i class="fas fa-times"></i>
          </div>
          <h1 class="auth-title">Verification Unavailable</h1>
          <p class="auth-subtitle">Please try again later.</p>
          <a href="#/" class="link link-center">Back to ExpertHub</a>
        </section>
      </main>`;
  }
}

function renderSetupAccount(email, token) {
  appPhase = 'setup';
  $('#app-root').innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <header class="auth-header">
          <div class="auth-logo"><i class="fas fa-user-check"></i></div>
          <h1 class="auth-title">Activate Your Account</h1>
          <p class="auth-subtitle">Set a password to begin your training.</p>
        </header>
        <label class="form-group">
          <span class="form-label">Email</span>
          <input id="saEmail" type="email" class="form-input" value="${esc(email || '')}" ${email ? 'readonly' : ''} />
        </label>
        <label class="form-group">
          <span class="form-label">New password</span>
          <input id="saPass" type="password" class="form-input" placeholder="Minimum 8 characters" />
          <div class="progress-bar"><span id="saPwdBar"></span></div>
        </label>
        <label class="form-group">
          <span class="form-label">Confirm password</span>
          <input id="saPass2" type="password" class="form-input" />
        </label>
        <button id="saBtn" class="btn btn-primary btn-block" style="margin-top:14px">Activate Account</button>
        <a href="#/login" class="link link-center">Already activated? Sign in</a>
      </section>
    </main>`;

  $('#saPass').oninput = e => {
    const v = e.target.value;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    $('#saPwdBar').style.width = (score * 25) + '%';
  };

  $('#saBtn').onclick = async () => {
    const emailVal = $('#saEmail').value.trim();
    const p1 = $('#saPass').value;
    const p2 = $('#saPass2').value;
    if (!emailVal || !p1) return showToast('Email and password are required', 'error');
    if (p1.length < 8) return showToast('Password must be at least 8 characters', 'error');
    if (p1 !== p2) return showToast('Passwords do not match', 'error');
    try {
      showLoading(true);
      await apiCall('/api/auth/setup-account', 'POST', { email: emailVal, password: p1, token });
      showToast('Account activated. Redirecting to sign in...', 'success');
      setTimeout(() => { location.hash = '#/login'; }, 1200);
    } catch (e) {
      showToast(e.message, 'error');
    } finally { showLoading(false); }
  };
}

/* ============================================================
   DASHBOARD DISPATCHER
   ============================================================ */
function renderDashboard() {
  if (!currentUser) return renderLogin();
  if (currentUserRole === 'admin')       return renderAdminDashboard();
  if (currentUserRole === 'expert')      return renderExpertDashboard();
  if (currentUserRole === 'institution') return renderInstitutionDashboard();
  return renderUserDashboard();
}

/* ---------- SHELL PIECES ---------- */
function sidebarItem(id, label, icon, badge=0) {
  const active = activeTab === id;
  return `
    <button class="sidebar-item ${active ? 'sidebar-item-active' : ''}" data-tab="${id}">
      <i class="fas ${icon} sidebar-icon"></i>
      <span class="sidebar-label">${label}</span>
      ${badge > 0 ? `<span class="sidebar-badge">${badge}</span>` : ''}
      ${active ? '<i class="fas fa-chevron-right sidebar-chevron"></i>' : ''}
    </button>`;
}
function topbar(roleLabel) {
  return `
    <header class="topbar">
      <div class="topbar-left">
        <button class="topbar-toggle" data-sidebar-toggle><i class="fas fa-bars"></i></button>
        <span class="live-indicator"></span>
        <span class="topbar-label">${roleLabel}</span>
      </div>
      <div class="topbar-right" style="position:relative">
        <button class="icon-btn" data-theme-toggle title="Toggle theme"><i class="fas fa-moon"></i></button>
        <button class="icon-btn" data-notif-toggle title="Notifications">
          <i class="fas fa-bell"></i>
          <span id="notif-badge" class="notif-badge hidden">0</span>
        </button>
        <span class="topbar-user">${esc(currentUser?.name || roleLabel)}</span>
        <button class="btn btn-danger btn-sm" id="logoutBtn">Logout</button>
        <div id="notif-panel-host"></div>
      </div>
    </header>`;
}
function shell({ roleClass, brandIcon, brandTitle, brandSubtitle, nav, roleLabel, content }) {
  $('#app-root').innerHTML = `
    <div class="app-shell ${roleClass}">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <i class="fas ${brandIcon} sidebar-brand-icon"></i>
          <div class="sidebar-brand-text">
            <span class="sidebar-brand-title">${brandTitle}</span>
            <span class="sidebar-brand-subtitle">${brandSubtitle}</span>
          </div>
        </div>
        <nav class="sidebar-nav">${nav}</nav>
        <div class="sidebar-footer">
          <a href="#" class="sidebar-footer-link" data-action="help"><i class="fas fa-circle-question"></i> Help and Support</a>
        </div>
      </aside>
      <div class="app-main">
        ${topbar(roleLabel)}
        <div class="app-content" id="role-content">${content}</div>
        <footer class="app-footer">
          <span>${new Date().getFullYear()} ExpertHub</span>
          <span class="app-footer-version">v2.0</span>
        </footer>
      </div>
    </div>
    ${renderChatModal()}`;
  attachCommonEvents();
  attachSidebarEvents();
  updateNotificationBadge();
}
function attachCommonEvents() {
  $('#logoutBtn')?.addEventListener('click', logout);
  $$('[data-sidebar-toggle]').forEach(b => b.onclick = () => $('#sidebar')?.classList.toggle('open'));
  $$('[data-theme-toggle]').forEach(b => b.onclick = toggleTheme);
  $$('[data-notif-toggle]').forEach(b => b.onclick = toggleNotificationsPanel);
}
function attachSidebarEvents() {
  $$('.sidebar-item').forEach(item => item.onclick = () => {
    activeTab = item.dataset.tab;
    $('#sidebar')?.classList.remove('open');
    rerenderRoleContent();
  });
}

/* ---------- Notification panel ---------- */
function toggleNotificationsPanel() {
  notificationsPanelOpen = !notificationsPanelOpen;
  if (notificationsPanelOpen) renderNotificationsPanel();
  else $('#notif-panel-host').innerHTML = '';
}
function renderNotificationsPanel() {
  const host = $('#notif-panel-host');
  if (!host) return;
  const unread = S.notifications.filter(n => !n.is_read).length;
  host.innerHTML = `
    <div class="notif-panel">
      <div class="notif-panel-header">
        <span>Notifications ${unread ? `(${unread})` : ''}</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-xs" data-notif-readall>Mark all read</button>
          <button class="btn btn-ghost btn-xs" data-notif-close>&times;</button>
        </div>
      </div>
      <div class="notif-panel-list">
        ${S.notifications.length ? S.notifications.slice(0,30).map(n => `
          <div class="notif-panel-item ${n.is_read ? '' : 'unread'}" data-notif-id="${n.id}">
            <p class="notif-panel-item-title">${esc(n.title || '')}</p>
            <p class="notif-panel-item-msg">${esc(n.message || '')}</p>
            <p class="notif-panel-item-date">${timeAgo(n.created_at)}</p>
          </div>`).join('') : '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>'}
      </div>
    </div>`;
  host.querySelector('[data-notif-close]').onclick = toggleNotificationsPanel;
  host.querySelector('[data-notif-readall]').onclick = async () => {
    try {
      await apiCall('/api/common/notifications/read-all', 'PUT');
      S.notifications.forEach(n => n.is_read = 1);
      renderNotificationsPanel();
      updateNotificationBadge();
    } catch (e) { showToast(e.message, 'error'); }
  };
  host.querySelectorAll('[data-notif-id]').forEach(el => el.onclick = async () => {
    const id = el.dataset.notifId;
    const n = S.notifications.find(x => String(x.id) === id);
    if (n && !n.is_read) {
      try { await apiCall(`/api/common/notifications/${id}/read`, 'PUT'); n.is_read = 1; } catch (_) {}
      renderNotificationsPanel();
      updateNotificationBadge();
    }
    if (n?.link) {
      location.hash = n.link.startsWith('#') ? n.link : `#${n.link}`;
      toggleNotificationsPanel();
    }
  });
}

/* ============================================================
   END OF PORTION 1
   Portion 2 continues with Admin and Expert dashboards.
   ============================================================ */
   /* ============================================================
   ADMIN DASHBOARD (Portion 2)
   ============================================================ */
function renderAdminDashboard() {
  const pending = S.users.filter(u => u.status === 'pending').length;
  const activeCons = S.consultations.filter(c => ['pending','assigned','in_progress'].includes(c.status)).length;
  const openDisputes = S.consultationDisputes.filter(d => ['open','investigating'].includes(d.status)).length;
  const pendingRefunds = S.userRefunds.filter(r => r.status === 'requested').length;
  const nav = `
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}
    ${sidebarItem('users','User Management','fa-users', pending)}
    ${sidebarItem('experts','Expert Management','fa-user-tie')}
    ${sidebarItem('consultations','Consultations','fa-comments', activeCons)}
    ${sidebarItem('disputes','Consultation Disputes','fa-gavel', openDisputes)}
    ${sidebarItem('events','Events','fa-calendar-alt')}
    ${sidebarItem('institutions','Institutions','fa-building-columns')}
    ${sidebarItem('transactions','Transactions','fa-receipt')}
    ${sidebarItem('payouts','Payouts','fa-money-check-dollar')}
    ${sidebarItem('refunds','Refunds','fa-rotate-left', pendingRefunds)}
    ${sidebarItem('coupons','Coupons','fa-tag')}
    ${sidebarItem('claims','Claims','fa-scale-balanced')}
    ${sidebarItem('tickets','Support','fa-headset')}
    ${sidebarItem('reviews','Reviews','fa-star')}
    ${sidebarItem('broadcasts','Broadcasts','fa-bullhorn')}
    ${sidebarItem('audit','Audit Log','fa-clipboard-list')}
    ${sidebarItem('consultation-analytics','Consultation Analytics','fa-chart-pie')}
    ${sidebarItem('analytics','Platform Analytics','fa-chart-bar')}
    ${sidebarItem('settings','Settings','fa-gear')}
    ${sidebarItem('profile','Profile','fa-user')}
  `;
  shell({
    roleClass: 'role-admin',
    brandIcon: 'fa-graduation-cap',
    brandTitle: 'ExpertHub',
    brandSubtitle: 'Admin Panel',
    nav,
    roleLabel: 'Admin Panel',
    content: renderAdminContent(),
  });
  attachRoleEvents();
  renderCharts();
}

function renderAdminContent() {
  switch (activeTab) {
    case 'dashboard':                return adminOverview();
    case 'users':                    return adminUsers();
    case 'experts':                  return adminExperts();
    case 'consultations':            return adminConsultations();
    case 'disputes':                 return adminDisputes();
    case 'events':                   return adminEvents();
    case 'institutions':             return adminInstitutions();
    case 'transactions':             return adminTransactions();
    case 'payouts':                  return adminPayouts();
    case 'refunds':                  return adminRefunds();
    case 'coupons':                  return adminCoupons();
    case 'claims':                   return adminClaims();
    case 'tickets':                  return adminTickets();
    case 'reviews':                  return adminReviews();
    case 'broadcasts':               return adminBroadcasts();
    case 'audit':                    return adminAudit();
    case 'consultation-analytics':   return adminConsultationAnalytics();
    case 'analytics':                return adminAnalytics();
    case 'settings':                 return adminSettings();
    case 'profile':                  return adminProfile();
    default:                         return adminOverview();
  }
}

function adminOverview() {
  const pending = S.users.filter(u => u.status === 'pending').length;
  const activeExperts = S.experts.filter(e => e.status === 'active').length;
  const activeCons = S.consultations.filter(c => ['pending','assigned','in_progress'].includes(c.status)).length;
  const openDisputes = S.consultationDisputes.filter(d => ['open','investigating'].includes(d.status)).length;
  const t = S.analytics?.totals || {};
  const newThisMonth = S.users.filter(u => {
    const d = new Date(u.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Dashboard</span></div>
    <section class="page-header">
      <h1 class="page-title">Platform Overview</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-dashboard"><i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="refresh-all"><i class="fas fa-rotate"></i> Refresh</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Users</p>
          <p class="stat-value">${t.total_users ?? S.users.length}</p>
          <p class="stat-sub">${newThisMonth} new this month</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Experts</p>
          <p class="stat-value">${activeExperts}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-user-tie"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Consultations</p>
          <p class="stat-value">${activeCons}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-comments"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Open Disputes</p>
          <p class="stat-value">${openDisputes}</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-gavel"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Revenue</p>
          <p class="stat-value">${fmtCur(t.total_revenue || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Pending Approvals</p>
          <p class="stat-value">${pending}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div>
      </div>
    </section>

    ${pending || openDisputes ? `
      <section class="dashboard-columns">
        ${pending ? `
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-circle"></i>
            <div>
              <strong>${pending} user${pending === 1 ? '' : 's'} awaiting approval.</strong>
              <a href="#" data-action="switch-tab" data-tab="users" style="margin-left:8px">Review now</a>
            </div>
          </div>
        ` : ''}
        ${openDisputes ? `
          <div class="alert alert-error">
            <i class="fas fa-gavel"></i>
            <div>
              <strong>${openDisputes} open dispute${openDisputes === 1 ? '' : 's'}.</strong>
              <a href="#" data-action="switch-tab" data-tab="disputes" style="margin-left:8px">Investigate</a>
            </div>
          </div>
        ` : ''}
      </section>
    ` : ''}

    <section class="dashboard-columns">
      <div class="panel panel-quick-actions">
        <h3 class="panel-title">Quick Actions</h3>
        <button class="btn btn-primary btn-block" data-action="switch-tab" data-tab="experts"><i class="fas fa-user-plus"></i> Create Expert</button>
        <button class="btn btn-info btn-block" data-action="switch-tab" data-tab="events"><i class="fas fa-calendar-plus"></i> Manage Events</button>
        <button class="btn btn-success btn-block" data-action="switch-tab" data-tab="users"><i class="fas fa-user-check"></i> Approve Users</button>
        <button class="btn btn-warning btn-block" data-action="switch-tab" data-tab="institutions"><i class="fas fa-building"></i> Review Institutions</button>
        <button class="btn btn-secondary btn-block" data-action="switch-tab" data-tab="coupons"><i class="fas fa-tag"></i> Manage Coupons</button>
      </div>
      <div class="panel">
        <h3 class="panel-title">Recent Notifications</h3>
        <ul class="notif-list">
          ${S.notifications.slice(0,5).map(n => `
            <li class="notif-item">
              <i class="fas fa-bell"></i>
              <div class="notif-info">
                <p class="notif-title">${esc(n.title || '')}</p>
                <p class="notif-message">${esc(n.message || '')}</p>
              </div>
              <span class="notif-date">${timeAgo(n.created_at)}</span>
            </li>
          `).join('') || '<li class="empty-row">No notifications</li>'}
        </ul>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card"><h3 class="panel-title">User Growth</h3><canvas id="chartUserGrowth" height="200"></canvas></div>
      <div class="chart-card"><h3 class="panel-title">Revenue Overview</h3><canvas id="chartRevenue" height="200"></canvas></div>
    </section>
  `;
}

function adminUsers() {
  const roleFilter = $('#users-role-filter')?.value || '';
  const statusFilter = $('#users-status-filter')?.value || '';
  const q = ($('#users-q')?.value || '').toLowerCase();

  let list = S.users.slice();
  if (roleFilter)   list = list.filter(u => u.role === roleFilter);
  if (statusFilter) list = list.filter(u => u.status === statusFilter);
  if (q) list = list.filter(u =>
    (u.name || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q)
  );

  const allSelected = list.length > 0 && list.every(u => selectedRows.users.has(String(u.id)));

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Users</span></div>
    <section class="page-header">
      <h1 class="page-title">User Management</h1>
      <div class="page-actions">
        <input type="search" id="users-q" class="form-input" placeholder="Search users..." value="${esc(q)}" />
        <select id="users-status-filter" class="form-select">
          <option value="">All statuses</option>
          <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active</option>
          <option value="pending" ${statusFilter === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="suspended" ${statusFilter === 'suspended' ? 'selected' : ''}>Suspended</option>
          <option value="rejected" ${statusFilter === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>
        <select id="users-role-filter" class="form-select">
          <option value="">All roles</option>
          <option value="admin" ${roleFilter === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="expert" ${roleFilter === 'expert' ? 'selected' : ''}>Expert</option>
          <option value="institution" ${roleFilter === 'institution' ? 'selected' : ''}>Institution</option>
          <option value="learner" ${roleFilter === 'learner' ? 'selected' : ''}>Learner</option>
        </select>
        <button class="btn btn-secondary" data-action="export-users"><i class="fas fa-download"></i> Export</button>
      </div>
    </section>

    ${selectedRows.users.size ? `
      <div class="alert alert-info" style="justify-content:space-between">
        <span><strong>${selectedRows.users.size}</strong> selected</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-success btn-sm" data-action="bulk-approve-users">Approve All</button>
          <button class="btn btn-danger btn-sm" data-action="bulk-suspend-users">Suspend All</button>
          <button class="btn btn-secondary btn-sm" data-action="clear-selection" data-target="users">Clear</button>
        </div>
      </div>
    ` : ''}

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:36px">
                <input type="checkbox" id="users-select-all" ${allSelected ? 'checked' : ''} />
              </th>
              <th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Last login</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(u => `
              <tr>
                <td>
                  <input type="checkbox" class="user-check" data-id="${u.id}"
                         ${selectedRows.users.has(String(u.id)) ? 'checked' : ''} />
                </td>
                <td>
                  <div class="user-cell">
                    <img class="user-avatar" src="${avatar(u)}" alt="" />
                    <div>
                      <div class="user-name">${esc(u.name || '')}</div>
                      <div class="user-email">${esc(u.email || '')}</div>
                    </div>
                  </div>
                </td>
                <td><span class="chip chip-neutral">${esc(u.role || 'learner')}</span></td>
                <td><span class="${statusClass(u.status)}">${esc(u.status || '')}</span></td>
                <td>${fmtDate(u.created_at)}</td>
                <td>${u.last_login_at ? timeAgo(u.last_login_at) : '—'}</td>
                <td class="actions-cell">
                  ${u.status === 'pending' ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${u.id}">Approve</button>` : ''}
                  ${u.status === 'pending' ? `<button class="btn btn-danger btn-xs" data-action="reject-user" data-id="${u.id}">Reject</button>` : ''}
                  ${u.status === 'active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-user" data-id="${u.id}">Suspend</button>` : ''}
                  ${(u.status === 'suspended' || u.status === 'rejected') ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${u.id}">Reactivate</button>` : ''}
                  <button class="btn btn-secondary btn-xs" data-action="edit-user" data-id="${u.id}">Edit</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-user" data-id="${u.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No users found</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="table-footer"><span>Showing ${list.length} users</span></div>
    </section>

    <script>
      document.querySelectorAll('.user-check').forEach(cb => {
        cb.onchange = () => {
          if (cb.checked) selectedRows.users.add(cb.dataset.id);
          else selectedRows.users.delete(cb.dataset.id);
          rerenderRoleContent();
        };
      });
      const selAll = document.getElementById('users-select-all');
      if (selAll) selAll.onchange = () => {
        if (selAll.checked) list.forEach(u => selectedRows.users.add(String(u.id)));
        else selectedRows.users.clear();
        rerenderRoleContent();
      };
    </script>
  `;
}

function adminExperts() {
  const list = S.experts.slice();
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Experts</span></div>
    <section class="page-header">
      <h1 class="page-title">Expert Management</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="show-create-expert"><i class="fas fa-plus"></i> Create Expert</button>
      </div>
    </section>

    <section class="panel hidden" id="createExpertPanel">
      <h3 class="panel-title">Create New Expert</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Full name</span><input id="newExpertName" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Email</span><input id="newExpertEmail" type="email" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Phone</span><input id="newExpertPhone" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Specialization</span><input id="newExpertSpec" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Hourly rate ($)</span><input id="newExpertRate" type="number" class="form-input" /></label>
        <label class="form-group form-group-full"><span class="form-label">Bio</span><input id="newExpertBio" class="form-input" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="submit-create-expert">Create</button>
        <button class="btn btn-secondary" data-action="hide-create-expert">Cancel</button>
      </div>
    </section>

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Expert</th><th>Specialization</th><th>Rate</th><th>Rating</th><th>Earnings</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${list.map(e => `
              <tr>
                <td>
                  <div class="user-cell">
                    <img class="user-avatar" src="${avatar(e)}" alt="" />
                    <div>
                      <div class="user-name">${esc(e.name || '')}</div>
                      <div class="user-email">${esc(e.email || '')}</div>
                    </div>
                  </div>
                </td>
                <td>${esc(e.specialization || '—')}</td>
                <td>${fmtCur(e.hourly_rate || 0)}</td>
                <td>${e.average_rating ? Number(e.average_rating).toFixed(1) + ' / 5' : '—'}</td>
                <td>${fmtCur(e.total_earnings || 0)}</td>
                <td><span class="${statusClass(e.status || 'active')}">${esc(e.status || '')}</span></td>
                <td class="actions-cell">
                  ${e.status === 'active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-user" data-id="${e.id}">Suspend</button>` : ''}
                  ${e.status === 'suspended' ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${e.id}">Reactivate</button>` : ''}
                  <button class="btn btn-info btn-xs" data-action="verify-expert-badge" data-id="${e.id}">
                    <i class="fas fa-check-circle"></i> Verify</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-user" data-id="${e.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No experts</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminConsultations() {
  const filter = $('#admin-consult-filter')?.value || '';
  const list = filter
    ? S.consultations.filter(c => c.status === filter)
    : S.consultations;
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header">
      <h1 class="page-title">All Consultations</h1>
      <div class="page-actions">
        <select id="admin-consult-filter" class="form-select" style="max-width:200px">
          <option value="">All statuses</option>
          ${CONFIG.CONSULTATION_STATUSES.map(s => `
            <option value="${s}" ${filter === s ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>
          `).join('')}
        </select>
      </div>
    </section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Title</th><th>Client</th><th>Expert</th><th>Type</th>
              <th>Scheduled</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(c => `
              <tr>
                <td>${esc(c.title || '')}</td>
                <td>${esc(c.client_name || '—')}</td>
                <td>${esc(c.expert_name || '—')}</td>
                <td><span class="chip chip-neutral">${esc(c.consultation_type || '')}</span></td>
                <td>${c.scheduled_at ? fmtInTz(c.scheduled_at) : '—'}</td>
                <td><span class="${consultationStatusClass(c.status)}">${esc(c.status?.replace(/_/g,' ') || '')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="view-consultation" data-id="${c.id}">View</button>
                  ${!c.expert_id ? `<button class="btn btn-primary btn-xs" data-action="assign-consultation" data-id="${c.id}">Assign</button>` : ''}
                  ${c.status === 'disputed' ? `<button class="btn btn-danger btn-xs" data-action="open-dispute-detail" data-id="${c.id}">Dispute</button>` : ''}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No consultations</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminDisputes() {
  const disputes = S.consultationDisputes || [];
  const analytics = S.adminConsultationAnalytics || { totals: {}, cancellation_reasons: [] };
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultation Disputes</span></div>
    <section class="page-header">
      <h1 class="page-title">Consultation Disputes</h1>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Consultations</p>
          <p class="stat-value">${analytics.totals?.total || 0}</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-comments"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Completed</p>
          <p class="stat-value">${analytics.totals?.completed || 0}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Open Disputes</p>
          <p class="stat-value">${disputes.filter(d => ['open','investigating'].includes(d.status)).length}</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-gavel"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">No-Shows</p>
          <p class="stat-value">${analytics.totals?.no_shows || 0}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-user-slash"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Open Disputes</h3>
      ${disputes.length ? disputes.map(d => `
        <article class="dispute-card">
          <header class="dispute-header">
            <div>
              <h4>${esc(d.consultation_title || 'Consultation')}</h4>
              <p class="dispute-meta">
                Opened by ${esc(d.opener_name || '—')} against ${esc(d.expert_name || '—')}
                · ${fmtDate(d.opened_at)}
              </p>
            </div>
            <span class="${statusClass(d.status)}">${esc(d.status)}</span>
          </header>
          <p class="dispute-reason"><strong>Reason:</strong> ${esc(d.reason || '')}</p>
          <p class="dispute-desc">${esc(d.description || '')}</p>
          ${d.evidence ? `<p class="dispute-evidence"><i class="fas fa-paperclip"></i> ${typeof d.evidence === 'string' ? 'Evidence attached' : Object.keys(d.evidence).length + ' file(s)'}</p>` : ''}
          <footer class="dispute-actions">
            <button class="btn btn-info btn-sm" data-action="dispute-investigate" data-id="${d.id}">Investigate</button>
            <button class="btn btn-success btn-sm" data-action="dispute-resolve" data-id="${d.id}">Resolve</button>
            <button class="btn btn-danger btn-sm" data-action="dispute-reject" data-id="${d.id}">Reject</button>
          </footer>
        </article>
      `).join('') : '<p class="empty-row">No disputes</p>'}
    </section>

    <section class="panel">
      <h3 class="panel-title">Cancellation Reasons</h3>
      <ul class="list-stack">
        ${(analytics.cancellation_reasons || []).map(r => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(r.cancel_reason || 'No reason given')}</span>
            </div>
            <span class="chip chip-neutral">${r.c} time${r.c === 1 ? '' : 's'}</span>
          </li>
        `).join('') || '<li class="empty-row">No cancellations recorded</li>'}
      </ul>
    </section>
  `;
}

function adminEvents() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Events</span></div>
    <section class="page-header">
      <h1 class="page-title">Events and Training</h1>
      <button class="btn btn-primary" data-action="create-event"><i class="fas fa-calendar-plus"></i> New Event</button>
    </section>
    <section class="panel">
      <div class="event-list">
        ${S.events.map(ev => `
          <article class="event-card">
            <div class="event-date">
              <span class="event-day">${new Date(ev.date || ev.created_at).getDate()}</span>
              <span class="event-month">${new Date(ev.date || ev.created_at).toLocaleString('en-US', { month: 'short' })}</span>
            </div>
            <div class="event-body">
              <h4 class="event-title">${esc(ev.title || '')}</h4>
              <p class="event-desc">${esc((ev.description || '').slice(0, 120))}</p>
              <p class="event-meta">${esc(ev.category || '')} · ${ev.registered_count || 0}/${ev.capacity || 0} registered · ${ev.price > 0 ? fmtCur(ev.price) : 'Free'}</p>
            </div>
            <div class="event-actions">
              <button class="btn btn-secondary btn-sm" data-action="edit-event" data-id="${ev.id}">Edit</button>
              <button class="btn btn-danger btn-sm" data-action="delete-event" data-id="${ev.id}">Delete</button>
            </div>
          </article>
        `).join('') || '<p class="empty-row">No events</p>'}
      </div>
    </section>
  `;
}

function adminInstitutions() {
  const list = S.institutions.slice();
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Institutions</span></div>
    <section class="page-header">
      <h1 class="page-title">Institutional and Corporate Accounts</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-institution"><i class="fas fa-plus"></i> New Institution</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Institutions</p><p class="stat-value">${list.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-building"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Active Programmes</p><p class="stat-value">${S.programmes.filter(p => p.status === 'active').length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-diagram-project"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Trainees</p><p class="stat-value">${S.trainees.length}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-user-graduate"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Pending Verification</p><p class="stat-value">${list.filter(i => i.status === 'pending').length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div>
      </div>
    </section>

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Institution</th><th>Type</th><th>Industry</th><th>Ops Manager</th><th>Programmes</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${list.map(i => `
              <tr>
                <td>
                  <div class="user-cell">
                    <div class="user-avatar" style="background:var(--brand);display:flex;align-items:center;justify-content:center;color:#fff">
                      <i class="fas fa-building"></i>
                    </div>
                    <div>
                      <div class="user-name">${esc(i.name || '')}</div>
                      <div class="user-email">${esc(i.contact_email || '')}</div>
                    </div>
                  </div>
                </td>
                <td><span class="chip chip-neutral">${esc(i.type || 'corporate')}</span></td>
                <td>${esc(i.industry || '—')}</td>
                <td>${esc(i.ops_manager_name || '—')}<br><small class="user-email">${esc(i.ops_manager_email || '')}</small></td>
                <td>${i.programme_count || 0}</td>
                <td><span class="${statusClass(i.status || 'pending')}">${esc(i.status || '')}</span></td>
                <td class="actions-cell">
                  ${i.status === 'pending' ? `<button class="btn btn-success btn-xs" data-action="approve-institution" data-id="${i.id}">Verify</button>` : ''}
                  ${i.status === 'pending' ? `<button class="btn btn-danger btn-xs" data-action="reject-institution" data-id="${i.id}">Reject</button>` : ''}
                  ${i.status === 'active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-institution" data-id="${i.id}">Suspend</button>` : ''}
                  <button class="btn btn-info btn-xs" data-action="assign-ops-manager" data-id="${i.id}">Assign Ops</button>
                  <button class="btn btn-secondary btn-xs" data-action="edit-institution" data-id="${i.id}">Edit</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-institution" data-id="${i.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No institutions registered</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminTransactions() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Transactions</span></div>
    <section class="page-header"><h1 class="page-title">Transactions</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Reference</th><th>User</th><th>Description</th><th>Amount</th><th>Provider</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            ${S.transactions.map(t => `
              <tr>
                <td><code class="code">${esc(t.reference || t.id)}</code></td>
                <td>${esc(t.user_name || '—')}</td>
                <td>${esc(t.description || '')}</td>
                <td>${fmtCur(t.amount || 0)}</td>
                <td><span class="chip chip-neutral">${esc(t.provider || '')}</span></td>
                <td><span class="${statusClass(t.status)}">${esc(t.status || '')}</span></td>
                <td>${fmtDT(t.created_at)}</td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No transactions</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminPayouts() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Payouts</span></div>
    <section class="page-header"><h1 class="page-title">Payouts</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Expert</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${S.payouts.map(p => `
              <tr>
                <td>${esc(p.expert_name || '—')}</td>
                <td>${fmtCur(p.amount || 0)}</td>
                <td><span class="chip chip-neutral">${esc(p.method || '')}</span></td>
                <td><span class="${statusClass(p.status)}">${esc(p.status || '')}</span></td>
                <td>${fmtDate(p.created_at)}</td>
                <td class="actions-cell">
                  ${p.status === 'pending' ? `
                    <button class="btn btn-success btn-xs" data-action="payout-approve" data-id="${p.id}">Approve</button>
                    <button class="btn btn-info btn-xs" data-action="payout-process" data-id="${p.id}">Process</button>
                    <button class="btn btn-danger btn-xs" data-action="payout-reject" data-id="${p.id}">Reject</button>
                  ` : ''}
                  ${p.status === 'processing' ? `<button class="btn btn-success btn-xs" data-action="payout-paid" data-id="${p.id}">Mark Paid</button>` : ''}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-row">No payouts</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminRefunds() {
  const refunds = S.userRefunds || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Refunds</span></div>
    <section class="page-header">
      <h1 class="page-title">Course Refund Requests</h1>
    </section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>User</th><th>Course</th><th>Amount</th><th>Reason</th><th>Requested</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${refunds.map(r => `
              <tr>
                <td>${esc(r.user_name || '—')}</td>
                <td>${esc(r.course_title || '—')}</td>
                <td>${fmtCur(r.amount || 0)}</td>
                <td>${esc((r.reason || '').slice(0, 80))}</td>
                <td>${fmtDate(r.requested_at)}</td>
                <td><span class="${statusClass(r.status)}">${esc(r.status)}</span></td>
                <td class="actions-cell">
                  ${r.status === 'requested' ? `
                    <button class="btn btn-success btn-xs" data-action="refund-approve" data-id="${r.id}">Approve</button>
                    <button class="btn btn-danger btn-xs" data-action="refund-reject" data-id="${r.id}">Reject</button>
                  ` : ''}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No refund requests</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminCoupons() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Coupons</span></div>
    <section class="page-header">
      <h1 class="page-title">Coupons</h1>
      <button class="btn btn-primary" data-action="create-coupon"><i class="fas fa-plus"></i> New Coupon</button>
    </section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Code</th><th>Discount</th><th>Uses</th><th>Applies to</th><th>Expires</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${S.coupons.map(c => `
              <tr>
                <td><code class="code">${esc(c.code || '')}</code></td>
                <td>${c.discount_type === 'percent' ? c.discount_value + '%' : fmtCur(c.discount_value)}</td>
                <td>${c.used_count || 0}${c.max_uses ? ' / ' + c.max_uses : ''}</td>
                <td><span class="chip chip-neutral">${esc(c.applies_to)}</span></td>
                <td>${c.expires_at ? fmtDate(c.expires_at) : 'Never'}</td>
                <td><span class="${statusClass(c.active ? 'active' : 'disabled')}">${c.active ? 'Active' : 'Disabled'}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="toggle-coupon" data-id="${c.id}">Toggle</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-coupon" data-id="${c.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No coupons</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminClaims() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Claims</span></div>
    <section class="page-header"><h1 class="page-title">Client Claims</h1></section>
    <section class="panel">
      ${S.claims.length ? S.claims.map(c => `
        <article class="claim-card">
          <header class="claim-header">
            <span class="claim-title">${esc(c.claim_title || '')}</span>
            <span class="${statusClass(c.status)}">${esc(c.status || '')}</span>
          </header>
          <p class="claim-desc">${esc(c.claim_description || '')}</p>
          ${c.claim_amount ? `<p class="claim-amount">Amount: ${fmtCur(c.claim_amount)}</p>` : ''}
          <footer class="claim-actions">
            ${c.status === 'open' ? `
              <button class="btn btn-info btn-sm" data-action="claim-investigate" data-id="${c.id}">Investigate</button>
              <button class="btn btn-success btn-sm" data-action="claim-resolve" data-id="${c.id}">Resolve</button>
              <button class="btn btn-danger btn-sm" data-action="claim-reject" data-id="${c.id}">Reject</button>
            ` : ''}
          </footer>
        </article>
      `).join('') : '<p class="empty-row">No claims</p>'}
    </section>
  `;
}

function adminTickets() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Support</span></div>
    <section class="page-header"><h1 class="page-title">Support Tickets</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Ref</th><th>User</th><th>Subject</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${S.tickets.map(t => `
              <tr>
                <td><code class="code">${esc(t.reference || t.id)}</code></td>
                <td>${esc(t.user_name || '—')}</td>
                <td>${esc(t.subject || '')}</td>
                <td><span class="${statusClass(t.priority || 'normal')}">${esc(t.priority || '')}</span></td>
                <td><span class="${statusClass(t.status)}">${esc(t.status || '')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-info btn-xs" data-action="ticket-view" data-id="${t.id}">View</button>
                  <button class="btn btn-success btn-xs" data-action="ticket-resolve" data-id="${t.id}">Resolve</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-row">No tickets</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function adminReviews() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Reviews</span></div>
    <section class="page-header"><h1 class="page-title">Reviews</h1></section>
    <section class="panel">
      ${S.reviews.length ? S.reviews.map(r => `
        <article class="review-card">
          <header class="review-header">
            <span class="review-author">${esc(r.author_name || 'Anonymous')} → ${esc(r.expert_name || r.course_title || 'Expert')}</span>
            <span class="star-rating">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span>
            <span class="${statusClass(r.status)}">${esc(r.status || '')}</span>
          </header>
          <p class="review-body">${esc(r.comment || '')}</p>
          <footer class="review-actions">
            ${r.status !== 'published' ? `<button class="btn btn-success btn-xs" data-action="review-publish" data-id="${r.id}">Publish</button>` : ''}
            ${r.status !== 'hidden' ? `<button class="btn btn-danger btn-xs" data-action="review-hide" data-id="${r.id}">Hide</button>` : ''}
          </footer>
        </article>
      `).join('') : '<p class="empty-row">No reviews</p>'}
    </section>
  `;
}

function adminBroadcasts() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Broadcasts</span></div>
    <section class="page-header"><h1 class="page-title">Broadcasts</h1></section>
    <section class="panel">
      <h3 class="panel-title">Send a Broadcast</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Title</span><input id="broadcastTitle" class="form-input" /></label>
        <label class="form-group">
          <span class="form-label">Audience</span>
          <select id="broadcastAudience" class="form-select">
            <option value="all">All users</option>
            <option value="experts">Experts only</option>
            <option value="learners">Learners only</option>
            <option value="institutions">Institutions only</option>
            <option value="admins">Admins only</option>
          </select>
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Message</span>
          <textarea id="broadcastMessage" class="form-textarea" rows="4"></textarea>
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="send-broadcast"><i class="fas fa-paper-plane"></i> Send Broadcast</button>
      </div>
    </section>
  `;
}

function adminAudit() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Audit</span></div>
    <section class="page-header"><h1 class="page-title">Audit Log</h1></section>
    <section class="panel">
      <ul class="list-stack">
        ${S.auditLogs.map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.action || '')}</span>
              <span class="list-row-sub">target ${esc(l.target || '')}${l.target_id ? ' #' + l.target_id : ''} by ${esc(l.actor_name || 'system')}</span>
            </div>
            <span class="list-row-meta">${fmtDT(l.created_at)}</span>
          </li>
        `).join('') || '<li class="empty-row">No entries</li>'}
      </ul>
    </section>
  `;
}

function adminConsultationAnalytics() {
  const a = S.adminConsultationAnalytics || { totals: {}, cancellation_reasons: [] };
  const t = a.totals || {};
  const byStatus = a.byStatus || [];
  const byExpert = a.topExperts || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultation Analytics</span></div>
    <section class="page-header"><h1 class="page-title">Consultation Analytics</h1></section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Consultations</p><p class="stat-value">${t.total || 0}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-comments"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed</p><p class="stat-value">${t.completed || 0}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Avg. Price</p><p class="stat-value">${fmtCur(t.avg_price || 0)}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">No-Shows</p><p class="stat-value">${t.no_shows || 0}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-user-slash"></i></div>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Consultations by Status</h3>
        <canvas id="chartConsultationsByStatus" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Top Experts by Revenue</h3>
        <canvas id="chartTopExpertsRevenue" height="200"></canvas>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Top Experts</h3>
      <ul class="list-stack">
        ${byExpert.map(e => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(e.name)}</span>
              <span class="list-row-sub">${e.consultations || 0} consults · ${e.avg_rating || 0} rating</span>
            </div>
            <span class="list-row-price">${fmtCur(e.total_earnings || 0)}</span>
          </li>
        `).join('') || '<li class="empty-row">No data</li>'}
      </ul>
    </section>
  `;
}

function adminAnalytics() {
  const t = S.analytics?.totals || {};
  const top = S.analytics?.topExperts || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Analytics</span></div>
    <section class="page-header"><h1 class="page-title">Platform Analytics</h1></section>

    <section class="stat-grid">
      <div class="stat-card dashboard-card">
        <div class="stat-info"><p class="stat-label">Total Users</p><p class="stat-value">${t.total_users || 0}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info"><p class="stat-label">Total Revenue</p><p class="stat-value">${fmtCur(t.total_revenue || 0)}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info"><p class="stat-label">Published Courses</p><p class="stat-value">${t.published_courses || 0}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-book"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info"><p class="stat-label">Published Events</p><p class="stat-value">${t.published_events || 0}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-calendar"></i></div>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card"><h3 class="panel-title">User Growth</h3><canvas id="userGrowthChart" height="200"></canvas></div>
      <div class="chart-card"><h3 class="panel-title">Revenue</h3><canvas id="revenueChart" height="200"></canvas></div>
    </section>

    <section class="panel-charts">
      <div class="chart-card"><h3 class="panel-title">Users by Role</h3><canvas id="roleChart" height="200"></canvas></div>
      <div class="chart-card">
        <h3 class="panel-title">Top Experts</h3>
        <ul class="list-stack" style="margin-top:10px">
          ${top.map(e => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(e.name)}</span>
                <span class="list-row-sub">${e.average_rating || 0} / 5</span>
              </div>
              <span class="list-row-price">${fmtCur(e.total_earnings)}</span>
            </li>
          `).join('') || '<li class="empty-row">No data</li>'}
        </ul>
      </div>
    </section>
  `;
}

function adminSettings() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Settings</span></div>
    <section class="page-header"><h1 class="page-title">Settings</h1></section>

    <section class="panel">
      <h3 class="panel-title">Platform</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Platform name</span><input id="setPlatformName" class="form-input" value="ExpertHub" /></label>
        <label class="form-group"><span class="form-label">Support email</span><input id="setSupportEmail" class="form-input" value="support@experthub.com" /></label>
        <label class="form-group">
          <span class="form-label">Default currency</span>
          <select id="setCurrency" class="form-select">
            <option>USD</option><option>KES</option><option>NGN</option><option>EUR</option>
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Timezone</span>
          <select id="setTimezone" class="form-select">
            <option>UTC</option><option>Africa/Nairobi</option><option>Africa/Lagos</option>
          </select>
        </label>
      </div>

      <h3 class="panel-title" style="margin-top:20px">Commission and Payouts</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Consultation commission (%)</span><input id="setCommCons" type="number" class="form-input" value="20" /></label>
        <label class="form-group"><span class="form-label">Course commission (%)</span><input id="setCommCourse" type="number" class="form-input" value="20" /></label>
        <label class="form-group"><span class="form-label">Withdrawal hold (days)</span><input id="setHold" type="number" class="form-input" value="7" /></label>
        <label class="form-group"><span class="form-label">Minimum payout ($)</span><input id="setMinPayout" type="number" class="form-input" value="50" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-settings">Save Settings</button>
      </div>
    </section>
  `;
}

function adminProfile() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
    <section class="page-header"><h1 class="page-title">My Profile</h1></section>

    <section class="panel">
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(currentUser?.name || '')}</h2>
          <p class="profile-email">${esc(currentUser?.email || '')}</p>
        </div>
      </div>

      <div class="form-grid">
        <label class="form-group"><span class="form-label">Full name</span><input id="profileName" class="form-input" value="${esc(currentUser?.name || '')}" /></label>
        <label class="form-group"><span class="form-label">Phone</span><input id="profilePhone" class="form-input" value="${esc(currentUser?.phone || '')}" /></label>
        <label class="form-group"><span class="form-label">Timezone</span><input id="profileTimezone" class="form-input" value="${esc(currentUser?.timezone || 'UTC')}" /></label>
        <label class="form-group form-group-full">
          <span class="form-label">Change avatar</span>
          <input type="file" id="avatarFile" class="form-input" accept="image/*" />
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="update-user-profile">Save Changes</button>
      </div>

      <h3 class="panel-title" style="margin-top:24px">Change Password</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Current password</span><input id="cpOld" type="password" class="form-input" /></label>
        <label class="form-group"><span class="form-label">New password</span><input id="cpNew" type="password" class="form-input" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-warning" data-action="change-password">Update Password</button>
      </div>
    </section>
  `;
}

/* ============================================================
   EXPERT DASHBOARD
   ============================================================ */
function renderExpertDashboard() {
  const mine = S.consultations.filter(c => c.expert_id === currentUser?.id);
  const activeCons = mine.filter(c => ['pending_expert_confirmation','confirmed','in_grace','in_session'].includes(c.status)).length;
  const myCourses = S.courses.filter(c => c.expert_id === currentUser?.id);
  const draftCourses = myCourses.filter(c => c.status === 'draft').length;

  const nav = `
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}
    ${sidebarItem('consultations','Consultations','fa-comments', activeCons)}
    ${sidebarItem('consultation-calendar','Calendar','fa-calendar-day')}
    ${sidebarItem('slots','Availability Slots','fa-clock')}
    ${sidebarItem('tiers','Pricing Tiers','fa-layer-group')}
    ${sidebarItem('courses','My Courses','fa-book', draftCourses)}
    ${sidebarItem('course-builder','Course Builder','fa-pen-ruler')}
    ${sidebarItem('course-analytics','Course Analytics','fa-chart-simple')}
    ${sidebarItem('events','My Events','fa-calendar-alt')}
    ${sidebarItem('portfolio','Portfolio','fa-briefcase')}
    ${sidebarItem('questions','Public Q&A','fa-question-circle')}
    ${sidebarItem('earnings','Earnings','fa-dollar-sign')}
    ${sidebarItem('withdrawals','Withdrawals','fa-money-bill-transfer')}
    ${sidebarItem('reviews','Reviews','fa-star')}
    ${sidebarItem('consultation-analytics','Consultation Stats','fa-chart-pie')}
    ${sidebarItem('profile','Profile','fa-user')}
  `;
  shell({
    roleClass: 'role-expert',
    brandIcon: 'fa-user-tie',
    brandTitle: 'Expert Panel',
    brandSubtitle: 'ExpertHub',
    nav,
    roleLabel: 'Expert Panel',
    content: renderExpertContent(),
  });
  attachRoleEvents();
}

function renderExpertContent() {
  switch (activeTab) {
    case 'dashboard':                return expertOverview();
    case 'consultations':            return expertConsultations();
    case 'consultation-calendar':    return expertConsultationCalendar();
    case 'slots':                    return expertSlots();
    case 'tiers':                    return expertTiers();
    case 'courses':                  return expertCourses();
    case 'course-builder':           return expertCourseBuilder();
    case 'course-analytics':         return expertCourseAnalytics();
    case 'events':                   return expertEvents();
    case 'portfolio':                return expertPortfolioView();
    case 'questions':                return expertPublicQuestions();
    case 'earnings':                 return expertEarnings();
    case 'withdrawals':              return expertWithdrawals();
    case 'reviews':                  return expertReviews();
    case 'consultation-analytics':   return expertConsultationAnalytics();
    case 'profile':                  return expertProfile();
    default:                         return expertOverview();
  }
}

function expertOverview() {
  const mine = S.consultations.filter(c => c.expert_id === currentUser?.id);
  const active = mine.filter(c => ['assigned','confirmed','in_progress','in_grace','in_session'].includes(c.status)).length;
  const pending = mine.filter(c => c.status === 'pending_expert_confirmation').length;
  const completed = mine.filter(c => c.status === 'completed').length;
  const st = S.expertStats || {};
  const earnings = S.earnings || {};
  const rating = Number(currentUser?.average_rating || 0);
  const myCourses = S.courses.filter(c => c.expert_id === currentUser?.id);
  const publishedCourses = myCourses.filter(c => c.status === 'published').length;

  const nextSession = mine
    .filter(c => c.scheduled_at && new Date(c.scheduled_at) > new Date())
    .filter(c => ['confirmed','scheduled','in_grace','in_session'].includes(c.status))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 3);

  const recentReviews = (S.reviews || []).slice(0, 3);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Dashboard</span></div>
    <section class="page-header">
      <h1 class="page-title">Welcome, ${esc(currentUser?.name || 'Expert')}</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="view-public-profile">
          <i class="fas fa-eye"></i> Preview Public Profile</button>
        <button class="btn btn-primary" data-action="switch-tab" data-tab="consultation-calendar">
          <i class="fas fa-calendar"></i> Open Calendar</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Consultations</p>
          <p class="stat-value">${st.total_consultations ?? mine.length}</p>
          <p class="stat-sub">${completed} completed</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-comments"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Now</p>
          <p class="stat-value">${active}</p>
          ${pending > 0 ? `<p class="stat-sub" style="color:var(--warning-dark)">${pending} awaiting your confirmation</p>` : ''}
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Earnings</p>
          <p class="stat-value">${fmtCur(earnings.total_earned || 0)}</p>
          <p class="stat-sub">Available: ${fmtCur(earnings.available_balance || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Rating</p>
          <p class="stat-value">${rating.toFixed(1)}</p>
          <p class="stat-sub">${S.reviews.length} review${S.reviews.length === 1 ? '' : 's'}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Published Courses</p>
          <p class="stat-value">${publishedCourses}</p>
          <p class="stat-sub">${myCourses.length} total</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-book"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Portfolio Items</p>
          <p class="stat-value">${(S.expertPortfolio || []).length}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-briefcase"></i></div>
      </div>
    </section>

    ${pending ? `
      <div class="alert alert-warning">
        <i class="fas fa-clock"></i>
        <div>
          You have <strong>${pending} booking request${pending === 1 ? '' : 's'}</strong> awaiting confirmation.
          Confirm within 2 hours or they auto-expire.
          <a href="#" data-action="switch-tab" data-tab="consultations" style="margin-left:6px">Review now</a>
        </div>
      </div>
    ` : ''}

    <section class="dashboard-columns">
      <div class="panel">
        <h3 class="panel-title">Next Consultations</h3>
        ${nextSession.length ? nextSession.map(c => `
          <div class="case-card">
            <header class="case-header">
              <h3 class="case-title">${esc(c.title || '')}</h3>
              <span class="${consultationStatusClass(c.status)}">${esc(c.status?.replace(/_/g,' ') || '')}</span>
            </header>
            <p class="case-client">Client: ${esc(c.client_name || 'Client')}</p>
            <p class="case-type">${c.scheduled_at ? fmtInTz(c.scheduled_at, currentUser?.timezone || 'UTC') : '—'} · ${c.duration_minutes || 30} min</p>
            <footer class="case-footer">
              <button class="btn btn-primary btn-sm" data-action="open-chat" data-id="${c.id}">
                <i class="fas fa-comments"></i> Open Chat</button>
              <button class="btn btn-info btn-sm" data-action="video-call" data-id="${c.id}">
                <i class="fas fa-video"></i> Video</button>
              <button class="btn btn-secondary btn-sm" data-action="consultation-detail" data-id="${c.id}">
                <i class="fas fa-eye"></i> Details</button>
            </footer>
          </div>
        `).join('') : '<p class="empty-row">No upcoming consultations</p>'}
      </div>

      <div class="panel">
        <h3 class="panel-title">Quick Actions</h3>
        <button class="btn btn-primary btn-block" data-action="manage-slots">
          <i class="fas fa-plus"></i> Manage Availability Slots</button>
        <button class="btn btn-info btn-block" data-action="switch-tab" data-tab="tiers">
          <i class="fas fa-layer-group"></i> Pricing Tiers</button>
        <button class="btn btn-success btn-block" data-action="switch-tab" data-tab="earnings">
          <i class="fas fa-money-bill"></i> Request Withdrawal</button>
        <button class="btn btn-secondary btn-block" data-action="switch-tab" data-tab="portfolio">
          <i class="fas fa-briefcase"></i> Manage Portfolio</button>
        <button class="btn btn-purple btn-block" data-action="create-course-modal">
          <i class="fas fa-plus"></i> Create New Course</button>
      </div>
    </section>

    ${recentReviews.length ? `
      <section class="panel">
        <h3 class="panel-title">Recent Reviews</h3>
        ${recentReviews.map(r => `
          <div class="review-card">
            <header class="review-header">
              <span class="review-author">${esc(r.author_name || 'Anonymous')}</span>
              <span class="star-rating">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span>
              <span class="review-date">${fmtDate(r.created_at)}</span>
            </header>
            <p class="review-body">${esc(r.comment || '')}</p>
          </div>
        `).join('')}
      </section>
    ` : ''}
  `;
}

function expertConsultations() {
  const mine = S.consultations.filter(c => c.expert_id === currentUser?.id);
  const filter = $('#expert-consult-filter')?.value || '';
  const filtered = filter ? mine.filter(c => c.status === filter) : mine;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header">
      <h1 class="page-title">My Consultations</h1>
      <div class="page-actions">
        <select id="expert-consult-filter" class="form-select" style="max-width:200px">
          <option value="">All statuses</option>
          ${CONFIG.CONSULTATION_STATUSES.map(s => `
            <option value="${s}" ${filter === s ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>
          `).join('')}
        </select>
      </div>
    </section>

    <section class="list-stack">
      ${filtered.map(c => `
        <article class="consultation-card">
          <header class="consultation-card-header">
            <div>
              <h4 class="consultation-card-title">${esc(c.title || '')}</h4>
              <p class="consultation-card-meta">
                <span class="${consultationStatusClass(c.status)}">${esc(c.status?.replace(/_/g,' ') || '')}</span>
                ${c.session_type === 'instant' ? '<span class="chip chip-blue">Instant</span>' : ''}
              </p>
            </div>
            <div class="consultation-card-price">
              ${fmtCur(c.price || 0)}
            </div>
          </header>

          <div class="consultation-card-body">
            <div class="consultation-card-expert">
              <img class="user-avatar" src="${avatar({ name: c.client_name, email: c.client_email })}" alt="" />
              <div>
                <div class="user-name">${esc(c.client_name || 'Client')}</div>
                <div class="user-email">${esc(c.client_email || '')}</div>
              </div>
            </div>
            ${c.scheduled_at ? `
              <div class="consultation-card-time">
                <i class="fas fa-calendar"></i>
                <strong>${fmtInTz(c.scheduled_at, currentUser?.timezone || 'UTC')}</strong>
                <span class="consultation-card-countdown">${timeUntil(c.scheduled_at)}</span>
              </div>
            ` : ''}
            <div class="consultation-card-duration">
              <i class="fas fa-clock"></i> ${c.duration_minutes || 30} min · ${esc(c.consultation_type || 'video')}
            </div>
            ${c.description ? `<p class="consultation-card-desc">${esc(c.description.slice(0, 200))}</p>` : ''}
          </div>

          <footer class="consultation-card-actions">
            ${c.status === 'pending_expert_confirmation' ? `
              <button class="btn btn-success btn-sm" data-action="confirm-consultation" data-id="${c.id}">
                <i class="fas fa-check"></i> Confirm Booking</button>
              <button class="btn btn-danger btn-sm" data-action="cancel-consultation" data-id="${c.id}">
                <i class="fas fa-times"></i> Decline</button>
            ` : ''}
            ${['confirmed','scheduled','in_grace'].includes(c.status) ? `
              <button class="btn btn-primary btn-sm" data-action="start-session" data-id="${c.id}">
                <i class="fas fa-play"></i> Start Session</button>
            ` : ''}
            ${c.status === 'in_session' ? `
              <button class="btn btn-success btn-sm" data-action="end-session" data-id="${c.id}">
                <i class="fas fa-stop"></i> End Session</button>
            ` : ''}
            <button class="btn btn-info btn-sm" data-action="open-chat" data-id="${c.id}">
              <i class="fas fa-comments"></i> Chat</button>
            ${['confirmed','scheduled'].includes(c.status) && (c.reschedule_count || 0) < CONFIG.MAX_RESCHEDULES ? `
              <button class="btn btn-secondary btn-sm" data-action="reschedule-consultation" data-id="${c.id}">
                <i class="fas fa-calendar-alt"></i> Reschedule</button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" data-action="consultation-detail" data-id="${c.id}">
              <i class="fas fa-eye"></i> Details</button>
          </footer>
        </article>
      `).join('') || `
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>No consultations</h3>
          <p>Consultations assigned by admin will appear here.</p>
        </div>
      `}
    </section>
  `;
}

function expertConsultationCalendar() {
  const mine = S.consultations.filter(c => c.expert_id === currentUser?.id);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push({ day: '', other: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(year, month, d) });
  while (cells.length % 7) cells.push({ day: '', other: true });

  const byDay = {};
  mine.forEach(c => {
    if (!c.scheduled_at) return;
    const dt = new Date(c.scheduled_at);
    if (dt.getMonth() === month && dt.getFullYear() === year) {
      const k = dt.getDate();
      (byDay[k] = byDay[k] || []).push(c);
    }
  });

  const upcoming = mine
    .filter(c => c.scheduled_at && new Date(c.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 5);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Calendar</span></div>
    <section class="page-header">
      <h1 class="page-title">Consultation Calendar</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="block-time">
          <i class="fas fa-ban"></i> Block Time</button>
        <button class="btn btn-primary" data-action="manage-slots">
          <i class="fas fa-plus"></i> Manage Slots</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">${today.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
      <div class="calendar-header">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<span>${d}</span>`).join('')}
      </div>
      <div class="calendar-grid">
        ${cells.map(c => {
          const isToday = c.date && c.date.toDateString() === today.toDateString();
          const sessions = c.day ? (byDay[c.day] || []) : [];
          return `
            <div class="calendar-cell ${c.other ? 'other-month' : ''} ${isToday ? 'today' : ''}">
              <div class="calendar-day-num">${c.day || ''}</div>
              ${sessions.slice(0, 2).map(s => `
                <div class="calendar-event" title="${esc(s.title)}">
                  ${new Date(s.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ${esc(s.title.slice(0, 16))}
                </div>
              `).join('')}
              ${sessions.length > 2 ? `<div class="calendar-event-more">+${sessions.length - 2}</div>` : ''}
            </div>`;
        }).join('')}
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Upcoming Sessions</h3>
      ${upcoming.length ? upcoming.map(s => `
        <div class="consultation-row">
          <div class="consultation-row-time">
            <div class="consultation-row-day">${fmtDate(s.scheduled_at)}</div>
            <div class="consultation-row-hour">${fmtInTz(s.scheduled_at, currentUser?.timezone || 'UTC', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div class="consultation-row-body">
            <div class="consultation-row-title">${esc(s.title || '')}</div>
            <div class="consultation-row-meta">
              <span class="${consultationStatusClass(s.status)}">${esc(s.status?.replace(/_/g,' ') || '')}</span>
              · ${esc(s.client_name || 'Client')}
              · ${s.duration_minutes || 30} min
            </div>
          </div>
          <div class="consultation-row-actions">
            <button class="btn btn-primary btn-sm" data-action="consultation-detail" data-id="${s.id}">View</button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">No upcoming sessions</p>'}
    </section>
  `;
}

function expertSlots() {
  const slots = S.consultationSlots || [];
  const available = slots.filter(s => s.status === 'available');
  const booked = slots.filter(s => s.status === 'booked');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Availability Slots</span></div>
    <section class="page-header">
      <h1 class="page-title">Availability Slots</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="manage-slots">
          <i class="fas fa-plus"></i> Generate Slots</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Slots define when clients can book you. Generate them in batches by date range.
        Booked slots show which consultation they belong to.
      </div>
    </div>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Open Slots</p><p class="stat-value">${available.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-door-open"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Booked</p><p class="stat-value">${booked.length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Next 7 Days</p>
          <p class="stat-value">${available.filter(s => {
            const d = new Date(s.start_time);
            return d > new Date() && d < new Date(Date.now() + 7 * 86400000);
          }).length}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-calendar-week"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Slot Value (open)</p>
          <p class="stat-value">${fmtCur(available.reduce((sum, s) => sum + Number(s.price || 0), 0))}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-dollar-sign"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Open Slots</h3>
      ${available.length ? `
        <div class="slot-grid">
          ${available.map(s => `
            <div class="slot-card">
              <div class="slot-time">${slotLabel(s)}</div>
              <div class="slot-meta">${s.duration_minutes} min · ${fmtCur(s.price)}</div>
              <button class="btn btn-danger btn-xs" data-action="remove-slot" data-id="${s.id}">
                <i class="fas fa-times"></i></button>
            </div>
          `).join('')}
        </div>
      ` : '<p class="empty-row">No open slots. Click "Generate Slots" to create some.</p>'}
    </section>

    <section class="panel">
      <h3 class="panel-title">Booked Slots</h3>
      ${booked.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Date</th><th>Time</th><th>Duration</th><th>Price</th><th>Consultation</th></tr>
            </thead>
            <tbody>
              ${booked.map(s => {
                const c = S.consultations.find(x => x.slot_id === s.id);
                return `
                  <tr>
                    <td>${fmtDate(s.start_time)}</td>
                    <td>${fmtInTz(s.start_time, currentUser?.timezone || 'UTC', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${s.duration_minutes} min</td>
                    <td>${fmtCur(s.price)}</td>
                    <td>${c ? `<a href="#" data-action="consultation-detail" data-id="${c.id}">${esc(c.title)}</a>` : '—'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="empty-row">No booked slots yet</p>'}
    </section>
  `;
}

function expertTiers() {
  const tiers = S.consultationTiers || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Pricing Tiers</span></div>
    <section class="page-header">
      <h1 class="page-title">Pricing Tiers</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="edit-tiers">
          <i class="fas fa-pen"></i> Edit Tiers</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Offer different session types (Quick, Standard, Deep Dive) at different price points.
        Clients pick a tier when booking.
      </div>
    </div>

    ${tiers.length ? `
      <section class="card-grid">
        ${tiers.map(t => `
          <article class="program-card">
            <h4 class="program-title">${esc(t.name)}</h4>
            <p class="program-desc">${esc(t.description || 'No description')}</p>
            <div class="pricing-price" style="margin:12px 0">${fmtCur(t.price)}</div>
            <p class="program-meta"><i class="fas fa-clock"></i> ${t.duration_minutes} minutes</p>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-layer-group"></i>
          <h3>No pricing tiers configured</h3>
          <p>Set up Quick, Standard and Deep Dive tiers to give clients more choice.</p>
          <button class="btn btn-primary" data-action="edit-tiers">
            <i class="fas fa-plus"></i> Create Tiers</button>
        </div>
      </section>
    `}
  `;
}

function expertCourses() {
  const mine = S.courses.filter(c => c.expert_id === currentUser?.id);
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Courses</span></div>
    <section class="page-header">
      <h1 class="page-title">My Courses</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-course-modal">
          <i class="fas fa-plus"></i> New Course</button>
      </div>
    </section>

    ${selectedRows.courses?.size ? `
      <div class="alert alert-info" style="justify-content:space-between">
        <span><strong>${selectedRows.courses.size}</strong> course${selectedRows.courses.size === 1 ? '' : 's'} selected</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-success btn-sm" data-action="bulk-publish-courses">Publish All</button>
          <button class="btn btn-secondary btn-sm" data-action="clear-selection" data-target="courses">Clear</button>
        </div>
      </div>
    ` : ''}

    <section class="card-grid">
      ${mine.map(c => `
        <article class="program-card">
          <div style="display:flex;justify-content:space-between;gap:8px">
            <span class="chip chip-blue">${esc(c.level || 'beginner')}</span>
            <span class="${statusClass(c.status || 'draft')}">${esc(c.status || 'draft')}</span>
          </div>
          <h4 class="program-title">${esc(c.title || '')}</h4>
          <p class="program-desc">${esc((c.description || '').slice(0, 110))}</p>
          <footer class="program-footer">
            <span class="program-price">${fmtCur(c.price || 0)}</span>
            <span class="program-meta">
              ${c.enrolled_count || 0} enrolled · ${c.lesson_count || 0} lessons
            </span>
          </footer>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" data-action="open-course-builder" data-id="${c.id}">
              <i class="fas fa-pen-ruler"></i> Build</button>
            <button class="btn btn-secondary btn-sm" data-action="view-course-analytics" data-id="${c.id}">
              <i class="fas fa-chart-simple"></i> Analytics</button>
            <button class="btn btn-info btn-sm" data-action="edit-course" data-id="${c.id}">
              <i class="fas fa-pen"></i> Edit</button>
            <button class="btn btn-danger btn-sm" data-action="delete-course" data-id="${c.id}">
              <i class="fas fa-trash"></i></button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-book"></i>
          <h3>No courses yet</h3>
          <p>Create your first course to start earning.</p>
          <button class="btn btn-primary" data-action="create-course-modal">
            <i class="fas fa-plus"></i> Create Course</button>
        </div>
      `}
    </section>
  `;
}

function expertCourseBuilder() {
  const courseId = $('#course-builder-id')?.value || S.__activeCourseId;
  const course = S.courses.find(c => String(c.id) === String(courseId));
  if (!course) {
    return `
      <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Course Builder</span></div>
      <section class="page-header"><h1 class="page-title">Course Builder</h1></section>
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-pen-ruler"></i>
          <h3>Select a course to build</h3>
          <p>Choose one of your courses or create a new one.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="courses">
            <i class="fas fa-book"></i> Go to My Courses</button>
        </div>
      </section>
    `;
  }

  const curriculum = S.courseCurriculum[courseId] || { modules: [] };

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Course Builder</span></div>
    <section class="page-header">
      <h1 class="page-title">${esc(course.title)} — Builder</h1>
      <div class="page-actions">
        <input type="hidden" id="course-builder-id" value="${courseId}" />
        <button class="btn btn-secondary" data-action="preview-course" data-id="${courseId}">
          <i class="fas fa-eye"></i> Preview</button>
        <button class="btn btn-primary" data-action="add-module" data-id="${courseId}">
          <i class="fas fa-plus"></i> New Module</button>
      </div>
    </section>

    <div class="course-builder">
      <div class="builder-column">
        <h3 class="panel-title">Modules & Lessons</h3>
        ${curriculum.modules.length ? curriculum.modules.map(m => `
          <div class="builder-module" data-module-id="${m.id}">
            <header class="builder-module-header">
              <span class="builder-drag-handle"><i class="fas fa-grip-vertical"></i></span>
              <strong>${esc(m.title)}</strong>
              <div class="builder-actions">
                <button class="icon-btn btn-xs" data-action="edit-module" data-id="${m.id}">
                  <i class="fas fa-pen"></i></button>
                <button class="icon-btn btn-xs" data-action="add-lesson" data-module="${m.id}">
                  <i class="fas fa-plus"></i></button>
                <button class="icon-btn btn-xs" data-action="delete-module" data-id="${m.id}">
                  <i class="fas fa-trash"></i></button>
              </div>
            </header>
            <div class="builder-lessons">
              ${(m.lessons || []).map(l => `
                <div class="builder-lesson" data-lesson-id="${l.id}">
                  <i class="fas ${lessonIcon(l.lesson_type)}"></i>
                  <span>${esc(l.title)}</span>
                  <span class="builder-lesson-type">${esc(l.lesson_type)}</span>
                  <div class="builder-lesson-actions">
                    <button class="icon-btn btn-xs" data-action="edit-lesson" data-id="${l.id}">
                      <i class="fas fa-pen"></i></button>
                    <button class="icon-btn btn-xs" data-action="delete-lesson" data-id="${l.id}">
                      <i class="fas fa-trash"></i></button>
                  </div>
                </div>
              `).join('') || '<p class="empty-row">No lessons in this module</p>'}
            </div>
          </div>
        `).join('') : `
          <div class="empty-state">
            <i class="fas fa-layer-group"></i>
            <h3>No modules yet</h3>
            <p>Start by creating your first module.</p>
            <button class="btn btn-primary" data-action="add-module" data-id="${courseId}">
              <i class="fas fa-plus"></i> Create First Module</button>
          </div>
        `}
      </div>

      <div class="builder-sidebar">
        <div class="panel">
          <h3 class="panel-title">Course Settings</h3>
          <label class="form-group"><span class="form-label">Status</span>
            <select id="builder-course-status" class="form-select">
              ${['draft','active','paused','completed','archived'].map(s => `
                <option value="${s}" ${course.status === s ? 'selected' : ''}>${s}</option>
              `).join('')}
            </select>
          </label>
          <label class="form-group"><span class="form-label">Price ($)</span>
            <input id="builder-course-price" type="number" class="form-input" value="${course.price || 0}" />
          </label>
          <label class="form-group"><span class="form-label">Level</span>
            <select id="builder-course-level" class="form-select">
              ${['beginner','intermediate','advanced'].map(l => `
                <option value="${l}" ${course.level === l ? 'selected' : ''}>${l}</option>
              `).join('')}
            </select>
          </label>
          <div class="panel-actions">
            <button class="btn btn-primary btn-block" data-action="save-course-settings" data-id="${courseId}">
              <i class="fas fa-save"></i> Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function expertCourseAnalytics() {
  const a = S.courseAnalytics || {};
  const courses = a.courses || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Course Analytics</span></div>
    <section class="page-header">
      <h1 class="page-title">Course Analytics</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-course-analytics">
          <i class="fas fa-download"></i> Export</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Enrollments</p><p class="stat-value">${a.totalEnrollments || 0}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completion Rate</p><p class="stat-value">${a.avgCompletion || 0}%</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Avg. Rating</p><p class="stat-value">${a.avgRating || 0}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Revenue (30d)</p><p class="stat-value">${fmtCur(a.revenue30d || 0)}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-dollar-sign"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Course Performance</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Course</th><th>Enrolled</th><th>Completed</th>
              <th>Avg. Progress</th><th>Rating</th><th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${courses.map(c => `
              <tr>
                <td>${esc(c.title)}</td>
                <td>${c.enrolled || 0}</td>
                <td>${c.completed || 0}</td>
                <td>${renderMiniBar(c.avg_progress, '#1e3a8a')} ${c.avg_progress || 0}%</td>
                <td>${Number(c.avg_rating || 0).toFixed(1)} / 5</td>
                <td>${fmtCur(c.revenue || 0)}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-row">No course data</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Enrollment Trend</h3>
        <canvas id="chartCourseEnrollment" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Completion by Course</h3>
        <canvas id="chartCourseCompletion" height="200"></canvas>
      </div>
    </section>
  `;
}

function expertEvents() {
  const mine = S.events.filter(e => e.expert_id === currentUser?.id);
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Events</span></div>
    <section class="page-header"><h1 class="page-title">My Events</h1></section>
    <section class="panel">
      ${mine.map(ev => `
        <article class="event-card">
          <div class="event-date">
            <span class="event-day">${new Date(ev.date || ev.created_at).getDate()}</span>
            <span class="event-month">${new Date(ev.date || ev.created_at).toLocaleString('en-US', { month: 'short' })}</span>
          </div>
          <div class="event-body">
            <h4 class="event-title">${esc(ev.title || '')}</h4>
            <p class="event-desc">${esc(ev.description || '')}</p>
            <p class="event-meta">${ev.registered_count || 0} registered of ${ev.capacity || 0}</p>
          </div>
        </article>
      `).join('') || '<p class="empty-row">No events assigned to you</p>'}
    </section>
  `;
}

function expertPortfolioView() {
  const items = S.expertPortfolio || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Portfolio</span></div>
    <section class="page-header">
      <h1 class="page-title">Portfolio and Case Studies</h1>
      <button class="btn btn-primary" data-action="add-portfolio-item">
        <i class="fas fa-plus"></i> Add Item</button>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Your portfolio appears on your public profile.
        Share case studies, client outcomes and testimonials to build credibility.
      </div>
    </div>

    <section class="card-grid">
      ${items.map(item => `
        <article class="program-card">
          <span class="chip chip-blue">${esc(item.category || 'Case Study')}</span>
          <h4 class="program-title">${esc(item.title || '')}</h4>
          <p class="program-desc">${esc((item.description || '').slice(0, 140))}</p>
          <footer class="program-footer">
            <span class="program-meta">${fmtDate(item.created_at)}</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px">
            <button class="btn btn-secondary btn-sm" data-action="edit-portfolio-item" data-id="${item.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-action="delete-portfolio-item" data-id="${item.id}">Delete</button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-briefcase"></i>
          <h3>No portfolio items yet</h3>
          <p>Add case studies to showcase your expertise.</p>
          <button class="btn btn-primary" data-action="add-portfolio-item">
            <i class="fas fa-plus"></i> Add First Item</button>
        </div>
      `}
    </section>
  `;
}

function expertPublicQuestions() {
  const questions = S.expertQuestions || [];
  const unanswered = questions.filter(q => !q.answer);
  const answered = questions.filter(q => q.answer);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Public Q&A</span></div>
    <section class="page-header">
      <h1 class="page-title">Public Q&A</h1>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Answer public questions to attract clients. Your answers appear on your profile.
      </div>
    </div>

    <section class="panel">
      <h3 class="panel-title">Awaiting Answer (${unanswered.length})</h3>
      ${unanswered.length ? unanswered.map(q => `
        <div class="qa-item">
          <p class="qa-q"><i class="fas fa-question-circle"></i> ${esc(q.question)}</p>
          <p class="qa-pending">
            Asked ${timeAgo(q.created_at)} by ${esc(q.asker_name || 'Anonymous')}
          </p>
          <div style="margin-top:8px">
            <button class="btn btn-primary btn-sm" data-action="answer-question" data-id="${q.id}">
              <i class="fas fa-reply"></i> Answer</button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">No pending questions</p>'}
    </section>

    <section class="panel">
      <h3 class="panel-title">Answered (${answered.length})</h3>
      ${answered.length ? answered.map(q => `
        <div class="qa-item">
          <p class="qa-q"><i class="fas fa-question-circle"></i> ${esc(q.question)}</p>
          <p class="qa-a"><strong>You:</strong> ${esc(q.answer)}</p>
          <p class="qa-pending" style="margin-top:4px">
            Answered ${timeAgo(q.answered_at)}
          </p>
        </div>
      `).join('') : '<p class="empty-row">No answered questions yet</p>'}
    </section>
  `;
}

function expertEarnings() {
  const s = S.earnings || {};
  const ledger = S.wallet.ledger || [];
  const last30 = ledger.filter(l => {
    const d = new Date(l.created_at);
    return (Date.now() - d.getTime()) < 30 * 86400000;
  });
  const earned30 = last30
    .filter(l => Number(l.amount) > 0)
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Earnings</span></div>
    <section class="page-header"><h1 class="page-title">My Earnings</h1></section>

    <section class="stat-grid">
      <div class="stat-card dashboard-card">
        <div class="stat-info">
          <p class="stat-label">Total Earned</p>
          <p class="stat-value">${fmtCur(s.total_earned || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info">
          <p class="stat-label">Available Balance</p>
          <p class="stat-value">${fmtCur(s.available_balance || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-wallet"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info">
          <p class="stat-label">Paid Out</p>
          <p class="stat-value">${fmtCur(s.total_paid_out || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-money-bill-transfer"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info">
          <p class="stat-label">Last 30 Days</p>
          <p class="stat-value">${fmtCur(earned30)}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-chart-line"></i></div>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      Platform commission: <strong>${CONFIG.PLATFORM_COMMISSION}%</strong> ·
      Withdrawal hold: <strong>${CONFIG.WITHDRAWAL_HOLD_DAYS} days</strong> ·
      Minimum payout: <strong>${fmtCur(CONFIG.MIN_PAYOUT)}</strong>
    </div>

    <section class="panel">
      <h3 class="panel-title">Request Withdrawal</h3>
      <div class="form-inline">
        <input type="number" id="withdrawAmount" class="form-input"
               placeholder="Amount (min ${fmtCur(CONFIG.MIN_PAYOUT)})" />
        <select id="withdrawMethod" class="form-select">
          <option value="bank_transfer">Bank Transfer</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="paypal">PayPal</option>
          <option value="stripe">Stripe</option>
        </select>
        <button class="btn btn-primary" data-action="request-withdrawal">
          <i class="fas fa-paper-plane"></i> Request</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Recent Wallet Activity</h3>
      <ul class="list-stack">
        ${ledger.slice(0, 30).map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.reason || '')}</span>
              <span class="list-row-sub">${fmtDT(l.created_at)}</span>
            </div>
            <span class="list-row-price" style="color:${l.amount >= 0 ? 'var(--accent)' : 'var(--danger)'}">
              ${l.amount >= 0 ? '+' : ''}${fmtCur(l.amount)}
            </span>
          </li>
        `).join('') || '<li class="empty-row">No activity yet</li>'}
      </ul>
    </section>
  `;
}

function expertWithdrawals() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Withdrawals</span></div>
    <section class="page-header"><h1 class="page-title">Withdrawals</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${S.payouts.map(w => `
              <tr>
                <td>${fmtDate(w.created_at)}</td>
                <td>${fmtCur(w.amount || 0)}</td>
                <td>${esc(w.method || '')}</td>
                <td><span class="${statusClass(w.status)}">${esc(w.status || '')}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="4" class="empty-row">No withdrawals yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function expertReviews() {
  const reviews = S.reviews || [];
  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : '0.0';

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Reviews</span></div>
    <section class="page-header"><h1 class="page-title">My Reviews</h1></section>

    <div class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Average Rating</p><p class="stat-value">${avg}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Reviews</p><p class="stat-value">${reviews.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-comment"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">5-Star Reviews</p><p class="stat-value">${reviews.filter(r => r.rating === 5).length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-thumbs-up"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">With Replies</p><p class="stat-value">${reviews.filter(r => r.reply).length}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-reply"></i></div>
      </div>
    </div>

    <section class="panel">
      ${reviews.length ? reviews.map(r => `
        <article class="review-card">
          <header class="review-header">
            <span class="review-author">${esc(r.author_name || 'Anonymous')}</span>
            <span class="star-rating">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span>
            <span class="review-date">${fmtDate(r.created_at)}</span>
          </header>
          <p class="review-body">${esc(r.comment || '')}</p>
          ${r.reply
            ? `<div class="alert alert-info" style="margin-top:10px">
                <i class="fas fa-reply"></i>
                <strong>Your reply:</strong> ${esc(r.reply)}
              </div>`
            : `<footer class="review-actions">
                <button class="btn btn-secondary btn-sm" data-action="reply-review" data-id="${r.id}">
                  <i class="fas fa-reply"></i> Reply</button>
              </footer>`
          }
        </article>
      `).join('') : `
        <div class="empty-state">
          <i class="fas fa-star"></i>
          <h3>No reviews yet</h3>
          <p>Complete consultations to receive reviews from clients.</p>
        </div>
      `}
    </section>
  `;
}

function expertConsultationAnalytics() {
  const a = S.expertConsultationAnalytics || { stats: {}, peak_hours: [] };
  const s = a.stats || {};
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultation Stats</span></div>
    <section class="page-header"><h1 class="page-title">Consultation Statistics</h1></section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed Sessions</p><p class="stat-value">${s.completed_sessions || 0}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Unique Clients</p><p class="stat-value">${s.unique_clients || 0}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Avg. Duration</p><p class="stat-value">${Math.round(s.avg_duration || 0)}m</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Cancellations</p><p class="stat-value">${s.cancelled || 0}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-times"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Peak Booking Hours</h3>
      <ul class="list-stack">
        ${(a.peak_hours || []).map(h => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${String(h.hr).padStart(2, '0')}:00</span>
            </div>
            <span class="chip chip-neutral">${h.c} booking${h.c === 1 ? '' : 's'}</span>
          </li>
        `).join('') || '<li class="empty-row">No booking data</li>'}
      </ul>
    </section>
  `;
}

function expertProfile() {
  const portfolioCount = (S.expertPortfolio || []).length;
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
    <section class="page-header">
      <h1 class="page-title">My Profile</h1>
      <button class="btn btn-secondary" data-action="view-public-profile">
        <i class="fas fa-eye"></i> Preview Public Profile</button>
    </section>

    <section class="panel">
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(currentUser?.name || '')}</h2>
          <p class="profile-email">${esc(currentUser?.email || '')}</p>
          <p style="margin-top:6px">
            <span class="chip chip-neutral">${esc(currentUser?.specialization || 'No specialization')}</span>
            <span class="chip chip-blue" style="margin-left:6px">
              ${portfolioCount} portfolio item${portfolioCount === 1 ? '' : 's'}
            </span>
          </p>
        </div>
      </div>

      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Specialization</span>
          <input id="profileSpecialization" class="form-input"
                 value="${esc(currentUser?.specialization || '')}" />
        </label>
        <label class="form-group">
          <span class="form-label">Hourly rate ($)</span>
          <input id="profileRate" type="number" class="form-input"
                 value="${currentUser?.hourly_rate || ''}" />
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Bio</span>
          <textarea id="profileBio" class="form-textarea" rows="4">${esc(currentUser?.bio || '')}</textarea>
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Change avatar</span>
          <input type="file" id="avatarFile" class="form-input" accept="image/*" />
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="update-expert-profile">
          <i class="fas fa-save"></i> Update Profile</button>
      </div>

      <h3 class="panel-title" style="margin-top:24px">Change Password</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Current password</span>
          <input id="cpOld" type="password" class="form-input" /></label>
        <label class="form-group"><span class="form-label">New password</span>
          <input id="cpNew" type="password" class="form-input" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-warning" data-action="change-password">
          <i class="fas fa-lock"></i> Update Password</button>
      </div>
    </section>
  `;
}

/* ============================================================
   END OF PORTION 2
   Portion 3 continues with Learner and E-School dashboards.
   ============================================================ */
   /* ============================================================
   USER / LEARNER DASHBOARD (Portion 3)
   ============================================================ */
function renderUserDashboard() {
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const intent = S.userIntent || currentUser?.intent || 'both';
  const showLearn   = intent === 'learn'   || intent === 'both';
  const showConsult = intent === 'consult' || intent === 'both';

  const activeCons = mine.filter(c =>
    ['pending_payment','pending_expert_confirmation','confirmed','scheduled','in_grace','in_session'].includes(c.status)
  ).length;
  const unreadBadges = S.userBadges.length;

  const nav = `
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}
    ${showLearn ? sidebarItem('eschool','E-School','fa-school') : ''}
    ${showLearn ? sidebarItem('my-learning','My Learning','fa-graduation-cap') : ''}
    ${showLearn ? sidebarItem('learning-paths','Learning Paths','fa-route') : ''}
    ${showLearn ? sidebarItem('bundles','Bundles','fa-box-open') : ''}
    ${showLearn ? sidebarItem('wishlist','Wishlist','fa-heart') : ''}
    ${showLearn ? sidebarItem('certificates','Certificates','fa-certificate') : ''}
    ${showLearn ? sidebarItem('achievements','Achievements','fa-trophy', unreadBadges)}
    ${showLearn ? sidebarItem('course-notes','My Notes','fa-sticky-note') : ''}
    ${sidebarItem('events','Events','fa-calendar-alt')}
    ${showConsult ? sidebarItem('experts','Find Experts','fa-search') : ''}
    ${sidebarItem('consultations','My Consultations','fa-comments', activeCons)}
    ${showConsult ? sidebarItem('packages','Session Packages','fa-ticket-alt') : ''}
    ${showConsult ? sidebarItem('shortlist','Shortlist','fa-bookmark') : ''}
    ${sidebarItem('wallet','Wallet','fa-wallet')}
    ${sidebarItem('transactions','Transactions','fa-receipt')}
    ${showLearn ? sidebarItem('refunds','Refund Requests','fa-rotate-left') : ''}
    ${sidebarItem('claims','Claims','fa-gavel')}
    ${sidebarItem('support','Support','fa-headset')}
    ${sidebarItem('profile','Profile','fa-user')}
  `;
  shell({
    roleClass: 'role-user',
    brandIcon: 'fa-user-circle',
    brandTitle: 'My Panel',
    brandSubtitle: 'ExpertHub',
    nav,
    roleLabel: 'User Panel',
    content: renderUserContent(),
  });
  attachRoleEvents();
}

function renderUserContent() {
  switch (activeTab) {
    case 'dashboard':       return userOverview();
    case 'eschool':         return userESchool();
    case 'my-learning':     return userMyLearning();
    case 'learning-paths':  return userLearningPaths();
    case 'bundles':         return userBundles();
    case 'wishlist':        return userWishlist();
    case 'certificates':    return userCertificates();
    case 'achievements':    return userAchievements();
    case 'course-notes':    return userCourseNotes();
    case 'events':          return userEvents();
    case 'experts':         return userFindExperts();
    case 'consultations':   return userConsultations();
    case 'packages':        return userPackages();
    case 'shortlist':       return userShortlist();
    case 'wallet':          return userWallet();
    case 'transactions':    return userTransactions();
    case 'refunds':         return userRefundRequests();
    case 'claims':          return userClaims();
    case 'support':         return userSupport();
    case 'profile':         return userProfile();
    default:                return userOverview();
  }
}

function userOverview() {
  const intent = S.userIntent || currentUser?.intent || 'both';
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const activeCons = mine.filter(c =>
    ['pending_payment','pending_expert_confirmation','confirmed','scheduled','in_grace','in_session'].includes(c.status)
  ).length;

  const inProgress = S.enrollments.filter(e => e.progress > 0 && e.progress < 100).slice(0, 3);
  const completedCount = S.enrollments.filter(e => Number(e.progress) >= 100).length;
  const totalProgress = S.enrollments.length
    ? Math.round(S.enrollments.reduce((s, e) => s + Number(e.progress || 0), 0) / S.enrollments.length)
    : 0;

  const xp = S.userXP || 0;
  const level = S.userLevel || levelFromXP(xp);
  const streak = S.userStreak?.current || 0;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Dashboard</span></div>
    <section class="page-header">
      <h1 class="page-title">Welcome, ${esc(currentUser?.name || 'User')}</h1>
      <div class="page-actions">
        <span class="chip chip-neutral">
          Mode: ${intent === 'both' ? 'Learning and Consulting' : intent === 'learn' ? 'Learning' : 'Consulting'}
        </span>
        <button class="btn btn-secondary btn-sm" data-action="change-intent">
          <i class="fas fa-sliders"></i> Change Mode</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Level</p>
          <p class="stat-value">${level}</p>
          <p class="stat-sub">${xp} XP total</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-medal"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Current Streak</p>
          <p class="stat-value">${streak}</p>
          <p class="stat-sub">Longest: ${S.userStreak?.longest || 0} days</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-fire"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Enrollments</p>
          <p class="stat-value">${S.enrollments.length}</p>
          <p class="stat-sub">${completedCount} completed</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-graduation-cap"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Consultations</p>
          <p class="stat-value">${activeCons}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-comments"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Wallet Balance</p>
          <p class="stat-value">${fmtCur(S.wallet.balance || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-wallet"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Badges Earned</p>
          <p class="stat-value">${S.userBadges.length}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-award"></i></div>
      </div>
    </section>

    ${inProgress.length ? `
      <section class="panel">
        <h3 class="panel-title">Continue Learning</h3>
        ${inProgress.map(e => `
          <div class="enrollment-card">
            <h3 class="enrollment-title">${esc(e.title || '')}</h3>
            <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
            <div class="progress-bar"><span style="width:${e.progress || 0}%"></span></div>
            <p class="enrollment-progress">${e.progress || 0}% complete</p>
            <button class="btn btn-primary btn-sm" data-action="resume-course" data-id="${e.id}">
              <i class="fas fa-play"></i> Resume</button>
          </div>
        `).join('')}
      </section>
    ` : ''}

    <section class="dashboard-columns">
      ${intent !== 'consult' ? `
        <article class="dashboard-card tile-card">
          <i class="fas fa-school tile-icon"></i>
          <h3 class="tile-title">E-School</h3>
          <p class="tile-desc">Bootcamps, courses, tuition and exam prep</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">Explore</button>
        </article>
        <article class="dashboard-card tile-card">
          <i class="fas fa-graduation-cap tile-icon"></i>
          <h3 class="tile-title">My Learning</h3>
          <p class="tile-desc">Continue where you left off</p>
          <button class="btn btn-info" data-action="switch-tab" data-tab="my-learning">Open</button>
        </article>
        <article class="dashboard-card tile-card">
          <i class="fas fa-trophy tile-icon"></i>
          <h3 class="tile-title">Achievements</h3>
          <p class="tile-desc">${S.userBadges.length} badge${S.userBadges.length === 1 ? '' : 's'} earned</p>
          <button class="btn btn-warning" data-action="switch-tab" data-tab="achievements">View</button>
        </article>
      ` : ''}
      ${intent !== 'learn' ? `
        <article class="dashboard-card tile-card">
          <i class="fas fa-user-tie tile-icon"></i>
          <h3 class="tile-title">Find Experts</h3>
          <p class="tile-desc">Book 1-on-1 consultations</p>
          <button class="btn btn-success" data-action="switch-tab" data-tab="experts">Browse</button>
        </article>
        <article class="dashboard-card tile-card">
          <i class="fas fa-comments tile-icon"></i>
          <h3 class="tile-title">Consultations</h3>
          <p class="tile-desc">${activeCons} active request${activeCons === 1 ? '' : 's'}</p>
          <button class="btn btn-purple" data-action="switch-tab" data-tab="consultations">Open</button>
        </article>
      ` : ''}
      <article class="dashboard-card tile-card">
        <i class="fas fa-certificate tile-icon"></i>
        <h3 class="tile-title">Certificates</h3>
        <p class="tile-desc">${S.certificates.length} earned</p>
        <button class="btn btn-info" data-action="switch-tab" data-tab="certificates">View</button>
      </article>
    </section>
  `;
}

/* ============================================================
   E-SCHOOL — COURSE CATALOG
   ============================================================ */
function userESchool() {
  const tabs = [
    { id:'courses',     label:'All Courses',      icon:'fa-th-large' },
    { id:'bootcamp',    label:'Bootcamps',        icon:'fa-fire' },
    { id:'short_course',label:'Short Courses',    icon:'fa-bolt' },
    { id:'tuition',     label:'Tuition',          icon:'fa-chalkboard-teacher' },
    { id:'exam_prep',   label:'Exam Prep',        icon:'fa-file-alt' },
    { id:'career',      label:'Career',           icon:'fa-briefcase' },
    { id:'certification',label:'Certifications',  icon:'fa-certificate' },
  ];
  const query = ($('#eschool-search')?.value || '').toLowerCase();
  const levelFilter = $('#eschool-level')?.value || '';

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>E-School</span></div>
    <section class="page-header">
      <h1 class="page-title">E-School Learning Hub</h1>
      <div class="page-actions">
        <input type="search" id="eschool-search" class="form-input"
               placeholder="Search courses..." value="${esc(query)}" style="max-width:240px" />
        <select id="eschool-level" class="form-select" style="max-width:150px">
          <option value="">All levels</option>
          <option value="beginner" ${levelFilter === 'beginner' ? 'selected' : ''}>Beginner</option>
          <option value="intermediate" ${levelFilter === 'intermediate' ? 'selected' : ''}>Intermediate</option>
          <option value="advanced" ${levelFilter === 'advanced' ? 'selected' : ''}>Advanced</option>
        </select>
      </div>
    </section>

    <nav class="tab-bar">
      ${tabs.map(t => `
        <button class="tab-btn ${activeESchoolTab === t.id ? 'tab-btn-active' : ''}"
                data-eschool-tab="${t.id}">
          <i class="fas ${t.icon}"></i> ${t.label}</button>
      `).join('')}
    </nav>

    <section class="panel" id="eschool-panel">${renderESchoolPanel()}</section>
  `;
}

function renderESchoolPanel() {
  const filter = activeESchoolTab === 'courses' ? null : activeESchoolTab;
  const query = ($('#eschool-search')?.value || '').toLowerCase();
  const levelFilter = $('#eschool-level')?.value || '';

  let list = filter ? S.courses.filter(c => c.course_type === filter) : S.courses;
  if (query) list = list.filter(c =>
    (c.title || '').toLowerCase().includes(query) ||
    (c.description || '').toLowerCase().includes(query) ||
    (c.category || '').toLowerCase().includes(query)
  );
  if (levelFilter) list = list.filter(c => c.level === levelFilter);

  if (!list.length) {
    return `
      <div class="empty-state">
        <i class="fas fa-book-open"></i>
        <h3>No courses found</h3>
        <p>Try adjusting your filters or search term.</p>
      </div>`;
  }

  return `
    <div class="card-grid">
      ${list.map(c => {
        const enrolled = S.enrolledCourseIds.has(String(c.id));
        const inWishlist = S.wishlistIds.has(String(c.id));
        return `
          <article class="program-card">
            <div style="display:flex;justify-content:space-between;gap:8px">
              <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
              <span class="chip chip-neutral">${esc(c.level || '')}</span>
            </div>
            <h4 class="program-title">${esc(c.title || '')}</h4>
            <p class="program-desc">${esc((c.description || '').slice(0, 120))}</p>
            ${c.expert_name ? `<p class="program-meta"><i class="fas fa-user-tie"></i> ${esc(c.expert_name)}</p>` : ''}
            <footer class="program-footer">
              <span class="program-price">${fmtCur(c.price || 0)}</span>
              <span class="program-meta">
                ${c.duration_weeks ? c.duration_weeks + 'w' : (c.duration_hours || 0) + 'h'} ·
                ${c.enrolled_count || 0} enrolled
              </span>
            </footer>
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              ${enrolled
                ? `<button class="btn btn-success btn-sm flex-1" data-action="open-course-player" data-id="${c.id}">
                    <i class="fas fa-play"></i> Continue</button>`
                : `<button class="btn btn-primary btn-sm flex-1" data-action="enroll-modal" data-id="${c.id}">
                    <i class="fas fa-shopping-cart"></i> Enroll</button>`
              }
              <button class="btn btn-secondary btn-sm" data-action="view-course-detail" data-id="${c.id}">
                <i class="fas fa-eye"></i></button>
              <button class="btn btn-secondary btn-sm" data-action="toggle-wishlist" data-id="${c.id}">
                <i class="fas fa-heart" style="color:${inWishlist ? 'var(--danger)' : 'inherit'}"></i>
              </button>
            </div>
          </article>
        `;
      }).join('')}
    </div>`;
}

/* ============================================================
   E-SCHOOL — COURSE DETAIL / PREVIEW (public)
   ============================================================ */
async function openCourseDetailModal(courseId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/eschool/courses/${courseId}/curriculum`);
    const course = d.course || {};
    const modules = d.modules || [];
    const enrolled = S.enrolledCourseIds.has(String(courseId));

    const totalLessons = modules.reduce((s, m) => s + (m.lessons || []).length, 0);
    const totalMinutes = modules.reduce((s, m) =>
      s + (m.lessons || []).reduce((ss, l) => ss + (l.duration_minutes || 0), 0), 0);

    openModal({
      title: course.title || 'Course',
      className: 'modal-lg',
      body: `
        <div class="course-detail-hero">
          <div>
            <span class="chip chip-blue">${esc(course.course_type || '')}</span>
            <span class="chip chip-neutral" style="margin-left:6px">${esc(course.level || '')}</span>
          </div>
          <p class="course-detail-desc">${esc(course.description || '')}</p>
          <div class="course-detail-stats">
            <div><strong>${totalLessons}</strong><span>Lessons</span></div>
            <div><strong>${Math.round(totalMinutes / 60)}h</strong><span>Video</span></div>
            <div><strong>${course.enrolled_count || 0}</strong><span>Enrolled</span></div>
            <div><strong>${Number(course.average_rating || 0).toFixed(1)}</strong><span>Rating</span></div>
          </div>
        </div>

        <h3 class="panel-title" style="margin-top:20px">Curriculum</h3>
        <div class="curriculum-list">
          ${modules.map(m => `
            <div class="curriculum-module">
              <div class="curriculum-module-header">
                <strong>${esc(m.title)}</strong>
                <span class="program-meta">${(m.lessons || []).length} lesson${(m.lessons || []).length === 1 ? '' : 's'}</span>
              </div>
              ${(m.lessons || []).map(l => `
                <div class="curriculum-lesson ${l.is_preview ? 'is-preview' : ''}">
                  <i class="fas ${lessonIcon(l.lesson_type)}"></i>
                  <span class="curriculum-lesson-title">${esc(l.title)}</span>
                  <span class="curriculum-lesson-meta">${l.duration_minutes || 0} min</span>
                  ${l.is_preview
                    ? `<span class="chip chip-green">Preview</span>`
                    : `<i class="fas fa-lock curriculum-lock"></i>`}
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        ${!enrolled ? `
          <button class="btn btn-secondary" data-action="start-free-trial" data-id="${courseId}">
            <i class="fas fa-hourglass-half"></i> Free Trial</button>
          <button class="btn btn-primary" data-action="enroll-modal" data-id="${courseId}"
                  onclick="closeModal()">
            <i class="fas fa-shopping-cart"></i> Enroll for ${fmtCur(course.price || 0)}</button>
        ` : `
          <button class="btn btn-success" data-action="open-course-player" data-id="${courseId}"
                  onclick="closeModal()">
            <i class="fas fa-play"></i> Continue Learning</button>
        `}
      `,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

/* ============================================================
   E-SCHOOL — COURSE PLAYER (lesson viewer)
   ============================================================ */
async function openCoursePlayer(courseId, lessonId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/eschool/courses/${courseId}/curriculum`);
    const course = d.course || {};
    const modules = d.modules || [];
    const allLessons = modules.flatMap(m => m.lessons || []);
    const currentLesson = lessonId
      ? allLessons.find(l => String(l.id) === String(lessonId))
      : allLessons[0];
    if (!currentLesson) {
      return showToast('No lessons in this course yet', 'warning');
    }

    S.__currentCourseId = courseId;
    S.__currentLessonId = currentLesson.id;

    const [lessonData, notesData, qaData] = await Promise.all([
      apiCall(`/api/eschool/lessons/${currentLesson.id}`).catch(() => ({ lesson: currentLesson, progress: null })),
      apiCall(`/api/eschool/lessons/${currentLesson.id}/notes`).catch(() => ({ notes: [] })),
      apiCall(`/api/eschool/lessons/${currentLesson.id}/questions`).catch(() => ({ questions: [] })),
    ]);

    S.currentLesson = lessonData.lesson || currentLesson;
    S.currentLessonProgress = lessonData.progress || null;
    S.lessonNotes = notesData.notes || [];
    S.lessonQuestions = qaData.questions || [];

    const completedLessons = allLessons.filter(l => l.progress?.status === 'completed').map(l => l.id);
    const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
    const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

    openModal({
      title: `${course.title} — Lesson ${currentIndex + 1} of ${allLessons.length}`,
      className: 'course-player-modal',
      body: `
        <div class="course-player-layout">
          <aside class="course-player-sidebar">
            <h3 class="panel-title">Curriculum</h3>
            ${modules.map(m => `
              <div class="player-module">
                <div class="player-module-header">${esc(m.title)}</div>
                ${(m.lessons || []).map(l => `
                  <div class="player-lesson ${l.id === currentLesson.id ? 'active' : ''} ${completedLessons.includes(l.id) ? 'completed' : ''}"
                       data-lesson-id="${l.id}">
                    <i class="fas ${completedLessons.includes(l.id) ? 'fa-check-circle' : lessonIcon(l.lesson_type)}"></i>
                    <span>${esc(l.title)}</span>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </aside>

          <main class="course-player-main">
            <div id="lesson-content-host">${renderLessonContent(S.currentLesson, S.currentLessonProgress)}</div>

            <nav class="course-player-nav">
              ${prevLesson
                ? `<button class="btn btn-secondary btn-sm" data-action="open-lesson" data-course="${courseId}" data-lesson="${prevLesson.id}">
                    <i class="fas fa-arrow-left"></i> Previous</button>`
                : '<span></span>'}
              <button class="btn btn-primary btn-sm" data-action="mark-lesson-complete" data-lesson="${currentLesson.id}">
                <i class="fas fa-check"></i> Mark Complete</button>
              ${nextLesson
                ? `<button class="btn btn-secondary btn-sm" data-action="open-lesson" data-course="${courseId}" data-lesson="${nextLesson.id}">
                    Next <i class="fas fa-arrow-right"></i></button>`
                : '<span></span>'}
            </nav>

            <div class="tabs-course-player">
              <button class="tab-btn tab-btn-active" data-player-tab="notes">
                <i class="fas fa-sticky-note"></i> Notes</button>
              <button class="tab-btn" data-player-tab="qa">
                <i class="fas fa-question-circle"></i> Q&A</button>
              <button class="tab-btn" data-player-tab="discussion">
                <i class="fas fa-comments"></i> Discussion</button>
            </div>

            <div id="player-tab-content"></div>
          </main>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close Course</button>`,
    });

    bindPlayerInteractions(courseId, currentLesson.id);
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function renderLessonContent(lesson, progress) {
  if (!lesson) return '<p class="empty-row">No lesson data</p>';
  const videoUrl = lesson.video_url || '';
  const content = lesson.content || lesson.description || '';

  return `
    <div class="lesson-content">
      <h2 class="lesson-title">${esc(lesson.title)}</h2>
      <div class="lesson-meta-row">
        <span class="chip chip-neutral">${esc(lesson.lesson_type || 'video')}</span>
        <span class="program-meta">${lesson.duration_minutes || 0} min</span>
        ${progress?.status === 'completed'
          ? '<span class="status status-active">Completed</span>'
          : progress?.status === 'in_progress'
          ? '<span class="status status-pending">In Progress</span>'
          : ''}
      </div>

      ${lesson.lesson_type === 'video' && videoUrl ? `
        <div class="lesson-video-wrap">
          <video id="lesson-video" controls preload="metadata" poster="${esc(lesson.thumbnail || '')}" style="width:100%">
            <source src="${esc(videoUrl)}" />
          </video>
        </div>
      ` : ''}

      ${lesson.lesson_type === 'reading' || content ? `
        <div class="lesson-body">
          ${content.replace(/\n/g, '<br/>')}
        </div>
      ` : ''}

      ${lesson.resources && JSON.parse(lesson.resources || '[]').length ? `
        <div class="lesson-resources">
          <h4>Resources</h4>
          ${JSON.parse(lesson.resources).map(r => `
            <a class="lesson-resource-link" href="${esc(r.url)}" target="_blank" rel="noopener">
              <i class="fas fa-download"></i> ${esc(r.name || 'Download')}
            </a>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function bindPlayerInteractions(courseId, lessonId) {
  /* Player sidebar lesson navigation */
  document.querySelectorAll('.player-lesson').forEach(el => {
    el.onclick = () => {
      const lid = el.dataset.lessonId;
      closeModal();
      openCoursePlayer(courseId, lid);
    };
  });

  /* Player tabs */
  document.querySelectorAll('[data-player-tab]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-player-tab]').forEach(b => b.classList.remove('tab-btn-active'));
      btn.classList.add('tab-btn-active');
      const tab = btn.dataset.playerTab;
      const host = $('#player-tab-content');
      if (tab === 'notes') host.innerHTML = renderLessonNotes();
      else if (tab === 'qa') host.innerHTML = renderLessonQA();
      else if (tab === 'discussion') host.innerHTML = renderLessonDiscussion(lessonId);
      bindPlayerTabEvents(courseId, lessonId);
    };
  });

  $('#player-tab-content').innerHTML = renderLessonNotes();
  bindPlayerTabEvents(courseId, lessonId);

  /* Video position tracking */
  const video = $('#lesson-video');
  if (video) {
    let lastSaved = 0;
    video.addEventListener('timeupdate', () => {
      const current = Math.floor(video.currentTime);
      if (current - lastSaved >= 10) {
        lastSaved = current;
        apiCall(`/api/eschool/lessons/${lessonId}/progress`, 'POST', {
          position_seconds: current,
          time_spent_seconds: 10,
        }).catch(() => {});
      }
    });
  }
}

function renderLessonNotes() {
  return `
    <div class="notes-panel">
      <div class="notes-add">
        <textarea id="new-note-text" class="form-textarea" rows="3"
                  placeholder="Write a note for this lesson..."></textarea>
        <button class="btn btn-primary btn-sm" id="add-note-btn">
          <i class="fas fa-plus"></i> Add Note</button>
      </div>
      <ul class="notes-list">
        ${S.lessonNotes.map(n => `
          <li class="note-item">
            <p class="note-content">${esc(n.content)}</p>
            <span class="note-time">${timeAgo(n.created_at)}</span>
          </li>
        `).join('') || '<li class="empty-row">No notes yet</li>'}
      </ul>
    </div>
  `;
}

function renderLessonQA() {
  return `
    <div class="qa-panel">
      <div class="qa-add">
        <input id="lesson-q-input" class="form-input" placeholder="Ask a question about this lesson..." />
        <button class="btn btn-primary btn-sm" id="lesson-q-btn">
          <i class="fas fa-paper-plane"></i> Ask</button>
      </div>
      <ul class="qa-list">
        ${S.lessonQuestions.map(q => `
          <li class="qa-item">
            <p class="qa-q"><i class="fas fa-question-circle"></i> ${esc(q.question)}</p>
            ${q.answer
              ? `<p class="qa-a"><strong>Answer:</strong> ${esc(q.answer)}</p>`
              : '<p class="qa-pending">Awaiting answer from instructor</p>'}
          </li>
        `).join('') || '<li class="empty-row">No questions yet. Be the first to ask!</li>'}
      </ul>
    </div>
  `;
}

function renderLessonDiscussion(lessonId) {
  const discussions = (S.courseDiscussions || []).filter(d => String(d.lesson_id) === String(lessonId));
  return `
    <div class="discussion-panel">
      <div class="discussion-add">
        <textarea id="discussion-input" class="form-textarea" rows="2"
                  placeholder="Start a discussion..."></textarea>
        <button class="btn btn-primary btn-sm" id="discussion-post-btn">
          <i class="fas fa-comment"></i> Post</button>
      </div>
      <ul class="discussion-list">
        ${discussions.map(d => `
          <li class="discussion-item">
            <img class="user-avatar" src="${avatar({ name: d.author_name })}" alt="" />
            <div class="discussion-body">
              <div class="discussion-author">
                <strong>${esc(d.author_name || 'Anonymous')}</strong>
                <span class="discussion-time">${timeAgo(d.created_at)}</span>
              </div>
              <p>${esc(d.body)}</p>
              <div class="discussion-actions">
                <button class="btn btn-ghost btn-xs" data-action="upvote-discussion" data-id="${d.id}">
                  <i class="fas fa-arrow-up"></i> ${d.upvotes || 0}</button>
              </div>
            </div>
          </li>
        `).join('') || '<li class="empty-row">No discussions yet</li>'}
      </ul>
    </div>
  `;
}

function bindPlayerTabEvents(courseId, lessonId) {
  const addNoteBtn = $('#add-note-btn');
  if (addNoteBtn) addNoteBtn.onclick = async () => {
    const text = $('#new-note-text').value.trim();
    if (!text) return;
    try {
      await apiCall(`/api/eschool/lessons/${lessonId}/notes`, 'POST', { content: text });
      const d = await apiCall(`/api/eschool/lessons/${lessonId}/notes`);
      S.lessonNotes = d.notes || [];
      $('#player-tab-content').innerHTML = renderLessonNotes();
      bindPlayerTabEvents(courseId, lessonId);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const askBtn = $('#lesson-q-btn');
  if (askBtn) askBtn.onclick = async () => {
    const q = $('#lesson-q-input').value.trim();
    if (!q) return;
    try {
      await apiCall(`/api/eschool/lessons/${lessonId}/questions`, 'POST', { question: q });
      const d = await apiCall(`/api/eschool/lessons/${lessonId}/questions`);
      S.lessonQuestions = d.questions || [];
      $('#player-tab-content').innerHTML = renderLessonQA();
      bindPlayerTabEvents(courseId, lessonId);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const postBtn = $('#discussion-post-btn');
  if (postBtn) postBtn.onclick = async () => {
    const body = $('#discussion-input').value.trim();
    if (!body) return;
    try {
      await apiCall('/api/eschool/discussions', 'POST', {
        course_id: courseId,
        lesson_id: lessonId,
        body,
      });
      const d = await apiCall(`/api/eschool/courses/${courseId}/discussions`);
      S.courseDiscussions = d.discussions || [];
      $('#player-tab-content').innerHTML = renderLessonDiscussion(lessonId);
      bindPlayerTabEvents(courseId, lessonId);
    } catch (e) { showToast(e.message, 'error'); }
  };
}

/* ============================================================
   E-SCHOOL — MY LEARNING (grouped view)
   ============================================================ */
function userMyLearning() {
  const enrollments = S.enrollments || [];
  const inProgress = enrollments.filter(e => Number(e.progress || 0) > 0 && Number(e.progress || 0) < 100);
  const notStarted = enrollments.filter(e => Number(e.progress || 0) === 0);
  const completed = enrollments.filter(e => Number(e.progress || 0) >= 100);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Learning</span></div>
    <section class="page-header">
      <h1 class="page-title">My Learning</h1>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">In Progress</p><p class="stat-value">${inProgress.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-play-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Not Started</p><p class="stat-value">${notStarted.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-hourglass-start"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed</p><p class="stat-value">${completed.length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Certificates</p><p class="stat-value">${S.certificates.length}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-award"></i></div>
      </div>
    </section>

    ${inProgress.length ? `
      <section class="panel">
        <h3 class="panel-title">In Progress</h3>
        ${inProgress.map(e => `
          <article class="enrollment-card">
            <h3 class="enrollment-title">${esc(e.title || '')}</h3>
            <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
            <div class="progress-bar"><span style="width:${e.progress || 0}%"></span></div>
            <p class="enrollment-progress">${e.progress || 0}% complete</p>
            <div class="panel-actions" style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" data-action="open-course-player" data-id="${e.course_id}">
                <i class="fas fa-play"></i> Resume</button>
              <button class="btn btn-secondary btn-sm" data-action="request-refund" data-id="${e.id}">
                <i class="fas fa-rotate-left"></i> Request Refund</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : ''}

    ${notStarted.length ? `
      <section class="panel">
        <h3 class="panel-title">Not Started</h3>
        ${notStarted.map(e => `
          <article class="enrollment-card">
            <h3 class="enrollment-title">${esc(e.title || '')}</h3>
            <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
            <button class="btn btn-success btn-sm" data-action="open-course-player" data-id="${e.course_id}">
              <i class="fas fa-play"></i> Start Learning</button>
          </article>
        `).join('')}
      </section>
    ` : ''}

    ${completed.length ? `
      <section class="panel">
        <h3 class="panel-title">Completed</h3>
        ${completed.map(e => `
          <article class="enrollment-card">
            <h3 class="enrollment-title">${esc(e.title || '')}</h3>
            <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
            <div class="progress-bar"><span style="width:100%;background:var(--accent)"></span></div>
            <p class="enrollment-progress">Completed ${e.completed_at ? 'on ' + fmtDate(e.completed_at) : ''}</p>
            <div class="panel-actions" style="display:flex;gap:6px">
              <button class="btn btn-secondary btn-sm" data-action="review-course" data-id="${e.course_id}">
                <i class="fas fa-star"></i> Review Course</button>
              <button class="btn btn-info btn-sm" data-action="view-certificate" data-course="${e.course_id}">
                <i class="fas fa-certificate"></i> Certificate</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : ''}

    ${!enrollments.length ? `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-graduation-cap"></i>
          <h3>No enrollments yet</h3>
          <p>Explore the E-School to start learning.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">
            <i class="fas fa-search"></i> Explore Courses</button>
        </div>
      </section>
    ` : ''}
  `;
}

/* ============================================================
   E-SCHOOL — LEARNING PATHS
   ============================================================ */
function userLearningPaths() {
  const paths = S.coursePaths || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Learning Paths</span></div>
    <section class="page-header">
      <h1 class="page-title">Learning Paths</h1>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-route"></i>
      <div>
        Structured curricula that guide you through multiple courses in sequence. Complete prerequisites to unlock advanced content.
      </div>
    </div>

    ${paths.length ? `
      <section class="card-grid">
        ${paths.map(lp => `
          <article class="program-card">
            <div style="display:flex;justify-content:space-between;gap:10px">
              <span class="chip chip-blue">${lp.step_count || 0} courses</span>
              <span class="${statusClass(lp.status || 'not_started')}">${esc(lp.status || '')}</span>
            </div>
            <h4 class="program-title">${esc(lp.title)}</h4>
            <p class="program-desc">${esc((lp.description || '').slice(0, 140))}</p>
            <div class="progress-bar" style="margin-top:8px">
              <span style="width:${lp.progress || 0}%"></span>
            </div>
            <p class="program-meta">${lp.progress || 0}% complete</p>
            <div class="panel-actions" style="margin-top:10px">
              <button class="btn btn-primary btn-sm" data-action="open-path-detail" data-id="${lp.id}">
                <i class="fas fa-route"></i> Open Path</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-route"></i>
          <h3>No learning paths available</h3>
          <p>Check back soon for curated paths.</p>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   E-SCHOOL — BUNDLES
   ============================================================ */
function userBundles() {
  const bundles = S.courseBundles || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Bundles</span></div>
    <section class="page-header">
      <h1 class="page-title">Course Bundles</h1>
    </section>

    ${bundles.length ? `
      <section class="card-grid">
        ${bundles.map(b => `
          <article class="program-card">
            ${b.discount_pct ? `<span class="chip chip-green">Save ${b.discount_pct}%</span>` : ''}
            <h4 class="program-title">${esc(b.title)}</h4>
            <p class="program-desc">${esc((b.description || '').slice(0, 120))}</p>
            <div class="pricing-price" style="margin:8px 0">
              ${fmtCur(b.price)}
              ${b.original_price ? `<span style="text-decoration:line-through;color:var(--text-muted);font-size:.9rem;margin-left:6px">${fmtCur(b.original_price)}</span>` : ''}
            </div>
            <p class="program-meta">${b.course_count || 0} courses included</p>
            <div class="panel-actions" style="margin-top:10px">
              <button class="btn btn-primary btn-sm" data-action="purchase-bundle" data-id="${b.id}">
                <i class="fas fa-shopping-cart"></i> Buy Bundle</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-box-open"></i>
          <h3>No bundles available</h3>
          <p>Curated bundles save you money. Check back soon.</p>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   E-SCHOOL — WISHLIST
   ============================================================ */
function userWishlist() {
  const wishlist = S.wishlist || [];
  const items = wishlist
    .map(w => S.courses.find(c => String(c.id) === String(w.course_id)))
    .filter(Boolean);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Wishlist</span></div>
    <section class="page-header"><h1 class="page-title">My Wishlist</h1></section>

    <section class="card-grid">
      ${items.map(c => `
        <article class="program-card">
          <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
          <h4 class="program-title">${esc(c.title || '')}</h4>
          <p class="program-desc">${esc((c.description || '').slice(0, 110))}</p>
          <footer class="program-footer">
            <span class="program-price">${fmtCur(c.price || 0)}</span>
            <span class="program-meta">${esc(c.level || '')}</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px">
            <button class="btn btn-primary btn-sm flex-1" data-action="enroll-modal" data-id="${c.id}">
              <i class="fas fa-shopping-cart"></i> Enroll</button>
            <button class="btn btn-danger btn-sm" data-action="toggle-wishlist" data-id="${c.id}">
              <i class="fas fa-heart"></i></button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-heart"></i>
          <h3>Your wishlist is empty</h3>
          <p>Save courses you want to take later.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">
            <i class="fas fa-search"></i> Browse Courses</button>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   E-SCHOOL — CERTIFICATES
   ============================================================ */
function userCertificates() {
  const certs = S.certificates || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Certificates</span></div>
    <section class="page-header">
      <h1 class="page-title">My Certificates</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-certificates">
          <i class="fas fa-download"></i> Export List</button>
      </div>
    </section>

    ${certs.length ? `
      <section class="card-grid">
        ${certs.map(c => `
          <article class="program-card certificate-card">
            <div class="certificate-badge">
              <i class="fas fa-certificate"></i>
            </div>
            <h4 class="program-title">${esc(c.course_title || '')}</h4>
            <p class="program-desc">
              Serial: <code class="code">${esc(c.serial || '')}</code>
            </p>
            <div class="certificate-meta">
              <div>
                <span class="form-label">Issued</span>
                <strong>${fmtDate(c.issued_at)}</strong>
              </div>
              ${c.final_score ? `
                <div>
                  <span class="form-label">Final Score</span>
                  <strong>${c.final_score}%</strong>
                </div>
              ` : ''}
              ${c.grade ? `
                <div>
                  <span class="form-label">Grade</span>
                  <strong>${esc(c.grade)}</strong>
                </div>
              ` : ''}
            </div>
            ${c.blockchain_hash ? `
              <div class="certificate-blockchain">
                <i class="fas fa-cube"></i>
                <span class="chip chip-green">Blockchain Verified</span>
                <code class="code" style="font-size:.65rem;margin-top:4px">
                  ${truncateHash(c.blockchain_hash, 8)}
                </code>
              </div>
            ` : ''}
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-secondary btn-sm" data-action="print-certificate" data-id="${c.id}">
                <i class="fas fa-print"></i> Print</button>
              <a class="btn btn-info btn-sm" href="/verify/${esc(c.serial)}" target="_blank" rel="noopener">
                <i class="fas fa-external-link-alt"></i> Verify</a>
              ${c.linkedin_share_url ? `
                <a class="btn btn-primary btn-sm" href="${esc(c.linkedin_share_url)}" target="_blank" rel="noopener">
                  <i class="fab fa-linkedin"></i> Share</a>
              ` : ''}
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-certificate"></i>
          <h3>No certificates yet</h3>
          <p>Complete a course to earn your first certificate.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="my-learning">
            <i class="fas fa-graduation-cap"></i> View My Learning</button>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   E-SCHOOL — ACHIEVEMENTS (gamification)
   ============================================================ */
function userAchievements() {
  const xp = S.userXP || 0;
  const level = S.userLevel || levelFromXP(xp);
  const streak = S.userStreak || { current: 0, longest: 0 };
  const badges = S.userBadges || [];
  const allBadges = Object.entries(CONFIG.BADGES).map(([code, b]) => ({ code, ...b }));

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Achievements</span></div>
    <section class="page-header"><h1 class="page-title">Achievements</h1></section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Current Level</p>
          <p class="stat-value">${level}</p>
          <p class="stat-sub">${xp} XP total</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-medal"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Current Streak</p>
          <p class="stat-value">${streak.current} days</p>
          <p class="stat-sub">Best: ${streak.longest} days</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-fire"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Badges Earned</p>
          <p class="stat-value">${badges.length}</p>
          <p class="stat-sub">of ${allBadges.length} available</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-trophy"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Courses Completed</p>
          <p class="stat-value">${S.enrollments.filter(e => e.progress >= 100).length}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Level Progress</h3>
      <div class="level-progress-wrap">
        <div class="level-badge">
          <i class="fas fa-medal"></i>
          <span>Level ${level}</span>
        </div>
        <div class="progress-bar">
          <span style="width:${xpProgressPercent(xp)}%"></span>
        </div>
        <p class="form-hint">
          ${xp} / ${xpForLevel(level + 1)} XP to next level
        </p>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Badges</h3>
      <div class="badge-grid">
        ${allBadges.map(b => {
          const earned = badges.some(x => x.badge_code === b.code);
          return `
            <div class="badge-card ${earned ? 'badge-earned' : 'badge-locked'}">
              <i class="fas ${b.icon}"></i>
              <span class="badge-name">${b.name}</span>
              ${earned
                ? '<span class="badge-label">Earned</span>'
                : '<span class="badge-label">Locked</span>'}
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

/* ============================================================
   E-SCHOOL — COURSE NOTES (global)
   ============================================================ */
function userCourseNotes() {
  const notes = S.lessonNotes || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Notes</span></div>
    <section class="page-header">
      <h1 class="page-title">My Course Notes</h1>
    </section>

    ${notes.length ? `
      <section class="panel">
        <ul class="notes-list">
          ${notes.map(n => `
            <li class="note-item">
              <div class="note-header">
                <strong>${esc(n.lesson_title || 'Lesson')}</strong>
                <span class="note-time">${timeAgo(n.created_at)}</span>
              </div>
              <p class="note-content">${esc(n.content)}</p>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-sticky-note"></i>
          <h3>No notes yet</h3>
          <p>Take notes while learning and they'll appear here.</p>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   E-SCHOOL — REFUND REQUESTS
   ============================================================ */
function userRefundRequests() {
  const refunds = S.userRefunds || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Refund Requests</span></div>
    <section class="page-header">
      <h1 class="page-title">Refund Requests</h1>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Courses can be refunded within ${CONFIG.COURSE_REFUND_WINDOW_DAYS} days of purchase
        if you have completed less than 30% of the content.
      </div>
    </div>

    ${refunds.length ? `
      <section class="panel">
        <ul class="list-stack">
          ${refunds.map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.course_title)}</span>
                <span class="list-row-sub">Requested ${timeAgo(r.requested_at)} · ${esc(r.reason || 'No reason given')}</span>
              </div>
              <span class="${statusClass(r.status)}">${esc(r.status)}</span>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-rotate-left"></i>
          <h3>No refund requests</h3>
          <p>Refund requests you make will appear here.</p>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   USER — EVENTS
   ============================================================ */
function userEvents() {
  const registered = new Set((S.eventRegistrations || []).map(r => String(r.event_id)));
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Events</span></div>
    <section class="page-header"><h1 class="page-title">Events</h1></section>
    <section class="panel">
      ${S.events.map(ev => {
        const isRegistered = registered.has(String(ev.id));
        return `
          <article class="event-card">
            <div class="event-date">
              <span class="event-day">${new Date(ev.date || ev.created_at).getDate()}</span>
              <span class="event-month">${new Date(ev.date || ev.created_at).toLocaleString('en-US', { month: 'short' })}</span>
            </div>
            <div class="event-body">
              <h4 class="event-title">${esc(ev.title || '')}</h4>
              <p class="event-desc">${esc(ev.description || '')}</p>
              <p class="event-meta">
                ${ev.registered_count || 0} of ${ev.capacity || 0} registered ·
                ${ev.price > 0 ? fmtCur(ev.price) : 'Free'}
              </p>
            </div>
            <div class="event-actions">
              <button class="btn ${isRegistered ? 'btn-secondary' : 'btn-primary'} btn-sm"
                      data-action="register-event" data-id="${ev.id}"
                      ${isRegistered ? 'disabled' : ''}>
                ${isRegistered ? '<i class="fas fa-check"></i> Registered' : '<i class="fas fa-plus"></i> Register'}
              </button>
            </div>
          </article>
        `;
      }).join('') || '<p class="empty-row">No events available</p>'}
    </section>
  `;
}

/* ============================================================
   USER — FIND EXPERTS
   ============================================================ */
function userFindExperts() {
  const query = ($('#expert-search')?.value || '').toLowerCase();
  const budget = Number($('#expert-budget')?.value || 0);
  const instantOnly = $('#expert-instant')?.checked || false;

  let filtered = query
    ? S.experts.filter(e =>
        (e.name || '').toLowerCase().includes(query) ||
        (e.specialization || '').toLowerCase().includes(query)
      )
    : S.experts.slice();
  if (budget) filtered = filtered.filter(e => Number(e.hourly_rate || 0) <= budget);
  if (instantOnly) filtered = filtered.filter(e => e.instant_available);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Experts</span></div>
    <section class="page-header">
      <h1 class="page-title">Find Experts</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="find-expert-wizard">
          <i class="fas fa-magic"></i> Match Me</button>
        <button class="btn btn-primary" data-action="instant-consultation">
          <i class="fas fa-bolt"></i> Talk Now</button>
      </div>
    </section>

    <section class="panel">
      <div class="page-actions" style="margin-bottom:14px">
        <input type="search" id="expert-search" class="form-input"
               placeholder="Search by name or specialization"
               value="${esc(query)}" style="max-width:260px" />
        <input type="number" id="expert-budget" class="form-input"
               placeholder="Max $/hour" value="${budget || ''}" style="max-width:120px" />
        <label class="checkbox-row">
          <input type="checkbox" id="expert-instant" ${instantOnly ? 'checked' : ''} />
          Online now
        </label>
      </div>

      <section class="card-grid">
        ${filtered.map(e => `
          <article class="expert-card">
            <div style="position:relative">
              <img class="expert-avatar" src="${avatar(e)}" alt="" />
              ${e.is_online ? '<span class="expert-online-dot"></span>' : ''}
            </div>
            <h4 class="expert-name">
              ${esc(e.name || '')}
              ${e.verified_badge ? '<span class="badge-verified-sm"><i class="fas fa-check-circle"></i></span>' : ''}
            </h4>
            <p class="expert-expertise">${esc(e.specialization || '—')}</p>
            <p class="expert-rate">${fmtCur(e.hourly_rate || 0)} / hr</p>
            <p class="expert-rating">
              <i class="fas fa-star" style="color:#f59e0b"></i>
              <span class="expert-rating-value">${Number(e.average_rating || 0).toFixed(1)}</span>
              ${e.response_time_minutes ? `<span class="expert-response">· ~${e.response_time_minutes}m response</span>` : ''}
            </p>
            <div class="expert-card-actions">
              <button class="btn btn-primary btn-sm flex-1" data-action="book-slot-with"
                      data-id="${e.id}" data-name="${esc(e.name || '')}">
                <i class="fas fa-calendar-plus"></i> Book</button>
              <button class="btn btn-secondary btn-sm" data-action="view-expert-profile" data-id="${e.id}">
                <i class="fas fa-eye"></i></button>
            </div>
          </article>
        `).join('') || `
          <div class="empty-state" style="grid-column:1/-1">
            <i class="fas fa-search"></i>
            <h3>No experts found</h3>
            <p>Try adjusting your filters.</p>
          </div>
        `}
      </section>
    </section>
  `;
}

/* ============================================================
   USER — CONSULTATIONS
   ============================================================ */
function userConsultations() {
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const upcoming = mine.filter(c => c.scheduled_at && new Date(c.scheduled_at) > new Date() && !['cancelled','expired','no_show'].includes(c.status));
  const pending = mine.filter(c => ['pending_payment','pending_expert_confirmation'].includes(c.status));
  const past = mine.filter(c => ['completed','cancelled','no_show','expired'].includes(c.status));

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header">
      <h1 class="page-title">My Consultations</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="instant-consultation">
          <i class="fas fa-bolt"></i> Talk Now</button>
        <button class="btn btn-primary" data-action="find-expert-wizard">
          <i class="fas fa-plus"></i> Book Session</button>
      </div>
    </section>

    ${S.userPackages.length ? `
      <div class="alert alert-info">
        <i class="fas fa-ticket-alt"></i>
        <div>
          You have <strong>${S.userPackages.reduce((s, p) => s + p.sessions_remaining, 0)} session credits</strong>
          across ${S.userPackages.length} package${S.userPackages.length === 1 ? '' : 's'}.
        </div>
      </div>
    ` : ''}

    ${upcoming.length ? `
      <section class="panel">
        <h3 class="panel-title">Upcoming Sessions</h3>
        ${upcoming.map(c => renderUserConsultationCard(c)).join('')}
      </section>
    ` : ''}

    ${pending.length ? `
      <section class="panel">
        <h3 class="panel-title">Awaiting Confirmation</h3>
        ${pending.map(c => renderUserConsultationCard(c)).join('')}
      </section>
    ` : ''}

    ${past.length ? `
      <section class="panel">
        <h3 class="panel-title">Past Sessions</h3>
        ${past.slice(0, 20).map(c => renderUserConsultationCard(c)).join('')}
      </section>
    ` : ''}

    ${!mine.length ? `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>No consultations yet</h3>
          <p>Book your first expert session, or get matched with the perfect expert.</p>
          <button class="btn btn-primary" data-action="find-expert-wizard">
            <i class="fas fa-magic"></i> Find Me an Expert</button>
        </div>
      </section>
    ` : ''}
  `;
}

function renderUserConsultationCard(c) {
  const tz = currentUser?.timezone || 'UTC';
  const canCancel = ['pending_expert_confirmation','confirmed','scheduled'].includes(c.status);
  const canReschedule = ['confirmed','scheduled'].includes(c.status) && (c.reschedule_count || 0) < CONFIG.MAX_RESCHEDULES;
  const canJoin = ['confirmed','in_grace','in_session'].includes(c.status);
  const canReview = c.status === 'completed' && !c.reviewed;
  const canDispute = ['completed','awaiting_completion'].includes(c.status) && !c.disputed;
  const canTip = c.status === 'completed';

  return `
    <div class="consultation-card">
      <header class="consultation-card-header">
        <div>
          <h4 class="consultation-card-title">${esc(c.title)}</h4>
          <p class="consultation-card-meta">
            <span class="${consultationStatusClass(c.status)}">${esc(c.status.replace(/_/g, ' '))}</span>
            ${c.session_type === 'instant' ? '<span class="chip chip-blue">Instant</span>' : ''}
            ${c.is_group ? '<span class="chip chip-purple">Group</span>' : ''}
          </p>
        </div>
        <div class="consultation-card-price">
          ${fmtCur(c.price || 0)}
          ${c.payment_status === 'held' ? '<div class="consultation-card-escrow">In escrow</div>' : ''}
        </div>
      </header>

      <div class="consultation-card-body">
        <div class="consultation-card-expert">
          <img class="user-avatar" src="${avatar({ name: c.expert_name, email: c.expert_email })}" alt="" />
          <div>
            <div class="user-name">${esc(c.expert_name || 'Expert')}</div>
            <div class="user-email">${esc(c.expert_specialization || '')}</div>
          </div>
        </div>

        ${c.scheduled_at ? `
          <div class="consultation-card-time">
            <i class="fas fa-calendar"></i>
            <strong>${fmtInTz(c.scheduled_at, tz)}</strong>
            <span class="consultation-card-countdown">${timeUntil(c.scheduled_at)}</span>
          </div>
        ` : ''}

        <div class="consultation-card-duration">
          <i class="fas fa-clock"></i> ${c.duration_minutes || 30} minutes · ${esc(c.consultation_type || 'video')}
        </div>

        ${c.description ? `<p class="consultation-card-desc">${esc(c.description.slice(0, 200))}</p>` : ''}

        ${c.payment_status === 'held' ? `
          <div class="consultation-card-escrow-info">
            <i class="fas fa-shield-alt"></i>
            Payment held in escrow. Released after session completion.
          </div>
        ` : ''}
      </div>

      <footer class="consultation-card-actions">
        ${canJoin ? `
          <button class="btn btn-primary btn-sm" data-action="start-session" data-id="${c.id}">
            <i class="fas fa-video"></i> Join</button>
        ` : ''}
        <button class="btn btn-info btn-sm" data-action="open-chat" data-id="${c.id}">
          <i class="fas fa-comments"></i> Chat</button>
        ${canReschedule ? `
          <button class="btn btn-secondary btn-sm" data-action="reschedule-consultation" data-id="${c.id}">
            <i class="fas fa-calendar-alt"></i> Reschedule</button>
        ` : ''}
        ${canCancel ? `
          <button class="btn btn-danger btn-sm" data-action="cancel-consultation" data-id="${c.id}">
            <i class="fas fa-times"></i> Cancel</button>
        ` : ''}
        ${canReview ? `
          <button class="btn btn-success btn-sm" data-action="review-consultation"
                  data-id="${c.id}" data-expert="${c.expert_id}">
            <i class="fas fa-star"></i> Rate Session</button>
        ` : ''}
        ${canDispute ? `
          <button class="btn btn-warning btn-sm" data-action="open-dispute" data-id="${c.id}">
            <i class="fas fa-gavel"></i> File Dispute</button>
        ` : ''}
        ${canTip ? `
          <button class="btn btn-primary btn-sm" data-action="tip-expert" data-id="${c.id}">
            <i class="fas fa-hand-holding-usd"></i> Tip</button>
          <button class="btn btn-secondary btn-sm" data-action="book-followup" data-expert="${c.expert_id}">
            <i class="fas fa-redo"></i> Book Again</button>
        ` : ''}
        <button class="btn btn-secondary btn-sm" data-action="consultation-detail" data-id="${c.id}">
          <i class="fas fa-eye"></i> Details</button>
      </footer>
    </div>
  `;
}

/* ============================================================
   USER — SESSION PACKAGES
   ============================================================ */
function userPackages() {
  const packages = S.userPackages || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Session Packages</span></div>
    <section class="page-header">
      <h1 class="page-title">Session Packages</h1>
    </section>

    ${packages.length ? `
      <section class="card-grid">
        ${packages.map(p => `
          <article class="program-card">
            <span class="chip chip-blue">${p.sessions_remaining} of ${p.sessions_total || p.sessions_remaining} left</span>
            <h4 class="program-title">${esc(p.package_name)}</h4>
            <p class="program-desc">with ${esc(p.expert_name)}</p>
            <footer class="program-footer">
              <span class="program-meta">Expires: ${fmtDate(p.expires_at)}</span>
            </footer>
            <div class="panel-actions" style="margin-top:10px">
              <button class="btn btn-primary btn-sm" data-action="use-package-credit"
                      data-expert="${p.package_id}">
                <i class="fas fa-calendar-plus"></i> Book Next Session</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-ticket-alt"></i>
          <h3>No packages purchased</h3>
          <p>Packages save you money on multi-session bookings. Browse experts to find packages.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="experts">
            <i class="fas fa-search"></i> Browse Experts</button>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   USER — SHORTLIST
   ============================================================ */
function userShortlist() {
  const shortlist = S.userShortlist || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Shortlist</span></div>
    <section class="page-header">
      <h1 class="page-title">Saved Experts</h1>
    </section>

    ${shortlist.length ? `
      <section class="card-grid">
        ${shortlist.map(e => `
          <article class="expert-card">
            <img class="expert-avatar" src="${avatar(e)}" alt="" />
            <h4 class="expert-name">${esc(e.name)}</h4>
            <p class="expert-expertise">${esc(e.specialization || '')}</p>
            <p class="expert-rate">${fmtCur(e.hourly_rate)}/hr</p>
            <div class="expert-card-actions">
              <button class="btn btn-primary btn-sm flex-1" data-action="book-slot-with"
                      data-id="${e.expert_id}" data-name="${esc(e.name)}">
                <i class="fas fa-calendar-plus"></i> Book</button>
              <button class="btn btn-secondary btn-sm" data-action="toggle-shortlist" data-id="${e.expert_id}">
                <i class="fas fa-bookmark"></i></button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-bookmark"></i>
          <h3>Your shortlist is empty</h3>
          <p>Save experts you want to work with later.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="experts">
            <i class="fas fa-search"></i> Browse Experts</button>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   USER — WALLET
   ============================================================ */
function userWallet() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Wallet</span></div>
    <section class="page-header"><h1 class="page-title">My Wallet</h1></section>

    <div class="wallet-balance">
      <p class="wallet-balance-label">Available Balance</p>
      <p class="wallet-balance-value">${fmtCur(S.wallet.balance || 0)}</p>
    </div>

    <section class="panel">
      <h3 class="panel-title">Add Funds</h3>
      <div class="form-inline">
        <input id="topupAmount" type="number" class="form-input" placeholder="Amount ($)" />
        <select id="topupProvider" class="form-select">
          ${CONFIG.PAYMENT_PROVIDERS.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
        <button class="btn btn-primary" data-action="topup-wallet">
          <i class="fas fa-plus"></i> Add Funds</button>
      </div>
      <p class="panel-hint" style="margin-top:10px">
        Demo mode: top-ups are instantly credited.
      </p>
    </section>

    <section class="panel">
      <h3 class="panel-title">Ledger</h3>
      <ul class="list-stack">
        ${(S.wallet.ledger || []).map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.reason || '')}</span>
              <span class="list-row-sub">${fmtDT(l.created_at)}</span>
            </div>
            <span class="list-row-price" style="color:${l.amount >= 0 ? 'var(--accent)' : 'var(--danger)'}">
              ${l.amount >= 0 ? '+' : ''}${fmtCur(l.amount)}
            </span>
          </li>
        `).join('') || '<li class="empty-row">No activity yet</li>'}
      </ul>
    </section>
  `;
}

/* ============================================================
   USER — TRANSACTIONS
   ============================================================ */
function userTransactions() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Transactions</span></div>
    <section class="page-header"><h1 class="page-title">Transactions</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Reference</th><th>Description</th><th>Amount</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            ${S.transactions.map(t => `
              <tr>
                <td><code class="code">${esc(t.reference || t.id)}</code></td>
                <td>${esc(t.description || '')}</td>
                <td>${fmtCur(t.amount || 0)}</td>
                <td><span class="${statusClass(t.status)}">${esc(t.status || '')}</span></td>
                <td>${fmtDT(t.created_at)}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="empty-row">No transactions yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   USER — CLAIMS
   ============================================================ */
function userClaims() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Claims</span></div>
    <section class="page-header"><h1 class="page-title">My Claims</h1></section>
    <section class="panel">
      ${S.claims.length ? S.claims.map(c => `
        <article class="claim-card">
          <header class="claim-header">
            <span class="claim-title">${esc(c.claim_title || '')}</span>
            <span class="${statusClass(c.status)}">${esc(c.status || '')}</span>
          </header>
          <p class="claim-desc">${esc(c.claim_description || '')}</p>
          ${c.claim_amount ? `<p class="claim-amount">Amount: ${fmtCur(c.claim_amount)}</p>` : ''}
          ${c.resolution ? `
            <div class="alert alert-info" style="margin-top:10px">
              <strong>Resolution:</strong> ${esc(c.resolution)}
            </div>
          ` : ''}
        </article>
      `).join('') : `
        <div class="empty-state">
          <i class="fas fa-gavel"></i>
          <h3>No claims filed</h3>
          <p>If you have an issue with a consultation, you can file a claim.</p>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   USER — SUPPORT
   ============================================================ */
function userSupport() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Support</span></div>
    <section class="page-header">
      <h1 class="page-title">Support</h1>
      <button class="btn btn-primary" data-action="new-ticket">
        <i class="fas fa-plus"></i> New Ticket</button>
    </section>

    <section class="panel">
      ${S.tickets.length ? S.tickets.map(t => `
        <article class="ticket-card">
          <header class="ticket-header">
            <span class="ticket-ref"><code class="code">${esc(t.reference || t.id)}</code></span>
            <span class="${statusClass(t.status)}">${esc(t.status || '')}</span>
          </header>
          <h4 class="ticket-subject">${esc(t.subject || '')}</h4>
          <p class="ticket-desc">${esc(t.description || '')}</p>
          <footer class="ticket-actions">
            <button class="btn btn-secondary btn-sm" data-action="ticket-view" data-id="${t.id}">
              <i class="fas fa-eye"></i> View and Reply</button>
          </footer>
        </article>
      `).join('') : `
        <div class="empty-state">
          <i class="fas fa-headset"></i>
          <h3>No support tickets</h3>
          <p>Need help? Create a ticket and our team will respond.</p>
          <button class="btn btn-primary" data-action="new-ticket">
            <i class="fas fa-plus"></i> Create Ticket</button>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   USER — PROFILE
   ============================================================ */
function userProfile() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
    <section class="page-header"><h1 class="page-title">My Profile</h1></section>

    <section class="panel">
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(currentUser?.name || '')}</h2>
          <p class="profile-email">${esc(currentUser?.email || '')}</p>
          <p style="margin-top:6px">
            <span class="chip chip-neutral">Level ${S.userLevel || 1}</span>
            <span class="chip chip-blue" style="margin-left:6px">
              ${S.userXP || 0} XP</span>
          </p>
        </div>
      </div>

      <div class="form-grid">
        <label class="form-group"><span class="form-label">Full name</span>
          <input id="profileName" class="form-input" value="${esc(currentUser?.name || '')}" /></label>
        <label class="form-group"><span class="form-label">Phone</span>
          <input id="profilePhone" class="form-input" value="${esc(currentUser?.phone || '')}" /></label>
        <label class="form-group"><span class="form-label">Timezone</span>
          <input id="profileTimezone" class="form-input" value="${esc(currentUser?.timezone || 'UTC')}" /></label>
        <label class="form-group">
          <span class="form-label">Preferred mode</span>
          <select id="profileIntent" class="form-select">
            <option value="both"    ${S.userIntent === 'both' ? 'selected' : ''}>Both - Learning and Consulting</option>
            <option value="learn"   ${S.userIntent === 'learn' ? 'selected' : ''}>Learning only</option>
            <option value="consult" ${S.userIntent === 'consult' ? 'selected' : ''}>Consulting only</option>
          </select>
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Change avatar</span>
          <input type="file" id="avatarFile" class="form-input" accept="image/*" />
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="update-user-profile">
          <i class="fas fa-save"></i> Save Changes</button>
      </div>

      <h3 class="panel-title" style="margin-top:24px">Change Password</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Current password</span>
          <input id="cpOld" type="password" class="form-input" /></label>
        <label class="form-group"><span class="form-label">New password</span>
          <input id="cpNew" type="password" class="form-input" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-warning" data-action="change-password">
          <i class="fas fa-lock"></i> Update Password</button>
      </div>

      <h3 class="panel-title" style="margin-top:24px">Privacy & Data</h3>
      <div class="panel-actions">
        <button class="btn btn-secondary" data-action="gdpr-export">
          <i class="fas fa-download"></i> Export My Data (GDPR)</button>
        <button class="btn btn-danger" data-action="gdpr-delete">
          <i class="fas fa-trash"></i> Delete Account</button>
      </div>
    </section>
  `;
}

/* ============================================================
   END OF PORTION 3
   Portion 4 continues with Institution Dashboard, modals,
   handleAction, charts, router, bootstrap.
   ============================================================ */
   /* ============================================================
   INSTITUTION DASHBOARD (Portion 4)
   ============================================================ */
function renderInstitutionDashboard() {
  if (!currentUser) return renderLogin();
  const inst = S.myInstitution || {};
  const isOpsManager = currentUser.institution_role === 'operations_manager';
  const pendingApprovals = S.institutionApprovals.filter(a => a.status === 'pending').length;
  const expiringCerts = S.institutionCertificates.filter(c => {
    if (!c.expires_at || c.revoked) return false;
    const days = (new Date(c.expires_at) - Date.now()) / 86400000;
    return days > 0 && days < 90;
  }).length;
  const upcomingSessions = S.institutionSessions.filter(s =>
    s.status === 'scheduled' && new Date(s.scheduled_at) > new Date()
  ).length;
  const atRiskCount = S.wellnessAlerts.filter(a => a.severity === 'high' || a.severity === 'critical').length;
  const budgetAlerts = S.budgetAllocations.filter(b => (b.allocated ? (b.spent / b.allocated) * 100 : 0) >= 80).length;

  const nav = `
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}
    ${sidebarItem('analytics','Analytics Center','fa-chart-pie')}
    ${sidebarItem('programmes','Programmes','fa-diagram-project')}
    ${sidebarItem('learning-paths','Learning Paths','fa-route')}
    ${sidebarItem('cohorts','Cohorts and Batches','fa-layer-group', upcomingSessions)}
    ${sidebarItem('training','Training Delivery','fa-chalkboard-user')}
    ${sidebarItem('assessments','Assessments','fa-clipboard-check')}
    ${sidebarItem('proctor','Proctored Exams','fa-shield-halved')}
    ${sidebarItem('question-bank','Question Bank','fa-database')}
    ${sidebarItem('projects','Capstone Projects','fa-briefcase')}
    ${sidebarItem('trainees','Trainees','fa-users')}
    ${sidebarItem('wellness','Wellness & Engagement','fa-heart-pulse', atRiskCount)}
    ${sidebarItem('certifications','Certifications','fa-award', expiringCerts)}
    ${sidebarItem('skills','Skills Matrix','fa-puzzle-piece')}
    ${sidebarItem('skills-gap','Skills Gap','fa-chart-simple')}
    ${sidebarItem('compliance','Compliance','fa-file-shield')}
    ${sidebarItem('succession','Succession Planning','fa-sitemap')}
    ${sidebarItem('instructors','Instructors','fa-user-tie')}
    ${sidebarItem('marketplace','Instructor Market','fa-people-arrows')}
    ${sidebarItem('budgets','Budgets','fa-coins', budgetAlerts)}
    ${sidebarItem('campuses','Campuses & Branches','fa-building')}
    ${sidebarItem('reports','Reports','fa-file-lines')}
    ${sidebarItem('report-builder','Report Builder','fa-table-columns')}
    ${sidebarItem('announcements','Announcements','fa-bullhorn')}
    ${sidebarItem('integrations','Integrations & API','fa-plug')}
    ${sidebarItem('security','SSO & Security','fa-lock')}
    ${isOpsManager ? sidebarItem('operations','Operations Control','fa-sliders', pendingApprovals) : ''}
    ${isOpsManager ? sidebarItem('branding','Custom Branding','fa-palette') : ''}
    ${sidebarItem('profile','Institution Profile','fa-building-columns')}
  `;

  shell({
    roleClass: 'role-institution',
    brandIcon: 'fa-building-columns',
    brandTitle: esc(inst.name || currentUser.institution_name || 'Institution'),
    brandSubtitle: 'Corporate Training Hub',
    nav,
    roleLabel: isOpsManager ? 'Operations Manager' : 'Institution Panel',
    content: renderInstitutionContent(),
  });
  attachRoleEvents();
  renderInstitutionCharts();
  attachInstitutionInteractions();
}

function renderInstitutionContent() {
  switch (activeTab) {
    case 'dashboard':       return instOverview();
    case 'analytics':       return instAnalyticsCenter();
    case 'programmes':      return instProgrammes();
    case 'learning-paths':  return instLearningPaths();
    case 'cohorts':         return instCohorts();
    case 'training':        return instTraining();
    case 'assessments':     return instAssessments();
    case 'proctor':         return instProctorSessions();
    case 'question-bank':   return instQuestionBank();
    case 'projects':        return instProjects();
    case 'trainees':        return instTrainees();
    case 'wellness':        return instWellness();
    case 'certifications':  return instCertifications();
    case 'skills':          return instSkills();
    case 'skills-gap':      return instSkillsGap();
    case 'compliance':      return instCompliance();
    case 'succession':      return instSuccession();
    case 'instructors':     return instInstructors();
    case 'marketplace':     return instMarketplace();
    case 'budgets':         return instBudgets();
    case 'campuses':        return instCampuses();
    case 'reports':         return instReports();
    case 'report-builder':  return instReportBuilder();
    case 'announcements':   return instAnnouncements();
    case 'integrations':    return instIntegrations();
    case 'security':        return instSecurity();
    case 'operations':      return instOperations();
    case 'branding':        return instBranding();
    case 'profile':         return instProfile();
    default:                return instOverview();
  }
}

/* ============================================================
   INSTITUTION — OVERVIEW
   ============================================================ */
function instOverview() {
  const st = S.institutionStats || {};
  const activeProgrammes = S.programmes.filter(p => p.status === 'active').length;
  const activeCohorts = S.cohorts.filter(c => c.status === 'active').length;
  const completion = st.avgCompletionRate || st.avg_completion_rate || 0;
  const attendance = st.attendanceRate || 0;
  const avgScore = st.avgScore || st.avg_score || 0;
  const pendingApprovals = st.pendingApprovals || 0;
  const expiringCerts = st.expiringCertificates || 0;
  const upcoming = (st.upcomingSessions || []).slice(0, 5);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Institution Dashboard</span></div>
    <section class="page-header">
      <h1 class="page-title">${esc(S.myInstitution?.name || 'Institution')} Overview</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-institution-report">
          <i class="fas fa-download"></i> Export Report</button>
        <button class="btn btn-primary" data-action="refresh-all">
          <i class="fas fa-rotate"></i> Refresh</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Programmes</p>
          <p class="stat-value">${activeProgrammes}</p>
          <p class="stat-sub">of ${S.programmes.length} total</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-diagram-project"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Cohorts</p>
          <p class="stat-value">${activeCohorts}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-layer-group"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Trainees</p>
          <p class="stat-value">${st.totalTrainees || S.trainees.length}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Attendance Rate</p>
          <p class="stat-value">${attendance}%</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-user-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Avg. Completion</p>
          <p class="stat-value">${completion}%</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-chart-line"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Avg. Assessment Score</p>
          <p class="stat-value">${avgScore}%</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-star"></i></div>
      </div>
    </section>

    ${(pendingApprovals || expiringCerts) ? `
      <section class="dashboard-columns">
        ${pendingApprovals ? `
          <div class="alert alert-warning">
            <i class="fas fa-clock"></i>
            <div>
              <strong>${pendingApprovals} pending approval${pendingApprovals > 1 ? 's' : ''}</strong>
              <p style="margin:4px 0 0;font-size:.85rem">
                <a href="#" data-action="switch-tab" data-tab="operations">Review now</a>
              </p>
            </div>
          </div>
        ` : ''}
        ${expiringCerts ? `
          <div class="alert alert-info">
            <i class="fas fa-certificate"></i>
            <div>
              <strong>${expiringCerts} certificate${expiringCerts > 1 ? 's' : ''} expiring within 90 days</strong>
              <p style="margin:4px 0 0;font-size:.85rem">
                <a href="#" data-action="switch-tab" data-tab="certifications">View register</a>
              </p>
            </div>
          </div>
        ` : ''}
      </section>
    ` : ''}

    <section class="dashboard-columns">
      <div class="panel panel-quick-actions">
        <h3 class="panel-title">Quick Actions</h3>
        <button class="btn btn-primary btn-block" data-action="create-programme">
          <i class="fas fa-plus"></i> New Programme</button>
        <button class="btn btn-info btn-block" data-action="create-cohort">
          <i class="fas fa-layer-group"></i> Create Cohort</button>
        <button class="btn btn-success btn-block" data-action="invite-trainee">
          <i class="fas fa-user-plus"></i> Import Trainees</button>
        <button class="btn btn-warning btn-block" data-action="schedule-session">
          <i class="fas fa-calendar-plus"></i> Schedule Session</button>
        <button class="btn btn-secondary btn-block" data-action="issue-certificate">
          <i class="fas fa-award"></i> Issue Certificate</button>
      </div>

      <div class="panel">
        <h3 class="panel-title">Programme Status Breakdown</h3>
        <ul class="list-stack">
          ${CONFIG.PROGRAMME_STATUSES.map(s => {
            const n = S.programmes.filter(p => p.status === s).length;
            return `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${s.charAt(0).toUpperCase() + s.slice(1)}</span>
                </div>
                <span class="status status-${s}">${n}</span>
              </li>`;
          }).join('')}
        </ul>
      </div>
    </section>

    ${upcoming.length ? `
      <section class="panel">
        <h3 class="panel-title">Upcoming Sessions</h3>
        <ul class="list-stack">
          ${upcoming.map(s => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(s.title)}</span>
                <span class="list-row-sub">${esc(s.cohort_name || '')} - ${fmtDT(s.scheduled_at)}</span>
              </div>
              <div style="display:flex;gap:6px">
                <a class="btn btn-secondary btn-xs" href="/api/institution/sessions/${s.id}/ics">
                  <i class="fas fa-calendar-plus"></i> ICS</a>
                <button class="btn btn-info btn-xs" data-action="mark-attendance" data-id="${s.id}">
                  <i class="fas fa-clipboard-check"></i> Attendance</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}

    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Trainee Progress Trend</h3>
        <canvas id="chartInstProgress" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Assessment Score Distribution</h3>
        <canvas id="chartInstAssess" height="200"></canvas>
      </div>
    </section>
  `;
}

/* ============================================================
   FEATURE 1 — ANALYTICS COMMAND CENTER
   ============================================================ */
function instAnalyticsCenter() {
  const a = S.institutionAnalytics || {};
  const overview = a.overview || {};
  const cohortPerf = a.cohortPerformance || [];
  const instructorPerf = a.instructorPerformance || [];
  const campusPerf = a.campusPerformance || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Analytics Center</span></div>
    <section class="page-header">
      <h1 class="page-title">Analytics Command Center</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-analytics-snapshot">
          <i class="fas fa-download"></i> Snapshot</button>
        <button class="btn btn-primary" data-action="refresh-all">
          <i class="fas fa-rotate"></i> Refresh</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active Trainees</p>
          <p class="stat-value">${overview.activeTrainees || 0}</p>
          <p class="stat-sub">${overview.activeTraineesChange >= 0 ? '+' : ''}${overview.activeTraineesChange || 0}% vs prior</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Completion Rate</p>
          <p class="stat-value">${overview.completionRate || 0}%</p>
          <p class="stat-sub">Target: ${overview.completionTarget || 80}%</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Avg. Assessment Score</p>
          <p class="stat-value">${overview.avgScore || 0}%</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Certificate Issuance</p>
          <p class="stat-value">${overview.certificatesIssued || 0}</p>
          <p class="stat-sub">${overview.certificatesExpiring || 0} expiring soon</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-award"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Budget Utilisation</p>
          <p class="stat-value">${overview.budgetUtilisation || 0}%</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-coins"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">At-Risk Trainees</p>
          <p class="stat-value">${overview.atRiskTrainees || 0}</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-exclamation-triangle"></i></div>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Enrollment Trend</h3>
        <canvas id="chartEnrollmentTrend" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Completion Trend</h3>
        <canvas id="chartCompletionTrend" height="200"></canvas>
      </div>
    </section>

    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Revenue by Month</h3>
        <canvas id="chartRevenueTrend" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Programme Type Mix</h3>
        <canvas id="chartProgrammeMix" height="200"></canvas>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Cohort Performance Leaderboard</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cohort</th><th>Programme</th><th>Enrolled</th>
              <th>Avg. Progress</th><th>Avg. Score</th>
              <th>Attendance</th><th>Completion</th>
            </tr>
          </thead>
          <tbody>
            ${cohortPerf.map(c => `
              <tr>
                <td>${esc(c.name)}</td>
                <td>${esc(c.programme_title || '—')}</td>
                <td>${c.enrolled || 0}</td>
                <td>${renderMiniBar(c.avg_progress, '#1e3a8a')} ${c.avg_progress || 0}%</td>
                <td>${renderMiniBar(c.avg_score, '#059669')} ${c.avg_score || 0}%</td>
                <td>${c.attendance_pct || 0}%</td>
                <td>${c.completion_pct || 0}%</td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No cohort data available</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Instructor Performance</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Instructor</th><th>Programmes</th><th>Sessions</th>
              <th>Avg. Rating</th><th>Attendance Impact</th><th>Utilisation</th>
            </tr>
          </thead>
          <tbody>
            ${instructorPerf.map(i => `
              <tr>
                <td>${esc(i.name)}</td>
                <td>${i.programmes || 0}</td>
                <td>${i.sessions || 0}</td>
                <td>${Number(i.avg_rating || 0).toFixed(1)} / 5</td>
                <td>+${i.attendance_delta || 0}%</td>
                <td>${renderMiniBar(i.utilisation || 0, '#7c3aed')} ${i.utilisation || 0}%</td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-row">No instructor data</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    ${campusPerf.length ? `
      <section class="panel">
        <h3 class="panel-title">Campus Comparison</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Campus</th><th>Active Trainees</th><th>Programmes</th><th>Avg. Progress</th><th>Completion Rate</th></tr>
            </thead>
            <tbody>
              ${campusPerf.map(c => `
                <tr>
                  <td>${esc(c.campus_name)}</td>
                  <td>${c.active_trainees || 0}</td>
                  <td>${c.programmes || 0}</td>
                  <td>${c.avg_progress || 0}%</td>
                  <td>${c.completion_rate || 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    ` : ''}
  `;
}

/* ============================================================
   FEATURE 2 — MULTI-CAMPUS / BRANCH MANAGEMENT
   ============================================================ */
function instCampuses() {
  const campuses = S.campuses || [];
  const activeCampus = S.activeCampusId ? campuses.find(c => c.id === S.activeCampusId) : null;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Campuses & Branches</span></div>
    <section class="page-header">
      <h1 class="page-title">Campuses & Branches</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-campus">
          <i class="fas fa-plus"></i> New Campus</button>
      </div>
    </section>

    ${activeCampus ? `
      <div class="alert alert-info" style="justify-content:space-between">
        <span>Filtering by: <strong>${esc(activeCampus.name)}</strong></span>
        <button class="btn btn-secondary btn-sm" data-action="clear-campus-filter">Clear Filter</button>
      </div>
    ` : ''}

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Campuses</p><p class="stat-value">${campuses.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-building"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Active</p>
          <p class="stat-value">${campuses.filter(c => c.status === 'active').length}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Trainees Across All</p>
          <p class="stat-value">${campuses.reduce((s, c) => s + Number(c.trainee_count || 0), 0)}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Headcount Capacity</p>
          <p class="stat-value">${campuses.reduce((s, c) => s + Number(c.capacity || 0), 0)}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-chair"></i></div>
      </div>
    </section>

    <section class="card-grid">
      ${campuses.map(c => {
        const util = pctOf(c.trainee_count || 0, c.capacity || 1);
        return `
          <article class="program-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
              <div>
                <span class="chip chip-neutral">${esc(c.type || 'main')}</span>
                <span class="${statusClass(c.status || 'active')}" style="margin-left:6px">${esc(c.status || 'active')}</span>
              </div>
              ${c.is_main ? '<span class="chip chip-blue">Main</span>' : ''}
            </div>
            <h4 class="program-title">${esc(c.name)}</h4>
            <p class="program-desc">${esc(c.address || 'No address on file')}</p>
            <p class="program-meta">
              <i class="fas fa-user-tie"></i> ${esc(c.manager_name || 'Unassigned')} ·
              ${esc(c.contact_phone || 'No phone')}
            </p>
            <div class="program-footer" style="flex-direction:column;align-items:stretch;gap:6px">
              <div>
                <div class="progress-bar"><span style="width:${util}%"></span></div>
                <small>${c.trainee_count || 0} of ${c.capacity || 0} seats filled (${util}%)</small>
              </div>
              <div class="panel-actions" style="display:flex;gap:6px;margin-top:8px">
                <button class="btn btn-secondary btn-sm" data-action="edit-campus" data-id="${c.id}">
                  <i class="fas fa-pen"></i> Edit</button>
                <button class="btn btn-info btn-sm" data-action="view-campus-trainees" data-id="${c.id}">
                  <i class="fas fa-users"></i> Trainees</button>
                <button class="btn btn-danger btn-sm" data-action="delete-campus" data-id="${c.id}">
                  <i class="fas fa-trash"></i></button>
              </div>
            </div>
          </article>
        `;
      }).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-building"></i>
          <h3>No campuses configured</h3>
          <p>Add your first campus or branch to organize trainees geographically.</p>
          <button class="btn btn-primary" data-action="create-campus">
            <i class="fas fa-plus"></i> Create Campus</button>
        </div>
      `}
    </section>

    <section class="panel">
      <h3 class="panel-title">Campus Comparison</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Campus</th><th>Type</th><th>Manager</th>
              <th>Trainees</th><th>Programmes</th><th>Sessions/Month</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${campuses.map(c => `
              <tr>
                <td>${esc(c.name)}</td>
                <td><span class="chip chip-neutral">${esc(c.type || 'main')}</span></td>
                <td>${esc(c.manager_name || '—')}</td>
                <td>${c.trainee_count || 0}</td>
                <td>${c.programme_count || 0}</td>
                <td>${c.sessions_per_month || 0}</td>
                <td><span class="${statusClass(c.status || 'active')}">${esc(c.status || 'active')}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No campuses registered</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   PROGRAMMES (base + extended)
   ============================================================ */
function instProgrammes() {
  const q = ($('#programmes-q')?.value || '').toLowerCase();
  const statusFilter = $('#programmes-status')?.value || '';
  let list = S.programmes.slice();
  if (q) list = list.filter(p => (p.title || '').toLowerCase().includes(q));
  if (statusFilter) list = list.filter(p => p.status === statusFilter);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Programmes</span></div>
    <section class="page-header">
      <h1 class="page-title">Training Programmes</h1>
      <div class="page-actions">
        <input type="search" id="programmes-q" class="form-input" placeholder="Search..." value="${esc(q)}" style="max-width:200px" />
        <select id="programmes-status" class="form-select" style="max-width:150px">
          <option value="">All statuses</option>
          ${CONFIG.PROGRAMME_STATUSES.map(s => `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <button class="btn btn-primary" data-action="create-programme">
          <i class="fas fa-plus"></i> New Programme</button>
      </div>
    </section>

    <section class="card-grid">
      ${list.map(p => `
        <article class="program-card">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
            <span class="chip chip-blue">${esc(p.category || 'General')}</span>
            <span class="${statusClass(p.status)}">${esc(p.status)}</span>
          </div>
          <h4 class="program-title">${esc(p.title || '')}</h4>
          <p class="program-desc">${esc((p.description || '').slice(0, 130))}</p>
          ${p.prerequisite_title ? `
            <p class="program-meta" style="color:var(--warning-dark)">
              <i class="fas fa-lock"></i> Requires: ${esc(p.prerequisite_title)}
            </p>
          ` : ''}
          <footer class="program-footer">
            <span class="program-meta">${fmtDate(p.start_date)} to ${fmtDate(p.end_date)}</span>
            <span class="program-meta">${p.enrolled_count || 0} of ${p.capacity || 0} enrolled</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" data-action="view-programme" data-id="${p.id}">
              <i class="fas fa-eye"></i> View</button>
            <button class="btn btn-info btn-sm" data-action="edit-programme" data-id="${p.id}">
              <i class="fas fa-pen"></i> Edit</button>
            <button class="btn btn-primary btn-sm" data-action="programme-curriculum" data-id="${p.id}">
              <i class="fas fa-list"></i> Curriculum</button>
            <button class="btn btn-danger btn-sm" data-action="delete-programme" data-id="${p.id}">
              <i class="fas fa-trash"></i></button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-diagram-project"></i>
          <h3>No programmes yet</h3>
          <p>Create your first training programme to get started.</p>
          <button class="btn btn-primary" data-action="create-programme">
            <i class="fas fa-plus"></i> Create Programme</button>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   FEATURE 3 — LEARNING PATH BUILDER
   ============================================================ */
function instLearningPaths() {
  const paths = S.institutionLearningPaths || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Learning Paths</span></div>
    <section class="page-header">
      <h1 class="page-title">Learning Path Builder</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-learning-path">
          <i class="fas fa-plus"></i> New Path</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Learning paths sequence multiple programmes into a guided curriculum.
        Trainees advance step by step, unlocking certificates at completion.
      </div>
    </div>

    ${paths.length ? `
      <section class="card-grid">
        ${paths.map(lp => `
          <article class="program-card">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
              <span class="chip chip-blue">${lp.step_count || 0} step${(lp.step_count || 0) === 1 ? '' : 's'}</span>
              <span class="${lp.active ? 'status-active' : 'status-archived'}">${lp.active ? 'Active' : 'Inactive'}</span>
            </div>
            <h4 class="program-title">${esc(lp.title)}</h4>
            <p class="program-desc">${esc((lp.description || '').slice(0, 140))}</p>
            ${lp.badge_icon ? `<p class="program-meta"><i class="fas ${esc(lp.badge_icon)}"></i> Badge awarded at completion</p>` : ''}
            <footer class="program-footer">
              <span class="program-meta">${lp.enrolled_count || 0} enrolled</span>
              <span class="program-meta">${lp.completion_rate || 0}% completion</span>
            </footer>
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" data-action="open-path-builder" data-id="${lp.id}">
                <i class="fas fa-sitemap"></i> Builder</button>
              <button class="btn btn-secondary btn-sm" data-action="edit-learning-path" data-id="${lp.id}">
                <i class="fas fa-pen"></i> Edit</button>
              <button class="btn btn-danger btn-sm" data-action="delete-learning-path" data-id="${lp.id}">
                <i class="fas fa-trash"></i></button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-route"></i>
          <h3>No learning paths yet</h3>
          <p>Bundle programmes into a guided curriculum with automatic unlocking.</p>
          <button class="btn btn-primary" data-action="create-learning-path">
            <i class="fas fa-plus"></i> Create First Path</button>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   COHORTS
   ============================================================ */
function instCohorts() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Cohorts</span></div>
    <section class="page-header">
      <h1 class="page-title">Cohorts and Batches</h1>
      <button class="btn btn-primary" data-action="create-cohort">
        <i class="fas fa-plus"></i> New Cohort</button>
    </section>

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cohort</th><th>Programme</th><th>Instructor</th>
              <th>Dates</th><th>Capacity</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${S.cohorts.map(c => `
              <tr>
                <td>
                  <div class="user-name">${esc(c.name || '')}</div>
                  ${c.location ? `<div class="user-email">${esc(c.location)}</div>` : ''}
                </td>
                <td>${esc(c.programme_title || '-')}</td>
                <td>${esc(c.instructor_name || 'Unassigned')}</td>
                <td>${fmtDate(c.start_date)} to ${fmtDate(c.end_date)}</td>
                <td>
                  <div class="progress-bar" style="width:100px">
                    <span style="width:${c.capacity ? Math.min(100, (c.trainee_count / c.capacity) * 100) : 0}%"></span>
                  </div>
                  <small>${c.trainee_count || 0} of ${c.capacity || 0}</small>
                </td>
                <td><span class="${statusClass(c.status)}">${esc(c.status || '')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="view-cohort" data-id="${c.id}">View</button>
                  <button class="btn btn-info btn-xs" data-action="edit-cohort" data-id="${c.id}">Edit</button>
                  <button class="btn btn-primary btn-xs" data-action="cohort-waitlist" data-id="${c.id}">Waitlist</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-cohort" data-id="${c.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No cohorts created yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   TRAINING DELIVERY
   ============================================================ */
function instTraining() {
  const sessions = S.institutionSessions || [];
  const upcoming = sessions.filter(s => new Date(s.scheduled_at) > new Date() && s.status === 'scheduled');
  const past = sessions.filter(s => new Date(s.scheduled_at) <= new Date() && s.status !== 'cancelled');

  let avgAttendance = 0;
  if (past.length) {
    const sum = past.reduce((acc, s) => {
      const total = Number(s.total_count) || 0;
      return acc + (total ? (Number(s.present_count) / total) * 100 : 0);
    }, 0);
    avgAttendance = Math.round(sum / past.length);
  }

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Training Delivery</span></div>
    <section class="page-header">
      <h1 class="page-title">Training Delivery</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="view-calendar">
          <i class="fas fa-calendar"></i> Calendar View</button>
        <button class="btn btn-primary" data-action="schedule-session">
          <i class="fas fa-calendar-plus"></i> Schedule Session</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Upcoming</p><p class="stat-value">${upcoming.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed</p><p class="stat-value">${past.filter(s => s.status === 'completed').length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Avg. Attendance</p><p class="stat-value">${avgAttendance}%</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-user-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Sessions</p><p class="stat-value">${sessions.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-chalkboard-user"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Upcoming Sessions</h3>
      <ul class="list-stack">
        ${upcoming.map(s => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(s.title)}</span>
              <span class="list-row-sub">
                ${esc(s.cohort_name || '')} - ${fmtDT(s.scheduled_at)} -
                ${esc(s.instructor_name || 'Unassigned')} - ${s.duration_minutes} min
              </span>
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              <span class="chip chip-neutral">${esc((s.mode || '').replace('_', ' '))}</span>
              ${s.meeting_url ? `
                <a class="btn btn-primary btn-xs" href="${esc(s.meeting_url)}" target="_blank" rel="noopener">
                  <i class="fas fa-video"></i> Join</a>
              ` : ''}
              <a class="btn btn-secondary btn-xs" href="/api/institution/sessions/${s.id}/ics">
                <i class="fas fa-calendar-plus"></i> ICS</a>
              <button class="btn btn-info btn-xs" data-action="mark-attendance" data-id="${s.id}">
                <i class="fas fa-clipboard-check"></i> Attendance</button>
              <button class="btn btn-secondary btn-xs" data-action="edit-session" data-id="${s.id}">
                <i class="fas fa-pen"></i></button>
              <button class="btn btn-danger btn-xs" data-action="delete-session" data-id="${s.id}">
                <i class="fas fa-trash"></i></button>
            </div>
          </li>
        `).join('') || '<li class="empty-row">No upcoming sessions scheduled</li>'}
      </ul>
    </section>

    <section class="panel">
      <h3 class="panel-title">Recent Sessions</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Session</th><th>Cohort</th><th>Date</th>
              <th>Attendance</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${past.slice(0, 20).map(s => {
              const pct = Number(s.total_count)
                ? Math.round((Number(s.present_count) / Number(s.total_count)) * 100)
                : 0;
              return `
                <tr>
                  <td>${esc(s.title)}</td>
                  <td>${esc(s.cohort_name || '-')}</td>
                  <td>${fmtDT(s.scheduled_at)}</td>
                  <td>${s.present_count} of ${s.total_count} (${pct}%)</td>
                  <td><span class="${statusClass(s.status)}">${esc(s.status)}</span></td>
                  <td class="actions-cell">
                    <button class="btn btn-info btn-xs" data-action="mark-attendance" data-id="${s.id}">
                      View Attendance</button>
                  </td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="6" class="empty-row">No sessions recorded</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Training Materials</h3>
      ${S.institutionMaterials.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Title</th><th>Uploaded By</th><th>Date</th><th>Size</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${S.institutionMaterials.map(m => `
                <tr>
                  <td>${esc(m.title)}</td>
                  <td>${esc(m.uploaded_by_name || '-')}</td>
                  <td>${fmtDate(m.created_at)}</td>
                  <td>${formatBytes(m.file_size)}</td>
                  <td class="actions-cell">
                    <a class="btn btn-secondary btn-xs" href="${esc(m.file_url)}" target="_blank" rel="noopener">
                      <i class="fas fa-download"></i> Download</a>
                    <button class="btn btn-danger btn-xs" data-action="delete-material" data-id="${m.id}">
                      <i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="form-inline" style="margin-top:14px">
        <input id="matTitle" class="form-input" placeholder="Material title" />
        <select id="matCohort" class="form-select">
          <option value="">Any cohort</option>
          ${S.cohorts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
        </select>
        <input type="file" id="matFile" class="form-input" />
        <button class="btn btn-primary" data-action="upload-material">
          <i class="fas fa-upload"></i> Upload</button>
      </div>
    </section>
  `;
}

/* ============================================================
   ASSESSMENTS
   ============================================================ */
function instAssessments() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Assessments</span></div>
    <section class="page-header">
      <h1 class="page-title">Assessments</h1>
      <button class="btn btn-primary" data-action="schedule-assessment">
        <i class="fas fa-plus"></i> New Assessment</button>
    </section>

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Title</th><th>Type</th><th>Cohort</th><th>Weight</th>
              <th>Due</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${S.assessments.map(a => `
              <tr>
                <td>${esc(a.title || '')}</td>
                <td><span class="chip chip-neutral">${esc(a.type || '')}</span></td>
                <td>${esc(a.cohort_name || '-')}</td>
                <td>${a.weight || 0}%</td>
                <td>${fmtDate(a.due_date)}</td>
                <td><span class="${statusClass(a.status)}">${esc(a.status || '')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="view-assessment" data-id="${a.id}">View</button>
                  <button class="btn btn-info btn-xs" data-action="grade-assessment" data-id="${a.id}">Grade</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-assessment" data-id="${a.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No assessments yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   FEATURE 8 — PROCTORED EXAM SYSTEM
   ============================================================ */
function instProctorSessions() {
  const sessions = S.examProctorSessions || [];
  const flags = S.examProctorFlags || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Proctored Exams</span></div>
    <section class="page-header">
      <h1 class="page-title">Proctored Exam Sessions</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="schedule-proctor-session">
          <i class="fas fa-plus"></i> Schedule Proctored Exam</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-shield-halved"></i>
      <div>
        Proctored exams use webcam monitoring, browser lockdown and AI flagging to ensure integrity.
        Recordings are retained for 90 days unless a dispute is raised.
      </div>
    </div>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Sessions</p><p class="stat-value">${sessions.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-shield-halved"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed</p><p class="stat-value">${sessions.filter(s => s.status === 'completed').length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Flagged</p><p class="stat-value">${sessions.filter(s => s.integrity_score != null && s.integrity_score < 70).length}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-flag"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Live Now</p><p class="stat-value">${sessions.filter(s => s.status === 'in_progress').length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-video"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">All Sessions</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Exam</th><th>Trainee</th><th>Scheduled</th>
              <th>Mode</th><th>Integrity</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.map(s => {
              const score = s.integrity_score;
              const scoreClass = score == null ? '' : score >= 90 ? 'status-active' : score >= 70 ? 'status-pending' : 'status-rejected';
              return `
                <tr>
                  <td>${esc(s.exam_title || '-')}</td>
                  <td>${esc(s.trainee_name || '-')}</td>
                  <td>${fmtDT(s.scheduled_at)}</td>
                  <td><span class="chip chip-neutral">${esc(s.proctor_mode || 'webcam')}</span></td>
                  <td>
                    ${score != null
                      ? `<span class="${scoreClass}">${examIntegrityLabel(score)} (${score})</span>`
                      : '—'}
                  </td>
                  <td><span class="${statusClass(s.status)}">${esc(s.status)}</span></td>
                  <td class="actions-cell">
                    <button class="btn btn-info btn-xs" data-action="view-proctor-session" data-id="${s.id}">
                      View</button>
                    ${s.status === 'completed' && score != null && score < 70 ? `
                      <button class="btn btn-danger btn-xs" data-action="invalidate-exam" data-id="${s.id}">
                        Invalidate</button>
                    ` : ''}
                  </td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="7" class="empty-row">No proctored sessions yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    ${flags.length ? `
      <section class="panel">
        <h3 class="panel-title">Integrity Flags</h3>
        <ul class="list-stack">
          ${flags.map(f => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(f.trainee_name || '-')} — ${esc(f.flag_type)}</span>
                <span class="list-row-sub">${fmtDT(f.flagged_at)} · ${esc(f.description || '')}</span>
              </div>
              <button class="btn btn-secondary btn-xs" data-action="review-flag" data-id="${f.id}">
                Review</button>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}
  `;
}

/* ============================================================
   QUESTION BANK
   ============================================================ */
function instQuestionBank() {
  const q = ($('#qb-search')?.value || '').toLowerCase();
  let questions = S.institutionQuestions || [];
  if (q) questions = questions.filter(x => (x.question_text || '').toLowerCase().includes(q));

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Question Bank</span></div>
    <section class="page-header">
      <h1 class="page-title">Question Bank</h1>
      <div class="page-actions">
        <input type="search" id="qb-search" class="form-input" placeholder="Search questions..."
               value="${esc(q)}" style="max-width:240px" />
        <button class="btn btn-primary" data-action="create-question">
          <i class="fas fa-plus"></i> New Question</button>
      </div>
    </section>

    <section class="panel">
      ${questions.length ? `
        <ul class="list-stack">
          ${questions.map(x => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc((x.question_text || '').slice(0, 100))}</span>
                <span class="list-row-sub">
                  ${esc(x.question_type)} - ${esc(x.difficulty)} -
                  ${x.category ? esc(x.category) : 'Uncategorised'} - ${x.points} point${x.points === 1 ? '' : 's'}
                </span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-xs" data-action="edit-question" data-id="${x.id}">Edit</button>
                <button class="btn btn-danger btn-xs" data-action="delete-question" data-id="${x.id}">Delete</button>
              </div>
            </li>
          `).join('')}
        </ul>
      ` : `
        <div class="empty-state">
          <i class="fas fa-database"></i>
          <h3>No questions yet</h3>
          <p>Build a reusable bank of questions for your assessments.</p>
          <button class="btn btn-primary" data-action="create-question">
            <i class="fas fa-plus"></i> Create First Question</button>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   PROJECTS
   ============================================================ */
function instProjects() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Capstone Projects</span></div>
    <section class="page-header">
      <h1 class="page-title">Capstone Projects</h1>
      <button class="btn btn-primary" data-action="create-project">
        <i class="fas fa-plus"></i> New Project</button>
    </section>

    <section class="card-grid">
      ${S.projects.map(p => `
        <article class="program-card">
          <span class="chip chip-blue">${esc(p.category || 'Project')}</span>
          <span class="${statusClass(p.status)}" style="margin-left:6px">${esc(p.status)}</span>
          <h4 class="program-title">${esc(p.title || '')}</h4>
          <p class="program-desc">${esc((p.description || '').slice(0, 130))}</p>
          <footer class="program-footer">
            <span class="program-meta">Deadline: ${fmtDate(p.deadline)}</span>
            <span class="program-meta">${p.submissions_count || 0} submissions</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px">
            <button class="btn btn-secondary btn-sm" data-action="view-project" data-id="${p.id}">View</button>
            <button class="btn btn-info btn-sm" data-action="grade-project" data-id="${p.id}">Grade</button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-briefcase"></i>
          <h3>No projects yet</h3>
          <p>Create your first capstone project for a cohort.</p>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   TRAINEES
   ============================================================ */
function instTrainees() {
  const filterStatus = ($('#trainee-status-filter') || {}).value || '';
  const searchQuery = (($('#trainee-search') || {}).value || '').toLowerCase();
  const source = S.institutionEnrollments.length ? S.institutionEnrollments : S.trainees;

  let list = source.slice();
  if (filterStatus) list = list.filter(t => (t.status || t.lifecycle_status) === filterStatus);
  if (searchQuery) {
    list = list.filter(t =>
      (t.trainee_name || t.name || '').toLowerCase().includes(searchQuery) ||
      (t.email || '').toLowerCase().includes(searchQuery) ||
      (t.department || '').toLowerCase().includes(searchQuery)
    );
  }

  const counts = {
    total: source.length,
    active: source.filter(t => ['active','approved'].includes(t.status || t.lifecycle_status)).length,
    pending: source.filter(t => (t.status || t.lifecycle_status) === 'pending_approval').length,
    completed: source.filter(t => ['completed','certified'].includes(t.status || t.lifecycle_status)).length,
  };

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Trainees</span></div>
    <section class="page-header">
      <h1 class="page-title">Trainee Management</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="import-trainees-history">
          <i class="fas fa-history"></i> Import History</button>
        <button class="btn btn-primary" data-action="invite-trainee">
          <i class="fas fa-user-plus"></i> Import Trainees</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Enrolled</p><p class="stat-value">${counts.total}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Active</p><p class="stat-value">${counts.active}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Pending Approval</p><p class="stat-value">${counts.pending}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed</p><p class="stat-value">${counts.completed}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-award"></i></div>
      </div>
    </section>

    <section class="panel">
      <div class="page-actions" style="margin-bottom:14px">
        <input type="search" id="trainee-search" class="form-input"
               placeholder="Search by name, email, or department"
               value="${esc(searchQuery)}" style="max-width:300px" />
        <select id="trainee-status-filter" class="form-select" style="max-width:200px">
          <option value="">All statuses</option>
          ${CONFIG.LIFECYCLE_STATUSES.map(s => `
            <option value="${s}" ${filterStatus === s ? 'selected' : ''}>
              ${s.replace('_',' ')}</option>
          `).join('')}
        </select>
        <button class="btn btn-secondary" data-action="export-trainees">
          <i class="fas fa-download"></i> Export</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Trainee</th><th>Department</th><th>Programme</th>
              <th>Progress</th><th>Lifecycle</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(t => {
              const traineeId = t.user_id || t.id;
              const name = t.trainee_name || t.name || '';
              const email = t.email || '';
              const status = t.status || t.lifecycle_status || 'active';
              const progress = t.progress || 0;
              return `
                <tr>
                  <td>
                    <div class="user-cell">
                      <img class="user-avatar" src="${avatar({ name, email, avatar: t.avatar })}" alt="" />
                      <div>
                        <div class="user-name">
                          ${esc(name)}
                          ${t.at_risk ? '<span class="chip chip-red" style="margin-left:6px;font-size:.65rem">At Risk</span>' : ''}
                        </div>
                        <div class="user-email">${esc(email)}</div>
                      </div>
                    </div>
                  </td>
                  <td>${esc(t.department || '-')}</td>
                  <td>${esc(t.programme_title || '-')}</td>
                  <td>
                    <div class="progress-bar" style="width:80px"><span style="width:${progress}%"></span></div>
                    <small>${progress}%</small>
                  </td>
                  <td><span class="${statusClass(status)}">${esc(status.replace('_',' '))}</span></td>
                  <td class="actions-cell">
                    ${status === 'pending_approval' ? `
                      <button class="btn btn-success btn-xs" data-action="approve-enrolment" data-id="${t.id}">Approve</button>
                      <button class="btn btn-danger btn-xs" data-action="reject-enrolment" data-id="${t.id}">Reject</button>
                    ` : ''}
                    <button class="btn btn-secondary btn-xs" data-action="trainee-detail" data-id="${traineeId}">View</button>
                    ${t.id ? `<button class="btn btn-info btn-xs" data-action="trainee-transfer" data-id="${t.id}">Transfer</button>` : ''}
                    <button class="btn btn-warning btn-xs" data-action="trainee-notes" data-id="${t.id || traineeId}">Notes</button>
                  </td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="6" class="empty-row">No trainees found</td></tr>'}
          </tbody>
        </table>
      </div>

      ${paginationBar('institutionTrainees', S.page.institutionTrainees || 1, 50, S.institutionTraineeTotal || list.length)}
    </section>
  `;
}

/* ============================================================
   FEATURE 10 — WELLNESS & ENGAGEMENT
   ============================================================ */
function instWellness() {
  const scores = S.wellnessScores || [];
  const alerts = S.wellnessAlerts || [];
  const critical = alerts.filter(a => a.severity === 'critical');
  const high = alerts.filter(a => a.severity === 'high');
  const medium = alerts.filter(a => a.severity === 'medium');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Wellness & Engagement</span></div>
    <section class="page-header">
      <h1 class="page-title">Trainee Wellness & Engagement</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-wellness">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="recompute-wellness">
          <i class="fas fa-rotate"></i> Recompute Scores</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-heart-pulse"></i>
      <div>
        Wellness scores are computed from login frequency, attendance, assignment timeliness,
        forum engagement, quiz performance and feedback sentiment.
      </div>
    </div>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Critical Alerts</p><p class="stat-value" style="color:#dc2626">${critical.length}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-exclamation-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">High Risk</p><p class="stat-value" style="color:#f97316">${high.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-exclamation-triangle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Medium Risk</p><p class="stat-value" style="color:#eab308">${medium.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-info-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Avg. Wellness Score</p>
          <p class="stat-value">${scores.length ? Math.round(scores.reduce((s, x) => s + Number(x.score || 0), 0) / scores.length) : 0}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-heart"></i></div>
      </div>
    </section>

    ${alerts.length ? `
      <section class="panel">
        <h3 class="panel-title">Active Alerts</h3>
        <ul class="list-stack">
          ${alerts.map(a => `
            <li class="list-row" style="border-left:3px solid ${riskLevelColour(a.severity)}">
              <div class="list-row-main">
                <span class="list-row-title">${esc(a.trainee_name || 'Trainee')} — ${esc(a.reason)}</span>
                <span class="list-row-sub">${fmtDT(a.created_at)} · Score: ${a.score || 0}</span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-info btn-xs" data-action="wellness-intervene" data-id="${a.id}">
                  Intervene</button>
                <button class="btn btn-secondary btn-xs" data-action="wellness-dismiss" data-id="${a.id}">
                  Dismiss</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}

    <section class="panel">
      <h3 class="panel-title">Trainee Wellness Scores</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Trainee</th><th>Score</th><th>Risk</th>
              <th>Login Frequency</th><th>Attendance</th>
              <th>Timeliness</th><th>Engagement</th>
            </tr>
          </thead>
          <tbody>
            ${scores.map(s => `
              <tr>
                <td>${esc(s.trainee_name || 'Trainee')}</td>
                <td>
                  <strong>${s.score || 0}</strong>
                  ${renderMiniBar(s.score || 0, riskLevelColour(s.risk_level))}
                </td>
                <td><span class="chip" style="background:${riskLevelColour(s.risk_level)}20;color:${riskLevelColour(s.risk_level)};border:1px solid ${riskLevelColour(s.risk_level)}50">
                  ${esc(s.risk_level || 'low')}
                </span></td>
                <td>${s.login_frequency || 0}%</td>
                <td>${s.attendance_score || 0}%</td>
                <td>${s.timeliness_score || 0}%</td>
                <td>${s.engagement_score || 0}%</td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No wellness data computed yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   CERTIFICATIONS (with blockchain)
   ============================================================ */
function instCertifications() {
  const certs = S.institutionCertificates || [];
  const expiring = certs.filter(c => {
    if (!c.expires_at || c.revoked) return false;
    const days = (new Date(c.expires_at) - Date.now()) / 86400000;
    return days > 0 && days < 90;
  });
  const expired = certs.filter(c => c.expires_at && new Date(c.expires_at) < new Date() && !c.revoked);
  const active = certs.filter(c => !c.revoked && (!c.expires_at || new Date(c.expires_at) > new Date()));
  const totalCpd = certs.reduce((s, c) => s + Number(c.cpd_points || 0), 0);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Certifications</span></div>
    <section class="page-header">
      <h1 class="page-title">Certification Register</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-certificates">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="issue-certificate">
          <i class="fas fa-plus"></i> Issue Certificate</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Active</p><p class="stat-value">${active.length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-award"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Expiring (90 days)</p><p class="stat-value">${expiring.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Expired</p><p class="stat-value">${expired.length}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-exclamation-triangle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total CPD Points</p><p class="stat-value">${totalCpd.toFixed(0)}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-star"></i></div>
      </div>
    </section>

    ${expiring.length ? `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-circle"></i>
        <div>
          <strong>${expiring.length} certificate${expiring.length > 1 ? 's' : ''} expire within 90 days.</strong>
          Schedule refresher training to maintain compliance.
        </div>
      </div>
    ` : ''}

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Serial</th><th>Trainee</th><th>Programme</th>
              <th>Issued</th><th>Expires</th><th>CPD</th><th>Blockchain</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${certs.map(c => {
              const expDays = c.expires_at ? Math.ceil((new Date(c.expires_at) - Date.now()) / 86400000) : null;
              let statusLabel = 'Valid';
              let statusCss = 'status-active';
              if (c.revoked) { statusLabel = 'Revoked'; statusCss = 'status-rejected'; }
              else if (expDays !== null && expDays < 0) { statusLabel = 'Expired'; statusCss = 'status-rejected'; }
              else if (expDays !== null && expDays < 30) { statusLabel = 'Expiring Soon'; statusCss = 'status-pending'; }

              return `
                <tr>
                  <td><code class="code">${esc(c.serial)}</code></td>
                  <td>${esc(c.trainee_name || '-')}</td>
                  <td>${esc(c.programme_title || '-')}</td>
                  <td>${fmtDate(c.issued_at)}</td>
                  <td>${c.expires_at ? fmtDate(c.expires_at) : 'Never'}</td>
                  <td>${c.cpd_points || 0}</td>
                  <td>
                    ${c.blockchain_hash
                      ? `<span class="chip chip-green" title="${esc(c.blockchain_hash)}">
                          <i class="fas fa-cube"></i> On-chain</span>`
                      : '<span class="chip chip-neutral">Off-chain</span>'}
                  </td>
                  <td><span class="${statusCss}">${statusLabel}</span></td>
                  <td class="actions-cell">
                    <a class="btn btn-secondary btn-xs" href="/verify/${esc(c.serial)}" target="_blank" rel="noopener">
                      <i class="fas fa-external-link-alt"></i> Verify</a>
                    <a class="btn btn-secondary btn-xs" href="/api/institution/certificates/${c.id}/pdf" target="_blank">
                      <i class="fas fa-file-pdf"></i> PDF</a>
                    <button class="btn btn-info btn-xs" data-action="renew-certificate" data-id="${c.id}">Renew</button>
                    ${!c.revoked ? `<button class="btn btn-danger btn-xs" data-action="revoke-certificate" data-id="${c.id}">Revoke</button>` : ''}
                  </td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="9" class="empty-row">No certificates issued yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   SKILLS MATRIX
   ============================================================ */
function instSkills() {
  const m = S.institutionSkillsMatrix || { skills: [], matrix: [] };
  const levelColours = CONFIG.SKILL_LEVEL_COLOURS;
  const levelText = CONFIG.SKILL_LEVELS;

  if (!m.skills.length) {
    return `
      <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Skills Matrix</span></div>
      <section class="page-header">
        <h1 class="page-title">Skills and Competencies</h1>
        <button class="btn btn-primary" data-action="manage-skills">
          <i class="fas fa-plus"></i> Add First Skill</button>
      </section>
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-puzzle-piece"></i>
          <h3>No skills defined yet</h3>
          <p>Start by adding the competencies you want to track across your workforce.</p>
          <button class="btn btn-primary" data-action="manage-skills">
            <i class="fas fa-plus"></i> Add First Skill</button>
        </div>
      </section>
    `;
  }

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Skills Matrix</span></div>
    <section class="page-header">
      <h1 class="page-title">Skills and Competencies</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="manage-skills">
          <i class="fas fa-cog"></i> Manage Skills</button>
        <button class="btn btn-primary" data-action="export-skills-matrix">
          <i class="fas fa-download"></i> Export Matrix</button>
      </div>
    </section>

    <section class="panel">
      <p class="form-hint" style="margin-bottom:16px">
        Click any cell to cycle through proficiency levels 0 to 5. Changes save automatically.
      </p>

      <div style="overflow-x:auto">
        <table class="skills-matrix">
          <thead>
            <tr>
              <th style="min-width:200px;position:sticky;left:0;background:var(--surface);z-index:2">
                Trainee
              </th>
              ${m.skills.map(s => `
                <th style="min-width:100px;text-align:center" title="${esc(s.description || '')}">
                  <div style="font-size:.7rem;color:var(--text-muted)">${esc(s.category || '')}</div>
                  <div style="font-weight:600">${esc(s.name)}</div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${m.matrix.map(row => `
              <tr>
                <td style="position:sticky;left:0;background:var(--surface);z-index:1">
                  <div class="user-name">${esc(row.trainee.name)}</div>
                  <div class="user-email">${esc(row.trainee.department || '')}</div>
                </td>
                ${m.skills.map(s => {
                  const lvl = row.levels[s.id] || 0;
                  return `
                    <td class="skills-cell"
                        data-trainee="${row.trainee.id}"
                        data-skill="${s.id}"
                        data-level="${lvl}"
                        title="${levelText[lvl]}">
                      <span class="skill-level-dot"
                            style="background:${levelColours[lvl]};color:${lvl >= 4 ? '#fff' : '#374151'}">
                        ${lvl}
                      </span>
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="skills-legend">
        <strong>Legend:</strong>
        ${levelColours.map((c, i) => `
          <span class="skills-legend-item">
            <span class="skills-legend-swatch" style="background:${c}"></span>
            ${i} - ${levelText[i]}
          </span>
        `).join('')}
      </div>
    </section>
  `;
}

/* ============================================================
   FEATURE 4 — SKILLS GAP ANALYSIS
   ============================================================ */
function instSkillsGap() {
  const gap = S.skillsGapAnalysis || {};
  const categories = gap.categories || [];
  const topGaps = gap.topGaps || [];
  const deptGaps = gap.departmentGaps || [];
  const summary = gap.summary || {};

  const cellColour = (current, target) => {
    const diff = target - current;
    if (diff <= 0) return 'gap-ok';
    if (diff === 1) return 'gap-minor';
    if (diff === 2) return 'gap-moderate';
    return 'gap-severe';
  };

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Skills Gap</span></div>
    <section class="page-header">
      <h1 class="page-title">Skills Gap Analysis</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-skills-gap">
          <i class="fas fa-download"></i> Export Gaps</button>
        <button class="btn btn-primary" data-action="recompute-skills-gap">
          <i class="fas fa-rotate"></i> Recompute</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Skills Tracked</p><p class="stat-value">${summary.totalSkills || 0}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-list-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Skills at Target</p><p class="stat-value">${summary.skillsAtTarget || 0}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Skills Below Target</p><p class="stat-value">${summary.skillsBelowTarget || 0}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-exclamation-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Critical Gaps</p><p class="stat-value">${summary.criticalGaps || 0}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-fire"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Skill Coverage Heatmap</h3>
      <p class="form-hint" style="margin-bottom:12px">
        Cells show average proficiency vs. target. Red = largest gap, green = target met.
      </p>
      <div class="gap-heatmap-wrapper">
        <table class="gap-heatmap">
          <thead>
            <tr>
              <th>Department</th>
              ${categories.map(c => `<th>${esc(c.name)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${deptGaps.map(row => `
              <tr>
                <td class="gap-dept-name">${esc(row.department || 'Unassigned')}</td>
                ${categories.map(cat => {
                  const cell = row.skills?.[cat.id] || { avg: 0, target: 3 };
                  return `
                    <td class="${cellColour(cell.avg, cell.target)}" title="Avg ${cell.avg} / Target ${cell.target}">
                      ${cell.avg.toFixed ? cell.avg.toFixed(1) : cell.avg}
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('') || '<tr><td colspan="100%" class="empty-row">No department data yet</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="gap-legend">
        <span><span class="gap-swatch gap-ok"></span> At target</span>
        <span><span class="gap-swatch gap-minor"></span> 1 below</span>
        <span><span class="gap-swatch gap-moderate"></span> 2 below</span>
        <span><span class="gap-swatch gap-severe"></span> 3+ below</span>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Top Skill Gaps</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Skill</th><th>Category</th><th>Avg. Level</th>
              <th>Target</th><th>Gap</th><th>Affected Trainees</th><th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            ${topGaps.map(g => `
              <tr>
                <td>${esc(g.skill_name)}</td>
                <td><span class="chip chip-neutral">${esc(g.category || '—')}</span></td>
                <td>${Number(g.avg_level || 0).toFixed(1)}</td>
                <td>${g.target_level || 3}</td>
                <td>
                  <span class="${g.gap >= 2 ? 'status-rejected' : g.gap >= 1 ? 'status-pending' : 'status-active'}">
                    ${g.gap > 0 ? `-${g.gap}` : 'At target'}
                  </span>
                </td>
                <td>${g.affected_trainees || 0}</td>
                <td>${esc(g.recommendation || 'Add targeted programme')}</td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No gaps identified</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   FEATURE 5 — COMPLIANCE REPORTING SUITE
   ============================================================ */
function instCompliance() {
  const rules = S.institutionComplianceRules || [];
  const certs = S.institutionCertificates || [];
  const runs = S.complianceRuns || [];
  const now = new Date();
  const expired = certs.filter(c => c.expires_at && new Date(c.expires_at) < now && !c.revoked);
  const expiring30 = certs.filter(c => {
    if (!c.expires_at || c.revoked) return false;
    const days = (new Date(c.expires_at) - now) / 86400000;
    return days > 0 && days < 30;
  });

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Compliance</span></div>
    <section class="page-header">
      <h1 class="page-title">Compliance Reporting Suite</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-compliance-report">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="run-compliance-check">
          <i class="fas fa-play"></i> Run Compliance Check</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Active Rules</p><p class="stat-value">${rules.filter(r => r.active).length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-shield-halved"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Expired Certificates</p><p class="stat-value" style="color:#dc2626">${expired.length}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-exclamation-triangle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Expiring in 30 Days</p><p class="stat-value" style="color:#f97316">${expiring30.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Compliant</p>
          <p class="stat-value">${certs.filter(c => !c.revoked && (!c.expires_at || new Date(c.expires_at) > now)).length}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Compliance Rules</h3>
      ${rules.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Title</th><th>Programme</th><th>Target</th><th>Recurrence</th><th>Mandatory</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${rules.map(r => `
                <tr>
                  <td>${esc(r.title)}</td>
                  <td>${esc(r.programme_title || '-')}</td>
                  <td>${esc(r.target_role || r.target_department || 'All')}</td>
                  <td>Every ${r.recurrence_months} month${r.recurrence_months === 1 ? '' : 's'}</td>
                  <td>${r.mandatory ? '<span class="chip chip-blue">Mandatory</span>' : 'Optional'}</td>
                  <td><span class="${r.active ? 'status-active' : 'status-archived'}">${r.active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="empty-row">No compliance rules defined yet</p>'}
    </section>

    ${runs.length ? `
      <section class="panel">
        <h3 class="panel-title">Recent Compliance Runs</h3>
        <ul class="list-stack">
          ${runs.slice(0, 10).map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.run_name)}</span>
                <span class="list-row-sub">${fmtDT(r.started_at)} · ${r.findings_count || 0} findings</span>
              </div>
              <span class="${r.status === 'passed' ? 'status-active' : 'status-rejected'}">
                ${esc(r.status)}
              </span>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}
  `;
}

/* ============================================================
   FEATURE 11 — SUCCESSION PLANNING (9-box)
   ============================================================ */
function instSuccession() {
  const m = S.successionMatrix || { boxes: CONFIG.SUCCESSION_BOXES, trainees: [], assignments: [] };
  const boxes = CONFIG.SUCCESSION_BOXES;
  const assignmentMap = {};
  (m.assignments || []).forEach(a => {
    const key = `${a.performance}-${a.potential}`;
    (assignmentMap[key] = assignmentMap[key] || []).push(a);
  });

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Succession Planning</span></div>
    <section class="page-header">
      <h1 class="page-title">Succession Planning (9-Box Grid)</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-succession">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="assign-succession">
          <i class="fas fa-plus"></i> Assign Trainee</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-sitemap"></i>
      <div>
        Map high-performers and high-potentials to prioritize development, retention and promotion.
        Drag trainees between boxes to update their placement.
      </div>
    </div>

    <section class="panel">
      <h3 class="panel-title">9-Box Grid</h3>
      <div class="nine-box-grid">
        ${['high', 'medium', 'low'].map(perf => `
          ${['low', 'medium', 'high'].map(pot => {
            const box = boxes.find(b => b.performance === perf && b.potential === pot);
            const people = assignmentMap[`${perf}-${pot}`] || [];
            return `
              <div class="nine-box-cell nine-box-${box?.code || 'unknown'}"
                   data-perf="${perf}" data-pot="${pot}">
                <div class="nine-box-label">${esc(box?.label || '')}</div>
                <div class="nine-box-people">
                  ${people.map(p => `
                    <div class="nine-box-person" draggable="true" data-trainee="${p.trainee_id}">
                      <img class="user-avatar-sm" src="${avatar({ name: p.trainee_name })}" alt="" />
                      <span>${esc(p.trainee_name)}</span>
                    </div>
                  `).join('') || '<span class="nine-box-empty">No one</span>'}
                </div>
              </div>
            `;
          }).join('')}
        `).join('')}
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Box Descriptions</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Box</th><th>Performance</th><th>Potential</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${boxes.map(b => `
              <tr>
                <td><strong>${esc(b.label)}</strong></td>
                <td>${esc(b.performance)}</td>
                <td>${esc(b.potential)}</td>
                <td>${
                  b.code === 'star' ? 'Promote / retain aggressively'
                  : b.code === 'high_pot' ? 'Accelerated development track'
                  : b.code === 'current_star' ? 'Stretch assignments'
                  : b.code === 'core' ? 'Maintain and grow'
                  : b.code === 'risk' ? 'PIP or exit plan'
                  : 'Tailored development'
                }</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   INSTRUCTORS
   ============================================================ */
function instInstructors() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Instructors</span></div>
    <section class="page-header">
      <h1 class="page-title">Instructors</h1>
      <button class="btn btn-primary" data-action="assign-instructor">
        <i class="fas fa-plus"></i> Assign Instructor</button>
    </section>

    <section class="card-grid">
      ${S.instructors.map(i => `
        <article class="expert-card">
          <img class="expert-avatar" src="${avatar(i)}" alt="" />
          <h4 class="expert-name">${esc(i.name || '')}</h4>
          <p class="expert-expertise">${esc(i.specialization || '-')}</p>
          <p class="expert-rate">${i.programme_count || 0} programme${(i.programme_count || 0) === 1 ? '' : 's'}</p>
          <button class="btn btn-secondary btn-block" data-action="view-instructor" data-id="${i.id}">
            View Profile</button>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-user-tie"></i>
          <h3>No instructors assigned</h3>
          <p>Assign expert instructors to your programmes and cohorts.</p>
          <button class="btn btn-primary" data-action="assign-instructor">
            <i class="fas fa-plus"></i> Assign Instructor</button>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   FEATURE 6 — INSTRUCTOR MARKETPLACE
   ============================================================ */
function instMarketplace() {
  const list = S.instructorMarketplace || [];
  const contracts = S.instructorContracts || [];
  const q = ($('#market-search')?.value || '').toLowerCase();
  const filtered = q
    ? list.filter(x =>
        (x.name || '').toLowerCase().includes(q) ||
        (x.specialization || '').toLowerCase().includes(q))
    : list;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Instructor Marketplace</span></div>
    <section class="page-header">
      <h1 class="page-title">Instructor Marketplace</h1>
      <div class="page-actions">
        <input type="search" id="market-search" class="form-input" placeholder="Search instructors..."
               value="${esc(q)}" style="max-width:260px" />
        <button class="btn btn-primary" data-action="post-instructor-request">
          <i class="fas fa-plus"></i> Post Requirement</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-people-arrows"></i>
      <div>
        Browse verified instructors, filter by specialization and availability,
        and hire directly with one click. Contracts include automatic rate cards and NDA templates.
      </div>
    </div>

    <section class="panel">
      <h3 class="panel-title">Available Instructors</h3>
      <section class="card-grid">
        ${filtered.map(i => `
          <article class="expert-card">
            <img class="expert-avatar" src="${avatar(i)}" alt="" />
            <h4 class="expert-name">
              ${esc(i.name || '')}
              ${i.verified ? '<span class="badge-verified-sm"><i class="fas fa-check-circle"></i></span>' : ''}
            </h4>
            <p class="expert-expertise">${esc(i.specialization || '')}</p>
            <p class="expert-rate">${fmtCur(i.hourly_rate || 0)}/hr</p>
            <p class="expert-rating">
              <i class="fas fa-star" style="color:#f59e0b"></i>
              ${Number(i.average_rating || 0).toFixed(1)}
            </p>
            <p class="program-meta">${i.programmes_completed || 0} programmes delivered</p>
            <button class="btn btn-primary btn-block" data-action="hire-instructor"
                    data-id="${i.id}" data-name="${esc(i.name || '')}">
              <i class="fas fa-handshake"></i> Hire</button>
          </article>
        `).join('') || `
          <div class="empty-state" style="grid-column:1/-1">
            <i class="fas fa-search"></i>
            <h3>No instructors found</h3>
          </div>
        `}
      </section>
    </section>

    ${contracts.length ? `
      <section class="panel">
        <h3 class="panel-title">Active Contracts</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Instructor</th><th>Programme</th><th>Rate</th>
                <th>Start</th><th>End</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${contracts.map(c => `
                <tr>
                  <td>${esc(c.instructor_name)}</td>
                  <td>${esc(c.programme_title || '-')}</td>
                  <td>${fmtCur(c.rate)}</td>
                  <td>${fmtDate(c.start_date)}</td>
                  <td>${fmtDate(c.end_date)}</td>
                  <td><span class="${statusClass(c.status)}">${esc(c.status)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    ` : ''}
  `;
}

/* ============================================================
   FEATURE 7 — BUDGETS & COST ALLOCATION
   ============================================================ */
function instBudgets() {
  const budgets = S.budgetAllocations || [];
  const transactions = S.budgetTransactions || [];
  const totalAllocated = budgets.reduce((s, b) => s + Number(b.allocated || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const util = pctOf(totalSpent, totalAllocated || 1);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Budgets</span></div>
    <section class="page-header">
      <h1 class="page-title">Budget & Cost Allocation</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-budgets">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="create-budget">
          <i class="fas fa-plus"></i> New Budget</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Allocated</p><p class="stat-value">${fmtCur(totalAllocated)}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-coins"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Total Spent</p><p class="stat-value">${fmtCur(totalSpent)}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Remaining</p><p class="stat-value">${fmtCur(totalRemaining)}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-piggy-bank"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Overall Utilisation</p><p class="stat-value">${util}%</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-chart-pie"></i></div>
      </div>
    </section>

    ${budgets.length ? `
      <section class="panel">
        <h3 class="panel-title">Departmental Budgets</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Department</th><th>Period</th>
                <th>Allocated</th><th>Spent</th><th>Remaining</th>
                <th>Utilisation</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${budgets.map(b => {
                const utilPct = pctOf(b.spent, b.allocated || 1);
                return `
                  <tr>
                    <td>${esc(b.department)}</td>
                    <td>${esc(b.period || 'monthly')}</td>
                    <td>${fmtCur(b.allocated)}</td>
                    <td>${fmtCur(b.spent)}</td>
                    <td>${fmtCur(b.allocated - b.spent)}</td>
                    <td>
                      <div class="${budgetUtilClass(utilPct)}">
                        ${renderMiniBar(utilPct, utilPct >= 95 ? '#dc2626' : utilPct >= 80 ? '#f59e0b' : '#22c55e')}
                        ${utilPct}%
                      </div>
                    </td>
                    <td class="actions-cell">
                      <button class="btn btn-secondary btn-xs" data-action="edit-budget" data-id="${b.id}">
                        Edit</button>
                      <button class="btn btn-info btn-xs" data-action="view-budget-transactions" data-id="${b.id}">
                        Transactions</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-coins"></i>
          <h3>No budgets configured</h3>
          <p>Set up departmental budgets to track training spend.</p>
          <button class="btn btn-primary" data-action="create-budget">
            <i class="fas fa-plus"></i> Create First Budget</button>
        </div>
      </section>
    `}

    ${transactions.length ? `
      <section class="panel">
        <h3 class="panel-title">Recent Budget Transactions</h3>
        <ul class="list-stack">
          ${transactions.slice(0, 20).map(t => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(t.description || 'Transaction')}</span>
                <span class="list-row-sub">${esc(t.department || '')} · ${fmtDT(t.created_at)}</span>
              </div>
              <span class="list-row-price" style="color:${t.amount >= 0 ? 'var(--accent)' : 'var(--danger)'}">
                ${t.amount >= 0 ? '+' : ''}${fmtCur(t.amount)}
              </span>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}
  `;
}

/* ============================================================
   FEATURE 9 — BLOCKCHAIN-VERIFIED CERTIFICATES
   ============================================================ */
function renderBlockchainSection() {
  const certs = S.blockchainCerts || [];
  return `
    <section class="panel">
      <h3 class="panel-title">
        <i class="fas fa-cube"></i> Blockchain-Verified Certificates</h3>
      <p class="form-hint">
        Certificates issued with blockchain anchoring provide permanent, tamper-proof verification.
      </p>
      ${certs.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Serial</th><th>Trainee</th><th>Blockchain Hash</th><th>Issued</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${certs.map(c => `
                <tr>
                  <td><code class="code">${esc(c.serial)}</code></td>
                  <td>${esc(c.trainee_name)}</td>
                  <td><code class="code" title="${esc(c.blockchain_hash)}">${truncateHash(c.blockchain_hash, 10)}</code></td>
                  <td>${fmtDate(c.issued_at)}</td>
                  <td><a class="btn btn-info btn-xs" href="/verify/${esc(c.serial)}" target="_blank">Verify</a></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="empty-row">No blockchain-verified certificates yet</p>'}
    </section>
  `;
}

/* ============================================================
   REPORTS (base)
   ============================================================ */
function instReports() {
  const st = S.institutionStats || {};
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Reports</span></div>
    <section class="page-header">
      <h1 class="page-title">Reports and Insights</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-institution-report">
          <i class="fas fa-download"></i> Export CSV</button>
        <button class="btn btn-primary" data-action="schedule-report">
          <i class="fas fa-calendar-plus"></i> Schedule Report</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completion Rate</p>
          <p class="stat-value">${st.avgCompletionRate || st.avg_completion_rate || 0}%</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Avg. Score</p>
          <p class="stat-value">${st.avgScore || st.avg_score || 0}%</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Attendance Rate</p><p class="stat-value">${st.attendanceRate || 0}%</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-user-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Certificates Issued</p>
          <p class="stat-value">${S.institutionCertificates.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-award"></i></div>
      </div>
    </section>

    <section class="dashboard-columns">
      <div class="panel">
        <h3 class="panel-title">Quick Reports</h3>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button class="btn btn-secondary btn-block" data-action="report-programme-scorecard">
            <i class="fas fa-chart-bar"></i> Programme Scorecard</button>
          <button class="btn btn-secondary btn-block" data-action="report-cohort-comparison">
            <i class="fas fa-chart-line"></i> Cohort Comparison</button>
          <button class="btn btn-secondary btn-block" data-action="report-trainee-progress">
            <i class="fas fa-users"></i> Trainee Progress Heatmap</button>
          <button class="btn btn-secondary btn-block" data-action="report-compliance">
            <i class="fas fa-shield-halved"></i> Compliance Report</button>
          <button class="btn btn-secondary btn-block" data-action="report-cost">
            <i class="fas fa-dollar-sign"></i> Cost Analysis</button>
        </div>
      </div>

      <div class="panel">
        <h3 class="panel-title">Scheduled Reports</h3>
        ${S.institutionScheduledReports.length ? `
          <ul class="list-stack">
            ${S.institutionScheduledReports.map(r => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(r.template_name || 'Report')}</span>
                  <span class="list-row-sub">${esc(r.frequency)} - Next: ${fmtDate(r.next_run_at)}</span>
                </div>
                <span class="${r.active ? 'status-active' : 'status-archived'}">${r.active ? 'Active' : 'Paused'}</span>
              </li>
            `).join('')}
          </ul>
        ` : `
          <div class="empty-state" style="padding:24px 12px">
            <i class="fas fa-calendar"></i>
            <p>No scheduled reports</p>
            <button class="btn btn-primary btn-sm" data-action="schedule-report">
              <i class="fas fa-plus"></i> Schedule One</button>
          </div>
        `}
      </div>
    </section>

    <section class="panel">
      ${renderBlockchainSection()}
    </section>
  `;
}

/* ============================================================
   FEATURE 15 — REPORT BUILDER
   ============================================================ */
function instReportBuilder() {
  const defs = S.savedReportDefinitions || [];
  const fieldLib = CONFIG.REPORT_FIELD_LIBRARY;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Report Builder</span></div>
    <section class="page-header">
      <h1 class="page-title">Custom Report Builder</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="new-report-definition">
          <i class="fas fa-plus"></i> New Report</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-table-columns"></i>
      <div>
        Build custom reports by picking data sources, filtering, choosing columns
        and selecting aggregations. Save them for one-click reuse.
      </div>
    </div>

    <section class="panel">
      <h3 class="panel-title">Saved Report Definitions</h3>
      ${defs.length ? `
        <ul class="list-stack">
          ${defs.map(d => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(d.name)}</span>
                <span class="list-row-sub">${esc(d.data_source)} · ${(d.columns || []).length} columns · ${fmtDate(d.created_at)}</span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-primary btn-xs" data-action="run-saved-report" data-id="${d.id}">
                  <i class="fas fa-play"></i> Run</button>
                <button class="btn btn-secondary btn-xs" data-action="edit-report-definition" data-id="${d.id}">
                  <i class="fas fa-pen"></i></button>
                <button class="btn btn-danger btn-xs" data-action="delete-report-definition" data-id="${d.id}">
                  <i class="fas fa-trash"></i></button>
              </div>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-row">No custom reports saved yet</p>'}
    </section>

    <section class="panel">
      <h3 class="panel-title">Available Fields</h3>
      <div class="field-library">
        ${Object.entries(fieldLib).map(([source, fields]) => `
          <div class="field-library-group">
            <h5>${esc(source)}</h5>
            <ul>
              ${fields.map(f => `<li><code class="code">${esc(f)}</code></li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

/* ============================================================
   ORG STRUCTURE
   ============================================================ */
function instOrgStructure() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Org Structure</span></div>
    <section class="page-header">
      <h1 class="page-title">Organisational Structure</h1>
      <button class="btn btn-primary" data-action="create-org-unit">
        <i class="fas fa-plus"></i> New Unit</button>
    </section>

    <section class="panel">
      ${S.institutionOrgUnits.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Name</th><th>Type</th><th>Code</th><th>Manager</th><th>Budget</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${S.institutionOrgUnits.map(u => `
                <tr>
                  <td>${esc(u.name)}</td>
                  <td><span class="chip chip-neutral">${esc((u.unit_type || '').replace('_',' '))}</span></td>
                  <td>${esc(u.code || '-')}</td>
                  <td>${esc(u.manager_name || '-')}</td>
                  <td>${fmtCur(u.budget_amount || 0)}</td>
                  <td>${u.active ? '<span class="status-active">Active</span>' : '<span class="status-archived">Inactive</span>'}</td>
                  <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs" data-action="edit-org-unit" data-id="${u.id}">Edit</button>
                    <button class="btn btn-danger btn-xs" data-action="delete-org-unit" data-id="${u.id}">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">
          <i class="fas fa-sitemap"></i>
          <h3>No organisational units yet</h3>
          <p>Model your departments, branches, and cost centres.</p>
          <button class="btn btn-primary" data-action="create-org-unit">
            <i class="fas fa-plus"></i> Create First Unit</button>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   FEATURE 14 — INSTITUTION-WIDE ANNOUNCEMENTS
   ============================================================ */
function instAnnouncements() {
  const list = S.announcements || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Announcements</span></div>
    <section class="page-header">
      <h1 class="page-title">Institution Announcements</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-announcement">
          <i class="fas fa-plus"></i> New Announcement</button>
      </div>
    </section>

    ${list.length ? `
      <section class="panel">
        <ul class="list-stack">
          ${list.map(a => `
            <li class="list-row" style="border-left:4px solid ${
              a.priority === 'critical' ? '#dc2626'
              : a.priority === 'urgent' ? '#f97316'
              : a.priority === 'important' ? '#eab308'
              : '#0ea5e9'
            }">
              <div class="list-row-main">
                <span class="list-row-title">${esc(a.title)}</span>
                <span class="list-row-sub">
                  Scope: ${esc(a.scope)} · Priority: ${esc(a.priority)} ·
                  ${fmtDT(a.created_at)} · Views: ${a.view_count || 0}
                </span>
                <p style="margin-top:6px;color:var(--text-soft)">${esc(a.body?.slice(0, 160))}</p>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px">
                <button class="btn btn-secondary btn-xs" data-action="edit-announcement" data-id="${a.id}">
                  Edit</button>
                <button class="btn btn-danger btn-xs" data-action="delete-announcement" data-id="${a.id}">
                  Delete</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-bullhorn"></i>
          <h3>No announcements yet</h3>
          <p>Broadcast important updates to your teams, cohorts or departments.</p>
          <button class="btn btn-primary" data-action="create-announcement">
            <i class="fas fa-plus"></i> Create First Announcement</button>
        </div>
      </section>
    `}
  `;
}

/* ============================================================
   FEATURE 13 — API KEYS & WEBHOOKS
   ============================================================ */
function instIntegrations() {
  const keys = S.apiKeys || [];
  const hooks = S.webhooks || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Integrations & API</span></div>
    <section class="page-header">
      <h1 class="page-title">Integrations & API</h1>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-plug"></i>
      <div>
        Build integrations with your HRIS, LMS or custom apps.
        API keys and webhooks are scoped to your institution.
      </div>
    </div>

    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 class="panel-title">API Keys</h3>
        <button class="btn btn-primary btn-sm" data-action="create-api-key">
          <i class="fas fa-plus"></i> New API Key</button>
      </div>
      ${keys.length ? `
        <div class="table-wrapper" style="margin-top:12px">
          <table class="data-table">
            <thead>
              <tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Last Used</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${keys.map(k => `
                <tr>
                  <td>${esc(k.name)}</td>
                  <td><code class="code">${esc(k.prefix)}...</code></td>
                  <td>
                    ${(k.scopes || []).map(s => `<span class="chip chip-neutral" style="margin:2px">${esc(s)}</span>`).join('')}
                  </td>
                  <td>${k.last_used_at ? timeAgo(k.last_used_at) : 'Never'}</td>
                  <td>${k.revoked ? '<span class="status-rejected">Revoked</span>' : '<span class="status-active">Active</span>'}</td>
                  <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs" data-action="copy-api-key" data-id="${k.id}">
                      <i class="fas fa-copy"></i> Copy</button>
                    ${!k.revoked ? `<button class="btn btn-danger btn-xs" data-action="revoke-api-key" data-id="${k.id}">
                      Revoke</button>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="empty-row">No API keys yet</p>'}
    </section>

    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 class="panel-title">Webhooks</h3>
        <button class="btn btn-primary btn-sm" data-action="create-webhook">
          <i class="fas fa-plus"></i> New Webhook</button>
      </div>
      ${hooks.length ? `
        <div class="table-wrapper" style="margin-top:12px">
          <table class="data-table">
            <thead>
              <tr><th>URL</th><th>Events</th><th>Status</th><th>Last Fired</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${hooks.map(h => `
                <tr>
                  <td><code class="code">${esc(h.url)}</code></td>
                  <td>
                    ${(h.events || []).slice(0, 3).map(e => `<span class="chip chip-neutral" style="margin:2px">${esc(e)}</span>`).join('')}
                    ${(h.events || []).length > 3 ? `<span class="chip chip-neutral">+${h.events.length - 3}</span>` : ''}
                  </td>
                  <td>${h.active ? '<span class="status-active">Active</span>' : '<span class="status-archived">Inactive</span>'}</td>
                  <td>${h.last_fired_at ? timeAgo(h.last_fired_at) : 'Never'}</td>
                  <td class="actions-cell">
                    <button class="btn btn-info btn-xs" data-action="test-webhook" data-id="${h.id}">Test</button>
                    <button class="btn btn-secondary btn-xs" data-action="edit-webhook" data-id="${h.id}">Edit</button>
                    <button class="btn btn-danger btn-xs" data-action="delete-webhook" data-id="${h.id}">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="empty-row">No webhooks configured</p>'}
    </section>
  `;
}

/* ============================================================
   FEATURE 12 — SSO / SECURITY
   ============================================================ */
function instSecurity() {
  const sso = S.ssoConfiguration || {};
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>SSO & Security</span></div>
    <section class="page-header">
      <h1 class="page-title">SSO & Security</h1>
    </section>

    <section class="panel">
      <h3 class="panel-title">Single Sign-On (SSO)</h3>
      <p class="form-hint" style="margin-bottom:14px">
        Connect your identity provider to enable seamless login for trainees and staff.
      </p>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">SSO Provider</span>
          <select id="sso-provider" class="form-select">
            <option value="">— Disabled —</option>
            ${CONFIG.SSO_PROVIDERS.map(p => `
              <option value="${p}" ${sso.provider === p ? 'selected' : ''}>${p.replace(/_/g, ' ')}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Entity ID / Issuer</span>
          <input id="sso-entity" class="form-input" value="${esc(sso.entity_id || '')}" />
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Metadata URL</span>
          <input id="sso-metadata-url" class="form-input" value="${esc(sso.metadata_url || '')}" placeholder="https://idp.example.com/metadata" />
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Certificate (X.509)</span>
          <textarea id="sso-cert" class="form-textarea" rows="4">${esc(sso.certificate || '')}</textarea>
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-sso">
          <i class="fas fa-save"></i> Save SSO Configuration</button>
        <button class="btn btn-secondary" data-action="test-sso">
          <i class="fas fa-check"></i> Test Connection</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Security Policies</h3>
      <div class="form-grid">
        <label class="checkbox-row">
          <input type="checkbox" id="sec-force-mfa" ${sso.force_mfa ? 'checked' : ''} />
          Force multi-factor authentication for all users
        </label>
        <label class="checkbox-row">
          <input type="checkbox" id="sec-ip-whitelist" ${sso.ip_whitelist_enabled ? 'checked' : ''} />
          Enable IP whitelist for admin access
        </label>
        <label class="checkbox-row">
          <input type="checkbox" id="sec-session-timeout" ${sso.session_timeout ? 'checked' : ''} />
          Auto-logout inactive sessions after 8 hours
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-security-policy">
          <i class="fas fa-save"></i> Save Policies</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Recent Login Activity</h3>
      <ul class="list-stack">
        ${(sso.recent_logins || []).map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.user_name || 'User')} signed in</span>
              <span class="list-row-sub">${esc(l.ip || '—')} · ${fmtDT(l.timestamp)}</span>
            </div>
            <span class="${statusClass(l.status || 'success')}">${esc(l.status || 'success')}</span>
          </li>
        `).join('') || '<li class="empty-row">No recent logins</li>'}
      </ul>
    </section>
  `;
}

/* ============================================================
   OPERATIONS CONTROL
   ============================================================ */
function instOperations() {
  const isOps = currentUser && currentUser.institution_role === 'operations_manager';
  if (!isOps) {
    return `
      <div class="empty-state">
        <i class="fas fa-lock"></i>
        <h3>Access Restricted</h3>
        <p>Only the Operations Manager can access this area.</p>
      </div>`;
  }

  const pendingApprovals = S.institutionApprovals.filter(a => a.status === 'pending');
  const inst = S.myInstitution || {};

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Operations Control</span></div>
    <section class="page-header"><h1 class="page-title">Operations Control</h1></section>

    <section class="panel">
      <h3 class="panel-title">Institution Settings</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Display name</span>
          <input id="instSetName" class="form-input" value="${esc(inst.name || '')}" /></label>
        <label class="form-group"><span class="form-label">Contact email</span>
          <input id="instSetEmail" class="form-input" value="${esc(inst.contact_email || '')}" /></label>
        <label class="form-group"><span class="form-label">Default programme capacity</span>
          <input id="instSetCap" type="number" class="form-input" value="${inst.default_capacity || 30}" /></label>
        <label class="form-group"><span class="form-label">Assessment pass mark (%)</span>
          <input id="instSetPass" type="number" class="form-input" value="${inst.pass_mark || 70}" /></label>
        <label class="form-group"><span class="form-label">Seat allocation</span>
          <input id="instSetSeats" type="number" class="form-input" value="${inst.seat_allocation || 0}" /></label>
        <label class="form-group">
          <span class="form-label">Billing cycle</span>
          <select id="instSetBilling" class="form-select">
            <option value="monthly" ${inst.billing_cycle === 'monthly' ? 'selected' : ''}>Monthly</option>
            <option value="quarterly" ${inst.billing_cycle === 'quarterly' ? 'selected' : ''}>Quarterly</option>
            <option value="annual" ${inst.billing_cycle === 'annual' ? 'selected' : ''}>Annual</option>
          </select>
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-institution-settings">
          <i class="fas fa-save"></i> Save Settings</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Approval Queue ${pendingApprovals.length ? `(${pendingApprovals.length})` : ''}</h3>
      <ul class="list-stack">
        ${pendingApprovals.map(a => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">
                ${esc((a.request_type || '').replace('_',' '))}
                ${a.total_steps > 1 ? `<span class="chip chip-neutral" style="margin-left:6px">Step ${a.current_step} of ${a.total_steps}</span>` : ''}
              </span>
              <span class="list-row-sub">
                Requested by ${esc(a.requested_by_name || 'Unknown')} - ${fmtDT(a.created_at)}
              </span>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-success btn-xs" data-action="approve-request" data-id="${a.id}">Approve</button>
              <button class="btn btn-danger btn-xs" data-action="reject-request" data-id="${a.id}">Reject</button>
            </div>
          </li>
        `).join('') || '<li class="empty-row">No pending approvals</li>'}
      </ul>
    </section>

    <section class="panel">
      <h3 class="panel-title">Team and Roles</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Member</th><th>Role</th><th>Email</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${S.institutionTeam.map(t => `
              <tr>
                <td>
                  <div class="user-cell">
                    <img class="user-avatar" src="${avatar(t)}" alt="" />
                    <div class="user-name">${esc(t.name || '')}</div>
                  </div>
                </td>
                <td><span class="chip chip-neutral">${esc((t.institution_role || '').replace('_',' '))}</span></td>
                <td>${esc(t.email || '')}</td>
                <td><span class="${statusClass(t.status || 'active')}">${esc(t.status || '')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-info btn-xs" data-action="change-team-role" data-id="${t.id}">Change Role</button>
                  <button class="btn btn-secondary btn-xs" data-action="manage-team-permissions" data-id="${t.id}">Permissions</button>
                  <button class="btn btn-danger btn-xs" data-action="remove-team-member" data-id="${t.id}">Remove</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="empty-row">No team members yet</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="invite-team-member">
          <i class="fas fa-user-plus"></i> Invite Team Member</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Institution Audit Log</h3>
      <ul class="list-stack">
        ${((S.institutionStats || {}).auditLog || []).slice(0, 20).map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.action || '')}</span>
              <span class="list-row-sub">by ${esc(l.actor_name || 'System')}</span>
            </div>
            <span class="list-row-meta">${fmtDT(l.created_at)}</span>
          </li>
        `).join('') || '<li class="empty-row">No entries</li>'}
      </ul>
    </section>
  `;
}

/* ============================================================
   BRANDING
   ============================================================ */
function instBranding() {
  const inst = S.institutionBranding || S.myInstitution || {};
  const primary = inst.primary_color || '#1e3a8a';
  const accent = inst.accent_color || '#059669';

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Custom Branding</span></div>
    <section class="page-header"><h1 class="page-title">Custom Branding</h1></section>

    <section class="panel">
      <h3 class="panel-title">Logo and Colours</h3>
      <div class="form-grid">
        <label class="form-group form-group-full">
          <span class="form-label">Institution logo</span>
          <input type="file" id="brandLogo" class="form-input" accept="image/*" />
          ${inst.logo_url ? `<img src="${esc(inst.logo_url)}" alt="Current logo" style="max-height:60px;margin-top:8px" />` : ''}
        </label>
        <label class="form-group"><span class="form-label">Primary colour</span>
          <input type="color" id="brandPrimary" class="form-input" value="${esc(primary)}" /></label>
        <label class="form-group"><span class="form-label">Accent colour</span>
          <input type="color" id="brandAccent" class="form-input" value="${esc(accent)}" /></label>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Email and Welcome</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Sender name</span>
          <input id="brandEmailName" class="form-input"
                 value="${esc(inst.email_sender_name || '')}" placeholder="ACME Academy" /></label>
        <label class="form-group"><span class="form-label">Reply-to address</span>
          <input id="brandEmailAddr" type="email" class="form-input"
                 value="${esc(inst.email_sender_address || '')}" /></label>
        <label class="form-group form-group-full">
          <span class="form-label">Welcome message</span>
          <textarea id="brandWelcome" class="form-textarea" rows="3">${esc(inst.welcome_message || '')}</textarea>
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-branding">
          <i class="fas fa-save"></i> Save Branding</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Preview</h3>
      <div class="brand-preview" style="
        background: linear-gradient(135deg, ${esc(primary)}, ${esc(accent)});
        color: #fff; padding: 32px; border-radius: var(--r-lg); text-align: center;">
        ${inst.logo_url ? `<img src="${esc(inst.logo_url)}" alt=""
                style="height:56px;margin:0 auto 16px;filter:brightness(0) invert(1)" />` : ''}
        <h2 style="margin:0;color:#fff;font-size:1.5rem">${esc(inst.name || 'Your Institution')}</h2>
        <p style="margin:8px 0 0;opacity:.9;font-size:.9rem">Training Portal</p>
      </div>
    </section>
  `;
}

/* ============================================================
   INSTITUTION PROFILE
   ============================================================ */
function instProfile() {
  const inst = S.myInstitution || {};
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Institution Profile</span></div>
    <section class="page-header"><h1 class="page-title">Institution Profile</h1></section>

    <section class="panel">
      <div class="profile-header">
        <div class="profile-avatar" style="
          background: linear-gradient(135deg, var(--brand), var(--accent));
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 1.6rem">
          <i class="fas fa-building"></i>
        </div>
        <div>
          <h2 class="profile-name">${esc(inst.name || 'Institution')}</h2>
          <p class="profile-email">
            ${esc(inst.contact_email || '')} -
            <span class="${statusClass(inst.status || 'active')}">${esc(inst.status || 'active')}</span>
          </p>
        </div>
      </div>

      <div class="form-grid">
        <label class="form-group"><span class="form-label">Institution name</span>
          <input id="instProfileName" class="form-input" value="${esc(inst.name || '')}" /></label>
        <label class="form-group">
          <span class="form-label">Type</span>
          <select id="instProfileType" class="form-select">
            ${CONFIG.INSTITUTION_TYPES.map(t => `
              <option value="${t}" ${inst.type === t ? 'selected' : ''}>${t}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group"><span class="form-label">Industry</span>
          <input id="instProfileIndustry" class="form-input" value="${esc(inst.industry || '')}" /></label>
        <label class="form-group"><span class="form-label">Contact phone</span>
          <input id="instProfilePhone" class="form-input" value="${esc(inst.contact_phone || '')}" /></label>
        <label class="form-group form-group-full"><span class="form-label">Address</span>
          <input id="instProfileAddress" class="form-input" value="${esc(inst.address || '')}" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="update-institution-profile">
          <i class="fas fa-save"></i> Save Changes</button>
      </div>
    </section>
  `;
}

/* ============================================================
   INSTITUTION CHARTS
   ============================================================ */
function renderInstitutionCharts() {
  if (!window.Chart) return;
  const rootStyle = getComputedStyle(document.documentElement);
  const primary = rootStyle.getPropertyValue('--brand').trim() || '#1e3a8a';
  const accent = rootStyle.getPropertyValue('--accent').trim() || '#059669';

  const p = document.getElementById('chartInstProgress');
  if (p && !p.dataset.rendered) {
    new Chart(p, {
      type: 'line',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
        datasets: [{
          label: 'Average Progress',
          data: [10, 25, 42, 58, 74, 88],
          borderColor: primary,
          backgroundColor: hexToRgba(primary, 0.15),
          tension: 0.3, fill: true,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } },
    });
    p.dataset.rendered = '1';
  }

  const a = document.getElementById('chartInstAssess');
  if (a && !a.dataset.rendered) {
    new Chart(a, {
      type: 'bar',
      data: {
        labels: ['0-59', '60-69', '70-79', '80-89', '90-100'],
        datasets: [{
          label: 'Trainees',
          data: [3, 7, 15, 22, 11],
          backgroundColor: accent, borderRadius: 6,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    a.dataset.rendered = '1';
  }

  /* Analytics Center charts */
  const enrollCanvas = document.getElementById('chartEnrollmentTrend');
  if (enrollCanvas && !enrollCanvas.dataset.rendered) {
    const series = S.institutionAnalytics?.trends?.enrollment || [
      { label: 'W1', value: 24 }, { label: 'W2', value: 38 },
      { label: 'W3', value: 52 }, { label: 'W4', value: 71 },
    ];
    new Chart(enrollCanvas, {
      type: 'line',
      data: {
        labels: series.map(x => x.label),
        datasets: [{ label: 'Enrollments', data: series.map(x => x.value),
          borderColor: primary, backgroundColor: hexToRgba(primary, 0.15), tension: 0.3, fill: true }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    enrollCanvas.dataset.rendered = '1';
  }

  const completionCanvas = document.getElementById('chartCompletionTrend');
  if (completionCanvas && !completionCanvas.dataset.rendered) {
    const series = S.institutionAnalytics?.trends?.completion || [
      { label: 'W1', value: 12 }, { label: 'W2', value: 22 },
      { label: 'W3', value: 38 }, { label: 'W4', value: 55 },
    ];
    new Chart(completionCanvas, {
      type: 'line',
      data: {
        labels: series.map(x => x.label),
        datasets: [{ label: 'Completed', data: series.map(x => x.value),
          borderColor: accent, backgroundColor: hexToRgba(accent, 0.15), tension: 0.3, fill: true }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    completionCanvas.dataset.rendered = '1';
  }

  const revenueCanvas = document.getElementById('chartRevenueTrend');
  if (revenueCanvas && !revenueCanvas.dataset.rendered) {
    const series = S.institutionAnalytics?.trends?.revenue || [
      { label: 'M1', value: 5000 }, { label: 'M2', value: 8200 },
      { label: 'M3', value: 7400 }, { label: 'M4', value: 9600 },
    ];
    new Chart(revenueCanvas, {
      type: 'bar',
      data: {
        labels: series.map(x => x.label),
        datasets: [{ label: 'Revenue', data: series.map(x => x.value), backgroundColor: primary, borderRadius: 6 }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    revenueCanvas.dataset.rendered = '1';
  }

  const mixCanvas = document.getElementById('chartProgrammeMix');
  if (mixCanvas && !mixCanvas.dataset.rendered) {
    const mix = S.institutionAnalytics?.programmeMix || [
      { label: 'Bootcamp', value: 12 }, { label: 'Short Course', value: 8 },
      { label: 'Certification', value: 6 }, { label: 'Compliance', value: 4 },
    ];
    new Chart(mixCanvas, {
      type: 'doughnut',
      data: {
        labels: mix.map(x => x.label),
        datasets: [{ data: mix.map(x => x.value),
          backgroundColor: ['#1e3a8a', '#059669', '#7c3aed', '#f59e0b', '#dc2626'] }],
      },
      options: { responsive: true },
    });
    mixCanvas.dataset.rendered = '1';
  }
}

function attachInstitutionInteractions() {
  document.querySelectorAll('.skills-cell').forEach(cell => {
    cell.onclick = async () => {
      const cur = Number(cell.dataset.level);
      const next = (cur + 1) % 6;
      const colours = CONFIG.SKILL_LEVEL_COLOURS;
      const dot = cell.querySelector('.skill-level-dot');
      cell.dataset.level = next;
      dot.style.background = colours[next];
      dot.style.color = next >= 4 ? '#fff' : '#374151';
      dot.textContent = next;
      try {
        await apiCall('/api/institution/skills/assess', 'PUT', {
          trainee_id: Number(cell.dataset.trainee),
          skill_id: Number(cell.dataset.skill),
          level: next,
        });
      } catch (e) {
        showToast(e.message, 'error');
        cell.dataset.level = cur;
        dot.style.background = colours[cur];
        dot.textContent = cur;
      }
    };
  });

  const statusFilter = $('#trainee-status-filter');
  if (statusFilter) statusFilter.onchange = () => rerenderRoleContent();

  const traineeSearch = $('#trainee-search');
  if (traineeSearch) traineeSearch.oninput = debounce(() => rerenderRoleContent(), 300);

  const expertSearch = $('#expert-search');
  if (expertSearch) expertSearch.oninput = debounce(() => rerenderRoleContent(), 250);
}

/* ============================================================
   CHAT MODAL
   ============================================================ */
function renderChatModal() {
  return `
    <div id="chat-modal" class="modal-overlay hidden">
      <div class="modal-content chat-modal">
        <header class="chat-header">
          <div>
            <h3 class="chat-title" id="chat-title">Consultation</h3>
            <p class="chat-sub" id="chat-sub"></p>
          </div>
          <div class="chat-header-actions">
            <button class="icon-btn" data-action="open-video" title="Video call">
              <i class="fas fa-video"></i></button>
            <button class="icon-btn" data-chat-close title="Close">
              <i class="fas fa-times"></i></button>
          </div>
        </header>
        <div id="chat-messages" class="chat-messages"></div>
        <div class="chat-typing" id="chat-typing"></div>
        <div class="chat-input-row">
          <label class="chat-attach">
            <i class="fas fa-paperclip"></i>
            <input type="file" hidden id="chat-file" />
          </label>
          <input id="chat-input" class="form-input" placeholder="Type your message..." />
          <button class="btn btn-primary" data-action="send-chat">
            <i class="fas fa-paper-plane"></i></button>
        </div>
      </div>
    </div>`;
}

function renderChatMessages(cid) {
  const c = $('#chat-messages');
  if (!c) return;
  const msgs = S.chatMessages[cid] || [];
  c.innerHTML = msgs.map(m => `
    <div class="chat-message ${m.sender_id === currentUser?.id ? 'chat-message-sent' : 'chat-message-received'}">
      ${m.attachment_url ? `
        <a class="chat-attachment" href="${esc(m.attachment_url)}" target="_blank">
          <i class="fas fa-paperclip"></i> Attachment</a>
      ` : ''}
      <p class="chat-text">${esc(m.message || '')}</p>
      <span class="chat-meta">${esc(m.sender_name || '')} · ${timeAgo(m.created_at)}${m.read_at ? ' - Read' : ''}</span>
    </div>
  `).join('') || '<p class="empty-row">No messages yet.</p>';
  c.scrollTop = c.scrollHeight;
}

async function openChat(cid) {
  currentChatId = cid;
  const modal = $('#chat-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  const c = S.consultations.find(x => x.id === cid);
  $('#chat-title').textContent = c?.title || 'Consultation';
  $('#chat-sub').textContent = `${c?.status || ''} · ${c?.consultation_type || ''}`;
  if (socket) socket.emit('join_consultation', cid);
  try {
    const d = await apiCall(`/api/common/consultations/${cid}/messages`);
    S.chatMessages[cid] = d.messages || [];
  } catch (_) { S.chatMessages[cid] = []; }
  renderChatMessages(cid);
  const input = $('#chat-input');
  input.onkeydown = e => {
    if (e.key === 'Enter') { sendMessage(cid, e.target.value); return; }
    if (socket) socket.emit('typing', { consultation_id: cid, is_typing: true });
    clearTimeout(chatTypingTimer);
    chatTypingTimer = setTimeout(() => socket && socket.emit('typing', { consultation_id: cid, is_typing: false }), 1200);
  };
  $('#chat-file').onchange = e => uploadChatFile(cid, e.target.files[0]);
}
function closeChat() {
  if (currentChatId && socket) socket.emit('leave_consultation', currentChatId);
  $('#chat-modal')?.classList.add('hidden');
  currentChatId = null;
}
async function sendMessage(cid, text) {
  if (!text?.trim()) return;
  try {
    await apiCall(`/api/common/consultations/${cid}/messages`, 'POST', { message: text });
    const i = $('#chat-input');
    if (i) i.value = '';
  } catch (e) { showToast(e.message, 'error'); }
}
async function uploadChatFile(cid, file) {
  if (!file) return;
  const fd = new FormData();
  fd.append('attachments', file);
  try {
    showLoading(true);
    await apiCall(`/api/common/consultations/${cid}/attachments`, 'POST', fd, true);
    showToast('File uploaded', 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

/* ============================================================
   ROLE EVENTS (delegated)
   ============================================================ */
let roleClickHandler = null;
function attachRoleEvents() {
  if (roleClickHandler) document.removeEventListener('click', roleClickHandler);
  roleClickHandler = async (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const action = t.dataset.action;
    const id = t.dataset.id;
    try {
      await handleAction(action, id, t, e);
    } catch (ex) {
      showToast(ex.message || 'Action failed', 'error');
    }
  };
  document.addEventListener('click', roleClickHandler);

  document.querySelectorAll('[data-eschool-tab]').forEach(btn => {
    btn.onclick = () => {
      activeESchoolTab = btn.dataset.eschoolTab;
      $$('[data-eschool-tab]').forEach(x => x.classList.remove('tab-btn-active'));
      btn.classList.add('tab-btn-active');
      const p = $('#eschool-panel');
      if (p) p.innerHTML = renderESchoolPanel();
    };
  });

  document.querySelectorAll('[data-chat-close]').forEach(b => b.onclick = closeChat);
  renderCharts();

  if (currentUserRole === 'institution') attachInstitutionInteractions();
}

/* ============================================================
   MASTER ACTION HANDLER
   ============================================================ */
async function handleAction(action, id, el) {
  switch (action) {
    /* ---------- COMMON ---------- */
    case 'switch-tab': activeTab = el.dataset.tab; return rerenderRoleContent();
    case 'refresh-all':
      showLoading(true);
      await loadAllData();
      rerenderRoleContent();
      showLoading(false);
      return showToast('Refreshed', 'success');
    case 'export-dashboard': return downloadCsv('dashboard-users.csv', S.users);
    case 'export-users': return downloadCsv('users.csv', S.users);
    case 'help': return showToast('Support: support@experthub.com', 'info');
    case 'paginate': {
      const resource = el.dataset.resource;
      const page = Number(el.dataset.page);
      if (S.page[resource] !== undefined) {
        S.page[resource] = page;
        await loadAllData();
        return rerenderRoleContent();
      }
      return;
    }
    case 'clear-selection':
      selectedRows[el.dataset.target]?.clear();
      return rerenderRoleContent();

    /* ---------- ADMIN ---------- */
    case 'approve-user':
      await apiCall(`/api/admin/users/${id}/approve`, 'PUT');
      await reloadUsers(); showToast('User approved', 'success'); return rerenderRoleContent();
    case 'suspend-user':
      await apiCall(`/api/admin/users/${id}/suspend`, 'PUT');
      await reloadUsers(); showToast('User suspended', 'success'); return rerenderRoleContent();
    case 'reject-user': {
      const reason = prompt('Reason for rejection?') || '';
      await apiCall(`/api/admin/users/${id}/reject`, 'PUT', { reason });
      await reloadUsers(); showToast('User rejected', 'warning'); return rerenderRoleContent();
    }
    case 'delete-user': {
      if (!await confirmDialog('Delete this user permanently?')) return;
      await apiCall(`/api/admin/users/${id}`, 'DELETE');
      await reloadUsers(); showToast('User deleted', 'success'); return rerenderRoleContent();
    }
    case 'bulk-approve-users': {
      if (!await confirmDialog(`Approve ${selectedRows.users.size} user(s)?`)) return;
      showLoading(true);
      for (const uid of selectedRows.users) {
        await apiCall(`/api/admin/users/${uid}/approve`, 'PUT').catch(() => {});
      }
      selectedRows.users.clear();
      await reloadUsers(); showLoading(false);
      showToast('Users approved', 'success'); return rerenderRoleContent();
    }
    case 'bulk-suspend-users': {
      if (!await confirmDialog(`Suspend ${selectedRows.users.size} user(s)?`)) return;
      showLoading(true);
      for (const uid of selectedRows.users) {
        await apiCall(`/api/admin/users/${uid}/suspend`, 'PUT').catch(() => {});
      }
      selectedRows.users.clear();
      await reloadUsers(); showLoading(false);
      showToast('Users suspended', 'warning'); return rerenderRoleContent();
    }
    case 'edit-user': return openEditUserModal(id);
    case 'show-create-expert': $('#createExpertPanel')?.classList.remove('hidden'); return;
    case 'hide-create-expert': $('#createExpertPanel')?.classList.add('hidden'); return;
    case 'submit-create-expert': return submitCreateExpert();
    case 'assign-consultation': return openAssignExpertModal(id);
    case 'view-consultation': return showConsultationModal(id);
    case 'create-event': return openEventModal();
    case 'edit-event': return openEventModal(id);
    case 'delete-event': {
      if (!await confirmDialog('Delete this event?')) return;
      await apiCall(`/api/admin/events/${id}`, 'DELETE');
      await loadAllData(); showToast('Event deleted', 'success'); return rerenderRoleContent();
    }
    case 'create-institution': return openInstitutionModal();
    case 'edit-institution': return openInstitutionModal(Number(id));
    case 'approve-institution':
      await apiCall(`/api/admin/institutions/${id}/approve`, 'PUT');
      await reloadInstitutions(); showToast('Institution verified', 'success'); return rerenderRoleContent();
    case 'reject-institution': {
      const reason = prompt('Reason for rejection?') || '';
      await apiCall(`/api/admin/institutions/${id}/reject`, 'PUT', { reason });
      await reloadInstitutions(); showToast('Institution rejected', 'warning'); return rerenderRoleContent();
    }
    case 'suspend-institution':
      await apiCall(`/api/admin/institutions/${id}/suspend`, 'PUT');
      await reloadInstitutions(); return rerenderRoleContent();
    case 'delete-institution': {
      if (!await confirmDialog('Delete this institution permanently?')) return;
      await apiCall(`/api/admin/institutions/${id}`, 'DELETE');
      await reloadInstitutions(); showToast('Institution deleted', 'success'); return rerenderRoleContent();
    }
    case 'assign-ops-manager': return openAssignOpsModal(id);
    case 'payout-approve': await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'approved' }); return reloadPayoutsAndRerender('Payout approved');
    case 'payout-process': await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'processing' }); return reloadPayoutsAndRerender('Payout processing');
    case 'payout-paid': await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'paid' }); return reloadPayoutsAndRerender('Payout marked paid');
    case 'payout-reject': {
      const reason = prompt('Rejection reason?') || '';
      await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'rejected', reason });
      return reloadPayoutsAndRerender('Payout rejected');
    }
    case 'refund-approve':
      await apiCall(`/api/admin/refunds/${id}`, 'PUT', { status: 'approved' });
      await loadAllData(); showToast('Refund approved', 'success'); return rerenderRoleContent();
    case 'refund-reject': {
      const reason = prompt('Rejection reason?') || '';
      await apiCall(`/api/admin/refunds/${id}`, 'PUT', { status: 'rejected', reason });
      await loadAllData(); showToast('Refund rejected', 'warning'); return rerenderRoleContent();
    }
    case 'create-coupon': return openCreateCouponModal();
    case 'toggle-coupon': await apiCall(`/api/admin/coupons/${id}/toggle`, 'PUT'); await loadAllData(); return rerenderRoleContent();
    case 'delete-coupon': {
      if (!await confirmDialog('Delete this coupon?')) return;
      await apiCall(`/api/admin/coupons/${id}`, 'DELETE'); await loadAllData(); return rerenderRoleContent();
    }
    case 'claim-investigate': await apiCall(`/api/admin/claims/${id}`, 'PUT', { status: 'investigating' }); return loadAllData().then(() => rerenderRoleContent());
    case 'claim-resolve': {
      const resolution = prompt('Resolution details?') || '';
      await apiCall(`/api/admin/claims/${id}`, 'PUT', { status: 'resolved', resolution });
      await loadAllData(); showToast('Claim resolved', 'success'); return rerenderRoleContent();
    }
    case 'claim-reject': {
      const resolution = prompt('Rejection reason?') || '';
      await apiCall(`/api/admin/claims/${id}`, 'PUT', { status: 'rejected', resolution });
      await loadAllData(); showToast('Claim rejected', 'warning'); return rerenderRoleContent();
    }
    case 'ticket-view': return openTicketModal(id);
    case 'ticket-resolve':
      await apiCall(`/api/admin/tickets/${id}`, 'PUT', { status: 'resolved' });
      return loadAllData().then(() => { showToast('Ticket resolved', 'success'); rerenderRoleContent(); });
    case 'review-publish': await apiCall(`/api/admin/reviews/${id}`, 'PUT', { status: 'published' }); return loadAllData().then(() => rerenderRoleContent());
    case 'review-hide': await apiCall(`/api/admin/reviews/${id}`, 'PUT', { status: 'hidden' }); return loadAllData().then(() => rerenderRoleContent());
    case 'send-broadcast': return sendBroadcast();
    case 'save-settings': return saveAdminSettings();
    case 'dispute-investigate':
      await apiCall(`/api/admin/disputes/${id}`, 'PUT', { status: 'investigating' });
      await loadAllData(); showToast('Marked investigating', 'info'); return rerenderRoleContent();
    case 'dispute-resolve': {
      const refundAmount = Number(prompt('Refund amount (0 for none)?', '0') || 0);
      const resolution_notes = prompt('Resolution notes?') || '';
      await apiCall(`/api/admin/disputes/${id}`, 'PUT', {
        status: 'resolved',
        resolution: refundAmount > 0 ? 'Partial refund approved' : 'Resolved',
        resolution_notes, refund_amount: refundAmount,
      });
      await loadAllData(); showToast('Dispute resolved', 'success'); return rerenderRoleContent();
    }
    case 'dispute-reject': {
      const notes = prompt('Reason for rejection?') || '';
      await apiCall(`/api/admin/disputes/${id}`, 'PUT', {
        status: 'rejected', resolution: 'Rejected',
        resolution_notes: notes, refund_amount: 0,
      });
      await loadAllData(); showToast('Dispute rejected', 'warning'); return rerenderRoleContent();
    }
    case 'verify-expert-badge': {
      const badge = prompt('Badge type: verified | top_rated', 'verified');
      if (!badge) return;
      await apiCall(`/api/admin/experts/${id}/verify-badge`, 'POST', { badge });
      showToast('Badge granted', 'success'); return;
    }

    /* ---------- EXPERT ---------- */
    case 'open-chat': return openChat(Number(id));
    case 'video-call': return openVideoCall(id);
    case 'open-video': return openVideoCall(currentChatId);
    case 'confirm-consultation':
      await apiCall(`/api/consultations/${id}/confirm`, 'PUT');
      await loadAllData(); showToast('Confirmed', 'success'); return rerenderRoleContent();
    case 'start-session':
      await apiCall(`/api/consultations/${id}/start`, 'POST');
      await loadAllData(); rerenderRoleContent(); openVideoCall(id); return;
    case 'end-session':
      await apiCall(`/api/consultations/${id}/complete`, 'POST');
      await loadAllData(); closeChat(); rerenderRoleContent();
      showToast('Session ended. 24h auto-release window started.', 'info', 5000); return;
    case 'save-availability': return saveAvailability();
    case 'request-time-off': return requestTimeOff();
    case 'request-withdrawal': return requestWithdrawal();
    case 'reply-review': {
      const reply = prompt('Your reply:') || '';
      if (!reply.trim()) return;
      await apiCall(`/api/expert/reviews/${id}/reply`, 'POST', { reply });
      await loadAllData(); showToast('Reply posted', 'success'); return rerenderRoleContent();
    }
    case 'update-expert-profile': return updateExpertProfile();
    case 'view-public-profile': return showToast(`Public profile: /#/expert/${currentUser?.id || 'me'}`, 'info');
    case 'add-portfolio-item': return openPortfolioItemModal();
    case 'edit-portfolio-item': return openPortfolioItemModal(Number(id));
    case 'delete-portfolio-item': {
      if (!await confirmDialog('Delete this portfolio item?')) return;
      await apiCall(`/api/expert/portfolio/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); showToast('Item deleted', 'success'); return;
    }
    case 'create-course-modal': return openCreateCourseModal();
    case 'manage-slots': return openManageSlotsModal();
    case 'block-time': return openBlockTimeModal();
    case 'remove-slot':
      await apiCall(`/api/experts/me/slots/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); showToast('Slot removed', 'success'); return;
    case 'edit-tiers': return openEditTiersModal();
    case 'open-course-builder': {
      S.__activeCourseId = id;
      activeTab = 'course-builder';
      return rerenderRoleContent();
    }
    case 'add-module': return openAddModuleModal(Number(el.dataset.id));
    case 'edit-module': return openEditModuleModal(Number(id));
    case 'delete-module': {
      if (!await confirmDialog('Delete this module and its lessons?')) return;
      const courseId = S.__activeCourseId;
      await apiCall(`/api/expert/courses/${courseId}/modules/${id}`, 'DELETE');
      await loadCourseCurriculum(courseId); rerenderRoleContent(); return;
    }
    case 'add-lesson': return openAddLessonModal(Number(el.dataset.module));
    case 'edit-lesson': return openEditLessonModal(Number(id));
    case 'delete-lesson': {
      if (!await confirmDialog('Delete this lesson?')) return;
      const courseId = S.__activeCourseId;
      await apiCall(`/api/expert/courses/${courseId}/lessons/${id}`, 'DELETE');
      await loadCourseCurriculum(courseId); rerenderRoleContent(); return;
    }
    case 'save-course-settings': return saveCourseSettings(Number(el.dataset.id));
    case 'preview-course': return openCourseDetailModal(Number(id));
    case 'edit-course': return openEditCourseModal(Number(id));
    case 'delete-course': {
      if (!await confirmDialog('Delete this course permanently?')) return;
      await apiCall(`/api/expert/courses/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); showToast('Course deleted', 'success'); return;
    }
    case 'view-course-analytics': return showToast('Analytics opened', 'info');
    case 'answer-question': {
      const answer = prompt('Your answer:') || '';
      if (!answer.trim()) return;
      await apiCall(`/api/expert/questions/${id}/answer`, 'PUT', { answer });
      const d = await apiCall('/api/expert/questions');
      S.expertQuestions = d.questions || [];
      rerenderRoleContent(); showToast('Answer posted', 'success'); return;
    }
    case 'bulk-publish-courses':
      showToast('Bulk publish queued', 'success'); return;

    /* ---------- USER: CONSULTATIONS ---------- */
    case 'find-expert-wizard': return openFindExpertWizard();
    case 'instant-consultation': return openInstantConsultationModal();
    case 'book-slot-with': return openBookSlotWithExpert(Number(id), el.dataset.name);
    case 'book-expert': return openBookSlotWithExpert(Number(id), el.dataset.name);
    case 'reschedule-consultation': return openRescheduleModal(Number(id));
    case 'cancel-consultation': return openCancelConsultationModal(Number(id));
    case 'consultation-detail': return openConsultationDetailModal(Number(id));
    case 'review-consultation': return openConsultationReviewModal(Number(id), Number(el.dataset.expert));
    case 'tip-expert': return openTipModal(Number(id));
    case 'book-followup': return openBookSlotWithExpert(Number(el.dataset.expert), 'Expert');
    case 'open-dispute': return openDisputeModal(Number(id));
    case 'view-expert-profile': return openExpertProfileModal(Number(id));
    case 'toggle-shortlist':
      await apiCall('/api/user/shortlist/toggle', 'POST', { expert_id: Number(id) });
      await loadAllData(); rerenderRoleContent(); showToast('Shortlist updated', 'success'); return;
    case 'purchase-package': {
      showLoading(true);
      await apiCall(`/api/packages/${id}/purchase`, 'POST');
      await loadAllData(); closeModal(); showLoading(false);
      showToast('Package purchased', 'success'); return;
    }
    case 'use-package-credit': return showToast('Booking with package credit', 'info');

    /* ---------- USER: E-SCHOOL ---------- */
    case 'enroll-modal': return openEnrollModal(Number(id));
    case 'resume-course': return openCoursePlayer(el.dataset.course);
    case 'open-course-player': return openCoursePlayer(Number(id));
    case 'open-course-detail':
    case 'view-course-detail': return openCourseDetailModal(Number(id));
    case 'open-lesson': return openCoursePlayer(Number(el.dataset.course), Number(el.dataset.lesson));
    case 'mark-lesson-complete': return markLessonComplete(Number(el.dataset.lesson));
    case 'toggle-wishlist':
      await apiCall('/api/user/wishlist/toggle', 'POST', { course_id: Number(id) });
      await loadAllData(); rerenderRoleContent(); showToast('Wishlist updated', 'success'); return;
    case 'start-free-trial': {
      await apiCall(`/api/eschool/courses/${id}/start-trial`, 'POST');
      showToast('Trial started — 48 hours of access', 'success');
      closeModal(); return openCoursePlayer(Number(id));
    }
    case 'purchase-bundle': {
      await apiCall(`/api/eschool/bundles/${id}/purchase`, 'POST');
      await loadAllData(); showToast('Bundle purchased', 'success'); return rerenderRoleContent();
    }
    case 'open-path-detail': return showToast('Path details opened', 'info');
    case 'review-course': return openCourseReviewModal(Number(id));
    case 'view-certificate': return showToast('Certificate view opened', 'info');
    case 'request-refund': return openRefundModal(Number(id));
    case 'export-certificates':
      return downloadCsv('certificates.csv', S.certificates);

    /* ---------- USER: MISC ---------- */
    case 'register-event':
      await apiCall(`/api/common/events/${id}/register`, 'POST');
      await loadAllData(); showToast('Registered for event', 'success'); return rerenderRoleContent();
    case 'topup-wallet': return topUpWallet();
    case 'change-intent': return openChangeIntentModal();
    case 'review-expert': return openReviewModal(id, Number(el.dataset.expert));
    case 'print-certificate': return printCertificateModal(id);
    case 'new-consultation': return openNewConsultationModal();
    case 'file-claim': return openClaimModal(id);
    case 'new-ticket': return openNewTicketModal();
    case 'gdpr-export': {
      showLoading(true);
      const res = await fetch('/api/user/gdpr-export', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `my-data-${Date.now()}.json`;
      a.click();
      showLoading(false); return;
    }
    case 'gdpr-delete': {
      if (!await confirmDialog('Delete your account? You have 30 days to reverse this.')) return;
      await apiCall('/api/user/gdpr-delete', 'POST');
      showToast('Account scheduled for deletion', 'warning'); return;
    }

    /* ---------- INSTITUTION ---------- */
    case 'export-institution-report': {
      const rows = (S.trainees || []).map(t => ({
        name: t.name, email: t.email, department: t.department || '',
        programme: t.programme_title || '', cohort: t.cohort_name || '',
        status: t.lifecycle_status || '', progress: t.progress || 0,
      }));
      return downloadCsv('institution-report.csv', rows);
    }
    case 'create-programme': return openProgrammeModal();
    case 'edit-programme': return openProgrammeModal(Number(id));
    case 'view-programme': return openProgrammeViewModal(Number(id));
    case 'programme-curriculum': return openCurriculumModal(Number(id));
    case 'delete-programme': {
      if (!await confirmDialog('Delete this programme? All enrolments will be removed.')) return;
      await apiCall(`/api/institution/programmes/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); showToast('Programme deleted', 'success'); return;
    }
    case 'create-learning-path': return openLearningPathModal();
    case 'edit-learning-path': return openLearningPathModal(Number(id));
    case 'delete-learning-path': {
      if (!await confirmDialog('Delete this learning path?')) return;
      await apiCall(`/api/institution/learning-paths/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'open-path-builder': return openPathBuilderModal(Number(id));
    case 'create-cohort': return openCohortModal();
    case 'edit-cohort': return openCohortModal(Number(id));
    case 'view-cohort': return openCohortViewModal(Number(id));
    case 'cohort-waitlist': return openCohortWaitlistModal(Number(id));
    case 'delete-cohort': {
      if (!await confirmDialog('Delete this cohort?')) return;
      await apiCall(`/api/institution/cohorts/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'schedule-session': return openSessionModal();
    case 'edit-session': return openSessionModal(Number(id));
    case 'mark-attendance': return openAttendanceModal(Number(id));
    case 'view-calendar': return openSessionsCalendarModal();
    case 'delete-session': {
      if (!await confirmDialog('Delete this session?')) return;
      await apiCall(`/api/institution/sessions/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'upload-material': return uploadMaterial();
    case 'delete-material': {
      await apiCall(`/api/institution/materials/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'schedule-assessment': return openAssessmentModal();
    case 'grade-assessment': return openGradingModal(Number(id));
    case 'view-assessment': return showToast('Assessment detail opened', 'info');
    case 'delete-assessment': {
      if (!await confirmDialog('Delete this assessment?')) return;
      await apiCall(`/api/institution/assessments/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'schedule-proctor-session': return openProctorSessionModal();
    case 'view-proctor-session': return showToast('Proctor session opened', 'info');
    case 'invalidate-exam':
      await apiCall(`/api/institution/exam-proctor-sessions/${id}/invalidate`, 'PUT');
      await loadAllData(); rerenderRoleContent(); return;
    case 'review-flag': return showToast('Flag review opened', 'info');
    case 'create-question': return openQuestionModal();
    case 'edit-question': return openQuestionModal(Number(id));
    case 'delete-question': {
      if (!await confirmDialog('Delete this question?')) return;
      await apiCall(`/api/institution/question-bank/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'create-project': return openProjectModal();
    case 'edit-project': return openProjectModal(Number(id));
    case 'view-project': return showToast('Project detail opened', 'info');
    case 'grade-project': return showToast('Project grading opened', 'info');
    case 'import-trainees-history': return openImportHistoryModal();
    case 'invite-trainee': return openTraineeImportModal();
    case 'trainee-detail': return openTraineeDetailModal(Number(id));
    case 'trainee-notes': return openTraineeNotesModal(Number(id));
    case 'trainee-transfer': return openTraineeTransferModal(Number(id));
    case 'approve-enrolment':
      await apiCall(`/api/institution/enrollments/${id}/approve`, 'PUT');
      await loadAllData(); rerenderRoleContent(); showToast('Enrolment approved', 'success'); return;
    case 'reject-enrolment': {
      const reason = prompt('Reason for rejection?') || '';
      await apiCall(`/api/institution/enrollments/${id}/reject`, 'PUT', { reason });
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'export-trainees': {
      const rows = (S.institutionEnrollments.length ? S.institutionEnrollments : S.trainees).map(t => ({
        name: t.trainee_name || t.name || '', email: t.email || '',
        department: t.department || '', programme: t.programme_title || '',
        cohort: t.cohort_name || '', status: t.status || t.lifecycle_status || '',
        progress: t.progress || 0,
      }));
      return downloadCsv('trainees.csv', rows);
    }
    case 'export-wellness':
      return downloadCsv('wellness.csv', S.wellnessScores);
    case 'recompute-wellness':
      await apiCall('/api/institution/wellness/recompute', 'POST');
      await loadAllData(); rerenderRoleContent(); return;
    case 'wellness-intervene':
      await apiCall(`/api/institution/wellness-alerts/${id}/intervene`, 'POST');
      await loadAllData(); rerenderRoleContent(); return;
    case 'wellness-dismiss':
      await apiCall(`/api/institution/wellness-alerts/${id}/dismiss`, 'POST');
      await loadAllData(); rerenderRoleContent(); return;
    case 'issue-certificate': return openIssueCertificateModal();
    case 'export-certificates':
      return downloadCsv('certificates.csv', S.institutionCertificates);
    case 'revoke-certificate': {
      const reason = prompt('Reason for revocation?') || '';
      await apiCall(`/api/institution/certificates/${id}/revoke`, 'PUT', { reason });
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'renew-certificate': {
      const months = Number(prompt('Validity in months?', '12') || 12);
      await apiCall(`/api/institution/certificates/${id}/renew`, 'PUT', { valid_months: months });
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'manage-skills': return openManageSkillsModal();
    case 'export-skills-matrix': {
      const m = S.institutionSkillsMatrix || { skills: [], matrix: [] };
      const rows = m.matrix.map(row => {
        const out = { trainee: row.trainee.name, department: row.trainee.department || '' };
        m.skills.forEach(s => { out[s.name] = row.levels[s.id] || 0; });
        return out;
      });
      return downloadCsv('skills-matrix.csv', rows);
    }
    case 'export-skills-gap': return downloadCsv('skills-gap.csv', S.skillsGapAnalysis?.topGaps || []);
    case 'recompute-skills-gap':
      await apiCall('/api/institution/skills-gap/recompute', 'POST');
      await loadAllData(); rerenderRoleContent(); return;
    case 'create-compliance-rule': return openComplianceRuleModal();
    case 'run-compliance-check':
      await apiCall('/api/institution/compliance/run', 'POST');
      await loadAllData(); rerenderRoleContent(); return;
    case 'export-compliance-report': {
      const rows = (S.institutionCertificates || []).map(c => ({
        trainee: c.trainee_name, serial: c.serial, issued: c.issued_at,
        expires: c.expires_at || 'Never', revoked: c.revoked ? 'Yes' : 'No',
      }));
      return downloadCsv('compliance-report.csv', rows);
    }
    case 'export-succession': return downloadCsv('succession.csv', S.successionMatrix?.assignments || []);
    case 'assign-succession': return openAssignSuccessionModal();
    case 'assign-instructor': return openAssignInstructorModal();
    case 'view-instructor': return showToast('Instructor profile opened', 'info');
    case 'hire-instructor': return openHireInstructorModal(Number(id), el.dataset.name);
    case 'post-instructor-request': return openPostInstructorRequestModal();
    case 'create-budget': return openCreateBudgetModal();
    case 'edit-budget': return openEditBudgetModal(Number(id));
    case 'view-budget-transactions': return openBudgetTransactionsModal(Number(id));
    case 'export-budgets': return downloadCsv('budgets.csv', S.budgetAllocations);
    case 'create-campus': return openCampusModal();
    case 'edit-campus': return openCampusModal(Number(id));
    case 'delete-campus': {
      if (!await confirmDialog('Delete this campus?')) return;
      await apiCall(`/api/institution/campuses/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'view-campus-trainees':
      S.activeCampusId = Number(id);
      activeTab = 'trainees'; rerenderRoleContent(); return;
    case 'clear-campus-filter':
      S.activeCampusId = null; return rerenderRoleContent();
    case 'report-programme-scorecard': return openReportPreviewModal('programme-scorecard');
    case 'report-cohort-comparison': return openReportPreviewModal('cohort-comparison');
    case 'report-trainee-progress': return openReportPreviewModal('trainee-progress');
    case 'report-compliance': return openReportPreviewModal('compliance');
    case 'report-cost': return openReportPreviewModal('cost');
    case 'schedule-report': return openScheduleReportModal();
    case 'new-report-definition': return openNewReportDefinitionModal();
    case 'run-saved-report': return runSavedReport(Number(id));
    case 'edit-report-definition': return openNewReportDefinitionModal(Number(id));
    case 'delete-report-definition': {
      await apiCall(`/api/institution/report-definitions/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'create-announcement': return openAnnouncementModal();
    case 'edit-announcement': return openAnnouncementModal(Number(id));
    case 'delete-announcement': {
      if (!await confirmDialog('Delete this announcement?')) return;
      await apiCall(`/api/institution/announcements/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'create-api-key': return openCreateApiKeyModal();
    case 'copy-api-key':
      showToast('API key copied to clipboard', 'success'); return;
    case 'revoke-api-key': {
      if (!await confirmDialog('Revoke this API key? Integrations will break.')) return;
      await apiCall(`/api/institution/api-keys/${id}/revoke`, 'PUT');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'create-webhook': return openWebhookModal();
    case 'edit-webhook': return openWebhookModal(Number(id));
    case 'test-webhook':
      await apiCall(`/api/institution/webhooks/${id}/test`, 'POST');
      showToast('Test delivered', 'success'); return;
    case 'delete-webhook': {
      if (!await confirmDialog('Delete this webhook?')) return;
      await apiCall(`/api/institution/webhooks/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'save-sso': return saveSsoConfig();
    case 'test-sso': return showToast('SSO test completed', 'success');
    case 'save-security-policy': return saveSecurityPolicy();
    case 'save-institution-settings': return saveInstitutionSettings();
    case 'invite-team-member': return openInviteTeamMemberModal();
    case 'change-team-role': return openChangeTeamRoleModal(Number(id));
    case 'manage-team-permissions': return openTeamPermissionsModal(Number(id));
    case 'remove-team-member': {
      if (!await confirmDialog('Remove this team member?')) return;
      await apiCall(`/api/institution/team/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'approve-request':
      await apiCall(`/api/institution/approvals/${id}`, 'PUT', { status: 'approved' });
      await loadAllData(); rerenderRoleContent(); showToast('Request approved', 'success'); return;
    case 'reject-request': {
      const notes = prompt('Rejection notes?') || '';
      await apiCall(`/api/institution/approvals/${id}`, 'PUT', { status: 'rejected', decision_notes: notes });
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'save-branding': return saveBranding();
    case 'update-institution-profile': return updateInstitutionProfile();
    case 'create-org-unit': return openOrgUnitModal();
    case 'edit-org-unit': return openOrgUnitModal(Number(id));
    case 'delete-org-unit': {
      await apiCall(`/api/institution/org-units/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }

    /* ---------- PROFILE GENERIC ---------- */
    case 'update-user-profile': return updateUserProfile();
    case 'change-password': return changePassword();
    case 'send-chat': {
      const i = $('#chat-input');
      if (i) await sendMessage(currentChatId, i.value);
      return;
    }
  }
}

async function reloadPayoutsAndRerender(msg) {
  const d = await apiCall('/api/admin/payouts');
  S.payouts = d.payouts || [];
  showToast(msg, 'success');
  rerenderRoleContent();
}

function rerenderRoleContent() {
  const el = $('#role-content');
  if (!el) return;
  el.innerHTML = currentUserRole === 'admin'
    ? renderAdminContent()
    : currentUserRole === 'expert'
    ? renderExpertContent()
    : currentUserRole === 'institution'
    ? renderInstitutionContent()
    : renderUserContent();
  attachSidebarEvents();
  renderCharts();
  if (currentUserRole === 'institution') {
    renderInstitutionCharts();
    attachInstitutionInteractions();
  }
}

/* ============================================================
   MODAL BUILDERS
   ============================================================ */

/* ---------- Helpers used by multiple modals ---------- */
async function loadCourseCurriculum(courseId) {
  try {
    const d = await apiCall(`/api/eschool/courses/${courseId}/curriculum`);
    S.courseCurriculum[courseId] = d;
  } catch (_) { S.courseCurriculum[courseId] = { modules: [] }; }
}

/* ---------- Admin modals ---------- */
function openEditUserModal(userId) {
  const u = S.users.find(x => String(x.id) === String(userId));
  if (!u) return;
  openModal({
    title: `Edit ${u.name}`,
    body: `
      <label class="form-group"><span class="form-label">Name</span>
        <input id="euName" class="form-input" value="${esc(u.name || '')}" /></label>
      <label class="form-group"><span class="form-label">Role</span>
        <select id="euRole" class="form-select">
          <option value="learner" ${u.role === 'learner' ? 'selected' : ''}>Learner</option>
          <option value="expert" ${u.role === 'expert' ? 'selected' : ''}>Expert</option>
          <option value="institution" ${u.role === 'institution' ? 'selected' : ''}>Institution</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select></label>
      <label class="form-group"><span class="form-label">Status</span>
        <select id="euStatus" class="form-select">
          <option value="active" ${u.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="pending" ${u.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="suspended" ${u.status === 'suspended' ? 'selected' : ''}>Suspended</option>
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="euSave" class="btn btn-primary">Save</button>`,
  });
  $('#euSave').onclick = async () => {
    await apiCall(`/api/admin/users/${userId}`, 'PUT', {
      name: $('#euName').value,
      role: $('#euRole').value,
      status: $('#euStatus').value,
    });
    closeModal(); await reloadUsers(); showToast('User updated', 'success'); rerenderRoleContent();
  };
}

async function submitCreateExpert() {
  const name = $('#newExpertName').value;
  const email = $('#newExpertEmail').value;
  const spec = $('#newExpertSpec').value;
  const rate = Number($('#newExpertRate').value || 0);
  const bio = $('#newExpertBio').value;
  const phone = $('#newExpertPhone').value;
  if (!name || !email) return showToast('Name and email required', 'error');
  showLoading(true);
  const d = await apiCall('/api/admin/experts/create', 'POST', { name, email, specialization: spec, hourly_rate: rate, bio, phone });
  await loadAllData(); rerenderRoleContent(); showLoading(false);
  showToast(`Expert created. Temp password: ${d.temp_password}`, 'success', 8000);
}

function openAssignExpertModal(consultationId) {
  const opts = S.experts.map(e =>
    `<option value="${e.id}">${esc(e.name)} (${esc(e.specialization || '')})</option>`
  ).join('');
  openModal({
    title: 'Assign Expert',
    body: `<label class="form-group"><span class="form-label">Expert</span>
      <select id="assignExp" class="form-select">${opts}</select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="assignSave" class="btn btn-primary">Assign</button>`,
  });
  $('#assignSave').onclick = async () => {
    await apiCall(`/api/common/consultations/${consultationId}/assign`, 'PUT', {
      expert_id: Number($('#assignExp').value),
    });
    closeModal(); await reloadConsultations(); rerenderRoleContent(); showToast('Expert assigned', 'success');
  };
}

function openAssignOpsModal(instId) {
  openModal({
    title: 'Assign Operations Manager',
    body: `
      <label class="form-group"><span class="form-label">Manager name</span>
        <input id="omName" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Manager email</span>
        <input id="omEmail" type="email" class="form-input" /></label>
      <p class="form-hint">A temporary password will be generated and shown once.</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="omSave" class="btn btn-primary">Assign</button>`,
  });
  $('#omSave').onclick = async () => {
    const d = await apiCall(`/api/admin/institutions/${instId}/ops-manager`, 'POST', {
      name: $('#omName').value, email: $('#omEmail').value,
    });
    closeModal(); await reloadInstitutions(); rerenderRoleContent();
    showToast(`Ops manager created. Temp password: ${d.temp_password}`, 'success', 8000);
  };
}

function openCreateCouponModal() {
  openModal({
    title: 'New Coupon',
    body: `
      <label class="form-group"><span class="form-label">Code</span>
        <input id="cpCode" class="form-input" placeholder="WELCOME10" /></label>
      <label class="form-group"><span class="form-label">Type</span>
        <select id="cpType" class="form-select">
          <option value="percent">Percent</option><option value="fixed">Fixed</option>
        </select></label>
      <label class="form-group"><span class="form-label">Value</span>
        <input id="cpValue" type="number" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Max uses (optional)</span>
        <input id="cpMax" type="number" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Min spend</span>
        <input id="cpMin" type="number" class="form-input" value="0" /></label>
      <label class="form-group"><span class="form-label">Applies to</span>
        <select id="cpApply" class="form-select">
          <option value="all">All</option>
          <option value="bootcamp">Bootcamps</option>
          <option value="short_course">Short courses</option>
          <option value="event">Events</option>
          <option value="consultation">Consultations</option>
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="cpSave" class="btn btn-primary">Create</button>`,
  });
  $('#cpSave').onclick = async () => {
    await apiCall('/api/admin/coupons', 'POST', {
      code: $('#cpCode').value,
      discount_type: $('#cpType').value,
      discount_value: Number($('#cpValue').value || 0),
      max_uses: $('#cpMax').value ? Number($('#cpMax').value) : null,
      min_spend: Number($('#cpMin').value || 0),
      applies_to: $('#cpApply').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Coupon created', 'success');
  };
}

async function sendBroadcast() {
  const title = $('#broadcastTitle').value;
  const message = $('#broadcastMessage').value;
  const audience = $('#broadcastAudience').value;
  if (!title || !message) return showToast('Fill title and message', 'error');
  showLoading(true);
  const d = await apiCall('/api/admin/notifications/broadcast', 'POST', { title, message, audience });
  showLoading(false);
  showToast(`Broadcast sent to ${d.sent} users`, 'success');
}

async function saveAdminSettings() {
  const settings = {
    platform_name: $('#setPlatformName').value,
    support_email: $('#setSupportEmail').value,
    default_currency: $('#setCurrency').value,
    default_timezone: $('#setTimezone').value,
    commission_consultation: $('#setCommCons').value,
    commission_course: $('#setCommCourse').value,
    withdrawal_hold_days: $('#setHold').value,
    min_payout: $('#setMinPayout').value,
  };
  await apiCall('/api/admin/settings', 'PUT', { settings });
  showToast('Settings saved', 'success');
}

/* ---------- Consultation modals ---------- */
async function saveAvailability() {
  const schedule = [];
  for (let i = 0; i < 7; i++) {
    const s = document.getElementById(`start-${i}`)?.value;
    const en = document.getElementById(`end-${i}`)?.value;
    if (s && en) schedule.push({ day: i, start: s, end: en });
  }
  await apiCall('/api/expert/availability', 'PUT', { schedule });
  showToast('Availability saved', 'success');
}

async function requestTimeOff() {
  const s = $('#timeOffStart').value;
  const en = $('#timeOffEnd').value;
  const r = $('#timeOffReason').value;
  if (!s || !en) return showToast('Select dates', 'error');
  await apiCall('/api/expert/time-off', 'POST', { start_date: s, end_date: en, reason: r });
  await loadAllData(); rerenderRoleContent(); showToast('Time off requested', 'success');
}

async function requestWithdrawal() {
  const amount = Number($('#withdrawAmount').value || 0);
  const method = $('#withdrawMethod').value;
  if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error');
  showLoading(true);
  await apiCall('/api/expert/withdrawals', 'POST', { amount, method });
  await loadAllData(); showLoading(false); rerenderRoleContent();
  showToast('Withdrawal requested', 'success');
}

async function updateExpertProfile() {
  await apiCall('/api/expert/profile', 'PUT', {
    specialization: $('#profileSpecialization').value,
    hourly_rate: Number($('#profileRate').value || 0),
    bio: $('#profileBio').value,
  });
  await apiCall('/api/auth/me');
  showToast('Profile updated', 'success');
}

function openPortfolioItemModal(itemId) {
  const item = itemId ? (S.expertPortfolio.find(x => x.id === itemId) || {}) : {};
  openModal({
    title: itemId ? 'Edit Portfolio Item' : 'Add Portfolio Item',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="piTitle" class="form-input" value="${esc(item.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Category</span>
        <input id="piCat" class="form-input" value="${esc(item.category || 'Case Study')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="piDesc" class="form-textarea" rows="4">${esc(item.description || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Link (optional)</span>
        <input id="piLink" class="form-input" value="${esc(item.link || '')}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="piSave" class="btn btn-primary">${itemId ? 'Save' : 'Add'}</button>`,
  });
  $('#piSave').onclick = async () => {
    await apiCall('/api/expert/portfolio', 'POST', {
      title: $('#piTitle').value, category: $('#piCat').value,
      description: $('#piDesc').value, link: $('#piLink').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Portfolio saved', 'success');
  };
}

function openManageSlotsModal() {
  openModal({
    title: 'Generate Slots',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Date</span>
        <input id="msDate" type="date" class="form-input" value="${new Date().toISOString().slice(0,10)}" /></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Start hour</span>
          <input id="msStartHour" type="number" class="form-input" value="9" min="0" max="23" /></label>
        <label class="form-group"><span class="form-label">End hour</span>
          <input id="msEndHour" type="number" class="form-input" value="17" min="1" max="24" /></label>
        <label class="form-group"><span class="form-label">Slot duration (min)</span>
          <select id="msDuration" class="form-select">
            ${[15,30,45,60,90].map(d => `<option value="${d}" ${d === 30 ? 'selected' : ''}>${d}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Price per slot</span>
          <input id="msPrice" type="number" class="form-input" value="${currentUser?.hourly_rate || 50}" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="msSave" class="btn btn-primary">Generate Slots</button>`,
  });
  $('#msSave').onclick = async () => {
    const date = $('#msDate').value;
    const startHour = Number($('#msStartHour').value);
    const endHour = Number($('#msEndHour').value);
    const duration = Number($('#msDuration').value);
    const price = Number($('#msPrice').value);
    if (startHour >= endHour) return showToast('Invalid hours', 'error');
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += duration) {
        const start = new Date(`${date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
        const end = new Date(start.getTime() + duration * 60000);
        if (end.getHours() > endHour || (end.getHours() === endHour && end.getMinutes() > 0)) continue;
        slots.push({ start: start.toISOString(), end: end.toISOString(), duration, price, type: 'video' });
      }
    }
    if (!slots.length) return showToast('No valid slots', 'error');
    showLoading(true);
    const d = await apiCall('/api/experts/me/slots', 'POST', { slots });
    closeModal(); await loadAllData(); rerenderRoleContent(); showLoading(false);
    showToast(`Created ${d.created || slots.length} slots`, 'success');
  };
}

function openBlockTimeModal() {
  openModal({
    title: 'Block Time',
    body: `
      <label class="form-group"><span class="form-label">Start</span>
        <input id="btStart" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">End</span>
        <input id="btEnd" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Reason</span>
        <input id="btReason" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="btSave" class="btn btn-warning">Block Time</button>`,
  });
  $('#btSave').onclick = async () => {
    await apiCall('/api/experts/me/block-time', 'POST', {
      start: $('#btStart').value, end: $('#btEnd').value,
      reason: $('#btReason').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Time blocked', 'success');
  };
}

function openEditTiersModal() {
  const tiers = S.consultationTiers.length ? S.consultationTiers : [
    { name: 'Quick', duration_minutes: 15, price: 30, description: '' },
    { name: 'Standard', duration_minutes: 30, price: 60, description: '' },
    { name: 'Deep Dive', duration_minutes: 60, price: 110, description: '' },
  ];
  openModal({
    title: 'Edit Pricing Tiers',
    className: 'modal-lg',
    body: `
      <p class="form-hint">Define your session tiers. Clients choose a tier when booking.</p>
      ${[0, 1, 2].map(i => `
        <div class="form-grid" style="margin-bottom:12px;padding:12px;background:var(--surface-2);border-radius:8px">
          <label class="form-group"><span class="form-label">Tier ${i+1} name</span>
            <input id="tier${i}Name" class="form-input" value="${esc(tiers[i]?.name || '')}" /></label>
          <label class="form-group"><span class="form-label">Duration (min)</span>
            <input id="tier${i}Duration" type="number" class="form-input" value="${tiers[i]?.duration_minutes || ''}" /></label>
          <label class="form-group"><span class="form-label">Price ($)</span>
            <input id="tier${i}Price" type="number" class="form-input" value="${tiers[i]?.price || ''}" /></label>
          <label class="form-group form-group-full"><span class="form-label">Description</span>
            <input id="tier${i}Desc" class="form-input" value="${esc(tiers[i]?.description || '')}" /></label>
        </div>
      `).join('')}`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tiersSave" class="btn btn-primary">Save Tiers</button>`,
  });
  $('#tiersSave').onclick = async () => {
    const list = [0,1,2].map(i => ({
      name: $(`#tier${i}Name`).value,
      duration_minutes: Number($(`#tier${i}Duration`).value || 0),
      price: Number($(`#tier${i}Price`).value || 0),
      description: $(`#tier${i}Desc`).value,
    })).filter(t => t.name && t.duration_minutes);
    await apiCall('/api/experts/me/tiers', 'PUT', { tiers: list });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Tiers saved', 'success');
  };
}

function openCreateCourseModal() {
  openModal({
    title: 'New Course',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="ccTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="ccDesc" class="form-textarea" rows="3"></textarea></label>
      <label class="form-group"><span class="form-label">Type</span>
        <select id="ccType" class="form-select">
          ${CONFIG.COURSE_TYPES.map(t => `<option value="${t}">${t.replace('_',' ')}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Level</span>
        <select id="ccLevel" class="form-select">
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select></label>
      <label class="form-group"><span class="form-label">Price ($)</span>
        <input id="ccPrice" type="number" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ccSave" class="btn btn-primary">Create</button>`,
  });
  $('#ccSave').onclick = async () => {
    await apiCall('/api/expert/courses', 'POST', {
      title: $('#ccTitle').value, description: $('#ccDesc').value,
      course_type: $('#ccType').value, level: $('#ccLevel').value,
      price: Number($('#ccPrice').value || 0),
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Course created', 'success');
  };
}

function openEditCourseModal(courseId) {
  const c = S.courses.find(x => String(x.id) === String(courseId));
  if (!c) return;
  openModal({
    title: `Edit ${c.title}`,
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="ecTitle" class="form-input" value="${esc(c.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="ecDesc" class="form-textarea" rows="3">${esc(c.description || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Price ($)</span>
        <input id="ecPrice" type="number" class="form-input" value="${c.price || 0}" /></label>
      <label class="form-group"><span class="form-label">Status</span>
        <select id="ecStatus" class="form-select">
          ${['draft','published','archived'].map(s => `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ecSave" class="btn btn-primary">Save</button>`,
  });
  $('#ecSave').onclick = async () => {
    await apiCall(`/api/expert/courses/${courseId}`, 'PUT', {
      title: $('#ecTitle').value,
      description: $('#ecDesc').value,
      price: Number($('#ecPrice').value || 0),
      status: $('#ecStatus').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Course updated', 'success');
  };
}

function openAddModuleModal(courseId) {
  openModal({
    title: 'New Module',
    body: `
      <label class="form-group"><span class="form-label">Module title</span>
        <input id="amTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Duration in hours</span>
        <input id="amDuration" type="number" class="form-input" value="2" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="amDesc" class="form-textarea" rows="2"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="amSave" class="btn btn-primary">Add Module</button>`,
  });
  $('#amSave').onclick = async () => {
    await apiCall(`/api/institution/programmes/${courseId}/modules`, 'POST', {
      title: $('#amTitle').value,
      duration_hours: Number($('#amDuration').value || 0),
      description: $('#amDesc').value,
    });
    closeModal(); await loadCourseCurriculum(courseId); rerenderRoleContent(); showToast('Module added', 'success');
  };
}

function openEditModuleModal(moduleId) {
  openModal({
    title: 'Edit Module',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="emTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Duration (hours)</span>
        <input id="emDuration" type="number" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="emSave" class="btn btn-primary">Save</button>`,
  });
  $('#emSave').onclick = async () => {
    await apiCall(`/api/institution/programmes/modules/${moduleId}`, 'PUT', {
      title: $('#emTitle').value,
      duration_hours: Number($('#emDuration').value || 0),
    });
    closeModal(); rerenderRoleContent(); showToast('Module updated', 'success');
  };
}

function openAddLessonModal(moduleId) {
  const courseId = S.__activeCourseId;
  openModal({
    title: 'New Lesson',
    body: `
      <label class="form-group"><span class="form-label">Lesson title</span>
        <input id="alTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Type</span>
        <select id="alType" class="form-select">
          ${CONFIG.LESSON_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Duration (min)</span>
        <input id="alDuration" type="number" class="form-input" value="15" /></label>
      <label class="form-group"><span class="form-label">Content</span>
        <textarea id="alContent" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="alSave" class="btn btn-primary">Add Lesson</button>`,
  });
  $('#alSave').onclick = async () => {
    await apiCall(`/api/expert/courses/${courseId}/lessons`, 'POST', {
      module_id: moduleId,
      title: $('#alTitle').value,
      lesson_type: $('#alType').value,
      duration_minutes: Number($('#alDuration').value || 0),
      content: $('#alContent').value,
    });
    closeModal(); await loadCourseCurriculum(courseId); rerenderRoleContent(); showToast('Lesson added', 'success');
  };
}

function openEditLessonModal(lessonId) {
  openModal({
    title: 'Edit Lesson',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="elTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Content</span>
        <textarea id="elContent" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="elSave" class="btn btn-primary">Save</button>`,
  });
  $('#elSave').onclick = async () => {
    await apiCall(`/api/expert/lessons/${lessonId}`, 'PUT', {
      title: $('#elTitle').value,
      content: $('#elContent').value,
    });
    closeModal(); rerenderRoleContent(); showToast('Lesson updated', 'success');
  };
}

async function saveCourseSettings(courseId) {
  await apiCall(`/api/expert/courses/${courseId}`, 'PUT', {
    status: $('#builder-course-status').value,
    price: Number($('#builder-course-price').value || 0),
    level: $('#builder-course-level').value,
  });
  await loadAllData(); rerenderRoleContent(); showToast('Course settings saved', 'success');
}

function openFindExpertWizard() {
  openModal({
    title: 'Find Me an Expert',
    body: `
      <div id="wizardStep1">
        <p class="form-hint">Tell us what you need help with. We'll match you with the best experts.</p>
        <label class="form-group"><span class="form-label">What do you need help with?</span>
          <textarea id="wizardProblem" class="form-textarea" rows="3"
                    placeholder="e.g. I need help designing a scalable backend"></textarea></label>
        <div class="form-grid">
          <label class="form-group"><span class="form-label">Budget per hour (max)</span>
            <input id="wizardBudget" type="number" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Session type</span>
            <select id="wizardType" class="form-select">
              <option value="video">Video call</option>
              <option value="audio">Audio call</option>
              <option value="chat">Chat only</option>
            </select></label>
        </div>
      </div>
      <div id="wizardResults" class="hidden"></div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="wizardMatchBtn" class="btn btn-primary">
               <i class="fas fa-magic"></i> Match Me</button>`,
  });
  $('#wizardMatchBtn').onclick = async () => {
    const problemText = $('#wizardProblem').value.trim();
    const budget = $('#wizardBudget').value ? Number($('#wizardBudget').value) : null;
    const type = $('#wizardType').value;
    if (!problemText) return showToast('Describe your problem', 'error');
    showLoading(true);
    const d = await apiCall('/api/consultations/match', 'POST', { problemText, budget, type });
    $('#wizardStep1').classList.add('hidden');
    $('#wizardResults').classList.remove('hidden');
    $('#wizardResults').innerHTML = `
      <h4 style="margin-bottom:12px">Top Matches</h4>
      ${d.matches.length ? d.matches.map(m => `
        <div class="match-card">
          <img class="user-avatar" src="${avatar(m)}" alt="" />
          <div class="match-body">
            <h5>${esc(m.name)}</h5>
            <p>${esc(m.specialization || '')}</p>
            <p class="match-stats">
              <span><i class="fas fa-star"></i> ${Number(m.average_rating || 0).toFixed(1)}</span>
              <span><i class="fas fa-dollar-sign"></i> ${fmtCur(m.hourly_rate)}/hr</span>
            </p>
          </div>
          <div class="match-actions">
            <button class="btn btn-secondary btn-sm" data-action="view-expert-profile" data-id="${m.id}">Profile</button>
            <button class="btn btn-primary btn-sm" data-action="book-slot-with" data-id="${m.id}" data-name="${esc(m.name)}">
              Book</button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">No matches found.</p>'}`;
    $('#wizardMatchBtn').classList.add('hidden');
    showLoading(false);
  };
}

function openInstantConsultationModal() {
  openModal({
    title: 'Talk to Someone Now',
    body: `
      <p class="form-hint">We'll match you with the next available expert within 15 minutes.</p>
      <label class="form-group"><span class="form-label">What do you need to talk about?</span>
        <input id="icTopic" class="form-input" placeholder="e.g. Urgent code review" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="icGo" class="btn btn-primary">
               <i class="fas fa-bolt"></i> Connect Now</button>`,
  });
  $('#icGo').onclick = async () => {
    const topic = $('#icTopic').value.trim();
    if (!topic) return showToast('Describe what you need', 'error');
    showLoading(true);
    const d = await apiCall('/api/consultations/instant', 'POST', { topic });
    closeModal(); await loadAllData(); rerenderRoleContent(); showLoading(false);
    showToast(`Connected with ${d.expert.name}`, 'success', 6000);
  };
}

async function openBookSlotWithExpert(expertId, expertName) {
  try {
    showLoading(true);
    const [slotsData, tiersData, packagesData] = await Promise.all([
      apiCall(`/api/experts/${expertId}/slots`).catch(() => ({ slots: [] })),
      apiCall(`/api/experts/${expertId}/tiers`).catch(() => ({ tiers: [] })),
      apiCall(`/api/experts/${expertId}/packages`).catch(() => ({ packages: [] })),
    ]);
    const slots = slotsData.slots.filter(s => s.status === 'available');
    const tiers = tiersData.tiers || [];
    const packages = packagesData.packages || [];

    openModal({
      title: `Book ${expertName}`,
      className: 'modal-lg',
      body: `
        <label class="form-group"><span class="form-label">Title</span>
          <input id="bsTitle" class="form-input" placeholder="Brief subject" /></label>
        <label class="form-group"><span class="form-label">Description</span>
          <textarea id="bsDesc" class="form-textarea" rows="3"></textarea></label>

        ${tiers.length ? `
          <div class="form-group">
            <span class="form-label">Session type</span>
            <div class="tier-list">
              ${tiers.map((t, i) => `
                <label class="tier-option">
                  <input type="radio" name="bsTier" value="${i}" data-duration="${t.duration_minutes}" data-price="${t.price}" />
                  <div>
                    <strong>${esc(t.name)}</strong>
                    <span>${t.duration_minutes} min · ${fmtCur(t.price)}</span>
                  </div>
                </label>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="form-group">
          <span class="form-label">Pick a slot</span>
          ${slots.length ? `
            <div class="slot-picker">
              ${slots.slice(0, 20).map(s => `
                <button class="slot-option" data-slot-id="${s.id}" data-price="${s.price}" data-duration="${s.duration_minutes}">
                  <div class="slot-option-date">${fmtDate(s.start_time)}</div>
                  <div class="slot-option-time">${fmtInTz(s.start_time, currentUser?.timezone || 'UTC', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div class="slot-option-meta">${s.duration_minutes}m · ${fmtCur(s.price)}</div>
                </button>
              `).join('')}
            </div>
          ` : '<p class="empty-row">No open slots</p>'}
        </div>

        ${packages.length ? `
          <div class="form-group">
            <span class="form-label">Or buy a package</span>
            ${packages.map(p => `
              <div class="package-option">
                <div><strong>${esc(p.name)}</strong><span>${p.sessions_count} sessions</span></div>
                <div><span class="package-price">${fmtCur(p.price)}</span>
                  <button class="btn btn-secondary btn-sm" data-action="purchase-package" data-id="${p.id}">Buy</button></div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="booking-summary" id="bookingSummary" style="display:none">
          <p>Total: <strong id="bookingTotal">$0</strong></p>
          <p class="form-hint">Payment held in escrow until session completes.</p>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
               <button id="bsSave" class="btn btn-primary" disabled>
                 <i class="fas fa-shield-alt"></i> Pay & Book</button>`,
    });

    let selectedSlot = null, selectedTier = null;
    const update = () => {
      const price = selectedSlot?.price || selectedTier?.price || 0;
      $('#bookingTotal').textContent = fmtCur(price);
      $('#bookingSummary').style.display = price ? '' : 'none';
      $('#bsSave').disabled = !selectedSlot && !selectedTier;
    };
    document.querySelectorAll('.slot-option').forEach(b => b.onclick = () => {
      document.querySelectorAll('.slot-option').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      selectedSlot = { id: Number(b.dataset.slotId), price: Number(b.dataset.price), duration: Number(b.dataset.duration) };
      update();
    });
    document.querySelectorAll('input[name="bsTier"]').forEach(r => r.onchange = () => {
      selectedTier = { duration: Number(r.dataset.duration), price: Number(r.dataset.price) };
      update();
    });

    $('#bsSave').onclick = async () => {
      const title = $('#bsTitle').value.trim() || 'Consultation';
      const description = $('#bsDesc').value.trim();
      if (!selectedSlot && !selectedTier) return showToast('Select a slot or tier', 'error');
      showLoading(true);
      const d = await apiCall('/api/consultations/book', 'POST', {
        expert_id: expertId,
        slot_id: selectedSlot?.id || null,
        title, description,
        consultation_type: 'video',
        duration_minutes: selectedSlot?.duration || selectedTier?.duration || 30,
      });
      closeModal(); await loadAllData(); rerenderRoleContent(); showLoading(false);
      showToast('Booked! Expert has 2 hours to confirm.', 'success', 6000);
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

async function openRescheduleModal(consultationId) {
  const c = S.consultations.find(x => String(x.id) === String(consultationId));
  if (!c) return;
  showLoading(true);
  const d = await apiCall(`/api/experts/${c.expert_id}/slots`);
  const slots = d.slots.filter(s => s.status === 'available');
  showLoading(false);

  openModal({
    title: 'Reschedule Session',
    body: `
      <p class="form-hint">You have ${CONFIG.MAX_RESCHEDULES - (c.reschedule_count || 0)} reschedules left.</p>
      <div class="slot-picker">
        ${slots.map(s => `
          <button class="slot-option" data-slot-id="${s.id}">
            <div class="slot-option-date">${fmtDate(s.start_time)}</div>
            <div class="slot-option-time">${fmtInTz(s.start_time, currentUser?.timezone || 'UTC', { hour: '2-digit', minute: '2-digit' })}</div>
          </button>
        `).join('') || '<p class="empty-row">No available slots</p>'}
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rsSave" class="btn btn-primary" disabled>Confirm</button>`,
  });
  let selected = null;
  document.querySelectorAll('.slot-option').forEach(b => b.onclick = () => {
    document.querySelectorAll('.slot-option').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected'); selected = Number(b.dataset.slotId);
    $('#rsSave').disabled = false;
  });
  $('#rsSave').onclick = async () => {
    if (!selected) return;
    await apiCall(`/api/consultations/${consultationId}/reschedule`, 'PUT', { new_slot_id: selected });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Rescheduled', 'success');
  };
}

function openCancelConsultationModal(consultationId) {
  const c = S.consultations.find(x => String(x.id) === String(consultationId));
  if (!c) return;
  const preview = refundPreview(c.scheduled_at);
  openModal({
    title: 'Cancel Consultation',
    body: `
      <div class="alert ${preview.pct === 100 ? 'alert-success' : preview.pct > 0 ? 'alert-warning' : 'alert-error'}">
        <i class="fas fa-info-circle"></i>
        <div>${preview.label}</div>
      </div>
      <label class="form-group"><span class="form-label">Reason (optional)</span>
        <textarea id="cancelReason" class="form-textarea" rows="3"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Keep Session</button>
             <button id="cancelGo" class="btn btn-danger">Confirm Cancel</button>`,
  });
  $('#cancelGo').onclick = async () => {
    await apiCall(`/api/consultations/${consultationId}/cancel`, 'PUT', { reason: $('#cancelReason').value });
    closeModal(); await loadAllData(); rerenderRoleContent();
    showToast(`Cancelled. Refund: ${preview.pct}%`, 'success');
  };
}

function openConsultationDetailModal(consultationId) {
  const c = S.consultations.find(x => String(x.id) === String(consultationId));
  if (!c) return;
  openModal({
    title: c.title || 'Consultation',
    className: 'modal-lg',
    body: `
      <div class="consultation-detail-header">
        <span class="${consultationStatusClass(c.status)}">${esc((c.status || '').replace(/_/g, ' '))}</span>
        <span class="chip chip-neutral">${esc(c.session_type || 'scheduled')}</span>
        <span class="chip chip-neutral">${c.duration_minutes || 30} min</span>
      </div>
      <div class="form-grid">
        <div><p class="form-label">Expert</p><p>${esc(c.expert_name || '—')}</p></div>
        <div><p class="form-label">Client</p><p>${esc(c.client_name || '—')}</p></div>
        <div><p class="form-label">Scheduled</p><p>${c.scheduled_at ? fmtInTz(c.scheduled_at, currentUser?.timezone || 'UTC') : '—'}</p></div>
        <div><p class="form-label">Price</p><p>${fmtCur(c.price || 0)}</p></div>
      </div>
      ${c.description ? `<p style="margin-top:12px"><strong>Description:</strong> ${esc(c.description)}</p>` : ''}
      ${c.shared_notes ? `<div class="alert alert-info" style="margin-top:12px"><i class="fas fa-sticky-note"></i>
        <div><strong>Session notes:</strong><br>${esc(c.shared_notes).replace(/\n/g, '<br>')}</div></div>` : ''}
      ${c.ai_summary ? `<div class="alert alert-success" style="margin-top:12px"><i class="fas fa-robot"></i>
        <div><strong>AI Summary:</strong><br>${esc(c.ai_summary).replace(/\n/g, '<br>')}</div></div>` : ''}`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button class="btn btn-info" data-action="open-chat" data-id="${c.id}">
               <i class="fas fa-comments"></i> Chat</button>`,
  });
}

function openConsultationReviewModal(consultationId, expertId) {
  openModal({
    title: 'Rate Your Session',
    body: `
      ${['overall', 'expertise', 'communication', 'punctuality'].map(name => `
        <div class="rating-row">
          <label>${name.charAt(0).toUpperCase() + name.slice(1)}</label>
          <div class="star-input" data-name="${name}">
            ${[5,4,3,2,1].map(n => `<span data-value="${n}">★</span>`).join('')}
          </div>
        </div>
      `).join('')}
      <label class="form-group" style="margin-top:12px"><span class="form-label">Comment</span>
        <textarea id="rvComment2" class="form-textarea" rows="3"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rvSave2" class="btn btn-primary">Submit Review</button>`,
  });
  const ratings = { overall: 0, expertise: 0, communication: 0, punctuality: 0 };
  document.querySelectorAll('.star-input').forEach(c => {
    c.querySelectorAll('span').forEach(s => s.onclick = () => {
      const name = c.dataset.name; const v = Number(s.dataset.value);
      ratings[name] = v;
      c.querySelectorAll('span').forEach(x => x.classList.toggle('active', Number(x.dataset.value) <= v));
    });
  });
  $('#rvSave2').onclick = async () => {
    if (!ratings.overall) return showToast('Overall rating required', 'error');
    await apiCall(`/api/consultations/${consultationId}/review`, 'POST', {
      rating: ratings.overall,
      expertise_rating: ratings.expertise || ratings.overall,
      communication_rating: ratings.communication || ratings.overall,
      punctuality_rating: ratings.punctuality || ratings.overall,
      comment: $('#rvComment2').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Review submitted', 'success');
  };
}

function openTipModal(consultationId) {
  openModal({
    title: 'Send a Tip',
    body: `
      <p class="form-hint">Tips go directly to the expert. Fully optional.</p>
      <div class="tip-options">
        ${CONFIG.TIP_PRESETS.map(a => `<button class="tip-btn" data-amount="${a}">$${a}</button>`).join('')}
      </div>
      <label class="form-group"><span class="form-label">Custom amount</span>
        <input id="tipCustom" type="number" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tipGo" class="btn btn-primary" disabled>Send Tip</button>`,
  });
  let amount = 0;
  document.querySelectorAll('.tip-btn').forEach(b => b.onclick = () => {
    document.querySelectorAll('.tip-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); amount = Number(b.dataset.amount);
    $('#tipCustom').value = ''; $('#tipGo').disabled = false;
  });
  $('#tipCustom').oninput = e => {
    amount = Number(e.target.value);
    document.querySelectorAll('.tip-btn').forEach(x => x.classList.remove('active'));
    $('#tipGo').disabled = !amount || amount <= 0;
  };
  $('#tipGo').onclick = async () => {
    await apiCall(`/api/consultations/${consultationId}/tip`, 'POST', { amount });
    closeModal(); showToast(`Tipped ${fmtCur(amount)}`, 'success');
  };
}

function openDisputeModal(consultationId) {
  openModal({
    title: 'File a Dispute',
    body: `
      <div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i>
        Disputes should be filed within 7 days. Both parties will be contacted.</div>
      <label class="form-group"><span class="form-label">Reason</span>
        <select id="dpReason" class="form-select">
          ${CONFIG.DISPUTE_REASONS.map(r => `<option value="${r}">${r.replace(/_/g, ' ')}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="dpDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="dpGo" class="btn btn-warning">Open Dispute</button>`,
  });
  $('#dpGo').onclick = async () => {
    const description = $('#dpDesc').value.trim();
    if (!description) return showToast('Describe what happened', 'error');
    await apiCall(`/api/consultations/${consultationId}/dispute`, 'POST', {
      reason: $('#dpReason').value, description,
    });
    closeModal(); await loadAllData(); rerenderRoleContent();
    showToast('Dispute filed. Funds frozen pending review.', 'warning', 6000);
  };
}

async function openExpertProfileModal(expertId) {
  try {
    showLoading(true);
    const [profile, questions] = await Promise.all([
      apiCall(`/api/user/experts/${expertId}`),
      apiCall(`/api/experts/${expertId}/questions`).catch(() => ({ questions: [] })),
    ]);
    const e = profile.expert;
    const reviews = profile.reviews || [];
    openModal({
      title: e.name,
      className: 'modal-lg',
      body: `
        <div class="expert-profile-header">
          <img class="expert-avatar-lg" src="${avatar(e)}" alt="" />
          <div class="expert-profile-info">
            <h2>${esc(e.name)}
              ${e.verified_badge ? '<span class="badge-verified"><i class="fas fa-check-circle"></i> Verified</span>' : ''}
            </h2>
            <p class="expert-profile-spec">${esc(e.specialization || '')}</p>
            <p class="expert-profile-rate">${fmtCur(e.hourly_rate)} / hour</p>
            <div class="expert-profile-stats">
              <div><strong>${Number(e.average_rating || 0).toFixed(1)}</strong><span>Rating</span></div>
              <div><strong>${reviews.length}</strong><span>Reviews</span></div>
              <div><strong>${e.response_time_minutes ? e.response_time_minutes + 'm' : '—'}</strong><span>Response</span></div>
              <div><strong>${e.completion_rate ? Math.round(e.completion_rate) + '%' : '—'}</strong><span>Completion</span></div>
            </div>
          </div>
        </div>
        ${e.bio ? `<p class="expert-profile-bio">${esc(e.bio)}</p>` : ''}
        <h3 class="panel-title" style="margin-top:20px">Public Q&A</h3>
        ${questions.questions.length ? questions.questions.slice(0, 5).map(q => `
          <div class="qa-item">
            <p class="qa-q"><i class="fas fa-question-circle"></i> ${esc(q.question)}</p>
            ${q.answer ? `<p class="qa-a"><strong>${esc(e.name)}:</strong> ${esc(q.answer)}</p>` : '<p class="qa-pending">Awaiting answer</p>'}
          </div>
        `).join('') : '<p class="empty-row">No questions yet</p>'}`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-info" data-action="toggle-shortlist" data-id="${e.id}">
          <i class="fas fa-bookmark"></i> Shortlist</button>
        <button class="btn btn-primary" data-action="book-slot-with" data-id="${e.id}" data-name="${esc(e.name)}">
          <i class="fas fa-calendar-plus"></i> Book</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

/* ---------- E-School modals ---------- */
function openEnrollModal(courseId) {
  const c = S.courses.find(x => String(x.id) === String(courseId));
  if (!c) return;
  openModal({
    title: `Enroll in ${esc(c.title)}`,
    body: `
      <p>Price: <strong>${fmtCur(c.price || 0)}</strong></p>
      <p>Your balance: <strong>${fmtCur(S.wallet.balance || 0)}</strong></p>
      <label class="form-group"><span class="form-label">Coupon (optional)</span>
        <input id="enCoupon" class="form-input" placeholder="WELCOME10" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="enSave" class="btn btn-primary">Confirm Enroll</button>`,
  });
  $('#enSave').onclick = async () => {
    showLoading(true);
    const d = await apiCall('/api/eschool/enroll', 'POST', {
      course_id: Number(courseId),
      coupon_code: $('#enCoupon').value || undefined,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showLoading(false);
    showToast(`Enrolled. Paid ${fmtCur(d.paid)} (discount ${fmtCur(d.discount)})`, 'success', 6000);
  };
}

async function markLessonComplete(lessonId) {
  try {
    await apiCall(`/api/eschool/lessons/${lessonId}/progress`, 'POST', { status: 'completed' });
    showToast('Lesson completed. XP earned!', 'success');
    if (S.__currentCourseId) openCoursePlayer(S.__currentCourseId, lessonId);
  } catch (e) { showToast(e.message, 'error'); }
}

function openCourseReviewModal(courseId) {
  openModal({
    title: 'Rate This Course',
    body: `
      ${['content', 'instructor', 'value'].map(name => `
        <div class="rating-row">
          <label>${name.charAt(0).toUpperCase() + name.slice(1)}</label>
          <div class="star-input" data-name="${name}">
            ${[5,4,3,2,1].map(n => `<span data-value="${n}">★</span>`).join('')}
          </div>
        </div>
      `).join('')}
      <label class="checkbox-row" style="margin-top:10px">
        <input type="checkbox" id="rvRecommend" checked />
        I would recommend this course
      </label>
      <label class="form-group"><span class="form-label">Comment</span>
        <textarea id="rvCourseComment" class="form-textarea" rows="3"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rvCourseSave" class="btn btn-primary">Submit Review</button>`,
  });
  const ratings = { content: 0, instructor: 0, value: 0 };
  document.querySelectorAll('.star-input').forEach(c => {
    c.querySelectorAll('span').forEach(s => s.onclick = () => {
      const n = c.dataset.name; const v = Number(s.dataset.value);
      ratings[n] = v;
      c.querySelectorAll('span').forEach(x => x.classList.toggle('active', Number(x.dataset.value) <= v));
    });
  });
  $('#rvCourseSave').onclick = async () => {
    if (!ratings.content) return showToast('Content rating required', 'error');
    await apiCall('/api/user/course-reviews', 'POST', {
      course_id: courseId,
      content_rating: ratings.content,
      instructor_rating: ratings.instructor || ratings.content,
      value_rating: ratings.value || ratings.content,
      would_recommend: $('#rvRecommend').checked,
      comment: $('#rvCourseComment').value,
    });
    closeModal(); showToast('Review submitted', 'success');
  };
}

function openRefundModal(enrollmentId) {
  openModal({
    title: 'Request Refund',
    body: `
      <div class="alert alert-info"><i class="fas fa-info-circle"></i>
        Refunds are available within ${CONFIG.COURSE_REFUND_WINDOW_DAYS} days of purchase.
        Less than 30% completion is required.</div>
      <label class="form-group"><span class="form-label">Reason</span>
        <textarea id="refundReason" class="form-textarea" rows="4"
                  placeholder="Tell us why you'd like a refund"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="refundGo" class="btn btn-warning">Submit Request</button>`,
  });
  $('#refundGo').onclick = async () => {
    const reason = $('#refundReason').value.trim();
    if (!reason) return showToast('Please provide a reason', 'error');
    await apiCall(`/api/user/enrollments/${enrollmentId}/refund`, 'POST', { reason });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Refund requested', 'success');
  };
}

/* ---------- User misc modals ---------- */
async function topUpWallet() {
  const amount = Number($('#topupAmount').value || 0);
  const provider = $('#topupProvider').value;
  if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error');
  showLoading(true);
  await apiCall('/api/user/wallet/topup', 'POST', { amount, provider });
  await reloadWallet(); showLoading(false);
  rerenderRoleContent(); showToast('Funds added', 'success');
}

function openChangeIntentModal() {
  openModal({
    title: 'Choose your mode',
    body: `
      <p class="form-hint">This controls what appears on your dashboard.</p>
      <label class="form-group"><span class="form-label">Mode</span>
        <select id="intentSel" class="form-select">
          <option value="both" ${S.userIntent === 'both' ? 'selected' : ''}>Both - Learning and Consulting</option>
          <option value="learn" ${S.userIntent === 'learn' ? 'selected' : ''}>Learning only</option>
          <option value="consult" ${S.userIntent === 'consult' ? 'selected' : ''}>Consulting only</option>
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="intentSave" class="btn btn-primary">Save</button>`,
  });
  $('#intentSave').onclick = async () => {
    S.userIntent = $('#intentSel').value;
    await apiCall('/api/user/preferences', 'PUT', { intent: S.userIntent });
    closeModal(); rerenderRoleContent(); showToast('Mode updated', 'success');
  };
}

function openReviewModal(consultationId, expertId) {
  openModal({
    title: 'Rate Expert',
    body: `
      <label class="form-group"><span class="form-label">Rating</span>
        <select id="rvRating" class="form-select">
          ${[5,4,3,2,1].map(n => `<option value="${n}">${n} of 5</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Comment</span>
        <textarea id="rvComment" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rvSave" class="btn btn-primary">Submit</button>`,
  });
  $('#rvSave').onclick = async () => {
    await apiCall('/api/user/reviews', 'POST', {
      expert_id: expertId,
      consultation_id: Number(consultationId),
      rating: Number($('#rvRating').value),
      comment: $('#rvComment').value,
    });
    closeModal(); showToast('Review submitted', 'success');
  };
}

function printCertificateModal(certId) {
  const c = S.certificates.find(x => String(x.id) === String(certId));
  if (!c) return;
  openModal({
    title: 'Certificate',
    body: `<div style="text-align:center;padding:20px;border:3px double var(--brand);border-radius:12px">
      <h2>Certificate of Completion</h2>
      <p style="font-size:1.1rem;margin:20px 0">This certifies that</p>
      <h3 style="font-size:1.5rem;color:var(--brand)">${esc(currentUser?.name || '')}</h3>
      <p style="margin:20px 0">has successfully completed</p>
      <h4>${esc(c.course_title || '')}</h4>
      <p style="margin-top:20px;font-size:.85rem;color:var(--text-muted)">
        Serial: ${esc(c.serial)} - Issued: ${fmtDate(c.issued_at)}</p>
    </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button class="btn btn-primary" onclick="window.print()">
               <i class="fas fa-print"></i> Print</button>`,
  });
}

/* ---------- Institution modals ---------- */
function openCampusModal(campusId) {
  const c = campusId ? (S.campuses.find(x => x.id === campusId) || {}) : {};
  openModal({
    title: campusId ? 'Edit Campus' : 'New Campus',
    body: `
      <label class="form-group"><span class="form-label">Campus name</span>
        <input id="cpName" class="form-input" value="${esc(c.name || '')}" /></label>
      <label class="form-group"><span class="form-label">Type</span>
        <select id="cpType" class="form-select">
          ${CONFIG.CAMPUS_TYPES.map(t => `<option value="${t}" ${c.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Address</span>
        <input id="cpAddress" class="form-input" value="${esc(c.address || '')}" /></label>
      <label class="form-group"><span class="form-label">Contact phone</span>
        <input id="cpPhone" class="form-input" value="${esc(c.contact_phone || '')}" /></label>
      <label class="form-group"><span class="form-label">Capacity</span>
        <input id="cpCapacity" type="number" class="form-input" value="${c.capacity || 50}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="cpSave" class="btn btn-primary">${campusId ? 'Save' : 'Create'}</button>`,
  });
  $('#cpSave').onclick = async () => {
    const payload = {
      name: $('#cpName').value, type: $('#cpType').value,
      address: $('#cpAddress').value, contact_phone: $('#cpPhone').value,
      capacity: Number($('#cpCapacity').value || 50),
    };
    if (campusId) await apiCall(`/api/institution/campuses/${campusId}`, 'PUT', payload);
    else await apiCall('/api/institution/campuses', 'POST', payload);
    closeModal(); await loadAllData(); rerenderRoleContent();
    showToast(campusId ? 'Campus updated' : 'Campus created', 'success');
  };
}

function openPathBuilderModal(pathId) {
  const lp = S.institutionLearningPaths.find(x => x.id === pathId) || {};
  openModal({
    title: `Path: ${esc(lp.title)}`,
    className: 'modal-lg',
    body: `
      <div class="path-builder">
        <p class="form-hint">Add programmes in order. Trainees unlock them sequentially.</p>
        <div class="path-add-programme" style="margin-bottom:14px">
          <select id="pathAddSelect" class="form-select">
            <option value="">Select a programme...</option>
            ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" id="pathAddBtn">
            <i class="fas fa-plus"></i> Add Step</button>
        </div>
        <ul class="list-stack" id="pathStepsList">
          ${(lp.steps || []).map((s, i) => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title"><span class="chip chip-blue">${i+1}</span> ${esc(s.programme_title)}</span>
              </div>
              <button class="btn btn-danger btn-xs" data-remove-path-step="${s.id}">Remove</button>
            </li>
          `).join('') || '<li class="empty-row">No steps yet</li>'}
        </ul>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
  $('#pathAddBtn').onclick = async () => {
    const programmeId = $('#pathAddSelect').value;
    if (!programmeId) return;
    await apiCall(`/api/institution/learning-paths/${pathId}/steps`, 'POST', { programme_id: Number(programmeId) });
    closeModal();
    await loadAllData();
    openPathBuilderModal(pathId);
  };
  document.querySelectorAll('[data-remove-path-step]').forEach(b => b.onclick = async () => {
    await apiCall(`/api/institution/learning-paths/steps/${b.dataset.removePathStep}`, 'DELETE');
    closeModal(); await loadAllData(); openPathBuilderModal(pathId);
  });
}

function openProctorSessionModal() {
  openModal({
    title: 'Schedule Proctored Exam',
    body: `
      <label class="form-group"><span class="form-label">Exam title</span>
        <input id="psTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Trainee</span>
        <select id="psTrainee" class="form-select">
          ${S.trainees.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Scheduled at</span>
        <input id="psWhen" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Proctor mode</span>
        <select id="psMode" class="form-select">
          ${CONFIG.PROCTOR_MODES.map(m => `<option value="${m}">${m}</option>`).join('')}
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="psSave" class="btn btn-primary">Schedule</button>`,
  });
  $('#psSave').onclick = async () => {
    await apiCall('/api/institution/exam-proctor-sessions', 'POST', {
      exam_title: $('#psTitle').value,
      trainee_id: Number($('#psTrainee').value),
      scheduled_at: $('#psWhen').value,
      proctor_mode: $('#psMode').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Proctor session scheduled', 'success');
  };
}

function openAssignSuccessionModal() {
  openModal({
    title: 'Assign Trainee to Box',
    body: `
      <label class="form-group"><span class="form-label">Trainee</span>
        <select id="suTrainee" class="form-select">
          ${S.trainees.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Box</span>
        <select id="suBox" class="form-select">
          ${CONFIG.SUCCESSION_BOXES.map(b => `<option value="${b.code}">${b.label}</option>`).join('')}
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="suSave" class="btn btn-primary">Assign</button>`,
  });
  $('#suSave').onclick = async () => {
    await apiCall('/api/institution/succession/assign', 'POST', {
      trainee_id: Number($('#suTrainee').value),
      box_code: $('#suBox').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Trainee assigned', 'success');
  };
}

function openHireInstructorModal(instructorId, instructorName) {
  openModal({
    title: `Hire ${esc(instructorName)}`,
    body: `
      <label class="form-group"><span class="form-label">Programme</span>
        <select id="hiProgramme" class="form-select">
          ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Rate per hour ($)</span>
        <input id="hiRate" type="number" class="form-input" value="100" /></label>
      <label class="form-group"><span class="form-label">Start date</span>
        <input id="hiStart" type="date" class="form-input" /></label>
      <label class="form-group"><span class="form-label">End date</span>
        <input id="hiEnd" type="date" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="hiSave" class="btn btn-primary">Create Contract</button>`,
  });
  $('#hiSave').onclick = async () => {
    await apiCall('/api/institution/instructor-contracts', 'POST', {
      instructor_id: instructorId,
      programme_id: Number($('#hiProgramme').value),
      rate: Number($('#hiRate').value),
      start_date: $('#hiStart').value,
      end_date: $('#hiEnd').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Contract created', 'success');
  };
}

function openPostInstructorRequestModal() {
  openModal({
    title: 'Post Instructor Requirement',
    body: `
      <label class="form-group"><span class="form-label">Subject expertise</span>
        <input id="pirSubject" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Duration</span>
        <input id="pirDuration" class="form-input" placeholder="e.g. 8 weeks" /></label>
      <label class="form-group"><span class="form-label">Budget per hour ($)</span>
        <input id="pirBudget" type="number" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="pirDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="pirSave" class="btn btn-primary">Publish</button>`,
  });
  $('#pirSave').onclick = async () => {
    await apiCall('/api/institution/instructor-requests', 'POST', {
      subject: $('#pirSubject').value,
      duration: $('#pirDuration').value,
      budget: Number($('#pirBudget').value),
      description: $('#pirDesc').value,
    });
    closeModal(); showToast('Requirement posted to marketplace', 'success');
  };
}

function openCreateBudgetModal() {
  openModal({
    title: 'New Budget',
    body: `
      <label class="form-group"><span class="form-label">Department</span>
        <input id="budDept" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Period</span>
        <select id="budPeriod" class="form-select">
          ${CONFIG.BUDGET_PERIODS.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Allocated amount ($)</span>
        <input id="budAmount" type="number" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="budSave" class="btn btn-primary">Create</button>`,
  });
  $('#budSave').onclick = async () => {
    await apiCall('/api/institution/budgets', 'POST', {
      department: $('#budDept').value,
      period: $('#budPeriod').value,
      allocated: Number($('#budAmount').value),
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Budget created', 'success');
  };
}

function openEditBudgetModal(budgetId) {
  const b = S.budgetAllocations.find(x => x.id === budgetId) || {};
  openModal({
    title: 'Edit Budget',
    body: `
      <label class="form-group"><span class="form-label">Department</span>
        <input id="ebDept" class="form-input" value="${esc(b.department || '')}" /></label>
      <label class="form-group"><span class="form-label">Allocated ($)</span>
        <input id="ebAmount" type="number" class="form-input" value="${b.allocated || 0}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ebSave" class="btn btn-primary">Save</button>`,
  });
  $('#ebSave').onclick = async () => {
    await apiCall(`/api/institution/budgets/${budgetId}`, 'PUT', {
      department: $('#ebDept').value,
      allocated: Number($('#ebAmount').value),
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Budget updated', 'success');
  };
}

function openBudgetTransactionsModal(budgetId) {
  const txns = (S.budgetTransactions || []).filter(t => String(t.budget_id) === String(budgetId));
  openModal({
    title: 'Budget Transactions',
    className: 'modal-lg',
    body: txns.length ? `
      <ul class="list-stack">
        ${txns.map(t => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(t.description || '')}</span>
              <span class="list-row-sub">${fmtDT(t.created_at)}</span>
            </div>
            <span class="list-row-price">${fmtCur(t.amount)}</span>
          </li>
        `).join('')}
      </ul>` : '<p class="empty-row">No transactions</p>',
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

function openNewReportDefinitionModal(definitionId) {
  const d = definitionId ? (S.savedReportDefinitions.find(x => x.id === definitionId) || {}) : {};
  openModal({
    title: definitionId ? 'Edit Report' : 'New Report Definition',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Report name</span>
        <input id="rdName" class="form-input" value="${esc(d.name || '')}" /></label>
      <label class="form-group"><span class="form-label">Data source</span>
        <select id="rdSource" class="form-select">
          ${Object.keys(CONFIG.REPORT_FIELD_LIBRARY).map(k => `
            <option value="${k}" ${d.data_source === k ? 'selected' : ''}>${k}</option>
          `).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Columns (comma separated)</span>
        <input id="rdColumns" class="form-input" value="${(d.columns || []).join(', ')}" /></label>
      <label class="form-group"><span class="form-label">Filters (JSON, optional)</span>
        <textarea id="rdFilters" class="form-textarea" rows="3">${esc(JSON.stringify(d.filters || {}))}</textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rdSave" class="btn btn-primary">${definitionId ? 'Save' : 'Create'}</button>`,
  });
  $('#rdSave').onclick = async () => {
    const payload = {
      name: $('#rdName').value,
      data_source: $('#rdSource').value,
      columns: $('#rdColumns').value.split(',').map(x => x.trim()).filter(Boolean),
      filters: (() => { try { return JSON.parse($('#rdFilters').value || '{}'); } catch { return {}; } })(),
    };
    if (definitionId) await apiCall(`/api/institution/report-definitions/${definitionId}`, 'PUT', payload);
    else await apiCall('/api/institution/report-definitions', 'POST', payload);
    closeModal(); await loadAllData(); rerenderRoleContent();
    showToast(definitionId ? 'Report updated' : 'Report created', 'success');
  };
}

async function runSavedReport(definitionId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/report-definitions/${definitionId}/run`);
    showLoading(false);
    downloadCsv(`report-${definitionId}.csv`, d.rows || []);
    showToast(`Report generated: ${d.rows?.length || 0} rows`, 'success');
  } catch (e) { showLoading(false); showToast(e.message, 'error'); }
}

function openAnnouncementModal(announcementId) {
  const a = announcementId ? (S.announcements.find(x => x.id === announcementId) || {}) : {};
  openModal({
    title: announcementId ? 'Edit Announcement' : 'New Announcement',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="anTitle" class="form-input" value="${esc(a.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Body</span>
        <textarea id="anBody" class="form-textarea" rows="5">${esc(a.body || '')}</textarea></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Scope</span>
          <select id="anScope" class="form-select">
            ${CONFIG.ANNOUNCEMENT_SCOPES.map(s => `<option value="${s}" ${a.scope === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Priority</span>
          <select id="anPriority" class="form-select">
            ${CONFIG.ANNOUNCEMENT_PRIORITIES.map(p => `<option value="${p}" ${a.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="anSave" class="btn btn-primary">${announcementId ? 'Save' : 'Publish'}</button>`,
  });
  $('#anSave').onclick = async () => {
    const payload = {
      title: $('#anTitle').value,
      body: $('#anBody').value,
      scope: $('#anScope').value,
      priority: $('#anPriority').value,
    };
    if (announcementId) await apiCall(`/api/institution/announcements/${announcementId}`, 'PUT', payload);
    else await apiCall('/api/institution/announcements', 'POST', payload);
    closeModal(); await loadAllData(); rerenderRoleContent();
    showToast(announcementId ? 'Announcement updated' : 'Announcement published', 'success');
  };
}

function openCreateApiKeyModal() {
  openModal({
    title: 'Create API Key',
    body: `
      <label class="form-group"><span class="form-label">Key name</span>
        <input id="akName" class="form-input" placeholder="e.g. HRIS Integration" /></label>
      <label class="form-group"><span class="form-label">Scopes</span>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:240px;overflow-y:auto">
          ${CONFIG.API_SCOPES.map(s => `
            <label class="checkbox-row">
              <input type="checkbox" class="ak-scope" value="${s}" />
              <code class="code" style="font-size:.72rem">${s}</code>
            </label>
          `).join('')}
        </div>
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="akSave" class="btn btn-primary">Create Key</button>`,
  });
  $('#akSave').onclick = async () => {
    const scopes = Array.from(document.querySelectorAll('.ak-scope:checked')).map(x => x.value);
    if (!scopes.length) return showToast('Select at least one scope', 'error');
    const d = await apiCall('/api/institution/api-keys', 'POST', {
      name: $('#akName').value, scopes,
    });
    closeModal();
    await loadAllData(); rerenderRoleContent();
    openModal({
      title: 'API Key Created',
      body: `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i>
          <div>Copy this key now — you won't see it again.</div>
        </div>
        <label class="form-group"><span class="form-label">API Key</span>
          <input class="form-input" value="${esc(d.key)}" readonly onclick="this.select()" /></label>`,
      footer: `<button class="btn btn-primary" data-close-modal>Done</button>`,
    });
  };
}

function openWebhookModal(webhookId) {
  const w = webhookId ? (S.webhooks.find(x => x.id === webhookId) || {}) : {};
  openModal({
    title: webhookId ? 'Edit Webhook' : 'New Webhook',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Endpoint URL</span>
        <input id="whUrl" class="form-input" value="${esc(w.url || '')}" placeholder="https://your-app.com/hooks/experthub" /></label>
      <label class="form-group"><span class="form-label">Events</span>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:280px;overflow-y:auto">
          ${CONFIG.WEBHOOK_EVENTS.map(e => `
            <label class="checkbox-row">
              <input type="checkbox" class="wh-event" value="${e}" ${(w.events || []).includes(e) ? 'checked' : ''} />
              <code class="code" style="font-size:.72rem">${e}</code>
            </label>
          `).join('')}
        </div>
      </label>
      <label class="form-group"><span class="form-label">Signing secret (optional)</span>
        <input id="whSecret" class="form-input" value="${esc(w.secret || '')}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="whSave" class="btn btn-primary">${webhookId ? 'Save' : 'Create'}</button>`,
  });
  $('#whSave').onclick = async () => {
    const events = Array.from(document.querySelectorAll('.wh-event:checked')).map(x => x.value);
    const payload = {
      url: $('#whUrl').value,
      events,
      secret: $('#whSecret').value,
    };
    if (webhookId) await apiCall(`/api/institution/webhooks/${webhookId}`, 'PUT', payload);
    else await apiCall('/api/institution/webhooks', 'POST', payload);
    closeModal(); await loadAllData(); rerenderRoleContent();
    showToast(webhookId ? 'Webhook updated' : 'Webhook created', 'success');
  };
}

async function saveSsoConfig() {
  await apiCall('/api/institution/sso', 'PUT', {
    provider: $('#sso-provider').value,
    entity_id: $('#sso-entity').value,
    metadata_url: $('#sso-metadata-url').value,
    certificate: $('#sso-cert').value,
  });
  showToast('SSO configuration saved', 'success');
}

async function saveSecurityPolicy() {
  await apiCall('/api/institution/security-policy', 'PUT', {
    force_mfa: $('#sec-force-mfa').checked,
    ip_whitelist_enabled: $('#sec-ip-whitelist').checked,
    session_timeout: $('#sec-session-timeout').checked,
  });
  showToast('Security policies saved', 'success');
}

async function saveInstitutionSettings() {
  await apiCall('/api/institution/settings', 'PUT', {
    name: $('#instSetName').value,
    contact_email: $('#instSetEmail').value,
    default_capacity: Number($('#instSetCap').value),
    pass_mark: Number($('#instSetPass').value),
    seat_allocation: Number($('#instSetSeats').value || 0),
    billing_cycle: $('#instSetBilling').value,
  });
  showToast('Settings saved', 'success');
}

async function saveBranding() {
  const fd = new FormData();
  const logoInput = $('#brandLogo');
  if (logoInput && logoInput.files[0]) fd.append('logo', logoInput.files[0]);
  fd.append('primary_color', $('#brandPrimary').value);
  fd.append('accent_color', $('#brandAccent').value);
  fd.append('email_sender_name', $('#brandEmailName').value);
  fd.append('email_sender_address', $('#brandEmailAddr').value);
  fd.append('welcome_message', $('#brandWelcome').value);
  showLoading(true);
  await apiCall('/api/institution/branding', 'PUT', fd, true);
  await loadAllData();
  if ($('#brandPrimary').value) document.documentElement.style.setProperty('--brand', $('#brandPrimary').value);
  if ($('#brandAccent').value) document.documentElement.style.setProperty('--accent', $('#brandAccent').value);
  rerenderRoleContent(); showLoading(false); showToast('Branding saved', 'success');
}

async function updateInstitutionProfile() {
  await apiCall('/api/institution/profile', 'PUT', {
    name: $('#instProfileName').value,
    type: $('#instProfileType').value,
    industry: $('#instProfileIndustry').value,
    contact_phone: $('#instProfilePhone').value,
    address: $('#instProfileAddress').value,
  });
  await loadAllData(); rerenderRoleContent(); showToast('Profile updated', 'success');
}

/* ---------- Profile generic ---------- */
async function updateUserProfile() {
  await apiCall('/api/user/profile', 'PUT', {
    name: $('#profileName')?.value,
    phone: $('#profilePhone')?.value,
    timezone: $('#profileTimezone')?.value,
    intent: $('#profileIntent')?.value || S.userIntent,
  });
  const me = await apiCall('/api/auth/me');
  currentUser = me.user;
  if (me.user.intent) S.userIntent = me.user.intent;
  localStorage.setItem('user', JSON.stringify(currentUser));
  showToast('Profile updated', 'success');
}

async function changePassword() {
  const oldp = $('#cpOld').value;
  const newp = $('#cpNew').value;
  if (!oldp || newp.length < 8) return showToast('New password must be 8+ characters', 'error');
  await apiCall('/api/auth/password', 'PUT', { old_password: oldp, new_password: newp });
  $('#cpOld').value = ''; $('#cpNew').value = '';
  showToast('Password updated', 'success');
}

/* ============================================================
   CHARTS (global)
   ============================================================ */
function renderCharts() {
  if (!window.Chart) return;
  const ug = document.getElementById('chartUserGrowth') || document.getElementById('userGrowthChart');
  if (ug && !ug.dataset.rendered) {
    const labels = (S.analytics?.usersByMonth || []).map(r => r.ym).reverse();
    const data = (S.analytics?.usersByMonth || []).map(r => r.c).reverse();
    new Chart(ug, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Jan','Feb','Mar','Apr','May','Jun'],
        datasets: [{
          label: 'Users',
          data: data.length ? data : [10,25,40,60,80,120],
          borderColor: '#1e3a8a',
          backgroundColor: 'rgba(30,58,138,.12)',
          tension: 0.3, fill: true,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    ug.dataset.rendered = '1';
  }

  const rv = document.getElementById('chartRevenue') || document.getElementById('revenueChart');
  if (rv && !rv.dataset.rendered) {
    const labels = (S.analytics?.revenueByMonth || []).map(r => r.ym).reverse();
    const data = (S.analytics?.revenueByMonth || []).map(r => Number(r.total)).reverse();
    new Chart(rv, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Jan','Feb','Mar','Apr','May','Jun'],
        datasets: [{
          label: 'Revenue',
          data: data.length ? data : [500,900,1200,1600,2000,2800],
          backgroundColor: '#059669', borderRadius: 6,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    rv.dataset.rendered = '1';
  }

  const role = document.getElementById('roleChart');
  if (role && !role.dataset.rendered) {
    const labels = (S.analytics?.usersByRole || []).map(r => r.role);
    const data = (S.analytics?.usersByRole || []).map(r => r.c);
    new Chart(role, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['Admin','Expert','Institution','Learner'],
        datasets: [{
          data: data.length ? data : [1,5,3,100],
          backgroundColor: ['#dc2626','#059669','#7c3aed','#1e3a8a'],
        }],
      },
      options: { responsive: true },
    });
    role.dataset.rendered = '1';
  }

  const consStatus = document.getElementById('chartConsultationsByStatus');
  if (consStatus && !consStatus.dataset.rendered) {
    const byStatus = S.adminConsultationAnalytics?.byStatus || [
      { label: 'Completed', value: 42 },
      { label: 'Cancelled', value: 8 },
      { label: 'No-Show', value: 3 },
    ];
    new Chart(consStatus, {
      type: 'bar',
      data: {
        labels: byStatus.map(x => x.label),
        datasets: [{ label: 'Count', data: byStatus.map(x => x.value),
          backgroundColor: '#1e3a8a', borderRadius: 6 }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    consStatus.dataset.rendered = '1';
  }

  const topExpertsRevenue = document.getElementById('chartTopExpertsRevenue');
  if (topExpertsRevenue && !topExpertsRevenue.dataset.rendered) {
    const list = S.adminConsultationAnalytics?.topExperts || [];
    new Chart(topExpertsRevenue, {
      type: 'bar',
      data: {
        labels: list.map(x => x.name),
        datasets: [{ label: 'Revenue', data: list.map(x => x.total_earnings),
          backgroundColor: '#059669', borderRadius: 6 }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    topExpertsRevenue.dataset.rendered = '1';
  }

  const courseEnrollment = document.getElementById('chartCourseEnrollment');
  if (courseEnrollment && !courseEnrollment.dataset.rendered) {
    const series = S.courseAnalytics?.enrollmentTrend || [
      { label: 'W1', value: 12 }, { label: 'W2', value: 24 },
      { label: 'W3', value: 41 }, { label: 'W4', value: 55 },
    ];
    new Chart(courseEnrollment, {
      type: 'line',
      data: {
        labels: series.map(x => x.label),
        datasets: [{ label: 'Enrollments', data: series.map(x => x.value),
          borderColor: '#1e3a8a', backgroundColor: 'rgba(30,58,138,.12)',
          tension: 0.3, fill: true }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    courseEnrollment.dataset.rendered = '1';
  }

  const courseCompletion = document.getElementById('chartCourseCompletion');
  if (courseCompletion && !courseCompletion.dataset.rendered) {
    const rows = S.courseAnalytics?.courses || [];
    new Chart(courseCompletion, {
      type: 'bar',
      data: {
        labels: rows.map(x => x.title),
        datasets: [{ label: 'Completion %', data: rows.map(x => x.completion_pct || 0),
          backgroundColor: '#059669', borderRadius: 6 }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    courseCompletion.dataset.rendered = '1';
  }
}

/* ============================================================
   ROUTER
   ============================================================ */
async function route() {
  const hash = location.hash || '#/';

  if (hash === '#/login') return renderLogin();
  if (hash === '#/register') return renderRegister();
  if (hash.startsWith('#/forgot')) return renderForgot();
  if (hash.startsWith('#/reset')) {
    const params = new URLSearchParams(hash.split('?')[1]);
    return renderReset(params.get('token'));
  }
  if (hash.startsWith('#/verify/')) return renderVerify(hash.split('/')[2]);
  if (hash.startsWith('#/setup-account')) {
    const params = new URLSearchParams(hash.split('?')[1]);
    return renderSetupAccount(params.get('email'), params.get('token'));
  }

  if (!authToken) return renderLanding();

  appPhase = 'dashboard';
  if (!currentUser) {
    try {
      const me = await apiCall('/api/auth/me');
      currentUser = me.user;
      currentUserRole = me.user.role;
      S.userIntent = me.user.intent || 'both';
    } catch (_) { return logout(); }
  }

  const needLoad = !S.users.length && !S.consultations.length && !S.courses.length
    && !S.programmes.length && !S.institutions.length;
  if (needLoad) {
    showLoading(true);
    try { await loadAllData(); } finally { showLoading(false); }
  }

  const seg = hash.replace('#/', '').split('/');
  if (seg[1]) activeTab = seg[1];
  renderDashboard();
  startPolling();
}

window.addEventListener('hashchange', route);

/* Keyboard shortcuts */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Escape') closeModal();
  if (e.key === '/' && appPhase === 'dashboard') {
    e.preventDefault();
    document.querySelector('input[type=search]')?.focus();
  }
});

/* ---------- Bootstrap ---------- */
(function init() {
  initTheme();
  const savedToken = localStorage.getItem('token');
  const savedRefresh = localStorage.getItem('refresh');
  const savedUser = localStorage.getItem('user');

  if (savedToken) {
    authToken = savedToken;
    refreshToken = savedRefresh;
    try { currentUser = JSON.parse(savedUser); } catch (_) { currentUser = null; }
    currentUserRole = currentUser?.role || null;
    S.userIntent = currentUser?.intent || 'both';
    initializeSocket();
  }
  route();
})();

/* ============================================================
   END OF FILE
   ============================================================ */