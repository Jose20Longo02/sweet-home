// controllers/adminController.js
const { query } = require('../config/db');
const bcrypt = require('bcrypt');
const areaRoles = require('../config/roles');
const sendMail = require('../config/mailer');
const locations   = require('../config/locations');
const fs   = require('fs');
const path = require('path');


//SUPERADMIN


// Helper to count pending account requests
async function getPendingCount() {
  const res = await query(`
    SELECT COUNT(*)
      FROM users
     WHERE role IN ('Admin','SuperAdmin')
       AND approved = false
  `);
  return parseInt(res.rows[0].count, 10);
}

/**
 * Render the Super Admin Dashboard with key metrics.
 */
exports.dashboard = async (req, res, next) => {
  try {
    const pendingCount = await getPendingCount();

    // 1) Basic counts
    const [
      totalTeamRes,
      totalPropsRes,
      totalProjectsRes,
      newListingsRes
    ] = await Promise.all([
      query("SELECT COUNT(*) FROM users WHERE role IN ('Admin','SuperAdmin') AND approved = true"),
      query('SELECT COUNT(*) FROM properties'),
      query('SELECT COUNT(*) FROM projects'),
      query("SELECT COUNT(*) FROM properties WHERE created_at >= NOW() - INTERVAL '7 days'")
    ]);

    const totalProps = parseInt(totalPropsRes.rows[0].count, 10);

    // prepare empty placeholders
    let topProperties = [], topAgents = [], topPlaces = [];

    if (totalProps > 0) {
      // 2) Top 5 properties by views
      const topPropsPromise = query(`
        SELECT p.id, p.slug, p.title, p.photos, ps.views
          FROM properties p
          JOIN property_stats ps ON p.id = ps.property_id
         ORDER BY ps.views DESC
         LIMIT 5
      `);

      // 3) Top 5 agents by # of properties assigned (only those with at least 1)
      const topAgentsPromise = query(`
        SELECT u.id, u.name, u.profile_picture, COUNT(p.id) AS property_count
          FROM users u
          LEFT JOIN properties p ON u.id = p.agent_id
         WHERE u.role IN ('Admin','SuperAdmin') AND u.approved = true
         GROUP BY u.id
         HAVING COUNT(p.id) > 0
         ORDER BY property_count DESC
         LIMIT 5
      `);

      // 4) Top 5 places by summed property views
      const useCountry = Object.keys(locations).length > 5;
      const placeField = useCountry ? 'p.country' : 'p.city';
      const topPlacesPromise = query(`
        SELECT ${placeField} AS place,
               SUM(ps.views) AS total_views
          FROM properties p
          JOIN property_stats ps ON p.id = ps.property_id
         GROUP BY ${placeField}
         ORDER BY total_views DESC
         LIMIT 5
      `);

      const [propsRes, agentsRes, placesRes] = await Promise.all([
        topPropsPromise,
        topAgentsPromise,
        topPlacesPromise
      ]);

      // Normalize photos to arrays for EJS and map field names to what the view expects
      const normalizePhotos = (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          const str = val.trim();
          if (!str) return [];
          if (str.startsWith('[')) {
            try { const arr = JSON.parse(str); return Array.isArray(arr) ? arr : []; } catch (_) { return []; }
          }
          if (str.startsWith('{') && str.endsWith('}')) {
            return str.slice(1, -1).split(',').map(s => s.replace(/^\"|\"$/g, '').trim()).filter(Boolean);
          }
          return [str];
        }
        return [];
      };

      topProperties = (propsRes.rows || []).map(p => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        photos: normalizePhotos(p.photos),
        views: Number(p.views || 0)
      }));

      topAgents = (agentsRes.rows || []).map(a => ({
        id: a.id,
        name: a.name,
        profile_picture: a.profile_picture || null,
        propertyCount: Number(a.property_count || 0)
      }));

      topPlaces = (placesRes.rows || []).map(pl => ({
        name: pl.place,
        totalViews: Number(pl.total_views || 0)
      }));
    }

    // 5) Render view
    res.render('superadmin/super-admin-dashboard', {
      totalTeamMembers: totalTeamRes.rows[0].count,
      totalProperties:  totalProps,
      totalProjects:    totalProjectsRes.rows[0].count,
      newListings:      newListingsRes.rows[0].count,
      pendingCount,
      currentUser:      req.session.user,

      // for the carousels
      topProperties,
      topAgents,
      topPlaces,
      activePage: 'dashboard'
    });
  } catch (err) {
    next(err);
  }
};




// ———————————————————————————————
// SUPERADMIN profile handlers
// ———————————————————————————————
exports.showSuperAdminProfile = async (req, res, next) => {
  try {
    const pendingCount = await getPendingCount();
    // Fetch fresh user to ensure area/position/profile_picture/phone are present on initial load
    const { rows } = await query(
      `SELECT id, name, email, role, approved, area, position, profile_picture, phone
         FROM users WHERE id = $1`,
      [req.session.user.id]
    );
    const user = rows[0] || req.session.user;
    // Update session with fresh values without dropping existing fields
    req.session.user = { ...req.session.user, ...user };

    res.render('superadmin/profile/edit-profile', {
      user,
      error: null,
      success: null,
      areaRoles,
      pendingCount,
      currentUser: req.session.user,
      activePage: 'profile'
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSuperAdminProfile = async (req, res, next) => {
  try {
    const { name, email, password, passwordConfirm, area, position, phone } = req.body;

    if ((password || passwordConfirm) && password !== passwordConfirm) {
      const pendingCount = await getPendingCount();
      return res.render('superadmin/profile/edit-profile', {
        user: req.session.user,
        areaRoles,
        error: 'Passwords do not match',
        success: null,
        pendingCount,
        currentUser: req.session.user,
        activePage: 'profile'
      });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    fields.push(`name = $${idx++}`);     values.push(name);
    fields.push(`email = $${idx++}`);    values.push(email);
    fields.push(`area = $${idx++}`);     values.push(area);
    fields.push(`position = $${idx++}`); values.push(position);
    fields.push(`phone = $${idx++}`);    values.push(phone || null);

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push(`password = $${idx++}`); values.push(hash);
    }

    if (req.file) {
      // Remove previous Spaces object if replacing
      try {
        if (process.env.DO_SPACES_BUCKET && req.session.user.profile_picture) {
          const prevUrl = String(req.session.user.profile_picture);
          if (/^https?:\/\//.test(prevUrl)) {
            const key = prevUrl.replace(/^https?:\/\/[^/]+\//, '');
            const s3 = require('../config/spaces');
            await new Promise((resolve) => s3.deleteObject({ Bucket: process.env.DO_SPACES_BUCKET, Key: key }, () => resolve()));
          }
        }
      } catch (_) {}
      const picUrl = req.file.url || '/uploads/profiles/' + req.file.filename;
      fields.push(`profile_picture = $${idx++}`); values.push(picUrl);
    }

    values.push(req.session.user.id);
    await query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
      values
    );

    const { rows } = await query(
      `SELECT id,name,email,role,approved,area,position,profile_picture,phone
         FROM users WHERE id = $1`,
      [req.session.user.id]
    );
    req.session.user = rows[0];

    return res.redirect('/superadmin/dashboard');
  } catch (err) {
    next(err);
  }
};








// TEAM MANAGEMENT
exports.listTeam = async (req, res, next) => {
  try {
    const pendingCount = await getPendingCount();
    const result = await query(
      `SELECT id, name, email, area, position, profile_picture
         FROM users
        WHERE role IN ('Admin','SuperAdmin') AND approved = true
        ORDER BY name`
    );
    // Exclude developer accounts by email
    const DEV_EMAILS = (process.env.DEVELOPER_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const nonDevMembers = result.rows.filter(m => !DEV_EMAILS.includes(String(m.email || '').toLowerCase()));

    // Get property counts for each member
    const membersWithCounts = await Promise.all(
      nonDevMembers.map(async (member) => {
        const countResult = await query(
          'SELECT COUNT(*) as count FROM properties WHERE agent_id = $1',
          [member.id]
        );
        return {
          ...member,
          property_count: parseInt(countResult.rows[0].count, 10)
        };
      })
    );
    
    res.render('superadmin/team/manage-team', {
      members: membersWithCounts,
      areaRoles,
      currentUser: req.session.user,
      pendingCount,
      activePage: 'team'
    });
  } catch (err) {
    next(err);
  }
};
// controllers/adminController.js
exports.deleteTeamMember = async (req, res, next) => {
  const memberId  = parseInt(req.params.id, 10);
  const currentId = req.session.user.id;

  if (memberId === currentId) {
    return res.status(400).send("You cannot delete your own account.");
  }

  try {
    // 1) “Orphan” all their properties and projects
    await Promise.all([
      query('UPDATE properties SET agent_id = NULL WHERE agent_id = $1', [memberId]),
      query('UPDATE projects   SET agent_id = NULL WHERE agent_id = $1', [memberId])
    ]);

    // 2) Delete their profile picture file
    const { rows } = await query(
      'SELECT profile_picture FROM users WHERE id = $1',
      [memberId]
    );
    const pic = rows[0]?.profile_picture;
    if (pic) {
      if (String(pic).startsWith('/uploads/')) {
        const fullPath = path.join(__dirname, '../public', pic);
        fs.unlink(fullPath, err => { if (err && err.code !== 'ENOENT') console.error('Failed to delete pic:', err); });
      } else if (process.env.DO_SPACES_BUCKET) {
        try {
          const s3 = require('../config/spaces');
          const key = String(pic).replace(/^https?:\/\/[^/]+\//, '');
          await new Promise((resolve) => s3.deleteObject({ Bucket: process.env.DO_SPACES_BUCKET, Key: key }, () => resolve()));
          // Also try deleting the whole folder (profiles/<id>-<slug>/)
          const folderPrefix = key.split('/').slice(0, -1).join('/') + '/';
          let token;
          do {
            const page = await new Promise((resolve, reject) => s3.listObjectsV2({ Bucket: process.env.DO_SPACES_BUCKET, Prefix: folderPrefix, ContinuationToken: token }, (e,d)=>e?reject(e):resolve(d||{})));
            const objs = (page.Contents || []).map(o => ({ Key: o.Key }));
            if (objs.length) await new Promise((resolve,reject)=>s3.deleteObjects({ Bucket: process.env.DO_SPACES_BUCKET, Delete: { Objects: objs } }, (e)=>e?reject(e):resolve()));
            token = page.IsTruncated ? page.NextContinuationToken : undefined;
          } while(token);
        } catch (_) {}
      }
    }

    // 3) Remove the user
    await query('DELETE FROM users WHERE id = $1', [memberId]);

    // 4) Redirect back
    res.redirect('/superadmin/dashboard/team');
  } catch (err) {
    next(err);
  }
};







// ACCOUNT REQUESTS
exports.listRequests = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        id,
        name,
        area,
        position,
        profile_picture,
        role               -- ← pull in the role field!
      FROM users
     WHERE role IN ('Admin','SuperAdmin')
       AND approved = false
  ORDER BY created_at
    `);

    res.render('superadmin/requests/account-requests', {
      requests:     result.rows,
      pendingCount: result.rows.length,
      currentUser:  req.session.user,
      areaRoles,
      activePage: 'requests'
    });
  } catch (err) {
    next(err);
  }
};

exports.changeRequestRole = async (req, res, next) => {
  const userId = req.params.id;
  const newRole = req.body.role;           // either 'Admin' or 'SuperAdmin'
  if (!['Admin','SuperAdmin'].includes(newRole)) {
    return res.status(400).send('Invalid role');
  }
  try {
    await query(
      'UPDATE users SET role = $1 WHERE id = $2',
      [newRole, userId]
    );
    res.redirect('/superadmin/dashboard/requests');
  } catch (err) {
    next(err);
  }
};

exports.approveRequest = async (req, res, next) => {
  try {
    // 1) Mark approved in DB
    await query('UPDATE users SET approved = true WHERE id = $1', [req.params.id]);

    // 2) Fetch user email & name
    const { rows } = await query(
      'SELECT email, name, role FROM users WHERE id = $1',
      [req.params.id]
    );
    const user = rows[0];

    // 3) Send notification
    const info = await sendMail({
      to:      user.email,
      subject: 'Your account has been approved',
      html: `
        <p>Hi ${user.name},</p>
        <p>Your <strong>${user.role}</strong> account has just been <em>approved</em> by our SuperAdmin.</p>
        <p>Welcome aboard!</p>
        <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
      `,
      text: `Hi ${user.name},\n\nYour ${user.role} account has been approved. You can now log in.\n\nWelcome aboard!\n\nBest regards,\nSweet Home Real Estate Investments' team`
    });
    if (process.env.SMTP_DEBUG === 'true') {
      console.log('Approval email dispatched:', info && info.messageId);
    }

    res.redirect('/superadmin/dashboard/requests');
  } catch (err) {
    next(err);
  }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    // 1) Fetch the user’s info (including email & pic)
    const { rows } = await query(
      'SELECT email, name, profile_picture FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).send('User not found');
    }
    const user = rows[0];

    // 2) Delete the DB record
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);

    // 3) Remove the file (if it exists)
    if (user.profile_picture) {
      if (String(user.profile_picture).startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '../public', user.profile_picture);
        fs.unlink(filePath, err => { if (err && err.code !== 'ENOENT') console.error('Failed to delete pic:', err); });
      } else if (process.env.DO_SPACES_BUCKET) {
        try {
          const s3 = require('../config/spaces');
          const url = String(user.profile_picture);
          const bucket = process.env.DO_SPACES_BUCKET;
          const key = url.replace(/^https?:\/\/[^/]+\//, '');
          await new Promise((resolve) => s3.deleteObject({ Bucket: bucket, Key: key }, () => resolve()));
        } catch (_) {}
      }
    }

    // 4) Send the rejection email—**make sure to include `to:`!**
    try {
      await sendMail({
        to:      user.email,               // ← this was missing
        subject: 'Your account request was rejected',
        html: `
          <p>Hi ${user.name},</p>
          <p>We’re sorry, but your account request has been rejected.</p>
          <p>If you believe this is a mistake, please contact support.</p>
          <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
        `,
        text: `
Hi ${user.name},

We’re sorry, but your account request has been rejected.

If you believe this is a mistake, please contact support.
 
 Best regards,
 Sweet Home Real Estate Investments' team
        `
      });
    } catch (mailErr) {
      console.error('Rejection email failed:', mailErr);
      // we don’t block the flow if email fails
    }

    // 5) Redirect back
    res.redirect('/superadmin/dashboard/requests');
  } catch (err) {
    next(err);
  }
};





























//ADMIN



/**
 * Render the Admin Dashboard for a standard Admin user.
 */
exports.adminDashboard = (req, res, next) => {
  // you already fetch any data you need (e.g. pendingCount)
  res.render('admin/admin-dashboard', {
    user: req.session.user
  });
};


// ———————————————————————————————
// ADMIN profile handlers
// ———————————————————————————————
exports.showAdminProfile = (req, res) => {
  res.render('admin/profile/edit-profile', {
    user: req.session.user,
    error: null,
    success: null
  });
};

exports.updateAdminProfile = async (req, res, next) => {
  try {
    const { name, email, password, passwordConfirm } = req.body;

    // Basic validation
    if (!name || !email) {
      return res.render('admin/profile/edit-profile', {
        user: req.session.user,
        error: 'Name and email are required.',
        success: null
      });
    }

    if ((password || passwordConfirm) && password !== passwordConfirm) {
      return res.render('admin/profile/edit-profile', {
        user: req.session.user,
        error: 'Passwords do not match',
        success: null
      });
    }

    // Build dynamic UPDATE — no area/position here
    const fields = [];
    const values = [];
    let idx = 1;

    if (name && name !== req.session.user.name) {
      fields.push(`name = $${idx++}`); values.push(name);
    }
    if (email && email !== req.session.user.email) {
      fields.push(`email = $${idx++}`); values.push(email);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push(`password = $${idx++}`); values.push(hash);
    }
    if (req.file) {
      // Remove previous Spaces object if replacing (Admin profile)
      try {
        if (process.env.DO_SPACES_BUCKET && req.session.user.profile_picture) {
          const prevUrl = String(req.session.user.profile_picture);
          if (/^https?:\/\//.test(prevUrl)) {
            const key = prevUrl.replace(/^https?:\/\/[^/]+\//, '');
            const s3 = require('../config/spaces');
            await new Promise((resolve) => s3.deleteObject({ Bucket: process.env.DO_SPACES_BUCKET, Key: key }, () => resolve()));
          }
        }
      } catch (_) {}
      // Use the Spaces URL if available, otherwise fall back to local path
      const picUrl = req.file.url || '/uploads/profiles/' + req.file.filename;
      fields.push(`profile_picture = $${idx++}`); values.push(picUrl);
    }

    if (fields.length) {
      values.push(req.session.user.id);
      await query(
        `UPDATE users
            SET ${fields.join(', ')},
                updated_at = NOW()
          WHERE id = $${idx}`,
        values
      );
    }

    // Refresh session user
    const { rows } = await query(
      `SELECT id, name, email, role, approved, area, position, profile_picture
         FROM users
        WHERE id = $1`,
      [req.session.user.id]
    );
    req.session.user = rows[0];

    // Back to the right dashboard
    return res.redirect('/admin/dashboard');
  } catch (err) {
    next(err);
  }
};

