/* ============================================================
   ExpertHub 2.0 — 22-ai-study-buddy.js
   In-lesson AI chat (context-aware) + smart expert matcher.
   Uses /api/ai/chat when available, falls back to canned logic.
   ============================================================ */

/* ============================================================
   AI STUDY BUDDY — lesson player panel
   ============================================================ */
(function () {
  'use strict';

  const state = {
    open: false,
    lesson: null,
    course: null,
    messages: [],
  };

  const SYSTEM_PROMPTS = {
    explain:   'Explain the current lesson in simple terms, as if I\'m new to this.',
    summarize: 'Summarize the key takeaways of this lesson in 5 bullets.',
    quiz:      'Generate 3 short quiz questions about this lesson. Show answers at the end.',
    example:   'Give me a concrete real-world example that illustrates this lesson.',
    deeper:    'Go deeper on the topic. What should I learn next?',
  };

  function ensurePanel() {
    if (document.getElementById('eh-ai-panel')) return;
    const panel = document.createElement('aside');
    panel.id = 'eh-ai-panel';
    panel.className = 'eh-ai-panel';
    panel.setAttribute('aria-label', 'AI Study Buddy');
    panel.innerHTML = `
      <header class="eh-ai-panel__head">
        <div><i class="fas fa-robot"></i> <strong>Study Buddy</strong></div>
        <button class="btn btn-ghost btn-xs" data-ai="close"><i class="fas fa-times"></i></button>
      </header>
      <div class="eh-ai-panel__messages" id="eh-ai-messages"></div>
      <div class="eh-ai-panel__quick">
        <button data-ai-quick="explain"><i class="fas fa-lightbulb"></i> Explain</button>
        <button data-ai-quick="summarize"><i class="fas fa-list"></i> Summarize</button>
        <button data-ai-quick="quiz"><i class="fas fa-question"></i> Quiz me</button>
        <button data-ai-quick="example"><i class="fas fa-flask"></i> Example</button>
        <button data-ai-quick="deeper"><i class="fas fa-arrow-up"></i> Go deeper</button>
      </div>
      <form class="eh-ai-panel__input" id="eh-ai-form">
        <input id="eh-ai-input" class="form-input" placeholder="Ask anything about this lesson…" autocomplete="off" />
        <button class="btn btn-primary" type="submit"><i class="fas fa-paper-plane"></i></button>
      </form>
    `;
    document.body.appendChild(panel);

    panel.querySelector('[data-ai="close"]').addEventListener('click', close);
    panel.querySelectorAll('[data-ai-quick]').forEach(b => {
      b.addEventListener('click', () => send(SYSTEM_PROMPTS[b.dataset.aiQuick] || b.textContent));
    });
    document.getElementById('eh-ai-form').addEventListener('submit', e => {
      e.preventDefault();
      const input = document.getElementById('eh-ai-input');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      send(text);
    });
  }

  function renderMessages() {
    const host = document.getElementById('eh-ai-messages');
    if (!host) return;
    host.innerHTML = state.messages.map(m => `
      <div class="eh-ai-msg eh-ai-msg--${m.role}">
        <div class="eh-ai-msg__bubble">${m.role === 'assistant' ? m.content.replace(/\n/g, '<br/>') : escapeHtml(m.content)}</div>
      </div>`).join('') || `<div class="eh-ai-hint"><i class="fas fa-robot"></i><p>Hi! Ask me anything about <strong>${escapeHtml(state.lesson?.title || 'this lesson')}</strong>.</p></div>`;
    host.scrollTop = host.scrollHeight;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => (
      { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]
    ));
  }

  async function callAI(prompt) {
    const payload = {
      prompt,
      lesson_id: state.lesson?.id || null,
      course_id: state.course?.id || null,
      context: {
        lesson_title: state.lesson?.title || '',
        lesson_content: (state.lesson?.content || '').slice(0, 4000),
        course_title: state.course?.title || '',
      },
      history: state.messages.slice(-6),
    };

    try {
      const d = await apiCall('/api/ai/chat', 'POST', payload);
      if (d?.message) return d.message;
      if (d?.reply) return d.reply;
      if (d?.content) return d.content;
    } catch (_) {}

    // Fallback: heuristic reply based on prompt + lesson content
    return localReply(prompt, payload.context);
  }

  function localReply(prompt, ctx) {
    const p = String(prompt).toLowerCase();
    const content = String(ctx.lesson_content || '');
    const bullets = content.split(/[.!?]\s+/).filter(Boolean).slice(0, 5);

    if (p.includes('summarize') || p.includes('summary')) {
      return `Here's a quick summary of **${ctx.lesson_title}**:\n\n• ${bullets.slice(0, 4).join('\n• ') || 'This lesson covers the core concepts and how to apply them.'}`;
    }
    if (p.includes('quiz') || p.includes('test me')) {
      return `Quick check on "${ctx.lesson_title}":\n\n1. What is the main idea?\n2. Why does it matter in practice?\n3. Name one example.\n\n_Refine your answers, then scroll down to the lesson body to verify._`;
    }
    if (p.includes('example')) {
      return `Real-world example: think of a scenario where you'd need to apply "${ctx.lesson_title}". In practice, teams use this when they want to reduce errors and speed up delivery.`;
    }
    if (p.includes('deeper') || p.includes('next')) {
      return `Great next step: after "${ctx.lesson_title}", try related lessons in the same module, then apply it in a small project. Would you like a suggested order?`;
    }
    if (p.includes('explain')) {
      return `Sure — in plain terms: ${bullets[0] || 'this lesson builds a foundational skill that later lessons depend on.'} Want me to break it into smaller pieces?`;
    }
    return `I can help with "${ctx.lesson_title}". Try asking me to **explain**, **summarize**, **quiz me**, or ask for a **real-world example**.`;
  }

  async function send(text) {
    state.messages.push({ role: 'user', content: text, at: Date.now() });
    renderMessages();

    const placeholder = { role: 'assistant', content: '<em class="muted">Thinking…</em>', at: Date.now(), pending: true };
    state.messages.push(placeholder);
    renderMessages();

    const reply = await callAI(text);
    state.messages = state.messages.filter(m => !m.pending);
    state.messages.push({ role: 'assistant', content: reply, at: Date.now() });
    renderMessages();
  }

  function open(context) {
    ensurePanel();
    const panel = document.getElementById('eh-ai-panel');
    panel.classList.add('is-open');
    state.open = true;
    state.lesson = context?.lesson || null;
    state.course = context?.course || null;
    if (!state.messages.length) renderMessages();
  }

  function close() {
    const panel = document.getElementById('eh-ai-panel');
    if (panel) panel.classList.remove('is-open');
    state.open = false;
  }

  function toggle(context) {
    state.open ? close() : open(context);
  }

  window.EHStudyBuddy = { open, close, toggle };

  /* Hook into the lesson player: add a floating button when a player is open */
  const mo = new MutationObserver(() => {
    const playerOpen = document.querySelector('.course-player-modal, .course-player-layout');
    const btn = document.getElementById('eh-ai-fab');
    if (playerOpen && !btn) {
      const fab = document.createElement('button');
      fab.id = 'eh-ai-fab';
      fab.className = 'eh-ai-fab';
      fab.title = 'Ask Study Buddy';
      fab.innerHTML = '<i class="fas fa-robot"></i>';
      fab.addEventListener('click', () => {
        toggle({
          lesson: window.S?.currentLesson || null,
          course: { id: window.S?.__currentCourseId, title: '' },
        });
      });
      document.body.appendChild(fab);
    } else if (!playerOpen && btn) {
      btn.remove();
      close();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();

/* ============================================================
   SMART EXPERT MATCHER
   ============================================================ */

async function findExpertWizard() {
  const goal = prompt('What do you want to achieve? (one sentence)');
  if (!goal) return;

  const budgetStr = prompt('Max hourly budget in USD (or leave blank):', '');
  const budget = budgetStr ? Number(budgetStr) : null;

  const matches = matchExperts({ goal, budget });

  if (typeof openModal !== 'function') {
    return showToast(matches.length ? 'Top match: ' + matches[0].name : 'No matches', 'info');
  }

  openModal({
    title: 'Your expert matches',
    className: 'modal-lg',
    body: `
      <p class="muted" style="margin-bottom:14px">Based on your goal: <em>${escapeHtml(goal)}</em></p>
      ${matches.length ? `
        <div class="card-grid">
          ${matches.map(m => renderExpertMatchCard(m)).join('')}
        </div>` : `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <h3>No matches</h3>
          <p>Try widening your budget or rephrasing.</p>
        </div>`}
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

function matchExperts({ goal, budget }) {
  const experts = (S.experts || []).slice();
  const keywords = tokenize(goal);

  return experts.map(e => {
    const hay = [
      e.name,
      e.specialization,
      e.bio,
      ...(e.skills || []),
      ...(e.tags || []),
    ].filter(Boolean).join(' ').toLowerCase();

    let keywordScore = 0;
    keywords.forEach(k => { if (hay.includes(k)) keywordScore += 1; });
    keywordScore = keywords.length ? keywordScore / keywords.length : 0;

    const rating = Number(e.average_rating || 0) / 5;
    const responseScore = e.response_time_minutes ? Math.max(0, 1 - e.response_time_minutes / 120) : 0.5;
    const availabilityScore = e.instant_available || e.is_online ? 1 : 0.5;
    const priceScore = budget
      ? Math.max(0, 1 - Math.abs(Number(e.hourly_rate || 0) - budget) / Math.max(budget, 1))
      : 0.5;

    const score =
      keywordScore * 0.45 +
      rating * 0.25 +
      responseScore * 0.10 +
      availabilityScore * 0.10 +
      priceScore * 0.10;

    const reasons = [];
    if (keywordScore > 0.3) reasons.push('Matches your goal closely');
    if (rating > 0.85) reasons.push('Highly rated');
    if (responseScore > 0.7) reasons.push('Fast responder');
    if (availabilityScore === 1) reasons.push('Available now');
    if (budget && Number(e.hourly_rate) <= budget) reasons.push('Within budget');

    return { ...e, __score: score, __reasons: reasons };
  })
  .sort((a, b) => b.__score - a.__score)
  .slice(0, 6);
}

function tokenize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

function renderExpertMatchCard(e) {
  const pct = Math.round((e.__score || 0) * 100);
  return `
    <article class="expert-card">
      <div style="display:flex;gap:10px;align-items:center">
        <img class="expert-avatar" src="${avatar(e)}" alt="" />
        <div style="flex:1">
          <h4 class="expert-name">${escapeHtml(e.name || '')}</h4>
          <p class="expert-expertise">${escapeHtml(e.specialization || '')}</p>
        </div>
        <span class="chip chip-green">${pct}% match</span>
      </div>
      <ul class="expert-match-reasons">
        ${(e.__reasons || []).map(r => `<li><i class="fas fa-check"></i> ${escapeHtml(r)}</li>`).join('')}
      </ul>
      <p class="expert-rate">${typeof fmtCur === 'function' ? fmtCur(e.hourly_rate || 0) : '$' + (e.hourly_rate || 0)} / hr</p>
      <div class="expert-card-actions">
        <button class="btn btn-primary btn-sm flex-1" data-action="book-slot-with"
                data-id="${e.id}" data-name="${escapeHtml(e.name || '')}">
          <i class="fas fa-calendar-plus"></i> Book</button>
      </div>
    </article>`;
}

document.addEventListener('click', e => {
  if (e.target.closest('[data-action="find-expert-wizard"]')) {
    e.preventDefault();
    findExpertWizard();
  }