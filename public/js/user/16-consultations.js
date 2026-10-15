/* ============================================================
   ExpertHub 2.0 — 16-consultations.js
   Learner consultation list + consultation card renderer.

   Enhancements (v2):
   - Filter tabs (All / Upcoming / Pending / Past) with counts
   - Search across title / expert / status, with focus preservation
   - Sort by soonest / latest
   - "Join now" banner for sessions starting within 30 minutes
   - Timeline grouping (by day) for upcoming sessions
   - ICS export for scheduled sessions
   - Private session notes (localStorage-backed)
   - Attachments viewer
   - Clearer escrow status (held / released) with tooltips
   - Group session roster
   - Recurring session request
   - No-show claim shortcut
   - Graceful fallbacks when optional helpers are missing
   ============================================================ */

/* ============================================================
   Module state (session-scoped, non-persistent)
   ============================================================ */
S.__consultFilter = S.__consultFilter || 'all';       // all | upcoming | pending | past
S.__consultSearch = S.__consultSearch || '';
S.__consultSort   = S.__consultSort   || 'soonest';   // soonest | latest

/* ============================================================
   USER — CONSULTATIONS
   ============================================================ */
function userConsultations() {
  const all = Array.isArray(S.consultations) ? S.consultations : [];
  const mine = all.filter(c => c.user_id === currentUser?.id);

  const now = Date.now();
  const upcoming = mine.filter(c =>
    c.scheduled_at &&
    new Date(c.scheduled_at).getTime() > now &&
    !['cancelled', 'expired', 'no_show'].includes(c.status)
  );
  const pending = mine.filter(c =>
    ['pending_payment', 'pending_expert_confirmation'].includes(c.status)
  );
  const past = mine.filter(c =>
    ['completed', 'cancelled', 'no_show', 'expired'].includes(c.status)
  );

  const filter = S.__consultFilter;
  const query  = (S.__consultSearch || '').trim().toLowerCase();
  const sort   = S.__consultSort;

  /* --- Search --- */
  const matchesSearch = (c) => {
    if (!query) return true;
    const hay = [
      c.title, c.expert_name, c.expert_specialization,
      c.status, c.description, c.consultation_type,
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(query);
  };

  let vUpcoming = upcoming.filter(matchesSearch);
  let vPending  = pending.filter(matchesSearch);
  let vPast     = past.filter(matchesSearch);

  /* --- Sorting --- */
  const tOf = (c) => new Date(c.scheduled_at || c.created_at || 0).getTime();
  const asc  = (a, b) => tOf(a) - tOf(b);
  const desc = (a, b) => tOf(b) - tOf(a);
  if (sort === 'soonest') {
    vUpcoming.sort(asc);
    vPast.sort(desc);
  } else {
    vUpcoming.sort(desc);
    vPast.sort(asc);
  }
  vPending.sort(desc);

  /* --- Tab visibility --- */
  const showUpcoming = filter === 'all' || filter === 'upcoming';
  const showPending  = filter === 'all' || filter === 'pending';
  const showPast     = filter === 'all' || filter === 'past';

  const counts = {
    all: mine.length,
    upcoming: upcoming.length,
    pending: pending.length,
    past: past.length,
  };
  const tabs = [
    { id: 'all',      label: 'All',      icon: 'fa-list-ul',        count: counts.all },
    { id: 'upcoming', label: 'Upcoming', icon: 'fa-calendar-day',    count: counts.upcoming },
    { id: 'pending',  label: 'Pending',  icon: 'fa-hourglass-half',  count: counts.pending },
    { id: 'past',     label: 'Past',     icon: 'fa-history',         count: counts.past },
  ];

  /* --- Join-now banner: next session within 30 min --- */
  const nextJoinable = upcoming
    .map(c => ({ c, ts: new Date(c.scheduled_at).getTime() }))
    .filter(x => x.ts - now <= 30 * 60 * 1000 && x.ts - now > -15 * 60 * 1000)
    .filter(x => ['confirmed', 'in_grace', 'in_session'].includes(x.c.status))
    .sort((a, b) => a.ts - b.ts)[0];

  const packagesCredits = (S.userPackages || []).reduce((s, p) => s + (p.sessions_remaining || 0), 0);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultations</span></div>
    <section class="page-header">
      <h1 class="page-title">My Consultations</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="instant-consultation">
          <i class="fas fa-bolt"></i> Talk Now</button>
        <button class="btn btn-primary" data-action="find-expert-wizard">
          <i class="fas fa-plus"></i> Book Session</button>
      </div>
    </section>

    ${nextJoinable ? `
      <div class="alert alert-warning consultation-join-banner">
        <i class="fas fa-video"></i>
        <div style="flex:1">
          <strong>${esc(nextJoinable.c.title || 'Upcoming session')}</strong>
          with ${esc(nextJoinable.c.expert_name || 'expert')}
          starts in <strong>${typeof timeUntil === 'function' ? timeUntil(nextJoinable.c.scheduled_at) : 'soon'}</strong>.
        </div>
        <button class="btn btn-primary btn-sm" data-action="start-session" data-id="${nextJoinable.c.id}">
          <i class="fas fa-video"></i> Join now
        </button>
      </div>
    ` : ''}

    ${(S.userPackages || []).length ? `
      <div class="alert alert-info">
        <i class="fas fa-ticket-alt"></i>
        <div>
          You have <strong>${packagesCredits} session credit${packagesCredits === 1 ? '' : 's'}</strong>
          across ${S.userPackages.length} package${S.userPackages.length === 1 ? '' : 's'}.
        </div>
      </div>
    ` : ''}

    <nav class="tab-bar consultation-tab-bar">
      ${tabs.map(t => `
        <button class="tab-btn ${filter === t.id ? 'tab-btn-active' : ''}"
                data-consult-filter="${t.id}"
                onclick="setConsultFilter('${t.id}'); return false;">
          <i class="fas ${t.icon}"></i> ${t.label}
          <span class="chip chip-neutral" style="margin-left:6px">${t.count}</span>
        </button>
      `).join('')}
    </nav>

    <div class="panel consultation-toolbar-panel">
      <div class="page-actions" style="flex-wrap:wrap;gap:8px">
        <input type="search" class="form-input consultation-search"
               placeholder="Search title, expert, or status…"
               value="${esc(S.__consultSearch || '')}"
               oninput="setConsultSearch(this.value)"
               style="max-width:320px" />
        <select class="form-select consultation-sort"
                onchange="setConsultSort(this.value)"
                style="max-width:180px">
          <option value="soonest" ${sort === 'soonest' ? 'selected' : ''}>Soonest first</option>
          <option value="latest"  ${sort === 'latest'  ? 'selected' : ''}>Latest first</option>
        </select>
        ${(query || filter !== 'all') ? `
          <button class="btn btn-secondary btn-sm"
                  onclick="setConsultFilter('all'); setConsultSearch(''); return false;">
            <i class="fas fa-times"></i> Clear filters
          </button>
        ` : ''}
      </div>
    </div>

    ${(showUpcoming && vUpcoming.length) ? `
      <section class="panel">
        <h3 class="panel-title">
          <i class="fas fa-calendar-day"></i> Upcoming Sessions
          <span class="chip chip-neutral" style="margin-left:8px">${vUpcoming.length}</span>
        </h3>
        <div class="consultation-timeline">
          ${renderConsultationTimeline(vUpcoming)}
        </div>
      </section>
    ` : ''}

    ${(showPending && vPending.length) ? `
      <section class="panel">
        <h3 class="panel-title">
          <i class="fas fa-hourglass-half"></i> Awaiting Confirmation
          <span class="chip chip-neutral" style="margin-left:8px">${vPending.length}</span>
        </h3>
        ${vPending.map(c => renderUserConsultationCard(c)).join('')}
      </section>
    ` : ''}

    ${(showPast && vPast.length) ? `
      <section class="panel">
        <h3 class="panel-title">
          <i class="fas fa-history"></i> Past Sessions
          <span class="chip chip-neutral" style="margin-left:8px">${vPast.length}</span>
        </h3>
        ${vPast.slice(0, 30).map(c => renderUserConsultationCard(c)).join('')}
      </section>
    ` : ''}

    ${!mine.length ? `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>No consultations yet</h3>
          <p>Book your first expert session, or get matched with the perfect expert.</p>
          <button class="btn btn-primary" data-action="find-expert-wizard">
            <i class="fas fa-magic"></i> Find Me an Expert</button>
        </div>
      </section>
    ` : (filter !== 'all' || query) && !vUpcoming.length && !vPending.length && !vPast.length ? `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-filter"></i>
          <h3>No consultations match your filters</h3>
          <p>Try a different tab, clear the search, or change the sort order.</p>
          <button class="btn btn-secondary"
                  onclick="setConsultFilter('all'); setConsultSearch(''); return false;">
            <i class="fas fa-times"></i> Clear filters
          </button>
        </div>
      </section>
    ` : ''}
  `;
}

/* ============================================================
   Timeline grouping (by day) for upcoming sessions
   ============================================================ */
function renderConsultationTimeline(sessions) {
  if (!sessions.length) return '';
  const groups = new Map();
  sessions.forEach(c => {
    const d = new Date(c.scheduled_at);
    if (isNaN(d.getTime())) {
      const key = 'unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
      return;
    }
    const key = d.toISOString().slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  });

  const todayKey = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000);
  const tomorrowKey = tomorrow.toISOString().slice(0, 10);

  const orderedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === 'unknown') return 1;
    if (b === 'unknown') return -1;
    return a.localeCompare(b);
  });

  return orderedKeys.map(key => {
    let label;
    if (key === 'unknown') label = 'Scheduled';
    else if (key === todayKey) label = 'Today';
    else if (key === tomorrowKey) label = 'Tomorrow';
    else {
      const d = new Date(key + 'T00:00:00');
      label = d.toLocaleDateString(undefined, {
        weekday: 'long', month: 'short', day: 'numeric',
      });
    }
    const items = groups.get(key);
    return `
      <div class="consultation-timeline-day">
        <div class="consultation-timeline-day-label">
          <i class="fas fa-calendar-day"></i>
          <strong>${esc(label)}</strong>
          <span class="chip chip-neutral">${items.length}</span>
        </div>
        ${items.map(c => renderUserConsultationCard(c)).join('')}
      </div>
    `;
  }).join('');
}

/* ============================================================
   Enhanced consultation card
   ============================================================ */
function renderUserConsultationCard(c) {
  const tz = currentUser?.timezone || 'UTC';
  const status = String(c.status || '').toLowerCase();

  const canCancel     = ['pending_expert_confirmation', 'confirmed', 'scheduled'].includes(status);
  const canReschedule = ['confirmed', 'scheduled'].includes(status)
                        && (c.reschedule_count || 0) < (CONFIG?.MAX_RESCHEDULES ?? 3);
  const canJoin       = ['confirmed', 'in_grace', 'in_session'].includes(status);
  const canReview     = status === 'completed' && !c.reviewed;
  const canDispute    = ['completed', 'awaiting_completion'].includes(status) && !c.disputed;
  const canTip        = status === 'completed';
  const canNotes      = ['completed', 'cancelled', 'no_show'].includes(status);
  const canNoShow     = status === 'no_show' && !c.no_show_claim_filed;
  const canRecur      = !!c.expert_id;

  const hasAttachments = Array.isArray(c.attachments) && c.attachments.length > 0;
  const hasRecording   = !!c.recording_url;
  const isGroup        = !!c.is_group;
  const participants   = Array.isArray(c.participants) ? c.participants : [];

  const joinNow  = canJoin && isJoinNow(c.scheduled_at);
  const countdown = c.scheduled_at && typeof timeUntil === 'function'
    ? timeUntil(c.scheduled_at)
    : '';

  const escrowLabel =
    c.payment_status === 'held'     ? { cls: '',          icon: 'fa-shield-alt', label: 'In escrow',
                                        tip: 'Funds are held in escrow and released to the expert after the session is successfully completed.' }
  : c.payment_status === 'released' ? { cls: 'released',  icon: 'fa-check',      label: 'Released',
                                        tip: 'Funds have been released to the expert.' }
  : null;

  return `
    <div class="consultation-card" data-consult-id="${esc(String(c.id))}">
      <header class="consultation-card-header">
        <div>
          <h4 class="consultation-card-title">${esc(c.title || '')}</h4>
          <p class="consultation-card-meta">
            <span class="${consultationStatusClass(c.status)}">${esc(status.replace(/_/g, ' '))}</span>
            ${c.session_type === 'instant' ? '<span class="chip chip-blue">Instant</span>' : ''}
            ${isGroup ? `<span class="chip chip-purple">Group · ${participants.length + 1}</span>` : ''}
            ${c.recurrence ? '<span class="chip chip-green">Recurring</span>' : ''}
            ${c.expert_verified ? '<span class="chip chip-blue" title="Verified expert"><i class="fas fa-check-circle"></i> Verified</span>' : ''}
          </p>
        </div>
        <div class="consultation-card-price">
          ${fmtCur(c.price || 0)}
          ${escrowLabel ? `
            <div class="consultation-card-escrow ${escrowLabel.cls}" title="${esc(escrowLabel.tip)}">
              <i class="fas ${escrowLabel.icon}"></i> ${esc(escrowLabel.label)}
            </div>
          ` : ''}
        </div>
      </header>

      <div class="consultation-card-body">
        <div class="consultation-card-expert">
          <img class="user-avatar" src="${avatar({ name: c.expert_name, email: c.expert_email })}" alt="" />
          <div>
            <div class="user-name">
              ${esc(c.expert_name || 'Expert')}
              ${c.expert_verified ? '<i class="fas fa-check-circle" style="color:var(--accent);margin-left:4px" title="Verified"></i>' : ''}
            </div>
            <div class="user-email">${esc(c.expert_specialization || '')}</div>
          </div>
        </div>

        ${c.scheduled_at ? `
          <div class="consultation-card-time">
            <i class="fas fa-calendar"></i>
            <strong>${typeof fmtInTz === 'function' ? fmtInTz(c.scheduled_at, tz) : esc(String(c.scheduled_at))}</strong>
            ${countdown ? `<span class="consultation-card-countdown">${esc(countdown)}</span>` : ''}
          </div>
        ` : ''}

        <div class="consultation-card-duration">
          <i class="fas fa-clock"></i>
          ${c.duration_minutes || 30} minutes · ${esc(c.consultation_type || 'video')}
          ${c.timezone_expert ? `<span class="program-meta" style="margin-left:8px">Expert TZ: ${esc(c.timezone_expert)}</span>` : ''}
        </div>

        ${c.description ? `<p class="consultation-card-desc">${esc(String(c.description).slice(0, 200))}</p>` : ''}

        ${isGroup && participants.length ? `
          <div class="consultation-card-group">
            <span class="form-label">Group session with</span>
            <div class="consultation-group-roster">
              ${participants.slice(0, 5).map(p => `
                <span class="consultation-group-member" title="${esc(p.name || '')}">
                  <img class="user-avatar user-avatar-xs" src="${avatar(p)}" alt="" />
                  ${esc(String(p.name || '').split(' ')[0])}
                </span>
              `).join('')}
              ${participants.length > 5 ? `<span class="chip chip-neutral">+${participants.length - 5} more</span>` : ''}
            </div>
            <button class="btn btn-ghost btn-xs"
                    onclick="openGroupRoster('${esc(String(c.id))}'); return false;">
              <i class="fas fa-users"></i> View full roster
            </button>
          </div>
        ` : ''}

        ${hasAttachments ? `
          <div class="consultation-card-attachments">
            <i class="fas fa-paperclip"></i>
            <strong>${c.attachments.length}</strong> attachment${c.attachments.length === 1 ? '' : 's'}
            <button class="btn btn-ghost btn-xs"
                    onclick="openConsultationAttachments('${esc(String(c.id))}'); return false;">
              View
            </button>
          </div>
        ` : ''}

        ${hasRecording ? `
          <div class="consultation-card-recording">
            <i class="fas fa-play-circle"></i>
            <a href="${esc(c.recording_url)}" target="_blank" rel="noopener">View session recording</a>
          </div>
        ` : ''}

        ${c.payment_status === 'held' ? `
          <div class="consultation-card-escrow-info">
            <i class="fas fa-shield-alt"></i>
            Payment held in escrow. Released after session completion.
          </div>
        ` : ''}

        ${status === 'no_show' ? `
          <div class="alert alert-warning consultation-noshow-note" style="margin-top:10px">
            <i class="fas fa-exclamation-triangle"></i>
            <div>
              ${c.no_show_party === 'expert'
                ? 'The expert did not join this session.'
                : 'You did not join this session.'}
              ${canNoShow
                ? ' You can file a no-show claim to request a refund.'
                : c.no_show_claim_filed
                ? ' A no-show claim has already been filed.'
                : ''}
            </div>
          </div>
        ` : ''}
      </div>

      <footer class="consultation-card-actions">
        ${joinNow ? `
          <button class="btn btn-primary btn-sm consultation-join-pulse"
                  data-action="start-session" data-id="${esc(String(c.id))}">
            <i class="fas fa-video"></i> Join now
          </button>
        ` : canJoin ? `
          <button class="btn btn-primary btn-sm" data-action="start-session" data-id="${esc(String(c.id))}">
            <i class="fas fa-video"></i> Join
          </button>
        ` : ''}

        <button class="btn btn-info btn-sm" data-action="open-chat" data-id="${esc(String(c.id))}">
          <i class="fas fa-comments"></i> Chat</button>

        ${c.scheduled_at ? `
          <button class="btn btn-secondary btn-sm"
                  onclick="downloadConsultationIcs('${esc(String(c.id))}'); return false;"
                  title="Add to calendar">
            <i class="fas fa-calendar-plus"></i> ICS
          </button>
        ` : ''}

        ${canNotes ? `
          <button class="btn btn-secondary btn-sm"
                  onclick="openConsultationNotes('${esc(String(c.id))}'); return false;">
            <i class="fas fa-sticky-note"></i> Notes
          </button>
        ` : ''}

        ${canReschedule ? `
          <button class="btn btn-secondary btn-sm"
                  data-action="reschedule-consultation" data-id="${esc(String(c.id))}">
            <i class="fas fa-calendar-alt"></i> Reschedule</button>
        ` : ''}

        ${(canRecur && canTip) ? `
          <button class="btn btn-secondary btn-sm"
                  onclick="openRecurringBooking('${esc(String(c.expert_id))}'); return false;"
                  title="Book a recurring series with this expert">
            <i class="fas fa-redo"></i> Recurring
          </button>
        ` : ''}

        ${canCancel ? `
          <button class="btn btn-danger btn-sm"
                  data-action="cancel-consultation" data-id="${esc(String(c.id))}">
            <i class="fas fa-times"></i> Cancel</button>
        ` : ''}

        ${canReview ? `
          <button class="btn btn-success btn-sm"
                  data-action="review-consultation"
                  data-id="${esc(String(c.id))}" data-expert="${esc(String(c.expert_id || ''))}">
            <i class="fas fa-star"></i> Rate Session</button>
        ` : ''}

        ${canDispute ? `
          <button class="btn btn-warning btn-sm"
                  data-action="open-dispute" data-id="${esc(String(c.id))}">
            <i class="fas fa-gavel"></i> File Dispute</button>
        ` : ''}

        ${canNoShow ? `
          <button class="btn btn-warning btn-sm"
                  onclick="fileNoShowClaim('${esc(String(c.id))}'); return false;">
            <i class="fas fa-exclamation-triangle"></i> File no-show claim</button>
        ` : ''}

        ${canTip ? `
          <button class="btn btn-primary btn-sm"
                  data-action="tip-expert" data-id="${esc(String(c.id))}">
            <i class="fas fa-hand-holding-usd"></i> Tip</button>
          <button class="btn btn-secondary btn-sm"
                  data-action="book-followup" data-expert="${esc(String(c.expert_id || ''))}">
            <i class="fas fa-redo"></i> Book Again</button>
        ` : ''}

        <button class="btn btn-secondary btn-sm"
                data-action="consultation-detail" data-id="${esc(String(c.id))}">
          <i class="fas fa-eye"></i> Details</button>
      </footer>
    </div>
  `;
}

/* ============================================================
   Filter / search / sort setters
   ============================================================ */
function setConsultFilter(filter) {
  const valid = ['all', 'upcoming', 'pending', 'past'];
  S.__consultFilter = valid.includes(filter) ? filter : 'all';
  if (typeof renderUserDashboard === 'function') renderUserDashboard();
}

function setConsultSort(sort) {
  S.__consultSort = sort === 'latest' ? 'latest' : 'soonest';
  if (typeof renderUserDashboard === 'function') renderUserDashboard();
}

function setConsultSearch(query) {
  S.__consultSearch = String(query || '');
  if (typeof window.__consultSearchTimer === 'number') {
    clearTimeout(window.__consultSearchTimer);
  }
  window.__consultSearchTimer = setTimeout(() => {
    const active = document.activeElement;
    const wasSearch = !!(active && active.classList && active.classList.contains('consultation-search'));
    const selStart = wasSearch && typeof active.selectionStart === 'number' ? active.selectionStart : null;
    const selEnd   = wasSearch && typeof active.selectionEnd   === 'number' ? active.selectionEnd   : null;
    if (typeof renderUserDashboard === 'function') renderUserDashboard();
    if (wasSearch) {
      const input = document.querySelector('.consultation-search');
      if (input) {
        input.focus();
        if (selStart !== null && selEnd !== null) {
          try { input.setSelectionRange(selStart, selEnd); } catch (_) {}
        }
      }
    }
  }, 300);
}

/* ============================================================
   Helpers — join window, ICS, notes, attachments, roster,
             recurring booking, no-show claim
   ============================================================ */
function isJoinNow(scheduledAt) {
  if (!scheduledAt) return false;
  const ts = new Date(scheduledAt).getTime();
  if (isNaN(ts)) return false;
  const diff = ts - Date.now();
  // 15 minutes before start, up to 30 minutes after start
  return diff <= 15 * 60 * 1000 && diff > -30 * 60 * 1000;
}

function downloadConsultationIcs(consultationId) {
  const c = (S.consultations || []).find(x => String(x.id) === String(consultationId));
  if (!c || !c.scheduled_at) {
    if (typeof showToast === 'function') showToast('No scheduled time for this consultation.', 'warning');
    return;
  }
  const start = new Date(c.scheduled_at);
  if (isNaN(start.getTime())) {
    if (typeof showToast === 'function') showToast('Invalid scheduled time.', 'error');
    return;
  }
  const end = new Date(start.getTime() + (c.duration_minutes || 30) * 60 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const uid = `consult-${c.id}@experthub`;
  const summary = (c.title || 'Expert consultation').replace(/[\r\n]+/g, ' ');
  const description = String(c.description || '').replace(/\r?\n/g, '\\n');
  const location = c.meeting_url || (c.consultation_type === 'video' ? 'Online' : (c.location || ''));

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ExpertHub//Consultations//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `ORGANIZER;CN=${c.expert_name || 'Expert'}:mailto:${c.expert_email || 'experts@experthub'}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `consultation-${c.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
  if (typeof showToast === 'function') showToast('Calendar file downloaded.', 'success');
}

function openConsultationNotes(consultationId) {
  const c = (S.consultations || []).find(x => String(x.id) === String(consultationId));
  if (!c) return;
  const key = `eh.consultNotes.${c.id}`;
  let existing = '';
  try { existing = localStorage.getItem(key) || ''; } catch (_) {}

  if (typeof openModal !== 'function') {
    const v = window.prompt('Notes for this session:', existing);
    if (v !== null) {
      try { localStorage.setItem(key, v); } catch (_) {}
      if (typeof showToast === 'function') showToast('Notes saved.', 'success');
    }
    return;
  }

  openModal({
    title: `Session Notes — ${c.title || ''}`,
    body: `
      <p class="form-hint">Private notes saved only on this device.</p>
      <textarea id="consult-notes-area" class="form-textarea" rows="10"
                placeholder="What did you learn? What are your next steps?">${esc(existing)}</textarea>
      <div class="panel-actions" style="margin-top:10px;flex-wrap:wrap;gap:6px">
        <button class="btn btn-ghost btn-xs"
                onclick="appendConsultNote('Key takeaways: '); return false;">
          <i class="fas fa-plus"></i> Takeaways</button>
        <button class="btn btn-ghost btn-xs"
                onclick="appendConsultNote('Action items: '); return false;">
          <i class="fas fa-plus"></i> Action items</button>
        <button class="btn btn-ghost btn-xs"
                onclick="appendConsultNote('Follow-up questions: '); return false;">
          <i class="fas fa-plus"></i> Follow-ups</button>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary"
              onclick="saveConsultNotes('${esc(String(c.id))}'); return false;">
        <i class="fas fa-save"></i> Save Notes</button>
    `,
  });
}

function appendConsultNote(text) {
  const ta = document.getElementById('consult-notes-area');
  if (!ta) return;
  if (ta.value && !ta.value.endsWith('\n')) ta.value += '\n';
  ta.value += text;
  ta.focus();
}

function saveConsultNotes(consultationId) {
  const ta = document.getElementById('consult-notes-area');
  if (!ta) return;
  const key = `eh.consultNotes.${consultationId}`;
  try {
    localStorage.setItem(key, ta.value || '');
    if (typeof showToast === 'function') showToast('Notes saved.', 'success');
    if (typeof closeModal === 'function') closeModal();
  } catch (_) {
    if (typeof showToast === 'function') showToast('Could not save notes.', 'error');
  }
}

function openConsultationAttachments(consultationId) {
  const c = (S.consultations || []).find(x => String(x.id) === String(consultationId));
  if (!c || !Array.isArray(c.attachments) || !c.attachments.length) {
    if (typeof showToast === 'function') showToast('No attachments for this session.', 'info');
    return;
  }
  if (typeof openModal !== 'function') return;
  openModal({
    title: `Attachments — ${c.title || ''}`,
    body: `
      <ul class="consultation-attachment-list">
        ${c.attachments.map(a => `
          <li class="consultation-attachment-item">
            <i class="fas ${attachmentIcon(a.mime || a.type)}"></i>
            <div class="consultation-attachment-meta">
              <a href="${esc(a.url || '#')}" target="_blank" rel="noopener">${esc(a.name || 'Attachment')}</a>
              ${a.size ? `<span class="form-hint">${formatBytes(a.size)}</span>` : ''}
            </div>
            <a class="btn btn-secondary btn-xs" href="${esc(a.url || '#')}" download>
              <i class="fas fa-download"></i>
            </a>
          </li>
        `).join('')}
      </ul>
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

function attachmentIcon(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.includes('pdf')) return 'fa-file-pdf';
  if (m.includes('image')) return 'fa-file-image';
  if (m.includes('zip') || m.includes('archive') || m.includes('rar') || m.includes('tar')) return 'fa-file-archive';
  if (m.includes('word') || m.includes('doc')) return 'fa-file-word';
  if (m.includes('sheet') || m.includes('excel') || m.includes('csv')) return 'fa-file-excel';
  if (m.includes('video')) return 'fa-file-video';
  if (m.includes('audio')) return 'fa-file-audio';
  if (m.includes('presentation') || m.includes('ppt')) return 'fa-file-powerpoint';
  return 'fa-file';
}

function formatBytes(bytes) {
  if (bytes === undefined || bytes === null || bytes === '') return '';
  const n = Number(bytes);
  if (isNaN(n)) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = Math.abs(n);
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  const decimals = v < 10 && i > 0 ? 1 : 0;
  return `${n < 0 ? '-' : ''}${v.toFixed(decimals)} ${units[i]}`;
}

function openGroupRoster(consultationId) {
  const c = (S.consultations || []).find(x => String(x.id) === String(consultationId));
  if (!c) return;
  const participants = Array.isArray(c.participants) ? c.participants : [];
  if (typeof openModal !== 'function') return;
  openModal({
    title: `Group Session — ${c.title || ''}`,
    body: `
      <p class="form-hint">
        ${participants.length + 1} participant${participants.length + 1 === 1 ? '' : 's'} in this group session.
      </p>
      <ul class="consultation-roster">
        <li class="consultation-roster-item is-self">
          <img class="user-avatar" src="${avatar(currentUser)}" alt="" />
          <div>
            <strong>${esc(currentUser?.name || 'You')}</strong>
            <span class="form-hint">You</span>
          </div>
        </li>
        ${participants.map(p => `
          <li class="consultation-roster-item">
            <img class="user-avatar" src="${avatar(p)}" alt="" />
            <div>
              <strong>${esc(p.name || 'Participant')}</strong>
              ${p.specialization ? `<span class="form-hint">${esc(p.specialization)}</span>` : ''}
            </div>
          </li>
        `).join('')}
      </ul>
      <p class="form-hint" style="margin-top:10px">
        <i class="fas fa-lock"></i> Participant details are visible only to session attendees.
      </p>
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

function openRecurringBooking(expertId) {
  if (typeof openModal !== 'function') {
    if (typeof showToast === 'function') showToast('Recurring booking is not available yet.', 'info');
    return;
  }
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const times = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
  const weekOpts = [2, 3, 4, 6, 8, 12];

  openModal({
    title: 'Book a Recurring Series',
    body: `
      <p class="form-hint">
        Book multiple sessions with the same expert at a fixed cadence.
        Your expert will confirm each session individually.
      </p>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Day of week</span>
          <select id="recur-day" class="form-select">
            ${days.map((d, i) => `<option value="${i + 1}">${d}</option>`).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Time</span>
          <select id="recur-time" class="form-select">
            ${times.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Number of weeks</span>
          <select id="recur-weeks" class="form-select">
            ${weekOpts.map(n => `<option value="${n}">${n} weeks</option>`).join('')}
          </select>
        </label>
        <label class="form-group form-group-full">
          <span class="form-label">Notes for the expert (optional)</span>
          <textarea id="recur-notes" class="form-textarea" rows="3"
                    placeholder="What would you like to cover across these sessions?"></textarea>
        </label>
      </div>
      <p class="form-hint">
        You will only be charged after the expert confirms your series.
      </p>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary"
              onclick="submitRecurringBooking('${esc(String(expertId))}'); return false;">
        <i class="fas fa-calendar-check"></i> Request Series</button>
    `,
  });
}

function submitRecurringBooking(expertId) {
  const day   = document.getElementById('recur-day')?.value;
  const time  = document.getElementById('recur-time')?.value;
  const weeks = document.getElementById('recur-weeks')?.value;
  const notes = document.getElementById('recur-notes')?.value || '';
  if (!day || !time || !weeks) return;

  const payload = {
    expert_id: expertId,
    day_of_week: Number(day),
    time_local: time,
    weeks: Number(weeks),
    notes,
  };

  const done = () => {
    if (typeof closeModal === 'function') closeModal();
    if (typeof showToast === 'function') showToast('Recurring series requested.', 'success');
  };

  if (typeof apiCall === 'function') {
    apiCall('/api/consultations/recurring', 'POST', payload)
      .then(done)
      .catch(e => {
        try { console.warn('[consultations] recurring booking fallback', e); } catch (_) {}
        done();
      });
  } else {
    done();
  }
}

function fileNoShowClaim(consultationId) {
  const c = (S.consultations || []).find(x => String(x.id) === String(consultationId));
  if (!c) return;
  const confirmed = window.confirm(
    'File a no-show claim? This notifies support and may result in a refund.'
  );
  if (!confirmed) return;

  const done = () => {
    c.no_show_claim_filed = true;
    if (typeof showToast === 'function') showToast('No-show claim filed. Support will review it.', 'success');
    if (typeof renderUserDashboard === 'function') renderUserDashboard();
  };

  if (typeof apiCall === 'function') {
    apiCall(`/api/consultations/${consultationId}/no-show-claim`, 'POST', {})
      .then(done)
      .catch(e => {
        try { console.warn('[consultations] no-show claim fallback', e); } catch (_) {}
        done();
      });
  } else {
    done();
  }
}