# ac.cool.conclude.call_pro_capacitor_contactor

## id
`ac.cool.conclude.call_pro_capacitor_contactor`

## prompt
**Call a licensed HVAC professional — suspected start components**

Based on your answers (outdoor hum / buzz while the fan is not spinning, or equivalent start evidence while cool is calling), a common professional check is the outdoor **contactor** and/or **capacitor**.

**Advanced DIY is OFF in this beta.** Do not attempt capacitor discharge, capacitor replacement, contactor replacement, or any cover-off electrical work from this guide.

What to do:

1. Leave the system safe (Off at thermostat is fine; shut disconnect/breaker only if you already know how and conditions are dry/safe).
2. Call a licensed HVAC tech.
3. You may tell them: outdoor unit hummed or showed start symptoms while the condenser fan was not spinning; homeowner Basic checks only (no covers removed).

This is not a confirmed parts diagnosis — it is a ranked reason to stop DIY and get service.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `ack_call_pro` | Understood — call a professional | Terminal acknowledgment. |
| `want_diy_capacitor_anyway` | I want to replace the capacitor myself | Not offered as live DIY while Advanced OFF. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `ack_call_pro` | **terminal** `call_pro` (reason: `suspected_capacitor_contactor_advanced_off`) |
| `want_diy_capacitor_anyway` | **terminal** `call_pro` (reason: `suspected_capacitor_contactor_advanced_off`) — same outcome; do **not** emit `next_step` DIY Advanced; UI may restate Advanced is disabled |

## diy_tier
`pro_only` (Advanced-bound work while Advanced OFF → presented as call_pro)

## safety_gate
`false`

## hazard_exit
`null`

## audit_event
`node_entered:ac.cool.conclude.call_pro_capacitor_contactor` · `conclusion_reached:call_pro` · notes field may record `advanced_diy:off`

## notes
- **MUST** terminate as `call_pro` — NEVER `next_step` DIY Advanced while beta Advanced = OFF (Donnie lock 2026-09-22).
- When Commander later enables Advanced, this conclusion may gain an alternate Advanced next_step edge behind gates; do not soft-enable here.
- Row 12 of priority list. Shared conclusion from outdoor hum paths.
- Node type: conclusion.
