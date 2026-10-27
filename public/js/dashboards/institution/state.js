/* ============================================================
   ExpertHub 2.0 — Institution State Extensions
   Add new state slots to the global S object.
   ============================================================ */
Object.assign(S, {
  institutionAnalytics: {
    overview: {},
    cohortPerformance: [],
    instructorPerformance: [],
    campusPerformance: [],
    trends: { enrollment: [], completion: [], revenue: [] },
    programmeMix: [],
  },
  campuses: [],
  activeCampusId: null,
  examProctorSessions: [],
  examProctorFlags: [],
  wellnessScores: [],
  wellnessAlerts: [],
  skillsGapAnalysis: { categories: [], topGaps: [], departmentGaps: [], summary: {} },
  successionMatrix: { boxes: CONFIG.SUCCESSION_BOXES, trainees: [], assignments: [] },
  instructorMarketplace: [],
  instructorContracts: [],
  budgetAllocations: [],
  budgetTransactions: [],
  blockchainCerts: [],
  savedReportDefinitions: [],
  announcements: [],
  apiKeys: [],
  webhooks: [],
  ssoConfiguration: {},
  complianceRuns: [],
});
