/* ============================================================
   Institution — Campuses & Branches
   ============================================================ */
function instCampuses() {
  const campuses = S.campuses || [];
  const activeCampus = S.activeCampusId ? campuses.find(c => c.id === S.activeCampusId) : null;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Campuses & Branches</span></div>
    <section class="page-header">
      <h1 class="page-title">Campuses & Branches</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-campus">
          <i class="fas fa-plus"></i> New Campus</button>
      </div>
    </section>

    ${activeCampus ? `
      <div class="alert alert-info" style="justify-content:space-between">
        <span>Filtering by: <strong>${esc(activeCampus.name)}</strong></span>
        <button class="btn btn-secondary btn-sm" data-action="clear-campus-filter">Clear Filter</button>
      </div>` : ''}

    <section class="stat-grid">
      ${statCard('Total Campuses', campuses.length, '', 'fa-building', 'blue')}
      ${statCard('Active', campuses.filter(c => c.status === 'active').length, '', 'fa-check', 'green')}
      ${statCard('Trainees Across All',
        campuses.reduce((s, c) => s + Number(c.trainee_count || 0), 0), '', 'fa-users', 'purple')}
      ${statCard('Headcount Capacity',
        campuses.reduce((s, c) => s + Number(c.capacity || 0), 0), '', 'fa-chair', 'yellow')}
    </section>

    <section class="card-grid">
      ${campuses.map(c => {
        const util = pctOf(c.trainee_count || 0, c.capacity || 1);
        return `
          <article class="program-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
              <div>
                <span class="chip chip-neutral">${esc(c.type || 'main')}</span>
                <span class="${statusClass(c.status || 'active')}" style="margin-left:6px">${esc(c.status || 'active')}</span>
              </div>
              ${c.is_main ? '<span class="chip chip-blue">Main</span>' : ''}
            </div>
            <h4 class="program-title">${esc(c.name)}</h4>
            <p class="program-desc">${esc(c.address || 'No address on file')}</p>
            <p class="program-meta">
              <i class="fas fa-user-tie"></i> ${esc(c.manager_name || 'Unassigned')} ·
              ${esc(c.contact_phone || 'No phone')}
            </p>
            <div class="program-footer" style="flex-direction:column;align-items:stretch;gap:6px">
              <div>
                <div class="progress-bar"><span style="width:${util}%"></span></div>
                <small>${c.trainee_count || 0} of ${c.capacity || 0} seats filled (${util}%)</small>
              </div>
              <div class="panel-actions" style="display:flex;gap:6px;margin-top:8px">
                <button class="btn btn-secondary btn-sm" data-action="edit-campus" data-id="${c.id}">
                  <i class="fas fa-pen"></i> Edit</button>
                <button class="btn btn-info btn-sm" data-action="view-campus-trainees" data-id="${c.id}">
                  <i class="fas fa-users"></i> Trainees</button>
                <button class="btn btn-danger btn-sm" data-action="delete-campus" data-id="${c.id}">
                  <i class="fas fa-trash"></i></button>
              </div>
            </div>
          </article>`;
      }).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-building"></i>
          <h3>No campuses configured</h3>
          <p>Add your first campus or branch to organize trainees geographically.</p>
          <button class="btn btn-primary" data-action="create-campus">
            <i class="fas fa-plus"></i> Create Campus</button>
        </div>`}
    </section>

    <section class="panel">
      <h3 class="panel-title">Campus Comparison</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Campus</th><th>Type</th><th>Manager</th>
            <th>Trainees</th><th>Programmes</th><th>Sessions/Month</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${campuses.map(c => `
              <tr>
                <td>${esc(c.name)}</td>
                <td><span class="chip chip-neutral">${esc(c.type || 'main')}</span></td>
                <td>${esc(c.manager_name || '—')}</td>
                <td>${c.trainee_count || 0}</td>
                <td>${c.programme_count || 0}</td>
                <td>${c.sessions_per_month || 0}</td>
                <td><span class="${statusClass(c.status || 'active')}">${esc(c.status || 'active')}</span></td>
              </tr>`).join('') ||
              '<tr><td colspan="7" class="empty-row">No campuses registered</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
