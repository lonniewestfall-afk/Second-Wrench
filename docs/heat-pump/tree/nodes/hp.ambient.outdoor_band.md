# hp.ambient.outdoor_band

## id
`hp.ambient.outdoor_band`

## prompt
**Outdoor temperature — ballpark only**

You do not need a precision thermometer. From what you already know (phone weather, outdoor thermometer, or “feels like”):

Which band best matches **right now**?

- **Mild / warm** — well above freezing (roughly above ~45°F / 7°C)
- **Near freezing** — around freezing, frost possible (roughly ~25–40°F / −4–4°C)
- **Well below freezing** — deep cold (roughly below ~25°F / −4°C)

This is not a balance-point calculation. It only steers whether a **normal defrost** is plausible and whether “weak heat” can be normal capacity drop vs **no heat at all**.

Do not go outside into unsafe conditions (ice storms, darkness on a roof, etc.) just to answer. If you cannot estimate, say so.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `band_mild_warm` | Mild / warm — well above freezing | Defrost less likely; still observe leaving-air vs mode. |
| `band_near_freezing` | Near freezing — frost possible | Defrost sanity before declaring no heat / failed unit. |
| `band_well_below` | Well below freezing — deep cold | Expect possible aux assist + defrost; distinguish weak vs dead. |
| `not_sure_ambient` | I am not sure | Prefer conservative defrost check for heat/ice landings. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `band_mild_warm` | **If `hp_landing=ice_outdoor`:** **next** `hp.defrost.sanity` (ice reported even in mild weather still needs defrost/ice discipline — do not chip ice). **Elif `hp_landing=no_heat`:** **next** `hp.heat.capacity_vs_dead` (skip defrost wait when mild and no ice complaint). **Else** (`no_cool` / `both_modes_fail`): **next** `hp.observe.leaving_air_vs_mode` |
| `band_near_freezing` | **next** `hp.defrost.sanity` — especially for `no_heat` / `ice_outdoor`; also run for other landings when outdoor frost behavior is plausible |
| `band_well_below` | **next** `hp.defrost.sanity` — then capacity vs dead for heat complaints |
| `not_sure_ambient` | **If `hp_landing` in (`no_heat`, `ice_outdoor`):** **next** `hp.defrost.sanity` (conservative). **Else** (cool-only / both / other): **next** `hp.observe.leaving_air_vs_mode` — set `hp_ambient_band=unknown`. **Not** `insufficient_info`. |

## diy_tier
`basic`

## safety_gate
`false`

## hazard_exit
`null`

## audit_event
`node_entered:hp.ambient.outdoor_band` · `answer_selected:<id>` · session flag `hp_ambient_band` set (`mild_warm` \| `near_freezing` \| `well_below` \| `unknown`)

## notes
- Node type: question.
- Tree version: **`hp.air_source.v0`**.
- Feeds `hp.defrost.sanity` + `hp.heat.capacity_vs_dead`. Not Slice-2 staging/inverter trunks.
- **Must-fix (Commander 2026-09-23):** `not_sure_ambient` + cool-only complaint → **next** observe (not `insufficient_info`).
- Do not claim a numeric balance point as DIY truth — OEM and dual-fuel differ.
- Inverter “quiet low” vs failed is Slice-2 — if user mentions outdoor barely audible in deep cold, observation only → do not invent amp/board DIY; may later call_pro.
- Wave-1 paper: deep-write DONE 2026-09-23; Commander must-fix pass 2026-09-23.
