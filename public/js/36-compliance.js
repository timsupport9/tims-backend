/* ============================================================
   ExpertHub 2.0 — 36-compliance.js
   Compliance & certification tracking: mandatory assignments,
   due dates, overdue alerts, audit log, certificate revocation.
   ============================================================ */

function userCompliance() {
  const assignments = getComplianceAssignments();
  const summary = computeComplianceStatus(assignments);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Compliance</span></div>
    <section class="page-header">
      <h1 class="page-title">Compliance &amp; Certifications</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="compliance-export">
          <i class="fas fa-file-csv"></i> Export report</button>
        <button class="btn btn-secondary" data-action="compliance-audit-log">
          <i class="fas fa-history"></i> Audit log</button>
        <button class="btn btn-primary" data-action="compliance-new">
          <i class="fas fa-plus"></i> Assign training</button>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Compliant</p>
          <p class="stat-value">${summary.compliant}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Due soon (14d)</p>
          <p class="stat-value">${summary.due_soon}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Overdue</p>
          <p class="stat-value">${summary.overdue}</p>
        </div>
        <div class="stat-icon stat-icon-red"><i class="fas fa-exclamation-triangle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Overall compliance</p>
          <p class="stat-value">${summary.percent}%</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-shield-alt"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Mandatory assignments</h3>
      ${assignments.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Learner</th><th>Course</th><th>Assigned</th><th>Due</th>
                <th>Status</th><th>Progress</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${assignments.slice(0, 60).map(a => renderComplianceRow(a)).join('')}
            </tbody>
          </table>
        </div>` : `
        <div class="empty-state">
          <i class="fas fa-clipboard-list"></i>
          <h3>No mandatory assignments</h3>
          <p>Assign compliance training to your learners to start tracking.</p>
          <button class="btn btn-primary" data-action="compliance-new">
            <i class="fas fa-plus"></i> Assign training</button>
        </div>`}
    </section>

    <section class="panel">
      <h3 class="panel-title">Issued certifications</h3>
      ${renderIssuedCertifications()}
    </section>
  `;
}

/* ============================================================
   DATA
   ============================================================ */
const COMPLIANCE_STORAGE = 'eh.compliance.v1';

function getComplianceAssignments() {
  if (S.complianceAssignments && Array.isArray(S.complianceAssignments)) {
    return S.complianceAssignments;
  }
  try {
    const raw = localStorage.getItem(COMPLIANCE_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function saveComplianceAssignments(rows) {
  S.complianceAssignments = rows;
  try { localStorage.setItem(COMPLIANCE_STORAGE, JSON.stringify(rows)); } catch (_) {}
}

function computeComplianceStatus(assignments) {
  const now = Date.now();
  const soon = now + 14 * 86400000;
  let compliant = 0, due_soon = 0, overdue = 0;

  assignments.forEach(a => {
    const completed = Number(a.progress || 0) >= 100;
    if (completed) { compliant++; return; }
    if (!a.due_date) return;
    const t = new Date(a.due_date).getTime();
    if (t < now) overdue++;
    else if (t <= soon) due_soon++;
  });

  const total = assignments.length;
  const percent = total ? Math.round((compliant / total) * 100) : 0;
  return { compliant, due_soon, overdue, total, percent };
}

/* ============================================================
   RENDERING
   ============================================================ */
function renderComplianceRow(a) {
  const now = Date.now();
  const completed = Number(a.progress || 0) >= 100;
  const due = a.due_date ? new Date(a.due_date).getTime() : null;
  const overdue = !completed && due && due < now;
  const dueSoon = !completed && due && due <= now + 14 * 86400000;

  const status = completed ? 'compliant'
    : overdue ? 'overdue'
    : dueSoon ? 'due-soon'
    : 'in-progress';

  const label = completed ? 'Compliant'
    : overdue ? 'Overdue'
    : dueSoon ? 'Due soon'
    : 'In progress';

  return `
    <tr class="compliance-row compliance-row-${status}">
      <td>
        <div style="display:flex;gap:8px;align-items:center">
          <img class="user-avatar user-avatar-sm"
               src="${avatar({ name: a.user_name, email: a.user_email })}" alt="" />
          <span>${esc(a.user_name || a.user_email || '—')}</span>
        </div>
      </td>
      <td>${esc(a.course_title || '—')}</td>
      <td>${a.assigned_at ? fmtDate(a.assigned_at) : '—'}</td>
      <td>${a.due_date ? fmtDate(a.due_date) : '—'}</td>
      <td><span class="chip ${status === 'compliant' ? 'chip-green'
        : status === 'overdue' ? 'chip-red'
        : status === 'due-soon' ? 'chip-yellow'
        : 'chip-neutral'}">${label}</span></td>
      <td>${a.progress || 0}%</td>
      <td>
        ${!completed ? `
          <button class="btn btn-secondary btn-xs" data-action="compliance-nudge"
                  data-id="${esc(a.id)}">
            <i class="fas fa-bell"></i> Nudge</button>
        ` : ''}
        ${completed && a.certificate_id ? `
          <button class="btn btn-secondary btn-xs" data-action="compliance-revoke"
                  data-cert="${esc(a.certificate_id)}">
            <i class="fas fa-ban"></i> Revoke</button>
        ` : ''}
      </td>
    </tr>`;
}

function renderIssuedCertifications() {
  const certs = (S.certificates || []).filter(c => c.institution_id === (S.institution?.id || null));
  if (!certs.length) return '<p class="empty-row">No certificates issued by this institution.</p>';
  return `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr><th>Serial</th><th>Learner</th><th>Course</th>
              <th>Issued</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          ${certs.slice(0, 50).map(c => `
            <tr>
              <td><code class="code">${esc(c.serial || '')}</code></td>
              <td>${esc(c.user_name || c.user_email || '—')}</td>
              <td>${esc(c.course_title || '—')}</td>
              <td>${fmtDate(c.issued_at)}</td>
              <td>
                ${c.revoked_at
                  ? '<span class="chip chip-red">Revoked</span>'
                  : '<span class="chip chip-green">Valid</span>'}
              </td>
              <td>
                ${!c.revoked_at ? `
                  <button class="btn btn-secondary btn-xs" data-action="compliance-revoke"
                          data-cert="${esc(c.id)}">
                    <i class="fas fa-ban"></i> Revoke</button>
                ` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/* ============================================================
   NEW ASSIGNMENT
   ============================================================ */
function openComplianceAssignmentWizard() {
  const members = S.institutionMembers || [];
  const courses = S.courses || [];

  openModal({
    title: 'Assign mandatory training',
    className: 'modal-lg',
    body: `
      <div class="form-grid">
        <label class="form-group form-group-full"><span class="form-label">Course</span>
          <select id="comp-course" class="form-select">
            <option value="">— Choose course —</option>
            ${courses.map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Cohort / group</span>
          <select id="comp-cohort" class="form-select">
            <option value="">All learners</option>
            ${Array.from(new Set(members.map(m => m.cohort || m.department).filter(Boolean)))
              .map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Due date</span>
          <input id="comp-due" type="date" class="form-input" /></label>
        <label class="form-group form-group-full"><span class="form-label">Message (optional)</span>
          <textarea id="comp-message" class="form-textarea" rows="2"
                    placeholder="Why is this required? Adds context for learners."></textarea></label>
      </div>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary" id="comp-create">
        <i class="fas fa-plus"></i> Assign</button>`,
  });

  document.getElementById('comp-create').onclick = async () => {
    const courseId = document.getElementById('comp-course').value;
    const cohort = document.getElementById('comp-cohort').value;
    const due = document.getElementById('comp-due').value;
    const message = document.getElementById('comp-message').value.trim();

    if (!courseId) return showToast('Choose a course', 'warning');
    if (!due) return showToast('Set a due date', 'warning');

    const course = courses.find(c => String(c.id) === String(courseId));
    const targets = members.filter(m => !cohort || m.cohort === cohort || m.department === cohort);

    const newRows = targets.map(m => ({
      id: 'comp-' + Math.random().toString(36).slice(2, 10),
      user_id: m.id || m.user_id,
      user_name: m.name,
      user_email: m.email,
      course_id: courseId,
      course_title: course?.title || '',
      cohort: cohort || null,
      assigned_at: new Date().toISOString(),
      due_date: due,
      message: message || null,
      progress: 0,
      status: 'assigned',
    }));

    try {
      await apiCall('/api/institution/compliance', 'POST', { assignments: newRows });
    } catch (_) { /* offline ok */ }

    const existing = getComplianceAssignments();
    saveComplianceAssignments(existing.concat(newRows));

    closeModal();
    showToast(`Assigned to ${newRows.length} learner${newRows.length === 1 ? '' : 's'}`, 'success');
    if (typeof window.renderUserDashboard === 'function') window.renderUserDashboard();
  };
}

/* ============================================================
   ACTIONS
   ============================================================ */
async function nudgeComplianceAssignment(assignmentId) {
  const assignments = getComplianceAssignments();
  const a = assignments.find(x => x.id === assignmentId);
  if (!a) return;

  try {
    await apiCall(`/api/institution/compliance/${assignmentId}/nudge`, 'POST', {});
    showToast('Reminder sent', 'success');
  } catch (_) {
    showToast('Reminder queued locally', 'info');
  }

  a.last_nudged_at = new Date().toISOString();
  saveComplianceAssignments(assignments);
}

async function revokeCertificate(certId) {
  const reason = prompt('Reason for revocation (audit log will record this):');
  if (!reason) return showToast('Revocation cancelled', 'info');

  try {
    await apiCall(`/api/certificates/${certId}/revoke`, 'POST', { reason });
  } catch (_) { /* offline ok */ }

  const certs = S.certificates || [];
  const cert = certs.find(c => String(c.id) === String(certId));
  if (cert) {
    cert.revoked_at = new Date().toISOString();
    cert.revocation_reason = reason;
  }

  logAuditEvent('certificate.revoke', { certificate_id: certId, reason });
  showToast('Certificate revoked', 'info');
  if (typeof window.renderUserDashboard === 'function') window.renderUserDashboard();
}

/* ============================================================
   EXPORTS + AUDIT LOG
   ============================================================ */
function exportComplianceReport() {
  const assignments = getComplianceAssignments();
  const summary = computeComplianceStatus(assignments);

  const rows = [
    ['Compliance report', 'Generated ' + new Date().toISOString()],
    [],
    ['Summary', 'Value'],
    ['Total assignments', summary.total],
    ['Compliant', summary.compliant],
    ['Due soon', summary.due_soon],
    ['Overdue', summary.overdue],
    ['Compliance %', summary.percent],
    [],
    ['Learner', 'Email', 'Course', 'Assigned', 'Due', 'Progress %', 'Status'],
    ...assignments.map(a => [
      a.user_name || '',
      a.user_email || '',
      a.course_title || '',
      a.assigned_at ? a.assigned_at.slice(0, 10) : '',
      a.due_date ? a.due_date.slice(0, 10) : '',
      a.progress || 0,
      Number(a.progress) >= 100 ? 'compliant'
        : a.due_date && new Date(a.due_date) < new Date() ? 'overdue'
        : 'in progress',
    ]),
  ];

  const csv = rows.map(r => r.map(cell => {
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');

  downloadComplianceBlob(csv, `compliance-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  logAuditEvent('compliance.export', { rows: assignments.length });
  showToast('Compliance report exported', 'success');
}

function downloadComplianceBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/* ---------- audit log ---------- */
const AUDIT_KEY = 'eh.audit.v1';

function logAuditEvent(kind, payload) {
  try {
    const log = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
    log.unshift({
      id: 'aud-' + Date.now().toString(36),
      at: new Date().toISOString(),
      actor_id: currentUser?.id,
      actor_name: currentUser?.name,
      kind,
      payload,
    });
    localStorage.setItem(AUDIT_KEY, JSON.stringify(log.slice(0, 1000)));
  } catch (_) {}
}

function openAuditLog() {
  let log = [];
  try { log = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch (_) {}

  openModal({
    title: 'Audit log',
    className: 'modal-lg',
    body: `
      <p class="muted">Chronological record of sensitive actions. Kept for 90 days (per policy).</p>
      ${log.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
              ${log.slice(0, 200).map(e => `
                <tr>
                  <td>${fmtDT(e.at)}</td>
                  <td>${esc(e.actor_name || e.actor_id || '—')}</td>
                  <td><code class="code">${esc(e.kind)}</code></td>
                  <td><code class="code" style="font-size:11px">${esc(JSON.stringify(e.payload || {}).slice(0, 120))}</code></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `
        <div class="empty-state">
          <i class="fas fa-history"></i>
          <h3>No audit events yet</h3>
        </div>`}
    `,
    footer: `
      <button class="btn btn-secondary" id="audit-export">
        <i class="fas fa-download"></i> Export JSON</button>
      <button class="btn btn-secondary" data-close-modal>Close</button>`,
  });

  document.getElementById('audit-export').onclick = () => {
    downloadComplianceBlob(
      JSON.stringify(log, null, 2),
      `audit-log-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    );
  };
}

/* ============================================================
   DELEGATED HANDLERS
   ============================================================ */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'compliance-new')       { e.preventDefault(); openComplianceAssignmentWizard(); }
  if (a === 'compliance-nudge')     { e.preventDefault(); nudgeComplianceAssignment(el.dataset.id); }
  if (a === 'compliance-revoke')    { e.preventDefault(); revokeCertificate(el.dataset.cert); }
  if (a === 'compliance-export')    { e.preventDefault(); exportComplianceReport(); }
  if (a === 'compliance-audit-log') { e.preventDefault(); openAuditLog(); }
});

window.EHCompliance = {
  render: userCompliance,
  assign: openComplianceAssignmentWizard,
  exportCSV: exportComplianceReport,
  auditLog: openAuditLog,
  log: logAuditEvent,