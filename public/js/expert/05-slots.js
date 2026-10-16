/* ============================================================
   ExpertHub 2.0 — js/expert/05-slots.js
   Expert availability slots (open + booked).
   ============================================================ */

function expertSlots() {
  const slots = S.consultationSlots || [];
  const available = slots.filter(s => s.status === 'available');
  const booked = slots.filter(s => s.status === 'booked');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Availability Slots</span></div>
    <section class="page-header">
      <h1 class="page-title">Availability Slots</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="manage-slots">
          <i class="fas fa-plus"></i> Generate Slots</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      <div>
        Slots define when clients can book you. Generate them in batches by date range.
        Booked slots show which consultation they belong to.
      </div>
    </div>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Open Slots</p><p class="stat-value">${available.length}</p></div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-door-open"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info"><p class="stat-label">Booked</p><p class="stat-value">${booked.length}</p></div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Next 7 Days</p>
          <p class="stat-value">${available.filter(s => {
            const d = new Date(s.start_time);
            return d > new Date() && d < new Date(Date.now() + 7 * 86400000);
          }).length}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-calendar-week"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Slot Value (open)</p>
          <p class="stat-value">${fmtCur(available.reduce((sum, s) => sum + Number(s.price || 0), 0))}</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-dollar-sign"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Open Slots</h3>
      ${available.length ? `
        <div class="slot-grid">
          ${available.map(s => `
            <div class="slot-card">
              <div class="slot-time">${slotLabel(s)}</div>
              <div class="slot-meta">${s.duration_minutes} min · ${fmtCur(s.price)}</div>
              <button class="btn btn-danger btn-xs" data-action="remove-slot" data-id="${s.id}">
                <i class="fas fa-times"></i></button>
            </div>
          `).join('')}
        </div>
      ` : '<p class="empty-row">No open slots. Click "Generate Slots" to create some.</p>'}
    </section>

    <section class="panel">
      <h3 class="panel-title">Booked Slots</h3>
      ${booked.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Date</th><th>Time</th><th>Duration</th><th>Price</th><th>Consultation</th></tr>
            </thead>
            <tbody>
              ${booked.map(s => {
                const c = S.consultations.find(x => x.slot_id === s.id);
                return `
                  <tr>
                    <td>${fmtDate(s.start_time)}</td>
                    <td>${fmtInTz(s.start_time, currentUser?.timezone || 'UTC', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${s.duration_minutes} min</td>
                    <td>${fmtCur(s.price)}</td>
                    <td>${c ? `<a href="#" data-action="consultation-detail" data-id="${c.id}">${esc(c.title)}</a>` : '—'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="empty-row">No booked slots yet</p>'}
    </section>
  `;
}
