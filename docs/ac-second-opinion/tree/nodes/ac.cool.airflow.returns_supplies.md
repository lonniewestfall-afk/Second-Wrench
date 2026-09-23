# ac.cool.airflow.returns_supplies

## id
`ac.cool.airflow.returns_supplies`

## prompt
**Returns and supplies — furniture, rugs, closed vents only**

Filter already looks clean (or was just replaced). Check simple airflow blockers indoors:

**Returns (intake):**

- Is a return grille blocked by furniture, boxes, curtains, or a thick rug edge?
- Move furniture so the grille can breathe. Do not remove fixed drywall returns.

**Supplies (registers):**

- Are supply registers closed, covered by rugs, or blocked by furniture?
- Open closed vents that should be open for the rooms you want cooled.

**Do not:**

- Cut or modify ducts
- Remove registers into a duct chase beyond a normal lift-off grille you already know
- Access the blower cabinet
- Seal ducts with DIY mastic as a diagnosis step from this guide

If airflow is still weak after clearing furniture/rugs/closed vents → call a licensed HVAC pro. Do not invent duct sealing DIY.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `blocked_cleared_airflow_improved` | Blocked return/supply cleared; airflow improved | Basic DIY success path. |
| `blocked_cleared_still_weak` | Cleared blockers; airflow still weak | Call-pro — no duct DIY. |
| `no_blockers_found_still_weak` | No furniture/rug/vent blockers; still weak | Call-pro. |
| `cannot_check_safely` | I cannot check returns/supplies safely | Do not force access. |
| `want_duct_work` | I want to cut ducts / open chase / blower access | Rejected — call_pro. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `blocked_cleared_airflow_improved` | **terminal** `next_step` DIY Basic — Keep returns/supplies clear; leave system on Cool and retest comfort after 15–30 minutes. If weak airflow returns → `call_pro`. |
| `blocked_cleared_still_weak` | **terminal** `call_pro` (reason: `weak_airflow_after_returns_supplies`) |
| `no_blockers_found_still_weak` | **terminal** `call_pro` (reason: `weak_airflow_after_returns_supplies`) |
| `cannot_check_safely` | **terminal** `call_pro` (reason: `airflow_check_inaccessible`) or `insufficient_info` if product prefers softer stop with no prior cool evidence |
| `want_duct_work` | **terminal** `call_pro` (reason: `duct_work_rejected_not_basic`) — never soft continue into duct DIY |

## diy_tier
`basic`

## safety_gate
`false` (furniture/vent observation); duct-chase / blower intent → call_pro hard

## hazard_exit
`null`

## audit_event
`node_entered:ac.cool.airflow.returns_supplies` · `answer_selected:<id>` · on improve: `conclusion_reached:next_step_basic` · `diy_tier_shown:basic` · on still weak: `conclusion_reached:call_pro` (`weak_airflow_after_returns_supplies`)

## notes
- Wired from `ac.cool.filter.check` when `filter_clean_ok` + session `landing=weak_airflow` (replaces Wave-1 short-circuit `weak_airflow_after_filter`).
- `landing=not_cooling` + clean filter still goes to outdoor fan — this node is Weak airflow primary; optional reuse later if product sets a flag.
- After this node still weak → `call_pro` only — no Advanced.
- Node type: observation / Basic DIY.
- Brand: scarlet wrench + dark charcoal/grey/walnut — never green.
