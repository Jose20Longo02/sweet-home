// middleware/spamDetection.js
const { query } = require('../config/db');

/**
 * Comprehensive spam detection middleware
 * Analyzes messages using multiple detection methods and silently discards spam
 */

// Spam detection patterns
const SPAM_PATTERNS = {
  // Promotional keywords (multi-language)
  promotionalKeywords: [
    // German
    'bewertungsanbieter', 'google gmb', 'trustpilot', 'bewertungen', 'treuegarantie',
    'zufriedenheitsgarantie', 'seo', 'backlinks', 'ranking', 'organischen traffic',
    'website-erstellung', 'verifizierte', 'lebenslanger', 'hochwertige',
    
    // English
    'google reviews', 'fake reviews', 'review service', 'seo service', 'backlink service',
    'ranking service', 'website creation', 'guaranteed', 'verified reviews', 'organic traffic',
    'google my business', 'trustpilot reviews', 'review manipulation', 'ranking boost',
    'reviews service', 'google review', '5 star', 'five star', 'rating service',
    
    // Spanish
    'reseñas falsas', 'servicio de reseñas', 'servicio seo', 'enlaces de retroceso',
    'creación de sitios web', 'garantizado', 'reseñas verificadas', 'tráfico orgánico',
    'mi negocio de google', 'reseñas trustpilot', 'manipulación de reseñas',
    'servicio de reseñas', 'reseña de google', '5 estrellas', 'cinco estrellas',
    'proveedor de reseñas', 'obtener más reseñas', 'satisfacción garantizada',
    
    // Common spam terms
    'whatsapp', 'telegram', 'contact me', 'call me', 'reach out', 'get in touch',
    'promotional', 'marketing', 'advertising', 'boost', 'increase', 'improve',
    'guaranteed results', '100%', 'lifetime', 'full guarantee'
  ],

  // Phone number patterns (international)
  phonePatterns: [
    /\+?\d{1,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}/g,
    /whatsapp[\s\-\+]?\d{1,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}/gi,
    /telegram[\s\-\+]?\d{1,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}/gi
  ],

  // Emoji patterns (excessive use)
  emojiPatterns: [
    /[⭐🌟💪🔥✨🎯💰📈📊🎉]/g,
    /[⭐]{3,}/g, // 3+ stars
    /[🌟]{2,}/g, // 2+ star emojis
  ],

  // Service listing patterns
  servicePatterns: [
    /🌟\s*[^🌟\n]+/g, // Services with star bullets
    /•\s*[^•\n]+/g,   // Services with bullet points
    /-\s*[^-\n]+/g,   // Services with dashes
    /✓\s*[^✓\n]+/g,   // Services with checkmarks
  ],

  // Guarantee language patterns
  guaranteePatterns: [
    /100%\s*(zufriedenheit|satisfaction|satisfacción)/gi,
    /(treue|lifetime|vida)\s*garantie/gi,
    /(full|complete|total)\s*(guarantee|garantía)/gi,
    /(zurückerstattung|refund|reembolso)/gi
  ],

  // Rating manipulation patterns
  ratingPatterns: [
    /5\s*[⭐🌟]{5}/g, // 5 stars
    /⭐⭐⭐⭐⭐/g,     // 5 star emojis
    /(5|five)\s*star/g,
    /(excellent|outstanding|perfect)\s*rating/gi
  ]
};

/**
 * Calculate spam score for a message
 * @param {string} message - The message to analyze
 * @param {string} name - The sender's name
 * @param {string} email - The sender's email
 * @param {string} phone - The sender's phone
 * @returns {number} - Spam score (0-100)
 */
function calculateSpamScore(message, name, email, phone) {
  if (!message) return 0;
  
  const text = message.toLowerCase();
  const fullText = `${name || ''} ${email || ''} ${phone || ''} ${message}`.toLowerCase();
  let score = 0;

  // 1. Promotional keywords (25 points max)
  const keywordMatches = SPAM_PATTERNS.promotionalKeywords.filter(keyword => 
    text.includes(keyword.toLowerCase())
  );
  score += Math.min(keywordMatches.length * 4, 25);

  // 2. Phone number patterns (15 points max)
  const phoneMatches = SPAM_PATTERNS.phonePatterns.reduce((count, pattern) => {
    return count + (fullText.match(pattern) || []).length;
  }, 0);
  score += Math.min(phoneMatches * 5, 15);

  // 3. Excessive emojis (10 points max)
  const emojiMatches = SPAM_PATTERNS.emojiPatterns.reduce((count, pattern) => {
    return count + (text.match(pattern) || []).length;
  }, 0);
  score += Math.min(emojiMatches * 2, 10);

  // 4. Service listings (15 points max)
  const serviceMatches = SPAM_PATTERNS.servicePatterns.reduce((count, pattern) => {
    return count + (text.match(pattern) || []).length;
  }, 0);
  score += Math.min(serviceMatches * 2, 15);

  // 5. Guarantee language (10 points max)
  const guaranteeMatches = SPAM_PATTERNS.guaranteePatterns.reduce((count, pattern) => {
    return count + (text.match(pattern) || []).length;
  }, 0);
  score += Math.min(guaranteeMatches * 3, 10);

  // 6. Rating manipulation (10 points max)
  const ratingMatches = SPAM_PATTERNS.ratingPatterns.reduce((count, pattern) => {
    return count + (text.match(pattern) || []).length;
  }, 0);
  score += Math.min(ratingMatches * 2, 10);

  // 7. Message structure analysis (10 points max)
  // Check for excessive bullet points or lists
  const bulletPoints = (text.match(/[•\-\*]/g) || []).length;
  if (bulletPoints > 3) score += 5;

  // Check for excessive line breaks (spam formatting)
  const lineBreaks = (text.match(/\n/g) || []).length;
  if (lineBreaks > 5) score += 3;

  // Check for excessive caps
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.3) score += 2;

  // 8. Suspicious email patterns (5 points max)
  if (email) {
    const emailDomain = email.split('@')[1]?.toLowerCase();
    const suspiciousDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    if (suspiciousDomains.includes(emailDomain)) {
      // Check if email contains promotional keywords
      if (SPAM_PATTERNS.promotionalKeywords.some(keyword => 
        email.toLowerCase().includes(keyword.toLowerCase())
      )) {
        score += 5;
      }
    }
  }

  // 10. Specific spam phrases (10 points max)
  const spamPhrases = [
    'contact me on whatsapp',
    'call me on whatsapp', 
    'reach out on whatsapp',
    'get in touch on whatsapp',
    'contacto en whatsapp',
    'llámame en whatsapp',
    'kontaktieren sie mich auf whatsapp',
    'kontaktieren sie mich per whatsapp',
    'for guaranteed results',
    'para resultados garantizados',
    'für garantierte ergebnisse',
    'offer google reviews',
    'ofrezco reseñas de google',
    'biete google bewertungen',
    'contáctame en whatsapp'
  ];
  
  const phraseMatches = spamPhrases.filter(phrase => 
    text.includes(phrase.toLowerCase())
  );
  score += Math.min(phraseMatches.length * 5, 10);

  // 11. Message length analysis (5 points max)
  if (message.length > 500) {
    // Very long messages are often spam
    score += 3;
  }
  if (message.length < 20) {
    // Very short messages might be spam
    score += 2;
  }

  return Math.min(score, 100);
}

/**
 * Check if a message is likely spam
 * @param {string} message - The message to check
 * @param {string} name - The sender's name
 * @param {string} email - The sender's email
 * @param {string} phone - The sender's phone
 * @returns {boolean} - True if spam, false if legitimate
 */
function isSpam(message, name, email, phone) {
  const score = calculateSpamScore(message, name, email, phone);
  
  // Thresholds:
  // 0-30: Legitimate
  // 31-44: Suspicious (but allow through)
  // 45-70: Likely spam (silent discard)
  // 71+: Definite spam (silent discard)
  
  return score >= 45;
}

/**
 * Log spam attempt for analysis (optional)
 * @param {Object} leadData - The lead data that was flagged as spam
 * @param {number} score - The spam score
 */
async function logSpamAttempt(leadData, score) {
  try {
    // Optional: Log to database for analysis
    // This helps improve the detection system over time
    await query(`
      INSERT INTO spam_logs (name, email, phone, message, score, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [leadData.name, leadData.email, leadData.phone, leadData.message, score]);
  } catch (error) {
    // Silently fail - don't let logging errors affect the main flow
    console.log('Spam logging failed:', error.message);
  }
}

/**
 * Spam detection middleware
 * Analyzes incoming lead data and silently discards spam
 */
const spamDetection = (options = {}) => {
  return async (req, res, next) => {
    try {
      const { name, email, phone, message } = req.body;
      
      // Skip spam detection if no message
      if (!message || message.trim().length === 0) {
        return next();
      }

      const spamScore = calculateSpamScore(message, name, email, phone);
      const isSpamMessage = isSpam(message, name, email, phone);

      if (isSpamMessage) {
        // Log the spam attempt for analysis
        await logSpamAttempt({ name, email, phone, message }, spamScore);
        
        // Silently discard - return success response but don't process the lead
        return res.json({ 
          success: true, 
          message: 'Thank you for your message. We will get back to you soon.' 
        });
      }

      // Add spam score to request for potential logging
      req.spamScore = spamScore;
      next();
      
    } catch (error) {
      // If spam detection fails, allow the request through
      // Better to have false negatives than false positives
      console.log('Spam detection error:', error.message);
      next();
    }
  };
};

module.exports = {
  spamDetection,
  calculateSpamScore,
  isSpam,
  logSpamAttempt
};
