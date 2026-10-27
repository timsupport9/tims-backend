/* ============================================================
   Institution — Certifications
   ============================================================ */
function instCertifications() {
  const certs = S.institutionCertificates || [];
  const expiring = certs.filter(c => {
    if (!c.expires_at || c.revoked) return false;
    const days = (new Date(c.expires_at) - Date.now()) / 86400000;
    return days > 0 && days < 90;
  });
  const expired = certs.filter(c => c.expires_at && new Date(c.expires_at) < new Date() && !c.revoked);
  const active  = certs.filter(c => !c.revoked && (!c.expires_at || new Date(c.expires_at) > new Date()));
  const totalCpd = certs.reduce((s, c) => s + Number(c.cpd_points || 0), 0);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Certifications</span></div>
    <section class="page-header">
      <h1 class="page-title">Certification Register</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-certificates">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="issue-certificate">
          <i class="fas fa-plus"></i> Issue Certificate</button>
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Active', active.length, '', 'fa-award', 'green')}
      ${statCard('Expiring (90 days)', expiring.length, '', 'fa-clock', 'yellow')}
      ${statCard('Expired', expired.length, '', 'fa-exclamation-triangle', 'red')}
      ${statCard('Total CPD Points', totalCpd.toFixed(0), '', 'fa-star', 'purple')}
    </section>

    ${expiring.length ? `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-circle"></i>
        <div><strong>${expiring.length} certificate${expiring.length > 1 ? 's' : ''} expire within 90 days.</strong>
          Schedule refresher training to maintain compliance.</div>
      </div>` : ''}

    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Serial</th><th>Trainee</th><th>Programme</th>
            <th>Issued</th><th>Expires</th><th>CPD</th><th>Blockchain</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${certs.map(c => {
              const expDays = c.expires_at ? Math.ceil((new Date(c.expires_at) - Date.now()) / 86400000) : null;
              let statusLabel = 'Valid';
              let statusCss = 'status-active';
              if (c.revoked) { statusLabel = 'Revoked'; statusCss = 'status-rejected'; }
              else if (expDays !== null && expDays < 0) { statusLabel = 'Expired'; statusCss = 'status-rejected'; }
              else if (expDays !== null && expDays < 30) { statusLabel = 'Expiring Soon'; statusCss = 'status-pending'; }

              return `<tr>
                <td><code class="code">${esc(c.serial)}</code></td>
                <td>${esc(c.trainee_name || '-')}</td>
                <td>${esc(c.programme_title || '-')}</td>
                <td>${fmtDate(c.issued_at)}</td>
                <td>${c.expires_at ? fmtDate(c.expires_at) : 'Never'}</td>
                <td>${c.cpd_points || 0}</td>
                <td>${c.blockchain_hash
                  ? `<span class="chip chip-green" title="${esc(c.blockchain_hash)}">
                      <i class="fas fa-cube"></i> On-chain</span>`
                  : '<span class="chip chip-neutral">Off-chain</span>'}</td>
                <td><span class="${statusCss}">${statusLabel}</span></td>
                <td class="actions-cell">
                  <a class="btn btn-secondary btn-xs" href="/verify/${esc(c.serial)}" target="_blank" rel="noopener">
                    <i class="fas fa-external-link-alt"></i> Verify</a>
                  <a class="btn btn-secondary btn-xs" href="/api/institution/certificates/${c.id}/pdf" target="_blank">
                    <i class="fas fa-file-pdf"></i> PDF</a>
                  <button class="btn btn-info btn-xs" data-action="renew-certificate" data-id="${c.id}">Renew</button>
                  ${!c.revoked ? `<button class="btn btn-danger btn-xs" data-action="revoke-certificate" data-id="${c.id}">Revoke</button>` : ''}
                </td>
              </tr>`;
            }).join('') || '<tr><td colspan="9" class="empty-row">No certificates issued yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    ${renderBlockchainSection()}
  `;
}
