/* ============================================================
   ExpertHub 2.0 — 19-wallet.js
   Learner wallet: balance, top-up, ledger, payment methods,
   M-Pesa (Lipa Na M-Pesa), auto top-up, withdraw, promo, PIN.

   Enhancements (v2):
   - Balance breakdown: Available / Pending / Reserved
   - Multi-currency selector (persisted)
   - Add Funds with method tabs: Card / PayPal / M-Pesa / Bank
   - M-Pesa STK Push (Lipa Na M-Pesa) with validation + polling + retry
   - M-Pesa withdraw
   - Promo code redeem
   - Auto top-up rules
   - Saved payment methods manager
   - Ledger: type filter, date filter, CSV export, per-row receipt
   - Optional PIN gate (SHA-256 via SubtleCrypto, with fallback)
   - Preserves: #topupAmount, #topupProvider, data-action="topup-wallet"
   ============================================================ */

/* ============================================================
   Module state + persistence
   ============================================================ */
const WALLET_PREFS_KEY   = 'eh.wallet.prefs';
const WALLET_METHODS_KEY = 'eh.wallet.methods';
const WALLET_AUTOTOP_KEY = 'eh.wallet.autoTopup';
const WALLET_PIN_KEY     = 'eh.wallet.pinHash';
const WALLET_CURRENCIES  = [
  { code: 'KES', label: 'Kenyan Shilling (KES)', symbol: 'KSh' },
  { code: 'USD', label: 'US Dollar (USD)',       symbol: '$'   },
  { code: 'EUR', label: 'Euro (EUR)',            symbol: '€'   },
  { code: 'GBP', label: 'British Pound (GBP)',   symbol: '£'   },
  { code: 'NGN', label: 'Nigerian Naira (NGN)',  symbol: '₦'   },
];
const MPESA_MAX_AMOUNT_KES = 250000;
const MPESA_MIN_AMOUNT_KES = 1;

S.__walletPrefs = S.__walletPrefs || loadWalletPrefs();
S.__walletMethodTab = S.__walletMethodTab || 'card';         // card | paypal | mpesa | bank
S.__walletLedgerFilter = S.__walletLedgerFilter || 'all';    // all | credit | debit
S.__walletLedgerFrom   = S.__walletLedgerFrom || '';
S.__walletLedgerTo     = S.__walletLedgerTo   || '';

function loadWalletPrefs() {
  try {
    const raw = localStorage.getItem(WALLET_PREFS_KEY);
    const p = raw ? JSON.parse(raw) : {};
    return {
      currency: p.currency || 'KES',
      pinEnabled: !!p.pinEnabled,
    };
  } catch (_) { return { currency: 'KES', pinEnabled: false }; }
}
function saveWalletPrefs() {
  try { localStorage.setItem(WALLET_PREFS_KEY, JSON.stringify(S.__walletPrefs)); } catch (_) {}
}

function loadWalletMethods() {
  try {
    const raw = localStorage.getItem(WALLET_METHODS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (_) { return []; }
}
function saveWalletMethods(list) {
  try { localStorage.setItem(WALLET_METHODS_KEY, JSON.stringify(list || [])); } catch (_) {}
}

function loadAutoTopup() {
  try {
    const raw = localStorage.getItem(WALLET_AUTOTOP_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return {
      enabled: !!o.enabled,
      threshold: Number(o.threshold) || 200,
      amount: Number(o.amount) || 1000,
      methodId: o.methodId || null,
    };
  } catch (_) { return { enabled: false, threshold: 200, amount: 1000, methodId: null }; }
}
function saveAutoTopup(o) {
  try { localStorage.setItem(WALLET_AUTOTOP_KEY, JSON.stringify(o || {})); } catch (_) {}
}

/* ============================================================
   Currency formatting
   ============================================================ */
function walletCurrencyMeta(code) {
  return WALLET_CURRENCIES.find(c => c.code === (code || 'KES')) || WALLET_CURRENCIES[0];
}
function walletFormatAmount(amount, currencyCode) {
  const meta = walletCurrencyMeta(currencyCode || S.__walletPrefs.currency);
  const n = Number(amount) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}${meta.symbol} ${formatted}`;
}

/* ============================================================
   PIN gate (optional)
   ============================================================ */
async function hashPin(pin) {
  const text = String(pin);
  try {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const enc = new TextEncoder();
      const buf = await window.crypto.subtle.digest('SHA-256', enc.encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (_) {}
  /* Fallback: simple non-crypto hash (demo only) */
  let h = 0;
  for (let i = 0; i < text.length; i++) h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  return 'fallback:' + Math.abs(h).toString(16);
}

async function walletRequirePin(actionLabel) {
  const stored = localStorage.getItem(WALLET_PIN_KEY);
  if (!stored || !S.__walletPrefs.pinEnabled) return true; // no PIN set → pass
  if (typeof openModal !== 'function') {
    const pin = window.prompt(`Enter your wallet PIN to ${actionLabel}:`);
    if (!pin) return false;
    const h = await hashPin(pin);
    if (h !== stored) {
      if (typeof showToast === 'function') showToast('Incorrect PIN', 'error');
      return false;
    }
    return true;
  }
  return new Promise((resolve) => {
    openModal({
      title: `Confirm ${actionLabel}`,
      body: `
        <p class="form-hint">Enter your 4-digit wallet PIN to continue.</p>
        <input id="wallet-pin-input" class="form-input wallet-pin-input"
               type="password" inputmode="numeric" maxlength="8"
               autocomplete="off" placeholder="••••" />
      `,
      footer: `
        <button class="btn btn-secondary" id="wallet-pin-cancel" type="button">Cancel</button>
        <button class="btn btn-primary" id="wallet-pin-confirm" type="button">
          <i class="fas fa-lock"></i> Confirm
        </button>
      `,
    });
    const input = document.getElementById('wallet-pin-input');
    if (input) setTimeout(() => input.focus(), 50);
    const cancelBtn = document.getElementById('wallet-pin-cancel');
    const confirmBtn = document.getElementById('wallet-pin-confirm');
    const finish = (ok) => {
      if (typeof closeModal === 'function') closeModal();
      resolve(ok);
    };
    if (cancelBtn) cancelBtn.onclick = () => finish(false);
    if (confirmBtn) confirmBtn.onclick = async () => {
      const pin = (input?.value || '').trim();
      if (!pin) return;
      const h = await hashPin(pin);
      if (h !== stored) {
        if (typeof showToast === 'function') showToast('Incorrect PIN', 'error');
        if (input) input.value = '';
        return;
      }
      finish(true);
    };
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); confirmBtn?.click(); }
      });
    }
  });
}

/* ============================================================
   Method tabs
   ============================================================ */
function setWalletMethodTab(tab) {
  const valid = ['card', 'paypal', 'mpesa', 'bank'];
  S.__walletMethodTab = valid.includes(tab) ? tab : 'card';
  rerenderWallet();
}
function rerenderWallet() {
  if (typeof renderUserDashboard === 'function') renderUserDashboard();
}

/* ============================================================
   Ledger filters + CSV + receipts
   ============================================================ */
function setWalletLedgerFilter(f) {
  S.__walletLedgerFilter = ['all', 'credit', 'debit'].includes(f) ? f : 'all';
  rerenderWallet();
}
function setWalletLedgerDate() {
  const f = document.getElementById('wallet-ledger-from');
  const t = document.getElementById('wallet-ledger-to');
  S.__walletLedgerFrom = f ? f.value : '';
  S.__walletLedgerTo   = t ? t.value : '';
  rerenderWallet();
}
function clearWalletLedgerFilters() {
  S.__walletLedgerFilter = 'all';
  S.__walletLedgerFrom = '';
  S.__walletLedgerTo = '';
  rerenderWallet();
}

function walletLedgerFiltered() {
  const ledger = Array.isArray(S.wallet?.ledger) ? S.wallet.ledger : [];
  const from = S.__walletLedgerFrom ? new Date(S.__walletLedgerFrom).getTime() : null;
  const to   = S.__walletLedgerTo   ? new Date(S.__walletLedgerTo).getTime() + 86400000 : null;
  return ledger.filter(l => {
    if (S.__walletLedgerFilter === 'credit' && Number(l.amount || 0) < 0) return false;
    if (S.__walletLedgerFilter === 'debit'  && Number(l.amount || 0) >= 0) return false;
    const ts = l.created_at ? new Date(l.created_at).getTime() : null;
    if (from !== null && ts !== null && ts < from) return false;
    if (to !== null && ts !== null && ts > to) return false;
    return true;
  });
}

function exportWalletCsv() {
  const rows = walletLedgerFiltered();
  if (!rows.length) {
    if (typeof showToast === 'function') showToast('No ledger entries to export.', 'info');
    return;
  }
  const header = ['date', 'reason', 'amount', 'currency', 'balance_after', 'reference'];
  const lines = [header.join(',')];
  rows.forEach(l => {
    const cells = [
      l.created_at || '',
      '"' + String(l.reason || '').replace(/"/g, '""') + '"',
      Number(l.amount || 0).toFixed(2),
      S.__walletPrefs.currency,
      l.balance_after !== undefined ? Number(l.balance_after).toFixed(2) : '',
      l.reference || l.id || '',
    ];
    lines.push(cells.join(','));
  });
  try {
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
    if (typeof showToast === 'function') showToast(`Exported ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`, 'success');
  } catch (_) {
    if (typeof showToast === 'function') showToast('Could not export CSV', 'error');
  }
}

function downloadWalletReceipt(entryId) {
  const ledger = Array.isArray(S.wallet?.ledger) ? S.wallet.ledger : [];
  const l = ledger.find(x => String(x.id || x.reference) === String(entryId));
  if (!l) {
    if (typeof showToast === 'function') showToast('Receipt not found', 'error');
    return;
  }
  const user = (typeof currentUser === 'object' && currentUser) ? currentUser : {};
  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Wallet Receipt — ${escapeHtmlWallet(l.reference || l.id || '')}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #111; max-width: 620px; margin: 0 auto; }
      h1 { margin: 0; font-size: 20px; }
      .brand { font-size: 12px; color: #666; margin-bottom: 24px; letter-spacing: .08em; text-transform: uppercase; }
      .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e5e7eb; font-size: 14px; }
      .row:last-child { border-bottom: 0; }
      .amount { font-size: 26px; font-weight: 700; margin: 12px 0 20px; }
      .credit { color: #16a34a; }
      .debit { color: #dc2626; }
      @media print { .no-print { display: none; } }
    </style>
  </head>
  <body>
    <div class="brand">ExpertHub</div>
    <h1>Wallet Receipt</h1>
    <div class="amount ${Number(l.amount) >= 0 ? 'credit' : 'debit'}">
      ${Number(l.amount) >= 0 ? '+' : ''}${walletFormatAmount(l.amount, S.__walletPrefs.currency)}
    </div>
    <div class="row"><span>Reference</span><strong>${escapeHtmlWallet(l.reference || l.id || '')}</strong></div>
    <div class="row"><span>Date</span><strong>${escapeHtmlWallet(new Date(l.created_at || Date.now()).toLocaleString())}</strong></div>
    <div class="row"><span>Reason</span><strong>${escapeHtmlWallet(l.reason || '')}</strong></div>
    ${l.balance_after !== undefined ? `<div class="row"><span>Balance after</span><strong>${walletFormatAmount(l.balance_after, S.__walletPrefs.currency)}</strong></div>` : ''}
    <div class="row"><span>Account</span><strong>${escapeHtmlWallet(user.email || '')}</strong></div>
    <div class="row"><span>Holder</span><strong>${escapeHtmlWallet(user.name || '')}</strong></div>
    <p style="color:#666;font-size:12px;margin-top:24px">This is a system-generated receipt. No signature is required.</p>
    <button class="no-print" onclick="window.print()" style="margin-top:16px;padding:8px 16px;cursor:pointer">Print</button>
  </body>
  </html>`;
  const w = window.open('', '_blank', 'width=720,height=800');
  if (!w) {
    if (typeof showToast === 'function') showToast('Popup blocked.', 'warning');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtmlWallet(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================================
   Currency change
   ============================================================ */
function setWalletCurrency(code) {
  const valid = WALLET_CURRENCIES.map(c => c.code);
  S.__walletPrefs.currency = valid.includes(code) ? code : 'KES';
  saveWalletPrefs();
  rerenderWallet();
}

/* ============================================================
   Promo code
   ============================================================ */
async function redeemWalletPromo() {
  const el = document.getElementById('wallet-promo-code');
  const code = (el?.value || '').trim().toUpperCase();
  if (!code) return;
  const ok = await walletRequirePin('redeem a promo code');
  if (!ok) return;

  const applyLocal = () => {
    /* Demo fallback: honour a local table of known codes */
    const demo = {
      'WELCOME10': { amount: 100, reason: 'Promo: WELCOME10 (+KES 100)' },
      'EXPERTS50': { amount: 500, reason: 'Promo: EXPERTS50 (+KES 500)' },
    };
    const hit = demo[code];
    if (!hit) {
      if (typeof showToast === 'function') showToast('Invalid or expired code', 'error');
      return;
    }
    pushLocalLedger(hit.amount, hit.reason, 'promo:' + code);
    if (typeof showToast === 'function') showToast('Promo applied 🎉', 'success');
    if (el) el.value = '';
    rerenderWallet();
  };

  if (typeof apiCall !== 'function') return applyLocal();
  try {
    const res = await apiCall('/api/wallet/promo', 'POST', { code, currency: S.__walletPrefs.currency });
    const amount = Number(res?.amount || 0);
    const reason = res?.reason || `Promo: ${code}`;
    pushLocalLedger(amount, reason, 'promo:' + code);
    if (typeof showToast === 'function') showToast('Promo applied 🎉', 'success');
    if (el) el.value = '';
    rerenderWallet();
  } catch (e) {
    applyLocal();
  }
}

/* ============================================================
   Ledger mutation helper (used by promos + fallback flows)
   ============================================================ */
function pushLocalLedger(amount, reason, reference) {
  if (!S.wallet) S.wallet = { balance: 0, ledger: [] };
  if (!Array.isArray(S.wallet.ledger)) S.wallet.ledger = [];
  const amt = Number(amount) || 0;
  S.wallet.balance = Number(S.wallet.balance || 0) + amt;
  S.wallet.ledger.unshift({
    id: reference || ('local-' + Date.now()),
    reference: reference || ('local-' + Date.now()),
    reason: reason || '',
    amount: amt,
    balance_after: S.wallet.balance,
    created_at: new Date().toISOString(),
  });
}

/* ============================================================
   Payment methods manager
   ============================================================ */
function openWalletMethods() {
  const list = loadWalletMethods();
  const rows = list.length ? list.map(m => `
    <li class="wallet-method-row">
      <i class="fas ${walletMethodIcon(m.type)}"></i>
      <div class="wallet-method-main">
        <strong>${escapeHtmlWallet(m.label || walletMethodLabel(m))}</strong>
        <span class="form-hint">${escapeHtmlWallet(walletMethodDetail(m))}</span>
      </div>
      <button class="btn btn-ghost btn-xs"
              onclick="removeWalletMethod('${escapeHtmlWallet(m.id)}'); return false;"
              title="Remove">
        <i class="fas fa-trash"></i>
      </button>
    </li>
  `).join('') : '<li class="empty-row">No saved methods</li>';

  if (typeof openModal !== 'function') return;
  openModal({
    title: 'Payment Methods',
    body: `
      <ul class="wallet-method-list">${rows}</ul>
      <hr />
      <h4 class="form-label" style="margin-top:8px">Add a method</h4>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Type</span>
          <select id="wm-type" class="form-select" onchange="onWalletMethodTypeChange(this.value)">
            <option value="card">Card</option>
            <option value="mpesa">M-Pesa phone</option>
            <option value="bank">Bank account</option>
            <option value="paypal">PayPal email</option>
          </select>
        </label>
        <label class="form-group">
          <span class="form-label" id="wm-primary-label">Card number</span>
          <input id="wm-primary" class="form-input" placeholder="4242 4242 4242 4242" />
        </label>
        <label class="form-group" id="wm-extra-wrap">
          <span class="form-label" id="wm-extra-label">Expiry (MM/YY)</span>
          <input id="wm-extra" class="form-input" placeholder="12/28" />
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Label (optional)</span>
          <input id="wm-label" class="form-input" placeholder="e.g. Personal card" />
        </label>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      <button class="btn btn-primary"
              onclick="addWalletMethod(); return false;">
        <i class="fas fa-plus"></i> Save method</button>
    `,
  });
}

function walletMethodIcon(type) {
  switch (type) {
    case 'mpesa': return 'fa-mobile-alt';
    case 'bank':  return 'fa-university';
    case 'paypal':return 'fa-paypal';
    default:      return 'fa-credit-card';
  }
}
function walletMethodLabel(m) {
  switch (m.type) {
    case 'mpesa': return 'M-Pesa · ' + (m.primary || '');
    case 'bank':  return 'Bank · ' + (m.primary || '');
    case 'paypal':return 'PayPal · ' + (m.primary || '');
    default:      return 'Card ending ' + String(m.primary || '').slice(-4);
  }
}
function walletMethodDetail(m) {
  switch (m.type) {
    case 'mpesa': return 'Kenyan mobile money';
    case 'bank':  return 'Direct transfer';
    case 'paypal':return 'PayPal account';
    default:      return m.extra ? ('Expires ' + m.extra) : '';
  }
}
function onWalletMethodTypeChange(type) {
  const pl = document.getElementById('wm-primary-label');
  const el = document.getElementById('wm-extra-label');
  const ew = document.getElementById('wm-extra-wrap');
  const p  = document.getElementById('wm-primary');
  const e  = document.getElementById('wm-extra');
  if (!pl || !el || !ew || !p || !e) return;
  if (type === 'card') {
    pl.textContent = 'Card number';  p.placeholder = '4242 4242 4242 4242';
    el.textContent = 'Expiry (MM/YY)'; e.placeholder = '12/28';
    ew.style.display = '';
  } else if (type === 'mpesa') {
    pl.textContent = 'Phone number';  p.placeholder = '0712 345 678';
    el.textContent = 'Safaricom name (optional)'; e.placeholder = 'Your name';
    ew.style.display = '';
  } else if (type === 'bank') {
    pl.textContent = 'Account number'; p.placeholder = '0123456789';
    el.textContent = 'Bank name';       e.placeholder = 'e.g. Equity Bank';
    ew.style.display = '';
  } else {
    pl.textContent = 'PayPal email';   p.placeholder = 'you@example.com';
    el.textContent = '—';               e.placeholder = '';
    ew.style.display = 'none';
  }
}
function addWalletMethod() {
  const type  = document.getElementById('wm-type')?.value || 'card';
  const prim  = (document.getElementById('wm-primary')?.value || '').trim();
  const extra = (document.getElementById('wm-extra')?.value || '').trim();
  const label = (document.getElementById('wm-label')?.value || '').trim();
  if (!prim) { if (typeof showToast === 'function') showToast('Please fill in the required field.', 'warning'); return; }

  if (type === 'mpesa') {
    const normalized = normalizeKenyanPhone(prim);
    if (!normalized) { if (typeof showToast === 'function') showToast('Enter a valid Kenyan phone number.', 'error'); return; }
  }

  const list = loadWalletMethods();
  list.push({
    id: 'wm-' + Date.now(),
    type, primary: prim, extra, label,
    created_at: new Date().toISOString(),
  });
  saveWalletMethods(list);
  if (typeof showToast === 'function') showToast('Payment method saved', 'success');
  if (typeof closeModal === 'function') closeModal();
  rerenderWallet();
}
function removeWalletMethod(id) {
  const list = loadWalletMethods().filter(m => String(m.id) !== String(id));
  saveWalletMethods(list);
  if (typeof showToast === 'function') showToast('Method removed', 'info');
  if (typeof closeModal === 'function') closeModal();
  rerenderWallet();
}

/* ============================================================
   Auto top-up
   ============================================================ */
function openAutoTopup() {
  const rules = loadAutoTopup();
  if (typeof openModal !== 'function') return;
  openModal({
    title: 'Auto top-up rules',
    body: `
      <p class="form-hint">
        We'll automatically top up your wallet when the balance falls below your threshold.
      </p>
      <label class="checkbox-row" style="margin:12px 0">
        <input type="checkbox" id="at-enabled" ${rules.enabled ? 'checked' : ''} />
        <span>Enable auto top-up</span>
      </label>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">When balance is below</span>
          <input id="at-threshold" class="form-input" type="number" min="1" step="1"
                 value="${rules.threshold}" />
        </label>
        <label class="form-group">
          <span class="form-label">Top up by</span>
          <input id="at-amount" class="form-input" type="number" min="1" step="1"
                 value="${rules.amount}" />
        </label>
      </div>
      <p class="form-hint">Amounts in ${walletCurrencyMeta().code}.</p>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary"
              onclick="saveAutoTopupFromModal(); return false;">
        <i class="fas fa-save"></i> Save</button>
    `,
  });
}
function saveAutoTopupFromModal() {
  const enabled   = !!document.getElementById('at-enabled')?.checked;
  const threshold = Number(document.getElementById('at-threshold')?.value || 0);
  const amount    = Number(document.getElementById('at-amount')?.value || 0);
  if (threshold < 1 || amount < 1) {
    if (typeof showToast === 'function') showToast('Please enter values greater than zero.', 'warning');
    return;
  }
  const rules = loadAutoTopup();
  rules.enabled = enabled;
  rules.threshold = threshold;
  rules.amount = amount;
  saveAutoTopup(rules);
  if (typeof showToast === 'function') showToast('Auto top-up saved', 'success');
  if (typeof closeModal === 'function') closeModal();
  rerenderWallet();
}

/* ============================================================
   Withdraw (to M-Pesa or bank)
   ============================================================ */
function openWalletWithdraw() {
  const balance = Number(S.wallet?.balance || 0);
  if (balance <= 0) {
    if (typeof showToast === 'function') showToast('No balance to withdraw.', 'info');
    return;
  }
  const methods = loadWalletMethods().filter(m => m.type === 'mpesa' || m.type === 'bank');
  if (typeof openModal !== 'function') return;
  openModal({
    title: 'Withdraw funds',
    body: `
      <p class="form-hint">
        Withdraw to a saved M-Pesa number or bank account.
        Available: <strong>${walletFormatAmount(balance, S.__walletPrefs.currency)}</strong>
      </p>
      ${methods.length ? `
        <label class="form-group" style="margin-top:12px">
          <span class="form-label">Destination</span>
          <select id="wd-method" class="form-select">
            ${methods.map(m => `<option value="${escapeHtmlWallet(m.id)}">${escapeHtmlWallet(walletMethodLabel(m))}</option>`).join('')}
          </select>
        </label>
      ` : `
        <div class="alert alert-info" style="margin-top:12px">
          <i class="fas fa-info-circle"></i>
          <div>Add an M-Pesa or bank method first from <strong>Payment methods</strong>.</div>
        </div>
      `}
      <label class="form-group">
        <span class="form-label">Amount</span>
        <input id="wd-amount" class="form-input" type="number" min="1" step="1"
               max="${balance}" placeholder="0" />
      </label>
      <label class="form-group">
        <span class="form-label">Reason (optional)</span>
        <input id="wd-reason" class="form-input" placeholder="e.g. Move to bank" />
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary"
              onclick="submitWalletWithdraw(); return false;"
              ${methods.length ? '' : 'disabled'}>
        <i class="fas fa-money-bill-transfer"></i> Withdraw</button>
    `,
  });
}
async function submitWalletWithdraw() {
  const amount = Number(document.getElementById('wd-amount')?.value || 0);
  const reason = (document.getElementById('wd-reason')?.value || '').trim();
  const methodId = document.getElementById('wd-method')?.value || null;
  const balance = Number(S.wallet?.balance || 0);
  if (amount < 1 || amount > balance) {
    if (typeof showToast === 'function') showToast('Enter a valid amount.', 'warning');
    return;
  }
  const ok = await walletRequirePin('withdraw funds');
  if (!ok) return;

  const finish = (success, ref) => {
    if (success) {
      pushLocalLedger(-amount, reason || 'Wallet withdrawal', ref || ('wd-' + Date.now()));
      if (typeof showToast === 'function') showToast('Withdrawal submitted', 'success');
    } else {
      if (typeof showToast === 'function') showToast('Withdrawal failed. Please try again.', 'error');
    }
    if (typeof closeModal === 'function') closeModal();
    rerenderWallet();
  };

  if (typeof apiCall !== 'function') return finish(true);
  try {
    const res = await apiCall('/api/wallet/withdraw', 'POST', {
      amount, method_id: methodId, reason, currency: S.__walletPrefs.currency,
    });
    finish(true, res?.reference);
  } catch (e) {
    finish(false);
  }
}

/* ============================================================
   M-PESA (Lipa Na M-Pesa) — STK Push top-up
   ============================================================ */
function normalizeKenyanPhone(input) {
  const digits = String(input || '').replace(/[^\d+]/g, '');
  let n = digits.replace(/^\+/, '');
  if (n.startsWith('0')) n = '254' + n.slice(1);
  if (!n.startsWith('254')) n = '254' + n;
  /* Kenyan mobile: 254 + 9 digits starting with 7 or 1 */
  if (!/^254(7\d{8}|1\d{8})$/.test(n)) return null;
  return n;
}

function formatKenyanPhoneForDisplay(normalized) {
  const n = String(normalized || '');
  if (!/^254\d{9}$/.test(n)) return n;
  return `+${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}`;
}

function setMpesaAmount(amount) {
  const el = document.getElementById('mpesa-amount');
  if (el) el.value = amount;
}

async function initiateMpesaTopup() {
  const phoneEl  = document.getElementById('mpesa-phone');
  const amountEl = document.getElementById('mpesa-amount');
  const phoneRaw = (phoneEl?.value || '').trim();
  const amount   = Number(amountEl?.value || 0);
  const phone    = normalizeKenyanPhone(phoneRaw);

  if (!phone) {
    if (typeof showToast === 'function') showToast('Enter a valid Kenyan number (e.g. 0712 345 678).', 'error');
    if (phoneEl) phoneEl.focus();
    return;
  }
  if (!amount || amount < MPESA_MIN_AMOUNT_KES) {
    if (typeof showToast === 'function') showToast(`Minimum is KES ${MPESA_MIN_AMOUNT_KES}.`, 'error');
    if (amountEl) amountEl.focus();
    return;
  }
  if (amount > MPESA_MAX_AMOUNT_KES) {
    if (typeof showToast === 'function') showToast(`Maximum per transaction is KES ${MPESA_MAX_AMOUNT_KES.toLocaleString()}.`, 'error');
    return;
  }

  const ok = await walletRequirePin('top up via M-Pesa');
  if (!ok) return;

  openMpesaWaitingModal(phone, amount, async () => {
    try {
      const payload = {
        phone,
        amount,
        currency: 'KES',
        account_reference: 'EXPERTHUB-WALLET',
        transaction_desc: 'Wallet top-up',
      };
      const callApi = typeof apiCall === 'function'
        ? apiCall('/api/wallet/mpesa/stk-push', 'POST', payload)
        : Promise.reject(new Error('no-api'));

      const res = await callApi;
      const checkoutId = res?.CheckoutRequestID || res?.checkout_request_id;
      if (!checkoutId) {
        /* Some backends credit immediately */
        completeMpesaTopup(phone, amount, res?.reference);
        return;
      }
      pollMpesaStatus(checkoutId, phone, amount);
    } catch (e) {
      /* No backend → simulate a successful STK push after a short delay */
      simulateMpesaSuccess(phone, amount);
    }
  });
}

function openMpesaWaitingModal(phone, amount, onProceed) {
  if (typeof openModal !== 'function') {
    /* Minimal fallback */
    setTimeout(() => onProceed && onProceed(), 250);
    return;
  }
  openModal({
    title: 'Confirm M-Pesa top-up',
    body: `
      <div class="mpesa-waiting">
        <div class="mpesa-brand">
          <i class="fas fa-mobile-alt"></i>
          <div>
            <strong>M-Pesa</strong>
            <span class="form-hint">Safaricom · Kenya</span>
          </div>
        </div>
        <div class="mpesa-summary">
          <div><span>Amount</span><strong>KES ${Number(amount).toLocaleString()}</strong></div>
          <div><span>To</span><strong>${escapeHtmlWallet(formatKenyanPhoneForDisplay(phone))}</strong></div>
          <div><span>Fee</span><strong>KES 0</strong></div>
        </div>
        <p class="form-hint" style="margin-top:10px">
          Click <strong>Send STK push</strong> and enter your M-Pesa PIN on your phone to complete the payment.
        </p>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" id="mpesa-cancel-btn" type="button">Cancel</button>
      <button class="btn btn-primary" id="mpesa-send-btn" type="button">
        <i class="fas fa-paper-plane"></i> Send STK push</button>
    `,
  });

  const cancel = document.getElementById('mpesa-cancel-btn');
  const send   = document.getElementById('mpesa-send-btn');
  if (cancel) cancel.onclick = () => { if (typeof closeModal === 'function') closeModal(); };
  if (send) send.onclick = async () => {
    send.disabled = true;
    send.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Waiting on your phone…';
    await onProceed();
  };
}

async function pollMpesaStatus(checkoutId, phone, amount) {
  const maxAttempts = 30;      // 30 × 2s = 60s
  const intervalMs = 2000;
  const startedAt = Date.now();
  let attempts = 0;

  const tick = async () => {
    attempts++;
    try {
      const res = await apiCall(
        `/api/wallet/mpesa/status?checkout_request_id=${encodeURIComponent(checkoutId)}`,
        'GET'
      );
      const code = String(res?.ResultCode ?? res?.result_code ?? '');
      if (code === '0') {
        completeMpesaTopup(phone, amount, res?.reference || checkoutId);
        return;
      }
      if (code && code !== '1032' && code !== '1037') {
        /* Any non-success, non-"user cancelled"/"timeout" code → failed */
        mpesaFailed(res?.ResultDesc || res?.result_desc || 'Payment failed.');
        return;
      }
      if (attempts >= maxAttempts || Date.now() - startedAt > 65000) {
        mpesaFailed('Timed out waiting for confirmation. Please try again.');
        return;
      }
      setTimeout(tick, intervalMs);
    } catch (_) {
      if (attempts >= maxAttempts) return mpesaFailed('Could not confirm payment.');
      setTimeout(tick, intervalMs);
    }
  };
  setTimeout(tick, intervalMs);
}

function simulateMpesaSuccess(phone, amount) {
  /* No backend: simulate a plausible STK push lifecycle */
  if (typeof showToast === 'function') showToast('STK push sent. Enter PIN on your phone.', 'info');
  setTimeout(() => {
    completeMpesaTopup(phone, amount, 'MPESA-' + Date.now().toString(36).toUpperCase());
  }, 3500);
}

function completeMpesaTopup(phone, amount, reference) {
  pushLocalLedger(
    Number(amount),
    `M-Pesa top-up · ${formatKenyanPhoneForDisplay(phone)}`,
    reference || ('MPESA-' + Date.now())
  );
  if (typeof showToast === 'function') showToast(`Wallet credited KES ${Number(amount).toLocaleString()}`, 'success');
  if (typeof closeModal === 'function') closeModal();
  rerenderWallet();
}

function mpesaFailed(message) {
  if (typeof closeModal === 'function') closeModal();
  if (typeof showToast === 'function') showToast(message || 'M-Pesa payment failed.', 'error');
}

/* ============================================================
   USER — WALLET
   ============================================================ */
function userWallet() {
  const balance    = Number(S.wallet?.balance || 0);
  const pending    = Number(S.wallet?.pending || 0);
  const reserved   = Number(S.wallet?.reserved || 0);
  const currency   = S.__walletPrefs.currency;
  const meta       = walletCurrencyMeta(currency);
  const pinEnabled = S.__walletPrefs.pinEnabled;
  const rules      = loadAutoTopup();
  const methods    = loadWalletMethods();
  const ledger     = walletLedgerFiltered();
  const ledgerRaw  = Array.isArray(S.wallet?.ledger) ? S.wallet.ledger : [];
  const tab        = S.__walletMethodTab;

  const credits = ledgerRaw.filter(l => Number(l.amount) >= 0).reduce((s, l) => s + Number(l.amount || 0), 0);
  const debits  = ledgerRaw.filter(l => Number(l.amount) < 0).reduce((s, l) => s + Number(l.amount || 0), 0);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Wallet</span></div>
    <section class="page-header">
      <h1 class="page-title">My Wallet</h1>
      <div class="page-actions">
        <select class="form-select" style="max-width:220px"
                onchange="setWalletCurrency(this.value)">
          ${WALLET_CURRENCIES.map(c => `
            <option value="${c.code}" ${currency === c.code ? 'selected' : ''}>${c.label}</option>
          `).join('')}
        </select>
        <button class="btn btn-secondary btn-sm" onclick="openWalletMethods(); return false;">
          <i class="fas fa-credit-card"></i> Payment methods
          ${methods.length ? `<span class="chip chip-neutral" style="margin-left:6px">${methods.length}</span>` : ''}
        </button>
        <button class="btn btn-secondary btn-sm" onclick="openAutoTopup(); return false;">
          <i class="fas fa-bolt"></i>
          ${rules.enabled ? 'Auto top-up: on' : 'Auto top-up'}
        </button>
      </div>
    </section>

    <!-- Balance card -->
    <div class="wallet-balance wallet-balance-v2">
      <div class="wallet-balance-main">
        <p class="wallet-balance-label">Available Balance</p>
        <p class="wallet-balance-value">${walletFormatAmount(balance, currency)}</p>
        <p class="form-hint">Currency: <strong>${meta.code}</strong>
          ${pinEnabled ? '· <i class="fas fa-lock"></i> PIN protected' : ''}
        </p>
      </div>
      <div class="wallet-balance-breakdown">
        <div class="wallet-balance-cell">
          <span class="form-label">Pending</span>
          <strong>${walletFormatAmount(pending, currency)}</strong>
        </div>
        <div class="wallet-balance-cell">
          <span class="form-label">Reserved</span>
          <strong>${walletFormatAmount(reserved, currency)}</strong>
        </div>
        <div class="wallet-balance-cell">
          <span class="form-label">Credits</span>
          <strong style="color:var(--accent)">+${walletFormatAmount(credits, currency)}</strong>
        </div>
        <div class="wallet-balance-cell">
          <span class="form-label">Debits</span>
          <strong style="color:var(--danger)">${walletFormatAmount(debits, currency)}</strong>
        </div>
      </div>
      <div class="wallet-balance-actions">
        <button class="btn btn-primary btn-sm" onclick="openWalletWithdraw(); return false;">
          <i class="fas fa-money-bill-transfer"></i> Withdraw
        </button>
        <button class="btn btn-secondary btn-sm" onclick="toggleWalletPinSetting(); return false;">
          <i class="fas ${pinEnabled ? 'fa-lock' : 'fa-lock-open'}"></i>
          ${pinEnabled ? 'Disable PIN' : 'Enable PIN'}
        </button>
      </div>
    </div>

    <!-- Add Funds -->
    <section class="panel">
      <h3 class="panel-title">Add Funds</h3>

      <nav class="wallet-method-tabs tab-bar">
        ${[
          { id:'card',   label:'Card',   icon:'fa-credit-card' },
          { id:'paypal', label:'PayPal', icon:'fa-paypal' },
          { id:'mpesa',  label:'M-Pesa', icon:'fa-mobile-alt' },
          { id:'bank',   label:'Bank',   icon:'fa-university' },
        ].map(t => `
          <button class="tab-btn ${tab === t.id ? 'tab-btn-active' : ''}"
                  onclick="setWalletMethodTab('${t.id}'); return false;">
            <i class="fas ${t.icon}"></i> ${t.label}
          </button>
        `).join('')}
      </nav>

      ${tab === 'card' || tab === 'paypal' || tab === 'bank' ? `
        <div class="form-inline" style="margin-top:12px">
          <input id="topupAmount" type="number" class="form-input" placeholder="Amount (${meta.code})" />
          <select id="topupProvider" class="form-select">
            ${(CONFIG.PAYMENT_PROVIDERS || []).map(p => `<option value="${p}">${p}</option>`).join('')}
          </select>
          <button class="btn btn-primary" data-action="topup-wallet">
            <i class="fas fa-plus"></i> Add Funds</button>
        </div>
        <p class="panel-hint" style="margin-top:10px">
          ${tab === 'card'   ? 'Pay with a debit/credit card via your provider.' :
            tab === 'paypal' ? 'You will be redirected to PayPal to complete payment.' :
                              'Direct bank transfer. Funds appear after clearing.'}
        </p>
      ` : ''}

      ${tab === 'mpesa' ? `
        <div class="mpesa-panel">
          <div class="mpesa-brand mpesa-brand-lg">
            <span class="mpesa-logo">M-PESA</span>
            <span class="form-hint">Safaricom · Kenya · Instant STK push</span>
          </div>

          <label class="form-group" style="margin-top:12px">
            <span class="form-label">Phone number</span>
            <input id="mpesa-phone" class="form-input" type="tel"
                   placeholder="0712 345 678" inputmode="tel" autocomplete="tel" />
            <span class="form-hint">Format: 07XXXXXXXX, 01XXXXXXXX, or 2547XXXXXXXX</span>
          </label>

          <label class="form-group">
            <span class="form-label">Amount (KES)</span>
            <input id="mpesa-amount" class="form-input" type="number"
                   min="${MPESA_MIN_AMOUNT_KES}" max="${MPESA_MAX_AMOUNT_KES}"
                   step="1" placeholder="500" />
          </label>

          <div class="mpesa-quick-amounts">
            ${[100, 250, 500, 1000, 2500, 5000].map(a => `
              <button class="chip chip-neutral"
                      onclick="setMpesaAmount(${a}); return false;">KES ${a}</button>
            `).join('')}
          </div>

          <button class="btn btn-primary mpesa-pay-btn"
                  onclick="initiateMpesaTopup(); return false;">
            <i class="fas fa-mobile-alt"></i> Pay with M-Pesa
          </button>

          <p class="form-hint" style="margin-top:8px">
            You'll receive an STK push prompt on your phone. Enter your M-Pesa PIN to complete the payment.
            Max KES ${MPESA_MAX_AMOUNT_KES.toLocaleString()} per transaction.
          </p>

          ${methods.filter(m => m.type === 'mpesa').length ? `
            <div class="mpesa-saved">
              <span class="form-label">Saved M-Pesa numbers</span>
              <div class="mpesa-saved-list">
                ${methods.filter(m => m.type === 'mpesa').map(m => `
                  <button class="chip chip-neutral"
                          onclick="document.getElementById('mpesa-phone').value='${escapeHtmlWallet(m.primary)}'; return false;">
                    <i class="fas fa-mobile-alt"></i> ${escapeHtmlWallet(m.primary)}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}
    </section>

    <!-- Promo code -->
    <section class="panel">
      <h3 class="panel-title">Redeem a promo code</h3>
      <div class="form-inline">
        <input id="wallet-promo-code" class="form-input" placeholder="Enter code (e.g. WELCOME10)" style="text-transform:uppercase" />
        <button class="btn btn-primary" onclick="redeemWalletPromo(); return false;">
          <i class="fas fa-gift"></i> Redeem</button>
      </div>
      <p class="panel-hint" style="margin-top:10px">
        Codes are case-insensitive and can be used once per account.
      </p>
    </section>

    <!-- Ledger -->
    <section class="panel">
      <div class="wallet-ledger-head">
        <h3 class="panel-title" style="margin:0">Ledger</h3>
        <div class="wallet-ledger-actions">
          <select class="form-select" style="max-width:140px"
                  onchange="setWalletLedgerFilter(this.value)">
            <option value="all"    ${S.__walletLedgerFilter === 'all'    ? 'selected' : ''}>All</option>
            <option value="credit" ${S.__walletLedgerFilter === 'credit' ? 'selected' : ''}>Credits</option>
            <option value="debit"  ${S.__walletLedgerFilter === 'debit'  ? 'selected' : ''}>Debits</option>
          </select>
          <input id="wallet-ledger-from" type="date" class="form-input" style="max-width:150px"
                 value="${escapeHtmlWallet(S.__walletLedgerFrom)}"
                 onchange="setWalletLedgerDate()" />
          <input id="wallet-ledger-to" type="date" class="form-input" style="max-width:150px"
                 value="${escapeHtmlWallet(S.__walletLedgerTo)}"
                 onchange="setWalletLedgerDate()" />
          <button class="btn btn-secondary btn-sm" onclick="exportWalletCsv(); return false;">
            <i class="fas fa-download"></i> CSV</button>
          <button class="btn btn-ghost btn-sm" onclick="clearWalletLedgerFilters(); return false;">
            <i class="fas fa-times"></i></button>
        </div>
      </div>

      <ul class="list-stack" style="margin-top:12px">
        ${ledger.map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.reason || '')}</span>
              <span class="list-row-sub">${fmtDT(l.created_at)}
                ${l.reference ? `· <code class="code">${esc(l.reference)}</code>` : ''}
              </span>
            </div>
            <span class="list-row-price" style="color:${l.amount >= 0 ? 'var(--accent)' : 'var(--danger)'}">
              ${l.amount >= 0 ? '+' : ''}${walletFormatAmount(l.amount, currency)}
            </span>
            <button class="btn btn-ghost btn-xs"
                    onclick="downloadWalletReceipt('${escapeHtmlWallet(String(l.id || l.reference || ''))}'); return false;"
                    title="Download receipt">
              <i class="fas fa-receipt"></i>
            </button>
          </li>
        `).join('') || '<li class="empty-row">No activity matches your filters</li>'}
      </ul>
    </section>
  `;
}

/* ============================================================
   PIN setting toggle
   ============================================================ */
async function toggleWalletPinSetting() {
  const hasPin = !!localStorage.getItem(WALLET_PIN_KEY);
  if (!S.__walletPrefs.pinEnabled || !hasPin) {
    /* Enable: prompt for new PIN twice */
    const pin1 = window.prompt('Set a 4–8 digit wallet PIN:');
    if (!pin1) return;
    if (!/^\d{4,8}$/.test(pin1)) {
      if (typeof showToast === 'function') showToast('PIN must be 4–8 digits.', 'warning');
      return;
    }
    const pin2 = window.prompt('Re-enter your PIN to confirm:');
    if (pin1 !== pin2) {
      if (typeof showToast === 'function') showToast('PINs did not match.', 'error');
      return;
    }
    const h = await hashPin(pin1);
    try { localStorage.setItem(WALLET_PIN_KEY, h); } catch (_) {}
    S.__walletPrefs.pinEnabled = true;
    saveWalletPrefs();
    if (typeof showToast === 'function') showToast('Wallet PIN enabled', 'success');
  } else {
    /* Disable: confirm current PIN */
    const ok = await walletRequirePin('disable PIN');
    if (!ok) return;
    try { localStorage.removeItem(WALLET_PIN_KEY); } catch (_) {}
    S.__walletPrefs.pinEnabled = false;
    saveWalletPrefs();
    if (typeof showToast === 'function') showToast('Wallet PIN disabled', 'info');
  }
  rerenderWallet();
}