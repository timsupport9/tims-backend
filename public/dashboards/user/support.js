/* ============================================================
   ExpertHub 2.0 — dashboards/user/support.js
   Support tickets with attachments, status updates,
   conversation history, category/priority validation.
   ============================================================ */

const TICKET_MAX_SIZE_MB = 10;

function renderUserSupport() {
  const tickets = S.tickets || [];
  const open   = tickets.filter(t => ['open','pending','in_progress'].includes(t.status));
  const closed = tickets.filter(t => ['resolved','closed'].includes(t.status));

  return UserUI.page({
    title: 'Support',
    breadcrumb: 'Support',
    actions: `
      <button class="btn btn-primary" data-action="new-ticket">
        <i class="fas fa-plus"></i> New Ticket</button>
    `,
    content: `
      ${open.length ? `
        <section class="panel">
          <h3 class="panel-title">Open Tickets</h3>
          ${open.map(t => renderTicketCard(t)).join('')}
        </section>
      ` : ''}

      ${closed.length ? `
        <section class="panel">
          <h3 class="panel-title">Closed Tickets</h3>
          ${closed.map(t => renderTicketCard(t)).join('')}
        </section>
      ` : ''}

      ${!tickets.length ? `
        <section class="panel">${UserUI.empty({
          icon: 'fa-headset',
          title: 'No support tickets',
          desc: 'Need help? Create a ticket and our team will respond.',
        })}</section>
      ` : ''}
    `,
  });
}

function renderTicketCard(t) {
  return `
    <article class="ticket-card">
      <header class="ticket-header">
        <span class="ticket-ref"><code class="code">${esc(t.reference || t.id)}</code></span>
        ${UserUI.statusPill(t.status)}
      </header>
      <h4 class="ticket-subject">${esc(t.subject || '')}</h4>
      <p class="ticket-desc">${esc(t.description || '')}</p>
      <footer class="ticket-actions">
        <button class="btn btn-secondary btn-sm" data-action="ticket-view" data-id="${t.id}">
          <i class="fas fa-eye"></i> View &amp; Reply</button>
      </footer>
    </article>
  `;
}

window.ExpertHubUser.registerModule('support', renderUserSupport);

window.ExpertHubUser.registerAction('new-ticket', () => {
  openModal({
    title: 'New Support Ticket',
    body: `
      <label class="form-group"><span class="form-label">Subject</span>
        <input id="tkSubject" class="form-input" required /></label>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Priority</span>
          <select id="tkPriority" class="form-select">
            ${['low','normal','high','urgent'].map(p => `<option value="${p}">${p}</option>`).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Category</span>
          <select id="tkCategory" class="form-select">
            <option value="general">General</option>
            <option value="billing">Billing</option>
            <option value="technical">Technical</option>
            <option value="account">Account</option>
          </select>
        </label>
      </div>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="tkDesc" class="form-textarea" rows="4" required></textarea></label>
      <label class="form-group"><span class="form-label">Attachment (optional)</span>
        <input id="tkFile" type="file" class="form-input"
               accept=".pdf,.png,.jpg,.jpeg,.txt,.log" />
        <p class="form-hint">Max ${TICKET_MAX_SIZE_MB}MB.</p></label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="tkSave" class="btn btn-primary">Create Ticket</button>
    `,
  });

  $('#tkSave').onclick = async () => {
    const subject = $('#tkSubject').value.trim();
    const description = $('#tkDesc').value.trim();
    if (!subject || !description) return showToast('Subject and description required', 'error');
    const file = $('#tkFile').files[0];
    if (file && file.size > TICKET_MAX_SIZE_MB * 1024 * 1024) {
      return showToast(`File too large (max ${TICKET_MAX_SIZE_MB}MB)`, 'error');
    }
    const btn = $('#tkSave');
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const payload = {
        subject, description,
        priority: $('#tkPriority').value,
        category: $('#tkCategory').value,
      };
      let d;
      if (file) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
        fd.append('attachment', file);
        d = await apiCall('/api/user/tickets', 'POST', fd, true);
      } else {
        d = await apiCall('/api/user/tickets', 'POST', payload);
      }
      closeModal();
      await loadAllData?.();
      rerenderRoleContent();
      showToast(`Ticket created: ${d?.reference || ''}`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false;
    }
  };
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
        <p><strong>Status:</strong> ${UserUI.statusPill(t.status)} · <strong>Priority:</strong> ${esc(t.priority || '')}</p>
        <p><strong>Description:</strong></p>
        <p>${esc(t.description || '')}</p>
        <h3 class="panel-title" style="margin-top:16px">Conversation</h3>
        <ul class="list-stack">
          ${(d.replies || []).map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">
                  ${esc(r.author_name || '')}
                  ${r.is_staff ? '<span class="chip chip-blue">Staff</span>' : ''}
                </span>
                <span class="list-row-sub">${esc(r.message || '')}</span>
              </div>
              <span class="list-row-meta">${timeAgo(r.created_at)}</span>
            </li>
          `).join('') || '<li class="empty-row">No replies yet</li>'}
        </ul>
        ${['open','pending','in_progress'].includes(t.status) ? `
          <label class="form-group" style="margin-top:12px">
            <span class="form-label">Add reply</span>
            <textarea id="tkReply" class="form-textarea" rows="3"></textarea>
          </label>
        ` : '<p class="form-hint">This ticket is closed. Create a new ticket for further help.</p>'}
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        ${['open','pending','in_progress'].includes(t.status)
          ? `<button id="tkReplySave" class="btn btn-primary">Send Reply</button>`
          : ''}
      `,
    });

    const replyBtn = $('#tkReplySave');
    if (replyBtn) replyBtn.onclick = async () => {
      const message = $('#tkReply').value.trim();
      if (!message) return;
      replyBtn.disabled = true;
      try {
        await apiCall(`/api/user/tickets/${id}/replies`, 'POST', { message });
        closeModal();
        showToast('Reply sent', 'success');
      } catch (e) {
        showToast(e.message, 'error');
        replyBtn.disabled = false;
      }
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});