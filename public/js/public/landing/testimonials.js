/* ============================================================
   ExpertHub — js/public/landing/testimonials.js
   Fetches from /testimonials, falls back to bundled demo data.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.landing = P.landing || {};
  var F = P.format, esc = F.esc;
  var cache = null;

  var DEMO = [
    { quote: 'ExpertHub helped me switch careers in 6 months. The bootcamp was intense but amazing.', name: 'Jane D.', role: 'Software Engineer', rating: 5 },
    { quote: 'As an expert, I doubled my income in 3 months. The platform handles payments automatically.', name: 'Dr. Sarah K.', role: 'Data Science Expert', rating: 5 },
    { quote: 'We run 12 cohorts a year through ExpertHub. Trainee tracking and assessments just work.', name: 'Acme Academy', role: 'Corporate Training', rating: 5 }
  ];

  function normalize(raw) {
    raw = raw || {};
    var who = raw.user || raw.author || raw.person || {};
    return {
      quote: F.pick(raw, 'quote', 'text', 'content', 'message', 'body') || '',
      name: F.pick(raw, 'name', 'authorName') || F.pick(who, 'name', 'fullName') || 'ExpertHub member',
      role: F.pick(raw, 'role', 'position', 'title', 'occupation') || F.pick(who, 'role') || 'Member',
      avatar: F.pick(raw, 'avatar', 'avatarUrl', 'photo') || F.pick(who, 'avatar') || '',
      rating: F.num(F.pick(raw, 'rating', 'stars'), 5)
    };
  }

  function card(t) {
    return '<div class="testimonial">' +
      '<div class="pub-stars" style="margin-bottom:8px">' + F.stars(t.rating) + '</div>' +
      '<p class="testimonial-text">"' + esc(t.quote) + '"</p>' +
      '<div class="testimonial-author">' +
        '<img class="testimonial-avatar" src="' + esc(F.safeImage(t.avatar, t.name)) + '" alt="">' +
        '<div><div class="testimonial-name">' + esc(t.name) + '</div>' +
        '<div class="testimonial-role">' + esc(t.role) + '</div></div>' +
      '</div>' +
    '</div>';
  }

  P.landing.testimonials = function () {
    return '' +
      '<section class="section alt">' +
        '<h2 class="section-title">Loved by learners, experts and institutions</h2>' +
        '<p class="section-sub">Real stories from our community.</p>' +
        '<div class="testimonials-grid" id="pubTestimonials">' +
          F.skeletons(3, 170) +
        '</div>' +
      '</section>';
  };

  P.landing.hydrateTestimonials = async function () {
    var el = document.getElementById('pubTestimonials');
    if (!el) return;

    if (cache) { render(cache); return; }

    try {
      var raw = await P.api.fetch('/testimonials');
      var list = F.listOf(raw, ['testimonials']).map(normalize);
      cache = list.length ? list : DEMO.slice();
    } catch (_) {
      cache = DEMO.slice();
    }
    if (document.body.contains(el)) render(cache);
  };

  function render(list) {
    var el = document.getElementById('pubTestimonials');
    if (!el) return;
    el.innerHTML = list.slice(0, 6).map(card).join('');
  }
})();
