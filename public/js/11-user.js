/* ============================================================
   ExpertHub 2.0 — 11-user.js (entry)
   Learner dashboard entry. Shell, sidebar, dispatcher, action
   routing, shared UI helpers, extended data loader with retry,
   filter-state persistence, and lifecycle hooks.
   ============================================================ */

/* ---------------- CONFIG EXTENSIONS ---------------- */
CONFIG.COURSE_REFUND_WINDOW_DAYS = CONFIG.COURSE_REFUND_WINDOW_DAYS || 14;
CONFIG.REFUND_MAX_PROGRESS_PCT   = CONFIG.REFUND_MAX_PROGRESS_PCT   || 30;
CONFIG.MAX_RESCHEDULES           = CONFIG.MAX_RESCHEDULES           || 2;
CONFIG.CANCEL_FREE_HOURS         = CONFIG.CANCEL_FREE_HOURS         || 24;
CONFIG.INSTANT_RESPONSE_MINS     = CONFIG.INSTANT_RESPONSE_MINS     || 15;
CONFIG.USER_EXPANDED_RETRY_MS    = CONFIG.USER_EXPANDED_RETRY_MS    || 8000;
CONFIG.USER_EXPANDED_MAX_TRIES   = CONFIG.USER_EXPANDED_MAX_TRIES   || 3;
CONFIG.PROGRESS_MIN              = CONFIG.PROGRESS_MIN              || 0;
CONFIG.PROGRESS_MAX              = CONFIG.PROGRESS_MAX              || 100;
CONFIG.MAX_TOPUP_AMOUNT          = CONFIG.MAX_TOPUP_AMOUNT          || 5000;
CONFIG.SESSION_DEFAULT_DURATION  = CONFIG.SESSION_DEFAULT_DURATION  || 30;
CONFIG.MAX_FILE_SIZE_MB          = CONFIG.MAX_FILE_SIZE_MB          || 25;

CONFIG.BADGES = CONFIG.BADGES || {
  first_course:       { name: 'First Steps',      icon: 'fa-shoe-prints',       desc: 'Enrolled in your first course' },
  first_completion:   { name: 'Course Complete',  icon: 'fa-graduation-cap',    desc: 'Completed your first course' },
  three_courses:      { name: 'Knowledge Seeker', icon: 'fa-book-open',         desc: 'Completed 3 courses' },
  five_courses:       { name: 'Scholar',          icon: 'fa-graduation-cap',    desc: 'Completed 5 courses' },
  ten_courses:        { name: 'Lifelong Learner', icon: 'fa-brain',             desc: 'Completed 10 courses' },
  first_consultation: { name: 'First Session',    icon: 'fa-comments',          desc: 'Completed your first consultation' },
  five_consultations: { name: 'Consultation Pro', icon: 'fa-user-tie',          desc: 'Completed 5 consultations' },
  streak_7:           { name: 'Week Warrior',     icon: 'fa-fire',              desc: '7-day learning streak' },
  streak_30:          { name: 'Monthly Master',   icon: 'fa-fire-flame-curved', desc: '30-day learning streak' },
  perfect_score:      { name: 'Perfect Score',    icon: 'fa-star',              desc: 'Scored 100% on an assessment' },
  first_certificate:  { name: 'Certified',        icon: 'fa-certificate',       desc: 'Earned your first certificate' },
  path_complete:      { name: 'Path Master',      icon: 'fa-route',             desc: 'Completed a full learning path' },
};

/* ---------------- STATE MIRRORS (defensive defaults) ----------------
   Every collection the other modules touch must exist with a valid,
   correct-type default. We never leave S.someCollection = undefined. */
Object.assign(S, {
  // Core data
  courses:           Array.isArray(S.courses)           ? S.courses           : [],
  enrollments:       Array.isArray(S.enrollments)       ? S.enrollments       : [],
  consultations:     Array.isArray(S.consultations)     ? S.consultations     : [],
  experts:           Array.isArray(S.experts)           ? S.experts           : [],
  certificates:      Array.isArray(S.certificates)      ? S.certificates      : [],
  transactions:      Array.isArray(S.transactions)      ? S.transactions      : [],
  tickets:           Array.isArray(S.tickets)           ? S.tickets           : [],
  claims:            Array.isArray(S.claims)            ? S.claims            : [],
  events:            Array.isArray(S.events)            ? S.events            : [],
  eventRegistrations:Array.isArray(S.eventRegistrations)? S.eventRegistrations: [],

  // Wishlist
  wishlist:          Array.isArray(S.wishlist)          ? S.wishlist          : [],
  wishlistIds:       S.wishlistIds instanceof Set       ? S.wishlistIds
                     : new Set((Array.isArray(S.wishlist) ? S.wishlist : []).map(w => String(w.course_id))),
  enrolledCourseIds: S.enrolledCourseIds instanceof Set ? S.enrolledCourseIds : new Set(),

  // Achievements
  userXP:            Number(S.userXP) || 0,
  userLevel:         Number(S.userLevel) || 1,
  userBadges:        Array.isArray(S.userBadges)        ? S.userBadges        : [],
  userStreak:        S.userStreak || { current: 0, longest: 0, last_active: null },

  // Sessions
  userPackages:      Array.isArray(S.userPackages)      ? S.userPackages      : [],
  userShortlist:     Array.isArray(S.userShortlist)     ? S.userShortlist     : [],
  userRefunds:       Array.isArray(S.userRefunds)       ? S.userRefunds       : [],

  // Learning content
  coursePaths:       Array.isArray(S.coursePaths)       ? S.coursePaths       : [],
  courseBundles:     Array.isArray(S.courseBundles)     ? S.courseBundles     : [],
  courseDiscussions: Array.isArray(S.courseDiscussions) ? S.courseDiscussions : [],
  lessonNotes:       Array.isArray(S.lessonNotes)       ? S.lessonNotes       : [],
  lessonQuestions:   Array.isArray(S.lessonQuestions)   ? S.lessonQuestions   : [],

  // Personal development
  personalGoals:     Array.isArray(S.personalGoals)     ? S.personalGoals     : [],
  habits:            Array.isArray(S.habits)            ? S.habits            : [],
  journalEntries:    Array.isArray(S.journalEntries)    ? S.journalEntries    : [],
  milestones:        Array.isArray(S.milestones)        ? S.milestones        : [],

  // Academic
  academicSubjects:    Array.isArray(S.academicSubjects)    ? S.academicSubjects    : [],
  studyTimetable:      Array.isArray(S.studyTimetable)      ? S.studyTimetable      : [],
  academicAssignments: Array.isArray(S.academicAssignments) ? S.academicAssignments : [],
  revisionMaterials:   Array.isArray(S.revisionMaterials)   ? S.revisionMaterials   : [],

  // Career
  careerPathways:  Array.isArray(S.careerPathways)  ? S.careerPathways  : [],
  userCv:          S.userCv || null,
  interviewPrep:   Array.isArray(S.interviewPrep)   ? S.interviewPrep   : [],
  skillGaps:       Array.isArray(S.skillGaps)       ? S.skillGaps       : [],

  // Mentorship + Skills
  mentorships:      Array.isArray(S.mentorships)      ? S.mentorships      : [],
  skillAssessments: Array.isArray(S.skillAssessments) ? S.skillAssessments : [],

  // Productivity
  tasks:            Array.isArray(S.tasks)            ? S.tasks            : [],
  reminders:        Array.isArray(S.reminders)        ? S.reminders        : [],

  // Community + resources
  studyGroups:         Array.isArray(S.studyGroups)         ? S.studyGroups         : [],
  communityChallenges: Array.isArray(S.communityChallenges) ? S.communityChallenges : [],
  discussionsCommunity:Array.isArray(S.discussionsCommunity)? S.discussionsCommunity: [],
  resources:           Array.isArray(S.resources)           ? S.resources           : [],

  // Wallet
  wallet:          S.wallet || { balance: 0, ledger: [] },

  // Extended-load status (canonical home; ns.state mirrors these)
  userExtLoaded:         !!S.userExtLoaded,
  userExtErrors:         Array.isArray(S.userExtErrors) ? S.userExtErrors : [],
  userExtDatasetStatus:  (S.userExtDatasetStatus && typeof S.userExtDatasetStatus === 'object')
                         ? S.userExtDatasetStatus : {},
  userExtLoadingState:   S.userExtLoadingState || 'idle',
  userExtLastError:      S.userExtLastError || null,
  userExtLastLoadedAt:   Number(S.userExtLastLoadedAt) || 0,
});

/* Bridge ns.state <-> S once at load */
window.ExpertHubUser.syncStateFromS();

/* ============================================================
   FILTER-STATE STORE (persists across rerenders for the session)
   ============================================================ */
const UserFilters = (function () {
  const store = new Map();
  const KEY = (tab, name) => `${tab}::${name}`;
  return {
    get(tab, name, fallback = '') {
      return store.has(KEY(tab, name)) ? store.get(KEY(tab, name)) : fallback;
    },
    set(tab, name, value) { store.set(KEY(tab, name), value); },
    has(tab, name) { return store.has(KEY(tab, name)); },
    delete(tab, name) { store.delete(KEY(tab, name)); },
    clear(tab) {
      for (const k of Array.from(store.keys())) if (k.startsWith(tab + '::')) store.delete(k);
    },
    clearAll() { store.clear(); },
    getAll(tab) {
      const out = {};
      for (const [k, v] of store.entries()) {
        if (k.startsWith(tab + '::')) out[k.slice(tab.length + 2)] = v;
      }
      return out;
    },
  };
})();
window.UserFilters = UserFilters;

/* ============================================================
   SAFE HELPERS
   ============================================================ */
function _safeProgress(n) {
  const v = Number(n);
  if (!isFinite(v)) return 0;
  return Math.max(CONFIG.PROGRESS_MIN, Math.min(CONFIG.PROGRESS_MAX, v));
}

function _safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function _safeNum(v, fallback = 0) {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

function _safeStr(v, fallback = '') {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

/* ============================================================
   SHARED UI HELPERS
   ============================================================ */
const UserUI = (function () {

  const page = ({ title, breadcrumb, actions = '', secondaryActions = '', subtitle = '', description = '', content = '' }) => `
    <div class="breadcrumbs">
      <a href="#/dashboard">Home</a>
      <span>${esc(breadcrumb || title || '')}</span>
    </div>
    <section class="page-header">
      <div>
        <h1 class="page-title">${esc(title || '')}</h1>
        ${subtitle ? `<p class="page-subtitle">${esc(subtitle)}</p>` : ''}
        ${description ? `<p class="page-description">${esc(description)}</p>` : ''}
      </div>
      ${(actions || secondaryActions)
        ? `<div class="page-actions">${secondaryActions || ''}${actions || ''}</div>`
        : ''}
    </section>
    ${content}
  `;

  const empty = ({ icon = 'fa-inbox', title = 'Nothing here yet', desc = '',
                  actionTab = '', actionLabel = 'Browse', primary = true,
                  retryAction = '', retryLabel = 'Retry' }) => `
    <div class="empty-state">
      <i class="fas ${icon}"></i>
      <h3>${esc(title)}</h3>
      ${desc ? `<p>${esc(desc)}</p>` : ''}
      ${actionTab ? `
        <button class="btn ${primary ? 'btn-primary' : 'btn-secondary'}"
                data-action="switch-tab" data-tab="${esc(actionTab)}">
          <i class="fas fa-arrow-right"></i> ${esc(actionLabel)}</button>
      ` : ''}
      ${retryAction ? `
        <button class="btn btn-secondary" data-action="${esc(retryAction)}">
          <i class="fas fa-rotate-right"></i> ${esc(retryLabel)}</button>
      ` : ''}
    </div>
  `;

  const loading = (label = 'Loading…') => `
    <div class="loading-state" role="status" aria-live="polite">
      <i class="fas fa-circle-notch fa-spin"></i>
      <span>${esc(label)}</span>
    </div>
  `;

  const errorState = ({ title = 'Could not load', message = '',
                        retryAction = '', retryLabel = 'Retry' }) => `
    <div class="error-state" role="alert">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>${esc(title)}</h3>
      ${message ? `<p>${esc(message)}</p>` : ''}
      ${retryAction ? `
        <button class="btn btn-primary" data-action="${esc(retryAction)}">
          <i class="fas fa-rotate-right"></i> ${esc(retryLabel)}</button>
      ` : ''}
    </div>
  `;

  const stats = (items = []) => `
    <section class="stat-grid">
      ${items.map(i => {
        const trend = i.trend && i.trend.label
          ? `<span class="stat-trend stat-trend-${esc(i.trend.direction || 'neutral')}">
               ${i.trend.icon ? `<i class="fas ${esc(i.trend.icon)}"></i>` : ''} ${esc(i.trend.label)}
             </span>` : '';
        const desc = i.description ? `<p class="stat-desc">${esc(i.description)}</p>` : '';
        const value = i.loading
          ? '<i class="fas fa-circle-notch fa-spin"></i>'
          : (i.value ?? 0);
        const clickAttr = i.tab ? ` data-action="switch-tab" data-tab="${esc(i.tab)}" style="cursor:pointer"` : '';
        return `
          <div class="dashboard-card stat-card"${clickAttr}>
            <div class="stat-info">
              <p class="stat-label">${esc(i.label || '')}</p>
              <p class="stat-value">${value}</p>
              ${i.sub ? `<p class="stat-sub">${esc(i.sub)}</p>` : ''}
              ${desc}
              ${trend}
            </div>
            <div class="stat-icon stat-icon-${i.tone || 'blue'}">
              <i class="fas ${i.icon || 'fa-chart-line'}"></i>
            </div>
          </div>
        `;
      }).join('')}
    </section>
  `;

  const tabs = (list = [], active = '', attr = 'data-user-tab') => `
    <nav class="tab-bar" role="tablist">
      ${list.map(t => {
        const isActive = active === t.id;
        const disabled = t.disabled ? 'disabled aria-disabled="true"' : '';
        const count = t.count ? `<span class="tab-count">${esc(String(t.count))}</span>` : '';
        return `
          <button class="tab-btn ${isActive ? 'tab-btn-active' : ''}"
                  role="tab" aria-selected="${isActive}"
                  ${disabled}
                  ${attr}="${esc(t.id)}">
            ${t.icon ? `<i class="fas ${t.icon}"></i>` : ''} ${esc(t.label || t.id)}
            ${count}
          </button>
        `;
      }).join('')}
    </nav>
  `;

  const table = (headers = [], rows = [], emptyMsg = 'No records') => `
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.length
            ? rows.join('')
            : `<tr><td colspan="${headers.length}" class="empty-row">${esc(emptyMsg)}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  const cardGrid = (cards = []) => cards.length
    ? `<section class="card-grid">${cards.join('')}</section>`
    : '';

  const btn = ({ action, id, label, icon, tone = 'primary', size = 'sm',
                 extra = '', disabled = false, loading = false }) => `
    <button class="btn btn-${tone} btn-${size}"
            data-action="${esc(action)}"
            ${id !== undefined && id !== null ? `data-id="${esc(id)}"` : ''}
            ${extra} ${(disabled || loading) ? 'disabled aria-disabled="true"' : ''}>
      ${loading
        ? '<i class="fas fa-circle-notch fa-spin"></i>'
        : (icon ? `<i class="fas ${icon}"></i>` : '')}
      ${esc(label || '')}
    </button>
  `;

  const statusPill = (status) => {
    const s = String(status || '').toLowerCase();
    const map = {
      pending_payment: 'status-pending',
      pending_expert_confirmation: 'status-pending',
      confirmed: 'status-active', scheduled: 'status-active',
      in_grace: 'status-active', in_session: 'status-active',
      awaiting_completion: 'status-pending',
      completed: 'status-active',
      cancelled: 'status-rejected', expired: 'status-rejected',
      no_show: 'status-rejected', disputed: 'status-pending',
      refunded: 'status-active', pending: 'status-pending',
      approved: 'status-active', rejected: 'status-rejected',
      draft: 'status-archived', published: 'status-active',
      active: 'status-active', archived: 'status-archived',
      failed: 'status-rejected', reversed: 'status-rejected',
      open: 'status-active', closed: 'status-archived',
      in_progress: 'status-pending', resolved: 'status-active',
      under_review: 'status-pending', escalated: 'status-pending',
      not_started: 'status-archived', in_progress_learning: 'status-pending',
      requested: 'status-pending',
    };
    const cls = map[s] || (typeof statusClass === 'function' ? statusClass(s) : 'status-neutral');
    return `<span class="${cls}">${esc(s.replace(/_/g, ' ') || '—')}</span>`;
  };

  const pagination = ({ page: p = 1, pageSize = 12, total = 0, action = 'user-paginate', key = '' }) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) return '';
    return `
      <nav class="pagination" aria-label="Pagination">
        <button class="btn btn-secondary btn-xs"
                data-action="${esc(action)}" data-page="${p - 1}" data-key="${esc(key)}"
                ${p <= 1 ? 'disabled' : ''} aria-label="Previous page">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="pagination-label">Page ${p} of ${totalPages}</span>
        <button class="btn btn-secondary btn-xs"
                data-action="${esc(action)}" data-page="${p + 1}" data-key="${esc(key)}"
                ${p >= totalPages ? 'disabled' : ''} aria-label="Next page">
          <i class="fas fa-chevron-right"></i>
        </button>
      </nav>
    `;
  };

  /* -------- Field renderer for formModal -------- */
  function _fieldHTML(f) {
    const type = f.type || 'text';
    const id = `fm_${f.name}`;
    const req = f.required ? 'required' : '';
    const ph = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '';

    switch (type) {
      case 'textarea':
        return `<textarea id="${id}" class="form-textarea" rows="${f.rows || 3}"
                          ${req} ${f.maxlength ? `maxlength="${f.maxlength}"` : ''}
                          ${ph}>${esc(f.value || '')}</textarea>`;

      case 'select':
        return `<select id="${id}" class="form-select" ${req}>
          ${(f.options || []).map(o => {
            const v = typeof o === 'string' ? o : o.value;
            const l = typeof o === 'string' ? o : (o.label || o.value);
            return `<option value="${esc(v)}" ${String(f.value) === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
          }).join('')}
        </select>`;

      case 'checkbox':
        return `<label class="checkbox-row">
          <input id="${id}" type="checkbox" ${f.value ? 'checked' : ''} />
          <span>${esc(f.checkboxLabel || f.label || '')}</span>
        </label>`;

      case 'radio':
        return (f.options || []).map(o => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : (o.label || o.value);
          return `<label class="checkbox-row">
            <input type="radio" name="${id}" value="${esc(v)}"
                   ${String(f.value) === String(v) ? 'checked' : ''} />
            <span>${esc(l)}</span>
          </label>`;
        }).join('');

      case 'file':
        return `<input id="${id}" type="file" class="form-input"
                       ${f.accept ? `accept="${esc(f.accept)}"` : ''}
                       ${req} />`;

      case 'number':
        return `<input id="${id}" type="number" class="form-input"
                       value="${esc(f.value ?? '')}" ${ph}
                       ${req}
                       ${f.min !== undefined ? `min="${esc(f.min)}"` : ''}
                       ${f.max !== undefined ? `max="${esc(f.max)}"` : ''}
                       ${f.step !== undefined ? `step="${esc(f.step)}"` : ''}
                       ${f.maxlength ? `maxlength="${f.maxlength}"` : ''} />`;

      case 'email':
      case 'tel':
      case 'date':
      case 'time':
      case 'password':
      case 'url':
        return `<input id="${id}" type="${type}" class="form-input"
                       value="${esc(f.value ?? '')}" ${ph} ${req}
                       ${f.maxlength ? `maxlength="${f.maxlength}"` : ''}
                       ${f.min !== undefined && type === 'date' ? `min="${esc(f.min)}"` : ''}
                       ${f.max !== undefined && type === 'date' ? `max="${esc(f.max)}"` : ''} />`;

      default:
        return `<input id="${id}" type="text" class="form-input"
                       value="${esc(f.value ?? '')}" ${ph} ${req}
                       ${f.minlength ? `minlength="${f.minlength}"` : ''}
                       ${f.maxlength ? `maxlength="${f.maxlength}"` : ''} />`;
    }
  }

  /* -------- Value collector for formModal -------- */
  function _collectValue(f) {
    const el = document.getElementById(`fm_${f.name}`);
    if (!el) return undefined;
    switch (f.type) {
      case 'number':
        return el.value === '' ? null : Number(el.value);
      case 'checkbox':
        return !!el.checked;
      case 'radio': {
        const sel = document.querySelector(`input[name="fm_${f.name}"]:checked`);
        return sel ? sel.value : '';
      }
      case 'file':
        return el.files?.[0] || null;
      default:
        return el.value;
    }
  }

  /* -------- formModal -------- */
  function formModal({ title, fields = [], submitLabel = 'Save', onSubmit, width = '' }) {
    const body = fields.map(f => {
      const isCheckbox = f.type === 'checkbox';
      if (isCheckbox) {
        return `<div class="form-group">${_fieldHTML(f)}${f.hint ? `<p class="form-hint">${esc(f.hint)}</p>` : ''}</div>`;
      }
      return `
        <div class="form-group">
          <span class="form-label">${esc(f.label || f.name)}${f.required ? ' *' : ''}</span>
          ${_fieldHTML(f)}
          ${f.hint ? `<p class="form-hint">${esc(f.hint)}</p>` : ''}
        </div>
      `;
    }).join('');

    openModal({
      title,
      className: width,
      body,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button id="fm_submit" class="btn btn-primary">${esc(submitLabel)}</button>
      `,
    });

    const submit = async () => {
      const btn = document.getElementById('fm_submit');
      if (btn && btn.disabled) return; // prevent double submission

      const values = {};
      let invalid = null;
      for (const f of fields) {
        const v = _collectValue(f);
        if (f.required && (v === '' || v === null || v === undefined || v === false)) {
          invalid = f.label || f.name;
          break;
        }
        if (typeof v === 'string' && f.minlength && v.length < f.minlength) {
          invalid = `${f.label || f.name} (min ${f.minlength} chars)`;
          break;
        }
        values[f.name] = v;
      }
      if (invalid) {
        if (typeof showToast === 'function') showToast(`${invalid} is required`, 'error');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Saving…';
      }
      try {
        await onSubmit(values);
      } catch (e) {
        if (typeof showToast === 'function') showToast(e?.message || 'Save failed', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = submitLabel;
        }
      }
    };

    const btnEl = document.getElementById('fm_submit');
    if (btnEl) btnEl.onclick = submit;
  }

  return { page, empty, loading, errorState, stats, tabs, table, cardGrid, btn, statusPill, formModal, pagination };
})();
window.UserUI = UserUI;

/* ============================================================
   EXTENDED DATA LOADER (per-dataset states, retry, dedupe)
   ============================================================ */

let __userExtLoadingPromise = null;
const __inFlightDatasets = new Map();

/**
 * Dataset definitions. Each entry:
 *   name         - dataset key
 *   endpoint     - API path
 *   apply(d)     - receives API response, returns true on success or false if data invalid
 */
const __DATASETS = [
  {
    name: 'wishlist',
    endpoint: '/api/user/wishlist',
    apply(d) {
      if (!d || !Array.isArray(d.items)) return false;
      S.wishlist = d.items;
      S.wishlistIds = new Set(d.items.map(w => String(w.course_id)));
      return true;
    },
  },
  {
    name: 'enrollments',
    endpoint: '/api/user/enrollments',
    apply(d) {
      if (!d || !Array.isArray(d.enrollments)) return false;
      S.enrollments = d.enrollments;
      S.enrolledCourseIds = new Set(d.enrollments.map(e => String(e.course_id)));
      return true;
    },
  },
  {
    name: 'achievements',
    endpoint: '/api/user/achievements',
    apply(d) {
      if (!d) return false;
      S.userXP     = Number(d.xp) || 0;
      S.userLevel  = Number(d.level) || (Math.floor(S.userXP / 500) + 1);
      S.userBadges = Array.isArray(d.badges) ? d.badges : [];
      if (d.streak) S.userStreak = d.streak;
      return true;
    },
  },
  {
    name: 'packages',
    endpoint: '/api/user/packages',
    apply(d) {
      if (!d || !Array.isArray(d.packages)) return false;
      S.userPackages = d.packages;
      return true;
    },
  },
  {
    name: 'shortlist',
    endpoint: '/api/user/shortlist',
    apply(d) {
      if (!d || !Array.isArray(d.items)) return false;
      S.userShortlist = d.items;
      return true;
    },
  },
  {
    name: 'refunds',
    endpoint: '/api/user/refunds',
    apply(d) {
      if (!d || !Array.isArray(d.refunds)) return false;
      S.userRefunds = d.refunds;
      return true;
    },
  },
  {
    name: 'paths',
    endpoint: '/api/eschool/learning-paths',
    apply(d) {
      if (!d || !Array.isArray(d.paths)) return false;
      S.coursePaths = d.paths;
      return true;
    },
  },
  {
    name: 'bundles',
    endpoint: '/api/eschool/bundles',
    apply(d) {
      if (!d || !Array.isArray(d.bundles)) return false;
      S.courseBundles = d.bundles;
      return true;
    },
  },
  {
    name: 'goals',
    endpoint: '/api/user/goals',
    apply(d) {
      if (!d || !Array.isArray(d.goals)) return false;
      S.personalGoals = d.goals;
      return true;
    },
  },
  {
    name: 'habits',
    endpoint: '/api/user/habits',
    apply(d) {
      if (!d || !Array.isArray(d.habits)) return false;
      S.habits = d.habits;
      return true;
    },
  },
  {
    name: 'journal',
    endpoint: '/api/user/journal',
    apply(d) {
      if (!d || !Array.isArray(d.entries)) return false;
      S.journalEntries = d.entries;
      return true;
    },
  },
  {
    name: 'academic',
    endpoint: '/api/user/academic',
    apply(d) {
      if (!d) return false;
      S.academicSubjects    = Array.isArray(d.subjects)    ? d.subjects    : [];
      S.studyTimetable      = Array.isArray(d.timetable)   ? d.timetable   : [];
      S.academicAssignments = Array.isArray(d.assignments) ? d.assignments : [];
      S.revisionMaterials   = Array.isArray(d.revision)    ? d.revision    : [];
      return true;
    },
  },
  {
    name: 'career',
    endpoint: '/api/user/career',
    apply(d) {
      if (!d || !Array.isArray(d.pathways)) return false;
      S.careerPathways = d.pathways;
      return true;
    },
  },
  {
    name: 'mentorships',
    endpoint: '/api/user/mentorships',
    apply(d) {
      if (!d || !Array.isArray(d.mentorships)) return false;
      S.mentorships = d.mentorships;
      return true;
    },
  },
  {
    name: 'skills',
    endpoint: '/api/user/skills',
    apply(d) {
      if (!d || !Array.isArray(d.assessments)) return false;
      S.skillAssessments = d.assessments;
      return true;
    },
  },
  {
    name: 'tasks',
    endpoint: '/api/user/tasks',
    apply(d) {
      if (!d || !Array.isArray(d.tasks)) return false;
      S.tasks = d.tasks;
      return true;
    },
  },
  {
    name: 'studyGroups',
    endpoint: '/api/user/study-groups',
    apply(d) {
      if (!d || !Array.isArray(d.groups)) return false;
      S.studyGroups = d.groups;
      return true;
    },
  },
  {
    name: 'resources',
    endpoint: '/api/user/resources',
    apply(d) {
      if (!d || !Array.isArray(d.resources)) return false;
      S.resources = d.resources;
      return true;
    },
  },
];

/* Set/initialize per-dataset status */
function _datasetStatus(name) {
  if (!S.userExtDatasetStatus) S.userExtDatasetStatus = {};
  if (!S.userExtDatasetStatus[name]) {
    S.userExtDatasetStatus[name] = { status: 'idle', error: null, lastLoadedAt: 0, attempts: 0 };
  }
  return S.userExtDatasetStatus[name];
}

/* Single-dataset loader with dedupe + per-dataset status */
async function _loadDataset(ds, { force = false } = {}) {
  const state = _datasetStatus(ds.name);

  if (!force && state.status === 'ok') return { name: ds.name, status: 'ok', cached: true };

  if (__inFlightDatasets.has(ds.name)) return __inFlightDatasets.get(ds.name);

  state.status = 'loading';
  state.error = null;
  state.attempts = (state.attempts || 0) + 1;

  const promise = (async () => {
    try {
      const data = await apiCall(ds.endpoint);
      const applied = ds.apply(data) !== false;
      state.status = applied ? 'ok' : 'failed';
      state.error = applied ? null : 'Invalid response structure';
      state.lastLoadedAt = Date.now();
      return { name: ds.name, status: state.status };
    } catch (e) {
      const msg = String(e?.message || '');
      state.status = 'failed';
      state.error = msg || 'Request failed';
      state.lastLoadedAt = Date.now();
      // Surface expired sessions via existing handler
      if (/401|unauthori[sz]ed|session expired|token expired/i.test(msg)
          && typeof handleUserActionFailure === 'function') {
        try { handleUserActionFailure(e); } catch {}
      }
      return { name: ds.name, status: 'failed', error: msg };
    } finally {
      __inFlightDatasets.delete(ds.name);
    }
  })();

  __inFlightDatasets.set(ds.name, promise);
  return promise;
}

/**
 * Main extended-data loader.
 * @param {object} opts { force }
 */
async function loadUserExtendedData({ force = false } = {}) {
  if (!force && S.userExtLoaded) return;
  if (__userExtLoadingPromise) return __userExtLoadingPromise;

  S.userExtErrors = [];
  if (typeof window.ExpertHubUser !== 'undefined') {
    window.ExpertHubUser.state.loadingState = 'loading';
  }
  S.userExtLoadingState = 'loading';

  __userExtLoadingPromise = (async () => {
    const results = await Promise.allSettled(
      __DATASETS.map(ds => _loadDataset(ds, { force }))
    );

    const statuses = __DATASETS.map(ds => (_datasetStatus(ds.name).status || 'idle'));
    const okCount   = statuses.filter(s => s === 'ok').length;
    const failCount = statuses.filter(s => s === 'failed').length;
    const total     = __DATASETS.length;

    S.userExtErrors = __DATASETS
      .map(ds => ({ name: ds.name, error: _datasetStatus(ds.name).error }))
      .filter(x => x.error);

    if (failCount === 0) {
      S.userExtLoaded = true;
      S.userExtLoadingState = 'ok';
    } else if (okCount > 0) {
      S.userExtLoadingState = 'partial';
      // Intentionally leave S.userExtLoaded false so retries run
    } else {
      S.userExtLoadingState = 'failed';
    }

    S.userExtLastLoadedAt = Date.now();
    S.userExtLastError = failCount
      ? `Failed to load ${failCount} of ${total} section${total === 1 ? '' : 's'}`
      : null;

    // Bridge to ns.state
    if (typeof window.ExpertHubUser !== 'undefined') {
      window.ExpertHubUser.state.loadingState = S.userExtLoadingState;
      window.ExpertHubUser.state.lastError    = S.userExtLastError;
      window.ExpertHubUser.state.lastLoadedAt = S.userExtLastLoadedAt;
      window.ExpertHubUser.syncStateFromS();
    }
  })().finally(() => { __userExtLoadingPromise = null; });

  return __userExtLoadingPromise;
}

/** Retry only the datasets that are currently failed (or force all if none set). */
async function retryFailedDatasets() {
  const failed = __DATASETS.filter(ds => {
    const st = _datasetStatus(ds.name);
    return st.status === 'failed';
  });
  if (!failed.length) return;
  await Promise.allSettled(failed.map(ds => _loadDataset(ds, { force: true })));
  // Recompute overall status
  const statuses = __DATASETS.map(ds => _datasetStatus(ds.name).status || 'idle');
  const okCount   = statuses.filter(s => s === 'ok').length;
  const failCount = statuses.filter(s => s === 'failed').length;
  S.userExtLoadingState = failCount === 0 ? 'ok' : (okCount > 0 ? 'partial' : 'failed');
  if (failCount === 0) S.userExtLoaded = true;
  if (typeof window.ExpertHubUser !== 'undefined') {
    window.ExpertHubUser.state.loadingState = S.userExtLoadingState;
    window.ExpertHubUser.syncStateFromS();
  }
}

/** Retry with exponential backoff if partial/failed. */
async function retryUserExtendedDataIfNeeded() {
  const state = window.ExpertHubUser.state;
  if (state.loadingState === 'ok' || state.loadingState === 'loading') return;
  for (let i = 0; i < CONFIG.USER_EXPANDED_MAX_TRIES; i++) {
    await loadUserExtendedData({ force: true });
    if (window.ExpertHubUser.state.loadingState === 'ok') return;
    await new Promise(r => setTimeout(r, CONFIG.USER_EXPANDED_RETRY_MS * (i + 1)));
  }
}

/* ============================================================
   DASHBOARD ENTRY
   ============================================================ */
function renderUserDashboard() {
  if (typeof currentUser === 'undefined' || !currentUser) {
    return shell({
      roleClass: 'role-user', brandIcon: 'fa-user-circle',
      brandTitle: 'My Panel', brandSubtitle: 'ExpertHub',
      nav: '', roleLabel: 'User Panel',
      content: UserUI.errorState({ title: 'Session expired', message: 'Please sign in again.' }),
    });
  }

  const intent = S.userIntent || currentUser?.intent || 'both';
  const showLearn   = intent === 'learn'   || intent === 'both';
  const showConsult = intent === 'consult' || intent === 'both';

  const mine = _safeArray(S.consultations).filter(c => c.user_id === currentUser?.id);
  const activeCons = mine.filter(c =>
    ['pending_payment','pending_expert_confirmation','confirmed','scheduled','in_grace','in_session']
      .includes(c.status)
  ).length;
  const unreadBadges = _safeArray(S.userBadges).filter(b => !b.seen).length;
  const wishlistCount = _safeArray(S.wishlist).length;
  const pendingTasks = _safeArray(S.tasks).filter(t => t.status !== 'done').length;

  const nav = `
    <div class="sidebar-section-title">Overview</div>
    ${sidebarItem('dashboard','Dashboard','fa-chart-line')}

    ${showLearn ? '<div class="sidebar-section-title">Learning</div>' : ''}
    ${showLearn ? sidebarItem('eschool','E-School','fa-school') : ''}
    ${showLearn ? sidebarItem('my-learning','My Learning','fa-graduation-cap') : ''}
    ${showLearn ? sidebarItem('learning-paths','Learning Paths','fa-route') : ''}
    ${showLearn ? sidebarItem('bundles','Bundles','fa-box-open') : ''}
    ${showLearn ? sidebarItem('wishlist','Wishlist','fa-heart', wishlistCount) : ''}
    ${showLearn ? sidebarItem('certificates','Certificates','fa-certificate') : ''}
    ${showLearn ? sidebarItem('achievements','Achievements','fa-trophy', unreadBadges) : ''}
    ${showLearn ? sidebarItem('course-notes','My Notes','fa-sticky-note') : ''}

    ${showLearn ? '<div class="sidebar-section-title">Academic</div>' : ''}
    ${showLearn ? sidebarItem('academic','Academic Support','fa-graduation-cap') : ''}
    ${showLearn ? sidebarItem('skills','Skills & Competency','fa-puzzle-piece') : ''}
    ${showLearn ? sidebarItem('assessments','Assessments','fa-clipboard-check') : ''}

    <div class="sidebar-section-title">Career</div>
    ${sidebarItem('career','Career Center','fa-briefcase')}
    ${sidebarItem('mentorship','Mentorship','fa-user-friends')}

    <div class="sidebar-section-title">Growth</div>
    ${sidebarItem('personal-development','Personal Development','fa-seedling')}
    ${sidebarItem('productivity','Productivity','fa-list-check', pendingTasks)}

    <div class="sidebar-section-title">Community</div>
    ${sidebarItem('community','Learning Community','fa-users-rectangle')}
    ${sidebarItem('resources','Resource Library','fa-folder-open')}

    ${showConsult ? '<div class="sidebar-section-title">Sessions</div>' : ''}
    ${showConsult ? sidebarItem('experts','Find Experts','fa-search') : ''}
    ${sidebarItem('consultations','My Consultations','fa-comments', activeCons)}
    ${showConsult ? sidebarItem('packages','Session Packages','fa-ticket-alt') : ''}
    ${showConsult ? sidebarItem('shortlist','Shortlist','fa-bookmark') : ''}

    <div class="sidebar-section-title">Events</div>
    ${sidebarItem('events','Events','fa-calendar-alt')}

    <div class="sidebar-section-title">Finance</div>
    ${sidebarItem('wallet','Wallet','fa-wallet')}
    ${sidebarItem('transactions','Transactions','fa-receipt')}
    ${showLearn ? sidebarItem('refunds','Refund Requests','fa-rotate-left') : ''}
    ${sidebarItem('claims','Claims','fa-gavel')}

    <div class="sidebar-section-title">Support</div>
    ${sidebarItem('support','Support','fa-headset')}
    ${sidebarItem('ai-assistant','AI Assistant','fa-robot')}
    ${sidebarItem('opportunities','Opportunities','fa-briefcase')}

    <div class="sidebar-section-title">Account</div>
    ${sidebarItem('profile','Profile','fa-user')}
  `;

  const content = renderUserContent();

  shell({
    roleClass: 'role-user',
    brandIcon: 'fa-user-circle',
    brandTitle: 'My Panel',
    brandSubtitle: 'ExpertHub',
    nav,
    roleLabel: 'User Panel',
    content,
  });

  if (typeof attachRoleEvents === 'function') attachRoleEvents();
  attachUserActionListener();
  initActiveUserModule();

  // Kick off data load only if needed
  const loadingState = window.ExpertHubUser.state.loadingState;
  if (!S.userExtLoaded || loadingState === 'partial' || loadingState === 'idle') {
    loadUserExtendedData()
      .then(() => {
        if (typeof rerenderRoleContent === 'function') rerenderRoleContent();
      })
      .catch(() => {});
  }
}

/* ============================================================
   CONTENT DISPATCHER (with module lifecycle)
   ============================================================ */
let __lastUserTab = null;

const __TAB_ALIASES = {
  dashboard: 'overview',
  eschool: 'learning',
  'my-learning': 'learning',
  'course-notes': 'lesson-notes',
};

function _resolveTabKey(tab) {
  return __TAB_ALIASES[tab] || tab;
}

function renderUserContent() {
  const ns = window.ExpertHubUser;
  const tab = (typeof activeTab !== 'undefined' && activeTab) || 'dashboard';

  // Cleanup previous module
  if (__lastUserTab && __lastUserTab !== tab) {
    ns.cleanupModule?.(__lastUserTab);
  }
  __lastUserTab = tab;

  const key = _resolveTabKey(tab);

  // Module availability check
  if (!ns.isModuleAvailable(key)) {
    return UserUI.page({
      title: 'Module unavailable',
      content: UserUI.errorState({
        title: 'This section is unavailable',
        message: 'You may not have permission, or a required dependency is missing.',
        retryAction: 'switch-tab', retryLabel: 'Go Home',
      }),
    });
  }

  try {
    if (ns.hasModule(key)) return ns.modules[key](tab);
    if (ns.hasModule(tab)) return ns.modules[tab](tab);
  } catch (e) {
    ns.reportError(tab, e);
    return UserUI.errorState({
      title: 'Module failed to render',
      message: e?.message || 'Unknown error',
      retryAction: 'switch-tab', retryLabel: 'Reload',
    });
  }

  return UserUI.page({
    title: 'Module unavailable',
    content: `<div class="alert alert-warning">
      <i class="fas fa-exclamation-triangle"></i>
      <div>The <strong>${esc(tab)}</strong> module is not yet loaded.
      Ensure the corresponding file in <code>/dashboards/user/</code> is included in <code>index.html</code>.</div>
    </div>`,
  });
}

function initActiveUserModule() {
  const ns = window.ExpertHubUser;
  const tab = (typeof activeTab !== 'undefined' && activeTab) || 'dashboard';
  const key = _resolveTabKey(tab);
  const host = document.getElementById('role-content') || document.body;
  ns.initModule?.(key, host);
}

/* ============================================================
   ACTION DISPATCHER
   ============================================================ */
async function dispatchUserAction(action, id, el) {
  const ns = window.ExpertHubUser;

  if (!ns || !ns.hasAction(action)) {
    if (typeof handleAction === 'function') return handleAction(action, id, el);
    if (typeof showToast === 'function') showToast(`Action not implemented: ${action}`, 'warning');
    return;
  }

  if (!ns.canDo(action)) {
    if (typeof showToast === 'function') showToast('You do not have permission to do that', 'warning');
    return;
  }

  // Disable button during action
  let restore = null;
  if (el && el.tagName === 'BUTTON' && !el.disabled) {
    const originalHTML = el.innerHTML;
    el.disabled = true;
    restore = () => { el.disabled = false; el.innerHTML = originalHTML; };
  }

  const stats = ns.actionStats[action] = ns.actionStats[action] || { calls: 0, errors: 0, lastError: null };
  stats.calls++;

  try {
    return await ns.actions[action](id, el);
  } catch (e) {
    stats.errors++;
    stats.lastError = e?.message || String(e);
    throw e;
  } finally {
    if (restore) restore();
  }
}
window.dispatchUserAction = dispatchUserAction;

/* Session expiry check invoked after any action failure. */
function handleUserActionFailure(err) {
  const msg = String(err?.message || '');
  if (/401|unauthori[sz]ed|session expired|token expired/i.test(msg)) {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {}
    if (typeof currentUser !== 'undefined') currentUser = null;
    if (typeof showToast === 'function') {
      showToast('Session expired — please sign in again', 'warning', 6000);
    }
    setTimeout(() => { location.hash = '#/login'; }, 800);
    return true;
  }
  return false;
}

/* Delegated click listener — scoped to .role-user and registered actions only. */
let __userActionListenerInstalled = false;
function attachUserActionListener() {
  if (__userActionListenerInstalled) return;
  __userActionListenerInstalled = true;

  document.addEventListener('click', async (e) => {
    const target = e.target.closest('.role-user [data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const ns = window.ExpertHubUser;
    if (!ns || !ns.hasAction(action)) return;
    if (e.defaultPrevented) return;

    e.preventDefault();
    try {
      await dispatchUserAction(action, target.dataset.id, target);
    } catch (ex) {
      if (handleUserActionFailure(ex)) return;
      if (typeof showToast === 'function') showToast(ex?.message || 'Action failed', 'error');
    }
  });
}

/* ============================================================
   SHARED HELPERS
   ============================================================ */
function fmtInTz(d, tz) {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-US', {
      timeZone: tz || 'UTC',
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return typeof fmtDT === 'function' ? fmtDT(d) : String(d);
  }
}

function timeUntil(d) {
  if (!d) return '';
  const t = new Date(d).getTime();
  if (isNaN(t)) return '';
  const ms = t - Date.now();
  if (ms <= 0) {
    const past = Math.abs(ms);
    const m = Math.floor(past / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
  const m = Math.floor(ms / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h ${m % 60}m`;
  const dd = Math.floor(h / 24);
  return `in ${dd}d ${h % 24}h`;
}

function levelFromXP(xp) {
  const x = Number(xp) || 0;
  return Math.max(1, Math.floor(x / 500) + 1);
}
function xpForLevel(level) {
  const l = Math.max(1, Number(level) || 1);
  return Math.max(0, (l - 1) * 500);
}
function xpProgressPercent(xp) {
  const x = Number(xp) || 0;
  const lvl = levelFromXP(x);
  const start = xpForLevel(lvl);
  const end = xpForLevel(lvl + 1);
  const span = end - start;
  if (span <= 0) return 0;
  const pct = ((x - start) / span) * 100;
  return Math.max(0, Math.min(100, pct));
}
function truncateHash(h, n = 8) {
  if (h === null || h === undefined) return '';
  const s = String(h);
  return s.length <= n * 2 ? s : `${s.slice(0, n)}…${s.slice(-n)}`;
}

/** True if a session is currently joinable (server confirms at join time). */
function canJoinSessionNow(c) {
  if (!c) return false;
  if (!['confirmed','in_grace','in_session'].includes(c.status)) return false;
  if (!c.scheduled_at) return false;
  const start = new Date(c.scheduled_at).getTime();
  if (isNaN(start)) return false;
  const dur   = (Number(c.duration_minutes) || 30) * 60000;
  const grace = 15 * 60000;
  const now   = Date.now();
  return now >= start - 5 * 60000 && now <= start + dur + grace;
}

/** Client-side hint; server remains authoritative. */
function canCancelSession(c) {
  if (!c) return false;
  if (!['pending_expert_confirmation','confirmed','scheduled'].includes(c.status)) return false;
  if (!c.scheduled_at) return true;
  const t = new Date(c.scheduled_at).getTime();
  if (isNaN(t)) return false;
  const hrs = (t - Date.now()) / 3600000;
  return hrs >= CONFIG.CANCEL_FREE_HOURS || c.status === 'pending_expert_confirmation';
}

function canRescheduleSession(c) {
  if (!c) return false;
  if (!['confirmed','scheduled'].includes(c.status)) return false;
  if ((c.reschedule_count || 0) >= CONFIG.MAX_RESCHEDULES) return false;
  if (!c.scheduled_at) return true;
  const t = new Date(c.scheduled_at).getTime();
  if (isNaN(t)) return false;
  const hrs = (t - Date.now()) / 3600000;
  return hrs >= CONFIG.CANCEL_FREE_HOURS;
}

/** Pull fresh user + wallet + consultations after a mutation. */
async function refreshUserSnapshot() {
  try {
    const me = await apiCall('/api/auth/me');
    if (me?.user) currentUser = me.user;
  } catch {}
  try { await reloadWallet?.(); } catch {}
  try { await reloadConsultations?.(); } catch {}
}

window.UserHelpers = {
  fmtInTz, timeUntil, levelFromXP, xpForLevel, xpProgressPercent, truncateHash,
  canJoinSessionNow, canCancelSession, canRescheduleSession, refreshUserSnapshot,
};

/* Refresh user state on cross-tab changes */
window.addEventListener('storage', (e) => {
  if (e.key === 'user' || e.key === 'token') {
    if (!e.newValue) { location.hash = '#/login'; return; }
    try { currentUser = JSON.parse(localStorage.getItem('user')); } catch {}
    try { rerenderRoleContent?.(); } catch {}
  }
});

/* Expose helpers other modules rely on */
window.loadUserExtendedData = loadUserExtendedData;
window.retryFailedDatasets = retryFailedDatasets;
window.retryUserExtendedDataIfNeeded = retryUserExtendedDataIfNeeded;
window.renderUserDashboard = renderUserDashboard;
window.renderUserContent = renderUserContent;
window.dispatchUserAction = dispatchUserAction;
window.handleUserActionFailure = handleUserActionFailure;