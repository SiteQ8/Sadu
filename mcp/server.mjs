#!/usr/bin/env node
// MCP server (stdio, newline-delimited JSON-RPC 2.0) for the CBK Cyber and Operational Resilience Framework register.
// No dependencies. Every tool is read-only and works offline from the bundled data.
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import * as core from '../docs/assets/core.js';

const bundle = JSON.parse(readFileSync(new URL('../docs/data/bundle.json', import.meta.url), 'utf8'));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const idx = core.indexBundle(bundle);
const SUPPORTED = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const CORF_URL = (bundle.sources.sources.find((s) => s.id === 'corf') || {}).url || '';

const LANG = { type: 'string', enum: ['en', 'ar'], default: 'en', description: 'Language for titles and summaries: en or ar.' };
const FORMAT = { type: 'string', enum: ['markdown', 'json'], default: 'markdown', description: 'markdown for reading, json for further processing.' };
const LIMIT = { type: 'integer', minimum: 1, maximum: 200, default: 25, description: 'Maximum items to return.' };
const OFFSET = { type: 'integer', minimum: 0, default: 0, description: 'Items to skip, for paging.' };
const BASELINE = { type: 'string', enum: ['crb', 'orb', 'tprm'], description: 'Baseline: crb (Cyber Resilience), orb (Operational Resilience) or tprm (Third-Party Risk Management).' };
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const tools = [
  { name: 'corf_overview', title: 'CORF overview', description: 'Summary of the CBK Cyber and Operational Resilience Framework v1.0: the three baselines, counts of domains, sub-domains, control areas and controls, the crosswalk targets and the official source. Start here.', inputSchema: { type: 'object', properties: { lang: LANG, response_format: FORMAT }, additionalProperties: false }, annotations: RO },
  { name: 'corf_list_baselines', title: 'List baselines', description: 'The three CORF baselines with their ids, titles and counts of domains, sub-domains, areas and controls.', inputSchema: { type: 'object', properties: { lang: LANG, response_format: FORMAT }, additionalProperties: false }, annotations: RO },
  { name: 'corf_list_domains', title: 'List domains', description: 'The 27 CORF domains with their baseline, reference number, title and counts. Optionally limited to one baseline.', inputSchema: { type: 'object', properties: { baseline: BASELINE, lang: LANG, response_format: FORMAT }, additionalProperties: false }, annotations: RO },
  { name: 'corf_list_subdomains', title: 'List sub-domains', description: 'The 93 CORF sub-domains with their domain, title, official page and counts of areas and controls. Optionally limited to one baseline or one domain id such as "crb:5".', inputSchema: { type: 'object', properties: { baseline: BASELINE, domain: { type: 'string', description: 'Domain id such as "crb:5" or "tprm:9".' }, lang: LANG, response_format: FORMAT }, additionalProperties: false }, annotations: RO },
  { name: 'corf_list_areas', title: 'List control areas', description: 'Control areas with their own-words summary and control counts. Limit to a baseline, a domain id ("orb:6") or a sub-domain id ("crb:5.6"). Paged.', inputSchema: { type: 'object', properties: { baseline: BASELINE, domain: { type: 'string' }, subdomain: { type: 'string' }, limit: LIMIT, offset: OFFSET, lang: LANG, response_format: FORMAT }, additionalProperties: false }, annotations: RO },
  { name: 'corf_get_area', title: 'Get one control area', description: 'One control area by id ("crb:5.6.1", "5.6.1" defaults to crb, "tprm 10.1.1"): its own-words summary, sub-domain and domain, the ids and official pages of its controls, and its ISO 27001, PCI DSS and SWIFT CSCF references. The official text is at the page given.', inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Area id such as "crb:5.6.1".' }, lang: LANG, response_format: FORMAT }, required: ['id'], additionalProperties: false }, annotations: RO },
  { name: 'corf_search', title: 'Search the register', description: 'Search control areas by id, title or summary in English or Arabic. Optionally limited to one baseline. Paged.', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Words to find in English or Arabic.' }, baseline: BASELINE, limit: LIMIT, offset: OFFSET, lang: LANG, response_format: FORMAT }, required: ['query'], additionalProperties: false }, annotations: RO },
  { name: 'corf_crosswalk', title: 'Crosswalk from a CORF area', description: 'The ISO 27001 Annex A controls, PCI DSS v4.0.1 requirement groups and SWIFT CSCF v2026 controls woven to one CORF control area. The mapping is this project\'s analysis, not an official mapping.', inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Area id such as "crb:5.6.1".' }, lang: LANG, response_format: FORMAT }, required: ['id'], additionalProperties: false }, annotations: RO },
  { name: 'corf_reverse_crosswalk', title: 'Reverse crosswalk', description: 'Start from an ISO 27001 control ("A.5.19"), a PCI DSS requirement group ("8.4") or a SWIFT CSCF control ("2.9") and get the CORF areas mapped to it, plus what the other two frameworks say about those areas (derived through the CORF hub).', inputSchema: { type: 'object', properties: { framework: { type: 'string', enum: ['iso', 'pci', 'swift'] }, ref: { type: 'string', description: 'Reference id in that framework.' }, lang: LANG, response_format: FORMAT }, required: ['framework', 'ref'], additionalProperties: false }, annotations: RO },
  { name: 'corf_list_framework', title: 'List a reference framework', description: 'The full list of ISO 27001:2022 Annex A controls (93), PCI DSS v4.0.1 requirements and groups (12 and 63) or SWIFT CSCF v2026 controls (32, with mandatory or advisory status), each with the number of CORF areas mapped to it.', inputSchema: { type: 'object', properties: { framework: { type: 'string', enum: ['iso', 'pci', 'swift'] }, lang: LANG, response_format: FORMAT }, required: ['framework'], additionalProperties: false }, annotations: RO },
  { name: 'corf_readiness_report', title: 'Readiness report', description: 'Score an assessment exported from the Sadu web app (schema "sadu/1": status per control, maturity 1 to 5 per sub-domain, applicability per sub-domain, notes). Returns overall and per baseline readiness, maturity averages, applicability counts and the largest gaps. Unknown ids and invalid values are ignored.', inputSchema: { type: 'object', properties: { assessment: { type: 'object', description: 'The exported assessment object.' }, limit: LIMIT, offset: OFFSET, lang: LANG, response_format: FORMAT }, required: ['assessment'], additionalProperties: false }, annotations: RO },
  { name: 'corf_sources', title: 'Sources and provenance', description: 'The official sources used, what each was used for, and the provenance note including the count discrepancy in the CBK document.', inputSchema: { type: 'object', properties: { lang: LANG, response_format: FORMAT }, additionalProperties: false }, annotations: RO },
];

class ToolError extends Error {}
const pickLang = (a) => (a && a.lang === 'ar' ? 'ar' : 'en');
const T = (o, lang) => (lang === 'ar' ? o.title_ar : o.title_en);
const S = (o, lang) => (lang === 'ar' ? o.summary_ar : o.summary_en);
const N = (o, lang) => (lang === 'ar' ? o.ar : o.en);
const page = (n) => `CORF v1.0 page ${n}`;

function result(obj, markdown, args) {
  const text = args.response_format === 'json' ? JSON.stringify(obj, null, 2) : markdown;
  return { content: [{ type: 'text', text }], structuredContent: obj };
}
function paged(items, args) {
  const limit = Math.min(200, Math.max(1, Number(args.limit) || 25));
  const offset = Math.max(0, Number(args.offset) || 0);
  return { total: items.length, limit, offset, items: items.slice(offset, offset + limit) };
}
function areaRow(a, lang) {
  return { id: a.id, ref: a.ref, baseline: a.baseline, subdomain: a.subdomain, title: T(a, lang), summary: S(a, lang), controls: a.controls.length, page: a.page };
}
function findArea(id) {
  const a = idx.areas.get(core.normalizeRef(id));
  if (!a) throw new ToolError(`No control area with id "${id}". Use ids like "crb:5.6.1", "orb:6.5.2" or "tprm:9.1.1".`);
  return a;
}
function subCount(s) { return { areas: (idx.areasBySub.get(s.id) || []).length, controls: core.controlsOfSub(bundle, s.id).length }; }
function domCount(d) { const subs = idx.subsByDomain.get(d.id) || []; return { subdomains: subs.length, areas: subs.reduce((n, s) => n + (idx.areasBySub.get(s.id) || []).length, 0), controls: core.controlsOfDomain(bundle, d.id).length }; }
function refLabel(f, r, lang) { const o = core.referenceLabel(bundle, f, r); return o ? `${r} ${N(o, lang)}` : r; }

const handlers = {
  corf_overview(args) {
    const lang = pickLang(args);
    const baselines = bundle.corf.baselines.map((b) => ({ id: b.id, title: T(b, lang), domains: (idx.domainsByBaseline.get(b.id) || []).length, subdomains: bundle.corf.subdomains.filter((s) => s.baseline === b.id).length, areas: bundle.corf.areas.filter((a) => a.baseline === b.id).length, controls: core.controlsOfBaseline(bundle, b.id).length }));
    const out = { framework: 'CBK Cyber and Operational Resilience Framework v1.0 (3 December 2025)', counts: bundle.counts, baselines, crosswalk_targets: [bundle.iso.version_en, bundle.pci.version_en, bundle.swift.version_en], source: CORF_URL, note: bundle.crosswalk[`note_${lang}`] };
    const md = [`# CORF v1.0 overview`, '', `${bundle.counts.baselines} baselines, ${bundle.counts.domains} domains, ${bundle.counts.subdomains} sub-domains, ${bundle.counts.areas} control areas, ${bundle.counts.controls} controls.`, '', '| Baseline | Domains | Sub-domains | Areas | Controls |', '|---|---|---|---|---|', ...baselines.map((b) => `| ${b.id} ${b.title} | ${b.domains} | ${b.subdomains} | ${b.areas} | ${b.controls} |`), '', `Crosswalk targets: ${out.crosswalk_targets.join(', ')}.`, `Source: ${CORF_URL}`, '', out.note].join('\n');
    return result(out, md, args);
  },
  corf_list_baselines(args) {
    const lang = pickLang(args);
    const baselines = bundle.corf.baselines.map((b) => ({ id: b.id, title: T(b, lang), domains: (idx.domainsByBaseline.get(b.id) || []).length, subdomains: bundle.corf.subdomains.filter((s) => s.baseline === b.id).length, areas: bundle.corf.areas.filter((a) => a.baseline === b.id).length, controls: core.controlsOfBaseline(bundle, b.id).length }));
    const md = ['# Baselines', '', ...baselines.map((b) => `- **${b.id}** ${b.title}: ${b.domains} domains, ${b.subdomains} sub-domains, ${b.areas} areas, ${b.controls} controls`)].join('\n');
    return result({ baselines }, md, args);
  },
  corf_list_domains(args) {
    const lang = pickLang(args);
    const domains = bundle.corf.domains.filter((d) => !args.baseline || d.baseline === args.baseline).map((d) => ({ id: d.id, baseline: d.baseline, ref: d.ref, title: T(d, lang), ...domCount(d) }));
    const md = ['# Domains', '', '| Id | Title | Sub-domains | Areas | Controls |', '|---|---|---|---|---|', ...domains.map((d) => `| ${d.id} | ${d.title} | ${d.subdomains} | ${d.areas} | ${d.controls} |`)].join('\n');
    return result({ domains }, md, args);
  },
  corf_list_subdomains(args) {
    const lang = pickLang(args);
    const dom = args.domain ? core.normalizeRef(args.domain) : null;
    const subdomains = bundle.corf.subdomains.filter((s) => (!args.baseline || s.baseline === args.baseline) && (!dom || s.domain === dom)).map((s) => ({ id: s.id, baseline: s.baseline, domain: s.domain, ref: s.ref, title: T(s, lang), page: s.page, ...subCount(s) }));
    const md = ['# Sub-domains', '', '| Id | Title | Areas | Controls | Page |', '|---|---|---|---|---|', ...subdomains.map((s) => `| ${s.id} | ${s.title} | ${s.areas} | ${s.controls} | ${s.page} |`)].join('\n');
    return result({ subdomains }, md, args);
  },
  corf_list_areas(args) {
    const lang = pickLang(args);
    const dom = args.domain ? core.normalizeRef(args.domain) : null;
    const sub = args.subdomain ? core.normalizeRef(args.subdomain) : null;
    const items = bundle.corf.areas.filter((a) => (!args.baseline || a.baseline === args.baseline) && (!sub || a.subdomain === sub) && (!dom || (idx.subdomains.get(a.subdomain) || {}).domain === dom)).map((a) => areaRow(a, lang));
    const p = paged(items, args);
    const md = [`# Control areas (${p.offset + 1} to ${Math.min(p.total, p.offset + p.limit)} of ${p.total})`, '', ...p.items.map((a) => `- **${a.id}** ${a.title} (${a.controls} controls, ${page(a.page)}): ${a.summary}`)].join('\n');
    return result(p, md, args);
  },
  corf_get_area(args) {
    const lang = pickLang(args);
    const a = findArea(args.id);
    const s = idx.subdomains.get(a.subdomain);
    const d = idx.domains.get(s.domain);
    const b = idx.baselines.get(a.baseline);
    const cw = core.crosswalkOf(bundle, a.id);
    const out = { ...areaRow(a, lang), subdomain_title: T(s, lang), domain: d.id, domain_title: T(d, lang), baseline_title: T(b, lang), control_ids: a.controls.map((c) => ({ id: `${a.baseline}:${c.id}`, page: c.page })), crosswalk: { iso: cw.iso.map((x) => ({ id: x.id, title: N(x, lang) })), pci: cw.pci.map((x) => ({ id: x.id, title: N(x, lang) })), swift: cw.swift.map((x) => ({ id: x.id, title: N(x, lang), mandatory: x.mandatory })) }, source: CORF_URL };
    const md = [`# ${a.id} ${out.title}`, '', `${out.baseline_title} > ${d.id} ${out.domain_title} > ${s.id} ${out.subdomain_title}`, '', out.summary, '', `Controls (${a.controls.length}): ${a.controls.map((c) => `${a.baseline}:${c.id} (p.${c.page})`).join(', ')}`, '', `ISO 27001: ${out.crosswalk.iso.map((x) => `${x.id} ${x.title}`).join('; ') || 'none'}`, `PCI DSS: ${out.crosswalk.pci.map((x) => `${x.id} ${x.title}`).join('; ') || 'none'}`, `SWIFT CSCF: ${out.crosswalk.swift.map((x) => `${x.id} ${x.title}${x.mandatory ? '' : ' (advisory)'}`).join('; ') || 'none'}`, '', `Official text: ${page(a.page)} of ${CORF_URL}`].join('\n');
    return result(out, md, args);
  },
  corf_search(args) {
    const lang = pickLang(args);
    const hits = core.searchAreas(bundle, args.query, { limit: 500, baseline: args.baseline || null }).map((a) => areaRow(a, lang));
    const p = paged(hits, args);
    const md = p.total ? [`# ${p.total} area(s) match "${args.query}"`, '', ...p.items.map((a) => `- **${a.id}** ${a.title}: ${a.summary}`)].join('\n') : `No control area matches "${args.query}".`;
    return result({ query: args.query, ...p }, md, args);
  },
  corf_crosswalk(args) {
    const lang = pickLang(args);
    const a = findArea(args.id);
    const cw = core.crosswalkOf(bundle, a.id);
    const out = { area: a.id, title: T(a, lang), iso: cw.iso.map((x) => ({ id: x.id, title: N(x, lang) })), pci: cw.pci.map((x) => ({ id: x.id, requirement: x.req, title: N(x, lang) })), swift: cw.swift.map((x) => ({ id: x.id, title: N(x, lang), mandatory: x.mandatory })), note: bundle.crosswalk[`note_${lang}`] };
    const md = [`# Crosswalk for ${a.id} ${out.title}`, '', `- ISO 27001: ${out.iso.map((x) => `${x.id} ${x.title}`).join('; ') || 'none'}`, `- PCI DSS: ${out.pci.map((x) => `${x.id} ${x.title}`).join('; ') || 'none'}`, `- SWIFT CSCF: ${out.swift.map((x) => `${x.id} ${x.title}${x.mandatory ? '' : ' (advisory)'}`).join('; ') || 'none'}`, '', out.note].join('\n');
    return result(out, md, args);
  },
  corf_reverse_crosswalk(args) {
    const lang = pickLang(args);
    const r = core.reverseLookup(bundle, args.framework, args.ref);
    if (!r) throw new ToolError('framework must be iso, pci or swift.');
    const label = core.referenceLabel(bundle, args.framework, r.ref);
    if (!label) throw new ToolError(`Unknown ${args.framework} reference "${args.ref}".`);
    const out = { framework: args.framework, ref: r.ref, title: N(label, lang), areas: r.areas.map((a) => areaRow(a, lang)), derived: Object.fromEntries(core.FRAMEWORKS.filter((f) => f !== args.framework).map((f) => [f, r.derived[f].map((x) => ({ id: x, title: N(core.referenceLabel(bundle, f, x) || { en: '', ar: '' }, lang) }))])), note: bundle.crosswalk[`note_${lang}`] };
    const md = [`# ${args.framework.toUpperCase()} ${r.ref} ${out.title}`, '', `CORF areas (${out.areas.length}): ${out.areas.map((a) => `${a.id} ${a.title}`).join('; ') || 'none'}`, '', ...Object.entries(out.derived).map(([f, list]) => `Derived ${f.toUpperCase()}: ${list.map((x) => `${x.id} ${x.title}`).join('; ') || 'none'}`), '', out.note].join('\n');
    return result(out, md, args);
  },
  corf_list_framework(args) {
    const lang = pickLang(args);
    const f = args.framework;
    const mapped = (r) => (idx.reverse[f].get(r) || []).length;
    let out, md;
    if (f === 'iso') {
      out = { framework: bundle.iso.version_en, themes: bundle.iso.themes.map((t) => ({ id: t.id, title: N(t, lang) })), items: bundle.iso.controls.map((c) => ({ id: c.id, theme: c.theme, title: N(c, lang), corf_areas: mapped(c.id) })) };
      md = ['# ' + out.framework, '', '| Id | Control | CORF areas |', '|---|---|---|', ...out.items.map((c) => `| ${c.id} | ${c.title} | ${c.corf_areas} |`)].join('\n');
    } else if (f === 'pci') {
      out = { framework: bundle.pci.version_en, requirements: bundle.pci.requirements.map((r) => ({ id: r.id, title: N(r, lang) })), items: bundle.pci.groups.map((g) => ({ id: g.id, requirement: g.req, title: N(g, lang), corf_areas: mapped(g.id) })) };
      md = ['# ' + out.framework, '', ...out.requirements.map((r) => `- Requirement ${r.id}: ${r.title}`), '', '| Group | Title | CORF areas |', '|---|---|---|', ...out.items.map((g) => `| ${g.id} | ${g.title} | ${g.corf_areas} |`)].join('\n');
    } else if (f === 'swift') {
      out = { framework: bundle.swift.version_en, note: bundle.swift[`note_${lang}`], objectives: bundle.swift.objectives.map((o) => ({ id: o.id, title: N(o, lang) })), principles: bundle.swift.principles.map((p) => ({ id: p.id, objective: p.objective, title: N(p, lang) })), items: bundle.swift.controls.map((c) => ({ id: c.id, principle: c.principle, title: N(c, lang), mandatory: c.mandatory, description: lang === 'ar' ? c.desc_ar : c.desc_en, corf_areas: mapped(c.id) })) };
      md = ['# ' + out.framework, '', out.note, '', '| Id | Control | Status | CORF areas |', '|---|---|---|---|', ...out.items.map((c) => `| ${c.id} | ${c.title} | ${c.mandatory ? 'mandatory' : 'advisory'} | ${c.corf_areas} |`)].join('\n');
    } else throw new ToolError('framework must be iso, pci or swift.');
    return result(out, md, args);
  },
  corf_readiness_report(args) {
    const lang = pickLang(args);
    if (!args.assessment || typeof args.assessment !== 'object') throw new ToolError('assessment must be the object exported from the Sadu web app.');
    const ev = core.evaluate(bundle, args.assessment);
    const gaps = paged(ev.gaps.map((a) => ({ id: a.id, title: T(a, lang), not_implemented: a.counts.not_implemented, partial: a.counts.partial, total: a.total })), args);
    const out = { schema: ev.schema, overall: { readiness: ev.overall.readiness, band: ev.overall.band, maturity: ev.overall.maturity, assessed: ev.overall.assessed, total: ev.total, counts: ev.overall.counts }, baselines: ev.baselines.map((b) => ({ id: b.id, title: T(b, lang), readiness: b.readiness, band: b.band, maturity: b.maturity, assessed: b.assessed, total: b.total })), domains: ev.domains.map((d) => ({ id: d.id, title: T(d, lang), readiness: d.readiness, band: d.band, maturity: d.maturity, assessed: d.assessed, total: d.total })), applicability: ev.soa, gaps };
    const md = ['# Readiness report', '', `Overall: ${out.overall.readiness == null ? 'not assessed' : out.overall.readiness + '% (' + out.overall.band + ')'}; ${out.overall.assessed} of ${out.overall.total} controls assessed; average maturity ${out.overall.maturity ?? 'not rated'}.`, `Applicability: ${ev.soa.applicable} applicable, ${ev.soa.not_applicable} not applicable, ${ev.soa.unset} unmarked sub-domains.`, '', '| Baseline | Readiness | Band | Maturity | Assessed |', '|---|---|---|---|---|', ...out.baselines.map((b) => `| ${b.id} ${b.title} | ${b.readiness == null ? '-' : b.readiness + '%'} | ${b.band || '-'} | ${b.maturity ?? '-'} | ${b.assessed}/${b.total} |`), '', `## Largest gaps (${gaps.total} areas with open controls)`, ...gaps.items.map((g) => `- ${g.id} ${g.title}: ${g.not_implemented} not implemented, ${g.partial} partial of ${g.total}`)].join('\n');
    return result(out, md, args);
  },
  corf_sources(args) {
    const lang = pickLang(args);
    const items = bundle.sources.sources.map((s) => ({ id: s.id, name: N(s, lang), url: s.url, use: N(s.use, lang) }));
    const md = ['# Sources', '', ...items.map((s) => `- **${s.name}**: ${s.use}. ${s.url}`), '', N(bundle.sources.note, lang)].join('\n');
    return result({ note: N(bundle.sources.note, lang), sources: items }, md, args);
  },
};

function send(msg) { process.stdout.write(`${JSON.stringify(msg)}\n`); }
const reply = (id, res) => send({ jsonrpc: '2.0', id, result: res });
const fail = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

function handle(msg) {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    if (msg && msg.id !== undefined && msg.id !== null) fail(msg.id, -32600, 'Invalid request');
    return;
  }
  const { id, method, params } = msg;
  if (id === undefined || id === null) return; // notifications need no reply
  switch (method) {
    case 'initialize': {
      const asked = params?.protocolVersion;
      reply(id, {
        protocolVersion: SUPPORTED.includes(asked) ? asked : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: pkg.name, title: `${bundle.project.name_en} MCP server`, version: pkg.version },
        instructions: 'Read-only tools for the Central Bank of Kuwait Cyber and Operational Resilience Framework v1.0: three baselines, 27 domains, 93 sub-domains and 199 control areas with own-words summaries, the ids and official pages of all 875 controls, a crosswalk to ISO 27001:2022, PCI DSS v4.0.1 and SWIFT CSCF v2026 in either direction, and readiness reports for assessments saved by the web app. Summaries and mappings are this project\'s own work; cite the official page returned with each area.',
      });
      return;
    }
    case 'ping': reply(id, {}); return;
    case 'tools/list': reply(id, { tools }); return;
    case 'tools/call': {
      const h = handlers[params?.name];
      if (!h) { fail(id, -32602, `Unknown tool: ${params?.name}`); return; }
      try {
        reply(id, h(params.arguments || {}));
      } catch (e) {
        const text = e instanceof ToolError ? e.message : 'The tool failed on this input. Check the arguments against the tool schema.';
        if (!(e instanceof ToolError)) process.stderr.write(`tool ${params.name} failed: ${e.stack}\n`);
        reply(id, { isError: true, content: [{ type: 'text', text }] });
      }
      return;
    }
    default: fail(id, -32601, `Method not found: ${method}`);
  }
}

// --selftest drives every tool in-process and checks the shapes, without a client.
if (process.argv.includes('--selftest')) {
  let pass = 0, failn = 0;
  const ok = (cond, label) => { if (cond) { pass += 1; } else { failn += 1; console.error('FAIL: ' + label); } };
  ok(tools.length === 12, 'twelve tools');
  const call = (name, argsObj = {}) => handlers[name](argsObj);
  try {
    ok(call('corf_overview', {}).structuredContent.counts.controls === 875, 'overview counts 875');
    ok(call('corf_list_baselines', {}).structuredContent.baselines.length === 3, 'three baselines');
    ok(call('corf_list_domains', {}).structuredContent.domains.length === 27, '27 domains');
    ok(call('corf_list_domains', { baseline: 'tprm' }).structuredContent.domains.length === 13, '13 tprm domains');
    ok(call('corf_list_subdomains', {}).structuredContent.subdomains.length === 93, '93 subdomains');
    ok(call('corf_list_subdomains', { domain: 'crb:5' }).structuredContent.subdomains.length === 16, '16 subdomains in crb:5');
    ok(call('corf_list_areas', { subdomain: 'crb:5.6' }).structuredContent.total === 3, '3 areas in crb:5.6');
    ok(call('corf_list_areas', { limit: 200 }).structuredContent.total === 199, '199 areas');
    const ga = call('corf_get_area', { id: '5.6.1' }).structuredContent;
    ok(ga.id === 'crb:5.6.1' && ga.control_ids.length === 17 && ga.summary.length > 0, 'get area 5.6.1 defaults to crb with 17 controls');
    ok(call('corf_get_area', { id: 'tprm 10.1.1', lang: 'ar' }).structuredContent.title.length > 0, 'get area tprm 10.1.1 in Arabic');
    ok(call('corf_search', { query: 'phishing' }).structuredContent.total === 2, 'search phishing = 2');
    ok(call('corf_search', { query: 'التشفير', lang: 'ar' }).structuredContent.total === 8, 'search التشفير = 8');
    ok(call('corf_crosswalk', { id: 'crb:5.7.1' }).structuredContent.iso.some((x) => x.id === 'A.8.24'), 'crosswalk 5.7.1 -> A.8.24');
    const rv = call('corf_reverse_crosswalk', { framework: 'iso', ref: 'A.5.19' }).structuredContent;
    ok(rv.areas.length === 18 && rv.derived.swift.some((x) => x.id === '2.8'), 'reverse A.5.19 -> 18 areas, derived swift 2.8');
    ok(call('corf_reverse_crosswalk', { framework: 'swift', ref: '4.2' }).structuredContent.areas.length === 3, 'reverse swift 4.2 -> 3 areas');
    ok(call('corf_list_framework', { framework: 'iso' }).structuredContent.items.length === 93, 'iso 93');
    ok(call('corf_list_framework', { framework: 'pci' }).structuredContent.items.length === 63, 'pci 63');
    const sw = call('corf_list_framework', { framework: 'swift' }).structuredContent.items;
    ok(sw.length === 32 && sw.filter((c) => c.mandatory).length === 26, 'swift 32 with 26 mandatory');
    ok(call('corf_sources', {}).structuredContent.sources.length === 5, 'five sources');
    const a = { schema: core.SCHEMA, status: { 'crb:4.1.1.1': 'implemented', 'crb:4.1.1.2': 'partial', 'crb:4.1.1.3': 'not_implemented', 'crb:4.1.1.4': 'not_applicable', 'nope': 'implemented' }, maturity: { 'crb:4.1': 3, 'crb:4.2': 9 }, soa: { 'crb:4.1': 'applicable', 'orb:3.1': 'not_applicable' } };
    const rep = call('corf_readiness_report', { assessment: a }).structuredContent;
    ok(rep.overall.readiness === 50, 'readiness 50');
    ok(rep.overall.maturity === 3, 'invalid maturity dropped, average 3');
    ok(rep.applicability.applicable === 1 && rep.applicability.not_applicable === 1, 'applicability counted');
    ok(rep.gaps.total === 1 && rep.gaps.items[0].id === 'crb:4.1.1', 'one gap area');
    let threw = false; try { call('corf_get_area', { id: 'crb:99.9.9' }); } catch (e) { threw = e instanceof ToolError; } ok(threw, 'unknown area throws ToolError');
  } catch (e) { failn += 1; console.error('THREW: ' + e.stack); }
  console.log(`selftest: ${pass} passed, ${failn} failed`);
  process.exit(failn ? 1 : 0);
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (text) => {
  if (!text.trim()) return;
  let msg;
  try { msg = JSON.parse(text); } catch { fail(null, -32700, 'Parse error'); return; }
  if (Array.isArray(msg)) { for (const m of msg) handle(m); return; }
  handle(msg);
});
rl.on('close', () => process.exit(0));
