# AC Second Opinion — Decision Tree Specs

**Product:** Second Wrench / AC Second Opinion  
**Domain:** secondwrench.co  
**Beta:** https://beta-secondwrench.netlify.app/#/  
**Positioning:** DIY without the expensive mistakes  
**Tagline:** Know what's wrong. Know what's safe. Know when to call.

Specs only. No application code in this folder.

**Wave-1 package:** READY FOR IMPLEMENTATION SPECS (Commander PASS 2026-09-22).  
**Wave-2 Basic:** APPROVED + deep-write DONE 2026-09-23. Implemented in the site tree with `advancedRepairsEnabled` false on the public build.  
**Capacitor Advanced:** eight gated nodes under `tree/advanced/nodes/`. Public runtime stays flag-off.

---

## Purpose

Define the rules-based decision tree for residential split central AC (cooling-first). The tree owns every conclusion. AI may explain what the tree already decided; AI must never invent a diagnosis, add edges, or bypass a safety gate / hazard exit.

## Scope (locked for beta)

| In scope | Out of scope (defer) |
|---|---|
| Residential split central AC | Window / PTAC / portable |
| Cooling-only paths | Heat pump primary (Heat Pump Lead) |
| U.S. only | Other countries |
| Basic DIY | Advanced DIY (capacitor-first when enabled — **OFF in live beta**) |
| Rules conclusions + hard DIY gates | Soft "maybe try this" continuations after hazard |

MVP approved **2026-09-22**. Live beta is a PoC, not a finished product.

## Brand lock

- Colors: dark walnut / charcoal / restrained scarlet
- Mark: white wrench in scarlet square
- **Never green**

## Who owns what

| Role | Owns |
|---|---|
| Founder (Donnie) | Product locks, beta gate, approval of priority nodes before deep writing |
| Second Wrench Commander | Spec authority; Tree Lead reports here |
| Tree Lead | Node content, DIY tiers, safety gates, hazard exits, audit events — within locked rules |
| AI (runtime) | Explain-only of tree conclusions; no invented diagnoses or edges |

Do not invent diagnoses outside rules. Schema is reusable for Heat Pump / Mini Split / WSHP — **extend, do not fork**.

## AI vs rules

1. User answers → tree selects next node / outcome.
2. Outcomes are **only**: `next_step` DIY (Basic or Advanced) | `call_pro` (reason) | `emergency_exit` | `insufficient_info`.
3. AI may rephrase / explain a reached conclusion for clarity.
4. AI must not: invent causes, soften Pro-only into DIY, skip gates, or invent edges between nodes.

## Legal / counsel note

Quiet beta. Terms draft **beta-2026-09-13** is **not attorney-approved**. Keep building hazard exits + session audit trail now; full Terms later. Do not claim medical or legal authority in any node copy.

## Where files live

```
ac-second-opinion/
  README.md                          ← this file
  conventions/
    node-schema.md                   ← required fields, outcomes, versioning
    diy-tiers.md                     ← Basic / Advanced / Professional-only
    safety-gates.md                  ← hard halt gates
    hazard-exit-ramps.md             ← mid-tree unsafe exit pattern
    audit-trail.md                   ← session event requirements
  tree/
    v0-outline.md                    ← cooling trunk + six live-beta landings
    v0-priority-nodes.md             ← 12 ids APPROVED 2026-09-22; deep-write DONE
    gaps-vs-live-beta.md             ← stubs, Advanced off, known gaps
    nodes/                           ← Wave-1 + Wave-2 Basic node specs
      README.md                      ← file list + live session entry order
      ac.*.md                        ← one file per approved id
    v0-wave2-node-ids.md             ← Wave-2 INCLUDE list (7 Basic)
    advanced/
      capacitor-gated-outline.md     ← capacitor chain, flag-gated
      nodes/                         ← 8 ac.adv.cap.* specs
  legal/
    disclaimer-change-log.md         ← counsel tracker (not attorney-approved)
```

## Related live beta landings

1. Not cooling  
2. Will not start  
3. Blank thermostat  
4. Weak airflow  
5. Water or ice  
6. Unusual noise  

See `tree/v0-outline.md` and `tree/gaps-vs-live-beta.md`.
