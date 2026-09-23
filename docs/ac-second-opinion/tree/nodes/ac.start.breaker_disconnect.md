# ac.start.breaker_disconnect

## id
`ac.start.breaker_disconnect`

## prompt
**Will not start — Basic power visuals (hub)**

Outdoor unit is **silent** while Cool is calling. Before any further start DIY, confirm Basic power visuals in this order:

1. **Breaker panel door** — visual On / Off / tripped for the outdoor/AC circuit (no deadfront off)
2. **Outdoor disconnect** — **visual Off/On position only** from safe dry ground (no operating lever; no open-door / fuse pull)

This hub does not open panels or pull fuses. If you cannot do either check safely (wet, unsure, inaccessible, damaged), stop and call a licensed professional.

Know what’s wrong. Know what’s safe. Know when to call.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `begin_breaker_then_disconnect` | I can safely check breaker door, then disconnect visual | Sequence Basic visuals. |
| `cannot_safely_either` | I cannot safely check breaker or disconnect | Prefer Call-pro over risky DIY. |
| `already_did_breaker_go_disconnect` | Breaker visual already done — go to disconnect visual | Skip only if breaker node already cleared this session. |
| `want_advanced_or_covers_off` | I want capacitor / cover-off electrical DIY from here | Not offered from this Basic hub. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `begin_breaker_then_disconnect` | **next** `ac.cool.power.breaker_visual` (then engine continues to `ac.cool.power.disconnect_visual` per that node’s map) |
| `cannot_safely_either` | **terminal** `call_pro` (reason: `outdoor_silent_will_not_start` / `cannot_kill_power`) |
| `already_did_breaker_go_disconnect` | **next** `ac.cool.power.disconnect_visual` — only if `ac.cool.power.breaker_visual` already passed this session; else send to breaker first |
| `want_advanced_or_covers_off` | **terminal** `call_pro` (reason: `suspected_capacitor_contactor_advanced_off` or `high_voltage_intent`) — **No Advanced from this hub.** Cap/contactor path remains conclude → call_pro while `advancedRepairsEnabled` is false |

## diy_tier
`basic`

## safety_gate
`true` when user cannot safely perform either visual; hub itself is router only

## hazard_exit
`null` at hub; child nodes own wet / high-voltage exits — never soft continue past child gate fire

## audit_event
`node_entered:ac.start.breaker_disconnect` · `answer_selected:<id>` · on cannot-safe: `conclusion_reached:call_pro` · never `diy_tier_shown:advanced` from this hub

## notes
- Silent-path hub: `ac.start.outdoor_silent_vs_hum` (`outdoor_silent`) → **this hub** → `breaker_visual` → `disconnect_visual` → `call_pro` if still silent / visuals exhausted.
- Optional re-entry from Not cooling silent fan path via `ac.start.outdoor_silent_vs_hum`.
- **No Advanced** from this hub regardless of product flag — Advanced (when ever enabled) enters only from `ac.cool.conclude.call_pro_capacitor_contactor` after hum evidence.
- Node type: router / hub.
- Brand: scarlet wrench + dark charcoal/grey/walnut — never green.
