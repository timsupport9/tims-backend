/* ============================================================
   dashboards/expert/profile.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const user = S.currentUser || {};
    const portfolioCount = (S.expertPortfolio || []).length;

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Profile' }])}
      ${EH.Layout.pageHeader('My Profile', {
        actions: `<button class="btn btn-secondary" data-action="view-public-profile">
          <i class="fas fa-eye"></i> Preview Public Profile</button>`,
      })}

      <section class="panel">
        <div class="profile-header">
          <img class="profile-avatar" src="${EH.Fmt.esc(user.avatar || EH.PublicFormat.avatar(user.name))}" alt="" />
          <div>
            <h2 class="profile-name">${EH.Fmt.esc(user.name || '')}</h2>
            <p class="profile-email">${EH.Fmt.esc(user.email || '')}</p>
            <p style="margin-top:6px">
              <span class="chip chip-neutral">${EH.Fmt.esc(user.specialization || 'No specialization')}</span>
              <span class="chip chip-blue" style="margin-left:6px">
                ${portfolioCount} portfolio item${portfolioCount === 1 ? '' : 's'}
              </span>
            </p>
          </div>
        </div>

        <div class="form-grid">
          <label class="form-group"><span class="form-label">Specialization</span>
            <input id="profileSpecialization" class="form-input"
                   value="${EH.Fmt.esc(user.specialization || '')}" /></label>
          <label class="form-group"><span class="form-label">Hourly rate ($)</span>
            <input id="profileRate" type="number" class="form-input"
                   value="${user.hourly_rate || ''}" /></label>
          <label class="form-group form-group-full"><span class="form-label">Bio</span>
            <textarea id="profileBio" class="form-textarea" rows="4">${EH.Fmt.esc(user.bio || '')}</textarea></label>
          <label class="form-group form-group-full"><span class="form-label">Change avatar</span>
            <input type="file" id="avatarFile" class="form-input" accept="image/*" /></label>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" data-action="update-expert-profile">
            <i class="fas fa-save"></i> Update Profile</button>
        </div>

        <h3 class="panel-title" style="margin-top:24px">Change Password</h3>
        <div class="form-grid">
          <label class="form-group"><span class="form-label">Current password</span>
            <input id="cpOld" type="password" class="form-input" /></label>
          <label class="form-group"><span class="form-label">New password</span>
            <input id="cpNew" type="password" class="form-input" /></label>
        </div>
        <div class="panel-actions">
          <button class="btn btn-warning" data-action="change-password">
            <i class="fas fa-lock"></i> Update Password</button>
        </div>
      </section>`;
  }

  EH.ExpertProfile = { render };
})(window);
