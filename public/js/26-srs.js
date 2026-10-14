/* ============================================================
   ExpertHub 2.0 — 26-srs.js
   Spaced repetition (SM-2) with auto-generated flashcards from
   lesson content. Daily review queue, dashboard tab, stats.
   ============================================================ */

/* ============================================================
   DASHBOARD TAB
   ============================================================ */
function userSRS() {
  const deck = getSrsDeck();
  const due = dueCards(deck);
  const stats = srsStats(deck);

  return `
    <div class="breadcrumbs"><a href="#/dashboard">Home</a><span>Flashcards</span></div>
    <section class="page-header">
      <h1 class="page-title">Flashcards &amp; Review</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" data-action="srs-generate">
          <i class="fas fa-magic"></i> Generate from my courses</button>
        <button class="btn btn-primary" data-action="srs-review" ${due.length ? '' : 'disabled'}>
          <i class="fas fa-play"></i> Review ${due.length ? `(${due.length})` : ''}</button>
      </div>
    </section>

    <div class="alert alert-info">
      <i class="fas fa-brain"></i>
      <div>Spaced repetition is the most evidence-backed way to remember what you learn.
      Reviewing a card just before you'd forget it doubles long-term retention.</div>
    </div>

    <section class="stat-grid">
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Total cards</p>
          <p class="stat-value">${stats.total}</p>
        </div>
        <div class="stat-icon stat-icon-blue"><i class="fas fa-layer-group"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Due today</p>
          <p class="stat-value">${stats.due}</p>
        </div>
        <div class="stat-icon stat-icon-yellow"><i class="fas fa-clock"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Mature</p>
          <p class="stat-value">${stats.mature}</p>
          <p class="stat-sub">interval ≥ 21 days</p>
        </div>
        <div class="stat-icon stat-icon-green"><i class="fas fa-check-circle"></i></div>
      </div>
      <div class="dashboard-card stat-card">
        <div class="stat-info">
          <p class="stat-label">Accuracy</p>
          <p class="stat-value">${stats.accuracy}%</p>
        </div>
        <div class="stat-icon stat-icon-purple"><i class="fas fa-bullseye"></i></div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Your deck</h3>
      ${deck.length ? `
        <ul class="srs-deck-list">
          ${deck.slice(0, 50).map(c => `
            <li class="srs-deck-item">
              <div class="srs-deck-front">${esc(c.front)}</div>
              <div class="srs-deck-meta">
                <span class="chip chip-neutral">EF ${c.ease.toFixed(2)}</span>
                <span class="chip chip-neutral">${c.interval}d</span>
                ${c.due_at && new Date(c.due_at) <= new Date()
                  ? '<span class="chip chip-yellow">Due</span>'
                  : `<span class="chip chip-green">${daysUntil(c.due_at)}d</span>`}
              </div>
              <button class="btn btn-ghost btn-xs" data-action="srs-edit" data-id="${c.id}">
                <i class="fas fa-pen"></i></button>
            </li>`).join('')}
        </ul>` : `
        <div class="empty-state">
          <i class="fas fa-layer-group"></i>
          <h3>No cards yet</h3>
          <p>Generate cards from your enrolled courses, or add them manually.</p>
          <button class="btn btn-primary" data-action="srs-generate">
            <i class="fas fa-magic"></i> Generate cards</button>
        </div>`}
    </section>
  `;
}

/* ============================================================
   CORE SRS (SM-2)
   ============================================================ */
const SRS_STORAGE = 'eh.srs.deck.v1';

function getSrsDeck() {
  try {
    const raw = localStorage.getItem(SRS_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function saveSrsDeck(deck) {
  try { localStorage.setItem(SRS_STORAGE, JSON.stringify(deck)); } catch (_) {}
}

function dueCards(deck) {
  const now = Date.now();
  return deck.filter(c => !c.due_at || new Date(c.due_at).getTime() <= now);
}

function srsStats(deck) {
  const total = deck.length;
  const due = dueCards(deck).length;
  const mature = deck.filter(c => (c.interval || 0) >= 21).length;
  const reps = deck.reduce((s, c) => s + (c.reps || 0), 0);
  const correct = deck.reduce((s, c) => s + (c.correct || 0), 0);
  const accuracy = reps ? Math.round((correct / reps) * 100) : 0;
  return { total, due, mature, accuracy };
}

/* SM-2: quality 0..5 → new ease, interval, due */
function reviewCard(card, quality) {
  const q = Math.max(0, Math.min(5, Number(quality)));
  let { ease = 2.5, interval = 0, reps = 0, correct = 0 } = card;

  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    correct += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * ease);
    ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    ease = Math.max(1.3, ease);
  }

  const due_at = new Date(Date.now() + interval * 86400000).toISOString();
  return { ...card, ease, interval, reps, correct, due_at, last_reviewed: new Date().toISOString() };
}

function daysUntil(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 86400000));
}

/* ============================================================
   CARD GENERATION
   ============================================================ */
function generateCardsFromCourses() {
  const courses = S.enrollments || [];
  const existing = new Set(getSrsDeck().map(c => c.front + '||' + c.back));
  const newCards = [];

  courses.forEach(e => {
    const course = (S.courses || []).find(c => String(c.id) === String(e.course_id));
    if (!course) return;

    // Pull from course description
    extractCardsFromText(course.description, { course_id: course.id, tag: course.title })
      .forEach(c => {
        const key = c.front + '||' + c.back;
        if (!existing.has(key)) { existing.add(key); newCards.push(c); }
      });

    // Pull from lesson content if available
    const lessons = (S.__lessonContentCache || {})[course.id] || [];
    lessons.forEach(l => {
      extractCardsFromText(l.content, { course_id: course.id, lesson_id: l.id, tag: course.title })
        .forEach(c => {
          const key = c.front + '||' + c.back;
          if (!existing.has(key)) { existing.add(key); newCards.push(c); }
        });
    });
  });

  const deck = getSrsDeck().concat(newCards);
  saveSrsDeck(deck);
  showToast(`Added ${newCards.length} new card${newCards.length === 1 ? '' : 's'}`, 'success');
  if (typeof window.renderUserDashboard === 'function') window.renderUserDashboard();
}

function extractCardsFromText(text, meta) {
  if (!text || typeof text !== 'string') return [];
  const out = [];

  // Pattern 1: "X is Y." and "X are Y."
  const isAre = /\b([A-Z][\w\s\-']{2,60}?)\s+(?:is|are)\s+([^.!?\n]{6,200})[.!?]/g;
  let m;
  while ((m = isAre.exec(text)) && out.length < 20) {
    out.push({
      id: 'srs-' + Math.random().toString(36).slice(2, 10),
      front: `What is ${m[1].trim()}?`,
      back: m[2].trim() + '.',
      ...meta,
      created_at: new Date().toISOString(),
      ease: 2.5, interval: 0, reps: 0, correct: 0,
      due_at: new Date().toISOString(),
    });
  }

  // Pattern 2: "Term — definition" or "Term: definition" lines
  text.split(/\n/).forEach(line => {
    const dm = line.match(/^\s*[\-\*\d\.]?\s*([A-Z][\w\s\-']{2,40})\s*[—:–-]\s*(.{6,200})$/);
    if (dm && out.length < 40) {
      out.push({
        id: 'srs-' + Math.random().toString(36).slice(2, 10),
        front: dm[1].trim(),
        back: dm[2].trim(),
        ...meta,
        created_at: new Date().toISOString(),
        ease: 2.5, interval: 0, reps: 0, correct: 0,
        due_at: new Date().toISOString(),
      });
    }
  });

  return out;
}

/* ============================================================
   REVIEW MODAL
   ============================================================ */
function openSrsReview() {
  const deck = getSrsDeck();
  const due = dueCards(deck);
  if (!due.length) return showToast('Nothing due right now. Come back later!', 'info');

  const session = { queue: due.slice(), index: 0, reviewed: 0, correct: 0 };
  window.__ehSrsSession = session;

  openModal({
    title: 'Review session',
    className: 'modal-lg',
    body: `<div id="srs-review-host"></div>`,
    footer: `<button class="btn btn-secondary" data-close-modal>End session</button>`,
  });

  renderSrsCard();
}

function renderSrsCard() {
  const s = window.__ehSrsSession;
  if (!s) return;
  const card = s.queue[s.index];
  const host = document.getElementById('srs-review-host');
  if (!host) return;

  if (!card) {
    const acc = s.reviewed ? Math.round((s.correct / s.reviewed) * 100) : 0;
    host.innerHTML = `
      <div class="empty-state" style="padding:40px">
        <i class="fas fa-check-circle" style="color:#10b981;font-size:56px"></i>
        <h3>Session complete</h3>
        <p>Reviewed <strong>${s.reviewed}</strong> cards · Accuracy <strong>${acc}%</strong></p>
      </div>`;
    return;
  }

  const progress = Math.round((s.index / s.queue.length) * 100);
  host.innerHTML = `
    <div class="srs-card">
      <div class="progress-bar" style="margin-bottom:16px">
        <span style="width:${progress}%"></span>
      </div>
      <div class="srs-card-front">
        <div class="srs-card-label">Question ${s.index + 1} of ${s.queue.length}</div>
        <div class="srs-card-text">${esc(card.front)}</div>
      </div>
      <div class="srs-card-back" hidden>
        <div class="srs-card-label">Answer</div>
        <div class="srs-card-text">${esc(card.back)}</div>
      </div>
      <div class="srs-card-actions" id="srs-actions">
        <button class="btn btn-primary btn-block" id="srs-reveal">
          <i class="fas fa-eye"></i> Show answer</button>
      </div>
    </div>`;

  document.getElementById('srs-reveal').onclick = () => {
    const back = host.querySelector('.srs-card-back');
    if (back) back.hidden = false;
    document.getElementById('srs-actions').innerHTML = `
      <div class="srs-grades">
        <button class="btn btn-danger" data-grade="1">Again<small>&lt;1m</small></button>
        <button class="btn btn-warning" data-grade="2">Hard<small>~1d</small></button>
        <button class="btn btn-info" data-grade="4">Good<small>${nextInterval(card, 4)}d</small></button>
        <button class="btn btn-success" data-grade="5">Easy<small>${nextInterval(card, 5)}d</small></button>
      </div>`;
    host.querySelectorAll('[data-grade]').forEach(b => {
      b.onclick = () => gradeAndAdvance(Number(b.dataset.grade));
    });
  };
}

function nextInterval(card, quality) {
  const preview = reviewCard(card, quality);
  return preview.interval;
}

function gradeAndAdvance(quality) {
  const s = window.__ehSrsSession;
  if (!s) return;
  const card = s.queue[s.index];
  if (!card) return;

  const updated = reviewCard(card, quality);
  s.reviewed += 1;
  if (quality >= 3) s.correct += 1;

  // Write back to persisted deck
  const deck = getSrsDeck();
  const idx = deck.findIndex(c => c.id === card.id);
  if (idx >= 0) deck[idx] = updated; else deck.push(updated);
  saveSrsDeck(deck);

  s.index += 1;
  renderSrsCard();
}

/* ============================================================
   EDIT CARD
   ============================================================ */
function editSrsCard(cardId) {
  const deck = getSrsDeck();
  const card = deck.find(c => c.id === cardId);
  if (!card) return;

  openModal({
    title: 'Edit card',
    body: `
      <div class="form-grid">
        <label class="form-group form-group-full"><span class="form-label">Front</span>
          <textarea id="srs-front" class="form-textarea" rows="2">${esc(card.front)}</textarea></label>
        <label class="form-group form-group-full"><span class="form-label">Back</span>
          <textarea id="srs-back" class="form-textarea" rows="3">${esc(card.back)}</textarea></label>
      </div>`,
    footer: `
      <button class="btn btn-danger" id="srs-delete">Delete</button>
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary" id="srs-save">Save</button>`,
  });

  document.getElementById('srs-save').onclick = () => {
    card.front = document.getElementById('srs-front').value.trim();
    card.back = document.getElementById('srs-back').value.trim();
    saveSrsDeck(deck);
    closeModal();
    showToast('Card updated', 'success');
    if (typeof window.renderUserDashboard === 'function') window.renderUserDashboard();
  };
  document.getElementById('srs-delete').onclick = () => {
    const next = deck.filter(c => c.id !== cardId);
    saveSrsDeck(next);
    closeModal();
    showToast('Card deleted', 'info');
    if (typeof window.renderUserDashboard === 'function') window.renderUserDashboard();
  };
}

/* ============================================================
   DELEGATED HANDLERS
   ============================================================ */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'srs-review')   { e.preventDefault(); openSrsReview(); }
  if (a === 'srs-generate') { e.preventDefault(); generateCardsFromCourses(); }
  if (a === 'srs-edit')     { e.preventDefault(); editSrsCard(el.dataset.id); }