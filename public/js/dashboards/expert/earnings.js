/* ============================================================
   dashboards/expert/earnings.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;
  const CONFIG = EH.CONFIG;

  function render() {
    const s = S.earnings || {};
    const ledger = S.wallet.ledger || [];
    const last30 = ledger.filter(l => (Date.now() - new Date(l.created_at).getTime()) < 30 * 86400000);
    const earned30 = last30.filter(l => Number(l.amount) > 0)
      .reduce((sum, l) => sum + Number(l.amount || 0), 0);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Earnings' }])}
      ${EH.Layout.pageHeader('My Earnings')}

      ${EH.Layout.statGrid([
        EH.Layout.statCard({ label: 'Total Earned', value: EH.Fmt.cur(s.total_earned || 0),
          icon: 'fa-dollar-sign', tone: 'green' }),
        EH.Layout.statCard({ label: 'Available Balance', value: EH.Fmt.cur(s.available_balance || 0),
          icon: 'fa-wallet', tone: 'blue' }),
        EH.Layout.statCard({ label: 'Paid Out', value: EH.Fmt.cur(s.total_paid_out || 0),
          icon: 'fa-money-bill-transfer', tone: 'purple' }),
        EH.Layout.statCard({ label: 'Last 30 Days', value: EH.Fmt.cur(earned30),
          icon: 'fa-chart-line', tone: 'yellow' }),
      ])}

      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        Platform commission: <strong>${CONFIG.PLATFORM_COMMISSION}%</strong> ·
        Withdrawal hold: <strong>${CONFIG.WITHDRAWAL_HOLD_DAYS} days</strong> ·
        Minimum payout: <strong>${EH.Fmt.cur(CONFIG.MIN_PAYOUT)}</strong>
      </div>

      <section class="panel">
        <h3 class="panel-title">Request Withdrawal</h3>
        <div class="form-inline">
          <input type="number" id="withdrawAmount" class="form-input"
                 placeholder="Amount (min ${EH.Fmt.cur(CONFIG.MIN_PAYOUT)})" />
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
                <span class="list-row-title">${EH.Fmt.esc(l.reason || '')}</span>
                <span class="list-row-sub">${EH.Dates.fmtDateTime(l.created_at)}</span>
              </div>
              <span class="list-row-price" style="color:${l.amount >= 0 ? 'var(--accent)' : 'var(--danger)'}">
                ${l.amount >= 0 ? '+' : ''}${EH.Fmt.cur(l.amount)}
              </span>
            </li>`).join('') || '<li class="empty-row">No activity yet</li>'}
        </ul>
      </section>`;
  }

  EH.ExpertEarnings = { render };
})(window);
