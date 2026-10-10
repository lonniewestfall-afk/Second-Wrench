# ts.display.lock

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Settings — Is the screen locked?**

Some thermostats lock the screen with a PIN, a passcode, or a child lock. Use a code you already know. Don’t guess through a long list of codes, and don’t open the wall.

An installer lock is a stop.

[Model step panel. Filled at display time from the brand group in `state.tsModel`. Stored edges stay plain strings.]

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `unlocked_with_known_pin` | I unlocked it with a PIN I already knew | `@ts_lock_cleared` |  |
| `no_lock_continue` | It isn’t locked | `@ts_lock_cleared` |  |
| `pin_unknown` | It’s asking for a PIN I don’t know | `@ts_lock_unknown` |  |
| `child_lock_cleared` | A child lock was on. I cleared it the way the manual shows, and the screen works | `@ts_lock_cleared` |  |
| `saw_installer_lock` | It says installer lock or equipment lock | `ts.settings.installer_stop` |  |
| `not_sure` | I’m not sure | `@ts_not_sure` |  |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
