/* ============================================================
   Institution — Programmes
   ============================================================ */
function instProgrammes() {
  const q = ($('#programmes-q')?.value || '').toLowerCase();
  const statusFilter = $('#programmes-status')?.value || '';
  let list = S.programmes.slice();
  if (q) list = list.filter(p => (p.title || '').toLowerCase().includes(q));
  if (statusFilter) list = list.filter(p => p.status === statusFilter);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Programmes</span></div>
    <section class="page-header">
      <h1 class="page-title">Training Programmes</h1>
      <div class="page-actions">
        <input type="search" id="programmes-q" class="form-input"
               placeholder="Search..." value="${esc(q)}" style="max-width:200px" />
        <select id="programmes-status" class="form-select" style="max-width:150px">
          <option value="">All statuses</option>
          ${CONFIG.PROGRAMME_STATUSES.map(s =>
            `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <button class="btn btn-primary" data-action="create-programme">
          <i class="fas fa-plus"></i> New Programme</button>
      </div>
    </section>

    <section class="card-grid">
      ${list.map(p => `
        <article class="program-card">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
            <span class="chip chip-blue">${esc(p.category || 'General')}</span>
            <span class="${statusClass(p.status)}">${esc(p.status)}</span>
          </div>
          <h4 class="program-title">${esc(p.title || '')}</h4>
          <p class="program-desc">${esc((p.description || '').slice(0, 130))}</p>
          ${p.prerequisite_title ? `
            <p class="program-meta" style="color:var(--warning-dark)">
              <i class="fas fa-lock"></i> Requires: ${esc(p.prerequisite_title)}</p>` : ''}
          <footer class="program-footer">
            <span class="program-meta">${fmtDate(p.start_date)} to ${fmtDate(p.end_date)}</span>
            <span class="program-meta">${p.enrolled_count || 0} of ${p.capacity || 0} enrolled</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" data-action="view-programme" data-id="${p.id}">
              <i class="fas fa-eye"></i> View</button>
            <button class="btn btn-info btn-sm" data-action="edit-programme" data-id="${p.id}">
              <i class="fas fa-pen"></i> Edit</button>
            <button class="btn btn-primary btn-sm" data-action="programme-curriculum" data-id="${p.id}">
              <i class="fas fa-list"></i> Curriculum</button>
            <button class="btn btn-danger btn-sm" data-action="delete-programme" data-id="${p.id}">
              <i class="fas fa-trash"></i></button>
          </div>
        </article>`).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-diagram-project"></i>
          <h3>No programmes yet</h3>
          <p>Create your first training programme to get started.</p>
          <button class="btn btn-primary" data-action="create-programme">
            <i class="fas fa-plus"></i> Create Programme</button>
        </div>`}
    </section>
  `;
}
