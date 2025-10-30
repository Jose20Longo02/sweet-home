// middleware/spamDetection.js
const { query } = require('../config/db');

/**
 * Comprehensive spam detection middleware
 * Analyzes messages using multiple detection methods and silently discards spam
 */

// Rental inquiry detection patterns (multi-language)
// IMPORTANT: Only reject messages that CLEARLY indicate RENTAL interest (not purchase)
// Buyers also "look for apartments" - we must be very specific to avoid false positives
const RENTAL_PATTERNS = {
  // CLEAR rental-only keywords (not purchase-related)
  rentalOnlyKeywords: [
    // English - rental-specific terms
    'available for rent', 'apartments for rent', 'rental apartment', 'for rent',
    'looking to rent', 'interested in renting', 'need to rent', 'willing to rent',
    'monthly rent', 'rent per month', 'renting an apartment', 'rent a flat',
    
    // German - rental-specific terms
    'wohnung zu mieten', 'wohnung mieten', 'möchte mieten', 'würde mieten',
    'zur miete', 'mietwohnung', 'mieten möchte', 'zu vermieten',
    'monatliche miete', 'miete pro monat',
    
    // Spanish - rental-specific terms
    'apartamento en alquiler', 'disponible para alquilar', 'en alquiler',
    'necesito alquilar', 'quiero alquilar', 'alquiler mensual',
    'alquilar un apartamento', 'alquilar piso'
  ],
  
  // Phrases that CLEARLY indicate rental (require monthly budget context)
  rentalPhrases: [
    // Monthly budget + apartment (very specific)
    /\d+\s*eur\s+(per|a)\s+month/i,
    /\d+\s*eur\s*\/\s*month/i,
    /\d+\s*eur\s+(im|pro)\s+monat/i,
    /\d+\s*eur\s+(al|por)\s+mes/i,
    /monthly\s+rent/i,
    /monatliche\s+miete/i,
    /alquiler\s+mensual/i,
    /rent\s+(is|of|per)\s+/i,
    /miete\s+(ist|von|pro)/i,
    /alquiler\s+(es|de|por)/i,
    
    // Temporary stay (rental indicator)
    /staying\s+(until|till|for)/i,
    /will\s+be\s+staying/i,
    /will\s+stay/i,
    /bleibe\s+bis/i,
    /wohnen\s+bis/i,
    /me\s+quedar[éa]\s+hasta/i,
    /estar[éa]\s+hasta/i,
    
    // Available FOR RENT specifically
    /available\s+for\s+rent/i,
    /apartments?\s+for\s+rent/i,
    /verfügbar\s+(für|zur)\s+miete/i,
    /disponible\s+(para|en)\s+alquiler/i,
    
    // Rental-specific requests
    /looking\s+to\s+rent/i,
    /interested\s+in\s+renting/i,
    /need\s+to\s+rent/i,
    /möchte\s+mieten/i,
    /würde\s+mieten/i,
    /necesito\s+alquilar/i,
    /quiero\s+alquilar/i
  ],
  
  // Monthly budget patterns (must be clearly monthly, not purchase price)
  monthlyBudgetPatterns: [
    // Clear monthly indicators
    /\d+\s*eur\s+(per|a)\s+month/gi,
    /\d+\s*eur\s*\/\s*month/gi,
    /\d+\s*eur\s+(im|pro)\s+monat/gi,
    /\d+\s*eur\s+(al|por)\s+mes/gi,
    /up\s+to\s+\d+\s*eur\s+(a|per)\s+month/gi,
    /up\s+until\s+\d+\s*eur\s+(a|per)\s+month/gi,
    /bis\s+(zu\s+)?\d+\s*eur\s+(im|pro)\s+monat/gi,
    /hasta\s+\d+\s*eur\s+(al|por)\s+mes/gi,
    /monthly\s+(budget|rent)/gi,
    /monatliche\s+(budget|miete)/gi,
    /alquiler\s+mensual/gi
  ]
};

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
 * Check if message is a rental inquiry (should be rejected for sales-only business)
 * @param {string} message - The message to analyze
 * @param {string} name - The sender's name
 * @param {string} email - The sender's email
 * @param {string} phone - The sender's phone
 * @returns {boolean} - True if rental inquiry
 */
function isRentalInquiry(message, name, email, phone) {
  if (!message) return false;
  
  const text = message.toLowerCase();
  const fullText = `${name || ''} ${email || ''} ${phone || ''} ${message}`.toLowerCase();
  let rentalScore = 0;

  // CRITICAL: We require CLEAR rental indicators, not generic "looking for apartment"
  // Buyers also look for apartments! We must be very specific.

  // 1. Check for RENTAL-ONLY keywords (not purchase-related) (25 points max)
  const rentalOnlyMatches = RENTAL_PATTERNS.rentalOnlyKeywords.filter(keyword => 
    text.includes(keyword.toLowerCase())
  );
  rentalScore += Math.min(rentalOnlyMatches.length * 8, 25);

  // 2. Check for CLEAR monthly budget patterns (40 points - strongest indicator)
  // This is the most reliable sign it's rental, not purchase
  const monthlyBudgetMatches = RENTAL_PATTERNS.monthlyBudgetPatterns.reduce((count, pattern) => {
    return count + (fullText.match(pattern) || []).length;
  }, 0);
  if (monthlyBudgetMatches > 0) {
    // Monthly budget is a STRONG rental indicator (not purchase price)
    rentalScore += 40;
  }

  // 3. Check for temporary stay language (rental-specific) (20 points max)
  // "staying until December 2026" = rental, not purchase
  const temporaryStayMatches = fullText.match(/(staying|will be staying|will stay|bleibe|wohnen|quedar|estar)\s+(until|till|for|bis|hasta)/gi);
  if (temporaryStayMatches && temporaryStayMatches.length > 0) {
    rentalScore += 20;
  }

  // 4. Check for clear rental phrases (25 points max)
  const phraseMatches = RENTAL_PATTERNS.rentalPhrases.reduce((count, pattern) => {
    return count + (fullText.match(pattern) || []).length;
  }, 0);
  rentalScore += Math.min(phraseMatches * 5, 25);

  // 5. Multiple strong indicators boost confidence (10 points max)
  // Require at least monthly budget OR rental-only keyword + temporary stay
  if (monthlyBudgetMatches > 0 && (rentalOnlyMatches.length > 0 || temporaryStayMatches)) {
    rentalScore += 10;
  }

  // CONSERVATIVE threshold: Require STRONG evidence (50+ points)
  // This ensures we only reject CLEAR rental inquiries, not buyers
  // Monthly budget alone (40 points) is not enough - need another indicator
  return rentalScore >= 50;
}

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
      const isRental = isRentalInquiry(message, name, email, phone);

      // Reject if spam OR rental inquiry
      if (isSpamMessage || isRental) {
        // Log the rejected attempt for analysis
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
  isRentalInquiry,
  logSpamAttempt
};
