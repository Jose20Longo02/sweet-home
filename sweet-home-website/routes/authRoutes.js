// routes/authRoutes.js

const express               = require('express');
const router                = express.Router();
const authController        = require('../controllers/authController');
const uploadProfilePic      = require('../middleware/uploadProfilePic');
const { redirectIfAuthenticated } = require('../middleware/authorize');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { recaptchaRequired } = require('../middleware/recaptcha');

// Login-specific brute-force limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // 10 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false
});

// GET /auth/login  — only for guests
router.get(
  '/login',
  redirectIfAuthenticated,
  authController.loginPage
);

// GET /auth/register  — only for guests
router.get(
  '/register',
  redirectIfAuthenticated,
  authController.registerPage
);

// POST /auth/login  — don't let logged-in users re-submit
router.post(
  '/login',
  loginLimiter,
  // recaptchaRequired(0.3), // Temporarily disabled - uncomment when reCAPTCHA is configured
  redirectIfAuthenticated,
  [
    // Do NOT normalize (e.g., removing dots for Gmail) because it may change the actual address
    body('email').isString().trim().isEmail().toLowerCase(),
    body('password').isString().isLength({ min: 6, max: 100 })
  ],
  authController.login
);

// POST /auth/register  — multipart form + guest-only
router.post(
  '/register',
  redirectIfAuthenticated,
  uploadProfilePic,
  [
    body('name').isString().trim().isLength({ min: 2, max: 100 }),
    // Do not use normalizeEmail here to avoid mutating the address (e.g., Gmail dot removal)
    body('email').isString().trim().isEmail().toLowerCase(),
    body('password').isString().isLength({ min: 6, max: 100 }),
    body('passwordConfirm').isString().isLength({ min: 6, max: 100 }),
    body('area').isString().trim().notEmpty(),
    body('position').isString().trim().notEmpty(),
    body('bmby_id').isString().trim().isLength({ min: 1, max: 150 }),
    body('registrationKey').isString().trim().notEmpty().withMessage('Registration key is required')
  ],
  authController.register
);

// GET /auth/thank-you — simple confirmation after registration
router.get(
  '/thank-you',
  redirectIfAuthenticated,
  authController.thankYouPage
);

// POST /auth/logout — any authenticated user
router.post(
  '/logout',
  authController.logout
);

// Password reset
router.get(
  '/forgot',
  redirectIfAuthenticated,
  authController.forgotPasswordPage
);

router.post(
  '/forgot',
  redirectIfAuthenticated,
  [ body('email').isString().trim().isEmail().toLowerCase() ],
  authController.forgotPassword
);

router.get(
  '/reset',
  redirectIfAuthenticated,
  authController.resetPasswordPage
);

router.post(
  '/reset',
  redirectIfAuthenticated,
  [
    body('token').isString().trim().notEmpty(),
    body('password').isString().isLength({ min: 6, max: 100 }),
    body('passwordConfirm').isString().isLength({ min: 6, max: 100 })
  ],
  authController.resetPassword
);

// Role selection for developer accounts
router.get(
  '/select-role',
  authController.selectRolePage
);

router.post(
  '/select-role',
  authController.selectRole
);

module.exports = router;