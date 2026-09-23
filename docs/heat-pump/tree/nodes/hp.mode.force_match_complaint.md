# hp.mode.force_match_complaint

## id
`hp.mode.force_match_complaint`

## prompt
**Force Heat or Cool — kill the Auto trap**

Auto mode can call the wrong thing or chase a deadband, which makes heat-pump problems look like a failed outdoor unit.

Without opening equipment:

1. Set the thermostat mode explicitly to **Heat** if your complaint is no heat / poor heat / ice in heating season, or **Cool** if your complaint is no cool / poor cool.
2. Move the setpoint **2–3°F** past room temperature in the call direction (above for heat, below for cool).
3. Wait **5–10 minutes** (longer in very cold weather is OK). Watch from a safe distance — do not remove covers.

Then tell us what happened.

Do not set Emergency / Aux just to “make heat faster” unless you already understand that may shut the compressor off on purpose.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `forced_problem_gone` | Forced Heat/Cool — problem went away | Often Auto deadband / schedule — not sealed-system DIY. |
| `forced_problem_remains` | Forced Heat/Cool — problem is still there | Continue Emergency check → ambient / defrost trunk. |
| `could_not_change_mode` | I cannot change mode / thermostat will not accept Heat or Cool | Do not force wiring DIY. |
| `not_sure_waited` | I am not sure / did not wait | Do not guess after a few seconds. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `forced_problem_gone` | **terminal** `next_step` DIY Basic — Leave system in forced **Heat** or **Cool** matching the need; avoid Auto until you understand deadband / schedule; if Auto must be used, widen heat↔cool separation per thermostat manual. If problem returns only in Auto, that is control/settings — not a reason to open the outdoor unit. Call a pro only if you want thermostat programming help. |
| `forced_problem_remains` | **next** `hp.mode.emergency_aux_off` |
| `could_not_change_mode` | **terminal** `call_pro` (reason: `thermostat_mode_locked_or_unchangeable`) — do not open low-voltage wiring DIY if unsure; O/B miswire after a thermostat swap is pro-leaning |
| `not_sure_waited` | **terminal** `insufficient_info` — wait the full 5–10 minutes in forced mode, then return |

## diy_tier
`basic`

## safety_gate
`false`

## hazard_exit
`null`

## audit_event
`node_entered:hp.mode.force_match_complaint` · `answer_selected:<id>` · on problem_gone: `conclusion_reached:next_step_basic` · `diy_tier_shown:basic`

## notes
- Node type: test / coaching.
- Reached only from `hp.mode.thermostat_check` when mode is Auto.
- Trade rationale: Auto mis-calls are a top false “bad compressor / bad valve” path on HPs.
- No O/B jumper DIY; no magnet / force-valve tricks.
- If user reports burning / sparks while waiting → Stop / emergency_exit (point back to gate language) — do not soft-continue.
- Wave-1 paper: deep-write DONE 2026-09-23.
