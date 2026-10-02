/**
 * T2 audit — em dashes, link targets, redirecting hrefs, standalone link lines.
 * Read-only.
 *
 *   node scripts/t2-audit-blog-copy.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { DE_TO_EN_SLUG } = require('../config/n10-berlin-post-slugs');

function loadRedirects() {
  const redirects = new Map();
  const files = [
    path.join(__dirname, '../config/seo-404-gsc-2026-07-21.json'),
    path.join(__dirname, '../config/blog-slug-redirects-2026-08-10.json')
  ];
  files.forEach((file) => {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    Object.entries(raw.redirects || {}).forEach(([from, to]) => {
      redirects.set(from.replace(/\/$/, '') || '/', to);
    });
  });
  Object.entries(DE_TO_EN_SLUG).forEach(([de, en]) => {
    redirects.set(`/en/blog/${de}`, `/en/blog/${en}`);
    redirects.set(`/blog/${en}`, `/blog/${de}`);
  });
  return redirects;
}

function stripTags(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function contexts(html, needle) {
  const text = String(html || '');
  const out = [];
  let from = 0;
  while (out.length < 8) {
    const at = text.indexOf(needle, from);
    if (at < 0) break;
    out.push(text.slice(Math.max(0, at - 70), at + needle.length + 70).replace(/\s+/g, ' '));
    from = at + needle.length;
  }
  return out;
}

function anchors(html) {
  return [...String(html || '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => {
    const attrs = match[1];
    const href = (attrs.match(/href=["']([^"']+)["']/i) || [])[1] || '';
    const target = (attrs.match(/target=["']([^"']+)["']/i) || [])[1] || '';
    return { href, target, text: stripTags(match[2]).slice(0, 80), raw: match[0].slice(0, 220) };
  });
}

function isInternal(href) {
  if (!href) return false;
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  return /sweethome-immobilien\.de|sweet-home\.co\.il/i.test(href);
}

function pathOf(href) {
  try {
    if (href.startsWith('/')) return href.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
    const url = new URL(href);
    return url.pathname.replace(/\/$/, '') || '/';
  } catch (_) {
    return '';
  }
}

function standaloneLinks(html) {
  const blocks = [...String(html || '').matchAll(/<(p|li|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  return blocks
    .map((match) => ({ tag: match[1], inner: match[2] }))
    .filter((block) => {
      const text = stripTags(block.inner);
      const links = anchors(block.inner);
      if (!links.length || !text) return false;
      const linked = links.map((link) => link.text).join(' ').replace(/\s+/g, ' ').trim();
      const rest = text.replace(linked, '').replace(/[:.|–—-]/g, '').trim();
      return rest.length < 12 && text.length < 90;
    })
    .map((block) => `${block.tag}: ${stripTags(block.inner)}`);
}

async function main() {
  const redirects = loadRedirects();
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')
      ? false
      : { rejectUnauthorized: false }
  });
  await client.connect();
  const { rows } = await client.query(`
    SELECT id, slug,
           slug_i18n->>'en' AS en_slug,
           title,
           title_i18n,
           excerpt_i18n,
           content_i18n
    FROM blog_posts
    WHERE status = 'published'
    ORDER BY id
  `);

  const report = [];
  for (const row of rows) {
    const i18n = row.content_i18n || {};
    const titles = row.title_i18n || {};
    const excerpts = row.excerpt_i18n || {};
    const fields = {
      title: row.title,
      'title.de': titles.de,
      'title.en': titles.en,
      'excerpt.de': excerpts.de,
      'excerpt.en': excerpts.en,
      'body.de': i18n.de,
      'body.en': i18n.en
    };
    const item = { id: row.id, slug: row.slug, en: row.en_slug, dashes: [], targets: [], redirects: [], standalone: [] };
    Object.entries(fields).forEach(([name, value]) => {
      const html = String(value || '');
      const em = (html.match(/\u2014/g) || []).length;
      const en = (html.match(/\u2013/g) || []).length;
      if (em || en) {
        item.dashes.push({
          field: name,
          em,
          en,
          samples: contexts(html, em ? '\u2014' : '\u2013').slice(0, 3)
        });
      }
      if (!name.startsWith('body')) return;
      anchors(html).forEach((link) => {
        const internal = isInternal(link.href);
        if (internal && link.target === '_blank') {
          item.targets.push({ field: name, issue: 'internal-blank', href: link.href, text: link.text });
        }
        if (!internal && link.href.startsWith('http') && link.target !== '_blank') {
          item.targets.push({ field: name, issue: 'external-same-tab', href: link.href, text: link.text });
        }
        const key = pathOf(link.href);
        if (key && redirects.has(key) && redirects.get(key) !== key) {
          item.redirects.push({ field: name, href: link.href, to: redirects.get(key), text: link.text });
        }
      });
      const lines = standaloneLinks(html);
      if (lines.length) item.standalone.push({ field: name, lines });
    });
    if (item.dashes.length || item.targets.length || item.redirects.length || item.standalone.length) {
      report.push(item);
    }
  }
  const file = path.join('/tmp', `t2-audit-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log('posts', rows.length, 'flagged', report.length, 'file', file);
  report.forEach((item) => {
    console.log(`\n#${item.id} ${item.slug}`);
    item.dashes.forEach((dash) => console.log(`  dash ${dash.field} em=${dash.em} en=${dash.en}`));
    item.targets.forEach((link) => console.log(`  ${link.issue} [${link.field}] ${link.href}`));
    item.redirects.forEach((link) => console.log(`  redirect [${link.field}] ${link.href} -> ${link.to}`));
    item.standalone.forEach((block) => block.lines.forEach((line) => console.log(`  standalone [${block.field}] ${line}`)));
  });
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
