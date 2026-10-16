/* ============================================================
   ExpertHub 2.0 — js/admin/17-audit.js
   Admin audit log.
   ============================================================ */

function adminAudit() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Audit</span></div>
    <section class="page-header"><h1 class="page-title">Audit Log</h1></section>
    <section class="panel">
      <ul class="list-stack">
        ${S.auditLogs.map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.action || '')}</span>
              <span class="list-row-sub">target ${esc(l.target || '')}${l.target_id ? ' #' + l.target_id : ''} by ${esc(l.actor_name || 'system')}</span>
            </div>
            <span class="list-row-meta">${fmtDT(l.created_at)}</span>
          </li>
        `).join('') || '<li class="empty-row">No entries</li>'}
      </ul>
    </section>
  `;
}