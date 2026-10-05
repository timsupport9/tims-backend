/* ============================================================
   ExpertHub 2.0 — wallet-modals.js
   Functions moved intact from 13-modals.js.
   ============================================================ */

async function topUpWallet() {
  const amount = Number($('#topupAmount').value || 0);
  const provider = $('#topupProvider').value;
  if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error');
  showLoading(true);
  await apiCall('/api/user/wallet/topup', 'POST', { amount, provider });
  await reloadWallet(); showLoading(false);
  rerenderRoleContent(); showToast('Funds added', 'success');
}
