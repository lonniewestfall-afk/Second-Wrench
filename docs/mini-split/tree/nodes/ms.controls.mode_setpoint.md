# ms.controls.mode_setpoint

Tree: `ms.ductless.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Remote or app — Check the settings first**

Use the remote, wall control, or app you already use. Don’t open the indoor unit.

1. Mode is Cool (a snowflake on many remotes). If it says Auto, Dry, Fan, or Heat, switch it to Cool for this check.
2. The temperature is set at least 3°F below the room. In Cool, many units won’t start cooling if the setting is at or above room temperature.
3. Fan is Auto or High, not Quiet, Silent, or Night.
4. Timers, Sleep, and app schedules are off for now.
5. If your remote has Follow Me or I Feel, keep the remote in the same room.

After any change, wait 5 to 10 minutes. Many mini-splits run the fan slowly for the first few minutes.

Remote screen blank? You can put in fresh batteries if the battery cover slides off by hand and nothing is cracked or leaking.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `settings_fixed_now_cooling` | I changed a setting, and now it’s cooling | `@ms_settings_fixed_basic` |  |
| `remote_batteries_fixed` | The remote was dead. Fresh batteries fixed it, and now it’s cooling | `@ms_settings_fixed_basic` |  |
| `settings_right_still_problem` | Settings are right, and the problem is still there | `ms.head.filter_path_ok` |  |
| `remote_or_unit_not_responding` | The remote or app won’t change anything, or the indoor unit shows no lights | `@ms_no_response_wave1` |  |
| `not_sure` | I’m not sure | `@ms_controls_unsure` |  |
| `hazard_now` | New hazard now (burning smell, smoke, sparks, gas smell, or water at electrical parts) | `@ms_hazard_now` | ms_new_hazard |
