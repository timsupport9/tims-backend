/* ============================================================
   ExpertHub 2.0 — 13b-modals-admin.js
   Admin-only modal builders.
   ============================================================ */

/* ---------- Admin modals ---------- */
function openEditUserModal(userId) {
  const u = S.users.find(x => String(x.id) === String(userId));
  if (!u) return;
  openModal({
    title: `Edit ${u.name}`,
    body: `
      <label class="form-group"><span class="form-label">Name</span>
        <input id="euName" class="form-input" value="${esc(u.name || '')}" /></label>
      <label class="form-group"><span class="form-label">Role</span>
        <select id="euRole" class="form-select">
          <option value="learner" ${u.role === 'learner' ? 'selected' : ''}>Learner</option>
          <option value="expert" ${u.role === 'expert' ? 'selected' : ''}>Expert</option>
          <option value="institution" ${u.role === 'institution' ? 'selected' : ''}>Institution</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select></label>
      <label class="form-group"><span class="form-label">Status</span>
        <select id="euStatus" class="form-select">
          <option value="active" ${u.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="pending" ${u.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="suspended" ${u.status === 'suspended' ? 'selected' : ''}>Suspended</option>
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="euSave" class="btn btn-primary">Save</button>`,
  });
  $('#euSave').onclick = async () => {
    await apiCall(`/api/admin/users/${userId}`, 'PUT', {
      name: $('#euName').value,
      role: $('#euRole').value,
      status: $('#euStatus').value,
    });
    closeModal(); await reloadUsers(); showToast('User updated', 'success'); rerenderRoleContent();
  };
}

async function submitCreateExpert() {
  const name = $('#newExpertName').value;
  const email = $('#newExpertEmail').value;
  const spec = $('#newExpertSpec').value;
  const rate = Number($('#newExpertRate').value || 0);
  const bio = $('#newExpertBio').value;
  const phone = $('#newExpertPhone').value;
  if (!name || !email) return showToast('Name and email required', 'error');
  showLoading(true);
  const d = await apiCall('/api/admin/experts/create', 'POST', { name, email, specialization: spec, hourly_rate: rate, bio, phone });
  await loadAllData(); rerenderRoleContent(); showLoading(false);
  showToast(`Expert created. Temp password: ${d.temp_password}`, 'success', 8000);
}

function openAssignExpertModal(consultationId) {
  const opts = S.experts.map(e =>
    `<option value="${e.id}">${esc(e.name)} (${esc(e.specialization || '')})</option>`
  ).join('');
  openModal({
    title: 'Assign Expert',
    body: `<label class="form-group"><span class="form-label">Expert</span>
      <select id="assignExp" class="form-select">${opts}</select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="assignSave" class="btn btn-primary">Assign</button>`,
  });
  $('#assignSave').onclick = async () => {
    await apiCall(`/api/common/consultations/${consultationId}/assign`, 'PUT', {
      expert_id: Number($('#assignExp').value),
    });
    closeModal(); await reloadConsultations(); rerenderRoleContent(); showToast('Expert assigned', 'success');
  };
}

function openAssignOpsModal(instId) {
  openModal({
    title: 'Assign Operations Manager',
    body: `
      <label class="form-group"><span class="form-label">Manager name</span>
        <input id="omName" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Manager email</span>
        <input id="omEmail" type="email" class="form-input" /></label>
      <p class="form-hint">A temporary password will be generated and shown once.</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="omSave" class="btn btn-primary">Assign</button>`,
  });
  $('#omSave').onclick = async () => {
    const d = await apiCall(`/api/admin/institutions/${instId}/ops-manager`, 'POST', {
      name: $('#omName').value, email: $('#omEmail').value,
    });
    closeModal(); await reloadInstitutions(); rerenderRoleContent();
    showToast(`Ops manager created. Temp password: ${d.temp_password}`, 'success', 8000);
  };
}

function openCreateCouponModal() {
  openModal({
    title: 'New Coupon',
    body: `
      <label class="form-group"><span class="form-label">Code</span>
        <input id="cpCode" class="form-input" placeholder="WELCOME10" /></label>
      <label class="form-group"><span class="form-label">Type</span>
        <select id="cpType" class="form-select">
          <option value="percent">Percent</option><option value="fixed">Fixed</option>
        </select></label>
      <label class="form-group"><span class="form-label">Value</span>
        <input id="cpValue" type="number" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Max uses (optional)</span>
        <input id="cpMax" type="number" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Min spend</span>
        <input id="cpMin" type="number" class="form-input" value="0" /></label>
      <label class="form-group"><span class="form-label">Applies to</span>
        <select id="cpApply" class="form-select">
          <option value="all">All</option>
          <option value="bootcamp">Bootcamps</option>
          <option value="short_course">Short courses</option>
          <option value="event">Events</option>
          <option value="consultation">Consultations</option>
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="cpSave" class="btn btn-primary">Create</button>`,
  });
  $('#cpSave').onclick = async () => {
    await apiCall('/api/admin/coupons', 'POST', {
      code: $('#cpCode').value,
      discount_type: $('#cpType').value,
      discount_value: Number($('#cpValue').value || 0),
      max_uses: $('#cpMax').value ? Number($('#cpMax').value) : null,
      min_spend: Number($('#cpMin').value || 0),
      applies_to: $('#cpApply').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Coupon created', 'success');
  };
}

async function sendBroadcast() {
  const title = $('#broadcastTitle').value;
  const message = $('#broadcastMessage').value;
  const audience = $('#broadcastAudience').value;
  if (!title || !message) return showToast('Fill title and message', 'error');
  showLoading(true);
  const d = await apiCall('/api/admin/notifications/broadcast', 'POST', { title, message, audience });
  showLoading(false);
  showToast(`Broadcast sent to ${d.sent} users`, 'success');
}

async function saveAdminSettings() {
  const settings = {
    platform_name: $('#setPlatformName').value,
    support_email: $('#setSupportEmail').value,
    default_currency: $('#setCurrency').value,
    default_timezone: $('#setTimezone').value,
    commission_consultation: $('#setCommCons').value,
    commission_course: $('#setCommCourse').value,
    withdrawal_hold_days: $('#setHold').value,
    min_payout: $('#setMinPayout').value,
  };
  await apiCall('/api/admin/settings', 'PUT', { settings });
  showToast('Settings saved', 'success');
}

function showConsultationModal(id) {
  const c = S.consultations.find(x => String(x.id) === id);
  if (!c) return;
  openModal({
    title: c.title || 'Consultation',
    body: `
      <p><strong>Client:</strong> ${esc(c.client_name || '-')}</p>
      <p><strong>Expert:</strong> ${esc(c.expert_name || 'Unassigned')}</p>
      <p><strong>Status:</strong> <span class="${consultationStatusClass(c.status)}">${esc(c.status)}</span></p>
      <p><strong>Type:</strong> ${esc(c.consultation_type || '')}</p>
      <p><strong>Description:</strong> ${esc(c.description || '')}</p>
      <p><strong>Created:</strong> ${fmtDT(c.created_at)}</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

function openEventModal(id = null) {
  const ev = id ? S.events.find(x => String(x.id) === id) : {};
  const expertOpts = S.experts.map(e =>
    `<option value="${e.id}" ${ev.expert_id === e.id ? 'selected' : ''}>${esc(e.name)}</option>`
  ).join('');
  openModal({
    title: id ? 'Edit Event' : 'New Event',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="evTitle" class="form-input" value="${esc(ev.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="evDesc" class="form-textarea" rows="3">${esc(ev.description || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Category</span>
        <input id="evCat" class="form-input" value="${esc(ev.category || 'General')}" /></label>
      <label class="form-group">
        <span class="form-label">Expert</span>
        <select id="evExpert" class="form-select">
          <option value="">None</option>${expertOpts}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Date</span>
        <input id="evDate" type="date" class="form-input"
               value="${ev.date ? new Date(ev.date).toISOString().slice(0,10) : ''}" /></label>
      <label class="form-group"><span class="form-label">Capacity</span>
        <input id="evCap" type="number" class="form-input" value="${ev.capacity || 100}" /></label>
      <label class="form-group"><span class="form-label">Price ($)</span>
        <input id="evPrice" type="number" class="form-input" value="${ev.price || 0}" /></label>
      <label class="form-group"><span class="form-label">Expert payment ($)</span>
        <input id="evPay" type="number" class="form-input" value="${ev.expert_payment || 0}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="evSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  $('#evSave').onclick = async () => {
    const payload = {
      title: $('#evTitle').value,
      description: $('#evDesc').value,
      category: $('#evCat').value,
      expert_id: $('#evExpert').value ? Number($('#evExpert').value) : null,
      date: $('#evDate').value || null,
      capacity: Number($('#evCap').value || 100),
      price: Number($('#evPrice').value || 0),
      expert_payment: Number($('#evPay').value || 0),
    };
    try {
      if (id) await apiCall(`/api/admin/events/${id}`, 'PUT', payload);
      else    await apiCall('/api/admin/events', 'POST', payload);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(id ? 'Event updated' : 'Event created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}
