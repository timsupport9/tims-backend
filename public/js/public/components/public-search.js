/* ============================================================
   ExpertHub — js/public/components/public-search.js
   Unified search bar + dropdown results.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.components = P.components || {};
  var F = P.format, esc = F.esc;
  var abort = null;

  P.components.search = function () {
    return '' +
      '<form class="pub-search" id="pubSearchForm" role="search" autocomplete="off">' +
        '<i class="fas fa-magnifying-glass"></i>' +
        '<input id="pubSearchInput" type="search" ' +
          'placeholder="Search courses, experts, events and resources…" ' +
          'aria-label="Search ExpertHub" aria-expanded="false" aria-controls="pubSearchResults">' +
        '<button class="btn btn-primary" type="submit">Search</button>' +
        '<div class="pub-search-results" id="pubSearchResults" hidden></div>' +
      '</form>';
  };

  P.components.mountSearch = function (root) {
    var form = (root || document).querySelector('#pubSearchForm');
    var input = (root || document).querySelector('#pubSearchInput');
    if (!form || !input) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (q.length >= 2) P.go('#/courses?q=' + encodeURIComponent(q));
    });

    input.addEventListener('input', F.debounce(function () { P.components.searchRun(input.value); }, 260));
    input.addEventListener('focus', function () {
      if (input.value.trim().length >= 2) P.components.searchRun(input.value);
    });
  };

  P.components.searchRun = function (query) {
    var box = document.getElementById('pubSearchResults');
    var input = document.getElementById('pubSearchInput');
    if (!box) return;

    var q = String(query || '').trim();
    if (q.length < 2) { P.components.searchClose(); return; }

    box.hidden = false;
    box.innerHTML = '<div class="pub-search-empty"><i class="fas fa-circle-notch fa-spin"></i> Searching…</div>';
    if (input) input.setAttribute('aria-expanded', 'true');

    if (abort) { try { abort.abort(); } catch (_) {} }
    abort = (typeof AbortController !== 'undefined') ? new AbortController() : null;

    publicSearch(q, { limit: 4 }).then(function (res) {
      var current = (document.getElementById('pubSearchInput') || {}).value || '';
      if (current.trim() !== q) return;
      box.innerHTML = renderResults(res);
    }).catch(function () {
      box.innerHTML = '<div class="pub-search-empty">Search is unavailable right now.</div>';
    });
  };

  P.components.searchClose = function () {
    var box = document.getElementById('pubSearchResults');
    var input = document.getElementById('pubSearchInput');
    if (box) { box.hidden = true; box.innerHTML = ''; }
    if (input) input.setAttribute('aria-expanded', 'false');
  };

  function renderResults(res) {
    if (!res.total) {
      return '<div class="pub-search-empty"><i class="fas fa-magnifying-glass"></i><br>' +
             'No results for "' + esc(res.query) + '"</div>';
    }

    function group(label, items, mapper) {
      if (!items.length) return '';
      return '<div class="pub-search-group">' + esc(label) + '</div>' + items.map(mapper).join('');
    }

    var html = '';
    html += group('Courses', res.courses, function (c) {
      return '<button type="button" class="pub-search-item" data-goto="#/courses/' +
        encodeURIComponent(c.id) + '">' +
        '<img src="' + esc(F.safeImage(c.thumbnail, c.title)) + '" alt="">' +
        '<span><b>' + esc(c.title) + '</b><span>' + esc(c.category) + ' · ' +
        esc(F.money(c.price, c.currency)) + '</span></span></button>';
    });
    html += group('Experts', res.experts, function (e) {
      return '<button type="button" class="pub-search-item" data-goto="#/experts/' +
        encodeURIComponent(e.id) + '">' +
        '<img src="' + esc(F.safeImage(e.avatar, e.name)) + '" alt="">' +
        '<span><b>' + esc(e.name) + '</b><span>' + esc(e.headline || 'Expert') + '</span></span></button>';
    });
    html += group('Events', res.events, function (ev) {
      return '<button type="button" class="pub-search-item" data-goto="#/events/' +
        encodeURIComponent(ev.id) + '">' +
        '<img src="' + esc(F.safeImage(ev.cover, ev.title)) + '" alt="">' +
        '<span><b>' + esc(ev.title) + '</b><span>' + esc(F.date(ev.startsAt)) + '</span></span></button>';
    });
    html += group('Resources', res.resources, function (r) {
      return '<button type="button" class="pub-search-item" data-action="resource-open" ' +
        'data-url="' + esc(r.url || '') + '">' +
        '<img src="' + esc(F.safeImage(r.cover, r.title)) + '" alt="">' +
        '<span><b>' + esc(r.title) + '</b><span>' + esc(r.type) + '</span></span></button>';
    });
    html += '<div class="pub-search-group" style="text-align:center;padding:10px">' +
      '<button type="button" class="pub-link" data-action="search-all" ' +
      'data-query="' + esc(res.query) + '">See all results for "' + esc(res.query) +
      '" <i class="fas fa-arrow-right"></i></button></div>';
    return html;
  }

  /* ---- fan-out search across the four public collections ---- */
  async function publicSearch(q, opts) {
    opts = opts || {};
    var limit = opts.limit || 4;

    /* Prefer single backend endpoint if one exists. */
    try {
      var raw = await publicFetch('/search?q=' + encodeURIComponent(q) + '&limit=' + limit);
      var d = raw && raw.data !== undefined ? raw.data : raw;
      if (d && (d.courses || d.experts || d.events || d.resources)) {
        var g = {
          query: q,
          courses: F.listOf(d.courses, ['courses']),
          experts: F.listOf(d.experts, ['experts']),
          events: F.listOf(d.events, ['events']),
          resources: F.listOf(d.resources, ['resources'])
        };
        g.total = g.courses.length + g.experts.length + g.events.length + g.resources.length;
        return g;
      }
    } catch (_) { /* fall through */ }

    var results = await Promise.all([
      publicFetchList('/courses?q=' + encodeURIComponent(q) + '&limit=' + limit, ['courses']),
      publicFetchList('/experts?q=' + encodeURIComponent(q) + '&limit=' + limit, ['experts']),
      publicFetchList('/events?q=' + encodeURIComponent(q) + '&limit=' + limit, ['events']),
      publicFetchList('/resources?q=' + encodeURIComponent(q) + '&limit=' + limit, ['resources'])
    ]);

    return {
      query: q,
      courses: results[0].slice(0, limit),
      experts: results[1].slice(0, limit),
      events: results[2].slice(0, limit),
      resources: results[3].slice(0, limit),
      total: results.reduce(function (a, r) { return a + r.length; }, 0)
    };
  }

  /* ---- low-level fetch shared by every public page ---- */
  function apiBase() {
    var c = window.CONFIG || {};
    var base = c.API_BASE || c.API_URL || c.API_BASE_URL || c.baseUrl ||
               window.API_BASE || 'https://timbackend-ylc0.onrender.com/api';
    return String(base).replace(/\/+$/, '');
  }

  function authToken() {
    try {
      if (window.S) {
        var t = S.token || S.accessToken || (S.auth && S.auth.token);
        if (t) return t;
      }
    } catch (_) {}
    try { return localStorage.getItem('token') || null; } catch (_) { return null; }
  }

  async function publicFetch(path, opts) {
    opts = opts || {};
    var url = /^https?:\/\//i.test(path)
      ? path
      : apiBase() + (path.charAt(0) === '/' ? path : '/' + path);

    var headers = Object.assign({ Accept: 'application/json' }, opts.headers || {});
    var token = authToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    var init = { method: opts.method || 'GET', headers: headers, credentials: 'include' };
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }

    var res = await fetch(url, init);
    var text = await res.text();
    var data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
    if (!res.ok) {
      var err = new Error((data && (data.message || data.error)) || ('HTTP ' + res.status));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function publicFetchList(path, keys) {
    try {
      var raw = await publicFetch(path);
      return F.listOf(raw, keys);
    } catch (_) { return []; }
  }

  /* Expose low-level helpers for pages. */
  P.api = { fetch: publicFetch, fetchList: publicFetchList, base: apiBase };
})();
