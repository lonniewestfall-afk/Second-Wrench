# ac.adv.cap.identify_label

## id
`ac.adv.cap.identify_label`

## prompt
**Stage 4 — Identify run/dual capacitor by label**

Power must still be verified dead.

**Do not touch capacitor terminals or leads until the discharge stage is complete.** Looking at or photographing the label from a distance with power Off is OK. Terminal / lead contact waits until after `ac.adv.cap.discharge`.

Identify the outdoor **run / dual-run capacitor** by its **label** only:

- Read µF (capacitance) values and VAC rating from the label **without touching terminals or leads**.
- Note terminal markings (commonly **C / HERM / FAN** or manufacturer equivalents) from the label / printing — do not probe terminals.
- Photograph or write down the label for matching replacement **if** your privacy settings allow — audit stores “label_recorded,” not raw photo bytes unless product privacy explicitly allows.

**Exact type unknown / unreadable label → stop → call_pro.**  
**Never guess µF.** “Any capacitor will do” is forbidden.

If this is not a standard dual-run / matching replacement candidate you can identify from the label → call_pro.

If you **already touched** capacitor terminals or leads before completing discharge → **stop** → call_pro / treat as uncertain discharge. Do not continue this path.

If power uncertainty returns → back to lockout / call_pro. Do not continue.

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `label_readable_recorded` | Label readable from a distance; µF / VAC / terminals recorded — no terminal contact | Continue to discharge. |
| `label_unreadable_unknown` | Label unreadable or µF unknown | Stop — no guessing. |
| `not_a_standard_dual_run` | Not a standard dual-run / cannot match type | Call_pro. |
| `already_touched_terminals` | I already touched terminals or leads before discharge | Stop — treat as uncertain discharge. |
| `want_call_pro` | Call a professional instead | Always allowed. |
| `power_uncertainty_again` | No longer sure power is dead | Back to lockout / call_pro. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `label_readable_recorded` | **next** `ac.adv.cap.discharge` |
| `label_unreadable_unknown` | **terminal** `call_pro` (reason: `capacitor_label_unknown`) |
| `not_a_standard_dual_run` | **terminal** `call_pro` (reason: `capacitor_label_unknown` / type mismatch) |
| `already_touched_terminals` | **terminal** `call_pro` (reason: `capacitor_discharge_unsure` / premature_terminal_contact) — do not continue Advanced |
| `want_call_pro` | **terminal** `call_pro` (reason: `user_elected_call_pro_advanced_abort`) |
| `power_uncertainty_again` | **next** `ac.adv.cap.lockout_verify` or **terminal** `call_pro` (`gate_fired:cannot_kill_power`) — prefer call_pro if user cannot re-verify |

## diy_tier
`advanced`

## safety_gate
`false` if still verified dead and no terminal contact; power uncertainty or premature touch → call_pro

## hazard_exit
`null` unless power uncertainty escalates to cannot-kill / wet

## audit_event
`node_entered:ac.adv.cap.identify_label` · on pass: `capacitor_label_recorded` · on premature touch: `conclusion_reached:call_pro` (`premature_terminal_contact`) · `answer_selected:<id>` · `diy_tier_shown:advanced`

## notes
- **LOCKED (Commander second pass 2026-09-23):** Do not touch terminals/leads until discharge complete. Distance look/photo OK with power Off.
- Premature terminal contact → stop → call_pro / uncertain discharge.
- Single dual-run / matching replacement only after label read with power verified dead.
- Node type: observation / Stage 4.
