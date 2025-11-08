// routes/superAdminRoutes.js
const uploadProfilePic = require('../middleware/uploadProfilePic');
const express            = require('express');
const router             = express.Router();
const { ensureAuthenticated, ensureSuperAdmin } = require('../middleware/authorize');
const sendMail           = require('../config/mailer');
const adminController    = require('../controllers/adminController');
const areaRoles          = require('../config/roles');
const path               = require('path');
const fs                 = require('fs');
const { generateVariants } = require('../middleware/imageVariants');


// GET /superadmin/dashboard
router.get(
  '/',
  ensureAuthenticated,
  ensureSuperAdmin,
  adminController.dashboard
);



router.get('/profile',
  ensureAuthenticated,
  ensureSuperAdmin,
  adminController.showSuperAdminProfile
);

router.post('/profile',
  ensureAuthenticated,
  ensureSuperAdmin,
  uploadProfilePic,
  adminController.updateSuperAdminProfile
);










// Team Management (formerly Agents)
router.get(
  '/team',
  ensureAuthenticated,
  ensureSuperAdmin,
  adminController.listTeam
);

// Edit team member (form)
router.get(
  '/team/:id/edit',
  ensureAuthenticated,
  ensureSuperAdmin,
  async (req, res, next) => {
    try {
      const { query } = require('../config/db');
      const { rows } = await query(
        'SELECT id, name, email, phone, profile_picture, role, area, position, bmby_username FROM users WHERE id = $1',
        [req.params.id]
      );
      if (!rows.length) return res.status(404).send('User not found');
      const member = rows[0];
      const pendingCountRes = await query("SELECT COUNT(*) AS count FROM users WHERE approved = false AND role IN ('Admin','SuperAdmin')");
      const pendingCount = parseInt(pendingCountRes.rows[0].count, 10);
      res.render('superadmin/team/edit-member', { member, areaRoles, pendingCount, error: null });
    } catch (err) { next(err); }
  }
);

// Update team member (submit)
router.post(
  '/team/:id/edit',
  ensureAuthenticated,
  ensureSuperAdmin,
  uploadProfilePic,
  async (req, res, next) => {
    try {
      const { query } = require('../config/db');
      const { name, email, phone, role, area, position, bmby_username } = req.body;
      if (!['Admin','SuperAdmin'].includes(role)) return res.status(400).send('Invalid role');
      // Build dynamic update
      const fields = [];
      const values = [];
      let idx = 1;

      if (name)  { fields.push(`name = $${idx++}`);  values.push(name); }
      if (email) { fields.push(`email = $${idx++}`); values.push(email); }
      if (typeof phone !== 'undefined') { fields.push(`phone = $${idx++}`); values.push(phone || null); }
      fields.push(`role = $${idx++}`);      values.push(role);
      fields.push(`area = $${idx++}`);      values.push(area);
      fields.push(`position = $${idx++}`);  values.push(position);
      if (typeof bmby_username !== 'undefined') {
        fields.push(`bmby_username = $${idx++}`);
        values.push(bmby_username ? bmby_username.trim() : null);
      }

      // Optional profile picture update
      if (req.file) {
        try {
          // Delete previous Spaces object if applicable
          if (process.env.DO_SPACES_BUCKET) {
            const prev = await query('SELECT profile_picture FROM users WHERE id = $1', [req.params.id]);
            const prevUrl = prev.rows[0] && prev.rows[0].profile_picture;
            if (prevUrl && /^https?:\/\//.test(String(prevUrl))) {
              const key = String(prevUrl).replace(/^https?:\/\/[^/]+\//, '');
              const s3 = require('../config/spaces');
              await new Promise((resolve) => s3.deleteObject({ Bucket: process.env.DO_SPACES_BUCKET, Key: key }, () => resolve()));
            }
          }
        } catch (_) {}
        const picUrl = req.file.url || ('/uploads/profiles/' + req.file.filename);
        fields.push(`profile_picture = $${idx++}`); values.push(picUrl);
      }

      values.push(req.params.id);
      await query(
        `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
        values
      );
      res.redirect('/superadmin/dashboard/team');
    } catch (err) { next(err); }
  }
);

// DELETE team member
router.post(
  '/team/:id/delete',
  ensureAuthenticated,
  ensureSuperAdmin,
  adminController.deleteTeamMember
);










//ACCOUNT REQUESTS
// List all requests
router.get(
  '/requests',
  ensureAuthenticated,
  ensureSuperAdmin,
  adminController.listRequests
);

// Update requested user’s role
router.post(
  '/requests/:id/role',
  ensureAuthenticated,
  ensureSuperAdmin,
  adminController.changeRequestRole
);

// Approve one
router.post(
  '/requests/:id/approve',
  ensureAuthenticated,
  ensureSuperAdmin,
  adminController.approveRequest
);

// Reject one
router.post(
  '/requests/:id/reject',
  ensureAuthenticated,
  ensureSuperAdmin,
  adminController.rejectRequest
);




module.exports = router;

// Diagnostic (SuperAdmin only): Verify SMTP and send test email
router.get(
  '/email-test',
  ensureAuthenticated,
  ensureSuperAdmin,
  async (req, res, next) => {
    try {
      const to = (req.query.to || req.session.user?.email || '').trim();
      const summary = (sendMail.summary && sendMail.summary()) || {};
      let verifyOk = false;
      let verifyError = null;
      try {
        await (sendMail.verify && sendMail.verify());
        verifyOk = true;
      } catch (e) {
        verifyError = e && (e.stack || e.message || String(e));
      }

      let sendInfo = null;
      let sendError = null;
      if (to) {
        try {
          sendInfo = await sendMail({
            to,
            subject: 'SMTP test email',
            html: '<p>This is a test email from the RealEstate template.</p>',
            text: 'This is a test email from the RealEstate template.'
          });
        } catch (e) {
          sendError = e && (e.stack || e.message || String(e));
        }
      }

      res.json({ summary, verifyOk, verifyError, to, sendInfo, sendError });
    } catch (err) { next(err); }
  }
);

// Backfill image variants for existing uploads (projects/properties)
router.post(
  '/media/backfill',
  ensureAuthenticated,
  ensureSuperAdmin,
  async (req, res, next) => {
    try {
      const type = (req.body.type || req.query.type || 'projects').toLowerCase();
      const singleId = String(req.body.id || req.query.id || '').trim();
      const baseDir = type === 'properties'
        ? path.join(__dirname, '../public/uploads/properties')
        : path.join(__dirname, '../public/uploads/projects');
      const processed = [];
      const skipped = [];
      const errors = [];

      const targetDirs = [];
      if (singleId) {
        targetDirs.push(path.join(baseDir, singleId));
      } else {
        if (!fs.existsSync(baseDir)) return res.json({ ok: true, processed: 0, skipped: 0, errors: [], note: 'Base directory does not exist yet.' });
        for (const name of fs.readdirSync(baseDir)) {
          const full = path.join(baseDir, name);
          if (fs.statSync(full).isDirectory()) targetDirs.push(full);
        }
      }

      for (const dir of targetDirs) {
        const id = path.basename(dir);
        if (!fs.existsSync(dir)) continue;
        for (const file of fs.readdirSync(dir)) {
          const abs = path.join(dir, file);
          if (!fs.statSync(abs).isFile()) continue;
          const lower = file.toLowerCase();
          // Skip already-generated variants
          if (/-(320|640|960|1280|1920)\.(jpg|jpeg|webp|avif)$/.test(lower)) { skipped.push(abs); continue; }
          // Accept only common source types
          if (!/(\.jpg|\.jpeg|\.png)$/i.test(lower)) { skipped.push(abs); continue; }
          try {
            const publicUrlBase = type === 'properties' ? `/uploads/properties/${id}` : `/uploads/projects/${id}`;
            await generateVariants(abs, publicUrlBase);
            processed.push(abs);
          } catch (e) {
            errors.push({ file: abs, error: (e && (e.message || e)) });
          }
        }
      }

      res.json({ ok: true, processed: processed.length, skipped: skipped.length, errors });
    } catch (err) { next(err); }
  }
);

// GET alias for convenience in browser
router.get(
  '/media/backfill',
  ensureAuthenticated,
  ensureSuperAdmin,
  async (req, res, next) => {
    try {
      const type = (req.query.type || 'projects').toLowerCase();
      const id = req.query.id || '';
      // Reuse the POST logic by faking a body
      req.body = { type, id };
      // Call the POST handler inline
      const handler = async (req2, res2) => {
        const baseDir = type === 'properties'
          ? path.join(__dirname, '../public/uploads/properties')
          : path.join(__dirname, '../public/uploads/projects');
        const processed = [];
        const skipped = [];
        const errors = [];

        const targetDirs = [];
        if (id) {
          targetDirs.push(path.join(baseDir, String(id)));
        } else {
          if (!fs.existsSync(baseDir)) return res2.json({ ok: true, processed: 0, skipped: 0, errors: [], note: 'Base directory does not exist yet.' });
          for (const name of fs.readdirSync(baseDir)) {
            const full = path.join(baseDir, name);
            if (fs.statSync(full).isDirectory()) targetDirs.push(full);
          }
        }

        for (const dir of targetDirs) {
          const folderId = path.basename(dir);
          if (!fs.existsSync(dir)) continue;
          for (const file of fs.readdirSync(dir)) {
            const abs = path.join(dir, file);
            if (!fs.statSync(abs).isFile()) continue;
            const lower = file.toLowerCase();
            if (/-(320|640|960|1280|1920)\.(jpg|jpeg|webp|avif)$/.test(lower)) { skipped.push(abs); continue; }
            if (!/(\.jpg|\.jpeg|\.png)$/i.test(lower)) { skipped.push(abs); continue; }
            try {
              const publicUrlBase = type === 'properties' ? `/uploads/properties/${folderId}` : `/uploads/projects/${folderId}`;
              await generateVariants(abs, publicUrlBase);
              processed.push(abs);
            } catch (e) {
              errors.push({ file: abs, error: (e && (e.message || e)) });
            }
          }
        }

        res2.json({ ok: true, processed: processed.length, skipped: skipped.length, errors });
      };
      await handler(req, res);
    } catch (err) { next(err); }
  }
);