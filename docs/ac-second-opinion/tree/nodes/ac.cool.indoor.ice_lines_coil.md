# ac.cool.indoor.ice_lines_coil

## id
`ac.cool.indoor.ice_lines_coil`

## prompt
**Ice on lines or indoor coil?**

Without removing panels or chipping ice:

- Look at the larger refrigerant suction line (often insulated) near the outdoor unit or where lines enter the house — is there heavy frost or ice?
- If you can see the indoor coil area through an existing access designed for homeowner view only, is there ice buildup? **Do not force cabinets open.**
- Is water pooling from melting ice near equipment?

If you see ice: do **not** keep running the system to “force cool.” Do not chip ice with tools.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `ice_observed` | Yes — ice or heavy frost on lines / coil | Thaw discipline required. |
| `no_ice_observed` | No ice seen | Cooling still not established → pro path. |
| `want_keep_running_despite_ice` | There is ice, but I want to keep the system running | Hard stop. |
| `not_sure_cannot_see` | I am not sure / cannot see safely | Do not open covers to find ice. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `ice_observed` | **terminal** `next_step` DIY Basic — Set thermostat to **Off** (not just raise setpoint). Allow ice to thaw naturally. Do not chip ice. Check/replace filter if not already done. After full thaw (often hours), restore Cool and retest. If ice returns or still no cool → `call_pro` (reason: `ice_recurs_or_no_cool_after_thaw` — metering / refrigerant / deeper airflow are pro_only). |
| `no_ice_observed` | **terminal** `call_pro` (reason: `cooling_not_established_basics_clear`) — air may be moving but cooling not established after mode/filter/fan checks; service note for licensed HVAC |
| `want_keep_running_despite_ice` | **terminal** `emergency_exit` (reason: `ice_keep_running` / gate `ac.gate.ice_keep_running`) — stop run-it-anyway; turn system Off; ice + forced run risks compressor and water damage; schedule thaw + pro diagnosis |
| `not_sure_cannot_see` | **terminal** `insufficient_info` — or `call_pro` if symptoms (no cool + prior basics) already warrant service |

## diy_tier
`basic`

## safety_gate
`true` for choice `want_keep_running_despite_ice` only; otherwise `false` on the observation itself

## hazard_exit
`ice_keep_running` when user insists on keep-running · else `null`

## audit_event
`node_entered:ac.cool.indoor.ice_lines_coil` · on keep-running: `gate_fired:ice_keep_running` + `exit_ramp` · on Basic thaw: `conclusion_reached:next_step_basic` · `diy_tier_shown:basic`

## notes
- Implements ice keep-running gate language from conventions/safety-gates.md without a separate Wave-1 id for `ac.gate.ice_keep_running` — choice fires equivalent exit.
- **Wave-2:** Commander CUT standalone `ac.gate.ice_keep_running` — keep ice keep-running **INLINED** on this node only (no standalone gate file).
- **deferred_node:** `ac.cool.indoor.thaw_off` as standalone instructional node; thaw text is inlined in Basic next_step for Wave-1.
- Refrigerant / metering device diagnosis remains pro_only — never DIY.
- Node type: observation / gate (conditional).
