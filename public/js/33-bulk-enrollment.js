/* ============================================================
   ExpertHub 2.0 — 33-bulk-enrollment.js
   CSV-driven bulk enrollment wizard, seat pool management,
   transfer + revoke with audit trail.
   ============================================================ */

function openBulkEnrollmentWizard() {
  const wizard = { step: 'upload', csv: '', rows: [], mapping: {}, errors: [] };
  window.__ehBulkWizard = wizard;

  openModal({
    title: 'Bulk enroll learners',
    className: 'modal-lg',
    body: `<div id="bulk-host"></div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });

  renderBulkStep();
}

function renderBulkStep() {
  const w = window.__ehBulkWizard;
  const host = document.getElementById('bulk-host');
  if (!host) return;

  const steps = ['Upload CSV', 'Map columns', 'Preview', 'Import'];
  host.innerHTML = `
    <nav class="wizard-steps">
      ${steps.map((s, i) => {
        const idx = ['upload','map','preview','import'][i];
        const state = idx === w.step ? 'active'
          : steps.indexOf(w.step) > i ? 'done' : '';
        return `<div class="wizard-step ${state}">
          <span class="wizard-step-num">${i + 1}</span>
          <span>${s}</span></div>`;
      }).join('')}
    </nav>
    <div class="wizard-body">${renderBulkStepBody()}</div>`;

  bindBulkStepEvents();
}

function renderBulkStepBody() {
  const w = window.__ehBulkWizard;
  switch (w.step) {
    case 'upload':  return renderBulkUpload();
    case 'map':     return renderBulkMapping();
    case 'preview': return renderBulkPreview();
    case 'import':  return renderBulkImporting();
    default:        return '';
  }
}

function renderBulkUpload() {
  return `
    <p class="muted">Upload a CSV with one learner per row. At minimum, include an
      <strong>email</strong> column and either a <strong>course_id</strong> or
      <strong>course_title</strong> column.</p>
    <label class="bulk-dropzone" for="bulk-file">
      <i class="fas fa-cloud-upload-alt"></i>
      <strong>Drop CSV here or click to browse</strong>
      <span class="muted">Max 5 MB · UTF-8 · commas</span>
      <input id="bulk-file" type="file" accept=".csv,text/csv" hidden />
    </label>
    <details style="margin-top:16px">
      <summary>Or paste CSV</summary>
      <textarea id="bulk-paste" class="form-textarea" rows="6"
                placeholder="email,course_title,cohort&#10;alice@acme.edu,Intro to Python,Q1-2026"
                style="margin-top:8px"></textarea>
      <button class="btn btn-primary btn-sm" id="bulk-paste-btn" style="margin-top:8px">
        <i class="fas fa-arrow-right"></i> Parse pasted CSV</button>
    </details>
    <div class="panel-actions" style="margin-top:16px">
      <a class="btn btn-secondary btn-sm" href="#" id="bulk-template">
        <i class="fas fa-download"></i> Download template</a>
    </div>`;
}

function renderBulkMapping() {
  const w = window.__ehBulkWizard;
  const headers = w.rows.length ? Object.keys(w.rows[0]) : [];
  const targets = [
    { key: '',            label: '— Ignore —' },
    { key: 'email',       label: 'Email (required)' },
    { key: 'name',        label: 'Full name' },
    { key: 'course_id',   label: 'Course ID' },
    { key: 'course_title',label: 'Course title' },
    { key: 'cohort',      label: 'Cohort / department' },
    { key: 'due_date',    label: 'Due date' },
    { key: 'role',        label: 'Role' },
  ];

  return `
    <p class="muted">Tell us which column in your CSV maps to each field.</p>
    <div class="bulk-map-grid">
      ${headers.map(h => `
        <div class="bulk-map-row">
          <div class="bulk-map-source">
            <code class="code">${esc(h)}</code>
            <div class="bulk-map-sample">${esc(String(w.rows[0]?.[h] ?? ''))}</div>
          </div>
          <i class="fas fa-arrow-right"></i>
          <select class="form-select" data-bulk-map="${esc(h)}">
            ${targets.map(t => `
              <option value="${t.key}" ${w.mapping[h] === t.key ? 'selected' : ''}>
                ${esc(t.label)}</option>`).join('')}
          </select>
        </div>`).join('')}
    </div>
    <div class="panel-actions" style="margin-top:16px">
      <button class="btn btn-secondary" id="bulk-back">Back</button>
      <button class="btn btn-primary" id="bulk-next-map">
        Continue <i class="fas fa-arrow-right"></i></button>
    </div>`;
}

function renderBulkPreview() {
  const w = window.__ehBulkWizard;
  const errors = w.errors || [];
  const good = w.rows.length - errors.length;
  return `
    <div class="alert ${errors.length ? 'alert-warning' : 'alert-info'}">
      <i class="fas fa-info-circle"></i>
      <div>
        <strong>${good}</strong> valid row${good === 1 ? '' : 's'} ready to import.
        ${errors.length ? `<strong>${errors.length}</strong> row${errors.length === 1 ? '' : 's'} will be skipped.` : ''}
      </div>
    </div>

    ${errors.length ? `
      <details class="bulk-errors" open>
        <summary>Rows with issues</summary>
        <ul>
          ${errors.slice(0, 20).map(e => `
            <li><strong>Row ${e.row}:</strong> ${esc(e.message)}</li>`).join('')}
          ${errors.length > 20 ? `<li>… and ${errors.length - 20} more</li>` : ''}
        </ul>
      </details>` : ''}

    <h4 class="panel-title" style="margin-top:16px">Preview (first 20 rows)</h4>
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Email</th><th>Name</th><th>Course</th><th>Cohort</th><th>Due</th>
          </tr>
        </thead>
        <tbody>
          ${w.normalized?.slice(0, 20).map(r => `
            <tr>
              <td>${esc(r.email || '')}</td>
              <td>${esc(r.name || '')}</td>
              <td>${esc(r.course_title || r.course_id || '')}</td>
              <td>${esc(r.cohort || '')}</td>
              <td>${esc(r.due_date || '')}</td>
            </tr>`).join('') || '<tr><td colspan="5" class="empty-row">Nothing to preview</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="panel-actions" style="margin-top:16px">
      <button class="btn btn-secondary" id="bulk-back">Back</button>
      <button class="btn btn-primary" id="bulk-start-import" ${good ? '' : 'disabled'}>
        <i class="fas fa-upload"></i> Import ${good} row${good === 1 ? '' : 's'}</button>
    </div>`;
}

function renderBulkImporting() {
  const w = window.__ehBulkWizard;
  const total = w.normalized?.length || 0;
  const done = w.imported || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `
    <div class="bulk-progress">
      <div class="progress-bar"><span style="width:${pct}%"></span></div>
      <p class="muted">Imported ${done} of ${total}…</p>
      ${w.failures?.length ? `
        <details style="margin-top:12px">
          <summary>${w.failures.length} failure${w.failures.length === 1 ? '' : 's'}</summary>
          <ul>
            ${w.failures.slice(0, 20).map(f => `<li>Row ${f.row}: ${esc(f.message)}</li>`).join('')}
          </ul>
        </details>` : ''}
    </div>`;
}

/* ============================================================
   CSV PARSING (RFC 4180-ish)
   ============================================================ */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };

  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      field += ch; i += 1; continue;
    }
    if (ch === '"') { inQuotes = true; i += 1; continue; }
    if (ch === ',') { pushField(); i += 1; continue; }
    if (ch === '\r') { i += 1; continue; }
    if (ch === '\n') { pushField(); pushRow(); i += 1; continue; }
    field += ch; i += 1;
  }
  // Flush
  if (field.length || row.length) { pushField(); pushRow(); }

  if (!rows.length) return { headers: [], objects: [] };
  const headers = rows[0].map(h => h.trim());
  const objects = rows.slice(1)
    .filter(r => r.some(cell => String(cell).trim() !== ''))
    .map(r => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
      return obj;
    });
  return { headers, objects };
}

/* ============================================================
   AUTO MAPPING HEURISTICS
   ============================================================ */
function autoMap(headers) {
  const map = {};
  const rules = [
    { key: 'email',        re: /e-?mail/i },
    { key: 'name',         re: /(full ?name|^name$|learner)/i },
    { key: 'course_id',    re: /course[ _-]?id/i },
    { key: 'course_title', re: /(course[ _-]?(title|name)|title)/i },
    { key: 'cohort',       re: /(cohort|department|group|team)/i },
    { key: 'due_date',     re: /(due|deadline)/i },
    { key: 'role',         re: /(role|position|job)/i },
  ];
  headers.forEach(h => {
    const match = rules.find(r => r.re.test(h));
    if (match) map[h] = match.key;
  });
  return map;
}

/* ============================================================
   VALIDATION
   ============================================================ */
function validateBulkRows(rows, mapping) {
  const normalized = [];
  const errors = [];

  rows.forEach((row, idx) => {
    const out = {};
    Object.entries(mapping).forEach(([src, target]) => {
      if (!target) return;
      out[target] = String(row[src] ?? '').trim();
    });
    out.__row = idx + 2; // header is row 1

    if (!out.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) {
      errors.push({ row: idx + 2, message: `Invalid email: ${out.email || '(blank)'}` });
      return;
    }
    if (!out.course_id && !out.course_title) {
      errors.push({ row: idx + 2, message: 'Missing course_id or course_title' });
      return;
    }
    // Resolve course by title if needed
    if (!out.course_id && out.course_title) {
      const course = (S.courses || []).find(c =>
        String(c.title).toLowerCase() === out.course_title.toLowerCase()
      );
      if (!course) {
        errors.push({ row: idx + 2, message: `Unknown course title: ${out.course_title}` });
        return;
      }
      out.course_id = course.id;
    }
    if (out.due_date) {
      const t = Date.parse(out.due_date);
      if (isNaN(t)) {
        errors.push({ row: idx + 2, message: `Unparseable due_date: ${out.due_date}` });
        return;
      }
      out.due_date = new Date(t).toISOString();
    }
    normalized.push(out);
  });

  return { normalized, errors };
}

/* ============================================================
   IMPORT EXECUTION
   ============================================================ */
async function executeBulkImport() {
  const w = window.__ehBulkWizard;
  w.imported = 0;
  w.failures = [];
  w.step = 'import';
  renderBulkStep();

  for (let i = 0; i < w.normalized.length; i++) {
    const row = w.normalized[i];
    try {
      await apiCall('/api/institution/bulk-enroll', 'POST', row);
    } catch (err) {
      w.failures.push({ row: row.__row, message: err.message || 'Failed' });
    }
    w.imported += 1;
    if (i % 5 === 0) renderBulkStep();
  }

  renderBulkStep();
  const ok = w.imported - w.failures.length;
  showToast(`Imported ${ok} of ${w.imported}`, ok === w.imported ? 'success' : 'warning');
  window.EHNotifications?.push?.({
    kind: 'achievement',
    title: 'Bulk enrollment complete',
    body: `${ok} succeeded · ${w.failures.length} failed`,
  });

  // Refresh institution view if visible
  if (typeof window.renderInstitutionDashboard === 'function') {
    try { window.renderInstitutionDashboard(); } catch (_) {}
  }
}

/* ============================================================
   EVENT BINDING
   ============================================================ */
function bindBulkStepEvents() {
  const w = window.__ehBulkWizard;

  const file = document.getElementById('bulk-file');
  if (file) file.onchange = () => {
    const f = file.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return showToast('File too large (max 5 MB)', 'error');
    const reader = new FileReader();
    reader.onload = () => {
      const { headers, objects } = parseCSV(String(reader.result));
      if (!headers.length) return showToast('Empty or invalid CSV', 'error');
      w.rows = objects;
      w.mapping = autoMap(headers);
      w.step = 'map';
      renderBulkStep();
    };
    reader.readAsText(f, 'utf-8');
  };

  const pasteBtn = document.getElementById('bulk-paste-btn');
  if (pasteBtn) pasteBtn.onclick = () => {
    const text = document.getElementById('bulk-paste').value;
    const { headers, objects } = parseCSV(text);
    if (!headers.length) return showToast('Nothing to parse', 'error');
    w.rows = objects;
    w.mapping = autoMap(headers);
    w.step = 'map';
    renderBulkStep();
  };

  const tpl = document.getElementById('bulk-template');
  if (tpl) tpl.onclick = e => {
    e.preventDefault();
    const tplCsv = 'email,name,course_title,cohort,due_date\n'
      + 'alice@acme.edu,Alice Chen,Intro to Python,Q1-2026,2026-03-31\n'
      + 'bob@acme.edu,Bob Patel,Advanced JavaScript,Q1-2026,2026-03-31\n';
    downloadBlob(tplCsv, 'bulk-enrollment-template.csv', 'text/csv');
  };

  document.querySelectorAll('[data-bulk-map]').forEach(sel => {
    sel.onchange = () => { w.mapping[sel.dataset.bulkMap] = sel.value; };
  });

  const back = document.getElementById('bulk-back');
  if (back) back.onclick = () => {
    w.step = w.step === 'map' ? 'upload' : 'map';
    renderBulkStep();
  };

  const nextMap = document.getElementById('bulk-next-map');
  if (nextMap) nextMap.onclick = () => {
    const { normalized, errors } = validateBulkRows(w.rows, w.mapping);
    w.normalized = normalized;
    w.errors = errors;
    w.step = 'preview';
    renderBulkStep();
  };

  const start = document.getElementById('bulk-start-import');
  if (start) start.onclick = () => executeBulkImport();
}

/* ============================================================
   SEAT MANAGEMENT
   ============================================================ */
function openSeatManagement() {
  const seats = S.institution?.seats || [];
  const used = seats.filter(s => s.assigned_to).length;
  const total = seats.length;

  openModal({
    title: 'Seat management',
    className: 'modal-lg',
    body: `
      <div class="stat-grid" style="margin-bottom:16px">
        <div class="dashboard-card stat-card">
          <div class="stat-info"><p class="stat-label">Total seats</p><p class="stat-value">${total}</p></div>
          <div class="stat-icon stat-icon-blue"><i class="fas fa-chair"></i></div>
        </div>
        <div class="dashboard-card stat-card">
          <div class="stat-info"><p class="stat-label">Assigned</p><p class="stat-value">${used}</p></div>
          <div class="stat-icon stat-icon-green"><i class="fas fa-user-check"></i></div>
        </div>
        <div class="dashboard-card stat-card">
          <div class="stat-info"><p class="stat-label">Available</p><p class="stat-value">${total - used}</p></div>
          <div class="stat-icon stat-icon-yellow"><i class="fas fa-user-plus"></i></div>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Seat</th><th>Assigned to</th><th>Since</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${seats.map(s => {
              const user = s.assigned_to ? (S.institutionMembers || []).find(m => (m.id || m.user_id) === s.assigned_to) : null;
              return `
                <tr>
                  <td><code class="code">${esc(s.id || s.seat_code || '—')}</code></td>
                  <td>${user ? esc(user.name || user.email) : '<span class="muted">Unassigned</span>'}</td>
                  <td>${s.assigned_at ? fmtDate(s.assigned_at) : '—'}</td>
                  <td>
                    <span class="chip ${user ? 'chip-green' : 'chip-neutral'}">
                      ${user ? 'In use' : 'Free'}</span>
                  </td>
                  <td>
                    ${user ? `
                      <button class="btn btn-secondary btn-xs" data-action="seat-revoke" data-seat="${esc(s.id)}">
                        <i class="fas fa-undo"></i> Revoke</button>
                      <button class="btn btn-secondary btn-xs" data-action="seat-transfer" data-seat="${esc(s.id)}">
                        <i class="fas fa-exchange-alt"></i> Transfer</button>
                    ` : `
                      <button class="btn btn-primary btn-xs" data-action="seat-assign" data-seat="${esc(s.id)}">
                        <i class="fas fa-user-plus"></i> Assign</button>
                    `}
                  </td>
                </tr>`;
            }).join('') || '<tr><td colspan="5" class="empty-row">No seats provisioned</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="panel-actions" style="margin-top:16px">
        <button class="btn btn-secondary" id="seat-add">
          <i class="fas fa-plus"></i> Add seats</button>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });

  document.getElementById('seat-add').onclick = async () => {
    const count = Number(prompt('How many seats to add?', '10'));
    if (!count || count < 1) return;
    try {
      const d = await apiCall('/api/institution/seats', 'POST', { count });
      S.institution = S.institution || {};
      S.institution.seats = (S.institution.seats || []).concat(d.seats || []);
      showToast(`Added ${count} seat${count === 1 ? '' : 's'}`, 'success');
      closeModal();
      openSeatManagement();
    } catch (_) {
      showToast('Add seats failed', 'error');
    }
  };
}

async function assignSeat(seatId) {
  const email = prompt('Assign this seat to (email):');
  if (!email) return;
  try {
    await apiCall(`/api/institution/seats/${seatId}/assign`, 'POST', { email });
    showToast('Seat assigned', 'success');
    closeModal();
    openSeatManagement();
  } catch (err) {
    showToast(err.message || 'Assign failed', 'error');
  }
}

async function revokeSeat(seatId) {
  if (!confirm('Revoke this seat? The learner will lose access immediately.')) return;
  try {
    await apiCall(`/api/institution/seats/${seatId}/revoke`, 'POST', {});
    showToast('Seat revoked', 'info');
    closeModal();
    openSeatManagement();
  } catch (err) {
    showToast(err.message || 'Revoke failed', 'error');
  }
}

async function transferSeat(seatId) {
  const email = prompt('Transfer to (email):');
  if (!email) return;
  try {
    await apiCall(`/api/institution/seats/${seatId}/transfer`, 'POST', { email });
    showToast('Seat transferred', 'success');
    closeModal();
    openSeatManagement();
  } catch (err) {
    showToast(err.message || 'Transfer failed', 'error');
  }
}

/* ============================================================
   DELEGATED HANDLERS
   ============================================================ */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'inst-bulk-enroll')  { e.preventDefault(); openBulkEnrollmentWizard(); }
  if (a === 'inst-seats')        { e.preventDefault(); openSeatManagement(); }
  if (a === 'seat-assign')       { e.preventDefault(); assignSeat(el.dataset.seat); }
  if (a === 'seat-revoke')       { e.preventDefault(); revokeSeat(el.dataset.seat); }
  if (a === 'seat-transfer')     { e.preventDefault(); transferSeat(el.dataset.seat); }
});

window.EHBulkEnrollment = {
  open: openBulkEnrollmentWizard,
  seats: openSeatManagement,
  parseCSV, autoMap, validateBulkRows,