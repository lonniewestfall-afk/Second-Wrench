# ac.adv.cap.confirm_pattern

## id
`ac.adv.cap.confirm_pattern`

## prompt
**Stage 1 — Re-confirm Cool calling + outdoor hum / fan-not-spin**

Before any cover-off work, re-confirm the start pattern from a **safe distance** (no covers off, nothing through the grille):

- Thermostat mode **Cool**, setpoint calling (below room)
- Outdoor cabinet **hum or buzz**
- Outdoor **fan not spinning**

This links to the same observation language as `ac.start.outdoor_silent_vs_hum`. This guide does not invent a confirmed parts diagnosis — it ranks a start-component path for gated Advanced work when enabled.

If the pattern is not confirmed, stop Advanced and call a pro (or return to Basic observation). If hazard signs appear now, emergency exit — never soft continue.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `pattern_confirmed_hum_no_fan` | Confirmed: Cool calling, outdoor hum, fan not spinning | Continue to lockout. |
| `pattern_not_confirmed` | Pattern not confirmed | Do not open covers. |
| `hazard_seen_now` | Burning, sparks, smoke, or other hazard now | Emergency. |
| `want_call_pro` | Call a professional instead | Always allowed. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `pattern_confirmed_hum_no_fan` | **next** `ac.adv.cap.lockout_verify` |
| `pattern_not_confirmed` | **terminal** `call_pro` (reason: `cap_pattern_not_confirmed`) — optional product may offer return to `ac.start.outdoor_silent_vs_hum` as Basic observation only; do not open covers |
| `hazard_seen_now` | **terminal** `emergency_exit` — kill if safe; never soft continue |
| `want_call_pro` | **terminal** `call_pro` (reason: `user_elected_call_pro_advanced_abort`) |

## diy_tier
`advanced`

## safety_gate
`false` (pattern confirm); hazards → exit

## hazard_exit
`burning_smell` / `sparking` / `smoke` when `hazard_seen_now` · else `null`

## audit_event
`node_entered:ac.adv.cap.confirm_pattern` · `answer_selected:<id>` · `diy_tier_shown:advanced`

## notes
- No covers off. Safe distance only.
- Does not invent diagnosis beyond ranked start-component path.
- Node type: observation / Stage 1.
