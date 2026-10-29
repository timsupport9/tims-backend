/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/mentorship.js */
/* Mentor matching, goals, milestones, session feedback, */
/* career-pathway integration. */
/* ============================================================ */

function renderUserMentorship() {
  const mentorships = S.mentorships || [];
  const active    = mentorships.filter(m => m.status === 'active');
  const completed = mentorships.filter(m => m.status === 'completed');

  return UserUI.page({
    title: 'Mentorship',
    breadcrumb: 'Mentorship',
    actions: `
      <button class="btn btn-primary" data-action="find-mentor">
        <i class="fas fa-user-friends"></i> Find a Mentor</button>
    `,
    content: `
      ${UserUI.stats([
        { label: 'Active Mentorships', value: active.length,     icon: 'fa-user-friends', tone: 'blue' },
        { label: 'Completed',          value: completed.length,  icon: 'fa-check-circle', tone: 'green' },
        { label: 'Goals Achieved',     value: mentorships.reduce((s, m) => s + (m.goals_achieved || 0), 0), icon: 'fa-flag-checkered', tone: 'purple' },
      ])}

      ${active.length ? `
        <section class="panel">
          <h3 class="panel-title">Active Mentorships</h3>
          ${active.map(m => renderMentorshipCard(m)).join('')}
        </section>
      ` : `
        <section class="panel">${UserUI.empty({
          icon: 'fa-user-friends',
          title: 'No active mentorship',
          desc: 'Get matched with a mentor who can guide your growth.',
        })}</section>
      `}

      ${completed.length ? `
        <section class="panel">
          <h3 class="panel-title">Past Mentorships</h3>
          ${completed.map(m => renderMentorshipCard(m)).join('')}
        </section>
      ` : ''}
    `,
  });
}

function renderMentorshipCard(m) {
  return `
    <div class="consultation-card">
      <header class="consultation-card-header">
        <div>
          <h4 class="consultation-card-title">${esc(m.mentor_name || 'Mentor')}</h4>
          <p class="consultation-card-meta">
            ${UserUI.statusPill(m.status || 'active')}
            ${m.career_pathway_id
              ? `<span class="chip chip-blue">Linked to career pathway</span>` : ''}
          </p>
          ${m.focus ? `<p class="form-hint"><strong>Focus:</strong> ${esc(m.focus)}</p>` : ''}
        </div>
        <div class="consultation-card-price">
          ${m.sessions_done || 0}/${m.sessions_total || 0}
          <div class="consultation-card-escrow">sessions</div>
        </div>
      </header>
      <div class="consultation-card-body">
        ${m.next_session_at ? `<p><strong>Next session:</strong> ${UserDT?.fmtDT(m.next_session_at) || fmtDT(m.next_session_at)}</p>` : ''}
        <div class="progress-bar" style="margin-top:8px">
          <span style="width:${m.progress || 0}%"></span>
        </div>
        <p class="program-meta">${m.progress || 0}% of mentorship goals achieved</p>
      </div>
      <footer class="consultation-card-actions">
        <button class="btn btn-primary btn-sm" data-action="mentorship-goals" data-id="${m.id}">
          <i class="fas fa-flag"></i> Goals</button>
        ${m.status === 'active' ? `
          <button class="btn btn-secondary btn-sm" data-action="mentorship-add-goal" data-id="${m.id}">
            <i class="fas fa-plus"></i> Add Goal</button>
        ` : ''}
        ${m.last_session_id && !m.last_session_reviewed ? `
          <button class="btn btn-success btn-sm" data-action="mentorship-review-session"
                  data-mentorship="${m.id}" data-session="${m.last_session_id}">
            <i class="fas fa-star"></i> Rate session</button>
        ` : ''}
        ${m.consultation_id ? `
          <button class="btn btn-info btn-sm" data-action="open-chat" data-id="${m.consultation_id}">
            <i class="fas fa-comments"></i> Message</button>
        ` : ''}
      </footer>
    </div>
  `;
}

window.ExpertHubUser.registerModule('mentorship', renderUserMentorship);

/* ============================================================ */
/* Actions */
/* ============================================================ */

window.ExpertHubUser.registerAction('find-mentor', () => {
  openModal({
    title: 'Find a Mentor',
    body: `
      <label class="form-group"><span class="form-label">What do you need guidance on?</span>
        <textarea id="fmNeed" class="form-textarea" rows="3" required></textarea></label>
      <label class="form-group">
        <span class="form-label">Commitment</span>
        <select id="fmCommit" class="form-select">
          <option value="4">4 sessions (monthly)</option>
          <option value="8">8 sessions (bi-weekly)</option>
          <option value="12">12 sessions (weekly)</option>
        </select>
      </label>
      ${(S.careerPathways || []).length ? `
        <label class="form-group">
          <span class="form-label">Link to a career pathway (optional)</span>
          <select id="fmPathway" class="form-select">
            <option value="">None</option>
            ${(S.careerPathways || []).map(p => `
              <option value="${p.id}">${esc(p.title)}</option>
            `).join('')}
          </select>
        </label>
      ` : ''}
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="fmFind" class="btn btn-primary">Find Matches</button>
    `,
  });
  $('#fmFind').onclick = async () => {
    const need = $('#fmNeed').value.trim();
    if (!need) return showToast('Describe what you need', 'error');
    try {
      showLoading(true);
      const d = await apiCall('/api/user/mentorship/match', 'POST', {
        need,
        sessions: Number($('#fmCommit').value),
        career_pathway_id: $('#fmPathway')?.value || null,
      });
      closeModal();
      if (!(d.matches || []).length) return showToast('No mentors match yet', 'warning');
      openModal({
        title: 'Mentor Matches',
        className: 'modal-lg',
        body: d.matches.map(m => `
          <div class="expert-card">
            <img class="expert-avatar" src="${avatar(m)}" alt="" />
            <h4 class="expert-name">${esc(m.name)}</h4>
            <p class="expert-expertise">${esc(m.specialization || '')}</p>
            <p class="expert-rate">${m.match_score || 0}% match</p>
            ${m.reason ? `<p class="form-hint"><i class="fas fa-lightbulb"></i> ${esc(m.reason)}</p>` : ''}
            <button class="btn btn-primary btn-sm" data-action="request-mentor" data-id="${m.id}">
              <i class="fas fa-check"></i> Request</button>
          </div>
        `).join(''),
        footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
      });
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
});

window.ExpertHubUser.registerAction('request-mentor', async (id) => {
  try {
    await apiCall('/api/user/mentorship/request', 'POST', { mentor_id: Number(id) });
    closeModal();
    await loadUserExtendedData({ force: true });
    rerenderRoleContent();
    showToast('Mentorship request sent', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('mentorship-goals', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/mentorship/${id}/goals`);
    closeModal();
    openModal({
      title: 'Mentorship Goals',
      className: 'modal-lg',
      body: (d.goals || []).map(g => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(g.title)}</span>
            <span class="list-row-sub">${esc(g.description || '')}</span>
          </div>
          <span class="${statusClass(g.status || 'pending')}">
            ${esc((g.status || 'pending').replace(/_/g,' '))}</span>
        </div>
      `).join('') || '<p class="empty-row">No goals set yet</p>',
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-primary" data-action="mentorship-add-goal" data-id="${id}"
                onclick="closeModal()">
          <i class="fas fa-plus"></i> Add Goal</button>
      `,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('mentorship-add-goal', (id) => {
  UserUI.formModal({
    title: 'Add Mentorship Goal',
    fields: [
      { name: 'title',       label: 'Goal', required: true },
      { name: 'description', label: 'Description', type: 'textarea', rows: 2 },
      { name: 'target_date', label: 'Target date', type: 'date' },
    ],
    submitLabel: 'Add',
    onSubmit: async (v) => {
      await apiCall(`/api/user/mentorship/${id}/goals`, 'POST', v);
      closeModal();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Goal added', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('mentorship-review-session', (_, el) => {
  const mentorshipId = el?.dataset?.mentorship;
  const sessionId    = el?.dataset?.session;
  openModal({
    title: 'Rate Session',
    body: `
      <label class="form-group">
        <span class="form-label">Rating</span>
        <select id="msRating" class="form-select">
          ${[5,4,3,2,1].map(n => `<option value="${n}">${n} of 5</option>`).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Feedback</span>
        <textarea id="msFeedback" class="form-textarea" rows="4"></textarea>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="msSave" class="btn btn-primary">Submit</button>
    `,
  });
  $('#msSave').onclick = async () => {
    try {
      await apiCall(`/api/user/mentorship/${mentorshipId}/sessions/${sessionId}/review`, 'POST', {
        rating: Number($('#msRating').value),
        feedback: $('#msFeedback').value,
      });
      closeModal();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Session rated', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
});
