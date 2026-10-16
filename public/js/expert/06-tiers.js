/* ============================================================
   ExpertHub 2.0 — js/expert/06-tiers.js
   Expert pricing tiers.
   ============================================================ */

function expertTiers() {
  const tiers = S.consultationTiers || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Pricing Tiers</span></div>
    <section class="page-header">
      <h1 class="page-title">Pricing Tiers</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="edit-tiers">
          <i class="fas fa-pen"></i> Edit Tiers</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Offer different session types (Quick, Standard, Deep Dive) at different price points.
        Clients pick a tier when booking.
      </div>
    </div>

    ${tiers.length ? `
      <section class="card-grid">
        ${tiers.map(t => `
          <article class="program-card">
            <h4 class="program-title">${esc(t.name)}</h4>
            <p class="program-desc">${esc(t.description || 'No description')}</p>
            <div class="pricing-price" style="margin:12px 0">${fmtCur(t.price)}</div>
            <p class="program-meta"><i class="fas fa-clock"></i> ${t.duration_minutes} minutes</p>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-layer-group"></i>
          <h3>No pricing tiers configured</h3>
          <p>Set up Quick, Standard and Deep Dive tiers to give clients more choice.</p>
          <button class="btn btn-primary" data-action="edit-tiers">
            <i class="fas fa-plus"></i> Create Tiers</button>
        </div>
      </section>
    `}
  `;
}
