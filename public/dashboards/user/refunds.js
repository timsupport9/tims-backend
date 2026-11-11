/* ============================================================
   ExpertHub 2.0 — dashboards/user/refunds.js
   Refund requests: eligibility, submission, tracking.
   ============================================================ */

function renderUserRefundRequests() {
  const refunds = S.userRefunds || [];
  return UserUI.page({
    title: 'Refund Requests',
    breadcrumb: 'Refund Requests',
    content: `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        <div>Courses can be refunded within ${CONFIG.COURSE_REFUND_WINDOW_DAYS} days of purchase if you have completed less than ${CONFIG.REFUND_MAX_PROGRESS_PCT}% of the content.</div>
      </div>
      <section class="panel">
        ${refunds.length ? `
          <ul class="list-stack">
            ${refunds.map(r => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(r.course_title)}</span>
                  <span class="list-row-sub">Requested ${timeAgo(r.requested_at)} · ${esc(r.reason || 'No reason given')}</span>
                </div>
                ${UserUI.statusPill(r.status)}
              </li>
            `).join('')}
          </ul>
        ` : UserUI.empty({
          icon: 'fa-rotate-left',
          title: 'No refund requests',
          desc: 'Refund requests you make will appear here.',
        })}
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('refunds', renderUserRefundRequests);

window.ExpertHubUser.registerAction('request-refund', async (enrollmentId) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/enrollments/${enrollmentId}/refund-eligibility`).catch(() => ({ eligible: true }));
    closeModal();
    if (!d.eligible) return showToast(d.reason || 'Not eligible for refund', 'warning');
    UserUI.formModal({
      title: 'Request Refund',
      fields: [
        { name: 'reason', label: 'Reason for refund', type: 'textarea', rows: 3, required: true },
      ],
      submitLabel: 'Submit Request',
      onSubmit: async (v) => {
        await apiCall('/api/user/enrollments/' + enrollmentId + '/refund', 'POST', v);
        closeModal();
        const r = await apiCall('/api/user/refunds').catch(() => ({ refunds: [] }));
        S.userRefunds = r.refunds || [];
        rerenderRoleContent();
        showToast('Refund request submitted', 'success');
      },
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});
