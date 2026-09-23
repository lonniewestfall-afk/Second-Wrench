# ac.adv.cap.prereq_gate_cluster

## id
`ac.adv.cap.prereq_gate_cluster`

## prompt
**Advanced capacitor path — hard prerequisites (all must pass)**

You are entering a gated Advanced DIY path for **like-for-like outdoor run/dual capacitor** work only. Contactor replacement is **not** on this path.

**Runtime:** This node must only be reachable when `advancedRepairsEnabled == true`. If the flag is false, the engine must never show this node — conclude stays `call_pro` (`suspected_capacitor_contactor_advanced_off`).

All of the following must be true. Any fail → Call-pro or emergency. **No soft continue. No “I accept the risk” override.**

Confirm:

1. Equipment is cool-only residential **split central** (already confirmed this session via `ac.cool.intake.system_confirm`) — not heat pump / mini-split / packaged / window.
2. Session safety gates already cleared; no burning / smoke / spark / gas / flood active now.
3. You can safely kill power at the **outdoor disconnect** and verify Off (manufacturer homeowner path); dry hands and dry floor.
4. Dry conditions, adequate light, sober, 18+, no wet hands / flooding.
5. You understand capacitor identity and µF come **only from the label after verified dead** later — never guess µF now.
6. You will stop and call a pro if any step is unsure.

Residual charge can injure. Prefer Call-pro over risky DIY.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `all_prereqs_pass` | All prerequisites pass — continue Advanced | Proceed to pattern confirm. |
| `wrong_equipment` | Heat pump / mini-split / packaged / window / unsure class | Out of scope. |
| `cannot_kill_verify_off` | Cannot safely kill outdoor power / verify Off | Gate fire. |
| `wet_flood_unsafe_conditions` | Wet hands, flood, rain, or unsafe conditions | Emergency / call_pro. |
| `hazard_active_now` | Burning, smoke, sparks, gas, or flood active now | Emergency. |
| `abort_call_pro` | Call a professional instead | Always allowed. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `all_prereqs_pass` | **next** `ac.adv.cap.confirm_pattern` |
| `wrong_equipment` | **terminal** `call_pro` (reason: `out_of_scope_equipment`) |
| `cannot_kill_verify_off` | **terminal** `call_pro` (reason: `gate_fired:cannot_kill_power`) |
| `wet_flood_unsafe_conditions` | **terminal** `emergency_exit` or `call_pro` (`wet_hands_flood`) — never soft continue |
| `hazard_active_now` | **terminal** `emergency_exit` — re-fire cluster-style halt; never soft continue |
| `abort_call_pro` | **terminal** `call_pro` (reason: `user_elected_call_pro_advanced_abort`) |

## diy_tier
`advanced`

## safety_gate
`true`

## hazard_exit
Choice-dependent: `cannot_kill_power` \| `wet_hands_flood` \| cluster hazard reasons \| `null` on pass/abort-call_pro

## audit_event
`node_entered:ac.adv.cap.prereq_gate_cluster` · `advanced_path_entered` · `advanced_flag_checked` (must be true to reach) · `diy_tier_shown:advanced` · on fail: `gate_fired:<id>` + `exit_ramp`

## notes
- Owns hard prerequisites gate cluster from `capacitor-gated-outline.md`.
- Entry only from `ac.cool.conclude.call_pro_capacitor_contactor` when flag true and user elects gated Advanced.
- Capacitor label unknown / µF guess is enforced again at identify stage — prereq only confirms user accepts that rule.
- Node type: gate cluster.
- Brand: scarlet wrench + dark charcoal/grey/walnut — never green. Never invent “2W”.
