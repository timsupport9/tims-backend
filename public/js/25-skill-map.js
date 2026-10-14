/* ============================================================
   ExpertHub 2.0 — 25-skill-map.js
   Skill gap analysis, career paths, and course recommendations.
   ============================================================ */

/* ============================================================
   ROLE DEFINITIONS
   ============================================================ */
const CAREER_ROLES = {
  frontend: {
    name: 'Frontend Developer',
    skills: ['html', 'css', 'javascript', 'react', 'typescript', 'accessibility', 'testing'],
  },
  backend: {
    name: 'Backend Developer',
    skills: ['node.js', 'sql', 'rest', 'authentication', 'caching', 'testing', 'docker'],
  },
  fullstack: {
    name: 'Full-Stack Developer',
    skills: ['html', 'css', 'javascript', 'node.js', 'sql', 'rest', 'react', 'docker'],
  },
  data_analyst: {
    name: 'Data Analyst',
    skills: ['sql', 'python', 'excel', 'statistics', 'visualization', 'pandas'],
  },
  data_scientist: {
    name: 'Data Scientist',
    skills: ['python', 'statistics', 'machine learning', 'pandas', 'numpy', 'sql', 'visualization'],
  },
  product_manager: {
    name: 'Product Manager',
    skills: ['product strategy', 'user research', 'analytics', 'roadmapping', 'stakeholder management'],
  },
  ux_designer: {
    name: 'UX Designer',
    skills: ['user research', 'wireframing', 'prototyping', 'figma', 'accessibility', 'visual design'],
  },
  devops: {
    name: 'DevOps Engineer',
    skills: ['linux', 'docker', 'kubernetes', 'ci/cd', 'cloud', 'monitoring', 'networking'],
  },
  mobile: {
    name: 'Mobile Developer',
    skills: ['react native', 'swift', 'kotlin', 'rest', 'mobile ui', 'testing'],
  },
  cybersecurity: {
    name: 'Cybersecurity Analyst',
    skills: ['networking', 'linux', 'cryptography', 'incident response', 'compliance', 'threat modeling'],
  },
};

/* ============================================================
   DASHBOARD TAB
   ============================================================ */
function userSkillMap() {
  const roleKey = S.__skillRole || 'frontend';
  const role = CAREER_ROLES[roleKey];

  const userSkills = collectUserSkills();
  const analysis = analyzeSkillGap(role, userSkills);
  const recommendations = recommendCourses(analysis.missing, userSkills);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Skill Map</span></div>
    <section class="page-header">
      <h1 class="page-title">Skill Map &amp; Career Path</h1>
      <div class="page-actions">
        <label class="form-group" style="margin:0">
          <select id="skill-role" class="form-select" data-skill-role>
            ${Object.entries(CAREER_ROLES).map(([k, r]) => `
              <option value="${k}" ${k === roleKey ? 'selected' : ''}>${esc(r.name)}</option>
            `).join('')}
          </select>
        </label>
      </div>
    </section>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Readiness</p>
          <p class="stat-value">${analysis.readiness}%</p>
          <p class="stat-sub">${analysis.matched.length} of ${role.skills.length} skills</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-route"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Skills matched</p>
          <p class="stat-value">${analysis.matched.length}</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-check"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Gaps</p>
          <p class="stat-value">${analysis.missing.length}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-exclamation"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Est. time to ready</p>
          <p class="stat-value">${analysis.estimatedWeeks}w</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-hourglass"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Skill coverage</h3>
      <div class="skill-radar-wrap">
        <canvas id="skill-radar" width="480" height="360" aria-label="Skill coverage chart" role="img"></canvas>
        <div class="skill-legend">
          ${role.skills.map(s => `
            <div class="skill-row ${analysis.matched.includes(s) ? 'is-matched' : 'is-missing'}">
              <i class="fas ${analysis.matched.includes(s) ? 'fa-check-circle' : 'fa-circle'}"></i>
              <span>${esc(s)}</span>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Recommended next steps</h3>
      ${recommendations.length ? `
        <div class="card-grid">
          ${recommendations.map(rec => `
            <article class="program-card">
              <span class="chip chip-blue">${esc(rec.covers.join(', '))}</span>
              <h4 class="program-title">${esc(rec.title)}</h4>
              <p class="program-desc">${esc((rec.description || '').slice(0, 120))}</p>
              <footer class="program-footer">
                <span class="program-price">${fmtCur(rec.price || 0)}</span>
                <span class="program-meta">${rec.level || ''}</span>
              </footer>
              <button class="btn btn-primary btn-sm" data-action="enroll-modal" data-id="${rec.id}"
                      style="margin-top:10px">
                <i class="fas fa-shopping-cart"></i> Enroll</button>
            </article>`).join('')}
        </div>` : `
        <div class="alert alert-info">
          <i class="fas fa-check-circle"></i>
          <div>You already cover all skills for this role. Try a different role or pick advanced courses.</div>
        </div>`}
    </section>
  `;
}

/* ============================================================
   ANALYSIS
   ============================================================ */
function collectUserSkills() {
  const skills = new Set();
  const enrollments = S.enrollments || [];

  enrollments.forEach(e => {
    const course = (S.courses || []).find(c => String(c.id) === String(e.course_id));
    if (!course) return;
    const tags = [
      ...(course.skills || []),
      ...(course.tags || []),
      course.category,
      course.title,
    ].filter(Boolean);
    tags.forEach(t => String(t).toLowerCase().split(/[,\s]+/).forEach(w => {
      if (w.length > 2) skills.add(w);
    }));
  });

  return Array.from(skills);
}

function analyzeSkillGap(role, userSkills) {
  const skillSet = new Set(userSkills.map(s => s.toLowerCase()));
  const matched = [];
  const missing = [];

  role.skills.forEach(s => {
    const needle = s.toLowerCase();
    const found = Array.from(skillSet).some(us =>
      us === needle || us.includes(needle) || needle.includes(us)
    );
    (found ? matched : missing).push(s);
  });

  const readiness = Math.round((matched.length / role.skills.length) * 100);
  // Rough estimate: 2 weeks per missing skill
  const estimatedWeeks = missing.length * 2;

  return { matched, missing, readiness, estimatedWeeks };
}

function recommendCourses(missing, userSkills) {
  if (!missing.length) return [];
  const courses = S.courses || [];
  const userSet = new Set(userSkills.map(s => s.toLowerCase()));

  const scored = courses.map(c => {
    const hay = [
      c.title, c.description, c.category,
      ...(c.skills || []), ...(c.tags || []),
    ].filter(Boolean).join(' ').toLowerCase();

    const covers = missing.filter(m => hay.includes(m.toLowerCase()));
    const overlap = Array.from(userSet).filter(s => hay.includes(s)).length;

    return { course: c, covers, score: covers.length * 3 + overlap * 0.5 };
  })
  .filter(x => x.covers.length > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 6);

  return scored.map(s => ({ ...s.course, covers: s.covers }));
}

/* ============================================================
   RADAR CHART
   ============================================================ */
function drawSkillRadar(role, matched) {
  const canvas = document.getElementById('skill-radar');
  if (!canvas || typeof Chart === 'undefined') return;

  const labels = role.skills;
  const values = labels.map(s => matched.includes(s) ? 1 : 0.15);

  // Clean up prior chart
  const ctx = canvas.getContext('2d');
  if (canvas.__ehChart) canvas.__ehChart.destroy();

  canvas.__ehChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels.map(l => l.replace(/\b\w/g, c => c.toUpperCase())),
      datasets: [{
        label: 'Your skills',
        data: values,
        backgroundColor: 'rgba(99,102,241,.22)',
        borderColor: 'rgba(99,102,241,.85)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(99,102,241,1)',
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          beginAtZero: true,
          max: 1,
          ticks: { display: false },
          pointLabels: { font: { size: 11 } },
        },
      },
    },
  });
}

/* ============================================================
   RE-RENDER HOOK + DELEGATED HANDLERS
   ============================================================ */
document.addEventListener('change', e => {
  const sel = e.target.closest('[data-skill-role]');
  if (sel) {
    S.__skillRole = sel.value;
    if (typeof window.renderUserDashboard === 'function') window.renderUserDashboard();
  }
});

// Draw on next paint after the tab renders
const _orig = window.renderUserDashboard;
if (typeof _orig === 'function') {
  window.renderUserDashboard = function () {
    const r = _orig.apply(this, arguments);
    requestAnimationFrame(() => {
      if (typeof activeTab !== 'undefined' && activeTab === 'skill-map') {
        const role = CAREER_ROLES[S.__skillRole || 'frontend'];
        const userSkills = collectUserSkills();
        const analysis = analyzeSkillGap(role, userSkills);
        drawSkillRadar(role, analysis.matched);
      }
    });
    return r;
  };