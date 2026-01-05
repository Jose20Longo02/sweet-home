// app.js
require('dotenv').config();

const express        = require('express');
const session        = require('express-session');
const path           = require('path');
const expressLayouts = require('express-ejs-layouts');
const helmet         = require('helmet');
const cookieParser   = require('cookie-parser');
const csrf           = require('csurf');
const rateLimit      = require('express-rate-limit');
const { pool }       = require('./config/db');
const PgSession      = require('connect-pg-simple')(session);
const compression    = require('compression');
const morgan         = require('morgan');
const os             = require('os');
const authRoutes     = require('./routes/authRoutes');
const projectRoutes  = require('./routes/projectRoutes');
const publicProjectRoutes = require('./routes/publicProjectRoutes');
const adminUserRoutes    = require('./routes/adminUserRoutes');
const superAdminRoutes   = require('./routes/superAdminRoutes');
const { publicRouter: propertyRoutes, adminRouter: adminPropertyRoutes } = require('./routes/propertyRoutes');
const { publicRouter: blogPublicRoutes, adminRouter: blogAdminRoutes, superAdminRouter: blogSuperAdminRoutes } = require('./routes/blogRoutes');
const leadRoutes     = require('./routes/leadRoutes');
const { connectDB }  = require('./config/db');
const sendMail       = require('./config/mailer');
const locations      = require('./config/locations');
const { query }      = require('./config/db');
const i18nMiddleware = require('./config/i18n');
const { logEvent }   = require('./utils/analytics');
const iconThemes     = require('./config/iconThemes');

// Sentry removed per request

const app = express();
connectDB();

// Sentry integration removed

// Enforce SESSION_SECRET in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  // eslint-disable-next-line no-console
  console.error('FATAL: SESSION_SECRET is not set in production. Set process.env.SESSION_SECRET');
  process.exit(1);
}

// Optional: verify SMTP on startup (logs only)
try {
  sendMail.summary && console.log('SMTP runtime summary:', sendMail.summary());
} catch (_) {}
sendMail.verify && sendMail.verify()
  .then(() => console.log('SMTP verified'))
  .catch(err => console.warn('SMTP verify failed:', err && (err.stack || err.message || err)));

// Security headers + CSP
const isProd = process.env.NODE_ENV === 'production';
app.use(helmet());
// Apply the same CSP in all envs (no reportOnly) to avoid mixed behavior
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      // permit CDN images broadly; Spaces CDN is HTTPS
      "img-src": ["'self'", 'data:', 'blob:', 'https:', 'https://*.tile.openstreetmap.org', 'https://unpkg.com', 'https://www.google-analytics.com', 'https://*.google-analytics.com'],
      "media-src": ["'self'", 'blob:', 'https:'],
      "script-src": ["'self'", 'https://www.google.com', 'https://www.gstatic.com', 'https://www.recaptcha.net', 'https://unpkg.com', 'https://www.googletagmanager.com', 'https://www.youtube.com'],
      "script-src-elem": ["'self'", 'https://www.google.com', 'https://www.gstatic.com', 'https://www.recaptcha.net', 'https://unpkg.com', 'https://www.googletagmanager.com', 'https://www.youtube.com'],
      "script-src-attr": ["'none'"],
      "style-src": ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://fonts.googleapis.com'],
      "style-src-elem": ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://fonts.googleapis.com'],
      "style-src-attr": ["'unsafe-inline'"],
      "font-src": ["'self'", 'data:', 'https://fonts.gstatic.com'],
      "connect-src": ["'self'", 'https://nominatim.openstreetmap.org', 'https://www.google.com', 'https://www.gstatic.com', 'https://www.recaptcha.net', 'https://www.google-analytics.com', 'https://region1.google-analytics.com', 'https://*.google-analytics.com', 'https://www.googletagmanager.com'],
      "frame-src": ['https://www.google.com', 'https://www.youtube.com', 'https://player.vimeo.com']
    }
  })
);

// Logging & compression
if (process.env.NODE_ENV === 'production') {
  // JSON structured logs
  morgan.token('pid', () => process.pid);
  morgan.token('hostname', () => os.hostname());
  const jsonFormat = (tokens, req, res) => JSON.stringify({
    time: new Date().toISOString(),
    level: 'info',
    pid: tokens.pid(req, res),
    hostname: tokens.hostname(req, res),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    content_length: Number(tokens.res(req, res, 'content-length') || 0),
    referrer: tokens.referrer(req, res) || undefined,
    user_agent: tokens['user-agent'](req, res),
    response_time_ms: Number(tokens['response-time'](req, res))
  });
  app.use(morgan(jsonFormat));
  // Optional file rotation via LOG_FILE env
  if (process.env.LOG_FILE) {
    const rfs = (() => { try { return require('rotating-file-stream'); } catch (_) { return null; } })();
    if (rfs) {
      const stream = rfs.createStream(process.env.LOG_FILE, {
        size: process.env.LOG_ROTATE_SIZE || '10M',
        interval: process.env.LOG_ROTATE_INTERVAL || '1d',
        compress: 'gzip'
      });
      app.use(morgan(jsonFormat, { stream }));
    }
  }
} else {
  app.use(morgan('dev'));
}
app.use(compression());

// Built-in middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Static assets: long caching for hashed assets, shorter for others
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    // If filename contains a hash-like pattern (e.g., .min.[hash].css or -123abc.), cache longer
    const hashed = /\.[0-9a-f]{6,}\./i.test(filePath) || /-[0-9a-f]{6,}\./i.test(filePath);
    if (hashed) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Vendor bundles served locally to avoid CSP/network issues (e.g., Chart.js for analytics dashboard)
app.use(
  '/vendor/chartjs',
  express.static(path.join(__dirname, 'node_modules', 'chart.js', 'dist'), {
    maxAge: '7d'
  })
);
app.use(cookieParser());
// Internationalization: must come immediately after cookies so it can read lang
app.use(i18nMiddleware);
// Expose current lang for diagnostics
app.use((req, res, next) => { try { res.set('X-App-Lang', res.locals.lang || ''); } catch (_) {} next(); });
// Expose GA Measurement ID to views
app.use((req, res, next) => { res.locals.GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || ''; next(); });
// Expose default consent
// Default to 'granted' for analytics_storage to enable proper user tracking
// Set GA_CONSENT_DEFAULT=denied in .env if you need to implement a consent banner
app.use((req, res, next) => { 
  res.locals.GA_CONSENT_DEFAULT = process.env.GA_CONSENT_DEFAULT || 'granted'; 
  next(); 
});
// Expose a simple asset version for cache busting of non-hashed files (e.g., CSS)
app.use((req, res, next) => { res.locals.assetVersion = process.env.ASSET_VERSION || (process.env.NODE_ENV === 'production' ? '1' : String(Date.now())); next(); });

// Icon theme helper - make getIconPath available to all views
app.use((req, res, next) => {
  res.locals.getIconPath = iconThemes.getIconPath;
  res.locals.getActiveTheme = iconThemes.getActiveTheme;
  res.locals.getAvailableThemes = iconThemes.getAvailableThemes;
  next();
});
app.use(session({
  store: new PgSession({
    pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? 'unset' : 'dev-only-secret'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: 'auto',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

// Trust proxy (for secure cookies/Heroku/Nginx)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// 1) Set up EJS **first**
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 2) Then register the layouts middleware
app.use(expressLayouts);
app.set('layout', 'layouts/main');   // this is your default layout

// (i18n already mounted above cookies)


// CSRF protection (cookie-based tokens)
const csrfProtection = csrf({ cookie: true });
// Exempt test endpoints from CSRF for easier testing
let csrfSkipped = false;
app.use((req, res, next) => {
  if (req.path === '/api/leads/test-seller-webhook' && (req.method === 'GET' || req.method === 'POST')) {
    csrfSkipped = true;
    return next();
  }
  csrfSkipped = false;
  return csrfProtection(req, res, next);
});

// Make csrfToken available to all views and expose for JS (only if CSRF was applied)
app.use((req, res, next) => {
  if (req.csrfToken && typeof req.csrfToken === 'function') {
    res.locals.csrfToken = req.csrfToken();
  } else {
    res.locals.csrfToken = null;
  }
  // Expose user to all views
  res.locals.user = req.session.user || null;
  next();
});

// Passive analytics: log page views for HTML responses (non-API)
app.use((req, res, next) => {
  const isGet = req.method === 'GET';
  const isApi = req.path.startsWith('/api/');
  const hasExtension = /\.[a-z0-9]{2,8}$/i.test(req.path);
  if (isGet && !isApi && !hasExtension) {
    res.on('finish', () => {
      const contentType = res.get('Content-Type') || '';
      if (res.statusCode < 400 && contentType.includes('text/html')) {
        logEvent({
          eventType: 'page_view',
          entityType: 'page',
          meta: {
            path: req.path,
            query: Object.keys(req.query || {}).length ? req.query : undefined
          },
          req
        });
      }
    });
  }
  next();
});

// (i18n already mounted above)

// Basic rate limiter for public APIs
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(['/api', '/auth', '/properties/api', '/projects/api'], apiLimiter);

// Expose current path to views so layout can pick header variant
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// Language setter (CSP-safe): sets cookie and redirects back
app.get('/lang/:code', (req, res) => {
  const code = String(req.params.code || '').slice(0,2).toLowerCase();
  const supported = ['en','es','de'];
  const back = req.get('referer') || '/';
  if (!supported.includes(code)) return res.redirect(back);
  try { res.cookie('lang', code, { httpOnly: false, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 }); } catch (_) {}
  return res.redirect(back);
});

// Icon theme test page (for debugging)
app.get('/test-icons', (req, res) => {
  res.render('test-icons', {
    title: 'Icon Theme Test'
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/superadmin/dashboard/projects', projectRoutes);
app.use('/projects', publicProjectRoutes);
// Static pages top-level shortcuts
app.get('/about', async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT id, name, email, role, area, position, profile_picture
        FROM users
       WHERE approved = true
       ORDER BY
         CASE LOWER(COALESCE(area,'unknown'))
           WHEN 'administrative' THEN 1
           WHEN 'management' THEN 2
           WHEN 'sales' THEN 3
           ELSE 4
         END,
         COALESCE(position,'zzzz'),
         name
    `);
    // Filter out developer accounts (by email)
    const DEV_EMAILS = (process.env.DEVELOPER_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const filtered = rows.filter(u => !DEV_EMAILS.includes(String(u.email || '').toLowerCase()));

    let areaOrder = [];
    try {
      areaOrder = Object.keys(require('./config/roles')) || [];
    } catch (_) { areaOrder = []; }
    res.render('about', {
      title: 'About',
      team: filtered,
      useMainContainer: false,
      areaOrder
    });
  } catch (err) { next(err); }
});
app.get('/contact', (req, res) => res.render('contact', { title: 'Contact' }));
app.get('/terms', (req, res) => res.render('terms', { title: 'Terms & Conditions' }));
app.get('/privacy', (req, res) => res.render('privacy', { title: 'Privacy Policy' }));
app.get('/cookies', (req, res) => res.render('cookies', { title: 'Cookies Policy' }));
app.use('/admin/dashboard', adminUserRoutes);
app.use('/superadmin/dashboard', superAdminRoutes); // SuperAdmin landing
app.use('/', leadRoutes); // mount lead routes (public API + pages)
// Blog routes
app.use('/blog', blogPublicRoutes);
app.use('/admin/dashboard/blog', blogAdminRoutes);
app.use('/superadmin/dashboard/blog', blogSuperAdminRoutes);

// Public & agent routes
app.use('/properties', propertyRoutes);

// SuperAdmin-only routes
app.use('/superadmin/dashboard/properties', adminPropertyRoutes);

// Alias admin create route so buttons like "/admin/properties/new" work
app.use('/admin/properties', propertyRoutes);

// Home page route
app.get('/', async (req, res, next) => {
  try {
    // Pick one random active project to highlight
    const { rows } = await query(`
      SELECT id, title, slug, country, city, neighborhood, photos,
             min_price, max_price, min_unit_size, max_unit_size, unit_types, status
        FROM projects
       WHERE status = 'active'
       ORDER BY random()
       LIMIT 1
    `);

    let recommendedProject = null;
    if (rows && rows[0]) {
      const p = rows[0];
      const arr = Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : []);
      const photos = arr.map(ph => {
        if (!ph) return ph;
        const s = String(ph);
        if (s.startsWith('/uploads/') || s.startsWith('http')) return s;
        return `/uploads/projects/${p.id}/${s}`;
      });
      recommendedProject = {
        id: p.id,
        title: p.title,
        slug: p.slug,
        country: p.country,
        city: p.city,
        neighborhood: p.neighborhood,
        photos,
        min_price: p.min_price,
        max_price: p.max_price,
        min_unit_size: p.min_unit_size,
        max_unit_size: p.max_unit_size,
        unit_types: Array.isArray(p.unit_types) ? p.unit_types : (p.unit_types ? [p.unit_types] : [])
      };
    }

    res.render('home', { 
      title: 'Find Your Dream Home',
      user: req.session.user || null,
      locations,
      recommendedProject,
      canonicalUrl: (process.env.APP_URL || `${req.protocol}://${req.get('host')}`) + '/'
    });
  } catch (e) { next(e); }
});

// Staff convenience entry — bookmarkable
app.get('/admin', (req, res) => {
  const u = req.session.user;
  if (u && u.role === 'SuperAdmin') return res.redirect('/superadmin/dashboard');
  if (u && u.role === 'Admin') return res.redirect('/admin/dashboard');
  return res.redirect('/auth/login');
});

// Services page
app.get('/services', (req, res) => {
  res.render('services', {
    title: 'Services',
    useMainContainer: false,
    canonicalUrl: (process.env.APP_URL || `${req.protocol}://${req.get('host')}`) + '/services'
  });
});

// Owners landing page (public)
app.get('/owners', async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT id, title, slug, city, neighborhood, country, photos, sold_at
        FROM properties
       WHERE sold = true AND sold_at IS NOT NULL
       ORDER BY sold_at DESC
       LIMIT 5
    `);
    const properties = rows.map(p => ({
      ...p,
      photos: Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : [])
    }));
    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    res.render('owners', {
      title: 'For Sellers',
      useMainContainer: false,
      soldProperties: properties,
      canonicalUrl: `${baseUrl}/owners`,
      baseUrl
    });
  } catch (e) { next(e); }
});

// robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  const allowAll = process.env.ROBOTS_ALLOW !== 'false';
  res.send(allowAll ? 'User-agent: *\nAllow: /' : 'User-agent: *\nDisallow: /');
});

// sitemap.xml (basic; can be expanded to pull from DB)
app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const base = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

    // Static pages
    const staticPaths = ['', 'about', 'contact', 'projects', 'properties', 'privacy', 'terms', 'cookies'];
    const staticUrls = staticPaths.map(p => ({ 
      loc: `${base}/${p}`.replace(/\/$/, '/'), 
      lastmod: null,
      changefreq: p === '' ? 'daily' : 'weekly',
      priority: p === '' ? '1.0' : '0.8'
    }));

    // Dynamic properties
    const props = await query(`SELECT slug, updated_at, created_at FROM properties WHERE slug IS NOT NULL ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 5000`);
    const propUrls = (props.rows || []).map(r => ({
      loc: `${base}/properties/${r.slug}`,
      lastmod: (r.updated_at || r.created_at) ? new Date(r.updated_at || r.created_at).toISOString() : null,
      changefreq: 'weekly',
      priority: '0.9'
    }));

    // Dynamic projects
    const projs = await query(`SELECT slug, updated_at, created_at FROM projects WHERE slug IS NOT NULL ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 5000`);
    const projUrls = (projs.rows || []).map(r => ({
      loc: `${base}/projects/${r.slug}`,
      lastmod: (r.updated_at || r.created_at) ? new Date(r.updated_at || r.created_at).toISOString() : null,
      changefreq: 'monthly',
      priority: '0.8'
    }));

    // Dynamic blog posts
    const posts = await query(`SELECT slug, updated_at, created_at, status, published_at FROM blog_posts WHERE slug IS NOT NULL AND status = 'published' ORDER BY COALESCE(updated_at, created_at) DESC NULLS LAST LIMIT 5000`);
    const blogUrls = (posts.rows || []).map(r => ({
      loc: `${base}/blog/${r.slug}`,
      lastmod: (r.updated_at || r.published_at || r.created_at) ? new Date(r.updated_at || r.published_at || r.created_at).toISOString() : null,
      changefreq: 'monthly',
      priority: '0.7'
    }));

    const all = [...staticUrls, ...propUrls, ...projUrls, ...blogUrls];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      all.map(u => `\n  <url>` +
        `<loc>${u.loc}</loc>` +
        (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : '') +
        (u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : '') +
        (u.priority ? `<priority>${u.priority}</priority>` : '') +
      `</url>`).join('') +
      `\n</urlset>`;
    res.type('application/xml').send(xml);
  } catch (e) { next(e); }
});

// Basic health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbOk = await pool.query('SELECT 1');
    res.json({ status: 'ok', db: dbOk ? 'up' : 'down', time: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'degraded', db: 'down', time: new Date().toISOString() });
  }
});

// 404 handler (last non-error middleware)
app.use((req, res, next) => {
  if (res.headersSent) return next();
  return res.status(404).render('errors/404');
});

// Global error handler (must have 4 args)
app.use((err, req, res, next) => {
  if (err && err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('errors/500', { error: new Error('Invalid CSRF token') });
  }
  const status = err && err.status ? err.status : 500;
  const error = err || new Error('Internal Server Error');
  if (process.env.NODE_ENV !== 'production') {
    try { console.error(error.stack || error); } catch (_) {}
  }
  return res.status(status).render('errors/500', { error });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));