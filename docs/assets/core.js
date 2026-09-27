// Sadu engine. Pure functions over the data bundle shared by the site and the MCP server. No DOM.

export const SCHEMA = 'sadu/1';
export const STATUSES = ['implemented', 'partial', 'not_implemented', 'not_applicable'];
export const SCORE = { implemented: 1, partial: 0.5, not_implemented: 0 };
export const MATURITY = [1, 2, 3, 4, 5];
export const SOA = ['applicable', 'not_applicable'];
export const FRAMEWORKS = ['iso', 'pci', 'swift'];

// Readiness bands over the assessed, applicable controls.
export const BANDS = [
  { id: 'initial', min: 0 },
  { id: 'developing', min: 30 },
  { id: 'defined', min: 60 },
  { id: 'managed', min: 85 },
];

export function band(pct) {
  if (pct == null) return null;
  let hit = BANDS[0];
  for (const b of BANDS) if (pct >= b.min) hit = b;
  return hit.id;
}

export function arabicFold(s) {
  return String(s || '')
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/[\u0649]/g, '\u064A')
    .replace(/\u0640/g, '')
    .toLowerCase()
    .trim();
}

// Accepts "crb:4.1.1", "4.1.1" (crb default), "orb 3.1.1", "tprm:10.1.1" and returns the canonical area or sub-domain id.
export function normalizeRef(s) {
  const t = String(s || '').trim().toLowerCase().replace(/\s+/g, ':');
  const m = t.match(/^(crb|orb|tprm)[:\-]?(\d+(?:\.\d+)*)$/);
  if (m) return `${m[1]}:${m[2]}`;
  const n = t.match(/^(\d+(?:\.\d+)*)$/);
  if (n) return `crb:${n[1]}`;
  return t;
}

const cache = new WeakMap();

export function indexBundle(b) {
  if (cache.has(b)) return cache.get(b);
  const corf = b.corf;
  const baselines = new Map(corf.baselines.map((x) => [x.id, x]));
  const domains = new Map(corf.domains.map((x) => [x.id, x]));
  const subdomains = new Map(corf.subdomains.map((x) => [x.id, x]));
  const areas = new Map(corf.areas.map((x) => [x.id, x]));
  const controls = new Map();
  const areasBySub = new Map();
  const subsByDomain = new Map();
  const domainsByBaseline = new Map();
  for (const a of corf.areas) {
    for (const c of a.controls) controls.set(`${a.baseline}:${c.id}`, { id: `${a.baseline}:${c.id}`, ref: c.id, page: c.page, area: a.id, baseline: a.baseline });
    if (!areasBySub.has(a.subdomain)) areasBySub.set(a.subdomain, []);
    areasBySub.get(a.subdomain).push(a);
  }
  for (const s of corf.subdomains) {
    if (!subsByDomain.has(s.domain)) subsByDomain.set(s.domain, []);
    subsByDomain.get(s.domain).push(s);
  }
  for (const d of corf.domains) {
    if (!domainsByBaseline.has(d.baseline)) domainsByBaseline.set(d.baseline, []);
    domainsByBaseline.get(d.baseline).push(d);
  }
  const iso = new Map(b.iso.controls.map((x) => [x.id, x]));
  const pciReq = new Map(b.pci.requirements.map((x) => [x.id, x]));
  const pciGroup = new Map(b.pci.groups.map((x) => [x.id, x]));
  const swift = new Map(b.swift.controls.map((x) => [x.id, x]));
  const crosswalk = new Map(Object.entries(b.crosswalk.map));
  // reverse index: framework ref -> area ids
  const reverse = { iso: new Map(), pci: new Map(), swift: new Map() };
  for (const [areaId, m] of crosswalk) {
    for (const f of FRAMEWORKS) for (const ref of m[f] || []) {
      if (!reverse[f].has(ref)) reverse[f].set(ref, []);
      reverse[f].get(ref).push(areaId);
    }
  }
  const ix = { baselines, domains, subdomains, areas, controls, areasBySub, subsByDomain, domainsByBaseline, iso, pciReq, pciGroup, swift, crosswalk, reverse };
  cache.set(b, ix);
  return ix;
}

export function controlsOfArea(b, areaId) {
  const a = indexBundle(b).areas.get(areaId);
  return a ? a.controls.map((c) => `${a.baseline}:${c.id}`) : [];
}
export function controlsOfSub(b, subId) {
  const ix = indexBundle(b);
  return (ix.areasBySub.get(subId) || []).flatMap((a) => controlsOfArea(b, a.id));
}
export function controlsOfDomain(b, domId) {
  const ix = indexBundle(b);
  return (ix.subsByDomain.get(domId) || []).flatMap((s) => controlsOfSub(b, s.id));
}
export function controlsOfBaseline(b, bid) {
  const ix = indexBundle(b);
  return (ix.domainsByBaseline.get(bid) || []).flatMap((d) => controlsOfDomain(b, d.id));
}
export function allControls(b) {
  return [...indexBundle(b).controls.keys()];
}

export function emptyAssessment() {
  return { schema: SCHEMA, status: {}, notes: {}, maturity: {}, soa: {}, soaNotes: {} };
}

// Keep only known ids and valid values. Drop everything else.
export function validateAssessment(b, input) {
  const ix = indexBundle(b);
  const out = emptyAssessment();
  const src = input || {};
  for (const [id, v] of Object.entries(src.status || {})) if (ix.controls.has(id) && STATUSES.includes(v)) out.status[id] = v;
  for (const [id, v] of Object.entries(src.notes || {})) if (ix.controls.has(id) && typeof v === 'string' && v.trim()) out.notes[id] = v.slice(0, 2000);
  for (const [id, v] of Object.entries(src.maturity || {})) { const n = Number(v); if (ix.subdomains.has(id) && MATURITY.includes(n)) out.maturity[id] = n; }
  for (const [id, v] of Object.entries(src.soa || {})) if (ix.subdomains.has(id) && SOA.includes(v)) out.soa[id] = v;
  for (const [id, v] of Object.entries(src.soaNotes || {})) if (ix.subdomains.has(id) && typeof v === 'string' && v.trim()) out.soaNotes[id] = v.slice(0, 2000);
  return out;
}

export function rollup(ids, status) {
  let applicable = 0;
  let scoreSum = 0;
  const counts = { implemented: 0, partial: 0, not_implemented: 0, not_applicable: 0, unset: 0 };
  for (const id of ids) {
    const s = status[id] || 'unset';
    counts[s] += 1;
    if (s === 'unset' || s === 'not_applicable') continue;
    applicable += 1;
    scoreSum += SCORE[s];
  }
  const pct = applicable > 0 ? Math.round((scoreSum / applicable) * 100) : null;
  return { total: ids.length, assessed: applicable + counts.not_applicable, applicable, counts, readiness: pct, band: band(pct) };
}

function avgMaturity(subIds, maturity) {
  const vals = subIds.map((s) => maturity[s]).filter((v) => v);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, v) => a + v, 0) / vals.length) * 10) / 10;
}

// Full evaluation: readiness per area, sub-domain, domain and baseline plus overall, with maturity and SoA rollups.
export function evaluate(b, input) {
  const clean = validateAssessment(b, input);
  const ix = indexBundle(b);
  // Controls under a sub-domain excluded in the statement of applicability count as not applicable.
  const st = { ...clean.status };
  for (const [subId, mark] of Object.entries(clean.soa)) if (mark === 'not_applicable') for (const id of controlsOfSub(b, subId)) st[id] = 'not_applicable';
  const subdomains = b.corf.subdomains.map((s) => {
    const ids = controlsOfSub(b, s.id);
    return { id: s.id, ref: s.ref, baseline: s.baseline, domain: s.domain, title_en: s.title_en, title_ar: s.title_ar, maturity: clean.maturity[s.id] || null, soa: clean.soa[s.id] || null, ...rollup(ids, st) };
  });
  const subMap = new Map(subdomains.map((s) => [s.id, s]));
  const domains = b.corf.domains.map((d) => {
    const subs = (ix.subsByDomain.get(d.id) || []).map((s) => s.id);
    return { id: d.id, ref: d.ref, baseline: d.baseline, title_en: d.title_en, title_ar: d.title_ar, maturity: avgMaturity(subs, clean.maturity), ...rollup(controlsOfDomain(b, d.id), st) };
  });
  const baselines = b.corf.baselines.map((x) => {
    const subs = b.corf.subdomains.filter((s) => s.baseline === x.id).map((s) => s.id);
    return { id: x.id, title_en: x.title_en, title_ar: x.title_ar, maturity: avgMaturity(subs, clean.maturity), ...rollup(controlsOfBaseline(b, x.id), st) };
  });
  const areas = b.corf.areas.map((a) => ({ id: a.id, ref: a.ref, baseline: a.baseline, subdomain: a.subdomain, title_en: a.title_en, title_ar: a.title_ar, ...rollup(controlsOfArea(b, a.id), st) }));
  const all = allControls(b);
  const overall = { ...rollup(all, st), maturity: avgMaturity(b.corf.subdomains.map((s) => s.id), clean.maturity) };
  const soa = { applicable: 0, not_applicable: 0, unset: 0 };
  for (const s of b.corf.subdomains) soa[clean.soa[s.id] || 'unset'] += 1;
  const gaps = areas.filter((a) => a.counts.not_implemented > 0).sort((x, y) => y.counts.not_implemented - x.counts.not_implemented || x.id.localeCompare(y.id));
  return { schema: SCHEMA, overall, baselines, domains, subdomains, areas, gaps, soa, subMap, total: all.length, effective: st, status: clean.status, notes: clean.notes, maturity: clean.maturity, soaMarks: clean.soa, soaNotes: clean.soaNotes };
}

// Search areas by id, title or summary in both languages.
export function searchAreas(b, query, opts = {}) {
  const q = String(query || '').trim();
  if (!q) return [];
  const nq = q.toLowerCase();
  const fq = arabicFold(q);
  const limit = opts.limit || 50;
  const baseline = opts.baseline || null;
  const out = [];
  for (const a of b.corf.areas) {
    if (baseline && a.baseline !== baseline) continue;
    const hay = [a.ref, a.id, a.title_en, a.summary_en].filter(Boolean).join(' ').toLowerCase();
    const hayAr = arabicFold([a.title_ar, a.summary_ar].filter(Boolean).join(' '));
    if (hay.includes(nq) || hayAr.includes(fq)) out.push(a);
    if (out.length >= limit) break;
  }
  return out;
}

export function crosswalkOf(b, areaId) {
  const ix = indexBundle(b);
  const id = normalizeRef(areaId);
  const m = ix.crosswalk.get(id);
  if (!m) return null;
  return {
    area: id,
    iso: (m.iso || []).map((r) => ix.iso.get(r)).filter(Boolean),
    pci: (m.pci || []).map((r) => ix.pciGroup.get(r)).filter(Boolean),
    swift: (m.swift || []).map((r) => ix.swift.get(r)).filter(Boolean),
  };
}

// Reverse lookup: a framework reference -> the CORF areas mapped to it, plus what the other frameworks say about those areas (derived).
export function reverseLookup(b, framework, ref) {
  const ix = indexBundle(b);
  if (!FRAMEWORKS.includes(framework)) return null;
  const key = String(ref || '').trim();
  const areaIds = ix.reverse[framework].get(key) || ix.reverse[framework].get(key.toUpperCase()) || [];
  const areas = areaIds.map((id) => ix.areas.get(id)).filter(Boolean);
  const derived = { iso: new Set(), pci: new Set(), swift: new Set() };
  for (const id of areaIds) {
    const m = ix.crosswalk.get(id) || {};
    for (const f of FRAMEWORKS) if (f !== framework) for (const r of m[f] || []) derived[f].add(r);
  }
  return {
    framework, ref: key, areas,
    derived: {
      iso: [...derived.iso].sort(),
      pci: [...derived.pci].sort((x, y) => x.localeCompare(y, undefined, { numeric: true })),
      swift: [...derived.swift].sort((x, y) => x.localeCompare(y, undefined, { numeric: true })),
    },
  };
}

export function referenceLabel(b, framework, ref) {
  const ix = indexBundle(b);
  if (framework === 'iso') return ix.iso.get(ref) || null;
  if (framework === 'pci') return ix.pciGroup.get(ref) || ix.pciReq.get(ref) || null;
  if (framework === 'swift') return ix.swift.get(ref) || null;
  return null;
}
