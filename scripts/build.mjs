// Build the data bundle the site and the MCP server load. Run with --check to validate without writing.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (name) => JSON.parse(readFileSync(join(root, 'data', 'src', name), 'utf8'));
const check = process.argv.includes('--check');
const errors = [];
const fail = (m) => errors.push(m);

const project = src('project.json');
const structure = src('corf-structure.json');
const texts = { crb: src('corf-text-crb.json'), orb: src('corf-text-orb.json'), tprm: src('corf-text-tprm.json') };
const iso = src('iso27001.json');
const pci = src('pci.json');
const swift = src('swift.json');
const crosswalk = src('crosswalk.json');
const sources = src('sources.json');
const ui = src('ui.json');

const BASELINE_AR = {
  crb: 'الضوابط الأساسية للمرونة السيبرانية',
  orb: 'الضوابط الأساسية للمرونة التشغيلية',
  tprm: 'الضوابط الأساسية لإدارة مخاطر الأطراف الخارجية',
};
const BASELINE_SHORT = { crb: { en: 'Cyber', ar: 'السيبرانية' }, orb: { en: 'Operational', ar: 'التشغيلية' }, tprm: { en: 'Third-Party', ar: 'الأطراف الخارجية' } };

// Merge structure and authored text.
const corf = {
  source: structure.source,
  baselines: structure.baselines.map((b) => ({ ...b, title_ar: BASELINE_AR[b.id], short_en: BASELINE_SHORT[b.id].en, short_ar: BASELINE_SHORT[b.id].ar })),
  domains: structure.domains.map((d) => {
    const t = texts[d.baseline].domains[d.id];
    if (!t || !t.title_ar) fail(`domain ${d.id} missing title_ar`);
    return { ...d, title_ar: t ? t.title_ar : '' };
  }),
  subdomains: structure.subdomains.map((s) => {
    const t = texts[s.baseline].subdomains[s.id];
    if (!t || !t.title_ar) fail(`subdomain ${s.id} missing title_ar`);
    return { ...s, title_ar: t ? t.title_ar : '' };
  }),
  areas: structure.areas.map((a) => {
    const t = texts[a.baseline].areas[a.id];
    if (!t) { fail(`area ${a.id} missing text`); return { ...a, title_ar: '', summary_en: '', summary_ar: '' }; }
    for (const k of ['title_ar', 'summary_en', 'summary_ar']) if (!t[k] || !t[k].trim()) fail(`area ${a.id} missing ${k}`);
    return { ...a, title_ar: t.title_ar, summary_en: t.summary_en, summary_ar: t.summary_ar };
  }),
};

// Every authored key must exist in the structure (catches typos in ids).
for (const [bid, t] of Object.entries(texts)) {
  for (const k of Object.keys(t.domains)) if (!structure.domains.some((d) => d.id === k)) fail(`text ${bid} has unknown domain ${k}`);
  for (const k of Object.keys(t.subdomains)) if (!structure.subdomains.some((s) => s.id === k)) fail(`text ${bid} has unknown subdomain ${k}`);
  for (const k of Object.keys(t.areas)) if (!structure.areas.some((a) => a.id === k)) fail(`text ${bid} has unknown area ${k}`);
}

// Counts.
const counts = { baselines: corf.baselines.length, domains: corf.domains.length, subdomains: corf.subdomains.length, areas: corf.areas.length, controls: corf.areas.reduce((n, a) => n + a.controls.length, 0) };
if (counts.baselines !== 3) fail(`expected 3 baselines, got ${counts.baselines}`);
if (counts.domains !== 27) fail(`expected 27 domains, got ${counts.domains}`);
if (counts.subdomains !== 93) fail(`expected 93 subdomains, got ${counts.subdomains}`);
if (counts.areas !== 199) fail(`expected 199 areas, got ${counts.areas}`);
if (counts.controls !== 875) fail(`expected 875 controls, got ${counts.controls}`);

// Reference layers.
if (iso.controls.length !== 93) fail(`ISO should have 93 controls, got ${iso.controls.length}`);
if (pci.requirements.length !== 12) fail(`PCI should have 12 requirements, got ${pci.requirements.length}`);
if (pci.groups.length !== 63) fail(`PCI should have 63 groups, got ${pci.groups.length}`);
if (swift.controls.length !== 32) fail(`SWIFT should have 32 controls, got ${swift.controls.length}`);
const mand = swift.controls.filter((c) => c.mandatory).length;
if (mand !== 26) fail(`SWIFT should have 26 mandatory controls, got ${mand}`);
for (const g of pci.groups) if (!pci.requirements.some((r) => r.id === g.req)) fail(`PCI group ${g.id} has unknown requirement ${g.req}`);
for (const c of swift.controls) if (!swift.principles.some((p) => p.id === c.principle)) fail(`SWIFT control ${c.id} has unknown principle ${c.principle}`);
for (const p of swift.principles) if (!swift.objectives.some((o) => o.id === p.objective)) fail(`SWIFT principle ${p.id} has unknown objective`);
for (const c of iso.controls) if (!iso.themes.some((t) => t.id === c.theme)) fail(`ISO control ${c.id} has unknown theme`);

// Crosswalk: every area mapped, every ref known.
const isoIds = new Set(iso.controls.map((c) => c.id));
const pciIds = new Set(pci.groups.map((g) => g.id));
const swiftIds = new Set(swift.controls.map((c) => c.id));
for (const a of corf.areas) if (!crosswalk.map[a.id]) fail(`crosswalk missing area ${a.id}`);
for (const [id, m] of Object.entries(crosswalk.map)) {
  if (!corf.areas.some((a) => a.id === id)) fail(`crosswalk has unknown area ${id}`);
  for (const r of m.iso || []) if (!isoIds.has(r)) fail(`crosswalk ${id}: unknown ISO ${r}`);
  for (const r of m.pci || []) if (!pciIds.has(r)) fail(`crosswalk ${id}: unknown PCI ${r}`);
  for (const r of m.swift || []) if (!swiftIds.has(r)) fail(`crosswalk ${id}: unknown SWIFT ${r}`);
  if (!(m.iso || []).length) fail(`crosswalk ${id}: no ISO reference`);
}

// UI keys are bilingual.
for (const [k, v] of Object.entries(ui)) if (!v || typeof v.en !== 'string' || typeof v.ar !== 'string') fail(`ui key ${k} is not bilingual`);

const bundle = { schema: project.schema, project, corf, counts, iso, pci, swift, crosswalk, sources, ui };

if (errors.length) {
  console.error(`Build failed with ${errors.length} problem(s):`);
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
if (!check) {
  mkdirSync(join(root, 'docs', 'data'), { recursive: true });
  const out = join(root, 'docs', 'data', 'bundle.json');
  writeFileSync(out, JSON.stringify(bundle));
  console.log(`bundle written: ${out} (${Math.round(readFileSync(out).length / 1024)} KB)`);
}
console.log(`ok: ${counts.baselines} baselines, ${counts.domains} domains, ${counts.subdomains} sub-domains, ${counts.areas} areas, ${counts.controls} controls; ISO ${iso.controls.length}, PCI ${pci.requirements.length}+${pci.groups.length}, SWIFT ${swift.controls.length} (${mand} mandatory)`);
