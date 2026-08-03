/**
 * Lead traffic attribution helpers.
 * UTM wins over referrer; empty referrer → Direct/Unknown.
 */

function clean(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s ? s.slice(0, 500) : null;
}

function extractAttributionFromBody(body = {}) {
  const attrs = {
    utm_source: clean(body.utm_source),
    utm_medium: clean(body.utm_medium),
    utm_campaign: clean(body.utm_campaign),
    utm_term: clean(body.utm_term),
    utm_content: clean(body.utm_content),
    referrer: clean(body.referrer),
    page_path: clean(body.page_path),
    gclid: clean(body.gclid),
    fbclid: clean(body.fbclid)
  };
  // Persist paid-click signal via UTM fields (no dedicated gclid/fbclid columns)
  if (attrs.gclid && !attrs.utm_source) {
    attrs.utm_source = 'google';
    if (!attrs.utm_medium) attrs.utm_medium = 'cpc';
  }
  if (attrs.fbclid && !attrs.utm_source) {
    attrs.utm_source = 'facebook';
    if (!attrs.utm_medium) attrs.utm_medium = 'paid';
  }
  return attrs;
}

function extractAttributionFromRequest(req) {
  const fromBody = extractAttributionFromBody(req.body || {});
  // Fallbacks from headers if client omitted them
  if (!fromBody.referrer) {
    fromBody.referrer = clean(req.get && req.get('referer'));
  }
  if (!fromBody.page_path && req.path && !String(req.path).startsWith('/api')) {
    fromBody.page_path = clean(req.path);
  }
  return {
    utm_source: fromBody.utm_source,
    utm_medium: fromBody.utm_medium,
    utm_campaign: fromBody.utm_campaign,
    utm_term: fromBody.utm_term,
    utm_content: fromBody.utm_content,
    referrer: fromBody.referrer,
    page_path: fromBody.page_path,
    ip_address: clean((req.headers && (req.headers['x-forwarded-for'] || '')).split(',')[0]) || clean(req.ip) || null,
    user_agent: clean(req.get && req.get('user-agent'))
  };
}

/**
 * Human-readable traffic channel for dashboard/export.
 * Priority: paid click ids → utm_source/medium → referrer host → Direct.
 */
function deriveTrafficSource(lead = {}) {
  const utmSource = String(lead.utm_source || '').trim().toLowerCase();
  const utmMedium = String(lead.utm_medium || '').trim().toLowerCase();
  const referrer = String(lead.referrer || '').trim();
  const gclid = String(lead.gclid || '').trim();
  const fbclid = String(lead.fbclid || '').trim();
  const isPaidMedium = utmMedium === 'cpc' || utmMedium === 'ppc' || utmMedium === 'paid' || utmMedium === 'paidsocial';
  const isMetaSource = utmSource.includes('facebook') || utmSource.includes('fb') ||
    utmSource.includes('meta') || utmSource.includes('instagram') || utmSource.includes('ig');

  if (fbclid || isMetaSource) {
    if (isPaidMedium || fbclid) return 'Meta Ads';
    return 'Meta / Social';
  }

  if (gclid || isPaidMedium) {
    if (utmSource.includes('google') || gclid) return 'Google Ads';
    if (utmSource.includes('bing') || utmSource.includes('microsoft')) return 'Bing Ads';
    if (utmSource) return titleCase(`${utmSource} (paid)`);
    return 'Paid';
  }

  if (utmSource) {
    if (utmSource === 'google') {
      if (utmMedium === 'organic' || !utmMedium) return 'Google Organic';
      return `Google (${utmMedium})`;
    }
    if (utmSource === 'newsletter' || utmSource === 'email' || utmMedium === 'email' || utmMedium === 'e-mail') {
      return 'Email';
    }
    if (utmMedium === 'email' || utmMedium === 'e-mail') return 'Email';
    if (utmSource === 'direct') return 'Direct';
    return titleCase(utmSource);
  }

  if (utmMedium === 'email' || utmMedium === 'e-mail') return 'Email';

  if (referrer) {
    try {
      const host = new URL(referrer).hostname.replace(/^www\./i, '').toLowerCase();
      if (!host) return 'Referral';
      if (host.includes('google.')) return 'Google Organic';
      if (host.includes('bing.') || host.includes('yahoo.')) return 'Organic Search';
      if (host.includes('facebook.') || host.includes('instagram.') || host.includes('l.facebook') || host.includes('lm.facebook')) {
        return 'Meta / Social';
      }
      if (host.includes('linkedin.')) return 'LinkedIn';
      if (host.includes('t.co') || host.includes('twitter.') || host.includes('x.com')) return 'X / Twitter';
      if (host.includes('youtube.')) return 'YouTube';
      // Same-site navigation shouldn't look like external traffic
      if (host.includes('sweet-home.co.il') || host.includes('sweethome-immobilien.de')) {
        return 'Direct';
      }
      return `Referral (${host})`;
    } catch (_) {
      return 'Referral';
    }
  }

  return 'Direct';
}

function titleCase(str) {
  return String(str)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

module.exports = {
  extractAttributionFromBody,
  extractAttributionFromRequest,
  deriveTrafficSource
};
