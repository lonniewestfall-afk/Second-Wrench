# `ts.settings.em_aux_heat`

**Tree:** `ts.settings.v0`

- Section: Thermostat settings
- Title: Check emergency and backup heat
- DIY tier: basic
- Safety gate: no

Emergency heat runs only the backup heat, and it costs more to run. It stays on until someone switches it off.

1. Switch the mode from emergency heat back to Heat.
2. Avoid big jumps in the temperature setting. They can bring on the backup heat.

{step panel: EHEAT}

| Answer | Next | Gate |
|---|---|---|
| `eheat_off_fixed` It was on emergency heat. It’s back on Heat now | `@ts_eheat_off_basic` |  |
| `aux_runs_in_heat` Backup heat runs a lot even in normal Heat mode | `@ts_aux_persistent` |  |
| `heat_pump_failure` It shows HEAT PUMP FAILURE, or the outdoor unit isn’t running | `@ts_aux_persistent` |  |
| `cold_air_after_install` It blows cold in Heat, and it started right after a new thermostat was put in | `@ts_heat_cool_reversed` |  |
| `not_sure` I’m not sure | `@ts_settings_unsure` |  |
| `screen_looks_different` My screen looks different | `@ts_screen_different` |  |
| `installer_setting_came_up` A step or screen is asking about installer, equipment, or wiring settings | `@ts_installer_guard` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
