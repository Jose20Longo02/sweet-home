// config/mailer.js
const nodemailer = require('nodemailer');

const enableDebug = String(process.env.SMTP_DEBUG || 'false') === 'true';

const transporter = nodemailer.createTransport({
  host:     process.env.SMTP_HOST,
  port:     Number(process.env.SMTP_PORT) || 587,
  secure:   String(process.env.SMTP_SECURE) === 'true', // true for 465, false for 587/25
  auth: (process.env.SMTP_USER && process.env.SMTP_PASS) ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined,
  logger: enableDebug,
  debug: enableDebug,
  tls: {
    // Allow overriding strict TLS in dev if needed
    rejectUnauthorized: String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true') === 'true'
  }
});

function summary() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE) === 'true',
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    authUserSet: Boolean(process.env.SMTP_USER),
    tlsRejectUnauthorized: String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true') === 'true'
  };
}

if (enableDebug) {
  try { console.log('SMTP config summary:', summary()); } catch (_) {}
}

function extractEmailAddress(value) {
  if (!value) return '';
  const str = String(value).trim();
  const m = str.match(/<\s*([^>\s]+)\s*>/);
  if (m && m[1]) return m[1].trim();
  return str.replace(/[<>]/g, '').trim();
}

function normalizeRecipients(value) {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : String(value).split(/[;,]/);
  const emails = parts
    .map(v => extractEmailAddress(v))
    .map(v => v.replace(/[\r\n]/g, '').trim())
    .filter(v => v);
  return emails;
}

async function sendMail({ to, subject, html, text, replyTo, cc, bcc }) {
  const rawFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromEmail = extractEmailAddress(rawFrom);
  const displayName = String(process.env.MAIL_FROM_NAME || 'Sweet Home Platform').replace(/[\r\n]/g, '').trim();
  const toList = normalizeRecipients(to);
  const replyToAddr = replyTo ? extractEmailAddress(replyTo) : undefined;
  const ccList = normalizeRecipients(cc);
  const bccList = normalizeRecipients(bcc);
  if (toList.length === 0) {
    const err = new Error('No recipients defined');
    if (enableDebug) {
      console.error('Send Error:', err.message, { subject, to_raw: to });
    }
    throw err;
  }
  try {
    // Build full envelope recipients to ensure SMTP delivery semantics include cc/bcc as needed
    const envelopeRecipients = Array.from(new Set([...
      toList,
      ...ccList,
      ...bccList
    ]));
    const info = await transporter.sendMail({
      from: { name: displayName, address: fromEmail },
      envelope: { from: fromEmail, to: envelopeRecipients.length ? envelopeRecipients : toList },
      to: toList,
      ...(ccList.length ? { cc: ccList } : {}),
      ...(bccList.length ? { bcc: bccList } : {}),
      subject,
      html,
      text,
      ...(replyToAddr ? { replyTo: replyToAddr } : {})
    });
    if (enableDebug) {
      try {
        console.log('Email send result:', {
          messageId: info && info.messageId,
          accepted: info && info.accepted,
          rejected: info && info.rejected,
          response: info && info.response
        });
      } catch (_) { /* ignore */ }
    }
    return info;
  } catch (err) {
    if (enableDebug) {
      console.warn('Email send error:', err && (err.stack || err.message || err));
    }
    throw err;
  }
}

// Expose a verify helper to check SMTP credentials at startup
sendMail.verify = () => transporter.verify();
sendMail.summary = summary;

module.exports = sendMail;