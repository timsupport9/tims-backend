/* ============================================================
   ExpertHub 2.0 — 10-certificates.js
   Learner certificates, blockchain verification & sharing.
   ============================================================ */

/* ============================================================
   E-SCHOOL — CERTIFICATES
   ============================================================ */
function userCertificates() {
  const certs = S.certificates || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Certificates</span></div>
    <section class="page-header">
      <h1 class="page-title">My Certificates</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-certificates">
          <i class="fas fa-download"></i> Export List</button>
      </div>
    </section>

    ${certs.length ? `
      <section class="card-grid">
        ${certs.map(c => `
          <article class="program-card certificate-card">
            <div class="certificate-badge">
              <i class="fas fa-certificate"></i>
            </div>
            <h4 class="program-title">${esc(c.course_title || '')}</h4>
            <p class="program-desc">
              Serial: <code class="code">${esc(c.serial || '')}</code>
            </p>
            <div class="certificate-meta">
              <div>
                <span class="form-label">Issued</span>
                <strong>${fmtDate(c.issued_at)}</strong>
              </div>
              ${c.final_score ? `
                <div>
                  <span class="form-label">Final Score</span>
                  <strong>${c.final_score}%</strong>
                </div>
              ` : ''}
              ${c.grade ? `
                <div>
                  <span class="form-label">Grade</span>
                  <strong>${esc(c.grade)}</strong>
                </div>
              ` : ''}
            </div>
            ${c.blockchain_hash ? `
              <div class="certificate-blockchain">
                <i class="fas fa-cube"></i>
                <span class="chip chip-green">Blockchain Verified</span>
                <code class="code" style="font-size:.65rem;margin-top:4px">
                  ${truncateHash(c.blockchain_hash, 8)}
                </code>
              </div>
            ` : ''}
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-secondary btn-sm" data-action="print-certificate" data-id="${c.id}">
                <i class="fas fa-print"></i> Print</button>
              <a class="btn btn-info btn-sm" href="/verify/${esc(c.serial)}" target="_blank" rel="noopener">
                <i class="fas fa-external-link-alt"></i> Verify</a>
              ${c.linkedin_share_url ? `
                <a class="btn btn-primary btn-sm" href="${esc(c.linkedin_share_url)}" target="_blank" rel="noopener">
                  <i class="fab fa-linkedin"></i> Share</a>
              ` : ''}
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-certificate"></i>
          <h3>No certificates yet</h3>
          <p>Complete a course to earn your first certificate.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="my-learning">
            <i class="fas fa-graduation-cap"></i> View My Learning</button>
        </div>
      </section>
    `}
  `;
}
