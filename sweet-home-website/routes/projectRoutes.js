// routes/projectRoutes.js
const express = require('express');
const router  = express.Router();
const { ensureAuthenticated, ensureSuperAdmin } = require('../middleware/authorize');
const uploadProjectMedia = require('../middleware/uploadProjectMedia');
const { body } = require('express-validator');

// Make sure this path is correct!
const {
  listProjects,
  listProjectsPublic,
  showProject,
  newProjectForm,
  createProject,
  editProjectForm,
  updateProject,
  deleteProject
} = require('../controllers/projectController');

// Allow both Admin and SuperAdmin for create/edit
const allowStaff = (req, res, next) => {
  const role = req.session.user?.role;
  return (role === 'Admin' || role === 'SuperAdmin')
    ? next()
    : res.status(403).send('Forbidden – staff only');
};

// SuperAdmin dashboard: list/manage projects
router.get('/', ensureAuthenticated, ensureSuperAdmin, listProjects);

// Admin routes
router.get('/admin',               ensureAuthenticated, ensureSuperAdmin, listProjects);
router.get('/new',            ensureAuthenticated, allowStaff, newProjectForm);
router.post('/',              ensureAuthenticated, allowStaff, uploadProjectMedia, createProject);
router.get('/:id/edit',       ensureAuthenticated, allowStaff, editProjectForm);
router.post('/:id',           ensureAuthenticated, allowStaff, uploadProjectMedia,
  [
    body('title').optional({ checkFalsy: true }).isString().trim().isLength({ max: 255 }),
    body('country').optional({ checkFalsy: true }).isString().trim().isLength({ max: 100 }),
    body('city').optional({ checkFalsy: true }).isString().trim().isLength({ max: 100 })
  ],
  updateProject
);
router.post('/:id/delete',    ensureAuthenticated, allowStaff, deleteProject);

module.exports = router;