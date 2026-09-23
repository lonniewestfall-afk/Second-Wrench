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
| `heat_pump` | A heat pump | Heat-pump-specific operation is not covered in this beta. |
| `mini_window_portable` | A mini-split, window, or portable unit | Out of scope for this beta. |
| `geo_packaged_other` | Geothermal, packaged, or another system | Out of scope for this beta. |
| `not_sure` | I am not sure | Do not open covers to find out. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `split_central_cool_only` | **next** `ac.cool.landing.picker` |
| `heat_pump` | **terminal** `insufficient_info` — deferral: Heat Pump Lead owns HP paths; do not invent HP diagnoses here. User-facing: this beta does not cover heat-pump-specific operation. |
| `mini_window_portable` | **terminal** `insufficient_info` (alt acceptable: `call_pro` reason `out_of_scope_equipment`) — out of scope; hire appropriate tech for that equipment type |
| `geo_packaged_other` | **terminal** `insufficient_info` (alt acceptable: `call_pro` reason `out_of_scope_equipment`) — out of scope |
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
- Mini-split / WSHP / geothermal owned by later leads; schema extends (`ms.` / `wshp.` / `hp.`), does not fork.
- Node type: intake.
