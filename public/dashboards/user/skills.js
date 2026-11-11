/* ============================================================
   ExpertHub 2.0 — dashboards/user/skills.js
   Skill assessments, competency profile, recommendations.
   ============================================================ */

function renderUserSkills() {
  const assessments = S.skillAssessments || [];
  const completed  = assessments.filter(a => a.completed);
  const pending    = assessments.filter(a => !a.completed);
  const avg = completed.length
    ? Math.round(completed.reduce((s, a) => s + Number(a.score || 0), 0) / completed.length)
    : 0;

  return UserUI.page({
    title: 'Skills & Competency',
    breadcrumb: 'Skills',
    actions: `
      <button class="btn btn-secondary" data-action="skills-assessment">
        <i class="fas fa-clipboard-check"></i> New Assessment</button>
    `,
    content: `
      ${UserUI.stats([
        { label: 'Assessments Taken', value: completed.length, icon: 'fa-clipboard-check', tone: 'blue' },
        { label: 'Pending',           value: pending.length,   icon: 'fa-clock',           tone: 'yellow' },
        { label: 'Avg. Score',        value: avg ? avg + '%' : '—', icon: 'fa-star',       tone: 'green' },
      ])}

      <section class="panel">
        <h3 class="panel-title">Competency Profile</h3>
        ${completed.length ? completed.map(a => `
          <div class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(a.skill_name)}</span>
              <span class="list-row-sub">${esc(a.category || '')} · Level ${esc(a.level || 'beginner')}</span>
            </div>
            <div class="progress-bar" style="width:120px">
              <span style="width:${a.score || 0}%"></span>
            </div>
          </div>
        `).join('') : '<p class="empty-row">Take an assessment to build your profile.</p>'}
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('skills', renderUserSkills);

window.ExpertHubUser.registerAction('skills-assessment', () => {
  UserUI.formModal({
    title: 'Start Skill Assessment',
    fields: [
      { name: 'skill', label: 'Skill', required: true, placeholder: 'e.g. JavaScript' },
      { name: 'level', label: 'Self-assessed level', type: 'select', value: 'beginner',
        options: ['beginner','intermediate','advanced','expert'] },
    ],
    submitLabel: 'Start',
    onSubmit: async (v) => {
      await apiCall('/api/user/skills/assess', 'POST', v);
      closeModal();
      await loadUserExtendedData();
      rerenderRoleContent();
      showToast('Assessment started', 'success');
    },
  });
});
