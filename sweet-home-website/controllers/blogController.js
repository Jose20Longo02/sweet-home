// controllers/blogController.js
const BlogPost = require('../models/BlogPost');
const { query } = require('../config/db');
const { ensureLocalizedFields } = require('../config/translator');

// Public
exports.listPublic = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = 9; // 3 per row looks cleaner
    const offset = (page - 1) * pageSize;
    const posts = await BlogPost.findPublic({ limit: pageSize, offset });
    const lang = res.locals.lang || 'en';
    const localizedPosts = (posts || []).map(p => ({
      ...p,
      title: (p.title_i18n && p.title_i18n[lang]) || p.title,
      excerpt: (p.excerpt_i18n && p.excerpt_i18n[lang]) || p.excerpt
    }));
    const { rows: countRows } = await query(`SELECT COUNT(*)::int AS count FROM blog_posts WHERE status = 'published'`);
    const total = (countRows && countRows[0] && countRows[0].count) || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.render('blog/blog-list', {
      title: 'Blog',
      posts: localizedPosts,
      page,
      hasNext: page < totalPages,
      totalPages,
      stickyFooter: true
    });
  } catch (err) { next(err); }
};

exports.showPublic = async (req, res, next) => {
  try {
    const post = await BlogPost.findBySlug(req.params.slug);
    if (!post || post.status !== 'published') return res.status(404).render('errors/404');
    const lang = res.locals.lang || 'en';
    const localizedPost = {
      ...post,
      title: (post.title_i18n && post.title_i18n[lang]) || post.title,
      excerpt: (post.excerpt_i18n && post.excerpt_i18n[lang]) || post.excerpt,
      content: (post.content_i18n && post.content_i18n[lang]) || post.content
    };
    // Recent/recommended posts (up to 4, excluding current)
    const { rows: recommendedPosts } = await query(
      `SELECT bp.title, bp.slug, bp.cover_image, COALESCE(bp.published_at, bp.created_at) AS published_at, u.name AS author_name
         FROM blog_posts bp
         LEFT JOIN users u ON u.id = bp.author_id
        WHERE bp.status = 'published' AND bp.slug <> $1
        ORDER BY COALESCE(bp.published_at, bp.created_at) DESC
        LIMIT 4`,
      [req.params.slug]
    );
    res.render('blog/blog-detail', {
      title: localizedPost.title,
      post: localizedPost,
      recommendedPosts: recommendedPosts || [],
      stickyFooter: true
    });
  } catch (err) { next(err); }
};

// Admin (author)
exports.listMine = async (req, res, next) => {
  try {
    const posts = await BlogPost.findAllForAdmin({ authorId: req.session.user.id });
    res.render('admin/blog/list', { posts });
  } catch (err) { next(err); }
};

exports.newForm = (req, res) => {
  res.render('admin/blog/new', { error: null, currentUser: req.session.user });
};

exports.create = async (req, res, next) => {
  try {
    const { title, excerpt, content, status } = req.body;
    const cover_image = req.file ? ('/uploads/blog/' + req.file.filename) : null;
    const published_at = status === 'published' ? new Date() : null;
    const safeContent = (typeof content === 'string') ? content : '';
    const post = await BlogPost.create({
      title, excerpt, content: safeContent, cover_image, status, author_id: req.session.user.id, published_at
    });
    try {
      const i18n = await ensureLocalizedFields({
        fields: { title: title || '', excerpt: excerpt || '', content: safeContent || '' },
        existing: {},
        sourceLang: 'en',
        targetLangs: ['es','de'],
        htmlFields: ['content']
      });
      await query(
        `UPDATE blog_posts SET title_i18n = $1, excerpt_i18n = $2, content_i18n = $3 WHERE id = $4`,
        [i18n.title_i18n || { en: title || '' }, i18n.excerpt_i18n || { en: excerpt || '' }, i18n.content_i18n || { en: safeContent || '' }, post.id]
      );
    } catch (_) { /* non-fatal */ }
    res.redirect(`/admin/dashboard/blog/${post.id}/edit`);
  } catch (err) { next(err); }
};

exports.editForm = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await query('SELECT * FROM blog_posts WHERE id = $1', [id]);
    const post = rows.rows[0];
    if (!post) return res.status(404).render('errors/404');
    if (req.session.user.role !== 'SuperAdmin' && post.author_id !== req.session.user.id) {
      return res.status(403).send('Forbidden');
    }
    res.render('admin/blog/edit', { post, error: null, currentUser: req.session.user });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await query('SELECT * FROM blog_posts WHERE id = $1', [id]);
    const existing = rows.rows[0];
    if (!existing) return res.status(404).render('errors/404');
    if (req.session.user.role !== 'SuperAdmin' && existing.author_id !== req.session.user.id) {
      return res.status(403).send('Forbidden');
    }

    const cover_image = req.file ? ('/uploads/blog/' + req.file.filename) : existing.cover_image;
    const { title, excerpt, content, status } = req.body;
    const published_at = status === 'published' && !existing.published_at ? new Date() : existing.published_at;

    const safeContent = (typeof content === 'string') ? content : existing.content || '';

    const updated = await BlogPost.update(id, { title, excerpt, content: safeContent, cover_image, status, published_at });
    try {
      const currentTitle = updated.title || title || existing.title || '';
      const currentExcerpt = (excerpt !== undefined ? excerpt : updated.excerpt || existing.excerpt || '') || '';
      const currentContent = updated.content || safeContent || existing.content || '';
      const i18n = await ensureLocalizedFields({
        fields: { title: currentTitle, excerpt: currentExcerpt, content: currentContent },
        existing: { title_i18n: updated.title_i18n, excerpt_i18n: updated.excerpt_i18n, content_i18n: updated.content_i18n },
        sourceLang: 'en',
        targetLangs: ['es','de'],
        htmlFields: ['content']
      });
      await query(
        `UPDATE blog_posts SET title_i18n = $1, excerpt_i18n = $2, content_i18n = $3, updated_at = NOW() WHERE id = $4`,
        [i18n.title_i18n, i18n.excerpt_i18n, i18n.content_i18n, id]
      );
    } catch (_) { /* non-fatal */ }
    res.redirect(`/admin/dashboard/blog/${updated.id}/edit`);
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await query('SELECT author_id, cover_image FROM blog_posts WHERE id = $1', [id]);
    const post = rows.rows[0];
    if (!post) return res.status(404).render('errors/404');
    if (req.session.user.role !== 'SuperAdmin' && post.author_id !== req.session.user.id) {
      return res.status(403).send('Forbidden');
    }
    await BlogPost.delete(id);
    res.redirect('/admin/dashboard/blog');
  } catch (err) { next(err); }
};

// SuperAdmin
exports.listAll = async (req, res, next) => {
  try {
    const posts = await BlogPost.findAllForAdmin();
    res.render('superadmin/blog/manage-blog', { posts, pendingCount: 0, currentUser: req.session.user, activePage: 'blog' });
  } catch (err) { next(err); }
};

// Inline image upload for rich text editor
exports.uploadInlineImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = '/uploads/blog/inline/' + req.file.filename;
  return res.json({ url });
};


