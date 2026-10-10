# ts.gate.safety_stops

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `true`.

## Prompt

**Safety first — Is any of this happening right now?**

Do not approach the thermostat or the equipment to find out. Choose from what you already know.

This thermostat check is free informational guidance. It isn’t a licensed inspection, a diagnosis, or emergency help. It’s operator-authored and has not been attorney-reviewed. It covers U.S. residential low-voltage thermostat settings only. Brand groups in this check are Nest, Honeywell Home smart, ecobee, Honeywell Home non-smart, and Amazon. This version shows text steps and a Check your manual link only. Installer, equipment, and wiring settings always stop. A blank screen is not a reason to reset a breaker. Your manual and a qualified professional take priority.

United States beta. For immediate danger, get to safety and call 911.

Caution: Emergency help never requires accepting terms. After a hazard, this check does not continue.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `hazard_gas_co` | Gas smell or a carbon monoxide alarm | `@gas` | gas_co |
| `hazard_smoke_fire_sparks_burn` | Smoke, fire, sparks, or a burning smell | `@fire` | smoke_fire_sparks_burn |
| `hazard_water_electrical` | Water at the thermostat, its wires, or damaged wiring | `@ts_water_electrical` | water_near_electrical |
| `hazard_heat_illness` | Someone is confused, fainting, or seriously ill in the heat | `@heat` | heat_illness_911 |
| `hazard_cold_exposure` | Someone’s at risk from the cold and there’s no safe heat | `@ts_cold_exposure` | cold_exposure_911 |
| `hazard_unsure` | I am not sure whether there is a hazard | `@uncertain` | unsure_hazard |
| `none_of_these` | None of these | `ts.intake.confirm_low_voltage` |  |
