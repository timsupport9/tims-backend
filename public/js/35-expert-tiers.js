/* ============================================================
   ExpertHub 2.0 — 35-expert-tiers.js
   Expert tier system: Bronze → Silver → Gold → Elite.
   Tier-based rate caps, featured placement, package builder.
   ============================================================ */

const EXPERT_TIERS = {
  bronze: {
    id: 'bronze',
    name: 'Bronze',
    icon: 'fa-medal',
    color: '#a16207',
    min_sessions: 0,
    min_rating: 0,
    min_response_rate: 0,
    max_hourly_rate: 60,
    benefits: ['Standard listing', 'Basic profile'],
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    icon: 'fa-medal',
    color: '#94a3b8',
    min_sessions: 20,
    min_rating: 4.3,
    min_response_rate: 0.7,
    max_hourly_rate: 120,
    benefits: ['Featured search placement', 'Custom packages', 'Rate cap raised'],
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    icon: 'fa-medal',
    color: '#d97706',
    min_sessions: 60,
    min_rating: 4.6,
    min_response_rate: 0.85,
    max_hourly_rate: 250,
    benefits: ['Priority in search', 'Group sessions', 'Priority support', 'Featured badge'],
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    icon: 'fa-crown',
    color: '#7c3aed',
    min_sessions: 150,
    min_rating: 4.8,
    min_response_rate: 0.95,
    max_hourly_rate: 600,
    benefits: ['Top of all results', 'Custom onboarding', 'Dedicated manager', 'Revenue share boost'],
  },
};

/* ============================================================
   TIER COMPUTATION
   ============================================================ */
function computeExpertTier(expert) {
  const sessions = Number(expert.total_sessions || 0);
  const rating = Number(expert.average_rating || 0);
  const responseRate = Number(expert.response_rate ?? 0.5);

  // Walk from elite downward, return first tier satisfied
  const order = ['elite', 'gold', 'silver', 'bronze'];
  for (const key of order) {
    const t = EXPERT_TIERS[key];
    if (sessions >= t.min_sessions &&
        rating >= t.min_rating &&
        responseRate >= t.min_response_rate) {
      return t;
    }
  }
  return EXPERT_TIERS.bronze;
}

function nextTier(current) {
  const order = ['bronze', 'silver', 'gold', 'elite'];
  const idx = order.indexOf(current.id);
  return idx < order.length - 1 ? EXPERT_TIERS[order[idx + 1]] : null;
}

function tierProgress(expert) {
  const current = computeExpertTier(expert);
  const next = nextTier(current);
  if (!next) return { percent: 100, next: null, gaps: [] };

  const sessions = Number(expert.total_sessions || 0);
  const rating = Number(expert.average_rating || 0);
  const responseRate = Number(expert.response_rate ?? 0.5);

  const gaps = [];
  const progressParts = [];

  // Sessions
  const sessionProgress = Math.min(1, (sessions - current.min_sessions) /
    Math.max(1, (next.min_sessions - current.min_sessions)));
  progressParts.push(sessionProgress);
  if (sessions < next.min_sessions) {
    gaps.push({
      label: 'Sessions',
      current: sessions, required: next.min_sessions,
      percent: Math.round(sessionProgress * 100),
    });
  }

  // Rating
  const ratingProgress = Math.min(1, (rating - current.min_rating) /
    Math.max(0.1, (next.min_rating - current.min_rating)));
  progressParts.push(ratingProgress);
  if (rating < next.min_rating) {
    gaps.push({
      label: 'Rating',
      current: rating.toFixed(2), required: next.min_rating,
      percent: Math.round(ratingProgress * 100),
    });
  }

  // Response rate
  const responseProgress = Math.min(1, (responseRate - current.min_response_rate) /
    Math.max(0.05, (next.min_response_rate - current.min_response_rate)));
  progressParts.push(responseProgress);
  if (responseRate < next.min_response_rate) {
    gaps.push({
      label: 'Response rate',
      current: Math.round(responseRate * 100) + '%',
      required: Math.round(next.min_response_rate * 100) + '%',
      percent: Math.round(responseProgress * 100),
    });
  }

  const overall = Math.round((progressParts.reduce((s, x) => s + x, 0) / progressParts.length) * 100);
  return { percent: overall, next, gaps };
}

/* ============================================================
   RENDERING — expert dashboard
   ============================================================ */
function renderExpertTierCard(expert) {
  const tier = computeExpertTier(expert);
  const prog = tierProgress(expert);
  const cappedRate = Math.min(Number(expert.hourly_rate || 0), tier.max_hourly_rate);

  return `
    <section class="panel expert-tier-card" style="--tier-color:${tier.color}">
      <header class="expert-tier-head">
        <div class="expert-tier-badge">
          <i class="fas ${tier.icon}"></i>
        </div>
        <div>
          <div class="expert-tier-name">${esc(tier.name)} Expert</div>
          <div class="expert-tier-sub">
            ${expert.total_sessions || 0} sessions ·
            ${Number(expert.average_rating || 0).toFixed(2)}★ ·
            ${Math.round((expert.response_rate ?? 0) * 100)}% response
          </div>
        </div>
      </header>

      <div class="expert-tier-benefits">
        ${tier.benefits.map(b => `
          <div class="expert-tier-benefit"><i class="fas fa-check"></i> ${esc(b)}</div>
        `).join('')}
      </div>

      <div class="expert-tier-rate">
        <div>
          <span class="form-label">Max hourly rate</span>
          <strong>${typeof fmtCur === 'function' ? fmtCur(tier.max_hourly_rate) : '$' + tier.max_hourly_rate}</strong>
        </div>
        <div>
          <span class="form-label">Your rate</span>
          <strong>${typeof fmtCur === 'function' ? fmtCur(cappedRate) : '$' + cappedRate}</strong>
          ${cappedRate < Number(expert.hourly_rate || 0)
            ? '<span class="chip chip-yellow" style="margin-left:8px">Capped by tier</span>'
            : ''}
        </div>
      </div>

      ${prog.next ? `
        <div class="expert-tier-progress">
          <div class="expert-tier-progress-head">
            <span>Progress to ${esc(prog.next.name)}</span>
            <span>${prog.percent}%</span>
          </div>
          <div class="progress-bar"><span style="width:${prog.percent}%"></span></div>
          <ul class="expert-tier-gaps">
            ${prog.gaps.map(g => `
              <li>
                <span class="expert-tier-gap-label">${esc(g.label)}</span>
                <span class="expert-tier-gap-value">
                  ${esc(String(g.current))} / ${esc(String(g.required))}
                </span>
                <div class="progress-bar expert-tier-gap-bar">
                  <span style="width:${g.percent}%"></span>
                </div>
              </li>`).join('')}
          </ul>
          <p class="muted" style="margin-top:10px">
            Reach all three thresholds to move up. Tier is recalculated nightly.
          </p>
        </div>` : `
        <div class="alert alert-info" style="margin-top:12px">
          <i class="fas fa-crown"></i>
          <div>You are at the top tier. Thank you for being an Elite expert.</div>
        </div>`}
    </section>`;
}

/* ============================================================
   RENDERING — public / search results badge
   ============================================================ */
function renderExpertTierBadge(expert) {
  const tier = computeExpertTier(expert);
  if (tier.id === 'bronze') return '';
  return `<span class="expert-tier-chip" style="--tier-color:${tier.color}">
    <i class="fas ${tier.icon}"></i> ${esc(tier.name)}</span>`;
}

/* ============================================================
   SORTING — prefer higher tiers in search
   ============================================================ */
function sortExpertsByTier(experts) {
  const order = { elite: 4, gold: 3, silver: 2, bronze: 1 };
  return experts.slice().sort((a, b) => {
    const ta = computeExpertTier(a).id;
    const tb = computeExpertTier(b).id;
    const diff = (order[tb] || 0) - (order[ta] || 0);
    if (diff !== 0) return diff;
    // Break ties by rating, then sessions
    const r = Number(b.average_rating || 0) - Number(a.average_rating || 0);
    if (r !== 0) return r;
    return Number(b.total_sessions || 0) - Number(a.total_sessions || 0);
  });
}

/* ============================================================
   RATE CAP ENFORCEMENT
   ============================================================ */
function enforceRateCap(expert, proposedRate) {
  const tier = computeExpertTier(expert);
  if (proposedRate <= tier.max_hourly_rate) return { ok: true, rate: proposedRate };
  return {
    ok: false,
    rate: tier.max_hourly_rate,
    message: `Your ${tier.name} tier caps hourly rate at $${tier.max_hourly_rate}. ` +
             `Raise your rate by reaching the next tier.`,
  };
}

/* ============================================================
   ADMIN — tier management
   ============================================================ */
function openExpertTierAdmin() {
  const experts = S.experts || [];
  const counts = { elite: 0, gold: 0, silver: 0, bronze: 0 };
  experts.forEach(e => { counts[computeExpertTier(e).id] += 1; });

  openModal({
    title: 'Expert tier overview',
    className: 'modal-lg',
    body: `
      <div class="stat-grid" style="margin-bottom:16px">
        ${Object.values(EXPERT_TIERS).reverse().map(t => `
          <div class="dashboard-card stat-card">
            <div class="stat-info">
              <p class="stat-label">${esc(t.name)}</p>
              <p class="stat-value">${counts[t.id] || 0}</p>
              <p class="stat-sub">Cap ${typeof fmtCur === 'function' ? fmtCur(t.max_hourly_rate) : '$' + t.max_hourly_rate}/hr</p>
            </div>
            <div class="stat-icon" style="background:${t.color}22;color:${t.color}">
              <i class="fas ${t.icon}"></i>
            </div>
          </div>`).join('')}
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Expert</th><th>Tier</th><th>Sessions</th><th>Rating</th>
                     <th>Response</th><th>Max rate</th></tr></thead>
          <tbody>
            ${sortExpertsByTier(experts).map(e => {
              const t = computeExpertTier(e);
              return `
                <tr>
                  <td>${esc(e.name || '—')}</td>
                  <td><span class="expert-tier-chip" style="--tier-color:${t.color}">
                    <i class="fas ${t.icon}"></i> ${esc(t.name)}</span></td>
                  <td>${e.total_sessions || 0}</td>
                  <td>${Number(e.average_rating || 0).toFixed(2)}</td>
                  <td>${Math.round((e.response_rate ?? 0) * 100)}%</td>
                  <td>${typeof fmtCur === 'function' ? fmtCur(t.max_hourly_rate) : '$' + t.max_hourly_rate}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

/* ============================================================
   HOOK — apply tier-based sort to expert search
   ============================================================ */
(function hookExpertSort() {
  const orig = window.userFindExperts;
  if (typeof orig !== 'function' || orig.__tierHooked) return;
  window.userFindExperts = function () {
    // Populate sorted list for the original renderer to consume
    if (window.S?.experts) {
      S.experts = sortExpertsByTier(S.experts);
    }
    return orig.apply(this, arguments);
  };
  window.userFindExperts.__tierHooked = true;
})();

/* ============================================================
   Expose
   ============================================================ */
window.EHExpertTiers = {
  TIERS: EXPERT_TIERS,
  compute: computeExpertTier,
  next: nextTier,
  progress: tierProgress,
  renderCard: renderExpertTierCard,
  renderBadge: renderExpertTierBadge,
  sort: sortExpertsByTier,
  enforceRateCap: enforceRateCap,
  admin: openExpertTierAdmin,
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action="expert-tiers-admin"]');
  if (el) { e.preventDefault(); openExpertTierAdmin(); }