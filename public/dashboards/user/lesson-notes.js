/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/lesson-notes.js */
/* My Notes: cross-course search, tags, timestamps, autosave, */
/* revision flashcards, export, print. */
/* ============================================================ */

function renderUserLessonNotes() {
  const notes = S.lessonNotes || [];
  const q  = UserFilters.get('notes', 'q', '') || '';
  const tag = UserFilters.get('notes', 'tag', '') || '';

  let filtered = notes;
  if (q) {
    filtered = filtered.filter(n =>
      (n.content || '').toLowerCase().includes(q.toLowerCase()) ||
      (n.lesson_title || '').toLowerCase().includes(q.toLowerCase()) ||
      (n.course_title || '').toLowerCase().includes(q.toLowerCase()));
  }
  if (tag) filtered = filtered.filter(n => (n.tags || []).includes(tag));

  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || []))).sort();

  return UserUI.page({
    title: 'My Course Notes',
    breadcrumb: 'My Notes',
    content: notes.length ? `
      <section class="panel">
        <div class="page-actions" style="margin-bottom:12px;flex-wrap:wrap;gap:6px">
          <input type="search" id="notes-search" class="form-input"
                 placeholder="Search notes..." style="max-width:220px"
                 value="${esc(q)}" aria-label="Search notes" />
          <select id="notes-tag" class="form-select" style="max-width:160px">
            <option value="">All tags</option>
            ${allTags.map(t => `<option value="${esc(t)}" ${tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
          </select>
          <button class="btn btn-secondary" data-action="export-notes">
            <i class="fas fa-download"></i> Export CSV</button>
          <button class="btn btn-secondary" data-action="print-notes">
            <i class="fas fa-print"></i> Print Summary</button>
          <button class="btn btn-primary" data-action="new-standalone-note">
            <i class="fas fa-plus"></i> New Note</button>
        </div>
        <ul class="notes-list" id="notes-list-host">
          ${filtered.length ? filtered.map(n => `
            <li class="note-item">
              <div class="note-header">
                <strong>${esc(n.lesson_title || n.course_title || 'Note')}</strong>
                ${n.timestamp_seconds != null
                  ? `<span class="chip chip-blue">@${Math.floor(n.timestamp_seconds/60)}:${String(n.timestamp_seconds%60).padStart(2,'0')}</span>`
                  : ''}
                <span class="note-time">${timeAgo(n.created_at)}</span>
              </div>
              <p class="note-content">${esc(n.content)}</p>
              ${(n.tags || []).length ? `<p class="form-hint">${(n.tags || []).map(t => `<span class="chip chip-neutral">${esc(t)}</span>`).join(' ')}</p>` : ''}
              <div class="note-actions">
                <button class="btn btn-ghost btn-xs" data-action="edit-note" data-id="${n.id}"
                        aria-label="Edit note"><i class="fas fa-pen"></i></button>
                <button class="btn btn-ghost btn-xs" data-action="delete-note" data-id="${n.id}"
                        aria-label="Delete note"><i class="fas fa-trash"></i></button>
                <button class="btn btn-ghost btn-xs" data-action="flashcard-from-note" data-id="${n.id}"
                        aria-label="Create flashcard"><i class="fas fa-clone"></i></button>
              </div>
            </li>
          `).join('') : '<li class="empty-row">No matching notes</li>'}
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

window.ExpertHubUser.registerModule('lesson-notes', renderUserLessonNotes, {
  init() {
    const s = $('#notes-search');
    const t = $('#notes-tag');
    const rerender = debounce(() => rerenderRoleContent(), 250);
    if (s) s.oninput  = () => { UserFilters.set('notes', 'q', s.value); rerender(); };
    if (t) t.onchange = () => { UserFilters.set('notes', 'tag', t.value); rerenderRoleContent(); };
  },
});

window.ExpertHubUser.registerAction('edit-note', (id) => {
  const note = (S.lessonNotes || []).find(n => String(n.id) === String(id));
  if (!note) return;

  openModal({
    title: 'Edit Note',
    body: `
      <textarea id="enText" class="form-textarea" rows="6">${esc(note.content)}</textarea>
      <label class="form-group" style="margin-top:8px">
        <span class="form-label">Tags (comma separated)</span>
        <input id="enTags" class="form-input" value="${esc((note.tags || []).join(', '))}" />
      </label>
      <p class="form-hint" id="enStatus">Autosaving…</p>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="enSave" class="btn btn-primary">Save</button>
    `,
  });

  let saveTimer = null;
  const ta = $('#enText');
  if (ta) ta.oninput = () => {
    const status = $('#enStatus');
    if (status) status.textContent = 'Unsaved changes';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await apiCall(`/api/eschool/notes/${id}`, 'PUT', { content: ta.value });
        const st = $('#enStatus');
        if (st) st.textContent = 'Saved';
      } catch {
        const st = $('#enStatus');
        if (st) st.textContent = 'Save failed — press Save to retry';
      }
    }, 1500);
  };

  $('#enSave').onclick = async () => {
    const btn = $('#enSave');
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const newContent = $('#enText').value;
      const tags = ($('#enTags').value || '').split(',').map(x => x.trim()).filter(Boolean);
      await apiCall(`/api/eschool/notes/${id}`, 'PUT', { content: newContent, tags });
      const idx = (S.lessonNotes || []).findIndex(n => String(n.id) === String(id));
      if (idx >= 0) S.lessonNotes[idx] = { ...S.lessonNotes[idx], content: newContent, tags };
      closeModal();
      rerenderRoleContent();
      showToast('Note updated', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false;
    }
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

window.ExpertHubUser.registerAction('new-standalone-note', () => {
  UserUI.formModal({
    title: 'New Note',
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'content', label: 'Content', type: 'textarea', rows: 6, required: true },
      { name: 'tags', label: 'Tags (comma separated)' },
    ],
    submitLabel: 'Create',
    onSubmit: async (v) => {
      await apiCall('/api/eschool/notes', 'POST', {
        title: v.title,
        content: v.content,
        tags: (v.tags || '').split(',').map(x => x.trim()).filter(Boolean),
      });
      closeModal();
      const d = await apiCall('/api/eschool/notes').catch(() => ({ notes: [] }));
      S.lessonNotes = d.notes || S.lessonNotes;
      rerenderRoleContent();
      showToast('Note created', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('flashcard-from-note', (id) => {
  const note = (S.lessonNotes || []).find(n => String(n.id) === String(id));
  if (!note) return;
  UserUI.formModal({
    title: 'Create Flashcard',
    fields: [
      { name: 'front', label: 'Front (question)', value: (note.content || '').slice(0, 80), required: true },
      { name: 'back',  label: 'Back (answer)', type: 'textarea', rows: 3, value: note.content || '', required: true },
    ],
    submitLabel: 'Save Flashcard',
    onSubmit: async (v) => {
      await apiCall('/api/eschool/flashcards', 'POST', {
        note_id: Number(id), front: v.front, back: v.back,
      });
      closeModal();
      showToast('Flashcard created', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('export-notes', () => {
  const rows = (S.lessonNotes || []).map(n => ({
    course: n.course_title || '',
    lesson: n.lesson_title || '',
    content: n.content || '',
    tags: (n.tags || []).join('; '),
    timestamp: n.timestamp_seconds ?? '',
    created: n.created_at || '',
  }));
  if (!rows.length) return showToast('No notes to export', 'warning');
  downloadCsv('my-notes.csv', rows);
});

window.ExpertHubUser.registerAction('print-notes', () => {
  const notes = S.lessonNotes || [];
  if (!notes.length) return showToast('No notes to print', 'warning');
  const body = notes.map(n => `
    <div style="margin-bottom:20px">
      <h3>${esc(n.lesson_title || n.course_title || 'Note')}</h3>
      <p>${esc(n.content)}</p>
    </div>
  `).join('');
  openModal({
    title: 'Printable Notes',
    className: 'modal-lg',
    body: `<div style="max-height:60vh;overflow:auto">${body}</div>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      <button class="btn btn-primary" onclick="window.print()">
        <i class="fas fa-print"></i> Print</button>
    `,
  });
});
