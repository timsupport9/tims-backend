/* ============================================================
   ExpertHub 2.0 — dashboards/user/transactions.js
   Transaction list with date filters, search, pagination,
   receipts. Enforces user's own records on server.
   ============================================================ */

const TX_PAGE_SIZE = 20;

function renderUserTransactions() {
  const f = {
    query:  UserFilters.get('transactions', 'q', '') || '',
    status: UserFilters.get('transactions', 'status', '') || '',
    from:   UserFilters.get('transactions', 'from', '') || '',
    to:     UserFilters.get('transactions', 'to', '') || '',
    page:   Number(UserFilters.get('transactions', 'page', 1)) || 1,
  };

  let list = (S.transactions || []).slice();
  if (f.query) {
    const q = f.query.toLowerCase();
    list = list.filter(t =>
      (t.description || '').toLowerCase().includes(q) ||
      (t.reference || '').toLowerCase().includes(q) ||
      (t.id && String(t.id).includes(q))
    );
  }
  if (f.status) list = list.filter(t => (t.status || '') === f.status);
  if (f.from) list = list.filter(t => t.created_at && new Date(t.created_at) >= new Date(f.from));
  if (f.to)   list = list.filter(t => t.created_at && new Date(t.created_at) <= new Date(f.to + 'T23:59:59'));

  const total = list.length;
  const page = Math.min(f.page, Math.max(1, Math.ceil(total / TX_PAGE_SIZE)));
  const paged = list.slice((page - 1) * TX_PAGE_SIZE, page * TX_PAGE_SIZE);

  return UserUI.page({
    title: 'Transactions',
    breadcrumb: 'Transactions',
    content: `
      <section class="panel">
        <div class="expert-filters" style="margin-bottom:12px">
          <input type="search" id="tx-search" class="form-input"
                 placeholder="Search reference or description"
                 value="${esc(f.query)}" style="max-width:240px" />
          <select id="tx-status" class="form-select" style="max-width:170px">
            <option value="">All statuses</option>
            ${['pending','completed','failed','reversed','refunded'].map(s =>
              `<option value="${s}" ${f.status === s ? 'selected' : ''}>${s[0].toUpperCase()+s.slice(1)}</option>`
            ).join('')}
          </select>
          <input type="date" id="tx-from" class="form-input" style="max-width:150px" value="${esc(f.from)}" />
          <input type="date" id="tx-to"   class="form-input" style="max-width:150px" value="${esc(f.to)}" />
          <button class="btn btn-ghost btn-sm" data-action="clear-tx-filters">
            <i class="fas fa-eraser"></i> Clear</button>
        </div>

        ${UserUI.table(
          ['Reference', 'Description', 'Amount', 'Status', 'Date', ''],
          paged.map(t => `
            <tr>
              <td><code class="code">${esc(t.reference || t.id)}</code></td>
              <td>${esc(t.description || '')}</td>
              <td>${fmtCur(t.amount || 0)}</td>
              <td>${UserUI.statusPill(t.status || '')}</td>
              <td>${fmtDT(t.created_at)}</td>
              <td>${t.status === 'completed'
                ? `<button class="btn btn-secondary btn-xs" data-action="download-receipt" data-id="${t.id}">
                    <i class="fas fa-receipt"></i></button>` : ''}</td>
            </tr>
          `),
          'No transactions yet'
        )}

        ${UserUI.pagination({ page, pageSize: TX_PAGE_SIZE, total, action: 'tx-page', key: 'transactions' })}
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('transactions', renderUserTransactions);

window.ExpertHubUser.registerModule('transactions', renderUserTransactions, {
  init() {
    const s = $('#tx-search');
    const st = $('#tx-status');
    const from = $('#tx-from');
    const to = $('#tx-to');
    const rerender = debounce(() => rerenderRoleContent(), 300);
    if (s)  s.oninput = () => { UserFilters.set('transactions', 'q', s.value); rerender(); };
    if (st) st.onchange = () => { UserFilters.set('transactions', 'status', st.value); rerenderRoleContent(); };
    if (from) from.onchange = () => { UserFilters.set('transactions', 'from', from.value); rerenderRoleContent(); };
    if (to)   to.onchange = () => { UserFilters.set('transactions', 'to', to.value); rerenderRoleContent(); };
  },
});

window.ExpertHubUser.registerAction('clear-tx-filters', () => {
  UserFilters.clear('transactions');
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('tx-page', (id, el) => {
  UserFilters.set('transactions', 'page', Number(el?.dataset?.page || 1));
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('download-receipt', async (id) => {
  try {
    const d = await apiCall(`/api/user/transactions/${id}/receipt`).catch(() => null);
    if (d?.url) window.open(d.url, '_blank', 'noopener,noreferrer');
    else showToast('Receipt not available yet', 'warning');
  } catch (e) { showToast(e.message, 'error'); }
});