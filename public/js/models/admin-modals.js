/* ============================================================
   ExpertHub 2.0 — admin-modals.js
   Administrator modal module. Uses shared-modal-helpers.js.

   Sections
   --------
    1.  Dependencies
    2.  Constants
    3.  Local state & cache
    4.  Data loaders
    5.  Users — list, view, edit, create, role, permissions,
        suspend, activate, delete, reset password, activity, audit
    6.  Experts — approve, reject, suspend, verify, documents,
        commission, view, edit, impersonate
    7.  Institutions — view, suspend, ops manager, plan, quotas
    8.  Consultations — view, assign, reassign, cancel, dispute,
        refund
    9.  Coupons — list, create, edit, deactivate, delete, stats
    10. Broadcasts — compose, preview, schedule, history
    11. Events — create, edit, delete, registrations, attendance,
        publish, revenue
    12. Settings — general, security, payments, email, storage,
        maintenance
    13. Audit log — global viewer + per-entity viewer
    14. Backward-compatible exports

   Lifecycle contract (every modal):
     load → render → validate → submit → refresh → toast → close
   ============================================================ */

/* ------------------------------------------------------------------
 * 1. Dependencies
 * ----------------------------------------------------------------
   Requires: shared-modal-helpers.js, core.js ($, S, apiCall,
   openModal, closeModal, showToast, esc, avatar, fmtCur, fmtDT,
   loadAllData, rerenderRoleContent, showLoading, reloadUsers,
   reloadConsultations, reloadInstitutions, consultationStatusClass).
*/

/* ------------------------------------------------------------------
 * 2. Constants
 * ---------------------------------------------------------------- */

const ADMIN_ROLES = ['learner', 'expert', 'institution', 'admin', 'ops_manager'];

const ADMIN_USER_STATUSES = ['active', 'pending', 'suspended', 'deleted'];

const ADMIN_COUPON_TYPES = ['percent', 'fixed'];

const ADMIN_COUPON_SCOPES = [
  'all', 'bootcamp', 'short_course', 'event', 'consultation', 'subscription',
];

const ADMIN_BROADCAST_AUDIENCES = [
  'all', 'learners', 'experts', 'institutions', 'admins', 'active_30d', 'inactive_30d',
];

const ADMIN_EXPERT_DECISION_REASONS = [
  'Incomplete documentation',
  'Unverifiable credentials',
  'Policy violation',
  'Duplicate account',
  'Other',
];

const ADMIN_PERMISSION_CATALOG = [
  { key: 'users.read',        label: 'View users' },
  { key: 'users.write',       label: 'Create / edit users' },
  { key: 'users.delete',      label: 'Delete users' },
  { key: 'experts.approve',   label: 'Approve experts' },
  { key: 'experts.suspend',   label: 'Suspend experts' },
  { key: 'institutions.manage', label: 'Manage institutions' },
  { key: 'consultations.assign', label: 'Assign consultations' },
  { key: 'coupons.manage',    label: 'Manage coupons' },
  { key: 'broadcasts.send',   label: 'Send broadcasts' },
  { key: 'events.manage',     label: 'Manage events' },
  { key: 'payments.refund',   label: 'Issue refunds' },
  { key: 'settings.write',    label: 'Edit platform settings' },
  { key: 'audit.read',        label: 'View audit log' },
];

/* ------------------------------------------------------------------
 * 3. Local state & cache
 * ---------------------------------------------------------------- */

const AdminModalState = {
  userActivityCache: new Map(),
  userAuditCache:    new Map(),
  expertDocsCache:   new Map(),
  eventRegCache:     new Map(),
  couponStatsCache:  new Map(),
  auditPage:         1,
  auditFilters:      {},
};

function clearAdminCache() {
  AdminModalState.userActivityCache.clear();
  AdminModalState.userAuditCache.clear();
  AdminModalState.expertDocsCache.clear();
  AdminModalState.eventRegCache.clear();
  AdminModalState.couponStatsCache.clear();
}

/* ------------------------------------------------------------------
 * 4. Data loaders
 * ---------------------------------------------------------------- */

async function adminFetchUser(userId) {
  try { return await apiCall(`/api/admin/users/${userId}`); }
  catch (_) { return S.users?.find(x => String(x.id) === String(userId)) || null; }
}

async function adminFetchUserActivity(userId, force = false) {
  if (!force && AdminModalState.userActivityCache.has(userId)) {
    return AdminModalState.userActivityCache.get(userId);
  }
  const rows = await apiCall(`/api/admin/users/${userId}/activity`).catch(() => ({ activity: [] }));
  AdminModalState.userActivityCache.set(userId, rows.activity || []);
  return rows.activity || [];
}

async function adminFetchUserAudit(userId, force = false) {
  if (!force && AdminModalState.userAuditCache.has(userId)) {
    return AdminModalState.userAuditCache.get(userId);
  }
  const rows = await apiCall(`/api/admin/users/${userId}/audit`).catch(() => ({ entries: [] }));
  AdminModalState.userAuditCache.set(userId, rows.entries || []);
  return rows.entries || [];
}

async function adminFetchExpertDocs(expertId, force = false) {
  if (!force && AdminModalState.expertDocsCache.has(expertId)) {
    return AdminModalState.expertDocsCache.get(expertId);
  }
  const d = await apiCall(`/api/admin/experts/${expertId}/documents`).catch(() => ({ documents: [] }));
  AdminModalState.expertDocsCache.set(expertId, d.documents || []);
  return d.documents || [];
}

async function adminFetchEventRegistrations(eventId, force = false) {
  if (!force && AdminModalState.eventRegCache.has(eventId)) {
    return AdminModalState.eventRegCache.get(eventId);
  }
  const d = await apiCall(`/api/admin/events/${eventId}/registrations`).catch(() => ({ registrations: [] }));
  AdminModalState.eventRegCache.set(eventId, d.registrations || []);
  return d.registrations || [];
}

async function adminFetchCouponStats(couponId, force = false) {
  if (!force && AdminModalState.couponStatsCache.has(couponId)) {
    return AdminModalState.couponStatsCache.get(couponId);
  }
  const d = await apiCall(`/api/admin/coupons/${couponId}/stats`).catch(() => ({}));
  AdminModalState.couponStatsCache.set(couponId, d);
  return d;
}

/* ==================================================================
 * 5. USERS
 * ================================================================== */

/* ---------------- View user ---------------- */

async function openViewUserModal(userId) {
  try {
    showLoading(true);
    const u = await adminFetchUser(userId);
    if (!u) { showToast('User not found', 'error'); return; }

    const badges = [];
    if (u.role === 'admin') badges.push('<span class="badge badge-danger">Admin</span>');
    if (u.verified) badges.push('<span class="badge badge-success">Verified</span>');
    if (u.status === 'suspended') badges.push('<span class="badge badge-warning">Suspended</span>');
    if (u.status === 'pending')   badges.push('<span class="badge badge-info">Pending</span>');

    openModal({
      title: `User · ${esc(u.name || 'Unnamed')}`,
      className: 'modal-lg',
      body: `
        <div class="user-profile-header">
          <img class="expert-avatar-lg" src="${avatar(u)}" alt="" />
          <div>
            <h2>${esc(u.name || '')} ${badges.join(' ')}</h2>
            <p class="form-hint">${esc(u.email || '')}</p>
            <p class="form-hint">${esc(u.phone || '—')}</p>
          </div>
        </div>
        <div class="expert-profile-stats">
          <div><strong>${esc(u.role || '—')}</strong><span>Role</span></div>
          <div><strong>${esc(u.status || '—')}</strong><span>Status</span></div>
          <div><strong>${esc(mfFormatDate(u.created_at))}</strong><span>Joined</span></div>
          <div><strong>${esc(mfRelativeTime(u.last_login))}</strong><span>Last login</span></div>
        </div>
        ${u.bio ? `<p class="expert-profile-bio">${esc(u.bio)}</p>` : ''}`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-info" data-action="user-activity" data-id="${u.id}">
          <i class="fas fa-history"></i> Activity</button>
        <button class="btn btn-info" data-action="user-audit" data-id="${u.id}">
          <i class="fas fa-clipboard-list"></i> Audit</button>
        <button class="btn btn-primary" data-action="edit-user" data-id="${u.id}">
          <i class="fas fa-edit"></i> Edit</button>`,
    });
    enhanceModalAccessibility();
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

/* ---------------- Edit user (backward-compatible name) ---------------- */

async function openEditUserModal(userId) {
  const u = await adminFetchUser(userId);
  if (!u) { showToast('User not found', 'error'); return; }

  openModal({
    title: `Edit ${esc(u.name || 'User')}`,
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Full name *</span>
        <input id="euName" class="form-input" data-autofocus value="${esc(u.name || '')}" maxlength="120" /></label>
      <label class="form-group"><span class="form-label">Email *</span>
        <input id="euEmail" type="email" class="form-input" value="${esc(u.email || '')}" maxlength="160" /></label>
      <label class="form-group"><span class="form-label">Phone</span>
        <input id="euPhone" class="form-input" value="${esc(u.phone || '')}" maxlength="30" /></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Role</span>
          <select id="euRole" class="form-select">
            ${ADMIN_ROLES.map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Status</span>
          <select id="euStatus" class="form-select">
            ${ADMIN_USER_STATUSES.map(s => `<option value="${s}" ${u.status === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
          </select></label>
      </div>
      <label class="form-group form-checkbox">
        <input id="euVerified" type="checkbox" ${u.verified ? 'checked' : ''} />
        <span>Mark as verified</span>
      </label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-info" id="euReset"><i class="fas fa-key"></i> Reset Password</button>
      <button id="euSave" class="btn btn-primary">Save</button>`,
  });

  enhanceModalAccessibility();
  trackFormChanges();

  $('#euReset').onclick = () => openResetUserPasswordModal(userId);

  $('#euSave').onclick = async () => {
    clearFormErrors(); clearModalError();

    const data = {
      name:     sanitizeInput($('#euName').value),
      email:    sanitizeInput($('#euEmail').value).toLowerCase(),
      phone:    sanitizeInput($('#euPhone').value),
      role:     $('#euRole').value,
      status:   $('#euStatus').value,
      verified: $('#euVerified').checked,
    };

    const { valid, errors } = validateForm(data, {
      name:  [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
      email: [Validators.required, Validators.email],
      phone: [Validators.phone],
      role:  [Validators.required, Validators.oneOf(ADMIN_ROLES)],
      status:[Validators.required, Validators.oneOf(ADMIN_USER_STATUSES)],
    });
    if (!valid) {
      applyValidationErrors(errors, {
        name: 'euName', email: 'euEmail', phone: 'euPhone', role: 'euRole', status: 'euStatus',
      });
      return;
    }

    if (data.role !== u.role && data.role === 'admin') {
      const { confirmed } = await openConfirmModal({
        title: 'Elevate to admin',
        message: `Grant ${data.name} full administrator privileges?`,
        confirmText: 'Grant admin',
        danger: true,
      });
      if (!confirmed) return;
    }

    disableModalSubmit();
    const res = await modalApiUpdate(`/api/admin/users/${userId}`, data, {
      successMessage: 'User updated',
      refresh: true, rerender: true,
    });
    if (res.ok) {
      closeModal();
      untrackFormChanges();
      clearAdminCache();
      trackModalAudit('admin.user.updated', { userId, changes: data });
    } else enableModalSubmit();
  };
}

/* ---------------- Create user ---------------- */

function openCreateUserModal() {
  openModal({
    title: 'Create User',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Full name *</span>
        <input id="cuName" class="form-input" data-autofocus maxlength="120" /></label>
      <label class="form-group"><span class="form-label">Email *</span>
        <input id="cuEmail" type="email" class="form-input" maxlength="160" /></label>
      <label class="form-group"><span class="form-label">Phone</span>
        <input id="cuPhone" class="form-input" maxlength="30" /></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Role *</span>
          <select id="cuRole" class="form-select">
            ${ADMIN_ROLES.map(r => `<option value="${r}">${esc(r)}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Send welcome email</span>
          <select id="cuWelcome" class="form-select">
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select></label>
      </div>
      <p class="form-hint">A temporary password will be generated and shown once.</p>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="cuSave" class="btn btn-primary">Create User</button>`,
  });

  enhanceModalAccessibility();
  trackFormChanges();

  $('#cuSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const data = {
      name:  sanitizeInput($('#cuName').value),
      email: sanitizeInput($('#cuEmail').value).toLowerCase(),
      phone: sanitizeInput($('#cuPhone').value),
      role:  $('#cuRole').value,
      send_welcome: $('#cuWelcome').value === 'yes',
    };

    const { valid, errors } = validateForm(data, {
      name:  [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
      email: [Validators.required, Validators.email],
      phone: [Validators.phone],
      role:  [Validators.required, Validators.oneOf(ADMIN_ROLES)],
    });
    if (!valid) {
      applyValidationErrors(errors, { name: 'cuName', email: 'cuEmail', phone: 'cuPhone', role: 'cuRole' });
      return;
    }

    disableModalSubmit();
    const res = await modalApiCreate('/api/admin/users', data, {
      successMessage: null, refresh: true, rerender: true,
    });
    if (res.ok) {
      const temp = res.data?.temp_password;
      closeModal();
      untrackFormChanges();
      if (temp) {
        showToast(`User created. Temp password: ${temp}`, 'success', 8000);
        copyToClipboard(temp, 'Temp password copied');
      } else {
        showToast('User created', 'success');
      }
      trackModalAudit('admin.user.created', { email: data.email, role: data.role });
    } else enableModalSubmit();
  };
}

/* ---------------- Change user role ---------------- */

async function openChangeUserRoleModal(userId) {
  const u = await adminFetchUser(userId);
  if (!u) { showToast('User not found', 'error'); return; }

  openModal({
    title: `Change role · ${esc(u.name || '')}`,
    body: `
      <p class="form-hint">Current role: <strong>${esc(u.role || '')}</strong></p>
      <label class="form-group"><span class="form-label">New role *</span>
        <select id="crRole" class="form-select">
          ${ADMIN_ROLES.map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Reason</span>
        <textarea id="crReason" class="form-textarea" rows="3" maxlength="500" placeholder="Explain the change (audit record)"></textarea></label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="crSave" class="btn btn-primary">Change Role</button>`,
  });
  enhanceModalAccessibility();

  $('#crSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const role = $('#crRole').value;
    const reason = sanitizeInput($('#crReason').value);

    if (role === u.role) { setModalError('Pick a different role.'); return; }
    if (!reason)         { setModalError('Please give a reason for the audit log.'); return; }

    if (role === 'admin') {
      const { confirmed } = await openConfirmModal({
        title: 'Elevate to admin',
        message: `Grant ${u.name} full administrator privileges?`,
        confirmText: 'Grant admin',
        danger: true,
      });
      if (!confirmed) return;
    }

    disableModalSubmit();
    const res = await modalApiUpdate(`/api/admin/users/${userId}/role`, { role, reason }, {
      successMessage: 'Role changed', refresh: true, rerender: true,
    });
    if (res.ok) {
      closeModal();
      trackModalAudit('admin.user.role_changed', { userId, from: u.role, to: role, reason });
    } else enableModalSubmit();
  };
}

/* ---------------- Permissions ---------------- */

async function openUserPermissionsModal(userId) {
  const u = await adminFetchUser(userId);
  if (!u) { showToast('User not found', 'error'); return; }
  const granted = new Set(u.permissions || []);

  openModal({
    title: `Permissions · ${esc(u.name || '')}`,
    className: 'modal-lg',
    body: `
      <p class="form-hint">Admins implicitly have every permission. Explicit permissions apply to non-admin staff.</p>
      ${ADMIN_PERMISSION_CATALOG.map(p => `
        <label class="form-checkbox">
          <input type="checkbox" data-perm="${esc(p.key)}" ${granted.has(p.key) ? 'checked' : ''} />
          <span><code>${esc(p.key)}</code> — ${esc(p.label)}</span>
        </label>`).join('')}`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="upSave" class="btn btn-primary">Save Permissions</button>`,
  });
  enhanceModalAccessibility();

  $('#upSave').onclick = async () => {
    const permissions = Array.from(document.querySelectorAll('[data-perm]:checked')).map(x => x.dataset.perm);
    disableModalSubmit();
    const res = await modalApiUpdate(`/api/admin/users/${userId}/permissions`, { permissions }, {
      successMessage: 'Permissions saved', refresh: true, rerender: true,
    });
    if (res.ok) {
      closeModal();
      trackModalAudit('admin.user.permissions_changed', { userId, permissions });
    } else enableModalSubmit();
  };
}

/* ---------------- Suspend / activate / delete ---------------- */

async function openSuspendUserModal(userId) {
  const u = await adminFetchUser(userId);
  if (!u) return;

  const { confirmed, reason } = await openConfirmModal({
    title: `Suspend ${u.name}`,
    message: 'The user will lose access immediately. They will not be able to log in until reactivated.',
    confirmText: 'Suspend',
    danger: true,
    requireReason: true,
    reasonLabel: 'Reason for suspension',
    minReasonLength: 5,
  });
  if (!confirmed) return;

  const res = await modalApiUpdate(`/api/admin/users/${userId}/suspend`, { reason }, {
    successMessage: 'User suspended', refresh: true, rerender: true,
  });
  if (res.ok) trackModalAudit('admin.user.suspended', { userId, reason });
}

async function openActivateUserModal(userId) {
  const u = await adminFetchUser(userId);
  if (!u) return;
  const { confirmed } = await openConfirmModal({
    title: `Activate ${u.name}`,
    message: 'The user will regain access.',
    confirmText: 'Activate',
  });
  if (!confirmed) return;

  const res = await modalApiUpdate(`/api/admin/users/${userId}/activate`, {}, {
    successMessage: 'User activated', refresh: true, rerender: true,
  });
  if (res.ok) trackModalAudit('admin.user.activated', { userId });
}

async function openDeleteUserModal(userId) {
  const u = await adminFetchUser(userId);
  if (!u) return;

  const { confirmed, reason } = await openConfirmModal({
    title: `Delete ${u.name}`,
    message: 'This action is irreversible. All personal data will be scheduled for deletion per data-retention policy.',
    confirmText: 'Delete permanently',
    danger: true,
    requireReason: true,
    reasonLabel: 'Reason for deletion',
    minReasonLength: 10,
  });
  if (!confirmed) return;

  const res = await modalApiDelete(`/api/admin/users/${userId}`, { reason }, {
    successMessage: 'User deleted', refresh: true, rerender: true,
  });
  if (res.ok) trackModalAudit('admin.user.deleted', { userId, reason, email: u.email });
}

/* ---------------- Reset password ---------------- */

async function openResetUserPasswordModal(userId) {
  const u = await adminFetchUser(userId);
  if (!u) return;

  const { confirmed } = await openConfirmModal({
    title: `Reset password · ${u.name}`,
    message: 'A temporary password will be generated. The user will be required to change it on next login.',
    confirmText: 'Reset password',
    danger: true,
  });
  if (!confirmed) return;

  const res = await modalApiCreate(`/api/admin/users/${userId}/reset-password`, {}, {
    successMessage: null, refresh: false, rerender: false,
  });
  if (res.ok) {
    const temp = res.data?.temp_password;
    if (temp) {
      openModal({
        title: 'Temporary password',
        body: `
          <p class="modal-message">Share this with the user securely. It will not be shown again.</p>
          <div class="temp-password-box">
            <code id="tmpPwd">${esc(temp)}</code>
            <button class="btn btn-sm btn-secondary" id="tmpCopy">Copy</button>
          </div>`,
        footer: `<button class="btn btn-primary" data-close-modal>Done</button>`,
      });
      enhanceModalAccessibility();
      $('#tmpCopy').onclick = () => copyToClipboard(temp, 'Password copied');
    } else {
      showToast('Password reset email sent', 'success');
    }
    trackModalAudit('admin.user.password_reset', { userId });
  }
}

/* ---------------- Activity ---------------- */

async function openUserActivityModal(userId) {
  try {
    showLoading(true);
    const rows = await adminFetchUserActivity(userId, true);
    openModal({
      title: 'User Activity',
      className: 'modal-lg',
      body: rows.length
        ? `<ul class="activity-list">
            ${rows.map(r => `
              <li>
                <span class="activity-time">${esc(mfRelativeTime(r.created_at))}</span>
                <span class="activity-desc">${esc(r.description || r.action || '')}</span>
              </li>`).join('')}
          </ul>`
        : '<p class="empty-row">No activity recorded</p>',
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
    enhanceModalAccessibility();
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

/* ---------------- Audit ---------------- */

async function openUserAuditLogModal(userId) {
  try {
    showLoading(true);
    const entries = await adminFetchUserAudit(userId, true);
    openModal({
      title: 'User Audit Log',
      className: 'modal-lg',
      body: entries.length
        ? `<table class="data-table">
            <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
              ${entries.map(e => `
                <tr>
                  <td>${esc(mfFormatDate(e.created_at, true))}</td>
                  <td>${esc(e.actor_name || e.actor_email || '—')}</td>
                  <td><code>${esc(e.action || '')}</code></td>
                  <td>${esc(e.details || '')}</td>
                </tr>`).join('')}
            </tbody>
          </table>`
        : '<p class="empty-row">No audit entries</p>',
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-info" id="uaExport"><i class="fas fa-download"></i> Export JSON</button>`,
    });
    enhanceModalAccessibility();

    $('#uaExport').onclick = () => {
      downloadJson(`audit-user-${userId}-${Date.now()}.json`, entries);
    };
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

/* ==================================================================
 * 6. EXPERTS
 * ================================================================== */

/* ---------------- Create expert (legacy entry point) ---------------- */

async function submitCreateExpert() {
  const name = sanitizeInput($('#newExpertName').value);
  const email = sanitizeInput($('#newExpertEmail').value).toLowerCase();
  const spec = sanitizeInput($('#newExpertSpec').value);
  const rate = Number($('#newExpertRate').value || 0);
  const bio = sanitizeMultiline($('#newExpertBio').value);
  const phone = sanitizeInput($('#newExpertPhone').value);

  const { valid, errors } = validateForm({ name, email, spec, rate, phone }, {
    name:  [Validators.required, Validators.minLength(2)],
    email: [Validators.required, Validators.email],
    rate:  [Validators.min(0)],
    phone: [Validators.phone],
  });
  if (!valid) { showToast(Object.values(errors)[0], 'error'); return; }

  showLoading(true);
  const res = await modalApiCreate('/api/admin/experts/create', {
    name, email, specialization: spec, hourly_rate: rate, bio, phone,
  }, { refresh: true, rerender: true, successMessage: null });
  showLoading(false);

  if (res.ok) {
    const temp = res.data?.temp_password;
    showToast(temp ? `Expert created. Temp password: ${temp}` : 'Expert created', 'success', 8000);
    trackModalAudit('admin.expert.created', { email });
  }
}

/* ---------------- Approve / reject ---------------- */

async function openApproveExpertModal(expertId) {
  const e = S.experts?.find(x => String(x.id) === String(expertId));
  if (!e) { showToast('Expert not found', 'error'); return; }

  const { confirmed } = await openConfirmModal({
    title: `Approve ${e.name}`,
    message: 'Approving will make the expert visible in the directory and able to accept bookings.',
    confirmText: 'Approve',
  });
  if (!confirmed) return;

  const res = await modalApiUpdate(`/api/admin/experts/${expertId}/approve`, {}, {
    successMessage: 'Expert approved', refresh: true, rerender: true,
  });
  if (res.ok) trackModalAudit('admin.expert.approved', { expertId });
}

async function openRejectExpertModal(expertId) {
  const e = S.experts?.find(x => String(x.id) === String(expertId));
  if (!e) return;

  openModal({
    title: `Reject ${esc(e.name)}`,
    body: `
      <label class="form-group"><span class="form-label">Reason *</span>
        <select id="rjReason" class="form-select">
          ${ADMIN_EXPERT_DECISION_REASONS.map(r => `<option>${esc(r)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Notes to expert</span>
        <textarea id="rjNotes" class="form-textarea" rows="3" maxlength="500"></textarea></label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="rjSave" class="btn btn-danger">Reject</button>`,
  });
  enhanceModalAccessibility();

  $('#rjSave').onclick = async () => {
    const reason = $('#rjReason').value;
    const notes  = sanitizeInput($('#rjNotes').value);
    disableModalSubmit();
    const res = await modalApiUpdate(`/api/admin/experts/${expertId}/reject`, { reason, notes }, {
      successMessage: 'Expert rejected', refresh: true, rerender: true,
    });
    if (res.ok) {
      closeModal();
      trackModalAudit('admin.expert.rejected', { expertId, reason });
    } else enableModalSubmit();
  };
}

async function openSuspendExpertModal(expertId) {
  const e = S.experts?.find(x => String(x.id) === String(expertId));
  if (!e) return;
  const { confirmed, reason } = await openConfirmModal({
    title: `Suspend ${e.name}`,
    message: 'The expert will not be able to accept new bookings.',
    confirmText: 'Suspend',
    danger: true,
    requireReason: true,
    reasonLabel: 'Reason',
  });
  if (!confirmed) return;

  const res = await modalApiUpdate(`/api/admin/experts/${expertId}/suspend`, { reason }, {
    successMessage: 'Expert suspended', refresh: true, rerender: true,
  });
  if (res.ok) trackModalAudit('admin.expert.suspended', { expertId, reason });
}

/* ---------------- Verification ---------------- */

async function openExpertVerificationModal(expertId) {
  try {
    showLoading(true);
    const docs = await adminFetchExpertDocs(expertId, true);
    openModal({
      title: 'Verification Documents',
      className: 'modal-lg',
      body: docs.length
        ? docs.map(d => `
          <div class="qa-item">
            <p class="qa-q"><i class="fas fa-file"></i> ${esc(d.title || d.type || 'Document')}</p>
            <p class="qa-a">${esc(d.issuer || '')} · ${esc(mfFormatDate(d.uploaded_at))}</p>
            ${d.url ? `<a class="btn btn-sm btn-secondary" target="_blank" rel="noopener" href="${esc(d.url)}">
              <i class="fas fa-external-link-alt"></i> Open</a>` : ''}
          </div>`).join('')
        : '<p class="empty-row">No documents uploaded</p>',
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-danger" id="evReject"><i class="fas fa-times"></i> Reject</button>
        <button class="btn btn-primary" id="evApprove"><i class="fas fa-check"></i> Approve</button>`,
    });
    enhanceModalAccessibility();

    $('#evApprove').onclick = () => { closeModal(); openApproveExpertModal(expertId); };
    $('#evReject').onclick  = () => { closeModal(); openRejectExpertModal(expertId); };
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

/* Alias used elsewhere */
function openExpertDocumentsModal(expertId) { return openExpertVerificationModal(expertId); }

/* ---------------- Commission ---------------- */

async function openExpertCommissionModal(expertId) {
  const e = S.experts?.find(x => String(x.id) === String(expertId)) || {};
  openModal({
    title: `Commission · ${esc(e.name || 'Expert')}`,
    body: `
      <label class="form-group"><span class="form-label">Commission percent *</span>
        <input id="ecPercent" type="number" min="0" max="100" step="0.1" class="form-input"
               value="${e.commission_percent ?? 15}" /></label>
      <p class="form-hint">Percentage retained by ExpertHub from each transaction.</p>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="ecSave" class="btn btn-primary">Save</button>`,
  });
  enhanceModalAccessibility();

  $('#ecSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const percent = Number($('#ecPercent').value);
    const { valid, errors } = validateForm({ percent }, {
      percent: [Validators.required, Validators.min(0), Validators.max(100)],
    });
    if (!valid) { applyValidationErrors(errors, { percent: 'ecPercent' }); return; }

    disableModalSubmit();
    const res = await modalApiUpdate(`/api/admin/experts/${expertId}/commission`, { percent }, {
      successMessage: 'Commission updated', refresh: true, rerender: true,
    });
    if (res.ok) { closeModal(); trackModalAudit('admin.expert.commission', { expertId, percent }); }
    else enableModalSubmit();
  };
}

/* ==================================================================
 * 7. INSTITUTIONS
 * ================================================================== */

async function openViewInstitutionModal(instId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/admin/institutions/${instId}`).catch(() => null);
    const inst = d || S.institutions?.find(x => String(x.id) === String(instId));
    if (!inst) { showToast('Institution not found', 'error'); return; }

    openModal({
      title: inst.name || 'Institution',
      className: 'modal-lg',
      body: `
        <div class="expert-profile-stats">
          <div><strong>${esc(inst.status || '—')}</strong><span>Status</span></div>
          <div><strong>${esc(inst.plan || '—')}</strong><span>Plan</span></div>
          <div><strong>${inst.students_count || 0}</strong><span>Students</span></div>
          <div><strong>${inst.programmes_count || 0}</strong><span>Programmes</span></div>
        </div>
        ${inst.description ? `<p class="expert-profile-bio">${esc(inst.description)}</p>` : ''}
        <p class="form-hint">${esc(inst.contact_email || '')} · ${esc(inst.contact_phone || '')}</p>`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-info" data-action="assign-ops" data-id="${inst.id}">
          <i class="fas fa-user-tie"></i> Ops Manager</button>
        <button class="btn btn-primary" data-action="edit-institution" data-id="${inst.id}">
          <i class="fas fa-edit"></i> Edit</button>`,
    });
    enhanceModalAccessibility();
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

async function openSuspendInstitutionModal(instId) {
  const inst = S.institutions?.find(x => String(x.id) === String(instId));
  if (!inst) return;
  const { confirmed, reason } = await openConfirmModal({
    title: `Suspend ${inst.name}`,
    message: 'Suspending hides all programmes from learners.',
    confirmText: 'Suspend',
    danger: true,
    requireReason: true,
    reasonLabel: 'Reason',
  });
  if (!confirmed) return;

  const res = await modalApiUpdate(`/api/admin/institutions/${instId}/suspend`, { reason }, {
    successMessage: 'Institution suspended', refresh: true, rerender: true,
  });
  if (res.ok) trackModalAudit('admin.institution.suspended', { instId, reason });
}

/* ---------------- Assign ops manager (backward-compatible) ---------------- */

function openAssignOpsModal(instId) {
  openModal({
    title: 'Assign Operations Manager',
    body: `
      <label class="form-group"><span class="form-label">Manager name *</span>
        <input id="omName" class="form-input" data-autofocus maxlength="120" /></label>
      <label class="form-group"><span class="form-label">Manager email *</span>
        <input id="omEmail" type="email" class="form-input" maxlength="160" /></label>
      <label class="form-group"><span class="form-label">Phone</span>
        <input id="omPhone" class="form-input" maxlength="30" /></label>
      <p class="form-hint">A temporary password will be generated and shown once.</p>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="omSave" class="btn btn-primary">Assign</button>`,
  });
  enhanceModalAccessibility();

  $('#omSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const data = {
      name:  sanitizeInput($('#omName').value),
      email: sanitizeInput($('#omEmail').value).toLowerCase(),
      phone: sanitizeInput($('#omPhone').value),
    };
    const { valid, errors } = validateForm(data, {
      name:  [Validators.required, Validators.minLength(2)],
      email: [Validators.required, Validators.email],
      phone: [Validators.phone],
    });
    if (!valid) {
      applyValidationErrors(errors, { name: 'omName', email: 'omEmail', phone: 'omPhone' });
      return;
    }

    disableModalSubmit();
    const res = await modalApiCreate(`/api/admin/institutions/${instId}/ops-manager`, data, {
      successMessage: null, refresh: true, rerender: true,
    });
    if (res.ok) {
      const temp = res.data?.temp_password;
      closeModal();
      if (temp) {
        showToast(`Ops manager created. Temp password: ${temp}`, 'success', 8000);
        copyToClipboard(temp, 'Temp password copied');
      } else showToast('Ops manager created', 'success');
      trackModalAudit('admin.institution.ops_manager', { instId, email: data.email });
    } else enableModalSubmit();
  };
}

/* ==================================================================
 * 8. CONSULTATIONS
 * ================================================================== */

/* Legacy display-only modal */
function showConsultationModal(id) {
  const c = S.consultations?.find(x => String(x.id) === id);
  if (!c) { showToast('Consultation not found', 'error'); return; }
  openModal({
    title: c.title || 'Consultation',
    body: `
      <p><strong>Client:</strong> ${esc(c.client_name || '-')}</p>
      <p><strong>Expert:</strong> ${esc(c.expert_name || 'Unassigned')}</p>
      <p><strong>Status:</strong>
        <span class="${consultationStatusClass(c.status)}">${esc(c.status)}</span></p>
      <p><strong>Type:</strong> ${esc(c.consultation_type || '')}</p>
      <p><strong>Description:</strong> ${esc(c.description || '')}</p>
      <p><strong>Created:</strong> ${fmtDT(c.created_at)}</p>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      <button class="btn btn-info" data-action="assign-expert" data-id="${c.id}">
        <i class="fas fa-user-plus"></i> Assign Expert</button>`,
  });
  enhanceModalAccessibility();
}

/* ---------------- Assign expert (backward-compatible) ---------------- */

function openAssignExpertModal(consultationId) {
  const opts = (S.experts || []).map(e =>
    `<option value="${e.id}">${esc(e.name)} (${esc(e.specialization || '')})</option>`
  ).join('');

  openModal({
    title: 'Assign Expert',
    body: `
      <label class="form-group"><span class="form-label">Expert *</span>
        <select id="assignExp" class="form-select" data-autofocus>${opts}</select></label>
      <label class="form-group"><span class="form-label">Note to expert</span>
        <textarea id="assignNote" class="form-textarea" rows="3" maxlength="400"></textarea></label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="assignSave" class="btn btn-primary">Assign</button>`,
  });
  enhanceModalAccessibility();

  $('#assignSave').onclick = async () => {
    const expertId = Number($('#assignExp').value);
    const note = sanitizeInput($('#assignNote').value);
    if (!expertId) { setModalError('Please choose an expert.'); return; }

    disableModalSubmit();
    const res = await modalApiUpdate(`/api/common/consultations/${consultationId}/assign`, {
      expert_id: expertId, note,
    }, { successMessage: 'Expert assigned', refresh: true, rerender: true });
    if (res.ok) {
      closeModal();
      if (typeof reloadConsultations === 'function') await reloadConsultations();
      trackModalAudit('admin.consultation.assigned', { consultationId, expertId });
    } else enableModalSubmit();
  };
}

async function openReassignExpertModal(consultationId) {
  const c = S.consultations?.find(x => String(x.id) === String(consultationId));
  if (!c) return;
  const { confirmed } = await openConfirmModal({
    title: 'Reassign consultation',
    message: `Currently assigned to ${c.expert_name || 'unassigned'}. Continue to pick a new expert?`,
    confirmText: 'Continue',
  });
  if (!confirmed) return;
  openAssignExpertModal(consultationId);
}

async function openCancelConsultationModal(consultationId) {
  const { confirmed, reason } = await openConfirmModal({
    title: 'Cancel consultation',
    message: 'Both parties will be notified.',
    confirmText: 'Cancel consultation',
    danger: true,
    requireReason: true,
    reasonLabel: 'Reason',
  });
  if (!confirmed) return;
  const res = await modalApiUpdate(`/api/admin/consultations/${consultationId}/cancel`, { reason }, {
    successMessage: 'Consultation cancelled', refresh: true, rerender: true,
  });
  if (res.ok) trackModalAudit('admin.consultation.cancelled', { consultationId, reason });
}

async function openRefundConsultationModal(consultationId) {
  openModal({
    title: 'Issue Refund',
    body: `
      <label class="form-group"><span class="form-label">Amount ($) *</span>
        <input id="rfAmount" type="number" min="0.01" step="0.01" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Reason *</span>
        <textarea id="rfReason" class="form-textarea" rows="3" maxlength="500"></textarea></label>
      <label class="form-group form-checkbox">
        <input id="rfConfirm" type="checkbox" />
        <span>I confirm this refund will be processed to the original payment method.</span>
      </label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="rfSave" class="btn btn-danger">Refund</button>`,
  });
  enhanceModalAccessibility();

  $('#rfSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const data = {
      amount: Number($('#rfAmount').value || 0),
      reason: sanitizeInput($('#rfReason').value),
    };
    const { valid, errors } = validateForm(data, {
      amount: [Validators.required, Validators.min(0.01)],
      reason: [Validators.required, Validators.minLength(5)],
    });
    if (!valid) {
      applyValidationErrors(errors, { amount: 'rfAmount', reason: 'rfReason' });
      return;
    }
    if (!$('#rfConfirm').checked) { setModalError('Please confirm the refund.'); return; }

    disableModalSubmit();
    const res = await modalApiCreate(`/api/admin/consultations/${consultationId}/refund`, data, {
      successMessage: 'Refund issued', refresh: true, rerender: true,
    });
    if (res.ok) {
      closeModal();
      trackModalAudit('admin.consultation.refunded', { consultationId, ...data });
    } else enableModalSubmit();
  };
}

/* ==================================================================
 * 9. COUPONS
 * ================================================================== */

function openCreateCouponModal(couponId = null) {
  const c = couponId ? (S.coupons?.find(x => String(x.id) === String(couponId)) || {}) : {};
  const isEdit = !!couponId;

  openModal({
    title: isEdit ? 'Edit Coupon' : 'New Coupon',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Code *</span>
        <input id="cpCode" class="form-input" data-autofocus maxlength="20"
               style="text-transform:uppercase" value="${esc(c.code || '')}" placeholder="WELCOME10" /></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Type *</span>
          <select id="cpType" class="form-select">
            ${ADMIN_COUPON_TYPES.map(t =>
              `<option value="${t}" ${c.discount_type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Value *</span>
          <input id="cpValue" type="number" min="0" step="0.01" class="form-input"
                 value="${c.discount_value || ''}" /></label>
      </div>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Max uses</span>
          <input id="cpMax" type="number" min="1" class="form-input" value="${c.max_uses || ''}" /></label>
        <label class="form-group"><span class="form-label">Min spend ($)</span>
          <input id="cpMin" type="number" min="0" step="0.01" class="form-input"
                 value="${c.min_spend || 0}" /></label>
      </div>
      <label class="form-group"><span class="form-label">Applies to</span>
        <select id="cpApply" class="form-select">
          ${ADMIN_COUPON_SCOPES.map(s =>
            `<option value="${s}" ${c.applies_to === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
        </select></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Valid from</span>
          <input id="cpFrom" type="date" class="form-input" value="${c.valid_from || ''}" /></label>
        <label class="form-group"><span class="form-label">Valid until</span>
          <input id="cpUntil" type="date" class="form-input" value="${c.valid_until || ''}" /></label>
      </div>
      <label class="form-group form-checkbox">
        <input id="cpActive" type="checkbox" ${c.active !== false ? 'checked' : ''} />
        <span>Active</span>
      </label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="cpSave" class="btn btn-primary">${isEdit ? 'Save' : 'Create'}</button>`,
  });

  enhanceModalAccessibility();
  trackFormChanges();

  $('#cpSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const type = $('#cpType').value;
    const data = {
      code:           sanitizeInput($('#cpCode').value).toUpperCase(),
      discount_type:  type,
      discount_value: Number($('#cpValue').value || 0),
      max_uses:       $('#cpMax').value ? Number($('#cpMax').value) : null,
      min_spend:      Number($('#cpMin').value || 0),
      applies_to:     $('#cpApply').value,
      valid_from:     $('#cpFrom').value || null,
      valid_until:    $('#cpUntil').value || null,
      active:         $('#cpActive').checked,
    };

    const { valid, errors } = validateForm(data, {
      code:           [Validators.required, Validators.minLength(3), Validators.maxLength(20)],
      discount_type:  [Validators.required, Validators.oneOf(ADMIN_COUPON_TYPES)],
      discount_value: [Validators.required, Validators.min(0)],
      min_spend:      [Validators.min(0)],
      max_uses:       [Validators.min(1)],
      applies_to:     [Validators.oneOf(ADMIN_COUPON_SCOPES)],
      valid_from:     [Validators.date],
      valid_until:    [Validators.date],
    });
    if (!valid) {
      applyValidationErrors(errors, {
        code: 'cpCode', discount_type: 'cpType', discount_value: 'cpValue',
        max_uses: 'cpMax', min_spend: 'cpMin', applies_to: 'cpApply',
        valid_from: 'cpFrom', valid_until: 'cpUntil',
      });
      return;
    }
    if (type === 'percent' && data.discount_value > 100) {
      setFieldError('cpValue', 'Percent cannot exceed 100'); return;
    }
    if (data.valid_from && data.valid_until &&
        new Date(data.valid_until) <= new Date(data.valid_from)) {
      setFieldError('cpUntil', 'Must be after "valid from"'); return;
    }

    disableModalSubmit();
    const url = isEdit ? `/api/admin/coupons/${couponId}` : '/api/admin/coupons';
    const res = await modalApiRequest(isEdit ? 'PUT' : 'POST', url, data, {
      successMessage: isEdit ? 'Coupon updated' : 'Coupon created',
      refresh: true, rerender: true,
    });
    if (res.ok) {
      closeModal();
      untrackFormChanges();
      trackModalAudit(isEdit ? 'admin.coupon.updated' : 'admin.coupon.created', { code: data.code });
    } else enableModalSubmit();
  };
}

async function openDeactivateCouponModal(couponId) {
  const { confirmed } = await openConfirmModal({
    title: 'Deactivate coupon',
    message: 'New redemptions will be blocked, existing ones remain valid.',
    confirmText: 'Deactivate',
    danger: true,
  });
  if (!confirmed) return;
  const res = await modalApiUpdate(`/api/admin/coupons/${couponId}/deactivate`, {}, {
    successMessage: 'Coupon deactivated', refresh: true, rerender: true,
  });
  if (res.ok) trackModalAudit('admin.coupon.deactivated', { couponId });
}

async function openDeleteCouponModal(couponId) {
  const { confirmed, reason } = await openConfirmModal({
    title: 'Delete coupon',
    message: 'This cannot be undone.',
    confirmText: 'Delete',
    danger: true,
    requireReason: true,
    reasonLabel: 'Reason',
  });
  if (!confirmed) return;
  const res = await modalApiDelete(`/api/admin/coupons/${couponId}`, { reason }, {
    successMessage: 'Coupon deleted', refresh: true, rerender: true,
  });
  if (res.ok) trackModalAudit('admin.coupon.deleted', { couponId, reason });
}

async function openCouponStatsModal(couponId) {
  try {
    showLoading(true);
    const s = await adminFetchCouponStats(couponId, true);
    openModal({
      title: 'Coupon Performance',
      className: 'modal-lg',
      body: `
        <div class="expert-profile-stats">
          <div><strong>${s.redemptions || 0}</strong><span>Redemptions</span></div>
          <div><strong>${s.unique_users || 0}</strong><span>Unique users</span></div>
          <div><strong>${mfFormatMoney(s.discount_given || 0)}</strong><span>Discount given</span></div>
          <div><strong>${mfFormatMoney(s.revenue || 0)}</strong><span>Revenue</span></div>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
    enhanceModalAccessibility();
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

/* ==================================================================
 * 10. BROADCASTS
 * ================================================================== */

function openBroadcastModal() {
  openModal({
    title: 'Send Broadcast',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Title *</span>
        <input id="broadcastTitle" class="form-input" data-autofocus maxlength="120" /></label>
      <label class="form-group"><span class="form-label">Message *</span>
        <textarea id="broadcastMessage" class="form-textarea" rows="5" maxlength="800"></textarea></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Audience *</span>
          <select id="broadcastAudience" class="form-select">
            ${ADMIN_BROADCAST_AUDIENCES.map(a => `<option value="${a}">${esc(a)}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Channel</span>
          <select id="broadcastChannel" class="form-select">
            <option value="in_app">In-app only</option>
            <option value="in_app_email">In-app + email</option>
          </select></label>
      </div>
      <label class="form-group"><span class="form-label">Schedule (optional)</span>
        <input id="broadcastWhen" type="datetime-local" class="form-input" /></label>
      <label class="form-group form-checkbox">
        <input id="broadcastConfirm" type="checkbox" />
        <span>I understand this will be delivered to real users.</span>
      </label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="broadcastPreview" class="btn btn-info">Preview</button>
      <button id="broadcastSave" class="btn btn-primary">Send</button>`,
  });

  enhanceModalAccessibility();
  trackFormChanges();

  $('#broadcastPreview').onclick = () => {
    const title = sanitizeInput($('#broadcastTitle').value);
    const message = sanitizeInput($('#broadcastMessage').value);
    if (!title || !message) { showToast('Fill title and message first', 'error'); return; }
    openModal({
      title: 'Preview',
      body: `
        <div class="notification-preview">
          <h3>${esc(title)}</h3>
          <p>${esc(message)}</p>
        </div>`,
      footer: `<button class="btn btn-primary" data-close-modal>Back</button>`,
    });
    enhanceModalAccessibility();
  };

  $('#broadcastSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const data = {
      title:    sanitizeInput($('#broadcastTitle').value),
      message:  sanitizeMultiline($('#broadcastMessage').value),
      audience: $('#broadcastAudience').value,
      channel:  $('#broadcastChannel').value,
      when:     $('#broadcastWhen').value || null,
    };
    const { valid, errors } = validateForm(data, {
      title:    [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
      message:  [Validators.required, Validators.minLength(5), Validators.maxLength(800)],
      audience: [Validators.required, Validators.oneOf(ADMIN_BROADCAST_AUDIENCES)],
      when:     [Validators.futureDate],
    });
    if (!valid) {
      applyValidationErrors(errors, {
        title: 'broadcastTitle', message: 'broadcastMessage', audience: 'broadcastAudience', when: 'broadcastWhen',
      });
      return;
    }
    if (!$('#broadcastConfirm').checked) { setModalError('Please confirm before sending.'); return; }

    disableModalSubmit();
    const res = await modalApiCreate('/api/admin/notifications/broadcast', data, {
      successMessage: null, refresh: true, rerender: true,
    });
    if (res.ok) {
      closeModal();
      untrackFormChanges();
      const sent = res.data?.sent;
      showToast(sent != null ? `Broadcast sent to ${sent} users` : 'Broadcast queued', 'success');
      trackModalAudit('admin.broadcast.sent', { audience: data.audience, channel: data.channel });
    } else enableModalSubmit();
  };
}

/* Legacy entry point */
async function sendBroadcast() {
  const title = sanitizeInput($('#broadcastTitle').value);
  const message = sanitizeInput($('#broadcastMessage').value);
  const audience = $('#broadcastAudience').value;
  if (!title || !message) { showToast('Fill title and message', 'error'); return; }
  showLoading(true);
  const res = await modalApiCreate('/api/admin/notifications/broadcast', { title, message, audience }, {
    successMessage: null, refresh: false, rerender: false,
  });
  showLoading(false);
  if (res.ok) showToast(`Broadcast sent to ${res.data?.sent || 0} users`, 'success');
}

/* ==================================================================
 * 11. EVENTS
 * ================================================================== */

function openEventModal(id = null) {
  const ev = id ? (S.events?.find(x => String(x.id) === String(id)) || {}) : {};
  const expertOpts = (S.experts || []).map(e =>
    `<option value="${e.id}" ${String(ev.expert_id) === String(e.id) ? 'selected' : ''}>${esc(e.name)}</option>`
  ).join('');

  openModal({
    title: id ? 'Edit Event' : 'New Event',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Title *</span>
        <input id="evTitle" class="form-input" data-autofocus maxlength="160"
               value="${esc(ev.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Description *</span>
        <textarea id="evDesc" class="form-textarea" rows="4" maxlength="2000">${esc(ev.description || '')}</textarea></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Category</span>
          <input id="evCat" class="form-input" maxlength="60" value="${esc(ev.category || 'General')}" /></label>
        <label class="form-group"><span class="form-label">Expert</span>
          <select id="evExpert" class="form-select">
            <option value="">None</option>${expertOpts}
          </select></label>
      </div>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Start *</span>
          <input id="evStart" type="datetime-local" class="form-input"
                 value="${ev.start_at ? new Date(ev.start_at).toISOString().slice(0,16) : ''}" /></label>
        <label class="form-group"><span class="form-label">End</span>
          <input id="evEnd" type="datetime-local" class="form-input"
                 value="${ev.end_at ? new Date(ev.end_at).toISOString().slice(0,16) : ''}" /></label>
      </div>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Capacity *</span>
          <input id="evCap" type="number" min="1" class="form-input" value="${ev.capacity || 100}" /></label>
        <label class="form-group"><span class="form-label">Price ($) *</span>
          <input id="evPrice" type="number" min="0" step="0.01" class="form-input" value="${ev.price || 0}" /></label>
        <label class="form-group"><span class="form-label">Expert payment ($)</span>
          <input id="evPay" type="number" min="0" step="0.01" class="form-input" value="${ev.expert_payment || 0}" /></label>
      </div>
      <label class="form-group form-checkbox">
        <input id="evPublished" type="checkbox" ${ev.published !== false ? 'checked' : ''} />
        <span>Publish immediately</span>
      </label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="evSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });

  enhanceModalAccessibility();
  trackFormChanges();

  $('#evSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const data = {
      title:          sanitizeInput($('#evTitle').value),
      description:    sanitizeMultiline($('#evDesc').value),
      category:       sanitizeInput($('#evCat').value),
      expert_id:      $('#evExpert').value ? Number($('#evExpert').value) : null,
      start_at:       $('#evStart').value || null,
      end_at:         $('#evEnd').value || null,
      capacity:       Number($('#evCap').value || 0),
      price:          Number($('#evPrice').value || 0),
      expert_payment: Number($('#evPay').value || 0),
      published:      $('#evPublished').checked,
    };

    const { valid, errors } = validateForm(data, {
      title:     [Validators.required, Validators.minLength(3), Validators.maxLength(160)],
      description:[Validators.required, Validators.minLength(10), Validators.maxLength(2000)],
      start_at:  [Validators.required, Validators.futureDate],
      end_at:    [Validators.date],
      capacity:  [Validators.required, Validators.integer, Validators.min(1), Validators.max(100000)],
      price:     [Validators.required, Validators.min(0)],
      expert_payment: [Validators.min(0)],
    });
    if (!valid) {
      applyValidationErrors(errors, {
        title: 'evTitle', description: 'evDesc', start_at: 'evStart',
        end_at: 'evEnd', capacity: 'evCap', price: 'evPrice', expert_payment: 'evPay',
      });
      return;
    }
    if (data.end_at && data.start_at && new Date(data.end_at) <= new Date(data.start_at)) {
      setFieldError('evEnd', 'End must be after start'); return;
    }
    if (data.expert_payment > data.price * data.capacity) {
      setFieldError('evPay', 'Expert payment exceeds max revenue'); return;
    }

    disableModalSubmit();
    const url = id ? `/api/admin/events/${id}` : '/api/admin/events';
    const res = await modalApiRequest(id ? 'PUT' : 'POST', url, data, {
      successMessage: id ? 'Event updated' : 'Event created',
      refresh: true, rerender: true,
    });
    if (res.ok) {
      closeModal();
      untrackFormChanges();
      trackModalAudit(id ? 'admin.event.updated' : 'admin.event.created', { eventId: id, title: data.title });
    } else enableModalSubmit();
  };
}

async function openDeleteEventModal(eventId) {
  const ev = S.events?.find(x => String(x.id) === String(eventId));
  const { confirmed, reason } = await openConfirmModal({
    title: 'Delete event',
    message: ev ? `Delete "${ev.title}"? Registered attendees will be notified.` : 'Delete this event?',
    confirmText: 'Delete',
    danger: true,
    requireReason: true,
    reasonLabel: 'Reason',
  });
  if (!confirmed) return;
  const res = await modalApiDelete(`/api/admin/events/${eventId}`, { reason }, {
    successMessage: 'Event deleted', refresh: true, rerender: true,
  });
  if (res.ok) trackModalAudit('admin.event.deleted', { eventId, reason });
}

async function openEventRegistrationsModal(eventId) {
  try {
    showLoading(true);
    const rows = await adminFetchEventRegistrations(eventId, true);
    openModal({
      title: 'Event Registrations',
      className: 'modal-lg',
      body: rows.length
        ? `<table class="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Registered</th><th>Paid</th><th>Attended</th></tr></thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td>${esc(r.name || '')}</td>
                  <td>${esc(r.email || '')}</td>
                  <td>${esc(mfFormatDate(r.created_at, true))}</td>
                  <td>${r.paid ? '✔' : '—'}</td>
                  <td>${r.attended ? '✔' : '—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>`
        : '<p class="empty-row">No registrations yet</p>',
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-info" id="evRegExport"><i class="fas fa-download"></i> Export CSV</button>`,
    });
    enhanceModalAccessibility();

    $('#evRegExport').onclick = () => {
      const header = ['Name', 'Email', 'Registered', 'Paid', 'Attended'];
      const body = rows.map(r => [r.name || '', r.email || '', r.created_at || '', r.paid ? 'yes' : 'no', r.attended ? 'yes' : 'no']);
      const csv = [header, ...body].map(row => row.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
      downloadTextFile(`event-${eventId}-registrations.csv`, csv, 'text/csv');
    };
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

async function openEventAttendanceModal(eventId) {
  try {
    showLoading(true);
    const rows = await adminFetchEventRegistrations(eventId, true);
    openModal({
      title: 'Mark Attendance',
      className: 'modal-lg',
      body: rows.length
        ? rows.map(r => `
          <label class="form-checkbox">
            <input type="checkbox" data-attend="${r.id}" ${r.attended ? 'checked' : ''} />
            <span>${esc(r.name || '')} · <small>${esc(r.email || '')}</small></span>
          </label>`).join('')
        : '<p class="empty-row">No registrations</p>',
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button id="attSave" class="btn btn-primary">Save Attendance</button>`,
    });
    enhanceModalAccessibility();

    $('#attSave').onclick = async () => {
      const attendance = Array.from(document.querySelectorAll('[data-attend]')).map(el => ({
        registration_id: Number(el.dataset.attend),
        attended: el.checked,
      }));
      disableModalSubmit();
      const res = await modalApiUpdate(`/api/admin/events/${eventId}/attendance`, { attendance }, {
        successMessage: 'Attendance saved', refresh: true, rerender: true,
      });
      if (res.ok) { closeModal(); clearAdminCache(); } else enableModalSubmit();
    };
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

async function openEventRevenueModal(eventId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/admin/events/${eventId}/revenue`).catch(() => ({}));
    openModal({
      title: 'Event Revenue',
      body: `
        <div class="expert-profile-stats">
          <div><strong>${mfFormatMoney(d.gross || 0)}</strong><span>Gross</span></div>
          <div><strong>${mfFormatMoney(d.expert_pay || 0)}</strong><span>Expert pay</span></div>
          <div><strong>${mfFormatMoney(d.platform_fee || 0)}</strong><span>Platform fee</span></div>
          <div><strong>${d.registrations || 0}</strong><span>Registrations</span></div>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
    enhanceModalAccessibility();
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

/* ==================================================================
 * 12. SETTINGS
 * ================================================================== */

function openAdminSettingsModal() {
  const s = S.adminSettings || {};
  openModal({
    title: 'Platform Settings',
    className: 'modal-lg',
    body: `
      <h3 class="panel-title">General</h3>
      <label class="form-group"><span class="form-label">Platform name</span>
        <input id="setPlatformName" class="form-input" value="${esc(s.platform_name || '')}" /></label>
      <label class="form-group"><span class="form-label">Support email</span>
        <input id="setSupportEmail" type="email" class="form-input" value="${esc(s.support_email || '')}" /></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Default currency</span>
          <input id="setCurrency" class="form-input" maxlength="3" value="${esc(s.default_currency || 'USD')}" /></label>
        <label class="form-group"><span class="form-label">Default timezone</span>
          <input id="setTimezone" class="form-input" value="${esc(s.default_timezone || 'UTC')}" /></label>
      </div>

      <h3 class="panel-title">Commission</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Consultation (%)</span>
          <input id="setCommCons" type="number" min="0" max="100" step="0.1" class="form-input"
                 value="${s.commission_consultation ?? 15}" /></label>
        <label class="form-group"><span class="form-label">Course (%)</span>
          <input id="setCommCourse" type="number" min="0" max="100" step="0.1" class="form-input"
                 value="${s.commission_course ?? 20}" /></label>
      </div>

      <h3 class="panel-title">Withdrawals</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Hold days</span>
          <input id="setHold" type="number" min="0" max="90" class="form-input" value="${s.withdrawal_hold_days ?? 7}" /></label>
        <label class="form-group"><span class="form-label">Min payout ($)</span>
          <input id="setMinPayout" type="number" min="0" step="0.01" class="form-input" value="${s.min_payout ?? 10}" /></label>
      </div>

      <h3 class="panel-title">Maintenance</h3>
      <label class="form-group form-checkbox">
        <input id="setMaintenance" type="checkbox" ${s.maintenance_mode ? 'checked' : ''} />
        <span>Enable maintenance mode (blocks non-admin logins)</span>
      </label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="setSave" class="btn btn-primary">Save Settings</button>`,
  });

  enhanceModalAccessibility();
  trackFormChanges();

  $('#setSave').onclick = async () => {
    clearFormErrors(); clearModalError();
    const settings = {
      platform_name:           sanitizeInput($('#setPlatformName').value),
      support_email:           sanitizeInput($('#setSupportEmail').value).toLowerCase(),
      default_currency:        sanitizeInput($('#setCurrency').value).toUpperCase(),
      default_timezone:        sanitizeInput($('#setTimezone').value),
      commission_consultation: Number($('#setCommCons').value || 0),
      commission_course:       Number($('#setCommCourse').value || 0),
      withdrawal_hold_days:    Number($('#setHold').value || 0),
      min_payout:              Number($('#setMinPayout').value || 0),
      maintenance_mode:        $('#setMaintenance').checked,
    };

    const { valid, errors } = validateForm(settings, {
      platform_name:           [Validators.required, Validators.maxLength(80)],
      support_email:           [Validators.required, Validators.email],
      default_currency:        [Validators.required, Validators.minLength(3), Validators.maxLength(3)],
      default_timezone:        [Validators.required],
      commission_consultation: [Validators.min(0), Validators.max(100)],
      commission_course:       [Validators.min(0), Validators.max(100)],
      withdrawal_hold_days:    [Validators.min(0), Validators.max(90)],
      min_payout:              [Validators.min(0)],
    });
    if (!valid) {
      applyValidationErrors(errors, {
        platform_name: 'setPlatformName', support_email: 'setSupportEmail',
        default_currency: 'setCurrency', default_timezone: 'setTimezone',
        commission_consultation: 'setCommCons', commission_course: 'setCommCourse',
        withdrawal_hold_days: 'setHold', min_payout: 'setMinPayout',
      });
      return;
    }

    if (settings.maintenance_mode && !(S.adminSettings?.maintenance_mode)) {
      const { confirmed } = await openConfirmModal({
        title: 'Enable maintenance mode',
        message: 'Non-admin users will be blocked from logging in.',
        confirmText: 'Enable',
        danger: true,
      });
      if (!confirmed) return;
    }

    disableModalSubmit();
    const res = await modalApiUpdate('/api/admin/settings', { settings }, {
      successMessage: 'Settings saved', refresh: true, rerender: true,
    });
    if (res.ok) {
      closeModal();
      untrackFormChanges();
      trackModalAudit('admin.settings.updated', { keys: Object.keys(settings) });
    } else enableModalSubmit();
  };
}

/* Legacy entry point */
async function saveAdminSettings() {
  const settings = {
    platform_name: $('#setPlatformName')?.value,
    support_email: $('#setSupportEmail')?.value,
    default_currency: $('#setCurrency')?.value,
    default_timezone: $('#setTimezone')?.value,
    commission_consultation: $('#setCommCons')?.value,
    commission_course: $('#setCommCourse')?.value,
    withdrawal_hold_days: $('#setHold')?.value,
    min_payout: $('#setMinPayout')?.value,
  };
  const res = await modalApiUpdate('/api/admin/settings', { settings }, {
    successMessage: 'Settings saved', refresh: true, rerender: true,
  });
  if (res.ok) trackModalAudit('admin.settings.updated', { keys: Object.keys(settings) });
}

/* ==================================================================
 * 13. AUDIT LOG
 * ================================================================== */

async function openAuditLogModal(filters = {}) {
  try {
    showLoading(true);
    const qs = new URLSearchParams({
      page: AdminModalState.auditPage,
      ...AdminModalState.auditFilters,
      ...filters,
    }).toString();
    const d = await apiCall(`/api/admin/audit?${qs}`).catch(() => ({ entries: [], total: 0 }));
    const entries = d.entries || [];

    openModal({
      title: 'Audit Log',
      className: 'modal-lg',
      body: `
        <div class="form-grid">
          <label class="form-group"><span class="form-label">Actor</span>
            <input id="alActor" class="form-input" value="${esc(filters.actor || '')}" /></label>
          <label class="form-group"><span class="form-label">Action</span>
            <input id="alAction" class="form-input" value="${esc(filters.action || '')}" /></label>
          <label class="form-group"><span class="form-label">From</span>
            <input id="alFrom" type="date" class="form-input" value="${filters.from || ''}" /></label>
          <label class="form-group"><span class="form-label">To</span>
            <input id="alTo" type="date" class="form-input" value="${filters.to || ''}" /></label>
        </div>
        <button class="btn btn-secondary btn-sm" id="alFilter">Apply filters</button>

        ${entries.length
          ? `<table class="data-table" style="margin-top:12px">
              <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead>
              <tbody>
                ${entries.map(e => `
                  <tr>
                    <td>${esc(mfFormatDate(e.created_at, true))}</td>
                    <td>${esc(e.actor_name || e.actor_email || '—')}</td>
                    <td><code>${esc(e.action || '')}</code></td>
                    <td>${esc(e.target || '')}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
            <p class="form-hint">Page ${AdminModalState.auditPage} · total ${d.total || entries.length}</p>`
          : '<p class="empty-row">No audit entries</p>'}`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-info" id="alPrev" ${AdminModalState.auditPage <= 1 ? 'disabled' : ''}>Prev</button>
        <button class="btn btn-info" id="alNext" ${entries.length < 50 ? 'disabled' : ''}>Next</button>
        <button class="btn btn-info" id="alExport"><i class="fas fa-download"></i> Export CSV</button>`,
    });
    enhanceModalAccessibility();

    $('#alFilter').onclick = () => {
      AdminModalState.auditFilters = {
        actor:  sanitizeInput($('#alActor').value),
        action: sanitizeInput($('#alAction').value),
        from:   $('#alFrom').value,
        to:     $('#alTo').value,
      };
      AdminModalState.auditPage = 1;
      closeModal();
      openAuditLogModal();
    };
    $('#alPrev').onclick = () => { AdminModalState.auditPage--; closeModal(); openAuditLogModal(); };
    $('#alNext').onclick = () => { AdminModalState.auditPage++; closeModal(); openAuditLogModal(); };
    $('#alExport').onclick = () => {
      const header = ['When', 'Actor', 'Action', 'Target', 'Details'];
      const body = entries.map(e => [
        e.created_at || '', e.actor_email || '', e.action || '', e.target || '', e.details || '',
      ]);
      const csv = [header, ...body]
        .map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      downloadTextFile(`audit-${Date.now()}.csv`, csv, 'text/csv');
    };
  } catch (e) { handleModalError(e); }
  finally { showLoading(false); }
}

/* ==================================================================
 * 14. BACKWARD-COMPAT EXPORTS
 * ================================================================== */

window.AdminModals = {
  // original API
  openEditUserModal,
  submitCreateExpert,
  openAssignExpertModal,
  openAssignOpsModal,
  openCreateCouponModal,
  sendBroadcast,
  saveAdminSettings,
  showConsultationModal,
  openEventModal,

  // additions
  openViewUserModal,
  openCreateUserModal,
  openSuspendUserModal,
  openActivateUserModal,
  openDeleteUserModal,
  openResetUserPasswordModal,
  openChangeUserRoleModal,
  openUserPermissionsModal,
  openUserActivityModal,
  openUserAuditLogModal,

  openApproveExpertModal,
  openRejectExpertModal,
  openSuspendExpertModal,
  openExpertVerificationModal,
  openExpertDocumentsModal,
  openExpertCommissionModal,

  openViewInstitutionModal,
  openSuspendInstitutionModal,

  openReassignExpertModal,
  openCancelConsultationModal,
  openRefundConsultationModal,

  openDeactivateCouponModal,
  openDeleteCouponModal,
  openCouponStatsModal,

  openBroadcastModal,

  openDeleteEventModal,
  openEventRegistrationsModal,
  openEventAttendanceModal,
  openEventRevenueModal,

  openAdminSettingsModal,

  openAuditLogModal,

  clearAdminCache,
};