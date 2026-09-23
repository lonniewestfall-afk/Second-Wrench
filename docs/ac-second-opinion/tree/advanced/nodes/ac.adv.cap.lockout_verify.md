# ac.adv.cap.lockout_verify

## id
`ac.adv.cap.lockout_verify`

## prompt
**Stage 2 — Lockout and verify dead**

Before opening any outdoor electrical compartment:

1. Set thermostat to **Off**.
2. Turn outdoor disconnect to **Off** using the manufacturer homeowner path you already know and can do safely on dry ground.
3. Verify: no outdoor fan spin, no hum/buzz continuing as if still energized.
4. Wait the discharge / settle period **per manufacturer documentation** you have for this equipment. **Treat the capacitor as charged until verified discharged** (discharge procedure is a later stage — do not invent a fake short wait as “safe enough”).

If you cannot kill power, still hear hum/spin after Off, are unsure about wait/discharge readiness, or conditions are wet/unsafe → **call_pro / emergency**. Do not open covers.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `lockout_verified_dead` | Thermostat Off; disconnect Off; no spin/hum; ready to proceed per mfr wait guidance | Continue access. |
| `cannot_kill_power` | Cannot kill power / verify Off safely | Gate fire. |
| `still_hum_or_spin` | Still humming or spinning after Off | Do not open. |
| `unsure_wait_discharge` | Unsure about manufacturer wait / still treat as charged | Call_pro — no fake wait. |
| `wet_or_unsafe` | Wet hands, flood, or unsafe conditions | Emergency / call_pro. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `lockout_verified_dead` | **next** `ac.adv.cap.access_compartment` |
| `cannot_kill_power` | **terminal** `call_pro` (reason: `gate_fired:cannot_kill_power`) |
| `still_hum_or_spin` | **terminal** `call_pro` (reason: `still_live_symptoms_after_off`) — do not open |
| `unsure_wait_discharge` | **terminal** `call_pro` (reason: `capacitor_discharge_unsure`) — never invent “safe enough” short wait |
| `wet_or_unsafe` | **terminal** `emergency_exit` or `call_pro` (`wet_hands_flood`) — never soft continue |

## diy_tier
`advanced`

## safety_gate
`true`

## hazard_exit
`cannot_kill_power` \| `wet_hands_flood` \| `still_live_symptoms_after_off` \| `null` on verified

## audit_event
`node_entered:ac.adv.cap.lockout_verify` · `answer_selected:<id>` · on fail: `gate_fired:<id>` · `diy_tier_shown:advanced`

## notes
- Lockout copy rules: follow manufacturer wait; treat as charged until verified discharged. **Never** invent a fake short wait as “safe enough.”
- Node type: gate / Stage 2.
