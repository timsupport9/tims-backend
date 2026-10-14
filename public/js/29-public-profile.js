/* ============================================================
   ExpertHub 2.0 — 29-public-profile.js
   Public shareable profile pages: expert-hub.io/u/:username
   OG meta tags, achievements, skills, share buttons.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHPublicProfile = window.EHPublicProfile || {};

  /* ---------- path detection ---------- */
  function detectProfileRoute() {
    const path = location.pathname;
    const m = path.match(/^\/u\/([\w.-]+)\/?$/);
    if (m) return { username: m[1] };
    // Support ?u= fallback
    const params = new URLSearchParams(location.search);
    if (params.get('u')) return { username: params.get('u') };
    return null;
  }

  /* ---------- fetch / build public data ---------- */
  async function loadPublicProfile(username) {
    // Try server first
    try {
      const d = await apiCall(`/api/u/${encodeURIComponent(username)}`);
      if (d?.profile) return normalize(d.profile);
    } catch (_) {}

    // Fallback: local mock from current user if username matches
    if (currentUser && (currentUser.username === username || currentUser.id === username)) {
      return normalize(buildFromCurrentUser());
    }

    // Fallback: expert profile match
    const expert = (S.experts || []).find(e =>
      String(e.username) === username || String(e.id) === username
    );
    if (expert) {
      return normalize({
        username,
        display_name: expert.name,
        headline: expert.specialization,
        avatar_url: expert.avatar_url,
        bio: expert.bio || '',
        reputation: expert.reputation || 0,
        badges: [],
        skills: expert.skills || [],
        is_expert: true,
        hourly_rate: expert.hourly_rate,
        stats: {
          consultations: expert.total_sessions || 0,
          rating: expert.average_rating || 0,
        },
      });
    }

    return null;
  }

  function buildFromCurrentUser() {
    return {
      username: currentUser.username || currentUser.id,
      display_name: currentUser.name,
      headline: currentUser.headline || 'Learner on ExpertHub',
      avatar_url: currentUser.avatar_url,
      bio: currentUser.bio || '',
      reputation: currentUser.reputation || 0,
      badges: (S.userBadges || []).map(b => b.badge_code),
      skills: (currentUser.skills || []),
      stats: {
        level: S.userLevel || 1,
        xp: S.userXP || 0,
        streak: S.userStreak?.current || 0,
        courses_completed: (S.enrollments || []).filter(e => e.progress >= 100).length,
        certificates: (S.certificates || []).length,
      },
    };
  }

  function normalize(p) {
    return {
      username: p.username || 'unknown',
      display_name: p.display_name || 'Anonymous',
      headline: p.headline || '',
      avatar_url: p.avatar_url || null,
      bio: p.bio || '',
      reputation: p.reputation || 0,
      badges: p.badges || [],
      skills: p.skills || [],
      is_expert: !!p.is_expert,
      hourly_rate: p.hourly_rate || null,
      stats: p.stats || {},
    };
  }

  /* ---------- rendering ---------- */
  function renderProfilePage(profile) {
    document.title = `${profile.display_name} — ExpertHub`;

    // Inject meta tags for social previews
    injectMetaTags(profile);

    document.body.innerHTML = `
      <div class="public-profile">
        <header class="public-profile__header">
          <a class="public-profile__brand" href="/">
            <i class="fas fa-graduation-cap"></i> ExpertHub
          </a>
          <a class="btn btn-primary btn-sm" href="/#/dashboard">
            Join ExpertHub</a>
        </header>

        <main class="public-profile__main">
          <div class="public-profile__hero">
            <img class="public-profile__avatar"
                 src="${avatar({ name: profile.display_name, avatar_url: profile.avatar_url, email: profile.username })}"
                 alt="${escapeHtml(profile.display_name)}" />
            <div>
              <h1 class="public-profile__name">
                ${escapeHtml(profile.display_name)}
                ${profile.is_expert ? '<span class="badge-verified-sm"><i class="fas fa-check-circle"></i></span>' : ''}
              </h1>
              <p class="public-profile__headline">${escapeHtml(profile.headline)}</p>
              ${profile.bio ? `<p class="public-profile__bio">${escapeHtml(profile.bio)}</p>` : ''}
              <div class="public-profile__share">
                <button class="btn btn-secondary btn-sm" data-share="twitter">
                  <i class="fab fa-twitter"></i> Share</button>
                <button class="btn btn-secondary btn-sm" data-share="linkedin">
                  <i class="fab fa-linkedin"></i> LinkedIn</button>
                <button class="btn btn-secondary btn-sm" data-share="copy">
                  <i class="fas fa-link"></i> Copy link</button>
              </div>
            </div>
          </div>

          <section class="public-profile__stats">
            ${renderStat('Reputation', profile.reputation, 'star')}
            ${profile.stats.level ? renderStat('Level', profile.stats.level, 'medal') : ''}
            ${profile.stats.xp ? renderStat('XP', profile.stats.xp, 'bolt') : ''}
            ${profile.stats.streak ? renderStat('Day streak', profile.stats.streak, 'fire') : ''}
            ${profile.stats.courses_completed ? renderStat('Courses completed', profile.stats.courses_completed, 'check-circle') : ''}
            ${profile.stats.certificates ? renderStat('Certificates', profile.stats.certificates, 'certificate') : ''}
            ${profile.stats.rating ? renderStat('Rating', profile.stats.rating.toFixed(1), 'star') : ''}
            ${profile.stats.consultations ? renderStat('Consultations', profile.stats.consultations, 'comments') : ''}
          </section>

          ${profile.skills.length ? `
            <section class="panel">
              <h2 class="panel-title">Skills</h2>
              <div class="public-profile__skills">
                ${profile.skills.map(s => `<span class="chip chip-blue">${escapeHtml(s)}</span>`).join('')}
              </div>
            </section>` : ''}

          ${profile.badges.length ? `
            <section class="panel">
              <h2 class="panel-title">Badges</h2>
              <div class="badge-grid">
                ${profile.badges.map(b => {
                  const def = (typeof CONFIG !== 'undefined' && CONFIG.BADGES && CONFIG.BADGES[b]) || { name: b, icon: 'fa-award' };
                  return `
                    <div class="badge-card badge-earned">
                      <i class="fas ${def.icon}"></i>
                      <span class="badge-name">${escapeHtml(def.name)}</span>
                      <span class="badge-label">Earned</span>
                    </div>`;
                }).join('')}
              </div>
            </section>` : ''}

          <section class="public-profile__cta">
            <h2>Learn on ExpertHub</h2>
            <p>Bootcamps, short courses, and 1-on-1 expert consultations in one place.</p>
            <a class="btn btn-primary" href="/#/dashboard">Get started free</a>
          </section>
        </main>

        <footer class="public-profile__footer">
          <p>ExpertHub 2.0 — © ${new Date().getFullYear()}</p>
        </footer>
      </div>`;

    wireShareButtons(profile);
  }

  function renderStat(label, value, icon) {
    return `
      <div class="public-profile__stat">
        <i class="fas fa-${icon}"></i>
        <div>
          <div class="public-profile__stat-value">${escapeHtml(String(value))}</div>
          <div class="public-profile__stat-label">${escapeHtml(label)}</div>
        </div>
      </div>`;
  }

  function wireShareButtons(profile) {
    const url = location.href;
    const title = `${profile.display_name} on ExpertHub`;
    document.querySelectorAll('[data-share]').forEach(btn => {
      btn.onclick = () => {
        const kind = btn.dataset.share;
        if (kind === 'twitter') {
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
        } else if (kind === 'linkedin') {
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        } else if (kind === 'copy') {
          navigator.clipboard?.writeText(url).then(() => {
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.innerHTML = '<i class="fas fa-link"></i> Copy link'; }, 1500);
          });
        }
      };
    });
  }

  function injectMetaTags(profile) {
    // Remove existing
    document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]').forEach(m => m.remove());
    const tag = (attrs) => {
      const el = document.createElement('meta');
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
    };
    const img = profile.avatar_url || location.origin + '/icon-512.png';
    tag({ property: 'og:type',         content: 'profile' });
    tag({ property: 'og:title',        content: `${profile.display_name} — ExpertHub` });
    tag({ property: 'og:description',  content: profile.headline || profile.bio || 'Learner on ExpertHub' });
    tag({ property: 'og:image',        content: img });
    tag({ property: 'og:url',          content: location.href });
    tag({ name: 'twitter:card',        content: 'summary_large_image' });
    tag({ name: 'twitter:title',       content: `${profile.display_name} — ExpertHub` });
    tag({ name: 'twitter:description', content: profile.headline || profile.bio || '' });
    tag({ name: 'twitter:image',       content: img });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, ch => (
      { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]
    ));
  }

  /* ---------- route interception ---------- */
  async function boot() {
    const route = detectProfileRoute();
    if (!route) return false;

    const profile = await loadPublicProfile(route.username);
    if (!profile) {
      document.body.innerHTML = `
        <div class="public-profile">
          <header class="public-profile__header">
            <a class="public-profile__brand" href="/"><i class="fas fa-graduation-cap"></i> ExpertHub</a>
          </header>
          <div class="empty-state" style="padding:80px 20px;text-align:center">
            <i class="fas fa-user-slash" style="font-size:56px;opacity:.4"></i>
            <h2>Profile not found</h2>
            <p>This user doesn't exist or their profile is private.</p>
            <a class="btn btn-primary" href="/#/dashboard">Go to ExpertHub</a>
          </div>
        </div>`;
      return true;
    }

    renderProfilePage(profile);
    return true;
  }

  /* ---------- helper for the current user to grab their share URL ---------- */
  NS.getShareUrl = function () {
    if (!currentUser) return null;
    const slug = currentUser.username || currentUser.id;
    return `${location.origin}/u/${encodeURIComponent(slug)}`;
  };

  NS.copyShareUrl = async function () {
    const url = NS.getShareUrl();
    if (!url) return showToast('Sign in to share your profile', 'info');
    try {
      await navigator.clipboard.writeText(url);
      showToast('Profile link copied', 'success');
    } catch (_) { showToast('Copy failed', 'error'); }
  };

  NS.boot = boot;
  NS.render = renderProfilePage;

  // Boot immediately — this runs before the SPA router, and short-circuits
  // the app shell if we're on a profile URL.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => boot(), { once: true });
  } else {
    boot();
  }