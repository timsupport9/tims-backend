/* ============================================================
   ExpertHub 2.0 — Instructor Marketplace
   Advanced search, verified credentials, availability calendars,
   RFPs, quote comparison, contract negotiation, booking,
   post-training reviews.
   ============================================================ */

function instMarketplace() {
  const list = S.instructorMarketplace || [];
  const contracts = S.instructorContracts || [];
  const rfps = S.marketplaceRFPs || [];

  const f = S.filters.marketplace = S.filters.marketplace || {};
  const q = (f.q || '').toLowerCase();
  const specialization = f.specialization || '';
  const verifiedOnly = !!f.verifiedOnly;

  let filtered = list.slice();
  if (q) filtered = filtered.filter(x =>
    (x.name || '').toLowerCase().includes(q) ||
    (x.specialization || '').toLowerCase().includes(q) ||
    (x.bio || '').toLowerCase().includes(q));
  if (specialization) filtered = filtered.filter(x => x.specialization === specialization);
  if (verifiedOnly) filtered = filtered.filter(x => x.verified);

  const specializations = uniqueBy(
    list.map(x => x.specialization).filter(Boolean).map(s => ({ id: s, label: s })),
    'id'
  );

  const canWrite = hasInstitutionPermission('marketplace:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Instructor Marketplace</span></div>
    <section class="page-header">
      <h1 class="page-title">Instructor Marketplace</h1>
      <div class="page-actions">
        <input type="search" id="market-search" class="form-input"
               placeholder="Search instructors..." value="${esc(f.q || '')}" style="max-width:240px" />
        ${specializations.length ? `
          <select id="market-specialization" class="form-select" style="max-width:200px">
            <option value="">All specializations</option>
            ${specializations.map(s =>
              `<option value="${s.id}" ${specialization === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
          </select>` : ''}
        <label class="checkbox-row" style="font-size:.85rem">
          <input type="checkbox" id="market-verified" ${verifiedOnly ? 'checked' : ''} />
          Verified only
        </label>
        ${canWrite ? `
          <button class="btn btn-primary" data-action="post-instructor-request">
            <i class="fas fa-plus"></i> Post Requirement</button>` : ''}
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-people-arrows"></i>
      <div>
        Browse verified instructors, filter by specialization and availability,
        and hire directly with one click. Contracts include automatic rate cards and NDA templates.
        Quotes are collected and compared before contract negotiation.
      </div>
    </div>

    ${rfps.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-clipboard-list"></i> Your Open RFPs</h3>
        <ul class="list-stack">
          ${rfps.map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.specialization || 'Instructor')}</span>
                <span class="list-row-sub">
                  ${fmtDate(r.start_date)} · ${r.quotes_count || 0} quote${(r.quotes_count || 0) === 1 ? '' : 's'}
                  · Status: ${esc(r.status || 'open')}
                </span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-xs" data-action="compare-quotes" data-id="${r.id}">
                  Compare</button>
                ${canWrite && r.status === 'open' ? `
                  <button class="btn btn-secondary btn-xs" data-action="close-rfp" data-id="${r.id}">
                    Close</button>` : ''}
              </div>
            </li>`).join('')}
        </ul>
      </section>` : ''}

    <section class="panel">
      <h3 class="panel-title">Available Instructors</h3>
      <section class="card-grid">
        ${filtered.map(i => renderMarketplaceCard(i, canWrite)).join('') ||
          renderEmptyState({
            icon: 'fa-search',
            title: 'No instructors match your filters',
            description: 'Broaden your search or reset the filters.',
            compact: true,
          })}
      </section>
    </section>

    ${contracts.length ? `
      <section class="panel">
        <h3 class="panel-title">Active Contracts</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Instructor</th><th>Programme</th><th>Rate</th>
              <th>Start</th><th>End</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${contracts.map(c => `
                <tr>
                  <td>${esc(c.instructor_name)}</td>
                  <td>${esc(c.programme_title || '—')}</td>
                  <td>${fmtCur(c.rate)}</td>
                  <td>${fmtDate(c.start_date)}</td>
                  <td>${fmtDate(c.end_date)}</td>
                  <td><span class="${statusClass(c.status)}">${esc(c.status)}</span></td>
                  <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs" data-action="view-contract" data-id="${c.id}">
                      View</button>
                    ${canWrite && c.status === 'active' ? `
                      <button class="btn btn-warning btn-xs" data-action="amend-contract" data-id="${c.id}">
                        Amend</button>` : ''}
                    ${c.status === 'completed' ? `
                      <button class="btn btn-info btn-xs" data-action="rate-instructor" data-id="${c.id}">
                        Rate</button>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>` : ''}
  `;
}

function renderMarketplaceCard(i, canWrite) {
  const availability = i.next_available_at ? fmtDate(i.next_available_at) : 'Now';

  return `
    <article class="expert-card">
      <img class="expert-avatar" src="${avatar(i)}" alt="" />
      <h4 class="expert-name">
        ${esc(i.name || '')}
        ${i.verified ? '<span class="badge-verified-sm"><i class="fas fa-check-circle"></i></span>' : ''}
      </h4>
      <p class="expert-expertise">${esc(i.specialization || '')}</p>
      <p class="expert-rate">${i.hourly_rate != null ? fmtCur(i.hourly_rate) + '/hr' : 'Negotiable'}</p>
      <p class="expert-rating">
        <i class="fas fa-star" style="color:#f59e0b"></i>
        ${Number(i.average_rating || 0).toFixed(1)}
        · ${i.programmes_completed || 0} programmes delivered
      </p>
      <p class="program-meta" style="font-size:.78rem">
        <i class="fas fa-calendar"></i> Next available: ${esc(availability)}
      </p>
      <div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" data-action="view-market-instructor" data-id="${i.id}">
          View</button>
        ${canWrite ? `
          <button class="btn btn-primary btn-sm" data-action="hire-instructor"
                  data-id="${i.id}" data-name="${esc(i.name || '')}">
            <i class="fas fa-handshake"></i> Hire</button>
          <button class="btn btn-secondary btn-sm" data-action="request-quote" data-id="${i.id}"
                  title="Request quotation"><i class="fas fa-file-invoice-dollar"></i></button>
        ` : ''}
      </div>
    </article>`;
}
