# ms.head.filter_path_ok

Tree: `ms.ductless.v0`. DIY tier: `basic`. Safety gate: `true`.

## Prompt

**Indoor unit filters — Can you reach the filters safely?**

Most mini-splits have washable filters behind the front cover of the indoor unit. Clean them only if all four of these are true:

1. Your owner’s manual shows the filter steps without tools.
2. The front cover lifts by hand. Nothing needs to be pried, unscrewed, or forced.
3. You can reach it standing on the floor. If you’d need a ladder, chair, or step stool, stop here.
4. The manual says to turn the unit off with the remote first. If it says to switch off power at a breaker or switch, stop here. This check doesn’t guide that step.

Turning the unit off with the remote stops it running. It doesn’t cut the power. That’s why you’ll touch only the filters.

Caution: No ladders, chairs, or step stools. No tools. Touch only the filters.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `filter_ok_tool_free_floor` | Yes to all four | `ms.head.filter_clean` |  |
| `filter_cleaned_recently` | I cleaned the filters in the last two weeks | `ms.head.discharge_clear` |  |
| `filter_needs_ladder` | It’s mounted high. I’d need a ladder, chair, or step stool | `@ms_filter_inaccessible` |  |
| `filter_needs_tools_or_force` | The cover needs tools, feels stuck, or the clips might break | `@ms_filter_inaccessible` |  |
| `manual_says_cut_power` | My manual says to switch off power at a breaker or switch first | `@ms_filter_inaccessible` |  |
| `no_manual_not_sure` | I don’t have the manual, or I’m not sure | `@ms_filter_path_unconfirmed` |  |
| `hazard_now` | New hazard now (burning smell, smoke, sparks, gas smell, or water at electrical parts) | `@ms_hazard_now` | ms_new_hazard |
