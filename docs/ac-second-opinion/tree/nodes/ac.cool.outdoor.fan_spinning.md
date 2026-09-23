# ac.cool.outdoor.fan_spinning

## id
`ac.cool.outdoor.fan_spinning`

## prompt
**Outdoor unit — is the fan spinning?**

From a **safe distance** (do not put fingers or objects through the grille; no covers off):

With the thermostat calling for Cool, look/listen at the outdoor condenser:

- Is the top (or side) fan visibly spinning?
- Or is the outdoor unit silent / not moving?
- Or do you hear a hum / buzz from the outdoor cabinet while the fan is not spinning?

Stay clear of moving parts. Do not open the electrical compartment.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `fan_spinning` | Outdoor fan is spinning | Continue exterior debris clear, then ice / cooling checks. |
| `fan_not_spinning_silent` | Outdoor unit is silent / fan not spinning | Start / power family. |
| `fan_not_spinning_hum` | Fan not spinning, but I hear a hum or buzz at the outdoor unit | Suspected contactor/capacitor path — Advanced OFF until flag flip. |
| `cannot_observe` | I cannot observe safely | Do not approach hazards (weather, dogs, locked yard, etc.). |
| `outdoor_inaccessible` | Outdoor unit is inaccessible | Same — no forcing access. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `fan_spinning` | **next** `ac.cool.outdoor.debris_clearance` — **Wave-2** (then debris → `ac.cool.indoor.ice_lines_coil`) |
| `fan_not_spinning_silent` | **next** `ac.start.outdoor_silent_vs_hum` (pre-select silent path in UI if supported) |
| `fan_not_spinning_hum` | **next** `ac.cool.conclude.call_pro_capacitor_contactor` |
| `cannot_observe` | **terminal** `insufficient_info` |
| `outdoor_inaccessible` | **terminal** `call_pro` (reason: `outdoor_inaccessible`) |

## diy_tier
`basic`

## safety_gate
`false`

## hazard_exit
`null` (if user reports sparks/smoke/burn while observing → they should use Stop / get help; do not soft-continue)

## audit_event
`node_entered:ac.cool.outdoor.fan_spinning` · `answer_selected:<id>`

## notes
- Hum + fan not spinning while Advanced flag false → capacitor/contactor conclusion node (call_pro), never DIY Advanced.
- **Wave-2:** `fan_spinning` → `ac.cool.outdoor.debris_clearance` before ice path.
- Node type: observation.
