/* ============================================================
   ExpertHub 2.0 — Institution Actions Registry (COMPLETE)
   Registers EVERY data-action dispatched across Sections 1–5.
   Delegated from 14-actions.js before the global switch.
   ============================================================ */

const INSTITUTION_ACTIONS = {

  /* ════════════════════════════════════════════════════════
     NAVIGATION & SHELL
     ════════════════════════════════════════════════════════ */
  'refresh-all': () => refreshInstitutionData(),
  'switch-tab': (id) => {
    activeTab = id || 'dashboard';
    rerenderRoleContent();
  },
  'open-global-search': () => openGlobalSearchModal(),
  'open-notification-center': () => openNotificationCenterModal(),
  'open-search-result': (id, el) => {
    const type = el?.dataset?.type;
    const map = { trainee: 'trainees', programme: 'programmes', cohort: 'cohorts', certificate: 'certifications' };
    if (map[type]) { activeTab = map[type]; rerenderRoleContent(); closeModal(); }
  },

  /* ════════════════════════════════════════════════════════
     PAGINATION
     ════════════════════════════════════════════════════════ */
  'goto-page': (id, el) => {
    const view = el?.dataset?.view;
    const page = Number(el?.dataset?.page) || 1;
    if (view) { S.page[view] = page; rerenderRoleContent(); }
  },
  'change-page-size': (id, el) => {
    const view = el?.dataset?.view;
    const size = Number(el?.value) || 25;
    if (view) { S.pageSize[view] = size; S.page[view] = 1; rerenderRoleContent(); }
  },

  /* ════════════════════════════════════════════════════════
     OVERVIEW / EXPORT
     ════════════════════════════════════════════════════════ */
  'export-institution-report': () => downloadCsv('institution-report.csv', S.trainees || []),
  'export-institution-report-pdf': () => window.open('/api/institution/reports/overview.pdf', '_blank'),
  'export-analytics-snapshot': () => downloadJson('analytics-snapshot.json', S.institutionAnalytics || {}),

  /* ════════════════════════════════════════════════════════
     PROGRAMMES
     ════════════════════════════════════════════════════════ */
  'programmes-set-tab': (id, el) => {
    S.filters.programmes = S.filters.programmes || {};
    S.filters.programmes.tab = el?.dataset?.tab || 'active';
    S.page.institutionProgrammes = 1;
    rerenderRoleContent();
  },
  'create-programme': () => openProgrammeModal(),
  'edit-programme': (id) => openProgrammeModal(Number(id)),
  'view-programme': (id) => openProgrammeDetailModal(Number(id)),
  'programme-curriculum': (id) => openCurriculumModal(Number(id)),
  'duplicate-programme': async (id) => {
    if (!await confirmDialog('Duplicate this programme?')) return;
    try {
      await apiCall(`/api/institution/programmes/${id}/duplicate`, 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Programme duplicated', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'programme-versions': (id) => openProgrammeVersionsModal(Number(id)),
  'submit-programme-approval': async (id) => {
    if (!await confirmDialog('Submit this programme for approval?')) return;
    try {
      await apiCall(`/api/institution/programmes/${id}/submit-approval`, 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Submitted for approval', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'archive-programme': async (id) => {
    if (!await confirmDialog('Archive this programme?')) return;
    try {
      await apiCall(`/api/institution/programmes/${id}/archive`, 'PUT');
      await loadAllData(); rerenderRoleContent();
      showToast('Programme archived', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'restore-programme': async (id) => {
    try {
      await apiCall(`/api/institution/programmes/${id}/restore`, 'PUT');
      await loadAllData(); rerenderRoleContent();
      showToast('Programme restored', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'programme-evaluations': (id) => openProgrammeEvaluationsModal(Number(id)),
  'delete-programme': async (id) => {
    if (!await confirmDialog('Delete this programme permanently?')) return;
    try {
      await apiCall(`/api/institution/programmes/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Programme deleted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'export-programmes': () => downloadCsv('programmes.csv', S.programmes || []),

  /* ════════════════════════════════════════════════════════
     LEARNING PATHS
     ════════════════════════════════════════════════════════ */
  'create-learning-path': () => openLearningPathModal(),
  'edit-learning-path': (id) => openLearningPathModal(Number(id)),
  'view-learning-path': (id) => openLearningPathDetailModal(Number(id)),
  'duplicate-learning-path': async (id) => {
    if (!await confirmDialog('Duplicate this path?')) return;
    try {
      await apiCall(`/api/institution/learning-paths/${id}/duplicate`, 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Path duplicated', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'delete-learning-path': async (id) => {
    if (!await confirmDialog('Delete this learning path?')) return;
    try {
      await apiCall(`/api/institution/learning-paths/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Path deleted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'open-path-builder': (id) => openPathBuilderModal(Number(id)),

  /* ════════════════════════════════════════════════════════
     COHORTS
     ════════════════════════════════════════════════════════ */
  'create-cohort': () => openCohortModal(),
  'edit-cohort': (id) => openCohortModal(Number(id)),
  'view-cohort': (id) => openCohortDetailModal(Number(id)),
  'delete-cohort': async (id) => {
    if (!await confirmDialog('Delete this cohort?')) return;
    try {
      await apiCall(`/api/institution/cohorts/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Cohort deleted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'cohort-waitlist': (id) => openWaitlistModal(Number(id)),
  'cohort-transfer': (id) => openCohortTransferModal(Number(id)),
  'cohort-message': (id) => openGroupMessageModal('cohort', Number(id)),
  'cohort-attendance': (id) => openCohortAttendanceModal(Number(id)),
  'complete-cohort': async (id) => {
    if (!await confirmDialog('Mark this cohort as completed? All active enrolments will be finalised.')) return;
    try {
      await apiCall(`/api/institution/cohorts/${id}/complete`, 'PUT');
      await loadAllData(); rerenderRoleContent();
      showToast('Cohort completed', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'bulk-assign-trainees': () => openBulkAssignTraineesModal(),
  'auto-promote-waitlists': async () => {
    if (!await confirmDialog('Auto-promote all eligible waitlists?')) return;
    try {
      const d = await apiCall('/api/institution/cohorts/auto-promote-waitlists', 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast(`${d.promoted || 0} trainee${d.promoted === 1 ? '' : 's'} promoted`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'cohorts-select-all': (id, el) => {
    const checked = el?.checked;
    document.querySelectorAll('.cohort-select').forEach(cb => { cb.checked = checked; });
  },

  /* ════════════════════════════════════════════════════════
     TRAINING / SESSIONS
     ════════════════════════════════════════════════════════ */
  'schedule-session': () => openSessionModal(),
  'edit-session': (id) => openSessionModal(Number(id)),
  'reschedule-session': (id) => openRescheduleModal(Number(id)),
  'delete-session': async (id) => {
    if (!await confirmDialog('Cancel / delete this session?')) return;
    try {
      await apiCall(`/api/institution/sessions/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Session cancelled', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'mark-attendance': (id) => openAttendanceModal(Number(id)),
  'show-session-qr': (id) => openSessionQrModal(Number(id)),
  'view-calendar': () => {
    activeTab = 'training';
    showToast('Calendar view coming online shortly', 'info');
  },
  'view-evaluations': (id) => openEvaluationsModal(Number(id)),
  'upload-material': () => uploadMaterialFromForm(),
  'delete-material': async (id) => {
    if (!await confirmDialog('Delete this material?')) return;
    try {
      await apiCall(`/api/institution/materials/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Material deleted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'edit-material-access': (id) => openMaterialAccessModal(Number(id)),

  /* ════════════════════════════════════════════════════════
     ASSESSMENTS
     ════════════════════════════════════════════════════════ */
  'assessments-set-tab': (id, el) => {
    S.filters.assessments = S.filters.assessments || {};
    S.filters.assessments.tab = el?.dataset?.tab || 'all';
    rerenderRoleContent();
  },
  'schedule-assessment': () => openAssessmentModal(),
  'edit-assessment': (id) => openAssessmentModal(Number(id)),
  'view-assessment': (id) => openAssessmentDetailModal(Number(id)),
  'grade-assessment': (id) => openGradingModal(Number(id)),
  'moderate-assessment': (id) => openModerationModal(Number(id)),
  'manage-rubrics': (id) => openRubricsModal(Number(id)),
  'publish-results': async (id) => {
    if (!await confirmDialog('Publish results for this assessment? Students will be notified.')) return;
    try {
      await apiCall(`/api/institution/assessments/${id}/publish`, 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Results published', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'bulk-publish-results': async () => {
    if (!await confirmDialog('Publish all results that are fully graded?')) return;
    try {
      const d = await apiCall('/api/institution/assessments/bulk-publish', 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast(`${d.published || 0} assessment(s) published`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'create-resit': (id) => openResitModal(Number(id)),
  'view-appeals': (id) => openAppealsModal(Number(id)),
  'delete-assessment': async (id) => {
    if (!await confirmDialog('Delete this assessment?')) return;
    try {
      await apiCall(`/api/institution/assessments/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Assessment deleted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'export-assessments': () => downloadCsv('assessments.csv', S.assessments || []),

  /* ════════════════════════════════════════════════════════
     PROCTORED EXAMS
     ════════════════════════════════════════════════════════ */
  'schedule-proctor-session': () => openProctorSessionModal(),
  'view-proctor-session': (id) => openProctorSessionDetailModal(Number(id)),
  'verify-identity': (id) => openIdentityVerificationModal(Number(id)),
  'manage-accessibility': (id) => openAccessibilityModal(Number(id)),
  'view-incident-timeline': (id) => openIncidentTimelineModal(Number(id)),
  'mark-human-reviewed': async (id) => {
    if (!await confirmDialog('Confirm this session has been human-reviewed?')) return;
    try {
      await apiCall(`/api/institution/proctor-sessions/${id}/human-review`, 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Marked as human-reviewed', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'invalidate-exam': async (id) => {
    if (!await confirmDialog('Invalidate this exam session? This should only be done after human review.')) return;
    try {
      await apiCall(`/api/institution/proctor-sessions/${id}/invalidate`, 'PUT');
      await loadAllData(); rerenderRoleContent();
      showToast('Exam invalidated', 'warning');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'review-flag': (id) => openFlagReviewModal(Number(id)),
  'review-evidence': (id) => openEvidenceReviewModal(Number(id)),
  'retention-settings': () => openRetentionSettingsModal(),
  'view-appeal': (id) => openAppealDetailModal(Number(id)),
  'resolve-appeal': (id) => openResolveAppealModal(Number(id)),
  'export-proctor-sessions': () => downloadCsv('proctor-sessions.csv', S.examProctorSessions || []),

  /* ════════════════════════════════════════════════════════
     QUESTION BANK
     ════════════════════════════════════════════════════════ */
  'create-question': () => openQuestionModal(),
  'edit-question': (id) => openQuestionModal(Number(id)),
  'view-item-analysis': (id) => openItemAnalysisModal(Number(id)),
  'question-history': (id) => openQuestionHistoryModal(Number(id)),
  'duplicate-question': async (id) => {
    try {
      await apiCall(`/api/institution/questions/${id}/duplicate`, 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Question duplicated', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'approve-question': async (id) => {
    try {
      await apiCall(`/api/institution/questions/${id}/approve`, 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Question approved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'reject-question': (id) => openRejectQuestionModal(Number(id)),
  'delete-question': async (id) => {
    if (!await confirmDialog('Delete this question?')) return;
    try {
      await apiCall(`/api/institution/questions/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Question deleted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'import-questions-bulk': () => openBulkImportQuestionsModal(),
  'export-questions': () => downloadCsv('questions.csv', S.institutionQuestions || []),

  /* ════════════════════════════════════════════════════════
     PROJECTS
     ════════════════════════════════════════════════════════ */
  'create-project': () => openProjectModal(),
  'edit-project': (id) => openProjectModal(Number(id)),
  'view-project': (id) => openProjectDetailModal(Number(id)),
  'grade-project': (id) => openProjectGradingModal(Number(id)),
  'manage-milestones': (id) => openMilestonesModal(Number(id)),
  'manage-project-teams': (id) => openProjectTeamsModal(Number(id)),
  'upload-project-evidence': (id) => openUploadEvidenceModal(Number(id)),
  'manage-project-rubrics': (id) => openProjectRubricsModal(Number(id)),
  'peer-evaluations': (id) => openPeerEvaluationsModal(Number(id)),
  'publish-portfolio': async (id) => {
    if (!await confirmDialog('Publish portfolio publicly?')) return;
    try {
      await apiCall(`/api/institution/projects/${id}/publish-portfolio`, 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Portfolio published', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'delete-project': async (id) => {
    if (!await confirmDialog('Delete this project?')) return;
    try {
      await apiCall(`/api/institution/projects/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Project deleted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'export-projects': () => downloadCsv('projects.csv', S.projects || []),

  /* ════════════════════════════════════════════════════════
     CERTIFICATIONS
     ════════════════════════════════════════════════════════ */
  'issue-certificate': () => openIssueCertificateModal(),
  'renew-certificate': (id) => openRenewCertificateModal(Number(id)),
  'revoke-certificate': (id) => openRevokeCertificateModal(Number(id)),
  'view-cert-qr': (id) => openCertificateQrModal(Number(id)),
  'share-credential': (id) => openShareCredentialModal(Number(id)),
  'digital-signature': (id) => openDigitalSignatureModal(Number(id)),
  'view-revocation-audit': (id) => openRevocationAuditModal(Number(id)),
  'backfill-signatures': async () => {
    if (!await confirmDialog('Backfill digital signatures on all unsigned certificates?')) return;
    try {
      const d = await apiCall('/api/institution/certificates/backfill-signatures', 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast(`${d.signed || 0} certificate(s) signed`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'bulk-generate-qr': async () => {
    try {
      await apiCall('/api/institution/certificates/bulk-qr', 'POST');
      showToast('QR batch generation started — check your email', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'manage-cert-templates': () => openCertTemplatesModal(),
  'send-renewal-reminders': async () => {
    if (!await confirmDialog('Send renewal reminders for all expiring certificates?')) return;
    try {
      const d = await apiCall('/api/institution/certificates/send-renewal-reminders', 'POST');
      showToast(`${d.sent || 0} reminder${d.sent === 1 ? '' : 's'} sent`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'export-certificates': () => downloadCsv('certificates.csv', S.institutionCertificates || []),

  /* ════════════════════════════════════════════════════════
     TRAINEES
     ════════════════════════════════════════════════════════ */
  'invite-trainee': () => openInviteTraineeModal(),
  'import-trainees-history': () => openImportHistoryModal(),
  'validate-bulk-import': () => openValidateBulkImportModal(),
  'export-trainees': () => downloadCsv('trainees.csv', S.trainees || []),
  'approve-enrolment': async (id) => {
    try {
      await apiCall(`/api/institution/enrollments/${id}/approve`, 'PUT');
      await loadAllData(); rerenderRoleContent();
      showToast('Enrolment approved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'reject-enrolment': (id) => openRejectEnrolmentModal(Number(id)),
  'trainee-detail': (id) => openTraineeDetailModal(Number(id)),
  'trainee-transfer': (id) => openTraineeTransferModal(Number(id)),
  'trainee-notes': (id) => openTraineeNotesModal(Number(id)),
  'trainee-history': (id) => openTraineeHistoryModal(Number(id)),
  'trainee-contacts': (id) => openTraineeContactsModal(Number(id)),
  'trainee-achievements': (id) => openTraineeAchievementsModal(Number(id)),

  /* ════════════════════════════════════════════════════════
     WELLNESS
     ════════════════════════════════════════════════════════ */
  'recompute-wellness': async () => {
    try {
      showLoading(true);
      await apiCall('/api/institution/wellness/recompute', 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Wellness scores recomputed', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  },
  'wellness-intervene': (id) => openWellnessInterventionModal(Number(id)),
  'wellness-followup': (id) => openWellnessFollowupModal(Number(id)),
  'wellness-dismiss': async (id) => {
    if (!await confirmDialog('Dismiss this alert?')) return;
    try {
      await apiCall(`/api/institution/wellness/alerts/${id}/dismiss`, 'PUT');
      await loadAllData(); rerenderRoleContent();
      showToast('Alert dismissed', 'info');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'wellness-referral': () => openWellnessReferralModal(),
  'view-intervention': (id) => openInterventionDetailModal(Number(id)),
  'create-survey': () => openEngagementSurveyModal(),
  'view-survey': (id) => openSurveyDetailModal(Number(id)),
  'launch-survey': async (id) => {
    try {
      await apiCall(`/api/institution/surveys/${id}/launch`, 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Survey launched', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'close-survey': async (id) => {
    try {
      await apiCall(`/api/institution/surveys/${id}/close`, 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Survey closed', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'export-wellness': () => downloadCsv('wellness.csv', S.wellnessScores || []),

  /* ════════════════════════════════════════════════════════
     SKILLS
     ════════════════════════════════════════════════════════ */
  'manage-skills': () => openManageSkillsModal(),
  'manage-frameworks': () => openFrameworksModal(),
  'manage-role-requirements': () => openRoleRequirementsModal(),
  'bulk-assess-skills': () => openBulkAssessSkillsModal(),
  'export-skills-matrix': () => downloadCsv('skills-matrix.csv', flattenSkillsMatrix()),

  /* ════════════════════════════════════════════════════════
     SKILLS GAP
     ════════════════════════════════════════════════════════ */
  'recompute-skills-gap': async () => {
    try {
      showLoading(true);
      await apiCall('/api/institution/skills-gap/recompute', 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Skills gap recomputed', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  },
  'set-closure-targets': () => openClosureTargetsModal(),
  'view-gap-detail': (id) => openGapDetailModal(Number(id)),
  'assign-training': (id, el) => openAssignTrainingModal(Number(id), el?.dataset?.skill),
  'export-skills-gap': () => downloadCsv('skills-gap.csv', S.skillsGapAnalysis?.topGaps || []),

  /* ════════════════════════════════════════════════════════
     COMPLIANCE
     ════════════════════════════════════════════════════════ */
  'run-compliance-check': async () => {
    try {
      showLoading(true);
      const d = await apiCall('/api/institution/compliance/run', 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast(`Compliance run complete: ${d.findings_count || 0} findings`, 'info', 6000);
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  },
  'create-compliance-rule': () => openComplianceRuleModal(),
  'edit-compliance-rule': (id) => openComplianceRuleModal(Number(id)),
  'delete-compliance-rule': async (id) => {
    if (!await confirmDialog('Delete this compliance rule?')) return;
    try {
      await apiCall(`/api/institution/compliance/rules/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Rule deleted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'manage-evidence': (id) => openComplianceEvidenceModal(Number(id)),
  'view-rule-history': (id) => openRuleHistoryModal(Number(id)),
  'new-audit': () => openAuditModal(),
  'view-audit': (id) => openAuditDetailModal(Number(id)),
  'view-escalation': (id) => openEscalationModal(Number(id)),
  'view-corrective-action': (id) => openCorrectiveActionModal(Number(id)),
  'close-corrective-action': async (id) => {
    if (!await confirmDialog('Close this corrective action?')) return;
    try {
      await apiCall(`/api/institution/compliance/corrective-actions/${id}/close`, 'PUT');
      await loadAllData(); rerenderRoleContent();
      showToast('Corrective action closed', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'export-compliance-report': () => downloadCsv('compliance.csv', S.institutionComplianceRules || []),

  /* ════════════════════════════════════════════════════════
     SUCCESSION
     ════════════════════════════════════════════════════════ */
  'assign-succession': () => openSuccessionAssignmentModal(),
  'succession-detail': (id) => openTraineeDetailModal(Number(id)),
  'manage-critical-roles': () => openCriticalRolesModal(),
  'manage-talent-pools': () => openTalentPoolsModal(),
  'manage-mentoring': () => openMentoringModal(),
  'view-critical-role': (id) => openCriticalRoleDetailModal(Number(id)),
  'plan-succession-scenario': (id) => openSuccessionScenarioModal(Number(id)),
  'view-talent-pool': (id) => openTalentPoolDetailModal(Number(id)),
  'view-mentoring': (id) => openMentoringDetailModal(Number(id)),
  'view-review-decision': (id) => openReviewDecisionModal(Number(id)),
  'export-succession': () => downloadCsv('succession.csv', S.successionMatrix?.assignments || []),

  /* ════════════════════════════════════════════════════════
     IDP
     ════════════════════════════════════════════════════════ */
  'create-idp': (id) => openIDPModal(null, id ? Number(id) : null),
  'open-idp': (id) => openIDPModal(Number(id)),
  'edit-idp': (id) => openIDPModal(Number(id)),
  'export-idp': () => downloadCsv('idp.csv', S.individualDevelopmentPlans || []),

  /* ════════════════════════════════════════════════════════
     INSTRUCTORS
     ════════════════════════════════════════════════════════ */
  'assign-instructor': () => openInstructorModal(),
  'view-instructor': (id) => openInstructorDetailModal(Number(id)),
  'instructor-qualifications': (id) => openQualificationsModal(Number(id)),
  'instructor-availability': (id) => openAvailabilityModal(Number(id)),
  'instructor-workload': (id) => openWorkloadModal(Number(id)),
  'instructor-contracts': (id) => openInstructorContractsModal(Number(id)),
  'instructor-evaluations': (id) => openInstructorEvaluationsModal(Number(id)),
  'instructor-payments': (id) => openInstructorPaymentsModal(Number(id)),
  'instructor-cpd': (id) => openInstructorCPDModal(Number(id)),
  'instructor-replacement': (id) => openInstructorReplacementModal(Number(id)),
  'export-instructors': () => downloadCsv('instructors.csv', S.instructors || []),

  /* ════════════════════════════════════════════════════════
     MARKETPLACE
     ════════════════════════════════════════════════════════ */
  'post-instructor-request': () => openInstructorRequestModal(),
  'hire-instructor': (id, el) => openHireInstructorModal(Number(id), el?.dataset?.name),
  'view-market-instructor': (id) => openInstructorDetailModal(Number(id)),
  'request-quote': (id) => openRequestQuoteModal(Number(id)),
  'compare-quotes': (id) => openCompareQuotesModal(Number(id)),
  'close-rfp': async (id) => {
    if (!await confirmDialog('Close this RFP?')) return;
    try {
      await apiCall(`/api/institution/marketplace/requests/${id}/close`, 'PUT');
      await loadAllData(); rerenderRoleContent();
      showToast('RFP closed', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'view-contract': (id) => openContractDetailModal(Number(id)),
  'amend-contract': (id) => openAmendContractModal(Number(id)),
  'rate-instructor': (id) => openRateInstructorModal(Number(id)),

  /* ════════════════════════════════════════════════════════
     BUDGETS
     ════════════════════════════════════════════════════════ */
  'create-budget': () => openBudgetModal(),
  'edit-budget': (id) => openBudgetModal(Number(id)),
  'view-budget-transactions': (id) => openBudgetTransactionsModal(Number(id)),
  'budget-forecast': (id) => openBudgetForecastModal(Number(id)),
  'budget-roi': (id) => openBudgetRoiModal(Number(id)),
  'request-budget': () => openBudgetRequestModal(),
  'approve-budget-request': async (id) => {
    try {
      await apiCall(`/api/institution/budgets/requests/${id}/approve`, 'PUT');
      await loadAllData(); rerenderRoleContent();
      showToast('Budget request approved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'reject-budget-request': async (id) => {
    if (!await confirmDialog('Reject this budget request?')) return;
    try {
      await apiCall(`/api/institution/budgets/requests/${id}/reject`, 'PUT');
      await loadAllData(); rerenderRoleContent();
      showToast('Budget request rejected', 'info');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'view-invoice': (id) => openInvoiceModal(Number(id)),
  'mark-invoice-paid': async (id) => {
    if (!await confirmDialog('Mark this invoice as paid?')) return;
    try {
      await apiCall(`/api/institution/invoices/${id}/mark-paid`, 'PUT');
      await loadAllData(); rerenderRoleContent();
      showToast('Invoice marked paid', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'export-budgets': () => downloadCsv('budgets.csv', S.budgetAllocations || []),

  /* ════════════════════════════════════════════════════════
     CAMPUSES
     ════════════════════════════════════════════════════════ */
  'create-campus': () => openCampusModal(),
  'edit-campus': (id) => openCampusModal(Number(id)),
  'delete-campus': async (id) => {
    if (!await confirmDialog('Delete this campus?')) return;
    try {
      await apiCall(`/api/institution/campuses/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Campus deleted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'view-campus-trainees': (id) => {
    S.activeCampusId = Number(id);
    activeTab = 'trainees';
    rerenderRoleContent();
  },
  'clear-campus-filter': () => { S.activeCampusId = null; rerenderRoleContent(); },
  'campus-resources': (id) => openCampusResourcesModal(Number(id)),
  'campus-dashboard': (id) => openCampusDashboardModal(Number(id)),
  'campus-cross-enrol': (id) => openCrossCampusEnrolModal(Number(id)),
  'export-campuses': () => downloadCsv('campuses.csv', S.campuses || []),

  /* ════════════════════════════════════════════════════════
     REPORTS
     ════════════════════════════════════════════════════════ */
  'schedule-report': () => openScheduleReportModal(),
  'edit-scheduled-report': (id) => openScheduleReportModal(Number(id)),
  'delete-scheduled-report': async (id) => {
    if (!await confirmDialog('Delete this scheduled report?')) return;
    try {
      await apiCall(`/api/institution/scheduled-reports/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Scheduled report deleted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'report-programme-scorecard': () => openQuickReport('programme-scorecard'),
  'report-cohort-comparison': () => openQuickReport('cohort-comparison'),
  'report-trainee-progress': () => openQuickReport('trainee-progress'),
  'report-compliance': () => openQuickReport('compliance'),
  'report-cost': () => openQuickReport('cost'),
  'report-attendance': () => openQuickReport('attendance'),
  'report-outcomes': () => openQuickReport('outcomes'),

  /* ════════════════════════════════════════════════════════
     REPORT BUILDER
     ════════════════════════════════════════════════════════ */
  'new-report-definition': () => openReportDefinitionModal(),
  'edit-report-definition': (id) => openReportDefinitionModal(Number(id)),
  'delete-report-definition': async (id) => {
    if (!await confirmDialog('Delete this report definition?')) return;
    try {
      await apiCall(`/api/institution/report-definitions/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Report deleted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'run-saved-report': async (id) => {
    try {
      showLoading(true);
      const d = await apiCall(`/api/institution/report-definitions/${id}/run`);
      openReportPreviewModalByData(d);
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  },
  'schedule-report-definition': (id) => openScheduleReportModal(null, Number(id)),

  /* ════════════════════════════════════════════════════════
     ANNOUNCEMENTS
     ════════════════════════════════════════════════════════ */
  'create-announcement': () => openAnnouncementModal(),
  'edit-announcement': (id) => openAnnouncementModal(Number(id)),
  'delete-announcement': async (id) => {
    if (!await confirmDialog('Delete this announcement?')) return;
    try {
      await apiCall(`/api/institution/announcements/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Announcement deleted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'view-acknowledgements': (id) => openAcknowledgementsModal(Number(id)),

  /* ════════════════════════════════════════════════════════
     INTEGRATIONS
     ════════════════════════════════════════════════════════ */
  'create-api-key': () => openApiKeyModal(),
  'copy-api-key': (id) => {
    const k = (S.apiKeys || []).find(x => x.id == id);
    if (!k) return;
    navigator.clipboard?.writeText(k.prefix + '…');
    showToast('API key prefix copied (full key shown only at creation)', 'info', 5000);
  },
  'rotate-api-key': async (id) => {
    if (!await confirmDialog('Rotate this API key? The old key will stop working immediately.')) return;
    try {
      const d = await apiCall(`/api/institution/api-keys/${id}/rotate`, 'POST');
      await loadAllData(); rerenderRoleContent();
      openModal({
        title: 'New API Key',
        body: `
          <p class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i>
            Copy this key now. It cannot be shown again.</p>
          <textarea class="form-textarea" rows="2" readonly>${esc(d.key)}</textarea>`,
        footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
      });
    } catch (e) { showToast(e.message, 'error'); }
  },
  'revoke-api-key': async (id) => {
    if (!await confirmDialog('Revoke this API key?')) return;
    try {
      await apiCall(`/api/institution/api-keys/${id}/revoke`, 'PUT');
      await loadAllData(); rerenderRoleContent();
      showToast('API key revoked', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'create-webhook': () => openWebhookModal(),
  'edit-webhook': (id) => openWebhookModal(Number(id)),
  'delete-webhook': async (id) => {
    if (!await confirmDialog('Delete this webhook?')) return;
    try {
      await apiCall(`/api/institution/webhooks/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Webhook deleted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'test-webhook': async (id) => {
    try {
      const d = await apiCall(`/api/institution/webhooks/${id}/test`, 'POST');
      showToast(`Test delivered: ${d.status || 'OK'}`, d.status === 'ok' ? 'success' : 'warning');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'test-integration': async (id) => {
    try {
      const d = await apiCall(`/api/institution/integrations/${id}/test`, 'POST');
      showToast(`Integration: ${d.status || 'OK'}`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'view-webhook-queue': (id) => openWebhookQueueModal(Number(id)),

  /* ════════════════════════════════════════════════════════
     SECURITY
     ════════════════════════════════════════════════════════ */
  'save-sso': async () => {
    try {
      await apiCall('/api/institution/sso', 'PUT', {
        provider:     $('#sso-provider')?.value || null,
        entity_id:    $('#sso-entity')?.value || null,
        metadata_url: $('#sso-metadata-url')?.value || null,
        certificate:  $('#sso-cert')?.value || null,
      });
      showToast('SSO configuration saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'test-sso': async () => {
    try {
      showLoading(true);
      const d = await apiCall('/api/institution/sso/test', 'POST');
      showToast(`SSO test: ${d.status}`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  },
  'validate-sso-cert': async () => {
    try {
      const d = await apiCall('/api/institution/sso/validate-cert', 'POST');
      showToast(`Certificate: ${d.status}`, d.valid ? 'success' : 'warning');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'save-security-policy': async () => {
    try {
      await apiCall('/api/institution/security/policies', 'PUT', {
        force_mfa:          $('#sec-force-mfa')?.checked || false,
        ip_whitelist_enabled: $('#sec-ip-whitelist')?.checked || false,
        session_timeout:    $('#sec-session-timeout')?.checked || false,
        audit_logging:      $('#sec-audit-logging')?.checked || false,
      });
      showToast('Security policies saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'configure-session-policy': () => openSessionPolicyModal(),

  /* ════════════════════════════════════════════════════════
     OPERATIONS
     ════════════════════════════════════════════════════════ */
  'save-institution-settings': async () => {
    const payload = {
      name: $('#instSetName')?.value,
      contact_email: $('#instSetEmail')?.value,
      default_capacity: Number($('#instSetCap')?.value || 30),
      pass_mark: Number($('#instSetPass')?.value || 70),
      seat_allocation: Number($('#instSetSeats')?.value || 0),
      billing_cycle: $('#instSetBilling')?.value || 'monthly',
    };
    try {
      await apiCall('/api/institution/settings', 'PUT', payload);
      await loadAllData(); rerenderRoleContent();
      showToast('Settings saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'approve-request': async (id) => {
    try {
      await apiCall(`/api/institution/approvals/${id}/approve`, 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Approved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'reject-request': async (id) => {
    if (!await confirmDialog('Reject this request?')) return;
    try {
      await apiCall(`/api/institution/approvals/${id}/reject`, 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Rejected', 'info');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'manage-workflows': () => openWorkflowsModal(),
  'edit-workflow': (id) => openWorkflowEditorModal(Number(id)),
  'change-team-role': (id) => openChangeRoleModal(Number(id)),
  'manage-team-permissions': (id) => openManagePermissionsModal(Number(id)),
  'remove-team-member': async (id) => {
    if (!await confirmDialog('Remove this team member?')) return;
    try {
      await apiCall(`/api/institution/team/${id}`, 'DELETE');
      await loadAllData(); rerenderRoleContent();
      showToast('Team member removed', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'invite-team-member': () => openInviteTeamMemberModal(),

  /* ════════════════════════════════════════════════════════
     BRANDING
     ════════════════════════════════════════════════════════ */
  'save-branding': async () => {
    const payload = {
      primary_color: $('#brandPrimary')?.value || null,
      accent_color: $('#brandAccent')?.value || null,
      email_sender_name: $('#brandEmailName')?.value || null,
      email_sender_address: $('#brandEmailAddr')?.value || null,
      welcome_message: $('#brandWelcome')?.value || null,
      certificate_header: $('#brandCertHeader')?.value || null,
      certificate_footer: $('#brandCertFooter')?.value || null,
      report_header: $('#brandReportHeader')?.value || null,
      white_label: $('#brandWhiteLabel')?.checked || false,
      custom_domain_enabled: $('#brandCustomDomain')?.checked || false,
    };
    try {
      await apiCall('/api/institution/branding', 'PUT', payload);
      await loadAllData(); rerenderRoleContent();
      showToast('Branding saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },

  /* ════════════════════════════════════════════════════════
     PROFILE
     ════════════════════════════════════════════════════════ */
  'update-institution-profile': async () => {
    const payload = {
      name: $('#instProfileName')?.value,
      type: $('#instProfileType')?.value,
      industry: $('#instProfileIndustry')?.value,
      contact_phone: $('#instProfilePhone')?.value,
      address: $('#instProfileAddress')?.value,
      public_bio: $('#instProfileBio')?.value,
    };
    try {
      await apiCall('/api/institution/profile', 'PUT', payload);
      await loadAllData(); rerenderRoleContent();
      showToast('Profile updated', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  },
  'add-accreditation': () => openAddAccreditationModal(),
};

/* ════════════════════════════════════════════════════════
   Entry point — called from 14-actions.js before its switch.
   ════════════════════════════════════════════════════════ */
function handleInstitutionAction(action, id, el) {
  const handler = INSTITUTION_ACTIONS[action];
  if (!handler) return false;
  try {
    handler(id, el);
  } catch (err) {
    console.error('Institution action failed:', action, err);
    showToast(err.message || 'Action failed', 'error');
  }
  return true;
}

/* Utilities referenced above */
function flattenSkillsMatrix() {
  const m = S.institutionSkillsMatrix || { skills: [], matrix: [] };
  const rows = [];
  (m.matrix || []).forEach(row => {
    (m.skills || []).forEach(s => {
      rows.push({
        trainee: row.trainee.name,
        department: row.trainee.department,
        skill: s.name,
        level: row.levels[s.id] || 0,
      });
    });
  });
  return rows;
}
