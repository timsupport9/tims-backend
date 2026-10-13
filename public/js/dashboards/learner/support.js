/* ============================================================
   dashboards/learner/support.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    return `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Support' }])}
      ${EH.Layout.pageHeader('Support', {
        actions: `<button class="btn btn-primary" data-action="new-ticket">
          <i class="fas fa-plus"></i> New Ticket</button>`,
      })}

      <section class="panel">
        ${S.tickets.length ? S.tickets.map(t => `
          <article class="ticket-card">
            <header class="ticket-header">
              <span class="ticket-ref"><code class="code">${EH.Fmt.esc(t.reference || t.id)}</code></span>
              <span class="${EH.Fmt.statusClass(t.status)}">${EH.Fmt.esc(t.status || '')}</span>
            </header>
            <h4 class="ticket-subject">${EH.Fmt.esc(t.subject || '')}</h4>
            <p class="ticket-desc">${EH.Fmt.esc(t.description || '')}</p>
            <footer class="ticket-actions">
              <button class="btn btn-secondary btn-sm" data-action="ticket-view" data-id="${t.id}">
                <i class="fas fa-eye"></i> View & Reply</button>
            </footer>
          </article>`).join('') : `
          <div class="empty-state">
            <i class="fas fa-headset"></i>
            <h3>No support tickets</h3>
            <p>Need help? Create a ticket and our team will respond.</p>
            <button class="btn btn-primary" data-action="new-ticket">
              <i class="fas fa-plus"></i> Create Ticket</button>
          </div>`}
      </section>`;
  }

  EH.LearnerSupport = { render };
})(window);
