const fs = require('fs');
const path = require('path');

// Simple i18n loader using locales/*.json
module.exports = function i18nMiddleware(req, res, next) {
  try {
    const localesDir = path.join(__dirname, '..', 'locales');
    const supported = ['en', 'de'];
    const labels = { en: 'English', de: 'Deutsch' };
    const accepts = (typeof req.acceptsLanguages === 'function') ? (req.acceptsLanguages() || []) : [];
    // URL-first language policy:
    // - /en, /en/* => English
    // - any other public non-prefixed path => German (default)
    // Spanish (/es) removed — requests are 301'd to DE equivalents in middleware.
    let pathLang = '';
    if (req.path === '/en' || req.path.startsWith('/en/')) pathLang = 'en';
    else if (!/^\/(admin|superadmin|auth|api)/.test(req.path)) pathLang = 'de';
    const cLang = (req.cookies && typeof req.cookies.lang === 'string') ? req.cookies.lang.trim() : '';
    const aLang = Array.isArray(accepts) && accepts.length ? String(accepts[0]) : '';
    let lang = pathLang || cLang || aLang || 'de';
    lang = String(lang).slice(0, 2).toLowerCase();
    if (lang === 'es') lang = 'de'; // legacy cookie
    if (!supported.includes(lang)) lang = 'de';

    // Persist choice in cookie for subsequent requests
    try { res.cookie('lang', lang, { httpOnly: false, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 }); } catch (_) {}

    // Load messages, fallback to English if chosen locale missing
    function loadLocale(code) {
      try {
        const file = path.join(localesDir, `${code}.json`);
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (_) { return {}; }
    }
    let messages = loadLocale(lang);
    let usedLang = lang;
    if (!messages || Object.keys(messages).length === 0) {
      messages = loadLocale('de');
      usedLang = 'de';
    }

    // Helper for templates: t('key.path', fallback, vars)
    // Supports simple interpolation, e.g. "Hello {name}" with { name: "Luis" }.
    res.locals.t = function translate(key, fallback, vars) {
      const interpolate = (text, map) => {
        if (typeof text !== 'string') return text;
        if (!map || typeof map !== 'object') return text;
        return text.replace(/\{([^}]+)\}/g, (full, token) => {
          const raw = map[token];
          return (raw === undefined || raw === null) ? full : String(raw);
        });
      };

      // Allow shorthand: t('key.path', { name: '...' })
      let fallbackValue = fallback;
      let interpolationVars = vars;
      if (fallback && typeof fallback === 'object' && !Array.isArray(fallback) && vars === undefined) {
        interpolationVars = fallback;
        fallbackValue = undefined;
      }

      if (!key) return fallback || '';
      const parts = String(key).split('.');
      let cur = messages;
      for (const p of parts) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p]; else { cur = undefined; break; }
      }
      if (cur === undefined || cur === null) {
        return interpolate((fallbackValue !== undefined ? fallbackValue : ''), interpolationVars);
      }
      return interpolate(cur, interpolationVars);
    };
    res.locals.lang = lang;
    res.locals.supportedLanguages = supported;
    res.locals.languageLabels = labels;
    res.locals.locationsTranslations = (messages.locations && typeof messages.locations === 'object') ? messages.locations : { countries: {}, cities: {} };
    // Locale prefix for URL-based i18n: '' for de (default), '/en'
    res.locals.localePrefix = (req.path === '/en' || req.path.startsWith('/en/')) ? '/en' : '';
    // Diagnostics header: confirm a known key resolves
    try {
      const probe = (typeof res.locals.t === 'function') ? res.locals.t('nav.projects', '') : '';
      res.setHeader && res.setHeader('X-I18N-Probe', String(probe || ''));
      res.setHeader && res.setHeader('X-I18N-Lang', String(lang));
      res.setHeader && res.setHeader('X-I18N-Loaded', String(usedLang));
      res.setHeader && res.setHeader('X-I18N-Cookie', String(cLang || ''));
      res.setHeader && res.setHeader('X-I18N-Accepts', String((accepts && accepts[0]) || ''));
    } catch (_) {}
  } catch (e) {
    // Always provide a safe fallback t() to prevent template errors
    res.locals.t = function (key, fallback) { return fallback || ''; };
    res.locals.lang = 'de';
    res.locals.supportedLanguages = ['en','de'];
    res.locals.languageLabels = { en:'English', de:'Deutsch' };
    res.locals.localePrefix = '';
    res.locals.locationsTranslations = { countries: {}, cities: {} };
  }
  next();
};


