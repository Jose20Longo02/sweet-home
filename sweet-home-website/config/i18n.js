const fs = require('fs');
const path = require('path');

// Simple i18n loader using locales/*.json
module.exports = function i18nMiddleware(req, res, next) {
  try {
    const localesDir = path.join(__dirname, '..', 'locales');
    const supported = ['en', 'es', 'de'];
    const labels = { en: 'English', es: 'Español', de: 'Deutsch' };
    const accepts = (typeof req.acceptsLanguages === 'function') ? (req.acceptsLanguages() || []) : [];
    // Language from URL: /de, /es (or /de/*, /es/*) = that locale; any other public path = English (so switching to "English" and going to /properties etc. actually shows English)
    let pathLang = '';
    if (req.path === '/de' || req.path.startsWith('/de/')) pathLang = 'de';
    else if (req.path === '/es' || req.path.startsWith('/es/')) pathLang = 'es';
    else if (!/^\/(admin|superadmin|auth|api)/.test(req.path)) pathLang = 'en';
    const cLang = (req.cookies && typeof req.cookies.lang === 'string') ? req.cookies.lang.trim() : '';
    let lang = pathLang || cLang || 'en';
    lang = String(lang).slice(0, 2).toLowerCase();
    if (!supported.includes(lang)) lang = 'en';

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
      messages = loadLocale('en');
      usedLang = 'en';
    }

    // Helper for templates: t('key.path', fallback)
    res.locals.t = function translate(key, fallback) {
      if (!key) return fallback || '';
      const parts = String(key).split('.');
      let cur = messages;
      for (const p of parts) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p]; else { cur = undefined; break; }
      }
      if (cur === undefined || cur === null) return (fallback !== undefined ? fallback : '');
      return cur;
    };
    res.locals.lang = lang;
    res.locals.supportedLanguages = supported;
    res.locals.languageLabels = labels;
    res.locals.locationsTranslations = (messages.locations && typeof messages.locations === 'object') ? messages.locations : { countries: {}, cities: {} };
    // Locale prefix for URL-based i18n: '' for en, '/de' or '/es' when path starts with that
    res.locals.localePrefix = (req.path === '/de' || req.path.startsWith('/de/')) ? '/de' : (req.path === '/es' || req.path.startsWith('/es/')) ? '/es' : '';
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
    res.locals.lang = 'en';
    res.locals.supportedLanguages = ['en','es','de'];
    res.locals.languageLabels = { en:'English', es:'Español', de:'Deutsch' };
    res.locals.localePrefix = '';
    res.locals.locationsTranslations = { countries: {}, cities: {} };
  }
  next();
};


