# Safety gates

Hard gates. Affirmative / failed check → tree **halts**. No soft continue. Prefer `emergency_exit` or `call_pro` per gate.

`safety_gate: true` on the node. Fire → emit audit `gate_fired` + follow required next action.

## Gate table

| Gate id | Trigger | User-facing stop language (plain) | Required next action | Audit event |
|---|---|---|---|---|
| `ac.gate.burning_smell` | Burning smell from indoor or outdoor unit | Stop. Burning smell is not a DIY path. | Shut power at disconnect/breaker **if safe**. Call a licensed HVAC pro. If smoke continues or fire risk: evacuate, call emergency services. | `gate_fired:burning_smell` |
| `ac.gate.smoke` | Visible smoke | Stop immediately. | Evacuate if needed. Call emergency services if fire/smoke persists. Do not keep running equipment. | `gate_fired:smoke` |
| `ac.gate.sparking` | Sparks at unit, disconnect, or panel | Stop. Sparking is not DIY. | Kill power **if safe** (dry hands, dry floor, known breaker). Call pro / electrician. | `gate_fired:sparking` |
| `ac.gate.water_near_electrical` | Standing water near indoor unit, furnace, disconnect, or panel | Stop. Water near electrical is hazardous. | Do not touch equipment. Stay clear. Call pro / electrician. If flooding: shut main power only if you can do so from a dry, safe location — otherwise leave and call for help. | `gate_fired:water_near_electrical` |
| `ac.gate.wet_hands_flood` | Wet hands / flooded basement near equipment | Stop. Do not touch switches or metal cabinets. | Get to dry ground. Call for help / pro. | `gate_fired:wet_hands_flood` |
| `ac.gate.ice_keep_running` | Heavy ice on refrigerant lines / outdoor unit **and** user wants to keep running | Stop run-it-anyway. Ice + forced run risks compressor damage and water damage. | Turn system **Off**. Do not chip ice with tools. Schedule thaw + pro diagnosis path. | `gate_fired:ice_keep_running` |
| `ac.gate.cannot_kill_power` | User cannot safely locate/operate disconnect or breaker | Stop any path that needs power-off DIY. | `call_pro` — do not proceed to Advanced/Pro-adjacent checks. | `gate_fired:cannot_kill_power` |
| `ac.gate.aluminum_wiring_uncertain` | Home may have aluminum branch wiring; user unsure | Stop panel-adjacent or receptacle DIY advice. | `call_pro` / licensed electrician. | `gate_fired:aluminum_wiring_uncertain` |
| `ac.gate.gas_smell` | Gas smell (dual-fuel / future furnace path; ask if gas appliances present) | Leave the area. Do not operate switches or phones in the hazard zone if trained guidance says so. | Evacuate. Call gas utility / emergency services from a safe location. HVAC DIY ends. | `gate_fired:gas_smell` |
| `ac.gate.high_voltage_intent` | User intent to work 240V / disconnect internals / panel | Hard stop into Professional-only. | `call_pro` — never DIY. | `gate_fired:high_voltage_intent` |
| `ac.gate.refrigerant_intent` | User intent to add/remove refrigerant or open sealed system | Hard stop. | `call_pro` — EPA-certified tech only. | `gate_fired:refrigerant_intent` |
| `ac.gate.mold_asbestos_suspect` | Visible mold at scale / suspect asbestos materials to disturb | Stop DIY disturbance. | `call_pro` / qualified remediation. | `gate_fired:mold_asbestos_suspect` |

## Ordering

Consent + safety gate cluster runs **before** deep symptom branching on live beta. See tree outline intake.

## Copy rules

- Direct. No humor on hazard gates.
- Never say "probably fine" after a gate trigger.
- Never offer an alternate DIY bypass on the same session path.
