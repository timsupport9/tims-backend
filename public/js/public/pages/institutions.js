/* ============================================================
   public/pages/institutions.js — Corporate/institution marketing
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
          <h1>Corporate & Institutional Training</h1>
          <p>Run programmes, cohorts, assessments and compliance in one place.</p>
        </header>

        <section class="section">
          <h2 class="section-title">Built for L&D teams</h2>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon"><i class="fas fa-diagram-project"></i></div>
              <h3>Programmes</h3>
              <p>Design sequenced learning journeys with prerequisites and modules.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon green"><i class="fas fa-layer-group"></i></div>
              <h3>Cohorts</h3>
              <p>Run multiple batches with instructors, capacity and waitlists.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon yellow"><i class="fas fa-clipboard-check"></i></div>
              <h3>Assessments</h3>
              <p>Quizzes, exams, projects and capstone grading.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon purple"><i class="fas fa-award"></i></div>
              <h3>Certifications</h3>
              <p>Issue verifiable certificates with CPD points and expiry tracking.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon red"><i class="fas fa-shield-halved"></i></div>
              <h3>Compliance</h3>
              <p>Rules, recurrence, and status across your workforce.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon blue"><i class="fas fa-chart-line"></i></div>
              <h3>Reports</h3>
              <p>Scorecards, cost analysis, compliance and skills matrices.</p>
            </div>
          </div>
        </section>

        <section class="section alt">
          <div class="cta-band">
            <h2>Ready to onboard your organisation?</h2>
            <p>Talk to our team to plan your rollout.</p>
            <div class="hero-cta">
              <a href="#/register" class="btn btn-primary btn-lg">
                <i class="fas fa-building"></i> Register institution</a>
              <a href="#/contact" class="btn btn-secondary btn-lg">
                <i class="fas fa-envelope"></i> Talk to sales</a>
            </div>
          </div>
        </section>

        ${EH.PublicCTA.render()}
        ${EH.PublicFooter.render()}
      </div>`;

    EH.PublicNavbar.attach(root);
    EH.PublicCTA.attach(root);
    EH.PublicFooter.attach(root);
    EH.MobileNavigation.attach(root);
  }

  EH.InstitutionsPage = { render };
})(window);
