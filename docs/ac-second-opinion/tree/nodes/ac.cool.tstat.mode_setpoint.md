# ac.cool.tstat.mode_setpoint

## id
`ac.cool.tstat.mode_setpoint`

## prompt
**Thermostat — Cool mode and setpoint**

Without opening equipment: look at the thermostat you already use.

1. Is the system mode set to **Cool** (not Heat, Off, or Emergency Heat)?
2. Is the cool setpoint **below** the current room temperature (enough that the system should be calling for cool)?
3. Fan set to **Auto** or **On** is fine for this check.

Do not remove the thermostat from the wall. Do not open the furnace or air-handler cabinet.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `mode_wrong_or_setpoint_high` | Mode is not Cool, or setpoint is at/above room temp | Easy setting fix first. |
| `mode_cool_setpoint_ok` | Mode is Cool and setpoint is below room temp | Continue checks. |
| `tstat_blank_or_unreadable` | Thermostat is blank or I cannot read it | Route to blank-thermostat Basic path. |
| `not_sure` | I am not sure | Do not guess. Do not pull the thermostat off the wall. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `mode_wrong_or_setpoint_high` | **terminal** `next_step` DIY Basic — Set mode to Cool; lower setpoint several degrees below room temp; wait and retest (often 10–15 minutes). If still not cooling after retest with mode/setpoint correct, restart session at landing or continue from filter check when product supports resume. |
| `mode_cool_setpoint_ok` | **next** `ac.cool.filter.check` |
| `tstat_blank_or_unreadable` | **next** `ac.tstat.blank.batteries` |
| `not_sure` | **terminal** `insufficient_info` — confirm mode/setpoint from the thermostat display or manual before further DIY; do not open equipment |

## diy_tier
`basic`

## safety_gate
`false`

## hazard_exit
`null`

## audit_event
`node_entered:ac.cool.tstat.mode_setpoint` · `answer_selected:<id>` · on Basic fix: `conclusion_reached:next_step_basic` · `diy_tier_shown:basic`

## notes
- Shared entry for Not cooling landing; also useful after Will not start if product later inserts mode check first.
- **deferred_node:** `ac.cool.power.breaker_visual`, `ac.cool.power.disconnect_visual` — not Wave-1; if mode OK but unit dead, outdoor silent/hum path covers start split.
- Node type: question / observation.
