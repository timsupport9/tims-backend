/* ============================================================
   ExpertHub 2.0 — Budget & Finance
   Requests, allocations, approval chains, commitments, invoices,
   cost-per-trainee, ROI, reconciliation, forecast vs. actual.
   ============================================================ */

function instBudgets() {
  const budgets = S.budgetAllocations || [];
  const transactions = S.budgetTransactions || [];
  const invoices = S.budgetInvoices || [];
  const requests = S.budgetRequests || [];

  const totalAllocated = budgets.reduce((s, b) => s + safeNum(b.allocated), 0);
  const totalSpent     = budgets.reduce((s, b) => s + safeNum(b.spent), 0);
  const totalCommitted = budgets.reduce((s, b) => s + safeNum(b.committed), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const util = pctOf(totalSpent, totalAllocated || 1);

  const f = S.filters.budgets = S.filters.budgets || {};
  const periodFilter = f.period || '';

  let filtered = budgets.slice();
  if (periodFilter) filtered = filtered.filter(b => b.period === periodFilter);

  const canWrite = hasInstitutionPermission('budgets:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Budgets</span></div>
    <section class="page-header">
      <h1 class="page-title">Budget & Cost Allocation</h1>
      <div class="page-actions">
        <select id="budgets-period" class="form-select" style="max-width:160px">
          <option value="">All periods</option>
          ${CONFIG.BUDGET_PERIODS.map(p =>
            `<option value="${p}" ${periodFilter === p ? 'selected' : ''}>${capitalize(p)}</option>`).join('')}
        </select>
        <button class="btn btn-secondary" data-action="export-budgets">
          <i class="fas fa-download"></i> Export</button>
        ${canWrite ? `
          <button class="btn btn-secondary" data-action="request-budget">
            <i class="fas fa-file-invoice"></i> Request</button>
          <button class="btn btn-primary" data-action="create-budget">
            <i class="fas fa-plus"></i> New Budget</button>` : ''}
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Allocated', fmtCur(totalAllocated), '', 'fa-coins', 'blue')}
      ${statCard('Spent', fmtCur(totalSpent), '', 'fa-dollar-sign', 'green')}
      ${statCard('Committed', fmtCur(totalCommitted), 'pending invoices', 'fa-file-invoice', 'yellow')}
      ${statCard('Utilisation', util + '%', '', 'fa-chart-pie', util >= 95 ? 'red' : util >= 80 ? 'yellow' : 'purple')}
    </section>

    <!-- Pending requests -->
    ${requests.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-clock"></i> Pending Budget Requests</h3>
        <ul class="list-stack">
          ${requests.filter(r => r.status === 'pending').map(r => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(r.department)} · ${fmtCur(r.amount)}</span>
                <span class="list-row-sub">${esc(r.purpose || '')} · ${fmtDT(r.created_at)}</span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-success btn-xs" data-action="approve-budget-request" data-id="${r.id}">
                  Approve</button>
                <button class="btn btn-danger btn-xs" data-action="reject-budget-request" data-id="${r.id}">
                  Reject</button>
              </div>
            </li>`).join('')}
        </ul>
      </section>` : ''}

    <section class="panel">
      <h3 class="panel-title">Departmental Budgets</h3>
      ${filtered.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Department</th><th>Period</th>
              <th>Allocated</th><th>Committed</th><th>Spent</th>
              <th>Remaining</th><th>Utilisation</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${filtered.map(b => {
                const utilPct = pctOf(b.spent, b.allocated || 1);
                const cls = budgetUtilClass(utilPct);
                return `
                  <tr>
                    <td><strong>${esc(b.department)}</strong></td>
                    <td>${esc(b.period || 'monthly')}</td>
                    <td>${fmtCur(b.allocated)}</td>
                    <td>${fmtCur(b.committed || 0)}</td>
                    <td>${fmtCur(b.spent)}</td>
                    <td>${fmtCur(safeNum(b.allocated) - safeNum(b.spent))}</td>
                    <td><div class="${cls}">
                      ${renderMiniBar(utilPct, utilPct >= 95 ? '#dc2626' : utilPct >= 80 ? '#f59e0b' : '#22c55e')}
                      ${utilPct}%
                    </div></td>
                    <td class="actions-cell" style="white-space:nowrap">
                      ${canWrite ? `
                        <button class="btn btn-secondary btn-xs" data-action="edit-budget" data-id="${b.id}">
                          Edit</button>` : ''}
                      <button class="btn btn-info btn-xs" data-action="view-budget-transactions" data-id="${b.id}">
                        Txns</button>
                      <button class="btn btn-secondary btn-xs" data-action="budget-forecast" data-id="${b.id}"
                              title="Forecast vs actual"><i class="fas fa-chart-line"></i></button>
                      <button class="btn btn-secondary btn-xs" data-action="budget-roi" data-id="${b.id}"
                              title="Training ROI"><i class="fas fa-percent"></i></button>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>` : renderEmptyState({
              icon: 'fa-coins',
              title: 'No budgets configured',
              description: 'Create departmental budgets to track training spend.',
              actionLabel: canWrite ? '+ Create First Budget' : '',
              actionAttrs: canWrite ? 'data-action="create-budget"' : '',
              compact: true,
            })}
    </section>

    ${transactions.length ? `
      <section class="panel">
        <h3 class="panel-title">Recent Transactions</h3>
        <ul class="list-stack">
          ${transactions.slice(0, 20).map(t => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(t.description || 'Transaction')}</span>
                <span class="list-row-sub">${esc(t.department || '')} · ${fmtDT(t.created_at)}</span>
              </div>
              <span class="list-row-price" style="color:${t.amount >= 0 ? 'var(--accent)' : 'var(--danger)'}">
                ${t.amount >= 0 ? '+' : ''}${fmtCur(t.amount)}
              </span>
            </li>`).join('')}
        </ul>
      </section>` : ''}

    ${invoices.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-file-invoice-dollar"></i> Invoices</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Invoice</th><th>Vendor</th><th>Amount</th>
              <th>Issued</th><th>Due</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${invoices.map(inv => `
                <tr>
                  <td><code>${esc(inv.number)}</code></td>
                  <td>${esc(inv.vendor_name || '—')}</td>
                  <td>${fmtCur(inv.amount)}</td>
                  <td>${fmtDate(inv.issued_at)}</td>
                  <td>${fmtDate(inv.due_at)}</td>
                  <td><span class="${statusClass(inv.status || 'pending')}">${esc(inv.status || 'pending')}</span></td>
                  <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs" data-action="view-invoice" data-id="${inv.id}">
                      View</button>
                    ${canWrite && inv.status !== 'paid' ? `
                      <button class="btn btn-success btn-xs" data-action="mark-invoice-paid" data-id="${inv.id}">
                        Mark Paid</button>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>` : ''}
  `;
}
