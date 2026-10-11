# `ts.power.blank_screen`

**Tree:** `ts.settings.v0`

- Section: Power
- Title: Blank screen: checks from the floor
- DIY tier: basic
- Safety gate: yes
- Caution: Look only at the furnace door and power switch. Don’t remove the door, don’t flip the switch, and don’t touch thermostat wires.

First: any burning smell, smoke, or scorched wires? Choose the last option.

1. If your thermostat takes batteries, put in fresh ones (steps below).
2. Check that the furnace or air-handler door is fully closed. Look only. Some systems shut off when the door isn’t seated.
3. Look at the furnace power switch. It often looks like a light switch on or near the furnace. Just look. If it’s off, don’t switch it on. Choose that option.
4. Notice whether other equipment has power: the furnace or air-handler light, the outdoor unit, or lights on the same part of the house. Just look. Don’t touch anything.
5. Don’t reset breakers in this check. If a breaker for the heating or cooling looks tripped, choose that option.

{step panel: POWER}

| Answer | Next | Gate |
|---|---|---|
| `power_back` The screen is back on | `@ts_power_restored_basic` |  |
| `breaker_looks_tripped` A breaker for the heating or cooling looks tripped | `@ts_power_breaker_pro` |  |
| `furnace_switch_off` The furnace power switch is off | `@ts_power_breaker_pro` |  |
| `other_power_off` Other equipment or lights seem to have no power too | `@ts_power_breaker_pro` |  |
| `still_blank` Still blank after these checks | `@ts_blank_after_basics` |  |
| `power_code_or_restarting` It shows a power or wire code, a low-power warning, or keeps restarting | `@ts_blank_after_basics` |  |
| `told_cwire_or_kit` I was told I need a C wire, a power adapter, or a kit inside the furnace | `@ts_open_cabinet_stop` | ts_open_cabinet |
| `not_sure` I’m not sure | `@ts_settings_unsure` |  |
| `screen_looks_different` My screen looks different | `@ts_screen_different` |  |
| `installer_setting_came_up` A step or screen is asking about installer, equipment, or wiring settings | `@ts_installer_guard` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
