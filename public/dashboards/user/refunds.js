/* ============================================================
   ExpertHub 2.0 — dashboards/user/refunds.js
   Refund requests with eligibility check, progress tracking,
   duplicate prevention, provider refund status.
   ============================================================ */

function renderUserRefundRequests() {
  const refunds = S.userRefunds || [];
  const pending   = refunds.filter(r => ['pending','approved','processing'].includes(r.status));
  const completed = refunds.filter(r => ['refunded','completed'].includes(r.status));
  const rejected  = refunds.filter(r => ['rejected','cancelled'].includes(r.status));

  return UserUI.page({
    title: 'Refund Requests',
    breadcrumb: 'Refund Requests',
    content: `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        <div>Courses can be refunded within ${CONFIG.COURSE_REFUND_WINDOW_DAYS} days of purchase if you have completed less than ${CONFIG.REFUND_MAX_PROGRESS_PCT}% of the content.</div>
      </div>

      ${pending.length ? `
        <section class="panel">
          <h3 class="panel-title">In Progress</h3>
          ${pending.map(r => `
            <div class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.course_title)}</span>
                <span class="list-row-sub">
                  Requested ${timeAgo(r.requested_at)} · ${esc(r.reason || 'No reason given')}
                  ${r.refund_amount ? ` · ${fmtCur(r.refund_amount)}` : ''}
                </span>
              </div>
              ${UserUI.statusPill(r.status)}
            </div>
          `).join('')}
        </section>
      ` : ''}

      ${completed.length ? `
        <section class="panel">
          <h3 class="panel-title">Completed</h3>
          ${completed.map(r => `
            <div class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.course_title)}</span>
                <span class="list-row-sub">${fmtCur(r.refund_amount || 0)} refunded · ${fmtDate(r.refunded_at || r.updated_at)}</span>
              </div>
              <span class="status status-active">Refunded</span>
            </div>
          `).join('')}
        </section>
      ` : ''}

      ${rejected.length ? `
        <section class="panel">
          <h3 class="panel-title">Rejected</h3>
          ${rejected.map(r => `
            <div class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.course_title)}</span>
                <span class="list-row-sub">${esc(r.rejection_reason || 'Reason not provided')}</span>
              </div>
              <span class="status status-rejected">Rejected</span>
            </div>
          `).join('')}
        </section>
      ` : ''}

      ${!refunds.length ? `
        <section class="panel">${UserUI.empty({
          icon: 'fa-rotate-left',
          title: 'No refund requests',
          desc: 'Refund requests you make will appear here.',
        })}</section>
      ` : ''}
    `,
  });
}

window.ExpertHubUser.registerModule('refunds', renderUserRefundRequests);

window.ExpertHubUser.registerAction('request-refund', async (enrollmentId) => {
  // Guard duplicate requests
  if ((S.userRefunds || []).some(r => String(r.enrollment_id) === String(enrollmentId) &&
      ['pending','approved','processing'].includes(r.status))) {
    return showToast('A refund for this enrollment is already in progress', 'info');
  }

  try {
    showLoading(true);
    const d = await apiCall(`/api/user/enrollments/${enrollmentId}/refund-eligibility`).catch(() => null);
    showLoading(false);
    if (!d) return showToast('Could not verify refund eligibility', 'error');
    if (!d.eligible) return showToast(d.reason || 'Not eligible for refund', 'warning');

    UserUI.formModal({
      title: 'Request Refund',
      fields: [
        { name: 'reason', label: 'Reason for refund', type: 'textarea', rows: 3, required: true },
        { name: 'refund_method', label: 'Refund method', type: 'select', value: 'wallet',
          options: [
            { value: 'wallet', label: 'Wallet credit (fastest)' },
            { value: 'original', label: 'Original payment method' },
          ],
          hint: `Estimated refund: ${fmtCur(d.amount || 0)}` },
      ],
      submitLabel: 'Submit Request',
      onSubmit: async (v) => {
        await apiCall(`/api/user/enrollments/${enrollmentId}/refund`, 'POST', v);
        closeModal();
        const r = await apiCall('/api/user/refunds').catch(() => ({ refunds: [] }));
        S.userRefunds = r.refunds || [];
        rerenderRoleContent();
        showToast('Refund request submitted', 'success');
      },
    });
  } catch (e) { showToast(e.message, 'error'); }
});