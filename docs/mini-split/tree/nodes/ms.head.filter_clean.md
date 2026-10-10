# ms.head.filter_clean

Tree: `ms.ductless.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Indoor unit filters — Clean the filters the way your manual shows**

1. Turn the unit Off with the remote. Wait until the fan stops and the louver closes.
2. Lift the front cover by hand, the way the manual shows.
3. Slide the filters out. If the manual says a part shouldn’t get wet, keep it dry.
4. Vacuum the dust off, or rinse with lukewarm water, never hotter than 104°F (40°C). Use mild soap only if the manual allows it. Don’t wring them.
5. Let washed filters dry fully in the shade.
6. Slide them back in and close the cover until it’s fully shut.

Remote Off doesn’t cut the power. Touch only the filters and the cover. Don’t reach past them, and don’t spray anything on the parts inside.

Run it only with the filters in place.

Caution: Remote Off doesn’t cut the power. Touch only the filters and the cover.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `cleaned_were_dirty` | Done. The filters were dusty or dirty | `ms.head.discharge_clear` |  |
| `cleaned_looked_clean` | Done. They looked mostly clean | `ms.head.discharge_clear` |  |
| `filters_washed_still_drying` | I washed them, and they’re still drying | `@ms_filter_drying_basic` |  |
| `filter_torn_or_missing` | A filter is torn, damaged, or missing | `@ms_filter_replace_basic` |  |
| `cover_or_filter_wont_go_back` | The cover or a filter won’t go back the way it came out | `@ms_filter_inaccessible` |  |
| `saw_mold_or_slime` | I see heavy mold, black buildup, or slime inside | `@ms_head_cleaning_pro` |  |
| `saw_ice_behind_filter` | I see ice or frost behind the filters | `ms.ice.stop_observe` |  |
| `hazard_now` | New hazard now (burning smell, smoke, sparks, gas smell, or water at electrical parts) | `@ms_hazard_now` | ms_new_hazard |
