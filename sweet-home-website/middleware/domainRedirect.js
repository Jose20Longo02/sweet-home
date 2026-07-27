/**
 * Domain migration: sweet-home.co.il → sweethome-immobilien.de
 *
 * Rule (Migration Checklist #2 / go-live #10):
 *   https://sweet-home.co.il{path}?{query}
 *     → 301 →
 *   https://sweethome-immobilien.de{path}?{query}
 *
 * Path and query are preserved exactly (1:1). Host variants (www, http)
 * also land on the canonical https .de URL.
 *
 * Disabled by default. Enable only on go-live:
 *   DOMAIN_REDIRECT_ENABLED=true
 * Optional overrides:
 *   LEGACY_HOSTS=sweet-home.co.il,www.sweet-home.co.il
 *   PRIMARY_ORIGIN=https://sweethome-immobilien.de
 */

const DEFAULT_LEGACY_HOSTS = ['sweet-home.co.il', 'www.sweet-home.co.il'];
const DEFAULT_PRIMARY_ORIGIN = 'https://sweethome-immobilien.de';

function parseHostList(raw, fallback) {
  if (!raw || !String(raw).trim()) return fallback.slice();
  return String(raw)
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeHost(hostHeader) {
  const host = String(hostHeader || '').toLowerCase().split(',')[0].trim();
  // strip port if present
  return host.replace(/:\d+$/, '');
}

function isEnabled() {
  const v = String(process.env.DOMAIN_REDIRECT_ENABLED || '').toLowerCase().trim();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function buildTargetUrl(req, primaryOrigin) {
  const path = req.originalUrl || req.url || '/';
  // originalUrl includes query string
  return `${primaryOrigin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

function domainRedirectMiddleware(req, res, next) {
  if (!isEnabled()) return next();

  const legacyHosts = parseHostList(process.env.LEGACY_HOSTS, DEFAULT_LEGACY_HOSTS);
  const primaryOrigin = (process.env.PRIMARY_ORIGIN || DEFAULT_PRIMARY_ORIGIN).replace(/\/$/, '');
  const host = normalizeHost(req.get('x-forwarded-host') || req.get('host'));

  if (!host || !legacyHosts.includes(host)) return next();

  // Already on primary origin host — do nothing
  try {
    const primaryHost = new URL(primaryOrigin).host.toLowerCase();
    if (host === primaryHost) return next();
  } catch (_) { /* keep going */ }

  return res.redirect(301, buildTargetUrl(req, primaryOrigin));
}

module.exports = {
  domainRedirectMiddleware,
  isEnabled,
  buildTargetUrl,
  normalizeHost,
  DEFAULT_LEGACY_HOSTS,
  DEFAULT_PRIMARY_ORIGIN
};
