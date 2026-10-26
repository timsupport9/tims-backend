/* ============================================================
   ExpertHub 2.0 — dashboards/user/profile.js
   Profile settings, password, GDPR. Avatar validation,
   timezone sync, session-state update on save.
   ============================================================ */

const AVATAR_MAX_SIZE_MB = 3;
const AVATAR_ALLOWED_MIME = ['image/png','image/jpeg','image/webp','image/gif'];

/* Minimal valid timezones (fallback to free text if not present) */
const COMMON_TIMEZONES = [
  'UTC','Africa/Nairobi','Africa/Lagos','Africa/Johannesburg','Africa/Cairo',
  'Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid',
  'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
  'Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Australia/Sydney',
];

function renderUserProfile() {
  const tz = currentUser?.timezone || 'UTC';
  const inList = COMMON_TIMEZONES.includes(tz);

  return UserUI.page({
    title: 'My Profile',
    breadcrumb: 'Profile',
    content: `
      <section class="panel">
        <div class="profile-header">
          <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
          <div>
            <h2 class="profile-name">${esc(currentUser?.name || '')}</h2>
            <p class="profile-email">${esc(currentUser?.email || '')}</p>
            <p style="margin-top:6px">
              <span class="chip chip-neutral">Level ${S.userLevel || 1}</span>
              <span class="chip chip-blue" style="margin-left:6px">${S.userXP || 0} XP</span>
              ${currentUser?.verified ? '<span class="chip chip-green" style="margin-left:6px"><i class="fas fa-check-shield"></i> Verified</span>' : ''}
            </p>
          </div>
        </div>

        <div class="form-grid">
          <label class="form-group"><span class="form-label">Full name</span>
            <input id="profileName" class="form-input" value="${esc(currentUser?.name || '')}"
                   maxlength="80" required /></label>
          <label class="form-group"><span class="form-label">Phone</span>
            <input id="profilePhone" class="form-input" value="${esc(currentUser?.phone || '')}"
                   placeholder="+254..." maxlength="20" /></label>
          <label class="form-group">
            <span class="form-label">Timezone</span>
            <input id="profileTimezone" class="form-input" list="tz-list"
                   value="${esc(tz)}" placeholder="UTC" />
            <datalist id="tz-list">
              ${COMMON_TIMEZONES.map(t => `<option value="${t}"></option>`).join('')}
            </datalist>
            ${!inList && tz ? '<p class="form-hint">Custom timezone (must be valid IANA)</p>' : ''}
          </label>
          <label class="form-group">
            <span class="form-label">Preferred mode</span>
            <select id="profileIntent" class="form-select">
              <option value="both"    ${S.userIntent === 'both' ? 'selected' : ''}>Both — Learning and Consulting</option>
              <option value="learn"   ${S.userIntent === 'learn' ? 'selected' : ''}>Learning only</option>
              <option value="consult" ${S.userIntent === 'consult' ? 'selected' : ''}>Consulting only</option>
            </select>
          </label>
          <label class="form-group form-group-full">
            <span class="form-label">Change avatar</span>
            <input type="file" id="avatarFile" class="form-input" accept="image/*" />
            <p class="form-hint">Max ${AVATAR_MAX_SIZE_MB}MB. PNG, JPG, WebP or GIF.</p>
          </label>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" data-action="update-user-profile">
            <i class="fas fa-save"></i> Save Changes</button>
        </div>

        <h3 class="panel-title" style="margin-top:24px">Change Password</h3>
        <div class="form-grid">
          <label class="form-group"><span class="form-label">Current password</span>
            <input id="cpOld" type="password" class="form-input" autocomplete="current-password" /></label>
          <label class="form-group"><span class="form-label">New password</span>
            <input id="cpNew" type="password" class="form-input" autocomplete="new-password" /></label>
        </div>
        <p class="form-hint">Minimum 8 characters. Use a mix of letters, numbers, and symbols.</p>
        <div class="panel-actions">
          <button class="btn btn-warning" data-action="change-password">
            <i class="fas fa-lock"></i> Update Password</button>
        </div>

        <h3 class="panel-title" style="margin-top:24px">Privacy &amp; Data</h3>
        <div class="panel-actions">
          <button class="btn btn-secondary" data-action="gdpr-export">
            <i class="fas fa-download"></i> Export My Data (GDPR)</button>
          <button class="btn btn-danger" data-action="gdpr-delete">
            <i class="fas fa-trash"></i> Delete Account</button>
        </div>
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('profile', renderUserProfile);

/* ---------------- Actions ---------------- */
window.ExpertHubUser.registerAction('update-user-profile', async () => {
  const name  = ($('#profileName')?.value || '').trim();
  const phone = ($('#profilePhone')?.value || '').trim();
  const tz    = ($('#profileTimezone')?.value || '').trim();
  const intent= $('#profileIntent')?.value || S.userIntent;

  if (!name) return showToast('Name is required', 'error');
  if (name.length > 80) return showToast('Name is too long', 'error');
  if (tz) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch {
      return showToast('Invalid timezone', 'error');
    }
  }

  try {
    await apiCall('/api/user/profile', 'PUT', { name, phone, timezone: tz, intent });
    const me = await apiCall('/api/auth/me');
    if (me?.user) {
      currentUser = me.user;
      if (me.user.intent) S.userIntent = me.user.intent;
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
    showToast('Profile updated', 'success');
    rerenderRoleContent();
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('change-password', async () => {
  const oldp = $('#cpOld')?.value;
  const newp = $('#cpNew')?.value;
  if (!oldp || !newp) return showToast('Enter both passwords', 'error');
  if (newp.length < 8) return showToast('New password must be at least 8 characters', 'error');
  if (newp === oldp) return showToast('New password must differ from current', 'error');

  try {
    await apiCall('/api/auth/password', 'PUT', { old_password: oldp, new_password: newp });
    $('#cpOld').value = '';
    $('#cpNew').value = '';
    showToast('Password updated', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('gdpr-export', async () => {
  try {
    showLoading(true);
    const d = await apiCall('/api/user/gdpr/export', 'POST');
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `experthub-user-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Export ready', 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('gdpr-delete', async () => {
  if (!await confirmDialog('This will schedule your account for deletion in 30 days. Continue?')) return;
  try {
    await apiCall('/api/user/gdpr/delete', 'POST');
    showToast('Account scheduled for deletion. You will receive an email within 30 days.', 'warning', 8000);
  } catch (e) { showToast(e.message, 'error'); }
});