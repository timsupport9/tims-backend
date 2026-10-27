/* ============================================================
   ExpertHub 2.0 — Integrations & API
   LMS/HRIS sync, webhooks with retry queues, API monitoring,
   key rotation, sandbox testing, integration health dashboard.
   ============================================================ */

function instIntegrations() {
  const keys = S.apiKeys || [];
  const hooks = S.webhooks || [];
  const integrations = S.integrationConnections || [];

  const canWrite = hasInstitutionPermission('integrations:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Integrations & API</span></div>
    <section class="page-header">
      <h1 class="page-title">Integrations & API</h1>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-plug"></i>
      <div>Build integrations with your HRIS, LMS or custom apps.
        API keys and webhooks are scoped to your institution.</div>
    </div>

    <section class="stat-grid">
      ${statCard('API Keys', keys.filter(k => !k.revoked).length, `${keys.filter(k => k.revoked).length} revoked`, 'fa-key', 'blue')}
      ${statCard('Webhooks', hooks.filter(h => h.active).length, `${hooks.length - hooks.filter(h => h.active).length} inactive`, 'fa-webhook', 'purple')}
      ${statCard('Active Connections', integrations.filter(i => i.status === 'connected').length, '', 'fa-link', 'green')}
      ${statCard('API Health', S.apiStatus.healthy ? 'Healthy' : 'Degraded', `${S.apiStatus.consecutiveFailures || 0} failures`, 'fa-heart-pulse', S.apiStatus.healthy ? 'green' : 'red')}
    </section>

    ${integrations.length ? `
      <section class="panel">
        <h3 class="panel-title"><i class="fas fa-link"></i> Connected Systems</h3>
        <div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
          ${integrations.map(i => `
            <div class="dashboard-card" style="padding:14px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong>${esc(i.name)}</strong>
                <span class="chip chip-${i.status === 'connected' ? 'green' : i.status === 'error' ? 'red' : 'neutral'}"
                      style="font-size:.7rem">${esc(i.status)}</span>
              </div>
              <p style="font-size:.78rem;color:var(--text-muted);margin-top:6px">
                ${esc(i.type || '')} · last sync ${i.last_sync_at ? timeAgo(i.last_sync_at) : 'never'}
              </p>
              <button class="btn btn-secondary btn-xs btn-block" style="margin-top:8px"
                      data-action="test-integration" data-id="${i.id}">Test</button>
            </div>`).join('')}
        </div>
      </section>` : ''}

    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 class="panel-title" style="margin:0">API Keys</h3>
        ${canWrite ? `
          <button class="btn btn-primary btn-sm" data-action="create-api-key">
            <i class="fas fa-plus"></i> New API Key</button>` : ''}
      </div>
      ${keys.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>Name</th><th>Prefix</th><th>Scopes</th>
              <th>Last Used</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${keys.map(k => `
                <tr>
                  <td>${esc(k.name)}</td>
                  <td><code class="code">${esc(k.prefix)}…</code></td>
                  <td>${(k.scopes || []).slice(0, 3).map(s =>
                    `<span class="chip chip-neutral" style="margin:2px">${esc(s)}</span>`).join('')}
                    ${(k.scopes || []).length > 3 ? `<span class="chip chip-neutral">+${k.scopes.length - 3}</span>` : ''}</td>
                  <td>${k.last_used_at ? timeAgo(k.last_used_at) : 'Never'}</td>
                  <td>${k.revoked ? '<span class="status-rejected">Revoked</span>' : '<span class="status-active">Active</span>'}</td>
                  <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs" data-action="copy-api-key" data-id="${k.id}">
                      <i class="fas fa-copy"></i></button>
                    ${canWrite ? `
                      <button class="btn btn-secondary btn-xs" data-action="rotate-api-key" data-id="${k.id}"
                              title="Rotate key"><i class="fas fa-arrows-rotate"></i></button>
                      ${!k.revoked ? `
                        <button class="btn btn-danger btn-xs" data-action="revoke-api-key" data-id="${k.id}">
                          Revoke</button>` : ''}
                    ` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<p class="empty-row">No API keys yet</p>'}
    </section>

    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 class="panel-title" style="margin:0">Webhooks</h3>
        ${canWrite ? `
          <button class="btn btn-primary btn-sm" data-action="create-webhook">
            <i class="fas fa-plus"></i> New Webhook</button>` : ''}
      </div>
      ${hooks.length ? `
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr>
              <th>URL</th><th>Events</th><th>Failures</th>
              <th>Status</th><th>Last Fired</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${hooks.map(h => `
                <tr>
                  <td><code class="code">${esc(truncate(h.url, 40))}</code></td>
                  <td>
                    ${(h.events || []).slice(0, 2).map(e =>
                      `<span class="chip chip-neutral" style="margin:2px">${esc(e)}</span>`).join('')}
                    ${(h.events || []).length > 2 ? `<span class="chip chip-neutral">+${h.events.length - 2}</span>` : ''}
                  </td>
                  <td>${safeNum(h.consecutive_failures)}
                    ${safeNum(h.consecutive_failures) > 0
                      ? `<span class="chip chip-red" style="font-size:.65rem">retrying</span>`
                      : ''}</td>
                  <td>${h.active ? '<span class="status-active">Active</span>' : '<span class="status-archived">Inactive</span>'}</td>
                  <td>${h.last_fired_at ? timeAgo(h.last_fired_at) : 'Never'}</td>
                  <td class="actions-cell">
                    <button class="btn btn-info btn-xs" data-action="test-webhook" data-id="${h.id}">
                      Test</button>
                    ${safeNum(h.consecutive_failures) > 0 ? `
                      <button class="btn btn-secondary btn-xs" data-action="view-webhook-queue" data-id="${h.id}"
                              title="Retry queue"><i class="fas fa-list"></i></button>` : ''}
                    ${canWrite ? `
                      <button class="btn btn-secondary btn-xs" data-action="edit-webhook" data-id="${h.id}">
                        Edit</button>
                      <button class="btn btn-danger btn-xs" data-action="delete-webhook" data-id="${h.id}">
                        Delete</button>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<p class="empty-row">No webhooks configured</p>'}
    </section>
  `;
}
