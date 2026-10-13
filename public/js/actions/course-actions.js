/* ============================================================
   actions/course-actions.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function openEnrollModal(id) {
    const course = (EH.state.courses || []).find(x => String(x.id) === String(id));
    if (!course) return;
    EH.Modal.open({
      title: `Enroll in ${EH.Fmt.esc(course.title)}`,
      body: `
        <p>Price: <strong>${EH.Fmt.cur(course.price || 0)}</strong></p>
        <p>Your balance: <strong>${EH.Fmt.cur(EH.state.wallet.balance || 0)}</strong></p>
        <label class="form-group"><span class="form-label">Coupon (optional)</span>
          <input id="enCoupon" class="form-input" placeholder="WELCOME10" /></label>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
               <button id="enSave" class="btn btn-primary">Confirm Enroll</button>`,
    });
    document.getElementById('enSave').onclick = async () => {
      try {
        EH.Loading.show();
        const d = await EH.API.post('/api/eschool/enroll', {
          course_id: Number(id),
          coupon_code: document.getElementById('enCoupon').value || undefined,
        });
        EH.Modal.close();
        await EH.Data.loadAll();
        EH.NavigationActions.switchTab(EH.state.activeTab);
        EH.Toast.success(`Enrolled. Paid ${EH.Fmt.cur(d.paid)} (discount ${EH.Fmt.cur(d.discount)})`);
      } catch (e) {
        EH.Toast.error(e.message);
      } finally { EH.Loading.hide(); }
    };
  }

  function openProgressModal(id, current) {
    EH.Modal.open({
      title: 'Update Progress',
      body: `<label class="form-group"><span class="form-label">Progress (%)</span>
        <input id="pgVal" type="number" min="0" max="100" class="form-input" value="${current}" /></label>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
               <button id="pgSave" class="btn btn-primary">Save</button>`,
    });
    document.getElementById('pgSave').onclick = async () => {
      const p = Math.max(0, Math.min(100, Number(document.getElementById('pgVal').value || 0)));
      try {
        await EH.API.put(`/api/user/enrollments/${id}/progress`, { progress: p });
        EH.Modal.close();
        await EH.Data.loadAll();
        EH.NavigationActions.switchTab(EH.state.activeTab);
        EH.Toast.success('Progress updated');
      } catch (e) { EH.Toast.error(e.message); }
    };
  }

  EH.CourseActions = { openEnrollModal, openProgressModal };
})(window);
