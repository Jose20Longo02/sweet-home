/**
 * Lead traffic attribution helpers.
 * UTM wins over referrer; empty referrer → Direct/Unknown.
 * Search referrers (when unpaid) normalize to utm_source + utm_medium=organic.
 * ga_client_id is stored for later GA4 acquisition lookup.
 */

function clean(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s ? s.slice(0, 500) : null;
}

function searchEngineFromReferrer(referrer) {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./i, '').toLowerCase();
    if (host === 'google.com' || host.startsWith('google.') || host.includes('.google.')) return 'google';
    if (host === 'bing.com' || host.startsWith('bing.')) return 'bing';
    if (host === 'yahoo.com' || host.startsWith('yahoo.') || host.includes('search.yahoo.')) return 'yahoo';
    if (host === 'duckduckgo.com') return 'duckduckgo';
  } catch (_) {
    return null;
  }
  return null;
}

function enrichOrganicFromReferrer(attrs) {
  if (!attrs) return attrs;
  if (attrs.gclid || attrs.fbclid) return attrs;
  if (attrs.utm_source) return attrs;
  const engine = searchEngineFromReferrer(attrs.referrer);
  if (engine) {
    attrs.utm_source = engine;
    if (!attrs.utm_medium) attrs.utm_medium = 'organic';
  }
  return attrs;
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
    fbclid: clean(body.fbclid),
    ga_client_id: clean(body.ga_client_id)
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
  enrichOrganicFromReferrer(attrs);
  return attrs;
}

function extractAttributionFromRequest(req) {
  const fromBody = extractAttributionFromBody(req.body || {});
  // Fallbacks from headers if client omitted them
  if (!fromBody.referrer) {
    fromBody.referrer = clean(req.get && req.get('referer'));
    enrichOrganicFromReferrer(fromBody);
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
    ga_client_id: fromBody.ga_client_id,
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
  const isOrganicMedium = utmMedium === 'organic' || utmMedium === 'seo';

  if (fbclid || isMetaSource) {
    if (isPaidMedium || fbclid) return 'Meta Ads';
    return 'Meta / Social';
  }

  if (gclid || (isPaidMedium && !isOrganicMedium)) {
    if (utmSource.includes('google') || gclid) return 'Google Ads';
    if (utmSource.includes('bing') || utmSource.includes('microsoft')) return 'Bing Ads';
    if (utmSource) return titleCase(`${utmSource} (paid)`);
    return 'Paid';
  }

  if (utmSource) {
    if (utmSource === 'google' || utmSource.includes('google')) {
      if (isOrganicMedium || !utmMedium) return 'Google Organic';
      return `Google (${utmMedium})`;
    }
    if (utmSource === 'bing' || utmSource.includes('bing')) {
      if (isOrganicMedium || !utmMedium) return 'Bing Organic';
      return `Bing (${utmMedium})`;
    }
    if (utmSource === 'newsletter' || utmSource === 'email' || utmMedium === 'email' || utmMedium === 'e-mail') {
      return 'Email';
    }
    if (utmMedium === 'email' || utmMedium === 'e-mail') return 'Email';
    if (utmSource === 'direct') return 'Direct';
    if (isOrganicMedium) return titleCase(`${utmSource} Organic`);
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

  // Phase 2: fall back to GA4 lookup fields when browser sent no usable signal
  const gaSource = String(lead.ga_session_source || '').trim();
  const gaMedium = String(lead.ga_session_medium || '').trim();
  const gaChannel = String(lead.ga_channel_group || '').trim();
  if (gaSource || gaMedium || gaChannel) {
    try {
      const { mapChannelLabel } = require('./ga4Acquisition');
      const label = mapChannelLabel({
        source: gaSource,
        medium: gaMedium,
        channelGroup: gaChannel
      });
      if (label) return label;
    } catch (_) {
      if (gaChannel) return gaChannel;
      if (gaSource) return titleCase(gaSource);
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
  deriveTrafficSource,
  searchEngineFromReferrer
};
