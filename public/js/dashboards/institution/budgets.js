/* ============================================================
   Institution — Budgets
   ============================================================ */
function instBudgets() {
  const budgets = S.budgetAllocations || [];
  const transactions = S.budgetTransactions || [];
  const totalAllocated = budgets.reduce((s, b) => s + Number(b.allocated || 0), 0);
  const totalSpent     = budgets.reduce((s, b) => s + Number(b.spent || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const util = pctOf(totalSpent, totalAllocated || 1);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Budgets</span></div>
    <section class="page-header">
      <h1 class="page-title">Budget & Cost Allocation</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="export-budgets">
          <i class="fas fa-download"></i> Export</button>
        <button class="btn btn-primary" data-action="create-budget">
          <i class="fas fa-plus"></i> New Budget</button>
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Total Allocated', fmtCur(totalAllocated), '', 'fa-coins', 'blue')}
      ${statCard('Total Spent', fmtCur(totalSpent), '', 'fa-dollar-sign', 'green')}
      ${statCard('Remaining', fmtCur(totalRemaining), '', 'fa-piggy-bank', 'purple')}
      ${statCard('Overall Utilisation', util + '%', '', 'fa-chart-pie', 'yellow')}
    </section>

    ${budgets.length ? `
      <section class="panel">
        <h3 class="panel-title">Departmental Budgets</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Department</th><th>Period</th>
              <th>Allocated</th><th>Spent</th><th>Remaining</th>
              <th>Utilisation</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${budgets.map(b => {
                const utilPct = pctOf(b.spent, b.allocated || 1);
                return `<tr>
                  <td>${esc(b.department)}</td>
                  <td>${esc(b.period || 'monthly')}</td>
                  <td>${fmtCur(b.allocated)}</td>
                  <td>${fmtCur(b.spent)}</td>
                  <td>${fmtCur(b.allocated - b.spent)}</td>
                  <td><div class="${budgetUtilClass(utilPct)}">
                    ${renderMiniBar(utilPct, utilPct >= 95 ? '#dc2626' : utilPct >= 80 ? '#f59e0b' : '#22c55e')}
                    ${utilPct}%
                  </div></td>
                  <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs" data-action="edit-budget" data-id="${b.id}">
                      Edit</button>
                    <button class="btn btn-info btn-xs" data-action="view-budget-transactions" data-id="${b.id}">
                      Transactions</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>` : `
      <section class="panel">
        <div class="empty-state">
          <i class="fas fa-coins"></i>
          <h3>No budgets configured</h3>
          <p>Set up departmental budgets to track training spend.</p>
          <button class="btn btn-primary" data-action="create-budget">
            <i class="fas fa-plus"></i> Create First Budget</button>
        </div>
      </section>`}

    ${transactions.length ? `
      <section class="panel">
        <h3 class="panel-title">Recent Budget Transactions</h3>
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
  `;
}
