/* ============================================================
   Institution — Instructor Marketplace
   ============================================================ */
function instMarketplace() {
  const list = S.instructorMarketplace || [];
  const contracts = S.instructorContracts || [];
  const q = ($('#market-search')?.value || '').toLowerCase();
  const filtered = q ? list.filter(x =>
    (x.name || '').toLowerCase().includes(q) ||
    (x.specialization || '').toLowerCase().includes(q)) : list;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Instructor Marketplace</span></div>
    <section class="page-header">
      <h1 class="page-title">Instructor Marketplace</h1>
      <div class="page-actions">
        <input type="search" id="market-search" class="form-input"
               placeholder="Search instructors..." value="${esc(q)}" style="max-width:260px" />
        <button class="btn btn-primary" data-action="post-instructor-request">
          <i class="fas fa-plus"></i> Post Requirement</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-people-arrows"></i>
      <div>Browse verified instructors, filter by specialization and availability,
        and hire directly with one click. Contracts include automatic rate cards and NDA templates.</div>
    </div>

    <section class="panel">
      <h3 class="panel-title">Available Instructors</h3>
      <section class="card-grid">
        ${filtered.map(i => `
          <article class="expert-card">
            <img class="expert-avatar" src="${avatar(i)}" alt="" />
            <h4 class="expert-name">
              ${esc(i.name || '')}
              ${i.verified ? '<span class="badge-verified-sm"><i class="fas fa-check-circle"></i></span>' : ''}
            </h4>
            <p class="expert-expertise">${esc(i.specialization || '')}</p>
            <p class="expert-rate">${fmtCur(i.hourly_rate || 0)}/hr</p>
            <p class="expert-rating">
              <i class="fas fa-star" style="color:#f59e0b"></i>
              ${Number(i.average_rating || 0).toFixed(1)}
            </p>
            <p class="program-meta">${i.programmes_completed || 0} programmes delivered</p>
            <button class="btn btn-primary btn-block" data-action="hire-instructor"
                    data-id="${i.id}" data-name="${esc(i.name || '')}">
              <i class="fas fa-handshake"></i> Hire</button>
          </article>`).join('') || `
          <div class="empty-state" style="grid-column:1/-1">
            <i class="fas fa-search"></i>
            <h3>No instructors found</h3>
          </div>`}
      </section>
    </section>

    ${contracts.length ? `
      <section class="panel">
        <h3 class="panel-title">Active Contracts</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Instructor</th><th>Programme</th><th>Rate</th>
              <th>Start</th><th>End</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${contracts.map(c => `
                <tr>
                  <td>${esc(c.instructor_name)}</td>
                  <td>${esc(c.programme_title || '-')}</td>
                  <td>${fmtCur(c.rate)}</td>
                  <td>${fmtDate(c.start_date)}</td>
                  <td>${fmtDate(c.end_date)}</td>
                  <td><span class="${statusClass(c.status)}">${esc(c.status)}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>` : ''}
  `;
}
