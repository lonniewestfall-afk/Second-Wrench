# ac.adv.cap.reassemble_restore_test

## id
`ac.adv.cap.reassemble_restore_test`

## prompt
**Stage 7 — Reassemble, restore power, brief Cool test**

**ABSOLUTE:** All covers / compartment doors must be **ON** before you restore power. Never restore power with covers off.

1. Reinstall electrical compartment cover(s) fully and securely.
2. Confirm no tools or loose hardware left inside.
3. Restore outdoor disconnect to On only after covers are on.
4. Set thermostat to Cool and allow a **brief** call for cool.
5. From a safe distance: does the outdoor fan start normally without abnormal smell, spark, or stuck hum-with-no-start?

**Abnormal smell / spark** → kill power if safe → **emergency_exit**.  
**Hum / no-start after replace** → kill power if safe → **call_pro**.  
**Cannot reassemble covers** → leave power **Off** → **call_pro**.

Brief test only. This is not a full commissioning procedure.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `covers_on_test_ok` | Covers on; brief Cool test looks normal | Advanced path complete. |
| `abnormal_smell_spark` | Abnormal smell or spark after restore | Emergency — kill if safe. |
| `hum_no_start_after_replace` | Hum / no-start after replace | Kill if safe → call_pro. |
| `cannot_reassemble` | Cannot reassemble covers securely | Leave power Off. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `covers_on_test_ok` | **terminal** `next_step` DIY Advanced — Session conclusion `next_step_advanced`: covers stayed on; brief Cool test OK; monitor comfort; if problems return → call licensed HVAC. Audit `conclusion_reached:next_step_advanced`. |
| `abnormal_smell_spark` | **terminal** `emergency_exit` — kill power if safe; get help; never soft continue |
| `hum_no_start_after_replace` | **terminal** `call_pro` (reason: `hum_no_start_after_cap_replace`) — kill power if safe first |
| `cannot_reassemble` | **terminal** `call_pro` (reason: `cannot_reassemble_leave_power_off`) — leave power Off |

## diy_tier
`advanced`

## safety_gate
`true` on abnormal smell/spark/hum-no-start after restore / cannot reassemble

## hazard_exit
`burning_smell` / `sparking` / `smoke` on abnormal · else call_pro with power Off

## audit_event
`node_entered:ac.adv.cap.reassemble_restore_test` · on success: `conclusion_reached:next_step_advanced` · `diy_tier_shown:advanced` · on hazard: `exit_ramp` · `notes.advanced_diy:on` for session summary when path completed

## notes
- **Covers ON before restore power — absolute** (LOCKED).
- Never restore power with covers off. Brief test only.
- Node type: procedure / Stage 7 / conclusion.
- Brand: scarlet wrench + dark charcoal/grey/walnut — never green.
