# `ts.power.battery`

**Tree:** `ts.settings.v0`

- Section: Power
- Title: Replace the batteries
- DIY tier: basic
- Safety gate: no

Fresh alkaline batteries clear most low-battery warnings. Use the type your manual names. If you’d have to disconnect any wires to reach them, stop.

{step panel: BATT}

| Answer | Next | Gate |
|---|---|---|
| `battery_fixed` New batteries fixed it | `@ts_battery_fixed_basic` |  |
| `still_low_or_blank` Still low, blank, or my model has no batteries to change | `@ts_blank_after_basics` |  |
| `not_sure` I’m not sure | `@ts_settings_unsure` |  |
| `screen_looks_different` My screen looks different | `@ts_screen_different` |  |
| `installer_setting_came_up` A step or screen is asking about installer, equipment, or wiring settings | `@ts_installer_guard` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
