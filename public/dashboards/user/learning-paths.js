/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/learning-paths.js */
/* Learning paths: goals, prerequisites, milestones, adaptive */
/* recommendations, progress tracking, cross-module integration. */
/* ============================================================ */

function renderUserLearningPaths() {
  const paths = S.coursePaths || [];
  return UserUI.page({
    title: 'Learning Paths',
    breadcrumb: 'Learning Paths',
    content: `
      <div class="alert alert-info">
        <i class="fas fa-route"></i>
        <div>Structured curricula that guide you through multiple courses in sequence. Complete prerequisites to unlock advanced content.</div>
      </div>

      ${paths.length ? UserUI.cardGrid(paths.map(lp => `
        <article class="program-card">
          <div style="display:flex;justify-content:space-between;gap:10px">
            <span class="chip chip-blue">${lp.step_count || 0} courses</span>
            <span class="${statusClass(lp.status || 'not_started')}">${esc((lp.status || 'not_started').replace(/_/g,' '))}</span>
          </div>
          <h4 class="program-title">${esc(lp.title)}</h4>
          <p class="program-desc">${esc((lp.description || '').slice(0, 140))}</p>
          ${lp.target_competency ? `<p class="form-hint"><i class="fas fa-bullseye"></i> Goal: ${esc(lp.target_competency)}</p>` : ''}
          ${lp.estimated_weeks ? `<p class="program-meta">~${lp.estimated_weeks} weeks</p>` : ''}
          <div class="progress-bar" style="margin-top:8px">
            <span style="width:${lp.progress || 0}%"></span>
          </div>
          <p class="program-meta">${lp.progress || 0}% complete</p>
          <div class="panel-actions" style="margin-top:10px">
            <button class="btn btn-primary btn-sm" data-action="open-path-detail" data-id="${lp.id}">
              <i class="fas fa-route"></i>
              ${lp.progress > 0 && lp.progress < 100 ? 'Continue' : lp.progress >= 100 ? 'Review' : 'Start Path'}</button>
          </div>
        </article>
      `)) : `<section class="panel">${UserUI.empty({
        icon: 'fa-route',
        title: 'No learning paths available',
        desc: 'Curated paths will appear here soon.',
      })}</section>`}
    `,
  });
}

window.ExpertHubUser.registerModule('learning-paths', renderUserLearningPaths);

window.ExpertHubUser.registerAction('open-path-detail', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/eschool/learning-paths/${id}`).catch(() => ({ path: null, steps: [] }));
    const lp    = d.path || {};
    const steps = d.steps || [];
    const completedCount = steps.filter(s => s.status === 'completed').length;
    const progress = steps.length ? Math.round((completedCount / steps.length) * 100) : 0;
    const relatedCareers = safeJsonArray(lp.related_careers);

    openModal({
      title: lp.title || 'Learning Path',
      className: 'modal-lg',
      body: `
        <p class="form-hint">${esc(lp.description || '')}</p>
        ${lp.target_competency ? `<p><strong>Target competency:</strong> ${esc(lp.target_competency)}</p>` : ''}
        ${lp.estimated_weeks ? `<p><strong>Estimated workload:</strong> ~${lp.estimated_weeks} weeks</p>` : ''}
        <div class="progress-bar" style="margin:12px 0">
          <span style="width:${progress}%"></span>
        </div>
        <p class="program-meta">${progress}% complete · ${completedCount}/${steps.length} courses</p>

        <h3 class="panel-title" style="margin-top:16px">Path progression</h3>
        <ol class="path-progression">
          <li class="${lp.progress > 0 ? 'done' : 'active'}">Define the goal</li>
          <li class="${completedCount >= 1 ? 'done' : progress > 0 ? 'active' : ''}">Baseline skill check</li>
          <li class="${progress >= 50 ? 'done' : progress > 0 ? 'active' : ''}">Follow learning sequence</li>
          <li class="${progress >= 90 ? 'done' : progress >= 50 ? 'active' : ''}">Demonstrate competency</li>
          <li class="${progress >= 100 ? 'done' : progress >= 90 ? 'active' : ''}">Review & certificate</li>
        </ol>

        <h3 class="panel-title" style="margin-top:16px">Steps</h3>
        <ul class="list-stack">
          ${steps.map((s, i) => {
            const locked = s.status === 'locked';
            return `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">
                    <span class="chip chip-neutral">Step ${i + 1}</span>
                    ${esc(s.course_title)}
                    ${s.optional ? '<span class="chip chip-blue">Optional</span>' : ''}
                  </span>
                  <span class="list-row-sub">
                    ${esc(s.level || '')} · ${s.duration_weeks ? s.duration_weeks + 'w' : (s.duration_hours || 0) + 'h'}
                    ${s.workload_hours ? ` · ${s.workload_hours}h/week` : ''}
                  </span>
                  ${s.milestone ? `<span class="form-hint"><i class="fas fa-flag"></i> Milestone: ${esc(s.milestone)}</span>` : ''}
                </div>
                <div style="display:flex;gap:6px">
                  <span class="${statusClass(s.status || 'locked')}">${esc((s.status || 'locked').replace(/_/g,' '))}</span>
                  ${!locked && s.course_id ? `
                    <button class="btn btn-primary btn-xs" data-action="view-course-detail" data-id="${s.course_id}"
                            onclick="closeModal()">
                      <i class="fas fa-eye"></i></button>
                  ` : ''}
                </div>
              </li>
            `;
          }).join('') || '<li class="empty-row">No steps yet</li>'}
        </ul>

        ${relatedCareers.length ? `
          <h3 class="panel-title" style="margin-top:16px">Related careers</h3>
          <p>${relatedCareers.map(esc).join(' · ')}</p>
        ` : ''}
      `,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('path-enroll', async (id) => {
  try {
    await apiCall(`/api/eschool/learning-paths/${id}/enroll`, 'POST');
    await _refreshLearningData({ force: true });
    rerenderRoleContent();
    showToast('Enrolled in path', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});
