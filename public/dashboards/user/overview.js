/* ============================================================
   ExpertHub 2.0 — dashboards/user/overview.js
   Personalised User Command Centre / Overview dashboard.

   Section map:
   §1  Module configuration & refresh state
   §2  Safe data & validation utilities
   §3  User identity & ownership helpers
   §4  Dashboard data loading / refresh
   §5  Notification collection & prioritisation
   §6  Recommendation ranking
   §7  Personalised welcome
   §8  Dashboard insights
   §9  Dashboard statistics
   §10 Continue Learning
   §11 Upcoming Consultations
   §12 Quick Navigation
   §13 Recommended Learning
   §14 Goals & Productivity
   §15 Academic Progress
   §16 Wallet & Financial Summary
   §17 Notifications & Reminders
   §18 Recent Activity
   §19 Loading / empty / error states
   §20 Main renderer
   §21 Action registration
   §22 Module registration
   ============================================================ */

/* ============================================================
   §1  MODULE CONFIGURATION & REFRESH STATE
   ============================================================ */

const __overviewConfig = {
  limits: {
    upcomingSessions:    3,
    recommendedCourses:  3,
    notifications:       8,
    activity:            8,
    pendingTasks:        4,
    pendingAssignments:  4,
    subjects:            3,
    walletRecent:        3,
    continueLearning:    3,
    insights:            4,
  },
  windows: {
    soonMs:         24 * 60 * 60 * 1000,           // 24h
    weekMs:          7 * 24 * 60 * 60 * 1000,      // 7d
    recentAccessMs:  7 * 24 * 60 * 60 * 1000,      // 7d for "stale course"
  },
  validIntents: ['both', 'learn', 'consult'],
  statuses: {
    consultationActive: [
      'pending_payment', 'pending_expert_confirmation',
      'confirmed', 'scheduled', 'in_grace', 'in_session',
    ],
    consultationJoinable: ['confirmed', 'scheduled', 'in_grace', 'in_session'],
    consultationTerminal: ['cancelled', 'expired', 'no_show', 'refunded', 'completed'],
    assignmentOpen:       ['pending', 'in_progress', 'not_started', 'overdue', 'draft'],
    assignmentDone:       ['completed', 'graded', 'submitted'],
  },
};

const __overviewRefreshState = {
  inProgress:      false,
  requestSeq:      0,
  lastAttemptAt:   null,
  lastSuccessAt:   null,
  lastOutcome:     'idle', // 'idle' | 'loading' | 'success' | 'partial' | 'failed' | 'stale'
  failedSections:  [],
};

/* ============================================================
   §2  SAFE DATA & VALIDATION UTILITIES
   ============================================================ */

function _clampPct(n) {
  const v = Number(n);
  if (!isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function _safeArr(v) { return Array.isArray(v) ? v : []; }

function _safeNum(v, fallback = 0) {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

function _isValidNum(v) {
  if (v === null || v === undefined || v === '') return false;
  const n = Number(v);
  return isFinite(n);
}

function _toTimestamp(v) {
  if (v === null || v === undefined || v === '') return NaN;
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  const t = new Date(v).getTime();
  return isNaN(t) ? NaN : t;
}

function _isValidDate(v) { return !isNaN(_toTimestamp(v)); }

function _isValidId(id) {
  if (id === null || id === undefined) return false;
  const s = String(id);
  return s.length > 0 && s !== 'undefined' && s !== 'null';
}

function _normId(v) {
  return v === null || v === undefined ? '' : String(v);
}

function _normaliseStatus(s, allowed, fallback = '') {
  const v = String(s || '').toLowerCase().trim();
  return allowed.indexOf(v) !== -1 ? v : fallback;
}

function _escapeText(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  try { return esc(s); } catch {
    return s.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;',
    })[c]);
  }
}

function _safeUrl(v) {
  if (!v || typeof v !== 'string') return '';
  const s = v.trim();
  if (!/^(https?:\/\/|\/)/i.test(s)) return '';
  return s;
}

function _formatDateSafely(v) {
  if (isNaN(_toTimestamp(v))) return '';
  try { return fmtDate(v); } catch { return ''; }
}

function _formatDateTimeSafely(v) {
  if (isNaN(_toTimestamp(v))) return '';
  try { return fmtDT(v); } catch { return ''; }
}

function _humanizeDate(v) {
  const t = _toTimestamp(v);
  if (isNaN(t)) return '';
  try {
    if (t >= Date.now() && typeof UserHelpers?.timeUntil === 'function') {
      return UserHelpers.timeUntil(v);
    }
    if (typeof timeAgo === 'function') return timeAgo(v);
  } catch {}
  return '';
}

function _formatCurrencySafely(v) {
  if (!_isValidNum(v)) return '';
  try { return fmtCur(_safeNum(v)); } catch { return ''; }
}

function _sortByDate(arr, getter, dir = 'asc') {
  const copy = _safeArr(arr).slice();
  copy.sort((a, b) => {
    const ta = _toTimestamp(getter(a));
    const tb = _toTimestamp(getter(b));
    if (isNaN(ta) && isNaN(tb)) return 0;
    if (isNaN(ta)) return 1;
    if (isNaN(tb)) return -1;
    return dir === 'asc' ? ta - tb : tb - ta;
  });
  return copy;
}

/** Categorise a deadline into a human bucket. */
function _categoriseDeadline(dateVal) {
  const t = _toTimestamp(dateVal);
  if (isNaN(t)) return 'unknown';
  const now = Date.now();
  if (t < now) return 'overdue';
  const d = new Date(t);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'today';
  if (t - now < __overviewConfig.windows.soonMs) return 'soon24h';
  if (t - now < __overviewConfig.windows.weekMs) return 'week';
  return 'later';
}

/** Assign a display icon to an activity type. */
function _activityIcon(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('enroll'))                     return 'fa-graduation-cap';
  if (t.includes('lesson') || t.includes('complete')) return 'fa-check-circle';
  if (t.includes('consult'))                    return 'fa-comments';
  if (t.includes('payment') || t.includes('wallet') || t.includes('transaction')) return 'fa-credit-card';
  if (t.includes('certificate'))                return 'fa-certificate';
  if (t.includes('achievement') || t.includes('badge')) return 'fa-trophy';
  if (t.includes('assignment'))                 return 'fa-file-alt';
  if (t.includes('support') || t.includes('ticket')) return 'fa-headset';
  if (t.includes('event'))                      return 'fa-calendar';
  return 'fa-circle-info';
}

/* ============================================================
   §3  USER IDENTITY & OWNERSHIP HELPERS
   ============================================================ */

function _getUserId() {
  return currentUser?.id ?? null;
}

/**
 * Strict ownership check.
 * If a record has NO user_id, we trust the endpoint that delivered it
 * (matches original behaviour). If a user_id is present, it must match.
 */
function _isCurrentUserRecord(r) {
  if (!r || typeof r !== 'object') return false;
  if (r.user_id === null || r.user_id === undefined) return true;
  const uid = _getUserId();
  if (uid === null || uid === undefined) return false;
  return _normId(r.user_id) === _normId(uid);
}

function _getRecordById(arr, id) {
  if (!_isValidId(id)) return null;
  return _safeArr(arr).find(x => x && _normId(x.id) === _normId(id)) || null;
}

/** Resolve an enrollment's course and merge fallbacks. */
function _resolveCourseForEnrollment(e) {
  if (!e || typeof e !== 'object') return { course: null, title: '', instructor: '', category: '', thumbnail: '' };
  const course = _getRecordById(S.courses, e.course_id);
  return {
    course,
    title:      e.title || course?.title || '',
    instructor: course?.instructor_name || e.instructor_name || '',
    category:   course?.category || '',
    thumbnail:  _safeUrl(course?.thumbnail),
    courseId:   course?.id ?? e.course_id,
  };
}

/* ============================================================
   §4  DASHBOARD DATA LOADING / REFRESH
   ============================================================ */

/**
 * Refresh overview data.
 * - Serialised via __overviewRefreshState.inProgress
 * - Uses requestSeq to drop stale (out-of-order) responses
 * - Reports 'success' | 'partial' | 'failed' | 'stale' | 'loading'
 * - Preserves previously loaded data on partial failure
 * - Records failures for diagnostic display
 */
async function _refreshOverviewData({ manual = false } = {}) {
  if (__overviewRefreshState.inProgress) {
    return { outcome: 'loading', manual };
  }

  const mySeq = ++__overviewRefreshState.requestSeq;
  __overviewRefreshState.inProgress      = true;
  __overviewRefreshState.lastAttemptAt   = Date.now();
  __overviewRefreshState.lastOutcome     = 'loading';
  __overviewRefreshState.failedSections  = [];

  const failed = [];
  let anyOk    = false;
  const core   = { consultations: false, enrollments: false };

  try {
    const [consRes, enrollRes, achRes] = await Promise.allSettled([
      apiCall('/api/user/consultations'),
      apiCall('/api/user/enrollments'),
      apiCall('/api/user/achievements'),
    ]);

    /* Stale-response guard */
    if (mySeq !== __overviewRefreshState.requestSeq) {
      return { outcome: 'stale', manual };
    }

    /* --- Consultations (core) --- */
    if (consRes.status === 'fulfilled') {
      const d = consRes.value;
      if (Array.isArray(d?.consultations)) {
        S.consultations = d.consultations.filter(_isCurrentUserRecord);
        core.consultations = true;
        anyOk = true;
      } else {
        failed.push('consultations:malformed');
      }
    } else {
      failed.push('consultations:' + (consRes.reason?.message || 'failed'));
    }

    /* --- Enrollments (core) --- */
    if (enrollRes.status === 'fulfilled') {
      const d = enrollRes.value;
      if (Array.isArray(d?.enrollments)) {
        S.enrollments = d.enrollments.filter(_isCurrentUserRecord);
        S.enrolledCourseIds = new Set(
          S.enrollments
            .map(e => _normId(e.course_id))
            .filter(Boolean)
        );
        core.enrollments = true;
        anyOk = true;
      } else {
        failed.push('enrollments:malformed');
      }
    } else {
      failed.push('enrollments:' + (enrollRes.reason?.message || 'failed'));
    }

    /* --- Achievements (supplementary) --- */
    if (achRes.status === 'fulfilled') {
      const d = achRes.value;
      if (d && typeof d === 'object') {
        S.userXP = _safeNum(d.xp, S.userXP ?? 0);
        S.userLevel = _safeNum(
          d.level,
          typeof levelFromXP === 'function' ? levelFromXP(S.userXP) : (S.userLevel ?? 1)
        );
        S.userBadges = Array.isArray(d.badges) ? d.badges : (S.userBadges || []);
        if (d.streak) S.userStreak = d.streak;
        anyOk = true;
      } else {
        failed.push('achievements:malformed');
      }
    } else {
      failed.push('achievements:' + (achRes.reason?.message || 'failed'));
    }

    /* Sync global state if available */
    if (typeof window.ExpertHubUser !== 'undefined'
        && typeof window.ExpertHubUser.syncStateFromS === 'function') {
      window.ExpertHubUser.syncStateFromS();
    }

    /* Compute outcome */
    if (!anyOk) {
      __overviewRefreshState.lastOutcome = 'failed';
    } else if (!core.consultations || !core.enrollments || failed.length > 0) {
      __overviewRefreshState.lastOutcome = 'partial';
    } else {
      __overviewRefreshState.lastOutcome = 'success';
      __overviewRefreshState.lastSuccessAt = Date.now();
    }
    __overviewRefreshState.failedSections = failed;

    return { outcome: __overviewRefreshState.lastOutcome, failed, manual };
  } catch (e) {
    __overviewRefreshState.lastOutcome    = 'failed';
    __overviewRefreshState.failedSections = ['exception:' + (e?.message || 'unknown')];
    return { outcome: 'failed', failed: __overviewRefreshState.failedSections, manual };
  } finally {
    __overviewRefreshState.inProgress = false;
  }
}

/* ============================================================
   §5  NOTIFICATION COLLECTION & PRIORITISATION
   ============================================================ */

/**
 * Collect real notifications from existing state.
 * Each notification carries a stable identity `type:ref:subtype`
 * so the same underlying event cannot appear twice.
 */
function _collectNotifications() {
  const items = [];
  const seen  = new Set();
  const now   = Date.now();
  const soon  = __overviewConfig.windows.soonMs;
  const week  = __overviewConfig.windows.weekMs;

  function add(n) {
    const key = `${n.type}:${_normId(n.ref)}:${n.subtype || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(n);
  }

  /* --- Consultations: payment + soon --- */
  _safeArr(S.consultations).forEach(c => {
    if (!_isCurrentUserRecord(c)) return;
    const status = _normId(c.status);
    const t      = _toTimestamp(c.scheduled_at);

    if (status === 'pending_payment') {
      add({
        type: 'payment', subtype: 'required', ref: c.id,
        icon: 'fa-credit-card', tab: 'consultations', priority: 'urgent',
        message: `Payment required for ${c.title || 'a booking'}`,
      });
      return;
    }

    if (!isNaN(t) && t > now && t < now + soon
        && __overviewConfig.statuses.consultationActive.indexOf(status) !== -1) {
      add({
        type: 'consultation', subtype: 'soon', ref: c.id,
        icon: 'fa-video', tab: 'consultations', priority: 'high',
        message: `${c.title || 'Session'} starts ${_humanizeDate(c.scheduled_at) || 'soon'}`,
      });
    }
  });

  /* --- Academic assignments --- */
  _safeArr(S.academicAssignments).forEach(a => {
    if (!_isCurrentUserRecord(a)) return;
    const st = String(a.status || '').toLowerCase();
    if (__overviewConfig.statuses.assignmentDone.indexOf(st) !== -1) return;
    const t = _toTimestamp(a.due_date);
    if (isNaN(t)) return;
    if (t < now) {
      add({
        type: 'assignment', subtype: 'overdue', ref: a.id,
        icon: 'fa-exclamation-triangle', tab: 'academic', priority: 'urgent',
        message: `${a.title || 'Assignment'} is overdue`,
      });
    } else if (t < now + soon) {
      add({
        type: 'assignment', subtype: 'soon', ref: a.id,
        icon: 'fa-file-alt', tab: 'academic', priority: 'high',
        message: `${a.title || 'Assignment'} due ${_formatDateSafely(a.due_date)}`,
      });
    } else if (t < now + week) {
      add({
        type: 'assignment', subtype: 'week', ref: a.id,
        icon: 'fa-file-alt', tab: 'academic', priority: 'normal',
        message: `${a.title || 'Assignment'} due ${_formatDateSafely(a.due_date)}`,
      });
    }
  });

  /* --- Tasks with due dates --- */
  _safeArr(S.tasks).forEach(t => {
    if (!_isCurrentUserRecord(t)) return;
    if (t.status === 'done' || t.status === 'completed') return;
    const ts = _toTimestamp(t.due_date);
    if (isNaN(ts)) return;
    if (ts < now) {
      add({
        type: 'task', subtype: 'overdue', ref: t.id,
        icon: 'fa-list-check', tab: 'productivity', priority: 'high',
        message: `Task "${t.title || 'Task'}" is overdue`,
      });
    } else if (ts < now + soon) {
      add({
        type: 'task', subtype: 'soon', ref: t.id,
        icon: 'fa-list-check', tab: 'productivity', priority: 'normal',
        message: `Task "${t.title || 'Task'}" due ${_formatDateSafely(t.due_date)}`,
      });
    }
  });

  /* --- Goal deadlines --- */
  _safeArr(S.personalGoals).forEach(g => {
    if (!_isCurrentUserRecord(g)) return;
    if (_safeNum(g.progress, -1) >= 100 || g.status === 'completed') return;
    const ts = _toTimestamp(g.target_date || g.due_date);
    if (isNaN(ts)) return;
    if (ts > now && ts < now + week) {
      add({
        type: 'goal', subtype: 'due', ref: g.id,
        icon: 'fa-flag', tab: 'personal-development', priority: 'normal',
        message: `Goal "${g.title || 'Goal'}" is due ${_formatDateSafely(g.target_date || g.due_date)}`,
      });
    }
  });

  /* --- Event reminders --- */
  _safeArr(S.eventRegistrations).forEach(r => {
    const ev = _getRecordById(S.events, r.event_id);
    if (!ev || !ev.date) return;
    const t = _toTimestamp(ev.date);
    if (isNaN(t)) return;
    if (t > now && t < now + soon) {
      add({
        type: 'event', subtype: 'soon', ref: ev.id,
        icon: 'fa-calendar', tab: 'events', priority: 'normal',
        message: `${ev.title || 'Event'} ${_humanizeDate(ev.date) || 'is coming up'}`,
      });
    }
  });

  /* --- Support ticket updates --- */
  _safeArr(S.tickets).forEach(t => {
    if (t.status === 'in_progress' && t.last_update_unread) {
      add({
        type: 'support', subtype: 'update', ref: t.id,
        icon: 'fa-headset', tab: 'support', priority: 'normal',
        message: `Support ticket ${t.reference || t.id} has an update`,
      });
    }
  });

  const rank = { urgent: 0, high: 1, normal: 2, low: 3 };
  items.sort((a, b) => (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2));
  return items;
}

/* ============================================================
   §6  RECOMMENDATION RANKING
   ============================================================ */

function _rankRecommendedCourses(limit = __overviewConfig.limits.recommendedCourses) {
  const enrolledIds = (S.enrolledCourseIds instanceof Set) ? S.enrolledCourseIds : new Set();

  const enrolledCats = new Set(
    _safeArr(S.enrollments)
      .map(e => (_getRecordById(S.courses, e.course_id) || {}).category)
      .filter(Boolean)
  );

  const interestSet = new Set(
    _safeArr(S.userInterests || S.learningInterests || [])
      .map(x => (typeof x === 'string' ? x : (x?.name || x?.category || '')))
      .filter(Boolean)
  );

  return _safeArr(S.courses)
    .filter(c => {
      if (!c || typeof c !== 'object') return false;
      if (!_isValidId(c.id)) return false;
      if (enrolledIds.has(_normId(c.id))) return false;
      if (c.enrollment_available === false) return false;
      if (c.is_published === false || c.published === false) return false;
      if (c.status && ['published', 'active', 'available']
            .indexOf(String(c.status).toLowerCase()) === -1) return false;
      return true;
    })
    .map(c => {
      let score = 0;
      if (enrolledCats.has(c.category)) score += 50;
      if (interestSet.has(c.category))  score += 30;
      score += Math.min(30, _safeNum(c.enrolled_count, 0) / 10);
      /* Rating: neutral fallback when missing (not treated as poor) */
      if (_isValidNum(c.average_rating)) {
        score += _safeNum(c.average_rating) * 4;
      } else {
        score += 10;
      }
      return { c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.c);
}

/* ============================================================
   §7  PERSONALISED WELCOME
   ============================================================ */

function _buildWelcomeSummary(intent) {
  const parts = [];
  const now   = Date.now();
  const soon  = __overviewConfig.windows.soonMs;

  if (intent !== 'learn') {
    const upcoming = _safeArr(S.consultations).filter(c => {
      if (!_isCurrentUserRecord(c)) return false;
      const t = _toTimestamp(c.scheduled_at);
      if (isNaN(t) || t < now || t > now + soon) return false;
      return __overviewConfig.statuses.consultationActive.indexOf(_normId(c.status)) !== -1;
    });
    if (upcoming.length) {
      parts.push(`You have ${upcoming.length} upcoming session${upcoming.length === 1 ? '' : 's'} soon.`);
    }
  }

  if (intent !== 'consult') {
    const inProgress = _safeArr(S.enrollments).filter(e => {
      const p = _safeNum(e.progress, -1);
      return p > 0 && p < 100;
    });
    if (inProgress.length) {
      parts.push(`${inProgress.length} course${inProgress.length === 1 ? '' : 's'} in progress.`);
    }
  }

  const overdue = _safeArr(S.academicAssignments).filter(a => {
    if (!_isCurrentUserRecord(a)) return false;
    if (__overviewConfig.statuses.assignmentDone
          .indexOf(String(a.status || '').toLowerCase()) !== -1) return false;
    const t = _toTimestamp(a.due_date);
    return !isNaN(t) && t < now;
  });
  if (overdue.length) {
    parts.push(`${overdue.length} assignment${overdue.length === 1 ? '' : 's'} overdue.`);
  }

  const pendingPay = _safeArr(S.consultations).filter(c =>
    _isCurrentUserRecord(c) && _normId(c.status) === 'pending_payment'
  );
  if (pendingPay.length) {
    parts.push(`${pendingPay.length} payment${pendingPay.length === 1 ? '' : 's'} pending.`);
  }

  return parts.map(p => _escapeText(p)).join(' ');
}

function _renderWelcome(intent) {
  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const intentLabel = intent === 'both' ? 'Learning + Consulting'
                    : intent === 'learn' ? 'Learning'
                    : 'Consulting';
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const name    = currentUser?.name || 'User';
  const summary = _buildWelcomeSummary(intent);

  return `
    <section class="page-header">
      <div>
        <h1 class="page-title">${_escapeText(greeting)}, ${_escapeText(name)}</h1>
        <p class="page-subtitle">${_escapeText(dateStr)}</p>
        ${summary ? `<p class="page-subtitle" style="margin-top:4px">${summary}</p>` : ''}
      </div>
      <div class="page-actions">
        <span class="chip chip-neutral">Mode: ${_escapeText(intentLabel)}</span>
        <button class="btn btn-secondary btn-sm" data-action="change-intent" aria-label="Change mode">
          <i class="fas fa-sliders"></i> Change Mode</button>
        <button class="btn btn-secondary btn-sm" data-action="refresh-overview" aria-label="Refresh dashboard">
          <i class="fas fa-rotate-right"></i></button>
      </div>
    </section>
  `;
}

/* ============================================================
   §8  DASHBOARD INSIGHTS
   ============================================================ */

function _renderOverviewInsights() {
  const insights = [];
  const now      = Date.now();
  const soon     = __overviewConfig.windows.soonMs;
  const recent   = __overviewConfig.windows.recentAccessMs;

  /* Overdue assignment */
  const overdueAssignment = _safeArr(S.academicAssignments).find(a => {
    if (!_isCurrentUserRecord(a)) return false;
    if (__overviewConfig.statuses.assignmentDone
          .indexOf(String(a.status || '').toLowerCase()) !== -1) return false;
    const t = _toTimestamp(a.due_date);
    return !isNaN(t) && t < now;
  });
  if (overdueAssignment) {
    insights.push({
      icon: 'fa-exclamation-triangle', tone: 'danger',
      message: `"${overdueAssignment.title || 'Assignment'}" is overdue`,
      tab: 'academic', actionLabel: 'Open',
    });
  }

  /* Pending payment */
  const pendingPay = _safeArr(S.consultations).find(c =>
    _isCurrentUserRecord(c) && _normId(c.status) === 'pending_payment'
  );
  if (pendingPay) {
    insights.push({
      icon: 'fa-credit-card', tone: 'warning',
      message: `Payment pending for "${pendingPay.title || 'a booking'}"`,
      tab: 'consultations', actionLabel: 'Pay',
    });
  }

  /* Upcoming session within 24h */
  const soonSession = _sortByDate(
    _safeArr(S.consultations).filter(c => {
      if (!_isCurrentUserRecord(c)) return false;
      const t = _toTimestamp(c.scheduled_at);
      return !isNaN(t) && t > now && t < now + soon
        && __overviewConfig.statuses.consultationActive.indexOf(_normId(c.status)) !== -1;
    }),
    c => c.scheduled_at, 'asc'
  )[0];
  if (soonSession) {
    insights.push({
      icon: 'fa-video', tone: 'info',
      message: `"${soonSession.title || 'Session'}" starts ${_humanizeDate(soonSession.scheduled_at) || 'soon'}`,
      tab: 'consultations', actionLabel: 'View',
    });
  }

  /* Stale in-progress course */
  const staleCourse = _safeArr(S.enrollments).find(e => {
    const p = _safeNum(e.progress, -1);
    if (!(p > 0 && p < 100)) return false;
    const t = _toTimestamp(e.last_accessed_at);
    if (isNaN(t)) return false;
    return (now - t) > recent;
  });
  if (staleCourse) {
    insights.push({
      icon: 'fa-clock', tone: 'neutral',
      message: `"${staleCourse.title || 'A course'}" hasn't been opened in a while`,
      tab: 'my-learning', actionLabel: 'Resume',
    });
  }

  /* Overdue tasks */
  const overdueTask = _safeArr(S.tasks).find(t => {
    if (!_isCurrentUserRecord(t)) return false;
    if (t.status === 'done' || t.status === 'completed') return false;
    const ts = _toTimestamp(t.due_date);
    return !isNaN(ts) && ts < now;
  });
  if (overdueTask) {
    insights.push({
      icon: 'fa-list-check', tone: 'warning',
      message: `Task "${overdueTask.title || 'Task'}" is overdue`,
      tab: 'productivity', actionLabel: 'Open',
    });
  }

  const top = insights.slice(0, __overviewConfig.limits.insights);
  if (!top.length) return '';

  return `
    <section class="panel">
      <h3 class="panel-title"><i class="fas fa-lightbulb"></i> Needs Your Attention</h3>
      <ul class="list-stack">
        ${top.map(i => {
          const tone = i.tone === 'danger'  ? 'var(--danger)'
                     : i.tone === 'warning' ? 'var(--warning, #f59e0b)'
                     : i.tone === 'info'    ? 'var(--info, #3b82f6)'
                     : 'var(--brand)';
          return `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">
                  <i class="fas ${i.icon}" style="color:${tone}"></i>
                  ${_escapeText(i.message)}
                </span>
              </div>
              ${i.tab ? `
                <button class="btn btn-secondary btn-xs"
                        data-action="switch-tab" data-tab="${_escapeText(i.tab)}">
                  ${_escapeText(i.actionLabel || 'View')}
                </button>` : ''}
            </li>
          `;
        }).join('')}
      </ul>
    </section>
  `;
}

/* ============================================================
   §9  DASHBOARD STATISTICS
   ============================================================ */

function _renderStats(intent, mine) {
  const showLearn   = intent !== 'consult';
  const showConsult = intent !== 'learn';

  const enrollments  = _safeArr(S.enrollments);
  const inProgress   = enrollments.filter(e => {
    const p = _safeNum(e.progress, -1);
    return p > 0 && p < 100;
  });
  const completed    = enrollments.filter(e => _safeNum(e.progress, -1) >= 100);

  const activeCons   = mine.filter(c =>
    __overviewConfig.statuses.consultationActive.indexOf(_normId(c.status)) !== -1
  ).length;

  const xp           = _safeNum(S.userXP);
  const level        = _safeNum(S.userLevel)
                    || (typeof levelFromXP === 'function' ? levelFromXP(xp) : 1);
  const streakCur    = _safeNum(S.userStreak?.current);
  const streakBest   = _safeNum(S.userStreak?.longest);
  const badgeCount   = _safeArr(S.userBadges).length;
  const certCount    = _safeArr(S.certificates).length;
  const pendingTasks = _safeArr(S.tasks)
    .filter(t => t.status !== 'done' && t.status !== 'completed').length;

  const walletOk     = _isValidNum(S.wallet?.balance);
  const walletValue  = walletOk ? _formatCurrencySafely(S.wallet.balance) : '—';

  const items = [];
  if (showLearn) {
    items.push({
      label: 'Enrollments', value: enrollments.length,
      sub: `${completed.length} completed · ${inProgress.length} active`,
      icon: 'fa-graduation-cap', tone: 'blue', tab: 'my-learning',
    });
  }
  items.push({
    label: 'Level', value: level, sub: `${xp} XP`,
    icon: 'fa-medal', tone: 'purple', tab: 'achievements',
  });
  items.push({
    label: 'Streak', value: `${streakCur}d`,
    sub: streakBest ? `Best ${streakBest}d` : '',
    icon: 'fa-fire', tone: 'red', tab: 'achievements',
  });
  if (showConsult) {
    items.push({
      label: 'Active Consultations', value: activeCons,
      icon: 'fa-comments', tone: 'green', tab: 'consultations',
    });
  }
  items.push({ label: 'Badges',        value: badgeCount,   icon: 'fa-award',        tone: 'yellow', tab: 'achievements' });
  items.push({ label: 'Certificates',  value: certCount,    icon: 'fa-certificate',  tone: 'purple', tab: 'certificates' });
  items.push({ label: 'Tasks',         value: pendingTasks, icon: 'fa-list-check',   tone: 'blue',   tab: 'productivity' });
  items.push({ label: 'Wallet',        value: walletValue,  icon: 'fa-wallet',       tone: 'yellow', tab: 'wallet' });

  return UserUI.stats(items);
}

/* ============================================================
   §10  CONTINUE LEARNING
   ============================================================ */

function _renderContinueLearning(intent) {
  if (intent === 'consult') return '';

  const inProgress = _safeArr(S.enrollments)
    .filter(e => {
      const p = _safeNum(e.progress, -1);
      return p > 0 && p < 100;
    })
    .slice(0, __overviewConfig.limits.continueLearning);

  if (!inProgress.length) {
    return `
      <section class="panel">
        <div class="panel-header-row">
          <h3 class="panel-title">Continue Learning</h3>
        </div>
        <div class="empty-state" style="padding:16px;text-align:center">
          <i class="fas fa-graduation-cap" style="font-size:1.5rem;color:var(--muted)"></i>
          <p class="form-hint" style="margin-top:8px">Your learning journey starts here.</p>
          <button class="btn btn-primary btn-sm" data-action="switch-tab" data-tab="eschool">
            Browse Courses
          </button>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel">
      <div class="panel-header-row">
        <h3 class="panel-title">Continue Learning</h3>
        <button class="btn btn-ghost btn-sm" data-action="switch-tab" data-tab="my-learning">
          View all <i class="fas fa-arrow-right"></i>
        </button>
      </div>
      ${inProgress.map(e => {
        const pct    = _clampPct(e.progress);
        const info   = _resolveCourseForEnrollment(e);
        const last   = e.last_accessed_at ? `Last accessed ${_humanizeDate(e.last_accessed_at)}` : '';
        const next   = e.next_lesson_title || e.last_lesson_title || '';
        if (!_isValidId(info.courseId)) return '';

        return `
          <div class="enrollment-card">
            <div style="display:flex;gap:12px;align-items:flex-start">
              ${info.thumbnail
                ? `<img src="${_escapeText(info.thumbnail)}" alt="" style="width:80px;height:60px;object-fit:cover;border-radius:6px" />`
                : ''}
              <div style="flex:1">
                <h3 class="enrollment-title">${_escapeText(info.title)}</h3>
                <p class="enrollment-type">
                  ${info.instructor ? `<i class="fas fa-user-tie"></i> ${_escapeText(info.instructor)}` : ''}
                  ${info.category ? ` · ${_escapeText(info.category)}` : ''}
                  ${e.enrollment_type ? ` · ${_escapeText(e.enrollment_type)}` : ''}
                </p>
                ${next ? `<p class="form-hint">Next: ${_escapeText(next)}</p>` : ''}
                <div class="progress-bar"><span style="width:${pct}%"></span></div>
                <p class="enrollment-progress">${pct}% complete${last ? ` · ${_escapeText(last)}` : ''}</p>
                <div class="panel-actions" style="display:flex;gap:6px;margin-top:8px">
                  <button class="btn btn-primary btn-sm"
                          data-action="open-course-player" data-id="${_escapeText(info.courseId)}">
                    <i class="fas fa-play"></i> Resume
                  </button>
                  <button class="btn btn-secondary btn-sm"
                          data-action="view-course-detail" data-id="${_escapeText(info.courseId)}">
                    <i class="fas fa-eye"></i> Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </section>
  `;
}

/* ============================================================
   §11  UPCOMING CONSULTATIONS
   ============================================================ */

function _renderUpcomingSessions(mine) {
  const now = Date.now();

  const upcoming = _sortByDate(
    mine.filter(c => {
      const t  = _toTimestamp(c.scheduled_at);
      if (isNaN(t) || t <= now) return false;
      const st = _normId(c.status);
      if (__overviewConfig.statuses.consultationTerminal.indexOf(st) !== -1) return false;
      return true;
    }),
    c => c.scheduled_at, 'asc'
  ).slice(0, __overviewConfig.limits.upcomingSessions);

  if (!upcoming.length) {
    return `
      <section class="panel">
        <div class="panel-header-row">
          <h3 class="panel-title">Upcoming Sessions</h3>
        </div>
        <div class="empty-state" style="padding:16px;text-align:center">
          <i class="fas fa-calendar" style="font-size:1.5rem;color:var(--muted)"></i>
          <p class="form-hint" style="margin-top:8px">No upcoming sessions.</p>
          <button class="btn btn-primary btn-sm" data-action="switch-tab" data-tab="experts">
            Find Experts
          </button>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel">
      <div class="panel-header-row">
        <h3 class="panel-title">Upcoming Sessions</h3>
        <button class="btn btn-ghost btn-sm" data-action="switch-tab" data-tab="consultations">
          View all <i class="fas fa-arrow-right"></i>
        </button>
      </div>
      ${upcoming.map(c => {
        const st       = _normId(c.status);
        const canJoin  = typeof window.UserHelpers?.canJoinSessionNow === 'function'
                        ? window.UserHelpers.canJoinSessionNow(c)
                        : false;
        const needsPay = st === 'pending_payment'
                      || (c.payment_status === 'pending'
                          && st !== 'cancelled' && st !== 'expired');
        const ref      = c.booking_reference ? _escapeText(c.booking_reference) : '';
        const price    = _formatCurrencySafely(c.price);
        const expName  = c.expert_name || 'Expert';
        const expSpec  = c.expert_specialization || '';
        const when     = _formatDateTimeSafely(c.scheduled_at)
                      || (typeof UserHelpers?.fmtInTz === 'function'
                           ? UserHelpers.fmtInTz(c.scheduled_at, currentUser?.timezone)
                           : '');
        const until    = _humanizeDate(c.scheduled_at);

        return `
          <div class="consultation-card">
            <header class="consultation-card-header">
              <div>
                <h4 class="consultation-card-title">${_escapeText(c.title || 'Session')}</h4>
                <p class="consultation-card-meta">
                  ${UserUI.statusPill(c.status)}
                  ${ref ? `<span class="form-hint" style="margin-left:6px">Ref: ${ref}</span>` : ''}
                </p>
              </div>
              <div class="consultation-card-price">
                ${price}
                ${needsPay ? '<div class="consultation-card-escrow">Payment pending</div>' : ''}
              </div>
            </header>
            <div class="consultation-card-body">
              <div class="consultation-card-expert">
                <img class="user-avatar" src="${_escapeText(avatar({ name: expName }))}" alt="" />
                <div>
                  <div class="user-name">${_escapeText(expName)}</div>
                  <div class="user-email">${_escapeText(expSpec)}</div>
                </div>
              </div>
              <div class="consultation-card-time">
                <i class="fas fa-calendar"></i>
                <strong>${_escapeText(when)}</strong>
                ${until ? `<span class="consultation-card-countdown">${_escapeText(until)}</span>` : ''}
              </div>
              ${c.duration_minutes ? `
                <div class="consultation-card-duration">
                  <i class="fas fa-clock"></i> ${_safeNum(c.duration_minutes)} min
                  ${c.consultation_type ? ` · ${_escapeText(c.consultation_type)}` : ''}
                </div>
              ` : ''}
            </div>
            <footer class="consultation-card-actions">
              ${needsPay
                ? `<button class="btn btn-primary btn-sm"
                          data-action="complete-consultation-payment" data-id="${_escapeText(c.id)}">
                     <i class="fas fa-credit-card"></i> Pay</button>`
                : `<button class="btn btn-primary btn-sm"
                          data-action="start-session" data-id="${_escapeText(c.id)}"
                          ${canJoin ? '' : 'disabled aria-disabled="true" title="Session not open yet"'}>
                     <i class="fas fa-video"></i> Join</button>`}
              <button class="btn btn-info btn-sm"
                      data-action="open-chat" data-id="${_escapeText(c.id)}">
                <i class="fas fa-comments"></i> Chat
              </button>
              <button class="btn btn-secondary btn-sm"
                      data-action="consultation-detail" data-id="${_escapeText(c.id)}">
                <i class="fas fa-eye"></i> Details
              </button>
            </footer>
          </div>
        `;
      }).join('')}
    </section>
  `;
}

/* ============================================================
   §12  QUICK NAVIGATION
   ============================================================ */

function _renderTiles(intent) {
  const showLearn   = intent !== 'consult';
  const showConsult = intent !== 'learn';

  const certCount   = _safeArr(S.certificates).length;
  const badgeCount  = _safeArr(S.userBadges).length;
  const activeCons  = _safeArr(S.consultations).filter(c =>
    _isCurrentUserRecord(c)
    && __overviewConfig.statuses.consultationJoinable.indexOf(_normId(c.status)) !== -1
  ).length;
  const taskCount   = _safeArr(S.tasks)
    .filter(t => t.status !== 'done' && t.status !== 'completed').length;
  const hasAcademic = _safeArr(S.academicSubjects).length > 0
                   || _safeArr(S.academicAssignments).length > 0;
  const hasGoals    = _safeArr(S.personalGoals).length > 0
                   || _safeArr(S.habits).length > 0;
  const walletOk    = _isValidNum(S.wallet?.balance);

  return `
    <section class="dashboard-columns">
      ${showLearn ? `
        <article class="dashboard-card tile-card">
          <i class="fas fa-school tile-icon"></i>
          <h3 class="tile-title">E-School</h3>
          <p class="tile-desc">Browse courses, bootcamps, tuition and exam prep</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">Explore</button>
        </article>
        <article class="dashboard-card tile-card">
          <i class="fas fa-graduation-cap tile-icon"></i>
          <h3 class="tile-title">My Learning</h3>
          <p class="tile-desc">Continue where you left off</p>
          <button class="btn btn-info" data-action="switch-tab" data-tab="my-learning">Open</button>
        </article>
      ` : ''}
      ${showConsult ? `
        <article class="dashboard-card tile-card">
          <i class="fas fa-user-tie tile-icon"></i>
          <h3 class="tile-title">Find Experts</h3>
          <p class="tile-desc">Book 1-on-1 consultations</p>
          <button class="btn btn-success" data-action="switch-tab" data-tab="experts">Browse</button>
        </article>
        <article class="dashboard-card tile-card">
          <i class="fas fa-comments tile-icon"></i>
          <h3 class="tile-title">Consultations</h3>
          <p class="tile-desc">${activeCons} active session${activeCons === 1 ? '' : 's'}</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="consultations">Open</button>
        </article>
      ` : ''}
      <article class="dashboard-card tile-card">
        <i class="fas fa-trophy tile-icon"></i>
        <h3 class="tile-title">Achievements</h3>
        <p class="tile-desc">${badgeCount} badge${badgeCount === 1 ? '' : 's'} earned</p>
        <button class="btn btn-warning" data-action="switch-tab" data-tab="achievements">View</button>
      </article>
      <article class="dashboard-card tile-card">
        <i class="fas fa-certificate tile-icon"></i>
        <h3 class="tile-title">Certificates</h3>
        <p class="tile-desc">${certCount} earned</p>
        <button class="btn btn-info" data-action="switch-tab" data-tab="certificates">View</button>
      </article>
      <article class="dashboard-card tile-card">
        <i class="fas fa-list-check tile-icon"></i>
        <h3 class="tile-title">Tasks</h3>
        <p class="tile-desc">${taskCount} pending task${taskCount === 1 ? '' : 's'}</p>
        <button class="btn btn-secondary" data-action="switch-tab" data-tab="productivity">Open</button>
      </article>
      ${hasGoals ? `
        <article class="dashboard-card tile-card">
          <i class="fas fa-flag tile-icon"></i>
          <h3 class="tile-title">Personal Development</h3>
          <p class="tile-desc">Goals &amp; habits</p>
          <button class="btn btn-secondary" data-action="switch-tab" data-tab="personal-development">Open</button>
        </article>
      ` : ''}
      ${hasAcademic ? `
        <article class="dashboard-card tile-card">
          <i class="fas fa-book-open tile-icon"></i>
          <h3 class="tile-title">Academic Support</h3>
          <p class="tile-desc">Subjects &amp; assignments</p>
          <button class="btn btn-secondary" data-action="switch-tab" data-tab="academic">Open</button>
        </article>
      ` : ''}
      <article class="dashboard-card tile-card">
        <i class="fas fa-wallet tile-icon"></i>
        <h3 class="tile-title">Wallet</h3>
        <p class="tile-desc">${walletOk ? _formatCurrencySafely(S.wallet.balance) : 'Open wallet'}</p>
        <button class="btn btn-info" data-action="switch-tab" data-tab="wallet">Open</button>
      </article>
      <article class="dashboard-card tile-card">
        <i class="fas fa-headset tile-icon"></i>
        <h3 class="tile-title">Support Centre</h3>
        <p class="tile-desc">Get help &amp; track tickets</p>
        <button class="btn btn-secondary" data-action="switch-tab" data-tab="support">Open</button>
      </article>
    </section>
  `;
}

/* ============================================================
   §13  RECOMMENDED LEARNING
   ============================================================ */

function _renderRecommended() {
  const recommended = _rankRecommendedCourses();
  if (!recommended.length) return '';

  return `
    <section class="panel">
      <h3 class="panel-title">Recommended For You</h3>
      <div class="card-grid">
        ${recommended.map(c => `
          <article class="program-card">
            <span class="chip chip-blue">${_escapeText((c.course_type || '').replace(/_/g, ' '))}</span>
            <h4 class="program-title">${_escapeText(c.title || '')}</h4>
            <p class="program-desc">${_escapeText((c.description || '').slice(0, 110))}</p>
            ${c.instructor_name ? `<p class="program-meta"><i class="fas fa-user-tie"></i> ${_escapeText(c.instructor_name)}</p>` : ''}
            <footer class="program-footer">
              <span class="program-price">${_formatCurrencySafely(c.price)}</span>
              <span class="program-meta">${_escapeText(c.level || '')}</span>
            </footer>
            <div class="panel-actions" style="margin-top:10px">
              <button class="btn btn-primary btn-sm"
                      data-action="view-course-detail" data-id="${_escapeText(c.id)}">
                <i class="fas fa-eye"></i> View
              </button>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

/* ============================================================
   §14  GOALS & PRODUCTIVITY
   ============================================================ */

function _renderGoalsAndTasks() {
  const goals  = _safeArr(S.personalGoals).filter(_isCurrentUserRecord);
  const tasks  = _safeArr(S.tasks).filter(_isCurrentUserRecord);
  const habits = _safeArr(S.habits).filter(_isCurrentUserRecord);

  const now            = Date.now();
  const activeGoals    = goals.filter(g =>
    _safeNum(g.progress, -1) < 100 && g.status !== 'completed'
  ).length;
  const completedGoals = goals.filter(g =>
    _safeNum(g.progress, -1) >= 100 || g.status === 'completed'
  ).length;
  const pendingTasks   = tasks.filter(t => t.status !== 'done' && t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'done' || t.status === 'completed');
  const overdueTasks   = pendingTasks.filter(t => {
    const ts = _toTimestamp(t.due_date);
    return !isNaN(ts) && ts < now;
  });

  if (!goals.length && !tasks.length && !habits.length) return '';

  const dueSorted = pendingTasks.slice().sort((a, b) => {
    const ta = _toTimestamp(a.due_date);
    const tb = _toTimestamp(b.due_date);
    if (isNaN(ta) && isNaN(tb)) return 0;
    if (isNaN(ta)) return 1;
    if (isNaN(tb)) return -1;
    return ta - tb;
  }).slice(0, __overviewConfig.limits.pendingTasks);

  return `
    <section class="panel">
      <h3 class="panel-title">Goals &amp; Productivity</h3>
      <div class="card-grid">
        <article class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Active Goals</p>
            <p class="stat-value">${activeGoals}</p>
            <p class="stat-sub">${goals.length} total · ${completedGoals} completed</p>
          </div>
          <div class="stat-icon stat-icon-blue"><i class="fas fa-flag"></i></div>
        </article>
        <article class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Pending Tasks</p>
            <p class="stat-value">${pendingTasks.length}</p>
            ${overdueTasks.length
              ? `<p class="stat-sub" style="color:var(--danger)">${overdueTasks.length} overdue</p>`
              : '<p class="stat-sub">All on track</p>'}
          </div>
          <div class="stat-icon stat-icon-yellow"><i class="fas fa-list-check"></i></div>
        </article>
        <article class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Completed Tasks</p>
            <p class="stat-value">${completedTasks.length}</p>
            <p class="stat-sub">${tasks.length} total</p>
          </div>
          <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
        </article>
        <article class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Habits</p>
            <p class="stat-value">${habits.length}</p>
            <p class="stat-sub">Tracking</p>
          </div>
          <div class="stat-icon stat-icon-green"><i class="fas fa-repeat"></i></div>
        </article>
      </div>
      ${dueSorted.length ? `
        <div style="margin-top:12px">
          <h4 style="margin-bottom:8px">Tasks Due</h4>
          ${dueSorted.map(t => {
            const ts      = _toTimestamp(t.due_date);
            const overdue = !isNaN(ts) && ts < now;
            const dueLabel = isNaN(ts)
              ? 'No due date'
              : (overdue
                  ? `<span style="color:var(--danger)">${_escapeText(_formatDateSafely(t.due_date))} (overdue)</span>`
                  : _escapeText(_formatDateSafely(t.due_date)));
            return `
              <div class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${_escapeText(t.title || '')}</span>
                  <span class="list-row-sub">${dueLabel}</span>
                </div>
                ${_isValidId(t.id) ? `
                  <button class="btn btn-success btn-xs"
                          data-action="complete-task" data-id="${_escapeText(t.id)}"
                          aria-label="Complete task">
                    <i class="fas fa-check"></i>
                  </button>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
      <div class="panel-actions" style="margin-top:12px">
        <button class="btn btn-secondary btn-sm" data-action="switch-tab" data-tab="personal-development">
          Goals &amp; Habits <i class="fas fa-arrow-right"></i>
        </button>
        <button class="btn btn-secondary btn-sm" data-action="switch-tab" data-tab="productivity">
          Productivity <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    </section>
  `;
}

/* ============================================================
   §15  ACADEMIC PROGRESS
   ============================================================ */

function _renderAcademic() {
  const subjects    = _safeArr(S.academicSubjects).filter(_isCurrentUserRecord);
  const assignments = _safeArr(S.academicAssignments).filter(_isCurrentUserRecord);
  const now         = Date.now();

  const pending = assignments.filter(a => {
    const st = String(a.status || '').toLowerCase();
    return __overviewConfig.statuses.assignmentDone.indexOf(st) === -1;
  });

  if (!subjects.length && !pending.length) return '';

  /* Categorise by deadline */
  const buckets = { overdue: [], today: [], soon24h: [], week: [], later: [], unknown: [] };
  pending.forEach(a => {
    buckets[_categoriseDeadline(a.due_date)].push(a);
  });

  /* Flatten: overdue → today → soon24h → week → later → unknown */
  const orderedPending = [
    ...buckets.overdue,
    ...buckets.today,
    ...buckets.soon24h,
    ...buckets.week,
    ...buckets.later,
    ...buckets.unknown,
  ].slice(0, __overviewConfig.limits.pendingAssignments);

  return `
    <section class="panel">
      <div class="panel-header-row">
        <h3 class="panel-title">Academic Progress</h3>
        <button class="btn btn-ghost btn-sm" data-action="switch-tab" data-tab="academic">
          View all <i class="fas fa-arrow-right"></i>
        </button>
      </div>
      ${subjects.length ? `
        <div class="card-grid">
          ${subjects.slice(0, __overviewConfig.limits.subjects).map(s => {
            const pct = _clampPct(s.progress);
            return `
              <article class="program-card">
                <span class="chip chip-blue">${_escapeText(s.level || 'Subject')}</span>
                <h4 class="program-title">${_escapeText(s.name || '')}</h4>
                <div class="progress-bar" style="margin-top:8px"><span style="width:${pct}%"></span></div>
                <p class="program-meta">${pct}% mastery</p>
              </article>
            `;
          }).join('')}
        </div>
      ` : ''}
      ${orderedPending.length ? `
        <div style="margin-top:12px">
          <h4 style="margin-bottom:8px">Pending Assignments</h4>
          ${orderedPending.map(a => {
            const ts      = _toTimestamp(a.due_date);
            const overdue = !isNaN(ts) && ts < now;
            const dueStr  = isNaN(ts)
              ? ''
              : ' · ' + (overdue
                  ? `<span style="color:var(--danger)">${_escapeText(_formatDateSafely(a.due_date))} (overdue)</span>`
                  : _escapeText(_formatDateSafely(a.due_date)));
            return `
              <div class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${_escapeText(a.title || '')}</span>
                  <span class="list-row-sub">${_escapeText(a.subject || '')}${dueStr}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    </section>
  `;
}

/* ============================================================
   §16  WALLET & FINANCIAL SUMMARY
   ============================================================ */

function _renderWallet() {
  /* Distinguish "not loaded" from "loaded, zero balance" */
  if (S.wallet === undefined || S.wallet === null) {
    return `
      <section class="panel">
        <div class="panel-header-row">
          <h3 class="panel-title">Wallet &amp; Finance</h3>
          <button class="btn btn-ghost btn-sm" data-action="switch-tab" data-tab="wallet">
            Open <i class="fas fa-arrow-right"></i>
          </button>
        </div>
        <p class="form-hint">Wallet information could not be loaded.</p>
      </section>
    `;
  }

  const balanceOk = _isValidNum(S.wallet.balance);
  const balance   = balanceOk ? _safeNum(S.wallet.balance) : 0;
  const ledger    = _safeArr(S.wallet.ledger);
  const recent    = ledger.slice(0, __overviewConfig.limits.walletRecent);

  if (!recent.length && !balanceOk) return '';

  return `
    <section class="panel">
      <div class="panel-header-row">
        <h3 class="panel-title">Wallet &amp; Finance</h3>
        <button class="btn btn-ghost btn-sm" data-action="switch-tab" data-tab="wallet">
          Open <i class="fas fa-arrow-right"></i>
        </button>
      </div>
      <div class="dashboard-card stat-card" style="margin-bottom:12px">
        <div class="stat-info">
          <p class="stat-label">Available Balance</p>
          <p class="stat-value">${balanceOk ? _formatCurrencySafely(balance) : '—'}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-wallet"></i></div>
      </div>
      ${recent.length ? `
        <h4 style="margin-bottom:8px">Recent Activity</h4>
        <ul class="list-stack">
          ${recent.map(l => {
            const amt   = _safeNum(l.amount);
            const amtOk = _isValidNum(l.amount);
            return `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${_escapeText(l.reason || '')}</span>
                  <span class="list-row-sub">${_escapeText(_formatDateTimeSafely(l.created_at))}</span>
                </div>
                ${amtOk ? `<span class="list-row-price"
                    style="color:${amt >= 0 ? 'var(--accent)' : 'var(--danger)'}">
                  ${amt >= 0 ? '+' : ''}${_formatCurrencySafely(amt)}
                </span>` : ''}
              </li>
            `;
          }).join('')}
        </ul>
      ` : '<p class="form-hint">No recent transactions.</p>'}
    </section>
  `;
}

/* ============================================================
   §17  NOTIFICATIONS & REMINDERS
   ============================================================ */

function _renderNotifications() {
  const items = _collectNotifications();

  if (!items.length) {
    return `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-bell"></i> Notifications &amp; Reminders</h3>
        <p class="form-hint" style="margin-top:8px">You're all caught up. Nothing needs your attention right now.</p>
      </section>
    `;
  }

  return `
    <section class="panel">
      <h3 class="panel-title"><i class="fas fa-bell"></i> Notifications &amp; Reminders</h3>
      <ul class="list-stack" aria-live="polite">
        ${items.slice(0, __overviewConfig.limits.notifications).map(n => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">
                <i class="fas ${n.icon}" style="color:var(--brand)"></i>
                ${_escapeText(n.message)}
              </span>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <span class="chip chip-${n.priority === 'urgent' ? 'red'
                                        : n.priority === 'high'   ? 'yellow'
                                        : 'neutral'}">
                ${_escapeText(n.priority)}
              </span>
              ${n.tab ? `
                <button class="btn btn-secondary btn-xs"
                        data-action="switch-tab" data-tab="${_escapeText(n.tab)}">
                  View
                </button>
              ` : ''}
            </div>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

/* ============================================================
   §18  RECENT ACTIVITY
   ============================================================ */

function _renderActivity() {
  const activity = _safeArr(S.recentActivity);

  if (!activity.length) {
    return `
      <section class="panel">
        <h3 class="panel-title">Recent Activity</h3>
        <p class="form-hint" style="margin-top:8px">No recent activity yet.</p>
      </section>
    `;
  }

  const sorted = _sortByDate(activity, a => a.at || a.created_at, 'desc')
    .slice(0, __overviewConfig.limits.activity);

  return `
    <section class="panel">
      <h3 class="panel-title">Recent Activity</h3>
      <ul class="list-stack">
        ${sorted.map(a => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">
                <i class="fas ${_activityIcon(a.type)}" style="color:var(--brand)"></i>
                ${_escapeText(a.summary || '')}
              </span>
              <span class="list-row-sub">${_escapeText(_humanizeDate(a.at || a.created_at))}</span>
            </div>
            <span class="chip chip-neutral">${_escapeText(a.type || '')}</span>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

/* ============================================================
   §19  LOADING / EMPTY / ERROR STATES
   ============================================================ */

function _renderDataStatusBanner() {
  const loadingState = window.ExpertHubUser?.state?.loadingState;

  if (loadingState === 'partial') {
    return `
      <div class="alert alert-warning" role="status">
        <i class="fas fa-exclamation-triangle"></i>
        <div>
          Some dashboard data could not load.
          <button class="btn btn-secondary btn-xs" data-action="retry-user-extended">
            <i class="fas fa-rotate-right"></i> Retry
          </button>
        </div>
      </div>
    `;
  }
  if (loadingState === 'loading') {
    return `
      <div class="alert alert-info" role="status">
        <i class="fas fa-circle-notch fa-spin"></i> Loading your dashboard…
      </div>
    `;
  }
  if (loadingState === 'failed') {
    return `
      <div class="alert alert-danger" role="alert">
        <i class="fas fa-exclamation-triangle"></i>
        <div>
          Dashboard data could not be loaded.
          <button class="btn btn-secondary btn-xs" data-action="retry-user-extended">
            <i class="fas fa-rotate-right"></i> Retry
          </button>
        </div>
      </div>
    `;
  }
  if (__overviewRefreshState.lastOutcome === 'partial'
      && __overviewRefreshState.failedSections.length) {
    return `
      <div class="alert alert-warning" role="status">
        <i class="fas fa-exclamation-triangle"></i>
        <div>Some sections could not be refreshed. Showing the latest available data.</div>
      </div>
    `;
  }
  return '';
}

/* ============================================================
   §20  MAIN RENDERER
   ============================================================ */

function renderUserOverview() {
  const intent = S.userIntent || currentUser?.intent || 'both';
  const mine   = _safeArr(S.consultations).filter(_isCurrentUserRecord);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Dashboard</span></div>
    ${_renderWelcome(intent)}
    ${_renderDataStatusBanner()}
    ${_renderOverviewInsights()}
    ${_renderStats(intent, mine)}
    ${_renderNotifications()}
    ${_renderContinueLearning(intent)}
    ${_renderUpcomingSessions(mine)}
    ${_renderTiles(intent)}
    ${_renderRecommended()}
    ${_renderGoalsAndTasks()}
    ${_renderAcademic()}
    ${_renderWallet()}
    ${_renderActivity()}
  `;
}

/* ============================================================
   §21  ACTION REGISTRATION
   ============================================================ */

window.ExpertHubUser.registerAction('refresh-overview', async () => {
  if (__overviewRefreshState.inProgress) return;

  const result = await _refreshOverviewData({ manual: true });
  if (typeof rerenderRoleContent === 'function') rerenderRoleContent();

  if (result.outcome === 'success') {
    showToast('Dashboard refreshed', 'success');
  } else if (result.outcome === 'partial') {
    showToast('Dashboard partially refreshed — some sections may be stale', 'warning');
  } else if (result.outcome === 'failed') {
    showToast('Could not refresh dashboard', 'error');
  }
  /* 'stale' and 'loading' remain silent — another refresh is in flight */
});

window.ExpertHubUser.registerAction('retry-user-extended', async () => {
  await loadUserExtendedData({ force: true });
  if (typeof rerenderRoleContent === 'function') rerenderRoleContent();

  const st = window.ExpertHubUser?.state;
  if (st?.loadingState === 'ok') showToast('Data loaded', 'success');
  else showToast(st?.lastError || 'Some data is still incomplete', 'warning');
});

window.ExpertHubUser.registerAction('change-intent', async () => {
  UserUI.formModal({
    title: 'Choose your mode',
    fields: [{
      name: 'intent', label: 'Mode', type: 'select',
      value: S.userIntent || 'both',
      options: [
        { value: 'both',    label: 'Both — Learning and Consulting' },
        { value: 'learn',   label: 'Learning only' },
        { value: 'consult', label: 'Consulting only' },
      ],
      hint: 'This controls what appears on your dashboard. You can change it anytime.',
      required: true,
    }],
    submitLabel: 'Save',
    onSubmit: async (v) => {
      if (__overviewConfig.validIntents.indexOf(v.intent) === -1) {
        showToast('Invalid mode selected', 'error');
        return;
      }

      try {
        const d = await apiCall('/api/user/preferences', 'PUT', { intent: v.intent });

        /* Require explicit backend confirmation before mutating local state */
        const confirmed = (d && __overviewConfig.validIntents.indexOf(d.intent) !== -1)
          ? d.intent
          : null;

        if (!confirmed) {
          showToast('Server did not confirm the new mode. Please try again.', 'error');
          return;
        }

        S.userIntent = confirmed;
        if (currentUser) currentUser.intent = confirmed;
        try { localStorage.setItem('user', JSON.stringify(currentUser)); } catch {}

        if (typeof window.ExpertHubUser !== 'undefined'
            && typeof window.ExpertHubUser.syncStateFromS === 'function') {
          window.ExpertHubUser.syncStateFromS();
        }

        closeModal();
        if (typeof rerenderRoleContent === 'function') rerenderRoleContent();
        showToast('Mode updated', 'success');
      } catch (e) {
        showToast(e?.message || 'Could not save preference', 'error');
      }
    },
  });
});

/* ============================================================
   §22  MODULE REGISTRATION
   ============================================================ */

window.ExpertHubUser.registerModule('overview',  renderUserOverview);
window.ExpertHubUser.registerModule('dashboard', renderUserOverview);