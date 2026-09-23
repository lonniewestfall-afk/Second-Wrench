# ac.noise.hazard_screen

## id
`ac.noise.hazard_screen`

## prompt
**Unusual noise — hazard screen first**

Before clarifying the sound, rule out danger. Choose from what you **already know**. Do not approach equipment to “find” sparks or smoke.

If any of these are happening **now**:

- Burning smell or electrical heat smell from equipment
- Sparks
- Smoke or fire
- Grinding metal-on-metal (violent / new / worsening)

…stop troubleshooting DIY. Prefer emergency help / call a licensed pro over risky continue.

Plain mechanical tone — no soft “it might be fine” continue after a hazard answer.

Support: lonnie@secondwrench.co · For immediate danger: get safe and call 911.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `noise_burning_sparks_smoke` | Burning smell, sparks, smoke, or fire | Emergency / stop — never soft continue. |
| `noise_grinding_metal` | Grinding metal-on-metal | Off if safe + call_pro — never soft continue. |
| `noise_no_hazard_symptoms` | None of those hazard signs — noise only | Continue to clarify outdoor hum. |
| `noise_unsure_hazard` | Not sure if it is a hazard | Prefer safe halt. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `noise_burning_sparks_smoke` | **terminal** `emergency_exit` (reason: `burning_smell` / `sparking` / `smoke`) — move away; shut power only if safe (dry hands/floor, known breaker); call emergency services as needed; then licensed HVAC. **Never soft continue.** |
| `noise_grinding_metal` | **terminal** `call_pro` (reason: `grinding_metal_noise`) — set thermostat Off if safe; do not keep running to “hear it better”; schedule licensed HVAC. Optional escalate to `emergency_exit` if sparks/smoke accompany grind. **Never soft continue into DIY repair.** |
| `noise_no_hazard_symptoms` | **next** `ac.noise.clarify_outdoor_hum` |
| `noise_unsure_hazard` | **terminal** `emergency_exit` or `call_pro` (reason: `unsure_hazard`) — prefer safe halt; **no soft continue into DIY** |

## diy_tier
`basic` (screening only — exits are pro/emergency)

## safety_gate
`true`

## hazard_exit
`burning_smell` \| `sparking` \| `smoke` \| `grinding_metal_noise` \| `unsure_hazard` \| `null` only when `noise_no_hazard_symptoms`

## audit_event
`node_entered:ac.noise.hazard_screen` · on hazard: `gate_fired:<reason>` + `exit_ramp` · on clear: `answer_selected:noise_no_hazard_symptoms`

## notes
- Entry from `ac.cool.landing.picker` (`landing_unusual_noise`) — replaces Wave-1 immediate `unusual_noise_early` terminal.
- Screening only — no DIY repair of noise sources.
- No vibration FFT / mic diagnostics.
- Node type: gate / screen.
- Brand: scarlet wrench + dark charcoal/grey/walnut — never green.
