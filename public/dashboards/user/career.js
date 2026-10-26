/* ============================================================
   ExpertHub 2.0 — dashboards/user/career.js
   Career pathways, CV builder, interview prep, skill gaps.
   ============================================================ */

let _careerTab = UserFilters.get('career', 'tab', 'pathways') || 'pathways';
S.userCv = S.userCv || null;
S.interviewPrep = S.interviewPrep || [];
let __careerLoaded = false;

async function _loadCareer() {
  const [a, b, c] = await Promise.allSettled([
    apiCall('/api/user/career/pathways').then(d => { S.careerPathways = d.pathways || []; }),
    apiCall('/api/user/career/cv').then(d => { S.userCv = d.cv || null; }),
    apiCall('/api/user/career/interview-prep').then(d => { S.interviewPrep = d.prep || []; }),
  ]);
  if (a.status === 'rejected') S.careerPathways = S.careerPathways || [];
  if (b.status === 'rejected') S.userCv = S.userCv || null;
  if (c.status === 'rejected') S.interviewPrep = S.interviewPrep || [];
  __careerLoaded = true;
}

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
      ${UserUI.tabs([
        { id: 'pathways',       label: 'Pathways',       icon: 'fa-road' },
        { id: 'cv',             label: 'CV Builder',     icon: 'fa-file-alt' },
        { id: 'interview-prep', label: 'Interview Prep', icon: 'fa-comments' },
      ], _careerTab, 'data-career-tab')}

      ${_careerTab === 'pathways' ? renderCareerPathways() : ''}
      ${_careerTab === 'cv' ? renderCareerCv() : ''}
      ${_careerTab === 'interview-prep' ? renderCareerInterview() : ''}
    `,
  });
}

function renderCareerPathways() {
  const list = S.careerPathways || [];
  return list.length ? UserUI.cardGrid(list.map(p => `
    <article class="program-card">
      <span class="chip chip-blue">${esc(p.industry || 'Career')}</span>
      <h4 class="program-title">${esc(p.title)}</h4>
      <p class="program-desc">${esc((p.description || '').slice(0, 140))}</p>
      <p class="program-meta">${(p.steps || []).length} steps · ${p.salary_range || '—'}</p>
      <button class="btn btn-primary btn-sm" data-action="open-career-pathway" data-id="${p.id}">
        <i class="fas fa-road"></i> Explore</button>
    </article>
  `)) : UserUI.empty({
    icon: 'fa-road',
    title: 'No career pathways yet',
    desc: 'Explore pathways tailored to your interests.',
  });
}

function renderCareerCv() {
  const cv = S.userCv || {};
  const completion = _cvCompletion(cv);
  return `
    <section class="panel">
      <h3 class="panel-title">My CV</h3>
      <div class="progress-bar" style="margin-bottom:10px">
        <span style="width:${completion}%"></span>
      </div>
      <p class="program-meta">${completion}% complete</p>
      ${cv.summary ? `
        <div class="alert alert-info">
          <strong>Summary:</strong> ${esc(cv.summary)}
        </div>
      ` : '<p class="empty-row">Build your CV to help career coaches and mentors understand your background.</p>'}
      <div class="panel-actions" style="margin-top:12px">
        <button class="btn btn-primary" data-action="edit-cv">
          <i class="fas fa-pen"></i> ${cv.summary ? 'Edit CV' : 'Build CV'}</button>
        <button class="btn btn-secondary" data-action="export-cv">
          <i class="fas fa-download"></i> Export PDF</button>
      </div>
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

function renderCareerInterview() {
  const list = S.interviewPrep || [];
  return `
    <section class="panel">
      <h3 class="panel-title">Interview Preparation</h3>
      ${list.length ? list.map(p => `
        <div class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${esc(p.title)}</span>
            <span class="list-row-sub">${esc(p.category || '')}</span>
          </div>
          <button class="btn btn-secondary btn-xs" data-action="practice-interview" data-id="${p.id}">
            <i class="fas fa-play"></i> Practice</button>
        </div>
      `).join('') : '<p class="empty-row">No interview questions yet</p>'}
      <div class="panel-actions" style="margin-top:12px">
        <button class="btn btn-primary" data-action="mock-interview">
          <i class="fas fa-magic"></i> Start Mock Interview</button>
      </div>
    </section>
  `;
}

window.ExpertHubUser.registerModule('career', renderUserCareer);

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-career-tab]');
  if (!t) return;
  _careerTab = t.dataset.careerTab;
  UserFilters.set('career', 'tab', _careerTab);
  rerenderRoleContent();
}, true);

window.ExpertHubUser.registerAction('open-career-pathway', (id) => {
  const p = (S.careerPathways || []).find(x => String(x.id) === String(id));
  if (!p) return;
  openModal({
    title: p.title,
    className: 'modal-lg',
    body: `
      <p>${esc(p.description || '')}</p>
      <ul class="list-stack" style="margin-top:12px">
        ${(p.steps || []).map((s, i) => `
          <li class="list-row">
            <div class="list-row-main">
              <span class="list-row-title"><span class="chip chip-neutral">Step ${i + 1}</span> ${esc(s.title)}</span>
              <span class="list-row-sub">${esc(s.description || '')}</span>
            </div>
          </li>
        `).join('')}
      </ul>
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
});

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
      // Trust backend on success
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

window.ExpertHubUser.registerAction('practice-interview', (id) => {
  const p = (S.interviewPrep || []).find(x => String(x.id) === String(id));
  if (!p) return;
  showToast(`Practice session starting for: ${p.title}`, 'info');
});

window.ExpertHubUser.registerAction('mock-interview', async () => {
  try {
    showLoading(true);
    await apiCall('/api/user/career/mock-interview', 'POST');
    showToast('Mock interview scheduled with AI coach', 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { showLoading(false); }
});

window.ExpertHubUser.registerAction('career-skill-gaps', async () => {
  try {
    showLoading(true);
    const d = await apiCall('/api/user/career/skill-gaps', 'POST');
    closeModal();
    openModal({
      title: 'Skill Gap Analysis',
      className: 'modal-lg',
      body: `
        <ul class="list-stack">
          ${(d.gaps || []).map(g => `
            <li class="list-row">
              <div class="list-row-main">
                <span class="list-row-title">${esc(g.skill)}</span>
                <span class="list-row-sub">Target: ${esc(g.target_level)} · Current: ${esc(g.current_level)}</span>
              </div>
              <span class="chip chip-${g.priority === 'high' ? 'red' : g.priority === 'medium' ? 'yellow' : 'green'}">${esc(g.priority || '')}</span>
            </li>
          `).join('') || '<li class="empty-row">No gaps detected — nice work!</li>'}
        </ul>
        <div class="panel-actions" style="margin-top:16px">
          <button class="btn btn-primary" data-action="switch-tab" data-tab="eschool"
                  onclick="closeModal()">
            <i class="fas fa-book-open"></i> Find Courses to Close Gaps</button>
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