# hp.conclude.call_pro_defrost_valve_control

## id
`hp.conclude.call_pro_defrost_valve_control`

## prompt
**Call a licensed HVAC professional — defrost / reversing valve / O-B / control family**

Based on your answers, homeowner Basic checks are no longer the right next step. Common professional buckets for what you described include:

- Failed or stuck **defrost** (sensor, control board, valve not shifting for melt)
- **Reversing valve** or outdoor control not shifting modes correctly
- Thermostat **O/B** configuration / low-voltage control issues (especially after a thermostat swap)

**What this is not:** a confirmed parts diagnosis. It is a ranked reason to **stop DIY** and get service.

**Do not attempt from this guide:**

- Capacitor or contactor work (HP Advanced electrical is **OFF** → call_pro)
- Inverter board, amp draw, strip sequencers, panel interior
- Refrigerant gauges / charge / reclaim
- Magnets, jumping safeties, or forcing the reversing valve

What to do:

1. Leave the system safe — thermostat **Off** is fine if ice was involved. For outdoor power: **visual / familiar storm shutoff only** — if you already safely use the outdoor disconnect or breaker as a storm shutoff and conditions are dry, you may leave it Off the way you already know; Basic does **not** teach operating the disconnect lever as a diagnostic procedure (aligns with AC `ac.cool.power.disconnect_visual` visual-position-only lock). If unsure, wet, or unfamiliar — leave power alone and call the pro.
2. Call a licensed HVAC tech (EPA 608 capability if sealed-system work may be needed).
3. You may tell them: heat-pump mode/Emergency/ambient/defrost Basic checks only; outdoor iced without recover and/or mode-asymmetric leaving-air pattern; **no covers removed**; O vs B not assumed.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `ack_call_pro` | Understood — call a professional | Terminal acknowledgment. |
| `want_diy_valve_or_electrical_anyway` | I want to force the valve / do electrical DIY myself | Not offered as live DIY — Advanced OFF / pro_only. |
| `want_diy_refrigerant_anyway` | I want to add refrigerant / use gauges | Hard stop — never DIY. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `ack_call_pro` | **terminal** `call_pro` (reason: `hp_defrost_valve_ob_control`) — subtype may be stamped from entry: `defrost_failure_suspected` \| `mode_asymmetric_rv_ob_control` \| `thermostat_ob_uncertain_after_swap` |
| `want_diy_valve_or_electrical_anyway` | **terminal** `call_pro` (reason: `hp_defrost_valve_ob_control`) — same outcome; UI may restate Advanced electrical is disabled on HP and valve force-outs are pro_only; **never** emit `next_step` DIY Advanced |
| `want_diy_refrigerant_anyway` | **terminal** `call_pro` (reason: `refrigerant_intent`) — equivalent to gate `ac.gate.refrigerant_intent`; **never** DIY; optional escalate copy to emergency-style stop if release suspected |

## diy_tier
`pro_only`

## safety_gate
`false` (refrigerant intent choice is hard professional stop; release/alarm already owned by cluster)

## hazard_exit
`null` normally · `refrigerant_intent` when user insists on gauges/charge DIY language

## audit_event
`node_entered:hp.conclude.call_pro_defrost_valve_control` · `answer_selected:<id>` · `conclusion_reached:call_pro` · `notes.hp_advanced_electrical:off` · `notes.rv_force_out:forbidden`

## notes
- Node type: conclusion.
- Tree version: **`hp.air_source.v0`**.
- Shared sink for: `hp.defrost.sanity` iced_solid · `hp.rv.mode_asymmetric` confirmed / O-B unsure.
- Mirror AC conclude pattern (`ac.cool.conclude.call_pro_capacitor_contactor`) but **no** future Advanced flip edge for valve/refrigerant — those stay pro_only even if AC capacitor Advanced later enables.
- MUST terminate `call_pro` (or emergency if product maps refrigerant release) — NEVER `next_step` DIY Advanced.
- **Supplemental D:** leave-safe copy tightened to AC visual-only / “already use this for storms” — never teach lever operate as a diagnostic procedure.
- Wave-1 paper: deep-write DONE 2026-09-23; Commander must-fix pass 2026-09-23.
