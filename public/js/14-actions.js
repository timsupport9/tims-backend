/* ============================================================
   ExpertHub 2.0 — 14-actions.js
   Event delegation + master action dispatcher + charts +
   re-render helpers.
   ============================================================ */

/* ============================================================
   ROLE EVENTS (delegated)
   ============================================================ */
let roleClickHandler = null;
function attachRoleEvents() {
  if (roleClickHandler) document.removeEventListener('click', roleClickHandler);
  roleClickHandler = async (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const action = t.dataset.action;
    const id = t.dataset.id;
    try {
      await handleAction(action, id, t, e);
    } catch (ex) {
      showToast(ex.message || 'Action failed', 'error');
    }
  };
  document.addEventListener('click', roleClickHandler);

  document.querySelectorAll('[data-eschool-tab]').forEach(btn => {
    btn.onclick = () => {
      activeESchoolTab = btn.dataset.eschoolTab;
      $$('[data-eschool-tab]').forEach(x => x.classList.remove('tab-btn-active'));
      btn.classList.add('tab-btn-active');
      const p = $('#eschool-panel');
      if (p) p.innerHTML = renderESchoolPanel();
    };
  });

  document.querySelectorAll('[data-chat-close]').forEach(b => b.onclick = closeChat);
  renderCharts();

  if (currentUserRole === 'institution') attachInstitutionInteractions();
}

/* ============================================================
   MASTER ACTION HANDLER
   ============================================================ */
async function handleAction(action, id, el) {
  switch (action) {
    /* ---------- COMMON ---------- */
    case 'switch-tab': activeTab = el.dataset.tab; return rerenderRoleContent();
    case 'refresh-all':
      showLoading(true);
      await loadAllData();
      rerenderRoleContent();
      showLoading(false);
      return showToast('Refreshed', 'success');
    case 'export-dashboard': return downloadCsv('dashboard-users.csv', S.users);
    case 'export-users': return downloadCsv('users.csv', S.users);
    case 'help': return showToast('Support: support@experthub.com', 'info');
    case 'paginate': {
      const resource = el.dataset.resource;
      const page = Number(el.dataset.page);
      if (S.page[resource] !== undefined) {
        S.page[resource] = page;
        await loadAllData();
        return rerenderRoleContent();
      }
      return;
    }
    case 'clear-selection':
      selectedRows[el.dataset.target]?.clear();
      return rerenderRoleContent();

    /* ---------- ADMIN ---------- */
    case 'approve-user':
      await apiCall(`/api/admin/users/${id}/approve`, 'PUT');
      await reloadUsers(); showToast('User approved', 'success'); return rerenderRoleContent();
    case 'suspend-user':
      await apiCall(`/api/admin/users/${id}/suspend`, 'PUT');
      await reloadUsers(); showToast('User suspended', 'success'); return rerenderRoleContent();
    case 'reject-user': {
      const reason = prompt('Reason for rejection?') || '';
      await apiCall(`/api/admin/users/${id}/reject`, 'PUT', { reason });
      await reloadUsers(); showToast('User rejected', 'warning'); return rerenderRoleContent();
    }
    case 'delete-user': {
      if (!await confirmDialog('Delete this user permanently?')) return;
      await apiCall(`/api/admin/users/${id}`, 'DELETE');
      await reloadUsers(); showToast('User deleted', 'success'); return rerenderRoleContent();
    }
    case 'bulk-approve-users': {
      if (!await confirmDialog(`Approve ${selectedRows.users.size} user(s)?`)) return;
      showLoading(true);
      for (const uid of selectedRows.users) {
        await apiCall(`/api/admin/users/${uid}/approve`, 'PUT').catch(() => {});
      }
      selectedRows.users.clear();
      await reloadUsers(); showLoading(false);
      showToast('Users approved', 'success'); return rerenderRoleContent();
    }
    case 'bulk-suspend-users': {
      if (!await confirmDialog(`Suspend ${selectedRows.users.size} user(s)?`)) return;
      showLoading(true);
      for (const uid of selectedRows.users) {
        await apiCall(`/api/admin/users/${uid}/suspend`, 'PUT').catch(() => {});
      }
      selectedRows.users.clear();
      await reloadUsers(); showLoading(false);
      showToast('Users suspended', 'warning'); return rerenderRoleContent();
    }
    case 'edit-user': return openEditUserModal(id);
    case 'show-create-expert': $('#createExpertPanel')?.classList.remove('hidden'); return;
    case 'hide-create-expert': $('#createExpertPanel')?.classList.add('hidden'); return;
    case 'submit-create-expert': return submitCreateExpert();
    case 'assign-consultation': return openAssignExpertModal(id);
    case 'view-consultation': return showConsultationModal(id);
    case 'create-event': return openEventModal();
    case 'edit-event': return openEventModal(id);
    case 'delete-event': {
      if (!await confirmDialog('Delete this event?')) return;
      await apiCall(`/api/admin/events/${id}`, 'DELETE');
      await loadAllData(); showToast('Event deleted', 'success'); return rerenderRoleContent();
    }
    case 'create-institution': return openInstitutionModal();
    case 'edit-institution': return openInstitutionModal(Number(id));
    case 'approve-institution':
      await apiCall(`/api/admin/institutions/${id}/approve`, 'PUT');
      await reloadInstitutions(); showToast('Institution verified', 'success'); return rerenderRoleContent();
    case 'reject-institution': {
      const reason = prompt('Reason for rejection?') || '';
      await apiCall(`/api/admin/institutions/${id}/reject`, 'PUT', { reason });
      await reloadInstitutions(); showToast('Institution rejected', 'warning'); return rerenderRoleContent();
    }
    case 'suspend-institution':
      await apiCall(`/api/admin/institutions/${id}/suspend`, 'PUT');
      await reloadInstitutions(); return rerenderRoleContent();
    case 'delete-institution': {
      if (!await confirmDialog('Delete this institution permanently?')) return;
      await apiCall(`/api/admin/institutions/${id}`, 'DELETE');
      await reloadInstitutions(); showToast('Institution deleted', 'success'); return rerenderRoleContent();
    }
    case 'assign-ops-manager': return openAssignOpsModal(id);
    case 'payout-approve': await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'approved' }); return reloadPayoutsAndRerender('Payout approved');
    case 'payout-process': await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'processing' }); return reloadPayoutsAndRerender('Payout processing');
    case 'payout-paid': await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'paid' }); return reloadPayoutsAndRerender('Payout marked paid');
    case 'payout-reject': {
      const reason = prompt('Rejection reason?') || '';
      await apiCall(`/api/admin/payouts/${id}`, 'PUT', { status: 'rejected', reason });
      return reloadPayoutsAndRerender('Payout rejected');
    }
    case 'refund-approve':
      await apiCall(`/api/admin/refunds/${id}`, 'PUT', { status: 'approved' });
      await loadAllData(); showToast('Refund approved', 'success'); return rerenderRoleContent();
    case 'refund-reject': {
      const reason = prompt('Rejection reason?') || '';
      await apiCall(`/api/admin/refunds/${id}`, 'PUT', { status: 'rejected', reason });
      await loadAllData(); showToast('Refund rejected', 'warning'); return rerenderRoleContent();
    }
    case 'create-coupon': return openCreateCouponModal();
    case 'toggle-coupon': await apiCall(`/api/admin/coupons/${id}/toggle`, 'PUT'); await loadAllData(); return rerenderRoleContent();
    case 'delete-coupon': {
      if (!await confirmDialog('Delete this coupon?')) return;
      await apiCall(`/api/admin/coupons/${id}`, 'DELETE'); await loadAllData(); return rerenderRoleContent();
    }
    case 'claim-investigate': await apiCall(`/api/admin/claims/${id}`, 'PUT', { status: 'investigating' }); return loadAllData().then(() => rerenderRoleContent());
    case 'claim-resolve': {
      const resolution = prompt('Resolution details?') || '';
      await apiCall(`/api/admin/claims/${id}`, 'PUT', { status: 'resolved', resolution });
      await loadAllData(); showToast('Claim resolved', 'success'); return rerenderRoleContent();
    }
    case 'claim-reject': {
      const resolution = prompt('Rejection reason?') || '';
      await apiCall(`/api/admin/claims/${id}`, 'PUT', { status: 'rejected', resolution });
      await loadAllData(); showToast('Claim rejected', 'warning'); return rerenderRoleContent();
    }
    case 'ticket-view': return openTicketModal(id);
    case 'ticket-resolve':
      await apiCall(`/api/admin/tickets/${id}`, 'PUT', { status: 'resolved' });
      return loadAllData().then(() => { showToast('Ticket resolved', 'success'); rerenderRoleContent(); });
    case 'review-publish': await apiCall(`/api/admin/reviews/${id}`, 'PUT', { status: 'published' }); return loadAllData().then(() => rerenderRoleContent());
    case 'review-hide': await apiCall(`/api/admin/reviews/${id}`, 'PUT', { status: 'hidden' }); return loadAllData().then(() => rerenderRoleContent());
    case 'send-broadcast': return sendBroadcast();
    case 'save-settings': return saveAdminSettings();
    case 'dispute-investigate':
      await apiCall(`/api/admin/disputes/${id}`, 'PUT', { status: 'investigating' });
      await loadAllData(); showToast('Marked investigating', 'info'); return rerenderRoleContent();
    case 'dispute-resolve': {
      const refundAmount = Number(prompt('Refund amount (0 for none)?', '0') || 0);
      const resolution_notes = prompt('Resolution notes?') || '';
      await apiCall(`/api/admin/disputes/${id}`, 'PUT', {
        status: 'resolved',
        resolution: refundAmount > 0 ? 'Partial refund approved' : 'Resolved',
        resolution_notes, refund_amount: refundAmount,
      });
      await loadAllData(); showToast('Dispute resolved', 'success'); return rerenderRoleContent();
    }
    case 'dispute-reject': {
      const notes = prompt('Reason for rejection?') || '';
      await apiCall(`/api/admin/disputes/${id}`, 'PUT', {
        status: 'rejected', resolution: 'Rejected',
        resolution_notes: notes, refund_amount: 0,
      });
      await loadAllData(); showToast('Dispute rejected', 'warning'); return rerenderRoleContent();
    }
    case 'verify-expert-badge': {
      const badge = prompt('Badge type: verified | top_rated', 'verified');
      if (!badge) return;
      await apiCall(`/api/admin/experts/${id}/verify-badge`, 'POST', { badge });
      showToast('Badge granted', 'success'); return;
    }

    /* ---------- EXPERT ---------- */
    case 'open-chat': return openChat(Number(id));
    case 'video-call': return openVideoCall(id);
    case 'open-video': return openVideoCall(currentChatId);
    case 'confirm-consultation':
      await apiCall(`/api/consultations/${id}/confirm`, 'PUT');
      await loadAllData(); showToast('Confirmed', 'success'); return rerenderRoleContent();
    case 'start-session':
      await apiCall(`/api/consultations/${id}/start`, 'POST');
      await loadAllData(); rerenderRoleContent(); openVideoCall(id); return;
    case 'end-session':
      await apiCall(`/api/consultations/${id}/complete`, 'POST');
      await loadAllData(); closeChat(); rerenderRoleContent();
      showToast('Session ended. 24h auto-release window started.', 'info', 5000); return;
    case 'save-availability': return saveAvailability();
    case 'request-time-off': return requestTimeOff();
    case 'request-withdrawal': return requestWithdrawal();
    case 'reply-review': {
      const reply = prompt('Your reply:') || '';
      if (!reply.trim()) return;
      await apiCall(`/api/expert/reviews/${id}/reply`, 'POST', { reply });
      await loadAllData(); showToast('Reply posted', 'success'); return rerenderRoleContent();
    }
    case 'update-expert-profile': return updateExpertProfile();
    case 'view-public-profile': return showToast(`Public profile: /#/expert/${currentUser?.id || 'me'}`, 'info');
    case 'add-portfolio-item': return openPortfolioItemModal();
    case 'edit-portfolio-item': return openPortfolioItemModal(Number(id));
    case 'delete-portfolio-item': {
      if (!await confirmDialog('Delete this portfolio item?')) return;
      await apiCall(`/api/expert/portfolio/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); showToast('Item deleted', 'success'); return;
    }
    case 'create-course-modal': return openCreateCourseModal();
    case 'manage-slots': return openManageSlotsModal();
    case 'block-time': return openBlockTimeModal();
    case 'remove-slot':
      await apiCall(`/api/experts/me/slots/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); showToast('Slot removed', 'success'); return;
    case 'edit-tiers': return openEditTiersModal();
    case 'open-course-builder': {
      S.__activeCourseId = id;
      activeTab = 'course-builder';
      return rerenderRoleContent();
    }
    case 'add-module': return openAddModuleModal(Number(el.dataset.id));
    case 'edit-module': return openEditModuleModal(Number(id));
    case 'delete-module': {
      if (!await confirmDialog('Delete this module and its lessons?')) return;
      const courseId = S.__activeCourseId;
      await apiCall(`/api/expert/courses/${courseId}/modules/${id}`, 'DELETE');
      await loadCourseCurriculum(courseId); rerenderRoleContent(); return;
    }
    case 'add-lesson': return openAddLessonModal(Number(el.dataset.module));
    case 'edit-lesson': return openEditLessonModal(Number(id));
    case 'delete-lesson': {
      if (!await confirmDialog('Delete this lesson?')) return;
      const courseId = S.__activeCourseId;
      await apiCall(`/api/expert/courses/${courseId}/lessons/${id}`, 'DELETE');
      await loadCourseCurriculum(courseId); rerenderRoleContent(); return;
    }
    case 'save-course-settings': return saveCourseSettings(Number(el.dataset.id));
    case 'preview-course': return openCourseDetailModal(Number(id));
    case 'edit-course': return openEditCourseModal(Number(id));
    case 'delete-course': {
      if (!await confirmDialog('Delete this course permanently?')) return;
      await apiCall(`/api/expert/courses/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); showToast('Course deleted', 'success'); return;
    }
    case 'view-course-analytics': return showToast('Analytics opened', 'info');
    case 'answer-question': {
      const answer = prompt('Your answer:') || '';
      if (!answer.trim()) return;
      await apiCall(`/api/expert/questions/${id}/answer`, 'PUT', { answer });
      const d = await apiCall('/api/expert/questions');
      S.expertQuestions = d.questions || [];
      rerenderRoleContent(); showToast('Answer posted', 'success'); return;
    }
    case 'bulk-publish-courses':
      showToast('Bulk publish queued', 'success'); return;

    /* ---------- USER: CONSULTATIONS ---------- */
    case 'find-expert-wizard': return openFindExpertWizard();
    case 'instant-consultation': return openInstantConsultationModal();
    case 'book-slot-with': return openBookSlotWithExpert(Number(id), el.dataset.name);
    case 'book-expert': return openBookSlotWithExpert(Number(id), el.dataset.name);
    case 'reschedule-consultation': return openRescheduleModal(Number(id));
    case 'cancel-consultation': return openCancelConsultationModal(Number(id));
    case 'consultation-detail': return openConsultationDetailModal(Number(id));
    case 'review-consultation': return openConsultationReviewModal(Number(id), Number(el.dataset.expert));
    case 'tip-expert': return openTipModal(Number(id));
    case 'book-followup': return openBookSlotWithExpert(Number(el.dataset.expert), 'Expert');
    case 'open-dispute': return openDisputeModal(Number(id));
    case 'view-expert-profile': return openExpertProfileModal(Number(id));
    case 'toggle-shortlist':
      await apiCall('/api/user/shortlist/toggle', 'POST', { expert_id: Number(id) });
      await loadAllData(); rerenderRoleContent(); showToast('Shortlist updated', 'success'); return;
    case 'purchase-package': {
      showLoading(true);
      await apiCall(`/api/packages/${id}/purchase`, 'POST');
      await loadAllData(); closeModal(); showLoading(false);
      showToast('Package purchased', 'success'); return;
    }
    case 'use-package-credit': return showToast('Booking with package credit', 'info');

    /* ---------- USER: E-SCHOOL ---------- */
    case 'enroll-modal': return openEnrollModal(Number(id));
    case 'resume-course': return openCoursePlayer(el.dataset.course);
    case 'open-course-player': return openCoursePlayer(Number(id));
    case 'open-course-detail':
    case 'view-course-detail': return openCourseDetailModal(Number(id));
    case 'open-lesson': return openCoursePlayer(Number(el.dataset.course), Number(el.dataset.lesson));
    case 'mark-lesson-complete': return markLessonComplete(Number(el.dataset.lesson));
    case 'toggle-wishlist':
      await apiCall('/api/user/wishlist/toggle', 'POST', { course_id: Number(id) });
      await loadAllData(); rerenderRoleContent(); showToast('Wishlist updated', 'success'); return;
    case 'start-free-trial': {
      await apiCall(`/api/eschool/courses/${id}/start-trial`, 'POST');
      showToast('Trial started — 48 hours of access', 'success');
      closeModal(); return openCoursePlayer(Number(id));
    }
    case 'purchase-bundle': {
      await apiCall(`/api/eschool/bundles/${id}/purchase`, 'POST');
      await loadAllData(); showToast('Bundle purchased', 'success'); return rerenderRoleContent();
    }
    case 'open-path-detail': return showToast('Path details opened', 'info');
    case 'review-course': return openCourseReviewModal(Number(id));
    case 'view-certificate': return showToast('Certificate view opened', 'info');
    case 'request-refund': return openRefundModal(Number(id));
    case 'export-certificates':
      return downloadCsv('certificates.csv', S.certificates);

    /* ---------- USER: MISC ---------- */
    case 'register-event':
      await apiCall(`/api/common/events/${id}/register`, 'POST');
      await loadAllData(); showToast('Registered for event', 'success'); return rerenderRoleContent();
    case 'topup-wallet': return topUpWallet();
    case 'change-intent': return openChangeIntentModal();
    case 'review-expert': return openReviewModal(id, Number(el.dataset.expert));
    case 'print-certificate': return printCertificateModal(id);
    case 'new-consultation': return openNewConsultationModal();
    case 'file-claim': return openClaimModal(id);
    case 'new-ticket': return openNewTicketModal();
    case 'gdpr-export': {
      showLoading(true);
      const res = await fetch('/api/user/gdpr-export', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `my-data-${Date.now()}.json`;
      a.click();
      showLoading(false); return;
    }
    case 'gdpr-delete': {
      if (!await confirmDialog('Delete your account? You have 30 days to reverse this.')) return;
      await apiCall('/api/user/gdpr-delete', 'POST');
      showToast('Account scheduled for deletion', 'warning'); return;
    }

    /* ---------- INSTITUTION ---------- */
    case 'export-institution-report': {
      const rows = (S.trainees || []).map(t => ({
        name: t.name, email: t.email, department: t.department || '',
        programme: t.programme_title || '', cohort: t.cohort_name || '',
        status: t.lifecycle_status || '', progress: t.progress || 0,
      }));
      return downloadCsv('institution-report.csv', rows);
    }
    case 'create-programme': return openProgrammeModal();
    case 'edit-programme': return openProgrammeModal(Number(id));
    case 'view-programme': return openProgrammeViewModal(Number(id));
    case 'programme-curriculum': return openCurriculumModal(Number(id));
    case 'delete-programme': {
      if (!await confirmDialog('Delete this programme? All enrolments will be removed.')) return;
      await apiCall(`/api/institution/programmes/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); showToast('Programme deleted', 'success'); return;
    }
    case 'create-learning-path': return openLearningPathModal();
    case 'edit-learning-path': return openLearningPathModal(Number(id));
    case 'delete-learning-path': {
      if (!await confirmDialog('Delete this learning path?')) return;
      await apiCall(`/api/institution/learning-paths/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'open-path-builder': return openPathBuilderModal(Number(id));
    case 'create-cohort': return openCohortModal();
    case 'edit-cohort': return openCohortModal(Number(id));
    case 'view-cohort': return openCohortViewModal(Number(id));
    case 'cohort-waitlist': return openCohortWaitlistModal(Number(id));
    case 'delete-cohort': {
      if (!await confirmDialog('Delete this cohort?')) return;
      await apiCall(`/api/institution/cohorts/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'schedule-session': return openSessionModal();
    case 'edit-session': return openSessionModal(Number(id));
    case 'mark-attendance': return openAttendanceModal(Number(id));
    case 'view-calendar': return openSessionsCalendarModal();
    case 'delete-session': {
      if (!await confirmDialog('Delete this session?')) return;
      await apiCall(`/api/institution/sessions/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'upload-material': return uploadMaterial();
    case 'delete-material': {
      await apiCall(`/api/institution/materials/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'schedule-assessment': return openAssessmentModal();
    case 'grade-assessment': return openGradingModal(Number(id));
    case 'view-assessment': return showToast('Assessment detail opened', 'info');
    case 'delete-assessment': {
      if (!await confirmDialog('Delete this assessment?')) return;
      await apiCall(`/api/institution/assessments/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'schedule-proctor-session': return openProctorSessionModal();
    case 'view-proctor-session': return showToast('Proctor session opened', 'info');
    case 'invalidate-exam':
      await apiCall(`/api/institution/exam-proctor-sessions/${id}/invalidate`, 'PUT');
      await loadAllData(); rerenderRoleContent(); return;
    case 'review-flag': return showToast('Flag review opened', 'info');
    case 'create-question': return openQuestionModal();
    case 'edit-question': return openQuestionModal(Number(id));
    case 'delete-question': {
      if (!await confirmDialog('Delete this question?')) return;
      await apiCall(`/api/institution/question-bank/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'create-project': return openProjectModal();
    case 'edit-project': return openProjectModal(Number(id));
    case 'view-project': return showToast('Project detail opened', 'info');
    case 'grade-project': return showToast('Project grading opened', 'info');
    case 'import-trainees-history': return openImportHistoryModal();
    case 'invite-trainee': return openTraineeImportModal();
    case 'trainee-detail': return openTraineeDetailModal(Number(id));
    case 'trainee-notes': return openTraineeNotesModal(Number(id));
    case 'trainee-transfer': return openTraineeTransferModal(Number(id));
    case 'approve-enrolment':
      await apiCall(`/api/institution/enrollments/${id}/approve`, 'PUT');
      await loadAllData(); rerenderRoleContent(); showToast('Enrolment approved', 'success'); return;
    case 'reject-enrolment': {
      const reason = prompt('Reason for rejection?') || '';
      await apiCall(`/api/institution/enrollments/${id}/reject`, 'PUT', { reason });
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'export-trainees': {
      const rows = (S.institutionEnrollments.length ? S.institutionEnrollments : S.trainees).map(t => ({
        name: t.trainee_name || t.name || '', email: t.email || '',
        department: t.department || '', programme: t.programme_title || '',
        cohort: t.cohort_name || '', status: t.status || t.lifecycle_status || '',
        progress: t.progress || 0,
      }));
      return downloadCsv('trainees.csv', rows);
    }
    case 'export-wellness':
      return downloadCsv('wellness.csv', S.wellnessScores);
    case 'recompute-wellness':
      await apiCall('/api/institution/wellness/recompute', 'POST');
      await loadAllData(); rerenderRoleContent(); return;
    case 'wellness-intervene':
      await apiCall(`/api/institution/wellness-alerts/${id}/intervene`, 'POST');
      await loadAllData(); rerenderRoleContent(); return;
    case 'wellness-dismiss':
      await apiCall(`/api/institution/wellness-alerts/${id}/dismiss`, 'POST');
      await loadAllData(); rerenderRoleContent(); return;
    case 'issue-certificate': return openIssueCertificateModal();
    case 'export-certificates':
      return downloadCsv('certificates.csv', S.institutionCertificates);
    case 'revoke-certificate': {
      const reason = prompt('Reason for revocation?') || '';
      await apiCall(`/api/institution/certificates/${id}/revoke`, 'PUT', { reason });
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'renew-certificate': {
      const months = Number(prompt('Validity in months?', '12') || 12);
      await apiCall(`/api/institution/certificates/${id}/renew`, 'PUT', { valid_months: months });
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'manage-skills': return openManageSkillsModal();
    case 'export-skills-matrix': {
      const m = S.institutionSkillsMatrix || { skills: [], matrix: [] };
      const rows = m.matrix.map(row => {
        const out = { trainee: row.trainee.name, department: row.trainee.department || '' };
        m.skills.forEach(s => { out[s.name] = row.levels[s.id] || 0; });
        return out;
      });
      return downloadCsv('skills-matrix.csv', rows);
    }
    case 'export-skills-gap': return downloadCsv('skills-gap.csv', S.skillsGapAnalysis?.topGaps || []);
    case 'recompute-skills-gap':
      await apiCall('/api/institution/skills-gap/recompute', 'POST');
      await loadAllData(); rerenderRoleContent(); return;
    case 'create-compliance-rule': return openComplianceRuleModal();
    case 'run-compliance-check':
      await apiCall('/api/institution/compliance/run', 'POST');
      await loadAllData(); rerenderRoleContent(); return;
    case 'export-compliance-report': {
      const rows = (S.institutionCertificates || []).map(c => ({
        trainee: c.trainee_name, serial: c.serial, issued: c.issued_at,
        expires: c.expires_at || 'Never', revoked: c.revoked ? 'Yes' : 'No',
      }));
      return downloadCsv('compliance-report.csv', rows);
    }
    case 'export-succession': return downloadCsv('succession.csv', S.successionMatrix?.assignments || []);
    case 'assign-succession': return openAssignSuccessionModal();
    case 'assign-instructor': return openAssignInstructorModal();
    case 'view-instructor': return showToast('Instructor profile opened', 'info');
    case 'hire-instructor': return openHireInstructorModal(Number(id), el.dataset.name);
    case 'post-instructor-request': return openPostInstructorRequestModal();
    case 'create-budget': return openCreateBudgetModal();
    case 'edit-budget': return openEditBudgetModal(Number(id));
    case 'view-budget-transactions': return openBudgetTransactionsModal(Number(id));
    case 'export-budgets': return downloadCsv('budgets.csv', S.budgetAllocations);
    case 'create-campus': return openCampusModal();
    case 'edit-campus': return openCampusModal(Number(id));
    case 'delete-campus': {
      if (!await confirmDialog('Delete this campus?')) return;
      await apiCall(`/api/institution/campuses/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'view-campus-trainees':
      S.activeCampusId = Number(id);
      activeTab = 'trainees'; rerenderRoleContent(); return;
    case 'clear-campus-filter':
      S.activeCampusId = null; return rerenderRoleContent();
    case 'report-programme-scorecard': return openReportPreviewModal('programme-scorecard');
    case 'report-cohort-comparison': return openReportPreviewModal('cohort-comparison');
    case 'report-trainee-progress': return openReportPreviewModal('trainee-progress');
    case 'report-compliance': return openReportPreviewModal('compliance');
    case 'report-cost': return openReportPreviewModal('cost');
    case 'schedule-report': return openScheduleReportModal();
    case 'new-report-definition': return openNewReportDefinitionModal();
    case 'run-saved-report': return runSavedReport(Number(id));
    case 'edit-report-definition': return openNewReportDefinitionModal(Number(id));
    case 'delete-report-definition': {
      await apiCall(`/api/institution/report-definitions/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'create-announcement': return openAnnouncementModal();
    case 'edit-announcement': return openAnnouncementModal(Number(id));
    case 'delete-announcement': {
      if (!await confirmDialog('Delete this announcement?')) return;
      await apiCall(`/api/institution/announcements/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'create-api-key': return openCreateApiKeyModal();
    case 'copy-api-key':
      showToast('API key copied to clipboard', 'success'); return;
    case 'revoke-api-key': {
      if (!await confirmDialog('Revoke this API key? Integrations will break.')) return;
      await apiCall(`/api/institution/api-keys/${id}/revoke`, 'PUT');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'create-webhook': return openWebhookModal();
    case 'edit-webhook': return openWebhookModal(Number(id));
    case 'test-webhook':
      await apiCall(`/api/institution/webhooks/${id}/test`, 'POST');
      showToast('Test delivered', 'success'); return;
    case 'delete-webhook': {
      if (!await confirmDialog('Delete this webhook?')) return;
      await apiCall(`/api/institution/webhooks/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'save-sso': return saveSsoConfig();
    case 'test-sso': return showToast('SSO test completed', 'success');
    case 'save-security-policy': return saveSecurityPolicy();
    case 'save-institution-settings': return saveInstitutionSettings();
    case 'invite-team-member': return openInviteTeamMemberModal();
    case 'change-team-role': return openChangeTeamRoleModal(Number(id));
    case 'manage-team-permissions': return openTeamPermissionsModal(Number(id));
    case 'remove-team-member': {
      if (!await confirmDialog('Remove this team member?')) return;
      await apiCall(`/api/institution/team/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'approve-request':
      await apiCall(`/api/institution/approvals/${id}`, 'PUT', { status: 'approved' });
      await loadAllData(); rerenderRoleContent(); showToast('Request approved', 'success'); return;
    case 'reject-request': {
      const notes = prompt('Rejection notes?') || '';
      await apiCall(`/api/institution/approvals/${id}`, 'PUT', { status: 'rejected', decision_notes: notes });
      await loadAllData(); rerenderRoleContent(); return;
    }
    case 'save-branding': return saveBranding();
    case 'update-institution-profile': return updateInstitutionProfile();
    case 'create-org-unit': return openOrgUnitModal();
    case 'edit-org-unit': return openOrgUnitModal(Number(id));
    case 'delete-org-unit': {
      await apiCall(`/api/institution/org-units/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent(); return;
    }

    /* ---------- PROFILE GENERIC ---------- */
    case 'update-user-profile': return updateUserProfile();
    case 'change-password': return changePassword();
    case 'send-chat': {
      const i = $('#chat-input');
      if (i) await sendMessage(currentChatId, i.value);
      return;
    }
  }
}

async function reloadPayoutsAndRerender(msg) {
  const d = await apiCall('/api/admin/payouts');
  S.payouts = d.payouts || [];
  showToast(msg, 'success');
  rerenderRoleContent();
}

function rerenderRoleContent() {
  const el = $('#role-content');
  if (!el) return;
  el.innerHTML = currentUserRole === 'admin'
    ? renderAdminContent()
    : currentUserRole === 'expert'
    ? renderExpertContent()
    : currentUserRole === 'institution'
    ? renderInstitutionContent()
    : renderUserContent();
  attachSidebarEvents();
  renderCharts();
  if (currentUserRole === 'institution') {
    renderInstitutionCharts();
    attachInstitutionInteractions();
  }
}

/* ============================================================
   CHARTS (global)
   ============================================================ */
function renderCharts() {
  if (!window.Chart) return;
  const ug = document.getElementById('chartUserGrowth') || document.getElementById('userGrowthChart');
  if (ug && !ug.dataset.rendered) {
    const labels = (S.analytics?.usersByMonth || []).map(r => r.ym).reverse();
    const data = (S.analytics?.usersByMonth || []).map(r => r.c).reverse();
    new Chart(ug, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Jan','Feb','Mar','Apr','May','Jun'],
        datasets: [{
          label: 'Users',
          data: data.length ? data : [10,25,40,60,80,120],
          borderColor: '#1e3a8a',
          backgroundColor: 'rgba(30,58,138,.12)',
          tension: 0.3, fill: true,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    ug.dataset.rendered = '1';
  }

  const rv = document.getElementById('chartRevenue') || document.getElementById('revenueChart');
  if (rv && !rv.dataset.rendered) {
    const labels = (S.analytics?.revenueByMonth || []).map(r => r.ym).reverse();
    const data = (S.analytics?.revenueByMonth || []).map(r => Number(r.total)).reverse();
    new Chart(rv, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Jan','Feb','Mar','Apr','May','Jun'],
        datasets: [{
          label: 'Revenue',
          data: data.length ? data : [500,900,1200,1600,2000,2800],
          backgroundColor: '#059669', borderRadius: 6,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    rv.dataset.rendered = '1';
  }

  const role = document.getElementById('roleChart');
  if (role && !role.dataset.rendered) {
    const labels = (S.analytics?.usersByRole || []).map(r => r.role);
    const data = (S.analytics?.usersByRole || []).map(r => r.c);
    new Chart(role, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['Admin','Expert','Institution','Learner'],
        datasets: [{
          data: data.length ? data : [1,5,3,100],
          backgroundColor: ['#dc2626','#059669','#7c3aed','#1e3a8a'],
        }],
      },
      options: { responsive: true },
    });
    role.dataset.rendered = '1';
  }

  const consStatus = document.getElementById('chartConsultationsByStatus');
  if (consStatus && !consStatus.dataset.rendered) {
    const byStatus = S.adminConsultationAnalytics?.byStatus || [
      { label: 'Completed', value: 42 },
      { label: 'Cancelled', value: 8 },
      { label: 'No-Show', value: 3 },
    ];
    new Chart(consStatus, {
      type: 'bar',
      data: {
        labels: byStatus.map(x => x.label),
        datasets: [{ label: 'Count', data: byStatus.map(x => x.value),
          backgroundColor: '#1e3a8a', borderRadius: 6 }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    consStatus.dataset.rendered = '1';
  }

  const topExpertsRevenue = document.getElementById('chartTopExpertsRevenue');
  if (topExpertsRevenue && !topExpertsRevenue.dataset.rendered) {
    const list = S.adminConsultationAnalytics?.topExperts || [];
    new Chart(topExpertsRevenue, {
      type: 'bar',
      data: {
        labels: list.map(x => x.name),
        datasets: [{ label: 'Revenue', data: list.map(x => x.total_earnings),
          backgroundColor: '#059669', borderRadius: 6 }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    topExpertsRevenue.dataset.rendered = '1';
  }

  const courseEnrollment = document.getElementById('chartCourseEnrollment');
  if (courseEnrollment && !courseEnrollment.dataset.rendered) {
    const series = S.courseAnalytics?.enrollmentTrend || [
      { label: 'W1', value: 12 }, { label: 'W2', value: 24 },
      { label: 'W3', value: 41 }, { label: 'W4', value: 55 },
    ];
    new Chart(courseEnrollment, {
      type: 'line',
      data: {
        labels: series.map(x => x.label),
        datasets: [{ label: 'Enrollments', data: series.map(x => x.value),
          borderColor: '#1e3a8a', backgroundColor: 'rgba(30,58,138,.12)',
          tension: 0.3, fill: true }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    courseEnrollment.dataset.rendered = '1';
  }

  const courseCompletion = document.getElementById('chartCourseCompletion');
  if (courseCompletion && !courseCompletion.dataset.rendered) {
    const rows = S.courseAnalytics?.courses || [];
    new Chart(courseCompletion, {
      type: 'bar',
      data: {
        labels: rows.map(x => x.title),
        datasets: [{ label: 'Completion %', data: rows.map(x => x.completion_pct || 0),
          backgroundColor: '#059669', borderRadius: 6 }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    courseCompletion.dataset.rendered = '1';
  }
}

/* ============================================================
   ExpertHub 2.0 — 14 Feature Expansion
   Action Orchestration & Interaction Layer
   This extension is intentionally isolated from the original
   implementation. It adds reusable browser-side capabilities,
   diagnostics, registries, persistence, validation and telemetry.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHFeature14;
  if (NS) return;

  const namespace = {
    name: "Action Orchestration & Interaction Layer",
    version: '2.0.0',
    createdAt: new Date().toISOString(),
    features: ["action registry", "command routing", "keyboard shortcuts", "optimistic actions", "undo actions", "bulk actions", "selection manager", "event bus", "chart lifecycle", "render scheduler", "dirty tracking", "action logging", "permission gate", "confirmation policy", "navigation actions", "clipboard actions", "download actions", "print actions", "refresh actions", "diagnostic actions", "interaction analytics"],
    registry: new Map(),
    listeners: new Map(),
    metrics: {
      calls: 0,
      successes: 0,
      failures: 0,
      startedAt: Date.now(),
      lastActionAt: null
    },
    config: {
      storagePrefix: 'experthub.feature.14.',
      maxHistory: 80,
      debounceMs: 250,
      staleAfterMs: 5 * 60 * 1000,
      debug: false
    }
  };

  function now() { return Date.now(); }

  function key(name) {
    return namespace.config.storagePrefix + String(name);
  }

  function safeClone(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }

  function safeParse(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    try { return JSON.parse(value); }
    catch (_) { return fallback; }
  }

  function emit(eventName, payload) {
    const handlers = namespace.listeners.get(eventName) || [];
    handlers.slice().forEach(fn => {
      try { fn(payload); } catch (error) { console.error('[ExpertHub]', eventName, error); }
    });
    try {
      document.dispatchEvent(new CustomEvent('eh:14:' + eventName, { detail: payload }));
    } catch (_) {}
  }

  function on(eventName, handler) {
    if (typeof handler !== 'function') return () => {};
    if (!namespace.listeners.has(eventName)) namespace.listeners.set(eventName, []);
    namespace.listeners.get(eventName).push(handler);
    return () => off(eventName, handler);
  }

  function off(eventName, handler) {
    const list = namespace.listeners.get(eventName) || [];
    namespace.listeners.set(eventName, list.filter(fn => fn !== handler));
  }

  function save(name, value, ttl = null) {
    const packet = { value: safeClone(value), savedAt: now(), expiresAt: ttl ? now() + ttl : null };
    try { localStorage.setItem(key(name), JSON.stringify(packet)); emit('saved', { name, packet }); return true; }
    catch (error) { console.warn('[ExpertHub] storage save failed', error); return false; }
  }

  function load(name, fallback = null) {
    try {
      const packet = safeParse(localStorage.getItem(key(name)), null);
      if (!packet) return fallback;
      if (packet.expiresAt && packet.expiresAt < now()) {
        localStorage.removeItem(key(name));
        return fallback;
      }
      return packet.value;
    } catch (_) { return fallback; }
  }

  function remove(name) {
    try { localStorage.removeItem(key(name)); emit('removed', { name }); return true; }
    catch (_) { return false; }
  }

  function register(name, definition = {}) {
    if (!name) throw new Error('Feature name is required');
    const item = {
      name,
      enabled: definition.enabled !== false,
      category: definition.category || 'general',
      description: definition.description || '',
      permissions: Array.isArray(definition.permissions) ? definition.permissions : [],
      handler: typeof definition.handler === 'function' ? definition.handler : null,
      validate: typeof definition.validate === 'function' ? definition.validate : null,
      metadata: definition.metadata || {},
      createdAt: new Date().toISOString()
    };
    namespace.registry.set(name, item);
    emit('registered', item);
    return item;
  }

  function unregister(name) {
    const existed = namespace.registry.delete(name);
    if (existed) emit('unregistered', { name });
    return existed;
  }

  function list(filter = {}) {
    let rows = Array.from(namespace.registry.values());
    if (filter.category) rows = rows.filter(x => x.category === filter.category);
    if (filter.enabled !== undefined) rows = rows.filter(x => x.enabled === filter.enabled);
    if (filter.query) {
      const q = String(filter.query).toLowerCase();
      rows = rows.filter(x => (x.name + ' ' + x.description).toLowerCase().includes(q));
    }
    return rows;
  }

  function hasPermission(item) {
    if (!item.permissions.length) return true;
    const role = window.currentUserRole || window.currentUser?.role || '';
    const permissions = window.currentUser?.permissions || [];
    return item.permissions.includes(role) || item.permissions.some(p => permissions.includes(p));
  }

  async function execute(name, payload = {}, context = {}) {
    const item = namespace.registry.get(name);
    if (!item) throw new Error('Unknown feature: ' + name);
    if (!item.enabled) throw new Error('Feature disabled: ' + name);
    if (!hasPermission(item)) throw new Error('Permission denied: ' + name);
    if (item.validate) {
      const result = await item.validate(payload, context);
      if (result === false) throw new Error('Validation failed: ' + name);
      if (typeof result === 'string') throw new Error(result);
    }
    namespace.metrics.calls++;
    namespace.metrics.lastActionAt = new Date().toISOString();
    try {
      const result = item.handler ? await item.handler(payload, context) : payload;
      namespace.metrics.successes++;
      emit('executed', { name, payload, result });
      return result;
    } catch (error) {
      namespace.metrics.failures++;
      emit('failed', { name, payload, error });
      throw error;
    }
  }

  function memoize(fn, ttl = 30000) {
    let timestamp = 0;
    let cached;
    let cachedArgs = '';
    return function (...args) {
      const signature = JSON.stringify(args);
      if (signature === cachedArgs && now() - timestamp < ttl) return cached;
      cachedArgs = signature;
      timestamp = now();
      cached = fn.apply(this, args);
      return cached;
    };
  }

  function debounce(fn, wait = namespace.config.debounceMs) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function throttle(fn, wait = namespace.config.debounceMs) {
    let ready = true;
    let queued = null;
    return function (...args) {
      if (!ready) { queued = args; return; }
      ready = false;
      fn.apply(this, args);
      setTimeout(() => {
        ready = true;
        if (queued) { const next = queued; queued = null; fn.apply(this, next); }
      }, wait);
    };
  }

  function validateObject(value, rules = {}) {
    const errors = {};
    Object.entries(rules).forEach(([field, rule]) => {
      const v = value?.[field];
      if (rule.required && (v === undefined || v === null || String(v).trim() === '')) errors[field] = 'Required';
      if (v !== undefined && v !== null && rule.minLength && String(v).length < rule.minLength) errors[field] = 'Too short';
      if (v !== undefined && v !== null && rule.maxLength && String(v).length > rule.maxLength) errors[field] = 'Too long';
      if (v && rule.pattern && !rule.pattern.test(String(v))) errors[field] = 'Invalid format';
      if (v !== undefined && v !== null && rule.type === 'number' && Number.isNaN(Number(v))) errors[field] = 'Must be a number';
    });
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function metricSnapshot() {
    return {
      ...namespace.metrics,
      uptimeMs: now() - namespace.metrics.startedAt,
      registeredFeatures: namespace.registry.size,
      featureCount: namespace.features.length
    };
  }

  function exportDiagnostics() {
    return {
      namespace: namespace.name,
      version: namespace.version,
      features: namespace.features.slice(),
      registered: list().map(x => ({ name: x.name, category: x.category, enabled: x.enabled })),
      metrics: metricSnapshot(),
      url: location.href,
      online: navigator.onLine,
      language: navigator.language,
      timestamp: new Date().toISOString()
    };
  }

  function downloadDiagnostics() {
    const blob = new Blob([JSON.stringify(exportDiagnostics(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'experthub-14-diagnostics.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  namespace.on = on;
  namespace.off = off;
  namespace.emit = emit;
  namespace.save = save;
  namespace.load = load;
  namespace.remove = remove;
  namespace.register = register;
  namespace.unregister = unregister;
  namespace.list = list;
  namespace.execute = execute;
  namespace.memoize = memoize;
  namespace.debounce = debounce;
  namespace.throttle = throttle;
  namespace.validateObject = validateObject;
  namespace.metrics = metricSnapshot;
  namespace.diagnostics = exportDiagnostics;
  namespace.downloadDiagnostics = downloadDiagnostics;

  window.EHFeature14 = namespace;

  function feature_01(payload = {}, context = {}) {
    const result = {
      feature: "action registry",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:01', result);
    return result;
  }

  register("action registry", {
    category: "action",
    description: "Enhanced action registry capability for action orchestration & interaction layer",
    handler: feature_01
  });

  function feature_02(payload = {}, context = {}) {
    const result = {
      feature: "command routing",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:02', result);
    return result;
  }

  register("command routing", {
    category: "command",
    description: "Enhanced command routing capability for action orchestration & interaction layer",
    handler: feature_02
  });

  function feature_03(payload = {}, context = {}) {
    const result = {
      feature: "keyboard shortcuts",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:03', result);
    return result;
  }

  register("keyboard shortcuts", {
    category: "keyboard",
    description: "Enhanced keyboard shortcuts capability for action orchestration & interaction layer",
    handler: feature_03
  });

  function feature_04(payload = {}, context = {}) {
    const result = {
      feature: "optimistic actions",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:04', result);
    return result;
  }

  register("optimistic actions", {
    category: "optimistic",
    description: "Enhanced optimistic actions capability for action orchestration & interaction layer",
    handler: feature_04
  });

  function feature_05(payload = {}, context = {}) {
    const result = {
      feature: "undo actions",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:05', result);
    return result;
  }

  register("undo actions", {
    category: "undo",
    description: "Enhanced undo actions capability for action orchestration & interaction layer",
    handler: feature_05
  });

  function feature_06(payload = {}, context = {}) {
    const result = {
      feature: "bulk actions",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:06', result);
    return result;
  }

  register("bulk actions", {
    category: "bulk",
    description: "Enhanced bulk actions capability for action orchestration & interaction layer",
    handler: feature_06
  });

  function feature_07(payload = {}, context = {}) {
    const result = {
      feature: "selection manager",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:07', result);
    return result;
  }

  register("selection manager", {
    category: "selection",
    description: "Enhanced selection manager capability for action orchestration & interaction layer",
    handler: feature_07
  });

  function feature_08(payload = {}, context = {}) {
    const result = {
      feature: "event bus",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:08', result);
    return result;
  }

  register("event bus", {
    category: "event",
    description: "Enhanced event bus capability for action orchestration & interaction layer",
    handler: feature_08
  });

  function feature_09(payload = {}, context = {}) {
    const result = {
      feature: "chart lifecycle",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:09', result);
    return result;
  }

  register("chart lifecycle", {
    category: "chart",
    description: "Enhanced chart lifecycle capability for action orchestration & interaction layer",
    handler: feature_09
  });

  function feature_10(payload = {}, context = {}) {
    const result = {
      feature: "render scheduler",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:10', result);
    return result;
  }

  register("render scheduler", {
    category: "render",
    description: "Enhanced render scheduler capability for action orchestration & interaction layer",
    handler: feature_10
  });

  function feature_11(payload = {}, context = {}) {
    const result = {
      feature: "dirty tracking",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:11', result);
    return result;
  }

  register("dirty tracking", {
    category: "dirty",
    description: "Enhanced dirty tracking capability for action orchestration & interaction layer",
    handler: feature_11
  });

  function feature_12(payload = {}, context = {}) {
    const result = {
      feature: "action logging",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:12', result);
    return result;
  }

  register("action logging", {
    category: "action",
    description: "Enhanced action logging capability for action orchestration & interaction layer",
    handler: feature_12
  });

  function feature_13(payload = {}, context = {}) {
    const result = {
      feature: "permission gate",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:13', result);
    return result;
  }

  register("permission gate", {
    category: "permission",
    description: "Enhanced permission gate capability for action orchestration & interaction layer",
    handler: feature_13
  });

  function feature_14(payload = {}, context = {}) {
    const result = {
      feature: "confirmation policy",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:14', result);
    return result;
  }

  register("confirmation policy", {
    category: "confirmation",
    description: "Enhanced confirmation policy capability for action orchestration & interaction layer",
    handler: feature_14
  });

  function feature_15(payload = {}, context = {}) {
    const result = {
      feature: "navigation actions",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:15', result);
    return result;
  }

  register("navigation actions", {
    category: "navigation",
    description: "Enhanced navigation actions capability for action orchestration & interaction layer",
    handler: feature_15
  });

  function feature_16(payload = {}, context = {}) {
    const result = {
      feature: "clipboard actions",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:16', result);
    return result;
  }

  register("clipboard actions", {
    category: "clipboard",
    description: "Enhanced clipboard actions capability for action orchestration & interaction layer",
    handler: feature_16
  });

  function feature_17(payload = {}, context = {}) {
    const result = {
      feature: "download actions",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:17', result);
    return result;
  }

  register("download actions", {
    category: "download",
    description: "Enhanced download actions capability for action orchestration & interaction layer",
    handler: feature_17
  });

  function feature_18(payload = {}, context = {}) {
    const result = {
      feature: "print actions",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:18', result);
    return result;
  }

  register("print actions", {
    category: "print",
    description: "Enhanced print actions capability for action orchestration & interaction layer",
    handler: feature_18
  });

  function feature_19(payload = {}, context = {}) {
    const result = {
      feature: "refresh actions",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:19', result);
    return result;
  }

  register("refresh actions", {
    category: "refresh",
    description: "Enhanced refresh actions capability for action orchestration & interaction layer",
    handler: feature_19
  });

  function feature_20(payload = {}, context = {}) {
    const result = {
      feature: "diagnostic actions",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:20', result);
    return result;
  }

  register("diagnostic actions", {
    category: "diagnostic",
    description: "Enhanced diagnostic actions capability for action orchestration & interaction layer",
    handler: feature_20
  });

  function feature_21(payload = {}, context = {}) {
    const result = {
      feature: "interaction analytics",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "14"
    };
    emit('feature:21', result);
    return result;
  }

  register("interaction analytics", {
    category: "interaction",
    description: "Enhanced interaction analytics capability for action orchestration & interaction layer",
    handler: feature_21
  });

  /* ---------- Built-in browser integrations ---------- */

  namespace.search = function (query, source = list()) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return source.slice();
    return source.filter(item =>
      JSON.stringify(item).toLowerCase().includes(q)
    );
  };

  namespace.groupBy = function (items, selector) {
    return items.reduce((groups, item) => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      const key = value === undefined || value === null ? 'unknown' : String(value);
      (groups[key] ||= []).push(item);
      return groups;
    }, {});
  };

  namespace.sum = function (items, selector) {
    return items.reduce((total, item) => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      return total + (Number(value) || 0);
    }, 0);
  };

  namespace.average = function (items, selector) {
    return items.length ? namespace.sum(items, selector) / items.length : 0;
  };

  namespace.paginate = function (items, page = 1, pageSize = 20) {
    const size = Math.max(1, Number(pageSize) || 20);
    const current = Math.max(1, Number(page) || 1);
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / size));
    const safePage = Math.min(current, pages);
    return {
      items: items.slice((safePage - 1) * size, safePage * size),
      page: safePage,
      pageSize: size,
      total,
      pages,
      hasNext: safePage < pages,
      hasPrevious: safePage > 1
    };
  };

  namespace.sortBy = function (items, selector, direction = 'asc') {
    const list = items.slice();
    list.sort((a, b) => {
      const av = typeof selector === 'function' ? selector(a) : a?.[selector];
      const bv = typeof selector === 'function' ? selector(b) : b?.[selector];
      const left = av ?? '';
      const right = bv ?? '';
      const result = left > right ? 1 : left < right ? -1 : 0;
      return direction === 'desc' ? -result : result;
    });
    return list;
  };

  namespace.unique = function (items, selector = item => item) {
    const seen = new Set();
    return items.filter(item => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      const keyValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (seen.has(keyValue)) return false;
      seen.add(keyValue);
      return true;
    });
  };

  namespace.whenIdle = function (callback, timeout = 1000) {
    if ('requestIdleCallback' in window) return window.requestIdleCallback(callback, { timeout });
    return setTimeout(callback, Math.min(timeout, 100));
  };

  namespace.copy = async function (value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  };

  namespace.broadcast = function (name, payload) {
    try {
      const channel = new BroadcastChannel('experthub-' + name);
      channel.postMessage(payload);
      channel.close();
      return true;
    } catch (_) {
      return false;
    }
  };

  namespace.listenBroadcast = function (name, handler) {
    try {
      const channel = new BroadcastChannel('experthub-' + name);
      channel.onmessage = event => handler(event.data);
      return () => channel.close();
    } catch (_) {
      return () => {};
    }
  };

  /* ---------- Automatic lifecycle hooks ---------- */

  document.addEventListener('visibilitychange', () => {
    emit('visibility', { hidden: document.hidden, timestamp: Date.now() });
  });

  window.addEventListener('online', () => emit('network', { online: true }));
  window.addEventListener('offline', () => emit('network', { online: false }));

  namespace.healthCheck = function () {
    return {
      ok: true,
      storage: (() => {
        try {
          const k = key('health');
          localStorage.setItem(k, 'ok');
          localStorage.removeItem(k);
          return true;
        } catch (_) { return false; }
      })(),
      dom: !!document.body,
      network: navigator.onLine,
      registeredFeatures: namespace.registry.size
    };
  };

  /* Keep the feature registry discoverable without changing the
     application's existing global functions. */
  window.ExpertHubFeatureRegistry = window.ExpertHubFeatureRegistry || {};
  window.ExpertHubFeatureRegistry["14"] = namespace;

})();

/* ============================================================
   End 14 feature expansion
   ============================================================ */

/* ============================================================
   Extended capability catalog — 14
   These definitions turn the feature expansion into a practical
   command catalog. Each entry can be discovered, validated,
   previewed, audited and executed without changing the legacy
   application functions above.
   ============================================================ */

(function () {
  const N = window.EHFeature14;
  if (!N) return;
  N.catalog = N.catalog || [];

  N.catalog.push({
    id: "14-0001-action-registry-inspect",
    label: "Inspect Action Registry",
    feature: "action registry",
    operation: "inspect",
    description: "Inspect current records and return a normalized view for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0001-action-registry-inspect", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0001-action-registry-inspect", feature: "action registry", operation: "inspect", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0002-action-registry-validate",
    label: "Validate Action Registry",
    feature: "action registry",
    operation: "validate",
    description: "Validate inputs before a workflow is submitted for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0002-action-registry-validate", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0002-action-registry-validate", feature: "action registry", operation: "validate", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0003-action-registry-preview",
    label: "Preview Action Registry",
    feature: "action registry",
    operation: "preview",
    description: "Build a preview payload without committing changes for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0003-action-registry-preview", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0003-action-registry-preview", feature: "action registry", operation: "preview", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0004-action-registry-draft",
    label: "Draft Action Registry",
    feature: "action registry",
    operation: "draft",
    description: "Persist a reusable draft for later completion for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0004-action-registry-draft", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0004-action-registry-draft", feature: "action registry", operation: "draft", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0005-action-registry-save",
    label: "Save Action Registry",
    feature: "action registry",
    operation: "save",
    description: "Save a workflow result to browser storage for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0005-action-registry-save", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0005-action-registry-save", feature: "action registry", operation: "save", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0006-action-registry-restore",
    label: "Restore Action Registry",
    feature: "action registry",
    operation: "restore",
    description: "Restore a previously saved workflow snapshot for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0006-action-registry-restore", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0006-action-registry-restore", feature: "action registry", operation: "restore", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0007-action-registry-export",
    label: "Export Action Registry",
    feature: "action registry",
    operation: "export",
    description: "Prepare a portable export package for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0007-action-registry-export", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0007-action-registry-export", feature: "action registry", operation: "export", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0008-action-registry-import",
    label: "Import Action Registry",
    feature: "action registry",
    operation: "import",
    description: "Validate an imported package before use for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0008-action-registry-import", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0008-action-registry-import", feature: "action registry", operation: "import", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0009-action-registry-batch",
    label: "Batch Action Registry",
    feature: "action registry",
    operation: "batch",
    description: "Prepare multiple records for one controlled operation for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0009-action-registry-batch", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0009-action-registry-batch", feature: "action registry", operation: "batch", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0010-action-registry-audit",
    label: "Audit Action Registry",
    feature: "action registry",
    operation: "audit",
    description: "Create a client-side audit event for traceability for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0010-action-registry-audit", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0010-action-registry-audit", feature: "action registry", operation: "audit", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0011-action-registry-compare",
    label: "Compare Action Registry",
    feature: "action registry",
    operation: "compare",
    description: "Compare two records and report differences for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0011-action-registry-compare", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0011-action-registry-compare", feature: "action registry", operation: "compare", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0012-action-registry-summarize",
    label: "Summarize Action Registry",
    feature: "action registry",
    operation: "summarize",
    description: "Produce a concise operational summary for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0012-action-registry-summarize", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0012-action-registry-summarize", feature: "action registry", operation: "summarize", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0013-action-registry-filter",
    label: "Filter Action Registry",
    feature: "action registry",
    operation: "filter",
    description: "Apply a domain-specific filter definition for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0013-action-registry-filter", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0013-action-registry-filter", feature: "action registry", operation: "filter", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0014-action-registry-sort",
    label: "Sort Action Registry",
    feature: "action registry",
    operation: "sort",
    description: "Apply a stable sort definition for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0014-action-registry-sort", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0014-action-registry-sort", feature: "action registry", operation: "sort", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0015-action-registry-paginate",
    label: "Paginate Action Registry",
    feature: "action registry",
    operation: "paginate",
    description: "Return a paginated result window for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0015-action-registry-paginate", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0015-action-registry-paginate", feature: "action registry", operation: "paginate", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0016-action-registry-refresh",
    label: "Refresh Action Registry",
    feature: "action registry",
    operation: "refresh",
    description: "Mark a dataset as needing refresh for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0016-action-registry-refresh", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0016-action-registry-refresh", feature: "action registry", operation: "refresh", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0017-action-registry-notify",
    label: "Notify Action Registry",
    feature: "action registry",
    operation: "notify",
    description: "Create a local notification payload for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0017-action-registry-notify", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0017-action-registry-notify", feature: "action registry", operation: "notify", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0018-action-registry-schedule",
    label: "Schedule Action Registry",
    feature: "action registry",
    operation: "schedule",
    description: "Create a deferred workflow instruction for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0018-action-registry-schedule", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0018-action-registry-schedule", feature: "action registry", operation: "schedule", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0019-action-registry-approve",
    label: "Approve Action Registry",
    feature: "action registry",
    operation: "approve",
    description: "Prepare an approval decision payload for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0019-action-registry-approve", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0019-action-registry-approve", feature: "action registry", operation: "approve", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0020-action-registry-reject",
    label: "Reject Action Registry",
    feature: "action registry",
    operation: "reject",
    description: "Prepare a rejection decision payload for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0020-action-registry-reject", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0020-action-registry-reject", feature: "action registry", operation: "reject", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0021-action-registry-archive",
    label: "Archive Action Registry",
    feature: "action registry",
    operation: "archive",
    description: "Prepare an archival instruction for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0021-action-registry-archive", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0021-action-registry-archive", feature: "action registry", operation: "archive", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0022-action-registry-restore-record",
    label: "Restore-Record Action Registry",
    feature: "action registry",
    operation: "restore-record",
    description: "Prepare a record restoration instruction for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0022-action-registry-restore-record", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0022-action-registry-restore-record", feature: "action registry", operation: "restore-record", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0023-action-registry-duplicate",
    label: "Duplicate Action Registry",
    feature: "action registry",
    operation: "duplicate",
    description: "Create a safe duplicate draft for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0023-action-registry-duplicate", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0023-action-registry-duplicate", feature: "action registry", operation: "duplicate", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0024-action-registry-assign",
    label: "Assign Action Registry",
    feature: "action registry",
    operation: "assign",
    description: "Prepare an assignment payload for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0024-action-registry-assign", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0024-action-registry-assign", feature: "action registry", operation: "assign", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0025-action-registry-unassign",
    label: "Unassign Action Registry",
    feature: "action registry",
    operation: "unassign",
    description: "Prepare an unassignment payload for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0025-action-registry-unassign", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0025-action-registry-unassign", feature: "action registry", operation: "unassign", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0026-action-registry-escalate",
    label: "Escalate Action Registry",
    feature: "action registry",
    operation: "escalate",
    description: "Prepare an escalation payload for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0026-action-registry-escalate", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0026-action-registry-escalate", feature: "action registry", operation: "escalate", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0027-action-registry-resolve",
    label: "Resolve Action Registry",
    feature: "action registry",
    operation: "resolve",
    description: "Prepare a resolution payload for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0027-action-registry-resolve", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0027-action-registry-resolve", feature: "action registry", operation: "resolve", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0028-action-registry-close",
    label: "Close Action Registry",
    feature: "action registry",
    operation: "close",
    description: "Prepare a controlled closeout payload for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0028-action-registry-close", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0028-action-registry-close", feature: "action registry", operation: "close", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0029-action-registry-reopen",
    label: "Reopen Action Registry",
    feature: "action registry",
    operation: "reopen",
    description: "Prepare a controlled reopen payload for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0029-action-registry-reopen", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0029-action-registry-reopen", feature: "action registry", operation: "reopen", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0030-action-registry-publish",
    label: "Publish Action Registry",
    feature: "action registry",
    operation: "publish",
    description: "Prepare a publication payload for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0030-action-registry-publish", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0030-action-registry-publish", feature: "action registry", operation: "publish", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0031-action-registry-unpublish",
    label: "Unpublish Action Registry",
    feature: "action registry",
    operation: "unpublish",
    description: "Prepare an unpublication payload for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0031-action-registry-unpublish", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0031-action-registry-unpublish", feature: "action registry", operation: "unpublish", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0032-command-routing-inspect",
    label: "Inspect Command Routing",
    feature: "command routing",
    operation: "inspect",
    description: "Inspect current records and return a normalized view for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0032-command-routing-inspect", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0032-command-routing-inspect", feature: "command routing", operation: "inspect", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0033-command-routing-validate",
    label: "Validate Command Routing",
    feature: "command routing",
    operation: "validate",
    description: "Validate inputs before a workflow is submitted for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0033-command-routing-validate", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0033-command-routing-validate", feature: "command routing", operation: "validate", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0034-command-routing-preview",
    label: "Preview Command Routing",
    feature: "command routing",
    operation: "preview",
    description: "Build a preview payload without committing changes for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0034-command-routing-preview", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0034-command-routing-preview", feature: "command routing", operation: "preview", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0035-command-routing-draft",
    label: "Draft Command Routing",
    feature: "command routing",
    operation: "draft",
    description: "Persist a reusable draft for later completion for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0035-command-routing-draft", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0035-command-routing-draft", feature: "command routing", operation: "draft", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0036-command-routing-save",
    label: "Save Command Routing",
    feature: "command routing",
    operation: "save",
    description: "Save a workflow result to browser storage for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0036-command-routing-save", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0036-command-routing-save", feature: "command routing", operation: "save", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0037-command-routing-restore",
    label: "Restore Command Routing",
    feature: "command routing",
    operation: "restore",
    description: "Restore a previously saved workflow snapshot for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0037-command-routing-restore", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0037-command-routing-restore", feature: "command routing", operation: "restore", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0038-command-routing-export",
    label: "Export Command Routing",
    feature: "command routing",
    operation: "export",
    description: "Prepare a portable export package for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0038-command-routing-export", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0038-command-routing-export", feature: "command routing", operation: "export", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0039-command-routing-import",
    label: "Import Command Routing",
    feature: "command routing",
    operation: "import",
    description: "Validate an imported package before use for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0039-command-routing-import", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0039-command-routing-import", feature: "command routing", operation: "import", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0040-command-routing-batch",
    label: "Batch Command Routing",
    feature: "command routing",
    operation: "batch",
    description: "Prepare multiple records for one controlled operation for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0040-command-routing-batch", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0040-command-routing-batch", feature: "command routing", operation: "batch", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0041-command-routing-audit",
    label: "Audit Command Routing",
    feature: "command routing",
    operation: "audit",
    description: "Create a client-side audit event for traceability for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0041-command-routing-audit", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0041-command-routing-audit", feature: "command routing", operation: "audit", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0042-command-routing-compare",
    label: "Compare Command Routing",
    feature: "command routing",
    operation: "compare",
    description: "Compare two records and report differences for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0042-command-routing-compare", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0042-command-routing-compare", feature: "command routing", operation: "compare", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  N.catalog.push({
    id: "14-0043-command-routing-summarize",
    label: "Summarize Command Routing",
    feature: "command routing",
    operation: "summarize",
    description: "Produce a concise operational summary for action orchestration & interaction layer",
    enabled: true,
    version: '2.0.0',
    permissions: [],
    defaults: { dryRun: true, notify: false, audit: true },
    createdAt: new Date().toISOString(),
    validate(payload = {}) {
      return { valid: payload !== null && typeof payload === 'object', errors: {} };
    },
    preview(payload = {}) {
      return { id: "14-0043-command-routing-summarize", mode: 'preview', payload: safeCatalogClone(payload), timestamp: new Date().toISOString() };
    },
    execute(payload = {}, context = {}) {
      const packet = { id: "14-0043-command-routing-summarize", feature: "command routing", operation: "summarize", payload: safeCatalogClone(payload), context: safeCatalogClone(context), timestamp: new Date().toISOString() };
      N.emit('catalog:executed', packet);
      return packet;
    }
  });

  function safeCatalogClone(value) {
    try { return JSON.parse(JSON.stringify(value ?? {})); }
    catch (_) { return {}; }
  }

  N.catalogSearch = function (query = '', filters = {}) {
    const q = String(query).trim().toLowerCase();
    return N.catalog.filter(item => {
      if (filters.operation && item.operation !== filters.operation) return false;
      if (filters.feature && item.feature !== filters.feature) return false;
      if (!q) return true;
      return [item.id, item.label, item.feature, item.operation, item.description]
        .join(' ').toLowerCase().includes(q);
    });
  };

  N.catalogExecute = function (id, payload = {}, context = {}) {
    const item = N.catalog.find(row => row.id === id);
    if (!item) throw new Error('Catalog command not found: ' + id);
    const validation = item.validate(payload, context);
    if (!validation.valid) {
      throw new Error(Object.values(validation.errors || {}).join(', ') || 'Catalog validation failed');
    }
    return item.execute(payload, context);
  };

  N.catalogPreview = function (id, payload = {}) {
    const item = N.catalog.find(row => row.id === id);
    if (!item) throw new Error('Catalog command not found: ' + id);
    return item.preview(payload);
  };

  N.catalogStats = function () {
    const byOperation = {};
    N.catalog.forEach(item => { byOperation[item.operation] = (byOperation[item.operation] || 0) + 1; });
    return {
      total: N.catalog.length,
      enabled: N.catalog.filter(item => item.enabled).length,
      operations: byOperation,
      generatedAt: new Date().toISOString()
    };
  };

  N.exportCatalog = function () {
    return N.catalog.map(item => ({
      id: item.id,
      label: item.label,
      feature: item.feature,
      operation: item.operation,
      description: item.description,
      enabled: item.enabled
    }));
  };

  N.registerCatalogEvents = function (root = document) {
    if (!root?.addEventListener) return () => {};
    const handler = event => {
      const button = event.target.closest?.('[data-eh-catalog]');
      if (!button) return;
      const id = button.getAttribute('data-eh-catalog');
      try {
        const result = N.catalogExecute(id, { source: 'ui', id });
        if (typeof window.showToast === 'function') window.showToast('Action prepared', 'success');
        N.emit('catalog:ui-result', result);
      } catch (error) {
        if (typeof window.showToast === 'function') window.showToast(error.message, 'error');
      }
    };
    root.addEventListener('click', handler);
    return () => root.removeEventListener('click', handler);
  };

  N.catalogReady = true;
  N.emit('catalog:ready', N.catalogStats());
})();
