# ts.controls.mode_setpoint

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Settings — Set the mode and the temperature**

Look at the thermostat you already use. Don’t open a setup menu.

1. Set Heat if you need heat, or Cool if you need cooling. Leave Auto for now.
2. Set the temperature a few degrees past the room, so the system should be calling.
3. Wait a few minutes. A heat pump can take longer to start.

If the screen offers installer, equipment, or wiring, stop.

[Model step panel. Filled at display time from the brand group in `state.tsModel`. Stored edges stay plain strings.]

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `set_heat_or_cool_fixed` | I set Heat or Cool, and the room is responding | `@ts_mode_setpoint_fixed` |  |
| `was_off_now_calling` | It was Off. I set Heat or Cool, and it started | `@ts_mode_setpoint_fixed` |  |
| `settings_already_right` | Heat or Cool is set, the temperature should be calling, and nothing’s changed | `ts.controls.schedule_hold` |  |
| `could_not_change_mode` | I can’t change the mode or the temperature | `@ts_could_not_change` |  |
| `screen_locked` | The screen is locked | `ts.display.lock` |  |
| `saw_installer_menu` | The only way forward looks like installer or wiring | `ts.settings.installer_stop` |  |
| `screen_went_blank` | The screen went blank | `ts.blank.screen` |  |
| `not_sure` | I’m not sure | `@ts_not_sure` |  |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
