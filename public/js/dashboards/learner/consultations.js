/* ============================================================
   dashboards/learner/consultations.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const mine = S.consultations.filter(c => c.user_id === S.currentUser?.id);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Consultations' }])}
      ${EH.Layout.pageHeader('My Consultations', {
        actions: `<button class="btn btn-primary" data-action="new-consultation">
          <i class="fas fa-plus"></i> New Request</button>`,
      })}

      <section class="list-stack">
        ${mine.map(c => `
          <article class="case-card">
            <header class="case-header">
              <h3 class="case-title">${EH.Fmt.esc(c.title || '')}</h3>
              <span class="${EH.Fmt.statusClass(c.status)}">${EH.Fmt.esc(c.status || '')}</span>
            </header>
            <p class="case-type">
              ${EH.Fmt.esc(c.consultation_type || '')} ·
              Expert: ${EH.Fmt.esc(c.expert_name || 'Unassigned')}
            </p>
            <p class="case-desc">${EH.Fmt.esc(EH.Fmt.truncate(c.description || '', 180))}</p>
            <footer class="case-footer">
              <button class="btn btn-primary btn-sm" data-action="open-chat" data-id="${c.id}">
                <i class="fas fa-comments"></i> Chat</button>
              ${c.status === 'completed' ? `
                <button class="btn btn-success btn-sm" data-action="review-expert"
                        data-id="${c.id}" data-expert="${c.expert_id}">
                  <i class="fas fa-star"></i> Rate Expert</button>` : ''}
              <button class="btn btn-secondary btn-sm" data-action="file-claim" data-id="${c.id}">
                <i class="fas fa-gavel"></i> File Claim</button>
            </footer>
          </article>`).join('') || `
            <div class="empty-state">
              <i class="fas fa-comments"></i>
              <h3>No consultations yet</h3>
              <p>Book your first expert session.</p>
              <button class="btn btn-primary" data-action="switch-tab" data-tab="experts">
                <i class="fas fa-search"></i> Find Experts</button>
            </div>`}
      </section>`;
  }

  EH.LearnerConsultations = { render };
})(window);
