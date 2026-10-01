const { getBlogSlugForLang, parseSlugI18n } = require('../config/n10-berlin-post-slugs');
const { isEnOnlyBlogSlug, enOnlyBlogPath } = require('../config/en-only-blog-slugs');

function blogLanguagePaths(post) {
  if (!post) return { de: '/blog', en: '/en/blog' };
  const enSlug = String(post.slugEn || post.slug || '').trim();
  const deSlug = String(post.slugDe || post.slug || '').trim();
  const enPath = `/en/blog/${enSlug}`;
  if (post.enOnly) return { de: enPath, en: enPath };
  return {
    de: `/blog/${deSlug}`,
    en: enPath
  };
}

function withPublicBlogSlug(post, lang) {
  if (!post) return post;
  const slugMap = parseSlugI18n(post.slug_i18n, post.slug);
  const publicSlug = getBlogSlugForLang(post, lang);
  const enOnly = isEnOnlyBlogSlug(post.slug) || isEnOnlyBlogSlug(publicSlug) || isEnOnlyBlogSlug(slugMap.en);
  return {
    ...post,
    slug: publicSlug,
    slugDe: slugMap.de || post.slug,
    slugEn: slugMap.en || getBlogSlugForLang(post, 'en'),
    enOnly,
    publicPath: enOnly ? enOnlyBlogPath(publicSlug) : ''
  };
}

module.exports = {
  withPublicBlogSlug,
  blogLanguagePaths,
  getBlogSlugForLang,
  parseSlugI18n
};
