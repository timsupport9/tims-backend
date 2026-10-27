/* ============================================================
   Institution — Skills Gap
   ============================================================ */
function instSkillsGap() {
  const gap = S.skillsGapAnalysis || {};
  const categories = gap.categories || [];
  const topGaps    = gap.topGaps || [];
  const deptGaps   = gap.departmentGaps || [];
  const summary    = gap.summary || {};

  const cellColour = (current, target) => {
    const diff = target - current;
    if (diff <= 0) return 'gap-ok';
    if (diff === 1) return 'gap-minor';
    if (diff === 2) return 'gap-moderate';
    return 'gap-severe';
  };

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Skills Gap</span></div>
    <section class="page-header">
      <h1 class="page-title">Skills Gap Analysis</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-skills-gap">
          <i class="fas fa-download"></i> Export Gaps</button>
        <button class="btn btn-primary" data-action="recompute-skills-gap">
          <i class="fas fa-rotate"></i> Recompute</button>
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Skills Tracked', summary.totalSkills || 0, '', 'fa-list-check', 'blue')}
      ${statCard('Skills at Target', summary.skillsAtTarget || 0, '', 'fa-check-circle', 'green')}
      ${statCard('Skills Below Target', summary.skillsBelowTarget || 0, '', 'fa-exclamation-circle', 'yellow')}
      ${statCard('Critical Gaps', summary.criticalGaps || 0, '', 'fa-fire', 'red')}
    </section>

    <section class="panel">
      <h3 class="panel-title">Skill Coverage Heatmap</h3>
      <p class="form-hint" style="margin-bottom:12px">
        Cells show average proficiency vs. target. Red = largest gap, green = target met.
      </p>
      <div class="gap-heatmap-wrapper">
        <table class="gap-heatmap">
          <thead><tr>
            <th>Department</th>
            ${categories.map(c => `<th>${esc(c.name)}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${deptGaps.map(row => `
              <tr>
                <td class="gap-dept-name">${esc(row.department || 'Unassigned')}</td>
                ${categories.map(cat => {
                  const cell = row.skills?.[cat.id] || { avg: 0, target: 3 };
                  return `<td class="${cellColour(cell.avg, cell.target)}"
                    title="Avg ${cell.avg} / Target ${cell.target}">
                    ${cell.avg.toFixed ? cell.avg.toFixed(1) : cell.avg}</td>`;
                }).join('')}
              </tr>`).join('') ||
              '<tr><td colspan="100%" class="empty-row">No department data yet</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="gap-legend">
        <span><span class="gap-swatch gap-ok"></span> At target</span>
        <span><span class="gap-swatch gap-minor"></span> 1 below</span>
        <span><span class="gap-swatch gap-moderate"></span> 2 below</span>
        <span><span class="gap-swatch gap-severe"></span> 3+ below</span>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Top Skill Gaps</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Skill</th><th>Category</th><th>Avg. Level</th>
            <th>Target</th><th>Gap</th><th>Affected Trainees</th><th>Recommendation</th>
          </tr></thead>
          <tbody>
            ${topGaps.map(g => `
              <tr>
                <td>${esc(g.skill_name)}</td>
                <td><span class="chip chip-neutral">${esc(g.category || '—')}</span></td>
                <td>${Number(g.avg_level || 0).toFixed(1)}</td>
                <td>${g.target_level || 3}</td>
                <td><span class="${g.gap >= 2 ? 'status-rejected' : g.gap >= 1 ? 'status-pending' : 'status-active'}">
                  ${g.gap > 0 ? `-${g.gap}` : 'At target'}</span></td>
                <td>${g.affected_trainees || 0}</td>
                <td>${esc(g.recommendation || 'Add targeted programme')}</td>
              </tr>`).join('') ||
              '<tr><td colspan="7" class="empty-row">No gaps identified</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
