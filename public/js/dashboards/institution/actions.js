/* ============================================================
   Institution — Action Handlers
   Add to 14-actions.js's handleAction switch (or load as extension).
   ============================================================ */

const INSTITUTION_ACTIONS = {
  /* Campuses */
  'create-campus':           () => openCampusModal(),
  'edit-campus':             (id) => openCampusModal(Number(id)),
  'delete-campus':           async (id) => {
    if (!await confirmDialog('Delete this campus?')) return;
    await apiCall(`/api/institution/campuses/${id}`, 'DELETE');
    await loadAllData(); rerenderRoleContent(); showToast('Campus deleted', 'success');
  },
  'view-campus-trainees':    (id) => { S.activeCampusId = Number(id); activeTab = 'trainees'; rerenderRoleContent(); },
  'clear-campus-filter':     () => { S.activeCampusId = null; rerenderRoleContent(); },

  /* Learning paths */
  'open-path-builder':       (id) => openPathBuilderModal(Number(id)),

  /* Proctored exams */
  'schedule-proctor-session':() => openProctorSessionModal(),
  'view-proctor-session':    (id) => showToast('Session detail opened in demo', 'info'),
  'invalidate-exam':         async (id) => {
    if (!await confirmDialog('Invalidate this exam session?')) return;
    await apiCall(`/api/institution/proctor-sessions/${id}/invalidate`, 'PUT');
    await loadAllData(); rerenderRoleContent(); showToast('Exam invalidated', 'warning');
  },
  'review-flag':             (id) => showToast(`Flag #${id} opened for review`, 'info'),

  /* Wellness */
  'export-wellness':         () => downloadCsv('wellness.csv', S.wellnessScores || []),
  'recompute-wellness':      async () => {
    try { showLoading(true);
      await apiCall('/api/institution/wellness/recompute', 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Wellness scores recomputed', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  },
  'wellness-intervene':      (id) => openWellnessInterventionModal(Number(id)),
  'wellness-dismiss':        async (id) => {
    await apiCall(`/api/institution/wellness/alerts/${id}/dismiss`, 'PUT');
    await loadAllData(); rerenderRoleContent();
  },

  /* Skills gap */
  'export-skills-gap':       () => downloadCsv('skills-gap.csv', S.skillsGapAnalysis?.topGaps || []),
  'recompute-skills-gap':    async () => {
    try { showLoading(true);
      await apiCall('/api/institution/skills-gap/recompute', 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast('Skills gap recomputed', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  },

  /* Compliance */
  'run-compliance-check':    async () => {
    try { showLoading(true);
      const d = await apiCall('/api/institution/compliance/run', 'POST');
      await loadAllData(); rerenderRoleContent();
      showToast(`Compliance run complete: ${d.findings_count || 0} findings`, 'info', 6000);
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  },

  /* Succession */
  'export-succession':       () => downloadCsv('succession.csv', S.successionMatrix?.assignments || []),
  'assign-succession':       () => openSuccessionAssignmentModal(),

  /* Marketplace */
  'post-instructor-request': () => openInstructorRequestModal(),
  'hire-instructor':         (id, name) => openHireInstructorModal(Number(id), name),

  /* Budgets */
  'export-budgets':          () => downloadCsv('budgets.csv', S.budgetAllocations || []),
  'create-budget':           () => openBudgetModal(),
  'edit-budget':             (id) => openBudgetModal(Number(id)),
  'view-budget-transactions':(id) => openBudgetTransactionsModal(Number(id)),

  /* Report builder */
  'new-report-definition':   () => openReportDefinitionModal(),
  'edit-report-definition':  (id) => openReportDefinitionModal(Number(id)),
  'delete-report-definition':async (id) => {
    if (!await confirmDialog('Delete this report definition?')) return;
    await apiCall(`/api/institution/report-definitions/${id}`, 'DELETE');
    await loadAllData(); rerenderRoleContent();
  },
  'run-saved-report':        async (id) => {
    try { showLoading(true);
      const d = await apiCall(`/api/institution/report-definitions/${id}/run`);
      showLoading(false);
      openReportPreviewModalByData(d);
    } catch (e) { showToast(e.message, 'error'); showLoading(false); }
  },

  /* Announcements */
  'create-announcement':     () => openAnnouncementModal(),
  'edit-announcement':       (id) => openAnnouncementModal(Number(id)),
  'delete-announcement':     async (id) => {
    if (!await confirmDialog('Delete this announcement?')) return;
    await apiCall(`/api/institution/announcements/${id}`, 'DELETE');
    await loadAllData(); rerenderRoleContent();
  },

  /* Integrations */
  'create-api-key':          () => openApiKeyModal(),
  'copy-api-key':            (id) => {
    const k = (S.apiKeys || []).find(x => x.id == id);
    if (!k) return;
    navigator.clipboard?.writeText(k.prefix + '…');
    showToast('API key prefix copied (full key shown only once at creation)', 'info', 5000);
  },
  'revoke-api-key':          async (id) => {
    if (!await confirmDialog('Revoke this API key?')) return;
    await apiCall(`/api/institution/api-keys/${id}/revoke`, 'PUT');
    await loadAllData(); rerenderRoleContent();
  },
  'create-webhook':          () => openWebhookModal(),
  'edit-webhook':            (id) => openWebhookModal(Number(id)),
  'delete-webhook':          async (id) => {
    if (!await confirmDialog('Delete this webhook?')) return;
    await apiCall(`/api/institution/webhooks/${id}`, 'DELETE');
    await loadAllData(); rerenderRoleContent();
  },

  /* Security */
  'save-sso':                async () => {
    await apiCall('/api/institution/sso', 'PUT', {
      provider:     $('#sso-provider').value || null,
      entity_id:    $('#sso-entity').value || null,
      metadata_url: $('#sso-metadata-url').value || null,
      certificate:  $('#sso-cert').value || null,
    });
    showToast('SSO configuration saved', 'success');
  },
  'test-sso':                async () => {
    try { showLoading(true);
      const d = await apiCall('/api/institution/sso/test', 'POST');
      showToast(`SSO test: ${d.status}`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  },
  'save-security-policy':    async () => {
    await apiCall('/api/institution/security/policies', 'PUT', {
      force_mfa: $('#sec-force-mfa').checked,
      ip_whitelist_enabled: $('#sec-ip-whitelist').checked,
      session_timeout: $('#sec-session-timeout').checked,
    });
    showToast('Security policies saved', 'success');
  },
};

/* Merge into existing handleAction switch */
function handleInstitutionAction(action, id, el) {
  const handler = INSTITUTION_ACTIONS[action];
  if (!handler) return false;
  handler(id, el?.dataset?.name);
  return true;
}
