import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { root, bundle as b } from './helpers.mjs';

const html = readFileSync(join(root, 'docs/index.html'), 'utf8');
const app = readFileSync(join(root, 'docs/assets/app.js'), 'utf8');

test('page declares a strict, self-only CSP', () => {
  assert.match(html, /Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /base-uri 'self'/);
});

test('page is right-to-left Arabic by default and links its own assets', () => {
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /assets\/app\.js/);
  assert.match(html, /assets\/styles\.css/);
  assert.match(html, /assets\/fonts\.css/);
  assert.match(html, /favicon\.svg/);
  assert.match(html, /https:\/\/sadu\.3li\.info\//);
});

test('no inline scripts, inline style attributes or inline handlers in the page or the app markup', () => {
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>[^<]/.test(html), 'no inline <script> with code');
  assert.ok(!/\sstyle=/.test(html), 'no inline style attributes in the page');
  assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(html), 'no inline event handlers');
  assert.ok(!/style="/.test(app), 'app never renders style attributes');
  assert.match(app, /\.style\.width = /, 'widths applied through the CSSOM');
});

test('CNAME matches the project domain and Pages guard files exist', () => {
  const cname = readFileSync(join(root, 'docs/CNAME'), 'utf8').trim();
  assert.equal(cname, b.project.domain);
  for (const f of ['docs/.nojekyll', 'docs/robots.txt', 'docs/sitemap.xml', 'docs/data/bundle.json', 'docs/favicon.svg', 'docs/og.png', 'docs/fonts/OFL.txt']) assert.ok(existsSync(join(root, f)), `${f} present`);
});

test('the every-visit disclaimer is shown unconditionally and the app has no network calls beyond its own data', () => {
  assert.match(app, /showDisclaimer\(\)/);
  assert.ok(!/disclaimer.*localStorage|localStorage.*disclaimer/i.test(app), 'popup is not gated by storage');
  const fetches = [...app.matchAll(/fetch\(([^)]*)\)/g)].map((m) => m[1]);
  assert.deepEqual(fetches, ["'data/bundle.json', { cache: 'no-store' }"]);
});
