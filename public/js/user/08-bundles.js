/* ============================================================
   ExpertHub 2.0 — 08-bundles.js
   Course bundles available to the learner.
   ============================================================ */

/* ============================================================
   E-SCHOOL — BUNDLES
   ============================================================ */
function userBundles() {
  const bundles = S.courseBundles || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Bundles</span></div>
    <section class="page-header">
      <h1 class="page-title">Course Bundles</h1>
    </section>

    ${bundles.length ? `
      <section class="card-grid">
        ${bundles.map(b => `
          <article class="program-card">
            ${b.discount_pct ? `<span class="chip chip-green">Save ${b.discount_pct}%</span>` : ''}
            <h4 class="program-title">${esc(b.title)}</h4>
            <p class="program-desc">${esc((b.description || '').slice(0, 120))}</p>
            <div class="pricing-price" style="margin:8px 0">
              ${fmtCur(b.price)}
              ${b.original_price ? `<span style="text-decoration:line-through;color:var(--text-muted);font-size:.9rem;margin-left:6px">${fmtCur(b.original_price)}</span>` : ''}
            </div>
            <p class="program-meta">${b.course_count || 0} courses included</p>
            <div class="panel-actions" style="margin-top:10px">
              <button class="btn btn-primary btn-sm" data-action="purchase-bundle" data-id="${b.id}">
                <i class="fas fa-shopping-cart"></i> Buy Bundle</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-box-open"></i>
          <h3>No bundles available</h3>
          <p>Curated bundles save you money. Check back soon.</p>
        </div>
      </section>
    `}
  `;
}
