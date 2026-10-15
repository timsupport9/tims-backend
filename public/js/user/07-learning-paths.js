/* ============================================================
   ExpertHub 2.0 — 07-learning-paths.js
   Curated multi-course learning paths.
   ============================================================ */

/* ============================================================
   E-SCHOOL — LEARNING PATHS
   ============================================================ */
function userLearningPaths() {
  const paths = S.coursePaths || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Learning Paths</span></div>
    <section class="page-header">
      <h1 class="page-title">Learning Paths</h1>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-route"></i>
      <div>
        Structured curricula that guide you through multiple courses in sequence.
        Complete prerequisites to unlock advanced content.
      </div>
    </div>

    ${paths.length ? `
      <section class="card-grid">
        ${paths.map(lp => `
          <article class="program-card">
            <div style="display:flex;justify-content:space-between;gap:10px">
              <span class="chip chip-blue">${lp.step_count || 0} courses</span>
              <span class="${statusClass(lp.status || 'not_started')}">${esc(lp.status || '')}</span>
            </div>
            <h4 class="program-title">${esc(lp.title)}</h4>
            <p class="program-desc">${esc((lp.description || '').slice(0, 140))}</p>
            <div class="progress-bar" style="margin-top:8px">
              <span style="width:${lp.progress || 0}%"></span>
            </div>
            <p class="program-meta">${lp.progress || 0}% complete</p>
            <div class="panel-actions" style="margin-top:10px">
              <button class="btn btn-primary btn-sm" data-action="open-path-detail" data-id="${lp.id}">
                <i class="fas fa-route"></i> Open Path</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-route"></i>
          <h3>No learning paths available</h3>
          <p>Check back soon for curated paths.</p>
        </div>
      </section>
    `}
  `;
}
