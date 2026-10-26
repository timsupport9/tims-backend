/* ============================================================
   ExpertHub 2.0 — dashboards/user/productivity.js
   Tasks, calendar, reminders, weekly plan.
   ============================================================ */

let _prodTab = 'tasks';

function renderUserProductivity() {
  const tasks = S.tasks || [];
  const open   = tasks.filter(t => t.status !== 'done');
  const done   = tasks.filter(t => t.status === 'done');
  const dueSoon = open.filter(t => t.due_date && new Date(t.due_date) - Date.now() < 7 * 86400000);

  return UserUI.page({
    title: 'Productivity',
    breadcrumb: 'Productivity',
    content: `
      ${UserUI.tabs([
        { id: 'tasks',     label: 'Tasks',        icon: 'fa-list-check' },
        { id: 'reminders', label: 'Reminders',    icon: 'fa-bell' },
        { id: 'weekly',    label: 'Weekly Plan',  icon: 'fa-calendar-week' },
      ], _prodTab, 'data-prod-tab')}

      ${_prodTab === 'tasks' ? `
        <section class="panel">
          ${UserUI.stats([
            { label: 'Open', value: open.length,    icon: 'fa-list', tone: 'blue' },
            { label: 'Done', value: done.length,    icon: 'fa-check', tone: 'green' },
            { label: 'Due Soon', value: dueSoon.length, icon: 'fa-clock', tone: 'yellow' },
          ])}
          <div class="page-actions" style="margin-bottom:12px">
            <button class="btn btn-primary" data-action="add-task">
              <i class="fas fa-plus"></i> New Task</button>
          </div>
          ${open.length ? open.map(t => `
            <div class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(t.title)}</span>
                <span class="list-row-sub">${t.due_date ? fmtDate(t.due_date) : 'No due date'} · ${esc(t.priority || 'normal')}</span>
              </div>
              <button class="btn btn-success btn-xs" data-action="complete-task" data-id="${t.id}">
                <i class="fas fa-check"></i></button>
            </div>
          `).join('') : '<p class="empty-row">No open tasks</p>'}
        </section>
      ` : ''}

      ${_prodTab === 'reminders' ? renderUserReminders() : ''}

      ${_prodTab === 'weekly' ? renderUserWeeklyPlan() : ''}
    `,
  });
}

function renderUserReminders() {
  return `
    <section class="panel">
      <h3 class="panel-title">Reminders</h3>
      <p class="empty-row">Reminders will appear here — add some from your tasks.</p>
    </section>
  `;
}

function renderUserWeeklyPlan() {
  return `
    <section class="panel">
      <h3 class="panel-title">This Week</h3>
      <p class="empty-row">Weekly plan view coming with more data.</p>
    </section>
  `;
}

window.ExpertHubUser.registerModule('productivity', renderUserProductivity);

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-prod-tab]');
  if (!t) return;
  _prodTab = t.dataset.prodTab;
  rerenderRoleContent();
}, true);

window.ExpertHubUser.registerAction('add-task', () => {
  UserUI.formModal({
    title: 'New Task',
    fields: [
      { name: 'title',    label: 'Title', required: true },
      { name: 'due_date', label: 'Due Date', type: 'date' },
      { name: 'priority', label: 'Priority', type: 'select', value: 'normal',
        options: ['low','normal','high','urgent'] },
    ],
    submitLabel: 'Add',
    onSubmit: async (v) => {
      await apiCall('/api/user/tasks', 'POST', v);
      closeModal();
      await loadUserExtendedData();
      rerenderRoleContent();
      showToast('Task added', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('complete-task', async (id) => {
  try {
    await apiCall(`/api/user/tasks/${id}/complete`, 'POST');
    await loadUserExtendedData();
    rerenderRoleContent();
    showToast('Task completed', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});
