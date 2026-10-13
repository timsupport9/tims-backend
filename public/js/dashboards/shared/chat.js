/* ============================================================
   dashboards/shared/chat.js — Chat modal
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  let typingTimer = null;

  function render() {
    return `
      <div id="chat-modal" class="modal-overlay hidden">
        <div class="modal-content chat-modal">
          <header class="chat-header">
            <div>
              <h3 class="chat-title" id="chat-title">Consultation</h3>
              <p class="chat-sub" id="chat-sub"></p>
            </div>
            <div class="chat-header-actions">
              <button class="icon-btn" data-action="open-video" aria-label="Video call">
                <i class="fas fa-video"></i>
              </button>
              <button class="icon-btn" data-chat-close aria-label="Close chat">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </header>
          <div id="chat-messages" class="chat-messages"></div>
          <div class="chat-typing" id="chat-typing"></div>
          <div class="chat-input-row">
            <label class="chat-attach">
              <i class="fas fa-paperclip"></i>
              <input type="file" hidden id="chat-file" />
            </label>
            <input id="chat-input" class="form-input" placeholder="Type your message..." />
            <button class="btn btn-primary" data-action="send-chat" aria-label="Send">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>`;
  }

  function renderMessages(cid) {
    const c = document.getElementById('chat-messages');
    if (!c) return;
    const msgs = EH.state.chatMessages[cid] || [];
    const me = EH.state.currentUser?.id;
    c.innerHTML = msgs.map(m => `
      <div class="chat-message ${m.sender_id === me ? 'chat-message-sent' : 'chat-message-received'}">
        ${m.attachment_url ? `
          <a class="chat-attachment" href="${EH.Fmt.esc(m.attachment_url)}" target="_blank">
            <i class="fas fa-paperclip"></i> Attachment
          </a>` : ''}
        <p class="chat-text">${EH.Fmt.esc(m.message || '')}</p>
        <span class="chat-meta">
          ${EH.Fmt.esc(m.sender_name || '')} · ${EH.Dates.timeAgo(m.created_at)}${m.read_at ? ' · Read' : ''}
        </span>
      </div>
    `).join('') || '<p class="empty-row">No messages yet.</p>';
    c.scrollTop = c.scrollHeight;
  }

  async function open(cid) {
    EH.state.currentChatId = cid;
    const modal = document.getElementById('chat-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const c = EH.state.consultations.find(x => x.id === cid);
    document.getElementById('chat-title').textContent = c?.title || 'Consultation';
    document.getElementById('chat-sub').textContent = `${c?.status || ''} · ${c?.consultation_type || ''}`;

    EH.Socket?.join?.(cid);
    try {
      const d = await EH.API.get(`/api/common/consultations/${cid}/messages`);
      EH.state.chatMessages[cid] = d.messages || [];
    } catch (_) {
      EH.state.chatMessages[cid] = EH.state.chatMessages[cid] || [];
    }
    renderMessages(cid);

    const input = document.getElementById('chat-input');
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send(cid, e.target.value);
        return;
      }
      EH.Socket?.typing?.(cid, true);
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => EH.Socket?.typing?.(cid, false), 1200);
    };

    const fileInput = document.getElementById('chat-file');
    fileInput.onchange = (e) => uploadFile(cid, e.target.files[0]);
  }

  function close() {
    if (EH.state.currentChatId) EH.Socket?.leave?.(EH.state.currentChatId);
    document.getElementById('chat-modal')?.classList.add('hidden');
    EH.state.currentChatId = null;
  }

  async function send(cid, text) {
    if (!text?.trim()) return;
    try {
      await EH.API.post(`/api/common/consultations/${cid}/messages`, { message: text });
      const input = document.getElementById('chat-input');
      if (input) input.value = '';
    } catch (e) {
      EH.Toast.error(e.message);
    }
  }

  async function uploadFile(cid, file) {
    if (!file) return;
    const fd = new FormData();
    fd.append('attachments', file);
    try {
      EH.Loading.show();
      await EH.API.upload(`/api/common/consultations/${cid}/attachments`, fd);
      EH.Toast.success('File uploaded');
    } catch (e) {
      EH.Toast.error(e.message);
    } finally {
      EH.Loading.hide();
    }
  }

  EH.ChatModal = { render, open, close, send, renderMessages };
  global.openChat = open;
  global.closeChat = close;
  global.sendMessage = send;
  global.uploadChatFile = uploadFile;

  // Socket typing hook
  EH.bus?.on('chat:typing', ({ consultation_id, user_id, is_typing }) => {
    if (EH.state.currentChatId !== consultation_id) return;
    const el = document.getElementById('chat-typing');
    if (!el) return;
    el.textContent = (is_typing && user_id !== EH.state.currentUser?.id) ? 'typing…' : '';
  });
  EH.bus?.on('chat:message', ({ cid }) => {
    if (EH.state.currentChatId === cid) renderMessages(cid);
  });
})(window);
