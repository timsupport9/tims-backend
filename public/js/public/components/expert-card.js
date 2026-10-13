/* ============================================================
   public/components/expert-card.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render(expert) {
    const avatar = expert.avatar || EH.PublicFormat.avatar(expert.name);
    return `
      <article class="expert-card public-expert-card">
        <img class="expert-avatar" src="${EH.Fmt.esc(avatar)}" alt="" />
        <h4 class="expert-name">${EH.Fmt.esc(expert.name)}</h4>
        <p class="expert-expertise">${EH.Fmt.esc(expert.specialization || '—')}</p>
        <p class="expert-rate">${EH.Fmt.cur(expert.hourly_rate || 0)} / hr</p>
        <p class="expert-rating">
          <i class="fas fa-star" style="color:#f59e0b"></i>
          <span>${EH.PublicFormat.rating(expert.average_rating)}</span>
        </p>
        <a href="#/expert/${expert.id}" class="btn btn-secondary btn-block">
          <i class="fas fa-eye"></i> View Profile</a>
      </article>`;
  }

  EH.ExpertCard = { render };
})(window);
