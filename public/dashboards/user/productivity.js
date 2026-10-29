/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/productivity.js */
/* Study planner: tasks linked to courses/lessons/assessments, */
/* recurring activities, priorities, weekly plan, intelligent */
/* auto-suggest plan. */
/* ============================================================ */

let _prodTab = UserFilters.get('productivity', 'tab', 'tasks') || 'tasks';

function renderUserProductivity() {
  const tasks = S.tasks || [];
  const open   = tasks.filter(t => t.status !== 'done')
    .sort((a, b) => {
      const pa = { urgent:0, high:1, normal:2, low:3 }[a.priority] ?? 2;
      const pb = { urgent:0, high:1, normal:2, low:3 }[b.priority] ?? 2;
      return pa - pb || (new Date(a.due_date||0) - new Date(b.due_date||0));
    });
  const done   = tasks.filter(t => t.status === 'done');
  const overdue = open.filter(t => t.due_date && new Date(t.due_date) < new Date());
  const dueSoon = open.filter(t => t.due_date && new Date(t.due_date) - Date.now() < 7 * 86400000 &&
                                  new Date(t.due_date) >= new Date());

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
            { label: 'Open', value: open.length,        icon: 'fa-list', tone: 'blue' },
            { label: 'Done', value: done.length,        icon: 'fa-check', tone: 'green' },
            { label: 'Overdue', value: overdue.length,  icon: 'fa-exclamation-triangle', tone: 'red' },
            { label: 'Due Soon', value: dueSoon.length, icon: 'fa-clock', tone: 'yellow' },
          ])}
          <div class="page-actions" style="margin-bottom:12px">
            <button class="btn btn-primary" data-action="add-task">
              <i class="fas fa-plus"></i> New Task</button>
            <button class="btn btn-secondary" data-action="auto-study-plan">
              <i class="fas fa-magic"></i> Auto Study Plan</button>
          </div>
          ${open.length ? open.map(t => {
            const isOverdue = t.due_date && new Date(t.due_date) < new Date();
            return `
              <div class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">
                    ${esc(t.title)}
                    ${t.linked_lesson_id ? '<span class="chip chip-blue">Lesson</span>' : ''}
                    ${t.linked_assessment_id ? '<span class="chip chip-purple">Assessment</span>' : ''}
                    ${t.recurring ? '<span class="chip chip-neutral"><i class="fas fa-repeat"></i> Recurring</span>' : ''}
                  </span>
                  <span class="list-row-sub">
                    ${t.due_date ? (isOverdue ? '<span style="color:var(--danger)">' + fmtDate(t.due_date) + ' (overdue)</span>' : fmtDate(t.due_date)) : 'No due date'}
                    · <span class="chip chip-${t.priority === 'urgent' ? 'red' : t.priority === 'high' ? 'yellow' : 'neutral'}">${esc(t.priority || 'normal')}</span>
                  </span>
                </div>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-success btn-xs" data-action="complete-task" data-id="${t.id}">
                    <i class="fas fa-check"></i></button>
                  <button class="btn btn-secondary btn-xs" data-action="delete-task" data-id="${t.id}">
                    <i class="fas fa-trash"></i></button>
                </div>
              </div>
            `;
          }).join('') : '<p class="empty-row">No open tasks</p>'}
        </section>
      ` : ''}

      ${_prodTab === 'reminders' ? renderUserReminders() : ''}
      ${_prodTab === 'weekly' ? renderUserWeeklyPlan() : ''}
    `,
  });
}

function renderUserReminders() {
  const reminders = S.reminders || [];
  return `
    <section class="panel">
      <h3 class="panel-title">Reminders</h3>
      ${reminders.length ? reminders.map(r => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(r.title)}</span>
            <span class="list-row-sub">${fmtDT(r.remind_at)}</span>
          </div>
          <span class="chip chip-neutral">${esc(r.channel || 'in-app')}</span>
        </div>
      `).join('') : '<p class="empty-row">No reminders scheduled. Add due dates to tasks to receive reminders.</p>'}
    </section>
  `;
}

function renderUserWeeklyPlan() {
  const tasks = (S.tasks || []).filter(t => t.due_date && t.status !== 'done');
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
  return `
    <section class="panel">
      <h3 class="panel-title">This Week</h3>
      <div class="weekly-grid">
        ${days.map(d => {
          const dayTasks = tasks.filter(t => new Date(t.due_date).toDateString() === d.toDateString());
          return `
            <div class="weekly-day">
              <h4>${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h4>
              ${dayTasks.length
                ? dayTasks.map(t => `<p class="weekly-task">${esc(t.title)}</p>`).join('')
                : '<p class="form-hint">No tasks</p>'}
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

window.ExpertHubUser.registerModule('productivity', renderUserProductivity);

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-prod-tab]');
  if (!t) return;
  _prodTab = t.dataset.prodTab;
  UserFilters.set('productivity', 'tab', _prodTab);
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
      { name: 'recurring', label: 'Recurring', type: 'select', value: '',
        options: [
          { value: '', label: 'One-off' },
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
        ]},
    ],
    submitLabel: 'Add',
    onSubmit: async (v) => {
      await apiCall('/api/user/tasks', 'POST', v);
      closeModal();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Task added', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('auto-study-plan', async () => {
  try {
    showLoading(true);
    const d = await apiCall('/api/user/study-plan/generate', 'POST').catch(() => null);
    closeModal();
    if (!d?.tasks?.length) return showToast('No suggestions available right now', 'info');
    const ok = await confirmDialog(
      `Generate ${d.tasks.length} study task${d.tasks.length === 1 ? '' : 's'} based on your courses and deadlines?`);
    if (!ok) return;
    await apiCall('/api/user/study-plan/confirm', 'POST', { task_ids: d.tasks.map(t => t.id) });
    await loadUserExtendedData({ force: true });
    rerenderRoleContent();
    showToast('Study plan added', 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('complete-task', async (id) => {
  try {
    await apiCall(`/api/user/tasks/${id}/complete`, 'POST');
    if (S.tasks) {
      const t = S.tasks.find(x => String(x.id) === String(id));
      if (t) t.status = 'done';
    }
    rerenderRoleContent();
    showToast('Task completed', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('delete-task', async (id) => {
  if (!await confirmDialog('Delete this task?')) return;
  try {
    await apiCall(`/api/user/tasks/${id}`, 'DELETE');
    S.tasks = (S.tasks || []).filter(t => String(t.id) !== String(id));
    rerenderRoleContent();
    showToast('Task deleted', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});
