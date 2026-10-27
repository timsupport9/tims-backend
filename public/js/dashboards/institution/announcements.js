/* ============================================================
   Institution — Announcements
   ============================================================ */
function instAnnouncements() {
  const list = S.announcements || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Announcements</span></div>
    <section class="page-header">
      <h1 class="page-title">Institution Announcements</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-announcement">
          <i class="fas fa-plus"></i> New Announcement</button>
      </div>
    </section>

    ${list.length ? `
      <section class="panel">
        <ul class="list-stack">
          ${list.map(a => `
            <li class="list-row" style="border-left:4px solid ${
              a.priority === 'critical' ? '#dc2626'
              : a.priority === 'urgent' ? '#f97316'
              : a.priority === 'important' ? '#eab308'
              : '#0ea5e9'}">
              <div class="list-row-main">
                <span class="list-row-title">${esc(a.title)}</span>
                <span class="list-row-sub">
                  Scope: ${esc(a.scope)} · Priority: ${esc(a.priority)} ·
                  ${fmtDT(a.created_at)} · Views: ${a.view_count || 0}
                </span>
                <p style="margin-top:6px;color:var(--text-soft)">${esc((a.body || '').slice(0, 160))}</p>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px">
                <button class="btn btn-secondary btn-xs" data-action="edit-announcement" data-id="${a.id}">Edit</button>
                <button class="btn btn-danger btn-xs" data-action="delete-announcement" data-id="${a.id}">Delete</button>
              </div>
            </li>`).join('')}
        </ul>
      </section>` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-bullhorn"></i>
          <h3>No announcements yet</h3>
          <p>Broadcast important updates to your teams, cohorts or departments.</p>
          <button class="btn btn-primary" data-action="create-announcement">
            <i class="fas fa-plus"></i> Create First Announcement</button>
        </div>
      </section>`}
  `;
}
