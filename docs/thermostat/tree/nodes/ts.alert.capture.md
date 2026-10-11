# `ts.alert.capture`

**Tree:** `ts.settings.v0`

- Section: Codes and alerts
- Title: Write down the code first
- DIY tier: basic
- Safety gate: yes
- Caution: Don’t clear a code to test it.

Write down the exact code or message and what the system was doing. A photo works too.

A few messages have simple steps here: Wi-Fi, low battery, and the wait delay. Everything else goes to a pro.

{step panel: ALERT}

| Answer | Next | Gate |
|---|---|---|
| `code_wifi` It’s a Wi-Fi or internet message | `ts.settings.wifi` |  |
| `code_battery` It’s a low-battery message | `ts.power.battery` |  |
| `code_wait` It says Wait or Waiting For Equipment, or Cool On or Heat On is flashing | `ts.status.wait_delay` |  |
| `code_water_cooling` A summer code (Nest E3, E4, E73, or E74) or a cooling-failure alert, with water at the indoor unit | `@ts_water_indoor_unit` | ts_water_indoor_unit |
| `code_recorded` Another code or alert, and I wrote it down | `@ts_code_to_pro` |  |
| `cannot_read` I can’t read it or it went away | `@ts_code_to_pro` |  |
| `screen_looks_different` My screen looks different | `@ts_screen_different` |  |
| `installer_setting_came_up` A step or screen is asking about installer, equipment, or wiring settings | `@ts_installer_guard` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
