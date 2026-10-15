/* ============================================================
   ExpertHub 2.0 — 23-profile.js
   Learner profile, password change and privacy controls.
   ============================================================ */

/* ============================================================
   USER — PROFILE
   ============================================================ */
function userProfile() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
    <section class="page-header"><h1 class="page-title">My Profile</h1></section>

    <section class="panel">
      <div class="profile-header">
        <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
        <div>
          <h2 class="profile-name">${esc(currentUser?.name || '')}</h2>
          <p class="profile-email">${esc(currentUser?.email || '')}</p>
          <p style="margin-top:6px">
            <span class="chip chip-neutral">Level ${S.userLevel || 1}</span>
            <span class="chip chip-blue" style="margin-left:6px">
              ${S.userXP || 0} XP</span>
          </p>
        </div>
      </div>

      <div class="form-grid">
        <label class="form-group"><span class="form-label">Full name</span>
          <input id="profileName" class="form-input" value="${esc(currentUser?.name || '')}" /></label>
        <label class="form-group"><span class="form-label">Phone</span>
          <input id="profilePhone" class="form-input" value="${esc(currentUser?.phone || '')}" /></label>
        <label class="form-group"><span class="form-label">Timezone</span>
          <input id="profileTimezone" class="form-input" value="${esc(currentUser?.timezone || 'UTC')}" /></label>
        <label class="form-group">
          <span class="form-label">Preferred mode</span>
          <select id="profileIntent" class="form-select">
            <option value="both"    ${S.userIntent === 'both' ? 'selected' : ''}>Both - Learning and Consulting</option>
            <option value="learn"   ${S.userIntent === 'learn' ? 'selected' : ''}>Learning only</option>
            <option value="consult" ${S.userIntent === 'consult' ? 'selected' : ''}>Consulting only</option>
          </select>
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Change avatar</span>
          <input type="file" id="avatarFile" class="form-input" accept="image/*" />
        </label>
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

      <h3 class="panel-title" style="margin-top:24px">Privacy & Data</h3>
      <div class="panel-actions">
        <button class="btn btn-secondary" data-action="gdpr-export">
          <i class="fas fa-download"></i> Export My Data (GDPR)</button>
        <button class="btn btn-danger" data-action="gdpr-delete">
          <i class="fas fa-trash"></i> Delete Account</button>
      </div>
    </section>
  `;
}
