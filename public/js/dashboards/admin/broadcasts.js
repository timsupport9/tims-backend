/* ============================================================
   dashboards/admin/broadcasts.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render() {
    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Broadcasts' }])}
      ${EH.Layout.pageHeader('Broadcasts')}
      <section class="panel">
        <h3 class="panel-title">Send a Broadcast</h3>
        <div class="form-grid">
          <label class="form-group"><span class="form-label">Title</span>
            <input id="broadcastTitle" class="form-input" /></label>
          <label class="form-group">
            <span class="form-label">Audience</span>
            <select id="broadcastAudience" class="form-select">
              <option value="all">All users</option>
              <option value="experts">Experts only</option>
              <option value="learners">Learners only</option>
              <option value="institutions">Institutions only</option>
              <option value="admins">Admins only</option>
            </select>
          </label>
          <label class="form-group form-group-full">
            <span class="form-label">Message</span>
            <textarea id="broadcastMessage" class="form-textarea" rows="4"></textarea>
          </label>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" data-action="send-broadcast">
            <i class="fas fa-paper-plane"></i> Send Broadcast</button>
        </div>
      </section>`;
  }

  EH.AdminBroadcasts = { render };
})(window);
