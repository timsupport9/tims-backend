/* ============================================================ */
/* ExpertHub 2.0 — dashboards/user/career.js */
/* Career development: Explore / Assess / Plan / Prepare phases, */
/* explainable recommendations, comparison, Kenya-aware pathways, */
/* CV, interview prep, skill-gap analysis. */
/* ============================================================ */

S.userCv               = S.userCv               || null;
S.interviewPrep        = S.interviewPrep        || [];
S.careerProfiles       = S.careerProfiles       || [];
S.careerInterests      = S.careerInterests      || [];
S.careerComparisons    = S.careerComparisons    || [];
S.savedOpportunities   = S.savedOpportunities   || [];

let _careerTab = UserFilters.get('career', 'tab', 'explore') || 'explore';
let __careerLoaded = false;
let __careerRefreshing = null;

/* ============================================================ */
/* Data refresh */
/* ============================================================ */

async function _loadCareer({ force = false } = {}) {
  if (__careerLoaded && !force) return;
  if (__careerRefreshing && !force) return __careerRefreshing;

  __careerRefreshing = (async () => {
    const tasks = [
      apiCall('/api/user/career/pathways').then(d => { S.careerPathways = d.pathways || []; }).catch(() => {}),
      apiCall('/api/user/career/cv').then(d => { S.userCv = d.cv || null; }).catch(() => {}),
      apiCall('/api/user/career/interview-prep').then(d => { S.interviewPrep = d.prep || []; }).catch(() => {}),
      apiCall('/api/user/career/directory').then(d => { S.careerDirectory = d.careers || []; }).catch(() => {}),
      apiCall('/api/user/career/interests').then(d => { S.careerInterests = d.interests || []; }).catch(() => {}),
      apiCall('/api/user/career/profile').then(d => { S.careerProfiles = d.profiles || []; }).catch(() => {}),
      apiCall('/api/user/career/opportunities').then(d => { S.savedOpportunities = d.opportunities || []; }).catch(() => {}),
    ];
    await Promise.allSettled(tasks);
    __careerLoaded = true;
  })().finally(() => { __careerRefreshing = null; });

  return __careerRefreshing;
}

/* ============================================================ */
/* Main renderer */
/* ============================================================ */

const CAREER_TABS = [
  { id: 'explore', label: 'Explore', icon: 'fa-compass' },
  { id: 'assess',  label: 'Assess',  icon: 'fa-clipboard-list' },
  { id: 'plan',    label: 'Plan',    icon: 'fa-road' },
  { id: 'prepare', label: 'Prepare', icon: 'fa-toolbox' },
];

function renderUserCareer() {
  if (!__careerLoaded) {
    _loadCareer().then(() => rerenderRoleContent()).catch(() => {});
  }

  return UserUI.page({
    title: 'Career Center',
    breadcrumb: 'Career',
    actions: `
      <button class="btn btn-secondary" data-action="career-skill-gaps">
        <i class="fas fa-chart-line"></i> Skill Gap Analysis</button>
      <button class="btn btn-primary" data-action="career-consultation">
        <i class="fas fa-user-tie"></i> Book Career Coach</button>
    `,
    content: `
      ${UserUI.tabs(CAREER_TABS, _careerTab, 'data-career-tab')}

      ${_careerTab === 'explore' ? renderCareerExplore() : ''}
      ${_careerTab === 'assess'  ? renderCareerAssess()  : ''}
      ${_careerTab === 'plan'    ? renderCareerPlan()    : ''}
      ${_careerTab === 'prepare' ? renderCareerPrepare() : ''}
    `,
  });
}

/* ============================================================ */
/* Explore — career directory + explainable recommendations */
/* ============================================================ */

function renderCareerExplore() {
  const f = {
    q:        UserFilters.get('career', 'dir_q', '') || '',
    industry: UserFilters.get('career', 'dir_industry', '') || '',
    kenyaOnly: UserFilters.get('career', 'dir_kenya', false),
  };

  const directory = (S.careerDirectory || []).slice();
  const industries = Array.from(new Set(directory.map(c => c.industry).filter(Boolean))).sort();

  let filtered = directory;
  if (f.q) {
    const q = f.q.toLowerCase();
    filtered = filtered.filter(c =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.industry || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q));
  }
  if (f.industry) filtered = filtered.filter(c => c.industry === f.industry);
  if (f.kenyaOnly) filtered = filtered.filter(c => c.kenya_route || c.kenya_available);

  const recommended = (S.careerPathways || []).filter(p => p.recommendation_reason).slice(0, 3);

  return `
    <section class="panel">
      <h3 class="panel-title">Career Directory</h3>
      <div class="expert-filters" style="margin-bottom:12px">
        <input type="search" id="career-dir-search" class="form-input"
               placeholder="Search careers..." style="max-width:240px"
               value="${esc(f.q)}" aria-label="Search careers" />
        <select id="career-dir-industry" class="form-select" style="max-width:180px" aria-label="Industry">
          <option value="">All industries</option>
          ${industries.map(i => `<option value="${esc(i)}" ${f.industry === i ? 'selected' : ''}>${esc(i)}</option>`).join('')}
        </select>
        <label class="checkbox-row">
          <input type="checkbox" id="career-dir-kenya" ${f.kenyaOnly ? 'checked' : ''} />
          Kenya-available routes only
        </label>
      </div>

      ${filtered.length ? UserUI.cardGrid(filtered.slice(0, 12).map(c => `
        <article class="program-card">
          <span class="chip chip-blue">${esc(c.industry || 'Career')}</span>
          ${c.kenya_route ? '<span class="chip chip-green" style="margin-left:6px">Kenya route</span>' : ''}
          <h4 class="program-title">${esc(c.title)}</h4>
          <p class="program-desc">${esc((c.description || '').slice(0, 120))}</p>
          <p class="program-meta">
            ${c.salary_range ? `<strong>${esc(c.salary_range)}</strong> · ` : ''}
            ${c.education_level ? esc(c.education_level) : ''}
          </p>
          <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px">
            <button class="btn btn-primary btn-sm flex-1" data-action="open-career-detail" data-id="${c.id}">
              <i class="fas fa-eye"></i> Explore</button>
            <button class="btn btn-secondary btn-sm" data-action="compare-career" data-id="${c.id}"
                    aria-label="Add to comparison">
              <i class="fas fa-columns"></i></button>
            <button class="btn btn-secondary btn-sm" data-action="save-career-opportunity" data-id="${c.id}"
                    aria-label="Save career">
              <i class="fas fa-bookmark"></i></button>
          </div>
        </article>
      `)) : '<p class="empty-row">No careers match your filters.</p>'}
    </section>

    ${recommended.length ? `
      <section class="panel">
        <h3 class="panel-title">Recommended For You</h3>
        <p class="form-hint">Based on your stated interests, skills, and goals.</p>
        ${recommended.map(p => `
          <div class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">${esc(p.title)}</span>
              <span class="list-row-sub">
                <i class="fas fa-lightbulb"></i> ${esc(p.recommendation_reason)}
              </span>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-secondary btn-xs" data-action="dismiss-recommendation" data-id="${p.id}"
                      aria-label="Dismiss"><i class="fas fa-times"></i></button>
              <button class="btn btn-primary btn-xs" data-action="open-career-pathway" data-id="${p.id}">
                Explore</button>
            </div>
          </div>
        `).join('')}
      </section>
    ` : ''}
  `;
}

/* ============================================================ */
/* Assess — interest + skills self-assessment */
/* ============================================================ */

function renderCareerAssess() {
  const interests = S.careerInterests || [];
  return `
    <section class="panel">
      <h3 class="panel-title">Your Interests &amp; Strengths</h3>
      <p class="form-hint">
        These inform recommendations but do not restrict what you can explore.
        You can change them at any time.
      </p>
      ${interests.length ? `
        <div class="interest-grid" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          ${interests.map(i => `
            <span class="chip chip-blue">
              ${esc(i.label || i.value || i)}
              <button class="btn-ghost btn-xs" data-action="remove-interest" data-value="${esc(i.value || i)}"
                      aria-label="Remove"><i class="fas fa-times"></i></button>
            </span>
          `).join('')}
        </div>
      ` : '<p class="empty-row">You have not recorded any interests yet.</p>'}
      <div class="panel-actions" style="margin-top:12px">
        <button class="btn btn-primary" data-action="career-add-interest">
          <i class="fas fa-plus"></i> Add Interest</button>
        <button class="btn btn-secondary" data-action="career-take-assessment">
          <i class="fas fa-clipboard-list"></i> Take Interest Assessment</button>
      </div>
    </section>

    ${(S.skillAssessments || []).length ? `
      <section class="panel">
        <h3 class="panel-title">Your Skills</h3>
        <p class="form-hint">
          Skills marked "Verified" have been confirmed through an assessment or evaluator.
          Self-reported skills are not treated as professional qualifications.
        </p>
        ${(S.skillAssessments || []).slice(0, 10).map(s => `
          <div class="list-row">
            <div class="list-row-main">
              <span class="list-row-title">
                ${esc(s.skill_name)}
                ${s.verified
                  ? '<span class="chip chip-green">Verified</span>'
                  : '<span class="chip chip-neutral">Self-reported</span>'}
              </span>
              <span class="list-row-sub">${esc(s.category || '')} · ${esc(s.level || 'beginner')}</span>
            </div>
            <div class="progress-bar" style="width:100px">
              <span style="width:${s.score || 0}%"></span>
            </div>
          </div>
        `).join('')}
        <div class="panel-actions" style="margin-top:12px">
          <button class="btn btn-secondary" data-action="switch-tab" data-tab="skills">
            Manage Skills <i class="fas fa-arrow-right"></i></button>
        </div>
      </section>
    ` : ''}
  `;
}

/* ============================================================ */
/* Plan — career pathways with milestones */
/* ============================================================ */

function renderCareerPlan() {
  const pathways = S.careerPathways || [];
  return `
    <section class="panel">
      <div class="panel-header-row">
        <h3 class="panel-title">Career Pathways</h3>
        <button class="btn btn-primary btn-sm" data-action="create-career-pathway">
          <i class="fas fa-plus"></i> New Pathway</button>
      </div>
      ${pathways.length ? UserUI.cardGrid(pathways.map(p => `
        <article class="program-card">
          <span class="chip chip-blue">${esc(p.industry || 'Career')}</span>
          <span class="${statusClass(p.status || 'draft')}" style="margin-left:6px">${esc((p.status || 'draft').replace(/_/g,' '))}</span>
          <h4 class="program-title">${esc(p.title)}</h4>
          <p class="program-desc">${esc((p.description || '').slice(0, 140))}</p>
          <div class="progress-bar" style="margin-top:8px">
            <span style="width:${p.progress || 0}%"></span>
          </div>
          <p class="program-meta">${p.progress || 0}% · ${(p.milestones || []).length} milestone${(p.milestones || []).length === 1 ? '' : 's'}</p>
          <div class="panel-actions" style="margin-top:10px">
            <button class="btn btn-primary btn-sm" data-action="open-career-pathway" data-id="${p.id}">
              <i class="fas fa-road"></i> Open</button>
          </div>
        </article>
      `)) : UserUI.empty({
        icon: 'fa-road',
        title: 'No career pathways yet',
        desc: 'Create a pathway to plan the learning, experience, and milestones toward your goal.',
      })}
    </section>
  `;
}

/* ============================================================ */
/* Prepare — CV, interview, opportunities */
/* ============================================================ */

function renderCareerPrepare() {
  const cv = S.userCv || {};
  const completion = _cvCompletion(cv);
  const interview = S.interviewPrep || [];
  const opps = S.savedOpportunities || [];

  return `
    <section class="panel">
      <h3 class="panel-title">My CV</h3>
      <div class="progress-bar" style="margin-bottom:10px">
        <span style="width:${completion}%"></span>
      </div>
      <p class="program-meta">${completion}% complete</p>
      ${cv.summary
        ? `<div class="alert alert-info"><strong>Summary:</strong> ${esc(cv.summary)}</div>`
        : '<p class="empty-row">Build your CV so career coaches and mentors can understand your background.</p>'}
      <div class="panel-actions" style="margin-top:12px">
        <button class="btn btn-primary" data-action="edit-cv">
          <i class="fas fa-pen"></i> ${cv.summary ? 'Edit CV' : 'Build CV'}</button>
        <button class="btn btn-secondary" data-action="export-cv">
          <i class="fas fa-download"></i> Export PDF</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Interview Preparation</h3>
      ${interview.length ? interview.map(p => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(p.title)}</span>
            <span class="list-row-sub">${esc(p.category || '')}</span>
          </div>
          <button class="btn btn-secondary btn-xs" data-action="practice-interview" data-id="${p.id}">
            <i class="fas fa-play"></i> Practice</button>
        </div>
      `).join('') : '<p class="empty-row">No interview questions available yet</p>'}
      <div class="panel-actions" style="margin-top:12px">
        <button class="btn btn-primary" data-action="mock-interview">
          <i class="fas fa-magic"></i> Start Mock Interview</button>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Saved Opportunities</h3>
      ${opps.length ? opps.map(o => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(o.title || 'Opportunity')}</span>
            <span class="list-row-sub">
              ${esc(o.type || '')}
              ${o.organization ? ' · ' + esc(o.organization) : ''}
              ${o.deadline ? ' · Deadline ' + fmtDate(o.deadline) : ''}
            </span>
          </div>
          <div style="display:flex;gap:6px">
            ${o.url
              ? `<a class="btn btn-secondary btn-xs" href="${esc(o.url)}" target="_blank" rel="noopener">
                  <i class="fas fa-external-link-alt"></i> Open</a>`
              : ''}
            <button class="btn btn-ghost btn-xs" data-action="remove-saved-opportunity" data-id="${o.id}"
                    aria-label="Remove"><i class="fas fa-times"></i></button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">Save internships, attachments, volunteering, and job opportunities here.</p>'}
    </section>
  `;
}

function _cvCompletion(cv) {
  if (!cv) return 0;
  let filled = 0;
  if (cv.summary) filled++;
  if ((cv.experience || []).length) filled++;
  if ((cv.education || []).length) filled++;
  if ((cv.skills || []).length) filled++;
  return Math.round((filled / 4) * 100);
}

/* ============================================================ */
/* Module + filter bindings */
/* ============================================================ */

window.ExpertHubUser.registerModule('career', renderUserCareer);

window.ExpertHubUser.registerModule('career', renderUserCareer, {
  init() {
    const rerender = debounce(() => rerenderRoleContent(), 250);
    const $set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
    $set('career-dir-search',   el => el.oninput  = () => { UserFilters.set('career', 'dir_q', el.value); rerender(); });
    $set('career-dir-industry', el => el.onchange = () => { UserFilters.set('career', 'dir_industry', el.value); rerenderRoleContent(); });
    $set('career-dir-kenya',    el => el.onchange = () => { UserFilters.set('career', 'dir_kenya', el.checked); rerenderRoleContent(); });
  },
});

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-career-tab]');
  if (!t) return;
  _careerTab = t.dataset.careerTab;
  UserFilters.set('career', 'tab', _careerTab);
  rerenderRoleContent();
}, true);

/* ============================================================ */
/* Actions */
/* ============================================================ */

window.ExpertHubUser.registerAction('career-refresh', async () => {
  await _loadCareer({ force: true });
  rerenderRoleContent();
  showToast('Career data refreshed', 'success');
});

window.ExpertHubUser.registerAction('open-career-detail', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/career/directory/${id}`).catch(() => null);
    const c = d?.career || (S.careerDirectory || []).find(x => String(x.id) === String(id));
    if (!c) return showToast('Career not found', 'error');

    openModal({
      title: c.title,
      className: 'modal-lg',
      body: `
        <p class="form-hint">${esc(c.industry || '')}</p>
        <p>${esc(c.description || '')}</p>
        ${c.salary_range ? `<p><strong>Salary range:</strong> ${esc(c.salary_range)}</p>` : ''}
        ${c.education_level ? `<p><strong>Education level:</strong> ${esc(c.education_level)}</p>` : ''}

        ${(c.education_routes || []).length ? `
          <h3 class="panel-title" style="margin-top:16px">Education Routes</h3>
          <ul class="prereq-list">
            ${(c.education_routes || []).map(r => `
              <li>
                <i class="fas fa-graduation-cap"></i>
                ${esc(r.name || r)}
                ${r.kenya_route ? '<span class="chip chip-green">Kenya</span>' : ''}
              </li>
            `).join('')}
          </ul>
        ` : ''}

        ${(c.required_skills || []).length ? `
          <h3 class="panel-title" style="margin-top:16px">Required Skills</h3>
          <ul class="prereq-list">
            ${(c.required_skills || []).map(s => `<li><i class="fas fa-check"></i> ${esc(s)}</li>`).join('')}
          </ul>
        ` : ''}

        ${(c.related_courses || []).length ? `
          <h3 class="panel-title" style="margin-top:16px">Related Courses</h3>
          ${(c.related_courses || []).map(rc => `
            <div class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(rc.title)}</span>
              </div>
              <button class="btn btn-primary btn-xs" data-action="view-course-detail"
                      data-id="${rc.id}" onclick="closeModal()">
                View <i class="fas fa-arrow-right"></i></button>
            </div>
          `).join('')}
        ` : ''}

        ${(c.related_mentors || []).length ? `
          <h3 class="panel-title" style="margin-top:16px">Mentors in this field</h3>
          ${(c.related_mentors || []).map(m => `
            <div class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(m.name)}</span>
                <span class="list-row-sub">${esc(m.specialization || '')}</span>
              </div>
              <button class="btn btn-secondary btn-xs" data-action="book-expert" data-id="${m.id}"
                      data-name="${esc(m.name)}" onclick="closeModal()">
                Book <i class="fas fa-calendar-plus"></i></button>
            </div>
          `).join('')}
        ` : ''}
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-primary" data-action="create-career-pathway-for" data-id="${c.id}"
                onclick="closeModal()">
          <i class="fas fa-road"></i> Plan This Career</button>
      `,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('compare-career', (id) => {
  const existing = S.careerComparisons || [];
  if (existing.some(x => String(x) === String(id))) {
    S.careerComparisons = existing.filter(x => String(x) !== String(id));
    showToast('Removed from comparison', 'info');
  } else {
    if (existing.length >= 3) return showToast('You can compare up to 3 careers', 'warning');
    S.careerComparisons = [...existing, id];
    showToast(`Added to comparison (${S.careerComparisons.length}/3)`, 'success');
  }
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('save-career-opportunity', async (id) => {
  try {
    const c = (S.careerDirectory || []).find(x => String(x.id) === String(id));
    if (!c) return;
    await apiCall('/api/user/career/opportunities', 'POST', {
      type: 'career', career_id: Number(id), title: c.title,
    });
    const list = await apiCall('/api/user/career/opportunities').catch(() => ({ opportunities: [] }));
    S.savedOpportunities = list.opportunities || [];
    showToast('Saved to opportunities', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('remove-saved-opportunity', async (id) => {
  try {
    await apiCall(`/api/user/career/opportunities/${id}`, 'DELETE');
    S.savedOpportunities = (S.savedOpportunities || []).filter(o => String(o.id) !== String(id));
    rerenderRoleContent();
    showToast('Removed', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('career-add-interest', () => {
  UserUI.formModal({
    title: 'Add Interest',
    fields: [
      { name: 'label', label: 'Interest', required: true, placeholder: 'e.g. Data analysis, community health' },
      { name: 'category', label: 'Category', type: 'select', value: 'general',
        options: ['general','technical','creative','people','business','science','service'] },
    ],
    submitLabel: 'Add',
    onSubmit: async (v) => {
      await apiCall('/api/user/career/interests', 'POST', v);
      closeModal();
      await _loadCareer({ force: true });
      rerenderRoleContent();
      showToast('Interest added', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('remove-interest', async (_, el) => {
  const value = el?.dataset?.value;
  if (!value) return;
  try {
    await apiCall('/api/user/career/interests', 'DELETE', { value });
    S.careerInterests = (S.careerInterests || []).filter(i => (i.value || i) !== value);
    rerenderRoleContent();
    showToast('Interest removed', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('career-take-assessment', async () => {
  try {
    showLoading(true);
    const d = await apiCall('/api/user/career/assessment/start', 'POST').catch(() => null);
    closeModal();
    if (!d?.questions?.length) return showToast('Assessment not available right now', 'warning');
    openModal({
      title: 'Career Interest Assessment',
      className: 'modal-lg',
      body: `
        <p class="form-hint">Answer honestly. Your responses inform recommendations, not restrictions.</p>
        ${d.questions.map((q, i) => `
          <div class="panel" style="margin-bottom:12px">
            <p><strong>Q${i+1}.</strong> ${esc(q.question_text || q.question)}</p>
            ${(q.options || ['Strongly disagree','Disagree','Neutral','Agree','Strongly agree']).map((o, oi) => `
              <label class="checkbox-row">
                <input type="radio" name="cq_${q.id}" value="${oi}" />
                ${esc(o)}
              </label>
            `).join('')}
          </div>
        `).join('')}
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button id="cqSubmit" class="btn btn-primary">Submit</button>
      `,
    });
    $('#cqSubmit').onclick = async () => {
      const answers = {};
      document.querySelectorAll('input[type=radio]:checked').forEach(el => {
        answers[el.name.replace('cq_', '')] = Number(el.value);
      });
      try {
        const r = await apiCall('/api/user/career/assessment/submit', 'POST', { answers });
        closeModal();
        await _loadCareer({ force: true });
        rerenderRoleContent();
        showToast(`Assessment complete — ${(r.interests || []).length} interests identified`, 'success', 6000);
      } catch (e) { showToast(e.message, 'error'); }
    };
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('dismiss-recommendation', async (id) => {
  try {
    await apiCall(`/api/user/career/recommendations/${id}/dismiss`, 'POST');
    await _loadCareer({ force: true });
    rerenderRoleContent();
    showToast('Recommendation dismissed', 'info');
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('create-career-pathway', () => {
  UserUI.formModal({
    title: 'Create Career Pathway',
    fields: [
      { name: 'title',       label: 'Career goal', required: true, placeholder: 'e.g. Software Engineer' },
      { name: 'description', label: 'What does this goal mean to you?', type: 'textarea', rows: 3 },
      { name: 'target_date', label: 'Target date', type: 'date' },
      { name: 'industry',    label: 'Industry' },
    ],
    submitLabel: 'Create',
    onSubmit: async (v) => {
      await apiCall('/api/user/career/pathways', 'POST', v);
      closeModal();
      await _loadCareer({ force: true });
      rerenderRoleContent();
      showToast('Pathway created', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('create-career-pathway-for', async (_, el) => {
  const id = el?.dataset?.id;
  const c = (S.careerDirectory || []).find(x => String(x.id) === String(id));
  if (!c) return;
  UserUI.formModal({
    title: `Plan career: ${c.title}`,
    fields: [
      { name: 'title',       label: 'Pathway title', value: c.title, required: true },
      { name: 'description', label: 'Your motivation', type: 'textarea', rows: 3 },
      { name: 'target_date', label: 'Target date', type: 'date' },
    ],
    submitLabel: 'Create',
    onSubmit: async (v) => {
      await apiCall('/api/user/career/pathways', 'POST', { ...v, career_id: Number(id) });
      closeModal();
      await _loadCareer({ force: true });
      rerenderRoleContent();
      showToast('Pathway created', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('open-career-pathway', async (id) => {
  try {
    showLoading(true);
    const d = await apiCall(`/api/user/career/pathways/${id}`).catch(() => null);
    const p = d?.pathway || (S.careerPathways || []).find(x => String(x.id) === String(id));
    if (!p) return showToast('Pathway not found', 'error');

    const milestones = d?.milestones || p.milestones || [];

    openModal({
      title: p.title,
      className: 'modal-lg',
      body: `
        <p>${esc(p.description || '')}</p>
        ${p.target_date ? `<p><strong>Target:</strong> ${fmtDate(p.target_date)}</p>` : ''}
        <div class="progress-bar" style="margin:12px 0">
          <span style="width:${p.progress || 0}%"></span>
        </div>
        <p class="program-meta">${p.progress || 0}% · ${milestones.length} milestone${milestones.length === 1 ? '' : 's'}</p>

        <h3 class="panel-title" style="margin-top:16px">Milestones</h3>
        <ul class="list-stack">
          ${milestones.map(m => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">
                  ${esc(m.title)}
                  ${m.completed ? '<span class="chip chip-green">Done</span>' : ''}
                </span>
                ${m.due_date ? `<span class="list-row-sub">${fmtDate(m.due_date)}</span>` : ''}
                ${m.notes ? `<span class="form-hint">${esc(m.notes)}</span>` : ''}
              </div>
              <div style="display:flex;gap:6px">
                ${!m.completed ? `
                  <button class="btn btn-success btn-xs" data-action="complete-career-milestone"
                          data-pathway="${id}" data-milestone="${m.id}">
                    <i class="fas fa-check"></i></button>
                ` : ''}
              </div>
            </li>
          `).join('') || '<li class="empty-row">No milestones yet</li>'}
        </ul>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-primary" data-action="add-career-milestone" data-id="${id}">
          <i class="fas fa-plus"></i> Add Milestone</button>
      `,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('add-career-milestone', (id) => {
  UserUI.formModal({
    title: 'Add Milestone',
    fields: [
      { name: 'title',    label: 'Milestone', required: true, placeholder: 'e.g. Complete Python bootcamp' },
      { name: 'due_date', label: 'Target date', type: 'date' },
      { name: 'notes',    label: 'Notes', type: 'textarea', rows: 2 },
    ],
    submitLabel: 'Add',
    onSubmit: async (v) => {
      await apiCall(`/api/user/career/pathways/${id}/milestones`, 'POST', v);
      closeModal();
      await _loadCareer({ force: true });
      rerenderRoleContent();
      showToast('Milestone added', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('complete-career-milestone', async (_, el) => {
  const pathwayId = el?.dataset?.pathway;
  const milestoneId = el?.dataset?.milestone;
  try {
    await apiCall(`/api/user/career/pathways/${pathwayId}/milestones/${milestoneId}/complete`, 'POST');
    await _loadCareer({ force: true });
    rerenderRoleContent();
    showToast('Milestone completed', 'success');
  } catch (e) { showToast(e.message, 'error'); }
});

/* ---------------- CV + Interview (preserved) ---------------- */

window.ExpertHubUser.registerAction('edit-cv', () => {
  const cv = S.userCv || {};
  UserUI.formModal({
    title: 'CV Builder',
    fields: [
      { name: 'summary',    label: 'Professional Summary', type: 'textarea', rows: 4, value: cv.summary || '' },
      { name: 'experience', label: 'Experience (one per line)', type: 'textarea', rows: 4, value: (cv.experience || []).join('\n') },
      { name: 'education',  label: 'Education (one per line)', type: 'textarea', rows: 3, value: (cv.education || []).join('\n') },
      { name: 'skills',     label: 'Skills (comma separated)', value: (cv.skills || []).join(', ') },
    ],
    submitLabel: 'Save CV',
    onSubmit: async (v) => {
      const payload = {
        summary: v.summary,
        experience: v.experience.split('\n').map(s => s.trim()).filter(Boolean),
        education:  v.education.split('\n').map(s => s.trim()).filter(Boolean),
        skills:     v.skills.split(',').map(s => s.trim()).filter(Boolean),
      };
      const r = await apiCall('/api/user/career/cv', 'PUT', payload);
      S.userCv = r?.cv || payload;
      closeModal();
      rerenderRoleContent();
      showToast('CV saved', 'success');
    },
  });
});

window.ExpertHubUser.registerAction('export-cv', () => {
  window.open('/api/user/career/cv/pdf', '_blank');
});

window.ExpertHubUser.registerAction('practice-interview', async (id) => {
  try {
    const d = await apiCall(`/api/user/career/interview-prep/${id}`).catch(() => null);
    const p = d?.prep || (S.interviewPrep || []).find(x => String(x.id) === String(id));
    if (!p) return;
    openModal({
      title: p.title,
      className: 'modal-lg',
      body: `
        <p>${esc(p.prompt || p.question || '')}</p>
        <label class="form-group">
          <span class="form-label">Your answer</span>
          <textarea id="ipAnswer" class="form-textarea" rows="6" placeholder="Type or speak your answer..."></textarea>
        </label>
        <p class="form-hint">Answers are stored privately for your own review.</p>
      `,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button id="ipSave" class="btn btn-primary">Save Answer</button>
      `,
    });
    $('#ipSave').onclick = async () => {
      const answer = $('#ipAnswer').value.trim();
      if (!answer) return showToast('Enter your answer', 'error');
      try {
        await apiCall(`/api/user/career/interview-prep/${id}/answer`, 'POST', { answer });
        closeModal();
        showToast('Answer saved', 'success');
      } catch (e) { showToast(e.message, 'error'); }
    };
  } catch (e) { showToast(e.message, 'error'); }
});

window.ExpertHubUser.registerAction('mock-interview', async () => {
  try {
    showLoading(true);
    await apiCall('/api/user/career/mock-interview', 'POST');
    showToast('Mock interview scheduled', 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

/* ---------------- Skill gaps + career consultation (preserved) ---------------- */

window.ExpertHubUser.registerAction('career-skill-gaps', async () => {
  try {
    showLoading(true);
    const d = await apiCall('/api/user/career/skill-gaps', 'POST');
    closeModal();
    openModal({
      title: 'Skill Gap Analysis',
      className: 'modal-lg',
      body: `
        <p class="form-hint">Based on your stated career goal and current skill records.</p>
        <ul class="list-stack">
          ${(d.gaps || []).map(g => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(g.skill)}</span>
                <span class="list-row-sub">Target: ${esc(g.target_level)} · Current: ${esc(g.current_level)}</span>
              </div>
              <span class="chip chip-${g.priority === 'high' ? 'red' : g.priority === 'medium' ? 'yellow' : 'green'}">
                ${esc(g.priority || '')}</span>
            </li>
          `).join('') || '<li class="empty-row">No gaps detected</li>'}
        </ul>
        <div class="panel-actions" style="margin-top:16px">
          <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool"
                  onclick="closeModal()">
            <i class="fas fa-book-open"></i> Find Courses</button>
        </div>
      `,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('career-consultation', () => {
  openModal({
    title: 'Book a Career Coach',
    body: `
      <p>Career coaching sessions are 60 minutes with a senior industry mentor.</p>
      <label class="form-group"><span class="form-label">Session focus</span>
        <select id="ccFocus" class="form-select">
          <option value="career_change">Career change</option>
          <option value="promotion">Promotion readiness</option>
          <option value="interview">Interview preparation</option>
          <option value="negotiation">Salary negotiation</option>
        </select>
      </label>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="ccSave" class="btn btn-primary">Find Coaches</button>
    `,
  });
  $('#ccSave').onclick = () => {
    closeModal();
    activeTab = 'experts';
    rerenderRoleContent();
  };
});
