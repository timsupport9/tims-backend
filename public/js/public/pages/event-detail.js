/* ============================================================
   ExpertHub — js/public/pages/event-detail.js
   #/events/:id  —  public event detail page.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.pages = P.pages || {};
  var F = P.format, esc = F.esc;

  function render(params) {
    try { appPhase = 'landing'; } catch (_) {}
    P.ensureStyles();

    var root = document.getElementById('app-root');
    root.innerHTML = '' +
      '<div class="landing">' +
        P.components.navbar('events') +
        '<div class="pub-page" id="pubEventDetail" style="max-width:900px">' +
          F.skeletons(1, 360) + '</div>' +
        P.components.footer() +
      '</div>';

    P.bindGoto(root);
    load(params && params.id);
  }

  async function load(id) {
    var host = document.getElementById('pubEventDetail');
    if (!id || !host) return;

    var ev;
    try {
      var raw = await P.api.fetch('/events/' + encodeURIComponent(id));
      var e = F.oneOf(raw, ['event']);
      ev = e ? P.normalize.event(e) : null;
    } catch (_) { ev = null; }
    if (!ev) {
      for (var i = 0; i < P.demo.events.length; i++) {
        if (String(P.demo.events[i].id) === String(id)) { ev = P.normalize.event(P.demo.events[i]); break; }
      }
    }
    if (!document.body.contains(host)) return;

    if (!ev) {
      host.innerHTML = F.empty('That event could not be found.',
                               'Back to events',
                               'data-goto="#/events"');
      P.bindGoto(host);
      return;
    }

    var authed = !!(window.S && (S.user || S.token));

    host.innerHTML = '' +
      '<button class="pub-link" data-goto="#/events" style="margin-bottom:20px">' +
        '<i class="fas fa-arrow-left"></i> All events</button>' +

      '<span class="pub-tag" style="display:inline-block;margin-bottom:12px">' +
        esc(ev.mode === 'physical' ? 'In person' : 'Online') + '</span>' +
      '<h1 class="section-title" style="margin:0 0 14px">' + esc(ev.title) + '</h1>' +

      '<div class="pub-detail-cover" style="margin-bottom:24px">' +
        '<img src="' + esc(F.safeImage(ev.cover, ev.title)) + '" alt="">' +
      '</div>' +

      '<div class="pub-grid pub-grid-3" style="margin-bottom:28px">' +
        '<div class="pub-row-card"><i class="fas fa-calendar-day" style="font-size:1.3rem;opacity:.5"></i>' +
          '<div><b style="display:block;font-size:.78rem;opacity:.55;text-transform:uppercase">Starts</b>' +
          esc(F.dateTime(ev.startsAt)) + '</div></div>' +
        '<div class="pub-row-card"><i class="fas fa-' +
          (ev.mode === 'physical' ? 'location-dot' : 'video') + '" ' +
          'style="font-size:1.3rem;opacity:.5"></i>' +
          '<div><b style="display:block;font-size:.78rem;opacity:.55;text-transform:uppercase">Where</b>' +
          esc(ev.mode === 'physical' ? (ev.location || 'Venue TBA') : 'Online') + '</div></div>' +
        '<div class="pub-row-card"><i class="fas fa-tag" style="font-size:1.3rem;opacity:.5"></i>' +
          '<div><b style="display:block;font-size:.78rem;opacity:.55;text-transform:uppercase">Price</b>' +
          esc(F.money(ev.price, ev.currency)) + '</div></div>' +
      '</div>' +

      '<p style="line-height:1.8;opacity:.76">' + esc(ev.summary) + '</p>' +

      '<div style="margin-top:28px;display:flex;gap:12px;flex-wrap:wrap">' +
        '<button class="btn btn-primary" data-goto="' +
          (authed ? '#/events' : '#/register') + '">' +
          '<i class="fas fa-ticket"></i> ' +
          (authed ? 'Reserve a seat' : 'Sign up to register') + '</button>' +
        '<button class="btn btn-secondary" data-goto="#/contact">' +
          '<i class="fas fa-circle-question"></i> Ask about this event</button>' +
      '</div>';

    P.bindGoto(host);
  }

  P.pages.eventDetail = { render: render, load: load };
})();
