# hp.observe.leaving_air_vs_mode

## id
`hp.observe.leaving_air_vs_mode`

## prompt
**Outdoor unit — leaving air vs mode (observation only)**

With the thermostat calling the mode that matches your complaint (**Heat** or **Cool**, not Auto, Emergency Off), and after the unit has been trying to run for several minutes (and not mid-obvious defrost):

From a **safe distance** at the outdoor unit (no covers off, nothing through the grille):

| If thermostat is calling… | Outdoor air leaving the coil often feels… |
|---|---|
| **Cool** | **Warmer** than the surrounding outdoor air |
| **Heat** (not in defrost) | **Cooler** than the surrounding outdoor air |

Also note: does the outdoor unit seem to **run** at all (fan/compressor activity), or stay dead silent when it should run?

This does **not** prove refrigerant charge or a reversing-valve part number. It only sorts:

- Mode-asymmetric symptoms (one mode “works,” the other feels wrong while the outdoor runs)
- Symmetric “both modes wrong / nothing useful” → shared airflow handback
- Outdoor not running → Basic power visuals (breaker → disconnect visual-only), then call_pro — **no** Cap/contactor DIY on this HP path

**O vs B is OEM-specific** — never assume which way the valve is energized from this check.

If you smell burning, see sparks/smoke, or see water at electrical gear — Stop / get help.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `leaving_air_matches_mode` | Leaving air roughly matches the table for the mode calling | Not an obvious mode-swap pattern — shared basics / handback. |
| `mode_asymmetric_feel` | One mode feels right; the other mode blows wrong-temperature air while outdoor seems to run | Classic O/B / valve / control soft-fail pattern — pro outcome. |
| `outdoor_not_running_when_should` | Outdoor stays silent / idle when Heat or Cool is calling (Emergency Off) | Basic power visuals only — then call_pro; **never** Cap/contactor DIY conclude on HP. |
| `still_in_defrost_or_weird` | Still looks like defrost / steam / fan stopped in cold | Return to defrost discipline — do not chip ice. |
| `cannot_observe_safely` | I cannot observe safely / not sure | Do not force access. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `leaving_air_matches_mode` | **If `hp_landing=both_modes_fail` OR complaint persists both ways:** **next** `hp.handback.ac_filter_airflow`. **If single-mode complaint but leaving air matches and space still uncomfortable:** **next** `hp.handback.ac_filter_airflow` (filter/airflow shared). Do **not** invent HP refrigerant DIY. |
| `mode_asymmetric_feel` | **next** `hp.rv.mode_asymmetric` |
| `outdoor_not_running_when_should` | **next** `ac.cool.power.breaker_visual` — then engine continues **next** `ac.cool.power.disconnect_visual` per that node’s map → **terminal** `call_pro` reason **`hp_outdoor_not_running_wave1`**. **HP overlay (LOCKED):** reuse AC Basic power visuals only (panel door / disconnect **visual position only** — no lever operate, no covers, no deadfront). After visuals exhausted → `call_pro` `hp_outdoor_not_running_wave1`. **Never** Cap/contactor DIY conclude on this HP path. **Never** route to `ac.cool.conclude.call_pro_capacitor_contactor`. Optional product entry via `ac.start.breaker_disconnect` hub is OK **only if** it lands on the same breaker_visual → disconnect_visual chain (no Advanced). |
| `still_in_defrost_or_weird` | **next** `hp.defrost.sanity` — one loop back; if already failed recover → conclude path |
| `cannot_observe_safely` | **terminal** `insufficient_info` — note what you can for a licensed HVAC pro; do not remove covers |

## diy_tier
`basic` (observation only)

## safety_gate
`false`

## hazard_exit
`null` (burning / sparking / smoke / water → Stop / get help; not soft DIY continue)

## audit_event
`node_entered:hp.observe.leaving_air_vs_mode` · `answer_selected:<id>` · asymmetric → RV node · outdoor dead → handoff `ac.cool.power.breaker_visual` · after disconnect exhausted: `conclusion_reached:call_pro` reason `hp_outdoor_not_running_wave1`

## notes
- Node type: observation.
- Tree version: **`hp.air_source.v0`**.
- Replaces cool-only assumption that “outdoor cold = failed.”
- **Must-fix / Q3 (Commander 2026-09-23):** `outdoor_not_running_when_should` → `ac.cool.power.breaker_visual` → `ac.cool.power.disconnect_visual` → `call_pro` `hp_outdoor_not_running_wave1`. Document overlay here + edge map; tiny cross-ref notes also on AC breaker/disconnect nodes. **Never** Cap/contactor DIY conclude on this HP path.
- Inverter quiet-low vs failed: if barely audible in heat, do not amp-clamp — prefer `call_pro` / insufficient_info over Slice-2 deep trunk (not in Wave-1).
- Honesty flag: hand feel of leaving air is crude; wind and recent defrost confuse it — asymmetric pattern needs homeowner confidence; when soft → handback or insufficient_info rather than fake valve certainty.
- Wave-1 paper: deep-write DONE 2026-09-23; Commander must-fix pass 2026-09-23.
