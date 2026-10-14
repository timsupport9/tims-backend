/* ============================================================
   ExpertHub 2.0 — 11-user-account.js
   Wallet, Transactions, Claims, Support, Profile.
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

/* ============================================================
   USER — TRANSACTIONS
   ============================================================ */
function userTransactions() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Transactions</span></div>
    <section class="page-header"><h1 class="page-title">Transactions</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Reference</th><th>Description</th><th>Amount</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            ${S.transactions.map(t => `
              <tr>
                <td><code class="code">${esc(t.reference || t.id)}</code></td>
                <td>${esc(t.description || '')}</td>
                <td>${fmtCur(t.amount || 0)}</td>
                <td><span class="${statusClass(t.status)}">${esc(t.status || '')}</span></td>
                <td>${fmtDT(t.created_at)}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="empty-row">No transactions yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ============================================================
   USER — CLAIMS
   ============================================================ */
function userClaims() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Claims</span></div>
    <section class="page-header"><h1 class="page-title">My Claims</h1></section>
    <section class="panel">
      ${S.claims.length ? S.claims.map(c => `
        <article class="claim-card">
          <header class="claim-header">
            <span class="claim-title">${esc(c.claim_title || '')}</span>
            <span class="${statusClass(c.status)}">${esc(c.status || '')}</span>
          </header>
          <p class="claim-desc">${esc(c.claim_description || '')}</p>
          ${c.claim_amount ? `<p class="claim-amount">Amount: ${fmtCur(c.claim_amount)}</p>` : ''}
          ${c.resolution ? `
            <div class="alert alert-info" style="margin-top:10px">
              <strong>Resolution:</strong> ${esc(c.resolution)}
            </div>
          ` : ''}
        </article>
      `).join('') : `
        <div class="empty-state">
          <i class="fas fa-gavel"></i>
          <h3>No claims filed</h3>
          <p>If you have an issue with a consultation, you can file a claim.</p>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   USER — SUPPORT
   ============================================================ */
function userSupport() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Support</span></div>
    <section class="page-header">
      <h1 class="page-title">Support</h1>
      <button class="btn btn-primary" data-action="new-ticket">
        <i class="fas fa-plus"></i> New Ticket</button>
    </section>

    <section class="panel">
      ${S.tickets.length ? S.tickets.map(t => `
        <article class="ticket-card">
          <header class="ticket-header">
            <span class="ticket-ref"><code class="code">${esc(t.reference || t.id)}</code></span>
            <span class="${statusClass(t.status)}">${esc(t.status || '')}</span>
          </header>
          <h4 class="ticket-subject">${esc(t.subject || '')}</h4>
          <p class="ticket-desc">${esc(t.description || '')}</p>
          <footer class="ticket-actions">
            <button class="btn btn-secondary btn-sm" data-action="ticket-view" data-id="${t.id}">
              <i class="fas fa-eye"></i> View and Reply</button>
          </footer>
        </article>
      `).join('') : `
        <div class="empty-state">
          <i class="fas fa-headset"></i>
          <h3>No support tickets</h3>
          <p>Need help? Create a ticket and our team will respond.</p>
          <button class="btn btn-primary" data-action="new-ticket">
            <i class="fas fa-plus"></i> Create Ticket</button>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   USER — PROFILE
   ============================================================ */
function userProfile() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
    <section class="page-header"><h1 class="page-title">My Profile</h1></section>

    <section class="panel">
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(currentUser?.name || '')}</h2>
          <p class="profile-email">${esc(currentUser?.email || '')}</p>
          <p style="margin-top:6px">
            <span class="chip chip-neutral">Level ${S.userLevel || 1}</span>
            <span class="chip chip-blue" style="margin-left:6px">
              ${S.userXP || 0} XP</span>
          </p>
        </div>
      </div>

      <div class="form-grid">
        <label class="form-group"><span class="form-label">Full name</span>
          <input id="profileName" class="form-input" value="${esc(currentUser?.name || '')}" /></label>
        <label class="form-group"><span class="form-label">Phone</span>
          <input id="profilePhone" class="form-input" value="${esc(currentUser?.phone || '')}" /></label>
        <label class="form-group"><span class="form-label">Timezone</span>
          <input id="profileTimezone" class="form-input" value="${esc(currentUser?.timezone || 'UTC')}" /></label>
        <label class="form-group">
          <span class="form-label">Preferred mode</span>
          <select id="profileIntent" class="form-select">
            <option value="both"    ${S.userIntent === 'both' ? 'selected' : ''}>Both - Learning and Consulting</option>
            <option value="learn"   ${S.userIntent === 'learn' ? 'selected' : ''}>Learning only</option>
            <option value="consult" ${S.userIntent === 'consult' ? 'selected' : ''}>Consulting only</option>
          </select>
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Change avatar</span>
          <input type="file" id="avatarFile" class="form-input" accept="image/*" />
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="update-user-profile">
          <i class="fas fa-save"></i> Save Changes</button>
      </div>

      <h3 class="panel-title" style="margin-top:24px">Change Password</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Current password</span>
          <input id="cpOld" type="password" class="form-input" /></label>
        <label class="form-group"><span class="form-label">New password</span>
          <input id="cpNew" type="password" class="form-input" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-warning" data-action="change-password">
          <i class="fas fa-lock"></i> Update Password</button>
      </div>

      <h3 class="panel-title" style="margin-top:24px">Privacy & Data</h3>
      <div class="panel-actions">
        <button class="btn btn-secondary" data-action="gdpr-export">
          <i class="fas fa-download"></i> Export My Data (GDPR)</button>
        <button class="btn btn-danger" data-action="gdpr-delete">
          <i class="fas fa-trash"></i> Delete Account</button>
      </div>
    </section>
  `;