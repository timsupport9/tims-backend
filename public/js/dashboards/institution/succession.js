/* ============================================================
   Institution — Succession Planning (9-Box Grid)
   ============================================================ */
function instSuccession() {
  const m = S.successionMatrix || { boxes: CONFIG.SUCCESSION_BOXES, trainees: [], assignments: [] };
  const boxes = CONFIG.SUCCESSION_BOXES;
  const assignmentMap = {};
  (m.assignments || []).forEach(a => {
    const key = `${a.performance}-${a.potential}`;
    (assignmentMap[key] = assignmentMap[key] || []).push(a);
  });

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Succession Planning</span></div>
    <section class="page-header">
      <h1 class="page-title">Succession Planning (9-Box Grid)</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-succession">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="assign-succession">
          <i class="fas fa-plus"></i> Assign Trainee</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-sitemap"></i>
      <div>Map high-performers and high-potentials to prioritize development, retention and promotion.
        Drag trainees between boxes to update their placement.</div>
    </div>

    <section class="panel">
      <h3 class="panel-title">9-Box Grid</h3>
      <div class="nine-box-grid">
        ${['high','medium','low'].map(perf => `
          ${['low','medium','high'].map(pot => {
            const box = boxes.find(b => b.performance === perf && b.potential === pot);
            const people = assignmentMap[`${perf}-${pot}`] || [];
            return `
              <div class="nine-box-cell nine-box-${box?.code || 'unknown'}"
                   data-perf="${perf}" data-pot="${pot}">
                <div class="nine-box-label">${esc(box?.label || '')}</div>
                <div class="nine-box-people">
                  ${people.map(p => `
                    <div class="nine-box-person" draggable="true" data-trainee="${p.trainee_id}">
                      <img class="user-avatar-sm" src="${avatar({ name: p.trainee_name })}" alt="" />
                      <span>${esc(p.trainee_name)}</span>
                    </div>`).join('') || '<span class="nine-box-empty">No one</span>'}
                </div>
              </div>`;
          }).join('')}
        `).join('')}
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Box Descriptions</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Box</th><th>Performance</th><th>Potential</th><th>Action</th>
          </tr></thead>
          <tbody>
            ${boxes.map(b => `
              <tr>
                <td><strong>${esc(b.label)}</strong></td>
                <td>${esc(b.performance)}</td>
                <td>${esc(b.potential)}</td>
                <td>${
                  b.code === 'star' ? 'Promote / retain aggressively'
                  : b.code === 'high_pot' ? 'Accelerated development track'
                  : b.code === 'current_star' ? 'Stretch assignments'
                  : b.code === 'core' ? 'Maintain and grow'
                  : b.code === 'risk' ? 'PIP or exit plan'
                  : 'Tailored development'
                }</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
