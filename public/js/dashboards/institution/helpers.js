/* ============================================================
   ExpertHub 2.0 — Institution Helpers
   Shared utility functions used across institution modules.
   ============================================================ */

function pctOf(part, total) {
  const t = Number(total) || 0;
  if (!t) return 0;
  return Math.min(100, Math.round((Number(part) || 0) / t * 100));
}

function renderMiniBar(value, colour = 'var(--brand)') {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return `<span class="mini-bar" style="display:inline-block;vertical-align:middle;width:60px;height:6px;background:var(--surface-3);border-radius:3px;overflow:hidden;margin-right:6px">
    <span style="display:block;height:100%;width:${v}%;background:${colour}"></span>
  </span>`;
}

function riskLevelColour(level) {
  return ({
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    critical: '#dc2626',
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

function renderBlockchainSection() {
  const certs = S.blockchainCerts || [];
  return `
    <section class="panel">
      <h3 class="panel-title"><i class="fas fa-cube"></i> Blockchain-Verified Certificates</h3>
      <p class="form-hint">
        Certificates issued with blockchain anchoring provide permanent, tamper-proof verification.
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
                  <td><a class="btn btn-info btn-xs" href="/verify/${esc(c.serial)}" target="_blank">Verify</a></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="empty-row">No blockchain-verified certificates yet</p>'}
    </section>`;
}
