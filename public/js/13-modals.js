/* ============================================================
   ExpertHub 2.0 — 13-modals.js
   Every modal builder + helper functions used by modals.
   ============================================================ */

/* ---------- Helpers ---------- */
async function loadCourseCurriculum(courseId) {
  try {
    const d = await apiCall(`/api/eschool/courses/${courseId}/curriculum`);
    S.courseCurriculum[courseId] = d;
  } catch (_) { S.courseCurriculum[courseId] = { modules: [] }; }
}

/* ---------- Admin modals ---------- */
function openEditUserModal(userId) {
  const u = S.users.find(x => String(x.id) === String(userId));
  if (!u) return;

  openModal({
    title: `Edit ${u.name}`,
    body: `
      <label class="form-group"><span class="form-label">Name</span>
        <input id="euName" class="form-input" value="${esc(u.name || '')}" /></label>
      <label class="form-group"><span class="form-label">Role</span>
        <select id="euRole" class="form-select">
          <option value="learner"     ${u.role === 'learner'     ? 'selected' : ''}>Learner</option>
          <option value="expert"      ${u.role === 'expert'      ? 'selected' : ''}>Expert</option>
          <option value="institution" ${u.role === 'institution' ? 'selected' : ''}>Institution</option>
          <option value="admin"       ${u.role === 'admin'       ? 'selected' : ''}>Admin</option>
        </select></label>
      <label class="form-group"><span class="form-label">Status</span>
        <select id="euStatus" class="form-select">
          <option value="active"    ${u.status === 'active'    ? 'selected' : ''}>Active</option>
          <option value="pending"   ${u.status === 'pending'   ? 'selected' : ''}>Pending</option>
          <option value="suspended" ${u.status === 'suspended' ? 'selected' : ''}>Suspended</option>
        </select></label>
      <label class="form-group" id="euSuspendReasonWrap" style="display:none">
        <span class="form-label">Suspension reason</span>
        <textarea id="euSuspendReason" class="form-textarea" rows="2"
                  placeholder="Explain why the account is being suspended"></textarea>
      </label>
      <div class="panel-actions" style="margin-top:6px">
        <button type="button" class="btn btn-secondary btn-sm" id="euViewActivity">
          <i class="fas fa-history"></i> View activity</button>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="euSave" class="btn btn-primary">Save</button>`,
  });

  const syncSusp = () => {
    $('#euSuspendReasonWrap').style.display =
      $('#euStatus').value === 'suspended' ? '' : 'none';
  };
  $('#euStatus').onchange = syncSusp;
  syncSusp();

  $('#euViewActivity').onclick = () => openUserActivityModal(userId);

  $('#euSave').onclick = async () => {
    const newRole   = $('#euRole').value;
    const newStatus = $('#euStatus').value;
    const reason    = ($('#euSuspendReason').value || '').trim();

    if (newRole !== u.role) {
      const ok = await confirmAction({
        message: `Change ${u.name}'s role from "${u.role}" to "${newRole}"?`,
      });
      if (!ok) return;
    }
    if (newStatus === 'suspended' && !reason) {
      return showToast('Please provide a reason for suspension', 'error');
    }

    setBusy($('#euSave'), true, 'Saving…');
    try {
      await apiCall(`/api/admin/users/${userId}`, 'PUT', {
        name: $('#euName').value,
        role: newRole,
        status: newStatus,
        suspension_reason: newStatus === 'suspended' ? reason : null,
      });
      closeModal();
      await reloadUsers();
      rerenderRoleContent();
      showToast('User updated', 'success');
    } catch (e) {
      showToast(e.message || 'Update failed', 'error');
      setBusy($('#euSave'), false);
    }
  };
}
async function submitCreateExpert() {
  const name  = ($('#newExpertName').value  || '').trim();
  const email = ($('#newExpertEmail').value || '').trim();
  const spec  = ($('#newExpertSpec').value  || '').trim();
  const rate  = Number($('#newExpertRate').value || 0);
  const bio   = $('#newExpertBio').value;
  const phone = $('#newExpertPhone').value;

  if (!name || !email)      return showToast('Name and email required', 'error');
  if (!validEmail(email))   return showToast('Enter a valid email address', 'error');
  if (rate < 0)             return showToast('Hourly rate must be positive', 'error');

  const btn = document.querySelector('[data-action="create-expert"]') || $('#newExpertSave');
  setBusy(btn, true, 'Creating…');
  showLoading(true);
  try {
    const d = await apiCall('/api/admin/experts/create', 'POST', {
      name, email, specialization: spec, hourly_rate: rate, bio, phone,
    });
    await loadAllData();
    rerenderRoleContent();

    // Prefer a one-time setup link over echoing a raw temp password.
    openModal({
      title: 'Expert created',
      body: `
        <div class="alert alert-success"><i class="fas fa-check-circle"></i>
          <div>Account created for <strong>${esc(name)}</strong>.</div>
        </div>
        <p class="form-hint">Share this one-time setup link — it expires in 24 hours.</p>
        <label class="form-group"><span class="form-label">Setup link</span>
          <input class="form-input" readonly onclick="this.select()"
                 value="${esc(d.setup_url || d.temp_password || '')}" /></label>`,
      footer: `<button class="btn btn-primary" data-close-modal>Done</button>`,
    });
  } catch (e) {
    showToast(e.message || 'Could not create expert', 'error');
  } finally {
    showLoading(false);
    setBusy(btn, false);
  }
}
function openAssignExpertModal(consultationId) {
  const opts = S.experts.map(e =>
    `<option value="${e.id}">${esc(e.name)} (${esc(e.specialization || '')})</option>`
  ).join('');
  openModal({
    title: 'Assign Expert',
    body: `<label class="form-group"><span class="form-label">Expert <span class="req">*</span></span>
      <select id="assignExp" class="form-select"><option value="">Select…</option>${opts}</select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="assignSave" class="btn btn-primary">Assign</button>`,
  });
  $('#assignSave').onclick = () => submitFormModal(
    '#assignSave',
    { '#assignExp': { required: true, label: 'Expert' } },
    async () => {
      closeModal();
      await reloadConsultations();
      rerenderRoleContent();
      app.emit('consultation.assigned', { consultationId });
      showToast('Expert assigned', 'success');
    },
    `/api/common/consultations/${consultationId}/assign`,
    'PUT',
    () => ({ expert_id: Number($('#assignExp').value) }),
  );
}
function openAssignOpsModal(instId) {
  openModal({
    title: 'Assign Operations Manager',
    body: `
      <label class="form-group"><span class="form-label">Manager name <span class="req">*</span></span>
        <input id="omName" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Manager email <span class="req">*</span></span>
        <input id="omEmail" type="email" class="form-input" /></label>
      <p class="form-hint">A one-time setup link will be generated and shown once.</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="omSave" class="btn btn-primary">Assign</button>`,
  });
  $('#omSave').onclick = () => submitFormModal(
    '#omSave',
    {
      '#omName':  { required: true, maxLength: 100, label: 'Name' },
      '#omEmail': { required: true, email: true, label: 'Email' },
    },
    async () => {
      const d = await apiCall(`/api/admin/institutions/${instId}/ops-manager`, 'POST', {
        name: $('#omName').value, email: $('#omEmail').value,
      });
      closeModal();
      await reloadInstitutions();
      rerenderRoleContent();
      openModal({
        title: 'Ops manager created',
        body: `
          <div class="alert alert-success"><i class="fas fa-check-circle"></i>
            <div>Account created. Share this setup link — it expires in 24 hours.</div></div>
          <label class="form-group"><span class="form-label">Setup link</span>
            <input class="form-input" readonly onclick="this.select()"
                   value="${esc(d.setup_url || d.temp_password || '')}" /></label>`,
        footer: `<button class="btn btn-primary" data-close-modal>Done</button>`,
      });
    },
    null, null, null, // multi-step — handled inside onSuccess
  );
}
function openCreateCouponModal() {
  openModal({
    title: 'New Coupon',
    body: `
      <label class="form-group"><span class="form-label">Code <span class="req">*</span></span>
        <input id="cpCode" class="form-input" placeholder="WELCOME10" style="text-transform:uppercase" /></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Type</span>
          <select id="cpType" class="form-select">
            <option value="percent">Percent</option><option value="fixed">Fixed</option>
          </select></label>
        <label class="form-group"><span class="form-label">Value <span class="req">*</span></span>
          <input id="cpValue" type="number" min="0" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Max uses (optional)</span>
          <input id="cpMax" type="number" min="1" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Min spend</span>
          <input id="cpMin" type="number" min="0" class="form-input" value="0" /></label>
      </div>
      <label class="form-group"><span class="form-label">Applies to</span>
        <select id="cpApply" class="form-select">
          <option value="all">All</option>
          <option value="bootcamp">Bootcamps</option>
          <option value="short_course">Short courses</option>
          <option value="event">Events</option>
          <option value="consultation">Consultations</option>
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="cpSave" class="btn btn-primary">Create</button>`,
  });
  $('#cpSave').onclick = () => submitFormModal(
    '#cpSave',
    {
      '#cpCode':  { required: true, minLength: 3, maxLength: 40, label: 'Code' },
      '#cpValue': { required: true, min: 0, label: 'Value' },
      '#cpMin':   { min: 0, label: 'Min spend' },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      app.emit('coupon.created');
      showToast('Coupon created', 'success');
    },
    '/api/admin/coupons',
    'POST',
    () => ({
      code: $('#cpCode').value.trim().toUpperCase(),
      discount_type: $('#cpType').value,
      discount_value: Number($('#cpValue').value),
      max_uses: $('#cpMax').value ? Number($('#cpMax').value) : null,
      min_spend: Number($('#cpMin').value || 0),
      applies_to: $('#cpApply').value,
    }),
  );
}
async function sendBroadcast() {
  const title    = ($('#broadcastTitle').value   || '').trim();
  const message  = ($('#broadcastMessage').value || '').trim();
  const audience = $('#broadcastAudience').value;
  if (!title || !message) return showToast('Fill title and message', 'error');

  const btn = document.querySelector('[data-action="send-broadcast"]') || $('#broadcastSend');
  setBusy(btn, true, 'Sending…');
  showLoading(true);
  try {
    const d = await apiCall('/api/admin/notifications/broadcast', 'POST', { title, message, audience });
    showToast(`Broadcast sent to ${d.sent} users`, 'success');
    $('#broadcastTitle').value = '';
    $('#broadcastMessage').value = '';
  } catch (e) {
    showToast(e.message || 'Broadcast failed', 'error');
  } finally {
    showLoading(false);
    setBusy(btn, false);
  }
}
async function saveAdminSettings() {
  const settings = {
    platform_name: $('#setPlatformName').value,
    support_email: ($('#setSupportEmail').value || '').trim(),
    default_currency: $('#setCurrency').value,
    default_timezone: $('#setTimezone').value,
    commission_consultation: $('#setCommCons').value,
    commission_course: $('#setCommCourse').value,
    withdrawal_hold_days: $('#setHold').value,
    min_payout: $('#setMinPayout').value,
  };
  if (settings.support_email && !validEmail(settings.support_email)) {
    return showToast('Support email looks invalid', 'error');
  }

  const btn = document.querySelector('[data-action="save-admin-settings"]') || $('#saveAdminSettingsBtn');
  setBusy(btn, true, 'Saving…');
  try {
    await apiCall('/api/admin/settings', 'PUT', { settings });
    showToast('Settings saved', 'success');
  } catch (e) {
    showToast(e.message || 'Could not save settings', 'error');
  } finally {
    setBusy(btn, false);
  }
}
function showConsultationModal(id) {
  const c = S.consultations.find(x => String(x.id) === id);
  if (!c) return;
  openModal({
    title: c.title || 'Consultation',
    body: `
      <p><strong>Client:</strong> ${esc(c.client_name || '-')}</p>
      <p><strong>Expert:</strong> ${esc(c.expert_name || 'Unassigned')}</p>
      <p><strong>Status:</strong> <span class="${consultationStatusClass(c.status)}">${esc(c.status)}</span></p>
      <p><strong>Type:</strong> ${esc(c.consultation_type || '')}</p>
      <p><strong>Description:</strong> ${esc(c.description || '')}</p>
      <p><strong>Created:</strong> ${fmtDT(c.created_at)}</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

function openEventModal(id = null) {
  const ev = id ? S.events.find(x => String(x.id) === id) : {};
  const expertOpts = S.experts.map(e =>
    `<option value="${e.id}" ${ev.expert_id === e.id ? 'selected' : ''}>${esc(e.name)}</option>`
  ).join('');
  openModal({
    title: id ? 'Edit Event' : 'New Event',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="evTitle" class="form-input" value="${esc(ev.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="evDesc" class="form-textarea" rows="3">${esc(ev.description || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Category</span>
        <input id="evCat" class="form-input" value="${esc(ev.category || 'General')}" /></label>
      <label class="form-group">
        <span class="form-label">Expert</span>
        <select id="evExpert" class="form-select">
          <option value="">None</option>${expertOpts}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Date</span>
        <input id="evDate" type="date" class="form-input"
               value="${ev.date ? new Date(ev.date).toISOString().slice(0,10) : ''}" /></label>
      <label class="form-group"><span class="form-label">Capacity</span>
        <input id="evCap" type="number" class="form-input" value="${ev.capacity || 100}" /></label>
      <label class="form-group"><span class="form-label">Price ($)</span>
        <input id="evPrice" type="number" class="form-input" value="${ev.price || 0}" /></label>
      <label class="form-group"><span class="form-label">Expert payment ($)</span>
        <input id="evPay" type="number" class="form-input" value="${ev.expert_payment || 0}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="evSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  $('#evSave').onclick = async () => {
    const payload = {
      title: $('#evTitle').value,
      description: $('#evDesc').value,
      category: $('#evCat').value,
      expert_id: $('#evExpert').value ? Number($('#evExpert').value) : null,
      date: $('#evDate').value || null,
      capacity: Number($('#evCap').value || 100),
      price: Number($('#evPrice').value || 0),
      expert_payment: Number($('#evPay').value || 0),
    };
    try {
      if (id) await apiCall(`/api/admin/events/${id}`, 'PUT', payload);
      else    await apiCall('/api/admin/events', 'POST', payload);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(id ? 'Event updated' : 'Event created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openEnrollModal(courseId) {
  const c = S.courses.find(x => String(x.id) === String(courseId));
  if (!c) return;
  const basePrice = Number(c.price || 0);

  openModal({
    title: `Enroll in ${esc(c.title)}`,
    body: `
      <div class="booking-summary">
        <div class="summary-row"><span>Course price</span><span id="enPrice">${fmtCur(basePrice)}</span></div>
        <div class="summary-row"><span>Discount</span><span id="enDiscount">${fmtCur(0)}</span></div>
        <div class="summary-row total"><span>Total</span><strong id="enTotal">${fmtCur(basePrice)}</strong></div>
        <p class="form-hint">Wallet balance: ${fmtCur(S.wallet.balance || 0)}</p>
      </div>
      <label class="form-group"><span class="form-label">Coupon (optional)</span>
        <div style="display:flex;gap:8px">
          <input id="enCoupon" class="form-input" placeholder="WELCOME10" />
          <button type="button" class="btn btn-secondary" id="enApplyCoupon">Apply</button>
        </div>
        <span class="form-hint" id="enCouponMsg"></span>
      </label>
      <label class="form-group"><span class="form-label">Payment method</span>
        <select id="enPayment" class="form-select">
          <option value="wallet">Wallet (${fmtCur(S.wallet.balance || 0)} available)</option>
          <option value="mpesa">M-Pesa</option>
          <option value="card">Card</option>
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="enSave" class="btn btn-primary">Confirm Enroll</button>`,
  });

  let appliedCoupon = null, discount = 0;
  const updateTotal = () => {
    const total = Math.max(0, basePrice - discount);
    $('#enDiscount').textContent = fmtCur(discount);
    $('#enTotal').textContent    = fmtCur(total);
  };

  $('#enApplyCoupon').onclick = async () => {
    const code = ($('#enCoupon').value || '').trim();
    if (!code) return;
    setBusy($('#enApplyCoupon'), true, 'Checking…');
    try {
      const r = await apiCall(`/api/eschool/courses/${courseId}/validate-coupon`, 'POST', { code });
      const msg = $('#enCouponMsg');
      if (!r.valid) {
        appliedCoupon = null; discount = 0;
        msg.textContent = r.reason || 'Coupon not valid for this course';
        msg.style.color = 'var(--danger, #dc2626)';
      } else {
        appliedCoupon = r.code || code;
        discount = Number(r.discount || 0);
        msg.textContent = `Applied — you save ${fmtCur(discount)}`;
        msg.style.color = 'var(--success, #16a34a)';
      }
      updateTotal();
    } catch (e) {
      const msg = $('#enCouponMsg');
      msg.textContent = e.message || 'Could not validate coupon';
      msg.style.color = 'var(--danger, #dc2626)';
    } finally {
      setBusy($('#enApplyCoupon'), false);
    }
  };

  $('#enSave').onclick = async () => {
    setBusy($('#enSave'), true, 'Enrolling…');
    try {
      const d = await apiCall('/api/eschool/enroll', 'POST', {
        course_id: Number(courseId),
        coupon_code: appliedCoupon || undefined,
        payment_method: $('#enPayment').value,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(`Enrolled. Paid ${fmtCur(d.paid)} (discount ${fmtCur(d.discount)})`, 'success', 6000);
    } catch (e) {
      showToast(e.message || 'Enrollment failed', 'error');
      setBusy($('#enSave'), false);
    }
  };
}
async function markLessonComplete(lessonId) {
  try {
    await apiCall(`/api/eschool/lessons/${lessonId}/progress`, 'POST', { status: 'completed' });
    showToast('Lesson completed. XP earned!', 'success');
    if (S.__currentCourseId) openCoursePlayer(S.__currentCourseId, lessonId);
  } catch (e) { showToast(e.message, 'error'); }
}

function openCourseReviewModal(courseId, enrollmentId) {
  openModal({
    title: 'Rate This Course',
    body: `
      <p class="form-hint">Only learners who completed the course can leave a review.</p>
      ${['content', 'instructor', 'value'].map(name => `
        <div class="rating-row">
          <label>${name.charAt(0).toUpperCase() + name.slice(1)}</label>
          <div class="star-input" data-name="${name}" role="radiogroup" aria-label="${name} rating">
            ${[5,4,3,2,1].map(n =>
              `<span data-value="${n}" role="radio" tabindex="0"
                     aria-label="${n} out of 5">★</span>`).join('')}
          </div>
        </div>
      `).join('')}
      <label class="checkbox-row" style="margin-top:10px">
        <input type="checkbox" id="rvRecommend" checked />
        I would recommend this course
      </label>
      <label class="form-group"><span class="form-label">Comment</span>
        <textarea id="rvCourseComment" class="form-textarea" rows="4" maxlength="1000"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rvCourseSave" class="btn btn-primary">Submit Review</button>`,
  });

  const ratings = { content: 0, instructor: 0, value: 0 };
  document.querySelectorAll('.star-input').forEach(c => {
    const set = (v) => {
      ratings[c.dataset.name] = v;
      c.querySelectorAll('span').forEach(x =>
        x.classList.toggle('active', Number(x.dataset.value) <= v));
    };
    c.querySelectorAll('span').forEach(s => {
      s.onclick = () => set(Number(s.dataset.value));
      s.onkeydown = (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault(); set(Number(s.dataset.value));
        }
      };
    });
  });

  $('#rvCourseSave').onclick = async () => {
    if (!ratings.content) return showToast('Content rating required', 'error');
    setBusy($('#rvCourseSave'), true, 'Submitting…');
    try {
      await apiCall('/api/user/course-reviews', 'POST', {
        course_id: Number(courseId),
        enrollment_id: enrollmentId || null,
        content_rating: ratings.content,
        instructor_rating: ratings.instructor || ratings.content,
        value_rating: ratings.value || ratings.content,
        would_recommend: $('#rvRecommend').checked,
        comment: ($('#rvCourseComment').value || '').trim(),
      });
      closeModal();
      showToast('Review submitted', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      setBusy($('#rvCourseSave'), false);
    }
  };
}
async function openRefundModal(enrollmentId) {
  try {
    showLoading(true);
    const [preview, enrollment] = await Promise.all([
      apiCall(`/api/user/enrollments/${enrollmentId}/refund-eligibility`),
      Promise.resolve(S.enrollments?.find(e => String(e.id) === String(enrollmentId))),
    ]);

    const eligible = preview.eligible;
    const { days_since_purchase, completion_pct, refund_amount, reason } = preview;

    openModal({
      title: 'Request Refund',
      body: `
        <div class="alert ${eligible ? 'alert-info' : 'alert-error'}">
          <i class="fas fa-info-circle"></i>
          <div>
            <strong>${eligible ? 'Eligible for refund' : 'Not currently eligible'}</strong>
            ${reason ? `<br>${esc(reason)}` : ''}
          </div>
        </div>
        <div class="booking-summary">
          <div class="summary-row"><span>Days since purchase</span>
            <span>${days_since_purchase} / ${CONFIG.COURSE_REFUND_WINDOW_DAYS}</span></div>
          <div class="summary-row"><span>Course completion</span>
            <span>${completion_pct}% (limit 30%)</span></div>
          ${eligible ? `
            <div class="summary-row total"><span>Refund amount</span>
              <strong>${fmtCur(refund_amount || 0)}</strong></div>` : ''}
        </div>
        ${enrollment ? `<p class="form-hint">Course: ${esc(enrollment.course_title || '')}</p>` : ''}
        <label class="form-group" style="margin-top:12px">
          <span class="form-label">Reason</span>
          <textarea id="refundReason" class="form-textarea" rows="4"
                    placeholder="Tell us why you'd like a refund"></textarea></label>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
               <button id="refundGo" class="btn btn-warning" ${eligible ? '' : 'disabled'}>
                 ${eligible ? 'Submit Request' : 'Not Eligible'}</button>`,
    });

    if (!eligible) return;

    $('#refundGo').onclick = async () => {
      const reason = ($('#refundReason').value || '').trim();
      if (!reason) return showToast('Please provide a reason', 'error');
      setBusy($('#refundGo'), true, 'Submitting…');
      try {
        const d = await apiCall(`/api/user/enrollments/${enrollmentId}/refund`, 'POST', { reason });
        closeModal();
        await loadAllData();
        rerenderRoleContent();
        showToast(`Refund requested. Reference ${d.reference || ''}`, 'success', 6000);
      } catch (e) {
        showToast(e.message, 'error');
        setBusy($('#refundGo'), false);
      }
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}
async function topUpWallet() {
  const amount   = Number($('#topupAmount').value || 0);
  const provider = $('#topupProvider').value;
  if (!amount || amount <= 0)     return showToast('Enter a valid amount', 'error');
  if (amount > 100000)            return showToast('Amount exceeds the allowed limit', 'error');

  const btn = document.querySelector('[data-action="topup"]') || $('#topupGo');
  setBusy(btn, true, 'Processing…');
  showLoading(true);
  try {
    const d = await apiCall('/api/user/wallet/topup', 'POST', { amount, provider });
    await reloadWallet();
    rerenderRoleContent();
    if (d.checkout_url) {
      const url = safeUrl(d.checkout_url);
      if (url) window.open(url, '_blank', 'noopener');
    }
    showToast(d.reference ? `Top-up initiated (ref ${d.reference})` : 'Funds added', 'success', 6000);
  } catch (e) {
    showToast(e.message || 'Top-up failed', 'error');
  } finally {
    showLoading(false);
    setBusy(btn, false);
  }
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

async function printCertificateModal(certId) {
  const c = S.certificates.find(x => String(x.id) === String(certId));
  if (!c) return;

  let pdfUrl = '';
  try {
    const d = await apiCall(`/api/certificates/${certId}/pdf-url`);
    pdfUrl = safeUrl(d.url) || '';
  } catch { /* fall back to a client-side print below */ }

  openModal({
    title: 'Certificate',
    body: `
      <div style="text-align:center;padding:20px;border:3px double var(--brand,#4f46e5);border-radius:12px">
        <h2>Certificate of Completion</h2>
        <p style="font-size:1.1rem;margin:20px 0">This certifies that</p>
        <h3 style="font-size:1.5rem;color:var(--brand,#4f46e5)">${esc(currentUser?.name || '')}</h3>
        <p style="margin:20px 0">has successfully completed</p>
        <h4>${esc(c.course_title || '')}</h4>
        <p style="margin-top:20px;font-size:.85rem;color:var(--text-muted,#6b7280)">
          Serial: ${esc(c.serial)} · Issued: ${fmtDate(c.issued_at)}</p>
      </div>
      <p class="form-hint" style="margin-top:12px">
        Verify this certificate at <code class="code">/verify/${esc(c.serial)}</code>.
      </p>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      <button class="btn btn-info" id="certShare">
        <i class="fas fa-link"></i> Copy verification link</button>
      <button class="btn btn-primary" id="certPdf">
        <i class="fas fa-download"></i> Download PDF</button>`,
  });

  $('#certShare').onclick = async () => {
    const url = `${window.location.origin}/verify/${encodeURIComponent(c.serial)}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Verification link copied', 'success');
    } catch {
      showToast('Could not copy link', 'warning');
    }
  };

  $('#certPdf').onclick = () => {
    if (pdfUrl) window.open(pdfUrl, '_blank', 'noopener');
    else window.print();
  };
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
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i>
        <div>Provide as much detail as possible. Claims are reviewed within 3 business days.</div>
      </div>
      <label class="form-group"><span class="form-label">Claim title <span class="req">*</span></span>
        <input id="clTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description <span class="req">*</span></span>
        <textarea id="clDesc" class="form-textarea" rows="4"
                  placeholder="What happened? What outcome do you want?"></textarea></label>
      <label class="form-group"><span class="form-label">Amount claimed (optional)</span>
        <input id="clAmount" type="number" min="0" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Evidence</span>
        <input id="clFiles" type="file" multiple class="form-input" />
        <span class="form-hint">Screenshots, chat logs, contracts — PDF or images.</span></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="clSave" class="btn btn-primary">Submit Claim</button>`,
  });

  $('#clSave').onclick = async () => {
    const title = ($('#clTitle').value || '').trim();
    const description = ($('#clDesc').value || '').trim();
    if (!title || !description) return showToast('Fill all required fields', 'error');

    const files = Array.from($('#clFiles').files || []);
    setBusy($('#clSave'), true, 'Submitting…');
    try {
      let d;
      if (files.length) {
        const fd = new FormData();
        fd.append('consultation_id', Number(consultationId) || '');
        fd.append('claim_title', title);
        fd.append('claim_description', description);
        if ($('#clAmount').value) fd.append('claim_amount', Number($('#clAmount').value));
        files.forEach(f => fd.append('evidence[]', f));
        d = await apiCall('/api/user/claims', 'POST', fd, true);
      } else {
        d = await apiCall('/api/user/claims', 'POST', {
          consultation_id: Number(consultationId) || null,
          claim_title: title,
          claim_description: description,
          claim_amount: $('#clAmount').value ? Number($('#clAmount').value) : null,
        });
      }
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(`Claim filed: ${d.reference || ''}`, 'success', 6000);
    } catch (e) {
      showToast(e.message, 'error');
      setBusy($('#clSave'), false);
    }
  };
}
function openNewTicketModal() {
  openModal({
    title: 'New Support Ticket',
    body: `
      <label class="form-group"><span class="form-label">Subject <span class="req">*</span></span>
        <input id="tkSubject" class="form-input" /></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Priority</span>
          <select id="tkPriority" class="form-select">
            <option value="low">Low</option>
            <option value="normal" selected>Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select></label>
        <label class="form-group"><span class="form-label">Category</span>
          <select id="tkCat" class="form-select">
            <option value="general">General</option>
            <option value="billing">Billing</option>
            <option value="technical">Technical</option>
            <option value="account">Account</option>
          </select></label>
      </div>
      <label class="form-group"><span class="form-label">Description <span class="req">*</span></span>
        <textarea id="tkDesc" class="form-textarea" rows="4"></textarea></label>
      <label class="form-group"><span class="form-label">Attachments</span>
        <input id="tkFiles" type="file" multiple class="form-input" />
        <span class="form-hint">Screenshots and logs help us fix issues faster.</span></label>
      <div class="alert alert-info" id="tkSla" style="display:none">
        <i class="fas fa-clock"></i><div id="tkSlaText"></div>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tkSave" class="btn btn-primary">Create Ticket</button>`,
  });

  const slaMap = { low: '48h', normal: '24h', high: '8h', urgent: '2h' };
  const syncSla = () => {
    const p = $('#tkPriority').value;
    $('#tkSlaText').textContent = `First response expected within ${slaMap[p]}.`;
    $('#tkSla').style.display = '';
  };
  $('#tkPriority').onchange = syncSla;
  syncSla();

  $('#tkSave').onclick = async () => {
    const subject = ($('#tkSubject').value || '').trim();
    const description = ($('#tkDesc').value || '').trim();
    if (!subject || !description) return showToast('Fill all fields', 'error');

    const files = Array.from($('#tkFiles').files || []);
    setBusy($('#tkSave'), true, 'Creating…');
    try {
      let d;
      if (files.length) {
        const fd = new FormData();
        fd.append('subject', subject);
        fd.append('description', description);
        fd.append('priority', $('#tkPriority').value);
        fd.append('category', $('#tkCat').value);
        files.forEach(f => fd.append('attachments[]', f));
        d = await apiCall('/api/user/tickets', 'POST', fd, true);
      } else {
        d = await apiCall('/api/user/tickets', 'POST', {
          subject, description,
          priority: $('#tkPriority').value,
          category: $('#tkCat').value,
        });
      }
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(`Ticket created: ${d.reference}`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
      setBusy($('#tkSave'), false);
    }
  };
}
async function openTicketModal(id) {
  try {
    showLoading(true);
    const [list, thread] = await Promise.all([
      apiCall('/api/user/tickets').catch(() => ({ tickets: [] })),
      apiCall(`/api/user/tickets/${id}/thread`).catch(() => ({ messages: [], attachments: [] })),
    ]);
    const t = (list.tickets || []).find(x => String(x.id) === id) ||
              (S.tickets || []).find(x => String(x.id) === id);
    if (!t) { showToast('Ticket not found', 'error'); return; }

    const messages = thread.messages || [];
    const attachments = thread.attachments || [];

    openModal({
      title: `Ticket ${esc(t.reference || '')}`,
      className: 'modal-lg',
      body: `
        <div class="form-grid">
          <div><p class="form-label">Subject</p><p>${esc(t.subject || '')}</p></div>
          <div><p class="form-label">Status</p>
            <p><span class="${statusClass(t.status)}">${esc(t.status)}</span></p></div>
          <div><p class="form-label">Priority</p><p>${esc(t.priority || '-')}</p></div>
          <div><p class="form-label">Created</p><p>${fmtDT(t.created_at)}</p></div>
        </div>
        <p style="margin-top:12px"><strong>Description:</strong> ${esc(t.description || '')}</p>

        <h4 class="panel-title" style="margin-top:20px">Conversation</h4>
        <ul class="list-stack">
          ${messages.length ? messages.map(m => `
            <li class="list-row" style="flex-direction:column;align-items:flex-start;gap:4px">
              <div style="display:flex;gap:8px;align-items:center;width:100%">
                <img class="user-avatar" src="${avatar({ name: m.author_name })}" alt="" />
                <strong>${esc(m.author_name || 'System')}</strong>
                <span class="list-row-sub">${fmtDT(m.created_at)}</span>
              </div>
              <p style="margin:6px 0 0 40px;white-space:pre-wrap">${esc(m.message)}</p>
            </li>
          `).join('') : '<li class="empty-row">No replies yet</li>'}
        </ul>

        ${attachments.length ? `
          <h4 class="panel-title" style="margin-top:20px">Attachments</h4>
          <ul class="list-stack">
            ${attachments.map(a => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(a.filename)}</span>
                  <span class="list-row-sub">${a.size ? Math.round(a.size/1024) + ' KB' : ''}</span>
                </div>
                <a class="btn btn-secondary btn-xs"
                   href="${safeUrl(a.url) || '#'}" target="_blank" rel="noopener">Download</a>
              </li>
            `).join('')}
          </ul>` : ''}

        <label class="form-group" style="margin-top:16px"><span class="form-label">Add reply</span>
          <textarea id="tkReply" class="form-textarea" rows="3"></textarea></label>
        <label class="form-group"><span class="form-label">Attach files (optional)</span>
          <input id="tkReplyFiles" type="file" multiple class="form-input" /></label>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
               <button id="tkReplySave" class="btn btn-primary">Send Reply</button>`,
    });

    $('#tkReplySave').onclick = async () => {
      const message = ($('#tkReply').value || '').trim();
      if (!message) return showToast('Write a reply first', 'error');
      const files = Array.from($('#tkReplyFiles').files || []);
      setBusy($('#tkReplySave'), true, 'Sending…');
      try {
        if (files.length) {
          const fd = new FormData();
          fd.append('message', message);
          files.forEach(f => fd.append('attachments[]', f));
          await apiCall(`/api/user/tickets/${id}/replies`, 'POST', fd, true);
        } else {
          await apiCall(`/api/user/tickets/${id}/replies`, 'POST', { message });
        }
        closeModal();
        showToast('Reply sent', 'success');
      } catch (e) {
        showToast(e.message, 'error');
        setBusy($('#tkReplySave'), false);
      }
    };
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    showLoading(false);
  }
}
async function openVideoCall(consultationId) {
  if (!consultationId) return showToast('No consultation selected', 'error');
  try {
    showLoading(true);
    // Backend mints a signed room URL that only the two participants can join.
    const d = await apiCall(`/api/consultations/${consultationId}/video-room`);
    const roomUrl = safeUrl(d.url);
    if (!roomUrl) throw new Error('Could not provision a video room');

    openModal({
      title: 'Video Call',
      className: 'chat-modal',
      body: `
        <div class="chat-video-wrap">
          <iframe src="${roomUrl}"
                  allow="camera;microphone;fullscreen;display-capture"
                  referrerpolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                  style="width:100%;height:100%;border:0"
                  title="Video call"></iframe>
        </div>
        <p class="form-hint">
          Room: <code class="code">${esc(d.room_id || '')}</code>.
          Only participants of this consultation can join.
        </p>`,
      footer: `<button class="btn btn-secondary" data-close-modal>End call</button>`,
    });
  } catch (e) {
    showToast(e.message || 'Could not start call', 'error');
  } finally {
    showLoading(false);
  }
}
function openPortfolioItemModal(itemId) {
  const item = itemId ? (S.expertPortfolio.find(x => x.id === itemId) || {}) : {};
  openModal({
    title: itemId ? 'Edit Portfolio Item' : 'Add Portfolio Item',
    body: `
      <label class="form-group"><span class="form-label">Title <span class="req">*</span></span>
        <input id="piTitle" class="form-input" value="${esc(item.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Category</span>
        <input id="piCat" class="form-input" value="${esc(item.category || 'Case Study')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="piDesc" class="form-textarea" rows="4">${esc(item.description || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Link (optional)</span>
        <input id="piLink" class="form-input" value="${esc(item.link || '')}" placeholder="https://" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="piSave" class="btn btn-primary">${itemId ? 'Save' : 'Add'}</button>`,
  });
  $('#piSave').onclick = () => submitFormModal(
    '#piSave',
    {
      '#piTitle': { required: true, maxLength: 200, label: 'Title' },
      '#piLink':  { url: true, label: 'Link' },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      app.emit('portfolio.updated', { itemId });
      showToast('Portfolio saved', 'success');
    },
    '/api/expert/portfolio',
    'POST',
    () => ({
      id: itemId || undefined,
      title: $('#piTitle').value,
      category: $('#piCat').value,
      description: $('#piDesc').value,
      link: safeUrl($('#piLink').value) || null,
    }),
  );
}
function openManageSlotsModal() {
  openModal({
    title: 'Generate Slots',
    className: 'modal-lg',
    body: `
      <div class="form-grid">
        <label class="form-group"><span class="form-label">From date</span>
          <input id="msFrom" type="date" class="form-input"
                 value="${new Date().toISOString().slice(0,10)}" /></label>
        <label class="form-group"><span class="form-label">Repeat for (weeks)</span>
          <input id="msWeeks" type="number" min="1" max="12" class="form-input" value="1" /></label>
        <label class="form-group"><span class="form-label">Weekdays</span>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i) => `
              <label class="checkbox-row" style="min-width:auto">
                <input type="checkbox" class="ms-day" value="${i}"
                       ${i >= 1 && i <= 5 ? 'checked' : ''} /> ${d}
              </label>
            `).join('')}
          </div>
        </label>
      </div>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Start hour</span>
          <input id="msStartHour" type="number" class="form-input" value="9" min="0" max="23" /></label>
        <label class="form-group"><span class="form-label">End hour</span>
          <input id="msEndHour" type="number" class="form-input" value="17" min="1" max="24" /></label>
        <label class="form-group"><span class="form-label">Slot duration (min)</span>
          <select id="msDuration" class="form-select">
            ${[15,30,45,60,90].map(d =>
              `<option value="${d}" ${d === 30 ? 'selected' : ''}>${d}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Buffer between slots (min)</span>
          <input id="msBuffer" type="number" min="0" max="30" step="5" class="form-input" value="0" /></label>
        <label class="form-group"><span class="form-label">Price per slot</span>
          <input id="msPrice" type="number" class="form-input" value="${currentUser?.hourly_rate || 50}" /></label>
      </div>
      <div id="msConflictPreview" class="form-hint" style="margin-top:8px"></div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="msPreview" class="btn btn-info">Preview</button>
             <button id="msSave" class="btn btn-primary">Generate Slots</button>`,
  });

  const buildSlots = () => {
    const from = $('#msFrom').value;
    const weeks = Number($('#msWeeks').value || 1);
    const startHour = Number($('#msStartHour').value);
    const endHour = Number($('#msEndHour').value);
    const duration = Number($('#msDuration').value);
    const buffer = Number($('#msBuffer').value || 0);
    const price = Number($('#msPrice').value);
    const days = Array.from(document.querySelectorAll('.ms-day:checked')).map(x => Number(x.value));

    if (!from || startHour >= endHour || !days.length) return [];

    const slots = [];
    const startBase = new Date(from + 'T00:00:00');
    for (let w = 0; w < weeks; w++) {
      for (const wd of days) {
        const day = new Date(startBase);
        day.setDate(startBase.getDate() + w * 7 + ((wd - startBase.getDay() + 7) % 7));
        for (let h = startHour; h < endHour; h++) {
          for (let m = 0; m < 60; m += duration + buffer) {
            const start = new Date(day);
            start.setHours(h, m, 0, 0);
            const end = new Date(start.getTime() + duration * 60000);
            if (end.getHours() > endHour ||
                (end.getHours() === endHour && end.getMinutes() > 0)) continue;
            slots.push({
              start: start.toISOString(),
              end: end.toISOString(),
              duration, price, type: 'video',
            });
          }
        }
      }
    }
    return slots;
  };

  $('#msPreview').onclick = async () => {
    const slots = buildSlots();
    const conflictEl = $('#msConflictPreview');
    if (!slots.length) { conflictEl.textContent = 'No slots to preview.'; return; }

    try {
      const d = await apiCall('/api/experts/me/slots/conflicts', 'POST', {
        slots: slots.map(s => ({ start: s.start, end: s.end })),
      });
      const conflicts = d.conflicts || [];
      conflictEl.innerHTML = conflicts.length
        ? `<span style="color:var(--danger,#dc2626)">
             ⚠ ${conflicts.length} slot(s) conflict with existing bookings or blocked time — they will be skipped.
           </span>`
        : `<span style="color:var(--success,#16a34a)">
             ✓ ${slots.length} slots ready, no conflicts.
           </span>`;
    } catch {
      conflictEl.textContent = `${slots.length} slots will be created.`;
    }
  };

  $('#msSave').onclick = async () => {
    const slots = buildSlots();
    if (!slots.length) return showToast('No valid slots to create', 'error');
    setBusy($('#msSave'), true, 'Creating…');
    try {
      const d = await apiCall('/api/experts/me/slots', 'POST', { slots });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(`Created ${d.created || slots.length} slots${d.skipped ? `, skipped ${d.skipped}` : ''}`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
      setBusy($('#msSave'), false);
    }
  };
}
function openBlockTimeModal() {
  openModal({
    title: 'Block Time',
    body: `
      <label class="form-group"><span class="form-label">Start <span class="req">*</span></span>
        <input id="btStart" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">End <span class="req">*</span></span>
        <input id="btEnd" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Reason</span>
        <input id="btReason" class="form-input" placeholder="e.g. Personal time" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="btSave" class="btn btn-warning">Block Time</button>`,
  });
  $('#btSave').onclick = () => submitFormModal(
    '#btSave',
    {
      '#btStart': { required: true, label: 'Start' },
      '#btEnd':   {
        required: true, label: 'End',
        custom: (v) => {
          const s = $('#btStart').value;
          if (s && v && new Date(v) <= new Date(s)) return 'End must be after start';
        },
      },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      app.emit('expert.time_blocked');
      showToast('Time blocked', 'success');
    },
    '/api/experts/me/block-time',
    'POST',
    () => ({
      start: $('#btStart').value,
      end: $('#btEnd').value,
      reason: $('#btReason').value,
    }),
  );
}
function openEditTiersModal() {
  const tiers = S.consultationTiers.length ? S.consultationTiers : [
    { name: 'Quick',     duration_minutes: 15, price: 30,  description: '' },
    { name: 'Standard',  duration_minutes: 30, price: 60,  description: '' },
    { name: 'Deep Dive', duration_minutes: 60, price: 110, description: '' },
  ];
  openModal({
    title: 'Edit Pricing Tiers',
    className: 'modal-lg',
    body: `
      <p class="form-hint">Define your session tiers. Clients choose a tier when booking.</p>
      ${[0, 1, 2].map(i => `
        <div class="form-grid" style="margin-bottom:12px;padding:12px;background:var(--surface-2);border-radius:8px">
          <label class="form-group"><span class="form-label">Tier ${i+1} name</span>
            <input id="tier${i}Name" class="form-input" value="${esc(tiers[i]?.name || '')}" /></label>
          <label class="form-group"><span class="form-label">Duration (min)</span>
            <input id="tier${i}Duration" type="number" min="5" class="form-input" value="${tiers[i]?.duration_minutes || ''}" /></label>
          <label class="form-group"><span class="form-label">Price ($)</span>
            <input id="tier${i}Price" type="number" min="0" class="form-input" value="${tiers[i]?.price || ''}" /></label>
          <label class="form-group form-group-full"><span class="form-label">Description</span>
            <input id="tier${i}Desc" class="form-input" value="${esc(tiers[i]?.description || '')}" /></label>
        </div>
      `).join('')}`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tiersSave" class="btn btn-primary">Save Tiers</button>`,
  });
  $('#tiersSave').onclick = () => submitFormModal(
    '#tiersSave',
    {}, // no per-field rules — custom validator below
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Tiers saved', 'success');
    },
    '/api/experts/me/tiers',
    'PUT',
    () => ({
      tiers: [0,1,2].map(i => ({
        name: $(`#tier${i}Name`).value.trim(),
        duration_minutes: Number($(`#tier${i}Duration`).value || 0),
        price: Number($(`#tier${i}Price`).value || 0),
        description: $(`#tier${i}Desc`).value,
      })).filter(t => t.name && t.duration_minutes),
    }),
  );
}
function openCreateCourseModal() {
  openModal({
    title: 'New Course',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Title <span class="req">*</span></span>
        <input id="ccTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Short description</span>
        <textarea id="ccDesc" class="form-textarea" rows="3"></textarea></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Type</span>
          <select id="ccType" class="form-select">
            ${CONFIG.COURSE_TYPES.map(t =>
              `<option value="${t}">${t.replace('_',' ')}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Level</span>
          <select id="ccLevel" class="form-select">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select></label>
        <label class="form-group"><span class="form-label">Category</span>
          <input id="ccCategory" class="form-input" placeholder="e.g. Engineering" /></label>
        <label class="form-group"><span class="form-label">Price ($)</span>
          <input id="ccPrice" type="number" min="0" class="form-input" /></label>
      </div>
      <label class="form-group"><span class="form-label">Learning objectives (one per line)</span>
        <textarea id="ccObjectives" class="form-textarea" rows="3"
                  placeholder="By the end, learners will…"></textarea></label>
      <label class="form-group"><span class="form-label">Tags (comma separated)</span>
        <input id="ccTags" class="form-input" placeholder="backend, api, node" /></label>
      <label class="form-group"><span class="form-label">Thumbnail</span>
        <input id="ccThumb" type="file" accept="image/*" class="form-input" />
        <span class="form-hint">PNG/JPG up to 2 MB. Recommended 1280×720.</span></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ccSave" class="btn btn-primary">Create</button>`,
  });

  $('#ccSave').onclick = async () => {
    const title = ($('#ccTitle').value || '').trim();
    if (!title) return showToast('Title is required', 'error');

    const payload = {
      title,
      description: $('#ccDesc').value || null,
      course_type: $('#ccType').value,
      level: $('#ccLevel').value,
      category: $('#ccCategory').value || null,
      price: Number($('#ccPrice').value || 0),
      objectives: $('#ccObjectives').value
        .split('\n').map(s => s.trim()).filter(Boolean),
      tags: $('#ccTags').value
        .split(',').map(s => s.trim()).filter(Boolean),
    };

    const file = $('#ccThumb').files[0];
    setBusy($('#ccSave'), true, 'Creating…');
    try {
      let course;
      if (file) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) =>
          fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v));
        fd.append('thumbnail', file);
        course = await apiCall('/api/expert/courses', 'POST', fd, true);
      } else {
        course = await apiCall('/api/expert/courses', 'POST', payload);
      }
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Course created', 'success');
    } catch (e) {
      showToast(e.message || 'Could not create course', 'error');
      setBusy($('#ccSave'), false);
    }
  };
}
function openEditCourseModal(courseId) {
  const c = S.courses.find(x => String(x.id) === String(courseId));
  if (!c) return;

  openModal({
    title: `Edit ${esc(c.title)}`,
    className: 'modal-lg',
    body: `
      <div style="display:flex;gap:16px;align-items:flex-start">
        <div style="flex:1">
          <label class="form-group"><span class="form-label">Title</span>
            <input id="ecTitle" class="form-input" value="${esc(c.title || '')}" /></label>
          <label class="form-group"><span class="form-label">Short description</span>
            <textarea id="ecDesc" class="form-textarea" rows="3">${esc(c.description || '')}</textarea></label>
          <div class="form-grid">
            <label class="form-group"><span class="form-label">Category</span>
              <input id="ecCategory" class="form-input" value="${esc(c.category || '')}" /></label>
            <label class="form-group"><span class="form-label">Price ($)</span>
              <input id="ecPrice" type="number" class="form-input" value="${c.price || 0}" /></label>
            <label class="form-group"><span class="form-label">Status</span>
              <select id="ecStatus" class="form-select">
                ${['draft','published','archived'].map(s =>
                  `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select></label>
            <label class="form-group"><span class="form-label">Level</span>
              <select id="ecLevel" class="form-select">
                ${['beginner','intermediate','advanced'].map(l =>
                  `<option value="${l}" ${c.level === l ? 'selected' : ''}>${l}</option>`).join('')}
              </select></label>
          </div>
          <label class="form-group"><span class="form-label">Learning objectives (one per line)</span>
            <textarea id="ecObjectives" class="form-textarea" rows="3">${
              esc((c.objectives || []).join('\n'))
            }</textarea></label>
          <label class="form-group"><span class="form-label">Tags (comma separated)</span>
            <input id="ecTags" class="form-input" value="${esc((c.tags || []).join(', '))}" /></label>
        </div>
        <div style="width:200px;text-align:center">
          <p class="form-label">Thumbnail</p>
          <img src="${esc(c.thumbnail_url || avatar({ name: c.title }))}"
               alt="" style="width:100%;border-radius:8px;object-fit:cover" />
          <input id="ecThumb" type="file" accept="image/*" class="form-input"
                 style="margin-top:8px" />
        </div>
      </div>`,
    footer: `
      <button class="btn btn-danger" id="ecDelete" style="margin-right:auto">
        <i class="fas fa-trash"></i> Delete</button>
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-info" id="ecPreview">
        <i class="fas fa-eye"></i> Preview</button>
      <button id="ecSave" class="btn btn-primary">Save</button>`,
  });

  $('#ecPreview').onclick = () => window.open(`/courses/${courseId}?preview=1`, '_blank', 'noopener');

  $('#ecDelete').onclick = async () => {
    const ok = await confirmAction({
      message: `Delete "${c.title}"? This cannot be undone.`,
    });
    if (!ok) return;
    setBusy($('#ecDelete'), true, 'Deleting…');
    try {
      await apiCall(`/api/expert/courses/${courseId}`, 'DELETE');
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Course deleted', 'success');
    } catch (e) {
      showToast(e.message || 'Delete failed', 'error');
      setBusy($('#ecDelete'), false);
    }
  };

  $('#ecSave').onclick = async () => {
    const payload = {
      title: $('#ecTitle').value,
      description: $('#ecDesc').value || null,
      category: $('#ecCategory').value || null,
      price: Number($('#ecPrice').value || 0),
      status: $('#ecStatus').value,
      level: $('#ecLevel').value,
      objectives: $('#ecObjectives').value
        .split('\n').map(s => s.trim()).filter(Boolean),
      tags: $('#ecTags').value.split(',').map(s => s.trim()).filter(Boolean),
    };
    const file = $('#ecThumb').files[0];
    setBusy($('#ecSave'), true, 'Saving…');
    try {
      if (file) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) =>
          fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v));
        fd.append('thumbnail', file);
        await apiCall(`/api/expert/courses/${courseId}`, 'PUT', fd, true);
      } else {
        await apiCall(`/api/expert/courses/${courseId}`, 'PUT', payload);
      }
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Course updated', 'success');
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
      setBusy($('#ecSave'), false);
    }
  };
}
function openAddModuleModal(courseId) {
  openModal({
    title: 'New Module',
    body: `
      <label class="form-group"><span class="form-label">Module title <span class="req">*</span></span>
        <input id="amTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Duration (hours)</span>
        <input id="amDuration" type="number" min="0" class="form-input" value="2" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="amDesc" class="form-textarea" rows="2"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="amSave" class="btn btn-primary">Add Module</button>`,
  });
  $('#amSave').onclick = () => submitFormModal(
    '#amSave',
    {
      '#amTitle':    { required: true, maxLength: 200, label: 'Title' },
      '#amDuration': { min: 0, label: 'Duration' },
    },
    async () => {
      closeModal();
      await loadCourseCurriculum(courseId);
      rerenderRoleContent();
      showToast('Module added', 'success');
    },
    `/api/institution/programmes/${courseId}/modules`,
    'POST',
    () => ({
      title: $('#amTitle').value,
      duration_hours: Number($('#amDuration').value || 0),
      description: $('#amDesc').value,
    }),
  );
}
function openEditModuleModal(moduleId) {
  openModal({
    title: 'Edit Module',
    body: `
      <label class="form-group"><span class="form-label">Title <span class="req">*</span></span>
        <input id="emTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Duration (hours)</span>
        <input id="emDuration" type="number" min="0" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="emSave" class="btn btn-primary">Save</button>`,
  });
  $('#emSave').onclick = () => submitFormModal(
    '#emSave',
    { '#emTitle': { required: true, label: 'Title' } },
    async () => {
      closeModal();
      rerenderRoleContent();
      showToast('Module updated', 'success');
    },
    `/api/institution/programmes/modules/${moduleId}`,
    'PUT',
    () => ({
      title: $('#emTitle').value,
      duration_hours: Number($('#emDuration').value || 0),
    }),
  );
}
function openAddLessonModal(moduleId) {
  const courseId = S.__activeCourseId;

  openModal({
    title: 'New Lesson',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Lesson title <span class="req">*</span></span>
        <input id="alTitle" class="form-input" /></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Type</span>
          <select id="alType" class="form-select">
            ${CONFIG.LESSON_TYPES.map(t =>
              `<option value="${t}">${t.replace('_',' ')}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Duration (min)</span>
          <input id="alDuration" type="number" min="1" class="form-input" value="15" /></label>
      </div>
      <label class="form-group"><span class="form-label">Content / notes</span>
        <textarea id="alContent" class="form-textarea" rows="4"></textarea></label>
      <label class="form-group"><span class="form-label">Video URL (optional)</span>
        <input id="alVideo" class="form-input" placeholder="https://…" /></label>
      <label class="form-group"><span class="form-label">Learning objectives (one per line)</span>
        <textarea id="alObjectives" class="form-textarea" rows="2"></textarea></label>
      <label class="form-group"><span class="form-label">Attachments (PDFs, slides, worksheets)</span>
        <input id="alFiles" type="file" multiple class="form-input" />
        <span class="form-hint">Up to 5 files, 20 MB each.</span></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="alSave" class="btn btn-primary">Add Lesson</button>`,
  });

  $('#alSave').onclick = async () => {
    const title = ($('#alTitle').value || '').trim();
    if (!title) return showToast('Lesson title is required', 'error');

    const video = ($('#alVideo').value || '').trim();
    if (video && !safeUrl(video)) {
      return showToast('Video URL must be http(s)', 'error');
    }

    const payload = {
      module_id: moduleId,
      title,
      lesson_type: $('#alType').value,
      duration_minutes: Number($('#alDuration').value || 0),
      content: $('#alContent').value,
      video_url: video || null,
      objectives: $('#alObjectives').value
        .split('\n').map(s => s.trim()).filter(Boolean),
    };

    const files = Array.from($('#alFiles').files || []);
    setBusy($('#alSave'), true, 'Adding…');
    try {
      if (files.length) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) =>
          fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v));
        files.forEach(f => fd.append('attachments[]', f));
        await apiCall(`/api/expert/courses/${courseId}/lessons`, 'POST', fd, true);
      } else {
        await apiCall(`/api/expert/courses/${courseId}/lessons`, 'POST', payload);
      }
      closeModal();
      await loadCourseCurriculum(courseId);
      rerenderRoleContent();
      showToast('Lesson added', 'success');
    } catch (e) {
      showToast(e.message || 'Could not add lesson', 'error');
      setBusy($('#alSave'), false);
    }
  };
}
function openEditLessonModal(lessonId) {
  openModal({
    title: 'Edit Lesson',
    body: `
      <label class="form-group"><span class="form-label">Title <span class="req">*</span></span>
        <input id="elTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Content</span>
        <textarea id="elContent" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="elSave" class="btn btn-primary">Save</button>`,
  });
  $('#elSave').onclick = () => submitFormModal(
    '#elSave',
    { '#elTitle': { required: true, maxLength: 200, label: 'Title' } },
    async () => {
      closeModal();
      rerenderRoleContent();
      showToast('Lesson updated', 'success');
    },
    `/api/expert/lessons/${lessonId}`,
    'PUT',
    () => ({
      title: $('#elTitle').value,
      content: $('#elContent').value,
    }),
  );
}
async function saveCourseSettings(courseId) {
  const btn = document.querySelector('[data-action="save-course-settings"]') || $('#builder-course-save');
  const { ok, errors } = validateForm({
    '#builder-course-price': { required: true, min: 0, label: 'Price' },
  });
  if (!ok) return showToast(Object.values(errors)[0], 'error');

  setBusy(btn, true, 'Saving…');
  try {
    await apiCall(`/api/expert/courses/${courseId}`, 'PUT', {
      status: $('#builder-course-status').value,
      price: Number($('#builder-course-price').value),
      level: $('#builder-course-level').value,
    });
    await loadAllData();
    rerenderRoleContent();
    app.emit('course.updated', { id: courseId });
    showToast('Course settings saved', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}
function openFindExpertWizard() {
  openModal({
    title: 'Find Me an Expert',
    body: `
      <div id="wizardStep1">
        <p class="form-hint">Tell us what you need help with. We'll match you with the best experts.</p>
        <label class="form-group"><span class="form-label">What do you need help with?</span>
          <textarea id="wizardProblem" class="form-textarea" rows="3"
                    placeholder="e.g. I need help designing a scalable backend"></textarea></label>
        <div class="form-grid">
          <label class="form-group"><span class="form-label">Budget per hour (max)</span>
            <input id="wizardBudget" type="number" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Session type</span>
            <select id="wizardType" class="form-select">
              <option value="video">Video call</option>
              <option value="audio">Audio call</option>
              <option value="chat">Chat only</option>
            </select></label>
        </div>
      </div>
      <div id="wizardResults" class="hidden"></div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="wizardMatchBtn" class="btn btn-primary">
               <i class="fas fa-magic"></i> Match Me</button>`,
  });
  $('#wizardMatchBtn').onclick = async () => {
    const problemText = $('#wizardProblem').value.trim();
    const budget = $('#wizardBudget').value ? Number($('#wizardBudget').value) : null;
    const type = $('#wizardType').value;
    if (!problemText) return showToast('Describe your problem', 'error');
    showLoading(true);
    const d = await apiCall('/api/consultations/match', 'POST', { problemText, budget, type });
    $('#wizardStep1').classList.add('hidden');
    $('#wizardResults').classList.remove('hidden');
    $('#wizardResults').innerHTML = `
      <h4 style="margin-bottom:12px">Top Matches</h4>
      ${d.matches.length ? d.matches.map(m => `
        <div class="match-card">
          <img class="user-avatar" src="${avatar(m)}" alt="" />
          <div class="match-body">
            <h5>${esc(m.name)}</h5>
            <p>${esc(m.specialization || '')}</p>
            <p class="match-stats">
              <span><i class="fas fa-star"></i> ${Number(m.average_rating || 0).toFixed(1)}</span>
              <span><i class="fas fa-dollar-sign"></i> ${fmtCur(m.hourly_rate)}/hr</span>
            </p>
          </div>
          <div class="match-actions">
            <button class="btn btn-secondary btn-sm" data-action="view-expert-profile" data-id="${m.id}">Profile</button>
            <button class="btn btn-primary btn-sm" data-action="book-slot-with" data-id="${m.id}" data-name="${esc(m.name)}">
              Book</button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">No matches found.</p>'}`;
    $('#wizardMatchBtn').classList.add('hidden');
    showLoading(false);
  };
}

async function openInstantConsultationModal() {
  openModal({
    title: 'Talk to Someone Now',
    body: `
      <p class="form-hint">We'll match you with the next available expert within 15 minutes.</p>
      <label class="form-group"><span class="form-label">What do you need to talk about?</span>
        <input id="icTopic" class="form-input" placeholder="e.g. Urgent code review" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="icGo" class="btn btn-primary">
               <i class="fas fa-bolt"></i> Connect Now</button>`,
  });
  $('#icGo').onclick = async () => {
    const topic = ($('#icTopic').value || '').trim();
    if (!topic) return showToast('Describe what you need', 'error');
    setBusy($('#icGo'), true, 'Connecting…');
    showLoading(true);
    try {
      const d = await apiCall('/api/consultations/instant', 'POST', { topic });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(`Connected with ${d.expert.name}`, 'success', 6000);
    } catch (e) {
      showToast(e.message || 'No experts available right now', 'error');
      setBusy($('#icGo'), false);
    } finally {
      showLoading(false);
    }
  };
}
async function openBookSlotWithExpert(expertId, expertName) {
  let slots = [], tiers = [], packages = [];
  try {
    showLoading(true);
    const [slotsData, tiersData, packagesData] = await Promise.all([
      apiCall(`/api/experts/${expertId}/slots`).catch(() => ({ slots: [] })),
      apiCall(`/api/experts/${expertId}/tiers`).catch(() => ({ tiers: [] })),
      apiCall(`/api/experts/${expertId}/packages`).catch(() => ({ packages: [] })),
    ]);
    slots    = (slotsData.slots || []).filter(s => s.status === 'available');
    tiers    = tiersData.tiers || [];
    packages = packagesData.packages || [];
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    showLoading(false);
  }

  const PLATFORM_FEE_PCT = 0.05;

  openModal({
    title: `Book ${expertName}`,
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Title <span class="req">*</span></span>
        <input id="bsTitle" class="form-input" placeholder="Brief subject" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="bsDesc" class="form-textarea" rows="3"></textarea></label>

      ${tiers.length ? `
        <div class="form-group">
          <span class="form-label">Session tier (optional — sets duration & price)</span>
          <div class="tier-list">
            ${tiers.map((t, i) => `
              <label class="tier-option">
                <input type="radio" name="bsTier"
                       value="${t.id ?? i}"
                       data-duration="${t.duration_minutes}"
                       data-price="${t.price}" />
                <div>
                  <strong>${esc(t.name)}</strong>
                  <span>${t.duration_minutes} min · ${fmtCur(t.price)}</span>
                </div>
              </label>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="form-group">
        <span class="form-label">Pick a slot <span class="req">*</span></span>
        ${slots.length ? `
          <div class="slot-picker">
            ${slots.slice(0, 20).map(s => `
              <button type="button" class="slot-option"
                      data-slot-id="${s.id}"
                      data-price="${s.price}"
                      data-duration="${s.duration_minutes}">
                <div class="slot-option-date">${fmtDate(s.start_time)}</div>
                <div class="slot-option-time">
                  ${fmtInTz(s.start_time, currentUser?.timezone || 'UTC', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div class="slot-option-meta">${s.duration_minutes}m · ${fmtCur(s.price)}</div>
              </button>
            `).join('')}
          </div>
        ` : '<p class="empty-row">No open slots — try another expert or check back later.</p>'}
      </div>

      ${packages.length ? `
        <div class="form-group">
          <span class="form-label">Or buy a package</span>
          ${packages.map(p => `
            <div class="package-option">
              <div><strong>${esc(p.name)}</strong><span>${p.sessions_count} sessions</span></div>
              <div>
                <span class="package-price">${fmtCur(p.price)}</span>
                <button type="button" class="btn btn-secondary btn-sm"
                        data-action="purchase-package" data-id="${p.id}">Buy</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="booking-summary" id="bookingSummary" style="display:none">
        <div class="summary-row"><span>Subtotal</span><span id="bsSubtotal">$0</span></div>
        <div class="summary-row"><span>Platform fee (5%)</span><span id="bsFee">$0</span></div>
        <div class="summary-row total"><span>Total</span><strong id="bsTotal">$0</strong></div>
        <p class="form-hint">Payment held in escrow until session completes.</p>
      </div>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="bsSave" class="btn btn-primary" disabled>
        <i class="fas fa-shield-alt"></i> Pay & Book</button>`,
  });

  let selectedSlot = null;
  let selectedTier = null;
  let submitting   = false;

  const update = () => {
    const base  = selectedSlot?.price ?? selectedTier?.price ?? 0;
    const fee   = Math.round(base * PLATFORM_FEE_PCT * 100) / 100;
    const total = base + fee;
    $('#bsSubtotal').textContent = fmtCur(base);
    $('#bsFee').textContent      = fmtCur(fee);
    $('#bsTotal').textContent    = fmtCur(total);
    $('#bookingSummary').style.display = base ? '' : 'none';
    $('#bsSave').disabled = !selectedSlot || submitting;
  };

  $$('.slot-option').forEach(b => b.onclick = () => {
    $$('.slot-option').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
    selectedSlot = {
      id:       Number(b.dataset.slotId),
      price:    Number(b.dataset.price),
      duration: Number(b.dataset.duration),
    };
    update();
  });

  $$('input[name="bsTier"]').forEach(r => r.onchange = () => {
    const idAttr = r.value;
    selectedTier = {
      id:       Number.isFinite(Number(idAttr)) ? Number(idAttr) : null,
      duration: Number(r.dataset.duration),
      price:    Number(r.dataset.price),
    };
    update();
  });

  $('#bsSave').onclick = async () => {
    if (submitting) return;
    const title = ($('#bsTitle').value || '').trim();
    if (!title)         return showToast('Please add a title', 'error');
    if (!selectedSlot)  return showToast('Please select an available slot', 'error');

    submitting = true;
    setBusy($('#bsSave'), true, 'Booking…');
    try {
      const d = await apiCall('/api/consultations/book', 'POST', {
        expert_id:          expertId,
        slot_id:            selectedSlot.id,
        tier_id:            selectedTier?.id ?? null,
        title,
        description:        ($('#bsDesc').value || '').trim(),
        consultation_type:  'video',
        duration_minutes:   selectedSlot.duration || selectedTier?.duration || 30,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Booked! Expert has 2 hours to confirm.', 'success', 6000);
      return d;
    } catch (e) {
      // Modal stays open so entered data isn't lost.
      showToast(e.message || 'Booking failed', 'error');
    } finally {
      submitting = false;
      const btn = $('#bsSave');
      if (btn && btn.isConnected) {
        setBusy(btn, false);
        btn.disabled = !selectedSlot;
      }
    }
  };
}
async function openRescheduleModal(consultationId) {
  const c = S.consultations.find(x => String(x.id) === String(consultationId));
  if (!c) return;
  showLoading(true);
  const d = await apiCall(`/api/experts/${c.expert_id}/slots`);
  const slots = d.slots.filter(s => s.status === 'available');
  showLoading(false);

  openModal({
    title: 'Reschedule Session',
    body: `
      <p class="form-hint">You have ${CONFIG.MAX_RESCHEDULES - (c.reschedule_count || 0)} reschedules left.</p>
      <div class="slot-picker">
        ${slots.map(s => `
          <button class="slot-option" data-slot-id="${s.id}">
            <div class="slot-option-date">${fmtDate(s.start_time)}</div>
            <div class="slot-option-time">${fmtInTz(s.start_time, currentUser?.timezone || 'UTC', { hour: '2-digit', minute: '2-digit' })}</div>
          </button>
        `).join('') || '<p class="empty-row">No available slots</p>'}
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rsSave" class="btn btn-primary" disabled>Confirm</button>`,
  });
  let selected = null;
  document.querySelectorAll('.slot-option').forEach(b => b.onclick = () => {
    document.querySelectorAll('.slot-option').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected'); selected = Number(b.dataset.slotId);
    $('#rsSave').disabled = false;
  });
  $('#rsSave').onclick = async () => {
    if (!selected) return;
    await apiCall(`/api/consultations/${consultationId}/reschedule`, 'PUT', { new_slot_id: selected });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Rescheduled', 'success');
  };
}

function openCancelConsultationModal(consultationId) {
  const c = S.consultations.find(x => String(x.id) === String(consultationId));
  if (!c) return;
  const preview = refundPreview(c.scheduled_at);
  openModal({
    title: 'Cancel Consultation',
    body: `
      <div class="alert ${preview.pct === 100 ? 'alert-success' : preview.pct > 0 ? 'alert-warning' : 'alert-error'}">
        <i class="fas fa-info-circle"></i>
        <div>${preview.label}</div>
      </div>
      <label class="form-group"><span class="form-label">Reason (optional)</span>
        <textarea id="cancelReason" class="form-textarea" rows="3"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Keep Session</button>
             <button id="cancelGo" class="btn btn-danger">Confirm Cancel</button>`,
  });
  $('#cancelGo').onclick = async () => {
    await apiCall(`/api/consultations/${consultationId}/cancel`, 'PUT', { reason: $('#cancelReason').value });
    closeModal(); await loadAllData(); rerenderRoleContent();
    showToast(`Cancelled. Refund: ${preview.pct}%`, 'success');
  };
}

function openConsultationDetailModal(consultationId) {
  const c = S.consultations.find(x => String(x.id) === String(consultationId));
  if (!c) return;
  openModal({
    title: c.title || 'Consultation',
    className: 'modal-lg',
    body: `
      <div class="consultation-detail-header">
        <span class="${consultationStatusClass(c.status)}">${esc((c.status || '').replace(/_/g, ' '))}</span>
        <span class="chip chip-neutral">${esc(c.session_type || 'scheduled')}</span>
        <span class="chip chip-neutral">${c.duration_minutes || 30} min</span>
      </div>
      <div class="form-grid">
        <div><p class="form-label">Expert</p><p>${esc(c.expert_name || '—')}</p></div>
        <div><p class="form-label">Client</p><p>${esc(c.client_name || '—')}</p></div>
        <div><p class="form-label">Scheduled</p><p>${c.scheduled_at ? fmtInTz(c.scheduled_at, currentUser?.timezone || 'UTC') : '—'}</p></div>
        <div><p class="form-label">Price</p><p>${fmtCur(c.price || 0)}</p></div>
      </div>
      ${c.description ? `<p style="margin-top:12px"><strong>Description:</strong> ${esc(c.description)}</p>` : ''}
      ${c.shared_notes ? `<div class="alert alert-info" style="margin-top:12px"><i class="fas fa-sticky-note"></i>
        <div><strong>Session notes:</strong><br>${esc(c.shared_notes).replace(/\n/g, '<br>')}</div></div>` : ''}
      ${c.ai_summary ? `<div class="alert alert-success" style="margin-top:12px"><i class="fas fa-robot"></i>
        <div><strong>AI Summary:</strong><br>${esc(c.ai_summary).replace(/\n/g, '<br>')}</div></div>` : ''}`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button class="btn btn-info" data-action="open-chat" data-id="${c.id}">
               <i class="fas fa-comments"></i> Chat</button>`,
  });
}

function openConsultationReviewModal(consultationId, expertId) {
  const c = S.consultations.find(x => String(x.id) === String(consultationId));
  if (!c) return;
  if (!['completed', 'resolved'].includes(c.status)) {
    return showToast('You can review once the session is completed', 'error');
  }
  if (c.review_id) {
    return showToast('You already reviewed this session', 'warning');
  }

  openModal({
    title: 'Rate Your Session',
    body: `
      <p class="form-hint">Reviews are public. Be specific and respectful.</p>
      ${['overall', 'expertise', 'communication', 'punctuality'].map(name => `
        <div class="rating-row">
          <label>${name.charAt(0).toUpperCase() + name.slice(1)}</label>
          <div class="star-input" data-name="${name}"
               role="radiogroup" aria-label="${name} rating">
            ${[5,4,3,2,1].map(n =>
              `<span data-value="${n}" role="radio" tabindex="0"
                     aria-label="${n} out of 5">★</span>`).join('')}
          </div>
        </div>
      `).join('')}
      <label class="form-group" style="margin-top:12px">
        <span class="form-label">Comment</span>
        <textarea id="rvComment2" class="form-textarea" rows="4"
                  maxlength="1000"
                  placeholder="What went well? What could be better?"></textarea>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" id="rvAnon" />
        Post my review anonymously
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rvSave2" class="btn btn-primary">Submit Review</button>`,
  });

  const ratings = { overall: 0, expertise: 0, communication: 0, punctuality: 0 };
  document.querySelectorAll('.star-input').forEach(c => {
    const set = (v) => {
      const name = c.dataset.name;
      ratings[name] = v;
      c.querySelectorAll('span').forEach(x =>
        x.classList.toggle('active', Number(x.dataset.value) <= v));
    };
    c.querySelectorAll('span').forEach(s => {
      s.onclick = () => set(Number(s.dataset.value));
      s.onkeydown = (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault(); set(Number(s.dataset.value));
        }
      };
    });
  });

  $('#rvSave2').onclick = async () => {
    if (!ratings.overall) return showToast('Overall rating required', 'error');
    const comment = ($('#rvComment2').value || '').trim();
    if (comment.length < 10) return showToast('Please write at least 10 characters', 'error');

    setBusy($('#rvSave2'), true, 'Submitting…');
    try {
      await apiCall(`/api/consultations/${consultationId}/review`, 'POST', {
        rating: ratings.overall,
        expertise_rating: ratings.expertise || ratings.overall,
        communication_rating: ratings.communication || ratings.overall,
        punctuality_rating: ratings.punctuality || ratings.overall,
        comment,
        anonymous: $('#rvAnon').checked,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Review submitted — thanks for the feedback', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      setBusy($('#rvSave2'), false);
    }
  };
}
function openTipModal(consultationId) {
  openModal({
    title: 'Send a Tip',
    body: `
      <p class="form-hint">Tips go directly to the expert. Fully optional.</p>
      <div class="tip-options">
        ${CONFIG.TIP_PRESETS.map(a => `<button class="tip-btn" data-amount="${a}">$${a}</button>`).join('')}
      </div>
      <label class="form-group"><span class="form-label">Custom amount</span>
        <input id="tipCustom" type="number" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tipGo" class="btn btn-primary" disabled>Send Tip</button>`,
  });
  let amount = 0;
  document.querySelectorAll('.tip-btn').forEach(b => b.onclick = () => {
    document.querySelectorAll('.tip-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); amount = Number(b.dataset.amount);
    $('#tipCustom').value = ''; $('#tipGo').disabled = false;
  });
  $('#tipCustom').oninput = e => {
    amount = Number(e.target.value);
    document.querySelectorAll('.tip-btn').forEach(x => x.classList.remove('active'));
    $('#tipGo').disabled = !amount || amount <= 0;
  };
  $('#tipGo').onclick = async () => {
    await apiCall(`/api/consultations/${consultationId}/tip`, 'POST', { amount });
    closeModal(); showToast(`Tipped ${fmtCur(amount)}`, 'success');
  };
}

function openDisputeModal(consultationId) {
  const reasonMap = {
    no_show: 'Expert did not attend',
    late: 'Session started significantly late',
    quality: 'Session did not match the description',
    inappropriate: 'Inappropriate behaviour',
    other: 'Other',
  };
  openModal({
    title: 'File a Dispute',
    body: `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i>
        <div>Disputes should be filed within 7 days of the session. Funds are frozen pending review.</div>
      </div>
      <label class="form-group"><span class="form-label">Reason</span>
        <select id="dpReason" class="form-select">
          ${Object.entries(reasonMap).map(([k, label]) =>
            `<option value="${k}">${label}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">What happened?</span>
        <textarea id="dpDesc" class="form-textarea" rows="5"
                  placeholder="Be specific about timeline and expectations."></textarea></label>
      <label class="form-group"><span class="form-label">Evidence</span>
        <input id="dpFiles" type="file" multiple class="form-input" /></label>
      <label class="checkbox-row">
        <input type="checkbox" id="dpAck" />
        I confirm the information above is accurate
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="dpGo" class="btn btn-warning">Open Dispute</button>`,
  });

  $('#dpGo').onclick = async () => {
    const description = ($('#dpDesc').value || '').trim();
    if (!description) return showToast('Please describe what happened', 'error');
    if (!$('#dpAck').checked) return showToast('Please confirm accuracy', 'error');

    const files = Array.from($('#dpFiles').files || []);
    setBusy($('#dpGo'), true, 'Opening…');
    try {
      if (files.length) {
        const fd = new FormData();
        fd.append('reason', $('#dpReason').value);
        fd.append('description', description);
        files.forEach(f => fd.append('evidence[]', f));
        await apiCall(`/api/consultations/${consultationId}/dispute`, 'POST', fd, true);
      } else {
        await apiCall(`/api/consultations/${consultationId}/dispute`, 'POST', {
          reason: $('#dpReason').value, description,
        });
      }
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Dispute filed. Funds frozen pending review.', 'warning', 6000);
    } catch (e) {
      showToast(e.message, 'error');
      setBusy($('#dpGo'), false);
    }
  };
}
async function openExpertProfileModal(expertId) {
  try {
    showLoading(true);
    const [profile, questions] = await Promise.all([
      apiCall(`/api/user/experts/${expertId}`),
      apiCall(`/api/experts/${expertId}/questions`).catch(() => ({ questions: [] })),
    ]);
    const e = profile.expert || {};
    const reviews = profile.reviews || [];
    const completedWithMe = profile.completed_consultations || 0;

    openModal({
      title: e.name,
      className: 'modal-lg',
      body: `
        <div class="expert-profile-header">
          <img class="expert-avatar-lg" src="${avatar(e)}" alt="" />
          <div class="expert-profile-info">
            <h2>${esc(e.name)}
              ${e.verified_badge
                ? '<span class="badge-verified"><i class="fas fa-check-circle"></i> Verified</span>'
                : ''}
            </h2>
            <p class="expert-profile-spec">${esc(e.specialization || '')}</p>
            <p class="expert-profile-rate">${fmtCur(e.hourly_rate)} / hour</p>
            <div class="expert-profile-stats">
              <div><strong>${Number(e.average_rating || 0).toFixed(1)}</strong><span>Rating</span></div>
              <div><strong>${reviews.length}</strong><span>Reviews</span></div>
              <div><strong>${e.response_time_minutes ? e.response_time_minutes + 'm' : '—'}</strong><span>Response</span></div>
              <div><strong>${e.completion_rate ? Math.round(e.completion_rate) + '%' : '—'}</strong><span>Completion</span></div>
            </div>
          </div>
        </div>
        ${e.bio ? `<p class="expert-profile-bio">${esc(e.bio).replace(/\n/g, '<br>')}</p>` : ''}
        ${completedWithMe
          ? `<p class="form-hint">You've had ${completedWithMe} completed session${completedWithMe === 1 ? '' : 's'} with ${esc(e.name)}.</p>`
          : ''}

        <h3 class="panel-title" style="margin-top:20px">Recent reviews</h3>
        ${reviews.length ? reviews.slice(0, 5).map(r => `
          <div class="review-item">
            <div class="review-head">
              <strong>${esc(r.reviewer_name || 'Anonymous')}</strong>
              ${r.verified ? '<span class="chip chip-green" style="margin-left:6px">Verified</span>' : ''}
              <span class="list-row-sub" style="margin-left:auto">${fmtDate(r.created_at)}</span>
            </div>
            <p class="review-stars">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</p>
            ${r.comment ? `<p class="review-body">${esc(r.comment)}</p>` : ''}
          </div>
        `).join('') : '<p class="empty-row">No reviews yet</p>'}

        <h3 class="panel-title" style="margin-top:20px">Public Q&A</h3>
        ${questions.questions.length ? questions.questions.slice(0, 5).map(q => `
          <div class="qa-item">
            <p class="qa-q"><i class="fas fa-question-circle"></i> ${esc(q.question)}</p>
            ${q.answer
              ? `<p class="qa-a"><strong>${esc(e.name)}:</strong> ${esc(q.answer)}</p>`
              : '<p class="qa-pending">Awaiting answer</p>'}
          </div>
        `).join('') : '<p class="empty-row">No questions yet</p>'}`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-info" data-action="toggle-shortlist" data-id="${e.id}">
          <i class="fas fa-bookmark"></i> Shortlist</button>
        <button class="btn btn-primary" id="profileBook">
          <i class="fas fa-calendar-plus"></i> Book</button>`,
    });

    $('#profileBook').onclick = () => {
      closeModal();
      openBookSlotWithExpert(e.id, e.name);
    };
  } catch (e) {
    showToast(e.message || 'Could not load profile', 'error');
  } finally {
    showLoading(false);
  }
}
/* ---------- Institution modals ---------- */
function openCampusModal(campusId) {
  const c = campusId ? (S.campuses.find(x => x.id === campusId) || {}) : {};
  openModal({
    title: campusId ? 'Edit Campus' : 'New Campus',
    body: `
      <label class="form-group"><span class="form-label">Campus name <span class="req">*</span></span>
        <input id="cpName" class="form-input" value="${esc(c.name || '')}" /></label>
      <label class="form-group"><span class="form-label">Type</span>
        <select id="cpType" class="form-select">
          ${CONFIG.CAMPUS_TYPES.map(t =>
            `<option value="${t}" ${c.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Address</span>
        <input id="cpAddress" class="form-input" value="${esc(c.address || '')}" /></label>
      <label class="form-group"><span class="form-label">Contact phone</span>
        <input id="cpPhone" class="form-input" value="${esc(c.contact_phone || '')}" /></label>
      <label class="form-group"><span class="form-label">Capacity</span>
        <input id="cpCapacity" type="number" min="1" class="form-input" value="${c.capacity || 50}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="cpSave" class="btn btn-primary">${campusId ? 'Save' : 'Create'}</button>`,
  });
  $('#cpSave').onclick = () => submitFormModal(
    '#cpSave',
    {
      '#cpName':     { required: true, maxLength: 150, label: 'Name' },
      '#cpCapacity': { required: true, min: 1, label: 'Capacity' },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(campusId ? 'Campus updated' : 'Campus created', 'success');
    },
    campusId ? `/api/institution/campuses/${campusId}` : '/api/institution/campuses',
    campusId ? 'PUT' : 'POST',
    () => ({
      name: $('#cpName').value,
      type: $('#cpType').value,
      address: $('#cpAddress').value,
      contact_phone: $('#cpPhone').value,
      capacity: Number($('#cpCapacity').value),
    }),
  );
}
function openPathBuilderModal(pathId) {
  const lp = S.institutionLearningPaths.find(x => x.id === pathId) || {};
  openModal({
    title: `Path: ${esc(lp.title)}`,
    className: 'modal-lg',
    body: `
      <div class="path-builder">
        <p class="form-hint">Add programmes in order. Trainees unlock them sequentially.</p>
        <div class="path-add-programme" style="margin-bottom:14px">
          <select id="pathAddSelect" class="form-select">
            <option value="">Select a programme...</option>
            ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" id="pathAddBtn">
            <i class="fas fa-plus"></i> Add Step</button>
        </div>
        <ul class="list-stack" id="pathStepsList">
          ${(lp.steps || []).map((s, i) => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title"><span class="chip chip-blue">${i+1}</span> ${esc(s.programme_title)}</span>
              </div>
              <button class="btn btn-danger btn-xs" data-remove-path-step="${s.id}">Remove</button>
            </li>
          `).join('') || '<li class="empty-row">No steps yet</li>'}
        </ul>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
  $('#pathAddBtn').onclick = async () => {
    const programmeId = $('#pathAddSelect').value;
    if (!programmeId) return;
    await apiCall(`/api/institution/learning-paths/${pathId}/steps`, 'POST', { programme_id: Number(programmeId) });
    closeModal(); await loadAllData(); openPathBuilderModal(pathId);
  };
  document.querySelectorAll('[data-remove-path-step]').forEach(b => b.onclick = async () => {
    await apiCall(`/api/institution/learning-paths/steps/${b.dataset.removePathStep}`, 'DELETE');
    closeModal(); await loadAllData(); openPathBuilderModal(pathId);
  });
}

function openProctorSessionModal() {
  openModal({
    title: 'Schedule Proctored Exam',
    body: `
      <label class="form-group"><span class="form-label">Exam title <span class="req">*</span></span>
        <input id="psTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Trainee</span>
        <select id="psTrainee" class="form-select">
          ${S.trainees.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Scheduled at <span class="req">*</span></span>
        <input id="psWhen" type="datetime-local" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Proctor mode</span>
        <select id="psMode" class="form-select">
          ${CONFIG.PROCTOR_MODES.map(m => `<option value="${m}">${m}</option>`).join('')}
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="psSave" class="btn btn-primary">Schedule</button>`,
  });
  $('#psSave').onclick = () => submitFormModal(
    '#psSave',
    {
      '#psTitle': { required: true, maxLength: 200, label: 'Exam title' },
      '#psWhen':  { required: true, label: 'Date & time' },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Proctor session scheduled', 'success');
    },
    '/api/institution/exam-proctor-sessions',
    'POST',
    () => ({
      exam_title: $('#psTitle').value,
      trainee_id: Number($('#psTrainee').value),
      scheduled_at: $('#psWhen').value,
      proctor_mode: $('#psMode').value,
    }),
  );
}
function openAssignSuccessionModal() {
  openModal({
    title: 'Assign Trainee to Box',
    body: `
      <label class="form-group"><span class="form-label">Trainee</span>
        <select id="suTrainee" class="form-select">
          <option value="">Select…</option>
          ${S.trainees.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Box</span>
        <select id="suBox" class="form-select">
          ${CONFIG.SUCCESSION_BOXES.map(b =>
            `<option value="${b.code}">${b.label}</option>`).join('')}
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="suSave" class="btn btn-primary">Assign</button>`,
  });
  $('#suSave').onclick = () => submitFormModal(
    '#suSave',
    { '#suTrainee': { required: true, label: 'Trainee' } },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Trainee assigned', 'success');
    },
    '/api/institution/succession/assign',
    'POST',
    () => ({
      trainee_id: Number($('#suTrainee').value),
      box_code: $('#suBox').value,
    }),
  );
}
function openHireInstructorModal(instructorId, instructorName) {
  openModal({
    title: `Hire ${esc(instructorName)}`,
    body: `
      <label class="form-group"><span class="form-label">Programme</span>
        <select id="hiProgramme" class="form-select">
          ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Rate per hour ($) <span class="req">*</span></span>
        <input id="hiRate" type="number" min="0" class="form-input" value="100" /></label>
      <label class="form-group"><span class="form-label">Start date</span>
        <input id="hiStart" type="date" class="form-input" /></label>
      <label class="form-group"><span class="form-label">End date</span>
        <input id="hiEnd" type="date" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="hiSave" class="btn btn-primary">Create Contract</button>`,
  });
  $('#hiSave').onclick = () => submitFormModal(
    '#hiSave',
    {
      '#hiRate': { required: true, min: 0, label: 'Rate' },
      '#hiEnd':  {
        custom: (v) => {
          const s = $('#hiStart').value;
          if (s && v && new Date(v) < new Date(s)) return 'End date must be after start date';
        },
      },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Contract created', 'success');
    },
    '/api/institution/instructor-contracts',
    'POST',
    () => ({
      instructor_id: instructorId,
      programme_id: Number($('#hiProgramme').value),
      rate: Number($('#hiRate').value),
      start_date: $('#hiStart').value || null,
      end_date: $('#hiEnd').value || null,
    }),
  );
}
function openPostInstructorRequestModal() {
  openModal({
    title: 'Post Instructor Requirement',
    body: `
      <label class="form-group"><span class="form-label">Subject expertise <span class="req">*</span></span>
        <input id="pirSubject" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Duration</span>
        <input id="pirDuration" class="form-input" placeholder="e.g. 8 weeks" /></label>
      <label class="form-group"><span class="form-label">Budget per hour ($) <span class="req">*</span></span>
        <input id="pirBudget" type="number" min="0" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="pirDesc" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="pirSave" class="btn btn-primary">Publish</button>`,
  });
  $('#pirSave').onclick = () => submitFormModal(
    '#pirSave',
    {
      '#pirSubject': { required: true, maxLength: 150, label: 'Subject' },
      '#pirBudget':  { required: true, min: 0, label: 'Budget' },
    },
    async () => {
      closeModal();
      showToast('Requirement posted to marketplace', 'success');
    },
    '/api/institution/instructor-requests',
    'POST',
    () => ({
      subject: $('#pirSubject').value,
      duration: $('#pirDuration').value,
      budget: Number($('#pirBudget').value),
      description: $('#pirDesc').value,
    }),
  );
}
function openCreateBudgetModal() {
  openModal({
    title: 'New Budget',
    body: `
      <label class="form-group"><span class="form-label">Department <span class="req">*</span></span>
        <input id="budDept" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Period</span>
        <select id="budPeriod" class="form-select">
          ${CONFIG.BUDGET_PERIODS.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Allocated amount ($) <span class="req">*</span></span>
        <input id="budAmount" type="number" min="0" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="budSave" class="btn btn-primary">Create</button>`,
  });
  $('#budSave').onclick = () => submitFormModal(
    '#budSave',
    {
      '#budDept':   { required: true, maxLength: 150, label: 'Department' },
      '#budAmount': { required: true, min: 0, label: 'Amount' },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      app.emit('budget.created');
      showToast('Budget created', 'success');
    },
    '/api/institution/budgets',
    'POST',
    () => ({
      department: $('#budDept').value,
      period: $('#budPeriod').value,
      allocated: Number($('#budAmount').value),
    }),
  );
}
function openEditBudgetModal(budgetId) {
  const b = S.budgetAllocations.find(x => x.id === budgetId) || {};
  openModal({
    title: 'Edit Budget',
    body: `
      <label class="form-group"><span class="form-label">Department <span class="req">*</span></span>
        <input id="ebDept" class="form-input" value="${esc(b.department || '')}" /></label>
      <label class="form-group"><span class="form-label">Allocated ($)</span>
        <input id="ebAmount" type="number" min="0" class="form-input" value="${b.allocated || 0}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ebSave" class="btn btn-primary">Save</button>`,
  });
  $('#ebSave').onclick = () => submitFormModal(
    '#ebSave',
    {
      '#ebDept':   { required: true, label: 'Department' },
      '#ebAmount': { min: 0, label: 'Amount' },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Budget updated', 'success');
    },
    `/api/institution/budgets/${budgetId}`,
    'PUT',
    () => ({
      department: $('#ebDept').value,
      allocated: Number($('#ebAmount').value),
    }),
  );
}
function openBudgetTransactionsModal(budgetId) {
  const txns = (S.budgetTransactions || []).filter(t => String(t.budget_id) === String(budgetId));
  openModal({
    title: 'Budget Transactions',
    className: 'modal-lg',
    body: txns.length ? `
      <ul class="list-stack">
        ${txns.map(t => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(t.description || '')}</span>
              <span class="list-row-sub">${fmtDT(t.created_at)}</span>
            </div>
            <span class="list-row-price">${fmtCur(t.amount)}</span>
          </li>
        `).join('')}
      </ul>` : '<p class="empty-row">No transactions</p>',
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

function openNewReportDefinitionModal(definitionId) {
  const d = definitionId ? (S.savedReportDefinitions.find(x => x.id === definitionId) || {}) : {};
  openModal({
    title: definitionId ? 'Edit Report' : 'New Report Definition',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Report name <span class="req">*</span></span>
        <input id="rdName" class="form-input" value="${esc(d.name || '')}" /></label>
      <label class="form-group"><span class="form-label">Data source</span>
        <select id="rdSource" class="form-select">
          ${Object.keys(CONFIG.REPORT_FIELD_LIBRARY).map(k =>
            `<option value="${k}" ${d.data_source === k ? 'selected' : ''}>${k}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Columns (comma separated) <span class="req">*</span></span>
        <input id="rdColumns" class="form-input" value="${(d.columns || []).join(', ')}" /></label>
      <label class="form-group"><span class="form-label">Filters (JSON, optional)</span>
        <textarea id="rdFilters" class="form-textarea" rows="3">${esc(JSON.stringify(d.filters || {}))}</textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rdSave" class="btn btn-primary">${definitionId ? 'Save' : 'Create'}</button>`,
  });
  $('#rdSave').onclick = () => {
    const cols = $('#rdColumns').value.split(',').map(x => x.trim()).filter(Boolean);
    if (!cols.length) return showToast('Add at least one column', 'error');

    submitFormModal(
      '#rdSave',
      { '#rdName': { required: true, maxLength: 200, label: 'Name' } },
      async () => {
        closeModal();
        await loadAllData();
        rerenderRoleContent();
        showToast(definitionId ? 'Report updated' : 'Report created', 'success');
      },
      definitionId ? `/api/institution/report-definitions/${definitionId}` : '/api/institution/report-definitions',
      definitionId ? 'PUT' : 'POST',
      () => ({
        name: $('#rdName').value,
        data_source: $('#rdSource').value,
        columns: cols,
        filters: (() => { try { return JSON.parse($('#rdFilters').value || '{}'); } catch { return {}; } })(),
      }),
    );
  };
}
async function runSavedReport(definitionId) {
  const btn = document.querySelector(`[data-run-report="${definitionId}"]`);
  setBusy(btn, true, 'Running…');
  showLoading(true);
  try {
    const d = await apiCall(`/api/institution/report-definitions/${definitionId}/run`);
    downloadCsv(`report-${definitionId}-${Date.now()}.csv`, d.rows || []);
    showToast(`Report generated: ${d.rows?.length || 0} rows`, 'success');
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    showLoading(false);
    setBusy(btn, false);
  }
}
function openAnnouncementModal(announcementId) {
  const a = announcementId ? (S.announcements.find(x => x.id === announcementId) || {}) : {};
  openModal({
    title: announcementId ? 'Edit Announcement' : 'New Announcement',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Title <span class="req">*</span></span>
        <input id="anTitle" class="form-input" value="${esc(a.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Body <span class="req">*</span></span>
        <textarea id="anBody" class="form-textarea" rows="5">${esc(a.body || '')}</textarea></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Scope</span>
          <select id="anScope" class="form-select">
            ${CONFIG.ANNOUNCEMENT_SCOPES.map(s =>
              `<option value="${s}" ${a.scope === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Priority</span>
          <select id="anPriority" class="form-select">
            ${CONFIG.ANNOUNCEMENT_PRIORITIES.map(p =>
              `<option value="${p}" ${a.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="anSave" class="btn btn-primary">${announcementId ? 'Save' : 'Publish'}</button>`,
  });
  $('#anSave').onclick = () => submitFormModal(
    '#anSave',
    {
      '#anTitle': { required: true, maxLength: 200, label: 'Title' },
      '#anBody':  { required: true, minLength: 10, maxLength: 5000, label: 'Body' },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      app.emit('announcement.published', { id: announcementId });
      showToast(announcementId ? 'Announcement updated' : 'Announcement published', 'success');
    },
    announcementId ? `/api/institution/announcements/${announcementId}` : '/api/institution/announcements',
    announcementId ? 'PUT' : 'POST',
    () => ({
      title: $('#anTitle').value,
      body: $('#anBody').value,
      scope: $('#anScope').value,
      priority: $('#anPriority').value,
    }),
  );
}
function openCreateApiKeyModal() {
  const groups = {
    Read:  CONFIG.API_SCOPES.filter(s => s.endsWith(':read')),
    Write: CONFIG.API_SCOPES.filter(s => s.endsWith(':write')),
    Admin: CONFIG.API_SCOPES.filter(s => s.endsWith(':admin')),
  };

  openModal({
    title: 'Create API Key',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Key name <span class="req">*</span></span>
        <input id="akName" class="form-input" placeholder="e.g. HRIS Integration" /></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Expires in (days)</span>
          <select id="akExpiry" class="form-select">
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365" selected>1 year</option>
            <option value="0">Never (not recommended)</option>
          </select></label>
        <label class="form-group"><span class="form-label">IP allowlist (optional)</span>
          <input id="akIps" class="form-input" placeholder="e.g. 203.0.113.0/24, 198.51.100.7" /></label>
      </div>

      <label class="form-group"><span class="form-label">Scopes <span class="req">*</span></span>
        ${Object.entries(groups).map(([g, list]) => `
          <details style="margin-bottom:8px">
            <summary style="cursor:pointer;font-size:.85rem">${g} (${list.length})</summary>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
              ${list.map(s => `
                <label class="checkbox-row">
                  <input type="checkbox" class="ak-scope" value="${s}" />
                  <code class="code" style="font-size:.72rem">${esc(s)}</code>
                </label>
              `).join('')}
            </div>
          </details>
        `).join('')}
      </label>

      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i>
        <div>Keys are shown once. Store them in a secrets manager — never in source code.</div>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="akSave" class="btn btn-primary">Create Key</button>`,
  });

  $('#akSave').onclick = async () => {
    const name = ($('#akName').value || '').trim();
    if (!name) return showToast('Give the key a name', 'error');

    const scopes = Array.from(document.querySelectorAll('.ak-scope:checked')).map(x => x.value);
    if (!scopes.length) return showToast('Select at least one scope', 'error');

    const expiryDays = Number($('#akExpiry').value || 0);
    const ips = ($('#akIps').value || '').split(',').map(s => s.trim()).filter(Boolean);

    setBusy($('#akSave'), true, 'Creating…');
    try {
      const d = await apiCall('/api/institution/api-keys', 'POST', {
        name,
        scopes,
        expires_in_days: expiryDays || null,
        ip_allowlist: ips.length ? ips : null,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      openModal({
        title: 'API Key Created',
        body: `
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <div>Copy this key now — you won't see it again.</div>
          </div>
          <label class="form-group"><span class="form-label">API Key</span>
            <input class="form-input" value="${esc(d.key)}" readonly onclick="this.select()" /></label>
          <p class="form-hint">
            Expires: ${d.expires_at ? fmtDate(d.expires_at) : 'Never'}.
            Scopes: ${scopes.length}. IPS: ${ips.length || 'any'}.
          </p>`,
        footer: `<button class="btn btn-primary" data-close-modal>Done</button>`,
      });
    } catch (e) {
      showToast(e.message || 'Could not create key', 'error');
      setBusy($('#akSave'), false);
    }
  };
}
function openWebhookModal(webhookId) {
  const w = webhookId ? (S.webhooks.find(x => x.id === webhookId) || {}) : {};
  const eventsByGroup = {
    Consultations: CONFIG.WEBHOOK_EVENTS.filter(e => e.startsWith('consultation.')),
    Courses:       CONFIG.WEBHOOK_EVENTS.filter(e => e.startsWith('course.') || e.startsWith('enrollment.')),
    Payments:      CONFIG.WEBHOOK_EVENTS.filter(e => e.startsWith('payment.') || e.startsWith('payout.')),
    System:        CONFIG.WEBHOOK_EVENTS.filter(e => !e.match(/^(consultation|course|enrollment|payment|payout)\./)),
  };

  openModal({
    title: webhookId ? 'Edit Webhook' : 'New Webhook',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Endpoint URL <span class="req">*</span></span>
        <input id="whUrl" class="form-input" value="${esc(w.url || '')}"
               placeholder="https://your-app.com/hooks/experthub" />
        <span class="form-hint">Must be HTTPS. HTTP is blocked.</span></label>

      <label class="form-group"><span class="form-label">Signing secret</span>
        <div style="display:flex;gap:8px">
          <input id="whSecret" class="form-input"
                 value="${esc(w.secret || '')}"
                 placeholder="32+ chars" />
          <button type="button" class="btn btn-secondary" id="whGen">Generate</button>
        </div>
        <span class="form-hint">Used to sign payloads with HMAC-SHA256 (X-ExpertHub-Signature).</span>
      </label>

      <label class="form-group"><span class="form-label">Events <span class="req">*</span></span>
        ${Object.entries(eventsByGroup).map(([g, list]) => `
          <details style="margin-bottom:8px">
            <summary style="cursor:pointer;font-size:.85rem">${g} (${list.length})</summary>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
              ${list.map(e => `
                <label class="checkbox-row">
                  <input type="checkbox" class="wh-event" value="${e}"
                         ${(w.events || []).includes(e) ? 'checked' : ''} />
                  <code class="code" style="font-size:.72rem">${esc(e)}</code>
                </label>
              `).join('')}
            </div>
          </details>
        `).join('')}
      </label>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      ${webhookId ? `<button class="btn btn-info" id="whPing">Send test</button>` : ''}
      <button id="whSave" class="btn btn-primary">${webhookId ? 'Save' : 'Create'}</button>`,
  });

  $('#whGen').onclick = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    $('#whSecret').value = hex;
  };

  if (webhookId) {
    $('#whPing').onclick = async () => {
      setBusy($('#whPing'), true, 'Pinging…');
      try {
        const d = await apiCall(`/api/institution/webhooks/${webhookId}/test`, 'POST');
        showToast(`Test delivered — HTTP ${d.status} in ${d.latency_ms}ms`, 'success');
      } catch (e) {
        showToast(e.message || 'Test failed', 'error');
      } finally {
        setBusy($('#whPing'), false);
      }
    };
  }

  $('#whSave').onclick = async () => {
    const url = ($('#whUrl').value || '').trim();
    const safe = safeUrl(url);
    if (!safe || !safe.startsWith('https://')) {
      return showToast('Endpoint must be a valid HTTPS URL', 'error');
    }

    const secret = ($('#whSecret').value || '').trim();
    if (secret && secret.length < 32) {
      return showToast('Signing secret should be at least 32 characters', 'error');
    }

    const events = Array.from(document.querySelectorAll('.wh-event:checked')).map(x => x.value);
    if (!events.length) return showToast('Select at least one event', 'error');

    setBusy($('#whSave'), true, 'Saving…');
    try {
      const payload = { url: safe, events, secret: secret || null };
      if (webhookId) await apiCall(`/api/institution/webhooks/${webhookId}`, 'PUT', payload);
      else            await apiCall('/api/institution/webhooks', 'POST', payload);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(webhookId ? 'Webhook updated' : 'Webhook created', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      setBusy($('#whSave'), false);
    }
  };
}
async function saveSsoConfig() {
  const metadataUrl = ($('#sso-metadata-url').value || '').trim();
  const cert = ($('#sso-cert').value || '').trim();

  if (metadataUrl && !safeUrl(metadataUrl)) {
    return showToast('Metadata URL must be http(s)', 'error');
  }
  if (cert && !/-----BEGIN CERTIFICATE-----/.test(cert)) {
    return showToast('Certificate must be in PEM format', 'error');
  }

  const btn = document.querySelector('[data-action="save-sso"]') || $('#ssoSave');
  setBusy(btn, true, 'Saving…');
  try {
    await apiCall('/api/institution/sso', 'PUT', {
      provider: $('#sso-provider').value,
      entity_id: $('#sso-entity').value,
      metadata_url: metadataUrl || null,
      certificate: cert || null,
    });
    showToast('SSO configuration saved', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}
async function saveSecurityPolicy() {
  const btn = document.querySelector('[data-action="save-security-policy"]') || $('#secSave');
  setBusy(btn, true, 'Saving…');
  try {
    await apiCall('/api/institution/security-policy', 'PUT', {
      force_mfa: $('#sec-force-mfa').checked,
      ip_whitelist_enabled: $('#sec-ip-whitelist').checked,
      session_timeout: $('#sec-session-timeout').checked,
    });
    showToast('Security policies saved', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}
async function saveInstitutionSettings() {
  const btn = document.querySelector('[data-action="save-institution-settings"]') || $('#instSetSave');
  const { ok, errors } = validateForm({
    '#instSetName': { required: true, maxLength: 200, label: 'Institution name' },
    '#instSetEmail': { email: true, label: 'Contact email' },
    '#instSetCap': { required: true, min: 1, label: 'Default capacity' },
    '#instSetPass': { required: true, min: 0, max: 100, label: 'Pass mark' },
    '#instSetSeats': { min: 0, label: 'Seat allocation' },
  });
  if (!ok) return showToast(Object.values(errors)[0], 'error');

  setBusy(btn, true, 'Saving…');
  try {
    await apiCall('/api/institution/settings', 'PUT', {
      name: $('#instSetName').value,
      contact_email: $('#instSetEmail').value,
      default_capacity: Number($('#instSetCap').value),
      pass_mark: Number($('#instSetPass').value),
      seat_allocation: Number($('#instSetSeats').value || 0),
      billing_cycle: $('#instSetBilling').value,
    });
    showToast('Settings saved', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}
async function saveBranding() {
  const fd = new FormData();
  const logoInput = $('#brandLogo');
  if (logoInput && logoInput.files[0]) fd.append('logo', logoInput.files[0]);
  fd.append('primary_color', $('#brandPrimary').value);
  fd.append('accent_color', $('#brandAccent').value);
  fd.append('email_sender_name', $('#brandEmailName').value);
  fd.append('email_sender_address', $('#brandEmailAddr').value);
  fd.append('welcome_message', $('#brandWelcome').value);
  showLoading(true);
  await apiCall('/api/institution/branding', 'PUT', fd, true);
  await loadAllData();
  if ($('#brandPrimary').value) document.documentElement.style.setProperty('--brand', $('#brandPrimary').value);
  if ($('#brandAccent').value) document.documentElement.style.setProperty('--accent', $('#brandAccent').value);
  rerenderRoleContent(); showLoading(false); showToast('Branding saved', 'success');
}

async function updateInstitutionProfile() {
  const btn = document.querySelector('[data-action="update-institution-profile"]') || $('#instProfileSave');
  const { ok, errors } = validateForm({
    '#instProfileName':  { required: true, maxLength: 200, label: 'Name' },
    '#instProfilePhone': { maxLength: 30, label: 'Phone' },
  });
  if (!ok) return showToast(Object.values(errors)[0], 'error');

  setBusy(btn, true, 'Saving…');
  try {
    await apiCall('/api/institution/profile', 'PUT', {
      name: $('#instProfileName').value,
      type: $('#instProfileType').value,
      industry: $('#instProfileIndustry').value,
      contact_phone: $('#instProfilePhone').value,
      address: $('#instProfileAddress').value,
    });
    await loadAllData();
    rerenderRoleContent();
    app.emit('institution.profile_updated');
    showToast('Profile updated', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}
/* ---------- Profile generic ---------- */
async function updateUserProfile() {
  await apiCall('/api/user/profile', 'PUT', {
    name: $('#profileName')?.value,
    phone: $('#profilePhone')?.value,
    timezone: $('#profileTimezone')?.value,
    intent: $('#profileIntent')?.value || S.userIntent,
  });
  const me = await apiCall('/api/auth/me');
  currentUser = me.user;
  if (me.user.intent) S.userIntent = me.user.intent;
  localStorage.setItem('user', JSON.stringify(currentUser));
  showToast('Profile updated', 'success');
}

async function changePassword() {
  const oldp = $('#cpOld').value;
  const newp = $('#cpNew').value;
  if (!oldp || newp.length < 8) return showToast('New password must be 8+ characters', 'error');
  await apiCall('/api/auth/password', 'PUT', { old_password: oldp, new_password: newp });
  $('#cpOld').value = ''; $('#cpNew').value = '';
  showToast('Password updated', 'success');
}

/* ---------- Institution — programme, cohort, session modals ---------- */
function openProgrammeModal(id = null) {
  const p = id ? S.programmes.find(x => x.id === id) : {};
  openModal({
    title: id ? 'Edit Programme' : 'New Programme',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="prTitle" class="form-input" value="${esc(p.title || '')}" required /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="prDesc" class="form-textarea" rows="3">${esc(p.description || '')}</textarea></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Category</span>
          <input id="prCat" class="form-input" value="${esc(p.category || '')}" /></label>
        <label class="form-group">
          <span class="form-label">Delivery mode</span>
          <select id="prDelivery" class="form-select">
            ${CONFIG.DELIVERY_MODES.map(m => `
              <option value="${m}" ${p.delivery_mode === m ? 'selected' : ''}>${m.replace('_', ' ')}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Level</span>
          <select id="prLevel" class="form-select">
            ${['beginner', 'intermediate', 'advanced'].map(l => `
              <option value="${l}" ${p.level === l ? 'selected' : ''}>${l}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Status</span>
          <select id="prStatus" class="form-select">
            ${CONFIG.PROGRAMME_STATUSES.map(s => `
              <option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>
            `).join('')}
          </select>
        </label>
        <label class="form-group"><span class="form-label">Start date</span>
          <input id="prStart" type="date" class="form-input"
                 value="${p.start_date ? new Date(p.start_date).toISOString().slice(0,10) : ''}" /></label>
        <label class="form-group"><span class="form-label">End date</span>
          <input id="prEnd" type="date" class="form-input"
                 value="${p.end_date ? new Date(p.end_date).toISOString().slice(0,10) : ''}" /></label>
        <label class="form-group"><span class="form-label">Capacity</span>
          <input id="prCap" type="number" class="form-input" value="${p.capacity || 30}" /></label>
        <label class="form-group"><span class="form-label">Duration in hours</span>
          <input id="prDuration" type="number" class="form-input" value="${p.duration_hours || 0}" /></label>
      </div>
      <h4 class="panel-title" style="margin-top:16px">Cost Tracking</h4>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Cost per seat</span>
          <input id="prCostSeat" type="number" class="form-input" value="${p.cost_per_seat || 0}" /></label>
        <label class="form-group"><span class="form-label">Trainer cost</span>
          <input id="prTrainerCost" type="number" class="form-input" value="${p.trainer_cost || 0}" /></label>
        <label class="form-group"><span class="form-label">Materials cost</span>
          <input id="prMaterialsCost" type="number" class="form-input" value="${p.materials_cost || 0}" /></label>
      </div>
      <h4 class="panel-title" style="margin-top:16px">Compliance and Prerequisites</h4>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Awarding body</span>
          <input id="prAwarding" class="form-input" value="${esc(p.accreditation_body || '')}" /></label>
        <label class="form-group"><span class="form-label">CPD points</span>
          <input id="prCpd" type="number" class="form-input" value="${p.cpd_points || 0}" step="0.5" /></label>
        <label class="form-group form-group-full">
          <span class="form-label">Prerequisite programme</span>
          <select id="prPrereq" class="form-select">
            <option value="">None</option>
            ${S.programmes
              .filter(x => x.id !== id)
              .map(x => `<option value="${x.id}" ${p.prerequisite_programme_id === x.id ? 'selected' : ''}>${esc(x.title)}</option>`)
              .join('')}
          </select>
        </label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="prSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  $('#prSave').onclick = async () => {
    const payload = {
      title: $('#prTitle').value,
      description: $('#prDesc').value || null,
      category: $('#prCat').value || null,
      delivery_mode: $('#prDelivery').value,
      level: $('#prLevel').value,
      status: $('#prStatus').value,
      start_date: $('#prStart').value || null,
      end_date: $('#prEnd').value || null,
      capacity: Number($('#prCap').value || 30),
      duration_hours: Number($('#prDuration').value || 0),
      cost_per_seat: Number($('#prCostSeat').value || 0),
      trainer_cost: Number($('#prTrainerCost').value || 0),
      materials_cost: Number($('#prMaterialsCost').value || 0),
      accreditation_body: $('#prAwarding').value || null,
      cpd_points: Number($('#prCpd').value || 0),
      prerequisite_programme_id: $('#prPrereq').value ? Number($('#prPrereq').value) : null,
    };
    if (!payload.title) return showToast('Title is required', 'error');
    try {
      showLoading(true);
      if (id) await apiCall(`/api/institution/programmes/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/programmes', 'POST', payload);
      closeModal();
      await reloadInstitutionProgrammes();
      rerenderRoleContent();
      showToast(id ? 'Programme updated' : 'Programme created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}

function openProgrammeViewModal(programmeId) {
  const p = S.programmes.find(x => x.id === programmeId);
  if (!p) return;
  openModal({
    title: p.title,
    body: `
      <p><strong>Category:</strong> ${esc(p.category || '-')}</p>
      <p><strong>Status:</strong> <span class="${statusClass(p.status)}">${esc(p.status)}</span></p>
      <p><strong>Delivery mode:</strong> ${esc((p.delivery_mode || '').replace('_', ' '))}</p>
      <p><strong>Dates:</strong> ${fmtDate(p.start_date)} to ${fmtDate(p.end_date)}</p>
      <p><strong>Capacity:</strong> ${p.enrolled_count || 0} of ${p.capacity || 0}</p>
      <p><strong>Duration:</strong> ${p.duration_hours || 0} hours</p>
      <p><strong>Cost per seat:</strong> ${fmtCur(p.cost_per_seat || 0)}</p>
      <p><strong>Trainer cost:</strong> ${fmtCur(p.trainer_cost || 0)}</p>
      <p><strong>Materials cost:</strong> ${fmtCur(p.materials_cost || 0)}</p>
      ${p.accreditation_body ? `<p><strong>Awarding body:</strong> ${esc(p.accreditation_body)}</p>` : ''}
      ${p.cpd_points ? `<p><strong>CPD points:</strong> ${p.cpd_points}</p>` : ''}
      <p><strong>Description:</strong></p>
      <p>${esc(p.description || '-')}</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

async function openCurriculumModal(programmeId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/programmes/${programmeId}/modules`);
    const p = S.programmes.find(x => x.id === programmeId) || {};

    openModal({
      title: `Curriculum - ${esc(p.title || '')}`,
      className: 'modal-lg',
      body: `
        <div class="panel" style="background:var(--surface-2)">
          <h4 class="panel-title">Add Module</h4>
          <div class="form-grid">
            <label class="form-group"><span class="form-label">Module title</span>
              <input id="cmTitle" class="form-input" /></label>
            <label class="form-group"><span class="form-label">Duration in hours</span>
              <input id="cmDuration" type="number" class="form-input" value="2" /></label>
            <label class="form-group form-group-full"><span class="form-label">Description</span>
              <textarea id="cmDesc" class="form-textarea" rows="2"></textarea></label>
          </div>
          <div class="panel-actions">
            <button class="btn btn-primary" id="cmAdd">Add Module</button>
          </div>
        </div>

        <h4 class="panel-title" style="margin-top:16px">Modules (${(d.modules || []).length})</h4>
        <ul class="list-stack">
          ${(d.modules || []).map(m => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">
                  <span class="chip chip-neutral">${m.position}</span>
                  ${esc(m.title)}
                </span>
                <span class="list-row-sub">
                  ${m.duration_hours}h - ${esc((m.description || '').slice(0, 80))}
                </span>
              </div>
              <button class="btn btn-danger btn-xs" data-remove-module="${m.id}">Remove</button>
            </li>
          `).join('') || '<li class="empty-row">No modules yet</li>'}
        </ul>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });

    $('#cmAdd').onclick = async () => {
      const title = $('#cmTitle').value;
      if (!title) return showToast('Module title is required', 'error');
      try {
        await apiCall(`/api/institution/programmes/${programmeId}/modules`, 'POST', {
          title,
          description: $('#cmDesc').value || null,
          duration_hours: Number($('#cmDuration').value || 0),
        });
        closeModal();
        openCurriculumModal(programmeId);
      } catch (e) { showToast(e.message, 'error'); }
    };

    document.querySelectorAll('[data-remove-module]').forEach(b => {
      b.onclick = async () => {
        if (!await confirmDialog('Remove this module?')) return;
        try {
          await apiCall(`/api/institution/programmes/${programmeId}/modules/${b.dataset.removeModule}`, 'DELETE');
          closeModal();
          openCurriculumModal(programmeId);
        } catch (e) { showToast(e.message, 'error'); }
      };
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function openLearningPathModal(pathId) {
  const lp = pathId ? (S.institutionLearningPaths.find(x => x.id === pathId) || {}) : {};
  openModal({
    title: pathId ? 'Edit Learning Path' : 'New Learning Path',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="lpTitle" class="form-input" value="${esc(lp.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="lpDesc" class="form-textarea" rows="3">${esc(lp.description || '')}</textarea></label>
      <label class="checkbox-row">
        <input type="checkbox" id="lpActive" ${lp.active === undefined || lp.active ? 'checked' : ''} />
        Active
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="lpSave" class="btn btn-primary">${pathId ? 'Save' : 'Create'}</button>`,
  });
  $('#lpSave').onclick = async () => {
    const title = $('#lpTitle').value;
    if (!title) return showToast('Title is required', 'error');
    try {
      await apiCall('/api/institution/learning-paths', 'POST', {
        title,
        description: $('#lpDesc').value || null,
        active: $('#lpActive').checked,
      });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Learning path saved', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function openCohortModal(id = null) {
  const c = id ? S.cohorts.find(x => x.id === id) : {};
  openModal({
    title: id ? 'Edit Cohort' : 'New Cohort',
    body: `
      <label class="form-group"><span class="form-label">Cohort name</span>
        <input id="chName" class="form-input" value="${esc(c.name || '')}" /></label>
      <label class="form-group">
        <span class="form-label">Programme</span>
        <select id="chProg" class="form-select">
          ${S.programmes.map(p => `
            <option value="${p.id}" ${c.programme_id === p.id ? 'selected' : ''}>${esc(p.title)}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Instructor</span>
        <select id="chInstr" class="form-select">
          <option value="">Unassigned</option>
          ${S.instructors.map(i => `
            <option value="${i.id}" ${c.instructor_id === i.id ? 'selected' : ''}>${esc(i.name)}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Substitute instructor</span>
        <select id="chSubInstr" class="form-select">
          <option value="">None</option>
          ${S.instructors.map(i => `
            <option value="${i.id}" ${c.substitute_instructor_id === i.id ? 'selected' : ''}>${esc(i.name)}</option>
          `).join('')}
        </select>
      </label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Start date</span>
          <input id="chStart" type="date" class="form-input"
                 value="${c.start_date ? new Date(c.start_date).toISOString().slice(0,10) : ''}" /></label>
        <label class="form-group"><span class="form-label">End date</span>
          <input id="chEnd" type="date" class="form-input"
                 value="${c.end_date ? new Date(c.end_date).toISOString().slice(0,10) : ''}" /></label>
      </div>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Capacity</span>
          <input id="chCap" type="number" class="form-input" value="${c.capacity || 30}" /></label>
        <label class="form-group"><span class="form-label">Location</span>
          <input id="chLocation" class="form-input" value="${esc(c.location || '')}" /></label>
      </div>
      <label class="form-group">
        <span class="form-label">Status</span>
        <select id="chStatus" class="form-select">
          ${['scheduled', 'active', 'completed', 'cancelled'].map(s => `
            <option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>
          `).join('')}
        </select>
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="chSave" class="btn btn-primary">${id ? 'Save' : 'Create'}</button>`,
  });
  $('#chSave').onclick = async () => {
    const payload = {
      name: $('#chName').value,
      programme_id: Number($('#chProg').value),
      instructor_id: $('#chInstr').value ? Number($('#chInstr').value) : null,
      substitute_instructor_id: $('#chSubInstr').value ? Number($('#chSubInstr').value) : null,
      start_date: $('#chStart').value || null,
      end_date: $('#chEnd').value || null,
      capacity: Number($('#chCap').value || 30),
      location: $('#chLocation').value || null,
      status: $('#chStatus').value,
    };
    if (!payload.name) return showToast('Name is required', 'error');
    try {
      showLoading(true);
      if (id) await apiCall(`/api/institution/cohorts/${id}`, 'PUT', payload);
      else    await apiCall('/api/institution/cohorts', 'POST', payload);
      closeModal();
      await reloadInstitutionCohorts();
      rerenderRoleContent();
      showToast(id ? 'Cohort updated' : 'Cohort created', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}

function openCohortViewModal(cohortId) {
  const c = S.cohorts.find(x => x.id === cohortId);
  if (!c) return;
  openModal({
    title: c.name,
    body: `
      <p><strong>Programme:</strong> ${esc(c.programme_title || '-')}</p>
      <p><strong>Instructor:</strong> ${esc(c.instructor_name || 'Unassigned')}</p>
      <p><strong>Dates:</strong> ${fmtDate(c.start_date)} to ${fmtDate(c.end_date)}</p>
      <p><strong>Capacity:</strong> ${c.trainee_count || 0} of ${c.capacity || 0}</p>
      <p><strong>Location:</strong> ${esc(c.location || '-')}</p>
      <p><strong>Status:</strong> <span class="${statusClass(c.status)}">${esc(c.status)}</span></p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

async function openCohortWaitlistModal(cohortId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/cohorts/${cohortId}/waitlist`);
    const c = S.cohorts.find(x => x.id === cohortId) || {};
    openModal({
      title: `Waitlist - ${esc(c.name || '')}`,
      body: `
        <p class="form-hint">When a seat opens, promote the next trainee in the queue.</p>
        <ul class="list-stack" style="margin-top:12px">
          ${(d.waitlist || []).map(w => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">
                  <span class="chip chip-neutral">#${w.position}</span>
                  ${esc(w.name)}
                </span>
                <span class="list-row-sub">${esc(w.email)}</span>
              </div>
              <button class="btn btn-success btn-xs" data-promote-wait="${w.user_id}">Promote</button>
            </li>
          `).join('') || '<li class="empty-row">Waitlist is empty</li>'}
        </ul>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
    document.querySelectorAll('[data-promote-wait]').forEach(b => {
      b.onclick = async () => {
        try {
          await apiCall('/api/institution/enrollments', 'POST', {
            user_id: Number(b.dataset.promoteWait),
            programme_id: c.programme_id,
            cohort_id: c.id,
          });
          closeModal();
          await loadAllData();
          rerenderRoleContent();
          showToast('Trainee promoted', 'success');
        } catch (e) { showToast(e.message, 'error'); }
      };
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function openSessionModal(sessionId) {
  const s = sessionId ? (S.institutionSessions.find(x => x.id === sessionId) || {}) : {};
  const toLocal = d => {
    if (!d) return '';
    const dt = new Date(d);
    const off = dt.getTimezoneOffset();
    return new Date(dt.getTime() - off * 60000).toISOString().slice(0, 16);
  };

  openModal({
    title: sessionId ? 'Edit Session' : 'Schedule Session',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="ssTitle" class="form-input" value="${esc(s.title || '')}" required /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="ssDesc" class="form-textarea" rows="3">${esc(s.description || '')}</textarea></label>
      <label class="form-group">
        <span class="form-label">Cohort</span>
        <select id="ssCohort" class="form-select">
          <option value="">Select cohort</option>
          ${S.cohorts.map(c => `
            <option value="${c.id}" ${s.cohort_id === c.id ? 'selected' : ''}>
              ${esc(c.name)} - ${esc(c.programme_title || '')}
            </option>
          `).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Instructor</span>
        <select id="ssInstructor" class="form-select">
          <option value="">Unassigned</option>
          ${S.instructors.map(i => `
            <option value="${i.id}" ${s.instructor_id === i.id ? 'selected' : ''}>${esc(i.name)}</option>
          `).join('')}
        </select>
      </label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Scheduled at</span>
          <input id="ssWhen" type="datetime-local" class="form-input"
                 value="${toLocal(s.scheduled_at)}" required /></label>
        <label class="form-group"><span class="form-label">Duration in minutes</span>
          <input id="ssDuration" type="number" class="form-input"
                 value="${s.duration_minutes || 60}" min="15" /></label>
      </div>
      <label class="form-group">
        <span class="form-label">Mode</span>
        <select id="ssMode" class="form-select">
          ${CONFIG.SESSION_MODES.map(m => `
            <option value="${m}" ${s.mode === m ? 'selected' : ''}>${m.replace('_', ' ')}</option>
          `).join('')}
        </select>
      </label>
      <label class="form-group"><span class="form-label">Location (for in-person)</span>
        <input id="ssLocation" class="form-input" value="${esc(s.location || '')}" /></label>
      <label class="form-group"><span class="form-label">Meeting URL (for online)</span>
        <input id="ssUrl" class="form-input" value="${esc(s.meeting_url || '')}" placeholder="https://" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ssSave" class="btn btn-primary">${sessionId ? 'Save Changes' : 'Schedule'}</button>`,
  });
  $('#ssSave').onclick = async () => {
    const title = $('#ssTitle').value;
    const scheduled_at = $('#ssWhen').value;
    const cohort_id = Number($('#ssCohort').value);
    if (!title || !scheduled_at || !cohort_id) {
      return showToast('Title, cohort, and date are required', 'error');
    }
    const payload = {
      title,
      description: $('#ssDesc').value || null,
      cohort_id,
      instructor_id: $('#ssInstructor').value ? Number($('#ssInstructor').value) : null,
      scheduled_at: new Date(scheduled_at).toISOString().slice(0, 19).replace('T', ' '),
      duration_minutes: Number($('#ssDuration').value || 60),
      mode: $('#ssMode').value,
      location: $('#ssLocation').value || null,
      meeting_url: $('#ssUrl').value || null,
    };
    try {
      showLoading(true);
      if (sessionId) await apiCall(`/api/institution/sessions/${sessionId}`, 'PUT', payload);
      else           await apiCall('/api/institution/sessions', 'POST', payload);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(sessionId ? 'Session updated' : 'Session scheduled', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}

async function openAttendanceModal(sessionId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/sessions/${sessionId}/attendance`);
    openModal({
      title: `Mark Attendance - ${esc(d.session.title)}`,
      className: 'modal-lg',
      body: `
        <p class="form-hint" style="margin-bottom:12px">
          Scheduled ${fmtDT(d.session.scheduled_at)}. Mark each trainee and add an excuse note where applicable.
        </p>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Trainee</th><th style="min-width:140px">Status</th><th>Excuse reason</th></tr>
            </thead>
            <tbody>
              ${d.trainees.map(t => `
                <tr data-att-trainee="${t.id}">
                  <td>
                    <div class="user-cell">
                      <img class="user-avatar" src="${avatar(t)}" alt="" />
                      <div>
                        <div class="user-name">${esc(t.name)}</div>
                        <div class="user-email">${esc(t.email)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select class="form-select att-status">
                      ${CONFIG.ATTENDANCE_STATUSES.map(s => `
                        <option value="${s}" ${t.status === s ? 'selected' : ''}>${s}</option>
                      `).join('')}
                    </select>
                  </td>
                  <td>
                    <input class="form-input att-reason" placeholder="Optional"
                           value="${esc(t.excuse_reason || '')}" />
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="3" class="empty-row">No trainees enrolled in this cohort</td></tr>'}
            </tbody>
          </table>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
               <button id="attSave" class="btn btn-primary">Save Attendance</button>`,
    });
    $('#attSave').onclick = async () => {
      const rows = Array.from(document.querySelectorAll('[data-att-trainee]'));
      const records = rows.map(el => ({
        trainee_id: Number(el.dataset.attTrainee),
        status: el.querySelector('.att-status').value,
        excuse_reason: el.querySelector('.att-reason').value || null,
      }));
      try {
        showLoading(true);
        await apiCall(`/api/institution/sessions/${sessionId}/attendance`, 'PUT', { records });
        closeModal();
        await loadAllData();
        rerenderRoleContent();
        showToast('Attendance saved', 'success');
      } catch (e) { showToast(e.message, 'error'); }
      finally { showLoading(false); }
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function openSessionsCalendarModal() {
  const sessions = S.institutionSessions || [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push({ day: '', other: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(year, month, d) });
  while (cells.length % 7) cells.push({ day: '', other: true });

  const byDay = {};
  sessions.forEach(s => {
    const dt = new Date(s.scheduled_at);
    if (dt.getMonth() === month && dt.getFullYear() === year) {
      const k = dt.getDate();
      (byDay[k] = byDay[k] || []).push(s);
    }
  });

  openModal({
    title: 'Session Calendar',
    className: 'modal-lg',
    body: `
      <h3 class="panel-title">${today.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
      <div class="calendar-header">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<span>${d}</span>`).join('')}
      </div>
      <div class="calendar-grid">
        ${cells.map(c => {
          const isToday = c.date && c.date.toDateString() === today.toDateString();
          const evs = c.day ? (byDay[c.day] || []) : [];
          return `
            <div class="calendar-cell ${c.other ? 'other-month' : ''} ${isToday ? 'today' : ''}">
              <div class="calendar-day-num">${c.day || ''}</div>
              ${evs.slice(0, 3).map(e => `
                <div class="calendar-event" title="${esc(e.title)}">
                  ${new Date(e.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ${esc(e.title)}
                </div>
              `).join('')}
            </div>`;
        }).join('')}
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
}

async function uploadMaterial() {
  const title = $('#matTitle').value;
  const fileInput = $('#matFile');
  const file = fileInput && fileInput.files[0];
  if (!file) return showToast('Select a file to upload', 'error');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('title', title || file.name);
  fd.append('cohort_id', $('#matCohort').value || '');
  try {
    showLoading(true);
    await apiCall('/api/institution/materials', 'POST', fd, true);
    await loadAllData();
    rerenderRoleContent();
    showToast('Material uploaded', 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function openAssessmentModal() {
  openModal({
    title: 'Schedule Assessment',
    body: `
      <label class="form-group"><span class="form-label">Title <span class="req">*</span></span>
        <input id="asTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="asDesc" class="form-textarea" rows="2"></textarea></label>
      <label class="form-group"><span class="form-label">Cohort</span>
        <select id="asCohort" class="form-select">
          ${S.cohorts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option>No cohorts</option>'}
        </select></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Type</span>
          <select id="asType" class="form-select">
            ${CONFIG.ASSESSMENT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Weight (%)</span>
          <input id="asWeight" type="number" min="0" max="100" class="form-input" value="20" /></label>
        <label class="form-group"><span class="form-label">Pass mark (%)</span>
          <input id="asPass" type="number" min="0" max="100" class="form-input" value="70" /></label>
        <label class="form-group"><span class="form-label">Max attempts</span>
          <input id="asAttempts" type="number" min="1" class="form-input" value="1" /></label>
        <label class="form-group"><span class="form-label">Time limit (min)</span>
          <input id="asTime" type="number" min="0" class="form-input" value="0" /></label>
        <label class="form-group"><span class="form-label">Due date</span>
          <input id="asDue" type="datetime-local" class="form-input" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="asSave" class="btn btn-primary">Schedule</button>`,
  });
  $('#asSave').onclick = () => submitFormModal(
    '#asSave',
    {
      '#asTitle':  { required: true, maxLength: 200, label: 'Title' },
      '#asWeight': { min: 0, max: 100, label: 'Weight' },
      '#asPass':   { min: 0, max: 100, label: 'Pass mark' },
      '#asAttempts': { min: 1, label: 'Attempts' },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Assessment scheduled', 'success');
    },
    '/api/institution/assessments',
    'POST',
    () => ({
      title: $('#asTitle').value,
      description: $('#asDesc').value || null,
      cohort_id: Number($('#asCohort').value),
      type: $('#asType').value,
      weight: Number($('#asWeight').value || 0),
      pass_mark: Number($('#asPass').value || 70),
      max_attempts: Number($('#asAttempts').value || 1),
      time_limit_minutes: Number($('#asTime').value || 0),
      due_date: $('#asDue').value || null,
    }),
  );
}
async function openGradingModal(assessmentId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/assessments/${assessmentId}/submissions`);
    openModal({
      title: 'Grade Submissions',
      className: 'modal-lg',
      body: `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Trainee</th><th>Submitted</th><th>Score</th><th>Passed</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${(d.submissions || []).map(s => `
                <tr>
                  <td>${esc(s.trainee_name)}</td>
                  <td>${fmtDT(s.submitted_at)}</td>
                  <td>${s.score != null ? s.score : '-'}</td>
                  <td>${s.passed === 1
                    ? '<span class="status-active">Yes</span>'
                    : s.passed === 0
                    ? '<span class="status-rejected">No</span>'
                    : '-'}</td>
                  <td>
                    <button class="btn btn-info btn-xs" data-grade-sub="${s.id}"
                            data-score="${s.score || ''}">Grade</button>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="empty-row">No submissions yet</td></tr>'}
            </tbody>
          </table>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
    document.querySelectorAll('[data-grade-sub]').forEach(b => {
      b.onclick = async () => {
        const score = prompt('Enter score:', b.dataset.score || '');
        if (score === null) return;
        const feedback = prompt('Feedback (optional):') || '';
        try {
          await apiCall(`/api/institution/assessments/submissions/${b.dataset.gradeSub}/grade`, 'PUT', {
            score: Number(score),
            feedback,
            passed: Number(score) >= 70,
          });
          closeModal();
          openGradingModal(assessmentId);
          showToast('Submission graded', 'success');
        } catch (e) { showToast(e.message, 'error'); }
      };
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function openQuestionModal(questionId) {
  const q = questionId ? (S.institutionQuestions.find(x => x.id === questionId) || {}) : {};
  let options = [];
  try { options = q.options ? JSON.parse(q.options) : []; } catch { /* noop */ }

  openModal({
    title: questionId ? 'Edit Question' : 'New Question',
    className: 'modal-lg',
    body: `
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Category</span>
          <input id="qCat" class="form-input" value="${esc(q.category || '')}" /></label>
        <label class="form-group"><span class="form-label">Difficulty</span>
          <select id="qDiff" class="form-select">
            ${['easy','medium','hard'].map(d =>
              `<option value="${d}" ${q.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Type</span>
          <select id="qType" class="form-select">
            ${['mcq','true_false','short_answer','essay','file_upload'].map(t =>
              `<option value="${t}" ${q.question_type === t ? 'selected' : ''}>${t.replace('_',' ')}</option>`).join('')}
          </select></label>
        <label class="form-group"><span class="form-label">Points</span>
          <input id="qPoints" type="number" min="1" class="form-input" value="${q.points || 1}" /></label>
      </div>
      <label class="form-group"><span class="form-label">Question <span class="req">*</span></span>
        <textarea id="qText" class="form-textarea" rows="3">${esc(q.question_text || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Answer options (one per line)</span>
        <textarea id="qOptions" class="form-textarea" rows="4">${options.map(o => esc(o)).join('\n')}</textarea></label>
      <label class="form-group"><span class="form-label">Correct answer</span>
        <input id="qCorrect" class="form-input" value="${esc(q.correct_answer || '')}" /></label>
      <label class="form-group"><span class="form-label">Explanation</span>
        <textarea id="qExplanation" class="form-textarea" rows="2">${esc(q.explanation || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Tags (comma separated)</span>
        <input id="qTags" class="form-input" value="${esc(q.tags || '')}" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="qSave" class="btn btn-primary">${questionId ? 'Save' : 'Create'}</button>`,
  });
  $('#qSave').onclick = () => submitFormModal(
    '#qSave',
    {
      '#qText':   { required: true, maxLength: 2000, label: 'Question' },
      '#qPoints': { required: true, min: 1, label: 'Points' },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Question saved', 'success');
    },
    '/api/institution/question-bank',
    'POST',
    () => {
      const raw = $('#qOptions').value;
      return {
        id: questionId || undefined,
        question_text: $('#qText').value,
        question_type: $('#qType').value,
        difficulty: $('#qDiff').value,
        category: $('#qCat').value || null,
        points: Number($('#qPoints').value || 1),
        options: raw ? raw.split('\n').map(s => s.trim()).filter(Boolean) : null,
        correct_answer: $('#qCorrect').value || null,
        explanation: $('#qExplanation').value || null,
        tags: $('#qTags').value || null,
      };
    },
  );
}
function openProjectModal() {
  openModal({
    title: 'New Project',
    body: `
      <label class="form-group"><span class="form-label">Title <span class="req">*</span></span>
        <input id="pjTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="pjDesc" class="form-textarea" rows="3"></textarea></label>
      <label class="form-group"><span class="form-label">Cohort</span>
        <select id="pjCohort" class="form-select">
          ${S.cohorts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option>No cohorts</option>'}
        </select></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Category</span>
          <input id="pjCat" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Max score</span>
          <input id="pjMaxScore" type="number" min="1" class="form-input" value="100" /></label>
      </div>
      <label class="form-group"><span class="form-label">Deadline</span>
        <input id="pjDeadline" type="datetime-local" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="pjSave" class="btn btn-primary">Create</button>`,
  });
  $('#pjSave').onclick = () => submitFormModal(
    '#pjSave',
    {
      '#pjTitle':    { required: true, maxLength: 200, label: 'Title' },
      '#pjMaxScore': { required: true, min: 1, label: 'Max score' },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Project created', 'success');
    },
    '/api/institution/projects',
    'POST',
    () => ({
      title: $('#pjTitle').value,
      description: $('#pjDesc').value,
      cohort_id: Number($('#pjCohort').value),
      category: $('#pjCat').value || null,
      max_score: Number($('#pjMaxScore').value || 100),
      deadline: $('#pjDeadline').value || null,
    }),
  );
}
async function openImportHistoryModal() {
  try {
    showLoading(true);
    const d = await apiCall('/api/institution/trainees/imports');
    openModal({
      title: 'Import History',
      className: 'modal-lg',
      body: `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th><th>File</th><th>By</th>
                <th>Total</th><th>Success</th><th>Errors</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${(d.imports || []).map(i => `
                <tr>
                  <td>${fmtDT(i.created_at)}</td>
                  <td>${esc(i.filename || '-')}</td>
                  <td>${esc(i.imported_by_name || '-')}</td>
                  <td>${i.total_rows}</td>
                  <td><span class="status status-active">${i.success_count}</span></td>
                  <td>${i.error_count ? `<span class="status status-rejected">${i.error_count}</span>` : '0'}</td>
                  <td><span class="${statusClass(i.status)}">${esc(i.status)}</span></td>
                </tr>
              `).join('') || '<tr><td colspan="7" class="empty-row">No imports yet</td></tr>'}
            </tbody>
          </table>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function openTraineeImportModal() {
  openModal({
    title: 'Import Trainees',
    className: 'modal-lg',
    body: `
      <nav class="tab-bar" style="margin-bottom:16px">
        <button class="tab-btn tab-btn-active" data-import-mode="csv">CSV Upload</button>
        <button class="tab-btn" data-import-mode="single">Single Entry</button>
      </nav>
      <div id="import-csv-pane">
        <div class="drop-zone" id="csv-drop">
          <i class="fas fa-cloud-upload-alt"></i>
          <p><strong>Drop CSV file here</strong> or click to browse</p>
          <p class="form-hint" style="margin-top:8px">
            Required columns: <code class="code">name</code>, <code class="code">email</code><br>
            Optional: <code class="code">department</code>, <code class="code">job_title</code>,
            <code class="code">employee_id</code>, <code class="code">cost_centre</code>
          </p>
          <input type="file" id="csv-file" accept=".csv" hidden />
        </div>
        <div style="display:flex;gap:10px;margin-top:12px">
          <button class="btn btn-secondary btn-sm" id="download-template">
            <i class="fas fa-download"></i> Download Template</button>
        </div>
        <div id="import-result" style="margin-top:16px"></div>
      </div>
      <div id="import-single-pane" class="hidden">
        <label class="form-group"><span class="form-label">Full name</span>
          <input id="invName" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Email</span>
          <input id="invEmail" type="email" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Department</span>
          <input id="invDept" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Job title</span>
          <input id="invJobTitle" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Employee ID</span>
          <input id="invEmployeeId" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Cost centre</span>
          <input id="invCostCentre" class="form-input" /></label>
        <label class="form-group">
          <span class="form-label">Assign to programme</span>
          <select id="invProgramme" class="form-select">
            <option value="">None</option>
            ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
          </select>
        </label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button id="import-confirm" class="btn btn-primary" style="display:none">Import</button>`,
  });

  let mode = 'csv';
  $$('[data-import-mode]').forEach(b => {
    b.onclick = () => {
      mode = b.dataset.importMode;
      $$('[data-import-mode]').forEach(x => x.classList.remove('tab-btn-active'));
      b.classList.add('tab-btn-active');
      $('#import-csv-pane').classList.toggle('hidden', mode !== 'csv');
      $('#import-single-pane').classList.toggle('hidden', mode !== 'single');
      $('#import-confirm').style.display = mode === 'single' ? '' : 'none';
    };
  });

  const drop = $('#csv-drop');
  drop.onclick = () => $('#csv-file').click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('drop-zone-active'); };
  drop.ondragleave = () => drop.classList.remove('drop-zone-active');
  drop.ondrop = e => {
    e.preventDefault();
    drop.classList.remove('drop-zone-active');
    if (e.dataTransfer.files[0]) uploadCsv(e.dataTransfer.files[0]);
  };
  $('#csv-file').onchange = e => { if (e.target.files[0]) uploadCsv(e.target.files[0]); };

  $('#download-template').onclick = () => {
    const csv = 'name,email,department,job_title,employee_id,cost_centre\nJane Doe,jane@acme.com,Engineering,Senior Developer,EMP001,CC-ENG\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'trainee-import-template.csv';
    a.click();
  };

  async function uploadCsv(file) {
    const fd = new FormData();
    fd.append('file', file);
    try {
      showLoading(true);
      const d = await apiCall('/api/institution/trainees/import', 'POST', fd, true);
      $('#import-result').innerHTML = `
        <div class="alert alert-success">
          <i class="fas fa-check-circle"></i>
          <div>
            <strong>${d.success} of ${d.total}</strong> trainees imported.
            ${d.errors.length ? `<br><small>${d.errors.length} rows failed</small>` : ''}
          </div>
        </div>
        ${d.errors.length ? `
          <details style="margin-top:10px">
            <summary style="cursor:pointer;font-size:.85rem">View errors</summary>
            <ul class="list-stack" style="margin-top:8px">
              ${d.errors.slice(0, 25).map(e => `
                <li class="list-row">
                  <div class="list-row-main">
                    <span class="list-row-title">Row ${e.row}</span>
                    <span class="list-row-sub">${esc(e.error)}${e.email ? ' - ' + esc(e.email) : ''}</span>
                  </div>
                </li>
              `).join('')}
            </ul>
          </details>
        ` : ''}`;
      await loadAllData();
      rerenderRoleContent();
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  }

  $('#import-confirm').onclick = async () => {
    if (mode !== 'single') return;
    const payload = {
      emails: [$('#invEmail').value.trim()],
      programme_id: $('#invProgramme').value ? Number($('#invProgramme').value) : undefined,
      name: $('#invName').value.trim(),
      department: $('#invDept').value.trim(),
      job_title: $('#invJobTitle').value.trim(),
      employee_id: $('#invEmployeeId').value.trim(),
      cost_centre: $('#invCostCentre').value.trim(),
    };
    if (!payload.emails[0]) return showToast('Email is required', 'error');
    try {
      showLoading(true);
      await apiCall('/api/institution/trainees/invite', 'POST', payload);
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Trainee invited', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
}

async function openTraineeDetailModal(traineeId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/institution/trainees/${traineeId}`);
    const t = d.trainee || {};
    const enrollments = d.enrollments || [];
    const certs = d.certificates || [];
    const skills = d.skills || [];

    openModal({
      title: 'Trainee Profile',
      className: 'modal-lg',
      body: `
        <div class="profile-header">
          <img class="profile-avatar" src="${avatar(t)}" alt="" />
          <div>
            <h2 class="profile-name">
              ${esc(t.name || '')}
              ${t.at_risk ? '<span class="chip chip-red" style="margin-left:8px">At Risk</span>' : ''}
            </h2>
            <p class="profile-email">${esc(t.email || '')}</p>
            <p style="margin-top:6px">
              <span class="${statusClass(t.lifecycle_status || 'active')}">
                ${esc((t.lifecycle_status || '').replace('_', ' '))}
              </span>
            </p>
          </div>
        </div>
        <div class="form-grid" style="margin-top:20px">
          <div><p class="form-label">Department</p><p>${esc(t.department || '-')}</p></div>
          <div><p class="form-label">Job Title</p><p>${esc(t.job_title || '-')}</p></div>
          <div><p class="form-label">Employee ID</p><p>${esc(t.employee_id || '-')}</p></div>
          <div><p class="form-label">Cost Centre</p><p>${esc(t.cost_centre || '-')}</p></div>
          <div><p class="form-label">Phone</p><p>${esc(t.phone || '-')}</p></div>
          <div><p class="form-label">Joined</p><p>${fmtDate(t.created_at)}</p></div>
        </div>
        ${t.accessibility_notes ? `
          <div class="alert alert-info" style="margin-top:16px">
            <i class="fas fa-info-circle"></i>
            <div><strong>Accessibility notes:</strong> ${esc(t.accessibility_notes)}</div>
          </div>
        ` : ''}
        <h3 class="panel-title" style="margin-top:24px">Enrolments</h3>
        ${enrollments.length ? `
          <ul class="list-stack">
            ${enrollments.map(e => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(e.programme_title || '-')}</span>
                  <span class="list-row-sub">${esc(e.cohort_name || 'No cohort')} - ${e.progress || 0}% complete</span>
                </div>
                <span class="${statusClass(e.status)}">${esc(e.status)}</span>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-row">No enrolments</p>'}
        <h3 class="panel-title" style="margin-top:24px">Certificates</h3>
        ${certs.length ? `
          <ul class="list-stack">
            ${certs.map(c => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(c.title)}</span>
                  <span class="list-row-sub">${esc(c.serial)} - Issued ${fmtDate(c.issued_at)}</span>
                </div>
                <div style="display:flex;gap:6px">
                  <a class="btn btn-secondary btn-xs" href="/verify/${esc(c.serial)}" target="_blank">Verify</a>
                  <a class="btn btn-secondary btn-xs" href="/api/institution/certificates/${c.id}/pdf" target="_blank">PDF</a>
                </div>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-row">No certificates</p>'}
        <h3 class="panel-title" style="margin-top:24px">Skills</h3>
        ${skills.length ? `
          <ul class="list-stack">
            ${skills.map(s => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(s.skill_name || '')}</span>
                  <span class="list-row-sub">${esc(s.category || '')}</span>
                </div>
                <span class="chip chip-neutral">Level ${s.level}</span>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-row">No skill assessments recorded</p>'}`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function openTraineeNotesModal(traineeId) {
  const t = S.trainees.find(x => String(x.id) === String(traineeId)) || {};
  openModal({
    title: 'Trainee Notes',
    body: `
      <label class="checkbox-row" style="margin-bottom:14px">
        <input type="checkbox" id="tnAtRisk" ${t.at_risk ? 'checked' : ''} />
        Flag as at-risk trainee
      </label>
      <label class="form-group"><span class="form-label">Accessibility and support notes</span>
        <textarea id="tnAccessibility" class="form-textarea" rows="3"
                  maxlength="1000"
                  placeholder="e.g. requires extra time on assessments">${esc(t.accessibility_notes || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Internal notes</span>
        <textarea id="tnInternal" class="form-textarea" rows="4"
                  maxlength="2000"
                  placeholder="Internal observations, follow-up actions">${esc(t.internal_notes || '')}</textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tnSave" class="btn btn-primary">Save</button>`,
  });
  $('#tnSave').onclick = () => submitFormModal(
    '#tnSave',
    {},
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Notes saved', 'success');
    },
    `/api/institution/enrollments/${t.latest_enrollment_id || t.id}/notes`,
    'PUT',
    () => ({
      at_risk: $('#tnAtRisk').checked,
      accessibility_notes: $('#tnAccessibility').value,
      internal_notes: $('#tnInternal').value,
    }),
  );
}
function openTraineeTransferModal(enrollmentId) {
  openModal({
    title: 'Transfer Trainee',
    body: `
      <p class="form-hint">Move this trainee to a different cohort. Progress is preserved.</p>
      <label class="form-group"><span class="form-label">Target cohort <span class="req">*</span></span>
        <select id="ttCohort" class="form-select">
          <option value="">Select a cohort</option>
          ${S.cohorts.map(c =>
            `<option value="${c.id}">${esc(c.name)} — ${esc(c.programme_title || '')}</option>`).join('')}
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ttSave" class="btn btn-primary">Transfer</button>`,
  });
  $('#ttSave').onclick = () => submitFormModal(
    '#ttSave',
    { '#ttCohort': { required: true, label: 'Cohort' } },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      app.emit('enrollment.transferred', { enrollmentId });
      showToast('Trainee transferred', 'success');
    },
    `/api/institution/enrollments/${enrollmentId}/transfer`,
    'PUT',
    () => ({ cohort_id: Number($('#ttCohort').value) }),
  );
}
function openIssueCertificateModal() {
  openModal({
    title: 'Issue Certificate',
    body: `
      <label class="form-group"><span class="form-label">Trainee <span class="req">*</span></span>
        <select id="icTrainee" class="form-select">
          <option value="">Select trainee</option>
          ${S.trainees.map(t =>
            `<option value="${t.id}">${esc(t.name)} — ${esc(t.email)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Programme <span class="req">*</span></span>
        <select id="icProgramme" class="form-select">
          <option value="">Select programme</option>
          ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Awarding body (optional)</span>
          <input id="icBody" class="form-input" placeholder="e.g. Chartered Institute" /></label>
        <label class="form-group"><span class="form-label">Grade (optional)</span>
          <input id="icGrade" class="form-input" placeholder="e.g. Distinction" /></label>
        <label class="form-group"><span class="form-label">CPD points</span>
          <input id="icCpd" type="number" min="0" step="0.5" class="form-input" value="0" /></label>
        <label class="form-group"><span class="form-label">Validity (months)</span>
          <input id="icMonths" type="number" min="1" class="form-input" placeholder="Blank = no expiry" /></label>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="icSave" class="btn btn-primary">Issue Certificate</button>`,
  });
  $('#icSave').onclick = () => submitFormModal(
    '#icSave',
    {
      '#icTrainee':   { required: true, label: 'Trainee' },
      '#icProgramme': { required: true, label: 'Programme' },
      '#icCpd':       { min: 0, label: 'CPD points' },
      '#icMonths':    { min: 1, label: 'Validity' },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      app.emit('certificate.issued', { traineeId: Number($('#icTrainee').value) });
      showToast('Certificate issued', 'success');
    },
    '/api/institution/certificates/issue',
    'POST',
    () => ({
      trainee_id: Number($('#icTrainee').value),
      programme_id: Number($('#icProgramme').value),
      awarding_body: $('#icBody').value || null,
      grade: $('#icGrade').value || null,
      cpd_points: Number($('#icCpd').value || 0),
      valid_months: $('#icMonths').value ? Number($('#icMonths').value) : null,
    }),
  );
}
async function openManageSkillsModal() {
  const skills = S.institutionSkills || [];
  openModal({
    title: 'Manage Skills',
    className: 'modal-lg',
    body: `
      <div class="panel" style="background:var(--surface-2)">
        <h4 class="panel-title">Add New Skill</h4>
        <div class="form-grid">
          <label class="form-group"><span class="form-label">Name <span class="req">*</span></span>
            <input id="newSkillName" class="form-input" /></label>
          <label class="form-group"><span class="form-label">Category</span>
            <input id="newSkillCat" class="form-input" placeholder="e.g. Technical, Leadership" /></label>
          <label class="form-group form-group-full"><span class="form-label">Description</span>
            <input id="newSkillDesc" class="form-input" /></label>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" id="addSkillBtn">Add Skill</button>
        </div>
      </div>
      <h4 class="panel-title" style="margin-top:16px">Existing Skills (${skills.length})</h4>
      <ul class="list-stack">
        ${skills.map(s => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(s.name)}</span>
              <span class="list-row-sub">${esc(s.category || 'Uncategorised')}${s.description ? ' — ' + esc(s.description) : ''}</span>
            </div>
            <button class="btn btn-danger btn-xs" data-remove-skill="${s.id}">Remove</button>
          </li>
        `).join('') || '<li class="empty-row">No skills defined yet</li>'}
      </ul>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });

  $('#addSkillBtn').onclick = () => submitFormModal(
    '#addSkillBtn',
    { '#newSkillName': { required: true, maxLength: 100, label: 'Skill name' } },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Skill added', 'success');
      openManageSkillsModal();
    },
    '/api/institution/skills',
    'POST',
    () => ({
      name: $('#newSkillName').value,
      category: $('#newSkillCat').value || null,
      description: $('#newSkillDesc').value || null,
    }),
  );

  document.querySelectorAll('[data-remove-skill]').forEach(b => {
    b.onclick = async () => {
      const ok = await confirmAction({
        message: 'Remove this skill and all associated assessments?',
      });
      if (!ok) return;
      setBusy(b, true, 'Removing…');
      try {
        await apiCall(`/api/institution/skills/${b.dataset.removeSkill}`, 'DELETE');
        closeModal();
        await loadAllData();
        rerenderRoleContent();
        showToast('Skill removed', 'success');
        openManageSkillsModal();
      } catch (e) {
        showToast(e.message, 'error');
        setBusy(b, false);
      }
    };
  });
}
function openComplianceRuleModal() {
  openModal({
    title: 'New Compliance Rule',
    body: `
      <label class="form-group"><span class="form-label">Title <span class="req">*</span></span>
        <input id="crTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="crDesc" class="form-textarea" rows="2"></textarea></label>
      <label class="form-group"><span class="form-label">Programme (optional)</span>
        <select id="crProgramme" class="form-select">
          <option value="">Any</option>
          ${S.programmes.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Target department</span>
          <input id="crDept" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Recurrence (months)</span>
          <input id="crMonths" type="number" min="1" max="120" class="form-input" value="12" /></label>
      </div>
      <label class="checkbox-row">
        <input type="checkbox" id="crMandatory" checked />
        Mandatory for all selected trainees
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="crSave" class="btn btn-primary">Create Rule</button>`,
  });
  $('#crSave').onclick = () => submitFormModal(
    '#crSave',
    {
      '#crTitle':  { required: true, maxLength: 200, label: 'Title' },
      '#crMonths': { required: true, min: 1, max: 120, label: 'Recurrence' },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Compliance rule created', 'success');
    },
    '/api/institution/compliance-rules',
    'POST',
    () => ({
      title: $('#crTitle').value,
      description: $('#crDesc').value || null,
      programme_id: $('#crProgramme').value ? Number($('#crProgramme').value) : null,
      target_department: $('#crDept').value || null,
      recurrence_months: Number($('#crMonths').value || 12),
      mandatory: $('#crMandatory').checked,
    }),
  );
}
function openAssignInstructorModal() {
  openModal({
    title: 'Assign Instructor',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Search experts</span>
        <input id="aiSearch" class="form-input" placeholder="Name, email, or specialization" /></label>
      <div id="aiResults" class="list-stack" style="margin-top:12px">
        ${S.experts.slice(0, 30).map(e => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(e.name)}</span>
              <span class="list-row-sub">${esc(e.specialization || '')} — ${fmtCur(e.hourly_rate || 0)}/hr</span>
            </div>
            <button class="btn btn-primary btn-xs" data-pick-instructor="${e.id}">Assign</button>
          </li>
        `).join('') || '<li class="empty-row">No experts available</li>'}
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });

  const bindPick = () => {
    document.querySelectorAll('[data-pick-instructor]').forEach(b => {
      b.onclick = async () => {
        setBusy(b, true, 'Assigning…');
        try {
          await apiCall('/api/institution/instructors', 'POST', {
            expert_id: Number(b.dataset.pickInstructor),
          });
          closeModal();
          await loadAllData();
          rerenderRoleContent();
          showToast('Instructor assigned', 'success');
        } catch (e) {
          showToast(e.message, 'error');
          setBusy(b, false);
        }
      };
    });
  };
  bindPick();

  const search = $('#aiSearch');
  if (search) {
    search.oninput = debounce(() => {
      const q = search.value.toLowerCase();
      const filtered = S.experts.filter(e =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.specialization || '').toLowerCase().includes(q)
      );
      $('#aiResults').innerHTML = filtered.slice(0, 30).map(e => `
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(e.name)}</span>
            <span class="list-row-sub">${esc(e.specialization || '')} — ${fmtCur(e.hourly_rate || 0)}/hr</span>
          </div>
          <button class="btn btn-primary btn-xs" data-pick-instructor="${e.id}">Assign</button>
        </li>
      `).join('') || '<li class="empty-row">No matches</li>';
      bindPick();
    }, 250);
  }
}
function openInviteTeamMemberModal() {
  openModal({
    title: 'Invite Team Member',
    body: `
      <label class="form-group"><span class="form-label">Full name <span class="req">*</span></span>
        <input id="tmName" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Email <span class="req">*</span></span>
        <input id="tmEmail" type="email" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Role</span>
        <select id="tmRole" class="form-select">
          ${CONFIG.INSTITUTION_ROLES.map(r =>
            `<option value="${r}">${r.replace('_',' ')}</option>`).join('')}
        </select></label>
      <p class="form-hint">A one-time setup link will be generated and shown once.</p>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tmSave" class="btn btn-primary">Send Invite</button>`,
  });
  $('#tmSave').onclick = () => submitFormModal(
    '#tmSave',
    {
      '#tmName':  { required: true, maxLength: 100, label: 'Name' },
      '#tmEmail': { required: true, email: true, label: 'Email' },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Invite sent', 'success');
    },
    '/api/institution/team/invite',
    'POST',
    () => ({
      name: $('#tmName').value,
      email: $('#tmEmail').value,
      institution_role: $('#tmRole').value,
    }),
  );
}
function openChangeTeamRoleModal(userId) {
  const t = S.institutionTeam.find(x => String(x.id) === String(userId)) || {};
  openModal({
    title: 'Change Team Role',
    body: `
      <p><strong>${esc(t.name || '')}</strong></p>
      <label class="form-group"><span class="form-label">New role</span>
        <select id="ctrRole" class="form-select">
          ${CONFIG.INSTITUTION_ROLES.map(r =>
            `<option value="${r}" ${t.institution_role === r ? 'selected' : ''}>${r.replace('_',' ')}</option>`).join('')}
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ctrSave" class="btn btn-primary">Update</button>`,
  });
  $('#ctrSave').onclick = () => submitFormModal(
    '#ctrSave',
    {},
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Role updated', 'success');
    },
    `/api/institution/team/${userId}/role`,
    'PUT',
    () => ({ institution_role: $('#ctrRole').value }),
  );
}
function openTeamPermissionsModal(userId) {
  const permissions = [
    'manage_programmes', 'manage_cohorts', 'manage_trainees',
    'manage_assessments', 'issue_certificates', 'view_reports',
    'manage_branding', 'manage_team',
  ];
  openModal({
    title: 'Team Permissions',
    body: `
      <p class="form-hint" style="margin-bottom:14px">Toggle granular permissions for this team member.</p>
      ${permissions.map(p => `
        <label class="checkbox-row" style="margin-bottom:8px">
          <input type="checkbox" data-perm="${p}" />
          ${p.replace(/_/g, ' ')}
        </label>
      `).join('')}`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="tpSave" class="btn btn-primary">Save</button>`,
  });
  $('#tpSave').onclick = () => submitFormModal(
    '#tpSave',
    {},
    async () => {
      closeModal();
      showToast('Permissions saved', 'success');
    },
    `/api/institution/team/${userId}/permissions`,
    'PUT',
    () => ({
      permissions: Array.from(document.querySelectorAll('[data-perm]')).map(el => ({
        key: el.dataset.perm,
        granted: el.checked,
      })),
    }),
  );
}
function openOrgUnitModal(unitId) {
  const u = unitId ? (S.institutionOrgUnits.find(x => x.id === unitId) || {}) : {};
  openModal({
    title: unitId ? 'Edit Org Unit' : 'New Org Unit',
    body: `
      <label class="form-group"><span class="form-label">Name <span class="req">*</span></span>
        <input id="ouName" class="form-input" value="${esc(u.name || '')}" /></label>
      <label class="form-group"><span class="form-label">Type</span>
        <select id="ouType" class="form-select">
          ${['department','branch','cost_centre','team'].map(t =>
            `<option value="${t}" ${u.unit_type === t ? 'selected' : ''}>${t.replace('_',' ')}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Code</span>
        <input id="ouCode" class="form-input" value="${esc(u.code || '')}" /></label>
      <label class="form-group"><span class="form-label">Manager</span>
        <select id="ouManager" class="form-select">
          <option value="">Unassigned</option>
          ${S.institutionTeam.map(t =>
            `<option value="${t.id}" ${u.manager_id === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Budget amount</span>
        <input id="ouBudget" type="number" min="0" class="form-input" value="${u.budget_amount || 0}" /></label>
      <label class="checkbox-row">
        <input type="checkbox" id="ouActive" ${u.active === undefined || u.active ? 'checked' : ''} />
        Active
      </label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ouSave" class="btn btn-primary">${unitId ? 'Save' : 'Create'}</button>`,
  });
  $('#ouSave').onclick = () => submitFormModal(
    '#ouSave',
    {
      '#ouName':   { required: true, maxLength: 150, label: 'Name' },
      '#ouBudget': { min: 0, label: 'Budget' },
    },
    async () => {
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast(unitId ? 'Unit updated' : 'Unit created', 'success');
    },
    unitId ? `/api/institution/org-units/${unitId}` : '/api/institution/org-units',
    unitId ? 'PUT' : 'POST',
    () => ({
      name: $('#ouName').value,
      unit_type: $('#ouType').value,
      code: $('#ouCode').value || null,
      manager_id: $('#ouManager').value ? Number($('#ouManager').value) : null,
      budget_amount: Number($('#ouBudget').value || 0),
      active: $('#ouActive').checked,
    }),
  );
}
function openScheduleReportModal() {
  openModal({
    title: 'Schedule Report',
    body: `
      <label class="form-group"><span class="form-label">Report type</span>
        <select id="srType" class="form-select">
          <option value="programme">Programme Scorecard</option>
          <option value="cohort">Cohort Comparison</option>
          <option value="trainee">Trainee Progress</option>
          <option value="compliance">Compliance</option>
          <option value="cost">Cost Analysis</option>
        </select></label>
      <label class="form-group"><span class="form-label">Frequency</span>
        <select id="srFreq" class="form-select">
          <option value="daily">Daily</option>
          <option value="weekly" selected>Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </select></label>
      <label class="form-group"><span class="form-label">Recipients (comma separated) <span class="req">*</span></span>
        <textarea id="srRecipients" class="form-textarea" rows="2"
                  placeholder="ops@acme.com, l-and-d@acme.com"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="srSave" class="btn btn-primary">Schedule</button>`,
  });

  $('#srSave').onclick = () => {
    const recipients = $('#srRecipients').value
      .split(',').map(s => s.trim()).filter(Boolean);

    if (!recipients.length) return showToast('Add at least one recipient', 'error');
    const invalid = recipients.filter(r => !validEmail(r));
    if (invalid.length) return showToast(`Invalid email: ${invalid[0]}`, 'error');

    submitFormModal(
      '#srSave',
      {},
      async () => {
        const type = $('#srType').value;
        const template = await apiCall('/api/institution/report-templates', 'POST', {
          name: `${type} report`,
          report_type: type,
        });
        await apiCall('/api/institution/scheduled-reports', 'POST', {
          template_id: template.id,
          frequency: $('#srFreq').value,
          recipients,
        });
        closeModal();
        await loadAllData();
        rerenderRoleContent();
        showToast('Report scheduled', 'success');
      },
      null, null, null,
    );
  };
}
async function openReportPreviewModal(type) {
  try {
    showLoading(true);
    const endpoints = {
      'programme-scorecard': '/api/institution/reports/programme-scorecard',
      'cohort-comparison':   '/api/institution/reports/cohort-comparison',
      'trainee-progress':    '/api/institution/reports/trainee-progress-heatmap',
      'compliance':          '/api/institution/reports/compliance',
      'cost':                '/api/institution/reports/cost',
    };
    const titles = {
      'programme-scorecard': 'Programme Scorecard',
      'cohort-comparison':   'Cohort Comparison',
      'trainee-progress':    'Trainee Progress Heatmap',
      'compliance':          'Compliance Report',
      'cost':                'Cost Analysis',
    };
    const endpoint = endpoints[type];
    if (!endpoint) return;

    const d = await apiCall(endpoint);
    let content = '';

    if (type === 'programme-scorecard') {
      content = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Programme</th><th>Status</th><th>Enrolled</th>
                <th>Completed</th><th>Avg. Progress</th><th>Cost per Seat</th>
              </tr>
            </thead>
            <tbody>
              ${(d.scorecard || []).map(r => `
                <tr>
                  <td>${esc(r.title)}</td>
                  <td><span class="${statusClass(r.status)}">${esc(r.status)}</span></td>
                  <td>${r.total_enrolled || 0}</td>
                  <td>${r.total_completed || 0}</td>
                  <td>${Math.round(Number(r.avg_progress) || 0)}%</td>
                  <td>${fmtCur(r.cost_per_seat || 0)}</td>
                </tr>
              `).join('') || '<tr><td colspan="6" class="empty-row">No data</td></tr>'}
            </tbody>
          </table>
        </div>`;
    } else if (type === 'cohort-comparison') {
      content = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Cohort</th><th>Programme</th><th>Enrolled</th><th>Avg. Progress</th><th>Avg. Score</th><th>Attendance</th></tr>
            </thead>
            <tbody>
              ${(d.cohorts || []).map(c => {
                const att = Number(c.attendance_total)
                  ? Math.round((Number(c.presents) / Number(c.attendance_total)) * 100)
                  : 0;
                return `
                  <tr>
                    <td>${esc(c.name)}</td>
                    <td>${esc(c.programme_title || '-')}</td>
                    <td>${c.enrolled || 0}</td>
                    <td>${Math.round(Number(c.avg_progress) || 0)}%</td>
                    <td>${Math.round(Number(c.avg_score) || 0)}%</td>
                    <td>${att}%</td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="6" class="empty-row">No data</td></tr>'}
            </tbody>
          </table>
        </div>`;
    } else if (type === 'trainee-progress') {
      const paceColours = { ahead: '#22c55e', on_track: '#84cc16', behind: '#f59e0b', at_risk: '#dc2626' };
      content = `
        <ul class="list-stack">
          ${(d.heatmap || []).map(t => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(t.name)}</span>
                <span class="list-row-sub">${esc(t.department || '')} - ${esc(t.programme_title || '')}</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <div class="progress-bar" style="width:100px">
                  <span style="width:${t.progress}%;background:${paceColours[t.pace] || 'var(--brand)'}"></span>
                </div>
                <span style="font-weight:600;color:${paceColours[t.pace] || 'inherit'}">${t.progress}%</span>
              </div>
            </li>
          `).join('') || '<li class="empty-row">No data</li>'}
        </ul>`;
    } else if (type === 'compliance') {
      const statusMap = {
        valid: 'status-active', expiring_soon: 'status-pending',
        expired: 'status-rejected', revoked: 'status-rejected', no_expiry: 'status-active',
      };
      content = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Name</th><th>Department</th><th>Certificate</th><th>Expires</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${(d.compliance || []).map(r => `
                <tr>
                  <td>${esc(r.name)}</td>
                  <td>${esc(r.department || '-')}</td>
                  <td>${esc(r.title || '-')}</td>
                  <td>${r.expires_at ? fmtDate(r.expires_at) : 'Never'}</td>
                  <td><span class="${statusMap[r.compliance_status] || 'chip chip-neutral'}">
                    ${esc((r.compliance_status || '').replace('_', ' '))}
                  </span></td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="empty-row">No data</td></tr>'}
            </tbody>
          </table>
        </div>`;
    } else if (type === 'cost') {
      content = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          <div>Total programme cost: <strong>${fmtCur(d.total_cost || 0)}</strong></div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Programme</th><th>Seats</th><th>Cost per Seat</th><th>Trainer</th><th>Materials</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${(d.cost || []).map(r => `
                <tr>
                  <td>${esc(r.title)}</td>
                  <td>${r.seats}</td>
                  <td>${fmtCur(r.cost_per_seat)}</td>
                  <td>${fmtCur(r.trainer_cost)}</td>
                  <td>${fmtCur(r.materials_cost)}</td>
                  <td>${fmtCur(r.total_cost)}</td>
                </tr>
              `).join('') || '<tr><td colspan="6" class="empty-row">No data</td></tr>'}
            </tbody>
          </table>
        </div>`;
    }

    openModal({
      title: titles[type],
      className: 'modal-lg',
      body: content,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
               <button class="btn btn-primary" id="reportExportBtn">
                 <i class="fas fa-download"></i> Export CSV</button>`,
    });

    $('#reportExportBtn').onclick = () => {
      const rows = d.scorecard || d.cohorts || d.heatmap || d.compliance || d.cost || [];
      if (!rows.length) return showToast('No data to export', 'warning');
      downloadCsv(`${type}-${Date.now()}.csv`, rows);
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

/* ---------- Added and upgraded modal functions from modelsupdates.js ---------- */
function setBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) {
    if (!btn.dataset._origHtml) btn.dataset._origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${label || 'Working…'}`;
  } else {
    btn.disabled = false;
    if (btn.dataset._origHtml) {
      btn.innerHTML = btn.dataset._origHtml;
      delete btn.dataset._origHtml;
    }
  }
}

function validEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function safeUrl(u) {
  if (!u) return '';
  try {
    const parsed = new URL(u, window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.href;
  } catch { return ''; }
}

async function confirmAction(opts = {}) {
  if (typeof confirmDialog === 'function') {
    return confirmDialog(opts.message || 'Are you sure?');
  }
  return window.confirm(opts.message || 'Are you sure?');
}

function openConfirmationModal(opts = {}) {
  return new Promise(resolve => {
    const {
      title = 'Confirm',
      message = 'Are you sure?',
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      danger = false,
    } = opts;
    openModal({
      title,
      body: `<p>${esc(message)}</p>`,
      footer: `
        <button id="cfmCancel" class="btn btn-secondary">${esc(cancelLabel)}</button>
        <button id="cfmOk" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${esc(confirmLabel)}</button>`,
    });
    $('#cfmCancel').onclick = () => { closeModal(); resolve(false); };
    $('#cfmOk').onclick     = () => { closeModal(); resolve(true); };
  });
}

async function openPaymentHistoryModal() {
  try {
    showLoading(true);
    const d = await apiCall('/api/user/wallet/transactions');
    const txns = d.transactions || [];
    openModal({
      title: 'Payment History',
      className: 'modal-lg',
      body: txns.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Description</th><th>Method</th>
                <th>Amount</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${txns.map(t => `
                <tr>
                  <td>${fmtDT(t.created_at)}</td>
                  <td>${esc(t.description || '')}</td>
                  <td>${esc(t.provider || '—')}</td>
                  <td>${fmtCur(t.amount)}</td>
                  <td><span class="${statusClass(t.status)}">${esc(t.status)}</span></td>
                  <td>
                    ${t.status === 'failed'
                      ? `<button class="btn btn-warning btn-xs" data-retry-txn="${t.id}">Retry</button>`
                      : `<button class="btn btn-secondary btn-xs" data-receipt-txn="${t.id}">Receipt</button>`}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : '<p class="empty-row">No transactions yet</p>',
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });

    $$('[data-receipt-txn]').forEach(b => b.onclick = async () => {
      try {
        const r = await apiCall(`/api/user/wallet/transactions/${b.dataset.receiptTxn}/receipt`);
        const url = safeUrl(r.url);
        if (url) window.open(url, '_blank', 'noopener');
        else showToast('Receipt not available', 'warning');
      } catch (e) { showToast(e.message, 'error'); }
    });

    $$('[data-retry-txn]').forEach(b => b.onclick = async () => {
      setBusy(b, true, 'Retrying…');
      try {
        await apiCall(`/api/user/wallet/transactions/${b.dataset.retryTxn}/retry`, 'POST');
        showToast('Payment retried', 'success');
        closeModal();
        openPaymentHistoryModal();
      } catch (e) {
        showToast(e.message, 'error');
        setBusy(b, false);
      }
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

async function openNotificationPreferencesModal() {
  try {
    showLoading(true);
    const d = await apiCall('/api/user/notification-preferences');
    const prefs = d.preferences || {};
    const channels = ['email', 'push', 'sms'];
    const categories = [
      { key: 'consultations', label: 'Consultation updates' },
      { key: 'courses',       label: 'Course & learning updates' },
      { key: 'payments',      label: 'Payments & payouts' },
      { key: 'tickets',       label: 'Support tickets' },
      { key: 'marketing',     label: 'Product news & offers' },
    ];

    openModal({
      title: 'Notification Preferences',
      className: 'modal-lg',
      body: `
        <p class="form-hint">Choose how we reach you about each kind of update.</p>
        <div class="table-wrapper" style="margin-top:12px">
          <table class="data-table">
            <thead>
              <tr>
                <th>Category</th>
                ${channels.map(c => `<th style="text-align:center">${c.toUpperCase()}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${categories.map(cat => `
                <tr>
                  <td>${esc(cat.label)}</td>
                  ${channels.map(ch => `
                    <td style="text-align:center">
                      <input type="checkbox"
                             data-pref-cat="${cat.key}" data-pref-ch="${ch}"
                             ${prefs?.[cat.key]?.[ch] ? 'checked' : ''} />
                    </td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
               <button id="npSave" class="btn btn-primary">Save Preferences</button>`,
    });

    $('#npSave').onclick = async () => {
      const payload = {};
      $$('[data-pref-cat]').forEach(el => {
        const cat = el.dataset.prefCat, ch = el.dataset.prefCh;
        (payload[cat] ||= {})[ch] = el.checked;
      });
      setBusy($('#npSave'), true, 'Saving…');
      try {
        await apiCall('/api/user/notification-preferences', 'PUT', { preferences: payload });
        closeModal();
        showToast('Preferences saved', 'success');
      } catch (e) {
        showToast(e.message, 'error');
        setBusy($('#npSave'), false);
      }
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

async function openUserActivityModal(userId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/admin/users/${userId}/activity`);
    const events = d.events || [];
    openModal({
      title: 'Account Activity',
      className: 'modal-lg',
      body: events.length ? `
        <ul class="list-stack">
          ${events.map(ev => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(ev.summary || ev.action || '')}</span>
                <span class="list-row-sub">
                  ${esc(ev.actor_name || 'system')} · ${fmtDT(ev.created_at)}
                  ${ev.ip ? ` · ${esc(ev.ip)}` : ''}
                </span>
              </div>
            </li>
          `).join('')}
        </ul>` : '<p class="empty-row">No activity recorded</p>',
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function openSessionNotesModal(consultationId) {
  const c = S.consultations.find(x => String(x.id) === String(consultationId));
  if (!c) return;
  openModal({
    title: 'Session Notes',
    body: `
      <p class="form-hint">Notes are shared with the other participant once saved.</p>
      <label class="form-group"><span class="form-label">Notes</span>
        <textarea id="snNotes" class="form-textarea" rows="8"
                  placeholder="Key takeaways, action items, follow-ups…">${esc(c.shared_notes || '')}</textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="snSave" class="btn btn-primary">Save Notes</button>`,
  });
  $('#snSave').onclick = async () => {
    const notes = ($('#snNotes').value || '').trim();
    setBusy($('#snSave'), true, 'Saving…');
    try {
      await apiCall(`/api/consultations/${consultationId}/notes`, 'PUT', { shared_notes: notes });
      closeModal();
      await loadAllData();
      rerenderRoleContent();
      showToast('Notes saved', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      setBusy($('#snSave'), false);
    }
  };
}

function openCertificateVerificationModal() {
  openModal({
    title: 'Verify a Certificate',
    body: `
      <label class="form-group"><span class="form-label">Certificate serial</span>
        <input id="cvSerial" class="form-input" placeholder="e.g. EH-2024-XXXXXX" /></label>
      <div id="cvResult" style="margin-top:12px"></div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>
             <button id="cvGo" class="btn btn-primary">Verify</button>`,
  });
  $('#cvGo').onclick = async () => {
    const serial = ($('#cvSerial').value || '').trim();
    if (!serial) return showToast('Enter a serial number', 'error');
    setBusy($('#cvGo'), true, 'Checking…');
    try {
      const d = await apiCall(`/api/certificates/verify/${encodeURIComponent(serial)}`);
      $('#cvResult').innerHTML = d.valid
        ? `<div class="alert alert-success"><i class="fas fa-check-circle"></i>
             <div><strong>Valid certificate</strong><br>
             ${esc(d.holder_name || '')} — ${esc(d.course_title || '')}<br>
             Issued ${fmtDate(d.issued_at)}${d.expires_at ? ` · Expires ${fmtDate(d.expires_at)}` : ''}</div>
           </div>`
        : `<div class="alert alert-error"><i class="fas fa-times-circle"></i>
             <div>No valid certificate found for this serial.</div></div>`;
    } catch (e) {
      $('#cvResult').innerHTML =
        `<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i>
           <div>${esc(e.message || 'Verification failed')}</div></div>`;
    } finally {
      setBusy($('#cvGo'), false);
    }
  };
}

async function openExpertAvailabilityModal() {
  let availability = [];
  try {
    showLoading(true);
    const d = await apiCall('/api/experts/me/availability').catch(() => ({ availability: [] }));
    availability = d.availability || [];
  } finally {
    showLoading(false);
  }

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const map  = {};
  availability.forEach(a => { map[a.weekday] = a; });

  openModal({
    title: 'Recurring Availability',
    className: 'modal-lg',
    body: `
      <p class="form-hint">Define weekly windows where clients can book you. Slots are generated automatically from these windows.</p>
      <div class="table-wrapper" style="margin-top:12px">
        <table class="data-table">
          <thead>
            <tr><th>Day</th><th>From</th><th>To</th><th>Buffer (min)</th><th>Enabled</th></tr>
          </thead>
          <tbody>
            ${days.map((name, i) => {
              const a = map[i] || {};
              return `
                <tr>
                  <td>${name}</td>
                  <td><input type="time" class="form-input" data-avail-start="${i}" value="${esc(a.start_time || '')}" /></td>
                  <td><input type="time" class="form-input" data-avail-end="${i}"   value="${esc(a.end_time   || '')}" /></td>
                  <td><input type="number" min="0" max="60" step="5" class="form-input"
                             data-avail-buffer="${i}" value="${a.buffer_minutes || 0}" /></td>
                  <td style="text-align:center">
                    <input type="checkbox" data-avail-on="${i}" ${a.enabled ? 'checked' : ''} />
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="avSave" class="btn btn-primary">Save Availability</button>`,
  });

  $('#avSave').onclick = async () => {
    const list = days.map((_, i) => {
      const enabled = $(`[data-avail-on="${i}"]`).checked;
      return {
        weekday: i,
        enabled,
        start_time: $(`[data-avail-start="${i}"]`).value || null,
        end_time:   $(`[data-avail-end="${i}"]`).value   || null,
        buffer_minutes: Number($(`[data-avail-buffer="${i}"]`).value || 0),
      };
    }).filter(x => !x.enabled || (x.start_time && x.end_time));

    setBusy($('#avSave'), true, 'Saving…');
    try {
      await apiCall('/api/experts/me/availability', 'PUT', { availability: list });
      closeModal();
      showToast('Availability updated', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      setBusy($('#avSave'), false);
    }
  };
}

function openModal({ title, body, footer, className = '', onClose } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${className}" role="dialog" aria-modal="true"
         aria-labelledby="modalTitle">
      <header class="modal-header">
        <h3 class="modal-title" id="modalTitle">${esc(title || '')}</h3>
        <button class="modal-close" aria-label="Close" data-close-modal>
          <i class="fas fa-times"></i>
        </button>
      </header>
      <div class="modal-body" tabindex="-1">${body || ''}</div>
      ${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}
    </div>`;

  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');

  const previousFocus = document.activeElement;
  const modalEl = overlay.querySelector('.modal');
  const bodyEl  = overlay.querySelector('.modal-body');

  const record = { overlay, previousFocus, onClose };
  __modalStack.push(record);

  // Focus first interactive element (or the body).
  const first = modalEl.querySelector(
    'input:not([type="hidden"]), select, textarea, button:not([data-close-modal]), [tabindex]:not([tabindex="-1"])'
  );
  (first || bodyEl).focus();

  // Focus trap.
  const onKeydown = (e) => {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    const focusables = modalEl.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
      'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const firstEl = focusables[0];
    const lastEl  = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault(); lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault(); firstEl.focus();
    }
  };
  overlay.addEventListener('keydown', onKeydown);

  // Backdrop close.
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Wire any [data-close-modal] elements.
  overlay.querySelectorAll('[data-close-modal]').forEach(b => {
    b.onclick = () => closeModal();
  });

  return modalEl;
}

function closeModal() {
  const record = __modalStack.pop();
  if (!record) return;
  const { overlay, previousFocus, onClose } = record;
  overlay.classList.add('modal-closing');
  setTimeout(() => {
    overlay.remove();
    if (!__modalStack.length) document.body.classList.remove('modal-open');
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    if (typeof onClose === 'function') onClose();
  }, 120);
}

async function openQuizBuilderModal(lessonId) {
  let quiz = { questions: [] };
  try {
    showLoading(true);
    if (lessonId) {
      const d = await apiCall(`/api/expert/lessons/${lessonId}/quiz`).catch(() => null);
      if (d && d.quiz) quiz = d.quiz;
    }
  } finally { showLoading(false); }

  const renderQuestion = (q, i) => `
    <li class="list-row" data-quiz-q="${i}" style="align-items:flex-start;flex-direction:column;gap:6px">
      <div style="display:flex;width:100%;gap:8px;align-items:center">
        <input class="form-input q-text" value="${esc(q.question || '')}"
               placeholder="Question text" style="flex:1" />
        <select class="form-select q-type" style="width:150px">
          ${['mcq','true_false','short_answer'].map(t =>
            `<option value="${t}" ${q.type === t ? 'selected' : ''}>${t.replace('_',' ')}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-danger btn-xs" data-remove-q="${i}">×</button>
      </div>
      <textarea class="form-textarea q-options" rows="2"
        placeholder="Options (one per line, only for MCQ)">${esc((q.options || []).join('\n'))}</textarea>
      <input class="form-input q-answer" value="${esc(q.answer || '')}"
             placeholder="Correct answer" />
    </li>`;

  openModal({
    title: 'Quiz Builder',
    className: 'modal-lg',
    body: `
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Quiz title</span>
          <input id="qzTitle" class="form-input" value="${esc(quiz.title || '')}" /></label>
        <label class="form-group"><span class="form-label">Pass mark (%)</span>
          <input id="qzPass" type="number" class="form-input" value="${quiz.pass_mark || 70}" /></label>
      </div>
      <label class="checkbox-row">
        <input type="checkbox" id="qzShuffle" ${quiz.shuffle ? 'checked' : ''} />
        Shuffle questions for each learner
      </label>
      <h4 class="panel-title" style="margin-top:16px">Questions</h4>
      <ul class="list-stack" id="qzList">
        ${(quiz.questions || []).map(renderQuestion).join('') ||
          '<li class="empty-row">No questions yet</li>'}
      </ul>
      <button type="button" class="btn btn-secondary btn-sm" id="qzAdd" style="margin-top:10px">
        <i class="fas fa-plus"></i> Add question</button>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="qzSave" class="btn btn-primary">Save Quiz</button>`,
  });

  let questions = [...(quiz.questions || [])];
  const refresh = () => {
    $('#qzList').innerHTML = questions.map(renderQuestion).join('') ||
      '<li class="empty-row">No questions yet</li>';
    $$('[data-remove-q]').forEach(b => b.onclick = () => {
      questions.splice(Number(b.dataset.removeQ), 1);
      refresh();
    });
  };
  refresh();

  $('#qzAdd').onclick = () => {
    questions.push({ question: '', type: 'mcq', options: [], answer: '' });
    refresh();
  };

  $('#qzSave').onclick = async () => {
    // Pull latest values from DOM into `questions`.
    $$('[data-quiz-q]').forEach((el, i) => {
      questions[i] = {
        question: el.querySelector('.q-text').value.trim(),
        type: el.querySelector('.q-type').value,
        options: el.querySelector('.q-options').value
          .split('\n').map(s => s.trim()).filter(Boolean),
        answer: el.querySelector('.q-answer').value.trim(),
      };
    });
    const valid = questions.filter(q => q.question && q.answer);
    if (!valid.length) return showToast('Add at least one complete question', 'error');

    setBusy($('#qzSave'), true, 'Saving…');
    try {
      await apiCall(`/api/expert/lessons/${lessonId}/quiz`, 'PUT', {
        title: $('#qzTitle').value,
        pass_mark: Number($('#qzPass').value || 70),
        shuffle: $('#qzShuffle').checked,
        questions: valid,
      });
      closeModal();
      showToast('Quiz saved', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      setBusy($('#qzSave'), false);
    }
  };
}

function openAssignmentModal(lessonId) {
  openModal({
    title: 'Add Assignment',
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Assignment title <span class="req">*</span></span>
        <input id="asgTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Instructions</span>
        <textarea id="asgBrief" class="form-textarea" rows="5"
                  placeholder="What should the learner submit?"></textarea></label>
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Max score</span>
          <input id="asgMax" type="number" class="form-input" value="100" /></label>
        <label class="form-group"><span class="form-label">Pass mark (%)</span>
          <input id="asgPass" type="number" class="form-input" value="70" /></label>
        <label class="form-group"><span class="form-label">Due date</span>
          <input id="asgDue" type="datetime-local" class="form-input" /></label>
        <label class="form-group"><span class="form-label">Allowed file types</span>
          <input id="asgTypes" class="form-input" placeholder="pdf, docx, zip" /></label>
      </div>
      <label class="form-group"><span class="form-label">Reference file (optional)</span>
        <input id="asgRef" type="file" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="asgSave" class="btn btn-primary">Save Assignment</button>`,
  });

  $('#asgSave').onclick = async () => {
    const title = ($('#asgTitle').value || '').trim();
    if (!title) return showToast('Title is required', 'error');

    const payload = {
      lesson_id: lessonId,
      title,
      brief: $('#asgBrief').value || null,
      max_score: Number($('#asgMax').value || 100),
      pass_mark: Number($('#asgPass').value || 70),
      due_date: $('#asgDue').value || null,
      allowed_types: ($('#asgTypes').value || '')
        .split(',').map(s => s.trim()).filter(Boolean),
    };

    const file = $('#asgRef').files[0];
    setBusy($('#asgSave'), true, 'Saving…');
    try {
      if (file) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) =>
          fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v));
        fd.append('reference_file', file);
        await apiCall('/api/expert/assignments', 'POST', fd, true);
      } else {
        await apiCall('/api/expert/assignments', 'POST', payload);
      }
      closeModal();
      showToast('Assignment saved', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      setBusy($('#asgSave'), false);
    }
  };
}

async function openDisputeResolutionModal(disputeId) {
  try {
    showLoading(true);
    const d = await apiCall(`/api/disputes/${disputeId}`);
    const dis = d.dispute || {};
    const history = d.history || [];
    const evidence = d.evidence || [];

    openModal({
      title: 'Dispute Resolution',
      className: 'modal-lg',
      body: `
        <div class="form-grid">
          <div><p class="form-label">Status</p>
            <p><span class="${statusClass(dis.status)}">${esc(dis.status)}</span></p></div>
          <div><p class="form-label">Filed</p><p>${fmtDT(dis.created_at)}</p></div>
          <div><p class="form-label">Amount in dispute</p><p>${fmtCur(dis.amount || 0)}</p></div>
        </div>
        <p style="margin-top:12px"><strong>Reason:</strong> ${esc((dis.reason || '').replace(/_/g,' '))}</p>
        <p><strong>Description:</strong> ${esc(dis.description || '')}</p>

        ${evidence.length ? `
          <h4 class="panel-title" style="margin-top:20px">Evidence</h4>
          <ul class="list-stack">
            ${evidence.map(e => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(e.filename)}</span>
                  <span class="list-row-sub">Uploaded by ${esc(e.uploader_name || '')} · ${fmtDT(e.created_at)}</span>
                </div>
                <a class="btn btn-secondary btn-xs" href="${safeUrl(e.url) || '#'}"
                   target="_blank" rel="noopener">View</a>
              </li>
            `).join('')}
          </ul>` : ''}

        <h4 class="panel-title" style="margin-top:20px">History</h4>
        <ul class="list-stack">
          ${history.length ? history.map(h => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(h.summary)}</span>
                <span class="list-row-sub">${esc(h.actor_name || 'system')} · ${fmtDT(h.created_at)}</span>
              </div>
            </li>
          `).join('') : '<li class="empty-row">No activity</li>'}
        </ul>

        ${['open', 'under_review'].includes(dis.status) ? `
          <h4 class="panel-title" style="margin-top:20px">Admin action</h4>
          <label class="form-group"><span class="form-label">Outcome</span>
            <select id="drOutcome" class="form-select">
              <option value="client">Rule for client — refund</option>
              <option value="expert">Rule for expert — release funds</option>
              <option value="split">Split — partial refund</option>
              <option value="dismiss">Dismiss</option>
            </select></label>
          <label class="form-group"><span class="form-label">Notes (visible to both parties)</span>
            <textarea id="drNotes" class="form-textarea" rows="3"></textarea></label>` : ''}`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        ${['open', 'under_review'].includes(dis.status)
          ? `<button id="drSave" class="btn btn-primary">Record Resolution</button>`
          : ''}`,
    });

    const saveBtn = $('#drSave');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        setBusy(saveBtn, true, 'Saving…');
        try {
          await apiCall(`/api/disputes/${disputeId}/resolve`, 'POST', {
            outcome: $('#drOutcome').value,
            notes: $('#drNotes').value,
          });
          closeModal();
          await loadAllData();
          rerenderRoleContent();
          showToast('Dispute resolved', 'success');
        } catch (e) {
          showToast(e.message, 'error');
          setBusy(saveBtn, false);
        }
      };
    }
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
}

function recordAudit(action, payload = {}) {
  apiCall('/api/admin/audit', 'POST', { action, ...payload })
    .catch(err => console.warn('[audit] failed', action, err));
}

function svgSparkline(values, opts = {}) {
  const w = opts.width || 260, h = opts.height || 48, pad = 2;
  if (!values.length) return '';
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const step = (w - pad * 2) / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const fill = opts.fill || 'var(--brand, #4f46e5)';
  return `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px">
      <polyline points="${pts}" fill="none" stroke="${fill}" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
}

function svgBars(rows, opts = {}) {
  const w = opts.width || 320, rowH = 26, pad = 4;
  const max = Math.max(1, ...rows.map(r => r.value));
  const h = rows.length * rowH + pad * 2;
  return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px">
      ${rows.map((r, i) => {
        const y = pad + i * rowH;
        const barW = Math.max(1, (r.value / max) * (w * 0.65));
        return `
          <text x="0" y="${y + 16}" font-size="11"
                fill="var(--text-muted, #6b7280)">${esc(r.label)}</text>
          <rect x="${w * 0.32}" y="${y + 6}" width="${barW}" height="12"
                rx="3" fill="${r.color || 'var(--brand, #4f46e5)'}" />
          <text x="${w * 0.32 + barW + 6}" y="${y + 16}" font-size="11"
                fill="var(--text-muted, #6b7280)">${esc(String(r.display ?? r.value))}</text>`;
      }).join('')}
    </svg>`;
}

async function openAdminAnalyticsModal() {
  try {
    showLoading(true);
    const d = await apiCall('/api/admin/analytics/overview');
    const {
      users_daily = [], revenue_daily = [], enrollments_by_type = [],
      consultations_by_status = [], kpis = {}, audit_recent = [],
    } = d;

    const kpi = (label, value, sub) => `
      <div class="kpi-card">
        <p class="kpi-label">${esc(label)}</p>
        <p class="kpi-value">${value}</p>
        ${sub ? `<p class="kpi-sub">${esc(sub)}</p>` : ''}
      </div>`;

    openModal({
      title: 'Admin Analytics',
      className: 'modal-lg',
      body: `
        <div class="kpi-grid">
          ${kpi('Total users',    kpis.total_users ?? '—',      `${kpis.new_users_7d ?? 0} new this week`)}
          ${kpi('Active experts', kpis.active_experts ?? '—',   `${kpis.pending_experts ?? 0} pending`)}
          ${kpi('Revenue (30d)',  fmtCur(kpis.revenue_30d || 0), `${kpis.revenue_change_pct ? (kpis.revenue_change_pct > 0 ? '+' : '') + kpis.revenue_change_pct + '%' : ''}`)}
          ${kpi('Open disputes',  kpis.open_disputes ?? 0,      `${kpis.open_tickets ?? 0} open tickets`)}
        </div>

        <h4 class="panel-title" style="margin-top:24px">New users — last 30 days</h4>
        ${svgSparkline(users_daily.map(d => Number(d.count) || 0))}

        <h4 class="panel-title" style="margin-top:24px">Revenue — last 30 days</h4>
        ${svgSparkline(revenue_daily.map(d => Number(d.amount) || 0),
          { fill: 'var(--success, #16a34a)' })}

        <div class="form-grid" style="margin-top:24px">
          <div>
            <h4 class="panel-title">Enrollments by type</h4>
            ${svgBars(enrollments_by_type.map(r => ({
              label: r.type || '—', value: Number(r.count) || 0,
            })))}
          </div>
          <div>
            <h4 class="panel-title">Consultations by status</h4>
            ${svgBars(consultations_by_status.map(r => ({
              label: (r.status || '—').replace(/_/g, ' '),
              value: Number(r.count) || 0,
              color: r.status === 'cancelled' ? 'var(--danger, #dc2626)'
                   : r.status === 'completed' ? 'var(--success, #16a34a)'
                   : 'var(--brand, #4f46e5)',
            })))}
          </div>
        </div>

        <h4 class="panel-title" style="margin-top:24px">Recent admin activity</h4>
        <ul class="list-stack">
          ${audit_recent.length ? audit_recent.slice(0, 8).map(a => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(a.action)}</span>
                <span class="list-row-sub">${esc(a.actor_name || 'system')} · ${fmtDT(a.created_at)}</span>
              </div>
            </li>
          `).join('') : '<li class="empty-row">No recent activity</li>'}
        </ul>`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-primary" id="analyticsExport">
          <i class="fas fa-download"></i> Export CSV</button>`,
    });

    $('#analyticsExport').onclick = () => {
      const rows = [
        ...users_daily.map(r => ({ metric: 'users_daily', date: r.date, value: r.count })),
        ...revenue_daily.map(r => ({ metric: 'revenue_daily', date: r.date, value: r.amount })),
        ...enrollments_by_type.map(r => ({ metric: 'enrollments', key: r.type, value: r.count })),
        ...consultations_by_status.map(r => ({ metric: 'consultations', key: r.status, value: r.count })),
      ];
      if (!rows.length) return showToast('Nothing to export', 'warning');
      downloadCsv(`admin-analytics-${Date.now()}.csv`, rows);
    };
  } catch (e) {
    showToast(e.message || 'Could not load analytics', 'error');
  } finally {
    showLoading(false);
  }
}

async function openDeliveryMonitorModal() {
  try {
    showLoading(true);
    const d = await apiCall('/api/institution/notifications/delivery?window=7d');
    const { summary = {}, recent = [], failures = [] } = d;

    const channelRow = (label, key) => {
      const c = summary[key] || {};
      const sent = c.sent || 0, delivered = c.delivered || 0, failed = c.failed || 0;
      const pct = sent ? Math.round((delivered / sent) * 100) : 0;
      return `
        <div class="delivery-row">
          <div class="delivery-channel">
            <i class="fas fa-${key === 'email' ? 'envelope' : 'sms'}"></i>
            <strong>${label}</strong>
          </div>
          <div class="delivery-stats">
            <span>${sent} sent</span>
            <span>${delivered} delivered (${pct}%)</span>
            <span class="${failed ? 'delivery-failed' : ''}">${failed} failed</span>
          </div>
        </div>`;
    };

    openModal({
      title: 'Notification Delivery',
      className: 'modal-lg',
      body: `
        <p class="form-hint">Last 7 days.</p>
        ${channelRow('Email', 'email')}
        ${channelRow('SMS', 'sms')}

        <h4 class="panel-title" style="margin-top:24px">Recent sends</h4>
        <ul class="list-stack">
          ${recent.length ? recent.slice(0, 20).map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.subject || r.preview || '')}</span>
                <span class="list-row-sub">
                  ${esc(r.recipient || '')} · ${esc(r.channel || '')} · ${fmtDT(r.sent_at)}
                </span>
              </div>
              <span class="${statusClass(r.status)}">${esc(r.status)}</span>
            </li>
          `).join('') : '<li class="empty-row">No sends recorded</li>'}
        </ul>

        ${failures.length ? `
          <h4 class="panel-title" style="margin-top:24px">Failures</h4>
          <ul class="list-stack">
            ${failures.slice(0, 20).map(f => `
              <li class="list-row">
                <div class="list-row-main">
                  <span class="list-row-title">${esc(f.recipient || '')}</span>
                  <span class="list-row-sub">${esc(f.reason || 'Unknown error')} · ${fmtDT(f.failed_at)}</span>
                </div>
                <button class="btn btn-warning btn-xs" data-retry-notify="${f.id}">Retry</button>
              </li>
            `).join('')}
          </ul>` : ''}`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });

    $$('[data-retry-notify]').forEach(b => b.onclick = async () => {
      setBusy(b, true, 'Retrying…');
      try {
        await apiCall(`/api/institution/notifications/${b.dataset.retryNotify}/retry`, 'POST');
        showToast('Retry queued', 'success');
        closeModal();
        openDeliveryMonitorModal();
      } catch (e) {
        showToast(e.message, 'error');
        setBusy(b, false);
      }
    });
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    showLoading(false);
  }
}

async function __smokeTest() {
  const results = [];
  const t = async (name, fn) => {
    try { await fn(); results.push({ name, ok: true }); }
    catch (e) { results.push({ name, ok: false, error: e.message }); }
  };

  const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

  await t('openEnrollModal shows summary', async () => {
    const course = (S.courses || [])[0];
    if (!course) return; // skip if no fixtures
    openEnrollModal(course.id);
    expect(document.querySelector('#enTotal'), 'Total element missing');
    expect(document.querySelector('#enPayment'), 'Payment selector missing');
    closeModal();
  });

  await t('openBookSlotWithExpert disables Pay until a slot is chosen', async () => {
    const expert = (S.experts || [])[0];
    if (!expert) return;
    await openBookSlotWithExpert(expert.id, expert.name);
    const btn = document.querySelector('#bsSave');
    expect(btn && btn.disabled, 'Pay button should start disabled');
    const slot = document.querySelector('.slot-option');
    if (slot) {
      slot.click();
      expect(!document.querySelector('#bsSave').disabled,
        'Pay button should enable after slot selection');
    }
    closeModal();
  });

  await t('safeUrl blocks javascript: scheme', async () => {
    expect(safeUrl('javascript:alert(1)') === '', 'javascript: must be rejected');
    expect(safeUrl('https://example.com') !== '', 'https should pass');
  });

  await t('setBusy restores original label', async () => {
    const b = document.createElement('button');
    b.innerHTML = 'Save';
    document.body.appendChild(b);
    setBusy(b, true, 'Saving…');
    expect(b.disabled, 'disabled while busy');
    setBusy(b, false);
    expect(!b.disabled, 'enabled after');
    expect(b.innerHTML === 'Save', 'label restored');
    b.remove();
  });

  await t('openModal traps focus and Esc closes', async () => {
    openModal({ title: 'T', body: '<input id="x" />', footer: '<button>OK</button>' });
    expect(document.querySelector('.modal-overlay'), 'overlay not created');
    const evt = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.querySelector('.modal-overlay').dispatchEvent(evt);
    await new Promise(r => setTimeout(r, 200));
    expect(!document.querySelector('.modal-overlay'), 'overlay not closed');
  });

  console.table(results);
  const failed = results.filter(r => !r.ok).length;
  console[failed ? 'error' : 'log'](
    `${results.length - failed}/${results.length} passed`
  );
  return results;
}

/* ---------- Compatibility helpers for migrated modal handlers ---------- */
function submitFormModal(buttonSelector, rules, onSuccess, url, method, payloadFactory) {
  const btn = typeof buttonSelector === 'string' ? $(buttonSelector) : buttonSelector;
  const validate = () => {
    for (const [selector, rule] of Object.entries(rules || {})) {
      const el = $(selector);
      const value = el && typeof el.value === 'string' ? el.value.trim() : (el ? el.value : '');
      if (rule && rule.required && (value === '' || value == null)) {
        showToast(`${rule.label || 'This field'} is required`, 'error');
        if (el && typeof el.focus === 'function') el.focus();
        return false;
      }
      if (rule && rule.email && value && !validEmail(String(value))) {
        showToast(`${rule.label || 'Email'} is invalid`, 'error');
        if (el && typeof el.focus === 'function') el.focus();
        return false;
      }
    }
    return true;
  };
  if (!validate()) return;
  if (btn && btn.dataset && btn.dataset._submitBusy === '1') return;
  if (btn && btn.dataset) btn.dataset._submitBusy = '1';
  setBusy(btn, true, 'Saving…');
  const run = async () => {
    try {
      if (url) await apiCall(url, method || 'POST', typeof payloadFactory === 'function' ? payloadFactory() : {});
      if (typeof onSuccess === 'function') await onSuccess();
    } catch (e) {
      showToast((e && e.message) || 'Could not save changes', 'error');
    } finally {
      setBusy(btn, false);
      if (btn && btn.dataset) delete btn.dataset._submitBusy;
    }
  };
  return run();
}

if (typeof app === 'undefined') {
  var app = { emit: function (eventName, detail) {
    try { document.dispatchEvent(new CustomEvent('experthub:' + eventName, { detail })); } catch (_) {}
  } };
}

