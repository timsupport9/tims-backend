/* ============================================================
   public/components/hero.js — Landing hero section
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  function render() {
    const s = EH.PublicConfig.stats;
    return `
      <section class="hero">
        <div class="hero-content">
          <span class="hero-badge">
            <span class="live-indicator"></span>
            Trusted by learners, experts and institutions
          </span>
          <h1 class="hero-title">
            Learn, consult and grow with
            <span class="hero-title-accent">real experts</span>
          </h1>
          <p class="hero-subtitle">
            ExpertHub combines an E-School, bootcamps, short courses, tuition, exam prep,
            1-on-1 consultations and full corporate training in one modern platform.
          </p>
          <div class="hero-cta">
            <button class="btn btn-primary btn-lg" id="heroStart">
              <i class="fas fa-rocket"></i> Get started free
            </button>
            <button class="btn btn-secondary btn-lg" id="heroSignIn">
              <i class="fas fa-right-to-bracket"></i> I already have an account
            </button>
          </div>
          <div class="hero-stats">
            <div><div class="hero-stat-value">${s.learners}</div><div class="hero-stat-label">Active learners</div></div>
            <div><div class="hero-stat-value">${s.experts}</div><div class="hero-stat-label">Verified experts</div></div>
            <div><div class="hero-stat-value">${s.rating}</div><div class="hero-stat-label">Average rating</div></div>
          </div>
        </div>

        <div class="hero-visual">
          <div class="hero-card">
            <div class="hero-card-row">
              <div class="hero-card-icon"><i class="fas fa-school"></i></div>
              <div>
                <div class="hero-card-title">E-School hub</div>
                <div class="hero-card-desc">Bootcamps, courses, tuition and exams</div>
              </div>
            </div>
            <div class="hero-card-row">
              <div class="hero-card-icon green"><i class="fas fa-comments"></i></div>
              <div>
                <div class="hero-card-title">1-on-1 consultations</div>
                <div class="hero-card-desc">Chat, audio and video calls</div>
              </div>
            </div>
            <div class="hero-card-row">
              <div class="hero-card-icon yellow"><i class="fas fa-user-tie"></i></div>
              <div>
                <div class="hero-card-title">Verified experts</div>
                <div class="hero-card-desc">Approved by our admin team</div>
              </div>
            </div>
          </div>
          <div class="hero-card">
            <div class="hero-card-row">
              <div class="hero-card-icon"><i class="fas fa-building-columns"></i></div>
              <div>
                <div class="hero-card-title">Corporate training</div>
                <div class="hero-card-desc">Programmes, cohorts, assessments and compliance</div>
              </div>
            </div>
          </div>
        </div>
      </section>`;
  }

  function attach(root) {
    if (!root) return;
    const start = root.querySelector('#heroStart');
    const signIn = root.querySelector('#heroSignIn');
    if (start) start.onclick = () => { location.hash = '#/register'; };
    if (signIn) signIn.onclick = () => { location.hash = '#/login'; };
  }

  EH.Hero = { render, attach };
})(window);
