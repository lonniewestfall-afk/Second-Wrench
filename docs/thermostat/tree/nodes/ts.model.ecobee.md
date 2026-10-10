# `ts.model.ecobee`

**Tree:** `ts.settings.v0`

- Section: Your thermostat
- Title: Which model is it?
- DIY tier: basic
- Safety gate: no

Pick the model if you know it. The name is often on the box, the receipt, or in the maker’s app. If you’re not sure, choose I’m not sure. Menus differ between models, so we won’t guess.

| Answer | Next | Gate |
|---|---|---|
| `ecb_premium` ecobee Smart Thermostat Premium or Enhanced | `ts.landing.picker` |  |
| `ecb_essential` ecobee Essential or ecobee3 lite | `ts.landing.picker` |  |
| `ecb_other` Older ecobee (ecobee3, ecobee4, or SmartThermostat with voice control) | `@ts_model_not_in_v0` |  |
| `not_sure` I’m not sure | `@ts_model_unconfirmed` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
