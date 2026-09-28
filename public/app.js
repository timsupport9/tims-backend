/* ============================================================
   ExpertHub 2.0 — SPA frontend (extended build)
   Portion 1 of 3: Core, Auth, Shell, Admin Dashboard
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
};

/* ---------- STATE ---------- */
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
let selectedRows = { users: new Set(), trainees: new Set(), certificates: new Set() };

const S = {
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
  const icon = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle', info: 'bell' }[type] || 'bell';
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
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

/* ---------- DATA LOADERS ---------- */
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
  } else if (currentUserRole === 'expert') {
    tasks.push(apiCall('/api/expert/earnings').then(d => { S.earnings = d.summary; S.wallet.ledger = d.ledger || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/reviews').then(d => { S.reviews = d.reviews || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/withdrawals').then(d => { S.payouts = d.payouts || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/availability').then(d => { S.availability = d.availability || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/time-off').then(d => { S.timeOff = d.timeOff || []; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/dashboard-stats').then(d => { S.expertStats = d.stats; }).catch(() => {}));
    tasks.push(apiCall('/api/expert/portfolio').then(d => { S.expertPortfolio = d.items || []; }).catch(() => {}));
  } else if (currentUserRole === 'institution') {
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
    if (currentUser?.institution_role === 'operations_manager') {
      tasks.push(apiCall('/api/institution/team').then(d => { S.institutionTeam = d.team || []; }).catch(() => {}));
    }
  } else {
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
  }

  await Promise.allSettled(tasks);
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
   ADMIN DASHBOARD
   ============================================================ */
function renderAdminDashboard() {
  const pending = S.users.filter(u => u.status === 'pending').length;
  const activeCons = S.consultations.filter(c => ['pending','assigned','in_progress'].includes(c.status)).length;
  const nav = `
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}
    ${sidebarItem('users','User Management','fa-users', pending)}
    ${sidebarItem('experts','Expert Management','fa-user-tie')}
    ${sidebarItem('consultations','Consultations','fa-comments', activeCons)}
    ${sidebarItem('events','Events','fa-calendar-alt')}
    ${sidebarItem('institutions','Institutions','fa-building-columns')}
    ${sidebarItem('transactions','Transactions','fa-receipt')}
    ${sidebarItem('payouts','Payouts','fa-money-check-dollar')}
    ${sidebarItem('coupons','Coupons','fa-tag')}
    ${sidebarItem('claims','Claims','fa-gavel')}
    ${sidebarItem('tickets','Support','fa-headset')}
    ${sidebarItem('reviews','Reviews','fa-star')}
    ${sidebarItem('broadcasts','Broadcasts','fa-bullhorn')}
    ${sidebarItem('audit','Audit Log','fa-clipboard-list')}
    ${sidebarItem('analytics','Analytics','fa-chart-bar')}
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
    case 'dashboard':     return adminOverview();
    case 'users':         return adminUsers();
    case 'experts':       return adminExperts();
    case 'consultations': return adminConsultations();
    case 'events':        return adminEvents();
    case 'institutions':  return adminInstitutions();
    case 'transactions':  return adminTransactions();
    case 'payouts':       return adminPayouts();
    case 'coupons':       return adminCoupons();
    case 'claims':        return adminClaims();
    case 'tickets':       return adminTickets();
    case 'reviews':       return adminReviews();
    case 'broadcasts':    return adminBroadcasts();
    case 'audit':         return adminAudit();
    case 'analytics':     return adminAnalytics();
    case 'settings':      return adminSettings();
    case 'profile':       return adminProfile();
    default:              return adminOverview();
  }
}

function adminOverview() {
  const pending = S.users.filter(u => u.status === 'pending').length;
  const activeExperts = S.experts.filter(e => e.status === 'active').length;
  const activeCons = S.consultations.filter(c => ['pending','assigned','in_progress'].includes(c.status)).length;
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
          <p class="stat-label">Institutions</p>
          <p class="stat-value">${S.institutions.length}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-building-columns"></i></div>
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
        <div class="stat-icon stat-icon-red"><i class="fas fa-clock"></i></div>
      </div>
    </section>

    ${pending ? `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-circle"></i>
        <div>
          <strong>${pending} user${pending === 1 ? '' : 's'} awaiting approval.</strong>
          <a href="#" data-action="switch-tab" data-tab="users" style="margin-left:8px">Review now</a>
        </div>
      </div>
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
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Last login</th>
              <th>Actions</th>
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
      /* Dynamically bind row checkboxes for admin users table */
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
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header"><h1 class="page-title">All Consultations</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Title</th><th>Client</th><th>Expert</th><th>Type</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${S.consultations.map(c => `
              <tr>
                <td>${esc(c.title || '')}</td>
                <td>${esc(c.client_name || '—')}</td>
                <td>${esc(c.expert_name || '—')}</td>
                <td><span class="chip chip-neutral">${esc(c.consultation_type || '')}</span></td>
                <td><span class="${statusClass(c.status)}">${esc(c.status || '')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="view-consultation" data-id="${c.id}">View</button>
                  ${!c.expert_id ? `<button class="btn btn-primary btn-xs" data-action="assign-consultation" data-id="${c.id}">Assign</button>` : ''}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-row">No consultations</td></tr>'}
          </tbody>
        </table>
      </div>
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
            <span class="review-author">${esc(r.author_name || 'Anonymous')} to ${esc(r.expert_name || 'Expert')}</span>
            <span class="star-rating">${'*'.repeat(r.rating || 0)}${'-'.repeat(5 - (r.rating || 0))}</span>
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
   END OF PORTION 1
   Portion 2 continues with Expert and User dashboards.
   ============================================================ */
   /* ============================================================
   EXPERT DASHBOARD (Portion 2)
   ============================================================ */
function renderExpertDashboard() {
  const mine = S.consultations.filter(c => c.expert_id === currentUser?.id);
  const nav = `
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}
    ${sidebarItem('consultations','Consultations','fa-comments', mine.filter(c=>['assigned','in_progress'].includes(c.status)).length)}
    ${sidebarItem('availability','Availability','fa-clock')}
    ${sidebarItem('calendar','Calendar','fa-calendar')}
    ${sidebarItem('courses','My Courses','fa-book')}
    ${sidebarItem('events','My Events','fa-calendar-alt')}
    ${sidebarItem('portfolio','Portfolio','fa-briefcase')}
    ${sidebarItem('earnings','Earnings','fa-dollar-sign')}
    ${sidebarItem('withdrawals','Withdrawals','fa-money-bill-transfer')}
    ${sidebarItem('reviews','Reviews','fa-star')}
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
    case 'dashboard':     return expertOverview();
    case 'consultations': return expertConsultations();
    case 'availability':  return expertAvailability();
    case 'calendar':      return expertCalendar();
    case 'courses':       return expertCourses();
    case 'events':        return expertEvents();
    case 'portfolio':     return expertPortfolioView();
    case 'earnings':      return expertEarnings();
    case 'withdrawals':   return expertWithdrawals();
    case 'reviews':       return expertReviews();
    case 'profile':       return expertProfile();
    default:              return expertOverview();
  }
}

function expertOverview() {
  const mine = S.consultations.filter(c => c.expert_id === currentUser?.id);
  const active = mine.filter(c => ['assigned','in_progress'].includes(c.status)).length;
  const pending = mine.filter(c => c.status === 'pending').length;
  const completed = mine.filter(c => c.status === 'completed').length;
  const st = S.expertStats || {};
  const earnings = S.earnings || {};
  const rating = Number(currentUser?.average_rating || 0);

  const nextSession = mine
    .filter(c => c.status === 'assigned' || c.status === 'in_progress')
    .slice(0, 3);

  const recentReviews = (S.reviews || []).slice(0, 3);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Dashboard</span></div>
    <section class="page-header">
      <h1 class="page-title">Welcome, ${esc(currentUser?.name || 'Expert')}</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="view-public-profile">
          <i class="fas fa-eye"></i> Preview Public Profile</button>
        <button class="btn btn-primary" data-action="switch-tab" data-tab="availability">
          <i class="fas fa-clock"></i> Update Availability</button>
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
          ${pending > 0 ? `<p class="stat-sub" style="color:var(--warning-dark)">${pending} awaiting response</p>` : ''}
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
    </section>

    ${active > 0 ? `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        <div>
          You have <strong>${active} active consultation${active === 1 ? '' : 's'}</strong>.
          <a href="#" data-action="switch-tab" data-tab="consultations" style="margin-left:6px">View all</a>
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
              <span class="${statusClass(c.status)}">${esc(c.status || '')}</span>
            </header>
            <p class="case-client">Client: ${esc(c.client_name || 'Client')}</p>
            <p class="case-type">${esc(c.consultation_type || '')} · Priority: ${esc(c.priority || 'normal')}</p>
            <footer class="case-footer">
              <button class="btn btn-primary btn-sm" data-action="open-chat" data-id="${c.id}">
                <i class="fas fa-comments"></i> Open Chat</button>
              <button class="btn btn-info btn-sm" data-action="video-call" data-id="${c.id}">
                <i class="fas fa-video"></i> Video</button>
            </footer>
          </div>
        `).join('') : '<p class="empty-row">No active consultations</p>'}
      </div>

      <div class="panel">
        <h3 class="panel-title">Quick Actions</h3>
        <button class="btn btn-primary btn-block" data-action="switch-tab" data-tab="availability">
          <i class="fas fa-clock"></i> Update Availability</button>
        <button class="btn btn-success btn-block" data-action="switch-tab" data-tab="earnings">
          <i class="fas fa-money-bill"></i> Request Withdrawal</button>
        <button class="btn btn-info btn-block" data-action="switch-tab" data-tab="portfolio">
          <i class="fas fa-briefcase"></i> Manage Portfolio</button>
        <button class="btn btn-secondary btn-block" data-action="switch-tab" data-tab="reviews">
          <i class="fas fa-star"></i> View Reviews</button>
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
              <span class="star-rating">${'*'.repeat(r.rating || 0)}${'-'.repeat(5 - (r.rating || 0))}</span>
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
        <select id="expert-consult-filter" class="form-select" style="max-width:180px">
          <option value="">All statuses</option>
          <option value="assigned" ${filter === 'assigned' ? 'selected' : ''}>Assigned</option>
          <option value="in_progress" ${filter === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="completed" ${filter === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="cancelled" ${filter === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>
    </section>

    <section class="list-stack">
      ${filtered.map(c => `
        <article class="case-card">
          <header class="case-header">
            <h3 class="case-title">${esc(c.title || '')}</h3>
            <span class="${statusClass(c.status)}">${esc(c.status || '')}</span>
          </header>
          <p class="case-client">Client: ${esc(c.client_name || 'Client')}</p>
          <p class="case-type">${esc(c.consultation_type || '')} · Priority: ${esc(c.priority || 'normal')}</p>
          <p class="case-desc" style="color:var(--text-muted);font-size:.9rem">
            ${esc((c.description || '').slice(0, 220))}
          </p>
          <footer class="case-footer">
            <button class="btn btn-primary btn-sm" data-action="open-chat" data-id="${c.id}">
              <i class="fas fa-comments"></i> Chat</button>
            <button class="btn btn-info btn-sm" data-action="video-call" data-id="${c.id}">
              <i class="fas fa-video"></i> Video Call</button>
            ${c.status === 'assigned' ? `<button class="btn btn-success btn-sm" data-action="consult-start" data-id="${c.id}">Start</button>` : ''}
            ${c.status === 'in_progress' ? `<button class="btn btn-success btn-sm" data-action="consult-complete" data-id="${c.id}">Complete</button>` : ''}
            <button class="btn btn-secondary btn-sm" data-action="view-consultation" data-id="${c.id}">
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

function expertAvailability() {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const av = {};
  S.availability.forEach(a => { av[a.day_of_week] = a; });

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Availability</span></div>
    <section class="page-header"><h1 class="page-title">Availability Schedule</h1></section>

    <section class="panel">
      <h3 class="panel-title">Weekly Availability</h3>
      <p class="form-hint" style="margin-bottom:16px">Set the hours you are available for consultations each week.</p>
      <div class="availability-grid">
        ${days.map((d, i) => `
          <div class="availability-day">
            <div class="availability-day-header">
              <span class="availability-day-name">${d}</span>
            </div>
            <div class="availability-hours">
              <input type="time" id="start-${i}" class="form-input"
                     value="${av[i]?.start_time?.slice(0,5) || '09:00'}" />
              <span class="availability-sep">to</span>
              <input type="time" id="end-${i}" class="form-input"
                     value="${av[i]?.end_time?.slice(0,5) || '17:00'}" />
            </div>
          </div>
        `).join('')}
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-availability">
          <i class="fas fa-save"></i> Save Availability</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Time Off Requests</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Start date</span>
          <input type="date" id="timeOffStart" class="form-input" /></label>
        <label class="form-group"><span class="form-label">End date</span>
          <input type="date" id="timeOffEnd" class="form-input" /></label>
        <label class="form-group form-group-full"><span class="form-label">Reason</span>
          <input id="timeOffReason" class="form-input" placeholder="e.g. Conference, personal leave" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-warning" data-action="request-time-off">
          <i class="fas fa-paper-plane"></i> Submit Request</button>
      </div>

      <ul class="list-stack" style="margin-top:20px">
        ${S.timeOff.map(t => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${fmtDate(t.start_date)} to ${fmtDate(t.end_date)}</span>
              <span class="list-row-sub">${esc(t.reason || '')}</span>
            </div>
            <span class="${statusClass(t.status)}">${esc(t.status)}</span>
          </li>
        `).join('') || '<li class="empty-row">No time off requests</li>'}
      </ul>
    </section>
  `;
}

function expertCalendar() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Calendar</span></div>
    <section class="page-header"><h1 class="page-title">My Calendar</h1></section>
    <section class="panel">${renderCalendar()}</section>
  `;
}

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push({ day: '', other: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(year, month, d) });
  while (cells.length % 7) cells.push({ day: '', other: true });

  const eventsByDay = {};
  S.events.forEach(ev => {
    const d = new Date(ev.date || ev.created_at);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const k = d.getDate();
      (eventsByDay[k] = eventsByDay[k] || []).push(ev);
    }
  });
  const today = new Date();

  return `
    <h3 class="panel-title">${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
    <div class="calendar-header">
      ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<span>${d}</span>`).join('')}
    </div>
    <div class="calendar-grid">
      ${cells.map(c => {
        const isToday = c.date && c.date.toDateString() === today.toDateString();
        const evs = c.day ? (eventsByDay[c.day] || []) : [];
        return `
          <div class="calendar-cell ${c.other ? 'other-month' : ''} ${isToday ? 'today' : ''}">
            <div class="calendar-day-num">${c.day || ''}</div>
            ${evs.slice(0, 3).map(e => `
              <div class="calendar-event" title="${esc(e.title)}">${esc(e.title)}</div>
            `).join('')}
          </div>`;
      }).join('')}
    </div>
  `;
}

function expertCourses() {
  const mine = S.courses.filter(c => c.expert_id === currentUser?.id);
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Courses</span></div>
    <section class="page-header">
      <h1 class="page-title">My Courses</h1>
      <button class="btn btn-primary" data-action="create-course-modal">
        <i class="fas fa-plus"></i> New Course</button>
    </section>

    <section class="card-grid">
      ${mine.map(c => `
        <article class="program-card">
          <span class="chip chip-blue">${esc(c.level || 'beginner')}</span>
          <h4 class="program-title">${esc(c.title || '')}</h4>
          <p class="program-desc">${esc((c.description || '').slice(0, 110))}</p>
          <footer class="program-footer">
            <span class="program-price">${fmtCur(c.price || 0)}</span>
            <span class="program-meta">
              ${c.duration_weeks || c.duration_hours || 0}${c.duration_weeks ? 'w' : 'h'}
            </span>
          </footer>
          <div class="panel-actions" style="margin-top:10px">
            <button class="btn btn-secondary btn-sm" data-action="edit-course" data-id="${c.id}">Edit</button>
            <button class="btn btn-info btn-sm" data-action="view-course-analytics" data-id="${c.id}">Analytics</button>
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

function expertEvents() {
  const mine = S.events.filter(e => e.expert_id === currentUser?.id);
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Events</span></div>
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
        Share case studies, client outcomes, and testimonials to build credibility.
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
          <p>Add case studies to showcase your expertise to potential clients.</p>
          <button class="btn btn-primary" data-action="add-portfolio-item">
            <i class="fas fa-plus"></i> Add First Item</button>
        </div>
      `}
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
        <div class="stat-info">
          <p class="stat-label">Average Rating</p>
          <p class="stat-value">${avg}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-star"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Reviews</p>
          <p class="stat-value">${reviews.length}</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-comment"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">5-Star Reviews</p>
          <p class="stat-value">${reviews.filter(r => r.rating === 5).length}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-thumbs-up"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">With Replies</p>
          <p class="stat-value">${reviews.filter(r => r.reply).length}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-reply"></i></div>
      </div>
    </div>

    <section class="panel">
      ${reviews.length ? reviews.map(r => `
        <article class="review-card">
          <header class="review-header">
            <span class="review-author">${esc(r.author_name || 'Anonymous')}</span>
            <span class="star-rating">${'*'.repeat(r.rating || 0)}${'-'.repeat(5 - (r.rating || 0))}</span>
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
   USER DASHBOARD (intent-aware - learner / consultant / both)
   ============================================================ */
function renderUserDashboard() {
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const intent = S.userIntent || currentUser?.intent || 'both';
  const showLearn   = intent === 'learn'   || intent === 'both';
  const showConsult = intent === 'consult' || intent === 'both';

  const nav = `
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}
    ${showLearn ? sidebarItem('eschool','E-School','fa-school') : ''}
    ${showLearn ? sidebarItem('my-learning','My Learning','fa-graduation-cap') : ''}
    ${showLearn ? sidebarItem('wishlist','Wishlist','fa-heart') : ''}
    ${showLearn ? sidebarItem('certificates','Certificates','fa-certificate') : ''}
    ${sidebarItem('events','Events','fa-calendar-alt')}
    ${showConsult ? sidebarItem('experts','Find Experts','fa-search') : ''}
    ${sidebarItem('consultations','My Consultations','fa-comments', mine.length)}
    ${sidebarItem('wallet','Wallet','fa-wallet')}
    ${sidebarItem('transactions','Transactions','fa-receipt')}
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
    case 'dashboard':     return userOverview();
    case 'eschool':       return userESchool();
    case 'my-learning':   return userMyLearning();
    case 'wishlist':      return userWishlist();
    case 'certificates':  return userCertificates();
    case 'events':        return userEvents();
    case 'experts':       return userFindExperts();
    case 'consultations': return userConsultations();
    case 'wallet':        return userWallet();
    case 'transactions':  return userTransactions();
    case 'claims':        return userClaims();
    case 'support':       return userSupport();
    case 'profile':       return userProfile();
    default:              return userOverview();
  }
}

function userOverview() {
  const intent = S.userIntent || currentUser?.intent || 'both';
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const activeCons = mine.filter(c => ['pending','assigned','in_progress'].includes(c.status)).length;

  const inProgress = S.enrollments.filter(e => e.progress > 0 && e.progress < 100).slice(0, 3);
  const completedCount = S.enrollments.filter(e => Number(e.progress) >= 100).length;
  const totalProgress = S.enrollments.length
    ? Math.round(S.enrollments.reduce((s, e) => s + Number(e.progress || 0), 0) / S.enrollments.length)
    : 0;

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
          <p class="stat-label">Avg. Progress</p>
          <p class="stat-value">${totalProgress}%</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-chart-line"></i></div>
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
            <button class="btn btn-primary btn-sm" data-action="update-progress"
                    data-id="${e.id}" data-current="${e.progress || 0}">
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
        <i class="fas fa-wallet tile-icon"></i>
        <h3 class="tile-title">Wallet</h3>
        <p class="tile-desc">Balance: ${fmtCur(S.wallet.balance || 0)}</p>
        <button class="btn btn-warning" data-action="switch-tab" data-tab="wallet">Manage</button>
      </article>
      <article class="dashboard-card tile-card">
        <i class="fas fa-certificate tile-icon"></i>
        <h3 class="tile-title">Certificates</h3>
        <p class="tile-desc">${S.certificates.length} earned</p>
        <button class="btn btn-info" data-action="switch-tab" data-tab="certificates">View</button>
      </article>
    </section>

    ${activeCons ? `
      <section class="panel">
        <h3 class="panel-title">Active Consultations</h3>
        <ul class="list-stack">
          ${mine
            .filter(c => ['pending','assigned','in_progress'].includes(c.status))
            .slice(0, 5)
            .map(c => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(c.title || '')}</span>
                  <span class="list-row-sub">Expert: ${esc(c.expert_name || 'Unassigned')}</span>
                </div>
                <span class="${statusClass(c.status)}">${esc(c.status)}</span>
              </li>
            `).join('')}
        </ul>
      </section>
    ` : ''}
  `;
}

function userESchool() {
  const tabs = [
    { id:'courses',     label:'All Courses' },
    { id:'bootcamps',   label:'Bootcamps' },
    { id:'short_course',label:'Short Courses' },
    { id:'tuition',     label:'Tuition' },
    { id:'exam_prep',   label:'Exam Prep' },
    { id:'career',      label:'Career' },
  ];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>E-School</span></div>
    <section class="page-header">
      <h1 class="page-title">E-School Learning Hub</h1>
    </section>
    <nav class="tab-bar">
      ${tabs.map(t => `
        <button class="tab-btn ${activeESchoolTab === t.id ? 'tab-btn-active' : ''}"
                data-eschool-tab="${t.id}">${t.label}</button>
      `).join('')}
    </nav>
    <section class="panel" id="eschool-panel">${renderESchoolPanel()}</section>
  `;
}

function renderESchoolPanel() {
  const filter = activeESchoolTab === 'courses' ? null : activeESchoolTab;
  const list = filter ? S.courses.filter(c => c.course_type === filter) : S.courses;

  if (!list.length) {
    return `
      <div class="empty-state">
        <i class="fas fa-book-open"></i>
        <h3>No courses available</h3>
        <p>Check back soon for new courses.</p>
      </div>`;
  }

  const wishlistIds = new Set((S.wishlist || []).map(w => String(w.course_id)));

  return `
    <div class="card-grid">
      ${list.map(c => `
        <article class="program-card">
          <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
          <h4 class="program-title">${esc(c.title || '')}</h4>
          <p class="program-desc">${esc((c.description || '').slice(0, 120))}</p>
          <footer class="program-footer">
            <span class="program-price">${fmtCur(c.price || 0)}</span>
            <span class="program-meta">
              ${c.duration_weeks ? c.duration_weeks + 'w' : (c.duration_hours || 0) + 'h'} ·
              ${esc(c.level || '')}
            </span>
          </footer>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px">
            <button class="btn btn-primary btn-sm" data-action="enroll-modal" data-id="${c.id}">
              <i class="fas fa-shopping-cart"></i> Enroll</button>
            <button class="btn btn-secondary btn-sm" data-action="toggle-wishlist" data-id="${c.id}">
              <i class="fas fa-heart" style="color:${wishlistIds.has(String(c.id)) ? 'var(--danger)' : 'inherit'}"></i>
            </button>
          </div>
        </article>
      `).join('')}
    </div>`;
}

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
            <button class="btn btn-primary btn-sm" data-action="update-progress"
                    data-id="${e.id}" data-current="${e.progress || 0}">
              <i class="fas fa-play"></i> Update Progress</button>
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
            <button class="btn btn-success btn-sm" data-action="update-progress"
                    data-id="${e.id}" data-current="0">
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
            <p class="enrollment-progress">Completed</p>
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
            <button class="btn btn-primary btn-sm" data-action="enroll-modal" data-id="${c.id}">
              <i class="fas fa-shopping-cart"></i> Enroll</button>
            <button class="btn btn-danger btn-sm" data-action="toggle-wishlist" data-id="${c.id}">
              <i class="fas fa-heart"></i> Remove</button>
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

function userCertificates() {
  const certs = S.certificates || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Certificates</span></div>
    <section class="page-header"><h1 class="page-title">My Certificates</h1></section>

    ${certs.length ? `
      <section class="card-grid">
        ${certs.map(c => `
          <article class="program-card">
            <div style="text-align:center;padding:16px 0;border-bottom:1px solid var(--border);margin-bottom:12px">
              <i class="fas fa-certificate" style="font-size:2.5rem;color:var(--accent)"></i>
            </div>
            <h4 class="program-title">${esc(c.course_title || '')}</h4>
            <p class="program-desc" style="font-size:.8rem">
              Serial: <code class="code">${esc(c.serial || '')}</code>
            </p>
            <footer class="program-footer">
              <span class="program-meta">Issued: ${fmtDate(c.issued_at)}</span>
            </footer>
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-secondary btn-sm" data-action="print-certificate" data-id="${c.id}">
                <i class="fas fa-print"></i> Print</button>
              ${c.serial ? `
                <a class="btn btn-info btn-sm" href="/verify/${esc(c.serial)}" target="_blank" rel="noopener">
                  <i class="fas fa-external-link-alt"></i> Verify</a>
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

function userFindExperts() {
  const query = ($('#expert-search')?.value || '').toLowerCase();
  const filtered = query
    ? S.experts.filter(e =>
        (e.name || '').toLowerCase().includes(query) ||
        (e.specialization || '').toLowerCase().includes(query)
      )
    : S.experts;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Experts</span></div>
    <section class="page-header">
      <h1 class="page-title">Find Experts</h1>
      <div class="page-actions">
        <input type="search" id="expert-search" class="form-input"
               placeholder="Search by name or specialization"
               value="${esc(query)}" style="max-width:280px" />
      </div>
    </section>

    <section class="card-grid">
      ${filtered.map(e => `
        <article class="expert-card">
          <img class="expert-avatar" src="${avatar(e)}" alt="" />
          <h4 class="expert-name">${esc(e.name || '')}</h4>
          <p class="expert-expertise">${esc(e.specialization || '—')}</p>
          <p class="expert-rate">${fmtCur(e.hourly_rate || 0)} / hr</p>
          <p class="expert-rating">
            <i class="fas fa-star" style="color:#f59e0b"></i>
            <span class="expert-rating-value">${Number(e.average_rating || 0).toFixed(1)}</span>
          </p>
          <button class="btn btn-primary btn-block" data-action="book-expert"
                  data-id="${e.id}" data-name="${esc(e.name || '')}">
            <i class="fas fa-calendar-plus"></i> Book Consultation</button>
          <button class="btn btn-secondary btn-block" data-action="view-expert-profile" data-id="${e.id}">
            <i class="fas fa-eye"></i> View Profile</button>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-search"></i>
          <h3>No experts found</h3>
          <p>Try a different search term.</p>
        </div>
      `}
    </section>
  `;
}

function userConsultations() {
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header">
      <h1 class="page-title">My Consultations</h1>
      <button class="btn btn-primary" data-action="new-consultation">
        <i class="fas fa-plus"></i> New Request</button>
    </section>

    <section class="list-stack">
      ${mine.map(c => `
        <article class="case-card">
          <header class="case-header">
            <h3 class="case-title">${esc(c.title || '')}</h3>
            <span class="${statusClass(c.status)}">${esc(c.status || '')}</span>
          </header>
          <p class="case-type">
            ${esc(c.consultation_type || '')} ·
            Expert: ${esc(c.expert_name || 'Unassigned')}
          </p>
          <p class="case-desc" style="color:var(--text-muted);font-size:.9rem">
            ${esc((c.description || '').slice(0, 180))}
          </p>
          <footer class="case-footer">
            <button class="btn btn-primary btn-sm" data-action="open-chat" data-id="${c.id}">
              <i class="fas fa-comments"></i> Chat</button>
            ${c.status === 'completed' ? `
              <button class="btn btn-success btn-sm" data-action="review-expert"
                      data-id="${c.id}" data-expert="${c.expert_id}">
                <i class="fas fa-star"></i> Rate Expert</button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" data-action="file-claim" data-id="${c.id}">
              <i class="fas fa-gavel"></i> File Claim</button>
          </footer>
        </article>
      `).join('') || `
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>No consultations yet</h3>
          <p>Book your first expert session.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="experts">
            <i class="fas fa-search"></i> Find Experts</button>
        </div>
      `}
    </section>
  `;
}

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
    </section>
  `;
}

/* ============================================================
   END OF PORTION 2
   Portion 3 continues with Institution Dashboard, chat modal,
   handleAction, modal builders, charts, and router.
   ============================================================ */
   
   /* ============================================================
   INSTITUTION DASHBOARD (Portion 3)
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

  const nav = `
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}
    ${sidebarItem('programmes','Programmes','fa-diagram-project')}
    ${sidebarItem('learning-paths','Learning Paths','fa-route')}
    ${sidebarItem('cohorts','Cohorts and Batches','fa-layer-group', upcomingSessions)}
    ${sidebarItem('training','Training Delivery','fa-chalkboard-user')}
    ${sidebarItem('assessments','Assessments','fa-clipboard-check')}
    ${sidebarItem('question-bank','Question Bank','fa-database')}
    ${sidebarItem('projects','Capstone Projects','fa-briefcase')}
    ${sidebarItem('trainees','Trainees','fa-users')}
    ${sidebarItem('certifications','Certifications','fa-award', expiringCerts)}
    ${sidebarItem('skills','Skills Matrix','fa-puzzle-piece')}
    ${sidebarItem('compliance','Compliance','fa-shield-halved')}
    ${sidebarItem('instructors','Instructors','fa-user-tie')}
    ${sidebarItem('reports','Reports and Insights','fa-file-lines')}
    ${sidebarItem('org-structure','Org Structure','fa-sitemap')}
    ${isOpsManager ? sidebarItem('operations','Operations Control','fa-sliders', pendingApprovals) : ''}
    ${isOpsManager ? sidebarItem('branding','Custom Branding','fa-palette') : ''}
    ${sidebarItem('profile','Institution Profile','fa-building')}
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
    case 'dashboard':      return instOverview();
    case 'programmes':     return instProgrammes();
    case 'learning-paths': return instLearningPaths();
    case 'cohorts':        return instCohorts();
    case 'training':       return instTraining();
    case 'assessments':    return instAssessments();
    case 'question-bank':  return instQuestionBank();
    case 'projects':       return instProjects();
    case 'trainees':       return instTrainees();
    case 'certifications': return instCertifications();
    case 'skills':         return instSkills();
    case 'compliance':     return instCompliance();
    case 'instructors':    return instInstructors();
    case 'reports':        return instReports();
    case 'org-structure':  return instOrgStructure();
    case 'operations':     return instOperations();
    case 'branding':       return instBranding();
    case 'profile':        return instProfile();
    default:               return instOverview();
  }
}

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

function instProgrammes() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Programmes</span></div>
    <section class="page-header">
      <h1 class="page-title">Training Programmes</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-programme">
          <i class="fas fa-plus"></i> New Programme</button>
      </div>
    </section>

    <section class="card-grid">
      ${S.programmes.map(p => `
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

function instLearningPaths() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Learning Paths</span></div>
    <section class="page-header">
      <h1 class="page-title">Learning Paths</h1>
      <button class="btn btn-primary" data-action="create-learning-path">
        <i class="fas fa-plus"></i> New Path</button>
    </section>

    ${S.institutionLearningPaths.length ? `
      <section class="card-grid">
        ${S.institutionLearningPaths.map(lp => `
          <article class="program-card">
            <span class="chip chip-blue">${lp.step_count || 0} step${(lp.step_count || 0) === 1 ? '' : 's'}</span>
            <h4 class="program-title">${esc(lp.title)}</h4>
            <p class="program-desc">${esc((lp.description || '').slice(0, 130))}</p>
            <footer class="program-footer">
              <span class="status ${lp.active ? 'status-active' : 'status-archived'}">
                ${lp.active ? 'Active' : 'Inactive'}</span>
            </footer>
            <div class="panel-actions" style="margin-top:10px">
              <button class="btn btn-secondary btn-sm" data-action="view-learning-path" data-id="${lp.id}">
                <i class="fas fa-eye"></i> View</button>
              <button class="btn btn-info btn-sm" data-action="edit-learning-path" data-id="${lp.id}">
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
          <p>Bundle multiple programmes into a sequenced path with badges.</p>
          <button class="btn btn-primary" data-action="create-learning-path">
            <i class="fas fa-plus"></i> Create Path</button>
        </div>
      </section>
    `}
  `;
}

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
              <th>Cohort</th>
              <th>Programme</th>
              <th>Instructor</th>
              <th>Dates</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Actions</th>
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
        <div class="stat-info">
          <p class="stat-label">Upcoming</p>
          <p class="stat-value">${upcoming.length}</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Completed</p>
          <p class="stat-value">${past.filter(s => s.status === 'completed').length}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Avg. Attendance</p>
          <p class="stat-value">${avgAttendance}%</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-user-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total Sessions</p>
          <p class="stat-value">${sessions.length}</p>
        </div>
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
              <th>Session</th>
              <th>Cohort</th>
              <th>Date</th>
              <th>Attendance</th>
              <th>Status</th>
              <th>Actions</th>
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

function instQuestionBank() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Question Bank</span></div>
    <section class="page-header">
      <h1 class="page-title">Question Bank</h1>
      <button class="btn btn-primary" data-action="create-question">
        <i class="fas fa-plus"></i> New Question</button>
    </section>

    <section class="panel">
      ${S.institutionQuestions.length ? `
        <ul class="list-stack">
          ${S.institutionQuestions.map(q => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc((q.question_text || '').slice(0, 100))}</span>
                <span class="list-row-sub">
                  ${esc(q.question_type)} - ${esc(q.difficulty)} -
                  ${q.category ? esc(q.category) : 'Uncategorised'} - ${q.points} point${q.points === 1 ? '' : 's'}
                </span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-xs" data-action="edit-question" data-id="${q.id}">Edit</button>
                <button class="btn btn-danger btn-xs" data-action="delete-question" data-id="${q.id}">Delete</button>
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
              <th>Issued</th><th>Expires</th><th>CPD</th><th>Status</th><th>Actions</th>
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
            }).join('') || '<tr><td colspan="8" class="empty-row">No certificates issued yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

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

function instCompliance() {
  const rules = S.institutionComplianceRules || [];
  const certs = S.institutionCertificates || [];
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
      <h1 class="page-title">Compliance Calendar</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-compliance-report">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="create-compliance-rule">
          <i class="fas fa-plus"></i> New Rule</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Active Rules</p><p class="stat-value">${rules.filter(r => r.active).length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-shield-halved"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Expired Certificates</p><p class="stat-value">${expired.length}</p></div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-exclamation-triangle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Expiring in 30 Days</p><p class="stat-value">${expiring30.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Compliant</p>
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
  `;
}

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

    <section class="panel-charts">
      <div class="chart-card">
        <h3 class="panel-title">Cohort Completion Trend</h3>
        <canvas id="chartInstProgress" height="200"></canvas>
      </div>
      <div class="chart-card">
        <h3 class="panel-title">Assessment Distribution</h3>
        <canvas id="chartInstAssess" height="200"></canvas>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Report Templates</h3>
      ${S.institutionReportTemplates.length ? `
        <ul class="list-stack">
          ${S.institutionReportTemplates.map(t => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(t.name)}</span>
                <span class="list-row-sub">${esc(t.report_type)} - created ${fmtDate(t.created_at)}</span>
              </div>
              <button class="btn btn-secondary btn-xs" data-action="run-report-template" data-id="${t.id}">
                <i class="fas fa-play"></i> Run</button>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-row">No report templates saved</p>'}
    </section>
  `;
}

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
        <label class="form-group"><span class="form-label">Contract start</span>
          <input id="instSetContractStart" type="date" class="form-input"
                 value="${inst.contract_start ? new Date(inst.contract_start).toISOString().slice(0, 10) : ''}" /></label>
        <label class="form-group"><span class="form-label">Contract end</span>
          <input id="instSetContractEnd" type="date" class="form-input"
                 value="${inst.contract_end ? new Date(inst.contract_end).toISOString().slice(0, 10) : ''}" /></label>
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
      <h3 class="panel-title">Webhook Configuration</h3>
      <p class="form-hint" style="margin-bottom:12px">
        Send events to an external HRIS or automation tool. Payload is signed
        with HMAC SHA-256 in the <code class="code">X-ExpertHub-Signature</code> header.
      </p>
      <div class="form-grid">
        <label class="form-group form-group-full">
          <span class="form-label">Webhook URL</span>
          <input id="webhookUrl" class="form-input"
                 value="${esc(inst.webhook_url || '')}"
                 placeholder="https://hooks.example.com/experthub" />
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Signing secret</span>
          <input id="webhookSecret" class="form-input"
                 value="${esc(inst.webhook_secret || '')}" />
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-webhook">
          <i class="fas fa-save"></i> Save</button>
        <button class="btn btn-secondary" data-action="test-webhook">
          <i class="fas fa-paper-plane"></i> Send Test</button>
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
          <p class="form-hint">Recommended: 256 by 256 PNG or SVG, transparent background</p>
        </label>
        <label class="form-group"><span class="form-label">Primary colour</span>
          <input type="color" id="brandPrimary" class="form-input" value="${esc(primary)}" /></label>
        <label class="form-group"><span class="form-label">Accent colour</span>
          <input type="color" id="brandAccent" class="form-input" value="${esc(accent)}" /></label>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Custom Domain</h3>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Subdomain</span>
          <input id="brandSubdomain" class="form-input"
                 value="${esc(inst.subdomain || '')}" placeholder="acme" />
          <p class="form-hint">Your portal URL: acme.experthub.com</p>
        </label>
        <label class="form-group">
          <span class="form-label">Custom domain</span>
          <input id="brandDomain" class="form-input"
                 value="${esc(inst.custom_domain || '')}"
                 placeholder="training.acme.com" disabled />
          <p class="form-hint">Available on Enterprise plan. Contact sales.</p>
        </label>
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
                 value="${esc(inst.email_sender_address || '')}" placeholder="training@acme.com" /></label>
        <label class="form-group form-group-full">
          <span class="form-label">Welcome message shown to trainees on first login</span>
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
        color: #fff; padding: 32px; border-radius: var(--r-lg); text-align: center;
        box-shadow: var(--shadow-md)">
        ${inst.logo_url ? `<img src="${esc(inst.logo_url)}" alt=""
                style="height:56px;margin:0 auto 16px;filter:brightness(0) invert(1)" />` : ''}
        <h2 style="margin:0;color:#fff;font-size:1.5rem">${esc(inst.name || 'Your Institution')}</h2>
        <p style="margin:8px 0 0;opacity:.9;font-size:.9rem">Training Portal</p>
      </div>
    </section>
  `;
}

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

    <section class="panel">
      <h3 class="panel-title">Subscription</h3>
      <div class="form-grid">
        <div><p class="form-label">Seat Allocation</p><p>${inst.seat_allocation || 0} seats</p></div>
        <div><p class="form-label">Seats Used</p><p>${S.institutionTraineeTotal || 0} seats</p></div>
        <div><p class="form-label">Billing Cycle</p><p>${esc(inst.billing_cycle || 'monthly')}</p></div>
        <div><p class="form-label">Contract</p>
          <p>${fmtDate(inst.contract_start)} to ${fmtDate(inst.contract_end)}</p>
        </div>
      </div>
    </section>
  `;
}

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
          tension: 0.3,
          fill: true,
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
          backgroundColor: accent,
          borderRadius: 6,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    a.dataset.rendered = '1';
  }
}

function attachInstitutionInteractions() {
  /* Skills matrix cells - click to cycle proficiency */
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
        dot.style.color = cur >= 4 ? '#fff' : '#374151';
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

  const expertConsultFilter = $('#expert-consult-filter');
  if (expertConsultFilter) expertConsultFilter.onchange = () => rerenderRoleContent();
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

  if (currentUserRole === 'institution') {
    attachInstitutionInteractions();
  }
}

/* ============================================================
   ACTION HANDLER
   ============================================================ */
async function handleAction(action, id, el) {
  switch (action) {
    /* ---------- Common ---------- */
    case 'switch-tab':
      activeTab = el.dataset.tab;
      return rerenderRoleContent();
    case 'refresh-all':
      showLoading(true);
      await loadAllData();
      rerenderRoleContent();
      showLoading(false);
      return showToast('Refreshed', 'success');
    case 'export-dashboard': return downloadCsv('dashboard-users.csv', S.users);
    case 'export-users':     return downloadCsv('users.csv', S.users);
    case 'help':             return showToast('Support: support@experthub.com', 'info');
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

    /* ---------- Admin - Users ---------- */
    case 'approve-user':
      await apiCall(`/api/admin/users/${id}/approve`, 'PUT');
      await reloadUsers();
      showToast('User approved', 'success');
      return rerenderRoleContent();
    case 'suspend-user':
      await apiCall(`/api/admin/users/${id}/suspend`, 'PUT');
      await reloadUsers();
      showToast('User suspended', 'success');
      return rerenderRoleContent();
    case 'reject-user': {
      const reason = prompt('Reason for rejection?') || '';
      await apiCall(`/api/admin/users/${id}/reject`, 'PUT', { reason });
      await reloadUsers();
      showToast('User rejected', 'warning');
      return rerenderRoleContent();
    }
    case 'delete-user': {
      if (!await confirmDialog('Delete this user permanently?')) return;
      await apiCall(`/api/admin/users/${id}`, 'DELETE');
      await reloadUsers();
      showToast('User deleted', 'success');
      return rerenderRoleContent();
    }
    case 'bulk-approve-users': {
      if (!await confirmDialog(`Approve ${selectedRows.users.size} user(s)?`)) return;
      try {
        showLoading(true);
        for (const uid of selectedRows.users) {
          await apiCall(`/api/admin/users/${uid}/approve`, 'PUT').catch(() => {});
        }
        selectedRows.users.clear();
        await reloadUsers();
        showToast('Users approved', 'success');
        rerenderRoleContent();
      } finally { showLoading(false); }
      return;
    }
    case 'bulk-suspend-users': {
      if (!await confirmDialog(`Suspend ${selectedRows.users.size} user(s)?`)) return;
      try {
        showLoading(true);
        for (const uid of selectedRows.users) {
          await apiCall(`/api/admin/users/${uid}/suspend`, 'PUT').catch(() => {});
        }
        selectedRows.users.clear();
        await reloadUsers();
        showToast('Users suspended', 'warning');
        rerenderRoleContent();
      } finally { showLoading(false); }
      return;
    }
    case 'edit-user': {
      const u = S.users.find(x => String(x.id) === id);
      if (!u) return;
      openModal({
        title: `Edit ${u.name}`,
        body: `
          <label class="form-group"><span class="form-label">Name</span>
            <input id="euName" class="form-input" value="${esc(u.name || '')}" /></label>
          <label class="form-group">
            <span class="form-label">Role</span>
            <select id="euRole" class="form-select">
              <option value="learner" ${u.role === 'learner' ? 'selected' : ''}>Learner</option>
              <option value="expert" ${u.role === 'expert' ? 'selected' : ''}>Expert</option>
              <option value="institution" ${u.role === 'institution' ? 'selected' : ''}>Institution</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </label>
          <label class="form-group">
            <span class="form-label">Status</span>
            <select id="euStatus" class="form-select">
              <option value="active" ${u.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="pending" ${u.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="suspended" ${u.status === 'suspended' ? 'selected' : ''}>Suspended</option>
            </select>
          </label>`,
        footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
                 <button id="euSave" class="btn btn-primary">Save</button>`,
      });
      $('#euSave').onclick = async () => {
        await apiCall(`/api/admin/users/${id}`, 'PUT', {
          name: $('#euName').value,
          role: $('#euRole').value,
          status: $('#euStatus').value,
        });
        closeModal();
        await reloadUsers();
        showToast('User updated', 'success');
        rerenderRoleContent();
      };
      return;
    }

    /* ---------- Admin - Experts ---------- */
    case 'show-create-expert': $('#createExpertPanel')?.classList.remove('hidden'); return;
    case 'hide-create-expert': $('#createExpertPanel')?.classList.add('hidden'); return;
    case 'submit-create-expert': {
      const name = $('#newExpertName').value;
      const email = $('#newExpertEmail').value;
      const spec = $('#newExpertSpec').value;
      const rate = Number($('#newExpertRate').value || 0);
      const bio = $('#newExpertBio').value;
      const phone = $('#newExpertPhone').value;
      if (!name || !email) return showToast('Name and email required', 'error');
      showLoading(true);
      const d = await apiCall('/api/admin/experts/create', 'POST', {
        name, email, specialization: spec, hourly_rate: rate, bio, phone,
      });
      await loadAllData();
      rerenderRoleContent();
      showLoading(false);
      showToast(`Expert created. Temp password: ${d.temp_password}`, 'success', 8000);
      return;
    }

    /* ---------- Admin - Consultations ---------- */
    case 'assign-consultation': {
      const expertOpts = S.experts.map(e =>
        `<option value="${e.id}">${esc(e.name)} (${esc(e.specialization || '')})</option>`
      ).join('');
      openModal({
        title: 'Assign Expert',
        body: `
          <label class="form-group"><span class="form-label">Expert</span>
            <select id="assignExp" class="form-select">${expertOpts}</select></label>`,
        footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
                 <button id="assignSave" class="btn btn-primary">Assign</button>`,
      });
      $('#assignSave').onclick = async () => {
        await apiCall(`/api/common/consultations/${id}/assign`, 'PUT', {
          expert_id: Number($('#assignExp').value),
        });
        closeModal();
        await reloadConsultations();
        showToast('Expert assigned', 'success');
        rerenderRoleContent();
      };
      return;
    }
    case 'view-consultation': return showConsultationModal(id);
    case 'consult-start':
      await apiCall(`/api/common/consultations/${id}/status`, 'PUT', { status: 'in_progress' });
      await reloadConsultations();
      return rerenderRoleContent();
    case 'consult-complete':
      await apiCall(`/api/common/consultations/${id}/status`, 'PUT', { status: 'completed' });
      await reloadConsultations();
      showToast('Consultation marked completed', 'success');
      return rerenderRoleContent();

    /* ---------- Admin - Events ---------- */
    case 'create-event': return openEventModal();
    case 'edit-event':   return openEventModal(id);
    case 'delete-event': {
      if (!await confirmDialog('Delete this event?')) return;
      await apiCall(`/api/admin/events/${id}`, 'DELETE');
      await loadAllData();
      showToast('Event deleted', 'success');
      return rerenderRoleContent();
    }

    /* ---------- Admin - Institutions ---------- */
    case 'create-institution': return openInstitutionModal();
    case 'edit-institution':   return openInstitutionModal(Number(id));
    case 'approve-institution':
      await apiCall(`/api/admin/institutions/${id}/approve`, 'PUT');
      await reloadInstitutions();
      showToast('Institution verified', 'success');
      return rerenderRoleContent();
    case 'reject-institution': {
      const reason = prompt('Reason for rejection?') || '';
      await apiCall(`/api/admin/institutions/${id}/reject`, 'PUT', { reason });
      await reloadInstitutions();
      showToast('Institution rejected', 'warning');
      return rerenderRoleContent();
    }
    case 'suspend-institution':
      await apiCall(`/api/admin/institutions/${id}/suspend`, 'PUT');
      await reloadInstitutions();
      return rerenderRoleContent();
    case 'delete-institution': {
      if (!await confirmDialog('Delete this institution permanently?')) return;
      await apiCall(`/api/admin/institutions/${id}`, 'DELETE');
      await reloadInstitutions();
      showToast('Institution deleted', 'success');
      return rerenderRoleContent();
    }
    case 'assign-ops-manager': {
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
        const d = await apiCall(`/api/admin/institutions/${id}/ops-manager`, 'POST', {
          name: $('#omName').value, email: $('#omEmail').value,
        });
        closeModal();
        await reloadInstitutions();
        rerenderRoleContent();
        showToast(`Ops manager created. Temp password: ${d.temp_password}`, 'success', 8000);
      };
      return;
    }

    /* ---------- Admin - Payouts ---------- */
    case 'payout-approve':
      await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'approved' });
      return reloadPayoutsAndRerender('Payout approved');
    case 'payout-process':
      await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'processing' });
      return reloadPayoutsAndRerender('Payout processing');
    case 'payout-paid':
      await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'paid' });
      return reloadPayoutsAndRerender('Payout marked paid');
    case 'payout-reject': {
      const reason = prompt('Rejection reason?') || '';
      await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'rejected', reason });
      return reloadPayoutsAndRerender('Payout rejected');
    }

    /* ---------- Admin - Coupons ---------- */
    case 'create-coupon': {
      openModal({
        title: 'New Coupon',
        body: `
          <label class="form-group"><span class="form-label">Code</span>
            <input id="cpCode" class="form-input" placeholder="WELCOME10" /></label>
          <label class="form-group"><span class="form-label">Type</span>
            <select id="cpType" class="form-select">
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
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
        try {
          await apiCall('/api/admin/coupons', 'POST', {
            code: $('#cpCode').value,
            discount_type: $('#cpType').value,
            discount_value: Number($('#cpValue').value || 0),
            max_uses: $('#cpMax').value ? Number($('#cpMax').value) : null,
            min_spend: Number($('#cpMin').value || 0),
            applies_to: $('#cpApply').value,
          });
          closeModal();
          await loadAllData();
          showToast('Coupon created', 'success');
          rerenderRoleContent();
        } catch (e) { showToast(e.message, 'error'); }
      };
      return;
    }
    case 'toggle-coupon':
      await apiCall(`/api/admin/coupons/${id}/toggle`, 'PUT');
      await loadAllData();
      return rerenderRoleContent();
    case 'delete-coupon': {
      if (!await confirmDialog('Delete this coupon?')) return;
      await apiCall(`/api/admin/coupons/${id}`, 'DELETE');
      await loadAllData();
      return rerenderRoleContent();
    }

    /* ---------- Admin - Claims / Tickets / Reviews ---------- */
    case 'claim-investigate':
      await apiCall(`/api/admin/claims/${id}`, 'PUT', { status: 'investigating' });
      return loadAllData().then(() => rerenderRoleContent());
    case 'claim-resolve': {
      const resolution = prompt('Resolution details?') || '';
      await apiCall(`/api/admin/claims/${id}`, 'PUT', { status: 'resolved', resolution });
      await loadAllData();
      showToast('Claim resolved', 'success');
      return rerenderRoleContent();
    }
    case 'claim-reject': {
      const resolution = prompt('Rejection reason?') || '';
      await apiCall(`/api/admin/claims/${id}`, 'PUT', { status: 'rejected', resolution });
      await loadAllData();
      showToast('Claim rejected', 'warning');
      return rerenderRoleContent();
    }
    case 'ticket-view': return openTicketModal(id);
    case 'ticket-resolve':
      await apiCall(`/api/admin/tickets/${id}`, 'PUT', { status: 'resolved' });
      return loadAllData().then(() => {
        showToast('Ticket resolved', 'success');
        rerenderRoleContent();
      });
    case 'review-publish':
      await apiCall(`/api/admin/reviews/${id}`, 'PUT', { status: 'published' });
      return loadAllData().then(() => rerenderRoleContent());
    case 'review-hide':
      await apiCall(`/api/admin/reviews/${id}`, 'PUT', { status: 'hidden' });
      return loadAllData().then(() => rerenderRoleContent());

    /* ---------- Broadcast ---------- */
    case 'send-broadcast': {
      const title = $('#broadcastTitle').value;
      const message = $('#broadcastMessage').value;
      const audience = $('#broadcastAudience').value;
      if (!title || !message) return showToast('Fill title and message', 'error');
      showLoading(true);
      const d = await apiCall('/api/admin/notifications/broadcast', 'POST', { title, message, audience });
      showLoading(false);
      return showToast(`Broadcast sent to ${d.sent} users`, 'success');
    }

    /* ---------- Admin - Settings ---------- */
    case 'save-settings': {
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
      return showToast('Settings saved', 'success');
    }

    /* ---------- Learner actions ---------- */
    case 'enroll-modal': return openEnrollModal(id);
    case 'update-progress': return openProgressModal(id, Number(el.dataset.current || 0));
    case 'new-consultation': return openNewConsultationModal();
    case 'book-expert':      return openBookingModal(id, el.dataset.name);
    case 'file-claim':       return openClaimModal(id);
    case 'new-ticket':       return openNewTicketModal();
    case 'view-expert-profile': return openExpertProfileModal(Number(id));
    case 'toggle-wishlist': {
      try {
        await apiCall('/api/user/wishlist/toggle', 'POST', { course_id: Number(id) });
        const d = await apiCall('/api/user/wishlist');
        S.wishlist = d.items || [];
        rerenderRoleContent();
        showToast('Wishlist updated', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }
    case 'register-event':
      await apiCall(`/api/common/events/${id}/register`, 'POST');
      await loadAllData();
      showToast('Registered for event', 'success');
      return rerenderRoleContent();
    case 'topup-wallet': {
      const amount = Number($('#topupAmount').value || 0);
      const provider = $('#topupProvider').value;
      if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error');
      showLoading(true);
      await apiCall('/api/user/wallet/topup', 'POST', { amount, provider });
      await reloadWallet();
      showLoading(false);
      showToast('Funds added', 'success');
      return rerenderRoleContent();
    }
    case 'change-intent': {
      openModal({
        title: 'Choose your mode',
        body: `
          <p class="form-hint">This controls what appears on your dashboard. You can change it anytime.</p>
          <label class="form-group"><span class="form-label">Mode</span>
            <select id="intentSel" class="form-select">
              <option value="both"    ${S.userIntent === 'both' ? 'selected' : ''}>Both - Learning and Consulting</option>
              <option value="learn"   ${S.userIntent === 'learn' ? 'selected' : ''}>Learning only</option>
              <option value="consult" ${S.userIntent === 'consult' ? 'selected' : ''}>Consulting only</option>
            </select></label>`,
        footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
                 <button id="intentSave" class="btn btn-primary">Save</button>`,
      });
      $('#intentSave').onclick = async () => {
        S.userIntent = $('#intentSel').value;
        try { await apiCall('/api/user/preferences', 'PUT', { intent: S.userIntent }); } catch (_) {}
        closeModal();
        rerenderRoleContent();
        showToast('Mode updated', 'success');
      };
      return;
    }
    case 'review-expert': return openReviewModal(id, Number(el.dataset.expert));
    case 'print-certificate': {
      const c = S.certificates.find(x => String(x.id) === id);
      if (!c) return;
      openModal({
        title: 'Certificate',
        body: `
          <div style="text-align:center;padding:20px;border:3px double var(--brand);border-radius:12px">
            <h2>Certificate of Completion</h2>
            <p style="font-size:1.1rem;margin:20px 0">This certifies that</p>
            <h3 style="font-size:1.5rem;color:var(--brand)">${esc(currentUser?.name || '')}</h3>
            <p style="margin:20px 0">has successfully completed</p>
            <h4>${esc(c.course_title || '')}</h4>
            <p style="margin-top:20px;font-size:.85rem;color:var(--text-muted)">
              Serial: ${esc(c.serial)} - Issued: ${fmtDate(c.issued_at)}
            </p>
          </div>`,
        footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
                 <button class="btn btn-primary" onclick="window.print()">
                   <i class="fas fa-print"></i> Print</button>`,
      });
      return;
    }

    /* ---------- Expert actions ---------- */
    case 'open-chat': return openChat(Number(id));
    case 'video-call': return openVideoCall(id);
    case 'open-video': return openVideoCall(currentChatId);
    case 'save-availability': {
      const schedule = [];
      for (let i = 0; i < 7; i++) {
        const s = document.getElementById(`start-${i}`)?.value;
        const en = document.getElementById(`end-${i}`)?.value;
        if (s && en) schedule.push({ day: i, start: s, end: en });
      }
      await apiCall('/api/expert/availability', 'PUT', { schedule });
      return showToast('Availability saved', 'success');
    }
    case 'request-time-off': {
      const s = $('#timeOffStart').value;
      const en = $('#timeOffEnd').value;
      const r = $('#timeOffReason').value;
      if (!s || !en) return showToast('Select dates', 'error');
      await apiCall('/api/expert/time-off', 'POST', { start_date: s, end_date: en, reason: r });
      await loadAllData();
      showToast('Time off requested', 'success');
      return rerenderRoleContent();
    }
    case 'request-withdrawal': {
      const amount = Number($('#withdrawAmount').value || 0);
      const method = $('#withdrawMethod').value;
      if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error');
      showLoading(true);
      await apiCall('/api/expert/withdrawals', 'POST', { amount, method });
      await loadAllData();
      showLoading(false);
      showToast('Withdrawal requested', 'success');
      return rerenderRoleContent();
    }
    case 'reply-review': {
      const reply = prompt('Your reply:') || '';
      if (!reply.trim()) return;
      await apiCall(`/api/expert/reviews/${id}/reply`, 'POST', { reply });
      await loadAllData();
      showToast('Reply posted', 'success');
      return rerenderRoleContent();
    }
    case 'update-expert-profile': {
      await apiCall('/api/expert/profile', 'PUT', {
        specialization: $('#profileSpecialization').value,
        hourly_rate: Number($('#profileRate').value || 0),
        bio: $('#profileBio').value,
      });
      await apiCall('/api/auth/me');
      return showToast('Profile updated', 'success');
    }
    case 'view-public-profile':
      return showToast(`Public profile: /#/expert/${currentUser?.id || 'me'}`, 'info');
    case 'add-portfolio-item':   return openPortfolioItemModal();
    case 'edit-portfolio-item':  return openPortfolioItemModal(Number(id));
    case 'delete-portfolio-item': {
      if (!await confirmDialog('Delete this portfolio item?')) return;
      try {
        await apiCall(`/api/expert/portfolio/${id}`, 'DELETE');
        await loadAllData();
        rerenderRoleContent();
        showToast('Item deleted', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }
    case 'edit-course':  return showToast('Edit course opened in demo', 'info');
    case 'view-course-analytics': return showToast('Analytics opened in demo', 'info');
    case 'create-course-modal': {
      openModal({
        title: 'New Course',
        body: `
          <label class="form-group"><span class="form-label">Title</span>
            <input id="ccTitle" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Description</span>
            <textarea id="ccDesc" class="form-textarea" rows="3"></textarea></label>
          <label class="form-group">
            <span class="form-label">Type</span>
            <select id="ccType" class="form-select">
              <option value="short_course">Short course</option>
              <option value="bootcamp">Bootcamp</option>
              <option value="tuition">Tuition</option>
              <option value="exam_prep">Exam prep</option>
              <option value="career">Career</option>
            </select>
          </label>
          <label class="form-group">
            <span class="form-label">Level</span>
            <select id="ccLevel" class="form-select">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label class="form-group"><span class="form-label">Price ($)</span>
            <input id="ccPrice" type="number" class="form-input" /></label>`,
        footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
                 <button id="ccSave" class="btn btn-primary">Create</button>`,
      });
      $('#ccSave').onclick = async () => {
        try {
          await apiCall('/api/expert/courses', 'POST', {
            title: $('#ccTitle').value,
            description: $('#ccDesc').value,
            course_type: $('#ccType').value,
            level: $('#ccLevel').value,
            price: Number($('#ccPrice').value || 0),
          });
          closeModal();
          await loadAllData();
          rerenderRoleContent();
          showToast('Course created', 'success');
        } catch (e) { showToast(e.message, 'error'); }
      };
      return;
    }

    /* ---------- Institution - Programmes ---------- */
    case 'create-programme':     return openProgrammeModal();
    case 'edit-programme':       return openProgrammeModal(Number(id));
    case 'view-programme':       return openProgrammeViewModal(Number(id));
    case 'programme-curriculum': return openCurriculumModal(Number(id));
    case 'delete-programme': {
      if (!await confirmDialog('Delete this programme? All enrolments will be removed.')) return;
      try {
        await apiCall(`/api/institution/programmes/${id}`, 'DELETE');
        await loadAllData();
        rerenderRoleContent();
        showToast('Programme deleted', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }

    /* ---------- Institution - Learning Paths ---------- */
    case 'create-learning-path': return openLearningPathModal();
    case 'edit-learning-path':   return openLearningPathModal(Number(id));
    case 'view-learning-path':   return showToast('Learning path viewer coming soon', 'info');
    case 'delete-learning-path': {
      if (!await confirmDialog('Delete this learning path?')) return;
      try {
        await apiCall(`/api/institution/learning-paths/${id}`, 'DELETE');
        await loadAllData();
        rerenderRoleContent();
        showToast('Learning path deleted', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }

    /* ---------- Institution - Cohorts ---------- */
    case 'create-cohort':   return openCohortModal();
    case 'edit-cohort':     return openCohortModal(Number(id));
    case 'view-cohort':     return openCohortViewModal(Number(id));
    case 'cohort-waitlist': return openCohortWaitlistModal(Number(id));
    case 'delete-cohort': {
      if (!await confirmDialog('Delete this cohort? Sessions and attendance will also be removed.')) return;
      try {
        await apiCall(`/api/institution/cohorts/${id}`, 'DELETE');
        await loadAllData();
        rerenderRoleContent();
        showToast('Cohort deleted', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }

    /* ---------- Institution - Sessions ---------- */
    case 'schedule-session': return openSessionModal();
    case 'edit-session':     return openSessionModal(Number(id));
    case 'mark-attendance':  return openAttendanceModal(Number(id));
    case 'view-calendar':    return openSessionsCalendarModal();
    case 'delete-session': {
      if (!await confirmDialog('Delete this session? Attendance records will be removed.')) return;
      try {
        await apiCall(`/api/institution/sessions/${id}`, 'DELETE');
        await loadAllData();
        rerenderRoleContent();
        showToast('Session deleted', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }

    /* ---------- Institution - Materials ---------- */
    case 'upload-material': {
      const title = $('#matTitle').value;
      const fileInput = $('#matFile');
      const file = fileInput && fileInput.files[0];
      if (!file) return showToast('Select a file to upload', 'error');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title || file.name);
      fd.append('cohort_id', $('#matCohort').value || '');
      try {
        showLoading(true);
        await apiCall('/api/institution/materials', 'POST', fd, true);
        await loadAllData();
        rerenderRoleContent();
        showToast('Material uploaded', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      finally { showLoading(false); }
      return;
    }
    case 'delete-material': {
      if (!await confirmDialog('Delete this material?')) return;
      try {
        await apiCall(`/api/institution/materials/${id}`, 'DELETE');
        await loadAllData();
        rerenderRoleContent();
        showToast('Material deleted', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }

    /* ---------- Institution - Assessments ---------- */
    case 'schedule-assessment': return openAssessmentModal();
    case 'grade-assessment':    return openGradingModal(Number(id));
    case 'view-assessment':     return showToast('Assessment detail opened in demo', 'info');
    case 'delete-assessment': {
      if (!await confirmDialog('Delete this assessment? All submissions will be removed.')) return;
      try {
        await apiCall(`/api/institution/assessments/${id}`, 'DELETE');
        await loadAllData();
        rerenderRoleContent();
        showToast('Assessment deleted', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }

    /* ---------- Institution - Question Bank ---------- */
    case 'create-question': return openQuestionModal();
    case 'edit-question':   return openQuestionModal(Number(id));
    case 'delete-question': {
      if (!await confirmDialog('Delete this question?')) return;
      try {
        await apiCall(`/api/institution/question-bank/${id}`, 'DELETE');
        await loadAllData();
        rerenderRoleContent();
        showToast('Question deleted', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }

    /* ---------- Institution - Projects ---------- */
    case 'create-project': return openProjectModal();
    case 'edit-project':   return openProjectModal(Number(id));
    case 'view-project':   return showToast('Project detail opened in demo', 'info');
    case 'grade-project':  return showToast('Project grading opened in demo', 'info');

    /* ---------- Institution - Trainees ---------- */
    case 'import-trainees-history': return openImportHistoryModal();
    case 'invite-trainee':          return openTraineeImportModal();
    case 'trainee-detail':          return openTraineeDetailModal(Number(id));
    case 'trainee-notes':           return openTraineeNotesModal(Number(id));
    case 'trainee-transfer':        return openTraineeTransferModal(Number(id));
    case 'approve-enrolment':
      try {
        await apiCall(`/api/institution/enrollments/${id}/approve`, 'PUT');
        await loadAllData();
        showToast('Enrolment approved', 'success');
        return rerenderRoleContent();
      } catch (e) { return showToast(e.message, 'error'); }
    case 'reject-enrolment': {
      const reason = prompt('Reason for rejection?') || '';
      try {
        await apiCall(`/api/institution/enrollments/${id}/reject`, 'PUT', { reason });
        await loadAllData();
        showToast('Enrolment rejected', 'warning');
        return rerenderRoleContent();
      } catch (e) { return showToast(e.message, 'error'); }
    }
    case 'export-trainees': {
      const rows = (S.institutionEnrollments.length ? S.institutionEnrollments : S.trainees).map(t => ({
        name: t.trainee_name || t.name || '',
        email: t.email || '',
        department: t.department || '',
        programme: t.programme_title || '',
        cohort: t.cohort_name || '',
        status: t.status || t.lifecycle_status || '',
        progress: t.progress || 0,
      }));
      return downloadCsv('trainees.csv', rows);
    }

    /* ---------- Institution - Certifications ---------- */
    case 'issue-certificate':   return openIssueCertificateModal();
    case 'export-certificates': {
      const rows = (S.institutionCertificates || []).map(c => ({
        serial: c.serial,
        trainee: c.trainee_name,
        programme: c.programme_title,
        issued: c.issued_at,
        expires: c.expires_at || 'Never',
        cpd_points: c.cpd_points || 0,
        status: c.revoked
          ? 'revoked'
          : (c.expires_at && new Date(c.expires_at) < new Date() ? 'expired' : 'valid'),
      }));
      return downloadCsv('certificates.csv', rows);
    }
    case 'revoke-certificate': {
      const reason = prompt('Reason for revocation?') || '';
      try {
        await apiCall(`/api/institution/certificates/${id}/revoke`, 'PUT', { reason });
        await loadAllData();
        rerenderRoleContent();
        showToast('Certificate revoked', 'warning');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }
    case 'renew-certificate': {
      const months = Number(prompt('Validity in months?', '12') || 12);
      try {
        await apiCall(`/api/institution/certificates/${id}/renew`, 'PUT', { valid_months: months });
        await loadAllData();
        rerenderRoleContent();
        showToast('Certificate renewed', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }

    /* ---------- Institution - Skills ---------- */
    case 'manage-skills': return openManageSkillsModal();
    case 'export-skills-matrix': {
      const m = S.institutionSkillsMatrix || { skills: [], matrix: [] };
      const rows = m.matrix.map(row => {
        const out = { trainee: row.trainee.name, department: row.trainee.department || '' };
        m.skills.forEach(s => { out[s.name] = row.levels[s.id] || 0; });
        return out;
      });
      if (!rows.length) return showToast('No data to export', 'warning');
      return downloadCsv('skills-matrix.csv', rows);
    }

    /* ---------- Institution - Compliance ---------- */
    case 'create-compliance-rule': return openComplianceRuleModal();
    case 'export-compliance-report': {
      const rows = (S.institutionCertificates || []).map(c => ({
        trainee: c.trainee_name,
        serial: c.serial,
        issued: c.issued_at,
        expires: c.expires_at || 'Never',
        revoked: c.revoked ? 'Yes' : 'No',
      }));
      return downloadCsv('compliance-report.csv', rows);
    }

    /* ---------- Institution - Instructors ---------- */
    case 'assign-instructor': return openAssignInstructorModal();
    case 'view-instructor':   return showToast('Instructor profile opened in demo', 'info');

    /* ---------- Institution - Reports ---------- */
    case 'report-programme-scorecard': return openReportPreviewModal('programme-scorecard');
    case 'report-cohort-comparison':   return openReportPreviewModal('cohort-comparison');
    case 'report-trainee-progress':    return openReportPreviewModal('trainee-progress');
    case 'report-compliance':          return openReportPreviewModal('compliance');
    case 'report-cost':                return openReportPreviewModal('cost');
    case 'schedule-report':            return openScheduleReportModal();
    case 'run-report-template':        return showToast('Report template running', 'info');
    case 'export-institution-report': {
      const rows = (S.trainees || []).map(t => ({
        name: t.name,
        email: t.email,
        department: t.department || '',
        programme: t.programme_title || '',
        cohort: t.cohort_name || '',
        status: t.lifecycle_status || '',
        progress: t.progress || 0,
      }));
      if (!rows.length) return showToast('No data to export', 'warning');
      return downloadCsv('institution-report.csv', rows);
    }

    /* ---------- Institution - Org Structure ---------- */
    case 'create-org-unit': return openOrgUnitModal();
    case 'edit-org-unit':   return openOrgUnitModal(Number(id));
    case 'delete-org-unit': {
      if (!await confirmDialog('Delete this organisational unit?')) return;
      try {
        await apiCall(`/api/institution/org-units/${id}`, 'DELETE');
        await loadAllData();
        rerenderRoleContent();
        showToast('Unit deleted', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }

    /* ---------- Institution - Operations ---------- */
    case 'save-institution-settings': {
      try {
        await apiCall('/api/institution/settings', 'PUT', {
          name: $('#instSetName').value,
          contact_email: $('#instSetEmail').value,
          default_capacity: Number($('#instSetCap').value),
          pass_mark: Number($('#instSetPass').value),
          seat_allocation: Number(($('#instSetSeats') || {}).value || 0),
          billing_cycle: ($('#instSetBilling') || {}).value || 'monthly',
          contract_start: ($('#instSetContractStart') || {}).value || null,
          contract_end: ($('#instSetContractEnd') || {}).value || null,
        });
        showToast('Settings saved', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }
    case 'invite-team-member':       return openInviteTeamMemberModal();
    case 'change-team-role':         return openChangeTeamRoleModal(Number(id));
    case 'manage-team-permissions':  return openTeamPermissionsModal(Number(id));
    case 'remove-team-member': {
      if (!await confirmDialog('Remove this team member?')) return;
      try {
        await apiCall(`/api/institution/team/${id}`, 'DELETE');
        await loadAllData();
        rerenderRoleContent();
        showToast('Team member removed', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }
    case 'approve-request':
      try {
        await apiCall(`/api/institution/approvals/${id}`, 'PUT', { status: 'approved' });
        await loadAllData();
        rerenderRoleContent();
        showToast('Request approved', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    case 'reject-request': {
      const notes = prompt('Rejection notes?') || '';
      try {
        await apiCall(`/api/institution/approvals/${id}`, 'PUT', { status: 'rejected', decision_notes: notes });
        await loadAllData();
        rerenderRoleContent();
        showToast('Request rejected', 'warning');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    }
    case 'save-webhook':
      try {
        await apiCall('/api/institution/webhook', 'PUT', {
          webhook_url: $('#webhookUrl').value || null,
          webhook_secret: $('#webhookSecret').value || null,
        });
        showToast('Webhook saved', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;
    case 'test-webhook':
      try {
        showLoading(true);
        const d = await apiCall('/api/institution/webhook/test', 'POST');
        showToast(`Test delivered with status ${d.status}`, 'success');
      } catch (e) { showToast(e.message, 'error'); }
      finally { showLoading(false); }
      return;

    /* ---------- Institution - Branding ---------- */
    case 'save-branding': {
      const fd = new FormData();
      const logoInput = $('#brandLogo');
      if (logoInput && logoInput.files[0]) fd.append('logo', logoInput.files[0]);
      fd.append('primary_color', $('#brandPrimary').value || '');
      fd.append('accent_color', $('#brandAccent').value || '');
      fd.append('subdomain', $('#brandSubdomain').value || '');
      fd.append('email_sender_name', $('#brandEmailName').value || '');
      fd.append('email_sender_address', $('#brandEmailAddr').value || '');
      fd.append('welcome_message', $('#brandWelcome').value || '');
      try {
        showLoading(true);
        await apiCall('/api/institution/branding', 'PUT', fd, true);
        await loadAllData();
        if ($('#brandPrimary').value) {
          document.documentElement.style.setProperty('--brand', $('#brandPrimary').value);
        }
        if ($('#brandAccent').value) {
          document.documentElement.style.setProperty('--accent', $('#brandAccent').value);
        }
        rerenderRoleContent();
        showToast('Branding saved', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      finally { showLoading(false); }
      return;
    }

    /* ---------- Institution - Profile ---------- */
    case 'update-institution-profile':
      try {
        await apiCall('/api/institution/profile', 'PUT', {
          name: $('#instProfileName').value,
          type: $('#instProfileType').value,
          industry: $('#instProfileIndustry').value,
          contact_phone: $('#instProfilePhone').value,
          address: $('#instProfileAddress').value,
        });
        await loadAllData();
        rerenderRoleContent();
        showToast('Institution profile updated', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      return;

    /* ---------- Profile generic ---------- */
    case 'update-user-profile': {
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
      return showToast('Profile updated', 'success');
    }
    case 'change-password': {
      const oldp = $('#cpOld').value;
      const newp = $('#cpNew').value;
      if (!oldp || newp.length < 8) return showToast('New password must be 8 or more characters', 'error');
      await apiCall('/api/auth/password', 'PUT', { old_password: oldp, new_password: newp });
      $('#cpOld').value = '';
      $('#cpNew').value = '';
      return showToast('Password updated', 'success');
    }
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
function showConsultationModal(id) {
  const c = S.consultations.find(x => String(x.id) === id);
  if (!c) return;
  openModal({
    title: c.title || 'Consultation',
    body: `
      <p><strong>Client:</strong> ${esc(c.client_name || '-')}</p>
      <p><strong>Expert:</strong> ${esc(c.expert_name || 'Unassigned')}</p>
      <p><strong>Status:</strong> <span class="${statusClass(c.status)}">${esc(c.status)}</span></p>
      <p><strong>Type:</strong> ${esc(c.consultation_type || '')}</p>
      <p><strong>Priority:</strong> ${esc(c.priority || '')}</p>
      <p><strong>Description:</strong> ${esc(c.description || '')}</p>
      <p><strong>Created:</strong> ${fmtDT(c.created_at)}</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

function openEventModal(id = null) {
  const ev = id ? S.events.find(x => String(x.id) === id) : {};
  const expertOpts = S.experts.map(e =>
    `<option value="${e.id}" ${ev.expert_id === e.id ? 'selected' : ''}>${esc(e.name)}</option>`
  ).join('');
  openModal({
    title: id ? 'Edit Event' : 'New Event',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="evTitle" class="form-input" value="${esc(ev.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="evDesc" class="form-textarea" rows="3">${esc(ev.description || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Category</span>
        <input id="evCat" class="form-input" value="${esc(ev.category || 'General')}" /></label>
      <label class="form-group">
        <span class="form-label">Expert</span>
        <select id="evExpert" class="form-select">
          <option value="">None</option>${expertOpts}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Date</span>
        <input id="evDate" type="date" class="form-input"
               value="${ev.date ? new Date(ev.date).toISOString().slice(0,10) : ''}" /></label>
      <label class="form-group"><span class="form-label">Capacity</span>
        <input id="evCap" type="number" class="form-input" value="${ev.capacity || 100}" /></label>
      <label class="form-group"><span class="form-label">Price ($)</span>
        <input id="evPrice" type="number" class="form-input" value="${ev.price || 0}" /></label>
      <label class="form-group"><span class="form-label">Expert payment ($)</span>
        <input id="evPay" type="number" class="form-input" value="${ev.expert_payment || 0}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="evSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  $('#evSave').onclick = async () => {
    const payload = {
      title: $('#evTitle').value,
      description: $('#evDesc').value,
      category: $('#evCat').value,
      expert_id: $('#evExpert').value ? Number($('#evExpert').value) : null,
      date: $('#evDate').value || null,
      capacity: Number($('#evCap').value || 100),
      price: Number($('#evPrice').value || 0),
      expert_payment: Number($('#evPay').value || 0),
    };
    try {
      if (id) await apiCall(`/api/admin/events/${id}`, 'PUT', payload);
      else     await apiCall('/api/admin/events', 'POST', payload);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(id ? 'Event updated' : 'Event created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openEnrollModal(courseId) {
  const c = S.courses.find(x => String(x.id) === courseId);
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
    try {
      showLoading(true);
      const d = await apiCall('/api/eschool/enroll', 'POST', {
        course_id: Number(courseId),
        coupon_code: $('#enCoupon').value || undefined,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(`Enrolled. Paid ${fmtCur(d.paid)} (discount ${fmtCur(d.discount)})`, 'success', 6000);
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}

function openProgressModal(enrollmentId, current) {
  openModal({
    title: 'Update Progress',
    body: `
      <label class="form-group"><span class="form-label">Progress (%)</span>
        <input id="pgVal" type="number" min="0" max="100" class="form-input" value="${current}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="pgSave" class="btn btn-primary">Save</button>`,
  });
  $('#pgSave').onclick = async () => {
    const p = Math.max(0, Math.min(100, Number($('#pgVal').value || 0)));
    try {
      await apiCall(`/api/user/enrollments/${enrollmentId}/progress`, 'PUT', { progress: p });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Progress updated', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openNewConsultationModal() {
  const expertOpts = S.experts.map(e =>
    `<option value="${e.id}">${esc(e.name)} (${esc(e.specialization || '')})</option>`
  ).join('');
  openModal({
    title: 'Request Consultation',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="ncTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Expert (optional)</span>
        <select id="ncExpert" class="form-select">
          <option value="">Any available expert</option>${expertOpts}
        </select></label>
      <label class="form-group">
        <span class="form-label">Type</span>
        <select id="ncType" class="form-select">
          <option value="career">Career</option>
          <option value="academic">Academic</option>
          <option value="business">Business</option>
          <option value="technical">Technical</option>
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Priority</span>
        <select id="ncPriority" class="form-select">
          <option value="low">Low</option>
          <option value="normal" selected>Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="ncDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ncSave" class="btn btn-primary">Submit</button>`,
  });
  $('#ncSave').onclick = async () => {
    const title = $('#ncTitle').value;
    const description = $('#ncDesc').value;
    if (!title || !description) return showToast('Fill all fields', 'error');
    try {
      await apiCall('/api/user/consultations', 'POST', {
        title, description,
        consultation_type: $('#ncType').value,
        priority: $('#ncPriority').value,
        expert_id: $('#ncExpert').value ? Number($('#ncExpert').value) : null,
      });
      closeModal();
      await reloadConsultations();
      rerenderRoleContent();
      showToast('Consultation requested', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openBookingModal(expertId, expertName) {
  openModal({
    title: `Book ${esc(expertName)}`,
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="bkTitle" class="form-input" /></label>
      <label class="form-group">
        <span class="form-label">Type</span>
        <select id="bkType" class="form-select">
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="chat">Chat</option>
        </select>
      </label>
      <label class="form-group"><span class="form-label">Describe your issue</span>
        <textarea id="bkDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="bkSave" class="btn btn-primary">Book</button>`,
  });
  $('#bkSave').onclick = async () => {
    const title = $('#bkTitle').value;
    const description = $('#bkDesc').value;
    if (!title || !description) return showToast('Fill all fields', 'error');
    try {
      await apiCall('/api/user/consultations', 'POST', {
        title, description,
        consultation_type: $('#bkType').value,
        expert_id: Number(expertId),
      });
      closeModal();
      await reloadConsultations();
      rerenderRoleContent();
      showToast('Consultation booked', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openExpertProfileModal(expertId) {
  const e = S.experts.find(x => Number(x.id) === expertId) || {};
  openModal({
    title: e.name || 'Expert Profile',
    body: `
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(e)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(e.name || '')}</h2>
          <p class="profile-email">${esc(e.email || '')}</p>
        </div>
      </div>
      <p><strong>Specialization:</strong> ${esc(e.specialization || '-')}</p>
      <p><strong>Hourly rate:</strong> ${fmtCur(e.hourly_rate || 0)}</p>
      <p><strong>Rating:</strong> ${Number(e.average_rating || 0).toFixed(1)} / 5</p>
      <p><strong>Bio:</strong> ${esc(e.bio || 'No bio provided')}</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button class="btn btn-primary" data-action="book-expert"
                     data-id="${expertId}" data-name="${esc(e.name || '')}"
                     onclick="closeModal()">Book Consultation</button>`,
  });
}

function openClaimModal(consultationId) {
  openModal({
    title: 'File a Claim',
    body: `
      <label class="form-group"><span class="form-label">Claim title</span>
        <input id="clTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="clDesc" class="form-textarea" rows="4"></textarea></label>
      <label class="form-group"><span class="form-label">Amount (optional)</span>
        <input id="clAmount" type="number" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="clSave" class="btn btn-primary">Submit Claim</button>`,
  });
  $('#clSave').onclick = async () => {
    const claim_title = $('#clTitle').value;
    const claim_description = $('#clDesc').value;
    if (!claim_title || !claim_description) return showToast('Fill all fields', 'error');
    try {
      await apiCall('/api/user/claims', 'POST', {
        consultation_id: Number(consultationId) || null,
        claim_title, claim_description,
        claim_amount: $('#clAmount').value ? Number($('#clAmount').value) : null,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Claim filed', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openNewTicketModal() {
  openModal({
    title: 'New Support Ticket',
    body: `
      <label class="form-group"><span class="form-label">Subject</span>
        <input id="tkSubject" class="form-input" /></label>
      <label class="form-group">
        <span class="form-label">Priority</span>
        <select id="tkPriority" class="form-select">
          <option value="low">Low</option>
          <option value="normal" selected>Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Category</span>
        <select id="tkCat" class="form-select">
          <option value="general">General</option>
          <option value="billing">Billing</option>
          <option value="technical">Technical</option>
          <option value="account">Account</option>
        </select>
      </label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="tkDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tkSave" class="btn btn-primary">Create Ticket</button>`,
  });
  $('#tkSave').onclick = async () => {
    const subject = $('#tkSubject').value;
    const description = $('#tkDesc').value;
    if (!subject || !description) return showToast('Fill all fields', 'error');
    try {
      const d = await apiCall('/api/user/tickets', 'POST', {
        subject, description,
        priority: $('#tkPriority').value,
        category: $('#tkCat').value,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(`Ticket created: ${d.reference}`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

async function openTicketModal(id) {
  try {
    const d = await apiCall('/api/user/tickets');
    const t = (d.tickets || []).find(x => String(x.id) === id) || S.tickets.find(x => String(x.id) === id);
    if (!t) return;
    openModal({
      title: `Ticket ${esc(t.reference || '')}`,
      body: `
        <p><strong>Subject:</strong> ${esc(t.subject || '')}</p>
        <p><strong>Description:</strong> ${esc(t.description || '')}</p>
        <p><strong>Status:</strong> <span class="${statusClass(t.status)}">${esc(t.status)}</span></p>
        <label class="form-group"><span class="form-label">Add reply</span>
          <textarea id="tkReply" class="form-textarea" rows="3"></textarea></label>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
               <button id="tkReplySave" class="btn btn-primary">Send Reply</button>`,
    });
    $('#tkReplySave').onclick = async () => {
      const message = $('#tkReply').value;
      if (!message) return;
      await apiCall(`/api/user/tickets/${id}/replies`, 'POST', { message });
      closeModal();
      showToast('Reply sent', 'success');
    };
  } catch (e) { showToast(e.message, 'error'); }
}

function openReviewModal(consultationId, expertId) {
  openModal({
    title: 'Rate Expert',
    body: `
      <label class="form-group">
        <span class="form-label">Rating</span>
        <select id="rvRating" class="form-select">
          ${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${n} of 5</option>`).join('')}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Comment</span>
        <textarea id="rvComment" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rvSave" class="btn btn-primary">Submit</button>`,
  });
  $('#rvSave').onclick = async () => {
    try {
      await apiCall('/api/user/reviews', 'POST', {
        expert_id: expertId,
        consultation_id: Number(consultationId),
        rating: Number($('#rvRating').value),
        comment: $('#rvComment').value,
      });
      closeModal();
      showToast('Review submitted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openVideoCall(consultationId) {
  if (!consultationId) return showToast('No consultation selected', 'error');
  const room = `experthub-${consultationId}-${uid()}`;
  openModal({
    title: 'Video Call',
    className: 'chat-modal',
    body: `
      <div class="chat-video-wrap">
        <iframe src="https://meet.jit.si/${room}"
                allow="camera;microphone;fullscreen;display-capture"
                style="width:100%;height:100%;border:0" title="Video call"></iframe>
      </div>
      <p class="form-hint">
        Room ID: <code class="code">${room}</code>.
        Share this with the other party if they cannot join.
      </p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>End call</button>`,
  });
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
        <input id="piLink" class="form-input" value="${esc(item.link || '')}" placeholder="https://" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="piSave" class="btn btn-primary">${itemId ? 'Save' : 'Add'}</button>`,
  });
  $('#piSave').onclick = async () => {
    try {
      await apiCall('/api/expert/portfolio', 'POST', {
        title: $('#piTitle').value,
        category: $('#piCat').value,
        description: $('#piDesc').value,
        link: $('#piLink').value,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Portfolio item saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openInstitutionModal(id = null) {
  const i = id ? S.institutions.find(x => x.id === id) : {};
  openModal({
    title: id ? 'Edit Institution' : 'New Institution',
    body: `
      <label class="form-group"><span class="form-label">Institution name</span>
        <input id="instName" class="form-input" value="${esc(i.name || '')}" /></label>
      <label class="form-group">
        <span class="form-label">Type</span>
        <select id="instType" class="form-select">
          ${CONFIG.INSTITUTION_TYPES.map(t =>
            `<option value="${t}" ${i.type === t ? 'selected' : ''}>${t}</option>`
          ).join('')}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Industry</span>
        <input id="instIndustry" class="form-input" value="${esc(i.industry || '')}" /></label>
      <label class="form-group"><span class="form-label">Contact email</span>
        <input id="instEmail" type="email" class="form-input" value="${esc(i.contact_email || '')}" /></label>
      <label class="form-group"><span class="form-label">Contact phone</span>
        <input id="instPhone" class="form-input" value="${esc(i.contact_phone || '')}" /></label>
      <label class="form-group"><span class="form-label">Address</span>
        <input id="instAddress" class="form-input" value="${esc(i.address || '')}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="instSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  $('#instSave').onclick = async () => {
    const payload = {
      name: $('#instName').value,
      type: $('#instType').value,
      industry: $('#instIndustry').value,
      contact_email: $('#instEmail').value,
      contact_phone: $('#instPhone').value,
      address: $('#instAddress').value,
    };
    if (id) await apiCall(`/api/admin/institutions/${id}`, 'PUT', payload);
    else    await apiCall('/api/admin/institutions', 'POST', payload);
    closeModal();
    await reloadInstitutions();
    rerenderRoleContent();
    showToast(id ? 'Institution updated' : 'Institution created', 'success');
  };
}

function openProgrammeModal(id = null) {
  const p = id ? S.programmes.find(x => x.id === id) : {};
  openModal({
    title: id ? 'Edit Programme' : 'New Programme',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="prTitle" class="form-input" value="${esc(p.title || '')}" required /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="prDesc" class="form-textarea" rows="3">${esc(p.description || '')}</textarea></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Category</span>
          <input id="prCat" class="form-input" value="${esc(p.category || '')}" /></label>
        <label class="form-group">
          <span class="form-label">Delivery mode</span>
          <select id="prDelivery" class="form-select">
            ${CONFIG.DELIVERY_MODES.map(m => `
              <option value="${m}" ${p.delivery_mode === m ? 'selected' : ''}>${m.replace('_', ' ')}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Level</span>
          <select id="prLevel" class="form-select">
            ${['beginner', 'intermediate', 'advanced'].map(l => `
              <option value="${l}" ${p.level === l ? 'selected' : ''}>${l}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Status</span>
          <select id="prStatus" class="form-select">
            ${CONFIG.PROGRAMME_STATUSES.map(s => `
              <option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group"><span class="form-label">Start date</span>
          <input id="prStart" type="date" class="form-input"
                 value="${p.start_date ? new Date(p.start_date).toISOString().slice(0,10) : ''}" /></label>
        <label class="form-group"><span class="form-label">End date</span>
          <input id="prEnd" type="date" class="form-input"
                 value="${p.end_date ? new Date(p.end_date).toISOString().slice(0,10) : ''}" /></label>
        <label class="form-group"><span class="form-label">Capacity</span>
          <input id="prCap" type="number" class="form-input" value="${p.capacity || 30}" /></label>
        <label class="form-group"><span class="form-label">Duration in hours</span>
          <input id="prDuration" type="number" class="form-input" value="${p.duration_hours || 0}" /></label>
      </div>
      <h4 class="panel-title" style="margin-top:16px">Cost Tracking</h4>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Cost per seat</span>
          <input id="prCostSeat" type="number" class="form-input" value="${p.cost_per_seat || 0}" /></label>
        <label class="form-group"><span class="form-label">Trainer cost</span>
          <input id="prTrainerCost" type="number" class="form-input" value="${p.trainer_cost || 0}" /></label>
        <label class="form-group"><span class="form-label">Materials cost</span>
          <input id="prMaterialsCost" type="number" class="form-input" value="${p.materials_cost || 0}" /></label>
      </div>
      <h4 class="panel-title" style="margin-top:16px">Compliance and Prerequisites</h4>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Awarding body</span>
          <input id="prAwarding" class="form-input" value="${esc(p.accreditation_body || '')}" /></label>
        <label class="form-group"><span class="form-label">CPD points</span>
          <input id="prCpd" type="number" class="form-input" value="${p.cpd_points || 0}" step="0.5" /></label>
        <label class="form-group form-group-full">
          <span class="form-label">Prerequisite programme</span>
          <select id="prPrereq" class="form-select">
            <option value="">None</option>
            ${S.programmes
              .filter(x => x.id !== id)
              .map(x => `<option value="${x.id}" ${p.prerequisite_programme_id === x.id ? 'selected' : ''}>${esc(x.title)}</option>`)
              .join('')}
          </select>
        </label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="prSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  $('#prSave').onclick = async () => {
    const payload = {
      title: $('#prTitle').value,
      description: $('#prDesc').value || null,
      category: $('#prCat').value || null,
      delivery_mode: $('#prDelivery').value,
      level: $('#prLevel').value,
      status: $('#prStatus').value,
      start_date: $('#prStart').value || null,
      end_date: $('#prEnd').value || null,
      capacity: Number($('#prCap').value || 30),
      duration_hours: Number($('#prDuration').value || 0),
      cost_per_seat: Number($('#prCostSeat').value || 0),
      trainer_cost: Number($('#prTrainerCost').value || 0),
      materials_cost: Number($('#prMaterialsCost').value || 0),
      accreditation_body: $('#prAwarding').value || null,
      cpd_points: Number($('#prCpd').value || 0),
      prerequisite_programme_id: $('#prPrereq').value ? Number($('#prPrereq').value) : null,
    };
    if (!payload.title) return showToast('Title is required', 'error');
    try {
      showLoading(true);
      if (id) await apiCall(`/api/institution/programmes/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/programmes', 'POST', payload);
      closeModal();
      await reloadInstitutionProgrammes();
      rerenderRoleContent();
      showToast(id ? 'Programme updated' : 'Programme created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}

async function openCurriculumModal(programmeId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/programmes/${programmeId}/modules`);
    const p = S.programmes.find(x => x.id === programmeId) || {};

    openModal({
      title: `Curriculum - ${esc(p.title || '')}`,
      className: 'modal-lg',
      body: `
        <div class="panel" style="background:var(--surface-2)">
          <h4 class="panel-title">Add Module</h4>
          <div class="form-grid">
            <label class="form-group"><span class="form-label">Module title</span>
              <input id="cmTitle" class="form-input" /></label>
            <label class="form-group"><span class="form-label">Duration in hours</span>
              <input id="cmDuration" type="number" class="form-input" value="2" /></label>
            <label class="form-group form-group-full"><span class="form-label">Description</span>
              <textarea id="cmDesc" class="form-textarea" rows="2"></textarea></label>
          </div>
          <div class="panel-actions">
            <button class="btn btn-primary" id="cmAdd">Add Module</button>
          </div>
        </div>

        <h4 class="panel-title" style="margin-top:16px">Modules (${(d.modules || []).length})</h4>
        <ul class="list-stack">
          ${(d.modules || []).map(m => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">
                  <span class="chip chip-neutral">${m.position}</span>
                  ${esc(m.title)}
                </span>
                <span class="list-row-sub">
                  ${m.duration_hours}h - ${esc((m.description || '').slice(0, 80))}
                </span>
              </div>
              <button class="btn btn-danger btn-xs" data-remove-module="${m.id}">Remove</button>
            </li>
          `).join('') || '<li class="empty-row">No modules yet</li>'}
        </ul>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });

    $('#cmAdd').onclick = async () => {
      const title = $('#cmTitle').value;
      if (!title) return showToast('Module title is required', 'error');
      try {
        await apiCall(`/api/institution/programmes/${programmeId}/modules`, 'POST', {
          title,
          description: $('#cmDesc').value || null,
          duration_hours: Number($('#cmDuration').value || 0),
        });
        closeModal();
        openCurriculumModal(programmeId);
      } catch (e) { showToast(e.message, 'error'); }
    };

    document.querySelectorAll('[data-remove-module]').forEach(b => {
      b.onclick = async () => {
        if (!await confirmDialog('Remove this module?')) return;
        try {
          await apiCall(`/api/institution/programmes/${programmeId}/modules/${b.dataset.removeModule}`, 'DELETE');
          closeModal();
          openCurriculumModal(programmeId);
        } catch (e) { showToast(e.message, 'error'); }
      };
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function openProgrammeViewModal(programmeId) {
  const p = S.programmes.find(x => x.id === programmeId);
  if (!p) return;
  openModal({
    title: p.title,
    body: `
      <p><strong>Category:</strong> ${esc(p.category || '-')}</p>
      <p><strong>Status:</strong> <span class="${statusClass(p.status)}">${esc(p.status)}</span></p>
      <p><strong>Delivery mode:</strong> ${esc((p.delivery_mode || '').replace('_', ' '))}</p>
      <p><strong>Dates:</strong> ${fmtDate(p.start_date)} to ${fmtDate(p.end_date)}</p>
      <p><strong>Capacity:</strong> ${p.enrolled_count || 0} of ${p.capacity || 0}</p>
      <p><strong>Duration:</strong> ${p.duration_hours || 0} hours</p>
      <p><strong>Cost per seat:</strong> ${fmtCur(p.cost_per_seat || 0)}</p>
      <p><strong>Trainer cost:</strong> ${fmtCur(p.trainer_cost || 0)}</p>
      <p><strong>Materials cost:</strong> ${fmtCur(p.materials_cost || 0)}</p>
      ${p.accreditation_body ? `<p><strong>Awarding body:</strong> ${esc(p.accreditation_body)}</p>` : ''}
      ${p.cpd_points ? `<p><strong>CPD points:</strong> ${p.cpd_points}</p>` : ''}
      <p><strong>Description:</strong></p>
      <p>${esc(p.description || '-')}</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

function openLearningPathModal(pathId) {
  const lp = pathId ? (S.institutionLearningPaths.find(x => x.id === pathId) || {}) : {};
  openModal({
    title: pathId ? 'Edit Learning Path' : 'New Learning Path',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="lpTitle" class="form-input" value="${esc(lp.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="lpDesc" class="form-textarea" rows="3">${esc(lp.description || '')}</textarea></label>
      <label class="checkbox-row">
        <input type="checkbox" id="lpActive" ${lp.active === undefined || lp.active ? 'checked' : ''} />
        Active
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="lpSave" class="btn btn-primary">${pathId ? 'Save' : 'Create'}</button>`,
  });
  $('#lpSave').onclick = async () => {
    const title = $('#lpTitle').value;
    if (!title) return showToast('Title is required', 'error');
    try {
      await apiCall('/api/institution/learning-paths', 'POST', {
        title,
        description: $('#lpDesc').value || null,
        active: $('#lpActive').checked,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Learning path saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openCohortModal(id = null) {
  const c = id ? S.cohorts.find(x => x.id === id) : {};
  openModal({
    title: id ? 'Edit Cohort' : 'New Cohort',
    body: `
      <label class="form-group"><span class="form-label">Cohort name</span>
        <input id="chName" class="form-input" value="${esc(c.name || '')}" /></label>
      <label class="form-group">
        <span class="form-label">Programme</span>
        <select id="chProg" class="form-select">
          ${S.programmes.map(p => `
            <option value="${p.id}" ${c.programme_id === p.id ? 'selected' : ''}>${esc(p.title)}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Instructor</span>
        <select id="chInstr" class="form-select">
          <option value="">Unassigned</option>
          ${S.instructors.map(i => `
            <option value="${i.id}" ${c.instructor_id === i.id ? 'selected' : ''}>${esc(i.name)}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Substitute instructor</span>
        <select id="chSubInstr" class="form-select">
          <option value="">None</option>
          ${S.instructors.map(i => `
            <option value="${i.id}" ${c.substitute_instructor_id === i.id ? 'selected' : ''}>${esc(i.name)}</option>
          `).join('')}
        </select>
      </label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Start date</span>
          <input id="chStart" type="date" class="form-input"
                 value="${c.start_date ? new Date(c.start_date).toISOString().slice(0,10) : ''}" /></label>
        <label class="form-group"><span class="form-label">End date</span>
          <input id="chEnd" type="date" class="form-input"
                 value="${c.end_date ? new Date(c.end_date).toISOString().slice(0,10) : ''}" /></label>
      </div>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Capacity</span>
          <input id="chCap" type="number" class="form-input" value="${c.capacity || 30}" /></label>
        <label class="form-group"><span class="form-label">Location</span>
          <input id="chLocation" class="form-input" value="${esc(c.location || '')}" /></label>
      </div>
      <label class="form-group">
        <span class="form-label">Status</span>
        <select id="chStatus" class="form-select">
          ${['scheduled', 'active', 'completed', 'cancelled'].map(s => `
            <option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>
          `).join('')}
        </select>
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="chSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  $('#chSave').onclick = async () => {
    const payload = {
      name: $('#chName').value,
      programme_id: Number($('#chProg').value),
      instructor_id: $('#chInstr').value ? Number($('#chInstr').value) : null,
      substitute_instructor_id: $('#chSubInstr').value ? Number($('#chSubInstr').value) : null,
      start_date: $('#chStart').value || null,
      end_date: $('#chEnd').value || null,
      capacity: Number($('#chCap').value || 30),
      location: $('#chLocation').value || null,
      status: $('#chStatus').value,
    };
    if (!payload.name) return showToast('Name is required', 'error');
    try {
      showLoading(true);
      if (id) await apiCall(`/api/institution/cohorts/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/cohorts', 'POST', payload);
      closeModal();
      await reloadInstitutionCohorts();
      rerenderRoleContent();
      showToast(id ? 'Cohort updated' : 'Cohort created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}

function openCohortViewModal(cohortId) {
  const c = S.cohorts.find(x => x.id === cohortId);
  if (!c) return;
  openModal({
    title: c.name,
    body: `
      <p><strong>Programme:</strong> ${esc(c.programme_title || '-')}</p>
      <p><strong>Instructor:</strong> ${esc(c.instructor_name || 'Unassigned')}</p>
      <p><strong>Dates:</strong> ${fmtDate(c.start_date)} to ${fmtDate(c.end_date)}</p>
      <p><strong>Capacity:</strong> ${c.trainee_count || 0} of ${c.capacity || 0}</p>
      <p><strong>Location:</strong> ${esc(c.location || '-')}</p>
      <p><strong>Status:</strong> <span class="${statusClass(c.status)}">${esc(c.status)}</span></p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

async function openCohortWaitlistModal(cohortId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/cohorts/${cohortId}/waitlist`);
    const c = S.cohorts.find(x => x.id === cohortId) || {};
    openModal({
      title: `Waitlist - ${esc(c.name || '')}`,
      body: `
        <p class="form-hint">When a seat opens, promote the next trainee in the queue.</p>
        <ul class="list-stack" style="margin-top:12px">
          ${(d.waitlist || []).map(w => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">
                  <span class="chip chip-neutral">#${w.position}</span>
                  ${esc(w.name)}
                </span>
                <span class="list-row-sub">${esc(w.email)}</span>
              </div>
              <button class="btn btn-success btn-xs" data-promote-wait="${w.user_id}">Promote</button>
            </li>
          `).join('') || '<li class="empty-row">Waitlist is empty</li>'}
        </ul>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
    document.querySelectorAll('[data-promote-wait]').forEach(b => {
      b.onclick = async () => {
        try {
          await apiCall('/api/institution/enrollments', 'POST', {
            user_id: Number(b.dataset.promoteWait),
            programme_id: c.programme_id,
            cohort_id: c.id,
          });
          closeModal();
          await loadAllData();
          rerenderRoleContent();
          showToast('Trainee promoted', 'success');
        } catch (e) { showToast(e.message, 'error'); }
      };
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function openSessionModal(sessionId) {
  const s = sessionId ? (S.institutionSessions.find(x => x.id === sessionId) || {}) : {};
  const toLocal = d => {
    if (!d) return '';
    const dt = new Date(d);
    const off = dt.getTimezoneOffset();
    return new Date(dt.getTime() - off * 60000).toISOString().slice(0, 16);
  };

  openModal({
    title: sessionId ? 'Edit Session' : 'Schedule Session',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="ssTitle" class="form-input" value="${esc(s.title || '')}" required /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="ssDesc" class="form-textarea" rows="3">${esc(s.description || '')}</textarea></label>
      <label class="form-group">
        <span class="form-label">Cohort</span>
        <select id="ssCohort" class="form-select">
          <option value="">Select cohort</option>
          ${S.cohorts.map(c => `
            <option value="${c.id}" ${s.cohort_id === c.id ? 'selected' : ''}>
              ${esc(c.name)} - ${esc(c.programme_title || '')}
            </option>
          `).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Instructor</span>
        <select id="ssInstructor" class="form-select">
          <option value="">Unassigned</option>
          ${S.instructors.map(i => `
            <option value="${i.id}" ${s.instructor_id === i.id ? 'selected' : ''}>${esc(i.name)}</option>
          `).join('')}
        </select>
      </label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Scheduled at</span>
          <input id="ssWhen" type="datetime-local" class="form-input"
                 value="${toLocal(s.scheduled_at)}" required /></label>
        <label class="form-group"><span class="form-label">Duration in minutes</span>
          <input id="ssDuration" type="number" class="form-input"
                 value="${s.duration_minutes || 60}" min="15" /></label>
      </div>
      <label class="form-group">
        <span class="form-label">Mode</span>
        <select id="ssMode" class="form-select">
          ${CONFIG.SESSION_MODES.map(m => `
            <option value="${m}" ${s.mode === m ? 'selected' : ''}>${m.replace('_', ' ')}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Location (for in-person)</span>
        <input id="ssLocation" class="form-input" value="${esc(s.location || '')}" /></label>
      <label class="form-group"><span class="form-label">Meeting URL (for online)</span>
        <input id="ssUrl" class="form-input" value="${esc(s.meeting_url || '')}" placeholder="https://" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ssSave" class="btn btn-primary">${sessionId ? 'Save Changes' : 'Schedule'}</button>`,
  });
  $('#ssSave').onclick = async () => {
    const title = $('#ssTitle').value;
    const scheduled_at = $('#ssWhen').value;
    const cohort_id = Number($('#ssCohort').value);
    if (!title || !scheduled_at || !cohort_id) {
      return showToast('Title, cohort, and date are required', 'error');
    }
    const payload = {
      title,
      description: $('#ssDesc').value || null,
      cohort_id,
      instructor_id: $('#ssInstructor').value ? Number($('#ssInstructor').value) : null,
      scheduled_at: new Date(scheduled_at).toISOString().slice(0, 19).replace('T', ' '),
      duration_minutes: Number($('#ssDuration').value || 60),
      mode: $('#ssMode').value,
      location: $('#ssLocation').value || null,
      meeting_url: $('#ssUrl').value || null,
    };
    try {
      showLoading(true);
      if (sessionId) await apiCall(`/api/institution/sessions/${sessionId}`, 'PUT', payload);
      else           await apiCall('/api/institution/sessions', 'POST', payload);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(sessionId ? 'Session updated' : 'Session scheduled', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}

async function openAttendanceModal(sessionId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/sessions/${sessionId}/attendance`);
    openModal({
      title: `Mark Attendance - ${esc(d.session.title)}`,
      className: 'modal-lg',
      body: `
        <p class="form-hint" style="margin-bottom:12px">
          Scheduled ${fmtDT(d.session.scheduled_at)}. Mark each trainee and add an excuse note where applicable.
        </p>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Trainee</th><th style="min-width:140px">Status</th><th>Excuse reason</th></tr>
            </thead>
            <tbody>
              ${d.trainees.map(t => `
                <tr data-att-trainee="${t.id}">
                  <td>
                    <div class="user-cell">
                      <img class="user-avatar" src="${avatar(t)}" alt="" />
                      <div>
                        <div class="user-name">${esc(t.name)}</div>
                        <div class="user-email">${esc(t.email)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select class="form-select att-status">
                      ${CONFIG.ATTENDANCE_STATUSES.map(s => `
                        <option value="${s}" ${t.status === s ? 'selected' : ''}>${s}</option>
                      `).join('')}
                    </select>
                  </td>
                  <td>
                    <input class="form-input att-reason" placeholder="Optional"
                           value="${esc(t.excuse_reason || '')}" />
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="3" class="empty-row">No trainees enrolled in this cohort</td></tr>'}
            </tbody>
          </table>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
               <button id="attSave" class="btn btn-primary">Save Attendance</button>`,
    });
    $('#attSave').onclick = async () => {
      const rows = Array.from(document.querySelectorAll('[data-att-trainee]'));
      const records = rows.map(el => ({
        trainee_id: Number(el.dataset.attTrainee),
        status: el.querySelector('.att-status').value,
        excuse_reason: el.querySelector('.att-reason').value || null,
      }));
      try {
        showLoading(true);
        await apiCall(`/api/institution/sessions/${sessionId}/attendance`, 'PUT', { records });
        closeModal();
        await loadAllData();
        rerenderRoleContent();
        showToast('Attendance saved', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      finally { showLoading(false); }
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function openSessionsCalendarModal() {
  const sessions = S.institutionSessions || [];
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
  sessions.forEach(s => {
    const dt = new Date(s.scheduled_at);
    if (dt.getMonth() === month && dt.getFullYear() === year) {
      const k = dt.getDate();
      (byDay[k] = byDay[k] || []).push(s);
    }
  });

  openModal({
    title: 'Session Calendar',
    className: 'modal-lg',
    body: `
      <h3 class="panel-title">${today.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
      <div class="calendar-header">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<span>${d}</span>`).join('')}
      </div>
      <div class="calendar-grid">
        ${cells.map(c => {
          const isToday = c.date && c.date.toDateString() === today.toDateString();
          const evs = c.day ? (byDay[c.day] || []) : [];
          return `
            <div class="calendar-cell ${c.other ? 'other-month' : ''} ${isToday ? 'today' : ''}">
              <div class="calendar-day-num">${c.day || ''}</div>
              ${evs.slice(0, 3).map(e => `
                <div class="calendar-event" title="${esc(e.title)}">
                  ${new Date(e.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ${esc(e.title)}
                </div>
              `).join('')}
            </div>`;
        }).join('')}
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

function openAssessmentModal() {
  openModal({
    title: 'Schedule Assessment',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="asTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="asDesc" class="form-textarea" rows="2"></textarea></label>
      <label class="form-group">
        <span class="form-label">Cohort</span>
        <select id="asCohort" class="form-select">
          ${S.cohorts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option>No cohorts</option>'}
        </select>
      </label>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Type</span>
          <select id="asType" class="form-select">
            ${CONFIG.ASSESSMENT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </label>
        <label class="form-group"><span class="form-label">Weight (%)</span>
          <input id="asWeight" type="number" class="form-input" value="20" /></label>
        <label class="form-group"><span class="form-label">Pass mark (%)</span>
          <input id="asPass" type="number" class="form-input" value="70" /></label>
        <label class="form-group"><span class="form-label">Max attempts</span>
          <input id="asAttempts" type="number" class="form-input" value="1" /></label>
        <label class="form-group"><span class="form-label">Time limit in minutes</span>
          <input id="asTime" type="number" class="form-input" value="0" /></label>
        <label class="form-group"><span class="form-label">Due date</span>
          <input id="asDue" type="datetime-local" class="form-input" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="asSave" class="btn btn-primary">Schedule</button>`,
  });
  $('#asSave').onclick = async () => {
    await apiCall('/api/institution/assessments', 'POST', {
      title: $('#asTitle').value,
      description: $('#asDesc').value || null,
      cohort_id: Number($('#asCohort').value),
      type: $('#asType').value,
      weight: Number($('#asWeight').value || 0),
      pass_mark: Number($('#asPass').value || 70),
      max_attempts: Number($('#asAttempts').value || 1),
      time_limit_minutes: Number($('#asTime').value || 0),
      due_date: $('#asDue').value || null,
    });
    closeModal();
    await loadAllData();
    rerenderRoleContent();
    showToast('Assessment scheduled', 'success');
  };
}

async function openGradingModal(assessmentId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/assessments/${assessmentId}/submissions`);
    openModal({
      title: 'Grade Submissions',
      className: 'modal-lg',
      body: `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Trainee</th><th>Submitted</th><th>Score</th><th>Passed</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${(d.submissions || []).map(s => `
                <tr>
                  <td>${esc(s.trainee_name)}</td>
                  <td>${fmtDT(s.submitted_at)}</td>
                  <td>${s.score != null ? s.score : '-'}</td>
                  <td>${s.passed === 1
                    ? '<span class="status-active">Yes</span>'
                    : s.passed === 0
                    ? '<span class="status-rejected">No</span>'
                    : '-'}</td>
                  <td>
                    <button class="btn btn-info btn-xs" data-grade-sub="${s.id}"
                            data-score="${s.score || ''}">Grade</button>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="empty-row">No submissions yet</td></tr>'}
            </tbody>
          </table>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
    document.querySelectorAll('[data-grade-sub]').forEach(b => {
      b.onclick = async () => {
        const score = prompt('Enter score:', b.dataset.score || '');
        if (score === null) return;
        const feedback = prompt('Feedback (optional):') || '';
        try {
          await apiCall(`/api/institution/assessments/submissions/${b.dataset.gradeSub}/grade`, 'PUT', {
            score: Number(score),
            feedback,
            passed: Number(score) >= 70,
          });
          closeModal();
          openGradingModal(assessmentId);
          showToast('Submission graded', 'success');
        } catch (e) { showToast(e.message, 'error'); }
      };
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function openQuestionModal(questionId) {
  const q = questionId ? (S.institutionQuestions.find(x => x.id === questionId) || {}) : {};
  let options = [];
  try { options = q.options ? JSON.parse(q.options) : []; } catch (_) {}

  openModal({
    title: questionId ? 'Edit Question' : 'New Question',
    className: 'modal-lg',
    body: `
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Category</span>
          <input id="qCat" class="form-input" value="${esc(q.category || '')}" /></label>
        <label class="form-group">
          <span class="form-label">Difficulty</span>
          <select id="qDiff" class="form-select">
            ${['easy', 'medium', 'hard'].map(d => `
              <option value="${d}" ${q.difficulty === d ? 'selected' : ''}>${d}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Type</span>
          <select id="qType" class="form-select">
            ${['mcq', 'true_false', 'short_answer', 'essay', 'file_upload'].map(t => `
              <option value="${t}" ${q.question_type === t ? 'selected' : ''}>${t.replace('_', ' ')}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group"><span class="form-label">Points</span>
          <input id="qPoints" type="number" class="form-input" value="${q.points || 1}" /></label>
      </div>
      <label class="form-group"><span class="form-label">Question</span>
        <textarea id="qText" class="form-textarea" rows="3" required>${esc(q.question_text || '')}</textarea></label>
      <div id="qOptionsBlock">
        <label class="form-label">Answer options (one per line)</label>
        <textarea id="qOptions" class="form-textarea" rows="4">${options.map(o => esc(o)).join('\n')}</textarea>
      </div>
      <label class="form-group"><span class="form-label">Correct answer</span>
        <input id="qCorrect" class="form-input" value="${esc(q.correct_answer || '')}" /></label>
      <label class="form-group"><span class="form-label">Explanation</span>
        <textarea id="qExplanation" class="form-textarea" rows="2">${esc(q.explanation || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Tags (comma separated)</span>
        <input id="qTags" class="form-input" value="${esc(q.tags || '')}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="qSave" class="btn btn-primary">${questionId ? 'Save' : 'Create'}</button>`,
  });
  $('#qSave').onclick = async () => {
    const optionsRaw = $('#qOptions').value;
    const payload = {
      question_text: $('#qText').value,
      question_type: $('#qType').value,
      difficulty: $('#qDiff').value,
      category: $('#qCat').value || null,
      points: Number($('#qPoints').value || 1),
      options: optionsRaw ? optionsRaw.split('\n').map(s => s.trim()).filter(Boolean) : null,
      correct_answer: $('#qCorrect').value || null,
      explanation: $('#qExplanation').value || null,
      tags: $('#qTags').value || null,
    };
    if (!payload.question_text) return showToast('Question text is required', 'error');
    try {
      await apiCall('/api/institution/question-bank', 'POST', payload);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Question saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openProjectModal() {
  openModal({
    title: 'New Project',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="pjTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="pjDesc" class="form-textarea" rows="3"></textarea></label>
      <label class="form-group">
        <span class="form-label">Cohort</span>
        <select id="pjCohort" class="form-select">
          ${S.cohorts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option>No cohorts</option>'}
        </select>
      </label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Category</span>
          <input id="pjCat" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Max score</span>
          <input id="pjMaxScore" type="number" class="form-input" value="100" /></label>
      </div>
      <label class="form-group"><span class="form-label">Deadline</span>
        <input id="pjDeadline" type="datetime-local" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="pjSave" class="btn btn-primary">Create</button>`,
  });
  $('#pjSave').onclick = async () => {
    await apiCall('/api/institution/projects', 'POST', {
      title: $('#pjTitle').value,
      description: $('#pjDesc').value,
      cohort_id: Number($('#pjCohort').value),
      category: $('#pjCat').value || null,
      max_score: Number($('#pjMaxScore').value || 100),
      deadline: $('#pjDeadline').value || null,
    });
    closeModal();
    await loadAllData();
    rerenderRoleContent();
    showToast('Project created', 'success');
  };
}

async function openImportHistoryModal() {
  try {
    showLoading(true);
    const d = await apiCall('/api/institution/trainees/imports');
    openModal({
      title: 'Import History',
      className: 'modal-lg',
      body: `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th><th>File</th><th>By</th>
                <th>Total</th><th>Success</th><th>Errors</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${(d.imports || []).map(i => `
                <tr>
                  <td>${fmtDT(i.created_at)}</td>
                  <td>${esc(i.filename || '-')}</td>
                  <td>${esc(i.imported_by_name || '-')}</td>
                  <td>${i.total_rows}</td>
                  <td><span class="status status-active">${i.success_count}</span></td>
                  <td>${i.error_count ? `<span class="status status-rejected">${i.error_count}</span>` : '0'}</td>
                  <td><span class="${statusClass(i.status)}">${esc(i.status)}</span></td>
                </tr>
              `).join('') || '<tr><td colspan="7" class="empty-row">No imports yet</td></tr>'}
            </tbody>
          </table>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function openTraineeImportModal() {
  openModal({
    title: 'Import Trainees',
    className: 'modal-lg',
    body: `
      <nav class="tab-bar" style="margin-bottom:16px">
        <button class="tab-btn tab-btn-active" data-import-mode="csv">CSV Upload</button>
        <button class="tab-btn" data-import-mode="single">Single Entry</button>
      </nav>
      <div id="import-csv-pane">
        <div class="drop-zone" id="csv-drop">
          <i class="fas fa-cloud-upload-alt"></i>
          <p><strong>Drop CSV file here</strong> or click to browse</p>
          <p class="form-hint" style="margin-top:8px">
            Required columns: <code class="code">name</code>, <code class="code">email</code><br>
            Optional: <code class="code">department</code>, <code class="code">job_title</code>,
            <code class="code">employee_id</code>, <code class="code">cost_centre</code>
          </p>
          <input type="file" id="csv-file" accept=".csv" hidden />
        </div>
        <div style="display:flex;gap:10px;margin-top:12px">
          <button class="btn btn-secondary btn-sm" id="download-template">
            <i class="fas fa-download"></i> Download Template</button>
        </div>
        <div id="import-result" style="margin-top:16px"></div>
      </div>
      <div id="import-single-pane" class="hidden">
        <label class="form-group"><span class="form-label">Full name</span>
          <input id="invName" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Email</span>
          <input id="invEmail" type="email" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Department</span>
          <input id="invDept" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Job title</span>
          <input id="invJobTitle" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Employee ID</span>
          <input id="invEmployeeId" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Cost centre</span>
          <input id="invCostCentre" class="form-input" /></label>
        <label class="form-group">
          <span class="form-label">Assign to programme</span>
          <select id="invProgramme" class="form-select">
            <option value="">None</option>
            ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
          </select>
        </label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button id="import-confirm" class="btn btn-primary" style="display:none">Import</button>`,
  });

  let mode = 'csv';
  $$('[data-import-mode]').forEach(b => {
    b.onclick = () => {
      mode = b.dataset.importMode;
      $$('[data-import-mode]').forEach(x => x.classList.remove('tab-btn-active'));
      b.classList.add('tab-btn-active');
      $('#import-csv-pane').classList.toggle('hidden', mode !== 'csv');
      $('#import-single-pane').classList.toggle('hidden', mode !== 'single');
      $('#import-confirm').style.display = mode === 'single' ? '' : 'none';
    };
  });

  const drop = $('#csv-drop');
  drop.onclick = () => $('#csv-file').click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('drop-zone-active'); };
  drop.ondragleave = () => drop.classList.remove('drop-zone-active');
  drop.ondrop = e => {
    e.preventDefault();
    drop.classList.remove('drop-zone-active');
    if (e.dataTransfer.files[0]) uploadCsv(e.dataTransfer.files[0]);
  };
  $('#csv-file').onchange = e => { if (e.target.files[0]) uploadCsv(e.target.files[0]); };

  $('#download-template').onclick = () => {
    const csv = 'name,email,department,job_title,employee_id,cost_centre\nJane Doe,jane@acme.com,Engineering,Senior Developer,EMP001,CC-ENG\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'trainee-import-template.csv';
    a.click();
  };

  async function uploadCsv(file) {
    const fd = new FormData();
    fd.append('file', file);
    try {
      showLoading(true);
      const d = await apiCall('/api/institution/trainees/import', 'POST', fd, true);
      $('#import-result').innerHTML = `
        <div class="alert alert-success">
          <i class="fas fa-check-circle"></i>
          <div>
            <strong>${d.success} of ${d.total}</strong> trainees imported.
            ${d.errors.length ? `<br><small>${d.errors.length} rows failed</small>` : ''}
          </div>
        </div>
        ${d.errors.length ? `
          <details style="margin-top:10px">
            <summary style="cursor:pointer;font-size:.85rem">View errors</summary>
            <ul class="list-stack" style="margin-top:8px">
              ${d.errors.slice(0, 25).map(e => `
                <li class="list-row">
                  <div class="list-row-main">
                    <span class="list-row-title">Row ${e.row}</span>
                    <span class="list-row-sub">${esc(e.error)}${e.email ? ' - ' + esc(e.email) : ''}</span>
                  </div>
                </li>
              `).join('')}
            </ul>
          </details>
        ` : ''}`;
      await loadAllData();
      rerenderRoleContent();
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  }

  $('#import-confirm').onclick = async () => {
    if (mode !== 'single') return;
    const payload = {
      emails: [$('#invEmail').value.trim()],
      programme_id: $('#invProgramme').value ? Number($('#invProgramme').value) : undefined,
      name: $('#invName').value.trim(),
      department: $('#invDept').value.trim(),
      job_title: $('#invJobTitle').value.trim(),
      employee_id: $('#invEmployeeId').value.trim(),
      cost_centre: $('#invCostCentre').value.trim(),
    };
    if (!payload.emails[0]) return showToast('Email is required', 'error');
    try {
      showLoading(true);
      await apiCall('/api/institution/trainees/invite', 'POST', payload);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Trainee invited', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}

async function openTraineeDetailModal(traineeId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/trainees/${traineeId}`);
    const t = d.trainee || {};
    const enrollments = d.enrollments || [];
    const certs = d.certificates || [];
    const skills = d.skills || [];

    openModal({
      title: 'Trainee Profile',
      className: 'modal-lg',
      body: `
        <div class="profile-header">
          <img class="profile-avatar" src="${avatar(t)}" alt="" />
          <div>
            <h2 class="profile-name">
              ${esc(t.name || '')}
              ${t.at_risk ? '<span class="chip chip-red" style="margin-left:8px">At Risk</span>' : ''}
            </h2>
            <p class="profile-email">${esc(t.email || '')}</p>
            <p style="margin-top:6px">
              <span class="${statusClass(t.lifecycle_status || 'active')}">
                ${esc((t.lifecycle_status || '').replace('_', ' '))}
              </span>
            </p>
          </div>
        </div>
        <div class="form-grid" style="margin-top:20px">
          <div><p class="form-label">Department</p><p>${esc(t.department || '-')}</p></div>
          <div><p class="form-label">Job Title</p><p>${esc(t.job_title || '-')}</p></div>
          <div><p class="form-label">Employee ID</p><p>${esc(t.employee_id || '-')}</p></div>
          <div><p class="form-label">Cost Centre</p><p>${esc(t.cost_centre || '-')}</p></div>
          <div><p class="form-label">Phone</p><p>${esc(t.phone || '-')}</p></div>
          <div><p class="form-label">Joined</p><p>${fmtDate(t.created_at)}</p></div>
        </div>
        ${t.accessibility_notes ? `
          <div class="alert alert-info" style="margin-top:16px">
            <i class="fas fa-info-circle"></i>
            <div><strong>Accessibility notes:</strong> ${esc(t.accessibility_notes)}</div>
          </div>
        ` : ''}
        <h3 class="panel-title" style="margin-top:24px">Enrolments</h3>
        ${enrollments.length ? `
          <ul class="list-stack">
            ${enrollments.map(e => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(e.programme_title || '-')}</span>
                  <span class="list-row-sub">${esc(e.cohort_name || 'No cohort')} - ${e.progress || 0}% complete</span>
                </div>
                <span class="${statusClass(e.status)}">${esc(e.status)}</span>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-row">No enrolments</p>'}
        <h3 class="panel-title" style="margin-top:24px">Certificates</h3>
        ${certs.length ? `
          <ul class="list-stack">
            ${certs.map(c => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(c.title)}</span>
                  <span class="list-row-sub">${esc(c.serial)} - Issued ${fmtDate(c.issued_at)}</span>
                </div>
                <div style="display:flex;gap:6px">
                  <a class="btn btn-secondary btn-xs" href="/verify/${esc(c.serial)}" target="_blank">Verify</a>
                  <a class="btn btn-secondary btn-xs" href="/api/institution/certificates/${c.id}/pdf" target="_blank">PDF</a>
                </div>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-row">No certificates</p>'}
        <h3 class="panel-title" style="margin-top:24px">Skills</h3>
        ${skills.length ? `
          <ul class="list-stack">
            ${skills.map(s => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(s.skill_name || '')}</span>
                  <span class="list-row-sub">${esc(s.category || '')}</span>
                </div>
                <span class="chip chip-neutral">Level ${s.level}</span>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-row">No skill assessments recorded</p>'}`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function openTraineeNotesModal(traineeId) {
  const t = S.trainees.find(x => String(x.id) === String(traineeId)) || {};
  openModal({
    title: 'Trainee Notes',
    body: `
      <label class="checkbox-row" style="margin-bottom:14px">
        <input type="checkbox" id="tnAtRisk" ${t.at_risk ? 'checked' : ''} />
        Flag as at-risk trainee
      </label>
      <label class="form-group"><span class="form-label">Accessibility and support notes</span>
        <textarea id="tnAccessibility" class="form-textarea" rows="3"
                  placeholder="e.g. requires extra time on assessments">${esc(t.accessibility_notes || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Internal notes</span>
        <textarea id="tnInternal" class="form-textarea" rows="4"
                  placeholder="Internal observations, follow-up actions">${esc(t.internal_notes || '')}</textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tnSave" class="btn btn-primary">Save</button>`,
  });
  $('#tnSave').onclick = async () => {
    try {
      const enrollmentId = t.latest_enrollment_id || t.id;
      await apiCall(`/api/institution/enrollments/${enrollmentId}/notes`, 'PUT', {
        at_risk: $('#tnAtRisk').checked,
        accessibility_notes: $('#tnAccessibility').value,
        internal_notes: $('#tnInternal').value,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Notes saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openTraineeTransferModal(enrollmentId) {
  openModal({
    title: 'Transfer Trainee',
    body: `
      <p class="form-hint">Move this trainee to a different cohort. Progress is preserved.</p>
      <label class="form-group">
        <span class="form-label">Target cohort</span>
        <select id="ttCohort" class="form-select">
          <option value="">Select a cohort</option>
          ${S.cohorts.map(c => `
            <option value="${c.id}">${esc(c.name)} - ${esc(c.programme_title || '')}</option>
          `).join('')}
        </select>
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ttSave" class="btn btn-primary">Transfer</button>`,
  });
  $('#ttSave').onclick = async () => {
    const cohortId = $('#ttCohort').value;
    if (!cohortId) return showToast('Select a cohort', 'error');
    try {
      await apiCall(`/api/institution/enrollments/${enrollmentId}/transfer`, 'PUT', {
        cohort_id: Number(cohortId),
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Trainee transferred', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openIssueCertificateModal() {
  openModal({
    title: 'Issue Certificate',
    body: `
      <label class="form-group">
        <span class="form-label">Trainee</span>
        <select id="icTrainee" class="form-select">
          <option value="">Select trainee</option>
          ${S.trainees.map(t => `
            <option value="${t.id}">${esc(t.name)} - ${esc(t.email)}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Programme</span>
        <select id="icProgramme" class="form-select">
          <option value="">Select programme</option>
          ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select>
      </label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Awarding body (optional)</span>
          <input id="icBody" class="form-input" placeholder="e.g. Chartered Institute" /></label>
        <label class="form-group"><span class="form-label">Grade (optional)</span>
          <input id="icGrade" class="form-input" placeholder="e.g. Distinction" /></label>
        <label class="form-group"><span class="form-label">CPD points</span>
          <input id="icCpd" type="number" class="form-input" value="0" min="0" step="0.5" /></label>
        <label class="form-group"><span class="form-label">Validity in months</span>
          <input id="icMonths" type="number" class="form-input" placeholder="Leave blank for no expiry" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="icSave" class="btn btn-primary">Issue Certificate</button>`,
  });
  $('#icSave').onclick = async () => {
    const trainee_id = Number($('#icTrainee').value);
    const programme_id = Number($('#icProgramme').value);
    if (!trainee_id || !programme_id) {
      return showToast('Select trainee and programme', 'error');
    }
    try {
      showLoading(true);
      const d = await apiCall('/api/institution/certificates/issue', 'POST', {
        trainee_id,
        programme_id,
        awarding_body: $('#icBody').value || null,
        grade: $('#icGrade').value || null,
        cpd_points: Number($('#icCpd').value || 0),
        valid_months: $('#icMonths').value ? Number($('#icMonths').value) : null,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(`Certificate issued: ${d.serial}`, 'success', 8000);
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}

function openManageSkillsModal() {
  const skills = S.institutionSkills || [];
  openModal({
    title: 'Manage Skills',
    className: 'modal-lg',
    body: `
      <div class="panel" style="background:var(--surface-2)">
        <h4 class="panel-title">Add New Skill</h4>
        <div class="form-grid">
          <label class="form-group"><span class="form-label">Name</span>
            <input id="newSkillName" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Category</span>
            <input id="newSkillCat" class="form-input" placeholder="e.g. Technical, Leadership" /></label>
          <label class="form-group form-group-full"><span class="form-label">Description</span>
            <input id="newSkillDesc" class="form-input" /></label>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" id="addSkillBtn">Add Skill</button>
        </div>
      </div>
      <h4 class="panel-title" style="margin-top:16px">Existing Skills (${skills.length})</h4>
      <ul class="list-stack">
        ${skills.map(s => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(s.name)}</span>
              <span class="list-row-sub">${esc(s.category || 'Uncategorised')}${s.description ? ' - ' + esc(s.description) : ''}</span>
            </div>
            <button class="btn btn-danger btn-xs" data-remove-skill="${s.id}">Remove</button>
          </li>
        `).join('') || '<li class="empty-row">No skills defined yet</li>'}
      </ul>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });

  $('#addSkillBtn').onclick = async () => {
    const name = $('#newSkillName').value;
    if (!name) return showToast('Skill name is required', 'error');
    try {
      await apiCall('/api/institution/skills', 'POST', {
        name,
        category: $('#newSkillCat').value || null,
        description: $('#newSkillDesc').value || null,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Skill added', 'success');
      openManageSkillsModal();
    } catch (e) { showToast(e.message, 'error'); }
  };

  document.querySelectorAll('[data-remove-skill]').forEach(b => {
    b.onclick = async () => {
      if (!await confirmDialog('Remove this skill and all associated assessments?')) return;
      try {
        await apiCall(`/api/institution/skills/${b.dataset.removeSkill}`, 'DELETE');
        closeModal();
        await loadAllData();
        rerenderRoleContent();
        showToast('Skill removed', 'success');
        openManageSkillsModal();
      } catch (e) { showToast(e.message, 'error'); }
    };
  });
}

function openComplianceRuleModal() {
  openModal({
    title: 'New Compliance Rule',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="crTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="crDesc" class="form-textarea" rows="2"></textarea></label>
      <label class="form-group">
        <span class="form-label">Programme (optional)</span>
        <select id="crProgramme" class="form-select">
          <option value="">Any</option>
          ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select>
      </label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Target department</span>
          <input id="crDept" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Recurrence in months</span>
          <input id="crMonths" type="number" class="form-input" value="12" /></label>
      </div>
      <label class="checkbox-row">
        <input type="checkbox" id="crMandatory" checked />
        Mandatory for all selected trainees
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="crSave" class="btn btn-primary">Create Rule</button>`,
  });
  $('#crSave').onclick = async () => {
    const title = $('#crTitle').value;
    if (!title) return showToast('Title is required', 'error');
    try {
      await apiCall('/api/institution/compliance-rules', 'POST', {
        title,
        description: $('#crDesc').value || null,
        programme_id: $('#crProgramme').value ? Number($('#crProgramme').value) : null,
        target_department: $('#crDept').value || null,
        recurrence_months: Number($('#crMonths').value || 12),
        mandatory: $('#crMandatory').checked,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Compliance rule created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openAssignInstructorModal() {
  openModal({
    title: 'Assign Instructor',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Search experts</span>
        <input id="aiSearch" class="form-input" placeholder="Name, email, or specialization" /></label>
      <div id="aiResults" class="list-stack" style="margin-top:12px">
        ${S.experts.slice(0, 30).map(e => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(e.name)}</span>
              <span class="list-row-sub">${esc(e.specialization || '')} - ${fmtCur(e.hourly_rate || 0)}/hr</span>
            </div>
            <button class="btn btn-primary btn-xs" data-pick-instructor="${e.id}">Assign</button>
          </li>
        `).join('') || '<li class="empty-row">No experts available</li>'}
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });

  function bindPickButtons() {
    document.querySelectorAll('[data-pick-instructor]').forEach(b => {
      b.onclick = async () => {
        try {
          await apiCall('/api/institution/instructors', 'POST', {
            expert_id: Number(b.dataset.pickInstructor),
          });
          closeModal();
          await loadAllData();
          rerenderRoleContent();
          showToast('Instructor assigned', 'success');
        } catch (e) { showToast(e.message, 'error'); }
      };
    });
  }
  bindPickButtons();

  const search = $('#aiSearch');
  if (search) {
    search.oninput = debounce(() => {
      const q = search.value.toLowerCase();
      const filtered = S.experts.filter(e =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.specialization || '').toLowerCase().includes(q)
      );
      $('#aiResults').innerHTML = filtered.slice(0, 30).map(e => `
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(e.name)}</span>
            <span class="list-row-sub">${esc(e.specialization || '')} - ${fmtCur(e.hourly_rate || 0)}/hr</span>
          </div>
          <button class="btn btn-primary btn-xs" data-pick-instructor="${e.id}">Assign</button>
        </li>
      `).join('') || '<li class="empty-row">No matches</li>';
      bindPickButtons();
    }, 250);
  }
}

function openInviteTeamMemberModal() {
  openModal({
    title: 'Invite Team Member',
    body: `
      <label class="form-group"><span class="form-label">Full name</span>
        <input id="tmName" class="form-input" required /></label>
      <label class="form-group"><span class="form-label">Email</span>
        <input id="tmEmail" type="email" class="form-input" required /></label>
      <label class="form-group">
        <span class="form-label">Role</span>
        <select id="tmRole" class="form-select">
          ${CONFIG.INSTITUTION_ROLES.map(r => `
            <option value="${r}">${r.replace('_', ' ')}</option>
          `).join('')}
        </select>
      </label>
      <p class="form-hint">A temporary password will be generated and shown once.</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tmSave" class="btn btn-primary">Send Invite</button>`,
  });
  $('#tmSave').onclick = async () => {
    const name = $('#tmName').value;
    const email = $('#tmEmail').value;
    if (!name || !email) return showToast('Name and email are required', 'error');
    try {
      const d = await apiCall('/api/institution/team/invite', 'POST', {
        name, email,
        institution_role: $('#tmRole').value,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(`Invite sent. Temporary password: ${d.temp_password}`, 'success', 8000);
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openChangeTeamRoleModal(userId) {
  const t = S.institutionTeam.find(x => String(x.id) === String(userId)) || {};
  openModal({
    title: 'Change Team Role',
    body: `
      <p><strong>${esc(t.name || '')}</strong></p>
      <label class="form-group">
        <span class="form-label">New role</span>
        <select id="ctrRole" class="form-select">
          ${CONFIG.INSTITUTION_ROLES.map(r => `
            <option value="${r}" ${t.institution_role === r ? 'selected' : ''}>
              ${r.replace('_', ' ')}
            </option>
          `).join('')}
        </select>
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ctrSave" class="btn btn-primary">Update</button>`,
  });
  $('#ctrSave').onclick = async () => {
    try {
      await apiCall(`/api/institution/team/${userId}/role`, 'PUT', {
        institution_role: $('#ctrRole').value,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Role updated', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openTeamPermissionsModal(userId) {
  const permissions = [
    'manage_programmes', 'manage_cohorts', 'manage_trainees',
    'manage_assessments', 'issue_certificates', 'view_reports',
    'manage_branding', 'manage_team',
  ];
  openModal({
    title: 'Team Permissions',
    body: `
      <p class="form-hint" style="margin-bottom:14px">Toggle granular permissions for this team member.</p>
      ${permissions.map(p => `
        <label class="checkbox-row" style="margin-bottom:8px">
          <input type="checkbox" data-perm="${p}" />
          ${p.replace(/_/g, ' ')}
        </label>
      `).join('')}`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tpSave" class="btn btn-primary">Save</button>`,
  });
  $('#tpSave').onclick = async () => {
    const list = Array.from(document.querySelectorAll('[data-perm]')).map(el => ({
      key: el.dataset.perm,
      granted: el.checked,
    }));
    try {
      await apiCall(`/api/institution/team/${userId}/permissions`, 'PUT', { permissions: list });
      closeModal();
      showToast('Permissions saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openOrgUnitModal(unitId) {
  const u = unitId ? (S.institutionOrgUnits.find(x => x.id === unitId) || {}) : {};
  openModal({
    title: unitId ? 'Edit Org Unit' : 'New Org Unit',
    body: `
      <label class="form-group"><span class="form-label">Name</span>
        <input id="ouName" class="form-input" value="${esc(u.name || '')}" /></label>
      <label class="form-group">
        <span class="form-label">Type</span>
        <select id="ouType" class="form-select">
          ${['department', 'branch', 'cost_centre', 'team'].map(t => `
            <option value="${t}" ${u.unit_type === t ? 'selected' : ''}>${t.replace('_', ' ')}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Code</span>
        <input id="ouCode" class="form-input" value="${esc(u.code || '')}" /></label>
      <label class="form-group">
        <span class="form-label">Manager</span>
        <select id="ouManager" class="form-select">
          <option value="">Unassigned</option>
          ${S.institutionTeam.map(t => `
            <option value="${t.id}" ${u.manager_id === t.id ? 'selected' : ''}>${esc(t.name)}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Budget amount</span>
        <input id="ouBudget" type="number" class="form-input" value="${u.budget_amount || 0}" /></label>
      <label class="checkbox-row">
        <input type="checkbox" id="ouActive" ${u.active === undefined || u.active ? 'checked' : ''} />
        Active
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ouSave" class="btn btn-primary">${unitId ? 'Save' : 'Create'}</button>`,
  });
  $('#ouSave').onclick = async () => {
    const payload = {
      name: $('#ouName').value,
      unit_type: $('#ouType').value,
      code: $('#ouCode').value || null,
      manager_id: $('#ouManager').value ? Number($('#ouManager').value) : null,
      budget_amount: Number($('#ouBudget').value || 0),
      active: $('#ouActive').checked,
    };
    if (!payload.name) return showToast('Name is required', 'error');
    try {
      if (unitId) await apiCall(`/api/institution/org-units/${unitId}`, 'PUT', payload);
      else        await apiCall('/api/institution/org-units', 'POST', payload);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(unitId ? 'Unit updated' : 'Unit created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openScheduleReportModal() {
  openModal({
    title: 'Schedule Report',
    body: `
      <label class="form-group">
        <span class="form-label">Report type</span>
        <select id="srType" class="form-select">
          <option value="programme">Programme Scorecard</option>
          <option value="cohort">Cohort Comparison</option>
          <option value="trainee">Trainee Progress</option>
          <option value="compliance">Compliance</option>
          <option value="cost">Cost Analysis</option>
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Frequency</span>
        <select id="srFreq" class="form-select">
          <option value="daily">Daily</option>
          <option value="weekly" selected>Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Recipients (comma separated)</span>
        <textarea id="srRecipients" class="form-textarea" rows="2"
                  placeholder="ops@acme.com, l-and-d@acme.com"></textarea>
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="srSave" class="btn btn-primary">Schedule</button>`,
  });
  $('#srSave').onclick = async () => {
    const recipients = $('#srRecipients').value
      .split(',').map(s => s.trim()).filter(Boolean);
    if (!recipients.length) return showToast('Add at least one recipient', 'error');
    try {
      const template = await apiCall('/api/institution/report-templates', 'POST', {
        name: `${$('#srType').value} report`,
        report_type: $('#srType').value,
      });
      await apiCall('/api/institution/scheduled-reports', 'POST', {
        template_id: template.id,
        frequency: $('#srFreq').value,
        recipients,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Report scheduled', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

async function openReportPreviewModal(type) {
  try {
    showLoading(true);
    const endpoints = {
      'programme-scorecard': '/api/institution/reports/programme-scorecard',
      'cohort-comparison':   '/api/institution/reports/cohort-comparison',
      'trainee-progress':    '/api/institution/reports/trainee-progress-heatmap',
      'compliance':          '/api/institution/reports/compliance',
      'cost':                '/api/institution/reports/cost',
    };
    const titles = {
      'programme-scorecard': 'Programme Scorecard',
      'cohort-comparison':   'Cohort Comparison',
      'trainee-progress':    'Trainee Progress Heatmap',
      'compliance':          'Compliance Report',
      'cost':                'Cost Analysis',
    };
    const endpoint = endpoints[type];
    if (!endpoint) return;

    const d = await apiCall(endpoint);
    let content = '';

    if (type === 'programme-scorecard') {
      content = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Programme</th><th>Status</th><th>Enrolled</th>
                <th>Completed</th><th>Avg. Progress</th><th>Cost per Seat</th>
              </tr>
            </thead>
            <tbody>
              ${(d.scorecard || []).map(r => `
                <tr>
                  <td>${esc(r.title)}</td>
                  <td><span class="${statusClass(r.status)}">${esc(r.status)}</span></td>
                  <td>${r.total_enrolled || 0}</td>
                  <td>${r.total_completed || 0}</td>
                  <td>${Math.round(Number(r.avg_progress) || 0)}%</td>
                  <td>${fmtCur(r.cost_per_seat || 0)}</td>
                </tr>
              `).join('') || '<tr><td colspan="6" class="empty-row">No data</td></tr>'}
            </tbody>
          </table>
        </div>`;
    } else if (type === 'cohort-comparison') {
      content = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Cohort</th><th>Programme</th><th>Enrolled</th><th>Avg. Progress</th><th>Avg. Score</th><th>Attendance</th></tr>
            </thead>
            <tbody>
              ${(d.cohorts || []).map(c => {
                const att = Number(c.attendance_total)
                  ? Math.round((Number(c.presents) / Number(c.attendance_total)) * 100)
                  : 0;
                return `
                  <tr>
                    <td>${esc(c.name)}</td>
                    <td>${esc(c.programme_title || '-')}</td>
                    <td>${c.enrolled || 0}</td>
                    <td>${Math.round(Number(c.avg_progress) || 0)}%</td>
                    <td>${Math.round(Number(c.avg_score) || 0)}%</td>
                    <td>${att}%</td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="6" class="empty-row">No data</td></tr>'}
            </tbody>
          </table>
        </div>`;
    } else if (type === 'trainee-progress') {
      const paceColours = { ahead: '#22c55e', on_track: '#84cc16', behind: '#f59e0b', at_risk: '#dc2626' };
      content = `
        <ul class="list-stack">
          ${(d.heatmap || []).map(t => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(t.name)}</span>
                <span class="list-row-sub">${esc(t.department || '')} - ${esc(t.programme_title || '')}</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <div class="progress-bar" style="width:100px">
                  <span style="width:${t.progress}%;background:${paceColours[t.pace] || 'var(--brand)'}"></span>
                </div>
                <span style="font-weight:600;color:${paceColours[t.pace] || 'inherit'}">${t.progress}%</span>
              </div>
            </li>
          `).join('') || '<li class="empty-row">No data</li>'}
        </ul>`;
    } else if (type === 'compliance') {
      const statusMap = {
        valid: 'status-active', expiring_soon: 'status-pending',
        expired: 'status-rejected', revoked: 'status-rejected', no_expiry: 'status-active',
      };
      content = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Name</th><th>Department</th><th>Certificate</th><th>Expires</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${(d.compliance || []).map(r => `
                <tr>
                  <td>${esc(r.name)}</td>
                  <td>${esc(r.department || '-')}</td>
                  <td>${esc(r.title || '-')}</td>
                  <td>${r.expires_at ? fmtDate(r.expires_at) : 'Never'}</td>
                  <td><span class="${statusMap[r.compliance_status] || 'chip chip-neutral'}">
                    ${esc((r.compliance_status || '').replace('_', ' '))}
                  </span></td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="empty-row">No data</td></tr>'}
            </tbody>
          </table>
        </div>`;
    } else if (type === 'cost') {
      content = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          <div>Total programme cost: <strong>${fmtCur(d.total_cost || 0)}</strong></div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Programme</th><th>Seats</th><th>Cost per Seat</th><th>Trainer</th><th>Materials</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${(d.cost || []).map(r => `
                <tr>
                  <td>${esc(r.title)}</td>
                  <td>${r.seats}</td>
                  <td>${fmtCur(r.cost_per_seat)}</td>
                  <td>${fmtCur(r.trainer_cost)}</td>
                  <td>${fmtCur(r.materials_cost)}</td>
                  <td>${fmtCur(r.total_cost)}</td>
                </tr>
              `).join('') || '<tr><td colspan="6" class="empty-row">No data</td></tr>'}
            </tbody>
          </table>
        </div>`;
    }

    openModal({
      title: titles[type],
      className: 'modal-lg',
      body: content,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
               <button class="btn btn-primary" id="reportExportBtn">
                 <i class="fas fa-download"></i> Export CSV</button>`,
    });

    $('#reportExportBtn').onclick = () => {
      const rows = d.scorecard || d.cohorts || d.heatmap || d.compliance || d.cost || [];
      if (!rows.length) return showToast('No data to export', 'warning');
      downloadCsv(`${type}-${Date.now()}.csv`, rows);
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

/* ============================================================
   CHARTS
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
          tension: 0.3,
          fill: true,
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
          backgroundColor: '#059669',
          borderRadius: 6,
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
}

/* ============================================================
   ROUTER
   ============================================================ */
async function route() {
  const hash = location.hash || '#/';

  if (hash === '#/login')    return renderLogin();
  if (hash === '#/register') return renderRegister();
  if (hash.startsWith('#/forgot')) return renderForgot();
  if (hash.startsWith('#/reset')) {
    const params = new URLSearchParams(hash.split('?')[1]);
    return renderReset(params.get('token'));
  }
  if (hash.startsWith('#/verify/')) {
    return renderVerify(hash.split('/')[2]);
  }
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
  if ((e.metaKey || e.ctrlKey) && e.key === 'k' && appPhase === 'dashboard') {
    e.preventDefault();
    showToast('Press / to focus search', 'info');
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