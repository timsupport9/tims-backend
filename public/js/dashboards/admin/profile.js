/* ============================================================
   admin/profile.js — Admin profile
   ============================================================ */
(function () {
  AdminDash.reg('profile', {
    nav: { label: 'Profile', icon: 'fa-user' },
    render() {
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Profile</span></div>
        <section class="page-header"><h1 class="page-title">My Profile</h1></section>

        <section class="panel">
          <div class="profile-header">
            <img class="profile-avatar" src="${avatar(currentUser)}" alt="" />
            <div>
              <h2 class="profile-name">${esc(currentUser?.name||'')}</h2>
              <p class="profile-email">${esc(currentUser?.email||'')}</p>
            </div>
          </div>

          <div class="form-grid">
            <label class="form-group"><span class="form-label">Full name</span><input id="profileName" class="form-input" value="${esc(currentUser?.name||'')}" /></label>
            <label class="form-group"><span class="form-label">Phone</span><input id="profilePhone" class="form-input" value="${esc(currentUser?.phone||'')}" /></label>
            <label class="form-group"><span class="form-label">Timezone</span><input id="profileTimezone" class="form-input" value="${esc(currentUser?.timezone||'UTC')}" /></label>
            <label class="form-group form-group-full"><span class="form-label">Change avatar</span><input type="file" id="avatarFile" class="form-input" accept="image/*" /></label>
          </div>
          <div class="panel-actions">
            <button class="btn btn-primary" data-action="update-user-profile">Save Changes</button>
          </div>

          <h3 class="panel-title" style="margin-top:24px">Change Password</h3>
          <div class="form-grid">
            <label class="form-group"><span class="form-label">Current password</span><input id="cpOld" type="password" class="form-input" /></label>
            <label class="form-group"><span class="form-label">New password</span><input id="cpNew" type="password" class="form-input" /></label>
          </div>
          <div class="panel-actions">
            <button class="btn btn-warning" data-action="change-password">Update Password</button>
          </div>
        </section>`;
    },
    actions: {
      'update-user-profile': async () => {
        await apiCall('/api/user/profile', 'PUT', {
          name: $('#profileName').value,
          phone: $('#profilePhone').value,
          timezone: $('#profileTimezone').value,
        });
        const me = await apiCall('/api/auth/me');
        currentUser = me.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
        showToast('Profile updated','success');
      },
      'change-password': async () => {
        const oldp = $('#cpOld').value, newp = $('#cpNew').value;
        if (!oldp || newp.length < 8) return showToast('New password must be 8+ chars','error');
        await apiCall('/api/auth/password', 'PUT', { old_password: oldp, new_password: newp });
        $('#cpOld').value = ''; $('#cpNew').value = '';
        showToast('Password updated','success');
      },
    },
  });
})();
