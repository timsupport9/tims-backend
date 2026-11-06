/* ============================================================
   ExpertHub 2.0 — dashboards/user/experts.js
   Comprehensive expert marketplace: discovery, advanced search,
   comparison, shortlist, recommendations, reviews, profiles.

   Internal organisation (all in this single file):
     1  Module state and configuration
     2  Expert data normalization
     3  Expert utility functions
     4  Marketplace data loading
     5  Data synchronization
     6  Search history
     7  Search suggestions
     8  Search engine
     9  Filter management
    10  Advanced filtering
    11  Sorting and ranking
    12  Marketplace overview
    13  Marketplace statistics
    14  Featured experts
    15  Recommended experts
    16  Expert matching
    17  Search results
    18  Expert cards
    19  Expert profile
    20  Qualifications
    21  Professional experience
    22  Services catalogue
    23  Pricing management
    24  Availability display
    25  Shortlist management
    26  Expert comparison
    27  Reviews and ratings
    28  Review submission
    29  Review reporting
    30  Booking integration
    31  Instant consultation
    32  Booking preparation
    33  Pagination
    34  Marketplace notifications
    35  Action registration
    36  Event initialization
    37  Module registration
   ============================================================ */

/* ============================================================
   1. MODULE STATE AND CONFIGURATION
   ============================================================ */

S.expertCompareList         = S.expertCompareList         || [];   // array of expert ids (strings)
S.expertSearchHistory       = S.expertSearchHistory       || [];   // [{ term, at }]
S.expertSearchSuggestions   = S.expertSearchSuggestions   || [];
S.expertFeatured            = S.expertFeatured            || [];
S.expertRecommended         = S.expertRecommended         || [];
S.expertRecommendedReasons  = S.expertRecommendedReasons  || {};
S.expertReviewsByExpert     = S.expertReviewsByExpert     || {};
S.expertFilterOptions       = S.expertFilterOptions       || {
  categories: [], specializations: [], languages: [], locations: [],
};
S.experts                   = S.experts                   || [];

S.expertMarketplaceState    = S.expertMarketplaceState    || 'idle'; // idle|loading|ok|error|empty
S.expertFeaturedState       = S.expertFeaturedState       || 'idle'; // idle|loading|ok|error
S.expertRecommendedState    = S.expertRecommendedState    || 'idle'; // idle|loading|ok|error
S.expertFilterOptionsState  = S.expertFilterOptionsState  || 'idle'; // idle|loading|ok|error
S.expertLastLoadedAt        = S.expertLastLoadedAt        || 0;
S.expertLoadError           = S.expertLoadError           || '';

const EXPERT_PAGE_SIZE           = 12;
const EXPERT_FILTER_KEY          = 'experts';
const EXPERT_SEARCH_HISTORY_KEY  = 'eh_expert_search_history_v1';
const EXPERT_HISTORY_MAX         = 8;
const EXPERT_COMPARE_MAX         = 3;
const EXPERT_COMPARE_RENDER_KEY  = 'experts_compare';
const EXPERT_CACHE_TTL_MS        = 2 * 60 * 1000;   // 2 minutes
const EXPERT_SUGGESTION_LIMIT    = 8;

/* Async guards (module-scoped, never exposed) */
let __expertsLoadingPromise = null;
let __expertsEpoch          = 0;      // increments on every (re)load; stale responses are discarded
let __suggestionIndex       = -1;     // keyboard navigation cursor
let __suggestionItems       = [];     // currently rendered suggestion items

/* ============================================================
   2. EXPERT DATA NORMALIZATION
   ============================================================ */

function _normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    if (item == null) continue;
    if (typeof item === 'string') {
      const s = item.trim();
      if (s) out.push(s);
      continue;
    }
    if (typeof item === 'object') {
      const s = String(item.name || item.title || item.label || '').trim();
      if (s) out.push(s);
    }
  }
  return out;
}

function _numOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function _numOrZero(value) {
  const n = _numOrNull(value);
  return n === null ? 0 : n;
}

/**
 * Normalizes a single raw expert record into a predictable shape.
 * Returns null for records that cannot be identified.
 */
function _normalizeExpert(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw.id != null ? raw.id : raw.expert_id;
  if (id == null || id === '') return null;

  const startingPrice = _numOrNull(raw.starting_price);

  return {
    ...raw,
    id: String(id),
    name: String(raw.name || raw.full_name || 'Expert'),
    professional_title: String(raw.professional_title || raw.title || ''),
    specialization: String(raw.specialization || ''),
    category: String(raw.category || ''),
    organization: String(raw.organization || ''),
    location: String(raw.location || ''),
    bio: String(raw.bio || raw.about || ''),
    hourly_rate: _numOrZero(raw.hourly_rate),
    starting_price: startingPrice,
    average_rating: _numOrZero(raw.average_rating ?? raw.rating),
    review_count: _numOrZero(raw.review_count ?? raw.reviews_count),
    years_experience: _numOrZero(raw.years_experience ?? raw.experience_years),
    response_time_minutes: _numOrNull(raw.response_time_minutes ?? raw.response_time),
    is_online: !!(raw.is_online || raw.online),
    instant_available: !!raw.instant_available,
    verified_badge: !!(raw.verified_badge || raw.verified),
    available_today: !!raw.available_today,
    available_this_week: raw.available_this_week === undefined ? null : !!raw.available_this_week,
    next_available_at: raw.next_available_at || null,
    last_active_at: raw.last_active_at || null,
    languages: _normalizeStringArray(raw.languages),
    supported_modes: _normalizeStringArray(raw.supported_modes),
    skills: _normalizeStringArray(raw.skills),
    qualifications: Array.isArray(raw.qualifications) ? raw.qualifications : [],
    services: Array.isArray(raw.services) ? raw.services : [],
    experience_history: Array.isArray(raw.experience_history) ? raw.experience_history : [],
    avatar_url: String(raw.avatar_url || raw.avatar || raw.photo_url || ''),
  };
}

function _normalizeExpertList(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    const e = _normalizeExpert(raw);
    if (!e) continue;
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out;
}

/* ============================================================
   3. EXPERT UTILITY FUNCTIONS
   ============================================================ */

/** Safe HTML escaping that tolerates null/undefined/objects. */
function _esc(value) {
  const s = value === null || value === undefined ? '' : String(value);
  try {
    return typeof esc === 'function' ? esc(s) : s;
  } catch {
    return s;
  }
}

/** Validates an expert identifier before it reaches HTML attributes or URLs. */
function _safeId(id) {
  if (id === null || id === undefined) return '';
  const s = String(id).trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(s) ? s : '';
}

/** Returns a validated id or null — use before API calls. */
function _safeIdOrNull(id) {
  const s = _safeId(id);
  return s || null;
}

function _initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function _placeholderAvatar(expert) {
  const initials = _esc(_initials(expert && expert.name));
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">' +
    '<rect width="96" height="96" fill="#e2e8f0"/>' +
    '<text x="48" y="60" font-family="system-ui,sans-serif" font-size="34" ' +
    'fill="#64748b" text-anchor="middle">' + initials + '</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** Validates and resolves an expert avatar URL, with a safe fallback. */
function _expertAvatar(expert) {
  let url = '';
  try {
    url = typeof avatar === 'function' ? (avatar(expert) || '') : '';
  } catch {
    url = '';
  }
  if (!url && expert) url = expert.avatar_url || '';
  const s = String(url || '').trim();
  if (!s) return _placeholderAvatar(expert);
  if (/^(https?:\/\/|data:image\/|\/|\.\/|\.\.\/)/i.test(s)) return s;
  return _placeholderAvatar(expert);
}

/** Currency-aware, null-safe money formatting. */
function _money(value, currency) {
  const n = _numOrNull(value);
  if (n === null) return '—';
  try {
    return typeof fmtCur === 'function' ? fmtCur(n, currency) : `${n}`;
  } catch {
    return `${n}`;
  }
}

function _rating(value) {
  const n = _numOrNull(value);
  return n === null ? '0.0' : n.toFixed(1);
}

/** Formats a date safely, returning an em dash for invalid input. */
function _date(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return typeof fmtDate === 'function' ? fmtDate(value) : d.toLocaleString();
  } catch {
    return '—';
  }
}

function _relativeTime(value) {
  if (!value) return '';
  try {
    return typeof timeAgo === 'function' ? timeAgo(value) : '';
  } catch {
    return '';
  }
}

/** Local (not UTC) YYYY-MM-DD, used as the booking minimum date. */
function _todayLocalISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/**
 * Converts a local date/time selection into an ISO string.
 * The browser timezone is applied; the same timezone name is sent to the
 * server so it can validate the slot authoritatively.
 */
function _localDateTimeToIso(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const d = new Date(`${dateStr}T${timeStr}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Safely reads a value for display, preserving falsy-but-valid values like 0. */
function _display(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

/* ============================================================
   4. MARKETPLACE DATA LOADING
   ============================================================ */

function _isExpertCacheFresh() {
  if (!S.expertLastLoadedAt) return false;
  return Date.now() - S.expertLastLoadedAt < EXPERT_CACHE_TTL_MS;
}

/**
 * Loads the marketplace. The main expert list determines success/failure;
 * featured, recommended and filter-options may fail independently.
 */
async function _loadExpertsMarketplace({ force = false } = {}) {
  if (__expertsLoadingPromise && !force) return __expertsLoadingPromise;
  if (!force && S.expertMarketplaceState === 'ok' && _isExpertCacheFresh()) return;

  const epoch = ++__expertsEpoch;

  S.expertMarketplaceState   = 'loading';
  S.expertFeaturedState      = 'loading';
  S.expertRecommendedState   = 'loading';
  S.expertFilterOptionsState = 'loading';
  S.expertLoadError          = '';

  __expertsLoadingPromise = (async () => {
    /* ---- Primary payload: the expert list ---- */
    try {
      const data = await apiCall('/api/user/experts');
      if (epoch !== __expertsEpoch) return;
      if (!data || !Array.isArray(data.experts)) {
        throw new Error('Malformed response from the experts service.');
      }
      S.experts = _normalizeExpertList(data.experts);
      S.expertMarketplaceState = S.experts.length ? 'ok' : 'empty';
      S.expertLastLoadedAt = Date.now();
    } catch (err) {
      if (epoch !== __expertsEpoch) return;
      S.expertLoadError = (err && err.message) || 'Unable to reach the experts service.';
      S.experts = S.experts || [];
      S.expertMarketplaceState = 'error';
    }

    /* ---- Secondary payloads: failures are isolated ---- */
    const secondary = [
      apiCall('/api/user/experts/featured')
        .then(d => {
          if (epoch !== __expertsEpoch) return;
          S.expertFeatured = _normalizeExpertList(d && d.experts);
          S.expertFeaturedState = 'ok';
        })
        .catch(() => { if (epoch === __expertsEpoch) S.expertFeaturedState = 'error'; }),

      apiCall('/api/user/experts/recommended')
        .then(d => {
          if (epoch !== __expertsEpoch) return;
          S.expertRecommended = _normalizeExpertList(d && d.experts);
          S.expertRecommendedReasons = (d && d.reasons) || {};
          S.expertRecommendedState = 'ok';
        })
        .catch(() => { if (epoch === __expertsEpoch) S.expertRecommendedState = 'error'; }),

      apiCall('/api/user/experts/filter-options')
        .then(d => {
          if (epoch !== __expertsEpoch) return;
          const opts = (d && d.options) || null;
          if (opts && typeof opts === 'object') {
            S.expertFilterOptions = {
              categories: _normalizeStringArray(opts.categories),
              specializations: _normalizeStringArray(opts.specializations),
              languages: _normalizeStringArray(opts.languages),
              locations: _normalizeStringArray(opts.locations),
            };
          }
          S.expertFilterOptionsState = 'ok';
        })
        .catch(() => { if (epoch === __expertsEpoch) S.expertFilterOptionsState = 'error'; }),
    ];

    await Promise.allSettled(secondary);

    if (epoch !== __expertsEpoch) return;

    _deriveFilterOptionsFromExperts();
    S.expertSearchHistory = _readSearchHistory();
  })().finally(() => {
    __expertsLoadingPromise = null;
  });

  return __expertsLoadingPromise;
}

/* ============================================================
   5. DATA SYNCHRONIZATION
   ============================================================ */

/** Backfills filter option lists from loaded experts when the API is silent. */
function _deriveFilterOptionsFromExperts() {
  const opts = S.expertFilterOptions || {};
  const list = S.experts || [];

  if (!(opts.categories || []).length) {
    opts.categories = Array.from(new Set(list.map(e => e.category).filter(Boolean))).sort();
  }
  if (!(opts.specializations || []).length) {
    opts.specializations = Array.from(new Set(list.map(e => e.specialization).filter(Boolean))).sort();
  }
  if (!(opts.languages || []).length) {
    opts.languages = Array.from(new Set(list.flatMap(e => e.languages || []).filter(Boolean))).sort();
  }
  if (!(opts.locations || []).length) {
    opts.locations = Array.from(new Set(list.map(e => e.location).filter(Boolean))).sort();
  }
  S.expertFilterOptions = opts;
}

/** Marks cached marketplace data as stale so the next render refetches. */
function _invalidateExpertCache() {
  S.expertMarketplaceState = 'idle';
  S.expertLastLoadedAt = 0;
}

function _findExpertById(id) {
  const sid = _safeId(id);
  if (!sid) return null;
  return (S.experts || []).find(e => e.id === sid) || null;
}

function _findExpertAnywhere(id) {
  const sid = _safeId(id);
  if (!sid) return null;
  return (
    (S.experts || []).find(e => e.id === sid) ||
    (S.expertFeatured || []).find(e => e.id === sid) ||
    (S.expertRecommended || []).find(e => e.id === sid) ||
    null
  );
}

/* ============================================================
   6. SEARCH HISTORY
   ============================================================ */

function _readSearchHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(EXPERT_SEARCH_HISTORY_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .map(entry => {
        if (typeof entry === 'string') return { term: entry.trim(), at: null };
        if (entry && typeof entry === 'object' && entry.term) {
          return { term: String(entry.term).trim(), at: entry.at || null };
        }
        return null;
      })
      .filter(x => x && x.term)
      .slice(0, EXPERT_HISTORY_MAX);
  } catch {
    return [];
  }
}

function _writeSearchHistory(list) {
  const trimmed = (list || []).slice(0, EXPERT_HISTORY_MAX);
  try {
    localStorage.setItem(EXPERT_SEARCH_HISTORY_KEY, JSON.stringify(trimmed));
  } catch { /* storage may be unavailable */ }
  S.expertSearchHistory = trimmed;
}

function _pushSearchHistory(term) {
  const t = String(term || '').trim();
  if (!t) return;
  const list = _readSearchHistory().filter(x => x.term !== t);
  list.unshift({ term: t, at: Date.now() });
  _writeSearchHistory(list);
}

function _removeSearchHistory(term) {
  const t = String(term || '').trim();
  if (!t) return;
  _writeSearchHistory(_readSearchHistory().filter(x => x.term !== t));
}

function _clearSearchHistory() {
  try { localStorage.removeItem(EXPERT_SEARCH_HISTORY_KEY); } catch {}
  S.expertSearchHistory = [];
}

/* ============================================================
   7. SEARCH SUGGESTIONS
   ============================================================ */

function _normalizeQuery(query) {
  return String(query || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function _buildSuggestions(query) {
  const experts = S.experts || [];
  const q = _normalizeQuery(query);
  if (!q) return [];

  const seen = new Set();
  const out = [];
  const push = (text, type) => {
    const value = String(text || '').trim();
    if (!value) return;
    const key = `${type}:${value.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ text: value, type });
    return out.length >= EXPERT_SUGGESTION_LIMIT;
  };

  const fields = [
    ['name', e => e.name],
    ['specialization', e => e.specialization],
    ['category', e => e.category],
    ['title', e => e.professional_title],
    ['skill', e => (e.skills || []).join(' ')],
    ['service', e => (e.services || []).map(s => (s && s.name) || '').join(' ')],
    ['organization', e => e.organization],
    ['location', e => e.location],
  ];

  for (const e of experts) {
    for (const [type, getter] of fields) {
      let value = '';
      try { value = String(getter(e) || ''); } catch { value = ''; }
      if (!value) continue;
      if (value.toLowerCase().includes(q)) {
        const text = type === 'skill' || type === 'service'
          ? (String(getter(e) || '').split(' ').find(w => w.toLowerCase().includes(q)) || value)
          : value;
        if (push(text, type)) return out;
      }
    }
    if (out.length >= EXPERT_SUGGESTION_LIMIT) break;
  }

  return out;
}

function _suggestionIcon(type) {
  switch (type) {
    case 'name': return 'fa-user';
    case 'specialization': return 'fa-briefcase';
    case 'category': return 'fa-tag';
    case 'title': return 'fa-id-badge';
    case 'skill': return 'fa-lightbulb';
    case 'service': return 'fa-concierge-bell';
    case 'organization': return 'fa-building';
    case 'location': return 'fa-map-marker-alt';
    default: return 'fa-search';
  }
}

/* ============================================================
   8. SEARCH ENGINE
   ============================================================ */

function _expertMatchesQuery(expert, query) {
  const q = _normalizeQuery(query);
  if (!q) return true;

  const haystack = [
    expert.name,
    expert.specialization,
    expert.professional_title,
    expert.category,
    expert.organization,
    expert.location,
    expert.bio,
    (expert.skills || []).join(' '),
    (expert.languages || []).join(' '),
    (expert.services || []).map(s => (s && s.name) || '').join(' '),
    (expert.qualifications || [])
      .map(q2 => (typeof q2 === 'string' ? q2 : (q2 && (q2.title || q2.name)) || ''))
      .join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(q);
}

/** Highlights every case-insensitive occurrence of the query inside text. */
function _highlight(text, query) {
  const src = String(text === null || text === undefined ? '' : text);
  const raw = String(query || '').trim();
  if (!raw) return _esc(src);

  const lowerSrc = src.toLowerCase();
  const lowerQ = raw.toLowerCase();
  let out = '';
  let cursor = 0;

  while (cursor < src.length) {
    const at = lowerSrc.indexOf(lowerQ, cursor);
    if (at < 0) {
      out += _esc(src.slice(cursor));
      break;
    }
    out += _esc(src.slice(cursor, at));
    out += '<mark>' + _esc(src.slice(at, at + raw.length)) + '</mark>';
    cursor = at + raw.length;
  }
  return out;
}

/* ============================================================
   9. FILTER MANAGEMENT
   ============================================================ */

function _getExpertFilters() {
  const f = {
    query:          UserFilters.get(EXPERT_FILTER_KEY, 'q', '') || '',
    budgetMin:      UserFilters.get(EXPERT_FILTER_KEY, 'budget_min', ''),
    budgetMax:      UserFilters.get(EXPERT_FILTER_KEY, 'budget_max', ''),
    instantOnly:    !!UserFilters.get(EXPERT_FILTER_KEY, 'instant', false),
    verifiedOnly:   !!UserFilters.get(EXPERT_FILTER_KEY, 'verified', false),
    category:       UserFilters.get(EXPERT_FILTER_KEY, 'category', '') || '',
    specialization: UserFilters.get(EXPERT_FILTER_KEY, 'spec', '') || '',
    minRating:      UserFilters.get(EXPERT_FILTER_KEY, 'min_rating', ''),
    minExperience:  UserFilters.get(EXPERT_FILTER_KEY, 'min_exp', ''),
    minReviews:     UserFilters.get(EXPERT_FILTER_KEY, 'min_reviews', ''),
    language:       UserFilters.get(EXPERT_FILTER_KEY, 'language', '') || '',
    mode:           UserFilters.get(EXPERT_FILTER_KEY, 'mode', '') || '',
    location:       UserFilters.get(EXPERT_FILTER_KEY, 'location', '') || '',
    availability:   UserFilters.get(EXPERT_FILTER_KEY, 'availability', '') || '',
    sortBy:         UserFilters.get(EXPERT_FILTER_KEY, 'sort', 'rating') || 'rating',
    page:           Number(UserFilters.get(EXPERT_FILTER_KEY, 'page', 1)) || 1,
  };
  return _sanitizeExpertFilters(f);
}

/** Normalizes numeric filters and repairs inverted price ranges. */
function _sanitizeExpertFilters(f) {
  const toNumOrEmpty = v => {
    if (v === '' || v === null || v === undefined) return '';
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : '';
  };

  f.budgetMin     = toNumOrEmpty(f.budgetMin);
  f.budgetMax     = toNumOrEmpty(f.budgetMax);
  f.minRating     = toNumOrEmpty(f.minRating);
  f.minExperience = toNumOrEmpty(f.minExperience);
  f.minReviews    = toNumOrEmpty(f.minReviews);

  if (f.budgetMin !== '' && f.budgetMax !== '' && f.budgetMin > f.budgetMax) {
    const t = f.budgetMin;
    f.budgetMin = f.budgetMax;
    f.budgetMax = t;
  }

  if (!Number.isFinite(f.page) || f.page < 1) f.page = 1;
  return f;
}

function _setExpertFilter(name, value) {
  UserFilters.set(EXPERT_FILTER_KEY, name, value);
  if (name !== 'page') UserFilters.set(EXPERT_FILTER_KEY, 'page', 1);
}

function _clearExpertFilters() {
  UserFilters.clear(EXPERT_FILTER_KEY);
}

function _activeExpertFilterCount(f) {
  return [
    f.query, f.budgetMax, f.budgetMin, f.instantOnly, f.verifiedOnly,
    f.category, f.specialization, f.minRating, f.minExperience, f.minReviews,
    f.language, f.mode, f.location, f.availability,
  ].filter(v => v !== '' && v !== false && v !== null && v !== undefined).length;
}

function _hasActiveExpertFilters(f) {
  return _activeExpertFilterCount(f) > 0;
}

/* ============================================================
   10. ADVANCED FILTERING
   ============================================================ */

function _expertIsAvailableToday(e) {
  return !!(e.is_online || e.available_today);
}

function _expertIsAvailableThisWeek(e) {
  if (e.available_this_week === true) return true;
  if (e.available_this_week === false) return false;
  // Unknown availability: only accept if there is some positive signal.
  return !!(e.is_online || e.available_today);
}

function _expertPriceForFilter(e) {
  const rate = _numOrNull(e.hourly_rate);
  if (rate !== null && rate > 0) return rate;
  const starting = _numOrNull(e.starting_price);
  if (starting !== null && starting > 0) return starting;
  return null;
}

function _applyExpertFilters(list, f) {
  let out = Array.isArray(list) ? list.slice() : [];

  if (f.query) {
    out = out.filter(e => _expertMatchesQuery(e, f.query));
  }

  if (f.budgetMin !== '' || f.budgetMax !== '') {
    out = out.filter(e => {
      const price = _expertPriceForFilter(e);
      if (price === null) return false; // unknown price is excluded from a price-bounded search
      if (f.budgetMin !== '' && price < Number(f.budgetMin)) return false;
      if (f.budgetMax !== '' && price > Number(f.budgetMax)) return false;
      return true;
    });
  }

  if (f.instantOnly)   out = out.filter(e => e.is_online || e.instant_available);
  if (f.verifiedOnly)  out = out.filter(e => e.verified_badge);
  if (f.category)      out = out.filter(e => e.category === f.category);
  if (f.specialization) out = out.filter(e => e.specialization === f.specialization);

  if (f.minRating !== '') {
    out = out.filter(e => _numOrZero(e.average_rating) >= Number(f.minRating));
  }
  if (f.minExperience !== '') {
    out = out.filter(e => _numOrZero(e.years_experience) >= Number(f.minExperience));
  }
  if (f.minReviews !== '') {
    out = out.filter(e => _numOrZero(e.review_count) >= Number(f.minReviews));
  }
  if (f.language) {
    out = out.filter(e => (e.languages || []).includes(f.language));
  }
  if (f.location) {
    const loc = String(f.location).toLowerCase();
    out = out.filter(e => (e.location || '').toLowerCase().includes(loc));
  }
  if (f.mode) {
    out = out.filter(e => (e.supported_modes || []).includes(f.mode));
  }
  if (f.availability === 'today') {
    out = out.filter(_expertIsAvailableToday);
  } else if (f.availability === 'week') {
    out = out.filter(_expertIsAvailableThisWeek);
  }

  return _sortExperts(out, f);
}

/* ============================================================
   11. SORTING AND RANKING
   ============================================================ */

function _compareNullsLast(a, b, direction = 1) {
  const aNull = a === null || a === undefined;
  const bNull = b === null || b === undefined;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  return (a - b) * direction;
}

/** Weighted score used by "best match" sorting. */
function _expertMatchScore(expert, f) {
  let score = 0;
  score += Math.min(_numOrZero(expert.average_rating) / 5, 1) * 30;
  score += Math.min(_numOrZero(expert.review_count) / 50, 1) * 10;
  score += Math.min(_numOrZero(expert.years_experience) / 10, 1) * 15;
  if (expert.verified_badge) score += 10;
  if (expert.is_online) score += 8;

  const rt = _numOrNull(expert.response_time_minutes);
  if (rt !== null) score += Math.max(0, 1 - rt / 240) * 12;

  if (f && f.query && _expertMatchesQuery(expert, f.query)) score += 15;
  if (f && f.language && (expert.languages || []).includes(f.language)) score += 5;
  if (f && f.mode && (expert.supported_modes || []).includes(f.mode)) score += 5;

  return Math.round(score);
}

function _sortExperts(list, f) {
  const out = list.slice();
  const sortBy = f.sortBy || 'rating';

  out.sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return _compareNullsLast(_expertPriceForFilter(a), _expertPriceForFilter(b), 1);
      case 'price_desc':
        return _compareNullsLast(_expertPriceForFilter(a), _expertPriceForFilter(b), -1);
      case 'response':
        return _compareNullsLast(
          _numOrNull(a.response_time_minutes),
          _numOrNull(b.response_time_minutes),
          1
        );
      case 'experience':
        return _numOrZero(b.years_experience) - _numOrZero(a.years_experience);
      case 'reviews':
        return _numOrZero(b.review_count) - _numOrZero(a.review_count);
      case 'recent': {
        const aT = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
        const bT = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
        return bT - aT;
      }
      case 'available': {
        if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
        const aT = a.next_available_at ? new Date(a.next_available_at).getTime() : Infinity;
        const bT = b.next_available_at ? new Date(b.next_available_at).getTime() : Infinity;
        return _compareNullsLast(
          Number.isFinite(aT) ? aT : null,
          Number.isFinite(bT) ? bT : null,
          1
        );
      }
      case 'best_match':
        return _expertMatchScore(b, f) - _expertMatchScore(a, f);
      case 'rating':
      default:
        return _numOrZero(b.average_rating) - _numOrZero(a.average_rating);
    }
  });

  return out;
}

/* ============================================================
   12. MARKETPLACE OVERVIEW
   ============================================================ */

function renderMarketplaceOverview(f) {
  const stats = _marketplaceStats();
  const isLoading = S.expertMarketplaceState === 'loading';
  const chip = (key, value, label, active) => `
    <button class="chip ${active ? 'chip-blue' : 'chip-neutral'}"
            data-action="expert-quick-filter"
            data-key="${_esc(key)}" data-value="${_esc(value)}"
            aria-pressed="${active ? 'true' : 'false'}">
      ${_esc(label)}
    </button>`;

  return `
    <section class="panel expert-hero">
      <h2 class="panel-title" style="font-size:1.4rem;margin-bottom:4px">
        Find the right expert for your needs</h2>
      <p class="form-hint" style="margin-top:0">
        Discover qualified professionals, compare their services and book expert-led support.</p>

      <div class="expert-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:14px">
        <div class="stat-tile" style="padding:10px 12px;border-radius:10px;background:var(--surface-2,#f1f5f9)">
          <strong style="font-size:1.35rem;display:block">${isLoading ? '—' : stats.total}</strong>
          <span class="form-hint">Available experts</span>
        </div>
        <div class="stat-tile" style="padding:10px 12px;border-radius:10px;background:var(--surface-2,#f1f5f9)">
          <strong style="font-size:1.35rem;display:block">${isLoading ? '—' : stats.verified}</strong>
          <span class="form-hint">Verified professionals</span>
        </div>
        <div class="stat-tile" style="padding:10px 12px;border-radius:10px;background:var(--surface-2,#f1f5f9)">
          <strong style="font-size:1.35rem;display:block">${isLoading ? '—' : stats.online}</strong>
          <span class="form-hint">Available now</span>
        </div>
        <div class="stat-tile" style="padding:10px 12px;border-radius:10px;background:var(--surface-2,#f1f5f9)">
          <strong style="font-size:1.35rem;display:block">${isLoading ? '—' : stats.categories}</strong>
          <span class="form-hint">Categories</span>
        </div>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px">
        ${chip('verified', 'true', 'Verified experts', f.verifiedOnly)}
        ${chip('availability', 'today', 'Available today', f.availability === 'today')}
        ${chip('min_rating', '4.5', 'Top rated', String(f.minRating) === '4.5')}
        ${chip('instant', 'true', 'Online now', f.instantOnly)}
        ${chip('budget_max', '50', 'Under $50/hr', String(f.budgetMax) === '50')}
      </div>
    </section>
  `;
}

/* ============================================================
   13. MARKETPLACE STATISTICS
   ============================================================ */

function _marketplaceStats() {
  const list = S.experts || [];
  return {
    total: list.length,
    verified: list.filter(e => e.verified_badge).length,
    online: list.filter(e => e.is_online || e.instant_available).length,
    categories: new Set(list.map(e => e.category).filter(Boolean)).size,
    averageRating: list.length
      ? (list.reduce((sum, e) => sum + _numOrZero(e.average_rating), 0) / list.length).toFixed(1)
      : '0.0',
  };
}

/* ============================================================
   14. FEATURED EXPERTS
   ============================================================ */

function renderExpertFeaturedStrip() {
  const list = (S.expertFeatured || []).slice(0, 4);
  if (!list.length) return '';

  return `
    <section class="panel">
      <h3 class="panel-title"><i class="fas fa-star"></i> Featured experts</h3>
      <div class="card-grid">
        ${list.map(e => `
          <article class="program-card">
            <span class="chip chip-yellow">Featured</span>
            <img class="expert-avatar" src="${_esc(_expertAvatar(e))}" alt="" loading="lazy" />
            <h4 class="program-title">${_esc(e.name)}</h4>
            <p class="program-desc">${_esc(e.specialization || '—')}</p>
            <p class="program-meta">${_money(e.hourly_rate)}/hr</p>
            <div class="panel-actions" style="margin-top:8px">
              <button class="btn btn-primary btn-sm"
                      data-action="view-expert-profile" data-id="${_esc(_safeId(e.id))}">
                <i class="fas fa-eye"></i> View profile</button>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

/* ============================================================
   15. RECOMMENDED EXPERTS
   ============================================================ */

function renderExpertRecommendationsStrip() {
  const list = (S.expertRecommended || []).slice(0, 4);
  if (!list.length) return '';
  const reasons = S.expertRecommendedReasons || {};

  return `
    <section class="panel">
      <h3 class="panel-title"><i class="fas fa-lightbulb"></i> Recommended for you</h3>
      <p class="form-hint">Based on your intent, goals and past activity.</p>
      <div class="card-grid">
        ${list.map(e => `
          <article class="program-card">
            <img class="expert-avatar" src="${_esc(_expertAvatar(e))}" alt="" loading="lazy" />
            <h4 class="program-title">${_esc(e.name)}
              ${e.verified_badge ? '<span class="chip chip-green" title="Verified"><i class="fas fa-check-shield"></i></span>' : ''}</h4>
            <p class="program-desc">${_esc(e.specialization || '—')}</p>
            ${reasons[e.id] ? `<p class="form-hint"><i class="fas fa-lightbulb"></i> ${_esc(reasons[e.id])}</p>` : ''}
            <p class="program-meta">${_money(e.hourly_rate)}/hr · ${_rating(e.average_rating)} ★</p>
            <div class="panel-actions" style="margin-top:8px;display:flex;gap:6px">
              <button class="btn btn-primary btn-sm flex-1" data-action="book-expert"
                      data-id="${_esc(_safeId(e.id))}" data-name="${_esc(e.name)}">
                <i class="fas fa-calendar-plus"></i> Book</button>
              <button class="btn btn-secondary btn-sm" data-action="view-expert-profile"
                      data-id="${_esc(_safeId(e.id))}" aria-label="View profile">
                <i class="fas fa-eye"></i></button>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

/* ============================================================
   16. EXPERT MATCHING (shared scoring helpers used by the wizard)
   ============================================================ */

function _rankMatchesForNeed(experts, need, filters = {}) {
  const q = String(need || '').trim();
  return experts
    .map(e => {
      let score = _expertMatchScore(e, { query: q, ...filters });
      if (q && _expertMatchesQuery(e, q)) score += 20;
      if (filters.budget && _expertPriceForFilter(e) !== null) {
        if (_expertPriceForFilter(e) <= Number(filters.budget)) score += 10;
        else score -= 15;
      }
      if (filters.mode && filters.mode !== 'any' && (e.supported_modes || []).includes(filters.mode)) {
        score += 10;
      }
      if (filters.availability === 'today' && _expertIsAvailableToday(e)) score += 10;
      if (filters.availability === 'this_week' && _expertIsAvailableThisWeek(e)) score += 6;
      return { expert: e, score: Math.max(0, Math.min(100, score)) };
    })
    .sort((a, b) => b.score - a.score);
}

/* ============================================================
   17. SEARCH RESULTS
   ============================================================ */

function renderExpertResultsPanel(f = _getExpertFilters()) {
  const raw = S.experts || [];
  const filtered = _applyExpertFilters(raw, f);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / EXPERT_PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page), pages);
  const paged = filtered.slice((page - 1) * EXPERT_PAGE_SIZE, page * EXPERT_PAGE_SIZE);

  if (!total) {
    const empty = UserUI.empty({
      icon: 'fa-search',
      title: 'No experts found',
      desc: 'Try adjusting your filters or clearing the search.',
    });
    return empty + (raw.length ? `
      <div style="text-align:center;margin-top:12px">
        <button class="btn btn-secondary" data-action="clear-expert-filters">
          <i class="fas fa-eraser"></i> Clear filters</button>
      </div>
    ` : '');
  }

  return `
    <p class="program-meta" style="margin:8px 0">
      ${total} expert${total === 1 ? '' : 's'} found
      ${page > 1 ? `· page ${page} of ${pages}` : ''}
    </p>
    <section class="card-grid">
      ${paged.map(e => renderExpertCard(e, f)).join('')}
    </section>
    ${UserUI.pagination({
      page, pageSize: EXPERT_PAGE_SIZE, total, action: 'user-paginate', key: EXPERT_FILTER_KEY,
    })}
  `;
}

/** Placeholder cards shown while the main expert list is loading. */
function renderExpertSkeletons(count = 6) {
  const card = `
    <article class="expert-card expert-card-skeleton" aria-hidden="true">
      <div class="skeleton" style="width:72px;height:72px;border-radius:50%;background:var(--surface-2,#e2e8f0)"></div>
      <div class="skeleton" style="height:14px;width:70%;margin-top:10px;border-radius:6px;background:var(--surface-2,#e2e8f0)"></div>
      <div class="skeleton" style="height:12px;width:50%;margin-top:8px;border-radius:6px;background:var(--surface-2,#e2e8f0)"></div>
      <div class="skeleton" style="height:12px;width:90%;margin-top:8px;border-radius:6px;background:var(--surface-2,#e2e8f0)"></div>
      <div class="skeleton" style="height:12px;width:40%;margin-top:8px;border-radius:6px;background:var(--surface-2,#e2e8f0)"></div>
      <div class="skeleton" style="height:32px;width:100%;margin-top:14px;border-radius:8px;background:var(--surface-2,#e2e8f0)"></div>
    </article>`;
  return `<section class="card-grid">${Array.from({ length: count }).map(() => card).join('')}</section>`;
}

/* ============================================================
   18. EXPERT CARDS
   ============================================================ */

function renderExpertCard(e, f = _getExpertFilters()) {
  const id = _safeId(e.id);
  const shortlisted = (S.userShortlist || []).some(x => String(x.expert_id) === id);
  const comparing = (S.expertCompareList || []).includes(id);
  const priceLabel = e.starting_price != null
    ? `From ${_money(e.starting_price)}`
    : `${_money(e.hourly_rate)}/hr`;

  const nameHtml = _highlight(e.name, f.query);

  return `
    <article class="expert-card" data-expert-id="${_esc(id)}">
      <div style="position:relative">
        <img class="expert-avatar" src="${_esc(_expertAvatar(e))}" alt="" loading="lazy" />
        ${e.is_online ? '<span class="expert-online-dot" title="Online now"></span>' : ''}
        ${e.verified_badge
          ? '<span class="chip chip-green" style="position:absolute;top:6px;right:6px" title="Verified professional"><i class="fas fa-check-shield"></i></span>'
          : ''}
      </div>

      <h4 class="expert-name">
        ${nameHtml}
        ${e.professional_title ? `<span class="form-hint"> — ${_esc(e.professional_title)}</span>` : ''}
      </h4>

      <p class="expert-expertise">${_esc(e.specialization || '—')}</p>
      ${e.category ? `<span class="chip chip-neutral">${_esc(e.category)}</span>` : ''}

      <p class="expert-rating">
        <i class="fas fa-star" style="color:#f59e0b"></i>
        <span class="expert-rating-value">${_rating(e.average_rating)}</span>
        ${e.review_count ? `<span class="form-hint">· ${e.review_count} review${e.review_count === 1 ? '' : 's'}</span>` : ''}
        ${e.years_experience ? `<span class="form-hint">· ${e.years_experience}y exp</span>` : ''}
      </p>

      <p class="expert-rate">${_esc(priceLabel)}</p>

      ${e.is_online
        ? '<p class="form-hint" style="color:var(--accent)"><i class="fas fa-circle"></i> Online now</p>'
        : e.next_available_at
          ? `<p class="form-hint">Next: ${_esc(_date(e.next_available_at))}</p>`
          : ''}

      ${(e.supported_modes || []).length ? `
        <p class="form-hint">${(e.supported_modes || []).map(m =>
          `<span class="chip chip-neutral">${_esc(String(m).replace(/_/g, ' '))}</span>`).join(' ')}</p>
      ` : ''}

      <div class="expert-card-actions" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
        <button class="btn btn-primary btn-sm flex-1" data-action="book-expert"
                data-id="${_esc(id)}" data-name="${_esc(e.name)}">
          <i class="fas fa-calendar-plus"></i> Book</button>
        <button class="btn btn-secondary btn-sm" data-action="view-expert-profile"
                data-id="${_esc(id)}" aria-label="View profile">
          <i class="fas fa-eye"></i></button>
        <button class="btn btn-secondary btn-sm" data-action="view-expert-reviews"
                data-id="${_esc(id)}" aria-label="View reviews">
          <i class="fas fa-star"></i></button>
        <button class="btn btn-secondary btn-sm" data-action="toggle-expert-compare"
                data-id="${_esc(id)}"
                aria-label="${comparing ? 'Remove from comparison' : 'Add to comparison'}"
                aria-pressed="${comparing ? 'true' : 'false'}">
          <i class="fas fa-columns" style="color:${comparing ? 'var(--brand)' : 'inherit'}"></i></button>
        <button class="btn btn-secondary btn-sm" data-action="toggle-shortlist"
                data-id="${_esc(id)}"
                aria-label="${shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}"
                aria-pressed="${shortlisted ? 'true' : 'false'}">
          <i class="fas fa-bookmark" style="color:${shortlisted ? 'var(--warning)' : 'inherit'}"></i></button>
      </div>
    </article>
  `;
}

/* ============================================================
   19–24. EXPERT PROFILE (incl. qualifications, experience,
   services, pricing and availability)
   ============================================================ */

/* 20. Qualifications */
function renderExpertQualifications(profile) {
  const list = Array.isArray(profile.qualifications) ? profile.qualifications : [];
  if (!list.length) return '';

  return `
    <h3 class="panel-title" style="margin-top:20px">Qualifications</h3>
    <ul class="prereq-list">
      ${list.map(q => {
        const label = typeof q === 'string'
          ? q
          : (q && (q.title || q.name)) || '';
        const verified = typeof q === 'object' && q && (q.verified || q.verified_badge);
        return `<li>
          <i class="fas fa-graduation-cap"></i> ${_esc(label)}
          ${verified ? '<span class="chip chip-green">Verified</span>' : ''}
        </li>`;
      }).join('')}
    </ul>
    <p class="form-hint"><i class="fas fa-info-circle"></i>
      Qualifications marked verified by ExpertHub have been independently checked.</p>
  `;
}

/* 21. Professional experience */
function renderExpertExperience(profile) {
  const history = Array.isArray(profile.experience_history) ? profile.experience_history : [];
  if (!history.length) return '';

  return `
    <h3 class="panel-title" style="margin-top:20px">Professional Experience</h3>
    <ul class="list-stack">
      ${history.map(x => `
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">
              ${_esc((x && x.role) || '')}${x && x.organization ? ' — ' + _esc(x.organization) : ''}</span>
            <span class="list-row-sub">
              ${_esc((x && x.period) || '')}${x && x.summary ? ' · ' + _esc(x.summary) : ''}</span>
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

/* 22. Services catalogue */
function renderExpertServices(services) {
  if (!Array.isArray(services) || !services.length) return '';

  return `
    <h3 class="panel-title" style="margin-top:20px">Services</h3>
    <ul class="list-stack">
      ${services.map(s => `
        <li class="list-row">
          <div class="list-row-main">
            <span class="list-row-title">${_esc((s && s.name) || 'Session')}</span>
            <span class="list-row-sub">
              ${_esc(_display(s && s.duration_minutes, '60'))} min ·
              ${_esc(((s && s.modes) || []).join(', ') || 'video')}</span>
          </div>
          <span class="chip chip-blue">${_money(s && s.price)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

/* 23. Pricing management */
function renderExpertPricingSummary(profile) {
  const rate = _numOrNull(profile.hourly_rate);
  const starting = _numOrNull(profile.starting_price);
  if (rate === null && starting === null) return '';

  return `
    <div style="text-align:right">
      ${rate !== null ? `<p><strong style="font-size:1.25rem">${_money(rate)}</strong><span class="form-hint">/hr</span></p>` : ''}
      ${starting !== null ? `<p class="form-hint">From ${_money(starting)}</p>` : ''}
    </div>
  `;
}

/* 24. Availability display */
function renderExpertAvailability(availability) {
  const slots = Array.isArray(availability) ? availability.slice(0, 12) : [];
  if (!slots.length) return '';

  const tz = (typeof currentUser !== 'undefined' && currentUser && currentUser.timezone) || 'UTC';

  return `
    <h3 class="panel-title" style="margin-top:20px">Availability</h3>
    <p class="form-hint">Showing times in <strong>${_esc(tz)}</strong>.</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
      ${slots.map(a => {
        const start = a && (a.start_at || a.start);
        let label = '—';
        try {
          label = (UserHelpers && typeof UserHelpers.fmtInTz === 'function')
            ? UserHelpers.fmtInTz(start, tz)
            : _date(start);
        } catch { label = _date(start); }
        return `<span class="chip chip-neutral">${_esc(label)}</span>`;
      }).join('')}
    </div>
  `;
}

/* 27. Reviews and ratings (shared list renderer) */
function renderExpertReviewList(reviews, expertId, { limit = 3, showReport = false } = {}) {
  const list = Array.isArray(reviews) ? reviews.slice(0, limit) : [];
  if (!list.length) return '<li class="empty-row">No reviews yet.</li>';

  return list.map(r => {
    const rating = Math.max(0, Math.min(5, Number((r && r.rating) || 0)));
    return `
      <li class="review-item">
        <div class="review-header">
          <strong>${_esc((r && r.reviewer_name) || 'Client')}</strong>
          ${r && r.verified_consultation ? '<span class="chip chip-green">Verified</span>' : ''}
          <span class="review-stars">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span>
          ${r && r.created_at ? `<span class="form-hint">${_esc(_relativeTime(r.created_at))}</span>` : ''}
        </div>
        <p class="review-comment">${_esc((r && r.comment) || '')}</p>
        ${r && r.expert_response
          ? `<p class="form-hint"><strong>Expert response:</strong> ${_esc(r.expert_response)}</p>`
          : ''}
        ${showReport && r && r.id ? `
          <div style="margin-top:4px">
            <button class="btn-ghost btn-xs" data-action="report-expert-review"
                    data-expert="${_esc(_safeId(expertId))}" data-review="${_esc(_safeId(r.id))}">
              <i class="fas fa-flag"></i> Report</button>
          </div>
        ` : ''}
      </li>
    `;
  }).join('');
}

/* ============================================================
   25. SHORTLIST MANAGEMENT
   ============================================================ */

function _shortlistIds() {
  return new Set((S.userShortlist || []).map(x => String(x.expert_id)));
}

function _isShortlisted(id) {
  const sid = _safeId(id);
  return !!sid && _shortlistIds().has(sid);
}

async function _toggleShortlist(id) {
  const sid = _safeIdOrNull(id);
  if (!sid) {
    showToast('Invalid expert reference', 'error');
    return;
  }
  const data = await apiCall('/api/user/shortlist/toggle', 'POST', { expert_id: Number(sid) });
  if (data && Array.isArray(data.items)) {
    S.userShortlist = data.items;
  } else {
    const list = await apiCall('/api/user/shortlist').catch(() => ({ items: [] }));
    S.userShortlist = (list && list.items) || [];
  }
}

/* ============================================================
   26. EXPERT COMPARISON
   ============================================================ */

function _comparisonFields() {
  return [
    { key: 'professional_title', label: 'Title', fmt: v => _display(v) },
    { key: 'specialization',     label: 'Specialization', fmt: v => _display(v) },
    { key: 'category',           label: 'Category', fmt: v => _display(v) },
    { key: 'years_experience',   label: 'Experience', fmt: v => (v ? `${v} years` : '—') },
    { key: 'average_rating',     label: 'Rating', fmt: v => `${_rating(v)} ★` },
    { key: 'review_count',       label: 'Reviews', fmt: v => _display(v, '0') },
    { key: 'hourly_rate',        label: 'Price / hr', fmt: v => _money(v) },
    { key: 'starting_price',     label: 'Starting price', fmt: v => (v != null ? _money(v) : '—') },
    { key: 'response_time_minutes', label: 'Response', fmt: v => (v != null ? `${v} min` : '—') },
    { key: 'supported_modes',    label: 'Methods', fmt: v => ((v || []).join(', ') || '—') },
    { key: 'languages',          label: 'Languages', fmt: v => ((v || []).join(', ') || '—') },
    { key: 'location',           label: 'Location', fmt: v => _display(v) },
    { key: 'services',           label: 'Services', fmt: v => ((v || []).map(s => (s && s.name) || '').filter(Boolean).join(', ') || '—') },
    { key: 'qualifications',     label: 'Qualifications', fmt: v => ((v || []).map(q => (typeof q === 'string' ? q : (q && (q.title || q.name)) || '')).filter(Boolean).join(', ') || '—') },
    { key: 'verified_badge',     label: 'Verified', fmt: v => (v ? '✓' : '—') },
    { key: 'is_online',          label: 'Online now', fmt: v => (v ? 'Yes' : 'No') },
  ];
}

/* ============================================================
   27–29. REVIEWS, SUBMISSION AND REPORTING
   ============================================================ */

/* ============================================================
   30–32. BOOKING INTEGRATION, INSTANT CONSULTATION, PREPARATION
   ============================================================ */

/* ============================================================
   33. PAGINATION (handled through the shared `user-paginate` action)
   ============================================================ */

/* ============================================================
   34. MARKETPLACE NOTIFICATIONS
   ============================================================ */

function renderMarketplaceNotifications() {
  const parts = [];

  if (S.expertMarketplaceState === 'error' && (S.experts || []).length) {
    parts.push(`
      <div class="panel" style="border-left:4px solid var(--warning,#f59e0b)">
        <p class="form-hint" style="margin:0">
          <i class="fas fa-exclamation-triangle"></i>
          We couldn't refresh the expert list — showing the last known results.
          ${S.expertLoadError ? `<br /><span>${_esc(S.expertLoadError)}</span>` : ''}
        </p>
        <div style="margin-top:8px">
          <button class="btn btn-secondary btn-sm" data-action="reload-experts">
            <i class="fas fa-rotate"></i> Retry</button>
        </div>
      </div>
    `);
  }

  if (S.expertMarketplaceState === 'ok' && S.expertRecommendedState === 'error') {
    parts.push(`
      <p class="form-hint"><i class="fas fa-info-circle"></i>
        Personalized recommendations are temporarily unavailable.</p>
    `);
  }

  if (!parts.length) return '';
  return `<div class="marketplace-notifications" style="display:grid;gap:8px;margin-bottom:10px">
    ${parts.join('')}
  </div>`;
}

/* ============================================================
   FILTER BAR
   ============================================================ */

function renderExpertFilters(f) {
  const opts = S.expertFilterOptions || {};
  const activeCount = _activeExpertFilterCount(f);

  return `
    <section class="panel expert-filter-panel">
      <div class="expert-search-bar">
        <div class="expert-search-wrap" style="position:relative;flex:1;max-width:420px">
          <input type="search" id="expert-search" class="form-input"
                 placeholder="Search by name, specialization, skill or service…"
                 value="${_esc(f.query)}" autocomplete="off"
                 aria-label="Search experts" aria-autocomplete="list"
                 aria-controls="expert-suggestions" />
          <div id="expert-suggestions" class="expert-suggestions" role="listbox"
               aria-label="Search suggestions" style="display:none"></div>
          <div id="expert-history" class="expert-suggestions" role="listbox"
               aria-label="Recent searches" style="display:none"></div>
        </div>
        <button class="btn btn-ghost btn-sm" data-action="clear-expert-filters"
                title="Clear all filters">
          <i class="fas fa-eraser"></i> Clear ${activeCount ? `(${activeCount})` : ''}
        </button>
      </div>

      <div class="expert-filters" style="margin-top:10px">
        <select id="expert-category" class="form-select" aria-label="Category">
          <option value="">All categories</option>
          ${(opts.categories || []).map(c =>
            `<option value="${_esc(c)}" ${f.category === c ? 'selected' : ''}>${_esc(c)}</option>`).join('')}
        </select>

        <select id="expert-specialization" class="form-select" aria-label="Specialization">
          <option value="">All specializations</option>
          ${(opts.specializations || []).map(s =>
            `<option value="${_esc(s)}" ${f.specialization === s ? 'selected' : ''}>${_esc(s)}</option>`).join('')}
        </select>

        <select id="expert-min-rating" class="form-select" aria-label="Minimum rating">
          <option value="">Any rating</option>
          ${[4.5, 4.0, 3.5, 3.0].map(r =>
            `<option value="${r}" ${String(f.minRating) === String(r) ? 'selected' : ''}>${r}+ ★</option>`).join('')}
        </select>

        <select id="expert-min-exp" class="form-select" aria-label="Minimum experience">
          <option value="">Any experience</option>
          ${[1, 3, 5, 10].map(y =>
            `<option value="${y}" ${String(f.minExperience) === String(y) ? 'selected' : ''}>${y}+ years</option>`).join('')}
        </select>

        <select id="expert-min-reviews" class="form-select" aria-label="Minimum reviews">
          <option value="">Any reviews</option>
          ${[1, 5, 10, 25].map(n =>
            `<option value="${n}" ${String(f.minReviews) === String(n) ? 'selected' : ''}>${n}+ reviews</option>`).join('')}
        </select>

        <select id="expert-language" class="form-select" aria-label="Language">
          <option value="">Any language</option>
          ${(opts.languages || []).map(l =>
            `<option value="${_esc(l)}" ${f.language === l ? 'selected' : ''}>${_esc(l)}</option>`).join('')}
        </select>

        <select id="expert-mode" class="form-select" aria-label="Consultation mode">
          <option value="">Any method</option>
          <option value="video"     ${f.mode === 'video' ? 'selected' : ''}>Video</option>
          <option value="audio"     ${f.mode === 'audio' ? 'selected' : ''}>Audio</option>
          <option value="chat"      ${f.mode === 'chat' ? 'selected' : ''}>Chat</option>
          <option value="in_person" ${f.mode === 'in_person' ? 'selected' : ''}>In-person</option>
        </select>

        <select id="expert-availability" class="form-select" aria-label="Availability">
          <option value="">Any availability</option>
          <option value="today" ${f.availability === 'today' ? 'selected' : ''}>Available today</option>
          <option value="week"  ${f.availability === 'week' ? 'selected' : ''}>This week</option>
        </select>

        <input type="number" id="expert-budget-min" class="form-input" placeholder="Min $/hr"
               min="0" value="${_esc(f.budgetMin)}" style="max-width:110px"
               aria-label="Minimum hourly rate" />
        <input type="number" id="expert-budget-max" class="form-input" placeholder="Max $/hr"
               min="0" value="${_esc(f.budgetMax)}" style="max-width:110px"
               aria-label="Maximum hourly rate" />

        <select id="expert-sort" class="form-select" aria-label="Sort">
          <option value="rating"     ${f.sortBy === 'rating' ? 'selected' : ''}>Top rated</option>
          <option value="best_match" ${f.sortBy === 'best_match' ? 'selected' : ''}>Best match</option>
          <option value="reviews"    ${f.sortBy === 'reviews' ? 'selected' : ''}>Most reviewed</option>
          <option value="price_asc"  ${f.sortBy === 'price_asc' ? 'selected' : ''}>Price: low → high</option>
          <option value="price_desc" ${f.sortBy === 'price_desc' ? 'selected' : ''}>Price: high → low</option>
          <option value="response"   ${f.sortBy === 'response' ? 'selected' : ''}>Fastest response</option>
          <option value="experience" ${f.sortBy === 'experience' ? 'selected' : ''}>Most experienced</option>
          <option value="available"  ${f.sortBy === 'available' ? 'selected' : ''}>Earliest available</option>
          <option value="recent"     ${f.sortBy === 'recent' ? 'selected' : ''}>Recently active</option>
        </select>

        <label class="checkbox-row">
          <input type="checkbox" id="expert-instant" ${f.instantOnly ? 'checked' : ''} /> Online now
        </label>
        <label class="checkbox-row">
          <input type="checkbox" id="expert-verified" ${f.verifiedOnly ? 'checked' : ''} /> Verified only
        </label>
      </div>

      ${_hasActiveExpertFilters(f) ? `
        <div class="active-filters" style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">
          ${f.query ? `<span class="chip chip-blue">Search: ${_esc(f.query)}</span>` : ''}
          ${f.category ? `<span class="chip chip-blue">Category: ${_esc(f.category)}</span>` : ''}
          ${f.specialization ? `<span class="chip chip-blue">Spec: ${_esc(f.specialization)}</span>` : ''}
          ${f.minRating !== '' ? `<span class="chip chip-blue">${_esc(f.minRating)}+ ★</span>` : ''}
          ${f.minExperience !== '' ? `<span class="chip chip-blue">${_esc(f.minExperience)}+ yrs</span>` : ''}
          ${f.minReviews !== '' ? `<span class="chip chip-blue">${_esc(f.minReviews)}+ reviews</span>` : ''}
          ${f.mode ? `<span class="chip chip-blue">${_esc(f.mode)}</span>` : ''}
          ${f.language ? `<span class="chip chip-blue">${_esc(f.language)}</span>` : ''}
          ${f.availability === 'today' ? '<span class="chip chip-green">Today</span>' : ''}
          ${f.availability === 'week' ? '<span class="chip chip-green">This week</span>' : ''}
          ${f.instantOnly ? '<span class="chip chip-green">Online</span>' : ''}
          ${f.verifiedOnly ? '<span class="chip chip-green">Verified</span>' : ''}
          ${(f.budgetMin !== '' || f.budgetMax !== '')
            ? `<span class="chip chip-blue">$${f.budgetMin !== '' ? _esc(f.budgetMin) : 0}–$${f.budgetMax !== '' ? _esc(f.budgetMax) : '∞'}</span>`
            : ''}
        </div>
      ` : ''}
    </section>
  `;
}

/* ============================================================
   MAIN RENDERER
   ============================================================ */

function renderUserExperts() {
  // Kick off a load in the background on first visit or when the cache is stale.
  if (S.expertMarketplaceState === 'idle') {
    _loadExpertsMarketplace()
      .then(() => rerenderRoleContent())
      .catch(() => {});
  }

  const f = _getExpertFilters();
  const hasExperts = (S.experts || []).length > 0;
  const isLoadingFirst = S.expertMarketplaceState === 'loading' && !hasExperts;
  const showResults =
    S.expertMarketplaceState === 'ok' ||
    S.expertMarketplaceState === 'empty' ||
    (S.expertMarketplaceState === 'error' && hasExperts);

  return UserUI.page({
    title: 'Find Experts',
    breadcrumb: 'Experts',
    actions: `
      <button class="btn btn-secondary" data-action="open-expert-comparison">
        <i class="fas fa-columns"></i> Compare (${(S.expertCompareList || []).length}/${EXPERT_COMPARE_MAX})</button>
      <button class="btn btn-secondary" data-action="open-shortlist-panel">
        <i class="fas fa-bookmark"></i> Shortlist (${(S.userShortlist || []).length})</button>
      <button class="btn btn-secondary" data-action="find-expert-wizard">
        <i class="fas fa-magic"></i> Match Me</button>
      <button class="btn btn-primary" data-action="instant-consultation">
        <i class="fas fa-bolt"></i> Talk Now</button>
    `,
    content: `
      ${renderMarketplaceOverview(f)}
      ${renderMarketplaceNotifications()}

      ${isLoadingFirst ? renderExpertSkeletons(6) : ''}

      ${S.expertMarketplaceState === 'error' && !hasExperts ? UserUI.errorState({
        title: 'Could not load experts',
        message: S.expertLoadError || 'Please check your connection and try again.',
        retryAction: 'reload-experts',
        retryLabel: 'Retry',
      }) : ''}

      ${showResults ? `
        ${renderExpertFilters(f)}
        ${renderExpertRecommendationsStrip()}
        ${renderExpertFeaturedStrip()}
        <div id="expert-results-panel">${renderExpertResultsPanel(f)}</div>
      ` : ''}

      ${S.expertMarketplaceState === 'empty' && !hasExperts ? UserUI.empty({
        icon: 'fa-user-slash',
        title: 'No experts are listed yet',
        desc: 'New professionals are being onboarded. Please check back soon.',
      }) : ''}
    `,
  });
}

/* ============================================================
   SUGGESTION + HISTORY DROPDOWNS
   ============================================================ */

function _positionDropdown(host) {
  host.style.display = 'block';
  host.style.position = 'absolute';
  host.style.top = '100%';
  host.style.left = '0';
  host.style.right = '0';
  host.style.background = 'var(--surface, #fff)';
  host.style.border = '1px solid var(--border, #e2e8f0)';
  host.style.borderRadius = '8px';
  host.style.zIndex = '9999';
  host.style.maxHeight = '320px';
  host.style.overflowY = 'auto';
}

function _hideSuggestionDropdowns() {
  ['expert-suggestions', 'expert-history'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  });
  __suggestionIndex = -1;
  __suggestionItems = [];
}

function _paintSuggestionSelection() {
  const host = document.getElementById('expert-suggestions');
  if (!host) return;
  host.querySelectorAll('[data-suggestion-index]').forEach(el => {
    const i = Number(el.dataset.suggestionIndex);
    el.style.background = i === __suggestionIndex ? 'var(--surface-2, #f1f5f9)' : 'transparent';
  });
}

function _renderSuggestions(query) {
  const host = document.getElementById('expert-suggestions');
  if (!host) return;

  const items = _buildSuggestions(query);
  __suggestionItems = items;
  __suggestionIndex = -1;

  if (!items.length) {
    host.style.display = 'none';
    host.innerHTML = '';
    return;
  }

  host.innerHTML = items.map((s, i) => `
    <div class="expert-suggestion-item" role="option" tabindex="-1"
         id="expert-suggestion-${i}"
         data-suggestion="${_esc(s.text)}"
         data-suggestion-index="${i}"
         style="padding:8px 10px;cursor:pointer;border-bottom:1px solid var(--border,#e2e8f0)">
      <i class="fas ${_suggestionIcon(s.type)}"></i>
      ${_highlight(s.text, query)}
      <span class="form-hint" style="float:right">${_esc(s.type)}</span>
    </div>
  `).join('');

  _positionDropdown(host);

  host.querySelectorAll('[data-suggestion]').forEach(el => {
    el.onclick = () => {
      const value = el.dataset.suggestion;
      _setExpertFilter('q', value);
      _pushSearchHistory(value);
      _hideSuggestionDropdowns();
      rerenderRoleContent();
    };
  });
}

function _renderHistoryDropdown() {
  const host = document.getElementById('expert-history');
  if (!host) return;

  const history = _readSearchHistory();
  if (!history.length) {
    host.style.display = 'none';
    host.innerHTML = '';
    return;
  }

  host.innerHTML = `
    <div style="padding:8px 10px;font-size:.75rem;color:var(--text-muted,#64748b);border-bottom:1px solid var(--border,#e2e8f0)">
      Recent searches
      <button class="btn-ghost btn-xs" style="float:right" data-history-clear>Clear all</button>
    </div>
    ${history.map(h => `
      <div class="expert-suggestion-item" role="option" tabindex="-1"
           data-history="${_esc(h.term)}"
           style="padding:8px 10px;cursor:pointer;border-bottom:1px solid var(--border,#e2e8f0);display:flex;align-items:center;gap:8px">
        <i class="fas fa-history"></i>
        <span style="flex:1">${_esc(h.term)}</span>
        <button class="btn-ghost btn-xs" data-history-remove="${_esc(h.term)}"
                aria-label="Remove ${_esc(h.term)} from history">
          <i class="fas fa-times"></i></button>
      </div>
    `).join('')}
  `;

  _positionDropdown(host);

  host.querySelectorAll('[data-history]').forEach(el => {
    el.onclick = (ev) => {
      if (ev.target.closest('[data-history-remove]')) return;
      _setExpertFilter('q', el.dataset.history);
      _pushSearchHistory(el.dataset.history);
      _hideSuggestionDropdowns();
      rerenderRoleContent();
    };
  });

  host.querySelectorAll('[data-history-remove]').forEach(btn => {
    btn.onclick = (ev) => {
      ev.stopPropagation();
      _removeSearchHistory(btn.dataset.historyRemove);
      _renderHistoryDropdown();
    };
  });

  const clearBtn = host.querySelector('[data-history-clear]');
  if (clearBtn) {
    clearBtn.onclick = (ev) => {
      ev.stopPropagation();
      _clearSearchHistory();
      host.style.display = 'none';
      host.innerHTML = '';
    };
  }
}

function _moveSuggestion(delta) {
  if (!__suggestionItems.length) return;
  const max = __suggestionItems.length - 1;
  __suggestionIndex = Math.max(0, Math.min(max, __suggestionIndex + delta));
  _paintSuggestionSelection();
}

function _commitSuggestionSelection() {
  if (__suggestionIndex < 0 || !__suggestionItems[__suggestionIndex]) return false;
  const value = __suggestionItems[__suggestionIndex].text;
  _setExpertFilter('q', value);
  _pushSearchHistory(value);
  _hideSuggestionDropdowns();
  rerenderRoleContent();
  return true;
}

/* ============================================================
   35. ACTION REGISTRATION
   ============================================================ */

/* ---------- Filters, loading, pagination ---------- */

window.ExpertHubUser.registerAction('clear-expert-filters', () => {
  _clearExpertFilters();
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('reload-experts', async () => {
  S.expertMarketplaceState = 'idle';
  _invalidateExpertCache();
  try {
    await _loadExpertsMarketplace({ force: true });
  } catch { /* handled through state */ }
  rerenderRoleContent();
  showToast(
    S.expertMarketplaceState === 'error' ? 'Still unable to load experts' : 'Experts loaded',
    S.expertMarketplaceState === 'error' ? 'warning' : 'success'
  );
});

window.ExpertHubUser.registerAction('expert-quick-filter', (_, el) => {
  const key = el && el.dataset ? el.dataset.key : '';
  if (!key) return;
  const raw = el.dataset.value;
  const value = raw === 'true' ? true : raw === 'false' ? false : raw;
  const current = UserFilters.get(EXPERT_FILTER_KEY, key, '');

  let next;
  if (typeof value === 'boolean') next = !current;
  else next = String(current) === String(value) ? '' : value;

  _setExpertFilter(key, next);
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('user-paginate', (_, el) => {
  const page = Number((el && el.dataset && el.dataset.page) || 1);
  const key = (el && el.dataset && el.dataset.key) || EXPERT_FILTER_KEY;
  UserFilters.set(key, 'page', Number.isFinite(page) && page > 0 ? page : 1);
  rerenderRoleContent();
});

/* ---------- Shortlist ---------- */

window.ExpertHubUser.registerAction('toggle-shortlist', async (id) => {
  const sid = _safeIdOrNull(id);
  if (!sid) {
    showToast('Invalid expert reference', 'error');
    return;
  }
  try {
    await _toggleShortlist(sid);
    rerenderRoleContent();
    showToast('Shortlist updated', 'success');
  } catch (e) {
    showToast((e && e.message) || 'Could not update shortlist', 'error');
  }
});

window.ExpertHubUser.registerAction('open-shortlist-panel', () => {
  const items = S.userShortlist || [];

  if (!items.length) {
    return openModal({
      title: 'Saved Experts',
      body: `<p class="empty-row">You haven't shortlisted any experts yet.</p>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  }

  const savedIds = items.map(s => String(s.expert_id));
  const available = (S.experts || []).filter(e => savedIds.includes(e.id));
  const unavailableIds = savedIds.filter(id => !available.some(e => e.id === id));

  // Present saved experts by rating, highest first.
  available.sort((a, b) => _numOrZero(b.average_rating) - _numOrZero(a.average_rating));

  openModal({
    title: `Saved Experts (${available.length})`,
    className: 'modal-lg',
    body: `
      ${available.length ? available.map(e => `
        <div class="list-row">
          <div class="list-row-main" style="display:flex;gap:10px;align-items:center">
            <img class="user-avatar" src="${_esc(_expertAvatar(e))}" alt="" loading="lazy" />
            <div>
              <span class="list-row-title">
                ${_esc(e.name)} ${e.verified_badge ? '<span class="chip chip-green">✓</span>' : ''}
                ${e.is_online ? '<span class="chip chip-green">Online</span>' : ''}
              </span>
              <span class="list-row-sub">
                ${_esc(e.specialization || '—')} · ${_money(e.hourly_rate)}/hr · ${_rating(e.average_rating)} ★
              </span>
            </div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-primary btn-xs" data-action="book-expert"
                    data-id="${_esc(_safeId(e.id))}" data-name="${_esc(e.name)}" onclick="closeModal()">
              <i class="fas fa-calendar-plus"></i></button>
            <button class="btn btn-secondary btn-xs" data-action="view-expert-profile"
                    data-id="${_esc(_safeId(e.id))}" onclick="closeModal()">
              <i class="fas fa-eye"></i></button>
            <button class="btn btn-danger btn-xs" data-action="toggle-shortlist"
                    data-id="${_esc(_safeId(e.id))}">
              <i class="fas fa-times"></i></button>
          </div>
        </div>
      `).join('') : '<p class="empty-row">Saved experts are no longer available.</p>'}

      ${unavailableIds.length ? `
        <p class="form-hint" style="margin-top:12px">
          <i class="fas fa-info-circle"></i>
          ${unavailableIds.length} saved expert${unavailableIds.length === 1 ? '' : 's'}
          ${unavailableIds.length === 1 ? 'is' : 'are'} currently unavailable or inactive.
        </p>
        ${unavailableIds.map(id => `
          <div class="list-row" style="opacity:.6">
            <div class="list-row-main">
              <span class="list-row-title">Expert #${_esc(_safeId(id))}</span>
              <span class="list-row-sub">No longer listed</span>
            </div>
            <button class="btn btn-danger btn-xs" data-action="toggle-shortlist"
                    data-id="${_esc(_safeId(id))}">
              <i class="fas fa-times"></i></button>
          </div>
        `).join('')}
      ` : ''}
    `,
    footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
  });
});

/* ---------- Comparison ---------- */

window.ExpertHubUser.registerAction('toggle-expert-compare', (id) => {
  const sid = _safeId(id);
  if (!sid) {
    showToast('Invalid expert reference', 'error');
    return;
  }

  const list = S.expertCompareList || [];

  if (list.includes(sid)) {
    S.expertCompareList = list.filter(x => x !== sid);
    showToast('Removed from comparison', 'info');
  } else {
    if (list.length >= EXPERT_COMPARE_MAX) {
      showToast(`You can compare up to ${EXPERT_COMPARE_MAX} experts`, 'warning');
      return;
    }
    S.expertCompareList = [...list, sid];
    showToast(`Added to comparison (${S.expertCompareList.length}/${EXPERT_COMPARE_MAX})`, 'success');
  }
  rerenderRoleContent();
});

window.ExpertHubUser.registerAction('open-expert-comparison', () => {
  const ids = S.expertCompareList || [];
  if (!ids.length) {
    showToast('Select experts to compare first', 'info');
    return;
  }

  const experts = ids.map(id => _findExpertAnywhere(id)).filter(Boolean);
  if (!experts.length) {
    showToast('Selected experts are no longer available', 'warning');
    return;
  }

  const fields = _comparisonFields();

  openModal({
    title: 'Compare Experts',
    className: 'modal-lg',
    body: `
      <div class="compare-table-wrap" style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th></th>
              ${experts.map(e => `
                <th style="text-align:center">
                  <img class="user-avatar" src="${_esc(_expertAvatar(e))}" alt=""
                       style="display:block;margin:0 auto 6px" loading="lazy" />
                  <div>${_esc(e.name)}</div>
                  <button class="btn btn-danger btn-xs" data-action="toggle-expert-compare"
                          data-id="${_esc(_safeId(e.id))}" style="margin-top:6px" aria-label="Remove">
                    <i class="fas fa-times"></i> Remove</button>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${fields.map(field => `
              <tr>
                <td><strong>${_esc(field.label)}</strong></td>
                ${experts.map(e => `
                  <td style="text-align:center">${_esc(field.fmt ? field.fmt(e[field.key]) : _display(e[field.key]))}</td>
                `).join('')}
              </tr>
            `).join('')}
            <tr>
              <td></td>
              ${experts.map(e => `
                <td style="text-align:center">
                  <button class="btn btn-primary btn-sm" data-action="book-expert"
                          data-id="${_esc(_safeId(e.id))}" data-name="${_esc(e.name)}" onclick="closeModal()">
                    <i class="fas fa-calendar-plus"></i> Book</button>
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-action="clear-expert-comparison">Clear all</button>
      <button class="btn btn-secondary" data-close-modal>Close</button>
    `,
  });
});

window.ExpertHubUser.registerAction('clear-expert-comparison', () => {
  S.expertCompareList = [];
  closeModal();
  rerenderRoleContent();
  showToast('Comparison cleared', 'info');
});

/* ---------- Profile ---------- */

window.ExpertHubUser.registerAction('view-expert-profile', async (id) => {
  const sid = _safeIdOrNull(id);
  if (!sid) {
    showToast('Invalid expert reference', 'error');
    return;
  }

  const cached = _findExpertAnywhere(sid) || {};
  let detail = null;
  try {
    detail = await apiCall(`/api/user/experts/${encodeURIComponent(sid)}`).catch(() => null);
  } catch { /* profile falls back to the cached record */ }

  const profile = (detail && detail.expert) || cached;
  const services = (detail && detail.services) || profile.services || [];
  const reviews = (detail && detail.reviews) || (S.expertReviewsByExpert[sid] || []);
  const availability = (detail && detail.availability) || [];
  const shortlisted = _isShortlisted(sid);

  openModal({
    title: profile.name || 'Expert Profile',
    className: 'modal-lg',
    body: `
      <div class="profile-header" style="display:flex;gap:14px;align-items:flex-start">
        <img class="profile-avatar" src="${_esc(_expertAvatar(profile))}" alt=""
             style="width:80px;height:80px;border-radius:50%" loading="lazy" />
        <div style="flex:1">
          <h2 class="profile-name" style="margin:0">
            ${_esc(profile.name || '')}
            ${profile.verified_badge
              ? '<span class="chip chip-green"><i class="fas fa-check-shield"></i> Verified</span>' : ''}
            ${profile.is_online
              ? '<span class="chip chip-green"><i class="fas fa-circle"></i> Online</span>' : ''}
          </h2>
          ${profile.professional_title
            ? `<p class="form-hint">${_esc(profile.professional_title)}</p>` : ''}
          <p class="profile-email">${_esc(profile.specialization || '')}</p>
          ${profile.category ? `<span class="chip chip-blue">${_esc(profile.category)}</span>` : ''}
        </div>
        ${renderExpertPricingSummary(profile)}
      </div>

      ${profile.bio ? `
        <h3 class="panel-title" style="margin-top:20px">About</h3>
        <p>${_esc(profile.bio)}</p>
      ` : ''}

      <div class="expert-detail-stats" style="display:flex;gap:24px;margin-top:12px;flex-wrap:wrap">
        <div><strong>${_rating(profile.average_rating)}</strong><span class="form-hint"> rating</span></div>
        <div><strong>${_display(profile.review_count, '0')}</strong><span class="form-hint"> reviews</span></div>
        <div><strong>${_display(profile.years_experience, '0')}</strong><span class="form-hint"> years experience</span></div>
        <div><strong>${profile.response_time_minutes ? _esc(profile.response_time_minutes) + 'm' : '—'}</strong><span class="form-hint"> response</span></div>
      </div>

      ${(profile.languages || []).length
        ? `<p style="margin-top:12px"><strong>Languages:</strong> ${(profile.languages || []).map(_esc).join(', ')}</p>`
        : ''}
      ${profile.location ? `<p><strong>Location:</strong> ${_esc(profile.location)}</p>` : ''}

      ${renderExpertQualifications(profile)}
      ${renderExpertExperience(profile)}
      ${renderExpertServices(services)}
      ${renderExpertAvailability(availability)}

      ${reviews.length ? `
        <h3 class="panel-title" style="margin-top:20px">Recent Reviews</h3>
        <ul class="reviews-list">
          ${renderExpertReviewList(reviews, sid, { limit: 3 })}
        </ul>
        <button class="btn btn-secondary btn-sm" data-action="view-expert-reviews"
                data-id="${_esc(sid)}" onclick="closeModal()">
          View all reviews</button>
      ` : ''}
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Close</button>
      <button class="btn btn-secondary" data-action="toggle-shortlist" data-id="${_esc(sid)}">
        <i class="fas fa-bookmark"></i> ${shortlisted ? 'Remove from shortlist' : 'Shortlist'}</button>
      <button class="btn btn-primary" data-action="book-expert"
              data-id="${_esc(sid)}" data-name="${_esc(profile.name || '')}"
              onclick="closeModal()">
        <i class="fas fa-calendar-plus"></i> Book Consultation</button>
    `,
  });
});

/* ---------- Reviews ---------- */

window.ExpertHubUser.registerAction('view-expert-reviews', async (id) => {
  const sid = _safeIdOrNull(id);
  if (!sid) {
    showToast('Invalid expert reference', 'error');
    return;
  }

  try {
    showLoading(true);
    const data = await apiCall(`/api/user/experts/${encodeURIComponent(sid)}/reviews`)
      .catch(() => ({ reviews: [], summary: null }));
    closeModal();

    const reviews = (data && data.reviews) || [];
    const summary = (data && data.summary) || {};
    const breakdown = summary.breakdown || {};
    const canReview = !!summary.can_review;
    const totalReviews = Number(summary.review_count || reviews.length || 0);
    const expertName = (_findExpertAnywhere(sid) || {}).name || 'Expert';

    openModal({
      title: `Reviews — ${expertName}`,
      className: 'modal-lg',
      body: `
        <div class="reviews-summary" style="display:flex;gap:16px;align-items:center;margin-bottom:12px">
          <div style="text-align:center">
            <p style="font-size:2rem;margin:0">${_rating(summary.average_rating)}</p>
            <p class="form-hint">${totalReviews} reviews</p>
          </div>
          <div style="flex:1">
            ${[5, 4, 3, 2, 1].map(n => {
              const count = Number(breakdown[n] || 0);
              const pct = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
              return `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                  <span style="width:30px">${n}★</span>
                  <div class="progress-bar" style="flex:1"><span style="width:${pct}%"></span></div>
                  <span class="form-hint" style="width:40px;text-align:right">${count}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        ${canReview ? `
          <button class="btn btn-primary btn-sm" data-action="submit-expert-review" data-id="${_esc(sid)}">
            <i class="fas fa-star"></i> Write a review</button>
        ` : `<p class="form-hint"><i class="fas fa-info-circle"></i>
              Only clients with a completed consultation can review.</p>`}

        <ul class="reviews-list" style="margin-top:12px">
          ${renderExpertReviewList(reviews, sid, { limit: reviews.length, showReport: true })}
        </ul>
      `,
      footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
    });
  } catch (e) {
    showToast((e && e.message) || 'Could not load reviews', 'error');
  } finally {
    showLoading(false);
  }
});

window.ExpertHubUser.registerAction('submit-expert-review', (expertId) => {
  const sid = _safeIdOrNull(expertId);
  if (!sid) {
    showToast('Invalid expert reference', 'error');
    return;
  }

  openModal({
    title: 'Write Review',
    body: `
      <label class="form-group">
        <span class="form-label">Rating</span>
        <select id="rvRating" class="form-select">
          ${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${n} of 5</option>`).join('')}
        </select>
      </label>
      <label class="form-group">
        <span class="form-label">Your review</span>
        <textarea id="rvComment" class="form-textarea" rows="4" maxlength="2000" required></textarea>
      </label>
      <p class="form-hint"><i class="fas fa-info-circle"></i> Reviews should be honest and specific.</p>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="rvSave" class="btn btn-primary">Submit</button>
    `,
  });

  const saveBtn = document.getElementById('rvSave');
  if (!saveBtn) return;

  saveBtn.onclick = async () => {
    const comment = ((document.getElementById('rvComment') || {}).value || '').trim();
    if (!comment) {
      showToast('Please write a review', 'error');
      return;
    }
    const ratingEl = document.getElementById('rvRating');
    const rating = Number((ratingEl && ratingEl.value) || 0);

    if (saveBtn.disabled) return;
    saveBtn.disabled = true;

    try {
      await apiCall('/api/user/reviews', 'POST', {
        expert_id: Number(sid),
        rating,
        comment,
      });
      delete S.expertReviewsByExpert[sid];
      closeModal();
      showToast('Review submitted', 'success');
    } catch (e) {
      showToast((e && e.message) || 'Could not submit review', 'error');
      saveBtn.disabled = false;
    }
  };
});

window.ExpertHubUser.registerAction('report-expert-review', (_, el) => {
  const expertId = _safeIdOrNull(el && el.dataset ? el.dataset.expert : '');
  const reviewId = _safeIdOrNull(el && el.dataset ? el.dataset.review : '');

  if (!expertId || !reviewId) {
    showToast('Invalid review reference', 'error');
    return;
  }

  UserUI.formModal({
    title: 'Report Review',
    fields: [
      {
        name: 'reason', label: 'Reason', type: 'select', required: true,
        options: [
          { value: 'spam', label: 'Spam' },
          { value: 'abusive', label: 'Abusive language' },
          { value: 'inaccurate', label: 'Inaccurate / false' },
          { value: 'irrelevant', label: 'Irrelevant to this expert' },
          { value: 'other', label: 'Other' },
        ],
      },
      { name: 'notes', label: 'Details', type: 'textarea', rows: 2 },
    ],
    submitLabel: 'Submit',
    onSubmit: async (values) => {
      await apiCall(
        `/api/user/experts/${encodeURIComponent(expertId)}/reviews/${encodeURIComponent(reviewId)}/report`,
        'POST',
        values
      );
      closeModal();
      showToast('Report submitted — moderators will review', 'success');
    },
  });
});

/* ---------- Booking ---------- */

window.ExpertHubUser.registerAction('book-expert', async (id, el) => {
  const sid = _safeIdOrNull(id);
  if (!sid) {
    showToast('Invalid expert reference', 'error');
    return;
  }

  const expert = _findExpertAnywhere(sid) || {};
  const name = (el && el.dataset && el.dataset.name) || expert.name || 'Expert';
  const hourlyRate = _numOrZero(expert.hourly_rate);

  let pricing = null;
  try {
    pricing = await apiCall(`/api/user/experts/${encodeURIComponent(sid)}/pricing`).catch(() => null);
  } catch { /* fall back to cached rate */ }

  const unitPrice = (pricing && pricing.price != null) ? _numOrZero(pricing.price) : hourlyRate;
  const currency = (pricing && pricing.currency) || 'USD';
  const durations = (pricing && Array.isArray(pricing.durations) && pricing.durations.length)
    ? pricing.durations : [30, 45, 60];
  const services = (pricing && Array.isArray(pricing.services)) ? pricing.services : [];

  openModal({
    title: `Book ${name}`,
    className: 'modal-lg',
    body: `
      <label class="form-group"><span class="form-label">Session Title *</span>
        <input id="bkTitle" class="form-input" required maxlength="140" /></label>
      <label class="form-group"><span class="form-label">Describe your issue *</span>
        <textarea id="bkDesc" class="form-textarea" rows="3" required maxlength="2000"></textarea></label>
      ${services.length ? `
        <label class="form-group">
          <span class="form-label">Service *</span>
          <select id="bkService" class="form-select">
            ${services.map((s, i) => `
              <option value="${_esc(_safeId(s.id))}" ${i === 0 ? 'selected' : ''}
                      data-price="${_esc(_numOrZero(s.price))}"
                      data-duration="${_esc(_numOrZero(s.duration_minutes) || 60)}">
                ${_esc(s.name || 'Session')} — ${_esc(s.duration_minutes || 60)}min · ${_money(s.price, currency)}
              </option>
            `).join('')}
          </select>
        </label>
      ` : ''}
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Date *</span>
          <input id="bkDate" type="date" class="form-input" min="${_todayLocalISO()}" required />
        </label>
        <label class="form-group">
          <span class="form-label">Time *</span>
          <input id="bkTime" type="time" class="form-input" required />
        </label>
        ${!services.length ? `
          <label class="form-group">
            <span class="form-label">Duration</span>
            <select id="bkDuration" class="form-select">
              ${durations.map(d => `<option value="${_esc(d)}">${_esc(d)} min</option>`).join('')}
            </select>
          </label>
        ` : ''}
        <label class="form-group">
          <span class="form-label">Method</span>
          <select id="bkType" class="form-select">
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="chat">Chat</option>
            <option value="in_person">In-person</option>
          </select>
        </label>
      </div>
      <div class="pricing-summary">
        <p><strong>Estimated total:</strong> <span id="bkTotal">${_money(unitPrice * 0.5, currency)}</span>
           <span class="form-hint">(final amount confirmed by the server)</span></p>
        <p class="form-hint">Wallet balance: ${_money((S.wallet && S.wallet.balance) || 0, currency)}</p>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="bkSave" class="btn btn-primary">
        <i class="fas fa-credit-card"></i> Request Booking</button>
    `,
  });

  const recompute = () => {
    const svc = document.getElementById('bkService');
    const selected = svc && svc.selectedOptions && svc.selectedOptions[0];
    const duration = Number(
      (selected && selected.dataset && selected.dataset.duration) ||
      (document.getElementById('bkDuration') || {}).value ||
      60
    );
    let amount;
    if (selected && selected.dataset && selected.dataset.price != null && selected.dataset.price !== '') {
      amount = Number(selected.dataset.price);
    } else {
      amount = unitPrice * (duration / 60);
    }
    const totalEl = document.getElementById('bkTotal');
    if (totalEl) totalEl.textContent = _money(amount, currency);
  };

  const svcSel = document.getElementById('bkService');
  if (svcSel) svcSel.onchange = recompute;
  const durSel = document.getElementById('bkDuration');
  if (durSel) durSel.onchange = recompute;
  recompute();

  const saveBtn = document.getElementById('bkSave');
  if (!saveBtn) return;

  saveBtn.onclick = async () => {
    const title = ((document.getElementById('bkTitle') || {}).value || '').trim();
    const description = ((document.getElementById('bkDesc') || {}).value || '').trim();
    const date = (document.getElementById('bkDate') || {}).value || '';
    const time = (document.getElementById('bkTime') || {}).value || '';

    if (!title || !description || !date || !time) {
      showToast('Fill all required fields', 'error');
      return;
    }

    const scheduledAt = _localDateTimeToIso(date, time);
    if (!scheduledAt) {
      showToast('Please choose a valid date and time', 'error');
      return;
    }
    if (new Date(scheduledAt).getTime() < Date.now()) {
      showToast('Please choose a time in the future', 'error');
      return;
    }

    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Booking…';

    try {
      const body = {
        title,
        description,
        consultation_type: (document.getElementById('bkType') || {}).value || 'video',
        expert_id: Number(sid),
        scheduled_at: scheduledAt,
        timezone: (typeof currentUser !== 'undefined' && currentUser && currentUser.timezone) || undefined,
      };

      const svc = document.getElementById('bkService');
      if (svc && svc.value) body.service_id = svc.value;

      const dur = document.getElementById('bkDuration');
      if (dur && dur.value) body.duration_minutes = Number(dur.value);

      const data = await apiCall('/api/user/consultations', 'POST', body);

      closeModal();
      if (typeof reloadConsultations === 'function') await reloadConsultations();
      if (typeof refreshUserSnapshot === 'function') await refreshUserSnapshot();
      rerenderRoleContent();

      // The server is authoritative about status and price.
      const status = (data && data.status) || 'requested';
      const price = data && data.price != null ? _money(data.price, data.currency || currency) : '';
      showToast(
        status === 'confirmed'
          ? `Consultation confirmed — ${price}`
          : `Booking ${status.replace(/_/g, ' ')}${price ? ' — ' + price : ''}`,
        'success',
        6000
      );

      if (data && data.requires_payment && data.payment_url) {
        window.location.href = data.payment_url;
      }
    } catch (e) {
      showToast((e && e.message) || 'Booking failed', 'error');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-credit-card"></i> Request Booking';
    }
  };
});

/* ---------- Match-me wizard ---------- */

window.ExpertHubUser.registerAction('find-expert-wizard', () => {
  openModal({
    title: 'Match Me With an Expert',
    body: `
      <label class="form-group"><span class="form-label">What do you need help with?</span>
        <textarea id="mwNeed" class="form-textarea" rows="3" required
                  placeholder="e.g. Career switch to data science"></textarea></label>
      <div class="form-grid">
        <label class="form-group">
          <span class="form-label">Budget per hour</span>
          <input id="mwBudget" type="number" class="form-input" min="0" value="100" />
        </label>
        <label class="form-group">
          <span class="form-label">Preferred availability</span>
          <select id="mwAvail" class="form-select">
            <option value="any">Any time</option>
            <option value="today">Today</option>
            <option value="this_week">This week</option>
          </select>
        </label>
        <label class="form-group">
          <span class="form-label">Method</span>
          <select id="mwMode" class="form-select">
            <option value="any">Any</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="chat">Chat</option>
            <option value="in_person">In-person</option>
          </select>
        </label>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button id="mwFind" class="btn btn-primary"><i class="fas fa-magic"></i> Find Matches</button>
    `,
  });

  const findBtn = document.getElementById('mwFind');
  if (!findBtn) return;

  findBtn.onclick = async () => {
    const need = ((document.getElementById('mwNeed') || {}).value || '').trim();
    if (!need) {
      showToast('Describe what you need', 'error');
      return;
    }

    const budget = Number((document.getElementById('mwBudget') || {}).value || 0);
    const availability = (document.getElementById('mwAvail') || {}).value || 'any';
    const mode = (document.getElementById('mwMode') || {}).value || 'any';

    try {
      showLoading(true);

      let matches = [];
      try {
        const data = await apiCall('/api/user/experts/match', 'POST', {
          need, budget, availability, mode,
        });
        matches = (data && Array.isArray(data.matches)) ? data.matches : [];
      } catch {
        // Local fallback: rank the already-loaded marketplace.
        matches = _rankMatchesForNeed(S.experts || [], need, { budget, availability, mode })
          .slice(0, 6)
          .map(r => ({
            ...r.expert,
            match_score: r.score,
            reason: 'Matched from your marketplace results',
          }));
      }

      closeModal();

      if (!matches.length) {
        showToast('No matches found — try widening your filters', 'warning');
        return;
      }

      openModal({
        title: 'Top Matches',
        className: 'modal-lg',
        body: matches.map(m => {
          const normalized = _normalizeExpert(m) || m;
          return `
            <div class="expert-card">
              <img class="expert-avatar" src="${_esc(_expertAvatar(normalized))}" alt="" loading="lazy" />
              <h4 class="expert-name">${_esc(normalized.name || '')}</h4>
              <p class="expert-expertise">${_esc(normalized.specialization || '')}</p>
              <p class="expert-rate">
                ${_money(normalized.hourly_rate)}/hr · ${_esc(m.match_score || 0)}% match</p>
              ${m.reason
                ? `<p class="form-hint"><i class="fas fa-lightbulb"></i> ${_esc(m.reason)}</p>` : ''}
              <button class="btn btn-primary btn-sm" data-action="book-expert"
                      data-id="${_esc(_safeId(normalized.id))}"
                      data-name="${_esc(normalized.name || '')}" onclick="closeModal()">
                <i class="fas fa-calendar-plus"></i> Book</button>
            </div>
          `;
        }).join(''),
        footer: `<button class="btn btn-secondary" data-close-modal>Close</button>`,
      });
    } catch (e) {
      showToast((e && e.message) || 'Could not find matches', 'error');
    } finally {
      showLoading(false);
    }
  };
});

/* ---------- Instant consultation ---------- */

window.ExpertHubUser.registerAction('instant-consultation', async () => {
  try {
    showLoading(true);

    const availability = await apiCall('/api/user/experts/instant/available')
      .catch(() => ({ available: true }));

    if (availability && availability.available === false) {
      showLoading(false);
      showToast('No expert is available right now. Our team has been alerted.', 'info', 6000);
      return;
    }

    const data = await apiCall('/api/user/experts/instant', 'POST');

    closeModal();
    if (typeof reloadConsultations === 'function') await reloadConsultations();
    if (typeof refreshUserSnapshot === 'function') await refreshUserSnapshot();
    rerenderRoleContent();

    if (data && data.consultation_id) {
      showToast('Expert assigned — opening session', 'success');
      location.hash = `#/consultation/${_safeId(data.consultation_id)}`;
    } else {
      showToast('Request queued. You will be matched shortly.', 'info', 6000);
    }
  } catch (e) {
    showToast((e && e.message) || 'Instant consultation failed', 'error');
  } finally {
    showLoading(false);
  }
});

/* ============================================================
   36. EVENT INITIALIZATION
   ============================================================ */

function _initExpertEvents() {
  const rerenderDebounced = debounce(() => rerenderRoleContent(), 250);

  /* ---- Search input: debounce, suggestions, history, keyboard ---- */
  const search = document.getElementById('expert-search');
  if (search) {
    search.oninput = () => {
      _setExpertFilter('q', search.value);
      _renderSuggestions(search.value);
      rerenderDebounced();
    };

    search.onfocus = () => {
      if (!search.value) {
        _renderHistoryDropdown();
      } else {
        _renderSuggestions(search.value);
      }
    };

    search.onblur = () => {
      setTimeout(_hideSuggestionDropdowns, 180);
    };

    search.onkeydown = (ev) => {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        _moveSuggestion(1);
        return;
      }
      if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        _moveSuggestion(-1);
        return;
      }
      if (ev.key === 'Escape') {
        _hideSuggestionDropdowns();
        return;
      }
      if (ev.key === 'Enter') {
        if (_commitSuggestionSelection()) {
          ev.preventDefault();
          return;
        }
        _pushSearchHistory(search.value);
        _hideSuggestionDropdowns();
        rerenderRoleContent();
      }
    };
  }

  /* ---- Select and checkbox filters ---- */
  const bindSelect = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.onchange = () => { _setExpertFilter(key, el.value); rerenderRoleContent(); };
  };

  bindSelect('expert-category', 'category');
  bindSelect('expert-specialization', 'spec');
  bindSelect('expert-min-rating', 'min_rating');
  bindSelect('expert-min-exp', 'min_exp');
  bindSelect('expert-min-reviews', 'min_reviews');
  bindSelect('expert-language', 'language');
  bindSelect('expert-mode', 'mode');
  bindSelect('expert-availability', 'availability');
  bindSelect('expert-sort', 'sort');

  const bindNumber = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.oninput = () => { _setExpertFilter(key, el.value); rerenderDebounced(); };
  };

  bindNumber('expert-budget-min', 'budget_min');
  bindNumber('expert-budget-max', 'budget_max');

  const bindCheckbox = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.onchange = () => { _setExpertFilter(key, el.checked); rerenderRoleContent(); };
  };

  bindCheckbox('expert-instant', 'instant');
  bindCheckbox('expert-verified', 'verified');
}

/* ============================================================
   37. MODULE REGISTRATION (single, consolidated)
   ============================================================ */

window.ExpertHubUser.registerModule('experts', renderUserExperts, {
  init() {
    _initExpertEvents();
  },
});