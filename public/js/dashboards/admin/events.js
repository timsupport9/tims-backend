/* ============================================================
   admin/events.js — Events & training management
   ============================================================ */
(function () {
  AdminDash.reg('events', {
    nav: { label: 'Events', icon: 'fa-calendar-alt' },
    render() {
      return `
        <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Events</span></div>
        <section class="page-header">
          <h1 class="page-title">Events & Training</h1>
          <div class="page-actions">
            <button class="btn btn-primary" data-action="create-event"><i class="fas fa-calendar-plus"></i> New Event</button>
          </div>
        </section>
        <section class="panel">
          <div class="event-list">
            ${S.events.map(ev => {
              const date = new Date(ev.date || ev.created_at);
              return `
                <article class="event-card">
                  <div class="event-date">
                    <span class="event-day">${date.getDate()}</span>
                    <span class="event-month">${date.toLocaleString('en-US',{month:'short'})}</span>
                  </div>
                  <div class="event-body">
                    <h4 class="event-title">${esc(ev.title||'')}</h4>
                    <p class="event-desc">${esc((ev.description||'').slice(0,120))}</p>
                    <p class="event-meta">${esc(ev.category||'')} · ${ev.registered_count||0}/${ev.capacity||0} · ${ev.price>0?fmtCur(ev.price):'Free'}</p>
                  </div>
                  <div class="event-actions">
                    <button class="btn btn-secondary btn-sm" data-action="edit-event" data-id="${ev.id}">Edit</button>
                    <button class="btn btn-danger btn-sm" data-action="delete-event" data-id="${ev.id}">Delete</button>
                  </div>
                </article>`;
            }).join('') || '<p class="empty-row">No events</p>'}
          </div>
        </section>`;
    },
    actions: {
      'create-event': () => adminEventForm(null),
      'edit-event': ({ id }) => adminEventForm(Number(id)),
      'delete-event': async ({ id }) => {
        if (!await confirmDialog('Delete this event?')) return;
        await apiCall(`/api/admin/events/${id}`, 'DELETE');
        await loadAllData(); showToast('Event deleted','success'); rerenderRoleContent();
      },
    },
  });

  function adminEventForm(id) {
    const ev = id ? S.events.find(x => x.id === id) : {};
    const opts = S.experts.map(e => `<option value="${e.id}" ${ev.expert_id===e.id?'selected':''}>${esc(e.name)}</option>`).join('');
    openModal({
      title: id ? 'Edit Event' : 'New Event',
      body: `
        <label class="form-group"><span class="form-label">Title</span><input id="evTitle" class="form-input" value="${esc(ev.title||'')}" /></label>
        <label class="form-group"><span class="form-label">Description</span><textarea id="evDesc" class="form-textarea" rows="3">${esc(ev.description||'')}</textarea></label>
        <label class="form-group"><span class="form-label">Category</span><input id="evCat" class="form-input" value="${esc(ev.category||'General')}" /></label>
        <label class="form-group"><span class="form-label">Expert</span><select id="evExpert" class="form-select"><option value="">None</option>${opts}</select></label>
        <label class="form-group"><span class="form-label">Date</span><input id="evDate" type="date" class="form-input" value="${ev.date ? new Date(ev.date).toISOString().slice(0,10) : ''}" /></label>
        <label class="form-group"><span class="form-label">Capacity</span><input id="evCap" type="number" class="form-input" value="${ev.capacity||100}" /></label>
        <label class="form-group"><span class="form-label">Price ($)</span><input id="evPrice" type="number" class="form-input" value="${ev.price||0}" /></label>
        <label class="form-group"><span class="form-label">Expert payment ($)</span><input id="evPay" type="number" class="form-input" value="${ev.expert_payment||0}" /></label>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button><button id="evSave" class="btn btn-primary">${id?'Save':'Create'}</button>`,
    });
    $('#evSave').onclick = async () => {
      const payload = {
        title: $('#evTitle').value, description: $('#evDesc').value, category: $('#evCat').value,
        expert_id: $('#evExpert').value ? Number($('#evExpert').value) : null,
        date: $('#evDate').value || null, capacity: Number($('#evCap').value||100),
        price: Number($('#evPrice').value||0), expert_payment: Number($('#evPay').value||0),
      };
      if (id) await apiCall(`/api/admin/events/${id}`, 'PUT', payload);
      else    await apiCall('/api/admin/events', 'POST', payload);
      closeModal(); await loadAllData(); showToast(id?'Event updated':'Event created','success'); rerenderRoleContent();
    };
  }
})();
