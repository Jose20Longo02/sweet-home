// controllers/blogController.js
const BlogPost = require('../models/BlogPost');
const { query } = require('../config/db');
const { ensureLocalizedFields } = require('../config/translator');

// Helper function to add ALT attributes to images in HTML content
function addAltToImages(htmlContent, fallbackAlt = 'Blog post image') {
  if (!htmlContent || typeof htmlContent !== 'string') return htmlContent;
  
  // Regex to match img tags without alt attribute or with empty alt
  return htmlContent.replace(/<img([^>]*?)(?:\s+alt=["']\s*["']|\s+alt=["']\s*["']|)([^>]*?)>/gi, (match, before, after) => {
    // Check if alt attribute already exists with a value
    if (/alt=["'][^"']+["']/i.test(match)) {
      return match; // Already has a non-empty alt attribute
    }
    
    // Extract src to generate descriptive alt text
    const srcMatch = match.match(/src=["']([^"']+)["']/i);
    let altText = fallbackAlt;
    
    if (srcMatch && srcMatch[1]) {
      const src = srcMatch[1];
      // Extract filename from URL
      const filename = src.split('/').pop().split('?')[0];
      // Remove extension and generate readable alt text
      const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
      // Convert underscores and hyphens to spaces, capitalize words
      altText = nameWithoutExt
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim() || fallbackAlt;
    }
    
    // Insert alt attribute before the closing >
    if (/alt=["']\s*["']/i.test(match)) {
      // Replace empty alt attribute
      return match.replace(/alt=["']\s*["']/i, `alt="${altText.replace(/"/g, '&quot;')}"`);
    } else {
      // Add alt attribute before closing >
      return match.replace(/>$/, ` alt="${altText.replace(/"/g, '&quot;')}">`);
    }
  });
}

// Helper function to convert H1 tags in content to H2 (to avoid multiple H1s per page)
function convertH1ToH2(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') return htmlContent;
  
  // Convert both opening and closing H1 tags to H2
  // Handle both lowercase and uppercase, and various attribute patterns
  return htmlContent
    .replace(/<h1([^>]*?)>/gi, '<h2$1>')  // Opening tags with any attributes
    .replace(/<\/h1>/gi, '</h2>');        // Closing tags
}

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
    const pageTitle = page > 1 ? `Blog - Page ${page}` : 'Blog';
    res.render('blog/blog-list', {
      title: pageTitle,
      posts: localizedPosts,
      page,
      hasNext: page < totalPages,
      totalPages,
      stickyFooter: true,
      baseUrl: res.locals.baseUrl
    });
  } catch (err) { next(err); }
};

exports.showPublic = async (req, res, next) => {
  try {
    const post = await BlogPost.findBySlug(req.params.slug);
    if (!post || post.status !== 'published') return res.status(404).render('errors/404');
    const lang = res.locals.lang || 'en';
    const postTitle = (post.title_i18n && post.title_i18n[lang]) || post.title;
    const postContent = (post.content_i18n && post.content_i18n[lang]) || post.content;
    // Process content: add ALT attributes and convert H1 tags to H2 to avoid multiple H1s
    let processedContent = addAltToImages(postContent, `Image from ${postTitle}`);
    processedContent = convertH1ToH2(processedContent);
    
    const localizedPost = {
      ...post,
      title: postTitle,
      excerpt: (post.excerpt_i18n && post.excerpt_i18n[lang]) || post.excerpt,
      content: processedContent
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
      stickyFooter: true,
      baseUrl: res.locals.baseUrl
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
  res.render('admin/blog/new', { 
    error: null, 
    currentUser: req.session.user,
    formData: {}
  });
};

exports.create = async (req, res, next) => {
  try {
    const { title, excerpt, content, status } = req.body;
    
    // Validate required fields
    if (!title || !title.trim()) {
      return res.render('admin/blog/new', {
        error: 'Title is required. Please enter a title for your blog post.',
        currentUser: req.session.user,
        formData: {
          title: req.body.title || '',
          excerpt: req.body.excerpt || '',
          content: req.body.content || '',
          status: req.body.status || 'draft'
        }
      });
    }
    
    const cover_image = req.file ? (req.file.url || '/uploads/blog/' + req.file.filename) : null;
    const published_at = status === 'published' ? new Date() : null;
    const safeContent = (typeof content === 'string') ? content : '';
    const post = await BlogPost.create({
      title, excerpt, content: safeContent, cover_image, status, author_id: req.session.user.id, published_at
    });
    // If using Spaces and we uploaded under a provisional slug, reconcile to final slug
    try {
      if (process.env.DO_SPACES_BUCKET && req.file && req.file.key) {
        const s3 = require('../config/spaces');
        const bucket = process.env.DO_SPACES_BUCKET;
        const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
        const cdnBase = cdn ? (cdn.startsWith('http') ? cdn : `https://${cdn}`) : '';
        // resolve slug from DB (BlogPost.create likely set it)
        const { rows: slugRow } = await query('SELECT slug FROM blog_posts WHERE id = $1', [post.id]);
        const slug = slugRow[0]?.slug || String(post.id);
        const name = req.file.filename;
        const currentKey = req.file.key;
        const desiredKey = `blog/${slug}/cover/${name}`;
        if (currentKey !== desiredKey) {
          await new Promise((resolve, reject) => s3.copyObject({ Bucket: bucket, CopySource: `/${bucket}/${currentKey}`, Key: desiredKey, ACL: 'public-read' }, (e)=>e?reject(e):resolve()));
          await new Promise((resolve) => s3.deleteObject({ Bucket: bucket, Key: currentKey }, ()=>resolve()));
        }
        const finalUrl = `${cdnBase}/${desiredKey}`;
        await query('UPDATE blog_posts SET cover_image = $1 WHERE id = $2', [finalUrl, post.id]);
      }
    } catch (_) { /* non-fatal */ }

    // Move inline images from provisional slug folder to final slug and rewrite content URLs
    try {
      if (process.env.DO_SPACES_BUCKET) {
        const s3 = require('../config/spaces');
        const bucket = process.env.DO_SPACES_BUCKET;
        const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
        const cdnBase = cdn ? (cdn.startsWith('http') ? cdn : `https://${cdn}`) : '';
        // final slug
        const { rows: slugRow2 } = await query('SELECT slug, content FROM blog_posts WHERE id = $1', [post.id]);
        const finalSlug = slugRow2[0]?.slug || String(post.id);
        const currentContent = slugRow2[0]?.content || safeContent || '';
        // provisional slug from title at submit time
        const provisionalSlug = String((req.body && req.body.title) || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || finalSlug;
        if (provisionalSlug !== finalSlug) {
          const candidateFromPrefixes = [
            `blog/${provisionalSlug}/inline/`,
            `blog/post-${req.session?.user?.id || 'anon'}/inline/`,
            `blog/post/inline/`
          ];
          const toPrefix   = `blog/${finalSlug}/inline/`;
          // move objects under inline/
          for (const fromPrefix of candidateFromPrefixes) {
            let token;
            do {
              const page = await new Promise((resolve, reject) => s3.listObjectsV2({ Bucket: bucket, Prefix: fromPrefix, ContinuationToken: token }, (e,d)=>e?reject(e):resolve(d||{})));
              const items = page.Contents || [];
              for (const obj of items) {
                const fileName = obj.Key.substring(fromPrefix.length);
                const newKey = `${toPrefix}${fileName}`;
                await new Promise((resolve, reject) => s3.copyObject({ Bucket: bucket, CopySource: `/${bucket}/${obj.Key}`, Key: newKey, ACL: 'public-read' }, (e)=>e?reject(e):resolve()));
              }
              if (items.length) {
                await new Promise((resolve, reject) => s3.deleteObjects({ Bucket: bucket, Delete: { Objects: items.map(o=>({ Key:o.Key })) } }, (e)=>e?reject(e):resolve()));
              }
              token = page.IsTruncated ? page.NextContinuationToken : undefined;
            } while (token);
          }
          // rewrite content URLs
          const fromBase = `${cdnBase}/blog/${provisionalSlug}/`;
          const toBase   = `${cdnBase}/blog/${finalSlug}/`;
          const rewritten = currentContent.split(fromBase).join(toBase);
          if (rewritten !== currentContent) {
            await query('UPDATE blog_posts SET content = $1 WHERE id = $2', [rewritten, post.id]);
          }
        }
      }
    } catch (_) { /* non-fatal */ }
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
    // Redirect based on user role
    const role = req.session.user?.role;
    if (role === 'SuperAdmin') {
      return res.redirect('/superadmin/dashboard/blog');
    }
    return res.redirect('/admin/dashboard/blog');
  } catch (err) {
    // Handle all types of errors and display user-friendly messages
    let errorMessage = 'An error occurred while creating the blog post. Please try again.';
    
    if (err.message) {
      // Upload-related errors
      if (err.message.includes('File too large') || err.message.includes('LIMIT_FILE_SIZE')) {
        errorMessage = 'File too large. Maximum file size is 20 MB. Please compress or resize your image before uploading. You can use an online compressor like https://www.iloveimg.com/compress-image';
      } else if (err.message.includes('Invalid file type') || err.message.includes('Invalid file')) {
        errorMessage = 'Invalid file type. Only JPEG, PNG, WebP, HEIC, and HEIF images are supported for cover images.';
      } else if (err.message.includes('Unexpected field')) {
        errorMessage = err.message;
      } else if (err.message.includes('Failed to convert HEIC')) {
        errorMessage = 'Failed to process HEIC image. Please try converting it to JPEG first.';
      } else if (err.message.includes('upload') || err.message.includes('S3') || err.message.includes('Spaces')) {
        errorMessage = 'Failed to upload image. Please check your file and try again. If the problem persists, try a different image.';
      } else if (err.message.includes('duplicate key') || err.message.includes('unique constraint')) {
        errorMessage = 'A blog post with this title already exists. Please use a different title.';
      } else if (err.message.includes('database') || err.message.includes('connection')) {
        errorMessage = 'Database error. Please try again in a moment.';
      } else {
        // Use the error message if it's user-friendly, otherwise use generic message
        errorMessage = err.message.length < 200 ? err.message : errorMessage;
      }
    }
    
    // Render the form with error message and preserve form data
    return res.render('admin/blog/new', {
      error: errorMessage,
      currentUser: req.session.user,
      formData: {
        title: req.body.title || '',
        excerpt: req.body.excerpt || '',
        content: req.body.content || '',
        status: req.body.status || 'draft'
      }
    });
  }
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

    let cover_image = req.file ? (req.file.url || '/uploads/blog/' + req.file.filename) : existing.cover_image;
    const { title, excerpt, content, status } = req.body;
    const published_at = status === 'published' && !existing.published_at ? new Date() : existing.published_at;

    const safeContent = (typeof content === 'string') ? content : existing.content || '';

    const updated = await BlogPost.update(id, { title, excerpt, content: safeContent, cover_image, status, published_at });
    // If Spaces and cover uploaded under a different provisional slug, reconcile to final slug
    try {
      if (process.env.DO_SPACES_BUCKET && req.file && req.file.key) {
        const s3 = require('../config/spaces');
        const bucket = process.env.DO_SPACES_BUCKET;
        const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
        const cdnBase = cdn ? (cdn.startsWith('http') ? cdn : `https://${cdn}`) : '';
        const slugRow = await query('SELECT slug FROM blog_posts WHERE id = $1', [id]);
        const slug = slugRow.rows[0]?.slug || String(id);
        const name = req.file.filename;
        const currentKey = req.file.key;
        const desiredKey = `blog/${slug}/cover/${name}`;
        if (currentKey !== desiredKey) {
          await new Promise((resolve, reject) => s3.copyObject({ Bucket: bucket, CopySource: `/${bucket}/${currentKey}`, Key: desiredKey, ACL: 'public-read' }, (e)=>e?reject(e):resolve()));
          await new Promise((resolve) => s3.deleteObject({ Bucket: bucket, Key: currentKey }, ()=>resolve()));
          cover_image = `${cdnBase}/${desiredKey}`;
          await query('UPDATE blog_posts SET cover_image = $1 WHERE id = $2', [cover_image, id]);
        }
      }
    } catch (_) { /* non-fatal */ }

    // Move inline images from provisional slug to final slug and rewrite URLs on update as well
    try {
      if (process.env.DO_SPACES_BUCKET) {
        const s3 = require('../config/spaces');
        const bucket = process.env.DO_SPACES_BUCKET;
        const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
        const cdnBase = cdn ? (cdn.startsWith('http') ? cdn : `https://${cdn}`) : '';
        const slugRow = await query('SELECT slug, content FROM blog_posts WHERE id = $1', [id]);
        const finalSlug = slugRow.rows[0]?.slug || String(id);
        const currentContent = slugRow.rows[0]?.content || safeContent || '';
        const provisionalSlug = String((req.body && req.body.title) || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || finalSlug;
        if (provisionalSlug !== finalSlug) {
          const fromPrefix = `blog/${provisionalSlug}/inline/`;
          const toPrefix   = `blog/${finalSlug}/inline/`;
          let token;
          do {
            const page = await new Promise((resolve, reject) => s3.listObjectsV2({ Bucket: bucket, Prefix: fromPrefix, ContinuationToken: token }, (e,d)=>e?reject(e):resolve(d||{})));
            const items = page.Contents || [];
            for (const obj of items) {
              const fileName = obj.Key.substring(fromPrefix.length);
              const newKey = `${toPrefix}${fileName}`;
              await new Promise((resolve, reject) => s3.copyObject({ Bucket: bucket, CopySource: `/${bucket}/${obj.Key}`, Key: newKey, ACL: 'public-read' }, (e)=>e?reject(e):resolve()));
            }
            if (items.length) {
              await new Promise((resolve, reject) => s3.deleteObjects({ Bucket: bucket, Delete: { Objects: items.map(o=>({ Key:o.Key })) } }, (e)=>e?reject(e):resolve()));
            }
            token = page.IsTruncated ? page.NextContinuationToken : undefined;
          } while (token);
          const fromBase = `${cdnBase}/blog/${provisionalSlug}/`;
          const toBase   = `${cdnBase}/blog/${finalSlug}/`;
          const rewritten = currentContent.split(fromBase).join(toBase);
          if (rewritten !== currentContent) {
            await query('UPDATE blog_posts SET content = $1 WHERE id = $2', [rewritten, id]);
          }
        }
      }
    } catch (_) { /* non-fatal */ }
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
    // Redirect based on user role
    const role = req.session.user?.role;
    if (role === 'SuperAdmin') {
      return res.redirect('/superadmin/dashboard/blog');
    }
    return res.redirect('/admin/dashboard/blog');
  } catch (err) {
    // Handle errors during update with user-friendly messages
    let errorMessage = 'An error occurred while updating the blog post. Please try again.';
    
    if (err.message) {
      if (err.message.includes('File too large') || err.message.includes('LIMIT_FILE_SIZE')) {
        errorMessage = 'File too large. Maximum file size is 20 MB. Please compress or resize your image before uploading.';
      } else if (err.message.includes('Invalid file type') || err.message.includes('Invalid file')) {
        errorMessage = 'Invalid file type. Only JPEG, PNG, WebP, HEIC, and HEIF images are supported for cover images.';
      } else if (err.message.includes('upload') || err.message.includes('S3') || err.message.includes('Spaces')) {
        errorMessage = 'Failed to upload image. Please check your file and try again.';
      } else if (err.message.length < 200) {
        errorMessage = err.message;
      }
    }
    
    // Re-fetch the post to render edit form with error
    try {
      const id = parseInt(req.params.id, 10);
      const rows = await query('SELECT * FROM blog_posts WHERE id = $1', [id]);
      const post = rows.rows[0];
      if (post) {
        return res.render('admin/blog/edit', {
          post,
          error: errorMessage,
          currentUser: req.session.user
        });
      }
    } catch (_) {}
    
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await query('SELECT author_id, cover_image, slug, content, content_i18n FROM blog_posts WHERE id = $1', [id]);
    const post = rows.rows[0];
    if (!post) return res.status(404).render('errors/404');
    if (req.session.user.role !== 'SuperAdmin' && post.author_id !== req.session.user.id) {
      return res.status(403).send('Forbidden');
    }
    // Delete cover image and any inline images if using Spaces
    try {
      if (process.env.DO_SPACES_BUCKET) {
        const s3 = require('../config/spaces');
        const bucket = process.env.DO_SPACES_BUCKET;
        const prefixes = [];
        const keys = [];
        if (post.cover_image && /^https?:\/\//.test(post.cover_image)) {
          const key = String(post.cover_image).replace(/^https?:\/\/[^/]+\//, '');
          prefixes.push(key.split('/').slice(0, -1).join('/') + '/');
          keys.push(key);
        }
        if (post.slug) {
          prefixes.push(`blog/${post.slug}/`);
        }
        // Also attempt deleting common provisional prefixes used by inline uploads
        prefixes.push(`blog/post/`);
        prefixes.push(`blog/post-${req.session?.user?.id || 'anon'}/`);
        // Extract inline image keys referenced in content (including any provisional slug like "post")
        try {
          const cdn = process.env.DO_SPACES_CDN_ENDPOINT;
          const cdnBase = cdn ? (cdn.startsWith('http') ? cdn : `https://${cdn}`) : '';
          const htmls = [];
          if (post.content) htmls.push(String(post.content));
          try {
            const i18n = post.content_i18n && (typeof post.content_i18n === 'object' ? post.content_i18n : JSON.parse(post.content_i18n));
            if (i18n && typeof i18n === 'object') {
              Object.values(i18n).forEach(v => { if (v) htmls.push(String(v)); });
            }
          } catch (_) {}
          const regex = new RegExp(`${cdnBase.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}/(blog/[^"'\)\s>]+)`, 'g');
          for (const html of htmls) {
            let m; while ((m = regex.exec(html)) !== null) { keys.push(m[1]); }
          }
        } catch (_) {}

        // Delete individual keys collected from content and cover
        if (keys.length) {
          // unique keys
          const uniq = Array.from(new Set(keys)).map(k => ({ Key: k }));
          // delete in chunks of 1000
          for (let i = 0; i < uniq.length; i += 1000) {
            const chunk = uniq.slice(i, i + 1000);
            await new Promise((resolve, reject) => s3.deleteObjects({ Bucket: bucket, Delete: { Objects: chunk } }, (e)=>e?reject(e):resolve()));
          }
        }
        // Delete all objects under collected prefixes (paginated)
        for (const pfx of prefixes) {
          if (!pfx) continue;
          let token;
          do {
            const page = await new Promise((resolve, reject) => s3.listObjectsV2({ Bucket: bucket, Prefix: pfx, ContinuationToken: token }, (e,d)=>e?reject(e):resolve(d||{})));
            const objs = (page.Contents || []).map(o => ({ Key: o.Key }));
            if (objs.length) await new Promise((resolve,reject)=> s3.deleteObjects({ Bucket: bucket, Delete: { Objects: objs } }, (e)=>e?reject(e):resolve()));
            token = page.IsTruncated ? page.NextContinuationToken : undefined;
          } while (token);
        }
      }
    } catch (_) { /* best-effort */ }

    await BlogPost.delete(id);
    
    // Redirect based on user role
    const role = req.session.user?.role;
    if (role === 'SuperAdmin') {
      return res.redirect('/superadmin/dashboard/blog');
    }
    return res.redirect('/admin/dashboard/blog');
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
  const url = req.file.url || '/uploads/blog/inline/' + req.file.filename;
  return res.json({ url });
};


