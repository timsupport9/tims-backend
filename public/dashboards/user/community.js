/* ============================================================
   ExpertHub 2.0 — dashboards/user/community.js
   Study groups, forums, challenges.
   ============================================================ */

let _communityTab = 'groups';

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
  return `
    <section class="panel">
      <div class="page-actions" style="margin-bottom:12px">
        <button class="btn btn-primary" data-action="create-study-group">
          <i class="fas fa-plus"></i> Create Group</button>
      </div>
      ${groups.length ? UserUI.cardGrid(groups.map(g => `
        <article class="program-card">
          <span class="chip chip-blue">${g.members_count || 0} members</span>
          <h4 class="program-title">${esc(g.name)}</h4>
          <p class="program-desc">${esc((g.description || '').slice(0, 120))}</p>
          <button class="btn btn-primary btn-sm" data-action="join-group" data-id="${g.id}">
            ${g.joined ? 'Open' : 'Join'}</button>
        </article>
      `)) : '<p class="empty-row">No study groups yet</p>'}
    </section>
  `;
}

function renderCommunityForum() {
  return `
    <section class="panel">
      <h3 class="panel-title">Community Discussions</h3>
      <p class="empty-row">Browse lesson discussions from the course player to participate.</p>
    </section>
  `;
}

function renderCommunityChallenges() {
  return `
    <section class="panel">
      <h3 class="panel-title">Challenges</h3>
      <p class="empty-row">No challenges active right now.</p>
    </section>
  `;
}

window.ExpertHubUser.registerModule('community', renderUserCommunity);

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-community-tab]');
  if (!t) return;
  _communityTab = t.dataset.communityTab;
  rerenderRoleContent();
}, true);

window.ExpertHubUser.registerAction('create-study-group', () => {
  UserUI.formModal({
    title: 'Create Study Group',
    fields: [
      { name: 'name',        label: 'Group Name', required: true },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    ],
    submitLabel: 'Create',
    onSubmit: async (v) => {
      await apiCall('/api/user/study-groups', 'POST', v);
      closeModal();
      await loadUserExtendedData();
      rerenderRoleContent();
      showToast('Group created', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('join-group', async (id) => {
  try {
    await apiCall(`/api/user/study-groups/${id}/join`, 'POST');
    await loadUserExtendedData();
    rerenderRoleContent();
    showToast('Joined group', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});
