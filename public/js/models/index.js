/* ============================================================
   ExpertHub 2.0 — Modal Module Index
   Central registry, dependency validation, and initialization
   for the ExpertHub Modal Framework.

   Load order (classic <script>):
     1. shared-modal-helpers.js
     2. admin-modals.js / learner-modals.js / expert-modals.js / …
     3. index.js  ← this file

   Sections
   --------
    1.  Version & framework config (feature flags, debug)
    2.  Module manifest
    3.  Function map (per module)
    4.  Registry (register / lookup / list)
    5.  Dependency validation
    6.  Module validation
    7.  Action dispatcher ([data-action] delegation)
    8.  Initialization lifecycle
    9.  Diagnostics & debug helpers
    10. Backward-compatible exports
   ============================================================ */

/* ------------------------------------------------------------------
 * 1. Version & framework config
 * ----------------------------------------------------------------
   The feature flags / config here are the "master" defaults. If
   shared-modal-helpers.js already defined ModalFramework, we merge
   into it rather than replacing it (so shared settings win).
 * ---------------------------------------------------------------- */

window.ExpertHubModalVersion = '2.0.0';

const _ModalFrameworkDefaults = {
  version: window.ExpertHubModalVersion,
  debug: false,
  flags: {
    confirmDestructive:  true,
    unsavedChangeGuard:  true,
    enableAnalytics:     false,
    enableAuditLog:      false,
    enableAutosave:      true,
    enableFocusTrap:     true,
    enableEscapeClose:   true,
    enableSwipeClose:    true,
    installActionDispatcher: true,
    warnMissingModules:  true,
  },
  defaults: {
    autosaveIntervalMs: 10000,
    apiRetryCount:      2,
    apiRetryBackoffMs:  500,
    toastDurationMs:    3500,
    loadingDelayMs:     150,
  },
};

(function mergeFrameworkConfig() {
  const existing = window.ModalFramework || {};
  window.ModalFramework = {
    ..._ModalFrameworkDefaults,
    ...existing,
    flags:   { ..._ModalFrameworkDefaults.flags,   ...(existing.flags   || {}) },
    defaults:{ ..._ModalFrameworkDefaults.defaults, ...(existing.defaults || {}) },
    version: window.ExpertHubModalVersion,
  };
})();

function mfIndexLog(...args)  { if (ModalFramework.debug) console.log('[ModalIndex]', ...args); }
function mfIndexWarn(...args) { console.warn('[ModalIndex]', ...args); }

/* ------------------------------------------------------------------
 * 2. Module manifest
 * ---------------------------------------------------------------- */

window.ExpertHubModalModules = {
  shared:       { file: 'shared-modal-helpers.js', required: true,  loaded: false, exports: null },
  admin:        { file: 'admin-modals.js',         required: false, loaded: false, exports: null },
  learner:      { file: 'learner-modals.js',       required: false, loaded: false, exports: null },
  expert:       { file: 'expert-modals.js',        required: false, loaded: false, exports: null },
  institution:  { file: 'institution-modals.js',   required: false, loaded: false, exports: null },
  course:       { file: 'course-modals.js',        required: false, loaded: false, exports: null },
  consultation: { file: 'consultation-modals.js',  required: false, loaded: false, exports: null },
  payment:      { file: 'payment-modals.js',       required: false, loaded: false, exports: null },
  wallet:       { file: 'wallet-modals.js',        required: false, loaded: false, exports: null },
  support:      { file: 'support-modals.js',       required: false, loaded: false, exports: null },
  certificate:  { file: 'certificate-modals.js',   required: false, loaded: false, exports: null },
  scheduling:   { file: 'scheduling-modals.js',    required: false, loaded: false, exports: null },
  academic:     { file: 'academic-modals.js',      required: false, loaded: false, exports: null },
  project:      { file: 'project-modals.js',       required: false, loaded: false, exports: null },
};

/* ------------------------------------------------------------------
 * 3. Function map
 * ----------------------------------------------------------------
   Two purposes:
     a) Cheap "did this module actually define what we expect?" check.
     b) Optional namespacing (window.ModalRegistry.namespaces.admin).
   Names listed here are the ones intended to be reachable via
   window.<name>. Extras defined by a module are still registered
   but flagged in the console when debug is on.
 * ---------------------------------------------------------------- */

window.ExpertHubModalFunctionMap = {
  shared: [
    // dialogs
    'openConfirmModal', 'openDeleteConfirmModal', 'openWarningModal',
    'openSuccessModal', 'openErrorModal', 'openInfoModal',
    'openLoadingModal', 'openPromptModal',
    // form helpers
    'getFormData', 'setFormData', 'resetForm', 'clearFormErrors',
    'setFieldError', 'focusFirstInvalidField', 'validateForm', 'Validators',
    // security
    'sanitizeInput', 'sanitizeMultiline', 'sanitizeUrl', 'safeSetText',
    // api helpers
    'modalApiRequest', 'modalApiCreate', 'modalApiUpdate', 'modalApiPatch',
    'modalApiDelete', 'modalApiBatch',
    // state / permissions
    'refreshModalData', 'refreshAfterMutation', 'getCurrentUser', 'getCurrentRole',
    'isRole', 'can', 'requirePermission', 'ownsResource',
    // ui
    'disableModalSubmit', 'enableModalSubmit', 'setModalError', 'clearModalError',
    'setModalBusy',
    // error handling
    'handleModalError',
    // unsaved-change guard
    'trackFormChanges', 'untrackFormChanges', 'isFormDirty', 'confirmDiscardChanges',
    // accessibility
    'enhanceModalAccessibility', 'announce',
    // mobile
    'enableSwipeToDismiss',
    // analytics / audit
    'trackModalAnalytics', 'trackModalAudit',
    // utilities
    'mfSleep', 'mfDebounce', 'mfThrottle', 'mfUuid', 'mfClone', 'mfFormatDate',
    'mfFormatMoney', 'mfRelativeTime', 'mfEscapeRegex', 'mfQuerySelectorAllArray',
    // clipboard / downloads
    'copyToClipboard', 'downloadTextFile', 'downloadJson',
    // shortcuts / wizard / autosave / uploads
    'registerModalShortcut', 'openWizardModal', 'startAutosave', 'stopAutosave',
    'validateFile', 'readFileAsDataUrl', 'uploadModalFile',
    // legacy
    'loadCourseCurriculum',
  ],

  admin: [
    // users
    'openEditUserModal', 'openViewUserModal', 'openCreateUserModal',
    'openSuspendUserModal', 'openActivateUserModal', 'openDeleteUserModal',
    'openResetUserPasswordModal', 'openChangeUserRoleModal',
    'openUserPermissionsModal', 'openUserActivityModal', 'openUserAuditLogModal',
    // experts
    'submitCreateExpert', 'openApproveExpertModal', 'openRejectExpertModal',
    'openSuspendExpertModal', 'openExpertVerificationModal',
    'openExpertDocumentsModal', 'openExpertCommissionModal',
    // institutions
    'openViewInstitutionModal', 'openSuspendInstitutionModal', 'openAssignOpsModal',
    // consultations
    'showConsultationModal', 'openAssignExpertModal', 'openReassignExpertModal',
    'openCancelConsultationModal', 'openRefundConsultationModal',
    // coupons
    'openCreateCouponModal', 'openDeactivateCouponModal', 'openDeleteCouponModal',
    'openCouponStatsModal',
    // broadcasts
    'openBroadcastModal', 'sendBroadcast',
    // events
    'openEventModal', 'openDeleteEventModal', 'openEventRegistrationsModal',
    'openEventAttendanceModal', 'openEventRevenueModal',
    // settings & audit
    'openAdminSettingsModal', 'saveAdminSettings', 'openAuditLogModal',
    'clearAdminCache',
  ],

  learner: [
    'openChangeIntentModal', 'updateUserProfile', 'changePassword',
  ],

  expert: [
    // portfolio
    'openPortfolioItemModal', 'openAddPortfolioItemModal', 'openEditPortfolioItemModal',
    'openDeletePortfolioItemModal', 'openPortfolioPreviewModal',
    'reorderPortfolioItem', 'publishPortfolioItem',
    // pricing
    'openEditTiersModal', 'openDeleteTierModal', 'openPackageModal', 'openDiscountModal',
    // profile
    'openEditExpertProfileModal', 'openExpertQualificationsModal',
    'openExpertLanguagesModal',
    // availability
    'openAvailabilityModal', 'openHolidayModal', 'openBlockTimeModal',
    // verification
    'openVerificationStatusModal', 'openVerificationModal', 'openUploadCertificateModal',
    // earnings
    'openEarningsModal', 'openWithdrawalModal', 'openTransactionHistoryModal',
    'openStatementModal',
    // reviews & QA
    'openExpertReviewsModal', 'openReplyReviewModal',
    'openExpertQuestionsModal', 'openAnswerQuestionModal',
    // consultations
    'openExpertConsultationsModal', 'acceptConsultation', 'declineConsultation',
    'completeConsultation',
    // analytics / settings / public
    'openExpertAnalyticsModal', 'openExpertSettingsModal', 'openExpertProfileModal',
    'clearExpertCache',
  ],

  institution: [
    'openCampusModal', 'openPathBuilderModal', 'openAssignSuccessionModal',
    'openHireInstructorModal', 'openPostInstructorRequestModal',
    'openCreateBudgetModal', 'openEditBudgetModal', 'openBudgetTransactionsModal',
    'openNewReportDefinitionModal', 'runSavedReport', 'openAnnouncementModal',
    'openCreateApiKeyModal', 'openWebhookModal', 'saveSsoConfig',
    'saveSecurityPolicy', 'saveInstitutionSettings', 'saveBranding',
    'updateInstitutionProfile',
    'openProgrammeModal', 'openProgrammeViewModal', 'openCurriculumModal',
    'openLearningPathModal', 'openCohortModal', 'openCohortViewModal',
    'openCohortWaitlistModal', 'openImportHistoryModal', 'openTraineeImportModal',
    'uploadCsv', 'openTraineeDetailModal', 'openTraineeNotesModal',
    'openTraineeTransferModal', 'openManageSkillsModal', 'openComplianceRuleModal',
    'openAssignInstructorModal', 'bindPickButtons', 'openInviteTeamMemberModal',
    'openChangeTeamRoleModal', 'openTeamPermissionsModal', 'openOrgUnitModal',
    'openReportPreviewModal',
  ],

  course: [
    'openEnrollModal', 'markLessonComplete', 'openCourseReviewModal',
    'openCreateCourseModal', 'openEditCourseModal', 'openAddModuleModal',
    'openEditModuleModal', 'openAddLessonModal', 'openEditLessonModal',
    'saveCourseSettings',
  ],

  consultation: [
    'openReviewModal', 'openNewConsultationModal', 'openClaimModal',
    'openVideoCall', 'openFindExpertWizard', 'openInstantConsultationModal',
    'openBookSlotWithExpert', 'openRescheduleModal',
    // NOTE: openCancelConsultationModal also exists in admin-modals.js.
    // The registry resolves the collision (see registerModalFunction).
    'openCancelConsultationModal',
    'openConsultationDetailModal', 'openConsultationReviewModal',
    'openTipModal', 'openDisputeModal',
  ],

  payment:    ['openRefundModal'],
  wallet:     ['topUpWallet'],
  support:    ['openNewTicketModal', 'openTicketModal'],
  certificate:['printCertificateModal', 'openIssueCertificateModal'],
  scheduling: [
    'openManageSlotsModal', 'openBlockTimeModal', 'openProctorSessionModal',
    'openSessionModal', 'openAttendanceModal', 'openSessionsCalendarModal',
    'openScheduleReportModal',
  ],
  academic: [
    'openAssessmentModal', 'openGradingModal', 'openQuestionModal', 'uploadMaterial',
  ],
  project: ['openProjectModal'],
};

/* ------------------------------------------------------------------
 * 4. Registry
 * ---------------------------------------------------------------- */

const _registry = {
  modules: {},      // moduleName -> array of function names actually registered
  functions: new Map(),  // functionName -> { fn, module }
  collisions: [],   // [{ name, keptModule, droppedModule }]
};

/**
 * Register a single modal function.
 * Collision policy: the first module to register wins; later
 * attempts are recorded but do not overwrite. Override via
 * `{ override: true }`.
 */
function registerModalFunction(name, fn, moduleName, opts = {}) {
  if (typeof fn !== 'function') return false;

  const existing = _registry.functions.get(name);
  if (existing && !opts.override) {
    if (existing.module !== moduleName) {
      _registry.collisions.push({
        name, keptModule: existing.module, droppedModule: moduleName,
      });
      mfIndexWarn(`modal function collision: ${name} (kept from ${existing.module}, ignored from ${moduleName})`);
    }
    return false;
  }

  _registry.functions.set(name, { fn, module: moduleName });
  return true;
}

function getModalFunction(name) {
  return _registry.functions.get(name)?.fn || window[name] || null;
}

function listModalFunctions() {
  return Array.from(_registry.functions.entries()).map(([name, v]) => ({
    name, module: v.module,
  }));
}

function listModalModules() {
  return Object.entries(window.ExpertHubModalModules).map(([name, m]) => ({
    name, file: m.file, required: m.required, loaded: m.loaded,
    registered: _registry.modules[name]?.length || 0,
  }));
}

/* ------------------------------------------------------------------
 * 5. Dependency validation
 * ---------------------------------------------------------------- */

function validateModalDependencies({ silent = false } = {}) {
  const required = [
    { name: 'apiCall',    type: 'function' },
    { name: 'openModal',  type: 'function' },
    { name: 'closeModal', type: 'function' },
    { name: 'showToast',  type: 'function' },
    { name: '$',          type: 'function' },
    { name: 'S',          type: 'object'   },
  ];
  const missing = [];
  for (const r of required) {
    const actual = typeof window[r.name];
    if (actual !== r.type && !(r.type === 'object' && actual === 'object')) {
      if (actual === 'undefined') missing.push(r.name);
    }
  }
  if (missing.length && !silent) {
    mfIndexWarn('missing framework dependencies:', missing.join(', '));
  }
  return { ok: missing.length === 0, missing };
}

/* ------------------------------------------------------------------
 * 6. Module validation
 * ---------------------------------------------------------------- */

function validateModalModules({ silent = false } = {}) {
  const report = { loaded: [], missing: [], missingRequired: [], partial: [] };

  for (const [name, meta] of Object.entries(window.ExpertHubModalModules)) {
    // Namespace object convention: <Name>Modals  e.g. window.AdminModals
    const nsKey = name.charAt(0).toUpperCase() + name.slice(1) + 'Modals';
    const ns = window[nsKey];
    const hasNamespace = ns && typeof ns === 'object';

    // Shared has no namespace; it defines functions directly on window.
    const sharedLoaded = name === 'shared' &&
      typeof window.sanitizeInput === 'function' &&
      typeof window.modalApiRequest === 'function';

    if (hasNamespace || sharedLoaded) {
      meta.loaded = true;
      meta.exports = ns || null;
      report.loaded.push(name);

      // Cross-check declared map against actual exports
      const expected = window.ExpertHubModalFunctionMap[name] || [];
      const missingFns = expected.filter(fnName => {
        if (sharedLoaded) return typeof window[fnName] === 'undefined';
        return typeof ns[fnName] === 'undefined';
      });
      if (missingFns.length) {
        report.partial.push({ module: name, missing: missingFns });
        if (!silent) {
          mfIndexWarn(`module ${name} is missing expected functions:`, missingFns.join(', '));
        }
      }
    } else {
      report.missing.push(name);
      if (meta.required) report.missingRequired.push(name);
      if (!silent && ModalFramework.flags.warnMissingModules) {
        mfIndexWarn(`modal module not loaded: ${name} (${meta.file})`);
      }
    }
  }

  return report;
}

/* ------------------------------------------------------------------
 * 7. Action dispatcher
 * ----------------------------------------------------------------
   Delegated click handler for any element with [data-action].
   Buttons can be written as:

     <button data-action="edit-user" data-id="42">Edit</button>

   The dispatcher reads data-action + data-* attributes, resolves
   the mapped function, and calls it. Functions receive a single
   args object: { id, name, value, el, event, ...rest }
 * ---------------------------------------------------------------- */

/**
 * Map of data-action values to registered function names.
 * Add to this table as new data-action buttons appear in modules.
 * When the value is a string, it is treated as the function name.
 * When the value is a function, it is invoked with the args object.
 */
const MODAL_ACTION_TABLE = {
  // users / admin
  'view-user':         'openViewUserModal',
  'edit-user':         'openEditUserModal',
  'user-activity':     'openUserActivityModal',
  'user-audit':        'openUserAuditLogModal',
  'assign-ops':        'openAssignOpsModal',
  'edit-institution':  'openViewInstitutionModal',
  'assign-expert':     'openAssignExpertModal',

  // expert
  'edit-portfolio':    'openEditPortfolioItemModal',
  'open-verification': 'openVerificationModal',
  'open-withdrawal':   'openWithdrawalModal',
  'open-statements':   'openStatementModal',
  'reply-review':      'openReplyReviewModal',
  'answer-question':   'openAnswerQuestionModal',
  'accept-consult':    'acceptConsultation',
  'decline-consult':   'declineConsultation',
  'complete-consult':  'completeConsultation',

  // shared consumers
  'toggle-shortlist':  'toggleShortlist',
  'book-slot-with':    'openBookSlotWithExpert',
};

function _extractActionArgs(el) {
  const args = { el, event: null };
  for (const key of Object.keys(el.dataset)) {
    if (key === 'action') continue;
    const value = el.dataset[key];
    // Numeric-looking IDs get coerced so downstream comparisons work.
    args[key] = /^\d+$/.test(value) ? Number(value) : value;
  }
  return args;
}

function _modalActionHandler(event) {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (!action) return;
  const target = MODAL_ACTION_TABLE[action];
  if (!target) {
    if (ModalFramework.debug) mfIndexWarn(`no handler registered for data-action="${action}"`);
    return;
  }
  const args = _extractActionArgs(el);
  args.event = event;
  const fn = typeof target === 'function' ? target : getModalFunction(target);
  if (typeof fn !== 'function') {
    mfIndexWarn(`data-action="${action}" resolved to missing function "${target}"`);
    return;
  }
  try { fn(args); }
  catch (e) { mfIndexWarn('action handler error', action, e); }
}

let _actionDispatcherInstalled = false;

function registerModalActions(opts = {}) {
  if (!ModalFramework.flags.installActionDispatcher) return;
  if (_actionDispatcherInstalled) return;
  document.addEventListener('click', _modalActionHandler);
  _actionDispatcherInstalled = true;
  mfIndexLog('action dispatcher installed');
}

/* ------------------------------------------------------------------
 * 8. Initialization lifecycle
 * ---------------------------------------------------------------- */

function _registerModuleFunctions() {
  // Shared: registered from window directly (no namespace object)
  const sharedList = window.ExpertHubModalFunctionMap.shared || [];
  _registry.modules.shared = [];
  for (const name of sharedList) {
    if (typeof window[name] !== 'undefined') {
      if (registerModalFunction(name, window[name], 'shared')) {
        _registry.modules.shared.push(name);
      }
    }
  }

  // Named modules: registered from namespace objects (e.g. window.AdminModals)
  for (const moduleName of Object.keys(window.ExpertHubModalModules)) {
    if (moduleName === 'shared') continue;
    const nsKey = moduleName.charAt(0).toUpperCase() + moduleName.slice(1) + 'Modals';
    const ns = window[nsKey];
    if (!ns || typeof ns !== 'object') continue;

    _registry.modules[moduleName] = [];
    // Register everything the module actually exported (not just the map)
    for (const [fnName, fn] of Object.entries(ns)) {
      if (typeof fn !== 'function') continue;
      if (registerModalFunction(fnName, fn, moduleName)) {
        _registry.modules[moduleName].push(fnName);
        // Only mirror to window if the function isn't already a global
        // (avoids overwriting core.js exports by accident).
        if (typeof window[fnName] === 'undefined') {
          window[fnName] = fn;
        }
      }
    }
  }
}

function initModalSystem(opts = {}) {
  const { silent = false, installDispatcher = true } = opts;

  mfIndexLog(`initializing ExpertHub Modal Framework v${window.ExpertHubModalVersion}`);

  const deps = validateModalDependencies({ silent });
  const modules = validateModalModules({ silent });

  _registerModuleFunctions();

  if (installDispatcher) registerModalActions();

  if (!silent) {
    mfIndexLog('dependencies:', deps.ok ? 'OK' : `missing ${deps.missing.join(', ')}`);
    mfIndexLog('modules loaded:', modules.loaded.join(', ') || 'none');
    if (modules.missingRequired.length) {
      mfIndexWarn('required modules missing:', modules.missingRequired.join(', '));
    }
    mfIndexLog('registered functions:', _registry.functions.size);
    if (_registry.collisions.length) {
      mfIndexWarn('function name collisions:', _registry.collisions);
    }
  }

  return {
    version: window.ExpertHubModalVersion,
    dependencies: deps,
    modules,
    registeredFunctions: _registry.functions.size,
    collisions: _registry.collisions.slice(),
  };
}

/* ------------------------------------------------------------------
 * 9. Diagnostics & debug helpers
 * ---------------------------------------------------------------- */

function modalDebug(on = true) {
  ModalFramework.debug = !!on;
  mfIndexLog('debug', ModalFramework.debug ? 'enabled' : 'disabled');
}

function modalSetFlag(name, value) {
  if (!(name in ModalFramework.flags)) {
    mfIndexWarn('unknown flag:', name);
    return false;
  }
  ModalFramework.flags[name] = value;
  mfIndexLog('flag', name, '=', value);
  return true;
}

function modalDiagnostics() {
  return {
    version: window.ExpertHubModalVersion,
    flags: { ...ModalFramework.flags },
    dependencies: validateModalDependencies({ silent: true }),
    modules: listModalModules(),
    functions: listModalFunctions(),
    collisions: _registry.collisions.slice(),
    dispatcherInstalled: _actionDispatcherInstalled,
  };
}

/* ------------------------------------------------------------------
 * 10. Backward-compatible exports
 * ----------------------------------------------------------------
   Preserves the original shape (window.ExpertHubModalModules and
   window.ExpertHubModalFunctionMap) while adding the registry and
   lifecycle helpers.
 * ---------------------------------------------------------------- */

window.ModalRegistry = {
  version: window.ExpertHubModalVersion,

  // registration
  registerModule(name, functions) { return registerModalFunction; },
  registerFunction: registerModalFunction,
  get: getModalFunction,
  list: listModalFunctions,
  listModules: listModalModules,

  // lifecycle
  init: initModalSystem,
  validateDependencies: validateModalDependencies,
  validateModules: validateModalModules,
  registerActions: registerModalActions,

  // debug
  debug: modalDebug,
  setFlag: modalSetFlag,
  diagnostics: modalDiagnostics,

  // introspection
  actionTable: MODAL_ACTION_TABLE,
  collisions: () => _registry.collisions.slice(),
};

/*
  Auto-initialize once the DOM is ready. If the consumer prefers to
  drive initialization manually, they can set

      window.ModalFramework.flags.autoInit = false;

  before this script is loaded.
*/
(function autoInit() {
  if (ModalFramework.flags.autoInit === false) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initModalSystem());
  } else {
    initModalSystem();
  }
})();