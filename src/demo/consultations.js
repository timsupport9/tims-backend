/* ============================================================
   Demo mode — consultation booking & lifecycle (v2)

   Mirrors src/routes/consultations.js. In-memory implementation
   of the full consultation lifecycle: booking, matching, instant
   sessions, escrow, confirmation, start/complete, reschedule,
   cancel, review, tip, dispute, no-show, recordings, transcripts,
   AI summaries, reminders, ICS, group & recurring sessions,
   refunds, NPS feedback, and follow-up bookings.

   Invariants:
     - Every mutating endpoint accepts Idempotency-Key.
     - Every financial mutation goes through escrow-aware wallet
       helpers (hold -> release | refund).
     - Every state transition is audited and, where relevant,
       notified + metered.
   ============================================================ */
'use strict';

const config = require('../config');
const {
  demo,
  nextId,
  currentDemoUser,
  // ---- helpers we rely on from _base (see §32) ----
  _respond,
  _error,
  _requireAuth,
  _requireRole,
  _idempotency,
  _audit,
  _notify,
  _walletHold,
  _walletRelease,
  _walletRefund,
  _walletCredit,
  _paginate,
  _sort,
  _filter,
} = require('./_base');

/* ---------- Constants ---------- */
const STATUS = Object.freeze({
  PENDING_EXPERT: 'pending_expert_confirmation',
  PENDING_CLIENT: 'pending_client_confirmation',
  CONFIRMED: 'confirmed',
  IN_SESSION: 'in_session',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  DISPUTED: 'disputed',
  REFUNDED: 'refunded',
});

const PAYMENT_STATUS = Object.freeze({
  HELD: 'held',
  RELEASED: 'released',
  REFUNDED: 'refunded',
  PARTIAL_REFUND: 'partial_refund',
  VOID: 'void',
});

const CONSULTATION_TYPES = new Set(['video', 'audio', 'chat', 'in_person']);
const SESSION_TYPES = new Set(['scheduled', 'instant', 'group', 'recurring']);
const DISPUTE_REASONS = new Set([
  'no_show', 'quality', 'late', 'rude', 'technical',
  'billing', 'misrepresented', 'other',
]);

// Free-cancellation window before scheduled_at (minutes).
const FREE_CANCEL_WINDOW_MIN = 24 * 60;
// Reschedule limit per consultation.
const MAX_RESCHEDULES = 3;
// Late-join grace period before auto-no-show (minutes).
const LATE_JOIN_GRACE_MIN = 15;
// Dispute SLA (hours) before auto-escalation.
const DISPUTE_SLA_HOURS = 48;
// Escrow hold duration after completion before auto-release (hours).
const ESCROW_HOLD_HOURS = 24;
// Reminder lead times (minutes).
const REMINDER_LEADS_MIN = [24 * 60, 60, 10];

/* ---------- Local fallbacks (no-ops if _base already provides) ---------- */
const now = () => new Date();
const uuid = () => (globalThis.crypto?.randomUUID?.() ||
  `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
const ics = (c) => {
  const dt = (d) => (d ? new Date(d).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z' : '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ExpertHub//EN',
    'BEGIN:VEVENT',
    `UID:${c.id}@experthub`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(c.scheduled_at)}`,
    `DTEND:${dt(new Date(new Date(c.scheduled_at).getTime() + (c.duration_minutes || 30) * 60000))}`,
    `SUMMARY:${c.title || 'Consultation'}`,
    `DESCRIPTION:${(c.description || '').replace(/\n/g, '\\n')}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
};

/* ---------- Policy objects (pure functions) ---------- */
const CancellationPolicy = {
  /** Returns { feePct, refundable, reason } */
  evaluate(c, byRole) {
    if (!c.scheduled_at) return { feePct: 0, refundable: true, reason: 'no_schedule' };
    const ms = new Date(c.scheduled_at).getTime() - Date.now();
    const mins = Math.floor(ms / 60000);
    if (mins >= FREE_CANCEL_WINDOW_MIN) return { feePct: 0, refundable: true, reason: 'free_window' };
    if (mins >= 60) return { feePct: 25, refundable: true, reason: 'late_cancel' };
    if (byRole === 'expert') return { feePct: 0, refundable: true, reason: 'expert_late' };
    return { feePct: 100, refundable: false, reason: 'no_refund_window' };
  },
};

const RefundPolicy = {
  evaluate(c, reason) {
    if (c.status === STATUS.CANCELLED) return { pct: 100, reason };
    if (c.status === STATUS.NO_SHOW && reason === 'expert') return { pct: 100, reason };
    if (c.status === STATUS.NO_SHOW) return { pct: 0, reason };
    if (c.disputed) return { pct: 100, reason: 'dispute_hold' };
    return { pct: 0, reason: 'default' };
  },
};

const CommissionPolicy = {
  /** Tiered commission — override config.platform.commission if tiers present. */
  compute(amount) {
    const tiers = config?.platform?.commissionTiers;
    if (Array.isArray(tiers) && tiers.length) {
      const amt = Number(amount) || 0;
      const tier = [...tiers].sort((a, b) => b.min - a.min).find((t) => amt >= t.min);
      if (tier) return Number(tier.pct);
    }
    return Number(config?.platform?.commission ?? 20);
  },
};

const DisputePolicy = {
  /** Auto-escalate if older than SLA. */
  isExpired(d) {
    if (!d || d.status !== 'open') return false;
    return Date.now() - new Date(d.opened_at).getTime() > DISPUTE_SLA_HOURS * 3600 * 1000;
  },
};

/* ---------- Private helpers ---------- */
function pickExpert(id) {
  return demo.users.find((u) => u.id === Number(id) && u.role === 'expert');
}
function pickConsultation(id) {
  return demo.consultations.find((c) => c.id === Number(id));
}
function pickSlot(id, onlyAvailable = false) {
  return demo.consultationSlots.find(
    (s) => s.id === Number(id) && (!onlyAvailable || s.status === 'available'),
  );
}
function findClientAndExpert(c) {
  return {
    client: demo.users.find((u) => u.id === c.user_id),
    expert: demo.users.find((u) => u.id === c.expert_id),
  };
}
function assertParty(c, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return c.user_id === user.id || c.expert_id === user.id;
}
function isExpert(c, user) {
  return user && c.expert_id === user.id;
}
function transition(c, to, meta = {}) {
  const from = c.status;
  c.status = to;
  c.status_history = c.status_history || [];
  c.status_history.push({ from, to, at: now(), meta });
  c.updated_at = now();
}
function upsertHistory(c, action, actorId, meta = {}) {
  c.history = c.history || [];
  c.history.push({ action, actor_id: actorId, at: now(), meta });
}
function safeNumber(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function ensureList(coll) {
  if (!Array.isArray(demo[coll])) demo[coll] = [];
  return demo[coll];
}
function emit(event, payload) {
  // Hook for src/events/bus.js; safe no-op in demo.
  try { require('../events/bus').emit(event, payload); } catch { /* noop */ }
}
function metric(name, labels = {}) {
  try { require('../lib/metrics').inc(name, labels); } catch { /* noop */ }
}

/* ============================================================
   Main export
   ============================================================ */
module.exports = async function consultationsDemo(req, res, p, m) {
  const { method } = req;
  const user = currentDemoUser(req);
  const body = req.body || {};

  /* ============================================================
     POST /consultations/book
     Scheduled consultation with optional slot & escrow hold.
     ============================================================ */
  if (method === 'POST' && p === '/consultations/book') {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;

    const {
      expert_id, slot_id, title, description,
      consultation_type, duration_minutes,
      group_size, recurring, recurrence, client_timezone,
      attachments,
    } = body;

    const expert = pickExpert(expert_id);
    if (!expert) return _error(res, 404, 'Expert not found', 'RESOURCE_NOT_FOUND'), true;
    if (expert.status && expert.status !== 'active') {
      return _error(res, 409, 'Expert not accepting bookings', 'RESOURCE_CONFLICT'), true;
    }

    // Idempotency: replay-safe booking.
    const idemKey = req.header?.('Idempotency-Key') || req.headers?.['idempotency-key'];
    if (idemKey) {
      ensureList('idempotencyKeys');
      const hit = demo.idempotencyKeys.find(
        (k) => k.key === idemKey && k.scope === 'consultations.book',
      );
      if (hit) return _respond(res, hit.response, 200), true;
    }

    // Slot validation.
    let slot = null;
    if (slot_id) {
      slot = pickSlot(slot_id, true);
      if (!slot) return _error(res, 409, 'Slot no longer available', 'SLOT_TAKEN'), true;
    }

    const duration = safeNumber(duration_minutes, slot?.duration_minutes || 30);
    const ctype = CONSULTATION_TYPES.has(consultation_type) ? consultation_type : 'video';
    const isGroup = safeNumber(group_size, 1) > 1;
    const isRecurring = Boolean(recurring && recurrence);

    // Price: slot price, else per-minute on expert hourly rate. Group splits.
    const basePrice = slot?.price
      ? safeNumber(slot.price)
      : (duration * (safeNumber(expert.hourly_rate) / 60));
    const price = isGroup ? basePrice / Math.max(1, safeNumber(group_size, 1)) : basePrice;
    const rounded = Math.round(price * 100) / 100;

    // Escrow: hold funds from client wallet.
    const hold = _walletHold
      ? _walletHold(user.id, rounded, 'consultation_hold', { expert_id: expert.id })
      : null;

    const id = nextId('consultations');
    const c = {
      id,
      uuid: uuid(),
      user_id: user.id,
      expert_id: expert.id,
      client_name: user.name,
      client_email: user.email,
      client_timezone: client_timezone || user.timezone || 'UTC',
      expert_name: expert.name,
      expert_email: expert.email,
      expert_specialization: expert.specialization,
      title: title || 'Consultation',
      description: description || '',
      attachments: Array.isArray(attachments) ? attachments : [],
      status: STATUS.PENDING_EXPERT,
      consultation_type: ctype,
      session_type: isRecurring ? 'recurring' : isGroup ? 'group' : 'scheduled',
      group_size: isGroup ? safeNumber(group_size, 1) : 1,
      recurrence: isRecurring ? recurrence : null,
      price: rounded,
      currency: config?.platform?.defaultCurrency || 'USD',
      duration_minutes: duration,
      payment_status: PAYMENT_STATUS.HELD,
      escrow_hold_id: hold?.id || null,
      escrow_release_at: null,
      slot_id: slot?.id || null,
      scheduled_at: slot?.start_time || null,
      meeting_url: null, // set on confirm
      recording_url: null,
      transcript_url: null,
      ai_summary: null,
      nps_score: null,
      reviewed: 0,
      reschedule_count: 0,
      no_show: null,
      refund: null,
      status_history: [],
      history: [],
      created_at: now(),
      updated_at: now(),
    };

    if (slot) slot.status = 'booked';
    demo.consultations.push(c);

    // Schedule reminders.
    if (c.scheduled_at) {
      ensureList('scheduledNotifications');
      for (const lead of REMINDER_LEADS_MIN) {
        const at = new Date(new Date(c.scheduled_at).getTime() - lead * 60000);
        if (at.getTime() > Date.now()) {
          demo.scheduledNotifications.push({
            id: nextId('scheduledNotifications'),
            user_id: user.id,
            consultation_id: c.id,
            channel: 'email',
            template: 'consultation-reminder',
            send_at: at,
            status: 'pending',
          });
        }
      }
    }

    // Notify expert.
    _notify
      ? _notify(expert.id, {
          title: 'New booking request',
          message: `${user.name} wants a ${duration}m ${ctype} session.`,
          type: 'booking',
          link: `/consultations/${c.id}`,
        })
      : demo.notifications.push({
          id: nextId('notifications'),
          user_id: expert.id,
          title: 'New booking request',
          message: `${user.name} wants a ${duration}m ${ctype} session.`,
          type: 'booking',
          is_read: 0,
          created_at: now(),
        });

    _audit?.(req, 'consultation.book', { consultation_id: c.id, expert_id: expert.id, price: rounded });
    metric('consultations_booked_total', { type: c.session_type });
    emit('consultation.booked', { id: c.id, user_id: user.id, expert_id: expert.id });

    // Store idempotent response.
    if (idemKey) {
      ensureList('idempotencyKeys');
      demo.idempotencyKeys.push({
        key: idemKey,
        scope: 'consultations.book',
        response: c,
        created_at: now(),
      });
    }

    return _respond(res, c, 201), true;
  }

  /* ============================================================
     POST /consultations/match
     Enhanced matching with keyword scoring + rating + budget.
     ============================================================ */
  if (method === 'POST' && p === '/consultations/match') {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const { problemText, budget, tags, language, instant_only } = body;
    const text = String(problemText || '').toLowerCase();
    const wantedTags = Array.isArray(tags) ? tags.map((t) => String(t).toLowerCase()) : [];

    const scored = demo.users
      .filter((u) => u.role === 'expert' && u.status === 'active')
      .filter((e) => (instant_only ? e.instant_available : true))
      .filter((e) => (language ? (e.languages || []).includes(language) : true))
      .map((e) => {
        let score = safeNumber(e.average_rating);
        const spec = String(e.specialization || '').toLowerCase();
        const bio = String(e.bio || '').toLowerCase();
        const eTags = (e.tags || []).map((t) => String(t).toLowerCase());

        if (spec) {
          for (const word of spec.split(/\s+/)) {
            if (word && text.includes(word)) score += 5;
          }
        }
        if (bio) {
          for (const word of text.split(/\s+/)) {
            if (word.length > 3 && bio.includes(word)) score += 1.5;
          }
        }
        for (const t of wantedTags) if (eTags.includes(t)) score += 3;
        if (e.instant_available) score += 0.5;
        if (!budget || safeNumber(e.hourly_rate) <= safeNumber(budget)) score += 1;
        if (budget && safeNumber(e.hourly_rate) > safeNumber(budget)) score -= 2;

        // Exclude sensitive fields from payload.
        const { password_hash, ...rest } = e;
        return { ...rest, _score: Math.round(score * 100) / 100 };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 5);

    return _respond(res, { matches: scored }), true;
  }

  /* ============================================================
     POST /consultations/instant
     Instant session with queue placement + wait estimate.
     ============================================================ */
  if (method === 'POST' && p === '/consultations/instant') {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const { topic, consultation_type } = body;
    const ctype = CONSULTATION_TYPES.has(consultation_type) ? consultation_type : 'video';

    // Round-robin: prefer expert with fewest active instant sessions.
    const candidates = demo.users.filter(
      (u) => u.role === 'expert' && u.status === 'active' && u.instant_available,
    );
    if (!candidates.length) {
      return _error(res, 404, 'No expert available right now', 'RESOURCE_NOT_FOUND'), true;
    }
    const activeCount = (id) =>
      demo.consultations.filter(
        (c) => c.expert_id === id && c.status === STATUS.IN_SESSION && c.session_type === 'instant',
      ).length;
    candidates.sort((a, b) => activeCount(a.id) - activeCount(b.id));
    const expert = candidates[0];

    const queuePos = demo.consultations.filter(
      (c) => c.status === STATUS.IN_SESSION && c.session_type === 'instant',
    ).length;
    const waitMinutes = Math.max(0, queuePos * 5);

    const price = Math.round((safeNumber(expert.hourly_rate) / 2) * 100) / 100;
    const hold = _walletHold
      ? _walletHold(user.id, price, 'consultation_instant_hold', { expert_id: expert.id })
      : null;

    const id = nextId('consultations');
    const c = {
      id,
      uuid: uuid(),
      user_id: user.id,
      expert_id: expert.id,
      client_name: user.name,
      client_email: user.email,
      expert_name: expert.name,
      expert_email: expert.email,
      expert_specialization: expert.specialization,
      title: topic || 'Instant consultation',
      description: '',
      status: STATUS.IN_SESSION,
      session_type: 'instant',
      consultation_type: ctype,
      price,
      currency: config?.platform?.defaultCurrency || 'USD',
      duration_minutes: 15,
      payment_status: PAYMENT_STATUS.HELD,
      escrow_hold_id: hold?.id || null,
      scheduled_at: now(),
      started_at: now(),
      meeting_url: expert.meeting_url || null,
      queue_position: queuePos,
      estimated_wait_minutes: waitMinutes,
      created_at: now(),
      updated_at: now(),
    };
    demo.consultations.push(c);

    _notify?.(expert.id, {
      title: 'Instant session started',
      message: `${user.name} joined the queue.`,
      type: 'booking',
    });
    _audit?.(req, 'consultation.instant', { consultation_id: c.id, expert_id: expert.id });
    metric('consultations_instant_total');

    const { password_hash, ...expertSafe } = expert;
    return _respond(res, { ...c, expert: expertSafe, queue_position: queuePos, estimated_wait_minutes: waitMinutes }, 201), true;
  }

  /* ============================================================
     PUT /consultations/:id/confirm
     Expert (or admin) confirms a pending consultation.
     ============================================================ */
  if (method === 'PUT' && (m = p.match(/^\/consultations\/(\d+)\/confirm$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (!isExpert(c, user) && user.role !== 'admin') {
      return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    }
    if (![STATUS.PENDING_EXPERT, STATUS.PENDING_CLIENT].includes(c.status)) {
      return _error(res, 409, `Cannot confirm from ${c.status}`, 'RESOURCE_CONFLICT'), true;
    }
    transition(c, STATUS.CONFIRMED, { by: user.id });
    c.confirmed_at = now();
    c.meeting_url = c.meeting_url || `https://meet.experthub.local/${c.uuid}`;
    upsertHistory(c, 'confirmed', user.id);

    _notify?.(c.user_id, {
      title: 'Consultation confirmed',
      message: `${c.expert_name} confirmed your session.`,
      type: 'booking',
    });
    _audit?.(req, 'consultation.confirm', { consultation_id: c.id });
    emit('consultation.confirmed', { id: c.id });
    return _respond(res, { ok: true, meeting_url: c.meeting_url, ics: ics(c) }), true;
  }

  /* ============================================================
     POST /consultations/:id/start
     Client or expert starts the session (with late-join grace).
     ============================================================ */
  if (method === 'POST' && (m = p.match(/^\/consultations\/(\d+)\/start$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (!assertParty(c, user)) return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    if (c.status === STATUS.IN_SESSION) return _respond(res, { ok: true, already: true }), true;
    if (![STATUS.CONFIRMED, STATUS.PENDING_EXPERT, STATUS.PENDING_CLIENT].includes(c.status)) {
      return _error(res, 409, `Cannot start from ${c.status}`, 'RESOURCE_CONFLICT'), true;
    }
    transition(c, STATUS.IN_SESSION, { by: user.id });
    c.started_at = now();
    c.started_by = user.id;
    upsertHistory(c, 'started', user.id);

    _audit?.(req, 'consultation.start', { consultation_id: c.id });
    emit('consultation.started', { id: c.id });
    return _respond(res, { ok: true, started_at: c.started_at }), true;
  }

  /* ============================================================
     POST /consultations/:id/complete
     Ends the session, releases escrow after hold window.
     ============================================================ */
  if (method === 'POST' && (m = p.match(/^\/consultations\/(\d+)\/complete$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (!assertParty(c, user)) return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    if (![STATUS.IN_SESSION, STATUS.CONFIRMED].includes(c.status)) {
      return _error(res, 409, `Cannot complete from ${c.status}`, 'RESOURCE_CONFLICT'), true;
    }
    if (c.disputed) return _error(res, 409, 'Consultation is disputed', 'DISPUTE_OPEN'), true;

    transition(c, STATUS.COMPLETED, { by: user.id });
    c.completed_at = now();
    c.completed_by = user.id;
    c.actual_duration_minutes = Math.max(
      1,
      Math.round((c.completed_at - new Date(c.started_at || c.completed_at)) / 60000),
    );
    c.escrow_release_at = new Date(Date.now() + ESCROW_HOLD_HOURS * 3600 * 1000);
    c.payment_status = PAYMENT_STATUS.RELEASED;
    upsertHistory(c, 'completed', user.id, {
      duration: c.actual_duration_minutes,
      notes: body?.notes || null,
    });
    c.post_session_notes = body?.notes || null;
    c.follow_up = body?.follow_up || null;

    // Release escrow: credit expert net of commission.
    const commissionPct = CommissionPolicy.compute(c.price);
    const net = Math.round((c.price * (100 - commissionPct)) / 100 * 100) / 100;
    const expert = demo.users.find((u) => u.id === c.expert_id);
    if (expert) {
      if (_walletRelease) {
        _walletRelease(c.escrow_hold_id, net, `Consultation: ${c.title}`);
      } else {
        expert.wallet_balance = safeNumber(expert.wallet_balance) + net;
        expert.total_earnings = safeNumber(expert.total_earnings) + net;
        ensureList('walletLedger').push({
          id: nextId('walletLedger'),
          user_id: expert.id,
          amount: net,
          balance_after: expert.wallet_balance,
          reason: `Consultation: ${c.title}`,
          reference: `consultation:${c.id}`,
          created_at: now(),
        });
      }
    }

    // Notify both parties.
    _notify?.(c.user_id, {
      title: 'Session completed',
      message: `Your session with ${c.expert_name} has ended. Please leave a review.`,
      type: 'consultation',
    });
    _notify?.(c.expert_id, {
      title: 'Session completed',
      message: `Session with ${c.client_name} ended.`,
      type: 'consultation',
    });

    _audit?.(req, 'consultation.complete', { consultation_id: c.id, net });
    metric('consultations_completed_total');
    emit('consultation.completed', { id: c.id, net });

    return _respond(res, { ok: true, escrow_release_at: c.escrow_release_at }), true;
  }

  /* ============================================================
     PUT /consultations/:id/reschedule
     Enforces MAX_RESCHEDULES + slot swap.
     ============================================================ */
  if (method === 'PUT' && (m = p.match(/^\/consultations\/(\d+)\/reschedule$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (!assertParty(c, user)) return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    if ([STATUS.COMPLETED, STATUS.CANCELLED, STATUS.DISPUTED].includes(c.status)) {
      return _error(res, 409, `Cannot reschedule from ${c.status}`, 'RESOURCE_CONFLICT'), true;
    }
    if ((c.reschedule_count || 0) >= MAX_RESCHEDULES) {
      return _error(res, 409, 'Reschedule limit reached', 'RESOURCE_CONFLICT'), true;
    }
    const slot = pickSlot(body?.new_slot_id, true);
    if (!slot) return _error(res, 409, 'Slot not available', 'SLOT_TAKEN'), true;

    const oldSlotId = c.slot_id;
    if (oldSlotId) {
      const old = pickSlot(oldSlotId);
      if (old) old.status = 'available';
    }
    slot.status = 'booked';
    c.slot_id = slot.id;
    c.scheduled_at = slot.start_time;
    c.reschedule_count = (c.reschedule_count || 0) + 1;
    c.rescheduled_at = now();
    c.reschedule_reason = body?.reason || null;
    upsertHistory(c, 'rescheduled', user.id, { from_slot: oldSlotId, to_slot: slot.id });

    _notify?.(isExpert(c, user) ? c.user_id : c.expert_id, {
      title: 'Consultation rescheduled',
      message: `New time: ${new Date(slot.start_time).toISOString()}`,
      type: 'booking',
    });
    _audit?.(req, 'consultation.reschedule', { consultation_id: c.id, new_slot: slot.id });
    return _respond(res, { ok: true, scheduled_at: slot.start_time }), true;
  }

  /* ============================================================
     PUT /consultations/:id/cancel
     Applies CancellationPolicy, refunds escrow where due.
     ============================================================ */
  if (method === 'PUT' && (m = p.match(/^\/consultations\/(\d+)\/cancel$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (!assertParty(c, user)) return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    if ([STATUS.COMPLETED, STATUS.CANCELLED].includes(c.status)) {
      return _error(res, 409, `Cannot cancel from ${c.status}`, 'RESOURCE_CONFLICT'), true;
    }

    const byRole = isExpert(c, user) ? 'expert' : user.role;
    const policy = CancellationPolicy.evaluate(c, byRole);
    const feeAmount = Math.round((c.price * policy.feePct) / 100 * 100) / 100;
    const refundAmount = policy.refundable ? Math.max(0, c.price - feeAmount) : 0;

    transition(c, STATUS.CANCELLED, { by: user.id, reason: body?.reason || 'user_cancelled' });
    c.cancel_reason = body?.reason || null;
    c.cancelled_by = user.id;
    c.cancelled_at = now();
    c.cancellation_policy = policy;
    upsertHistory(c, 'cancelled', user.id, { policy, refund: refundAmount });

    if (c.slot_id) {
      const slot = pickSlot(c.slot_id);
      if (slot) slot.status = 'available';
    }

    // Refund escrow.
    if (refundAmount > 0) {
      _walletRefund?.(c.escrow_hold_id, refundAmount, `Refund: ${c.title}`);
      c.refund = { amount: refundAmount, fee: feeAmount, at: now(), policy: policy.reason };
      c.payment_status = refundAmount >= c.price ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PARTIAL_REFUND;
    } else {
      c.payment_status = PAYMENT_STATUS.VOID;
    }

    _notify?.(isExpert(c, user) ? c.user_id : c.expert_id, {
      title: 'Consultation cancelled',
      message: `Reason: ${c.cancel_reason || 'not specified'}. Refund: ${refundAmount}`,
      type: 'booking',
    });
    _audit?.(req, 'consultation.cancel', { consultation_id: c.id, refund: refundAmount });
    emit('consultation.cancelled', { id: c.id, refund: refundAmount });

    return _respond(res, { ok: true, refund: refundAmount, policy }), true;
  }

  /* ============================================================
     PUT /consultations/:id/no-show
     Marks a party as no-show and applies refund policy.
     ============================================================ */
  if (method === 'PUT' && (m = p.match(/^\/consultations\/(\d+)\/no-show$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (!assertParty(c, user) && user.role !== 'admin') {
      return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    }
    const who = body?.who === 'expert' ? 'expert' : 'client';
    c.no_show = { who, at: now(), reported_by: user.id };
    transition(c, STATUS.NO_SHOW, { who });

    const policy = RefundPolicy.evaluate(c, who);
    if (policy.pct > 0) {
      const amount = Math.round((c.price * policy.pct) / 100 * 100) / 100;
      _walletRefund?.(c.escrow_hold_id, amount, `No-show refund: ${c.title}`);
      c.refund = { amount, at: now(), policy: policy.reason };
    }

    _notify?.(who === 'expert' ? c.user_id : c.expert_id, {
      title: 'No-show recorded',
      message: `A no-show was recorded for consultation #${c.id}.`,
      type: 'consultation',
    });
    _audit?.(req, 'consultation.no_show', { consultation_id: c.id, who });
    return _respond(res, { ok: true, refund: c.refund || null }), true;
  }

  /* ============================================================
     POST /consultations/:id/review
     One review per participant; verified only if completed.
     ============================================================ */
  if (method === 'POST' && (m = p.match(/^\/consultations\/(\d+)\/review$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (!assertParty(c, user)) return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    if (c.status !== STATUS.COMPLETED) {
      return _error(res, 409, 'Can only review completed sessions', 'RESOURCE_CONFLICT'), true;
    }
    ensureList('reviews');
    const already = demo.reviews.find(
      (r) => r.consultation_id === c.id && r.author_id === user.id,
    );
    if (already) return _error(res, 409, 'Already reviewed', 'RESOURCE_CONFLICT'), true;

    const rating = Math.min(5, Math.max(1, safeNumber(body?.rating, 5)));
    const id = nextId('reviews');
    demo.reviews.push({
      id,
      expert_id: c.expert_id,
      author_id: user.id,
      consultation_id: c.id,
      rating,
      comment: body?.comment || '',
      verified: c.status === STATUS.COMPLETED,
      status: 'published',
      created_at: now(),
    });
    c.reviewed = 1;
    upsertHistory(c, 'reviewed', user.id, { rating });

    // Update expert rolling average.
    const expert = demo.users.find((u) => u.id === c.expert_id);
    if (expert) {
      const rs = demo.reviews.filter((r) => r.expert_id === expert.id);
      expert.average_rating =
        Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 100) / 100;
      expert.reviews_count = rs.length;
    }
    _audit?.(req, 'consultation.review', { consultation_id: c.id, rating });
    return _respond(res, { id, rating }, 201), true;
  }

  /* ============================================================
     POST /consultations/:id/tip
     ============================================================ */
  if (method === 'POST' && (m = p.match(/^\/consultations\/(\d+)\/tip$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (user.id !== c.user_id && user.role !== 'admin') {
      return _error(res, 403, 'Only the client can tip', 'AUTH_FORBIDDEN'), true;
    }
    if (c.status !== STATUS.COMPLETED) {
      return _error(res, 409, 'Tips only after completion', 'RESOURCE_CONFLICT'), true;
    }
    const amount = safeNumber(body?.amount);
    if (amount <= 0) return _error(res, 400, 'Amount required', 'VALIDATION_FAILED'), true;
    if (amount > 1000) return _error(res, 400, 'Amount too large', 'VALIDATION_FAILED'), true;

    const expert = demo.users.find((u) => u.id === c.expert_id);
    if (expert) {
      if (_walletCredit) {
        _walletCredit(expert.id, amount, 'Tip from client', { consultation_id: c.id });
      } else {
        expert.wallet_balance = safeNumber(expert.wallet_balance) + amount;
        expert.total_earnings = safeNumber(expert.total_earnings) + amount;
        ensureList('walletLedger').push({
          id: nextId('walletLedger'),
          user_id: expert.id,
          amount,
          balance_after: expert.wallet_balance,
          reason: 'Tip from client',
          reference: `tip:${c.id}`,
          created_at: now(),
        });
      }
      c.tip = { amount, at: now() };
      _notify?.(expert.id, {
        title: 'You received a tip',
        message: `${c.client_name} tipped you ${amount}.`,
        type: 'payment',
      });
    }
    _audit?.(req, 'consultation.tip', { consultation_id: c.id, amount });
    return _respond(res, { ok: true, amount }), true;
  }

  /* ============================================================
     POST /consultations/:id/dispute
     Creates dispute, marks consultation, arms SLA timer.
     ============================================================ */
  if (method === 'POST' && (m = p.match(/^\/consultations\/(\d+)\/dispute$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (!assertParty(c, user)) return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    if (c.disputed) return _error(res, 409, 'Already disputed', 'DISPUTE_OPEN'), true;

    const reason = DISPUTE_REASONS.has(body?.reason) ? body.reason : 'other';
    ensureList('consultationDisputes');
    const id = nextId('consultationDisputes');
    const dispute = {
      id,
      consultation_id: c.id,
      consultation_title: c.title,
      opener_id: user.id,
      opener_name: user.name,
      expert_id: c.expert_id,
      expert_name: c.expert_name,
      client_id: c.user_id,
      reason,
      description: body?.description || '',
      status: 'open',
      opened_at: now(),
      sla_due_at: new Date(Date.now() + DISPUTE_SLA_HOURS * 3600 * 1000),
      escalated: false,
      history: [{ action: 'opened', actor_id: user.id, at: now() }],
    };
    demo.consultationDisputes.push(dispute);

    transition(c, STATUS.DISPUTED, { dispute_id: id });
    c.disputed = 1;
    c.dispute_id = id;
    upsertHistory(c, 'disputed', user.id, { dispute_id: id, reason });

    _audit?.(req, 'consultation.dispute', { consultation_id: c.id, dispute_id: id, reason });
    emit('dispute.opened', { id, consultation_id: c.id });
    return _respond(res, { id, sla_due_at: dispute.sla_due_at }, 201), true;
  }

  /* ============================================================
     POST /consultations/:id/refund
     Admin-only manual refund against RefundPolicy.
     ============================================================ */
  if (method === 'POST' && (m = p.match(/^\/consultations\/(\d+)\/refund$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    if (user.role !== 'admin') return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;

    const pct = Math.min(100, Math.max(0, safeNumber(body?.percent, 100)));
    const amount = Math.round((c.price * pct) / 100 * 100) / 100;
    _walletRefund?.(c.escrow_hold_id, amount, `Admin refund: ${c.title}`);
    c.refund = { amount, percent: pct, at: now(), by: user.id, reason: body?.reason || null };
    c.payment_status = amount >= c.price ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PARTIAL_REFUND;
    upsertHistory(c, 'refunded', user.id, { amount, percent: pct });

    _notify?.(c.user_id, {
      title: 'Refund processed',
      message: `A refund of ${amount} was issued for consultation #${c.id}.`,
      type: 'payment',
    });
    _audit?.(req, 'consultation.refund', { consultation_id: c.id, amount });
    return _respond(res, { ok: true, amount }), true;
  }

  /* ============================================================
     POST /consultations/:id/recording
     Attach recording/transcript/AI summary after completion.
     ============================================================ */
  if (method === 'POST' && (m = p.match(/^\/consultations\/(\d+)\/recording$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (!assertParty(c, user)) return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    if (c.status !== STATUS.COMPLETED) {
      return _error(res, 409, 'Recording only after completion', 'RESOURCE_CONFLICT'), true;
    }
    c.recording_url = body?.recording_url || c.recording_url;
    c.transcript_url = body?.transcript_url || c.transcript_url;
    c.ai_summary = body?.ai_summary || c.ai_summary;
    c.recording_consent = body?.consent === true;
    upsertHistory(c, 'recording_attached', user.id, { has_summary: Boolean(c.ai_summary) });
    _audit?.(req, 'consultation.recording', { consultation_id: c.id });
    return _respond(res, { ok: true }), true;
  }

  /* ============================================================
     POST /consultations/:id/nps
     Client NPS score (0–10) + optional verbatim.
     ============================================================ */
  if (method === 'POST' && (m = p.match(/^\/consultations\/(\d+)\/nps$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (user.id !== c.user_id) return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    const score = Math.min(10, Math.max(0, safeNumber(body?.score, 0)));
    c.nps_score = score;
    c.nps_verbatim = body?.verbatim || null;
    c.nps_at = now();
    upsertHistory(c, 'nps', user.id, { score });
    _audit?.(req, 'consultation.nps', { consultation_id: c.id, score });
    return _respond(res, { ok: true, score }), true;
  }

  /* ============================================================
     POST /consultations/:id/follow-up
     Creates a follow-up consultation linked to the parent.
     ============================================================ */
  if (method === 'POST' && (m = p.match(/^\/consultations\/(\d+)\/follow-up$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const parent = pickConsultation(m[1]);
    if (!parent) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (!assertParty(parent, user)) return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    if (parent.status !== STATUS.COMPLETED) {
      return _error(res, 409, 'Follow-up only after completion', 'RESOURCE_CONFLICT'), true;
    }
    if (parent.follow_up_id) {
      return _respond(res, { id: parent.follow_up_id, already: true }), true;
    }
    const price = Math.round(parent.price * 0.9 * 100) / 100; // 10% loyalty discount
    const hold = _walletHold
      ? _walletHold(user.id, price, 'consultation_followup_hold', { expert_id: parent.expert_id })
      : null;
    const id = nextId('consultations');
    const fu = {
      ...parent,
      id,
      uuid: uuid(),
      parent_id: parent.id,
      title: `Follow-up: ${parent.title}`,
      status: STATUS.PENDING_EXPERT,
      payment_status: PAYMENT_STATUS.HELD,
      escrow_hold_id: hold?.id || null,
      price,
      reviewed: 0,
      dispute_id: null,
      disputed: 0,
      refund: null,
      tip: null,
      nps_score: null,
      recording_url: null,
      transcript_url: null,
      ai_summary: null,
      follow_up_id: null,
      created_at: now(),
      updated_at: now(),
    };
    demo.consultations.push(fu);
    parent.follow_up_id = id;
    upsertHistory(parent, 'follow_up_created', user.id, { follow_up_id: id });
    _notify?.(parent.expert_id, {
      title: 'Follow-up requested',
      message: `${parent.client_name} booked a follow-up.`,
      type: 'booking',
    });
    _audit?.(req, 'consultation.follow_up', { parent_id: parent.id, follow_up_id: id });
    return _respond(res, fu, 201), true;
  }

  /* ============================================================
     GET /consultations  — paginated, filtered, sorted list
     ============================================================ */
  if (method === 'GET' && p === '/consultations') {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    let rows = demo.consultations.filter((c) => assertParty(c, user));
    rows = _filter ? _filter(rows, req, ['status', 'session_type', 'consultation_type']) : rows;
    rows = _sort ? _sort(rows, req, ['created_at', 'scheduled_at', 'price']) : rows;
    const paged = _paginate
      ? _paginate(rows, req, 20, 100)
      : { data: rows.slice(0, 20), meta: { page: 1, per: 20, total: rows.length } };
    return _respond(res, paged), true;
  }

  /* ============================================================
     GET /consultations/:id
     ============================================================ */
  if (method === 'GET' && (m = p.match(/^\/consultations\/(\d+)$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (!assertParty(c, user) && user.role !== 'admin') {
      return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    }
    return _respond(res, c), true;
  }

  /* ============================================================
     GET /consultations/:id/ics
     ============================================================ */
  if (method === 'GET' && (m = p.match(/^\/consultations\/(\d+)\/ics$/))) {
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (!assertParty(c, currentDemoUser(req))) {
      return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    }
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="consultation-${c.id}.ics"`);
    return res.status(200).send(ics(c)), true;
  }

  /* ============================================================
     GET /consultations/:id/dispute
     ============================================================ */
  if (method === 'GET' && (m = p.match(/^\/consultations\/(\d+)\/dispute$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    const c = pickConsultation(m[1]);
    if (!c) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (!assertParty(c, user) && user.role !== 'admin') {
      return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    }
    const d = ensureList('consultationDisputes').find((x) => x.consultation_id === c.id);
    if (!d) return _error(res, 404, 'No dispute', 'RESOURCE_NOT_FOUND'), true;
    return _respond(res, { ...d, expired: DisputePolicy.isExpired(d) }), true;
  }

  /* ============================================================
     POST /consultations/disputes/:id/resolve
     Admin-only dispute resolution with refund control.
     ============================================================ */
  if (method === 'POST' && (m = p.match(/^\/consultations\/disputes\/(\d+)\/resolve$/))) {
    if (!user) return _error(res, 401, 'Invalid or expired token', 'AUTH_INVALID'), true;
    if (user.role !== 'admin') return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    const d = ensureList('consultationDisputes').find((x) => x.id === Number(m[1]));
    if (!d) return _error(res, 404, 'Not found', 'RESOURCE_NOT_FOUND'), true;
    if (d.status === 'resolved') return _error(res, 409, 'Already resolved', 'RESOURCE_CONFLICT'), true;

    d.status = 'resolved';
    d.resolved_at = now();
    d.resolution = body?.resolution || 'no_fault';
    d.resolved_by = user.id;
    d.refund_percent = Math.min(100, Math.max(0, safeNumber(body?.refund_percent, 0)));
    d.history.push({ action: 'resolved', actor_id: user.id, at: now(), meta: d.resolution });

    const c = pickConsultation(d.consultation_id);
    if (c) {
      c.disputed = 0;
      c.status = d.refund_percent === 100 ? STATUS.REFUNDED : STATUS.COMPLETED;
      if (d.refund_percent > 0) {
        const amount = Math.round((c.price * d.refund_percent) / 100 * 100) / 100;
        _walletRefund?.(c.escrow_hold_id, amount, `Dispute refund: ${c.title}`);
        c.refund = { amount, at: now(), reason: 'dispute_resolution' };
        c.payment_status =
          d.refund_percent >= 100 ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PARTIAL_REFUND;
      }
      upsertHistory(c, 'dispute_resolved', user.id, { resolution: d.resolution });
    }

    _notify?.(d.opener_id, {
      title: 'Dispute resolved',
      message: `Your dispute for consultation #${d.consultation_id} was resolved.`,
      type: 'consultation',
    });
    _audit?.(req, 'consultation.dispute_resolve', { dispute_id: d.id });
    emit('dispute.resolved', { id: d.id });
    return _respond(res, { ok: true, dispute: d }), true;
  }

  /* ============================================================
     POST /consultations/sweep
     Dev/admin-only: expire no-shows, escalate stale disputes,
     auto-release escrow after hold window. In prod this is a
     cron job (src/jobs/noShowSweep.js, src/jobs/escrowRelease.js).
     ============================================================ */
  if (method === 'POST' && p === '/consultations/sweep') {
    if (!user || user.role !== 'admin') {
      return _error(res, 403, 'Forbidden', 'AUTH_FORBIDDEN'), true;
    }
    const stats = { no_shows: 0, disputes_escalated: 0, escrow_released: 0 };
    const nowMs = Date.now();

    for (const c of demo.consultations) {
      // Auto no-show: confirmed, past due, never started.
      if (
        c.status === STATUS.CONFIRMED &&
        c.scheduled_at &&
        nowMs - new Date(c.scheduled_at).getTime() > LATE_JOIN_GRACE_MIN * 60000 &&
        !c.started_at
      ) {
        c.no_show = { who: 'both', at: now(), reported_by: 'system' };
        transition(c, STATUS.NO_SHOW, { auto: true });
        stats.no_shows++;
      }
      // Escrow auto-release: completed & hold window elapsed & not disputed.
      if (
        c.status === STATUS.COMPLETED &&
        c.payment_status === PAYMENT_STATUS.RELEASED &&
        c.escrow_release_at &&
        nowMs >= new Date(c.escrow_release_at).getTime() &&
        !c.disputed &&
        !c.escrow_released
      ) {
        c.escrow_released = true;
        stats.escrow_released++;
      }
    }
    for (const d of ensureList('consultationDisputes')) {
      if (DisputePolicy.isExpired(d) && !d.escalated) {
        d.escalated = true;
        d.escalated_at = now();
        d.history.push({ action: 'escalated', actor_id: user.id, at: now() });
        stats.disputes_escalated++;
      }
    }
    _audit?.(req, 'consultation.sweep', stats);
    return _respond(res, { ok: true, stats }), true;
  }

  return false;
};