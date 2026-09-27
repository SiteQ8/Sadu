import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bundle as b, root, ARABIC, textFiles, arabicSentence, arabicLabel, pair } from './helpers.mjs';

test('bundle is generated from data/src and passes the build checks', () => {
  const r = spawnSync(process.execPath, [join(root, 'scripts/build.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.equal(b.schema, 'sadu/1');
});

test('structure matches the official CORF document body', () => {
  assert.equal(b.corf.baselines.length, 3);
  assert.equal(b.corf.domains.length, 27);
  assert.equal(b.corf.subdomains.length, 93);
  assert.equal(b.corf.areas.length, 199);
  assert.equal(b.counts.controls, 875);
  const per = (bid) => ({ d: b.corf.domains.filter((x) => x.baseline === bid).length, s: b.corf.subdomains.filter((x) => x.baseline === bid).length, a: b.corf.areas.filter((x) => x.baseline === bid).length, c: b.corf.areas.filter((x) => x.baseline === bid).reduce((n, a) => n + a.controls.length, 0) });
  assert.deepEqual(per('crb'), { d: 6, s: 33, a: 86, c: 516 });
  assert.deepEqual(per('orb'), { d: 8, s: 17, a: 35, c: 148 });
  assert.deepEqual(per('tprm'), { d: 13, s: 43, a: 78, c: 211 });
  const ids = new Set();
  for (const list of [b.corf.domains, b.corf.subdomains, b.corf.areas]) for (const x of list) { assert.ok(!ids.has(x.id), `duplicate id ${x.id}`); ids.add(x.id); }
  const cids = new Set();
  for (const a of b.corf.areas) {
    const s = b.corf.subdomains.find((x) => x.id === a.subdomain);
    assert.ok(s && s.baseline === a.baseline, `${a.id} sits in its own baseline`);
    assert.ok(a.id.startsWith(a.baseline + ':' + s.ref + '.'), `${a.id} numbered under ${s.id}`);
    assert.ok(a.page >= 219 && a.page <= 389, `${a.id} page in the baseline chapters`);
    for (const c of a.controls) { const id = `${a.baseline}:${c.id}`; assert.ok(!cids.has(id), `duplicate control ${id}`); cids.add(id); assert.ok(c.id.startsWith(a.ref + '.'), `${id} numbered under ${a.id}`); }
  }
  assert.equal(cids.size, 875);
});

test('every area has bilingual own-words summaries that follow the Arabic writing rules', () => {
  for (const a of b.corf.areas) {
    assert.ok(a.title_en && !ARABIC.test(a.title_en), `${a.id} title en`);
    arabicLabel(a.title_ar, `${a.id} title`);
    pair(a.summary_en, a.summary_ar, a.id);
    arabicSentence(a.summary_ar, a.id);
    assert.ok(a.summary_en.trim().endsWith('.'), `${a.id}: English summary ends with a period`);
    assert.ok(a.summary_en.split(/\s+/).length >= 8, `${a.id}: English summary is substantive`);
  }
});

test('baselines, domains and sub-domains are bilingual labels', () => {
  for (const x of [...b.corf.baselines, ...b.corf.domains, ...b.corf.subdomains]) {
    assert.ok(x.title_en && !ARABIC.test(x.title_en), `${x.id} title en`);
    arabicLabel(x.title_ar, `${x.id} title`);
  }
  for (const x of b.corf.baselines) { arabicLabel(x.short_ar, `${x.id} short`); assert.ok(x.short_en); }
});

test('reference layers are complete, bilingual and correctly counted', () => {
  assert.equal(b.iso.controls.length, 93);
  assert.deepEqual(b.iso.themes.map((t) => b.iso.controls.filter((c) => c.theme === t.id).length), [37, 8, 14, 34]);
  assert.equal(b.pci.requirements.length, 12);
  assert.equal(b.pci.groups.length, 63);
  assert.equal(b.swift.controls.length, 32);
  assert.equal(b.swift.controls.filter((c) => c.mandatory).length, 26);
  assert.deepEqual(b.swift.controls.filter((c) => !c.mandatory).map((c) => c.id), ['2.5', '2.11', '5.3', '6.5', '7.3', '7.4']);
  assert.ok(b.swift.controls.find((c) => c.id === '2.4').mandatory, '2.4 is mandatory in v2026');
  assert.equal(b.swift.principles.length, 7);
  assert.equal(b.swift.objectives.length, 3);
  for (const list of [b.iso.themes, b.iso.controls, b.pci.requirements, b.pci.groups, b.swift.objectives, b.swift.principles, b.swift.controls]) {
    for (const x of list) { pair(x.en, x.ar, x.id); arabicLabel(x.ar, `${x.id} label`); }
  }
  for (const c of b.swift.controls) { pair(c.desc_en, c.desc_ar, `swift ${c.id} desc`); arabicSentence(c.desc_ar, `swift ${c.id} desc`); }
  pair(b.swift.note_en, b.swift.note_ar, 'swift note'); arabicSentence(b.swift.note_ar, 'swift note');
  for (const x of [b.iso, b.pci, b.swift]) { pair(x.version_en, x.version_ar, x.id + ' version'); arabicLabel(x.version_ar, x.id + ' version'); }
});

test('crosswalk covers every area and every reference at least once', () => {
  const iso = new Set(), pci = new Set(), swift = new Set();
  for (const a of b.corf.areas) {
    const m = b.crosswalk.map[a.id];
    assert.ok(m, `${a.id} mapped`);
    assert.ok(m.iso.length >= 1, `${a.id} has an ISO reference`);
    for (const r of m.iso) { assert.ok(b.iso.controls.some((c) => c.id === r), `${a.id} iso ${r}`); iso.add(r); }
    for (const r of m.pci) { assert.ok(b.pci.groups.some((g) => g.id === r), `${a.id} pci ${r}`); pci.add(r); }
    for (const r of m.swift) { assert.ok(b.swift.controls.some((c) => c.id === r), `${a.id} swift ${r}`); swift.add(r); }
  }
  assert.equal(iso.size, 93, 'every ISO control reachable');
  assert.equal(pci.size, 63, 'every PCI group reachable');
  assert.equal(swift.size, 32, 'every SWIFT control reachable');
  pair(b.crosswalk.note_en, b.crosswalk.note_ar, 'crosswalk note');
  arabicSentence(b.crosswalk.note_ar, 'crosswalk note');
});

test('sources and provenance are bilingual and follow the rules', () => {
  assert.equal(b.sources.sources.length, 5);
  for (const s of b.sources.sources) {
    pair(s.en, s.ar, s.id); arabicLabel(s.ar, `${s.id} title`);
    pair(s.use.en, s.use.ar, `${s.id} use`); arabicLabel(s.use.ar, `${s.id} use`);
    assert.match(s.url, /^https:\/\//);
  }
  pair(b.sources.note.en, b.sources.note.ar, 'sources note');
  arabicSentence(b.sources.note.ar, 'sources note');
  assert.match(b.sources.note.en, /199/); assert.match(b.sources.note.en, /875/);
});

test('UI strings exist in both languages and Arabic follows the rules', () => {
  for (const [k, v] of Object.entries(b.ui)) {
    assert.ok(typeof v.en === 'string' && v.en.trim(), `${k} en`);
    assert.ok(typeof v.ar === 'string' && v.ar.trim(), `${k} ar`);
    if (k === 'lang.switch' || k === 'lang.switchLabel') continue;
    pair(v.en, v.ar, k);
    if (!ARABIC.test(v.ar)) continue;
    if (v.ar.trim().endsWith('.')) { assert.ok(!/[،؛]/.test(v.ar), `${k}: no Arabic comma`); assert.ok(!/[,;]/.test(v.ar), `${k}: no Latin comma`); }
    else if (v.ar.trim().endsWith('؟')) { assert.ok(!/[،؛,;]/.test(v.ar), `${k}: no commas`); }
    else arabicLabel(v.ar, k);
  }
});

test('the project identity is correct', () => {
  assert.equal(b.project.name_en, 'Sadu');
  assert.equal(b.project.name_ar, 'سدو');
  assert.equal(b.project.slug, 'sadu');
  assert.equal(b.project.domain, 'sadu.3li.info');
  assert.equal(b.project.owner, 'SiteQ8');
  assert.equal(b.project.author, 'Ali AlEnezi');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.version, b.project.version);
  assert.equal(pkg.name, 'sadu');
});

test('repository text has no Unicode dashes, no excluded names and no attribution to an AI assistant', () => {
  const dash = /[\u2012\u2013\u2014\u2015\u2212]/;
  const words = [new RegExp('cla' + 'ude', 'i'), new RegExp('anthro' + 'pic', 'i'), new RegExp('\\bn' + 'bk\\b', 'i')];
  for (const f of textFiles()) {
    const s = readFileSync(join(root, f), 'utf8');
    assert.ok(!dash.test(s), `${f} contains a Unicode dash`);
    for (const w of words) assert.ok(!w.test(s), `${f} contains an excluded word`);
  }
});
