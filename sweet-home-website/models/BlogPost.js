// models/BlogPost.js
const { query } = require('../config/db');

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

class BlogPost {
  static async create({ title, excerpt, content, cover_image, status = 'draft', author_id, published_at }) {
    const baseSlug = slugify(title);
    let slug = baseSlug;
    // Ensure unique slug
    let suffix = 1;
    // Try a few attempts; fallback to timestamp if needed
    // Note: relying on DB unique constraint to be safe
    while (true) {
      const { rows } = await query('SELECT 1 FROM blog_posts WHERE slug = $1 LIMIT 1', [slug]);
      if (rows.length === 0) break;
      slug = `${baseSlug}-${++suffix}`;
      if (!baseSlug) { slug = `post-${Date.now()}`; break; }
    }

    const text = `
      INSERT INTO blog_posts (title, slug, excerpt, content, cover_image, status, author_id, published_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `;
    const values = [title, slug, excerpt || null, content, cover_image || null, status, author_id || null, published_at || null];
    const res = await query(text, values);
    return res.rows[0];
  }

  static async findPublic({ limit = 10, offset = 0 } = {}) {
    const res = await query(
      `SELECT bp.*, u.name AS author_name
         FROM blog_posts bp
         LEFT JOIN users u ON u.id = bp.author_id
        WHERE bp.status = 'published'
        ORDER BY COALESCE(bp.published_at, bp.created_at) DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.rows;
  }

  static async findBySlug(slug) {
    const res = await query(
      `SELECT bp.*, u.name AS author_name
         FROM blog_posts bp
         LEFT JOIN users u ON u.id = bp.author_id
        WHERE bp.slug = $1
        LIMIT 1`,
      [slug]
    );
    return res.rows[0];
  }

  static async findAllForAdmin({ authorId = null } = {}) {
    if (authorId) {
      const res = await query(
        `SELECT bp.*, u.name AS author_name
           FROM blog_posts bp
           LEFT JOIN users u ON u.id = bp.author_id
          WHERE bp.author_id = $1
          ORDER BY bp.created_at DESC`,
        [authorId]
      );
      return res.rows;
    }
    const res = await query(`
      SELECT bp.*, u.name AS author_name
        FROM blog_posts bp
        LEFT JOIN users u ON u.id = bp.author_id
       ORDER BY bp.created_at DESC
    `);
    return res.rows;
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;
    const push = (expr, val) => { fields.push(expr.replace('$idx', `$${idx++}`)); values.push(val); };

    if (data.title) push('title = $idx', data.title);
    if (data.excerpt !== undefined) push('excerpt = $idx', data.excerpt);
    if (data.content) push('content = $idx', data.content);
    if (data.cover_image !== undefined) push('cover_image = $idx', data.cover_image);
    if (data.status) push('status = $idx', data.status);
    if (data.published_at !== undefined) push('published_at = $idx', data.published_at);

    if (data.title && data.slug === 'regenerate') {
      // Optional: regenerate slug from title
      const baseSlug = slugify(data.title);
      let slug = baseSlug;
      let suffix = 1;
      while (true) {
        const { rows } = await query('SELECT 1 FROM blog_posts WHERE slug = $1 AND id <> $2 LIMIT 1', [slug, id]);
        if (rows.length === 0) break;
        slug = `${baseSlug}-${++suffix}`;
        if (!baseSlug) { slug = `post-${Date.now()}`; break; }
      }
      push('slug = $idx', slug);
    }

    if (!fields.length) {
      const res = await query('SELECT * FROM blog_posts WHERE id = $1', [id]);
      return res.rows[0];
    }

    values.push(id);
    const res = await query(
      `UPDATE blog_posts SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    );
    return res.rows[0];
  }

  static async delete(id) {
    await query('DELETE FROM blog_posts WHERE id = $1', [id]);
  }
}

module.exports = BlogPost;


