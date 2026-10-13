/* ============================================================
   actions/payment-actions.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  async function topupWallet() {
    const amount = Number(document.getElementById('topupAmount')?.value || 0);
    const provider = document.getElementById('topupProvider')?.value;
    if (!amount || amount <= 0) return EH.Toast.error('Enter a valid amount');
    try {
      EH.Loading.show();
      await EH.API.post('/api/user/wallet/topup', { amount, provider });
      await EH.Data.reload.wallet();
      EH.Loading.hide();
      EH.Toast.success('Funds added');
      EH.NavigationActions.switchTab(EH.state.activeTab);
    } catch (e) {
      EH.Loading.hide();
      EH.Toast.error(e.message);
    }
  }

  async function requestWithdrawal() {
    const amount = Number(document.getElementById('withdrawAmount')?.value || 0);
    const method = document.getElementById('withdrawMethod')?.value;
    if (!amount || amount <= 0) return EH.Toast.error('Enter a valid amount');
    try {
      EH.Loading.show();
      await EH.API.post('/api/expert/withdrawals', { amount, method });
      await EH.Data.reload.earnings();
      EH.Loading.hide();
      EH.Toast.success('Withdrawal requested');
      EH.NavigationActions.switchTab(EH.state.activeTab);
    } catch (e) {
      EH.Loading.hide();
      EH.Toast.error(e.message);
    }
  }

  async function payoutAction(id, status, extra = {}) {
    await EH.API.put(`/api/admin/payouts/${id}`, { status, ...extra });
    await EH.Data.reload.payouts();
    EH.Toast.success(`Payout ${status}`);
    EH.NavigationActions.switchTab(EH.state.activeTab);
  }

  EH.PaymentActions = { topupWallet, requestWithdrawal, payoutAction };
})(window);
