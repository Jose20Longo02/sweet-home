-- Add JSONB i18n columns to blog_posts for hybrid translation storage
-- Idempotent: safe to run multiple times

ALTER TABLE IF EXISTS blog_posts
  ADD COLUMN IF NOT EXISTS title_i18n JSONB,
  ADD COLUMN IF NOT EXISTS excerpt_i18n JSONB,
  ADD COLUMN IF NOT EXISTS content_i18n JSONB;

-- Optional: ensure JSON validity by setting invalid text to NULL (no-op if already JSONB)
-- UPDATE blog_posts SET title_i18n = NULL WHERE jsonb_typeof(title_i18n) IS NULL;
-- UPDATE blog_posts SET excerpt_i18n = NULL WHERE jsonb_typeof(excerpt_i18n) IS NULL;
-- UPDATE blog_posts SET content_i18n = NULL WHERE jsonb_typeof(content_i18n) IS NULL;

-- Optional indexes (commented out). Enable if you need search by locale values.
-- CREATE INDEX IF NOT EXISTS idx_blog_posts_title_i18n ON blog_posts USING GIN (title_i18n);
-- CREATE INDEX IF NOT EXISTS idx_blog_posts_excerpt_i18n ON blog_posts USING GIN (excerpt_i18n);
-- CREATE INDEX IF NOT EXISTS idx_blog_posts_content_i18n ON blog_posts USING GIN (content_i18n);

