/* ============================================================
   public/pages/expert-detail.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  async function render(id) {
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <div class="public-page">
        ${EH.PublicNavbar.render()}
        <div class="skeleton skeleton-line" style="height:120px;margin:20px 0"></div>
      </div>`;

    const d = await EH.ExpertsService.detail(id);
    const expert = d?.expert || d || null;

    if (!expert) {
      root.innerHTML = `
        <div class="public-page">
          ${EH.PublicNavbar.render()}
          <section class="public-content">
            ${EH.EmptyState.render({
              icon: 'fa-user-tie', title: 'Expert not found',
            })}
          </section>
          ${EH.PublicFooter.render()}
        </div>`;
      EH.PublicNavbar.attach(root);
      EH.PublicFooter.attach(root);
      return;
    }

    const avatar = expert.avatar || EH.PublicFormat.avatar(expert.name);
    root.innerHTML = `
      <div class="public-page">
        ${EH.PublicNavbar.render()}
        <header class="public-page-header detail-hero">
          <img class="profile-avatar" src="${EH.Fmt.esc(avatar)}" alt="" />
          <div>
            <h1>${EH.Fmt.esc(expert.name)}</h1>
            <p>${EH.Fmt.esc(expert.specialization || '')}</p>
            <p>
              <i class="fas fa-star" style="color:#f59e0b"></i>
              ${EH.PublicFormat.rating(expert.average_rating)} · ${EH.Fmt.cur(expert.hourly_rate || 0)} / hr
            </p>
          </div>
        </header>
        <section class="public-content detail-layout">
          <article class="detail-main">
            <h2>About</h2>
            <p>${EH.Fmt.esc(expert.bio || 'No bio provided.')}</p>
          </article>
          <aside class="detail-sidebar">
            <div class="panel">
              <a href="#/register" class="btn btn-primary btn-block">
                <i class="fas fa-calendar-plus"></i> Book consultation</a>
              <a href="#/experts" class="btn btn-secondary btn-block">
                <i class="fas fa-arrow-left"></i> All experts</a>
            </div>
          </aside>
        </section>
        ${EH.PublicFooter.render()}
      </div>`;

    EH.PublicNavbar.attach(root);
    EH.PublicFooter.attach(root);
    EH.MobileNavigation.attach(root);
  }

  EH.ExpertDetailPage = { render };
})(window);
