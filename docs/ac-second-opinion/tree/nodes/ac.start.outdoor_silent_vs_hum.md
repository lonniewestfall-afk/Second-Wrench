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
| `outdoor_silent` | Outdoor unit is silent when cool is calling | Power visuals hub — Basic breaker then disconnect visual. |
| `outdoor_hum_no_fan` | Hum or buzz at outdoor unit; fan not spinning | Suspected capacitor / contactor — call_pro while Advanced flag false. |
| `outdoor_runs_ok` | Outdoor unit runs (fan and/or compressor seem active) | May be Not cooling rather than Will not start. |
| `not_sure_listen` | I am not sure / cannot observe safely | Do not force access. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `outdoor_silent` | **next** `ac.start.breaker_disconnect` — **Wave-2 silent path:** hub → `ac.cool.power.breaker_visual` → `ac.cool.power.disconnect_visual` → `call_pro` if still silent / visuals exhausted. **No Advanced from Basic hub.** |
| `outdoor_hum_no_fan` | **next** `ac.cool.conclude.call_pro_capacitor_contactor` — while `advancedRepairsEnabled == false` conclude → terminal `call_pro` (`suspected_capacitor_contactor_advanced_off`); when flag true may offer Advanced from conclude (not from this node) |
| `outdoor_runs_ok` | **next** `ac.cool.tstat.mode_setpoint` — re-enter Not cooling basics (mode already likely OK; filter/fan/debris/ice chain follows) |
| `not_sure_listen` | **terminal** `insufficient_info` |

## diy_tier
`basic` (observation only; conclusion for hum path is pro while Advanced OFF)

## safety_gate
`false`

## hazard_exit
`null` (burning / sparking / smoke → user must Stop / get help; not a soft DIY continue)

## audit_event
`node_entered:ac.start.outdoor_silent_vs_hum` · `answer_selected:<id>` · silent path: continue to breaker hub · hum path: `advanced_flag_checked` at conclude

## notes
- Landing: Will not start. Also maps live guided label **“The outdoor unit seems inactive”** and any home **inactive outdoor unit** card — same family.
- **Wave-2 silent wire:** outdoor_silent → breaker_disconnect → breaker_visual → disconnect_visual → call_pro if still silent.
- Hum + flag false → always conclude → `call_pro`, never `next_step` DIY Advanced. Flag true later may offer Advanced from conclude only.
- CUT: `ac.start.tstat_calls` — do not deep-write; reuse mode_setpoint / Cool-calling language here.
- Node type: observation / question.
