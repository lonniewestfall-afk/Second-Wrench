# `ts.settings.hold_schedule`

**Tree:** `ts.settings.v0`

- Section: Thermostat settings
- Title: Check for a hold or a schedule
- DIY tier: basic
- Safety gate: no

A change you make by hand often lasts only until the next scheduled time. Some thermostats can also hold it until you cancel it. If the temperature seems to change by itself, a schedule or a hold is the usual reason.

1. Look for a hold message on the main screen.
2. Cancel the hold to go back to the schedule, or keep it if that’s what you want.
3. If the schedule itself is wrong, fix it on the thermostat or in its app.

{step panel: HOLD}

| Answer | Next | Gate |
|---|---|---|
| `hold_fixed` I cancelled or set the hold, and it’s behaving now | `@ts_hold_fixed_basic` |  |
| `still_changes_on_own` It still changes on its own with no hold showing | `@ts_landing_not_in_v0` |  |
| `not_sure` I’m not sure | `@ts_settings_unsure` |  |
| `screen_looks_different` My screen looks different | `@ts_screen_different` |  |
| `installer_setting_came_up` A step or screen is asking about installer, equipment, or wiring settings | `@ts_installer_guard` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
