**READY FOR PRIVATE SANDBOX ZIP** — 2026-09-23 (Commander second safety pass PASS + identify_label touch ban).

**Public:** `advancedRepairsEnabled` remains **FALSE**. No coding PR / no public flip from Tree Lead.

# Advanced capacitor nodes — full gated specs

**Product:** Second Wrench / AC Second Opinion  
**Tree:** `ac.cool.v0` Advanced submodule  
**Date:** 2026-09-23  
**Brand:** scarlet wrench + dark charcoal / grey / walnut — **never green**; never invent “2W”  
**Support:** lonnie@secondwrench.co  
**Tagline:** Know what’s wrong. Know what’s safe. Know when to call.

Specs only. No application code. No public flag flip in this package.

---

## Runtime rule (PRODUCT LOCK)

```
if advancedRepairsEnabled == false:
    never show Advanced next_step / never enter these nodes
    conclude → call_pro (reason: suspected_capacitor_contactor_advanced_off)

if advancedRepairsEnabled == true:   # attorney/Terms OK + Commander explicit flip only
    may offer gated path from ac.cool.conclude.call_pro_capacitor_contactor
    → ac.adv.cap.prereq_gate_cluster → … → reassemble_restore_test
```

| Flag / surface | Value |
|---|---|
| `public_runtime` | `flag_off` (`advancedRepairsEnabled` = **FALSE**) |
| `private_sandbox_may_enable` | `true` **only after Commander second safety pass** — then drag-drop zip to Donnie’s private Netlify sandbox; **Donnie will NOT wire GitHub to private Netlify** |
| Softening | Do **not** soften lockout, discharge, or never-live-work |

While flag false, live users on cap/contactor paths stay on Wave-1 conclude → Call-pro.

---

## All 8 Advanced node files (ordered chain)

| # | id | File | Stage |
|---|---|---|---|
| 1 | `ac.adv.cap.prereq_gate_cluster` | [ac.adv.cap.prereq_gate_cluster.md](./ac.adv.cap.prereq_gate_cluster.md) | Hard prerequisites (all-pass) |
| 2 | `ac.adv.cap.confirm_pattern` | [ac.adv.cap.confirm_pattern.md](./ac.adv.cap.confirm_pattern.md) | Stage 1 — Cool calling + hum / no fan |
| 3 | `ac.adv.cap.lockout_verify` | [ac.adv.cap.lockout_verify.md](./ac.adv.cap.lockout_verify.md) | Stage 2 — Lockout / verify dead |
| 4 | `ac.adv.cap.access_compartment` | [ac.adv.cap.access_compartment.md](./ac.adv.cap.access_compartment.md) | Stage 3 — Access compartment (de-energized) |
| 5 | `ac.adv.cap.identify_label` | [ac.adv.cap.identify_label.md](./ac.adv.cap.identify_label.md) | Stage 4 — Label ID (no µF guess) |
| 6 | `ac.adv.cap.discharge` | [ac.adv.cap.discharge.md](./ac.adv.cap.discharge.md) | Stage 5 — Discharge (**NEVER** screwdriver/bare short) |
| 7 | `ac.adv.cap.replace_like_for_like` | [ac.adv.cap.replace_like_for_like.md](./ac.adv.cap.replace_like_for_like.md) | Stage 6 — Like-for-like replace (**contactor NOT in path**) |
| 8 | `ac.adv.cap.reassemble_restore_test` | [ac.adv.cap.reassemble_restore_test.md](./ac.adv.cap.reassemble_restore_test.md) | Stage 7 — Covers ON before restore power (**absolute**) |

Outline source: [`../capacitor-gated-outline.md`](../capacitor-gated-outline.md).

---

## Locked schema (every file)

`id` · `prompt` · `choices[]` (answer_id + label + optional help) · `next_outcome_map` · `diy_tier` (`advanced`) · `safety_gate` · `hazard_exit` · `audit_event` · `notes`

Terminals only: `next_step` DIY Advanced · `call_pro` (reason) · `emergency_exit` · `insufficient_info`  
(Basic next_step is not emitted from these Advanced files except via abort → call_pro.)

---

## Explicit NEVER (discharge + path)

- **Never** instruct shorting capacitor terminals with a screwdriver or bare conductor  
- Unsure discharge method → **immediate** `call_pro`  
- Contactor replacement **not** in this path  
- Covers **must** be on before restore power  
- No Advanced UI while flag false  
- No soft continue after gate fire  

---

## Commander second pass (open)

1. Safety review of all 8 deep-written Advanced node files + outline NEVER list.  
2. Attorney/Terms OK before any public `advancedRepairsEnabled` flip.  
3. Private sandbox enable only after this second pass; public stays flag_off.  
4. Confirm contactor remains separately gated (not bundled).  
5. Confirm no coding PR wires live Advanced until flip.
