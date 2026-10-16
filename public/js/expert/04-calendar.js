/* ============================================================
   ExpertHub 2.0 — js/expert/04-calendar.js
   Expert consultation calendar (month grid + upcoming list).
   ============================================================ */

function expertConsultationCalendar() {
  const mine = S.consultations.filter(c => c.expert_id === currentUser?.id);
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
  mine.forEach(c => {
    if (!c.scheduled_at) return;
    const dt = new Date(c.scheduled_at);
    if (dt.getMonth() === month && dt.getFullYear() === year) {
      const k = dt.getDate();
      (byDay[k] = byDay[k] || []).push(c);
    }
  });

  const upcoming = mine
    .filter(c => c.scheduled_at && new Date(c.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 5);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Calendar</span></div>
    <section class="page-header">
      <h1 class="page-title">Consultation Calendar</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="block-time">
          <i class="fas fa-ban"></i> Block Time</button>
        <button class="btn btn-primary" data-action="manage-slots">
          <i class="fas fa-plus"></i> Manage Slots</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">${today.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
      <div class="calendar-header">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<span>${d}</span>`).join('')}
      </div>
      <div class="calendar-grid">
        ${cells.map(c => {
          const isToday = c.date && c.date.toDateString() === today.toDateString();
          const sessions = c.day ? (byDay[c.day] || []) : [];
          return `
            <div class="calendar-cell ${c.other ? 'other-month' : ''} ${isToday ? 'today' : ''}">
              <div class="calendar-day-num">${c.day || ''}</div>
              ${sessions.slice(0, 2).map(s => `
                <div class="calendar-event" title="${esc(s.title)}">
                  ${new Date(s.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ${esc(s.title.slice(0, 16))}
                </div>
              `).join('')}
              ${sessions.length > 2 ? `<div class="calendar-event-more">+${sessions.length - 2}</div>` : ''}
            </div>`;
        }).join('')}
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Upcoming Sessions</h3>
      ${upcoming.length ? upcoming.map(s => `
        <div class="consultation-row">
          <div class="consultation-row-time">
            <div class="consultation-row-day">${fmtDate(s.scheduled_at)}</div>
            <div class="consultation-row-hour">${fmtInTz(s.scheduled_at, currentUser?.timezone || 'UTC', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div class="consultation-row-body">
            <div class="consultation-row-title">${esc(s.title || '')}</div>
            <div class="consultation-row-meta">
              <span class="${consultationStatusClass(s.status)}">${esc(s.status?.replace(/_/g,' ') || '')}</span>
              · ${esc(s.client_name || 'Client')}
              · ${s.duration_minutes || 30} min
            </div>
          </div>
          <div class="consultation-row-actions">
            <button class="btn btn-primary btn-sm" data-action="consultation-detail" data-id="${s.id}">View</button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">No upcoming sessions</p>'}
    </section>
  `;
}
