// Sadu web app. Renders the CORF register and the surrounding tabs from bundle.json.
// All state lives in the browser; nothing is sent anywhere.
import * as core from './core.js';

const LS_KEY = 'sadu:v1';
const LANG_KEY = 'sadu:lang';
const THEME_KEY = 'sadu:theme';

const html = document.documentElement;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICON_MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const ICON_SUN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/></svg>';

let BUNDLE = null;
let IX = null;
let EV = null;
const state = {
  lang: 'ar',
  theme: null,
  tab: 'register',
  a: core.emptyAssessment(),
  baseline: 'crb',
  filter: 'all',
  q: '',
  notesOpen: new Set(),
  cw: { framework: 'iso', ref: 'A.5.19', baseline: 'crb' },
  fw: 'iso',
};

/* ---------- persistence ---------- */
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) state.a = { ...core.emptyAssessment(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  try { const l = localStorage.getItem(LANG_KEY); if (l === 'ar' || l === 'en') state.lang = l; } catch { /* ignore */ }
  try { const th = localStorage.getItem(THEME_KEY); if (th === 'light' || th === 'dark') state.theme = th; } catch { /* ignore */ }
}
function persisted() {
  const { status, notes, maturity, soa, soaNotes } = state.a;
  return { schema: core.SCHEMA, status, notes, maturity, soa, soaNotes };
}
function saveAssessment() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(persisted())); } catch { /* ignore */ }
}
function reevaluate() { EV = core.evaluate(BUNDLE, state.a); }

/* ---------- i18n ---------- */
function t(key, vars) {
  const row = BUNDLE.ui[key];
  let s = row ? (row[state.lang] ?? row.en) : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}
const other = () => (state.lang === 'ar' ? 'en' : 'ar');
const T = (o) => (state.lang === 'ar' ? o.title_ar : o.title_en) || o.title_en;
const N = (o) => (state.lang === 'ar' ? o.ar : o.en) || o.en;
const S = (o) => (state.lang === 'ar' ? o.summary_ar : o.summary_en);
const D = (o) => (state.lang === 'ar' ? o.desc_ar : o.desc_en);
const short = (b) => { const x = IX.baselines.get(b.id) || b; return (state.lang === 'ar' ? x.short_ar : x.short_en) || x.title_en; };
const pct = (v) => (v == null ? '-' : v + '%');
const narrow = () => window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
const bandLabel = (id) => (id ? t('band.' + id) : '');

function effectiveDark() {
  if (state.theme === 'dark') return true;
  if (state.theme === 'light') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function applyTheme() {
  if (state.theme) html.setAttribute('data-theme', state.theme); else html.removeAttribute('data-theme');
  const btn = $('#theme-toggle');
  const dark = effectiveDark();
  btn.innerHTML = dark ? ICON_SUN : ICON_MOON;
  btn.setAttribute('aria-label', dark ? t('theme.toLight') : t('theme.toDark'));
  btn.setAttribute('title', dark ? t('theme.toLight') : t('theme.toDark'));
}
function applyChrome() {
  html.setAttribute('lang', state.lang);
  html.setAttribute('dir', state.lang === 'ar' ? 'rtl' : 'ltr');
  const p = BUNDLE.project;
  document.title = state.lang === 'ar'
    ? 'سدو | سجل عمل لإطار المرونة السيبرانية والتشغيلية الصادر عن بنك الكويت المركزي'
    : 'Sadu | A working register for the CBK Cyber and Operational Resilience Framework';
  $('#app-name').textContent = BUNDLE.ui['app.title'][state.lang];
  $('#alt-name').textContent = BUNDLE.ui['app.title'][other()];
  $('#alt-name').setAttribute('lang', other());
  $('#tagline').textContent = t('app.tagline');
  $('#source-line').textContent = t('mast.source');
  $('#skip').textContent = t('skip');
  const lang = $('#lang-toggle');
  lang.textContent = t('lang.switch');
  lang.setAttribute('lang', other());
  lang.setAttribute('aria-label', t('lang.switchLabel'));
  $('#tabs').setAttribute('aria-label', t('tabs.label'));
  $$('#tabs [role="tab"]').forEach((b) => { b.textContent = t('tab.' + b.dataset.tab); });
  $('#footer-license').textContent = t('footer.license');
  const code = $('#footer-code');
  code.textContent = t('about.code');
  code.href = `https://github.com/${p.owner}/${p.repo}`;
  code.setAttribute('target', '_blank'); code.setAttribute('rel', 'noopener');
  $('#footer-ver').textContent = t('footer.version', { v: p.version });
  applyTheme();
}

/* ---------- helpers ---------- */
const domainsOf = (bid) => IX.domainsByBaseline.get(bid) || [];
const subsOf = (domId) => IX.subsByDomain.get(domId) || [];
const areasOf = (subId) => IX.areasBySub.get(subId) || [];
const ctlId = (a, c) => `${a.baseline}:${c.id}`;
const statusOf = (id) => state.a.status[id] || '';
const excluded = (subId) => state.a.soa[subId] === 'not_applicable';
function matchesFilter(id) {
  const st = statusOf(id);
  switch (state.filter) {
    case 'implemented': return st === 'implemented';
    case 'partial': return st === 'partial';
    case 'gap': return st === 'not_implemented';
    case 'na': return st === 'not_applicable';
    case 'unset': return st === '';
    default: return true;
  }
}
function visibleAreas() {
  const q = state.q.trim();
  const hits = q ? new Set(core.searchAreas(BUNDLE, q, { limit: 1000, baseline: state.baseline }).map((a) => a.id)) : null;
  const out = new Set();
  for (const a of BUNDLE.corf.areas) {
    if (a.baseline !== state.baseline) continue;
    if (hits && !hits.has(a.id)) continue;
    if (state.filter !== 'all' && !a.controls.some((c) => matchesFilter(ctlId(a, c)))) continue;
    out.add(a.id);
  }
  return out;
}

/* ---------- register ---------- */
function bar(label, r, cls = '') {
  return `<div class="bar ${cls}"><span>${esc(label)}</span><div class="track" aria-hidden="true"><i data-w="${r.readiness || 0}"></i></div><span class="pv ${r.readiness == null ? 'na' : ''}">${pct(r.readiness)}</span></div>`;
}
// The fill spans its track and is clipped to the value, so a change is one GPU-side clip, never a layout pass.
function setWidths(root) {
  const rtl = html.getAttribute('dir') === 'rtl';
  $$('[data-w]', root).forEach((el) => {
    const rest = Math.max(0, 100 - Number(el.dataset.w));
    el.style.clipPath = rtl ? `inset(0 0 0 ${rest}% round 4px)` : `inset(0 ${rest}% 0 0 round 4px)`;
  });
}
function cell(label, value, extra = '', cls = '') {
  return `<div class="cell"><span class="k">${esc(label)}</span><span class="v ${cls}">${value}</span>${extra ? `<span class="sub">${esc(extra)}</span>` : ''}</div>`;
}
function renderSummary() {
  const o = EV.overall;
  const bl = EV.baselines.find((b) => b.id === state.baseline);
  const doms = EV.domains.filter((d) => d.baseline === state.baseline);
  const el = $('#summary');
  el.innerHTML =
    `<div class="ledger">`
    + `<div class="ledger-cells">`
    + cell(t('readiness.overall'), o.readiness == null ? esc(t('status.unset')) : o.readiness + '%', o.band ? bandLabel(o.band) : '', o.readiness == null ? 'na' : 'lead')
    + cell(t('readiness.maturityAvg'), o.maturity == null ? esc(t('maturity.unset')) : String(o.maturity), o.maturity == null ? '' : t('maturity.' + Math.round(o.maturity)), o.maturity == null ? 'na' : '')
    + cell(t('col.assessed'), `${o.assessed} / ${EV.total}`, t('register.controls'))
    + cell(t('tab.soa'), `${EV.soa.applicable} / ${EV.soa.not_applicable}`, `${t('soa.applicable')} / ${t('soa.notApplicable')}`)
    + `</div>`
    + (narrow() ? `<details class="ledger-more"><summary>${esc(t('readiness.byBaseline'))} · ${esc(t('readiness.byDomain'))}</summary>` : `<div class="ledger-more">`)
    + `<div class="bars baselines"><h3>${esc(t('readiness.byBaseline'))}</h3><div class="rows">` + EV.baselines.map((b) => bar(short(b), b, 'base' + (b.id === state.baseline ? '' : ' off'))).join('') + `</div></div>`
    + `<div class="bars domains"><h3>${esc(t('readiness.byDomain'))} · ${esc(bl ? short(bl) : '')}</h3><div class="rows">` + doms.map((d) => bar(`${d.ref} ${T(d)}`, d)).join('') + `</div></div>`
    + (narrow() ? `</details></div>` : `</div></div>`);
  setWidths(el);
  const mini = $('#mini');
  mini.innerHTML = `<div class="mini-bar track" aria-hidden="true"><i data-w="${o.readiness || 0}"></i></div><span class="mini-v">${o.readiness == null ? '-' : o.readiness + '%'}</span><span>${esc(bandLabel(o.band))}</span>`;
  setWidths(mini);
}
function renderIndex() {
  const vis = visibleAreas();
  const el = $('#dindex');
  el.innerHTML =
    `<div class="bswitch" role="group" aria-label="${esc(t('register.baseline'))}">`
    + BUNDLE.corf.baselines.map((b) => `<button type="button" data-act="baseline" data-b="${b.id}" aria-pressed="${b.id === state.baseline}" title="${esc(T(b))}">${esc(short(b))}</button>`).join('')
    + `</div><div class="dlist">`
    + domainsOf(state.baseline).map((d) => {
      const n = subsOf(d.id).flatMap((s) => areasOf(s.id)).filter((a) => vis.has(a.id)).length;
      return `<a href="#dom-${esc(d.id.replace(':', '-'))}" data-dom="${esc(d.id.replace(':', '-'))}"><span>${esc(d.ref)} ${esc(T(d))}</span><span class="cnt">${n}</span></a>`;
    }).join('') + `</div>`;
}
function statusButtons(id, disabled) {
  const st = statusOf(id);
  return `<div class="statuses" role="group" aria-label="${esc(id)}">`
    + core.STATUSES.map((s) => `<button type="button" class="st-btn" data-act="status" data-id="${esc(id)}" data-st="${s}" aria-pressed="${st === s}" ${disabled ? 'disabled' : ''}>${esc(t('status.' + s.replace('_', '')))}</button>`).join('')
    + `</div>`;
}
function controlRow(a, c, disabled) {
  const id = ctlId(a, c);
  const st = statusOf(id);
  const note = state.a.notes[id] || '';
  const open = state.notesOpen.has(id);
  return `<div class="ctrl ${st ? 's-' + st : ''}" data-ctrl="${esc(id)}">`
    + `<span class="ctrl-id">${esc(c.id)}</span><span class="ctrl-page">${esc(t('register.p', { p: c.page }))}</span>`
    + statusButtons(id, disabled)
    + `<button type="button" class="note-toggle ${note ? 'has' : ''}" data-act="note-toggle" data-id="${esc(id)}" aria-expanded="${open}">${esc(t('note.add'))}</button>`
    + (open ? `<div class="note-wrap"><textarea data-act="note" data-id="${esc(id)}" placeholder="${esc(t('note.placeholder'))}" aria-label="${esc(t('note.add'))} ${esc(id)}">${esc(note)}</textarea></div>` : '')
    + `</div>`;
}
function chips(areaId) {
  const cw = core.crosswalkOf(BUNDLE, areaId);
  if (!cw) return '';
  const mk = (list, cls, pre) => list.map((x) => `<span class="chip ${cls} ${x.mandatory === false ? 'adv' : ''}" title="${esc(N(x))}">${pre}${esc(x.id)}</span>`).join('');
  const out = mk(cw.iso, 'iso', 'ISO ') + mk(cw.pci, 'pci', 'PCI ') + mk(cw.swift, 'swift', 'SWIFT ');
  return out ? `<div class="chips">${out}</div>` : '';
}
function areaCard(a) {
  const disabled = excluded(a.subdomain);
  const ctrls = a.controls.filter((c) => state.filter === 'all' || matchesFilter(ctlId(a, c)));
  return `<article class="area" id="area-${esc(a.id.replace(':', '-'))}">`
    + `<div class="area-top"><span class="area-id">${esc(a.ref)}</span><span class="area-title">${esc(T(a))}</span><span class="area-page">${esc(t('register.page', { p: a.page }))}</span></div>`
    + `<p class="area-sum">${esc(S(a))}</p>`
    + chips(a.id)
    + `<div class="ctrls">${ctrls.map((c) => controlRow(a, c, disabled)).join('')}</div>`
    + `</article>`;
}
function subBlock(s, vis) {
  const areas = areasOf(s.id).filter((a) => vis.has(a.id));
  if (!areas.length) return '';
  const mat = state.a.maturity[s.id] || '';
  const soa = state.a.soa[s.id] || '';
  return `<div class="sub ${excluded(s.id) ? 'excluded' : ''}" id="sub-${esc(s.id.replace(':', '-'))}">`
    + `<div class="sub-head"><span class="scode">${esc(s.ref)}</span><h4>${esc(T(s))}</h4><span class="spage">${esc(t('register.page', { p: s.page }))}</span>`
    + `<div class="sub-tools">`
    + `<label>${esc(t('maturity.title'))}<select data-act="maturity" data-id="${esc(s.id)}" title="${esc(t('maturity.hint'))}"><option value="">${esc(t('maturity.unset'))}</option>${core.MATURITY.map((m) => `<option value="${m}" ${String(mat) === String(m) ? 'selected' : ''}>${m} ${esc(t('maturity.' + m))}</option>`).join('')}</select></label>`
    + `<div class="seg" role="group" aria-label="${esc(t('tab.soa'))}"><button type="button" class="seg-btn" data-act="soa" data-id="${esc(s.id)}" data-v="applicable" aria-pressed="${soa === 'applicable'}">${esc(t('soa.applicable'))}</button><button type="button" class="seg-btn" data-act="soa" data-id="${esc(s.id)}" data-v="not_applicable" aria-pressed="${soa === 'not_applicable'}">${esc(t('soa.notApplicable'))}</button></div>`
    + `</div></div>`
    + areas.map(areaCard).join('')
    + `</div>`;
}
function renderRows() {
  const vis = visibleAreas();
  const el = $('#rows');
  let out = '';
  for (const d of domainsOf(state.baseline)) {
    const subs = subsOf(d.id).map((s) => subBlock(s, vis)).filter(Boolean);
    if (!subs.length) continue;
    const n = subsOf(d.id).flatMap((s) => areasOf(s.id)).filter((a) => vis.has(a.id)).reduce((k, a) => k + a.controls.length, 0);
    out += `<section class="domain" id="dom-${esc(d.id.replace(':', '-'))}"><div class="domain-head"><span class="dcode">${esc(d.ref)}</span><h3>${esc(T(d))}</h3><span class="dmeta">${n} ${esc(t('register.controls'))}</span></div>${subs.join('')}</section>`;
  }
  el.innerHTML = out;
  const empty = $('#empty');
  empty.hidden = vis.size > 0;
  empty.textContent = t('empty.search');
}
function renderTools() {
  const filters = ['all', 'implemented', 'partial', 'gap', 'na', 'unset'];
  $('#rtools').innerHTML =
    `<div class="search"><label class="sr" for="q">${esc(t('search.label'))}</label><input id="q" type="search" value="${esc(state.q)}" placeholder="${esc(t('search.placeholder'))}" autocomplete="off"></div>`
    + `<div class="seg" role="group" aria-label="${esc(t('filter.all'))}">${filters.map((f) => `<button type="button" class="seg-btn" data-act="filter" data-filter="${f}" aria-pressed="${state.filter === f}">${esc(t('filter.' + f))}</button>`).join('')}</div>`
    + `<button type="button" class="btn" data-act="reset">${esc(t('action.reset'))}</button>`;
}
function renderRegister() {
  reevaluate();
  renderSummary();
  renderIndex();
  renderTools();
  renderRows();
}
// Cheap path after one status click: patch the row, then refresh the numbers.
function refreshControl(id) {
  const row = $(`[data-ctrl="${CSS.escape(id)}"]`);
  if (row) {
    const st = statusOf(id);
    row.className = 'ctrl ' + (st ? 's-' + st : '');
    $$('.st-btn', row).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.st === st)));
  }
  reevaluate();
  renderSummary();
  renderIndex();
}

/* ---------- statement of applicability ---------- */
function renderSoa() {
  reevaluate();
  const el = $('#panel-soa');
  el.innerHTML =
    `<div class="panel-head"><h2>${esc(t('soa.title'))}</h2><p>${esc(t('soa.intro'))}</p></div>`
    + `<p class="soa-count">${esc(t('soa.count', { a: EV.soa.applicable, n: EV.soa.not_applicable, t: BUNDLE.corf.subdomains.length }))}</p>`
    + BUNDLE.corf.baselines.map((b) => `<div class="soa-base"><h3>${esc(T(b))}</h3><div class="soa-grid">`
      + BUNDLE.corf.subdomains.filter((s) => s.baseline === b.id).map((s) => {
        const mark = state.a.soa[s.id] || '';
        const d = IX.domains.get(s.domain);
        const ev = EV.subMap.get(s.id);
        return `<div class="soa-item ${mark === 'not_applicable' ? 'excluded' : ''}"><span class="scode">${esc(s.ref)}</span><span class="stitle">${esc(T(s))}</span><span class="smeta">${esc(d.ref)} ${esc(T(d))} · ${ev.total} ${esc(t('register.controls'))}</span>`
          + `<div class="seg" role="group" aria-label="${esc(s.ref)}"><button type="button" class="seg-btn" data-act="soa" data-id="${esc(s.id)}" data-v="applicable" aria-pressed="${mark === 'applicable'}">${esc(t('soa.applicable'))}</button><button type="button" class="seg-btn" data-act="soa" data-id="${esc(s.id)}" data-v="not_applicable" aria-pressed="${mark === 'not_applicable'}">${esc(t('soa.notApplicable'))}</button></div>`
          + (mark === 'not_applicable' ? `<div class="soa-note"><textarea data-act="soa-note" data-id="${esc(s.id)}" placeholder="${esc(t('soa.justificationPlaceholder'))}" aria-label="${esc(t('soa.justification'))} ${esc(s.ref)}">${esc(state.a.soaNotes[s.id] || '')}</textarea></div>` : '')
          + `</div>`;
      }).join('') + `</div></div>`).join('');
}

/* ---------- crosswalk ---------- */
function refOptions(f) {
  if (f === 'iso') return BUNDLE.iso.controls.map((c) => ({ id: c.id, label: `${c.id} ${N(c)}` }));
  if (f === 'pci') return BUNDLE.pci.groups.map((g) => ({ id: g.id, label: `${g.id} ${N(g)}` }));
  return BUNDLE.swift.controls.map((c) => ({ id: c.id, label: `${c.id} ${N(c)}${c.mandatory ? '' : ' (' + t('fw.advisory') + ')'}` }));
}
function renderCrosswalk() {
  const f = state.cw.framework;
  const opts = refOptions(f);
  if (!opts.some((o) => o.id === state.cw.ref)) state.cw.ref = opts[0].id;
  const r = core.reverseLookup(BUNDLE, f, state.cw.ref);
  const label = core.referenceLabel(BUNDLE, f, state.cw.ref);
  const others = core.FRAMEWORKS.filter((x) => x !== f);
  $('#cw-shell').innerHTML =
    `<div class="panel-head"><h2>${esc(t('cw.title'))}</h2><p>${esc(t('cw.intro'))}</p></div>`
    + `<div class="card cw-result"><h3>${esc(t('cw.reverse'))}</h3><p class="muted">${esc(t('cw.reverseIntro'))}</p>`
    + `<div class="cw-tools"><div class="seg" role="group" aria-label="${esc(t('cw.reverse'))}">${core.FRAMEWORKS.map((x) => `<button type="button" class="seg-btn" data-act="cw-framework" data-f="${x}" aria-pressed="${f === x}">${esc(t('cw.' + x))}</button>`).join('')}</div>`
    + `<label class="sr" for="cw-ref">${esc(t('cw.pick'))}</label><select id="cw-ref" data-act="cw-ref">${opts.map((o) => `<option value="${esc(o.id)}" ${o.id === state.cw.ref ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>`
    + `<div><strong>${esc(t('cw.' + f))} ${esc(state.cw.ref)}</strong> ${esc(label ? N(label) : '')}</div>`
    + `<div class="areas">` + (r.areas.length ? r.areas.map((a) => `<a href="#area-${esc(a.id.replace(':', '-'))}" data-act="goto-area" data-id="${esc(a.id)}"><span class="ac">${esc(a.id)}</span> ${esc(T(a))}</a>`).join('') : `<span class="muted">${esc(t('cw.none'))}</span>`) + `</div>`
    + `<div class="cw-derived">` + others.map((x) => `<div><span class="dl">${esc(t('cw.' + x))} · ${esc(t('cw.derived'))}</span><div class="chips">${r.derived[x].length ? r.derived[x].map((id) => { const o = core.referenceLabel(BUNDLE, x, id); return `<span class="chip ${x}" title="${esc(o ? N(o) : '')}">${esc(id)}</span>`; }).join('') : `<span class="muted">${esc(t('cw.none'))}</span>`}</div></div>`).join('') + `</div>`
    + `</div>`
    + `<div class="cw-tools"><div class="bswitch seg" role="group" aria-label="${esc(t('register.baseline'))}">${BUNDLE.corf.baselines.map((b) => `<button type="button" class="seg-btn" data-act="cw-baseline" data-b="${b.id}" aria-pressed="${state.cw.baseline === b.id}">${esc(short(b))}</button>`).join('')}</div></div>`
    + `<div class="cw-head"><span>${esc(t('register.area'))}</span><span>${esc(t('cw.iso'))}</span><span>${esc(t('cw.pci'))}</span><span>${esc(t('cw.swift'))}</span></div>`;
  const col = (list, cls, lbl) => `<div class="cw-col"><div class="cl">${esc(lbl)}</div><div class="chips">${list.length ? list.map((x) => `<span class="chip ${cls} ${x.mandatory === false ? 'adv' : ''}" title="${esc(N(x))}">${esc(x.id)}</span>`).join('') : `<span class="muted">${esc(t('cw.none'))}</span>`}</div></div>`;
  $('#cw-list').innerHTML = BUNDLE.corf.areas.filter((a) => a.baseline === state.cw.baseline).map((a) => {
    const cw = core.crosswalkOf(BUNDLE, a.id);
    return `<div class="cw-row"><div class="cw-area"><span class="ac">${esc(a.ref)}</span><h4>${esc(T(a))}</h4></div>${col(cw.iso, 'iso', t('cw.iso'))}${col(cw.pci, 'pci', t('cw.pci'))}${col(cw.swift, 'swift', t('cw.swift'))}</div>`;
  }).join('');
}

/* ---------- references ---------- */
function renderFrameworks() {
  const f = state.fw;
  const mapped = (id) => (IX.reverse[f].get(id) || []).length;
  let body = '';
  if (f === 'iso') {
    body = BUNDLE.iso.themes.map((th) => `<div class="fw-group"><h3>${esc(th.id)} ${esc(N(th))}</h3><div class="fw-list cols">` + BUNDLE.iso.controls.filter((c) => c.theme === th.id).map((c) => `<div class="fw-item"><span class="fid">${esc(c.id)}</span><span class="ft">${esc(N(c))}</span><span class="fm">${esc(t('fw.mappedTo', { n: mapped(c.id) }))}</span></div>`).join('') + `</div></div>`).join('');
  } else if (f === 'pci') {
    body = BUNDLE.pci.requirements.map((r) => `<div class="fw-group"><h3>${esc(r.id)} · ${esc(N(r))}</h3><div class="fw-list">` + BUNDLE.pci.groups.filter((g) => g.req === r.id).map((g) => `<div class="fw-item"><span class="fid">${esc(g.id)}</span><span class="ft">${esc(N(g))}</span><span class="fm">${esc(t('fw.mappedTo', { n: mapped(g.id) }))}</span></div>`).join('') + `</div></div>`).join('');
  } else {
    body = `<p class="muted">${esc(N({ en: BUNDLE.swift.note_en, ar: BUNDLE.swift.note_ar }))}</p>` + BUNDLE.swift.principles.map((p) => { const o = BUNDLE.swift.objectives.find((x) => x.id === p.objective); return `<div class="fw-group"><h3>${esc(o.id)} ${esc(N(o))} · ${esc(p.id)} ${esc(N(p))}</h3><div class="fw-list">` + BUNDLE.swift.controls.filter((c) => c.principle === p.id).map((c) => `<div class="fw-item"><span class="fid">${esc(c.id)}</span><span class="ft">${esc(N(c))}</span><span class="tag ${c.mandatory ? 'mand' : 'adv'}">${esc(c.mandatory ? t('fw.mandatory') : t('fw.advisory'))}</span><span class="fm">${esc(t('fw.mappedTo', { n: mapped(c.id) }))}</span><span class="fd">${esc(D(c))}</span></div>`).join('') + `</div></div>`; }).join('');
  }
  const ver = { iso: BUNDLE.iso, pci: BUNDLE.pci, swift: BUNDLE.swift }[f];
  $('#panel-frameworks').innerHTML =
    `<div class="panel-head"><h2>${esc(t('fw.title'))}</h2><p>${esc(t('fw.intro'))}</p></div>`
    + `<div class="cw-tools"><div class="seg" role="group" aria-label="${esc(t('fw.title'))}">${core.FRAMEWORKS.map((x) => `<button type="button" class="seg-btn" data-act="fw" data-f="${x}" aria-pressed="${f === x}">${esc(t('cw.' + x))}</button>`).join('')}</div><span class="muted">${esc(state.lang === 'ar' ? ver.version_ar : ver.version_en)}</span></div>`
    + body;
}

/* ---------- report ---------- */
function renderReport() {
  reevaluate();
  const o = EV.overall;
  const dateStr = new Date().toLocaleDateString(state.lang === 'ar' ? 'ar-KW-u-nu-latn' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const rows = [];
  for (const b of EV.baselines) {
    rows.push(`<tr class="base"><td>${esc(T(b))}</td><td class="num">${pct(b.readiness)}</td><td>${esc(bandLabel(b.band))}</td><td class="num">${b.maturity ?? '-'}</td><td class="num">${b.assessed}/${b.total}</td><td class="num">${b.counts.not_implemented}</td></tr>`);
    for (const d of EV.domains.filter((x) => x.baseline === b.id)) rows.push(`<tr><td>${esc(d.ref)} ${esc(T(d))}</td><td class="num">${pct(d.readiness)}</td><td>${esc(bandLabel(d.band))}</td><td class="num">${d.maturity ?? '-'}</td><td class="num">${d.assessed}/${d.total}</td><td class="num">${d.counts.not_implemented}</td></tr>`);
  }
  $('#panel-report').innerHTML =
    `<div class="panel-head"><h2>${esc(t('report.title'))}</h2><p>${esc(t('report.intro'))}</p></div>`
    + `<div class="report-card">`
    + `<div class="report-actions"><button type="button" class="btn btn-primary" data-act="export">${esc(t('report.export'))}</button><button type="button" class="btn" data-act="import">${esc(t('report.import'))}</button><button type="button" class="btn" data-act="print">${esc(t('report.print'))}</button></div>`
    + `<p class="muted">${esc(t('report.generated', { d: dateStr }))}</p>`
    + `<div class="rep-grid">`
    + `<div class="rep-stat"><div class="n">${o.readiness == null ? '-' : o.readiness + '%'}</div><div class="k">${esc(t('readiness.overall'))} · ${esc(bandLabel(o.band))}</div></div>`
    + `<div class="rep-stat"><div class="n">${o.maturity ?? '-'}</div><div class="k">${esc(t('readiness.maturityAvg'))}</div></div>`
    + `<div class="rep-stat"><div class="n met">${o.counts.implemented}</div><div class="k">${esc(t('status.implemented'))}</div></div>`
    + `<div class="rep-stat"><div class="n">${o.counts.partial}</div><div class="k">${esc(t('status.partial'))}</div></div>`
    + `<div class="rep-stat"><div class="n gap">${o.counts.not_implemented}</div><div class="k">${esc(t('status.notimplemented'))}</div></div>`
    + `<div class="rep-stat"><div class="n">${o.counts.not_applicable}</div><div class="k">${esc(t('status.notapplicable'))}</div></div>`
    + `<div class="rep-stat"><div class="n">${o.counts.unset}</div><div class="k">${esc(t('status.unset'))}</div></div>`
    + `<div class="rep-stat"><div class="n">${EV.soa.applicable}/${EV.soa.not_applicable}</div><div class="k">${esc(t('soa.applicable'))}/${esc(t('soa.notApplicable'))}</div></div>`
    + `</div>`
    + `<table class="rep-table"><thead><tr><th>${esc(t('register.domain'))}</th><th class="num">${esc(t('readiness.title'))}</th><th>${esc(t('col.band'))}</th><th class="num">${esc(t('maturity.title'))}</th><th class="num">${esc(t('col.assessed'))}</th><th class="num">${esc(t('status.notimplemented'))}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`
    + `<h3>${esc(t('report.gaps'))}</h3><p class="muted">${esc(t('report.gapsIntro'))}</p>`
    + (EV.gaps.length ? `<ol class="gaps">${EV.gaps.slice(0, 15).map((g) => `<li>${esc(g.id)} ${esc(T(g))}: ${g.counts.not_implemented} / ${g.total}</li>`).join('')}</ol>` : `<p class="muted">${esc(t('cw.none'))}</p>`)
    + `</div>`;
}

/* ---------- about ---------- */
function renderAbout() {
  const p = BUNDLE.project;
  const src = BUNDLE.sources;
  $('#panel-about').innerHTML =
    `<div class="about"><h2>${esc(t('about.title'))}</h2>`
    + `<p>${esc(t('about.what'))}</p><p>${esc(t('about.how'))}</p>`
    + `<h3>${esc(t('about.nameTitle'))}</h3><p>${esc(t('about.name'))}</p>`
    + `<h3>MCP</h3><p>${esc(t('about.mcp'))}</p><p><code>npx -y github:${esc(p.owner)}/${esc(p.repo)}</code></p>`
    + `<h3>${esc(t('source.line'))}</h3><p>${esc(t('about.source'))}</p>`
    + `<p class="disc">${esc(t('about.disclaimer'))}</p>`
    + `<h3>${esc(t('about.sources'))}</h3><ul>${src.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(N(s))}</a>: ${esc(N(s.use))}</li>`).join('')}</ul>`
    + `<p class="muted">${esc(N(src.note))}</p>`
    + `<h3>${esc(t('about.code'))}</h3><p><a href="https://github.com/${esc(p.owner)}/${esc(p.repo)}" target="_blank" rel="noopener">github.com/${esc(p.owner)}/${esc(p.repo)}</a></p>`
    + `</div>`;
}

const RENDERERS = { register: renderRegister, soa: renderSoa, crosswalk: renderCrosswalk, frameworks: renderFrameworks, report: renderReport, about: renderAbout };

function showTab(tab) {
  state.tab = tab;
  $$('#tabs [role="tab"]').forEach((b) => {
    const on = b.dataset.tab === tab;
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
  });
  $$('.main [role="tabpanel"]').forEach((p) => { p.hidden = p.id !== 'panel-' + tab; });
  RENDERERS[tab]();
}

/* ---------- popup ---------- */
let lastFocus = null;
function showDisclaimer() {
  lastFocus = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.id = 'disclaimer';
  const dir = state.lang === 'ar' ? 'rtl' : 'ltr';
  wrap.innerHTML =
    `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="dt" dir="${dir}" lang="${state.lang}">`
    + `<div class="modal-crown"></div><div class="modal-body">`
    + `<h2 id="dt">${esc(t('popup.title'))}</h2>`
    + `<p>${esc(t('popup.body1'))}</p><p>${esc(t('popup.body2'))}</p>`
    + `<div class="modal-actions"><button type="button" class="modal-ack" data-act="ack">${esc(t('popup.ack'))}</button></div>`
    + `</div></div>`;
  document.body.appendChild(wrap);
  $('.modal-ack', wrap).focus();
  wrap.addEventListener('click', (e) => { if (e.target === wrap) closeDisclaimer(); });
}
function closeDisclaimer() {
  const w = $('#disclaimer');
  if (w) w.remove();
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

/* ---------- events ---------- */
function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function flash(msg) {
  const f = $('#flash');
  f.textContent = msg; f.hidden = false;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => { f.hidden = true; }, 1800);
}
function rerenderCurrent() { RENDERERS[state.tab](); }

function onClick(e) {
  const tab = e.target.closest('#tabs [role="tab"]');
  if (tab) { showTab(tab.dataset.tab); return; }
  const dom = e.target.closest('.dindex a');
  if (dom) {
    e.preventDefault();
    const target = $('#dom-' + dom.dataset.dom);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'ack') { closeDisclaimer(); return; }
  if (act === 'status') {
    const id = btn.dataset.id, st = btn.dataset.st;
    if (state.a.status[id] === st) delete state.a.status[id]; else state.a.status[id] = st;
    saveAssessment();
    if (state.filter === 'all') refreshControl(id); else renderRegister();
    return;
  }
  if (act === 'soa') {
    const id = btn.dataset.id, v = btn.dataset.v;
    if (state.a.soa[id] === v) delete state.a.soa[id]; else state.a.soa[id] = v;
    if (state.a.soa[id] !== 'not_applicable') delete state.a.soaNotes[id];
    saveAssessment();
    rerenderCurrent();
    return;
  }
  if (act === 'baseline') { state.baseline = btn.dataset.b; renderRegister(); $('#main').scrollIntoView({ block: 'start' }); return; }
  if (act === 'note-toggle') {
    const id = btn.dataset.id;
    if (state.notesOpen.has(id)) state.notesOpen.delete(id); else state.notesOpen.add(id);
    renderRows();
    const ta = $(`textarea[data-id="${CSS.escape(id)}"]`);
    if (ta) ta.focus();
    return;
  }
  if (act === 'filter') { state.filter = btn.dataset.filter; renderRegister(); return; }
  if (act === 'reset') {
    if (confirm(t('action.resetConfirm'))) {
      state.a = core.emptyAssessment();
      state.notesOpen.clear();
      saveAssessment();
      renderRegister();
      flash(t('action.reset'));
    }
    return;
  }
  if (act === 'export') { download('sadu-assessment.json', JSON.stringify(persisted(), null, 2), 'application/json'); return; }
  if (act === 'import') { $('#import-file').click(); return; }
  if (act === 'print') { window.print(); return; }
  if (act === 'cw-framework') { state.cw.framework = btn.dataset.f; renderCrosswalk(); return; }
  if (act === 'cw-baseline') { state.cw.baseline = btn.dataset.b; renderCrosswalk(); return; }
  if (act === 'fw') { state.fw = btn.dataset.f; renderFrameworks(); return; }
  if (act === 'goto-area') {
    e.preventDefault();
    const id = btn.dataset.id;
    const a = IX.areas.get(id);
    if (!a) return;
    state.baseline = a.baseline; state.q = ''; state.filter = 'all';
    showTab('register');
    const target = $('#area-' + CSS.escape(id.replace(':', '-')));
    if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    return;
  }
}
function onInput(e) {
  const q = e.target.closest('#q');
  if (q) { state.q = q.value; renderSummary(); renderIndex(); renderRows(); return; }
  const note = e.target.closest('textarea[data-act="note"]');
  if (note) { const id = note.dataset.id, v = note.value; if (v.trim()) state.a.notes[id] = v; else delete state.a.notes[id]; saveAssessment(); return; }
  const sn = e.target.closest('textarea[data-act="soa-note"]');
  if (sn) { const id = sn.dataset.id, v = sn.value; if (v.trim()) state.a.soaNotes[id] = v; else delete state.a.soaNotes[id]; saveAssessment(); return; }
}
function onChange(e) {
  const sel = e.target.closest('select[data-act="maturity"]');
  if (sel) {
    const id = sel.dataset.id, v = Number(sel.value);
    if (core.MATURITY.includes(v)) state.a.maturity[id] = v; else delete state.a.maturity[id];
    saveAssessment();
    reevaluate(); renderSummary();
    return;
  }
  const ref = e.target.closest('#cw-ref');
  if (ref) { state.cw.ref = ref.value; renderCrosswalk(); return; }
  const file = e.target.closest('#import-file');
  if (file && file.files && file.files[0]) {
    const f = file.files[0];
    f.text().then((txt) => {
      const parsed = JSON.parse(txt);
      if (!parsed || parsed.schema !== core.SCHEMA) throw new Error('schema');
      state.a = core.validateAssessment(BUNDLE, parsed);
      saveAssessment();
      rerenderCurrent();
      flash(t('action.imported'));
    }).catch(() => flash(t('action.importFailed')));
    file.value = '';
  }
}
function onKeydown(e) {
  if (e.key === 'Escape' && $('#disclaimer')) { closeDisclaimer(); return; }
  if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.closest('#tabs [role="tab"]')) {
    const tabs = $$('#tabs [role="tab"]');
    const i = tabs.indexOf(e.target);
    const dir = (e.key === 'ArrowRight' ? 1 : -1) * (state.lang === 'ar' ? -1 : 1);
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    next.focus(); showTab(next.dataset.tab);
  }
}

$('#lang-toggle').addEventListener('click', () => {
  state.lang = other();
  try { localStorage.setItem(LANG_KEY, state.lang); } catch { /* ignore */ }
  applyChrome();
  showTab(state.tab);
});
$('#theme-toggle').addEventListener('click', () => {
  state.theme = effectiveDark() ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, state.theme); } catch { /* ignore */ }
  applyTheme();
});
document.addEventListener('click', onClick);
document.addEventListener('input', onInput);
document.addEventListener('change', onChange);
document.addEventListener('keydown', onKeydown);

/* ---------- boot ---------- */
async function init() {
  loadState();
  try {
    const res = await fetch('data/bundle.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('http ' + res.status);
    BUNDLE = await res.json();
  } catch (err) {
    document.body.classList.remove('loading');
    $('#boot-error').hidden = false;
    return;
  }
  IX = core.indexBundle(BUNDLE);
  state.a = core.validateAssessment(BUNDLE, state.a);
  applyChrome();
  showTab('register');
  document.body.classList.remove('loading');
  showDisclaimer();
}
init();
