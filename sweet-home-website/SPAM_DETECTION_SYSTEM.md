# Spam Detection System

## Overview
A comprehensive spam detection middleware that silently filters promotional messages from all contact forms while maintaining a seamless user experience.

## Features
- **Silent Filtering**: Users see success messages but spam is discarded without any notifications, emails, or CRM entries
- **Multi-language Support**: Detects spam in German, English, and Spanish
- **Comprehensive Detection**: Uses multiple detection methods including keyword analysis, pattern matching, and content structure analysis
- **Conservative Approach**: Prioritizes avoiding false positives to prevent losing legitimate clients
- **Logging**: Optional logging of detected spam for system improvement

## Implementation

### Files Created/Modified
- `middleware/spamDetection.js` - Main spam detection logic
- `routes/leadRoutes.js` - Integrated spam detection middleware
- `mitigations/create_spam_logs.sql` - Database table for spam logging

### Detection Methods

#### 1. Promotional Keywords (25 points max)
Detects spam-related terms in multiple languages:
- **German**: bewertungsanbieter, google gmb, trustpilot, etc.
- **English**: google reviews, fake reviews, review service, etc.
- **Spanish**: reseñas falsas, servicio de reseñas, etc.

#### 2. Phone Number Patterns (15 points max)
Detects international phone numbers and WhatsApp contact requests

#### 3. Excessive Emojis (10 points max)
Flags messages with excessive use of promotional emojis (⭐, 🌟, 💪, etc.)

#### 4. Service Listings (15 points max)
Detects bullet-pointed service offerings

#### 5. Guarantee Language (10 points max)
Identifies guarantee/satisfaction promises

#### 6. Rating Manipulation (10 points max)
Detects fake review and rating manipulation offers

#### 7. Message Structure Analysis (10 points max)
- Excessive bullet points
- Excessive line breaks
- Excessive capitalization

#### 8. Suspicious Email Patterns (5 points max)
Flags emails with promotional keywords

#### 9. Specific Spam Phrases (10 points max)
Detects common spam phrases like "contact me on WhatsApp"

#### 10. Message Length Analysis (5 points max)
Flags very short or very long messages

## Scoring Thresholds
- **0-30**: Legitimate (allow through)
- **31-44**: Suspicious (allow through)
- **45-70**: Likely spam (silent discard)
- **71+**: Definite spam (silent discard)

## Integration
The spam detection middleware is integrated into all lead creation endpoints:
- `/api/leads` (property contact forms)
- `/api/leads/project` (project contact forms)
- `/api/leads/contact` (general contact forms)

## Database Migration
Run the following SQL to create the spam logging table:
```sql
-- Create spam_logs table for analysis and improvement
CREATE TABLE IF NOT EXISTS spam_logs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(30),
  message TEXT,
  score INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for analysis
CREATE INDEX IF NOT EXISTS idx_spam_logs_score ON spam_logs(score);
CREATE INDEX IF NOT EXISTS idx_spam_logs_created_at ON spam_logs(created_at);
```

## Testing Results
The system successfully detects:
- ✅ German spam (original example): Score 69/100
- ✅ Realistic English spam: Score 51/100
- ✅ Realistic Spanish spam: Score 48/100
- ✅ Legitimate inquiries: Score 0/100
- ✅ Business inquiries: Score 0/100

## Benefits
1. **Protects CRM**: Prevents spam from cluttering the lead management system
2. **Saves Resources**: No emails sent, no Zapier integrations triggered for spam
3. **Maintains UX**: Users always see success messages
4. **Improves Over Time**: Spam logging allows for system refinement
5. **Multi-language**: Handles spam in multiple languages
6. **Conservative**: Prioritizes not losing legitimate clients

## Maintenance
- Monitor spam logs regularly to identify new patterns
- Adjust scoring thresholds based on real-world performance
- Add new keywords/phrases as spam tactics evolve
- Review false positives to improve accuracy
