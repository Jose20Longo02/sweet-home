// routes/adminRoutes.js

const express = require('express');
const router  = express.Router();
const { ensureAuthenticated, ensureSuperAdmin, ensureAdmin } = require('../middleware/authorize');
const adminController      = require('../controllers/adminController');
const { showProfile, updateProfile } = require('../controllers/adminController');


//SUPERADMIN

// Super-Admin Dashboard
router.get(
  '/',
  ensureAuthenticated,
  ensureSuperAdmin,
  adminController.dashboard
);



// EDIT PROFILE
// GET /superadmin/dashboard/profile
router.get(
  '/profile',
  ensureAuthenticated,
  ensureSuperAdmin,
  adminController.showProfile
);

// POST /superadmin/dashboard/profile
router.post(
  '/profile',
  ensureAuthenticated,
  ensureSuperAdmin,
  uploadProfilePic,      // your multer middleware for profile pictures
  adminController.updateProfile
);



// Team Management (formerly Agents)
router.get(
  '/team',
  ensureAuthenticated,
  ensureSuperAdmin,
  adminController.listAgents
);
router.post(
  '/team/:id/approve',
  ensureAuthenticated,
  ensureSuperAdmin,
  adminController.approveAgent
);
router.post(
  '/team/:id/reject',
  ensureAuthenticated,
  ensureSuperAdmin,
  adminController.rejectAgent
);














//ADMIN


router.get('/', ensureAuthenticated, ensureAdmin, adminController.adminDashboard);

module.exports = router;