/* ============================================================
   ExpertHub 2.0 — Certifications
   Adds: template designer, QR verification, digital signatures,
   renewal reminders, CPD tracking, credential sharing,
   revocation audit trails, verifiable credential standards.
   ============================================================ */

function instCertifications() {
  const certs = S.institutionCertificates || [];
  const f = S.filters.certifications = S.filters.certifications || {};
  const statusFilter   = f.status || '';
  const templateFilter = f.template || '';
  const programmeFilter = f.programme || '';

  /* ── Derived counts ───────────────────────────────────── */
  const now = Date.now();
  const expiring = certs.filter(c => {
    if (!c.expires_at || c.revoked) return false;
    const days = (new Date(c.expires_at) - now) / 86400000;
    return days > 0 && days < 90;
  });
  const expired = certs.filter(c =>
    c.expires_at && new Date(c.expires_at) < new Date() && !c.revoked
  );
  const active = certs.filter(c =>
    !c.revoked && (!c.expires_at || new Date(c.expires_at) > new Date())
  );
  const totalCpd = certs.reduce((s, c) => s + safeNum(c.cpd_points), 0);
  const signedCount = certs.filter(c => c.digital_signature_id || c.signed).length;

  /* ── Filtering ────────────────────────────────────────── */
  let list = certs.slice();
  if (statusFilter === 'active')    list = list.filter(c => !c.revoked && (!c.expires_at || new Date(c.expires_at) > new Date()));
  if (statusFilter === 'expiring')  list = expiring.slice();
  if (statusFilter === 'expired')   list = list.filter(c => c.expires_at && new Date(c.expires_at) < new Date() && !c.revoked);
  if (statusFilter === 'revoked')   list = list.filter(c => c.revoked);
  if (templateFilter) list = list.filter(c => c.template_code === templateFilter);
  if (programmeFilter) list = list.filter(c => String(c.programme_id) === String(programmeFilter));
  list = sortBy(list, c => c.issued_at || '', 'desc');

  const { rows, total, currentPage, perPage } = paginateList(list, 'institutionCertificates');

  const canWrite = hasInstitutionPermission('certifications:write');
  const canShare = hasInstitutionPermission('certifications:read');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Certifications</span></div>
    <section class="page-header">
      <h1 class="page-title">Certification Register</h1>
      <div class="page-actions">
        <select id="certifications-status" class="form-select" style="max-width:160px">
          <option value="">All statuses</option>
          <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active</option>
          <option value="expiring" ${statusFilter === 'expiring' ? 'selected' : ''}>Expiring (90d)</option>
          <option value="expired" ${statusFilter === 'expired' ? 'selected' : ''}>Expired</option>
          <option value="revoked" ${statusFilter === 'revoked' ? 'selected' : ''}>Revoked</option>
        </select>
        <select id="certifications-template" class="form-select" style="max-width:180px">
          <option value="">All templates</option>
          ${CONFIG.CERTIFICATE_TEMPLATES.map(t =>
            `<option value="${t.code}" ${templateFilter === t.code ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
        </select>
        <select id="certifications-programme" class="form-select" style="max-width:200px">
          <option value="">All programmes</option>
          ${(S.programmes || []).map(p =>
            `<option value="${p.id}" ${String(programmeFilter) === String(p.id) ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}
        </select>
        <button class="btn btn-secondary" data-action="export-certificates">
          <i class="fas fa-download"></i> Export</button>
        ${canWrite ? `
          <button class="btn btn-secondary" data-action="send-renewal-reminders">
            <i class="fas fa-bell"></i> Send Reminders</button>
          <button class="btn btn-primary" data-action="issue-certificate">
            <i class="fas fa-plus"></i> Issue Certificate</button>` : ''}
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Active', active.length, '', 'fa-award', 'green')}
      ${statCard('Expiring (90 days)', expiring.length, '', 'fa-clock', 'yellow')}
      ${statCard('Expired', expired.length, '', 'fa-exclamation-triangle', 'red')}
      ${statCard('Digitally Signed', signedCount, 'of ' + certs.length, 'fa-signature', 'purple')}
    </section>

    ${expiring.length ? `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-circle"></i>
        <div>
          <strong>${pluralize(expiring.length, 'certificate')} expire within 90 days.</strong>
          Schedule refresher training or extend validity.
          ${canWrite ? `
            <button class="btn btn-secondary btn-xs" style="margin-left:8px" data-action="send-renewal-reminders">
              Send reminders</button>` : ''}
        </div>
      </div>` : ''}

    <!-- Template manager card -->
    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <h3 class="panel-title" style="margin:0"><i class="fas fa-palette"></i> Certificate Templates</h3>
        ${canWrite ? `
          <button class="btn btn-secondary btn-sm" data-action="manage-cert-templates">
            <i class="fas fa-cog"></i> Manage Templates</button>` : ''}
      </div>
      <div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
        ${CONFIG.CERTIFICATE_TEMPLATES.map(t => `
          <div class="dashboard-card" style="padding:14px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong style="font-size:.9rem">${esc(t.label)}</strong>
              <span class="chip chip-neutral"><code>${esc(t.code)}</code></span>
            </div>
            <p style="font-size:.78rem;color:var(--text-muted);margin-top:6px">
              Fields: ${t.fields.map(f => `<code>${esc(f)}</code>`).join(', ')}
            </p>
            <p style="font-size:.78rem;color:var(--text-muted);margin-top:4px">
              In use: <strong>${certs.filter(c => c.template_code === t.code).length}</strong> certificate${certs.filter(c => c.template_code === t.code).length === 1 ? '' : 's'}
            </p>
          </div>`).join('')}
      </div>
    </section>

    <!-- Certificates table -->
    <section class="panel">
      <h3 class="panel-title">Certificates</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Serial</th><th>Trainee</th><th>Programme</th>
            <th>Template</th><th>Issued</th><th>Expires</th>
            <th>CPD</th><th>Signature</th><th>Blockchain</th>
            <th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${rows.map(c => renderCertificateRow(c, canWrite, canShare)).join('') ||
              '<tr><td colspan="11" class="empty-row">No certificates match your filters</td></tr>'}
          </tbody>
        </table>
      </div>
      ${paginationBar('institutionCertificates', currentPage, perPage, total)}
    </section>

    <!-- Revocation audit trail -->
    ${renderRevocationAudit(certs)}

    <!-- Blockchain-verified section (from helpers.js) -->
    ${renderBlockchainSection()}

    <!-- Verifiable credential standards note -->
    <section class="panel">
      <h3 class="panel-title"><i class="fas fa-shield-halved"></i> Verifiable Credential Standards</h3>
      <p style="font-size:.85rem;color:var(--text-muted)">
        Certificates support <strong>W3C Verifiable Credentials</strong> and are optionally anchored
        on-chain. Only certificates with a confirmed blockchain hash appear in the section above.
        Digital certificate = institution-signed PDF with QR; verifiable credential = independently
        resolvable proof served at <code>/verify/&lt;serial&gt;</code>.
      </p>
      <ul class="list-stack" style="margin-top:10px">
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">Digital signature verification</span>
            <span class="list-row-sub">
              ${signedCount} of ${certs.length} certificates signed with institution key
            </span>
          </div>
          ${signedCount < certs.length && canWrite ? `
            <button class="btn btn-secondary btn-xs" data-action="backfill-signatures">
              Backfill signatures</button>` : ''}
        </li>
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">QR verification</span>
            <span class="list-row-sub">
              Every certificate has a public verification URL — scan or share
            </span>
          </div>
          <button class="btn btn-secondary btn-xs" data-action="bulk-generate-qr">
            <i class="fas fa-qrcode"></i> Generate QR batch</button>
        </li>
      </ul>
    </section>
  `;
}

/* ── Certificate row ──────────────────────────────────────── */
function renderCertificateRow(c, canWrite, canShare) {
  const expDays = c.expires_at
    ? Math.ceil((new Date(c.expires_at) - Date.now()) / 86400000)
    : null;

  let statusLabel = 'Valid';
  let statusCss = 'status-active';
  if (c.revoked) { statusLabel = 'Revoked'; statusCss = 'status-rejected'; }
  else if (expDays !== null && expDays < 0) { statusLabel = 'Expired'; statusCss = 'status-rejected'; }
  else if (expDays !== null && expDays < 30) { statusLabel = 'Expiring Soon'; statusCss = 'status-pending'; }

  const template = CONFIG.CERTIFICATE_TEMPLATES.find(t => t.code === c.template_code);
  const templateLabel = template ? template.label : '—';

  return `
    <tr>
      <td><code class="code">${esc(c.serial)}</code></td>
      <td>${esc(c.trainee_name || '—')}</td>
      <td>${esc(c.programme_title || '—')}</td>
      <td><span class="chip chip-neutral">${esc(templateLabel)}</span></td>
      <td>${fmtDate(c.issued_at)}</td>
      <td>${c.expires_at ? fmtDate(c.expires_at) : 'Never'}</td>
      <td>${c.cpd_points || 0}</td>
      <td>${(c.digital_signature_id || c.signed)
        ? `<span class="chip chip-green" title="${esc(c.digital_signature_id || 'Signed')}">
            <i class="fas fa-signature"></i> Signed</span>`
        : '<span class="chip chip-neutral">Unsigned</span>'}</td>
      <td>${c.blockchain_hash
        ? `<span class="chip chip-green" title="${esc(c.blockchain_hash)}">
            <i class="fas fa-cube"></i> On-chain</span>`
        : '<span class="chip chip-neutral">Off-chain</span>'}</td>
      <td><span class="${statusCss}">${statusLabel}</span></td>
      <td class="actions-cell" style="white-space:nowrap">
        <a class="btn btn-secondary btn-xs" href="/verify/${esc(c.serial)}" target="_blank" rel="noopener"
           title="Public verification page">
          <i class="fas fa-external-link-alt"></i></a>
        <a class="btn btn-secondary btn-xs" href="/api/institution/certificates/${c.id}/pdf" target="_blank"
           title="Download PDF">
          <i class="fas fa-file-pdf"></i></a>
        <button class="btn btn-secondary btn-xs" data-action="view-cert-qr" data-id="${c.id}"
                title="QR code"><i class="fas fa-qrcode"></i></button>
        ${canShare ? `
          <button class="btn btn-info btn-xs" data-action="share-credential" data-id="${c.id}"
                  title="Share credential"><i class="fas fa-share-nodes"></i></button>` : ''}
        ${canWrite ? `
          ${!c.digital_signature_id ? `
            <button class="btn btn-secondary btn-xs" data-action="digital-signature" data-id="${c.id}"
                    title="Sign digitally"><i class="fas fa-signature"></i></button>` : ''}
          <button class="btn btn-info btn-xs" data-action="renew-certificate" data-id="${c.id}"
                  title="Renew">Renew</button>
          ${!c.revoked ? `
            <button class="btn btn-danger btn-xs" data-action="revoke-certificate" data-id="${c.id}"
                    title="Revoke">Revoke</button>` : ''}
        ` : ''}
      </td>
    </tr>`;
}

/* ── Revocation audit trail ───────────────────────────────── */
function renderRevocationAudit(certs) {
  const revoked = certs.filter(c => c.revoked);
  if (!revoked.length) return '';

  return `
    <section class="panel">
      <h3 class="panel-title"><i class="fas fa-clipboard-list"></i> Revocation Audit Trail</h3>
      <p class="form-hint" style="margin-bottom:12px">
        Every revocation records the actor, timestamp and reason for compliance purposes.
      </p>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Serial</th><th>Trainee</th><th>Revoked At</th>
            <th>Revoked By</th><th>Reason</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${revoked.map(c => {
              const rev = c.revocation_audit || {};
              return `<tr>
                <td><code class="code">${esc(c.serial)}</code></td>
                <td>${esc(c.trainee_name || '—')}</td>
                <td>${rev.revoked_at ? fmtDT(rev.revoked_at) : fmtDate(c.revoked_at)}</td>
                <td>${esc(rev.revoked_by_name || c.revoked_by_name || '—')}</td>
                <td>${esc(truncate(rev.reason || c.revocation_reason || '', 80))}</td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="view-revocation-audit" data-id="${c.id}">
                    View Full Trail</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </section>`;
}
