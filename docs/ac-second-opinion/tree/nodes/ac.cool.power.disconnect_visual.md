# ac.cool.power.disconnect_visual

## id
`ac.cool.power.disconnect_visual`

## prompt
**Outdoor disconnect — VISUAL POSITION ONLY**

From **safe dry ground**, look at the outdoor disconnect box near the condenser (usually on the wall within sight of the unit).

**Observation only in Basic Wave-2:**

- Can you see whether the exterior handle / lever (or visible On/Off marking) appears **Off** or **On**?
- Stay back if the box is wet, damaged, buzzing, hot-smelling, or if weather makes approach unsafe.

**Do NOT** (this node does **not** instruct):

- Operating / flipping the exterior lever or handle
- Opening the disconnect door
- Pulling a fused pull-out block
- Touching whip wires, lugs, or internals
- Any cover-off electrical work

If you need to **operate** the disconnect to proceed, or the only path is fused pull-out / open-door / internals, or you cannot safely confirm Off/On from dry ground → **call a licensed pro**. Do not invent a manufacturer procedure you do not have.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `disconnect_appears_on` | From safe ground, disconnect appears On | Visual only — no operate. |
| `disconnect_appears_off` | From safe ground, disconnect appears Off | Visual only — may explain silent outdoor. |
| `cannot_see_position_safely` | I cannot see Off/On safely from dry ground | Do not force approach. |
| `need_to_operate_lever` | I need to flip / operate the exterior lever to continue | Basic does not instruct operate — call_pro. |
| `fused_pullout_or_open_door` | It is a fused pull-out / I would need to open the door or see internals | Always call_pro. |
| `wet_damaged_or_unsafe` | Wet, damaged, buzzing, or otherwise unsafe to approach | Hard stop. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `disconnect_appears_on` | **terminal** `call_pro` (reason: `outdoor_silent_will_not_start`) — breaker looked OK / On and disconnect appears On while outdoor still silent when Cool calling; Basic power visuals exhausted; service note for licensed HVAC. **No Advanced from this Basic hub path.** |
| `disconnect_appears_off` | **terminal** `call_pro` (reason: `outdoor_disconnect_appears_off`) — visual Off may explain silent unit; Basic does **not** instruct homeowner to operate lever; licensed HVAC / electrician to restore safely and diagnose. |
| `cannot_see_position_safely` | **terminal** `call_pro` (reason: `disconnect_visual_inaccessible`) |
| `need_to_operate_lever` | **terminal** `call_pro` (reason: `disconnect_operate_not_basic`) — Wave-2 Basic = visual position only |
| `fused_pullout_or_open_door` | **terminal** `call_pro` (reason: `high_voltage_intent` / fused_pullout_open_door) — always |
| `wet_damaged_or_unsafe` | **terminal** `call_pro` or `emergency_exit` (`wet_hands_flood` / unsafe approach) — never soft continue |

## diy_tier
`basic`

## safety_gate
`true` for wet/damaged/open-door/fused/operate-intent; visual On/Off observation itself is not a soft gate bypass

## hazard_exit
`wet_hands_flood` when water/electrical hazard · else prefer `call_pro` for operate/open-door — **never soft continue**

## audit_event
`node_entered:ac.cool.power.disconnect_visual` · `answer_selected:<id>` · on open-door/fused/operate: `gate_fired:high_voltage_intent` or `disconnect_operate_not_basic` · silent exhausted: `conclusion_reached:call_pro`

## notes
- **LOCKED:** VISUAL POSITION ONLY. Do **not** instruct operating exterior lever/handle in Wave-2 Basic.
- Observation Off/On from safe dry ground only.
- Need to operate / fused pull-out / open-door / internals → always `call_pro`.
- Sequenced after `ac.cool.power.breaker_visual` via hub `ac.start.breaker_disconnect`.
- Contactor/capacitor Advanced is **not** offered from this silent Basic path.
- Node type: observation.
- Brand: scarlet wrench + dark charcoal/grey/walnut — never green.
- **HP Wave-1 overlay:** when the heat-pump outdoor-not-running stamp is set, `disconnect_appears_on` and `disconnect_appears_off` → `call_pro` `hp_outdoor_not_running_wave1`. Wet, fused, and operate-lever stops stay the AC safety terminals. No capacitor conclude.
