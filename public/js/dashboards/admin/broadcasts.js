/* ============================================================
   admin/broadcasts.js — Broadcast messaging
   ============================================================ */
(function () {
  AdminDash.reg('broadcasts', {
    nav: { label: 'Broadcasts', icon: 'fa-bullhorn' },
    render() {
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Broadcasts</span></div>
        <section class="page-header"><h1 class="page-title">Broadcasts</h1></section>
        <section class="panel">
          <h3 class="panel-title">Send a Broadcast</h3>
          <div class="form-grid">
            <label class="form-group"><span class="form-label">Title</span><input id="broadcastTitle" class="form-input" /></label>
            <label class="form-group"><span class="form-label">Audience</span>
              <select id="broadcastAudience" class="form-select">
                <option value="all">All users</option>
                <option value="experts">Experts only</option>
                <option value="learners">Learners only</option>
                <option value="institutions">Institutions only</option>
                <option value="admins">Admins only</option>
              </select>
            </label>
            <label class="form-group form-group-full"><span class="form-label">Message</span><textarea id="broadcastMessage" class="form-textarea" rows="4"></textarea></label>
          </div>
          <div class="panel-actions">
            <button class="btn btn-primary" data-action="send-broadcast"><i class="fas fa-paper-plane"></i> Send Broadcast</button>
          </div>
        </section>

        <section class="panel">
          <h3 class="panel-title">Recent Broadcasts</h3>
          <ul class="list-stack">
            ${(S.broadcasts || []).map(b => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(b.title||'')}</span>
                  <span class="list-row-sub">${esc((b.message||'').slice(0,100))}</span>
                </div>
                <span class="list-row-meta">${fmtDT(b.created_at)}</span>
              </li>
            `).join('') || '<li class="empty-row">No broadcasts yet</li>'}
          </ul>
        </section>`;
    },
    actions: {
      'send-broadcast': async () => {
        const title = $('#broadcastTitle').value, message = $('#broadcastMessage').value;
        const audience = $('#broadcastAudience').value;
        if (!title || !message) return showToast('Fill title and message','error');
        showLoading(true);
        const d = await apiCall('/api/admin/notifications/broadcast', 'POST', { title, message, audience });
        showLoading(false); showToast(`Sent to ${d.sent} users`, 'success');
      },
    },
  });
})();
