const fs = require('fs');
const path = require('path');

function read(relPath) {
  const abs = path.join(process.cwd(), relPath);
  return fs.readFileSync(abs, 'utf8');
}

function assertContains(haystack, needle, label, failures) {
  if (!haystack.includes(needle)) failures.push(`Missing "${needle}" in ${label}`);
}

function assertNotContains(haystack, needle, label, failures) {
  if (haystack.includes(needle)) failures.push(`Unexpected "${needle}" in ${label}`);
}

function run() {
  const failures = [];

  const mainLayout = read('views/layouts/main.ejs');
  assertContains(mainLayout, 'localeAlternateUrls', 'views/layouts/main.ejs', failures);
  assertContains(mainLayout, 'alternates', 'views/layouts/main.ejs', failures);

  const appJs = read('app.js');
  assertContains(appJs, 'localeAlternateUrls', 'app.js', failures);
  assertContains(appJs, 'ogLocale', 'app.js', failures);
  assertContains(appJs, "'/de/wohnungen-berlin-kaufen'", 'app.js', failures);

  const propertyController = read('controllers/propertyController.js');
  assertContains(propertyController, 'Normalize duplicate query URLs for crawl efficiency', 'controllers/propertyController.js', failures);
  assertContains(propertyController, 'robotsMeta', 'controllers/propertyController.js', failures);

  const localeAwareSeoPartials = [
    'views/partials/seo/berlin-properties-head.ejs',
    'views/partials/seo/dubai-properties-head.ejs',
    'views/partials/seo/cyprus-properties-head.ejs',
    'views/partials/seo/property-list-head.ejs',
    'views/partials/seo/property-detail-head.ejs',
    'views/partials/seo/project-list-head.ejs',
    'views/partials/seo/home-head.ejs',
    'views/partials/seo/regions-head.ejs',
    'views/partials/seo/owners-head.ejs'
  ];

  localeAwareSeoPartials.forEach((file) => {
    const content = read(file);
    assertContains(content, 'og:locale', file, failures);
    assertNotContains(content, 'content="en_US"', file, failures);
  });

  if (failures.length > 0) {
    console.error('SEO smoke check failed:\n- ' + failures.join('\n- '));
    process.exit(1);
  }

  console.log('SEO smoke check passed.');
}

run();
