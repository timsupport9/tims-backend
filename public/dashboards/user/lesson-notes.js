/* ============================================================
   ExpertHub 2.0 — dashboards/user/lesson-notes.js
   My Notes page + note helpers.
   ============================================================ */

function renderUserLessonNotes() {
  const notes = S.lessonNotes || [];
  return UserUI.page({
    title: 'My Course Notes',
    breadcrumb: 'My Notes',
    content: notes.length ? `
      <section class="panel">
        <div class="page-actions" style="margin-bottom:12px">
          <input type="search" id="notes-search" class="form-input"
                 placeholder="Search notes..." style="max-width:260px" />
          <button class="btn btn-secondary" data-action="export-notes">
            <i class="fas fa-download"></i> Export</button>
        </div>
        <ul class="notes-list" id="notes-list-host">
          ${notes.map(n => `
            <li class="note-item">
              <div class="note-header">
                <strong>${esc(n.lesson_title || 'Lesson')}</strong>
                <span class="note-time">${timeAgo(n.created_at)}</span>
              </div>
              <p class="note-content">${esc(n.content)}</p>
              <div class="note-actions">
                <button class="btn btn-ghost btn-xs" data-action="edit-note" data-id="${n.id}">
                  <i class="fas fa-pen"></i></button>
                <button class="btn btn-ghost btn-xs" data-action="delete-note" data-id="${n.id}">
                  <i class="fas fa-trash"></i></button>
              </div>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : `
      <section class="panel">${UserUI.empty({
        icon: 'fa-sticky-note',
        title: 'No notes yet',
        desc: 'Take notes while learning and they will appear here.',
        actionTab: 'my-learning',
        actionLabel: 'View My Learning',
      })}</section>
    `,
  });
}

window.ExpertHubUser.registerModule('lesson-notes', renderUserLessonNotes);
window.ExpertHubUser.registerModule('course-notes', renderUserLessonNotes);

/* ------------------------------------------------------------------ */
/*  Notes search                                                       */
/* ------------------------------------------------------------------ */
document.addEventListener('input', debounce((e) => {
  if (!e.target.matches('#notes-search')) return;
  const q = e.target.value.toLowerCase();
  const host = document.getElementById('notes-list-host');
  if (!host) return;
  const filtered = (S.lessonNotes || []).filter(n =>
    (n.content || '').toLowerCase().includes(q) ||
    (n.lesson_title || '').toLowerCase().includes(q)
  );
  host.innerHTML = filtered.length ? filtered.map(n => `
    <li class="note-item">
      <div class="note-header">
        <strong>${esc(n.lesson_title || 'Lesson')}</strong>
        <span class="note-time">${timeAgo(n.created_at)}</span>
      </div>
      <p class="note-content">${esc(n.content)}</p>
    </li>
  `).join('') : '<li class="empty-row">No matching notes</li>';
}, 250));

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */
window.ExpertHubUser.registerAction('edit-note', (id) => {
  const note = (S.lessonNotes || []).find(n => String(n.id) === String(id));
  if (!note) return;
  openModal({
    title: 'Edit Note',
    body: `<textarea id="enText" class="form-textarea" rows="6">${esc(note.content)}</textarea>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="enSave" class="btn btn-primary">Save</button>
    `,
  });
  $('#enSave').onclick = async () => {
    try {
      await apiCall(`/api/eschool/notes/${id}`, 'PUT', { content: $('#enText').value });
      closeModal();
      const d = await apiCall('/api/user/notes').catch(() => ({ notes: S.lessonNotes }));
      S.lessonNotes = d.notes || S.lessonNotes;
      rerenderRoleContent();
      showToast('Note updated', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
});

window.ExpertHubUser.registerAction('delete-note', async (id) => {
  if (!await confirmDialog('Delete this note?')) return;
  try {
    await apiCall(`/api/eschool/notes/${id}`, 'DELETE');
    S.lessonNotes = (S.lessonNotes || []).filter(n => String(n.id) !== String(id));
    rerenderRoleContent();
    showToast('Note deleted', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('export-notes', () => {
  const rows = (S.lessonNotes || []).map(n => ({
    lesson: n.lesson_title || '',
    content: n.content || '',
    created: n.created_at || '',
  }));
  if (!rows.length) return showToast('No notes to export', 'warning');
  downloadCsv('my-notes.csv', rows);
});
