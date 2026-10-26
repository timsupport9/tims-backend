/* ============================================================
   dashboards/expert/crm.js
   ============================================================ */

function renderExpertCRM() {
  const notes     = (S.expertNotes || []).slice(0, 10);
  const reminders = (S.expertReminders || []).filter(r => !r.completed).slice(0, 10);
  const tasks     = (S.expertTasks || []).filter(t => t.status !== 'completed').slice(0, 10);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>CRM</span></div>
    <section class="page-header">
      <h1 class="page-title">Client Relationship CRM</h1>
    </section>

    <div class="dashboard-columns">
      <div class="panel">
        <h3 class="panel-title">Notes</h3>
        ${notes.length ? `
          <ul class="list-stack">
            ${notes.map(n => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc((n.note || '').slice(0, 120))}</span>
                  <span class="list-row-sub">${esc(n.client_name || '')} · ${fmtDT(n.created_at)}</span>
                </div>
                <button class="btn btn-danger btn-xs" data-expert-action="crm-delete-note" data-id="${n.id}">
                  <i class="fas fa-trash"></i></button>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-row">No notes yet</p>'}
      </div>

      <div class="panel">
        <h3 class="panel-title">Reminders</h3>
        ${reminders.length ? `
          <ul class="list-stack">
            ${reminders.map(r => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(r.title || '')}</span>
                  <span class="list-row-sub">${fmtDT(r.remind_at)}</span>
                </div>
                <button class="btn btn-success btn-xs" data-expert-action="crm-reminder-complete" data-id="${r.id}">
                  <i class="fas fa-check"></i></button>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-row">No reminders</p>'}
      </div>
    </div>

    <section class="panel">
      <h3 class="panel-title">Tasks</h3>
      ${tasks.length ? `
        <ul class="list-stack">
          ${tasks.map(t => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(t.title || '')}</span>
                <span class="list-row-sub">
                  ${t.project_name ? esc(t.project_name) + ' · ' : ''}
                  ${t.due_date ? 'Due ' + fmtDate(t.due_date) : ''}
                </span>
              </div>
              <button class="btn btn-success btn-xs" data-expert-action="crm-task-complete" data-id="${t.id}">
                <i class="fas fa-check"></i></button>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-row">No open tasks</p>'}
    </section>
  `;
}
