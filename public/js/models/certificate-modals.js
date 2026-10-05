/* ============================================================
   ExpertHub 2.0 — certificate-modals.js
   Functions moved intact from 13-modals.js.
   ============================================================ */

function printCertificateModal(certId) {
  const c = S.certificates.find(x => String(x.id) === String(certId));
  if (!c) return;
  openModal({
    title: 'Certificate',
    body: `<div style="text-align:center;padding:20px;border:3px double var(--brand);border-radius:12px">
      <h2>Certificate of Completion</h2>
      <p style="font-size:1.1rem;margin:20px 0">This certifies that</p>
      <h3 style="font-size:1.5rem;color:var(--brand)">${esc(currentUser?.name || '')}</h3>
      <p style="margin:20px 0">has successfully completed</p>
      <h4>${esc(c.course_title || '')}</h4>
      <p style="margin-top:20px;font-size:.85rem;color:var(--text-muted)">
        Serial: ${esc(c.serial)} - Issued: ${fmtDate(c.issued_at)}</p>
    </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button class="btn btn-primary" onclick="window.print()">
               <i class="fas fa-print"></i> Print</button>`,
  });
}
function openIssueCertificateModal() {
  openModal({
    title: 'Issue Certificate',
    body: `
      <label class="form-group">
        <span class="form-label">Trainee</span>
        <select id="icTrainee" class="form-select">
          <option value="">Select trainee</option>
          ${S.trainees.map(t => `
            <option value="${t.id}">${esc(t.name)} - ${esc(t.email)}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Programme</span>
        <select id="icProgramme" class="form-select">
          <option value="">Select programme</option>
          ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select>
      </label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Awarding body (optional)</span>
          <input id="icBody" class="form-input" placeholder="e.g. Chartered Institute" /></label>
        <label class="form-group"><span class="form-label">Grade (optional)</span>
          <input id="icGrade" class="form-input" placeholder="e.g. Distinction" /></label>
        <label class="form-group"><span class="form-label">CPD points</span>
          <input id="icCpd" type="number" class="form-input" value="0" min="0" step="0.5" /></label>
        <label class="form-group"><span class="form-label">Validity in months</span>
          <input id="icMonths" type="number" class="form-input" placeholder="Leave blank for no expiry" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="icSave" class="btn btn-primary">Issue Certificate</button>`,
  });
  $('#icSave').onclick = async () => {
    const trainee_id = Number($('#icTrainee').value);
    const programme_id = Number($('#icProgramme').value);
    if (!trainee_id || !programme_id) {
      return showToast('Select trainee and programme', 'error');
    }
    try {
      showLoading(true);
      const d = await apiCall('/api/institution/certificates/issue', 'POST', {
        trainee_id,
        programme_id,
        awarding_body: $('#icBody').value || null,
        grade: $('#icGrade').value || null,
        cpd_points: Number($('#icCpd').value || 0),
        valid_months: $('#icMonths').value ? Number($('#icMonths').value) : null,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(`Certificate issued: ${d.serial}`, 'success', 8000);
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}
