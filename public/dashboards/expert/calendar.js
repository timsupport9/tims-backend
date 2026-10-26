/* ============================================================
   dashboards/expert/calendar.js
   ============================================================ */

function renderExpertCalendar() {
  const view = S.__calendarView || 'month';
  const base = S.__calendarDate ? new Date(S.__calendarDate) : new Date();
  const sessions = S.consultations.filter(c =>
    c.expert_id === currentUser?.id && c.scheduled_at
  );
  const events = S.events.filter(e => e.expert_id === currentUser?.id);
  const timeOff = (S.timeOff || []).filter(t => t.status === 'approved');

  const monthLabel = base.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Calendar</span></div>

    <section class="page-header">
      <h1 class="page-title">Calendar</h1>
      <div class="page-actions">
        <div class="btn-group">
          <button class="btn btn-secondary btn-sm ${view === 'day' ? 'active' : ''}" data-expert-tab="calendar" data-view="day">Day</button>
          <button class="btn btn-secondary btn-sm ${view === 'week' ? 'active' : ''}" data-expert-tab="calendar" data-view="week">Week</button>
          <button class="btn btn-secondary btn-sm ${view === 'month' ? 'active' : ''}" data-expert-tab="calendar" data-view="month">Month</button>
        </div>
        <button class="btn btn-secondary" data-expert-action="add-time-off">
          <i class="fas fa-ban"></i> Block time</button>
      </div>
    </section>

    <section class="panel">
      <div class="calendar-toolbar">
        <button class="btn btn-secondary btn-sm" data-expert-action="cal-prev">
          <i class="fas fa-chevron-left"></i></button>
        <h2 class="panel-title" style="margin:0">${monthLabel}</h2>
        <button class="btn btn-secondary btn-sm" data-expert-action="cal-next">
          <i class="fas fa-chevron-right"></i></button>
        <button class="btn btn-secondary btn-sm" data-expert-action="cal-today">Today</button>
      </div>
      <div class="calendar-header">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<span>${d}</span>`).join('')}
      </div>
      ${renderExpertCalendarGrid(base, sessions, events, timeOff)}
    </section>

    <section class="panel">
      <h3 class="panel-title">Upcoming Sessions</h3>
      ${renderUpcomingSessions(sessions)}
    </section>
  `;
}

function renderExpertCalendarGrid(base, sessions, events, timeOff) {
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push({ day: '', other: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(year, month, d) });
  while (cells.length % 7) cells.push({ day: '', other: true });

  const byDay = {};
  sessions.forEach(c => {
    const dt = new Date(c.scheduled_at);
    if (dt.getMonth() === month && dt.getFullYear() === year) {
      (byDay[dt.getDate()] = byDay[dt.getDate()] || []).push({
        type: 'session', title: c.title, time: dt,
      });
    }
  });
  events.forEach(e => {
    const dt = new Date(e.date || e.created_at);
    if (dt.getMonth() === month && dt.getFullYear() === year) {
      (byDay[dt.getDate()] = byDay[dt.getDate()] || []).push({
        type: 'event', title: e.title, time: dt,
      });
    }
  });
  timeOff.forEach(t => {
    const start = new Date(t.start_date);
    const end = new Date(t.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getMonth() === month && d.getFullYear() === year) {
        (byDay[d.getDate()] = byDay[d.getDate()] || []).push({
          type: 'timeoff', title: 'Time Off', time: d,
        });
      }
    }
  });

  const today = new Date();
  return `
    <div class="calendar-grid">
      ${cells.map(c => {
        const isToday = c.date && c.date.toDateString() === today.toDateString();
        const items = c.day ? (byDay[c.day] || []) : [];
        return `
          <div class="calendar-cell ${c.other ? 'other-month' : ''} ${isToday ? 'today' : ''}">
            <div class="calendar-day-num">${c.day || ''}</div>
            ${items.slice(0, 3).map(i => `
              <div class="calendar-event calendar-event-${i.type}" title="${esc(i.title)}">
                ${i.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                ${esc((i.title || '').slice(0, 14))}
              </div>
            `).join('')}
            ${items.length > 3 ? `<div class="calendar-event-more">+${items.length - 3}</div>` : ''}
          </div>`;
      }).join('')}
    </div>
  `;
}

function renderUpcomingSessions(sessions) {
  const upcoming = sessions
    .filter(s => new Date(s.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 6);
  if (!upcoming.length) return '<p class="empty-row">No upcoming sessions</p>';
  return `
    <ul class="list-stack">
      ${upcoming.map(s => `
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(s.title || '')}</span>
            <span class="list-row-sub">${esc(s.client_name || '')} · ${fmtInTz(s.scheduled_at, currentUser?.timezone || 'UTC')}</span>
          </div>
          <button class="btn btn-primary btn-xs" data-expert-action="start-consultation" data-id="${s.id}">
            <i class="fas fa-play"></i> Start</button>
        </li>
      `).join('')}
    </ul>
  `;
}
