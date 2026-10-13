/* ============================================================
   dashboards/institution/assessments.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const rows = S.assessments.map(a => `
      <tr>
        <td>${EH.Fmt.esc(a.title || '')}</td>
        <td><span class="chip chip-neutral">${EH.Fmt.esc(a.type || '')}</span></td>
        <td>${EH.Fmt.esc(a.cohort_name || '-')}</td>
        <td>${a.weight || 0}%</td>
        <td>${EH.Dates.fmtDate(a.due_date)}</td>
        <td><span class="${EH.Fmt.statusClass(a.status)}">${EH.Fmt.esc(a.status || '')}</span></td>
        <td class="actions-cell">
          <button class="btn btn-secondary btn-xs" data-action="view-assessment" data-id="${a.id}">View</button>
          <button class="btn btn-info btn-xs" data-action="grade-assessment" data-id="${a.id}">Grade</button>
          <button class="btn btn-danger btn-xs" data-action="delete-assessment" data-id="${a.id}">Delete</button>
        </td>
      </tr>`);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Assessments' }])}
      ${EH.Layout.pageHeader('Assessments', {
        actions: `<button class="btn btn-primary" data-action="schedule-assessment">
          <i class="fas fa-plus"></i> New Assessment</button>`,
      })}
      <section class="panel">
        ${EH.Layout.table(
          ['Title', 'Type', 'Cohort', 'Weight', 'Due', 'Status', 'Actions'],
          rows,
        )}
      </section>`;
  }

  EH.InstAssessments = { render };
})(window);
