/* ============================================================
   utils/dom.js — DOM helpers
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.keys(attrs).forEach(k => {
      const v = attrs[k];
      if (k === 'class') node.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k === 'dataset' && typeof v === 'object') Object.assign(node.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (v !== null && v !== undefined && v !== false) {
        node.setAttribute(k, v === true ? '' : v);
      }
    });
    const list = Array.isArray(children) ? children : [children];
    list.forEach(c => {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function html(node, content) {
    node.innerHTML = content ?? '';
    return node;
  }

  function text(node, content) {
    node.textContent = content ?? '';
    return node;
  }

  function on(target, event, handler, opts) {
    if (!target) return () => {};
    target.addEventListener(event, handler, opts);
    return () => target.removeEventListener(event, handler, opts);
  }

  function delegate(root, selector, event, handler) {
    if (!root) return () => {};
    const listener = (e) => {
      const t = e.target.closest(selector);
      if (t && root.contains(t)) handler.call(t, e, t);
    };
    root.addEventListener(event, listener);
    return () => root.removeEventListener(event, listener);
  }

  function addClass(node, ...names) {
    if (!node) return node;
    node.classList.add(...names.filter(Boolean));
    return node;
  }
  function removeClass(node, ...names) {
    if (!node) return node;
    node.classList.remove(...names.filter(Boolean));
    return node;
  }
  function toggleClass(node, name, force) {
    if (!node) return node;
    node.classList.toggle(name, force);
    return node;
  }
  function hasClass(node, name) {
    return !!node && node.classList.contains(name);
  }

  function show(node, display = '') {
    if (!node) return node;
    node.style.display = display;
    node.removeAttribute('hidden');
    return node;
  }
  function hide(node) {
    if (!node) return node;
    node.style.display = 'none';
    return node;
  }

  function closest(node, selector) {
    return node ? node.closest(selector) : null;
  }

  function empty(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function insertBefore(node, ref) {
    if (!node || !ref || !ref.parentNode) return;
    ref.parentNode.insertBefore(node, ref);
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else fn();
  }

  function formData(form) {
    const data = {};
    new FormData(form).forEach((v, k) => {
      if (data[k] !== undefined) {
        data[k] = Array.isArray(data[k]) ? data[k].concat(v) : [data[k], v];
      } else data[k] = v;
    });
    return data;
  }

  function serializeForm(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  EH.$ = $;
  EH.$$ = $$;
  EH.DOM = {
    $, $$, el, html, text, on, delegate,
    addClass, removeClass, toggleClass, hasClass,
    show, hide, closest, empty, insertBefore,
    ready, formData, serializeForm,
  };
})(window);
