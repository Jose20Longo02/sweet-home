-- N10: bilingual blog slugs (DE canonical in `slug`, EN in slug_i18n.en)
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS slug_i18n JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug_i18n_en
  ON blog_posts ((slug_i18n->>'en'))
  WHERE slug_i18n->>'en' IS NOT NULL AND slug_i18n->>'en' <> '';
