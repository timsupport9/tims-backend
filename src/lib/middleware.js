/* ============================================================
   Express app wiring: cors, body parsers, multer, ratelimiters,
   static assets + SPA fallback + error handler
   ============================================================ */
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');

const config = require('../config');
const paths = require('../paths');
const ctx = require('../context');

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain', 'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip', 'application/vnd.ms-excel',
]);

function buildApp(app) {
  app.set('trust proxy', 1);
  app.use(compression());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(config.isProd ? 'combined' : 'dev'));

  /* Ensure uploads dir exists */
  fs.mkdirSync(config.uploads.dir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _f, cb) => cb(null, config.uploads.dir),
    filename: (_req, f, cb) => cb(null, `${Date.now()}-${nanoid(8)}${path.extname(f.originalname)}`),
  });

  const upload = multer({
    storage,
    limits: { fileSize: config.uploads.maxFileSize },
    fileFilter: (_req, f, cb) =>
      ALLOWED_MIME.has(f.mimetype) ? cb(null, true) : cb(new Error('File type not allowed')),
  });

  const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.uploads.maxFileSize },
  });

  app.locals.upload = upload;
  app.locals.memoryUpload = memoryUpload;

  app.use('/uploads', express.static(config.uploads.dir));

  /* Rate limiters */
  const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 600 });
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 20,
    message: { error: 'Too many login attempts' },
  });

  app.use('/api/', apiLimiter);
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/forgot', loginLimiter);
}

function staticAndSpa(app) {
  app.use(express.static(paths.PUBLIC_DIR));

  /* SPA fallback — never intercept /api/* */
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();

    if (!fs.existsSync(paths.INDEX_HTML)) {
      return res.status(200).send(
        '<!doctype html><html><head><title>ExpertHub API</title>' +
        '<style>body{font-family:system-ui;max-width:640px;margin:80px auto;padding:20px;color:#0f172a}' +
        'code{background:#f1f5f9;padding:2px 6px;border-radius:4px}</style></head><body>' +
        '<h1>ExpertHub API</h1>' +
        `<p>API is running. Demo mode: <b>${ctx.demo.active ? 'ON' : 'off'}</b></p>` +
        '<p>Health: <a href="/api/health"><code>/api/health</code></a></p>' +
        '<p>Landing: <a href="/api/public/landing"><code>/api/public/landing</code></a></p>' +
        '</body></html>'
      );
    }
    res.sendFile(paths.INDEX_HTML);
  });
}

function errorHandler(app) {
  app.use((err, req, res, _next) => {
    console.error('[error]', err);
    if (res.headersSent) return;
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  });
}

module.exports = { buildApp, staticAndSpa, errorHandler, ALLOWED_MIME };
