/* ============================================================
   ExpertHub 2.0 — 13a-modals-helpers.js
   Shared helper functions used by modal builders.
   ============================================================ */

/* ---------- Helpers ---------- */
async function loadCourseCurriculum(courseId) {
  try {
    const d = await apiCall(`/api/eschool/courses/${courseId}/curriculum`);
    S.courseCurriculum[courseId] = d;
  } catch (_) { S.courseCurriculum[courseId] = { modules: [] }; }
}
