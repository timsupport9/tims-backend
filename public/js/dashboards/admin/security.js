/* ============================================================
   admin/security.js — Security & MFA
   ============================================================ */
(function () {
  AdminDash.reg('security', {
    nav: { label: 'Security', icon: 'fa-lock' },
    render() {
      const logins = S.loginHistory || [];
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Security</span></div>
        <section class="page-header"><h1 class="page-title">Security</h1></section>

        <section class="panel">
          <h3 class="panel-title">Multi-Factor Authentication</h3>
          <p class="form-hint">Add an extra layer of protection to your admin account.</p>
          <div class="alert ${S.mfaEnabled ? 'alert-success' : 'alert-warning'}">
            <i class="fas fa-${S.mfaEnabled ? 'check-circle' : 'exclamation-triangle'}"></i>
            <div>
              <strong>${S.mfaEnabled ? 'MFA is enabled' : 'MFA is not enabled'}</strong>
              <p style="margin:4px 0 0;font-size:.85rem">${S.mfaEnabled ? 'Your account requires a second factor on login.' : 'Enable MFA to protect against unauthorized access.'}</p>
            </div>
          </div>
          <div class="panel-actions">
            <button class="btn btn-${S.mfaEnabled ? 'warning' : 'primary'}" data-action="toggle-mfa">
              <i class="fas fa-shield-halved"></i> ${S.mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
            </button>
          </div>
        </section>

        <section class="panel">
          <h3 class="panel-title">Login History</h3>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Date</th><th>IP</th><th>Device</th><th>Location</th><th>Result</th></tr></thead>
              <tbody>
                ${logins.map(l => `
                  <tr>
                    <td>${fmtDT(l.created_at)}</td>
                    <td><code class="code">${esc(l.ip||'—')}</code></td>
                    <td>${esc(l.user_agent||'—')}</td>
                    <td>${esc(l.location||'—')}</td>
                    <td><span class="${statusClass(l.success ? 'active' : 'rejected')}">${l.success ? 'Success' : 'Failed'}</span></td>
                  </tr>
                `).join('') || '<tr><td colspan="5" class="empty-row">No login history</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>`;
    },
    actions: {
      'toggle-mfa': async () => {
        try {
          await apiCall('/api/auth/mfa/toggle', 'POST', { enabled: !S.mfaEnabled });
          S.mfaEnabled = !S.mfaEnabled;
          showToast(S.mfaEnabled ? 'MFA enabled' : 'MFA disabled', 'success');
          rerenderRoleContent();
        } catch (e) { showToast(e.message, 'error'); }
      },
    },
  });
})();
