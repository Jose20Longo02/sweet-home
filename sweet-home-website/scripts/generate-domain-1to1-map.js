#!/usr/bin/env node
/**
 * Generate the 1:1 .co.il → .de redirect map from the live sitemap
 * (+ Phase 4 sample paths). Used for Migration Checklist #2.
 *
 * Usage:
 *   node scripts/generate-domain-1to1-map.js
 *   node scripts/generate-domain-1to1-map.js --base https://sweet-home.co.il
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const OLD_ORIGIN = 'https://sweet-home.co.il';
const NEW_ORIGIN = 'https://sweethome-immobilien.de';
const OUT = path.join(__dirname, '..', 'docs', 'domain-migration-1to1-redirect-map-2026-07-23.csv');

const PHASE4_SAMPLES = [
  '/',
  '/en',
  '/about',
  '/contact',
  '/properties',
  '/projects',
  '/blog',
  '/wohnungen-berlin-kaufen',
  '/wohnung-kaufen-moabit',
  '/immobilien-dubai-kaufen',
  '/immobilien-zypern-kaufen',
  '/en/properties-for-sale-berlin',
  '/en/properties-for-sale-dubai',
  '/en/properties-for-sale-cyprus',
  '/berlin-mieter-belegte-einstiegsstrategie',
  '/en/berlin-tenant-occupied-entry-strategy',
  '/properties?country=Germany&city=Berlin',
  '/blog?page=2',
  '/blog?page=1',
  '/de/about',
  '/de/en/about',
  '/es/about',
  '/lang/es',
  '/sitemap.xml',
  '/robots.txt'
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'SweetHome-1to1-Map/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(new URL(res.headers.location, url).toString()).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

function pathAndQuery(urlOrPath, baseOrigin) {
  const u = new URL(urlOrPath.startsWith('http') ? urlOrPath : baseOrigin + urlOrPath);
  return `${u.pathname}${u.search || ''}` || '/';
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const args = process.argv.slice(2);
  const baseIdx = args.indexOf('--base');
  const sitemapBase = (baseIdx >= 0 && args[baseIdx + 1]) ? args[baseIdx + 1].replace(/\/$/, '') : OLD_ORIGIN;

  const sm = await fetchText(`${sitemapBase}/sitemap.xml`);
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const seen = new Set();
  const rows = [];

  function add(urlOrPath, source) {
    const pq = pathAndQuery(urlOrPath, OLD_ORIGIN);
    if (seen.has(pq)) return;
    seen.add(pq);
    rows.push({
      old_url: `${OLD_ORIGIN}${pq}`,
      new_url: `${NEW_ORIGIN}${pq}`,
      http_status: '301',
      path_changed: 'no',
      source,
      notes: '1:1 host swap; path+query preserved'
    });
  }

  PHASE4_SAMPLES.forEach((p) => add(p, 'phase4-sample'));
  locs.forEach((loc) => add(loc, 'sitemap'));

  rows.push({
    old_url: 'http://sweet-home.co.il/',
    new_url: `${NEW_ORIGIN}/`,
    http_status: '301',
    path_changed: 'no',
    source: 'host-variant',
    notes: 'http + apex → https .de same path'
  });
  rows.push({
    old_url: 'https://www.sweet-home.co.il/en',
    new_url: `${NEW_ORIGIN}/en`,
    http_status: '301',
    path_changed: 'no',
    source: 'host-variant',
    notes: 'www → non-www .de same path'
  });

  let mismatches = 0;
  for (const r of rows) {
    const o = new URL(r.old_url);
    const n = new URL(r.new_url);
    const oq = `${o.pathname}${o.search || ''}` || '/';
    const nq = `${n.pathname}${n.search || ''}` || '/';
    if (oq !== nq) mismatches += 1;
  }

  const header = 'old_url,new_url,http_status,path_changed,source,notes';
  const body = rows.map((r) => [
    r.old_url, r.new_url, r.http_status, r.path_changed, r.source, r.notes
  ].map(csvEscape).join(',')).join('\n');
  fs.writeFileSync(OUT, `${header}\n${body}\n`, 'utf8');

  console.log(`Wrote ${rows.length} rows → ${OUT}`);
  console.log(`Sitemap locs: ${locs.length}; path mismatches: ${mismatches}`);
  if (mismatches) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
