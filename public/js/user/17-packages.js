/* ============================================================
   ExpertHub 2.0 — 17-packages.js
   Purchased session packages (multi-session credits).
   ============================================================ */

/* ============================================================
   USER — SESSION PACKAGES
   ============================================================ */
function userPackages() {
  const packages = S.userPackages || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Session Packages</span></div>
    <section class="page-header">
      <h1 class="page-title">Session Packages</h1>
    </section>

    ${packages.length ? `
      <section class="card-grid">
        ${packages.map(p => `
          <article class="program-card">
            <span class="chip chip-blue">${p.sessions_remaining} of ${p.sessions_total || p.sessions_remaining} left</span>
            <h4 class="program-title">${esc(p.package_name)}</h4>
            <p class="program-desc">with ${esc(p.expert_name)}</p>
            <footer class="program-footer">
              <span class="program-meta">Expires: ${fmtDate(p.expires_at)}</span>
            </footer>
            <div class="panel-actions" style="margin-top:10px">
              <button class="btn btn-primary btn-sm" data-action="use-package-credit"
                      data-expert="${p.package_id}">
                <i class="fas fa-calendar-plus"></i> Book Next Session</button>
            </div>
          </article>
        `).join('')}
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-ticket-alt"></i>
          <h3>No packages purchased</h3>
          <p>Packages save you money on multi-session bookings. Browse experts to find packages.</p>
          <button class="btn btn-primary" data-action="switch-tab" data-tab="experts">
            <i class="fas fa-search"></i> Browse Experts</button>
        </div>
      </section>
    `}
  `;
}
