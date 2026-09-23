# HP Wave-1 — Commander safety review (paper)

**Reviewer:** Second Wrench Commander (HVACR master tech safety doctrine)  
**Date:** 2026-09-23 ~18:10 EDT  
**Scope:** Paper only — 12 `hp.` deep-writes + edge map + boundaries + GO memo  
**Doctrine:** WE CANNOT HURT USERS · hard Call-pro / emergency over risky DIY · no HP Advanced electrical this wave  
**Comparison skim:** `ac.noise.hazard_screen`, `ac.cool.power.disconnect_visual`, `ac.start.breaker_disconnect`

---

## 1. Overall verdict

# **CONDITIONAL**

Paper is **safety-aligned** on Advanced electrical, refrigerant, RV force-outs, ice-chipping, and cover-opening: hits are almost entirely **prohibitions** and `call_pro` sinks, not DIY instructions. Mode / Emergency / ambient / defrost traps before “dead compressor” language are present. Honesty under-diagnosis of `short_cycle` and `unusual_noise` is correct for Wave-1.

**Not PASS yet** because several choice maps still carry **dual / product-may** nexts (not code-safe), `unusual_noise` lacks a proper hazard-screen choice fork (AC Wave-2 quality bar), and handback → `ac.cool.filter.check` can silently inherit AC `filter_clean_ok` → outdoor-fan wiring unless product stamps an HP exit. Fix those before code authorization.

**Not FAIL:** no instruction to do capacitor / contactor / panel / amp / inverter / gauges / refrigerant / force RV / jump safeties / chip ice / open covers to ID equipment. Ice keep-running hard-stops. Conclude node refuses DIY Advanced even if user asks.

---

## 2. Per-node table

| id | diy_tier | safety_gate | hazard / call_pro terminals | forbidden DIY language? | schema complete? | issues |
|---|---|---|---|---|---|---|
| `hp.intake.system_confirm` | basic | false | OOS / not_sure → `insufficient_info` (alt `call_pro` OOS) | **N** (prohibit covers) | **Y** | Dual alt terminal (`insufficient_info` vs `call_pro`) for OOS choices — lock one before code. Consent still points at AC intake (product route; see Q1). Dual-fuel allowed without intake flag (see Q6). |
| `hp.landing.picker` | basic | false (notes) | `unusual_noise` → `call_pro`; hazard prose → `emergency_exit`; mid-prompt Stop | **N** (prohibit chip ice / invent electrical) | **Y−** | **Must-fix:** single `landing_unusual_noise` choice maps only to `call_pro`; hazard→emergency is prose, not answer_ids (below AC `ac.noise.hazard_screen` bar). |
| `hp.mode.thermostat_check` | basic | false | wrong mode → `next_step` Basic; blank/not_sure → `insufficient_info`; short_cycle overlay docs call_pro downstream | **N** (no O/B DIY; no pry) | **Y** | Blank tstat: optional soft-link to AC batteries noted but not edged (see Q4). Overlay for short_cycle depends on emergency node — OK if that node stays locked. |
| `hp.mode.force_match_complaint` | basic | false | gone → Basic; remains → emergency node; cannot change → `call_pro`; not waited → `insufficient_info` | **N** (no magnet/force-valve) | **Y** | Hazard while waiting = notes only (OK if product reuses gate Stop). |
| `hp.mode.emergency_aux_off` | basic | false | short_cycle → `call_pro`; was_on → Basic / resume ambient; already_off → ambient; keeping_on → handback **or** call_pro; not_sure → `insufficient_info` | **N** (no amps / sequencers) | **Y−** | **Must-fix:** `keeping_emergency_on_purpose` dual next (handback vs call_pro). Prefer lock → `hp.handback.ac_filter_airflow` when airflow unknown. |
| `hp.ambient.outdoor_band` | basic | false | all → next nodes (conservative defrost) | **N** | **Y−** | `not_sure_ambient` cool-only alt `insufficient_info` — lock prefer observe vs stop. Mild+no_heat skip defrost is intentional / OK. |
| `hp.defrost.sanity` | basic | **conditional** true on keep-running | iced_solid → conclude; keep-running → **`emergency_exit`**; recover resolved → Basic; remains → capacity/observe | **N** (strong “do not chip / jump / magnets”) | **Y−** | `safety_gate` not a clean bool (schema wants bool) — set `true` because hazard choice exists. Otherwise excellent AC Wave-2 ice pattern. |
| `hp.heat.capacity_vs_dead` | basic | false | weak → Basic **and/or** observe; dead/aux/cool → observe; not_sure → insufficient **or** observe | **N** (no strip amps / refrigerant) | **Y−** | **Must-fix:** `weak_but_some_heat` and `not_sure_capacity` dual outcomes. Split mild+weak → observe vs deep-cold weak → Basic expectation. |
| `hp.observe.leaving_air_vs_mode` | basic | false | asymmetric → RV; outdoor dead → **`call_pro`**; matches → handback; defrost loop → defrost; cannot → `insufficient_info` | **N** (no cap/contactor/inverter DIY) | **Y** | outdoor_not_running Wave-1 call_pro-only (see Q3 — Commander prefers AC Basic visual reuse). One defrost loop OK if engine enforces single re-entry. |
| `hp.rv.mode_asymmetric` | **basic→pro_only** (hybrid) | false | confirmed / O-B → conclude; not asymmetric → handback **or** call_pro; not_sure → insufficient **or** handback | **N** (hard rules forbid force/jump/gauges) | **Y−** | **Must-fix:** lock `diy_tier` to single enum (`pro_only` recommended). Lock `not_sure_pattern` and `pattern_not_really_asymmetric` to one next each. |
| `hp.handback.ac_filter_airflow` | basic | false (hazard_now exit) | proceed → `ac.cool.filter.check`; skip/done → `call_pro`; hazard → **`emergency_exit`** | **N** (explicit not cap/contactor/refrigerant/panel) | **Y−** | **Must-fix:** product/edge rule so AC `filter_clean_ok` does **not** auto-route HP sessions into `ac.cool.outdoor.fan_spinning` (see Q2). |
| `hp.conclude.call_pro_defrost_valve_control` | pro_only | false | all choices → **`call_pro`** (refrigerant intent stamped) | **N** — lists forbidden acts; DIY-anyway choices still `call_pro` | **Y** | Soft hit: “shut disconnect/breaker only if you already know how” in leave-safe copy (see §3). Prefer parallel AC visual-only / “if you already use this for storms” language. Never emits Advanced. |

**Schema completeness legend:** Y = all required fields present and single-valued maps; Y− = fields present but enum/bool or next map needs lock for code.

---

## 3. Forbidden-topic scan (instruct vs forbid)

Scan topics: capacitor · contactor · panel interior · amp draw · inverter board · gauges · refrigerant · forcing reversing valve · jumping safeties · chipping ice with tools · opening covers to identify equipment · operating disconnect lever beyond visual.

### 3.1 Hits that **instruct** DIY of those acts

**None found.** No node tells the user to replace a capacitor/contactor, open a panel interior, measure amps, service an inverter board, attach gauges, add/remove refrigerant, force the RV, jump safeties, chip ice, open covers to ID gear, or operate a disconnect lever as a diagnostic step.

### 3.2 Hits that **forbid / call_pro / educate** (every occurrence)

| File | Quote / locus | Class |
|---|---|---|
| `hp.intake.system_confirm` | “Do not remove covers… or open the air-handler cabinet to identify it.” / not_sure: “**do not open covers**” / notes: “No capacitor / contactor / panel / refrigerant language here.” | **Forbid** |
| `hp.landing.picker` | Ice help: “do not chip ice.” Unusual noise outcome: “does **not** invent HP capacitor/contactor/inverter DIY.” | **Forbid** |
| `hp.mode.thermostat_check` | “Do not open the furnace / air-handler cabinet.” “Do not change O/B jumper settings here.” Blank: “do not pry… beyond normal battery access” | **Forbid** |
| `hp.mode.force_match_complaint` | Notes: “No O/B jumper DIY; no magnet / force-valve tricks.” | **Forbid** |
| `hp.mode.emergency_aux_off` | “Do not open the air handler to look at strip sequencers. Do not measure amps.” not_sure: “do not open… for sequencers or strip amps” / notes: strip amp draw = pro_only. short_cycle call_pro cites “refrigerant / electrical — not Wave-1 DIY” | **Forbid** (refrigerant named as pro bucket, not DIY) |
| `hp.ambient.outdoor_band` | mild+ice: “do not chip ice”; notes: no amp/board DIY for inverter quiet-low | **Forbid** |
| `hp.defrost.sanity` | “Do **not** chip ice with tools…”; “Do **not** remove panels or jump defrost sensors”; iced_solid: “no magnets, no jumping safeties, no gauges”; notes: never magnets/jump/gauges; “No capacitor / contactor / inverter-board DIY” | **Forbid** |
| `hp.heat.capacity_vs_dead` | “Do not measure strip amps. Do not open sequencers. Do not add refrigerant.” notes: amp draw = pro_only | **Forbid** |
| `hp.observe.leaving_air_vs_mode` | “no covers off”; “does **not** prove refrigerant charge”; outdoor_dead help: “no cap/contactor/inverter DIY”; map: “not capacitor DIY”; “Do **not** invent HP refrigerant DIY”; cannot_observe: “do not remove covers” | **Forbid** |
| `hp.rv.mode_asymmetric` | Hard rules: do not force valve with magnets/tools; do not jump safeties or open electrical panels; do not attach gauges or add/remove refrigerant | **Forbid** |
| `hp.handback.ac_filter_airflow` | “**not** permission to do capacitor, contactor, refrigerant, or panel work.” | **Forbid** |
| `hp.conclude.call_pro_defrost_valve_control` | Do-not list: capacitor/contactor; inverter board, amp draw, strip sequencers, panel interior; refrigerant gauges/charge; magnets, jumping safeties, forcing RV. DIY-anyway choices still → `call_pro` | **Forbid** / refuse |
| `hp.conclude…` leave-safe | “shut disconnect/breaker only if you already know how and conditions are dry/safe.” | **Soft hit — not Advanced DIY**, but **beyond pure visual**; tighten to match AC Wave-2 visual-only / storm-familiar shutoff wording so Wave-1 never teaches lever operate as procedure |
| README / candidates / boundaries / GO | Exclusion lists (cap, contactor, gauges, RV force, sequencers, etc.) | Policy forbid (OK) |

**Net:** Forbidden DIY language found as **instruction = N** on all 12 nodes. Soft editorial on conclude disconnect-shutoff copy only.

---

## 4. Edge consistency

### 4.1 Every `next` target exists (Wave-1 + reused AC)

| Target | Status |
|---|---|
| All 12 `hp.*` mutual nexts | **Exist** |
| `ac.cool.filter.check` | **Exists** |
| `ac.gate.cluster_entry`, `ac.session.consent` | **Exist** (spine) |
| Referenced reason/gate language `ac.gate.ice_keep_running`, `ac.noise.hazard_screen`, `ac.tstat.blank.batteries`, `ac.start.breaker_disconnect` | Exist as AC files; **not all are live edges yet** (blank batteries & breaker hub = Commander decisions) |

No dangling `hp.*` next id.

### 4.2 Paths end in allowed terminals

Allowed: `next_step` DIY Basic · `call_pro` · `emergency_exit` · `insufficient_info`.  
**DIY Advanced:** not used (correct — HP Advanced OFF).

Terminals observed: Basic next_step (mode fix, Auto coaching, Emergency educate, defrost recover OK, weak-heat expectation); call_pro (noise, short_cycle, outdoor dead, conclude, handback skip); emergency_exit (ice keep-running, hazard_now, unusual-noise hazard prose); insufficient_info (not sure / OOS / blank).

### 4.3 Soft continue after hazard?

| Path | Verdict |
|---|---|
| Ice keep-running | **Hard** `emergency_exit` — OK |
| Handback `hazard_now` | **Hard** `emergency_exit` — OK |
| Mid-tree burning/sparks/smoke/water | Prompt/notes Stop — OK if product enforces; not separate answer_ids on every node |
| Unusual noise hazards | **Weak:** prose on same choice as `call_pro` — **must harden** (see fixes) |
| Conclude DIY-anyway | Still `call_pro` — OK (no soft Advanced) |

### 4.4 Documented deviations (edge map) vs nodes

1. unusual_noise early call_pro — **matches** (needs hazard fork).  
2. short_cycle mode+Emergency then call_pro — **matches** emergency_aux_off maps.  
3. mild+no_heat skip defrost — **matches** ambient map.  
4. Handback after clean filter prefer call_pro — **noted** in handback; **not enforced** on AC filter node without product flag — **must-fix**.

---

## 5. Honesty flags (Heat Pump Lead)

| Flag | Tree behavior | Commander confirm |
|---|---|---|
| **short_cycle under-diagnose** | Landing → thermostat → Emergency clear → **`call_pro` `short_cycle_after_mode_basics`**; does **not** deep ambient/defrost/observe/electrical | **CONFIRMED — correct** |
| **unusual_noise under-diagnose** | Landing → early **`call_pro` `unusual_noise_hp_wave1`**; no HP noise DIY / cap / inverter tree | **CONFIRMED — correct** (still add hazard-screen choices) |

Also honest: leaving-air feel is crude; weak heat in deep cold vs charge/TXV not claimed as certainty; O vs B never assumed; conclude says “not a confirmed parts diagnosis.”

---

## 6. Recommended answers to Heat Pump Lead’s 6 open decisions

| # | Decision | Commander judgment |
|---|---|---|
| **(1)** HP after consent: agree → `hp.intake` without forking consent? | **YES — product routing, do not fork `ac.session.consent`.** Today consent `agree_18_terms` → `ac.cool.intake.system_confirm`. Product/session flag must override next to `hp.intake.system_confirm` for HP lane. Same consent legal text; no second consent node. |
| **(2)** After handback + clean filter: reuse AC outdoor fan/debris/ice chain OR short-circuit call_pro? | **Short-circuit `call_pro` (`hp_basics_clear_after_filter`).** After HP mode/defrost/observe, AC outdoor-fan chain is cool-only-shaped and can mislead on heat/defrost/RV. Prefer robustness. Optional later: reuse **only** AC returns/supplies if weak airflow flagged — still not outdoor fan/debris/ice for HP Wave-1. |
| **(3)** `outdoor_not_running`: reuse AC breaker/disconnect visuals OR Wave-1 call_pro-only? | **Reuse proven AC Basic visuals** via `ac.start.breaker_disconnect` → breaker_visual → disconnect_visual (**visual position only; no lever operate; no covers**). Identical and safe; not HP-specific Advanced risk. After visuals exhausted, that hub’s own `call_pro` stands. Do **not** invent HP cap/contactor path. |
| **(4)** Blank tstat: soft-link `ac.tstat.blank.batteries` or `insufficient_info`? | **Soft-link `ac.tstat.blank.batteries`** (identical Basic, safe). After batteries path, if still blank/unreadable → `call_pro` / `insufficient_info`; do not open equipment. |
| **(5)** Lock tree version `hp.air_source.v0`? | **YES — lock.** Bump on any edge rewire after first code land. |
| **(6)** Dual-fuel flag at intake vs later-only? | **Later-only (optional).** Keep intake confirm as written (dual-fuel may continue for HP mode checks). Do not add a blocking dual-fuel fork at intake in Wave-1. Optional `dual_fuel_suspected` stamp at capacity / Emergency educate if product wants analytics; combustion stays gate/`call_pro` only. |

---

## 7. Required fixes vs nice-to-have

### Must-fix before PASS (paper → code gate)

1. **Lock dual / “product may” nexts to a single next or terminal per `answer_id`:**  
   - `hp.mode.emergency_aux_off` / `keeping_emergency_on_purpose` → prefer **`hp.handback.ac_filter_airflow`** (airflow unknown).  
   - `hp.heat.capacity_vs_dead` / `weak_but_some_heat` → split by ambient flag: deep-cold weak → Basic expectation terminal; mild+weak → **`hp.observe.leaving_air_vs_mode`**.  
   - `hp.heat.capacity_vs_dead` / `not_sure_capacity` → **`hp.observe.leaving_air_vs_mode`** (continue) *or* hard `insufficient_info` — pick one (Commander: **observe**).  
   - `hp.rv.mode_asymmetric` / `not_sure_pattern` → **`hp.handback.ac_filter_airflow`** if filter not done else `insufficient_info`.  
   - `hp.rv…` / `pattern_not_really_asymmetric` → outdoor dead → `call_pro`; else handback (already nearly locked — remove “OR” prose).  
   - Intake OOS alts: lock **`insufficient_info`** (with user-facing “wrong tree / later phase” copy) *or* `call_pro` OOS — Commander: **`insufficient_info`** for cool-only/mini/WSHP/packaged/not_sure.

2. **`unusual_noise` hazard fork:** Add choices mirroring `ac.noise.hazard_screen` (burning/sparks/smoke → `emergency_exit`; grinding → `call_pro`/`emergency_exit`; no-hazard → `call_pro` `unusual_noise_hp_wave1`; unsure → safe halt). Do not leave hazard as prose on a single call_pro choice.

3. **Handback / AC filter collision:** Document and require session flag so `ac.cool.filter.check` `filter_clean_ok` under `hp_handback=filter_airflow` → **`call_pro` `hp_basics_clear_after_filter`** (not `ac.cool.outdoor.fan_spinning`). Paper edge map + handback notes + AC filter notes cross-link.

4. **Wire Commander Q3/Q4 into maps (paper):**  
   - `outdoor_not_running_when_should` → **`ac.start.breaker_disconnect`** (not immediate Wave-1-only call_pro).  
   - `tstat_blank_or_unreadable` → **`ac.tstat.blank.batteries`** (soft-link next).

5. **Schema cleanups for code:**  
   - `hp.rv.mode_asymmetric` `diy_tier`: set **`pro_only`** (prompt may stay Basic-toned in notes).  
   - `hp.defrost.sanity` `safety_gate`: set **`true`** (has emergency choice).  
   - Prefer bool `safety_gate` + choice-level hazard on landing/handback rather than “false but…”.

6. **Conclude leave-safe copy:** Soften disconnect language to “visual / only if you already safely use this shutoff for storms; Basic does not teach operating the lever” — align with AC Wave-2 disconnect_visual lock.

### Nice-to-have

- Explicit mid-tree hazard answer_ids on observe/defrost (not only prompt Stop).  
- Product audit when consent next is overridden to HP intake.  
- Single-loop guard note on `still_in_defrost_or_weird` → defrost (engine).  
- Brand/support line consistency on every node (most have spirit; conclude has support email).  
- Slice-2 backlog unchanged (staging / inverter quiet-low / dual-fuel coach).

---

## 8. Ready for code?

**After must-fixes: YES — ready for a shallow paper fix pass, then code.**  
**Without must-fixes: NO — needs another focused deep-write / edge-lock round** (not a full rewrite of all 12; the trunk is already at AC Wave-2 depth and safety doctrine is sound).

Suggested sequence:

1. Heat Pump Lead applies must-fixes §7 (maps + unusual_noise choices + handback flag contract + Q3/Q4 edges + schema enums).  
2. Commander re-spot-check (short review, not full re-read).  
3. On PASS → authorize code for `hp.air_source.v0` only; Advanced electrical remains OFF → any Advanced-shaped idea stays `call_pro`.

---

## Appendix — Quality bar vs AC Wave-2 skim

| AC node | Lesson for HP Wave-1 |
|---|---|
| `ac.noise.hazard_screen` | Separate hazard answer_ids; never soft continue — **HP unusual_noise must match** |
| `ac.cool.power.disconnect_visual` | Visual Off/On only; operate lever → call_pro — **reuse, don’t invent HP electrical** |
| `ac.start.breaker_disconnect` | Basic hub before silent call_pro; no Advanced from hub — **preferred target for outdoor_not_running** |

---

**Signed:** Commander review · 2026-09-23 EDT · doctrine WE CANNOT HURT USERS

---

## Re-check PASS (2026-09-23 evening)

Commander verified must-fixes 1–6 and supplemental A–E on disk.

| Item | Result |
|---|---|
| unusual_noise → hazard_screen → call_pro | PASS |
| outdoor_not_running → breaker → disconnect → call_pro (no Cap) | PASS |
| blank tstat → ac.tstat.blank.batteries | PASS |
| OR edges determinized | PASS |
| emergency_was_on_now_off → ambient (short_cycle call_pro) | PASS |
| keeping_emergency → handback only | PASS |
| RV diy_tier pro_only; defrost safety_gate true | PASS |
| conclude leave-safe visual/storm-familiar | PASS |
| handback → filter + returns/supplies → hp_basics_clear_after_filter | PASS |
| Tree `hp.air_source.v0` | PASS |
| Forbidden DIY instruct scan | PASS |

**Commander micro-fix on re-check:** `hp.rv.mode_asymmetric` outdoor-dead branch now also uses breaker→disconnect visuals before `hp_outdoor_not_running_wave1` (parity with observe).

# **PAPER PASS — code authorized** for `hp.air_source.v0` Basic (Advanced electrical remains OFF / call_pro).
