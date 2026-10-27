/* ============================================================
   ExpertHub 2.0 — Institution Config Extensions
   Extend CONFIG with institution-specific constants.
   ============================================================ */
Object.assign(CONFIG, {
  SUCCESSION_BOXES: [
    { code: 'star',           performance: 'high',   potential: 'high',   label: 'Star' },
    { code: 'high_pot',       performance: 'medium', potential: 'high',   label: 'High Potential' },
    { code: 'current_star',   performance: 'high',   potential: 'medium', label: 'Current Star' },
    { code: 'core',           performance: 'medium', potential: 'medium', label: 'Core Player' },
    { code: 'enigma',         performance: 'low',    potential: 'high',   label: 'Enigma' },
    { code: 'workhorse',      performance: 'high',   potential: 'low',    label: 'Workhorse' },
    { code: 'dilemma',        performance: 'low',    potential: 'medium', label: 'Dilemma' },
    { code: 'risk',           performance: 'low',    potential: 'low',    label: 'Risk' },
    { code: 'average',        performance: 'medium', potential: 'low',    label: 'Average' },
  ],
  REPORT_FIELD_LIBRARY: {
    trainees:    ['name','email','department','job_title','employee_id','cost_centre','lifecycle_status','progress','at_risk'],
    programmes:  ['title','category','status','start_date','end_date','capacity','enrolled_count','cost_per_seat'],
    cohorts:     ['name','programme_title','instructor_name','start_date','end_date','capacity','trainee_count','status'],
    assessments: ['title','type','cohort_name','weight','pass_mark','due_date','status'],
    certificates:['serial','trainee_name','programme_title','issued_at','expires_at','cpd_points','revoked'],
    budgets:     ['department','period','allocated','spent','remaining','utilisation'],
  },
  SSO_PROVIDERS: ['okta','azure_ad','google_workspace','onelogin','jumpcloud','custom_saml','custom_oidc'],
  RISK_LEVELS: ['low','medium','high','critical'],
  BUDGET_PERIODS: ['monthly','quarterly','annual'],
  ANNOUNCEMENT_SCOPES: ['all','cohort','programme','department','instructors','operations'],
  ANNOUNCEMENT_PRIORITIES: ['normal','important','urgent','critical'],
  API_SCOPES: ['read:trainees','write:trainees','read:programmes','write:programmes',
               'read:certs','write:certs','read:reports','manage:webhooks'],
  WEBHOOK_EVENTS: ['enrollment.created','enrollment.completed','certificate.issued',
                   'certificate.revoked','session.scheduled','assessment.graded',
                   'budget.threshold','wellness.alert'],
});
