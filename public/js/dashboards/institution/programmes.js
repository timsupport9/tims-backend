/* ============================================================
   ExpertHub 2.0 — Institution Programmes (Advanced)
   Adds: duplication, version history, approval workflow,
   prerequisites, learning outcomes, pricing, capacity management,
   programme evaluations, archived programmes, multi-campus assignment.
   ============================================================ */

function instProgrammes() {
  /* ── Filter persistence ─────────────────────────────────── */
  const f = S.filters.programmes = S.filters.programmes || {};
  const q            = (f.q || '').trim();
  const statusFilter = f.status || '';
  const categoryFilter = f.category || '';
  const campusFilter = f.campus || '';
  const lifecycleTab = f.tab || 'active';   // active | pending | draft | archived | all

  /* ── Source list ────────────────────────────────────────── */
  let list = (S.programmes || []).slice();

  if (lifecycleTab === 'active')   list = list.filter(p => p.status === 'active');
  if (lifecycleTab === 'pending')  list = list.filter(p => p.status === 'pending_approval');
  if (lifecycleTab === 'draft')    list = list.filter(p => p.status === 'draft');
  if (lifecycleTab === 'archived') list = list.filter(p => ['archived','completed'].includes(p.status));

  if (q) {
    const needle = q.toLowerCase();
    list = list.filter(p =>
      (p.title || '').toLowerCase().includes(needle) ||
      (p.description || '').toLowerCase().includes(needle) ||
      (p.code || '').toLowerCase().includes(needle)
    );
  }
  if (statusFilter) list = list.filter(p => p.status === statusFilter);
  if (categoryFilter) list = list.filter(p => p.category === categoryFilter);
  if (campusFilter) list = list.filter(p =>
    (p.campus_ids || []).map(String).includes(String(campusFilter)) ||
    p.campus_id === campusFilter
  );

  list = sortBy(list, p => p.title || '', 'asc');
  const { rows, total, currentPage, perPage } = paginateList(list, 'institutionProgrammes');

  /* ── Counts for tab badges ──────────────────────────────── */
  const all = S.programmes || [];
  const counts = {
    active:   all.filter(p => p.status === 'active').length,
    pending:  all.filter(p => p.status === 'pending_approval').length,
    draft:    all.filter(p => p.status === 'draft').length,
    archived: all.filter(p => ['archived','completed'].includes(p.status)).length,
    all:      all.length,
  };

  const canWrite = hasInstitutionPermission('programmes:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Programmes</span></div>
    <section class="page-header">
      <h1 class="page-title">Training Programmes</h1>
      <div class="page-actions">
        <input type="search" id="programmes-q" class="form-input"
               placeholder="Search title, code, description..."
               value="${esc(q)}" style="max-width:240px" />
        <select id="programmes-category" class="form-select" style="max-width:180px">
          <option value="">All categories</option>
          ${CONFIG.PROGRAMME_CATEGORIES.map(c =>
            `<option value="${c}" ${categoryFilter === c ? 'selected' : ''}>${capitalize(c.replace(/_/g, ' '))}</option>`).join('')}
        </select>
        ${(S.campuses || []).length ? `
          <select id="programmes-campus" class="form-select" style="max-width:180px">
            <option value="">All campuses</option>
            ${S.campuses.map(c =>
              `<option value="${c.id}" ${String(campusFilter) === String(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>` : ''}
        <button class="btn btn-secondary" data-action="export-programmes">
          <i class="fas fa-download"></i> Export</button>
        ${canWrite ? `
          <button class="btn btn-primary" data-action="create-programme">
            <i class="fas fa-plus"></i> New Programme</button>` : ''}
      </div>
    </section>

    <!-- Lifecycle tabs -->
    <section class="panel" style="padding:0;border:none;background:transparent">
      <nav class="tab-bar" style="display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:16px;flex-wrap:wrap">
        ${[
          ['active',   'Active',    counts.active,   'fa-play-circle'],
          ['pending',  'Pending',   counts.pending,  'fa-clock'],
          ['draft',    'Drafts',    counts.draft,    'fa-pen-ruler'],
          ['archived', 'Archived',  counts.archived, 'fa-box-archive'],
          ['all',      'All',       counts.all,      'fa-list'],
        ].map(([key, label, count, icon]) => `
          <button class="tab-btn ${lifecycleTab === key ? 'tab-active' : ''}"
                  data-action="programmes-set-tab" data-tab="${key}"
                  style="padding:8px 14px;background:none;border:none;border-bottom:2px solid ${lifecycleTab === key ? 'var(--brand)' : 'transparent'};cursor:pointer;font-weight:${lifecycleTab === key ? 600 : 400};color:${lifecycleTab === key ? 'var(--brand)' : 'var(--text-soft)'}">
            <i class="fas ${icon}"></i> ${label}
            <span class="chip chip-neutral" style="margin-left:4px;font-size:.7rem">${count}</span>
          </button>
        `).join('')}
      </nav>
    </section>

    ${rows.length ? `
      <section class="card-grid">
        ${rows.map(p => renderProgrammeCard(p, canWrite)).join('')}
      </section>

      ${paginationBar('institutionProgrammes', currentPage, perPage, total)}
    ` : renderEmptyState({
          icon: 'fa-diagram-project',
          title: lifecycleTab === 'active' ? 'No active programmes'
              : lifecycleTab === 'pending' ? 'No programmes awaiting approval'
              : lifecycleTab === 'draft' ? 'No drafts'
              : lifecycleTab === 'archived' ? 'No archived programmes'
              : 'No programmes match your filters',
          description: canWrite
            ? 'Create your first training programme to get started.'
            : 'Programmes created by your team will appear here.',
          actionLabel: canWrite ? '+ Create Programme' : '',
          actionAttrs: canWrite ? 'data-action="create-programme"' : '',
        })}
  `;
}

/* ── Single programme card (all expansion data visible) ───── */
function renderProgrammeCard(p, canWrite) {
  const enrolled = safeNum(p.enrolled_count);
  const capacity = safeNum(p.capacity);
  const utilPct  = capacity ? pctOf(enrolled, capacity) : 0;
  const approvals = (p.approval_steps || []).filter(s => s.status === 'pending').length;

  const categoryLabel = capitalize((p.category || 'general').replace(/_/g, ' '));
  const prerequisites = Array.isArray(p.prerequisites) ? p.prerequisites : [];
  const outcomes = Array.isArray(p.learning_outcomes) ? p.learning_outcomes : [];
  const evalCount = safeNum(p.evaluation_count);
  const avgRating = p.avg_rating != null ? Number(p.avg_rating).toFixed(1) : null;
  const versionCount = safeNum(p.version_count, 1);
  const campusNames = (p.campus_names || []).filter(Boolean);

  return `
    <article class="program-card">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center">
        <span class="chip chip-blue">${esc(categoryLabel)}</span>
        <span class="${statusClass(p.status)}">${esc((p.status || '').replace(/_/g, ' '))}</span>
        ${p.code ? `<span class="chip chip-neutral" title="Programme code"><code>${esc(p.code)}</code></span>` : ''}
        ${versionCount > 1 ? `
          <span class="chip chip-neutral" title="${versionCount} versions"
                data-action="programme-versions" data-id="${p.id}"
                style="cursor:pointer">
            <i class="fas fa-code-branch"></i> v${versionCount}
          </span>` : ''}
        ${approvals ? `<span class="chip chip-yellow" title="${approvals} pending approval${approvals > 1 ? 's' : ''}">
            <i class="fas fa-clock"></i> ${approvals}
          </span>` : ''}
      </div>

      <h4 class="program-title">${esc(p.title || '')}</h4>
      <p class="program-desc">${esc(truncate(p.description || '', 130))}</p>

      ${pricing}
      ${p.price != null ? `
        <p class="program-meta" style="color:var(--accent)">
          <i class="fas fa-tag"></i> ${fmtCur(p.price)}
          ${p.cost_per_seat != null ? ` · ${fmtCur(p.cost_per_seat)}/seat` : ''}
        </p>` : ''}

      ${prerequisites.length ? `
        <p class="program-meta" style="color:var(--warning-dark)">
          <i class="fas fa-lock"></i>
          ${prerequisites.length} prerequisite${prerequisites.length > 1 ? 's' : ''}:
          ${prerequisites.slice(0, 2).map(x => esc(x.title || x.programme_title || 'Programme')).join(', ')}
          ${prerequisites.length > 2 ? ` +${prerequisites.length - 2} more` : ''}
        </p>` : ''}

      ${outcomes.length ? `
        <p class="program-meta">
          <i class="fas fa-bullseye"></i> ${outcomes.length} learning outcome${outcomes.length > 1 ? 's' : ''}
        </p>` : ''}

      ${campusNames.length ? `
        <p class="program-meta">
          <i class="fas fa-building"></i> ${campusNames.slice(0, 3).join(', ')}
          ${campusNames.length > 3 ? ` +${campusNames.length - 3}` : ''}
        </p>` : ''}

      ${evalCount ? `
        <p class="program-meta">
          <i class="fas fa-star" style="color:#f59e0b"></i>
          ${avgRating || '—'} / 5 from ${evalCount} evaluation${evalCount > 1 ? 's' : ''}
        </p>` : ''}

      <footer class="program-footer">
        <span class="program-meta">${fmtDate(p.start_date)} → ${fmtDate(p.end_date)}</span>
        <span class="program-meta">${enrolled} of ${capacity || '—'} enrolled</span>
      </footer>

      ${capacity ? `
        <div class="progress-bar" style="margin-top:6px">
          <span style="width:${utilPct}%;background:${utilPct >= 95 ? '#dc2626' : utilPct >= 80 ? '#f59e0b' : 'var(--accent)'}"></span>
        </div>
        <small style="color:var(--text-muted)">${utilPct}% capacity utilised</small>` : ''}

      <div class="panel-actions" style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" data-action="view-programme" data-id="${p.id}">
          <i class="fas fa-eye"></i> View</button>
        ${canWrite ? `
          <button class="btn btn-info btn-sm" data-action="edit-programme" data-id="${p.id}">
            <i class="fas fa-pen"></i> Edit</button>
          <button class="btn btn-primary btn-sm" data-action="programme-curriculum" data-id="${p.id}">
            <i class="fas fa-list"></i> Curriculum</button>
          <button class="btn btn-secondary btn-sm" data-action="duplicate-programme" data-id="${p.id}"
                  title="Duplicate this programme">
            <i class="fas fa-copy"></i></button>
          ${p.status === 'draft' ? `
            <button class="btn btn-success btn-sm" data-action="submit-programme-approval" data-id="${p.id}"
                    title="Submit for approval">
              <i class="fas fa-paper-plane"></i></button>` : ''}
          ${p.status === 'archived' ? `
            <button class="btn btn-info btn-sm" data-action="restore-programme" data-id="${p.id}">
              <i class="fas fa-undo"></i></button>` : `
            <button class="btn btn-warning btn-sm" data-action="archive-programme" data-id="${p.id}"
                    title="Archive this programme">
              <i class="fas fa-box-archive"></i></button>`}
          <button class="btn btn-secondary btn-sm" data-action="programme-evaluations" data-id="${p.id}"
                  title="View evaluations">
            <i class="fas fa-star-half-stroke"></i></button>
          <button class="btn btn-danger btn-sm" data-action="delete-programme" data-id="${p.id}"
                  title="Delete programme">
            <i class="fas fa-trash"></i></button>
        ` : ''}
      </div>
    </article>`;
}
