/* ============================================================
   ExpertHub 2.0 — Question Bank
   Adds: categories, tags, difficulty levels, bulk import,
   versioning, randomization, item analysis, multiple question
   formats, review/approval workflows.
   ============================================================ */

function instQuestionBank() {
  const f = S.filters.questionBank = S.filters.questionBank || {};
  const q            = (f.q || '').trim().toLowerCase();
  const categoryFilter = f.category || '';
  const difficultyFilter = f.difficulty || '';
  const typeFilter   = f.type || '';
  const approvalFilter = f.approval || '';   // approved | pending | rejected

  let questions = (S.institutionQuestions || []).slice();
  if (q) {
    questions = questions.filter(x =>
      (x.question_text || '').toLowerCase().includes(q) ||
      (Array.isArray(x.tags) ? x.tags.join(' ') : '').toLowerCase().includes(q)
    );
  }
  if (categoryFilter) questions = questions.filter(x => x.category === categoryFilter);
  if (difficultyFilter) questions = questions.filter(x => x.difficulty === difficultyFilter);
  if (typeFilter) questions = questions.filter(x => x.question_type === typeFilter);
  if (approvalFilter) questions = questions.filter(x => (x.approval_status || 'approved') === approvalFilter);

  questions = sortBy(questions, x => x.updated_at || x.created_at || '', 'desc');
  const { rows, total, currentPage, perPage } = paginateList(questions, 'institutionQuestions');

  /* ── Derived categories & types for the filter dropdowns ── */
  const all = S.institutionQuestions || [];
  const categories = uniqueBy(
    all.map(x => ({ id: x.category || 'uncategorised', label: x.category || 'Uncategorised' })),
    'id'
  );
  const questionTypes = uniqueBy(
    all.map(x => x.question_type).filter(Boolean).map(t => ({ id: t, label: capitalize(t.replace(/_/g, ' ')) })),
    'id'
  );

  const pendingApproval = all.filter(x => (x.approval_status || 'approved') === 'pending').length;
  const canWrite = hasInstitutionPermission('assessments:write');

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Question Bank</span></div>
    <section class="page-header">
      <h1 class="page-title">Question Bank</h1>
      <div class="page-actions">
        <input type="search" id="qb-search" class="form-input"
               placeholder="Search questions or tags..."
               value="${esc(f.q || '')}" style="max-width:240px" />
        <select id="qb-category" class="form-select" style="max-width:180px">
          <option value="">All categories</option>
          ${categories.map(c =>
            `<option value="${c.id}" ${categoryFilter === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
        </select>
        <select id="qb-difficulty" class="form-select" style="max-width:150px">
          <option value="">All difficulties</option>
          ${['easy','medium','hard','expert'].map(d =>
            `<option value="${d}" ${difficultyFilter === d ? 'selected' : ''}>${capitalize(d)}</option>`).join('')}
        </select>
        ${questionTypes.length ? `
          <select id="qb-type" class="form-select" style="max-width:180px">
            <option value="">All types</option>
            ${questionTypes.map(t =>
              `<option value="${t.id}" ${typeFilter === t.id ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
          </select>` : ''}
        <select id="qb-approval" class="form-select" style="max-width:160px">
          <option value="">All approvals</option>
          <option value="approved" ${approvalFilter === 'approved' ? 'selected' : ''}>Approved</option>
          <option value="pending" ${approvalFilter === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="rejected" ${approvalFilter === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>
        <button class="btn btn-secondary" data-action="export-questions">
          <i class="fas fa-download"></i> Export</button>
        ${canWrite ? `
          <button class="btn btn-secondary" data-action="import-questions-bulk">
            <i class="fas fa-file-import"></i> Bulk Import</button>
          <button class="btn btn-primary" data-action="create-question">
            <i class="fas fa-plus"></i> New Question</button>` : ''}
      </div>
    </section>

    <section class="stat-grid">
      ${statCard('Total Questions', all.length, '', 'fa-database', 'blue')}
      ${statCard('Pending Approval', pendingApproval, '', 'fa-clock', 'yellow')}
      ${statCard('Categories', categories.length, '', 'fa-tags', 'purple')}
      ${statCard('Approved', all.filter(x => (x.approval_status || 'approved') === 'approved').length, '', 'fa-check-circle', 'green')}
    </section>

    <section class="panel">
      <h3 class="panel-title">Questions</h3>
      ${rows.length ? `
        <ul class="list-stack">
          ${rows.map(x => renderQuestionRow(x, canWrite)).join('')}
        </ul>` : renderEmptyState({
              icon: 'fa-database',
              title: 'No questions match your filters',
              description: 'Build a reusable bank of questions for your assessments.',
              actionLabel: canWrite ? '+ Create First Question' : '',
              actionAttrs: canWrite ? 'data-action="create-question"' : '',
            })}

      ${paginationBar('institutionQuestions', currentPage, perPage, total)}
    </section>
  `;
}

/* ── Row renderer ─────────────────────────────────────────── */
function renderQuestionRow(x, canWrite) {
  const tags = Array.isArray(x.tags) ? x.tags : [];
  const version = safeNum(x.version, 1);
  const usage = safeNum(x.usage_count);
  const approval = x.approval_status || 'approved';

  const diff = (x.difficulty || 'medium').toLowerCase();
  const diffClass = diff === 'easy' ? 'chip-green'
    : diff === 'hard' ? 'chip-yellow'
    : diff === 'expert' ? 'chip-red'
    : 'chip-neutral';

  /* Item analysis — difficulty index & discrimination index */
  const item = x.item_analysis || {};
  const difficultyIdx = item.difficulty_index != null ? Number(item.difficulty_index) : null;
  const discrimination = item.discrimination_index != null ? Number(item.discrimination_index) : null;

  const approvalBadge = approval === 'approved'
    ? `<span class="chip chip-green" style="font-size:.65rem"><i class="fas fa-check"></i> Approved</span>`
    : approval === 'pending'
    ? `<span class="chip chip-yellow" style="font-size:.65rem"><i class="fas fa-clock"></i> Pending</span>`
    : `<span class="chip chip-red" style="font-size:.65rem"><i class="fas fa-xmark"></i> Rejected</span>`;

  return `
    <li class="list-row" style="flex-wrap:wrap;align-items:flex-start">
      <div class="list-row-main" style="flex:1;min-width:260px">
        <span class="list-row-title" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
          ${esc(truncate(x.question_text || '', 120))}
          ${approvalBadge}
          ${version > 1 ? `<span class="chip chip-neutral" style="font-size:.65rem" title="${version} versions">
            v${version}</span>` : ''}
          ${x.randomisation_pool ? `
            <span class="chip chip-blue" style="font-size:.65rem" title="Included in randomisation pools">
              <i class="fas fa-shuffle"></i></span>` : ''}
        </span>
        <span class="list-row-sub" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;align-items:center">
          <span class="chip chip-neutral">${esc(x.question_type || '—')}</span>
          <span class="chip ${diffClass}">${esc(diff)}</span>
          ${x.category ? `<span class="chip chip-neutral">${esc(x.category)}</span>` : ''}
          <span>${safeNum(x.points, 1)} point${safeNum(x.points, 1) === 1 ? '' : 's'}</span>
          ${usage ? `<span>· Used ${usage}× </span>` : ''}
          ${difficultyIdx != null ? `<span>· Difficulty idx ${difficultyIdx.toFixed(2)}</span>` : ''}
          ${discrimination != null ? `<span>· Discrimination ${discrimination.toFixed(2)}</span>` : ''}
        </span>
        ${tags.length ? `
          <div style="margin-top:4px">
            ${tags.map(t => `<span class="chip chip-neutral" style="font-size:.65rem;margin-right:4px">#${esc(t)}</span>`).join('')}
          </div>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-xs" data-action="view-item-analysis" data-id="${x.id}"
                title="Item analysis"><i class="fas fa-chart-simple"></i></button>
        ${canWrite ? `
          <button class="btn btn-secondary btn-xs" data-action="question-history" data-id="${x.id}"
                  title="Version history"><i class="fas fa-code-branch"></i></button>
          <button class="btn btn-secondary btn-xs" data-action="duplicate-question" data-id="${x.id}"
                  title="Duplicate"><i class="fas fa-copy"></i></button>
          ${approval === 'pending' ? `
            <button class="btn btn-success btn-xs" data-action="approve-question" data-id="${x.id}"
                    title="Approve">Approve</button>
            <button class="btn btn-danger btn-xs" data-action="reject-question" data-id="${x.id}"
                    title="Reject">Reject</button>` : ''}
          <button class="btn btn-secondary btn-xs" data-action="edit-question" data-id="${x.id}"
                  title="Edit">Edit</button>
          <button class="btn btn-danger btn-xs" data-action="delete-question" data-id="${x.id}"
                  title="Delete">Delete</button>
        ` : ''}
      </div>
    </li>`;
}
