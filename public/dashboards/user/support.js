/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/support.js */
/* Stage 7: support with category routing, transaction-reference */
/* enforcement for billing, escalation, SLA display, attachment */
/* validation, privacy/safety/security-incident routing. */
/* ============================================================ */

const TICKET_MAX_SIZE_MB = 10;
const TICKET_ALLOWED_MIME = [
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'text/plain', 'text/csv', 'application/zip',
];

const SUPPORT_CATEGORIES = [
  { value: 'general',           label: 'General question' },
  { value: 'account',           label: 'Account access or profile' },
  { value: 'booking',           label: 'Booking or consultation' },
  { value: 'billing',           label: 'Billing, payment, or refund' },
  { value: 'technical',         label: 'Technical issue / bug' },
  { value: 'privacy',           label: 'Privacy or data request' },
  { value: 'safety',            label: 'Safety or abuse concern' },
  { value: 'security-incident', label: 'Security incident (account compromise)' },
];

function renderUserSupport() {
  const tickets = S.tickets || [];
  const open    = tickets.filter(t => ['open','pending','in_progress'].includes(t.status));
  const closed  = tickets.filter(t => ['resolved','closed'].includes(t.status));

  return UserUI.page({
    title: 'Support',
    breadcrumb: 'Support',
    actions: `
      <button class="btn btn-primary" data-action="new-ticket">
        <i class="fas fa-plus"></i> New Ticket</button>
    `,
    content: `
      <div class="alert alert-info">
        <i class="fas fa-shield-alt"></i>
        <div>
          <strong>Reporting a security incident?</strong> Use the
          <button class="btn-ghost btn-xs" data-action="new-ticket" data-category="security-incident">
            Security Incident</button> category for fastest routing.
          For urgent safety concerns, include a phone number so our team can reach you.
        </div>
      </div>

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
        <div style="display:flex;gap:6px;align-items:center">
          ${t.category ? `<span class="chip chip-neutral">${esc(t.category)}</span>` : ''}
          ${t.priority ? `<span class="chip chip-${t.priority === 'urgent' ? 'red' : t.priority === 'high' ? 'yellow' : 'neutral'}">${esc(t.priority)}</span>` : ''}
          ${UserUI.statusPill(t.status)}
        </div>
      </header>
      <h4 class="ticket-subject">${esc(t.subject || '')}</h4>
      <p class="ticket-desc">${esc(t.description || '')}</p>
      ${t.sla_response_due ? `
        <p class="form-hint">
          <i class="fas fa-clock"></i>
          Expected response: ${timeUntil(t.sla_response_due)}
        </p>
      ` : ''}
      ${t.transaction_reference ? `
        <p class="form-hint">
          <i class="fas fa-receipt"></i>
          Linked transaction: <code class="code">${esc(t.transaction_reference)}</code>
        </p>
      ` : ''}
      <footer class="ticket-actions">
        <button class="btn btn-secondary btn-sm" data-action="ticket-view" data-id="${t.id}">
          <i class="fas fa-eye"></i> View &amp; Reply</button>
        ${['open','pending','in_progress'].includes(t.status) && !t.escalated ? `
          <button class="btn btn-warning btn-sm" data-action="escalate-ticket" data-id="${t.id}">
            <i class="fas fa-arrow-up"></i> Escalate</button>
        ` : ''}
      </footer>
    </article>
  `;
}

window.ExpertHubUser.registerModule('support', renderUserSupport);

/* ============================================================ */
/* New ticket — category-aware fields, transaction reference */
/* ============================================================ */

window.ExpertHubUser.registerAction('new-ticket', (_, el) => {
  const presetCategory = el?.dataset?.category || 'general';

  openModal({
    title: 'New Support Ticket',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Subject *</span>
        <input id="tkSubject" class="form-input" required maxlength="200" /></label>

      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Category *</span>
          <select id="tkCategory" class="form-select">
            ${SUPPORT_CATEGORIES.map(c => `
              <option value="${c.value}" ${presetCategory === c.value ? 'selected' : ''}>
                ${esc(c.label)}
              </option>
            `).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Priority</span>
          <select id="tkPriority" class="form-select">
            ${['low','normal','high','urgent'].map(p =>
              `<option value="${p}" ${p === 'normal' ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </label>
      </div>

      <div id="tkTransactionWrap" style="display:none">
        <label class="form-group">
          <span class="form-label">Related transaction *</span>
          <select id="tkTransaction" class="form-select">
            <option value="">Loading transactions…</option>
          </select>
          <p class="form-hint">
            Billing requests must reference the actual transaction so we can verify state
            server-side — we do not accept user claims of payment as proof.
          </p>
        </label>
      </div>

      <label class="form-group"><span class="form-label">Description *</span>
        <textarea id="tkDesc" class="form-textarea" rows="5" required maxlength="4000"></textarea></label>

      <label class="form-group"><span class="form-label">Attachment (optional)</span>
        <input id="tkFile" type="file" class="form-input"
               accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.zip" />
        <p class="form-hint">Max ${TICKET_MAX_SIZE_MB}MB. PDF, images, text, CSV, ZIP.</p></label>

      <label class="checkbox-row" style="margin-top:8px">
        <input type="checkbox" id="tkSelfNotify" checked />
        <span>Email me updates on this ticket</span>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="tkSave" class="btn btn-primary">Create Ticket</button>
    `,
  });

  // Category -> toggle transaction selector
  const catSel = $('#tkCategory');
  const txWrap = $('#tkTransactionWrap');
  const loadTransactions = async () => {
    const sel = $('#tkTransaction');
    if (!sel) return;
    sel.innerHTML = '<option value="">Loading…</option>';
    const d = await apiCall('/api/user/transactions?limit=20').catch(() => ({ transactions: [] }));
    const list = d.transactions || [];
    sel.innerHTML = '<option value="">Select a transaction</option>' +
      list.map(t => `<option value="${esc(t.id)}">
        ${esc(t.reference || t.id)} — ${fmtCur(t.amount)} (${esc(t.status)})
      </option>`).join('');
  };
  const refreshCategory = () => {
    if (!catSel || !txWrap) return;
    const show = catSel.value === 'billing';
    txWrap.style.display = show ? 'block' : 'none';
    if (show) loadTransactions();
  };
  if (catSel) catSel.onchange = refreshCategory;
  refreshCategory();

  $('#tkSave').onclick = async () => {
    const subject = $('#tkSubject').value.trim();
    const description = $('#tkDesc').value.trim();
    const category = $('#tkCategory').value;
    if (!subject || !description) return showToast('Subject and description required', 'error');

    // Billing requires an actual transaction reference
    let transactionId = null;
    if (category === 'billing') {
      transactionId = $('#tkTransaction')?.value;
      if (!transactionId) return showToast('Select the transaction this concerns', 'error');
    }

    const file = $('#tkFile').files[0];
    if (file) {
      if (file.size > TICKET_MAX_SIZE_MB * 1024 * 1024) {
        return showToast(`File too large (max ${TICKET_MAX_SIZE_MB}MB)`, 'error');
      }
      if (!TICKET_ALLOWED_MIME.includes(file.type) &&
          !/\.(pdf|png|jpe?g|webp|txt|csv|zip)$/i.test(file.name)) {
        return showToast('File type not supported', 'error');
      }
    }

    const btn = $('#tkSave');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Creating…';

    try {
      const payload = {
        subject, description, category,
        priority: $('#tkPriority').value,
        transaction_id: transactionId ? Number(transactionId) : null,
        notify_by_email: $('#tkSelfNotify').checked,
      };
      let d;
      if (file) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => v !== null && fd.append(k, v));
        fd.append('attachment', file);
        d = await apiCall('/api/user/tickets', 'POST', fd, true);
      } else {
        d = await apiCall('/api/user/tickets', 'POST', payload);
      }

      closeModal();
      await loadAllData?.();
      rerenderRoleContent();

      const ref = d?.reference ? ` (${d.reference})` : '';
      showToast(`Ticket created${ref}`, 'success', 6000);
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Create Ticket';
    }
  };
});

/* ============================================================ */
/* Ticket view */
/* ============================================================ */

window.ExpertHubUser.registerAction('ticket-view', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/tickets/${id}`).catch(() => ({ ticket: null, replies: [] }));
    const t = d.ticket || (S.tickets || []).find(x => String(x.id) === String(id));
    if (!t) return showToast('Ticket not found', 'error');

    const isOpen = ['open','pending','in_progress'].includes(t.status);

    openModal({
      title: `Ticket ${esc(t.reference || '')}`,
      className: 'modal-lg',
      body: `
        <p><strong>Subject:</strong> ${esc(t.subject || '')}</p>
        <p>
          <strong>Status:</strong> ${UserUI.statusPill(t.status)}
          ${t.category ? ` · <strong>Category:</strong> ${esc(t.category)}` : ''}
          ${t.priority ? ` · <strong>Priority:</strong> ${esc(t.priority)}` : ''}
        </p>
        ${t.transaction_reference ? `
          <p><strong>Linked transaction:</strong> <code class="code">${esc(t.transaction_reference)}</code></p>
        ` : ''}
        ${t.sla_response_due ? `<p class="form-hint"><i class="fas fa-clock"></i> Expected response: ${timeUntil(t.sla_response_due)}</p>` : ''}
        <p style="margin-top:12px"><strong>Description:</strong></p>
        <p>${esc(t.description || '')}</p>

        <h3 class="panel-title" style="margin-top:16px">Conversation</h3>
        <ul class="list-stack">
          ${(d.replies || []).map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">
                  ${esc(r.author_name || '')}
                  ${r.is_staff ? '<span class="chip chip-blue">Staff</span>' : ''}
                  ${r.is_internal ? '<span class="chip chip-neutral"><i class="fas fa-lock"></i> Internal</span>' : ''}
                </span>
                <span class="list-row-sub">${esc(r.message || '')}</span>
              </div>
              <span class="list-row-meta">${timeAgo(r.created_at)}</span>
            </li>
          `).join('') || '<li class="empty-row">No replies yet</li>'}
        </ul>

        ${isOpen ? `
          <label class="form-group" style="margin-top:12px">
            <span class="form-label">Add reply</span>
            <textarea id="tkReply" class="form-textarea" rows="3" maxlength="2000"></textarea>
          </label>
        ` : '<p class="form-hint" style="margin-top:12px">This ticket is closed. Create a new ticket if you need further help.</p>'}

        ${isOpen && !t.escalated ? `
          <div class="panel-actions" style="margin-top:12px">
            <button class="btn btn-warning btn-sm" data-action="escalate-ticket" data-id="${t.id}">
              <i class="fas fa-arrow-up"></i> Request Escalation</button>
          </div>
        ` : ''}
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        ${isOpen ? `<button id="tkReplySave" class="btn btn-primary">Send Reply</button>` : ''}
      `,
    });

    const replyBtn = $('#tkReplySave');
    if (replyBtn) replyBtn.onclick = async () => {
      const message = $('#tkReply').value.trim();
      if (!message) return;
      replyBtn.disabled = true;
      replyBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sending…';
      try {
        await apiCall(`/api/user/tickets/${id}/replies`, 'POST', { message });
        closeModal();
        showToast('Reply sent', 'success');
      } catch (e) {
        showToast(e.message, 'error');
        replyBtn.disabled = false;
        replyBtn.textContent = 'Send Reply';
      }
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

/* ============================================================ */
/* Escalation */
/* ============================================================ */

window.ExpertHubUser.registerAction('escalate-ticket', (id) => {
  UserUI.formModal({
    title: 'Request Escalation',
    fields: [
      { name: 'reason', label: 'Reason for escalation', type: 'textarea', rows: 3, required: true,
        hint: 'Explain why this needs urgent attention.' },
    ],
    submitLabel: 'Submit Escalation',
    onSubmit: async (v) => {
      await apiCall(`/api/user/tickets/${id}/escalate`, 'POST', v);
      closeModal();
      showToast('Escalation requested. Our team has been notified.', 'success', 6000);
    },
  });
});
