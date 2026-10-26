/* ============================================================
   ExpertHub 2.0 — dashboards/user/academic.js
   Subjects, timetable, assignments, revision materials.
   ============================================================ */

let _academicTab = 'subjects';

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
        <h4 class="program-title">${esc(s.name)}</h4>
        <p class="program-desc">${esc(s.description || '')}</p>
        <div class="progress-bar" style="margin-top:8px">
          <span style="width:${s.progress || 0}%"></span>
        </div>
        <p class="program-meta">${s.progress || 0}% mastery</p>
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
                  const e = entries.find(x => x.day === d && x.slot === slot);
                  return `<td>${e ? esc(e.subject) : '—'}</td>`;
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
      ${UserUI.table(
        ['Title', 'Subject', 'Due', 'Status'],
        list.map(a => `
          <tr>
            <td>${esc(a.title)}</td>
            <td>${esc(a.subject || '')}</td>
            <td>${fmtDate(a.due_date)}</td>
            <td>${UserUI.statusPill(a.status || 'pending')}</td>
          </tr>
        `),
        'No assignments yet'
      )}
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
            <span class="list-row-sub">${esc(m.subject || '')}</span>
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
  rerenderRoleContent();
}, true);

window.ExpertHubUser.registerAction('academic-subject-detail', (id) => {
  const s = (S.academicSubjects || []).find(x => String(x.id) === String(id));
  if (!s) return;
  openModal({
    title: s.name,
    body: `
      <p><strong>Level:</strong> ${esc(s.level || '')}</p>
      <p><strong>Progress:</strong> ${s.progress || 0}%</p>
      <p>${esc(s.description || '')}</p>
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
      await loadUserExtendedData();
      rerenderRoleContent();
      showToast('Entry added', 'success');
    },
  });
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
