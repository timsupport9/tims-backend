/* ============================================================
   ExpertHub 2.0 — js/admin/12-coupons.js
   Admin coupons.
   ============================================================ */

function adminCoupons() {
  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Coupons</span></div>
    <section class="page-header">
      <h1 class="page-title">Coupons</h1>
      <button class="btn btn-primary" data-action="create-coupon"><i class="fas fa-plus"></i> New Coupon</button>
    </section>
    <section class="panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Code</th><th>Discount</th><th>Uses</th><th>Applies to</th><th>Expires</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${S.coupons.map(c => `
              <tr>
                <td><code class="code">${esc(c.code || '')}</code></td>
                <td>${c.discount_type === 'percent' ? c.discount_value + '%' : fmtCur(c.discount_value)}</td>
                <td>${c.used_count || 0}${c.max_uses ? ' / ' + c.max_uses : ''}</td>
                <td><span class="chip chip-neutral">${esc(c.applies_to)}</span></td>
                <td>${c.expires_at ? fmtDate(c.expires_at) : 'Never'}</td>
                <td><span class="${statusClass(c.active ? 'active' : 'disabled')}">${c.active ? 'Active' : 'Disabled'}</span></td>
                <td class="actions-cell">
                  <button class="btn btn-secondary btn-xs" data-action="toggle-coupon" data-id="${c.id}">Toggle</button>
                  <button class="btn btn-danger btn-xs" data-action="delete-coupon" data-id="${c.id}">Delete</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" class="empty-row">No coupons</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}