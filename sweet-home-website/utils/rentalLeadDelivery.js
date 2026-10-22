function clean(value) {
  const text = String(value == null ? '' : value).trim();
  return text || null;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stayMonths(value) {
  const text = clean(value);
  if (!text) return null;
  return text.replace(/\s*(months|monate)$/i, '').trim() || null;
}

function parseRentalMessage(message) {
  const parsed = {};
  const lines = String(message || '').split('\n');
  for (const line of lines) {
    if (!line.trim()) break;
    const match = line.match(/^(Apartment|Wohnung|Neighborhood|Lage|Move-in|Einzug|Stay|Aufenthalt|People|Personen):\s*(.*)$/);
    if (!match) continue;
    const label = match[1];
    const value = match[2].trim();
    if (label === 'Apartment' || label === 'Wohnung') parsed.title = value;
    if (label === 'Neighborhood' || label === 'Lage') parsed.neighborhood = value;
    if (label === 'Move-in' || label === 'Einzug') parsed.moveIn = value;
    if (label === 'Stay' || label === 'Aufenthalt') parsed.stay = value;
    if (label === 'People' || label === 'Personen') parsed.people = value;
  }
  return parsed;
}

function absoluteUrl(originBase, path) {
  const origin = String(originBase || '').replace(/\/$/, '');
  const raw = clean(path);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!origin) return raw.startsWith('/') ? raw : `/${raw}`;
  return `${origin}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function rentalFieldsFromLead(leadData, originBase) {
  if (String(leadData && leadData.source || '') !== 'rental_inquiry') return null;
  const attached = leadData.rentalLead && typeof leadData.rentalLead === 'object' ? leadData.rentalLead : {};
  const parsed = parseRentalMessage(leadData.message);
  const path = clean(attached.path) || clean(leadData.page_path);
  const slugFromPath = path ? path.split('/').filter(Boolean).pop() : null;
  return {
    lead_type: 'rental',
    property_title: clean(attached.title) || clean(parsed.title),
    property_slug: clean(attached.slug) || slugFromPath,
    property_url: absoluteUrl(originBase, clean(attached.url) || path),
    rental_neighborhood: clean(attached.neighborhood) || clean(parsed.neighborhood),
    rental_move_in: clean(attached.moveIn) || clean(parsed.moveIn),
    rental_stay_months: stayMonths(attached.stay) || stayMonths(parsed.stay),
    rental_people: clean(attached.people) || clean(parsed.people)
  };
}

function applyRentalToZapierPayload(payload, leadData, originBase) {
  const rental = rentalFieldsFromLead(leadData, originBase);
  if (!rental) return payload;
  return Object.assign({}, payload, {
    lead_type: rental.lead_type,
    property_title: rental.property_title || payload.property_title || null,
    property_slug: rental.property_slug || payload.property_slug || null,
    property_url: rental.property_url || payload.property_url || null,
    rental_neighborhood: rental.rental_neighborhood,
    rental_move_in: rental.rental_move_in,
    rental_stay_months: rental.rental_stay_months,
    rental_people: rental.rental_people
  });
}

function rentalLanguage(language) {
  return String(language || '').slice(0, 2).toLowerCase() === 'de' ? 'de' : 'en';
}

function rentalThankYouEmail({ name, apartmentTitle, language }) {
  const lang = rentalLanguage(language);
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(apartmentTitle);
  if (lang === 'de') {
    return {
      subject: `Vielen Dank für Ihre Anfrage zu ${apartmentTitle}`,
      html: `
        <p>Hallo ${safeName},</p>
        <p>Vielen Dank für Ihre Anfrage zu <strong>${safeTitle}</strong>. Das ist eine Anfrage, keine Buchung. Unser Team meldet sich bei Ihnen.</p>
        <p>Mit freundlichen Grüßen,<br/>Sweet Home Real Estate Investments</p>
      `,
      text: `Hallo ${name},\n\nVielen Dank für Ihre Anfrage zu ${apartmentTitle}. Das ist eine Anfrage, keine Buchung. Unser Team meldet sich bei Ihnen.\n\nMit freundlichen Grüßen,\nSweet Home Real Estate Investments`
    };
  }
  return {
    subject: `Thank you for your inquiry about ${apartmentTitle}`,
    html: `
      <p>Hi ${safeName},</p>
      <p>Thank you for your inquiry about <strong>${safeTitle}</strong>. This is a request, not a booking. Our team will be in touch soon.</p>
      <p>Best regards,<br/>Sweet Home Real Estate Investments' team</p>
    `,
    text: `Hi ${name},\n\nThank you for your inquiry about ${apartmentTitle}. This is a request, not a booking. Our team will be in touch soon.\n\nBest regards,\nSweet Home Real Estate Investments' team`
  };
}

function detailLine(label, value) {
  const text = clean(value);
  if (!text) return '';
  return `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(text)}</li>`;
}

function rentalStaffEmail({
  name,
  email,
  phone,
  language,
  visitorMessage,
  apartmentTitle,
  apartmentUrl,
  neighborhood,
  moveIn,
  stay,
  people
}) {
  const stayLabel = stayMonths(stay);
  const rows = [
    detailLine('Lead type', 'Rental'),
    detailLine('Apartment', apartmentTitle),
    apartmentUrl ? `<li><strong>Apartment URL:</strong> <a href="${escapeHtml(apartmentUrl)}">${escapeHtml(apartmentUrl)}</a></li>` : '',
    detailLine('Neighborhood', neighborhood),
    detailLine('Name', name),
    detailLine('Email', email),
    detailLine('Phone', phone),
    detailLine('Language', language),
    detailLine('Move-in', moveIn),
    detailLine('Stay (months)', stayLabel),
    detailLine('People', people)
  ].filter(Boolean);
  const messageHtml = clean(visitorMessage)
    ? `<p><strong>Message:</strong><br/>${escapeHtml(visitorMessage).replace(/\n/g, '<br/>')}</p>`
    : '';
  const textRows = [
    'Lead type: Rental',
    apartmentTitle ? `Apartment: ${apartmentTitle}` : '',
    apartmentUrl ? `Apartment URL: ${apartmentUrl}` : '',
    neighborhood ? `Neighborhood: ${neighborhood}` : '',
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : '',
    language ? `Language: ${language}` : '',
    moveIn ? `Move-in: ${moveIn}` : '',
    stayLabel ? `Stay (months): ${stayLabel}` : '',
    people ? `People: ${people}` : '',
    visitorMessage ? `Message: ${visitorMessage}` : ''
  ].filter(Boolean);
  return {
    subject: `New rental lead for ${apartmentTitle}`,
    html: `
      <p>You have a new rental lead for <strong>${escapeHtml(apartmentTitle)}</strong>.</p>
      <ul>
        ${rows.join('\n')}
      </ul>
      ${messageHtml}
      <p>You can view this lead in the CRM from your dashboard.</p>
      <p style="margin-top:16px;">Best regards,<br/>Sweet Home Real Estate Investments' team</p>
    `,
    text: textRows.join('\n')
  };
}

module.exports = {
  applyRentalToZapierPayload,
  rentalFieldsFromLead,
  rentalThankYouEmail,
  rentalStaffEmail
};
