/* ============================================================
   ExpertHub 2.0 — Institution Config Extensions
   Extends global CONFIG with institution constants + policy metadata.
   Must load AFTER 01-state.js (where CONFIG exists).
   ============================================================ */
Object.assign(CONFIG, {

  /* ── Institutional taxonomy ─────────────────────────────── */
  INSTITUTION_TYPES: [
    'school', 'college', 'university', 'training_center',
    'corporate_academy', 'vocational', 'government_agency',
  ],

  INSTITUTION_ROLES: [
    'owner', 'operations_manager', 'programme_manager',
    'instructor', 'finance_officer', 'compliance_officer',
    'support', 'viewer',
  ],

  /* ── Programme & lifecycle vocabularies ─────────────────── */
  PROGRAMME_CATEGORIES: [
    'bootcamp', 'short_course', 'certification', 'compliance',
    'apprenticeship', 'workshop', 'degree', 'diploma', 'microcredential',
  ],

  PROGRAMME_STATUSES: [
    'draft', 'pending_approval', 'active', 'archived', 'completed',
  ],

  COHORT_STATUSES: [
    'draft', 'scheduled', 'active', 'completed', 'archived', 'cancelled',
  ],

  SESSION_STATUSES: [
    'scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled',
  ],

  SESSION_MODES: [
    'in_person', 'online_live', 'online_self_paced', 'hybrid', 'blended',
  ],

  LIFECYCLE_STATUSES: [
    'applicant', 'pending_approval', 'enrolled', 'active', 'on_hold',
    'completed', 'certified', 'withdrawn', 'alumni',
  ],

  ASSESSMENT_TYPES: [
    'quiz', 'exam', 'assignment', 'project', 'practical', 'presentation', 'portfolio',
  ],

  /* ── Succession 9-box grid ──────────────────────────────── */
  SUCCESSION_BOXES: [
    { code: 'star',         performance: 'high',   potential: 'high',   label: 'Star' },
    { code: 'high_pot',     performance: 'medium', potential: 'high',   label: 'High Potential' },
    { code: 'current_star', performance: 'high',   potential: 'medium', label: 'Current Star' },
    { code: 'core',         performance: 'medium', potential: 'medium', label: 'Core Player' },
    { code: 'enigma',       performance: 'low',    potential: 'high',   label: 'Enigma' },
    { code: 'workhorse',    performance: 'high',   potential: 'low',    label: 'Workhorse' },
    { code: 'dilemma',      performance: 'low',    potential: 'medium', label: 'Dilemma' },
    { code: 'risk',         performance: 'low',    potential: 'low',    label: 'Risk' },
    { code: 'average',      performance: 'medium', potential: 'low',    label: 'Average' },
  ],

  /* ── Skills matrix ──────────────────────────────────────── */
  SKILL_LEVELS: ['None', 'Basic', 'Intermediate', 'Advanced', 'Expert', 'Master'],
  SKILL_LEVEL_COLOURS: ['#e5e7eb', '#fef3c7', '#fde68a', '#86efac', '#34d399', '#059669'],

  /* ── Report builder field library ───────────────────────── */
  REPORT_FIELD_LIBRARY: {
    trainees:     ['name','email','department','job_title','employee_id','cost_centre','lifecycle_status','progress','at_risk'],
    programmes:   ['title','category','status','start_date','end_date','capacity','enrolled_count','cost_per_seat'],
    cohorts:      ['name','programme_title','instructor_name','start_date','end_date','capacity','trainee_count','status'],
    assessments:  ['title','type','cohort_name','weight','pass_mark','due_date','status'],
    certificates: ['serial','trainee_name','programme_title','issued_at','expires_at','cpd_points','revoked'],
    budgets:      ['department','period','allocated','spent','remaining','utilisation'],
  },

  /* ── SSO / API / webhooks ───────────────────────────────── */
  SSO_PROVIDERS: [
    'okta', 'azure_ad', 'google_workspace', 'onelogin',
    'jumpcloud', 'custom_saml', 'custom_oidc',
  ],

  RISK_LEVELS: ['low', 'medium', 'high', 'critical'],
  BUDGET_PERIODS: ['monthly', 'quarterly', 'annual'],

  ANNOUNCEMENT_SCOPES: ['all', 'cohort', 'programme', 'department', 'instructors', 'operations'],
  ANNOUNCEMENT_PRIORITIES: ['normal', 'important', 'urgent', 'critical'],

  API_SCOPES: [
    'read:trainees','write:trainees','read:programmes','write:programmes',
    'read:certs','write:certs','read:reports','manage:webhooks',
  ],

  WEBHOOK_EVENTS: [
    'enrollment.created','enrollment.completed','certificate.issued',
    'certificate.revoked','session.scheduled','assessment.graded',
    'budget.threshold','wellness.alert',
  ],

  /* ── Grading policies ───────────────────────────────────── */
  GRADING_POLICIES: {
    percentage: {
      label: 'Percentage (0-100)',
      bands: [
        { code: 'distinction', min: 85, label: 'Distinction' },
        { code: 'merit',       min: 75, label: 'Merit' },
        { code: 'pass',        min: 65, label: 'Pass' },
        { code: 'refer',       min: 0,  label: 'Refer' },
      ],
    },
    letter_us: {
      label: 'Letter grade (US)',
      bands: [
        { code: 'A', min: 90 }, { code: 'B', min: 80 }, { code: 'C', min: 70 },
        { code: 'D', min: 60 }, { code: 'F', min: 0 },
      ],
    },
    letter_uk: {
      label: 'Letter grade (UK)',
      bands: [
        { code: 'A*', min: 90 }, { code: 'A', min: 80 }, { code: 'B', min: 70 },
        { code: 'C', min: 60 }, { code: 'D', min: 50 }, { code: 'E', min: 40 },
        { code: 'U', min: 0 },
      ],
    },
    pass_fail: {
      label: 'Pass / Fail',
      bands: [{ code: 'Pass', min: 70 }, { code: 'Fail', min: 0 }],
    },
  },

  /* ── Academic calendars ─────────────────────────────────── */
  ACADEMIC_CALENDAR_TYPES: ['semester', 'trimester', 'quarter', 'rolling'],

  DEFAULT_ACADEMIC_CALENDAR: {
    type: 'semester',
    terms: [
      { name: 'Semester 1', start_month: 1, start_day: 15, end_month: 5, end_day: 30 },
      { name: 'Semester 2', start_month: 8, start_day: 15, end_month: 12, end_day: 15 },
    ],
  },

  /* ── Approval workflows ─────────────────────────────────── */
  APPROVAL_WORKFLOWS: {
    programme_publish:      { steps: ['programme_manager','operations_manager'], sla_hours: 48 },
    budget_over_threshold:  { steps: ['finance_officer','operations_manager'],   threshold: 10000, sla_hours: 72 },
    certificate_issue:      { steps: ['programme_manager'],                      sla_hours: 24 },
    certificate_revoke:     { steps: ['programme_manager','operations_manager'], sla_hours: 24 },
    instructor_hire:        { steps: ['programme_manager','operations_manager'], sla_hours: 72 },
    trainee_enrolment:      { steps: ['programme_manager'],                      sla_hours: 24 },
    team_invite:            { steps: ['operations_manager'],                     sla_hours: 24 },
    campus_create:          { steps: ['operations_manager'],                     sla_hours: 48 },
  },

  /* ── Certificate templates ──────────────────────────────── */
  CERTIFICATE_TEMPLATES: [
    { code: 'standard',       label: 'Standard Certificate',     fields: ['trainee','programme','date','serial'] },
    { code: 'cpd',            label: 'CPD Certificate',          fields: ['trainee','programme','date','cpd_points','serial'] },
    { code: 'microcredential',label: 'Microcredential Badge',    fields: ['trainee','programme','date','skills','serial'] },
    { code: 'blockchain',     label: 'Blockchain-Anchored',      fields: ['trainee','programme','date','hash','serial'] },
  ],

  /* ── Retention policies (enforced backend-side) ─────────── */
  RETENTION_POLICIES: {
    exam_recordings_days: 90,
    wellness_records_days: 365,
    audit_logs_days: 2555,      // ~7 years
    inactive_trainee_data_days: 1095,
    document_versions_keep: 10,
  },

  /* ── Feature flags (per-institution overrides stored on institution row) ── */
  FEATURE_FLAGS: {
    blockchain_certificates: false,
    ai_flagging: true,
    wellness_module: true,
    marketplace: true,
    sso: true,
    api_access: true,
    report_builder: true,
    bulk_import: true,
    multi_campus: true,
    succession_planning: true,
    automation: false,
    ai_insights: false,
  },

  /* ── Role-based permissions ─────────────────────────────── */
  ROLE_PERMISSIONS: {
    owner:                ['*'],
    operations_manager:   ['programmes:*','cohorts:*','trainees:*','instructors:*','budgets:*','campuses:*','reports:*','operations:*','team:*','announcements:*','security:*','integrations:*'],
    programme_manager:    ['programmes:read','programmes:write','cohorts:*','trainees:read','trainees:write','assessments:*','training:*','reports:read'],
    instructor:           ['programmes:read','cohorts:read','training:*','assessments:write','trainees:read'],
    finance_officer:      ['budgets:*','reports:read','marketplace:read'],
    compliance_officer:   ['compliance:*','certifications:read','audit:read','reports:read'],
    support:              ['trainees:read','support:*','announcements:read'],
    viewer:               ['*:read'],
  },

  /* ── Pagination defaults ────────────────────────────────── */
  PAGE_SIZE_DEFAULT: 25,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],

  /* ── Notification categories ────────────────────────────── */
  NOTIFICATION_CATEGORIES: ['enrolment','assessment','certificate','budget','wellness','compliance','approval','system'],
});
