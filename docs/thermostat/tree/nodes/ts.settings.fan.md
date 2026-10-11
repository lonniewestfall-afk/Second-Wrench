# `ts.settings.fan`

**Tree:** `ts.settings.v0`

- Section: Thermostat settings
- Title: Check the fan setting
- DIY tier: basic
- Safety gate: no

Auto runs the fan only while heating or cooling. On runs it all the time. Some thermostats also have Circulate, or a minimum fan time each hour, which runs it between cycles.

1. Set the fan to Auto.
2. Stop any fan timer or fan schedule.
3. If your thermostat has a minimum fan time, turn it down to zero.

{step panel: FAN}

| Answer | Next | Gate |
|---|---|---|
| `fan_fixed` The fan is behaving now | `@ts_fan_fixed_basic` |  |
| `fan_runs_on_auto` The fan keeps running with Fan on Auto and no heating or cooling | `@ts_fan_problem_pro` |  |
| `fan_never_runs` The fan won’t run at all, even set to On | `@ts_fan_problem_pro` |  |
| `not_sure` I’m not sure | `@ts_settings_unsure` |  |
| `screen_looks_different` My screen looks different | `@ts_screen_different` |  |
| `installer_setting_came_up` A step or screen is asking about installer, equipment, or wiring settings | `@ts_installer_guard` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
