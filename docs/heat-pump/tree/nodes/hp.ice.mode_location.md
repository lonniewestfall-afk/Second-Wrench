# hp.ice.mode_location

## id
`hp.ice.mode_location`

## prompt
**ICE — Heating or cooling, and where's the ice?**

One answer picks the right shutdown steps.

Pick heating or cooling by what you wanted the system to do. Where the ice is tells us the rest.

Outdoor unit: the box outside. Indoor unit: the furnace or air handler inside, plus the pipes at it.

Don't open panels or go out in unsafe weather to check.

Caution: No chipping ice, no panels, and no refrigerant or electrical work.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `ice_heat_outdoor` | Heating — ice is on the outdoor unit | Backup-heat steps next. |
| `ice_heat_indoor_only` | Heating — but the ice is only on the indoor unit or its pipes | Unusual in heat. Shutdown steps, then a pro. |
| `ice_cool_any` | Cooling — ice on the indoor unit, its pipes, or the outdoor unit | Shutdown and thaw steps next. |
| `ice_mode_unsure_outdoor` | Not sure which — ice is on the outdoor unit | We'll use the outdoor temperature you gave. |
| `ice_unsure` | I'm not sure | We'll show the safest shutdown steps. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `ice_heat_outdoor` | **terminal** `emergency_exit` `@hp_ice_heat_outdoor` (reason: `hp_ice_heat_outdoor`) — Emergency/Aux Heat if available, else Off + safe backup heat. Fact: Ice on the outdoor unit while heating. |
| `ice_heat_indoor_only` | **terminal** `emergency_exit` `@ice_keep_running` (reason: `ice_keep_running`) — Off and thaw. Fact: Ice only at the indoor unit while heating. It may have been cooling instead. |
| `ice_cool_any` | **terminal** `emergency_exit` `@ice_keep_running` (reason: `ice_keep_running`) — Off and thaw. Fact: Ice while cooling (indoor unit, lines, or outdoor unit). |
| `ice_mode_unsure_outdoor` | **by `hpAmbient`:** `near_freezing` or `well_below` → **terminal** `emergency_exit` `@hp_ice_heat_outdoor`. `mild_warm` or `unknown` → **terminal** `emergency_exit` `@ice_keep_running`. Fact: Mode unknown. Ice on the outdoor unit. |
| `ice_unsure` | **terminal** `emergency_exit` `@ice_keep_running` (reason: `ice_keep_running`) — safest shutdown. Fact: Mode and ice location unknown. |

No choice carries a `gate`. `gate_fired:ice_keep_running` already fired on `hp.defrost.sanity` / `want_keep_running_despite_ice`.

## diy_tier
`pro_only`

## safety_gate
`true`

## hazard_exit
`hp_ice_heat_outdoor` on the HEAT screen · `ice_keep_running` on the COOL screen. This node does not resume diagnosis.

## audit_event
`node_entered:hp.ice.mode_location` · `answer_selected:<choice>` · `conclusion_reached:emergency_exit`

Prior events on the inbound edge: `answer_selected:want_keep_running_despite_ice` · `gate_fired:ice_keep_running` · `exit_ramp:ice_keep_running`.

## notes
- Node type: exit-ramp fork (one routing question after `exit_ramp`, every choice terminal).
- Tree version: **`hp.air_source.v1`**.
- Reached only from `hp.defrost.sanity` / `want_keep_running_despite_ice`. The AC lane still goes straight to `@ice_keep_running` and never enters this node.
- Both stop screens stay `emergency_exit`, tier `Stop / professional`. No Advanced DIY path. `advancedRepairsEnabled` stays false.
- Approved 2026-10-03. See `docs/ac-second-opinion/conventions/hazard-exit-ramps.md` (exit-ramp fork exception).
