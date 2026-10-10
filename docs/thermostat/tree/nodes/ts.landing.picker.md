# ts.landing.picker

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**What you noticed — What’s going on with the thermostat?**

Pick the closest match. This check stays on settings you can see. It does not open installer, equipment, or wiring screens.

If a new hazard shows up, choose the last option.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `landing_blank` | The screen is blank or dead | `ts.blank.screen` |  |
| `landing_wont_reach_setpoint` | It won’t heat or cool to the temperature I set | `ts.controls.mode_setpoint` |  |
| `landing_schedule_or_hold` | A schedule or Hold keeps changing the temperature | `ts.controls.schedule_hold` |  |
| `landing_fan` | The fan won’t stop, or it won’t run | `ts.controls.fan` |  |
| `landing_auto_switch` | Heat and cool fight each other, or Auto feels wrong | `ts.controls.auto_deadband` |  |
| `landing_locked` | The screen is locked or it asks for a PIN | `ts.display.lock` |  |
| `landing_app_vs_wall` | The app and the wall thermostat disagree | `ts.app.wall_disagree` |  |
| `landing_aux_or_emergency` | Emergency Heat, Aux, or Em Heat is on | `ts.aux.emergency` |  |
| `landing_installer_or_wiring` | I need installer, equipment, or wiring settings | `ts.settings.installer_stop` |  |
| `landing_reading_wrong` | The temperature on the screen seems wrong | `ts.reading.seems_wrong` |  |
| `landing_wifi_offline` | Wi-Fi or the app is offline, and I still have the wall screen | `ts.wifi.offline_wall` |  |
| `landing_something_else` | Something else | `@ts_complaint_not_in_wave1` |  |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
