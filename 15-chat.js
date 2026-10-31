/* ============================================================
   ExpertHub 2.0 — 15-chat.js
   Consultation chat: open, message polling, send, close.
   Supplies openChat / closeChat / sendMessage for 14-actions.js.
   ============================================================ */

/* Globals shared with 14-actions.js (case 'send-chat', 'open-video') */
let currentChatId  = null;
let chatPollTimer  = null;
let chatMessages   = [];

/* ---------- Open chat ---------- */
async function openChat(consultationId) {
  const id = Number(consultationId);
  if (!id) return showToast('No consultation selected', 'error');

  currentChatId = id;
  chatMessages  = [];

  const c = S.consultations.find(x => String(x.id) === String(id));
  const title = c ? `Chat · ${esc(c.title || 'Consultation')}` : 'Chat';

  openModal({
    title,
    className: 'chat-modal modal-lg',
    body: `
      <div class="chat-container">
        <div class="chat-messages" id="chat-messages">
          <p class="empty-row">Loading messages…</p>
        </div>
        <div class="chat-composer">
          <textarea id="chat-input" class="form-textarea" rows="1"
                    placeholder="Type a message… (Enter to send)"></textarea>
          <button id="chat-send-btn" class="btn btn-primary">
            <i class="fas fa-paper-plane"></i> Send
          </button>
        </div>
      </div>`,
    footer: `
      <button class="btn btn-secondary" id="chat-close-btn">Close</button>
      ${c && c.status !== 'completed'
        ? `<button class="btn btn-info" data-action="open-video">
             <i class="fas fa-video"></i> Video</button>
           <button class="btn btn-warning" data-action="end-session" data-id="${id}">
             <i class="fas fa-stop"></i> End Session</button>`
        : ''}`,
  });

  /* Proper cleanup on Close — do NOT use data-close-modal here */
  $('#chat-close-btn').onclick = closeChat;

  /* Send button + Enter key */
  const input = $('#chat-input');
  const sendBtn = $('#chat-send-btn');
  sendBtn.onclick = () => sendMessage(currentChatId, input.value);
  input.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(currentChatId, input.value);
    }
  };
  input.focus();

  /* Initial load + self-cleaning poll */
  await loadChatMessages();
  startChatPolling();
}

/* ---------- Poll ---------- */
function startChatPolling() {
  if (chatPollTimer) clearInterval(chatPollTimer);
  chatPollTimer = setInterval(async () => {
    /* If the modal was closed some other way (overlay, Esc), stop polling */
    if (!$('#chat-messages')) return closeChat();
    await loadChatMessages();
  }, 5000);
}

async function loadChatMessages() {
  if (!currentChatId) return;
  try {
    const d = await apiCall(`/api/consultations/${currentChatId}/messages`);
    chatMessages = d.messages || [];
    renderChatMessages();
  } catch (e) {
    /* Silent on poll — the user should not get spammed */
    if (e.status && e.status >= 400) showToast(e.message, 'error');
  }
}

function renderChatMessages() {
  const box = $('#chat-messages');
  if (!box) return;

  if (!chatMessages.length) {
    box.innerHTML = '<p class="empty-row">No messages yet — say hello!</p>';
    return;
  }

  const myId = currentUser?.id;
  box.innerHTML = chatMessages.map(m => {
    const mine = String(m.sender_id) === String(myId);
    return `
      <div class="chat-msg ${mine ? 'chat-msg-mine' : 'chat-msg-theirs'}">
        <div class="chat-msg-meta">
          <strong>${esc(m.sender_name || (mine ? 'You' : 'Them'))}</strong>
          <span>${fmtDT(m.created_at)}</span>
        </div>
        <div class="chat-msg-body">${esc(m.content || m.message || '')}</div>
      </div>`;
  }).join('');

  box.scrollTop = box.scrollHeight;
}

/* ---------- Send ---------- */
async function sendMessage(consultationId, text) {
  const body = (text || '').trim();
  if (!consultationId || !body) return;

  try {
    await apiCall(`/api/consultations/${consultationId}/messages`, 'POST', { content: body });
    const input = $('#chat-input');
    if (input) { input.value = ''; input.focus(); }
    await loadChatMessages();
  } catch (e) {
    showToast(e.message || 'Message failed', 'error');
  }
}

/* ---------- Close ---------- */
function closeChat() {
  if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
  currentChatId = null;
  chatMessages = [];
  closeModal();
}
