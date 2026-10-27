/* ============================================================
   ExpertHub 2.0 — Institution Profile
   Verification, accreditation, contacts, billing, campuses,
   public profile, completion tracking.
   ============================================================ */

function instProfile() {
  const inst = S.myInstitution || {};
  const canWrite = hasInstitutionPermission('operations:*') || hasInstitutionPermission('programmes:write');

  const completion = computeProfileCompletion(inst);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Institution Profile</span></div>
    <section class="page-header"><h1 class="page-title">Institution Profile</h1></section>

    ${completion.pct < 100 ? `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        <div>
          <strong>Profile ${completion.pct}% complete.</strong>
          Missing: ${completion.missing.slice(0, 3).map(m => `<code>${esc(m)}</code>`).join(', ')}
          ${completion.missing.length > 3 ? ` and ${completion.missing.length - 3} more` : ''}.
        </div>
      </div>` : ''}

    <section class="panel">
      <div class="profile-header">
        <div class="profile-avatar" style="
          background: linear-gradient(135deg, var(--brand), var(--accent));
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 1.6rem">
          <i class="fas fa-building"></i>
        </div>
        <div>
          <h2 class="profile-name">
            ${esc(inst.name || 'Institution')}
            ${inst.verified ? '<span class="chip chip-green" style="margin-left:8px"><i class="fas fa-check"></i> Verified</span>' : ''}
          </h2>
          <p class="profile-email">
            ${esc(inst.contact_email || '')} ·
            <span class="${statusClass(inst.status || 'active')}">${esc(inst.status || 'active')}</span>
          </p>
        </div>
      </div>

      <div class="form-grid">
        <label class="form-group"><span class="form-label">Institution name</span>
          <input id="instProfileName" class="form-input" value="${esc(inst.name || '')}" ${!canWrite ? 'disabled' : ''} /></label>
        <label class="form-group">
          <span class="form-label">Type</span>
          <select id="instProfileType" class="form-select" ${!canWrite ? 'disabled' : ''}>
            ${CONFIG.INSTITUTION_TYPES.map(t =>
              `<option value="${t}" ${inst.type === t ? 'selected' : ''}>${capitalize(t.replace(/_/g, ' '))}</option>`).join('')}
          </select>
        </label>
        <label class="form-group"><span class="form-label">Industry</span>
          <input id="instProfileIndustry" class="form-input" value="${esc(inst.industry || '')}" ${!canWrite ? 'disabled' : ''} /></label>
        <label class="form-group"><span class="form-label">Contact phone</span>
          <input id="instProfilePhone" class="form-input" value="${esc(inst.contact_phone || '')}" ${!canWrite ? 'disabled' : ''} /></label>
        <label class="form-group form-group-full"><span class="form-label">Address</span>
          <input id="instProfileAddress" class="form-input" value="${esc(inst.address || '')}" ${!canWrite ? 'disabled' : ''} /></label>
        <label class="form-group form-group-full"><span class="form-label">Public bio</span>
          <textarea id="instProfileBio" class="form-textarea" rows="3" ${!canWrite ? 'disabled' : ''}>${esc(inst.public_bio || '')}</textarea></label>
      </div>
      ${canWrite ? `
        <div class="panel-actions">
          <button class="btn btn-primary" data-action="update-institution-profile">
            <i class="fas fa-save"></i> Save Changes</button>
        </div>` : ''}
    </section>

    <section class="panel">
      <h3 class="panel-title">Accreditation</h3>
      ${(inst.accreditations || []).length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Body</th><th>Number</th><th>Issued</th><th>Expires</th><th>Status</th></tr></thead>
            <tbody>
              ${inst.accreditations.map(a => `
                <tr>
                  <td>${esc(a.body)}</td>
                  <td><code>${esc(a.number || '—')}</code></td>
                  <td>${fmtDate(a.issued_at)}</td>
                  <td>${fmtDate(a.expires_at)}</td>
                  <td>${a.expires_at && new Date(a.expires_at) < new Date()
                    ? '<span class="status-rejected">Expired</span>'
                    : '<span class="status-active">Valid</span>'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<p class="empty-row">No accreditations on file</p>'}
      ${canWrite ? `
        <div class="panel-actions">
          <button class="btn btn-secondary" data-action="add-accreditation">
            <i class="fas fa-plus"></i> Add Accreditation</button>
        </div>` : ''}
    </section>

    <section class="panel">
      <h3 class="panel-title">Subscription</h3>
      <div class="form-grid">
        <div><p class="form-label">Seat Allocation</p><p>${inst.seat_allocation || 0} seats</p></div>
        <div><p class="form-label">Seats Used</p><p>${S.institutionTraineeTotal || 0} seats</p></div>
        <div><p class="form-label">Billing Cycle</p><p>${esc(inst.billing_cycle || 'monthly')}</p></div>
        <div><p class="form-label">Contract</p>
          <p>${fmtDate(inst.contract_start)} to ${fmtDate(inst.contract_end)}</p></div>
      </div>
    </section>
  `;
}

function computeProfileCompletion(inst) {
  const checks = [
    ['name', 'Institution name'],
    ['contact_email', 'Contact email'],
    ['contact_phone', 'Contact phone'],
    ['address', 'Address'],
    ['type', 'Institution type'],
    ['industry', 'Industry'],
    ['public_bio', 'Public bio'],
    ['accreditations', 'Accreditation'],
  ];
  const missing = checks.filter(([k]) => {
    const v = inst[k];
    if (Array.isArray(v)) return v.length === 0;
    return !v;
  }).map(([, label]) => label);

  const total = checks.length;
  const pct = Math.round(((total - missing.length) / total) * 100);
  return { pct, missing };
}
