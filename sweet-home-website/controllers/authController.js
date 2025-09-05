// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcrypt');
const areaRoles = require('../config/roles');
const { query } = require('../config/db');
const fs        = require('fs');
const path      = require('path');
const crypto    = require('crypto');
const sendMail  = require('../config/mailer');

// controllers/authController.js

// Show the login form (GET /auth/login)
exports.loginPage = (req, res) => {
  const awaitingApproval = req.query.awaitingApproval === 'true';
  const role             = req.query.role || null;

  res.render('auth/login', {
    title: 'Sign In',
    awaitingApproval,
    role,
    error: null
  });
};

// Handle login form submission (POST /auth/login)
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Look up user
    const { rows } = await query(
      'SELECT id, name, email, password, role, approved, profile_picture, area, position FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (rows.length === 0) {
      return res.render('auth/login', {
        title: 'Sign In',
        awaitingApproval: false,
        role: null,
        error: "This account doesn't exist"
      });
    }
    const user = rows[0];

    // 2) Check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render('auth/login', {
        title: 'Sign In',
        awaitingApproval: false,
        role: null,
        error: 'The password is incorrect'
      });
    }

    // 3) Check approval
    if (!user.approved) {
      return res.render('auth/login', {
        title: 'Sign In',
        awaitingApproval: false,
        role: null,
        error: 'This account is still waiting for approval'
      });
    }

    // 4) All good → establish session & redirect
    delete user.password;
    req.session.user = user;
    if (user.role === 'SuperAdmin') {
      return res.redirect('/superadmin/dashboard');
    }
    return res.redirect('/admin/dashboard');
  } catch (err) {
    next(err);
  }
};




// Show registration form
exports.registerPage = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT COUNT(*) AS count
         FROM users
        WHERE role IN ('Admin','SuperAdmin')
          AND approved = false`
    );
    const pendingCount = parseInt(rows[0].count, 10);
    res.render('auth/register', {
      areaRoles,
      pendingCount,
      error: null
    });
  } catch (err) {
    next(err);
  }
};



// Handle registration submission
exports.register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      passwordConfirm,
      area,
      position
    } = req.body;

    // Determine role by area
    const role = ['Administrative', 'Management'].includes(area)
      ? 'SuperAdmin'
      : 'Admin';

    // Validate inputs
    if (!name || !email || !password || !passwordConfirm || !area || !position) {
      return res.render('auth/register', {
        areaRoles,
        pendingCount: 0,
        error: 'All fields are required'
      });
    }
    if (password !== passwordConfirm) {
      return res.render('auth/register', {
        areaRoles,
        pendingCount: 0,
        error: 'Passwords do not match'
      });
    }

    // Check email uniqueness
    const exists = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (exists.rows.length) {
      return res.render('auth/register', {
        areaRoles,
        pendingCount: 0,
        error: 'Email already in use'
      });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Build fields/values for INSERT
    const fields = ['name','email','password','role','approved','area','position'];
    const values = [name, email, hash, role, false, area, position];

    // Handle optional profile picture
    let tempFilename;
    if (req.file) {
      tempFilename = req.file.filename;
      fields.push('profile_picture');
      values.push('/uploads/profiles/' + tempFilename);
    }

    // Perform INSERT and get new ID
    const placeholders = values.map((_,i) => `$${i+1}`).join(',');
    const insertRes = await query(
      `INSERT INTO users (${fields.join(',')}) VALUES (${placeholders}) RETURNING id`,
      values
    );
    const newId = insertRes.rows[0].id;

    // Rename temp file to final {profile-newId.ext}
    if (tempFilename) {
      const uploadDir = path.join(__dirname, '../public/uploads/profiles');
      const ext       = path.extname(tempFilename);
      const oldPath   = path.join(uploadDir, tempFilename);
      const newName   = `profile-${newId}${ext}`;
      const newPath   = path.join(uploadDir, newName);
      fs.renameSync(oldPath, newPath);
      // Update user record with final path
      await query(
        'UPDATE users SET profile_picture = $1 WHERE id = $2',
        ['/uploads/profiles/' + newName, newId]
      );
    }

    // Redirect to login with success param
    return res.redirect(`/auth/login?awaitingApproval=true&role=${role}`);
  } catch (err) {
    next(err);
  }
};


// New: AJAX endpoint to see if an email is already taken
exports.checkEmail = async (req, res, next) => {
  try {
    const { email } = req.query;
    const result = await query(
      'SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    next(err);
  }
};





exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
};


// ———————————————————————————————————————————————
// Password reset: request form (GET /auth/forgot)
// ———————————————————————————————————————————————
exports.forgotPasswordPage = (req, res) => {
  res.render('auth/forgot', {
    title: 'Forgot your password?',
    error: null,
    sent: false
  });
};

// Handle password reset request (POST /auth/forgot)
exports.forgotPassword = async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    // Always respond the same to prevent user enumeration
    const genericResponse = () => res.render('auth/forgot', {
      title: 'Forgot your password?',
      error: null,
      sent: true
    });

    if (!email) return genericResponse();

    if (process.env.SMTP_DEBUG === 'true') {
      try { console.log('[Forgot] Incoming request for:', email); } catch (_) {}
    }

    // Look up user by email
    const { rows } = await query('SELECT id, email, name, reset_requested_at FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (process.env.SMTP_DEBUG === 'true') {
      try { console.log('[Forgot] User found:', !!rows.length); } catch (_) {}
    }
    if (!rows.length) return genericResponse();
    const user = rows[0];

    // Simple rate-limit: if a request was made in the last 2 minutes, do nothing
    if (user.reset_requested_at) {
      const last = new Date(user.reset_requested_at);
      const now = new Date();
      const diffMs = now.getTime() - last.getTime();
      if (diffMs < 2 * 60 * 1000) {
        if (process.env.SMTP_DEBUG === 'true') {
          try { console.log('[Forgot] Rate-limited, last request', diffMs, 'ms ago'); } catch (_) {}
        }
        return genericResponse();
      }
    }

    // Create a secure token and store a hash + expiry
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresInMinutes = 60; // 1 hour
    try {
      await query(
      `UPDATE users
          SET reset_token_hash = $1,
              reset_token_expires_at = NOW() + INTERVAL '${expiresInMinutes} minutes',
              reset_requested_at = NOW()
        WHERE id = $2`,
        [tokenHash, user.id]
      );
    } catch (e) {
      if (process.env.SMTP_DEBUG === 'true') {
        try { console.warn('[Forgot] Failed to persist token:', e && (e.stack || e.message || e)); } catch (_) {}
      }
      // Still return generic response
      return genericResponse();
    }

    // Email the user the reset link (do not reveal success/failure specifics)
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${baseUrl}/auth/reset?token=${encodeURIComponent(rawToken)}`;
    try {
      const info = await sendMail({
        to: user.email,
        subject: 'Password reset instructions',
        html: `
          <p>Hi ${user.name || ''},</p>
          <p>We received a request to reset your password. Click the link below to set a new password:</p>
          <p><a href="${resetUrl}">Reset your password</a></p>
          <p>This link will expire in ${expiresInMinutes} minutes. If you did not request this, you can ignore this email.</p>
          <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
        `,
        text: `Hi ${user.name || ''},\n\nReset your password using the link below (expires in ${expiresInMinutes} minutes):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.\n\nBest regards,\nSweet Home Real Estate Investments' team`
      });
      if (process.env.SMTP_DEBUG === 'true') {
        console.log('Reset email dispatched:', info && info.messageId);
      }
    } catch (e) {
      if (process.env.SMTP_DEBUG === 'true') {
        console.warn('Reset email send failed:', e && e.message);
      }
      // Do not leak email failures to client
    }

    return genericResponse();
  } catch (err) {
    next(err);
  }
};

// ———————————————————————————————————————————————
// Password reset: reset form (GET /auth/reset?token=...)
// ———————————————————————————————————————————————
exports.resetPasswordPage = async (req, res, next) => {
  try {
    const token = (req.query.token || '').trim();
    if (!token) return res.status(400).render('auth/reset', { title: 'Reset password', error: 'Invalid token', token: null });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await query(
      `SELECT id FROM users
        WHERE reset_token_hash = $1
          AND reset_token_expires_at IS NOT NULL
          AND reset_token_expires_at > NOW()
        LIMIT 1`,
      [tokenHash]
    );
    if (!rows.length) {
      return res.status(400).render('auth/reset', { title: 'Reset password', error: 'This link is invalid or has expired.', token: null });
    }
    res.render('auth/reset', { title: 'Reset password', error: null, token });
  } catch (err) {
    next(err);
  }
};

// Handle resetting password (POST /auth/reset)
exports.resetPassword = async (req, res, next) => {
  try {
    const token = (req.body.token || '').trim();
    const password = req.body.password || '';
    const passwordConfirm = req.body.passwordConfirm || '';

    if (!token) {
      return res.status(400).render('auth/reset', { title: 'Reset password', error: 'Invalid token', token: null });
    }

    if (!password || !passwordConfirm) {
      return res.status(400).render('auth/reset', { title: 'Reset password', error: 'All fields are required', token });
    }
    if (password !== passwordConfirm) {
      return res.status(400).render('auth/reset', { title: 'Reset password', error: 'Passwords do not match', token });
    }
    // No complexity constraints; only ensure both fields are present and match

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await query(
      `SELECT id FROM users
        WHERE reset_token_hash = $1
          AND reset_token_expires_at IS NOT NULL
          AND reset_token_expires_at > NOW()
        LIMIT 1`,
      [tokenHash]
    );
    if (!rows.length) {
      return res.status(400).render('auth/reset', { title: 'Reset password', error: 'This link is invalid or has expired.', token: null });
    }
    const userId = rows[0].id;

    // Update password and clear token
    const hash = await bcrypt.hash(password, 10);
    await query(
      `UPDATE users
          SET password = $1,
              reset_token_hash = NULL,
              reset_token_expires_at = NULL,
              reset_requested_at = NULL,
              updated_at = NOW()
        WHERE id = $2`,
      [hash, userId]
    );

    // Notify the user their password changed (best-effort)
    try {
      const { rows: u2 } = await query('SELECT email, name FROM users WHERE id = $1', [userId]);
      if (u2.length) {
        const info = await sendMail({
          to: u2[0].email,
          subject: 'Your password was changed',
          html: `<p>Hi ${u2[0].name || ''},</p><p>Your password was just changed. If this wasn’t you, please contact support immediately.</p><p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>`,
          text: `Hi ${u2[0].name || ''},\n\nYour password was changed. If this wasn’t you, contact support immediately.\n\nBest regards,\nSweet Home Real Estate Investments' team`
        });
        if (process.env.SMTP_DEBUG === 'true') {
          console.log('Post-reset notification dispatched:', info && info.messageId);
        }
      }
    } catch (e) {
      if (process.env.SMTP_DEBUG === 'true') {
        console.warn('Post-reset notification failed:', e && e.message);
      }
    }

    // Redirect to login
    return res.redirect('/auth/login');
  } catch (err) {
    next(err);
  }
};