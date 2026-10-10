# ts.intake.confirm_low_voltage

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Your thermostat — Is this a low-voltage wall thermostat?**

Answer from what you already know. Don’t pull the thermostat off the wall.

This check is for a U.S. home thermostat that runs a furnace, central air conditioner, or ducted heat pump. It uses the screen or the thermostat’s app. It is not a line-voltage dial on a baseboard heater, and it is not a mini-split remote.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `low_voltage_wall` | Yes. It’s a low-voltage wall thermostat | `ts.brand.group` |  |
| `line_voltage` | It’s a line-voltage dial or switch on a baseboard or wall heater | `@ts_line_voltage_oos` |  |
| `mini_split_remote` | It’s a mini-split remote or the mini-split’s own app | `@ts_use_mini_split` |  |
| `not_a_thermostat` | It’s something else (a smart speaker, a window unit, or no thermostat) | `@ts_not_this_equipment` |  |
| `not_sure` | I’m not sure | `@ts_system_unconfirmed` |  |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
