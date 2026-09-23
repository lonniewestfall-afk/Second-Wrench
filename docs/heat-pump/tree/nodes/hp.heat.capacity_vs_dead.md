# hp.heat.capacity_vs_dead

## id
`hp.heat.capacity_vs_dead`

## prompt
**Heat complaint — weak heat in cold weather, or no heat at all?**

Heat pumps deliver less heat as outdoor air gets colder. That can feel like “the system is dying” when it is still running normally and may call **aux / strips / furnace** for help.

From what you can tell **without meters or panel work**:

- Is there **some** warm (or at least not ice-cold) air from supplies after a proper Heat call for 10–15+ minutes?
- Or is supply air **staying room-temp / cold** with **no** useful heat (feels dead)?
- If you know you have electric heat strips or a dual-fuel furnace: is **only** backup heat warming the house while the outdoor unit stays idle in normal Heat (Emergency Off)?

Do not measure strip amps. Do not open sequencers. Do not add refrigerant. Do not declare “bad compressor” yet — next we still observe outdoor leaving-air vs mode when useful.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `weak_but_some_heat` | Some heat, but weak — especially in deep cold | Often capacity / expectation — not sealed-system DIY. |
| `no_heat_at_all` | No useful heat — supply stays cold / room-temp | Continue observe leaving-air vs mode. |
| `aux_only_seems_to_heat` | House only warms when Aux/Emergency/furnace runs; HP outdoor idle in normal Heat | Control / Outdoor / valve family — pro-leaning after observe. |
| `not_applicable_cool_landing` | My complaint is cool-only / not a heat capacity question | Skip — go to observe. |
| `not_sure_capacity` | I am not sure | Do not open the air handler to “check strips.” |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `weak_but_some_heat` | **Deterministic by session `hp_ambient_band`:** **If** `hp_ambient_band` in (`near_freezing`, `well_below`): **terminal** `next_step` DIY Basic — Capacity expectation coaching: in deep cold expect less heat and possible aux assist; keep Emergency **Off** unless you intentionally want strips-only; confirm filter/registers later if airflow feels weak; if outdoor is iced solid and never recovers → that is **not** “normal weak” — call a licensed HVAC pro. **Elif** `hp_ambient_band=mild_warm`: **next** `hp.observe.leaving_air_vs_mode`. **Elif** `hp_ambient_band=unknown` (or unset): **next** `hp.observe.leaving_air_vs_mode`. |
| `no_heat_at_all` | **next** `hp.observe.leaving_air_vs_mode` |
| `aux_only_seems_to_heat` | **next** `hp.observe.leaving_air_vs_mode` — likely mode-asymmetric / outdoor not doing heat job → RV/control conclude if asymmetric confirmed |
| `not_applicable_cool_landing` | **next** `hp.observe.leaving_air_vs_mode` |
| `not_sure_capacity` | **next** `hp.observe.leaving_air_vs_mode` — never strip-amp DIY |

## diy_tier
`basic`

## safety_gate
`false`

## hazard_exit
`null`

## audit_event
`node_entered:hp.heat.capacity_vs_dead` · `answer_selected:<id>` · on deep-cold expectation coaching: `conclusion_reached:next_step_basic` · `diy_tier_shown:basic` · mild/unknown weak → observe

## notes
- Node type: question / coaching.
- Tree version: **`hp.air_source.v0`**.
- Primary for `hp_landing=no_heat` / `ice_outdoor` / heat side of `both_modes_fail`. Cool-only landings may skip via `not_applicable_cool_landing` from defrost n/a path wiring.
- **Must-fix (Commander 2026-09-23):** deterministic maps — `not_sure_capacity` → observe; `weak_but_some_heat` split by `hp_ambient_band` (near_freezing/well_below → Basic expectation; mild_warm/unknown → observe). No dual “or” outcomes.
- Strip sequencers / amp draw = pro_only. Dual-fuel combustion = pro_only beyond gates.
- Honesty: “weak in deep cold” vs charge/TXV/inverter fault is soft from homeowner answers alone — prefer observe + call_pro over fake certainty.
- Wave-1 paper: deep-write DONE 2026-09-23; Commander must-fix pass 2026-09-23.
