/* ============================================================
   ExpertHub 2.0 — expert-modals.js
   Expert modal module. Uses shared-modal-helpers.js.

   Sections
   --------
    1.  Dependencies
    2.  Constants
    3.  Local state
    4.  Data loaders
    5.  Portfolio (create / edit / delete / preview / reorder / publish)
    6.  Pricing (tiers / packages / discounts)
    7.  Profile (headline / bio / specialization / languages / quals)
    8.  Availability (working hours / recurring / holidays / block time)
    9.  Verification (status / ID / certificates)
    10. Earnings (summary / withdrawals / transactions / statements)
    11. Reviews (list / reply)
    12. Q&A (list / answer)
    13. Consultations (overview / accept / decline / complete)
    14. Analytics (public stats)
    15. Settings (notification / visibility / privacy)
    16. Public preview

   Lifecycle contract (every modal):
     load → render → validate → submit → refresh → toast → close
   ============================================================ */

/* ------------------------------------------------------------------
 * 1. Dependencies
 * ----------------------------------------------------------------
   Requires: shared-modal-helpers.js, core.js ($, S, apiCall,
   openModal, closeModal, showToast, esc, avatar, fmtCur, loadAllData,
   rerenderRoleContent, showLoading).
*/

/* ------------------------------------------------------------------
 * 2. Constants
 * ---------------------------------------------------------------- */

const EXPERT_PORTFOLIO_CATEGORIES = [
  'Case Study', 'Project', 'Article', 'Talk', 'Certification', 'Publication', 'Other',
];

const EXPERT_TIER_SLOTS = 3;

const EXPERT_LANGUAGES = [
  'English', 'Swahili', 'French', 'Arabic', 'Portuguese', 'Spanish',
  'German', 'Mandarin', 'Hindi', 'Other',
];

const EXPERT_QUALIFICATION_TYPES = [
  'Degree', 'Diploma', 'Certificate', 'License', 'Award', 'Other',
];

const EXPERT_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EXPERT_WITHDRAWAL_MIN = 10;

/* ------------------------------------------------------------------
 * 3. Local state
 * ---------------------------------------------------------------- */

const ExpertModalState = {
  tiersCache: null,
  txnsCache: null,
  earningsCache: null,
  verificationCache: null,
  availabilityCache: null,
};

/* ------------------------------------------------------------------
 * 4. Data loaders
 * ---------------------------------------------------------------- */

async function loadExpertTiers(force = false) {
  if (!force && ExpertModalState.tiersCache) return ExpertModalState.tiersCache;
  let tiers = [];
  try {
    const d = await apiCall(ModalFramework.routes.tiers);
    tiers = d?.tiers || [];
  } catch (_) {
    tiers = S.consultationTiers || [];
  }
  ExpertModalState.tiersCache = tiers;
  S.consultationTiers = tiers;
  return tiers;
}

async function loadExpertTransactions(force = false) {
  if (!force && ExpertModalState.txnsCache) return ExpertModalState.txnsCache;
  try {
    const d = await apiCall(ModalFramework.routes.transactions);
    ExpertModalState.txnsCache = d?.transactions || [];
  } catch (_) { ExpertModalState.txnsCache = []; }
  return ExpertModalState.txnsCache;
}

async function loadExpertEarnings(force = false) {
  if (!force && ExpertModalState.earningsCache) return ExpertModalState.earningsCache;
  try {
    ExpertModalState.earningsCache = await apiCall(ModalFramework.routes.earnings);
  } catch (_) {
    ExpertModalState.earningsCache = { available: 0, pending: 0, lifetime: 0 };
  }
  return ExpertModalState.earningsCache;
}

async function loadExpertVerification(force = false) {
  if (!force && ExpertModalState.verificationCache) return ExpertModalState.verificationCache;
  try {
    ExpertModalState.verificationCache = await apiCall(ModalFramework.routes.verification);
  } catch (_) {
    ExpertModalState.verificationCache = S.me?.verification || { status: 'unverified' };
  }
  return ExpertModalState.verificationCache;
}

async function loadExpertAvailability(force = false) {
  if (!force && ExpertModalState.availabilityCache) return ExpertModalState.availabilityCache;
  try {
    ExpertModalState.availabilityCache = await apiCall('/api/experts/me/availability');
  } catch (_) {
    ExpertModalState.availabilityCache = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      working_hours: EXPERT_DAY_LABELS.map(day => ({ day, enabled: day !== 'Sun', start: '09:00', end: '17:00' })),
      holidays: [],
      blocked: [],
    };
  }
  return ExpertModalState.availabilityCache;
}

function clearExpertCache() {
  Object.keys(ExpertModalState).forEach(k => { ExpertModalState[k] = null; });
}

/* ==================================================================
 * 5. PORTFOLIO
 * ================================================================== */

function openAddPortfolioItemModal()     { return openPortfolioItemModal(null); }
function openEditPortfolioItemModal(id)  { return openPortfolioItemModal(id); }

function openPortfolioItemModal(itemId) {
  const item = itemId ? (S.expertPortfolio?.find(x => x.id === itemId) || {}) : {};
  const isEdit = !!itemId;

  openModal({
    title: isEdit ? 'Edit Portfolio Item' : 'Add Portfolio Item',
    className: 'modal-lg',
    body: `
      <label class="form-group">
        <span class="form-label">Title *</span>
        <input id="piTitle" class="form-input" data-autofocus
               value="${esc(item.title || '')}" maxlength="120" />
      </label>
      <label class="form-group">
        <span class="form-label">Category *</span>
        <select id="piCat" class="form-select">
          ${EXPERT_PORTFOLIO_CATEGORIES.map(c =>
            `<option value="${esc(c)}" ${item.category === c ? 'selected' : ''}>${esc(c)}</option>`
          ).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Description</span>
        <textarea id="piDesc" class="form-textarea" rows="4" maxlength="600">${esc(item.description || '')}</textarea>
      </label>
      <label class="form-group">
        <span class="form-label">Link (optional)</span>
        <input id="piLink" class="form-input" type="url"
               value="${esc(item.link || '')}" placeholder="https://…" />
      </label>
      <label class="form-group form-checkbox">
        <input id="piPublished" type="checkbox" ${item.published !== false ? 'checked' : ''} />
        <span>Show on public profile</span>
      </label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="piSave" class="btn btn-primary">${isEdit ? 'Save' : 'Add'}</button>`,
  });

  enhanceModalAccessibility();
  trackFormChanges();
  enableSwipeToDismiss();

  $('#piSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const data = {
      title:       sanitizeInput($('#piTitle').value),
      category:    $('#piCat').value,
      description: sanitizeMultiline($('#piDesc').value),
      link:        sanitizeUrl($('#piLink').value),
      published:   $('#piPublished').checked,
    };

    const { valid, errors } = validateForm(data, {
      title:    [Validators.required, Validators.maxLength(120)],
      category: [Validators.required, Validators.oneOf(EXPERT_PORTFOLIO_CATEGORIES)],
      link:     [Validators.url],
    });
    if (!valid) {
      applyValidationErrors(errors, { title: 'piTitle', category: 'piCat', link: 'piLink' });
      return;
    }

    disableModalSubmit();
    const url = isEdit
      ? `${ModalFramework.routes.portfolio}/${itemId}`
      : ModalFramework.routes.portfolio;
    const res = await modalApiRequest(isEdit ? 'PUT' : 'POST', url, data, {
      successMessage: isEdit ? 'Portfolio updated' : 'Portfolio added',
      refresh: true, rerender: true,
    });
    if (res.ok) { closeModal(); untrackFormChanges(); clearExpertCache(); }
    else enableModalSubmit();
  };
}

function openPortfolioPreviewModal(itemId) {
  const item = S.expertPortfolio?.find(x => x.id === itemId);
  if (!item) { showToast('Portfolio item not found', 'error'); return; }

  openModal({
    title: item.title || 'Portfolio item',
    className: 'modal-lg',
    body: `
      <p class="expert-profile-spec">${esc(item.category || '')}</p>
      ${item.description ? `<p class="modal-message">${esc(item.description)}</p>` : ''}
      ${item.link ? `<p><a href="${esc(item.link)}" target="_blank" rel="noopener">${esc(item.link)}</a></p>` : ''}
      <p class="form-hint">Published: ${item.published !== false ? 'Yes' : 'No'}</p>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      <button class="btn btn-primary" data-action="edit-portfolio" data-id="${item.id}">Edit</button>`,
  });
  enhanceModalAccessibility();
}

async function openDeletePortfolioItemModal(itemId) {
  const item = S.expertPortfolio?.find(x => x.id === itemId);
  if (!item) { showToast('Portfolio item not found', 'error'); return; }

  const { confirmed } = await openDeleteConfirmModal({
    title: 'Delete portfolio item',
    message: `Delete "${item.title}"? This cannot be undone.`,
  });
  if (!confirmed) return;

  const res = await modalApiDelete(`${ModalFramework.routes.portfolio}/${itemId}`, null, {
    successMessage: 'Portfolio item deleted',
    refresh: true, rerender: true,
  });
  if (res.ok) clearExpertCache();
}

/**
 * Move a portfolio item up or down within the local list, then persist order.
 * @param {string} itemId
 * @param {number} delta -1 to move up, +1 to move down
 */
async function reorderPortfolioItem(itemId, delta) {
  const list = (S.expertPortfolio || []).slice();
  const idx = list.findIndex(x => x.id === itemId);
  if (idx < 0) return;
  const target = idx + delta;
  if (target < 0 || target >= list.length) return;
  const [item] = list.splice(idx, 1);
  list.splice(target, 0, item);
  const order = list.map(x => x.id);

  disableModalSubmit();
  const res = await modalApiUpdate(`${ModalFramework.routes.portfolio}/reorder`, { order }, {
    successMessage: 'Order updated',
    refresh: true, rerender: true,
  });
  if (!res.ok) enableModalSubmit();
  else clearExpertCache();
}

async function publishPortfolioItem(itemId, publish = true) {
  const res = await modalApiUpdate(`${ModalFramework.routes.portfolio}/${itemId}/publish`, { publish }, {
    successMessage: publish ? 'Portfolio item published' : 'Portfolio item unpublished',
    refresh: true, rerender: true,
  });
  if (res.ok) clearExpertCache();
}

/* ==================================================================
 * 6. PRICING
 * ================================================================== */

async function openEditTiersModal() {
  const tiers = await loadExpertTiers(true);
  const filled = Array.from({ length: EXPERT_TIER_SLOTS }, (_, i) => tiers[i] || {});

  openModal({
    title: 'Edit Pricing Tiers',
    className: 'modal-lg',
    body: `
      <p class="form-hint">Define your session tiers. Clients choose a tier when booking. Up to ${EXPERT_TIER_SLOTS} tiers.</p>
      ${filled.map((t, i) => `
        <div class="form-grid" style="margin-bottom:12px;padding:12px;background:var(--surface-2);border-radius:8px">
          <label class="form-group">
            <span class="form-label">Tier ${i + 1} name</span>
            <input id="tier${i}Name" class="form-input" maxlength="40" value="${esc(t.name || '')}" />
          </label>
          <label class="form-group">
            <span class="form-label">Duration (min)</span>
            <input id="tier${i}Duration" type="number" min="5" max="480" class="form-input"
                   value="${t.duration_minutes || ''}" />
          </label>
          <label class="form-group">
            <span class="form-label">Price ($)</span>
            <input id="tier${i}Price" type="number" min="0" step="0.01" class="form-input"
                   value="${t.price || ''}" />
          </label>
          <label class="form-group form-group-full">
            <span class="form-label">Description</span>
            <input id="tier${i}Desc" class="form-input" maxlength="200" value="${esc(t.description || '')}" />
          </label>
        </div>`).join('')}`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="tiersSave" class="btn btn-primary">Save Tiers</button>`,
  });

  enhanceModalAccessibility();
  trackFormChanges();
  enableSwipeToDismiss();

  $('#tiersSave').onclick = async () => {
    clearFormErrors(); clearModalError();

    const list = filled.map((_, i) => ({
      name:             sanitizeInput($(`#tier${i}Name`).value),
      duration_minutes: Number($(`#tier${i}Duration`).value || 0),
      price:            Number($(`#tier${i}Price`).value || 0),
      description:      sanitizeInput($(`#tier${i}Desc`).value),
    })).filter(t => t.name || t.duration_minutes || t.price);

    if (!list.length) { setModalError('Define at least one tier.'); return; }

    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      const { valid, errors } = validateForm(t, {
        name:             [Validators.required, Validators.maxLength(40)],
        duration_minutes: [Validators.required, Validators.min(5), Validators.max(480)],
        price:            [Validators.required, Validators.min(0)],
      });
      if (!valid) {
        applyValidationErrors(errors, {
          name: `tier${i}Name`,
          duration_minutes: `tier${i}Duration`,
          price: `tier${i}Price`,
        });
        return;
      }
    }

    disableModalSubmit();
    const res = await modalApiUpdate(ModalFramework.routes.tiers, { tiers: list }, {
      successMessage: 'Tiers saved', refresh: true, rerender: true,
    });
    if (res.ok) { closeModal(); untrackFormChanges(); clearExpertCache(); }
    else enableModalSubmit();
  };
}

async function openDeleteTierModal(index) {
  const tiers = await loadExpertTiers();
  const tier = tiers[index];
  if (!tier) { showToast('Tier not found', 'error'); return; }

  const { confirmed } = await openDeleteConfirmModal({
    title: 'Delete tier',
    message: `Delete tier "${tier.name}"?`,
  });
  if (!confirmed) return;

  const next = tiers.filter((_, i) => i !== index);
  const res = await modalApiUpdate(ModalFramework.routes.tiers, { tiers: next }, {
    successMessage: 'Tier deleted', refresh: true, rerender: true,
  });
  if (res.ok) clearExpertCache();
}

function openPackageModal(pkgId) {
  const pkg = pkgId ? (S.expertPackages?.find(p => p.id === pkgId) || {}) : {};
  const isEdit = !!pkgId;

  openModal({
    title: isEdit ? 'Edit Package' : 'Add Package',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Package name *</span>
        <input id="pkName" class="form-input" maxlength="60" value="${esc(pkg.name || '')}" /></label>
      <label class="form-group"><span class="form-label">Number of sessions *</span>
        <input id="pkSessions" type="number" min="1" max="100" class="form-input" value="${pkg.sessions || 3}" /></label>
      <label class="form-group"><span class="form-label">Price ($) *</span>
        <input id="pkPrice" type="number" min="0" step="0.01" class="form-input" value="${pkg.price || ''}" /></label>
      <label class="form-group"><span class="form-label">Valid for (days)</span>
        <input id="pkValid" type="number" min="1" max="3650" class="form-input" value="${pkg.validity_days || 90}" /></label>
      <label class="form-group form-group-full"><span class="form-label">Description</span>
        <textarea id="pkDesc" class="form-textarea" rows="3" maxlength="400">${esc(pkg.description || '')}</textarea></label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="pkSave" class="btn btn-primary">${isEdit ? 'Save' : 'Add'}</button>`,
  });

  enhanceModalAccessibility();
  trackFormChanges();

  $('#pkSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const data = {
      name:          sanitizeInput($('#pkName').value),
      sessions:      Number($('#pkSessions').value || 0),
      price:         Number($('#pkPrice').value || 0),
      validity_days: Number($('#pkValid').value || 0),
      description:   sanitizeInput($('#pkDesc').value),
    };
    const { valid, errors } = validateForm(data, {
      name:          [Validators.required, Validators.maxLength(60)],
      sessions:      [Validators.required, Validators.integer, Validators.min(1), Validators.max(100)],
      price:         [Validators.required, Validators.min(0)],
      validity_days: [Validators.min(1), Validators.max(3650)],
    });
    if (!valid) {
      applyValidationErrors(errors, {
        name: 'pkName', sessions: 'pkSessions', price: 'pkPrice', validity_days: 'pkValid',
      });
      return;
    }

    disableModalSubmit();
    const url = isEdit ? `/api/experts/me/packages/${pkgId}` : '/api/experts/me/packages';
    const res = await modalApiRequest(isEdit ? 'PUT' : 'POST', url, data, {
      successMessage: isEdit ? 'Package updated' : 'Package added',
    });
    if (res.ok) { closeModal(); untrackFormChanges(); }
    else enableModalSubmit();
  };
}

function openDiscountModal(discountId) {
  const d = discountId ? (S.expertDiscounts?.find(x => x.id === discountId) || {}) : {};
  const isEdit = !!discountId;

  openModal({
    title: isEdit ? 'Edit Discount' : 'Add Discount',
    body: `
      <label class="form-group"><span class="form-label">Code *</span>
        <input id="dcCode" class="form-input" maxlength="20" value="${esc(d.code || '')}" style="text-transform:uppercase" /></label>
      <label class="form-group"><span class="form-label">Percent off *</span>
        <input id="dcPercent" type="number" min="1" max="100" class="form-input" value="${d.percent || ''}" /></label>
      <label class="form-group"><span class="form-label">Valid until</span>
        <input id="dcUntil" type="date" class="form-input" value="${d.valid_until || ''}" /></label>
      <label class="form-group"><span class="form-label">Max uses</span>
        <input id="dcMax" type="number" min="1" class="form-input" value="${d.max_uses || ''}" /></label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="dcSave" class="btn btn-primary">${isEdit ? 'Save' : 'Add'}</button>`,
  });

  enhanceModalAccessibility();
  trackFormChanges();

  $('#dcSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const data = {
      code:        sanitizeInput($('#dcCode').value).toUpperCase(),
      percent:     Number($('#dcPercent').value || 0),
      valid_until: $('#dcUntil').value || null,
      max_uses:    $('#dcMax').value ? Number($('#dcMax').value) : null,
    };
    const { valid, errors } = validateForm(data, {
      code:        [Validators.required, Validators.maxLength(20)],
      percent:     [Validators.required, Validators.min(1), Validators.max(100)],
      valid_until: [Validators.date, Validators.futureDate],
      max_uses:    [Validators.min(1)],
    });
    if (!valid) {
      applyValidationErrors(errors, {
        code: 'dcCode', percent: 'dcPercent', valid_until: 'dcUntil', max_uses: 'dcMax',
      });
      return;
    }

    disableModalSubmit();
    const url = isEdit ? `/api/experts/me/discounts/${discountId}` : '/api/experts/me/discounts';
    const res = await modalApiRequest(isEdit ? 'PUT' : 'POST', url, data, {
      successMessage: isEdit ? 'Discount saved' : 'Discount added',
    });
    if (res.ok) { closeModal(); untrackFormChanges(); }
    else enableModalSubmit();
  };
}

/* ==================================================================
 * 7. PROFILE
 * ================================================================== */

function openEditExpertProfileModal() {
  const e = S.me || {};
  openModal({
    title: 'Edit Expert Profile',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Headline</span>
        <input id="eeHeadline" class="form-input" maxlength="120" value="${esc(e.headline || '')}" /></label>
      <label class="form-group"><span class="form-label">Specialization *</span>
        <input id="eeSpec" class="form-input" maxlength="120" value="${esc(e.specialization || '')}" /></label>
      <label class="form-group"><span class="form-label">Bio</span>
        <textarea id="eeBio" class="form-textarea" rows="5" maxlength="1200">${esc(e.bio || '')}</textarea></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Hourly rate ($)</span>
          <input id="eeRate" type="number" min="0" step="0.01" class="form-input" value="${e.hourly_rate || ''}" /></label>
        <label class="form-group"><span class="form-label">Languages</span>
          <select id="eeLang" class="form-select" multiple size="5">
            ${EXPERT_LANGUAGES.map(l =>
              `<option value="${esc(l)}" ${(e.languages || []).includes(l) ? 'selected' : ''}>${esc(l)}</option>`
            ).join('')}
          </select></label>
      </div>
      <label class="form-group form-checkbox">
        <input id="eePublic" type="checkbox" ${e.public_profile !== false ? 'checked' : ''} />
        <span>Show profile in public expert directory</span>
      </label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="eeSave" class="btn btn-primary">Save Profile</button>`,
  });

  enhanceModalAccessibility();
  trackFormChanges();
  enableSwipeToDismiss();

  $('#eeSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const data = {
      headline:       sanitizeInput($('#eeHeadline').value),
      specialization: sanitizeInput($('#eeSpec').value),
      bio:            sanitizeMultiline($('#eeBio').value),
      hourly_rate:    Number($('#eeRate').value || 0),
      languages:      Array.from($('#eeLang').selectedOptions).map(o => o.value),
      public_profile: $('#eePublic').checked,
    };
    const { valid, errors } = validateForm(data, {
      specialization: [Validators.required, Validators.maxLength(120)],
      hourly_rate:    [Validators.min(0)],
    });
    if (!valid) {
      applyValidationErrors(errors, { specialization: 'eeSpec', hourly_rate: 'eeRate' });
      return;
    }

    disableModalSubmit();
    const res = await modalApiUpdate(ModalFramework.routes.profile, data, {
      successMessage: 'Profile updated', refresh: true, rerender: true,
    });
    if (res.ok) { closeModal(); untrackFormChanges(); clearExpertCache(); }
    else enableModalSubmit();
  };
}

function openExpertQualificationsModal() {
  const quals = S.me?.qualifications || [];
  openModal({
    title: 'Qualifications',
    className: 'modal-lg',
    body: `
      <p class="form-hint">List your degrees, certificates, and licenses. They help build trust.</p>
      <div id="qualList">
        ${quals.length
          ? quals.map((q, i) => qualificationRow(q, i)).join('')
          : qualificationRow({}, 0)}
      </div>
      <button type="button" class="btn btn-secondary" id="qualAdd">+ Add qualification</button>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="qualSave" class="btn btn-primary">Save</button>`,
  });
  enhanceModalAccessibility();

  let nextIndex = quals.length || 1;
  $('#qualAdd').onclick = () => {
    const wrap = document.getElementById('qualList');
    wrap.insertAdjacentHTML('beforeend', qualificationRow({}, nextIndex++));
  };

  $('#qualSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const items = [];
    document.querySelectorAll('#qualList [data-qual-row]').forEach(row => {
      const data = {
        type:   row.querySelector('[data-q=type]').value,
        title:  sanitizeInput(row.querySelector('[data-q=title]').value),
        issuer: sanitizeInput(row.querySelector('[data-q=issuer]').value),
        year:   row.querySelector('[data-q=year]').value ? Number(row.querySelector('[data-q=year]').value) : null,
        url:    sanitizeUrl(row.querySelector('[data-q=url]').value),
      };
      if (data.title || data.issuer) items.push(data);
    });

    disableModalSubmit();
    const res = await modalApiUpdate('/api/experts/me/qualifications', { qualifications: items }, {
      successMessage: 'Qualifications saved', refresh: true, rerender: true,
    });
    if (res.ok) closeModal(); else enableModalSubmit();
  };
}

function qualificationRow(q = {}, idx = 0) {
  return `
    <div class="form-grid" data-qual-row style="margin-bottom:12px;padding:12px;background:var(--surface-2);border-radius:8px">
      <label class="form-group"><span class="form-label">Type</span>
        <select data-q="type" class="form-select">
          ${EXPERT_QUALIFICATION_TYPES.map(t =>
            `<option ${q.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Title</span>
        <input data-q="title" class="form-input" value="${esc(q.title || '')}" maxlength="120" /></label>
      <label class="form-group"><span class="form-label">Issuer</span>
        <input data-q="issuer" class="form-input" value="${esc(q.issuer || '')}" maxlength="120" /></label>
      <label class="form-group"><span class="form-label">Year</span>
        <input data-q="year" type="number" min="1950" max="2100" class="form-input" value="${q.year || ''}" /></label>
      <label class="form-group form-group-full"><span class="form-label">Verify URL</span>
        <input data-q="url" type="url" class="form-input" value="${esc(q.url || '')}" /></label>
    </div>`;
}

function openExpertLanguagesModal() {
  const langs = S.me?.languages || [];
  openModal({
    title: 'Languages',
    body: `
      <p class="form-hint">Select every language you can hold a session in.</p>
      ${EXPERT_LANGUAGES.map(l => `
        <label class="form-checkbox">
          <input type="checkbox" value="${esc(l)}" ${langs.includes(l) ? 'checked' : ''} data-lang />
          <span>${esc(l)}</span>
        </label>`).join('')}`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="langSave" class="btn btn-primary">Save</button>`,
  });
  enhanceModalAccessibility();

  $('#langSave').onclick = async () => {
    const data = {
      languages: Array.from(document.querySelectorAll('[data-lang]:checked')).map(el => el.value),
    };
    disableModalSubmit();
    const res = await modalApiUpdate(ModalFramework.routes.profile, data, {
      successMessage: 'Languages saved', refresh: true, rerender: true,
    });
    if (res.ok) closeModal(); else enableModalSubmit();
  };
}

/* ==================================================================
 * 8. AVAILABILITY
 * ================================================================== */

async function openAvailabilityModal() {
  const av = await loadExpertAvailability(true);
  openModal({
    title: 'Availability',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Timezone</span>
        <input id="avTz" class="form-input" value="${esc(av.timezone || 'UTC')}" readonly /></label>
      <h3 class="panel-title">Working hours</h3>
      ${EXPERT_DAY_LABELS.map((d, i) => {
        const row = (av.working_hours || []).find(w => w.day === d) || { day: d, enabled: d !== 'Sun', start: '09:00', end: '17:00' };
        return `
          <div class="form-grid" data-wh="${d}">
            <label class="form-checkbox"><input type="checkbox" data-wh-enabled ${row.enabled ? 'checked' : ''} />
              <span>${d}</span></label>
            <label class="form-group"><span class="form-label">Start</span>
              <input type="time" class="form-input" data-wh-start value="${row.start}" /></label>
            <label class="form-group"><span class="form-label">End</span>
              <input type="time" class="form-input" data-wh-end value="${row.end}" /></label>
          </div>`;
      }).join('')}`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="avSave" class="btn btn-primary">Save Availability</button>`,
  });

  enhanceModalAccessibility();
  trackFormChanges();

  $('#avSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const working_hours = EXPERT_DAY_LABELS.map(d => {
      const row = document.querySelector(`[data-wh="${d}"]`);
      return {
        day: d,
        enabled: row.querySelector('[data-wh-enabled]').checked,
        start: row.querySelector('[data-wh-start]').value,
        end:   row.querySelector('[data-wh-end]').value,
      };
    });
    for (const w of working_hours) {
      if (w.enabled && (!w.start || !w.end)) { setModalError(`Set start and end for ${w.day}`); return; }
      if (w.enabled && w.start >= w.end)       { setModalError(`${w.day}: start must be before end`); return; }
    }

    disableModalSubmit();
    const res = await modalApiUpdate('/api/experts/me/availability', {
      timezone: $('#avTz').value,
      working_hours,
    }, { successMessage: 'Availability saved', refresh: true, rerender: true });
    if (res.ok) { closeModal(); untrackFormChanges(); clearExpertCache(); }
    else enableModalSubmit();
  };
}

function openHolidayModal() {
  openModal({
    title: 'Add Holiday',
    body: `
      <label class="form-group"><span class="form-label">Date *</span>
        <input id="hdDate" type="date" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Label</span>
        <input id="hdLabel" class="form-input" maxlength="80" placeholder="Public holiday" /></label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="hdSave" class="btn btn-primary">Add</button>`,
  });
  enhanceModalAccessibility();

  $('#hdSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const data = { date: $('#hdDate').value, label: sanitizeInput($('#hdLabel').value) };
    const { valid, errors } = validateForm(data, { date: [Validators.required, Validators.date] });
    if (!valid) { applyValidationErrors(errors, { date: 'hdDate' }); return; }
    disableModalSubmit();
    const res = await modalApiCreate('/api/experts/me/availability/holidays', data, {
      successMessage: 'Holiday added', refresh: true, rerender: true,
    });
    if (res.ok) { closeModal(); clearExpertCache(); } else enableModalSubmit();
  };
}

function openBlockTimeModal() {
  openModal({
    title: 'Block Time',
    body: `
      <label class="form-group"><span class="form-label">Start *</span>
        <input id="btStart" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">End *</span>
        <input id="btEnd" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Reason</span>
        <input id="btReason" class="form-input" maxlength="120" /></label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="btSave" class="btn btn-primary">Block</button>`,
  });
  enhanceModalAccessibility();

  $('#btSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const data = { start: $('#btStart').value, end: $('#btEnd').value, reason: sanitizeInput($('#btReason').value) };
    const { valid, errors } = validateForm(data, {
      start: [Validators.required, Validators.futureDate],
      end:   [Validators.required, Validators.futureDate],
    });
    if (!valid) { applyValidationErrors(errors, { start: 'btStart', end: 'btEnd' }); return; }
    if (new Date(data.end) <= new Date(data.start)) { setModalError('End must be after start'); return; }

    disableModalSubmit();
    const res = await modalApiCreate('/api/experts/me/availability/blocks', data, {
      successMessage: 'Time blocked', refresh: true, rerender: true,
    });
    if (res.ok) { closeModal(); clearExpertCache(); } else enableModalSubmit();
  };
}

/* ==================================================================
 * 9. VERIFICATION
 * ================================================================== */

async function openVerificationStatusModal() {
  const v = await loadExpertVerification(true);
  const map = {
    unverified: { label: 'Not verified', cls: 'warning' },
    pending:    { label: 'Pending review', cls: 'info' },
    verified:   { label: 'Verified', cls: 'success' },
    rejected:   { label: 'Rejected', cls: 'error' },
  };
  const info = map[v.status] || { label: v.status || 'Unknown', cls: 'info' };

  openModal({
    title: 'Verification Status',
    body: `
      <p class="modal-message">
        Status: <strong class="text-${info.cls}">${esc(info.label)}</strong>
      </p>
      ${v.reason ? `<p class="form-hint">${esc(v.reason)}</p>` : ''}
      ${v.submitted_at ? `<p class="form-hint">Submitted: ${esc(mfFormatDate(v.submitted_at, true))}</p>` : ''}`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      ${v.status !== 'verified' ? `<button class="btn btn-primary" data-action="open-verification">Start Verification</button>` : ''}`,
  });
  enhanceModalAccessibility();
}

function openVerificationModal() {
  openModal({
    title: 'Submit Verification',
    className: 'modal-lg',
    body: `
      <p class="form-hint">Upload an identity document and any relevant certificates. Files are reviewed by the ExpertHub team within 1–3 business days.</p>
      <label class="form-group"><span class="form-label">Legal name *</span>
        <input id="vName" class="form-input" maxlength="120" value="${esc(S.me?.name || '')}" /></label>
      <label class="form-group"><span class="form-label">ID number *</span>
        <input id="vId" class="form-input" maxlength="40" /></label>
      <label class="form-group"><span class="form-label">ID document (URL)</span>
        <input id="vIdDoc" class="form-input" type="url" placeholder="https://…" /></label>
      <label class="form-group"><span class="form-label">Certificate (URL, optional)</span>
        <input id="vCert" class="form-input" type="url" placeholder="https://…" /></label>
      <label class="form-group form-checkbox">
        <input id="vConsent" type="checkbox" />
        <span>I confirm the information is accurate and consent to verification.</span>
      </label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="vSave" class="btn btn-primary">Submit</button>`,
  });

  enhanceModalAccessibility();
  trackFormChanges();

  $('#vSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const data = {
      name:       sanitizeInput($('#vName').value),
      id_number:  sanitizeInput($('#vId').value),
      id_doc_url: sanitizeUrl($('#vIdDoc').value),
      cert_url:   sanitizeUrl($('#vCert').value),
      consent:    $('#vConsent').checked,
    };
    const { valid, errors } = validateForm(data, {
      name:      [Validators.required, Validators.minLength(2)],
      id_number: [Validators.required, Validators.minLength(4)],
      id_doc_url:[Validators.url],
      cert_url:  [Validators.url],
    });
    if (!valid) {
      applyValidationErrors(errors, {
        name: 'vName', id_number: 'vId', id_doc_url: 'vIdDoc', cert_url: 'vCert',
      });
      return;
    }
    if (!data.consent) { setModalError('Please confirm the consent checkbox.'); return; }

    disableModalSubmit();
    const res = await modalApiCreate(ModalFramework.routes.verification, data, {
      successMessage: 'Verification submitted', refresh: true, rerender: true,
    });
    if (res.ok) { closeModal(); untrackFormChanges(); clearExpertCache(); }
    else enableModalSubmit();
  };
}

function openUploadCertificateModal() {
  openModal({
    title: 'Upload Certificate',
    body: `
      <label class="form-group"><span class="form-label">Certificate title *</span>
        <input id="ucTitle" class="form-input" maxlength="120" /></label>
      <label class="form-group"><span class="form-label">Issuer *</span>
        <input id="ucIssuer" class="form-input" maxlength="120" /></label>
      <label class="form-group"><span class="form-label">File URL *</span>
        <input id="ucUrl" type="url" class="form-input" placeholder="https://…" /></label>
      <label class="form-group"><span class="form-label">Issued on</span>
        <input id="ucDate" type="date" class="form-input" /></label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="ucSave" class="btn btn-primary">Upload</button>`,
  });
  enhanceModalAccessibility();

  $('#ucSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const data = {
      title:  sanitizeInput($('#ucTitle').value),
      issuer: sanitizeInput($('#ucIssuer').value),
      url:    sanitizeUrl($('#ucUrl').value),
      issued_on: $('#ucDate').value || null,
    };
    const { valid, errors } = validateForm(data, {
      title:  [Validators.required, Validators.maxLength(120)],
      issuer: [Validators.required, Validators.maxLength(120)],
      url:    [Validators.required, Validators.url],
      issued_on: [Validators.pastDate],
    });
    if (!valid) {
      applyValidationErrors(errors, { title: 'ucTitle', issuer: 'ucIssuer', url: 'ucUrl', issued_on: 'ucDate' });
      return;
    }

    disableModalSubmit();
    const res = await modalApiCreate('/api/experts/me/certificates', data, {
      successMessage: 'Certificate uploaded', refresh: true, rerender: true,
    });
    if (res.ok) { closeModal(); clearExpertCache(); } else enableModalSubmit();
  };
}

/* ==================================================================
 * 10. EARNINGS
 * ================================================================== */

async function openEarningsModal() {
  try {
    showLoading(true);
    const [summary, txns] = await Promise.all([
      loadExpertEarnings(true),
      loadExpertTransactions(true),
    ]);
    openModal({
      title: 'Earnings',
      className: 'modal-lg',
      body: `
        <div class="expert-profile-stats">
          <div><strong>${mfFormatMoney(summary.available || 0)}</strong><span>Available</span></div>
          <div><strong>${mfFormatMoney(summary.pending || 0)}</strong><span>Pending</span></div>
          <div><strong>${mfFormatMoney(summary.lifetime || 0)}</strong><span>Lifetime</span></div>
        </div>
        <h3 class="panel-title" style="margin-top:20px">Recent Transactions</h3>
        ${txns.length
          ? txns.slice(0, 10).map(t => `
            <div class="qa-item">
              <p class="qa-q"><i class="fas fa-receipt"></i> ${esc(t.description || 'Transaction')}</p>
              <p class="qa-a">
                <strong>${mfFormatMoney(t.amount || 0)}</strong>
                · ${esc(mfFormatDate(t.created_at))}
                · <span class="text-muted">${esc(t.status || '')}</span>
              </p>
            </div>`).join('')
          : '<p class="empty-row">No transactions yet</p>'}`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-info" data-action="open-statements">Statement</button>
        <button class="btn btn-primary" data-action="open-withdrawal">Withdraw</button>`,
    });
    enhanceModalAccessibility();
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

function openWithdrawalModal() {
  openModal({
    title: 'Withdraw Funds',
    body: `
      <p class="form-hint">Withdrawal requests are subject to a hold period and admin approval. Minimum ${mfFormatMoney(EXPERT_WITHDRAWAL_MIN)}.</p>
      <label class="form-group"><span class="form-label">Amount ($) *</span>
        <input id="wAmount" type="number" min="${EXPERT_WITHDRAWAL_MIN}" step="0.01" class="form-input" /></label>
      <label class="form-group"><span class="form-label">M-Pesa phone *</span>
        <input id="wPhone" class="form-input" placeholder="+254…" /></label>
      <label class="form-group form-checkbox">
        <input id="wConfirm" type="checkbox" />
        <span>I confirm the phone number and amount are correct.</span>
      </label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="wSave" class="btn btn-primary">Request</button>`,
  });

  enhanceModalAccessibility();
  trackFormChanges();

  $('#wSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const data = {
      amount: Number($('#wAmount').value || 0),
      phone:  sanitizeInput($('#wPhone').value),
    };
    const { valid, errors } = validateForm(data, {
      amount: [Validators.required, Validators.min(EXPERT_WITHDRAWAL_MIN)],
      phone:  [Validators.required, Validators.phone],
    });
    if (!valid) {
      applyValidationErrors(errors, { amount: 'wAmount', phone: 'wPhone' });
      return;
    }
    if (!$('#wConfirm').checked) { setModalError('Please confirm the details.'); return; }

    disableModalSubmit();
    const res = await modalApiCreate(ModalFramework.routes.withdrawals, data, {
      successMessage: 'Withdrawal requested',
    });
    if (res.ok) { closeModal(); untrackFormChanges(); clearExpertCache(); }
    else enableModalSubmit();
  };
}

async function openTransactionHistoryModal() {
  try {
    showLoading(true);
    const txns = await loadExpertTransactions(true);
    openModal({
      title: 'Transaction History',
      className: 'modal-lg',
      body: txns.length
        ? `<table class="data-table">
            <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              ${txns.map(t => `
                <tr>
                  <td>${esc(mfFormatDate(t.created_at))}</td>
                  <td>${esc(t.description || '')}</td>
                  <td>${mfFormatMoney(t.amount || 0)}</td>
                  <td>${esc(t.status || '')}</td>
                </tr>`).join('')}
            </tbody>
          </table>`
        : '<p class="empty-row">No transactions yet</p>',
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-info" id="txExport"><i class="fas fa-download"></i> Export CSV</button>`,
    });
    enhanceModalAccessibility();

    $('#txExport').onclick = () => {
      const rows = [['Date', 'Description', 'Amount', 'Status']]
        .concat(txns.map(t => [t.created_at || '', t.description || '', t.amount || 0, t.status || '']));
      const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
      downloadTextFile(`transactions-${Date.now()}.csv`, csv, 'text/csv');
    };
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

async function openStatementModal() {
  const from = await openPromptModal({
    title: 'Statement Period',
    label: 'From (YYYY-MM-DD)',
    inputType: 'date',
    required: true,
  });
  if (!from) return;
  const to = await openPromptModal({
    title: 'Statement Period',
    label: 'To (YYYY-MM-DD)',
    inputType: 'date',
    required: true,
  });
  if (!to) return;

  disableModalSubmit();
  const res = await modalApiRequest('GET', `/api/experts/me/statements?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, null, {
    successMessage: 'Statement ready',
    refresh: false, rerender: false,
  });
  if (res.ok && res.data?.url) {
    window.open(res.data.url, '_blank');
  } else if (res.ok && res.data?.rows) {
    const rows = [['Date', 'Description', 'Amount']]
      .concat(res.data.rows.map(t => [t.created_at || '', t.description || '', t.amount || 0]));
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadTextFile(`statement-${from}_${to}.csv`, csv, 'text/csv');
  }
}

/* ==================================================================
 * 11. REVIEWS
 * ================================================================== */

async function openExpertReviewsModal() {
  try {
    showLoading(true);
    const d = await apiCall('/api/experts/me/reviews');
    const reviews = d?.reviews || [];
    openModal({
      title: 'My Reviews',
      className: 'modal-lg',
      body: reviews.length
        ? reviews.map(r => `
          <div class="qa-item">
            <p class="qa-q">
              <i class="fas fa-star text-warning"></i> ${Number(r.rating || 0).toFixed(1)}
              · ${esc(r.reviewer_name || 'Anonymous')}
              · ${esc(mfRelativeTime(r.created_at))}
            </p>
            ${r.comment ? `<p class="qa-a">${esc(r.comment)}</p>` : ''}
            ${r.reply
              ? `<p class="qa-a"><strong>You replied:</strong> ${esc(r.reply)}</p>`
              : `<button class="btn btn-sm btn-secondary" data-action="reply-review" data-id="${r.id}">Reply</button>`}
          </div>`).join('')
        : '<p class="empty-row">No reviews yet</p>',
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
    enhanceModalAccessibility();
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

function openReplyReviewModal(reviewId) {
  openModal({
    title: 'Reply to Review',
    body: `
      <label class="form-group"><span class="form-label">Your reply *</span>
        <textarea id="rrText" class="form-textarea" rows="4" maxlength="600"></textarea></label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="rrSave" class="btn btn-primary">Send Reply</button>`,
  });
  enhanceModalAccessibility();

  $('#rrSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const reply = sanitizeInput($('#rrText').value);
    if (!reply) { setFieldError('rrText', 'Reply is required'); return; }

    disableModalSubmit();
    const res = await modalApiCreate(`/api/experts/me/reviews/${reviewId}/reply`, { reply }, {
      successMessage: 'Reply posted', refresh: true, rerender: true,
    });
    if (res.ok) closeModal(); else enableModalSubmit();
  };
}

/* ==================================================================
 * 12. Q&A
 * ================================================================== */

async function openExpertQuestionsModal() {
  try {
    showLoading(true);
    const d = await apiCall('/api/experts/me/questions');
    const questions = d?.questions || [];
    openModal({
      title: 'Public Q&A',
      className: 'modal-lg',
      body: questions.length
        ? questions.map(q => `
          <div class="qa-item">
            <p class="qa-q"><i class="fas fa-question-circle"></i> ${esc(q.question)}</p>
            ${q.answer
              ? `<p class="qa-a"><strong>You:</strong> ${esc(q.answer)}</p>`
              : `<button class="btn btn-sm btn-primary" data-action="answer-question" data-id="${q.id}">Answer</button>`}
          </div>`).join('')
        : '<p class="empty-row">No questions yet</p>',
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
    enhanceModalAccessibility();
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

function openAnswerQuestionModal(questionId) {
  openModal({
    title: 'Answer Question',
    body: `
      <label class="form-group"><span class="form-label">Your answer *</span>
        <textarea id="aqText" class="form-textarea" rows="5" maxlength="800"></textarea></label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="aqSave" class="btn btn-primary">Post Answer</button>`,
  });
  enhanceModalAccessibility();

  $('#aqSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const answer = sanitizeInput($('#aqText').value);
    if (!answer) { setFieldError('aqText', 'Answer is required'); return; }

    disableModalSubmit();
    const res = await modalApiCreate(`/api/experts/me/questions/${questionId}/answer`, { answer }, {
      successMessage: 'Answer posted', refresh: true, rerender: true,
    });
    if (res.ok) closeModal(); else enableModalSubmit();
  };
}

/* ==================================================================
 * 13. CONSULTATIONS
 * ================================================================== */

async function openExpertConsultationsModal() {
  try {
    showLoading(true);
    const d = await apiCall('/api/experts/me/consultations');
    const rows = d?.consultations || [];
    openModal({
      title: 'Consultations',
      className: 'modal-lg',
      body: rows.length
        ? `<table class="data-table">
            <thead><tr><th>Client</th><th>When</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${rows.map(c => `
                <tr>
                  <td>${esc(c.client_name || '')}</td>
                  <td>${esc(mfFormatDate(c.scheduled_at, true))}</td>
                  <td>${esc(c.status || '')}</td>
                  <td>
                    ${c.status === 'requested'
                      ? `<button class="btn btn-sm btn-primary" data-action="accept-consult" data-id="${c.id}">Accept</button>
                         <button class="btn btn-sm btn-secondary" data-action="decline-consult" data-id="${c.id}">Decline</button>`
                      : ''}
                    ${c.status === 'in_progress'
                      ? `<button class="btn btn-sm btn-primary" data-action="complete-consult" data-id="${c.id}">Complete</button>`
                      : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>`
        : '<p class="empty-row">No consultations yet</p>',
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
    enhanceModalAccessibility();
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

async function acceptConsultation(consultationId) {
  const { confirmed } = await openConfirmModal({
    title: 'Accept consultation',
    message: 'Accepting will notify the client and confirm the booking.',
    confirmText: 'Accept',
  });
  if (!confirmed) return;
  await modalApiUpdate(`/api/consultations/${consultationId}/accept`, {}, {
    successMessage: 'Consultation accepted', refresh: true, rerender: true,
  });
}

async function declineConsultation(consultationId) {
  const { confirmed, reason } = await openConfirmModal({
    title: 'Decline consultation',
    message: 'Please tell the client why you are declining.',
    confirmText: 'Decline',
    danger: true,
    requireReason: true,
    reasonLabel: 'Reason for declining',
  });
  if (!confirmed) return;
  await modalApiUpdate(`/api/consultations/${consultationId}/decline`, { reason }, {
    successMessage: 'Consultation declined', refresh: true, rerender: true,
  });
}

async function completeConsultation(consultationId) {
  const { confirmed } = await openConfirmModal({
    title: 'Mark complete',
    message: 'Confirm that this consultation has been completed.',
    confirmText: 'Complete',
  });
  if (!confirmed) return;
  await modalApiUpdate(`/api/consultations/${consultationId}/complete`, {}, {
    successMessage: 'Consultation completed', refresh: true, rerender: true,
  });
}

/* ==================================================================
 * 14. ANALYTICS
 * ================================================================== */

async function openExpertAnalyticsModal() {
  try {
    showLoading(true);
    const d = await apiCall('/api/experts/me/analytics');
    const a = d || {};
    openModal({
      title: 'My Analytics',
      className: 'modal-lg',
      body: `
        <div class="expert-profile-stats">
          <div><strong>${a.profile_views || 0}</strong><span>Profile views</span></div>
          <div><strong>${a.bookings || 0}</strong><span>Bookings</span></div>
          <div><strong>${a.completion_rate ? Math.round(a.completion_rate) + '%' : '—'}</strong><span>Completion</span></div>
          <div><strong>${a.response_time_minutes ? a.response_time_minutes + 'm' : '—'}</strong><span>Avg response</span></div>
          <div><strong>${Number(a.average_rating || 0).toFixed(1)}</strong><span>Rating</span></div>
          <div><strong>${a.repeat_clients || 0}</strong><span>Repeat clients</span></div>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
    enhanceModalAccessibility();
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

/* ==================================================================
 * 15. SETTINGS
 * ================================================================== */

function openExpertSettingsModal() {
  const s = S.me?.preferences || {};
  openModal({
    title: 'Expert Settings',
    body: `
      <h3 class="panel-title">Notifications</h3>
      <label class="form-checkbox"><input type="checkbox" id="stNewBooking" ${s.new_booking !== false ? 'checked' : ''} />
        <span>New booking requests</span></label>
      <label class="form-checkbox"><input type="checkbox" id="stNewMessage" ${s.new_message !== false ? 'checked' : ''} />
        <span>New messages</span></label>
      <label class="form-checkbox"><input type="checkbox" id="stNewReview" ${s.new_review !== false ? 'checked' : ''} />
        <span>New reviews</span></label>
      <label class="form-checkbox"><input type="checkbox" id="stMarketing" ${s.marketing ? 'checked' : ''} />
        <span>Marketing emails</span></label>

      <h3 class="panel-title" style="margin-top:16px">Visibility</h3>
      <label class="form-checkbox"><input type="checkbox" id="stPublic" ${s.public_profile !== false ? 'checked' : ''} />
        <span>Listed in public expert directory</span></label>
      <label class="form-checkbox"><input type="checkbox" id="stInstant" ${s.instant_consult ? 'checked' : ''} />
        <span>Available for instant consultations</span></label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="stSave" class="btn btn-primary">Save Settings</button>`,
  });
  enhanceModalAccessibility();

  $('#stSave').onclick = async () => {
    clearModalError();
    const data = {
      new_booking: $('#stNewBooking').checked,
      new_message: $('#stNewMessage').checked,
      new_review:  $('#stNewReview').checked,
      marketing:   $('#stMarketing').checked,
      public_profile: $('#stPublic').checked,
      instant_consult: $('#stInstant').checked,
    };
    disableModalSubmit();
    const res = await modalApiUpdate('/api/experts/me/settings', data, {
      successMessage: 'Settings saved', refresh: true, rerender: true,
    });
    if (res.ok) closeModal(); else enableModalSubmit();
  };
}

/* ==================================================================
 * 16. PUBLIC PREVIEW (identity-preserving views)
 * ================================================================== */

async function openExpertProfileModal(expertId) {
  try {
    showLoading(true);
    const [profile, questions] = await Promise.all([
      apiCall(`/api/user/experts/${expertId}`),
      apiCall(`/api/experts/${expertId}/questions`).catch(() => ({ questions: [] })),
    ]);
    const e = profile.expert || {};
    const reviews = profile.reviews || [];

    openModal({
      title: e.name,
      className: 'modal-lg',
      body: `
        <div class="expert-profile-header">
          <img class="expert-avatar-lg" src="${avatar(e)}" alt="" />
          <div class="expert-profile-info">
            <h2>${esc(e.name)}
              ${e.verified_badge ? '<span class="badge-verified"><i class="fas fa-check-circle"></i> Verified</span>' : ''}
            </h2>
            <p class="expert-profile-spec">${esc(e.specialization || '')}</p>
            <p class="expert-profile-rate">${fmtCur(e.hourly_rate)} / hour</p>
            <div class="expert-profile-stats">
              <div><strong>${Number(e.average_rating || 0).toFixed(1)}</strong><span>Rating</span></div>
              <div><strong>${reviews.length}</strong><span>Reviews</span></div>
              <div><strong>${e.response_time_minutes ? e.response_time_minutes + 'm' : '—'}</strong><span>Response</span></div>
              <div><strong>${e.completion_rate ? Math.round(e.completion_rate) + '%' : '—'}</strong><span>Completion</span></div>
            </div>
          </div>
        </div>
        ${e.bio ? `<p class="expert-profile-bio">${esc(e.bio)}</p>` : ''}
        ${(e.languages || []).length ? `<p class="form-hint">Languages: ${esc(e.languages.join(', '))}</p>` : ''}

        <h3 class="panel-title" style="margin-top:20px">Public Q&A</h3>
        ${questions.questions?.length
          ? questions.questions.slice(0, 5).map(q => `
            <div class="qa-item">
              <p class="qa-q"><i class="fas fa-question-circle"></i> ${esc(q.question)}</p>
              ${q.answer
                ? `<p class="qa-a"><strong>${esc(e.name)}:</strong> ${esc(q.answer)}</p>`
                : '<p class="qa-pending">Awaiting answer</p>'}
            </div>`).join('')
          : '<p class="empty-row">No questions yet</p>'}`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-info" data-action="toggle-shortlist" data-id="${e.id}">
          <i class="fas fa-bookmark"></i> Shortlist</button>
        <button class="btn btn-primary" data-action="book-slot-with" data-id="${e.id}" data-name="${esc(e.name)}">
          <i class="fas fa-calendar-plus"></i> Book</button>`,
    });
    enhanceModalAccessibility();
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

/* ==================================================================
 * BACKWARD-COMPAT: keep old export names available
 * ================================================================== */

window.ExpertModals = {
  openPortfolioItemModal,
  openEditTiersModal,
  openExpertProfileModal,
  // new
  openAddPortfolioItemModal,
  openEditPortfolioItemModal,
  openDeletePortfolioItemModal,
  openPortfolioPreviewModal,
  reorderPortfolioItem,
  publishPortfolioItem,
  openDeleteTierModal,
  openPackageModal,
  openDiscountModal,
  openEditExpertProfileModal,
  openExpertQualificationsModal,
  openExpertLanguagesModal,
  openAvailabilityModal,
  openHolidayModal,
  openBlockTimeModal,
  openVerificationStatusModal,
  openVerificationModal,
  openUploadCertificateModal,
  openEarningsModal,
  openWithdrawalModal,
  openTransactionHistoryModal,
  openStatementModal,
  openExpertReviewsModal,
  openReplyReviewModal,
  openExpertQuestionsModal,
  openAnswerQuestionModal,
  openExpertConsultationsModal,
  acceptConsultation,
  declineConsultation,
  completeConsultation,
  openExpertAnalyticsModal,
  openExpertSettingsModal,
  clearExpertCache,
};