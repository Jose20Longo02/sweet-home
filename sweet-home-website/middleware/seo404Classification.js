/**
 * GSC 404 classification (#7): exact-path 301/410 from Adi's list.
 * Spanish-removal rows are deferred (not in this file).
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../config/seo-404-gsc-2026-07-21.json');

function normalizeLookupPath(pathname) {
  let p = String(pathname || '/');
  try {
    p = decodeURIComponent(p);
  } catch (_) {
    /* keep raw */
  }
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p || '/';
}

function loadRules() {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const redirects = new Map();
  Object.entries(raw.redirects || {}).forEach(([from, to]) => {
    redirects.set(normalizeLookupPath(from), to);
    // Also index lowercase ASCII variants for case-insensitive hits
    const lower = normalizeLookupPath(from).toLowerCase();
    if (lower !== normalizeLookupPath(from) && !redirects.has(lower)) {
      redirects.set(lower, to);
    }
  });
  const gone = new Set();
  (raw.gone || []).forEach((from) => {
    gone.add(normalizeLookupPath(from));
    gone.add(normalizeLookupPath(from).toLowerCase());
  });
  return {
    redirects,
    gone,
    redirectCount: Object.keys(raw.redirects || {}).length,
    goneCount: (raw.gone || []).length
  };
}

const rules = loadRules();

function seo404ClassificationMiddleware(req, res, next) {
  const key = normalizeLookupPath(req.path);
  const keyLower = key.toLowerCase();

  if (rules.gone.has(key) || rules.gone.has(keyLower)) {
    return res.status(410).type('text/plain').send('Gone');
  }

  const target = rules.redirects.get(key) || rules.redirects.get(keyLower);
  if (target) {
    const query = req.originalUrl.includes('?') ? `?${req.originalUrl.split('?')[1]}` : '';
    return res.redirect(301, `${target}${query}`);
  }

  return next();
}

module.exports = {
  seo404ClassificationMiddleware,
  normalizeLookupPath,
  rules
};
