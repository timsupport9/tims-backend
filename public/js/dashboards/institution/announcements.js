/* ============================================================
   ExpertHub 2.0 — Announcements
   Scheduling, segmentation, delivery channels, read receipts,
   attachments, emergency notices, acknowledgement tracking.
   ============================================================ */

function instAnnouncements() {
  const list = S.announcements || [];
  const canWrite = hasInstitutionPermission('announcements:write');

  const total = list.length;
  const urgent = list.filter(a => a.priority === 'urgent' || a.priority === 'critical').length;
  const pendingAcknowledgements = list.reduce((s, a) => s + safeNum(a.unacknowledged_count), 0);
  const totalViews = list.reduce((s, a) => s + safeNum(a.view_count), 0);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Announcements</span></div>
    <section class="page-header">
      <h1 class="page-title">Institution Announcements</h1>
      <div class="page-actions">
        ${canWrite ? `
          <button class="btn btn-primary" data-action="create-announcement">
            <i class="fas fa-plus"></i> New Announcement</button>` : ''}
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Total', total, '', 'fa-bullhorn', 'blue')}
      ${statCard('Urgent / Critical', urgent, '', 'fa-exclamation-triangle', urgent > 0 ? 'red' : 'green')}
      ${statCard('Pending Acknowledgements', pendingAcknowledgements, '', 'fa-check-double', 'yellow')}
      ${statCard('Total Views', totalViews, '', 'fa-eye', 'purple')}
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
                  ${a.scheduled_at ? `Scheduled ${fmtDT(a.scheduled_at)}` : fmtDT(a.created_at)} ·
                  Views: ${a.view_count || 0}
                  ${a.requires_acknowledgement
                    ? ` · <span class="chip chip-${safeNum(a.unacknowledged_count) > 0 ? 'yellow' : 'green'}" style="font-size:.65rem">
                        ${safeNum(a.unacknowledged_count)} pending ack
                      </span>`
                    : ''}
                  ${(a.channels || []).length ? ` · Channels: ${a.channels.join(', ')}` : ''}
                </span>
                <p style="margin-top:6px;color:var(--text-soft)">${esc(truncate(a.body || '', 160))}</p>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px">
                ${canWrite ? `
                  <button class="btn btn-secondary btn-xs" data-action="edit-announcement" data-id="${a.id}">Edit</button>
                  ${a.requires_acknowledgement ? `
                    <button class="btn btn-info btn-xs" data-action="view-acknowledgements" data-id="${a.id}">
                      Acks</button>` : ''}
                  <button class="btn btn-danger btn-xs" data-action="delete-announcement" data-id="${a.id}">
                    Delete</button>` : ''}
              </div>
            </li>`).join('')}
        </ul>
      </section>` : renderEmptyState({
            icon: 'fa-bullhorn',
            title: 'No announcements yet',
            description: 'Broadcast important updates to teams, cohorts or departments.',
            actionLabel: canWrite ? '+ Create First Announcement' : '',
            actionAttrs: canWrite ? 'data-action="create-announcement"' : '',
          })}
  `;
}
