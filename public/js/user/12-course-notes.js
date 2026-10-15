/* ============================================================
   ExpertHub 2.0 — 12-course-notes.js
   Global list of lesson notes.
   ============================================================ */

/* ============================================================
   E-SCHOOL — COURSE NOTES (global)
   ============================================================ */
function userCourseNotes() {
  const notes = S.lessonNotes || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>My Notes</span></div>
    <section class="page-header">
      <h1 class="page-title">My Course Notes</h1>
    </section>

    ${notes.length ? `
      <section class="panel">
        <ul class="notes-list">
          ${notes.map(n => `
            <li class="note-item">
              <div class="note-header">
                <strong>${esc(n.lesson_title || 'Lesson')}</strong>
                <span class="note-time">${timeAgo(n.created_at)}</span>
              </div>
              <p class="note-content">${esc(n.content)}</p>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-sticky-note"></i>
          <h3>No notes yet</h3>
          <p>Take notes while learning and they'll appear here.</p>
        </div>
      </section>
    `}
  `;
}
