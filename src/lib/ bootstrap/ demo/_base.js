/* ============================================================
   Shared helpers for demo handlers
   ============================================================ */
const { currentDemoUser, demo, nextId } = require('../lib/demo-store');

const _avatarUrl = (name) =>
  `https://ui-avatars.com/api/?background=1e3a8a&color=fff&name=${encodeURIComponent(name || 'User')}`;

function _instContext(req) {
  const user = currentDemoUser(req);
  if (!user) {
    return { user: null, inst: null, error: { status: 401, error: 'Invalid or expired token' } };
  }
  if (user.role !== 'institution') {
    return { user, inst: null, error: { status: 403, error: 'Not an institution account' } };
  }
  const inst = demo.institutions.find(i => i.id === user.institution_id);
  if (!inst) {
    return { user, inst: null, error: { status: 404, error: 'Institution not found' } };
  }
  return { user, inst, error: null };
}

function _paginate(rows, req, defaultPer = 20, maxPer = 200) {
  const page = Math.max(1, Number(req.query.page || 1));
  const per = Math.min(maxPer, Math.max(1, Number(req.query.per || defaultPer)));
  const total = rows.length;
  const start = (page - 1) * per;
  return { items: rows.slice(start, start + per), total, page, pages: Math.max(1, Math.ceil(total / per)) };
}

module.exports = { _avatarUrl, _instContext, _paginate, demo, nextId, currentDemoUser };
