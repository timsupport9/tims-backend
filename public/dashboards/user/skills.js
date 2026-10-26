/* ============================================================
   ExpertHub 2.0 — dashboards/user/skills.js
   Skill assessments, competency profile, recommendations.
   Distinguishes verified vs self-reported.
   ============================================================ */

function renderUserSkills() {
  const assessments = S.skillAssessments || [];
  const completed  = assessments.filter(a => a.completed || a.verified);
  const pending    = assessments.filter(a => !(a.completed || a.verified));
  const verified   = completed.filter(a => a.verified);
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
        { label: 'Verified Skills',   value: verified.length,  icon: 'fa-check-shield',   tone: 'green' },
        { label: 'Pending',           value: pending.length,   icon: 'fa-clock',           tone: 'yellow' },
        { label: 'Avg. Score',        value: avg ? avg + '%' : '—', icon: 'fa-star',       tone: 'purple' },
      ])}

      <section class="panel">
        <h3 class="panel-title">Competency Profile</h3>
        ${completed.length ? completed.map(a => `
          <div class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">
                ${esc(a.skill_name)}
                ${a.verified
                  ? '<span class="chip chip-green" title="Verified by assessment"><i class="fas fa-check-shield"></i> Verified</span>'
                  : '<span class="chip chip-neutral">Self-reported</span>'}
              </span>
              <span class="list-row-sub">${esc(a.category || '')} · Level ${esc(a.level || 'beginner')}</span>
            </div>
            <div class="progress-bar" style="width:120px">
              <span style="width:${a.score || 0}%"></span>
            </div>
          </div>
        `).join('') : '<p class="empty-row">Take an assessment to build your profile.</p>'}
      </section>

      ${completed.filter(a => a.score < 70).length ? `
        <section class="panel">
          <h3 class="panel-title">Recommended Learning</h3>
          ${completed.filter(a => a.score < 70).map(a => `
            <div class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">Improve: ${esc(a.skill_name)}</span>
                <span class="list-row-sub">Current score ${a.score}% — consider a related course</span>
              </div>
              <button class="btn btn-primary btn-xs" data-action="switch-tab" data-tab="eschool">
                <i class="fas fa-book-open"></i> Find Course</button>
            </div>
          `).join('')}
        </section>
      ` : ''}

      ${pending.length ? `
        <section class="panel">
          <h3 class="panel-title">Pending Assessments</h3>
          ${pending.map(a => `
            <div class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(a.skill_name)}</span>
                <span class="list-row-sub">Started ${timeAgo(a.created_at)}</span>
              </div>
              <button class="btn btn-primary btn-xs" data-action="resume-skill-assessment" data-id="${a.id}">
                <i class="fas fa-play"></i> Resume</button>
            </div>
          `).join('')}
        </section>
      ` : ''}
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
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Assessment started', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('resume-skill-assessment', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/skills/assessments/${id}`).catch(() => null);
    closeModal();
    if (!d?.questions?.length) {
      return showToast('Assessment not available', 'warning');
    }
    openModal({
      title: d.assessment?.skill_name || 'Skill Assessment',
      className: 'modal-lg',
      body: d.questions.map((q, i) => `
        <div class="panel" style="margin-bottom:12px">
          <p><strong>Q${i + 1}.</strong> ${esc(q.question_text)}</p>
          ${(q.options || []).map(o => `
            <label class="checkbox-row">
              <input type="radio" name="sq_${q.id}" value="${esc(o)}" />
              ${esc(o)}
            </label>
          `).join('')}
        </div>
      `).join(''),
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button id="skSubmit" class="btn btn-primary">Submit</button>
      `,
    });
    $('#skSubmit').onclick = async () => {
      const answers = {};
      document.querySelectorAll('input[type=radio]:checked').forEach(el => {
        answers[el.name.replace('sq_', '')] = el.value;
      });
      try {
        const r = await apiCall(`/api/user/skills/assessments/${id}/submit`, 'POST', { answers });
        closeModal();
        showToast(`Score: ${r.score}%`, 'success');
        await loadUserExtendedData({ force: true });
        rerenderRoleContent();
      } catch (e) { showToast(e.message, 'error'); }
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});