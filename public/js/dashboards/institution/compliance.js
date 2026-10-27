/* ============================================================
   Institution — Compliance
   ============================================================ */
function instCompliance() {
  const rules = S.institutionComplianceRules || [];
  const certs = S.institutionCertificates || [];
  const runs  = S.complianceRuns || [];
  const now   = new Date();
  const expired = certs.filter(c => c.expires_at && new Date(c.expires_at) < now && !c.revoked);
  const expiring30 = certs.filter(c => {
    if (!c.expires_at || c.revoked) return false;
    const days = (new Date(c.expires_at) - now) / 86400000;
    return days > 0 && days < 30;
  });

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Compliance</span></div>
    <section class="page-header">
      <h1 class="page-title">Compliance Reporting Suite</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-compliance-report">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="run-compliance-check">
          <i class="fas fa-play"></i> Run Compliance Check</button>
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Active Rules', rules.filter(r => r.active).length, '', 'fa-shield-halved', 'blue')}
      ${statCard('Expired Certificates', expired.length, '', 'fa-exclamation-triangle', 'red')}
      ${statCard('Expiring in 30 Days', expiring30.length, '', 'fa-clock', 'yellow')}
      ${statCard('Compliant',
        certs.filter(c => !c.revoked && (!c.expires_at || new Date(c.expires_at) > now)).length,
        '', 'fa-check-circle', 'green')}
    </section>

    <section class="panel">
      <h3 class="panel-title">Compliance Rules</h3>
      ${rules.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Title</th><th>Programme</th><th>Target</th>
              <th>Recurrence</th><th>Mandatory</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${rules.map(r => `
                <tr>
                  <td>${esc(r.title)}</td>
                  <td>${esc(r.programme_title || '-')}</td>
                  <td>${esc(r.target_role || r.target_department || 'All')}</td>
                  <td>Every ${r.recurrence_months} month${r.recurrence_months === 1 ? '' : 's'}</td>
                  <td>${r.mandatory ? '<span class="chip chip-blue">Mandatory</span>' : 'Optional'}</td>
                  <td><span class="${r.active ? 'status-active' : 'status-archived'}">
                    ${r.active ? 'Active' : 'Inactive'}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<p class="empty-row">No compliance rules defined yet</p>'}
    </section>

    ${runs.length ? `
      <section class="panel">
        <h3 class="panel-title">Recent Compliance Runs</h3>
        <ul class="list-stack">
          ${runs.slice(0, 10).map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.run_name)}</span>
                <span class="list-row-sub">${fmtDT(r.started_at)} · ${r.findings_count || 0} findings</span>
              </div>
              <span class="${r.status === 'passed' ? 'status-active' : 'status-rejected'}">
                ${esc(r.status)}</span>
            </li>`).join('')}
        </ul>
      </section>` : ''}
  `;
}
