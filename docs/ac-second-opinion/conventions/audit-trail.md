# Session audit trail

**Product requirement now.** Legal Terms later (draft beta-2026-09-13 not attorney-approved). Counsel direction: keep building hazard exits + audit trail even before full Terms.

## Events to record

| Event | When |
|---|---|
| `session_started` | Consent / start |
| `node_entered` | Every node visit |
| `answer_selected` | User picks a choice |
| `gate_fired` | Safety gate triggers |
| `exit_ramp` | Hazard mid-tree exit |
| `conclusion_reached` | Terminal outcome set |
| `diy_tier_shown` | UI displays a DIY tier label / next step |
| `ai_explanation_shown` | AI text shown for a tree conclusion |
| `session_closed` | Normal end, hazard close, or abandon |

## Required fields (every event)

| Field | Rule |
|---|---|
| `timestamp` | ISO-8601; store UTC, display user-local |
| `session_id` | Stable per run |
| `node_id` | `ac.*` id when applicable |
| `answer_id` | When event is answer-related |
| `tree_version` | e.g. `ac.cool.v0` |
| `event` | Name from table above |
| `outcome` | When concluding: `next_step_basic` \| `next_step_advanced` \| `call_pro` \| `emergency_exit` \| `insufficient_info` |
| `diy_tier` | When relevant |
| `hazard_exit` | Reason code when applicable |
| `notes` | Optional machine notes (not user PII dump) |

## Rules

- Immutable append-only log for the session.
- AI explanations logged separately from tree decisions so review can see what the model said vs what the tree decided.
- Partial paths on hazard exit are retained (see hazard-exit-ramps.md).
- Do not claim audit log equals legal compliance; it is a product safety/accountability control pending Terms.
