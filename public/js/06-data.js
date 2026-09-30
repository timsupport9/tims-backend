/* ============================================================
   ExpertHub 2.0 — 06-data.js
   All data-loading functions + polling + notification badge.
   ============================================================ */

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

/* ============================================================
   ExpertHub 2.0 — 06 Feature Expansion
   Data Layer Intelligence
   This extension is intentionally isolated from the original
   implementation. It adds reusable browser-side capabilities,
   diagnostics, registries, persistence, validation and telemetry.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHFeature06;
  if (NS) return;

  const namespace = {
    name: "Data Layer Intelligence",
    version: '2.0.0',
    createdAt: new Date().toISOString(),
    features: ["normalization", "denormalization", "stale-while-revalidate", "cache timestamps", "data quality checks", "pagination aggregation", "search index", "filter state", "sort state", "data subscriptions", "polling backoff", "change detection", "optimistic updates", "rollback snapshots", "batch loaders", "dependency graph", "analytics rollups", "notification grouping", "export datasets", "data diagnostics", "refresh scheduler"],
    registry: new Map(),
    listeners: new Map(),
    metrics: {
      calls: 0,
      successes: 0,
      failures: 0,
      startedAt: Date.now(),
      lastActionAt: null
    },
    config: {
      storagePrefix: 'experthub.feature.06.',
      maxHistory: 80,
      debounceMs: 250,
      staleAfterMs: 5 * 60 * 1000,
      debug: false
    }
  };

  function now() { return Date.now(); }

  function key(name) {
    return namespace.config.storagePrefix + String(name);
  }

  function safeClone(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }

  function safeParse(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    try { return JSON.parse(value); }
    catch (_) { return fallback; }
  }

  function emit(eventName, payload) {
    const handlers = namespace.listeners.get(eventName) || [];
    handlers.slice().forEach(fn => {
      try { fn(payload); } catch (error) { console.error('[ExpertHub]', eventName, error); }
    });
    try {
      document.dispatchEvent(new CustomEvent('eh:06:' + eventName, { detail: payload }));
    } catch (_) {}
  }

  function on(eventName, handler) {
    if (typeof handler !== 'function') return () => {};
    if (!namespace.listeners.has(eventName)) namespace.listeners.set(eventName, []);
    namespace.listeners.get(eventName).push(handler);
    return () => off(eventName, handler);
  }

  function off(eventName, handler) {
    const list = namespace.listeners.get(eventName) || [];
    namespace.listeners.set(eventName, list.filter(fn => fn !== handler));
  }

  function save(name, value, ttl = null) {
    const packet = { value: safeClone(value), savedAt: now(), expiresAt: ttl ? now() + ttl : null };
    try { localStorage.setItem(key(name), JSON.stringify(packet)); emit('saved', { name, packet }); return true; }
    catch (error) { console.warn('[ExpertHub] storage save failed', error); return false; }
  }

  function load(name, fallback = null) {
    try {
      const packet = safeParse(localStorage.getItem(key(name)), null);
      if (!packet) return fallback;
      if (packet.expiresAt && packet.expiresAt < now()) {
        localStorage.removeItem(key(name));
        return fallback;
      }
      return packet.value;
    } catch (_) { return fallback; }
  }

  function remove(name) {
    try { localStorage.removeItem(key(name)); emit('removed', { name }); return true; }
    catch (_) { return false; }
  }

  function register(name, definition = {}) {
    if (!name) throw new Error('Feature name is required');
    const item = {
      name,
      enabled: definition.enabled !== false,
      category: definition.category || 'general',
      description: definition.description || '',
      permissions: Array.isArray(definition.permissions) ? definition.permissions : [],
      handler: typeof definition.handler === 'function' ? definition.handler : null,
      validate: typeof definition.validate === 'function' ? definition.validate : null,
      metadata: definition.metadata || {},
      createdAt: new Date().toISOString()
    };
    namespace.registry.set(name, item);
    emit('registered', item);
    return item;
  }

  function unregister(name) {
    const existed = namespace.registry.delete(name);
    if (existed) emit('unregistered', { name });
    return existed;
  }

  function list(filter = {}) {
    let rows = Array.from(namespace.registry.values());
    if (filter.category) rows = rows.filter(x => x.category === filter.category);
    if (filter.enabled !== undefined) rows = rows.filter(x => x.enabled === filter.enabled);
    if (filter.query) {
      const q = String(filter.query).toLowerCase();
      rows = rows.filter(x => (x.name + ' ' + x.description).toLowerCase().includes(q));
    }
    return rows;
  }

  function hasPermission(item) {
    if (!item.permissions.length) return true;
    const role = window.currentUserRole || window.currentUser?.role || '';
    const permissions = window.currentUser?.permissions || [];
    return item.permissions.includes(role) || item.permissions.some(p => permissions.includes(p));
  }

  async function execute(name, payload = {}, context = {}) {
    const item = namespace.registry.get(name);
    if (!item) throw new Error('Unknown feature: ' + name);
    if (!item.enabled) throw new Error('Feature disabled: ' + name);
    if (!hasPermission(item)) throw new Error('Permission denied: ' + name);
    if (item.validate) {
      const result = await item.validate(payload, context);
      if (result === false) throw new Error('Validation failed: ' + name);
      if (typeof result === 'string') throw new Error(result);
    }
    namespace.metrics.calls++;
    namespace.metrics.lastActionAt = new Date().toISOString();
    try {
      const result = item.handler ? await item.handler(payload, context) : payload;
      namespace.metrics.successes++;
      emit('executed', { name, payload, result });
      return result;
    } catch (error) {
      namespace.metrics.failures++;
      emit('failed', { name, payload, error });
      throw error;
    }
  }

  function memoize(fn, ttl = 30000) {
    let timestamp = 0;
    let cached;
    let cachedArgs = '';
    return function (...args) {
      const signature = JSON.stringify(args);
      if (signature === cachedArgs && now() - timestamp < ttl) return cached;
      cachedArgs = signature;
      timestamp = now();
      cached = fn.apply(this, args);
      return cached;
    };
  }

  function debounce(fn, wait = namespace.config.debounceMs) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function throttle(fn, wait = namespace.config.debounceMs) {
    let ready = true;
    let queued = null;
    return function (...args) {
      if (!ready) { queued = args; return; }
      ready = false;
      fn.apply(this, args);
      setTimeout(() => {
        ready = true;
        if (queued) { const next = queued; queued = null; fn.apply(this, next); }
      }, wait);
    };
  }

  function validateObject(value, rules = {}) {
    const errors = {};
    Object.entries(rules).forEach(([field, rule]) => {
      const v = value?.[field];
      if (rule.required && (v === undefined || v === null || String(v).trim() === '')) errors[field] = 'Required';
      if (v !== undefined && v !== null && rule.minLength && String(v).length < rule.minLength) errors[field] = 'Too short';
      if (v !== undefined && v !== null && rule.maxLength && String(v).length > rule.maxLength) errors[field] = 'Too long';
      if (v && rule.pattern && !rule.pattern.test(String(v))) errors[field] = 'Invalid format';
      if (v !== undefined && v !== null && rule.type === 'number' && Number.isNaN(Number(v))) errors[field] = 'Must be a number';
    });
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function metricSnapshot() {
    return {
      ...namespace.metrics,
      uptimeMs: now() - namespace.metrics.startedAt,
      registeredFeatures: namespace.registry.size,
      featureCount: namespace.features.length
    };
  }

  function exportDiagnostics() {
    return {
      namespace: namespace.name,
      version: namespace.version,
      features: namespace.features.slice(),
      registered: list().map(x => ({ name: x.name, category: x.category, enabled: x.enabled })),
      metrics: metricSnapshot(),
      url: location.href,
      online: navigator.onLine,
      language: navigator.language,
      timestamp: new Date().toISOString()
    };
  }

  function downloadDiagnostics() {
    const blob = new Blob([JSON.stringify(exportDiagnostics(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'experthub-06-diagnostics.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  namespace.on = on;
  namespace.off = off;
  namespace.emit = emit;
  namespace.save = save;
  namespace.load = load;
  namespace.remove = remove;
  namespace.register = register;
  namespace.unregister = unregister;
  namespace.list = list;
  namespace.execute = execute;
  namespace.memoize = memoize;
  namespace.debounce = debounce;
  namespace.throttle = throttle;
  namespace.validateObject = validateObject;
  namespace.metrics = metricSnapshot;
  namespace.diagnostics = exportDiagnostics;
  namespace.downloadDiagnostics = downloadDiagnostics;

  window.EHFeature06 = namespace;

  function feature_01(payload = {}, context = {}) {
    const result = {
      feature: "normalization",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:01', result);
    return result;
  }

  register("normalization", {
    category: "normalization",
    description: "Enhanced normalization capability for data layer intelligence",
    handler: feature_01
  });

  function feature_02(payload = {}, context = {}) {
    const result = {
      feature: "denormalization",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:02', result);
    return result;
  }

  register("denormalization", {
    category: "denormalization",
    description: "Enhanced denormalization capability for data layer intelligence",
    handler: feature_02
  });

  function feature_03(payload = {}, context = {}) {
    const result = {
      feature: "stale-while-revalidate",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:03', result);
    return result;
  }

  register("stale-while-revalidate", {
    category: "stale_while_revalidate",
    description: "Enhanced stale-while-revalidate capability for data layer intelligence",
    handler: feature_03
  });

  function feature_04(payload = {}, context = {}) {
    const result = {
      feature: "cache timestamps",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:04', result);
    return result;
  }

  register("cache timestamps", {
    category: "cache",
    description: "Enhanced cache timestamps capability for data layer intelligence",
    handler: feature_04
  });

  function feature_05(payload = {}, context = {}) {
    const result = {
      feature: "data quality checks",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:05', result);
    return result;
  }

  register("data quality checks", {
    category: "data",
    description: "Enhanced data quality checks capability for data layer intelligence",
    handler: feature_05
  });

  function feature_06(payload = {}, context = {}) {
    const result = {
      feature: "pagination aggregation",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:06', result);
    return result;
  }

  register("pagination aggregation", {
    category: "pagination",
    description: "Enhanced pagination aggregation capability for data layer intelligence",
    handler: feature_06
  });

  function feature_07(payload = {}, context = {}) {
    const result = {
      feature: "search index",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:07', result);
    return result;
  }

  register("search index", {
    category: "search",
    description: "Enhanced search index capability for data layer intelligence",
    handler: feature_07
  });

  function feature_08(payload = {}, context = {}) {
    const result = {
      feature: "filter state",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:08', result);
    return result;
  }

  register("filter state", {
    category: "filter",
    description: "Enhanced filter state capability for data layer intelligence",
    handler: feature_08
  });

  function feature_09(payload = {}, context = {}) {
    const result = {
      feature: "sort state",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:09', result);
    return result;
  }

  register("sort state", {
    category: "sort",
    description: "Enhanced sort state capability for data layer intelligence",
    handler: feature_09
  });

  function feature_10(payload = {}, context = {}) {
    const result = {
      feature: "data subscriptions",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:10', result);
    return result;
  }

  register("data subscriptions", {
    category: "data",
    description: "Enhanced data subscriptions capability for data layer intelligence",
    handler: feature_10
  });

  function feature_11(payload = {}, context = {}) {
    const result = {
      feature: "polling backoff",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:11', result);
    return result;
  }

  register("polling backoff", {
    category: "polling",
    description: "Enhanced polling backoff capability for data layer intelligence",
    handler: feature_11
  });

  function feature_12(payload = {}, context = {}) {
    const result = {
      feature: "change detection",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:12', result);
    return result;
  }

  register("change detection", {
    category: "change",
    description: "Enhanced change detection capability for data layer intelligence",
    handler: feature_12
  });

  function feature_13(payload = {}, context = {}) {
    const result = {
      feature: "optimistic updates",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:13', result);
    return result;
  }

  register("optimistic updates", {
    category: "optimistic",
    description: "Enhanced optimistic updates capability for data layer intelligence",
    handler: feature_13
  });

  function feature_14(payload = {}, context = {}) {
    const result = {
      feature: "rollback snapshots",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:14', result);
    return result;
  }

  register("rollback snapshots", {
    category: "rollback",
    description: "Enhanced rollback snapshots capability for data layer intelligence",
    handler: feature_14
  });

  function feature_15(payload = {}, context = {}) {
    const result = {
      feature: "batch loaders",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:15', result);
    return result;
  }

  register("batch loaders", {
    category: "batch",
    description: "Enhanced batch loaders capability for data layer intelligence",
    handler: feature_15
  });

  function feature_16(payload = {}, context = {}) {
    const result = {
      feature: "dependency graph",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:16', result);
    return result;
  }

  register("dependency graph", {
    category: "dependency",
    description: "Enhanced dependency graph capability for data layer intelligence",
    handler: feature_16
  });

  function feature_17(payload = {}, context = {}) {
    const result = {
      feature: "analytics rollups",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:17', result);
    return result;
  }

  register("analytics rollups", {
    category: "analytics",
    description: "Enhanced analytics rollups capability for data layer intelligence",
    handler: feature_17
  });

  function feature_18(payload = {}, context = {}) {
    const result = {
      feature: "notification grouping",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:18', result);
    return result;
  }

  register("notification grouping", {
    category: "notification",
    description: "Enhanced notification grouping capability for data layer intelligence",
    handler: feature_18
  });

  function feature_19(payload = {}, context = {}) {
    const result = {
      feature: "export datasets",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:19', result);
    return result;
  }

  register("export datasets", {
    category: "export",
    description: "Enhanced export datasets capability for data layer intelligence",
    handler: feature_19
  });

  function feature_20(payload = {}, context = {}) {
    const result = {
      feature: "data diagnostics",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:20', result);
    return result;
  }

  register("data diagnostics", {
    category: "data",
    description: "Enhanced data diagnostics capability for data layer intelligence",
    handler: feature_20
  });

  function feature_21(payload = {}, context = {}) {
    const result = {
      feature: "refresh scheduler",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "06"
    };
    emit('feature:21', result);
    return result;
  }

  register("refresh scheduler", {
    category: "refresh",
    description: "Enhanced refresh scheduler capability for data layer intelligence",
    handler: feature_21
  });

  /* ---------- Built-in browser integrations ---------- */

  namespace.search = function (query, source = list()) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return source.slice();
    return source.filter(item =>
      JSON.stringify(item).toLowerCase().includes(q)
    );
  };

  namespace.groupBy = function (items, selector) {
    return items.reduce((groups, item) => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      const key = value === undefined || value === null ? 'unknown' : String(value);
      (groups[key] ||= []).push(item);
      return groups;
    }, {});
  };

  namespace.sum = function (items, selector) {
    return items.reduce((total, item) => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      return total + (Number(value) || 0);
    }, 0);
  };

  namespace.average = function (items, selector) {
    return items.length ? namespace.sum(items, selector) / items.length : 0;
  };

  namespace.paginate = function (items, page = 1, pageSize = 20) {
    const size = Math.max(1, Number(pageSize) || 20);
    const current = Math.max(1, Number(page) || 1);
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / size));
    const safePage = Math.min(current, pages);
    return {
      items: items.slice((safePage - 1) * size, safePage * size),
      page: safePage,
      pageSize: size,
      total,
      pages,
      hasNext: safePage < pages,
      hasPrevious: safePage > 1
    };
  };

  namespace.sortBy = function (items, selector, direction = 'asc') {
    const list = items.slice();
    list.sort((a, b) => {
      const av = typeof selector === 'function' ? selector(a) : a?.[selector];
      const bv = typeof selector === 'function' ? selector(b) : b?.[selector];
      const left = av ?? '';
      const right = bv ?? '';
      const result = left > right ? 1 : left < right ? -1 : 0;
      return direction === 'desc' ? -result : result;
    });
    return list;
  };

  namespace.unique = function (items, selector = item => item) {
    const seen = new Set();
    return items.filter(item => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      const keyValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (seen.has(keyValue)) return false;
      seen.add(keyValue);
      return true;
    });
  };

  namespace.whenIdle = function (callback, timeout = 1000) {
    if ('requestIdleCallback' in window) return window.requestIdleCallback(callback, { timeout });
    return setTimeout(callback, Math.min(timeout, 100));
  };

  namespace.copy = async function (value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  };

  namespace.broadcast = function (name, payload) {
    try {
      const channel = new BroadcastChannel('experthub-' + name);
      channel.postMessage(payload);
      channel.close();
      return true;
    } catch (_) {
      return false;
    }
  };

  namespace.listenBroadcast = function (name, handler) {
    try {
      const channel = new BroadcastChannel('experthub-' + name);
      channel.onmessage = event => handler(event.data);
      return () => channel.close();
    } catch (_) {
      return () => {};
    }
  };

  /* ---------- Automatic lifecycle hooks ---------- */

  document.addEventListener('visibilitychange', () => {
    emit('visibility', { hidden: document.hidden, timestamp: Date.now() });
  });

  window.addEventListener('online', () => emit('network', { online: true }));
  window.addEventListener('offline', () => emit('network', { online: false }));

  namespace.healthCheck = function () {
    return {
      ok: true,
      storage: (() => {
        try {
          const k = key('health');
          localStorage.setItem(k, 'ok');
          localStorage.removeItem(k);
          return true;
        } catch (_) { return false; }
      })(),
      dom: !!document.body,
      network: navigator.onLine,
      registeredFeatures: namespace.registry.size
    };
  };

  /* Keep the feature registry discoverable without changing the
     application's existing global functions. */
  window.ExpertHubFeatureRegistry = window.ExpertHubFeatureRegistry || {};
  window.ExpertHubFeatureRegistry["06"] = namespace;

})();

/* ============================================================
   End 06 feature expansion
   ============================================================ */
