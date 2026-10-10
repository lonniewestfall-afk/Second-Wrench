# Low-voltage thermostat settings

Tree version: `ts.settings.v0`. Product key: `ts`. Content version `2026-10-10.3`.

U.S. residential low-voltage wall thermostats only. Brand groups: Nest, Honeywell Home smart, ecobee, Honeywell Home non-smart, and Amazon, plus another low-voltage brand and not sure. Basic settings you can already see on the screen or in the app. Text steps and a Check your manual link.

Advanced stays off. `aiThermostatEnabled` stays false. `mirrorsEnabled` stays false. No model call and no manual-picture panel. `hvacContentReviewed` stays false.

Entry: Start → Something else: mini-split, geothermal, thermostat, other → Thermostat settings → `ts.gate.safety_stops`. The top Start list stays five choices.

A blank screen is not a breaker reset. Breaker involvement ends at `ts_power_breaker_pro`. Other power that’s off ends at `ts_other_power_off`. Installer, equipment, and wiring settings always end at `ts_installer_stop`. After a hazard the session does not continue.

On-page legal lines: [`docs/legal/thermostat/02-on-page-copy.md`](../legal/thermostat/02-on-page-copy.md). Operator-authored. Not attorney-reviewed.

| Node | Title |
|---|---|
| `ts.gate.safety_stops` | Is any of this happening right now? |
| `ts.intake.confirm_low_voltage` | Is this a low-voltage wall thermostat? |
| `ts.brand.group` | Which brand group is it? |
| `ts.landing.picker` | What’s going on with the thermostat? |
| `ts.blank.screen` | What do you already know about power? |
| `ts.blank.batteries` | Replace the batteries the manual shows |
| `ts.controls.mode_setpoint` | Set the mode and the temperature |
| `ts.controls.schedule_hold` | Is a schedule or Hold in the way? |
| `ts.controls.fan` | What is Fan set to? |
| `ts.controls.auto_deadband` | Is Auto switching between heat and cool? |
| `ts.display.lock` | Is the screen locked? |
| `ts.app.wall_disagree` | Which one is actually set? |
| `ts.aux.emergency` | Is Emergency or Aux heat on? |
| `ts.settings.installer_stop` | Installer, equipment, and wiring settings stop here |
| `ts.reading.seems_wrong` | The number on the screen seems off |
| `ts.wifi.offline_wall` | The app is offline. Does the wall screen still work? |

Counts: 16 nodes, 119 options, 33 `ts_` results. Nine settings nodes fill a model step panel from `state.tsModel`. Edges stay plain strings.
