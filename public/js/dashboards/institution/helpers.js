/* ============================================================
   ExpertHub 2.0 — Institution Helpers
   Reusable utilities: safe formatting, tables, pagination,
   validation, permissions, accessible charts, CSV export.
   Must load AFTER config.js and state.js.
   ============================================================ */

/* ── Number / string safety ─────────────────────────────────── */
function safeNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function safeStr(v, def = '') {
  if (v == null) return def;
  return String(v);
}

function safeGet(obj, path, def = undefined) {
  if (!obj) return def;
  const parts = String(path).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return def;
    cur = cur[p];
  }
  return cur == null ? def : cur;
}

function isEmpty(v) {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, safeNum(n)));
}

/* ── Formatting ─────────────────────────────────────────────── */
function formatDelta(value, suffix = '%') {
  const n = safeNum(value);
  if (n === 0) return `<span class="delta delta-neutral">0${suffix}</span>`;
  const sign = n > 0 ? '+' : '';
  const cls = n > 0 ? 'delta-positive' : 'delta-negative';
  return `<span class="delta ${cls}">${sign}${n}${suffix}</span>`;
}

function formatPct(part, total, digits = 0) {
  const t = safeNum(total);
  if (!t) return '0%';
  return `${((safeNum(part) / t) * 100).toFixed(digits)}%`;
}

function capitalize(s) {
  const str = safeStr(s);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncate(s, len = 80) {
  const str = safeStr(s);
  return str.length <= len ? str : `${str.slice(0, len - 1)}…`;
}

function pluralize(count, singular, plural) {
  const n = safeNum(count);
  return `${n} ${n === 1 ? singular : (plural || singular + 's')}`;
}

function slugify(s) {
  return safeStr(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ── Collection helpers ─────────────────────────────────────── */
function groupBy(arr, keyFn) {
  const out = {};
  (arr || []).forEach(item => {
    const k = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
    (out[k] = out[k] || []).push(item);
  });
  return out;
}

function sortBy(arr, keyFn, dir = 'asc') {
  const mult = dir === 'desc' ? -1 : 1;
  return (arr || []).slice().sort((a, b) => {
    const av = typeof keyFn === 'function' ? keyFn(a) : a[keyFn];
    const bv = typeof keyFn === 'function' ? keyFn(b) : b[keyFn];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av > bv ? mult : av < bv ? -mult : 0;
  });
}

function uniqueBy(arr, keyFn) {
  const seen = new Set();
  return (arr || []).filter(item => {
    const k = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function debounce(fn, ms = 300) {
  let t;
  return function debounced(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

function throttle(fn, ms = 200) {
  let last = 0;
  return function throttled(...args) {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/* ── Colour helpers ─────────────────────────────────────────── */
function hexToRgba(hex, alpha = 1) {
  const h = safeStr(hex).replace('#', '');
  if (h.length !== 6) return `rgba(30,58,138,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── Existing helper refinements ────────────────────────────── */
function pctOf(part, total) {
  const t = Number(total) || 0;
  if (!t) return 0;
  return Math.min(100, Math.round((Number(part) || 0) / t * 100));
}

function renderMiniBar(value, colour = 'var(--brand)') {
  const v = clamp(value, 0, 100);
  return `<span class="mini-bar" style="display:inline-block;vertical-align:middle;width:60px;height:6px;background:var(--surface-3);border-radius:3px;overflow:hidden;margin-right:6px">
    <span style="display:block;height:100%;width:${v}%;background:${colour}"></span>
  </span>`;
}

function riskLevelColour(level) {
  return ({
    low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#dc2626',
  })[level] || '#6b7280';
}

function budgetUtilClass(pct) {
  if (pct >= 95) return 'budget-critical';
  if (pct >= 80) return 'budget-warning';
  return 'budget-ok';
}

function examIntegrityLabel(score) {
  if (score >= 90) return 'Clean';
  if (score >= 70) return 'Review';
  return 'Flagged';
}

function truncateHash(hash, len = 10) {
  if (!hash) return '—';
  const s = String(hash);
  return s.length <= len * 2 ? s : `${s.slice(0, len)}…${s.slice(-len)}`;
}

/* ── Permission checks ──────────────────────────────────────── */
function hasInstitutionPermission(permission, user = currentUser) {
  if (!user) return false;
  const role = user.institution_role || user.role || 'viewer';
  const granted = (CONFIG.ROLE_PERMISSIONS[role] || []).concat(
    user.institution_permissions || []
  );
  if (granted.includes('*')) return true;
  if (granted.includes(permission)) return true;

  const [resource, action] = permission.split(':');
  if (granted.includes(`${resource}:*`)) return true;
  if (!action && granted.includes('*:read')) return true;
  if (action === 'read' && granted.includes('*:read')) return true;

  return false;
}

function requireInstitutionPermission(permission) {
  if (!hasInstitutionPermission(permission)) {
    showToast(`You don't have permission to ${permission}`, 'error');
    return false;
  }
  return true;
}

/* ── Form validation ────────────────────────────────────────── */
const Validators = {
  required: (msg = 'This field is required') =>
    v => (isEmpty(v) ? msg : null),

  email: (msg = 'Invalid email address') =>
    v => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : msg),

  url: (msg = 'Invalid URL') =>
    v => (!v || /^https?:\/\/[^\s]+$/i.test(v) ? null : msg),

  minLength: (n, msg) =>
    v => (v && String(v).length < n ? (msg || `Minimum ${n} characters`) : null),

  maxLength: (n, msg) =>
    v => (v && String(v).length > n ? (msg || `Maximum ${n} characters`) : null),

  min: (n, msg) =>
    v => (v != null && Number(v) < n ? (msg || `Must be at least ${n}`) : null),

  max: (n, msg) =>
    v => (v != null && Number(v) > n ? (msg || `Must be at most ${n}`) : null),

  pattern: (re, msg = 'Invalid format') =>
    v => (!v || re.test(v) ? null : msg),
};

function validateForm(values, rules) {
  const errors = {};
  Object.keys(rules).forEach(field => {
    const fieldRules = Array.isArray(rules[field]) ? rules[field] : [rules[field]];
    for (const rule of fieldRules) {
      const err = rule(values[field]);
      if (err) { errors[field] = err; break; }
    }
  });
  return { valid: Object.keys(errors).length === 0, errors };
}

function renderFieldError(fieldName) {
  return `<p class="form-error" data-error-for="${esc(fieldName)}" style="color:var(--danger);font-size:.78rem;margin-top:4px;display:none"></p>`;
}

function showFormErrors(errors) {
  document.querySelectorAll('[data-error-for]').forEach(el => {
    el.style.display = 'none';
    el.textContent = '';
  });
  Object.entries(errors).forEach(([field, msg]) => {
    const el = document.querySelector(`[data-error-for="${field}"]`);
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  });
}

/* ── Standardized empty states ──────────────────────────────── */
function renderEmptyState(opts = {}) {
  const {
    icon = 'fa-inbox',
    title = 'Nothing here yet',
    description = '',
    actionLabel = '',
    actionAttrs = '',
    compact = false,
  } = opts;
  return `
    <div class="empty-state" ${compact ? 'style="padding:24px 12px"' : ''}>
      <i class="fas ${esc(icon)}"></i>
      <h3>${esc(title)}</h3>
      ${description ? `<p>${esc(description)}</p>` : ''}
      ${actionLabel ? `<button class="btn btn-primary" ${actionAttrs}>${esc(actionLabel)}</button>` : ''}
    </div>`;
}

function renderErrorState(opts = {}) {
  const {
    title = 'Something went wrong',
    description = 'Please try again.',
    onRetry = '',
  } = opts;
  return `
    <div class="empty-state empty-state-error">
      <i class="fas fa-triangle-exclamation" style="color:var(--danger)"></i>
      <h3>${esc(title)}</h3>
      <p>${esc(description)}</p>
      ${onRetry ? `<button class="btn btn-secondary" ${onRetry}><i class="fas fa-rotate"></i> Retry</button>` : ''}
    </div>`;
}

function renderSkeleton(lines = 3) {
  const items = Array.from({ length: lines }).map(() =>
    `<div class="skeleton-line" style="height:12px;background:var(--surface-3);border-radius:6px;margin:8px 0;width:${60 + Math.random() * 40}%"></div>`
  ).join('');
  return `<div class="skeleton-block">${items}</div>`;
}

/* ── CSV export ─────────────────────────────────────────────── */
function toCsv(rows, columns) {
  if (!Array.isArray(rows) || !rows.length) return '';
  const cols = columns || Object.keys(rows[0]);
  const escape = v => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.map(escape).join(',');
  const body = rows.map(row => cols.map(c => escape(row[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}

function downloadCsv(filename, rows, columns) {
  const csv = toCsv(rows, columns);
  if (!csv) { showToast('No data to export', 'info'); return; }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `export-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `export-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── Pagination ─────────────────────────────────────────────── */
function paginationBar(viewKey, currentPage, perPage, total) {
  const totalPages = Math.max(1, Math.ceil(safeNum(total) / Math.max(1, safeNum(perPage))));
  const cur = clamp(currentPage, 1, totalPages);
  const start = (cur - 1) * perPage + 1;
  const end = Math.min(cur * perPage, total);

  const pageBtn = (p, label) => `
    <button class="btn btn-xs ${p === cur ? 'btn-primary' : 'btn-secondary'}"
            data-action="goto-page" data-view="${esc(viewKey)}" data-page="${p}"
            ${p === cur ? 'disabled' : ''}>${label}</button>`;

  const pageNums = [];
  const push = n => pageNums.push(pageBtn(n, n));
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) push(i);
  } else {
    push(1);
    if (cur > 3) pageNums.push('<span class="page-ellipsis">…</span>');
    for (let i = Math.max(2, cur - 1); i <= Math.min(totalPages - 1, cur + 1); i++) push(i);
    if (cur < totalPages - 2) pageNums.push('<span class="page-ellipsis">…</span>');
    push(totalPages);
  }

  return `
    <div class="pagination-bar" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:16px">
      <div style="font-size:.85rem;color:var(--text-muted)">
        Showing ${total ? start : 0}–${end} of ${total || 0}
      </div>
      <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
        ${pageBtn(cur - 1, '<i class="fas fa-chevron-left"></i>')}
        ${pageNums.join('')}
        ${pageBtn(cur + 1, '<i class="fas fa-chevron-right"></i>')}
        <select class="form-select" style="width:auto;margin-left:8px"
                data-action="change-page-size" data-view="${esc(viewKey)}">
          ${CONFIG.PAGE_SIZE_OPTIONS.map(n =>
            `<option value="${n}" ${n === perPage ? 'selected' : ''}>${n}/page</option>`).join('')}
        </select>
      </div>
    </div>`;
}

function paginateList(list, viewKey) {
  const perPage = safeNum(S.pageSize[viewKey], CONFIG.PAGE_SIZE_DEFAULT);
  const cur = safeNum(S.page[viewKey], 1);
  const start = (cur - 1) * perPage;
  return {
    rows: (list || []).slice(start, start + perPage),
    total: (list || []).length,
    currentPage: cur,
    perPage,
  };
}

/* ── Safe chart wrapper (replaces demo data with empty state) ─ */
function renderSafeChart(canvasId, config, emptyMessage) {
  const el = document.getElementById(canvasId);
  if (!el || el.dataset.rendered) return;
  if (!window.Chart) return;

  const hasData = config?.data?.datasets?.some(ds =>
    (ds.data || []).some(v => v != null && v !== 0)
  ) || (config?.data?.labels || []).length > 0;

  el.dataset.rendered = '1';

  if (!hasData) {
    const parent = el.parentElement;
    if (parent) {
      el.style.display = 'none';
      const placeholder = document.createElement('div');
      placeholder.className = 'chart-empty-state';
      placeholder.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;color:var(--text-muted);gap:8px';
      placeholder.innerHTML = `
        <i class="fas fa-chart-line" style="font-size:1.5rem;opacity:.4"></i>
        <p style="font-size:.85rem;margin:0">${esc(emptyMessage || 'No data available yet')}</p>`;
      parent.appendChild(placeholder);
    }
    return;
  }

  try {
    const ariaLabel = config?.options?.plugins?.title?.text
      || config?.data?.datasets?.[0]?.label
      || 'Institution chart';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', ariaLabel);
    new Chart(el, config);
  } catch (err) {
    console.warn('Chart render failed:', canvasId, err);
  }
}

/* ── Blockchain section (used by reports & certifications) ─── */
function renderBlockchainSection() {
  const certs = S.blockchainCerts || [];
  return `
    <section class="panel">
      <h3 class="panel-title"><i class="fas fa-cube"></i> Blockchain-Verified Certificates</h3>
      <p class="form-hint">
        Certificates issued with blockchain anchoring provide permanent, tamper-proof verification.
        <strong>Only records with a confirmed on-chain hash are shown.</strong>
      </p>
      ${certs.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Serial</th><th>Trainee</th><th>Blockchain Hash</th><th>Issued</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${certs.map(c => `
                <tr>
                  <td><code class="code">${esc(c.serial)}</code></td>
                  <td>${esc(c.trainee_name)}</td>
                  <td><code class="code" title="${esc(c.blockchain_hash)}">${truncateHash(c.blockchain_hash, 10)}</code></td>
                  <td>${fmtDate(c.issued_at)}</td>
                  <td><a class="btn btn-info btn-xs" href="/verify/${esc(c.serial)}" target="_blank" rel="noopener">Verify</a></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : renderEmptyState({
            icon: 'fa-cube',
            title: 'No blockchain-verified certificates yet',
            description: 'Enable the blockchain feature flag and issue certificates to see on-chain records here.',
            compact: true,
          })}
    </section>`;
}

/* ── Generic data table renderer ────────────────────────────── */
function renderDataTable(opts = {}) {
  const {
    columns = [],
    rows = [],
    empty = {},
    rowKey = (r, i) => r.id ?? i,
    rowClass = () => '',
  } = opts;

  if (!rows.length) {
    return renderEmptyState(empty);
  }

  const renderCell = (row, col) => {
    if (typeof col.render === 'function') return col.render(row);
    const v = safeGet(row, col.key);
    return v == null || v === '' ? '—' : esc(v);
  };

  return `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>${columns.map(c =>
            `<th ${c.width ? `style="width:${c.width}"` : ''}>${esc(c.label)}</th>`
          ).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map((row, i) => `
            <tr class="${rowClass(row)}" data-key="${esc(String(rowKey(row, i)))}">
              ${columns.map(col => `<td>${renderCell(row, col)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

/* ── Notifications ──────────────────────────────────────────── */
function addNotification(notification) {
  S.notifications.unshift({
    id: uid('notif'),
    read: false,
    created_at: new Date().toISOString(),
    ...notification,
  });
  S.unreadNotifications = S.notifications.filter(n => !n.read).length;
}

function markNotificationRead(id) {
  const n = S.notifications.find(x => x.id === id);
  if (n && !n.read) {
    n.read = true;
    S.unreadNotifications = S.notifications.filter(x => !x.read).length;
  }
}
