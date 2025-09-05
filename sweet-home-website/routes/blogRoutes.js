// routes/blogRoutes.js
const express = require('express');
const { ensureAuthenticated, ensureAdmin, ensureSuperAdmin } = require('../middleware/authorize');
const uploadBlogMedia = require('../middleware/uploadBlogMedia');
const uploadBlogInline = require('../middleware/uploadBlogInline');
const blog = require('../controllers/blogController');

// Public router mounted at /blog
const publicRouter = express.Router();
publicRouter.get('/', blog.listPublic);
publicRouter.get('/:slug', blog.showPublic);

// Admin router mounted at /admin/dashboard/blog
const adminRouter = express.Router();
const allowStaff = (req, res, next) => {
  const role = req.session.user?.role;
  return (role === 'Admin' || role === 'SuperAdmin') ? next() : res.status(403).send('Forbidden – staff only');
};

adminRouter.get('/', ensureAuthenticated, ensureAdmin, blog.listMine);
adminRouter.get('/new', ensureAuthenticated, allowStaff, blog.newForm);
adminRouter.post('/', ensureAuthenticated, allowStaff, uploadBlogMedia, blog.create);
adminRouter.get('/:id/edit', ensureAuthenticated, allowStaff, blog.editForm);
adminRouter.post('/:id', ensureAuthenticated, allowStaff, uploadBlogMedia, blog.update);
adminRouter.post('/:id/delete', ensureAuthenticated, allowStaff, blog.delete);
// Inline image upload
adminRouter.post('/api/inline-image', ensureAuthenticated, allowStaff, uploadBlogInline, blog.uploadInlineImage);

// SuperAdmin router mounted at /superadmin/dashboard/blog
const superAdminRouter = express.Router();
superAdminRouter.get('/', ensureAuthenticated, ensureSuperAdmin, blog.listAll);

module.exports = { publicRouter, adminRouter, superAdminRouter };


