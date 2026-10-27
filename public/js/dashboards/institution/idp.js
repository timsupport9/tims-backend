/* ============================================================
   ExpertHub 2.0 — Individual Development Plans (IDP)
   Cross-links trainees.js ↔ skills.js ↔ skills-gap.js ↔ learning-paths.js.
   When a trainee needs stronger skills, an IDP recommends a learning
   path, records the goal, and tracks improvement.
   ============================================================ */

function instIDPList() {
  const plans = S.individualDevelopmentPlans || [];
  const canWrite = hasInstitutionPermission('trainees:write');

  const f = S.filters.idp = S.filters.idp || {};
  const statusFilter = f.status || '';
  const searchQuery = (f.q || '').toLowerCase();

  let list = plans.slice();
  if (statusFilter) list = list.filter(p => p.status === statusFilter);
  if (searchQuery) list = list.filter(p =>
    (p.trainee_name || '').toLowerCase().includes(searchQuery) ||
    (p.goal || '').toLowerCase().includes(searchQuery)
  );
  list = sortBy(list, p => p.updated_at || p.created_at || '', 'desc');

  const active = plans.filter(p => p.status === 'active').length;
  const completed = plans.filter(p => p.status === 'completed').length;
  const overdue = plans.filter(p =>
    p.target_date && new Date(p.target_date) < new Date() && p.status !== 'completed'
  ).length;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Individual Development Plans</span></div>
    <section class="page-header">
      <h1 class="page-title">Individual Development Plans (IDP)</h1>
      <div class="page-actions">
        <input type="search" id="idp-search" class="form-input"
               placeholder="Search plans..." value="${esc(f.q || '')}" style="max-width:220px" />
        <select id="idp-status" class="form-select" style="max-width:160px">
          <option value="">All statuses</option>
          <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active</option>
          <option value="completed" ${statusFilter === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="paused" ${statusFilter === 'paused' ? 'selected' : ''}>Paused</option>
        </select>
        <button class="btn btn-secondary" data-action="export-idp">
          <i class="fas fa-download"></i> Export</button>
        ${canWrite ? `
          <button class="btn btn-primary" data-action="create-idp">
            <i class="fas fa-plus"></i> New Plan</button>` : ''}
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-bullseye"></i>
      <div>
        An IDP connects a <strong>trainee</strong>, a <strong>skill gap</strong>, and a
        <strong>learning path</strong>. When a trainee is assessed as needing stronger skills,
        the system recommends a path, records the development goal, and tracks improvement.
      </div>
    </div>

    <section class="stat-grid">
      ${statCard('Active Plans', active, '', 'fa-bullseye', 'blue')}
      ${statCard('Completed', completed, '', 'fa-check-circle', 'green')}
      ${statCard('Overdue', overdue, '', 'fa-triangle-exclamation', overdue > 0 ? 'red' : 'yellow')}
      ${statCard('Total Plans', plans.length, '', 'fa-list-check', 'purple')}
    </section>

    <section class="panel">
      <h3 class="panel-title">Development Plans</h3>
      ${list.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Trainee</th><th>Goal</th><th>Target Skills</th>
              <th>Learning Path</th><th>Progress</th>
              <th>Target Date</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${list.map(p => {
                const progress = safeNum(p.progress);
                const skills = Array.isArray(p.target_skills) ? p.target_skills : [];
                return `
                  <tr>
                    <td>${esc(p.trainee_name || '—')}</td>
                    <td>${esc(truncate(p.goal || '', 60))}</td>
                    <td>
                      ${skills.slice(0, 3).map(s => `<span class="chip chip-neutral" style="font-size:.65rem;margin-right:3px">${esc(s)}</span>`).join('')}
                      ${skills.length > 3 ? `<span class="chip chip-neutral" style="font-size:.65rem">+${skills.length - 3}</span>` : ''}
                    </td>
                    <td>${esc(p.learning_path_title || '—')}</td>
                    <td>
                      ${renderMiniBar(progress, progress >= 75 ? '#22c55e' : progress >= 50 ? '#eab308' : '#dc2626')}
                      ${progress}%
                    </td>
                    <td>${fmtDate(p.target_date)}</td>
                    <td><span class="${statusClass(p.status || 'active')}">${esc(p.status || 'active')}</span></td>
                    <td class="actions-cell">
                      <button class="btn btn-secondary btn-xs" data-action="open-idp" data-id="${p.id}">
                        View</button>
                      ${canWrite ? `
                        <button class="btn btn-info btn-xs" data-action="edit-idp" data-id="${p.id}">
                          Edit</button>` : ''}
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>` : renderEmptyState({
              icon: 'fa-bullseye',
              title: 'No development plans yet',
              description: 'Create an IDP to connect skill gaps to targeted learning.',
              actionLabel: canWrite ? '+ New Plan' : '',
              actionAttrs: canWrite ? 'data-action="create-idp"' : '',
              compact: true,
            })}
    </section>
  `;
}
