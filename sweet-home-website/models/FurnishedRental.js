const { query } = require('../config/db');

class FurnishedRental {
  static async list() {
    const res = await query(
      `SELECT r.id, r.title, r.slug, r.neighborhood, r.city, r.monthly_rent, r.deposit,
              r.status, r.photos, r.updated_at, r.created_at, r.rooms, r.size_sqm, r.floor,
              r.available_from, r.min_stay_months, r.max_stay_months,
              r.utilities_included, r.utilities_amount, r.content_language,
              u.name AS agent_name
         FROM furnished_rentals r
         LEFT JOIN users u ON u.id = r.agent_id
        ORDER BY r.updated_at DESC, r.id DESC`
    );
    return res.rows;
  }

  static async publishedForCatalogue({ neighborhood, minRent, maxRent, availableBy }) {
    const res = await query(
      `SELECT id, title, title_i18n, slug, slug_i18n, description, description_i18n,
              neighborhood, city, monthly_rent, deposit, photos,
              size_sqm, rooms, floor, available_from, min_stay_months, max_stay_months,
              utilities_included, utilities_amount, utilities_note, utilities_note_i18n
         FROM furnished_rentals
        WHERE status = 'published'
          AND ($1::text IS NULL OR neighborhood = $1)
          AND ($2::numeric IS NULL OR monthly_rent >= $2)
          AND ($3::numeric IS NULL OR monthly_rent <= $3)
          AND ($4::date IS NULL OR available_from IS NULL OR available_from <= $4::date)
        ORDER BY monthly_rent ASC, id DESC`,
      [neighborhood, minRent, maxRent, availableBy]
    );
    return res.rows;
  }

  static async findPublishedBySlug(slug) {
    const res = await query(
      `SELECT id, title, title_i18n, slug, slug_i18n, description, description_i18n,
              neighborhood, city, monthly_rent, deposit, photos,
              size_sqm, rooms, floor, available_from, min_stay_months, max_stay_months,
              utilities_included, utilities_amount, utilities_note, utilities_note_i18n,
              agent_id
         FROM furnished_rentals
        WHERE status = 'published'
          AND (slug = $1 OR slug_i18n->>'en' = $1)
        LIMIT 1`,
      [slug]
    );
    return res.rows[0] || null;
  }

  static async publishedForSitemap() {
    const res = await query(
      `SELECT slug, slug_i18n, updated_at
         FROM furnished_rentals
        WHERE status = 'published' AND slug IS NOT NULL`
    );
    return res.rows;
  }

  static async findById(id) {
    const res = await query('SELECT * FROM furnished_rentals WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async slugTaken(slug, exceptId) {
    const res = await query(
      `SELECT id FROM furnished_rentals
        WHERE slug = $1 AND ($2::int IS NULL OR id <> $2::int)
        LIMIT 1`,
      [slug, exceptId || null]
    );
    return res.rows.length > 0;
  }

  static async englishSlugTaken(slug, exceptId) {
    const res = await query(
      `SELECT id FROM furnished_rentals
        WHERE slug_i18n->>'en' = $1 AND ($2::int IS NULL OR id <> $2::int)
        LIMIT 1`,
      [slug, exceptId || null]
    );
    return res.rows.length > 0;
  }

  static async create(data) {
    const res = await query(
      `INSERT INTO furnished_rentals (
         title, title_i18n, slug, slug_i18n, description, description_i18n,
         photos, city, neighborhood, full_address, size_sqm, rooms, floor,
         monthly_rent, deposit, utilities_included, utilities_amount, utilities_note, utilities_note_i18n,
         available_from, min_stay_months, max_stay_months, furnished, status, agent_id, content_language
       ) VALUES (
         $1,$2::jsonb,$3,$4::jsonb,$5,$6::jsonb,
         $7,$8,$9,$10,$11,$12,$13,
         $14,$15,$16,$17,$18,$19::jsonb,
         $20,$21,$22,true,$23,$24,$25
       ) RETURNING *`,
      [
        data.title, JSON.stringify(data.title_i18n), data.slug, JSON.stringify(data.slug_i18n),
        data.description, JSON.stringify(data.description_i18n),
        data.photos, data.city, data.neighborhood, data.full_address, data.size_sqm, data.rooms, data.floor,
        data.monthly_rent, data.deposit, data.utilities_included, data.utilities_amount, data.utilities_note,
        JSON.stringify(data.utilities_note_i18n || {}),
        data.available_from, data.min_stay_months, data.max_stay_months, data.status, data.agent_id,
        data.content_language
      ]
    );
    return res.rows[0];
  }

  static async update(id, data) {
    const res = await query(
      `UPDATE furnished_rentals SET
         title = $1,
         title_i18n = $2::jsonb,
         slug = $3,
         slug_i18n = $4::jsonb,
         description = $5,
         description_i18n = $6::jsonb,
         photos = $7,
         city = $8,
         neighborhood = $9,
         full_address = $10,
         size_sqm = $11,
         rooms = $12,
         floor = $13,
         monthly_rent = $14,
         deposit = $15,
         utilities_included = $16,
         utilities_amount = $17,
         utilities_note = $18,
         utilities_note_i18n = $19::jsonb,
         available_from = $20,
         min_stay_months = $21,
         max_stay_months = $22,
         furnished = true,
         status = $23,
         agent_id = $24,
         content_language = $25,
         updated_at = NOW()
       WHERE id = $26
       RETURNING *`,
      [
        data.title, JSON.stringify(data.title_i18n), data.slug, JSON.stringify(data.slug_i18n),
        data.description, JSON.stringify(data.description_i18n),
        data.photos, data.city, data.neighborhood, data.full_address, data.size_sqm, data.rooms, data.floor,
        data.monthly_rent, data.deposit, data.utilities_included, data.utilities_amount, data.utilities_note,
        JSON.stringify(data.utilities_note_i18n || {}),
        data.available_from, data.min_stay_months, data.max_stay_months, data.status, data.agent_id,
        data.content_language, id
      ]
    );
    return res.rows[0] || null;
  }

  static async remove(id) {
    const res = await query(
      'DELETE FROM furnished_rentals WHERE id = $1 RETURNING id, photos',
      [id]
    );
    return res.rows[0] || null;
  }

  static async photoReferenced(url) {
    const res = await query(
      'SELECT id FROM furnished_rentals WHERE $1 = ANY(photos) LIMIT 1',
      [url]
    );
    return res.rows.length > 0;
  }

  static async setStatus(id, status) {
    const res = await query(
      `UPDATE furnished_rentals
          SET status = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING id, status`,
      [id, status]
    );
    return res.rows[0] || null;
  }
}

module.exports = FurnishedRental;
