const { query } = require('../config/db');

function getRequestIp(req) {
  if (!req) return null;
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
  return ip ? ip.replace(/^::ffff:/, '') : null;
}

/**
 * Check if the request is from a bot/crawler
 * This helps filter out non-human traffic to match Google Analytics behavior
 */
function isBot(req) {
  if (!req) return false;
  
  const userAgent = (req.get('user-agent') || '').toLowerCase();
  if (!userAgent) return true; // No user agent = likely a bot
  
  // List of known bots and crawlers (similar to what GA filters)
  const botPatterns = [
    // Search engine crawlers
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandexbot',
    'sogou', 'exabot', 'facebot', 'ia_archiver', 'scoutjet', 'gosospider',
    'msnbot', 'ahrefsbot', 'semrushbot', 'mozbot', 'dotbot', 'mj12bot',
    'petalbot', 'applebot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'pinterest', 'whatsapp', 'telegrambot', 'discordbot', 'slackbot',
    // Other bots
    'bot', 'crawler', 'spider', 'scraper', 'crawling', 'headless', 'phantom',
    'selenium', 'webdriver', 'curl', 'wget', 'python-requests', 'http',
    'apache', 'nginx', 'monitor', 'uptime', 'pingdom', 'status', 'check',
    'health', 'probe', 'scanner', 'security', 'validator', 'test'
  ];
  
  // Check if user agent contains any bot pattern
  const isBot = botPatterns.some(pattern => userAgent.includes(pattern));
  
  // Also exclude admin/internal traffic
  const isAdmin = req.path && /^\/(admin|superadmin)/.test(req.path);
  
  return isBot || isAdmin;
}

async function logEvent({ eventType, entityType = null, entityId = null, meta = null, req = null }) {
  // Skip logging if this is a bot request (to match GA behavior)
  if (req && isBot(req)) {
    return;
  }
  try {
    // Get session ID - primary method
    let sessionId = req?.sessionID || null;
    
    // Fallback: If no session ID available (common with saveUninitialized: false),
    // create a fingerprint based on IP + User-Agent + Date for anonymous tracking
    // This ensures we can still track unique visits even when sessions aren't created
    // Date component ensures unique visits reset daily (same person = 1 visit per day)
    if (!sessionId && req) {
      const ipAddress = getRequestIp(req);
      const userAgent = req?.get?.('user-agent') || '';
      if (ipAddress && userAgent) {
        // Include date so unique visits reset daily
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const crypto = require('crypto');
        const fingerprint = crypto.createHash('sha256')
          .update(ipAddress + userAgent + today)
          .digest('hex')
          .substring(0, 32);
        sessionId = 'fp_' + fingerprint;
      }
    }
    
    const userId = req?.session?.user?.id || null;
    const ipAddress = getRequestIp(req);
    const userAgent = req?.get?.('user-agent') || null;
    const referrer = req?.get?.('referer') || null;
    await query(
      `INSERT INTO analytics_events (event_type, entity_type, entity_id, user_id, session_id, ip_address, user_agent, referrer, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        eventType,
        entityType,
        entityId || null,
        userId,
        sessionId,
        ipAddress,
        userAgent,
        referrer,
        meta ? JSON.stringify(meta) : null
      ]
    );
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[analytics] Failed to log event:', err && err.message);
    }
  }
}

module.exports = {
  logEvent,
  getRequestIp
};

