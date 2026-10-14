/* ============================================================
   ExpertHub 2.0 — 24-referrals.js
   Referral / affiliate program: unique links, tracking, credits.
   ============================================================ */

const REFERRAL_REWARD = { referrer: 10, referred: 10 }; // USD

/* ============================================================
   DASHBOARD TAB
   ============================================================ */
function userReferrals() {
  const link = buildReferralLink();
  const stats = S.referralStats || { clicks: 0, signups: 0, conversions: 0, earned: 0 };
  const history = S.referrals || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Refer &amp; Earn</span></div>
    <section class="page-header">
      <h1 class="page-title">Refer &amp; Earn</h1>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-gift"></i>
      <div>
        Share your link. When a friend makes their first purchase,
        you earn <strong>$${REFERRAL_REWARD.referrer}</strong> in wallet credit —
        and they get <strong>$${REFERRAL_REWARD.referred}</strong> off.
      </div>
    </div>

    <section class="panel">
      <h3 class="panel-title">Your referral link</h3>
      <div class="referral-link-row">
        <input id="ref-link" class="form-input" readonly value="${esc(link)}" />
        <button class="btn btn-primary" data-action="copy-referral">
          <i class="fas fa-copy"></i> Copy</button>
      </div>
      <div class="referral-share">
        <a class="btn btn-secondary btn-sm" target="_blank" rel="noopener"
           href="https://twitter.com/intent/tweet?text=${encodeURIComponent('Learning on ExpertHub — free courses & 1-on-1 experts. Join with my link: ')}${encodeURIComponent(link)}">
          <i class="fab fa-twitter"></i> Tweet
        </a>
        <a class="btn btn-secondary btn-sm" target="_blank" rel="noopener"
           href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}">
          <i class="fab fa-linkedin"></i> Share on LinkedIn
        </a>
        <a class="btn btn-secondary btn-sm" target="_blank" rel="noopener"
           href="https://api.whatsapp.com/send?text=${encodeURIComponent('Join me on ExpertHub: ' + link)}">
          <i class="fab fa-whatsapp"></i> WhatsApp
        </a>
        <a class="btn btn-secondary btn-sm" target="_blank" rel="noopener"
           href="mailto:?subject=${encodeURIComponent('Try ExpertHub')}&body=${encodeURIComponent('Check out ExpertHub: ' + link)}">
          <i class="fas fa-envelope"></i> Email
        </a>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Clicks</p>
          <p class="stat-value">${stats.clicks}</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-mouse-pointer"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Sign-ups</p>
          <p class="stat-value">${stats.signups}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-user-plus"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Conversions</p>
          <p class="stat-value">${stats.conversions}</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-shopping-cart"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Earned</p>
          <p class="stat-value">${fmtCur(stats.earned || 0)}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-coins"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Referral history</h3>
      ${history.length ? `
        <ul class="list-stack">
          ${history.map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.referred_name || 'Friend')}</span>
                <span class="list-row-sub">${fmtDT(r.created_at)} · ${esc(r.status)}</span>
              </div>
              <span class="list-row-price" style="color:${r.status === 'credited' ? 'var(--accent)' : 'inherit'}">
                ${r.status === 'credited' ? '+' + fmtCur(r.reward || REFERRAL_REWARD.referrer) : 'Pending'}
              </span>
            </li>`).join('')}
        </ul>` : `
        <div class="empty-state">
          <i class="fas fa-gift"></i>
          <h3>No referrals yet</h3>
          <p>Share your link to start earning.</p>
        </div>`}
    </section>
  `;
}

/* ============================================================
   LINK GENERATION
   ============================================================ */
function buildReferralLink() {
  const code = getOrCreateReferralCode();
  return `${location.origin}/?ref=${encodeURIComponent(code)}`;
}

function getOrCreateReferralCode() {
  if (!currentUser?.id) return '';
  const stored = localStorage.getItem('eh.refcode.' + currentUser.id);
  if (stored) return stored;
  const code = (String(currentUser.id).slice(0, 4) + '-' + randomBase36(6)).toUpperCase();
  try { localStorage.setItem('eh.refcode.' + currentUser.id, code); } catch (_) {}
  return code;
}

function randomBase36(n) {
  let s = '';
  while (s.length < n) s += Math.random().toString(36).slice(2);
  return s.slice(0, n);
}

/* ============================================================
   INBOUND: capture ?ref= on first visit
   ============================================================ */
(function captureRef() {
  try {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref') || new URLSearchParams(location.hash.split('?')[1] || '').get('ref');
    if (ref && !localStorage.getItem('eh.referred_by')) {
      localStorage.setItem('eh.referred_by', ref);
      // If already logged in, submit the attribution right away
      if (window.currentUser) submitReferralAttribution(ref);
    }
  } catch (_) {}
})();

async function submitReferralAttribution(code) {
  try {
    await apiCall('/api/referrals/attribute', 'POST', { code });
    localStorage.removeItem('eh.referred_by');
  } catch (_) {
    /* keep it for a later attempt */
  }
}

/* ============================================================
   ACTIONS
   ============================================================ */
async function copyReferralLink() {
  const link = buildReferralLink();
  try {
    await navigator.clipboard.writeText(link);
    showToast('Referral link copied', 'success');
  } catch (_) {
    const inp = document.getElementById('ref-link');
    if (inp) { inp.select(); document.execCommand('copy'); showToast('Referral link copied', 'success'); }
  }
}

/* ============================================================
   DELEGATED HANDLERS
   ============================================================ */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action="copy-referral"]');
  if (el) { e.preventDefault(); copyReferralLink(); }