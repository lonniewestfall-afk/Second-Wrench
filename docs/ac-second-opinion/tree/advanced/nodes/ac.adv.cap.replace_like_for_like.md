# ac.adv.cap.replace_like_for_like

## id
`ac.adv.cap.replace_like_for_like`

## prompt
**Stage 6 — Replace like-for-like (capacitor only)**

Power remains verified dead; capacitor discharged per prior stage. Replace **only** the run/dual capacitor **like-for-like**:

- µF within OEM / label tolerance (use the values you recorded from the label — do not guess)
- Equal or **greater** VAC rating
- Correct terminal markings (**C / HERM / FAN** or exact manufacturer equivalents) — photograph/notes before disconnecting leads if needed
- Secure mounting equivalent to original; leads on correct terminals only

**Forbidden:**

- “Any capacitor will do”
- Forcing a µF / VAC / terminal mismatch
- **Contactor** inspection or replacement on this path (not included — stays separate / call_pro)
- Energizing to “test fit”

Mismatch or wrong terminals / uncertain → **call_pro — do not proceed.**

Support: lonnie@secondwrench.co

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `replacement_matched_installed` | Matched µF / VAC / terminals; installed like-for-like | Continue reassemble / test. |
| `uf_or_vac_mismatch` | µF or VAC mismatch | Do not proceed. |
| `wrong_terminals_uncertain` | Wrong terminals or uncertain lead placement | Do not proceed. |
| `want_replace_contactor_too` | I also want to replace the contactor | Not on this path. |
| `abort_call_pro` | Abort — call a professional | Always allowed. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `replacement_matched_installed` | **next** `ac.adv.cap.reassemble_restore_test` |
| `uf_or_vac_mismatch` | **terminal** `call_pro` (reason: `capacitor_mismatch_do_not_proceed`) |
| `wrong_terminals_uncertain` | **terminal** `call_pro` (reason: `capacitor_mismatch_do_not_proceed`) — **do not proceed** |
| `want_replace_contactor_too` | **terminal** `call_pro` (reason: `contactor_not_in_advanced_cap_path`) — contactor NOT in path |
| `abort_call_pro` | **terminal** `call_pro` (reason: `user_elected_call_pro_advanced_abort`) |

## diy_tier
`advanced`

## safety_gate
`true` on wrong terminals / forced mismatch / contactor intent

## hazard_exit
`null` for mismatch (call_pro hard stop) — if spark/burn appears leave power Off → emergency_exit / call_pro

## audit_event
`node_entered:ac.adv.cap.replace_like_for_like` · `answer_selected:<id>` · on mismatch: `gate_fired:capacitor_mismatch_do_not_proceed` · `diy_tier_shown:advanced`

## notes
- Contactor **NOT** in this Advanced path.
- “Any capacitor will do” is forbidden.
- Node type: procedure / Stage 6.
