# hp.intake.system_confirm

## id
`hp.intake.system_confirm`

## prompt
**YOUR SYSTEM — Is this an air-source ducted heat pump?**

Use what you already know or the equipment manual. Do not remove covers, climb on the outdoor unit, or open the air-handler cabinet to identify it.

This Heat Pump path covers **air-source heat pumps** with:

- A separate outdoor unit that can **heat and cool**
- Ducted indoor air moving through a furnace or air handler

It does **not** cover:

- Cooling-only central AC (use AC Second Opinion)
- Ductless mini-splits
- Water-source / geothermal heat pumps
- Packaged rooftop units you cannot confirm as air-source ducted HP

If your home has a heat pump **plus** a gas furnace (dual-fuel), you may still continue here for heat-pump mode checks. Anything involving gas smell, carbon monoxide alarms, or furnace combustion work is **not** DIY — use Stop / get help and the safety gates you already passed.

## choices
| answer_id | label | help / subtext |
|---|---|---|
| `air_source_ducted_hp` | Air-source ducted heat pump | Outdoor unit heats and cools; air moves through ducts. Dual-fuel OK for this confirm only. |
| `cool_only_split_ac` | Cooling-only central AC | Outdoor unit cools only — use AC Second Opinion, not this path. |
| `mini_split_ductless` | Ductless mini-split | Owned by Mini Split Lead — out of this path. |
| `water_source_geo` | Water-source or geothermal | Owned by Water Source Lead — later phase. |
| `packaged_or_other` | Packaged, rooftop, or another system I cannot confirm | Out of scope for this wave. |
| `not_sure` | I am not sure | Do not open covers to find out. |

## next_outcome_map
| answer_id | next / outcome |
|---|---|
| `air_source_ducted_hp` | **next** `hp.landing.picker` — set session equipment flag `hp_equipment=air_source_ducted` |
| `cool_only_split_ac` | **terminal** `insufficient_info` — user-facing: use AC Second Opinion / cool-only tree; do **not** invent AC diagnoses inside `hp.` nodes |
| `mini_split_ductless` | **terminal** `insufficient_info` — mini-split not this lead; later `ms.` phase |
| `water_source_geo` | **terminal** `insufficient_info` — WSHP later phase |
| `packaged_or_other` | **terminal** `insufficient_info` — do not pretend full coverage |
| `not_sure` | **terminal** `insufficient_info` — use the manual or someone familiar with the equipment; return when you can confirm air-source ducted HP; **do not open covers** |

## diy_tier
`basic`

## safety_gate
`false`

## hazard_exit
`null`

## audit_event
`node_entered:hp.intake.system_confirm` · `answer_selected:<id>` · on in-scope: continue · on out-of-scope/not-sure: `conclusion_reached:insufficient_info`

## notes
- Node type: intake.
- Tree version: **`hp.air_source.v0`**.
- **Session spine (LOCKED decision #1 — reuse AC consent; do not duplicate):** `ac.gate.cluster_entry` → `ac.session.consent` → **this node** → `hp.landing.picker`. Product routes HP sessions: consent `agree_18_terms` → `hp.intake.system_confirm` (consent file today still points at AC intake — product/session flag override; do not fork consent).
- **LOCKED decision #6:** Dual-fuel is **later-only** — dual-fuel (HP + gas furnace) still selects `air_source_ducted_hp` here for mode checks; **no** Wave-1 dual-fuel intake flag. Gas / combustion beyond smell/CO gates stays pro_only via reused `ac.gate.*`. No dual-fuel combustion DIY in Wave-1.
- Heat strips / aux presence collected at `hp.heat.capacity_vs_dead`, not at intake.
- Mini-split → `ms.` later; WSHP → `wshp.` later. Schema extends — does not fork.
- OOS / not_sure terminals locked to **`insufficient_info`** only (no dual call_pro alt).
- No capacitor / contactor / panel / refrigerant language here.
- Wave-1 paper: deep-write DONE 2026-09-23 (expanded from stub); Commander must-fix pass 2026-09-23.
