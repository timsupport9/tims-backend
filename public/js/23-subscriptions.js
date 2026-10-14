/* ============================================================
   ExpertHub 2.0 — 23-subscriptions.js
   Subscription tiers, feature gating, checkout flow.
   ============================================================ */

/* ============================================================
   TIER DEFINITIONS
   ============================================================ */
const SUBSCRIPTION_TIERS = {
  free: {
    id: 'free',
    name: 'Free',
    price_monthly: 0,
    price_yearly: 0,
    tagline: 'Get started',
    features: [
      'Access 1 course at a time',
      '3 lessons per week',
      'Community discussions',
      'Basic certificates',
    ],
    limits: {
      max_courses: 1,
      lessons_per_week: 3,
      consultations_per_month: 0,
      recordings: false,
      priority_support: false,
      offline: false,
      sso: false,
    },
  },
  learner_pro: {
    id: 'learner_pro',
    name: 'Learner Pro',
    price_monthly: 19,
    price_yearly: 190,
    tagline: 'Learn without limits',
    highlight: true,
    features: [
      'Unlimited courses',
      'Unlimited lessons',
      'Downloadable certificates',
      'Offline lesson access',
      'Notes & flashcards export',
      'Priority support',
    ],
    limits: {
      max_courses: Infinity,
      lessons_per_week: Infinity,
      consultations_per_month: 0,
      recordings: false,
      priority_support: true,
      offline: true,
      sso: false,
    },
  },
  consult_pro: {
    id: 'consult_pro',
    name: 'Consult Pro',
    price_monthly: 49,
    price_yearly: 490,
    tagline: 'Learning + 1-on-1 expertise',
    features: [
      'Everything in Learner Pro',
      '2 consultation sessions / month',
      'Session recordings + transcripts',
      'Priority expert matching',
      'Escrow buyer protection',
    ],
    limits: {
      max_courses: Infinity,
      lessons_per_week: Infinity,
      consultations_per_month: 2,
      recordings: true,
      priority_support: true,
      offline: true,
      sso: false,
    },
  },
  team: {
    id: 'team',
    name: 'Team',
    price_monthly: 199,
    price_yearly: 1990,
    tagline: 'For teams of 5',
    seats: 5,
    features: [
      'Everything in Consult Pro',
      '5 seats included',
      'Shared wallet & billing',
      'Admin dashboard',
      'SSO (Google / Microsoft)',
      'Usage analytics & exports',
    ],
    limits: {
      max_courses: Infinity,
      lessons_per_week: Infinity,
      consultations_per_month: 10,
      recordings: true,
      priority_support: true,
      offline: true,
      sso: true,
    },
  },
};

/* ============================================================
   DASHBOARD TAB
   ============================================================ */
function userSubscription() {
  const current = getCurrentSubscription();
  const tier = SUBSCRIPTION_TIERS[current.tier] || SUBSCRIPTION_TIERS.free;
  const cycle = current.cycle || 'monthly';

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Subscription</span></div>
    <section class="page-header">
      <h1 class="page-title">Subscription</h1>
      ${current.tier !== 'free' ? `
        <div class="page-actions">
          <button class="btn btn-secondary" data-action="manage-subscription">
            <i class="fas fa-credit-card"></i> Manage billing</button>
        </div>` : ''}
    </section>

    ${current.tier !== 'free' ? `
      <section class="panel">
        <div class="alert alert-info">
          <i class="fas fa-check-circle"></i>
          <div>
            You are on <strong>${esc(tier.name)}</strong> (${cycle}).
            ${current.renews_at ? `Renews ${fmtDate(current.renews_at)}.` : ''}
            ${current.trial_ends_at ? `<strong>Trial ends ${fmtDate(current.trial_ends_at)}.</strong>` : ''}
          </div>
        </div>
      </section>
    ` : ''}

    <section class="panel">
      <div class="billing-toggle" role="tablist" aria-label="Billing cycle">
        <button class="billing-toggle__btn ${cycle === 'monthly' ? 'is-active' : ''}"
                data-cycle="monthly" role="tab">Monthly</button>
        <button class="billing-toggle__btn ${cycle === 'yearly' ? 'is-active' : ''}"
                data-cycle="yearly" role="tab">Yearly
          <span class="chip chip-green" style="margin-left:6px">Save ~17%</span>
        </button>
      </div>

      <div class="pricing-grid">
        ${Object.values(SUBSCRIPTION_TIERS).map(t => renderPricingCard(t, cycle, current)).join('')}
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Feature comparison</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Feature</th>
              ${Object.values(SUBSCRIPTION_TIERS).map(t => `<th>${esc(t.name)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${renderComparisonRow('Concurrent courses', t => t.limits.max_courses === Infinity ? 'Unlimited' : t.limits.max_courses)}
            ${renderComparisonRow('Lessons per week', t => t.limits.lessons_per_week === Infinity ? 'Unlimited' : t.limits.lessons_per_week)}
            ${renderComparisonRow('Consultations / month', t => t.limits.consultations_per_month)}
            ${renderComparisonRow('Session recordings', t => t.limits.recordings)}
            ${renderComparisonRow('Offline access', t => t.limits.offline)}
            ${renderComparisonRow('Priority support', t => t.limits.priority_support)}
            ${renderComparisonRow('SSO & admin', t => t.limits.sso)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderPricingCard(tier, cycle, current) {
  const isCurrent = current.tier === tier.id;
  const price = cycle === 'yearly' ? tier.price_yearly : tier.price_monthly;
  const suffix = cycle === 'yearly' ? '/year' : '/month';
  return `
    <article class="pricing-card ${tier.highlight ? 'is-featured' : ''} ${isCurrent ? 'is-current' : ''}">
      ${tier.highlight ? '<span class="pricing-ribbon">Most popular</span>' : ''}
      <h3 class="pricing-name">${esc(tier.name)}</h3>
      <p class="pricing-tagline">${esc(tier.tagline)}</p>
      <div class="pricing-price">
        <span class="pricing-amount">${price ? fmtCur(price) : 'Free'}</span>
        ${price ? `<span class="pricing-suffix">${suffix}</span>` : ''}
      </div>
      <ul class="pricing-features">
        ${tier.features.map(f => `<li><i class="fas fa-check"></i> ${esc(f)}</li>`).join('')}
      </ul>
      <button class="btn ${tier.highlight ? 'btn-primary' : 'btn-secondary'} btn-block"
              ${isCurrent ? 'disabled' : ''}
              data-action="subscribe" data-tier="${tier.id}" data-cycle="${cycle}">
        ${isCurrent ? 'Current plan'
          : tier.id === 'free' ? 'Downgrade to Free'
          : tier.price_monthly === 0 ? 'Switch to Free'
          : 'Choose ' + tier.name}
      </button>
    </article>`;
}

function renderComparisonRow(label, fn) {
  return `
    <tr>
      <td>${esc(label)}</td>
      ${Object.values(SUBSCRIPTION_TIERS).map(t => {
        const v = fn(t);
        if (v === true)  return '<td><i class="fas fa-check" style="color:#10b981"></i></td>';
        if (v === false || v === 0) return '<td><i class="fas fa-minus" style="color:#94a3b8"></i></td>';
        return `<td>${esc(String(v))}</td>`;
      }).join('')}
    </tr>`;
}

/* ============================================================
   STATE
   ============================================================ */
function getCurrentSubscription() {
  if (S.subscription) return S.subscription;
  return {
    tier: 'free',
    cycle: 'monthly',
    status: 'active',
    renews_at: null,
    trial_ends_at: null,
  };
}

function currentTier() {
  return SUBSCRIPTION_TIERS[getCurrentSubscription().tier] || SUBSCRIPTION_TIERS.free;
}

function hasFeature(feature) {
  return !!currentTier().limits[feature];
}

/* ============================================================
   CHECKOUT
   ============================================================ */
async function startSubscriptionCheckout(tierId, cycle) {
  const tier = SUBSCRIPTION_TIERS[tierId];
  if (!tier) return showToast('Unknown tier', 'error');

  if (tier.price_monthly === 0) {
    // Downgrade
    try {
      await apiCall('/api/subscriptions/downgrade', 'POST', {});
      S.subscription = { tier: 'free', cycle: 'monthly', status: 'active' };
      showToast('Downgraded to Free', 'success');
      rerenderCurrentTab();
    } catch (_) { showToast('Downgrade failed', 'error'); }
    return;
  }

  // Prefer Stripe Checkout
  try {
    const d = await apiCall('/api/subscriptions/checkout', 'POST', {
      tier: tierId,
      cycle,
      return_url: location.origin + '/#/dashboard',
    });
    if (d?.url) { location.href = d.url; return; }
    if (d?.client_secret) {
      showToast('Checkout session created — complete payment in the modal', 'info');
      return;
    }
  } catch (_) {}

  // Fallback: local demo mode
  openModal({
    title: 'Checkout — ' + tier.name,
    body: `
      <p>Demo mode: this would normally route you to Stripe.</p>
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        <div>Subscribing locally activates the tier instantly and credits your account with a demo license.</div>
      </div>
      <div class="pricing-summary">
        <div><strong>${esc(tier.name)}</strong></div>
        <div>${fmtCur(cycle === 'yearly' ? tier.price_yearly : tier.price_monthly)}
             ${cycle === 'yearly' ? '/year' : '/month'}</div>
      </div>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary" id="sub-confirm">
        <i class="fas fa-lock"></i> Confirm</button>`,
  });

  document.getElementById('sub-confirm').onclick = async () => {
    S.subscription = {
      tier: tierId,
      cycle,
      status: 'active',
      renews_at: new Date(Date.now() + (cycle === 'yearly' ? 365 : 30) * 86400000).toISOString(),
    };
    closeModal();
    showToast('Subscribed to ' + tier.name, 'success');
    window.EHNotifications?.push({
      kind: 'payment',
      title: 'Subscription active',
      body: tier.name + ' (' + cycle + ')',
    });
    rerenderCurrentTab();
  };
}

/* ============================================================
   GATING HELPERS (call from anywhere)
   ============================================================ */
function gateFeature(featureKey, fallbackMessage) {
  const tier = currentTier();
  if (tier.limits[featureKey]) return true;
  showUpgradePrompt(featureKey, fallbackMessage);
  return false;
}

function showUpgradePrompt(featureKey, message) {
  const target = featureKey === 'recordings' || featureKey === 'consultations_per_month'
    ? 'consult_pro'
    : 'learner_pro';
  openModal({
    title: 'Upgrade required',
    body: `
      <p>${esc(message || 'This feature is available on a higher plan.')}</p>
      <div class="alert alert-info">
        <i class="fas fa-star"></i>
        <div>Upgrade to <strong>${esc(SUBSCRIPTION_TIERS[target].name)}</strong> to unlock.</div>
      </div>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Not now</button>
      <button class="btn btn-primary" id="upg-go">
        <i class="fas fa-rocket"></i> See plans</button>`,
  });
  document.getElementById('upg-go').onclick = () => {
    closeModal();
    if (typeof switchTab === 'function') switchTab('subscription');
  };
}

/* ============================================================
   DELEGATED HANDLERS
   ============================================================ */
document.addEventListener('click', e => {
  const cycleBtn = e.target.closest('[data-cycle]');
  if (cycleBtn) {
    S.__billingCycle = cycleBtn.dataset.cycle;
    rerenderCurrentTab();
    return;
  }
  const sub = e.target.closest('[data-action="subscribe"]');
  if (sub) {
    e.preventDefault();
    startSubscriptionCheckout(sub.dataset.tier, sub.dataset.cycle || 'monthly');
    return;
  }
  if (e.target.closest('[data-action="manage-subscription"]')) {
    e.preventDefault();
    showToast('Billing portal would open here (Stripe Customer Portal).', 'info');
  }
});

function rerenderCurrentTab() {
  if (typeof window.renderUserDashboard === 'function') window.renderUserDashboard();
}

// Hook billing cycle default
(function () {
  const s = getCurrentSubscription();
  S.__billingCycle = S.__billingCycle || s.cycle || 'monthly';