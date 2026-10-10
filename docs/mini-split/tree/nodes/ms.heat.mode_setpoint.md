# ms.heat.mode_setpoint

Tree: `ms.ductless.v1`. DIY tier: `basic`. Safety gate: `true`.

## Prompt

**Heat — Set Heat and give it time to warm up**

Use the remote, wall control, or app you already use. Don’t open the indoor unit.

If someone is at risk from the cold and there is no safe heat, that choice comes first. Then Heat mode, a setting at least 3°F above the room, a normal fan, and timers and Sleep off. Wait about 10 to 15 minutes. In Heat, the indoor fan may stay off at first so it doesn’t blow cold air.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `cold_exposure_risk` | Someone’s at risk from the cold and there’s no safe heat | `@ms_cold_exposure` | cold_exposure_911 |
| `heat_fixed_after_setting` | I changed a setting, and now it’s heating | `@ms_heat_settings_fixed_basic` |  |
| `mode_was_auto` | It was on Auto | `ms.heat.force_heat` |  |
| `heat_settings_right_still_problem` | Settings are right and the problem is still there | `ms.heat.defrost_sanity` |  |
| `no_heat_setting_on_remote` | The remote or app has no Heat setting | `@ms_heat_not_supported` |  |
| `remote_or_unit_not_responding` | The remote or app won’t change anything, or the indoor unit shows no lights | `@ms_no_response_wave1` |  |
| `not_sure` | I’m not sure | `@ms_controls_unsure` |  |
| `hazard_now` | New hazard now | `@ms_hazard_now` | ms_new_hazard |

Notes cite heat-mode remote behavior from owner manuals (fan may wait so it doesn’t blow cold air; heat needs a setting above the room). No shared `hp.` node is reachable from here.
