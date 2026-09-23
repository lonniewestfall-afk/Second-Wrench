# hp.rv.mode_asymmetric

## id
`hp.rv.mode_asymmetric`

## prompt
**Mode-asymmetric pattern — control / O-B / reversing valve family**

You reported a pattern like one of these (while the outdoor unit seemed to run):

- **Cool works**, but **heat blows cool / room-temp air**
- **Heat works**, but **cool blows warm air**
- Mode change used to make a brief whoosh/click; now one mode never “feels” right

That pattern often involves thermostat **O/B** configuration, outdoor control, or a reversing valve that is not shifting — **not** a homeowner refrigerant DIY and **not** a magnet / jumper force-out.

**Hard rules for this step:**

- Do **not** assume whether your brand energizes O or B in heat or cool — **OEM-specific**
- Do **not** force the valve with magnets or tools
- Do **not** jump safeties or open electrical panels
- Do **not** attach gauges or add/remove refrigerant
- If you recently replaced the thermostat, tell the pro — O/B setting mistakes are common

Confirm the pattern from what you already observed. The **outcome is professional-only**.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `asymmetric_pattern_confirmed` | Yes — one mode OK, the other wrong while outdoor runs | → call_pro conclude (valve/control/O-B family). |
| `pattern_not_really_asymmetric` | On second thought, both modes fail or outdoor does not run | Symmetric → handback; outdoor dead → power visuals then call_pro (never Cap). |
| `recent_tstat_swap_ob_unsure` | I replaced the thermostat and I am unsure about O/B | Pro verify — do not guess jumpers if unsure. |
| `not_sure_pattern` | I am not sure the pattern holds | Do not invent a valve diagnosis. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `asymmetric_pattern_confirmed` | **next** `hp.conclude.call_pro_defrost_valve_control` — reason family `mode_asymmetric_rv_ob_control`; **pro_only** outcome (never DIY Advanced while HP electrical Advanced OFF) |
| `pattern_not_really_asymmetric` | **If outdoor not running:** **next** `ac.cool.power.breaker_visual` → `ac.cool.power.disconnect_visual` → **terminal** `call_pro` reason `hp_outdoor_not_running_wave1` (same HP overlay as observe — **never** Cap conclude). **Else:** **next** `hp.handback.ac_filter_airflow` |
| `recent_tstat_swap_ob_unsure` | **next** `hp.conclude.call_pro_defrost_valve_control` — reason `thermostat_ob_uncertain_after_swap`; still **no** homeowner O/B jumper DIY in Wave-1 (default Pro if unsure per planning boundaries) |
| `not_sure_pattern` | **If filter not done this session:** **next** `hp.handback.ac_filter_airflow`. **Else:** **terminal** `insufficient_info` |

## diy_tier
`pro_only`

## safety_gate
`false`

## hazard_exit
`null`

## audit_event
`node_entered:hp.rv.mode_asymmetric` · `answer_selected:<id>` · on confirmed/OB-unsure: route conclude · `diy_tier_shown:pro_only` / `conclusion_reached:call_pro`

## notes
- Node type: question → conclusion bridge.
- Tree version: **`hp.air_source.v0`**.
- Planning lock: prompt may use Basic observational language; **`diy_tier` enum is `pro_only` only** (Commander supplemental B — no hybrid `basic→pro_only` field).
- **Must-fix:** `not_sure_pattern` deterministic — handback if filter not done this session, else `insufficient_info`.
- Gray zone “user confident about O/B” still defaults **Pro** in Wave-1 (planning table: Advanced→else Pro; Advanced electrical OFF on HP).
- Never soft-enable reversing-valve DIY or magnet tricks.
- Wave-1 paper: deep-write DONE 2026-09-23; Commander must-fix pass 2026-09-23.
- **Re-check 2026-09-23:** outdoor-dead branch uses breaker→disconnect visuals before `hp_outdoor_not_running_wave1` (parity with observe).
