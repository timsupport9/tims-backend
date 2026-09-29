/* ============================================================
   ExpertHub 2.0 — 07-landing.js
   Public landing page.
   ============================================================ */

/* ============================================================
   LANDING PAGE
   ============================================================ */
function renderLanding() {
  appPhase = 'landing';
  $('#app-root').innerHTML = `
    <div class="landing">
      <nav class="landing-nav">
        <div class="landing-brand">
          <div class="landing-brand-icon"><i class="fas fa-graduation-cap"></i></div>
          <span>ExpertHub</span>
        </div>
        <div class="landing-nav-actions">
          <button class="btn btn-ghost" id="navLogin"><i class="fas fa-right-to-bracket"></i> Sign in</button>
          <button class="btn btn-primary" id="navRegister"><i class="fas fa-user-plus"></i> Create account</button>
        </div>
      </nav>

      <main class="hero">
        <div>
          <span class="hero-badge"><span class="live-indicator"></span> Trusted by learners, experts and institutions</span>
          <h1 class="hero-title">Learn, consult and grow with <span class="hero-title-accent">real experts</span></h1>
          <p class="hero-subtitle">
            ExpertHub combines an E-School, bootcamps, short courses, tuition, exam prep,
            1-on-1 consultations and full corporate training in one modern platform.
          </p>
          <div class="hero-cta">
            <button class="btn btn-primary" id="heroStart"><i class="fas fa-rocket"></i> Get started free</button>
            <button class="btn btn-secondary" id="heroSignIn"><i class="fas fa-right-to-bracket"></i> I already have an account</button>
          </div>
          <div class="hero-stats">
            <div><div class="hero-stat-value">2k+</div><div class="hero-stat-label">Active learners</div></div>
            <div><div class="hero-stat-value">150+</div><div class="hero-stat-label">Verified experts</div></div>
            <div><div class="hero-stat-value">4.9 / 5</div><div class="hero-stat-label">Average rating</div></div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-card">
            <div class="hero-card-row">
              <div class="hero-card-icon"><i class="fas fa-school"></i></div>
              <div><div class="hero-card-title">E-School hub</div><div class="hero-card-desc">Bootcamps, courses, tuition and exams</div></div>
            </div>
            <div class="hero-card-row">
              <div class="hero-card-icon green"><i class="fas fa-comments"></i></div>
              <div><div class="hero-card-title">1-on-1 consultations</div><div class="hero-card-desc">Chat, audio and video calls</div></div>
            </div>
            <div class="hero-card-row">
              <div class="hero-card-icon yellow"><i class="fas fa-user-tie"></i></div>
              <div><div class="hero-card-title">Verified experts</div><div class="hero-card-desc">Approved by our admin team</div></div>
            </div>
          </div>
          <div class="hero-card">
            <div class="hero-card-row">
              <div class="hero-card-icon"><i class="fas fa-building-columns"></i></div>
              <div><div class="hero-card-title">Corporate training</div><div class="hero-card-desc">Programmes, cohorts, assessments and compliance</div></div>
            </div>
          </div>
        </div>
      </main>

      <section class="section alt">
        <h2 class="section-title">Everything you need to learn, earn and train</h2>
        <p class="section-sub">A complete platform for learners, experts, institutions and administrators.</p>
        <div class="features-grid">
          <div class="feature-card"><div class="feature-icon"><i class="fas fa-graduation-cap"></i></div><h3>Learn anything</h3><p>Bootcamps, short courses, tuition and exam prep curated by experts.</p></div>
          <div class="feature-card"><div class="feature-icon" style="background:linear-gradient(135deg,#10b981,#059669)"><i class="fas fa-user-tie"></i></div><h3>Teach and earn</h3><p>Experts get verified, manage consultations and withdraw earnings.</p></div>
          <div class="feature-card"><div class="feature-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706)"><i class="fas fa-comments"></i></div><h3>Real-time chat</h3><p>Live messaging, attachments, typing indicator and video calls.</p></div>
          <div class="feature-card"><div class="feature-icon" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9)"><i class="fas fa-building-columns"></i></div><h3>Corporate training</h3><p>Programmes, cohorts, assessments, certifications and compliance.</p></div>
          <div class="feature-card"><div class="feature-icon" style="background:linear-gradient(135deg,#ef4444,#b91c1c)"><i class="fas fa-shield-halved"></i></div><h3>Admin controlled</h3><p>Approvals, moderation, payouts and full audit logging built in.</p></div>
          <div class="feature-card"><div class="feature-icon" style="background:linear-gradient(135deg,#0ea5e9,#0369a1)"><i class="fas fa-chart-line"></i></div><h3>Deep analytics</h3><p>Track progress, scores and completion across all cohorts.</p></div>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Simple, transparent pricing</h2>
        <p class="section-sub">Choose the plan that fits your journey.</p>
        <div class="pricing-grid">
          <div class="pricing-card">
            <span class="pricing-badge">Learner</span>
            <h3 style="margin:0">Free</h3>
            <div class="pricing-price">$0<span>/mo</span></div>
            <ul class="pricing-features">
              <li><i class="fas fa-check"></i> Browse all courses</li>
              <li><i class="fas fa-check"></i> 1 free consultation per month</li>
              <li><i class="fas fa-check"></i> Community access</li>
              <li><i class="fas fa-check"></i> Progress tracking</li>
            </ul>
            <button class="btn btn-secondary btn-block" onclick="location.hash='#/register'">Get started</button>
          </div>
          <div class="pricing-card featured">
            <span class="pricing-badge">Expert</span>
            <h3 style="margin:0">Pro</h3>
            <div class="pricing-price">20%<span> commission</span></div>
            <ul class="pricing-features">
              <li><i class="fas fa-check"></i> Create unlimited courses</li>
              <li><i class="fas fa-check"></i> Accept consultations</li>
              <li><i class="fas fa-check"></i> Instant payouts (7-day hold)</li>
              <li><i class="fas fa-check"></i> Priority support</li>
            </ul>
            <button class="btn btn-primary btn-block" onclick="location.hash='#/register'">Become an expert</button>
          </div>
          <div class="pricing-card">
            <span class="pricing-badge">Enterprise</span>
            <h3 style="margin:0">Institution</h3>
            <div class="pricing-price">Let's talk</div>
            <ul class="pricing-features">
              <li><i class="fas fa-check"></i> Team accounts and ops manager</li>
              <li><i class="fas fa-check"></i> Programmes, cohorts and trainees</li>
              <li><i class="fas fa-check"></i> Assessments and capstone projects</li>
              <li><i class="fas fa-check"></i> Custom branding and SSO</li>
            </ul>
            <button class="btn btn-secondary btn-block" onclick="location.hash='#/register'">Register institution</button>
          </div>
        </div>
      </section>

      <section class="section alt">
        <h2 class="section-title">Loved by learners, experts and institutions</h2>
        <p class="section-sub">Real stories from our community.</p>
        <div class="testimonials-grid">
          <div class="testimonial">
            <p class="testimonial-text">"ExpertHub helped me switch careers in 6 months. The bootcamp was intense but amazing."</p>
            <div class="testimonial-author">
              <img class="testimonial-avatar" src="https://ui-avatars.com/api/?background=1e3a8a&color=fff&name=Jane+D" alt="" />
              <div><div class="testimonial-name">Jane D.</div><div class="testimonial-role">Software Engineer</div></div>
            </div>
          </div>
          <div class="testimonial">
            <p class="testimonial-text">"As an expert, I doubled my income in 3 months. The platform handles payments automatically."</p>
            <div class="testimonial-author">
              <img class="testimonial-avatar" src="https://ui-avatars.com/api/?background=059669&color=fff&name=Dr+S" alt="" />
              <div><div class="testimonial-name">Dr. Sarah K.</div><div class="testimonial-role">Data Science Expert</div></div>
            </div>
          </div>
          <div class="testimonial">
            <p class="testimonial-text">"We run 12 cohorts a year through ExpertHub. Trainee tracking and assessments just work."</p>
            <div class="testimonial-author">
              <img class="testimonial-avatar" src="https://ui-avatars.com/api/?background=6d28d9&color=fff&name=Acme" alt="" />
              <div><div class="testimonial-name">Acme Academy</div><div class="testimonial-role">Corporate Training</div></div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Frequently asked questions</h2>
        <p class="section-sub">Everything you need to know.</p>
        <div class="faq-list">
          ${[
            ['How does registration work?', 'Learners are approved instantly. Experts and institutions require admin approval.'],
            ['What is the platform commission?', 'We charge a flat 20% commission on all course sales and consultations.'],
            ['How long do payouts take?', 'Withdrawals have a 7-day holding period, then process within 3 to 5 business days.'],
            ['Can I switch from learner to expert?', 'Yes. Apply to become an expert from your dashboard. Our team reviews each application.'],
            ['Do you support corporate training?', 'Yes. Institutions get programmes, cohorts, assessments, projects, certifications and compliance tracking.'],
          ].map(([q, a]) => `<div class="faq-item"><div class="faq-q">${q}<i class="fas fa-chevron-down"></i></div><div class="faq-a">${a}</div></div>`).join('')}
        </div>
      </section>

      <footer class="landing-footer">
        ${new Date().getFullYear()} ExpertHub. E-School, Consultation and Corporate Training Platform.
      </footer>
    </div>`;

  $('#navLogin').onclick = $('#heroSignIn').onclick = () => { location.hash = '#/login'; };
  $('#navRegister').onclick = $('#heroStart').onclick = () => { location.hash = '#/register'; };
  $$('.faq-q').forEach(q => q.onclick = () => q.parentElement.classList.toggle('open'));
}
