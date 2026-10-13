/* ============================================================
   dashboards/institution/certifications.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const certs = S.institutionCertificates || [];
    const expiring = certs.filter(c => {
      if (!c.expires_at || c.revoked) return false;
      const days = (new Date(c.expires_at) - Date.now()) / 86400000;
      return days > 0 && days < 90;
    });
    const expired = certs.filter(c =>
      c.expires_at && new Date(c.expires_at) < new Date() && !c.revoked);
    const active = certs.filter(c =>
      !c.revoked && (!c.expires_at || new Date(c.expires_at) > new Date()));
    const totalCpd = certs.reduce((s, c) => s + Number(c.cpd_points || 0), 0);

    const rows = certs.map(c => {
      const expDays = c.expires_at
        ? Math.ceil((new Date(c.expires_at) - Date.now()) / 86400000) : null;
      let statusLabel = 'Valid';
      let statusCss = 'status-active';
      if (c.revoked) { statusLabel = 'Revoked'; statusCss = 'status-rejected'; }
      else if (expDays !== null && expDays < 0) { statusLabel = 'Expired'; statusCss = 'status-rejected'; }
      else if (expDays !== null && expDays < 30) { statusLabel = 'Expiring Soon'; statusCss = 'status-pending'; }

      return `
        <tr>
          <td><code class="code">${EH.Fmt.esc(c.serial)}</code></td>
          <td>${EH.Fmt.esc(c.trainee_name || '-')}</td>
          <td>${EH.Fmt.esc(c.programme_title || '-')}</td>
          <td>${EH.Dates.fmtDate(c.issued_at)}</td>
          <td>${c.expires_at ? EH.Dates.fmtDate(c.expires_at) : 'Never'}</td>
          <td>${c.cpd_points || 0}</td>
          <td><span class="${statusCss}">${statusLabel}</span></td>
          <td class="actions-cell">
            <a class="btn btn-secondary btn-xs" href="/verify/${EH.Fmt.esc(c.serial)}"
               target="_blank" rel="noopener">
              <i class="fas fa-external-link-alt"></i> Verify</a>
            <a class="btn btn-secondary btn-xs"
               href="/api/institution/certificates/${c.id}/pdf" target="_blank">
              <i class="fas fa-file-pdf"></i> PDF</a>
            <button class="btn btn-info btn-xs" data-action="renew-certificate" data-id="${c.id}">Renew</button>
            ${!c.revoked ? `<button class="btn btn-danger btn-xs" data-action="revoke-certificate" data-id="${c.id}">Revoke</button>` : ''}
          </td>
        </tr>`;
    });

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Certifications' }])}
      ${EH.Layout.pageHeader('Certification Register', {
        actions: `
          <button class="btn btn-secondary" data-action="export-certificates">
            <i class="fas fa-download"></i> Export</button>
          <button class="btn btn-primary" data-action="issue-certificate">
            <i class="fas fa-plus"></i> Issue Certificate</button>`,
      })}

      ${EH.Layout.statGrid([
        EH.Layout.statCard({ label: 'Active', value: active.length,
          icon: 'fa-award', tone: 'green' }),
        EH.Layout.statCard({ label: 'Expiring (90 days)', value: expiring.length,
          icon: 'fa-clock', tone: 'yellow' }),
        EH.Layout.statCard({ label: 'Expired', value: expired.length,
          icon: 'fa-exclamation-triangle', tone: 'red' }),
        EH.Layout.statCard({ label: 'Total CPD Points', value: totalCpd.toFixed(0),
          icon: 'fa-star', tone: 'purple' }),
      ])}

      ${expiring.length ? `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-circle"></i>
          <div>
            <strong>${expiring.length} certificate${expiring.length > 1 ? 's' : ''} expire within 90 days.</strong>
            Schedule refresher training to maintain compliance.
          </div>
        </div>` : ''}

      <section class="panel">
        ${EH.Layout.table(
          ['Serial', 'Trainee', 'Programme', 'Issued', 'Expires', 'CPD', 'Status', 'Actions'],
          rows,
        )}
      </section>`;
  }

  EH.InstCertifications = { render };
})(window);
