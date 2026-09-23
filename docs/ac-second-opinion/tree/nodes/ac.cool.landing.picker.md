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
| `landing_unusual_noise` | **terminal** `call_pro` (reason: `unusual_noise_early`) — Wave-1: early pro handoff. Screech / grinding / metal-on-metal: shut Off if safe, then call pro. Electrical buzz + heat/smell should have been caught at safety gate. **deferred_node:** fuller noise tree (`ac.noise.*`) not in Wave-1. Optional later edge: if user clarifies “outdoor hum only while calling cool,” authors may route to `ac.start.outdoor_silent_vs_hum` — not wired live here to avoid soft-bypass of early call_pro. |

## diy_tier
`basic`

## safety_gate
`false`

## hazard_exit
`null`

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

### Live guided picker (later screen) — label map only; NO 13th Wave-1 id
| Guided live label | Maps to |
|---|---|
| “It runs, but the house is not cooling” | Not cooling → `landing_not_cooling` |
| “The AC will not start” | Will not start → `landing_will_not_start` |
| “The thermostat display is blank” | Blank thermostat → `landing_blank_tstat` |
| “Airflow from the vents is weak” | Weak airflow → `landing_weak_airflow` |
| “The outdoor unit seems inactive” | Will not start / `ac.start.outdoor_silent_vs_hum` family (same as inactive outdoor unit home card) |
| “I only need a service-call note” | **Out of Wave-1 diagnosis landings** — notes only; terminal `insufficient_info` or deferred product path; not a 7th landing and not a new priority node |

- Home may show **inactive outdoor unit** as a card — still map to Will not start / silent-vs-hum family; do not invent a 13th approved id.
- Draft Not cooling chain after mode/setpoint: filter → outdoor fan → ice.
- Node type: intake / landing.
