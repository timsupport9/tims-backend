/* ============================================================
   ExpertHub 2.0 — 03-ui.js
   Theme, toast, loading overlay, modal plumbing, pagination bar.
   ============================================================ */

/* ---------- THEME ---------- */
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.classList.toggle('dark', saved === 'dark');
}
function toggleTheme() {
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}

/* ---------- TOAST / LOADING / MODAL ---------- */
function showToast(msg, type='info', timeout=3400) {
  const c = $('#toast-container');
  if (!c) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const icon = { success:'check-circle', error:'times-circle', warning:'exclamation-triangle', info:'bell' }[type] || 'bell';
  el.innerHTML = `<i class="fas fa-${icon} toast-icon"></i><span class="toast-message">${esc(msg)}</span>`;
  c.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}
function showLoading(show) {
  let l = $('#globalLoader');
  if (show && !l) {
    l = document.createElement('div');
    l.id = 'globalLoader';
    l.className = 'loading-overlay';
    l.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(l);
  } else if (!show && l) l.remove();
}
function openModal({ title, body, footer, className='' }) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-overlay" id="modalBackdrop">
      <div class="modal-content ${className}" role="dialog">
        <header class="modal-header">
          <h3 class="modal-title">${esc(title||'')}</h3>
          <button class="modal-close" data-close-modal>&times;</button>
        </header>
        <section class="modal-body">${body||''}</section>
        ${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}
      </div>
    </div>`;
  $('#modalBackdrop').addEventListener('click', e => { if (e.target.id === 'modalBackdrop') closeModal(); });
  root.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
}
function closeModal() { $('#modal-root').innerHTML = ''; }
async function confirmDialog(msg, title='Confirm') {
  return new Promise(resolve => {
    openModal({
      title,
      body: `<p>${esc(msg)}</p>`,
      footer: `<button id="cfmNo" class="btn btn-secondary">Cancel</button><button id="cfmYes" class="btn btn-danger">Confirm</button>`,
    });
    $('#cfmYes').onclick = () => { closeModal(); resolve(true); };
    $('#cfmNo').onclick  = () => { closeModal(); resolve(false); };
  });
}

/* ---------- PAGINATION HELPER ---------- */
function paginationBar(resource, page, per, total) {
  const pages = Math.max(1, Math.ceil((total || 0) / (per || 25)));
  if (pages <= 1) return '';
  return `
    <div class="table-footer">
      <span>Page ${page} of ${pages} (${total} record${total === 1 ? '' : 's'})</span>
      <div style="display:flex;gap:6px">
        <button class="btn btn-secondary btn-xs" ${page <= 1 ? 'disabled' : ''}
                data-action="paginate" data-resource="${resource}" data-page="${page - 1}">
          <i class="fas fa-chevron-left"></i> Prev
        </button>
        <button class="btn btn-secondary btn-xs" ${page >= pages ? 'disabled' : ''}
                data-action="paginate" data-resource="${resource}" data-page="${page + 1}">
          Next <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>`;
}
