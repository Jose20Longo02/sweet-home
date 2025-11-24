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

async function logEvent({ eventType, entityType = null, entityId = null, meta = null, req = null }) {
  try {
    const sessionId = req?.sessionID || null;
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

