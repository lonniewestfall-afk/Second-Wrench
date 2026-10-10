# ms.intake.system_confirm

Tree: `ms.ductless.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Your system — Is this a ductless mini-split with one indoor unit?**

Answer from what you already know or the owner’s manual. Don’t remove a cover or climb up to check.

A ductless mini-split has an indoor unit on a wall, floor, or ceiling that blows air straight into the room. There are no vents or ducts. Pipes and a cable run through the wall to a small outdoor unit.

This first mini-split check covers cooling problems on a system with one indoor unit and one outdoor unit.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `ductless_single_zone` | Ductless mini-split, one indoor unit | `ms.landing.picker` |  |
| `ductless_multi_zone` | Ductless, but two or more indoor units share one outdoor unit | `@ms_multi_zone_pr2` |  |
| `ducted_central` | Central AC or a heat pump with vents and ducts | `@ms_use_central_check` |  |
| `window_portable_other` | Window, portable, through-the-wall, or another kind of unit | `@ms_equipment_oos` |  |
| `not_sure` | I’m not sure | `@ms_system_unconfirmed` |  |
| `hazard_now` | New hazard now (burning smell, smoke, sparks, gas smell, or water at electrical parts) | `@ms_hazard_now` | ms_new_hazard |
