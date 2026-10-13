/* ============================================================
   core/constants.js — Shared string constants and enums
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  EH.ROLES = Object.freeze({
    ADMIN: 'admin',
    EXPERT: 'expert',
    LEARNER: 'learner',
    INSTITUTION: 'institution',
  });

  EH.INTENTS = Object.freeze({
    LEARN: 'learn',
    CONSULT: 'consult',
    BOTH: 'both',
  });

  EH.STATUSES = Object.freeze({
    ACTIVE: 'active',
    PENDING: 'pending',
    SUSPENDED: 'suspended',
    REJECTED: 'rejected',
    APPROVED: 'approved',
    DRAFT: 'draft',
    ARCHIVED: 'archived',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  });

  EH.EVENTS = Object.freeze({
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_REFRESH: 'auth:refresh',
    THEME_CHANGE: 'theme:change',
    TAB_CHANGE: 'tab:change',
    DATA_REFRESH: 'data:refresh',
    NOTIFICATION_NEW: 'notification:new',
    CHAT_MESSAGE: 'chat:message',
    CHAT_TYPING: 'chat:typing',
    NAVIGATE: 'nav:navigate',
    MODAL_OPEN: 'modal:open',
    MODAL_CLOSE: 'modal:close',
    TOAST_SHOW: 'toast:show',
    INSTITUTION_APPROVAL: 'institution:approval',
    INSTITUTION_ASSESSMENT_DUE: 'institution:assessment_due',
    INSTITUTION_CERT_EXPIRING: 'institution:certificate_expiring',
  });

  EH.ERROR_CODES = Object.freeze({
    NETWORK: 'NETWORK_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION: 'VALIDATION_ERROR',
    RATE_LIMIT: 'RATE_LIMIT',
    SERVER: 'SERVER_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR',
  });

  EH.PAGE_SIZES = Object.freeze([10, 20, 25, 50, 100]);

  EH.REGEX = Object.freeze({
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^\+?[0-9\s\-()]{7,20}$/,
    URL: /^https?:\/\/[^\s]+$/i,
    PASSWORD_MIN: /.{8,}/,
    PASSWORD_UPPER: /[A-Z]/,
    PASSWORD_LOWER: /[a-z]/,
    PASSWORD_DIGIT: /[0-9]/,
    PASSWORD_SYMBOL: /[^A-Za-z0-9]/,
    SERIAL: /^[A-Z0-9-]{6,}$/,
  });

  EH.MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  EH.DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  EH.DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
})(window);
