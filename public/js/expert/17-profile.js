/* ============================================================
   ExpertHub 2.0 — js/expert/17-profile.js
   Expert profile (details + password).
   ============================================================ */

function expertProfile() {
  const portfolioCount = (S.expertPortfolio || []).length;
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
    <section class="page-header">
      <h1 class="page-title">My Profile</h1>
      <button class="btn btn-secondary" data-action="view-public-profile">
        <i class="fas fa-eye"></i> Preview Public Profile</button>
    </section>

    <section class="panel">
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(currentUser?.name || '')}</h2>
          <p class="profile-email">${esc(currentUser?.email || '')}</p>
          <p style="margin-top:6px">
            <span class="chip chip-neutral">${esc(currentUser?.specialization || 'No specialization')}</span>
            <span class="chip chip-blue" style="margin-left:6px">
              ${portfolioCount} portfolio item${portfolioCount === 1 ? '' : 's'}
            </span>
          </p>
        </div>
      </div>

      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Specialization</span>
          <input id="profileSpecialization" class="form-input"
                 value="${esc(currentUser?.specialization || '')}" />
        </label>
        <label class="form-group">
          <span class="form-label">Hourly rate ($)</span>
          <input id="profileRate" type="number" class="form-input"
                 value="${currentUser?.hourly_rate || ''}" />
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Bio</span>
          <textarea id="profileBio" class="form-textarea" rows="4">${esc(currentUser?.bio || '')}</textarea>
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Change avatar</span>
          <input type="file" id="avatarFile" class="form-input" accept="image/*" />
        </label>
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
    </section>
  `;
}
