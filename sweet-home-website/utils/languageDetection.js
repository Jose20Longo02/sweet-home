// utils/languageDetection.js
/**
 * Simple language detection utility
 * Detects the most likely language of text content
 */

// Common words/phrases for each language
const LANGUAGE_INDICATORS = {
  en: [
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must',
    'this', 'that', 'these', 'those', 'here', 'there', 'where', 'when', 'why', 'how',
    'property', 'apartment', 'house', 'villa', 'land', 'bedroom', 'bathroom', 'kitchen',
    'living', 'room', 'space', 'size', 'price', 'location', 'city', 'country'
  ],
  de: [
    'der', 'die', 'das', 'und', 'oder', 'aber', 'in', 'auf', 'an', 'zu', 'für', 'von', 'mit', 'durch',
    'ist', 'sind', 'war', 'waren', 'sein', 'gewesen', 'haben', 'hat', 'hatte', 'tun', 'macht', 'tat',
    'wird', 'würde', 'könnte', 'sollte', 'kann', 'muss',
    'dieser', 'diese', 'dieses', 'hier', 'dort', 'wo', 'wann', 'warum', 'wie',
    'eigentum', 'wohnung', 'haus', 'villa', 'land', 'schlafzimmer', 'badezimmer', 'küche',
    'wohnzimmer', 'raum', 'platz', 'größe', 'preis', 'standort', 'stadt', 'land'
  ],
  es: [
    'el', 'la', 'los', 'las', 'y', 'o', 'pero', 'en', 'sobre', 'a', 'para', 'de', 'con', 'por',
    'es', 'son', 'era', 'eran', 'ser', 'sido', 'tener', 'ha', 'había', 'hacer', 'hace', 'hizo',
    'será', 'sería', 'podría', 'debería', 'puede', 'debe',
    'este', 'esta', 'estos', 'estas', 'aquí', 'allí', 'donde', 'cuando', 'por qué', 'cómo',
    'propiedad', 'apartamento', 'casa', 'villa', 'tierra', 'dormitorio', 'baño', 'cocina',
    'sala', 'habitación', 'espacio', 'tamaño', 'precio', 'ubicación', 'ciudad', 'país'
  ]
};

/**
 * Detect the most likely language of the given text
 * @param {string} text - The text to analyze
 * @returns {string} - The detected language code ('en', 'de', 'es')
 */
function detectLanguage(text) {
  if (!text || typeof text !== 'string') {
    return 'en'; // Default to English
  }

  const normalizedText = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  if (normalizedText.length < 10) {
    return 'en'; // Too short to detect reliably
  }

  const words = normalizedText.split(' ');
  const scores = { en: 0, de: 0, es: 0 };

  // Count word matches for each language
  for (const word of words) {
    for (const [lang, indicators] of Object.entries(LANGUAGE_INDICATORS)) {
      if (indicators.includes(word)) {
        scores[lang]++;
      }
    }
  }

  // Find the language with the highest score
  let maxScore = 0;
  let detectedLang = 'en';

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang;
    }
  }

  // If no clear winner (all scores are 0 or very low), default to English
  if (maxScore < 2) {
    return 'en';
  }

  return detectedLang;
}

/**
 * Detect language from multiple text fields
 * @param {Object} fields - Object containing text fields to analyze
 * @returns {string} - The detected language code
 */
function detectLanguageFromFields(fields) {
  if (!fields || typeof fields !== 'object') {
    return 'en';
  }

  // Combine all text fields for better detection
  const combinedText = Object.values(fields)
    .filter(value => typeof value === 'string' && value.trim().length > 0)
    .join(' ');

  return detectLanguage(combinedText);
}

/**
 * Get target languages for translation based on detected source language
 * @param {string} sourceLang - The detected source language
 * @returns {Array<string>} - Array of target language codes
 */
function getTargetLanguages(sourceLang) {
  const allLangs = ['en', 'de', 'es'];
  return allLangs.filter(lang => lang !== sourceLang);
}

module.exports = {
  detectLanguage,
  detectLanguageFromFields,
  getTargetLanguages
};

