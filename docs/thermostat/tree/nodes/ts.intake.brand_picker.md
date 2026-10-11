# `ts.intake.brand_picker`

**Tree:** `ts.settings.v0`

- Section: Your thermostat
- Title: Which thermostat do you have?
- DIY tier: basic
- Safety gate: no

Pick the brand on the thermostat or in its app. If you’re not sure, check the box, the receipt, or the app. Don’t take it off the wall to look.

Second Wrench is an independent service. We’re not affiliated with, endorsed by, or sponsored by Google, ecobee, Generac, Resideo, Honeywell, Amazon, Copeland (Sensi), or any other thermostat maker. Brand and model names are trademarks of their owners and are used only to identify which device these steps are for.

| Answer | Next | Gate |
|---|---|---|
| `brand_nest` Google Nest | `ts.model.nest` |  |
| `brand_honeywell_smart` Honeywell Home Wi-Fi touchscreen (T5, T6 Pro, T9) | `ts.model.honeywell_smart` |  |
| `brand_ecobee` ecobee | `ts.model.ecobee` |  |
| `brand_honeywell_buttons` Honeywell with buttons or a slide switch, no Wi-Fi (FocusPRO, RTH7600D, PRO TH4000, X2P) | `ts.model.honeywell_nonsmart` |  |
| `brand_amazon` Amazon Smart Thermostat | `ts.landing.picker` |  |
| `brand_other` Another brand (Sensi, Carrier, Trane, Lennox, White-Rodgers, Braeburn, or other) | `@ts_brand_not_covered` |  |
| `not_sure` I’m not sure | `@ts_model_unconfirmed` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
