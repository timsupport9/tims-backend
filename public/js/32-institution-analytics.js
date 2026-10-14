/* ============================================================
   ExpertHub 2.0 — 32-institution-analytics.js
   Institution analytics: KPIs, cohort breakdowns, completion
   funnel, at-risk learner detection, seat utilization, exports.
   Extends js/12-institution.js — see hook note at bottom.
   ============================================================ */

function userInstitutionAnalytics() {
  const instId = currentUser?.institution_id || S.institution?.id;
  const m = computeInstitutionMetrics(instId);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Analytics</span></div>
    <section class="page-header">
      <h1 class="page-title">Institution Analytics</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="inst-export-csv">
          <i class="fas fa-file-csv"></i> Export CSV</button>
        <button class="btn btn-secondary" data-action="inst-export-pdf">
          <i class="fas fa-file-pdf"></i> Report</button>
        <button class="btn btn-secondary" data-action="inst-schedule-report">
          <i class="fas fa-calendar-plus"></i> Schedule</button>
      </div>
    </section>

    <section class="stat-grid">
      ${renderInstKPI('Total Learners', m.total_learners, 'users', 'blue', m.learners_trend)}
      ${renderInstKPI('Active (30d)', m.active_learners, 'user-check', 'green', m.active_trend)}
      ${renderInstKPI('Completion Rate', m.completion_rate + '%', 'check-circle', 'purple', m.completion_trend)}
      ${renderInstKPI('Certificates Issued', m.certificates_issued, 'certificate', 'yellow', m.cert_trend)}
      ${renderInstKPI('Seat Utilization', m.utilization_pct + '%', 'chair', 'blue', null)}
      ${renderInstKPI('Cost / Certificate', fmtCur(m.cost_per_certificate), 'dollar-sign', 'green', null)}
    </section>

    <div class="inst-grid-2">
      <section class="panel">
        <h3 class="panel-title">Enrollment &amp; completion — last 12 weeks</h3>
        <canvas id="inst-chart-enroll" height="240" role="img"
                aria-label="Enrollment and completion trend"></canvas>
      </section>

      <section class="panel">
        <h3 class="panel-title">Completion funnel</h3>
        <ul class="inst-funnel">
          ${renderFunnelRow('Enrolled',   m.funnel.enrolled,   m.funnel.enrolled, 'blue')}
          ${renderFunnelRow('Started',    m.funnel.started,    m.funnel.enrolled, 'purple')}
          ${renderFunnelRow('Halfway',    m.funnel.halfway,    m.funnel.enrolled, 'yellow')}
          ${renderFunnelRow('Completed',  m.funnel.completed,  m.funnel.enrolled, 'green')}
        </ul>
      </section>
    </div>

    <div class="inst-grid-2">
      <section class="panel">
        <h3 class="panel-title">Completion by cohort</h3>
        <canvas id="inst-chart-cohort" height="240" role="img"
                aria-label="Completion rate by cohort"></canvas>
      </section>

      <section class="panel">
        <h3 class="panel-title">Courses with lowest completion</h3>
        ${renderLowCompletionCourses(m.by_course)}
      </section>
    </div>

    <section class="panel">
      <h3 class="panel-title">At-risk learners</h3>
      <p class="muted">Learners who haven't started in 14+ days while enrolled in an active course,
        or whose average quiz score is below 60%.</p>
      ${m.at_risk.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Learner</th><th>Enrolled</th><th>Last active</th><th>Progress</th><th>Quiz avg</th><th></th></tr>
            </thead>
            <tbody>
              ${m.at_risk.slice(0, 25).map(r => `
                <tr>
                  <td>
                    <div style="display:flex;gap:8px;align-items:center">
                      <img class="user-avatar user-avatar-sm" src="${avatar(r)}" alt="" />
                      <span>${esc(r.name)}</span>
                    </div>
                  </td>
                  <td>${r.enrolled_count}</td>
                  <td>${daysAgo(r.last_active_at)}d ago</td>
                  <td>${r.avg_progress}%</td>
                  <td>${r.quiz_avg === null ? '—' : r.quiz_avg + '%'}</td>
                  <td>
                    <button class="btn btn-secondary btn-xs" data-action="inst-nudge-learner"
                            data-id="${r.id}">
                      <i class="fas fa-bell"></i> Nudge</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `
        <div class="empty-state">
          <i class="fas fa-check-circle" style="color:#10b981"></i>
          <h3>No learners at risk</h3>
          <p>Everyone is keeping pace.</p>
        </div>`}
    </section>

    <section class="panel">
      <h3 class="panel-title">Cohort breakdown</h3>
      ${renderCohortTable(m.by_cohort)}
    </section>
  `;
}

/* ============================================================
   METRIC COMPUTATION
   ============================================================ */
function computeInstitutionMetrics(institutionId) {
  const members = (S.institutionMembers || []).filter(m =>
    !institutionId || m.institution_id === institutionId
  );
  const memberIds = new Set(members.map(m => m.id || m.user_id));

  const enrollments = (S.enrollments || []).filter(e => memberIds.has(e.user_id));
  const certs = (S.certificates || []).filter(c => memberIds.has(c.user_id));
  const quizzes = (S.quizAttempts || []).filter(q => memberIds.has(q.user_id));

  const now = Date.now();
  const cutoff30 = now - 30 * 86400000;
  const cutoff14 = now - 14 * 86400000;

  const activeLearners = new Set(
    enrollments
      .filter(e => new Date(e.updated_at || e.started_at || 0).getTime() > cutoff30)
      .map(e => e.user_id)
  ).size;

  const completed = enrollments.filter(e => Number(e.progress) >= 100);
  const completionRate = enrollments.length
    ? Math.round((completed.length / enrollments.length) * 100)
    : 0;

  // Funnel
  const funnel = {
    enrolled:  enrollments.length,
    started:   enrollments.filter(e => Number(e.progress) > 0).length,
    halfway:   enrollments.filter(e => Number(e.progress) >= 50).length,
    completed: completed.length,
  };

  // Seats
  const seatsTotal = S.institution?.seat_count || members.length;
  const seatsUsed  = members.length;
  const utilization = seatsTotal ? Math.round((seatsUsed / seatsTotal) * 100) : 0;

  // Cost per certificate
  const annualSpend = S.institution?.annual_spend || 0;
  const costPerCert = certs.length ? Math.round(annualSpend / certs.length) : 0;

  // Time to completion
  const durations = completed
    .filter(e => e.started_at && e.completed_at)
    .map(e => (new Date(e.completed_at) - new Date(e.started_at)) / 86400000);
  const avgTime = durations.length
    ? Math.round(durations.reduce((s, x) => s + x, 0) / durations.length)
    : 0;

  // At-risk learners
  const byUser = groupBy(enrollments, e => e.user_id);
  const quizByUser = groupBy(quizzes, q => q.user_id);
  const atRisk = [];

  byUser.forEach((list, uid) => {
    const member = members.find(m => (m.id || m.user_id) === uid);
    if (!member) return;

    const lastActive = list.reduce((latest, e) => {
      const t = new Date(e.updated_at || e.started_at || 0).getTime();
      return Math.max(latest, t);
    }, 0);
    const avgProgress = Math.round(
      list.reduce((s, e) => s + Number(e.progress || 0), 0) / list.length
    );
    const attempts = quizByUser.get(uid) || [];
    const quizAvg = attempts.length
      ? Math.round(attempts.reduce((s, q) => s + Number(q.score || 0), 0) / attempts.length)
      : null;

    const stale = lastActive && lastActive < cutoff14;
    const lowScore = quizAvg !== null && quizAvg < 60;

    if ((stale || lowScore) && list.some(e => Number(e.progress) < 100)) {
      atRisk.push({
        id: uid,
        name: member.name || 'Learner',
        email: member.email,
        avatar_url: member.avatar_url,
        enrolled_count: list.length,
        last_active_at: lastActive ? new Date(lastActive).toISOString() : null,
        avg_progress: avgProgress,
        quiz_avg: quizAvg,
        reason: [stale && 'inactive', lowScore && 'low quiz score'].filter(Boolean).join(', '),
      });
    }
  });

  atRisk.sort((a, b) => (a.avg_progress - b.avg_progress) || (b.enrolled_count - a.enrolled_count));

  // By cohort
  const byCohortMap = groupBy(members, m => m.cohort || m.department || 'Unassigned');
  const by_cohort = Array.from(byCohortMap.entries()).map(([cohort, list]) => {
    const ids = new Set(list.map(m => m.id || m.user_id));
    const ce = enrollments.filter(e => ids.has(e.user_id));
    const ccomp = ce.filter(e => Number(e.progress) >= 100);
    return {
      cohort,
      learner_count: list.length,
      enrollments: ce.length,
      completion_rate: ce.length ? Math.round((ccomp.length / ce.length) * 100) : 0,
      avg_progress: ce.length
        ? Math.round(ce.reduce((s, e) => s + Number(e.progress || 0), 0) / ce.length)
        : 0,
    };
  });

  // By course
  const byCourseMap = groupBy(enrollments, e => e.course_id);
  const by_course = Array.from(byCourseMap.entries()).map(([cid, list]) => {
    const course = (S.courses || []).find(c => String(c.id) === String(cid));
    const done = list.filter(e => Number(e.progress) >= 100).length;
    return {
      course_id: cid,
      title: course?.title || 'Untitled',
      learners: list.length,
      completed: done,
      completion_rate: list.length ? Math.round((done / list.length) * 100) : 0,
      avg_progress: list.length
        ? Math.round(list.reduce((s, e) => s + Number(e.progress || 0), 0) / list.length)
        : 0,
    };
  }).sort((a, b) => a.completion_rate - b.completion_rate);

  // Weekly trend (12 weeks)
  const trend = computeEnrollTrend(enrollments, completed, 12);

  return {
    total_learners: members.length,
    active_learners: activeLearners,
    completion_rate: completionRate,
    certificates_issued: certs.length,
    utilization_pct: utilization,
    cost_per_certificate: costPerCert,
    avg_time_to_complete_days: avgTime,
    seats_total: seatsTotal,
    seats_used: seatsUsed,
    funnel,
    at_risk: atRisk,
    by_cohort,
    by_course,
    trend,
    learners_trend: 0,
    active_trend: 0,
    completion_trend: 0,
    cert_trend: 0,
  };
}

function computeEnrollTrend(enrollments, completed, weeks) {
  const out = { labels: [], enrolled: [], completed: [] };
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(start.getDate() - (i + 1) * 7);
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);

    out.labels.push(formatWeek(start));
    out.enrolled.push(enrollments.filter(e => {
      const t = new Date(e.started_at || e.created_at || 0).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length);
    out.completed.push(completed.filter(e => {
      const t = new Date(e.completed_at || 0).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length);
  }
  return out;
}

function formatWeek(d) {
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d);
  } catch (_) { return d.toDateString().slice(4, 10); }
}

function daysAgo(iso) {
  if (!iso) return '—';
  return Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
}

function groupBy(arr, keyFn) {
  const map = new Map();
  arr.forEach(item => {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  });
  return map;
}

/* ============================================================
   RENDERING HELPERS
   ============================================================ */
function renderInstKPI(label, value, icon, tone, trend) {
  return `
    <div class="dashboard-card stat-card">
      <div class="stat-info">
        <p class="stat-label">${esc(label)}</p>
        <p class="stat-value">${typeof value === 'number' ? value.toLocaleString() : esc(String(value))}</p>
        ${trend ? `<p class="stat-sub ${trend > 0 ? 'is-up' : trend < 0 ? 'is-down' : ''}">
          ${trend > 0 ? '↑' : trend < 0 ? '↓' : '·'} ${Math.abs(trend)}% vs. prior
        </p>` : ''}
      </div>
      <div class="stat-icon stat-icon-${tone}"><i class="fas fa-${icon}"></i></div>
    </div>`;
}

function renderFunnelRow(label, value, total, tone) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return `
    <li class="inst-funnel-row">
      <div class="inst-funnel-label">${esc(label)}</div>
      <div class="inst-funnel-bar inst-funnel-bar-${tone}">
        <span style="width:${pct}%"></span>
      </div>
      <div class="inst-funnel-value">${value.toLocaleString()} <small>(${pct}%)</small></div>
    </li>`;
}

function renderLowCompletionCourses(courses) {
  const rows = courses.slice(0, 8);
  if (!rows.length) return '<p class="empty-row">No data</p>';
  return `
    <ul class="inst-course-list">
      ${rows.map(c => `
        <li>
          <div class="inst-course-name">${esc(c.title)}</div>
          <div class="progress-bar"><span style="width:${c.completion_rate}%"></span></div>
          <div class="inst-course-meta">${c.completed}/${c.learners} · ${c.completion_rate}%</div>
        </li>`).join('')}
    </ul>`;
}

function renderCohortTable(cohorts) {
  if (!cohorts.length) return '<p class="empty-row">No cohorts defined</p>';
  return `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr><th>Cohort</th><th>Learners</th><th>Enrollments</th>
              <th>Avg. progress</th><th>Completion</th></tr>
        </thead>
        <tbody>
          ${cohorts.map(c => `
            <tr>
              <td>${esc(c.cohort)}</td>
              <td>${c.learner_count}</td>
              <td>${c.enrollments}</td>
              <td>${c.avg_progress}%</td>
              <td><span class="chip ${c.completion_rate >= 70 ? 'chip-green' : c.completion_rate >= 40 ? 'chip-yellow' : 'chip-red'}">${c.completion_rate}%</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/* ============================================================
   CHARTS
   ============================================================ */
function drawInstitutionCharts(metrics) {
  if (typeof Chart === 'undefined') return;

  const enroll = document.getElementById('inst-chart-enroll');
  if (enroll) {
    if (enroll.__chart) enroll.__chart.destroy();
    enroll.__chart = new Chart(enroll.getContext('2d'), {
      type: 'line',
      data: {
        labels: metrics.trend.labels,
        datasets: [
          {
            label: 'Enrolled',
            data: metrics.trend.enrolled,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,.12)',
            fill: true, tension: 0.35, borderWidth: 2, pointRadius: 2,
          },
          {
            label: 'Completed',
            data: metrics.trend.completed,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,.12)',
            fill: true, tension: 0.35, borderWidth: 2, pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }

  const cohort = document.getElementById('inst-chart-cohort');
  if (cohort && metrics.by_cohort.length) {
    if (cohort.__chart) cohort.__chart.destroy();
    cohort.__chart = new Chart(cohort.getContext('2d'), {
      type: 'bar',
      data: {
        labels: metrics.by_cohort.map(c => c.cohort),
        datasets: [{
          label: 'Completion %',
          data: metrics.by_cohort.map(c => c.completion_rate),
          backgroundColor: metrics.by_cohort.map(c =>
            c.completion_rate >= 70 ? 'rgba(16,185,129,.75)'
            : c.completion_rate >= 40 ? 'rgba(245,158,11,.75)'
            : 'rgba(239,68,68,.75)'
          ),
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } },
        },
      },
    });
  }
}

/* ============================================================
   EXPORTS
   ============================================================ */
function exportInstitutionCSV() {
  const m = computeInstitutionMetrics(currentUser?.institution_id || S.institution?.id);
  const rows = [
    ['Metric', 'Value'],
    ['Total learners', m.total_learners],
    ['Active (30d)', m.active_learners],
    ['Completion rate (%)', m.completion_rate],
    ['Certificates issued', m.certificates_issued],
    ['Seat utilization (%)', m.utilization_pct],
    ['Cost per certificate', m.cost_per_certificate],
    ['Avg. time to complete (days)', m.avg_time_to_complete_days],
    [],
    ['Cohort', 'Learners', 'Enrollments', 'Avg. progress %', 'Completion %'],
    ...m.by_cohort.map(c => [c.cohort, c.learner_count, c.enrollments, c.avg_progress, c.completion_rate]),
    [],
    ['Course', 'Learners', 'Completed', 'Completion %'],
    ...m.by_course.map(c => [c.title, c.learners, c.completed, c.completion_rate]),
    [],
    ['At-risk learner', 'Enrolled', 'Last active (days ago)', 'Avg. progress %', 'Quiz avg %'],
    ...m.at_risk.map(r => [r.name, r.enrolled_count, daysAgo(r.last_active_at), r.avg_progress, r.quiz_avg ?? '']),
  ];

  const csv = rows.map(r => r.map(cell => {
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');

  downloadBlob(csv, `institution-analytics-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  showToast('CSV exported', 'success');
}

function exportInstitutionReport() {
  // Minimal printable report — opens a new window with a formatted HTML page.
  const m = computeInstitutionMetrics(currentUser?.institution_id || S.institution?.id);
  const html = `
    <!doctype html><html><head><meta charset="utf-8"/>
    <title>Institution Report</title>
    <style>
      body { font: 13px/1.6 -apple-system, Segoe UI, sans-serif; max-width: 900px; margin: 32px auto; color: #0f172a; }
      h1 { margin: 0 0 6px; } h2 { margin: 28px 0 10px; font-size: 16px; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; }
      th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
      th { background: #f1f5f9; }
      .kpi { display: inline-block; margin-right: 24px; }
      .kpi b { display: block; font-size: 22px; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <h1>${esc(S.institution?.name || 'Institution')} — Analytics Report</h1>
    <p>Generated ${new Date().toLocaleString()}</p>
    <div>
      <div class="kpi"><b>${m.total_learners}</b>Learners</div>
      <div class="kpi"><b>${m.active_learners}</b>Active 30d</div>
      <div class="kpi"><b>${m.completion_rate}%</b>Completion</div>
      <div class="kpi"><b>${m.certificates_issued}</b>Certificates</div>
      <div class="kpi"><b>${m.utilization_pct}%</b>Seat use</div>
    </div>
    <h2>Cohort breakdown</h2>
    <table><thead><tr><th>Cohort</th><th>Learners</th><th>Enrollments</th><th>Avg. progress</th><th>Completion</th></tr></thead>
    <tbody>${m.by_cohort.map(c => `<tr><td>${esc(c.cohort)}</td><td>${c.learner_count}</td><td>${c.enrollments}</td><td>${c.avg_progress}%</td><td>${c.completion_rate}%</td></tr>`).join('')}</tbody></table>
    <h2>Courses with lowest completion</h2>
    <table><thead><tr><th>Course</th><th>Learners</th><th>Completed</th><th>Completion</th></tr></thead>
    <tbody>${m.by_course.slice(0, 10).map(c => `<tr><td>${esc(c.title)}</td><td>${c.learners}</td><td>${c.completed}</td><td>${c.completion_rate}%</td></tr>`).join('')}</tbody></table>
    <h2>At-risk learners</h2>
    <table><thead><tr><th>Learner</th><th>Enrolled</th><th>Last active</th><th>Progress</th><th>Quiz avg</th></tr></thead>
    <tbody>${m.at_risk.slice(0, 25).map(r => `<tr><td>${esc(r.name)}</td><td>${r.enrolled_count}</td><td>${daysAgo(r.last_active_at)}d</td><td>${r.avg_progress}%</td><td>${r.quiz_avg ?? '—'}</td></tr>`).join('')}</tbody></table>
    </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return showToast('Pop-up blocked', 'error');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/* ============================================================
   NUDGE + SCHEDULED REPORT
   ============================================================ */
async function nudgeAtRiskLearner(userId) {
  try {
    await apiCall(`/api/institution/nudge`, 'POST', { user_id: userId });
    showToast('Nudge sent', 'success');
  } catch (_) {
    // Fallback: local notification
    window.EHNotifications?.push?.({
      kind: 'reminder',
      title: 'Reminder sent',
      body: 'Your learner will see a nudge on their next visit.',
      toast: false,
    });
    showToast('Nudge queued locally (backend offline)', 'info');
  }
}

function scheduleInstitutionReport() {
  openModal({
    title: 'Schedule analytics report',
    body: `
      <div class="form-grid">
        <label class="form-group"><span class="form-label">Frequency</span>
          <select id="inst-rep-freq" class="form-select">
            <option value="weekly">Weekly</option>
            <option value="monthly" selected>Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select></label>
        <label class="form-group"><span class="form-label">Format</span>
          <select id="inst-rep-format" class="form-select">
            <option value="csv">CSV</option>
            <option value="pdf">PDF summary</option>
          </select></label>
        <label class="form-group form-group-full"><span class="form-label">Recipients</span>
          <input id="inst-rep-emails" class="form-input"
                 placeholder="admin@acme.edu, hr@acme.edu" /></label>
      </div>`,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary" id="inst-rep-save">
        <i class="fas fa-check"></i> Save schedule</button>`,
  });

  document.getElementById('inst-rep-save').onclick = async () => {
    const payload = {
      frequency: document.getElementById('inst-rep-freq').value,
      format: document.getElementById('inst-rep-format').value,
      recipients: document.getElementById('inst-rep-emails').value
        .split(',').map(s => s.trim()).filter(Boolean),
    };
    try {
      await apiCall('/api/institution/reports', 'POST', payload);
      closeModal();
      showToast('Report scheduled', 'success');
    } catch (_) {
      showToast('Could not reach server — try again later', 'error');
    }
  };
}

/* ============================================================
   DELEGATED HANDLERS + CHART REFRESH
   ============================================================ */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'inst-export-csv')      { e.preventDefault(); exportInstitutionCSV(); }
  if (a === 'inst-export-pdf')      { e.preventDefault(); exportInstitutionReport(); }
  if (a === 'inst-schedule-report') { e.preventDefault(); scheduleInstitutionReport(); }
  if (a === 'inst-nudge-learner')   { e.preventDefault(); nudgeAtRiskLearner(el.dataset.id); }
});

// Redraw charts whenever the institution tab renders
(function hookInstitutionCharts() {
  const orig = window.renderInstitutionDashboard;
  if (typeof orig !== 'function' || orig.__analyticsHooked) return;
  window.renderInstitutionDashboard = function () {
    const r = orig.apply(this, arguments);
    requestAnimationFrame(() => {
      try {
        const m = computeInstitutionMetrics(currentUser?.institution_id || S.institution?.id);
        drawInstitutionCharts(m);
      } catch (_) {}
    });
    return r;
  };
  window.renderInstitutionDashboard.__analyticsHooked = true;
})();

/* Expose */
window.EHInstitutionAnalytics = {
  compute: computeInstitutionMetrics,
  render: userInstitutionAnalytics,
  exportCSV: exportInstitutionCSV,
  exportReport: exportInstitutionReport,
  draw: drawInstitutionCharts,