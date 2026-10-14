/* ============================================================
   ExpertHub 2.0 — 11-user-catalog.js
   Extended capability catalog — 11 command definitions.
   Depends on window.EHFeature11 defined in 11-user-features.js.

   Generates: 21 features × 31 operations = 651 catalog entries.
   Each entry exposes: id, label, feature, operation, description,
   enabled, version, permissions, defaults, createdAt, validate,
   preview, execute — matching the original hand-written shape.

   Load order:
     js/11-user-features.js   → defines window.EHFeature11
     js/11-user-catalog.js    → this file (appends N.catalog)
   ============================================================ */

(function () {
  'use strict';

  const N = window.EHFeature11;
  if (!N) {
    console.warn('[ExpertHub] 11-user-catalog.js: EHFeature11 not found — skipping catalog registration.');
    return;
  }

  N.catalog = N.catalog || [];

  /* ---------- shared helpers ---------- */

  function safeCatalogClone(value) {
    try { return JSON.parse(JSON.stringify(value ?? {})); }
    catch (_) { return {}; }
  }

  function pad4(n) {
    return String(n).padStart(4, '0');
  }

  /* ---------- feature definitions ---------- */

  const FEATURES = [
    { title: 'learning streaks',            slug: 'learning-streaks',            category: 'learning',       description: 'learner experience enhancements' },
    { title: 'course progress calculator',  slug: 'course-progress-calculator',  category: 'course',         description: 'learner experience enhancements' },
    { title: 'lesson resume',               slug: 'lesson-resume',               category: 'lesson',         description: 'learner experience enhancements' },
    { title: 'bookmark manager',            slug: 'bookmark-manager',            category: 'bookmark',       description: 'learner experience enhancements' },
    { title: 'quiz attempt tracker',        slug: 'quiz-attempt-tracker',        category: 'quiz',           description: 'learner experience enhancements' },
    { title: 'certificate readiness',       slug: 'certificate-readiness',       category: 'certificate',    description: 'learner experience enhancements' },
    { title: 'study planner',               slug: 'study-planner',               category: 'study',          description: 'learner experience enhancements' },
    { title: 'recommendation engine',       slug: 'recommendation-engine',       category: 'recommendation', description: 'learner experience enhancements' },
    { title: 'wishlist',                    slug: 'wishlist',                    category: 'wishlist',       description: 'learner experience enhancements' },
    { title: 'consultation tracker',        slug: 'consultation-tracker',        category: 'consultation',   description: 'learner experience enhancements' },
    { title: 'goal tracker',                slug: 'goal-tracker',                category: 'goal',           description: 'learner experience enhancements' },
    { title: 'learning reminders',          slug: 'learning-reminders',          category: 'learning',       description: 'learner experience enhancements' },
    { title: 'notes manager',               slug: 'notes-manager',               category: 'notes',          description: 'learner experience enhancements' },
    { title: 'resource library',            slug: 'resource-library',            category: 'resource',       description: 'learner experience enhancements' },
    { title: 'course search',               slug: 'course-search',               category: 'course',         description: 'learner experience enhancements' },
    { title: 'skill progress',              slug: 'skill-progress',              category: 'skill',          description: 'learner experience enhancements' },
    { title: 'achievement system',          slug: 'achievement-system',          category: 'achievement',    description: 'learner experience enhancements' },
    { title: 'feedback capture',            slug: 'feedback-capture',            category: 'feedback',       description: 'learner experience enhancements' },
    { title: 'learner analytics',           slug: 'learner-analytics',           category: 'learner',        description: 'learner experience enhancements' },
    { title: 'privacy controls',            slug: 'privacy-controls',            category: 'privacy',        description: 'learner experience enhancements' },
    { title: 'learner diagnostics',         slug: 'learner-diagnostics',         category: 'learner',        description: 'learner experience enhancements' }
  ];

  /* ---------- operation definitions ---------- */

  const OPERATIONS = [
    { slug: 'inspect',         label: 'Inspect',         description: 'Inspect current records and return a normalized view' },
    { slug: 'validate',        label: 'Validate',        description: 'Validate inputs before a workflow is submitted' },
    { slug: 'preview',         label: 'Preview',         description: 'Build a preview payload without committing changes' },
    { slug: 'draft',           label: 'Draft',           description: 'Persist a reusable draft for later completion' },
    { slug: 'save',            label: 'Save',            description: 'Save a workflow result to browser storage' },
    { slug: 'restore',         label: 'Restore',         description: 'Restore a previously saved workflow snapshot' },
    { slug: 'export',          label: 'Export',          description: 'Prepare a portable export package' },
    { slug: 'import',          label: 'Import',          description: 'Validate an imported package before use' },
    { slug: 'batch',           label: 'Batch',           description: 'Prepare multiple records for one controlled operation' },
    { slug: 'audit',           label: 'Audit',           description: 'Create a client-side audit event for traceability' },
    { slug: 'compare',         label: 'Compare',         description: 'Compare two records and report differences' },
    { slug: 'summarize',       label: 'Summarize',       description: 'Produce a concise operational summary' },
    { slug: 'filter',          label: 'Filter',          description: 'Apply a domain-specific filter definition' },
    { slug: 'sort',            label: 'Sort',            description: 'Apply a stable sort definition' },
    { slug: 'paginate',        label: 'Paginate',        description: 'Return a paginated result window' },
    { slug: 'refresh',         label: 'Refresh',         description: 'Mark a dataset as needing refresh' },
    { slug: 'notify',          label: 'Notify',          description: 'Create a local notification payload' },
    { slug: 'schedule',        label: 'Schedule',        description: 'Create a deferred workflow instruction' },
    { slug: 'approve',         label: 'Approve',         description: 'Prepare an approval decision payload' },
    { slug: 'reject',          label: 'Reject',          description: 'Prepare a rejection decision payload' },
    { slug: 'archive',         label: 'Archive',         description: 'Prepare an archival instruction' },
    { slug: 'restore-record',  label: 'Restore-Record',  description: 'Prepare a record restoration instruction' },
    { slug: 'duplicate',       label: 'Duplicate',       description: 'Create a safe duplicate draft' },
    { slug: 'assign',          label: 'Assign',          description: 'Prepare an assignment payload' },
    { slug: 'unassign',        label: 'Unassign',        description: 'Prepare an unassignment payload' },
    { slug: 'escalate',        label: 'Escalate',        description: 'Prepare an escalation payload' },
    { slug: 'resolve',         label: 'Resolve',         description: 'Prepare a resolution payload' },
    { slug: 'close',           label: 'Close',           description: 'Prepare a controlled closeout payload' },
    { slug: 'reopen',          label: 'Reopen',          description: 'Prepare a controlled reopen payload' },
    { slug: 'publish',         label: 'Publish',         description: 'Prepare a publication payload' },
    { slug: 'unpublish',       label: 'Unpublish',       description: 'Prepare an unpublication payload' }
  ];

  /* ---------- generation ---------- */

  let counter = 0;

  FEATURES.forEach(feature => {
    OPERATIONS.forEach(op => {
      counter += 1;
      const id = `11-${pad4(counter)}-${feature.slug}-${op.slug}`;

      N.catalog.push({
        id,
        label: `${op.label} ${feature.title.replace(/\b\w/g, c => c.toUpperCase())}`,
        feature: feature.title,
        operation: op.slug,
        description: `${op.description} for ${feature.description}`,
        enabled: true,
        version: '2.0.0',
        permissions: [],
        defaults: { dryRun: true, notify: false, audit: true },
        createdAt: new Date().toISOString(),

        validate(payload = {}) {
          return {
            valid: payload !== null && typeof payload === 'object',
            errors: payload !== null && typeof payload === 'object'
              ? {}
              : { payload: 'Must be an object' }
          };
        },

        preview(payload = {}) {
          return {
            id,
            mode: 'preview',
            payload: safeCatalogClone(payload),
            timestamp: new Date().toISOString()
          };
        },

        execute(payload = {}, context = {}) {
          const packet = {
            id,
            feature: feature.title,
            operation: op.slug,
            payload: safeCatalogClone(payload),
            context: safeCatalogClone(context),
            timestamp: new Date().toISOString()
          };
          N.emit('catalog:executed', packet);
          return packet;
        }
      });
    });
  });

  /* ---------- catalog helpers (same API as original) ---------- */

  N.catalogSearch = function (query = '', filters = {}) {
    const q = String(query).trim().toLowerCase();
    return N.catalog.filter(item => {
      if (filters.operation && item.operation !== filters.operation) return false;
      if (filters.feature && item.feature !== filters.feature) return false;
      if (!q) return true;
      return [item.id, item.label, item.feature, item.operation, item.description]
        .join(' ').toLowerCase().includes(q);
    });
  };

  N.catalogExecute = function (id, payload = {}, context = {}) {
    const item = N.catalog.find(row => row.id === id);
    if (!item) throw new Error('Catalog command not found: ' + id);
    const validation = item.validate(payload, context);
    if (!validation.valid) {
      throw new Error(
        Object.values(validation.errors || {}).join(', ') || 'Catalog validation failed'
      );
    }
    return item.execute(payload, context);
  };

  N.catalogPreview = function (id, payload = {}) {
    const item = N.catalog.find(row => row.id === id);
    if (!item) throw new Error('Catalog command not found: ' + id);
    return item.preview(payload);
  };

  N.catalogStats = function () {
    const byOperation = {};
    const byFeature = {};
    N.catalog.forEach(item => {
      byOperation[item.operation] = (byOperation[item.operation] || 0) + 1;
      byFeature[item.feature] = (byFeature[item.feature] || 0) + 1;
    });
    return {
      total: N.catalog.length,
      enabled: N.catalog.filter(item => item.enabled).length,
      operations: byOperation,
      features: byFeature,
      generatedAt: new Date().toISOString()
    };
  };

  N.exportCatalog = function () {
    return N.catalog.map(item => ({
      id: item.id,
      label: item.label,
      feature: item.feature,
      operation: item.operation,
      description: item.description,
      enabled: item.enabled
    }));
  };

  N.registerCatalogEvents = function (root = document) {
    if (!root?.addEventListener) return () => {};
    const handler = event => {
      const button = event.target.closest?.('[data-eh-catalog]');
      if (!button) return;
      const id = button.getAttribute('data-eh-catalog');
      try {
        const result = N.catalogExecute(id, { source: 'ui', id });
        if (typeof window.showToast === 'function') window.showToast('Action prepared', 'success');
        N.emit('catalog:ui-result', result);
      } catch (error) {
        if (typeof window.showToast === 'function') window.showToast(error.message, 'error');
      }
    };
    root.addEventListener('click', handler);
    return () => root.removeEventListener('click', handler);
  };

  N.catalogReady = true;
  N.emit('catalog:ready', N.catalogStats());