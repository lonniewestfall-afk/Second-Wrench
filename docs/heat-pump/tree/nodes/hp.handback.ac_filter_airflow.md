# hp.handback.ac_filter_airflow

## id
`hp.handback.ac_filter_airflow`

## prompt
**Hand back to shared AC basics — filter and airflow**

Mode, Emergency/Aux, ambient, and defrost sanity are clear enough that the next highest-yield **Basic** checks are the same ones used on cooling-only systems:

- Air filter dirty / missing / inaccessible
- Returns and supplies blocked (furniture, rugs, closed registers) — on the AC tree after filter when weak airflow

We will send you into the existing AC node **`ac.cool.filter.check`**. That node is authored for AC Second Opinion; use it as shared Basic DIY. It is **not** permission to do capacitor, contactor, refrigerant, or panel work.

If your heat-pump complaint was mode-asymmetric (one mode wrong while outdoor runs), you should **not** be here — that path belongs on the reversing-valve / control conclude.

After filter / airflow, follow the **HP product stamp** below — do **not** inherit cool-only outdoor fan / debris / ice chains.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `proceed_ac_filter` | Continue to air filter check | Shared Basic — `ac.cool.filter.check`. |
| `filter_already_done_this_session` | I already checked/replaced the filter this session | Skip duplicate — call_pro. |
| `decline_handback` | Skip — I want a pro without filter check | Allowed stop → call_pro. |
| `hazard_now` | New hazard now (burning / smoke / sparks / water at electrical / gas) | Stop — never soft continue. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `proceed_ac_filter` | **next** `ac.cool.filter.check` — set handback flag `hp_handback=filter_airflow`. **HP product stamp (LOCKED decision #2 / supplemental E):** under `hp_handback=filter_airflow`, AC `filter_clean_ok` must **not** auto-route to `ac.cool.outdoor.fan_spinning` / debris / ice. Instead: **if weak airflow flagged** → **next** `ac.cool.airflow.returns_supplies`; after returns/supplies (still weak / done / no blockers) → **terminal** `call_pro` reason **`hp_basics_clear_after_filter`**. **Else** (clean filter, not a weak-airflow complaint) → **terminal** `call_pro` reason **`hp_basics_clear_after_filter`**. Dirty/missing filter follow AC Basic replace next_step, then retest / same stamp if discomfort remains. |
| `filter_already_done_this_session` | **terminal** `call_pro` (reason: `hp_basics_clear_after_filter`) — mode/defrost clear + filter already done; sealed-system / electrical / control deeper work is pro |
| `decline_handback` | **terminal** `call_pro` (reason: `user_requests_pro_after_mode_clear`) — **not** `insufficient_info` |
| `hazard_now` | **terminal** `emergency_exit` — Stop / get help; shut power only if safe; same discipline as `ac.gate.cluster_entry` / water-near-electrical / burning-smell gates |

## diy_tier
`basic`

## safety_gate
`false` (hazard_now choice forces exit)

## hazard_exit
`null` normally · on `hazard_now`: reuse AC gate reason codes (`burning_smell` \| `smoke` \| `sparking` \| `water_near_electrical` \| `gas_co`)

## audit_event
`node_entered:hp.handback.ac_filter_airflow` · `answer_selected:<id>` · on proceed: handoff audit `handback:ac.cool.filter.check` + flag `hp_handback=filter_airflow` · on decline/done: `conclusion_reached:call_pro` · on hazard: `gate_fired` + `exit_ramp`

## notes
- Node type: handback / bridge.
- Tree version: **`hp.air_source.v0`**.
- **Explicit edge:** → `ac.cool.filter.check` (AC Wave-1/2 file under `ac-second-opinion/tree/nodes/`).
- Symmetric failure both modes after mode/defrost clears is the main entry; also used when leaving-air matches mode but comfort problem remains.
- Do not duplicate filter prose — keep AC node canonical.
- **LOCKED (Commander decision #2 + supplemental E):** After handback + clean filter → **filter + returns/supplies only**, then **`call_pro` `hp_basics_clear_after_filter`**. **Do not** reuse cool-only outdoor fan / debris / ice chain (defrost stops outdoor fan — wrong HP heat semantics). Product must stamp `hp_handback=filter_airflow` so AC `filter_clean_ok` never inherits `landing=not_cooling` → outdoor fan for HP sessions.
- **Must-fix:** `decline_handback` → `call_pro` `user_requests_pro_after_mode_clear` only (no dual insufficient_info alt).
- Wave-1 paper: deep-write DONE 2026-09-23; Commander must-fix pass 2026-09-23.
