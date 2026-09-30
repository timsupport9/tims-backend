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

/* ============================================================
   ExpertHub 2.0 — 07 Feature Expansion
   Landing & Discovery Enhancements
   This extension is intentionally isolated from the original
   implementation. It adds reusable browser-side capabilities,
   diagnostics, registries, persistence, validation and telemetry.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHFeature07;
  if (NS) return;

  const namespace = {
    name: "Landing & Discovery Enhancements",
    version: '2.0.0',
    createdAt: new Date().toISOString(),
    features: ["hero rotation", "service search", "category filtering", "testimonial rotation", "FAQ search", "lead capture draft", "UTM tracking", "campaign attribution", "personalized CTA", "scroll analytics", "section lazy loading", "accessibility controls", "pricing calculator", "service comparison", "featured experts", "event highlights", "course highlights", "newsletter preferences", "contact validation", "landing diagnostics"],
    registry: new Map(),
    listeners: new Map(),
    metrics: {
      calls: 0,
      successes: 0,
      failures: 0,
      startedAt: Date.now(),
      lastActionAt: null
    },
    config: {
      storagePrefix: 'experthub.feature.07.',
      maxHistory: 80,
      debounceMs: 250,
      staleAfterMs: 5 * 60 * 1000,
      debug: false
    }
  };

  function now() { return Date.now(); }

  function key(name) {
    return namespace.config.storagePrefix + String(name);
  }

  function safeClone(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }

  function safeParse(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    try { return JSON.parse(value); }
    catch (_) { return fallback; }
  }

  function emit(eventName, payload) {
    const handlers = namespace.listeners.get(eventName) || [];
    handlers.slice().forEach(fn => {
      try { fn(payload); } catch (error) { console.error('[ExpertHub]', eventName, error); }
    });
    try {
      document.dispatchEvent(new CustomEvent('eh:07:' + eventName, { detail: payload }));
    } catch (_) {}
  }

  function on(eventName, handler) {
    if (typeof handler !== 'function') return () => {};
    if (!namespace.listeners.has(eventName)) namespace.listeners.set(eventName, []);
    namespace.listeners.get(eventName).push(handler);
    return () => off(eventName, handler);
  }

  function off(eventName, handler) {
    const list = namespace.listeners.get(eventName) || [];
    namespace.listeners.set(eventName, list.filter(fn => fn !== handler));
  }

  function save(name, value, ttl = null) {
    const packet = { value: safeClone(value), savedAt: now(), expiresAt: ttl ? now() + ttl : null };
    try { localStorage.setItem(key(name), JSON.stringify(packet)); emit('saved', { name, packet }); return true; }
    catch (error) { console.warn('[ExpertHub] storage save failed', error); return false; }
  }

  function load(name, fallback = null) {
    try {
      const packet = safeParse(localStorage.getItem(key(name)), null);
      if (!packet) return fallback;
      if (packet.expiresAt && packet.expiresAt < now()) {
        localStorage.removeItem(key(name));
        return fallback;
      }
      return packet.value;
    } catch (_) { return fallback; }
  }

  function remove(name) {
    try { localStorage.removeItem(key(name)); emit('removed', { name }); return true; }
    catch (_) { return false; }
  }

  function register(name, definition = {}) {
    if (!name) throw new Error('Feature name is required');
    const item = {
      name,
      enabled: definition.enabled !== false,
      category: definition.category || 'general',
      description: definition.description || '',
      permissions: Array.isArray(definition.permissions) ? definition.permissions : [],
      handler: typeof definition.handler === 'function' ? definition.handler : null,
      validate: typeof definition.validate === 'function' ? definition.validate : null,
      metadata: definition.metadata || {},
      createdAt: new Date().toISOString()
    };
    namespace.registry.set(name, item);
    emit('registered', item);
    return item;
  }

  function unregister(name) {
    const existed = namespace.registry.delete(name);
    if (existed) emit('unregistered', { name });
    return existed;
  }

  function list(filter = {}) {
    let rows = Array.from(namespace.registry.values());
    if (filter.category) rows = rows.filter(x => x.category === filter.category);
    if (filter.enabled !== undefined) rows = rows.filter(x => x.enabled === filter.enabled);
    if (filter.query) {
      const q = String(filter.query).toLowerCase();
      rows = rows.filter(x => (x.name + ' ' + x.description).toLowerCase().includes(q));
    }
    return rows;
  }

  function hasPermission(item) {
    if (!item.permissions.length) return true;
    const role = window.currentUserRole || window.currentUser?.role || '';
    const permissions = window.currentUser?.permissions || [];
    return item.permissions.includes(role) || item.permissions.some(p => permissions.includes(p));
  }

  async function execute(name, payload = {}, context = {}) {
    const item = namespace.registry.get(name);
    if (!item) throw new Error('Unknown feature: ' + name);
    if (!item.enabled) throw new Error('Feature disabled: ' + name);
    if (!hasPermission(item)) throw new Error('Permission denied: ' + name);
    if (item.validate) {
      const result = await item.validate(payload, context);
      if (result === false) throw new Error('Validation failed: ' + name);
      if (typeof result === 'string') throw new Error(result);
    }
    namespace.metrics.calls++;
    namespace.metrics.lastActionAt = new Date().toISOString();
    try {
      const result = item.handler ? await item.handler(payload, context) : payload;
      namespace.metrics.successes++;
      emit('executed', { name, payload, result });
      return result;
    } catch (error) {
      namespace.metrics.failures++;
      emit('failed', { name, payload, error });
      throw error;
    }
  }

  function memoize(fn, ttl = 30000) {
    let timestamp = 0;
    let cached;
    let cachedArgs = '';
    return function (...args) {
      const signature = JSON.stringify(args);
      if (signature === cachedArgs && now() - timestamp < ttl) return cached;
      cachedArgs = signature;
      timestamp = now();
      cached = fn.apply(this, args);
      return cached;
    };
  }

  function debounce(fn, wait = namespace.config.debounceMs) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function throttle(fn, wait = namespace.config.debounceMs) {
    let ready = true;
    let queued = null;
    return function (...args) {
      if (!ready) { queued = args; return; }
      ready = false;
      fn.apply(this, args);
      setTimeout(() => {
        ready = true;
        if (queued) { const next = queued; queued = null; fn.apply(this, next); }
      }, wait);
    };
  }

  function validateObject(value, rules = {}) {
    const errors = {};
    Object.entries(rules).forEach(([field, rule]) => {
      const v = value?.[field];
      if (rule.required && (v === undefined || v === null || String(v).trim() === '')) errors[field] = 'Required';
      if (v !== undefined && v !== null && rule.minLength && String(v).length < rule.minLength) errors[field] = 'Too short';
      if (v !== undefined && v !== null && rule.maxLength && String(v).length > rule.maxLength) errors[field] = 'Too long';
      if (v && rule.pattern && !rule.pattern.test(String(v))) errors[field] = 'Invalid format';
      if (v !== undefined && v !== null && rule.type === 'number' && Number.isNaN(Number(v))) errors[field] = 'Must be a number';
    });
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function metricSnapshot() {
    return {
      ...namespace.metrics,
      uptimeMs: now() - namespace.metrics.startedAt,
      registeredFeatures: namespace.registry.size,
      featureCount: namespace.features.length
    };
  }

  function exportDiagnostics() {
    return {
      namespace: namespace.name,
      version: namespace.version,
      features: namespace.features.slice(),
      registered: list().map(x => ({ name: x.name, category: x.category, enabled: x.enabled })),
      metrics: metricSnapshot(),
      url: location.href,
      online: navigator.onLine,
      language: navigator.language,
      timestamp: new Date().toISOString()
    };
  }

  function downloadDiagnostics() {
    const blob = new Blob([JSON.stringify(exportDiagnostics(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'experthub-07-diagnostics.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  namespace.on = on;
  namespace.off = off;
  namespace.emit = emit;
  namespace.save = save;
  namespace.load = load;
  namespace.remove = remove;
  namespace.register = register;
  namespace.unregister = unregister;
  namespace.list = list;
  namespace.execute = execute;
  namespace.memoize = memoize;
  namespace.debounce = debounce;
  namespace.throttle = throttle;
  namespace.validateObject = validateObject;
  namespace.metrics = metricSnapshot;
  namespace.diagnostics = exportDiagnostics;
  namespace.downloadDiagnostics = downloadDiagnostics;

  window.EHFeature07 = namespace;

  function feature_01(payload = {}, context = {}) {
    const result = {
      feature: "hero rotation",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:01', result);
    return result;
  }

  register("hero rotation", {
    category: "hero",
    description: "Enhanced hero rotation capability for landing & discovery enhancements",
    handler: feature_01
  });

  function feature_02(payload = {}, context = {}) {
    const result = {
      feature: "service search",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:02', result);
    return result;
  }

  register("service search", {
    category: "service",
    description: "Enhanced service search capability for landing & discovery enhancements",
    handler: feature_02
  });

  function feature_03(payload = {}, context = {}) {
    const result = {
      feature: "category filtering",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:03', result);
    return result;
  }

  register("category filtering", {
    category: "category",
    description: "Enhanced category filtering capability for landing & discovery enhancements",
    handler: feature_03
  });

  function feature_04(payload = {}, context = {}) {
    const result = {
      feature: "testimonial rotation",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:04', result);
    return result;
  }

  register("testimonial rotation", {
    category: "testimonial",
    description: "Enhanced testimonial rotation capability for landing & discovery enhancements",
    handler: feature_04
  });

  function feature_05(payload = {}, context = {}) {
    const result = {
      feature: "FAQ search",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:05', result);
    return result;
  }

  register("FAQ search", {
    category: "faq",
    description: "Enhanced FAQ search capability for landing & discovery enhancements",
    handler: feature_05
  });

  function feature_06(payload = {}, context = {}) {
    const result = {
      feature: "lead capture draft",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:06', result);
    return result;
  }

  register("lead capture draft", {
    category: "lead",
    description: "Enhanced lead capture draft capability for landing & discovery enhancements",
    handler: feature_06
  });

  function feature_07(payload = {}, context = {}) {
    const result = {
      feature: "UTM tracking",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:07', result);
    return result;
  }

  register("UTM tracking", {
    category: "utm",
    description: "Enhanced UTM tracking capability for landing & discovery enhancements",
    handler: feature_07
  });

  function feature_08(payload = {}, context = {}) {
    const result = {
      feature: "campaign attribution",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:08', result);
    return result;
  }

  register("campaign attribution", {
    category: "campaign",
    description: "Enhanced campaign attribution capability for landing & discovery enhancements",
    handler: feature_08
  });

  function feature_09(payload = {}, context = {}) {
    const result = {
      feature: "personalized CTA",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:09', result);
    return result;
  }

  register("personalized CTA", {
    category: "personalized",
    description: "Enhanced personalized CTA capability for landing & discovery enhancements",
    handler: feature_09
  });

  function feature_10(payload = {}, context = {}) {
    const result = {
      feature: "scroll analytics",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:10', result);
    return result;
  }

  register("scroll analytics", {
    category: "scroll",
    description: "Enhanced scroll analytics capability for landing & discovery enhancements",
    handler: feature_10
  });

  function feature_11(payload = {}, context = {}) {
    const result = {
      feature: "section lazy loading",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:11', result);
    return result;
  }

  register("section lazy loading", {
    category: "section",
    description: "Enhanced section lazy loading capability for landing & discovery enhancements",
    handler: feature_11
  });

  function feature_12(payload = {}, context = {}) {
    const result = {
      feature: "accessibility controls",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:12', result);
    return result;
  }

  register("accessibility controls", {
    category: "accessibility",
    description: "Enhanced accessibility controls capability for landing & discovery enhancements",
    handler: feature_12
  });

  function feature_13(payload = {}, context = {}) {
    const result = {
      feature: "pricing calculator",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:13', result);
    return result;
  }

  register("pricing calculator", {
    category: "pricing",
    description: "Enhanced pricing calculator capability for landing & discovery enhancements",
    handler: feature_13
  });

  function feature_14(payload = {}, context = {}) {
    const result = {
      feature: "service comparison",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:14', result);
    return result;
  }

  register("service comparison", {
    category: "service",
    description: "Enhanced service comparison capability for landing & discovery enhancements",
    handler: feature_14
  });

  function feature_15(payload = {}, context = {}) {
    const result = {
      feature: "featured experts",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:15', result);
    return result;
  }

  register("featured experts", {
    category: "featured",
    description: "Enhanced featured experts capability for landing & discovery enhancements",
    handler: feature_15
  });

  function feature_16(payload = {}, context = {}) {
    const result = {
      feature: "event highlights",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:16', result);
    return result;
  }

  register("event highlights", {
    category: "event",
    description: "Enhanced event highlights capability for landing & discovery enhancements",
    handler: feature_16
  });

  function feature_17(payload = {}, context = {}) {
    const result = {
      feature: "course highlights",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:17', result);
    return result;
  }

  register("course highlights", {
    category: "course",
    description: "Enhanced course highlights capability for landing & discovery enhancements",
    handler: feature_17
  });

  function feature_18(payload = {}, context = {}) {
    const result = {
      feature: "newsletter preferences",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:18', result);
    return result;
  }

  register("newsletter preferences", {
    category: "newsletter",
    description: "Enhanced newsletter preferences capability for landing & discovery enhancements",
    handler: feature_18
  });

  function feature_19(payload = {}, context = {}) {
    const result = {
      feature: "contact validation",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:19', result);
    return result;
  }

  register("contact validation", {
    category: "contact",
    description: "Enhanced contact validation capability for landing & discovery enhancements",
    handler: feature_19
  });

  function feature_20(payload = {}, context = {}) {
    const result = {
      feature: "landing diagnostics",
      accepted: true,
      timestamp: new Date().toISOString(),
      payload: safeClone(payload),
      context: safeClone(context),
      source: "07"
    };
    emit('feature:20', result);
    return result;
  }

  register("landing diagnostics", {
    category: "landing",
    description: "Enhanced landing diagnostics capability for landing & discovery enhancements",
    handler: feature_20
  });

  /* ---------- Built-in browser integrations ---------- */

  namespace.search = function (query, source = list()) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return source.slice();
    return source.filter(item =>
      JSON.stringify(item).toLowerCase().includes(q)
    );
  };

  namespace.groupBy = function (items, selector) {
    return items.reduce((groups, item) => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      const key = value === undefined || value === null ? 'unknown' : String(value);
      (groups[key] ||= []).push(item);
      return groups;
    }, {});
  };

  namespace.sum = function (items, selector) {
    return items.reduce((total, item) => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      return total + (Number(value) || 0);
    }, 0);
  };

  namespace.average = function (items, selector) {
    return items.length ? namespace.sum(items, selector) / items.length : 0;
  };

  namespace.paginate = function (items, page = 1, pageSize = 20) {
    const size = Math.max(1, Number(pageSize) || 20);
    const current = Math.max(1, Number(page) || 1);
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / size));
    const safePage = Math.min(current, pages);
    return {
      items: items.slice((safePage - 1) * size, safePage * size),
      page: safePage,
      pageSize: size,
      total,
      pages,
      hasNext: safePage < pages,
      hasPrevious: safePage > 1
    };
  };

  namespace.sortBy = function (items, selector, direction = 'asc') {
    const list = items.slice();
    list.sort((a, b) => {
      const av = typeof selector === 'function' ? selector(a) : a?.[selector];
      const bv = typeof selector === 'function' ? selector(b) : b?.[selector];
      const left = av ?? '';
      const right = bv ?? '';
      const result = left > right ? 1 : left < right ? -1 : 0;
      return direction === 'desc' ? -result : result;
    });
    return list;
  };

  namespace.unique = function (items, selector = item => item) {
    const seen = new Set();
    return items.filter(item => {
      const value = typeof selector === 'function' ? selector(item) : item?.[selector];
      const keyValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (seen.has(keyValue)) return false;
      seen.add(keyValue);
      return true;
    });
  };

  namespace.whenIdle = function (callback, timeout = 1000) {
    if ('requestIdleCallback' in window) return window.requestIdleCallback(callback, { timeout });
    return setTimeout(callback, Math.min(timeout, 100));
  };

  namespace.copy = async function (value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  };

  namespace.broadcast = function (name, payload) {
    try {
      const channel = new BroadcastChannel('experthub-' + name);
      channel.postMessage(payload);
      channel.close();
      return true;
    } catch (_) {
      return false;
    }
  };

  namespace.listenBroadcast = function (name, handler) {
    try {
      const channel = new BroadcastChannel('experthub-' + name);
      channel.onmessage = event => handler(event.data);
      return () => channel.close();
    } catch (_) {
      return () => {};
    }
  };

  /* ---------- Automatic lifecycle hooks ---------- */

  document.addEventListener('visibilitychange', () => {
    emit('visibility', { hidden: document.hidden, timestamp: Date.now() });
  });

  window.addEventListener('online', () => emit('network', { online: true }));
  window.addEventListener('offline', () => emit('network', { online: false }));

  namespace.healthCheck = function () {
    return {
      ok: true,
      storage: (() => {
        try {
          const k = key('health');
          localStorage.setItem(k, 'ok');
          localStorage.removeItem(k);
          return true;
        } catch (_) { return false; }
      })(),
      dom: !!document.body,
      network: navigator.onLine,
      registeredFeatures: namespace.registry.size
    };
  };

  /* Keep the feature registry discoverable without changing the
     application's existing global functions. */
  window.ExpertHubFeatureRegistry = window.ExpertHubFeatureRegistry || {};
  window.ExpertHubFeatureRegistry["07"] = namespace;

})();

/* ============================================================
   End 07 feature expansion
   ============================================================ */
