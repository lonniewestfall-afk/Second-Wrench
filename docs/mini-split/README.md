# Ductless mini-split, cooling and heating, one indoor unit

Tree version: `ms.ductless.v1`. Product key: `ms`. Content version `2026-10-10.2`.

Basic look-only checks. No ladder, breaker, disconnect, refrigerant, capacitor, or panel-removal steps. No defrost buttons. Look at the outdoor unit only from a window or dry ground. Advanced stays off. Multi-zone stays out.

Entry: Start → Something else: mini-split, geothermal, other → Ductless mini-split. Also from the cooling-system question. A ductless answer on the water-source equipment question points back to that Start path.

| Node | Title |
|---|---|
| `ms.intake.system_confirm` | Is this a ductless mini-split with one indoor unit? |
| `ms.landing.picker` | What’s going on with the mini-split? |
| `ms.controls.mode_setpoint` | Check the settings first |
| `ms.heat.mode_setpoint` | Set Heat and give it time to warm up |
| `ms.heat.force_heat` | Set Heat, not Auto, and wait |
| `ms.heat.defrost_sanity` | Is this a normal defrost, or ice that stays? |
| `ms.head.filter_path_ok` | Can you reach the filters safely? |
| `ms.head.filter_clean` | Clean the filters the way your manual shows |
| `ms.head.discharge_clear` | Is anything blocking the air? |
| `ms.head.airflow_result` | Run it for 15 minutes, then check |
| `ms.outdoor.safe_observe` | What is the outdoor unit doing? |
| `ms.head.water_observe` | Where is the water or melting ice? |
| `ms.error.capture` | Write down the code |
| `ms.ice.stop_observe` | Ice on the mini-split: stop and thaw |

Water on or near electrical parts ends at `ms_water_electrical` or, at the outdoor unit, `ms_outdoor_water_electrical` (`emergency_exit`). Not being sure ends at `ms_unsure_water_electrical`. None of those results tells anyone to shut off power or a breaker.

A normal defrost can be steam, a pause, and a whoosh. Ice that keeps building ends at `ms_outdoor_freeze_heat_wave1` (`call_pro`). Running an iced unit to force heat ends at `ms_ice_heat_keep_running` (`emergency_exit`, gate `ice_keep_running`). Someone at risk from the cold with no safe heat ends at `ms_cold_exposure` (`emergency_exit`, gate `cold_exposure_911`). Backup heat is “use safe backup heat per its manufacturer.” Never run a space heater near water or the indoor unit.
