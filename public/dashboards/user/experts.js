/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/experts.js */
/* Expert discovery + guided booking (service → availability → */
/* slot → mode → submit). Server-validated pricing and slots, */
/* idempotency-protected submission, time-zone-aware display. */
/* ============================================================ */

const EXPERT_PAGE_SIZE = 12;
const EXPERT_FILTER_KEY = 'experts';

function _getExpertFilters() {
  return {
    query:       UserFilters.get(EXPERT_FILTER_KEY, 'q', ''),
    budget:      UserFilters.get(EXPERT_FILTER_KEY, 'budget', ''),
    instantOnly: UserFilters.get(EXPERT_FILTER_KEY, 'instant', false),
    category:    UserFilters.get(EXPERT_FILTER_KEY, 'category', ''),
    language:    UserFilters.get(EXPERT_FILTER_KEY, 'language', ''),
    mode:        UserFilters.get(EXPERT_FILTER_KEY, 'mode', ''),
    sortBy:      UserFilters.get(EXPERT_FILTER_KEY, 'sort', 'rating'),
    page:        Number(UserFilters.get(EXPERT_FILTER_KEY, 'page', 1)) || 1,
  };
}

function _setExpertFilter(name, value) {
  UserFilters.set(EXPERT_FILTER_KEY, name, value);
  if (name !== 'page') UserFilters.set(EXPERT_FILTER_KEY, 'page', 1);
}

/* ============================================================ */
/* Availability cache — short-lived, cleared on successful book */
/* ============================================================ */

const __expertAvailabilityCache = new Map();
function _cacheKey(expertId, date) { return `${expertId}::${date}`; }
function _clearAvailabilityCache(expertId) {
  for (const k of Array.from(__expertAvailabilityCache.keys())) {
    if (k.startsWith(`${expertId}::`)) __expertAvailabilityCache.delete(k);
  }
}

async function _fetchAvailability(expertId, dateISO) {
  const key = _cacheKey(expertId, dateISO);
  const hit = __expertAvailabilityCache.get(key);
  if (hit && Date.now() - hit.at < 60000) return hit.data;
  const data = await apiCall(
    `/api/user/experts/${expertId}/availability?date=${encodeURIComponent(dateISO)}`
  ).catch(() => ({ slots: [] }));
  __expertAvailabilityCache.set(key, { at: Date.now(), data });
  return data;
}

function _fmtTimeOnly(d, tz) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleTimeString('en-US', {
      timeZone: tz || 'UTC', hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch {
    return new Date(d).toTimeString().slice(0, 5);
  }
}

async function _loadExpertServices(expertId, fallbackRate) {
  const d = await apiCall(`/api/user/experts/${expertId}/services`).catch(() => null);
  if (Array.isArray(d?.services) && d.services.length) return d.services;
  // Fallback: hourly-rate represented as a single 60-minute service.
  // Preserves backward compatibility where /services doesn't exist yet.
  return [{
    id: 'default_60',
    name: 'Standard 60-minute session',
    duration_minutes: 60,
    price: Number(fallbackRate || 0),
    currency: 'USD',
  }];
}

/* ============================================================ */
/* List renderer */
/* ============================================================ */

function renderUserExperts() {
  const f = _getExpertFilters();
  const shortlistIds = new Set((S.userShortlist || []).map(x => String(x.expert_id)));
  const categories   = Array.from(new Set((S.experts || []).map(e => e.category).filter(Boolean))).sort();
  const languages    = Array.from(new Set((S.experts || []).flatMap(e => e.languages || []).filter(Boolean))).sort();

  let filtered = (S.experts || []).slice();
  if (f.query) filtered = filtered.filter(e =>
    (e.name || '').toLowerCase().includes(f.query.toLowerCase()) ||
    (e.specialization || '').toLowerCase().includes(f.query.toLowerCase()));
  if (f.budget) filtered = filtered.filter(e => Number(e.hourly_rate || 0) <= Number(f.budget));
  if (f.instantOnly) filtered = filtered.filter(e => e.is_online || e.instant_available);
  if (f.category) filtered = filtered.filter(e => e.category === f.category);
  if (f.language) filtered = filtered.filter(e => (e.languages || []).includes(f.language));
  if (f.mode)     filtered = filtered.filter(e => (e.supported_modes || ['video', 'audio', 'chat']).includes(f.mode));

  filtered.sort((a, b) => {
    if (f.sortBy === 'price_asc')  return Number(a.hourly_rate||0) - Number(b.hourly_rate||0);
    if (f.sortBy === 'price_desc') return Number(b.hourly_rate||0) - Number(a.hourly_rate||0);
    if (f.sortBy === 'response')   return Number(a.response_time_minutes||999) - Number(b.response_time_minutes||999);
    return Number(b.average_rating||0) - Number(a.average_rating||0);
  });

  const total = filtered.length;
  const page  = Math.min(f.page, Math.max(1, Math.ceil(total / EXPERT_PAGE_SIZE)));
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
          <select id="expert-mode" class="form-select" aria-label="Consultation mode">
            <option value="">Any mode</option>
            <option value="video" ${f.mode === 'video' ? 'selected' : ''}>Video</option>
            <option value="audio" ${f.mode === 'audio' ? 'selected' : ''}>Audio</option>
            <option value="chat"  ${f.mode === 'chat'  ? 'selected' : ''}>Chat</option>
            <option value="in_person" ${f.mode === 'in_person' ? 'selected' : ''}>In-person</option>
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
                  ${e.response_time_minutes
                    ? `<span class="expert-response">· ~${e.response_time_minutes}m response</span>` : ''}
                </p>
                ${(e.supported_modes || []).length ? `
                  <p class="form-hint">${(e.supported_modes || []).map(m =>
                    `<span class="chip chip-neutral">${esc(m.replace('_',' '))}</span>`).join(' ')}</p>
                ` : ''}
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

/* ---------------- Filter bindings ---------------- */

window.ExpertHubUser.registerModule('experts', renderUserExperts, {
  init() {
    const $set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
    const rerender = debounce(() => rerenderRoleContent(), 250);

    $set('expert-search',   el => el.oninput  = () => { _setExpertFilter('q', el.value); rerender(); });
    $set('expert-budget',   el => el.oninput  = () => { _setExpertFilter('budget', el.value); rerender(); });
    $set('expert-category', el => el.onchange = () => { _setExpertFilter('category', el.value); rerenderRoleContent(); });
    $set('expert-language', el => el.onchange = () => { _setExpertFilter('language', el.value); rerenderRoleContent(); });
    $set('expert-mode',     el => el.onchange = () => { _setExpertFilter('mode', el.value); rerenderRoleContent(); });
    $set('expert-sort',     el => el.onchange = () => { _setExpertFilter('sort', el.value); rerenderRoleContent(); });
    $set('expert-instant',  el => el.onchange = () => { _setExpertFilter('instant', el.checked); rerenderRoleContent(); });
  },
});

window.ExpertHubUser.registerAction('clear-expert-filters', () => {
  UserFilters.clear(EXPERT_FILTER_KEY);
  rerenderRoleContent();
});

/* ============================================================ */
/* Profile modal */
/* ============================================================ */

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
      ${(e.supported_modes || []).length ? `<p><strong>Modes:</strong> ${esc((e.supported_modes || []).join(', '))}</p>` : ''}
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

/* ============================================================ */
/* Guided booking modal */
/* ============================================================ */

window.ExpertHubUser.registerAction('book-expert', async (id, el) => {
  const expert = S.experts.find(x => String(x.id) === String(id)) || {};
  const name   = el?.dataset?.name || expert.name || 'Expert';

  try {
    showLoading(true);
    const services = await _loadExpertServices(id, expert.hourly_rate);
    showLoading(false);

    // State mutated by form controls inside the modal
    const state = {
      serviceId: services[0].id,
      service:   services[0],
      slotId:    null,
      slotStart: null,
      mode:      'video',
      submitting: false,
      idempotencyKey: `book_${currentUser?.id}_${id}_${Date.now()}_${Math.random().toString(36).slice(2,10)}`,
    };

    const _updateTotals = () => {
      const total = document.getElementById('bkTotal');
      if (total) total.textContent = fmtCur(state.service.price || 0);
    };

    const _updateSubmit = () => {
      const btn = document.getElementById('bkSave');
      if (btn) btn.disabled = !(state.slotStart && state.serviceId);
    };

    const _renderSlots = async (dateISO) => {
      const host = document.getElementById('bkSlots');
      if (!host) return;
      if (!dateISO) {
        host.innerHTML = '<p class="form-hint">Select a date to see availability.</p>';
        return;
      }
      host.innerHTML = '<p class="form-hint"><i class="fas fa-circle-notch fa-spin"></i> Loading slots…</p>';
      const data = await _fetchAvailability(id, dateISO);
      const slots = data?.slots || [];
      if (!slots.length) {
        host.innerHTML = '<p class="form-hint">No slots available on this date. Try another date.</p>';
        return;
      }
      host.innerHTML = slots.map(s => `
        <button type="button" class="btn btn-secondary btn-sm" data-slot-id="${esc(s.id || s.start_at)}"
                data-slot-start="${esc(s.start_at)}">
          ${_fmtTimeOnly(s.start_at, currentUser?.timezone)}
        </button>
      `).join('');
      host.querySelectorAll('[data-slot-id]').forEach(btn => {
        btn.onclick = () => {
          host.querySelectorAll('[data-slot-id]').forEach(b => {
            b.classList.remove('btn-primary'); b.classList.add('btn-secondary');
          });
          btn.classList.remove('btn-secondary'); btn.classList.add('btn-primary');
          state.slotId    = btn.dataset.slotId;
          state.slotStart = btn.dataset.slotStart;
          _updateSubmit();
        };
      });
    };

    openModal({
      title: `Book ${name}`,
      className: 'modal-lg',
      body: `
        <label class="form-group">
          <span class="form-label">Session title *</span>
          <input id="bkTitle" class="form-input" maxlength="120" required
                 placeholder="e.g. Career switch to data science" />
        </label>
        <label class="form-group">
          <span class="form-label">Describe your issue *</span>
          <textarea id="bkDesc" class="form-textarea" rows="3" maxlength="2000" required></textarea>
        </label>

        <div class="form-grid">
          <label class="form-group">
            <span class="form-label">Service *</span>
            <select id="bkService" class="form-select">
              ${services.map((s, i) => `
                <option value="${esc(s.id)}" ${i === 0 ? 'selected' : ''}
                        data-duration="${s.duration_minutes}"
                        data-price="${s.price}"
                        data-currency="${esc(s.currency || 'USD')}">
                  ${esc(s.name)} — ${s.duration_minutes}min · ${fmtCur(s.price)}
                </option>
              `).join('')}
            </select>
          </label>
          <label class="form-group">
            <span class="form-label">Mode *</span>
            <select id="bkMode" class="form-select">
              <option value="video">Video call</option>
              <option value="audio">Audio call</option>
              <option value="chat">Chat</option>
              ${services.some(s => s.supports_in_person) ? '<option value="in_person">In-person</option>' : ''}
            </select>
          </label>
        </div>

        <label class="form-group">
          <span class="form-label">Date *</span>
          <input id="bkDate" type="date" class="form-input"
                 min="${new Date().toISOString().slice(0,10)}" required />
          <p class="form-hint">
            All times shown in <strong>${esc(currentUser?.timezone || 'UTC')}</strong>.
          </p>
        </label>

        <div class="form-group">
          <span class="form-label">Available time slots *</span>
          <div id="bkSlots" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px"
               role="radiogroup" aria-label="Time slots">
            <p class="form-hint">Select a date to see availability.</p>
          </div>
        </div>

        <div class="pricing-summary">
          <p><strong>Estimated total:</strong> <span id="bkTotal">${fmtCur(services[0].price)}</span>
             <span class="form-hint">(final price confirmed on server)</span></p>
          <p class="form-hint">Wallet balance: ${fmtCur(S.wallet?.balance || 0)}</p>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button id="bkSave" class="btn btn-primary" disabled>
          <i class="fas fa-credit-card"></i> Request Booking</button>
      `,
    });

    // Wire service change
    const svc = document.getElementById('bkService');
    if (svc) svc.onchange = () => {
      const opt = svc.options[svc.selectedIndex];
      state.serviceId = svc.value;
      state.service = services.find(s => String(s.id) === String(svc.value)) || {
        id: svc.value,
        name: opt.textContent,
        duration_minutes: Number(opt.dataset.duration || 60),
        price: Number(opt.dataset.price || 0),
        currency: opt.dataset.currency || 'USD',
      };
      _updateTotals();
    };

    const mode = document.getElementById('bkMode');
    if (mode) mode.onchange = () => { state.mode = mode.value; };

    const dateEl = document.getElementById('bkDate');
    if (dateEl) dateEl.onchange = () => {
      state.slotId = null; state.slotStart = null;
      _updateSubmit();
      _renderSlots(dateEl.value);
    };

    // Submit
    const submit = async () => {
      if (state.submitting) return;
      const title = (document.getElementById('bkTitle').value || '').trim();
      const description = (document.getElementById('bkDesc').value || '').trim();
      if (!title || !description) return showToast('Title and description are required', 'error');
      if (!state.slotStart) return showToast('Pick an available time slot', 'error');

      const btn = document.getElementById('bkSave');
      state.submitting = true;
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Requesting…'; }

      try {
        const d = await apiCall('/api/user/consultations', 'POST', {
          expert_id:        Number(id),
          service_id:       state.serviceId === 'default_60' ? undefined : state.serviceId,
          title,
          description,
          consultation_type: state.mode,
          duration_minutes: state.service.duration_minutes,
          scheduled_at:     state.slotStart,
          slot_id:          state.slotId === state.slotStart ? undefined : state.slotId,
          idempotency_key:  state.idempotencyKey,
        });

        _clearAvailabilityCache(id);
        closeModal();
        await reloadConsultations?.();
        await refreshUserSnapshot?.();
        rerenderRoleContent();

        const status = (d?.status || 'requested').toLowerCase();
        if (status === 'pending_payment' || d?.requires_payment) {
          if (d?.payment_url) {
            showToast('Booking created — redirecting to payment', 'info', 6000);
            window.location.href = d.payment_url;
          } else {
            showToast('Booking created — payment required. Check My Consultations.', 'warning', 8000);
          }
        } else if (status === 'confirmed') {
          showToast(`Consultation booked — ${fmtCur(d?.price ?? state.service.price)}`, 'success', 6000);
        } else {
          showToast('Request submitted — awaiting expert confirmation', 'success', 6000);
        }
      } catch (e) {
        const msg = String(e?.message || '');
        if (/slot|conflict|taken|no longer available/i.test(msg)) {
          showToast('That time slot was just taken. Please choose another.', 'warning', 6000);
          state.slotId = null; state.slotStart = null;
          _updateSubmit();
          const dateVal = document.getElementById('bkDate')?.value;
          if (dateVal) _renderSlots(dateVal);
        } else {
          showToast(msg || 'Booking failed', 'error');
        }
        state.submitting = false;
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-credit-card"></i> Request Booking'; }
      }
    };

    const btnEl = document.getElementById('bkSave');
    if (btnEl) btnEl.onclick = submit;
  } catch (e) {
    showLoading(false);
    showToast(e.message, 'error');
  }
});

/* ============================================================ */
/* Wizard + instant consultation (preserved) */
/* ============================================================ */

window.ExpertHubUser.registerAction('find-expert-wizard', () => {
  openModal({
    title: 'Match Me With an Expert',
    body: `
      <label class="form-group"><span class="form-label">What do you need help with?</span>
        <textarea id="mwNeed" class="form-textarea" rows="3"
                  placeholder="e.g. Career switch to data science" required></textarea></label>
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
    const avail = await apiCall('/api/user/experts/instant/available').catch(() => ({ available: true }));
    if (avail && avail.available === false) {
      showLoading(false);
      return showToast('No expert available right now. We alerted our team.', 'info', 6000);
    }
    const d = await apiCall('/api/user/experts/instant', 'POST');
    closeModal();
    await reloadConsultations?.();
    await refreshUserSnapshot?.();
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
