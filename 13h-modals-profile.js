/* ============================================================
   ExpertHub 2.0 — 13h-modals-profile.js
   Generic profile + password modals used across all roles.
   ============================================================ */

/* ---------- Profile generic ---------- */
async function updateUserProfile() {
  await apiCall('/api/user/profile', 'PUT', {
    name: $('#profileName')?.value,
    phone: $('#profilePhone')?.value,
    timezone: $('#profileTimezone')?.value,
    intent: $('#profileIntent')?.value || S.userIntent,
  });
  const me = await apiCall('/api/auth/me');
  currentUser = me.user;
  if (me.user.intent) S.userIntent = me.user.intent;
  localStorage.setItem('user', JSON.stringify(currentUser));
  showToast('Profile updated', 'success');
}

async function changePassword() {
  const oldp = $('#cpOld').value;
  const newp = $('#cpNew').value;
  if (!oldp || newp.length < 8) return showToast('New password must be 8+ characters', 'error');
  await apiCall('/api/auth/password', 'PUT', { old_password: oldp, new_password: newp });
  $('#cpOld').value = ''; $('#cpNew').value = '';
  showToast('Password updated', 'success');
}
