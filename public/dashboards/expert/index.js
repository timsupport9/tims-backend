/* ============================================================
   dashboards/expert/index.js
   Expert Dashboard — Main entry, navigation, router, actions.
   ============================================================ */

const EXPERT_TABS = [
  'overview','consultations','consultation-room','calendar','availability',
  'services','clients','crm','courses','course-builder','course-analytics',
  'events','portfolio','questions','proposals','projects','mentorship',
  'development','team','earnings','withdrawals','reviews','analytics','profile',
];

function renderExpertDashboard() {
  if (!currentUser) return renderLogin();

  const mine      = S.consultations.filter(c => c.expert_id === currentUser.id);
  const activeCons = mine.filter(c =>
    ['pending_expert_confirmation','confirmed','in_grace','in_session','assigned','in_progress']
      .includes(c.status)).length;
  const pendingProps = (S.expertProposals || []).filter(p => p.status === 'sent').length;
  const openTasks    = (S.expertTasks || []).filter(t => t.status !== 'completed').length;
  const unreadClients = (S.expertClients || []).reduce((n, c) => n + (c.unread_count || 0), 0);

  const nav = [
    sidebarItem('overview','Overview','fa-chart-line'),
    sidebarItem('consultations','Consultations','fa-comments', activeCons),
    sidebarItem('consultation-room','Consultation Room','fa-video'),
    sidebarItem('calendar','Calendar','fa-calendar-day'),
    sidebarItem('availability','Availability','fa-clock'),
    sidebarItem('services','Services & Packages','fa-layer-group'),
    sidebarItem('clients','Clients','fa-address-book', unreadClients),
    sidebarItem('crm','CRM','fa-notes-medical'),
    sidebarItem('courses','My Courses','fa-book'),
    sidebarItem('course-builder','Course Builder','fa-pen-ruler'),
    sidebarItem('course-analytics','Course Analytics','fa-chart-simple'),
    sidebarItem('events','My Events','fa-calendar-alt'),
    sidebarItem('portfolio','Portfolio','fa-briefcase'),
    sidebarItem('questions','Public Q&A','fa-question-circle'),
    sidebarItem('proposals','Proposals & Invoices','fa-file-invoice-dollar', pendingProps),
    sidebarItem('projects','Projects & Tasks','fa-list-check', openTasks),
    sidebarItem('mentorship','Mentorship','fa-hand-holding-heart'),
    sidebarItem('development','Professional Development','fa-graduation-cap'),
    sidebarItem('team','Team Workspace','fa-users-gear'),
    sidebarItem('earnings','Earnings','fa-dollar-sign'),
    sidebarItem('withdrawals','Withdrawals','fa-money-bill-transfer'),
    sidebarItem('reviews','Reviews','fa-star'),
    sidebarItem('analytics','Business Intelligence','fa-chart-pie'),
    sidebarItem('profile','Profile','fa-user'),
  ].join('');

  shell({
    roleClass: 'role-expert',
    brandIcon: 'fa-user-tie',
    brandTitle: 'Expert Panel',
    brandSubtitle: 'ExpertHub',
    nav,
    roleLabel: 'Expert Panel',
    content: renderExpertContent(),
  });

  attachExpertEvents();
  renderExpertCharts();
}

function renderExpertContent() {
  const map = {
    overview:          renderExpertOverview,
    consultations:     renderExpertConsultations,
    'consultation-room': renderExpertConsultationRoom,
    calendar:          renderExpertCalendar,
    availability:      renderExpertAvailability,
    services:          renderExpertServices,
    clients:           renderExpertClients,
    crm:               renderExpertCRM,
    courses:           renderExpertCourses,
    'course-builder':  renderExpertCourseBuilder,
    'course-analytics':renderExpertCourseAnalytics,
    events:            renderExpertEvents,
    portfolio:         renderExpertPortfolio,
    questions:         renderExpertQuestions,
    proposals:         renderExpertProposals,
    projects:          renderExpertProjects,
    mentorship:        renderExpertMentorship,
    development:       renderExpertDevelopment,
    team:              renderExpertTeam,
    earnings:          renderExpertEarnings,
    withdrawals:       renderExpertWithdrawals,
    reviews:           renderExpertReviews,
    analytics:         renderExpertAnalytics,
    profile:           renderExpertProfile,
  };
  const fn = map[activeTab] || renderExpertOverview;
  return fn();
}

/* ---------- Delegated expert action handler ---------- */
let __expertClickHandler = null;

function attachExpertEvents() {
  if (typeof attachRoleEvents === 'function') attachRoleEvents();

  if (__expertClickHandler) document.removeEventListener('click', __expertClickHandler);
  __expertClickHandler = async (e) => {
    const trigger = e.target.closest('[data-expert-action]');
    if (!trigger) return;
    const action = trigger.dataset.expertAction;
    const id     = trigger.dataset.id;
    try {
      await handleExpertAction(action, id, trigger, e);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Action failed', 'error');
    }
  };
  document.addEventListener('click', __expertClickHandler);

  document.querySelectorAll('[data-expert-consult-filter]').forEach(el => {
    el.onchange = () => rerenderExpertContent();
  });
  document.querySelectorAll('[data-expert-tab]').forEach(btn => {
    btn.onclick = () => {
      activeTab = btn.dataset.expertTab;
      rerenderExpertContent();
    };
  });

  const search = document.querySelector('[data-expert-search]');
  if (search) search.oninput = debounce(() => rerenderExpertContent(), 250);
}

function rerenderExpertContent() {
  const el = document.querySelector('#role-content');
  if (!el) return;
  el.innerHTML = renderExpertContent();
  if (typeof attachRoleEvents === 'function') attachRoleEvents();
  renderExpertCharts();
  attachExpertEvents();
}

/* ---------- Chart stubs (real data via Chart.js if loaded) ---------- */
function renderExpertCharts() {
  if (!window.Chart) return;
  const earnings = document.getElementById('expertEarningsChart');
  if (earnings && !earnings.dataset.rendered) {
    new Chart(earnings, {
      type: 'line',
      data: {
        labels: ['W1','W2','W3','W4','W5','W6','W7','W8'],
        datasets: [{
          label: 'Earnings',
          data: [120, 180, 140, 260, 310, 280, 420, 380],
          borderColor: '#1e3a8a',
          backgroundColor: 'rgba(30,58,138,.12)',
          tension: 0.3,
          fill: true,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    earnings.dataset.rendered = '1';
  }

  const util = document.getElementById('expertUtilChart');
  if (util && !util.dataset.rendered) {
    new Chart(util, {
      type: 'doughnut',
      data: {
        labels: ['Completed','In Progress','Scheduled','Free'],
        datasets: [{
          data: [24, 6, 10, 40],
          backgroundColor: ['#059669','#1e3a8a','#f59e0b','#e5e7eb'],
        }],
      },
      options: { responsive: true },
    });
    util.dataset.rendered = '1';
  }

  const demand = document.getElementById('expertDemandChart');
  if (demand && !demand.dataset.rendered) {
    new Chart(demand, {
      type: 'bar',
      data: {
        labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        datasets: [{
          label: 'Bookings',
          data: [4, 6, 3, 7, 9, 2, 1],
          backgroundColor: '#7c3aed',
          borderRadius: 6,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    demand.dataset.rendered = '1';
  }

  const completion = document.getElementById('expertCourseCompletionChart');
  if (completion && !completion.dataset.rendered) {
    new Chart(completion, {
      type: 'bar',
      data: {
        labels: ['Course A','Course B','Course C'],
        datasets: [{
          label: 'Completion %',
          data: [72, 64, 88],
          backgroundColor: '#059669',
          borderRadius: 6,
        }],
      },
      options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } },
    });
    completion.dataset.rendered = '1';
  }
}

/* ---------- Centralised action handler for all expert tabs ---------- */
async function handleExpertAction(action, id, el) {
  const expertId = currentUser?.id;

  switch (action) {
    /* ---------- Consultations ---------- */
    case 'confirm-consultation':
      await apiCall(`/api/expert/consultations/${id}/confirm`, 'PUT');
      await reloadConsultations();
      showToast('Consultation confirmed', 'success');
      return rerenderExpertContent();

    case 'decline-consultation': {
      const reason = prompt('Reason for declining?') || 'No reason provided';
      await apiCall(`/api/expert/consultations/${id}/decline`, 'PUT', { reason });
      await reloadConsultations();
      showToast('Consultation declined', 'warning');
      return rerenderExpertContent();
    }

    case 'start-consultation':
      await apiCall(`/api/expert/consultations/${id}/start`, 'PUT');
      await reloadConsultations();
      activeTab = 'consultation-room';
      S.__activeRoom = Number(id);
      return rerenderExpertContent();

    case 'end-consultation':
      await apiCall(`/api/expert/consultations/${id}/end`, 'PUT');
      await reloadConsultations();
      showToast('Session ended', 'success');
      return rerenderExpertContent();

    case 'reschedule-consultation':
      return openExpertRescheduleModal(Number(id));

    case 'cancel-consultation': {
      const reason = prompt('Cancellation reason?') || '';
      await apiCall(`/api/common/consultations/${id}/cancel`, 'PUT', { reason });
      await reloadConsultations();
      showToast('Consultation cancelled', 'warning');
      return rerenderExpertContent();
    }

    case 'consultation-detail': {
      const c = S.consultations.find(x => String(x.id) === id);
      if (!c) return;
      openModal({
        title: c.title || 'Consultation',
        className: 'modal-lg',
        body: `
          <p><strong>Status:</strong> <span class="${consultationStatusClass(c.status)}">${esc(c.status?.replace(/_/g,' '))}</span></p>
          <p><strong>Client:</strong> ${esc(c.client_name || 'Client')} &lt;${esc(c.client_email || '')}&gt;</p>
          <p><strong>Type:</strong> ${esc(c.consultation_type || '')}</p>
          <p><strong>Duration:</strong> ${c.duration_minutes || 30} min</p>
          <p><strong>Price:</strong> ${fmtCur(c.price || 0)}</p>
          <p><strong>Scheduled:</strong> ${c.scheduled_at ? fmtInTz(c.scheduled_at, currentUser?.timezone || 'UTC') : '—'}</p>
          <p><strong>Description:</strong><br>${esc(c.description || '')}</p>
          <p><strong>Reschedules:</strong> ${c.reschedule_count || 0} / ${CONFIG.MAX_RESCHEDULES}</p>
        `,
        footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
      });
      return;
    }

    case 'manage-notes':
      return openSessionNotesModal(Number(id));

    case 'follow-up':
      return openFollowUpModal(Number(id));

    /* ---------- Consultation Room ---------- */
    case 'room-join':
      return joinConsultationRoom(Number(id));

    case 'room-leave':
      return leaveConsultationRoom();

    case 'room-end':
      return endConsultationRoom();

    case 'room-toggle-mic': {
      const el2 = document.getElementById('room-mic-status');
      if (el2) el2.textContent = el2.textContent === 'Mic on' ? 'Mic muted' : 'Mic on';
      return;
    }

    case 'room-toggle-camera': {
      const el2 = document.getElementById('room-camera-status');
      if (el2) el2.textContent = el2.textContent === 'Camera on' ? 'Camera off' : 'Camera on';
      return;
    }

    case 'room-share-screen':
      return showToast('Screen sharing requires the desktop app', 'info');

    case 'room-end-session':
      return endConsultationRoom();

    /* ---------- Availability ---------- */
    case 'save-availability': {
      const schedule = [];
      for (let i = 0; i < 7; i++) {
        const s  = document.getElementById(`avail-start-${i}`)?.value;
        const e  = document.getElementById(`avail-end-${i}`)?.value;
        const on = document.getElementById(`avail-on-${i}`)?.checked;
        if (on && s && e && s < e) {
          schedule.push({ day: i, start: s, end: e });
        }
      }
      if (!schedule.length) return showToast('Select at least one day', 'error');
      await apiCall('/api/expert/availability', 'PUT', { schedule });
      showToast('Availability saved', 'success');
      return;
    }

    case 'add-time-off':
      return openTimeOffModal();

    case 'cancel-time-off':
      await apiCall(`/api/expert/time-off/${id}`, 'DELETE');
      await loadAllData();
      showToast('Time off request cancelled', 'success');
      return rerenderExpertContent();

    case 'save-buffer': {
      const buffer = Number(document.getElementById('availBuffer')?.value || 15);
      const advance = Number(document.getElementById('availAdvance')?.value || 24);
      await apiCall('/api/expert/availability/buffers', 'PUT', {
        buffer_minutes: buffer,
        advance_hours: advance,
      });
      return showToast('Booking rules saved', 'success');
    }

    /* ---------- Services / Tiers ---------- */
    case 'edit-services':
      return openEditServicesModal();

    case 'create-service':
      return openEditServicesModal();

    case 'delete-service':
      await apiCall(`/api/expert/services/${id}`, 'DELETE');
      await loadAllData();
      showToast('Service removed', 'success');
      return rerenderExpertContent();

    case 'toggle-service':
      await apiCall(`/api/expert/services/${id}/toggle`, 'PUT');
      await loadAllData();
      return rerenderExpertContent();

    /* ---------- Clients ---------- */
    case 'client-detail':
      return openClientDetailModal(Number(id));

    case 'client-note':
      return openClientNoteModal(Number(id));

    case 'client-followup':
      return openFollowUpModal(Number(id));

    case 'client-message':
      return showToast('Opening chat…', 'info');

    case 'client-add':
      return openAddClientModal();

    /* ---------- CRM ---------- */
    case 'crm-note-save':
      return saveCRMNote();

    case 'crm-reminder-save':
      return saveCRMReminder();

    case 'crm-task-save':
      return saveCRMTask();

    case 'crm-task-complete':
      await apiCall(`/api/expert/tasks/${id}/complete`, 'PUT');
      await loadAllData();
      return rerenderExpertContent();

    case 'crm-reminder-complete':
      await apiCall(`/api/expert/reminders/${id}/complete`, 'PUT');
      await loadAllData();
      return rerenderExpertContent();

    case 'crm-delete-note':
      if (!await confirmDialog('Delete this note?')) return;
      await apiCall(`/api/expert/notes/${id}`, 'DELETE');
      await loadAllData();
      return rerenderExpertContent();

    /* ---------- Courses ---------- */
    case 'create-course':
      return openCreateCourseModal();

    case 'edit-course':
      return openEditCourseModal(Number(id));

    case 'open-course-builder':
      S.__activeCourseId = Number(id);
      activeTab = 'course-builder';
      return rerenderExpertContent();

    case 'delete-course': {
      if (!await confirmDialog('Delete this course? Lessons will be removed.')) return;
      await apiCall(`/api/expert/courses/${id}`, 'DELETE');
      await loadAllData();
      showToast('Course deleted', 'success');
      return rerenderExpertContent();
    }

    case 'publish-course':
      await apiCall(`/api/expert/courses/${id}/publish`, 'PUT');
      await loadAllData();
      showToast('Course published', 'success');
      return rerenderExpertContent();

    case 'unpublish-course':
      await apiCall(`/api/expert/courses/${id}/unpublish`, 'PUT');
      await loadAllData();
      return rerenderExpertContent();

    /* ---------- Course Builder ---------- */
    case 'add-module':
      return openModuleModal(Number(id));

    case 'edit-module':
      return openModuleModal(null, Number(id));

    case 'delete-module': {
      if (!await confirmDialog('Delete this module and its lessons?')) return;
      await apiCall(`/api/expert/modules/${id}`, 'DELETE');
      await loadAllData();
      return rerenderExpertContent();
    }

    case 'add-lesson':
      return openLessonModal(Number(el.dataset.module));

    case 'edit-lesson':
      return openLessonModal(null, Number(id));

    case 'delete-lesson': {
      if (!await confirmDialog('Delete this lesson?')) return;
      await apiCall(`/api/expert/lessons/${id}`, 'DELETE');
      await loadAllData();
      return rerenderExpertContent();
    }

    case 'save-course-settings': {
      const courseId = S.__activeCourseId;
      if (!courseId) return showToast('No course selected', 'error');
      const payload = {
        status:  document.getElementById('builderCourseStatus')?.value,
        price:   Number(document.getElementById('builderCoursePrice')?.value || 0),
        level:   document.getElementById('builderCourseLevel')?.value,
        title:   document.getElementById('builderCourseTitle')?.value,
        description: document.getElementById('builderCourseDesc')?.value,
      };
      await apiCall(`/api/expert/courses/${courseId}`, 'PUT', payload);
      await loadAllData();
      showToast('Course settings saved', 'success');
      return rerenderExpertContent();
    }

    case 'preview-course':
      return showToast('Opening course preview…', 'info');

    /* ---------- Course Analytics ---------- */
    case 'export-course-analytics': {
      const rows = (S.courseAnalytics?.courses || []).map(c => ({
        course: c.title, enrolled: c.enrolled, completed: c.completed,
        avg_progress: c.avg_progress, avg_rating: c.avg_rating, revenue: c.revenue,
      }));
      return downloadCsv('course-analytics.csv', rows);
    }

    /* ---------- Events ---------- */
    case 'event-detail': {
      const ev = S.events.find(x => String(x.id) === id);
      if (!ev) return;
      openModal({
        title: ev.title,
        body: `
          <p>${esc(ev.description || '')}</p>
          <p><strong>Date:</strong> ${fmtDate(ev.date || ev.created_at)}</p>
          <p><strong>Registered:</strong> ${ev.registered_count || 0} / ${ev.capacity || 0}</p>
        `,
        footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
      });
      return;
    }

    case 'event-registrations':
      return openEventRegistrationsModal(Number(id));

    /* ---------- Portfolio ---------- */
    case 'add-portfolio-item':
      return openPortfolioItemModal();

    case 'edit-portfolio-item':
      return openPortfolioItemModal(Number(id));

    case 'delete-portfolio-item': {
      if (!await confirmDialog('Delete this portfolio item?')) return;
      await apiCall(`/api/expert/portfolio/${id}`, 'DELETE');
      await loadAllData();
      showToast('Item deleted', 'success');
      return rerenderExpertContent();
    }

    /* ---------- Public Q&A ---------- */
    case 'answer-question':
      return openAnswerQuestionModal(Number(id));

    case 'edit-answer': {
      const q = (S.expertQuestions || []).find(x => String(x.id) === id);
      return openAnswerQuestionModal(Number(id), q?.answer);
    }

    case 'delete-question':
      if (!await confirmDialog('Delete this question?')) return;
      await apiCall(`/api/expert/questions/${id}`, 'DELETE');
      await loadAllData();
      return rerenderExpertContent();

    /* ---------- Proposals & Invoices ---------- */
    case 'create-proposal':
      return openProposalModal();

    case 'edit-proposal':
      return openProposalModal(Number(id));

    case 'view-proposal':
      return openProposalViewModal(Number(id));

    case 'send-proposal':
      await apiCall(`/api/expert/proposals/${id}/send`, 'POST');
      await loadAllData();
      showToast('Proposal sent', 'success');
      return rerenderExpertContent();

    case 'duplicate-proposal':
      await apiCall(`/api/expert/proposals/${id}/duplicate`, 'POST');
      await loadAllData();
      showToast('Proposal duplicated', 'success');
      return rerenderExpertContent();

    case 'delete-proposal':
      if (!await confirmDialog('Delete this proposal?')) return;
      await apiCall(`/api/expert/proposals/${id}`, 'DELETE');
      await loadAllData();
      return rerenderExpertContent();

    case 'proposal-to-invoice':
      await apiCall(`/api/expert/proposals/${id}/convert`, 'POST');
      await loadAllData();
      showToast('Converted to invoice', 'success');
      return rerenderExpertContent();

    case 'download-proposal': {
      const p = (S.expertProposals || []).find(x => String(x.id) === id);
      if (!p) return;
      window.open(`/api/expert/proposals/${id}/pdf`, '_blank');
      return;
    }

    /* ---------- Projects & Tasks ---------- */
    case 'create-project':
      return openProjectModal();

    case 'edit-project':
      return openProjectModal(Number(id));

    case 'view-project':
      return openProjectViewModal(Number(id));

    case 'delete-project':
      if (!await confirmDialog('Delete this project?')) return;
      await apiCall(`/api/expert/projects/${id}`, 'DELETE');
      await loadAllData();
      return rerenderExpertContent();

    case 'add-milestone':
      return openMilestoneModal(Number(id));

    case 'add-task':
      return openTaskModal(Number(el.dataset.project));

    case 'edit-task':
      return openTaskModal(null, Number(id));

    case 'complete-task':
      await apiCall(`/api/expert/tasks/${id}/complete`, 'PUT');
      await loadAllData();
      return rerenderExpertContent();

    case 'delete-task':
      if (!await confirmDialog('Delete this task?')) return;
      await apiCall(`/api/expert/tasks/${id}`, 'DELETE');
      await loadAllData();
      return rerenderExpertContent();

    /* ---------- Mentorship ---------- */
    case 'create-mentorship':
      return openMentorshipModal();

    case 'edit-mentorship':
      return openMentorshipModal(Number(id));

    case 'mentorship-detail':
      return openMentorshipDetailModal(Number(id));

    case 'delete-mentorship':
      if (!await confirmDialog('End this mentorship?')) return;
      await apiCall(`/api/expert/mentorships/${id}`, 'DELETE');
      await loadAllData();
      return rerenderExpertContent();

    case 'mentorship-session':
      return openMentorshipSessionModal(Number(id));

    /* ---------- Professional Development ---------- */
    case 'add-credential':
      return openCredentialModal();

    case 'edit-credential':
      return openCredentialModal(Number(id));

    case 'delete-credential':
      if (!await confirmDialog('Delete this credential?')) return;
      await apiCall(`/api/expert/credentials/${id}`, 'DELETE');
      await loadAllData();
      return rerenderExpertContent();

    case 'add-cpd':
      return openCPDModal();

    case 'delete-cpd':
      await apiCall(`/api/expert/cpd/${id}`, 'DELETE');
      await loadAllData();
      return rerenderExpertContent();

    case 'update-skills':
      return openSkillsModal();

    /* ---------- Team ---------- */
    case 'invite-team':
      return openInviteTeamModal();

    case 'team-change-role':
      return openChangeRoleModal(Number(id));

    case 'team-remove':
      if (!await confirmDialog('Remove this team member?')) return;
      await apiCall(`/api/expert/team/${id}`, 'DELETE');
      await loadAllData();
      return rerenderExpertContent();

    case 'team-permissions':
      return openTeamPermissionsModal(Number(id));

    /* ---------- Earnings / Withdrawals ---------- */
    case 'request-withdrawal': {
      const amount = Number(document.getElementById('withdrawAmount')?.value || 0);
      const method = document.getElementById('withdrawMethod')?.value;
      if (!amount || amount < CONFIG.MIN_PAYOUT) {
        return showToast(`Minimum payout is ${fmtCur(CONFIG.MIN_PAYOUT)}`, 'error');
      }
      showLoading(true);
      try {
        await apiCall('/api/expert/withdrawals', 'POST', { amount, method });
        await loadAllData();
        showToast('Withdrawal requested', 'success');
        return rerenderExpertContent();
      } finally { showLoading(false); }
    }

    case 'cancel-withdrawal':
      await apiCall(`/api/expert/withdrawals/${id}`, 'DELETE');
      await loadAllData();
      showToast('Withdrawal cancelled', 'warning');
      return rerenderExpertContent();

    case 'export-earnings': {
      const rows = (S.wallet.ledger || []).map(l => ({
        date: l.created_at, reason: l.reason, amount: l.amount, balance: l.balance,
      }));
      return downloadCsv('earnings.csv', rows);
    }

    /* ---------- Reviews ---------- */
    case 'reply-review': {
      const reply = prompt('Your reply:');
      if (!reply || !reply.trim()) return;
      await apiCall(`/api/expert/reviews/${id}/reply`, 'POST', { reply });
      await loadAllData();
      showToast('Reply posted', 'success');
      return rerenderExpertContent();
    }

    case 'report-review': {
      const reason = prompt('Reason for report?') || '';
      await apiCall(`/api/expert/reviews/${id}/report`, 'POST', { reason });
      showToast('Review reported', 'warning');
      return;
    }

    /* ---------- Business Intelligence ---------- */
    case 'export-analytics': {
      const rows = [
        { metric: 'Profile views',        value: S.expertAnalytics?.profile_views || 0 },
        { metric: 'Bookings this month',  value: S.expertAnalytics?.bookings_month || 0 },
        { metric: 'Avg. rating',          value: S.expertAnalytics?.avg_rating || 0 },
        { metric: 'Repeat clients',       value: S.expertAnalytics?.repeat_clients || 0 },
        { metric: 'Revenue last 30d',     value: S.expertAnalytics?.revenue_30d || 0 },
      ];
      return downloadCsv('expert-analytics.csv', rows);
    }

    /* ---------- Profile ---------- */
    case 'save-expert-profile': {
      const payload = {
        name:            document.getElementById('profileName')?.value,
        specialization:  document.getElementById('profileSpecialization')?.value,
        hourly_rate:     Number(document.getElementById('profileRate')?.value || 0),
        bio:             document.getElementById('profileBio')?.value,
        languages:       document.getElementById('profileLanguages')?.value,
        phone:           document.getElementById('profilePhone')?.value,
        timezone:        document.getElementById('profileTimezone')?.value,
      };
      await apiCall('/api/expert/profile', 'PUT', payload);
      try {
        const me = await apiCall('/api/auth/me');
        currentUser = me.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
      } catch (_) {}
      showToast('Profile saved', 'success');
      return rerenderExpertContent();
    }

    case 'upload-avatar': {
      const file = document.getElementById('avatarFile')?.files[0];
      if (!file) return showToast('Select a file', 'error');
      const fd = new FormData();
      fd.append('avatar', file);
      showLoading(true);
      try {
        await apiCall('/api/auth/avatar', 'POST', fd, true);
        const me = await apiCall('/api/auth/me');
        currentUser = me.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
        showToast('Avatar uploaded', 'success');
        rerenderExpertContent();
      } finally { showLoading(false); }
      return;
    }

    case 'change-password': {
      const oldp = document.getElementById('cpOld')?.value;
      const newp = document.getElementById('cpNew')?.value;
      if (!newp || newp.length < 8) return showToast('New password must be 8+ chars', 'error');
      await apiCall('/api/auth/password', 'PUT', { old_password: oldp, new_password: newp });
      document.getElementById('cpOld').value = '';
      document.getElementById('cpNew').value = '';
      return showToast('Password updated', 'success');
    }

    case 'view-public-profile':
      return window.open(`/expert/${currentUser.id}`, '_blank');

    default:
      console.warn('Unhandled expert action:', action);
  }
}

/* ---------- Reset when role changes ---------- */
window.addEventListener('hashchange', () => {
  if (typeof currentUserRole !== 'undefined' && currentUserRole === 'expert') {
    if (!EXPERT_TABS.includes(activeTab)) activeTab = 'overview';
  }
});
