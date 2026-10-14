/* ============================================================
   ExpertHub 2.0 — 27-forum.js
   Global Q&A forum with reputation, tags, upvotes, accepted answers.
   ============================================================ */

/* ============================================================
   DASHBOARD TAB
   ============================================================ */
function userForum() {
  const filter = S.__forumFilter || {};
  const query = ($('#forum-search')?.value || '').toLowerCase();
  const threads = getForumThreads()
    .filter(t => !filter.tag || (t.tags || []).includes(filter.tag))
    .filter(t => !query ||
      (t.title || '').toLowerCase().includes(query) ||
      (t.body || '').toLowerCase().includes(query))
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));

  const topTags = forumTopTags();

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Community</span></div>
    <section class="page-header">
      <h1 class="page-title">Community Q&amp;A</h1>
      <div class="page-actions">
        <input type="search" id="forum-search" class="form-input"
               placeholder="Search questions…" value="${esc(query)}" style="max-width:240px" />
        <button class="btn btn-primary" data-action="forum-ask">
          <i class="fas fa-plus"></i> Ask a question</button>
      </div>
    </section>

    <section class="panel">
      <div class="forum-layout">
        <aside class="forum-sidebar">
          <h4 class="panel-title">Popular tags</h4>
          <div class="forum-tags">
            <button class="forum-tag ${!filter.tag ? 'is-active' : ''}" data-forum-tag="">
              All</button>
            ${topTags.map(t => `
              <button class="forum-tag ${filter.tag === t.tag ? 'is-active' : ''}"
                      data-forum-tag="${esc(t.tag)}">
                ${esc(t.tag)} <span class="forum-tag-count">${t.count}</span></button>`).join('')}
          </div>
          <h4 class="panel-title" style="margin-top:20px">Your reputation</h4>
          <div class="forum-rep">
            <div class="forum-rep-value">${currentUser?.reputation || 0}</div>
            <div class="forum-rep-label">points</div>
          </div>
        </aside>

        <main class="forum-main">
          ${threads.length ? threads.map(t => renderForumThreadCard(t)).join('') : `
            <div class="empty-state">
              <i class="fas fa-comments"></i>
              <h3>No questions yet</h3>
              <p>Be the first to ask — the community is listening.</p>
              <button class="btn btn-primary" data-action="forum-ask">
                <i class="fas fa-plus"></i> Ask a question</button>
            </div>`}
        </main>
      </div>
    </section>
  `;
}

function renderForumThreadCard(t) {
  const votes = t.votes || 0;
  const answers = (t.answers || []).length;
  const accepted = (t.answers || []).some(a => a.accepted);
  return `
    <article class="forum-thread ${accepted ? 'is-answered' : ''}">
      <div class="forum-thread-stats">
        <div class="forum-thread-votes">
          <strong>${votes}</strong><span>votes</span>
        </div>
        <div class="forum-thread-answers ${accepted ? 'is-accepted' : ''}">
          <strong>${answers}</strong><span>${accepted ? 'accepted' : 'answer' + (answers === 1 ? '' : 's')}</span>
        </div>
      </div>
      <div class="forum-thread-body">
        <h4 class="forum-thread-title">
          <a href="#" data-action="forum-open" data-id="${t.id}">${esc(t.title)}</a>
        </h4>
        <p class="forum-thread-excerpt">${esc((t.body || '').slice(0, 180))}${(t.body || '').length > 180 ? '…' : ''}</p>
        <div class="forum-thread-meta">
          <img class="user-avatar user-avatar-sm" src="${avatar({ name: t.author_name })}" alt="" />
          <span>${esc(t.author_name || 'Learner')}</span>
          <span>·</span>
          <span>${timeAgo(t.created_at)}</span>
          ${(t.tags || []).map(tag => `
            <span class="chip chip-neutral">${esc(tag)}</span>`).join('')}
        </div>
      </div>
    </article>`;
}

function forumTopTags() {
  const threads = getForumThreads();
  const counts = {};
  threads.forEach(t => (t.tags || []).forEach(tag => {
    counts[tag] = (counts[tag] || 0) + 1;
  }));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag, count]) => ({ tag, count }));
}

/* ============================================================
   DATA
   ============================================================ */
const FORUM_STORAGE = 'eh.forum.v1';

function getForumThreads() {
  try {
    const raw = localStorage.getItem(FORUM_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function saveForumThreads(threads) {
  try { localStorage.setItem(FORUM_STORAGE, JSON.stringify(threads)); } catch (_) {}
}

/* ============================================================
   ASK
   ============================================================ */
function askForumQuestion() {
  openModal({
    title: 'Ask the community',
    className: 'modal-lg',
    body: `
      <div class="form-grid">
        <label class="form-group form-group-full"><span class="form-label">Title</span>
          <input id="fq-title" class="form-input" maxlength="140"
                 placeholder="Be specific: 'How do I handle async errors in Node?'"/></label>
        <label class="form-group form-group-full"><span class="form-label">Details</span>
          <textarea id="fq-body" class="form-textarea" rows="6"
                    placeholder="What have you tried? What did you expect?"></textarea></label>
        <label class="form-group form-group-full"><span class="form-label">Tags</span>
          <input id="fq-tags" class="form-input"
                 placeholder="comma, separated, tags" /></label>
      </div>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary" id="fq-submit">
        <i class="fas fa-paper-plane"></i> Post question</button>`,
  });

  document.getElementById('fq-submit').onclick = async () => {
    const title = document.getElementById('fq-title').value.trim();
    const body = document.getElementById('fq-body').value.trim();
    const tags = document.getElementById('fq-tags').value
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean).slice(0, 5);

    if (!title || title.length < 8) return showToast('Title is too short', 'warning');
    if (!body || body.length < 20) return showToast('Add more detail', 'warning');

    const thread = {
      id: 'th-' + Date.now().toString(36),
      title, body, tags,
      author_id: currentUser?.id,
      author_name: currentUser?.name || 'You',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      votes: 0,
      views: 0,
      answers: [],
    };

    try {
      await apiCall('/api/forum/threads', 'POST', thread);
    } catch (_) { /* offline ok */ }

    const threads = getForumThreads();
    threads.unshift(thread);
    saveForumThreads(threads);

    // Award reputation
    awardReputation(currentUser?.id, 2, 'posted question');

    closeModal();
    showToast('Question posted', 'success');
    if (typeof window.renderUserDashboard === 'function') window.renderUserDashboard();
  };
}

/* ============================================================
   OPEN THREAD
   ============================================================ */
function openForumThread(threadId) {
  const threads = getForumThreads();
  const thread = threads.find(t => t.id === threadId);
  if (!thread) return;

  thread.views = (thread.views || 0) + 1;
  saveForumThreads(threads);

  openModal({
    title: thread.title,
    className: 'modal-lg',
    body: `
      <div class="forum-thread-detail">
        <header class="forum-thread-detail-head">
          <img class="user-avatar" src="${avatar({ name: thread.author_name })}" alt="" />
          <div>
            <strong>${esc(thread.author_name || 'Learner')}</strong>
            <div class="forum-thread-meta">${timeAgo(thread.created_at)} · ${thread.views || 0} views</div>
          </div>
          <div class="forum-vote-wrap">
            <button class="btn btn-ghost btn-sm" data-action="forum-vote-thread" data-id="${thread.id}">
              <i class="fas fa-arrow-up"></i> ${thread.votes || 0}</button>
          </div>
        </header>

        <div class="forum-thread-detail-body">${esc(thread.body).replace(/\n/g, '<br/>')}</div>

        <div class="forum-thread-detail-tags">
          ${(thread.tags || []).map(t => `<span class="chip chip-neutral">${esc(t)}</span>`).join('')}
        </div>

        <h4 class="panel-title" style="margin-top:20px">
          ${(thread.answers || []).length} answer${(thread.answers || []).length === 1 ? '' : 's'}
        </h4>

        <ul class="forum-answer-list">
          ${(thread.answers || []).map(a => renderForumAnswer(thread.id, a)).join('') ||
            '<li class="empty-row">No answers yet. Be the first!</li>'}
        </ul>

        <h4 class="panel-title" style="margin-top:20px">Your answer</h4>
        <textarea id="fa-body" class="form-textarea" rows="4"
                  placeholder="Write a clear, helpful answer…"></textarea>
        <div class="panel-actions" style="margin-top:10px">
          <button class="btn btn-primary" data-action="forum-post-answer" data-id="${thread.id}">
            <i class="fas fa-paper-plane"></i> Post answer</button>
        </div>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

function renderForumAnswer(threadId, a) {
  return `
    <li class="forum-answer ${a.accepted ? 'is-accepted' : ''}">
      <div class="forum-answer-vote">
        <button class="btn btn-ghost btn-sm" data-action="forum-vote-answer"
                data-thread="${threadId}" data-answer="${a.id}">
          <i class="fas fa-arrow-up"></i>
        </button>
        <strong>${a.votes || 0}</strong>
      </div>
      <div class="forum-answer-body">
        ${a.accepted ? '<span class="chip chip-green"><i class="fas fa-check"></i> Accepted</span>' : ''}
        <p>${esc(a.body).replace(/\n/g, '<br/>')}</p>
        <div class="forum-answer-meta">
          <img class="user-avatar user-avatar-sm" src="${avatar({ name: a.author_name })}" alt="" />
          <strong>${esc(a.author_name || 'Someone')}</strong>
          <span>·</span>
          <span>${timeAgo(a.created_at)}</span>
          ${a.author_id === currentUser?.id && !a.accepted ? `
            <button class="btn btn-ghost btn-xs" data-action="forum-accept"
                    data-thread="${threadId}" data-answer="${a.id}">
              <i class="fas fa-check"></i> Accept</button>` : ''}
        </div>
      </div>
    </li>`;
}

/* ============================================================
   ACTIONS
   ============================================================ */
function postForumAnswer(threadId) {
  const body = document.getElementById('fa-body')?.value?.trim();
  if (!body || body.length < 10) return showToast('Answer is too short', 'warning');

  const threads = getForumThreads();
  const thread = threads.find(t => t.id === threadId);
  if (!thread) return;

  thread.answers = thread.answers || [];
  thread.answers.push({
    id: 'ans-' + Date.now().toString(36),
    body,
    author_id: currentUser?.id,
    author_name: currentUser?.name || 'You',
    created_at: new Date().toISOString(),
    votes: 0,
    accepted: false,
  });
  thread.updated_at = new Date().toISOString();
  saveForumThreads(threads);

  apiCall(`/api/forum/threads/${threadId}/answers`, 'POST', { body }).catch(() => {});
  awardReputation(currentUser?.id, 5, 'posted answer');

  closeModal();
  showToast('Answer posted', 'success');
  openForumThread(threadId);
}

function voteForumThread(threadId) {
  const threads = getForumThreads();
  const thread = threads.find(t => t.id === threadId);
  if (!thread) return;

  const voteKey = 'eh.forum.voted.' + threadId;
  if (localStorage.getItem(voteKey)) return showToast('Already voted', 'info');

  thread.votes = (thread.votes || 0) + 1;
  saveForumThreads(threads);
  localStorage.setItem(voteKey, '1');

  if (thread.author_id && thread.author_id !== currentUser?.id) {
    awardReputation(thread.author_id, 10, 'upvoted question');
  }

  closeModal();
  openForumThread(threadId);
}

function voteForumAnswer(threadId, answerId) {
  const threads = getForumThreads();
  const thread = threads.find(t => t.id === threadId);
  if (!thread) return;
  const answer = (thread.answers || []).find(a => a.id === answerId);
  if (!answer) return;

  const voteKey = 'eh.forum.voted.' + threadId + '.' + answerId;
  if (localStorage.getItem(voteKey)) return showToast('Already voted', 'info');

  answer.votes = (answer.votes || 0) + 1;
  saveForumThreads(threads);
  localStorage.setItem(voteKey, '1');

  if (answer.author_id && answer.author_id !== currentUser?.id) {
    awardReputation(answer.author_id, 10, 'upvoted answer');
  }

  closeModal();
  openForumThread(threadId);
}

function acceptForumAnswer(threadId, answerId) {
  const threads = getForumThreads();
  const thread = threads.find(t => t.id === threadId);
  if (!thread) return;
  const answer = (thread.answers || []).find(a => a.id === answerId);
  if (!answer) return;

  (thread.answers || []).forEach(a => { a.accepted = false; });
  answer.accepted = true;
  thread.accepted_answer_id = answer.id;
  saveForumThreads(threads);

  if (answer.author_id && answer.author_id !== currentUser?.id) {
    awardReputation(answer.author_id, 25, 'answer accepted');
  }

  closeModal();
  openForumThread(threadId);
}

function awardReputation(userId, points, reason) {
  if (!userId) return;
  if (userId === currentUser?.id) {
    currentUser.reputation = (currentUser.reputation || 0) + points;
    try { localStorage.setItem('eh.reputation.' + userId, String(currentUser.reputation)); } catch (_) {}
  }
  apiCall(`/api/forum/reputation`, 'POST', { user_id: userId, points, reason }).catch(() => {});
}

/* ============================================================
   DELEGATED HANDLERS
   ============================================================ */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action], [data-forum-tag]');
  if (!el) return;

  if (el.hasAttribute('data-forum-tag')) {
    S.__forumFilter = { tag: el.dataset.forumTag || undefined };
    if (typeof window.renderUserDashboard === 'function') window.renderUserDashboard();
    return;
  }

  const a = el.dataset.action;
  if (a === 'forum-ask')          { e.preventDefault(); askForumQuestion(); }
  if (a === 'forum-open')         { e.preventDefault(); openForumThread(el.dataset.id); }
  if (a === 'forum-post-answer')  { e.preventDefault(); postForumAnswer(el.dataset.id); }
  if (a === 'forum-vote-thread')  { e.preventDefault(); voteForumThread(el.dataset.id); }
  if (a === 'forum-vote-answer')  { e.preventDefault(); voteForumAnswer(el.dataset.thread, el.dataset.answer); }
  if (a === 'forum-accept')       { e.preventDefault(); acceptForumAnswer(el.dataset.thread, el.dataset.answer); }