/* ============================================================
   ExpertHub 2.0 — Instructors (Workforce Management)
   Onboarding, qualifications & document verification, availability,
   workload, contracts, evaluations, payments, professional
   development, replacement workflows.
   ============================================================ */

function instInstructors() {
  const list = S.instructors || [];
  const f = S.filters.instructors = S.filters.instructors || {};
  const statusFilter = f.status || '';
  const q = (f.q || '').toLowerCase();

  const filtered = list
    .filter(i => !statusFilter || (i.status || 'active') === statusFilter)
    .filter(i => !q ||
      (i.name || '').toLowerCase().includes(q) ||
      (i.specialization || '').toLowerCase().includes(q));

  const canWrite = hasInstitutionPermission('instructors:write');

  const stats = {
    total: list.length,
    active: list.filter(i => (i.status || 'active') === 'active').length,
    verified: list.filter(i => i.documents_verified).length,
    pendingDocs: list.filter(i => !i.documents_verified).length,
  };

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Instructors</span></div>
    <section class="page-header">
      <h1 class="page-title">Instructors</h1>
      <div class="page-actions">
        <input type="search" id="instructors-q" class="form-input"
               placeholder="Search instructors..." value="${esc(f.q || '')}" style="max-width:200px" />
        <select id="instructors-status" class="form-select" style="max-width:150px">
          <option value="">All statuses</option>
          ${['active','on_leave','inactive'].map(s =>
            `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${capitalize(s.replace('_',' '))}</option>`).join('')}
        </select>
        <button class="btn btn-secondary" data-action="export-instructors">
          <i class="fas fa-download"></i> Export</button>
        ${canWrite ? `
          <button class="btn btn-primary" data-action="assign-instructor">
            <i class="fas fa-plus"></i> Add Instructor</button>` : ''}
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Total', stats.total, '', 'fa-user-tie', 'blue')}
      ${statCard('Active', stats.active, '', 'fa-check', 'green')}
      ${statCard('Documents Verified', stats.verified, '', 'fa-shield-halved', 'purple')}
      ${statCard('Pending Verification', stats.pendingDocs, '', 'fa-clock', 'yellow')}
    </section>

    <section class="card-grid">
      ${filtered.map(i => renderInstructorCard(i, canWrite)).join('') ||
        renderEmptyState({
          icon: 'fa-user-tie',
          title: 'No instructors match your filters',
          description: canWrite ? 'Add instructors to start assigning them to programmes.' : 'Instructors will appear here.',
          actionLabel: canWrite ? '+ Add Instructor' : '',
          actionAttrs: canWrite ? 'data-action="assign-instructor"' : '',
        })}
    </section>
  `;
}

function renderInstructorCard(i, canWrite) {
  const programmes = safeNum(i.programme_count);
  const sessions = safeNum(i.sessions_count);
  const rating = i.average_rating != null ? Number(i.average_rating).toFixed(1) : '—';
  const workload = safeNum(i.workload_pct);
  const nextAvailable = i.next_available_at ? fmtDate(i.next_available_at) : '—';

  return `
    <article class="expert-card">
      <img class="expert-avatar" src="${avatar(i)}" alt="" />
      <h4 class="expert-name">
        ${esc(i.name || '')}
        ${i.documents_verified
          ? '<span class="badge-verified-sm" title="Documents verified"><i class="fas fa-check-circle"></i></span>'
          : '<span class="chip chip-yellow" style="font-size:.6rem;margin-left:4px">Pending docs</span>'}
      </h4>
      <p class="expert-expertise">${esc(i.specialization || '—')}</p>
      <p class="expert-rate">
        ${i.hourly_rate != null ? fmtCur(i.hourly_rate) + '/hr' : '—'}
        <span class="chip chip-neutral" style="margin-left:4px;font-size:.7rem">${esc(i.employment_type || 'contract')}</span>
      </p>
      <p style="font-size:.8rem;color:var(--text-muted)">
        <i class="fas fa-star" style="color:#f59e0b"></i> ${rating}
        · ${programmes} programme${programmes === 1 ? '' : 's'}
        · ${sessions} session${sessions === 1 ? '' : 's'}
      </p>
      ${workload ? `
        <div class="progress-bar" style="margin-top:6px">
          <span style="width:${Math.min(100, workload)}%"></span>
        </div>
        <small style="color:var(--text-muted)">${workload}% workload · next free ${nextAvailable}</small>` : ''}

      <div style="display:flex;gap:4px;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" data-action="view-instructor" data-id="${i.id}">
          <i class="fas fa-eye"></i> View</button>
        ${canWrite ? `
          <button class="btn btn-secondary btn-sm" data-action="instructor-qualifications" data-id="${i.id}"
                  title="Qualifications & documents"><i class="fas fa-file-shield"></i></button>
          <button class="btn btn-secondary btn-sm" data-action="instructor-availability" data-id="${i.id}"
                  title="Availability calendar"><i class="fas fa-calendar"></i></button>
          <button class="btn btn-secondary btn-sm" data-action="instructor-workload" data-id="${i.id}"
                  title="Workload distribution"><i class="fas fa-chart-simple"></i></button>
          <button class="btn btn-info btn-sm" data-action="instructor-contracts" data-id="${i.id}"
                  title="Contracts"><i class="fas fa-file-signature"></i></button>
          <button class="btn btn-secondary btn-sm" data-action="instructor-evaluations" data-id="${i.id}"
                  title="Performance evaluations"><i class="fas fa-star-half-stroke"></i></button>
          <button class="btn btn-secondary btn-sm" data-action="instructor-payments" data-id="${i.id}"
                  title="Payment records"><i class="fas fa-dollar-sign"></i></button>
          <button class="btn btn-secondary btn-sm" data-action="instructor-cpd" data-id="${i.id}"
                  title="Professional development"><i class="fas fa-graduation-cap"></i></button>
          <button class="btn btn-warning btn-sm" data-action="instructor-replacement" data-id="${i.id}"
                  title="Replacement workflow"><i class="fas fa-arrows-rotate"></i></button>
        ` : ''}
      </div>
    </article>`;
}
