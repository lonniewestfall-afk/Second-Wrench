# v0 priority nodes — first-node list for Donnie approval

**Rule:** Donnie approves this list before deep writing of full prompts/choices.  
**Live beta:** Advanced DIY OFF. Cooling-only split central, U.S.  

| Status | Detail |
|---|---|
| **APPROVED** | **2026-09-22 by Donnie** — all 12 ids |
| **Advanced DIY** | Remains OFF (row 12 stays `call_pro`, not DIY Advanced) |
| **Deep-write** | **DONE 2026-09-22** — full specs in `tree/nodes/*.md` + `tree/nodes/README.md` |
| **Commander review** | **PASS 2026-09-22** (filter short-circuit patched) |
| **Package** | **READY FOR IMPLEMENTATION SPECS** — no app code until SCM/coding path |

Priority = highest beta value: safety first, then the six landings' entry nodes, then shared Basic checks that unlock ranked `call_pro` reasons.

| # | Node id | Purpose (one line) | Deep-write |
|---|---|---|---|
| 1 | `ac.session.consent` | Quiet-beta consent + Terms draft notice before any diagnosis path | DONE → `nodes/ac.session.consent.md` |
| 2 | `ac.gate.cluster_entry` | Safety gate cluster (burn/smoke/spark/water/gas/kill-power) before branching | DONE → `nodes/ac.gate.cluster_entry.md` (**live entry first**) |
| 3 | `ac.cool.intake.system_confirm` | Confirm split central AC; reject window/PTAC; defer heat pump | DONE → `nodes/ac.cool.intake.system_confirm.md` |
| 4 | `ac.cool.landing.picker` | Route to six live-beta landings | DONE → `nodes/ac.cool.landing.picker.md` |
| 5 | `ac.cool.tstat.mode_setpoint` | Verify Cool mode and setpoint (Not cooling / Will not start shared) | DONE → `nodes/ac.cool.tstat.mode_setpoint.md` |
| 6 | `ac.cool.filter.check` | Filter check — highest-yield Basic DIY next_step | DONE → `nodes/ac.cool.filter.check.md` |
| 7 | `ac.cool.outdoor.fan_spinning` | Outdoor fan observation — splits airflow vs start/electrical failures | DONE → `nodes/ac.cool.outdoor.fan_spinning.md` |
| 8 | `ac.cool.indoor.ice_lines_coil` | Ice observation — forces thaw discipline + ice keep-running gate | DONE → `nodes/ac.cool.indoor.ice_lines_coil.md` |
| 9 | `ac.gate.water_near_electrical` | Dedicated water/electrical halt used by Water or ice landing | DONE → `nodes/ac.gate.water_near_electrical.md` |
| 10 | `ac.start.outdoor_silent_vs_hum` | Will not start split: silent vs hum → call_pro reasons (Advanced off) | DONE → `nodes/ac.start.outdoor_silent_vs_hum.md` |
| 11 | `ac.tstat.blank.batteries` | Blank thermostat Basic path before pro electrical | DONE → `nodes/ac.tstat.blank.batteries.md` |
| 12 | `ac.cool.conclude.call_pro_capacitor_contactor` | Shared conclusion: suspected cap/contactor → call_pro while Advanced OFF | DONE → `nodes/ac.cool.conclude.call_pro_capacitor_contactor.md` |

## Live session order (not approval # order)

`ac.gate.cluster_entry` → `ac.session.consent` → `ac.cool.intake.system_confirm` → `ac.cool.landing.picker` → landing nodes.

## Approval ask (closed)

- ~~Approve or cut rows 1–12.~~ **Approved all 12.**  
- ~~Confirm Advanced remains OFF (row 12 stays `call_pro`, not DIY Advanced).~~ **Confirmed.**  
- ~~Confirm heat pump deferral language on row 3.~~ **Confirmed.**  
- ~~After approval: deep-write prompts, `choices[]`, `next`/`outcome` maps only for approved ids.~~ **Complete 2026-09-22.**

## Not in first wave

- Full condensate chemistry / pump rebuild  
- Amp-draw procedures  
- Any refrigerant procedure  
- Noise vibration FFT-style diagnostics  
- Dual-fuel gas service paths beyond smell gate  
- Guided “I only need a service-call note” as a diagnosis landing  
- Separate id for “inactive outdoor unit” (maps to Will not start / silent-vs-hum)

## Approval status

**APPROVED 2026-09-22 by Donnie.** All 12 ids. Advanced DIY remains OFF.  
**Deep-write status:** complete — see `tree/nodes/README.md`. Awaiting Commander review.
