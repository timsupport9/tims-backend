/* ============================================================
   Institution — Skills Matrix
   ============================================================ */
function instSkills() {
  const m = S.institutionSkillsMatrix || { skills: [], matrix: [] };
  const levelColours = CONFIG.SKILL_LEVEL_COLOURS;
  const levelText    = CONFIG.SKILL_LEVELS;

  if (!m.skills.length) {
    return `
      <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Skills Matrix</span></div>
      <section class="page-header">
        <h1 class="page-title">Skills and Competencies</h1>
        <button class="btn btn-primary" data-action="manage-skills">
          <i class="fas fa-plus"></i> Add First Skill</button>
      </section>
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-puzzle-piece"></i>
          <h3>No skills defined yet</h3>
          <p>Start by adding the competencies you want to track across your workforce.</p>
          <button class="btn btn-primary" data-action="manage-skills">
            <i class="fas fa-plus"></i> Add First Skill</button>
        </div>
      </section>`;
  }

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Skills Matrix</span></div>
    <section class="page-header">
      <h1 class="page-title">Skills and Competencies</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="manage-skills">
          <i class="fas fa-cog"></i> Manage Skills</button>
        <button class="btn btn-primary" data-action="export-skills-matrix">
          <i class="fas fa-download"></i> Export Matrix</button>
      </div>
    </section>

    <section class="panel">
      <p class="form-hint" style="margin-bottom:16px">
        Click any cell to cycle through proficiency levels 0 to 5. Changes save automatically.
      </p>

      <div style="overflow-x:auto">
        <table class="skills-matrix">
          <thead><tr>
            <th style="min-width:200px;position:sticky;left:0;background:var(--surface);z-index:2">Trainee</th>
            ${m.skills.map(s => `
              <th style="min-width:100px;text-align:center" title="${esc(s.description || '')}">
                <div style="font-size:.7rem;color:var(--text-muted)">${esc(s.category || '')}</div>
                <div style="font-weight:600">${esc(s.name)}</div>
              </th>`).join('')}
          </tr></thead>
          <tbody>
            ${m.matrix.map(row => `
              <tr>
                <td style="position:sticky;left:0;background:var(--surface);z-index:1">
                  <div class="user-name">${esc(row.trainee.name)}</div>
                  <div class="user-email">${esc(row.trainee.department || '')}</div>
                </td>
                ${m.skills.map(s => {
                  const lvl = row.levels[s.id] || 0;
                  return `<td class="skills-cell"
                    data-trainee="${row.trainee.id}"
                    data-skill="${s.id}"
                    data-level="${lvl}"
                    title="${levelText[lvl]}">
                    <span class="skill-level-dot"
                      style="background:${levelColours[lvl]};color:${lvl >= 4 ? '#fff' : '#374151'}">
                      ${lvl}</span>
                  </td>`;
                }).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="skills-legend">
        <strong>Legend:</strong>
        ${levelColours.map((c, i) => `
          <span class="skills-legend-item">
            <span class="skills-legend-swatch" style="background:${c}"></span>
            ${i} - ${levelText[i]}</span>`).join('')}
      </div>
    </section>
  `;
}
