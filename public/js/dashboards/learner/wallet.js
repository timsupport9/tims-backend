/* ============================================================
   dashboards/learner/wallet.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;
  const CONFIG = EH.CONFIG;

  function render() {
    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Wallet' }])}
      ${EH.Layout.pageHeader('My Wallet')}

      <div class="wallet-balance">
        <p class="wallet-balance-label">Available Balance</p>
        <p class="wallet-balance-value">${EH.Fmt.cur(S.wallet.balance || 0)}</p>
      </div>

      <section class="panel">
        <h3 class="panel-title">Add Funds</h3>
        <div class="form-inline">
          <input id="topupAmount" type="number" class="form-input" placeholder="Amount ($)" />
          <select id="topupProvider" class="form-select">
            ${(CONFIG.PAYMENT_PROVIDERS || []).map(p => `<option value="${p}">${p}</option>`).join('')}
          </select>
          <button class="btn btn-primary" data-action="topup-wallet">
            <i class="fas fa-plus"></i> Add Funds</button>
        </div>
        <p class="panel-hint" style="margin-top:10px">
          Demo mode: top-ups are instantly credited.
        </p>
      </section>

      <section class="panel">
        <h3 class="panel-title">Ledger</h3>
        <ul class="list-stack">
          ${(S.wallet.ledger || []).map(l => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${EH.Fmt.esc(l.reason || '')}</span>
                <span class="list-row-sub">${EH.Dates.fmtDateTime(l.created_at)}</span>
              </div>
              <span class="list-row-price"
                    style="color:${l.amount >= 0 ? 'var(--accent)' : 'var(--danger)'}">
                ${l.amount >= 0 ? '+' : ''}${EH.Fmt.cur(l.amount)}
              </span>
            </li>`).join('') || '<li class="empty-row">No activity yet</li>'}
        </ul>
      </section>`;
  }

  EH.LearnerWallet = { render };
})(window);
