/* ============================================================
   ExpertHub 2.0 — js/expert/13-earnings.js
   Expert earnings summary + wallet ledger.
   ============================================================ */

function expertEarnings() {
  const s = S.earnings || {};
  const ledger = S.wallet.ledger || [];
  const last30 = ledger.filter(l => {
    const d = new Date(l.created_at);
    return (Date.now() - d.getTime()) < 30 * 86400000;
  });
  const earned30 = last30
    .filter(l => Number(l.amount) > 0)
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Earnings</span></div>
    <section class="page-header"><h1 class="page-title">My Earnings</h1></section>

    <section class="stat-grid">
      <div class="stat-card dashboard-card">
        <div class="stat-info">
          <p class="stat-label">Total Earned</p>
          <p class="stat-value">${fmtCur(s.total_earned || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info">
          <p class="stat-label">Available Balance</p>
          <p class="stat-value">${fmtCur(s.available_balance || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-wallet"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info">
          <p class="stat-label">Paid Out</p>
          <p class="stat-value">${fmtCur(s.total_paid_out || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-money-bill-transfer"></i></div>
      </div>
      <div class="stat-card dashboard-card">
        <div class="stat-info">
          <p class="stat-label">Last 30 Days</p>
          <p class="stat-value">${fmtCur(earned30)}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-chart-line"></i></div>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      Platform commission: <strong>${CONFIG.PLATFORM_COMMISSION}%</strong> ·
      Withdrawal hold: <strong>${CONFIG.WITHDRAWAL_HOLD_DAYS} days</strong> ·
      Minimum payout: <strong>${fmtCur(CONFIG.MIN_PAYOUT)}</strong>
    </div>

    <section class="panel">
      <h3 class="panel-title">Request Withdrawal</h3>
      <div class="form-inline">
        <input type="number" id="withdrawAmount" class="form-input"
               placeholder="Amount (min ${fmtCur(CONFIG.MIN_PAYOUT)})" />
        <select id="withdrawMethod" class="form-select">
          <option value="bank_transfer">Bank Transfer</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="paypal">PayPal</option>
          <option value="stripe">Stripe</option>
        </select>
        <button class="btn btn-primary" data-action="request-withdrawal">
          <i class="fas fa-paper-plane"></i> Request</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Recent Wallet Activity</h3>
      <ul class="list-stack">
        ${ledger.slice(0, 30).map(l => `
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
