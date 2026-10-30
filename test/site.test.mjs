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
  assert.match(app, /\.style\.clipPath = /, 'bar values applied through the CSSOM as a clip, never a layout width');
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

const css = readFileSync(join(root, 'docs/assets/styles.css'), 'utf8');

test('motion follows the house rules: named transitions, no ease-in, hover gated, reduced motion honoured', () => {
  assert.ok(!/transition:\s*all\b/.test(css), 'no transition: all');
  assert.ok(!/\bease-in\b(?!-out)/.test(css.replace(/--ease-in-out[^;]*;/g, '')), 'no ease-in on UI');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'reduced motion block present');
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/, 'hover styles gated to pointers that can hover');
  assert.ok(!/:hover/.test(css.split('@media (hover: hover) and (pointer: fine)')[0]), 'no ungated hover rule before the gate');
  for (const m of css.matchAll(/(\d+)ms/g)) assert.ok(Number(m[1]) <= 400, `duration ${m[1]}ms stays within the UI budget`);
  assert.ok(!/@keyframes/.test(css), 'state changes use transitions, not keyframes');
});

test('the woven band is an authored SVG pattern, not a gradient, and the stylesheet carries no gradient at all', () => {
  assert.match(css, /--weave: url\("data:image\/svg\+xml,/);
  assert.ok(!/repeating-linear-gradient|radial-gradient|conic-gradient/.test(css), 'no decorative gradients');
  assert.equal((css.match(/linear-gradient/g) || []).length, 1, 'the only linear-gradient is the edge mask on the scrolling tab row');
});

test('values come from the scales: one typeface, three radii, spacing tokens', () => {
  assert.equal((css.match(/font-family:/g) || []).length, 1, 'one font-family declaration');
  const radii = new Set([...css.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1].trim()));
  for (const r of radii) assert.ok(['var(--r-card)', 'var(--r-control)', '999px', '4px', '3px', '6px'].includes(r), `radius ${r} is from the scale`);
});
