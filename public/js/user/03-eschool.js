/* ============================================================
   ExpertHub 2.0 — 03-eschool.js
   E-School catalog listing and filtering.
   ============================================================ */

/* ============================================================
   E-SCHOOL — COURSE CATALOG
   ============================================================ */
function userESchool() {
  const tabs = [
    { id:'courses',     label:'All Courses',      icon:'fa-th-large' },
    { id:'bootcamp',    label:'Bootcamps',        icon:'fa-fire' },
    { id:'short_course',label:'Short Courses',    icon:'fa-bolt' },
    { id:'tuition',     label:'Tuition',          icon:'fa-chalkboard-teacher' },
    { id:'exam_prep',   label:'Exam Prep',        icon:'fa-file-alt' },
    { id:'career',      label:'Career',           icon:'fa-briefcase' },
    { id:'certification',label:'Certifications',  icon:'fa-certificate' },
  ];
  const query = ($('#eschool-search')?.value || '').toLowerCase();
  const levelFilter = $('#eschool-level')?.value || '';

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>E-School</span></div>
    <section class="page-header">
      <h1 class="page-title">E-School Learning Hub</h1>
      <div class="page-actions">
        <input type="search" id="eschool-search" class="form-input"
               placeholder="Search courses..." value="${esc(query)}" style="max-width:240px" />
        <select id="eschool-level" class="form-select" style="max-width:150px">
          <option value="">All levels</option>
          <option value="beginner" ${levelFilter === 'beginner' ? 'selected' : ''}>Beginner</option>
          <option value="intermediate" ${levelFilter === 'intermediate' ? 'selected' : ''}>Intermediate</option>
          <option value="advanced" ${levelFilter === 'advanced' ? 'selected' : ''}>Advanced</option>
        </select>
      </div>
    </section>

    <nav class="tab-bar">
      ${tabs.map(t => `
        <button class="tab-btn ${activeESchoolTab === t.id ? 'tab-btn-active' : ''}"
                data-eschool-tab="${t.id}">
          <i class="fas ${t.icon}"></i> ${t.label}</button>
      `).join('')}
    </nav>

    <section class="panel" id="eschool-panel">${renderESchoolPanel()}</section>
  `;
}

function renderESchoolPanel() {
  const filter = activeESchoolTab === 'courses' ? null : activeESchoolTab;
  const query = ($('#eschool-search')?.value || '').toLowerCase();
  const levelFilter = $('#eschool-level')?.value || '';

  let list = filter ? S.courses.filter(c => c.course_type === filter) : S.courses;
  if (query) list = list.filter(c =>
    (c.title || '').toLowerCase().includes(query) ||
    (c.description || '').toLowerCase().includes(query) ||
    (c.category || '').toLowerCase().includes(query)
  );
  if (levelFilter) list = list.filter(c => c.level === levelFilter);

  if (!list.length) {
    return `
      <div class="empty-state">
        <i class="fas fa-book-open"></i>
        <h3>No courses found</h3>
        <p>Try adjusting your filters or search term.</p>
      </div>`;
  }

  return `
    <div class="card-grid">
      ${list.map(c => {
        const enrolled = S.enrolledCourseIds.has(String(c.id));
        const inWishlist = S.wishlistIds.has(String(c.id));
        return `
          <article class="program-card">
            <div style="display:flex;justify-content:space-between;gap:8px">
              <span class="chip chip-blue">${esc((c.course_type || '').replace('_',' '))}</span>
              <span class="chip chip-neutral">${esc(c.level || '')}</span>
            </div>
            <h4 class="program-title">${esc(c.title || '')}</h4>
            <p class="program-desc">${esc((c.description || '').slice(0, 120))}</p>
            ${c.expert_name ? `<p class="program-meta"><i class="fas fa-user-tie"></i> ${esc(c.expert_name)}</p>` : ''}
            <footer class="program-footer">
              <span class="program-price">${fmtCur(c.price || 0)}</span>
              <span class="program-meta">
                ${c.duration_weeks ? c.duration_weeks + 'w' : (c.duration_hours || 0) + 'h'} ·
                ${c.enrolled_count || 0} enrolled
              </span>
            </footer>
            <div class="panel-actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              ${enrolled
                ? `<button class="btn btn-success btn-sm flex-1" data-action="open-course-player" data-id="${c.id}">
                    <i class="fas fa-play"></i> Continue</button>`
                : `<button class="btn btn-primary btn-sm flex-1" data-action="enroll-modal" data-id="${c.id}">
                    <i class="fas fa-shopping-cart"></i> Enroll</button>`
              }
              <button class="btn btn-secondary btn-sm" data-action="view-course-detail" data-id="${c.id}">
                <i class="fas fa-eye"></i></button>
              <button class="btn btn-secondary btn-sm" data-action="toggle-wishlist" data-id="${c.id}">
                <i class="fas fa-heart" style="color:${inWishlist ? 'var(--danger)' : 'inherit'}"></i>
              </button>
            </div>
          </article>
        `;
      }).join('')}
    </div>`;
}
