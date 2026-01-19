// routes/propertyRoutes.js
const express                 = require('express');
const { ensureAuthenticated, ensureAdmin, ensureSuperAdmin } = require('../middleware/authorize');
const uploadPropertyMedia     = require('../middleware/uploadPropertyMedia');
const propertyController      = require('../controllers/propertyController');
const pdfController           = require('../controllers/pdfController');
const { body } = require('express-validator');

const {
  listPropertiesPublic,
  showProperty,
  newPropertyForm,
  createProperty,
  editPropertyForm,
  updateProperty,
  deleteProperty,
  listPropertiesAdmin,
  deletePropertyAdmin,
  reassignProperty,
  getFeaturedProperties
} = propertyController;

// ———————————————————————————————————————————————
// Public & Agent Router (mount at `/properties`)
// ———————————————————————————————————————————————
const publicRouter = express.Router();

// Allow both Admin and SuperAdmin for creation endpoints
const allowStaff = (req, res, next) => {
  const role = req.session.user?.role;
  return (role === 'Admin' || role === 'SuperAdmin')
    ? next()
    : res.status(403).send('Forbidden – staff only');
};

publicRouter.get('/',             listPropertiesPublic);

// Agent-only (placed before slug route to avoid being captured as a slug)
publicRouter.get('/new',          ensureAuthenticated, allowStaff, newPropertyForm);
publicRouter.post('/',            ensureAuthenticated, allowStaff, uploadPropertyMedia,
  [
    body('title').isString().trim().isLength({ min: 2, max: 255 }),
    body('country').isString().trim().isLength({ max: 100 }),
    body('city').isString().trim().isLength({ max: 100 }),
    body('type').isString().trim().isIn(['Apartment','House','Villa','Land'])
  ],
  createProperty
);
publicRouter.get('/:id/edit',     ensureAuthenticated, allowStaff, editPropertyForm);
publicRouter.post('/:id',         ensureAuthenticated, allowStaff, uploadPropertyMedia,
  [
    body('title').optional({ checkFalsy: true }).isString().trim().isLength({ max: 255 }),
    body('country').optional({ checkFalsy: true }).isString().trim().isLength({ max: 100 }),
    body('city').optional({ checkFalsy: true }).isString().trim().isLength({ max: 100 })
  ],
  updateProperty
);
publicRouter.post('/:id/delete',  ensureAuthenticated, ensureAdmin, deleteProperty);

// API endpoints (place before slug)
publicRouter.get('/api/featured', getFeaturedProperties);
publicRouter.get('/api/similar',  propertyController.getSimilarProperties);
publicRouter.post('/api/:id/view', (req, res, next) => propertyController.incrementView(req, res, next));

// Backward-compatible alias for client code expecting /api/properties/similar
publicRouter.get('/api/properties/similar',  propertyController.getSimilarProperties);

// PDF expose generation (must be before slug route)
publicRouter.get('/:slug/pdf',   pdfController.generatePropertyPDF);

// Keep slug route last
publicRouter.get('/:slug',        showProperty);

// ———————————————————————————————————————————————
// Super-Admin Router (mount at `/admin/properties`)
// ———————————————————————————————————————————————
const adminRouter = express.Router();

// List & delete
adminRouter.get('/',              ensureAuthenticated, ensureSuperAdmin, listPropertiesAdmin);
adminRouter.post('/:id/delete',   ensureAuthenticated, ensureSuperAdmin, deletePropertyAdmin);

// Reassign handler
adminRouter.post(
  '/:id/reassign',
  ensureAuthenticated,
  ensureSuperAdmin,
  reassignProperty
);

module.exports = {
  publicRouter,
  adminRouter
};