/* ============================================================
   dashboards/shared/dashboard-layout.js — Reusable page blocks
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const Layout = {
    breadcrumbs(items) {
      return EH.Breadcrumbs.render(items);
    },

    pageHeader(title, { actions = '', subtitle = '' } = {}) {
      return `
        <section class="page-header">
          <div>
            <h1 class="page-title">${EH.Fmt.esc(title)}</h1>
            ${subtitle ? `<p class="page-subtitle">${EH.Fmt.esc(subtitle)}</p>` : ''}
          </div>
          ${actions ? `<div class="page-actions">${actions}</div>` : ''}
        </section>`;
    },

    statCard({ label, value, sub = '', icon = 'fa-chart-line', tone = 'blue' }) {
      return `
        <div class="dashboard-card stat-card">
          <div class="stat-info">
            <p class="stat-label">${EH.Fmt.esc(label)}</p>
            <p class="stat-value">${value}</p>
            ${sub ? `<p class="stat-sub">${EH.Fmt.esc(sub)}</p>` : ''}
          </div>
          <div class="stat-icon stat-icon-${tone}">
            <i class="fas ${icon}"></i>
          </div>
        </div>`;
    },

    statGrid(cards) {
      return `<section class="stat-grid">${cards.join('')}</section>`;
    },

    panel(title, content, { className = '' } = {}) {
      return `
        <section class="panel ${className}">
          ${title ? `<h3 class="panel-title">${EH.Fmt.esc(title)}</h3>` : ''}
          ${content}
        </section>`;
    },

    table(headers, rows, { emptyColspan = null, footer = '' } = {}) {
      const colspan = emptyColspan || headers.length;
      return `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>${headers.map(h => `<th>${EH.Fmt.esc(h)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${rows.length
                ? rows.join('')
                : `<tr><td colspan="${colspan}" class="empty-row">No records found</td></tr>`}
            </tbody>
          </table>
        </div>
        ${footer}`;
    },
  };

  EH.Layout = Layout;
})(window);
