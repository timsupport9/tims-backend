/* ============================================================
   ExpertHub 2.0 — 13c-modals-learner.js
   Learner-facing modal builders.
   ============================================================ */

function openEnrollModal(courseId) {
  const c = S.courses.find(x => String(x.id) === String(courseId));
  if (!c) return;
  openModal({
    title: `Enroll in ${esc(c.title)}`,
    body: `
      <p>Price: <strong>${fmtCur(c.price || 0)}</strong></p>
      <p>Your balance: <strong>${fmtCur(S.wallet.balance || 0)}</strong></p>
      <label class="form-group"><span class="form-label">Coupon (optional)</span>
        <input id="enCoupon" class="form-input" placeholder="WELCOME10" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="enSave" class="btn btn-primary">Confirm Enroll</button>`,
  });
  $('#enSave').onclick = async () => {
    showLoading(true);
    const d = await apiCall('/api/eschool/enroll', 'POST', {
      course_id: Number(courseId),
      coupon_code: $('#enCoupon').value || undefined,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showLoading(false);
    showToast(`Enrolled. Paid ${fmtCur(d.paid)} (discount ${fmtCur(d.discount)})`, 'success', 6000);
  };
}

async function markLessonComplete(lessonId) {
  try {
    await apiCall(`/api/eschool/lessons/${lessonId}/progress`, 'POST', { status: 'completed' });
    showToast('Lesson completed. XP earned!', 'success');
    if (S.__currentCourseId) openCoursePlayer(S.__currentCourseId, lessonId);
  } catch (e) { showToast(e.message, 'error'); }
}

function openCourseReviewModal(courseId) {
  openModal({
    title: 'Rate This Course',
    body: `
      ${['content', 'instructor', 'value'].map(name => `
        <div class="rating-row">
          <label>${name.charAt(0).toUpperCase() + name.slice(1)}</label>
          <div class="star-input" data-name="${name}">
            ${[5,4,3,2,1].map(n => `<span data-value="${n}">★</span>`).join('')}
          </div>
        </div>
      `).join('')}
      <label class="checkbox-row" style="margin-top:10px">
        <input type="checkbox" id="rvRecommend" checked />
        I would recommend this course
      </label>
      <label class="form-group"><span class="form-label">Comment</span>
        <textarea id="rvCourseComment" class="form-textarea" rows="3"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rvCourseSave" class="btn btn-primary">Submit Review</button>`,
  });
  const ratings = { content: 0, instructor: 0, value: 0 };
  document.querySelectorAll('.star-input').forEach(c => {
    c.querySelectorAll('span').forEach(s => s.onclick = () => {
      const n = c.dataset.name; const v = Number(s.dataset.value);
      ratings[n] = v;
      c.querySelectorAll('span').forEach(x => x.classList.toggle('active', Number(x.dataset.value) <= v));
    });
  });
  $('#rvCourseSave').onclick = async () => {
    if (!ratings.content) return showToast('Content rating required', 'error');
    await apiCall('/api/user/course-reviews', 'POST', {
      course_id: courseId,
      content_rating: ratings.content,
      instructor_rating: ratings.instructor || ratings.content,
      value_rating: ratings.value || ratings.content,
      would_recommend: $('#rvRecommend').checked,
      comment: $('#rvCourseComment').value,
    });
    closeModal(); showToast('Review submitted', 'success');
  };
}

function openRefundModal(enrollmentId) {
  openModal({
    title: 'Request Refund',
    body: `
      <div class="alert alert-info"><i class="fas fa-info-circle"></i>
        Refunds are available within ${CONFIG.COURSE_REFUND_WINDOW_DAYS} days of purchase.
        Less than 30% completion is required.</div>
      <label class="form-group"><span class="form-label">Reason</span>
        <textarea id="refundReason" class="form-textarea" rows="4"
                  placeholder="Tell us why you'd like a refund"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="refundGo" class="btn btn-warning">Submit Request</button>`,
  });
  $('#refundGo').onclick = async () => {
    const reason = $('#refundReason').value.trim();
    if (!reason) return showToast('Please provide a reason', 'error');
    await apiCall(`/api/user/enrollments/${enrollmentId}/refund`, 'POST', { reason });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Refund requested', 'success');
  };
}

async function topUpWallet() {
  const amount = Number($('#topupAmount').value || 0);
  const provider = $('#topupProvider').value;
  if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error');
  showLoading(true);
  await apiCall('/api/user/wallet/topup', 'POST', { amount, provider });
  await reloadWallet(); showLoading(false);
  rerenderRoleContent(); showToast('Funds added', 'success');
}

function openChangeIntentModal() {
  openModal({
    title: 'Choose your mode',
    body: `
      <p class="form-hint">This controls what appears on your dashboard.</p>
      <label class="form-group"><span class="form-label">Mode</span>
        <select id="intentSel" class="form-select">
          <option value="both" ${S.userIntent === 'both' ? 'selected' : ''}>Both - Learning and Consulting</option>
          <option value="learn" ${S.userIntent === 'learn' ? 'selected' : ''}>Learning only</option>
          <option value="consult" ${S.userIntent === 'consult' ? 'selected' : ''}>Consulting only</option>
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="intentSave" class="btn btn-primary">Save</button>`,
  });
  $('#intentSave').onclick = async () => {
    S.userIntent = $('#intentSel').value;
    await apiCall('/api/user/preferences', 'PUT', { intent: S.userIntent });
    closeModal(); rerenderRoleContent(); showToast('Mode updated', 'success');
  };
}

function openReviewModal(consultationId, expertId) {
  openModal({
    title: 'Rate Expert',
    body: `
      <label class="form-group"><span class="form-label">Rating</span>
        <select id="rvRating" class="form-select">
          ${[5,4,3,2,1].map(n => `<option value="${n}">${n} of 5</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Comment</span>
        <textarea id="rvComment" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rvSave" class="btn btn-primary">Submit</button>`,
  });
  $('#rvSave').onclick = async () => {
    await apiCall('/api/user/reviews', 'POST', {
      expert_id: expertId,
      consultation_id: Number(consultationId),
      rating: Number($('#rvRating').value),
      comment: $('#rvComment').value,
    });
    closeModal(); showToast('Review submitted', 'success');
  };
}

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

function openNewConsultationModal() {
  const expertOpts = S.experts.map(e =>
    `<option value="${e.id}">${esc(e.name)} (${esc(e.specialization || '')})</option>`
  ).join('');
  openModal({
    title: 'Request Consultation',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="ncTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Expert (optional)</span>
        <select id="ncExpert" class="form-select">
          <option value="">Any available expert</option>${expertOpts}
        </select></label>
      <label class="form-group">
        <span class="form-label">Type</span>
        <select id="ncType" class="form-select">
          <option value="career">Career</option>
          <option value="academic">Academic</option>
          <option value="business">Business</option>
          <option value="technical">Technical</option>
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Priority</span>
        <select id="ncPriority" class="form-select">
          <option value="low">Low</option>
          <option value="normal" selected>Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="ncDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ncSave" class="btn btn-primary">Submit</button>`,
  });
  $('#ncSave').onclick = async () => {
    const title = $('#ncTitle').value;
    const description = $('#ncDesc').value;
    if (!title || !description) return showToast('Fill all fields', 'error');
    try {
      await apiCall('/api/user/consultations', 'POST', {
        title, description,
        consultation_type: $('#ncType').value,
        priority: $('#ncPriority').value,
        expert_id: $('#ncExpert').value ? Number($('#ncExpert').value) : null,
      });
      closeModal(); await reloadConsultations(); rerenderRoleContent(); showToast('Consultation requested', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openClaimModal(consultationId) {
  openModal({
    title: 'File a Claim',
    body: `
      <label class="form-group"><span class="form-label">Claim title</span>
        <input id="clTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="clDesc" class="form-textarea" rows="4"></textarea></label>
      <label class="form-group"><span class="form-label">Amount (optional)</span>
        <input id="clAmount" type="number" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="clSave" class="btn btn-primary">Submit Claim</button>`,
  });
  $('#clSave').onclick = async () => {
    const claim_title = $('#clTitle').value;
    const claim_description = $('#clDesc').value;
    if (!claim_title || !claim_description) return showToast('Fill all fields', 'error');
    try {
      await apiCall('/api/user/claims', 'POST', {
        consultation_id: Number(consultationId) || null,
        claim_title, claim_description,
        claim_amount: $('#clAmount').value ? Number($('#clAmount').value) : null,
      });
      closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Claim filed', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openNewTicketModal() {
  openModal({
    title: 'New Support Ticket',
    body: `
      <label class="form-group"><span class="form-label">Subject</span>
        <input id="tkSubject" class="form-input" /></label>
      <label class="form-group">
        <span class="form-label">Priority</span>
        <select id="tkPriority" class="form-select">
          <option value="low">Low</option>
          <option value="normal" selected>Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Category</span>
        <select id="tkCat" class="form-select">
          <option value="general">General</option>
          <option value="billing">Billing</option>
          <option value="technical">Technical</option>
          <option value="account">Account</option>
        </select>
      </label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="tkDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tkSave" class="btn btn-primary">Create Ticket</button>`,
  });
  $('#tkSave').onclick = async () => {
    const subject = $('#tkSubject').value;
    const description = $('#tkDesc').value;
    if (!subject || !description) return showToast('Fill all fields', 'error');
    try {
      const d = await apiCall('/api/user/tickets', 'POST', {
        subject, description,
        priority: $('#tkPriority').value,
        category: $('#tkCat').value,
      });
      closeModal(); await loadAllData(); rerenderRoleContent();
      showToast(`Ticket created: ${d.reference}`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

async function openTicketModal(id) {
  try {
    const d = await apiCall('/api/user/tickets');
    const t = (d.tickets || []).find(x => String(x.id) === id) || S.tickets.find(x => String(x.id) === id);
    if (!t) return;
    openModal({
      title: `Ticket ${esc(t.reference || '')}`,
      body: `
        <p><strong>Subject:</strong> ${esc(t.subject || '')}</p>
        <p><strong>Description:</strong> ${esc(t.description || '')}</p>
        <p><strong>Status:</strong> <span class="${statusClass(t.status)}">${esc(t.status)}</span></p>
        <label class="form-group"><span class="form-label">Add reply</span>
          <textarea id="tkReply" class="form-textarea" rows="3"></textarea></label>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
               <button id="tkReplySave" class="btn btn-primary">Send Reply</button>`,
    });
    $('#tkReplySave').onclick = async () => {
      const message = $('#tkReply').value;
      if (!message) return;
      await apiCall(`/api/user/tickets/${id}/replies`, 'POST', { message });
      closeModal(); showToast('Reply sent', 'success');
    };
  } catch (e) { showToast(e.message, 'error'); }
}

function openVideoCall(consultationId) {
  if (!consultationId) return showToast('No consultation selected', 'error');
  const room = `experthub-${consultationId}-${uid()}`;
  openModal({
    title: 'Video Call',
    className: 'chat-modal',
    body: `
      <div class="chat-video-wrap">
        <iframe src="https://meet.jit.si/${room}"
                allow="camera;microphone;fullscreen;display-capture"
                style="width:100%;height:100%;border:0" title="Video call"></iframe>
      </div>
      <p class="form-hint">
        Room ID: <code class="code">${room}</code>.
        Share this with the other party if they cannot join.
      </p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>End call</button>`,
  });
}
