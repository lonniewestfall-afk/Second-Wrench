# ts.blank.batteries

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Blank screen — Replace the batteries the manual shows**

Only if this thermostat has a battery door you already open by hand.

1. Match the battery type printed in the door or in the owner’s manual.
2. Put the face back the way it came off.
3. Don’t pull the thermostat off the wall to chase a wire.

If the manual tells you to use a breaker first, stop. This check does not do that step.

[Model step panel. Filled at display time from the brand group in `state.tsModel`. Stored edges stay plain strings.]

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `fresh_batteries_display_back` | Fresh batteries brought the screen back | `@ts_batteries_display_back` |  |
| `fresh_batteries_still_blank` | Fresh batteries, and the screen is still blank | `@ts_blank_after_batteries` |  |
| `no_battery_door` | There isn’t a battery door after all | `@ts_hardwired_blank` |  |
| `manual_says_breaker` | My manual says to use a breaker first | `@ts_power_breaker_pro` |  |
| `other_power_off` | Some other power is off, and it isn’t the batteries | `@ts_other_power_off` |  |
| `not_sure` | I’m not sure | `@ts_blank_unsure` |  |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
