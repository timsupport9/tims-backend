/* ============================================================
   ExpertHub 2.0 — js/admin/14-tickets.js
   Admin support tickets.
   ============================================================ */

function adminTickets() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Support</span></div>
    <section class="page-header"><h1 class="page-title">Support Tickets</h1></section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Ref</th><th>User</th><th>Subject</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${S.tickets.map(t => `
              <tr>
                <td><code class="code">${esc(t.reference || t.id)}</code></td>
                <td>${esc(t.user_name || '—')}</td>
                <td>${esc(t.subject || '')}</td>
                <td><span class="${statusClass(t.priority || 'normal')}">${esc(t.priority || '')}</span></td>
                <td><span class="${statusClass(t.status)}">${esc(t.status || '')}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-info btn-xs" data-action="ticket-view" data-id="${t.id}">View</button>
                  <button class="btn btn-success btn-xs" data-action="ticket-resolve" data-id="${t.id}">Resolve</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty-row">No tickets</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}