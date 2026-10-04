# hp.defrost.sanity

## id
`hp.defrost.sanity`

## prompt
**COLD WEATHER / ICE CHECK — Could this be a normal defrost?**

In **heat** mode when outdoor air is cold, frost on the outdoor coil can be **normal**. During automatic **defrost**, many heat pumps temporarily:

- Stop the outdoor fan
- Make a whoosh / hiss / steam / melt sound
- Blow **cooler** air indoors for a short time
- Turn on auxiliary heat (strips or furnace) while the outdoor coil clears

From a **safe distance** only:

- Do **not** reach into the grille
- Do **not** chip ice with tools, screwdrivers, hammers, or hot water in a way that damages the coil
- Do **not** remove panels or jump defrost sensors

Normal frost is light and white, and it clears during a defrost (about 5–15 minutes, often every 30–90 minutes). Not normal: a solid block where you cannot see the coil fins, ice on the top or fan grille, ice building up from the base, or the fan scraping ice.

Watch about **5–15 minutes**. Does the outdoor unit look like it **recovers** into normal heat operation afterward (fan resumes, steam settles, heat returns)?

**If there is heavy ice and you want to keep running the system anyway to “force heat” — that is not a DIY continue.** That can damage the system.

If you see **burning smell, smoke, sparks, or standing water at electrical equipment** while watching — Stop / get help. Do not soft-continue.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `looks_like_defrost_then_recover` | Looked like defrost, then returned toward normal heat | Often normal — continue only if original complaint remains. |
| `iced_solid_no_recover` | Outdoor iced solid / stuck; never returns to normal heat | Possible defrost failure — not DIY electrical / valve force-out. |
| `not_cold_or_not_applicable` | Mild weather / no frost behavior / does not match | Skip defrost wait. |
| `want_keep_running_despite_ice` | Heavy ice, but I want to keep the system running | Hard stop. Do not chip ice. One question, then the right shutdown steps. |
| `not_sure` | I am not sure | Do not force defrost or open the unit. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `looks_like_defrost_then_recover` | **If complaint resolved after recover:** **terminal** `next_step` DIY Basic — Leave in normal Heat; expect occasional defrost in cold weather; if ice returns and stays, call a licensed HVAC pro. **If complaint remains** and `hp_landing` in (`no_heat`, `ice_outdoor`, `both_modes_fail`): **next** `hp.heat.capacity_vs_dead`. **If `hp_landing=no_cool`:** **next** `hp.observe.leaving_air_vs_mode`. |
| `iced_solid_no_recover` | **next** `hp.conclude.call_pro_defrost_valve_control` — reason family `defrost_failure_suspected`; no magnets, no jumping safeties, no gauges |
| `not_cold_or_not_applicable` | **If `hp_landing=no_heat`:** **next** `hp.heat.capacity_vs_dead`. **Else:** **next** `hp.observe.leaving_air_vs_mode` |
| `want_keep_running_despite_ice` | **next** `hp.ice.mode_location` (gate `ice_keep_running` already fired; exit-ramp fork). Heating + outdoor ice → `emergency_exit` `@hp_ice_heat_outdoor`. Indoor-only ice, cooling, or “I’m not sure” → `emergency_exit` `@ice_keep_running`. Not sure of mode + outdoor ice uses stored ambient: near freezing or well below → HEAT; mild or unknown → COOL. **Never soft continue.** |
| `not_sure` | **terminal** `insufficient_info` — wait through a possible defrost cycle or note outdoor behavior for a pro; do not chip ice or open panels |

## diy_tier
`basic`

## safety_gate
`true`

## hazard_exit
`ice_keep_running` when user insists on keep-running · else `null`

## audit_event
`node_entered:hp.defrost.sanity` · `answer_selected:<id>` · on keep-running: `gate_fired:ice_keep_running` + `exit_ramp:ice_keep_running` then `node_entered:hp.ice.mode_location` · on iced_solid: route via conclude · on Basic recover-resolved: `conclusion_reached:next_step_basic`

## notes
- Node type: observation / question / conditional gate.
- Tree version: **`hp.air_source.v1`** (ice-stop split, 2026-10-03). Supersedes the v0 direct `@ice_keep_running` edge.
- Depends on prior `hp.ambient.outdoor_band` when edges are live; may also be reached when `hp_landing=ice_outdoor` even from mild band.
- **Ice keep-running inlined here** (same AC Wave-2 pattern as `ac.cool.indoor.ice_lines_coil`) — no standalone `hp.gate.ice_keep_running` file. v1 sends the keep-running choice to `hp.ice.mode_location` instead of straight to the stop screen. The gate still fires on this choice.
- **Supplemental C:** `safety_gate` is clean bool **`true`** because a hazard choice (`want_keep_running_despite_ice` → `emergency_exit`) is present. Schema wants bool, not “conditional true on choice.”
- Never suggest magnets, jumping defrost sensors/boards, gauge work, or hot-water coil abuse.
- No capacitor / contactor / inverter-board DIY on this path.
- Failed defrost → shared conclude `hp.conclude.call_pro_defrost_valve_control` (pro_only).
- Wave-1 paper: deep-write DONE 2026-09-23 (expanded from stub to AC Wave-2 depth); Commander must-fix pass 2026-09-23.
