/* ============================================================
   dashboards/institution/profile.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;
  const CONFIG = EH.CONFIG;

  function render() {
    const inst = S.myInstitution || {};

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Institution Profile' }])}
      ${EH.Layout.pageHeader('Institution Profile')}

      <section class="panel">
        <div class="profile-header">
          <div class="profile-avatar avatar-brand">
            <i class="fas fa-building"></i>
          </div>
          <div>
            <h2 class="profile-name">${EH.Fmt.esc(inst.name || 'Institution')}</h2>
            <p class="profile-email">
              ${EH.Fmt.esc(inst.contact_email || '')} ·
              <span class="${EH.Fmt.statusClass(inst.status || 'active')}">${EH.Fmt.esc(inst.status || 'active')}</span>
            </p>
          </div>
        </div>

        <div class="form-grid">
          <label class="form-group"><span class="form-label">Institution name</span>
            <input id="instProfileName" class="form-input" value="${EH.Fmt.esc(inst.name || '')}" /></label>
          <label class="form-group">
            <span class="form-label">Type</span>
            <select id="instProfileType" class="form-select">
              ${(CONFIG.INSTITUTION_TYPES || []).map(t => `
                <option value="${t}" ${inst.type === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </label>
          <label class="form-group"><span class="form-label">Industry</span>
            <input id="instProfileIndustry" class="form-input" value="${EH.Fmt.esc(inst.industry || '')}" /></label>
          <label class="form-group"><span class="form-label">Contact phone</span>
            <input id="instProfilePhone" class="form-input" value="${EH.Fmt.esc(inst.contact_phone || '')}" /></label>
          <label class="form-group form-group-full"><span class="form-label">Address</span>
            <input id="instProfileAddress" class="form-input" value="${EH.Fmt.esc(inst.address || '')}" /></label>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" data-action="update-institution-profile">
            <i class="fas fa-save"></i> Save Changes</button>
        </div>
      </section>

      <section class="panel">
        <h3 class="panel-title">Subscription</h3>
        <div class="form-grid">
          <div><p class="form-label">Seat Allocation</p><p>${inst.seat_allocation || 0} seats</p></div>
          <div><p class="form-label">Seats Used</p><p>${S.institutionTraineeTotal || 0} seats</p></div>
          <div><p class="form-label">Billing Cycle</p><p>${EH.Fmt.esc(inst.billing_cycle || 'monthly')}</p></div>
          <div><p class="form-label">Contract</p>
            <p>${EH.Dates.fmtDate(inst.contract_start)} to ${EH.Dates.fmtDate(inst.contract_end)}</p>
          </div>
        </div>
      </section>`;
  }

  EH.InstProfile = { render };
})(window);
