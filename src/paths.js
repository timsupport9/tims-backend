const path = require('path');
const ROOT = path.join(__dirname, '..');

module.exports = {
  ROOT,
  PUBLIC_DIR: path.join(ROOT, 'public'),
  UPLOADS_DIR: path.join(ROOT, 'public', 'uploads'),
  SCHEMA_FILE: path.join(ROOT, 'database.sql'),
  INDEX_HTML: path.join(ROOT, 'public', 'index.html'),
};
