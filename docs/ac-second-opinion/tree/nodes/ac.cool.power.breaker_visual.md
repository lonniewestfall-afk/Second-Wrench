# ac.cool.power.breaker_visual

## id
`ac.cool.power.breaker_visual`

## prompt
**Breaker panel — visual check only (door open)**

You are confirming whether the outdoor / AC circuit breaker looks tripped, Off, or On. This is a **panel door** check only.

Rules:

- Stand on a **dry floor** with **dry hands**.
- Open only the **outer door** of the breaker panel if you already know how and it is designed for homeowner label reading.
- **Do not** remove the deadfront / cover that exposes bus bars.
- **Do not** probe, meter, or touch screw terminals.
- Find the breaker labeled for outdoor unit / AC / condenser / heat pump outdoor (labels vary). If you cannot identify which breaker is for the outdoor unit, stop and call a pro.

Look at the handle position:

- **Tripped** — often midway between On and Off (brand-dependent)
- **Off**
- **On**

Optional homeowner reset: only if the floor and hands are dry, you are certain which breaker is the outdoor/AC circuit, and it is a standard toggle you already know how to reset. If unsure which breaker, wet, flooded, aluminum wiring uncertain, or panel looks damaged — do **not** reset; call a pro.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `breaker_on_confirmed` | Breaker for outdoor/AC looks On | Continue silent-path power visuals. |
| `breaker_tripped_or_off` | Breaker looks tripped or Off | Optional safe reset only if dry and you know which breaker. |
| `breaker_reset_ok_still_silent` | I reset it safely; outdoor still silent when Cool calling | Continue to disconnect visual. |
| `unsure_which_breaker` | I cannot tell which breaker is for the outdoor unit | Do not guess. |
| `cannot_open_or_wet_unsafe` | Wet floor/hands, flood, damaged panel, or cannot open door safely | Hard stop — no panel DIY. |
| `want_panel_interior` | I need to remove the deadfront / see inside the panel | Not Basic — call pro / electrician. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `breaker_on_confirmed` | **next** `ac.cool.power.disconnect_visual` |
| `breaker_tripped_or_off` | **terminal** `next_step` DIY Basic — If dry hands/floor and you know the outdoor/AC breaker: move standard toggle fully Off, then On (or follow label). Retest Cool calling and outdoor silent vs start. If still silent after safe reset → continue session to `ac.cool.power.disconnect_visual` (re-enter hub / next visual). If unsure which breaker or reset feels unsafe → `call_pro` (reason: `cannot_identify_or_reset_breaker`). |
| `breaker_reset_ok_still_silent` | **next** `ac.cool.power.disconnect_visual` |
| `unsure_which_breaker` | **terminal** `call_pro` (reason: `cannot_identify_ac_breaker`) |
| `cannot_open_or_wet_unsafe` | **terminal** `call_pro` (reason: `gate_fired:cannot_kill_power` / wet-unsafe) — if standing water at panel → prefer `emergency_exit` (`wet_hands_flood`) |
| `want_panel_interior` | **terminal** `call_pro` (reason: `panel_interior_rejected`) — never Basic |

## diy_tier
`basic`

## safety_gate
`true` for wet / flood / panel-interior intent / cannot-kill; otherwise observation `false`

## hazard_exit
`wet_hands_flood` when water at panel · `null` otherwise (panel interior → call_pro, not soft continue)

## audit_event
`node_entered:ac.cool.power.breaker_visual` · `answer_selected:<id>` · on wet/unsafe: `gate_fired:cannot_kill_power` or `wet_hands_flood` · `diy_tier_shown:basic` when Basic reset next_step shown

## notes
- Exterior of panel / door only. Never deadfront off, never bus bars, never probing.
- Sequenced after hub `ac.start.breaker_disconnect` on outdoor silent path.
- Aluminum branch wiring uncertain → `call_pro` (electrician) — do not invent remediation.
- Node type: observation / optional Basic reset.
- Brand: scarlet wrench + dark charcoal/grey/walnut — never green. Do not invent “2W” brand.
