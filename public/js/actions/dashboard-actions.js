/* ============================================================
   actions/dashboard-actions.js — Main handleAction dispatcher
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const Nav = EH.NavigationActions || {};
  const Course = EH.CourseActions || {};
  const Cons = EH.ConsultationActions || {};
  const Pay = EH.PaymentActions || {};

  async function handleAction(action, id, el) {
    switch (action) {
      /* -------- Common -------- */
      case 'switch-tab': return Nav.switchTab(el?.dataset?.tab || id, el);
      case 'refresh-all': return Nav.refreshAll();
      case 'paginate': return Nav.paginate(el);
      case 'clear-selection': return Nav.clearSelection(el);
      case 'export-dashboard': return Nav.exportDashboard();
      case 'export-users': return Nav.exportUsers();
      case 'help':
        EH.Toast.info('Support: support@experthub.com');
        return;

      /* -------- Admin users -------- */
      case 'approve-user':
        await EH.API.put(`/api/admin/users/${id}/approve`);
        await EH.Data.reload.users();
        EH.Toast.success('User approved');
        return Nav.switchTab('users');
      case 'suspend-user':
        await EH.API.put(`/api/admin/users/${id}/suspend`);
        await EH.Data.reload.users();
        EH.Toast.success('User suspended');
        return Nav.switchTab('users');
      case 'reject-user': {
        const reason = prompt('Reason for rejection?') || '';
        await EH.API.put(`/api/admin/users/${id}/reject`, { reason });
        await EH.Data.reload.users();
        EH.Toast.warning('User rejected');
        return Nav.switchTab('users');
      }
      case 'delete-user': {
        if (!await EH.Modal.confirm('Delete this user permanently?', { danger: true })) return;
        await EH.API.del(`/api/admin/users/${id}`);
        await EH.Data.reload.users();
        EH.Toast.success('User deleted');
        return Nav.switchTab('users');
      }
      case 'bulk-approve-users': {
        const set = EH.state.selectedRows.users;
        if (!await EH.Modal.confirm(`Approve ${set.size} user(s)?`)) return;
        EH.Loading.show();
        for (const uid of set) {
          await EH.API.put(`/api/admin/users/${uid}/approve`).catch(() => {});
        }
        set.clear();
        await EH.Data.reload.users();
        EH.Loading.hide();
        EH.Toast.success('Users approved');
        return Nav.switchTab('users');
      }
      case 'bulk-suspend-users': {
        const set = EH.state.selectedRows.users;
        if (!await EH.Modal.confirm(`Suspend ${set.size} user(s)?`)) return;
        EH.Loading.show();
        for (const uid of set) {
          await EH.API.put(`/api/admin/users/${uid}/suspend`).catch(() => {});
        }
        set.clear();
        await EH.Data.reload.users();
        EH.Loading.hide();
        EH.Toast.warning('Users suspended');
        return Nav.switchTab('users');
      }
      case 'edit-user': {
        const u = EH.state.users.find(x => String(x.id) === String(id));
        if (!u) return;
        const m = EH.Modal.open({
          title: `Edit ${EH.Fmt.esc(u.name)}`,
          body: `
            <label class="form-group"><span class="form-label">Name</span>
              <input id="euName" class="form-input" value="${EH.Fmt.esc(u.name || '')}" /></label>
            <label class="form-group">
              <span class="form-label">Role</span>
              <select id="euRole" class="form-select">
                ${['learner','expert','institution','admin'].map(r => `
                  <option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
              </select>
            </label>
            <label class="form-group">
              <span class="form-label">Status</span>
              <select id="euStatus" class="form-select">
                ${['active','pending','suspended','rejected'].map(s => `
                  <option value="${s}" ${u.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </label>`,
          footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
                   <button id="euSave" class="btn btn-primary">Save</button>`,
        });
        m.$('#euSave').onclick = async () => {
          await EH.API.put(`/api/admin/users/${id}`, {
            name: m.$('#euName').value,
            role: m.$('#euRole').value,
            status: m.$('#euStatus').value,
          });
          EH.Modal.close();
          await EH.Data.reload.users();
          EH.Toast.success('User updated');
          Nav.switchTab('users');
        };
        return;
      }

      /* -------- Admin experts -------- */
      case 'show-create-expert': document.getElementById('createExpertPanel')?.classList.remove('hidden'); return;
      case 'hide-create-expert': document.getElementById('createExpertPanel')?.classList.add('hidden'); return;
      case 'submit-create-expert': {
        const name = document.getElementById('newExpertName').value;
        const email = document.getElementById('newExpertEmail').value;
        if (!name || !email) return EH.Toast.error('Name and email required');
        EH.Loading.show();
        const d = await EH.API.post('/api/admin/experts/create', {
          name, email,
          specialization: document.getElementById('newExpertSpec').value,
          hourly_rate: Number(document.getElementById('newExpertRate').value || 0),
          bio: document.getElementById('newExpertBio').value,
          phone: document.getElementById('newExpertPhone').value,
        });
        await EH.Data.loadAll();
        EH.Loading.hide();
        EH.Toast.success(`Expert created. Temp password: ${d.temp_password}`, 8000);
        return Nav.switchTab('experts');
      }

      /* -------- Consultations -------- */
      case 'view-consultation': return Cons.viewConsultation(id);
      case 'assign-consultation': {
        const experts = EH.state.experts || [];
        const m = EH.Modal.open({
          title: 'Assign Expert',
          body: `
            <label class="form-group"><span class="form-label">Expert</span>
              <select id="assignExp" class="form-select">
                ${experts.map(e => `<option value="${e.id}">${EH.Fmt.esc(e.name)} (${EH.Fmt.esc(e.specialization || '')})</option>`).join('')}
              </select></label>`,
          footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
                   <button id="assignSave" class="btn btn-primary">Assign</button>`,
        });
        m.$('#assignSave').onclick = async () => {
          await EH.API.put(`/api/common/consultations/${id}/assign`, {
            expert_id: Number(m.$('#assignExp').value),
          });
          EH.Modal.close();
          await EH.Data.reload.consultations();
          EH.Toast.success('Expert assigned');
          Nav.switchTab('consultations');
        };
        return;
      }
      case 'consult-start':
        await EH.API.put(`/api/common/consultations/${id}/status`, { status: 'in_progress' });
        await EH.Data.reload.consultations();
        return Nav.switchTab('consultations');
      case 'consult-complete':
        await EH.API.put(`/api/common/consultations/${id}/status`, { status: 'completed' });
        await EH.Data.reload.consultations();
        EH.Toast.success('Consultation completed');
        return Nav.switchTab('consultations');
      case 'open-chat': return EH.ChatModal.open(Number(id));
      case 'video-call': return Cons.openVideoCall(id);
      case 'open-video': return Cons.openVideoCall(EH.state.currentChatId);
      case 'send-chat': {
        const input = document.getElementById('chat-input');
        if (input) await EH.ChatModal.send(EH.state.currentChatId, input.value);
        return;
      }

      /* -------- Admin events -------- */
      case 'create-event': return EH.EventModal.open();
      case 'edit-event':   return EH.EventModal.open(id);
      case 'delete-event':
        if (!await EH.Modal.confirm('Delete this event?')) return;
        await EH.API.del(`/api/admin/events/${id}`);
        await EH.Data.loadAll();
        EH.Toast.success('Event deleted');
        return Nav.switchTab('events');

      /* -------- Institutions -------- */
      case 'create-institution': return EH.InstitutionModal.open();
      case 'edit-institution':   return EH.InstitutionModal.open(Number(id));
      case 'approve-institution':
        await EH.API.put(`/api/admin/institutions/${id}/approve`);
        await EH.Data.reload.institutions();
        EH.Toast.success('Institution verified');
        return Nav.switchTab('institutions');
      case 'reject-institution': {
        const reason = prompt('Reason for rejection?') || '';
        await EH.API.put(`/api/admin/institutions/${id}/reject`, { reason });
        await EH.Data.reload.institutions();
        EH.Toast.warning('Institution rejected');
        return Nav.switchTab('institutions');
      }
      case 'suspend-institution':
        await EH.API.put(`/api/admin/institutions/${id}/suspend`);
        await EH.Data.reload.institutions();
        return Nav.switchTab('institutions');
      case 'delete-institution':
        if (!await EH.Modal.confirm('Delete this institution?', { danger: true })) return;
        await EH.API.del(`/api/admin/institutions/${id}`);
        await EH.Data.reload.institutions();
        EH.Toast.success('Institution deleted');
        return Nav.switchTab('institutions');

      /* -------- Payouts -------- */
      case 'payout-approve': return Pay.payoutAction(id, 'approved');
      case 'payout-process': return Pay.payoutAction(id, 'processing');
      case 'payout-paid':    return Pay.payoutAction(id, 'paid');
      case 'payout-reject': {
        const reason = prompt('Rejection reason?') || '';
        return Pay.payoutAction(id, 'rejected', { reason });
      }

      /* -------- Coupons -------- */
      case 'create-coupon': return EH.CouponModal.open();
      case 'toggle-coupon':
        await EH.API.put(`/api/admin/coupons/${id}/toggle`);
        await EH.Data.loadAll();
        return Nav.switchTab('coupons');
      case 'delete-coupon':
        if (!await EH.Modal.confirm('Delete this coupon?')) return;
        await EH.API.del(`/api/admin/coupons/${id}`);
        await EH.Data.loadAll();
        return Nav.switchTab('coupons');

      /* -------- Claims / Tickets / Reviews -------- */
      case 'claim-investigate':
        await EH.API.put(`/api/admin/claims/${id}`, { status: 'investigating' });
        return EH.Data.loadAll().then(() => Nav.switchTab('claims'));
      case 'claim-resolve': {
        const resolution = prompt('Resolution details?') || '';
        await EH.API.put(`/api/admin/claims/${id}`, { status: 'resolved', resolution });
        await EH.Data.loadAll();
        EH.Toast.success('Claim resolved');
        return Nav.switchTab('claims');
      }
      case 'claim-reject': {
        const resolution = prompt('Rejection reason?') || '';
        await EH.API.put(`/api/admin/claims/${id}`, { status: 'rejected', resolution });
        await EH.Data.loadAll();
        EH.Toast.warning('Claim rejected');
        return Nav.switchTab('claims');
      }
      case 'ticket-view': return EH.TicketModal?.open?.(id);
      case 'ticket-resolve':
        await EH.API.put(`/api/admin/tickets/${id}`, { status: 'resolved' });
        await EH.Data.loadAll();
        EH.Toast.success('Ticket resolved');
        return Nav.switchTab('tickets');
      case 'review-publish':
        await EH.API.put(`/api/admin/reviews/${id}`, { status: 'published' });
        await EH.Data.reload.reviews();
        return Nav.switchTab('reviews');
      case 'review-hide':
        await EH.API.put(`/api/admin/reviews/${id}`, { status: 'hidden' });
        await EH.Data.reload.reviews();
        return Nav.switchTab('reviews');

      /* -------- Broadcast -------- */
      case 'send-broadcast': {
        const title = document.getElementById('broadcastTitle').value;
        const message = document.getElementById('broadcastMessage').value;
        const audience = document.getElementById('broadcastAudience').value;
        if (!title || !message) return EH.Toast.error('Fill title and message');
        EH.Loading.show();
        const d = await EH.API.post('/api/admin/notifications/broadcast', { title, message, audience });
        EH.Loading.hide();
        return EH.Toast.success(`Broadcast sent to ${d.sent} users`);
      }

      /* -------- Settings -------- */
      case 'save-settings': {
        const settings = {
          platform_name: document.getElementById('setPlatformName').value,
          support_email: document.getElementById('setSupportEmail').value,
          default_currency: document.getElementById('setCurrency').value,
          default_timezone: document.getElementById('setTimezone').value,
          commission_consultation: document.getElementById('setCommCons').value,
          commission_course: document.getElementById('setCommCourse').value,
          withdrawal_hold_days: document.getElementById('setHold').value,
          min_payout: document.getElementById('setMinPayout').value,
        };
        await EH.API.put('/api/admin/settings', { settings });
        return EH.Toast.success('Settings saved');
      }

      /* -------- Learner -------- */
      case 'enroll-modal': return Course.openEnrollModal(id);
      case 'update-progress': return Course.openProgressModal(id, Number(el?.dataset?.current || 0));
      case 'new-consultation': return Cons.newConsultation();
      case 'book-expert': return Cons.bookExpert(id, el?.dataset?.name);
      case 'view-expert-profile': return EH.ExpertProfileModal?.open?.(Number(id));
      case 'toggle-wishlist': {
        try {
          await EH.API.post('/api/user/wishlist/toggle', { course_id: Number(id) });
          const d = await EH.API.get('/api/user/wishlist');
          EH.state.wishlist = d.items || [];
          Nav.switchTab(EH.state.activeTab);
          EH.Toast.success('Wishlist updated');
        } catch (e) { EH.Toast.error(e.message); }
        return;
      }
      case 'register-event':
        await EH.API.post(`/api/common/events/${id}/register`);
        await EH.Data.loadAll();
        EH.Toast.success('Registered for event');
        return Nav.switchTab('events');
      case 'topup-wallet': return Pay.topupWallet();
      case 'change-intent': return openIntentModal();
      case 'review-expert': return EH.ReviewModal?.open?.(id, Number(el?.dataset?.expert));
      case 'file-claim': return EH.ClaimModal?.open?.(id);
      case 'new-ticket': return EH.TicketModal?.openNew?.();

      /* -------- Expert -------- */
      case 'save-availability': {
        const schedule = [];
        for (let i = 0; i < 7; i++) {
          const s = document.getElementById(`start-${i}`)?.value;
          const e = document.getElementById(`end-${i}`)?.value;
          if (s && e) schedule.push({ day: i, start: s, end: e });
        }
        await EH.API.put('/api/expert/availability', { schedule });
        return EH.Toast.success('Availability saved');
      }
      case 'request-time-off': {
        const s = document.getElementById('timeOffStart').value;
        const e = document.getElementById('timeOffEnd').value;
        const r = document.getElementById('timeOffReason').value;
        if (!s || !e) return EH.Toast.error('Select dates');
        await EH.API.post('/api/expert/time-off', { start_date: s, end_date: e, reason: r });
        await EH.Data.loadAll();
        EH.Toast.success('Time off requested');
        return Nav.switchTab('availability');
      }
      case 'request-withdrawal': return Pay.requestWithdrawal();
      case 'reply-review': {
        const reply = prompt('Your reply:') || '';
        if (!reply.trim()) return;
        await EH.API.post(`/api/expert/reviews/${id}/reply`, { reply });
        await EH.Data.reload.reviews();
        EH.Toast.success('Reply posted');
        return Nav.switchTab('reviews');
      }
      case 'update-expert-profile':
        await EH.API.put('/api/expert/profile', {
          specialization: document.getElementById('profileSpecialization').value,
          hourly_rate: Number(document.getElementById('profileRate').value || 0),
          bio: document.getElementById('profileBio').value,
        });
        return EH.Toast.success('Profile updated');
      case 'view-public-profile':
        return EH.Toast.info(`Public profile: /#/expert/${EH.state.currentUser?.id || 'me'}`);
      case 'add-portfolio-item': return EH.PortfolioModal?.open?.();
      case 'edit-portfolio-item': return EH.PortfolioModal?.open?.(Number(id));
      case 'delete-portfolio-item':
        if (!await EH.Modal.confirm('Delete this portfolio item?')) return;
        await EH.API.del(`/api/expert/portfolio/${id}`);
        await EH.Data.loadAll();
        EH.Toast.success('Item deleted');
        return Nav.switchTab('portfolio');
      case 'create-course-modal': return EH.CourseModal?.open?.();
      case 'edit-course': return EH.Toast.info('Edit course opened in demo');
      case 'view-course-analytics': return EH.Toast.info('Analytics opened in demo');

      /* -------- Profile generic -------- */
      case 'update-user-profile':
        await EH.API.put('/api/user/profile', {
          name: document.getElementById('profileName')?.value,
          phone: document.getElementById('profilePhone')?.value,
          timezone: document.getElementById('profileTimezone')?.value,
          intent: document.getElementById('profileIntent')?.value || EH.state.userIntent,
        });
        try {
          const me = await EH.Auth.me();
          EH.state.currentUser = me;
        } catch (_) {}
        return EH.Toast.success('Profile updated');
      case 'change-password': {
        const oldp = document.getElementById('cpOld').value;
        const newp = document.getElementById('cpNew').value;
        if (!oldp || newp.length < 8) return EH.Toast.error('New password must be 8+ characters');
        await EH.API.put('/api/auth/password', { old_password: oldp, new_password: newp });
        document.getElementById('cpOld').value = '';
        document.getElementById('cpNew').value = '';
        return EH.Toast.success('Password updated');
      }

      /* -------- Institution -------- */
      case 'create-programme':  return EH.ProgrammeModal?.open?.();
      case 'edit-programme':    return EH.ProgrammeModal?.open?.(Number(id));
      case 'view-programme':    return EH.ProgrammeModal?.view?.(Number(id));
      case 'programme-curriculum': return EH.CurriculumModal?.open?.(Number(id));
      case 'delete-programme':
        if (!await EH.Modal.confirm('Delete this programme?')) return;
        await EH.API.del(`/api/institution/programmes/${id}`);
        await EH.Data.reload.programmes();
        EH.Toast.success('Programme deleted');
        return Nav.switchTab('programmes');
      case 'create-cohort': return EH.CohortModal?.open?.();
      case 'edit-cohort':   return EH.CohortModal?.open?.(Number(id));
      case 'view-cohort':   return EH.CohortModal?.view?.(Number(id));
      case 'delete-cohort':
        if (!await EH.Modal.confirm('Delete this cohort?')) return;
        await EH.API.del(`/api/institution/cohorts/${id}`);
        await EH.Data.reload.cohorts();
        EH.Toast.success('Cohort deleted');
        return Nav.switchTab('cohorts');
      case 'schedule-session':  return EH.SessionModal?.open?.();
      case 'edit-session':      return EH.SessionModal?.open?.(Number(id));
      case 'mark-attendance':   return EH.SessionModal?.attendance?.(Number(id));
      case 'view-calendar':     return EH.SessionModal?.calendar?.();
      case 'issue-certificate': return EH.CertificateModal?.issue?.();
      case 'create-question':   return EH.QuestionModal?.open?.();
      case 'edit-question':     return EH.QuestionModal?.open?.(Number(id));
      case 'create-project':    return EH.ProjectModal?.open?.();
      case 'create-learning-path': return EH.LearningPathModal?.open?.();
      case 'edit-learning-path':   return EH.LearningPathModal?.open?.(Number(id));
      case 'create-compliance-rule': return EH.ComplianceModal?.open?.();
      case 'create-org-unit':   return EH.OrgUnitModal?.open?.();
      case 'edit-org-unit':     return EH.OrgUnitModal?.open?.(Number(id));
      case 'save-branding':     return EH.BrandingActions?.save?.();
      case 'save-institution-settings': return EH.BrandingActions?.saveSettings?.();

      /* -------- Reports -------- */
      case 'export-institution-report': {
        const rows = (EH.state.trainees || []).map(t => ({
          name: t.name, email: t.email, department: t.department || '',
          programme: t.programme_title || '', status: t.lifecycle_status || '',
          progress: t.progress || 0,
        }));
        if (!rows.length) return EH.Toast.warning('No data to export');
        return global.downloadCsv('institution-report.csv', rows);
      }

      default:
        EH.Logger?.debug?.('Unhandled action', action);
        return;
    }
  }

  function openIntentModal() {
    const m = EH.Modal.open({
      title: 'Choose your mode',
      body: `
        <p class="form-hint">This controls what appears on your dashboard. You can change it anytime.</p>
        <label class="form-group"><span class="form-label">Mode</span>
          <select id="intentSel" class="form-select">
            <option value="both" ${EH.state.userIntent === 'both' ? 'selected' : ''}>Both - Learning and Consulting</option>
            <option value="learn" ${EH.state.userIntent === 'learn' ? 'selected' : ''}>Learning only</option>
            <option value="consult" ${EH.state.userIntent === 'consult' ? 'selected' : ''}>Consulting only</option>
          </select></label>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
               <button id="intentSave" class="btn btn-primary">Save</button>`,
    });
    m.$('#intentSave').onclick = async () => {
      EH.state.userIntent = m.$('#intentSel').value;
      try { await EH.API.put('/api/user/preferences', { intent: EH.state.userIntent }); } catch (_) {}
      EH.Modal.close();
      Nav.switchTab(EH.state.activeTab);
      EH.Toast.success('Mode updated');
    };
  }

  EH.handleAction = handleAction;
})(window);
