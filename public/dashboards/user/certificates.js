/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/certificates.js */
/* Certificates: unique serial, lifecycle, verification URL, */
/* revocation state, LinkedIn share, signed download. */
/* ============================================================ */

function renderUserCertificates() {
  const certs = S.certificates || [];
  return UserUI.page({
    title: 'My Certificates',
    breadcrumb: 'Certificates',
    actions: `
      <button class="btn btn-secondary" data-action="export-user-certificates">
        <i class="fas fa-download"></i> Export List</button>
    `,
    content: certs.length ? UserUI.cardGrid(certs.map(c => `
      <article class="program-card certificate-card">
        <div class="certificate-badge"><i class="fas fa-certificate"></i></div>
        <h4 class="program-title">${esc(c.course_title || '')}</h4>
        <p class="program-desc">
          Serial: <code class="code">${esc(c.serial || '')}</code>
          ${c.issuer ? `<br/>Issued by: <strong>${esc(c.issuer)}</strong>` : ''}
        </p>
        <div class="certificate-meta">
          <div>
            <span class="form-label">Issued</span>
            <strong>${fmtDate(c.issued_at)}</strong>
          </div>
          ${c.final_score ? `<div><span class="form-label">Final Score</span><strong>${c.final_score}%</strong></div>` : ''}
          ${c.grade ? `<div><span class="form-label">Grade</span><strong>${esc(c.grade)}</strong></div>` : ''}
          ${c.expires_at ? `<div><span class="form-label">Expires</span><strong>${fmtDate(c.expires_at)}</strong></div>` : ''}
        </div>
        ${c.requirements ? `<p class="form-hint"><strong>Requirements met:</strong> ${esc(c.requirements)}</p>` : ''}
        ${c.revoked ? `
          <div class="alert alert-danger" style="margin-top:10px">
            <i class="fas fa-ban"></i> This certificate has been revoked
            ${c.revoked_reason ? ` — ${esc(c.revoked_reason)}` : ''}.
          </div>
        ` : ''}
        ${c.blockchain_hash ? `
          <div class="certificate-blockchain">
            <i class="fas fa-cube"></i>
            <span class="chip chip-green">Blockchain Verified</span>
            <code class="code" style="font-size:.65rem;margin-top:4px">${UserHelpers.truncateHash(c.blockchain_hash, 8)}</code>
          </div>
        ` : ''}
        <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" data-action="print-certificate" data-id="${c.id}"
                  ${c.revoked ? 'disabled' : ''}>
            <i class="fas fa-print"></i> Print</button>
          <a class="btn btn-info btn-sm" href="/verify/${esc(c.serial)}" target="_blank" rel="noopener">
            <i class="fas fa-external-link-alt"></i> Verify</a>
          ${c.linkedin_share_url ? `
            <a class="btn btn-primary btn-sm" href="${esc(c.linkedin_share_url)}" target="_blank" rel="noopener">
              <i class="fab fa-linkedin"></i> Share</a>
          ` : ''}
          <button class="btn btn-secondary btn-sm" data-action="download-certificate" data-id="${c.id}"
                  ${c.revoked ? 'disabled' : ''}>
            <i class="fas fa-file-pdf"></i> PDF</button>
        </div>
      </article>
    `)) : `<section class="panel">${UserUI.empty({
      icon: 'fa-certificate',
      title: 'No certificates yet',
      desc: 'Complete a course to earn your first certificate.',
      actionTab: 'my-learning',
      actionLabel: 'View My Learning',
    })}</section>`,
  });
}

window.ExpertHubUser.registerModule('certificates', renderUserCertificates);

window.ExpertHubUser.registerAction('print-certificate', (id) => {
  const c = (S.certificates || []).find(x => String(x.id) === String(id));
  if (!c) return;
  if (c.revoked) return showToast('This certificate has been revoked', 'warning');
  openModal({
    title: 'Certificate',
    body: `
      <div style="text-align:center;padding:20px;border:3px double var(--brand);border-radius:12px">
        <h2>Certificate of Completion</h2>
        <p style="font-size:1.1rem;margin:20px 0">This certifies that</p>
        <h3 style="font-size:1.5rem;color:var(--brand)">${esc(currentUser?.name || '')}</h3>
        <p style="margin:20px 0">has successfully completed</p>
        <h4>${esc(c.course_title || '')}</h4>
        ${c.issuer ? `<p>Issued by ${esc(c.issuer)}</p>` : ''}
        <p style="margin-top:20px;font-size:.85rem;color:var(--text-muted)">
          Serial: ${esc(c.serial)} · Issued: ${fmtDate(c.issued_at)}
        </p>
        <p style="font-size:.75rem;color:var(--text-muted)">Verify at ${location.origin}/verify/${esc(c.serial)}</p>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      <button class="btn btn-primary" onclick="window.print()">
        <i class="fas fa-print"></i> Print</button>
    `,
  });
});

window.ExpertHubUser.registerAction('download-certificate', async (id) => {
  try {
    const d = await apiCall(`/api/user/certificates/${id}/download`).catch(() => null);
    if (d?.url) window.open(d.url, '_blank', 'noopener,noreferrer');
    else showToast('Certificate PDF not available yet', 'warning');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('export-user-certificates', () => {
  const rows = (S.certificates || []).map(c => ({
    serial: c.serial || '', course: c.course_title || '',
    issuer: c.issuer || '',
    issued: c.issued_at || '', final_score: c.final_score || '', grade: c.grade || '',
    status: c.revoked ? 'Revoked' : 'Active',
  }));
  if (!rows.length) return showToast('No certificates to export', 'warning');
  downloadCsv('my-certificates.csv', rows);
});
