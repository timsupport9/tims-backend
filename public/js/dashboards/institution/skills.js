/* ============================================================
   ExpertHub 2.0 — Skills Matrix
   Custom competency frameworks, proficiency assessments, skill
   evidence, assessor approvals, endorsements, development
   targets, role-based skills requirements.
   ============================================================ */

function instSkills() {
  const m = S.institutionSkillsMatrix || { skills: [], matrix: [] };
  const frameworks = S.skillFrameworks || [];
  const roleRequirements = S.roleSkillRequirements || [];

  const f = S.filters.skills = S.filters.skills || {};
  const frameworkFilter = f.framework || '';

  const levelColours = CONFIG.SKILL_LEVEL_COLOURS;
  const levelText    = CONFIG.SKILL_LEVELS;
  const canWrite = hasInstitutionPermission('trainees:write');

  /* Apply framework filter to skills */
  let filteredSkills = m.skills || [];
  if (frameworkFilter) {
    filteredSkills = filteredSkills.filter(s => s.framework_id === frameworkFilter);
  }

  if (!m.skills.length) {
    return `
      <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Skills Matrix</span></div>
      <section class="page-header">
        <h1 class="page-title">Skills and Competencies</h1>
        ${canWrite ? `
          <button class="btn btn-primary" data-action="manage-skills">
            <i class="fas fa-plus"></i> Add First Skill</button>` : ''}
      </section>
      <section class="panel">
        ${renderEmptyState({
          icon: 'fa-puzzle-piece',
          title: 'No skills defined yet',
          description: 'Start by adding the competencies you want to track across your workforce.',
          actionLabel: canWrite ? '+ Add First Skill' : '',
          actionAttrs: canWrite ? 'data-action="manage-skills"' : '',
        })}
      </section>`;
  }

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Skills Matrix</span></div>
    <section class="page-header">
      <h1 class="page-title">Skills and Competencies</h1>
      <div class="page-actions">
        ${frameworks.length ? `
          <select id="skills-framework" class="form-select" style="max-width:200px">
            <option value="">All frameworks</option>
            ${frameworks.map(fw =>
              `<option value="${fw.id}" ${String(frameworkFilter) === String(fw.id) ? 'selected' : ''}>${esc(fw.name)}</option>`).join('')}
          </select>` : ''}
        ${canWrite ? `
          <button class="btn btn-secondary" data-action="manage-frameworks">
            <i class="fas fa-sitemap"></i> Frameworks</button>
          <button class="btn btn-secondary" data-action="manage-role-requirements">
            <i class="fas fa-user-tie"></i> Role Requirements</button>
          <button class="btn btn-secondary" data-action="manage-skills">
            <i class="fas fa-cog"></i> Manage Skills</button>` : ''}
        <button class="btn btn-primary" data-action="export-skills-matrix">
          <i class="fas fa-download"></i> Export Matrix</button>
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Skills Tracked', filteredSkills.length, '', 'fa-list-check', 'blue')}
      ${statCard('Frameworks', frameworks.length, '', 'fa-sitemap', 'purple')}
      ${statCard('Role Requirements', roleRequirements.length, '', 'fa-user-tie', 'green')}
      ${statCard('Trainees Covered', (m.matrix || []).length, '', 'fa-users', 'yellow')}
    </section>

    <!-- Role requirements summary -->
    ${roleRequirements.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-user-tie"></i> Role-Based Skill Requirements</h3>
        <p class="form-hint" style="margin-bottom:10px">
          Target levels enforced when computing skills-gap analysis and recommending development paths.
        </p>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Role</th><th>Department</th><th>Required Skills</th>
              <th>Critical Skills</th><th>Last Updated</th>
            </tr></thead>
            <tbody>
              ${roleRequirements.map(r => `
                <tr>
                  <td><strong>${esc(r.role_title || r.role || '—')}</strong></td>
                  <td>${esc(r.department || '—')}</td>
                  <td>${(r.skills || []).length} skill${(r.skills || []).length === 1 ? '' : 's'}</td>
                  <td>${(r.critical_skills || []).length}</td>
                  <td>${fmtDate(r.updated_at || r.created_at)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>` : ''}

    <!-- Skills matrix -->
    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <h3 class="panel-title" style="margin:0">Proficiency Matrix</h3>
        ${canWrite ? `
          <button class="btn btn-secondary btn-sm" data-action="bulk-assess-skills">
            <i class="fas fa-clipboard-check"></i> Bulk Assess</button>` : ''}
      </div>
      <p class="form-hint" style="margin-bottom:16px">
        Click any cell to cycle proficiency 0–5. Assessor approval and evidence are tracked per level.
        ${canWrite ? 'Changes save automatically.' : 'Read-only mode — request <code>trainees:write</code> to edit.'}
      </p>

      <div style="overflow-x:auto">
        <table class="skills-matrix">
          <thead>
            <tr>
              <th style="min-width:220px;position:sticky;left:0;background:var(--surface);z-index:2">Trainee</th>
              ${filteredSkills.map(s => `
                <th style="min-width:110px;text-align:center" title="${esc(s.description || '')}">
                  <div style="font-size:.7rem;color:var(--text-muted)">${esc(s.category || '')}</div>
                  <div style="font-weight:600">${esc(s.name)}</div>
                  ${s.framework_name ? `<div style="font-size:.65rem;color:var(--text-muted)">${esc(s.framework_name)}</div>` : ''}
                </th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${(m.matrix || []).map(row => `
              <tr>
                <td style="position:sticky;left:0;background:var(--surface);z-index:1">
                  <div class="user-name">${esc(row.trainee.name)}</div>
                  <div class="user-email">${esc(row.trainee.department || '')}</div>
                  ${row.trainee.role_title ? `<div style="font-size:.7rem;color:var(--text-muted)">${esc(row.trainee.role_title)}</div>` : ''}
                </td>
                ${filteredSkills.map(s => {
                  const lvl = row.levels[s.id] || 0;
                  const evidence = row.evidence?.[s.id] || null;
                  const approved = row.approved?.[s.id] || false;
                  const endorsed = row.endorsed?.[s.id] || false;
                  return `
                    <td class="skills-cell"
                        data-trainee="${row.trainee.id}"
                        data-skill="${s.id}"
                        data-level="${lvl}"
                        ${!canWrite ? 'data-readonly="1"' : ''}
                        title="${levelText[lvl]}${evidence ? ` · Evidence attached` : ''}${approved ? ` · Assessor-approved` : ''}${endorsed ? ` · Endorsed` : ''}">
                      <span class="skill-level-dot"
                        style="background:${levelColours[lvl]};color:${lvl >= 4 ? '#fff' : '#374151'}">
                        ${lvl}</span>
                      ${evidence ? `<span class="chip chip-neutral" style="font-size:.55rem;margin-top:2px;display:block">📎</span>` : ''}
                      ${approved ? `<span class="chip chip-green" style="font-size:.55rem;margin-top:2px;display:block">✓</span>` : ''}
                      ${endorsed ? `<span class="chip chip-blue" style="font-size:.55rem;margin-top:2px;display:block">⭐</span>` : ''}
                    </td>`;
                }).join('')}
              </tr>`).join('') || '<tr><td colspan="100%" class="empty-row">No trainees with skill records</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="skills-legend">
        <strong>Legend:</strong>
        ${levelColours.map((c, i) => `
          <span class="skills-legend-item">
            <span class="skills-legend-swatch" style="background:${c}"></span>
            ${i} - ${levelText[i]}
          </span>`).join('')}
        <span class="skills-legend-item"><span class="chip chip-green" style="font-size:.6rem">✓</span> Assessor-approved</span>
        <span class="skills-legend-item"><span class="chip chip-blue" style="font-size:.6rem">⭐</span> Endorsed</span>
      </div>
    </section>
  `;
}
