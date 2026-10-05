/* ============================================================
   ExpertHub 2.0 — course-modals.js
   Functions moved intact from 13-modals.js.
   ============================================================ */

function openEnrollModal(courseId) {
  const c = S.courses.find(x => String(x.id) === String(courseId));
  if (!c) return;
  openModal({
    title: `Enroll in ${esc(c.title)}`,
    body: `
      <p>Price: <strong>${fmtCur(c.price || 0)}</strong></p>
      <p>Your balance: <strong>${fmtCur(S.wallet.balance || 0)}</strong></p>
      <label class="form-group"><span class="form-label">Coupon (optional)</span>
        <input id="enCoupon" class="form-input" placeholder="WELCOME10" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="enSave" class="btn btn-primary">Confirm Enroll</button>`,
  });
  $('#enSave').onclick = async () => {
    showLoading(true);
    const d = await apiCall('/api/eschool/enroll', 'POST', {
      course_id: Number(courseId),
      coupon_code: $('#enCoupon').value || undefined,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showLoading(false);
    showToast(`Enrolled. Paid ${fmtCur(d.paid)} (discount ${fmtCur(d.discount)})`, 'success', 6000);
  };
}
async function markLessonComplete(lessonId) {
  try {
    await apiCall(`/api/eschool/lessons/${lessonId}/progress`, 'POST', { status: 'completed' });
    showToast('Lesson completed. XP earned!', 'success');
    if (S.__currentCourseId) openCoursePlayer(S.__currentCourseId, lessonId);
  } catch (e) { showToast(e.message, 'error'); }
}
function openCourseReviewModal(courseId) {
  openModal({
    title: 'Rate This Course',
    body: `
      ${['content', 'instructor', 'value'].map(name => `
        <div class="rating-row">
          <label>${name.charAt(0).toUpperCase() + name.slice(1)}</label>
          <div class="star-input" data-name="${name}">
            ${[5,4,3,2,1].map(n => `<span data-value="${n}">★</span>`).join('')}
          </div>
        </div>
      `).join('')}
      <label class="checkbox-row" style="margin-top:10px">
        <input type="checkbox" id="rvRecommend" checked />
        I would recommend this course
      </label>
      <label class="form-group"><span class="form-label">Comment</span>
        <textarea id="rvCourseComment" class="form-textarea" rows="3"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="rvCourseSave" class="btn btn-primary">Submit Review</button>`,
  });
  const ratings = { content: 0, instructor: 0, value: 0 };
  document.querySelectorAll('.star-input').forEach(c => {
    c.querySelectorAll('span').forEach(s => s.onclick = () => {
      const n = c.dataset.name; const v = Number(s.dataset.value);
      ratings[n] = v;
      c.querySelectorAll('span').forEach(x => x.classList.toggle('active', Number(x.dataset.value) <= v));
    });
  });
  $('#rvCourseSave').onclick = async () => {
    if (!ratings.content) return showToast('Content rating required', 'error');
    await apiCall('/api/user/course-reviews', 'POST', {
      course_id: courseId,
      content_rating: ratings.content,
      instructor_rating: ratings.instructor || ratings.content,
      value_rating: ratings.value || ratings.content,
      would_recommend: $('#rvRecommend').checked,
      comment: $('#rvCourseComment').value,
    });
    closeModal(); showToast('Review submitted', 'success');
  };
}
function openCreateCourseModal() {
  openModal({
    title: 'New Course',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="ccTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="ccDesc" class="form-textarea" rows="3"></textarea></label>
      <label class="form-group"><span class="form-label">Type</span>
        <select id="ccType" class="form-select">
          ${CONFIG.COURSE_TYPES.map(t => `<option value="${t}">${t.replace('_',' ')}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Level</span>
        <select id="ccLevel" class="form-select">
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select></label>
      <label class="form-group"><span class="form-label">Price ($)</span>
        <input id="ccPrice" type="number" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ccSave" class="btn btn-primary">Create</button>`,
  });
  $('#ccSave').onclick = async () => {
    await apiCall('/api/expert/courses', 'POST', {
      title: $('#ccTitle').value, description: $('#ccDesc').value,
      course_type: $('#ccType').value, level: $('#ccLevel').value,
      price: Number($('#ccPrice').value || 0),
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Course created', 'success');
  };
}
function openEditCourseModal(courseId) {
  const c = S.courses.find(x => String(x.id) === String(courseId));
  if (!c) return;
  openModal({
    title: `Edit ${c.title}`,
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="ecTitle" class="form-input" value="${esc(c.title || '')}" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="ecDesc" class="form-textarea" rows="3">${esc(c.description || '')}</textarea></label>
      <label class="form-group"><span class="form-label">Price ($)</span>
        <input id="ecPrice" type="number" class="form-input" value="${c.price || 0}" /></label>
      <label class="form-group"><span class="form-label">Status</span>
        <select id="ecStatus" class="form-select">
          ${['draft','published','archived'].map(s => `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="ecSave" class="btn btn-primary">Save</button>`,
  });
  $('#ecSave').onclick = async () => {
    await apiCall(`/api/expert/courses/${courseId}`, 'PUT', {
      title: $('#ecTitle').value,
      description: $('#ecDesc').value,
      price: Number($('#ecPrice').value || 0),
      status: $('#ecStatus').value,
    });
    closeModal(); await loadAllData(); rerenderRoleContent(); showToast('Course updated', 'success');
  };
}
function openAddModuleModal(courseId) {
  openModal({
    title: 'New Module',
    body: `
      <label class="form-group"><span class="form-label">Module title</span>
        <input id="amTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Duration in hours</span>
        <input id="amDuration" type="number" class="form-input" value="2" /></label>
      <label class="form-group"><span class="form-label">Description</span>
        <textarea id="amDesc" class="form-textarea" rows="2"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="amSave" class="btn btn-primary">Add Module</button>`,
  });
  $('#amSave').onclick = async () => {
    await apiCall(`/api/institution/programmes/${courseId}/modules`, 'POST', {
      title: $('#amTitle').value,
      duration_hours: Number($('#amDuration').value || 0),
      description: $('#amDesc').value,
    });
    closeModal(); await loadCourseCurriculum(courseId); rerenderRoleContent(); showToast('Module added', 'success');
  };
}
function openEditModuleModal(moduleId) {
  openModal({
    title: 'Edit Module',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="emTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Duration (hours)</span>
        <input id="emDuration" type="number" class="form-input" /></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="emSave" class="btn btn-primary">Save</button>`,
  });
  $('#emSave').onclick = async () => {
    await apiCall(`/api/institution/programmes/modules/${moduleId}`, 'PUT', {
      title: $('#emTitle').value,
      duration_hours: Number($('#emDuration').value || 0),
    });
    closeModal(); rerenderRoleContent(); showToast('Module updated', 'success');
  };
}
function openAddLessonModal(moduleId) {
  const courseId = S.__activeCourseId;
  openModal({
    title: 'New Lesson',
    body: `
      <label class="form-group"><span class="form-label">Lesson title</span>
        <input id="alTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Type</span>
        <select id="alType" class="form-select">
          ${CONFIG.LESSON_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select></label>
      <label class="form-group"><span class="form-label">Duration (min)</span>
        <input id="alDuration" type="number" class="form-input" value="15" /></label>
      <label class="form-group"><span class="form-label">Content</span>
        <textarea id="alContent" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="alSave" class="btn btn-primary">Add Lesson</button>`,
  });
  $('#alSave').onclick = async () => {
    await apiCall(`/api/expert/courses/${courseId}/lessons`, 'POST', {
      module_id: moduleId,
      title: $('#alTitle').value,
      lesson_type: $('#alType').value,
      duration_minutes: Number($('#alDuration').value || 0),
      content: $('#alContent').value,
    });
    closeModal(); await loadCourseCurriculum(courseId); rerenderRoleContent(); showToast('Lesson added', 'success');
  };
}
function openEditLessonModal(lessonId) {
  openModal({
    title: 'Edit Lesson',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="elTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">Content</span>
        <textarea id="elContent" class="form-textarea" rows="4"></textarea></label>`,
    footer: `<button class="btn btn-secondary" data-close-modal>Cancel</button>
             <button id="elSave" class="btn btn-primary">Save</button>`,
  });
  $('#elSave').onclick = async () => {
    await apiCall(`/api/expert/lessons/${lessonId}`, 'PUT', {
      title: $('#elTitle').value,
      content: $('#elContent').value,
    });
    closeModal(); rerenderRoleContent(); showToast('Lesson updated', 'success');
  };
}
async function saveCourseSettings(courseId) {
  await apiCall(`/api/expert/courses/${courseId}`, 'PUT', {
    status: $('#builder-course-status').value,
    price: Number($('#builder-course-price').value || 0),
    level: $('#builder-course-level').value,
  });
  await loadAllData(); rerenderRoleContent(); showToast('Course settings saved', 'success');
}
