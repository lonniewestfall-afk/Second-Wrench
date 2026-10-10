# ts.controls.schedule_hold

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Settings — Is a schedule or Hold in the way?**

A schedule can move the temperature back after you set it. Hold, Permanent Hold, or a similar word keeps your setting.

Use only the schedule or Hold control you already see. Don’t open installer setup to delete a program.

[Model step panel. Filled at display time from the brand group in `state.tsModel`. Stored edges stay plain strings.]

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `hold_set_problem_gone` | I set Hold, and the temperature stayed where I put it | `@ts_schedule_hold_fixed` |  |
| `schedule_paused_problem_gone` | I paused the schedule, and it’s behaving | `@ts_schedule_hold_fixed` |  |
| `no_schedule_still_wrong` | There’s no schedule or Hold, and it’s still wrong | `ts.controls.fan` |  |
| `schedule_wont_release` | The schedule or Hold won’t let go | `@ts_schedule_still_overrides` |  |
| `saw_installer_menu` | Changing it wants an installer menu | `ts.settings.installer_stop` |  |
| `not_sure_schedule` | I’m not sure whether a schedule is running | `@ts_not_sure` |  |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
