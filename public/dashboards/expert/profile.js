/* ============================================================
   dashboards/expert/profile.js
   ============================================================ */

function renderExpertProfile() {
  const portfolioCount = (S.expertPortfolio || []).length;
  const credentials = (S.expertCredentials || []).length;
  const reviews = (S.reviews || []).length;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
    <section class="page-header">
      <h1 class="page-title">My Profile</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-expert-action="view-public-profile">
          <i class="fas fa-eye"></i> Preview Public Profile</button>
      </div>
    </section>

    <section class="panel">
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(currentUser?.name || '')}</h2>
          <p class="profile-email">${esc(currentUser?.email || '')}</p>
          <p style="margin-top:6px">
            <span class="chip chip-neutral">${esc(currentUser?.specialization || 'No specialization')}</span>
            <span class="chip chip-blue" style="margin-left:6px">${portfolioCount} portfolio items</span>
            <span class="chip chip-blue" style="margin-left:6px">${credentials} credentials</span>
            <span class="chip chip-blue" style="margin-left:6px">${reviews} reviews</span>
          </p>
        </div>
      </div>

      <div class="form-grid">
        <label class="form-group"><span class="form-label">Full name</span>
          <input id="profileName" class="form-input" value="${esc(currentUser?.name || '')}" /></label>
        <label class="form-group"><span class="form-label">Specialization</span>
          <input id="profileSpecialization" class="form-input"
                 value="${esc(currentUser?.specialization || '')}" /></label>
        <label class="form-group"><span class="form-label">Hourly rate ($)</span>
          <input id="profileRate" type="number" class="form-input"
                 value="${currentUser?.hourly_rate || 0}" /></label>
        <label class="form-group"><span class="form-label">Phone</span>
          <input id="profilePhone" class="form-input" value="${esc(currentUser?.phone || '')}" /></label>
        <label class="form-group"><span class="form-label">Timezone</span>
          <input id="profileTimezone" class="form-input" value="${esc(currentUser?.timezone || 'UTC')}" /></label>
        <label class="form-group"><span class="form-label">Languages (comma separated)</span>
          <input id="profileLanguages" class="form-input"
                 value="${esc((currentUser?.languages || []).join(', '))}" /></label>
        <label class="form-group form-group-full"><span class="form-label">Bio</span>
          <textarea id="profileBio" class="form-textarea" rows="5">${esc(currentUser?.bio || '')}</textarea></label>
        <label class="form-group form-group-full"><span class="form-label">Change avatar</span>
          <input type="file" id="avatarFile" class="form-input" accept="image/*" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-expert-action="save-expert-profile">
          <i class="fas fa-save"></i> Save Profile</button>
        <button class="btn btn-secondary" data-expert-action="upload-avatar">
          <i class="fas fa-upload"></i> Upload Avatar</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Change Password</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Current password</span>
          <input id="cpOld" type="password" class="form-input" /></label>
        <label class="form-group"><span class="form-label">New password</span>
          <input id="cpNew" type="password" class="form-input" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-warning" data-expert-action="change-password">
          <i class="fas fa-lock"></i> Update Password</button>
      </div>
    </section>
  `;
}
