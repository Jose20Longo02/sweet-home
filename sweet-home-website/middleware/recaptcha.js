// middleware/recaptcha.js
const fetch = require('node-fetch');

/**
 * Verify reCAPTCHA v3 token from client. Requires env RECAPTCHA_SECRET_KEY.
 * Adds req.recaptcha = { success, score, action }.
 */
async function verifyRecaptchaToken(token, remoteIp) {
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    // If not configured, treat as success to avoid blocking dev
    return { success: true, score: 1, action: 'unconfigured' };
  }
  try {
    const params = new URLSearchParams();
    params.append('secret', process.env.RECAPTCHA_SECRET_KEY);
    params.append('response', token || '');
    if (remoteIp) params.append('remoteip', remoteIp);

    // Primary verification endpoint
    let res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    let data = await res.json();
    // If response is malformed or unreachable, try recaptcha.net as fallback
    if (!data || typeof data.success === 'undefined') {
      try {
        res = await fetch('https://www.recaptcha.net/recaptcha/api/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        });
        data = await res.json();
      } catch (_) {}
    }
    if (process.env.RECAPTCHA_DEBUG === 'true') {
      const tokenPreview = token ? String(token).slice(0, 10) + '...' : '';
      try { console.log('[reCAPTCHA verify]', { tokenPresent: !!token, tokenPreview, success: data?.success, score: data?.score, action: data?.action, hostname: data?.hostname, errorCodes: data && data['error-codes'] }); } catch (_) {}
    }
    return data || { success: false, error: 'recaptcha_verification_failed' };
  } catch (e) {
    return { success: false, error: 'recaptcha_verification_failed' };
  }
}

function recaptchaRequired(minScore = 0.5) {
  return async function(req, res, next) {
    try {
      const token = req.body.recaptchaToken || req.query.recaptchaToken || '';
      const remoteIp = req.ip;
      const result = await verifyRecaptchaToken(token, remoteIp);
      req.recaptcha = result;
      if (process.env.RECAPTCHA_DEBUG === 'true') {
        const tokenPreview = token ? String(token).slice(0, 10) + '...' : '';
        try { console.log('[reCAPTCHA gate]', { tokenPresent: !!token, tokenPreview, success: !!result?.success, score: result?.score, action: result?.action, hostname: result?.hostname, errorCodes: result && result['error-codes'] }); } catch (_) {}
      }
      if (!result || !result.success || (typeof result.score === 'number' && result.score < minScore)) {
        if (String(process.env.RECAPTCHA_FAIL_OPEN || '').toLowerCase() === 'true') {
          try { console.warn('[reCAPTCHA] FAIL-OPEN enabled. Bypassing verification failure.'); } catch (_) {}
          return next();
        }
        return res.status(400).json ? res.status(400).json({ success: false, message: 'reCAPTCHA verification failed' })
                                    : res.status(400).send('reCAPTCHA verification failed');
      }
      return next();
    } catch (e) {
      return res.status(400).send('reCAPTCHA verification failed');
    }
  };
}

module.exports = { recaptchaRequired };


