/* ============================================================
   dashboards/learner/claims.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Claims' }])}
      ${EH.Layout.pageHeader('My Claims')}
      <section class="panel">
        ${S.claims.length ? S.claims.map(c => `
          <article class="claim-card">
            <header class="claim-header">
              <span class="claim-title">${EH.Fmt.esc(c.claim_title || '')}</span>
              <span class="${EH.Fmt.statusClass(c.status)}">${EH.Fmt.esc(c.status || '')}</span>
            </header>
            <p class="claim-desc">${EH.Fmt.esc(c.claim_description || '')}</p>
            ${c.claim_amount ? `<p class="claim-amount">Amount: ${EH.Fmt.cur(c.claim_amount)}</p>` : ''}
            ${c.resolution ? `
              <div class="alert alert-info" style="margin-top:10px">
                <strong>Resolution:</strong> ${EH.Fmt.esc(c.resolution)}
              </div>` : ''}
          </article>`).join('') : `
          <div class="empty-state">
            <i class="fas fa-gavel"></i>
            <h3>No claims filed</h3>
            <p>If you have an issue with a consultation, you can file a claim.</p>
          </div>`}
      </section>`;
  }

  EH.LearnerClaims = { render };
})(window);
