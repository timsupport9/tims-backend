/* ============================================================
   ExpertHub 2.0 — Institution State Extensions
   Adds loading/error states, pagination, filters, drafts, etc.
   Must load AFTER config.js.
   ============================================================ */
Object.assign(S, {

  /* ── Analytics cache ─────────────────────────────────────── */
  institutionAnalytics: {
    overview: {},
    cohortPerformance: [],
    instructorPerformance: [],
    campusPerformance: [],
    departmentPerformance: [],
    retentionCurve: [],
    completionFunnel: { applied: 0, enrolled: 0, active: 0, completed: 0, certified: 0 },
    trends: { enrollment: [], completion: [], revenue: [], progress: [], attendance: [] },
    programmeMix: [],
    riskIndicators: [],
  },

  /* ── Multi-campus ────────────────────────────────────────── */
  campuses: [],
  activeCampusId: null,
  activeCampusContext: null,

  /* ── Assessment / proctoring ─────────────────────────────── */
  examProctorSessions: [],
  examProctorFlags: [],

  /* ── Wellness ────────────────────────────────────────────── */
  wellnessScores: [],
  wellnessAlerts: [],
  wellnessInterventions: [],

  /* ── Skills ──────────────────────────────────────────────── */
  skillsGapAnalysis: {
    categories: [],
    topGaps: [],
    departmentGaps: [],
    summary: {},
  },

  /* ── Succession ──────────────────────────────────────────── */
  successionMatrix: {
    boxes: CONFIG.SUCCESSION_BOXES,
    trainees: [],
    assignments: [],
  },

  /* ── Marketplace / instructors ───────────────────────────── */
  instructorMarketplace: [],
  instructorContracts: [],

  /* ── Finance ─────────────────────────────────────────────── */
  budgetAllocations: [],
  budgetTransactions: [],

  /* ── Certificates / blockchain ───────────────────────────── */
  blockchainCerts: [],

  /* ── Reports ─────────────────────────────────────────────── */
  savedReportDefinitions: [],

  /* ── Communications / integrations / security ────────────── */
  announcements: [],
  apiKeys: [],
  webhooks: [],
  ssoConfiguration: {},
  complianceRuns: [],

  /* ── Global loading / error ──────────────────────────────── */
  loading: {},                 // { [key]: boolean }
  errors: {},                  // { [key]: string|null }

  apiStatus: {
    healthy: true,
    lastSync: null,
    pendingRequests: 0,
    consecutiveFailures: 0,
  },

  /* ── Pagination ──────────────────────────────────────────── */
  page: {},                    // { [viewKey]: currentPage }
  pageSize: {},                // { [viewKey]: perPage }

  /* ── Filter persistence ──────────────────────────────────── */
  filters: {},                 // { [viewKey]: { ...filterValues } }
  savedFilters: {},            // user-named filter presets

  /* ── Selected institution context ────────────────────────── */
  activeInstitutionId: null,

  /* ── Notifications ───────────────────────────────────────── */
  notifications: [],
  unreadNotifications: 0,

  /* ── Draft forms (recovered on navigation) ───────────────── */
  drafts: {},                  // { [formKey]: { ...values, savedAt: ISO } }

  /* ── Global search ───────────────────────────────────────── */
  globalSearch: {
    query: '',
    results: [],
    active: false,
    loading: false,
  },
});

/* Seed sensible pagination defaults for the main list views.
   Uses CONFIG.PAGE_SIZE_DEFAULT for all keys the first time. */
(function seedPagination() {
  const defaults = [
    'institutionTrainees','institutionProgrammes','institutionCohorts',
    'institutionAssessments','institutionCertificates','institutionInstructors',
    'institutionBudgets','institutionAnnouncements','institutionReports',
  ];
  defaults.forEach(k => {
    if (S.page[k] == null)      S.page[k]     = 1;
    if (S.pageSize[k] == null)  S.pageSize[k] = CONFIG.PAGE_SIZE_DEFAULT;
  });
})();
