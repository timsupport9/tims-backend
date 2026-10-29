/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/resources.js */
/* Resource library: types, filters, curriculum mapping, */
/* favorites, signed downloads, report broken content. */
/* ============================================================ */

const RESOURCE_MAX_SIZE_MB = 25;
const RESOURCE_ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png','image/jpeg','image/webp',
  'text/plain','text/csv',
  'application/zip',
];

function renderUserResources() {
  const resources = S.resources || [];
  const f = {
    query: UserFilters.get('resources', 'q', '') || '',
    type:  UserFilters.get('resources', 'type', '') || '',
    favOnly: UserFilters.get('resources', 'favOnly', false),
  };

  let filtered = resources.slice();
  if (f.query) filtered = filtered.filter(r =>
    (r.title || '').toLowerCase().includes(f.query.toLowerCase()) ||
    (r.course_title || '').toLowerCase().includes(f.query.toLowerCase()) ||
    (r.topic || '').toLowerCase().includes(f.query.toLowerCase()));
  if (f.type) filtered = filtered.filter(r => r.type === f.type);
  if (f.favOnly) filtered = filtered.filter(r => r.favorite);

  const types = Array.from(new Set(resources.map(r => r.type).filter(Boolean))).sort();

  return UserUI.page({
    title: 'Resource Library',
    breadcrumb: 'Resources',
    actions: `
      <button class="btn btn-primary" data-action="upload-resource">
        <i class="fas fa-upload"></i> Upload</button>
    `,
    content: `
      <section class="panel">
        <div class="expert-filters" style="margin-bottom:12px">
          <input type="search" id="res-search" class="form-input"
                 placeholder="Search resources..." style="max-width:240px"
                 value="${esc(f.query)}" />
          <select id="res-type" class="form-select" style="max-width:160px">
            <option value="">All types</option>
            ${types.map(t => `<option value="${esc(t)}" ${f.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
          </select>
          <label class="checkbox-row">
            <input type="checkbox" id="res-fav" ${f.favOnly ? 'checked' : ''} /> Favorites only
          </label>
        </div>

        ${filtered.length ? UserUI.table(
          ['Title', 'Type', 'Course', 'Curriculum', 'Uploaded', 'Actions'],
          filtered.map(r => `
            <tr>
              <td>${esc(r.title)} ${r.favorite ? '<i class="fas fa-star" style="color:var(--warning)"></i>' : ''}</td>
              <td><span class="chip chip-neutral">${esc(r.type || 'file')}</span></td>
              <td>${esc(r.course_title || '—')}</td>
              <td>${esc(r.curriculum_mapping || '—')}</td>
              <td>${fmtDate(r.created_at)}</td>
              <td class="actions-cell">
                <button class="btn btn-secondary btn-xs" data-action="download-resource" data-id="${r.id}">
                  <i class="fas fa-download"></i></button>
                <button class="btn btn-secondary btn-xs" data-action="toggle-resource-favorite" data-id="${r.id}">
                  <i class="fas fa-star" style="color:${r.favorite ? 'var(--warning)' : 'inherit'}"></i></button>
                <button class="btn btn-warning btn-xs" data-action="report-resource" data-id="${r.id}"
                        aria-label="Report broken or inappropriate">
                  <i class="fas fa-flag"></i></button>
                <button class="btn btn-danger btn-xs" data-action="delete-resource" data-id="${r.id}">
                  <i class="fas fa-trash"></i></button>
              </td>
            </tr>
          `),
          'No resources yet'
        ) : UserUI.empty({
          icon: 'fa-folder-open',
          title: 'No resources yet',
          desc: 'Resources from your courses and consultations will appear here.',
        })}
      </section>
    `,
  });
}

window.ExpertHubUser.registerModule('resources', renderUserResources);

window.ExpertHubUser.registerModule('resources', renderUserResources, {
  init() {
    const s  = $('#res-search');
    const t  = $('#res-type');
    const fv = $('#res-fav');
    const rerender = debounce(() => rerenderRoleContent(), 250);
    if (s)  s.oninput  = () => { UserFilters.set('resources', 'q', s.value); rerender(); };
    if (t)  t.onchange = () => { UserFilters.set('resources', 'type', t.value); rerenderRoleContent(); };
    if (fv) fv.onchange = () => { UserFilters.set('resources', 'favOnly', fv.checked); rerenderRoleContent(); };
  },
});

window.ExpertHubUser.registerAction('upload-resource', () => {
  openModal({
    title: 'Upload Resource',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="urTitle" class="form-input" required /></label>
      <label class="form-group"><span class="form-label">Curriculum mapping (optional)</span>
        <input id="urCurriculum" class="form-input" placeholder="e.g. CBC Grade 8 Mathematics" /></label>
      <label class="form-group"><span class="form-label">File</span>
        <input type="file" id="urFile" class="form-input"
               accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt,.csv,.zip" />
        <p class="form-hint">Max ${RESOURCE_MAX_SIZE_MB}MB. PDF, DOC, XLS, PPT, images, text, CSV, ZIP.</p>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="urSave" class="btn btn-primary">Upload</button>
    `,
  });
  $('#urSave').onclick = async () => {
    const f = $('#urFile').files[0];
    if (!f) return showToast('Select a file', 'error');
    if (f.size > RESOURCE_MAX_SIZE_MB * 1024 * 1024)
      return showToast(`File is too large (max ${RESOURCE_MAX_SIZE_MB}MB)`, 'error');
    if (!RESOURCE_ALLOWED_MIME.includes(f.type) &&
        !/\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|webp|txt|csv|zip)$/i.test(f.name))
      return showToast('File type not supported', 'error');

    const btn = $('#urSave');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Uploading…';

    const fd = new FormData();
    fd.append('file', f);
    fd.append('title', $('#urTitle').value.trim() || f.name);
    const cm = $('#urCurriculum').value.trim();
    if (cm) fd.append('curriculum_mapping', cm);

    try {
      showLoading(true);
      await apiCall('/api/user/resources', 'POST', fd, true);
      closeModal();
      await loadUserExtendedData({ force: true });
      rerenderRoleContent();
      showToast('Resource uploaded', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Upload';
    }
    finally { showLoading(false); }
  };
});

window.ExpertHubUser.registerAction('download-resource', async (id) => {
  try {
    const d = await apiCall(`/api/user/resources/${id}/download`).catch(() => null);
    if (d?.url) window.open(d.url, '_blank', 'noopener,noreferrer');
    else showToast('Download not available — try again later', 'warning');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('toggle-resource-favorite', async (id) => {
  try {
    const d = await apiCall(`/api/user/resources/${id}/favorite`, 'POST');
    const r = (S.resources || []).find(x => String(x.id) === String(id));
    if (r) r.favorite = !!d?.favorite;
    rerenderRoleContent();
    showToast(d?.favorite ? 'Added to favorites' : 'Removed from favorites', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('report-resource', (id) => {
  UserUI.formModal({
    title: 'Report Resource',
    fields: [
      { name: 'reason', label: 'Reason', type: 'select', required: true,
        options: [
          { value: 'broken', label: 'Broken / not loading' },
          { value: 'inappropriate', label: 'Inappropriate content' },
          { value: 'copyright', label: 'Copyright issue' },
          { value: 'outdated', label: 'Outdated' },
          { value: 'other', label: 'Other' },
        ]},
      { name: 'notes', label: 'Details', type: 'textarea', rows: 3 },
    ],
    submitLabel: 'Submit Report',
    onSubmit: async (v) => {
      await apiCall(`/api/user/resources/${id}/report`, 'POST', v);
      closeModal();
      showToast('Report submitted', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('delete-resource', async (id) => {
  if (!await confirmDialog('Delete this resource?')) return;
  try {
    await apiCall(`/api/user/resources/${id}`, 'DELETE');
    S.resources = (S.resources || []).filter(r => String(r.id) !== String(id));
    rerenderRoleContent();
    showToast('Deleted', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});
