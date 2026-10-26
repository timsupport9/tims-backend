/* ============================================================
   dashboards/expert/consultation-room.js
   ============================================================ */

let __roomTimer = null;
let __roomSeconds = 0;
let __roomConsultationId = null;

function renderExpertConsultationRoom() {
  const activeRoom = S.__activeRoom;
  const consultations = S.consultations.filter(c =>
    c.expert_id === currentUser?.id &&
    ['confirmed','scheduled','assigned','in_grace','in_progress','in_session'].includes(c.status)
  );

  if (!activeRoom) {
    return `
      <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultation Room</span></div>
      <section class="page-header"><h1 class="page-title">Consultation Room</h1></section>

      <div class="alert alert-info">
        <i class="fas fa-shield-halved"></i>
        <div>
          Secure video, audio and screen-sharing room.
          All sessions are recorded only with mutual consent.
        </div>
      </div>

      <section class="panel">
        <h3 class="panel-title">Ready to start</h3>
        ${consultations.length ? `
          <ul class="list-stack">
            ${consultations.map(c => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(c.title || '')}</span>
                  <span class="list-row-sub">
                    ${esc(c.client_name || 'Client')} ·
                    ${c.scheduled_at ? fmtInTz(c.scheduled_at, currentUser?.timezone || 'UTC') : '—'}
                    · ${c.duration_minutes || 30} min
                  </span>
                </div>
                <button class="btn btn-primary btn-sm" data-expert-action="room-join" data-id="${c.id}">
                  <i class="fas fa-video"></i> Open Room</button>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-row">No consultations ready to start.</p>'}
      </section>
    `;
  }

  const c = S.consultations.find(x => String(x.id) === String(activeRoom));
  if (!c) {
    S.__activeRoom = null;
    return renderExpertConsultationRoom();
  }

  const roomId = `expert-room-${c.id}`;

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Consultation Room</span></div>
    <section class="page-header">
      <h1 class="page-title">${esc(c.title || '')}</h1>
      <div class="page-actions">
        <span class="chip chip-blue" id="room-timer">00:00</span>
        <button class="btn btn-danger" data-expert-action="room-end">
          <i class="fas fa-stop"></i> End Session</button>
      </div>
    </section>

    <div class="consultation-room">
      <div class="room-video-pane">
        <iframe src="https://meet.jit.si/${roomId}"
                allow="camera;microphone;fullscreen;display-capture"
                style="width:100%;height:600px;border:0;border-radius:12px"
                title="Consultation Room"></iframe>
      </div>
      <aside class="room-sidebar">
        <div class="panel">
          <h3 class="panel-title">Session Info</h3>
          <p><strong>Client:</strong> ${esc(c.client_name || 'Client')}</p>
          <p><strong>Duration:</strong> ${c.duration_minutes || 30} min</p>
          <p><strong>Status:</strong> <span class="${consultationStatusClass(c.status)}">${esc(c.status?.replace(/_/g,' '))}</span></p>
          <p><strong>Room ID:</strong> <code class="code">${roomId}</code></p>
        </div>

        <div class="panel">
          <h3 class="panel-title">Controls</h3>
          <button class="btn btn-secondary btn-block" data-expert-action="room-toggle-mic">
            <i class="fas fa-microphone"></i> <span id="room-mic-status">Mic on</span></button>
          <button class="btn btn-secondary btn-block" data-expert-action="room-toggle-camera">
            <i class="fas fa-video"></i> <span id="room-camera-status">Camera on</span></button>
          <button class="btn btn-secondary btn-block" data-expert-action="room-share-screen">
            <i class="fas fa-desktop"></i> Share screen</button>
        </div>

        <div class="panel">
          <h3 class="panel-title">Session Notes</h3>
          <textarea id="roomNotes" class="form-textarea" rows="6"
                    placeholder="Notes saved on end of session…"></textarea>
          <button class="btn btn-primary btn-block" data-expert-action="manage-notes" data-id="${c.id}">
            <i class="fas fa-save"></i> Save Notes</button>
        </div>
      </aside>
    </div>
  `;
}

function joinConsultationRoom(id) {
  S.__activeRoom = id;
  __roomConsultationId = id;
  __roomSeconds = 0;
  if (__roomTimer) clearInterval(__roomTimer);
  __roomTimer = setInterval(() => {
    __roomSeconds++;
    const el = document.getElementById('room-timer');
    if (el) {
      const m = String(Math.floor(__roomSeconds / 60)).padStart(2, '0');
      const s = String(__roomSeconds % 60).padStart(2, '0');
      el.textContent = `${m}:${s}`;
    }
  }, 1000);
  rerenderExpertContent();
}

function leaveConsultationRoom() {
  if (__roomTimer) { clearInterval(__roomTimer); __roomTimer = null; }
  S.__activeRoom = null;
  __roomConsultationId = null;
  showToast('Room left', 'info');
  rerenderExpertContent();
}

async function endConsultationRoom() {
  if (__roomConsultationId) {
    try {
      await apiCall(`/api/expert/consultations/${__roomConsultationId}/end`, 'PUT');
      await reloadConsultations();
    } catch (e) { showToast(e.message, 'error'); }
  }
  if (__roomTimer) { clearInterval(__roomTimer); __roomTimer = null; }
  S.__activeRoom = null;
  __roomConsultationId = null;
  showToast('Session ended', 'success');
  activeTab = 'consultations';
  rerenderExpertContent();
}
