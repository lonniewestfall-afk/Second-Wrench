# `ts.settings.mode_setpoint`

**Tree:** `ts.settings.v0`

- Section: Thermostat settings
- Title: Check the mode and temperature
- DIY tier: basic
- Safety gate: no

1. Set the mode to Heat for heat, or Cool for cooling. In Off, nothing runs.
2. Set the temperature at least 3°F above the room for Heat, or at least 3°F below the room for Cool.
3. Wait 5 minutes. Many systems wait a few minutes to protect the equipment, and changing the setting again starts that wait over.

{step panel: MODE}

| Answer | Next | Gate |
|---|---|---|
| `mode_fixed` I changed the mode or temperature, and now it’s working | `@ts_mode_fixed_basic` |  |
| `calling_nothing_runs` The screen says it’s heating or cooling, but nothing runs after 5 minutes | `@ts_calling_no_run` |  |
| `mode_missing` The mode I need (like Auto or emergency heat) isn’t offered | `@ts_installer_guard` |  |
| `heat_cool_reversed` It heats in Cool, or cools in Heat | `@ts_heat_cool_reversed` |  |
| `cant_change_locked` It won’t let me change the setting (locked or limited) | `@ts_locked_or_limited` |  |
| `not_sure` I’m not sure | `@ts_settings_unsure` |  |
| `screen_looks_different` My screen looks different | `@ts_screen_different` |  |
| `installer_setting_came_up` A step or screen is asking about installer, equipment, or wiring settings | `@ts_installer_guard` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
