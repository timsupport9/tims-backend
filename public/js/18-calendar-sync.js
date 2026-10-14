/* ============================================================
   ExpertHub 2.0 — 18-calendar-sync.js
   Add consultations/events to Google, Outlook, Apple via .ics
   and web-calendar deeplinks. No OAuth required.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHCalendar = window.EHCalendar || {};

  /* ---------- ICS builder ---------- */

  function pad(n) { return String(n).padStart(2, '0'); }

  function toICSDate(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`
         + `T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}Z`;
  }

  function escapeICS(s) {
    return String(s || '')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  function fold(line) {
    // RFC 5545 says lines should be ≤75 octets. Simple fold at 73 chars.
    if (line.length <= 73) return line;
    const chunks = [];
    for (let i = 0; i < line.length; i += 73) chunks.push(line.slice(i, i + 73));
    return chunks.join('\r\n ');
  }

  function buildICS(evt) {
    const start = new Date(evt.start);
    const end   = evt.end ? new Date(evt.end) : new Date(start.getTime() + (evt.durationMinutes || 30) * 60000);
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ExpertHub//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${escapeICS(evt.uid || (Date.now() + '@experthub'))}`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${escapeICS(evt.title || 'Session')}`,
    ];

    if (evt.description) lines.push(`DESCRIPTION:${escapeICS(evt.description)}`);
    if (evt.location)    lines.push(`LOCATION:${escapeICS(evt.location)}`);
    if (evt.url)         lines.push(`URL:${escapeICS(evt.url)}`);
    if (evt.organizer)   lines.push(`ORGANIZER;CN=${escapeICS(evt.organizer.name || 'ExpertHub')}:mailto:${escapeICS(evt.organizer.email || 'noreply@experthub')}`);
    (evt.attendees || []).forEach(a => {
      if (a?.email) lines.push(`ATTENDEE;CN=${escapeICS(a.name || a.email)};RSVP=TRUE:mailto:${escapeICS(a.email)}`);
    });

    if (evt.reminderMinutes) {
      lines.push(
        'BEGIN:VALARM',
        `TRIGGER:-PT${evt.reminderMinutes}M`,
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeICS(evt.title || 'Reminder')}`,
        'END:VALARM'
      );
    }

    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.map(fold).join('\r\n');
  }

  /* ---------- download ---------- */

  function downloadICS(evt, filename) {
    const ics = buildICS(evt);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${(evt.title || 'event').replace(/[^\w\-]+/g, '_').slice(0, 60)}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    if (typeof window.showToast === 'function') window.showToast('Calendar file downloaded', 'success');
  }

  /* ---------- web deeplinks ---------- */

  function gcalUrl(evt) {
    const start = new Date(evt.start);
    const end = evt.end ? new Date(evt.end) : new Date(start.getTime() + (evt.durationMinutes || 30) * 60000);
    const p = new URLSearchParams({
      action: 'TEMPLATE',
      text: evt.title || 'Session',
      dates: `${toICSDate(start)}/${toICSDate(end)}`,
      details: evt.description || '',
      location: evt.location || '',
    });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  }

  function outlookUrl(evt) {
    const start = new Date(evt.start);
    const end = evt.end ? new Date(evt.end) : new Date(start.getTime() + (evt.durationMinutes || 30) * 60000);
    const p = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: evt.title || 'Session',
      startdt: start.toISOString(),
      enddt: end.toISOString(),
      body: evt.description || '',
      location: evt.location || '',
    });
    return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
  }

  /* ---------- UI: picker modal ---------- */

  function openPicker(evt) {
    if (typeof window.openModal !== 'function') {
      // Fallback: download .ics directly
      downloadICS(evt);
      return;
    }

    window.openModal({
      title: 'Add to calendar',
      body: `
        <div class="cal-picker">
          <p class="cal-picker__title">${escapeHtml(evt.title || 'Session')}</p>
          <p class="cal-picker__when">${formatWhen(evt)}</p>
          <div class="cal-picker__grid">
            <a class="cal-picker__item" target="_blank" rel="noopener" data-cal="google" href="${gcalUrl(evt)}">
              <i class="fab fa-google"></i><span>Google Calendar</span>
            </a>
            <a class="cal-picker__item" target="_blank" rel="noopener" data-cal="outlook" href="${outlookUrl(evt)}">
              <i class="fab fa-microsoft"></i><span>Outlook</span>
            </a>
            <button class="cal-picker__item" data-cal="ics">
              <i class="fas fa-download"></i><span>Apple / Other (.ics)</span>
            </button>
            <button class="cal-picker__item" data-cal="copy">
              <i class="fas fa-link"></i><span>Copy meeting link</span>
            </button>
          </div>
        </div>
      `,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });

    document.querySelector('[data-cal="ics"]')?.addEventListener('click', () => {
      downloadICS(evt);
      window.closeModal?.();
    });
    document.querySelector('[data-cal="copy"]')?.addEventListener('click', async () => {
      const url = evt.url || location.href;
      try {
        await navigator.clipboard.writeText(url);
        if (typeof window.showToast === 'function') window.showToast('Meeting link copied', 'success');
      } catch (_) {
        if (typeof window.showToast === 'function') window.showToast('Copy failed', 'error');
      }
    });
  }

  function formatWhen(evt) {
    const start = new Date(evt.start);
    const end = evt.end ? new Date(evt.end) : new Date(start.getTime() + (evt.durationMinutes || 30) * 60000);
    try {
      const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' });
      return `${fmt.format(start)} — ${new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(end)}`;
    } catch (_) {
      return `${start.toLocaleString()} — ${end.toLocaleString()}`;
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => (
      { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]
    ));
  }

  /* ---------- consultation → event adapter ---------- */

  function eventFromConsultation(c) {
    if (!c?.scheduled_at) return null;
    return {
      uid: 'consult-' + c.id + '@experthub',
      title: c.title || ('Consultation with ' + (c.expert_name || 'Expert')),
      description: [
        c.description || '',
        c.expert_name ? 'Expert: ' + c.expert_name : '',
        c.consultation_type ? 'Type: ' + c.consultation_type : '',
        c.price ? 'Fee: ' + (typeof window.fmtCur === 'function' ? window.fmtCur(c.price) : c.price) : '',
      ].filter(Boolean).join('\n'),
      start: c.scheduled_at,
      durationMinutes: c.duration_minutes || 30,
      location: c.meeting_url || c.consultation_type || 'ExpertHub',
      url: c.meeting_url || (location.origin + '/#/dashboard'),
      reminderMinutes: 15,
      organizer: { name: 'ExpertHub', email: 'noreply@experthub' },
    };
  }

  function eventFromEvent(ev) {
    if (!ev?.date) return null;
    return {
      uid: 'event-' + ev.id + '@experthub',
      title: ev.title || 'Event',
      description: ev.description || '',
      start: ev.date,
      durationMinutes: ev.duration_minutes || 60,
      location: ev.location || 'ExpertHub',
      url: location.origin + '/#/dashboard',
      reminderMinutes: 30,
    };
  }

  /* ---------- public ---------- */

  NS.buildICS = buildICS;
  NS.download = downloadICS;
  NS.openPicker = openPicker;
  NS.googleUrl = gcalUrl;
  NS.outlookUrl = outlookUrl;
  NS.fromConsultation = eventFromConsultation;
  NS.fromEvent = eventFromEvent;

  /* ---- delegated handler for `[data-action="add-to-calendar"]` ---- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action="add-to-calendar"]');
    if (!el) return;
    const kind = el.getAttribute('data-kind'); // 'consultation' | 'event'
    const id = el.getAttribute('data-id');
    let evt = null;

    if (kind === 'consultation' && window.S?.consultations) {
      const c = S.consultations.find(x => String(x.id) === String(id));
      if (c) evt = eventFromConsultation(c);
    } else if (kind === 'event' && window.S?.events) {
      const ev = S.events.find(x => String(x.id) === String(id));
      if (ev) evt = eventFromEvent(ev);
    }

    if (!evt) return (typeof window.showToast === 'function') && window.showToast('Nothing to add', 'warning');
    openPicker(evt);
  });