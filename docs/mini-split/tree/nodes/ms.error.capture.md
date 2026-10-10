# ms.error.capture

Tree: `ms.ductless.v0`. DIY tier: `basic`. Safety gate: `true`.

## Prompt

**Error code — Write down the code**

Codes help a pro. They aren’t a repair guide. Look from the floor at the indoor unit display, the remote, or the app.

1. Write down the exact letters and numbers, or take a photo. If it’s blinking lights, count the blinks and note which light.
2. Note what the unit was doing and when it started.
3. Don’t keep turning it off and on to clear the code. Don’t open the unit to look for it.

Some newer units show a code for a refrigerant leak. If the screen, app, or manual says that, choose the first option.

Caution: Codes are for a pro to read. No resets, covers, or meters.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `code_refrigerant_leak_alert` | The screen, app, or manual says it’s a refrigerant leak | `@leak` | refrigerant_alarm_or_release |
| `code_recorded` | I wrote down or photographed the code | `@ms_error_code_wave1` |  |
| `lights_blinking_pattern` | It’s blinking lights, and I noted the pattern | `@ms_error_code_wave1` |  |
| `code_cleared_after_restart` | The code went away after the unit restarted | `@ms_error_code_wave1` |  |
| `cannot_read_from_floor` | I can’t read it from the floor | `@ms_error_code_wave1` |  |
| `hazard_now` | New hazard now (burning smell, smoke, sparks, gas smell, or water at electrical parts) | `@ms_hazard_now` | ms_new_hazard |
