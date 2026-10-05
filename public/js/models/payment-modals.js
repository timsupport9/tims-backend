/* ============================================================
   ExpertHub 2.0 — payment-modals.js
   Functions moved intact from 13-modals.js.
   ============================================================ */

function openRefundModal(enrollmentId) {
  openModal({
    title: 'Request Refund',
    body: `
      <div class="alert alert-info"><i class="fas fa-info-circle"></i>
        Refunds are available within ${CONFIG.COURSE_REFUND_WINDOW_DAYS} days of purchase.
        Less than 30% completion is required.</div>
      <label class="form-group"><span class="form-label">Reason</span>
        <textarea id="refundReason" class="form-textarea" rows="4"
                  placeholder="Tell us why you'd like a refund"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="refundGo" class="btn btn-warning">Submit Request</button>`,
  });
  $('#refundGo').onclick = async () => {
    const reason = $('#refundReason').value.trim();
    if (!reason) return showToast('Please provide a reason', 'error');
    await apiCall(`/api/user/enrollments/${enrollmentId}/refund`, 'POST', { reason });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Refund requested', 'success');
  };
}
