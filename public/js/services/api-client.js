/* ============================================================
   services/api-client.js — Fetch wrapper with auth, retries, refresh
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const CONFIG = EH.CONFIG || { API_BASE: '', API_TIMEOUT_MS: 30000 };
  const State = EH.state || {};
  const Store = EH.Store;

  const inFlight = new Map();

  function buildUrl(path) {
    if (!path) return CONFIG.API_BASE;
    if (/^https?:\/\//i.test(path)) return path;
    return `${CONFIG.API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  function buildHeaders(body, isFormData) {
    const headers = {};
    if (!isFormData && body !== null && body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const token = State.authToken || Store?.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function parseError(res) {
    let msg = `HTTP ${res.status}`;
    let details = null;
    try {
      const j = await res.json();
      msg = j.error || j.message || msg;
      details = j;
    } catch (_) {}
    return { msg, details };
  }

  async function attemptRefresh() {
    const refresh = State.refreshToken || Store?.getRefresh?.();
    if (!refresh) return false;
    try {
      const r = await fetch(buildUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!r.ok) return false;
      const d = await r.json();
      State.authToken = d.token;
      Store?.setToken?.(d.token);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function request(path, { method = 'GET', body = null, isFormData = false, _retry = false, signal } = {}) {
    const url = buildUrl(path);
    const headers = buildHeaders(body, isFormData);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);
    if (signal) signal.addEventListener('abort', () => controller.abort());

    const options = { method, headers, signal: controller.signal };
    if (body !== null && body !== undefined) {
      options.body = isFormData ? body : JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(url, options);
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new EH.AppError('Request timed out', EH.ERROR_CODES.NETWORK, 0);
      }
      throw new EH.NetworkError();
    }
    clearTimeout(timeout);

    if (res.status === 401 && !_retry) {
      const refreshed = await attemptRefresh();
      if (refreshed) {
        return request(path, { method, body, isFormData, _retry: true, signal });
      }
      EH.bus?.emit(EH.EVENTS?.AUTH_LOGOUT || 'auth:logout');
      throw new EH.UnauthorizedError();
    }

    if (!res.ok) {
      const { msg, details } = await parseError(res);
      throw EH.Errors.mapStatusToError(res.status, msg, details);
    }

    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  }

  const API = {
    request,

    get(path, opts = {})          { return request(path, { ...opts, method: 'GET' }); },
    post(path, body, opts = {})   { return request(path, { ...opts, method: 'POST', body }); },
    put(path, body, opts = {})    { return request(path, { ...opts, method: 'PUT', body }); },
    patch(path, body, opts = {})  { return request(path, { ...opts, method: 'PATCH', body }); },
    del(path, opts = {})          { return request(path, { ...opts, method: 'DELETE' }); },

    upload(path, formData, opts = {}) {
      return request(path, { ...opts, method: 'POST', body: formData, isFormData: true });
    },

    /**
     * Deduplicate identical GET requests that are already in flight.
     */
    deduped(path, key = null) {
      const k = key || `GET ${path}`;
      if (inFlight.has(k)) return inFlight.get(k);
      const promise = this.get(path).finally(() => inFlight.delete(k));
      inFlight.set(k, promise);
      return promise;
    },
  };

  EH.API = API;
  // Legacy alias
  global.apiCall = async function (endpoint, method = 'GET', body = null, isFormData = false) {
    return request(endpoint, { method, body, isFormData });
  };
})(window);
