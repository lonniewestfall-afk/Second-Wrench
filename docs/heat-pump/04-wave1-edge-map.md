# HP Wave-1 — Edge map (paper)

**Date:** 2026-09-23  
**Tree version (LOCKED):** **`hp.air_source.v0`**  
**Scope:** 12 deep-written `hp.` nodes + reused AC gate/consent + hazard screen + blank batteries + power visuals + handback to `ac.cool.filter.check` (+ returns/supplies only)  
**Code:** AUTHORIZED 2026-09-23 — Commander paper PASS (`hp.air_source.v0` Basic; HP Advanced electrical OFF)  
**Authority:** `/workspace/second-wrench/reviews/hp-wave1-commander-safety-2026-09-23.md` (CONDITIONAL PASS must-fixes + supplemental A–E)

---

## Locked decisions (stamp)

1. **Consent reuse:** `ac.session.consent` verbatim; product routes `agree_18_terms` → `hp.intake.system_confirm` for HP sessions (do not fork consent).
2. **After handback:** filter + returns/supplies only → `call_pro` `hp_basics_clear_after_filter`. **Never** auto outdoor fan / debris / ice.
3. **outdoor_not_running:** `ac.cool.power.breaker_visual` → `ac.cool.power.disconnect_visual` → `call_pro` `hp_outdoor_not_running_wave1` (no Cap/contactor). Hub `ac.start.breaker_disconnect` OK only if it lands on those same visuals.
4. **Blank tstat:** soft-link **next** `ac.tstat.blank.batteries`.
5. **Tree version:** **`hp.air_source.v0`**.
6. **Dual-fuel:** later-only — no Wave-1 intake flag.

---

## Session spine (reuse AC)

```
ac.gate.cluster_entry
  └─ none_of_these → ac.session.consent
       └─ agree_18_terms → hp.intake.system_confirm   [PRODUCT ROUTING — LOCKED]
            └─ air_source_ducted_hp → hp.landing.picker
```

Hazards on cluster → `emergency_exit` (unchanged AC map).  
Consent decline → `insufficient_info` / session end.  
Intake OOS / not_sure → `insufficient_info` only.

---

## Landing → first hop (`hp_landing` flag)

| Landing answer | Flag | Next |
|---|---|---|
| `landing_no_heat` | `no_heat` | `hp.mode.thermostat_check` |
| `landing_no_cool` | `no_cool` | `hp.mode.thermostat_check` |
| `landing_both_modes_fail` | `both_modes_fail` | `hp.mode.thermostat_check` |
| `landing_ice_outdoor` | `ice_outdoor` | `hp.mode.thermostat_check` |
| `landing_short_cycle` | `short_cycle` | `hp.mode.thermostat_check` → after Emergency clear → **call_pro** `short_cycle_after_mode_basics` |
| `landing_unusual_noise` | `unusual_noise` | **next** `ac.noise.hazard_screen` → hazards keep AC emergency/call_pro; **clear** → **call_pro** `unusual_noise_hp_wave1` (not AC outdoor-hum clarify) |

---

## Mode trunk

```
hp.mode.thermostat_check
  ├─ mode_auto → hp.mode.force_match_complaint
  │    ├─ forced_problem_gone → next_step DIY Basic (Auto coaching)
  │    ├─ forced_problem_remains → hp.mode.emergency_aux_off
  │    ├─ could_not_change_mode → call_pro
  │    └─ not_sure_waited → insufficient_info
  ├─ mode_emergency_or_aux → hp.mode.emergency_aux_off
  ├─ mode_matches_complaint → hp.mode.emergency_aux_off
  ├─ mode_wrong_for_complaint → next_step DIY Basic (set mode)
  ├─ tstat_blank_or_unreadable → ac.tstat.blank.batteries   [LOCKED soft-link]
  └─ not_sure → insufficient_info

hp.mode.emergency_aux_off
  ├─ emergency_was_on_now_off → hp.ambient.outdoor_band     [wait coaching in prompt; short_cycle → call_pro]
  ├─ emergency_already_off → hp.ambient.outdoor_band        [short_cycle → call_pro]
  ├─ keeping_emergency_on_purpose → hp.handback.ac_filter_airflow   [LOCKED; no dual call_pro]
  └─ not_sure_emergency → insufficient_info
```

---

## Ambient → defrost → capacity → observe

```
hp.ambient.outdoor_band
  ├─ mild_warm + ice_outdoor → hp.defrost.sanity
  ├─ mild_warm + no_heat → hp.heat.capacity_vs_dead
  ├─ mild_warm + no_cool/both → hp.observe.leaving_air_vs_mode
  ├─ near_freezing / well_below → hp.defrost.sanity
  └─ not_sure → defrost (heat/ice) else observe   [cool-only: observe — NOT insufficient_info]

hp.defrost.sanity   [safety_gate: true]
  ├─ recover + complaint remains (heat/ice/both) → hp.heat.capacity_vs_dead
  ├─ recover + no_cool remains → hp.observe.leaving_air_vs_mode
  ├─ recover + resolved → next_step DIY Basic
  ├─ iced_solid_no_recover → hp.conclude.call_pro_defrost_valve_control
  ├─ not_applicable → capacity (no_heat) else observe
  ├─ want_keep_running_despite_ice → emergency_exit (ice_keep_running)
  └─ not_sure → insufficient_info

hp.heat.capacity_vs_dead
  ├─ weak_but_some_heat + ambient near_freezing|well_below → next_step DIY Basic (capacity expectation)
  ├─ weak_but_some_heat + mild_warm|unknown → hp.observe.leaving_air_vs_mode
  ├─ no_heat_at_all → hp.observe.leaving_air_vs_mode
  ├─ aux_only_seems_to_heat → hp.observe.leaving_air_vs_mode
  ├─ not_applicable_cool_landing → hp.observe.leaving_air_vs_mode
  └─ not_sure_capacity → hp.observe.leaving_air_vs_mode

hp.observe.leaving_air_vs_mode
  ├─ leaving_air_matches_mode → hp.handback.ac_filter_airflow
  ├─ mode_asymmetric_feel → hp.rv.mode_asymmetric
  ├─ outdoor_not_running_when_should → ac.cool.power.breaker_visual
  │      → ac.cool.power.disconnect_visual
  │      → call_pro hp_outdoor_not_running_wave1   [NEVER Cap conclude]
  ├─ still_in_defrost_or_weird → hp.defrost.sanity (one loop)
  └─ cannot_observe_safely → insufficient_info
```

---

## RV / conclude / handback

```
hp.rv.mode_asymmetric   [diy_tier: pro_only]
  ├─ asymmetric_pattern_confirmed → hp.conclude.call_pro_defrost_valve_control
  ├─ recent_tstat_swap_ob_unsure → hp.conclude.call_pro_defrost_valve_control
  ├─ pattern_not_really_asymmetric → outdoor dead: breaker_visual → disconnect_visual → call_pro hp_outdoor_not_running_wave1
  │                                 else: hp.handback.ac_filter_airflow
  └─ not_sure_pattern → handback if filter not done this session else insufficient_info

hp.conclude.call_pro_defrost_valve_control
  └─ all choices → call_pro (pro_only; no Advanced DIY; leave-safe = visual/storm-familiar only)

hp.handback.ac_filter_airflow
  ├─ proceed_ac_filter → ac.cool.filter.check  [flag hp_handback=filter_airflow]
  │      HP PRODUCT STAMP (LOCKED):
  │        filter_clean_ok + weak airflow → ac.cool.airflow.returns_supplies
  │          → then call_pro hp_basics_clear_after_filter
  │        filter_clean_ok (else) → call_pro hp_basics_clear_after_filter
  │        NEVER ac.cool.outdoor.fan_spinning / debris / ice
  ├─ filter_already_done → call_pro hp_basics_clear_after_filter
  ├─ decline_handback → call_pro user_requests_pro_after_mode_clear
  └─ hazard_now → emergency_exit
```

---

## Terminal outcome legend (Wave-1)

| Outcome | Where used (examples) |
|---|---|
| `next_step` DIY Basic | Wrong mode fix; Auto coaching; defrost recover OK; weak-heat deep-cold expectation |
| `next_step` DIY Advanced | **NOT USED** — HP Advanced electrical OFF → call_pro |
| `call_pro` | Unusual noise (after hazard clear); short cycle after mode; outdoor not running after power visuals; conclude defrost/valve/O-B; handback skip / basics clear |
| `emergency_exit` | Ice keep-running; mid-tree hazard; cluster hazards; noise hazard answers |
| `insufficient_info` | Not sure / out-of-scope equipment / RV not_sure when filter already done |

---

## Documented deviations from “default full trunk”

1. **unusual_noise** — hazard screen then call_pro (no HP noise DIY / no AC outdoor-hum clarify).  
2. **short_cycle** — mode + Emergency only, then call_pro.  
3. **mild + no_heat** — may skip defrost wait → capacity directly (ice_outdoor still forces defrost).  
4. **Handback after clean filter** — returns/supplies if weak airflow, else **`call_pro` `hp_basics_clear_after_filter`**; never cool outdoor fan/debris/ice.  
5. **outdoor_not_running** — AC breaker + disconnect visuals only, then call_pro (no Cap).
