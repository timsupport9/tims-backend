/* ============================================================
   dashboards/expert/availability.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const map = {};
    (S.availability || []).forEach(a => { map[a.day_of_week] = a; });

    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Availability' }])}
      ${EH.Layout.pageHeader('Availability Schedule')}

      <section class="panel">
        <h3 class="panel-title">Weekly Availability</h3>
        <p class="form-hint" style="margin-bottom:16px">
          Set the hours you are available for consultations each week.
        </p>
        <div class="availability-grid">
          ${days.map((d, i) => `
            <div class="availability-day">
              <div class="availability-day-header">
                <span class="availability-day-name">${d}</span>
              </div>
              <div class="availability-hours">
                <input type="time" id="start-${i}" class="form-input"
                       value="${map[i]?.start_time?.slice(0,5) || '09:00'}" />
                <span class="availability-sep">to</span>
                <input type="time" id="end-${i}" class="form-input"
                       value="${map[i]?.end_time?.slice(0,5) || '17:00'}" />
              </div>
            </div>`).join('')}
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" data-action="save-availability">
            <i class="fas fa-save"></i> Save Availability</button>
        </div>
      </section>

      <section class="panel">
        <h3 class="panel-title">Time Off Requests</h3>
        <div class="form-grid">
          <label class="form-group"><span class="form-label">Start date</span>
            <input type="date" id="timeOffStart" class="form-input" /></label>
          <label class="form-group"><span class="form-label">End date</span>
            <input type="date" id="timeOffEnd" class="form-input" /></label>
          <label class="form-group form-group-full"><span class="form-label">Reason</span>
            <input id="timeOffReason" class="form-input" placeholder="e.g. Conference, personal leave" /></label>
        </div>
        <div class="panel-actions">
          <button class="btn btn-warning" data-action="request-time-off">
            <i class="fas fa-paper-plane"></i> Submit Request</button>
        </div>

        <ul class="list-stack" style="margin-top:20px">
          ${(S.timeOff || []).map(t => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">
                  ${EH.Dates.fmtDate(t.start_date)} to ${EH.Dates.fmtDate(t.end_date)}
                </span>
                <span class="list-row-sub">${EH.Fmt.esc(t.reason || '')}</span>
              </div>
              <span class="${EH.Fmt.statusClass(t.status)}">${EH.Fmt.esc(t.status)}</span>
            </li>`).join('') || '<li class="empty-row">No time off requests</li>'}
        </ul>
      </section>`;
  }

  EH.ExpertAvailability = { render };
})(window);
