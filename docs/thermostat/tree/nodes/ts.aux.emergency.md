# ts.aux.emergency

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Settings — Is Emergency or Aux heat on?**

Emergency Heat, Aux, Em Heat, or Auxiliary is a homeowner mode on many heat-pump thermostats. It is not a repair. If you can turn it off from the mode screen, do that and return to Heat.

Don’t change an O/B setting, a reversing valve, or a wiring terminal to get there.

[Model step panel. Filled at display time from the brand group in `state.tsModel`. Stored edges stay plain strings.]

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `turned_em_aux_off_heat_ok` | I turned Emergency or Aux off, set Heat, and heat is back | `@ts_aux_turned_off` |  |
| `no_em_aux_on_screen` | I don’t see Emergency or Aux on the screen | `ts.controls.mode_setpoint` |  |
| `em_aux_wont_turn_off` | Emergency or Aux won’t turn off | `@ts_aux_stuck` |  |
| `only_em_heat_and_house_cold` | Emergency heat is the only heat, and the house is getting cold | `@ts_aux_stuck` |  |
| `saw_installer_menu` | Turning it off wants an installer menu | `ts.settings.installer_stop` |  |
| `not_sure` | I’m not sure whether Emergency or Aux is on | `@ts_not_sure` |  |
| `cold_person_now` | Someone’s at risk from the cold and there’s no safe heat | `@ts_cold_exposure` | cold_exposure_911 |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
