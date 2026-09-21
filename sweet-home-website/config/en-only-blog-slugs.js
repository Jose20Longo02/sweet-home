/**
 * English articles that must not have a German-path copy.
 * /blog/{slug} and /de/blog/{slug} 301 to /en/blog/{slug}.
 * S4 — five Paphos posts (same English slug on both paths).
 */
const EN_ONLY_BLOG_SLUGS = [
  'what-300k-buys-you-in-paphos-right-now',
  'kato-paphos-the-mediterraneans-quiet-overperformer',
  'why-paphos-is-attracting-international-property-buyers',
  'best-areas-to-buy-property-in-paphos',
  'buying-property-in-paphos-as-a-foreigner'
];

const EN_ONLY_BLOG_SLUG_SET = new Set(EN_ONLY_BLOG_SLUGS);

function isEnOnlyBlogSlug(slug) {
  return EN_ONLY_BLOG_SLUG_SET.has(String(slug || '').trim());
}

function enOnlyBlogPath(slug) {
  return `/en/blog/${String(slug || '').trim()}`;
}

module.exports = {
  EN_ONLY_BLOG_SLUGS,
  isEnOnlyBlogSlug,
  enOnlyBlogPath
};
