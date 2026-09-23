# ac.cool.filter.check

## id
`ac.cool.filter.check`

## prompt
**Air filter — is it dirty or clogged?**

Find the return grille or filter slot you already know (often at a wall/ceiling return or at the furnace/air-handler filter rack).

- Pull the filter only if it is designed for homeowner swap (slide-out rack / grille).
- Look for heavy dust, debris, or blocked media.
- Do not open sealed cabinets, do not reach into the blower, and do not remove panels held by many screws if you are unsure.

If you cannot safely access the filter without tools or cabinet teardown, choose “I cannot check safely.”

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `filter_dirty_clogged` | Filter looks dirty or clogged | Highest-yield Basic DIY. |
| `filter_clean_ok` | Filter looks clean / recently replaced | Branch on session `landing`: weak_airflow → returns/supplies; not_cooling → outdoor fan. |
| `filter_missing` | No filter installed | Install correct size filter before more DIY. |
| `cannot_check_safely` | I cannot check safely | Do not force access. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `filter_dirty_clogged` | **terminal** `next_step` DIY Basic — Replace with the correct size/type filter; set system to Cool and retest after 15–30 minutes. If weak airflow or no cool persists after a clean/new filter → continue session or call a licensed HVAC pro (do not escalate to Advanced). |
| `filter_clean_ok` | **Depends on entry landing (session flag `landing`):** (A) `landing=weak_airflow` → **next** `ac.cool.airflow.returns_supplies` (**Wave-2 edge** — replaces Wave-1 short-circuit `weak_airflow_after_filter`; after returns_supplies still weak → `call_pro`). (B) `landing=not_cooling` (or reached via Not cooling chain) → **next** `ac.cool.outdoor.fan_spinning`. Do not use ambiguous “eng may” routing. |
| `filter_missing` | **terminal** `next_step` DIY Basic — Install a correctly sized filter; do not run long-term without a filter; retest cool/airflow. |
| `cannot_check_safely` | **terminal** `call_pro` (reason: `filter_inaccessible`) — do not invent panel DIY; `insufficient_info` only if product prefers softer stop |

## diy_tier
`basic`

## safety_gate
`false`

## hazard_exit
`null`

## audit_event
`node_entered:ac.cool.filter.check` · `answer_selected:<id>` · on replace: `conclusion_reached:next_step_basic` · `diy_tier_shown:basic` · on clean+weak_airflow: route to returns_supplies (no immediate `weak_airflow_after_filter` terminal)

## notes
- Highest-yield Basic DIY next_step for beta.
- **Entry context (required):** set session flag `landing` from `ac.cool.landing.picker` (`not_cooling` | `will_not_start` | `blank_thermostat` | `weak_airflow` | `water_or_ice` | `unusual_noise`). `filter_clean_ok` branches on that flag — see next_outcome_map.
- **Wave-2 edge (Commander APPROVED 2026-09-23):** Weak airflow + `filter_clean_ok` → `ac.cool.airflow.returns_supplies` (NOT short-circuit `weak_airflow_after_filter`). After returns/supplies still weak → `call_pro` (`weak_airflow_after_returns_supplies`). Not cooling chain unchanged → outdoor fan.
- Node type: test / observation.
- Wave-1 package: READY; Wave-2 edge patch applied 2026-09-23.
