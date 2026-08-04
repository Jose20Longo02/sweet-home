# Blog drafts for Adi review

Improved German blog copy lives here **before** it is published.

## Why not edit in admin?

Admin Save overwrites `*_i18n` via DeepL and would publish/replace live German. There is no per-locale draft in the CMS.

## Workflow

1. Export current live DE if needed (`_*current*.html` helpers).
2. Write improved draft as `*-DRAFT-FOR-ADI.md`.
3. Share with Adi for review.
4. After approval: targeted DB update of `title_i18n.de` / `excerpt_i18n.de` / `content_i18n.de` only.
5. Never use Admin → Save on that post for DE-only updates.
