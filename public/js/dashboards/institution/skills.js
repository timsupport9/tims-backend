/* ============================================================
   dashboards/institution/skills.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;
  const CONFIG = EH.CONFIG;

  function render() {
    const m = S.institutionSkillsMatrix || { skills: [], matrix: [] };
    const colours = CONFIG.SKILL_LEVEL_COLOURS;
    const levels  = CONFIG.SKILL_LEVELS;

    if (!m.skills.length) {
      return `
        ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Skills Matrix' }])}
        ${EH.Layout.pageHeader('Skills & Competencies', {
          actions: `<button class="btn btn-primary" data-action="manage-skills">
            <i class="fas fa-plus"></i> Add First Skill</button>`,
        })}
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
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Skills Matrix' }])}
      ${EH.Layout.pageHeader('Skills & Competencies', {
        actions: `
          <button class="btn btn-secondary" data-action="manage-skills">
            <i class="fas fa-cog"></i> Manage Skills</button>
          <button class="btn btn-primary" data-action="export-skills-matrix">
            <i class="fas fa-download"></i> Export Matrix</button>`,
      })}

      <section class="panel">
        <p class="form-hint" style="margin-bottom:16px">
          Click any cell to cycle through proficiency levels 0 to 5. Changes save automatically.
        </p>

        <div style="overflow-x:auto">
          <table class="skills-matrix">
            <thead>
              <tr>
                <th style="min-width:200px;position:sticky;left:0;background:var(--surface);z-index:2">
                  Trainee
                </th>
                ${m.skills.map(s => `
                  <th style="min-width:100px;text-align:center" title="${EH.Fmt.esc(s.description || '')}">
                    <div style="font-size:.7rem;color:var(--text-muted)">${EH.Fmt.esc(s.category || '')}</div>
                    <div style="font-weight:600">${EH.Fmt.esc(s.name)}</div>
                  </th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${m.matrix.map(row => `
                <tr>
                  <td style="position:sticky;left:0;background:var(--surface);z-index:1">
                    <div class="user-name">${EH.Fmt.esc(row.trainee.name)}</div>
                    <div class="user-email">${EH.Fmt.esc(row.trainee.department || '')}</div>
                  </td>
                  ${m.skills.map(s => {
                    const lvl = row.levels[s.id] || 0;
                    return `
                      <td class="skills-cell"
                          data-trainee="${row.trainee.id}"
                          data-skill="${s.id}"
                          data-level="${lvl}"
                          title="${levels[lvl]}">
                        <span class="skill-level-dot"
                              style="background:${colours[lvl]};color:${lvl >= 4 ? '#fff' : '#374151'}">
                          ${lvl}
                        </span>
                      </td>`;
                  }).join('')}
                </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="skills-legend">
          <strong>Legend:</strong>
          ${colours.map((c, i) => `
            <span class="skills-legend-item">
              <span class="skills-legend-swatch" style="background:${c}"></span>
              ${i} - ${levels[i]}
            </span>`).join('')}
        </div>
      </section>`;
  }

  EH.InstSkills = { render };
})(window);
