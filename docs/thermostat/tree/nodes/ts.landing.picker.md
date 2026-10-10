# `ts.landing.picker`

**Tree:** `ts.settings.v0`

- Section: What you noticed
- Title: What’s going on with the thermostat?
- DIY tier: basic
- Safety gate: no

Pick the closest match. Answer only what you know.

If anything new comes up, like a burning smell, smoke, a CO alarm, or water at electrical parts, choose the last option.

| Answer | Next | Gate |
|---|---|---|
| `landing_no_heat_cool` No heat or no cooling, and the screen looks normal | `ts.settings.mode_setpoint` |  |
| `landing_blank_screen` The screen is blank or keeps restarting | `ts.power.blank_screen` |  |
| `landing_wait_delay` It says Wait, or Cool On or Heat On is flashing, or it’s waiting for equipment | `ts.status.wait_delay` |  |
| `landing_schedule_hold` The temperature changes by itself, or won’t follow the schedule | `ts.settings.hold_schedule` |  |
| `landing_fan` The fan runs all the time, or won’t run | `ts.settings.fan` |  |
| `landing_low_battery` A low-battery warning | `ts.power.battery` |  |
| `landing_wifi` The app can’t reach the thermostat, or Wi-Fi is offline | `ts.settings.wifi` |  |
| `landing_em_aux_heat` Emergency heat or backup heat (Em Heat, Aux) is on or running a lot | `ts.settings.em_aux_heat` |  |
| `landing_code_alert` A code, alert, or status light on the thermostat | `ts.alert.capture` |  |
| `landing_something_else` Something else (Eco or Away, sensors, wrong temperature reading, short cycling, humidity, or app support) | `@ts_landing_not_in_v0` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
