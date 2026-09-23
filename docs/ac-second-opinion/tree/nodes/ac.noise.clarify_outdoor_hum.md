# ac.noise.clarify_outdoor_hum

## id
`ac.noise.clarify_outdoor_hum`

## prompt
**Clarify the noise (after hazard screen clear)**

Hazard signs were ruled out. Which best matches?

**Only this pattern** may continue into the existing outdoor silent-vs-hum observation:

- **Outdoor** hum or buzz
- While the thermostat is **calling for Cool**
- And the outdoor **fan is not spinning**

Any other noise (indoor screech, rattle, intermittent unknown, outdoor noise while fan spins, noise with no Cool call, etc.) → call a licensed pro. Do not soft-bypass the hazard screen. Do not invent a parts diagnosis here.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `outdoor_hum_cool_calling_fan_not_spinning` | Outdoor hum/buzz while Cool calling; fan not spinning | Only safe route into silent_vs_hum. |
| `indoor_or_other_noise` | Indoor noise, rattle, screech, or other / unknown | Stay call_pro. |
| `outdoor_noise_but_fan_spins_or_not_calling` | Outdoor noise but fan spins or Cool is not calling | Not the start-hum pattern. |
| `not_sure_noise` | Still not sure | Prefer call_pro / insufficient_info. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `outdoor_hum_cool_calling_fan_not_spinning` | **next** `ac.start.outdoor_silent_vs_hum` (UI may pre-select / highlight hum path; observation node still owns silent vs hum vs runs) |
| `indoor_or_other_noise` | **terminal** `call_pro` (reason: `unusual_noise_unresolved`) |
| `outdoor_noise_but_fan_spins_or_not_calling` | **terminal** `call_pro` (reason: `unusual_noise_unresolved`) |
| `not_sure_noise` | **terminal** `call_pro` (reason: `unusual_noise_unresolved`) or `insufficient_info` |

## diy_tier
`basic`

## safety_gate
`false` (clarifying only; hazard screen already passed — do not re-soft-bypass)

## hazard_exit
`null` — if hazard returns mid-clarify, product UI must re-fire Stop / `ac.noise.hazard_screen` / cluster; never continue DIY

## audit_event
`node_entered:ac.noise.clarify_outdoor_hum` · `answer_selected:<id>` · on unresolved: `conclusion_reached:call_pro` (`unusual_noise_unresolved`)

## notes
- **ONLY** outdoor hum while Cool calling + fan not spinning → `ac.start.outdoor_silent_vs_hum`.
- Else → `call_pro` (`unusual_noise_unresolved`).
- Hum path from silent_vs_hum still → `ac.cool.conclude.call_pro_capacitor_contactor`; while `advancedRepairsEnabled == false` conclude stays call_pro; when flag true may offer Advanced from conclude (not from this node).
- Node type: clarifying choice / observation router.
- Brand: scarlet wrench + dark charcoal/grey/walnut — never green.
