/* ============================================================
   ExpertHub 2.0 — Succession Planning
   Critical-role identification, readiness assessment, development
   plans, talent pools, mentoring, succession scenarios, documented
   review decisions.
   ============================================================ */

function instSuccession() {
  const m = S.successionMatrix || {
    boxes: CONFIG.SUCCESSION_BOXES,
    trainees: [],
    assignments: [],
  };
  const boxes = CONFIG.SUCCESSION_BOXES;
  const assignmentMap = {};
  (m.assignments || []).forEach(a => {
    const key = `${a.performance}-${a.potential}`;
    (assignmentMap[key] = assignmentMap[key] || []).push(a);
  });

  const criticalRoles = S.criticalRoles || [];
  const talentPools = S.talentPools || [];
  const mentoringPairs = S.mentoringPairs || [];
  const reviewDecisions = S.successionReviewDecisions || [];

  const canWrite = hasInstitutionPermission('trainees:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Succession Planning</span></div>
    <section class="page-header">
      <h1 class="page-title">Succession Planning (9-Box Grid)</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-succession">
          <i class="fas fa-download"></i> Export</button>
        ${canWrite ? `
          <button class="btn btn-secondary" data-action="manage-critical-roles">
            <i class="fas fa-user-tie"></i> Critical Roles</button>
          <button class="btn btn-secondary" data-action="manage-talent-pools">
            <i class="fas fa-users-rectangle"></i> Talent Pools</button>
          <button class="btn btn-secondary" data-action="manage-mentoring">
            <i class="fas fa-hand-holding-heart"></i> Mentoring</button>
          <button class="btn btn-primary" data-action="assign-succession">
            <i class="fas fa-plus"></i> Assign Trainee</button>` : ''}
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-sitemap"></i>
      <div>
        Map high-performers and high-potentials to prioritize development, retention and promotion.
        Every review decision is documented with rationale for audit purposes.
      </div>
    </div>

    <!-- 9-box grid -->
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
                    <div class="nine-box-person" draggable="true"
                         data-trainee="${p.trainee_id}"
                         data-action="succession-detail"
                         data-id="${p.trainee_id}">
                      <img class="user-avatar-sm" src="${avatar({ name: p.trainee_name })}" alt="" />
                      <span>${esc(p.trainee_name)}</span>
                      ${p.readiness_level
                        ? `<span class="chip chip-${p.readiness_level === 'ready_now' ? 'green' : p.readiness_level === 'ready_1_2_years' ? 'yellow' : 'neutral'}"
                                 style="font-size:.55rem;margin-left:4px">
                            ${esc(p.readiness_level.replace(/_/g, ' '))}
                          </span>`
                        : ''}
                    </div>`).join('') || '<span class="nine-box-empty">No one</span>'}
                </div>
              </div>`;
          }).join('')}
        `).join('')}
      </div>
    </section>

    <!-- Critical roles & readiness -->
    ${criticalRoles.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-user-tie"></i> Critical Roles & Bench Strength</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Role</th><th>Department</th><th>Incumbent</th>
              <th>Risk</th><th>Bench Strength</th><th>Ready Now</th>
              <th>Ready 1-2y</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${criticalRoles.map(r => `
                <tr>
                  <td><strong>${esc(r.title)}</strong></td>
                  <td>${esc(r.department || '—')}</td>
                  <td>${esc(r.incumbent_name || 'Vacant')}</td>
                  <td><span class="chip"
                    style="background:${riskLevelColour(r.risk_level || 'medium')}20;color:${riskLevelColour(r.risk_level || 'medium')};border:1px solid ${riskLevelColour(r.risk_level || 'medium')}50">
                    ${esc(r.risk_level || 'medium')}
                  </span></td>
                  <td>${safeNum(r.bench_strength)}</td>
                  <td>${safeNum(r.ready_now)}</td>
                  <td>${safeNum(r.ready_1_2_years)}</td>
                  <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs" data-action="view-critical-role"
                            data-id="${r.id}">View</button>
                    ${canWrite ? `
                      <button class="btn btn-secondary btn-xs" data-action="plan-succession-scenario"
                              data-id="${r.id}" title="Succession scenario">
                        <i class="fas fa-diagram-project"></i>
                      </button>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>` : ''}

    <!-- Talent pools -->
    ${talentPools.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-users-rectangle"></i> Talent Pools</h3>
        <div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">
          ${talentPools.map(pool => `
            <div class="dashboard-card" style="padding:14px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong>${esc(pool.name)}</strong>
                <span class="chip chip-neutral">${safeNum(pool.member_count)}</span>
              </div>
              <p style="font-size:.78rem;color:var(--text-muted);margin-top:6px">
                ${esc(pool.description || '')}
              </p>
              <button class="btn btn-secondary btn-sm btn-block" style="margin-top:8px"
                      data-action="view-talent-pool" data-id="${pool.id}">
                View Members</button>
            </div>`).join('')}
        </div>
      </section>` : ''}

    <!-- Mentoring -->
    ${mentoringPairs.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-hand-holding-heart"></i> Mentoring Assignments</h3>
        <ul class="list-stack">
          ${mentoringPairs.slice(0, 8).map(p => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">
                  ${esc(p.mentee_name || 'Mentee')} ← ${esc(p.mentor_name || 'Mentor')}
                </span>
                <span class="list-row-sub">
                  ${esc(p.focus_area || 'Development')}
                  · ${fmtDate(p.start_date)} → ${p.end_date ? fmtDate(p.end_date) : 'ongoing'}
                  · ${safeNum(p.sessions_count)} session${safeNum(p.sessions_count) === 1 ? '' : 's'}
                </span>
              </div>
              <button class="btn btn-secondary btn-xs" data-action="view-mentoring"
                      data-id="${p.id}">View</button>
            </li>`).join('')}
        </ul>
      </section>` : ''}

    <!-- Documented review decisions -->
    ${reviewDecisions.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-clipboard-list"></i> Documented Review Decisions</h3>
        <p class="form-hint" style="margin-bottom:10px">
          Succession review decisions are logged with actor, rationale and effective date for audit.
        </p>
        <ul class="list-stack">
          ${reviewDecisions.slice(0, 10).map(d => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">
                  ${esc(d.trainee_name || '—')} · ${esc(d.decision_type || 'Review')}
                </span>
                <span class="list-row-sub">
                  ${fmtDT(d.decided_at)} · by ${esc(d.decided_by_name || '—')}
                </span>
                ${d.rationale ? `
                  <span class="list-row-sub" style="color:var(--text-muted);margin-top:2px">
                    ${esc(truncate(d.rationale, 160))}
                  </span>` : ''}
              </div>
              <button class="btn btn-secondary btn-xs" data-action="view-review-decision"
                      data-id="${d.id}">View</button>
            </li>`).join('')}
        </ul>
      </section>` : ''}

    <!-- Box descriptions -->
    <section class="panel">
      <h3 class="panel-title">Box Descriptions</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Box</th><th>Performance</th><th>Potential</th><th>Recommended Action</th>
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
