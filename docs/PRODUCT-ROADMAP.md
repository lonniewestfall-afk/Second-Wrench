# Second Wrench — Product roadmap (2026-09-22)

**Commander:** Second Wrench Commander  
**Founder decision:** MVP approved. Harden AC Second Opinion toward end-product PoC, then expand equipment coverage.

## Positioning (locked)
- Brand: Second Wrench · First product: AC Second Opinion
- Promise: DIY without the expensive mistakes
- Tagline: Know what's wrong. Know what's safe. Know when to call.
- Tree owns conclusions; AI explains only; never invents diagnosis or bypasses safety
- Brand look: dark walnut / charcoal / restrained scarlet; white wrench in scarlet square — never green
- Legal posture: quiet beta; trademark/LLC when cash allows; Terms/insurance nearer launch (Leon Bass)

## Live beta baseline
- URL: https://beta-secondwrench.netlify.app/#/
- Source package: `/workspace/second-wrench/beta-source/Second-Wrench-Netlify-Upload/`
- Version: `0.1.0-beta` · content `2026-09-13.1`
- Flags: `advancedRepairsEnabled: false`, `formsEnabled: false`
- Scope: cooling-only residential split central AC (U.S.)
- Landing symptoms: Not cooling, Will not start, Blank thermostat, Weak airflow, Water or ice, Unusual noise
- Safety gate + consent before tree; many paths already exit to `@professional` / emergency

## Phase order (locked)

### Phase 1 — AC Second Opinion → robust PoC / end-product shape
**Owner:** Tree Lead — AC (+ Commander)  
**Goal:** Trade-pro-demoable completeness without enabling unsafe DIY.

Priorities:
1. Shared node schema + audit trail + hazard exits (foundation)
2. Flesh incomplete trunks for the six landing symptoms
3. Clear DIY Basic vs Call-pro outcomes (Advanced stays gated off until reviewed)
4. Brand fidelity (scarlet/walnut, official logo), remove Netlify badge, fix contact/feedback plumbing when ready
5. Spec package Donnie can approve node-by-node before code ships

Success: a trade pro can walk a real “not cooling” call and trust the exits.

### Phase 2 — Heat pumps / inverters / ducted HP
**Owner:** Heat Pump Lead  
**Prefix:** `hp.`  
**First slice (approved direction):** mode + reversing-valve awareness + DIY/pro boundaries (+ outdoor ambient / defrost traps)  
**Doc started:** `/workspace/second-wrench/heat-pump/01-mode-rv-diy-boundaries.md`  
**Gate:** after Phase 1 demo-solid.

### Phase 3 — Mini-splits / multi-zone ductless
**Owner:** Mini Split Lead  
**Prefix:** `ms.`  
**First slice (later):** single-zone vs multi-zone symptom map + DIY/pro boundaries  
**Folder:** `/workspace/second-wrench/mini-split/` (create when drafting)

### Phase 4 — Water-to-air water-source HP ≤ 6 tons
**Owner:** Water Source Lead  
**Prefix:** `wshp.`  
**First slice (later):** homeowner-safe loop/flow observation + hard DIY/pro boundaries  
**Folder:** `/workspace/second-wrench/water-source/`

## Team
| Role | Focus |
|---|---|
| Second Wrench Commander | Sequencing, founder interface, legal/ops alignment |
| Tree Lead — AC | AC tree, schema, tiers, gates, audit |
| Heat Pump Lead | Air-source HP / inverter / ducted |
| Mini Split Lead | Ductless / multi-zone |
| Water Source Lead | WSHP ≤6 tons (later) |

## Coding path (blocker)
No source-control integration is connected to Cursor yet. Specs live on disk first. To ship PRs against a real repo: connect GitHub/GitLab/Bitbucket/Azure or Origin, then Commander launches cloud agents. Until then: Tree Lead specs → Commander reviews with Donnie → package updates to Netlify upload when Donnie approves.

## Near-term Commander actions
1. Tree Lead delivers v0 foundation + first-node priority list for Donnie approval
2. Distill old ChatGPT share threads into `/workspace/second-wrench/gpt-notes-distill.md`
3. Connect SCM when Donnie is ready so build work can PR
4. Keep beta quiet per counsel

