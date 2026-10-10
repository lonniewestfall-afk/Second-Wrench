# `ts.gate.safety_stops`

**Tree:** `ts.settings.v0`

- Section: Safety first
- Title: Before we start: is any of this happening now?
- DIY tier: basic
- Safety gate: yes

Answer from what you can see, hear, or smell right now. Don’t take the thermostat off the wall or open any equipment to check.

Thermostat steps come only after this check.

| Answer | Next | Gate |
|---|---|---|
| `co_alarm` A carbon monoxide (CO) alarm is sounding | `@ts_co_gas_now` | ts_co_or_gas |
| `gas_smell` I smell gas (like rotten eggs) or hear hissing | `@ts_co_gas_now` | ts_co_or_gas |
| `burning_or_scorched` Burning or electrical smell, smoke, or scorched or melted wires at the thermostat | `@ts_burning_electrical` | ts_burning_electrical |
| `breaker_keeps_tripping` A breaker for the heating or cooling keeps tripping | `@ts_breaker_retrip` | ts_breaker_retrip |
| `water_indoor_unit` Water pooling at or around the furnace or indoor unit | `@ts_water_indoor_unit` | ts_water_indoor_unit |
| `line_voltage` The thermostat runs baseboard or wall heaters, or is marked 120 V or 240 V | `@ts_line_voltage_stop` | ts_line_voltage |
| `fix_needs_cabinet` Someone told me to open the furnace, air handler, or outdoor unit, or to change thermostat wires | `@ts_open_cabinet_stop` | ts_open_cabinet |
| `ts_none_of_these` None of these | `ts.intake.brand_picker` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
