/* ============================================================
   utils/errors.js — Error classes & helpers
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const CODES = EH.ERROR_CODES || {};

  class AppError extends Error {
    constructor(message, code = CODES.UNKNOWN, status = 0, details = null) {
      super(message || 'An error occurred');
      this.name = 'AppError';
      this.code = code;
      this.status = status;
      this.details = details;
      this.timestamp = Date.now();
    }
    toJSON() {
      return {
        name: this.name, message: this.message,
        code: this.code, status: this.status, details: this.details,
        timestamp: this.timestamp,
      };
    }
  }

  class NetworkError extends AppError {
    constructor(message = 'Network request failed', details = null) {
      super(message, CODES.NETWORK, 0, details);
      this.name = 'NetworkError';
    }
  }

  class ValidationError extends AppError {
    constructor(message = 'Validation failed', details = null) {
      super(message, CODES.VALIDATION, 422, details);
      this.name = 'ValidationError';
    }
  }

  class UnauthorizedError extends AppError {
    constructor(message = 'Not authorized') {
      super(message, CODES.UNAUTHORIZED, 401);
      this.name = 'UnauthorizedError';
    }
  }

  class ForbiddenError extends AppError {
    constructor(message = 'Access denied') {
      super(message, CODES.FORBIDDEN, 403);
      this.name = 'ForbiddenError';
    }
  }

  class NotFoundError extends AppError {
    constructor(message = 'Not found') {
      super(message, CODES.NOT_FOUND, 404);
      this.name = 'NotFoundError';
    }
  }

  function mapStatusToError(status, message) {
    if (status === 401) return new UnauthorizedError(message);
    if (status === 403) return new ForbiddenError(message);
    if (status === 404) return new NotFoundError(message);
    if (status === 422) return new ValidationError(message);
    if (status >= 500)  return new AppError(message, CODES.SERVER, status);
    return new AppError(message, CODES.UNKNOWN, status);
  }

  function friendlyMessage(err) {
    if (!err) return 'Something went wrong.';
    const code = err.code;
    if (code === CODES.NETWORK)     return 'Please check your internet connection.';
    if (code === CODES.UNAUTHORIZED) return 'Your session has expired. Please sign in again.';
    if (code === CODES.FORBIDDEN)   return 'You do not have permission to do that.';
    if (code === CODES.NOT_FOUND)   return 'We could not find what you were looking for.';
    if (code === CODES.SERVER)      return 'Server error. Please try again shortly.';
    return err.message || 'Something went wrong.';
  }

  EH.AppError = AppError;
  EH.NetworkError = NetworkError;
  EH.ValidationError = ValidationError;
  EH.UnauthorizedError = UnauthorizedError;
  EH.ForbiddenError = ForbiddenError;
  EH.NotFoundError = NotFoundError;
  EH.Errors = { mapStatusToError, friendlyMessage };
})(window);
