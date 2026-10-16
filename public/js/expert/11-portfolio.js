/* ============================================================
   ExpertHub 2.0 — js/expert/11-portfolio.js
   Expert portfolio / case studies.
   ============================================================ */

function expertPortfolioView() {
  const items = S.expertPortfolio || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Portfolio</span></div>
    <section class="page-header">
      <h1 class="page-title">Portfolio and Case Studies</h1>
      <button class="btn btn-primary" data-action="add-portfolio-item">
        <i class="fas fa-plus"></i> Add Item</button>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Your portfolio appears on your public profile.
        Share case studies, client outcomes and testimonials to build credibility.
      </div>
    </div>

    <section class="card-grid">
      ${items.map(item => `
        <article class="program-card">
          <span class="chip chip-blue">${esc(item.category || 'Case Study')}</span>
          <h4 class="program-title">${esc(item.title || '')}</h4>
          <p class="program-desc">${esc((item.description || '').slice(0, 140))}</p>
          <footer class="program-footer">
            <span class="program-meta">${fmtDate(item.created_at)}</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px">
            <button class="btn btn-secondary btn-sm" data-action="edit-portfolio-item" data-id="${item.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-action="delete-portfolio-item" data-id="${item.id}">Delete</button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-briefcase"></i>
          <h3>No portfolio items yet</h3>
          <p>Add case studies to showcase your expertise.</p>
          <button class="btn btn-primary" data-action="add-portfolio-item">
            <i class="fas fa-plus"></i> Add First Item</button>
        </div>
      `}
    </section>
  `;
}
