// routes/adminUserRoutes.js
const express       = require('express');
const router        = express.Router();
const { ensureAuthenticated, ensureAdmin } = require('../middleware/authorize');
const adminController = require('../controllers/adminController');
const uploadProfilePic   = require('../middleware/uploadProfilePic');
const propertyController   = require('../controllers/propertyController');
const projectController  = require('../controllers/projectController');
const uploadProjectMedia = require('../middleware/uploadProjectMedia');

// Allow Admin and SuperAdmin
const allowStaff = (req, res, next) => {
  const role = req.session.user?.role;
  return (role === 'Admin' || role === 'SuperAdmin')
    ? next()
    : res.status(403).send('Forbidden – staff only');
};

//ADMIN


router.get('/', ensureAuthenticated, ensureAdmin, adminController.adminDashboard);

// EDIT PROFILE
router.get('/profile',
  ensureAuthenticated,
  ensureAdmin,
  adminController.showAdminProfile
);

router.post('/profile',
  ensureAuthenticated,
  ensureAdmin,
  uploadProfilePic,
  adminController.updateAdminProfile
);

router.get('/my-properties', ensureAuthenticated, ensureAdmin, propertyController.listMyProperties);
// Projects management (all staff)
router.get('/projects', ensureAuthenticated, ensureAdmin, projectController.listProjectsForAdmin);
router.get('/projects/new', ensureAuthenticated, allowStaff, projectController.newProjectForm);
router.post('/projects', ensureAuthenticated, allowStaff, uploadProjectMedia, projectController.createProject);
router.get('/projects/:id/edit', ensureAuthenticated, allowStaff, projectController.editProjectForm);
router.post('/projects/:id', ensureAuthenticated, allowStaff, uploadProjectMedia, projectController.updateProject);
router.post('/projects/:id/delete', ensureAuthenticated, allowStaff, projectController.deleteProject);

module.exports = router;