/* ============================================================
   ExpertHub 2.0 — dashboards/user/claims.js
   Claims with evidence upload, timeline, status tracking.
   ============================================================ */

const CLAIM_MAX_SIZE_MB = 10;

function renderUserClaims() {
  const claims = S.claims || [];
  const open   = claims.filter(c => ['pending','under_review','awaiting_evidence'].includes(c.status));
  const closed = claims.filter(c => ['approved','rejected','resolved'].includes(c.status));

  return UserUI.page({
    title: 'My Claims',
    breadcrumb: 'Claims',
    content: `
      ${open.length ? `
        <section class="panel">
          <h3 class="panel-title">Open Claims</h3>
          ${open.map(c => renderClaimCard(c)).join('')}
        </section>
      ` : ''}

      ${closed.length ? `
        <section class="panel">
          <h3 class="panel-title">Closed Claims</h3>
          ${closed.map(c => renderClaimCard(c)).join('')}
        </section>
      ` : ''}

      ${!claims.length ? `
        <section class="panel">${UserUI.empty({
          icon: 'fa-gavel',
          title: 'No claims filed',
          desc: 'If you have an issue with a consultation or course, you can file a claim.',
        })}</section>
      ` : ''}
    `,
  });
}

function renderClaimCard(c) {
  return `
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
      ${c.evidence_urls && c.evidence_urls.length ? `
        <p class="form-hint">${c.evidence_urls.length} evidence file${c.evidence_urls.length === 1 ? '' : 's'} attached</p>
      ` : ''}
      ${['rejected'].includes(c.status) && !c.appealed ? `
        <div class="panel-actions" style="margin-top:8px">
          <button class="btn btn-secondary btn-sm" data-action="appeal-claim" data-id="${c.id}">
            <i class="fas fa-undo"></i> Appeal</button>
        </div>
      ` : ''}
    </article>
  `;
}

window.ExpertHubUser.registerModule('claims', renderUserClaims);

window.ExpertHubUser.registerAction('file-claim', (consultationId) => {
  openModal({
    title: 'File a Claim',
    body: `
      <label class="form-group"><span class="form-label">Claim Title</span>
        <input id="clTitle" class="form-input" required /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="clDesc" class="form-textarea" rows="4" required></textarea></label>
      <label class="form-group"><span class="form-label">Amount (optional)</span>
        <input id="clAmount" type="number" class="form-input" min="0" step="1" /></label>
      <label class="form-group"><span class="form-label">Evidence (optional)</span>
        <input id="clEvidence" type="file" class="form-input"
               accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" />
        <p class="form-hint">Max ${CLAIM_MAX_SIZE_MB}MB. PDF, images, or text.</p></label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="clSave" class="btn btn-primary">Submit</button>
    `,
  });
  $('#clSave').onclick = async () => {
    const title = $('#clTitle').value.trim();
    const desc  = $('#clDesc').value.trim();
    if (!title || !desc) return showToast('Title and description required', 'error');
    const file = $('#clEvidence').files[0];
    if (file && file.size > CLAIM_MAX_SIZE_MB * 1024 * 1024) {
      return showToast(`Evidence file too large (max ${CLAIM_MAX_SIZE_MB}MB)`, 'error');
    }
    const btn = $('#clSave');
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const amount = $('#clAmount').value;
      const payload = {
        consultation_id: Number(consultationId) || null,
        claim_title: title,
        claim_description: desc,
        claim_amount: amount ? Number(amount) : null,
      };
      if (file) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => v !== null && fd.append(k, v));
        fd.append('evidence', file);
        await apiCall('/api/user/claims', 'POST', fd, true);
      } else {
        await apiCall('/api/user/claims', 'POST', payload);
      }
      closeModal();
      await loadAllData?.();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Claim filed', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false;
    }
  };
});

window.ExpertHubUser.registerAction('appeal-claim', async (id) => {
  UserUI.formModal({
    title: 'Appeal Claim Decision',
    fields: [
      { name: 'appeal_reason', label: 'Why should this be reconsidered?', type: 'textarea', rows: 4, required: true },
    ],
    submitLabel: 'Submit Appeal',
    onSubmit: async (v) => {
      await apiCall(`/api/user/claims/${id}/appeal`, 'POST', v);
      closeModal();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Appeal submitted', 'success');
    },
  });
});