/**
 * First-touch lead attribution (UTM + referrer + click ids).
 * Stores first non-empty attribution in localStorage for 90 days.
 */
(function () {
  var STORAGE_KEY = 'sh_lead_attribution_v1';
  var MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

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
      return data.attrs || null;
    } catch (_) {
      return null;
    }
  }

  function writeStore(attrs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: now(), attrs: attrs }));
    } catch (_) { /* ignore quota / private mode */ }
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
      page_path: window.location.pathname || ''
    };
    return attrs;
  }

  function hasSignal(attrs) {
    if (!attrs) return false;
    return !!(attrs.utm_source || attrs.utm_medium || attrs.utm_campaign || attrs.utm_term ||
      attrs.utm_content || attrs.gclid || attrs.fbclid || attrs.referrer);
  }

  function captureFirstTouch() {
    var existing = readStore();
    var current = pickCurrent();
    if (!existing && hasSignal(current)) {
      writeStore(current);
      return current;
    }
    if (existing) {
      // Keep first-touch UTMs/referrer; refresh landing page_path only if empty
      if (!existing.page_path && current.page_path) {
        existing.page_path = current.page_path;
        writeStore(existing);
      }
      return existing;
    }
    // No prior touch and no signal — still store page_path for context
    writeStore({
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
      gclid: '',
      fbclid: '',
      referrer: '',
      page_path: current.page_path || ''
    });
    return readStore();
  }

  function getAttribution() {
    var stored = captureFirstTouch();
    var current = pickCurrent();
    // Prefer first-touch for UTMs/referrer/click ids; use current page_path at submit time
    return {
      utm_source: (stored && stored.utm_source) || current.utm_source || '',
      utm_medium: (stored && stored.utm_medium) || current.utm_medium || '',
      utm_campaign: (stored && stored.utm_campaign) || current.utm_campaign || '',
      utm_term: (stored && stored.utm_term) || current.utm_term || '',
      utm_content: (stored && stored.utm_content) || current.utm_content || '',
      gclid: (stored && stored.gclid) || current.gclid || '',
      fbclid: (stored && stored.fbclid) || current.fbclid || '',
      referrer: (stored && stored.referrer) || current.referrer || '',
      page_path: current.page_path || (stored && stored.page_path) || ''
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

  // Capture on load
  try { captureFirstTouch(); } catch (_) {}

  window.LeadAttribution = {
    get: getAttribution,
    capture: captureFirstTouch,
    applyToFormData: applyToFormData,
    applyToObject: applyToObject,
    applyToUrlSearchParams: applyToUrlSearchParams
  };
})();
