/* ============================================================
   ExpertHub 2.0 — 20-study-groups.js
   Cohort learning: create/join groups, group chat, shared notes,
   member leaderboard, group schedule.
   ============================================================ */

/* ============================================================
   DASHBOARD TAB
   ============================================================ */
function userStudyGroups() {
  const groups = S.studyGroups || [];
  const myGroups = groups.filter(g => (g.member_ids || []).includes(currentUser?.id));
  const discoverable = groups.filter(g => !myGroups.includes(g) && g.visibility !== 'private');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Study Groups</span></div>
    <section class="page-header">
      <h1 class="page-title">Study Groups</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="group-join-by-code">
          <i class="fas fa-link"></i> Join by code</button>
        <button class="btn btn-primary" data-action="group-create">
          <i class="fas fa-plus"></i> Create group</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-users"></i>
      <div>Learners in study groups are <strong>3× more likely</strong> to finish their courses. Join a cohort or start your own.</div>
    </div>

    ${myGroups.length ? `
      <section class="panel">
        <h3 class="panel-title">My Groups</h3>
        <div class="card-grid">
          ${myGroups.map(g => renderStudyGroupCard(g, true)).join('')}
        </div>
      </section>` : ''}

    ${discoverable.length ? `
      <section class="panel">
        <h3 class="panel-title">Discover Groups</h3>
        <div class="card-grid">
          ${discoverable.map(g => renderStudyGroupCard(g, false)).join('')}
        </div>
      </section>` : ''}

    ${!groups.length ? `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <h3>No study groups yet</h3>
          <p>Be the first to start a cohort. Invite friends or classmates.</p>
          <button class="btn btn-primary" data-action="group-create">
            <i class="fas fa-plus"></i> Create group</button>
        </div>
      </section>` : ''}
  `;
}

function renderStudyGroupCard(g, isMember) {
  const memberCount = (g.member_ids || []).length;
  return `
    <article class="program-card">
      <div style="display:flex;justify-content:space-between;gap:8px">
        <span class="chip chip-blue">${esc(g.topic || 'General')}</span>
        <span class="chip chip-neutral">${memberCount} member${memberCount === 1 ? '' : 's'}</span>
      </div>
      <h4 class="program-title">${esc(g.name || 'Untitled group')}</h4>
      <p class="program-desc">${esc((g.description || '').slice(0, 140))}</p>
      ${g.course_title ? `<p class="program-meta"><i class="fas fa-book"></i> ${esc(g.course_title)}</p>` : ''}
      ${g.next_session_at ? `<p class="program-meta"><i class="fas fa-calendar"></i> Next: ${fmtDT(g.next_session_at)}</p>` : ''}
      <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px">
        ${isMember ? `
          <button class="btn btn-primary btn-sm flex-1" data-action="group-open" data-id="${g.id}">
            <i class="fas fa-door-open"></i> Open</button>
          <button class="btn btn-info btn-sm" data-action="group-chat" data-id="${g.id}">
            <i class="fas fa-comments"></i></button>
        ` : `
          <button class="btn btn-primary btn-sm flex-1" data-action="group-join" data-id="${g.id}">
            <i class="fas fa-sign-in-alt"></i> Join</button>
        `}
      </div>
    </article>`;
}

/* ============================================================
   ACTIONS
   ============================================================ */

async function createStudyGroup() {
  openModal({
    title: 'Create a study group',
    body: `
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Name</span>
          <input id="sg-name" class="form-input" placeholder="e.g. Python Bootcamp Cohort"/></label>
        <label class="form-group"><span class="form-label">Topic</span>
          <input id="sg-topic" class="form-input" placeholder="e.g. Web Development"/></label>
        <label class="form-group form-group-full"><span class="form-label">Description</span>
          <textarea id="sg-desc" class="form-textarea" rows="3"
                    placeholder="What will this group work on?"></textarea></label>
        <label class="form-group"><span class="form-label">Visibility</span>
          <select id="sg-visibility" class="form-select">
            <option value="public">Public — anyone can join</option>
            <option value="link">Link only</option>
            <option value="private">Private — invite only</option>
          </select></label>
        <label class="form-group"><span class="form-label">Linked course (optional)</span>
          <select id="sg-course" class="form-select">
            <option value="">— None —</option>
            ${(S.courses || []).map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join('')}
          </select></label>
      </div>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary" id="sg-create-btn">
        <i class="fas fa-plus"></i> Create</button>`,
  });

  document.getElementById('sg-create-btn').onclick = async () => {
    const name = document.getElementById('sg-name').value.trim();
    if (!name) return showToast('Name is required', 'warning');

    const payload = {
      name,
      topic: document.getElementById('sg-topic').value.trim(),
      description: document.getElementById('sg-desc').value.trim(),
      visibility: document.getElementById('sg-visibility').value,
      course_id: document.getElementById('sg-course').value || null,
    };

    try {
      const d = await apiCall('/api/study-groups', 'POST', payload);
      closeModal();
      showToast('Group created', 'success');
      S.studyGroups = [normalizeStudyGroup(d.group || payload), ...(S.studyGroups || [])];
      rerenderCurrentTab();
    } catch (err) {
      showToast(err.message || 'Failed to create group', 'error');
    }
  };
}

async function joinStudyGroup(groupId) {
  try {
    await apiCall(`/api/study-groups/${groupId}/join`, 'POST', {});
    const g = (S.studyGroups || []).find(x => String(x.id) === String(groupId));
    if (g) {
      g.member_ids = Array.from(new Set([...(g.member_ids || []), currentUser.id]));
    }
    showToast('Joined group', 'success');
    rerenderCurrentTab();
  } catch (err) {
    showToast(err.message || 'Failed to join', 'error');
  }
}

async function joinStudyGroupByCode() {
  const code = prompt('Enter group code:');
  if (!code) return;
  try {
    const d = await apiCall('/api/study-groups/join-by-code', 'POST', { code: code.trim() });
    showToast('Joined ' + (d.group?.name || 'group'), 'success');
    S.studyGroups = [normalizeStudyGroup(d.group), ...(S.studyGroups || [])];
    rerenderCurrentTab();
  } catch (err) {
    showToast(err.message || 'Invalid code', 'error');
  }
}

function openStudyGroup(groupId) {
  const g = (S.studyGroups || []).find(x => String(x.id) === String(groupId));
  if (!g) return showToast('Group not found', 'error');

  openModal({
    title: g.name,
    className: 'modal-lg',
    body: `
      <div class="group-layout">
        <aside class="group-sidebar">
          <h4 class="panel-title">Members</h4>
          <ul class="group-member-list">
            ${(g.members || []).map(m => `
              <li class="group-member">
                <img class="user-avatar" src="${avatar(m)}" alt="${esc(m.name || '')}" />
                <div>
                  <div class="user-name">${esc(m.name || 'Learner')}</div>
                  <div class="user-email">Lv ${m.level || 1} · ${m.xp || 0} XP</div>
                </div>
              </li>
            `).join('')}
          </ul>
          <h4 class="panel-title" style="margin-top:16px">Group actions</h4>
          <div class="panel-actions" style="display:flex;flex-direction:column;gap:6px">
            <button class="btn btn-info btn-sm" data-action="group-chat" data-id="${g.id}">
              <i class="fas fa-comments"></i> Open chat</button>
            <button class="btn btn-secondary btn-sm" data-action="group-copy-invite" data-id="${g.id}">
              <i class="fas fa-link"></i> Copy invite</button>
            <button class="btn btn-secondary btn-sm" data-action="group-add-calendar" data-id="${g.id}">
              <i class="fas fa-calendar-plus"></i> Next session to calendar</button>
          </div>
        </aside>
        <main class="group-main">
          <h4 class="panel-title">Shared notes</h4>
          <div class="group-notes" id="sg-notes">${renderGroupNotes(g)}</div>
          <div class="notes-add" style="margin-top:10px">
            <textarea id="sg-note-input" class="form-textarea" rows="2"
                      placeholder="Add a shared note..."></textarea>
            <button class="btn btn-primary btn-sm" id="sg-note-add">
              <i class="fas fa-plus"></i> Add note</button>
          </div>
          <h4 class="panel-title" style="margin-top:20px">Group leaderboard</h4>
          <ol class="group-leaderboard">
            ${renderGroupLeaderboard(g)}
          </ol>
        </main>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });

  document.getElementById('sg-note-add').onclick = async () => {
    const text = document.getElementById('sg-note-input').value.trim();
    if (!text) return;
    try {
      await apiCall(`/api/study-groups/${g.id}/notes`, 'POST', { content: text });
      g.notes = [{ id: 'n' + Date.now(), content: text, author_name: currentUser.name, created_at: new Date().toISOString() }, ...(g.notes || [])];
      document.getElementById('sg-notes').innerHTML = renderGroupNotes(g);
      document.getElementById('sg-note-input').value = '';
    } catch (err) {
      showToast(err.message || 'Failed to add note', 'error');
    }
  };
}

function renderGroupNotes(g) {
  const notes = g.notes || [];
  if (!notes.length) return '<p class="empty-row">No shared notes yet.</p>';
  return `<ul class="notes-list">${notes.map(n => `
    <li class="note-item">
      <div class="note-header">
        <strong>${esc(n.author_name || 'Someone')}</strong>
        <span class="note-time">${timeAgo(n.created_at)}</span>
      </div>
      <p class="note-content">${esc(n.content)}</p>
    </li>`).join('')}</ul>`;
}

function renderGroupLeaderboard(g) {
  const members = (g.members || []).slice().sort((a, b) => (b.xp || 0) - (a.xp || 0));
  return members.map((m, i) => `
    <li class="group-lb-row ${m.id === currentUser?.id ? 'is-me' : ''}">
      <span class="group-lb-rank">${i + 1}</span>
      <img class="user-avatar" src="${avatar(m)}" alt="" />
      <span class="group-lb-name">${esc(m.name || 'Learner')}${m.id === currentUser?.id ? ' (you)' : ''}</span>
      <span class="group-lb-xp">${m.xp || 0} XP</span>
    </li>`).join('') || '<li class="empty-row">No data</li>';
}

async function openGroupChat(groupId) {
  const g = (S.studyGroups || []).find(x => String(x.id) === String(groupId));
  if (!g) return;

  openModal({
    title: 'Group chat — ' + g.name,
    className: 'modal-lg',
    body: `
      <div class="group-chat" id="gc-scroll">
        <ul class="group-chat-list" id="gc-list">${renderGroupChat(g)}</ul>
      </div>
      <div class="group-chat-input">
        <input id="gc-input" class="form-input" placeholder="Message the group..." />
        <button class="btn btn-primary" id="gc-send">
          <i class="fas fa-paper-plane"></i></button>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });

  // Socket wiring
  if (typeof io === 'function') {
    const sock = window.socket || io({ withCredentials: true });
    sock.emit('group:join', { group_id: groupId });
    sock.off('group:message');
    sock.on('group:message', payload => {
      if (String(payload.group_id) !== String(groupId)) return;
      g.messages = g.messages || [];
      g.messages.push(payload);
      const list = document.getElementById('gc-list');
      if (list) {
        list.innerHTML = renderGroupChat(g);
        const box = document.getElementById('gc-scroll');
        if (box) box.scrollTop = box.scrollHeight;
      }
    });
  }

  const send = () => {
    const input = document.getElementById('gc-input');
    const body = input.value.trim();
    if (!body) return;
    input.value = '';

    const msg = {
      id: 'm' + Date.now(),
      group_id: groupId,
      user_id: currentUser?.id,
      author_name: currentUser?.name || 'You',
      body,
      created_at: new Date().toISOString(),
    };
    g.messages = g.messages || [];
    g.messages.push(msg);
    document.getElementById('gc-list').innerHTML = renderGroupChat(g);

    if (typeof io === 'function') {
      const sock = window.socket || io({ withCredentials: true });
      sock.emit('group:message', msg);
    } else {
      apiCall(`/api/study-groups/${groupId}/messages`, 'POST', { body }).catch(() => {});
    }
  };

  document.getElementById('gc-send').onclick = send;
  document.getElementById('gc-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
}

function renderGroupChat(g) {
  return (g.messages || []).map(m => `
    <li class="group-chat-item ${m.user_id === currentUser?.id ? 'is-me' : ''}">
      <img class="user-avatar" src="${avatar({ name: m.author_name })}" alt="" />
      <div>
        <div class="group-chat-head">
          <strong>${esc(m.author_name || 'Someone')}</strong>
          <span class="group-chat-time">${timeAgo(m.created_at)}</span>
        </div>
        <div class="group-chat-body">${esc(m.body)}</div>
      </div>
    </li>`).join('') || '<li class="empty-row">No messages yet</li>';
}

async function copyGroupInvite(groupId) {
  const g = (S.studyGroups || []).find(x => String(x.id) === String(groupId));
  if (!g) return;
  const link = `${location.origin}/#/dashboard?group=${g.invite_code || g.id}`;
  try {
    await navigator.clipboard.writeText(link);
    showToast('Invite link copied', 'success');
  } catch (_) { showToast('Copy failed', 'error'); }
}

function normalizeStudyGroup(g) {
  return {
    id: g.id,
    name: g.name || 'Study group',
    topic: g.topic || 'General',
    description: g.description || '',
    visibility: g.visibility || 'public',
    course_id: g.course_id || null,
    course_title: g.course_title || null,
    member_ids: Array.isArray(g.member_ids) ? g.member_ids : [currentUser?.id].filter(Boolean),
    members: Array.isArray(g.members) ? g.members : [],
    notes: Array.isArray(g.notes) ? g.notes : [],
    messages: Array.isArray(g.messages) ? g.messages : [],
    next_session_at: g.next_session_at || null,
    invite_code: g.invite_code || g.id,
  };
}

function rerenderCurrentTab() {
  if (typeof window.renderUserDashboard === 'function') window.renderUserDashboard();
}

/* ---- delegated handlers ---- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const a = t.dataset.action;
  if (a === 'group-create')  { e.preventDefault(); createStudyGroup(); }
  if (a === 'group-join')    { e.preventDefault(); joinStudyGroup(t.dataset.id); }
  if (a === 'group-open')    { e.preventDefault(); openStudyGroup(t.dataset.id); }
  if (a === 'group-chat')    { e.preventDefault(); openGroupChat(t.dataset.id); }
  if (a === 'group-join-by-code') { e.preventDefault(); joinStudyGroupByCode(); }
  if (a === 'group-copy-invite') { e.preventDefault(); copyGroupInvite(t.dataset.id); }