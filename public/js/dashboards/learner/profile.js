/* ============================================================
   dashboards/learner/profile.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const user = S.currentUser || {};
    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Profile' }])}
      ${EH.Layout.pageHeader('My Profile')}

      <section class="panel">
        <div class="profile-header">
          <img class="profile-avatar" src="${EH.Fmt.esc(user.avatar || EH.PublicFormat.avatar(user.name))}" alt="" />
          <div>
            <h2 class="profile-name">${EH.Fmt.esc(user.name || '')}</h2>
            <p class="profile-email">${EH.Fmt.esc(user.email || '')}</p>
          </div>
        </div>

        <div class="form-grid">
          <label class="form-group"><span class="form-label">Full name</span>
            <input id="profileName" class="form-input" value="${EH.Fmt.esc(user.name || '')}" /></label>
          <label class="form-group"><span class="form-label">Phone</span>
            <input id="profilePhone" class="form-input" value="${EH.Fmt.esc(user.phone || '')}" /></label>
          <label class="form-group"><span class="form-label">Timezone</span>
            <input id="profileTimezone" class="form-input" value="${EH.Fmt.esc(user.timezone || 'UTC')}" /></label>
          <label class="form-group">
            <span class="form-label">Preferred mode</span>
            <select id="profileIntent" class="form-select">
              <option value="both"    ${S.userIntent === 'both'    ? 'selected' : ''}>Both - Learning & Consulting</option>
              <option value="learn"   ${S.userIntent === 'learn'   ? 'selected' : ''}>Learning only</option>
              <option value="consult" ${S.userIntent === 'consult' ? 'selected' : ''}>Consulting only</option>
            </select>
          </label>
          <label class="form-group form-group-full"><span class="form-label">Change avatar</span>
            <input type="file" id="avatarFile" class="form-input" accept="image/*" /></label>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" data-action="update-user-profile">
            <i class="fas fa-save"></i> Save Changes</button>
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

  EH.LearnerProfile = { render };
})(window);
