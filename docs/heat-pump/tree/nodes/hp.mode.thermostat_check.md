# hp.mode.thermostat_check

## id
`hp.mode.thermostat_check`

## prompt
**Thermostat — mode and call for your complaint**

Without opening equipment or pulling the thermostat off the wall, look at the thermostat you already use.

1. What **mode** is it in right now? (Heat, Cool, Auto, Emergency / Aux / Em Heat — wording varies by brand)
2. Is the setpoint in a direction that should actually call for your complaint?  
   - **No heat:** Heat (or forced heat) with setpoint **above** room temp a few degrees  
   - **No cool:** Cool with setpoint **below** room temp a few degrees  
3. Fan **Auto** or **On** is fine for this check.

Do not open the furnace / air-handler cabinet. Do not change O/B jumper settings here.

If the display is blank or unreadable, say so — do not pry the thermostat apart beyond normal battery access you already know from the manual.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `mode_auto` | Mode is Auto | Auto trap — force Heat or Cool to match the complaint first. |
| `mode_emergency_or_aux` | Mode is Emergency / Aux / Em Heat | Outdoor compressor often off by design — check before “HP broken.” |
| `mode_matches_complaint` | Mode is Heat or Cool and matches my complaint; setpoint should be calling | Continue — still confirm Emergency is not also on. |
| `mode_wrong_for_complaint` | Mode is wrong for my complaint (e.g. Cool when I need heat) | Easy setting fix first. |
| `tstat_blank_or_unreadable` | Thermostat is blank or I cannot read mode | Soft-link AC batteries path — do not invent panel DIY. |
| `not_sure` | I am not sure | Do not guess. Do not pull the thermostat off the wall. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `mode_auto` | **next** `hp.mode.force_match_complaint` |
| `mode_emergency_or_aux` | **next** `hp.mode.emergency_aux_off` |
| `mode_matches_complaint` | **next** `hp.mode.emergency_aux_off` — confirm Emergency/Aux is Off before ambient/defrost (many stats show a separate Aux indicator) |
| `mode_wrong_for_complaint` | **terminal** `next_step` DIY Basic — Set mode to **Heat** or **Cool** to match the complaint; move setpoint 2–3°F past room temp in the call direction; wait 10–15 minutes and retest. If complaint remains with mode correct, restart at this node or continue session when product supports resume. |
| `tstat_blank_or_unreadable` | **next** `ac.tstat.blank.batteries` (soft-link) — reuse AC blank-thermostat batteries Basic path; after that path still blank/unreadable → that node’s `call_pro` / `insufficient_info`; do **not** open equipment to “find” mode |
| `not_sure` | **terminal** `insufficient_info` — confirm mode/setpoint from the display or manual before further DIY |

### Landing overlays (after mode clear — applied by downstream nodes, documented here)
| `hp_landing` | After Emergency clear |
|---|---|
| `no_heat` \| `no_cool` \| `both_modes_fail` \| `ice_outdoor` | Continue trunk: ambient → … |
| `short_cycle` | Prefer **terminal** `call_pro` (reason: `short_cycle_after_mode_basics`) from `hp.mode.emergency_aux_off` when Emergency already Off / turned Off and mode matches — **do not** invent deep electrical short-cycle DIY in Wave-1 |

## diy_tier
`basic`

## safety_gate
`false`

## hazard_exit
`null`

## audit_event
`node_entered:hp.mode.thermostat_check` · `answer_selected:<id>` · on Basic mode fix: `conclusion_reached:next_step_basic` · `diy_tier_shown:basic` · on blank: handoff `ac.tstat.blank.batteries`

## notes
- Node type: question / observation.
- Tree version: **`hp.air_source.v0`**.
- Entry from `hp.landing.picker` for landings that continue the mode trunk (`unusual_noise` goes to `ac.noise.hazard_screen` instead).
- **Never assume O vs B.** Do not tell the user which way the reversing valve “should” be energized.
- **Must-fix (Commander 2026-09-23):** blank tstat → soft-link **next** `ac.tstat.blank.batteries` (not bare insufficient_info).
- Node type aligns with AC `ac.cool.tstat.mode_setpoint` depth; HP adds Auto + Emergency forks.
- Wave-1 paper: deep-write DONE 2026-09-23; Commander must-fix pass 2026-09-23.
