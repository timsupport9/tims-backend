/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/personal-development.js */
/* Personal growth: flexible goals with reason + milestones, */
/* habits, private reflections, decision log, milestones. */
/* Reflection privacy is explicit and server-enforced. */
/* ============================================================ */

let _pdTab = UserFilters.get('personal-development', 'tab', 'goals') || 'goals';
let __pdLoaded = false;

function renderUserPersonalDevelopment() {
  if (!__pdLoaded) {
    apiCall('/api/user/decisions').then(d => { S.decisions = d.decisions || []; }).catch(() => {});
    __pdLoaded = true;
  }

  const goals      = S.personalGoals     || [];
  const habits     = S.habits            || [];
  const journal    = S.journalEntries    || [];
  const milestones = S.milestones        || [];
  const decisions  = S.decisions         || [];

  return UserUI.page({
    title: 'Personal Development',
    breadcrumb: 'Personal Development',
    content: `
      ${UserUI.tabs([
        { id: 'goals',      label: 'Goals',       icon: 'fa-flag' },
        { id: 'habits',     label: 'Habits',      icon: 'fa-repeat' },
        { id: 'journal',    label: 'Journal',     icon: 'fa-book' },
        { id: 'decisions',  label: 'Decisions',   icon: 'fa-code-branch' },
        { id: 'milestones', label: 'Milestones',  icon: 'fa-trophy' },
      ], _pdTab, 'data-pd-tab')}

      ${_pdTab === 'goals'      ? renderPDGoals(goals)         : ''}
      ${_pdTab === 'habits'     ? renderPDHabits(habits)       : ''}
      ${_pdTab === 'journal'    ? renderPDJournal(journal)     : ''}
      ${_pdTab === 'decisions'  ? renderPDDecisions(decisions) : ''}
      ${_pdTab === 'milestones' ? renderPDMilestones(milestones) : ''}
    `,
  });
}

/* ============================================================ */
/* Goals — flexible structure */
/* ============================================================ */

function renderPDGoals(goals) {
  return `
    <section class="panel">
      <div class="page-actions" style="margin-bottom:12px">
        <button class="btn btn-primary" data-action="add-goal">
          <i class="fas fa-plus"></i> New Goal</button>
        <button class="btn btn-secondary" data-action="add-smart-goal">
          <i class="fas fa-magic"></i> Guided SMART Goal</button>
      </div>
      ${goals.length ? goals.map(g => {
        const overdue = g.target_date && new Date(g.target_date) < new Date() && (g.progress || 0) < 100;
        return `
          <article class="enrollment-card">
            <h3 class="enrollment-title">${esc(g.title)}</h3>
            ${g.reason ? `<p class="form-hint"><i class="fas fa-heart"></i> Why this matters: ${esc(g.reason)}</p>` : ''}
            <p class="enrollment-type">
              ${esc(g.category || 'Personal')}
              ${g.target_date ? ' · Target ' + fmtDate(g.target_date) : ''}
              ${overdue ? ' · <span style="color:var(--danger)">Overdue</span>' : ''}
            </p>
            ${g.success_criteria ? `<p class="form-hint">Success: ${esc(g.success_criteria)}</p>` : ''}
            <div class="progress-bar"><span style="width:${g.progress || 0}%"></span></div>
            <p class="enrollment-progress">${g.progress || 0}% complete</p>
            ${(g.milestones || []).length ? `
              <details style="margin-top:8px">
                <summary>${(g.milestones || []).length} milestone${(g.milestones || []).length === 1 ? '' : 's'}</summary>
                <ul class="list-stack" style="margin-top:8px">
                  ${(g.milestones || []).map(m => `
                    <li class="list-row">
                      <div class="list-row-main">
                        <span class="list-row-title">
                          ${esc(m.title)}
                          ${m.completed ? '<span class="chip chip-green">Done</span>' : ''}
                        </span>
                        ${m.due_date ? `<span class="list-row-sub">${fmtDate(m.due_date)}</span>` : ''}
                      </div>
                      ${!m.completed ? `
                        <button class="btn btn-success btn-xs" data-action="complete-milestone"
                                data-goal="${g.id}" data-milestone="${m.id}">
                          <i class="fas fa-check"></i></button>
                      ` : ''}
                    </li>
                  `).join('')}
                </ul>
              </details>
            ` : ''}
            <div class="panel-actions" style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" data-action="update-goal-progress" data-id="${g.id}">
                <i class="fas fa-check"></i> Update</button>
              <button class="btn btn-secondary btn-sm" data-action="add-milestone" data-id="${g.id}">
                <i class="fas fa-flag"></i> Milestone</button>
              <button class="btn btn-danger btn-sm" data-action="delete-goal" data-id="${g.id}">
                <i class="fas fa-trash"></i></button>
            </div>
          </article>
        `;
      }).join('') : '<p class="empty-row">No goals yet — set your first goal.</p>'}
    </section>
  `;
}

/* ============================================================ */
/* Habits */
/* ============================================================ */

function renderPDHabits(habits) {
  return `
    <section class="panel">
      <div class="page-actions" style="margin-bottom:12px">
        <button class="btn btn-primary" data-action="add-habit">
          <i class="fas fa-plus"></i> New Habit</button>
      </div>
      ${habits.length ? habits.map(h => {
        const checkedToday = h.last_checked && new Date(h.last_checked).toDateString() === new Date().toDateString();
        return `
          <div class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(h.name)}</span>
              <span class="list-row-sub">
                Current streak: ${h.streak || 0} days
                ${h.best_streak ? ` · Best ${h.best_streak}` : ''}
              </span>
            </div>
            <button class="btn ${checkedToday ? 'btn-secondary' : 'btn-success'} btn-xs"
                    data-action="check-habit" data-id="${h.id}"
                    ${checkedToday ? 'disabled' : ''}>
              <i class="fas fa-check"></i> ${checkedToday ? 'Done today' : 'Done Today'}</button>
          </div>
        `;
      }).join('') : '<p class="empty-row">No habits yet — start with one small daily action.</p>'}
    </section>
  `;
}

/* ============================================================ */
/* Journal — private by default */
/* ============================================================ */

function renderPDJournal(entries) {
  return `
    <section class="panel">
      <div class="alert alert-info">
        <i class="fas fa-lock"></i>
        <div>Your journal is private by default. Sharing requires an explicit action.</div>
      </div>
      <div class="page-actions" style="margin-bottom:12px">
        <button class="btn btn-primary" data-action="add-journal">
          <i class="fas fa-pen"></i> New Entry</button>
      </div>
      ${entries.length ? entries.map(e => `
        <div class="note-item">
          <div class="note-header">
            <strong>${esc(e.title || 'Journal Entry')}</strong>
            ${e.shared_with ? `<span class="chip chip-blue">Shared with ${esc(e.shared_with)}</span>` : '<span class="chip chip-neutral"><i class="fas fa-lock"></i> Private</span>'}
            <span class="note-time">${timeAgo(e.created_at)}</span>
          </div>
          <p class="note-content">${esc(e.content)}</p>
          ${(e.tags || []).length ? `<p class="form-hint">${(e.tags || []).map(t => `<span class="chip chip-neutral">${esc(t)}</span>`).join(' ')}</p>` : ''}
        </div>
      `).join('') : '<p class="empty-row">No journal entries yet</p>'}
    </section>
  `;
}

/* ============================================================ */
/* Decisions — compare options, record choices */
/* ============================================================ */

function renderPDDecisions(decisions) {
  return `
    <section class="panel">
      <div class="page-actions" style="margin-bottom:12px">
        <button class="btn btn-primary" data-action="add-decision">
          <i class="fas fa-plus"></i> Record Decision</button>
      </div>
      ${decisions.length ? decisions.map(d => `
        <div class="note-item">
          <div class="note-header">
            <strong>${esc(d.title)}</strong>
            <span class="note-time">${timeAgo(d.created_at)}</span>
          </div>
          ${(d.options || []).length ? `
            <ul class="list-stack" style="margin-top:8px">
              ${(d.options || []).map(o => `
                <li class="list-row">
                  <div class="list-row-main">
                    <span class="list-row-title">${esc(o.label)}</span>
                    ${o.pros ? `<span class="list-row-sub"><strong>Pros:</strong> ${esc(o.pros)}</span>` : ''}
                    ${o.cons ? `<span class="list-row-sub"><strong>Cons:</strong> ${esc(o.cons)}</span>` : ''}
                  </div>
                  ${o.chosen ? '<span class="chip chip-green">Chosen</span>' : ''}
                </li>
              `).join('')}
            </ul>
          ` : ''}
          ${d.reasoning ? `<p class="form-hint" style="margin-top:8px"><strong>Reasoning:</strong> ${esc(d.reasoning)}</p>` : ''}
        </div>
      `).join('') : '<p class="empty-row">No decisions recorded yet</p>'}
    </section>
  `;
}

/* ============================================================ */
/* Milestones (standalone) */
/* ============================================================ */

function renderPDMilestones(milestones) {
  return `
    <section class="panel">
      ${milestones.length ? milestones.map(m => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(m.title)}</span>
            <span class="list-row-sub">${fmtDate(m.achieved_at || m.target_date)}</span>
          </div>
          <span class="chip chip-${m.achieved ? 'green' : 'neutral'}">
            ${m.achieved ? 'Achieved' : 'Upcoming'}</span>
        </div>
      `).join('') : '<p class="empty-row">No milestones yet</p>'}
    </section>
  `;
}

/* ============================================================ */
/* Module + tab delegation */
/* ============================================================ */

window.ExpertHubUser.registerModule('personal-development', renderUserPersonalDevelopment);

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-pd-tab]');
  if (!t) return;
  _pdTab = t.dataset.pdTab;
  UserFilters.set('personal-development', 'tab', _pdTab);
  rerenderRoleContent();
}, true);

/* ============================================================ */
/* Actions */
/* ============================================================ */

window.ExpertHubUser.registerAction('add-goal', () => {
  UserUI.formModal({
    title: 'New Goal',
    fields: [
      { name: 'title',            label: 'Goal', required: true },
      { name: 'reason',           label: 'Why does this matter to you?', type: 'textarea', rows: 2,
        hint: 'Optional, but helps you stay motivated.' },
      { name: 'category',         label: 'Category', value: 'Personal' },
      { name: 'target_date',      label: 'Target date', type: 'date' },
      { name: 'success_criteria', label: 'How will you know it is done?', type: 'textarea', rows: 2 },
    ],
    submitLabel: 'Create',
    onSubmit: async (v) => {
      await apiCall('/api/user/goals', 'POST', v);
      closeModal();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Goal created', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('add-smart-goal', () => {
  UserUI.formModal({
    title: 'Guided SMART Goal',
    fields: [
      { name: 'title',            label: 'Specific — what exactly?', required: true },
      { name: 'success_criteria', label: 'Measurable — how will you measure it?', type: 'textarea', rows: 2, required: true },
      { name: 'reason',           label: 'Relevant — why does this matter to you?', type: 'textarea', rows: 2 },
      { name: 'target_date',      label: 'Time-bound — target date', type: 'date', required: true },
    ],
    submitLabel: 'Create SMART Goal',
    onSubmit: async (v) => {
      await apiCall('/api/user/goals', 'POST', { ...v, category: 'SMART' });
      closeModal();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('SMART goal created', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('update-goal-progress', (id) => {
  const g = (S.personalGoals || []).find(x => String(x.id) === String(id));
  UserUI.formModal({
    title: 'Update Goal Progress',
    fields: [
      { name: 'progress', label: 'Progress (%)', type: 'number', value: g?.progress || 0, min: 0, max: 100 },
      { name: 'note',     label: 'Progress note (optional)', type: 'textarea', rows: 2 },
    ],
    submitLabel: 'Save',
    onSubmit: async (v) => {
      await apiCall(`/api/user/goals/${id}`, 'PUT', {
        progress: Number(v.progress), note: v.note || null,
      });
      closeModal();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Progress updated', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('add-milestone', (id) => {
  UserUI.formModal({
    title: 'Add Milestone',
    fields: [
      { name: 'title',    label: 'Milestone', required: true },
      { name: 'due_date', label: 'Target date', type: 'date' },
    ],
    submitLabel: 'Add',
    onSubmit: async (v) => {
      await apiCall(`/api/user/goals/${id}/milestones`, 'POST', v);
      closeModal();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Milestone added', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('complete-milestone', async (_, el) => {
  const goalId = el?.dataset?.goal;
  const milestoneId = el?.dataset?.milestone;
  try {
    await apiCall(`/api/user/goals/${goalId}/milestones/${milestoneId}/complete`, 'POST');
    await loadUserExtendedData({ force: true });
    rerenderRoleContent();
    showToast('Milestone completed', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('delete-goal', async (id) => {
  if (!await confirmDialog('Delete this goal? This cannot be undone.')) return;
  try {
    await apiCall(`/api/user/goals/${id}`, 'DELETE');
    S.personalGoals = (S.personalGoals || []).filter(g => String(g.id) !== String(id));
    rerenderRoleContent();
    showToast('Goal deleted', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

/* ---------------- Habits (preserved) ---------------- */

window.ExpertHubUser.registerAction('add-habit', () => {
  UserUI.formModal({
    title: 'New Habit',
    fields: [{ name: 'name', label: 'Habit Name', required: true, placeholder: 'e.g. Read 20 pages' }],
    submitLabel: 'Add',
    onSubmit: async (v) => {
      await apiCall('/api/user/habits', 'POST', v);
      closeModal();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Habit added', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('check-habit', async (id) => {
  try {
    await apiCall(`/api/user/habits/${id}/check`, 'POST');
    await loadUserExtendedData({ force: true });
    rerenderRoleContent();
    showToast('Habit checked', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

/* ---------------- Journal (preserved, privacy added) ---------------- */

window.ExpertHubUser.registerAction('add-journal', () => {
  UserUI.formModal({
    title: 'New Journal Entry',
    fields: [
      { name: 'title',   label: 'Title' },
      { name: 'content', label: 'Content', type: 'textarea', rows: 6, required: true },
      { name: 'tags',    label: 'Tags (comma separated)' },
      { name: 'share_with', label: 'Share with (optional)', type: 'select', value: '',
        options: [
          { value: '',        label: 'Keep private' },
          { value: 'mentor',  label: 'My mentor' },
          { value: 'expert',  label: 'A booked expert' },
        ],
        hint: 'You can change this later.' },
    ],
    submitLabel: 'Save',
    onSubmit: async (v) => {
      const payload = {
        title: v.title,
        content: v.content,
        tags: (v.tags || '').split(',').map(t => t.trim()).filter(Boolean),
        shared_with: v.share_with || null,
      };
      await apiCall('/api/user/journal', 'POST', payload);
      closeModal();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Entry saved', 'success');
    },
  });
});

/* ---------------- Decisions ---------------- */

window.ExpertHubUser.registerAction('add-decision', () => {
  openModal({
    title: 'Record Decision',
    className: 'modal-lg',
    body: `
      <label class="form-group">
        <span class="form-label">Decision</span>
        <input id="dcTitle" class="form-input" placeholder="e.g. Change university course" required />
      </label>
      <div id="dcOptions">
        <p class="form-label">Options</p>
        <div class="dc-option">
          <input class="form-input" placeholder="Option 1" data-opt="1" />
          <input class="form-input" placeholder="Pros" data-pros="1" style="margin-top:4px" />
          <input class="form-input" placeholder="Cons" data-cons="1" style="margin-top:4px" />
        </div>
        <div class="dc-option" style="margin-top:8px">
          <input class="form-input" placeholder="Option 2" data-opt="2" />
          <input class="form-input" placeholder="Pros" data-pros="2" style="margin-top:4px" />
          <input class="form-input" placeholder="Cons" data-cons="2" style="margin-top:4px" />
        </div>
      </div>
      <label class="form-group">
        <span class="form-label">What did you choose and why?</span>
        <textarea id="dcReasoning" class="form-textarea" rows="3"></textarea>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="dcSave" class="btn btn-primary">Save Decision</button>
    `,
  });
  $('#dcSave').onclick = async () => {
    const title = $('#dcTitle').value.trim();
    if (!title) return showToast('Enter a decision title', 'error');
    const options = [];
    document.querySelectorAll('[data-opt]').forEach(el => {
      const label = el.value.trim();
      if (!label) return;
      const idx = el.dataset.opt;
      const pros = document.querySelector(`[data-pros="${idx}"]`)?.value?.trim();
      const cons = document.querySelector(`[data-cons="${idx}"]`)?.value?.trim();
      options.push({ label, pros, cons });
    });
    try {
      await apiCall('/api/user/decisions', 'POST', {
        title, options, reasoning: $('#dcReasoning').value.trim(),
      });
      closeModal();
      const d = await apiCall('/api/user/decisions').catch(() => ({ decisions: [] }));
      S.decisions = d.decisions || [];
      rerenderRoleContent();
      showToast('Decision recorded', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
});
