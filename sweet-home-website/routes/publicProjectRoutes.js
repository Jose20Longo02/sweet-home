// routes/publicProjectRoutes.js
const express = require('express');
const router  = express.Router();

const { listProjectsPublic, showProject, incrementView: incrementProjectView } = require('../controllers/projectController');
const pdfController = require('../controllers/pdfController');

// Public projects listing with filters and pagination
router.get('/', listProjectsPublic);

// Split hero for Cyprus vs Dubai
router.get('/regions', (req, res) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  res.render('projects/regions', {
    baseUrl,
    headPartial: '../partials/seo/regions-head',
    canonicalUrl: `${baseUrl}/projects/regions`
  });
});

// PDF expose generation (must be before slug route)
router.get('/:slug/pdf', pdfController.generateProjectPDF);

// Public project detail by slug
router.get('/:slug', showProject);
router.post('/api/:id/view', incrementProjectView);

// Static pages
router.get('/about', (req, res) => res.render('about', { title: 'About' }));
router.get('/contact', (req, res) => res.render('contact', { title: 'Contact' }));
router.get('/terms', (req, res) => res.render('terms', { title: 'Terms & Conditions' }));
router.get('/privacy', (req, res) => res.render('privacy', { title: 'Privacy Policy' }));
router.get('/cookies', (req, res) => res.render('cookies', { title: 'Cookies Policy' }));

module.exports = router;


