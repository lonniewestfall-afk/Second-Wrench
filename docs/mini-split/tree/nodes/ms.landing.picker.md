# ms.landing.picker

Tree: `ms.ductless.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**What you noticed — What’s going on with the mini-split?**

Pick the closest match. Answer only what you know.

If anything new comes up, like a burning smell, smoke, sparks, or water reaching an outlet or cord, choose the last option.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `landing_no_cool` | Not cooling, or not cooling enough | `ms.controls.mode_setpoint` |  |
| `landing_weak_airflow` | Weak air from the indoor unit | `ms.controls.mode_setpoint` |  |
| `landing_water_at_head` | Water dripping from or under the indoor unit | `ms.head.water_observe` |  |
| `landing_error_code` | A code or blinking lights on the indoor unit, remote, or app | `ms.error.capture` |  |
| `landing_ice_seen` | Ice or frost on the indoor unit or its pipes | `ms.ice.stop_observe` |  |
| `landing_something_else` | Something else (heating, noise, a musty smell, or the outdoor unit) | `@ms_landing_not_in_pr1` |  |
| `hazard_now` | New hazard now (burning smell, smoke, sparks, gas smell, or water at electrical parts) | `@ms_hazard_now` | ms_new_hazard |
