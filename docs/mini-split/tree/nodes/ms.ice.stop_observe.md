# ms.ice.stop_observe

Tree: `ms.ductless.v0`. DIY tier: `basic`. Safety gate: `true`.

## Prompt

**Ice — Ice on the mini-split: stop and thaw**

Ice on a mini-split while it’s cooling isn’t normal. A dirty filter can cause it, and so can problems only a pro can check. Running it iced can damage it.

Look only from where you stand. Don’t open the unit, chip the ice, or go outside in unsafe weather to check.

Pick the one that fits best.

Caution: No chipping ice, no covers, and no refrigerant or electrical work.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `ice_dripping_near_electrical` | Melting ice is dripping on or near an outlet, cord, or anything electrical | `@ms_water_electrical` | water_near_electrical |
| `ice_want_keep_running` | There’s ice, but I want to keep it running | `@ms_ice_keep_running` | ice_keep_running |
| `ice_seen_cooling` | There’s ice or frost on the indoor unit, its pipes, or the pipes at the outdoor unit | `@ms_ice_cooling_wave1` |  |
| `ice_outdoor_heating_or_unsure` | It’s frost on the outdoor unit while heating, or I’m not sure it’s ice | `@ms_ice_unclear_or_heat` |  |
| `hazard_now` | New hazard now (burning smell, smoke, sparks, gas smell, or water at electrical parts) | `@ms_hazard_now` | ms_new_hazard |
