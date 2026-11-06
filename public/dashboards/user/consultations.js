/* ============================================================
   ExpertHub 2.0 — dashboards/user/consultations.js
   Comprehensive Consultation Management System.
   Sections A-T per guidance. Preserves all existing action names
   and module registrations. No new files introduced.
   ============================================================ */

/* ------------------------------------------------------------ */
/* §3 Issue fix: consolidate module registration                */
/* ------------------------------------------------------------ */
if (typeof window !== 'undefined' && window.__CONSULTATIONS_MODULE_LOADED__) {
  // Guard against accidental double-load of this file
  // eslint-disable-next-line no-console
  console.warn('[ExpertHub] consultations.js loaded twice — second load ignored.');
}
window.__CONSULTATIONS_MODULE_LOADED__ = true;

/* ============================================================ */
/* §1 Constants + state                                         */
/* ============================================================ */

S.consultations            = S.consultations            || [];
S.userConsultationsMeta    = S.userConsultationsMeta    || { total_expenditure: 0, last_loaded_at: 0 };
S.consultationView         = S.consultationView         || 'dashboard';      // dashboard|list|calendar
S.consultationCalendar     = S.consultationCalendar     || {
  view: 'month', year: new Date().getFullYear(), month: new Date().getMonth(), weekStart: null,
};
S.consultationNotifications = S.consultationNotifications || [];
S.consultationPreparation   = S.consultationPreparation   || {};   // id -> { questions, objectives, documents }
S.consultationFollowUps     = S.consultationFollowUps     || {};   // id -> { tasks, resources, progress }
S.consultationAnalytics     = S.consultationAnalytics     || null;
S.consultationLoadState     = S.consultationLoadState     || {
  list: 'idle', analytics: 'idle', notifications: 'idle',
  last_error: null, last_loaded_at: 0,
};

const CONSULT_PAGE_SIZE           = 10;
const CONSULT_FILTER_KEY          = 'consultations';
const CONSULT_NOTIF_KEY           = 'consultations_notifications';

/* Documented lifecycle state machine (§3 last note) */
const CONSULT_STATES = {
  requested:                    { bucket: 'pending',  label: 'Requested' },
  pending_payment:              { bucket: 'pending',  label: 'Awaiting Payment' },
  pending_expert_confirmation:  { bucket: 'pending',  label: 'Awaiting Expert' },
  reschedule_requested:         { bucket: 'pending',  label: 'Reschedule Requested' },
  confirmed:                    { bucket: 'upcoming', label: 'Confirmed' },
  scheduled:                    { bucket: 'upcoming', label: 'Scheduled' },
  in_grace:                     { bucket: 'active',   label: 'Starting Soon' },
  in_session:                   { bucket: 'active',   label: 'In Session' },
  in_progress:                  { bucket: 'active',   label: 'In Progress' },
  awaiting_completion:          { bucket: 'pending',  label: 'Awaiting Completion' },
  completed:                    { bucket: 'past',     label: 'Completed' },
  cancelled:                    { bucket: 'past',     label: 'Cancelled' },
  no_show:                      { bucket: 'past',     label: 'No Show' },
  expired:                      { bucket: 'past',     label: 'Expired' },
  refunded:                     { bucket: 'past',     label: 'Refunded' },
  disputed:                     { bucket: 'past',     label: 'Disputed' },
  resolved:                     { bucket: 'past',     label: 'Resolved' },
};

const CONSULT_ALLOWED_MEETING_HOSTS = [
  'zoom.us', 'meet.google.com', 'teams.microsoft.com',
  'whereby.com', 'jitsi.experthub.com',
];

/* ============================================================ */
/* Helpers — filters, categorization, formatting                */
/* ============================================================ */

function _consultFilters() {
  return {
    q:           UserFilters.get(CONSULT_FILTER_KEY, 'q', '') || '',
    status:      UserFilters.get(CONSULT_FILTER_KEY, 'status', 'all') || 'all',
    method:      UserFilters.get(CONSULT_FILTER_KEY, 'method', '') || '',
    expert:      UserFilters.get(CONSULT_FILTER_KEY, 'expert', '') || '',
    paymentStatus: UserFilters.get(CONSULT_FILTER_KEY, 'payment_status', '') || '',
    category:    UserFilters.get(CONSULT_FILTER_KEY, 'category', '') || '',
    from:        UserFilters.get(CONSULT_FILTER_KEY, 'from', '') || '',
    to:          UserFilters.get(CONSULT_FILTER_KEY, 'to', '') || '',
    sort:        UserFilters.get(CONSULT_FILTER_KEY, 'sort', 'scheduled_asc') || 'scheduled_asc',
    pastPage:    Number(UserFilters.get(CONSULT_FILTER_KEY, 'pastPage', 1)) || 1,
    pendingPage: Number(UserFilters.get(CONSULT_FILTER_KEY, 'pendingPage', 1)) || 1,
  };
}
function _setConsultFilter(k, v) {
  UserFilters.set(CONSULT_FILTER_KEY, k, v);
  if (k !== 'pastPage' && k !== 'pendingPage') {
    UserFilters.set(CONSULT_FILTER_KEY, 'pastPage', 1);
    UserFilters.set(CONSULT_FILTER_KEY, 'pendingPage', 1);
  }
}

/* §3 Issue fix: strict ID comparison normalized */
function _sameId(a, b) { return a != null && b != null && String(a) === String(b); }

function _isMine(c) {
  return !c?.user_id || _sameId(c.user_id, currentUser?.id);
}

/* §3 Issue fix: dedicated overdue detection. A confirmed session whose
   start + duration + grace has elapsed without being marked complete or
   joined is treated as "needs attention" rather than "upcoming". */
function _isOverdue(c) {
  if (!c?.scheduled_at) return false;
  if (!['confirmed', 'scheduled'].includes(c.status)) return false;
  const start    = new Date(c.scheduled_at).getTime();
  const duration = (Number(c.duration_minutes) || 30) * 60000;
  const grace    = 15 * 60000;
  return Date.now() > start + duration + grace;
}

function _statusBucket(c) {
  if (!c || !c.status) return 'pending';
  if (_isOverdue(c)) return 'attention';
  const s = CONSULT_STATES[c.status];
  return s ? s.bucket : 'pending';
}

function _categorizeConsultations(list) {
  const attention = [], active = [], upcoming = [], pending = [], past = [];
  for (const c of list) {
    const b = _statusBucket(c);
    if (b === 'attention') attention.push(c);
    else if (b === 'active') active.push(c);
    else if (b === 'upcoming') upcoming.push(c);
    else if (b === 'pending') pending.push(c);
    else past.push(c);
  }
  const asc  = (a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0);
  const desc = (a, b) => new Date(b.scheduled_at || b.updated_at || 0) - new Date(a.scheduled_at || a.updated_at || 0);
  attention.sort(asc); active.sort(asc); upcoming.sort(asc); past.sort(desc);
  return { attention, active, upcoming, pending, past };
}

/* §3 Issue fix: apply user-requested sort across buckets */
function _applySort(bucket, sortKey) {
  const arr = bucket.slice();
  const cmp = (a, b) => {
    if (sortKey === 'scheduled_asc')  return new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0);
    if (sortKey === 'scheduled_desc') return new Date(b.scheduled_at || 0) - new Date(a.scheduled_at || 0);
    if (sortKey === 'price_asc')      return Number(a.price || 0) - Number(b.price || 0);
    if (sortKey === 'price_desc')     return Number(b.price || 0) - Number(a.price || 0);
    if (sortKey === 'expert')         return (a.expert_name || '').localeCompare(b.expert_name || '');
    return 0;
  };
  return arr.sort(cmp);
}

function _matchConsultFilters(c, f) {
  if (f.q) {
    const s = f.q.toLowerCase();
    const hit = (c.title || '').toLowerCase().includes(s) ||
                (c.expert_name || '').toLowerCase().includes(s) ||
                (c.booking_reference || '').toLowerCase().includes(s) ||
                (c.payment_reference || '').toLowerCase().includes(s) ||
                (c.category || '').toLowerCase().includes(s);
    if (!hit) return false;
  }
  if (f.method && c.consultation_type !== f.method) return false;
  if (f.expert && !_sameId(c.expert_id, f.expert)) return false;
  if (f.paymentStatus && c.payment_status !== f.paymentStatus) return false;
  if (f.category && c.category !== f.category) return false;
  if (f.from && c.scheduled_at && new Date(c.scheduled_at) < new Date(f.from)) return false;
  if (f.to   && c.scheduled_at && new Date(c.scheduled_at) > new Date(f.to + 'T23:59:59')) return false;
  // Status filter
  if (f.status && f.status !== 'all') {
    const bucket = _statusBucket(c);
    if (f.status === 'past'     && bucket !== 'past') return false;
    if (f.status === 'attention'&& bucket !== 'attention') return false;
    if (f.status === 'active'   && bucket !== 'active') return false;
    if (f.status === 'upcoming' && bucket !== 'upcoming') return false;
    if (f.status === 'pending'  && bucket !== 'pending') return false;
    if (f.status === 'completed'&& c.status !== 'completed') return false;
    if (f.status === 'cancelled'&& c.status !== 'cancelled') return false;
    if (f.status === 'disputed' && c.status !== 'disputed') return false;
  }
  return true;
}

/* Safe meeting URL validation — §3 fix */
function _safeMeetingUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    const host = u.hostname.toLowerCase();
    const allowed = CONSULT_ALLOWED_MEETING_HOSTS.some(h => host === h || host.endsWith('.' + h));
    // Allow relative hash routes
    if (url.startsWith('#')) return url;
    return allowed ? url : null;
  } catch { return null; }
}

/* ============================================================ */
/* §P Notifications                                             */
/* ============================================================ */

function _pushConsultNotification(n) {
  const entry = {
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    read: false,
    ...n,
  };
  S.consultationNotifications.unshift(entry);
  if (S.consultationNotifications.length > 50) S.consultationNotifications.pop();
  try { localStorage.setItem(CONSULT_NOTIF_KEY, JSON.stringify(S.consultationNotifications.slice(0, 30))); } catch {}
  return entry;
}

function _loadStoredConsultNotifications() {
  try {
    const raw = localStorage.getItem(CONSULT_NOTIF_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) S.consultationNotifications = arr;
  } catch {}
}

/* Derive in-app notifications from current consultation state */
function _deriveNotifications(mine) {
  const now = Date.now();
  const out = [];
  for (const c of mine) {
    if (!c) continue;
    const start = c.scheduled_at ? new Date(c.scheduled_at).getTime() : null;
    // Payment pending
    if (c.status === 'pending_payment' || c.payment_status === 'pending') {
      out.push({ type: 'payment_pending', severity: 'warning', consultation_id: c.id,
        title: 'Payment pending', body: `Complete payment for ${c.title || 'your session'}`, at: c.updated_at || now });
    }
    // Overdue attention
    if (_isOverdue(c)) {
      out.push({ type: 'overdue', severity: 'danger', consultation_id: c.id,
        title: 'Session overdue', body: `${c.title || 'A confirmed session'} was scheduled for ${fmtDT(c.scheduled_at)}`, at: now });
    }
    // Approaching reminders
    if (start && ['confirmed','scheduled'].includes(c.status)) {
      const diff = start - now;
      if (diff > 0 && diff <= 15 * 60000) {
        out.push({ type: 'reminder_15m', severity: 'info', consultation_id: c.id,
          title: 'Starting in 15 minutes', body: c.title || 'Session', at: now });
      } else if (diff > 0 && diff <= 3600000) {
        out.push({ type: 'reminder_1h', severity: 'info', consultation_id: c.id,
          title: 'Starting in 1 hour', body: c.title || 'Session', at: now });
      } else if (diff > 0 && diff <= 86400000) {
        out.push({ type: 'reminder_24h', severity: 'info', consultation_id: c.id,
          title: 'Tomorrow', body: c.title || 'Session', at: now });
      }
    }
    // Awaiting review
    if (c.status === 'completed' && !c.reviewed) {
      out.push({ type: 'review_pending', severity: 'info', consultation_id: c.id,
        title: 'Rate your session', body: c.title || 'Session', at: c.completed_at || now });
    }
  }
  return out.sort((a, b) => b.at - a.at).slice(0, 12);
}

function _unreadNotifCount() {
  return (S.consultationNotifications || []).filter(n => !n.read).length;
}

/* ============================================================ */
/* Data loaders                                                 */
/* ============================================================ */

let __consultLoadingPromise = null;

async function reloadConsultations({ force = false } = {}) {
  if (__consultLoadingPromise && !force) return __consultLoadingPromise;
  S.consultationLoadState.list = 'loading';
  __consultLoadingPromise = (async () => {
    try {
      const d = await apiCall('/api/user/consultations');
      S.consultations = d.consultations || [];
      S.userConsultationsMeta = {
        total_expenditure: d.total_expenditure || 0,
        last_loaded_at: Date.now(),
      };
      S.consultationLoadState.list = S.consultations.length ? 'ok' : 'empty';
      S.consultationLoadState.last_loaded_at = Date.now();
    } catch (e) {
      S.consultationLoadState.list = 'error';
      S.consultationLoadState.last_error = e?.message || 'Could not load consultations';
    } finally {
      __consultLoadingPromise = null;
    }
  })();
  return __consultLoadingPromise;
}

async function _loadConsultationAnalytics({ force = false } = {}) {
  if (!force && S.consultationLoadState.analytics === 'ok') return;
  S.consultationLoadState.analytics = 'loading';
  try {
    const d = await apiCall('/api/user/consultations/analytics').catch(() => null);
    if (d) {
      S.consultationAnalytics = d;
    } else {
      // Derive from local list as a graceful fallback
      S.consultationAnalytics = _deriveAnalyticsLocally(S.consultations);
    }
    S.consultationLoadState.analytics = 'ok';
  } catch {
    S.consultationAnalytics = _deriveAnalyticsLocally(S.consultations);
    S.consultationLoadState.analytics = 'ok';
  }
}

function _deriveAnalyticsLocally(list) {
  const completed = list.filter(c => c.status === 'completed');
  const cancelled = list.filter(c => c.status === 'cancelled');
  const expenditure = completed.reduce((s, c) => s + Number(c.price || 0), 0);
  const durations = completed.map(c => Number(c.duration_minutes || 0)).filter(Boolean);
  const expertCounts = {};
  for (const c of completed) if (c.expert_name) expertCounts[c.expert_name] = (expertCounts[c.expert_name] || 0) + 1;
  const categories = {};
  for (const c of completed) if (c.category) categories[c.category] = (categories[c.category] || 0) + 1;
  const ratings = completed.map(c => Number(c.rating || 0)).filter(Boolean);
  // Monthly trend (last 6 months)
  const trend = {};
  for (const c of completed) {
    if (!c.scheduled_at) continue;
    const key = new Date(c.scheduled_at).toISOString().slice(0, 7);
    trend[key] = (trend[key] || 0) + 1;
  }
  return {
    total: list.length,
    completed: completed.length,
    cancelled: cancelled.length,
    pending: list.filter(c => _statusBucket(c) === 'pending').length,
    expenditure,
    avg_duration: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    top_experts: Object.entries(expertCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    top_categories: Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 5),
    satisfaction: ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null,
    monthly_trend: trend,
  };
}

async function _refreshSingleConsultation(id) {
  try {
    const d = await apiCall(`/api/user/consultations/${id}`).catch(() => null);
    if (d?.consultation) {
      const idx = (S.consultations || []).findIndex(x => _sameId(x.id, id));
      if (idx >= 0) S.consultations[idx] = { ...S.consultations[idx], ...d.consultation };
      else S.consultations = [...(S.consultations || []), d.consultation];
      return d.consultation;
    }
  } catch {}
  return (S.consultations || []).find(x => _sameId(x.id, id)) || null;
}

/* ============================================================ */
/* §A Dashboard — main entry                                    */
/* ============================================================ */

function renderUserConsultations() {
  // Load on first visit or after error
  if (['idle', 'error'].includes(S.consultationLoadState.list)) {
    reloadConsultations().then(() => rerenderRoleContent()).catch(() => {});
  }
  if (S.consultationLoadState.analytics === 'idle') {
    _loadConsultationAnalytics().then(() => rerenderRoleContent()).catch(() => {});
  }
  if (!S.consultationNotifications.length) {
    _loadStoredConsultNotifications();
  }

  const f = _consultFilters();
  const mine = (S.consultations || []).filter(_isMine);
  const categorized = _categorizeConsultations(mine);

  return UserUI.page({
    title: 'My Consultations',
    breadcrumb: 'Consultations',
    actions: `
      <button class="btn btn-secondary" data-action="open-consultation-notifications"
              aria-label="Notifications">
        <i class="fas fa-bell"></i>
        ${_unreadNotifCount() ? `<span class="chip chip-red">${_unreadNotifCount()}</span>` : ''}
      </button>
      <button class="btn btn-secondary" data-action="toggle-consultation-view">
        <i class="fas fa-${S.consultationView === 'calendar' ? 'list' : S.consultationView === 'dashboard' ? 'calendar-alt' : 'gauge'}"></i>
        ${S.consultationView === 'dashboard' ? 'Calendar' : S.consultationView === 'list' ? 'Dashboard' : 'List'}
      </button>
      <button class="btn btn-secondary" data-action="export-consultations">
        <i class="fas fa-download"></i> Export
      </button>
      <button class="btn btn-primary" data-action="start-booking-flow">
        <i class="fas fa-plus"></i> Book Session
      </button>
    `,
    content: `
      ${S.consultationLoadState.list === 'loading'
        ? UserUI.loading('Loading consultations…') : ''}
      ${S.consultationLoadState.list === 'error'
        ? UserUI.errorState({
            title: 'Could not load consultations',
            message: S.consultationLoadState.last_error || 'Please try again.',
            retryAction: 'reload-consultations', retryLabel: 'Retry',
          }) : ''}
      ${['ok','empty'].includes(S.consultationLoadState.list) ? renderConsultationMainView(mine, categorized, f) : ''}
    `,
  });
}

function renderConsultationMainView(mine, categorized, f) {
  if (S.consultationView === 'calendar') return renderConsultationCalendarFull(mine);
  if (S.consultationView === 'list')     return renderConsultationListView(mine, categorized, f);
  return renderConsultationDashboard(mine, categorized, f);
}

/* ============================================================ */
/* §A Dashboard view                                            */
/* ============================================================ */

function renderConsultationDashboard(mine, categorized, f) {
  const totalCredits = (S.userPackages || []).reduce(
    (s, p) => s + (p.unlimited ? 99 : Number(p.sessions_remaining || 0)), 0);
  const next = _nextUpcoming(mine);
  const derivedNotifs = _deriveNotifications(mine);
  const analytics = S.consultationAnalytics || _deriveAnalyticsLocally(mine);

  return `
    ${renderConsultationWelcome(totalCredits, next)}
    ${renderConsultationStatsBar(categorized, analytics)}
    ${next ? renderConsultationSpotlight(next) : ''}
    ${derivedNotifs.length ? renderConsultationNotificationsStrip(derivedNotifs) : ''}
    ${renderConsultationQuickActions()}
    ${categorized.attention.length ? renderConsultationBucket('Needs Attention', categorized.attention, 'attention') : ''}
    ${categorized.active.length    ? renderConsultationBucket('In Session',      categorized.active,    'active')    : ''}
    ${categorized.upcoming.length  ? renderConsultationBucket('Upcoming',        categorized.upcoming,  'upcoming')  : ''}
    ${categorized.pending.length   ? renderConsultationBucket('Pending',         categorized.pending,   'pending')   : ''}
    ${renderConsultationRecentActivity(mine)}
    ${renderConsultationRecommendedExperts()}
    ${renderConsultationPerformancePanel(analytics)}
    ${!mine.length ? renderConsultationEmptyState() : ''}
  `;
}

function _nextUpcoming(mine) {
  const now = Date.now();
  return mine
    .filter(c => c.scheduled_at && new Date(c.scheduled_at).getTime() > now &&
                 ['confirmed','scheduled','in_grace'].includes(c.status))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0] || null;
}

function renderConsultationWelcome(totalCredits, next) {
  const name = currentUser?.name?.split(' ')[0] || 'there';
  return `
    <section class="panel consultation-welcome" style="background:linear-gradient(135deg,var(--brand-soft),var(--surface))">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <h2 style="margin:0 0 4px">Welcome back, ${esc(name)}</h2>
          <p class="form-hint" style="margin:0">
            ${next
              ? `Your next session starts ${UserHelpers.timeUntil(next.scheduled_at)}.`
              : 'No upcoming sessions — book when you are ready.'}
          </p>
        </div>
        <div style="text-align:right">
          <span class="chip chip-blue" style="font-size:1rem;padding:8px 14px">
            <i class="fas fa-ticket-alt"></i> ${totalCredits} credit${totalCredits === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </section>
  `;
}

function renderConsultationStatsBar(categorized, analytics) {
  return UserUI.stats([
    { label: 'In Session',  value: categorized.active.length,    icon: 'fa-video',     tone: 'blue' },
    { label: 'Upcoming',    value: categorized.upcoming.length,  icon: 'fa-calendar',  tone: 'green' },
    { label: 'Pending',     value: categorized.pending.length,   icon: 'fa-hourglass', tone: 'yellow' },
    { label: 'Completed',   value: analytics.completed || 0,     icon: 'fa-check-circle', tone: 'purple' },
    { label: 'Spent',       value: fmtCur(analytics.expenditure || 0), icon: 'fa-wallet', tone: 'red' },
    { label: 'Satisfaction',value: analytics.satisfaction ? analytics.satisfaction + ' ★' : '—',
                              icon: 'fa-star', tone: 'yellow' },
  ]);
}

function renderConsultationSpotlight(next) {
  const tz = currentUser?.timezone || 'UTC';
  const joinable = window.UserHelpers.canJoinSessionNow(next);
  return `
    <section class="panel consultation-spotlight" style="border-left:4px solid var(--brand)">
      <div class="panel-header-row" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <h3 class="panel-title" style="margin:0">Next Session</h3>
          <p class="form-hint" style="margin:4px 0 0">${UserHelpers.timeUntil(next.scheduled_at)}</p>
        </div>
        <span class="chip chip-blue">${esc(next.status || '')}</span>
      </div>
      <div style="display:flex;gap:14px;align-items:center;margin-top:12px;flex-wrap:wrap">
        <img class="user-avatar" src="${avatar({ name: next.expert_name })}" alt="" style="width:56px;height:56px" />
        <div style="flex:1;min-width:220px">
          <h4 style="margin:0">${esc(next.title || 'Session')}</h4>
          <p class="form-hint" style="margin:2px 0">
            with ${esc(next.expert_name || 'Expert')} · ${UserHelpers.fmtInTz(next.scheduled_at, tz)} (${esc(tz)})
          </p>
          <p class="form-hint" style="margin:2px 0">
            ${next.duration_minutes || 30} min · ${esc(next.consultation_type || 'video')}
            ${next.booking_reference ? ` · Ref ${esc(next.booking_reference)}` : ''}
          </p>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-primary" data-action="start-session" data-id="${next.id}"
                  ${joinable ? '' : 'disabled aria-disabled="true" title="Session not open yet"'}>
            <i class="fas fa-video"></i> Join
          </button>
          <button class="btn btn-secondary" data-action="consultation-detail" data-id="${next.id}">
            <i class="fas fa-eye"></i> Details
          </button>
        </div>
      </div>
    </section>
  `;
}

function renderConsultationNotificationsStrip(notifs) {
  return `
    <section class="panel">
      <h3 class="panel-title"><i class="fas fa-bell"></i> Notifications</h3>
      <ul class="list-stack">
        ${notifs.slice(0, 4).map(n => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(n.title)}</span>
              <span class="list-row-sub">${esc(n.body)}</span>
            </div>
            ${n.consultation_id
              ? `<button class="btn btn-secondary btn-xs" data-action="consultation-detail" data-id="${n.consultation_id}">Open</button>`
              : ''}
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

function renderConsultationQuickActions() {
  return `
    <section class="panel">
      <h3 class="panel-title">Quick Actions</h3>
      <div class="dashboard-columns" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
        <button class="dashboard-card tile-card" data-action="start-booking-flow">
          <i class="fas fa-calendar-plus tile-icon"></i>
          <h4 class="tile-title">Book Session</h4>
          <p class="tile-desc">Find and book an expert</p>
        </button>
        <button class="dashboard-card tile-card" data-action="switch-tab" data-tab="experts">
          <i class="fas fa-search tile-icon"></i>
          <h4 class="tile-title">Find Experts</h4>
          <p class="tile-desc">Browse specialists</p>
        </button>
        <button class="dashboard-card tile-card" data-action="switch-tab" data-tab="packages">
          <i class="fas fa-ticket-alt tile-icon"></i>
          <h4 class="tile-title">Packages</h4>
          <p class="tile-desc">Session bundles &amp; credits</p>
        </button>
        <button class="dashboard-card tile-card" data-action="switch-tab" data-tab="transactions">
          <i class="fas fa-receipt tile-icon"></i>
          <h4 class="tile-title">Payments</h4>
          <p class="tile-desc">Receipts and history</p>
        </button>
      </div>
    </section>
  `;
}

function renderConsultationBucket(title, list, bucketId) {
  return `
    <section class="panel">
      <h3 class="panel-title">${esc(title)} (${list.length})</h3>
      ${list.slice(0, 6).map(c => renderUserConsultationCard(c)).join('')}
      ${list.length > 6
        ? `<p class="form-meta" style="margin-top:8px">
             <button class="btn btn-ghost btn-sm" data-action="toggle-consultation-view">
               View all ${list.length} →
             </button>
           </p>`
        : ''}
    </section>
  `;
}

function renderConsultationRecentActivity(mine) {
  const recent = mine
    .filter(c => c.updated_at || c.completed_at || c.cancelled_at)
    .sort((a, b) => new Date(b.updated_at || b.completed_at || b.cancelled_at || 0) -
                    new Date(a.updated_at || a.completed_at || a.cancelled_at || 0))
    .slice(0, 5);
  if (!recent.length) return '';
  return `
    <section class="panel">
      <h3 class="panel-title">Recent Activity</h3>
      <ul class="list-stack">
        ${recent.map(c => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(c.title || '')}</span>
              <span class="list-row-sub">${esc(c.expert_name || '')} · ${UserUI.statusPill(c.status)}</span>
            </div>
            <span class="form-hint">${timeAgo(c.updated_at || c.completed_at || c.cancelled_at)}</span>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

function renderConsultationRecommendedExperts() {
  const experts = (S.experts || []).slice(0, 3);
  if (!experts.length) return '';
  return `
    <section class="panel">
      <h3 class="panel-title">Recommended Experts</h3>
      <p class="form-hint">Based on your consultation history and interests.</p>
      <div class="card-grid">
        ${experts.map(e => `
          <article class="program-card">
            <img class="expert-avatar" src="${avatar(e)}" alt="" />
            <h4 class="program-title">${esc(e.name || '')}</h4>
            <p class="program-desc">${esc(e.specialization || '')}</p>
            <p class="program-meta">${fmtCur(e.hourly_rate || 0)}/hr · ${Number(e.average_rating || 0).toFixed(1)} ★</p>
            <div class="panel-actions" style="margin-top:8px">
              <button class="btn btn-primary btn-sm" data-action="start-booking-flow" data-expert="${e.id}">
                <i class="fas fa-calendar-plus"></i> Book
              </button>
              <button class="btn btn-secondary btn-sm" data-action="view-expert-profile" data-id="${e.id}">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderConsultationPerformancePanel(a) {
  if (!a) return '';
  const months = Object.entries(a.monthly_trend || {}).sort(([ka], [kb]) => ka.localeCompare(kb)).slice(-6);
  return `
    <section class="panel">
      <h3 class="panel-title">Insights</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
        <div>
          <h4>Top Experts</h4>
          ${(a.top_experts || []).length
            ? `<ul class="list-stack">${(a.top_experts || []).map(([n, c]) =>
                `<li class="list-row"><span class="list-row-title">${esc(n)}</span><span class="chip chip-blue">${c}</span></li>`).join('')}</ul>`
            : '<p class="form-hint">No history yet</p>'}
        </div>
        <div>
          <h4>Top Categories</h4>
          ${(a.top_categories || []).length
            ? `<ul class="list-stack">${(a.top_categories || []).map(([n, c]) =>
                `<li class="list-row"><span class="list-row-title">${esc(n)}</span><span class="chip chip-blue">${c}</span></li>`).join('')}</ul>`
            : '<p class="form-hint">No history yet</p>'}
        </div>
        <div>
          <h4>Monthly Trend</h4>
          ${months.length
            ? `<ul class="list-stack">${months.map(([m, c]) =>
                `<li class="list-row"><span class="list-row-title">${esc(m)}</span><span class="chip chip-neutral">${c}</span></li>`).join('')}</ul>`
            : '<p class="form-hint">No history yet</p>'}
        </div>
      </div>
    </section>
  `;
}

function renderConsultationEmptyState() {
  return `
    <section class="panel">
      ${UserUI.empty({
        icon: 'fa-comments',
        title: 'No consultations yet',
        desc: 'Book your first expert session to get started.',
      })}
      <div style="text-align:center;margin-top:12px">
        <button class="btn btn-primary" data-action="start-booking-flow">
          <i class="fas fa-plus"></i> Book Your First Session
        </button>
      </div>
    </section>
  `;
}

/* ============================================================ */
/* §S List view with working sort + pagination                  */
/* ============================================================ */

function renderConsultationListView(mine, categorized, f) {
  const applyFilter = arr => arr.filter(c => _matchConsultFilters(c, f));
  const attention = _applySort(applyFilter(categorized.attention), f.sort);
  const active    = _applySort(applyFilter(categorized.active),    f.sort);
  const upcoming  = _applySort(applyFilter(categorized.upcoming),  f.sort);
  const pending   = _applySort(applyFilter(categorized.pending),   f.sort);
  const past      = _applySort(applyFilter(categorized.past),      f.sort);

  const pastTotal = past.length;
  const pastPage  = Math.min(f.pastPage, Math.max(1, Math.ceil(pastTotal / CONSULT_PAGE_SIZE) || 1));
  const pastPaged = past.slice((pastPage - 1) * CONSULT_PAGE_SIZE, pastPage * CONSULT_PAGE_SIZE);

  const pendingTotal = pending.length;
  const pendingPage  = Math.min(f.pendingPage, Math.max(1, Math.ceil(pendingTotal / CONSULT_PAGE_SIZE) || 1));
  const pendingPaged = pending.slice((pendingPage - 1) * CONSULT_PAGE_SIZE, pendingPage * CONSULT_PAGE_SIZE);

  return `
    ${renderConsultationFilterBar(f, mine)}
    ${renderConsultationStatsBar(categorized, S.consultationAnalytics || _deriveAnalyticsLocally(mine))}

    ${attention.length ? `
      <section class="panel" style="border-left:4px solid var(--danger)">
        <h3 class="panel-title"><i class="fas fa-exclamation-triangle"></i> Needs Attention (${attention.length})</h3>
        ${attention.map(c => renderUserConsultationCard(c)).join('')}
      </section>
    ` : ''}

    ${active.length ? `
      <section class="panel">
        <h3 class="panel-title">In Session (${active.length})</h3>
        ${active.map(c => renderUserConsultationCard(c)).join('')}
      </section>
    ` : ''}

    ${upcoming.length ? `
      <section class="panel">
        <h3 class="panel-title">Upcoming (${upcoming.length})</h3>
        ${upcoming.map(c => renderUserConsultationCard(c)).join('')}
      </section>
    ` : ''}

    ${pendingTotal ? `
      <section class="panel">
        <h3 class="panel-title">Pending (${pendingTotal})</h3>
        ${pendingPaged.map(c => renderUserConsultationCard(c)).join('')}
        ${UserUI.pagination({
          page: pendingPage, pageSize: CONSULT_PAGE_SIZE, total: pendingTotal,
          action: 'consultation-pending-page', key: 'pending',
        })}
      </section>
    ` : ''}

    ${pastTotal ? `
      <section class="panel">
        <h3 class="panel-title">Past (${pastTotal})</h3>
        ${pastPaged.map(c => renderUserConsultationCard(c)).join('')}
        ${UserUI.pagination({
          page: pastPage, pageSize: CONSULT_PAGE_SIZE, total: pastTotal,
          action: 'consultation-history-page', key: 'past',
        })}
      </section>
    ` : ''}

    ${!mine.length ? renderConsultationEmptyState() : ''}
  `;
}

/* ============================================================ */
/* §S Filter bar (working sort)                                 */
/* ============================================================ */

function renderConsultationFilterBar(f, mine) {
  const experts = Array.from(
    new Map(mine.filter(c => c.expert_id).map(c => [String(c.expert_id), { id: c.expert_id, name: c.expert_name }])).values()
  );
  const categories = Array.from(new Set(mine.map(c => c.category).filter(Boolean))).sort();

  return `
    <section class="panel">
      <div class="expert-filters">
        <input type="search" id="consult-search" class="form-input"
               placeholder="Search by title, expert, reference, or payment ref"
               value="${esc(f.q)}" style="max-width:260px" aria-label="Search consultations" />
        <select id="consult-status" class="form-select" style="max-width:170px" aria-label="Status">
          <option value="all"        ${f.status === 'all' ? 'selected' : ''}>All</option>
          <option value="attention"  ${f.status === 'attention' ? 'selected' : ''}>Needs Attention</option>
          <option value="active"     ${f.status === 'active' ? 'selected' : ''}>In Session</option>
          <option value="upcoming"   ${f.status === 'upcoming' ? 'selected' : ''}>Upcoming</option>
          <option value="pending"    ${f.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="completed"  ${f.status === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="cancelled"  ${f.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          <option value="disputed"   ${f.status === 'disputed' ? 'selected' : ''}>Disputed</option>
          <option value="past"       ${f.status === 'past' ? 'selected' : ''}>All Past</option>
        </select>
        <select id="consult-method" class="form-select" style="max-width:150px" aria-label="Method">
          <option value="">Any method</option>
          <option value="video"     ${f.method === 'video' ? 'selected' : ''}>Video</option>
          <option value="audio"     ${f.method === 'audio' ? 'selected' : ''}>Audio</option>
          <option value="chat"      ${f.method === 'chat' ? 'selected' : ''}>Chat</option>
          <option value="in_person" ${f.method === 'in_person' ? 'selected' : ''}>In-person</option>
        </select>
        <select id="consult-payment" class="form-select" style="max-width:150px" aria-label="Payment status">
          <option value="">Any payment</option>
          <option value="pending"   ${f.paymentStatus === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="paid"      ${f.paymentStatus === 'paid' ? 'selected' : ''}>Paid</option>
          <option value="held"      ${f.paymentStatus === 'held' ? 'selected' : ''}>Held (escrow)</option>
          <option value="refunded"  ${f.paymentStatus === 'refunded' ? 'selected' : ''}>Refunded</option>
        </select>
        ${experts.length ? `
          <select id="consult-expert" class="form-select" style="max-width:180px" aria-label="Expert">
            <option value="">All experts</option>
            ${experts.map(e => `<option value="${esc(e.id)}" ${f.expert === String(e.id) ? 'selected' : ''}>${esc(e.name || '')}</option>`).join('')}
          </select>
        ` : ''}
        ${categories.length ? `
          <select id="consult-category" class="form-select" style="max-width:170px" aria-label="Category">
            <option value="">All categories</option>
            ${categories.map(c => `<option value="${esc(c)}" ${f.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
        ` : ''}
        <input type="date" id="consult-from" class="form-input" style="max-width:150px" value="${esc(f.from)}" aria-label="From date" />
        <input type="date" id="consult-to" class="form-input" style="max-width:150px" value="${esc(f.to)}" aria-label="To date" />
        <select id="consult-sort" class="form-select" style="max-width:170px" aria-label="Sort">
          <option value="scheduled_asc"  ${f.sort === 'scheduled_asc' ? 'selected' : ''}>Soonest first</option>
          <option value="scheduled_desc" ${f.sort === 'scheduled_desc' ? 'selected' : ''}>Latest first</option>
          <option value="price_asc"      ${f.sort === 'price_asc' ? 'selected' : ''}>Price: low → high</option>
          <option value="price_desc"     ${f.sort === 'price_desc' ? 'selected' : ''}>Price: high → low</option>
          <option value="expert"         ${f.sort === 'expert' ? 'selected' : ''}>Expert name</option>
        </select>
        <button class="btn btn-ghost btn-sm" data-action="consultations-clear-filters">
          <i class="fas fa-eraser"></i> Clear
        </button>
      </div>
    </section>
  `;
}

/* ============================================================ */
/* §E Calendar — 4 views (month / week / day / agenda)          */
/* ============================================================ */

function renderConsultationCalendarFull(mine) {
  const view = S.consultationCalendar.view || 'month';
  const tz = currentUser?.timezone || 'UTC';
  return `
    <section class="panel">
      <div class="panel-header-row" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div style="display:flex;gap:6px">
          ${['month','week','day','agenda'].map(v => `
            <button class="btn btn-sm ${view === v ? 'btn-primary' : 'btn-secondary'}"
                    data-action="consult-cal-view" data-view="${v}">
              ${v[0].toUpperCase() + v.slice(1)}
            </button>
          `).join('')}
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-secondary btn-sm" data-action="consult-cal-prev"><i class="fas fa-chevron-left"></i></button>
          <strong style="min-width:160px;text-align:center">${_calendarTitleLabel(view)}</strong>
          <button class="btn btn-secondary btn-sm" data-action="consult-cal-next"><i class="fas fa-chevron-right"></i></button>
          <button class="btn btn-ghost btn-sm" data-action="consult-cal-today">Today</button>
        </div>
      </div>
      <p class="form-hint" style="margin-top:6px">
        All times in <strong>${esc(tz)}</strong>
      </p>
      ${view === 'month'  ? renderCalendarMonth(mine, tz)  : ''}
      ${view === 'week'   ? renderCalendarWeek(mine, tz)   : ''}
      ${view === 'day'    ? renderCalendarDay(mine, tz)    : ''}
      ${view === 'agenda' ? renderCalendarAgenda(mine, tz) : ''}
    </section>
  `;
}

function _calendarTitleLabel(view) {
  const c = S.consultationCalendar;
  const d = new Date(c.year, c.month, c.day || 1);
  if (view === 'month') return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  if (view === 'day')   return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  if (view === 'week') {
    const ws = _weekStart(d);
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    return `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function _weekStart(d) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function _eventsOnDate(mine, date, tz) {
  const target = date.toDateString();
  return mine.filter(c => {
    if (!c.scheduled_at) return false;
    try {
      const local = new Date(new Date(c.scheduled_at).toLocaleString('en-US', { timeZone: tz }));
      return local.toDateString() === target;
    } catch { return new Date(c.scheduled_at).toDateString() === target; }
  });
}

function renderCalendarMonth(mine, tz) {
  const c = S.consultationCalendar;
  const year = c.year, month = c.month;
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return `
    <div class="calendar-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:12px">
      ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d =>
        `<div style="text-align:center;font-weight:600;padding:6px">${d}</div>`).join('')}
      ${cells.map(d => d === null ? '<div></div>' : `
        <div class="calendar-cell" style="min-height:88px;border:1px solid var(--border);border-radius:6px;padding:4px">
          <div style="font-weight:600;margin-bottom:4px;${d.toDateString() === new Date().toDateString() ? 'color:var(--brand)' : ''}">${d.getDate()}</div>
          ${_eventsOnDate(mine, d, tz).map(c => `
            <div class="calendar-event" data-action="consultation-detail" data-id="${c.id}"
                 style="font-size:.7rem;background:${_calendarEventColor(c)};color:#fff;padding:2px 4px;border-radius:4px;margin-bottom:2px;cursor:pointer"
                 role="button" tabindex="0" aria-label="Open ${esc(c.title || 'session')}">
              ${esc((c.title || '').slice(0, 14))}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

function renderCalendarWeek(mine, tz) {
  const c = S.consultationCalendar;
  const ws = _weekStart(new Date(c.year, c.month, c.day || 1));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws); d.setDate(d.getDate() + i); return d;
  });
  return `
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:12px">
      ${days.map(d => `
        <div style="border:1px solid var(--border);border-radius:6px;padding:6px;min-height:200px">
          <div style="font-weight:600;margin-bottom:4px;${d.toDateString() === new Date().toDateString() ? 'color:var(--brand)' : ''}">
            ${d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
          </div>
          ${_eventsOnDate(mine, d, tz).map(c => `
            <div class="calendar-event" data-action="consultation-detail" data-id="${c.id}"
                 style="font-size:.75rem;background:${_calendarEventColor(c)};color:#fff;padding:3px 6px;border-radius:4px;margin-bottom:3px;cursor:pointer">
              ${new Date(c.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: tz })}
              ${esc((c.title || '').slice(0, 16))}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

function renderCalendarDay(mine, tz) {
  const c = S.consultationCalendar;
  const d = new Date(c.year, c.month, c.day || 1);
  const events = _eventsOnDate(mine, d, tz).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 → 21:00
  return `
    <div style="margin-top:12px">
      ${hours.map(h => {
        const evs = events.filter(e => new Date(e.scheduled_at).toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: tz }).startsWith(String(h).padStart(2, '0')));
        return `
          <div style="display:flex;gap:8px;border-top:1px solid var(--border);padding:4px 0">
            <div style="width:70px;flex-shrink:0;font-weight:600;color:var(--text-muted)">${String(h).padStart(2, '0')}:00</div>
            <div style="flex:1">
              ${evs.length
                ? evs.map(c => `
                    <div class="calendar-event" data-action="consultation-detail" data-id="${c.id}"
                         style="background:${_calendarEventColor(c)};color:#fff;padding:4px 8px;border-radius:4px;margin-bottom:2px;cursor:pointer">
                      ${esc(c.title || 'Session')} · ${esc(c.expert_name || '')}
                    </div>
                  `).join('')
                : '<span style="color:var(--text-muted)">—</span>'}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderCalendarAgenda(mine, tz) {
  const upcoming = mine
    .filter(c => c.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  if (!upcoming.length) return '<p class="empty-row">No sessions on the calendar.</p>';
  return `
    <ul class="list-stack" style="margin-top:12px">
      ${upcoming.map(c => `
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(c.title || '')}</span>
            <span class="list-row-sub">${UserHelpers.fmtInTz(c.scheduled_at, tz)} · ${esc(c.expert_name || '')} · ${UserUI.statusPill(c.status)}</span>
          </div>
          <button class="btn btn-secondary btn-xs" data-action="consultation-detail" data-id="${c.id}">
            Open
          </button>
        </li>
      `).join('')}
    </ul>
  `;
}

function _calendarEventColor(c) {
  const bucket = _statusBucket(c);
  if (bucket === 'attention') return 'var(--danger)';
  if (bucket === 'active')    return 'var(--warning)';
  if (bucket === 'upcoming')  return 'var(--brand)';
  if (bucket === 'pending')   return '#8b5cf6';
  return 'var(--text-muted)';
}

/* ============================================================ */
/* §F Modern consultation card                                  */
/* ============================================================ */

function renderUserConsultationCard(c) {
  const tz = currentUser?.timezone || 'UTC';
  const isJoinable    = window.UserHelpers.canJoinSessionNow(c);
  const cancelable    = window.UserHelpers.canCancelSession(c);
  const reschedulable = window.UserHelpers.canRescheduleSession(c);
  const canReview     = c.status === 'completed' && !c.reviewed;
  const canDispute    = ['completed', 'awaiting_completion'].includes(c.status) && !c.disputed;
  const canTip        = c.status === 'completed';
  const needsPayment  = c.status === 'pending_payment' || (c.payment_status === 'pending' && c.status !== 'cancelled');
  const isPaid        = ['paid', 'completed', 'held', 'settled'].includes(c.payment_status);
  const isOverdue     = _isOverdue(c);
  const safeLink      = _safeMeetingUrl(c.meeting_url);

  return `
    <div class="consultation-card ${isOverdue ? 'consultation-card-overdue' : ''}"
         style="${isOverdue ? 'border-left:4px solid var(--danger)' : ''}">
      <header class="consultation-card-header">
        <div>
          <h4 class="consultation-card-title">${esc(c.title || 'Consultation')}</h4>
          <p class="consultation-card-meta">
            ${UserUI.statusPill(c.status || '')}
            ${c.payment_status ? `<span class="chip chip-${needsPayment ? 'yellow' : isPaid ? 'green' : 'neutral'}">${esc((c.payment_status || '').replace(/_/g, ' '))}</span>` : ''}
            ${isOverdue ? '<span class="chip chip-red">Overdue</span>' : ''}
            ${c.session_type === 'instant' ? '<span class="chip chip-blue">Instant</span>' : ''}
            ${c.is_group ? '<span class="chip chip-purple">Group</span>' : ''}
            ${c.category ? `<span class="chip chip-neutral">${esc(c.category)}</span>` : ''}
          </p>
          ${c.booking_reference ? `<p class="form-hint">Ref: <code class="code">${esc(c.booking_reference)}</code></p>` : ''}
        </div>
        <div class="consultation-card-price">
          ${fmtCur(c.price || 0)} ${c.currency ? esc(c.currency) : ''}
          ${c.payment_status === 'held' ? '<div class="consultation-card-escrow">In escrow</div>' : ''}
          ${needsPayment ? '<div class="consultation-card-escrow">Payment pending</div>' : ''}
        </div>
      </header>

      <div class="consultation-card-body">
        <div style="display:flex;gap:8px;align-items:center">
          <img class="user-avatar" src="${avatar({ name: c.expert_name, email: c.expert_email })}" alt="" />
          <div>
            <div class="user-name">${esc(c.expert_name || 'Expert')}</div>
            <div class="user-email">${esc(c.expert_specialization || '')}</div>
          </div>
        </div>

        ${c.scheduled_at ? `
          <div style="margin-top:8px">
            <i class="fas fa-calendar"></i>
            <strong>${UserHelpers.fmtInTz(c.scheduled_at, tz)}</strong>
            <span class="form-hint">(${esc(tz)}) · ${UserHelpers.timeUntil(c.scheduled_at)}</span>
          </div>
        ` : ''}

        <div style="margin-top:4px">
          <i class="fas fa-clock"></i> ${c.duration_minutes || 30} min · ${esc(c.consultation_type || 'video')}
          ${c.reschedule_count > 0 ? ` · <span class="form-hint">${c.reschedule_count} reschedule${c.reschedule_count === 1 ? '' : 's'}</span>` : ''}
        </div>

        ${c.description ? `<p class="consultation-card-desc" style="margin-top:8px">${esc((c.description || '').slice(0, 180))}</p>` : ''}

        ${c.instructions ? `
          <div class="alert alert-info" style="margin-top:8px">
            <i class="fas fa-info-circle"></i> <strong>Instructions:</strong> ${esc(c.instructions)}
          </div>
        ` : ''}

        ${(c.follow_up_resources || []).length ? `
          <div style="margin-top:8px">
            <p class="form-hint"><i class="fas fa-paperclip"></i> Follow-up resources:</p>
            ${(c.follow_up_resources || []).map(r => `
              <button class="btn btn-ghost btn-xs" data-action="download-follow-up" data-id="${r.id}">
                <i class="fas fa-download"></i> ${esc(r.title || 'Download')}
              </button>
            `).join(' ')}
          </div>
        ` : ''}
      </div>

      <footer class="consultation-card-actions" style="display:flex;gap:6px;flex-wrap:wrap">
        ${needsPayment ? `
          <button class="btn btn-primary btn-sm" data-action="complete-consultation-payment" data-id="${c.id}">
            <i class="fas fa-credit-card"></i> Pay
          </button>` : ''}
        ${['confirmed','in_grace','in_session','in_progress'].includes(c.status) ? `
          <button class="btn btn-primary btn-sm" data-action="start-session" data-id="${c.id}"
                  ${isJoinable ? '' : 'disabled aria-disabled="true" title="Not open yet"'}>
            <i class="fas fa-video"></i> Join
          </button>` : ''}
        ${safeLink && c.status === 'confirmed' ? `
          <a class="btn btn-secondary btn-sm" href="${esc(safeLink)}" target="_blank" rel="noopener noreferrer">
            <i class="fas fa-external-link-alt"></i> Meeting Link
          </a>` : ''}
        <button class="btn btn-info btn-sm" data-action="open-chat" data-id="${c.id}">
          <i class="fas fa-comments"></i> Chat
        </button>
        ${reschedulable ? `
          <button class="btn btn-secondary btn-sm" data-action="reschedule-consultation" data-id="${c.id}">
            <i class="fas fa-calendar-alt"></i> Reschedule
          </button>` : ''}
        ${cancelable ? `
          <button class="btn btn-danger btn-sm" data-action="cancel-consultation" data-id="${c.id}">
            <i class="fas fa-times"></i> Cancel
          </button>` : ''}
        ${isPaid ? `
          <button class="btn btn-ghost btn-sm" data-action="view-consultation-receipt" data-id="${c.id}"
                  aria-label="Receipt"><i class="fas fa-receipt"></i></button>` : ''}
        ${canReview ? `
          <button class="btn btn-success btn-sm" data-action="review-consultation" data-id="${c.id}"
                  data-expert="${c.expert_id}">
            <i class="fas fa-star"></i> Rate
          </button>` : ''}
        ${canDispute ? `
          <button class="btn btn-warning btn-sm" data-action="open-dispute" data-id="${c.id}">
            <i class="fas fa-gavel"></i> Dispute
          </button>` : ''}
        ${canTip ? `
          <button class="btn btn-primary btn-sm" data-action="tip-expert" data-id="${c.id}">
            <i class="fas fa-hand-holding-usd"></i> Tip
          </button>
          <button class="btn btn-secondary btn-sm" data-action="start-booking-flow" data-expert="${c.expert_id}">
            <i class="fas fa-redo"></i> Book Again
          </button>` : ''}
        ${c.status === 'completed' ? `
          <button class="btn btn-secondary btn-sm" data-action="open-follow-up" data-id="${c.id}">
            <i class="fas fa-list-check"></i> Follow-up
          </button>` : ''}
        <button class="btn btn-secondary btn-sm" data-action="consultation-detail" data-id="${c.id}">
          <i class="fas fa-eye"></i> Details
        </button>
      </footer>
    </div>
  `;
}

/* ============================================================ */
/* §C Multi-step booking wizard (start-booking-flow)            */
/* ============================================================ */

S.bookingWizardState = S.bookingWizardState || null;

window.ExpertHubUser.registerAction('start-booking-flow', async (_, el) => {
  const presetExpertId = el?.dataset?.expert || null;
  __startBookingWizard({ step: 1, data: { expert_id: presetExpertId } });
});

function __startBookingWizard(initial) {
  S.bookingWizardState = {
    step: 1,
    data: {
      expert_id: null,
      category: '',
      subcategory: '',
      service_id: null,
      method: 'video',
      duration_minutes: 60,
      date: '',
      slot_start: '',
      title: '',
      description: '',
      objectives: '',
      attachments: [],
      apply_discount: '',
      apply_credits: false,
    },
    ...initial,
  };
  __renderBookingWizardStep();
}

function __renderBookingWizardStep() {
  const w = S.bookingWizardState;
  if (!w) return;
  const steps = ['Category & Expert', 'Service & Method', 'Date & Time', 'Details', 'Review & Confirm'];
  const stepLabel = steps[w.step - 1] || '';
  const progress = Math.round((w.step / steps.length) * 100);

  openModal({
    title: `Book Consultation — ${stepLabel}`,
    className: 'modal-lg',
    body: `
      <div class="wizard-progress" style="margin-bottom:12px">
        <div class="progress-bar"><span style="width:${progress}%"></span></div>
        <p class="form-hint">Step ${w.step} of ${steps.length} · ${esc(stepLabel)}</p>
      </div>
      <div id="wizard-body">${__renderBookingWizardBody(w)}</div>
    `,
    footer: `
      <button class="btn btn-secondary" data-action="wizard-cancel">Cancel</button>
      ${w.step > 1 ? `<button class="btn btn-secondary" id="wizBack">Back</button>` : ''}
      <button class="btn btn-primary" id="wizNext">
        ${w.step === steps.length ? '<i class="fas fa-check"></i> Confirm Booking' : 'Next <i class="fas fa-arrow-right"></i>'}
      </button>
    `,
  });

  const backBtn = document.getElementById('wizBack');
  if (backBtn) backBtn.onclick = () => {
    w.step = Math.max(1, w.step - 1);
    __renderBookingWizardStep();
  };
  const nextBtn = document.getElementById('wizNext');
  if (nextBtn) nextBtn.onclick = () => __advanceBookingWizard();

  __bindBookingWizardInputs();
}

function __renderBookingWizardBody(w) {
  const experts = S.experts || [];
  const categories = Array.from(new Set(experts.map(e => e.category).filter(Boolean))).sort();

  if (w.step === 1) {
    return `
      <label class="form-group">
        <span class="form-label">Category</span>
        <select id="wizCategory" class="form-select">
          <option value="">Any category</option>
          ${categories.map(c => `<option value="${esc(c)}" ${w.data.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Expert *</span>
        <select id="wizExpert" class="form-select">
          <option value="">Select an expert</option>
          ${experts
            .filter(e => !w.data.category || e.category === w.data.category)
            .map(e => `<option value="${esc(e.id)}" ${String(w.data.expert_id) === String(e.id) ? 'selected' : ''}>
              ${esc(e.name)} — ${esc(e.specialization || '')} (${fmtCur(e.hourly_rate || 0)}/hr)
            </option>`).join('')}
        </select>
      </label>
      <p class="form-hint">
        <i class="fas fa-lightbulb"></i>
        Not sure who to pick? 
        <button class="btn-ghost btn-xs" data-action="switch-tab" data-tab="experts"
                onclick="closeModal()">Browse all experts</button>
      </p>
    `;
  }
  if (w.step === 2) {
    const expert = (S.experts || []).find(e => String(e.id) === String(w.data.expert_id));
    return `
      <p class="form-hint">Booking with <strong>${esc(expert?.name || 'expert')}</strong></p>
      <label class="form-group">
        <span class="form-label">Duration</span>
        <select id="wizDuration" class="form-select">
          ${[30, 45, 60, 90].map(d =>
            `<option value="${d}" ${Number(w.data.duration_minutes) === d ? 'selected' : ''}>${d} minutes</option>`).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Method</span>
        <select id="wizMethod" class="form-select">
          <option value="video"     ${w.data.method === 'video' ? 'selected' : ''}>Video</option>
          <option value="audio"     ${w.data.method === 'audio' ? 'selected' : ''}>Audio</option>
          <option value="chat"      ${w.data.method === 'chat' ? 'selected' : ''}>Chat</option>
          <option value="in_person" ${w.data.method === 'in_person' ? 'selected' : ''}>In-person</option>
        </select>
      </label>
    `;
  }
  if (w.step === 3) {
    return `
      <label class="form-group">
        <span class="form-label">Date *</span>
        <input id="wizDate" type="date" class="form-input"
               min="${new Date().toISOString().slice(0, 10)}" value="${esc(w.data.date)}" />
      </label>
      <label class="form-group">
        <span class="form-label">Available time slots *</span>
        <div id="wizSlots" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px">
          <p class="form-hint">Select a date to see slots.</p>
        </div>
      </label>
      <p class="form-hint">
        Times shown in <strong>${esc(currentUser?.timezone || 'UTC')}</strong>.
        Slots are confirmed by the server on submit.
      </p>
    `;
  }
  if (w.step === 4) {
    return `
      <label class="form-group">
        <span class="form-label">Session title *</span>
        <input id="wizTitle" class="form-input" maxlength="140" value="${esc(w.data.title)}" />
      </label>
      <label class="form-group">
        <span class="form-label">Describe your issue *</span>
        <textarea id="wizDesc" class="form-textarea" rows="3" maxlength="2000">${esc(w.data.description)}</textarea>
      </label>
      <label class="form-group">
        <span class="form-label">Your objectives (optional)</span>
        <textarea id="wizObj" class="form-textarea" rows="2" maxlength="800">${esc(w.data.objectives)}</textarea>
      </label>
      <label class="form-group">
        <span class="form-label">Supporting documents (optional)</span>
        <input id="wizFiles" type="file" class="form-input" multiple
               accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt" />
        <p class="form-hint">Max 10MB each. Files are uploaded after booking confirmation.</p>
      </label>
    `;
  }
  // step 5: review
  const expert = (S.experts || []).find(e => String(e.id) === String(w.data.expert_id));
  return `
    <div class="booking-review">
      <h4>Review your booking</h4>
      <ul class="list-stack">
        <li class="list-row"><span>Expert</span><strong>${esc(expert?.name || '—')}</strong></li>
        <li class="list-row"><span>Duration</span><strong>${w.data.duration_minutes} min</strong></li>
        <li class="list-row"><span>Method</span><strong>${esc(w.data.method)}</strong></li>
        <li class="list-row"><span>Scheduled</span><strong>${w.data.slot_start ? UserHelpers.fmtInTz(w.data.slot_start, currentUser?.timezone) : '—'}</strong></li>
        <li class="list-row"><span>Title</span><strong>${esc(w.data.title)}</strong></li>
      </ul>
      <label class="form-group">
        <span class="form-label">Discount code (optional)</span>
        <input id="wizDiscount" class="form-input" value="${esc(w.data.apply_discount)}" />
      </label>
      <label class="checkbox-row">
        <input type="checkbox" id="wizCredits" ${w.data.apply_credits ? 'checked' : ''} />
        <span>Use session credits if available</span>
      </label>
      <p class="form-hint">
        <i class="fas fa-shield-alt"></i>
        Final price is confirmed on the server when you submit.
      </p>
    </div>
  `;
}

function __bindBookingWizardInputs() {
  const w = S.bookingWizardState;
  if (!w) return;

  const $ = id => document.getElementById(id);
  if (w.step === 1) {
    $('wizCategory')?.addEventListener('change', e => { w.data.category = e.target.value; __renderBookingWizardStep(); });
    $('wizExpert')?.addEventListener('change', e => { w.data.expert_id = e.target.value; });
  }
  if (w.step === 2) {
    $('wizDuration')?.addEventListener('change', e => { w.data.duration_minutes = Number(e.target.value); });
    $('wizMethod')?.addEventListener('change', e => { w.data.method = e.target.value; });
  }
  if (w.step === 3) {
    const dateEl = $('wizDate');
    const slotsEl = $('wizSlots');
    const renderSlots = async (dateISO) => {
      if (!slotsEl) return;
      if (!dateISO) { slotsEl.innerHTML = '<p class="form-hint">Select a date.</p>'; return; }
      slotsEl.innerHTML = '<p class="form-hint"><i class="fas fa-circle-notch fa-spin"></i> Loading…</p>';
      const d = await apiCall(`/api/user/experts/${w.data.expert_id}/availability?date=${encodeURIComponent(dateISO)}`)
        .catch(() => ({ slots: [] }));
      const slots = d?.slots || [];
      if (!slots.length) { slotsEl.innerHTML = '<p class="form-hint">No slots — try another date.</p>'; return; }
      slotsEl.innerHTML = slots.map(s => `
        <button type="button" class="btn btn-secondary btn-sm"
                data-slot-start="${esc(s.start_at)}">
          ${UserHelpers.fmtInTz(s.start_at, currentUser?.timezone)}
        </button>
      `).join('');
      slotsEl.querySelectorAll('[data-slot-start]').forEach(b => {
        b.onclick = () => {
          slotsEl.querySelectorAll('[data-slot-start]').forEach(x => { x.classList.remove('btn-primary'); x.classList.add('btn-secondary'); });
          b.classList.remove('btn-secondary'); b.classList.add('btn-primary');
          w.data.slot_start = b.dataset.slotStart;
        };
      });
    };
    if (dateEl) {
      dateEl.addEventListener('change', e => { w.data.date = e.target.value; w.data.slot_start = ''; renderSlots(e.target.value); });
      if (w.data.date) renderSlots(w.data.date);
    }
  }
  if (w.step === 4) {
    $('wizTitle')?.addEventListener('input', e => { w.data.title = e.target.value; });
    $('wizDesc')?.addEventListener('input', e => { w.data.description = e.target.value; });
    $('wizObj')?.addEventListener('input', e => { w.data.objectives = e.target.value; });
    $('wizFiles')?.addEventListener('change', e => { w.data.attachments = Array.from(e.target.files || []); });
  }
  if (w.step === 5) {
    $('wizDiscount')?.addEventListener('input', e => { w.data.apply_discount = e.target.value; });
    $('wizCredits')?.addEventListener('change', e => { w.data.apply_credits = e.target.checked; });
  }
}

async function __advanceBookingWizard() {
  const w = S.bookingWizardState;
  if (!w) return;

  // Validation per step
  if (w.step === 1 && !w.data.expert_id) return showToast('Select an expert', 'error');
  if (w.step === 3 && !w.data.slot_start)  return showToast('Pick a time slot', 'error');
  if (w.step === 4 && (!w.data.title.trim() || !w.data.description.trim())) {
    return showToast('Title and description are required', 'error');
  }

  if (w.step < 5) {
    w.step += 1;
    __renderBookingWizardStep();
    return;
  }

  // Final submit
  const btn = document.getElementById('wizNext');
  if (btn?.disabled) return;
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Booking…'; }

  try {
    const d = await apiCall('/api/user/consultations', 'POST', {
      expert_id: Number(w.data.expert_id),
      title: w.data.title,
      description: w.data.description,
      objectives: w.data.objectives || null,
      consultation_type: w.data.method,
      duration_minutes: w.data.duration_minutes,
      scheduled_at: w.data.slot_start,
      discount_code: w.data.apply_discount || undefined,
      use_credits: w.data.apply_credits ? true : undefined,
    });
    // Upload attachments separately after booking, if backend supports
    if (d?.consultation_id && Array.isArray(w.data.attachments) && w.data.attachments.length) {
      for (const file of w.data.attachments) {
        if (file.size > 10 * 1024 * 1024) continue;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('consultation_id', d.consultation_id);
        await apiCall('/api/user/consultations/attachments', 'POST', fd, true).catch(() => null);
      }
    }
    closeModal();
    await reloadConsultations({ force: true });
    await refreshUserSnapshot?.();
    rerenderRoleContent();
    showToast(
      `Booked — Ref ${d?.booking_reference || 'pending'}`,
      'success', 6000);
    if (d?.payment_url) window.location.href = d.payment_url;
    else if (d?.consultation_id) openModal({
      title: 'Booking confirmed',
      body: `
        <div class="alert alert-success">
          <i class="fas fa-check-circle"></i>
          <strong>Your session has been booked.</strong>
        </div>
        ${d.booking_reference ? `<p>Reference: <code class="code">${esc(d.booking_reference)}</code></p>` : ''}
        <p class="form-hint">You will receive a confirmation email shortly.</p>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-primary" data-action="consultation-detail" data-id="${d.consultation_id}"
                onclick="closeModal()">View Session</button>
      `,
    });
    S.bookingWizardState = null;
  } catch (e) {
    showToast(e.message || 'Booking failed', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Confirm Booking'; }
  }
}

window.ExpertHubUser.registerAction('wizard-cancel', () => {
  S.bookingWizardState = null;
  closeModal();
});

/* ============================================================ */
/* Detail modal (comprehensive)                                 */
/* ============================================================ */

window.ExpertHubUser.registerAction('consultation-detail', async (id) => {
  await _refreshSingleConsultation(id);
  const c = (S.consultations || []).find(x => _sameId(x.id, id));
  if (!c) return showToast('Consultation not found', 'error');

  const isPaid       = ['paid', 'completed', 'held', 'settled'].includes(c.payment_status);
  const joinable     = window.UserHelpers.canJoinSessionNow(c);
  const cancelable   = window.UserHelpers.canCancelSession(c);
  const reschedulable= window.UserHelpers.canRescheduleSession(c);
  const safeLink     = _safeMeetingUrl(c.meeting_url);

  openModal({
    title: c.title || 'Consultation',
    className: 'modal-lg',
    body: `
      <p><strong>Booking Ref:</strong> <code class="code">${esc(c.booking_reference || '—')}</code></p>
      <p><strong>Status:</strong> ${UserUI.statusPill(c.status)}
        ${c.payment_status ? ` · <strong>Payment:</strong> ${UserUI.statusPill(c.payment_status)}` : ''}</p>
      <p><strong>Expert:</strong> ${esc(c.expert_name || 'Unassigned')}</p>
      <p><strong>Category:</strong> ${esc(c.category || '—')}</p>
      <p><strong>Type:</strong> ${esc(c.consultation_type || '')} · <strong>Duration:</strong> ${c.duration_minutes || 30} min</p>
      <p><strong>Scheduled:</strong> ${c.scheduled_at ? UserHelpers.fmtInTz(c.scheduled_at, currentUser?.timezone) : '—'}</p>
      <p><strong>Price:</strong> ${fmtCur(c.price || 0)}</p>
      ${c.payment_reference ? `<p><strong>Payment ref:</strong> <code class="code">${esc(c.payment_reference)}</code></p>` : ''}
      ${c.reschedule_count ? `<p><strong>Reschedules:</strong> ${c.reschedule_count} / ${CONFIG.MAX_RESCHEDULES}</p>` : ''}
      ${safeLink ? `<p><strong>Meeting link:</strong> <a href="${esc(safeLink)}" target="_blank" rel="noopener noreferrer">Open</a></p>` : ''}
      ${c.instructions ? `<div class="alert alert-info"><strong>Instructions:</strong> ${esc(c.instructions)}</div>` : ''}
      <p style="margin-top:12px"><strong>Description:</strong></p>
      <p>${esc(c.description || '—')}</p>
      ${c.objectives ? `<p><strong>Objectives:</strong> ${esc(c.objectives)}</p>` : ''}

      ${(c.follow_up_resources || []).length ? `
        <h4 style="margin-top:16px">Follow-up Resources</h4>
        <ul class="list-stack">
          ${(c.follow_up_resources || []).map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.title || 'Resource')}</span>
                ${r.shared_at ? `<span class="list-row-sub">${fmtDate(r.shared_at)}</span>` : ''}
              </div>
              <button class="btn btn-secondary btn-xs" data-action="download-follow-up" data-id="${r.id}">
                <i class="fas fa-download"></i>
              </button>
            </li>
          `).join('')}
        </ul>
      ` : ''}

      <h4 style="margin-top:16px">Timeline</h4>
      <ul class="list-stack">
        ${(c.timeline || [
          { at: c.created_at, label: 'Booking created' },
          c.confirmed_at && { at: c.confirmed_at, label: 'Expert confirmed' },
          c.started_at && { at: c.started_at, label: 'Session started' },
          c.completed_at && { at: c.completed_at, label: 'Session completed' },
          c.cancelled_at && { at: c.cancelled_at, label: 'Session cancelled' },
        ]).filter(Boolean).map(t => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(t.label)}</span>
              <span class="list-row-sub">${fmtDT(t.at)}</span>
            </div>
          </li>
        `).join('') || '<li class="empty-row">No events</li>'}
      </ul>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      ${isPaid ? `<button class="btn btn-secondary" data-action="view-consultation-receipt" data-id="${c.id}">
        <i class="fas fa-receipt"></i> Receipt</button>` : ''}
      ${cancelable ? `<button class="btn btn-danger" data-action="cancel-consultation" data-id="${c.id}"
        onclick="closeModal()"><i class="fas fa-times"></i> Cancel</button>` : ''}
      ${reschedulable ? `<button class="btn btn-secondary" data-action="reschedule-consultation" data-id="${c.id}"
        onclick="closeModal()"><i class="fas fa-calendar-alt"></i> Reschedule</button>` : ''}
      ${joinable ? `<button class="btn btn-primary" data-action="start-session" data-id="${c.id}"
        onclick="closeModal()"><i class="fas fa-video"></i> Join</button>` : ''}
      ${c.status === 'pending_payment' ? `<button class="btn btn-primary"
        data-action="complete-consultation-payment" data-id="${c.id}" onclick="closeModal()">
        <i class="fas fa-credit-card"></i> Pay</button>` : ''}
    `,
  });
});

/* ============================================================ */
/* Reschedule — stale request protection                        */
/* ============================================================ */

window.ExpertHubUser.registerAction('reschedule-consultation', async (id) => {
  await _refreshSingleConsultation(id);
  const c = (S.consultations || []).find(x => _sameId(x.id, id));
  if (!c) return showToast('Consultation not found', 'error');
  if (!window.UserHelpers.canRescheduleSession(c)) {
    return showToast('This consultation can no longer be rescheduled', 'warning');
  }

  let eligibility = null;
  try { eligibility = await apiCall(`/api/user/consultations/${id}/reschedule-eligibility`).catch(() => null); } catch {}
  if (eligibility?.eligible === false) return showToast(eligibility.reason || 'Not eligible for reschedule', 'warning');

  let selectedSlotStart = null;
  let staleToken = 0;

  openModal({
    title: 'Reschedule Consultation',
    body: `
      <div class="alert alert-info">
        <i class="fas fa-calendar"></i>
        Current: ${c.scheduled_at ? UserHelpers.fmtInTz(c.scheduled_at, currentUser?.timezone) : '—'}
        (${esc(currentUser?.timezone || 'UTC')})
      </div>
      <p class="form-hint">Reschedules used: ${c.reschedule_count || 0} / ${CONFIG.MAX_RESCHEDULES}</p>
      <label class="form-group">
        <span class="form-label">New date *</span>
        <input id="rsDate" type="date" class="form-input"
               min="${new Date(Date.now() + 3600000).toISOString().slice(0, 10)}" required />
      </label>
      <div class="form-group">
        <span class="form-label">Available slots *</span>
        <div id="rsSlots" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px">
          <p class="form-hint">Select a date first.</p>
        </div>
      </div>
      <label class="form-group">
        <span class="form-label">Reason (optional)</span>
        <textarea id="rsReason" class="form-textarea" rows="2"></textarea>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="rsSave" class="btn btn-primary" disabled>Confirm Reschedule</button>
    `,
  });

  const updateSubmit = () => {
    const btn = document.getElementById('rsSave');
    if (btn) btn.disabled = !selectedSlotStart;
  };

  const renderSlots = async (dateISO, token) => {
    const host = document.getElementById('rsSlots');
    if (!host) return;
    if (!dateISO) { host.innerHTML = '<p class="form-hint">Select a date.</p>'; return; }
    host.innerHTML = '<p class="form-hint"><i class="fas fa-circle-notch fa-spin"></i> Loading…</p>';
    const data = await apiCall(`/api/user/experts/${c.expert_id}/availability?date=${encodeURIComponent(dateISO)}`)
      .catch(() => ({ slots: [] }));
    // Ignore stale response
    if (token !== staleToken) return;
    const slots = data?.slots || [];
    if (!slots.length) { host.innerHTML = '<p class="form-hint">No slots — try another date.</p>'; return; }
    host.innerHTML = slots.map(s => `
      <button type="button" class="btn btn-secondary btn-sm"
              data-slot-start="${esc(s.start_at)}">
        ${UserHelpers.fmtInTz(s.start_at, currentUser?.timezone)}
      </button>
    `).join('');
    host.querySelectorAll('[data-slot-start]').forEach(b => {
      b.onclick = () => {
        host.querySelectorAll('[data-slot-start]').forEach(x => { x.classList.remove('btn-primary'); x.classList.add('btn-secondary'); });
        b.classList.remove('btn-secondary'); b.classList.add('btn-primary');
        selectedSlotStart = b.dataset.slotStart;
        updateSubmit();
      };
    });
  };

  const dateEl = document.getElementById('rsDate');
  if (dateEl) dateEl.onchange = () => {
    selectedSlotStart = null; updateSubmit();
    staleToken += 1;
    renderSlots(dateEl.value, staleToken);
  };

  const submit = document.getElementById('rsSave');
  if (submit) submit.onclick = async () => {
    if (!selectedSlotStart) return showToast('Select a new time slot', 'error');
    submit.disabled = true;
    submit.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Rescheduling…';
    try {
      await apiCall(`/api/common/consultations/${id}/reschedule`, 'PUT', {
        scheduled_at: selectedSlotStart,
        reason: document.getElementById('rsReason').value || null,
      });
      closeModal();
      await reloadConsultations({ force: true });
      rerenderRoleContent();
      showToast('Reschedule request sent', 'success');
    } catch (e) {
      const msg = String(e?.message || '');
      if (/slot|conflict|taken|no longer available/i.test(msg)) {
        showToast('Slot taken — pick another', 'warning');
        selectedSlotStart = null;
        updateSubmit();
        if (dateEl?.value) { staleToken += 1; renderSlots(dateEl.value, staleToken); }
      } else {
        showToast(msg || 'Reschedule failed', 'error');
      }
      submit.disabled = false;
      submit.textContent = 'Confirm Reschedule';
    }
  };
});

/* ============================================================ */
/* Cancel with policy                                           */
/* ============================================================ */

window.ExpertHubUser.registerAction('cancel-consultation', async (id) => {
  await _refreshSingleConsultation(id);
  const c = (S.consultations || []).find(x => _sameId(x.id, id));
  if (!c) return showToast('Consultation not found', 'error');
  if (!window.UserHelpers.canCancelSession(c)) {
    return showToast('This consultation can no longer be cancelled', 'warning');
  }

  let eligibility = null;
  try { eligibility = await apiCall(`/api/user/consultations/${id}/cancel-eligibility`).catch(() => null); } catch {}
  const eligible = eligibility?.eligible !== false;
  const fee = eligibility?.cancellation_fee || 0;
  const refund = eligibility?.refund_amount || 0;
  if (!eligible) return showToast(eligibility?.reason || 'Not eligible for cancellation', 'warning');

  openModal({
    title: 'Cancel Consultation',
    body: `
      ${fee > 0 ? `<div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i>
        Cancellation fee: <strong>${fmtCur(fee)}</strong>.
        ${refund ? `Estimated refund: <strong>${fmtCur(refund)}</strong>.` : ''}
      </div>` : `<div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        No cancellation fee applies. ${refund ? `Estimated refund: <strong>${fmtCur(refund)}</strong>.` : ''}
      </div>`}
      <p>You are about to cancel:</p>
      <p><strong>${esc(c.title || '')}</strong> — ${c.scheduled_at ? UserHelpers.fmtInTz(c.scheduled_at, currentUser?.timezone) : ''}</p>
      <label class="form-group">
        <span class="form-label">Reason for cancellation</span>
        <select id="ccReason" class="form-select">
          <option value="schedule_conflict">Schedule conflict</option>
          <option value="change_of_plans">Change of plans</option>
          <option value="expert_unavailable">Expert unavailable</option>
          <option value="technical_issues">Technical issues</option>
          <option value="no_longer_needed">No longer needed</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Additional details (optional)</span>
        <textarea id="ccNotes" class="form-textarea" rows="2"></textarea>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Keep booking</button>
      <button id="ccConfirm" class="btn btn-danger">Confirm Cancellation</button>
    `,
  });
  document.getElementById('ccConfirm').onclick = async () => {
    const btn = document.getElementById('ccConfirm');
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const r = await apiCall(`/api/common/consultations/${id}/status`, 'PUT', {
        status: 'cancelled',
        reason: document.getElementById('ccReason').value,
        notes: document.getElementById('ccNotes').value || null,
      });
      closeModal();
      await reloadConsultations({ force: true });
      await refreshUserSnapshot?.();
      rerenderRoleContent();
      showToast(r?.refund_status ? `Cancelled — ${r.refund_status}` : 'Consultation cancelled', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false;
    }
  };
});

/* ============================================================ */
/* Session start (with device check)                            */
/* ============================================================ */

window.ExpertHubUser.registerAction('start-session', async (id) => {
  const c = (S.consultations || []).find(x => _sameId(x.id, id));
  if (c?.consultation_type === 'video' && navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      const ok = await confirmDialog('Camera/microphone access denied. You may not fully participate. Continue?');
      if (!ok) return;
    }
  }
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/consultations/${id}/join`).catch(err => {
      const msg = String(err?.message || '');
      if (/not ready|not open|early/i.test(msg)) showToast('Session not open yet', 'warning', 6000);
      else if (/already ended|expired/i.test(msg)) showToast('This session has ended', 'warning');
      else if (/unauthori[sz]ed|forbidden/i.test(msg)) showToast('You are not authorized to join', 'error');
      else showToast(msg || 'Could not join session', 'error');
      return null;
    });
    showLoading(false);
    if (!d) return;
    const target = _safeMeetingUrl(d.join_url) || d.join_url;
    if (target) {
      if (target.startsWith('#')) location.hash = target;
      else window.location.href = target;
    } else {
      showToast('Meeting link unavailable', 'warning');
    }
  } catch (e) { showLoading(false); showToast(e.message, 'error'); }
});

/* ============================================================ */
/* Payment completion with server verification                  */
/* ============================================================ */

window.ExpertHubUser.registerAction('complete-consultation-payment', async (id) => {
  try {
    showLoading(true);
    await _refreshSingleConsultation(id);
    const c = (S.consultations || []).find(x => _sameId(x.id, id));
    if (!c) { showLoading(false); return showToast('Consultation not found', 'error'); }
    const d = await apiCall(`/api/user/consultations/${id}/payment-intent`, 'POST').catch(() => null);
    showLoading(false);
    if (d?.payment_url) return void (window.location.href = d.payment_url);
    if (d?.instructions || d?.reference) {
      openModal({
        title: 'Complete Payment',
        body: `
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i> Follow the instructions below.
          </div>
          ${d.reference ? `<p><strong>Reference:</strong> <code class="code">${esc(d.reference)}</code></p>` : ''}
          ${d.instructions ? `<p>${esc(d.instructions)}</p>` : ''}
          ${d.amount ? `<p><strong>Amount:</strong> ${fmtCur(d.amount)}</p>` : ''}
          ${d.mpesa_phone ? `<p><strong>M-Pesa:</strong> Check your phone (${esc(d.mpesa_phone)}) for the STK prompt.</p>` : ''}
        `,
        footer: `
          <button class="btn btn-secondary" data-close-modal>Close</button>
          <button class="btn btn-primary" data-action="verify-payment-status" data-id="${id}">
            <i class="fas fa-check-circle"></i> I've completed payment
          </button>
        `,
      });
      return;
    }
    showToast('Payment cannot be initiated — please retry', 'warning');
  } catch (e) { showLoading(false); showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('verify-payment-status', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/consultations/${id}/verify-payment`, 'POST').catch(() => null);
    closeModal();
    if (d?.paid) {
      await _refreshSingleConsultation(id);
      await reloadConsultations({ force: true });
      rerenderRoleContent();
      showToast('Payment verified', 'success');
    } else {
      showToast(d?.message || 'Payment not yet confirmed — try again in a moment', 'warning', 6000);
    }
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('view-consultation-receipt', async (id) => {
  try {
    const d = await apiCall(`/api/user/consultations/${id}/receipt`).catch(() => null);
    if (d?.url) window.open(d.url, '_blank', 'noopener,noreferrer');
    else showToast('Receipt not available yet', 'warning');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('download-follow-up', async (id) => {
  try {
    const d = await apiCall(`/api/user/consultations/follow-ups/${id}/download`).catch(() => null);
    if (d?.url) window.open(d.url, '_blank', 'noopener,noreferrer');
    else showToast('Download not available', 'warning');
  } catch (e) { showToast(e.message, 'error'); }
});

/* ============================================================ */
/* §K Preparation centre                                        */
/* ============================================================ */

window.ExpertHubUser.registerAction('open-preparation', async (id) => {
  const c = (S.consultations || []).find(x => _sameId(x.id, id));
  if (!c) return showToast('Consultation not found', 'error');
  let prep = S.consultationPreparation[id];
  if (!prep) {
    prep = await apiCall(`/api/user/consultations/${id}/preparation`).catch(() => null);
    S.consultationPreparation[id] = prep || { questions: [], objectives: '', documents: [] };
    prep = S.consultationPreparation[id];
  }
  openModal({
    title: 'Preparation Centre',
    className: 'modal-lg',
    body: `
      <p class="form-hint">Complete these before your session to get the most out of it.</p>
      <label class="form-group">
        <span class="form-label">Your objectives for this session</span>
        <textarea id="prepObjectives" class="form-textarea" rows="3">${esc(prep.objectives || '')}</textarea>
      </label>
      <label class="form-group">
        <span class="form-label">Questions for the expert</span>
        <textarea id="prepQuestions" class="form-textarea" rows="3">${esc((prep.questions || []).join('\n'))}</textarea>
      </label>
      <label class="form-group">
        <span class="form-label">Upload documents (PDF, images, DOCX — max 10MB each)</span>
        <input id="prepFiles" type="file" class="form-input" multiple
               accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" />
      </label>
      ${(prep.documents || []).length ? `
        <p class="form-hint">Uploaded documents:</p>
        <ul class="list-stack">
          ${(prep.documents || []).map(d => `
            <li class="list-row">
              <span class="list-row-title">${esc(d.name)}</span>
              <span class="chip chip-neutral">${esc(d.size_label || '')}</span>
            </li>
          `).join('')}
        </ul>
      ` : ''}
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      <button id="prepSave" class="btn btn-primary">Save Preparation</button>
    `,
  });
  document.getElementById('prepSave').onclick = async () => {
    const btn = document.getElementById('prepSave');
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const objectives = document.getElementById('prepObjectives').value;
      const questions = document.getElementById('prepQuestions').value.split('\n').map(q => q.trim()).filter(Boolean);
      const files = Array.from(document.getElementById('prepFiles').files || []);
      await apiCall(`/api/user/consultations/${id}/preparation`, 'PUT', { objectives, questions });
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) continue;
        const fd = new FormData();
        fd.append('file', file);
        await apiCall(`/api/user/consultations/${id}/preparation/files`, 'POST', fd, true).catch(() => null);
      }
      S.consultationPreparation[id] = { objectives, questions, documents: prep.documents || [] };
      closeModal();
      showToast('Preparation saved', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false;
    }
  };
});

/* ============================================================ */
/* §M Follow-up centre                                          */
/* ============================================================ */

window.ExpertHubUser.registerAction('open-follow-up', async (id) => {
  let fu = S.consultationFollowUps[id];
  if (!fu) {
    const d = await apiCall(`/api/user/consultations/${id}/follow-up`).catch(() => null);
    fu = d || { tasks: [], resources: [], progress: 0 };
    S.consultationFollowUps[id] = fu;
  }
  openModal({
    title: 'Follow-up Plan',
    className: 'modal-lg',
    body: `
      <div class="progress-bar" style="margin-bottom:12px">
        <span style="width:${fu.progress || 0}%"></span>
      </div>
      <p class="form-meta">${fu.progress || 0}% complete</p>
      <h4>Action Items</h4>
      ${(fu.tasks || []).length ? `
        <ul class="list-stack">
          ${(fu.tasks || []).map(t => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(t.title)}</span>
                ${t.due_date ? `<span class="list-row-sub">Due ${fmtDate(t.due_date)}</span>` : ''}
              </div>
              ${t.completed
                ? '<span class="chip chip-green">Done</span>'
                : `<button class="btn btn-success btn-xs" data-action="complete-followup-task" data-id="${id}" data-task="${t.id}">
                    <i class="fas fa-check"></i></button>`}
            </li>
          `).join('')}
        </ul>
      ` : '<p class="form-hint">No tasks assigned yet.</p>'}

      ${(fu.resources || []).length ? `
        <h4 style="margin-top:16px">Shared Resources</h4>
        <ul class="list-stack">
          ${(fu.resources || []).map(r => `
            <li class="list-row">
              <span class="list-row-title">${esc(r.title || '')}</span>
              <button class="btn btn-secondary btn-xs" data-action="download-follow-up" data-id="${r.id}">
                <i class="fas fa-download"></i></button>
            </li>
          `).join('')}
        </ul>
      ` : ''}

      <div class="panel-actions" style="margin-top:12px">
        <button class="btn btn-secondary" data-action="start-booking-flow" data-expert="${fu.expert_id || ''}"
                onclick="closeModal()">
          <i class="fas fa-redo"></i> Book Follow-up Session
        </button>
      </div>
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
});

window.ExpertHubUser.registerAction('complete-followup-task', async (_, el) => {
  const consultId = el?.dataset?.id;
  const taskId = el?.dataset?.task;
  try {
    await apiCall(`/api/user/consultations/${consultId}/follow-up/tasks/${taskId}/complete`, 'POST');
    closeModal();
    S.consultationFollowUps[consultId] = null;
    showToast('Task completed', 'success');
    if (S.consultations) {
      // leave list intact; user can reopen follow-up
    }
  } catch (e) { showToast(e.message, 'error'); }
});

/* ============================================================ */
/* §N Multi-dimensional review                                  */
/* ============================================================ */

window.ExpertHubUser.registerAction('review-consultation', (id, el) => {
  const expertId = el?.dataset?.expert;
  openModal({
    title: 'Rate Expert',
    className: 'modal-lg',
    body: `
      <p class="form-hint">Help others by rating your session.</p>
      <label class="form-group">
        <span class="form-label">Overall</span>
        <select id="rvOverall" class="form-select">${[5,4,3,2,1].map(n => `<option value="${n}">${n} of 5</option>`).join('')}</select>
      </label>
      <label class="form-group">
        <span class="form-label">Communication</span>
        <select id="rvComm" class="form-select">${[5,4,3,2,1].map(n => `<option value="${n}">${n} of 5</option>`).join('')}</select>
      </label>
      <label class="form-group">
        <span class="form-label">Professionalism</span>
        <select id="rvProf" class="form-select">${[5,4,3,2,1].map(n => `<option value="${n}">${n} of 5</option>`).join('')}</select>
      </label>
      <label class="form-group">
        <span class="form-label">Knowledge</span>
        <select id="rvKnow" class="form-select">${[5,4,3,2,1].map(n => `<option value="${n}">${n} of 5</option>`).join('')}</select>
      </label>
      <label class="form-group">
        <span class="form-label">Punctuality</span>
        <select id="rvPunc" class="form-select">${[5,4,3,2,1].map(n => `<option value="${n}">${n} of 5</option>`).join('')}</select>
      </label>
      <label class="form-group">
        <span class="form-label">Written feedback</span>
        <textarea id="rvComment" class="form-textarea" rows="4" maxlength="2000"></textarea>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="rvSave" class="btn btn-primary">Submit</button>
    `,
  });
  document.getElementById('rvSave').onclick = async () => {
    const btn = document.getElementById('rvSave');
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      await apiCall('/api/user/reviews', 'POST', {
        consultation_id: Number(id),
        expert_id: Number(expertId),
        rating: Number(document.getElementById('rvOverall').value),
        communication: Number(document.getElementById('rvComm').value),
        professionalism: Number(document.getElementById('rvProf').value),
        knowledge: Number(document.getElementById('rvKnow').value),
        punctuality: Number(document.getElementById('rvPunc').value),
        comment: document.getElementById('rvComment').value,
      });
      closeModal();
      await _refreshSingleConsultation(id);
      await reloadConsultations({ force: true });
      rerenderRoleContent();
      showToast('Review submitted', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false;
    }
  };
});

/* ============================================================ */
/* §O Structured dispute                                        */
/* ============================================================ */

window.ExpertHubUser.registerAction('open-dispute', (id) => {
  openModal({
    title: 'File a Dispute',
    className: 'modal-lg',
    body: `
      <label class="form-group">
        <span class="form-label">Category *</span>
        <select id="dpCategory" class="form-select">
          <option value="no_show">Expert did not show up</option>
          <option value="poor_quality">Poor quality session</option>
          <option value="incomplete">Session ended early</option>
          <option value="billing">Billing issue</option>
          <option value="conduct">Expert conduct</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Describe the issue *</span>
        <textarea id="dpDesc" class="form-textarea" rows="4" maxlength="4000" required></textarea>
      </label>
      <label class="form-group">
        <span class="form-label">Evidence (optional)</span>
        <input type="file" id="dpFile" class="form-input" multiple accept=".pdf,.png,.jpg,.jpeg,.txt" />
        <p class="form-hint">Max 10MB each.</p>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="dpSave" class="btn btn-primary">Submit Dispute</button>
    `,
  });
  document.getElementById('dpSave').onclick = async () => {
    const desc = document.getElementById('dpDesc').value.trim();
    if (!desc) return showToast('Please describe the issue', 'error');
    const btn = document.getElementById('dpSave');
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const files = Array.from(document.getElementById('dpFile').files || []);
      const payload = {
        consultation_id: Number(id),
        claim_title: document.getElementById('dpCategory').value.replace(/_/g, ' '),
        claim_description: desc,
      };
      if (files.length) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
        files.forEach(f => { if (f.size <= 10 * 1024 * 1024) fd.append('evidence', f); });
        await apiCall('/api/user/claims', 'POST', fd, true);
      } else {
        await apiCall('/api/user/claims', 'POST', payload);
      }
      closeModal();
      showToast('Dispute filed — our team will review within 3 business days.', 'success', 6000);
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false;
    }
  };
});

/* ============================================================ */
/* Tip                                                          */
/* ============================================================ */

window.ExpertHubUser.registerAction('tip-expert', (id) => {
  openModal({
    title: 'Tip Expert',
    body: `
      <label class="form-group">
        <span class="form-label">Amount (USD)</span>
        <input id="tpAmount" type="number" class="form-input" min="1" step="1" value="5" required />
      </label>
      <label class="form-group">
        <span class="form-label">Message (optional)</span>
        <textarea id="tpMsg" class="form-textarea" rows="2"></textarea>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="tpSave" class="btn btn-primary">Send Tip</button>
    `,
  });
  document.getElementById('tpSave').onclick = async () => {
    const amt = Number(document.getElementById('tpAmount').value || 0);
    if (amt <= 0) return showToast('Enter a valid amount', 'error');
    const btn = document.getElementById('tpSave');
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      await apiCall(`/api/common/consultations/${id}/tip`, 'POST', {
        amount: amt, message: document.getElementById('tpMsg').value || null,
      });
      closeModal();
      await refreshUserSnapshot?.();
      rerenderRoleContent();
      showToast('Tip sent — thank you!', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false;
    }
  };
});

/* ============================================================ */
/* §P Notifications panel                                       */
/* ============================================================ */

window.ExpertHubUser.registerAction('open-consultation-notifications', () => {
  const items = S.consultationNotifications.length
    ? S.consultationNotifications
    : _deriveNotifications(S.consultations.filter(_isMine));

  openModal({
    title: 'Notifications',
    className: 'modal-lg',
    body: items.length ? `
      <ul class="list-stack">
        ${items.map(n => `
          <li class="list-row" style="${n.read ? '' : 'background:var(--surface-2)'}">
            <div class="list-row-main">
              <span class="list-row-title">${esc(n.title)}</span>
              <span class="list-row-sub">${esc(n.body)}</span>
            </div>
            ${n.consultation_id
              ? `<button class="btn btn-secondary btn-xs" data-action="consultation-detail"
                        data-id="${n.consultation_id}" onclick="closeModal()">Open</button>`
              : ''}
          </li>
        `).join('')}
      </ul>
    ` : '<p class="empty-row">No notifications.</p>',
    footer: `
      <button class="btn btn-secondary" data-action="mark-notifications-read">Mark all read</button>
      <button class="btn btn-secondary" data-close-modal>Close</button>
    `,
  });
});

window.ExpertHubUser.registerAction('mark-notifications-read', () => {
  (S.consultationNotifications || []).forEach(n => { n.read = true; });
  try { localStorage.setItem(CONSULT_NOTIF_KEY, JSON.stringify(S.consultationNotifications.slice(0, 30))); } catch {}
  closeModal();
  rerenderRoleContent();
});

/* ============================================================ */
/* §R Analytics panel                                           */
/* ============================================================ */

window.ExpertHubUser.registerAction('open-consultation-analytics', async () => {
  await _loadConsultationAnalytics({ force: true });
  const a = S.consultationAnalytics || _deriveAnalyticsLocally(S.consultations);
  openModal({
    title: 'Consultation Analytics',
    className: 'modal-lg',
    body: `
      ${UserUI.stats([
        { label: 'Total',       value: a.total || 0,            icon: 'fa-list',       tone: 'blue' },
        { label: 'Completed',   value: a.completed || 0,        icon: 'fa-check',      tone: 'green' },
        { label: 'Cancelled',   value: a.cancelled || 0,        icon: 'fa-ban',        tone: 'red' },
        { label: 'Avg Duration',value: (a.avg_duration || 0) + 'm', icon: 'fa-clock', tone: 'purple' },
      ])}
      <p style="margin-top:12px"><strong>Total spent:</strong> ${fmtCur(a.expenditure || 0)}</p>
      <p><strong>Satisfaction:</strong> ${a.satisfaction ? a.satisfaction + ' ★' : '—'}</p>

      <h4 style="margin-top:16px">Top Experts</h4>
      ${(a.top_experts || []).length
        ? `<ul class="list-stack">${(a.top_experts || []).map(([n, c]) =>
            `<li class="list-row"><span class="list-row-title">${esc(n)}</span><span class="chip chip-blue">${c}</span></li>`).join('')}</ul>`
        : '<p class="form-hint">No data yet.</p>'}

      <h4 style="margin-top:16px">Top Categories</h4>
      ${(a.top_categories || []).length
        ? `<ul class="list-stack">${(a.top_categories || []).map(([n, c]) =>
            `<li class="list-row"><span class="list-row-title">${esc(n)}</span><span class="chip chip-blue">${c}</span></li>`).join('')}</ul>`
        : '<p class="form-hint">No data yet.</p>'}
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
});

/* ============================================================ */
/* §S Export                                                    */
/* ============================================================ */

window.ExpertHubUser.registerAction('export-consultations', () => {
  const mine = S.consultations || [];
  if (!mine.length) return showToast('No consultations to export', 'warning');
  const rows = mine.map(c => ({
    reference: c.booking_reference || c.id,
    title: c.title || '',
    expert: c.expert_name || '',
    category: c.category || '',
    status: c.status || '',
    payment_status: c.payment_status || '',
    payment_reference: c.payment_reference || '',
    scheduled: c.scheduled_at || '',
    duration: c.duration_minutes || '',
    method: c.consultation_type || '',
    price: c.price || '',
  }));
  if (typeof downloadCsv === 'function') downloadCsv('consultations.csv', rows);
  else showToast('Export unavailable', 'warning');
});

/* ============================================================ */
/* Action registration                                          */
/* ============================================================ */

window.ExpertHubUser.registerAction('reload-consultations', async () => {
  await reloadConsultations({ force: true });
  await _loadConsultationAnalytics({ force: true });
  rerenderRoleContent();
  showToast('Consultations refreshed', 'success');
});

window.ExpertHubUser.registerAction('consultations-clear-filters', () => {
  UserFilters.clear(CONSULT_FILTER_KEY);
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('consultation-history-page', (_, el) => {
  _setConsultFilter('pastPage', Number(el?.dataset?.page || 1));
  rerenderRoleContent();
});
window.ExpertHubUser.registerAction('consultation-pending-page', (_, el) => {
  _setConsultFilter('pendingPage', Number(el?.dataset?.page || 1));
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('toggle-consultation-view', () => {
  S.consultationView = S.consultationView === 'calendar'
    ? 'dashboard'
    : S.consultationView === 'dashboard' ? 'list' : 'calendar';
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('consult-cal-view', (_, el) => {
  const view = el?.dataset?.view || 'month';
  S.consultationCalendar.view = view;
  // Reset day/month context when switching to week
  if (view === 'week' && !S.consultationCalendar.weekStart) {
    S.consultationCalendar.weekStart = _weekStart(new Date()).toISOString().slice(0, 10);
  }
  rerenderRoleContent();
});
window.ExpertHubUser.registerAction('consult-cal-prev', () => {
  const c = S.consultationCalendar;
  if (c.view === 'day') {
    const d = new Date(c.year, c.month, c.day || 1); d.setDate(d.getDate() - 1);
    S.consultationCalendar = { ...c, year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  } else if (c.view === 'week') {
    const ws = _weekStart(new Date(c.year, c.month, c.day || 1));
    ws.setDate(ws.getDate() - 7);
    S.consultationCalendar = { ...c, year: ws.getFullYear(), month: ws.getMonth(), day: ws.getDate() };
  } else {
    const d = new Date(c.year, c.month - 1, 1);
    S.consultationCalendar = { ...c, year: d.getFullYear(), month: d.getMonth() };
  }
  rerenderRoleContent();
});
window.ExpertHubUser.registerAction('consult-cal-next', () => {
  const c = S.consultationCalendar;
  if (c.view === 'day') {
    const d = new Date(c.year, c.month, c.day || 1); d.setDate(d.getDate() + 1);
    S.consultationCalendar = { ...c, year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  } else if (c.view === 'week') {
    const ws = _weekStart(new Date(c.year, c.month, c.day || 1));
    ws.setDate(ws.getDate() + 7);
    S.consultationCalendar = { ...c, year: ws.getFullYear(), month: ws.getMonth(), day: ws.getDate() };
  } else {
    const d = new Date(c.year, c.month + 1, 1);
    S.consultationCalendar = { ...c, year: d.getFullYear(), month: d.getMonth() };
  }
  rerenderRoleContent();
});
window.ExpertHubUser.registerAction('consult-cal-today', () => {
  const now = new Date();
  S.consultationCalendar = {
    ...S.consultationCalendar,
    year: now.getFullYear(), month: now.getMonth(), day: now.getDate(),
  };
  rerenderRoleContent();
});

/* ============================================================ */
/* Module registration + init (§3 duplicate-guard)              */
/* ============================================================ */

window.ExpertHubUser.registerModule('consultations', renderUserConsultations);

let __consultationsModuleInitialized = false;
window.ExpertHubUser.registerModule('consultations', renderUserConsultations, {
  init() {
    if (__consultationsModuleInitialized) return;
    __consultationsModuleInitialized = true;

    const rerender = debounce(() => rerenderRoleContent(), 250);
    const $set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
    $set('consult-search',   el => el.oninput  = () => { _setConsultFilter('q', el.value); rerender(); });
    $set('consult-status',   el => el.onchange = () => { _setConsultFilter('status', el.value); rerenderRoleContent(); });
    $set('consult-method',   el => el.onchange = () => { _setConsultFilter('method', el.value); rerenderRoleContent(); });
    $set('consult-payment',  el => el.onchange = () => { _setConsultFilter('payment_status', el.value); rerenderRoleContent(); });
    $set('consult-expert',   el => el.onchange = () => { _setConsultFilter('expert', el.value); rerenderRoleContent(); });
    $set('consult-category', el => el.onchange = () => { _setConsultFilter('category', el.value); rerenderRoleContent(); });
    $set('consult-from',     el => el.onchange = () => { _setConsultFilter('from', el.value); rerenderRoleContent(); });
    $set('consult-to',       el => el.onchange = () => { _setConsultFilter('to', el.value); rerenderRoleContent(); });
    $set('consult-sort',     el => el.onchange = () => { _setConsultFilter('sort', el.value); rerenderRoleContent(); });
  },
});