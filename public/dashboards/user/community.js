/* ============================================================
   ExpertHub 2.0 — dashboards/user/community.js
   Study groups, discussions, challenges.
   Duplicate-join guards, moderation affordances, pagination.
   ============================================================ */

let _communityTab = UserFilters.get('community', 'tab', 'groups') || 'groups';
const COMMUNITY_PAGE_SIZE = 9;

function renderUserCommunity() {
  const groups = S.studyGroups || [];

  return UserUI.page({
    title: 'Learning Community',
    breadcrumb: 'Community',
    content: `
      ${UserUI.tabs([
        { id: 'groups',     label: 'Study Groups',  icon: 'fa-users' },
        { id: 'forum',      label: 'Discussions',   icon: 'fa-comments' },
        { id: 'challenges', label: 'Challenges',    icon: 'fa-trophy' },
      ], _communityTab, 'data-community-tab')}

      ${_communityTab === 'groups' ? renderCommunityGroups(groups) : ''}
      ${_communityTab === 'forum' ? renderCommunityForum() : ''}
      ${_communityTab === 'challenges' ? renderCommunityChallenges() : ''}
    `,
  });
}

function renderCommunityGroups(groups) {
  const f = {
    query: UserFilters.get('community', 'q', '') || '',
    joined: UserFilters.get('community', 'joinedOnly', false),
    page: Number(UserFilters.get('community', 'page', 1)) || 1,
  };

  let filtered = groups.slice();
  if (f.query) filtered = filtered.filter(g =>
    (g.name || '').toLowerCase().includes(f.query.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(f.query.toLowerCase())
  );
  if (f.joined) filtered = filtered.filter(g => g.joined);

  const total = filtered.length;
  const page = Math.min(f.page, Math.max(1, Math.ceil(total / COMMUNITY_PAGE_SIZE)));
  const paged = filtered.slice((page - 1) * COMMUNITY_PAGE_SIZE, page * COMMUNITY_PAGE_SIZE);

  return `
    <section class="panel">
      <div class="page-actions" style="margin-bottom:12px">
        <input type="search" id="comm-search" class="form-input"
               placeholder="Search groups..." value="${esc(f.query)}" style="max-width:240px" />
        <label class="checkbox-row">
          <input type="checkbox" id="comm-joined" ${f.joined ? 'checked' : ''} /> Only my groups
        </label>
        <button class="btn btn-primary" data-action="create-study-group">
          <i class="fas fa-plus"></i> Create Group</button>
      </div>
      ${paged.length ? UserUI.cardGrid(paged.map(g => `
        <article class="program-card">
          <span class="chip chip-blue">${g.members_count || 0} members</span>
          ${g.joined ? '<span class="chip chip-green">Joined</span>' : ''}
          <h4 class="program-title">${esc(g.name)}</h4>
          <p class="program-desc">${esc((g.description || '').slice(0, 120))}</p>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px">
            <button class="btn btn-primary btn-sm flex-1" data-action="join-group" data-id="${g.id}"
                    ${g.joined ? 'disabled' : ''}>
              ${g.joined ? '<i class="fas fa-check"></i> Joined' : '<i class="fas fa-plus"></i> Join'}</button>
            ${g.joined ? `
              <button class="btn btn-secondary btn-sm" data-action="leave-group" data-id="${g.id}"
                      aria-label="Leave group"><i class="fas fa-sign-out-alt"></i></button>
            ` : ''}
          </div>
        </article>
      `)) : '<p class="empty-row">No study groups yet</p>'}
      ${UserUI.pagination({ page, pageSize: COMMUNITY_PAGE_SIZE, total, action: 'community-page', key: 'groups' })}
    </section>
  `;
}

function renderCommunityForum() {
  const discussions = (S.discussionsCommunity || []).slice(0, 30);
  return `
    <section class="panel">
      <h3 class="panel-title">Community Discussions</h3>
      ${discussions.length ? discussions.map(d => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(d.title || d.body?.slice(0, 80) || '')}</span>
            <span class="list-row-sub">
              ${esc(d.author_name || 'Anonymous')} · ${timeAgo(d.created_at)} ·
              ${d.replies_count || 0} replies
            </span>
          </div>
          <button class="btn btn-secondary btn-xs" data-action="open-community-discussion" data-id="${d.id}">
            <i class="fas fa-eye"></i> View</button>
        </div>
      `).join('') : '<p class="empty-row">No discussions yet. Engage in course discussions to see them here.</p>'}
    </section>
  `;
}

function renderCommunityChallenges() {
  const challenges = S.communityChallenges || [];
  return `
    <section class="panel">
      <h3 class="panel-title">Challenges</h3>
      ${challenges.length ? challenges.map(c => `
        <div class="enrollment-card">
          <h3 class="enrollment-title">${esc(c.title)}</h3>
          <p class="enrollment-type">${esc(c.description || '')}</p>
          <div class="progress-bar"><span style="width:${c.progress || 0}%"></span></div>
          <p class="enrollment-progress">${c.progress || 0}% · ${c.participants || 0} participants</p>
          ${c.joined
            ? '<span class="chip chip-green">Joined</span>'
            : `<button class="btn btn-primary btn-sm" data-action="join-challenge" data-id="${c.id}">
                <i class="fas fa-plus"></i> Join</button>`}
        </div>
      `).join('') : '<p class="empty-row">No challenges active right now.</p>'}
    </section>
  `;
}

window.ExpertHubUser.registerModule('community', renderUserCommunity);

window.ExpertHubUser.registerModule('community', renderUserCommunity, {
  init() {
    const s = $('#comm-search');
    const j = $('#comm-joined');
    const rerender = debounce(() => rerenderRoleContent(), 250);
    if (s) s.oninput = () => { UserFilters.set('community', 'q', s.value); rerender(); };
    if (j) j.onchange = () => { UserFilters.set('community', 'joinedOnly', j.checked); rerenderRoleContent(); };
  },
});

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-community-tab]');
  if (!t) return;
  _communityTab = t.dataset.communityTab;
  UserFilters.set('community', 'tab', _communityTab);
  rerenderRoleContent();
}, true);

window.ExpertHubUser.registerAction('community-page', (id, el) => {
  UserFilters.set('community', 'page', Number(el?.dataset?.page || 1));
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('create-study-group', () => {
  UserUI.formModal({
    title: 'Create Study Group',
    fields: [
      { name: 'name',        label: 'Group Name', required: true },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { name: 'visibility',  label: 'Visibility', type: 'select', value: 'public',
        options: [{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private (invite only)' }] },
    ],
    submitLabel: 'Create',
    onSubmit: async (v) => {
      await apiCall('/api/user/study-groups', 'POST', v);
      closeModal();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Group created', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('join-group', async (id) => {
  try {
    await apiCall(`/api/user/study-groups/${id}/join`, 'POST');
    if (S.studyGroups) {
      const g = S.studyGroups.find(x => String(x.id) === String(id));
      if (g) { g.joined = true; g.members_count = (g.members_count || 0) + 1; }
    }
    rerenderRoleContent();
    showToast('Joined group', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('leave-group', async (id) => {
  if (!await confirmDialog('Leave this study group?')) return;
  try {
    await apiCall(`/api/user/study-groups/${id}/leave`, 'POST');
    if (S.studyGroups) {
      const g = S.studyGroups.find(x => String(x.id) === String(id));
      if (g) { g.joined = false; g.members_count = Math.max(0, (g.members_count || 1) - 1); }
    }
    rerenderRoleContent();
    showToast('Left group', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('open-community-discussion', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/community/discussions/${id}`).catch(() => ({ discussion: null, replies: [] }));
    if (!d?.discussion) return showToast('Discussion not found', 'error');
    openModal({
      title: d.discussion.title || 'Discussion',
      className: 'modal-lg',
      body: `
        <p>${esc(d.discussion.body || '')}</p>
        <h3 class="panel-title" style="margin-top:16px">Replies</h3>
        <ul class="list-stack">
          ${(d.replies || []).map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.author_name || 'Anonymous')}</span>
                <span class="list-row-sub">${esc(r.body || '')}</span>
              </div>
              <span class="list-row-meta">${timeAgo(r.created_at)}</span>
            </li>
          `).join('') || '<li class="empty-row">No replies yet</li>'}
        </ul>
        <label class="form-group" style="margin-top:12px">
          <span class="form-label">Add reply</span>
          <textarea id="cdReply" class="form-textarea" rows="3"></textarea>
        </label>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button id="cdReplySave" class="btn btn-primary">Post Reply</button>
      `,
    });
    $('#cdReplySave').onclick = async () => {
      const body = $('#cdReply').value.trim();
      if (!body) return;
      try {
        await apiCall(`/api/user/community/discussions/${id}/replies`, 'POST', { body });
        closeModal();
        showToast('Reply posted', 'success');
      } catch (e) { showToast(e.message, 'error'); }
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('join-challenge', async (id) => {
  try {
    await apiCall(`/api/user/community/challenges/${id}/join`, 'POST');
    if (S.communityChallenges) {
      const c = S.communityChallenges.find(x => String(x.id) === String(id));
      if (c) { c.joined = true; c.participants = (c.participants || 0) + 1; }
    }
    rerenderRoleContent();
    showToast('Joined challenge', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});