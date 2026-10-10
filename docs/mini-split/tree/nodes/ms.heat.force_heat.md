# ms.heat.force_heat

Tree: `ms.ductless.v1`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Heat — Set Heat, not Auto, and wait**

Set Heat on the remote, wall control, or app. Set the temperature at least 3°F above the room. Wait 10 to 15 minutes. The indoor fan may stay off at first so it doesn’t blow cold air. Don’t switch modes while you wait.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `forced_heat_works` | It’s heating after the wait | `@ms_heat_auto_fixed_basic` |  |
| `forced_heat_still_problem` | I waited, and it still isn’t heating | `ms.heat.defrost_sanity` |  |
| `could_not_change_mode` | I can’t change the mode to Heat | `@ms_no_response_wave1` |  |
| `not_sure_waited` | I’m not sure I waited long enough | `@ms_heat_wait_unsure` |  |
| `hazard_now` | New hazard now | `@ms_hazard_now` | ms_new_hazard |
