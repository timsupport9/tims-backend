/* ============================================================
   dashboards/expert/portfolio.js
   ============================================================ */

function renderExpertPortfolio() {
  const items = S.expertPortfolio || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Portfolio</span></div>
    <section class="page-header">
      <h1 class="page-title">Portfolio & Case Studies</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-expert-action="add-portfolio-item">
          <i class="fas fa-plus"></i> Add Item</button>
      </div>
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
          ${item.link ? `<p><a href="${esc(item.link)}" target="_blank" rel="noopener">View case study</a></p>` : ''}
          <div class="panel-actions" style="margin-top:10px">
            <button class="btn btn-secondary btn-sm" data-expert-action="edit-portfolio-item" data-id="${item.id}">
              Edit</button>
            <button class="btn btn-danger btn-sm" data-expert-action="delete-portfolio-item" data-id="${item.id}">
              Delete</button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-briefcase"></i>
          <h3>No portfolio items yet</h3>
          <p>Add case studies to showcase your expertise.</p>
          <button class="btn btn-primary" data-expert-action="add-portfolio-item">
            <i class="fas fa-plus"></i> Add First Item</button>
        </div>
      `}
    </section>
  `;
}

function openPortfolioItemModal(itemId) {
  const item = itemId ? (S.expertPortfolio || []).find(x => String(x.id) === String(itemId)) : {};
  openModal({
    title: itemId ? 'Edit Portfolio Item' : 'Add Portfolio Item',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="piTitle" class="form-input" value="${esc(item?.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Category</span>
        <input id="piCategory" class="form-input" value="${esc(item?.category || 'Case Study')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="piDescription" class="form-textarea" rows="4">${esc(item?.description || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Link (optional)</span>
        <input id="piLink" class="form-input" value="${esc(item?.link || '')}" placeholder="https://" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="piSave" class="btn btn-primary">${itemId ? 'Save' : 'Add'}</button>`,
  });
  document.getElementById('piSave').onclick = async () => {
    const payload = {
      title: document.getElementById('piTitle').value,
      category: document.getElementById('piCategory').value,
      description: document.getElementById('piDescription').value,
      link: document.getElementById('piLink').value,
    };
    if (!payload.title) return showToast('Title required', 'error');
    if (itemId) await apiCall(`/api/expert/portfolio/${itemId}`, 'PUT', payload);
    else        await apiCall('/api/expert/portfolio', 'POST', payload);
    closeModal();
    await loadAllData();
    showToast(itemId ? 'Item updated' : 'Item added', 'success');
    rerenderExpertContent();
  };
}
