const SUPPORTED_LANGUAGES = new Set(['en', 'de', 'es']);

function setLeadThankYou(req, { name, language } = {}) {
  if (!req || !req.session) return;

  const safeName = String(name || '').trim().slice(0, 100);
  const safeLanguage = String(language || '').slice(0, 2).toLowerCase();

  req.session.leadThankYou = {
    name: safeName,
    language: SUPPORTED_LANGUAGES.has(safeLanguage) ? safeLanguage : 'en'
  };
}

function consumeLeadThankYou(req) {
  const data = req && req.session ? req.session.leadThankYou : null;
  if (req && req.session) delete req.session.leadThankYou;
  return data || { name: '', language: 'en' };
}

module.exports = {
  setLeadThankYou,
  consumeLeadThankYou
};
