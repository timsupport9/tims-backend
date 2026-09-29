/* ============================================================
   ExpertHub 2.0 — 02-utils.js
   Pure helper functions. No state mutation. No DOM writes on load.
   ============================================================ */

/* ---------- UTILS ---------- */
const $  = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
const esc = s => (s===null||s===undefined) ? '' : String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const fmtCur = (n, cur=CONFIG.CURRENCY) => {
  try { return new Intl.NumberFormat('en-US',{style:'currency',currency:cur,maximumFractionDigits:2}).format(Number(n)||0); }
  catch { return `${CONFIG.CURRENCY_SYMBOL}${(Number(n)||0).toFixed(2)}`; }
};
const fmtDate = d => { if (!d) return '—'; const x = new Date(d); return isNaN(x)?'—':x.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); };
const fmtDT   = d => { if (!d) return '—'; return new Date(d).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); };
const timeAgo = d => {
  if (!d) return '';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  if (s < 604800) return Math.floor(s/86400) + 'd ago';
  return fmtDate(d);
};
const avatar = u => u?.avatar || (CONFIG.DEFAULT_AVATAR + encodeURIComponent(u?.name || u?.email || 'User'));
const statusClass = s => `status status-${String(s||'unknown').toLowerCase().replace(/\s+/g,'_')}`;
const uid = () => Math.random().toString(36).slice(2,10);
const debounce = (fn, ms=350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const pct = n => `${Math.max(0, Math.min(100, Number(n)||0))}%`;

function downloadCsv(filename, rows) {
  if (!rows || !rows.length) return showToast('Nothing to export', 'warning');
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')].concat(
    rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(','))
  ).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function hexToRgba(hex, alpha) {
  const h = String(hex || '#1e3a8a').replace('#','');
  const full = h.length === 3 ? h.split('').map(c => c+c).join('') : h;
  const r = parseInt(full.slice(0,2), 16);
  const g = parseInt(full.slice(2,4), 16);
  const b = parseInt(full.slice(4,6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatBytes(b) {
  if (!b) return '0 B';
  const units = ['B','KB','MB','GB'];
  let i = 0;
  while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/* ---------- CONSULTATION UTILS ---------- */
function fmtInTz(date, tz = 'UTC', opts = {}) {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz, month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', ...opts,
    }).format(new Date(date));
  } catch { return fmtDT(date); }
}

function slotLabel(slot) {
  return `${fmtInTz(slot.start_time)} – ${fmtInTz(slot.end_time, 'UTC', { hour: '2-digit', minute: '2-digit' })}`;
}

function timeUntil(date) {
  if (!date) return '';
  const ms = new Date(date) - Date.now();
  if (ms < 0) return 'now';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

function consultationStatusClass(s) {
  const map = {
    pending_payment: 'status-pending',
    pending_expert_confirmation: 'status-pending',
    confirmed: 'status-active',
    scheduled: 'status-info',
    in_grace: 'status-warning',
    in_session: 'status-active',
    awaiting_completion: 'status-info',
    completed: 'status-active',
    no_show: 'status-rejected',
    cancelled: 'status-cancelled',
    expired: 'status-archived',
    disputed: 'status-rejected',
  };
  return map[s] || 'status-pending';
}

function refundPreview(scheduledAt) {
  if (!scheduledAt) return { pct: 100, label: 'Full refund available' };
  const hours = (new Date(scheduledAt) - Date.now()) / 3600000;
  if (hours > 24) return { pct: 100, label: 'More than 24h notice — full refund' };
  if (hours > 2) return { pct: 50, label: '2–24h notice — 50% refund' };
  return { pct: 0, label: 'Less than 2h notice — no refund' };
}

/* ---------- E-SCHOOL UTILS ---------- */
function xpForLevel(level) { return Math.pow(level - 1, 2) * 100; }
function levelFromXP(xp) { return Math.max(1, Math.floor(Math.sqrt((Number(xp)||0) / 100)) + 1); }
function xpProgressPercent(xp) {
  const level = levelFromXP(xp);
  const prev = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return Math.round(((xp - prev) / (next - prev)) * 100);
}

function lessonIcon(type) {
  return {
    video: 'fa-play-circle',
    reading: 'fa-book-open',
    quiz: 'fa-question-circle',
    assignment: 'fa-file-signature',
    live: 'fa-video',
    code: 'fa-code',
    download: 'fa-download',
  }[type] || 'fa-circle';
}

function lessonStatusLabel(status) {
  return {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    completed: 'Completed',
    skipped: 'Skipped',
  }[status] || status;
}

function timeAgoOrDate(d) { return timeAgo(d); }

function badgeIconFor(code) {
  const b = CONFIG.BADGES[code];
  return b ? b.icon : 'fa-medal';
}
function badgeNameFor(code) {
  const b = CONFIG.BADGES[code];
  return b ? b.name : code;
}

/* ---------- INSTITUTION UTILS ---------- */
function pctOf(value, total) {
  if (!total) return 0;
  return Math.round((Number(value) / Number(total)) * 100);
}

function campusLabel(id) {
  const c = (S.campuses || []).find(x => x.id === id);
  return c ? c.name : '—';
}

function riskLevelColour(level) {
  return { low:'#22c55e', medium:'#eab308', high:'#f97316', critical:'#dc2626' }[level] || '#94a3b8';
}

function budgetUtilClass(pct) {
  if (pct >= 95) return 'budget-critical';
  if (pct >= 80) return 'budget-warning';
  if (pct >= 50) return 'budget-ok';
  return 'budget-low';
}

function examIntegrityLabel(score) {
  if (score == null) return 'Not Scored';
  if (score >= 90) return 'Clean';
  if (score >= 70) return 'Minor Flags';
  if (score >= 50) return 'Review Needed';
  return 'Invalidated';
}

function renderMiniBar(pct, colour) {
  return `
    <div class="mini-bar">
      <span style="width:${Math.max(0, Math.min(100, pct))}%;background:${colour || 'var(--brand)'}"></span>
    </div>`;
}

function truncateHash(hash, chars = 12) {
  if (!hash) return '—';
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}…${hash.slice(-chars)}`;
}
