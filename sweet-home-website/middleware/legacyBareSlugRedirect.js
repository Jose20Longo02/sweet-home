/**
 * Legacy bare-path redirects (N3 — analytics 404 cleanup).
 * Old CMS/share links omitted /properties, /projects, /blog prefixes.
 */
const { query } = require('../config/db');
const blogSlugRedirects = require('../config/blog-slug-redirects-2026-08-10.json');

const RESERVED = new Set([
  '', 'about', 'contact', 'services', 'owners', 'privacy', 'terms', 'cookies',
  'blog', 'properties', 'projects', 'login', 'register', 'admin', 'superadmin',
  'en', 'de', 'es', 'lang', 'health', 'sitemap.xml', 'robots.txt', 'favicon.ico',
  'api', 'uploads', 'js', 'css', 'images', 'fonts', 'regions'
]);

const STATIC = {
  '/regions': '/',
  '/for-sale/germany/berlin': '/properties/for-sale/germany/berlin',
  '/for-sale/germany': '/properties/for-sale/germany',
  '/for-sale/cyprus': '/properties/for-sale/cyprus',
  '/for-sale/cyprus/paphos': '/properties/for-sale/cyprus/paphos',
  '/for-sale/uae/dubai': '/properties/for-sale/uae/dubai',
  '/for-sale/uae': '/properties/for-sale/uae',
  '/en/for-sale/germany/berlin': '/en/properties/for-sale/germany/berlin',
  '/en/for-sale/germany': '/en/properties/for-sale/germany',
  '/en/for-sale/cyprus': '/en/properties/for-sale/cyprus',
  '/en/for-sale/cyprus/paphos': '/en/properties/for-sale/cyprus/paphos',
  '/en/for-sale/uae/dubai': '/en/properties/for-sale/uae/dubai',
  '/en/for-sale/uae': '/en/properties/for-sale/uae'
};

// Bare old English blog slug → final German keyword (one hop)
const BARE_BLOG = {};
Object.entries(blogSlugRedirects.redirects || {}).forEach(([from, to]) => {
  const m = from.match(/^\/blog\/([^/]+)$/);
  if (!m) return;
  const bare = `/${m[1]}`;
  const target = to.startsWith('/blog/') ? to : `/blog/${m[1]}`;
  BARE_BLOG[bare] = target;
});

const cache = new Map(); // slug -> target path | null
const CACHE_TTL_MS = 5 * 60 * 1000;

function normalizePath(pathname) {
  let p = String(pathname || '/');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p || '/';
}

async function resolveBareSlug(slug) {
  const now = Date.now();
  const hit = cache.get(slug);
  if (hit && hit.expires > now) return hit.target;

  let target = null;
  try {
    const { rows: props } = await query('SELECT slug FROM properties WHERE slug = $1 LIMIT 1', [slug]);
    if (props[0]) target = `/properties/${slug}`;
    if (!target) {
      const { rows: projs } = await query('SELECT slug FROM projects WHERE slug = $1 LIMIT 1', [slug]);
      if (projs[0]) target = `/projects/${slug}`;
    }
    if (!target) {
      const { rows: posts } = await query(
        `SELECT slug FROM blog_posts WHERE slug = $1 AND status = 'published' LIMIT 1`,
        [slug]
      );
      if (posts[0]) target = `/blog/${slug}`;
    }
  } catch (err) {
    console.warn('[legacyBareSlugRedirect] lookup failed:', err.message);
  }

  cache.set(slug, { target, expires: now + CACHE_TTL_MS });
  return target;
}

async function legacyBareSlugRedirectMiddleware(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  const key = normalizePath(req.path).toLowerCase();
  const queryString = req.originalUrl.includes('?') ? `?${req.originalUrl.split('?')[1]}` : '';

  if (STATIC[key]) {
    return res.redirect(301, `${STATIC[key]}${queryString}`);
  }

  // /for-sale/... catch-all → /properties/for-sale/...
  const forSale = key.match(/^(\/en)?\/for-sale(\/.*)?$/);
  if (forSale) {
    const prefix = forSale[1] || '';
    const rest = forSale[2] || '';
    return res.redirect(301, `${prefix}/properties/for-sale${rest}${queryString}`);
  }

  if (BARE_BLOG[key]) {
    return res.redirect(301, `${BARE_BLOG[key]}${queryString}`);
  }

  // Single-segment bare slug: /some-listing-slug
  const bare = key.match(/^\/([a-z0-9][a-z0-9-]{2,200})$/);
  if (!bare) return next();
  const slug = bare[1];
  if (RESERVED.has(slug)) return next();

  const target = await resolveBareSlug(slug);
  if (target) {
    return res.redirect(301, `${target}${queryString}`);
  }
  return next();
}

module.exports = {
  legacyBareSlugRedirectMiddleware,
  STATIC,
  BARE_BLOG
};
