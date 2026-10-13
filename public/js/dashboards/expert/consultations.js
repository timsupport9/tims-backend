/* ============================================================
   dashboards/expert/consultations.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  let filter = '';

  function render() {
    const me = S.currentUser || {};
    const mine = S.consultations.filter(c => c.expert_id === me.id);
    const filtered = filter ? mine.filter(c => c.status === filter) : mine;

    const html = `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Consultations' }])}
      ${EH.Layout.pageHeader('My Consultations', {
        actions: `
          <select id="expert-consult-filter" class="form-select" style="max-width:180px">
            <option value="">All statuses</option>
            ${['assigned','in_progress','completed','cancelled'].map(s => `
              <option value="${s}" ${filter === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>`,
      })}

      <section class="list-stack">
        ${filtered.map(c => `
          <article class="case-card">
            <header class="case-header">
              <h3 class="case-title">${EH.Fmt.esc(c.title || '')}</h3>
              <span class="${EH.Fmt.statusClass(c.status)}">${EH.Fmt.esc(c.status || '')}</span>
            </header>
            <p class="case-client">Client: ${EH.Fmt.esc(c.client_name || 'Client')}</p>
            <p class="case-type">
              ${EH.Fmt.esc(c.consultation_type || '')} · Priority: ${EH.Fmt.esc(c.priority || 'normal')}
            </p>
            <p class="case-desc">
              ${EH.Fmt.esc(EH.Fmt.truncate(c.description || '', 220))}
            </p>
            <footer class="case-footer">
              <button class="btn btn-primary btn-sm" data-action="open-chat" data-id="${c.id}">
                <i class="fas fa-comments"></i> Chat</button>
              <button class="btn btn-info btn-sm" data-action="video-call" data-id="${c.id}">
                <i class="fas fa-video"></i> Video Call</button>
              ${c.status === 'assigned' ? `<button class="btn btn-success btn-sm" data-action="consult-start" data-id="${c.id}">Start</button>` : ''}
              ${c.status === 'in_progress' ? `<button class="btn btn-success btn-sm" data-action="consult-complete" data-id="${c.id}">Complete</button>` : ''}
              <button class="btn btn-secondary btn-sm" data-action="view-consultation" data-id="${c.id}">
                <i class="fas fa-eye"></i> Details</button>
            </footer>
          </article>`).join('') || `
            <div class="empty-state">
              <i class="fas fa-comments"></i>
              <h3>No consultations</h3>
              <p>Consultations assigned by admin will appear here.</p>
            </div>`}
      </section>`;

    setTimeout(() => {
      const sel = document.getElementById('expert-consult-filter');
      if (sel) sel.onchange = () => { filter = sel.value; rerender(); };
    }, 0);

    return html;
  }

  function rerender() {
    const panel = document.getElementById('role-content');
    if (panel) panel.innerHTML = render();
  }

  EH.ExpertConsultations = { render };
})(window);
