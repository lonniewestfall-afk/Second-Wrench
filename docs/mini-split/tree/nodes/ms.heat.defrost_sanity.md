# ms.heat.defrost_sanity

Tree: `ms.ductless.v1`. DIY tier: `basic`. Safety gate: `true`.

## Prompt

**Heat — Is this a normal defrost, or ice that stays?**

A normal defrost often lasts about 5 to 15 minutes. You may see steam, heating may pause, and you may hear a whoosh. Then heat should return. Leave it in Heat. Don’t switch modes during the pause.

If you aren’t sure a cloud is steam, or it smells like burning, or it comes from the indoor unit, that is a hazard stop.

Ice that keeps building, or a unit coated thickly that doesn’t recover after about an hour, is not a normal defrost. That ends at call-a-pro. Wanting to keep an iced unit running to force heat is a hard stop.

Look from a window or from dry, cleared ground. If the outdoor air is well above freezing and dry, a defrost is unlikely.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `defrost_then_heat_fine` | It paused, then heat came back | `@ms_defrost_normal_basic` |  |
| `defrost_seen_heat_still_weak` | A short pause or some steam, and heat is still weak | `ms.head.filter_path_ok` |  |
| `no_frost_or_mild_weather` | No frost, or it’s mild and dry outside | `ms.head.filter_path_ok` |  |
| `outdoor_iced_solid_no_recover` | Thick ice, and heat doesn’t come back | `@ms_outdoor_freeze_heat_wave1` |  |
| `ice_want_keep_running` | There’s ice, but I want to keep it running to force heat | `@ms_ice_heat_keep_running` | ice_keep_running |
| `steam_or_smoke_unsure` | I’m not sure the cloud is steam, or it smells like burning | `@ms_hazard_now` | ms_new_hazard |
| `not_sure` | I’m not sure what I saw | `@ms_ice_unclear_or_heat` |  |
| `hazard_now` | New hazard now | `@ms_hazard_now` | ms_new_hazard |

Concepts are cited from `hp.defrost.sanity` and `hp.ambient.outdoor_band` by reference only. No `hp.` node is reachable. No defrost button, board, or reversing-valve step.
