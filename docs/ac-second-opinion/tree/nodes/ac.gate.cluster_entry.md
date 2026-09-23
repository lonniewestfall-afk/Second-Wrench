# ac.gate.cluster_entry

## id
`ac.gate.cluster_entry`

## prompt
**SAFETY FIRST — Is any of this happening right now?**

Do not approach equipment to find out. Choose from what you already know. Emergency help never requires accepting our terms.

United States beta. For immediate danger, get to safety and call 911.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `hazard_gas_co` | Gas smell or a carbon monoxide alarm | Leave the building. Get help from outside. |
| `hazard_smoke_fire_sparks_burn` | Smoke, fire, sparks, or a burning smell | Stop troubleshooting and move away. |
| `hazard_water_electrical` | Water at electrical equipment or damaged wiring | Do not touch equipment or enter standing water. |
| `hazard_heat_illness` | Someone is confused, fainting, or seriously ill in the heat | Call 911. Do not wait on the AC. |
| `hazard_refrigerant_alarm` | A refrigerant-leak alarm or suspected refrigerant release | Do not reset or disable the alarm. |
| `hazard_unsure` | I am not sure whether there is a hazard | Prefer safe halt. Do not continue into DIY. |
| `none_of_these` | None of these | Continue with basic, non-invasive checks. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `hazard_gas_co` | **terminal** `emergency_exit` — leave building; call gas utility / emergency from a safe location; do not operate switches in the hazard zone |
| `hazard_smoke_fire_sparks_burn` | **terminal** `emergency_exit` — stop; shut power only if safe (dry hands, dry floor, known breaker); evacuate if smoke/fire persists; call emergency services as needed |
| `hazard_water_electrical` | **terminal** `emergency_exit` — do not touch equipment; stay clear of standing water; call licensed HVAC / electrician; shut main power only from a dry safe location |
| `hazard_heat_illness` | **terminal** `emergency_exit` — call 911; AC troubleshooting ends |
| `hazard_refrigerant_alarm` | **terminal** `emergency_exit` (reason: `refrigerant_alarm_or_release`) — leave area if advised by alarm instructions; do not reset/disable alarm; call licensed HVAC with EPA 608 capability; do not DIY seal or “top off” |
| `hazard_unsure` | **terminal** `emergency_exit` (reason: `unsure_hazard`) — Stop / get help style halt; optional UI may also surface `call_pro` language with same reason; **no soft continue into DIY** |
| `none_of_these` | **next** `ac.session.consent` |

## diy_tier
`basic` (gate only — no DIY next_step from this node)

## safety_gate
`true`

## hazard_exit
Choice-dependent: `gas_co` \| `smoke_fire_sparks_burn` \| `water_near_electrical` \| `heat_illness_911` \| `refrigerant_alarm_or_release` \| `unsure_hazard` \| `null` (when `none_of_these`)

## audit_event
`node_entered:ac.gate.cluster_entry` · on hazard choice: `gate_fired:<reason>` + `exit_ramp` · on `none_of_these`: `answer_selected:none_of_these`

## notes
- **LIVE ORDER (2026-09-22):** Session entry starts HERE (safety first), then consent, then system confirm, then landing picker. Priority-list numbering had consent as #1 for approval priority only — wire runtime to safety → consent.
- Tone: plain mechanical, direct; no humor on hazards. Brand: never green.
- Support contact in live UI: lonnie@secondwrench.co (do not invent other contacts).
- Mid-tree water paths still use dedicated `ac.gate.water_near_electrical`; cluster water answer is hard emergency_exit with no continue.
- Refrigerant path: prefer emergency_exit over call_pro when alarm/release suspected; call_pro may appear on result copy as the follow-on action after evacuate, but terminal outcome remains emergency_exit / stop.
- Node type: gate / intake cluster.
