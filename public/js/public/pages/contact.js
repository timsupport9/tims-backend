/* ============================================================
   ExpertHub — js/public/pages/contact.js
   #/contact  —  public contact form.
   ============================================================ */
(function () {
  'use strict';
  var P = window.PublicUI = window.PublicUI || {};
  P.pages = P.pages || {};
  var esc = P.format.esc;

  function render() {
    try { appPhase = 'landing'; } catch (_) {}
    P.ensureStyles();

    var root = document.getElementById('app-root');
    root.innerHTML = '' +
      '<div class="landing">' +
        P.components.navbar('contact') +
        '<div class="pub-page" style="max-width:760px">' +
          '<h1 class="section-title" style="margin-bottom:6px">Contact us</h1>' +
          '<p class="section-sub">Questions about courses, consultations or corporate training? ' +
            'We reply within one business day.</p>' +

          '<form class="pub-form" id="pubContactForm" style="margin-top:28px" novalidate>' +
            '<div class="pub-field">' +
              '<label for="pubContactName">Your name</label>' +
              '<input id="pubContactName" name="name" type="text" required placeholder="Jane Doe">' +
            '</div>' +
            '<div class="pub-field">' +
              '<label for="pubContactEmail">Email address</label>' +
              '<input id="pubContactEmail" name="email" type="email" required placeholder="jane@example.com">' +
            '</div>' +
            '<div class="pub-field">' +
              '<label for="pubContactTopic">Topic</label>' +
              '<select id="pubContactTopic" name="topic">' +
                '<option>General enquiry</option>' +
                '<option>Course support</option>' +
                '<option>Become an expert</option>' +
                '<option>Corporate training</option>' +
                '<option>Billing &amp; payments</option>' +
                '<option>Report a problem</option>' +
              '</select>' +
            '</div>' +
            '<div class="pub-field">' +
              '<label for="pubContactMessage">Message</label>' +
              '<textarea id="pubContactMessage" name="message" rows="6" required ' +
                'placeholder="Tell us how we can help…"></textarea>' +
            '</div>' +
            '<div id="pubContactStatus" style="font-size:.88rem"></div>' +
            '<button class="btn btn-primary" type="submit" style="justify-self:start">' +
              '<i class="fas fa-paper-plane"></i> Send message</button>' +
          '</form>' +

          '<div style="margin-top:36px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">' +
            tile('fa-envelope', 'Email', 'support@experthub.example') +
            tile('fa-comments', 'Live chat', 'Available in-app once signed in') +
            tile('fa-building-columns', 'Corporate', 'training@experthub.example') +
          '</div>' +
        '</div>' +
        P.components.footer() +
      '</div>';

    P.bindGoto(root);
    bind(root);
  }

  function tile(icon, label, value) {
    return '<div class="pub-row-card">' +
      '<i class="fas ' + icon + '" style="font-size:1.2rem;opacity:.5"></i>' +
      '<div><b style="display:block;font-size:.76rem;opacity:.55;text-transform:uppercase;letter-spacing:.05em">' +
        esc(label) + '</b>' + esc(value) + '</div>' +
    '</div>';
  }

  function bind(root) {
    var form = root.querySelector('#pubContactForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var status = document.getElementById('pubContactStatus');
      var payload = {
        name: (document.getElementById('pubContactName') || {}).value || '',
        email: (document.getElementById('pubContactEmail') || {}).value || '',
        topic: (document.getElementById('pubContactTopic') || {}).value || '',
        message: (document.getElementById('pubContactMessage') || {}).value || '',
        source: 'public-landing'
      };

      if (!payload.name.trim() || !payload.email.trim() || !payload.message.trim()) {
        status.innerHTML = '<span style="color:#ef4444">Please fill in your name, email and message.</span>';
        return;
      }

      status.innerHTML = '<span style="opacity:.65"><i class="fas fa-circle-notch fa-spin"></i> Sending…</span>';

      try {
        await P.api.fetch('/contact', { method: 'POST', body: payload });
        status.innerHTML = '<span style="color:#10b981"><i class="fas fa-circle-check"></i> ' +
          'Thanks! We have received your message and will reply shortly.</span>';
        form.reset();
      } catch (_) {
        status.innerHTML = '<span style="color:#f59e0b"><i class="fas fa-triangle-exclamation"></i> ' +
          'We could not send that automatically. ' +
          '<a href="mailto:support@experthub.example?subject=' +
          encodeURIComponent(payload.topic) + '&body=' + encodeURIComponent(payload.message) +
          '">Open your email client instead</a>.</span>';
      }
    });
  }

  P.pages.contact = { render: render };
})();
