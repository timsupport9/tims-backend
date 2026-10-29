/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/profile.js */
/* Stage 7: profile + security + privacy + sessions + audit view. */
/* Public/private separation, session revocation, password-change */
/* invalidates other sessions, recovery options displayed. */
/* ============================================================ */

const AVATAR_MAX_SIZE_MB = 3;
const AVATAR_ALLOWED_MIME = ['image/png','image/jpeg','image/webp','image/gif'];

const COMMON_TIMEZONES = [
  'UTC','Africa/Nairobi','Africa/Lagos','Africa/Johannesburg','Africa/Cairo',
  'Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid',
  'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
  'Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Australia/Sydney',
];

let _profileTab = UserFilters.get('profile', 'tab', 'account') || 'account';
let __profileExtrasLoaded = false;

/* ============================================================ */
/* Loader for Stage 7 extras: sessions, privacy, security events */
/* ============================================================ */

async function _loadProfileExtras({ force = false } = {}) {
  if (__profileExtrasLoaded && !force) return;
  const tasks = [
    apiCall('/api/auth/sessions').then(d => { S.activeSessions = d.sessions || []; }).catch(() => {}),
    apiCall('/api/user/privacy').then(d => { S.privacySettings = d.settings || null; }).catch(() => {}),
    apiCall('/api/user/security-events').then(d => { S.securityEvents = d.events || []; }).catch(() => {}),
    apiCall('/api/user/recovery-options').then(d => { S.recoveryOptions = d.options || {}; }).catch(() => {}),
    apiCall('/api/user/public-profile').then(d => { S.publicProfile = d.profile || null; }).catch(() => {}),
  ];
  await Promise.allSettled(tasks);
  __profileExtrasLoaded = true;
}

/* ============================================================ */
/* Main renderer — three tabs (Account / Privacy / Security) */
/* ============================================================ */

const PROFILE_TABS = [
  { id: 'account',  label: 'Account',  icon: 'fa-user' },
  { id: 'privacy',  label: 'Privacy',  icon: 'fa-shield-alt' },
  { id: 'security', label: 'Security', icon: 'fa-lock' },
];

function renderUserProfile() {
  if (!__profileExtrasLoaded) {
    _loadProfileExtras().then(() => rerenderRoleContent()).catch(() => {});
  }

  return UserUI.page({
    title: 'My Profile',
    breadcrumb: 'Profile',
    content: `
      ${UserUI.tabs(PROFILE_TABS, _profileTab, 'data-profile-tab')}
      ${_profileTab === 'account'  ? renderProfileAccount()  : ''}
      ${_profileTab === 'privacy'  ? renderProfilePrivacy()  : ''}
      ${_profileTab === 'security' ? renderProfileSecurity() : ''}
    `,
  });
}

/* ============================================================ */
/* Account tab — details, avatar, preferences, GDPR */
/* ============================================================ */

function renderProfileAccount() {
  const tz = currentUser?.timezone || 'UTC';
  const inList = COMMON_TIMEZONES.includes(tz);

  return `
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

      ${S.publicProfile ? `
        <h3 class="panel-title" style="margin-top:24px">Public Profile Preview</h3>
        <p class="form-hint">This is what other users see on your public profile.</p>
        <div class="public-preview" style="border:1px dashed var(--border);padding:12px;border-radius:8px;margin-top:8px">
          <strong>${esc(S.publicProfile.display_name || currentUser?.name || '')}</strong>
          ${S.publicProfile.headline ? `<p>${esc(S.publicProfile.headline)}</p>` : ''}
          ${S.publicProfile.bio ? `<p class="form-hint">${esc(S.publicProfile.bio)}</p>` : ''}
          ${(S.publicProfile.visible_skills || []).length
            ? `<p>${(S.publicProfile.visible_skills || []).map(s => `<span class="chip chip-neutral">${esc(s)}</span>`).join(' ')}</p>`
            : ''}
        </div>
        <div class="panel-actions" style="margin-top:8px">
          <button class="btn btn-secondary btn-sm" data-action="edit-public-profile">
            <i class="fas fa-pen"></i> Edit Public Profile</button>
        </div>
      ` : ''}

      <h3 class="panel-title" style="margin-top:24px">Privacy &amp; Data</h3>
      <div class="panel-actions">
        <button class="btn btn-secondary" data-action="gdpr-export">
          <i class="fas fa-download"></i> Export My Data (GDPR)</button>
        <button class="btn btn-danger" data-action="gdpr-delete">
          <i class="fas fa-trash"></i> Delete Account</button>
      </div>
      <p class="form-hint" style="margin-top:8px">
        <i class="fas fa-info-circle"></i>
        Account deletion may not remove financial, audit, or legally-required records.
        An approved retention process will be applied.
      </p>
    </section>
  `;
}

/* ============================================================ */
/* Privacy tab — meaningful, separated consents */
/* ============================================================ */

function renderProfilePrivacy() {
  const p = S.privacySettings || {};
  return `
    <section class="panel">
      <h3 class="panel-title">Essential Service Processing</h3>
      <p class="form-hint">
        These are required for the platform to function. They cannot be disabled.
      </p>
      <ul class="list-stack" style="margin-top:8px">
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">Account &amp; authentication</span>
            <span class="list-row-sub">Login, session management, security notifications</span>
          </div>
          <span class="chip chip-neutral">Always on</span>
        </li>
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">Service records</span>
            <span class="list-row-sub">Bookings, courses, consultations you have engaged in</span>
          </div>
          <span class="chip chip-neutral">Always on</span>
        </li>
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">Financial records</span>
            <span class="list-row-sub">Transactions, receipts, refunds (retained under legal obligations)</span>
          </div>
          <span class="chip chip-neutral">Always on</span>
        </li>
      </ul>
    </section>

    <section class="panel">
      <h3 class="panel-title">Optional Preferences</h3>
      <p class="form-hint">You control these at any time.</p>
      <div class="form-grid" style="margin-top:12px">
        <label class="checkbox-row form-group-full">
          <input type="checkbox" id="pvDiscoverable" ${p.discoverable !== false ? 'checked' : ''} />
          <span>Allow other users to find me by name or email</span>
        </label>
        <label class="checkbox-row form-group-full">
          <input type="checkbox" id="pvMarketing" ${p.marketing ? 'checked' : ''} />
          <span>Receive optional marketing and promotional emails</span>
        </label>
        <label class="checkbox-row form-group-full">
          <input type="checkbox" id="pvAnalytics" ${p.analytics_optin ? 'checked' : ''} />
          <span>Allow analytics / personalization (beyond required telemetry)</span>
        </label>
        <label class="checkbox-row form-group-full">
          <input type="checkbox" id="pvPublicProfile" ${p.public_profile !== false ? 'checked' : ''} />
          <span>Show my public profile to other authenticated users</span>
        </label>
        <label class="checkbox-row form-group-full">
          <input type="checkbox" id="pvCommunityName" ${p.community_display_name !== false ? 'checked' : ''} />
          <span>Use my display name in community discussions</span>
        </label>
      </div>
      <div class="panel-actions" style="margin-top:12px">
        <button class="btn btn-primary" data-action="update-privacy-settings">
          <i class="fas fa-save"></i> Save Preferences</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Data Requests</h3>
      <div class="panel-actions" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary" data-action="gdpr-export">
          <i class="fas fa-download"></i> Request Data Export</button>
        <button class="btn btn-secondary" data-action="request-data-correction">
          <i class="fas fa-edit"></i> Request Data Correction</button>
        <button class="btn btn-secondary" data-action="request-data-deletion">
          <i class="fas fa-trash-alt"></i> Request Data Deletion</button>
      </div>
      <p class="form-hint" style="margin-top:8px">
        Some records may be retained for legal, financial, or security purposes per applicable
        data-protection law (including Kenya's Data Protection Act, 2019 where relevant).
      </p>
    </section>
  `;
}

/* ============================================================ */
/* Security tab — sessions, password, security events, recovery */
/* ============================================================ */

function renderProfileSecurity() {
  const sessions = S.activeSessions || [];
  const events = S.securityEvents || [];
  const recovery = S.recoveryOptions || {};

  return `
    <section class="panel">
      <h3 class="panel-title">Change Password</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Current password</span>
          <input id="cpOld" type="password" class="form-input" autocomplete="current-password" /></label>
        <label class="form-group"><span class="form-label">New password</span>
          <input id="cpNew" type="password" class="form-input" autocomplete="new-password" /></label>
      </div>
      <p class="form-hint">Minimum 8 characters. Changing your password will sign you out of all other sessions.</p>
      <div class="panel-actions">
        <button class="btn btn-warning" data-action="change-password">
          <i class="fas fa-lock"></i> Update Password</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header-row">
        <h3 class="panel-title">Active Sessions</h3>
        <button class="btn btn-secondary btn-sm" data-action="refresh-sessions">
          <i class="fas fa-rotate-right"></i> Refresh</button>
      </div>
      <p class="form-hint">Devices and browsers currently signed in to your account.</p>
      ${sessions.length ? sessions.map(s => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">
              ${esc(s.device || s.user_agent || 'Unknown device')}
              ${s.current ? '<span class="chip chip-green">This session</span>' : ''}
              ${s.trusted ? '<span class="chip chip-blue">Trusted</span>' : ''}
            </span>
            <span class="list-row-sub">
              ${s.ip_address ? esc(s.ip_address) + ' · ' : ''}
              Last active ${timeAgo(s.last_active_at || s.created_at)}
              ${s.location ? ' · ' + esc(s.location) : ''}
            </span>
          </div>
          ${!s.current ? `
            <button class="btn btn-danger btn-sm" data-action="revoke-session" data-id="${s.id}">
              <i class="fas fa-sign-out-alt"></i> Sign out</button>
          ` : ''}
        </div>
      `).join('') : '<p class="empty-row">No active sessions returned</p>'}
      <div class="panel-actions" style="margin-top:8px">
        <button class="btn btn-danger" data-action="revoke-all-sessions">
          <i class="fas fa-sign-out-alt"></i> Sign Out All Other Sessions</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Recovery Options</h3>
      ${recovery.email_verified
        ? `<p><i class="fas fa-check-circle" style="color:var(--accent)"></i> Email verified: <strong>${esc(currentUser?.email || '')}</strong></p>`
        : `<p><i class="fas fa-exclamation-triangle" style="color:var(--warning)"></i> Email not verified.
            <button class="btn-ghost btn-xs" data-action="resend-verification">Verify now</button></p>`}
      ${recovery.phone_verified
        ? `<p><i class="fas fa-check-circle" style="color:var(--accent)"></i> Phone verified</p>`
        : `<p><i class="fas fa-info-circle"></i> Add a verified phone number for account recovery.</p>`}
      ${recovery.recovery_codes_available
        ? `<p><i class="fas fa-check-circle" style="color:var(--accent)"></i> Recovery codes generated.
            <button class="btn-ghost btn-xs" data-action="view-recovery-codes">View</button></p>`
        : `<p class="form-hint">Generate recovery codes for account access if you lose your device.</p>
           <button class="btn btn-secondary btn-sm" data-action="generate-recovery-codes"
                   style="margin-top:6px"><i class="fas fa-key"></i> Generate Codes</button>`}
      ${recovery.two_factor_enabled
        ? `<p><i class="fas fa-check-circle" style="color:var(--accent)"></i> Two-factor authentication enabled</p>
           <button class="btn btn-secondary btn-sm" data-action="disable-2fa">Disable 2FA</button>`
        : `<p class="form-hint">Two-factor authentication adds an extra layer of protection.</p>
           <button class="btn btn-primary btn-sm" data-action="enable-2fa"
                   style="margin-top:6px"><i class="fas fa-shield-alt"></i> Enable 2FA</button>`}
    </section>

    <section class="panel">
      <h3 class="panel-title">Recent Security Events</h3>
      <p class="form-hint">Server-recorded security activity on your account.</p>
      ${events.length ? events.slice(0, 15).map(e => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(e.type || 'Event')}</span>
            <span class="list-row-sub">
              ${e.ip_address ? esc(e.ip_address) + ' · ' : ''}
              ${e.device ? esc(e.device) : ''}
              ${e.outcome ? ' · ' + esc(e.outcome) : ''}
            </span>
          </div>
          <span class="chip chip-neutral">${timeAgo(e.at || e.created_at)}</span>
        </div>
      `).join('') : '<p class="empty-row">No recent events</p>'}
    </section>
  `;
}

/* ============================================================ */
/* Module + tab delegation */
/* ============================================================ */

window.ExpertHubUser.registerModule('profile', renderUserProfile);

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-profile-tab]');
  if (!t) return;
  _profileTab = t.dataset.profileTab;
  UserFilters.set('profile', 'tab', _profileTab);
  rerenderRoleContent();
}, true);

/* ============================================================ */
/* Account actions */
/* ============================================================ */

window.ExpertHubUser.registerAction('update-user-profile', async () => {
  const name   = ($('#profileName')?.value || '').trim();
  const phone  = ($('#profilePhone')?.value || '').trim();
  const tz     = ($('#profileTimezone')?.value || '').trim();
  const intent = $('#profileIntent')?.value || S.userIntent;

  if (!name) return showToast('Name is required', 'error');
  if (name.length > 80) return showToast('Name is too long', 'error');
  if (tz) {
    try { Intl.DateTimeFormat(undefined, { timeZone: tz }); }
    catch { return showToast('Invalid timezone', 'error'); }
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

window.ExpertHubUser.registerAction('edit-public-profile', () => {
  const p = S.publicProfile || {};
  UserUI.formModal({
    title: 'Edit Public Profile',
    fields: [
      { name: 'display_name', label: 'Display name', value: p.display_name || currentUser?.name || '' },
      { name: 'headline',     label: 'Headline', value: p.headline || '', placeholder: 'e.g. Software Engineer & Mentor' },
      { name: 'bio',          label: 'Bio', type: 'textarea', rows: 4, value: p.bio || '' },
      { name: 'visible_skills', label: 'Visible skills (comma separated)',
        value: (p.visible_skills || []).join(', ') },
    ],
    submitLabel: 'Save Public Profile',
    onSubmit: async (v) => {
      await apiCall('/api/user/public-profile', 'PUT', {
        display_name: v.display_name,
        headline: v.headline,
        bio: v.bio,
        visible_skills: (v.visible_skills || '').split(',').map(x => x.trim()).filter(Boolean),
      });
      closeModal();
      await _loadProfileExtras({ force: true });
      rerenderRoleContent();
      showToast('Public profile updated', 'success');
    },
  });
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
  if (!await confirmDialog(
    'This will schedule your account for deletion in 30 days. Financial and audit records may be retained under legal obligations. Continue?'
  )) return;
  try {
    await apiCall('/api/user/gdpr/delete', 'POST');
    showToast('Account scheduled for deletion. You will receive an email within 30 days.', 'warning', 8000);
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('request-data-correction', () => {
  UserUI.formModal({
    title: 'Request Data Correction',
    fields: [
      { name: 'field',       label: 'Field to correct', required: true },
      { name: 'current_value', label: 'Current value', value: '' },
      { name: 'correct_value', label: 'Correct value', required: true },
      { name: 'reason',      label: 'Reason', type: 'textarea', rows: 2 },
    ],
    submitLabel: 'Submit Request',
    onSubmit: async (v) => {
      await apiCall('/api/user/gdpr/correction', 'POST', v);
      closeModal();
      showToast('Correction request submitted', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('request-data-deletion', () => {
  UserUI.formModal({
    title: 'Request Data Deletion',
    fields: [
      { name: 'scope', label: 'Scope', type: 'select', required: true,
        options: [
          { value: 'partial', label: 'Specific data only' },
          { value: 'full',    label: 'Full account and all associated data' },
        ]},
      { name: 'details', label: 'What data should be removed?', type: 'textarea', rows: 3 },
    ],
    submitLabel: 'Submit Request',
    onSubmit: async (v) => {
      await apiCall('/api/user/gdpr/deletion-request', 'POST', v);
      closeModal();
      showToast('Deletion request submitted. Records required by law may be retained.', 'success', 6000);
    },
  });
});

/* ============================================================ */
/* Privacy actions */
/* ============================================================ */

window.ExpertHubUser.registerAction('update-privacy-settings', async () => {
  const payload = {
    discoverable:          $('#pvDiscoverable')?.checked ?? true,
    marketing:             $('#pvMarketing')?.checked ?? false,
    analytics_optin:       $('#pvAnalytics')?.checked ?? false,
    public_profile:        $('#pvPublicProfile')?.checked ?? true,
    community_display_name:$('#pvCommunityName')?.checked ?? true,
  };
  try {
    const d = await apiCall('/api/user/privacy', 'PUT', payload);
    S.privacySettings = d?.settings || payload;
    showToast('Preferences saved', 'success');
    rerenderRoleContent();
  } catch (e) { showToast(e.message, 'error'); }
});

/* ============================================================ */
/* Security actions */
/* ============================================================ */

window.ExpertHubUser.registerAction('change-password', async () => {
  const oldp = $('#cpOld')?.value;
  const newp = $('#cpNew')?.value;
  if (!oldp || !newp) return showToast('Enter both passwords', 'error');
  if (newp.length < 8) return showToast('New password must be at least 8 characters', 'error');
  if (newp === oldp) return showToast('New password must differ from current', 'error');

  try {
    const d = await apiCall('/api/auth/password', 'PUT', { old_password: oldp, new_password: newp });
    $('#cpOld').value = '';
    $('#cpNew').value = '';
    // Server invalidates other sessions; refresh local session list
    await _loadProfileExtras({ force: true });
    rerenderRoleContent();
    const invalidated = d?.sessions_revoked
      ? ` Other ${d.sessions_revoked} session${d.sessions_revoked === 1 ? ' was' : 's were'} signed out.` : '';
    showToast(`Password updated.${invalidated}`, 'success', 6000);
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('refresh-sessions', async () => {
  await _loadProfileExtras({ force: true });
  rerenderRoleContent();
  showToast('Sessions refreshed', 'success');
});

window.ExpertHubUser.registerAction('revoke-session', async (id) => {
  if (!await confirmDialog('Sign out this session?')) return;
  try {
    await apiCall(`/api/auth/sessions/${id}`, 'DELETE');
    S.activeSessions = (S.activeSessions || []).filter(s => String(s.id) !== String(id));
    rerenderRoleContent();
    showToast('Session signed out', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('revoke-all-sessions', async () => {
  if (!await confirmDialog('Sign out all other sessions? Your current session will remain active.')) return;
  try {
    await apiCall('/api/auth/sessions/revoke-all', 'POST');
    await _loadProfileExtras({ force: true });
    rerenderRoleContent();
    showToast('All other sessions signed out', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('resend-verification', async () => {
  try {
    await apiCall('/api/auth/verify/resend', 'POST');
    showToast('Verification email sent — check your inbox', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('generate-recovery-codes', async () => {
  try {
    const d = await apiCall('/api/auth/recovery-codes/generate', 'POST');
    openModal({
      title: 'Recovery Codes',
      body: `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i>
          Save these codes somewhere safe. Each code can be used once. They will not be shown again.
        </div>
        <pre style="background:var(--surface-2);padding:16px;border-radius:8px;font-family:monospace;line-height:1.8">
${(d.codes || []).map(esc).join('\n')}
        </pre>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-primary" onclick="navigator.clipboard.writeText(${JSON.stringify((d.codes || []).join('\n'))}); showToast('Copied', 'success');">
          <i class="fas fa-copy"></i> Copy All</button>
      `,
    });
    await _loadProfileExtras({ force: true });
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('view-recovery-codes', async () => {
  try {
    const d = await apiCall('/api/auth/recovery-codes').catch(() => null);
    if (!d?.codes?.length) return showToast('Recovery codes are not viewable — regenerate them', 'warning');
    openModal({
      title: 'Recovery Codes',
      body: `<pre style="background:var(--surface-2);padding:16px;border-radius:8px;font-family:monospace">${(d.codes || []).map(esc).join('\n')}</pre>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('enable-2fa', async () => {
  try {
    const d = await apiCall('/api/auth/2fa/setup', 'POST');
    if (!d?.secret && !d?.qr_url) return showToast('2FA setup unavailable', 'warning');
    openModal({
      title: 'Enable Two-Factor Authentication',
      body: `
        ${d.qr_url ? `<div style="text-align:center"><img src="${esc(d.qr_url)}" alt="QR code" style="max-width:220px" /></div>` : ''}
        ${d.secret ? `<p class="form-hint">Manual secret: <code class="code">${esc(d.secret)}</code></p>` : ''}
        <label class="form-group" style="margin-top:12px">
          <span class="form-label">Enter 6-digit code from your authenticator app</span>
          <input id="tfCode" class="form-input" inputmode="numeric" maxlength="6" required />
        </label>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button id="tfSave" class="btn btn-primary">Enable 2FA</button>
      `,
    });
    $('#tfSave').onclick = async () => {
      const code = $('#tfCode').value.trim();
      if (!/^\d{6}$/.test(code)) return showToast('Enter the 6-digit code', 'error');
      try {
        await apiCall('/api/auth/2fa/enable', 'POST', { code });
        closeModal();
        await _loadProfileExtras({ force: true });
        rerenderRoleContent();
        showToast('Two-factor authentication enabled', 'success');
      } catch (e) { showToast(e.message, 'error'); }
    };
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('disable-2fa', async () => {
  if (!await confirmDialog('Disable two-factor authentication? This reduces your account security.')) return;
  try {
    await apiCall('/api/auth/2fa/disable', 'POST');
    await _loadProfileExtras({ force: true });
    rerenderRoleContent();
    showToast('Two-factor authentication disabled', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});
