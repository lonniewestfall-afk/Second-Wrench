# ac.cool.conclude.call_pro_capacitor_contactor

## id
`ac.cool.conclude.call_pro_capacitor_contactor`

## prompt
**Call a licensed HVAC professional — suspected start components**

Based on your answers (outdoor hum / buzz while the fan is not spinning, or equivalent start evidence while cool is calling), a common professional check is the outdoor **contactor** and/or **capacitor**.

**Advanced DIY product flag:** `advancedRepairsEnabled` is **FALSE** in public runtime. Do not attempt capacitor discharge, capacitor replacement, contactor replacement, or any cover-off electrical work from this guide while the flag is off.

What to do:

1. Leave the system safe (Off at thermostat is fine; shut disconnect/breaker only if you already know how and conditions are dry/safe).
2. Call a licensed HVAC tech.
3. You may tell them: outdoor unit hummed or showed start symptoms while the condenser fan was not spinning; homeowner Basic checks only (no covers removed).

This is not a confirmed parts diagnosis — it is a ranked reason to stop DIY and get service.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `ack_call_pro` | Understood — call a professional | Terminal acknowledgment. |
| `want_diy_capacitor_anyway` | I want to replace the capacitor myself | Not offered as live DIY while Advanced flag false. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `ack_call_pro` | **terminal** `call_pro` (reason: `suspected_capacitor_contactor_advanced_off`) |
| `want_diy_capacitor_anyway` | **if `advancedRepairsEnabled == false`:** **terminal** `call_pro` (reason: `suspected_capacitor_contactor_advanced_off`) — same outcome; do **not** emit `next_step` DIY Advanced; UI may restate Advanced is disabled. **if `advancedRepairsEnabled == true` (after attorney/Terms + Commander flip only):** **next** `ac.adv.cap.prereq_gate_cluster` (user may still choose call_pro without entering Advanced). Public runtime stays flag_off. |

## diy_tier
`pro_only` while flag false (Advanced-bound work presented as call_pro); when flag true, alternate edge may show `advanced`

## safety_gate
`false`

## hazard_exit
`null`

## audit_event
`node_entered:ac.cool.conclude.call_pro_capacitor_contactor` · `advanced_flag_checked` · when false: `advanced_path_suppressed` + `conclusion_reached:call_pro` · `notes.advanced_diy:off` · when true and offered: `advanced_path_offered`

## notes
- **MUST** terminate as `call_pro` while `advancedRepairsEnabled == false` — NEVER `next_step` DIY Advanced (PRODUCT LOCK 2026-09-23).
- Runtime rule: `if advancedRepairsEnabled == false` → never show Advanced; conclude → `call_pro` (`suspected_capacitor_contactor_advanced_off`).
- `public_runtime=flag_off`; `private_sandbox_may_enable=true` only after Commander second safety pass (then drag-drop zip; Donnie will NOT wire GitHub to private Netlify).
- Full Advanced specs: `tree/advanced/nodes/*` + `tree/advanced/capacitor-gated-outline.md`. Contactor still not in capacitor Advanced path.
- Do not soft-enable by deleting Call-pro.
- Node type: conclusion.
