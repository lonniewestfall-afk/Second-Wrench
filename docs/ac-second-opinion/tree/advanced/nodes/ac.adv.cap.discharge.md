# ac.adv.cap.discharge

## id
`ac.adv.cap.discharge`

## prompt
**Stage 5 — Discharge (residual charge can injure)**

The capacitor can hold a hazardous charge even after power is Off. **Treat as charged until verified discharged.**

Use **only**:

- The **manufacturer’s documented discharge method** for this equipment, **or**
- A proper **insulated** discharge / bleed tool designed for capacitors (insulated leads + bleed resistor as specified by that tool’s instructions)

**NEVER:**

- Short terminals with a **screwdriver**
- Short with a **bare conductor**, pliers, wire, or coin
- Assume “it has been Off long enough” equals discharged
- Invent resistor ohm values or a fake short wait marketed as “safe enough”

If you are **unsure of the method** → **immediate call_pro**. Do not improvise.

If spark, shock, or smoke occurs during discharge → emergency exit — kill power if safe; get help.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `discharge_done_per_mfr_or_insulated_bleed` | Discharged per manufacturer method or proper insulated bleed tool | Continue to replace. |
| `unsure_discharge_method` | Unsure of correct discharge method | Immediate call_pro — absolute. |
| `spark_shock_smoke_during` | Spark, shock, or smoke during discharge | Emergency. |
| `abort_call_pro` | Abort — call a professional | Always allowed. |
| `tempted_screwdriver_short` | I was going to short with a screwdriver / bare metal | Forbidden — call_pro; never instruct that method. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `discharge_done_per_mfr_or_insulated_bleed` | **next** `ac.adv.cap.replace_like_for_like` |
| `unsure_discharge_method` | **terminal** `call_pro` (reason: `capacitor_discharge_unsure`) — **immediate**; no soft continue |
| `spark_shock_smoke_during` | **terminal** `emergency_exit` — kill power if safe; get help; never soft continue |
| `abort_call_pro` | **terminal** `call_pro` (reason: `user_elected_call_pro_advanced_abort`) |
| `tempted_screwdriver_short` | **terminal** `call_pro` (reason: `capacitor_discharge_unsure` / forbidden_method) — UI must **never** provide screwdriver-short steps |

## diy_tier
`advanced`

## safety_gate
`true` — unsure of method → immediate `call_pro`

## hazard_exit
`sparking` / shock / `smoke` on `spark_shock_smoke_during` · discharge-unsure → call_pro (not soft continue)

## audit_event
`node_entered:ac.adv.cap.discharge` · `answer_selected:<id>` · on unsure: `gate_fired:capacitor_discharge_unsure` · on hazard: `exit_ramp` · `diy_tier_shown:advanced`

## notes
- **NEVER** instruct shorting terminals with a screwdriver or bare conductor (LOCKED).
- EMPHASIZE residual charge can injure. Never imply “already Off long enough” equals discharged.
- Do not invent resistor ohm values unless quoting manufacturer doc the user has in hand.
- If user cannot follow manufacturer discharge method or proper insulated bleed tool → immediate `call_pro` (absolute).
- Node type: procedure / Stage 5 / hard safety.
