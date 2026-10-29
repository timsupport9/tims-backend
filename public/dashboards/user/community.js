/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/community.js */
/* Community home with recommendations, visibility-aware groups, */
/* discussions with moderation, bookmarks, participation history. */
/* ============================================================ */

let _communityTab = UserFilters.get('community', 'tab', 'home') || 'home';
const COMMUNITY_PAGE_SIZE = 9;

function renderUserCommunity() {
  return UserUI.page({
    title: 'Learning Community',
    breadcrumb: 'Community',
    content: `
      ${UserUI.tabs([
        { id: 'home',       label: 'Home',           icon: 'fa-home' },
        { id: 'groups',     label: 'Groups',         icon: 'fa-users' },
        { id: 'forum',      label: 'Discussions',    icon: 'fa-comments' },
        { id: 'activity',   label: 'My Activity',    icon: 'fa-history' },
      ], _communityTab, 'data-community-tab')}

      ${_communityTab === 'home'     ? renderCommunityHome()      : ''}
      ${_communityTab === 'groups'   ? renderCommunityGroups()    : ''}
      ${_communityTab === 'forum'    ? renderCommunityForum()     : ''}
      ${_communityTab === 'activity' ? renderCommunityActivity()  : ''}
    `,
  });
}

/* ============================================================ */
/* Home — recommendations, joined groups, recent activity */
/* ============================================================ */

function renderCommunityHome() {
  const joinedGroups = (S.studyGroups || []).filter(g => g.joined).slice(0, 4);
  const recommended  = (S.communityRecommendations || []).slice(0, 4);
  const recentThreads = (S.discussionsCommunity || [])
    .filter(d => d.following || d.joined_group)
    .slice(0, 5);
  const recentActivity = (S.communityActivity || []).slice(0, 6);

  return `
    <section class="panel">
      <h3 class="panel-title">Community Guidelines</h3>
      <p class="form-hint">
        Be respectful and constructive. Report content that is harmful, spam, or inappropriate.
        Do not share personal data of others. Moderation decisions are logged.
        <button class="btn-ghost btn-xs" data-action="view-community-guidelines">Read full guidelines</button>
      </p>
    </section>

    ${joinedGroups.length ? `
      <section class="panel">
        <h3 class="panel-title">Your Groups</h3>
        ${joinedGroups.map(g => `
          <div class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(g.name)}</span>
              <span class="list-row-sub">
                ${g.members_count || 0} members
                ${g.visibility === 'private' ? ' · <span class="chip chip-neutral"><i class="fas fa-lock"></i> Private</span>' : ''}
              </span>
            </div>
            <button class="btn btn-secondary btn-xs" data-action="open-group" data-id="${g.id}">
              Open</button>
          </div>
        `).join('')}
      </section>
    ` : ''}

    ${recommended.length ? `
      <section class="panel">
        <h3 class="panel-title">Recommended Groups</h3>
        <p class="form-hint">Based on your interests and activity.</p>
        ${recommended.map(g => `
          <div class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(g.name)}</span>
              <span class="list-row-sub">
                ${g.recommendation_reason ? esc(g.recommendation_reason) : esc(g.description || '')}
              </span>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-ghost btn-xs" data-action="dismiss-group-rec" data-id="${g.id}"
                      aria-label="Dismiss"><i class="fas fa-times"></i></button>
              <button class="btn btn-primary btn-xs" data-action="join-group" data-id="${g.id}">Join</button>
            </div>
          </div>
        `).join('')}
      </section>
    ` : ''}

    ${recentThreads.length ? `
      <section class="panel">
        <h3 class="panel-title">Recent Discussions</h3>
        ${recentThreads.map(d => `
          <div class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(d.title)}</span>
              <span class="list-row-sub">
                ${esc(d.author_name || 'Anonymous')} · ${timeAgo(d.created_at)} ·
                ${d.replies_count || 0} repl${(d.replies_count || 0) === 1 ? 'y' : 'ies'}
              </span>
            </div>
            <button class="btn btn-secondary btn-xs" data-action="open-community-discussion" data-id="${d.id}">
              Open</button>
          </div>
        `).join('')}
      </section>
    ` : ''}

    ${recentActivity.length ? `
      <section class="panel">
        <h3 class="panel-title">Your Recent Contributions</h3>
        <ul class="list-stack">
          ${recentActivity.map(a => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(a.summary)}</span>
                <span class="list-row-sub">${timeAgo(a.at)}</span>
              </div>
              <span class="chip chip-neutral">${esc(a.type || '')}</span>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : ''}
  `;
}

/* ============================================================ */
/* Groups — visibility aware */
/* ============================================================ */

function renderCommunityGroups() {
  const groups = S.studyGroups || [];
  const f = {
    query:    UserFilters.get('community', 'q', '') || '',
    joined:   UserFilters.get('community', 'joinedOnly', false),
    page:     Number(UserFilters.get('community', 'page', 1)) || 1,
  };

  let filtered = groups.slice();
  if (f.query) filtered = filtered.filter(g =>
    (g.name || '').toLowerCase().includes(f.query.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(f.query.toLowerCase()));
  if (f.joined) filtered = filtered.filter(g => g.joined);

  const total = filtered.length;
  const page  = Math.min(f.page, Math.max(1, Math.ceil(total / COMMUNITY_PAGE_SIZE)));
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
          ${g.visibility === 'private'
            ? '<span class="chip chip-neutral" style="margin-left:6px"><i class="fas fa-lock"></i> Private</span>'
            : g.visibility === 'institution'
              ? '<span class="chip chip-purple" style="margin-left:6px"><i class="fas fa-building"></i> Institution</span>'
              : ''}
          ${g.joined ? '<span class="chip chip-green" style="margin-left:6px">Joined</span>' : ''}
          <h4 class="program-title">${esc(g.name)}</h4>
          <p class="program-desc">${esc((g.description || '').slice(0, 120))}</p>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px">
            ${g.joined
              ? `<button class="btn btn-primary btn-sm flex-1" data-action="open-group" data-id="${g.id}">
                  Open</button>
                 <button class="btn btn-secondary btn-sm" data-action="leave-group" data-id="${g.id}"
                         aria-label="Leave"><i class="fas fa-sign-out-alt"></i></button>`
              : `<button class="btn btn-primary btn-sm flex-1" data-action="join-group" data-id="${g.id}"
                        ${g.visibility === 'institution' ? 'disabled title="Requires institution membership"' : ''}>
                  ${g.visibility === 'institution' ? '<i class="fas fa-lock"></i> Restricted' : '<i class="fas fa-plus"></i> Join'}</button>`}
          </div>
        </article>
      `)) : '<p class="empty-row">No groups match your search</p>'}
      ${UserUI.pagination({ page, pageSize: COMMUNITY_PAGE_SIZE, total, action: 'community-page', key: 'groups' })}
    </section>
  `;
}

/* ============================================================ */
/* Forum — discussions with filters */
/* ============================================================ */

function renderCommunityForum() {
  const discussions = S.discussionsCommunity || [];
  const f = {
    query: UserFilters.get('community', 'forum_q', '') || '',
    sort:  UserFilters.get('community', 'forum_sort', 'recent') || 'recent',
  };

  let filtered = discussions.slice();
  if (f.query) {
    const q = f.query.toLowerCase();
    filtered = filtered.filter(d =>
      (d.title || '').toLowerCase().includes(q) ||
      (d.body || '').toLowerCase().includes(q));
  }
  filtered.sort((a, b) => {
    if (f.sort === 'popular') return (b.replies_count || 0) - (a.replies_count || 0);
    if (f.sort === 'unanswered') {
      const ua = (a.replies_count || 0) === 0 ? 0 : 1;
      const ub = (b.replies_count || 0) === 0 ? 0 : 1;
      return ua - ub || new Date(b.created_at) - new Date(a.created_at);
    }
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  return `
    <section class="panel">
      <div class="expert-filters" style="margin-bottom:12px">
        <input type="search" id="forum-search" class="form-input"
               placeholder="Search discussions..." value="${esc(f.query)}" style="max-width:240px" />
        <select id="forum-sort" class="form-select" style="max-width:180px">
          <option value="recent"     ${f.sort === 'recent'     ? 'selected' : ''}>Most recent</option>
          <option value="popular"    ${f.sort === 'popular'    ? 'selected' : ''}>Most active</option>
          <option value="unanswered" ${f.sort === 'unanswered' ? 'selected' : ''}>Unanswered first</option>
        </select>
        <button class="btn btn-primary" data-action="new-discussion">
          <i class="fas fa-plus"></i> Ask a Question</button>
      </div>
      ${filtered.slice(0, 30).length ? filtered.slice(0, 30).map(d => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">
              ${esc(d.title || '')}
              ${d.solved ? '<span class="chip chip-green">Solved</span>' : ''}
              ${d.following ? '<span class="chip chip-blue"><i class="fas fa-bell"></i> Following</span>' : ''}
              ${d.bookmarked ? '<span class="chip chip-neutral"><i class="fas fa-bookmark"></i></span>' : ''}
            </span>
            <span class="list-row-sub">
              ${esc(d.author_name || 'Anonymous')} · ${timeAgo(d.created_at)} ·
              ${d.replies_count || 0} repl${(d.replies_count || 0) === 1 ? 'y' : 'ies'}
            </span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-xs" data-action="toggle-discussion-follow" data-id="${d.id}"
                    aria-label="${d.following ? 'Unfollow' : 'Follow'}">
              <i class="fas fa-bell" style="color:${d.following ? 'var(--brand)' : 'inherit'}"></i></button>
            <button class="btn btn-secondary btn-xs" data-action="toggle-discussion-bookmark" data-id="${d.id}"
                    aria-label="${d.bookmarked ? 'Remove bookmark' : 'Bookmark'}">
              <i class="fas fa-bookmark" style="color:${d.bookmarked ? 'var(--warning)' : 'inherit'}"></i></button>
            <button class="btn btn-secondary btn-xs" data-action="open-community-discussion" data-id="${d.id}">
              Open</button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">No discussions yet — start one!</p>'}
    </section>
  `;
}

/* ============================================================ */
/* My Activity — participation history */
/* ============================================================ */

function renderCommunityActivity() {
  const activity = S.communityActivity || [];
  const contributions = activity.filter(a => ['post','reply','answer','project_submission'].includes(a.type));
  const milestones = activity.filter(a => ['achievement','milestone'].includes(a.type));
  const bookmarks = (S.discussionsCommunity || []).filter(d => d.bookmarked);

  return `
    ${UserUI.stats([
      { label: 'Contributions', value: contributions.length, icon: 'fa-comment', tone: 'blue' },
      { label: 'Milestones',    value: milestones.length,    icon: 'fa-trophy',  tone: 'purple' },
      { label: 'Bookmarked',    value: bookmarks.length,     icon: 'fa-bookmark', tone: 'yellow' },
    ])}

    <section class="panel">
      <h3 class="panel-title">Participation History</h3>
      ${activity.length ? activity.slice(0, 30).map(a => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(a.summary || '')}</span>
            <span class="list-row-sub">${timeAgo(a.at)}</span>
          </div>
          <span class="chip chip-neutral">${esc(a.type || '')}</span>
        </div>
      `).join('') : '<p class="empty-row">No contributions yet — join a discussion or group to get started.</p>'}
    </section>

    ${bookmarks.length ? `
      <section class="panel">
        <h3 class="panel-title">Bookmarked Discussions</h3>
        ${bookmarks.map(d => `
          <div class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(d.title)}</span>
              <span class="list-row-sub">${esc(d.author_name || 'Anonymous')} · ${timeAgo(d.created_at)}</span>
            </div>
            <button class="btn btn-secondary btn-xs" data-action="open-community-discussion" data-id="${d.id}">
              Open</button>
          </div>
        `).join('')}
      </section>
    ` : ''}
  `;
}

/* ============================================================ */
/* Module + filter bindings */
/* ============================================================ */

window.ExpertHubUser.registerModule('community', renderUserCommunity);

window.ExpertHubUser.registerModule('community', renderUserCommunity, {
  init() {
    const rerender = debounce(() => rerenderRoleContent(), 250);
    const $set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
    $set('comm-search',  el => el.oninput  = () => { UserFilters.set('community', 'q', el.value); rerender(); });
    $set('comm-joined',  el => el.onchange = () => { UserFilters.set('community', 'joinedOnly', el.checked); rerenderRoleContent(); });
    $set('forum-search', el => el.oninput  = () => { UserFilters.set('community', 'forum_q', el.value); rerender(); });
    $set('forum-sort',   el => el.onchange = () => { UserFilters.set('community', 'forum_sort', el.value); rerenderRoleContent(); });
  },
});

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-community-tab]');
  if (!t) return;
  _communityTab = t.dataset.communityTab;
  UserFilters.set('community', 'tab', _communityTab);
  rerenderRoleContent();
}, true);

/* ============================================================ */
/* Actions */
/* ============================================================ */

window.ExpertHubUser.registerAction('community-page', (_, el) => {
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
        options: [
          { value: 'public',      label: 'Public' },
          { value: 'private',     label: 'Private (invite only)' },
          { value: 'institution', label: 'Institution (members only)' },
        ]},
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
  } catch (e) {
    const msg = String(e?.message || '');
    if (/restrict|institution|membership/i.test(msg)) {
      showToast('This group is restricted to institution members', 'warning');
    } else { showToast(msg, 'error'); }
  }
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

window.ExpertHubUser.registerAction('open-group', (id) => {
  const g = (S.studyGroups || []).find(x => String(x.id) === String(id));
  if (!g) return showToast('Group not found', 'error');
  openModal({
    title: g.name,
    className: 'modal-lg',
    body: `
      <p>${esc(g.description || '')}</p>
      <p class="form-hint">${g.members_count || 0} members · ${esc(g.visibility || 'public')}</p>
      <div class="panel-actions" style="margin-top:12px">
        <button class="btn btn-primary" data-action="open-group-discussions" data-id="${id}"
                onclick="closeModal()">
          <i class="fas fa-comments"></i> View Discussions</button>
      </div>
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
});

window.ExpertHubUser.registerAction('open-group-discussions', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/community/groups/${id}/posts`).catch(() => ({ posts: [] }));
    closeModal();
    openModal({
      title: 'Group Discussions',
      className: 'modal-lg',
      body: (d.posts || []).length ? d.posts.map(p => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(p.title || p.body?.slice(0, 80) || '')}</span>
            <span class="list-row-sub">${esc(p.author_name || 'Anonymous')} · ${timeAgo(p.created_at)}</span>
          </div>
          <button class="btn btn-secondary btn-xs" data-action="open-community-discussion"
                  data-id="${p.id}" onclick="closeModal()">Open</button>
        </div>
      `).join('') : '<p class="empty-row">No discussions in this group yet.</p>',
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('new-discussion', () => {
  openModal({
    title: 'Ask a Question',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="ndTitle" class="form-input" required maxlength="200" /></label>
      <label class="form-group"><span class="form-label">Details</span>
        <textarea id="ndBody" class="form-textarea" rows="5" required maxlength="5000"></textarea></label>
      <label class="form-group"><span class="form-label">Tags (comma separated)</span>
        <input id="ndTags" class="form-input" placeholder="mathematics, KCSE" /></label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="ndSave" class="btn btn-primary">Post</button>
    `,
  });
  $('#ndSave').onclick = async () => {
    const title = $('#ndTitle').value.trim();
    const body = $('#ndBody').value.trim();
    if (!title || !body) return showToast('Title and body required', 'error');
    try {
      await apiCall('/api/community/posts', 'POST', {
        title, body,
        tags: ($('#ndTags').value || '').split(',').map(t => t.trim()).filter(Boolean),
      });
      closeModal();
      showToast('Discussion posted', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
});

window.ExpertHubUser.registerAction('open-community-discussion', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/community/discussions/${id}`).catch(() => ({ discussion: null, replies: [] }));
    if (!d?.discussion) return showToast('Discussion not found', 'error');
    const isAuthor = String(d.discussion.author_id) === String(currentUser?.id);

    openModal({
      title: d.discussion.title || 'Discussion',
      className: 'modal-lg',
      body: `
        <p>${esc(d.discussion.body || '')}</p>
        <div style="display:flex;gap:6px;margin-top:8px">
          ${isAuthor ? `
            <button class="btn btn-ghost btn-xs" data-action="edit-community-post" data-id="${id}">
              <i class="fas fa-pen"></i> Edit</button>
          ` : ''}
          <button class="btn btn-warning btn-xs" data-action="report-community-content"
                  data-type="post" data-id="${id}">
            <i class="fas fa-flag"></i> Report</button>
        </div>
        <h3 class="panel-title" style="margin-top:16px">Replies</h3>
        <ul class="list-stack">
          ${(d.replies || []).map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.author_name || 'Anonymous')}</span>
                <span class="list-row-sub">${esc(r.body || '')}</span>
                ${r.is_accepted ? '<span class="chip chip-green">Accepted answer</span>' : ''}
              </div>
              <div style="display:flex;gap:4px;flex-direction:column">
                <span class="list-row-meta">${timeAgo(r.created_at)}</span>
                ${isAuthor && !r.is_accepted ? `
                  <button class="btn btn-success btn-xs" data-action="accept-answer"
                          data-post="${id}" data-reply="${r.id}">Accept</button>
                ` : ''}
                <button class="btn btn-ghost btn-xs" data-action="report-community-content"
                        data-type="reply" data-id="${r.id}">
                  <i class="fas fa-flag"></i></button>
              </div>
            </li>
          `).join('') || '<li class="empty-row">No replies yet</li>'}
        </ul>
        <label class="form-group" style="margin-top:12px">
          <span class="form-label">Add reply</span>
          <textarea id="cdReply" class="form-textarea" rows="3" maxlength="2000"></textarea>
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
        await apiCall(`/api/community/posts/${id}/comments`, 'POST', { body });
        closeModal();
        showToast('Reply posted', 'success');
      } catch (e) { showToast(e.message, 'error'); }
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('report-community-content', (_, el) => {
  const type = el?.dataset?.type;
  const id = el?.dataset?.id;
  UserUI.formModal({
    title: 'Report Content',
    fields: [
      { name: 'reason', label: 'Reason', type: 'select', required: true,
        options: [
          { value: 'spam',          label: 'Spam or advertising' },
          { value: 'harassment',    label: 'Harassment or abuse' },
          { value: 'misinformation',label: 'Misinformation' },
          { value: 'privacy',       label: 'Privacy violation' },
          { value: 'inappropriate', label: 'Inappropriate content' },
          { value: 'other',         label: 'Other' },
        ]},
      { name: 'notes', label: 'Details (optional)', type: 'textarea', rows: 2 },
    ],
    submitLabel: 'Submit Report',
    onSubmit: async (v) => {
      await apiCall('/api/community/reports', 'POST', {
        content_type: type, content_id: Number(id), reason: v.reason, notes: v.notes || null,
      });
      closeModal();
      showToast('Report submitted. Moderators will review it.', 'success', 6000);
    },
  });
});

window.ExpertHubUser.registerAction('edit-community-post', async (id) => {
  try {
    const d = await apiCall(`/api/community/posts/${id}`).catch(() => null);
    const post = d?.post;
    if (!post) return showToast('Post not found', 'error');
    openModal({
      title: 'Edit Post',
      body: `
        <label class="form-group"><span class="form-label">Title</span>
          <input id="epTitle" class="form-input" value="${esc(post.title || '')}" /></label>
        <label class="form-group"><span class="form-label">Body</span>
          <textarea id="epBody" class="form-textarea" rows="5">${esc(post.body || '')}</textarea></label>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button id="epSave" class="btn btn-primary">Save</button>
      `,
    });
    $('#epSave').onclick = async () => {
      try {
        await apiCall(`/api/community/posts/${id}`, 'PATCH', {
          title: $('#epTitle').value,
          body: $('#epBody').value,
        });
        closeModal();
        showToast('Post updated', 'success');
      } catch (e) { showToast(e.message, 'error'); }
    };
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('accept-answer', async (_, el) => {
  const postId = el?.dataset?.post;
  const replyId = el?.dataset?.reply;
  try {
    await apiCall(`/api/community/posts/${postId}/comments/${replyId}/accept`, 'POST');
    showToast('Answer accepted', 'success');
    closeModal();
    rerenderRoleContent();
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('toggle-discussion-follow', async (id) => {
  try {
    await apiCall(`/api/community/posts/${id}/follow`, 'POST');
    if (S.discussionsCommunity) {
      const d = S.discussionsCommunity.find(x => String(x.id) === String(id));
      if (d) d.following = !d.following;
    }
    rerenderRoleContent();
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('toggle-discussion-bookmark', async (id) => {
  try {
    await apiCall(`/api/community/posts/${id}/bookmark`, 'POST');
    if (S.discussionsCommunity) {
      const d = S.discussionsCommunity.find(x => String(x.id) === String(id));
      if (d) d.bookmarked = !d.bookmarked;
    }
    rerenderRoleContent();
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('dismiss-group-rec', async (id) => {
  try {
    await apiCall(`/api/user/community/recommendations/${id}/dismiss`, 'POST');
    S.communityRecommendations = (S.communityRecommendations || []).filter(r => String(r.id) !== String(id));
    rerenderRoleContent();
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('view-community-guidelines', () => {
  openModal({
    title: 'Community Guidelines',
    className: 'modal-lg',
    body: `
      <h3>Be respectful</h3>
      <p>Treat every member with courtesy. Disagreement is welcome; harassment is not.</p>
      <h3>Be constructive</h3>
      <p>Contribute answers that help others learn. Avoid low-effort posting.</p>
      <h3>Protect privacy</h3>
      <p>Do not share personal information of others. Report privacy violations.</p>
      <h3>Report concerns</h3>
      <p>Use the Report action on any post or reply. Moderators review every report.</p>
      <h3>Younger learners</h3>
      <p>Community features for minors follow age-appropriate privacy and safeguarding rules.</p>
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
});
