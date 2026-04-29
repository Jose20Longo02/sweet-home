const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const DEFAULT_CSV = 'seo-redirect-map-2026-04-28.csv';
const MAX_REDIRECTS = 10;
const REQUEST_TIMEOUT_MS = 12000;

function parseCsv(content) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url.trim());
    const normalizedPath = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.origin}${normalizedPath}${parsed.search}`;
  } catch (_) {
    return url.trim();
  }
}

function requestOnce(url) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      reject(new Error(`Invalid URL: ${url}`));
      return;
    }

    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(
      parsed,
      {
        method: 'GET',
        headers: {
          'user-agent': 'seo-redirect-validator/1.0',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: REQUEST_TIMEOUT_MS
      },
      (res) => {
        const location = res.headers.location || null;
        res.resume();
        resolve({
          status: res.statusCode || 0,
          location
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error(`Request timed out for ${url}`));
    });
    req.end();
  });
}

async function traceRedirects(url) {
  const hops = [];
  let current = url;

  for (let i = 0; i < MAX_REDIRECTS; i += 1) {
    const res = await requestOnce(current);
    hops.push({ url: current, status: res.status, location: res.location });

    if (![301, 302, 303, 307, 308].includes(res.status) || !res.location) {
      return {
        hops,
        finalUrl: current,
        finalStatus: res.status
      };
    }

    current = new URL(res.location, current).toString();
  }

  throw new Error(`Too many redirects (>${MAX_REDIRECTS}) for ${url}`);
}

function isWildcard(url) {
  return typeof url === 'string' && url.includes('*');
}

async function validate301Rule(rule) {
  const oldUrl = normalizeUrl(rule.old_url);
  const targetUrl = normalizeUrl(rule.new_url);

  if (!oldUrl || !targetUrl) {
    return { ok: false, error: 'Missing old_url or new_url for 301 rule.' };
  }

  const oldTrace = await traceRedirects(oldUrl);
  const hopCount = Math.max(0, oldTrace.hops.length - 1);
  const firstHop = oldTrace.hops[0];
  const oldFinal = normalizeUrl(oldTrace.finalUrl);

  if (firstHop.status !== 301) {
    return { ok: false, error: `Old URL returns ${firstHop.status}, expected 301.` };
  }

  if (hopCount !== 1) {
    return { ok: false, error: `Redirect chain detected (${hopCount} hops), expected exactly 1.` };
  }

  if (oldFinal !== targetUrl) {
    return { ok: false, error: `Final URL mismatch. Got ${oldFinal}, expected ${targetUrl}.` };
  }

  const targetTrace = await traceRedirects(targetUrl);
  const targetHopCount = Math.max(0, targetTrace.hops.length - 1);

  if (targetHopCount !== 0) {
    return { ok: false, error: `Target URL has redirects (${targetHopCount} hops), expected none.` };
  }

  if (targetTrace.finalStatus !== 200) {
    return { ok: false, error: `Target URL returns ${targetTrace.finalStatus}, expected 200.` };
  }

  return { ok: true };
}

async function validate410Rule(rule) {
  const oldUrl = normalizeUrl(rule.old_url);
  if (!oldUrl) return { ok: false, error: 'Missing old_url for 410 rule.' };
  if (isWildcard(oldUrl)) return { ok: true, skipped: true, reason: 'Wildcard pattern - skipped live check.' };

  const trace = await traceRedirects(oldUrl);
  const firstHop = trace.hops[0];
  if (firstHop.status !== 410) {
    return { ok: false, error: `Old URL returns ${firstHop.status}, expected 410.` };
  }

  return { ok: true };
}

async function run() {
  const csvArg = process.argv[2] || DEFAULT_CSV;
  const csvPath = path.resolve(process.cwd(), csvArg);

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(raw).filter((r) => r.some((cell) => String(cell || '').trim() !== ''));
  if (rows.length < 2) {
    console.error(`CSV has no data rows: ${csvPath}`);
    process.exit(1);
  }

  const header = rows[0].map((h) => String(h || '').trim());
  const dataRows = rows.slice(1).map((cols) => {
    const row = {};
    header.forEach((h, i) => {
      row[h] = String(cols[i] || '').trim();
    });
    return row;
  });

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const status = String(row.status || '').trim();
    const label = `${i + 2} ${row.old_url || '(missing old_url)'}`;

    try {
      let result;
      if (status === '301') {
        result = await validate301Rule(row);
      } else if (status === '410') {
        result = await validate410Rule(row);
      } else {
        skipped += 1;
        console.log(`[SKIP] ${label} -> unsupported status "${status}"`);
        continue;
      }

      if (result.skipped) {
        skipped += 1;
        console.log(`[SKIP] ${label} -> ${result.reason}`);
      } else if (result.ok) {
        passed += 1;
        console.log(`[PASS] ${label}`);
      } else {
        failed += 1;
        console.log(`[FAIL] ${label} -> ${result.error}`);
      }
    } catch (err) {
      failed += 1;
      console.log(`[FAIL] ${label} -> ${err.message}`);
    }
  }

  console.log('\nRedirect validation summary');
  console.log(`- Passed: ${passed}`);
  console.log(`- Failed: ${failed}`);
  console.log(`- Skipped: ${skipped}`);

  if (failed > 0) process.exit(1);
}

run();
