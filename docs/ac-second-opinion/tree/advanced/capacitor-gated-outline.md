# Capacitor Advanced DIY — full gated specs (DRAFT for Commander safety review)

**Status:** **READY FOR PRIVATE SANDBOX ZIP** — 2026-09-23 (second safety pass PASS + identify_label fix). Public `advancedRepairsEnabled` still FALSE; no public coding PR / flip from Tree Lead. Private sandbox enable only via Commander drag-drop zip after this stamp.  
**Filename retained** (`capacitor-gated-outline.md`) — content is the full Advanced chain package, not a stub.  
**Tree package:** `ac.cool.v0` Advanced submodule  
**Product:** Second Wrench / AC Second Opinion  
**Date:** 2026-09-23  
**Scope:** U.S. residential split central AC, cooling-only  
**Brand:** dark walnut / charcoal / restrained scarlet — never green  
**Support:** lonnie@secondwrench.co  

Plain mechanical tone. No humor on hazards. Do not invent µF, torque, or fake “safe enough” wait times.

---

## Shipping policy — PRODUCT LOCK 2026-09-23 (Donnie via Commander)

| Rule | Detail |
|---|---|
| Specs in package | **Build** capacitor Advanced DIY fully now — complete gated specs in this file / Advanced chain. The full Advanced chain **exists in the tree package** for review. |
| Product flag | `advancedRepairsEnabled` = **FALSE** until attorney/Terms OK + Commander explicit flip. |
| While flag false | Live users hitting cap/contactor paths stay on **Call-pro** via existing Wave-1 node `ac.cool.conclude.call_pro_capacitor_contactor`. Runtime **must** route reason `suspected_capacitor_contactor_advanced_off`. **Never** show `next_step` DIY Advanced. |
| Runtime gate | `if advancedRepairsEnabled == false` → never emit / never show Advanced next_step; keep conclude → `call_pro`. |
| When flag true | After legal + Commander flip: gated Advanced path below **may** run (still behind hard prereq gates). |
| Softening | Do **not** soften lockout, discharge, or never-live-work. Residual charge can injure. Unsure → `call_pro` immediately. |
| Coding | Specs for Commander safety review **before** any coding PR for Advanced enablement. |
| **public_runtime** | `advancedRepairsEnabled` = **flag_off** (FALSE). Public / invited beta users never get Advanced next_step until attorney/Terms + Commander flip. |
| **private_sandbox_may_enable** | `true` only after Commander safety pass on these specs. Donnie’s **private** Netlify Advanced DIY sandbox (drag-drop zip) may enable the flag for internal testing; public beta stays flag off. |

Until the flag is true, row-12 conclude behavior is unchanged: both `ack_call_pro` and `want_diy_capacitor_anyway` → terminal `call_pro` (`suspected_capacitor_contactor_advanced_off`).

---

## Purpose

When **eventually** enabled (`advancedRepairsEnabled == true`), this chain is the alternate / replace path from:

`ac.cool.conclude.call_pro_capacitor_contactor`

→ gated Advanced `next_step` DIY Advanced (capacitor like-for-like only)

**Until then:** conclusion stays `call_pro`. Contactor replacement is **not** in this Advanced path (separately gated later if ever).

Entry evidence (unchanged Wave-1): outdoor hum/buzz while Cool calling and fan not spinning (or equivalent start pattern) — typically via `ac.start.outdoor_silent_vs_hum` / outdoor fan hum edge.

---

## Hard prerequisites gate cluster

**All must pass.** Any fail → `call_pro` or `emergency_exit` per matrix. No soft continue. No “I accept the risk” override.

| Gate check | Pass condition | Fail → |
|---|---|---|
| Equipment class | Confirmed cool-only residential **split central** (not heat pump / mini-split / packaged / window) — Wave-1 `ac.cool.intake.system_confirm` already passed this session | `call_pro` (`out_of_scope_equipment`) |
| Session safety | Wave-1 `ac.gate.cluster_entry` (and any mid-tree water/electrical gates) already cleared this session; no burning/smoke/spark/gas/flood active | Re-fire appropriate `emergency_exit` / `call_pro` |
| Kill power capability | User can safely kill power at **outdoor disconnect** AND verify Off (manufacturer homeowner path); dry hands/floor | `call_pro` + gate `cannot_kill_power` |
| Environment | Dry conditions, daylight/adequate light, sober, 18+, no wet hands / flooding | `call_pro` or `emergency_exit` (`wet_hands_flood` / unsafe conditions) |
| Capacitor identity | Exact capacitor type **known from label after verified dead** — unknown µF / unreadable label → stop | `call_pro` (`capacitor_label_unknown`) — **no guessing µF** |
| Replacement match | Single dual-run / matching replacement only after label read with power verified dead; µF within OEM tolerance; equal or greater VAC; correct terminal markings | Mismatch → `call_pro` — do not proceed |

Node that owns this cluster: `ac.adv.cap.prereq_gate_cluster` (below).

---

## Runtime branching (engine rule)

```
hum / cap-contactor evidence
  → ac.cool.conclude.call_pro_capacitor_contactor
       if advancedRepairsEnabled == false:
            → terminal call_pro (suspected_capacitor_contactor_advanced_off)
       if advancedRepairsEnabled == true:
            → offer gated path: next ac.adv.cap.prereq_gate_cluster
                 (user may still choose call_pro without entering Advanced)
```

UI must not expose Advanced next_step chrome while flag is false (About / tier labels stay “Advanced disabled”).

---

## Procedure stages (full chain — high-level safe procedure; not a shop manual)

Do **not** invent torque values, exact µF, or a fake short wait marketed as “safe enough.” Discharge wait: follow manufacturer documentation; treat capacitor as charged until verified discharged.

### Stage 1 — Confirm Cool calling + outdoor hum / fan-not-spin pattern

| Field | Spec |
|---|---|
| **id** | `ac.adv.cap.confirm_pattern` |
| **purpose** | Re-confirm Cool calling + outdoor hum / fan-not-spin before any cover-off work; link observation language to `ac.start.outdoor_silent_vs_hum` |
| **diy_tier** | `advanced` |
| **safety_gate** | `false` (pattern confirm); hazards → exit |
| **choices (draft)** | `pattern_confirmed_hum_no_fan` · `pattern_not_confirmed` · `hazard_seen_now` · `want_call_pro` |
| **next / outcome** | confirmed → Stage 2; not confirmed → `call_pro` or back to Basic observation; hazard → `emergency_exit` / `call_pro`; want_call_pro → `call_pro` |
| **notes** | No covers off. Safe distance. Does not invent diagnosis beyond ranked start-component path. |

### Stage 2 — Lockout

| Field | Spec |
|---|---|
| **id** | `ac.adv.cap.lockout_verify` |
| **purpose** | Thermostat Off; outdoor disconnect Off; verify no spin/hum; wait discharge period per manufacturer — treat as charged until verified discharged |
| **diy_tier** | `advanced` |
| **safety_gate** | `true` on cannot kill / wet / still humming after Off |
| **choices (draft)** | `lockout_verified_dead` · `cannot_kill_power` · `still_hum_or_spin` · `unsure_wait_discharge` · `wet_or_unsafe` |
| **next / outcome** | verified → Stage 3; cannot_kill → `call_pro` (`gate_fired:cannot_kill_power`); still live symptoms → `call_pro` / do not open; unsure discharge wait → `call_pro`; wet → `emergency_exit` / `call_pro` |
| **lockout copy rules** | State explicitly: follow manufacturer wait / treat as charged until verified discharged. **Never** invent a fake short wait as “safe enough.” |

### Stage 3 — Access outdoor electrical compartment (de-energized only)

| Field | Spec |
|---|---|
| **id** | `ac.adv.cap.access_compartment` |
| **purpose** | Access outdoor electrical compartment **only after** verified de-energized |
| **diy_tier** | `advanced` |
| **safety_gate** | `true` if user must defeat interlocks unsafely |
| **choices (draft)** | `compartment_accessible_safe` · `must_defeat_interlock_unsafely` · `cannot_access` · `saw_damage_burn_water` |
| **next / outcome** | accessible → Stage 4; defeat interlock → `call_pro` (`high_voltage_intent` / unsafe access); cannot access → `call_pro`; damage/burn/water → `emergency_exit` / `call_pro` |
| **notes** | No live work. Covers off only when lockout verified. |

### Stage 4 — Identify run/dual capacitor by label

| Field | Spec |
|---|---|
| **id** | `ac.adv.cap.identify_label` |
| **purpose** | Identify run/dual capacitor by **label**; photo label for matching replacement; no guessing µF |
| **diy_tier** | `advanced` |
| **safety_gate** | `false` if still verified dead; if power uncertainty returns → back to lockout / `call_pro` |
| **choices (draft)** | `label_readable_recorded` · `label_unreadable_unknown` · `not_a_standard_dual_run` · `want_call_pro` |
| **next / outcome** | readable → Stage 5; unknown / non-matching type → `call_pro` (`capacitor_label_unknown`); want_call_pro → `call_pro` |
| **notes** | Exact type unknown → **stop** `call_pro`. Single dual-run / matching replacement only after label read with power verified dead. |

### Stage 5 — Discharge procedure outline

| Field | Spec |
|---|---|
| **id** | `ac.adv.cap.discharge` |
| **purpose** | Discharge using insulated tools and bleed resistors **or** manufacturer method; emphasize residual charge can injure |
| **diy_tier** | `advanced` |
| **safety_gate** | `true` — unsure of method → immediate `call_pro` |
| **choices (draft)** | `discharge_done_per_mfr_or_insulated_bleed` · `unsure_discharge_method` · `spark_shock_smoke_during` · `abort_call_pro` |
| **next / outcome** | done → Stage 6; unsure → **`call_pro` immediately**; spark/shock/smoke → `emergency_exit` (kill if safe, get help); abort → `call_pro` |
| **copy rules** | EMPHASIZE residual charge can injure. Never imply “already Off long enough” equals discharged. **Never** instruct shorting terminals with a screwdriver or bare conductor. Do not invent resistor ohm values unless quoting manufacturer doc the user has in hand (follow mfr / proper insulated bleed tool — if unsure, call pro immediately). |

### Stage 6 — Replace like-for-like

| Field | Spec |
|---|---|
| **id** | `ac.adv.cap.replace_like_for_like` |
| **purpose** | Replace like-for-like: µF within OEM tolerance, equal or greater VAC rating, correct terminals C / HERM / FAN |
| **diy_tier** | `advanced` |
| **safety_gate** | `true` on wrong terminals / forced mismatch |
| **choices (draft)** | `replacement_matched_installed` · `µF_or_VAC_mismatch` · `wrong_terminals_uncertain` · `abort_call_pro` |
| **next / outcome** | matched installed → Stage 7; µF/VAC mismatch → `call_pro` — do not proceed; wrong terminals / uncertain → `call_pro` — **do not proceed**; abort → `call_pro` |
| **notes** | “Any capacitor will do” is forbidden. Contactor not replaced on this path. |

### Stage 7 — Reassemble, restore power, brief Cool test

| Field | Spec |
|---|---|
| **id** | `ac.adv.cap.reassemble_restore_test` |
| **purpose** | Reassemble covers **before** restore power; restore power; test Cool briefly; abnormal → stop |
| **diy_tier** | `advanced` |
| **safety_gate** | `true` on abnormal smell/spark/hum-no-start after restore |
| **choices (draft)** | `covers_on_test_ok` · `abnormal_smell_spark` · `hum_no_start_after_replace` · `cannot_reassemble` |
| **next / outcome** | test ok → terminal `next_step` DIY Advanced complete / retest guidance (session conclusion `next_step_advanced` with audit); smell/spark → **`emergency_exit`** — kill power if safe — call emergency/pro; hum-no-start → kill power if safe → `call_pro`; cannot reassemble → leave power Off → `call_pro` |
| **notes** | Never restore power with covers off. Brief test only. |

---

## Proposed Advanced node ids (full chain — specs in this file; not separate deep-write files yet)

Ordered runtime chain when `advancedRepairsEnabled == true`:

1. `ac.adv.cap.prereq_gate_cluster` — hard prerequisites (all-pass)  
2. `ac.adv.cap.confirm_pattern` — Stage 1  
3. `ac.adv.cap.lockout_verify` — Stage 2  
4. `ac.adv.cap.access_compartment` — Stage 3  
5. `ac.adv.cap.identify_label` — Stage 4  
6. `ac.adv.cap.discharge` — Stage 5  
7. `ac.adv.cap.replace_like_for_like` — Stage 6  
8. `ac.adv.cap.reassemble_restore_test` — Stage 7  

**Stage count (procedure):** 7 (Stages 1–7) plus 1 prereq cluster node = **8 Advanced node ids**.

Optional future (NOT in this path): `ac.adv.contactor.*` — separately gated later; never bundled into capacitor replace.

Ids use `ac.adv.cap.*` prefix (DRAFT). Do not rename without Commander.

---

## Explicit NEVER list

- Live work / energized terminal contact  
- Bypassing safeties or defeating interlocks unsafely  
- “Any capacitor will do” / guessing µF  
- Working in rain / wet hands / flooded area  
- Aluminum branch wiring DIY / panel interior  
- Contactor replacement in this same Advanced path (unless separately gated later)  
- Showing Advanced next_step while `advancedRepairsEnabled == false`  
- Soft continue after gate fire  
- Inventing fake short discharge waits as “safe enough”  
- **Never** instruct shorting capacitor terminals with a screwdriver or bare conductor  
- If user cannot follow manufacturer discharge method or proper insulated bleed tool → immediate `call_pro` (absolute)  
- Covers **must** be on before restore power (absolute)  
- Refrigerant / sealed-system work  
- Amp-draw as a required step on this path  

---

## Exit matrix

| Failure / condition | Outcome | Reason / gate (examples) |
|---|---|---|
| Flag false at conclude | `call_pro` | `suspected_capacitor_contactor_advanced_off` |
| User chooses Call-pro at any Advanced node | `call_pro` | `user_elected_call_pro_advanced_abort` |
| Cannot kill power / verify Off | `call_pro` | `gate_fired:cannot_kill_power` |
| Wet hands / flood / water near electrical | `emergency_exit` or `call_pro` | `wet_hands_flood` / `water_near_electrical` |
| Burning / smoke / sparks (any stage) | `emergency_exit` | `burning_smell` / `smoke` / `sparking` — kill if safe |
| Must defeat interlock unsafely | `call_pro` | `high_voltage_intent` / unsafe access |
| Label unknown / µF guess required | `call_pro` | `capacitor_label_unknown` |
| µF / VAC / terminal mismatch | `call_pro` | `capacitor_mismatch_do_not_proceed` |
| Unsure discharge method | `call_pro` | `capacitor_discharge_unsure` |
| Shock / spark / smoke during discharge or test | `emergency_exit` | kill power if safe; get help |
| Hum-no-start / abnormal after restore | `call_pro` (or `emergency_exit` if spark/smell) | kill power if safe first |
| Cannot reassemble covers | `call_pro` | leave power Off |
| Heat pump / mini-split / wrong equipment | `call_pro` | `out_of_scope_equipment` |

---

## Audit events required

In addition to standard `node_entered` / `answer_selected` / `conclusion_reached` / `diy_tier_shown` / `exit_ramp` / `gate_fired`:

| Event / note | When |
|---|---|
| `advanced_flag_checked` | At conclude / before offering Advanced; record `advancedRepairsEnabled` true/false |
| `advanced_path_suppressed` | Flag false → forced `call_pro` (`suspected_capacitor_contactor_advanced_off`) |
| `advanced_path_offered` | Flag true and user shown Advanced option |
| `advanced_path_entered` | User enters `ac.adv.cap.prereq_gate_cluster` |
| `gate_fired:<id>` | Any prereq or mid-chain gate |
| `capacitor_label_recorded` | Stage 4 pass (no raw PII photo bytes in audit — note “label_recorded” only unless product privacy allows) |
| `diy_tier_shown:advanced` | When Advanced next_step UI shown (flag true only) |
| `conclusion_reached:next_step_advanced` | Stage 7 success path |
| `conclusion_reached:call_pro` | Any Call-pro exit including flag-false |
| `conclusion_reached:emergency_exit` | Hazard exits |
| `notes.advanced_diy` | `off` \| `on` for session summary |

Partial paths retained on hazard close (see `conventions/hazard-exit-ramps.md`, `conventions/audit-trail.md`).

---

## Relation to Wave-1 conclude node

`ac.cool.conclude.call_pro_capacitor_contactor` remains the shared conclusion entry.

- **Now (flag false):** both choices → `call_pro` (`suspected_capacitor_contactor_advanced_off`) — no Advanced edge live.  
- **After flip (flag true):** add alternate edge from an explicit choice (e.g. gated “Continue with Advanced capacitor path (requires lockout)”) → `ac.adv.cap.prereq_gate_cluster`; keep “Call a professional” → `call_pro`.  
- Do not soft-enable by deleting Call-pro.

---

## Commander / Tree Lead statement

- Tree Lead **authored** this full gated Advanced chain as **specs** for Commander safety review (EOM floor).  
- Tree Lead will **not** open a coding PR that sets `advancedRepairsEnabled` true or wires live Advanced next_step until: (1) Commander approves this Advanced spec package, (2) attorney/Terms OK, (3) Commander explicit product flip.  
- Wave-2 **Basic** id deep-write remains gated on Commander approval of `tree/v0-wave2-node-ids.md` separately.  
- Lockout / discharge / never-live-work rules are **not** negotiable soften points.

**Advanced product status:** specs present in tree package; **runtime OFF** (`advancedRepairsEnabled` = false).
