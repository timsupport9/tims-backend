/* ============================================================
   dashboards/expert/projects.js
   ============================================================ */

function renderExpertProjects() {
  const projects = S.expertProjects || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Projects</span></div>
    <section class="page-header">
      <h1 class="page-title">Projects & Tasks</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-expert-action="create-project">
          <i class="fas fa-plus"></i> New Project</button>
      </div>
    </section>

    <section class="card-grid">
      ${projects.map(p => `
        <article class="program-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <span class="chip chip-blue">${esc(p.category || 'Project')}</span>
            <span class="${statusClass(p.status)}">${esc(p.status || '')}</span>
          </div>
          <h4 class="program-title">${esc(p.title || '')}</h4>
          <p class="program-desc">${esc((p.description || '').slice(0, 120))}</p>
          <footer class="program-footer">
            <span class="program-meta">${p.open_tasks || 0} open tasks</span>
            <span class="program-meta">Due ${fmtDate(p.deadline)}</span>
          </footer>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" data-expert-action="view-project" data-id="${p.id}">
              <i class="fas fa-eye"></i> Open</button>
            <button class="btn btn-info btn-sm" data-expert-action="add-task" data-project="${p.id}">
              <i class="fas fa-plus"></i> Task</button>
            <button class="btn btn-secondary btn-sm" data-expert-action="edit-project" data-id="${p.id}">
              <i class="fas fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" data-expert-action="delete-project" data-id="${p.id}">
              <i class="fas fa-trash"></i></button>
          </div>
        </article>
      `).join('') || `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-list-check"></i>
          <h3>No projects yet</h3>
          <p>Track client projects, milestones and deliverables.</p>
          <button class="btn btn-primary" data-expert-action="create-project">
            <i class="fas fa-plus"></i> Create Project</button>
        </div>
      `}
    </section>
  `;
}

function openProjectModal(id = null) {
  const p = id ? (S.expertProjects || []).find(x => String(x.id) === String(id)) : {};
  openModal({
    title: id ? 'Edit Project' : 'New Project',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="pjTitle" class="form-input" value="${esc(p?.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="pjDesc" class="form-textarea" rows="3">${esc(p?.description || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Client</span>
        <select id="pjClient" class="form-select">
          <option value="">None</option>
          ${(S.expertClients || []).map(c => `
            <option value="${c.id}" ${p?.client_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>
          `).join('')}
        </select></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Status</span>
          <select id="pjStatus" class="form-select">
            ${['planning','active','on_hold','completed','cancelled'].map(s => `
              <option value="${s}" ${p?.status === s ? 'selected' : ''}>${s}</option>
            `).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Deadline</span>
          <input id="pjDeadline" type="date" class="form-input"
                 value="${p?.deadline ? new Date(p.deadline).toISOString().slice(0,10) : ''}" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="pjSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  document.getElementById('pjSave').onclick = async () => {
    const payload = {
      title: document.getElementById('pjTitle').value,
      description: document.getElementById('pjDesc').value,
      client_id: Number(document.getElementById('pjClient').value) || null,
      status: document.getElementById('pjStatus').value,
      deadline: document.getElementById('pjDeadline').value || null,
    };
    if (!payload.title) return showToast('Title required', 'error');
    if (id) await apiCall(`/api/expert/projects/${id}`, 'PUT', payload);
    else    await apiCall('/api/expert/projects', 'POST', payload);
    closeModal();
    await loadAllData();
    showToast(id ? 'Project updated' : 'Project created', 'success');
    rerenderExpertContent();
  };
}

function openProjectViewModal(id) {
  const p = (S.expertProjects || []).find(x => String(x.id) === String(id));
  if (!p) return;
  const tasks = (S.expertTasks || []).filter(t => String(t.project_id) === String(id));
  const milestones = (S.expertMilestones || []).filter(m => String(m.project_id) === String(id));

  openModal({
    title: p.title,
    className: 'modal-lg',
    body: `
      <p>${esc(p.description || '')}</p>
      <p><strong>Client:</strong> ${esc(p.client_name || '—')}</p>
      <p><strong>Status:</strong> <span class="${statusClass(p.status)}">${esc(p.status)}</span></p>
      <p><strong>Deadline:</strong> ${fmtDate(p.deadline)}</p>

      <h3 class="panel-title" style="margin-top:20px">Milestones</h3>
      ${milestones.length ? `
        <ul class="list-stack">
          ${milestones.map(m => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(m.title || '')}</span>
                <span class="list-row-sub">${fmtDate(m.due_date)}</span>
              </div>
              <span class="${m.completed ? 'status-active' : 'status-pending'}">
                ${m.completed ? 'Completed' : 'Open'}</span>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-row">No milestones</p>'}

      <h3 class="panel-title" style="margin-top:20px">Tasks</h3>
      ${tasks.length ? `
        <ul class="list-stack">
          ${tasks.map(t => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(t.title || '')}</span>
                <span class="list-row-sub">${t.due_date ? 'Due ' + fmtDate(t.due_date) : ''}</span>
              </div>
              <span class="${statusClass(t.status)}">${esc(t.status)}</span>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-row">No tasks yet</p>'}
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button class="btn btn-primary" data-expert-action="add-task"
                     data-project="${id}" onclick="closeModal()">
               <i class="fas fa-plus"></i> Add Task</button>`,
  });
}

function openMilestoneModal(projectId) {
  openModal({
    title: 'New Milestone',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="msTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Due date</span>
        <input id="msDue" type="date" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="msSave" class="btn btn-primary">Create</button>`,
  });
  document.getElementById('msSave').onclick = async () => {
    await apiCall(`/api/expert/projects/${projectId}/milestones`, 'POST', {
      title: document.getElementById('msTitle').value,
      due_date: document.getElementById('msDue').value || null,
    });
    closeModal();
    await loadAllData();
    showToast('Milestone created', 'success');
    rerenderExpertContent();
  };
}

function openTaskModal(projectId, taskId) {
  const t = taskId ? (S.expertTasks || []).find(x => String(x.id) === String(taskId)) : {};
  openModal({
    title: taskId ? 'Edit Task' : 'New Task',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="tkTitle" class="form-input" value="${esc(t?.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="tkDesc" class="form-textarea" rows="3">${esc(t?.description || '')}</textarea></label>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Status</span>
          <select id="tkStatus" class="form-select">
            ${['todo','in_progress','blocked','completed'].map(s => `
              <option value="${s}" ${t?.status === s ? 'selected' : ''}>${s.replace('_',' ')}</option>
            `).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Due date</span>
          <input id="tkDue" type="date" class="form-input"
                 value="${t?.due_date ? new Date(t.due_date).toISOString().slice(0,10) : ''}" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tkSave" class="btn btn-primary">${taskId ? 'Save' : 'Create'}</button>`,
  });
  document.getElementById('tkSave').onclick = async () => {
    const payload = {
      project_id: projectId,
      title: document.getElementById('tkTitle').value,
      description: document.getElementById('tkDesc').value,
      status: document.getElementById('tkStatus').value,
      due_date: document.getElementById('tkDue').value || null,
    };
    if (!payload.title) return showToast('Title required', 'error');
    if (taskId) await apiCall(`/api/expert/tasks/${taskId}`, 'PUT', payload);
    else        await apiCall('/api/expert/tasks', 'POST', payload);
    closeModal();
    await loadAllData();
    showToast(taskId ? 'Task updated' : 'Task created', 'success');
    rerenderExpertContent();
  };
}
