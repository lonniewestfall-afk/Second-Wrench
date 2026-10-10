# ac.cool.intake.system_confirm

## id
`ac.cool.intake.system_confirm`

## prompt
**YOUR SYSTEM — What kind of cooling system is this?**

Use an existing manual or what you already know. Do not remove a cover or climb to identify equipment.

This beta covers confirmed conventional, cooling-only split-system central AC (outdoor cooling-only condenser + indoor furnace or air handler).

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `split_central_cool_only` | Central AC with separate indoor and outdoor units | A cooling-only outdoor AC connected to an indoor furnace or air handler. |
| `heat_pump` | A heat pump | Continue on the air-source heat pump check (`hp.air_source.v1`). Cooling-only steps stay on this AC path. |
| `ductless_mini_split` | A ductless mini-split | Continue on the mini-split check (`ms.ductless.v0`). |
| `window_portable` | A window or portable unit | Out of scope for this beta. |
| `geo_packaged_other` | Geothermal, packaged, or another system | Water-source / geothermal: start again, choose Something else, then Water-source / geothermal heat pump. Packaged systems are not covered yet. |
| `not_sure` | I am not sure | Do not open covers to find out. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `split_central_cool_only` | **next** `ac.cool.landing.picker` |
| `heat_pump` | **next** `hp.intake.system_confirm` — product lane switches to `hp.air_source.v1`. Does not invent a heat-pump diagnosis inside AC nodes. |
| `ductless_mini_split` | **next** `ms.intake.system_confirm` — product lane switches to `ms.ductless.v0`. |
| `window_portable` | **terminal** `insufficient_info` (`out_of_scope_equipment`) — window and portable units stay out of this beta |
| `geo_packaged_other` | **terminal** `insufficient_info` (`out_of_scope_equipment`) — points a water-source owner back to Something else |
| `not_sure` | **terminal** `insufficient_info` — guidance: do not open covers; use the manual or ask someone familiar with the equipment; return when you can confirm split central cooling-only |

## diy_tier
`basic`

## safety_gate
`false`

## hazard_exit
`null`

## audit_event
`node_entered:ac.cool.intake.system_confirm` · `answer_selected:<id>` · on out-of-scope/not-sure: `conclusion_reached:insufficient_info`

## notes
- Heat pump deferral language stands — do not soft-route into cooling trunk.
- Live tree `ac.cool.v1`. The ductless option is a lane change, not an out-of-scope result. Schema extends (`ms.`), it does not fork.
- Node type: intake.
