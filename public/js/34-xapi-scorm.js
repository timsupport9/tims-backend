/* ============================================================
   ExpertHub 2.0 — 34-xapi-scorm.js
   SCORM 1.2 / 2004 launcher + xAPI statement bridge.
   Wraps any embedded course iframe with a standard CMI API that
   forwards events to the Learning Record Store.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHxAPI = window.EHxAPI = window.EHxAPI || {};

  const CONFIG = {
    lrsEndpoint: window.EH_LRS_ENDPOINT || '/api/xapi/statements',
    lrsAuth: window.EH_LRS_AUTH || '',
    actorName: () => currentUser?.name || 'Learner',
    actorMbox: () => 'mailto:' + (currentUser?.email || 'learner@experthub'),
    actorAccount: () => String(currentUser?.id || 'anon'),
  };

  /* ============================================================
     xAPI statement builder + sender
     ============================================================ */
  function buildStatement({ verb, object, result, context }) {
    return {
      id: uuid(),
      timestamp: new Date().toISOString(),
      actor: {
        objectType: 'Agent',
        name: CONFIG.actorName(),
        account: {
          homePage: location.origin,
          name: CONFIG.actorAccount(),
        },
      },
      verb: {
        id: `http://adlnet.gov/expapi/verbs/${verb.id}`,
        display: { 'en-US': verb.label || verb.id },
      },
      object: {
        id: object.id,
        objectType: 'Activity',
        definition: object.definition || {
          name: { 'en-US': object.title || object.id },
          type: object.type || 'http://adlnet.gov/expapi/activities/course',
        },
      },
      result: result || undefined,
      context: {
        platform: 'ExpertHub 2.0',
        language: (navigator.language || 'en-US').replace('-', '-'),
        extensions: context || {},
      },
    };
  }

  const VERBS = {
    launched:    { id: 'launched',    label: 'launched' },
    initialized: { id: 'initialized', label: 'initialized' },
    completed:   { id: 'completed',   label: 'completed' },
    passed:      { id: 'passed',      label: 'passed' },
    failed:      { id: 'failed',      label: 'failed' },
    progressed:  { id: 'progressed',  label: 'progressed' },
    experienced: { id: 'experienced', label: 'experienced' },
    suspended:   { id: 'suspended',   label: 'suspended' },
    resumed:     { id: 'resumed',     label: 'resumed' },
    terminated:  { id: 'terminated',  label: 'terminated' },
  };

  async function send(statement) {
    try {
      await fetch(CONFIG.lrsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Experience-API-Version': '1.0.3',
          ...(CONFIG.lrsAuth ? { 'Authorization': CONFIG.lrsAuth } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(statement),
      });
      return true;
    } catch (_) {
      // Queue for later
      queueStatement(statement);
      return false;
    }
  }

  const QUEUE_KEY = 'eh.xapi.queue';
  function queueStatement(s) {
    try {
      const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      q.push(s);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-200)));
    } catch (_) {}
  }
  async function flushQueue() {
    let q = [];
    try { q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (_) {}
    if (!q.length) return;
    const remaining = [];
    for (const s of q) {
      try {
        await fetch(CONFIG.lrsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Experience-API-Version': '1.0.3',
          },
          credentials: 'include',
          body: JSON.stringify(s),
        });
      } catch (_) { remaining.push(s); }
    }
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining)); } catch (_) {}
  }
  window.addEventListener('online', flushQueue);

  /* ============================================================
     High-level API for internal use
     ============================================================ */
  NS.track = async function ({ courseId, courseTitle, lessonId, lessonTitle, action, result, extra }) {
    const verb = VERBS[action] || VERBS.experienced;
    const objectId = lessonId
      ? `${location.origin}/xapi/lessons/${lessonId}`
      : `${location.origin}/xapi/courses/${courseId}`;

    const statement = buildStatement({
      verb,
      object: {
        id: objectId,
        title: lessonTitle || courseTitle || 'Lesson',
        type: lessonId
          ? 'http://adlnet.gov/expapi/activities/lesson'
          : 'http://adlnet.gov/expapi/activities/course',
      },
      result: result ? {
        completion: result.completed,
        success: result.passed,
        score: result.score !== undefined ? {
          scaled: result.score / 100,
          raw: result.score,
          min: 0, max: 100,
        } : undefined,
        duration: result.durationSeconds ? isoDuration(result.durationSeconds) : undefined,
      } : undefined,
      context: {
        'https://experthub.io/xapi/contexts/courseId': courseId,
        'https://experthub.io/xapi/contexts/lessonId': lessonId,
        ...(extra || {}),
      },
    });
    return send(statement);
  };

  NS.initialize = (courseId, lessonId, meta) =>
    NS.track({ courseId, lessonId, action: 'initialized', extra: meta });

  NS.complete = (courseId, lessonId, { score, durationSeconds } = {}) =>
    NS.track({
      courseId, lessonId, action: 'completed',
      result: { completed: true, passed: score === undefined || score >= 70, score, durationSeconds },
    });

  NS.progress = (courseId, lessonId, percent) =>
    NS.track({
      courseId, lessonId, action: 'progressed',
      result: { completed: false, score: percent },
      extra: { progressPercent: percent },
    });

  /* ============================================================
     SCORM launcher
     ============================================================ */
  function launchScorm({ url, courseId, lessonId, width = 960, height = 640 }) {
    if (!url) return showToast('No SCORM package URL', 'error');

    const runId = 'scorm-' + Date.now().toString(36);
    const iframeId = 'scorm-frame-' + runId;

    openModal({
      title: 'Course',
      className: 'modal-xl scorm-modal',
      body: `
        <div class="scorm-shell">
          <iframe id="${iframeId}"
                  src="${esc(url)}"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  style="width:100%;height:70vh;border:0;border-radius:8px;background:#fff"
                  title="SCORM course"></iframe>
        </div>`,
      footer: `<button class="btn btn-secondary" data-close-modal>Close course</button>`,
    });

    // Wait a tick for the iframe to appear, then install the SCORM API bridge
    setTimeout(() => {
      const frame = document.getElementById(iframeId);
      if (!frame) return;
      installScormBridge(frame, { courseId, lessonId });
    }, 100);

    NS.track({ courseId, lessonId, action: 'launched', extra: { runId } });
  }

  /* ============================================================
     SCORM bridge (SCORM 1.2: window.API, SCORM 2004: window.API_1484_11)
     ============================================================ */
  function installScormBridge(iframe, ctx) {
    const state = {
      'cmi.core.lesson_status': 'not attempted',
      'cmi.core.score.raw': '',
      'cmi.core.score.min': '0',
      'cmi.core.score.max': '100',
      'cmi.core.session_time': '00:00:00',
      'cmi.core.lesson_location': '',
      'cmi.suspend_data': '',
      'cmi.completion_status': 'not attempted',
      'cmi.success_status': 'unknown',
      'cmi.score.scaled': '',
      'cmi.score.raw': '',
      'cmi.score.min': '0',
      'cmi.score.max': '100',
      'cmi.session_time': '',
      'cmi.location': '',
      'cmi.suspend_data': '',
      // Common configuration
      'cmi._version': '1.2',
    };

    const api = {
      LMSInitialize: () => {
        NS.track({ courseId: ctx.courseId, lessonId: ctx.lessonId, action: 'initialized' });
        return 'true';
      },
      LMSFinish: () => {
        NS.track({ courseId: ctx.courseId, lessonId: ctx.lessonId, action: 'terminated' });
        return 'true';
      },
      LMSGetValue: (key) => state[key] ?? '',
      LMSSetValue: (key, value) => {
        state[key] = value;
        handleScormValueChange(key, value, ctx);
        return 'true';
      },
      LMSCommit: () => 'true',
      LMSGetLastError: () => '0',
      LMSGetErrorString: () => 'No error',
      LMSGetDiagnostic: () => '',

      // SCORM 2004 aliases
      Initialize: () => api.LMSInitialize(),
      Terminate: () => api.LMSFinish(),
      GetValue: (key) => api.LMSGetValue(key),
      SetValue: (key, value) => api.LMSSetValue(key, value),
      Commit: () => api.LMSCommit(),
      GetLastError: () => '0',
    };

    // Standard-compliant: install into the iframe's window
    try {
      iframe.contentWindow.API = api;
      iframe.contentWindow.API_1484_11 = api;
    } catch (_) {
      // Cross-origin — fall back to postMessage
      window.addEventListener('message', (e) => {
        if (!e.data || e.data.type !== 'scorm' || e.data.runId !== runId) return;
        const { method, key, value } = e.data;
        let resp = '';
        if (method === 'get') resp = api.LMSGetValue(key);
        else if (method === 'set') resp = api.LMSSetValue(key, value);
        else if (method === 'initialize') resp = api.LMSInitialize();
        else if (method === 'finish') resp = api.LMSFinish();
        try { e.source.postMessage({ type: 'scorm-response', id: e.data.id, resp }, '*'); } catch (_) {}
      });
    }

    // Handle status changes → track in xAPI
    function handleScormValueChange(key, value, c) {
      const completed = /completed|passed/i.test(value);
      const failed = /failed/i.test(value);

      if (key === 'cmi.core.lesson_status' || key === 'cmi.completion_status') {
        if (completed) {
          NS.track({
            courseId: c.courseId, lessonId: c.lessonId, action: 'completed',
            result: { completed: true, passed: !failed, score: parseFloat(state['cmi.core.score.raw']) || undefined },
          });
        } else if (failed) {
          NS.track({
            courseId: c.courseId, lessonId: c.lessonId, action: 'failed',
            result: { completed: true, passed: false, score: parseFloat(state['cmi.core.score.raw']) || undefined },
          });
        }
      }

      if (key === 'cmi.core.score.raw' && value) {
        const score = parseFloat(value);
        if (!isNaN(score)) {
          NS.track({
            courseId: c.courseId, lessonId: c.lessonId, action: 'progressed',
            result: { completed: false, score },
            extra: { progressPercent: score },
          });
        }
      }
    }
  }

  /* ============================================================
     Iframe-launcher for non-SCORM external content (Web links,
     videos, etc.) — still emits xAPI.
     ============================================================ */
  function launchExternal({ url, courseId, lessonId, title }) {
    openModal({
      title: title || 'External content',
      className: 'modal-xl',
      body: `
        <iframe src="${esc(url)}"
                style="width:100%;height:70vh;border:0;border-radius:8px;background:#fff"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>`,
      footer: `
        <button class="btn btn-secondary" data-close-modal>Close</button>
        <button class="btn btn-primary" id="ext-mark-complete">
          <i class="fas fa-check"></i> Mark complete</button>`,
    });
    NS.initialize(courseId, lessonId);
    document.getElementById('ext-mark-complete').onclick = () => {
      NS.complete(courseId, lessonId, {});
      showToast('Marked complete', 'success');
      closeModal();
    };
  }

  /* ============================================================
     Utilities
     ============================================================ */
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });
  }

  function isoDuration(seconds) {
    const s = Number(seconds) || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `PT${h ? h + 'H' : ''}${m ? m + 'M' : ''}${sec ? sec + 'S' : ''}` || 'PT0S';
  }

  /* ============================================================
     Public API
     ============================================================ */
  NS.launchScorm = launchScorm;
  NS.launchExternal = launchExternal;
  NS.flushQueue = flushQueue;
  NS.buildStatement = buildStatement;
  NS.send = send;
  NS.VERBS = VERBS;

  /* Auto-flush queued statements when app becomes active */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) flushQueue();
  });