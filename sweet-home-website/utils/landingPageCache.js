/**
 * Short TTL in-memory cache for Berlin money / district landing page query payloads.
 * Mirrors the homepage cache pattern — cuts TTFB on warm origin hits.
 */

const DEFAULT_TTL_MS = 90 * 1000;

const store = new Map();

function getLandingPageCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

function setLandingPageCache(key, data, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, { data, expires: Date.now() + ttlMs });
  return data;
}

function clearLandingPageCache(key) {
  if (key) store.delete(key);
  else store.clear();
}

/** CDN/proxy-friendly HTML cache for anonymous public landing pages. */
function setPublicLandingCacheHeaders(res) {
  if (!res || typeof res.set !== 'function') return;
  if (res.getHeader && res.getHeader('Cache-Control')) return;
  res.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
}

module.exports = {
  getLandingPageCache,
  setLandingPageCache,
  clearLandingPageCache,
  setPublicLandingCacheHeaders,
  DEFAULT_TTL_MS
};
