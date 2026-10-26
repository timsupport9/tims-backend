/* ============================================================
   admin/learning.js — Learning & content administration
   ============================================================ */
(function () {
  AdminDash.reg('learning', {
    nav: { label: 'Learning', icon: 'fa-book' },
    render() {
      const courses = S.courses || [];
      const published = courses.filter(c => c.status === 'published').length;
      const pending = courses.filter(c => c.status === 'pending_approval').length;
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Learning</span></div>
        <section class="page-header"><h1 class="page-title">Learning & Content Administration</h1></section>

        <section class="stat-grid">
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Total Courses</p><p class="stat-value">${courses.length}</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-book"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Published</p><p class="stat-value">${published}</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Pending Approval</p><p class="stat-value">${pending}</p></div><div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Total Enrollments</p><p class="stat-value">${S.enrollments.length}</p></div><div class="stat-icon stat-icon-purple"><i class="fas fa-user-graduate"></i></div></div>
        </section>

        <section class="panel">
          <h3 class="panel-title">Course Approvals</h3>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Title</th><th>Expert</th><th>Type</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${courses.map(c => `
                  <tr>
                    <td>${esc(c.title||'')}</td>
                    <td>${esc(c.expert_name||'—')}</td>
                    <td><span class="chip chip-neutral">${esc(c.course_type||'')}</span></td>
                    <td>${fmtCur(c.price||0)}</td>
                    <td><span class="${statusClass(c.status||'draft')}">${esc(c.status||'draft')}</span></td>
                    <td class="actions-cell">
                      ${c.status === 'pending_approval' ? `<button class="btn btn-success btn-xs" data-action="course-approve" data-id="${c.id}">Approve</button><button class="btn btn-danger btn-xs" data-action="course-reject" data-id="${c.id}">Reject</button>` : ''}
                      ${c.status === 'published' ? `<button class="btn btn-warning btn-xs" data-action="course-unpublish" data-id="${c.id}">Unpublish</button>` : ''}
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="6" class="empty-row">No courses</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>`;
    },
    actions: {
      'course-approve': async ({ id }) => { await apiCall(`/api/admin/courses/${id}/approve`, 'PUT'); await loadAllData(); showToast('Approved','success'); rerenderRoleContent(); },
      'course-reject': async ({ id }) => { const r = prompt('Reason:')||''; await apiCall(`/api/admin/courses/${id}/reject`, 'PUT', { reason: r }); await loadAllData(); showToast('Rejected','warning'); rerenderRoleContent(); },
      'course-unpublish': async ({ id }) => { await apiCall(`/api/admin/courses/${id}/unpublish`, 'PUT'); await loadAllData(); showToast('Unpublished','warning'); rerenderRoleContent(); },
    },
  });
})();
