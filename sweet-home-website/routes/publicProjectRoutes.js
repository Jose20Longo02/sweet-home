// routes/publicProjectRoutes.js
const express = require('express');
const router  = express.Router();

const { listProjectsPublic, showProject, incrementView: incrementProjectView } = require('../controllers/projectController');
const pdfController = require('../controllers/pdfController');

// Public projects listing with filters and pagination
router.get('/', listProjectsPublic);

// API endpoint must be declared before :slug route
router.post('/api/:id/view', incrementProjectView);

// Split hero for Cyprus vs Dubai
router.get('/regions', (req, res) => {
  const baseUrl = res.locals.baseUrl;
  res.render('projects/regions', {
    headPartial: '../partials/seo/regions-head',
    canonicalUrl: `${baseUrl}/projects/regions`,
    useHomeHeader: true
  });
});

// PDF expose generation (must be before slug route)
router.get('/:slug/pdf', pdfController.generateProjectPDF);

// Static pages
router.get('/about', (req, res) => res.render('about', { title: 'About' }));
router.get('/contact', (req, res) => res.render('contact', { title: 'Contact' }));
router.get('/terms', (req, res) => res.render('terms', { title: 'Terms & Conditions' }));
router.get('/privacy', (req, res) => res.render('privacy', { title: 'Privacy Policy' }));
router.get('/cookies', (req, res) => res.render('cookies', { title: 'Cookies Policy' }));

// Public project detail by slug (keep last)
router.get('/:slug', showProject);

module.exports = router;


