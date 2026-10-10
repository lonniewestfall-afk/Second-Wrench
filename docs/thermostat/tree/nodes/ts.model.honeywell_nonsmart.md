# `ts.model.honeywell_nonsmart`

**Tree:** `ts.settings.v0`

- Section: Your thermostat
- Title: Which model is it?
- DIY tier: basic
- Safety gate: no

Pick the model if you know it. The name is often on the box, the receipt, or in the maker’s app. If you’re not sure, choose I’m not sure. Menus differ between models, so we won’t guess.

| Answer | Next | Gate |
|---|---|---|
| `hw_focuspro` FocusPRO TH6110D or TH6220D | `ts.landing.picker` |  |
| `hw_rth7600d` RTH7600D | `ts.landing.picker` |  |
| `hw_th4000` PRO TH4000 series | `ts.landing.picker` |  |
| `hw_x2p` X2P (RTH20B, RTH21B, or RTH22B) | `ts.landing.picker` |  |
| `hw_nonsmart_other` Another Honeywell model (FocusPRO Wi-Fi, VisionPRO, or other) | `@ts_model_not_in_v0` |  |
| `not_sure` I’m not sure | `@ts_model_unconfirmed` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
