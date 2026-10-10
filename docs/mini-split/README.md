# Ductless mini-split, cooling, one indoor unit

Tree version: `ms.ductless.v0`. Product key: `ms`. Content version `2026-10-10.1`.

Basic look-only checks. No ladder, breaker, disconnect, refrigerant, capacitor, or panel-removal steps. Advanced stays off.

Entry: Start → Something else: mini-split, geothermal, other → Ductless mini-split. Also from the cooling-system question, and from the water-source equipment question.

| Node | Title |
|---|---|
| `ms.intake.system_confirm` | Is this a ductless mini-split with one indoor unit? |
| `ms.landing.picker` | What’s going on with the mini-split? |
| `ms.controls.mode_setpoint` | Check the settings first |
| `ms.head.filter_path_ok` | Can you reach the filters safely? |
| `ms.head.filter_clean` | Clean the filters the way your manual shows |
| `ms.head.discharge_clear` | Is anything blocking the air? |
| `ms.head.airflow_result` | Run it for 15 minutes, then check |
| `ms.head.water_observe` | Where is the water? |
| `ms.error.capture` | Write down the code |
| `ms.ice.stop_observe` | Ice on the mini-split: stop and thaw |

Water on or near electrical parts ends at `ms_water_electrical` (`emergency_exit`). That result does not say to shut off main power.
