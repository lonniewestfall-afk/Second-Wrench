# ts.controls.auto_deadband

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Settings — Is Auto switching between heat and cool?**

Auto can heat, then cool, if the two setpoints are close. For a steady need, Heat or Cool is clearer than Auto.

If you keep Auto, the heat setpoint and the cool setpoint need a gap. Your manual names that gap. Don’t change cycles-per-hour or a differential in a setup menu.

[Model step panel. Filled at display time from the brand group in `state.tsModel`. Stored edges stay plain strings.]

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `left_auto_for_heat_or_cool` | I left Auto and set Heat or Cool, and that fixed it | `@ts_deadband_widened` |  |
| `widened_gap_problem_gone` | I widened the gap between heat and cool, and Auto is fine | `@ts_deadband_widened` |  |
| `already_one_mode_still_wrong` | It’s already on Heat or Cool, and it’s still wrong | `@ts_settings_still_wrong` |  |
| `cannot_leave_auto` | I can’t leave Auto | `@ts_could_not_change` |  |
| `saw_installer_menu` | The gap lives in an installer menu | `ts.settings.installer_stop` |  |
| `not_sure` | I’m not sure | `@ts_not_sure` |  |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
