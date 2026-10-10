# ms.head.airflow_result

Tree: `ms.ductless.v1`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Indoor unit airflow — Run it for 15 minutes, then check**

Set the mode you need (Cool or Heat), at least 3°F past the room temperature, fan on High. Run it about 15 minutes.

Then stand in front of the indoor unit and feel the air.

If you see ice or dripping water now, choose that option. Don’t keep it running. That choice asks where the water or melting ice is, starting with electrical safety.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `improved_ok` | Better. Strong air at the right temperature now. | `@ms_airflow_improved_basic` |  |
| `still_weak_air` | The air is still weak | `@ms_weak_air_after_basics` |  |
| `air_ok_not_cooling` | The air is strong, but it isn’t cold, or the room won’t cool | `@ms_no_cool_after_basics` |  |
| `air_ok_not_heating` | The air is strong, but the room isn’t warming | `ms.outdoor.safe_observe` |  |
| `now_ice_or_water` | Now I see ice or dripping water | `ms.head.water_observe` |  |
| `not_sure_result` | I’m not sure | `@ms_airflow_unsure` |  |
| `hazard_now` | New hazard now (burning smell, smoke, sparks, gas smell, or water at electrical parts) | `@ms_hazard_now` | ms_new_hazard |
