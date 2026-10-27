/* ============================================================
   ExpertHub 2.0 — Compliance
   Regulatory requirements register, mandatory training schedules,
   evidence attachments, audit checklists, non-compliance escalation,
   corrective actions, expiry reminders.
   ============================================================ */

function instCompliance() {
  const rules = S.institutionComplianceRules || [];
  const certs = S.institutionCertificates || [];
  const runs  = S.complianceRuns || [];
  const escalations = S.complianceEscalations || [];
  const correctiveActions = S.correctiveActions || [];
  const audits = S.complianceAudits || [];

  const f = S.filters.compliance = S.filters.compliance || {};
  const ruleCategory = f.category || '';

  const now = new Date();
  const expired = certs.filter(c =>
    c.expires_at && new Date(c.expires_at) < now && !c.revoked
  );
  const expiring30 = certs.filter(c => {
    if (!c.expires_at || c.revoked) return false;
    const days = (new Date(c.expires_at) - now) / 86400000;
    return days > 0 && days < 30;
  });

  let filteredRules = rules.slice();
  if (ruleCategory) filteredRules = filteredRules.filter(r => r.category === ruleCategory);

  const categories = uniqueBy(
    rules.map(r => r.category).filter(Boolean).map(c => ({ id: c, label: capitalize(c) })),
    'id'
  );

  const canWrite = hasInstitutionPermission('compliance:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Compliance</span></div>
    <section class="page-header">
      <h1 class="page-title">Compliance Reporting Suite</h1>
      <div class="page-actions">
        ${categories.length ? `
          <select id="compliance-category" class="form-select" style="max-width:180px">
            <option value="">All categories</option>
            ${categories.map(c =>
              `<option value="${c.id}" ${ruleCategory === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
          </select>` : ''}
        <button class="btn btn-secondary" data-action="export-compliance-report">
          <i class="fas fa-download"></i> Export</button>
        ${canWrite ? `
          <button class="btn btn-secondary" data-action="create-compliance-rule">
            <i class="fas fa-plus"></i> New Rule</button>
          <button class="btn btn-primary" data-action="run-compliance-check">
            <i class="fas fa-play"></i> Run Compliance Check</button>` : ''}
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Active Rules', rules.filter(r => r.active).length, '', 'fa-shield-halved', 'blue')}
      ${statCard('Expired Certificates', expired.length, '', 'fa-exclamation-triangle', expired.length > 0 ? 'red' : 'green')}
      ${statCard('Expiring in 30 Days', expiring30.length, '', 'fa-clock', 'yellow')}
      ${statCard('Open Escalations', escalations.filter(e => e.status !== 'resolved').length, '', 'fa-bell', 'red')}
    </section>

    <!-- Compliance rules register -->
    <section class="panel">
      <h3 class="panel-title"><i class="fas fa-list-check"></i> Regulatory Requirements</h3>
      ${filteredRules.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Title</th><th>Category</th><th>Programme</th>
              <th>Target</th><th>Recurrence</th><th>Mandatory</th>
              <th>Evidence</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${filteredRules.map(r => `
                <tr>
                  <td><strong>${esc(r.title)}</strong></td>
                  <td>${r.category ? `<span class="chip chip-neutral">${esc(r.category)}</span>` : '—'}</td>
                  <td>${esc(r.programme_title || '—')}</td>
                  <td>${esc(r.target_role || r.target_department || 'All')}</td>
                  <td>Every ${r.recurrence_months} month${r.recurrence_months === 1 ? '' : 's'}</td>
                  <td>${r.mandatory
                    ? '<span class="chip chip-blue">Mandatory</span>'
                    : '<span class="chip chip-neutral">Optional</span>'}</td>
                  <td>${safeNum(r.evidence_count)}
                    ${canWrite ? `
                      <button class="btn btn-secondary btn-xs" data-action="manage-evidence"
                              data-id="${r.id}" title="Manage evidence">
                        <i class="fas fa-paperclip"></i>
                      </button>` : ''}
                  </td>
                  <td><span class="${r.active ? 'status-active' : 'status-archived'}">
                    ${r.active ? 'Active' : 'Inactive'}</span></td>
                  <td class="actions-cell" style="white-space:nowrap">
                    ${canWrite ? `
                      <button class="btn btn-info btn-xs" data-action="edit-compliance-rule" data-id="${r.id}">
                        Edit</button>
                      <button class="btn btn-secondary btn-xs" data-action="view-rule-history"
                              data-id="${r.id}" title="Run history">
                        <i class="fas fa-clock-rotate-left"></i>
                      </button>
                      <button class="btn btn-danger btn-xs" data-action="delete-compliance-rule" data-id="${r.id}">
                        Delete</button>
                    ` : '<span class="text-muted">—</span>'}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<p class="empty-row">No compliance rules defined yet</p>'}
    </section>

    <!-- Audits & checklists -->
    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <h3 class="panel-title" style="margin:0"><i class="fas fa-clipboard-check"></i> Audit Checklists</h3>
        ${canWrite ? `
          <button class="btn btn-secondary btn-sm" data-action="new-audit">
            <i class="fas fa-plus"></i> New Audit</button>` : ''}
      </div>
      ${audits.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Audit</th><th>Type</th><th>Status</th>
              <th>Checklist</th><th>Findings</th><th>Due</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${audits.map(a => {
                const total = safeNum(a.total_items);
                const passed = safeNum(a.passed_items);
                const pct = total ? Math.round((passed / total) * 100) : 0;
                return `
                  <tr>
                    <td>${esc(a.title)}</td>
                    <td><span class="chip chip-neutral">${esc(a.type || 'internal')}</span></td>
                    <td><span class="${statusClass(a.status || 'in_progress')}">${esc((a.status || '').replace(/_/g, ' '))}</span></td>
                    <td>
                      ${passed}/${total}
                      ${renderMiniBar(pct, pct >= 90 ? '#22c55e' : pct >= 70 ? '#eab308' : '#dc2626')}
                    </td>
                    <td>${safeNum(a.findings_count)}</td>
                    <td>${fmtDate(a.due_date)}</td>
                    <td class="actions-cell">
                      <button class="btn btn-secondary btn-xs" data-action="view-audit" data-id="${a.id}">
                        View</button>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>` : '<p class="empty-row">No audits scheduled yet</p>'}
    </section>

    <!-- Escalations & corrective actions -->
    ${escalations.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-arrow-up-right-from-square"></i> Non-Compliance Escalations</h3>
        <ul class="list-stack">
          ${escalations.map(e => `
            <li class="list-row" style="border-left:3px solid ${riskLevelColour(e.severity || 'medium')}">
              <div class="list-row-main">
                <span class="list-row-title">${esc(e.title || 'Escalation')}</span>
                <span class="list-row-sub">
                  ${fmtDT(e.created_at)} · ${esc(e.rule_title || '')}
                  ${e.assigned_to_name ? ` · Assigned to ${esc(e.assigned_to_name)}` : ''}
                </span>
              </div>
              <div style="display:flex;gap:6px">
                <span class="${statusClass(e.status || 'open')}">${esc(e.status || 'open')}</span>
                ${canWrite ? `
                  <button class="btn btn-secondary btn-xs" data-action="view-escalation" data-id="${e.id}">
                    View</button>` : ''}
              </div>
            </li>`).join('')}
        </ul>
      </section>` : ''}

    ${correctiveActions.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-screwdriver-wrench"></i> Corrective Actions</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Action</th><th>Related To</th><th>Owner</th>
              <th>Due</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${correctiveActions.map(c => `
                <tr>
                  <td>${esc(c.title)}</td>
                  <td>${esc(c.source || '—')}</td>
                  <td>${esc(c.owner_name || '—')}</td>
                  <td>${fmtDate(c.due_date)}</td>
                  <td><span class="${statusClass(c.status || 'open')}">${esc((c.status || '').replace(/_/g, ' '))}</span></td>
                  <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs" data-action="view-corrective-action" data-id="${c.id}">
                      View</button>
                    ${canWrite && c.status !== 'completed' ? `
                      <button class="btn btn-success btn-xs" data-action="close-corrective-action" data-id="${c.id}">
                        Close</button>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>` : ''}

    <!-- Recent compliance runs -->
    ${runs.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-play-circle"></i> Recent Compliance Runs</h3>
        <ul class="list-stack">
          ${runs.slice(0, 10).map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.run_name || 'Compliance check')}</span>
                <span class="list-row-sub">
                  ${fmtDT(r.started_at)} · ${safeNum(r.findings_count)} finding${safeNum(r.findings_count) === 1 ? '' : 's'}
                </span>
              </div>
              <span class="${r.status === 'passed' ? 'status-active' : 'status-rejected'}">
                ${esc(r.status || '—')}
              </span>
            </li>`).join('')}
        </ul>
      </section>` : ''}
  `;
}
