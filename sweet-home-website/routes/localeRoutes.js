// routes/localeRoutes.js
// Public routes mounted at /en and /es - same structure as root, with locale prefix in path
const express = require('express');
const { query } = require('../config/db');
const propertyController = require('../controllers/propertyController');
const { publicRouter: propertyRoutes } = require('./propertyRoutes');
const publicProjectRoutes = require('./publicProjectRoutes');
const { publicRouter: blogPublicRoutes } = require('./blogRoutes');

function createLocaleRouter(renderHomePage) {
  const router = express.Router();

  // Home
  router.get('/', (req, res, next) => renderHomePage(req, res, req.baseUrl, next));

  // Static pages
  router.get('/about', async (req, res, next) => {
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
      const DEV_EMAILS = (process.env.DEVELOPER_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);
      const filtered = rows.filter(u => !DEV_EMAILS.includes(String(u.email || '').toLowerCase()));
      let areaOrder = [];
      try { areaOrder = Object.keys(require('../config/roles')) || []; } catch (_) {}
      res.render('about', {
        title: (res.locals.t && typeof res.locals.t === 'function') ? res.locals.t('nav.about', 'About') : 'About',
        team: filtered,
        useMainContainer: false,
        areaOrder,
        canonicalUrl: `${res.locals.baseUrl}${req.baseUrl}/about`
      });
    } catch (err) { next(err); }
  });

  router.get('/contact', (req, res) => {
    const title = (res.locals.t && typeof res.locals.t === 'function') ? res.locals.t('nav.contact', 'Contact') : 'Contact';
    res.render('contact', { title, canonicalUrl: `${res.locals.baseUrl}${req.baseUrl}/contact` });
  });

  router.get('/terms', (req, res) => {
    const baseUrl = res.locals.baseUrl;
    const title = (res.locals.t && typeof res.locals.t === 'function') ? res.locals.t('legal.terms.title', 'Terms & Conditions') : 'Terms & Conditions';
    res.render('terms', {
      title,
      headPartial: '../partials/seo/terms-head',
      canonicalUrl: `${baseUrl}${req.baseUrl}/terms`
    });
  });

  router.get('/privacy', (req, res) => {
    const baseUrl = res.locals.baseUrl;
    const title = (res.locals.t && typeof res.locals.t === 'function') ? res.locals.t('legal.privacy.title', 'Privacy Policy') : 'Privacy Policy';
    res.render('privacy', {
      title,
      headPartial: '../partials/seo/privacy-head',
      canonicalUrl: `${baseUrl}${req.baseUrl}/privacy`
    });
  });

  router.get('/cookies', (req, res) => {
    const t = (res.locals.t && typeof res.locals.t === 'function') ? res.locals.t.bind(res.locals) : ((k, fb) => fb);
    res.render('cookies', {
      title: t('legal.cookies.title', 'Cookies Policy'),
      pageMetaDescription: t('legal.cookies.metaDescription', 'Learn how Sweet Home uses essential, analytics, and marketing cookies, and how you can manage cookie preferences in your browser.'),
      canonicalUrl: `${res.locals.baseUrl}${req.baseUrl}/cookies`
    });
  });

  router.get('/services', (req, res) => {
    const baseUrl = res.locals.baseUrl;
    const title = (res.locals.t && typeof res.locals.t === 'function') ? res.locals.t('nav.services', 'Services') : 'Services';
    res.render('services', {
      title,
      useMainContainer: false,
      canonicalUrl: `${baseUrl}${req.baseUrl}/services`
    });
  });

  router.get('/owners', async (req, res, next) => {
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
      const baseUrl = res.locals.baseUrl;
      res.render('owners', {
        title: (res.locals.t && typeof res.locals.t === 'function') ? res.locals.t('nav.owners', 'For Sellers') : 'For Sellers',
        useMainContainer: false,
        soldProperties: properties,
        canonicalUrl: `${baseUrl}${req.baseUrl}/owners`
      });
    } catch (e) { next(e); }
  });

  // Sub-routers
  router.use('/projects', publicProjectRoutes);
  router.use('/properties', propertyRoutes);
  router.use('/blog', blogPublicRoutes);

  return router;
}

module.exports = { createLocaleRouter };
