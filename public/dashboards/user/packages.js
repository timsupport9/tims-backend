/* ============================================================
   ExpertHub 2.0 — dashboards/user/packages.js
   Session packages + use credit.
   ============================================================ */

function renderUserPackages() {
  const pkgs = S.userPackages || [];
  return UserUI.page({
    title: 'Session Packages',
    breadcrumb: 'Packages',
    content: pkgs.length ? UserUI.cardGrid(pkgs.map(p => `
      <article class="program-card">
        <span class="chip chip-blue">${p.sessions_remaining} of ${p.sessions_total || p.sessions_remaining} left</span>
        <h4 class="program-title">${esc(p.package_name)}</h4>
        <p class="program-desc">with ${esc(p.expert_name)}</p>
        <footer class="program-footer">
          <span class="program-meta">Expires: ${fmtDate(p.expires_at)}</span>
        </footer>
        <div class="panel-actions" style="margin-top:10px">
          <button class="btn btn-primary btn-sm" data-action="use-package-credit"
                  data-id="${p.package_id}">
            <i class="fas fa-calendar-plus"></i> Book Next</button>
        </div>
      </article>
    `)) : `<section class="panel">${UserUI.empty({
      icon: 'fa-ticket-alt',
      title: 'No packages purchased',
      desc: 'Packages save you money on multi-session bookings. Browse experts to find packages.',
      actionTab: 'experts',
      actionLabel: 'Browse Experts',
    })}</section>`,
  });
}

window.ExpertHubUser.registerModule('packages', renderUserPackages);

window.ExpertHubUser.registerAction('use-package-credit', (packageId) => {
  openModal({
    title: 'Book Next Session',
    body: `
      <label class="form-group"><span class="form-label">Session Title</span>
        <input id="pkTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Preferred Date &amp; Time</span>
        <input id="pkWhen" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Notes</span>
        <textarea id="pkNotes" class="form-textarea" rows="3"></textarea></label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="pkSave" class="btn btn-primary">Redeem Credit</button>
    `,
  });
  $('#pkSave').onclick = async () => {
    const title = $('#pkTitle').value.trim();
    if (!title) return showToast('Title is required', 'error');
    try {
      await apiCall('/api/user/packages/redeem', 'POST', {
        package_id: Number(packageId),
        title,
        scheduled_at: $('#pkWhen').value || null,
        notes: $('#pkNotes').value || null,
      });
      closeModal();
      await reloadConsultations();
      await loadUserExtendedData();
      rerenderRoleContent();
      showToast('Session booked using credit', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
});
