/**
 * GSC 404 classification (#7) + Spanish removal redirects.
 * Exact-path 301/410 from Adi's list, then catch-all /es → DE (strip prefix).
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../config/seo-404-gsc-2026-07-21.json');

const ES_LANDING_MAP = {
  '/es': '/',
  '/es/propiedades-en-venta-berlin': '/wohnungen-berlin-kaufen',
  '/es/properties-for-sale-berlin': '/wohnungen-berlin-kaufen',
  '/es/propiedades-en-venta-dubai': '/immobilien-dubai-kaufen',
  '/es/propiedades-en-venta-chipre': '/immobilien-zypern-kaufen',
  '/es/propiedades-en-venta-cyprus': '/immobilien-zypern-kaufen'
};

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
    const lower = normalizeLookupPath(from).toLowerCase();
    if (lower !== normalizeLookupPath(from) && !redirects.has(lower)) {
      redirects.set(lower, to);
    }
  });
  Object.entries(ES_LANDING_MAP).forEach(([from, to]) => {
    redirects.set(normalizeLookupPath(from), to);
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

function spanishToGermanPath(pathname) {
  const key = normalizeLookupPath(pathname);
  if (key === '/es' || key === '/es/') return '/';
  if (!key.startsWith('/es/') && key !== '/es') return null;
  if (ES_LANDING_MAP[key]) return ES_LANDING_MAP[key];
  // /es/foo/bar → /foo/bar (German default at root)
  const rest = key.slice(3) || '/';
  return rest.startsWith('/') ? rest : `/${rest}`;
}

function seo404ClassificationMiddleware(req, res, next) {
  const key = normalizeLookupPath(req.path);
  const keyLower = key.toLowerCase();
  const query = req.originalUrl.includes('?') ? `?${req.originalUrl.split('?')[1]}` : '';

  if (rules.gone.has(key) || rules.gone.has(keyLower)) {
    return res.status(410).type('text/plain').send('Gone');
  }

  const target = rules.redirects.get(key) || rules.redirects.get(keyLower);
  if (target) {
    return res.redirect(301, `${target}${query}`);
  }

  // Spanish removal: any remaining /es or /es/* → German-equivalent path
  const esTarget = spanishToGermanPath(key);
  if (esTarget !== null) {
    return res.redirect(301, `${esTarget}${query}`);
  }

  return next();
}

module.exports = {
  seo404ClassificationMiddleware,
  normalizeLookupPath,
  spanishToGermanPath,
  rules
};
