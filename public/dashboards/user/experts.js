/* ============================================================
   ExpertHub 2.0 — dashboards/user/experts.js
   Find Experts, Match Me wizard, Instant consultation,
   expert profile modal, shortlist toggle.
   ============================================================ */

function renderUserExperts() {
  const query       = ($('#expert-search')?.value || '').toLowerCase();
  const budget      = Number($('#expert-budget')?.value || 0);
  const instantOnly = $('#expert-instant')?.checked || false;
  const shortlistIds = new Set((S.userShortlist || []).map(x => String(x.expert_id)));

  let filtered = S.experts.slice();
  if (query) filtered = filtered.filter(e =>
    (e.name || '').toLowerCase().includes(query) ||
    (e.specialization || '').toLowerCase().includes(query)
  );
  if (budget)      filtered = filtered.filter(e => Number(e.hourly_rate || 0) <= budget);
  if (instantOnly) filtered = filtered.filter(e => e.is_online || e.instant_available);

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
        <div class="page-actions" style="margin-bottom:14px">
          <input type="search" id="expert-search" class="form-input"
                 placeholder="Search by name or specialization"
                 value="${esc(query)}" style="max-width:260px" />
          <input type="number" id="expert-budget" class="form-input"
                 placeholder="Max $/hour" value="${budget || ''}" style="max-width:120px" />
          <label class="checkbox-row">
            <input type="checkbox" id="expert-instant" ${instantOnly ? 'checked' : ''} />
            Online now
          </label>
        </div>

        <section class="card-grid">
          ${filtered.map(e => {
            const isShortlisted = shortlistIds.has(String(e.id));
            return `
              <article class="expert-card">
                <div style="position:relative">
                  <img class="expert-avatar" src="${avatar(e)}" alt="" />
                  ${e.is_online ? '<span class="expert-online-dot"></span>' : ''}
                </div>
                <h4 class="expert-name">
                  ${esc(e.name || '')}
                  ${e.verified_badge ? '<span class="badge-verified-sm"><i class="fas fa-check-circle"></i></span>' : ''}
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
                  <button class="btn btn-secondary btn-sm" data-action="view-expert-profile" data-id="${e.id}">
                    <i class="fas fa-eye"></i></button>
                  <button class="btn btn-secondary btn-sm" data-action="toggle-shortlist" data-id="${e.id}">
                    <i class="fas fa-bookmark" style="color:${isShortlisted ? 'var(--warning)' : 'inherit'}"></i></button>
                </div>
              </article>
            `;
          }).join('') || UserUI.empty({
            icon: 'fa-search',
            title: 'No experts found',
            desc: 'Try adjusting your filters.',
          })}
        </section>
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('experts', renderUserExperts);

/* ------------------------------------------------------------------ */
/*  Search bindings                                                    */
/* ------------------------------------------------------------------ */
function bindUserExpertFilters() {
  const s = $('#expert-search');
  const b = $('#expert-budget');
  const i = $('#expert-instant');
  const rerender = debounce(() => rerenderRoleContent(), 250);
  if (s) s.oninput = rerender;
  if (b) b.oninput = rerender;
  if (i) i.onchange = () => rerenderRoleContent();
}
document.addEventListener('DOMContentLoaded', bindUserExpertFilters);

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */
window.ExpertHubUser.registerAction('view-expert-profile', (id) => {
  const e = S.experts.find(x => String(x.id) === String(id)) || {};
  openModal({
    title: e.name || 'Expert Profile',
    body: `
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(e)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(e.name || '')}</h2>
          <p class="profile-email">${esc(e.email || '')}</p>
        </div>
      </div>
      <p><strong>Specialization:</strong> ${esc(e.specialization || '-')}</p>
      <p><strong>Hourly rate:</strong> ${fmtCur(e.hourly_rate || 0)}</p>
      <p><strong>Rating:</strong> ${Number(e.average_rating || 0).toFixed(1)} / 5</p>
      <p><strong>Bio:</strong> ${esc(e.bio || 'No bio provided')}</p>
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
    await apiCall('/api/user/shortlist/toggle', 'POST', { expert_id: Number(id) });
    const d = await apiCall('/api/user/shortlist').catch(() => ({ items: [] }));
    S.userShortlist = d.items || [];
    rerenderRoleContent();
    showToast('Shortlist updated', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('book-expert', (id, el) => {
  const name = el?.dataset?.name || S.experts.find(x => String(x.id) === String(id))?.name || 'Expert';
  openModal({
    title: `Book ${name}`,
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="bkTitle" class="form-input" /></label>
      <label class="form-group">
        <span class="form-label">Type</span>
        <select id="bkType" class="form-select">
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="chat">Chat</option>
        </select>
      </label>
      <label class="form-group"><span class="form-label">Describe your issue</span>
        <textarea id="bkDesc" class="form-textarea" rows="4"></textarea></label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="bkSave" class="btn btn-primary">Book</button>
    `,
  });
  $('#bkSave').onclick = async () => {
    const title = $('#bkTitle').value.trim();
    const description = $('#bkDesc').value.trim();
    if (!title || !description) return showToast('Fill all fields', 'error');
    try {
      await apiCall('/api/user/consultations', 'POST', {
        title, description,
        consultation_type: $('#bkType').value,
        expert_id: Number(id),
      });
      closeModal();
      await reloadConsultations();
      rerenderRoleContent();
      showToast('Consultation booked', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
});

window.ExpertHubUser.registerAction('find-expert-wizard', () => {
  openModal({
    title: 'Match Me With an Expert',
    body: `
      <label class="form-group"><span class="form-label">What do you need help with?</span>
        <textarea id="mwNeed" class="form-textarea" rows="3" placeholder="e.g. Career switch to data science"></textarea></label>
      <label class="form-group">
        <span class="form-label">Budget per hour (USD)</span>
        <input id="mwBudget" type="number" class="form-input" value="100" />
      </label>
      <label class="form-group">
        <span class="form-label">Preferred availability</span>
        <select id="mwAvail" class="form-select">
          <option value="any">Any time</option>
          <option value="today">Today</option>
          <option value="this_week">This week</option>
        </select>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="mwFind" class="btn btn-primary"><i class="fas fa-magic"></i> Find Matches</button>
    `,
  });
  $('#mwFind').onclick = async () => {
    try {
      showLoading(true);
      const d = await apiCall('/api/user/experts/match', 'POST', {
        need: $('#mwNeed').value,
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
    const d = await apiCall('/api/user/experts/instant', 'POST');
    closeModal();
    await reloadConsultations();
    rerenderRoleContent();
    if (d.consultation_id) {
      showToast('Expert assigned — redirecting to session', 'success');
      location.hash = `#/consultation/${d.consultation_id}`;
    } else {
      showToast('No expert online right now. We alerted our team.', 'info', 6000);
    }
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});
