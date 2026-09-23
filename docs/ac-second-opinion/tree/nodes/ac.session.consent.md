# ac.session.consent

## id
`ac.session.consent`

## prompt
**BEFORE YOU BEGIN — A guide, not an equipment inspection.**

This beta offers limited homeowner checks and a next step based on your answers. It does not confirm a diagnosis or authorize electrical or refrigerant work.

Required: confirm you are 18 or older and agree to the beta terms (DIY risks and limits; manufacturer instructions and professional evaluation take priority).

Optional activity sharing is **disabled** in this beta copy — do not enable.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `agree_18_terms` | Agree and continue | I am 18 or older. I have read and agree to the beta terms, including the DIY risks and limits. I understand that manufacturer instructions and professional evaluation take priority. |
| `decline_terms` | Decline / do not agree | End session. No diagnosis path without required consent. |
| `activity_share_opt_in` | Optional: share answer choices and progress to improve this beta | **DISABLED in live beta.** Includes random session ID, timing, and result — not service note or model numbers. Activity collection is off in this copy. Do not wire as selectable. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `agree_18_terms` | **next** `ac.cool.intake.system_confirm` |
| `decline_terms` | **terminal** `insufficient_info` — session ends; no tree branching; UI may frame as exit / end session |
| `activity_share_opt_in` | **not live** — ignore / hide; must not unlock extra paths or change next |

## diy_tier
`basic`

## safety_gate
`false`

## hazard_exit
`null`

## audit_event
`session_started` · `node_entered:ac.session.consent` · `answer_selected:<agree|decline>` · on decline: `session_closed` (reason: consent_declined)

## notes
- **LIVE ORDER:** Reached only after `ac.gate.cluster_entry` → `none_of_these`. Consent is approval priority #1 but runtime order is safety → consent.
- Terms draft **beta-2026-09-13** is **not attorney-approved** (product accuracy for authors; do not put attorney status in user-facing prompt unless product/legal later requires).
- Quiet beta. Optional activity sharing stays OFF until product + privacy ready (see gaps-vs-live-beta.md).
- UI live label example: “Agree and continue”; required checkbox must be checked before enable.
- Version stamp seen live: `2026-09-13.1 · Scope and safety`.
- Node type: intake.
- **HP Wave-1 product route (2026-09-23):** the stored `agree_18_terms` edge stays `ac.cool.intake.system_confirm`. A heat-pump session (`hp.air_source.v0`) overrides that one edge at runtime to `hp.intake.system_confirm`. Consent text is not forked.
