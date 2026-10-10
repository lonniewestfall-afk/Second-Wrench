# ts.settings.installer_stop

Tree: `ts.settings.v0`. DIY tier: `pro_only`. Safety gate: `false`.

## Prompt

**Stop — Installer, equipment, and wiring settings stop here**

This check does not change installer setup, equipment type, terminal labels, cycles per hour, or a temperature offset in a setup menu.

Those choices can make the system run the wrong way. A pro sets them. You can still read your manual’s homeowner pages. Skip the installer, equipment, and wiring pages.

Caution: Installer, equipment, and wiring settings always stop.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `saw_installer_setup` | I see installer setup or a configuration menu | `@ts_installer_stop` |  |
| `saw_wiring_or_terminals` | I see wiring, terminals, or a diagram of wires | `@ts_installer_stop` |  |
| `saw_equipment_type` | I see equipment type, heat pump, or conventional system | `@ts_installer_stop` |  |
| `saw_cycles_or_differential` | I see cycles per hour, differential, or a swing setting | `@ts_installer_stop` |  |
| `want_to_change_anyway` | I want to change one of those anyway | `@ts_installer_stop` |  |
| `not_sure_what_menu` | I’m not sure what menu this is | `@ts_installer_stop` |  |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
