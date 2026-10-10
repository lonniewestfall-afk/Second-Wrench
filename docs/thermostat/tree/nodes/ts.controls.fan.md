# ts.controls.fan

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Settings — What is Fan set to?**

Fan On runs the fan all the time. Fan Auto runs it only when the system is heating or cooling. Circulating or a percent-of-time setting can feel like the fan won’t stop.

Change only the Fan control on the screen you already use.

[Model step panel. Filled at display time from the brand group in `state.tsModel`. Stored edges stay plain strings.]

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `fan_was_on_set_auto` | Fan was On. I set Auto, and that matches what I want | `@ts_fan_set_auto` |  |
| `fan_was_off_now_runs` | The fan wasn’t running when it should. Auto, with Heat or Cool calling, fixed it | `@ts_fan_set_auto` |  |
| `fan_already_auto_still_wrong` | Fan is already Auto, and the problem remains | `ts.controls.auto_deadband` |  |
| `fan_wont_change` | I can’t change the fan setting | `@ts_fan_still_wrong` |  |
| `saw_installer_menu` | The fan choice is inside an installer menu | `ts.settings.installer_stop` |  |
| `not_sure` | I’m not sure what Fan is set to | `@ts_not_sure` |  |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
