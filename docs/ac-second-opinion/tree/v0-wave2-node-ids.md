# Wave-2 node ids — APPROVED + deep-write DONE

**Status:** **APPROVED 2026-09-23 by Commander** — deep-write DONE.
**Wave-2 Basic package:** **READY FOR IMPLEMENTATION SPECS** (2026-09-23 Commander second pass PASS). Coding PR may follow Commander/cloud agent; public Advanced remains off.  
**Deep-write status:** **DONE 2026-09-23** — 7 Basic files in `tree/nodes/` + 8 Advanced files in `tree/advanced/nodes/`.  
**Tree:** `ac.cool.v0` (Wave-2 extension)  
**Product:** Second Wrench / AC Second Opinion  
**Date:** 2026-09-23  
**Scope:** U.S. residential split central AC, cooling-only  
**Advanced DIY product flag:** `advancedRepairsEnabled` = **FALSE** until attorney/Terms OK + Commander flip.  
**Brand:** scarlet wrench + dark charcoal / grey / walnut — never green; never invent “2W”  
**Support:** lonnie@secondwrench.co  
**Wave-1:** PASSED (12 nodes) + Wave-2 edge patches applied.

Specs only. No application code. No public flag flip. Capacitor Advanced deep-written under `tree/advanced/nodes/` for Commander **second** safety pass — not a coding PR / public enablement yet.

---

## Shipping policy — Advanced (PRODUCT LOCK 2026-09-23)

| Rule | Detail |
|---|---|
| Specs | **Build** capacitor Advanced DIY fully in the tree package now (complete gated specs). Implementation coding later, only after Commander safety review of specs. |
| Runtime flag | `advancedRepairsEnabled` stays **FALSE** until attorney/Terms OK + Commander explicit flip. |
| While flag false | Live users on cap/contactor paths stay on **Call-pro** via existing `ac.cool.conclude.call_pro_capacitor_contactor` (reason `suspected_capacitor_contactor_advanced_off`). Never show `next_step` DIY Advanced. |
| When flag true | After legal + Commander flip: gated Advanced path in `tree/advanced/` may run. |
| Softening | Do **not** soften lockout, discharge, or never-live-work rules in specs or product. |
| Public vs private | **public_runtime=flag_off**. **private_sandbox_may_enable=true** only after Commander safety pass (Donnie private Netlify sandbox). Public beta stays Call-pro for Advanced. |

---


---

## Commander safety decisions (2026-09-23) — LOCKED

### INCLUDE (deep-write these 7)
1. `ac.cool.power.breaker_visual`
2. `ac.cool.power.disconnect_visual` — **VISUAL POSITION ONLY** (do not instruct operating exterior lever/handle in Basic)
3. `ac.start.breaker_disconnect` (hub)
4. `ac.cool.airflow.returns_supplies`
5. `ac.cool.outdoor.debris_clearance`
6. `ac.noise.hazard_screen`
7. `ac.noise.clarify_outdoor_hum`

### CUT (do not deep-write)
- `ac.gate.ice_keep_running` — keep ice keep-running **inlined** on `ac.cool.indoor.ice_lines_coil` only
- `ac.start.tstat_calls` — REJECT; reuse `mode_setpoint` / silent_vs_hum Cool-calling language

### Edge changes (update Wave-1 notes + deep-write)
- Weak airflow: `filter_clean_ok` + `landing=weak_airflow` → `ac.cool.airflow.returns_supplies`, then `call_pro` if still weak (replaces Wave-1 short-circuit `weak_airflow_after_filter`).
- Unusual noise: `landing_unusual_noise` → `ac.noise.hazard_screen` → `ac.noise.clarify_outdoor_hum`; **only** outdoor hum while Cool calling / fan not spinning → `ac.start.outdoor_silent_vs_hum`; else `call_pro` (`unusual_noise_unresolved`). Hazards → emergency_exit / call_pro, never soft continue.

### Disconnect visual-only lock
Observation of Off/On from safe dry ground only. If they need to operate disconnect to proceed and cannot safely confirm manufacturer homeowner path → `call_pro`. Fused pull-out / open-door / internals → always `call_pro`.

## Safety doctrine (standing orders 2026-09-23)

- Cannot hurt users. Prefer Call-pro / emergency over risky DIY.
- Ask Commander when unsure. Do not invent diagnoses. The tree owns conclusions.
- Basic means truly Basic: exterior / visual / furniture-vent / panel **door** only — no panel interior, no live probing, no energized diagnostics.
- Electrical-adjacent that is not truly Basic → exclude or REJECTED; default `call_pro` or `emergency_exit`.
- Hazard gates: no soft continue. Wet / cannot kill power / aluminum uncertain → Call-pro or emergency, never proceed.
- EOM floor: Wave-2 Basic nodes + capacitor Advanced DIY **full gated specs** (product flag false until flip).
- Outcomes only: `next_step` DIY Basic | Advanced (runtime: Advanced only if `advancedRepairsEnabled`), `call_pro`, `emergency_exit`, `insufficient_info`.

---

## Proposed Wave-2 node ids (INCLUDE — pass the bar)

| # | id | Purpose (one line) | diy_tier | Why Basic is truly Basic / why Call-pro default | Wires-from (Wave-1 edge) | Risk notes |
|---|---|---|---|---|---|---|
| 1 | `ac.cool.power.breaker_visual` | Panel **door** open only: visually confirm breaker trip/On/Off label for outdoor/AC circuit; optional homeowner reset if dry/safe and breaker is standard toggle | `basic` | Exterior of panel only — read labels / see if handle is tripped. No removing deadfront, no bus bars, no probing. Reset only if dry floor/hands and user already knows which breaker; else `call_pro` | `ac.start.outdoor_silent_vs_hum` (`outdoor_silent`); via hub `ac.start.breaker_disconnect` | `cannot_kill_power` / wet / flood / aluminum uncertain / unsure which breaker → `call_pro` or `emergency_exit`. Never panel interior. |
| 2 | `ac.cool.power.disconnect_visual` | Outdoor disconnect: **VISUAL Off/On position only** from safe dry ground — do NOT instruct operating the lever in Wave-2 Basic | `basic` | **Visual only.** No operate-lever instructions in Basic. No open-door fuse pull, no whip work, no internals. Need to operate → call_pro | After breaker visual clear on silent path; hub `ac.start.breaker_disconnect` | Unsure / fused pull-out only / wet / cannot operate safely → `call_pro`. `high_voltage_intent` if user wants internals → `call_pro` hard. |
| 3 | `ac.start.breaker_disconnect` | Silent-path hub: sequence Basic power visuals (breaker door → outdoor disconnect exterior) before any further start DIY | `basic` | Router/observation hub only; does not itself open panels or pull fuses. Outcomes are next to Basic visuals or `call_pro` | `ac.start.outdoor_silent_vs_hum` (`outdoor_silent`); optional re-entry from Not cooling silent fan path | If user cannot do either check safely → terminal `call_pro` (`outdoor_silent_will_not_start` / `cannot_kill_power`). No Advanced from this hub. |
| 4 | `ac.cool.airflow.returns_supplies` | Check returns not blocked by furniture/rugs; supply registers open — no duct work | `basic` | Furniture / rugs / closed vents only. No duct cutting, no register removal into duct chase, no blower access | `ac.cool.filter.check` when `landing=weak_airflow` + `filter_clean_ok` (replaces Wave-1 short-circuit `weak_airflow_after_filter` **only if** Commander approves this edge change); optional Not cooling after filter | Still blocked after clear → `call_pro`. Do not invent duct sealing DIY. |
| 5 | `ac.cool.outdoor.debris_clearance` | Clear leaves/debris from outdoor unit **exterior**; confirm side/top clearance | `basic` | Exterior only. Visual OK with power on from safe distance; **shut off** if reaching into grille. No coil fin combing requiring tools into coil depth if that becomes invasive | `ac.cool.outdoor.fan_spinning` (`fan_spinning`) before or after ice path per deep-write; also Not cooling chain when fan spins but cooling fails after ice clear | Wet/electrical nearby → gate. Reaching past grille without kill → instruct kill first or `call_pro`. |
| 6 | `ac.noise.hazard_screen` | Unusual-noise entry: early-exit burning / sparks / grinding metal / smoke / electrical heat smell | `basic` (observation; exits are pro/emergency) | Screening only — no DIY repair of noise sources. Dangerous answers → `emergency_exit` / `call_pro`, never soft continue | `ac.cool.landing.picker` (`landing_unusual_noise`) — replaces Wave-1 immediate `unusual_noise_early` terminal **when approved** | Burning/smoke/sparks → kill if safe + emergency/pro. Grinding metal-on-metal → Off if safe + `call_pro`. No vibration FFT / mic diagnostics. |
| 7 | `ac.noise.clarify_outdoor_hum` | After hazard screen clear: clarify “outdoor hum/buzz only while Cool calling, fan not spinning?” → route to silent_vs_hum or stay call_pro | `basic` | Clarifying choice only. Safe route is observation already owned by Wave-1 `ac.start.outdoor_silent_vs_hum`. Indoor screech/rattle/unknown → remain `call_pro` | `ac.noise.hazard_screen` (non-hazard answers) | Do not soft-bypass hazard screen. Only **outdoor hum while Cool calling** may go to `ac.start.outdoor_silent_vs_hum`; all other noise → `call_pro` (`unusual_noise_unresolved`). |
| 8 | `ac.gate.ice_keep_running` | **OPTIONAL promote** — standalone ice keep-running gate for mid-tree reuse | `basic` / gate | Same doctrine as Wave-1 inlined choice on `ac.cool.indoor.ice_lines_coil`; promote only if reuse needs a shared id | Today: choice on ice node. Promote if other nodes must fire same gate without duplicating copy | Affirmative keep-running → `emergency_exit` / gate fire. No soft override. |
| 9 | `ac.start.tstat_calls` | **OPTIONAL** — confirm thermostat is actually calling Cool (display/mode/setpoint) on Will not start before power visuals | `basic` | Settings observation only; overlaps Wave-1 `ac.cool.tstat.mode_setpoint` — include only if Will not start needs a lighter dedicated call-check | `ac.cool.landing.picker` Will not start **or** before `ac.start.outdoor_silent_vs_hum` | If redundant with mode_setpoint, Commander may REJECT to avoid duplicate. Blank display → Blank thermostat landing, not invent C-wire DIY. |

**Proposed INCLUDE count:** 9 ids (7 required-if-safe + 2 optional). Commander may cut optionals.

---

## REJECTED / mark not Basic (do not deep-write in Wave-2)

| Candidate / pattern | Disposition | Reason |
|---|---|---|
| Panel interior / deadfront off / bus work | REJECTED | Never homeowner DIY; pro_only / electrician |
| Live probing, meter on energized terminals | REJECTED | Energized diagnostics = pro_only |
| Disconnect door open + fuse pull DIY (beyond manufacturer homeowner guidance) | REJECTED | Default `call_pro`; not Basic Wave-2 |
| Amp-clamp / amp-draw procedures | NOT IN WAVE-2 | Defer; often stays pro; only if later gated Advanced |
| Contactor inspection/replacement DIY | NOT IN WAVE-2 | Advanced-bound; stays `call_pro` via row-12 conclusion until separately gated later |
| Capacitor replace as live Basic | REJECTED | Not Basic. Full Advanced gated specs in `tree/advanced/capacitor-gated-outline.md`; runtime `advancedRepairsEnabled` FALSE until legal + Commander flip — live users stay Call-pro |
| Refrigerant / sealed system / gauge manifold | NOT IN WAVE-2 | pro_only / EPA 608 |
| Aluminum branch wiring remediation | REJECTED | Gate → electrician |
| Coil chemical clean with cabinet teardown | NOT IN WAVE-2 | pro_only |
| Condensate pump rebuild / chemistry | NOT IN WAVE-2 | Deferred beyond EOM floor |
| Noise vibration FFT / sensor diagnostics | REJECTED | Out of scope; early call_pro / clarifying hum only |
| `ac.tstat.blank.power_steal_cwire` DIY | NOT IN WAVE-2 | Remains `call_pro` |
| `ac.cool.condensate.*` full tree | NOT IN WAVE-2 | Ice/water paths stay Wave-1 + call_pro |
| `ac.cool.indoor.thaw_off` standalone | NOT IN WAVE-2 | Thaw remains inlined Basic on ice node unless Commander asks later |

---

## Explicitly NOT in Wave-2 (summary list)

- Contactor DIY  
- Panel interior work  
- Refrigerant procedures  
- Energized diagnostics inside equipment  
- Amp-draw / clamp meters (unless a later gated Advanced wave)  
- Disconnect internals / whip / 240V wiring changes  
- Capacitor as **live** product path while `advancedRepairsEnabled` is false (full specs exist; runtime routes Call-pro)  
- C-wire / power-steal thermostat electrical DIY  
- Full condensate subtree  

---

## Numbered priority order for deep-write (after Commander approves ids)

1. `ac.cool.power.breaker_visual` — **DONE** → `nodes/ac.cool.power.breaker_visual.md`  
2. `ac.cool.power.disconnect_visual` — **DONE** → `nodes/ac.cool.power.disconnect_visual.md` (visual-only)  
3. `ac.start.breaker_disconnect` — **DONE** → `nodes/ac.start.breaker_disconnect.md`  
4. `ac.cool.airflow.returns_supplies` — **DONE** → `nodes/ac.cool.airflow.returns_supplies.md`  
5. `ac.cool.outdoor.debris_clearance` — **DONE** → `nodes/ac.cool.outdoor.debris_clearance.md`  
6. `ac.noise.hazard_screen` — **DONE** → `nodes/ac.noise.hazard_screen.md`  
7. `ac.noise.clarify_outdoor_hum` — **DONE** → `nodes/ac.noise.clarify_outdoor_hum.md`  
8. `ac.gate.ice_keep_running` — **CUT** — keep inlined on `ac.cool.indoor.ice_lines_coil`  
9. `ac.start.tstat_calls` — **CUT / REJECT** — do not deep-write  

Deep-write rule (Basic): full prompts/choices/`next_outcome_map` **only** for Commander-approved Wave-2 Basic ids above — **complete**.

Capacitor Advanced: outline + **8 deep-written node files** in `tree/advanced/nodes/` for Commander second safety pass. **No coding PR** / no public `advancedRepairsEnabled` flip until attorney/Terms OK + Commander flip. While flag is false, live path remains conclude → `call_pro`.

---

## Open questions for Commander only — ANSWERED 2026-09-23

1. **Optional promote `ac.gate.ice_keep_running`:** **CUT** — keep ice keep-running **inlined** on `ac.cool.indoor.ice_lines_coil` only.  
2. **Optional `ac.start.tstat_calls`:** **CUT / REJECT** — reuse `mode_setpoint` / silent_vs_hum Cool-calling language.  
3. **Disconnect scope:** **VISUAL POSITION ONLY** — do not instruct operating exterior lever/handle in Basic.  
4. **Weak airflow edge:** **APPROVED** — `filter_clean_ok` + weak_airflow → `returns_supplies`, then call_pro if still weak.  
5. **Unusual noise wiring:** **APPROVED** — picker → hazard_screen → clarify_outdoor_hum; only outdoor hum+Cool+no fan → silent_vs_hum.

---

## Approval ask — CLOSED for Basic ids; Advanced second pass open

- INCLUDE 7: **APPROVED** + **deep-write DONE**. Optionals #8–#9: **CUT**.  
- REJECTED / NOT IN WAVE-2 lists: confirmed.  
- `advancedRepairsEnabled` remains **FALSE** until attorney/Terms OK + Commander flip; live cap/contactor → Call-pro.  
- Advanced: 8 node files deep-written in `tree/advanced/nodes/` — awaiting **Commander second safety pass** before private sandbox enable; public stays flag_off. No coding PR / no GitHub→private Netlify wire.

**Wave-2 Basic deep-write:** DONE 2026-09-23. Capacitor Advanced specs: deep-written; product flag stays false pending second pass + legal.
