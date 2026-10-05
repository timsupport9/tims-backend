/* ============================================================
   ExpertHub 2.0 — scheduling-modals.js
   Functions moved intact from 13-modals.js.
   ============================================================ */

function openManageSlotsModal() {
  openModal({
    title: 'Generate Slots',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Date</span>
        <input id="msDate" type="date" class="form-input" value="${new Date().toISOString().slice(0,10)}" /></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Start hour</span>
          <input id="msStartHour" type="number" class="form-input" value="9" min="0" max="23" /></label>
        <label class="form-group"><span class="form-label">End hour</span>
          <input id="msEndHour" type="number" class="form-input" value="17" min="1" max="24" /></label>
        <label class="form-group"><span class="form-label">Slot duration (min)</span>
          <select id="msDuration" class="form-select">
            ${[15,30,45,60,90].map(d => `<option value="${d}" ${d === 30 ? 'selected' : ''}>${d}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Price per slot</span>
          <input id="msPrice" type="number" class="form-input" value="${currentUser?.hourly_rate || 50}" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="msSave" class="btn btn-primary">Generate Slots</button>`,
  });
  $('#msSave').onclick = async () => {
    const date = $('#msDate').value;
    const startHour = Number($('#msStartHour').value);
    const endHour = Number($('#msEndHour').value);
    const duration = Number($('#msDuration').value);
    const price = Number($('#msPrice').value);
    if (startHour >= endHour) return showToast('Invalid hours', 'error');
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += duration) {
        const start = new Date(`${date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
        const end = new Date(start.getTime() + duration * 60000);
        if (end.getHours() > endHour || (end.getHours() === endHour && end.getMinutes() > 0)) continue;
        slots.push({ start: start.toISOString(), end: end.toISOString(), duration, price, type: 'video' });
      }
    }
    if (!slots.length) return showToast('No valid slots', 'error');
    showLoading(true);
    const d = await apiCall('/api/experts/me/slots', 'POST', { slots });
    closeModal(); await loadAllData(); rerenderRoleContent(); showLoading(false);
    showToast(`Created ${d.created || slots.length} slots`, 'success');
  };
}
function openBlockTimeModal() {
  openModal({
    title: 'Block Time',
    body: `
      <label class="form-group"><span class="form-label">Start</span>
        <input id="btStart" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">End</span>
        <input id="btEnd" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Reason</span>
        <input id="btReason" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="btSave" class="btn btn-warning">Block Time</button>`,
  });
  $('#btSave').onclick = async () => {
    await apiCall('/api/experts/me/block-time', 'POST', {
      start: $('#btStart').value, end: $('#btEnd').value,
      reason: $('#btReason').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Time blocked', 'success');
  };
}
function openProctorSessionModal() {
  openModal({
    title: 'Schedule Proctored Exam',
    body: `
      <label class="form-group"><span class="form-label">Exam title</span>
        <input id="psTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Trainee</span>
        <select id="psTrainee" class="form-select">
          ${S.trainees.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Scheduled at</span>
        <input id="psWhen" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Proctor mode</span>
        <select id="psMode" class="form-select">
          ${CONFIG.PROCTOR_MODES.map(m => `<option value="${m}">${m}</option>`).join('')}
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="psSave" class="btn btn-primary">Schedule</button>`,
  });
  $('#psSave').onclick = async () => {
    await apiCall('/api/institution/exam-proctor-sessions', 'POST', {
      exam_title: $('#psTitle').value,
      trainee_id: Number($('#psTrainee').value),
      scheduled_at: $('#psWhen').value,
      proctor_mode: $('#psMode').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Proctor session scheduled', 'success');
  };
}
function openSessionModal(sessionId) {
  const s = sessionId ? (S.institutionSessions.find(x => x.id === sessionId) || {}) : {};
  const toLocal = d => {
    if (!d) return '';
    const dt = new Date(d);
    const off = dt.getTimezoneOffset();
    return new Date(dt.getTime() - off * 60000).toISOString().slice(0, 16);
  };

  openModal({
    title: sessionId ? 'Edit Session' : 'Schedule Session',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="ssTitle" class="form-input" value="${esc(s.title || '')}" required /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="ssDesc" class="form-textarea" rows="3">${esc(s.description || '')}</textarea></label>
      <label class="form-group">
        <span class="form-label">Cohort</span>
        <select id="ssCohort" class="form-select">
          <option value="">Select cohort</option>
          ${S.cohorts.map(c => `
            <option value="${c.id}" ${s.cohort_id === c.id ? 'selected' : ''}>
              ${esc(c.name)} - ${esc(c.programme_title || '')}
            </option>
          `).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Instructor</span>
        <select id="ssInstructor" class="form-select">
          <option value="">Unassigned</option>
          ${S.instructors.map(i => `
            <option value="${i.id}" ${s.instructor_id === i.id ? 'selected' : ''}>${esc(i.name)}</option>
          `).join('')}
        </select>
      </label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Scheduled at</span>
          <input id="ssWhen" type="datetime-local" class="form-input"
                 value="${toLocal(s.scheduled_at)}" required /></label>
        <label class="form-group"><span class="form-label">Duration in minutes</span>
          <input id="ssDuration" type="number" class="form-input"
                 value="${s.duration_minutes || 60}" min="15" /></label>
      </div>
      <label class="form-group">
        <span class="form-label">Mode</span>
        <select id="ssMode" class="form-select">
          ${CONFIG.SESSION_MODES.map(m => `
            <option value="${m}" ${s.mode === m ? 'selected' : ''}>${m.replace('_', ' ')}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Location (for in-person)</span>
        <input id="ssLocation" class="form-input" value="${esc(s.location || '')}" /></label>
      <label class="form-group"><span class="form-label">Meeting URL (for online)</span>
        <input id="ssUrl" class="form-input" value="${esc(s.meeting_url || '')}" placeholder="https://" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ssSave" class="btn btn-primary">${sessionId ? 'Save Changes' : 'Schedule'}</button>`,
  });
  $('#ssSave').onclick = async () => {
    const title = $('#ssTitle').value;
    const scheduled_at = $('#ssWhen').value;
    const cohort_id = Number($('#ssCohort').value);
    if (!title || !scheduled_at || !cohort_id) {
      return showToast('Title, cohort, and date are required', 'error');
    }
    const payload = {
      title,
      description: $('#ssDesc').value || null,
      cohort_id,
      instructor_id: $('#ssInstructor').value ? Number($('#ssInstructor').value) : null,
      scheduled_at: new Date(scheduled_at).toISOString().slice(0, 19).replace('T', ' '),
      duration_minutes: Number($('#ssDuration').value || 60),
      mode: $('#ssMode').value,
      location: $('#ssLocation').value || null,
      meeting_url: $('#ssUrl').value || null,
    };
    try {
      showLoading(true);
      if (sessionId) await apiCall(`/api/institution/sessions/${sessionId}`, 'PUT', payload);
      else           await apiCall('/api/institution/sessions', 'POST', payload);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(sessionId ? 'Session updated' : 'Session scheduled', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}
async function openAttendanceModal(sessionId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/sessions/${sessionId}/attendance`);
    openModal({
      title: `Mark Attendance - ${esc(d.session.title)}`,
      className: 'modal-lg',
      body: `
        <p class="form-hint" style="margin-bottom:12px">
          Scheduled ${fmtDT(d.session.scheduled_at)}. Mark each trainee and add an excuse note where applicable.
        </p>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Trainee</th><th style="min-width:140px">Status</th><th>Excuse reason</th></tr>
            </thead>
            <tbody>
              ${d.trainees.map(t => `
                <tr data-att-trainee="${t.id}">
                  <td>
                    <div class="user-cell">
                      <img class="user-avatar" src="${avatar(t)}" alt="" />
                      <div>
                        <div class="user-name">${esc(t.name)}</div>
                        <div class="user-email">${esc(t.email)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select class="form-select att-status">
                      ${CONFIG.ATTENDANCE_STATUSES.map(s => `
                        <option value="${s}" ${t.status === s ? 'selected' : ''}>${s}</option>
                      `).join('')}
                    </select>
                  </td>
                  <td>
                    <input class="form-input att-reason" placeholder="Optional"
                           value="${esc(t.excuse_reason || '')}" />
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="3" class="empty-row">No trainees enrolled in this cohort</td></tr>'}
            </tbody>
          </table>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
               <button id="attSave" class="btn btn-primary">Save Attendance</button>`,
    });
    $('#attSave').onclick = async () => {
      const rows = Array.from(document.querySelectorAll('[data-att-trainee]'));
      const records = rows.map(el => ({
        trainee_id: Number(el.dataset.attTrainee),
        status: el.querySelector('.att-status').value,
        excuse_reason: el.querySelector('.att-reason').value || null,
      }));
      try {
        showLoading(true);
        await apiCall(`/api/institution/sessions/${sessionId}/attendance`, 'PUT', { records });
        closeModal();
        await loadAllData();
        rerenderRoleContent();
        showToast('Attendance saved', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      finally { showLoading(false); }
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}
function openSessionsCalendarModal() {
  const sessions = S.institutionSessions || [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push({ day: '', other: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(year, month, d) });
  while (cells.length % 7) cells.push({ day: '', other: true });

  const byDay = {};
  sessions.forEach(s => {
    const dt = new Date(s.scheduled_at);
    if (dt.getMonth() === month && dt.getFullYear() === year) {
      const k = dt.getDate();
      (byDay[k] = byDay[k] || []).push(s);
    }
  });

  openModal({
    title: 'Session Calendar',
    className: 'modal-lg',
    body: `
      <h3 class="panel-title">${today.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
      <div class="calendar-header">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<span>${d}</span>`).join('')}
      </div>
      <div class="calendar-grid">
        ${cells.map(c => {
          const isToday = c.date && c.date.toDateString() === today.toDateString();
          const evs = c.day ? (byDay[c.day] || []) : [];
          return `
            <div class="calendar-cell ${c.other ? 'other-month' : ''} ${isToday ? 'today' : ''}">
              <div class="calendar-day-num">${c.day || ''}</div>
              ${evs.slice(0, 3).map(e => `
                <div class="calendar-event" title="${esc(e.title)}">
                  ${new Date(e.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ${esc(e.title)}
                </div>
              `).join('')}
            </div>`;
        }).join('')}
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}
function openScheduleReportModal() {
  openModal({
    title: 'Schedule Report',
    body: `
      <label class="form-group">
        <span class="form-label">Report type</span>
        <select id="srType" class="form-select">
          <option value="programme">Programme Scorecard</option>
          <option value="cohort">Cohort Comparison</option>
          <option value="trainee">Trainee Progress</option>
          <option value="compliance">Compliance</option>
          <option value="cost">Cost Analysis</option>
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Frequency</span>
        <select id="srFreq" class="form-select">
          <option value="daily">Daily</option>
          <option value="weekly" selected>Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Recipients (comma separated)</span>
        <textarea id="srRecipients" class="form-textarea" rows="2"
                  placeholder="ops@acme.com, l-and-d@acme.com"></textarea>
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="srSave" class="btn btn-primary">Schedule</button>`,
  });
  $('#srSave').onclick = async () => {
    const recipients = $('#srRecipients').value
      .split(',').map(s => s.trim()).filter(Boolean);
    if (!recipients.length) return showToast('Add at least one recipient', 'error');
    try {
      const template = await apiCall('/api/institution/report-templates', 'POST', {
        name: `${$('#srType').value} report`,
        report_type: $('#srType').value,
      });
      await apiCall('/api/institution/scheduled-reports', 'POST', {
        template_id: template.id,
        frequency: $('#srFreq').value,
        recipients,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Report scheduled', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}
