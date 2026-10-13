/* ============================================================
   dashboards/learner/certificates.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const certs = S.certificates || [];

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Certificates' }])}
      ${EH.Layout.pageHeader('My Certificates')}

      ${certs.length ? `
        <section class="card-grid">
          ${certs.map(c => `
            <article class="program-card">
              <div class="cert-icon">
                <i class="fas fa-certificate"></i>
              </div>
              <h4 class="program-title">${EH.Fmt.esc(c.course_title || '')}</h4>
              <p class="program-desc" style="font-size:.8rem">
                Serial: <code class="code">${EH.Fmt.esc(c.serial || '')}</code>
              </p>
              <footer class="program-footer">
                <span class="program-meta">Issued: ${EH.Dates.fmtDate(c.issued_at)}</span>
              </footer>
              <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-secondary btn-sm" data-action="print-certificate" data-id="${c.id}">
                  <i class="fas fa-print"></i> Print</button>
                ${c.serial ? `
                  <a class="btn btn-info btn-sm" href="/verify/${EH.Fmt.esc(c.serial)}"
                     target="_blank" rel="noopener">
                    <i class="fas fa-external-link-alt"></i> Verify</a>
                ` : ''}
              </div>
            </article>`).join('')}
        </section>` : `
        <section class="panel">
          <div class="empty-state">
            <i class="fas fa-certificate"></i>
            <h3>No certificates yet</h3>
            <p>Complete a course to earn your first certificate.</p>
            <button class="btn btn-primary" data-action="switch-tab" data-tab="my-learning">
              <i class="fas fa-graduation-cap"></i> View My Learning</button>
          </div>
        </section>`}`;
  }

  EH.LearnerCertificates = { render };
})(window);
