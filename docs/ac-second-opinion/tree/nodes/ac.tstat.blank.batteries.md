# ac.tstat.blank.batteries

## id
`ac.tstat.blank.batteries`

## prompt
**Blank thermostat — batteries first (Basic)**

If the thermostat display is blank:

1. Check whether this thermostat uses replaceable batteries (often AA/AAA behind a pull-off face — only if the face is designed for homeowner battery access).
2. If yes, replace with fresh batteries of the correct type.
3. Do **not** open the furnace/air-handler control board. Do **not** pull thermostat wiring from the wall to “test” for power. Do **not** work inside the breaker panel.

If the thermostat is hardwired / powered by the system (C-wire / common) and stays blank after any designed battery check, that is usually a professional electrical / transformer path.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `batteries_replaced_display_back` | Replaced batteries; display works again | Basic success — retest cool call. |
| `batteries_replaced_still_blank` | Replaced batteries (or no battery compartment); still blank | Pro path. |
| `hardwired_or_no_batteries` | Hardwired / no batteries; display blank | Pro path — C-wire / transformer / control power. |
| `cannot_access_safely` | I cannot access batteries safely | Do not force the face off if unsure. |
| `not_sure` | I am not sure | Do not open equipment. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `batteries_replaced_display_back` | **terminal** `next_step` DIY Basic — Confirm mode Cool and setpoint below room; wait and retest. If system still will not cool/start after display returns, continue from landing (Not cooling or Will not start) in a new pass. |
| `batteries_replaced_still_blank` | **terminal** `call_pro` (reason: `blank_tstat_after_batteries`) — likely control power / C-wire / transformer / thermostat failure; pro_only beyond battery swap |
| `hardwired_or_no_batteries` | **terminal** `call_pro` (reason: `blank_tstat_hardwired_power`) — same; do not open furnace board |
| `cannot_access_safely` | **terminal** `insufficient_info` or `call_pro` (reason: `tstat_inaccessible`) |
| `not_sure` | **terminal** `insufficient_info` |

## diy_tier
`basic`

## safety_gate
`false`

## hazard_exit
`null`

## audit_event
`node_entered:ac.tstat.blank.batteries` · `answer_selected:<id>` · on Basic success: `conclusion_reached:next_step_basic` · `diy_tier_shown:basic` · on pro: `conclusion_reached:call_pro`

## notes
- **deferred_node:** `ac.tstat.blank.power_steal_cwire` — not Wave-1; stays call_pro.
- Never authorize control-board or panel interior DIY.
- Node type: test / Basic DIY.
