/* ============================================================
   dashboards/institution/compliance.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const rules = S.institutionComplianceRules || [];
    const certs = S.institutionCertificates || [];
    const now = new Date();
    const expired = certs.filter(c =>
      c.expires_at && new Date(c.expires_at) < now && !c.revoked);
    const expiring30 = certs.filter(c => {
      if (!c.expires_at || c.revoked) return false;
      const days = (new Date(c.expires_at) - now) / 86400000;
      return days > 0 && days < 30;
    });

    const rows = rules.map(r => `
      <tr>
        <td>${EH.Fmt.esc(r.title)}</td>
        <td>${EH.Fmt.esc(r.programme_title || '-')}</td>
        <td>${EH.Fmt.esc(r.target_role || r.target_department || 'All')}</td>
        <td>Every ${r.recurrence_months} month${r.recurrence_months === 1 ? '' : 's'}</td>
        <td>${r.mandatory ? '<span class="chip chip-blue">Mandatory</span>' : 'Optional'}</td>
        <td><span class="${r.active ? 'status-active' : 'status-archived'}">
          ${r.active ? 'Active' : 'Inactive'}</span></td>
      </tr>`);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Compliance' }])}
      ${EH.Layout.pageHeader('Compliance Calendar', {
        actions: `
          <button class="btn btn-secondary" data-action="export-compliance-report">
            <i class="fas fa-download"></i> Export</button>
          <button class="btn btn-primary" data-action="create-compliance-rule">
            <i class="fas fa-plus"></i> New Rule</button>`,
      })}

      ${EH.Layout.statGrid([
        EH.Layout.statCard({ label: 'Active Rules',
          value: rules.filter(r => r.active).length, icon: 'fa-shield-halved', tone: 'blue' }),
        EH.Layout.statCard({ label: 'Expired Certificates', value: expired.length,
          icon: 'fa-exclamation-triangle', tone: 'red' }),
        EH.Layout.statCard({ label: 'Expiring in 30 Days', value: expiring30.length,
          icon: 'fa-clock', tone: 'yellow' }),
        EH.Layout.statCard({ label: 'Compliant',
          value: certs.filter(c => !c.revoked && (!c.expires_at || new Date(c.expires_at) > now)).length,
          icon: 'fa-check-circle', tone: 'green' }),
      ])}

      <section class="panel">
        <h3 class="panel-title">Compliance Rules</h3>
        ${rules.length
          ? EH.Layout.table(
              ['Title','Programme','Target','Recurrence','Mandatory','Status'],
              rows)
          : '<p class="empty-row">No compliance rules defined yet</p>'}
      </section>`;
  }

  EH.InstCompliance = { render };
})(window);
