/* ============================================================
   ExpertHub 2.0 — SPA frontend
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
  DEFAULT_AVATAR: 'https://ui-avatars.com/api/?background=6366f1&color=fff&name=',
  PAYMENT_PROVIDERS: ['stripe','paystack','flutterwave','paypal','demo'],
  POLL_INTERVAL: 60000,
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
let currentChatId = null;
let chatTypingTimer = null;
let pollTimer = null;
let notificationsPanelOpen = false;

const S = {
  users: [], experts: [], events: [], consultations: [], courses: [], notifications: [],
  reviews: [], transactions: [], payouts: [], enrollments: [], auditLogs: [], claims: [],
  tickets: [], coupons: [], certificates: [], wallet: { balance:0, ledger:[] }, earnings: null,
  analytics: null, eventRegistrations: [], availability: [], timeOff: [], chatMessages: {},
  page: { users:1, experts:1, courses:1, consultations:1, transactions:1 },
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
const timeAgo = d => { if (!d) return ''; const s=(Date.now()-new Date(d).getTime())/1000; if(s<60)return'just now'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return Math.floor(s/3600)+'h ago'; if(s<604800)return Math.floor(s/86400)+'d ago'; return fmtDate(d); };
const avatar = u => u?.avatar || (CONFIG.DEFAULT_AVATAR + encodeURIComponent(u?.name||u?.email||'User'));
const statusClass = s => `status status-${String(s||'unknown').toLowerCase().replace(/\s+/g,'_')}`;
const uid = () => Math.random().toString(36).slice(2,10);
const debounce = (fn,ms=350) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };

function downloadCsv(filename, rows) {
  if (!rows.length) return showToast('Nothing to export','warning');
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => `"${String(r[h]??'').replace(/"/g,'""')}"`).join(','))).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
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
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const icon = { success:'✅', error:'❌', warning:'⚠️', info:'🔔' }[type] || '🔔';
  el.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${esc(msg)}</span>`;
  c.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}
function showLoading(show) {
  let l = $('#globalLoader');
  if (show && !l) {
    l = document.createElement('div'); l.id='globalLoader'; l.className='loading-overlay';
    l.innerHTML='<div class="spinner"></div>'; document.body.appendChild(l);
  } else if (!show && l) l.remove();
}
function openModal({ title, body, footer, className='' }) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-overlay" id="modalBackdrop">
      <div class="modal-content ${className}" role="dialog">
        <header class="modal-header">
          <h3 class="modal-title">${esc(title||'')}</h3>
          <button class="modal-close" data-close-modal>×</button>
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
    // try refresh
    try {
      const r = await fetch(`${CONFIG.API_BASE}/api/auth/refresh`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ refresh: refreshToken }),
      });
      if (r.ok) {
        const d = await r.json();
        authToken = d.token;
        localStorage.setItem('token', authToken);
        return apiCall(endpoint, method, body, isFormData, true);
      }
    } catch {}
    return logout();
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error || j.message || msg; } catch {}
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
    showToast(n.title || 'New notification','info');
    updateNotificationBadge();
    if (notificationsPanelOpen) renderNotificationsPanel();
  });
  socket.on('broadcast', b => showToast(`📢 ${b.title}: ${b.message}`,'info', 6000));
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
    if (is_typing && user_id !== currentUser?.id) {
      el.textContent = 'typing…';
    } else {
      el.textContent = '';
    }
  });
  socket.on('presence', () => {});
}

/* ---------- AUTH ---------- */
async function login(email, password) {
  const data = await apiCall('/api/auth/login','POST',{ email, password });
  authToken = data.token;
  refreshToken = data.refresh;
  currentUser = data.user;
  currentUserRole = data.user.role;
  localStorage.setItem('token', authToken);
  localStorage.setItem('refresh', refreshToken);
  localStorage.setItem('user', JSON.stringify(currentUser));
  if (data.user.theme) document.documentElement.classList.toggle('dark', data.user.theme === 'dark');
  initializeSocket();
  await loadAllData();
  appPhase = 'dashboard';
  activeTab = 'dashboard';
  location.hash = '#/dashboard';
  renderDashboard();
  showToast(`Welcome back, ${currentUser.name}!`,'success');
  startPolling();
}
async function register(payload) {
  const data = await apiCall('/api/auth/register','POST',payload);
  showToast(data.message || 'Registration submitted','success');
  return data;
}
async function logout() {
  try { await apiCall('/api/auth/logout','POST',{ refresh: refreshToken }); } catch {}
  if (socket) socket.disconnect();
  socket = null; authToken = null; refreshToken = null; currentUser = null; currentUserRole = null;
  localStorage.removeItem('token'); localStorage.removeItem('refresh'); localStorage.removeItem('user');
  stopPolling();
  appPhase = 'landing'; location.hash = '#/';
  renderLanding();
}

/* ---------- DATA LOADERS ---------- */
async function loadAllData() {
  try {
    const tasks = [
      apiCall('/api/common/notifications').then(d => { S.notifications = d.notifications||[]; }).catch(()=>{}),
      apiCall('/api/common/events').then(d => { S.events = d.events||[]; }).catch(()=>{}),
      apiCall('/api/common/consultations').then(d => { S.consultations = d.consultations||[]; }).catch(()=>{}),
    ];
    if (currentUserRole === 'admin') {
      tasks.push(apiCall('/api/admin/users').then(d => { S.users = d.users||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/admin/experts').then(d => { S.experts = d.experts||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/admin/analytics').then(d => { S.analytics = d; }).catch(()=>{}));
      tasks.push(apiCall('/api/admin/transactions').then(d => { S.transactions = d.transactions||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/admin/payouts').then(d => { S.payouts = d.payouts||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/admin/coupons').then(d => { S.coupons = d.coupons||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/admin/claims').then(d => { S.claims = d.claims||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/admin/tickets').then(d => { S.tickets = d.tickets||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/admin/reviews').then(d => { S.reviews = d.reviews||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/admin/audit-logs').then(d => { S.auditLogs = d.logs||[]; }).catch(()=>{}));
    } else if (currentUserRole === 'expert') {
      tasks.push(apiCall('/api/expert/earnings').then(d => { S.earnings = d.summary; S.wallet.ledger = d.ledger||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/expert/reviews').then(d => { S.reviews = d.reviews||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/expert/withdrawals').then(d => { S.payouts = d.payouts||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/expert/availability').then(d => { S.availability = d.availability||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/expert/time-off').then(d => { S.timeOff = d.timeOff||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/expert/dashboard-stats').then(d => { S.expertStats = d.stats; }).catch(()=>{}));
    } else {
      tasks.push(apiCall('/api/user/experts').then(d => { S.experts = d.experts||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/user/enrollments').then(d => { S.enrollments = d.enrollments||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/user/wallet').then(d => { S.wallet.balance = d.balance; S.wallet.ledger = d.ledger||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/user/transactions').then(d => { S.transactions = d.transactions||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/user/claims').then(d => { S.claims = d.claims||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/user/tickets').then(d => { S.tickets = d.tickets||[]; }).catch(()=>{}));
      tasks.push(apiCall('/api/user/certificates').then(d => { S.certificates = d.certificates||[]; }).catch(()=>{}));
    }
    tasks.push(apiCall('/api/eschool/courses').then(d => { S.courses = d.courses||[]; }).catch(()=>{}));
    await Promise.all(tasks);
  } catch (e) { console.error('loadAllData', e); }
}
async function reloadUsers() { try { const d = await apiCall('/api/admin/users'); S.users = d.users||[]; } catch {} }
async function reloadExperts() { try { const d = await apiCall('/api/admin/experts'); S.experts = d.experts||[]; } catch {} }
async function reloadConsultations() { try { const d = await apiCall('/api/common/consultations'); S.consultations = d.consultations||[]; } catch {} }
async function reloadNotifications() { try { const d = await apiCall('/api/common/notifications'); S.notifications = d.notifications||[]; } catch {} }
async function reloadWallet() { try { const d = await apiCall('/api/user/wallet'); S.wallet.balance = d.balance; S.wallet.ledger = d.ledger||[]; } catch {} }
async function reloadEarnings() { try { const d = await apiCall('/api/expert/earnings'); S.earnings = d.summary; S.wallet.ledger = d.ledger||[]; } catch {} }
async function reloadCourses() { try { const d = await apiCall('/api/eschool/courses'); S.courses = d.courses||[]; } catch {} }

function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => { reloadNotifications().then(updateNotificationBadge); }, CONFIG.POLL_INTERVAL);
}
function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

function updateNotificationBadge() {
  const b = $('#notif-badge'); if (!b) return;
  const unread = S.notifications.filter(n => !n.is_read).length;
  b.textContent = unread;
  b.classList.toggle('hidden', unread === 0);
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
          <span class="hero-badge"><span class="live-indicator"></span> Trusted by learners & experts</span>
          <h1 class="hero-title">Learn, consult and grow with <span class="hero-title-accent">real experts</span></h1>
          <p class="hero-subtitle">
            ExpertHub combines an E-School, bootcamps, short courses, tuition, exam prep and
            1-on-1 consultations — all in one modern platform.
          </p>
          <div class="hero-cta">
            <button class="btn btn-primary" id="heroStart"><i class="fas fa-rocket"></i> Get started free</button>
            <button class="btn btn-secondary" id="heroSignIn"><i class="fas fa-right-to-bracket"></i> I already have an account</button>
          </div>
          <div class="hero-stats">
            <div><div class="hero-stat-value">2k+</div><div class="hero-stat-label">Active learners</div></div>
            <div><div class="hero-stat-value">150+</div><div class="hero-stat-label">Verified experts</div></div>
            <div><div class="hero-stat-value">4.9★</div><div class="hero-stat-label">Avg. rating</div></div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-card">
            <div class="hero-card-row"><div class="hero-card-icon"><i class="fas fa-school"></i></div><div><div class="hero-card-title">E-School hub</div><div class="hero-card-desc">Bootcamps, courses, tuition & exams</div></div></div>
            <div class="hero-card-row"><div class="hero-card-icon green"><i class="fas fa-comments"></i></div><div><div class="hero-card-title">1-on-1 consultations</div><div class="hero-card-desc">Chat, audio and video calls</div></div></div>
            <div class="hero-card-row"><div class="hero-card-icon yellow"><i class="fas fa-user-tie"></i></div><div><div class="hero-card-title">Verified experts</div><div class="hero-card-desc">Approved by our admin team</div></div></div>
          </div>
          <div class="hero-card">
            <div class="hero-card-row"><div class="hero-card-icon"><i class="fas fa-shield-halved"></i></div><div><div class="hero-card-title">Secure accounts</div><div class="hero-card-desc">Role-based access & admin approval</div></div></div>
          </div>
        </div>
      </main>

      <section class="section alt">
        <h2 class="section-title">Everything you need to learn & earn</h2>
        <p class="section-sub">A complete platform for learners, experts and administrators.</p>
        <div class="features-grid">
          <div class="feature-card"><div class="feature-icon"><i class="fas fa-graduation-cap"></i></div><h3>Learn anything</h3><p>Bootcamps, short courses, tuition and exam prep — curated by experts.</p></div>
          <div class="feature-card"><div class="feature-icon" style="background:linear-gradient(135deg,#10b981,#059669)"><i class="fas fa-user-tie"></i></div><h3>Teach & earn</h3><p>Experts get verified, manage consultations and withdraw earnings.</p></div>
          <div class="feature-card"><div class="feature-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706)"><i class="fas fa-comments"></i></div><h3>Real-time chat</h3><p>Live messaging, attachments, typing indicator and video calls.</p></div>
          <div class="feature-card"><div class="feature-icon" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9)"><i class="fas fa-shield-halved"></i></div><h3>Admin controlled</h3><p>Approvals, moderation, payouts and full audit logging built in.</p></div>
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
              <li><i class="fas fa-check"></i> 1 free consultation/mo</li>
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
            <h3 style="margin:0">Custom</h3>
            <div class="pricing-price">Let's talk</div>
            <ul class="pricing-features">
              <li><i class="fas fa-check"></i> Team accounts</li>
              <li><i class="fas fa-check"></i> Bulk enrollments</li>
              <li><i class="fas fa-check"></i> Custom integrations</li>
              <li><i class="fas fa-check"></i> Dedicated manager</li>
            </ul>
            <button class="btn btn-secondary btn-block" onclick="showToast('Contact sales@experthub.com','info')">Contact us</button>
          </div>
        </div>
      </section>

      <section class="section alt">
        <h2 class="section-title">Loved by learners & experts</h2>
        <p class="section-sub">Real stories from our community.</p>
        <div class="testimonials-grid">
          <div class="testimonial">
            <p class="testimonial-text">"ExpertHub helped me switch careers in 6 months. The bootcamp was intense but amazing."</p>
            <div class="testimonial-author">
              <img class="testimonial-avatar" src="https://ui-avatars.com/api/?background=6366f1&color=fff&name=Jane+D" alt="" />
              <div><div class="testimonial-name">Jane D.</div><div class="testimonial-role">Software Engineer</div></div>
            </div>
          </div>
          <div class="testimonial">
            <p class="testimonial-text">"As an expert, I doubled my income in 3 months. The platform handles payments automatically."</p>
            <div class="testimonial-author">
              <img class="testimonial-avatar" src="https://ui-avatars.com/api/?background=10b981&color=fff&name=Dr+S" alt="" />
              <div><div class="testimonial-name">Dr. Sarah K.</div><div class="testimonial-role">Data Science Expert</div></div>
            </div>
          </div>
          <div class="testimonial">
            <p class="testimonial-text">"The admin panel is a dream. Approvals, payouts, moderation — everything in one place."</p>
            <div class="testimonial-author">
              <img class="testimonial-avatar" src="https://ui-avatars.com/api/?background=8b5cf6&color=fff&name=Admin" alt="" />
              <div><div class="testimonial-name">Platform Admin</div><div class="testimonial-role">ExpertHub</div></div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Frequently asked questions</h2>
        <p class="section-sub">Everything you need to know.</p>
        <div class="faq-list">
          ${[
            ['How does registration work?','Learners are approved instantly. Experts require admin approval (usually within 48 hours).'],
            ['What is the platform commission?','We charge a flat 20% commission on all course sales and consultations.'],
            ['How long do payouts take?','Withdrawals have a 7-day holding period, then process within 3-5 business days.'],
            ['Can I switch from learner to expert?','Yes! Apply to become an expert from your dashboard. Our team reviews each application.'],
            ['Is my payment information secure?','All payments are processed through PCI-compliant providers (Stripe, Paystack, Flutterwave, PayPal).'],
          ].map(([q,a]) => `<div class="faq-item"><div class="faq-q">${q}<i class="fas fa-chevron-down"></i></div><div class="faq-a">${a}</div></div>`).join('')}
        </div>
      </section>

      <footer class="landing-footer">
        © ${new Date().getFullYear()} ExpertHub — E-School & Consultation Platform.
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
          <label class="form-group"><span class="form-label">Email</span>
            <input id="loginEmail" type="email" required class="form-input" placeholder="you@example.com" /></label>
          <label class="form-group"><span class="form-label">Password</span>
            <div class="input-wrap">
              <input id="loginPassword" type="password" required class="form-input" placeholder="••••••••" />
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
        </div>
      </section>
    </main>`;

  $('#toggleLoginPwd').onclick = () => { const i=$('#loginPassword'); i.type = i.type==='password'?'text':'password'; };
  $('#loginForm').onsubmit = async e => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim(), pwd = $('#loginPassword').value;
    const err = $('#loginError'); err.classList.add('hidden');
    if (!email || !pwd) return showToast('Please fill all fields','error');
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
          <p class="auth-subtitle">Learners are auto-approved. Experts need admin approval.</p>
        </header>
        <form id="registerForm" class="auth-form">
          <div class="role-picker">
            <button type="button" data-role="learner" class="role-pick role-pick-active">🎓 Learner</button>
            <button type="button" data-role="expert"  class="role-pick">🧑‍🏫 Expert</button>
          </div>
          <label class="form-group"><span class="form-label">Full name</span><input id="regName" required class="form-input" placeholder="Jane Doe" /></label>
          <label class="form-group"><span class="form-label">Email</span><input id="regEmail" type="email" required class="form-input" placeholder="you@example.com" /></label>
          <label class="form-group"><span class="form-label">Phone (optional)</span><input id="regPhone" class="form-input" placeholder="+254…" /></label>
          <label class="form-group"><span class="form-label">Password</span>
            <input id="regPassword" type="password" required class="form-input" placeholder="Min 8 characters" />
            <div class="progress-bar"><span id="pwdBar"></span></div>
            <p id="pwdHint" class="form-hint"></p>
          </label>
          <label class="form-group"><span class="form-label">Confirm password</span><input id="regPassword2" type="password" required class="form-input" /></label>
          <div id="expertExtra" class="hidden" style="display:grid;gap:12px">
            <label class="form-group"><span class="form-label">Specialization</span><input id="regSpec" class="form-input" placeholder="e.g. Data Science" /></label>
            <label class="form-group"><span class="form-label">Hourly rate ($)</span><input id="regRate" type="number" class="form-input" placeholder="50" /></label>
            <label class="form-group"><span class="form-label">Short bio</span><textarea id="regBio" class="form-textarea" rows="3"></textarea></label>
          </div>
          <label class="checkbox-row"><input type="checkbox" id="regTerms" /> I agree to the Terms & Privacy Policy</label>
          <button type="submit" class="btn btn-primary btn-block">Create account</button>
        </form>
        <p class="auth-footer">Already have an account? <a href="#/login" class="link">Sign in</a></p>
        <p class="auth-footer" style="margin-top:6px"><a href="#/" class="link"><i class="fas fa-arrow-left"></i> Back to home</a></p>
      </section>
    </main>`;

  $$('.role-pick').forEach(b => b.onclick = () => {
    $$('.role-pick').forEach(x => x.classList.remove('role-pick-active'));
    b.classList.add('role-pick-active');
    $('#expertExtra').classList.toggle('hidden', b.dataset.role !== 'expert');
  });

  $('#regPassword').addEventListener('input', e => {
    const v = e.target.value; let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    const pct = score * 25;
    $('#pwdBar').style.width = pct + '%';
    $('#pwdHint').textContent = ['Too short','Weak','Fair','Good','Strong'][score] || '';
  });

  $('#registerForm').onsubmit = async e => {
    e.preventDefault();
    const role = $('.role-pick-active')?.dataset.role || 'learner';
    const name = $('#regName').value.trim(), email = $('#regEmail').value.trim(), phone = $('#regPhone').value.trim();
    const pwd = $('#regPassword').value, pwd2 = $('#regPassword2').value;
    const terms = $('#regTerms').checked;
    if (!name || !email || !pwd) return showToast('Fill required fields','error');
    if (pwd.length < 8) return showToast('Password must be at least 8 characters','error');
    if (pwd !== pwd2) return showToast('Passwords do not match','error');
    if (!terms) return showToast('Accept the terms to continue','error');

    const extra = role === 'expert' ? {
      specialization: $('#regSpec').value,
      hourly_rate: Number($('#regRate').value || 0),
      bio: $('#regBio').value,
    } : {};

    try {
      showLoading(true);
      await register({ name, email, password: pwd, phone, role, extra });
      if (role === 'learner') location.hash = '#/login';
      else showToast('Awaiting admin approval before you can log in.','info',6000);
    } catch (ex) { showToast(ex.message,'error'); }
    finally { showLoading(false); }
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
          <p class="auth-subtitle">We'll send a reset link to your email.</p>
        </header>
        <label class="form-group"><span class="form-label">Email</span>
          <input id="fpEmail" type="email" class="form-input" placeholder="you@example.com" /></label>
        <button id="fpBtn" class="btn btn-primary btn-block" style="margin-top:14px">Send reset link</button>
        <a href="#/login" class="link link-center">← Back to sign in</a>
      </section>
    </main>`;
  $('#fpBtn').onclick = async () => {
    const email = $('#fpEmail').value.trim();
    if (!email) return showToast('Enter your email','error');
    try {
      showLoading(true);
      await apiCall('/api/auth/forgot','POST',{ email });
      showToast('If the email exists, a reset link was sent.','success');
    } catch (e) { showToast(e.message,'error'); }
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
    const p1 = $('#rsPassword').value, p2 = $('#rsPassword2').value;
    if (!p1 || p1 !== p2) return showToast('Passwords do not match','error');
    try {
      showLoading(true);
      await apiCall('/api/auth/reset','POST',{ token, password:p1 });
      showToast('Password updated. Please sign in.','success');
      location.hash = '#/login';
    } catch (e) { showToast(e.message,'error'); }
    finally { showLoading(false); }
  };
}

/* ============================================================
   DASHBOARD DISPATCHER
   ============================================================ */
function renderDashboard() {
  if (!currentUser) return renderLogin();
  if (currentUserRole === 'admin')  return renderAdminDashboard();
  if (currentUserRole === 'expert') return renderExpertDashboard();
  return renderUserDashboard();
}

/* ---------- SHELL PIECES ---------- */
function sidebarItem(id, label, icon, badge=0) {
  const active = activeTab === id;
  return `
    <button class="sidebar-item ${active?'sidebar-item-active':''}" data-tab="${id}">
      <i class="fas ${icon} sidebar-icon"></i>
      <span class="sidebar-label">${label}</span>
      ${badge>0?`<span class="sidebar-badge">${badge}</span>`:''}
      ${active?'<i class="fas fa-chevron-right sidebar-chevron"></i>':''}
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
        <span class="topbar-user">${esc(currentUser?.name||roleLabel)}</span>
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
          <a href="#" class="sidebar-footer-link" data-action="help"><i class="fas fa-circle-question"></i> Help & Support</a>
        </div>
      </aside>
      <div class="app-main">
        ${topbar(roleLabel)}
        <div class="app-content" id="role-content">${content}</div>
        <footer class="app-footer">
          <span>© ${new Date().getFullYear()} ExpertHub</span>
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
  const host = $('#notif-panel-host'); if (!host) return;
  const unread = S.notifications.filter(n => !n.is_read).length;
  host.innerHTML = `
    <div class="notif-panel">
      <div class="notif-panel-header">
        <span>Notifications ${unread?`(${unread})`:''}</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-xs" data-notif-readall>Mark all read</button>
          <button class="btn btn-ghost btn-xs" data-notif-close>×</button>
        </div>
      </div>
      <div class="notif-panel-list">
        ${S.notifications.length ? S.notifications.slice(0,30).map(n => `
          <div class="notif-panel-item ${n.is_read?'':'unread'}" data-notif-id="${n.id}">
            <p class="notif-panel-item-title">${esc(n.title||'')}</p>
            <p class="notif-panel-item-msg">${esc(n.message||'')}</p>
            <p class="notif-panel-item-date">${timeAgo(n.created_at)}</p>
          </div>`).join('') : '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>'}
      </div>
    </div>`;
  host.querySelector('[data-notif-close]').onclick = toggleNotificationsPanel;
  host.querySelector('[data-notif-readall]').onclick = async () => {
    try {
      await apiCall('/api/common/notifications/read-all','PUT');
      S.notifications.forEach(n => n.is_read = 1);
      renderNotificationsPanel(); updateNotificationBadge();
    } catch (e) { showToast(e.message,'error'); }
  };
  host.querySelectorAll('[data-notif-id]').forEach(el => el.onclick = async () => {
    const id = el.dataset.notifId;
    const n = S.notifications.find(x => String(x.id) === id);
    if (n && !n.is_read) {
      try { await apiCall(`/api/common/notifications/${id}/read`,'PUT'); n.is_read = 1; } catch {}
      renderNotificationsPanel(); updateNotificationBadge();
    }
    if (n?.link) { location.hash = n.link.startsWith('#') ? n.link : `#${n.link}`; toggleNotificationsPanel(); }
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
    roleClass:'role-admin', brandIcon:'fa-graduation-cap',
    brandTitle:'ExpertHub', brandSubtitle:'Admin Panel',
    nav, roleLabel:'Admin Panel', content: renderAdminContent(),
  });
  attachRoleEvents(); renderCharts();
}
function renderAdminContent() {
  switch (activeTab) {
    case 'dashboard':     return adminOverview();
    case 'users':         return adminUsers();
    case 'experts':       return adminExperts();
    case 'consultations': return adminConsultations();
    case 'events':        return adminEvents();
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
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Dashboard</span></div>
    <section class="page-header">
      <h1 class="page-title">📊 Platform Overview</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-dashboard"><i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="refresh-all"><i class="fas fa-rotate"></i> Refresh</button>
      </div>
    </section>
    <section class="stat-grid">
      <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Total Users</p><p class="stat-value">${t.total_users ?? S.users.length}</p><p class="stat-sub">${pending} pending approval</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div></div>
      <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Active Experts</p><p class="stat-value">${activeExperts}</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-user-tie"></i></div></div>
      <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Active Consultations</p><p class="stat-value">${activeCons}</p></div><div class="stat-icon stat-icon-purple"><i class="fas fa-comments"></i></div></div>
      <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Revenue</p><p class="stat-value">${fmtCur(t.total_revenue || 0)}</p></div><div class="stat-icon stat-icon-yellow"><i class="fas fa-dollar-sign"></i></div></div>
    </section>
    <section class="dashboard-columns">
      <div class="panel panel-quick-actions">
        <h3 class="panel-title">➕ Quick Actions</h3>
        <button class="btn btn-primary btn-block" data-action="switch-tab" data-tab="experts"><i class="fas fa-user-plus"></i> Create Expert</button>
        <button class="btn btn-info btn-block" data-action="switch-tab" data-tab="events"><i class="fas fa-calendar-plus"></i> Manage Events</button>
        <button class="btn btn-success btn-block" data-action="switch-tab" data-tab="users"><i class="fas fa-user-check"></i> Approve Users</button>
        <button class="btn btn-warning btn-block" data-action="switch-tab" data-tab="coupons"><i class="fas fa-tag"></i> Manage Coupons</button>
      </div>
      <div class="panel">
        <h3 class="panel-title">📋 Recent Notifications</h3>
        <ul class="notif-list">
          ${S.notifications.slice(0,5).map(n => `
            <li class="notif-item"><i class="fas fa-bell"></i><div class="notif-info"><p class="notif-title">${esc(n.title||'')}</p><p class="notif-message">${esc(n.message||'')}</p></div><span class="notif-date">${timeAgo(n.created_at)}</span></li>
          `).join('') || '<li class="empty-row">No notifications</li>'}
        </ul>
      </div>
    </section>
    <section class="panel-charts">
      <div class="chart-card"><h3 class="panel-title">📈 User Growth</h3><canvas id="chartUserGrowth" height="200"></canvas></div>
      <div class="chart-card"><h3 class="panel-title">💰 Revenue Overview</h3><canvas id="chartRevenue" height="200"></canvas></div>
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
  if (q)            list = list.filter(u => (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q));
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Users</span></div>
    <section class="page-header">
      <h1 class="page-title">👥 User Management</h1>
      <div class="page-actions">
        <input type="search" id="users-q" class="form-input" placeholder="Search users…" value="${esc(q)}" />
        <select id="users-status-filter" class="form-select">
          <option value="">All statuses</option>
          <option value="active" ${statusFilter==='active'?'selected':''}>Active</option>
          <option value="pending" ${statusFilter==='pending'?'selected':''}>Pending</option>
          <option value="suspended" ${statusFilter==='suspended'?'selected':''}>Suspended</option>
          <option value="rejected" ${statusFilter==='rejected'?'selected':''}>Rejected</option>
        </select>
        <select id="users-role-filter" class="form-select">
          <option value="">All roles</option>
          <option value="admin" ${roleFilter==='admin'?'selected':''}>Admin</option>
          <option value="expert" ${roleFilter==='expert'?'selected':''}>Expert</option>
          <option value="learner" ${roleFilter==='learner'?'selected':''}>Learner</option>
        </select>
        <button class="btn btn-secondary" data-action="export-users"><i class="fas fa-download"></i> Export</button>
      </div>
    </section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Last login</th><th>Actions</th></tr></thead>
          <tbody>
            ${list.map(u => `
              <tr>
                <td><div class="user-cell">
                  <img class="user-avatar" src="${avatar(u)}" alt="" />
                  <div><div class="user-name">${esc(u.name||'')}</div><div class="user-email">${esc(u.email||'')}</div></div>
                </div></td>
                <td><span class="chip chip-neutral">${esc(u.role||'learner')}</span></td>
                <td><span class="${statusClass(u.status)}">${esc(u.status||'')}</span></td>
                <td>${fmtDate(u.created_at)}</td>
                <td>${u.last_login_at ? timeAgo(u.last_login_at) : '—'}</td>
                <td class="actions-cell">
                  ${u.status==='pending'   ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${u.id}">Approve</button>` : ''}
                  ${u.status==='pending'   ? `<button class="btn btn-danger btn-xs" data-action="reject-user" data-id="${u.id}">Reject</button>` : ''}
                  ${u.status==='active'    ? `<button class="btn btn-warning btn-xs" data-action="suspend-user" data-id="${u.id}">Suspend</button>` : ''}
                  ${(u.status==='suspended'||u.status==='rejected') ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${u.id}">Reactivate</button>` : ''}
                  <button class="btn btn-secondary btn-xs" data-action="edit-user" data-id="${u.id}">Edit</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-user" data-id="${u.id}">Delete</button>
                </td>
              </tr>`).join('') || '<tr><td colspan="6" class="empty-row">No users found</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="table-footer"><span>Showing ${list.length} users</span></div>
    </section>`;
}
function adminExperts() {
  const list = S.experts.slice();
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Experts</span></div>
    <section class="page-header">
      <h1 class="page-title">👨‍💼 Expert Management</h1>
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
          <thead><tr><th>Expert</th><th>Specialization</th><th>Rate</th><th>Rating</th><th>Earnings</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${list.map(e => `
              <tr>
                <td><div class="user-cell"><img class="user-avatar" src="${avatar(e)}" alt="" /><div><div class="user-name">${esc(e.name||'')}</div><div class="user-email">${esc(e.email||'')}</div></div></div></td>
                <td>${esc(e.specialization||'—')}</td>
                <td>${fmtCur(e.hourly_rate||0)}</td>
                <td>${e.average_rating ? e.average_rating+' ⭐' : '—'}</td>
                <td>${fmtCur(e.total_earnings||0)}</td>
                <td><span class="${statusClass(e.status||'active')}">${esc(e.status||'')}</span></td>
                <td class="actions-cell">
                  ${e.status==='active' ? `<button class="btn btn-warning btn-xs" data-action="suspend-user" data-id="${e.id}">Suspend</button>` : ''}
                  ${e.status==='suspended' ? `<button class="btn btn-success btn-xs" data-action="approve-user" data-id="${e.id}">Reactivate</button>` : ''}
                  <button class="btn btn-danger btn-xs" data-action="delete-user" data-id="${e.id}">Delete</button>
                </td>
              </tr>`).join('') || '<tr><td colspan="7" class="empty-row">No experts</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>`;
}
function adminConsultations() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header"><h1 class="page-title">💬 All Consultations</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Title</th><th>Client</th><th>Expert</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${S.consultations.map(c => `
              <tr>
                <td>${esc(c.title||'')}</td>
                <td>${esc(c.client_name||'—')}</td>
                <td>${esc(c.expert_name||'—')}</td>
                <td><span class="chip chip-neutral">${esc(c.consultation_type||'')}</span></td>
                <td><span class="${statusClass(c.status)}">${esc(c.status||'')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="view-consultation" data-id="${c.id}">View</button>
                  ${!c.expert_id ? `<button class="btn btn-primary btn-xs" data-action="assign-consultation" data-id="${c.id}">Assign</button>` : ''}
                </td>
              </tr>`).join('') || '<tr><td colspan="6" class="empty-row">No consultations</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>`;
}
function adminEvents() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Events</span></div>
    <section class="page-header">
      <h1 class="page-title">📅 Events & Training</h1>
      <button class="btn btn-primary" data-action="create-event"><i class="fas fa-calendar-plus"></i> New Event</button>
    </section>
    <section class="panel">
      <div class="event-list">
        ${S.events.map(ev => `
          <article class="event-card">
            <div class="event-date">
              <span class="event-day">${new Date(ev.date||ev.created_at).getDate()}</span>
              <span class="event-month">${new Date(ev.date||ev.created_at).toLocaleString('en-US',{month:'short'})}</span>
            </div>
            <div class="event-body">
              <h4 class="event-title">${esc(ev.title||'')}</h4>
              <p class="event-desc">${esc((ev.description||'').slice(0,120))}</p>
              <p class="event-meta">${esc(ev.category||'')} · ${ev.registered_count||0}/${ev.capacity||0} registered · ${ev.price>0?fmtCur(ev.price):'Free'}</p>
            </div>
            <div class="event-actions">
              <button class="btn btn-secondary btn-sm" data-action="edit-event" data-id="${ev.id}">Edit</button>
              <button class="btn btn-danger btn-sm" data-action="delete-event" data-id="${ev.id}">Delete</button>
            </div>
          </article>`).join('') || '<p class="empty-row">No events</p>'}
      </div>
    </section>`;
}
function adminTransactions() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Transactions</span></div>
    <section class="page-header"><h1 class="page-title">🧾 Transactions</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Reference</th><th>User</th><th>Description</th><th>Amount</th><th>Provider</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${S.transactions.map(t => `
              <tr>
                <td><code class="code">${esc(t.reference||t.id)}</code></td>
                <td>${esc(t.user_name||'—')}</td>
                <td>${esc(t.description||'')}</td>
                <td>${fmtCur(t.amount||0)}</td>
                <td><span class="chip chip-neutral">${esc(t.provider||'')}</span></td>
                <td><span class="${statusClass(t.status)}">${esc(t.status||'')}</span></td>
                <td>${fmtDT(t.created_at)}</td>
              </tr>`).join('') || '<tr><td colspan="7" class="empty-row">No transactions</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>`;
}
function adminPayouts() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Payouts</span></div>
    <section class="page-header"><h1 class="page-title">💸 Payouts</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Expert</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${S.payouts.map(p => `
              <tr>
                <td>${esc(p.expert_name||'—')}</td>
                <td>${fmtCur(p.amount||0)}</td>
                <td><span class="chip chip-neutral">${esc(p.method||'')}</span></td>
                <td><span class="${statusClass(p.status)}">${esc(p.status||'')}</span></td>
                <td>${fmtDate(p.created_at)}</td>
                <td class="actions-cell">
                  ${p.status==='pending' ? `
                    <button class="btn btn-success btn-xs" data-action="payout-approve" data-id="${p.id}">Approve</button>
                    <button class="btn btn-info btn-xs" data-action="payout-process" data-id="${p.id}">Process</button>
                    <button class="btn btn-danger btn-xs" data-action="payout-reject" data-id="${p.id}">Reject</button>
                  `:''}
                  ${p.status==='processing' ? `<button class="btn btn-success btn-xs" data-action="payout-paid" data-id="${p.id}">Mark Paid</button>`:''}
                </td>
              </tr>`).join('') || '<tr><td colspan="6" class="empty-row">No payouts</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>`;
}
function adminCoupons() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Coupons</span></div>
    <section class="page-header">
      <h1 class="page-title">🏷️ Coupons</h1>
      <button class="btn btn-primary" data-action="create-coupon"><i class="fas fa-plus"></i> New Coupon</button>
    </section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Code</th><th>Discount</th><th>Uses</th><th>Applies to</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${S.coupons.map(c => `
              <tr>
                <td><code class="code">${esc(c.code||'')}</code></td>
                <td>${c.discount_type==='percent' ? c.discount_value+'%' : fmtCur(c.discount_value)}</td>
                <td>${c.used_count||0}${c.max_uses?' / '+c.max_uses:''}</td>
                <td><span class="chip chip-neutral">${esc(c.applies_to)}</span></td>
                <td>${c.expires_at ? fmtDate(c.expires_at) : 'Never'}</td>
                <td><span class="${statusClass(c.active?'active':'disabled')}">${c.active?'Active':'Disabled'}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="toggle-coupon" data-id="${c.id}">Toggle</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-coupon" data-id="${c.id}">Delete</button>
                </td>
              </tr>`).join('') || '<tr><td colspan="7" class="empty-row">No coupons</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>`;
}
function adminClaims() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Claims</span></div>
    <section class="page-header"><h1 class="page-title">⚖️ Client Claims</h1></section>
    <section class="panel">
      ${S.claims.length ? S.claims.map(c => `
        <article class="claim-card">
          <header class="claim-header">
            <span class="claim-title">${esc(c.claim_title||'')}</span>
            <span class="${statusClass(c.status)}">${esc(c.status||'')}</span>
          </header>
          <p class="claim-desc">${esc(c.claim_description||'')}</p>
          ${c.claim_amount ? `<p class="claim-amount">Amount: ${fmtCur(c.claim_amount)}</p>` : ''}
          <footer class="claim-actions">
            ${c.status==='open' ? `
              <button class="btn btn-info btn-sm" data-action="claim-investigate" data-id="${c.id}">Investigate</button>
              <button class="btn btn-success btn-sm" data-action="claim-resolve" data-id="${c.id}">Resolve</button>
              <button class="btn btn-danger btn-sm" data-action="claim-reject" data-id="${c.id}">Reject</button>
            `:''}
          </footer>
        </article>`).join('') : '<p class="empty-row">No claims</p>'}
    </section>`;
}
function adminTickets() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Support</span></div>
    <section class="page-header"><h1 class="page-title">🎫 Support Tickets</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Ref</th><th>User</th><th>Subject</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${S.tickets.map(t => `
              <tr>
                <td><code class="code">${esc(t.reference||t.id)}</code></td>
                <td>${esc(t.user_name||'—')}</td>
                <td>${esc(t.subject||'')}</td>
                <td><span class="${statusClass(t.priority||'normal')}">${esc(t.priority||'')}</span></td>
                <td><span class="${statusClass(t.status)}">${esc(t.status||'')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-info btn-xs" data-action="ticket-view" data-id="${t.id}">View</button>
                  <button class="btn btn-success btn-xs" data-action="ticket-resolve" data-id="${t.id}">Resolve</button>
                </td>
              </tr>`).join('') || '<tr><td colspan="6" class="empty-row">No tickets</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>`;
}
function adminReviews() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Reviews</span></div>
    <section class="page-header"><h1 class="page-title">⭐ Reviews</h1></section>
    <section class="panel">
      ${S.reviews.length ? S.reviews.map(r => `
        <article class="review-card">
          <header class="review-header">
            <span class="review-author">${esc(r.author_name||'Anonymous')} → ${esc(r.expert_name||'Expert')}</span>
            <span class="star-rating">${'★'.repeat(r.rating||0)}${'☆'.repeat(5-(r.rating||0))}</span>
            <span class="${statusClass(r.status)}">${esc(r.status||'')}</span>
          </header>
          <p class="review-body">${esc(r.comment||'')}</p>
          <footer class="review-actions">
            ${r.status!=='published'?`<button class="btn btn-success btn-xs" data-action="review-publish" data-id="${r.id}">Publish</button>`:''}
            ${r.status!=='hidden'?`<button class="btn btn-danger btn-xs" data-action="review-hide" data-id="${r.id}">Hide</button>`:''}
          </footer>
        </article>`).join('') : '<p class="empty-row">No reviews</p>'}
    </section>`;
}
function adminBroadcasts() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Broadcasts</span></div>
    <section class="page-header"><h1 class="page-title">📢 Broadcasts</h1></section>
    <section class="panel">
      <h3 class="panel-title">Send a Broadcast</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Title</span><input id="broadcastTitle" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Audience</span>
          <select id="broadcastAudience" class="form-select">
            <option value="all">All users</option>
            <option value="experts">Experts only</option>
            <option value="learners">Learners only</option>
            <option value="admins">Admins only</option>
          </select></label>
        <label class="form-group form-group-full"><span class="form-label">Message</span>
          <textarea id="broadcastMessage" class="form-textarea" rows="4"></textarea></label>
      </div>
      <div class="panel-actions"><button class="btn btn-primary" data-action="send-broadcast"><i class="fas fa-paper-plane"></i> Send Broadcast</button></div>
    </section>`;
}
function adminAudit() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Audit</span></div>
    <section class="page-header"><h1 class="page-title">📜 Audit Log</h1></section>
    <section class="panel">
      <ul class="list-stack">
        ${S.auditLogs.map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.action||'')}</span>
              <span class="list-row-sub">target ${esc(l.target||'')}${l.target_id?' #'+l.target_id:''} · by ${esc(l.actor_name||'system')}</span>
            </div>
            <span class="list-row-meta">${fmtDT(l.created_at)}</span>
          </li>`).join('') || '<li class="empty-row">No entries</li>'}
      </ul>
    </section>`;
}
function adminAnalytics() {
  const t = S.analytics?.totals || {};
  const top = S.analytics?.topExperts || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Analytics</span></div>
    <section class="page-header"><h1 class="page-title">📈 Platform Analytics</h1></section>
    <section class="stat-grid">
      <div class="stat-card dashboard-card"><div class="stat-info"><p class="stat-label">Total Users</p><p class="stat-value">${t.total_users||0}</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-users"></i></div></div>
      <div class="stat-card dashboard-card"><div class="stat-info"><p class="stat-label">Total Revenue</p><p class="stat-value">${fmtCur(t.total_revenue||0)}</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div></div>
      <div class="stat-card dashboard-card"><div class="stat-info"><p class="stat-label">Published Courses</p><p class="stat-value">${t.published_courses||0}</p></div><div class="stat-icon stat-icon-purple"><i class="fas fa-book"></i></div></div>
      <div class="stat-card dashboard-card"><div class="stat-info"><p class="stat-label">Published Events</p><p class="stat-value">${t.published_events||0}</p></div><div class="stat-icon stat-icon-yellow"><i class="fas fa-calendar"></i></div></div>
    </section>
    <section class="panel-charts">
      <div class="chart-card"><h3 class="panel-title">User Growth</h3><canvas id="userGrowthChart" height="200"></canvas></div>
      <div class="chart-card"><h3 class="panel-title">Revenue</h3><canvas id="revenueChart" height="200"></canvas></div>
    </section>
    <section class="panel-charts">
      <div class="chart-card"><h3 class="panel-title">Users by Role</h3><canvas id="roleChart" height="200"></canvas></div>
      <div class="chart-card"><h3 class="panel-title">Top Experts</h3>
        <ul class="list-stack" style="margin-top:10px">
          ${top.map(e => `<li class="list-row"><div class="list-row-main"><span class="list-row-title">${esc(e.name)}</span><span class="list-row-sub">${e.average_rating||0} ⭐</span></div><span class="list-row-price">${fmtCur(e.total_earnings)}</span></li>`).join('') || '<li class="empty-row">No data</li>'}
        </ul>
      </div>
    </section>`;
}
function adminSettings() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Settings</span></div>
    <section class="page-header"><h1 class="page-title">⚙️ Settings</h1></section>
    <section class="panel">
      <h3 class="panel-title">Platform</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Platform name</span><input id="setPlatformName" class="form-input" value="ExpertHub" /></label>
        <label class="form-group"><span class="form-label">Support email</span><input id="setSupportEmail" class="form-input" value="support@experthub.com" /></label>
        <label class="form-group"><span class="form-label">Default currency</span>
          <select id="setCurrency" class="form-select"><option>USD</option><option>KES</option><option>NGN</option><option>EUR</option></select></label>
        <label class="form-group"><span class="form-label">Timezone</span>
          <select id="setTimezone" class="form-select"><option>UTC</option><option>Africa/Nairobi</option><option>Africa/Lagos</option></select></label>
      </div>
      <h3 class="panel-title" style="margin-top:20px">Commission & Payouts</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Consultation commission (%)</span><input id="setCommCons" type="number" class="form-input" value="20" /></label>
        <label class="form-group"><span class="form-label">Course commission (%)</span><input id="setCommCourse" type="number" class="form-input" value="20" /></label>
        <label class="form-group"><span class="form-label">Withdrawal hold (days)</span><input id="setHold" type="number" class="form-input" value="7" /></label>
        <label class="form-group"><span class="form-label">Minimum payout ($)</span><input id="setMinPayout" type="number" class="form-input" value="50" /></label>
      </div>
      <div class="panel-actions"><button class="btn btn-primary" data-action="save-settings">Save Settings</button></div>
    </section>`;
}
function adminProfile() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
    <section class="page-header"><h1 class="page-title">👤 My Profile</h1></section>
    <section class="panel">
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
        <div><h2 class="profile-name">${esc(currentUser?.name||'')}</h2><p class="profile-email">${esc(currentUser?.email||'')}</p></div>
      </div>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Full name</span><input id="profileName" class="form-input" value="${esc(currentUser?.name||'')}" /></label>
        <label class="form-group"><span class="form-label">Phone</span><input id="profilePhone" class="form-input" value="${esc(currentUser?.phone||'')}" /></label>
        <label class="form-group"><span class="form-label">Timezone</span><input id="profileTimezone" class="form-input" value="${esc(currentUser?.timezone||'UTC')}" /></label>
        <label class="form-group form-group-full"><span class="form-label">Change avatar</span><input type="file" id="avatarFile" class="form-input" accept="image/*" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="update-user-profile">Save Changes</button>
      </div>
      <h3 class="panel-title" style="margin-top:24px">Change Password</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Current password</span><input id="cpOld" type="password" class="form-input" /></label>
        <label class="form-group"><span class="form-label">New password</span><input id="cpNew" type="password" class="form-input" /></label>
      </div>
      <div class="panel-actions"><button class="btn btn-warning" data-action="change-password">Update Password</button></div>
    </section>`;
}

/* ============================================================
   EXPERT DASHBOARD
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
    ${sidebarItem('earnings','Earnings','fa-dollar-sign')}
    ${sidebarItem('withdrawals','Withdrawals','fa-money-bill-transfer')}
    ${sidebarItem('reviews','Reviews','fa-star')}
    ${sidebarItem('profile','Profile','fa-user')}
  `;
  shell({
    roleClass:'role-expert', brandIcon:'fa-user-tie',
    brandTitle:'Expert Panel', brandSubtitle:'ExpertHub',
    nav, roleLabel:'Expert Panel', content: renderExpertContent(),
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
  const st = S.expertStats || {};
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Dashboard</span></div>
    <section class="page-header"><h1 class="page-title">Welcome, ${esc(currentUser?.name||'Expert')}</h1></section>
    <section class="stat-grid">
      <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-value">${st.total_consultations ?? mine.length}</p><p class="stat-label">Consultations</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-comments"></i></div></div>
      <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-value">${active}</p><p class="stat-label">Active</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-clock"></i></div></div>
      <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-value">${fmtCur(S.earnings?.total_earned||0)}</p><p class="stat-label">Total earnings</p></div><div class="stat-icon stat-icon-yellow"><i class="fas fa-dollar-sign"></i></div></div>
      <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-value">${(currentUser?.average_rating||0).toFixed(1)}</p><p class="stat-label">Rating</p></div><div class="stat-icon stat-icon-purple"><i class="fas fa-star"></i></div></div>
    </section>
    <section class="dashboard-columns">
      <div class="panel">
        <h3 class="panel-title">Recent consultations</h3>
        ${mine.slice(0,5).map(c => `
          <div class="case-card">
            <header class="case-header"><h3 class="case-title">${esc(c.title||'')}</h3><span class="${statusClass(c.status)}">${esc(c.status||'')}</span></header>
            <p class="case-client">Client: ${esc(c.client_name||'Client')}</p>
            <footer class="case-footer"><button class="btn btn-primary btn-sm" data-action="open-chat" data-id="${c.id}"><i class="fas fa-comments"></i> Chat</button></footer>
          </div>`).join('') || '<p class="empty-row">No consultations yet</p>'}
      </div>
      <div class="panel">
        <h3 class="panel-title">Quick actions</h3>
        <button class="btn btn-primary btn-block" data-action="switch-tab" data-tab="availability"><i class="fas fa-clock"></i> Update availability</button>
        <button class="btn btn-success btn-block" data-action="switch-tab" data-tab="earnings"><i class="fas fa-money-bill"></i> Request withdrawal</button>
        <button class="btn btn-info btn-block" data-action="switch-tab" data-tab="reviews"><i class="fas fa-star"></i> View reviews</button>
      </div>
    </section>`;
}
function expertConsultations() {
  const mine = S.consultations.filter(c => c.expert_id === currentUser?.id);
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header"><h1 class="page-title">💬 My Consultations</h1></section>
    <section class="list-stack">
      ${mine.map(c => `
        <article class="case-card">
          <header class="case-header"><h3 class="case-title">${esc(c.title||'')}</h3><span class="${statusClass(c.status)}">${esc(c.status||'')}</span></header>
          <p class="case-client">Client: ${esc(c.client_name||'Client')}</p>
          <p class="case-type">${esc(c.consultation_type||'')} · Priority: ${esc(c.priority||'normal')}</p>
          <p class="case-desc" style="color:var(--text-muted);font-size:.9rem">${esc((c.description||'').slice(0,200))}</p>
          <footer class="case-footer">
            <button class="btn btn-primary btn-sm" data-action="open-chat" data-id="${c.id}"><i class="fas fa-comments"></i> Chat</button>
            <button class="btn btn-info btn-sm" data-action="video-call" data-id="${c.id}"><i class="fas fa-video"></i> Video call</button>
            ${c.status==='assigned' ? `<button class="btn btn-success btn-sm" data-action="consult-start" data-id="${c.id}">Start</button>` : ''}
            ${c.status==='in_progress' ? `<button class="btn btn-success btn-sm" data-action="consult-complete" data-id="${c.id}">Complete</button>` : ''}
          </footer>
        </article>`).join('') || '<p class="empty-row">No consultations assigned</p>'}
    </section>`;
}
function expertAvailability() {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const av = {};
  S.availability.forEach(a => { av[a.day_of_week] = a; });
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Availability</span></div>
    <section class="page-header"><h1 class="page-title">🕐 Availability Schedule</h1></section>
    <section class="panel">
      <h3 class="panel-title">Weekly availability</h3>
      <div class="availability-grid">
        ${days.map((d,i) => `
          <div class="availability-day">
            <div class="availability-day-header"><span class="availability-day-name">${d}</span></div>
            <div class="availability-hours">
              <input type="time" id="start-${i}" class="form-input" value="${av[i]?.start_time?.slice(0,5)||'09:00'}" />
              <span class="availability-sep">to</span>
              <input type="time" id="end-${i}" class="form-input" value="${av[i]?.end_time?.slice(0,5)||'17:00'}" />
            </div>
          </div>`).join('')}
      </div>
      <div class="panel-actions"><button class="btn btn-primary" data-action="save-availability">Save Availability</button></div>
    </section>
    <section class="panel">
      <h3 class="panel-title">Time off requests</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Start</span><input type="date" id="timeOffStart" class="form-input" /></label>
        <label class="form-group"><span class="form-label">End</span><input type="date" id="timeOffEnd" class="form-input" /></label>
        <label class="form-group form-group-full"><span class="form-label">Reason</span><input id="timeOffReason" class="form-input" /></label>
      </div>
      <div class="panel-actions"><button class="btn btn-warning" data-action="request-time-off">Submit Request</button></div>
      <ul class="list-stack" style="margin-top:20px">
        ${S.timeOff.map(t => `
          <li class="list-row">
            <div class="list-row-main"><span class="list-row-title">${fmtDate(t.start_date)} → ${fmtDate(t.end_date)}</span><span class="list-row-sub">${esc(t.reason||'')}</span></div>
            <span class="${statusClass(t.status)}">${esc(t.status)}</span>
          </li>`).join('') || '<li class="empty-row">No time off requests</li>'}
      </ul>
    </section>`;
}
function expertCalendar() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Calendar</span></div>
    <section class="page-header"><h1 class="page-title">📅 My Calendar</h1></section>
    <section class="panel">${renderCalendar()}</section>`;
}
function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells = [];
  for (let i=0;i<startDay;i++) cells.push({ day:'', other:true });
  for (let d=1;d<=daysInMonth;d++) cells.push({ day:d, date:new Date(year,month,d) });
  while (cells.length % 7) cells.push({ day:'', other:true });

  const eventsByDay = {};
  S.events.forEach(ev => {
    const d = new Date(ev.date||ev.created_at);
    if (d.getMonth()===month && d.getFullYear()===year) {
      const k = d.getDate();
      (eventsByDay[k] = eventsByDay[k] || []).push(ev);
    }
  });
  const today = new Date();
  return `
    <h3 class="panel-title">${now.toLocaleString('en-US',{month:'long',year:'numeric'})}</h3>
    <div class="calendar-header">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<span>${d}</span>`).join('')}</div>
    <div class="calendar-grid">
      ${cells.map(c => {
        const isToday = c.date && c.date.toDateString() === today.toDateString();
        const evs = c.day ? (eventsByDay[c.day]||[]) : [];
        return `<div class="calendar-cell ${c.other?'other-month':''} ${isToday?'today':''}">
          <div class="calendar-day-num">${c.day||''}</div>
          ${evs.slice(0,3).map(e => `<div class="calendar-event" title="${esc(e.title)}">${esc(e.title)}</div>`).join('')}
        </div>`;
      }).join('')}
    </div>`;
}
function expertCourses() {
  const mine = S.courses.filter(c => c.expert_id === currentUser?.id);
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Courses</span></div>
    <section class="page-header">
      <h1 class="page-title">📚 My Courses</h1>
      <button class="btn btn-primary" data-action="create-course-modal"><i class="fas fa-plus"></i> New Course</button>
    </section>
    <section class="card-grid">
      ${mine.map(c => `
        <article class="program-card">
          <span class="chip chip-blue">${esc(c.level||'beginner')}</span>
          <h4 class="program-title">${esc(c.title||'')}</h4>
          <p class="program-desc">${esc((c.description||'').slice(0,100))}</p>
          <footer class="program-footer"><span class="program-price">${fmtCur(c.price||0)}</span><span class="program-meta">${c.duration_weeks||c.duration_hours||0}${c.duration_weeks?'w':'h'}</span></footer>
        </article>`).join('') || '<p class="empty-row">No courses yet</p>'}
    </section>`;
}
function expertEvents() {
  const mine = S.events.filter(e => e.expert_id === currentUser?.id);
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Events</span></div>
    <section class="page-header"><h1 class="page-title">📅 My Events</h1></section>
    <section class="panel">
      ${mine.map(ev => `
        <article class="event-card">
          <div class="event-date"><span class="event-day">${new Date(ev.date||ev.created_at).getDate()}</span><span class="event-month">${new Date(ev.date||ev.created_at).toLocaleString('en-US',{month:'short'})}</span></div>
          <div class="event-body"><h4 class="event-title">${esc(ev.title||'')}</h4><p class="event-desc">${esc(ev.description||'')}</p></div>
        </article>`).join('') || '<p class="empty-row">No events assigned</p>'}
    </section>`;
}
function expertEarnings() {
  const s = S.earnings || {};
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Earnings</span></div>
    <section class="page-header"><h1 class="page-title">💰 My Earnings</h1></section>
    <section class="stat-grid">
      <div class="stat-card dashboard-card"><div class="stat-info"><p class="stat-label">Total earned</p><p class="stat-value">${fmtCur(s.total_earned||0)}</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div></div>
      <div class="stat-card dashboard-card"><div class="stat-info"><p class="stat-label">Available balance</p><p class="stat-value">${fmtCur(s.available_balance||0)}</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-wallet"></i></div></div>
      <div class="stat-card dashboard-card"><div class="stat-info"><p class="stat-label">Total paid out</p><p class="stat-value">${fmtCur(s.total_paid_out||0)}</p></div><div class="stat-icon stat-icon-purple"><i class="fas fa-money-bill-transfer"></i></div></div>
      <div class="stat-card dashboard-card"><div class="stat-info"><p class="stat-label">Pending</p><p class="stat-value">${fmtCur(s.pending_balance||0)}</p></div><div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div></div>
    </section>
    <div class="alert alert-info"><i class="fas fa-info-circle"></i> Platform commission: <strong>${CONFIG.PLATFORM_COMMISSION}%</strong> · Withdrawal hold: <strong>${CONFIG.WITHDRAWAL_HOLD_DAYS} days</strong></div>
    <section class="panel">
      <h3 class="panel-title">Request withdrawal</h3>
      <div class="form-inline">
        <input type="number" id="withdrawAmount" class="form-input" placeholder="Amount (min $${CONFIG.MIN_PAYOUT})" />
        <select id="withdrawMethod" class="form-select">
          <option value="bank_transfer">Bank Transfer</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="paypal">PayPal</option>
          <option value="stripe">Stripe</option>
        </select>
        <button class="btn btn-primary" data-action="request-withdrawal">Request</button>
      </div>
    </section>
    <section class="panel">
      <h3 class="panel-title">Recent wallet activity</h3>
      <ul class="list-stack">
        ${(S.wallet.ledger||[]).map(l => `
          <li class="list-row">
            <div class="list-row-main"><span class="list-row-title">${esc(l.reason||'')}</span><span class="list-row-sub">${fmtDT(l.created_at)}</span></div>
            <span class="list-row-price" style="color:${l.amount>=0?'var(--accent)':'var(--danger)'}">${l.amount>=0?'+':''}${fmtCur(l.amount)}</span>
          </li>`).join('') || '<li class="empty-row">No activity yet</li>'}
      </ul>
    </section>`;
}
function expertWithdrawals() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Withdrawals</span></div>
    <section class="page-header"><h1 class="page-title">💸 Withdrawals</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
          <tbody>
            ${S.payouts.map(w => `
              <tr>
                <td>${fmtDate(w.created_at)}</td>
                <td>${fmtCur(w.amount||0)}</td>
                <td>${esc(w.method||'')}</td>
                <td><span class="${statusClass(w.status)}">${esc(w.status||'')}</span></td>
              </tr>`).join('') || '<tr><td colspan="4" class="empty-row">No withdrawals yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>`;
}
function expertReviews() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Reviews</span></div>
    <section class="page-header"><h1 class="page-title">⭐ My Reviews</h1></section>
    <section class="panel">
      ${S.reviews.length ? S.reviews.map(r => `
        <article class="review-card">
          <header class="review-header">
            <span class="review-author">${esc(r.author_name||'Anonymous')}</span>
            <span class="star-rating">${'★'.repeat(r.rating||0)}${'☆'.repeat(5-(r.rating||0))}</span>
            <span class="review-date">${fmtDate(r.created_at)}</span>
          </header>
          <p class="review-body">${esc(r.comment||'')}</p>
          ${r.reply ? `<div class="alert alert-info" style="margin-top:10px"><i class="fas fa-reply"></i> <strong>Your reply:</strong> ${esc(r.reply)}</div>` : `<footer class="review-actions"><button class="btn btn-secondary btn-sm" data-action="reply-review" data-id="${r.id}">Reply</button></footer>`}
        </article>`).join('') : '<p class="empty-row">No reviews yet</p>'}
    </section>`;
}
function expertProfile() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
    <section class="page-header"><h1 class="page-title">👤 My Profile</h1></section>
    <section class="panel">
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
        <div><h2 class="profile-name">${esc(currentUser?.name||'')}</h2><p class="profile-email">${esc(currentUser?.email||'')}</p></div>
      </div>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Specialization</span><input id="profileSpecialization" class="form-input" value="${esc(currentUser?.specialization||'')}" /></label>
        <label class="form-group"><span class="form-label">Hourly rate ($)</span><input id="profileRate" type="number" class="form-input" value="${currentUser?.hourly_rate||''}" /></label>
        <label class="form-group form-group-full"><span class="form-label">Bio</span><textarea id="profileBio" class="form-textarea" rows="4">${esc(currentUser?.bio||'')}</textarea></label>
        <label class="form-group form-group-full"><span class="form-label">Change avatar</span><input type="file" id="avatarFile" class="form-input" accept="image/*" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="update-expert-profile">Update Profile</button>
      </div>
      <h3 class="panel-title" style="margin-top:24px">Change Password</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Current password</span><input id="cpOld" type="password" class="form-input" /></label>
        <label class="form-group"><span class="form-label">New password</span><input id="cpNew" type="password" class="form-input" /></label>
      </div>
      <div class="panel-actions"><button class="btn btn-warning" data-action="change-password">Update Password</button></div>
    </section>`;
}

/* ============================================================
   LEARNER DASHBOARD
   ============================================================ */
function renderUserDashboard() {
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  const nav = `
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}
    ${sidebarItem('eschool','E-School','fa-school')}
    ${sidebarItem('my-learning','My Learning','fa-graduation-cap')}
    ${sidebarItem('certificates','Certificates','fa-certificate')}
    ${sidebarItem('events','Events','fa-calendar-alt')}
    ${sidebarItem('experts','Find Experts','fa-search')}
    ${sidebarItem('consultations','My Consultations','fa-comments', mine.length)}
    ${sidebarItem('wallet','Wallet','fa-wallet')}
    ${sidebarItem('transactions','Transactions','fa-receipt')}
    ${sidebarItem('claims','Claims','fa-gavel')}
    ${sidebarItem('support','Support','fa-headset')}
    ${sidebarItem('profile','Profile','fa-user')}
  `;
  shell({
    roleClass:'role-learner', brandIcon:'fa-user-graduate',
    brandTitle:'Learner Panel', brandSubtitle:'ExpertHub',
    nav, roleLabel:'Learner Panel', content: renderUserContent(),
  });
  attachRoleEvents();
}
function renderUserContent() {
  switch (activeTab) {
    case 'dashboard':     return userOverview();
    case 'eschool':       return userESchool();
    case 'my-learning':   return userMyLearning();
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
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Dashboard</span></div>
    <section class="page-header"><h1 class="page-title">Welcome, ${esc(currentUser?.name||'Learner')}</h1></section>
    <section class="dashboard-columns">
      <article class="dashboard-card tile-card"><i class="fas fa-school tile-icon"></i><h3 class="tile-title">E-School</h3><p class="tile-desc">Bootcamps, courses, tuition & exam prep</p><button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">Explore</button></article>
      <article class="dashboard-card tile-card"><i class="fas fa-user-tie tile-icon"></i><h3 class="tile-title">Find experts</h3><p class="tile-desc">Book 1-on-1 consultations</p><button class="btn btn-success" data-action="switch-tab" data-tab="experts">Browse</button></article>
      <article class="dashboard-card tile-card"><i class="fas fa-comments tile-icon"></i><h3 class="tile-title">My consultations</h3><p class="tile-desc">Manage support requests</p><button class="btn btn-purple" data-action="switch-tab" data-tab="consultations">Open</button></article>
      <article class="dashboard-card tile-card"><i class="fas fa-certificate tile-icon"></i><h3 class="tile-title">Certificates</h3><p class="tile-desc">Your achievements</p><button class="btn btn-info" data-action="switch-tab" data-tab="certificates">View</button></article>
    </section>`;
}
function userESchool() {
  const tabs = [
    { id:'courses',    icon:'📚', label:'All Courses' },
    { id:'bootcamps',  icon:'🔥', label:'Bootcamps' },
    { id:'short_course',icon:'⚡', label:'Short Courses' },
    { id:'tuition',    icon:'👨‍🏫', label:'Tuition' },
    { id:'exam_prep',  icon:'📝', label:'Exam Prep' },
    { id:'career',     icon:'💼', label:'Career' },
  ];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>E-School</span></div>
    <section class="page-header"><h1 class="page-title">🎓 E-School Learning Hub</h1></section>
    <nav class="tab-bar">
      ${tabs.map(t => `<button class="tab-btn ${activeESchoolTab===t.id?'tab-btn-active':''}" data-eschool-tab="${t.id}">${t.icon} ${t.label}</button>`).join('')}
    </nav>
    <section class="panel" id="eschool-panel">${renderESchoolPanel()}</section>`;
}
function renderESchoolPanel() {
  const filter = activeESchoolTab === 'courses' ? null : activeESchoolTab;
  const list = filter ? S.courses.filter(c => c.course_type === filter) : S.courses;
  if (!list.length) return '<div class="empty-state"><i class="fas fa-book-open"></i><h3>No courses available</h3><p>Check back soon!</p></div>';
  return `
    <div class="card-grid">
      ${list.map(c => `
        <article class="program-card">
          <span class="chip chip-blue">${esc(c.course_type?.replace('_',' '))}</span>
          <h4 class="program-title">${esc(c.title||'')}</h4>
          <p class="program-desc">${esc((c.description||'').slice(0,110))}</p>
          <footer class="program-footer">
            <span class="program-price">${fmtCur(c.price||0)}</span>
            <span class="program-meta">${c.duration_weeks?c.duration_weeks+'w':c.duration_hours+'h'} · ${esc(c.level)}</span>
          </footer>
          <button class="btn btn-primary btn-block" data-action="enroll-modal" data-id="${c.id}">Enroll</button>
        </article>`).join('')}
    </div>`;
}
function userMyLearning() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Learning</span></div>
    <section class="page-header"><h1 class="page-title">🎓 My Learning</h1></section>
    <section class="panel">
      ${S.enrollments.length ? S.enrollments.map(e => `
        <article class="enrollment-card">
          <h3 class="enrollment-title">${esc(e.title||'')}</h3>
          <p class="enrollment-type">${esc(e.enrollment_type||'')}</p>
          <div class="progress-bar"><span style="width:${e.progress||0}%"></span></div>
          <p class="enrollment-progress">${e.progress||0}% complete</p>
          <button class="btn btn-primary btn-sm" data-action="update-progress" data-id="${e.id}" data-current="${e.progress||0}">Update progress</button>
        </article>`).join('') : '<div class="empty-state"><i class="fas fa-graduation-cap"></i><h3>No enrollments</h3><p>Explore the E-School to start learning.</p><button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">Explore courses</button></div>'}
    </section>`;
}
function userCertificates() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Certificates</span></div>
    <section class="page-header"><h1 class="page-title">🏆 My Certificates</h1></section>
    <section class="panel">
      ${S.certificates.length ? S.certificates.map(c => `
        <div class="case-card">
          <h3 class="case-title">${esc(c.course_title||'')}</h3>
          <p class="case-type">Serial: <code class="code">${esc(c.serial||'')}</code> · Issued: ${fmtDate(c.issued_at)}</p>
          <button class="btn btn-secondary btn-sm" data-action="print-certificate" data-id="${c.id}">Print / Save</button>
        </div>`).join('') : '<div class="empty-state"><i class="fas fa-certificate"></i><h3>No certificates yet</h3><p>Complete a course to earn your first certificate.</p></div>'}
    </section>`;
}
function userEvents() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Events</span></div>
    <section class="page-header"><h1 class="page-title">📅 Events</h1></section>
    <section class="panel">
      ${S.events.map(ev => `
        <article class="event-card">
          <div class="event-date"><span class="event-day">${new Date(ev.date||ev.created_at).getDate()}</span><span class="event-month">${new Date(ev.date||ev.created_at).toLocaleString('en-US',{month:'short'})}</span></div>
          <div class="event-body">
            <h4 class="event-title">${esc(ev.title||'')}</h4>
            <p class="event-desc">${esc(ev.description||'')}</p>
            <p class="event-meta">${ev.registered_count||0}/${ev.capacity||0} registered · ${ev.price>0?fmtCur(ev.price):'Free'}</p>
          </div>
          <div class="event-actions">
            <button class="btn btn-primary btn-sm" data-action="register-event" data-id="${ev.id}">Register</button>
          </div>
        </article>`).join('') || '<p class="empty-row">No events</p>'}
    </section>`;
}
function userFindExperts() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Experts</span></div>
    <section class="page-header"><h1 class="page-title">🔍 Find Experts</h1></section>
    <section class="card-grid">
      ${S.experts.map(e => `
        <article class="expert-card">
          <img class="expert-avatar" src="${avatar(e)}" alt="" />
          <h4 class="expert-name">${esc(e.name||'')}</h4>
          <p class="expert-expertise">${esc(e.specialization||'—')}</p>
          <p class="expert-rate">${fmtCur(e.hourly_rate||0)}/hr</p>
          <p class="expert-rating">${'★'.repeat(Math.round(e.average_rating||0))} <span class="expert-rating-value">${(e.average_rating||0).toFixed(1)}</span></p>
          <button class="btn btn-primary btn-block" data-action="book-expert" data-id="${e.id}" data-name="${esc(e.name||'')}">Book Consultation</button>
        </article>`).join('') || '<p class="empty-row">No experts available</p>'}
    </section>`;
}
function userConsultations() {
  const mine = S.consultations.filter(c => c.user_id === currentUser?.id);
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header">
      <h1 class="page-title">💬 My Consultations</h1>
      <button class="btn btn-primary" data-action="new-consultation"><i class="fas fa-plus"></i> New Request</button>
    </section>
    <section class="list-stack">
      ${mine.map(c => `
        <article class="case-card">
          <header class="case-header"><h3 class="case-title">${esc(c.title||'')}</h3><span class="${statusClass(c.status)}">${esc(c.status||'')}</span></header>
          <p class="case-type">${esc(c.consultation_type||'')} · Expert: ${esc(c.expert_name||'Unassigned')}</p>
          <footer class="case-footer">
            <button class="btn btn-primary btn-sm" data-action="open-chat" data-id="${c.id}"><i class="fas fa-comments"></i> Chat</button>
            ${c.status==='completed' ? `<button class="btn btn-success btn-sm" data-action="review-expert" data-id="${c.id}" data-expert="${c.expert_id}">Rate expert</button>` : ''}
            <button class="btn btn-secondary btn-sm" data-action="file-claim" data-id="${c.id}">File claim</button>
          </footer>
        </article>`).join('') || '<div class="empty-state"><i class="fas fa-comments"></i><h3>No consultations yet</h3><p>Book your first expert session.</p><button class="btn btn-primary" data-action="switch-tab" data-tab="experts">Find experts</button></div>'}
    </section>`;
}
function userWallet() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Wallet</span></div>
    <section class="page-header"><h1 class="page-title">👛 My Wallet</h1></section>
    <div class="wallet-balance">
      <p class="wallet-balance-label">Available balance</p>
      <p class="wallet-balance-value">${fmtCur(S.wallet.balance||0)}</p>
    </div>
    <section class="panel">
      <h3 class="panel-title">Add funds</h3>
      <div class="form-inline">
        <input id="topupAmount" type="number" class="form-input" placeholder="Amount ($)" />
        <select id="topupProvider" class="form-select">
          ${CONFIG.PAYMENT_PROVIDERS.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
        <button class="btn btn-primary" data-action="topup-wallet">Add Funds</button>
      </div>
      <p class="panel-hint" style="margin-top:10px">Demo mode: top-ups are instantly credited.</p>
    </section>
    <section class="panel">
      <h3 class="panel-title">Ledger</h3>
      <ul class="list-stack">
        ${(S.wallet.ledger||[]).map(l => `
          <li class="list-row">
            <div class="list-row-main"><span class="list-row-title">${esc(l.reason||'')}</span><span class="list-row-sub">${fmtDT(l.created_at)}</span></div>
            <span class="list-row-price" style="color:${l.amount>=0?'var(--accent)':'var(--danger)'}">${l.amount>=0?'+':''}${fmtCur(l.amount)}</span>
          </li>`).join('') || '<li class="empty-row">No activity</li>'}
      </ul>
    </section>`;
}
function userTransactions() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Transactions</span></div>
    <section class="page-header"><h1 class="page-title">🧾 Transactions</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Reference</th><th>Description</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${S.transactions.map(t => `
              <tr>
                <td><code class="code">${esc(t.reference||t.id)}</code></td>
                <td>${esc(t.description||'')}</td>
                <td>${fmtCur(t.amount||0)}</td>
                <td><span class="${statusClass(t.status)}">${esc(t.status||'')}</span></td>
                <td>${fmtDT(t.created_at)}</td>
              </tr>`).join('') || '<tr><td colspan="5" class="empty-row">No transactions</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>`;
}
function userClaims() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Claims</span></div>
    <section class="page-header"><h1 class="page-title">⚖️ My Claims</h1></section>
    <section class="panel">
      ${S.claims.length ? S.claims.map(c => `
        <article class="claim-card">
          <header class="claim-header">
            <span class="claim-title">${esc(c.claim_title||'')}</span>
            <span class="${statusClass(c.status)}">${esc(c.status||'')}</span>
          </header>
          <p class="claim-desc">${esc(c.claim_description||'')}</p>
          ${c.resolution ? `<div class="alert alert-info"><strong>Resolution:</strong> ${esc(c.resolution)}</div>` : ''}
        </article>`).join('') : '<div class="empty-state"><i class="fas fa-gavel"></i><h3>No claims</h3><p>Nothing to see here.</p></div>'}
    </section>`;
}
function userSupport() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Support</span></div>
    <section class="page-header">
      <h1 class="page-title">🎧 Support</h1>
      <button class="btn btn-primary" data-action="new-ticket"><i class="fas fa-plus"></i> New Ticket</button>
    </section>
    <section class="panel">
      ${S.tickets.length ? S.tickets.map(t => `
        <article class="ticket-card">
          <header class="ticket-header">
            <span class="ticket-ref"><code class="code">${esc(t.reference||t.id)}</code></span>
            <span class="${statusClass(t.status)}">${esc(t.status||'')}</span>
          </header>
          <h4 class="ticket-subject">${esc(t.subject||'')}</h4>
          <p class="ticket-desc">${esc(t.description||'')}</p>
          <footer class="ticket-actions">
            <button class="btn btn-secondary btn-sm" data-action="ticket-view" data-id="${t.id}">View / Reply</button>
          </footer>
        </article>`).join('') : '<div class="empty-state"><i class="fas fa-headset"></i><h3>No tickets</h3><p>Need help? Create a ticket.</p></div>'}
    </section>`;
}
function userProfile() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
    <section class="page-header"><h1 class="page-title">👤 My Profile</h1></section>
    <section class="panel">
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
        <div><h2 class="profile-name">${esc(currentUser?.name||'')}</h2><p class="profile-email">${esc(currentUser?.email||'')}</p></div>
      </div>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Full name</span><input id="profileName" class="form-input" value="${esc(currentUser?.name||'')}" /></label>
        <label class="form-group"><span class="form-label">Phone</span><input id="profilePhone" class="form-input" value="${esc(currentUser?.phone||'')}" /></label>
        <label class="form-group"><span class="form-label">Timezone</span><input id="profileTimezone" class="form-input" value="${esc(currentUser?.timezone||'UTC')}" /></label>
        <label class="form-group form-group-full"><span class="form-label">Change avatar</span><input type="file" id="avatarFile" class="form-input" accept="image/*" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="update-user-profile">Save Changes</button>
      </div>
      <h3 class="panel-title" style="margin-top:24px">Change Password</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Current password</span><input id="cpOld" type="password" class="form-input" /></label>
        <label class="form-group"><span class="form-label">New password</span><input id="cpNew" type="password" class="form-input" /></label>
      </div>
      <div class="panel-actions"><button class="btn btn-warning" data-action="change-password">Update Password</button></div>
    </section>`;
}

/* ============================================================
   CHAT MODAL
   ============================================================ */
function renderChatModal() {
  return `
    <div id="chat-modal" class="modal-overlay hidden">
      <div class="modal-content chat-modal">
        <header class="chat-header">
          <div><h3 class="chat-title" id="chat-title">Consultation</h3><p class="chat-sub" id="chat-sub"></p></div>
          <div class="chat-header-actions">
            <button class="icon-btn" data-action="open-video" title="Video call"><i class="fas fa-video"></i></button>
            <button class="icon-btn" data-chat-close title="Close"><i class="fas fa-times"></i></button>
          </div>
        </header>
        <div id="chat-messages" class="chat-messages"></div>
        <div class="chat-typing" id="chat-typing"></div>
        <div class="chat-input-row">
          <label class="chat-attach"><i class="fas fa-paperclip"></i><input type="file" hidden id="chat-file" /></label>
          <input id="chat-input" class="form-input" placeholder="Type your message…" />
          <button class="btn btn-primary" data-action="send-chat"><i class="fas fa-paper-plane"></i></button>
        </div>
      </div>
    </div>`;
}
function renderChatMessages(cid) {
  const c = $('#chat-messages'); if (!c) return;
  const msgs = S.chatMessages[cid] || [];
  c.innerHTML = msgs.map(m => `
    <div class="chat-message ${m.sender_id === currentUser?.id ? 'chat-message-sent' : 'chat-message-received'}">
      ${m.attachment_url ? `<a class="chat-attachment" href="${esc(m.attachment_url)}" target="_blank"><i class="fas fa-paperclip"></i> Attachment</a>` : ''}
      <p class="chat-text">${esc(m.message||'')}</p>
      <span class="chat-meta">${esc(m.sender_name||'')} · ${timeAgo(m.created_at)}${m.read_at?' ✓✓':''}</span>
    </div>`).join('') || '<p class="empty-row">No messages yet. Say hi 👋</p>';
  c.scrollTop = c.scrollHeight;
}
async function openChat(cid) {
  currentChatId = cid;
  const modal = $('#chat-modal'); if (!modal) return;
  modal.classList.remove('hidden');
  const c = S.consultations.find(x => x.id === cid);
  $('#chat-title').textContent = c?.title || 'Consultation';
  $('#chat-sub').textContent = `${c?.status||''} · ${c?.consultation_type||''}`;
  if (socket) socket.emit('join_consultation', cid);
  try {
    const d = await apiCall(`/api/common/consultations/${cid}/messages`);
    S.chatMessages[cid] = d.messages || [];
  } catch { S.chatMessages[cid] = []; }
  renderChatMessages(cid);
  const input = $('#chat-input');
  input.onkeydown = e => {
    if (e.key === 'Enter') { sendMessage(cid, e.target.value); return; }
    if (socket) socket.emit('typing', { consultation_id:cid, is_typing:true });
    clearTimeout(chatTypingTimer);
    chatTypingTimer = setTimeout(() => socket && socket.emit('typing', { consultation_id:cid, is_typing:false }), 1200);
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
    await apiCall(`/api/common/consultations/${cid}/messages`,'POST',{ message:text });
    const i = $('#chat-input'); if (i) i.value = '';
  } catch (e) { showToast(e.message,'error'); }
}
async function uploadChatFile(cid, file) {
  if (!file) return;
  const fd = new FormData(); fd.append('attachments', file);
  try {
    showLoading(true);
    await apiCall(`/api/common/consultations/${cid}/attachments`,'POST',fd,true);
    showToast('File uploaded','success');
  } catch (e) { showToast(e.message,'error'); }
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
      showToast(ex.message || 'Action failed','error');
    }
  };
  document.addEventListener('click', roleClickHandler);

  // Sidebar eschool tab clicks
  document.querySelectorAll('[data-eschool-tab]').forEach(btn => btn.onclick = () => {
    activeESchoolTab = btn.dataset.eschoolTab;
    $$('[data-eschool-tab]').forEach(x => x.classList.remove('tab-btn-active'));
    btn.classList.add('tab-btn-active');
    const p = $('#eschool-panel'); if (p) p.innerHTML = renderESchoolPanel();
  });

  document.querySelectorAll('[data-chat-close]').forEach(b => b.onclick = closeChat);
  renderCharts();
}

async function handleAction(action, id, el) {
  switch (action) {
    /* ---------- Common ---------- */
    case 'switch-tab':
      activeTab = el.dataset.tab; return rerenderRoleContent();
    case 'refresh-all':
      showLoading(true);
      await loadAllData();
      rerenderRoleContent();
      showLoading(false);
      return showToast('Refreshed','success');
    case 'export-dashboard': return downloadCsv('dashboard-users.csv', S.users);
    case 'export-users':     return downloadCsv('users.csv', S.users);
    case 'help':             return showToast('Support: support@experthub.com','info');

    /* ---------- Admin - Users ---------- */
    case 'approve-user':
      await apiCall(`/api/admin/users/${id}/approve`,'PUT');
      await reloadUsers(); showToast('User approved','success'); return rerenderRoleContent();
    case 'suspend-user':
      await apiCall(`/api/admin/users/${id}/suspend`,'PUT');
      await reloadUsers(); showToast('User suspended','success'); return rerenderRoleContent();
    case 'reject-user': {
      const reason = prompt('Reason for rejection?') || '';
      await apiCall(`/api/admin/users/${id}/reject`,'PUT',{ reason });
      await reloadUsers(); showToast('User rejected','warning'); return rerenderRoleContent();
    }
    case 'delete-user': {
      if (!await confirmDialog('Delete this user permanently?')) return;
      await apiCall(`/api/admin/users/${id}`,'DELETE');
      await reloadUsers(); showToast('User deleted','success'); return rerenderRoleContent();
    }
    case 'edit-user': {
      const u = S.users.find(x => String(x.id) === id);
      if (!u) return;
      openModal({
        title:`Edit ${u.name}`,
        body:`
          <label class="form-group"><span class="form-label">Name</span><input id="euName" class="form-input" value="${esc(u.name||'')}" /></label>
          <label class="form-group"><span class="form-label">Role</span>
            <select id="euRole" class="form-select">
              <option value="learner" ${u.role==='learner'?'selected':''}>Learner</option>
              <option value="expert" ${u.role==='expert'?'selected':''}>Expert</option>
              <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
            </select></label>
          <label class="form-group"><span class="form-label">Status</span>
            <select id="euStatus" class="form-select">
              <option value="active" ${u.status==='active'?'selected':''}>Active</option>
              <option value="pending" ${u.status==='pending'?'selected':''}>Pending</option>
              <option value="suspended" ${u.status==='suspended'?'selected':''}>Suspended</option>
            </select></label>`,
        footer:`<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="euSave" class="btn btn-primary">Save</button>`,
      });
      $('#euSave').onclick = async () => {
        await apiCall(`/api/admin/users/${id}`,'PUT',{
          name: $('#euName').value,
          role: $('#euRole').value,
          status: $('#euStatus').value,
        });
        closeModal(); await reloadUsers(); showToast('User updated','success'); rerenderRoleContent();
      };
      return;
    }

    /* ---------- Admin - Experts ---------- */
    case 'show-create-expert': $('#createExpertPanel')?.classList.remove('hidden'); return;
    case 'hide-create-expert': $('#createExpertPanel')?.classList.add('hidden'); return;
    case 'submit-create-expert': {
      const name = $('#newExpertName').value, email = $('#newExpertEmail').value;
      const spec = $('#newExpertSpec').value, rate = Number($('#newExpertRate').value||0);
      const bio = $('#newExpertBio').value, phone = $('#newExpertPhone').value;
      if (!name || !email) return showToast('Name and email required','error');
      showLoading(true);
      const d = await apiCall('/api/admin/experts/create','POST',{ name,email,specialization:spec,hourly_rate:rate,bio,phone });
      await loadAllData();
      rerenderRoleContent();
      showLoading(false);
      showToast(`Expert created. Temp password: ${d.temp_password}`,'success', 8000);
      return;
    }

    /* ---------- Admin - Consultations ---------- */
    case 'assign-consultation': {
      const expertOpts = S.experts.map(e => `<option value="${e.id}">${esc(e.name)} (${esc(e.specialization||'')})</option>`).join('');
      openModal({
        title:'Assign Expert',
        body:`<label class="form-group"><span class="form-label">Expert</span><select id="assignExp" class="form-select">${expertOpts}</select></label>`,
        footer:`<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="assignSave" class="btn btn-primary">Assign</button>`,
      });
      $('#assignSave').onclick = async () => {
        await apiCall(`/api/common/consultations/${id}/assign`,'PUT',{ expert_id: Number($('#assignExp').value) });
        closeModal(); await reloadConsultations(); showToast('Expert assigned','success'); rerenderRoleContent();
      };
      return;
    }
    case 'view-consultation':
      return showConsultationModal(id);
    case 'consult-start':
      await apiCall(`/api/common/consultations/${id}/status`,'PUT',{ status:'in_progress' });
      await reloadConsultations(); return rerenderRoleContent();
    case 'consult-complete':
      await apiCall(`/api/common/consultations/${id}/status`,'PUT',{ status:'completed' });
      await reloadConsultations(); return showToast('Consultation marked completed','success'), rerenderRoleContent();

    /* ---------- Admin - Events ---------- */
    case 'create-event': return openEventModal();
    case 'edit-event':   return openEventModal(id);
    case 'delete-event': {
      if (!await confirmDialog('Delete this event?')) return;
      await apiCall(`/api/admin/events/${id}`,'DELETE');
      await loadAllData(); return showToast('Event deleted','success'), rerenderRoleContent();
    }

    /* ---------- Admin - Payouts ---------- */
    case 'payout-approve': await apiCall(`/api/admin/payouts/${id}`,'PUT',{ status:'approved' }); return reloadPayoutsAndRerender('Payout approved');
    case 'payout-process': await apiCall(`/api/admin/payouts/${id}`,'PUT',{ status:'processing' }); return reloadPayoutsAndRerender('Payout processing');
    case 'payout-paid':    await apiCall(`/api/admin/payouts/${id}`,'PUT',{ status:'paid' });       return reloadPayoutsAndRerender('Payout marked paid');
    case 'payout-reject': {
      const reason = prompt('Rejection reason?') || '';
      await apiCall(`/api/admin/payouts/${id}`,'PUT',{ status:'rejected', reason });
      return reloadPayoutsAndRerender('Payout rejected');
    }

    /* ---------- Admin - Coupons ---------- */
    case 'create-coupon': {
      openModal({
        title:'New Coupon',
        body:`
          <label class="form-group"><span class="form-label">Code</span><input id="cpCode" class="form-input" placeholder="WELCOME10" /></label>
          <label class="form-group"><span class="form-label">Type</span>
            <select id="cpType" class="form-select"><option value="percent">Percent</option><option value="fixed">Fixed</option></select></label>
          <label class="form-group"><span class="form-label">Value</span><input id="cpValue" type="number" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Max uses (optional)</span><input id="cpMax" type="number" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Min spend</span><input id="cpMin" type="number" class="form-input" value="0" /></label>
          <label class="form-group"><span class="form-label">Applies to</span>
            <select id="cpApply" class="form-select">
              <option value="all">All</option>
              <option value="bootcamp">Bootcamps</option>
              <option value="short_course">Short courses</option>
              <option value="event">Events</option>
              <option value="consultation">Consultations</option>
            </select></label>`,
        footer:`<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="cpSave" class="btn btn-primary">Create</button>`,
      });
      $('#cpSave').onclick = async () => {
        try {
          await apiCall('/api/admin/coupons','POST',{
            code: $('#cpCode').value, discount_type: $('#cpType').value,
            discount_value: Number($('#cpValue').value||0),
            max_uses: $('#cpMax').value ? Number($('#cpMax').value) : null,
            min_spend: Number($('#cpMin').value||0),
            applies_to: $('#cpApply').value,
          });
          closeModal(); await loadAllData(); showToast('Coupon created','success'); rerenderRoleContent();
        } catch (e) { showToast(e.message,'error'); }
      };
      return;
    }
    case 'toggle-coupon':
      await apiCall(`/api/admin/coupons/${id}/toggle`,'PUT');
      await loadAllData(); return rerenderRoleContent();
    case 'delete-coupon': {
      if (!await confirmDialog('Delete this coupon?')) return;
      await apiCall(`/api/admin/coupons/${id}`,'DELETE');
      await loadAllData(); return rerenderRoleContent();
    }

    /* ---------- Admin - Claims / Tickets / Reviews ---------- */
    case 'claim-investigate': await apiCall(`/api/admin/claims/${id}`,'PUT',{ status:'investigating' }); return loadAllData().then(() => rerenderRoleContent());
    case 'claim-resolve': {
      const resolution = prompt('Resolution details?') || '';
      await apiCall(`/api/admin/claims/${id}`,'PUT',{ status:'resolved', resolution });
      await loadAllData(); return showToast('Claim resolved','success'), rerenderRoleContent();
    }
    case 'claim-reject': {
      const resolution = prompt('Rejection reason?') || '';
      await apiCall(`/api/admin/claims/${id}`,'PUT',{ status:'rejected', resolution });
      await loadAllData(); return showToast('Claim rejected','warning'), rerenderRoleContent();
    }
    case 'ticket-view': return openTicketModal(id);
    case 'ticket-resolve': await apiCall(`/api/admin/tickets/${id}`,'PUT',{ status:'resolved' }); return loadAllData().then(() => { showToast('Ticket resolved','success'); rerenderRoleContent(); });
    case 'review-publish': await apiCall(`/api/admin/reviews/${id}`,'PUT',{ status:'published' }); return loadAllData().then(() => rerenderRoleContent());
    case 'review-hide':    await apiCall(`/api/admin/reviews/${id}`,'PUT',{ status:'hidden' });    return loadAllData().then(() => rerenderRoleContent());

    /* ---------- Broadcast ---------- */
    case 'send-broadcast': {
      const title = $('#broadcastTitle').value, message = $('#broadcastMessage').value, audience = $('#broadcastAudience').value;
      if (!title || !message) return showToast('Fill title and message','error');
      showLoading(true);
      const d = await apiCall('/api/admin/notifications/broadcast','POST',{ title, message, audience });
      showLoading(false);
      return showToast(`Broadcast sent to ${d.sent} users`,'success');
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
      await apiCall('/api/admin/settings','PUT',{ settings });
      return showToast('Settings saved','success');
    }

    /* ---------- Learner actions ---------- */
    case 'enroll-modal': return openEnrollModal(id);
    case 'update-progress': return openProgressModal(id, Number(el.dataset.current||0));
    case 'new-consultation': return openNewConsultationModal();
    case 'book-expert':      return openBookingModal(id, el.dataset.name);
    case 'file-claim':       return openClaimModal(id);
    case 'new-ticket':       return openNewTicketModal();
    case 'register-event':
      await apiCall(`/api/common/events/${id}/register`,'POST');
      await loadAllData(); showToast('Registered for event','success'); return rerenderRoleContent();
    case 'topup-wallet': {
      const amount = Number($('#topupAmount').value||0);
      const provider = $('#topupProvider').value;
      if (!amount || amount<=0) return showToast('Enter a valid amount','error');
      showLoading(true);
      await apiCall('/api/user/wallet/topup','POST',{ amount, provider });
      await reloadWallet();
      showLoading(false);
      showToast('Funds added','success'); return rerenderRoleContent();
    }
    case 'review-expert': return openReviewModal(id, Number(el.dataset.expert));
    case 'print-certificate': {
      const c = S.certificates.find(x => String(x.id) === id);
      if (!c) return;
      openModal({
        title:'Certificate',
        body:`<div style="text-align:center;padding:20px;border:3px double var(--brand);border-radius:12px">
          <h2>Certificate of Completion</h2>
          <p style="font-size:1.1rem;margin:20px 0">This certifies that</p>
          <h3 style="font-size:1.5rem;color:var(--brand)">${esc(currentUser?.name||'')}</h3>
          <p style="margin:20px 0">has successfully completed</p>
          <h4>${esc(c.course_title||'')}</h4>
          <p style="margin-top:20px;font-size:.85rem;color:var(--text-muted)">Serial: ${esc(c.serial)} · Issued: ${fmtDate(c.issued_at)}</p>
        </div>`,
        footer:`<button class="btn btn-secondary" data-close-modal>Close</button><button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print</button>`,
      });
      return;
    }

    /* ---------- Expert actions ---------- */
    case 'open-chat': return openChat(Number(id));
    case 'video-call': return openVideoCall(id);
    case 'open-video': return openVideoCall(currentChatId);
    case 'save-availability': {
      const schedule = [];
      for (let i=0;i<7;i++) {
        const s = document.getElementById(`start-${i}`)?.value;
        const en = document.getElementById(`end-${i}`)?.value;
        if (s && en) schedule.push({ day:i, start:s, end:en });
      }
      await apiCall('/api/expert/availability','PUT',{ schedule });
      return showToast('Availability saved','success');
    }
    case 'request-time-off': {
      const s = $('#timeOffStart').value, en = $('#timeOffEnd').value, r = $('#timeOffReason').value;
      if (!s || !en) return showToast('Select dates','error');
      await apiCall('/api/expert/time-off','POST',{ start_date:s, end_date:en, reason:r });
      await loadAllData(); return showToast('Time off requested','success'), rerenderRoleContent();
    }
    case 'request-withdrawal': {
      const amount = Number($('#withdrawAmount').value||0);
      const method = $('#withdrawMethod').value;
      if (!amount || amount<=0) return showToast('Enter a valid amount','error');
      showLoading(true);
      await apiCall('/api/expert/withdrawals','POST',{ amount, method });
      await loadAllData();
      showLoading(false);
      return showToast('Withdrawal requested','success'), rerenderRoleContent();
    }
    case 'reply-review': {
      const reply = prompt('Your reply:') || '';
      if (!reply.trim()) return;
      await apiCall(`/api/expert/reviews/${id}/reply`,'POST',{ reply });
      await loadAllData(); return showToast('Reply posted','success'), rerenderRoleContent();
    }
    case 'update-expert-profile': {
      await apiCall('/api/expert/profile','PUT',{
        specialization:$('#profileSpecialization').value,
        hourly_rate: Number($('#profileRate').value||0),
        bio:$('#profileBio').value,
      });
      await apiCall('/api/auth/me');
      return showToast('Profile updated','success');
    }
    case 'create-course-modal': {
      openModal({
        title:'New Course',
        body:`
          <label class="form-group"><span class="form-label">Title</span><input id="ccTitle" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Description</span><textarea id="ccDesc" class="form-textarea" rows="3"></textarea></label>
          <label class="form-group"><span class="form-label">Type</span>
            <select id="ccType" class="form-select">
              <option value="short_course">Short course</option><option value="bootcamp">Bootcamp</option>
              <option value="tuition">Tuition</option><option value="exam_prep">Exam prep</option><option value="career">Career</option>
            </select></label>
          <label class="form-group"><span class="form-label">Level</span>
            <select id="ccLevel" class="form-select"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
          <label class="form-group"><span class="form-label">Price ($)</span><input id="ccPrice" type="number" class="form-input" /></label>`,
        footer:`<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="ccSave" class="btn btn-primary">Create</button>`,
      });
      $('#ccSave').onclick = async () => {
        try {
          await apiCall('/api/expert/courses','POST',{
            title:$('#ccTitle').value, description:$('#ccDesc').value,
            course_type:$('#ccType').value, level:$('#ccLevel').value,
            price:Number($('#ccPrice').value||0),
          });
          closeModal(); await loadAllData(); rerenderRoleContent();
          showToast('Course created','success');
        } catch (e) { showToast(e.message,'error'); }
      };
      return;
    }

    /* ---------- Profile generic ---------- */
    case 'update-user-profile': {
      await apiCall('/api/user/profile','PUT',{
        name:$('#profileName')?.value,
        phone:$('#profilePhone')?.value,
        timezone:$('#profileTimezone')?.value,
      });
      const me = await apiCall('/api/auth/me');
      currentUser = me.user;
      localStorage.setItem('user', JSON.stringify(currentUser));
      return showToast('Profile updated','success');
    }
    case 'change-password': {
      const oldp = $('#cpOld').value, newp = $('#cpNew').value;
      if (!oldp || newp.length < 8) return showToast('New password must be 8+ chars','error');
      await apiCall('/api/auth/password','PUT',{ old_password: oldp, new_password: newp });
      $('#cpOld').value = ''; $('#cpNew').value = '';
      return showToast('Password updated','success');
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
  showToast(msg,'success');
  rerenderRoleContent();
}

function rerenderRoleContent() {
  const el = $('#role-content');
  if (!el) return;
  el.innerHTML = currentUserRole === 'admin'   ? renderAdminContent()
              : currentUserRole === 'expert'   ? renderExpertContent()
                                               : renderUserContent();
  attachSidebarEvents();
  renderCharts();
}

/* ---------- Modals ---------- */
function showConsultationModal(id) {
  const c = S.consultations.find(x => String(x.id) === id);
  if (!c) return;
  openModal({
    title: c.title || 'Consultation',
    body:`
      <p><strong>Client:</strong> ${esc(c.client_name||'—')}</p>
      <p><strong>Expert:</strong> ${esc(c.expert_name||'Unassigned')}</p>
      <p><strong>Status:</strong> <span class="${statusClass(c.status)}">${esc(c.status)}</span></p>
      <p><strong>Type:</strong> ${esc(c.consultation_type||'')}</p>
      <p><strong>Priority:</strong> ${esc(c.priority||'')}</p>
      <p><strong>Description:</strong> ${esc(c.description||'')}</p>
      <p><strong>Created:</strong> ${fmtDT(c.created_at)}</p>`,
    footer:`<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}
function openEventModal(id=null) {
  const ev = id ? S.events.find(x => String(x.id) === id) : {};
  const expertOpts = S.experts.map(e => `<option value="${e.id}" ${ev.expert_id==e.id?'selected':''}>${esc(e.name)}</option>`).join('');
  openModal({
    title: id ? 'Edit Event' : 'New Event',
    body:`
      <label class="form-group"><span class="form-label">Title</span><input id="evTitle" class="form-input" value="${esc(ev.title||'')}" /></label>
      <label class="form-group"><span class="form-label">Description</span><textarea id="evDesc" class="form-textarea" rows="3">${esc(ev.description||'')}</textarea></label>
      <label class="form-group"><span class="form-label">Category</span><input id="evCat" class="form-input" value="${esc(ev.category||'General')}" /></label>
      <label class="form-group"><span class="form-label">Expert</span><select id="evExpert" class="form-select"><option value="">— None —</option>${expertOpts}</select></label>
      <label class="form-group"><span class="form-label">Date</span><input id="evDate" type="date" class="form-input" value="${ev.date?new Date(ev.date).toISOString().slice(0,10):''}" /></label>
      <label class="form-group"><span class="form-label">Capacity</span><input id="evCap" type="number" class="form-input" value="${ev.capacity||100}" /></label>
      <label class="form-group"><span class="form-label">Price ($)</span><input id="evPrice" type="number" class="form-input" value="${ev.price||0}" /></label>
      <label class="form-group"><span class="form-label">Expert payment ($)</span><input id="evPay" type="number" class="form-input" value="${ev.expert_payment||0}" /></label>`,
    footer:`<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="evSave" class="btn btn-primary">${id?'Save':'Create'}</button>`,
  });
  $('#evSave').onclick = async () => {
    const payload = {
      title:$('#evTitle').value, description:$('#evDesc').value, category:$('#evCat').value,
      expert_id: $('#evExpert').value ? Number($('#evExpert').value) : null,
      date: $('#evDate').value || null,
      capacity: Number($('#evCap').value||100),
      price: Number($('#evPrice').value||0),
      expert_payment: Number($('#evPay').value||0),
    };
    try {
      if (id) await apiCall(`/api/admin/events/${id}`,'PUT', payload);
      else     await apiCall('/api/admin/events','POST', payload);
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast(id?'Event updated':'Event created','success');
    } catch (e) { showToast(e.message,'error'); }
  };
}
function openEnrollModal(courseId) {
  const c = S.courses.find(x => String(x.id) === courseId);
  if (!c) return;
  openModal({
    title: `Enroll in ${esc(c.title)}`,
    body:`
      <p>Price: <strong>${fmtCur(c.price||0)}</strong></p>
      <p>Your balance: <strong>${fmtCur(S.wallet.balance||0)}</strong></p>
      <label class="form-group"><span class="form-label">Coupon (optional)</span><input id="enCoupon" class="form-input" placeholder="WELCOME10" /></label>`,
    footer:`<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="enSave" class="btn btn-primary">Confirm Enroll</button>`,
  });
  $('#enSave').onclick = async () => {
    try {
      showLoading(true);
      const d = await apiCall('/api/eschool/enroll','POST',{ course_id: Number(courseId), coupon_code: $('#enCoupon').value || undefined });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast(`Enrolled! Paid ${fmtCur(d.paid)} (discount ${fmtCur(d.discount)})`,'success', 6000);
    } catch (e) { showToast(e.message,'error'); }
    finally { showLoading(false); }
  };
}
function openProgressModal(enrollmentId, current) {
  openModal({
    title:'Update Progress',
    body:`<label class="form-group"><span class="form-label">Progress (%)</span><input id="pgVal" type="number" min="0" max="100" class="form-input" value="${current}" /></label>`,
    footer:`<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="pgSave" class="btn btn-primary">Save</button>`,
  });
  $('#pgSave').onclick = async () => {
    const p = Math.max(0, Math.min(100, Number($('#pgVal').value||0)));
    try {
      await apiCall(`/api/user/enrollments/${enrollmentId}/progress`,'PUT',{ progress:p });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Progress updated','success');
    } catch (e) { showToast(e.message,'error'); }
  };
}
function openNewConsultationModal() {
  const expertOpts = S.experts.map(e => `<option value="${e.id}">${esc(e.name)} (${esc(e.specialization||'')})</option>`).join('');
  openModal({
    title:'Request Consultation',
    body:`
      <label class="form-group"><span class="form-label">Title</span><input id="ncTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Expert (optional)</span><select id="ncExpert" class="form-select"><option value="">— Any available expert —</option>${expertOpts}</select></label>
      <label class="form-group"><span class="form-label">Type</span>
        <select id="ncType" class="form-select">
          <option value="career">Career</option><option value="academic">Academic</option>
          <option value="business">Business</option><option value="technical">Technical</option>
        </select></label>
      <label class="form-group"><span class="form-label">Priority</span>
        <select id="ncPriority" class="form-select">
          <option value="low">Low</option><option value="normal" selected>Normal</option>
          <option value="high">High</option><option value="urgent">Urgent</option>
        </select></label>
      <label class="form-group"><span class="form-label">Description</span><textarea id="ncDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer:`<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="ncSave" class="btn btn-primary">Submit</button>`,
  });
  $('#ncSave').onclick = async () => {
    const title = $('#ncTitle').value, description = $('#ncDesc').value;
    if (!title || !description) return showToast('Fill all fields','error');
    try {
      await apiCall('/api/user/consultations','POST',{
        title, description,
        consultation_type: $('#ncType').value,
        priority: $('#ncPriority').value,
        expert_id: $('#ncExpert').value ? Number($('#ncExpert').value) : null,
      });
      closeModal(); await reloadConsultations(); rerenderRoleContent();
      showToast('Consultation requested','success');
    } catch (e) { showToast(e.message,'error'); }
  };
}
function openBookingModal(expertId, expertName) {
  openModal({
    title: `Book ${esc(expertName)}`,
    body:`
      <label class="form-group"><span class="form-label">Title</span><input id="bkTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Type</span>
        <select id="bkType" class="form-select">
          <option value="video">Video</option><option value="audio">Audio</option><option value="chat">Chat</option>
        </select></label>
      <label class="form-group"><span class="form-label">Describe your issue</span><textarea id="bkDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer:`<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="bkSave" class="btn btn-primary">Book</button>`,
  });
  $('#bkSave').onclick = async () => {
    const title = $('#bkTitle').value, description = $('#bkDesc').value;
    if (!title || !description) return showToast('Fill all fields','error');
    try {
      await apiCall('/api/user/consultations','POST',{
        title, description, consultation_type: $('#bkType').value, expert_id: Number(expertId),
      });
      closeModal(); await reloadConsultations(); rerenderRoleContent();
      showToast('Consultation booked','success');
    } catch (e) { showToast(e.message,'error'); }
  };
}
function openClaimModal(consultationId) {
  openModal({
    title:'File a Claim',
    body:`
      <label class="form-group"><span class="form-label">Claim title</span><input id="clTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span><textarea id="clDesc" class="form-textarea" rows="4"></textarea></label>
      <label class="form-group"><span class="form-label">Amount (optional)</span><input id="clAmount" type="number" class="form-input" /></label>`,
    footer:`<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="clSave" class="btn btn-primary">Submit Claim</button>`,
  });
  $('#clSave').onclick = async () => {
    const claim_title = $('#clTitle').value, claim_description = $('#clDesc').value;
    if (!claim_title || !claim_description) return showToast('Fill all fields','error');
    try {
      await apiCall('/api/user/claims','POST',{
        consultation_id: Number(consultationId) || null,
        claim_title, claim_description,
        claim_amount: $('#clAmount').value ? Number($('#clAmount').value) : null,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast('Claim filed','success');
    } catch (e) { showToast(e.message,'error'); }
  };
}
function openNewTicketModal() {
  openModal({
    title:'New Support Ticket',
    body:`
      <label class="form-group"><span class="form-label">Subject</span><input id="tkSubject" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Priority</span>
        <select id="tkPriority" class="form-select"><option value="low">Low</option><option value="normal" selected>Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
      <label class="form-group"><span class="form-label">Category</span>
        <select id="tkCat" class="form-select"><option value="general">General</option><option value="billing">Billing</option><option value="technical">Technical</option><option value="account">Account</option></select></label>
      <label class="form-group"><span class="form-label">Description</span><textarea id="tkDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer:`<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="tkSave" class="btn btn-primary">Create Ticket</button>`,
  });
  $('#tkSave').onclick = async () => {
    const subject = $('#tkSubject').value, description = $('#tkDesc').value;
    if (!subject || !description) return showToast('Fill all fields','error');
    try {
      const d = await apiCall('/api/user/tickets','POST',{
        subject, description, priority: $('#tkPriority').value, category: $('#tkCat').value,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast(`Ticket created: ${d.reference}`,'success');
    } catch (e) { showToast(e.message,'error'); }
  };
}
async function openTicketModal(id) {
  try {
    const d = await apiCall(`/api/user/tickets`);
    const t = (d.tickets||[]).find(x => String(x.id) === id) || S.tickets.find(x => String(x.id) === id);
    if (!t) return;
    openModal({
      title: `Ticket ${esc(t.reference||'')}`,
      body:`
        <p><strong>Subject:</strong> ${esc(t.subject||'')}</p>
        <p><strong>Description:</strong> ${esc(t.description||'')}</p>
        <p><strong>Status:</strong> <span class="${statusClass(t.status)}">${esc(t.status)}</span></p>
        <label class="form-group"><span class="form-label">Add reply</span><textarea id="tkReply" class="form-textarea" rows="3"></textarea></label>`,
      footer:`<button class="btn btn-secondary" data-close-modal>Close</button><button id="tkReplySave" class="btn btn-primary">Send Reply</button>`,
    });
    $('#tkReplySave').onclick = async () => {
      const message = $('#tkReply').value;
      if (!message) return;
      await apiCall(`/api/user/tickets/${id}/replies`,'POST',{ message });
      closeModal(); showToast('Reply sent','success');
    };
  } catch (e) { showToast(e.message,'error'); }
}
function openReviewModal(consultationId, expertId) {
  openModal({
    title:'Rate Expert',
    body:`
      <label class="form-group"><span class="form-label">Rating</span>
        <select id="rvRating" class="form-select">${[5,4,3,2,1].map(n => `<option value="${n}">${n} ⭐</option>`).join('')}</select></label>
      <label class="form-group"><span class="form-label">Comment</span><textarea id="rvComment" class="form-textarea" rows="4"></textarea></label>`,
    footer:`<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="rvSave" class="btn btn-primary">Submit</button>`,
  });
  $('#rvSave').onclick = async () => {
    try {
      await apiCall('/api/user/reviews','POST',{
        expert_id: expertId, consultation_id: Number(consultationId),
        rating: Number($('#rvRating').value), comment: $('#rvComment').value,
      });
      closeModal(); showToast('Review submitted','success');
    } catch (e) { showToast(e.message,'error'); }
  };
}
function openVideoCall(consultationId) {
  if (!consultationId) return showToast('No consultation selected','error');
  const room = `experthub-${consultationId}-${uid()}`;
  openModal({
    title:'Video Call',
    className:'chat-modal',
    body:`
      <div class="chat-video-wrap">
        <iframe src="https://meet.jit.si/${room}" allow="camera;microphone;fullscreen;display-capture" style="width:100%;height:100%;border:0" title="Video call"></iframe>
      </div>
      <p class="form-hint">Room ID: <code class="code">${room}</code> — share this with the other party if they can't join.</p>`,
    footer:`<button class="btn btn-secondary" data-close-modal>End call</button>`,
  });
}

/* ============================================================
   CHARTS
   ============================================================ */
function renderCharts() {
  if (!window.Chart) return;
  const ug = document.getElementById('chartUserGrowth') || document.getElementById('userGrowthChart');
  if (ug) {
    const labels = (S.analytics?.usersByMonth||[]).map(r=>r.ym).reverse();
    const data = (S.analytics?.usersByMonth||[]).map(r=>r.c).reverse();
    new Chart(ug, { type:'line', data:{ labels: labels.length?labels:['Jan','Feb','Mar','Apr','May','Jun'], datasets:[{ label:'Users', data: data.length?data:[10,25,40,60,80,120], borderColor:'#6366f1', tension:.3, fill:true, backgroundColor:'rgba(99,102,241,.1)' }] }, options:{ responsive:true, plugins:{ legend:{ display:false } } } });
  }
  const rv = document.getElementById('chartRevenue') || document.getElementById('revenueChart');
  if (rv) {
    const labels = (S.analytics?.revenueByMonth||[]).map(r=>r.ym).reverse();
    const data = (S.analytics?.revenueByMonth||[]).map(r=>Number(r.total)).reverse();
    new Chart(rv, { type:'bar', data:{ labels: labels.length?labels:['Jan','Feb','Mar','Apr','May','Jun'], datasets:[{ label:'Revenue', data: data.length?data:[500,900,1200,1600,2000,2800], backgroundColor:'#10b981' }] }, options:{ responsive:true, plugins:{ legend:{ display:false } } } });
  }
  const role = document.getElementById('roleChart');
  if (role) {
    const labels = (S.analytics?.usersByRole||[]).map(r=>r.role);
    const data = (S.analytics?.usersByRole||[]).map(r=>r.c);
    new Chart(role, { type:'doughnut', data:{ labels: labels.length?labels:['Admin','Expert','Learner'], datasets:[{ data: data.length?data:[1,5,100], backgroundColor:['#ef4444','#10b981','#6366f1'] }] }, options:{ responsive:true } });
  }
}

/* ============================================================
   ROUTER / BOOTSTRAP
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

  if (!authToken) return renderLanding();

  // Authenticated
  appPhase = 'dashboard';
  if (!currentUser) {
    try {
      const me = await apiCall('/api/auth/me');
      currentUser = me.user; currentUserRole = me.user.role;
    } catch { return logout(); }
  }
  if (!S.users.length && !S.consultations.length && !S.courses.length) {
    showLoading(true);
    try { await loadAllData(); } finally { showLoading(false); }
  }
  const seg = hash.replace('#/','').split('/');
  if (seg[1]) activeTab = seg[1];
  renderDashboard();
  startPolling();
}
window.addEventListener('hashchange', route);

/* Keyboard shortcuts */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Escape') closeModal();
  if (e.key === '/' && appPhase === 'dashboard') { e.preventDefault(); document.querySelector('input[type=search]')?.focus(); }
});

/* Init */
(function init() {
  initTheme();
  const savedToken = localStorage.getItem('token');
  const savedRefresh = localStorage.getItem('refresh');
  const savedUser = localStorage.getItem('user');
  if (savedToken) {
    authToken = savedToken;
    refreshToken = savedRefresh;
    try { currentUser = JSON.parse(savedUser); } catch { currentUser = null; }
    currentUserRole = currentUser?.role || null;
    initializeSocket();
  }
  route();
})();
