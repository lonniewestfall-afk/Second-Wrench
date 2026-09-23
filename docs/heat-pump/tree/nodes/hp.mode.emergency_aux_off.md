# hp.mode.emergency_aux_off

## id
`hp.mode.emergency_aux_off`

## prompt
**Emergency / Aux heat — is it on by accident?**

Many thermostats have **Emergency Heat**, **Aux**, **Em Heat**, or similar. On a heat pump, that often means:

- The outdoor compressor may be **commanded off on purpose**
- Indoor heat comes from electric strips and/or a furnace only
- Homeowners often think the “heat pump is broken” when Emergency was selected during a cold snap

Check the thermostat display and any Aux / Emergency indicator. Do not open the air handler to look at strip sequencers. Do not measure amps.

If Emergency / Aux is on and your complaint is “heat pump outdoor unit not running” or “no heat pump heat,” turn Emergency **Off** and set normal **Heat** with setpoint a few degrees above room temp. **Wait 10–15 minutes** for the outdoor unit / call to settle before judging the compressor path, then continue.

If you are **keeping** Emergency / Aux on on purpose, outdoor idle may be normal — next we check shared filter / airflow basics if you still have no useful warm air or airflow is unknown.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `emergency_was_on_now_off` | Emergency/Aux was on — I turned it Off and set normal Heat | Wait 10–15 min, then continue ambient trunk (session spine). |
| `emergency_already_off` | Emergency/Aux is already Off (or not present on my stat) | Continue ambient / defrost trunk. |
| `keeping_emergency_on_purpose` | I am keeping Emergency/Aux on on purpose | Outdoor idle may be normal — strips/furnace only; check filter/airflow next. |
| `not_sure_emergency` | I cannot tell if Emergency/Aux is on | Do not open equipment to find strip wiring. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `emergency_was_on_now_off` | **If `hp_landing=short_cycle`:** **terminal** `call_pro` (reason: `short_cycle_after_mode_basics`) after noting Emergency was cleared — Wave-1 stops before deep electrical. **Else:** **next** `hp.ambient.outdoor_band` — wait coaching is in the prompt (10–15 minutes in normal Heat, or Cool if cool complaint); confirm outdoor behavior from a safe distance while continuing the session spine. Do **not** orphan to a terminal Basic that drops the trunk. |
| `emergency_already_off` | **If `hp_landing=short_cycle`:** **terminal** `call_pro` (reason: `short_cycle_after_mode_basics`) — mode basics clear; short-cycle diagnosis beyond this is pro (lockout / control / refrigerant / electrical — not Wave-1 DIY). **Else:** **next** `hp.ambient.outdoor_band` |
| `keeping_emergency_on_purpose` | **next** `hp.handback.ac_filter_airflow` — airflow unknown / no-warm-air with Emergency on: shared filter+returns/supplies path. Outdoor idle may be expected on purpose; do not diagnose sequencers. (**No** dual `call_pro` alt on this answer.) |
| `not_sure_emergency` | **terminal** `insufficient_info` — use thermostat manual / labels; do not open the air handler for sequencers or strip amps (pro_only) |

## diy_tier
`basic`

## safety_gate
`false`

## hazard_exit
`null`

## audit_event
`node_entered:hp.mode.emergency_aux_off` · `answer_selected:<id>` · short_cycle exits: `conclusion_reached:call_pro` · was_on_now_off (non-short_cycle): continue ambient · keeping_on: handoff handback · `diy_tier_shown:basic` when Basic coaching shown in prompt

## notes
- Node type: question / coaching.
- Tree version: **`hp.air_source.v0`**.
- Strip sequencers, strip amp draw, high-voltage strip circuits = **pro_only** — never DIY in Wave-1.
- Dual-fuel: Emergency/Aux may engage furnace — still no combustion DIY; gas smell → Stop / `ac.gate` discipline.
- **Must-fix #5:** `emergency_was_on_now_off` (non-short_cycle) → **next** `hp.ambient.outdoor_band` with wait coaching in prompt (not orphaning terminal Basic). short_cycle overlay stays call_pro.
- **Supplemental A:** `keeping_emergency_on_purpose` → **next** `hp.handback.ac_filter_airflow` only (dual call_pro alt dropped).
- Wave-1 paper: deep-write DONE 2026-09-23; Commander must-fix pass 2026-09-23.
