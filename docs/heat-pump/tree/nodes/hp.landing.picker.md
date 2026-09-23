# hp.landing.picker

## id
`hp.landing.picker`

## prompt
**What is going on with the heat pump?**

Pick the closest match. You already passed the safety gate and confirmed an air-source ducted heat pump. Answer only what you know. Paths that need “not sure” later are fine — do not invent symptoms.

If anything **new** appears now — gas smell, smoke, sparks, burning smell, standing water at electrical equipment — **Stop / get help**. Do not soft-continue DIY. Return to emergency guidance (same spirit as `ac.gate.cluster_entry`).

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `landing_no_heat` | No heat / not heating enough | Heat mode complaint — mode, Emergency, ambient, defrost, capacity before “dead unit.” |
| `landing_no_cool` | No cool / not cooling enough | Cool mode complaint — mode first, then shared observe / handback. |
| `landing_both_modes_fail` | Both heat and cool fail | Symmetric failure leans shared airflow / filter handback after mode clears. |
| `landing_ice_outdoor` | Ice or heavy frost on outdoor unit | Defrost sanity + ice keep-running discipline; do not chip ice. |
| `landing_short_cycle` | Short cycling (starts then stops quickly) | Mode basics only in Wave-1; then call_pro — no deep electrical DIY. |
| `landing_unusual_noise` | Unusual noise | Hazard-screen first (reuse AC), then call_pro — no invented HP electrical DIY in Wave-1. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `landing_no_heat` | **next** `hp.mode.thermostat_check` — set session flag `hp_landing=no_heat` |
| `landing_no_cool` | **next** `hp.mode.thermostat_check` — set `hp_landing=no_cool` |
| `landing_both_modes_fail` | **next** `hp.mode.thermostat_check` — set `hp_landing=both_modes_fail` |
| `landing_ice_outdoor` | **next** `hp.mode.thermostat_check` — set `hp_landing=ice_outdoor` (trunk emphasizes ambient → defrost; ice keep-running on defrost node) |
| `landing_short_cycle` | **next** `hp.mode.thermostat_check` — set `hp_landing=short_cycle` (after mode / Emergency clear → prefer `call_pro` reason `short_cycle_after_mode_basics` rather than deep ambient/defrost/observe DIY) |
| `landing_unusual_noise` | **next** `ac.noise.hazard_screen` — set `hp_landing=unusual_noise`. **HP overlay (product):** reuse AC hazard answer discipline unchanged — burning/sparks/smoke → `emergency_exit`; grinding metal → `call_pro` / escalate; unsure hazard → safe halt (`emergency_exit` or `call_pro`); **`noise_no_hazard_symptoms` (clear) → terminal `call_pro` reason `unusual_noise_hp_wave1`** (do **not** continue to `ac.noise.clarify_outdoor_hum`). Wave-1 does **not** invent HP capacitor/contactor/inverter DIY. **Never soft continue** after a hazard answer. |

## diy_tier
`basic`

## safety_gate
`false` (unusual_noise routes into AC `ac.noise.hazard_screen` which owns `safety_gate: true`; cluster already ran)

## hazard_exit
`null` on this node · unusual_noise hazards owned by `ac.noise.hazard_screen` (`burning_smell` \| `sparking` \| `smoke` \| `grinding_metal_noise` \| `unsure_hazard`)

## audit_event
`node_entered:hp.landing.picker` · `answer_selected:<landing_*>` · session `hp_landing` flag set · on unusual_noise: handoff `handback:ac.noise.hazard_screen` · on clear-path call_pro: `conclusion_reached:call_pro` reason `unusual_noise_hp_wave1`

## notes
- Node type: intake / landing.
- Tree version: **`hp.air_source.v0`**.
- Canonical six `hp_landing` values: `no_heat` \| `no_cool` \| `both_modes_fail` \| `ice_outdoor` \| `short_cycle` \| `unusual_noise`.
- **Must-fix (Commander 2026-09-23):** `landing_unusual_noise` → reuse `ac.noise.hazard_screen`; after clear → `call_pro` `unusual_noise_hp_wave1` (not AC outdoor-hum clarify). Hazard answers keep AC emergency/call_pro discipline.
- **Deviation from “most complaints → full trunk”:** `unusual_noise` under-diagnoses after hazard screen (Wave-1 robustness: no fake noise diagnosis). `short_cycle` still does mode/Emergency, then exits to call_pro at thermostat or emergency node when those clear — documented in those nodes’ maps.
- Ice keep-running gate language lives on `hp.defrost.sanity` (inlined, same pattern as AC ice node) — not a standalone `hp.gate.ice_keep_running`.
- Do not add will-not-start / blank-tstat landings in Wave-1 (blank soft-links `ac.tstat.blank.batteries` from thermostat_check; HP silent/hum electrical stays call_pro after power visuals / Slice 2).
- Brand: never green. Support: lonnie@secondwrench.co.
- Wave-1 paper: deep-write DONE 2026-09-23; Commander must-fix pass 2026-09-23.
