/**
 * GA4 contact_form_submit verification (playbook task #15).
 *
 * Loads the contact page in headless Chrome, blocks all external analytics
 * requests, mocks the /api/leads/contact endpoint, and counts real dataLayer
 * pushes to prove:
 *   1. No contact_form_submit fires on page load.
 *   2. Exactly one page_view config fires on load (no double page views).
 *   3. Exactly one contact_form_submit fires per successful submission,
 *      even with rapid double clicks.
 *   4. Zero contact_form_submit events fire when the server rejects the form.
 *
 * Usage: BASE_URL=http://127.0.0.1:3101 node scripts/ga4-contact-event-check.js
 */
const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3101';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

async function countEvents(page) {
  return page.evaluate(() => {
    const dl = window.dataLayer || [];
    let formSubmits = 0;
    let configs = 0;
    for (const entry of dl) {
      const args = Array.from(entry || []);
      if (args[0] === 'event' && args[1] === 'contact_form_submit') formSubmits++;
      if (args[0] === 'config') configs++;
    }
    return { formSubmits, configs, total: dl.length };
  });
}

async function fillAndSubmit(page) {
  await page.evaluate(() => {
    document.querySelector('input[name="name"]').value = 'GA4 Test User';
    document.querySelector('input[name="email"]').value = 'ga4-test@example.com';
    document.querySelector('input[name="phone"]').value = '15112345678';
    const lang = document.querySelector('#language');
    if (lang) lang.value = lang.options[1] ? lang.options[1].value : '';
    document.querySelector('textarea[name="message"]').value = 'Automated GA4 tracking verification. Please ignore.';
    document.querySelector('.contact-form button[type="submit"]').click();
  });
}

async function newTrackedPage(browser, { leadStatus, responseDelayMs = 0 }) {
  const page = await browser.newPage();
  const state = { leadPosts: 0 };
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('  [page console error]', msg.text());
  });
  page.on('pageerror', (err) => console.log('  [pageerror]', err.message));
  await page.evaluateOnNewDocument(() => {
    document.addEventListener('submit', () => { window.__submitCount = (window.__submitCount || 0) + 1; }, true);
  });
  await page.setExtraHTTPHeaders({ 'x-forwarded-proto': 'https' });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    // Never let analytics or recaptcha traffic leave the machine.
    if (/googletagmanager\.com|google-analytics\.com|google\.com\/recaptcha|gstatic\.com/.test(url)) {
      return req.abort();
    }
    if (url.includes('/api/leads/contact') && req.method() === 'POST') {
      state.leadPosts++;
      const respond = () => req.respond(
        leadStatus === 200
          ? { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, lead: { id: 0 } }) }
          : { status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Simulated server error' }) }
      ).catch(() => {});
      if (responseDelayMs) setTimeout(respond, responseDelayMs);
      else respond();
      return;
    }
    req.continue();
  });
  await page.goto(`${BASE_URL}/contact`, { waitUntil: 'networkidle2', timeout: 60000 });
  return { page, state };
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME,
    args: ['--no-sandbox']
  });

  // Scenario A: page load + successful submit, with an impatient double click
  // while the request is still in flight (realistic ~400ms server latency).
  const { page: pageOk, state: stateOk } = await newTrackedPage(browser, { leadStatus: 200, responseDelayMs: 400 });
  const hasGtag = await pageOk.evaluate(() => typeof window.gtag === 'function' && Array.isArray(window.dataLayer));
  check('gtag + dataLayer initialised on page', hasGtag);

  const onLoad = await countEvents(pageOk);
  check('no contact_form_submit on page load', onLoad.formSubmits === 0, `found ${onLoad.formSubmits}`);
  check('exactly one page_view config on load', onLoad.configs === 1, `found ${onLoad.configs}`);

  await fillAndSubmit(pageOk);
  // Immediately click again while the first request is in flight.
  await pageOk.evaluate(() => document.querySelector('.contact-form button[type="submit"]').click());
  try {
    await pageOk.waitForFunction(
      () => document.querySelector('.contact-form .form-message.success, .contact-form .form-message.error'),
      { timeout: 15000 }
    );
  } catch (e) {
    const diag = await pageOk.evaluate(() => ({
      url: location.href,
      msg: (document.querySelector('.contact-form .form-message') || {}).textContent || '(none)',
      msgClass: (document.querySelector('.contact-form .form-message') || {}).className || '(none)',
      btnDisabled: (document.querySelector('.contact-form button[type="submit"]') || {}).disabled,
      submitCount: window.__submitCount || 0,
      forms: document.querySelectorAll('.contact-form').length,
      buttons: document.querySelectorAll('.contact-form button[type="submit"]').length,
      csrfMeta: !!document.querySelector('meta[name="csrf-token"]'),
      recaptchaAttr: (document.querySelector('.contact-form') || {}).getAttribute
        ? document.querySelector('.contact-form').getAttribute('data-recaptcha-site-key')
        : null,
      grecaptcha: typeof window.grecaptcha
    }));
    console.log('  [diag scenario A timeout]', JSON.stringify(diag), 'POSTs:', stateOk.leadPosts);
    throw e;
  }
  const afterOk = await countEvents(pageOk);
  const successShown = await pageOk.evaluate(() => !!document.querySelector('.contact-form .form-message.success'));
  check('success message shown after mocked 200', successShown);
  check('double click causes only one POST while in flight', stateOk.leadPosts === 1, `found ${stateOk.leadPosts} POSTs`);
  check('exactly one contact_form_submit after successful submit', afterOk.formSubmits === 1, `found ${afterOk.formSubmits}`);
  await pageOk.close();

  // Scenario B: failed submit
  const { page: pageFail } = await newTrackedPage(browser, { leadStatus: 500 });
  await fillAndSubmit(pageFail);
  await pageFail.waitForFunction(
    () => document.querySelector('.contact-form .form-message.error'),
    { timeout: 15000 }
  );
  const afterFail = await countEvents(pageFail);
  check('zero contact_form_submit after failed submit', afterFail.formSubmits === 0, `found ${afterFail.formSubmits}`);
  await pageFail.close();

  await browser.close();
  console.log(failures === 0 ? '\nAll GA4 contact event checks passed.' : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
