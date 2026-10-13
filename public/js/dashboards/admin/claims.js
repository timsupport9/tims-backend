/* ============================================================
   dashboards/admin/claims.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const claims = S.claims.length ? S.claims.map(c => `
      <article class="claim-card">
        <header class="claim-header">
          <span class="claim-title">${EH.Fmt.esc(c.claim_title || '')}</span>
          <span class="${EH.Fmt.statusClass(c.status)}">${EH.Fmt.esc(c.status || '')}</span>
        </header>
        <p class="claim-desc">${EH.Fmt.esc(c.claim_description || '')}</p>
        ${c.claim_amount ? `<p class="claim-amount">Amount: ${EH.Fmt.cur(c.claim_amount)}</p>` : ''}
        <footer class="claim-actions">
          ${c.status === 'open' ? `
            <button class="btn btn-info btn-sm" data-action="claim-investigate" data-id="${c.id}">Investigate</button>
            <button class="btn btn-success btn-sm" data-action="claim-resolve" data-id="${c.id}">Resolve</button>
            <button class="btn btn-danger btn-sm" data-action="claim-reject" data-id="${c.id}">Reject</button>` : ''}
        </footer>
      </article>`).join('') : '<p class="empty-row">No claims</p>';

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Claims' }])}
      ${EH.Layout.pageHeader('Client Claims')}
      <section class="panel">${claims}</section>`;
  }

  EH.AdminClaims = { render };
})(window);
