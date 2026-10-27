/* ============================================================
   Institution — Integrations & API
   ============================================================ */
function instIntegrations() {
  const keys  = S.apiKeys || [];
  const hooks = S.webhooks || [];

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

    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 class="panel-title">API Keys</h3>
        <button class="btn btn-primary btn-sm" data-action="create-api-key">
          <i class="fas fa-plus"></i> New API Key</button>
      </div>
      ${keys.length ? `
        <div class="table-wrapper" style="margin-top:12px">
          <table class="data-table">
            <thead><tr>
              <th>Name</th><th>Prefix</th><th>Scopes</th>
              <th>Last Used</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${keys.map(k => `
                <tr>
                  <td>${esc(k.name)}</td>
                  <td><code class="code">${esc(k.prefix)}...</code></td>
                  <td>${(k.scopes || []).map(s => `<span class="chip chip-neutral" style="margin:2px">${esc(s)}</span>`).join('')}</td>
                  <td>${k.last_used_at ? timeAgo(k.last_used_at) : 'Never'}</td>
                  <td>${k.revoked ? '<span class="status-rejected">Revoked</span>' : '<span class="status-active">Active</span>'}</td>
                  <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs" data-action="copy-api-key" data-id="${k.id}">
                      <i class="fas fa-copy"></i> Copy</button>
                    ${!k.revoked ? `<button class="btn btn-danger btn-xs" data-action="revoke-api-key" data-id="${k.id}">Revoke</button>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<p class="empty-row">No API keys yet</p>'}
    </section>

    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 class="panel-title">Webhooks</h3>
        <button class="btn btn-primary btn-sm" data-action="create-webhook">
          <i class="fas fa-plus"></i> New Webhook</button>
      </div>
      ${hooks.length ? `
        <div class="table-wrapper" style="margin-top:12px">
          <table class="data-table">
            <thead><tr>
              <th>URL</th><th>Events</th><th>Status</th><th>Last Fired</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${hooks.map(h => `
                <tr>
                  <td><code class="code">${esc(h.url)}</code></td>
                  <td>
                    ${(h.events || []).slice(0, 3).map(e => `<span class="chip chip-neutral" style="margin:2px">${esc(e)}</span>`).join('')}
                    ${(h.events || []).length > 3 ? `<span class="chip chip-neutral">+${h.events.length - 3}</span>` : ''}
                  </td>
                  <td>${h.active ? '<span class="status-active">Active</span>' : '<span class="status-archived">Inactive</span>'}</td>
                  <td>${h.last_fired_at ? timeAgo(h.last_fired_at) : 'Never'}</td>
                  <td class="actions-cell">
                    <button class="btn btn-info btn-xs" data-action="test-webhook" data-id="${h.id}">Test</button>
                    <button class="btn btn-secondary btn-xs" data-action="edit-webhook" data-id="${h.id}">Edit</button>
                    <button class="btn btn-danger btn-xs" data-action="delete-webhook" data-id="${h.id}">Delete</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<p class="empty-row">No webhooks configured</p>'}
    </section>
  `;
}
