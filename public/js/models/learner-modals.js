/* ============================================================
   ExpertHub 2.0 — learner-modals.js
   Functions moved intact from 13-modals.js.
   ============================================================ */

function openChangeIntentModal() {
  openModal({
    title: 'Choose your mode',
    body: `
      <p class="form-hint">This controls what appears on your dashboard.</p>
      <label class="form-group"><span class="form-label">Mode</span>
        <select id="intentSel" class="form-select">
          <option value="both" ${S.userIntent === 'both' ? 'selected' : ''}>Both - Learning and Consulting</option>
          <option value="learn" ${S.userIntent === 'learn' ? 'selected' : ''}>Learning only</option>
          <option value="consult" ${S.userIntent === 'consult' ? 'selected' : ''}>Consulting only</option>
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="intentSave" class="btn btn-primary">Save</button>`,
  });
  $('#intentSave').onclick = async () => {
    S.userIntent = $('#intentSel').value;
    await apiCall('/api/user/preferences', 'PUT', { intent: S.userIntent });
    closeModal(); rerenderRoleContent(); showToast('Mode updated', 'success');
  };
}
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

/* ---------- Institution — programme, cohort, session modals ---------- */
