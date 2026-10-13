/* ============================================================
   dashboards/institution/trainees.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;
  const CONFIG = EH.CONFIG;

  const filters = { status: '', q: '' };

  function render() {
    const source = S.institutionEnrollments.length ? S.institutionEnrollments : S.trainees;
    let list = source.slice();
    if (filters.status) list = list.filter(t => (t.status || t.lifecycle_status) === filters.status);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      list = list.filter(t =>
        (t.trainee_name || t.name || '').toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q) ||
        (t.department || '').toLowerCase().includes(q));
    }

    const counts = {
      total: source.length,
      active: source.filter(t => ['active','approved'].includes(t.status || t.lifecycle_status)).length,
      pending: source.filter(t => (t.status || t.lifecycle_status) === 'pending_approval').length,
      completed: source.filter(t => ['completed','certified'].includes(t.status || t.lifecycle_status)).length,
    };

    const rows = list.map(t => {
      const traineeId = t.user_id || t.id;
      const name  = t.trainee_name || t.name || '';
      const email = t.email || '';
      const status = t.status || t.lifecycle_status || 'active';
      const progress = t.progress || 0;
      return `
        <tr>
          <td>
            <div class="user-cell">
              <img class="user-avatar" src="${EH.Fmt.esc(t.avatar || EH.PublicFormat.avatar(name))}" alt="" />
              <div>
                <div class="user-name">
                  ${EH.Fmt.esc(name)}
                  ${t.at_risk
                    ? '<span class="chip chip-red" style="margin-left:6px;font-size:.65rem">At Risk</span>'
                    : ''}
                </div>
                <div class="user-email">${EH.Fmt.esc(email)}</div>
              </div>
            </div>
          </td>
          <td>${EH.Fmt.esc(t.department || '-')}</td>
          <td>${EH.Fmt.esc(t.programme_title || '-')}</td>
          <td>
            <div class="progress-bar" style="width:80px">
              <span style="width:${progress}%"></span>
            </div>
            <small>${progress}%</small>
          </td>
          <td><span class="${EH.Fmt.statusClass(status)}">${EH.Fmt.esc(status.replace('_',' '))}</span></td>
          <td class="actions-cell">
            ${status === 'pending_approval' ? `
              <button class="btn btn-success btn-xs" data-action="approve-enrolment" data-id="${t.id}">Approve</button>
              <button class="btn btn-danger btn-xs" data-action="reject-enrolment" data-id="${t.id}">Reject</button>` : ''}
            <button class="btn btn-secondary btn-xs" data-action="trainee-detail" data-id="${traineeId}">View</button>
            ${t.id ? `<button class="btn btn-info btn-xs" data-action="trainee-transfer" data-id="${t.id}">Transfer</button>` : ''}
            <button class="btn btn-warning btn-xs" data-action="trainee-notes" data-id="${t.id || traineeId}">Notes</button>
          </td>
        </tr>`;
    });

    const html = `
      ${EH.Layout.breadcrumbs([{ label: 'Home', href: '#/dashboard' }, { label: 'Trainees' }])}
      ${EH.Layout.pageHeader('Trainee Management', {
        actions: `
          <button class="btn btn-secondary" data-action="import-trainees-history">
            <i class="fas fa-history"></i> Import History</button>
          <button class="btn btn-primary" data-action="invite-trainee">
            <i class="fas fa-user-plus"></i> Import Trainees</button>`,
      })}

      ${EH.Layout.statGrid([
        EH.Layout.statCard({ label: 'Total Enrolled', value: counts.total,
          icon: 'fa-users', tone: 'blue' }),
        EH.Layout.statCard({ label: 'Active', value: counts.active,
          icon: 'fa-check', tone: 'green' }),
        EH.Layout.statCard({ label: 'Pending Approval', value: counts.pending,
          icon: 'fa-clock', tone: 'yellow' }),
        EH.Layout.statCard({ label: 'Completed', value: counts.completed,
          icon: 'fa-award', tone: 'purple' }),
      ])}

      <section class="panel">
        <div class="page-actions" style="margin-bottom:14px">
          <input type="search" id="trainee-search" class="form-input"
                 placeholder="Search by name, email, or department"
                 value="${EH.Fmt.esc(filters.q)}" style="max-width:300px" />
          <select id="trainee-status-filter" class="form-select" style="max-width:200px">
            <option value="">All statuses</option>
            ${(CONFIG.LIFECYCLE_STATUSES || []).map(s => `
              <option value="${s}" ${filters.status === s ? 'selected' : ''}>
                ${s.replace('_',' ')}</option>`).join('')}
          </select>
          <button class="btn btn-secondary" data-action="export-trainees">
            <i class="fas fa-download"></i> Export</button>
        </div>

        ${EH.Layout.table(
          ['Trainee', 'Department', 'Programme', 'Progress', 'Lifecycle', 'Actions'],
          rows,
          { footer: EH.Pagination.bar('institutionTrainees', S.page.institutionTrainees || 1, 50, S.institutionTraineeTotal || list.length) }
        )}
      </section>`;

    setTimeout(attach, 0);
    return html;
  }

  function attach() {
    const q = document.getElementById('trainee-search');
    if (q && !q.dataset.bound) {
      q.dataset.bound = '1';
      q.oninput = EH.Perf.debounce(() => {
        filters.q = q.value;
        rerender();
      }, 300);
    }
    const st = document.getElementById('trainee-status-filter');
    if (st && !st.dataset.bound) {
      st.dataset.bound = '1';
      st.onchange = () => { filters.status = st.value; rerender(); };
    }
  }

  function rerender() {
    const host = document.getElementById('role-content');
    if (host) host.innerHTML = render();
    EH.InstitutionInteractions?.attach?.();
  }

  EH.InstTrainees = { render };
})(window);
