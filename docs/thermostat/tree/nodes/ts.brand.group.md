# ts.brand.group

Tree: `ts.settings.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Your thermostat — Which brand group is it?**

Pick the closest match from the name on the thermostat or in its app. If you don’t know, say so. Don’t open the wall to read a model sticker.

The steps stay the same. The next screen names the buttons for the group you pick, and the result links to that maker’s manual.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `brand_nest` | Nest | `ts.landing.picker` |  |
| `brand_honeywell_smart` | Honeywell Home, with an app (T9, T10, or similar) | `ts.landing.picker` |  |
| `brand_ecobee` | ecobee | `ts.landing.picker` |  |
| `brand_honeywell_nonsmart` | Honeywell Home, no app (a switch or buttons on the face) | `ts.landing.picker` |  |
| `brand_amazon` | Amazon smart thermostat | `ts.landing.picker` |  |
| `brand_other_low_voltage` | Another low-voltage brand | `ts.landing.picker` |  |
| `brand_not_sure` | I’m not sure of the brand | `ts.landing.picker` |  |
| `hazard_now` | New hazard now (gas smell, smoke, sparks, burning smell, or water at the thermostat) | `@ts_hazard_now` | ts_new_hazard |
