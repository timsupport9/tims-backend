/* ============================================================
   Institution — SSO & Security
   ============================================================ */
function instSecurity() {
  const sso = S.ssoConfiguration || {};
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>SSO & Security</span></div>
    <section class="page-header"><h1 class="page-title">SSO & Security</h1></section>

    <section class="panel">
      <h3 class="panel-title">Single Sign-On (SSO)</h3>
      <p class="form-hint" style="margin-bottom:14px">
        Connect your identity provider to enable seamless login for trainees and staff.
      </p>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">SSO Provider</span>
          <select id="sso-provider" class="form-select">
            <option value="">— Disabled —</option>
            ${CONFIG.SSO_PROVIDERS.map(p => `
              <option value="${p}" ${sso.provider === p ? 'selected' : ''}>${p.replace(/_/g, ' ')}</option>`).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Entity ID / Issuer</span>
          <input id="sso-entity" class="form-input" value="${esc(sso.entity_id || '')}" />
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Metadata URL</span>
          <input id="sso-metadata-url" class="form-input"
                 value="${esc(sso.metadata_url || '')}" placeholder="https://idp.example.com/metadata" />
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Certificate (X.509)</span>
          <textarea id="sso-cert" class="form-textarea" rows="4">${esc(sso.certificate || '')}</textarea>
        </label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-sso">
          <i class="fas fa-save"></i> Save SSO Configuration</button>
        <button class="btn btn-secondary" data-action="test-sso">
          <i class="fas fa-check"></i> Test Connection</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Security Policies</h3>
      <div class="form-grid">
        <label class="checkbox-row">
          <input type="checkbox" id="sec-force-mfa" ${sso.force_mfa ? 'checked' : ''} />
          Force multi-factor authentication for all users</label>
        <label class="checkbox-row">
          <input type="checkbox" id="sec-ip-whitelist" ${sso.ip_whitelist_enabled ? 'checked' : ''} />
          Enable IP whitelist for admin access</label>
        <label class="checkbox-row">
          <input type="checkbox" id="sec-session-timeout" ${sso.session_timeout ? 'checked' : ''} />
          Auto-logout inactive sessions after 8 hours</label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-security-policy">
          <i class="fas fa-save"></i> Save Policies</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Recent Login Activity</h3>
      <ul class="list-stack">
        ${(sso.recent_logins || []).map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.user_name || 'User')} signed in</span>
              <span class="list-row-sub">${esc(l.ip || '—')} · ${fmtDT(l.timestamp)}</span>
            </div>
            <span class="${statusClass(l.status || 'success')}">${esc(l.status || 'success')}</span>
          </li>`).join('') || '<li class="empty-row">No recent logins</li>'}
      </ul>
    </section>
  `;
}
