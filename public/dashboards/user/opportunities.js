/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/opportunities.js (NEW) */
/* Stage 8 §23D: opportunity discovery with source verification, */
/* freshness display, external-link warning, no-fee guard, */
/* report-expired. Reuses common helpers; no duplicate systems. */
/* ============================================================ */

const OPPS_PAGE_SIZE = 12;

let __oppsLoaded = false;

async function _loadOpportunities({ force = false } = {}) {
  if (__oppsLoaded && !force) return;
  const [list, saved] = await Promise.allSettled([
    apiCall('/api/opportunities?limit=50').catch(() => ({ opportunities: [] })),
    apiCall('/api/opportunities/saved').catch(() => ({ opportunities: [] })),
  ]);
  if (list.status === 'fulfilled') S.opportunities = list.value?.opportunities || [];
  if (saved.status === 'fulfilled') S.savedOpportunities = saved.value?.opportunities || [];
  __oppsLoaded = true;
}

function _oppsFilters() {
  return {
    q:        UserFilters.get('opportunities', 'q', '') || '',
    category: UserFilters.get('opportunities', 'category', '') || '',
    region:   UserFilters.get('opportunities', 'region', '') || '',
    savedOnly:UserFilters.get('opportunities', 'savedOnly', false),
    page:     Number(UserFilters.get('opportunities', 'page', 1)) || 1,
  };
}

function renderUserOpportunities() {
  if (!__oppsLoaded) {
    _loadOpportunities().then(() => rerenderRoleContent()).catch(() => {});
  }

  const f = _oppsFilters();
  const all = S.opportunities || [];
  const savedIds = new Set((S.savedOpportunities || []).map(o => String(o.id)));

  const categories = Array.from(new Set(all.map(o => o.category).filter(Boolean))).sort();
  const regions    = Array.from(new Set(all.map(o => o.region).filter(Boolean))).sort();

  let filtered = all.slice();
  if (f.q) {
    const q = f.q.toLowerCase();
    filtered = filtered.filter(o =>
      (o.title || '').toLowerCase().includes(q) ||
      (o.provider || '').toLowerCase().includes(q) ||
      (o.description || '').toLowerCase().includes(q));
  }
  if (f.category) filtered = filtered.filter(o => o.category === f.category);
  if (f.region)   filtered = filtered.filter(o => o.region === f.region);
  if (f.savedOnly) filtered = filtered.filter(o => savedIds.has(String(o.id)));

  const total = filtered.length;
  const page  = Math.min(f.page, Math.max(1, Math.ceil(total / OPPS_PAGE_SIZE)));
  const paged = filtered.slice((page - 1) * OPPS_PAGE_SIZE, page * OPPS_PAGE_SIZE);

  return UserUI.page({
    title: 'Opportunities',
    breadcrumb: 'Opportunities',
    actions: `
      <button class="btn btn-secondary" data-action="opportunities-report-expired">
        <i class="fas fa-flag"></i> Report a Listing</button>
    `,
    content: `
      <div class="alert alert-warning">
        <i class="fas fa-shield-alt"></i>
        <div>
          <strong>Verify before applying.</strong> ExpertHub does not collect application fees on behalf
          of providers. Always confirm details on the official provider website. Report suspicious listings.
        </div>
      </div>

      <section class="panel">
        <div class="expert-filters">
          <input type="search" id="opps-search" class="form-input"
                 placeholder="Search opportunities..." value="${esc(f.q)}"
                 style="max-width:240px" aria-label="Search opportunities" />
          <select id="opps-category" class="form-select" style="max-width:180px" aria-label="Category">
            <option value="">All categories</option>
            ${categories.map(c => `<option value="${esc(c)}" ${f.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
          <select id="opps-region" class="form-select" style="max-width:180px" aria-label="Region">
            <option value="">Any region</option>
            ${regions.map(r => `<option value="${esc(r)}" ${f.region === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}
          </select>
          <label class="checkbox-row">
            <input type="checkbox" id="opps-saved" ${f.savedOnly ? 'checked' : ''} /> Saved only
          </label>
          <button class="btn btn-ghost btn-sm" data-action="opportunities-clear-filters">
            <i class="fas fa-eraser"></i> Clear</button>
        </div>

        ${paged.length ? UserUI.cardGrid(paged.map(o => renderOpportunityCard(o, savedIds.has(String(o.id))))) : UserUI.empty({
          icon: 'fa-briefcase',
          title: 'No opportunities match your filters',
          desc: 'Try adjusting the search or category.',
        })}

        ${UserUI.pagination({ page, pageSize: OPPS_PAGE_SIZE, total, action: 'opportunities-page', key: 'opportunities' })}
      </section>
    `,
  });
}

function renderOpportunityCard(o, isSaved) {
  const stale = o.last_checked_at && (Date.now() - new Date(o.last_checked_at).getTime() > 30 * 86400000);
  const closed = o.deadline && new Date(o.deadline) < new Date();

  return `
    <article class="program-card">
      <div style="display:flex;justify-content:space-between;gap:8px">
        <span class="chip chip-blue">${esc(o.category || 'Opportunity')}</span>
        ${o.verified_source
          ? '<span class="chip chip-green" title="Provider verified"><i class="fas fa-check-shield"></i> Verified</span>'
          : '<span class="chip chip-yellow" title="Not yet verified"><i class="fas fa-exclamation-triangle"></i> Unverified</span>'}
        ${closed ? '<span class="chip chip-red">Closed</span>' : ''}
      </div>
      <h4 class="program-title">${esc(o.title || '')}</h4>
      <p class="program-desc">${esc((o.description || '').slice(0, 140))}</p>
      <p class="program-meta">
        ${o.provider ? `<strong>${esc(o.provider)}</strong> · ` : ''}
        ${o.location ? esc(o.location) + ' · ' : ''}
        ${o.delivery_mode ? esc(o.delivery_mode) + ' · ' : ''}
        ${o.deadline ? `Deadline: ${fmtDate(o.deadline)}` : 'No deadline'}
      </p>
      ${stale ? `<p class="form-hint"><i class="fas fa-clock"></i>
        Last verified ${timeAgo(o.last_checked_at)} — confirm details on the source.</p>` : ''}
      <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
        ${o.source_url ? `
          <button class="btn btn-primary btn-sm flex-1" data-action="opps-open-external"
                  data-url="${esc(o.source_url)}" data-title="${esc(o.title || '')}">
            <i class="fas fa-external-link-alt"></i> Open official page</button>
        ` : '<button class="btn btn-secondary btn-sm flex-1" disabled>No source link</button>'}
        <button class="btn btn-secondary btn-sm" data-action="opps-toggle-save" data-id="${o.id}"
                aria-label="${isSaved ? 'Remove bookmark' : 'Save'}">
          <i class="fas fa-bookmark" style="color:${isSaved ? 'var(--warning)' : 'inherit'}"></i></button>
        <button class="btn btn-warning btn-sm" data-action="opps-report-item" data-id="${o.id}"
                aria-label="Report listing">
          <i class="fas fa-flag"></i></button>
      </div>
    </article>
  `;
}

window.ExpertHubUser.registerModule('opportunities', renderUserOpportunities);

window.ExpertHubUser.registerModule('opportunities', renderUserOpportunities, {
  init() {
    const rerender = debounce(() => rerenderRoleContent(), 250);
    const $set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
    $set('opps-search',   el => el.oninput  = () => { UserFilters.set('opportunities', 'q', el.value); rerender(); });
    $set('opps-category', el => el.onchange = () => { UserFilters.set('opportunities', 'category', el.value); rerenderRoleContent(); });
    $set('opps-region',   el => el.onchange = () => { UserFilters.set('opportunities', 'region', el.value); rerenderRoleContent(); });
    $set('opps-saved',    el => el.onchange = () => { UserFilters.set('opportunities', 'savedOnly', el.checked); rerenderRoleContent(); });
  },
});

/* ============================================================ */
/* Actions */
/* ============================================================ */

window.ExpertHubUser.registerAction('opportunities-clear-filters', () => {
  UserFilters.clear('opportunities');
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('opportunities-page', (_, el) => {
  UserFilters.set('opportunities', 'page', Number(el?.dataset?.page || 1));
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('opps-open-external', (_, el) => {
  const url = el?.dataset?.url;
  const title = el?.dataset?.title || 'Opportunity';
  if (!url) return;

  // Validate scheme client-side as a UX aid; backend must still whitelist sources
  let parsed;
  try { parsed = new URL(url); } catch { return showToast('Invalid URL', 'error'); }
  if (!/^https?:$/.test(parsed.protocol)) {
    return showToast('This link uses an unsupported protocol', 'error');
  }

  openModal({
    title: 'Leaving ExpertHub',
    body: `
      <p>You are about to leave ExpertHub and open the official source for:</p>
      <p><strong>${esc(title)}</strong></p>
      <p class="form-hint" style="word-break:break-all">${esc(url)}</p>
      <div class="alert alert-warning">
        <i class="fas fa-shield-alt"></i>
        Confirm details on the provider's website. ExpertHub does not charge application fees on behalf of
        external providers.
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <a class="btn btn-primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer"
         onclick="closeModal()">
        Continue to provider <i class="fas fa-external-link-alt"></i></a>
    `,
  });
});

window.ExpertHubUser.registerAction('opps-toggle-save', async (id) => {
  try {
    const d = await apiCall(`/api/opportunities/${id}/bookmark`, 'POST');
    const saved = await apiCall('/api/opportunities/saved').catch(() => ({ opportunities: [] }));
    S.savedOpportunities = saved.opportunities || [];
    rerenderRoleContent();
    showToast(d?.saved ? 'Saved' : 'Removed from saved', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('opps-report-item', (id) => {
  UserUI.formModal({
    title: 'Report Listing',
    fields: [
      { name: 'reason', label: 'Reason', type: 'select', required: true,
        options: [
          { value: 'expired',    label: 'Opportunity has expired' },
          { value: 'fraudulent', label: 'Suspicious or fraudulent' },
          { value: 'incorrect',  label: 'Incorrect information' },
          { value: 'fees',       label: 'Asks for payment on ExpertHub' },
          { value: 'inappropriate', label: 'Inappropriate content' },
          { value: 'other',      label: 'Other' },
        ]},
      { name: 'details', label: 'Details', type: 'textarea', rows: 3 },
    ],
    submitLabel: 'Submit Report',
    onSubmit: async (v) => {
      await apiCall(`/api/opportunities/${id}/report`, 'POST', v);
      closeModal();
      showToast('Report submitted — our team will review', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('opportunities-report-expired', () => {
  openModal({
    title: 'Report an Expired or Suspicious Listing',
    body: `
      <label class="form-group"><span class="form-label">Link or title</span>
        <input id="orLink" class="form-input" required /></label>
      <label class="form-group"><span class="form-label">What is wrong?</span>
        <select id="orReason" class="form-select">
          <option value="expired">Expired</option>
          <option value="fraudulent">Fraudulent</option>
          <option value="incorrect">Incorrect</option>
          <option value="fees">Asks for payment on ExpertHub</option>
        </select></label>
      <label class="form-group"><span class="form-label">Details</span>
        <textarea id="orDetails" class="form-textarea" rows="3"></textarea></label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="orSave" class="btn btn-primary">Submit</button>
    `,
  });
  $('#orSave').onclick = async () => {
    const link = $('#orLink').value.trim();
    if (!link) return showToast('Enter a link or title', 'error');
    try {
      await apiCall('/api/opportunities/report', 'POST', {
        link, reason: $('#orReason').value, details: $('#orDetails').value || null,
      });
      closeModal();
      showToast('Thank you — our team will review', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
});
