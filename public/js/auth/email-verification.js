/* ============================================================
   auth/email-verification.js — Certificate verification screen
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  async function render(serial) {
    EH.state.appPhase = 'verify';
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <main class="auth-page">
        <section class="auth-card" style="max-width:640px">
          <div style="text-align:center">
            <div class="spinner" style="margin:40px auto"></div>
            <p class="form-hint">Verifying certificate...</p>
          </div>
        </section>
      </main>`;

    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(serial)}`);
      const d = await res.json();
      const valid = !!d.valid;
      const c = d.certificate || {};

      root.innerHTML = `
        <main class="auth-page">
          <section class="auth-card" style="max-width:640px;text-align:center">
            <div class="auth-logo" style="background:${valid
              ? 'linear-gradient(135deg,#059669,#065f46)'
              : 'linear-gradient(135deg,#dc2626,#b91c1c)'}">
              <i class="fas fa-${valid ? 'check' : 'times'}"></i>
            </div>
            <h1 class="auth-title">
              ${valid ? 'Certificate Verified'
                     : 'Certificate ' + (d.status === 'expired' ? 'Expired' : 'Not Found')}
            </h1>
            <p class="auth-subtitle">
              ${valid ? 'This certificate is authentic and currently valid.'
                      : 'This certificate is not currently valid.'}
            </p>
            ${c.serial ? `
              <div class="verify-details">
                <p><strong>Holder:</strong> ${EH.Fmt.esc(c.trainee_name)}</p>
                <p><strong>Awarded:</strong> ${EH.Fmt.esc(c.title)}</p>
                <p><strong>Issued by:</strong> ${EH.Fmt.esc(c.institution_name || 'ExpertHub')}</p>
                ${c.awarding_body ? `<p><strong>Awarding body:</strong> ${EH.Fmt.esc(c.awarding_body)}</p>` : ''}
                ${c.cpd_points ? `<p><strong>CPD points:</strong> ${c.cpd_points}</p>` : ''}
                <p><strong>Serial:</strong> <code class="code">${EH.Fmt.esc(c.serial)}</code></p>
                <p><strong>Issued:</strong> ${EH.Dates.fmtDate(c.issued_at)}</p>
                <p><strong>Expires:</strong> ${c.expires_at ? EH.Dates.fmtDate(c.expires_at) : 'Never'}</p>
              </div>` : ''}
            <a href="#/" class="link link-center">Back to ExpertHub</a>
          </section>
        </main>`;
    } catch (_) {
      root.innerHTML = `
        <main class="auth-page">
          <section class="auth-card" style="text-align:center">
            <div class="auth-logo" style="background:linear-gradient(135deg,#dc2626,#b91c1c)">
              <i class="fas fa-times"></i>
            </div>
            <h1 class="auth-title">Verification Unavailable</h1>
            <p class="auth-subtitle">Please try again later.</p>
            <a href="#/" class="link link-center">Back to ExpertHub</a>
          </section>
        </main>`;
    }
  }

  EH.VerifyView = { render };
  global.renderVerify = render;
})(window);
