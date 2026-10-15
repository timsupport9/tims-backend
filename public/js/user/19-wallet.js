/* ============================================================
   ExpertHub 2.0 — 19-wallet.js
   Learner wallet: balance, top-up, ledger.
   ============================================================ */

/* ============================================================
   USER — WALLET
   ============================================================ */
function userWallet() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Wallet</span></div>
    <section class="page-header"><h1 class="page-title">My Wallet</h1></section>

    <div class="wallet-balance">
      <p class="wallet-balance-label">Available Balance</p>
      <p class="wallet-balance-value">${fmtCur(S.wallet.balance || 0)}</p>
    </div>

    <section class="panel">
      <h3 class="panel-title">Add Funds</h3>
      <div class="form-inline">
        <input id="topupAmount" type="number" class="form-input" placeholder="Amount ($)" />
        <select id="topupProvider" class="form-select">
          ${CONFIG.PAYMENT_PROVIDERS.map(p => `<option value="${p}">${p}</option>`).join('')}
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
              <span class="list-row-title">${esc(l.reason || '')}</span>
              <span class="list-row-sub">${fmtDT(l.created_at)}</span>
            </div>
            <span class="list-row-price" style="color:${l.amount >= 0 ? 'var(--accent)' : 'var(--danger)'}">
              ${l.amount >= 0 ? '+' : ''}${fmtCur(l.amount)}
            </span>
          </li>
        `).join('') || '<li class="empty-row">No activity yet</li>'}
      </ul>
    </section>
  `;
}
