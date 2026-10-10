# ts.blank.screen

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Blank screen — What do you already know about power?**

A blank screen is not a breaker job in this check. Don’t open the breaker panel, and don’t reset a breaker.

If the face has a battery door you already use, fresh batteries are the only power step here. Anything about a breaker, a furnace switch you don’t already know, or a plug you don’t recognize stops the check.

Caution: No breaker reset. If a breaker is part of the story, the check stops for a pro.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `has_battery_door` | It has a battery door I can open by hand | `ts.blank.batteries` |  |
| `replaced_batteries_still_blank` | I already put in fresh batteries, and it’s still blank | `@ts_blank_after_batteries` |  |
| `hardwired_no_batteries` | There’s no battery door. It looks hardwired | `@ts_hardwired_blank` |  |
| `breaker_involved` | A breaker is involved | `@ts_power_breaker_pro` |  |
| `other_power_off` | Some other power is off, and it isn’t the thermostat batteries | `@ts_other_power_off` |  |
| `not_sure_power` | I’m not sure how it’s powered | `@ts_blank_unsure` |  |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
