# `ts.model.nest`

**Tree:** `ts.settings.v0`

- Section: Your thermostat
- Title: Which model is it?
- DIY tier: basic
- Safety gate: no

Pick the model if you know it. The name is often on the box, the receipt, or in the maker’s app. If you’re not sure, choose I’m not sure. Menus differ between models, so we won’t guess.

| Answer | Next | Gate |
|---|---|---|
| `nest_lt4` Nest Learning Thermostat (4th gen) | `ts.landing.picker` |  |
| `nest_nt` Nest Thermostat (2020) | `ts.landing.picker` |  |
| `nest_lt3` Nest Learning Thermostat, 3rd gen or older | `ts.landing.picker` |  |
| `nest_e` Nest Thermostat E | `ts.landing.picker` |  |
| `not_sure` I’m not sure | `@ts_model_unconfirmed` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
