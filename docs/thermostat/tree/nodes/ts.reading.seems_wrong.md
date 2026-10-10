# ts.reading.seems_wrong

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Settings — The number on the screen seems off**

A degree or two can be the sensor’s location, sun on the wall, or a supply vent blowing on the thermostat. This check does not calibrate the sensor and does not add a temperature offset.

If the number is far from a thermometer you already trust, a pro should look. Don’t open a setup menu to “fix” the reading.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `reading_off_by_a_lot` | It’s off by a lot compared with a thermometer I already have | `@ts_reading_seems_wrong` |  |
| `reading_close_schedule_issue` | It’s close. The problem is really the schedule | `ts.controls.schedule_hold` |  |
| `sensor_remote_disagree` | A room sensor and the thermostat disagree | `@ts_reading_seems_wrong` |  |
| `want_to_calibrate` | I want to calibrate it or enter an offset | `@ts_reading_seems_wrong` |  |
| `saw_installer_offset` | The offset is in an installer menu | `ts.settings.installer_stop` |  |
| `not_sure` | I’m not sure the reading is wrong | `@ts_not_sure` |  |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
