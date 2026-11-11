/* ============================================================
   ExpertHub 2.0 — dashboards/user/resources.js
   Personal resource library.
   ============================================================ */

function renderUserResources() {
  const resources = S.resources || [];
  return UserUI.page({
    title: 'Resource Library',
    breadcrumb: 'Resources',
    actions: `
      <button class="btn btn-primary" data-action="upload-resource">
        <i class="fas fa-upload"></i> Upload</button>
    `,
    content: `
      <section class="panel">
        ${resources.length ? UserUI.table(
          ['Title', 'Type', 'Course', 'Uploaded', 'Actions'],
          resources.map(r => `
            <tr>
              <td>${esc(r.title)}</td>
              <td><span class="chip chip-neutral">${esc(r.type || 'file')}</span></td>
              <td>${esc(r.course_title || '—')}</td>
              <td>${fmtDate(r.created_at)}</td>
              <td class="actions-cell">
                <a class="btn btn-secondary btn-xs" href="${esc(r.url)}" target="_blank" rel="noopener">
                  <i class="fas fa-download"></i> Download</a>
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

window.ExpertHubUser.registerAction('upload-resource', () => {
  openModal({
    title: 'Upload Resource',
    body: `
      <label class="form-group"><span class="form-label">Title</span>
        <input id="urTitle" class="form-input" /></label>
      <label class="form-group"><span class="form-label">File</span>
        <input type="file" id="urFile" class="form-input" /></label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="urSave" class="btn btn-primary">Upload</button>
    `,
  });
  $('#urSave').onclick = async () => {
    const f = $('#urFile').files[0];
    if (!f) return showToast('Select a file', 'error');
    const fd = new FormData();
    fd.append('file', f);
    fd.append('title', $('#urTitle').value || f.name);
    try {
      showLoading(true);
      await apiCall('/api/user/resources', 'POST', fd, true);
      closeModal();
      await loadUserExtendedData();
      rerenderRoleContent();
      showToast('Resource uploaded', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { showLoading(false); }
  };
});

window.ExpertHubUser.registerAction('delete-resource', async (id) => {
  if (!await confirmDialog('Delete this resource?')) return;
  await apiCall(`/api/user/resources/${id}`, 'DELETE').catch(() => {});
  S.resources = (S.resources || []).filter(r => String(r.id) !== String(id));
  rerenderRoleContent();
  showToast('Deleted', 'success');
});
