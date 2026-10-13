/* ============================================================
   dashboards/institution/branding.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const inst = S.institutionBranding || S.myInstitution || {};
    const primary = inst.primary_color || '#1e3a8a';
    const accent  = inst.accent_color  || '#059669';

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Custom Branding' }])}
      ${EH.Layout.pageHeader('Custom Branding')}

      <section class="panel">
        <h3 class="panel-title">Logo & Colours</h3>
        <div class="form-grid">
          <label class="form-group form-group-full">
            <span class="form-label">Institution logo</span>
            <input type="file" id="brandLogo" class="form-input" accept="image/*" />
            ${inst.logo_url
              ? `<img src="${EH.Fmt.esc(inst.logo_url)}" alt="Current logo" style="max-height:60px;margin-top:8px" />`
              : ''}
            <p class="form-hint">Recommended: 256×256 PNG or SVG, transparent background</p>
          </label>
          <label class="form-group"><span class="form-label">Primary colour</span>
            <input type="color" id="brandPrimary" class="form-input" value="${EH.Fmt.esc(primary)}" /></label>
          <label class="form-group"><span class="form-label">Accent colour</span>
            <input type="color" id="brandAccent" class="form-input" value="${EH.Fmt.esc(accent)}" /></label>
        </div>
      </section>

      <section class="panel">
        <h3 class="panel-title">Custom Domain</h3>
        <div class="form-grid">
          <label class="form-group">
            <span class="form-label">Subdomain</span>
            <input id="brandSubdomain" class="form-input"
                   value="${EH.Fmt.esc(inst.subdomain || '')}" placeholder="acme" />
            <p class="form-hint">Your portal URL: acme.experthub.com</p>
          </label>
          <label class="form-group">
            <span class="form-label">Custom domain</span>
            <input id="brandDomain" class="form-input"
                   value="${EH.Fmt.esc(inst.custom_domain || '')}"
                   placeholder="training.acme.com" disabled />
            <p class="form-hint">Available on Enterprise plan. Contact sales.</p>
          </label>
        </div>
      </section>

      <section class="panel">
        <h3 class="panel-title">Email & Welcome</h3>
        <div class="form-grid">
          <label class="form-group"><span class="form-label">Sender name</span>
            <input id="brandEmailName" class="form-input"
                   value="${EH.Fmt.esc(inst.email_sender_name || '')}" placeholder="ACME Academy" /></label>
          <label class="form-group"><span class="form-label">Reply-to address</span>
            <input id="brandEmailAddr" type="email" class="form-input"
                   value="${EH.Fmt.esc(inst.email_sender_address || '')}"
                   placeholder="training@acme.com" /></label>
          <label class="form-group form-group-full">
            <span class="form-label">Welcome message shown to trainees on first login</span>
            <textarea id="brandWelcome" class="form-textarea" rows="3">${EH.Fmt.esc(inst.welcome_message || '')}</textarea>
          </label>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" data-action="save-branding">
            <i class="fas fa-save"></i> Save Branding</button>
        </div>
      </section>

      <section class="panel">
        <h3 class="panel-title">Preview</h3>
        <div class="brand-preview" style="
          background: linear-gradient(135deg, ${EH.Fmt.esc(primary)}, ${EH.Fmt.esc(accent)});
          color: #fff; padding: 32px; border-radius: var(--r-lg); text-align: center;
          box-shadow: var(--shadow-md)">
          ${inst.logo_url
            ? `<img src="${EH.Fmt.esc(inst.logo_url)}" alt=""
                    style="height:56px;margin:0 auto 16px;filter:brightness(0) invert(1)" />`
            : ''}
          <h2 style="margin:0;color:#fff;font-size:1.5rem">${EH.Fmt.esc(inst.name || 'Your Institution')}</h2>
          <p style="margin:8px 0 0;opacity:.9;font-size:.9rem">Training Portal</p>
        </div>
      </section>`;
  }

  EH.InstBranding = { render };
})(window);
