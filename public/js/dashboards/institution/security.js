/* ============================================================
   ExpertHub 2.0 — SSO & Security
   MFA, SSO config validation, session management, RBAC,
   device review, audit logging, retention controls.
   ============================================================ */

function instSecurity() {
  const sso = S.ssoConfiguration || {};
  const canWrite = hasInstitutionPermission('security:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>SSO & Security</span></div>
    <section class="page-header"><h1 class="page-title">SSO & Security</h1></section>

    <section class="panel">
      <h3 class="panel-title">Single Sign-On (SSO)</h3>
      <p class="form-hint" style="margin-bottom:14px">
        Connect your identity provider for seamless login for trainees and staff.
      </p>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">SSO Provider</span>
          <select id="sso-provider" class="form-select" ${!canWrite ? 'disabled' : ''}>
            <option value="">— Disabled —</option>
            ${CONFIG.SSO_PROVIDERS.map(p =>
              `<option value="${p}" ${sso.provider === p ? 'selected' : ''}>${p.replace(/_/g, ' ')}</option>`).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Entity ID / Issuer</span>
          <input id="sso-entity" class="form-input" value="${esc(sso.entity_id || '')}" ${!canWrite ? 'disabled' : ''} />
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Metadata URL</span>
          <input id="sso-metadata-url" class="form-input"
                 value="${esc(sso.metadata_url || '')}" placeholder="https://idp.example.com/metadata" ${!canWrite ? 'disabled' : ''} />
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Certificate (X.509)</span>
          <textarea id="sso-cert" class="form-textarea" rows="4" ${!canWrite ? 'disabled' : ''}>${esc(sso.certificate || '')}</textarea>
        </label>
      </div>
      ${canWrite ? `
        <div class="panel-actions">
          <button class="btn btn-primary" data-action="save-sso">
            <i class="fas fa-save"></i> Save SSO Configuration</button>
          <button class="btn btn-secondary" data-action="test-sso">
            <i class="fas fa-check"></i> Test Connection</button>
          <button class="btn btn-secondary" data-action="validate-sso-cert">
            <i class="fas fa-shield-halved"></i> Validate Certificate</button>
        </div>` : ''}
    </section>

    <section class="panel">
      <h3 class="panel-title">Security Policies</h3>
      <div class="form-grid">
        <label class="checkbox-row">
          <input type="checkbox" id="sec-force-mfa" ${sso.force_mfa ? 'checked' : ''} ${!canWrite ? 'disabled' : ''} />
          Force multi-factor authentication for all users</label>
        <label class="checkbox-row">
          <input type="checkbox" id="sec-ip-whitelist" ${sso.ip_whitelist_enabled ? 'checked' : ''} ${!canWrite ? 'disabled' : ''} />
          Enable IP whitelist for admin access</label>
        <label class="checkbox-row">
          <input type="checkbox" id="sec-session-timeout" ${sso.session_timeout ? 'checked' : ''} ${!canWrite ? 'disabled' : ''} />
          Auto-logout inactive sessions after 8 hours</label>
        <label class="checkbox-row">
          <input type="checkbox" id="sec-audit-logging" ${sso.audit_logging ? 'checked' : ''} ${!canWrite ? 'disabled' : ''} />
          Audit all admin actions</label>
      </div>
      ${canWrite ? `
        <div class="panel-actions">
          <button class="btn btn-primary" data-action="save-security-policy">
            <i class="fas fa-save"></i> Save Policies</button>
          <button class="btn btn-secondary" data-action="configure-session-policy">
            Session policy</button>
        </div>` : ''}
    </section>

    <section class="panel">
      <h3 class="panel-title">Recent Login Activity</h3>
      <ul class="list-stack">
        ${(sso.recent_logins || []).map(l => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(l.user_name || 'User')} signed in</span>
              <span class="list-row-sub">${esc(l.ip || '—')} · ${fmtDT(l.timestamp)}${l.device ? ` · ${esc(l.device)}` : ''}</span>
            </div>
            <span class="${statusClass(l.status || 'success')}">${esc(l.status || 'success')}</span>
          </li>`).join('') || '<li class="empty-row">No recent logins</li>'}
      </ul>
    </section>

    <section class="panel">
      <h3 class="panel-title">Data Retention</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Record Type</th><th>Retention</th><th>Policy</th></tr></thead>
          <tbody>
            ${Object.entries(CONFIG.RETENTION_POLICIES).map(([k, v]) => `
              <tr>
                <td>${esc(capitalize(k.replace(/_/g, ' ')))}</td>
                <td>${v} days</td>
                <td><span class="chip chip-neutral">enforced</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
