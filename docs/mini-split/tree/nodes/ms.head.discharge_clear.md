# ms.head.discharge_clear

Tree: `ms.ductless.v0`. DIY tier: `basic`. Safety gate: `false`.

## Prompt

**Indoor unit airflow — Is anything blocking the air?**

Look from the floor. Don’t climb.

1. Curtains, furniture, shelves, or tall plants shouldn’t sit in front of the indoor unit or right under it. Nothing should hang on it or sit on top.
2. The louver (the flap where the air comes out) should be open. If it’s closed or pointing straight up, use the swing or air-direction button on the remote. Don’t move it by hand.

Move anything that’s in the way.

## Choices

| answer_id | label | next | gate |
|---|---|---|---|
| `blocker_moved` | Something was in the way, and I moved it | `ms.head.airflow_result` |  |
| `louver_opened_with_remote` | The louver was closed or stuck in one spot. The remote fixed it | `ms.head.airflow_result` |  |
| `nothing_blocking` | Nothing was blocking it | `ms.head.airflow_result` |  |
| `louver_stuck_wont_move` | The louver won’t move with the remote | `@ms_louver_stuck` |  |
| `hazard_now` | New hazard now (burning smell, smoke, sparks, gas smell, or water at electrical parts) | `@ms_hazard_now` | ms_new_hazard |
