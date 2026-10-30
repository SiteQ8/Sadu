---
name: Sadu
description: A working register for the CBK Cyber and Operational Resilience Framework, set on the loom of Kuwaiti Sadu weaving
colors:
  sand: "#f2ebdc"
  wool: "#fffbf3"
  wool-deep: "#f8f1e3"
  ink: "#1e1915"
  ink-2: "#4f463c"
  ink-3: "#6b6151"
  madder: "#9b2c2c"
  madder-bright: "#b8393a"
  madder-wash: "#f6e4e1"
  madder-line: "#e7c9c4"
  goat-hair: "#241f1c"
  on-goat-hair: "#f5efe2"
  ochre: "#a86a22"
  ochre-wash: "#f5e8d3"
  rule: "#e6ddc9"
  rule-control: "#d9cfb8"
  met: "#2e7d4f"
  met-wash: "#e3efe6"
  partial: "#8f5e10"
  partial-wash: "#f5ecd8"
  gap: "#a63a2c"
  gap-wash: "#f6e6e2"
  na: "#665d4f"
  na-wash: "#eee9dd"
  night-sand: "#17120f"
  night-wool: "#211a16"
  night-wool-deep: "#2a221c"
  night-ink: "#f1e9dc"
  night-madder: "#e0736a"
typography:
  title:
    fontFamily: "Readex Pro, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  lead-figure:
    fontFamily: "Readex Pro, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
    fontVariation: "tabular-nums"
  section:
    fontFamily: "Readex Pro, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.3
  domain:
    fontFamily: "Readex Pro, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  subdomain:
    fontFamily: "Readex Pro, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Readex Pro, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
  compact:
    fontFamily: "Readex Pro, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Readex Pro, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Readex Pro, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "8px"
  card: "12px"
  pill: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
  s8: "64px"
components:
  button-primary:
    backgroundColor: "{colors.goat-hair}"
    textColor: "{colors.on-goat-hair}"
    rounded: "{rounded.control}"
    height: "34px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.wool}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "34px"
    padding: "0 16px"
  segment-active:
    backgroundColor: "{colors.goat-hair}"
    textColor: "{colors.on-goat-hair}"
    typography: "{typography.label}"
  status-implemented:
    backgroundColor: "{colors.met}"
    textColor: "#ffffff"
  status-partial:
    backgroundColor: "{colors.partial}"
    textColor: "#ffffff"
  status-not-implemented:
    backgroundColor: "{colors.gap}"
    textColor: "#ffffff"
  status-not-applicable:
    backgroundColor: "{colors.na}"
    textColor: "#ffffff"
  card:
    backgroundColor: "{colors.wool}"
    rounded: "{rounded.card}"
    padding: "12px 16px"
  chip:
    backgroundColor: "{colors.wool-deep}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    typography: "{typography.meta}"
    padding: "1px 8px"
  input:
    backgroundColor: "{colors.wool}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "34px"
    padding: "0 12px"
---

# Sadu design system

## Overview

Sadu is a working register: an audit tool a security team opens every week and works in for an hour. It is an Operate surface, so the visitor's success is finishing the assessment, and the design serves that first. The world of the loom lends exactly four things: one typeface, the palette of the yarn, the density of a ledger, and one signature move. It never supplies the layout or the controls, which stay the standard web ones.

The creative north star is **the loom**: the register is the warp (CORF, running the length of the page) and the international standards are the weft (ISO 27001, PCI DSS, SWIFT CSCF, crossing it at every control area). The signature move is the woven band of red diamonds on black that heads the page and crowns the every-visit notice; the mark repeats the diamond.

## Colors

The palette is the yarn of the Bedouin loom, not a brand chart. The ground is undyed wool (`sand`, with `wool` for raised surfaces and `wool-deep` for tinted rows). The ink is near-black. The accent is `madder` red and it goes on data and on one control: the readiness bars, the lead readiness figure, control-area ids, the active tab underline. Emphasis fills use `goat-hair` black with sand text; in the dark theme the same role inverts to sand with black text so emphasis never disappears into the ground.

Status colours belong to control rows only and say what a control is, never how the page looks: `met` green for implemented, `partial` ochre for partially implemented, `gap` red for not implemented, `na` grey for not applicable. Each has a wash for the row behind it. The crosswalk chips are tinted by framework (madder wash for ISO 27001, ochre wash for PCI DSS, neutral wash for SWIFT CSCF); an advisory SWIFT control carries a dashed edge.

Every text tier meets 4.5:1 on the surface it sits on, in both themes; the colour share of a screen stays near the data.

## Typography

One family, Readex Pro, as a variable font covering Arabic and Latin. Arabic is the first language and the page is right-to-left by default; English mirrors it with logical properties. The scale is fixed in pixels, not fluid, because a tool is read at one distance: 12 / 13 / 14 / 15 / 17 / 20 / 24 / 28, with 32 reserved for the one lead figure on the screen (overall readiness) which is at least 1.3 times its sibling figures. Weight carries hierarchy before size: 700 for the title, domain and section headings, 600 for sub-domain titles, area titles and active controls, 500 for ledger figures, 400 for everything else.

Arabic runs at 1.7 line height, English at 1.5. Every figure and identifier uses tabular numerals; numbers in tables are end-aligned under end-aligned headers. Headings balance their wrap, prose wraps pretty. Latin tokens inside Arabic text start with a capital or a digit, and numerals are Western in both languages.

## Layout

A centred page of at most 1280px with a fluid gutter (16 to 40px). The spacing scale is 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 and nothing else. Tight inside a group (4 and 8), generous between groups (24 and 32), with the most space above a heading.

The register tab is the home screen: the readiness ledger first (four cells divided by rules, then the baseline bars in one row and the domain bars in two columns), then the tools row, then a 236px index on the inline-start side beside the register. The index holds the baseline switch and the domain list. Domain, sub-domain and control area descend in that order, each control a row.

Below 900px the index folds into a baseline switch and a wrapped row of domain chips, the ledger cells become two by two, the bars sit behind a disclosure, the mini meter leaves the tab bar and the tabs scroll in their own row. Below 480px the four status buttons become a two by two grid of 36px targets.

## Elevation & Depth

Surfaces are flat and separated by one tone step or a 1px rule in `rule` (controls take `rule-control`, one step stronger). Nothing at rest carries a shadow. Only what floats casts one: the every-visit notice and the toast. A hover state changes colour, never lifts.

## Shapes

Two radii and the pill: 12px for cards, panels and the ledger, 8px for every control, 999px for chips and tags. Bars are rounded to 4px and filled by clipping, so the fill keeps a crisp rounded end at any value. The woven band is an authored SVG pattern 40 by 14px, never a gradient.

## Components

- **Tabs**: a row on a 1px rule, the active tab in madder with a 2px underline; arrow keys move between tabs.
- **Segmented controls** (baseline switch, filters, applicability): one bordered group, the active segment filled with the emphasis fill.
- **Status buttons**: four in one group per control, the pressed one filled with its status colour; disabled when the sub-domain is excluded.
- **Readiness ledger**: four cells with a 13px label over a figure, the lead figure in madder; bars with the label, a clipped fill and an end-aligned value.
- **Area card**: id in madder, title at 600, page reference in meta, a summary in ink-2 limited to 80ch, framework chips, then the control rows.
- **Notice and toast**: the only floating surfaces; the notice carries the woven crown.
- **Motion**: a press scales a control to 0.97 in 160ms; a tab panel fades in with a 4px rise in 160ms; a bar reaches its value in 240ms; the notice arrives in 250ms; the toast rises in 400ms. All use a strong ease-out, and prefers-reduced-motion drops the movement while keeping the fades and colour changes.

## Do's and Don'ts

- Do spend the accent on data and on one control; keep the chrome neutral.
- Do keep every figure tabular and end-aligned with its header.
- Do write Arabic first and let English mirror it with logical properties.
- Do keep the woven band as the one ornament; a second decoration is a costume.
- Don't put a big number in a coloured tile; the ledger is type, not a hero metric.
- Don't animate a layout property; clip or transform instead.
- Don't add a gradient, a glow, a glass surface or a resting shadow.
- Don't introduce a second typeface, an icon in a tinted square, or a value outside the spacing and type scales.
