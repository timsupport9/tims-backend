/* ============================================================
   ExpertHub 2.0 — js/admin/16-broadcasts.js
   Admin broadcast composer.
   ============================================================ */

function adminBroadcasts() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Broadcasts</span></div>
    <section class="page-header"><h1 class="page-title">Broadcasts</h1></section>
    <section class="panel">
      <h3 class="panel-title">Send a Broadcast</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Title</span><input id="broadcastTitle" class="form-input" /></label>
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
        <button class="btn btn-primary" data-action="send-broadcast"><i class="fas fa-paper-plane"></i> Send Broadcast</button>
      </div>
    </section>
  `;
}