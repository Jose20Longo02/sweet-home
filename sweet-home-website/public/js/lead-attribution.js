/**
 * First-touch lead attribution (UTM + referrer + click ids + GA4 client_id).
 * - Stores first meaningful traffic signal in localStorage for 90 days.
 * - If first visit had no signal, a later organic/UTM/referrer signal can fill empty fields.
 * - Google/Bing referrers are normalized to utm_source + utm_medium=organic when unpaid.
 * - ga_client_id is always refreshed from the _ga cookie (for later GA4 source lookup).
 */
(function () {
  var STORAGE_KEY = 'sh_lead_attribution_v2';
  var MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
  var ATTR_KEYS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'fbclid', 'referrer', 'page_path', 'ga_client_id'
  ];

  function now() { return Date.now(); }

  function readStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.ts || (now() - data.ts) > MAX_AGE_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return { ts: data.ts, attrs: data.attrs || null };
    } catch (_) {
      return null;
    }
  }

  function writeStore(attrs, ts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ts: ts || now(),
        attrs: attrs
      }));
    } catch (_) { /* ignore quota / private mode */ }
  }

  function readGaClientId() {
    try {
      var match = document.cookie.match(/(?:^|; )_ga=([^;]*)/);
      if (!match) return '';
      var parts = decodeURIComponent(match[1]).split('.');
      // GA1.x.<clientIdPart1>.<clientIdPart2>
      if (parts.length >= 4) return parts.slice(2).join('.');
    } catch (_) { /* ignore */ }
    return '';
  }

  function isSearchHost(host) {
    if (!host) return null;
    var h = String(host).replace(/^www\./i, '').toLowerCase();
    if (h === 'google.com' || h.indexOf('google.') === 0 || h.indexOf('.google.') !== -1) return 'google';
    if (h === 'bing.com' || h.indexOf('bing.') === 0) return 'bing';
    if (h === 'yahoo.com' || h.indexOf('yahoo.') === 0 || h.indexOf('search.yahoo.') === 0) return 'yahoo';
    if (h === 'duckduckgo.com') return 'duckduckgo';
    return null;
  }

  /** When unpaid, map search referrers to synthetic organic UTMs. */
  function enrichOrganic(attrs) {
    if (!attrs) return attrs;
    var out = Object.assign({}, attrs);
    if (out.gclid || out.fbclid) return out;
    if (out.utm_source) return out;
    if (!out.referrer) return out;
    try {
      var host = new URL(out.referrer).hostname;
      var engine = isSearchHost(host);
      if (engine) {
        out.utm_source = engine;
        out.utm_medium = out.utm_medium || 'organic';
      }
    } catch (_) { /* ignore bad referrer */ }
    return out;
  }

  function pickCurrent() {
    var params = new URLSearchParams(window.location.search || '');
    var attrs = {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
      gclid: params.get('gclid') || '',
      fbclid: params.get('fbclid') || '',
      referrer: document.referrer || '',
      page_path: window.location.pathname || '',
      ga_client_id: readGaClientId()
    };
    return enrichOrganic(attrs);
  }

  function hasTrafficSignal(attrs) {
    if (!attrs) return false;
    return !!(attrs.utm_source || attrs.utm_medium || attrs.utm_campaign || attrs.utm_term ||
      attrs.utm_content || attrs.gclid || attrs.fbclid || attrs.referrer);
  }

  function fillEmpty(existing, current) {
    var out = Object.assign({}, existing || {});
    ATTR_KEYS.forEach(function (key) {
      if (key === 'ga_client_id') return; // handled separately
      if (key === 'page_path') {
        if (!out.page_path && current.page_path) out.page_path = current.page_path;
        return;
      }
      if (!out[key] && current[key]) out[key] = current[key];
    });
    return enrichOrganic(out);
  }

  function captureFirstTouch() {
    var current = pickCurrent();
    var stored = readStore();
    var clientId = current.ga_client_id || readGaClientId();

    if (!stored || !stored.attrs) {
      if (clientId) current.ga_client_id = clientId;
      writeStore(current);
      return current;
    }

    var merged = fillEmpty(stored.attrs, current);
    if (clientId) merged.ga_client_id = clientId;

    var changed = JSON.stringify(merged) !== JSON.stringify(stored.attrs);
    if (changed) writeStore(merged, stored.ts);
    return merged;
  }

  function getAttribution() {
    var stored = captureFirstTouch();
    var current = pickCurrent();
    var clientId = current.ga_client_id || (stored && stored.ga_client_id) || readGaClientId();
    return {
      utm_source: (stored && stored.utm_source) || current.utm_source || '',
      utm_medium: (stored && stored.utm_medium) || current.utm_medium || '',
      utm_campaign: (stored && stored.utm_campaign) || current.utm_campaign || '',
      utm_term: (stored && stored.utm_term) || current.utm_term || '',
      utm_content: (stored && stored.utm_content) || current.utm_content || '',
      gclid: (stored && stored.gclid) || current.gclid || '',
      fbclid: (stored && stored.fbclid) || current.fbclid || '',
      referrer: (stored && stored.referrer) || current.referrer || '',
      page_path: current.page_path || (stored && stored.page_path) || '',
      ga_client_id: clientId || ''
    };
  }

  function applyToFormData(fd) {
    var attrs = getAttribution();
    Object.keys(attrs).forEach(function (key) {
      if (attrs[key] && !fd.get(key)) fd.set(key, attrs[key]);
    });
    return attrs;
  }

  function applyToObject(obj) {
    var attrs = getAttribution();
    Object.keys(attrs).forEach(function (key) {
      if (attrs[key] && !obj[key]) obj[key] = attrs[key];
    });
    return attrs;
  }

  function applyToUrlSearchParams(params) {
    var attrs = getAttribution();
    Object.keys(attrs).forEach(function (key) {
      if (attrs[key] && !params.get(key)) params.set(key, attrs[key]);
    });
    return attrs;
  }

  function fillHiddenInputs(root) {
    var scope = root || document;
    var attrs = getAttribution();
    Object.keys(attrs).forEach(function (key) {
      if (!attrs[key]) return;
      var nodes = scope.querySelectorAll('input[name="' + key + '"]');
      Array.prototype.forEach.call(nodes, function (el) {
        if (!el.value) el.value = attrs[key];
      });
    });
  }

  try { captureFirstTouch(); } catch (_) {}
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      try { fillHiddenInputs(document); } catch (_) {}
    });
  } else {
    try { fillHiddenInputs(document); } catch (_) {}
  }

  window.LeadAttribution = {
    get: getAttribution,
    capture: captureFirstTouch,
    applyToFormData: applyToFormData,
    applyToObject: applyToObject,
    applyToUrlSearchParams: applyToUrlSearchParams,
    fillHiddenInputs: fillHiddenInputs,
    hasTrafficSignal: hasTrafficSignal
  };
})();
