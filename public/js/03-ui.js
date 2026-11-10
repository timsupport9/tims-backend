/* ============================================================
   ExpertHub 2.0 — 03-ui.js
   Theme · Toast · Loading · Modal · Drawer · Pagination
   Form primitives · Badges · Avatars · Progress · Empty states
   Tabs · Tooltips · Dropdowns · Data-table · Stepper · Breadcrumbs
   Copy · Formatting helpers
   ============================================================ */

/* ---------- THEME ---------- */
function getTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.dataset.theme = theme;
  if (typeof UI === 'object' && UI) UI.theme = theme;
}

function initTheme() {
  const saved = localStorage.getItem('theme') || (UI && UI.theme) || 'light';
  applyTheme(saved);
}

function setTheme(theme) {
  applyTheme(theme);
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  showToast(`${next === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'info', 1800);
}

/* ============================================================
   TOAST
   ============================================================ */
function ensureToastContainer() {
  let c = document.querySelector('#toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}

function showToast(msg, type = 'info', timeout = (typeof CONFIG?.TOAST_DURATION_MS === 'number' ? CONFIG.TOAST_DURATION_MS : 3400)) {
  const c = ensureToastContainer();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const icon = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle', info: 'bell' }[type] || 'bell';
  el.innerHTML = `
    <i class="fas fa-${icon} toast-icon"></i>
    <span class="toast-message">${esc(msg)}</span>
    <button class="toast-close" aria-label="Dismiss"><i class="fas fa-times"></i></button>`;
  el.querySelector('.toast-close').onclick = () => el.remove();
  c.appendChild(el);
  if (timeout > 0) setTimeout(() => el.remove(), timeout);
  return el;
}

function showActionToast({ message, type = 'info', actionLabel = 'OK', onAction, timeout = 6000 }) {
  const c = ensureToastContainer();
  const el = document.createElement('div');
  el.className = `toast toast-${type} toast-with-action`;
  const icon = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle', info: 'bell' }[type] || 'bell';
  el.innerHTML = `
    <i class="fas fa-${icon} toast-icon"></i>
    <span class="toast-message">${esc(message)}</span>
    <button class="toast-action btn btn-ghost btn-xs">${esc(actionLabel)}</button>
    <button class="toast-close" aria-label="Dismiss"><i class="fas fa-times"></i></button>`;
  const kill = () => el.remove();
  el.querySelector('.toast-close').onclick = kill;
  el.querySelector('.toast-action').onclick = async () => {
    try { await onAction?.(); } catch (e) { showToast(e.message || 'Action failed', 'error'); }
    kill();
  };
  c.appendChild(el);
  if (timeout > 0) setTimeout(kill, timeout);
  return el;
}

function clearToasts() {
  const c = document.querySelector('#toast-container');
  if (c) c.innerHTML = '';
}

/* ============================================================
   LOADING OVERLAY
   ============================================================ */
function showLoading(show, opts = {}) {
  if (typeof show === 'object' && show !== null) { opts = show; show = true; }
  let l = document.querySelector('#globalLoader');

  if (show) {
    if (!l) {
      l = document.createElement('div');
      l.id = 'globalLoader';
      l.className = 'loading-overlay';
      l.innerHTML = `
        <div class="loading-inner">
          <div class="spinner"></div>
          <p class="loading-text" data-loading-text>${esc(opts.text || 'Loading…')}</p>
          <div class="loading-progress hidden" data-loading-progress>
            <div class="loading-progress-bar" style="width:0%"></div>
          </div>
        </div>`;
      document.body.appendChild(l);
    }
    const textEl = l.querySelector('[data-loading-text]');
    if (textEl && opts.text) textEl.textContent = opts.text;
    if (typeof opts.progress === 'number') {
      l.querySelector('[data-loading-progress]')?.classList.remove('hidden');
      setLoadingProgress(opts.progress);
    }
  } else if (l) {
    l.remove();
  }
}

function setLoadingProgress(pct) {
  const l = document.querySelector('#globalLoader');
  if (!l) return;
  const bar = l.querySelector('.loading-progress-bar');
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

/* ============================================================
   SKELETONS
   ============================================================ */
function inlineLoader(text = 'Loading…') {
  return `<div class="inline-loader"><div class="spinner spinner-sm"></div><span>${esc(text)}</span></div>`;
}

function skeletonBlock(lines = 3, opts = {}) {
  const w = opts.width || '100%';
  return `
    <div class="skeleton-block" style="width:${w}">
      ${Array.from({ length: lines }).map((_, i) => `
        <div class="skeleton-line" style="width:${60 + (i % 4) * 10}%"></div>`).join('')}
    </div>`;
}

function skeletonTable(rows = 5, cols = 4) {
  return `
    <div class="skeleton-table">
      ${Array.from({ length: rows }).map(() => `
        <div class="skeleton-row">
          ${Array.from({ length: cols }).map(() => `<div class="skeleton-cell"></div>`).join('')}
        </div>`).join('')}
    </div>`;
}

function skeletonCard() {
  return `
    <div class="skeleton-card">
      <div class="skeleton-thumb"></div>
      ${skeletonBlock(3)}
    </div>`;
}

function skeletonList(count = 4) {
  return Array.from({ length: count }).map(() => `
    <div class="skeleton-list-item">
      <div class="skeleton-avatar"></div>
      ${skeletonBlock(2)}
    </div>`).join('');
}

/* ============================================================
   MODAL
   ============================================================ */
const _modalState = { onClose: null, opener: null };

function openModal({ title, body, footer, className = '', size, closable = true, onClose }) {
  const root = document.querySelector('#modal-root');
  if (!root) return;
  _modalState.opener = document.activeElement;
  _modalState.onClose = onClose || null;

  const sizeCls = size ? `modal-${size}` : '';
  root.innerHTML = `
    <div class="modal-overlay" id="modalBackdrop">
      <div class="modal-content ${sizeCls} ${className}" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h3 class="modal-title">${esc(title || '')}</h3>
          ${closable ? '<button class="modal-close" data-close-modal>&times;</button>' : ''}
        </header>
        <section class="modal-body">${body || ''}</section>
        ${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}
      </div>
    </div>`;

  const backdrop = document.querySelector('#modalBackdrop');
  if (closable) backdrop.addEventListener('click', e => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
  root.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);

  // focus trap lite — focus the first focusable element inside the body
  setTimeout(() => {
    const focusable = root.querySelector('.modal-body input, .modal-body select, .modal-body textarea, .modal-body button:not([data-close-modal])');
    focusable?.focus();
  }, 30);
}

function closeModal() {
  const root = document.querySelector('#modal-root');
  if (root) root.innerHTML = '';
  const cb = _modalState.onClose;
  _modalState.onClose = null;
  if (cb) { try { cb(); } catch (_) {} }
  try { _modalState.opener?.focus?.(); } catch (_) {}
}

/* High-level modal with action buttons that resolves a promise. */
function showModal({ title, body, actions = [], size, className = '', onClose }) {
  return new Promise(resolve => {
    const footer = actions.map((a, i) =>
      `<button class="btn btn-${a.variant || 'secondary'}" data-modal-action="${i}">${esc(a.label)}</button>`
    ).join('');

    openModal({
      title, body, size, className,
      footer,
      onClose: () => { onClose?.(); resolve(null); },
    });

    actions.forEach((a, i) => {
      const btn = document.querySelector(`[data-modal-action="${i}"]`);
      if (!btn) return;
      btn.onclick = async () => {
        try {
          btn.disabled = true;
          const result = await a.onClick?.();
          if (result !== false) { closeModal(); resolve(result === undefined ? true : result); }
          else btn.disabled = false;
        } catch (e) {
          btn.disabled = false;
          showToast(e.message || 'Action failed', 'error');
        }
      };
    });
  });
}

async function confirmDialog(msg, title = 'Confirm', opts = {}) {
  return new Promise(resolve => {
    const yesVariant = opts.danger === false ? 'primary' : 'danger';
    const yesLabel = opts.confirmLabel || 'Confirm';
    const noLabel = opts.cancelLabel || 'Cancel';
    openModal({
      title,
      body: `<p>${esc(msg)}</p>`,
      footer: `<button id="cfmNo" class="btn btn-secondary">${esc(noLabel)}</button>
               <button id="cfmYes" class="btn btn-${yesVariant}">${esc(yesLabel)}</button>`,
      onClose: () => resolve(false),
    });
    document.querySelector('#cfmYes').onclick = () => { closeModal(); resolve(true); };
    document.querySelector('#cfmNo').onclick  = () => { closeModal(); resolve(false); };
  });
}

function promptDialog({ title = 'Enter value', label = '', defaultValue = '', placeholder = '', required = false }) {
  return new Promise(resolve => {
    openModal({
      title,
      body: `
        <label class="form-label">${esc(label)}</label>
        <input id="prompt-input" class="form-input" value="${esc(defaultValue)}" placeholder="${esc(placeholder)}" />
        ${required ? '<p class="form-help form-help-error hidden" id="prompt-err">This field is required</p>' : ''}`,
      footer: `<button id="promptCancel" class="btn btn-secondary">Cancel</button>
               <button id="promptOk" class="btn btn-primary">OK</button>`,
      onClose: () => resolve(null),
    });
    const input = document.querySelector('#prompt-input');
    input.focus();
    input.onkeydown = e => { if (e.key === 'Enter') document.querySelector('#promptOk').click(); };
    document.querySelector('#promptCancel').onclick = () => { closeModal(); resolve(null); };
    document.querySelector('#promptOk').onclick = () => {
      const v = input.value.trim();
      if (required && !v) {
        document.querySelector('#prompt-err')?.classList.remove('hidden');
        return;
      }
      closeModal();
      resolve(v);
    };
  });
}

/**
 * formDialog — quick form modal.
 * fields: [{ name, label, type, placeholder, value, options, required, rows, help }]
 * onSubmit(values) => Promise<boolean|void>  (return false to keep modal open)
 */
function formDialog({ title, fields = [], submitLabel = 'Save', cancelLabel = 'Cancel', submitVariant = 'primary', onSubmit }) {
  return new Promise(resolve => {
    const body = `<form id="form-dialog-form" class="form-dialog" autocomplete="off">${
      fields.map(f => renderField(f)).join('')
    }</form>`;

    openModal({
      title, body,
      footer: `<button id="fdCancel" class="btn btn-secondary">${esc(cancelLabel)}</button>
               <button id="fdSubmit" class="btn btn-${submitVariant}">${esc(submitLabel)}</button>`,
      onClose: () => resolve(null),
    });

    const form = document.querySelector('#form-dialog-form');
    document.querySelector('#fdCancel').onclick = () => { closeModal(); resolve(null); };
    document.querySelector('#fdSubmit').onclick = async () => {
      const values = collectFormValues(form, fields);
      const missing = fields.find(f => f.required && !String(values[f.name] ?? '').trim());
      if (missing) {
        form.querySelector(`[name="${missing.name}"]`)?.focus();
        showToast(`${missing.label || missing.name} is required`, 'warning');
        return;
      }
      try {
        const btn = document.querySelector('#fdSubmit');
        btn.disabled = true;
        const result = await onSubmit?.(values);
        if (result === false) { btn.disabled = false; return; }
        closeModal();
        resolve(values);
      } catch (e) {
        document.querySelector('#fdSubmit').disabled = false;
        showToast(e.message || 'Submit failed', 'error');
      }
    };
  });
}

function collectFormValues(form, fields) {
  const out = {};
  fields.forEach(f => {
    const el = form.querySelector(`[name="${f.name}"]`);
    if (!el) return;
    if (f.type === 'checkbox') out[f.name] = el.checked;
    else if (f.type === 'number') out[f.name] = el.value === '' ? null : Number(el.value);
    else if (el.multiple) out[f.name] = Array.from(el.selectedOptions).map(o => o.value);
    else out[f.name] = el.value;
  });
  return out;
}

/* ============================================================
   DRAWER (side panel)
   ============================================================ */
function ensureDrawerRoot() {
  let r = document.querySelector('#drawer-root');
  if (!r) {
    r = document.createElement('div');
    r.id = 'drawer-root';
    document.body.appendChild(r);
  }
  return r;
}

function openDrawer({ title = '', body = '', footer = '', side = 'right', width = 420, onClose }) {
  const root = ensureDrawerRoot();
  root.innerHTML = `
    <div class="drawer-overlay" id="drawerBackdrop">
      <aside class="drawer drawer-${side}" role="dialog" style="width:${width}px">
        <header class="drawer-header">
          <h3>${esc(title)}</h3>
          <button class="icon-btn" data-close-drawer><i class="fas fa-times"></i></button>
        </header>
        <div class="drawer-body">${body}</div>
        ${footer ? `<footer class="drawer-footer">${footer}</footer>` : ''}
      </aside>
    </div>`;
  root._onClose = onClose || null;
  root.querySelector('#drawerBackdrop').addEventListener('click', e => {
    if (e.target.id === 'drawerBackdrop') closeDrawer();
  });
  root.querySelector('[data-close-drawer]').onclick = closeDrawer;
}

function closeDrawer() {
  const root = document.querySelector('#drawer-root');
  if (!root) return;
  const cb = root._onClose;
  root.innerHTML = '';
  root._onClose = null;
  if (cb) { try { cb(); } catch (_) {} }
}

/* ============================================================
   PAGINATION
   ============================================================ */
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

/** Enhanced pagination with page jump + page-size. Signature stays separate so nothing breaks. */
function paginationBarAdvanced(resource, page, per, total, opts = {}) {
  const pages = Math.max(1, Math.ceil((total || 0) / (per || 25)));
  if (pages <= 1) return '';
  const sizes = opts.pageSizes || [10, 20, 50, 100];
  return `
    <div class="table-footer table-footer-advanced">
      <div class="table-footer-left">
        <span>Page ${page} of ${pages} · ${total} record${total === 1 ? '' : 's'}</span>
        <select class="form-select form-select-xs"
                data-action="page-size" data-resource="${resource}">
          ${sizes.map(s => `<option value="${s}" ${s === per ? 'selected' : ''}>${s} / page</option>`).join('')}
        </select>
      </div>
      <div class="table-footer-right" style="display:flex;gap:6px;align-items:center">
        <button class="btn btn-secondary btn-xs" ${page <= 1 ? 'disabled' : ''}
                data-action="paginate" data-resource="${resource}" data-page="1">
          <i class="fas fa-angles-left"></i>
        </button>
        <button class="btn btn-secondary btn-xs" ${page <= 1 ? 'disabled' : ''}
                data-action="paginate" data-resource="${resource}" data-page="${page - 1}">
          <i class="fas fa-chevron-left"></i>
        </button>
        <input type="number" min="1" max="${pages}" value="${page}"
               class="form-input form-input-xs" style="width:64px"
               data-action="page-jump" data-resource="${resource}" />
        <button class="btn btn-secondary btn-xs" ${page >= pages ? 'disabled' : ''}
                data-action="paginate" data-resource="${resource}" data-page="${page + 1}">
          <i class="fas fa-chevron-right"></i>
        </button>
        <button class="btn btn-secondary btn-xs" ${page >= pages ? 'disabled' : ''}
                data-action="paginate" data-resource="${resource}" data-page="${pages}">
          <i class="fas fa-angles-right"></i>
        </button>
      </div>
    </div>`;
}

/* ============================================================
   FORM PRIMITIVES
   ============================================================ */
function renderField(f = {}) {
  const { name, label = name, type = 'text', value = '', placeholder = '', required = false, help = '', options, rows = 3, disabled = false } = f;
  const req = required ? 'required' : '';
  const dis = disabled ? 'disabled' : '';
  const common = `id="f-${name}" name="${name}" class="form-input" placeholder="${esc(placeholder)}" ${req} ${dis}`;

  if (type === 'textarea') {
    return `
      <div class="form-group">
        <label class="form-label" for="f-${name}">${esc(label)}${required ? ' *' : ''}</label>
        <textarea ${common} rows="${rows}">${esc(value)}</textarea>
        ${help ? `<p class="form-help">${esc(help)}</p>` : ''}
      </div>`;
  }
  if (type === 'select') {
    return `
      <div class="form-group">
        <label class="form-label" for="f-${name}">${esc(label)}${required ? ' *' : ''}</label>
        <select ${common}>
          <option value="">— Select —</option>
          ${(options || []).map(o => {
            const val = typeof o === 'string' ? o : o.value;
            const txt = typeof o === 'string' ? o : o.label;
            return `<option value="${esc(val)}" ${String(val) === String(value) ? 'selected' : ''}>${esc(txt)}</option>`;
          }).join('')}
        </select>
        ${help ? `<p class="form-help">${esc(help)}</p>` : ''}
      </div>`;
  }
  if (type === 'checkbox') {
    return `
      <div class="form-group form-group-checkbox">
        <label class="form-check">
          <input type="checkbox" id="f-${name}" name="${name}" ${value ? 'checked' : ''} ${dis} />
          <span>${esc(label)}</span>
        </label>
        ${help ? `<p class="form-help">${esc(help)}</p>` : ''}
      </div>`;
  }
  return `
    <div class="form-group">
      <label class="form-label" for="f-${name}">${esc(label)}${required ? ' *' : ''}</label>
      <input type="${type}" ${common} value="${esc(value)}" />
      ${help ? `<p class="form-help">${esc(help)}</p>` : ''}
    </div>`;
}

function inputGroup(opts) { return renderField({ ...opts, type: 'text' }); }
function selectGroup(opts) { return renderField({ ...opts, type: 'select' }); }
function textareaGroup(opts) { return renderField({ ...opts, type: 'textarea' }); }
function checkboxGroup(opts) { return renderField({ ...opts, type: 'checkbox' }); }

function radioGroup({ name, label, options = [], value = '' }) {
  return `
    <div class="form-group">
      <label class="form-label">${esc(label)}</label>
      ${options.map(o => {
        const val = typeof o === 'string' ? o : o.value;
        const txt = typeof o === 'string' ? o : o.label;
        return `
          <label class="form-check">
            <input type="radio" name="${name}" value="${esc(val)}" ${String(val) === String(value) ? 'checked' : ''}/>
            <span>${esc(txt)}</span>
          </label>`;
      }).join('')}
    </div>`;
}

function switchGroup({ name, label, checked = false }) {
  return `
    <div class="form-group form-group-switch">
      <label class="switch">
        <input type="checkbox" name="${name}" ${checked ? 'checked' : ''}/>
        <span class="switch-slider"></span>
      </label>
      <span class="switch-label">${esc(label)}</span>
    </div>`;
}

function fieldError(msg) { return `<p class="form-help form-help-error">${esc(msg)}</p>`; }

/* ============================================================
   BADGES / PILLS / CHIPS
   ============================================================ */
function badge(text, variant = 'muted') {
  return `<span class="badge badge-${variant}">${esc(text)}</span>`;
}

function statusBadge(status) {
  const map = {
    active: 'success', completed: 'success', certified: 'success', paid: 'success', confirmed: 'success',
    approved: 'success', live: 'success', present: 'success', pass: 'success',
    pending: 'warning', pending_payment: 'warning', pending_expert_confirmation: 'warning',
    pending_approval: 'warning', paused: 'warning', on_hold: 'warning', scheduled: 'warning', late: 'warning',
    draft: 'muted', archived: 'muted', waitlisted: 'muted', invited: 'muted',
    cancelled: 'danger', failed: 'danger', rejected: 'danger', no_show: 'danger', absent: 'danger',
    expired: 'danger', withdrawn: 'danger', disputed: 'danger', breach: 'danger',
    in_session: 'info', in_grace: 'info', awaiting_completion: 'info', ready_now: 'info',
  };
  return badge(status, map[status] || 'muted');
}

function pill(text, colour = 'primary') {
  return `<span class="pill pill-${colour}">${esc(text)}</span>`;
}

function chip(text, onRemove) {
  return `<span class="chip">${esc(text)}${onRemove ? '<button class="chip-x" data-chip-remove>&times;</button>' : ''}</span>`;
}

function chipList(items = [], opts = {}) {
  return `<div class="chip-list">${items.map(i =>
    chip(typeof i === 'string' ? i : i.label, opts.removable)
  ).join('') || '<span class="text-muted">None</span>'}</div>`;
}

/* ============================================================
   AVATARS
   ============================================================ */
function avatar({ src, name = 'U', size = 40, online = false, badge: bdg = '', href } = {}) {
  const url = src || (CONFIG.DEFAULT_AVATAR + encodeURIComponent(name));
  const inner = `
    <span class="avatar ${online ? 'avatar-online' : ''}" style="width:${size}px;height:${size}px">
      <img src="${esc(url)}" alt="${esc(name)}" />
      ${bdg ? `<span class="avatar-badge">${bdg}</span>` : ''}
    </span>`;
  return href ? `<a href="${esc(href)}">${inner}</a>` : inner;
}

function avatarGroup(users = [], max = 4, size = 32) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return `
    <div class="avatar-group">
      ${shown.map(u => avatar({ src: u.avatar_url, name: u.name || 'U', size })).join('')}
      ${extra > 0 ? `<span class="avatar avatar-more" style="width:${size}px;height:${size}px">+${extra}</span>` : ''}
    </div>`;
}

/* ============================================================
   PROGRESS
   ============================================================ */
function progressBar(value = 0, max = 100, opts = {}) {
  const pct = Math.max(0, Math.min(100, (Number(value) || 0) / (Number(max) || 100) * 100));
  const cls = opts.variant ? `progress-${opts.variant}` : '';
  return `
    <div class="progress ${cls}" ${opts.label ? `title="${esc(opts.label)}"` : ''}>
      <div class="progress-bar" style="width:${pct.toFixed(1)}%"></div>
      ${opts.showValue ? `<span class="progress-value">${pct.toFixed(0)}%</span>` : ''}
    </div>`;
}

function circularProgress(value = 0, size = 64, opts = {}) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const colour = opts.colour || 'currentColor';
  return `
    <svg class="circular-progress" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="rgba(127,127,127,0.2)" stroke-width="6" fill="none"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="${colour}" stroke-width="6" fill="none"
              stroke-dasharray="${dash} ${c}" stroke-linecap="round"
              transform="rotate(-90 ${size/2} ${size/2})"/>
      <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
            font-size="${size * 0.28}" fill="currentColor">${pct.toFixed(0)}%</text>
    </svg>`;
}

/* ============================================================
   EMPTY STATES
   ============================================================ */
function emptyState({ icon = 'fa-inbox', title = 'Nothing here yet', subtitle = '', actionLabel, actionAttrs = '', actionId } = {}) {
  return `
    <div class="empty-state">
      <i class="fas ${icon}"></i>
      <p class="empty-state-title">${esc(title)}</p>
      ${subtitle ? `<p class="empty-state-subtitle">${esc(subtitle)}</p>` : ''}
      ${actionLabel ? `<button class="btn btn-primary btn-sm" ${actionId ? `id="${actionId}"` : ''} ${actionAttrs}>${esc(actionLabel)}</button>` : ''}
    </div>`;
}

function noResultsRow(colspan = 6, message = 'No records found') {
  return `<tr><td colspan="${colspan}" class="empty-row">${esc(message)}</td></tr>`;
}

function errorState({ title = 'Something went wrong', message = '', onRetry }) {
  const id = 'err-retry-' + Math.random().toString(36).slice(2, 8);
  if (onRetry) setTimeout(() => document.querySelector(`#${id}`)?.addEventListener('click', onRetry, { once: true }), 0);
  return `
    <div class="empty-state empty-state-error">
      <i class="fas fa-triangle-exclamation"></i>
      <p class="empty-state-title">${esc(title)}</p>
      ${message ? `<p class="empty-state-subtitle">${esc(message)}</p>` : ''}
      ${onRetry ? `<button id="${id}" class="btn btn-secondary btn-sm">Retry</button>` : ''}
    </div>`;
}

/* ============================================================
   TABS
   ============================================================ */
function tabBar(tabs = [], active, opts = {}) {
  return `
    <div class="tab-bar ${opts.className || ''}">
      ${tabs.map(t => {
        const id = typeof t === 'string' ? t : t.id;
        const label = typeof t === 'string' ? t : t.label;
        const icon = typeof t === 'string' ? null : t.icon;
        return `
          <button class="tab-btn ${id === active ? 'tab-btn-active' : ''}" data-tab-btn="${esc(id)}">
            ${icon ? `<i class="fas ${icon}"></i>` : ''} ${esc(label)}
          </button>`;
      }).join('')}
    </div>`;
}

function initTabs(host, onSelect) {
  if (!host) return;
  host.querySelectorAll('[data-tab-btn]').forEach(b => b.onclick = () => {
    const tab = b.dataset.tabBtn;
    host.querySelectorAll('[data-tab-btn]').forEach(x => x.classList.toggle('tab-btn-active', x === b));
    onSelect?.(tab);
  });
}

/* ============================================================
   TOOLTIPS
   ============================================================ */
function tooltipAttr(text, position = 'top') {
  return `data-tooltip="${esc(text)}" data-tooltip-pos="${position}"`;
}

function initTooltips() {
  if (initTooltips._done) return;
  initTooltips._done = true;
  document.addEventListener('mouseover', e => {
    const t = e.target.closest('[data-tooltip]');
    if (!t) return;
    let el = document.querySelector('#global-tooltip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-tooltip';
      el.className = 'tooltip';
      document.body.appendChild(el);
    }
    el.textContent = t.dataset.tooltip;
    el.dataset.pos = t.dataset.tooltipPos || 'top';
    const r = t.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    el.style.top = `${r.top + window.scrollY - rect.height - 8}px`;
    el.style.left = `${r.left + window.scrollX + r.width / 2 - rect.width / 2}px`;
    el.classList.add('visible');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('[data-tooltip]')) {
      document.querySelector('#global-tooltip')?.classList.remove('visible');
    }
  });
}

/* ============================================================
   DROPDOWN
   ============================================================ */
function dropdown({ id, triggerLabel, triggerIcon = 'fa-ellipsis-vertical', items = [], align = 'right' }) {
  const did = id || 'dd-' + Math.random().toString(36).slice(2, 8);
  setTimeout(() => {
    const trig = document.querySelector(`[data-dd-trigger="${did}"]`);
    const menu = document.querySelector(`[data-dd-menu="${did}"]`);
    if (!trig || !menu) return;
    trig.onclick = e => {
      e.stopPropagation();
      document.querySelectorAll('[data-dd-menu]').forEach(m => { if (m !== menu) m.classList.add('hidden'); });
      menu.classList.toggle('hidden');
    };
    menu.querySelectorAll('[data-dd-item]').forEach(btn => btn.onclick = async () => {
      const item = items[Number(btn.dataset.ddItem)];
      menu.classList.add('hidden');
      if (item?.onClick) {
        try { await item.onClick(); } catch (err) { showToast(err.message, 'error'); }
      }
    });
    document.addEventListener('click', () => menu.classList.add('hidden'), { once: true });
  }, 0);

  return `
    <div class="dropdown">
      <button class="icon-btn" data-dd-trigger="${did}">
        <i class="fas ${triggerIcon}"></i> ${triggerLabel ? esc(triggerLabel) : ''}
      </button>
      <div class="dropdown-menu dropdown-${align} hidden" data-dd-menu="${did}">
        ${items.map((it, i) => `
          <button class="dropdown-item ${it.danger ? 'dropdown-item-danger' : ''}" data-dd-item="${i}">
            ${it.icon ? `<i class="fas ${it.icon}"></i>` : ''} ${esc(it.label)}
          </button>`).join('')}
      </div>
    </div>`;
}

/* ============================================================
   GENERIC DATA TABLE
   ============================================================ */
function dataTable({ columns = [], rows = [], page = 1, per = 20, total = 0, resource = '', empty = null, onRowClick }) {
  const colspan = columns.length || 1;
  const head = columns.map(c => `<th class="${c.align === 'right' ? 'text-right' : ''}">${esc(c.label)}</th>`).join('');
  const body = rows.length
    ? rows.map((row, i) => `
        <tr ${onRowClick ? `data-row-index="${i}" class="row-clickable"` : ''}>
          ${columns.map(c => `<td class="${c.align === 'right' ? 'text-right' : ''}">${
            typeof c.render === 'function' ? c.render(row) : esc(String(row[c.key] ?? ''))
          }</td>`).join('')}
        </tr>`).join('')
    : `<tr><td colspan="${colspan}">${empty || emptyState({ title: 'No records found' })}</td></tr>`;

  if (onRowClick) {
    setTimeout(() => {
      document.querySelectorAll('[data-row-index]').forEach(tr => {
        tr.onclick = e => {
          if (e.target.closest('button, a, input, select')) return;
          onRowClick(rows[Number(tr.dataset.rowIndex)]);
        };
      });
    }, 0);
  }

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    ${paginationBarAdvanced(resource, page, per, total)}`;
}

function tableSkeleton(rows = 5, cols = 4) { return skeletonTable(rows, cols); }

function sortableHeader(key, label, currentSort = {}, resource = '') {
  const active = currentSort.key === key;
  const dir = active ? (currentSort.dir === 'asc' ? 'desc' : 'asc') : 'asc';
  const icon = !active ? 'fa-sort' : (currentSort.dir === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
  return `
    <th class="th-sortable ${active ? 'th-sortable-active' : ''}"
        data-action="sort" data-resource="${resource}" data-sort-key="${key}" data-sort-dir="${dir}">
      ${esc(label)} <i class="fas ${icon}"></i>
    </th>`;
}

/* ============================================================
   BREADCRUMBS
   ============================================================ */
function breadcrumbs(items = []) {
  return `
    <nav class="breadcrumbs">
      ${items.map((it, i) => {
        const last = i === items.length - 1;
        return last
          ? `<span class="breadcrumb-current">${esc(it.label)}</span>`
          : `<a href="${esc(it.href || '#')}" class="breadcrumb-link">${esc(it.label)}</a>
             <i class="fas fa-chevron-right breadcrumb-sep"></i>`;
      }).join('')}
    </nav>`;
}

/* ============================================================
   STEPPER / WIZARD
   ============================================================ */
function stepper(steps = [], current = 0) {
  return `
    <ol class="stepper">
      ${steps.map((s, i) => {
        const label = typeof s === 'string' ? s : s.label;
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        return `
          <li class="stepper-item stepper-${state}">
            <span class="stepper-circle">${i < current ? '<i class="fas fa-check"></i>' : i + 1}</span>
            <span class="stepper-label">${esc(label)}</span>
          </li>`;
      }).join('')}
    </ol>`;
}

/* ============================================================
   COPY / SHARE
   ============================================================ */
async function copyToClipboard(text, successMsg = 'Copied to clipboard') {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showToast(successMsg, 'success', 1800);
    return true;
  } catch (e) {
    showToast('Copy failed', 'error');
    return false;
  }
}

async function shareLink({ title = document.title, url = location.href, text = '' } = {}) {
  if (navigator.share) {
    try { await navigator.share({ title, url, text }); return true; } catch (_) {}
  }
  return copyToClipboard(url, 'Link copied');
}

/* ============================================================
   FORMATTING FALLBACKS
   (safe additive helpers — only new names, won't shadow 02-utils)
   ============================================================ */
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function formatDuration(seconds) {
  seconds = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(d, opts = {}) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', ...opts });
}

function formatTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function truncate(str, len = 60) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}

/* ============================================================
   ONE-SHOT UI BOOTSTRAP
   ============================================================ */
function initUI() {
  ensureToastContainer();
  initTheme();
  initTooltips();
}

/* Auto-init on load (safe — idempotent) */
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI, { once: true });
  } else {
    initUI();
  }
}