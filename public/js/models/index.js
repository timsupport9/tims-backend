/* ============================================================
   ExpertHub 2.0 — Modal Module Index
   Split from the original 13-modals.js without omitting functions.
   Load the individual modal files before this index when using
   classic <script> loading.
   ============================================================ */

window.ExpertHubModalModules = {
  shared: 'shared-modal-helpers.js',
  admin: 'admin-modals.js',
  learner: 'learner-modals.js',
  expert: 'expert-modals.js',
  institution: 'institution-modals.js',
  course: 'course-modals.js',
  consultation: 'consultation-modals.js',
  payment: 'payment-modals.js',
  wallet: 'wallet-modals.js',
  support: 'support-modals.js',
  certificate: 'certificate-modals.js',
  scheduling: 'scheduling-modals.js',
  academic: 'academic-modals.js',
  project: 'project-modals.js'
};

window.ExpertHubModalFunctionMap = {
  shared: ['loadCourseCurriculum'],
  admin: ['openEditUserModal', 'submitCreateExpert', 'openAssignExpertModal',
    'openAssignOpsModal', 'openCreateCouponModal', 'sendBroadcast',
    'saveAdminSettings', 'showConsultationModal', 'openEventModal'],
  learner: ['openChangeIntentModal', 'updateUserProfile', 'changePassword'],
  expert: ['openPortfolioItemModal', 'openEditTiersModal', 'openExpertProfileModal'],
  institution: ['openCampusModal', 'openPathBuilderModal', 'openAssignSuccessionModal',
    'openHireInstructorModal', 'openPostInstructorRequestModal', 'openCreateBudgetModal',
    'openEditBudgetModal', 'openBudgetTransactionsModal', 'openNewReportDefinitionModal',
    'runSavedReport', 'openAnnouncementModal', 'openCreateApiKeyModal',
    'openWebhookModal', 'saveSsoConfig', 'saveSecurityPolicy',
    'saveInstitutionSettings', 'saveBranding', 'updateInstitutionProfile',
    'openProgrammeModal', 'openProgrammeViewModal', 'openCurriculumModal',
    'openLearningPathModal', 'openCohortModal', 'openCohortViewModal',
    'openCohortWaitlistModal', 'openImportHistoryModal', 'openTraineeImportModal',
    'uploadCsv', 'openTraineeDetailModal', 'openTraineeNotesModal',
    'openTraineeTransferModal', 'openManageSkillsModal', 'openComplianceRuleModal',
    'openAssignInstructorModal', 'bindPickButtons', 'openInviteTeamMemberModal',
    'openChangeTeamRoleModal', 'openTeamPermissionsModal', 'openOrgUnitModal',
    'openReportPreviewModal'],
  course: ['openEnrollModal', 'markLessonComplete', 'openCourseReviewModal',
    'openCreateCourseModal', 'openEditCourseModal', 'openAddModuleModal',
    'openEditModuleModal', 'openAddLessonModal', 'openEditLessonModal',
    'saveCourseSettings'],
  consultation: ['openReviewModal', 'openNewConsultationModal', 'openClaimModal',
    'openVideoCall', 'openFindExpertWizard', 'openInstantConsultationModal',
    'openBookSlotWithExpert', 'openRescheduleModal', 'openCancelConsultationModal',
    'openConsultationDetailModal', 'openConsultationReviewModal',
    'openTipModal', 'openDisputeModal'],
  payment: ['openRefundModal'],
  wallet: ['topUpWallet'],
  support: ['openNewTicketModal', 'openTicketModal'],
  certificate: ['printCertificateModal', 'openIssueCertificateModal'],
  scheduling: ['openManageSlotsModal', 'openBlockTimeModal',
    'openProctorSessionModal', 'openSessionModal', 'openAttendanceModal',
    'openSessionsCalendarModal', 'openScheduleReportModal'],
  academic: ['openAssessmentModal', 'openGradingModal', 'openQuestionModal',
    'uploadMaterial'],
  project: ['openProjectModal']
};

/*
  The split intentionally preserves the original global-function style.
  Existing frontend callers can continue using the same function names.
*/
