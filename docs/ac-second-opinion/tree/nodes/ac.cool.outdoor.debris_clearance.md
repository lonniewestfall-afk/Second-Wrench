# ac.cool.outdoor.debris_clearance

## id
`ac.cool.outdoor.debris_clearance`

## prompt
**Outdoor unit — exterior debris and clearance**

Outdoor fan is spinning (or you are clearing exterior before deeper cool checks). From outside the cabinet only:

- Remove leaves, grass clippings, and loose debris from the **top and sides** of the outdoor unit and from the pad area.
- Confirm rough clearance: typically keep sides/top from being smothered by shrubs, stored items, or piled debris (follow manufacturer clearance if you have the manual; do not invent exact inches here).
- Work from **outside** the grille. Do **not** put hands or tools through the grille while power is on.

**If you need to reach into / past the grille** (pull packed debris from coil face deep in the grille):

1. Shut the system Off at the thermostat.
2. If you already know a safe homeowner kill (breaker door / disconnect you can verify), kill power first — otherwise **stop and call a pro** rather than reach in live.
3. Do not comb coil fins with tools into coil depth as invasive DIY from this guide.

Wet weather, water near electrical, or damaged outdoor wiring → do not continue; use safety stop / call pro.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `exterior_cleared_ok` | Exterior debris cleared; sides/top look open enough | Continue cool checks. |
| `need_reach_into_grille` | Debris requires reaching into / past the grille | Shut off first or call_pro — never reach in live. |
| `wet_or_electrical_nearby` | Wet conditions or electrical concern outdoors | Hard stop. |
| `cannot_access_yard_unit` | Cannot safely access outdoor unit | Do not force. |
| `want_fin_comb_deep_coil` | I want to comb fins deep into the coil with tools | Not Basic invasive — call_pro. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `exterior_cleared_ok` | **next** `ac.cool.indoor.ice_lines_coil` (Not cooling chain continues) |
| `need_reach_into_grille` | **terminal** `next_step` DIY Basic — Shut Off at thermostat; kill outdoor power only if you already know a safe dry homeowner path and can verify Off; then clear exterior-facing debris without forcing deep coil teardown. If you cannot kill power safely → `call_pro` (`gate_fired:cannot_kill_power`). After clear, restore Cool and retest; if still no cool → continue ice / call_pro. |
| `wet_or_electrical_nearby` | **terminal** `call_pro` or `emergency_exit` (`water_near_electrical` / `wet_hands_flood`) — never soft continue |
| `cannot_access_yard_unit` | **terminal** `call_pro` (reason: `outdoor_inaccessible`) or `insufficient_info` |
| `want_fin_comb_deep_coil` | **terminal** `call_pro` (reason: `coil_service_pro_only`) |

## diy_tier
`basic`

## safety_gate
`true` when reaching into grille without kill, wet/electrical, or invasive coil work intent

## hazard_exit
`water_near_electrical` / `wet_hands_flood` when wet-electrical · else `null` with call_pro for cannot-kill

## audit_event
`node_entered:ac.cool.outdoor.debris_clearance` · `answer_selected:<id>` · on wet: `gate_fired:water_near_electrical` · on Basic clear: `diy_tier_shown:basic`

## notes
- Wired from `ac.cool.outdoor.fan_spinning` when `fan_spinning` (insert before ice path).
- Exterior only. Visual OK with power on from safe distance; **shut off if reaching into grille**.
- No coil chemical clean / cabinet teardown.
- Node type: observation / Basic DIY.
- Brand: scarlet wrench + dark charcoal/grey/walnut — never green.
