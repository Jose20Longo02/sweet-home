const { getBlogSlugForLang, parseSlugI18n } = require('../config/n10-berlin-post-slugs');
const { isEnOnlyBlogSlug, enOnlyBlogPath } = require('../config/en-only-blog-slugs');

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
  getBlogSlugForLang,
  parseSlugI18n
};
