/* ============================================================
   ExpertHub 2.0 — dashboards/user/wallet.js
   Wallet with server-verified ledger, top-up idempotency,
   M-Pesa stub, pending/completed separation.
   ============================================================ */

function renderUserWallet() {
  const ledger = (S.wallet?.ledger || []).slice(0, 25);
  const pending = ledger.filter(l => l.status === 'pending');
  const completed = ledger.filter(l => l.status !== 'pending');

  return UserUI.page({
    title: 'My Wallet',
    breadcrumb: 'Wallet',
    content: `
      <div class="wallet-balance">
        <p class="wallet-balance-label">Available Balance</p>
        <p class="wallet-balance-value">${fmtCur(S.wallet?.balance || 0)}</p>
      </div>

      <section class="panel">
        <h3 class="panel-title">Add Funds</h3>
        <div class="form-inline">
          <input id="topupAmount" type="number" class="form-input" placeholder="Amount" min="1" step="1" />
          <select id="topupProvider" class="form-select">
            ${(CONFIG.PAYMENT_PROVIDERS || ['card','mpesa']).map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('')}
          </select>
          <button class="btn btn-primary" data-action="topup-wallet">
            <i class="fas fa-plus"></i> Add Funds</button>
        </div>
        <p class="panel-hint" style="margin-top:10px">
          M-Pesa top-ups require phone confirmation. Card top-ups may redirect to the payment provider.
        </p>
      </section>

      ${pending.length ? `
        <section class="panel">
          <h3 class="panel-title">Pending</h3>
          <ul class="list-stack">
            ${pending.map(l => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(l.reason || '')}</span>
                  <span class="list-row-sub">${fmtDT(l.created_at)}</span>
                </div>
                <span class="list-row-price">${l.amount >= 0 ? '+' : ''}${fmtCur(l.amount)}</span>
              </li>
            `).join('')}
          </ul>
        </section>
      ` : ''}

      <section class="panel">
        <h3 class="panel-title">Recent Activity</h3>
        <ul class="list-stack">
          ${completed.map(l => `
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
        <div class="panel-actions" style="margin-top:12px">
          <button class="btn btn-secondary btn-sm" data-action="switch-tab" data-tab="transactions">
            View all transactions <i class="fas fa-arrow-right"></i></button>
        </div>
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('wallet', renderUserWallet);

window.ExpertHubUser.registerAction('topup-wallet', async () => {
  const amount = Number($('#topupAmount')?.value || 0);
  const provider = $('#topupProvider')?.value;
  if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error');
  if (amount > 5000) return showToast('Maximum top-up is $5,000 per transaction', 'error');
  // Idempotency key so retries never double-charge
  const idempotencyKey = `topup_${currentUser?.id}_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;

  try {
    showLoading(true);
    const d = await apiCall('/api/user/wallet/topup', 'POST', {
      amount, provider, idempotency_key: idempotencyKey,
    });
    await reloadWallet?.();
    rerenderRoleContent();
    if (d?.requires_confirmation) {
      showToast('Check your phone to confirm the M-Pesa payment', 'info', 8000);
    } else if (d?.redirect_url) {
      window.location.href = d.redirect_url;
    } else {
      showToast('Funds added', 'success');
    }
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});