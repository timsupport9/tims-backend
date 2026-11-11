/* ============================================================
   ExpertHub 2.0 — dashboards/user/support.js
   Support tickets: list, create, view + reply.
   ============================================================ */

function renderUserSupport() {
  return UserUI.page({
    title: 'Support',
    breadcrumb: 'Support',
    actions: `
      <button class="btn btn-primary" data-action="new-ticket">
        <i class="fas fa-plus"></i> New Ticket</button>
    `,
    content: `
      <section class="panel">
        ${(S.tickets || []).length ? (S.tickets || []).map(t => `
          <article class="ticket-card">
            <header class="ticket-header">
              <span class="ticket-ref"><code class="code">${esc(t.reference || t.id)}</code></span>
              ${UserUI.statusPill(t.status)}
            </header>
            <h4 class="ticket-subject">${esc(t.subject || '')}</h4>
            <p class="ticket-desc">${esc(t.description || '')}</p>
            <footer class="ticket-actions">
              <button class="btn btn-secondary btn-sm" data-action="ticket-view" data-id="${t.id}">
                <i class="fas fa-eye"></i> View and Reply</button>
            </footer>
          </article>
        `).join('') : UserUI.empty({
          icon: 'fa-headset',
          title: 'No support tickets',
          desc: 'Need help? Create a ticket and our team will respond.',
        })}
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('support', renderUserSupport);

window.ExpertHubUser.registerAction('new-ticket', () => {
  UserUI.formModal({
    title: 'New Support Ticket',
    fields: [
      { name: 'subject',     label: 'Subject', required: true },
      { name: 'priority',    label: 'Priority', type: 'select', value: 'normal',
        options: ['low','normal','high','urgent'] },
      { name: 'category',    label: 'Category', type: 'select', value: 'general',
        options: ['general','billing','technical','account'] },
      { name: 'description', label: 'Description', type: 'textarea', rows: 4, required: true },
    ],
    submitLabel: 'Create Ticket',
    onSubmit: async (v) => {
      const d = await apiCall('/api/user/tickets', 'POST', v);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(`Ticket created: ${d.reference || ''}`, 'success');
    },
  });
});

window.ExpertHubUser.registerAction('ticket-view', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/tickets/${id}`).catch(() => ({ ticket: null, replies: [] }));
    const t = d.ticket || (S.tickets || []).find(x => String(x.id) === String(id));
    if (!t) return showToast('Ticket not found', 'error');

    openModal({
      title: `Ticket ${esc(t.reference || '')}`,
      className: 'modal-lg',
      body: `
        <p><strong>Subject:</strong> ${esc(t.subject || '')}</p>
        <p><strong>Status:</strong> ${UserUI.statusPill(t.status)}</p>
        <p><strong>Description:</strong></p>
        <p>${esc(t.description || '')}</p>
        <h3 class="panel-title" style="margin-top:16px">Replies</h3>
        <ul class="list-stack">
          ${(d.replies || []).map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.author_name || '')}</span>
                <span class="list-row-sub">${esc(r.message || '')}</span>
              </div>
              <span class="list-row-meta">${timeAgo(r.created_at)}</span>
            </li>
          `).join('') || '<li class="empty-row">No replies yet</li>'}
        </ul>
        <label class="form-group" style="margin-top:12px">
          <span class="form-label">Add reply</span>
          <textarea id="tkReply" class="form-textarea" rows="3"></textarea>
        </label>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button id="tkReplySave" class="btn btn-primary">Send Reply</button>
      `,
    });
    $('#tkReplySave').onclick = async () => {
      const message = $('#tkReply').value.trim();
      if (!message) return;
      await apiCall(`/api/user/tickets/${id}/replies`, 'POST', { message });
      closeModal();
      showToast('Reply sent', 'success');
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});
