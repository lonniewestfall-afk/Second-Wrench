# Node schema (locked)

Every tree node uses this field set. Do not invent parallel schemas. Extend for Heat Pump / Mini Split / WSHP later; do not fork.

## Required fields

| Field | Type | Rule |
|---|---|---|
| `id` | string | Stable. All AC nodes prefixed `ac.` (e.g. `ac.cool.filter.check`). |
| `prompt` | string | User-facing question or instruction. Plain language. No medical/legal claims. |
| `choices[]` | list | Allowed answers only. Each choice has stable `answer_id` + display text. |
| `next` / `outcome` | map or enum | Maps each choice to either another `node_id` **or** a terminal outcome (see Outcomes). |
| `diy_tier` | enum | `basic` \| `advanced` \| `pro_only` |
| `safety_gate` | bool | If true, failure / affirmative hazard answer must halt (see safety-gates.md). |
| `hazard_exit` | string \| null | Reason code when this node (or a choice) forces an exit ramp. |
| `audit_event` | string | Event name emitted on enter / answer / exit (see audit-trail.md). |
| `notes` | string | Author notes: evidence expected, confidence, beta flags. Not user-facing. |

## Outcomes (terminals only)

Every path must resolve to **exactly one** of:

| Outcome | Meaning |
|---|---|
| `next_step` DIY Basic | Safe next DIY action at Basic tier |
| `next_step` DIY Advanced | Safe next DIY action at Advanced tier (**OFF in live beta**) |
| `call_pro` (reason) | Stop DIY; show ranked reason and call-pro language |
| `emergency_exit` | Hazard halt; evacuate / shut power if safe / call pro or emergency services as gated |
| `insufficient_info` | Cannot conclude safely from answers given |

No other terminal types. No soft "keep going anyway" after hazard.

## Node types (informational labels in notes)

Use in `notes` / outline docs for authoring clarity. Not a separate schema field:

- intake — confirm system / symptom landing
- question — observation question
- test — guided check (power off when required)
- observation — look/listen/feel
- gate — safety gate
- exit — hazard exit ramp
- conclusion — maps to an Outcome above

## Versioning

- Tree version string on every session (e.g. `ac.cool.v0`).
- Node `id` is stable across versions; behavior changes bump tree version.
- Never silently rewire edges without a version bump and audit of affected paths.

## No AI-invented edges

- Edges exist only in authored `next` / `outcome` maps.
- Runtime AI must not add choices, invent next nodes, or invent outcomes.
- If AI explanation is shown, audit `ai_explanation_shown`; explanation must cite the reached node/outcome only.

## ID convention

```
ac.<domain>.<topic>.<step>
```

Examples:

- `ac.cool.intake.system_confirm`
- `ac.cool.filter.check`
- `ac.cool.outdoor.fan_spinning`
- `ac.gate.burning_smell`
- `ac.exit.water_near_electrical`
