# `ts.model.honeywell_smart`

**Tree:** `ts.settings.v0`

- Section: Your thermostat
- Title: Which model is it?
- DIY tier: basic
- Safety gate: no

Pick the model if you know it. The name is often on the box, the receipt, or in the maker’s app. If you’re not sure, choose I’m not sure. Menus differ between models, so we won’t guess.

| Answer | Next | Gate |
|---|---|---|
| `hw_t5` T5 or T5+ | `ts.landing.picker` |  |
| `hw_t6` T6 Pro Smart or T6 Pro Wi-Fi | `ts.landing.picker` |  |
| `hw_t9` T9 (RCHT9510WF or RCHT9610WF family) | `ts.landing.picker` |  |
| `hw_smart_other` Another Honeywell Wi-Fi model (T10 Pro, RTH9585WF, X8S, Lyric Round, or other) | `@ts_model_not_in_v0` |  |
| `not_sure` I’m not sure | `@ts_model_unconfirmed` |  |
| `hazard_now` New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts) | `@ts_hazard_now` | ts_new_hazard |
