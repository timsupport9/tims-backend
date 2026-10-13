/* ============================================================
   actions/consultation-actions.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function viewConsultation(id) {
    const c = (EH.state.consultations || []).find(x => String(x.id) === String(id));
    if (!c) return;
    EH.Modal.open({
      title: c.title || 'Consultation',
      body: `
        <p><strong>Client:</strong> ${EH.Fmt.esc(c.client_name || '-')}</p>
        <p><strong>Expert:</strong> ${EH.Fmt.esc(c.expert_name || 'Unassigned')}</p>
        <p><strong>Status:</strong> <span class="${EH.Fmt.statusClass(c.status)}">${EH.Fmt.esc(c.status)}</span></p>
        <p><strong>Type:</strong> ${EH.Fmt.esc(c.consultation_type || '')}</p>
        <p><strong>Priority:</strong> ${EH.Fmt.esc(c.priority || '')}</p>
        <p><strong>Description:</strong> ${EH.Fmt.esc(c.description || '')}</p>
        <p><strong>Created:</strong> ${EH.Dates.fmtDateTime(c.created_at)}</p>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  }

  function bookExpert(expertId, expertName) {
    EH.Modal.open({
      title: `Book ${EH.Fmt.esc(expertName || 'Expert')}`,
      body: `
        <label class="form-group"><span class="form-label">Title</span>
          <input id="bkTitle" class="form-input" /></label>
        <label class="form-group">
          <span class="form-label">Type</span>
          <select id="bkType" class="form-select">
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="chat">Chat</option>
          </select>
        </label>
        <label class="form-group"><span class="form-label">Describe your issue</span>
          <textarea id="bkDesc" class="form-textarea" rows="4"></textarea></label>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
               <button id="bkSave" class="btn btn-primary">Book</button>`,
    });
    document.getElementById('bkSave').onclick = async () => {
      const title = document.getElementById('bkTitle').value;
      const description = document.getElementById('bkDesc').value;
      if (!title || !description) return EH.Toast.error('Fill all fields');
      try {
        await EH.API.post('/api/user/consultations', {
          title, description,
          consultation_type: document.getElementById('bkType').value,
          expert_id: Number(expertId),
        });
        EH.Modal.close();
        await EH.Data.reload.consultations();
        EH.NavigationActions.switchTab(EH.state.activeTab);
        EH.Toast.success('Consultation booked');
      } catch (e) { EH.Toast.error(e.message); }
    };
  }

  function newConsultation() {
    const experts = EH.state.experts || [];
    EH.Modal.open({
      title: 'Request Consultation',
      body: `
        <label class="form-group"><span class="form-label">Title</span>
          <input id="ncTitle" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Expert (optional)</span>
          <select id="ncExpert" class="form-select">
            <option value="">Any available expert</option>
            ${experts.map(e => `<option value="${e.id}">${EH.Fmt.esc(e.name)}</option>`).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Type</span>
          <select id="ncType" class="form-select">
            <option value="career">Career</option>
            <option value="academic">Academic</option>
            <option value="business">Business</option>
            <option value="technical">Technical</option>
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Priority</span>
          <select id="ncPriority" class="form-select">
            <option value="low">Low</option>
            <option value="normal" selected>Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <label class="form-group"><span class="form-label">Description</span>
          <textarea id="ncDesc" class="form-textarea" rows="4"></textarea></label>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
               <button id="ncSave" class="btn btn-primary">Submit</button>`,
    });
    document.getElementById('ncSave').onclick = async () => {
      const title = document.getElementById('ncTitle').value;
      const description = document.getElementById('ncDesc').value;
      if (!title || !description) return EH.Toast.error('Fill all fields');
      try {
        await EH.API.post('/api/user/consultations', {
          title, description,
          consultation_type: document.getElementById('ncType').value,
          priority: document.getElementById('ncPriority').value,
          expert_id: document.getElementById('ncExpert').value
            ? Number(document.getElementById('ncExpert').value) : null,
        });
        EH.Modal.close();
        await EH.Data.reload.consultations();
        EH.NavigationActions.switchTab(EH.state.activeTab);
        EH.Toast.success('Consultation requested');
      } catch (e) { EH.Toast.error(e.message); }
    };
  }

  function openVideoCall(cid) {
    if (!cid) return EH.Toast.error('No consultation selected');
    const room = `experthub-${cid}-${EH.Fmt.uid(6)}`;
    EH.Modal.open({
      title: 'Video Call',
      className: 'chat-modal',
      body: `
        <div class="chat-video-wrap">
          <iframe src="https://meet.jit.si/${room}"
                  allow="camera;microphone;fullscreen;display-capture"
                  style="width:100%;height:100%;border:0" title="Video call"></iframe>
        </div>
        <p class="form-hint">Room ID: <code class="code">${room}</code></p>`,
      footer: `<button class="btn btn-secondary" data-close-modal>End call</button>`,
    });
  }

  EH.ConsultationActions = { viewConsultation, bookExpert, newConsultation, openVideoCall };
})(window);
