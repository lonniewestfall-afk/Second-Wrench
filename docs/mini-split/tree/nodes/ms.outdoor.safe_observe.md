# ms.outdoor.safe_observe

Tree: `ms.ductless.v1`. DIY tier: `basic`. Safety gate: `true`.

## Prompt

**Outdoor unit — What is the outdoor unit doing?**

Look from a window, or from dry, cleared ground. Don’t climb onto the unit, a roof, or a snowbank. Don’t reach into the grille.

Water, melt, or ice on or near the power box, cord, or outlet is a look-only stop. It does not tell anyone to shut off power.

A quiet outdoor unit while an indoor unit is calling goes straight to call-a-pro. There is no breaker or disconnect step.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `water_near_outdoor_electrical` | Water, melt, or ice is on or near the power box, cord, or outlet | `@ms_outdoor_water_electrical` | water_near_electrical |
| `outdoor_running_still_problem` | The outdoor unit is running, and the room still isn’t comfortable | `@ms_outdoor_running_call_pro` |  |
| `outdoor_quiet_while_calling` | The indoor unit is calling, and the outdoor unit is quiet | `@ms_outdoor_not_running_wave1` |  |
| `outdoor_thick_ice_heating` | The outdoor unit is thick with ice while heating | `@ms_outdoor_freeze_heat_wave1` |  |
| `ice_want_keep_running` | There’s ice, but I want to keep it running | `@ms_ice_heat_keep_running` | ice_keep_running |
| `outdoor_ice_cooling` | I see ice while it’s set to Cool | `ms.ice.stop_observe` |  |
| `steam_or_smoke_unsure` | I’m not sure the cloud is steam, or it smells like burning | `@ms_hazard_now` | ms_new_hazard |
| `cannot_observe_safely` | I can’t see it safely from here | `@ms_outdoor_unsure` |  |
| `hazard_now` | New hazard now | `@ms_hazard_now` | ms_new_hazard |
