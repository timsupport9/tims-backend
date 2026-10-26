/* ============================================================
   admin/support.js — Support tickets
   ============================================================ */
(function () {
  AdminDash.reg('support', {
    nav: { label: 'Support', icon: 'fa-headset' },
    render() {
      const byPriority = { low: 0, normal: 0, high: 0, urgent: 0 };
      S.tickets.forEach(t => { if (byPriority[t.priority] !== undefined) byPriority[t.priority]++; });
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Support</span></div>
        <section class="page-header"><h1 class="page-title">Support Tickets</h1></section>
        <section class="stat-grid">
          ${Object.entries(byPriority).map(([p, n]) => `
            <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">${p[0].toUpperCase() + p.slice(1)}</p><p class="stat-value">${n}</p></div><div class="stat-icon stat-icon-${p==='urgent'?'red':p==='high'?'yellow':'blue'}"><i class="fas fa-ticket"></i></div></div>
          `).join('')}
        </section>
        <section class="panel">
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Ref</th><th>User</th><th>Subject</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${S.tickets.map(t => `
                  <tr>
                    <td><code class="code">${esc(t.reference||t.id)}</code></td>
                    <td>${esc(t.user_name||'—')}</td>
                    <td>${esc(t.subject||'')}</td>
                    <td><span class="${statusClass(t.priority||'normal')}">${esc(t.priority||'')}</span></td>
                    <td><span class="${statusClass(t.status)}">${esc(t.status||'')}</span></td>
                    <td class="actions-cell">
                      <button class="btn btn-info btn-xs" data-action="ticket-view" data-id="${t.id}">View</button>
                      <button class="btn btn-success btn-xs" data-action="ticket-resolve" data-id="${t.id}">Resolve</button>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="6" class="empty-row">No tickets</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>`;
    },
    actions: {
      'ticket-view': async ({ id }) => {
        const t = S.tickets.find(x => String(x.id) === id); if (!t) return;
        openModal({
          title: `Ticket ${esc(t.reference||'')}`,
          body: `
            <p><strong>Subject:</strong> ${esc(t.subject||'')}</p>
            <p><strong>Description:</strong> ${esc(t.description||'')}</p>
            <p><strong>Status:</strong> <span class="${statusClass(t.status)}">${esc(t.status)}</span></p>
            <label class="form-group"><span class="form-label">Add reply</span><textarea id="tkReply" class="form-textarea" rows="3"></textarea></label>`,
          footer: `<button class="btn btn-secondary" data-close-modal>Close</button><button id="tkReplySave" class="btn btn-primary">Send Reply</button>`,
        });
        $('#tkReplySave').onclick = async () => {
          await apiCall(`/api/user/tickets/${id}/replies`, 'POST', { message: $('#tkReply').value });
          closeModal(); showToast('Reply sent','success');
        };
      },
      'ticket-resolve': async ({ id }) => {
        await apiCall(`/api/admin/tickets/${id}`, 'PUT', { status: 'resolved' });
        await loadAllData(); showToast('Resolved','success'); rerenderRoleContent();
      },
    },
  });
})();
