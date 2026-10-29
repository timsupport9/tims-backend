/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/ai-assistant.js (NEW) */
/* Stage 8 §22.1-22.2: backend-mediated assistant. NO provider */
/* keys in the browser. AI output is clearly distinguished from */
/* verified records. Report action; usage limits shown. */
/* ============================================================ */

S.aiConversations = S.aiConversations || [];
S.aiUsage         = S.aiUsage         || null;
S.aiEnabled       = S.aiEnabled       || false;

let __aiLoaded = false;

async function _loadAIState({ force = false } = {}) {
  if (__aiLoaded && !force) return;
  const [cfg, conv, usage] = await Promise.allSettled([
    apiCall('/api/ai/config').catch(() => null),
    apiCall('/api/ai/conversations?limit=10').catch(() => ({ conversations: [] })),
    apiCall('/api/ai/usage').catch(() => null),
  ]);
  if (cfg.status === 'fulfilled' && cfg.value) {
    S.aiEnabled = !!cfg.value.enabled;
    S.aiCapabilities = cfg.value.capabilities || [];
  }
  if (conv.status === 'fulfilled' && conv.value) {
    S.aiConversations = conv.value.conversations || [];
  }
  if (usage.status === 'fulfilled' && usage.value) {
    S.aiUsage = usage.value;
  }
  __aiLoaded = true;
}

function renderUserAIAssistant() {
  if (!__aiLoaded) {
    _loadAIState().then(() => rerenderRoleContent()).catch(() => {});
    return UserUI.page({
      title: 'AI Assistant',
      breadcrumb: 'AI Assistant',
      content: UserUI.loading('Loading assistant…'),
    });
  }

  if (!S.aiEnabled) {
    return UserUI.page({
      title: 'AI Assistant',
      breadcrumb: 'AI Assistant',
      content: `
        <section class="panel">${UserUI.empty({
          icon: 'fa-robot',
          title: 'AI Assistant is not enabled',
          desc: 'This feature is currently unavailable. Contact support if you believe this is an error.',
        })}</section>
      `,
    });
  }

  const usage = S.aiUsage || {};

  return UserUI.page({
    title: 'AI Assistant',
    breadcrumb: 'AI Assistant',
    actions: `
      <button class="btn btn-secondary" data-action="ai-clear-conversation">
        <i class="fas fa-eraser"></i> Clear</button>
      <button class="btn btn-secondary" data-action="ai-history">
        <i class="fas fa-history"></i> History</button>
    `,
    content: `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        <div>
          The AI Assistant can make mistakes. It is <strong>not</strong> a source of verified
          records — for grades, certificates, payments, or bookings, always refer to the
          corresponding dashboard view. You can report problematic responses.
          ${usage.remaining != null
            ? `<br/><span class="form-hint">Messages remaining today: <strong>${usage.remaining}</strong></span>` : ''}
        </div>
      </div>

      <section class="panel">
        <div id="aiMessages" class="ai-messages" style="max-height:55vh;overflow-y:auto;padding:12px;background:var(--surface-2);border-radius:8px">
          <p class="form-hint" style="text-align:center">
            Ask about courses, consultations, career pathways, or platform features.
          </p>
        </div>

        <div class="ai-composer" style="display:flex;gap:8px;margin-top:12px">
          <textarea id="aiInput" class="form-textarea" rows="3"
                    placeholder="Type your question..." style="flex:1"
                    maxlength="2000" aria-label="Your question"></textarea>
          <button id="aiSend" class="btn btn-primary" style="align-self:flex-end">
            <i class="fas fa-paper-plane"></i> Send</button>
        </div>
        <p class="form-hint" style="margin-top:6px">
          <i class="fas fa-shield-alt"></i>
          Your question is processed on our servers. We do not send your private records to the AI provider
          unless the request needs them and you have authorized access.
        </p>
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('ai-assistant', renderUserAIAssistant);

window.ExpertHubUser.registerModule('ai-assistant', renderUserAIAssistant, {
  init() {
    const send = document.getElementById('aiSend');
    const input = document.getElementById('aiInput');
    if (!send || !input) return;

    const submit = async () => {
      const message = input.value.trim();
      if (!message) return;
      if (send.disabled) return;

      // Render user bubble immediately
      const host = document.getElementById('aiMessages');
      host.insertAdjacentHTML('beforeend', `
        <div class="ai-bubble ai-bubble-user" style="text-align:right;margin-bottom:8px">
          <p style="display:inline-block;background:var(--brand);color:#fff;padding:8px 12px;border-radius:8px;max-width:80%">${esc(message)}</p>
        </div>
      `);
      input.value = '';
      send.disabled = true;

      // Loading indicator
      const loadingId = `ai_loading_${Date.now()}`;
      host.insertAdjacentHTML('beforeend', `
        <div id="${loadingId}" class="form-hint" style="margin-bottom:8px">
          <i class="fas fa-circle-notch fa-spin"></i> Thinking…
        </div>
      `);
      host.scrollTop = host.scrollHeight;

      try {
        const d = await apiCall('/api/ai/assistant', 'POST', {
          message,
          // Frontend only requests context scopes it already has; server still enforces.
          requested_context: ['courses', 'career', 'platform-help'],
        });

        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();

        const reply = d?.reply || d?.message || 'No response.';
        const isVerifiedData = !!d?.from_verified_records;
        const citations = Array.isArray(d?.citations) ? d.citations : [];

        host.insertAdjacentHTML('beforeend', `
          <div class="ai-bubble ai-bubble-assistant" style="margin-bottom:8px">
            <div style="background:var(--surface);border:1px solid var(--border);padding:12px;border-radius:8px;max-width:90%">
              ${isVerifiedData
                ? '<span class="chip chip-green" style="margin-bottom:6px"><i class="fas fa-check-shield"></i> Verified records</span>'
                : '<span class="chip chip-neutral" style="margin-bottom:6px"><i class="fas fa-robot"></i> AI-generated</span>'}
              <div style="white-space:pre-wrap">${esc(reply)}</div>
              ${citations.length ? `
                <p class="form-hint" style="margin-top:8px">
                  <strong>Sources:</strong>
                  ${citations.map(c => esc(c.title || c.reference || '')).join(' · ')}
                </p>` : ''}
              <div style="margin-top:8px;text-align:right">
                <button class="btn-ghost btn-xs" data-action="ai-report" data-id="${d.message_id || ''}">
                  <i class="fas fa-flag"></i> Report</button>
              </div>
            </div>
          </div>
        `);
        host.scrollTop = host.scrollHeight;

        // Refresh usage
        const u = await apiCall('/api/ai/usage').catch(() => null);
        if (u) S.aiUsage = u;
      } catch (e) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        const msg = String(e?.message || '');
        if (/rate|limit|quota/i.test(msg)) {
          host.insertAdjacentHTML('beforeend', `
            <div class="alert alert-warning" style="margin-bottom:8px">
              <i class="fas fa-clock"></i> You have reached your AI message limit for today. Try again tomorrow.
            </div>
          `);
        } else {
          host.insertAdjacentHTML('beforeend', `
            <div class="alert alert-danger" style="margin-bottom:8px">
              <i class="fas fa-exclamation-triangle"></i> ${esc(msg || 'Request failed')}
            </div>
          `);
        }
        host.scrollTop = host.scrollHeight;
      } finally {
        send.disabled = false;
      }
    };

    send.onclick = submit;
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    };
  },
});

/* ============================================================ */
/* Actions */
/* ============================================================ */

window.ExpertHubUser.registerAction('ai-report', (id) => {
  UserUI.formModal({
    title: 'Report AI Response',
    fields: [
      { name: 'reason', label: 'Reason', type: 'select', required: true,
        options: [
          { value: 'incorrect',  label: 'Factually incorrect' },
          { value: 'harmful',    label: 'Harmful or inappropriate' },
          { value: 'hallucinated', label: 'Made up information' },
          { value: 'unsafe-advice', label: 'Unsafe advice' },
          { value: 'other',      label: 'Other' },
        ]},
      { name: 'details', label: 'Details', type: 'textarea', rows: 3 },
    ],
    submitLabel: 'Submit Report',
    onSubmit: async (v) => {
      await apiCall('/api/ai/report', 'POST', {
        message_id: id || null, reason: v.reason, details: v.details || null,
      });
      closeModal();
      showToast('Report submitted', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('ai-clear-conversation', async () => {
  if (!await confirmDialog('Clear this conversation? Your history with the assistant will be reset.')) return;
  try {
    await apiCall('/api/ai/conversations/current', 'DELETE');
    const host = document.getElementById('aiMessages');
    if (host) host.innerHTML = '<p class="form-hint" style="text-align:center">Conversation cleared.</p>';
    showToast('Conversation cleared', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('ai-history', async () => {
  try {
    showLoading(true);
    const d = await apiCall('/api/ai/conversations?limit=30').catch(() => ({ conversations: [] }));
    closeModal();
    openModal({
      title: 'AI Conversation History',
      className: 'modal-lg',
      body: (d.conversations || []).length ? `
        <ul class="list-stack">
          ${(d.conversations || []).map(c => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(c.title || c.preview || 'Conversation')}</span>
                <span class="list-row-sub">${timeAgo(c.created_at)} · ${c.message_count || 0} messages</span>
              </div>
              <button class="btn btn-secondary btn-xs" data-action="ai-open-conversation" data-id="${c.id}">
                Open</button>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="empty-row">No conversation history</p>',
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('ai-open-conversation', async (id) => {
  try {
    const d = await apiCall(`/api/ai/conversations/${id}`).catch(() => null);
    if (!d?.messages?.length) return showToast('Conversation unavailable', 'warning');
    closeModal();
    // Restore messages into the chat panel — this is read-only review
    const host = document.getElementById('aiMessages');
    if (host) {
      host.innerHTML = `
        <div class="alert alert-info" style="margin-bottom:8px">
          <i class="fas fa-history"></i> Historical conversation — start a new message below to continue.
        </div>
        ${d.messages.map(m => `
          <div class="ai-bubble ai-bubble-${m.role === 'user' ? 'user' : 'assistant'}"
               style="margin-bottom:8px;text-align:${m.role === 'user' ? 'right' : 'left'}">
            <p style="display:inline-block;background:${m.role === 'user' ? 'var(--brand);color:#fff' : 'var(--surface);border:1px solid var(--border)'};padding:8px 12px;border-radius:8px;max-width:80%">
              ${esc(m.content)}
            </p>
          </div>
        `).join('')}
      `;
    }
    rerenderRoleContent();
  } catch (e) { showToast(e.message, 'error'); }
});
