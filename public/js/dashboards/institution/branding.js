/* ============================================================
   ExpertHub 2.0 — Custom Branding
   Themes, logo, certificate branding, email templates,
   report headers, branded login, white-label settings.
   ============================================================ */

function instBranding() {
  const inst = S.institutionBranding || S.myInstitution || {};
  const primary = inst.primary_color || '#1e3a8a';
  const accent  = inst.accent_color || '#059669';
  const canWrite = hasInstitutionPermission('operations:*');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Custom Branding</span></div>
    <section class="page-header"><h1 class="page-title">Custom Branding</h1></section>

    <section class="panel">
      <h3 class="panel-title">Logo and Colours</h3>
      <div class="form-grid">
        <label class="form-group form-group-full">
          <span class="form-label">Institution logo</span>
          <input type="file" id="brandLogo" class="form-input" accept="image/*" ${!canWrite ? 'disabled' : ''} />
          ${inst.logo_url ? `<img src="${esc(inst.logo_url)}" alt="Current logo" style="max-height:60px;margin-top:8px" />` : ''}
        </label>
        <label class="form-group"><span class="form-label">Primary colour</span>
          <input type="color" id="brandPrimary" class="form-input" value="${esc(primary)}" ${!canWrite ? 'disabled' : ''} /></label>
        <label class="form-group"><span class="form-label">Accent colour</span>
          <input type="color" id="brandAccent" class="form-input" value="${esc(accent)}" ${!canWrite ? 'disabled' : ''} /></label>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Certificate & Report Branding</h3>
      <div class="form-grid">
        <label class="form-group form-group-full">
          <span class="form-label">Certificate header HTML</span>
          <textarea id="brandCertHeader" class="form-textarea" rows="3" ${!canWrite ? 'disabled' : ''}>${esc(inst.certificate_header || '')}</textarea>
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Report header HTML</span>
          <textarea id="brandReportHeader" class="form-textarea" rows="3" ${!canWrite ? 'disabled' : ''}>${esc(inst.report_header || '')}</textarea>
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Certificate footer text</span>
          <textarea id="brandCertFooter" class="form-textarea" rows="2" ${!canWrite ? 'disabled' : ''}>${esc(inst.certificate_footer || '')}</textarea>
        </label>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Email and Welcome</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Sender name</span>
          <input id="brandEmailName" class="form-input"
                 value="${esc(inst.email_sender_name || '')}" placeholder="ACME Academy" ${!canWrite ? 'disabled' : ''} /></label>
        <label class="form-group"><span class="form-label">Reply-to address</span>
          <input id="brandEmailAddr" type="email" class="form-input"
                 value="${esc(inst.email_sender_address || '')}" ${!canWrite ? 'disabled' : ''} /></label>
        <label class="form-group form-group-full">
          <span class="form-label">Welcome message</span>
          <textarea id="brandWelcome" class="form-textarea" rows="3" ${!canWrite ? 'disabled' : ''}>${esc(inst.welcome_message || '')}</textarea>
        </label>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">White-Label Settings</h3>
      <label class="checkbox-row">
        <input type="checkbox" id="brandWhiteLabel" ${inst.white_label ? 'checked' : ''} ${!canWrite ? 'disabled' : ''} />
        Hide "Powered by ExpertHub" from branded pages
      </label>
      <label class="checkbox-row">
        <input type="checkbox" id="brandCustomDomain" ${inst.custom_domain_enabled ? 'checked' : ''} ${!canWrite ? 'disabled' : ''} />
        Enable custom domain for trainee portal
      </label>
      ${inst.custom_domain ? `
        <p class="form-hint">Custom domain: <code>${esc(inst.custom_domain)}</code></p>` : ''}
    </section>

    ${canWrite ? `
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-branding">
          <i class="fas fa-save"></i> Save Branding</button>
      </div>` : ''}

    <section class="panel">
      <h3 class="panel-title">Preview</h3>
      <div class="brand-preview" style="
        background: linear-gradient(135deg, ${esc(primary)}, ${esc(accent)});
        color: #fff; padding: 32px; border-radius: var(--r-lg); text-align: center;">
        ${inst.logo_url ? `<img src="${esc(inst.logo_url)}" alt=""
                style="height:56px;margin:0 auto 16px;filter:brightness(0) invert(1)" />` : ''}
        <h2 style="margin:0;color:#fff;font-size:1.5rem">${esc(inst.name || 'Your Institution')}</h2>
        <p style="margin:8px 0 0;opacity:.9;font-size:.9rem">Training Portal</p>
      </div>
    </section>
  `;
}
