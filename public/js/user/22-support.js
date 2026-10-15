/* ============================================================
   ExpertHub 2.0 — 22-support.js
   Learner support tickets.
   ============================================================ */

/* ============================================================
   USER — SUPPORT
   ============================================================ */
function userSupport() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Support</span></div>
    <section class="page-header">
      <h1 class="page-title">Support</h1>
      <button class="btn btn-primary" data-action="new-ticket">
        <i class="fas fa-plus"></i> New Ticket</button>
    </section>

    <section class="panel">
      ${S.tickets.length ? S.tickets.map(t => `
        <article class="ticket-card">
          <header class="ticket-header">
            <span class="ticket-ref"><code class="code">${esc(t.reference || t.id)}</code></span>
            <span class="${statusClass(t.status)}">${esc(t.status || '')}</span>
          </header>
          <h4 class="ticket-subject">${esc(t.subject || '')}</h4>
          <p class="ticket-desc">${esc(t.description || '')}</p>
          <footer class="ticket-actions">
            <button class="btn btn-secondary btn-sm" data-action="ticket-view" data-id="${t.id}">
              <i class="fas fa-eye"></i> View and Reply</button>
          </footer>
        </article>
      `).join('') : `
        <div class="empty-state">
          <i class="fas fa-headset"></i>
          <h3>No support tickets</h3>
          <p>Need help? Create a ticket and our team will respond.</p>
          <button class="btn btn-primary" data-action="new-ticket">
            <i class="fas fa-plus"></i> Create Ticket</button>
        </div>
      `}
    </section>
  `;
}
