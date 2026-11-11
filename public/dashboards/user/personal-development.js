/* ============================================================
   ExpertHub 2.0 — dashboards/user/personal-development.js
   SMART goals, habits, journal, milestones.
   ============================================================ */

let _pdTab = 'goals';

function renderUserPersonalDevelopment() {
  const goals     = S.personalGoals     || [];
  const habits    = S.habits            || [];
  const journal   = S.journalEntries    || [];
  const milestones= S.milestones        || [];

  return UserUI.page({
    title: 'Personal Development',
    breadcrumb: 'Personal Development',
    content: `
      ${UserUI.tabs([
        { id: 'goals',      label: 'SMART Goals', icon: 'fa-flag' },
        { id: 'habits',     label: 'Habits',      icon: 'fa-repeat' },
        { id: 'journal',    label: 'Journal',     icon: 'fa-book' },
        { id: 'milestones', label: 'Milestones',  icon: 'fa-trophy' },
      ], _pdTab, 'data-pd-tab')}

      ${_pdTab === 'goals' ? renderPDGoals(goals) : ''}
      ${_pdTab === 'habits' ? renderPDHabits(habits) : ''}
      ${_pdTab === 'journal' ? renderPDJournal(journal) : ''}
      ${_pdTab === 'milestones' ? renderPDMilestones(milestones) : ''}
    `,
  });
}

function renderPDGoals(goals) {
  return `
    <section class="panel">
      <div class="page-actions" style="margin-bottom:12px">
        <button class="btn btn-primary" data-action="add-goal">
          <i class="fas fa-plus"></i> New Goal</button>
      </div>
      ${goals.length ? goals.map(g => `
        <div class="enrollment-card">
          <h3 class="enrollment-title">${esc(g.title)}</h3>
          <p class="enrollment-type">${esc(g.category || 'Personal')} · Due ${fmtDate(g.target_date)}</p>
          <div class="progress-bar"><span style="width:${g.progress || 0}%"></span></div>
          <p class="enrollment-progress">${g.progress || 0}% complete</p>
          <div class="panel-actions" style="display:flex;gap:6px;margin-top:10px">
            <button class="btn btn-primary btn-sm" data-action="update-goal-progress" data-id="${g.id}">
              <i class="fas fa-check"></i> Update</button>
            <button class="btn btn-danger btn-sm" data-action="delete-goal" data-id="${g.id}">
              <i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">No goals yet — set your first SMART goal.</p>'}
    </section>
  `;
}

function renderPDHabits(habits) {
  return `
    <section class="panel">
      <div class="page-actions" style="margin-bottom:12px">
        <button class="btn btn-primary" data-action="add-habit">
          <i class="fas fa-plus"></i> New Habit</button>
      </div>
      ${habits.length ? habits.map(h => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(h.name)}</span>
            <span class="list-row-sub">Current streak: ${h.streak || 0} days</span>
          </div>
          <button class="btn btn-success btn-xs" data-action="check-habit" data-id="${h.id}">
            <i class="fas fa-check"></i> Done Today</button>
        </div>
      `).join('') : '<p class="empty-row">No habits yet</p>'}
    </section>
  `;
}

function renderPDJournal(entries) {
  return `
    <section class="panel">
      <div class="page-actions" style="margin-bottom:12px">
        <button class="btn btn-primary" data-action="add-journal">
          <i class="fas fa-pen"></i> New Entry</button>
      </div>
      ${entries.length ? entries.map(e => `
        <div class="note-item">
          <div class="note-header">
            <strong>${esc(e.title || 'Journal Entry')}</strong>
            <span class="note-time">${timeAgo(e.created_at)}</span>
          </div>
          <p class="note-content">${esc(e.content)}</p>
        </div>
      `).join('') : '<p class="empty-row">No journal entries yet</p>'}
    </section>
  `;
}

function renderPDMilestones(milestones) {
  return `
    <section class="panel">
      ${milestones.length ? milestones.map(m => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(m.title)}</span>
            <span class="list-row-sub">${fmtDate(m.achieved_at || m.target_date)}</span>
          </div>
          <span class="chip chip-${m.achieved ? 'green' : 'neutral'}">${m.achieved ? 'Achieved' : 'Upcoming'}</span>
        </div>
      `).join('') : '<p class="empty-row">No milestones yet</p>'}
    </section>
  `;
}

window.ExpertHubUser.registerModule('personal-development', renderUserPersonalDevelopment);

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-pd-tab]');
  if (!t) return;
  _pdTab = t.dataset.pdTab;
  rerenderRoleContent();
}, true);

window.ExpertHubUser.registerAction('add-goal', () => {
  UserUI.formModal({
    title: 'New SMART Goal',
    fields: [
      { name: 'title',       label: 'Goal Title', required: true },
      { name: 'category',    label: 'Category', value: 'Personal' },
      { name: 'target_date', label: 'Target Date', type: 'date' },
    ],
    submitLabel: 'Create',
    onSubmit: async (v) => {
      await apiCall('/api/user/goals', 'POST', v);
      closeModal();
      await loadUserExtendedData();
      rerenderRoleContent();
      showToast('Goal created', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('update-goal-progress', (id) => {
  const g = (S.personalGoals || []).find(x => String(x.id) === String(id));
  UserUI.formModal({
    title: 'Update Goal Progress',
    fields: [{ name: 'progress', label: 'Progress (%)', type: 'number', value: g?.progress || 0, min: 0, max: 100 }],
    submitLabel: 'Save',
    onSubmit: async (v) => {
      await apiCall(`/api/user/goals/${id}`, 'PUT', { progress: Number(v.progress) });
      closeModal();
      await loadUserExtendedData();
      rerenderRoleContent();
      showToast('Progress updated', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('delete-goal', async (id) => {
  if (!await confirmDialog('Delete this goal?')) return;
  await apiCall(`/api/user/goals/${id}`, 'DELETE').catch(() => {});
  S.personalGoals = (S.personalGoals || []).filter(g => String(g.id) !== String(id));
  rerenderRoleContent();
  showToast('Goal deleted', 'success');
});

window.ExpertHubUser.registerAction('add-habit', () => {
  UserUI.formModal({
    title: 'New Habit',
    fields: [{ name: 'name', label: 'Habit Name', required: true, placeholder: 'e.g. Read 20 pages' }],
    submitLabel: 'Add',
    onSubmit: async (v) => {
      await apiCall('/api/user/habits', 'POST', v);
      closeModal();
      await loadUserExtendedData();
      rerenderRoleContent();
      showToast('Habit added', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('check-habit', async (id) => {
  try {
    await apiCall(`/api/user/habits/${id}/check`, 'POST');
    await loadUserExtendedData();
    rerenderRoleContent();
    showToast('Habit checked', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('add-journal', () => {
  UserUI.formModal({
    title: 'New Journal Entry',
    fields: [
      { name: 'title',   label: 'Title' },
      { name: 'content', label: 'Content', type: 'textarea', rows: 6, required: true },
    ],
    submitLabel: 'Save',
    onSubmit: async (v) => {
      await apiCall('/api/user/journal', 'POST', v);
      closeModal();
      await loadUserExtendedData();
      rerenderRoleContent();
      showToast('Entry saved', 'success');
    },
  });
});
