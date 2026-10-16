/* ============================================================
   ExpertHub 2.0 — js/admin/20-settings.js
   Admin platform settings.
   ============================================================ */

function adminSettings() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Settings</span></div>
    <section class="page-header"><h1 class="page-title">Settings</h1></section>

    <section class="panel">
      <h3 class="panel-title">Platform</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Platform name</span><input id="setPlatformName" class="form-input" value="ExpertHub" /></label>
        <label class="form-group"><span class="form-label">Support email</span><input id="setSupportEmail" class="form-input" value="support@experthub.com" /></label>
        <label class="form-group">
          <span class="form-label">Default currency</span>
          <select id="setCurrency" class="form-select">
            <option>USD</option><option>KES</option><option>NGN</option><option>EUR</option>
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Timezone</span>
          <select id="setTimezone" class="form-select">
            <option>UTC</option><option>Africa/Nairobi</option><option>Africa/Lagos</option>
          </select>
        </label>
      </div>

      <h3 class="panel-title" style="margin-top:20px">Commission and Payouts</h3>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Consultation commission (%)</span><input id="setCommCons" type="number" class="form-input" value="20" /></label>
        <label class="form-group"><span class="form-label">Course commission (%)</span><input id="setCommCourse" type="number" class="form-input" value="20" /></label>
        <label class="form-group"><span class="form-label">Withdrawal hold (days)</span><input id="setHold" type="number" class="form-input" value="7" /></label>
        <label class="form-group"><span class="form-label">Minimum payout ($)</span><input id="setMinPayout" type="number" class="form-input" value="50" /></label>
      </div>
      <div class="panel-actions">
        <button class="btn btn-primary" data-action="save-settings">Save Settings</button>
      </div>
    </section>
  `;
}