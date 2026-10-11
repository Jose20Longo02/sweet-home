/**
 * Optional listing URL for a blog cover image.
 * Adi: unique covers; easy option is a property photo linking to that listing.
 */
const BLOG_COVER_LISTING_LINKS = {
  'grunderwerbsteuer-berlin': '/properties/grosszugige-4-zimmer-wohnung-in-berlin-spandau-ideal-zur-eigennutzung',
  'mietrendite-berechnen': '/properties/top-kapitalanlage-in-weissensee',
  'wohnungskauf-berlin-checkliste': '/properties/grosszugiges-2-zimmer-loft-mit-88-m-in-neukolln-mobliert-bezugsfrei'
};

function getBlogCoverListingHref(slug) {
  return BLOG_COVER_LISTING_LINKS[String(slug || '')] || '';
}

module.exports = {
  BLOG_COVER_LISTING_LINKS,
  getBlogCoverListingHref
};
