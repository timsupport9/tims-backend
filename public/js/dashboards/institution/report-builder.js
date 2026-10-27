/* ============================================================
   ExpertHub 2.0 — Custom Report Builder
   Drag-drop designer, field selection, saved templates, filters,
   calculated columns, chart generation, permissions, distribution.
   ============================================================ */

function instReportBuilder() {
  const defs = S.savedReportDefinitions || [];
  const fieldLib = CONFIG.REPORT_FIELD_LIBRARY;
  const canWrite = hasInstitutionPermission('reports:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Report Builder</span></div>
    <section class="page-header">
      <h1 class="page-title">Custom Report Builder</h1>
      <div class="page-actions">
        ${canWrite ? `
          <button class="btn btn-primary" data-action="new-report-definition">
            <i class="fas fa-plus"></i> New Report</button>` : ''}
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-table-columns"></i>
      <div>Build custom reports by picking data sources, filtering, choosing columns
        and selecting aggregations. Save for reuse or schedule distribution.</div>
    </div>

    <section class="panel">
      <h3 class="panel-title">Saved Report Definitions</h3>
      ${defs.length ? `
        <ul class="list-stack">
          ${defs.map(d => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(d.name)}</span>
                <span class="list-row-sub">
                  ${esc(d.data_source)} · ${(d.columns || []).length} columns
                  · ${fmtDate(d.created_at)}
                  ${d.scheduled ? ` · <span class="chip chip-blue" style="font-size:.65rem">Scheduled</span>` : ''}
                </span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-primary btn-xs" data-action="run-saved-report" data-id="${d.id}">
                  <i class="fas fa-play"></i> Run</button>
                ${canWrite ? `
                  <button class="btn btn-secondary btn-xs" data-action="edit-report-definition" data-id="${d.id}">
                    <i class="fas fa-pen"></i></button>
                  <button class="btn btn-secondary btn-xs" data-action="schedule-report-definition"
                          data-id="${d.id}" title="Schedule"><i class="fas fa-calendar-plus"></i></button>
                  <button class="btn btn-danger btn-xs" data-action="delete-report-definition" data-id="${d.id}">
                    <i class="fas fa-trash"></i></button>` : ''}
              </div>
            </li>`).join('')}
        </ul>` : '<p class="empty-row">No custom reports saved yet</p>'}
    </section>

    <section class="panel">
      <h3 class="panel-title">Available Fields</h3>
      <div class="field-library">
        ${Object.entries(fieldLib).map(([source, fields]) => `
          <div class="field-library-group">
            <h5>${esc(source)}</h5>
            <ul>${fields.map(f => `<li><code class="code">${esc(f)}</code></li>`).join('')}</ul>
          </div>`).join('')}
      </div>
    </section>
  `;
}
