/* ============================================================
   Institution — Custom Branding
   ============================================================ */
function instBranding() {
  const inst = S.institutionBranding || S.myInstitution || {};
  const primary = inst.primary_color || '#1e3a8a';
  const accent  = inst.accent_color || '#059669';

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Custom Branding</span></div>
    <section class="page-header"><h1 class="page-title">Custom Branding</h1></section>

    <section class="panel">
      <h3 class="panel-title">Logo and Colours</h3>
      <div class="form-grid">
        <label class="form-group form-group-full">
          <span class="form-label">Institution logo</span>
          <input type="file" id="brandLogo" class="form-input" accept="image/*" />
          ${inst.logo_url ? `<img src="${esc(inst.logo_url)}" alt="Current logo" style="max-height:60px;margin-top:8px" />` : ''}
        </label>
        <label class="form-group"><span class="form-label">Primary colour</span>
          <input type="color" id="brandPrimary" class="form-input" value="${esc(primary)}" /></label>
        <label class="form-group"><span class="form-label">Accent colour</span>
          <input type="color" id="brandAccent" class="form-input" value="${esc(accent)}" /></label>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Email and Welcome</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Sender name</span>
          <input id="brandEmailName" class="form-input"
                 value="${esc(inst.email_sender_name || '')}" placeholder="ACME Academy" /></label>
        <label class="form-group"><span class="form-label">Reply-to address</span>
          <input id="brandEmailAddr" type="email" class="form-input"
                 value="${esc(inst.email_sender_address || '')}" /></label>
        <label class="form-group form-group-full">
          <span class="form-label">Welcome message</span>
          <textarea id="brandWelcome" class="form-textarea" rows="3">${esc(inst.welcome_message || '')}</textarea>
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
