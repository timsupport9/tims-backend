/* ============================================================
   ExpertHub 2.0 — dashboards/user/experts.js
   Find Experts with persistent filters, pagination,
   backend-powered search, availability preview,
   enhanced booking (date/time/duration/pricing).
   ============================================================ */

const EXPERT_PAGE_SIZE = 12;
const EXPERT_FILTER_KEY = 'experts';

function _getExpertFilters() {
  return {
    query:       UserFilters.get(EXPERT_FILTER_KEY, 'q', ''),
    budget:      UserFilters.get(EXPERT_FILTER_KEY, 'budget', ''),
    instantOnly: UserFilters.get(EXPERT_FILTER_KEY, 'instant', false),
    category:    UserFilters.get(EXPERT_FILTER_KEY, 'category', ''),
    language:    UserFilters.get(EXPERT_FILTER_KEY, 'language', ''),
    sortBy:      UserFilters.get(EXPERT_FILTER_KEY, 'sort', 'rating'),
    page:        Number(UserFilters.get(EXPERT_FILTER_KEY, 'page', 1)) || 1,
  };
}

function _setExpertFilter(name, value) {
  UserFilters.set(EXPERT_FILTER_KEY, name, value);
  if (name !== 'page') UserFilters.set(EXPERT_FILTER_KEY, 'page', 1);
}

function renderUserExperts() {
  const f = _getExpertFilters();
  const shortlistIds = new Set((S.userShortlist || []).map(x => String(x.expert_id)));
  const categories = Array.from(new Set((S.experts || []).map(e => e.category).filter(Boolean))).sort();
  const languages  = Array.from(new Set((S.experts || []).flatMap(e => e.languages || []).filter(Boolean))).sort();

  let filtered = (S.experts || []).slice();
  if (f.query) filtered = filtered.filter(e =>
    (e.name || '').toLowerCase().includes(f.query.toLowerCase()) ||
    (e.specialization || '').toLowerCase().includes(f.query.toLowerCase())
  );
  if (f.budget) filtered = filtered.filter(e => Number(e.hourly_rate || 0) <= Number(f.budget));
  if (f.instantOnly) filtered = filtered.filter(e => e.is_online || e.instant_available);
  if (f.category) filtered = filtered.filter(e => e.category === f.category);
  if (f.language) filtered = filtered.filter(e => (e.languages || []).includes(f.language));

  filtered.sort((a, b) => {
    if (f.sortBy === 'price_asc')  return Number(a.hourly_rate||0) - Number(b.hourly_rate||0);
    if (f.sortBy === 'price_desc') return Number(b.hourly_rate||0) - Number(a.hourly_rate||0);
    if (f.sortBy === 'response')   return Number(a.response_time_minutes||999) - Number(b.response_time_minutes||999);
    return Number(b.average_rating||0) - Number(a.average_rating||0);
  });

  const total = filtered.length;
  const page = Math.min(f.page, Math.max(1, Math.ceil(total / EXPERT_PAGE_SIZE)));
  const paged = filtered.slice((page - 1) * EXPERT_PAGE_SIZE, page * EXPERT_PAGE_SIZE);

  return UserUI.page({
    title: 'Find Experts',
    breadcrumb: 'Experts',
    actions: `
      <button class="btn btn-secondary" data-action="find-expert-wizard">
        <i class="fas fa-magic"></i> Match Me</button>
      <button class="btn btn-primary" data-action="instant-consultation">
        <i class="fas fa-bolt"></i> Talk Now</button>
    `,
    content: `
      <section class="panel">
        <div class="expert-filters">
          <input type="search" id="expert-search" class="form-input"
                 placeholder="Search by name or specialization"
                 value="${esc(f.query)}" style="max-width:240px" aria-label="Search experts" />
          <input type="number" id="expert-budget" class="form-input"
                 placeholder="Max $/hour" value="${esc(f.budget)}" style="max-width:130px" aria-label="Max hourly rate" />
          <select id="expert-category" class="form-select" aria-label="Category">
            <option value="">All categories</option>
            ${categories.map(c => `<option value="${esc(c)}" ${f.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
          <select id="expert-language" class="form-select" aria-label="Language">
            <option value="">Any language</option>
            ${languages.map(l => `<option value="${esc(l)}" ${f.language === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}
          </select>
          <select id="expert-sort" class="form-select" aria-label="Sort">
            <option value="rating"     ${f.sortBy === 'rating' ? 'selected' : ''}>Top rated</option>
            <option value="price_asc"  ${f.sortBy === 'price_asc' ? 'selected' : ''}>Price: low → high</option>
            <option value="price_desc" ${f.sortBy === 'price_desc' ? 'selected' : ''}>Price: high → low</option>
            <option value="response"   ${f.sortBy === 'response' ? 'selected' : ''}>Fastest response</option>
          </select>
          <label class="checkbox-row">
            <input type="checkbox" id="expert-instant" ${f.instantOnly ? 'checked' : ''} />
            Online now
          </label>
          <button class="btn btn-ghost btn-sm" data-action="clear-expert-filters">
            <i class="fas fa-eraser"></i> Clear</button>
        </div>

        <p class="program-meta" style="margin:8px 0">${total} expert${total === 1 ? '' : 's'} found</p>

        <section class="card-grid">
          ${paged.map(e => {
            const isShortlisted = shortlistIds.has(String(e.id));
            return `
              <article class="expert-card">
                <div style="position:relative">
                  <img class="expert-avatar" src="${avatar(e)}" alt="" />
                  ${e.is_online ? '<span class="expert-online-dot" title="Online now"></span>' : ''}
                </div>
                <h4 class="expert-name">
                  ${esc(e.name || '')}
                  ${e.verified_badge
                    ? '<span class="badge-verified-sm" title="Verified by ExpertHub"><i class="fas fa-check-circle"></i></span>'
                    : ''}
                </h4>
                <p class="expert-expertise">${esc(e.specialization || '—')}</p>
                <p class="expert-rate">${fmtCur(e.hourly_rate || 0)} / hr</p>
                <p class="expert-rating">
                  <i class="fas fa-star" style="color:#f59e0b"></i>
                  <span class="expert-rating-value">${Number(e.average_rating || 0).toFixed(1)}</span>
                  ${e.response_time_minutes ? `<span class="expert-response">· ~${e.response_time_minutes}m response</span>` : ''}
                </p>
                <div class="expert-card-actions">
                  <button class="btn btn-primary btn-sm flex-1" data-action="book-expert"
                          data-id="${e.id}" data-name="${esc(e.name || '')}">
                    <i class="fas fa-calendar-plus"></i> Book</button>
                  <button class="btn btn-secondary btn-sm" data-action="view-expert-profile" data-id="${e.id}"
                          aria-label="View profile">
                    <i class="fas fa-eye"></i></button>
                  <button class="btn btn-secondary btn-sm" data-action="toggle-shortlist" data-id="${e.id}"
                          aria-label="${isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}">
                    <i class="fas fa-bookmark" style="color:${isShortlisted ? 'var(--warning)' : 'inherit'}"></i></button>
                </div>
              </article>
            `;
          }).join('') || UserUI.empty({
            icon: 'fa-search',
            title: 'No experts found',
            desc: 'Try adjusting your filters or clear them to see all experts.',
          })}
        </section>

        ${UserUI.pagination({ page, pageSize: EXPERT_PAGE_SIZE, total, action: 'user-paginate', key: EXPERT_FILTER_KEY })}
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('experts', renderUserExperts);

/* ---------------- Filter bindings (re-attached after every render) ---------------- */
window.ExpertHubUser.registerModule('experts', renderUserExperts, {
  init() {
    const s = $('#expert-search');
    const b = $('#expert-budget');
    const c = $('#expert-category');
    const l = $('#expert-language');
    const so = $('#expert-sort');
    const i = $('#expert-instant');
    const rerender = debounce(() => rerenderRoleContent(), 250);

    if (s)  s.oninput  = () => { _setExpertFilter('q', s.value); rerender(); };
    if (b)  b.oninput  = () => { _setExpertFilter('budget', b.value); rerender(); };
    if (c)  c.onchange = () => { _setExpertFilter('category', c.value); rerenderRoleContent(); };
    if (l)  l.onchange = () => { _setExpertFilter('language', l.value); rerenderRoleContent(); };
    if (so) so.onchange= () => { _setExpertFilter('sort', so.value); rerenderRoleContent(); };
    if (i)  i.onchange = () => { _setExpertFilter('instant', i.checked); rerenderRoleContent(); };
  },
});

window.ExpertHubUser.registerAction('clear-expert-filters', () => {
  UserFilters.clear(EXPERT_FILTER_KEY);
  rerenderRoleContent();
});

/* ---------------- Actions ---------------- */
window.ExpertHubUser.registerAction('view-expert-profile', (id) => {
  const e = S.experts.find(x => String(x.id) === String(id)) || {};
  openModal({
    title: e.name || 'Expert Profile',
    className: 'modal-lg',
    body: `
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(e)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(e.name || '')}
            ${e.verified_badge ? '<span class="chip chip-green">Verified</span>' : ''}</h2>
          <p class="profile-email">${esc(e.specialization || '')}</p>
        </div>
      </div>
      <div class="expert-detail-stats">
        <div><strong>${fmtCur(e.hourly_rate || 0)}</strong><span>per hour</span></div>
        <div><strong>${Number(e.average_rating || 0).toFixed(1)}</strong><span>rating</span></div>
        <div><strong>${e.response_time_minutes ? e.response_time_minutes + 'm' : '—'}</strong><span>response</span></div>
      </div>
      <p><strong>Bio:</strong> ${esc(e.bio || 'No bio provided')}</p>
      ${(e.languages || []).length ? `<p><strong>Languages:</strong> ${esc((e.languages || []).join(', '))}</p>` : ''}
      ${e.is_online
        ? '<p><span class="chip chip-green"><i class="fas fa-circle"></i> Online now</span></p>'
        : '<p class="form-hint">Currently offline</p>'}
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      <button class="btn btn-primary" data-action="book-expert"
              data-id="${esc(e.id)}" data-name="${esc(e.name || '')}"
              onclick="closeModal()">
        <i class="fas fa-calendar-plus"></i> Book Consultation</button>
    `,
  });
});

window.ExpertHubUser.registerAction('toggle-shortlist', async (id) => {
  try {
    const d = await apiCall('/api/user/shortlist/toggle', 'POST', { expert_id: Number(id) });
    if (Array.isArray(d?.items)) {
      S.userShortlist = d.items;
    } else {
      const list = await apiCall('/api/user/shortlist').catch(() => ({ items: [] }));
      S.userShortlist = list.items || [];
    }
    rerenderRoleContent();
    showToast('Shortlist updated', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('book-expert', async (id, el) => {
  const expert = S.experts.find(x => String(x.id) === String(id)) || {};
  const name = el?.dataset?.name || expert.name || 'Expert';
  const hourlyRate = Number(expert.hourly_rate || 0);

  // Fetch authoritative pricing + availability from backend
  let pricing = null;
  try {
    pricing = await apiCall(`/api/user/experts/${id}/pricing`).catch(() => null);
  } catch {}

  const price = pricing?.price ?? hourlyRate;
  const currency = pricing?.currency || 'USD';
  const durations = pricing?.durations || [30, 45, 60];

  openModal({
    title: `Book ${name}`,
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Session Title</span>
        <input id="bkTitle" class="form-input" required /></label>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Date</span>
          <input id="bkDate" type="date" class="form-input" min="${new Date().toISOString().slice(0,10)}" required />
        </label>
        <label class="form-group">
          <span class="form-label">Time</span>
          <input id="bkTime" type="time" class="form-input" required />
        </label>
        <label class="form-group">
          <span class="form-label">Duration</span>
          <select id="bkDuration" class="form-select">
            ${durations.map(d => `<option value="${d}">${d} minutes</option>`).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Type</span>
          <select id="bkType" class="form-select">
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="chat">Chat</option>
          </select>
        </label>
      </div>
      <label class="form-group"><span class="form-label">Describe your issue</span>
        <textarea id="bkDesc" class="form-textarea" rows="4" required></textarea></label>

      <div class="pricing-summary">
        <p><strong>Estimated total:</strong>
          <span id="bkTotal">${fmtCur(price * 0.5)}</span>
          <span class="form-hint">(final price confirmed on server)</span>
        </p>
        <p class="form-hint">Your wallet balance: ${fmtCur(S.wallet?.balance || 0)}</p>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="bkSave" class="btn btn-primary">
        <i class="fas fa-credit-card"></i> Book &amp; Pay</button>
    `,
  });

  const recompute = () => {
    const dur = Number($('#bkDuration')?.value || 30);
    const total = price * (dur / 60);
    const t = $('#bkTotal'); if (t) t.textContent = fmtCur(total);
  };
  const durSel = $('#bkDuration'); if (durSel) durSel.onchange = recompute;
  recompute();

  $('#bkSave').onclick = async () => {
    const title = $('#bkTitle').value.trim();
    const description = $('#bkDesc').value.trim();
    const date = $('#bkDate').value;
    const time = $('#bkTime').value;
    if (!title || !description || !date || !time) {
      return showToast('Please fill all required fields', 'error');
    }
    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    try {
      const d = await apiCall('/api/user/consultations', 'POST', {
        title, description,
        consultation_type: $('#bkType').value,
        duration_minutes: Number($('#bkDuration').value),
        expert_id: Number(id),
        scheduled_at: scheduledAt,
      });
      closeModal();
      await reloadConsultations();
      await refreshUserSnapshot();
      rerenderRoleContent();
      showToast(`Consultation booked — ${fmtCur(d?.price ?? 0)}`, 'success', 6000);
      if (d?.requires_payment && d?.payment_url) {
        window.location.href = d.payment_url;
      }
    } catch (e) { showToast(e.message, 'error'); }
  };
});

window.ExpertHubUser.registerAction('find-expert-wizard', () => {
  openModal({
    title: 'Match Me With an Expert',
    body: `
      <label class="form-group"><span class="form-label">What do you need help with?</span>
        <textarea id="mwNeed" class="form-textarea" rows="3" placeholder="e.g. Career switch to data science" required></textarea></label>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Budget per hour (USD)</span>
          <input id="mwBudget" type="number" class="form-input" min="0" value="100" />
        </label>
        <label class="form-group">
          <span class="form-label">Preferred availability</span>
          <select id="mwAvail" class="form-select">
            <option value="any">Any time</option>
            <option value="today">Today</option>
            <option value="this_week">This week</option>
          </select>
        </label>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="mwFind" class="btn btn-primary"><i class="fas fa-magic"></i> Find Matches</button>
    `,
  });
  $('#mwFind').onclick = async () => {
    const need = $('#mwNeed').value.trim();
    if (!need) return showToast('Describe what you need', 'error');
    try {
      showLoading(true);
      const d = await apiCall('/api/user/experts/match', 'POST', {
        need,
        budget: Number($('#mwBudget').value || 0),
        availability: $('#mwAvail').value,
      });
      const matches = d.matches || [];
      closeModal();
      if (!matches.length) return showToast('No matches found — try widening your filters', 'warning');
      openModal({
        title: 'Top Matches',
        className: 'modal-lg',
        body: matches.map(m => `
          <div class="expert-card">
            <img class="expert-avatar" src="${avatar(m)}" alt="" />
            <h4 class="expert-name">${esc(m.name)}</h4>
            <p class="expert-expertise">${esc(m.specialization || '')}</p>
            <p class="expert-rate">${fmtCur(m.hourly_rate)}/hr · ${m.match_score || 0}% match</p>
            <button class="btn btn-primary btn-sm" data-action="book-expert"
                    data-id="${m.id}" data-name="${esc(m.name)}"
                    onclick="closeModal()">
              <i class="fas fa-calendar-plus"></i> Book</button>
          </div>
        `).join(''),
        footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
      });
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
});

window.ExpertHubUser.registerAction('instant-consultation', async () => {
  try {
    showLoading(true);
    // Validate availability first — do not blindly assign
    const avail = await apiCall('/api/user/experts/instant/available').catch(() => ({ available: true }));
    if (avail && avail.available === false) {
      showLoading(false);
      return showToast('No expert available right now. We alerted our team.', 'info', 6000);
    }
    const d = await apiCall('/api/user/experts/instant', 'POST');
    closeModal();
    await reloadConsultations();
    await refreshUserSnapshot();
    rerenderRoleContent();
    if (d.consultation_id) {
      showToast('Expert assigned — opening session', 'success');
      location.hash = `#/consultation/${d.consultation_id}`;
    } else {
      showToast('Request queued. You will be matched shortly.', 'info', 6000);
    }
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});