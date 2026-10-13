/* ============================================================
   dashboards/institution/cohorts.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const rows = S.cohorts.map(c => `
      <tr>
        <td>
          <div class="user-name">${EH.Fmt.esc(c.name || '')}</div>
          ${c.location ? `<div class="user-email">${EH.Fmt.esc(c.location)}</div>` : ''}
        </td>
        <td>${EH.Fmt.esc(c.programme_title || '-')}</td>
        <td>${EH.Fmt.esc(c.instructor_name || 'Unassigned')}</td>
        <td>${EH.Dates.fmtDate(c.start_date)} to ${EH.Dates.fmtDate(c.end_date)}</td>
        <td>
          <div class="progress-bar" style="width:100px">
            <span style="width:${c.capacity ? Math.min(100, (c.trainee_count / c.capacity) * 100) : 0}%"></span>
          </div>
          <small>${c.trainee_count || 0} of ${c.capacity || 0}</small>
        </td>
        <td><span class="${EH.Fmt.statusClass(c.status)}">${EH.Fmt.esc(c.status || '')}</span></td>
        <td class="actions-cell">
          <button class="btn btn-secondary btn-xs" data-action="view-cohort" data-id="${c.id}">View</button>
          <button class="btn btn-info btn-xs" data-action="edit-cohort" data-id="${c.id}">Edit</button>
          <button class="btn btn-primary btn-xs" data-action="cohort-waitlist" data-id="${c.id}">Waitlist</button>
          <button class="btn btn-danger btn-xs" data-action="delete-cohort" data-id="${c.id}">Delete</button>
        </td>
      </tr>`);

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Cohorts' }])}
      ${EH.Layout.pageHeader('Cohorts & Batches', {
        actions: `<button class="btn btn-primary" data-action="create-cohort">
          <i class="fas fa-plus"></i> New Cohort</button>`,
      })}
      <section class="panel">
        ${EH.Layout.table(
          ['Cohort', 'Programme', 'Instructor', 'Dates', 'Capacity', 'Status', 'Actions'],
          rows,
        )}
      </section>`;
  }

  EH.InstCohorts = { render };
})(window);
