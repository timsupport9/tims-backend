/* ============================================================
   ExpertHub 2.0 — 13-refunds.js
   Learner refund requests list.
   ============================================================ */

/* ============================================================
   E-SCHOOL — REFUND REQUESTS
   ============================================================ */
function userRefundRequests() {
  const refunds = S.userRefunds || [];
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Refund Requests</span></div>
    <section class="page-header">
      <h1 class="page-title">Refund Requests</h1>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Courses can be refunded within ${CONFIG.COURSE_REFUND_WINDOW_DAYS} days of purchase
        if you have completed less than 30% of the content.
      </div>
    </div>

    ${refunds.length ? `
      <section class="panel">
        <ul class="list-stack">
          ${refunds.map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.course_title)}</span>
                <span class="list-row-sub">Requested ${timeAgo(r.requested_at)} · ${esc(r.reason || 'No reason given')}</span>
              </div>
              <span class="${statusClass(r.status)}">${esc(r.status)}</span>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-rotate-left"></i>
          <h3>No refund requests</h3>
          <p>Refund requests you make will appear here.</p>
        </div>
      </section>
    `}
  `;
}
