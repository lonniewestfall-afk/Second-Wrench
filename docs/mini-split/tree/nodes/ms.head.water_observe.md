# ms.head.water_observe

Tree: `ms.ductless.v0`. DIY tier: `basic`. Safety gate: `true`.

## Prompt

**Water — Where is the water or melting ice?**

Answer from where you’re standing. Don’t step into water, touch the unit, or climb up to look. Don’t go into an attic or crawlspace. Ice that is melting counts as water for this question.

First: is any water, or ice that is melting, on or near an outlet, a power cord, a light, a switch, or the unit’s wiring? Or dripping onto anything that plugs in?

Caution: Water and electricity together is a stop, not a cleanup job.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `water_on_electrical` | Yes, water is on or near something electrical | `@ms_water_electrical` | water_near_electrical |
| `water_unsure_electrical` | I can’t tell if it’s near anything electrical | `@ms_unsure_water_electrical` | unsure_water_electrical |
| `water_with_ice` | Nothing electrical, but I also see ice on the unit or its pipes | `ms.ice.stop_observe` |  |
| `water_drip_away_from_electrical` | It’s dripping or pooling under the unit, away from anything electrical | `@ms_condensate_leak_wave1` |  |
| `water_hidden_or_pump` | Water is in the wall or ceiling, or a small pump box is beeping or overflowing | `@ms_condensate_leak_wave1` |  |
| `hazard_now` | New hazard now (burning smell, smoke, sparks, gas smell, or water at electrical parts) | `@ms_hazard_now` | ms_new_hazard |
