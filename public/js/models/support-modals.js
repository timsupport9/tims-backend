/* ============================================================
   ExpertHub 2.0 — support-modals.js
   Functions moved intact from 13-modals.js.
   ============================================================ */

function openNewTicketModal() {
  openModal({
    title: 'New Support Ticket',
    body: `
      <label class="form-group"><span class="form-label">Subject</span>
        <input id="tkSubject" class="form-input" /></label>
      <label class="form-group">
        <span class="form-label">Priority</span>
        <select id="tkPriority" class="form-select">
          <option value="low">Low</option>
          <option value="normal" selected>Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Category</span>
        <select id="tkCat" class="form-select">
          <option value="general">General</option>
          <option value="billing">Billing</option>
          <option value="technical">Technical</option>
          <option value="account">Account</option>
        </select>
      </label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="tkDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tkSave" class="btn btn-primary">Create Ticket</button>`,
  });
  $('#tkSave').onclick = async () => {
    const subject = $('#tkSubject').value;
    const description = $('#tkDesc').value;
    if (!subject || !description) return showToast('Fill all fields', 'error');
    try {
      const d = await apiCall('/api/user/tickets', 'POST', {
        subject, description,
        priority: $('#tkPriority').value,
        category: $('#tkCat').value,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast(`Ticket created: ${d.reference}`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}
async function openTicketModal(id) {
  try {
    const d = await apiCall('/api/user/tickets');
    const t = (d.tickets || []).find(x => String(x.id) === id) || S.tickets.find(x => String(x.id) === id);
    if (!t) return;
    openModal({
      title: `Ticket ${esc(t.reference || '')}`,
      body: `
        <p><strong>Subject:</strong> ${esc(t.subject || '')}</p>
        <p><strong>Description:</strong> ${esc(t.description || '')}</p>
        <p><strong>Status:</strong> <span class="${statusClass(t.status)}">${esc(t.status)}</span></p>
        <label class="form-group"><span class="form-label">Add reply</span>
          <textarea id="tkReply" class="form-textarea" rows="3"></textarea></label>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
               <button id="tkReplySave" class="btn btn-primary">Send Reply</button>`,
    });
    $('#tkReplySave').onclick = async () => {
      const message = $('#tkReply').value;
      if (!message) return;
      await apiCall(`/api/user/tickets/${id}/replies`, 'POST', { message });
      closeModal(); showToast('Reply sent', 'success');
    };
  } catch (e) { showToast(e.message, 'error'); }
}
