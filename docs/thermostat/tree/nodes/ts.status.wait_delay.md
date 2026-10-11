# `ts.status.wait_delay`

**Tree:** `ts.settings.v0`

- Section: Thermostat settings
- Title: Give it 5 minutes
- DIY tier: basic
- Safety gate: no

Many systems wait about 5 minutes before cooling (or heat-pump heating) starts again. That protects the equipment. Changing the setting during the wait can start it over.

1. Make one change, then don’t touch it for 5 minutes.

{step panel: WAIT}

| Answer | Next | Gate |
|---|---|---|
| `wait_cleared` It started after the wait | `@ts_wait_cleared_basic` |  |
| `wait_persists` It’s still waiting after 5 minutes, or it happens every time | `@ts_wait_persists` |  |
| `not_sure` I’m not sure | `@ts_settings_unsure` |  |
| `screen_looks_different` My screen looks different | `@ts_screen_different` |  |
| `installer_setting_came_up` A step or screen is asking about installer, equipment, or wiring settings | `@ts_installer_guard` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
