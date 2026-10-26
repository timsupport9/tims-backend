/* ============================================================
   admin/disputes.js — Consultation disputes
   ============================================================ */
(function () {
  AdminDash.reg('disputes', {
    nav: { label: 'Disputes', icon: 'fa-gavel' },
    render() {
      const disputes = S.consultationDisputes || [];
      const analytics = S.adminConsultationAnalytics || { totals: {}, cancellation_reasons: [] };
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Disputes</span></div>
        <section class="page-header"><h1 class="page-title">Consultation Disputes</h1></section>

        <section class="stat-grid">
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Total Consultations</p><p class="stat-value">${analytics.totals?.total||0}</p></div><div class="stat-icon stat-icon-blue"><i class="fas fa-comments"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Completed</p><p class="stat-value">${analytics.totals?.completed||0}</p></div><div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">Open Disputes</p><p class="stat-value">${disputes.filter(d => ['open','investigating'].includes(d.status)).length}</p></div><div class="stat-icon stat-icon-red"><i class="fas fa-gavel"></i></div></div>
          <div class="dashboard-card stat-card"><div class="stat-info"><p class="stat-label">No-Shows</p><p class="stat-value">${analytics.totals?.no_shows||0}</p></div><div class="stat-icon stat-icon-yellow"><i class="fas fa-user-slash"></i></div></div>
        </section>

        <section class="panel">
          <h3 class="panel-title">Open Disputes</h3>
          ${disputes.length ? disputes.map(d => `
            <article class="dispute-card">
              <header class="dispute-header">
                <div><h4>${esc(d.consultation_title||'Consultation')}</h4>
                  <p class="dispute-meta">Opened by ${esc(d.opener_name||'—')} against ${esc(d.expert_name||'—')} · ${fmtDate(d.opened_at)}</p>
                </div>
                <span class="${statusClass(d.status)}">${esc(d.status)}</span>
              </header>
              <p class="dispute-reason"><strong>Reason:</strong> ${esc(d.reason||'')}</p>
              <p class="dispute-desc">${esc(d.description||'')}</p>
              ${d.evidence ? `<p class="dispute-evidence"><i class="fas fa-paperclip"></i> Evidence attached</p>` : ''}
              <footer class="dispute-actions">
                <button class="btn btn-info btn-sm" data-action="dispute-investigate" data-id="${d.id}">Investigate</button>
                <button class="btn btn-success btn-sm" data-action="dispute-resolve" data-id="${d.id}">Resolve</button>
                <button class="btn btn-danger btn-sm" data-action="dispute-reject" data-id="${d.id}">Reject</button>
              </footer>
            </article>
          `).join('') : '<p class="empty-row">No disputes</p>'}
        </section>

        <section class="panel">
          <h3 class="panel-title">Cancellation Reasons</h3>
          <ul class="list-stack">
            ${(analytics.cancellation_reasons||[]).map(r => `
              <li class="list-row"><div class="list-row-main"><span class="list-row-title">${esc(r.cancel_reason||'No reason')}</span></div><span class="chip chip-neutral">${r.c}×</span></li>
            `).join('') || '<li class="empty-row">No cancellations</li>'}
          </ul>
        </section>`;
    },
    actions: {
      'dispute-investigate': async ({ id }) => {
        await apiCall(`/api/admin/disputes/${id}`, 'PUT', { status: 'investigating' });
        await loadAllData(); showToast('Investigating','info'); rerenderRoleContent();
      },
      'dispute-resolve': async ({ id }) => {
        const r = prompt('Resolution:') || '';
        await apiCall(`/api/admin/disputes/${id}`, 'PUT', { status: 'resolved', resolution: r });
        await loadAllData(); showToast('Resolved','success'); rerenderRoleContent();
      },
      'dispute-reject': async ({ id }) => {
        const r = prompt('Rejection reason:') || '';
        await apiCall(`/api/admin/disputes/${id}`, 'PUT', { status: 'rejected', resolution: r });
        await loadAllData(); showToast('Rejected','warning'); rerenderRoleContent();
      },
    },
  });
})();
