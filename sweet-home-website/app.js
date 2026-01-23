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
// Minify assets middleware: serve .min.js/.min.css when available
const minifyAssets = require('./middleware/minify-assets');
app.use(minifyAssets);
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
  // Helper to minify JSON for data attributes (removes unnecessary whitespace and undefined/null values)
  res.locals.minifyJSON = function(obj) {
    // Remove undefined and null values recursively
    const clean = function(o) {
      if (Array.isArray(o)) {
        return o.map(clean).filter(v => v !== undefined && v !== null);
      } else if (o && typeof o === 'object') {
        const cleaned = {};
        for (const key in o) {
          if (o.hasOwnProperty(key)) {
            const value = clean(o[key]);
            if (value !== undefined && value !== null) {
              cleaned[key] = value;
            }
          }
        }
        return cleaned;
      }
      return o;
    };
    const cleaned = clean(obj);
    return JSON.stringify(cleaned).replace(/\s+/g, ' ').trim();
  };
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
  // Explicitly exclude admin/superadmin pages from analytics
  const isAdminPage = req.path && /^\/(admin|superadmin)/.test(req.path);
  
  if (isGet && !isApi && !hasExtension && !isAdminPage) {
    // Ensure session is initialized for tracking (needed when saveUninitialized: false)
    // Setting a property forces session creation and ensures sessionID exists
    if (req.session) {
      if (!req.session.analyticsInitialized) {
        req.session.analyticsInitialized = true;
      }
    }
    res.on('finish', () => {
      const contentType = res.get('Content-Type') || '';
      if (res.statusCode < 400 && contentType.includes('text/html')) {
        // Use setImmediate to ensure session is saved before logging
        setImmediate(() => {
          logEvent({
            eventType: 'page_view',
            entityType: 'page',
            meta: {
              path: req.path,
              query: Object.keys(req.query || {}).length ? req.query : undefined
            },
            req
          });
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
// Avoid redirect if language is already set to the requested code
// Block search engine bots - these are functional endpoints, not indexable pages
app.get('/lang/:code', (req, res) => {
  // Detect if this is a known search engine bot/crawler (very specific pattern)
  const userAgent = (req.get('user-agent') || '').toLowerCase();
  // Only match known search engine bots explicitly - avoid false positives
  const knownBots = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandexbot',
    'sogou', 'exabot', 'facebot', 'ia_archiver', 'semrushbot', 'ahrefsbot',
    'mj12bot', 'dotbot', 'petalbot', 'applebot', 'facebookexternalhit',
    'twitterbot', 'linkedinbot', 'whatsapp', 'telegrambot', 'discordbot',
    'slackbot', 'pinterest', 'redditbot', 'msnbot', 'adsbot', 'mediapartners',
    'adsbot-google', 'feedfetcher', 'semrush', 'ahrefs', 'screaming frog'
  ];
  const isBot = knownBots.some(bot => userAgent.includes(bot));
  
  // If it's a known bot, return 403 Forbidden (these endpoints are not for indexing)
  if (isBot) {
    return res.status(403).send('Forbidden - This is a functional endpoint, not an indexable page.');
  }
  
  // For real users, proceed with language switching
  const code = String(req.params.code || '').slice(0,2).toLowerCase();
  const supported = ['en','es','de'];
  const back = req.get('referer') || '/';
  if (!supported.includes(code)) return res.redirect(302, back);
  
  // Check if language is already set to the requested code
  const currentLang = (req.cookies && req.cookies.lang) ? String(req.cookies.lang).toLowerCase() : 'en';
  if (currentLang === code) {
    // Language already set, no need to redirect
    return res.redirect(302, back);
  }
  
  try { res.cookie('lang', code, { httpOnly: false, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 }); } catch (_) {}
  return res.redirect(302, back);
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
    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    res.render('about', {
      title: 'About',
      team: filtered,
      useMainContainer: false,
      areaOrder,
      baseUrl
    });
  } catch (err) { next(err); }
});
app.get('/contact', (req, res) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  res.render('contact', { title: 'Contact', baseUrl });
});
app.get('/terms', (req, res) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  res.render('terms', { 
    title: 'Terms & Conditions',
    baseUrl,
    headPartial: 'partials/seo/terms-head',
    canonicalUrl: `${baseUrl}/terms`
  });
});
app.get('/privacy', (req, res) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  res.render('privacy', { 
    title: 'Privacy Policy', 
    baseUrl,
    headPartial: 'partials/seo/privacy-head',
    canonicalUrl: `${baseUrl}/privacy`
  });
});
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
    // Pick one random active project to highlight (optimized: use TABLESAMPLE for better performance)
    // Fallback to ORDER BY id DESC if TABLESAMPLE not available
    let rows;
    try {
      const { rows: sampleRows } = await query(`
        SELECT id, title, slug, country, city, neighborhood, photos,
               min_price, max_price, min_unit_size, max_unit_size, unit_types, status
          FROM projects
         WHERE status = 'active'
         TABLESAMPLE SYSTEM (10)
         LIMIT 1
      `);
      rows = sampleRows;
      // If TABLESAMPLE returns no rows, fall back to simple query
      if (!rows || rows.length === 0) {
        const { rows: fallbackRows } = await query(`
          SELECT id, title, slug, country, city, neighborhood, photos,
                 min_price, max_price, min_unit_size, max_unit_size, unit_types, status
            FROM projects
           WHERE status = 'active'
           ORDER BY id DESC
           LIMIT 1
        `);
        rows = fallbackRows;
      }
    } catch (_) {
      // If TABLESAMPLE fails, use simple ORDER BY id DESC (much faster than random())
      const { rows: fallbackRows } = await query(`
        SELECT id, title, slug, country, city, neighborhood, photos,
               min_price, max_price, min_unit_size, max_unit_size, unit_types, status
          FROM projects
         WHERE status = 'active'
         ORDER BY id DESC
         LIMIT 1
      `);
      rows = fallbackRows;
    }

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

    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    res.render('home', { 
      title: 'Find Your Dream Home',
      user: req.session.user || null,
      locations,
      recommendedProject,
      baseUrl,
      canonicalUrl: `${baseUrl}/`
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
  // Ensure we use the correct domain, not staging URLs
  let baseUrl = process.env.APP_URL;
  if (!baseUrl || baseUrl.includes('onrender.com') || baseUrl.includes('localhost')) {
    baseUrl = `${req.protocol}://${req.get('host')}`;
  }
  baseUrl = baseUrl.replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/services`;
  res.render('services', {
    title: 'Services',
    useMainContainer: false,
    canonicalUrl
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
// Dynamic icon theme CSS endpoint - generates CSS based on active theme
app.get('/css/icon-theme.css', (req, res) => {
  try {
    const iconPathFunc = iconThemes.getIconPath;
    const bedPath = iconPathFunc('bed');
    const bathPath = iconPathFunc('bath');
    const sizePath = iconPathFunc('size');
    const locationPath = iconPathFunc('location');
    const propertyTypePath = iconPathFunc('propertyType');
    const occupancyPath = iconPathFunc('occupancy');
    const rentalPath = iconPathFunc('rental');
    
    const isPng = (path) => path && path.toLowerCase().indexOf('.png') !== -1;
    const bedIsPng = isPng(bedPath);
    const bathIsPng = isPng(bathPath);
    const sizeIsPng = isPng(sizePath);
    const locationIsPng = isPng(locationPath);
    const propertyTypeIsPng = isPng(propertyTypePath);
    const occupancyIsPng = isPng(occupancyPath);
    const rentalIsPng = isPng(rentalPath);
    
    let css = ':root{';
    css += `--icon-bed:url('${bedPath}');`;
    css += `--icon-bath:url('${bathPath}');`;
    css += `--icon-size:url('${sizePath}');`;
    css += `--icon-location:url('${locationPath}');`;
    if (propertyTypePath) css += `--icon-property-type:url('${propertyTypePath}');`;
    if (occupancyPath) css += `--icon-occupancy:url('${occupancyPath}');`;
    if (rentalPath) css += `--icon-rental:url('${rentalPath}');`;
    css += '}';
    
    const generateIconClass = (name, path, isPng) => {
      let result = `.icon-${name}{--icon:var(--icon-${name})!important;`;
      if (isPng) {
        result += `background-image:var(--icon-${name})!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:center!important;-webkit-mask:none!important;mask:none!important;background-color:transparent!important;`;
      }
      result += '}';
      return result;
    };
    
    css += generateIconClass('bed', bedPath, bedIsPng);
    css += generateIconClass('bath', bathPath, bathIsPng);
    css += generateIconClass('size', sizePath, sizeIsPng);
    css += generateIconClass('location', locationPath, locationIsPng);
    if (propertyTypePath) css += generateIconClass('property-type', propertyTypePath, propertyTypeIsPng);
    if (occupancyPath) css += generateIconClass('occupancy', occupancyPath, occupancyIsPng);
    if (rentalPath) css += generateIconClass('rental', rentalPath, rentalIsPng);
    
    const activeTheme = iconThemes.getActiveTheme();
    if (activeTheme === 'christmas') {
      css += 'body[data-icon-theme="christmas"] .icon-bed,body[data-icon-theme="christmas"] .icon-bath,body[data-icon-theme="christmas"] .icon-size,body[data-icon-theme="christmas"] .icon-location,body[data-icon-theme="christmas"] .icon-property-type,body[data-icon-theme="christmas"] .icon-occupancy,body[data-icon-theme="christmas"] .icon-rental{transform:scale(1.5);transform-origin:center;}';
    }
    
    res.setHeader('Content-Type', 'text/css');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(css);
  } catch (err) {
    console.error('Error generating icon theme CSS:', err);
    res.status(500).send('/* Error generating CSS */');
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const allowAll = process.env.ROBOTS_ALLOW !== 'false';
  const robotsContent = allowAll 
    ? `User-agent: *\nAllow: /\nDisallow: /lang/\n\nSitemap: ${baseUrl}/sitemap.xml` 
    : `User-agent: *\nDisallow: /\n\nSitemap: ${baseUrl}/sitemap.xml`;
  res.send(robotsContent);
});

// llms.txt for AI search engines
app.get('/llms.txt', (req, res) => {
  res.type('text/plain');
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const llmsContent = `# Sweet Home Real Estate Platform

## About
Sweet Home is a real estate agency platform specializing in luxury properties in Cyprus, Dubai, and Berlin. We help buyers find their dream homes and assist sellers with property management and sales services.

## Main Content Areas
- **Properties**: Browse luxury apartments, villas, and real estate investments with advanced search and filtering
- **Projects**: Explore real estate development projects in Cyprus and Dubai
- **Blog**: Real estate insights, market analysis, and investment guides
- **Services**: Property consulting, management, and financial services
- **About**: Learn about our team and expertise

## Languages
The website is available in three languages:
- English (en)
- Spanish (es)
- German (de)

## Key Features
- Property listings with detailed information, photos, and interactive maps
- Project showcases with pricing, unit types, and amenities
- Blog posts covering real estate trends and investment advice
- Mortgage calculator for property financing
- Multi-language support for international clients

## Important Pages
- Home: ${baseUrl}/
- Properties: ${baseUrl}/properties
- Projects: ${baseUrl}/projects
- Blog: ${baseUrl}/blog
- Services: ${baseUrl}/services
- About: ${baseUrl}/about
- Contact: ${baseUrl}/contact

## Sitemap
For a complete list of all pages, see: ${baseUrl}/sitemap.xml

## Contact
For inquiries, visit: ${baseUrl}/contact
`;
  res.send(llmsContent);
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