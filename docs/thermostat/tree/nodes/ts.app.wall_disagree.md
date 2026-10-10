# ts.app.wall_disagree

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Settings — Which one is actually set?**

When the app and the wall thermostat disagree, use the wall screen for this check. The app can be holding an old schedule.

Don’t reconfigure wiring from the app. If the app asks for equipment type or a wiring diagram, stop.

[Model step panel. Filled at display time from the brand group in `state.tsModel`. Stored edges stay plain strings.]

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `wall_set_and_matches` | I set the wall screen, and the app now matches | `@ts_wall_controls` |  |
| `app_was_holding_released` | The app had a Hold. I released it, and they agree | `@ts_schedule_hold_fixed` |  |
| `still_disagree` | They still disagree | `@ts_app_wall_disagree` |  |
| `wifi_offline_wall_works` | Wi-Fi is offline, and the wall screen still changes the system | `@ts_wifi_offline_wall_ok` |  |
| `app_asks_wiring` | The app wants equipment type or a wiring diagram | `ts.settings.installer_stop` |  |
| `not_sure` | I’m not sure which one is right | `@ts_not_sure` |  |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
