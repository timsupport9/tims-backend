/* ============================================================
   utils/files.js — File helpers
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const CONFIG = EH.CONFIG || { MAX_UPLOAD_MB: 25 };

  function isImage(file) {
    return /^image\//.test(file?.type || '');
  }

  function isPdf(file) {
    return file?.type === 'application/pdf';
  }

  function isCsv(file) {
    return file?.type === 'text/csv' || /\.csv$/i.test(file?.name || '');
  }

  function sizeMb(file) {
    return (file?.size || 0) / (1024 * 1024);
  }

  function withinLimit(file, maxMb = CONFIG.MAX_UPLOAD_MB) {
    return sizeMb(file) <= maxMb;
  }

  function readAsText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsText(file);
    });
  }

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  function readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsArrayBuffer(file);
    });
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function downloadText(filename, text, mime = 'text/plain') {
    downloadBlob(new Blob([text], { type: mime }), filename);
  }

  function downloadJson(filename, obj) {
    downloadText(filename, JSON.stringify(obj, null, 2), 'application/json');
  }

  function parseCsv(text) {
    const lines = String(text || '').split(/\r?\n/).filter(Boolean);
    if (!lines.length) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map(s => s.trim());
    const rows = lines.slice(1).map(line => {
      const cells = [];
      let cur = '';
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === ',' && !inQuotes) { cells.push(cur); cur = ''; }
        else cur += ch;
      }
      cells.push(cur);
      const row = {};
      headers.forEach((h, i) => { row[h] = (cells[i] || '').replace(/^"|"$/g, ''); });
      return row;
    });
    return { headers, rows };
  }

  EH.Files = {
    isImage, isPdf, isCsv, sizeMb, withinLimit,
    readAsText, readAsDataURL, readAsArrayBuffer,
    downloadBlob, downloadText, downloadJson, parseCsv,
  };
})(window);
