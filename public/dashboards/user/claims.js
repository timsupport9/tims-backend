/* ============================================================
   ExpertHub 2.0 — dashboards/user/claims.js
   Claims list + filing.
   ============================================================ */

function renderUserClaims() {
  return UserUI.page({
    title: 'My Claims',
    breadcrumb: 'Claims',
    content: `
      <section class="panel">
        ${(S.claims || []).length ? (S.claims || []).map(c => `
          <article class="claim-card">
            <header class="claim-header">
              <span class="claim-title">${esc(c.claim_title || '')}</span>
              ${UserUI.statusPill(c.status)}
            </header>
            <p class="claim-desc">${esc(c.claim_description || '')}</p>
            ${c.claim_amount ? `<p class="claim-amount">Amount: ${fmtCur(c.claim_amount)}</p>` : ''}
            ${c.resolution ? `
              <div class="alert alert-info" style="margin-top:10px">
                <strong>Resolution:</strong> ${esc(c.resolution)}
              </div>
            ` : ''}
          </article>
        `).join('') : UserUI.empty({
          icon: 'fa-gavel',
          title: 'No claims filed',
          desc: 'If you have an issue with a consultation or course, you can file a claim.',
        })}
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('claims', renderUserClaims);

window.ExpertHubUser.registerAction('file-claim', (consultationId) => {
  UserUI.formModal({
    title: 'File a Claim',
    fields: [
      { name: 'claim_title',       label: 'Claim Title', required: true },
      { name: 'claim_description', label: 'Description', type: 'textarea', rows: 4, required: true },
      { name: 'claim_amount',      label: 'Amount (optional)', type: 'number', min: 0 },
    ],
    submitLabel: 'Submit',
    onSubmit: async (v) => {
      await apiCall('/api/user/claims', 'POST', {
        consultation_id: Number(consultationId) || null,
        claim_title: v.claim_title,
        claim_description: v.claim_description,
        claim_amount: v.claim_amount ? Number(v.claim_amount) : null,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Claim filed', 'success');
    },
  });
});
