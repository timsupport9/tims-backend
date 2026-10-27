/* ============================================================
   ExpertHub 2.0 — Skills Gap Analysis
   Job-role gap analysis, department comparisons, recommended
   training, gap closure targets, workforce capability forecasting,
   skills development costs.
   ============================================================ */

function instSkillsGap() {
  const gap = S.skillsGapAnalysis || {};
  const categories = gap.categories || [];
  const topGaps    = gap.topGaps || [];
  const deptGaps   = gap.departmentGaps || [];
  const summary    = gap.summary || {};
  const forecast   = gap.forecast || null;
  const costData   = gap.costData || null;
  const closureTargets = gap.closureTargets || [];

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
          <i class="fas fa-download"></i> Export</button>
        ${hasInstitutionPermission('trainees:write') ? `
          <button class="btn btn-secondary" data-action="set-closure-targets">
            <i class="fas fa-bullseye"></i> Closure Targets</button>
          <button class="btn btn-primary" data-action="recompute-skills-gap">
            <i class="fas fa-rotate"></i> Recompute</button>` : ''}
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Skills Tracked', summary.totalSkills || 0, '', 'fa-list-check', 'blue')}
      ${statCard('Skills at Target', summary.skillsAtTarget || 0, '', 'fa-check-circle', 'green')}
      ${statCard('Skills Below Target', summary.skillsBelowTarget || 0, '', 'fa-exclamation-circle', 'yellow')}
      ${statCard('Critical Gaps', summary.criticalGaps || 0, '', 'fa-fire', 'red')}
    </section>

    <!-- Coverage heatmap -->
    <section class="panel">
      <h3 class="panel-title"><i class="fas fa-table-cells"></i> Skill Coverage Heatmap</h3>
      <p class="form-hint" style="margin-bottom:12px">
        Cells show average proficiency vs. target. Red = largest gap, green = target met.
      </p>
      ${deptGaps.length && categories.length ? `
        <div class="gap-heatmap-wrapper" style="overflow-x:auto">
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
                    const avg = Number(cell.avg) || 0;
                    return `<td class="${cellColour(avg, cell.target)}"
                      title="Avg ${avg.toFixed(1)} / Target ${cell.target}">
                      ${avg.toFixed ? avg.toFixed(1) : avg}
                    </td>`;
                  }).join('')}
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="gap-legend">
          <span><span class="gap-swatch gap-ok"></span> At target</span>
          <span><span class="gap-swatch gap-minor"></span> 1 below</span>
          <span><span class="gap-swatch gap-moderate"></span> 2 below</span>
          <span><span class="gap-swatch gap-severe"></span> 3+ below</span>
        </div>` : renderEmptyState({
            icon: 'fa-table-cells',
            title: 'No coverage data yet',
            description: 'Once departments have skills assessed, coverage will appear here.',
            compact: true,
          })}
    </section>

    <!-- Top skill gaps with recommendations & costs -->
    <section class="panel">
      <h3 class="panel-title"><i class="fas fa-exclamation-triangle"></i> Top Skill Gaps & Recommendations</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Skill</th>
            <th>Category</th>
            <th>Avg. Level</th>
            <th>Target</th>
            <th>Gap</th>
            <th>Affected</th>
            <th>Recommended Training</th>
            <th>Est. Cost</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            ${topGaps.map(g => {
              const gapVal = g.gap != null ? Number(g.gap) : (g.target_level - g.avg_level);
              return `
                <tr>
                  <td><strong>${esc(g.skill_name)}</strong></td>
                  <td><span class="chip chip-neutral">${esc(g.category || '—')}</span></td>
                  <td>${Number(g.avg_level || 0).toFixed(1)}</td>
                  <td>${g.target_level || 3}</td>
                  <td><span class="${gapVal >= 2 ? 'status-rejected' : gapVal >= 1 ? 'status-pending' : 'status-active'}">
                    ${gapVal > 0 ? `-${gapVal}` : 'At target'}
                  </span></td>
                  <td>${g.affected_trainees || 0}</td>
                  <td>${esc(g.recommendation || g.recommended_programme || 'Add targeted programme')}</td>
                  <td>${g.estimated_cost != null ? fmtCur(g.estimated_cost) : '—'}</td>
                  <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs" data-action="view-gap-detail"
                            data-id="${esc(g.id || g.skill_id)}" title="Details">View</button>
                    ${g.recommended_programme_id ? `
                      <button class="btn btn-primary btn-xs" data-action="assign-training"
                              data-id="${esc(g.recommended_programme_id)}"
                              data-skill="${esc(g.skill_id)}"
                              title="Assign training">
                        <i class="fas fa-bullseye"></i> Assign
                      </button>` : ''}
                  </td>
                </tr>`;
            }).join('') ||
              '<tr><td colspan="9" class="empty-row">No gaps identified</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Gap closure targets -->
    ${closureTargets.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-bullseye"></i> Gap Closure Targets</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Skill / Category</th><th>Department</th>
              <th>Target Date</th><th>Current</th><th>Goal</th>
              <th>Progress</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${closureTargets.map(t => {
                const cur = Number(t.current_avg) || 0;
                const goal = Number(t.goal_avg) || 3;
                const pct = goal ? Math.min(100, Math.round((cur / goal) * 100)) : 0;
                const onTrack = pct >= 75;
                return `
                  <tr>
                    <td><strong>${esc(t.skill_name || t.category_name || '—')}</strong></td>
                    <td>${esc(t.department || 'All')}</td>
                    <td>${fmtDate(t.target_date)}</td>
                    <td>${cur.toFixed(1)}</td>
                    <td>${goal.toFixed(1)}</td>
                    <td>
                      ${renderMiniBar(pct, onTrack ? '#22c55e' : '#eab308')}
                      ${pct}%
                    </td>
                    <td><span class="${onTrack ? 'status-active' : 'status-pending'}">
                      ${onTrack ? 'On track' : 'At risk'}
                    </span></td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>` : ''}

    <!-- Forecast + cost -->
    ${(forecast || costData) ? `
      <section class="panel-charts">
        ${forecast ? `
          <div class="chart-card">
            <h3 class="panel-title">Workforce Capability Forecast</h3>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
              <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--surface-2);border-radius:6px">
                <span>Current capability index</span>
                <strong>${Number(forecast.current_index || 0).toFixed(1)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--surface-2);border-radius:6px">
                <span>Projected (6 months)</span>
                <strong>${Number(forecast.projected_6m || 0).toFixed(1)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--surface-2);border-radius:6px">
                <span>Projected (12 months)</span>
                <strong>${Number(forecast.projected_12m || 0).toFixed(1)}</strong>
              </div>
              ${forecast.assumptions ? `
                <p style="font-size:.78rem;color:var(--text-muted);margin-top:6px">
                  <i class="fas fa-info-circle"></i> ${esc(forecast.assumptions)}
                </p>` : ''}
            </div>
          </div>` : ''}
        ${costData ? `
          <div class="chart-card">
            <h3 class="panel-title">Skills Development Costs</h3>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
              <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--surface-2);border-radius:6px">
                <span>Total estimated cost</span>
                <strong>${fmtCur(costData.total_estimated || 0)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--surface-2);border-radius:6px">
                <span>Committed</span>
                <strong>${fmtCur(costData.committed || 0)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--surface-2);border-radius:6px">
                <span>Unbudgeted gap</span>
                <strong style="color:var(--danger)">${fmtCur(costData.unbudgeted || 0)}</strong>
              </div>
            </div>
          </div>` : ''}
      </section>` : ''}
  `;
}
