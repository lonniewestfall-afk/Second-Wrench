# `ts.settings.wifi`

**Tree:** `ts.settings.v0`

- Section: Thermostat settings
- Title: Get the thermostat back online
- DIY tier: basic
- Safety gate: no

1. Restart your router and wait until it’s back online.
2. If your thermostat needs a 2.4 GHz network, check that one is on.
3. Restart the thermostat if your model has a restart step below, then reconnect it to Wi-Fi.

{step panel: WIFI}

| Answer | Next | Gate |
|---|---|---|
| `wifi_fixed` It’s back online | `@ts_wifi_fixed_basic` |  |
| `wifi_device_error` It shows W5 or WIFI MODULE ERROR, or still fails after a restart | `@ts_wifi_device_fault` |  |
| `not_sure` I’m not sure | `@ts_settings_unsure` |  |
| `screen_looks_different` My screen looks different | `@ts_screen_different` |  |
| `installer_setting_came_up` A step or screen is asking about installer, equipment, or wiring settings | `@ts_installer_guard` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
