const slugify = require('slugify');
const { query } = require('../config/db');
const { translateText } = require('../config/translator');
const locations = require('../config/locations');
const FurnishedRental = require('../models/FurnishedRental');
const { deleteUnusedRentalPhotos } = require('../utils/rentalPhotoFiles');
const leadController = require('./leadController');

function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function numberOrNull(value) {
  const raw = text(value).replace(',', '.');
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : NaN;
}

function integerOrNull(value) {
  const num = numberOrNull(value);
  if (num === null || Number.isNaN(num)) return num;
  if (!Number.isInteger(num)) return NaN;
  return num;
}

function formatDate(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const BERLIN_NEIGHBORHOODS = ((locations.Germany || {}).Berlin) || [];

function neighborhoodOptions(current) {
  const options = BERLIN_NEIGHBORHOODS.slice();
  const value = text(current);
  if (value && !options.includes(value)) options.unshift(value);
  return options;
}

function listOf(value) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).map(text).filter(Boolean);
}

function collectPhotos(body, uploadedUrls) {
  let tokens = body.photos_order || body['photos_order[]'] || [];
  if (typeof tokens === 'string') tokens = [tokens];
  tokens = tokens.map(text).filter(Boolean);
  if (body.photos_managed === '1' || tokens.length) {
    const photos = [];
    tokens.forEach((token) => {
      if (token.startsWith('url:')) {
        const url = token.slice(4);
        if (url) photos.push(url);
        return;
      }
      if (token.startsWith('file:')) {
        const index = Number(token.slice(5));
        if (uploadedUrls[index]) photos.push(uploadedUrls[index]);
      }
    });
    return photos;
  }
  const removed = new Set(listOf(body.remove_photos));
  const kept = listOf(body.existing_photos).filter((url) => !removed.has(url));
  return [...kept, ...uploadedUrls];
}

function makeSlug(value) {
  return slugify(text(value), { lower: true, strict: true, locale: 'de' });
}

function otherLanguage(language) {
  return language === 'en' ? 'de' : 'en';
}

function languageName(language) {
  return language === 'en' ? 'English' : 'German';
}

function storedText(bag, language) {
  if (!bag || typeof bag !== 'object') return '';
  return bag[language] || '';
}

async function uniqueSlug(base, language, exceptId) {
  let slug = base;
  let i = 1;
  while (true) {
    const taken = language === 'en'
      ? await FurnishedRental.englishSlugTaken(slug, exceptId)
      : await FurnishedRental.slugTaken(slug, exceptId);
    if (!taken) return slug;
    i += 1;
    slug = `${base}-${i}`;
    if (i > 50) return `${base}-${Date.now()}`;
  }
}

async function translateField(value, sourceLang, targetLang) {
  const translated = await translateText(value, targetLang, { sourceLang });
  return translated && text(translated) ? translated : '';
}

async function prepareCopy({ existing, sourceLang, title, description, note, publishing }) {
  const other = otherLanguage(sourceLang);
  const exceptId = existing ? existing.id : null;
  const sourceUnchanged = Boolean(existing)
    && existing.content_language === sourceLang
    && storedText(existing.title_i18n, sourceLang) === title
    && storedText(existing.description_i18n, sourceLang) === description
    && storedText(existing.utilities_note_i18n, sourceLang) === note;

  const titleI18n = { [sourceLang]: title };
  const descriptionI18n = { [sourceLang]: description };
  const noteI18n = note ? { [sourceLang]: note } : {};

  if (sourceUnchanged) {
    const keptTitle = storedText(existing.title_i18n, other);
    const keptDescription = storedText(existing.description_i18n, other);
    const keptNote = storedText(existing.utilities_note_i18n, other);
    if (keptTitle) titleI18n[other] = keptTitle;
    if (keptDescription) descriptionI18n[other] = keptDescription;
    if (note && keptNote) noteI18n[other] = keptNote;
  }

  if (publishing && (!titleI18n[other] || !descriptionI18n[other] || (note && !noteI18n[other]))) {
    if (!titleI18n[other]) titleI18n[other] = await translateField(title, sourceLang, other);
    if (!descriptionI18n[other]) descriptionI18n[other] = await translateField(description, sourceLang, other);
    if (note && !noteI18n[other]) noteI18n[other] = await translateField(note, sourceLang, other);
    if (!titleI18n[other] || !descriptionI18n[other] || (note && !noteI18n[other])) {
      return { error: `Publish needs the ${languageName(other)} text. The translation did not complete, so nothing was published. Try Publish again.` };
    }
  }

  const germanTitle = titleI18n.de || title;
  const englishTitle = titleI18n.en || '';
  const germanBase = makeSlug(germanTitle);
  const englishBase = englishTitle ? makeSlug(englishTitle) : '';
  if (!germanBase) return { error: 'The title needs letters or numbers so a web address can be created.' };
  const slug = await uniqueSlug(germanBase, 'de', exceptId);
  const slugEn = englishBase ? await uniqueSlug(englishBase, 'en', exceptId) : '';

  return {
    title,
    title_i18n: titleI18n,
    description,
    description_i18n: descriptionI18n,
    slug,
    slug_i18n: { de: slug, ...(slugEn ? { en: slugEn } : {}) },
    utilities_note: note || null,
    utilities_note_i18n: noteI18n,
    content_language: sourceLang
  };
}

async function staffMembers() {
  const { rows } = await query(
    `SELECT id, name, email
       FROM users
      WHERE role IN ('Admin', 'SuperAdmin') AND approved = true
      ORDER BY name`
  );
  return rows;
}

function emptyValues() {
  return {
    content_language: '',
    title: '',
    description: '',
    city: 'Berlin', neighborhood: '', full_address: '',
    size_sqm: '', rooms: '', floor: '',
    monthly_rent: '', deposit: '',
    utilities_mode: 'included', utilities_amount: '', utilities_note: '',
    available_from: '', min_stay_months: '', max_stay_months: '',
    agent_id: '', status: 'draft'
  };
}

function valuesFromRental(rental) {
  if (!rental) return emptyValues();
  const sourceLang = rental.content_language === 'en' ? 'en' : 'de';
  return {
    content_language: rental.content_language || '',
    title: storedText(rental.title_i18n, sourceLang) || rental.title || '',
    description: storedText(rental.description_i18n, sourceLang) || rental.description || '',
    city: rental.city || 'Berlin',
    neighborhood: rental.neighborhood || '',
    full_address: rental.full_address || '',
    size_sqm: rental.size_sqm ?? '',
    rooms: rental.rooms ?? '',
    floor: rental.floor ?? '',
    monthly_rent: rental.monthly_rent ?? '',
    deposit: rental.deposit ?? '',
    utilities_mode: rental.utilities_included ? 'included' : 'amount',
    utilities_amount: rental.utilities_amount ?? '',
    utilities_note: storedText(rental.utilities_note_i18n, sourceLang) || rental.utilities_note || '',
    available_from: formatDate(rental.available_from),
    min_stay_months: rental.min_stay_months ?? '',
    max_stay_months: rental.max_stay_months ?? '',
    agent_id: rental.agent_id || '',
    status: rental.status || 'draft'
  };
}

function translationPreview(rental, sourceLang) {
  if (!rental || (sourceLang !== 'de' && sourceLang !== 'en')) return null;
  const other = otherLanguage(sourceLang);
  const title = storedText(rental.title_i18n, other);
  const description = storedText(rental.description_i18n, other);
  if (!title && !description) return null;
  return {
    languageName: languageName(other),
    title,
    description,
    note: storedText(rental.utilities_note_i18n, other)
  };
}

function dashboardPath(req) {
  return req.session.user?.role === 'SuperAdmin' ? '/superadmin/dashboard' : '/admin/dashboard';
}

function euro(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return `${num.toLocaleString('de-DE')} €`;
}

function presentRental(rental) {
  const photos = Array.isArray(rental.photos) ? rental.photos.filter(Boolean) : [];
  const minStay = rental.min_stay_months == null ? null : Number(rental.min_stay_months);
  const maxStay = rental.max_stay_months == null ? null : Number(rental.max_stay_months);
  let stayLabel = '';
  if (minStay && maxStay) stayLabel = `${minStay}–${maxStay} months`;
  else if (minStay) stayLabel = minStay === 1 ? 'From 1 month' : `From ${minStay} months`;
  else if (maxStay) stayLabel = maxStay === 1 ? 'Up to 1 month' : `Up to ${maxStay} months`;
  const available = formatDate(rental.available_from);
  const availableLabel = available
    ? available.slice(8, 10) + '.' + available.slice(5, 7) + '.' + available.slice(0, 4)
    : '';
  const size = rental.size_sqm == null || rental.size_sqm === '' ? null : Number(rental.size_sqm);
  return {
    ...rental,
    photos,
    cover: photos[0] || '',
    thumbs: photos.slice(1, 4),
    extraCount: Math.max(photos.length - 4, 0),
    rentLabel: euro(rental.monthly_rent),
    depositLabel: euro(rental.deposit),
    utilitiesLabel: rental.utilities_included
      ? 'Utilities included'
      : (rental.utilities_amount != null && rental.utilities_amount !== '' ? `${euro(rental.utilities_amount)} / month` : ''),
    sizeLabel: size == null || Number.isNaN(size) ? '' : `${size.toLocaleString('de-DE', { maximumFractionDigits: 2 })} m²`,
    roomsLabel: rental.rooms == null || rental.rooms === '' ? '' : (Number(rental.rooms) === 1 ? '1 room' : `${rental.rooms} rooms`),
    floorLabel: rental.floor == null || rental.floor === '' ? '' : `Floor ${rental.floor}`,
    availableLabel,
    stayLabel,
    languageLabel: rental.content_language === 'en' ? 'EN' : 'DE',
    statusLabel: rental.status === 'published' ? 'Published' : 'Draft'
  };
}

function showSuperadminSidebar(req) {
  return req.baseUrl.startsWith('/superadmin/');
}

async function pendingRequestCount() {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count
       FROM users
      WHERE role IN ('Admin', 'SuperAdmin') AND approved = false`
  );
  return rows[0] ? rows[0].count : 0;
}

async function renderForm(req, res, { rental, values, photos, error, statusCode }) {
  const agents = await staffMembers();
  const superadmin = showSuperadminSidebar(req);
  const sourceMatches = rental
    && values.content_language
    && rental.content_language === values.content_language
    && storedText(rental.title_i18n, values.content_language) === values.title
    && storedText(rental.description_i18n, values.content_language) === values.description;
  return res.status(statusCode || 200).render('admin/rentals/form', {
    title: rental ? 'Edit furnished apartment' : 'New furnished apartment',
    rental,
    values,
    translation: sourceMatches ? translationPreview(rental, values.content_language) : null,
    photos: photos || [],
    neighborhoods: neighborhoodOptions(values.neighborhood),
    agents,
    error: error || null,
    rentalBase: req.baseUrl,
    dashboardPath: dashboardPath(req),
    currentUser: req.session.user,
    showSuperadminSidebar: superadmin,
    pendingCount: superadmin ? await pendingRequestCount() : 0
  });
}

exports.list = async (req, res, next) => {
  try {
    const rentals = (await FurnishedRental.list()).map(presentRental);
    const superadmin = showSuperadminSidebar(req);
    res.render('admin/rentals/list', {
      title: 'Furnished apartments',
      rentals,
      rentalBase: req.baseUrl,
      dashboardPath: dashboardPath(req),
      showSuperadminSidebar: superadmin,
      pendingCount: superadmin ? await pendingRequestCount() : 0
    });
  } catch (error) {
    next(error);
  }
};

exports.form = async (req, res, next) => {
  try {
    const rental = req.params.id ? await FurnishedRental.findById(req.params.id) : null;
    if (req.params.id && !rental) return res.status(404).send('Apartment not found');
    const values = valuesFromRental(rental);
    if (!values.agent_id) values.agent_id = req.session.user.id;
    const notice = req.query.notice === 'translate'
      ? 'Publish needs the other language. The translation did not complete, so the apartment stayed as it was. Try Publish again.'
      : null;
    return renderForm(req, res, {
      rental,
      values,
      photos: rental ? (rental.photos || []) : [],
      error: notice
    });
  } catch (error) {
    return next(error);
  }
};

exports.save = async (req, res, next) => {
  let uploaded = [];
  let persisted = false;
  try {
    const existing = req.params.id ? await FurnishedRental.findById(req.params.id) : null;
    if (req.params.id && !existing) return res.status(404).send('Apartment not found');

    const body = req.body || {};
    const values = {
      content_language: text(body.content_language),
      title: text(body.title),
      description: body.description ? String(body.description) : '',
      city: 'Berlin',
      neighborhood: text(body.neighborhood),
      full_address: text(body.full_address),
      size_sqm: text(body.size_sqm),
      rooms: text(body.rooms),
      floor: text(body.floor),
      monthly_rent: text(body.monthly_rent),
      deposit: text(body.deposit),
      utilities_mode: text(body.utilities_mode) === 'amount' ? 'amount' : 'included',
      utilities_amount: text(body.utilities_amount),
      utilities_note: text(body.utilities_note),
      available_from: text(body.available_from),
      min_stay_months: text(body.min_stay_months),
      max_stay_months: text(body.max_stay_months),
      agent_id: text(body.agent_id) || String(req.session.user.id),
      status: text(body.status) === 'published' ? 'published' : 'draft'
    };

    const errors = [];
    if (values.content_language !== 'de' && values.content_language !== 'en') errors.push('Choose the language of the title and description.');
    if (values.neighborhood && !neighborhoodOptions(existing && existing.neighborhood).includes(values.neighborhood)) {
      errors.push('Choose a Berlin neighborhood.');
    }
    if (values.title.length < 2) errors.push('Title is required.');
    if (!text(values.description)) errors.push('Description is required.');

    const monthlyRent = numberOrNull(values.monthly_rent);
    const deposit = numberOrNull(values.deposit);
    const size = numberOrNull(values.size_sqm);
    const rooms = integerOrNull(values.rooms);
    const floor = integerOrNull(values.floor);
    const utilitiesAmount = numberOrNull(values.utilities_amount);
    const minStay = integerOrNull(values.min_stay_months);
    const maxStay = integerOrNull(values.max_stay_months);

    if (!(monthlyRent > 0)) errors.push('Monthly rent must be greater than 0.');
    if (deposit !== null && (Number.isNaN(deposit) || deposit < 0)) errors.push('Deposit must be a number.');
    if (size !== null && (Number.isNaN(size) || size <= 0)) errors.push('Size must be greater than 0.');
    if (rooms !== null && (Number.isNaN(rooms) || rooms < 0)) errors.push('Rooms must be a whole number.');
    if (floor !== null && Number.isNaN(floor)) errors.push('Floor must be a whole number.');
    if (values.utilities_mode === 'amount' && !(utilitiesAmount >= 0)) errors.push('Enter the monthly utilities amount, or mark utilities as included.');
    if (minStay !== null && (Number.isNaN(minStay) || minStay < 1)) errors.push('Minimum stay must be at least 1 month.');
    if (maxStay !== null && (Number.isNaN(maxStay) || maxStay < 1)) errors.push('Maximum stay must be at least 1 month.');
    if (minStay !== null && maxStay !== null && !Number.isNaN(minStay) && !Number.isNaN(maxStay) && minStay > maxStay) {
      errors.push('Minimum stay cannot be longer than maximum stay.');
    }
    if (values.available_from && !/^\d{4}-\d{2}-\d{2}$/.test(values.available_from)) {
      errors.push('Available-from must be a date.');
    }

    const agents = await staffMembers();
    const agentId = Number(values.agent_id);
    const agentOk = agents.some((agent) => agent.id === agentId);
    if (!agentOk) errors.push('Choose a staff member for this apartment.');

    uploaded = ((req.files && req.files.photos) || []).map((file) => file.url).filter(Boolean);
    const photos = collectPhotos(body, uploaded);
    const kept = photos.filter((url) => !uploaded.includes(url));
    if (!photos.length) errors.push('Add at least one photo.');

    if (errors.length) {
      await deleteUnusedRentalPhotos(uploaded);
      return renderForm(req, res, {
        rental: existing,
        values,
        photos: kept,
        error: errors.join(' '),
        statusCode: 400
      });
    }

    const copy = await prepareCopy({
      existing,
      sourceLang: values.content_language,
      title: values.title,
      description: values.description.trim(),
      note: values.utilities_note,
      publishing: values.status === 'published'
    });
    if (copy.error) {
      await deleteUnusedRentalPhotos(uploaded);
      return renderForm(req, res, {
        rental: existing,
        values,
        photos,
        error: copy.error,
        statusCode: 400
      });
    }

    const record = {
      ...copy,
      photos,
      city: 'Berlin',
      neighborhood: values.neighborhood || null,
      full_address: values.full_address || null,
      size_sqm: size,
      rooms,
      floor,
      monthly_rent: monthlyRent,
      deposit,
      utilities_included: values.utilities_mode === 'included',
      utilities_amount: values.utilities_mode === 'amount' ? utilitiesAmount : null,
      available_from: values.available_from || null,
      min_stay_months: minStay,
      max_stay_months: maxStay,
      status: values.status,
      agent_id: agentId
    };

    const previousPhotos = existing ? (existing.photos || []) : [];
    const saved = existing
      ? await FurnishedRental.update(existing.id, record)
      : await FurnishedRental.create(record);
    persisted = true;

    const keptPhotos = new Set(saved.photos || []);
    await deleteUnusedRentalPhotos(previousPhotos.filter((url) => !keptPhotos.has(url)));

    if (saved.status === 'published') return res.redirect(req.baseUrl);
    return res.redirect(`${req.baseUrl}/${saved.id}/edit`);
  } catch (error) {
    if (!persisted) {
      try { await deleteUnusedRentalPhotos(uploaded); } catch (_) {}
    }
    return next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const rental = await FurnishedRental.findById(req.params.id);
    if (!rental) return res.status(404).send('Apartment not found');
    const photos = rental.photos || [];
    const removed = await FurnishedRental.remove(rental.id);
    if (!removed) return res.status(404).send('Apartment not found');
    await deleteUnusedRentalPhotos(photos);
    return res.redirect(req.baseUrl);
  } catch (error) {
    return next(error);
  }
};

exports.setStatus = async (req, res, next) => {
  try {
    const rental = await FurnishedRental.findById(req.params.id);
    if (!rental) return res.status(404).send('Apartment not found');
    const publishing = text(req.body.status) === 'published';
    if (!publishing) {
      await FurnishedRental.setStatus(rental.id, 'draft');
      return res.redirect(req.baseUrl);
    }
    const sourceLang = rental.content_language === 'en' ? 'en' : 'de';
    const copy = await prepareCopy({
      existing: rental,
      sourceLang,
      title: storedText(rental.title_i18n, sourceLang) || rental.title || '',
      description: storedText(rental.description_i18n, sourceLang) || rental.description || '',
      note: storedText(rental.utilities_note_i18n, sourceLang) || rental.utilities_note || '',
      publishing: true
    });
    if (copy.error) return res.redirect(`${req.baseUrl}/${rental.id}/edit?notice=translate`);
    await FurnishedRental.update(rental.id, {
      ...copy,
      photos: rental.photos || [],
      city: rental.city,
      neighborhood: rental.neighborhood,
      full_address: rental.full_address,
      size_sqm: rental.size_sqm,
      rooms: rental.rooms,
      floor: rental.floor,
      monthly_rent: rental.monthly_rent,
      deposit: rental.deposit,
      utilities_included: rental.utilities_included,
      utilities_amount: rental.utilities_amount,
      available_from: rental.available_from,
      min_stay_months: rental.min_stay_months,
      max_stay_months: rental.max_stay_months,
      status: 'published',
      agent_id: rental.agent_id
    });
    return res.redirect(req.baseUrl);
  } catch (error) {
    return next(error);
  }
};

const CATALOGUE_PATHS = {
  de: '/moeblierte-wohnungen-berlin',
  en: '/en/furnished-apartments-berlin'
};

function apartmentPaths(rental) {
  const i18n = rental.slug_i18n && typeof rental.slug_i18n === 'object' ? rental.slug_i18n : {};
  const enSlug = text(i18n.en);
  return {
    de: rental.slug ? `/moeblierte-wohnung/${rental.slug}` : '',
    en: enSlug ? `/en/furnished-apartment/${enSlug}` : ''
  };
}

function euroPublic(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return `${num.toLocaleString('de-DE')} €`;
}

function excerpt(value) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= 180) return clean;
  const cut = clean.slice(0, 180).replace(/\s+\S*$/, '');
  return `${cut}…`;
}

function catalogueStay(rental, lang) {
  const minStay = rental.min_stay_months == null ? null : Number(rental.min_stay_months);
  const maxStay = rental.max_stay_months == null ? null : Number(rental.max_stay_months);
  if (lang === 'en') {
    if (minStay && maxStay) return `${minStay}–${maxStay} months`;
    if (minStay) return minStay === 1 ? 'From 1 month' : `From ${minStay} months`;
    if (maxStay) return maxStay === 1 ? 'Up to 1 month' : `Up to ${maxStay} months`;
    return '';
  }
  if (minStay && maxStay) return `${minStay}–${maxStay} Monate`;
  if (minStay) return minStay === 1 ? 'Ab 1 Monat' : `Ab ${minStay} Monaten`;
  if (maxStay) return maxStay === 1 ? 'Bis 1 Monat' : `Bis ${maxStay} Monate`;
  return '';
}

function catalogueCard(rental, lang) {
  const photos = Array.isArray(rental.photos) ? rental.photos.filter(Boolean) : [];
  const title = storedText(rental.title_i18n, lang) || rental.title;
  const description = storedText(rental.description_i18n, lang) || rental.description || '';
  const note = storedText(rental.utilities_note_i18n, lang) || rental.utilities_note || '';
  const available = formatDate(rental.available_from);
  const size = rental.size_sqm == null || rental.size_sqm === '' ? null : Number(rental.size_sqm);
  const floor = rental.floor == null || rental.floor === '' ? null : Number(rental.floor);
  let floorLabel = '';
  if (floor != null && !Number.isNaN(floor)) {
    if (lang === 'en') floorLabel = floor === 0 ? 'Ground floor' : `Floor ${floor}`;
    else floorLabel = floor === 0 ? 'Erdgeschoss' : `${floor}. Etage`;
  }
  const rooms = rental.rooms == null || rental.rooms === '' ? null : Number(rental.rooms);
  return {
    id: rental.id,
    title,
    excerpt: excerpt(description),
    cover: photos[0] || '',
    neighborhood: rental.neighborhood || '',
    rentLabel: euroPublic(rental.monthly_rent),
    depositLabel: euroPublic(rental.deposit),
    sizeLabel: size == null || Number.isNaN(size) ? '' : `${size.toLocaleString('de-DE', { maximumFractionDigits: 2 })} m²`,
    roomsLabel: rooms == null || Number.isNaN(rooms) ? '' : (lang === 'en' ? (rooms === 1 ? '1 room' : `${rooms} rooms`) : `${rooms} Zimmer`),
    floorLabel,
    availableLabel: available ? `${available.slice(8, 10)}.${available.slice(5, 7)}.${available.slice(0, 4)}` : '',
    stayLabel: catalogueStay(rental, lang),
    utilitiesLabel: rental.utilities_included
      ? (lang === 'en' ? 'Utilities included' : 'Nebenkosten inklusive')
      : (rental.utilities_amount != null && rental.utilities_amount !== ''
        ? (lang === 'en' ? `Utilities ${euroPublic(rental.utilities_amount)}` : `Nebenkosten ${euroPublic(rental.utilities_amount)}`)
        : ''),
    utilitiesValue: rental.utilities_included
      ? (lang === 'en' ? 'Included' : 'Inklusive')
      : (rental.utilities_amount != null && rental.utilities_amount !== '' ? euroPublic(rental.utilities_amount) : ''),
    roomsValue: rooms == null || Number.isNaN(rooms) ? '' : String(rooms),
    floorValue: floor == null || Number.isNaN(floor)
      ? ''
      : (floor === 0 ? (lang === 'en' ? 'Ground floor' : 'Erdgeschoss') : String(floor)),
    note,
    href: lang === 'en' ? apartmentPaths(rental).en : apartmentPaths(rental).de
  };
}

exports.catalogue = async (req, res, next) => {
  try {
    const lang = req.path.startsWith('/en/') ? 'en' : 'de';
    const path = CATALOGUE_PATHS[lang];
    const neighborhood = BERLIN_NEIGHBORHOODS.includes(text(req.query.neighborhood)) ? text(req.query.neighborhood) : '';
    const minRent = numberOrNull(req.query.min_rent);
    const maxRent = numberOrNull(req.query.max_rent);
    const availableRaw = text(req.query.available_from);
    const availableBy = /^\d{4}-\d{2}-\d{2}$/.test(availableRaw) ? availableRaw : '';
    const filters = {
      neighborhood,
      min_rent: minRent != null && !Number.isNaN(minRent) && minRent >= 0 ? String(minRent) : '',
      max_rent: maxRent != null && !Number.isNaN(maxRent) && maxRent >= 0 ? String(maxRent) : '',
      available_from: availableBy
    };
    let filterError = '';
    const minValue = filters.min_rent === '' ? null : Number(filters.min_rent);
    const maxValue = filters.max_rent === '' ? null : Number(filters.max_rent);
    if (minValue != null && maxValue != null && minValue > maxValue) {
      filterError = lang === 'en'
        ? 'Minimum rent cannot be higher than maximum rent.'
        : 'Die Mindestmiete kann nicht höher sein als die Höchstmiete.';
    }
    const rentals = filterError ? [] : (await FurnishedRental.publishedForCatalogue({
      neighborhood: filters.neighborhood || null,
      minRent: minValue,
      maxRent: maxValue,
      availableBy: filters.available_from || null
    })).map((rental) => catalogueCard(rental, lang));
    const base = res.locals.baseUrl;
    const hasFilters = Boolean(filters.neighborhood || filters.min_rent || filters.max_rent || filters.available_from);
    return res.render('rentals/catalogue', {
      title: lang === 'en' ? 'Furnished apartments in Berlin' : 'Möblierte Wohnungen in Berlin',
      pageMetaDescription: lang === 'en'
        ? 'Selected furnished apartments for rent in Berlin, with monthly rent, neighborhood, and move-in date.'
        : 'Ausgewählte möblierte Wohnungen zur Miete in Berlin, mit monatlichem Mietpreis, Lage und Einzugsdatum.',
      lang,
      path,
      neighborhoods: BERLIN_NEIGHBORHOODS,
      filters,
      filterError,
      hasFilters,
      rentals,
      useMainContainer: true,
      headPartial: '../partials/seo/rental-catalogue-head',
      canonicalUrl: `${base}${path}`,
      hreflangAlternates: {
        de: `${base}${CATALOGUE_PATHS.de}`,
        en: `${base}${CATALOGUE_PATHS.en}`
      }
    });
  } catch (error) {
    return next(error);
  }
};

function apartmentAlternates(paths) {
  const de = paths.de;
  const en = paths.en || paths.de;
  return { de, en };
}

async function resolvePublishedApartment(req) {
  const lang = req.path.startsWith('/en/') ? 'en' : 'de';
  const rental = await FurnishedRental.findPublishedBySlug(text(req.params.slug));
  if (!rental) return { missing: true, lang };
  const paths = apartmentPaths(rental);
  return { lang, rental, paths };
}

function renderApartment(req, res, resolved, extras) {
  const { lang, rental, paths } = resolved;
  const card = catalogueCard(rental, lang);
  const description = storedText(rental.description_i18n, lang) || rental.description || '';
  const photos = Array.isArray(rental.photos) ? rental.photos.filter(Boolean) : [];
  const base = res.locals.baseUrl;
  const alternates = apartmentAlternates(paths);
  const canonicalPath = paths[lang] || paths.de;
  return res.render('rentals/apartment', Object.assign({
    title: card.title,
    pageMetaDescription: card.excerpt || (lang === 'en'
      ? 'Furnished apartment for rent in Berlin.'
      : 'Möblierte Wohnung zur Miete in Berlin.'),
    lang,
    rental: card,
    description,
    photos,
    cataloguePath: CATALOGUE_PATHS[lang],
    useMainContainer: true,
    localeAlternatePaths: alternates,
    canonicalUrl: `${base}${canonicalPath}`,
    hreflangAlternates: {
      de: `${base}${alternates.de}`,
      en: `${base}${alternates.en}`
    },
    form: { name: '', email: '', countryCode: '+49', phone: '', message: '', moveIn: '', stay: '', people: '' },
    formError: ''
  }, extras || {}));
}

exports.apartment = async (req, res, next) => {
  try {
    const resolved = await resolvePublishedApartment(req);
    if (resolved.missing) return res.status(410).render('errors/404');
    const expected = resolved.paths[resolved.lang];
    if (expected && req.path !== expected) return res.redirect(301, expected);
    return renderApartment(req, res, resolved);
  } catch (error) {
    return next(error);
  }
};

exports.apartmentRedirect = async (req, res, next) => {
  try {
    const targetLang = req.apartmentTargetLang === 'en' ? 'en' : 'de';
    const resolved = await resolvePublishedApartment(req);
    if (resolved.missing || !resolved.paths[targetLang]) return res.status(410).render('errors/404');
    return res.redirect(301, resolved.paths[targetLang]);
  } catch (error) {
    return next(error);
  }
};

function inquiryDetails(body) {
  const moveInRaw = text(body.moveIn);
  const stayRaw = text(body.stay);
  const peopleRaw = text(body.people);
  const details = {
    name: text(body.name).slice(0, 100),
    email: text(body.email).slice(0, 200),
    countryCode: text(body.countryCode).slice(0, 8),
    phone: text(body.phone).slice(0, 30),
    message: text(body.message).slice(0, 2000),
    moveIn: /^\d{4}-\d{2}-\d{2}$/.test(moveInRaw) ? moveInRaw : '',
    stay: stayRaw,
    people: peopleRaw
  };
  const phoneCombined = `${details.countryCode} ${details.phone}`.trim();
  let error = '';
  if (details.name.length < 2) error = 'name';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) error = 'email';
  else if (phoneCombined.length < 6) error = 'phone';
  else if (details.message.length < 10) error = 'message';
  else if (moveInRaw && !details.moveIn) error = 'moveIn';
  else if (stayRaw && (!/^\d+$/.test(stayRaw) || Number(stayRaw) < 1 || Number(stayRaw) > 36)) error = 'stay';
  else if (peopleRaw && (!/^\d+$/.test(peopleRaw) || Number(peopleRaw) < 1 || Number(peopleRaw) > 12)) error = 'people';
  return { details, phoneCombined, error };
}

function inquiryCopy(lang, rental, details) {
  const lines = [
    lang === 'en' ? `Apartment: ${rental.title}` : `Wohnung: ${rental.title}`
  ];
  if (rental.neighborhood) lines.push(lang === 'en' ? `Neighborhood: ${rental.neighborhood}` : `Lage: ${rental.neighborhood}`);
  if (details.moveIn) lines.push(lang === 'en' ? `Move-in: ${details.moveIn}` : `Einzug: ${details.moveIn}`);
  if (details.stay) lines.push(lang === 'en' ? `Stay: ${details.stay} months` : `Aufenthalt: ${details.stay} Monate`);
  if (details.people) lines.push(lang === 'en' ? `People: ${details.people}` : `Personen: ${details.people}`);
  lines.push('');
  lines.push(details.message);
  return lines.join('\n');
}

exports.inquire = async (req, res, next) => {
  try {
    if (text(req.body.hp_field)) {
      return res.redirect('/thank-you');
    }
    const resolved = await resolvePublishedApartment(req);
    if (resolved.missing) return res.status(410).render('errors/404');
    const expected = resolved.paths[resolved.lang];
    if (expected && req.path !== expected) return res.redirect(301, expected);
    const { lang, rental } = resolved;
    const { details, phoneCombined, error } = inquiryDetails(req.body);
    if (error) {
      const message = lang === 'en'
        ? 'Please check the form. Name, email, phone, and a message of at least 10 characters are required.'
        : 'Bitte prüfen Sie das Formular. Name, E-Mail, Telefon und eine Nachricht mit mindestens 10 Zeichen sind nötig.';
      return renderApartment(req, res, resolved, { form: details, formError: message });
    }
    const card = catalogueCard(rental, lang);
    const apartmentPath = card.href || req.path;
    await leadController.acceptRentalInquiry(req, {
      rental,
      name: details.name,
      email: details.email,
      phone: phoneCombined,
      message: inquiryCopy(lang, card, details),
      language: lang,
      visitorMessage: details.message,
      apartmentTitle: card.title,
      apartmentSlug: String(apartmentPath).split('/').filter(Boolean).pop() || rental.slug || '',
      apartmentPath,
      neighborhood: card.neighborhood || '',
      moveIn: details.moveIn,
      stay: details.stay,
      people: details.people
    });
    return res.redirect('/thank-you');
  } catch (error) {
    return next(error);
  }
};
