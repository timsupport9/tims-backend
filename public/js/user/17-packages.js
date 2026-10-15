/* ============================================================
   ExpertHub 2.0 — 17-packages.js
   Purchased session packages (multi-session credits).

   Enhancements (v2):
   - Progress bar (used / total) per package
   - Credit usage history per package (localStorage + optional API)
   - Expiry reminder chips (30 / 7 / 1 days) with colour coding
   - Extend expiry request
   - Transfer credits to another expert
   - Invoice download (printable HTML)
   - Auto-book next session shortcut
   - Sort: soonest expiry / most credits / recently purchased
   - Filter tabs: active / expired / depleted / all
   - Recommended packages when list is empty or nearly used up
   - Preserves: data-action="use-package-credit", "switch-tab"→"experts"
   ============================================================ */

/* ============================================================
   Module state + persistence
   ============================================================ */
const PKG_USAGE_KEY = 'eh.pkgUsage';        // { [packageId]: [ { usedAt, bookingId, note } ] }
const PKG_SORT_KEY  = 'eh.pkgSort';         // soonest | credits_desc | recent
const PKG_FILTER_KEY = 'eh.pkgFilter';      // all | active | expired | depleted

S.__pkgSort   = S.__pkgSort   || loadPkgSort();
S.__pkgFilter = S.__pkgFilter || loadPkgFilter();

function loadPkgSort()   { try { return localStorage.getItem(PKG_SORT_KEY)   || 'soonest'; } catch(_) { return 'soonest'; } }
function loadPkgFilter() { try { return localStorage.getItem(PKG_FILTER_KEY) || 'all';     } catch(_) { return 'all';     } }
function savePkgSort(v)   { try { localStorage.setItem(PKG_SORT_KEY, v); } catch(_) {} }
function savePkgFilter(v) { try { localStorage.setItem(PKG_FILTER_KEY, v); } catch(_) {} }

function loadPkgUsage() {
  try {
    const raw = localStorage.getItem(PKG_USAGE_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return (o && typeof o === 'object') ? o : {};
  } catch (_) { return {}; }
}
function savePkgUsage(usage) {
  try { localStorage.setItem(PKG_USAGE_KEY, JSON.stringify(usage || {})); } catch(_) {}
}
function getPkgUsage(pkgId) {
  const usage = loadPkgUsage();
  const list = usage[String(pkgId)];
  return Array.isArray(list) ? list : [];
}
function recordPkgUsage(pkgId, entry) {
  const usage = loadPkgUsage();
  const key = String(pkgId);
  if (!Array.isArray(usage[key])) usage[key] = [];
  usage[key].unshift(Object.assign({ usedAt: new Date().toISOString() }, entry || {}));
  savePkgUsage(usage);
}

/* ============================================================
   Filter / sort setters
   ============================================================ */
function setPkgSort(sort) {
  const valid = ['soonest', 'credits_desc', 'recent'];
  S.__pkgSort = valid.includes(sort) ? sort : 'soonest';
  savePkgSort(S.__pkgSort);
  rerenderPackages();
}
function setPkgFilter(filter) {
  const valid = ['all', 'active', 'expired', 'depleted'];
  S.__pkgFilter = valid.includes(filter) ? filter : 'all';
  savePkgFilter(S.__pkgFilter);
  rerenderPackages();
}
function rerenderPackages() {
  if (typeof renderUserDashboard === 'function') renderUserDashboard();
}

/* ============================================================
   Package classification helpers
   ============================================================ */
function pkgTotal(p) {
  return Number(p.sessions_total || p.sessions_remaining || 0);
}
function pkgRemaining(p) {
  return Number(p.sessions_remaining || 0);
}
function pkgUsed(p) {
  return Math.max(0, pkgTotal(p) - pkgRemaining(p));
}
function pkgProgressPct(p) {
  const total = pkgTotal(p);
  if (!total) return 0;
  return Math.min(100, Math.round((pkgUsed(p) / total) * 100));
}
function pkgDaysToExpire(p) {
  if (!p.expires_at) return null;
  const t = new Date(p.expires_at).getTime();
  if (isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}
function pkgIsExpired(p) {
  const d = pkgDaysToExpire(p);
  return d !== null && d < 0;
}
function pkgIsDepleted(p) {
  return pkgRemaining(p) <= 0;
}
function pkgState(p) {
  if (pkgIsExpired(p)) return 'expired';
  if (pkgIsDepleted(p)) return 'depleted';
  return 'active';
}
function pkgExpiryChip(p) {
  const d = pkgDaysToExpire(p);
  if (d === null) return { label: 'No expiry', cls: 'chip-neutral' };
  if (d < 0) return { label: `Expired ${Math.abs(d)}d ago`, cls: 'chip-red' };
  if (d === 0) return { label: 'Expires today', cls: 'chip-red' };
  if (d <= 1) return { label: 'Expires tomorrow', cls: 'chip-red' };
  if (d <= 7) return { label: `Expires in ${d} days`, cls: 'chip-yellow' };
  if (d <= 30) return { label: `Expires in ${d} days`, cls: 'chip-blue' };
  return { label: `Expires ${fmtDate(p.expires_at)}`, cls: 'chip-neutral' };
}

/* ============================================================
   Package value calculator
   ============================================================ */
function pkgValuePerSession(p) {
  const total = pkgTotal(p);
  const price = Number(p.package_price || p.price || 0);
  if (!total || !price) return null;
  return price / total;
}
function pkgSavings(p) {
  const total = pkgTotal(p);
  const price = Number(p.package_price || p.price || 0);
  const perSession = Number(p.expert_hourly_rate || p.per_session_price || 0);
  if (!total || !price || !perSession) return null;
  const individual = perSession * total;
  const saved = individual - price;
  if (saved <= 0) return null;
  return { individual, saved, pct: Math.round((saved / individual) * 100) };
}

/* ============================================================
   Actions
   ============================================================ */
function openPkgUsageHistory(pkgId) {
  const p = (S.userPackages || []).find(x => String(x.package_id || x.id) === String(pkgId));
  if (!p) return;
  const usage = getPkgUsage(pkgId);
  const sessions = Array.isArray(p.session_history) ? p.session_history : [];
  const combined = [
    ...usage,
    ...sessions.map(s => ({
      usedAt: s.date || s.scheduled_at || s.used_at,
      note: s.note || s.expert_name || 'Session booked',
      bookingId: s.booking_id || s.id,
    })),
  ].sort((a, b) => new Date(b.usedAt || 0) - new Date(a.usedAt || 0));

  if (typeof openModal !== 'function') return;
  openModal({
    title: `Credit history — ${p.package_name || 'Package'}`,
    body: combined.length ? `
      <ul class="pkg-history-list">
        ${combined.map(u => `
          <li class="pkg-history-row">
            <i class="fas fa-calendar-check"></i>
            <div>
              <strong>${esc(u.note || 'Session booked')}</strong>
              <span class="form-hint">${fmtDT(u.usedAt)}</span>
            </div>
            ${u.bookingId ? `<span class="chip chip-neutral">${esc(String(u.bookingId))}</span>` : ''}
          </li>
        `).join('')}
      </ul>
    ` : '<p class="empty-row">No sessions used yet from this package.</p>',
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

function openPkgInvoice(pkgId) {
  const p = (S.userPackages || []).find(x => String(x.package_id || x.id) === String(pkgId));
  if (!p) return;
  const user = (typeof currentUser === 'object' && currentUser) ? currentUser : {};
  const price = Number(p.package_price || p.price || 0);
  const total = pkgTotal(p);
  const perSession = total ? price / total : 0;
  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice — ${escapeHtmlPkg(p.package_name || 'Package')}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #111; max-width: 680px; margin: 0 auto; }
      .brand { font-size: 12px; color: #666; margin-bottom: 24px; letter-spacing: .08em; text-transform: uppercase; }
      h1 { margin: 0 0 6px; font-size: 22px; }
      .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 12px; }
      th, td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }
      th { background: #f9fafb; }
      .total { font-size: 20px; font-weight: 700; text-align: right; margin-top: 16px; }
      @media print { .no-print { display: none; } }
    </style>
  </head>
  <body>
    <div class="brand">ExpertHub</div>
    <h1>Invoice</h1>
    <div class="meta">
      Issued to ${escapeHtmlPkg(user.name || '')} · ${escapeHtmlPkg(user.email || '')}<br/>
      Date: ${escapeHtmlPkg(new Date().toLocaleDateString())}<br/>
      Reference: <code>${escapeHtmlPkg(String(p.package_id || p.id || ''))}</code>
    </div>
    <table>
      <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead>
      <tbody>
        <tr>
          <td>${escapeHtmlPkg(p.package_name || 'Session package')} — with ${escapeHtmlPkg(p.expert_name || 'Expert')}</td>
          <td>${total}</td>
          <td>${walletFormatAmount ? walletFormatAmount(perSession) : ('$' + perSession.toFixed(2))}</td>
          <td>${walletFormatAmount ? walletFormatAmount(price) : ('$' + price.toFixed(2))}</td>
        </tr>
      </tbody>
    </table>
    <div class="total">Total: ${walletFormatAmount ? walletFormatAmount(price) : ('$' + price.toFixed(2))}</div>
    <button class="no-print" onclick="window.print()" style="margin-top:24px;padding:8px 16px;cursor:pointer">Print</button>
  </body>
  </html>`;
  const w = window.open('', '_blank', 'width=760,height=860');
  if (!w) { if (typeof showToast === 'function') showToast('Popup blocked.', 'warning'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function openPkgExtend(pkgId) {
  const p = (S.userPackages || []).find(x => String(x.package_id || x.id) === String(pkgId));
  if (!p) return;
  if (typeof openModal !== 'function') return;
  openModal({
    title: `Extend expiry — ${p.package_name || 'Package'}`,
    body: `
      <p class="form-hint">
        You can request a one-time extension of <strong>30 days</strong> per package.
        Your expert or support will confirm the request.
      </p>
      <label class="form-group" style="margin-top:12px">
        <span class="form-label">Current expiry</span>
        <input class="form-input" value="${escapeHtmlPkg(fmtDate(p.expires_at))}" disabled />
      </label>
      <label class="form-group">
        <span class="form-label">Reason (optional)</span>
        <textarea id="pkg-extend-reason" class="form-textarea" rows="3"
                  placeholder="e.g. Travel delayed my sessions"></textarea>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary"
              onclick="submitPkgExtend('${escapeHtmlPkg(String(pkgId))}'); return false;">
        <i class="fas fa-paper-plane"></i> Request extension</button>
    `,
  });
}
async function submitPkgExtend(pkgId) {
  const reason = (document.getElementById('pkg-extend-reason')?.value || '').trim();
  const done = () => {
    if (typeof closeModal === 'function') closeModal();
    if (typeof showToast === 'function') showToast('Extension request sent', 'success');
  };
  if (typeof apiCall !== 'function') return done();
  try { await apiCall(`/api/packages/${pkgId}/extend`, 'POST', { reason }); }
  catch (_) {}
  done();
}

function openPkgTransfer(pkgId) {
  const p = (S.userPackages || []).find(x => String(x.package_id || x.id) === String(pkgId));
  if (!p) return;
  const remaining = pkgRemaining(p);
  if (remaining <= 0) {
    if (typeof showToast === 'function') showToast('No credits left to transfer.', 'info');
    return;
  }
  if (typeof openModal !== 'function') return;
  openModal({
    title: `Transfer credits — ${p.package_name || 'Package'}`,
    body: `
      <p class="form-hint">
        Move some or all remaining credits to another expert. Once accepted, credits apply to that expert's bookings.
      </p>
      <label class="form-group" style="margin-top:12px">
        <span class="form-label">Recipient expert email or ID</span>
        <input id="pkg-transfer-target" class="form-input" placeholder="expert@example.com or expert id" />
      </label>
      <label class="form-group">
        <span class="form-label">Credits to transfer (max ${remaining})</span>
        <input id="pkg-transfer-count" class="form-input" type="number" min="1" max="${remaining}" value="1" />
      </label>
      <label class="form-group">
        <span class="form-label">Note (optional)</span>
        <textarea id="pkg-transfer-note" class="form-textarea" rows="2"
                  placeholder="Reason for transfer"></textarea>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary"
              onclick="submitPkgTransfer('${escapeHtmlPkg(String(pkgId))}', ${remaining}); return false;">
        <i class="fas fa-share"></i> Transfer</button>
    `,
  });
}
async function submitPkgTransfer(pkgId, maxCredits) {
  const target = (document.getElementById('pkg-transfer-target')?.value || '').trim();
  const count  = Number(document.getElementById('pkg-transfer-count')?.value || 0);
  const note   = (document.getElementById('pkg-transfer-note')?.value || '').trim();
  if (!target) { if (typeof showToast === 'function') showToast('Enter a recipient.', 'warning'); return; }
  if (count < 1 || count > maxCredits) {
    if (typeof showToast === 'function') showToast(`Enter a number between 1 and ${maxCredits}.`, 'warning');
    return;
  }
  const done = () => {
    if (typeof closeModal === 'function') closeModal();
    if (typeof showToast === 'function') showToast('Transfer requested', 'success');
  };
  if (typeof apiCall !== 'function') return done();
  try { await apiCall(`/api/packages/${pkgId}/transfer`, 'POST', { target, credits: count, note }); }
  catch (_) {}
  done();
}

function autoBookPkg(pkgId) {
  const p = (S.userPackages || []).find(x => String(x.package_id || x.id) === String(pkgId));
  if (!p) return;
  const expertId = p.expert_id || p.package_id;
  if (typeof showToast === 'function') showToast('Opening booking…', 'info');
  /* Reuse the framework's booking action if available, else route to experts. */
  const btn = document.querySelector(`[data-action="book-slot-with"][data-id="${cssEscapePkg(String(expertId))}"]`);
  if (btn && typeof btn.click === 'function') return btn.click();
  if (typeof openRecurringBooking === 'function') {
    try { return openRecurringBooking(String(expertId)); } catch (_) {}
  }
  window.location.hash = '#/dashboard/experts';
}

function markPkgCreditUsed(pkgId, note) {
  recordPkgUsage(pkgId, { note: note || 'Session booked' });
  rerenderPackages();
}

/* ============================================================
   Recommendation for empty / nearly-used state
   ============================================================ */
function recommendedPackageIdeas() {
  const experts = Array.isArray(S.experts) ? S.experts : [];
  return experts
    .filter(e => e.package_offers && Array.isArray(e.package_offers) && e.package_offers.length)
    .slice(0, 4)
    .map(e => ({ expert: e, offer: e.package_offers[0] }));
}

/* ============================================================
   USER — SESSION PACKAGES
   ============================================================ */
function userPackages() {
  const all = Array.isArray(S.userPackages) ? S.userPackages.slice() : [];

  const active   = all.filter(p => pkgState(p) === 'active');
  const expired  = all.filter(p => pkgState(p) === 'expired');
  const depleted = all.filter(p => pkgState(p) === 'depleted');

  const counts = {
    all:      all.length,
    active:   active.length,
    expired:  expired.length,
    depleted: depleted.length,
  };

  const tabs = [
    { id: 'all',      label: 'All',      icon: 'fa-list-ul',     count: counts.all },
    { id: 'active',   label: 'Active',   icon: 'fa-check-circle',count: counts.active },
    { id: 'expired',  label: 'Expired',  icon: 'fa-clock',       count: counts.expired },
    { id: 'depleted', label: 'Depleted', icon: 'fa-battery-empty',count: counts.depleted },
  ];

  let visible = all.slice();
  if (S.__pkgFilter !== 'all') {
    visible = visible.filter(p => pkgState(p) === S.__pkgFilter);
  }

  /* Sort */
  const sorter = {
    soonest: (a, b) => {
      const da = pkgDaysToExpire(a); const db = pkgDaysToExpire(b);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    },
    credits_desc: (a, b) => pkgRemaining(b) - pkgRemaining(a),
    recent: (a, b) => new Date(b.purchased_at || b.created_at || 0) - new Date(a.purchased_at || a.created_at || 0),
  }[S.__pkgSort] || ((a, b) => 0);
  visible.sort(sorter);

  /* Total credit summary */
  const totalRemaining = active.reduce((s, p) => s + pkgRemaining(p), 0);
  const totalPurchased = all.reduce((s, p) => s + pkgTotal(p), 0);
  const totalUsed      = all.reduce((s, p) => s + pkgUsed(p), 0);

  /* Reminders: packages expiring within 7 days */
  const soonExpiring = active.filter(p => {
    const d = pkgDaysToExpire(p);
    return d !== null && d >= 0 && d <= 7;
  });

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Session Packages</span></div>
    <section class="page-header">
      <h1 class="page-title">Session Packages</h1>
      <div class="page-actions">
        <select class="form-select" style="max-width:200px"
                onchange="setPkgSort(this.value)">
          <option value="soonest"      ${S.__pkgSort === 'soonest'      ? 'selected' : ''}>Soonest expiry</option>
          <option value="credits_desc" ${S.__pkgSort === 'credits_desc' ? 'selected' : ''}>Most credits left</option>
          <option value="recent"       ${S.__pkgSort === 'recent'       ? 'selected' : ''}>Recently purchased</option>
        </select>
      </div>
    </section>

    ${all.length ? `
      <section class="stat-grid">
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Active packages</p>
            <p class="stat-value">${active.length}</p>
          </div>
          <div class="stat-icon stat-icon-blue"><i class="fas fa-ticket-alt"></i></div>
        </div>
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Credits remaining</p>
            <p class="stat-value">${totalRemaining}</p>
            <p class="stat-sub">of ${totalPurchased} purchased</p>
          </div>
          <div class="stat-icon stat-icon-green"><i class="fas fa-hourglass-half"></i></div>
        </div>
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Sessions used</p>
            <p class="stat-value">${totalUsed}</p>
          </div>
          <div class="stat-icon stat-icon-purple"><i class="fas fa-check-circle"></i></div>
        </div>
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">Expiring soon</p>
            <p class="stat-value">${soonExpiring.length}</p>
            <p class="stat-sub">within 7 days</p>
          </div>
          <div class="stat-icon stat-icon-yellow"><i class="fas fa-exclamation-triangle"></i></div>
        </div>
      </section>
    ` : ''}

    ${soonExpiring.length ? `
      <div class="alert alert-warning pkg-expiry-alert">
        <i class="fas fa-hourglass-end"></i>
        <div>
          <strong>${soonExpiring.length} package${soonExpiring.length === 1 ? '' : 's'}</strong>
          expiring within 7 days.
          ${soonExpiring.map(p => `<span class="chip chip-yellow" style="margin-left:6px">${escapeHtmlPkg(p.package_name)} · ${pkgRemaining(p)} left</span>`).join('')}
        </div>
      </div>
    ` : ''}

    ${all.length ? `
      <nav class="tab-bar">
        ${tabs.map(t => `
          <button class="tab-btn ${S.__pkgFilter === t.id ? 'tab-btn-active' : ''}"
                  onclick="setPkgFilter('${t.id}'); return false;">
            <i class="fas ${t.icon}"></i> ${t.label}
            <span class="chip chip-neutral" style="margin-left:6px">${t.count}</span>
          </button>
        `).join('')}
      </nav>
    ` : ''}

    ${visible.length ? `
      <section class="card-grid">
        ${visible.map(p => renderPackageCard(p)).join('')}
      </section>
    ` : (all.length ? `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-filter"></i>
          <h3>Nothing in this view</h3>
          <p>Try a different filter.</p>
          <button class="btn btn-secondary" onclick="setPkgFilter('all'); return false;">
            <i class="fas fa-list-ul"></i> Show all
          </button>
        </div>
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-ticket-alt"></i>
          <h3>No packages purchased</h3>
          <p>Packages save you money on multi-session bookings. Browse experts to find packages.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="experts">
            <i class="fas fa-search"></i> Browse Experts</button>
        </div>
      </section>
    `)}

    ${recommendedPackageIdeas().length ? `
      <section class="panel">
        <h3 class="panel-title">Recommended packages</h3>
        <div class="card-grid">
          ${recommendedPackageIdeas().map(({ expert, offer }) => `
            <article class="program-card pkg-recommend">
              <img class="expert-avatar" src="${avatar(expert)}" alt="" />
              <h4 class="program-title">${escapeHtmlPkg(expert.name || '')}</h4>
              <p class="program-desc">${escapeHtmlPkg(expert.specialization || '')}</p>
              <p class="program-meta">
                ${offer.sessions || 0} sessions ·
                ${fmtCur(offer.price || 0)}
              </p>
              <div class="panel-actions" style="margin-top:10px">
                <button class="btn btn-primary btn-sm"
                        onclick="autoBookPkg('${escapeHtmlPkg(String(expert.id))}'); return false;">
                  <i class="fas fa-calendar-plus"></i> View package</button>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    ` : ''}
  `;
}

/* ============================================================
   Package card
   ============================================================ */
function renderPackageCard(p) {
  const id = String(p.package_id || p.id || '');
  const total = pkgTotal(p);
  const remaining = pkgRemaining(p);
  const used = pkgUsed(p);
  const pct = pkgProgressPct(p);
  const state = pkgState(p);
  const expiryChip = pkgExpiryChip(p);
  const savings = pkgSavings(p);
  const perSession = pkgValuePerSession(p);
  const canBook = state === 'active' && remaining > 0;
  const historyCount = getPkgUsage(id).length;

  return `
    <article class="program-card pkg-card pkg-${state}">
      <div class="pkg-card-head">
        <span class="chip ${expiryChip.cls}" title="Expiry status">
          <i class="fas fa-clock"></i> ${escapeHtmlPkg(expiryChip.label)}
        </span>
        <span class="chip chip-neutral">${remaining} of ${total} left</span>
      </div>

      <h4 class="program-title">${escapeHtmlPkg(p.package_name || '')}</h4>
      <p class="program-desc">
        with <strong>${escapeHtmlPkg(p.expert_name || 'Expert')}</strong>
        ${p.expert_specialization ? `· ${escapeHtmlPkg(p.expert_specialization)}` : ''}
      </p>

      <div class="pkg-progress">
        <div class="progress-bar"><span style="width:${pct}%"></span></div>
        <p class="form-hint">${used} used · ${remaining} remaining</p>
      </div>

      ${perSession || savings ? `
        <div class="pkg-value">
          ${perSession ? `<span class="form-hint">${fmtCur(perSession)} / session</span>` : ''}
          ${savings ? `<span class="chip chip-green" title="Savings vs booking individually">
            Save ${savings.pct}% · ${fmtCur(savings.saved)}</span>` : ''}
        </div>
      ` : ''}

      ${state === 'expired' ? `
        <div class="alert alert-warning" style="margin-top:8px">
          <i class="fas fa-exclamation-triangle"></i>
          <div>This package has expired. Contact support if you believe this is an error.</div>
        </div>
      ` : state === 'depleted' ? `
        <div class="alert alert-info" style="margin-top:8px">
          <i class="fas fa-info-circle"></i>
          <div>All sessions used. Consider renewing to keep the same rate.</div>
        </div>
      ` : ''}

      <div class="panel-actions pkg-actions">
        ${canBook ? `
          <button class="btn btn-primary btn-sm" data-action="use-package-credit"
                  data-expert="${escapeHtmlPkg(String(p.package_id || p.expert_id || ''))}"
                  onclick="markPkgCreditUsed('${escapeHtmlPkg(id)}', 'Credit used'); return true;">
            <i class="fas fa-calendar-plus"></i> Book Next Session</button>
          <button class="btn btn-secondary btn-sm"
                  onclick="autoBookPkg('${escapeHtmlPkg(id)}'); return false;"
                  title="Auto-book the next available slot">
            <i class="fas fa-bolt"></i> Auto-book</button>
        ` : ''}

        <button class="btn btn-secondary btn-sm"
                onclick="openPkgUsageHistory('${escapeHtmlPkg(id)}'); return false;">
          <i class="fas fa-history"></i> History
          ${historyCount ? `<span class="chip chip-neutral" style="margin-left:4px">${historyCount}</span>` : ''}
        </button>

        ${state === 'active' ? `
          <button class="btn btn-secondary btn-sm"
                  onclick="openPkgExtend('${escapeHtmlPkg(id)}'); return false;">
            <i class="fas fa-calendar-plus"></i> Extend</button>
        ` : ''}

        ${remaining > 0 ? `
          <button class="btn btn-secondary btn-sm"
                  onclick="openPkgTransfer('${escapeHtmlPkg(id)}'); return false;">
            <i class="fas fa-share"></i> Transfer</button>
        ` : ''}

        <button class="btn btn-secondary btn-sm"
                onclick="openPkgInvoice('${escapeHtmlPkg(id)}'); return false;">
          <i class="fas fa-file-invoice"></i> Invoice</button>
      </div>
    </article>
  `;
}

/* ============================================================
   Utilities (namespaced to avoid clashes with other files)
   ============================================================ */
function escapeHtmlPkg(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function cssEscapePkg(s) {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(String(s));
  return String(s).replace(/["\\]/g, '\\$&');
}