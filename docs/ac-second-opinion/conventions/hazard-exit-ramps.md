# Hazard exit ramps

Pattern used when a path becomes unsafe **mid-tree** (not only at the initial gate cluster).

## Pattern

1. Detect unsafe condition (choice answer or observation that sets `hazard_exit`).
2. Immediately resolve outcome to `emergency_exit` or `call_pro` (reason) — never `next_step` DIY.
3. Log partial path (all nodes entered + answers so far) under current `tree_version`.
4. UI shows stop screen only — **no soft continue**, no "skip and keep diagnosing", no muted "I understand the risk" override for beta.

## Fields on the exiting node / choice

- `hazard_exit`: short reason code (e.g. `water_near_electrical`, `sparking`, `ice_forced_run`)
- `outcome`: `emergency_exit` or `call_pro`
- `audit_event`: `exit_ramp` (plus prior `gate_fired` if a named gate)

## What UI must show

1. Clear stop headline (e.g. "Stop — this is not a DIY step")
2. Plain reason (one or two sentences)
3. Required next action (evacuate / shut power if safe / call pro / call emergency services)
4. Session note: diagnosis incomplete; partial answers saved for audit
5. No button that resumes the same branch past the hazard

## How to log partial path

Emit in order:

- prior `node_entered` / `answer_selected` events (already recorded)
- `gate_fired` if applicable
- `exit_ramp` with `hazard_exit` reason, `node_id`, `tree_version`, timestamp
- session status → `closed_hazard` (product field; see audit-trail.md)

Do not discard the trail because conclusion was not reached.

## Authoring rule

If a mid-tree answer can be unsafe, author an explicit exit edge. Do not rely on AI to "notice" hazard language in free text.
