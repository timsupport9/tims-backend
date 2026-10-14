/* ============================================================
   ExpertHub 2.0 — 00-i18n.js
   Lightweight i18n + RTL. Global t() helper. Lazy locale loading.
   ============================================================ */

(function () {
  'use strict';

  const NS = window.EHI18n = window.EHI18n || {};

  const STORAGE_KEY = 'eh.locale';
  const RTL_LANGS = ['ar', 'he', 'fa', 'ur'];

  const state = {
    locale: 'en',
    fallback: 'en',
    messages: {},
    fallbackMessages: {},
    loaded: new Set(),
    ready: false,
  };

  /* ---------- built-in minimal bundles ---------- */
  const BUNDLED = {
    en: {
      'app.name': 'ExpertHub',
      'nav.dashboard': 'Dashboard',
      'nav.eschool': 'E-School',
      'nav.experts': 'Find Experts',
      'nav.consultations': 'My Consultations',
      'nav.wallet': 'Wallet',
      'nav.profile': 'Profile',
      'action.save': 'Save',
      'action.cancel': 'Cancel',
      'action.close': 'Close',
      'action.continue': 'Continue',
      'action.next': 'Next',
      'action.back': 'Back',
      'empty.noResults': 'No results found',
      'quiz.start': 'Start Attempt',
      'quiz.submit': 'Submit',
      'quiz.passed': 'Passed',
      'quiz.failed': 'Not passed',
      'consult.join': 'Join',
      'consult.calendar': 'Calendar',
      'consult.recording': 'View',
      'wallet.balance': 'Available Balance',
      'wallet.addFunds': 'Add Funds',
    },
    es: {
      'app.name': 'ExpertHub',
      'nav.dashboard': 'Panel',
      'nav.eschool': 'E-Escuela',
      'nav.experts': 'Buscar Expertos',
      'nav.consultations': 'Mis Consultas',
      'nav.wallet': 'Cartera',
      'nav.profile': 'Perfil',
      'action.save': 'Guardar',
      'action.cancel': 'Cancelar',
      'action.close': 'Cerrar',
      'action.continue': 'Continuar',
      'action.next': 'Siguiente',
      'action.back': 'Atrás',
      'empty.noResults': 'Sin resultados',
      'quiz.start': 'Comenzar',
      'quiz.submit': 'Enviar',
      'quiz.passed': 'Aprobado',
      'quiz.failed': 'No aprobado',
      'consult.join': 'Unirse',
      'consult.calendar': 'Calendario',
      'consult.recording': 'Ver',
      'wallet.balance': 'Saldo Disponible',
      'wallet.addFunds': 'Añadir Fondos',
    },
    fr: {
      'app.name': 'ExpertHub',
      'nav.dashboard': 'Tableau de bord',
      'nav.eschool': 'E-École',
      'nav.experts': 'Trouver des experts',
      'nav.consultations': 'Mes consultations',
      'nav.wallet': 'Portefeuille',
      'nav.profile': 'Profil',
      'action.save': 'Enregistrer',
      'action.cancel': 'Annuler',
      'action.close': 'Fermer',
      'action.continue': 'Continuer',
      'action.next': 'Suivant',
      'action.back': 'Retour',
      'empty.noResults': 'Aucun résultat',
      'quiz.start': 'Commencer',
      'quiz.submit': 'Envoyer',
      'quiz.passed': 'Réussi',
      'quiz.failed': 'Échoué',
      'consult.join': 'Rejoindre',
      'consult.calendar': 'Calendrier',
      'consult.recording': 'Voir',
      'wallet.balance': 'Solde disponible',
      'wallet.addFunds': 'Ajouter des fonds',
    },
    ar: {
      'app.name': 'إكسبيرت هاب',
      'nav.dashboard': 'لوحة التحكم',
      'nav.eschool': 'المدرسة الإلكترونية',
      'nav.experts': 'ابحث عن خبراء',
      'nav.consultations': 'استشاراتي',
      'nav.wallet': 'المحفظة',
      'nav.profile': 'الملف الشخصي',
      'action.save': 'حفظ',
      'action.cancel': 'إلغاء',
      'action.close': 'إغلاق',
      'action.continue': 'متابعة',
      'action.next': 'التالي',
      'action.back': 'رجوع',
      'empty.noResults': 'لا توجد نتائج',
      'quiz.start': 'بدء المحاولة',
      'quiz.submit': 'إرسال',
      'quiz.passed': 'ناجح',
      'quiz.failed': 'غير ناجح',
      'consult.join': 'انضم',
      'consult.calendar': 'التقويم',
      'consult.recording': 'مشاهدة',
      'wallet.balance': 'الرصيد المتاح',
      'wallet.addFunds': 'إضافة أموال',
    },
    hi: {
      'app.name': 'एक्सपर्टहब',
      'nav.dashboard': 'डैशबोर्ड',
      'nav.eschool': 'ई-स्कूल',
      'nav.experts': 'विशेषज्ञ खोजें',
      'nav.consultations': 'मेरे परामर्श',
      'nav.wallet': 'वॉलेट',
      'nav.profile': 'प्रोफ़ाइल',
      'action.save': 'सहेजें',
      'action.cancel': 'रद्द करें',
      'action.close': 'बंद करें',
      'action.continue': 'जारी रखें',
      'action.next': 'अगला',
      'action.back': 'पीछे',
      'empty.noResults': 'कोई परिणाम नहीं',
      'quiz.start': 'शुरू करें',
      'quiz.submit': 'जमा करें',
      'quiz.passed': 'उत्तीर्ण',
      'quiz.failed': 'अनुत्तीर्ण',
      'consult.join': 'जुड़ें',
      'consult.calendar': 'कैलेंडर',
      'consult.recording': 'देखें',
      'wallet.balance': 'उपलब्ध शेष',
      'wallet.addFunds': 'धन जोड़ें',
    },
  };

  /* ---------- API ---------- */

  function t(key, params) {
    const dict = state.messages || {};
    const fb = state.fallbackMessages || {};
    let str = dict[key] ?? fb[key] ?? key;
    if (params && typeof params === 'object') {
      str = str.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? ''));
    }
    return str;
  }

  function isRTL(locale) {
    return RTL_LANGS.includes(String(locale).split('-')[0].toLowerCase());
  }

  function applyDirection(locale) {
    const dir = isRTL(locale) ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', locale);
  }

  function localizeNumber(n, opts) {
    try { return new Intl.NumberFormat(state.locale, opts).format(n); }
    catch (_) { return String(n); }
  }

  function localizeCurrency(n, currency) {
    try {
      return new Intl.NumberFormat(state.locale, { style: 'currency', currency: currency || 'USD' }).format(n);
    } catch (_) { return String(n); }
  }

  function localizeDate(d, opts) {
    try { return new Intl.DateTimeFormat(state.locale, opts || { dateStyle: 'medium' }).format(new Date(d)); }
    catch (_) { return new Date(d).toLocaleString(); }
  }

  function localizeRelative(d) {
    try {
      const diff = (new Date(d).getTime() - Date.now()) / 1000;
      const abs = Math.abs(diff);
      const rtf = new Intl.RelativeTimeFormat(state.locale, { numeric: 'auto' });
      if (abs < 60) return rtf.format(Math.round(diff), 'second');
      if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
      if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
      if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
      return rtf.format(Math.round(diff / (86400 * 30)), 'month');
    } catch (_) { return String(d); }
  }

  async function loadLocale(locale) {
    if (state.loaded.has(locale)) return;
    // Try remote first, fall back to bundled
    try {
      const res = await fetch(`/locales/${locale}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          state.messages = data;
          state.loaded.add(locale);
          return;
        }
      }
    } catch (_) {}
    state.messages = BUNDLED[locale] || {};
    state.loaded.add(locale);
  }

  async function setLocale(locale) {
    if (!locale) return;
    const norm = String(locale).split('-')[0].toLowerCase();
    if (norm !== 'en' && !state.loaded.has(norm)) await loadLocale(norm);
    state.locale = norm;
    await loadLocale(state.fallback);
    state.fallbackMessages = BUNDLED[state.fallback] || {};
    state.messages = BUNDLED[norm] || state.messages || {};
    applyDirection(norm);
    try { localStorage.setItem(STORAGE_KEY, norm); } catch (_) {}
    document.dispatchEvent(new CustomEvent('eh:i18n:changed', { detail: { locale: norm } }));
    retranslateDOM();
  }

  function retranslateDOM(root) {
    (root || document).querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    (root || document).querySelectorAll('[data-i18n-attr]').forEach(el => {
      const spec = el.getAttribute('data-i18n-attr'); // "placeholder:search.placeholder"
      const [attr, key] = spec.split(':');
      if (attr && key) el.setAttribute(attr, t(key));
    });
  }

  function supportedLocales() {
    return Object.keys(BUNDLED);
  }

  /* ---------- locale switcher UI ---------- */

  function mountSwitcher() {
    if (document.getElementById('eh-locale-switcher')) return;
    const wrap = document.createElement('div');
    wrap.id = 'eh-locale-switcher';
    wrap.className = 'eh-locale-switcher';
    wrap.innerHTML = `
      <i class="fas fa-globe"></i>
      <select aria-label="Language" id="eh-locale-select">
        ${supportedLocales().map(l =>
          `<option value="${l}" ${l === state.locale ? 'selected' : ''}>${label(l)}</option>`
        ).join('')}
      </select>`;
    document.body.appendChild(wrap);
    wrap.querySelector('#eh-locale-select').addEventListener('change', e => setLocale(e.target.value));
  }

  function label(code) {
    const names = { en: 'English', es: 'Español', fr: 'Français', ar: 'العربية', hi: 'हिन्दी' };
    return names[code] || code.toUpperCase();
  }

  /* ---------- init ---------- */

  async function init() {
    let saved = 'en';
    try { saved = localStorage.getItem(STORAGE_KEY) || navigator.language || 'en'; } catch (_) {}
    await setLocale(saved);
    mountSwitcher();
    state.ready = true;
  }

  NS.t = t;
  NS.setLocale = setLocale;
  NS.getLocale = () => state.locale;
  NS.isRTL = isRTL;
  NS.number = localizeNumber;
  NS.currency = localizeCurrency;
  NS.date = localizeDate;
  NS.relative = localizeRelative;
  NS.retranslate = retranslateDOM;
  NS.supported = supportedLocales;
  NS.init = init;

  // Expose global t() for convenience
  window.t = t;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }