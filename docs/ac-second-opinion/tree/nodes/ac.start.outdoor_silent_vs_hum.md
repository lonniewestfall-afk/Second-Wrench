# ac.start.outdoor_silent_vs_hum

## id
`ac.start.outdoor_silent_vs_hum`

## prompt
**Outdoor unit — silent or humming when it should start?**

Thermostat should be calling for Cool (mode Cool, setpoint below room). From a safe distance at the outdoor unit (no covers off, nothing through the grille):

When cool is calling, which best matches?

- Completely **silent** (no fan, no obvious compressor sound)
- A **hum or buzz** from the outdoor cabinet while the fan is not spinning
- Outdoor fan / unit **does run** (may be wrong landing)
- You cannot tell safely

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `outdoor_silent` | Outdoor unit is silent when cool is calling | Power / control / start family — Advanced OFF. |
| `outdoor_hum_no_fan` | Hum or buzz at outdoor unit; fan not spinning | Suspected capacitor / contactor — call_pro while Advanced OFF. |
| `outdoor_runs_ok` | Outdoor unit runs (fan and/or compressor seem active) | May be Not cooling rather than Will not start. |
| `not_sure_listen` | I am not sure / cannot observe safely | Do not force access. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `outdoor_silent` | **terminal** `call_pro` (reason: `outdoor_silent_will_not_start`) — Wave-1: Basic visual breaker/disconnect nodes not yet written. **deferred_node:** `ac.start.breaker_disconnect`, `ac.cool.power.breaker_visual`, `ac.cool.power.disconnect_visual`. Beta-safe: call_pro with service note that outdoor is silent while cool is calling; homeowner may confirm thermostat batteries/display separately via Blank thermostat landing. Do **not** route to DIY Advanced. Optional cross-link note only: if display blank → user can restart at Blank thermostat. |
| `outdoor_hum_no_fan` | **next** `ac.cool.conclude.call_pro_capacitor_contactor` |
| `outdoor_runs_ok` | **next** `ac.cool.tstat.mode_setpoint` — re-enter Not cooling basics (mode already likely OK; filter/fan/ice chain follows) |
| `not_sure_listen` | **terminal** `insufficient_info` |

## diy_tier
`basic` (observation only; conclusion for hum path is pro while Advanced OFF)

## safety_gate
`false`

## hazard_exit
`null` (burning / sparking / smoke → user must Stop / get help; not a soft DIY continue)

## audit_event
`node_entered:ac.start.outdoor_silent_vs_hum` · `answer_selected:<id>` · silent path: `conclusion_reached:call_pro`

## notes
- Landing: Will not start. Also maps live guided label **“The outdoor unit seems inactive”** and any home **inactive outdoor unit** card — same family; **no new Wave-1 id**.
- Hum + Advanced OFF → always `ac.cool.conclude.call_pro_capacitor_contactor`, never `next_step` DIY Advanced.
- UNWRITTEN edges: breaker/disconnect visual Basic checks; start.tstat_calls.
- Node type: observation / question.
