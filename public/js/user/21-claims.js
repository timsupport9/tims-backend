/* ============================================================
   ExpertHub 2.0 — 21-claims.js
   Learner claims list.
   ============================================================ */

/* ============================================================
   USER — CLAIMS
   ============================================================ */
function userClaims() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Claims</span></div>
    <section class="page-header"><h1 class="page-title">My Claims</h1></section>
    <section class="panel">
      ${S.claims.length ? S.claims.map(c => `
        <article class="claim-card">
          <header class="claim-header">
            <span class="claim-title">${esc(c.claim_title || '')}</span>
            <span class="${statusClass(c.status)}">${esc(c.status || '')}</span>
          </header>
          <p class="claim-desc">${esc(c.claim_description || '')}</p>
          ${c.claim_amount ? `<p class="claim-amount">Amount: ${fmtCur(c.claim_amount)}</p>` : ''}
          ${c.resolution ? `
            <div class="alert alert-info" style="margin-top:10px">
              <strong>Resolution:</strong> ${esc(c.resolution)}
            </div>
          ` : ''}
        </article>
      `).join('') : `
        <div class="empty-state">
          <i class="fas fa-gavel"></i>
          <h3>No claims filed</h3>
          <p>If you have an issue with a consultation, you can file a claim.</p>
        </div>
      `}
    </section>
  `;
}
