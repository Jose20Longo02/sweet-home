/**
 * T2 — blog copy and link rules.
 * Em dashes and spaced en dashes become commas.
 * Internal links stay in the same tab and use the final URL.
 * External links open in a new tab.
 * Standalone “browse properties” lines are folded into the sentence.
 *
 *   DRY_RUN=1 node scripts/t2-fix-blog-copy.js
 *   node scripts/t2-fix-blog-copy.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { rules } = require('../middleware/seo404Classification');
const { rewriteBlogLinksForLang, rewriteEnBlogInternalLinks } = require('../config/n10-berlin-post-slugs');

const DRY_RUN = process.env.DRY_RUN === '1';

const DISTRICT_LABELS = {
  berlin_charlottenburg: ['Charlottenburg-Wilmersdorf', 'Charlottenburg'],
  berlin_prenzlauer_berg: ['Prenzlauer Berg'],
  berlin_friedrichshain_kreuzberg: ['Friedrichshain-Kreuzberg'],
  berlin_kreuzberg: ['Kreuzberg'],
  berlin_wedding: ['Wedding'],
  berlin_neukoelln: ['Neukölln', 'Neukolln'],
  berlin_schoeneberg: ['Schöneberg', 'Schoeneberg'],
  berlin_moabit: ['Moabit'],
  berlin_tempelhof: ['Tempelhof'],
  berlin_reinickendorf: ['Reinickendorf'],
  berlin_pankow: ['Pankow'],
  berlin_spandau: ['Spandau'],
  berlin_mitte: ['Berlin Mitte', 'Mitte']
};

function fixDashes(text) {
  if (!text) return text;
  let out = String(text);
  out = out.replace(/&mdash;|&#8212;|&#x2014;/gi, '\u2014');
  out = out.replace(/\u2014/g, ', ');
  out = out.replace(/(?:&nbsp;|\s)\u2013(?:&nbsp;|\s)/g, ', ');
  out = out.replace(/[ \t]{2,}/g, ' ');
  out = out.replace(/\s+,/g, ',');
  out = out.replace(/,(\s*,)+/g, ',');
  out = out.replace(/,\s+\./g, '.');
  return out;
}

function removeDistrictDirectory(html) {
  return String(html || '').replace(
    /<h2>All district pages at a glance<\/h2>\s*<p>Navigation[\s\S]*?<\/p>\s*<ul>[\s\S]*?<\/ul>\s*<p>This list is just a starting point[\s\S]*?<\/p>/i,
    '<p>The district name is only a starting point. The final decision comes down to the specific street and building.</p>'
  );
}

function inlineSeeAlso(html) {
  return String(html || '').replace(
    /<p>\s*(Vertiefung|Further reading)\s*:?\s*<\/p>\s*<ul>([\s\S]*?)<\/ul>/gi,
    (full, label, inner) => {
      const items = [...inner.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map((match) => match[1].trim());
      if (!items.length || items.some((item) => !/^<a\b[\s\S]*<\/a>$/i.test(item))) return full;
      const conj = /vertiefung/i.test(label) ? ' und ' : ' and ';
      const joined = items.length === 1
        ? items[0]
        : `${items.slice(0, -1).join(', ')}${conj}${items[items.length - 1]}`;
      const name = /vertiefung/i.test(label) ? 'Vertiefung' : 'Further reading';
      return `<p>${name}: ${joined}.</p>`;
    }
  );
}

function replacePlainName(html, name, token) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped);
  const at = html.search(re);
  if (at < 0) return null;
  const before = html.slice(0, at);
  const openA = (before.match(/<a\b/gi) || []).length;
  const closeA = (before.match(/<\/a>/gi) || []).length;
  if (openA > closeA) return null;
  if (/\[\[landing:[^\]]*$/.test(before)) return null;
  return html.replace(re, token);
}

function foldBrowseLines(html) {
  const source = String(html || '');
  const blockRe = /<(p|h[23])\b[^>]*>[\s\S]*?<\/\1>/gi;
  const blocks = [];
  let last = 0;
  let match;
  while ((match = blockRe.exec(source))) {
    if (match.index > last) blocks.push(source.slice(last, match.index));
    blocks.push(match[0]);
    last = match.index + match[0].length;
  }
  if (last < source.length) blocks.push(source.slice(last));

  const isTag = (block) => /^<(p|h[23])\b/i.test(block);
  const textOf = (block) => block.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const isEmpty = (block) => isTag(block) && textOf(block).length === 0;
  const tokensOf = (block) => [...block.matchAll(/\[\[landing:([^|\]]+)\|([^|\]]+)\|(inline|button)\]\]/g)];
  const isBrowse = (block) => {
    if (!/^<p\b/i.test(block)) return false;
    const tokens = tokensOf(block);
    if (!tokens.length) return false;
    const leftover = block
      .replace(/\[\[landing:[^\]]+\]\]/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, '')
      .replace(/[\s\-–—|.]+/g, '');
    if (leftover) return false;
    return tokens.every((token) => /browse|view|see|explore|discover|listings|properties|homes|angebote|durchsuchen|entdecken/i.test(token[2]));
  };
  const neighbor = (index, step) => {
    for (let cursor = index + step; cursor >= 0 && cursor < blocks.length; cursor += step) {
      if (!isTag(blocks[cursor]) || isEmpty(blocks[cursor])) continue;
      return cursor;
    }
    return -1;
  };

  for (let index = 0; index < blocks.length; index += 1) {
    if (!isBrowse(blocks[index])) continue;
    const tokens = tokensOf(blocks[index]);
    const targets = [neighbor(index, 1), neighbor(index, -1)].filter((cursor) => cursor >= 0);
    let placed = 0;
    tokens.forEach((token) => {
      const key = token[1];
      const names = DISTRICT_LABELS[key] || [];
      const linked = `[[landing:${key}|${names[0] || token[2]}|inline]]`;
      for (const cursor of targets) {
        if (blocks[cursor].includes(`[[landing:${key}|`)) {
          placed += 1;
          return;
        }
        for (const name of names) {
          const next = replacePlainName(blocks[cursor], name, linked);
          if (next) {
            blocks[cursor] = next;
            if (key === 'berlin_schoeneberg' && /Moabit/.test(blocks[cursor]) && !blocks[cursor].includes('[[landing:berlin_moabit|')) {
              const withMoabit = replacePlainName(blocks[cursor], 'Moabit', '[[landing:berlin_moabit|Moabit|inline]]');
              if (withMoabit) blocks[cursor] = withMoabit;
            }
            placed += 1;
            return;
          }
        }
      }
      if ((key === 'berlin_main' || key === 'cyprus_main') && targets.length) {
        const cursor = targets.find((item) => /^<p\b/i.test(blocks[item]));
        if (cursor === undefined) return;
        const sentence = key === 'cyprus_main'
          ? ' Current homes are on the page for [[landing:cyprus_main|Paphos properties|inline]].'
          : ' Current homes are on the page to [[landing:berlin_main|buy an apartment in Berlin|inline]].';
        blocks[cursor] = blocks[cursor].replace(/<\/p>\s*$/i, `${sentence}</p>`);
        placed += 1;
      }
    });
    if (placed === tokens.length) blocks[index] = '';
  }
  return blocks.join('');
}

function pathOf(href) {
  const clean = String(href || '').split('#')[0];
  const pathOnly = clean.split('?')[0];
  return pathOnly.length > 1 ? pathOnly.replace(/\/$/, '') : pathOnly || '/';
}

function finalHref(href) {
  let value = String(href || '').trim();
  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      if (/sweethome-immobilien\.de|sweet-home\.co\.il/i.test(url.hostname)) {
        value = `${url.pathname}${url.search}${url.hash}`;
      }
    }
  } catch (_) {
    return value;
  }
  const key = pathOf(value);
  const query = value.includes('?') ? value.slice(value.indexOf('?')) : '';
  const hash = value.includes('#') ? value.slice(value.indexOf('#')) : '';
  const target = rules.redirects.get(key) || rules.redirects.get(key.toLowerCase());
  if (target && pathOf(target) !== key) return `${target}${query}${hash}`;
  return value;
}

function isInternal(href) {
  if (!href) return false;
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  return /sweethome-immobilien\.de|sweet-home\.co\.il/i.test(href);
}

function fixAnchors(html) {
  return String(html || '').replace(/<a\b([^>]*?)>/gi, (full, attrs) => {
    const hrefMatch = attrs.match(/\shref=(["'])([^"']+)\1/i) || attrs.match(/^href=(["'])([^"']+)\1/i);
    if (!hrefMatch) return full;
    const href = finalHref(hrefMatch[2]);
    let next = attrs
      .replace(hrefMatch[0], ` href="${href}"`)
      .replace(/\s*target=(["'])[^"']*\1/gi, '')
      .replace(/\s*rel=(["'])[^"']*\1/gi, '');
    if (!isInternal(href) && /^https?:/i.test(href)) {
      next += ' target="_blank" rel="noopener noreferrer"';
    }
    return `<a${next}>`;
  });
}

function fixBody(html, lang) {
  let out = String(html || '');
  if (!out) return out;
  if (lang === 'en') out = removeDistrictDirectory(out);
  out = foldBrowseLines(out);
  out = inlineSeeAlso(out);
  out = fixDashes(out);
  out = lang === 'en' ? rewriteEnBlogInternalLinks(out) : rewriteBlogLinksForLang(out, 'de');
  return fixAnchors(out);
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')
      ? false
      : { rejectUnauthorized: false }
  });
  await client.connect();
  const { rows } = await client.query(`
    SELECT id, slug, title, title_i18n, excerpt_i18n, content_i18n
    FROM blog_posts
    WHERE status = 'published'
    ORDER BY id
  `);

  const backup = [];
  let changed = 0;
  for (const row of rows) {
    const titles = row.title_i18n && typeof row.title_i18n === 'object' ? { ...row.title_i18n } : null;
    const excerpts = row.excerpt_i18n && typeof row.excerpt_i18n === 'object' ? { ...row.excerpt_i18n } : null;
    const bodies = row.content_i18n && typeof row.content_i18n === 'object' ? { ...row.content_i18n } : null;
    const nextTitle = fixDashes(row.title);
    if (titles) {
      if (titles.de) titles.de = fixDashes(titles.de);
      if (titles.en) titles.en = fixDashes(titles.en);
    }
    if (excerpts) {
      if (excerpts.de) excerpts.de = fixDashes(excerpts.de);
      if (excerpts.en) excerpts.en = fixDashes(excerpts.en);
    }
    if (bodies) {
      if (bodies.de) bodies.de = fixBody(bodies.de, 'de');
      if (bodies.en) bodies.en = fixBody(bodies.en, 'en');
    }
    const same = nextTitle === row.title
      && JSON.stringify(titles) === JSON.stringify(row.title_i18n)
      && JSON.stringify(excerpts) === JSON.stringify(row.excerpt_i18n)
      && JSON.stringify(bodies) === JSON.stringify(row.content_i18n);
    if (same) continue;
    changed += 1;
    const emLeft = `${bodies && bodies.de || ''} ${bodies && bodies.en || ''}`.match(/\u2014/g);
    const blankLeft = [...`${bodies && bodies.de || ''} ${bodies && bodies.en || ''}`.matchAll(/<a\b[^>]*href="(\/[^"]+)"[^>]*>/gi)]
      .filter((item) => /target="_blank"/i.test(item[0])).length;
    console.log(`#${row.id} ${row.slug} em-left=${emLeft ? emLeft.length : 0} internal-blank-left=${blankLeft}`);
    backup.push({
      id: row.id,
      slug: row.slug,
      title: row.title,
      title_i18n: row.title_i18n,
      excerpt_i18n: row.excerpt_i18n,
      content_i18n: row.content_i18n
    });
    if (!DRY_RUN) {
      await client.query(
        `UPDATE blog_posts
            SET title = $2,
                title_i18n = $3::jsonb,
                excerpt_i18n = $4::jsonb,
                content_i18n = $5::jsonb
          WHERE id = $1`,
        [row.id, nextTitle, titles ? JSON.stringify(titles) : null, excerpts ? JSON.stringify(excerpts) : null, bodies ? JSON.stringify(bodies) : null]
      );
    }
  }

  if (!DRY_RUN && backup.length) {
    const file = path.join('/tmp', `t2-blog-copy-backup-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(backup));
    console.log('backup', file);
  }
  console.log(DRY_RUN ? `dry-run posts ${changed}` : `updated posts ${changed}`);
  await client.end();
}

module.exports = { fixBody, fixDashes };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
