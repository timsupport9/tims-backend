/* ============================================================
   dashboards/expert/availability.js
   ============================================================ */

function renderExpertAvailability() {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const avMap = {};
  (S.availability || []).forEach(a => { avMap[a.day_of_week] = a; });
  const settings = S.availabilitySettings || {};
  const timeOff = S.timeOff || [];

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Availability</span></div>
    <section class="page-header">
      <h1 class="page-title">Availability</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-expert-action="add-time-off">
          <i class="fas fa-ban"></i> Add Time Off</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Weekly Schedule</h3>
      <p class="form-hint" style="margin-bottom:16px">
        Set recurring hours per day. Clients can only book inside these windows.
      </p>
      <div class="availability-grid">
        ${days.map((day, i) => {
          const row = avMap[i];
          const on = !!row;
          return `
            <div class="availability-day">
              <div class="availability-day-header">
                <label class="checkbox-row">
                  <input type="checkbox" id="avail-on-${i}" ${on ? 'checked' : ''} />
                  <span class="availability-day-name">${day}</span>
                </label>
              </div>
              <div class="availability-hours">
                <input type="time" id="avail-start-${i}" class="form-input"
                       value="${row?.start_time?.slice(0,5) || '09:00'}" />
                <span class="availability-sep">to</span>
                <input type="time" id="avail-end-${i}" class="form-input"
                       value="${row?.end_time?.slice(0,5) || '17:00'}" />
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-expert-action="save-availability">
          <i class="fas fa-save"></i> Save Schedule</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Booking Rules</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Buffer between sessions (minutes)</span>
          <input id="availBuffer" type="number" class="form-input"
                 value="${settings.buffer_minutes || 15}" min="0" max="120" /></label>
        <label class="form-group"><span class="form-label">Minimum notice (hours)</span>
          <input id="availAdvance" type="number" class="form-input"
                 value="${settings.advance_hours || 24}" min="0" max="720" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-expert-action="save-buffer">
          <i class="fas fa-save"></i> Save Rules</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Time Off</h3>
      ${timeOff.length ? `
        <ul class="list-stack">
          ${timeOff.map(t => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${fmtDate(t.start_date)} → ${fmtDate(t.end_date)}</span>
                <span class="list-row-sub">${esc(t.reason || '')}</span>
              </div>
              <span class="${statusClass(t.status)}">${esc(t.status)}</span>
              ${t.status === 'pending' || t.status === 'approved' ? `
                <button class="btn btn-danger btn-xs" data-expert-action="cancel-time-off" data-id="${t.id}">
                  <i class="fas fa-times"></i> Cancel</button>
              ` : ''}
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-row">No upcoming time off scheduled.</p>'}
    </section>
  `;
}

function openTimeOffModal() {
  openModal({
    title: 'Add Time Off',
    body: `
      <label class="form-group"><span class="form-label">Start date</span>
        <input id="toStart" type="date" class="form-input" /></label>
      <label class="form-group"><span class="form-label">End date</span>
        <input id="toEnd" type="date" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Reason</span>
        <input id="toReason" class="form-input" placeholder="e.g. Conference, holiday" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="toSave" class="btn btn-primary">Add</button>`,
  });
  document.getElementById('toSave').onclick = async () => {
    const s = document.getElementById('toStart').value;
    const e = document.getElementById('toEnd').value;
    if (!s || !e) return showToast('Pick start and end dates', 'error');
    if (new Date(e) < new Date(s)) return showToast('End date must be after start', 'error');
    await apiCall('/api/expert/time-off', 'POST', {
      start_date: s, end_date: e,
      reason: document.getElementById('toReason').value,
    });
    closeModal();
    await loadAllData();
    showToast('Time off added', 'success');
    rerenderExpertContent();
  };
}
