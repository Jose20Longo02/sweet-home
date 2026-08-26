const { getBlogSlugForLang, parseSlugI18n } = require('../config/n10-berlin-post-slugs');

function withPublicBlogSlug(post, lang) {
  if (!post) return post;
  const slugMap = parseSlugI18n(post.slug_i18n, post.slug);
  const publicSlug = getBlogSlugForLang(post, lang);
  return {
    ...post,
    slug: publicSlug,
    slugDe: slugMap.de || post.slug,
    slugEn: slugMap.en || getBlogSlugForLang(post, 'en')
  };
}

module.exports = {
  withPublicBlogSlug,
  getBlogSlugForLang,
  parseSlugI18n
};
