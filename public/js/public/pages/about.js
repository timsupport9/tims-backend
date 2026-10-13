/* ============================================================
   public/pages/about.js
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  async function render() {
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <div class="public-page">
        ${EH.PublicNavbar.render()}
        <header class="public-page-header">
          <h1>About ExpertHub</h1>
          <p>We connect learners, experts and institutions in one modern platform.</p>
        </header>
        <section class="public-content detail-layout">
          <article class="detail-main">
            <h2>Our mission</h2>
            <p>ExpertHub exists to make high-quality education and expert guidance accessible to everyone, everywhere.</p>

            <h2>What we do</h2>
            <ul class="list-stack">
              <li class="list-row"><div class="list-row-main">
                <span class="list-row-title">E-School</span>
                <span class="list-row-sub">Bootcamps, short courses, tuition and exam prep.</span>
              </div></li>
              <li class="list-row"><div class="list-row-main">
                <span class="list-row-title">1-on-1 consultations</span>
                <span class="list-row-sub">Chat, audio, and video consultations with verified experts.</span>
              </div></li>
              <li class="list-row"><div class="list-row-main">
                <span class="list-row-title">Corporate training</span>
                <span class="list-row-sub">Programmes, cohorts, assessments, and compliance tracking for institutions.</span>
              </div></li>
            </ul>
          </article>
        </section>
        ${EH.PublicCTA.render()}
        ${EH.PublicFooter.render()}
      </div>`;

    EH.PublicNavbar.attach(root);
    EH.PublicCTA.attach(root);
    EH.PublicFooter.attach(root);
    EH.MobileNavigation.attach(root);
  }

  EH.AboutPage = { render };
})(window);
