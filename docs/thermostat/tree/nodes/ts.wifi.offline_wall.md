# ts.wifi.offline_wall

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Settings — The app is offline. Does the wall screen still work?**

Wi-Fi can drop while the thermostat still runs the heating and cooling. This check does not walk a Wi-Fi setup, a router reset, or an account recovery.

If the wall screen still sets Heat or Cool, you can keep using it and check the manual later for the app.

[Model step panel. Filled at display time from the brand group in `state.tsModel`. Stored edges stay plain strings.]

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `wall_still_controls` | The wall screen still sets Heat or Cool | `@ts_wifi_offline_wall_ok` |  |
| `wall_blank_too` | The wall screen is blank too | `ts.blank.screen` |  |
| `app_asks_reconfigure` | The app wants me to set up equipment or wires to reconnect | `ts.settings.installer_stop` |  |
| `not_sure` | I’m not sure the wall screen is in control | `@ts_not_sure` |  |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
