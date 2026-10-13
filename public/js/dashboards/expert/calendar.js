/* ============================================================
   dashboards/expert/calendar.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Calendar' }])}
      ${EH.Layout.pageHeader('My Calendar')}
      <section class="panel">${renderCalendar()}</section>`;
  }

  function renderCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push({ day: '', other: true });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(year, month, d) });
    while (cells.length % 7) cells.push({ day: '', other: true });

    const eventsByDay = {};
    (S.events || []).forEach(ev => {
      const d = new Date(ev.date || ev.created_at);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const k = d.getDate();
        (eventsByDay[k] = eventsByDay[k] || []).push(ev);
      }
    });
    const today = new Date();

    return `
      <h3 class="panel-title">${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
      <div class="calendar-header">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<span>${d}</span>`).join('')}
      </div>
      <div class="calendar-grid">
        ${cells.map(c => {
          const isToday = c.date && c.date.toDateString() === today.toDateString();
          const evs = c.day ? (eventsByDay[c.day] || []) : [];
          return `
            <div class="calendar-cell ${c.other ? 'other-month' : ''} ${isToday ? 'today' : ''}">
              <div class="calendar-day-num">${c.day || ''}</div>
              ${evs.slice(0, 3).map(e => `
                <div class="calendar-event" title="${EH.Fmt.esc(e.title)}">${EH.Fmt.esc(e.title)}</div>
              `).join('')}
            </div>`;
        }).join('')}
      </div>`;
  }

  EH.ExpertCalendar = { render };
})(window);
