/* ============================================================
   Generic helpers used by both demo and real routes
   ============================================================ */
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { nanoid } = require('nanoid');
const config = require('../config');

const now = () => new Date();
const genRef = (prefix = 'TX') => `${prefix}-${Date.now().toString(36).toUpperCase()}-${nanoid(6).toUpperCase()}`;

const asyncH = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const safeJson = (v, fallback = null) => {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
};

const validate = (req, res, next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    return res.status(400).json({ error: errs.array()[0].msg, errors: errs.array() });
  }
  next();
};

function auth(roles = null) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!tok) return res.status(401).json({ error: 'No token' });
    try {
      const payload = jwt.verify(tok, config.jwt.secret);
      req.user = payload;
      if (roles && !roles.includes(payload.role)) return res.status(403).json({ error: 'Forbidden' });
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

/* Optionally-authenticated — attaches req.user if a valid token, else passes through */
function optionalAuth() {
  return (req, _res, next) => {
    const h = req.headers.authorization || '';
    const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (tok) {
      try { req.user = jwt.verify(tok, config.jwt.secret); } catch {}
    }
    next();
  };
}

/* Wrap handler so missing-table errors return a safe empty payload */
const safeRoute = (fn, empty = {}) => asyncH(async (req, res, next) => {
  try {
    return await fn(req, res, next);
  } catch (e) {
    if (e && /ER_NO_SUCH_TABLE|Table .* doesn't exist/.test(e.message || '')) {
      return res.json(empty);
    }
    throw e;
  }
});

module.exports = { now, genRef, asyncH, safeJson, validate, auth, optionalAuth, safeRoute };
