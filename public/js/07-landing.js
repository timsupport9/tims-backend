/* ============================================================
   ExpertHub 2.0 — 07-landing.js  (FINAL v2)
   Public landing page — single-file, self-contained.
   Uses global helpers: $, $$, appPhase
   ============================================================ */

/* ============================================================
   MAIN RENDER
   ============================================================ */
function renderLanding() {
  appPhase = 'landing';
  window.scrollTo(0, 0);

  $('#app-root').innerHTML = `
    <div class="landing">
      <a class="skip-link" href="#main">Skip to main content</a>
      <div class="read-progress" id="readProgress" role="progressbar"
           aria-label="Page reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>

      <!-- ============================================================
           NAVIGATION
           ============================================================ -->
      <header class="landing-header" id="publicHeader">
        <nav class="landing-nav" aria-label="Primary">
          <a href="#/" class="landing-brand" data-nav="/" aria-label="ExpertHub home">
            <div class="landing-brand-icon"><i class="fas fa-graduation-cap"></i></div>
            <span>ExpertHub</span>
          </a>

          <button class="nav-toggle" id="navToggle"
                  aria-expanded="false" aria-controls="primaryNav"
                  aria-label="Toggle navigation menu">
            <i class="fas fa-bars"></i>
          </button>

          <ul class="landing-nav-links" id="primaryNav">
            <li><a class="nav-link" href="#/courses"       data-nav="/courses"><i class="fas fa-book-open"></i> Courses</a></li>
            <li><a class="nav-link" href="#/experts"       data-nav="/experts"><i class="fas fa-user-tie"></i> Experts</a></li>
            <li><a class="nav-link" href="#/consultations" data-nav="/consultations"><i class="fas fa-comments"></i> Consultations</a></li>
            <li><a class="nav-link" href="#/events"        data-nav="/events"><i class="fas fa-calendar-days"></i> Events</a></li>
            <li><a class="nav-link" href="#/institutions"  data-nav="/institutions"><i class="fas fa-building-columns"></i> Institutions</a></li>
            <li><a class="nav-link" href="#/resources"     data-nav="/resources"><i class="fas fa-graduation-cap"></i> Resources</a></li>
            <li><a class="nav-link" href="#/about"         data-nav="/about"><i class="fas fa-info-circle"></i> About</a></li>
            <li><a class="nav-link" href="#/contact"       data-nav="/contact"><i class="fas fa-envelope"></i> Contact</a></li>
          </ul>

          <div class="landing-nav-actions">
            <button class="btn btn-ghost"   id="navLogin"    data-nav="/login"><i class="fas fa-right-to-bracket"></i> Sign in</button>
            <button class="btn btn-primary" id="navRegister" data-nav="/register"><i class="fas fa-user-plus"></i> Create account</button>
          </div>
        </nav>
      </header>

      <main id="main">

        <!-- ============================================================
             HERO
             ============================================================ -->
        <section class="hero" id="hero">
          <div class="hero-copy">
            <span class="hero-badge">
              <span class="live-indicator"></span>
              Trusted by learners, experts and institutions
            </span>

            <h1 class="hero-title">
              Learn. Connect. Get Expert Help.
              <span class="hero-title-accent">Build Your Future.</span>
            </h1>

            <p class="hero-subtitle">
              ExpertHub combines an E-School, bootcamps, short courses, tuition, exam prep,
              1-on-1 consultations and full corporate training in one modern platform.
            </p>

            <form class="hero-search" id="heroSearch" role="search" aria-label="Search">
              <i class="fas fa-magnifying-glass hero-search-icon"></i>
              <label for="heroSearchInput" class="sr-only">What do you want to learn?</label>
              <input id="heroSearchInput" type="search"
                     placeholder="What do you want to learn?" autocomplete="off" />
              <button class="btn btn-primary" type="submit">
                <i class="fas fa-arrow-right"></i> Search
              </button>
            </form>

            <div class="hero-chips" id="heroChips" aria-label="Popular categories">
              ${[
                ['Web Development','web development'],
                ['Data Science','data science'],
                ['Digital Marketing','digital marketing'],
                ['Graphic Design','graphic design'],
                ['Business & Finance','business'],
                ['Exam Prep','exam prep'],
                ['Languages','languages'],
                ['Cybersecurity','cybersecurity']
              ].map(([label, q]) =>
                `<button type="button" class="chip" data-q="${q}">${label}</button>`
              ).join('')}
            </div>

            <div class="hero-cta">
              <button class="btn btn-primary" data-nav="/courses"><i class="fas fa-compass"></i> Explore courses</button>
              <button class="btn btn-secondary" data-nav="/experts"><i class="fas fa-user-tie"></i> Find an expert</button>
              <button class="btn btn-outline" data-nav="/register?role=expert"><i class="fas fa-chalkboard-user"></i> Become an expert</button>
              <button class="btn btn-outline" data-nav="/institutions"><i class="fas fa-building-columns"></i> For institutions</button>
            </div>

            <div class="hero-trust">
              <button class="hero-link" data-scroll="howItWorks" type="button">
                <i class="fas fa-circle-play"></i> How it works
              </button>
              <span class="hero-trust-sep">•</span>
              <span class="hero-trust-item"><i class="fas fa-shield-halved"></i> Verified experts</span>
              <span class="hero-trust-sep">•</span>
              <span class="hero-trust-item"><i class="fas fa-lock"></i> Secure payments</span>
            </div>
          </div>

          <div class="hero-visual" aria-hidden="true">
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
                <div class="hero-card-icon purple"><i class="fas fa-building-columns"></i></div>
                <div><div class="hero-card-title">Corporate training</div><div class="hero-card-desc">Programmes, cohorts, assessments, compliance</div></div>
              </div>
            </div>
          </div>
        </section>

        <!-- ============================================================
             TRUSTED-BY STRIP
             ============================================================ -->
        <section class="section trusted-strip" aria-labelledby="trustedHeading">
          <h2 id="trustedHeading" class="sr-only">Organisations using ExpertHub</h2>
          <p class="trusted-label">Trusted by teams, schools and companies building skills with ExpertHub</p>
          <div class="trusted-logos" aria-label="Partner logos">
            ${['Acme Academy','Nairobi Tech','BlueSky University','FinServe Bank',
               'Kigali Institute','Mara Health','Savannah Retail','Zenith Labs'].map(name => `
              <span class="trusted-logo" title="${name}">
                <i class="fas fa-building-columns" aria-hidden="true"></i>
                <span>${name}</span>
              </span>`).join('')}
          </div>
        </section>

        <!-- ============================================================
             DYNAMIC STATISTICS
             ============================================================ -->
        <section class="section stats-section" id="statsSection">
          <h2 class="sr-only">ExpertHub platform statistics</h2>
          <div class="stats-grid" id="statsGrid" aria-live="polite">
            ${skeletonLines(3)}
          </div>
        </section>

        <!-- ============================================================
             HOW EXPERTHUB WORKS
             ============================================================ -->
        <section class="section alt" id="howItWorks">
          <h2 class="section-title">How ExpertHub works</h2>
          <p class="section-sub">One platform, three journeys. Pick the one that fits you.</p>

          <div class="hiw-tabs" role="tablist" aria-label="How ExpertHub works journeys">
            <button class="hiw-tab active" data-journey="learners"     role="tab" aria-selected="true"  tabindex="0"  aria-controls="hiwPanel-learners">For Learners</button>
            <button class="hiw-tab"        data-journey="experts"      role="tab" aria-selected="false" tabindex="-1" aria-controls="hiwPanel-experts">For Experts</button>
            <button class="hiw-tab"        data-journey="institutions" role="tab" aria-selected="false" tabindex="-1" aria-controls="hiwPanel-institutions">For Institutions</button>
          </div>

          <div class="hiw-panel active" id="hiwPanel-learners" role="tabpanel">
            <ol class="hiw-steps">
              <li class="hiw-step"><span class="hiw-step-num">1</span><div><h3>Create your account</h3><p>Sign up free in seconds — learners are approved instantly.</p></div></li>
              <li class="hiw-step"><span class="hiw-step-num">2</span><div><h3>Discover courses or experts</h3><p>Browse by category, skill, level, rating or price.</p></div></li>
              <li class="hiw-step"><span class="hiw-step-num">3</span><div><h3>Enroll or book</h3><p>Pay securely and reserve your seat or session.</p></div></li>
              <li class="hiw-step"><span class="hiw-step-num">4</span><div><h3>Learn and consult</h3><p>Attend live sessions, complete activities and chat with experts.</p></div></li>
              <li class="hiw-step"><span class="hiw-step-num">5</span><div><h3>Track progress and achieve</h3><p>Earn certificates, build a portfolio and level up your career.</p></div></li>
            </ol>
          </div>

          <div class="hiw-panel" id="hiwPanel-experts" role="tabpanel" hidden>
            <ol class="hiw-steps">
              <li class="hiw-step"><span class="hiw-step-num">1</span><div><h3>Apply</h3><p>Submit your profile, credentials and areas of expertise.</p></div></li>
              <li class="hiw-step"><span class="hiw-step-num">2</span><div><h3>Get verified</h3><p>Our admin team reviews and approves qualified experts.</p></div></li>
              <li class="hiw-step"><span class="hiw-step-num">3</span><div><h3>Publish</h3><p>Create courses, bootcamps and consultation offerings.</p></div></li>
              <li class="hiw-step"><span class="hiw-step-num">4</span><div><h3>Teach</h3><p>Run live sessions and 1-on-1 consultations with students.</p></div></li>
              <li class="hiw-step"><span class="hiw-step-num">5</span><div><h3>Earn and withdraw</h3><p>Get paid securely with scheduled payouts after the 7-day hold.</p></div></li>
            </ol>
          </div>

          <div class="hiw-panel" id="hiwPanel-institutions" role="tabpanel" hidden>
            <ol class="hiw-steps">
              <li class="hiw-step"><span class="hiw-step-num">1</span><div><h3>Register</h3><p>Set up your institution workspace and admin team.</p></div></li>
              <li class="hiw-step"><span class="hiw-step-num">2</span><div><h3>Create programmes</h3><p>Design curricula, cohorts, activities and certifications.</p></div></li>
              <li class="hiw-step"><span class="hiw-step-num">3</span><div><h3>Add learners</h3><p>Onboard trainees individually or in bulk.</p></div></li>
              <li class="hiw-step"><span class="hiw-step-num">4</span><div><h3>Manage cohorts</h3><p>Track attendance, assignments and engagement in real time.</p></div></li>
              <li class="hiw-step"><span class="hiw-step-num">5</span><div><h3>Assess and certify</h3><p>Run assessments, capstones and issue verifiable certificates.</p></div></li>
            </ol>
          </div>
        </section>

        <!-- ============================================================
             FEATURES
             ============================================================ -->
        <section class="section" id="features">
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

        <!-- ============================================================
             BOOTCAMP SPOTLIGHT
             ============================================================ -->
        <section class="section spotlight-section" aria-labelledby="spotlightHeading">
          <div class="spotlight" id="spotlight" aria-live="polite">
            ${skeletonLines(2)}
          </div>
        </section>

        <!-- ============================================================
             POPULAR COURSES
             ============================================================ -->
        <section class="section" id="popularCourses">
          <div class="section-head">
            <div>
              <h2 class="section-title">Popular courses</h2>
              <p class="section-sub">Hand-picked by our community this month.</p>
            </div>
            <button class="btn btn-secondary" data-nav="/courses">View all courses <i class="fas fa-arrow-right"></i></button>
          </div>
          <div class="courses-grid" id="coursesGrid" aria-live="polite">${skeletonLines(2)}</div>
        </section>

        <!-- ============================================================
             MEET OUR EXPERTS
             ============================================================ -->
        <section class="section alt" id="meetExperts">
          <div class="section-head">
            <div>
              <h2 class="section-title">Meet our experts</h2>
              <p class="section-sub">Verified professionals ready to help you grow.</p>
            </div>
            <button class="btn btn-secondary" data-nav="/experts">View all experts <i class="fas fa-arrow-right"></i></button>
          </div>
          <div class="experts-grid" id="expertsGrid" aria-live="polite">${skeletonLines(2)}</div>
        </section>

        <!-- ============================================================
             UPCOMING EVENTS
             ============================================================ -->
        <section class="section" id="events" aria-labelledby="eventsHeading">
          <div class="section-head">
            <div>
              <h2 id="eventsHeading" class="section-title">Upcoming events</h2>
              <p class="section-sub">Live workshops, webinars and info sessions — free to attend.</p>
            </div>
            <button class="btn btn-secondary" data-nav="/events">View calendar <i class="fas fa-arrow-right"></i></button>
          </div>
          <div class="events-grid" id="eventsGrid" aria-live="polite">${skeletonLines(2)}</div>
        </section>

        <!-- ============================================================
             CONSULTATIONS
             ============================================================ -->
        <section class="section alt" id="consultations">
          <h2 class="section-title">1-on-1 consultations, your way</h2>
          <p class="section-sub">Book the format that works best for you — chat, audio or video.</p>
          <div class="consult-grid">
            <div class="consult-card"><div class="consult-icon"><i class="fas fa-comment-dots"></i></div><h3>Chat consultation</h3><p>Text-based Q&A with file sharing and async replies within your session window.</p></div>
            <div class="consult-card"><div class="consult-icon"><i class="fas fa-phone"></i></div><h3>Audio call</h3><p>Voice-only sessions, ideal for coaching, interviews and quick advice.</p></div>
            <div class="consult-card"><div class="consult-icon"><i class="fas fa-video"></i></div><h3>Video call</h3><p>Face-to-face sessions with screen sharing, whiteboard and optional recording.</p></div>
          </div>
          <div class="consult-cta">
            <button class="btn btn-primary" data-nav="/consultations"><i class="fas fa-calendar-plus"></i> Book a consultation</button>
          </div>
        </section>

        <!-- ============================================================
             INSTITUTIONS
             ============================================================ -->
        <section class="section" id="institutions">
          <div class="inst-split">
            <div>
              <h2 class="section-title">Corporate training, built for scale</h2>
              <p class="section-sub">Run cohorts, track learners, assess outcomes and issue certificates — all from one console.</p>
              <ul class="inst-list">
                <li><i class="fas fa-check"></i> Team accounts and ops manager</li>
                <li><i class="fas fa-check"></i> Programmes, cohorts and trainees</li>
                <li><i class="fas fa-check"></i> Assessments and capstone projects</li>
                <li><i class="fas fa-check"></i> Attendance and engagement tracking</li>
                <li><i class="fas fa-check"></i> Certification and compliance</li>
                <li><i class="fas fa-check"></i> Custom branding and SSO</li>
                <li><i class="fas fa-check"></i> Reporting and analytics</li>
                <li><i class="fas fa-check"></i> Dedicated support</li>
              </ul>
              <div class="inst-cta">
                <button class="btn btn-primary" data-nav="/register?role=institution"><i class="fas fa-building-columns"></i> Register institution</button>
                <button class="btn btn-outline" data-nav="/contact?topic=institutions">Talk to our team</button>
              </div>
            </div>
            <div class="inst-visual" aria-hidden="true">
              <div class="inst-mock">
                <div class="inst-mock-row">
                  <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
                </div>
                <div class="inst-mock-body">
                  <div class="inst-mock-line lg"></div>
                  <div class="inst-mock-line"></div>
                  <div class="inst-mock-line"></div>
                  <div class="inst-mock-grid">
                    <div class="inst-mock-tile"></div><div class="inst-mock-tile"></div>
                    <div class="inst-mock-tile"></div><div class="inst-mock-tile"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ============================================================
             WHY EXPERTHUB (comparison)
             ============================================================ -->
        <section class="section alt" id="whyExpertHub" aria-labelledby="whyHeading">
          <h2 id="whyHeading" class="section-title">Why ExpertHub?</h2>
          <p class="section-sub">See how we compare to typical online-learning platforms.</p>

          <div class="compare-vendor" role="region" aria-label="Platform comparison">
            <table class="compare-vendor-table">
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col" class="col-eh">ExpertHub</th>
                  <th scope="col">Typical course site</th>
                  <th scope="col">Typical consultation site</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  ['Courses + bootcamps',              'yes','partial','no'],
                  ['1-on-1 consultations (chat/A/V)',  'yes','no','yes'],
                  ['Corporate cohorts & compliance',   'yes','no','no'],
                  ['Assessments & capstones',          'yes','partial','no'],
                  ['Verifiable certificates',          'yes','partial','no'],
                  ['Admin moderation & audit log',     'yes','no','partial'],
                  ['Transparent 20% commission',       'yes','varies','varies'],
                  ['Wallet & scheduled payouts',       'yes','partial','yes'],
                  ['M-Pesa & card payments',           'yes','partial','no']
                ].map(([label, eh, a, b]) => `
                  <tr>
                    <th scope="row">${esc(label)}</th>
                    <td class="cell-${eh}">${yesNoPartial(eh)}</td>
                    <td class="cell-${a}">${yesNoPartial(a)}</td>
                    <td class="cell-${b}">${yesNoPartial(b)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <!-- ============================================================
             AUDIENCE SECTIONS
             ============================================================ -->
        <section class="section" id="audiences">
          <h2 class="section-title">Built for every journey</h2>
          <p class="section-sub">Whether you learn, teach or train, ExpertHub is designed around you.</p>
          <div class="audience-grid">
            <article class="audience-card">
              <div class="audience-icon"><i class="fas fa-user-graduate"></i></div>
              <h3>For Learners</h3>
              <ul class="audience-list">
                <li><i class="fas fa-check"></i> Courses</li>
                <li><i class="fas fa-check"></i> Bootcamps</li>
                <li><i class="fas fa-check"></i> Exam preparation</li>
                <li><i class="fas fa-check"></i> Tuition</li>
                <li><i class="fas fa-check"></i> Expert consultations</li>
                <li><i class="fas fa-check"></i> Academic assistance</li>
                <li><i class="fas fa-check"></i> Progress tracking</li>
                <li><i class="fas fa-check"></i> Certificates</li>
              </ul>
              <button class="btn btn-secondary btn-block" data-nav="/courses">Explore courses</button>
            </article>

            <article class="audience-card">
              <div class="audience-icon"><i class="fas fa-chalkboard-user"></i></div>
              <h3>For Experts</h3>
              <ul class="audience-list">
                <li><i class="fas fa-check"></i> Create courses</li>
                <li><i class="fas fa-check"></i> Manage students</li>
                <li><i class="fas fa-check"></i> Consultations</li>
                <li><i class="fas fa-check"></i> Messaging</li>
                <li><i class="fas fa-check"></i> Earnings</li>
                <li><i class="fas fa-check"></i> Wallet</li>
                <li><i class="fas fa-check"></i> Analytics</li>
                <li><i class="fas fa-check"></i> Reviews</li>
              </ul>
              <button class="btn btn-secondary btn-block" data-nav="/register?role=expert">Become an expert</button>
            </article>

            <article class="audience-card">
              <div class="audience-icon"><i class="fas fa-building-columns"></i></div>
              <h3>For Institutions</h3>
              <ul class="audience-list">
                <li><i class="fas fa-check"></i> Cohorts</li>
                <li><i class="fas fa-check"></i> Learner management</li>
                <li><i class="fas fa-check"></i> Corporate training</li>
                <li><i class="fas fa-check"></i> Assessments</li>
                <li><i class="fas fa-check"></i> Attendance</li>
                <li><i class="fas fa-check"></i> Certification</li>
                <li><i class="fas fa-check"></i> Analytics</li>
                <li><i class="fas fa-check"></i> Compliance</li>
              </ul>
              <button class="btn btn-secondary btn-block" data-nav="/register?role=institution">Register institution</button>
            </article>
          </div>
        </section>

        <!-- ============================================================
             PRICING + COMPARE + PAYMENTS
             ============================================================ -->
        <section class="section alt" id="pricing">
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
              <button class="btn btn-secondary btn-block" data-nav="/register">Get started</button>
            </div>

            <div class="pricing-card featured">
              <span class="pricing-badge">Expert</span>
              <h3 style="margin:0">Pro</h3>
              <div class="pricing-price">20%<span> commission</span></div>
              <ul class="pricing-features">
                <li><i class="fas fa-check"></i> Create unlimited courses</li>
                <li><i class="fas fa-check"></i> Accept consultations</li>
                <li><i class="fas fa-check"></i> Scheduled withdrawals after 7-day security hold</li>
                <li><i class="fas fa-check"></i> Priority support</li>
              </ul>
              <button class="btn btn-primary btn-block" data-nav="/register?role=expert">Become an expert</button>
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
              <button class="btn btn-secondary btn-block" data-nav="/register?role=institution">Register institution</button>
            </div>
          </div>

          <div class="pricing-compare">
            <button class="btn btn-outline" id="toggleCompare" aria-expanded="false" aria-controls="compareTable">
              <i class="fas fa-table-columns"></i> Compare plans
            </button>
            <div id="compareTable" class="compare-wrap" hidden>
              <table class="compare-table">
                <thead>
                  <tr><th>Feature</th><th>Learner</th><th>Expert</th><th>Institution</th></tr>
                </thead>
                <tbody>
                  <tr><th>Browse courses</th>       <td>✓</td>       <td>✓</td>       <td>✓</td></tr>
                  <tr><th>Free consultations</th>   <td>1 / month</td><td>Unlimited for own students</td><td>Unlimited</td></tr>
                  <tr><th>Publish courses</th>      <td>—</td>       <td>✓</td>       <td>✓</td></tr>
                  <tr><th>Cohort management</th>    <td>—</td>       <td>—</td>       <td>✓</td></tr>
                  <tr><th>Analytics</th>            <td>Basic</td>   <td>Full</td>    <td>Full + custom</td></tr>
                  <tr><th>Commission</th>           <td>—</td>       <td>20%</td>     <td>Custom</td></tr>
                  <tr><th>SSO &amp; branding</th>   <td>—</td>       <td>—</td>       <td>✓</td></tr>
                  <tr><th>Support</th>              <td>Community</td><td>Priority</td><td>Dedicated</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="payment-methods" id="paymentMethods">
            <h3>Supported payment methods</h3>
            <div class="payment-row" id="paymentRow">Loading…</div>
          </div>
        </section>

        <!-- ============================================================
             TRUST & SECURITY
             ============================================================ -->
        <section class="section" id="trust">
          <h2 class="section-title">Why trust ExpertHub</h2>
          <p class="section-sub">Built with security, transparency and moderation at the core.</p>
          <div class="trust-grid">
            ${[
              ['fa-circle-check',    'Verified experts',            'Every expert is reviewed and approved by our admin team.'],
              ['fa-lock',            'Secure payments',             'PCI-compliant payment handling with encrypted transactions.'],
              ['fa-user-shield',     'Protected accounts',          'Two-factor authentication and session monitoring available.'],
              ['fa-gavel',           'Admin moderation',            'Content, users and disputes are actively moderated.'],
              ['fa-percent',         'Transparent commission',      'Flat 20% commission, no hidden fees.'],
              ['fa-comments',        'Secure consultations',        'Encrypted messaging and call sessions.'],
              ['fa-star',            'Reviews and ratings',         'Verified reviews from real learners and clients.'],
              ['fa-clipboard-list',  'Audit logging',               'Full audit trail for admin actions and payouts.'],
              ['fa-scale-balanced',  'Refund and dispute process',  'Clear dispute resolution with admin mediation.'],
              ['fa-fingerprint',     'Data privacy',                'Your data is protected under applicable privacy laws.'],
              ['fa-certificate',     'Secure certificates',         'Verifiable certificates with unique IDs and QR checks.']
            ].map(([icon, title, desc]) => `
              <div class="trust-card">
                <div class="trust-icon"><i class="fas ${icon}"></i></div>
                <h3>${title}</h3>
                <p>${desc}</p>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- ============================================================
             TESTIMONIALS (carousel)
             ============================================================ -->
        <section class="section alt" id="testimonials">
          <h2 class="section-title">What our community will experience</h2>
          <p class="section-sub">
            We're just getting started. Real testimonials will appear here once verified.
          </p>
          <div class="testimonial-carousel" aria-roledescription="carousel" aria-label="Community preview">
            <div class="testimonial-viewport">
              <div class="testimonial-track" id="testimonialTrack">${skeletonLines(2)}</div>
            </div>
            <div class="testimonial-dots" role="tablist" aria-label="Testimonial slides">
              <button class="dot" data-testimonial-dot="0" role="tab" aria-selected="true"  aria-label="Slide 1"></button>
              <button class="dot" data-testimonial-dot="1" role="tab" aria-selected="false" aria-label="Slide 2"></button>
              <button class="dot" data-testimonial-dot="2" role="tab" aria-selected="false" aria-label="Slide 3"></button>
            </div>
          </div>
        </section>

        <!-- ============================================================
             RESOURCES / BLOG
             ============================================================ -->
        <section class="section" id="resources" aria-labelledby="resourcesHeading">
          <div class="section-head">
            <div>
              <h2 id="resourcesHeading" class="section-title">Learn from our resources</h2>
              <p class="section-sub">Guides, expert insights and study tips from the ExpertHub team.</p>
            </div>
            <button class="btn btn-secondary" data-nav="/resources">Browse all resources <i class="fas fa-arrow-right"></i></button>
          </div>
          <div class="resources-grid" id="resourcesGrid" aria-live="polite">${skeletonLines(2)}</div>
        </section>

        <!-- ============================================================
             FAQ
             ============================================================ -->
        <section class="section alt" id="faq">
          <h2 class="section-title">Frequently asked questions</h2>
          <p class="section-sub">Everything you need to know. Search or pick a category.</p>

          <div class="faq-controls">
            <label for="faqSearch" class="sr-only">Search FAQs</label>
            <input id="faqSearch" type="search" placeholder="Search questions…" autocomplete="off" />
            <div class="faq-filters" id="faqFilters">
              <button class="faq-filter active" data-cat="all">All</button>
              <button class="faq-filter" data-cat="account">Account</button>
              <button class="faq-filter" data-cat="learning">Learning</button>
              <button class="faq-filter" data-cat="experts">Experts</button>
              <button class="faq-filter" data-cat="payments">Payments</button>
              <button class="faq-filter" data-cat="institutions">Institutions</button>
              <button class="faq-filter" data-cat="security">Security</button>
            </div>
          </div>

          <div class="faq-list" id="faqList">${buildFaqItems()}</div>
          <p class="faq-empty" id="faqEmpty" hidden>No matching questions. Try another search.</p>
        </section>

        <!-- ============================================================
             NEWSLETTER
             ============================================================ -->
        <section class="section newsletter-section" id="newsletter">
          <div class="newsletter-card">
            <h2 class="section-title">Get learning opportunities in your inbox</h2>
            <p class="section-sub">New courses, expert insights and events — no spam. Unsubscribe anytime.</p>

            <form class="newsletter-form" id="newsletterForm" novalidate>
              <label for="newsletterEmail" class="sr-only">Email address</label>
              <input id="newsletterEmail" type="email" name="email" required
                     placeholder="you@example.com" autocomplete="email" />
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-paper-plane"></i> Subscribe
              </button>
            </form>

            <p class="newsletter-consent">
              By subscribing you agree to our
              <a href="#/legal/privacy" data-nav="/legal/privacy">Privacy Policy</a>.
            </p>
            <p class="newsletter-msg" id="newsletterMsg" role="status" aria-live="polite"></p>
          </div>
        </section>

        <!-- ============================================================
             FINAL CTA
             ============================================================ -->
        <section class="section alt cta-section" id="finalCTA">
          <h2 class="sr-only">Get started with ExpertHub</h2>
          <div class="cta-grid">
            <div class="cta-card">
              <h3>Ready to start learning?</h3>
              <p>Explore thousands of courses, bootcamps and expert consultations.</p>
              <button class="btn btn-primary" data-nav="/courses"><i class="fas fa-compass"></i> Explore courses</button>
            </div>
            <div class="cta-card">
              <h3>Have knowledge worth sharing?</h3>
              <p>Join as an expert, get verified and start earning on your terms.</p>
              <button class="btn btn-primary" data-nav="/register?role=expert"><i class="fas fa-chalkboard-user"></i> Become an expert</button>
            </div>
            <div class="cta-card">
              <h3>Build better learning programmes.</h3>
              <p>Empower your teams with structured cohorts, assessments and reporting.</p>
              <button class="btn btn-primary" data-nav="/contact?topic=institutions"><i class="fas fa-building-columns"></i> Talk to our team</button>
            </div>
          </div>
        </section>

      </main>

      <!-- ============================================================
           FOOTER
           ============================================================ -->
      <footer class="landing-footer">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="landing-brand">
              <span class="landing-brand-icon"><i class="fas fa-graduation-cap"></i></span>
              <span>ExpertHub</span>
            </div>
            <p class="footer-tag">E-School, Consultation and Corporate Training Platform.</p>
            <div class="footer-social" aria-label="Social links">
              <a href="https://facebook.com/"  target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i class="fab fa-facebook"></i></a>
              <a href="https://linkedin.com/"  target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i class="fab fa-linkedin"></i></a>
              <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
              <a href="https://x.com/"         target="_blank" rel="noopener noreferrer" aria-label="X"><i class="fab fa-x-twitter"></i></a>
              <a href="https://youtube.com/"   target="_blank" rel="noopener noreferrer" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
            </div>
          </div>

          <nav class="footer-col" aria-label="Platform">
            <h3>Platform</h3>
            <ul>
              <li><a href="#/courses"       data-nav="/courses">Courses</a></li>
              <li><a href="#/experts"       data-nav="/experts">Experts</a></li>
              <li><a href="#/consultations" data-nav="/consultations">Consultations</a></li>
              <li><a href="#/events"        data-nav="/events">Events</a></li>
              <li><a href="#/institutions"  data-nav="/institutions">Institutions</a></li>
            </ul>
          </nav>

          <nav class="footer-col" aria-label="Company">
            <h3>Company</h3>
            <ul>
              <li><a href="#/about"   data-nav="/about">About</a></li>
              <li><a href="#/contact" data-nav="/contact">Contact</a></li>
              <li><a href="#/careers" data-nav="/careers">Careers</a></li>
              <li><a href="#/blog"    data-nav="/blog">Blog</a></li>
            </ul>
          </nav>

          <nav class="footer-col" aria-label="Support">
            <h3>Support</h3>
            <ul>
              <li><a href="#/help"            data-nav="/help">Help Center</a></li>
              <li><a href="#/faq"             data-nav="/faq">FAQ</a></li>
              <li><a href="#/contact/support" data-nav="/contact/support">Contact Support</a></li>
              <li><a href="#/legal/refunds"   data-nav="/legal/refunds">Refund Policy</a></li>
            </ul>
          </nav>

          <nav class="footer-col" aria-label="Legal">
            <h3>Legal</h3>
            <ul>
              <li><a href="#/legal/terms"     data-nav="/legal/terms">Terms</a></li>
              <li><a href="#/legal/privacy"   data-nav="/legal/privacy">Privacy</a></li>
              <li><a href="#/legal/cookies"   data-nav="/legal/cookies">Cookie Policy</a></li>
              <li><a href="#/legal/community" data-nav="/legal/community">Community Guidelines</a></li>
            </ul>
          </nav>
        </div>

        <div class="footer-bottom">
          <span>&copy; ${new Date().getFullYear()} ExpertHub. Made for learners, experts and institutions.</span>
        </div>
      </footer>

      <!-- ============================================================
           FLOATING UI
           ============================================================ -->
      <button class="back-to-top" id="backToTop" type="button" aria-label="Back to top">
        <i class="fas fa-arrow-up" aria-hidden="true"></i>
      </button>

      <div class="sticky-cta" id="stickyCTA" role="region" aria-label="Quick actions">
        <button class="btn btn-primary" data-nav="/courses">
          <i class="fas fa-compass" aria-hidden="true"></i> Explore courses
        </button>
        <button class="btn btn-secondary" data-nav="/experts">
          <i class="fas fa-user-tie" aria-hidden="true"></i> Find an expert
        </button>
      </div>

      <aside class="cookie-banner" id="cookieBanner" role="region"
             aria-label="Cookie consent" aria-live="polite">
        <div class="cookie-inner">
          <div class="cookie-text">
            <strong>We use cookies.</strong>
            Essential cookies keep ExpertHub working. Optional ones help us improve
            your experience. See our
            <a href="#/legal/cookies" data-nav="/legal/cookies">Cookie Policy</a>.
          </div>
          <div class="cookie-actions">
            <button class="btn btn-ghost btn-sm" id="cookieSettings" type="button">Settings</button>
            <button class="btn btn-outline btn-sm" id="cookieEssential" type="button">Essential only</button>
            <button class="btn btn-primary btn-sm" id="cookieAccept" type="button">Accept all</button>
          </div>
        </div>
      </aside>
    </div>`;

  /* ============================================================
     POST-RENDER WIRING
     ============================================================ */
  wireLandingNav();
  wireLandingHero();
  wireHowItWorks();
  wirePricingCompare();
  wireFAQ();
  wireNewsletter();

  wireScrollReveal();
  initReadingProgress();
  initBackToTop();
  initStickyCTA();
  initCookieConsent();

  /* Auto-close mobile nav on internal navigation */
  document.querySelectorAll('.landing [data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      const header = document.getElementById('publicHeader');
      if (header) header.classList.remove('nav-open');
    });
  });

  /* Async data loaders */
  loadLandingStats();
  loadPopularCourses();
  loadFeaturedExperts();
  loadTestimonials();
  loadPaymentMethods();
  loadSpotlight();
  loadEvents();
  loadResources();

  /* SEO + JSON-LD */
  injectLandingSEO();

  /* Hash-based hero search prefill */
  applyHashToSearchInput();
}

/* ============================================================
   HELPERS
   ============================================================ */
function skeletonLines(n) {
  return `<div class="skeleton-block" aria-hidden="true">${
    Array.from({ length: n }).map(() => '<div class="skeleton-line"></div>').join('')
  }</div>`;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function fmtMoney(v, currency = 'USD') {
  if (v == null) return '';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
  } catch (_) { return `${currency} ${v}`; }
}

function initials(name) {
  return String(name || '?').split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();
}

function yesNoPartial(v) {
  if (v === 'yes')     return '<i class="fas fa-circle-check cmp-yes" aria-label="Yes" title="Yes"></i>';
  if (v === 'partial') return '<i class="fas fa-circle-half-stroke cmp-partial" aria-label="Partial" title="Partial"></i>';
  if (v === 'varies')  return '<i class="fas fa-circle-question cmp-partial" aria-label="Varies" title="Varies"></i>';
  return '<i class="fas fa-circle-xmark cmp-no" aria-label="No" title="No"></i>';
}

async function publicFetch(path, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout || 6000);
  try {
    const res = await fetch('/api' + path, {
      method: opts.method || 'GET',
      headers: { 'Accept': 'application/json', ...(opts.headers || {}) },
      body: opts.body,
      signal: ctrl.signal,
      credentials: 'same-origin'
    });
    clearTimeout(t);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    return { ok: true, data };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, data: null, error: e };
  }
}

function trackLanding(event, props = {}) {
  try {
    if (typeof window.gtag === 'function') window.gtag('event', event, props);
    if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event, ...props });
  } catch (_) {}
}

function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function countUp(el, target, opts = {}) {
  const { duration = 1200, suffix = '', decimals = 0 } = opts;

  if (prefersReducedMotion() || typeof target !== 'number' || !isFinite(target)) {
    el.textContent = target.toFixed(decimals) + suffix;
    return;
  }

  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = target * eased;
    el.textContent = val.toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function reveal(el, opts = {}) {
  if (!el) return;
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    el.classList.add('is-revealed');
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: opts.threshold || 0.15, rootMargin: opts.rootMargin || '0px 0px -40px 0px' });
  obs.observe(el);
}

function wireScrollReveal() {
  document.querySelectorAll('.landing .section, .landing .hero').forEach((el, i) => {
    el.classList.add('reveal-on-scroll');
    el.style.transitionDelay = Math.min(i * 40, 240) + 'ms';
    reveal(el);
  });
}

const LS = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
    catch (_) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }
};

function initReadingProgress() {
  const bar = document.getElementById('readProgress');
  if (!bar) return;
  const onScroll = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    bar.style.transform = `scaleX(${pct / 100})`;
    bar.setAttribute('aria-valuenow', Math.round(pct));
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
}

function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  const onScroll = () => btn.classList.toggle('visible', window.scrollY > 600);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  });
}

function initStickyCTA() {
  const bar = document.getElementById('stickyCTA');
  const hero = document.getElementById('hero');
  if (!bar || !hero) return;
  if (!('IntersectionObserver' in window)) { bar.classList.add('visible'); return; }
  const obs = new IntersectionObserver(([e]) => {
    bar.classList.toggle('visible', !e.isIntersecting);
  }, { threshold: 0.05 });
  obs.observe(hero);
}

function initCookieConsent() {
  const banner = document.getElementById('cookieBanner');
  if (!banner) return;
  const saved = LS.get('eh_cookie_consent');
  if (saved) return;
  setTimeout(() => banner.classList.add('visible'), 1200);

  document.getElementById('cookieAccept')?.addEventListener('click', () => {
    LS.set('eh_cookie_consent', { choice: 'all', ts: Date.now() });
    banner.classList.remove('visible');
    trackLanding('cookie_consent', { choice: 'all' });
  });
  document.getElementById('cookieEssential')?.addEventListener('click', () => {
    LS.set('eh_cookie_consent', { choice: 'essential', ts: Date.now() });
    banner.classList.remove('visible');
    trackLanding('cookie_consent', { choice: 'essential' });
  });
  document.getElementById('cookieSettings')?.addEventListener('click', () => {
    location.hash = '#/legal/cookies';
  });
}

function initTestimonialCarousel() {
  const track = document.getElementById('testimonialTrack');
  if (!track) return;
  const dots = Array.from(document.querySelectorAll('[data-testimonial-dot]'));
  if (!dots.length) return;

  let idx = 0;
  let timer = null;

  function go(i, userDriven) {
    idx = (i + dots.length) % dots.length;
    track.style.transform = `translateX(-${idx * 100}%)`;
    dots.forEach((d, k) => {
      d.classList.toggle('active', k === idx);
      d.setAttribute('aria-selected', String(k === idx));
    });
    if (userDriven) trackLanding('testimonial_dot', { idx });
  }
  function next() { go(idx + 1); }
  function start() {
    if (prefersReducedMotion()) return;
    stop();
    timer = setInterval(next, 7000);
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  dots.forEach((d, k) => d.addEventListener('click', () => { go(k, true); start(); }));

  const shell = track.closest('.testimonial-carousel');
  if (shell) {
    shell.addEventListener('mouseenter', stop);
    shell.addEventListener('mouseleave', start);
    shell.addEventListener('focusin', stop);
    shell.addEventListener('focusout', start);
  }
  start();
}

/* ============================================================
   NAV WIRING
   ============================================================ */
function wireLandingNav() {
  const header = document.getElementById('publicHeader');
  const toggle = document.getElementById('navToggle');
  const nav    = document.getElementById('primaryNav');
  if (!header || !toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const open = header.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('i').className = open ? 'fas fa-times' : 'fas fa-bars';
  });

  document.addEventListener('click', (e) => {
    if (!header.classList.contains('nav-open')) return;
    if (!header.contains(e.target)) {
      header.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.querySelector('i').className = 'fas fa-bars';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('nav-open')) {
      header.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });

  const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  document.querySelectorAll('[data-scroll]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(el.getAttribute('data-scroll'));
      if (target) target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });
  });
}

/* ============================================================
   HERO WIRING
   ============================================================ */
function wireLandingHero() {
  const form  = document.getElementById('heroSearch');
  const input = document.getElementById('heroSearchInput');
  const chips = document.getElementById('heroChips');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = (input.value || '').trim();
      trackLanding('hero_search', { q });
      location.hash = '#/courses' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
  }

  if (chips) {
    chips.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      const q = btn.getAttribute('data-q');
      trackLanding('hero_chip', { q });
      location.hash = '#/courses?q=' + encodeURIComponent(q);
    });
  }
}

function applyHashToSearchInput() {
  const input = document.getElementById('heroSearchInput');
  if (!input) return;
  const m = location.hash.match(/[?&]q=([^&]+)/);
  if (m) input.value = decodeURIComponent(m[1]);
}

/* ============================================================
   HOW IT WORKS (keyboard-friendly tabs)
   ============================================================ */
function wireHowItWorks() {
  const tabs   = $$('.hiw-tab');
  const panels = $$('.hiw-panel');
  if (!tabs.length) return;

  function activate(key, focus) {
    tabs.forEach(t => {
      const on = t.dataset.journey === key;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
      t.setAttribute('tabindex', on ? '0' : '-1');
      if (on && focus) t.focus();
    });
    panels.forEach(p => {
      const on = p.id === 'hiwPanel-' + key;
      p.classList.toggle('active', on);
      if (on) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
    });
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => activate(t.dataset.journey));
    t.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowLeft: -1, Home: -i, End: tabs.length - 1 - i };
      if (e.key in keys) {
        e.preventDefault();
        const next = (i + keys[e.key] + tabs.length) % tabs.length;
        activate(tabs[next].dataset.journey, true);
      }
    });
  });
}

/* ============================================================
   PRICING COMPARE
   ============================================================ */
function wirePricingCompare() {
  const toggle = document.getElementById('toggleCompare');
  const table  = document.getElementById('compareTable');
  if (!toggle || !table) return;
  toggle.addEventListener('click', () => {
    const willOpen = table.hasAttribute('hidden');
    if (willOpen) table.removeAttribute('hidden'); else table.setAttribute('hidden', '');
    toggle.setAttribute('aria-expanded', String(willOpen));
    trackLanding('pricing_compare_toggle', { open: willOpen });
  });
}

/* ============================================================
   FAQ
   ============================================================ */
function buildFaqItems() {
  const cats = {
    account: [
      ['How do I register?',        'Click Create account, choose your role (learner, expert or institution) and complete the sign-up form. Learners are approved instantly.'],
      ['How do I verify my email?', 'We send a verification link to your email after sign-up. Click it to activate your account.'],
      ['Can I change my role?',     'Yes. You can apply to become an expert from your dashboard. Institution accounts are reviewed by our team.']
    ],
    learning: [
      ['How do courses work?',       'Courses include video lessons, readings, activities and assessments. Bootcamps add live sessions and mentorship.'],
      ['Do I receive certificates?', 'Yes. On successful completion you receive a verifiable certificate with a unique ID.'],
      ['Can I learn on mobile?',     'Yes. ExpertHub is fully responsive and works on modern mobile browsers.']
    ],
    experts: [
      ['How do I become an expert?',  'Apply from your dashboard with your credentials and areas of expertise. Our admin team reviews each application.'],
      ['How does verification work?', 'We verify identity, qualifications and, where relevant, professional references before approval.'],
      ['How are experts paid?',       'Earnings accrue in your wallet. Withdrawals have a 7-day security hold, then process within 3–5 business days.']
    ],
    payments: [
      ['What payment methods are supported?', 'Supported methods are shown in the pricing section and depend on your region. We enable methods only when they are live on the backend.'],
      ['What is the refund policy?',          'Refunds are governed by our refund policy. Contact support within the eligible window if you have an issue.'],
      ['How does the withdrawal hold work?',  'Once a withdrawal is requested, funds are held for 7 days for security, then released for processing.']
    ],
    institutions: [
      ['Can schools register?',                'Yes. Institutions register for a workspace with team accounts, cohorts and reporting.'],
      ['Can companies create cohorts?',        'Yes. Companies can create programmes, add learners and manage cohorts from the institution console.'],
      ['Can institutions issue certificates?', 'Yes. Institutions can issue verifiable certificates on completion of programmes or assessments.']
    ],
    security: [
      ['How is my information protected?', 'We use encryption in transit, access controls and audit logging. Personal data is handled under our privacy policy.'],
      ['How are experts verified?',        'Experts are verified by our admin team through document and credential checks before they can offer services.']
    ]
  };

  let html = '';
  let i = 0;
  Object.keys(cats).forEach(cat => {
    cats[cat].forEach(([q, a]) => {
      const id = 'faq-' + (i++);
      html += `
        <div class="faq-item" data-cat="${cat}">
          <button class="faq-q" id="${id}-btn" type="button"
                  aria-expanded="false" aria-controls="${id}-panel">
            <span>${esc(q)}</span>
            <i class="fas fa-chevron-down"></i>
          </button>
          <div class="faq-a" id="${id}-panel" role="region" aria-labelledby="${id}-btn" hidden>
            <p>${esc(a)}</p>
          </div>
        </div>`;
    });
  });
  return html;
}

function wireFAQ() {
  const list = document.getElementById('faqList');
  if (!list) return;

  const search  = document.getElementById('faqSearch');
  const filters = $$('.faq-filter');
  const empty   = document.getElementById('faqEmpty');

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.faq-q');
    if (!btn) return;
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const open  = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    if (open) panel.setAttribute('hidden', ''); else panel.removeAttribute('hidden');
    btn.parentElement.classList.toggle('open', !open);
  });

  function apply() {
    const q = (search.value || '').trim().toLowerCase();
    const activeFilter = filters.find(f => f.classList.contains('active'));
    const activeCat = activeFilter ? activeFilter.dataset.cat : 'all';

    let visible = 0;
    $$('.faq-item').forEach(item => {
      const matchCat = activeCat === 'all' || item.dataset.cat === activeCat;
      const text     = item.textContent.toLowerCase();
      const matchQ   = !q || text.includes(q);
      const show     = matchCat && matchQ;
      item.hidden    = !show;
      if (show) visible++;
    });
    if (empty) empty.hidden = visible !== 0;
  }

  if (search) search.addEventListener('input', apply);

  filters.forEach(f => f.addEventListener('click', () => {
    filters.forEach(x => x.classList.remove('active'));
    f.classList.add('active');
    apply();
  }));
}

/* ============================================================
   NEWSLETTER
   ============================================================ */
function wireNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  const msg = document.getElementById('newsletterMsg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('newsletterEmail');
    const email = (input.value || '').trim();

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      msg.textContent = 'Please enter a valid email address.';
      msg.className = 'newsletter-msg error';
      input.focus();
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    msg.textContent = 'Subscribing…';
    msg.className = 'newsletter-msg';

    trackLanding('newsletter_subscribe', { email_domain: email.split('@')[1] });

    const res = await publicFetch('/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      msg.textContent = 'Thanks! Please check your inbox to confirm.';
      msg.className = 'newsletter-msg success';
      form.reset();
    } else {
      msg.textContent = 'Something went wrong. Please try again later.';
      msg.className = 'newsletter-msg error';
    }
    btn.disabled = false;
  });
}

/* ============================================================
   ASYNC DATA LOADERS
   ============================================================ */
async function loadLandingStats() {
  const grid = document.getElementById('statsGrid');
  if (!grid) return;

  const FALLBACK = {
    activeLearners: 2000, verifiedExperts: 150,
    publishedCourses: 320, completedConsultations: 5400,
    institutions: 45, countriesReached: 12,
    certificatesIssued: 1800, averageRating: 4.9
  };

  const res = await publicFetch('/public/statistics', { timeout: 5000 });
  const s = (res.ok && res.data) ? Object.assign({}, FALLBACK, res.data) : FALLBACK;

  const cards = [
    [Number(s.activeLearners)         || 0, '+',     'Active learners',         'fa-user-graduate'],
    [Number(s.verifiedExperts)        || 0, '+',     'Verified experts',        'fa-user-tie'],
    [Number(s.publishedCourses)       || 0, '+',     'Published courses',       'fa-book-open'],
    [Number(s.completedConsultations) || 0, '+',     'Consultations completed', 'fa-comments'],
    [Number(s.institutions)           || 0, '+',     'Institutions onboard',    'fa-building-columns'],
    [Number(s.countriesReached)       || 0, '',      'Countries reached',       'fa-globe'],
    [Number(s.certificatesIssued)     || 0, '+',     'Certificates issued',     'fa-certificate'],
    [Number(s.averageRating)          || 4.9, ' / 5', 'Average rating',         'fa-star']
  ];

  grid.innerHTML = cards.map(([val, suffix, label, icon]) => `
    <div class="stat-card">
      <i class="fas ${icon} stat-icon" aria-hidden="true"></i>
      <div class="stat-value" data-target="${val}" data-suffix="${suffix}">0${suffix}</div>
      <div class="stat-label">${label}</div>
    </div>`).join('');

  const runCounters = () => {
    grid.querySelectorAll('.stat-value').forEach(el => {
      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const decimals = Number.isInteger(target) ? 0 : 1;
      countUp(el, target, { suffix, decimals, duration: 1400 });
    });
  };

  if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
    grid.querySelectorAll('.stat-value').forEach(el => {
      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const decimals = Number.isInteger(target) ? 0 : 1;
      el.textContent = target.toFixed(decimals) + suffix;
    });
  } else {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      runCounters();
      io.disconnect();
    }, { threshold: 0.25 });
    io.observe(grid);
  }
}

async function loadPopularCourses() {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;

  const FALLBACK = [
    { id:'c1', title:'Full-Stack Web Development Bootcamp', expert:'Amina W.',     category:'Web Development', rating:4.9, learners:1240, duration:'12 weeks', level:'Beginner',     price:299, discount:20, image:'' },
    { id:'c2', title:'Data Science with Python',            expert:'Dr. Sarah K.', category:'Data Science',    rating:4.8, learners:890,  duration:'8 weeks',  level:'Intermediate', price:249, discount:0,  image:'' },
    { id:'c3', title:'Digital Marketing Masterclass',       expert:'Brian O.',     category:'Marketing',       rating:4.7, learners:2100, duration:'6 weeks',  level:'Beginner',     price:149, discount:15, image:'' },
    { id:'c4', title:'KCSE Mathematics Exam Prep',          expert:'Mr. Mwangi',   category:'Exam Prep',       rating:4.9, learners:3200, duration:'10 weeks', level:'High School',  price:79,  discount:0,  image:'' }
  ];

  const res = await publicFetch('/public/courses/popular?limit=8');
  const items = (res.ok && Array.isArray(res.data) && res.data.length) ? res.data : FALLBACK;

  grid.innerHTML = items.map(c => {
    const finalPrice = c.discount ? Math.round(c.price * (1 - c.discount / 100)) : c.price;
    return `
      <article class="course-card">
        <div class="course-cover">
          ${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" />`
                    : `<div class="course-cover-fallback"><i class="fas fa-book-open"></i></div>`}
          ${c.discount ? `<span class="course-discount">-${c.discount}%</span>` : ''}
        </div>
        <div class="course-body">
          <span class="course-category">${esc(c.category)}</span>
          <h3 class="course-title">${esc(c.title)}</h3>
          <div class="course-expert">by ${esc(c.expert)}</div>
          <div class="course-meta">
            <span><i class="fas fa-star"></i> ${esc(String(c.rating))}</span>
            <span><i class="fas fa-users"></i> ${fmtNum(c.learners)}</span>
            <span><i class="fas fa-clock"></i> ${esc(c.duration)}</span>
            <span class="course-level">${esc(c.level)}</span>
          </div>
          <div class="course-footer">
            <div class="course-price">
              ${c.discount ? `<span class="price-old">${fmtMoney(c.price)}</span>` : ''}
              <span class="price-now">${fmtMoney(finalPrice)}</span>
            </div>
            <div class="course-actions">
              <button class="btn btn-ghost btn-sm" data-nav="/courses/${esc(c.id)}">View</button>
              <button class="btn btn-primary btn-sm" data-enroll="${esc(c.id)}">Enroll</button>
            </div>
          </div>
        </div>
      </article>`;
  }).join('');

  grid.addEventListener('click', (e) => {
    const enroll = e.target.closest('[data-enroll]');
    if (enroll) {
      const id = enroll.getAttribute('data-enroll');
      trackLanding('course_enroll_click', { id });
      location.hash = '#/courses/' + encodeURIComponent(id) + '/enroll';
    }
  });
}

async function loadFeaturedExperts() {
  const grid = document.getElementById('expertsGrid');
  if (!grid) return;

  const FALLBACK = [
    { id:'e1', name:'Dr. Sarah K.', expertise:'Data Science & AI',          rating:4.9, consultations:320, price:60, available:true,  verified:true, avatar:'' },
    { id:'e2', name:'Amina W.',     expertise:'Full-Stack Web Development', rating:4.8, consultations:245, price:45, available:true,  verified:true, avatar:'' },
    { id:'e3', name:'Brian O.',     expertise:'Digital Marketing',          rating:4.7, consultations:180, price:35, available:false, verified:true, avatar:'' },
    { id:'e4', name:'Mr. Mwangi',   expertise:'KCSE Mathematics',           rating:4.9, consultations:410, price:25, available:true,  verified:true, avatar:'' }
  ];

  const res = await publicFetch('/public/experts/featured?limit=8');
  const items = (res.ok && Array.isArray(res.data) && res.data.length) ? res.data : FALLBACK;

  grid.innerHTML = items.map(x => {
    const avatar = x.avatar
      ? `<img src="${esc(x.avatar)}" alt="${esc(x.name)}" loading="lazy" />`
      : `<span class="expert-initials">${esc(initials(x.name))}</span>`;
    return `
      <article class="expert-card">
        <div class="expert-avatar">
          ${avatar}
          ${x.verified ? `<span class="verified-badge" title="Verified"><i class="fas fa-circle-check"></i></span>` : ''}
        </div>
        <h3 class="expert-name">${esc(x.name)}</h3>
        <div class="expert-expertise">${esc(x.expertise)}</div>
        <div class="expert-meta">
          <span><i class="fas fa-star"></i> ${esc(String(x.rating))}</span>
          <span><i class="fas fa-comments"></i> ${fmtNum(x.consultations)}</span>
        </div>
        <div class="expert-status ${x.available ? 'online' : 'offline'}">
          <span class="dot"></span> ${x.available ? 'Available now' : 'Away'}
        </div>
        <div class="expert-price">${fmtMoney(x.price)}<span>/ session</span></div>
        <div class="expert-actions">
          <button class="btn btn-ghost btn-sm" data-nav="/experts/${esc(x.id)}">View profile</button>
          <button class="btn btn-primary btn-sm" data-book="${esc(x.id)}">Book</button>
        </div>
      </article>`;
  }).join('');

  grid.addEventListener('click', (e) => {
    const book = e.target.closest('[data-book]');
    if (book) {
      const id = book.getAttribute('data-book');
      trackLanding('expert_book_click', { id });
      location.hash = '#/consultations/book/' + encodeURIComponent(id);
    }
  });
}

async function loadTestimonials() {
  const track = document.getElementById('testimonialTrack');
  if (!track) return;

  const PREVIEW = [
    { quote:'ExpertHub will let me switch careers with a structured bootcamp.',              name:'Learner preview',     role:'Future learner',     avatar:'', verified:false },
    { quote:'As an expert, I look forward to a platform that handles payments automatically.', name:'Expert preview',      role:'Future expert',      avatar:'', verified:false },
    { quote:'We plan to run cohorts and track trainee progress through ExpertHub.',          name:'Institution preview', role:'Future institution', avatar:'', verified:false }
  ];

  const res = await publicFetch('/public/testimonials?limit=6');
  const items = (res.ok && Array.isArray(res.data) && res.data.length) ? res.data : PREVIEW;

  track.innerHTML = items.map(t => {
    const avatar = t.avatar
      ? `<img src="${esc(t.avatar)}" alt="${esc(t.name)}" loading="lazy" />`
      : `<span class="testimonial-initials">${esc(initials(t.name))}</span>`;
    return `
      <figure class="testimonial slide">
        <blockquote class="testimonial-text">“${esc(t.quote)}”</blockquote>
        <figcaption class="testimonial-author">
          <span class="testimonial-avatar">${avatar}</span>
          <span>
            <span class="testimonial-name">
              ${esc(t.name)}
              ${t.verified ? `<i class="fas fa-circle-check verified-inline" title="Verified"></i>` : ''}
            </span>
            <span class="testimonial-role">${esc(t.role)}</span>
          </span>
        </figcaption>
      </figure>`;
  }).join('');

  /* Rebuild dot indicators to match actual count */
  const dotsWrap = document.querySelector('.testimonial-dots');
  if (dotsWrap) {
    dotsWrap.innerHTML = items.map((_, i) => `
      <button class="dot" data-testimonial-dot="${i}" role="tab"
              aria-selected="${i === 0 ? 'true' : 'false'}"
              aria-label="Slide ${i + 1}"></button>`).join('');
  }

  initTestimonialCarousel();
}

async function loadPaymentMethods() {
  const row = document.getElementById('paymentRow');
  if (!row) return;

  const res = await publicFetch('/public/payment-methods', { timeout: 5000 });
  const methods = (res.ok && Array.isArray(res.data)) ? res.data : [];

  if (!methods.length) {
    row.innerHTML = `<span class="payment-note">Payment methods are being configured. Please check back soon.</span>`;
    return;
  }

  const iconMap = {
    mpesa:  ['M-Pesa',  'fa-mobile-screen'],
    card:   ['Card',    'fa-credit-card'],
    paypal: ['PayPal',  'fa-paypal'],
    stripe: ['Stripe',  'fa-stripe-s']
  };

  row.innerHTML = methods.map(m => {
    const key = String(m).toLowerCase();
    const [label, icon] = iconMap[key] || [m, 'fa-money-bill'];
    return `<span class="payment-pill"><i class="fas ${icon}"></i> ${esc(label)}</span>`;
  }).join('');
}

async function loadSpotlight() {
  const root = document.getElementById('spotlight');
  if (!root) return;

  const FALLBACK = {
    title: 'Full-Stack Web Development Bootcamp',
    tagline: 'From zero to job-ready in 12 weeks. Live cohorts, mentorship and a portfolio capstone.',
    expert: 'Amina W.',
    rating: 4.9,
    seatsLeft: 12,
    nextCohort: 'Starts in 2 weeks',
    price: 299,
    discount: 20,
    cta: { label: 'Reserve a seat', href: '/courses/c1' }
  };

  const res = await publicFetch('/public/spotlight');
  const s = (res.ok && res.data) ? Object.assign({}, FALLBACK, res.data) : FALLBACK;

  const finalPrice = s.discount ? Math.round(s.price * (1 - s.discount / 100)) : s.price;

  root.innerHTML = `
    <div class="spotlight-card">
      <div class="spotlight-copy">
        <span class="spotlight-badge"><i class="fas fa-bolt" aria-hidden="true"></i> Featured bootcamp</span>
        <h2 class="spotlight-title">${esc(s.title)}</h2>
        <p class="spotlight-tag">${esc(s.tagline)}</p>
        <div class="spotlight-meta">
          <span><i class="fas fa-user-tie" aria-hidden="true"></i> ${esc(s.expert)}</span>
          <span><i class="fas fa-star" aria-hidden="true"></i> ${esc(String(s.rating))}</span>
          <span><i class="fas fa-calendar" aria-hidden="true"></i> ${esc(s.nextCohort)}</span>
          <span class="spotlight-seats"><i class="fas fa-chair" aria-hidden="true"></i> ${esc(String(s.seatsLeft))} seats left</span>
        </div>
        <div class="spotlight-price">
          ${s.discount ? `<span class="price-old">${fmtMoney(s.price)}</span>` : ''}
          <span class="price-now">${fmtMoney(finalPrice)}</span>
          ${s.discount ? `<span class="spotlight-save">Save ${s.discount}%</span>` : ''}
        </div>
        <div class="spotlight-actions">
          <button class="btn btn-primary" data-nav="${esc(s.cta.href)}">
            <i class="fas fa-ticket" aria-hidden="true"></i> ${esc(s.cta.label)}
          </button>
          <button class="btn btn-outline" data-nav="/courses">
            Browse all bootcamps
          </button>
        </div>
      </div>
      <div class="spotlight-visual" aria-hidden="true">
        <div class="spotlight-blob b1"></div>
        <div class="spotlight-blob b2"></div>
        <div class="spotlight-blob b3"></div>
        <i class="fas fa-laptop-code spotlight-icon"></i>
      </div>
    </div>`;
}

async function loadEvents() {
  const grid = document.getElementById('eventsGrid');
  if (!grid) return;

  const FALLBACK = [
    { id:'ev1', title:'Intro to Data Science',        type:'Webinar',      date:'2026-10-14', time:'18:00 EAT', host:'Dr. Sarah K.',   free:true  },
    { id:'ev2', title:'Career Switch to Tech',        type:'Workshop',     date:'2026-10-18', time:'10:00 EAT', host:'Amina W.',       free:true  },
    { id:'ev3', title:'Corporate Training Showcase',  type:'Info session', date:'2026-10-22', time:'15:00 EAT', host:'ExpertHub Team', free:true  },
    { id:'ev4', title:'KCSE Maths Revision Marathon', type:'Live class',   date:'2026-10-25', time:'09:00 EAT', host:'Mr. Mwangi',     free:false }
  ];

  const res = await publicFetch('/public/events/upcoming?limit=4');
  const items = (res.ok && Array.isArray(res.data) && res.data.length) ? res.data : FALLBACK;

  grid.innerHTML = items.map(e => {
    const d = new Date(e.date);
    const valid = !isNaN(d);
    const day   = valid ? String(d.getDate()).padStart(2, '0') : '—';
    const month = valid ? d.toLocaleString('en-US', { month: 'short' }) : '—';
    return `
      <article class="event-card">
        <div class="event-date" aria-hidden="true">
          <span class="event-day">${esc(day)}</span>
          <span class="event-month">${esc(month)}</span>
        </div>
        <div class="event-body">
          <span class="event-type">${esc(e.type)}</span>
          <h3 class="event-title">${esc(e.title)}</h3>
          <div class="event-meta">
            <span><i class="fas fa-clock" aria-hidden="true"></i> ${esc(e.time)}</span>
            <span><i class="fas fa-user-tie" aria-hidden="true"></i> ${esc(e.host)}</span>
            <span class="event-price">${e.free ? 'Free' : 'Paid'}</span>
          </div>
          <div class="event-actions">
            <button class="btn btn-primary btn-sm" data-nav="/events/${esc(e.id)}">
              <i class="fas fa-calendar-plus" aria-hidden="true"></i> Register
            </button>
          </div>
        </div>
      </article>`;
  }).join('');
}

async function loadResources() {
  const grid = document.getElementById('resourcesGrid');
  if (!grid) return;

  const FALLBACK = [
    { id:'b1', title:'How to choose the right bootcamp',      category:'Guides',   readTime:6, excerpt:'A practical checklist to compare bootcamps before you commit.' },
    { id:'b2', title:'Landing your first tech role in Kenya', category:'Careers',  readTime:8, excerpt:'What hiring managers look for — and how to stand out.' },
    { id:'b3', title:'Corporate training that actually sticks', category:'Business', readTime:7, excerpt:'Design cohorts that drive measurable skill transfer.' }
  ];

  const res = await publicFetch('/public/resources/latest?limit=3');
  const items = (res.ok && Array.isArray(res.data) && res.data.length) ? res.data : FALLBACK;

  grid.innerHTML = items.map(b => `
    <article class="resource-card">
      <div class="resource-cover" aria-hidden="true">
        <i class="fas fa-newspaper"></i>
      </div>
      <div class="resource-body">
        <span class="resource-category">${esc(b.category)}</span>
        <h3 class="resource-title">${esc(b.title)}</h3>
        <p class="resource-excerpt">${esc(b.excerpt)}</p>
        <div class="resource-footer">
          <span class="resource-read"><i class="fas fa-clock" aria-hidden="true"></i> ${esc(String(b.readTime))} min read</span>
          <button class="btn btn-ghost btn-sm" data-nav="/resources/${esc(b.id)}">
            Read <i class="fas fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </article>`).join('');
}

/* ============================================================
   SEO + JSON-LD
   ============================================================ */
function injectLandingSEO() {
  const origin = location.origin;

  function setMeta(attr, name, content) {
    let el = document.head.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setJSONLD(id, data) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }

  setMeta('name', 'description',
    'ExpertHub combines an E-School, bootcamps, short courses, tuition, exam prep, 1-on-1 consultations and corporate training in one platform.');
  setMeta('property', 'og:title',       'ExpertHub — Learn, Consult and Grow with Real Experts');
  setMeta('property', 'og:description', 'Learn. Connect. Get Expert Help. Build Your Future.');
  setMeta('property', 'og:type',        'website');
  setMeta('property', 'og:url',         origin + '/');
  setMeta('property', 'og:image',       origin + '/assets/og-landing.png');
  setMeta('property', 'og:site_name',   'ExpertHub');
  setMeta('name', 'twitter:card',       'summary_large_image');
  setMeta('name', 'twitter:title',      'ExpertHub — Learn, Consult and Grow with Real Experts');
  setMeta('name', 'twitter:image',      origin + '/assets/og-landing.png');

  setJSONLD('ld-org', {
    '@context':'https://schema.org', '@type':'Organization',
    name:'ExpertHub', url: origin, logo: origin + '/assets/logo.png',
    sameAs: ['https://facebook.com/','https://linkedin.com/','https://instagram.com/','https://x.com/','https://youtube.com/']
  });

  setJSONLD('ld-edu', {
    '@context':'https://schema.org', '@type':'EducationalOrganization',
    name:'ExpertHub', url: origin,
    description:'E-School, consultation and corporate training platform.'
  });

  setJSONLD('ld-website', {
    '@context':'https://schema.org', '@type':'WebSite',
    name:'ExpertHub', url: origin,
    potentialAction: {
      '@type':'SearchAction',
      target: origin + '/courses?q={search_term_string}',
      'query-input':'required name=search_term_string'
    }
  });

  setJSONLD('ld-faq', {
    '@context':'https://schema.org', '@type':'FAQPage',
    mainEntity: [
      ['How does registration work?',          'Learners are approved instantly. Experts and institutions require admin approval.'],
      ['What is the platform commission?',     'We charge a flat 20% commission on all course sales and consultations.'],
      ['How long do payouts take?',            'Withdrawals have a 7-day holding period, then process within 3 to 5 business days.'],
      ['Can I switch from learner to expert?', 'Yes. Apply to become an expert from your dashboard. Our team reviews each application.'],
      ['Do you support corporate training?',   'Yes. Institutions get programmes, cohorts, assessments, projects, certifications and compliance tracking.']
    ].map(([q, a]) => ({ '@type':'Question', name:q, acceptedAnswer:{ '@type':'Answer', text:a } }))
  });

  setJSONLD('ld-course', {
    '@context': 'https://schema.org',
    '@type':    'Course',
    name:       'Full-Stack Web Development Bootcamp',
    description:'From zero to job-ready in 12 weeks with live cohorts, mentorship and a portfolio capstone.',
    provider:   { '@type': 'Organization', name: 'ExpertHub', sameAs: origin },
    educationalLevel: 'Beginner',
    inLanguage: 'en',
    offers: {
      '@type': 'Offer',
      category: 'Paid',
      priceCurrency: 'USD',
      price: '299',
      availability: 'https://schema.org/InStock',
      url: origin + '/courses/c1'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '1240'
    }
  });

  setJSONLD('ld-breadcrumb', {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',     item: origin + '/' },
      { '@type': 'ListItem', position: 2, name: 'Courses',  item: origin + '/courses' },
      { '@type': 'ListItem', position: 3, name: 'Experts',  item: origin + '/experts' }
    ]
  });
}

/* ============================================================
   EXPORT
   ============================================================ */
window.renderLanding = renderLanding;
