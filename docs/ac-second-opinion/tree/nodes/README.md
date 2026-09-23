# Node specs — Wave-1 + Wave-2 Basic

**Tree:** `ac.cool.v0`  
**Product:** Second Wrench / AC Second Opinion  
**Scope:** U.S. residential split central AC, cooling-only  
**Brand:** scarlet wrench + dark charcoal / grey / walnut — **never green**; never invent “2W”  
**Support (live):** lonnie@secondwrench.co  
**Tagline:** Know what’s wrong. Know what’s safe. Know when to call.

Specs only. No application code. No public Advanced flag flip.

---

## Session entry order (LIVE — wire `next` this way)

| Step | Node id | File |
|---|---|---|
| 1 | `ac.gate.cluster_entry` | [ac.gate.cluster_entry.md](./ac.gate.cluster_entry.md) |
| 2 | `ac.session.consent` | [ac.session.consent.md](./ac.session.consent.md) |
| 3 | `ac.cool.intake.system_confirm` | [ac.cool.intake.system_confirm.md](./ac.cool.intake.system_confirm.md) |
| 4 | `ac.cool.landing.picker` | [ac.cool.landing.picker.md](./ac.cool.landing.picker.md) |

After the picker, landing-specific nodes below.

---

## Wave-1 — 12 approved node files

| # | id | File | Role |
|---|---|---|---|
| 1 | `ac.session.consent` | [ac.session.consent.md](./ac.session.consent.md) | Quiet-beta consent + 18+ / terms (after safety) |
| 2 | `ac.gate.cluster_entry` | [ac.gate.cluster_entry.md](./ac.gate.cluster_entry.md) | Safety gate cluster — **session entry** |
| 3 | `ac.cool.intake.system_confirm` | [ac.cool.intake.system_confirm.md](./ac.cool.intake.system_confirm.md) | Split central cool-only confirm |
| 4 | `ac.cool.landing.picker` | [ac.cool.landing.picker.md](./ac.cool.landing.picker.md) | Six landings (+ guided-label map in notes) |
| 5 | `ac.cool.tstat.mode_setpoint` | [ac.cool.tstat.mode_setpoint.md](./ac.cool.tstat.mode_setpoint.md) | Cool mode + setpoint |
| 6 | `ac.cool.filter.check` | [ac.cool.filter.check.md](./ac.cool.filter.check.md) | Filter — Basic DIY |
| 7 | `ac.cool.outdoor.fan_spinning` | [ac.cool.outdoor.fan_spinning.md](./ac.cool.outdoor.fan_spinning.md) | Outdoor fan observation |
| 8 | `ac.cool.indoor.ice_lines_coil` | [ac.cool.indoor.ice_lines_coil.md](./ac.cool.indoor.ice_lines_coil.md) | Ice observe + keep-running gate **inlined** |
| 9 | `ac.gate.water_near_electrical` | [ac.gate.water_near_electrical.md](./ac.gate.water_near_electrical.md) | Water/electrical halt (Water or ice) |
| 10 | `ac.start.outdoor_silent_vs_hum` | [ac.start.outdoor_silent_vs_hum.md](./ac.start.outdoor_silent_vs_hum.md) | Silent vs hum |
| 11 | `ac.tstat.blank.batteries` | [ac.tstat.blank.batteries.md](./ac.tstat.blank.batteries.md) | Blank tstat batteries Basic |
| 12 | `ac.cool.conclude.call_pro_capacitor_contactor` | [ac.cool.conclude.call_pro_capacitor_contactor.md](./ac.cool.conclude.call_pro_capacitor_contactor.md) | Suspected cap/contactor → **call_pro** while flag false |

**Wave-1 status:** READY FOR IMPLEMENTATION SPECS (Commander PASS 2026-09-22) + Wave-2 edge patches 2026-09-23.

---

## Wave-2 Basic — 7 INCLUDE nodes (APPROVED 2026-09-23) — deep-write DONE

| # | id | File | Role |
|---|---|---|---|
| 1 | `ac.cool.power.breaker_visual` | [ac.cool.power.breaker_visual.md](./ac.cool.power.breaker_visual.md) | Panel **door** visual On/Off/trip; optional safe reset |
| 2 | `ac.cool.power.disconnect_visual` | [ac.cool.power.disconnect_visual.md](./ac.cool.power.disconnect_visual.md) | **VISUAL POSITION ONLY** — no operate lever |
| 3 | `ac.start.breaker_disconnect` | [ac.start.breaker_disconnect.md](./ac.start.breaker_disconnect.md) | Silent-path hub: breaker → disconnect |
| 4 | `ac.cool.airflow.returns_supplies` | [ac.cool.airflow.returns_supplies.md](./ac.cool.airflow.returns_supplies.md) | Furniture/rugs/closed vents only |
| 5 | `ac.cool.outdoor.debris_clearance` | [ac.cool.outdoor.debris_clearance.md](./ac.cool.outdoor.debris_clearance.md) | Exterior debris; shut off if reaching into grille |
| 6 | `ac.noise.hazard_screen` | [ac.noise.hazard_screen.md](./ac.noise.hazard_screen.md) | Early-exit burning/sparks/grinding/smoke |
| 7 | `ac.noise.clarify_outdoor_hum` | [ac.noise.clarify_outdoor_hum.md](./ac.noise.clarify_outdoor_hum.md) | Only outdoor hum+Cool+no fan → silent_vs_hum |

**CUT (do not deep-write):** `ac.gate.ice_keep_running` (keep inlined on ice node) · `ac.start.tstat_calls` (REJECT).

Ids source: [`../v0-wave2-node-ids.md`](../v0-wave2-node-ids.md).

---

## Wave-2 edge changes (Wave-1 files updated)

| Edge | Before (Wave-1) | After (Wave-2) |
|---|---|---|
| Weak airflow + `filter_clean_ok` | Terminal `call_pro` (`weak_airflow_after_filter`) | **next** `ac.cool.airflow.returns_supplies`; still weak → `call_pro` (`weak_airflow_after_returns_supplies`) |
| `landing=not_cooling` + clean filter | `ac.cool.outdoor.fan_spinning` | Unchanged → outdoor fan |
| Unusual noise from picker | Immediate `call_pro` (`unusual_noise_early`) | **next** `ac.noise.hazard_screen` → `ac.noise.clarify_outdoor_hum` |
| Outdoor silent | Terminal `call_pro` (`outdoor_silent_will_not_start`) | **next** `ac.start.breaker_disconnect` → breaker_visual → disconnect_visual → call_pro if still silent |
| Fan spinning | Direct to ice | **next** `ac.cool.outdoor.debris_clearance` → ice |
| Hum / cap conclude | call_pro only | call_pro while flag false; when flag true may offer Advanced from conclude |
| Ice keep-running | Inlined on ice node | **Still inlined** — no standalone gate file |

### Silent vs hum wires

```
outdoor_silent
  → ac.start.breaker_disconnect
    → ac.cool.power.breaker_visual
      → ac.cool.power.disconnect_visual
        → call_pro (still silent / visuals exhausted)
        # No Advanced from Basic hub

outdoor_hum_no_fan
  → ac.cool.conclude.call_pro_capacitor_contactor
    → if advancedRepairsEnabled == false: call_pro (suspected_capacitor_contactor_advanced_off)
    → if true: may offer ac.adv.cap.prereq_gate_cluster
```

---

## Landing → first node (updated)

| Landing (canonical) | First node |
|---|---|
| Not cooling | `ac.cool.tstat.mode_setpoint` → filter → outdoor fan → **debris** → ice |
| Will not start | `ac.start.outdoor_silent_vs_hum` (silent → breaker hub; hum → conclude) |
| Blank thermostat | `ac.tstat.blank.batteries` |
| Weak airflow | `ac.cool.filter.check` → **returns_supplies** if clean |
| Water or ice | `ac.gate.water_near_electrical` → ice if clear |
| Unusual noise | `ac.noise.hazard_screen` → `ac.noise.clarify_outdoor_hum` |

---

## Locked schema (every file)

`id` · `prompt` · `choices[]` · `next_outcome_map` · `diy_tier` · `safety_gate` · `hazard_exit` · `audit_event` · `notes`

Terminals only: `next_step` DIY Basic · `next_step` DIY Advanced (runtime: only if `advancedRepairsEnabled`) · `call_pro` (reason) · `emergency_exit` · `insufficient_info`

---

## Advanced DIY (specs under tree/advanced/)

| Doc | Path |
|---|---|
| Outline | [`../advanced/capacitor-gated-outline.md`](../advanced/capacitor-gated-outline.md) |
| 8 deep-written nodes + README | [`../advanced/nodes/`](../advanced/nodes/) |

**public_runtime=flag_off.** Private sandbox may enable only after Commander second safety pass (drag-drop zip; no GitHub→private Netlify wire).

---

## Safety doctrine

- Call-pro / emergency over risky DIY.  
- No soft continue after hazard.  
- Disconnect Wave-2 = visual only.  
- Ice keep-running stays inlined on `ac.cool.indoor.ice_lines_coil`.  
- Activity sharing stays disabled.  
- Feedback online submit not connected — do not treat as safety reporting.

---

## Wave-2 Basic package status

**READY FOR IMPLEMENTATION SPECS** — 2026-09-23 (Commander second safety pass PASS). Public Advanced flag remains FALSE.
