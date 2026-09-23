# ac.gate.water_near_electrical

## id
`ac.gate.water_near_electrical`

## prompt
**WATER / ELECTRICAL — Is there water at electrical equipment?**

Answer from what you already know. Do not enter standing water to check. Do not touch equipment, disconnects, or panels with wet hands or while standing on a wet floor.

Is there standing water, active leaking onto, or obvious wetness at any of:

- Indoor furnace / air handler / electrical disconnect
- Outdoor disconnect or whip area
- Breaker panel
- Damaged or exposed wiring in a wet area

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `water_at_electrical_yes` | Yes — water at electrical equipment or damaged wiring in a wet area | Hard stop. Do not touch. |
| `water_clear_no_electrical_risk` | No — no water at electrical equipment; area is dry enough to continue looking | Continue ice / condensate observation only. |
| `water_elsewhere_not_electrical` | Water or dampness elsewhere (away from electrical) | Still caution; ice path may apply. |
| `not_sure_water_hazard` | I am not sure | Prefer safe halt. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `water_at_electrical_yes` | **terminal** `emergency_exit` (reason: `water_near_electrical`) — do not touch equipment; stay clear of standing water; call licensed HVAC / electrician; shut main power only if you can do so from a dry, safe location — otherwise leave and get help |
| `water_clear_no_electrical_risk` | **next** `ac.cool.indoor.ice_lines_coil` |
| `water_elsewhere_not_electrical` | **next** `ac.cool.indoor.ice_lines_coil` — notes: if product later splits condensate-only, **deferred_node:** `ac.cool.condensate.water_leak` / overflow switch; Wave-1 stays on ice observation |
| `not_sure_water_hazard` | **terminal** `emergency_exit` or `call_pro` (reason: `unsure_water_electrical`) — prefer safe halt; no soft continue into DIY |

## diy_tier
`basic` (gate only — no DIY clear of water near electrical)

## safety_gate
`true`

## hazard_exit
`water_near_electrical` \| `unsure_water_electrical` \| `null` when clear

## audit_event
`node_entered:ac.gate.water_near_electrical` · on hazard: `gate_fired:water_near_electrical` + `exit_ramp` · on clear: `answer_selected:water_clear_*`

## notes
- Used by Water or ice landing after safety cluster already passed; still re-check because water can appear mid-path.
- Cluster entry also has a water/electrical emergency choice; this node is the dedicated mid-tree / landing gate.
- Never authorize DIY “mop and keep diagnosing” near energized equipment.
- Node type: gate.
