/* ============================================================
   ExpertHub 2.0 — 30-2fa.js
   TOTP 2FA: setup with QR, verify, disable, backup codes.
   Pure Web Crypto (HMAC-SHA1) — no external deps required.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EH2FA = window.EH2FA || {};

  const SECRET_STORAGE = 'eh.2fa.secret';
  const BACKUP_STORAGE = 'eh.2fa.backup';
  const ENABLED_KEY    = 'eh.2fa.enabled';

  /* ---------- base32 (RFC 4648) ---------- */
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function base32Encode(bytes) {
    let bits = 0, value = 0, output = '';
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        output += B32[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) output += B32[(value << (5 - bits)) & 31];
    return output;
  }

  function base32Decode(input) {
    const clean = String(input).toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    let bits = 0, value = 0;
    const bytes = [];
    for (let i = 0; i < clean.length; i++) {
      const idx = B32.indexOf(clean[i]);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return new Uint8Array(bytes);
  }

  /* ---------- TOTP (RFC 6238) ---------- */
  async function hmacSha1(keyBytes, msgBytes) {
    const key = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, msgBytes);
    return new Uint8Array(sig);
  }

  async function totp(secretBase32, forTime = Date.now(), digits = 6, period = 30) {
    const key = base32Decode(secretBase32);
    const counter = Math.floor(forTime / 1000 / period);
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    // JS numbers are safe up to 2^53; write high and low 32 bits
    view.setUint32(0, Math.floor(counter / 0x100000000));
    view.setUint32(4, counter & 0xffffffff);
    const hash = await hmacSha1(key, new Uint8Array(buf));
    const offset = hash[hash.length - 1] & 0x0f;
    const code =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
       (hash[offset + 3] & 0xff);
    const otp = code % Math.pow(10, digits);
    return String(otp).padStart(digits, '0');
  }

  async function verifyCode(secret, code, window = 1) {
    const now = Date.now();
    for (let w = -window; w <= window; w++) {
      const expected = await totp(secret, now + w * 30000);
      if (expected === String(code).trim()) return true;
    }
    return false;
  }

  /* ---------- secret generation ---------- */
  function generateSecret(length = 20) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return base32Encode(bytes);
  }

  function generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const b = new Uint8Array(6);
      crypto.getRandomValues(b);
      const hex = Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
      codes.push(hex.slice(0, 4) + '-' + hex.slice(4, 8) + '-' + hex.slice(8, 12));
    }
    return codes;
  }

  /* ---------- state ---------- */
  function isEnabled() {
    return localStorage.getItem(ENABLED_KEY) === '1' && !!localStorage.getItem(SECRET_STORAGE);
  }

  function getSecret() {
    return localStorage.getItem(SECRET_STORAGE) || '';
  }

  /* ---------- UI: settings card ---------- */
  function renderTwoFactorCard() {
    const enabled = isEnabled();
    const backupCount = (JSON.parse(localStorage.getItem(BACKUP_STORAGE) || '[]')).length;
    return `
      <h3 class="panel-title" style="margin-top:24px">Two-factor authentication</h3>
      <div class="twofa-card ${enabled ? 'is-on' : 'is-off'}">
        <div class="twofa-card__icon">
          <i class="fas ${enabled ? 'fa-shield-alt' : 'fa-shield'}"></i>
        </div>
        <div class="twofa-card__body">
          <strong>${enabled ? 'Two-factor is ON' : 'Protect your account'}</strong>
          <p class="muted">
            ${enabled
              ? `You'll be prompted for a 6-digit code from your authenticator app on new sign-ins. ${backupCount ? backupCount + ' backup codes remain.' : ''}`
              : 'Add a second step to sign-in using an authenticator app (Google Authenticator, 1Password, Authy, etc.).'}
          </p>
        </div>
        <div class="twofa-card__actions">
          ${enabled
            ? `<button class="btn btn-secondary" data-action="2fa-regenerate-backup">
                 <i class="fas fa-key"></i> Backup codes</button>
               <button class="btn btn-danger" data-action="2fa-disable">
                 <i class="fas fa-shield-slash"></i> Disable</button>`
            : `<button class="btn btn-primary" data-action="2fa-setup">
                 <i class="fas fa-lock"></i> Set up 2FA</button>`}
        </div>
      </div>`;
  }

  /* ---------- setup flow ---------- */
  function openSetup() {
    const secret = generateSecret();
    const issuer = 'ExpertHub';
    const account = currentUser?.email || currentUser?.name || 'you';
    const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`
      + `?secret=${secret}&issuer=${encodeURIComponent(issuer)}`
      + `&algorithm=SHA1&digits=6&period=30`;

    window.__eh2faSetup = { secret };

    openModal({
      title: 'Set up two-factor authentication',
      className: 'modal-lg',
      body: `
        <ol class="twofa-steps">
          <li>
            <strong>Install an authenticator app</strong>
            <p class="muted">Google Authenticator, Authy, 1Password, or any TOTP app.</p>
          </li>
          <li>
            <strong>Scan this QR code</strong>
            <div class="twofa-qr-wrap">
              <div id="twofa-qr"></div>
              <div class="twofa-qr-manual">
                <p class="muted">Can't scan? Enter this key manually:</p>
                <code class="code twofa-secret">${secret}</code>
                <button class="btn btn-secondary btn-sm" id="twofa-copy-secret">
                  <i class="fas fa-copy"></i> Copy</button>
              </div>
            </div>
          </li>
          <li>
            <strong>Enter the code from your app</strong>
            <input id="twofa-verify" class="form-input twofa-input"
                   placeholder="000000" inputmode="numeric" autocomplete="one-time-code" maxlength="6" />
            <div class="twofa-feedback" id="twofa-feedback"></div>
          </li>
        </ol>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button class="btn btn-primary" id="twofa-verify-btn" disabled>
          <i class="fas fa-check"></i> Verify &amp; enable</button>`,
    });

    // Try rendering QR via qrcodejs if loaded
    const qrHost = document.getElementById('twofa-qr');
    if (window.QRCode && qrHost) {
      new window.QRCode(qrHost, {
        text: otpauth, width: 200, height: 200,
        colorDark: '#0f172a', colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M,
      });
    } else if (qrHost) {
      qrHost.innerHTML = `<a href="${otpauth}" class="btn btn-secondary">Open authenticator app</a>`;
    }

    document.getElementById('twofa-copy-secret').onclick = () => {
      navigator.clipboard?.writeText(secret).then(() => showToast('Secret copied', 'success'));
    };

    const input = document.getElementById('twofa-verify');
    const verifyBtn = document.getElementById('twofa-verify-btn');
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
      verifyBtn.disabled = input.value.length !== 6;
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !verifyBtn.disabled) verifyBtn.click();
    });
    input.focus();

    verifyBtn.onclick = async () => {
      const code = input.value;
      const ok = await verifyCode(secret, code);
      const fb = document.getElementById('twofa-feedback');
      if (!ok) {
        fb.innerHTML = '<span style="color:var(--danger)">That code doesn\'t match. Check that your device clock is accurate, then try the next code.</span>';
        input.value = '';
        verifyBtn.disabled = true;
        return;
      }
      localStorage.setItem(SECRET_STORAGE, secret);
      localStorage.setItem(ENABLED_KEY, '1');

      // Generate and show backup codes
      const codes = generateBackupCodes(8);
      localStorage.setItem(BACKUP_STORAGE, JSON.stringify(codes));
      await apiCall('/api/auth/2fa/enable', 'POST', { secret }).catch(() => {});

      closeModal();
      showBackupCodes(codes, true);

      window.EHNotifications?.push({
        kind: 'achievement',
        title: '2FA enabled',
        body: 'Your account is now protected with two-factor authentication.',
      });
      if (typeof window.renderUserDashboard === 'function') window.renderUserDashboard();
    };
  }

  function showBackupCodes(codes, justEnabled) {
    openModal({
      title: 'Save your backup codes',
      body: `
        <p>
          Each code can be used <strong>once</strong> if you lose access to your authenticator app.
          Store them somewhere safe — your password manager is ideal.
        </p>
        <div class="twofa-backup-grid">
          ${codes.map(c => `<code class="code twofa-backup-code">${c}</code>`).join('')}
        </div>
        <div class="panel-actions" style="margin-top:14px">
          <button class="btn btn-secondary" id="twofa-copy-codes">
            <i class="fas fa-copy"></i> Copy all</button>
          <button class="btn btn-secondary" id="twofa-download-codes">
            <i class="fas fa-download"></i> Download .txt</button>
        </div>
        ${justEnabled ? `
          <div class="alert alert-warning" style="margin-top:14px">
            <i class="fas fa-exclamation-triangle"></i>
            <div>If you lose both your device and these codes, you'll be locked out of your account.</div>
          </div>` : ''}
      `,
      footer: `<button class="btn btn-secondary" data-close-modal>I've saved them</button>`,
    });

    document.getElementById('twofa-copy-codes').onclick = () => {
      navigator.clipboard?.writeText(codes.join('\n'))
        .then(() => showToast('Backup codes copied', 'success'));
    };
    document.getElementById('twofa-download-codes').onclick = () => {
      const blob = new Blob([`ExpertHub backup codes — generated ${new Date().toISOString()}\n\n${codes.join('\n')}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'experthub-backup-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
    };
  }

  /* ---------- disable / regenerate ---------- */
  function disable2FA() {
    openModal({
      title: 'Disable two-factor authentication',
      body: `
        <p>This will remove the second step from your sign-in. Your account will be less secure.</p>
        <label class="form-group">
          <span class="form-label">Enter a code from your authenticator app to confirm</span>
          <input id="twofa-disable-input" class="form-input twofa-input"
                 placeholder="000000" inputmode="numeric" maxlength="6" />
        </label>`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button class="btn btn-danger" id="twofa-disable-confirm">Disable</button>`,
    });

    const input = document.getElementById('twofa-disable-input');
    input.focus();
    document.getElementById('twofa-disable-confirm').onclick = async () => {
      const ok = await verifyCode(getSecret(), input.value);
      if (!ok) return showToast('Invalid code', 'error');
      localStorage.removeItem(SECRET_STORAGE);
      localStorage.removeItem(BACKUP_STORAGE);
      localStorage.removeItem(ENABLED_KEY);
      await apiCall('/api/auth/2fa/disable', 'POST', {}).catch(() => {});
      closeModal();
      showToast('Two-factor disabled', 'info');
      if (typeof window.renderUserDashboard === 'function') window.renderUserDashboard();
    };
  }

  function regenerateBackupCodes() {
    const codes = generateBackupCodes(8);
    localStorage.setItem(BACKUP_STORAGE, JSON.stringify(codes));
    showBackupCodes(codes, false);
  }

  /* ---------- sign-in gate (used by 05-auth when enabled) ---------- */
  async function promptAtSignIn() {
    if (!isEnabled()) return true;
    return new Promise(resolve => {
      openModal({
        title: 'Two-factor verification',
        body: `
          <p class="muted">Enter the 6-digit code from your authenticator app.</p>
          <input id="twofa-signin-input" class="form-input twofa-input"
                 placeholder="000000" inputmode="numeric" maxlength="6" />
          <p class="muted" style="margin-top:12px">
            <a href="#" id="twofa-use-backup">Use a backup code instead</a>
          </p>`,
        className: 'modal-sm',
        footer: `
          <button class="btn btn-secondary" id="twofa-signin-cancel">Cancel</button>
          <button class="btn btn-primary" id="twofa-signin-submit" disabled>Verify</button>`,
        onClose: () => resolve(false),
      });

      const input = document.getElementById('twofa-signin-input');
      const submit = document.getElementById('twofa-signin-submit');
      input.focus();
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 6);
        submit.disabled = input.value.length !== 6;
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !submit.disabled) submit.click();
      });

      document.getElementById('twofa-use-backup').onclick = e => {
        e.preventDefault();
        input.placeholder = 'Backup code';
        input.maxLength = 14;
        input.removeAttribute('inputmode');
        input.addEventListener('input', () => { submit.disabled = input.value.length < 8; });
      };

      submit.onclick = async () => {
        const val = input.value.trim();
        // Try TOTP first
        if (/^\d{6}$/.test(val)) {
          const ok = await verifyCode(getSecret(), val);
          if (ok) { closeModal(); resolve(true); return; }
        }
        // Try backup
        const codes = JSON.parse(localStorage.getItem(BACKUP_STORAGE) || '[]');
        const idx = codes.indexOf(val);
        if (idx >= 0) {
          codes.splice(idx, 1);
          localStorage.setItem(BACKUP_STORAGE, JSON.stringify(codes));
          closeModal(); resolve(true); return;
        }
        showToast('Invalid code', 'error');
        input.value = '';
        submit.disabled = true;
      };

      document.getElementById('twofa-signin-cancel').onclick = () => {
        closeModal(); resolve(false);
      };
    });
  }

  /* ---------- delegated handlers ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    if (a === '2fa-setup')              { e.preventDefault(); openSetup(); }
    if (a === '2fa-disable')            { e.preventDefault(); disable2FA(); }
    if (a === '2fa-regenerate-backup')  { e.preventDefault(); regenerateBackupCodes(); }
  });

  /* ---------- public ---------- */
  NS.isEnabled = isEnabled;
  NS.setup = openSetup;
  NS.disable = disable2FA;
  NS.promptAtSignIn = promptAtSignIn;
  NS.generateBackupCodes = generateBackupCodes;
  NS.verify = verifyCode;
  NS.totp = totp;

  /* expose card renderer for userProfile() */
  window.renderTwoFactorCard = renderTwoFactorCard;