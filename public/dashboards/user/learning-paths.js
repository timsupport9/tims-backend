/* ============================================================
   ExpertHub 2.0 — dashboards/user/learning-paths.js
   Learning Paths with prerequisite gating and progress.
   ============================================================ */

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
          <div class="progress-bar" style="margin-top:8px">
            <span style="width:${lp.progress || 0}%"></span>
          </div>
          <p class="program-meta">${lp.progress || 0}% complete</p>
          <div class="panel-actions" style="margin-top:10px">
            <button class="btn btn-primary btn-sm" data-action="open-path-detail" data-id="${lp.id}">
              <i class="fas fa-route"></i> ${lp.progress > 0 && lp.progress < 100 ? 'Continue' : lp.progress >= 100 ? 'Review' : 'Start Path'}</button>
          </div>
        </article>
      `)) : `<section class="panel">${UserUI.empty({
        icon: 'fa-route',
        title: 'No learning paths available',
        desc: 'Check back soon for curated paths.',
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

    openModal({
      title: lp.title || 'Learning Path',
      className: 'modal-lg',
      body: `
        <p class="form-hint">${esc(lp.description || '')}</p>
        <div class="progress-bar" style="margin:12px 0">
          <span style="width:${progress}%"></span>
        </div>
        <p class="program-meta">${progress}% complete · ${completedCount}/${steps.length} courses</p>

        <ul class="list-stack" style="margin-top:16px">
          ${steps.map((s, i) => {
            const locked = s.status === 'locked';
            return `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">
                    <span class="chip chip-neutral">Step ${i + 1}</span>
                    ${esc(s.course_title)}
                  </span>
                  <span class="list-row-sub">${esc(s.level || '')} · ${s.duration_weeks ? s.duration_weeks + 'w' : (s.duration_hours || 0) + 'h'}</span>
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
        </ul>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});