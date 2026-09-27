import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bundle as b } from './helpers.mjs';
import * as core from '../docs/assets/core.js';

test('empty assessment scores nothing and full implementation scores 100', () => {
  const e0 = core.evaluate(b, core.emptyAssessment());
  assert.equal(e0.overall.readiness, null); assert.equal(e0.overall.band, null); assert.equal(e0.total, 875);
  const full = core.emptyAssessment();
  for (const id of core.allControls(b)) full.status[id] = 'implemented';
  for (const s of b.corf.subdomains) full.maturity[s.id] = 5;
  const e1 = core.evaluate(b, full);
  assert.equal(e1.overall.readiness, 100); assert.equal(e1.overall.band, 'managed'); assert.equal(e1.overall.maturity, 5);
  for (const x of e1.baselines) assert.equal(x.readiness, 100);
});

test('rollup scores implemented as full, partial as half and sets not applicable aside', () => {
  const a = core.emptyAssessment();
  a.status['crb:4.1.1.1'] = 'implemented'; a.status['crb:4.1.1.2'] = 'partial'; a.status['crb:4.1.1.3'] = 'not_implemented'; a.status['crb:4.1.1.4'] = 'not_applicable';
  const e = core.evaluate(b, a);
  const area = e.areas.find((x) => x.id === 'crb:4.1.1');
  assert.equal(area.readiness, 50);
  assert.deepEqual(area.counts, { implemented: 1, partial: 1, not_implemented: 1, not_applicable: 1, unset: 1 });
  assert.equal(e.overall.readiness, 50);
  assert.equal(e.gaps.length, 1); assert.equal(e.gaps[0].id, 'crb:4.1.1');
});

test('validation drops unknown ids and invalid values', () => {
  const v = core.validateAssessment(b, { status: { 'crb:4.1.1.1': 'implemented', bogus: 'implemented', 'crb:4.1.1.2': 'maybe' }, notes: { 'crb:4.1.1.1': 'x', nope: 'y' }, maturity: { 'crb:4.1': 3, 'crb:4.2': 9, zzz: 2 }, soa: { 'crb:4.1': 'applicable', 'crb:4.2': 'later' }, soaNotes: { 'crb:4.1': 'why' } });
  assert.deepEqual(Object.keys(v.status), ['crb:4.1.1.1']);
  assert.deepEqual(Object.keys(v.notes), ['crb:4.1.1.1']);
  assert.deepEqual(v.maturity, { 'crb:4.1': 3 });
  assert.deepEqual(v.soa, { 'crb:4.1': 'applicable' });
  assert.deepEqual(v.soaNotes, { 'crb:4.1': 'why' });
});

test('a sub-domain excluded in the statement of applicability counts as not applicable', () => {
  const a = core.emptyAssessment();
  a.status['orb:3.1.1.1'] = 'not_implemented'; a.soa['orb:3.1'] = 'not_applicable';
  const e = core.evaluate(b, a);
  const sub = e.subMap.get('orb:3.1');
  assert.equal(sub.counts.not_applicable, sub.total); assert.equal(sub.readiness, null);
  assert.equal(e.gaps.length, 0);
  assert.deepEqual(e.soa, { applicable: 0, not_applicable: 1, unset: 92 });
});

test('maturity averages per domain, baseline and overall', () => {
  const a = core.emptyAssessment();
  a.maturity['crb:4.1'] = 2; a.maturity['crb:4.2'] = 4; a.maturity['tprm:3.1'] = 5;
  const e = core.evaluate(b, a);
  assert.equal(e.domains.find((d) => d.id === 'crb:4').maturity, 3);
  assert.equal(e.baselines.find((x) => x.id === 'crb').maturity, 3);
  assert.equal(e.baselines.find((x) => x.id === 'tprm').maturity, 5);
  assert.equal(e.overall.maturity, 3.7);
});

test('bands follow the thresholds', () => {
  assert.equal(core.band(0), 'initial'); assert.equal(core.band(29), 'initial'); assert.equal(core.band(30), 'developing');
  assert.equal(core.band(60), 'defined'); assert.equal(core.band(85), 'managed'); assert.equal(core.band(100), 'managed'); assert.equal(core.band(null), null);
});

test('crosswalk resolves references and the reverse lookup derives the other frameworks', () => {
  const cw = core.crosswalkOf(b, '5.7.1');
  assert.ok(cw.iso.some((x) => x.id === 'A.8.24'));
  assert.ok(cw.pci.some((x) => x.id === '3.6'));
  const r = core.reverseLookup(b, 'swift', '4.2');
  assert.ok(r.areas.some((a) => a.id === 'crb:5.6.2'));
  assert.ok(r.derived.pci.includes('8.4'));
  assert.ok(r.derived.iso.includes('A.8.5'));
  assert.equal(core.reverseLookup(b, 'nope', 'x'), null);
  assert.equal(core.crosswalkOf(b, 'crb:99.9.9'), null);
});

test('search finds areas by id and by words in both languages', () => {
  assert.ok(core.searchAreas(b, 'crb:5.6.1').some((a) => a.id === 'crb:5.6.1'));
  assert.ok(core.searchAreas(b, 'phishing').some((a) => a.id === 'crb:4.5.2'));
  assert.ok(core.searchAreas(b, 'التَّشفير').some((a) => a.id === 'crb:5.7.1'), 'diacritics are folded');
  assert.deepEqual(core.searchAreas(b, 'phishing', { baseline: 'orb' }), []);
  assert.deepEqual(core.searchAreas(b, ''), []);
});

test('normalizeRef accepts the spellings people type', () => {
  assert.equal(core.normalizeRef('ORB 3.1.1'), 'orb:3.1.1');
  assert.equal(core.normalizeRef('4.1.1'), 'crb:4.1.1');
  assert.equal(core.normalizeRef('tprm-10.1.1'), 'tprm:10.1.1');
  assert.equal(core.normalizeRef('crb:5.6'), 'crb:5.6');
});
