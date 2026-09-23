# ac.adv.cap.access_compartment

## id
`ac.adv.cap.access_compartment`

## prompt
**Stage 3 — Access outdoor electrical compartment (de-energized only)**

Lockout must already be verified. Access the outdoor unit electrical compartment **only while verified de-energized**.

- Follow manufacturer homeowner access for the service panel / electrical cover you are allowed to open when power is Off.
- Do **not** defeat interlocks unsafely.
- Do **not** perform live work.
- If you see burn marks, melted wires, standing water, or damaged insulation → stop; leave covers as safe as possible; call emergency/pro as appropriate.

Covers off only when lockout verified. Contactor replacement is not on this path — capacitor identify/replace only.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `compartment_accessible_safe` | Compartment accessible safely after verified dead | Continue to label ID. |
| `must_defeat_interlock_unsafely` | Would need to defeat an interlock unsafely | Call_pro — no bypass. |
| `cannot_access` | Cannot access compartment safely | Call_pro. |
| `saw_damage_burn_water` | Burn damage, melted wiring, or water inside | Emergency / call_pro. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `compartment_accessible_safe` | **next** `ac.adv.cap.identify_label` |
| `must_defeat_interlock_unsafely` | **terminal** `call_pro` (reason: `high_voltage_intent` / unsafe access) |
| `cannot_access` | **terminal** `call_pro` (reason: `compartment_inaccessible`) |
| `saw_damage_burn_water` | **terminal** `emergency_exit` or `call_pro` — never soft continue; leave power Off |

## diy_tier
`advanced`

## safety_gate
`true` if user must defeat interlocks unsafely or sees damage/water

## hazard_exit
`high_voltage_intent` \| burn/water reasons \| `null` on safe access

## audit_event
`node_entered:ac.adv.cap.access_compartment` · `answer_selected:<id>` · on unsafe: `gate_fired:<id>` · `diy_tier_shown:advanced`

## notes
- No live work. Covers off only when lockout verified.
- Node type: procedure / Stage 3.
