/* ============================================================
   ExpertHub 2.0 — 06-my-learning.js
   Learner's enrollments: in-progress, not started, completed.

   Enhancements (v2):
   - Filter tabs: All / In Progress / Not Started / Completed / Expiring / Archived
   - Sort: recently accessed, progress ↑↓, title, enrolled date
   - Bulk selection with actions: archive / unarchive / download certificates
   - Refund countdown chip per enrollment (based on CONFIG window + progress)
   - Per-enrollment archive toggle (localStorage-backed)
   - Notes shortcut per enrollment
   - Renew badge + CTA for expired access
   - Offline badge if lessons downloaded
   - Print progress report (opens a printable HTML view)
   - Load-more pagination
   - Preserves original data-actions and IDs
   ============================================================ */

/* ============================================================
   Module state (session-scoped, with localStorage persistence)
   ============================================================ */
const ML_PAGE_SIZE        = 20;
const ML_ARCHIVE_KEY      = 'eh.mlArchived';
const REFUND_WINDOW_DAYS  = (typeof CONFIG !== 'undefined' && CONFIG.COURSE_REFUND_WINDOW_DAYS) || 14;
const REFUND_MAX_PROGRESS = 30;

S.__mlFilter   = S.__mlFilter   || 'all';       // all | in_progress | not_started | completed | expiring | archived
S.__mlSort     = S.__mlSort     || 'recent';    // recent | progress_desc | progress_asc | title | enrolled
S.__mlSelected = Array.isArray(S.__mlSelected) ? S.__mlSelected : [];
S.__mlVisible  = Number.isFinite(S.__mlVisible) ? S.__mlVisible : ML_PAGE_SIZE;

/* ============================================================
   Archive storage helpers
   ============================================================ */
function loadMlArchive() {
  try { const a = JSON.parse(localStorage.getItem(ML_ARCHIVE_KEY) || '[]'); return Array.isArray(a) ? a : []; }
  catch (_) { return []; }
}
function saveMlArchive(list) {
  try { localStorage.setItem(ML_ARCHIVE_KEY, JSON.stringify(list)); } catch (_) {}
}
function isEnrollmentArchived(enrollmentId) {
  return loadMlArchive().includes(String(enrollmentId));
}
function toggleEnrollmentArchive(enrollmentId) {
  const id = String(enrollmentId);
  const list = loadMlArchive();
  const idx = list.indexOf(id);
  if (idx >= 0) {
    list.splice(idx, 1);
    if (typeof showToast === 'function') showToast('Removed from archive', 'info');
  } else {
    list.push(id);
    if (typeof showToast === 'function') showToast('Archived', 'success');
  }
  saveMlArchive(list);
  rerenderMyLearning();
}

/* ============================================================
   Filter / sort / selection setters
   ============================================================ */
function setMlFilter(filter) {
  const valid = ['all', 'in_progress', 'not_started', 'completed', 'expiring', 'archived'];
  S.__mlFilter = valid.includes(filter) ? filter : 'all';
  S.__mlVisible = ML_PAGE_SIZE;
  rerenderMyLearning();
}
function setMlSort(sort) {
  const valid = ['recent', 'progress_desc', 'progress_asc', 'title', 'enrolled'];
  S.__mlSort = valid.includes(sort) ? sort : 'recent';
  S.__mlVisible = ML_PAGE_SIZE;
  rerenderMyLearning();
}
function loadMoreMyLearning() {
  S.__mlVisible = (S.__mlVisible || ML_PAGE_SIZE) + ML_PAGE_SIZE;
  rerenderMyLearning();
}
function rerenderMyLearning() {
  if (typeof renderUserDashboard === 'function') renderUserDashboard();
}

/* ============================================================
   Selection helpers (bulk actions)
   ============================================================ */
function toggleMlSelection(enrollmentId) {
  const id = String(enrollmentId);
  const idx = S.__mlSelected.indexOf(id);
  if (idx >= 0) S.__mlSelected.splice(idx, 1);
  else S.__mlSelected.push(id);
  rerenderMyLearning();
}
function toggleMlSelectAll(ids) {
  const list = Array.isArray(ids) ? ids.map(String) : [];
  const allSelected = list.length > 0 && list.every(id => S.__mlSelected.includes(id));
  S.__mlSelected = allSelected ? [] : list.slice();
  rerenderMyLearning();
}
function clearMlSelection() {
  S.__mlSelected = [];
  rerenderMyLearning();
}

function bulkArchiveSelected() {
  if (!S.__mlSelected.length) return;
  const list = loadMlArchive();
  let added = 0;
  S.__mlSelected.forEach(id => {
    if (!list.includes(String(id))) { list.push(String(id)); added++; }
  });
  saveMlArchive(list);
  if (typeof showToast === 'function') showToast(`Archived ${added} enrollment${added === 1 ? '' : 's'}`, 'success');
  clearMlSelection();
}
function bulkUnarchiveSelected() {
  if (!S.__mlSelected.length) return;
  const sel = new Set(S.__mlSelected.map(String));
  const list = loadMlArchive().filter(id => !sel.has(id));
  saveMlArchive(list);
  if (typeof showToast === 'function') showToast('Unarchived', 'success');
  clearMlSelection();
}
function bulkDownloadCertificates() {
  const sel = S.__mlSelected.map(String);
  const certs = (S.certificates || []).filter(c => sel.includes(String(c.course_id)));
  if (!certs.length) {
    if (typeof showToast === 'function') showToast('No certificates for the selected enrollments.', 'info');
    return;
  }
  const payload = certs.map(c => ({
    course: c.course_title,
    serial: c.serial,
    issued_at: c.issued_at,
    verify_url: `/verify/${c.serial}`,
  }));
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'experthub-certificates.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
    if (typeof showToast === 'function') showToast(`Prepared ${certs.length} certificate reference${certs.length === 1 ? '' : 's'}`, 'success');
  } catch (_) {
    if (typeof showToast === 'function') showToast('Could not prepare download', 'error');
  }
}

/* ============================================================
   Per-enrollment helpers
   ============================================================ */
function refundEligibility(e) {
  const purchase = e.enrolled_at || e.purchased_at || e.created_at;
  if (!purchase) return null;
  const days = (Date.now() - new Date(purchase).getTime()) / 86400000;
  const daysLeft = Math.max(0, Math.ceil(REFUND_WINDOW_DAYS - days));
  const progress = Number(e.progress || 0);
  const within = daysLeft > 0;
  const lowProgress = progress < REFUND_MAX_PROGRESS;
  return {
    eligible: within && lowProgress,
    daysLeft,
    reason: !within ? 'Refund window ended' : (!lowProgress ? 'Progress above 30%' : ''),
  };
}

function openEnrollmentNotes(enrollmentId) {
  const e = (S.enrollments || []).find(x => String(x.id) === String(enrollmentId));
  if (!e) return;
  if (typeof showToast === 'function') {
    showToast('Opening your notes…', 'info');
  }
  /* Prefer the framework's tab-switch mechanism if available. */
  const nav = document.querySelector('[data-action="switch-tab"][data-tab="course-notes"]');
  if (nav && typeof nav.click === 'function') {
    nav.click();
  } else if (typeof window.setActiveTab === 'function') {
    window.setActiveTab('course-notes');
  } else {
    window.location.hash = '#/dashboard/course-notes';
  }
}

function printProgressReport() {
  const enrollments = S.enrollments || [];
  const user = (typeof currentUser === 'object' && currentUser) ? currentUser : {};
  const w = window.open('', '_blank', 'width=860,height=900');
  if (!w) {
    if (typeof showToast === 'function') showToast('Popup blocked. Please allow popups for this site.', 'warning');
    return;
  }

  const rows = enrollments.map(e => {
    const progress = Number(e.progress || 0);
    const state = progress >= 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started';
    const enrolledAt = e.enrolled_at || e.created_at || '';
    return `
      <tr>
        <td>${escapeHtml(e.title || '')}</td>
        <td>${escapeHtml(e.enrollment_type || '')}</td>
        <td>${state}</td>
        <td style="text-align:right">${progress}%</td>
        <td>${enrolledAt ? escapeHtml(new Date(enrolledAt).toLocaleDateString()) : ''}</td>
      </tr>
    `;
  }).join('');

  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Learning Progress Report — ${escapeHtml(user.name || 'Learner')}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
      h1 { margin: 0 0 4px; font-size: 22px; }
      .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
      th { background: #f9fafb; font-weight: 600; }
      .stat { display: inline-block; margin-right: 20px; }
      .stat strong { display: block; font-size: 22px; }
      .stat span { color: #666; font-size: 12px; }
      @media print { a { color: inherit; text-decoration: none; } }
    </style>
  </head>
  <body>
    <h1>Learning Progress Report</h1>
    <div class="meta">
      ${escapeHtml(user.name || 'Learner')} · ${escapeHtml(user.email || '')} · Generated ${new Date().toLocaleString()}
    </div>
    <div style="margin-bottom:20px">
      <div class="stat"><strong>${enrollments.length}</strong><span>Total enrollments</span></div>
      <div class="stat"><strong>${enrollments.filter(e => Number(e.progress) >= 100).length}</strong><span>Completed</span></div>
      <div class="stat"><strong>${enrollments.filter(e => Number(e.progress) > 0 && Number(e.progress) < 100).length}</strong><span>In progress</span></div>
    </div>
    <table>
      <thead>
        <tr><th>Course</th><th>Type</th><th>Status</th><th style="text-align:right">Progress</th><th>Enrolled</th></tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="5">No enrollments</td></tr>'}</tbody>
    </table>
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>
  </body>
  </html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================================
   USER — MY LEARNING
   ============================================================ */
function userMyLearning() {
  const all = S.enrollments || [];
  const archivedIds = new Set(loadMlArchive());

  /* Split active vs archived */
  const active  = all.filter(e => !archivedIds.has(String(e.id)));
  const archived = all.filter(e => archivedIds.has(String(e.id)));

  const inProgress = active.filter(e => Number(e.progress || 0) > 0 && Number(e.progress || 0) < 100);
  const notStarted = active.filter(e => Number(e.progress || 0) === 0);
  const completed  = active.filter(e => Number(e.progress || 0) >= 100);
  const expiring   = active.filter(e => {
    const t = e.access_expires_at || e.expires_at;
    if (!t) return false;
    const days = (new Date(t).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 30;
  });

  const counts = {
    all:         active.length,
    in_progress: inProgress.length,
    not_started: notStarted.length,
    completed:   completed.length,
    expiring:    expiring.length,
    archived:    archived.length,
  };

  const tabs = [
    { id: 'all',         label: 'All',         icon: 'fa-list-ul',      count: counts.all },
    { id: 'in_progress', label: 'In Progress', icon: 'fa-play-circle',  count: counts.in_progress },
    { id: 'not_started', label: 'Not Started', icon: 'fa-hourglass-start', count: counts.not_started },
    { id: 'completed',   label: 'Completed',   icon: 'fa-check-circle', count: counts.completed },
    { id: 'expiring',    label: 'Expiring',    icon: 'fa-clock',        count: counts.expiring },
    { id: 'archived',    label: 'Archived',    icon: 'fa-archive',      count: counts.archived },
  ];

  const sortOptions = [
    { id: 'recent',        label: 'Recently accessed' },
    { id: 'progress_desc', label: 'Progress: high to low' },
    { id: 'progress_asc',  label: 'Progress: low to high' },
    { id: 'title',         label: 'Title (A–Z)' },
    { id: 'enrolled',      label: 'Newest enrollment' },
  ];

  /* Which sections to render based on filter */
  const filter = S.__mlFilter;
  const showInProgress = filter === 'all' || filter === 'in_progress';
  const showNotStarted = filter === 'all' || filter === 'not_started';
  const showCompleted  = filter === 'all' || filter === 'completed';
  const showExpiring   = filter === 'expiring';
  const showArchived   = filter === 'archived';

  /* Selection state for bulk actions */
  const selectionCount = S.__mlSelected.length;
  const visibleIds = getAllVisibleEnrollmentIds({ filter, inProgress, notStarted, completed, expiring, archived });

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Learning</span></div>
    <section class="page-header">
      <h1 class="page-title">My Learning</h1>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" onclick="printProgressReport(); return false;">
          <i class="fas fa-print"></i> Print progress
        </button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">In Progress</p><p class="stat-value">${inProgress.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-play-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Not Started</p><p class="stat-value">${notStarted.length}</p></div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-hourglass-start"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Completed</p><p class="stat-value">${completed.length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Certificates</p><p class="stat-value">${S.certificates.length}</p></div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-award"></i></div>
      </div>
    </section>

    <nav class="tab-bar">
      ${tabs.map(t => `
        <button class="tab-btn ${filter === t.id ? 'tab-btn-active' : ''}"
                onclick="setMlFilter('${t.id}'); return false;">
          <i class="fas ${t.icon}"></i> ${t.label}
          <span class="chip chip-neutral" style="margin-left:6px">${t.count}</span>
        </button>
      `).join('')}
    </nav>

    <div class="panel ml-toolbar-panel">
      <div class="ml-toolbar">
        <div class="ml-toolbar-left">
          <label class="checkbox-row">
            <input type="checkbox"
                   ${visibleIds.length && visibleIds.every(id => S.__mlSelected.includes(id)) ? 'checked' : ''}
                   onchange="toggleMlSelectAll(${JSON.stringify(visibleIds).replace(/"/g, '&quot;')})" />
            <span class="form-hint">Select all visible</span>
          </label>
          ${selectionCount ? `
            <span class="chip chip-blue">${selectionCount} selected</span>
          ` : ''}
        </div>
        <div class="ml-toolbar-right">
          <select class="form-select" style="max-width:200px"
                  onchange="setMlSort(this.value)">
            ${sortOptions.map(s => `
              <option value="${s.id}" ${S.__mlSort === s.id ? 'selected' : ''}>${s.label}</option>
            `).join('')}
          </select>
        </div>
      </div>
      ${selectionCount ? `
        <div class="ml-bulk-bar">
          <i class="fas fa-layer-group"></i>
          <span>${selectionCount} selected</span>
          <button class="btn btn-secondary btn-sm" onclick="bulkDownloadCertificates(); return false;">
            <i class="fas fa-certificate"></i> Download certificates
          </button>
          <button class="btn btn-secondary btn-sm" onclick="bulkArchiveSelected(); return false;">
            <i class="fas fa-archive"></i> Archive
          </button>
          <button class="btn btn-secondary btn-sm" onclick="bulkUnarchiveSelected(); return false;">
            <i class="fas fa-box-open"></i> Unarchive
          </button>
          <button class="btn btn-ghost btn-sm" onclick="clearMlSelection(); return false;">
            <i class="fas fa-times"></i> Clear
          </button>
        </div>
      ` : ''}
    </div>

    ${(showInProgress && inProgress.length) ? `
      <section class="panel">
        <h3 class="panel-title">
          <i class="fas fa-play-circle"></i> In Progress
          <span class="chip chip-neutral" style="margin-left:8px">${inProgress.length}</span>
        </h3>
        ${paginateMlSection(inProgress).map(e => renderEnrollmentCard(e, 'in_progress')).join('')}
        ${renderMlLoadMore(inProgress)}
      </section>
    ` : ''}

    ${(showNotStarted && notStarted.length) ? `
      <section class="panel">
        <h3 class="panel-title">
          <i class="fas fa-hourglass-start"></i> Not Started
          <span class="chip chip-neutral" style="margin-left:8px">${notStarted.length}</span>
        </h3>
        ${paginateMlSection(notStarted).map(e => renderEnrollmentCard(e, 'not_started')).join('')}
        ${renderMlLoadMore(notStarted)}
      </section>
    ` : ''}

    ${(showExpiring && expiring.length) ? `
      <section class="panel">
        <h3 class="panel-title">
          <i class="fas fa-clock"></i> Expiring Soon
          <span class="chip chip-neutral" style="margin-left:8px">${expiring.length}</span>
        </h3>
        ${expiring.map(e => renderEnrollmentCard(e, 'expiring')).join('')}
      </section>
    ` : ''}

    ${(showCompleted && completed.length) ? `
      <section class="panel">
        <h3 class="panel-title">
          <i class="fas fa-check-circle"></i> Completed
          <span class="chip chip-neutral" style="margin-left:8px">${completed.length}</span>
        </h3>
        ${paginateMlSection(completed).map(e => renderEnrollmentCard(e, 'completed')).join('')}
        ${renderMlLoadMore(completed)}
      </section>
    ` : ''}

    ${(showArchived && archived.length) ? `
      <section class="panel">
        <h3 class="panel-title">
          <i class="fas fa-archive"></i> Archived
          <span class="chip chip-neutral" style="margin-left:8px">${archived.length}</span>
        </h3>
        ${archived.map(e => renderEnrollmentCard(e, 'archived')).join('')}
      </section>
    ` : ''}

    ${!all.length ? `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-graduation-cap"></i>
          <h3>No enrollments yet</h3>
          <p>Explore the E-School to start learning.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool">
            <i class="fas fa-search"></i> Explore Courses</button>
        </div>
      </section>
    ` : (filter !== 'all' && !getCountForFilter(filter, { inProgress, notStarted, completed, expiring, archived })) ? `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-filter"></i>
          <h3>Nothing in this view</h3>
          <p>Try another filter tab.</p>
          <button class="btn btn-secondary" onclick="setMlFilter('all'); return false;">
            <i class="fas fa-list-ul"></i> Show all
          </button>
        </div>
      </section>
    ` : ''}
  `;
}

function getCountForFilter(filter, groups) {
  switch (filter) {
    case 'in_progress': return groups.inProgress.length;
    case 'not_started': return groups.notStarted.length;
    case 'completed':   return groups.completed.length;
    case 'expiring':    return groups.expiring.length;
    case 'archived':    return groups.archived.length;
    default:            return 0;
  }
}

function getAllVisibleEnrollmentIds({ filter, inProgress, notStarted, completed, expiring, archived }) {
  if (filter === 'all') {
    return [...inProgress, ...notStarted, ...completed].map(e => String(e.id));
  }
  if (filter === 'in_progress') return inProgress.map(e => String(e.id));
  if (filter === 'not_started') return notStarted.map(e => String(e.id));
  if (filter === 'completed')   return completed.map(e => String(e.id));
  if (filter === 'expiring')    return expiring.map(e => String(e.id));
  if (filter === 'archived')    return archived.map(e => String(e.id));
  return [];
}

/* ============================================================
   Sorting + pagination
   ============================================================ */
function sortEnrollments(list) {
  const out = list.slice();
  const ts = (e) => {
    const t = e.last_accessed_at || e.updated_at || e.completed_at || e.enrolled_at || e.created_at;
    return t ? new Date(t).getTime() : 0;
  };
  switch (S.__mlSort) {
    case 'progress_desc': out.sort((a, b) => Number(b.progress || 0) - Number(a.progress || 0)); break;
    case 'progress_asc':  out.sort((a, b) => Number(a.progress || 0) - Number(b.progress || 0)); break;
    case 'title':         out.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))); break;
    case 'enrolled':
      out.sort((a, b) => {
        const ta = new Date(a.enrolled_at || a.created_at || 0).getTime();
        const tb = new Date(b.enrolled_at || b.created_at || 0).getTime();
        return tb - ta;
      });
      break;
    case 'recent':
    default: out.sort((a, b) => ts(b) - ts(a)); break;
  }
  return out;
}

function paginateMlSection(list) {
  return sortEnrollments(list).slice(0, S.__mlVisible || ML_PAGE_SIZE);
}

function renderMlLoadMore(list) {
  const sorted = sortEnrollments(list);
  const shown = Math.min(S.__mlVisible || ML_PAGE_SIZE, sorted.length);
  const remaining = sorted.length - shown;
  if (remaining <= 0) return '';
  return `
    <div class="ml-load-more">
      <button class="btn btn-secondary btn-sm" onclick="loadMoreMyLearning(); return false;">
        <i class="fas fa-chevron-down"></i>
        Load ${Math.min(ML_PAGE_SIZE, remaining)} more
        <span class="form-hint">(${remaining} remaining)</span>
      </button>
    </div>
  `;
}

/* ============================================================
   Enrollment card (shared across sections)
   ============================================================ */
function renderEnrollmentCard(e, section) {
  const progress = Number(e.progress || 0);
  const isCompleted = progress >= 100;
  const archived = isEnrollmentArchived(e.id);
  const selected = S.__mlSelected.includes(String(e.id));
  const refund = refundEligibility(e);
  const offline = hasOfflineLessons(e.course_id);
  const accessExpiresAt = e.access_expires_at || e.expires_at;
  const accessExpired = accessExpiresAt && new Date(accessExpiresAt).getTime() < Date.now();
  const daysToExpire = accessExpiresAt
    ? Math.ceil((new Date(accessExpiresAt).getTime() - Date.now()) / 86400000)
    : null;

  return `
    <article class="enrollment-card ${selected ? 'is-selected' : ''} ${archived ? 'is-archived' : ''}">
      <header class="enrollment-card-head">
        <label class="enrollment-select" title="Select">
          <input type="checkbox" ${selected ? 'checked' : ''}
                 onchange="toggleMlSelection('${escapeForAttr(e.id)}')" />
        </label>
        <div class="enrollment-card-head-main">
          <h3 class="enrollment-title">${esc(e.title || '')}</h3>
          <p class="enrollment-type">${esc(e.enrollment_type || '')}</p>
        </div>
        <div class="enrollment-badges">
          ${offline ? `<span class="chip chip-blue" title="Lessons downloaded for offline"><i class="fas fa-download"></i> Offline</span>` : ''}
          ${archived ? `<span class="chip chip-neutral">Archived</span>` : ''}
          ${accessExpired ? `<span class="chip chip-red">Expired</span>` : ''}
        </div>
      </header>

      <div class="progress-bar"><span style="width:${isCompleted ? 100 : progress}%"></span></div>
      <p class="enrollment-progress">
        ${isCompleted
          ? `Completed ${e.completed_at ? 'on ' + fmtDate(e.completed_at) : ''}`
          : `${progress}% complete`}
        ${daysToExpire !== null && !accessExpired && daysToExpire <= 30
          ? `<span class="enrollment-expiry-hint">· Access ends in ${daysToExpire} day${daysToExpire === 1 ? '' : 's'}</span>`
          : ''}
      </p>

      ${refund ? `
        <div class="enrollment-refund-hint ${refund.eligible ? 'is-eligible' : 'is-ineligible'}">
          <i class="fas ${refund.eligible ? 'fa-undo' : 'fa-ban'}"></i>
          ${refund.eligible
            ? `Refundable for ${refund.daysLeft} more day${refund.daysLeft === 1 ? '' : 's'}`
            : esc(refund.reason || 'Not eligible for refund')}
        </div>
      ` : ''}

      <div class="panel-actions enrollment-actions">
        ${!isCompleted ? `
          <button class="btn btn-primary btn-sm" data-action="open-course-player" data-id="${escapeForAttr(e.course_id)}">
            <i class="fas fa-play"></i> ${progress > 0 ? 'Resume' : 'Start Learning'}</button>
        ` : ''}

        ${isCompleted ? `
          <button class="btn btn-secondary btn-sm" data-action="review-course" data-id="${escapeForAttr(e.course_id)}">
            <i class="fas fa-star"></i> Review Course</button>
          <button class="btn btn-info btn-sm" data-action="view-certificate" data-course="${escapeForAttr(e.course_id)}">
            <i class="fas fa-certificate"></i> Certificate</button>
        ` : ''}

        <button class="btn btn-secondary btn-sm"
                onclick="openEnrollmentNotes('${escapeForAttr(e.id)}'); return false;">
          <i class="fas fa-sticky-note"></i> Notes
        </button>

        ${!isCompleted && refund && refund.eligible ? `
          <button class="btn btn-secondary btn-sm" data-action="request-refund" data-id="${escapeForAttr(e.id)}">
            <i class="fas fa-rotate-left"></i> Request Refund</button>
        ` : ''}

        ${accessExpired ? `
          <button class="btn btn-success btn-sm"
                  onclick="renewEnrollment('${escapeForAttr(e.course_id)}'); return false;">
            <i class="fas fa-redo"></i> Renew Access
          </button>
        ` : ''}

        <button class="btn btn-ghost btn-sm"
                onclick="toggleEnrollmentArchive('${escapeForAttr(e.id)}'); return false;"
                title="${archived ? 'Unarchive' : 'Archive'}">
          <i class="fas ${archived ? 'fa-box-open' : 'fa-archive'}"></i>
          ${archived ? 'Unarchive' : 'Archive'}
        </button>
      </div>
    </article>
  `;
}

/* ============================================================
   Enrollment utilities
   ============================================================ */
function hasOfflineLessons(courseId) {
  if (!courseId) return false;
  try {
    return !!localStorage.getItem('eh.downloaded.' + courseId);
  } catch (_) { return false; }
}

function renewEnrollment(courseId) {
  if (typeof showToast === 'function') {
    showToast('Opening renewal options…', 'info');
  }
  /* Try the standard enroll modal if present; else route to the course. */
  const enrollBtn = document.querySelector(`[data-action="enroll-modal"][data-id="${cssEscape(String(courseId))}"]`);
  if (enrollBtn && typeof enrollBtn.click === 'function') {
    enrollBtn.click();
    return;
  }
  if (typeof openCourseDetailModal === 'function') {
    try { openCourseDetailModal(courseId); return; } catch (_) {}
  }
  window.location.hash = `#/dashboard/eschool?id=${encodeURIComponent(courseId)}`;
}

function escapeForAttr(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function cssEscape(s) {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(String(s));
  return String(s).replace(/["\\]/g, '\\$&');
}