/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/packages.js */
/* Session packages: expiry warnings, atomic-verified redemption, */
/* idempotent credit use, usage history. */
/* ============================================================ */

const PACKAGE_EXPIRY_WARN_DAYS = 7;

function _isPackageUsable(p) {
  if (!p) return false;
  if (Number(p.sessions_remaining || 0) <= 0) return false;
  if (p.status && ['expired','cancelled','refunded'].includes(p.status)) return false;
  if (p.expires_at && new Date(p.expires_at).getTime() < Date.now()) return false;
  return true;
}

function _expiresSoon(p) {
  if (!p.expires_at) return false;
  const days = (new Date(p.expires_at).getTime() - Date.now()) / 86400000;
  return days > 0 && days <= PACKAGE_EXPIRY_WARN_DAYS;
}

function renderUserPackages() {
  const pkgs      = S.userPackages || [];
  const usable    = pkgs.filter(_isPackageUsable);
  const expired   = pkgs.filter(p => !_isPackageUsable(p) && Number(p.sessions_remaining || 0) > 0);
  const exhausted = pkgs.filter(p => Number(p.sessions_remaining || 0) <= 0);

  return UserUI.page({
    title: 'Session Packages',
    breadcrumb: 'Packages',
    actions: `
      <button class="btn btn-primary" data-action="browse-packages">
        <i class="fas fa-plus"></i> Buy Package</button>
    `,
    content: pkgs.length ? `
      ${usable.length ? `
        <section class="panel">
          <h3 class="panel-title">Active Packages</h3>
          <div class="card-grid">
            ${usable.map(p => `
              <article class="program-card">
                <span class="chip chip-green">${p.sessions_remaining} of ${p.sessions_total || p.sessions_remaining} left</span>
                ${_expiresSoon(p)
                  ? `<span class="chip chip-yellow" style="margin-left:6px">
                      <i class="fas fa-clock"></i> Expires soon</span>` : ''}
                <h4 class="program-title">${esc(p.package_name)}</h4>
                <p class="program-desc">with ${esc(p.expert_name || 'Expert')}</p>
                <footer class="program-footer">
                  <span class="program-meta">Expires: ${fmtDate(p.expires_at)}</span>
                </footer>
                <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px">
                  <button class="btn btn-primary btn-sm flex-1"
                          data-action="use-package-credit" data-id="${p.package_id}">
                    <i class="fas fa-calendar-plus"></i> Book Next</button>
                  <button class="btn btn-secondary btn-sm" data-action="package-history" data-id="${p.package_id}">
                    <i class="fas fa-history"></i></button>
                </div>
              </article>
            `).join('')}
          </div>
        </section>
      ` : ''}

      ${expired.length ? `
        <section class="panel">
          <h3 class="panel-title">Expired Packages</h3>
          ${expired.map(p => `
            <div class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(p.package_name)}</span>
                <span class="list-row-sub">Expired ${fmtDate(p.expires_at)} · ${p.sessions_remaining} unused</span>
              </div>
              <span class="status status-rejected">Expired</span>
            </div>
          `).join('')}
        </section>
      ` : ''}

      ${exhausted.length ? `
        <section class="panel">
          <h3 class="panel-title">Used Packages</h3>
          ${exhausted.map(p => `
            <div class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(p.package_name)}</span>
                <span class="list-row-sub">All sessions used</span>
              </div>
              <button class="btn btn-secondary btn-xs" data-action="package-history" data-id="${p.package_id}">
                History</button>
            </div>
          `).join('')}
        </section>
      ` : ''}
    ` : `<section class="panel">${UserUI.empty({
      icon: 'fa-ticket-alt',
      title: 'No packages purchased',
      desc: 'Packages save you money on multi-session bookings. Browse experts to find packages.',
      actionTab: 'experts',
      actionLabel: 'Browse Experts',
    })}</section>`,
  });
}

window.ExpertHubUser.registerModule('packages', renderUserPackages);

/* ---------------- Actions ---------------- */

window.ExpertHubUser.registerAction('use-package-credit', async (packageId) => {
  try {
    // Atomic freshness check before showing the form
    const fresh = await apiCall(`/api/user/packages/${packageId}`).catch(() => null);
    const p = fresh?.package || (S.userPackages || []).find(x => String(x.package_id) === String(packageId));
    if (!p) return showToast('Package not found', 'error');
    if (!_isPackageUsable(p)) return showToast('This package has expired or been exhausted', 'warning');

    let submitting = false;
    const idempotencyKey = `pkg_${packageId}_${currentUser?.id}_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;

    openModal({
      title: 'Book Next Session',
      body: `
        <div class="alert alert-info">
          <i class="fas fa-ticket-alt"></i>
          <div>Booking with <strong>${esc(p.package_name)}</strong>
            — ${p.sessions_remaining} credit${p.sessions_remaining === 1 ? '' : 's'} remaining.</div>
        </div>
        <label class="form-group"><span class="form-label">Session Title *</span>
          <input id="pkTitle" class="form-input" required maxlength="120" /></label>
        <label class="form-group"><span class="form-label">Preferred Date &amp; Time *</span>
          <input id="pkWhen" type="datetime-local" class="form-input"
                 min="${new Date(Date.now() + 3600000).toISOString().slice(0,16)}" required />
          <p class="form-hint">All times shown in ${esc(currentUser?.timezone || 'UTC')}.</p>
        </label>
        <label class="form-group"><span class="form-label">Notes</span>
          <textarea id="pkNotes" class="form-textarea" rows="3"></textarea></label>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button id="pkSave" class="btn btn-primary">Redeem Credit</button>
      `,
    });

    const btn = document.getElementById('pkSave');
    if (btn) btn.onclick = async () => {
      if (submitting) return;
      const title = document.getElementById('pkTitle').value.trim();
      const when  = document.getElementById('pkWhen').value;
      if (!title) return showToast('Title is required', 'error');
      if (!when)  return showToast('Pick a date and time', 'error');

      submitting = true;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Redeeming…';
      try {
        await apiCall('/api/user/packages/redeem', 'POST', {
          package_id:      Number(packageId),
          title,
          scheduled_at:    new Date(when).toISOString(),
          notes:           document.getElementById('pkNotes').value || null,
          idempotency_key: idempotencyKey,
        });
        closeModal();
        await reloadConsultations?.();
        await loadUserExtendedData({ force: true });
        rerenderRoleContent();
        showToast('Session booked using credit', 'success');
      } catch (e) {
        const msg = String(e?.message || '');
        if (/insufficient|expired|exhaust/i.test(msg)) {
          await loadUserExtendedData({ force: true });
          rerenderRoleContent();
          showToast('Credit no longer available — refreshed package state', 'warning', 6000);
        } else {
          showToast(msg || 'Redemption failed', 'error');
        }
        submitting = false;
        btn.disabled = false;
        btn.textContent = 'Redeem Credit';
      }
    };
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('package-history', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/packages/${id}/usage`).catch(() => ({ usage: [] }));
    closeModal();
    openModal({
      title: 'Package Usage History',
      className: 'modal-lg',
      body: (d.usage || []).length ? `
        <ul class="list-stack">
          ${(d.usage || []).map(u => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(u.title || 'Session')}</span>
                <span class="list-row-sub">${fmtDT(u.scheduled_at)} · ${esc(u.status || '')}</span>
              </div>
              <span class="chip chip-neutral">${esc(u.consultation_id ? 'Linked' : 'Free')}</span>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-row">No usage yet</p>',
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('browse-packages', () => {
  const experts = (S.experts || []).filter(e => e.has_packages);
  if (!experts.length) {
    return showToast('No experts currently offer packages. Browse all experts.', 'info');
  }
  activeTab = 'experts';
  rerenderRoleContent();
});
