// Pre-renders the default (Azerbaijani) text into the static HTML of content pages so search engines
// and slow phones see the content without waiting for JavaScript. Language switching keeps working.
// Usage: serve the site with clean URLs on localhost:8766, then:  node tools/bake.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const PAGES = ['courses', 'sample-report', 'privacy', 'terms', '404'];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ locale: 'az-AZ' });
  await ctx.route(/supabase\.co|fonts\.g/, r => r.abort());
  for (const p of PAGES) {
    const pg = await ctx.newPage();
    await pg.goto('http://localhost:8766/' + p + '?lang=az', { waitUntil: 'networkidle' });
    let html = await pg.content();
    html = html.replace(/<body([^>]*) class="([^"]*)\bmenu-open\b/, '<body$1 class="$2');
    fs.writeFileSync(path.join(ROOT, p + '.html'), html.endsWith('\n') ? html : html + '\n');
    console.log('baked', p, html.length);
    await pg.close();
  }
  await b.close();
})();
