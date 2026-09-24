# `hp.` paper nodes — Wave-1

**Tree version (LOCKED):** **`hp.air_source.v0`**  
**Product:** Second Wrench / Heat Pump Lead  
**Scope:** U.S. residential **air-source ducted** heat pumps (mode / defrost / RV awareness)  
**Schema:** Extend AC conventions in `docs/ac-second-opinion/conventions/`. Runtime: `assets/flow.js`.  
**Brand:** scarlet wrench + dark charcoal / grey / walnut — **never green**  
**Support:** lonnie@secondwrench.co  

Paper specs for the live tree. HP Advanced electrical OFF → `call_pro`. Public `advancedRepairsEnabled` stays false.

---

## Session spine (LIVE wire order)

| Step | Node id | Note |
|---|---|---|
| 1 | `ac.gate.cluster_entry` | Reuse verbatim (AC tree) |
| 2 | `ac.session.consent` | Reuse verbatim; product routes HP agree → row 3 (LOCKED) |
| 3 | `hp.intake.system_confirm` | HP lane starts here |
| 4 | `hp.landing.picker` | Sets `hp_landing` |

Edge map: [`../../04-wave1-edge-map.md`](../../04-wave1-edge-map.md)  
Commander review: [`../../hp-wave1-commander-safety-2026-09-23.md`](../../hp-wave1-commander-safety-2026-09-23.md)

---

## Wave-1 — all 12 deep-writes

| # | id | File | Purpose (brief) |
|---|---|---|---|
| 1 | `hp.intake.system_confirm` | [hp.intake.system_confirm.md](./hp.intake.system_confirm.md) | Confirm air-source ducted HP; defer mini-split / WSHP / cool-only AC |
| 2 | `hp.landing.picker` | [hp.landing.picker.md](./hp.landing.picker.md) | Route: no_heat / no_cool / both / ice_outdoor / short_cycle / unusual_noise→AC hazard screen |
| 3 | `hp.mode.thermostat_check` | [hp.mode.thermostat_check.md](./hp.mode.thermostat_check.md) | Mode Heat/Cool/Auto/Emergency; blank → `ac.tstat.blank.batteries` |
| 4 | `hp.mode.force_match_complaint` | [hp.mode.force_match_complaint.md](./hp.mode.force_match_complaint.md) | Force Heat or Cool; wait; kill Auto trap |
| 5 | `hp.mode.emergency_aux_off` | [hp.mode.emergency_aux_off.md](./hp.mode.emergency_aux_off.md) | Accidental Emergency/Aux; was_on→ambient; keeping_on→handback |
| 6 | `hp.ambient.outdoor_band` | [hp.ambient.outdoor_band.md](./hp.ambient.outdoor_band.md) | Mild / near freezing / well below — feeds defrost + capacity |
| 7 | `hp.defrost.sanity` | [hp.defrost.sanity.md](./hp.defrost.sanity.md) | Normal defrost vs iced solid; ice keep-running; `safety_gate: true` |
| 8 | `hp.heat.capacity_vs_dead` | [hp.heat.capacity_vs_dead.md](./hp.heat.capacity_vs_dead.md) | Weak heat in deep cold vs no heat at all (deterministic ambient split) |
| 9 | `hp.observe.leaving_air_vs_mode` | [hp.observe.leaving_air_vs_mode.md](./hp.observe.leaving_air_vs_mode.md) | Leaving air vs mode; outdoor dead → breaker→disconnect→call_pro |
| 10 | `hp.rv.mode_asymmetric` | [hp.rv.mode_asymmetric.md](./hp.rv.mode_asymmetric.md) | Cool↔heat asymmetric → O-B / valve / control (**diy_tier: pro_only**) |
| 11 | `hp.handback.ac_filter_airflow` | [hp.handback.ac_filter_airflow.md](./hp.handback.ac_filter_airflow.md) | → **`ac.cool.filter.check`** (+ returns/supplies only) then call_pro |
| 12 | `hp.conclude.call_pro_defrost_valve_control` | [hp.conclude.call_pro_defrost_valve_control.md](./hp.conclude.call_pro_defrost_valve_control.md) | Failed defrost / stuck valve / O-B → `call_pro` (no DIY electrical) |

---

## Hard exclusions (Wave-1)

- Capacitor / contactor / panel / amp / inverter board DIY (outdoor_not_running never Cap conclude)  
- Refrigerant / gauges / RV magnet force-outs / jumping safeties  
- Mini-split (`ms.`) / WSHP (`wshp.`) / dual-fuel combustion DIY (no Wave-1 dual-fuel intake flag)  
- Strip sequencers; Slice-2 staging/inverter deep trunks  
- Cool outdoor fan / debris / ice after HP handback  

---

## Status

**Paper deep-write:** DONE 2026-09-23 (all 12)  
**Commander must-fixes 1–6 + supplemental A–E:** applied 2026-09-23  
**Commander re-check:** PASS — Basic code authorized; Advanced electrical remains OFF  
**Code:** `assets/flow.js` tree `hp.air_source.v0` (content `2026-09-24.1`)
