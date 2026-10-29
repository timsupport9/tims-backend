/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/academic.js */
/* Academic support: subjects, timetable, assignments, revision, */
/* performance tracking (imported vs teacher vs practice). */
/* ============================================================ */

let _academicTab = UserFilters.get('academic', 'tab', 'subjects') || 'subjects';

function renderUserAcademic() {
  const subjects     = S.academicSubjects    || [];
  const timetable    = S.studyTimetable      || [];
  const assignments  = S.academicAssignments || [];
  const revision     = S.revisionMaterials   || [];

  return UserUI.page({
    title: 'Academic Support',
    breadcrumb: 'Academic',
    actions: `
      <button class="btn btn-secondary" data-action="study-planner">
        <i class="fas fa-magic"></i> AI Study Plan</button>
    `,
    content: `
      ${UserUI.tabs([
        { id: 'subjects',    label: 'Subjects',    icon: 'fa-book' },
        { id: 'timetable',   label: 'Timetable',   icon: 'fa-calendar' },
        { id: 'assignments', label: 'Assignments', icon: 'fa-tasks' },
        { id: 'revision',    label: 'Revision',    icon: 'fa-file-alt' },
      ], _academicTab, 'data-academic-tab')}

      ${_academicTab === 'subjects' ? renderAcademicSubjects(subjects) : ''}
      ${_academicTab === 'timetable' ? renderAcademicTimetable(timetable) : ''}
      ${_academicTab === 'assignments' ? renderAcademicAssignments(assignments) : ''}
      ${_academicTab === 'revision' ? renderAcademicRevision(revision) : ''}
    `,
  });
}

function renderAcademicSubjects(subjects) {
  if (!subjects.length) return UserUI.empty({
    icon: 'fa-book',
    title: 'No subjects yet',
    desc: 'Add the subjects you are currently studying.',
  });
  return `<section class="card-grid">
    ${subjects.map(s => `
      <article class="program-card">
        <span class="chip chip-blue">${esc(s.level || 'Subject')}</span>
        ${s.curriculum ? `<span class="chip chip-neutral" style="margin-left:6px">${esc(s.curriculum)}</span>` : ''}
        <h4 class="program-title">${esc(s.name)}</h4>
        <p class="program-desc">${esc(s.description || '')}</p>
        <div class="progress-bar" style="margin-top:8px">
          <span style="width:${s.progress || 0}%"></span>
        </div>
        <p class="program-meta">${s.progress || 0}% mastery</p>
        ${s.teacher_name ? `<p class="form-hint"><i class="fas fa-user"></i> ${esc(s.teacher_name)}</p>` : ''}
        <button class="btn btn-primary btn-sm" data-action="academic-subject-detail" data-id="${s.id}">
          <i class="fas fa-eye"></i> Open</button>
      </article>
    `).join('')}
  </section>`;
}

function renderAcademicTimetable(entries) {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return `
    <section class="panel">
      <h3 class="panel-title">Weekly Study Timetable</h3>
      ${entries.length ? `
        <table class="data-table">
          <thead><tr><th>Time</th>${days.map(d => `<th>${d}</th>`).join('')}</tr></thead>
          <tbody>
            ${['Morning','Afternoon','Evening'].map(slot => `
              <tr>
                <td><strong>${slot}</strong></td>
                ${days.map(d => {
                  const matches = entries.filter(x => x.day === d && x.slot === slot);
                  return `<td>${matches.length
                    ? matches.map(e => esc(e.subject)).join('<br/>')
                    : '—'}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p class="empty-row">No timetable entries yet</p>'}
      <div class="panel-actions" style="margin-top:12px">
        <button class="btn btn-primary" data-action="add-timetable-entry">
          <i class="fas fa-plus"></i> Add Entry</button>
      </div>
    </section>
  `;
}

function renderAcademicAssignments(list) {
  return `
    <section class="panel">
      <h3 class="panel-title">Assignments</h3>
      ${list.length ? UserUI.table(
        ['Title', 'Subject', 'Due', 'Source', 'Status', ''],
        list.map(a => {
          const overdue = a.due_date && new Date(a.due_date) < new Date() && a.status !== 'completed';
          return `
            <tr>
              <td>${esc(a.title)}</td>
              <td>${esc(a.subject || '')}</td>
              <td>${overdue
                ? '<span style="color:var(--danger)">' + fmtDate(a.due_date) + ' (overdue)</span>'
                : fmtDate(a.due_date)}</td>
              <td>
                ${a.source === 'institution' ? '<span class="chip chip-blue">Institution</span>'
                  : a.source === 'teacher' ? '<span class="chip chip-purple">Teacher</span>'
                  : '<span class="chip chip-neutral">Personal</span>'}
              </td>
              <td>${UserUI.statusPill(a.status || 'pending')}</td>
              <td>${a.status !== 'completed'
                ? `<button class="btn btn-success btn-xs" data-action="complete-assignment" data-id="${a.id}">
                    <i class="fas fa-check"></i></button>`
                : ''}</td>
            </tr>
          `;
        }),
        'No assignments yet'
      ) : '<p class="empty-row">No assignments yet</p>'}
      <div class="panel-actions" style="margin-top:12px">
        <button class="btn btn-primary" data-action="add-assignment">
          <i class="fas fa-plus"></i> Add Assignment</button>
      </div>
    </section>
  `;
}

function renderAcademicRevision(materials) {
  return `
    <section class="panel">
      <h3 class="panel-title">Revision Materials</h3>
      ${materials.length ? materials.map(m => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(m.title)}</span>
            <span class="list-row-sub">
              ${esc(m.subject || '')}
              ${m.curriculum_mapping ? ' · ' + esc(m.curriculum_mapping) : ''}
            </span>
          </div>
          <a class="btn btn-secondary btn-xs" href="${esc(m.url)}" target="_blank" rel="noopener">
            <i class="fas fa-download"></i> Open</a>
        </div>
      `).join('') : '<p class="empty-row">No revision materials yet</p>'}
    </section>
  `;
}

window.ExpertHubUser.registerModule('academic', renderUserAcademic);

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-academic-tab]');
  if (!t) return;
  _academicTab = t.dataset.academicTab;
  UserFilters.set('academic', 'tab', _academicTab);
  rerenderRoleContent();
}, true);

window.ExpertHubUser.registerAction('academic-subject-detail', (id) => {
  const s = (S.academicSubjects || []).find(x => String(x.id) === String(id));
  if (!s) return;
  openModal({
    title: s.name,
    body: `
      <p><strong>Level:</strong> ${esc(s.level || '')}</p>
      <p><strong>Curriculum:</strong> ${esc(s.curriculum || '—')}</p>
      <p><strong>Progress:</strong> ${s.progress || 0}%</p>
      <p>${esc(s.description || '')}</p>
      ${s.teacher_name ? `<p><strong>Teacher:</strong> ${esc(s.teacher_name)}</p>` : ''}
      ${s.marks ? `
        <h4 style="margin-top:12px">Marks</h4>
        <p class="form-hint">Imported and teacher-entered marks only. Practice scores do not count toward official records.</p>
        <ul class="list-stack">
          ${(s.marks || []).map(m => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(m.assessment_title)}</span>
                <span class="list-row-sub">${esc(m.source || '')} · ${fmtDate(m.recorded_at)}</span>
              </div>
              <span class="chip chip-blue">${m.score}%</span>
            </li>
          `).join('')}
        </ul>
      ` : ''}
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
});

window.ExpertHubUser.registerAction('add-timetable-entry', () => {
  UserUI.formModal({
    title: 'Add Timetable Entry',
    fields: [
      { name: 'day',    label: 'Day',    type: 'select',
        options: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], required: true },
      { name: 'slot',   label: 'Slot',   type: 'select',
        options: ['Morning','Afternoon','Evening'], required: true },
      { name: 'subject', label: 'Subject', required: true },
    ],
    submitLabel: 'Add',
    onSubmit: async (v) => {
      await apiCall('/api/user/academic/timetable', 'POST', v);
      closeModal();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Entry added', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('add-assignment', () => {
  UserUI.formModal({
    title: 'New Assignment',
    fields: [
      { name: 'title',    label: 'Title', required: true },
      { name: 'subject',  label: 'Subject' },
      { name: 'due_date', label: 'Due Date', type: 'date' },
    ],
    submitLabel: 'Add',
    onSubmit: async (v) => {
      await apiCall('/api/user/academic/assignments', 'POST', v);
      closeModal();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Assignment added', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('complete-assignment', async (id) => {
  try {
    await apiCall(`/api/user/academic/assignments/${id}/complete`, 'POST');
    if (S.academicAssignments) {
      const a = S.academicAssignments.find(x => String(x.id) === String(id));
      if (a) a.status = 'completed';
    }
    rerenderRoleContent();
    showToast('Assignment completed', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('study-planner', async () => {
  try {
    showLoading(true);
    const d = await apiCall('/api/user/academic/study-plan', 'POST');
    closeModal();
    openModal({
      title: 'Your Study Plan',
      className: 'modal-lg',
      body: `
        <ul class="list-stack">
          ${(d.plan || []).map(item => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(item.activity)}</span>
                <span class="list-row-sub">${esc(item.subject || '')} · ${item.minutes} min</span>
              </div>
              <span class="chip chip-neutral">${esc(item.when || '')}</span>
            </li>
          `).join('') || '<li class="empty-row">Could not generate a plan yet</li>'}
        </ul>
      `,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});
