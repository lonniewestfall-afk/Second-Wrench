# ac.cool.landing.picker

## id
`ac.cool.landing.picker`

## prompt
**What is going on?**

Pick the closest match. Every path already passed the safety gate. Answer only what you know. You can always choose a path that leads to “not sure” later.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `landing_not_cooling` | Not cooling | System seems to run but space is not cooling enough. |
| `landing_will_not_start` | Will not start | Outdoor or system will not start / seems dead when it should cool. |
| `landing_blank_tstat` | Blank thermostat | Thermostat display is blank or dead. |
| `landing_weak_airflow` | Weak airflow | Air from supplies feels weak or uneven. |
| `landing_water_or_ice` | Water or ice | Water leak, wet area, or ice on lines / coil / outdoor. |
| `landing_unusual_noise` | Unusual noise | New or concerning sound from indoor or outdoor equipment. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `landing_not_cooling` | **next** `ac.cool.tstat.mode_setpoint` |
| `landing_will_not_start` | **next** `ac.start.outdoor_silent_vs_hum` |
| `landing_blank_tstat` | **next** `ac.tstat.blank.batteries` |
| `landing_weak_airflow` | **next** `ac.cool.filter.check` |
| `landing_water_or_ice` | **next** `ac.gate.water_near_electrical` |
| `landing_unusual_noise` | **next** `ac.noise.hazard_screen` — **Wave-2 edge** (replaces Wave-1 immediate terminal `call_pro` / `unusual_noise_early`). Hazard screen → clarify outdoor hum; only outdoor hum while Cool calling / fan not spinning → `ac.start.outdoor_silent_vs_hum`; else `call_pro` (`unusual_noise_unresolved`). Hazards → emergency_exit / call_pro, never soft continue. |

## diy_tier
`basic`

## safety_gate
`false`

## hazard_exit
`null` (noise hazards owned by `ac.noise.hazard_screen`)

## audit_event
`node_entered:ac.cool.landing.picker` · `answer_selected:<landing_*>`

## notes
### Canonical six (home / symptom cards — exact)
1. Not cooling  
2. Will not start  
3. Blank thermostat  
4. Weak airflow  
5. Water or ice  
6. Unusual noise  

### Live guided picker (later screen) — label map only; NO extra Wave-1/2 diagnosis id
| Guided live label | Maps to |
|---|---|
| “It runs, but the house is not cooling” | Not cooling → `landing_not_cooling` |
| “The AC will not start” | Will not start → `landing_will_not_start` |
| “The thermostat display is blank” | Blank thermostat → `landing_blank_tstat` |
| “Airflow from the vents is weak” | Weak airflow → `landing_weak_airflow` |
| “The outdoor unit seems inactive” | Will not start / `ac.start.outdoor_silent_vs_hum` family (same as inactive outdoor unit home card) |
| “I only need a service-call note” | **Out of diagnosis landings** — notes only; terminal `insufficient_info` or deferred product path; not a 7th landing |

- Home may show **inactive outdoor unit** as a card — still map to Will not start / silent-vs-hum family.
- Draft Not cooling chain after mode/setpoint: filter → outdoor fan → debris → ice.
- **Wave-2 (2026-09-23):** unusual_noise → `ac.noise.hazard_screen` (not immediate `unusual_noise_early` call_pro).
- Ice keep-running remains **inlined** on `ac.cool.indoor.ice_lines_coil` (no standalone `ac.gate.ice_keep_running`).
- Node type: intake / landing.
