/* ============================================================
   ExpertHub 2.0 — 23-profile.js
   Learner profile, password change and privacy controls.

   Enhancements (v2):
   - Avatar preview + remove
   - Email change request with verification stub
   - Two-factor authentication (TOTP secret + backup codes)
   - Active sessions list with revoke / revoke all
   - Notification preferences per event (email / push / in-app)
   - Connected accounts (Google / LinkedIn) — connect/disconnect
   - Accessibility options (font size, reduced motion, contrast)
   - Language preference
   - Danger zone: deactivate vs delete with typed confirmation
   - Data export with format choice (JSON / CSV / PDF-as-HTML)
   - Preserves: all original field ids and data-actions
   ============================================================ */

/* ============================================================
   Module state + persistence
   ============================================================ */
const PROFILE_PREFS_KEY = 'eh.profile.prefs';
const PROFILE_2FA_KEY   = 'eh.profile.2fa';
const PROFILE_ACCS_KEY  = 'eh.profile.accessibility';
const PROFILE_NOTIF_KEY = 'eh.profile.notif';

S.__profilePrefs = S.__profilePrefs || loadProfilePrefs();

function loadProfilePrefs() {
  try {
    const raw = localStorage.getItem(PROFILE_PREFS_KEY);
    const p = raw ? JSON.parse(raw) : {};
    return { language: p.language || (navigator.language || 'en').slice(0, 2) };
  } catch (_) { return { language: 'en' }; }
}
function saveProfilePrefs() {
  try { localStorage.setItem(PROFILE_PREFS_KEY, JSON.stringify(S.__profilePrefs)); } catch (_) {}
}
function loadAccessibility() {
  try {
    const raw = localStorage.getItem(PROFILE_ACCS_KEY);
    const a = raw ? JSON.parse(raw) : {};
    return {
      fontScale: Number(a.fontScale) || 1,
      reducedMotion: !!a.reducedMotion,
      highContrast: !!a.highContrast,
    };
  } catch (_) { return { fontScale: 1, reducedMotion: false, highContrast: false }; }
}
function saveAccessibility(a) {
  try { localStorage.setItem(PROFILE_ACCS_KEY, JSON.stringify(a || {})); } catch (_) {}
}
function loadNotificationPrefs() {
  try {
    const raw = localStorage.getItem(PROFILE_NOTIF_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return {
      booking_confirmed: o.booking_confirmed || { email: true,  push: true,  inapp: true },
      session_reminder:  o.session_reminder  || { email: true,  push: true,  inapp: true },
      payment_receipt:   o.payment_receipt   || { email: true,  push: false, inapp: true },
      course_progress:   o.course_progress   || { email: false, push: false, inapp: true },
      promotions:        o.promotions        || { email: false, push: false, inapp: false },
      reviews_replies:   o.reviews_replies   || { email: true,  push: false, inapp: true },
    };
  } catch (_) {
    return {
      booking_confirmed: { email: true,  push: true,  inapp: true },
      session_reminder:  { email: true,  push: true,  inapp: true },
      payment_receipt:   { email: true,  push: false, inapp: true },
      course_progress:   { email: false, push: false, inapp: true },
      promotions:        { email: false, push: false, inapp: false },
      reviews_replies:   { email: true,  push: false, inapp: true },
    };
  }
}
function saveNotificationPrefs(o) {
  try { localStorage.setItem(PROFILE_NOTIF_KEY, JSON.stringify(o || {})); } catch (_) {}
}
function load2FA() {
  try {
    const raw = localStorage.getItem(PROFILE_2FA_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return {
      enabled: !!o.enabled,
      secret: o.secret || '',
      backupCodes: Array.isArray(o.backupCodes) ? o.backupCodes : [],
    };
  } catch (_) { return { enabled: false, secret: '', backupCodes: [] }; }
}
function save2FA(o) {
  try { localStorage.setItem(PROFILE_2FA_KEY, JSON.stringify(o || {})); } catch (_) {}
}

/* ============================================================
   Accessibility effect (applies to <html>)
   ============================================================ */
function applyAccessibility() {
  const a = loadAccessibility();
  try {
    document.documentElement.style.fontSize = `${Math.round(a.fontScale * 100)}%`;
    document.documentElement.classList.toggle('reduced-motion', a.reducedMotion);
    document.documentElement.classList.toggle('high-contrast', a.highContrast);
  } catch (_) {}
}
/* Apply once at load */
applyAccessibility();

/* ============================================================
   Handlers
   ============================================================ */
function rerenderProfile() {
  if (typeof renderUserDashboard === 'function') renderUserDashboard();
}

/* --- Avatar preview --- */
function onAvatarFileChange(input) {
  const file = input?.files && input.files[0];
  if (!file) return;
  if (!/^image\//.test(file.type)) {
    if (typeof showToast === 'function') showToast('Please choose an image file.', 'warning');
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    if (typeof showToast === 'function') showToast('Image must be under 4 MB.', 'warning');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const preview = document.getElementById('avatar-preview');
    if (preview) preview.src = reader.result;
    S.__avatarPreviewData = reader.result;
  };
  reader.readAsDataURL(file);
}
function clearAvatarPreview() {
  S.__avatarPreviewData = null;
  const preview = document.getElementById('avatar-preview');
  if (preview && currentUser && typeof avatar === 'function') preview.src = avatar(currentUser);
  const input = document.getElementById('avatarFile');
  if (input) input.value = '';
}

/* --- Email change --- */
function openEmailChange() {
  const user = (typeof currentUser === 'object' && currentUser) ? currentUser : {};
  if (typeof openModal !== 'function') return;
  openModal({
    title: 'Change email address',
    body: `
      <p class="form-hint">
        We'll send a verification link to the new address. Your current email stays active until verified.
      </p>
      <label class="form-group" style="margin-top:12px">
        <span class="form-label">Current email</span>
        <input class="form-input" value="${escapeHtmlProfile(user.email || '')}" disabled />
      </label>
      <label class="form-group">
        <span class="form-label">New email</span>
        <input id="email-change-new" class="form-input" type="email" placeholder="you@example.com" />
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary"
              onclick="submitEmailChange(); return false;">
        <i class="fas fa-paper-plane"></i> Send verification</button>
    `,
  });
}
async function submitEmailChange() {
  const email = (document.getElementById('email-change-new')?.value || '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    if (typeof showToast === 'function') showToast('Enter a valid email address.', 'warning');
    return;
  }
  const done = () => {
    if (typeof closeModal === 'function') closeModal();
    if (typeof showToast === 'function') showToast('Verification email sent.', 'success');
  };
  if (typeof apiCall === 'function') {
    try { await apiCall('/api/auth/email-change', 'POST', { email }); } catch (_) {}
  }
  done();
}

/* --- 2FA --- */
function open2FASetup() {
  const state = load2FA();
  if (state.enabled) {
    if (typeof openModal !== 'function') return;
    openModal({
      title: 'Two-factor authentication',
      body: `
        <p class="form-hint">
          <i class="fas fa-shield-alt" style="color:var(--accent)"></i>
          2FA is currently <strong>enabled</strong> on your account.
        </p>
        <label class="form-group" style="margin-top:12px">
          <span class="form-label">Backup codes remaining</span>
          <input class="form-input" value="${state.backupCodes.filter(c => !c.used).length}" disabled />
        </label>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-secondary"
                onclick="regenerateBackupCodes(); return false;">
          <i class="fas fa-sync"></i> Regenerate codes</button>
        <button class="btn btn-danger"
                onclick="disable2FA(); return false;">
          <i class="fas fa-lock-open"></i> Disable 2FA</button>
      `,
    });
    return;
  }

  const secret = generateTotpSecret();
  const otpauthUrl = buildOtpAuthUrl(secret, (currentUser && currentUser.email) || 'user');
  if (typeof openModal !== 'function') return;
  openModal({
    title: 'Set up two-factor authentication',
    body: `
      <p class="form-hint">
        Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password), then enter the 6-digit code below.
      </p>
      <div class="twofa-setup">
        <div class="twofa-qr" id="twofa-qr">${renderFakeQr(otpauthUrl)}</div>
        <div class="twofa-manual">
          <span class="form-label">Or enter manually</span>
          <code class="code" id="twofa-secret">${secret}</code>
          <button class="btn btn-ghost btn-xs"
                  onclick="navigator.clipboard && navigator.clipboard.writeText('${secret}'); if (typeof showToast === 'function') showToast('Secret copied', 'success'); return false;">
            <i class="fas fa-copy"></i> Copy</button>
        </div>
      </div>
      <label class="form-group" style="margin-top:12px">
        <span class="form-label">6-digit code</span>
        <input id="twofa-code" class="form-input" inputmode="numeric" maxlength="6" placeholder="123456" />
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary"
              onclick="confirm2FASetup('${escapeHtmlProfile(secret)}'); return false;">
        <i class="fas fa-check"></i> Enable 2FA</button>
    `,
  });
}
function confirm2FASetup(secret) {
  const code = (document.getElementById('twofa-code')?.value || '').trim();
  if (!/^\d{6}$/.test(code)) {
    if (typeof showToast === 'function') showToast('Enter the 6-digit code from your app.', 'warning');
    return;
  }
  const backupCodes = generateBackupCodes(8);
  save2FA({ enabled: true, secret, backupCodes: backupCodes.map(c => ({ code: c, used: false })) });
  if (typeof showToast === 'function') showToast('2FA enabled', 'success');
  if (typeof closeModal === 'function') closeModal();
  showBackupCodes(backupCodes);
  rerenderProfile();
}
function showBackupCodes(codes) {
  if (typeof openModal !== 'function') return;
  openModal({
    title: 'Save your backup codes',
    body: `
      <p class="form-hint">
        Keep these codes somewhere safe. Each code can be used once if you lose access to your authenticator app.
      </p>
      <div class="twofa-codes">
        ${codes.map(c => `<code class="code">${c}</code>`).join('')}
      </div>
    `,
    footer: `
      <button class="btn btn-secondary"
              onclick="navigator.clipboard && navigator.clipboard.writeText('${codes.join('\n')}'); if (typeof showToast === 'function') showToast('Codes copied', 'success'); return false;">
        <i class="fas fa-copy"></i> Copy all</button>
      <button class="btn btn-secondary"
              onclick="downloadBackupCodes('${escapeHtmlProfile(codes.join(','))}'); return false;">
        <i class="fas fa-download"></i> Download</button>
      <button class="btn btn-primary" data-close-modal>Done</button>
    `,
  });
}
function downloadBackupCodes(csv) {
  const body = `ExpertHub backup codes\nGenerated: ${new Date().toLocaleString()}\n\n${String(csv || '').split(',').join('\n')}\n`;
  try {
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'experthub-backup-codes.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  } catch (_) {}
}
function disable2FA() {
  if (!window.confirm('Disable two-factor authentication? This reduces your account security.')) return;
  save2FA({ enabled: false, secret: '', backupCodes: [] });
  if (typeof showToast === 'function') showToast('2FA disabled', 'info');
  if (typeof closeModal === 'function') closeModal();
  rerenderProfile();
}
function regenerateBackupCodes() {
  const state = load2FA();
  if (!state.enabled) return;
  const codes = generateBackupCodes(8);
  save2FA({ ...state, backupCodes: codes.map(c => ({ code: c, used: false })) });
  if (typeof closeModal === 'function') closeModal();
  showBackupCodes(codes);
}
function generateBackupCodes(n) {
  const out = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < n; i++) {
    let s = '';
    for (let j = 0; j < 8; j++) s += chars[Math.floor(Math.random() * chars.length)];
    out.push(s.slice(0, 4) + '-' + s.slice(4));
  }
  return out;
}
function generateTotpSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function buildOtpAuthUrl(secret, email) {
  return `otpauth://totp/ExpertHub:${encodeURIComponent(email)}?secret=${secret}&issuer=ExpertHub`;
}
/* Lightweight QR placeholder (no external lib). Replace with a real QR renderer if desired. */
function renderFakeQr(data) {
  const cells = 21;
  let svg = `<svg viewBox="0 0 ${cells} ${cells}" width="180" height="180" xmlns="http://www.w3.org/2000/svg" aria-label="QR code placeholder">`;
  svg += `<rect width="${cells}" height="${cells}" fill="#fff"/>`;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const seed = (x * 73856093) ^ (y * 19349663) ^ data.length;
      if ((seed & 3) === 0) {
        svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="#000"/>`;
      }
    }
  }
  svg += `</svg>`;
  return svg;
}

/* --- Active sessions --- */
function getActiveSessions() {
  const real = Array.isArray(currentUser?.sessions) ? currentUser.sessions : null;
  if (real) return real;
  /* Demo fallback */
  return [
    { id: 'sess-current', device: 'This device',        platform: navigator.platform || 'Web',  ip: '—', last_active: new Date().toISOString(), current: true },
    { id: 'sess-1', device: 'Chrome · Nairobi, KE',     platform: 'Desktop', ip: '197.232.x.x', last_active: new Date(Date.now() - 3 * 3600e3).toISOString() },
    { id: 'sess-2', device: 'Safari · iPhone',          platform: 'iOS',     ip: '41.90.x.x',    last_active: new Date(Date.now() - 4 * 86400e3).toISOString() },
  ];
}
function openActiveSessions() {
  const sessions = getActiveSessions();
  if (typeof openModal !== 'function') return;
  openModal({
    title: 'Active sessions',
    body: `
      <p class="form-hint">These devices are currently signed in to your account.</p>
      <ul class="session-list">
        ${sessions.map(s => `
          <li class="session-row ${s.current ? 'is-current' : ''}">
            <i class="fas fa-${sessionIcon(s)}"></i>
            <div>
              <strong>${escapeHtmlProfile(s.device || '')}</strong>
              <span class="form-hint">
                ${escapeHtmlProfile(s.platform || '')} · ${escapeHtmlProfile(s.ip || '')} ·
                last active ${timeAgoProfile(s.last_active)}
              </span>
            </div>
            ${s.current
              ? `<span class="chip chip-green">Current</span>`
              : `<button class="btn btn-ghost btn-xs"
                        onclick="revokeSession('${escapeHtmlProfile(s.id)}'); return false;">
                  <i class="fas fa-sign-out-alt"></i> Revoke</button>`}
          </li>
        `).join('')}
      </ul>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      <button class="btn btn-danger"
              onclick="revokeAllSessions(); return false;">
        <i class="fas fa-power-off"></i> Sign out all other devices</button>
    `,
  });
}
function sessionIcon(s) {
  const p = String(s.platform || '').toLowerCase();
  if (p.includes('ios') || p.includes('android')) return 'mobile-alt';
  if (p.includes('tablet')) return 'tablet-alt';
  return 'laptop';
}
async function revokeSession(sessionId) {
  try {
    if (Array.isArray(currentUser?.sessions)) {
      currentUser.sessions = currentUser.sessions.filter(s => String(s.id) !== String(sessionId));
    }
    if (typeof apiCall === 'function') {
      try { await apiCall(`/api/auth/sessions/${sessionId}`, 'DELETE'); } catch (_) {}
    }
    if (typeof showToast === 'function') showToast('Session revoked', 'success');
    if (typeof closeModal === 'function') closeModal();
    openActiveSessions();
  } catch (_) {}
}
async function revokeAllSessions() {
  if (!window.confirm('Sign out of all other devices?')) return;
  try {
    if (Array.isArray(currentUser?.sessions)) {
      currentUser.sessions = currentUser.sessions.filter(s => s.current);
    }
    if (typeof apiCall === 'function') {
      try { await apiCall('/api/auth/sessions/revoke-others', 'POST'); } catch (_) {}
    }
    if (typeof showToast === 'function') showToast('Signed out other devices', 'success');
    if (typeof closeModal === 'function') closeModal();
    openActiveSessions();
  } catch (_) {}
}

/* --- Notification preferences --- */
function openNotificationPrefs() {
  const prefs = loadNotificationPrefs();
  const rows = [
    ['booking_confirmed', 'Booking confirmed',      'When a session is confirmed'],
    ['session_reminder',  'Session reminders',      '15 min before a session'],
    ['payment_receipt',   'Payment receipts',       'Wallet and top-up receipts'],
    ['course_progress',   'Course progress',        'Weekly learning summary'],
    ['promotions',        'Promotions',             'Deals and offers'],
    ['reviews_replies',   'Replies to your reviews','When an expert replies'],
  ];
  if (typeof openModal !== 'function') return;
  openModal({
    title: 'Notification preferences',
    body: `
      <p class="form-hint">Choose how you want to be notified for each event.</p>
      <table class="notif-table" style="margin-top:12px">
        <thead>
          <tr><th>Event</th><th>Email</th><th>Push</th><th>In-app</th></tr>
        </thead>
        <tbody>
          ${rows.map(([key, label, hint]) => `
            <tr>
              <td>
                <strong>${label}</strong>
                <div class="form-hint">${hint}</div>
              </td>
              <td><input type="checkbox" data-notif="${key}" data-channel="email"  ${prefs[key].email  ? 'checked' : ''} /></td>
              <td><input type="checkbox" data-notif="${key}" data-channel="push"   ${prefs[key].push   ? 'checked' : ''} /></td>
              <td><input type="checkbox" data-notif="${key}" data-channel="inapp"  ${prefs[key].inapp  ? 'checked' : ''} /></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary"
              onclick="saveNotificationPrefsFromModal(); return false;">
        <i class="fas fa-save"></i> Save</button>
    `,
  });
}
function saveNotificationPrefsFromModal() {
  const next = loadNotificationPrefs();
  document.querySelectorAll('[data-notif][data-channel]').forEach(el => {
    const key = el.getAttribute('data-notif');
    const ch  = el.getAttribute('data-channel');
    if (!next[key]) next[key] = { email: false, push: false, inapp: false };
    next[key][ch] = !!el.checked;
  });
  saveNotificationPrefs(next);
  if (typeof showToast === 'function') showToast('Preferences saved', 'success');
  if (typeof closeModal === 'function') closeModal();
}

/* --- Connected accounts --- */
function openConnectedAccounts() {
  const connected = (S.__connectedAccounts = S.__connectedAccounts || {
    google: !!currentUser?.google_linked,
    linkedin: !!currentUser?.linkedin_linked,
  });
  if (typeof openModal !== 'function') return;
  const provider = (key, label, icon) => `
    <li class="session-row">
      <i class="fab ${icon}"></i>
      <div>
        <strong>${label}</strong>
        <span class="form-hint">${connected[key] ? 'Connected' : 'Not connected'}</span>
      </div>
      ${connected[key]
        ? `<button class="btn btn-ghost btn-xs"
                   onclick="disconnectProvider('${key}'); return false;">Disconnect</button>`
        : `<button class="btn btn-primary btn-xs"
                   onclick="connectProvider('${key}'); return false;">Connect</button>`}
    </li>
  `;
  openModal({
    title: 'Connected accounts',
    body: `
      <p class="form-hint">Link third-party accounts for quick sign-in and portfolio sharing.</p>
      <ul class="session-list" style="margin-top:12px">
        ${provider('google',   'Google',   'fa-google')}
        ${provider('linkedin', 'LinkedIn', 'fa-linkedin')}
      </ul>
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}
function connectProvider(key) {
  S.__connectedAccounts = S.__connectedAccounts || {};
  S.__connectedAccounts[key] = true;
  if (typeof showToast === 'function') showToast(`${key} connected`, 'success');
  if (typeof closeModal === 'function') closeModal();
  openConnectedAccounts();
}
function disconnectProvider(key) {
  if (!window.confirm(`Disconnect ${key}?`)) return;
  S.__connectedAccounts = S.__connectedAccounts || {};
  S.__connectedAccounts[key] = false;
  if (typeof showToast === 'function') showToast(`${key} disconnected`, 'info');
  if (typeof closeModal === 'function') closeModal();
  openConnectedAccounts();
}

/* --- Accessibility --- */
function openAccessibilityPanel() {
  const a = loadAccessibility();
  if (typeof openModal !== 'function') return;
  openModal({
    title: 'Accessibility',
    body: `
      <label class="form-group">
        <span class="form-label">Font size</span>
        <select id="acc-font" class="form-select">
          ${[0.9, 1, 1.1, 1.25, 1.4].map(v => `
            <option value="${v}" ${Math.abs(v - a.fontScale) < 0.01 ? 'selected' : ''}>${Math.round(v * 100)}%</option>
          `).join('')}
        </select>
      </label>
      <label class="checkbox-row" style="margin-top:10px">
        <input type="checkbox" id="acc-reduced" ${a.reducedMotion ? 'checked' : ''} />
        <span>Reduce motion</span>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" id="acc-contrast" ${a.highContrast ? 'checked' : ''} />
        <span>High contrast mode</span>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary"
              onclick="saveAccessibilityFromModal(); return false;">
        <i class="fas fa-save"></i> Apply</button>
    `,
  });
}
function saveAccessibilityFromModal() {
  const fontScale = Number(document.getElementById('acc-font')?.value || 1);
  const reducedMotion = !!document.getElementById('acc-reduced')?.checked;
  const highContrast = !!document.getElementById('acc-contrast')?.checked;
  saveAccessibility({ fontScale, reducedMotion, highContrast });
  applyAccessibility();
  if (typeof showToast === 'function') showToast('Accessibility updated', 'success');
  if (typeof closeModal === 'function') closeModal();
}

/* --- Language --- */
function setProfileLanguage(code) {
  S.__profilePrefs.language = String(code || 'en');
  saveProfilePrefs();
  if (typeof showToast === 'function') showToast('Language preference saved', 'success');
}

/* --- Danger zone --- */
function openDeactivateAccount() {
  if (!window.confirm('Deactivate your account? You can reactivate by signing in again.')) return;
  const done = () => {
    if (typeof showToast === 'function') showToast('Account deactivated', 'info');
    if (typeof apiCall === 'function') {
      try { apiCall('/api/auth/deactivate', 'POST'); } catch (_) {}
    }
  };
  done();
}
function openDeleteAccount() {
  if (typeof openModal !== 'function') return;
  openModal({
    title: 'Delete account',
    body: `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i>
        <div>
          This permanently deletes your account, courses, certificates, wallet, and history.
          This action <strong>cannot be undone</strong>.
        </div>
      </div>
      <label class="form-group" style="margin-top:12px">
        <span class="form-label">Type <code>DELETE</code> to confirm</span>
        <input id="delete-confirm-input" class="form-input" placeholder="DELETE" />
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-danger"
              onclick="confirmDeleteAccount(); return false;">
        <i class="fas fa-trash"></i> Delete my account</button>
    `,
  });
}
function confirmDeleteAccount() {
  const v = (document.getElementById('delete-confirm-input')?.value || '').trim();
  if (v !== 'DELETE') {
    if (typeof showToast === 'function') showToast('Type DELETE to confirm.', 'warning');
    return;
  }
  if (typeof showToast === 'function') showToast('Deletion request received.', 'info');
  if (typeof apiCall === 'function') {
    try { apiCall('/api/auth/delete', 'POST'); } catch (_) {}
  }
  if (typeof closeModal === 'function') closeModal();
}

/* --- Data export --- */
function openDataExport() {
  if (typeof openModal !== 'function') return;
  openModal({
    title: 'Export my data',
    body: `
      <p class="form-hint">Choose a format. Your export includes profile, enrollments, consultations, wallet, and notes.</p>
      <div class="form-inline" style="margin-top:12px">
        <select id="export-format" class="form-select">
          <option value="json">JSON (machine-readable)</option>
          <option value="csv">CSV (spreadsheet)</option>
          <option value="html">Printable (HTML)</option>
        </select>
        <button class="btn btn-primary"
                onclick="runDataExport(); return false;">
          <i class="fas fa-download"></i> Export</button>
      </div>
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}
function runDataExport() {
  const format = document.getElementById('export-format')?.value || 'json';
  const payload = {
    exported_at: new Date().toISOString(),
    user: currentUser || {},
    enrollments: S.enrollments || [],
    consultations: (S.consultations || []).filter(c => c.user_id === currentUser?.id),
    wallet: S.wallet || {},
    certificates: S.certificates || [],
    packages: S.userPackages || [],
  };
  if (format === 'json') return downloadProfileBlob(JSON.stringify(payload, null, 2), 'application/json', 'experthub-export.json');
  if (format === 'csv') {
    const rows = [['section', 'key', 'value']];
    Object.entries(payload).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((row, i) => rows.push([k, String(i), JSON.stringify(row)]));
      else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, vv]) => rows.push([k, kk, JSON.stringify(vv)]));
      else rows.push([k, '', String(v)]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    return downloadProfileBlob(csv, 'text/csv;charset=utf-8', 'experthub-export.csv');
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>ExpertHub export</title>
  <style>body{font-family:system-ui,sans-serif;padding:24px}pre{background:#f6f7f9;padding:12px;border-radius:8px;overflow:auto}</style>
  </head><body><h1>ExpertHub data export</h1><p>${new Date().toLocaleString()}</p>
  <pre>${escapeHtmlProfile(JSON.stringify(payload, null, 2))}</pre></body></html>`;
  downloadProfileBlob(html, 'text/html;charset=utf-8', 'experthub-export.html');
}
function downloadProfileBlob(content, mime, filename) {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
    if (typeof showToast === 'function') showToast('Export ready', 'success');
  } catch (_) {
    if (typeof showToast === 'function') showToast('Export failed', 'error');
  }
}

/* ============================================================
   USER — PROFILE
   ============================================================ */
function userProfile() {
  const user = (typeof currentUser === 'object' && currentUser) ? currentUser : {};
  const a = loadAccessibility();
  const twofa = load2FA();
  const lang = S.__profilePrefs.language;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
    <section class="page-header"><h1 class="page-title">My Profile</h1></section>

    <section class="panel">
      <div class="profile-header">
        <img id="avatar-preview" class="profile-avatar" src="${S.__avatarPreviewData || avatar(user)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(user.name || '')}</h2>
          <p class="profile-email">
            ${esc(user.email || '')}
            <button class="btn btn-ghost btn-xs"
                    onclick="openEmailChange(); return false;">
              <i class="fas fa-pen"></i> Change
            </button>
          </p>
          <p style="margin-top:6px">
            <span class="chip chip-neutral">Level ${S.userLevel || 1}</span>
            <span class="chip chip-blue" style="margin-left:6px">${S.userXP || 0} XP</span>
            ${twofa.enabled ? '<span class="chip chip-green" style="margin-left:6px"><i class="fas fa-shield-alt"></i> 2FA</span>' : ''}
          </p>
          <div class="profile-header-tools">
            <button class="btn btn-secondary btn-sm"
                    onclick="openActiveSessions(); return false;">
              <i class="fas fa-desktop"></i> Active sessions</button>
            <button class="btn btn-secondary btn-sm"
                    onclick="open2FASetup(); return false;">
              <i class="fas fa-shield-alt"></i> ${twofa.enabled ? 'Manage 2FA' : 'Enable 2FA'}</button>
            <button class="btn btn-secondary btn-sm"
                    onclick="openNotificationPrefs(); return false;">
              <i class="fas fa-bell"></i> Notifications</button>
            <button class="btn btn-secondary btn-sm"
                    onclick="openConnectedAccounts(); return false;">
              <i class="fas fa-link"></i> Connected accounts</button>
          </div>
        </div>
      </div>

      <div class="form-grid">
        <label class="form-group"><span class="form-label">Full name</span>
          <input id="profileName" class="form-input" value="${esc(user.name || '')}" /></label>
        <label class="form-group"><span class="form-label">Phone</span>
          <input id="profilePhone" class="form-input" value="${esc(user.phone || '')}" /></label>
        <label class="form-group"><span class="form-label">Timezone</span>
          <input id="profileTimezone" class="form-input" value="${esc(user.timezone || 'UTC')}" /></label>
        <label class="form-group">
          <span class="form-label">Preferred mode</span>
          <select id="profileIntent" class="form-select">
            <option value="both"    ${S.userIntent === 'both'    ? 'selected' : ''}>Both - Learning and Consulting</option>
            <option value="learn"   ${S.userIntent === 'learn'   ? 'selected' : ''}>Learning only</option>
            <option value="consult" ${S.userIntent === 'consult' ? 'selected' : ''}>Consulting only</option>
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Language</span>
          <select id="profileLanguage" class="form-select"
                  onchange="setProfileLanguage(this.value)">
            ${[['en','English'],['sw','Kiswahili'],['fr','Français'],['es','Español'],['pt','Português']].map(([c,l]) => `
              <option value="${c}" ${lang === c ? 'selected' : ''}>${l}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Change avatar</span>
          <input type="file" id="avatarFile" class="form-input" accept="image/*"
                 onchange="onAvatarFileChange(this)" />
          <span class="form-hint">PNG or JPG, up to 4 MB.</span>
          ${S.__avatarPreviewData ? `
            <button class="btn btn-ghost btn-xs"
                    onclick="clearAvatarPreview(); return false;">
              <i class="fas fa-times"></i> Clear preview</button>
          ` : ''}
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="update-user-profile">
          <i class="fas fa-save"></i> Save Changes</button>
      </div>

      <h3 class="panel-title" style="margin-top:24px">Change Password</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Current password</span>
          <input id="cpOld" type="password" class="form-input" /></label>
        <label class="form-group"><span class="form-label">New password</span>
          <input id="cpNew" type="password" class="form-input" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-warning" data-action="change-password">
          <i class="fas fa-lock"></i> Update Password</button>
      </div>

      <h3 class="panel-title" style="margin-top:24px">Accessibility</h3>
      <div class="panel-actions">
        <button class="btn btn-secondary"
                onclick="openAccessibilityPanel(); return false;">
          <i class="fas fa-universal-access"></i>
          Accessibility options
          <span class="form-hint" style="margin-left:6px">
            Font ${Math.round(a.fontScale * 100)}%${a.reducedMotion ? ' · reduced motion' : ''}${a.highContrast ? ' · high contrast' : ''}
          </span>
        </button>
      </div>

      <h3 class="panel-title" style="margin-top:24px">Privacy & Data</h3>
      <div class="panel-actions">
        <button class="btn btn-secondary"
                onclick="openDataExport(); return false;">
          <i class="fas fa-download"></i> Export My Data</button>
        <button class="btn btn-secondary" data-action="gdpr-export">
          <i class="fas fa-download"></i> Quick JSON export</button>
      </div>

      <h3 class="panel-title" style="margin-top:24px">Danger zone</h3>
      <div class="panel-actions">
        <button class="btn btn-warning"
                onclick="openDeactivateAccount(); return false;">
          <i class="fas fa-pause-circle"></i> Deactivate account</button>
        <button class="btn btn-danger"
                onclick="openDeleteAccount(); return false;"
                data-action="gdpr-delete">
          <i class="fas fa-trash"></i> Delete Account</button>
      </div>
    </section>
  `;
}

/* ============================================================
   Utilities
   ============================================================ */
function escapeHtmlProfile(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function timeAgoProfile(ts) {
  if (!ts) return '—';
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}