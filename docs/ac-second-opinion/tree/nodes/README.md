# Wave-1 node specs (APPROVED 2026-09-22)

**Tree:** `ac.cool.v0` (draft)  
**Product:** Second Wrench / AC Second Opinion  
**Scope:** U.S. residential split central AC, cooling-only  
**Advanced DIY:** OFF — never use `next_step` DIY Advanced as a live terminal  
**Brand:** dark walnut / charcoal / restrained scarlet — never green  
**Support (live):** lonnie@secondwrench.co  
**Tagline:** Know what’s wrong. Know what’s safe. Know when to call.

Specs only. No application code. Commander reviews these files without opening the app.

---

## Session entry order (LIVE — wire `next` this way)

| Step | Node id | File |
|---|---|---|
| 1 | `ac.gate.cluster_entry` | [ac.gate.cluster_entry.md](./ac.gate.cluster_entry.md) |
| 2 | `ac.session.consent` | [ac.session.consent.md](./ac.session.consent.md) |
| 3 | `ac.cool.intake.system_confirm` | [ac.cool.intake.system_confirm.md](./ac.cool.intake.system_confirm.md) |
| 4 | `ac.cool.landing.picker` | [ac.cool.landing.picker.md](./ac.cool.landing.picker.md) |

**Note:** Priority-list numbering had consent as approval #1. **Runtime order is safety gate first**, then consent, then system, then landings (verified live beta 2026-09-22).

After the picker, landing-specific nodes below.

---

## All 12 approved node files

| # | id | File | Role |
|---|---|---|---|
| 1 | `ac.session.consent` | [ac.session.consent.md](./ac.session.consent.md) | Quiet-beta consent + 18+ / terms (after safety) |
| 2 | `ac.gate.cluster_entry` | [ac.gate.cluster_entry.md](./ac.gate.cluster_entry.md) | Safety gate cluster — **session entry** |
| 3 | `ac.cool.intake.system_confirm` | [ac.cool.intake.system_confirm.md](./ac.cool.intake.system_confirm.md) | Split central cool-only confirm |
| 4 | `ac.cool.landing.picker` | [ac.cool.landing.picker.md](./ac.cool.landing.picker.md) | Six landings (+ guided-label map in notes) |
| 5 | `ac.cool.tstat.mode_setpoint` | [ac.cool.tstat.mode_setpoint.md](./ac.cool.tstat.mode_setpoint.md) | Cool mode + setpoint |
| 6 | `ac.cool.filter.check` | [ac.cool.filter.check.md](./ac.cool.filter.check.md) | Filter — Basic DIY |
| 7 | `ac.cool.outdoor.fan_spinning` | [ac.cool.outdoor.fan_spinning.md](./ac.cool.outdoor.fan_spinning.md) | Outdoor fan observation |
| 8 | `ac.cool.indoor.ice_lines_coil` | [ac.cool.indoor.ice_lines_coil.md](./ac.cool.indoor.ice_lines_coil.md) | Ice observe + keep-running gate |
| 9 | `ac.gate.water_near_electrical` | [ac.gate.water_near_electrical.md](./ac.gate.water_near_electrical.md) | Water/electrical halt (Water or ice) |
| 10 | `ac.start.outdoor_silent_vs_hum` | [ac.start.outdoor_silent_vs_hum.md](./ac.start.outdoor_silent_vs_hum.md) | Silent vs hum (Will not start / inactive outdoor) |
| 11 | `ac.tstat.blank.batteries` | [ac.tstat.blank.batteries.md](./ac.tstat.blank.batteries.md) | Blank tstat batteries Basic |
| 12 | `ac.cool.conclude.call_pro_capacitor_contactor` | [ac.cool.conclude.call_pro_capacitor_contactor.md](./ac.cool.conclude.call_pro_capacitor_contactor.md) | Suspected cap/contactor → **call_pro only** |

---

## Landing → first Wave-1 node

| Landing (canonical) | First node |
|---|---|
| Not cooling | `ac.cool.tstat.mode_setpoint` → filter → outdoor fan → ice |
| Will not start | `ac.start.outdoor_silent_vs_hum` (hum → conclude cap/contactor) |
| Blank thermostat | `ac.tstat.blank.batteries` |
| Weak airflow | `ac.cool.filter.check` |
| Water or ice | `ac.gate.water_near_electrical` → ice if clear |
| Unusual noise | `call_pro` early (`unusual_noise_early`) |

### Guided picker / extra live labels (not extra Wave-1 ids)

| Live guided wording | Map |
|---|---|
| It runs, but the house is not cooling | Not cooling |
| The AC will not start | Will not start |
| The thermostat display is blank | Blank thermostat |
| Airflow from the vents is weak | Weak airflow |
| The outdoor unit seems inactive | Will not start / `ac.start.outdoor_silent_vs_hum` |
| I only need a service-call note | Out of wave — `insufficient_info` / deferred; not a diagnosis landing |

---

## Locked schema (every file)

`id` · `prompt` · `choices[]` · `next_outcome_map` · `diy_tier` · `safety_gate` · `hazard_exit` · `audit_event` · `notes`

Terminals only: `next_step` DIY Basic · `call_pro` (reason) · `emergency_exit` · `insufficient_info`  
(`next_step` DIY Advanced — **do not use live**; Advanced OFF → use `call_pro`)

---

## Deferred / UNWRITTEN edges (beta-safe terminals used)

Documented in node `notes`. Prefer safe terminals over dangling edges.

| Deferred / UNWRITTEN | Where referenced | Beta-safe stand-in |
|---|---|---|
| `ac.cool.power.breaker_visual` | outdoor silent path | `call_pro` (`outdoor_silent_will_not_start`) |
| `ac.cool.power.disconnect_visual` | outdoor silent path | same |
| `ac.start.breaker_disconnect` | outdoor silent path | same |
| `ac.start.tstat_calls` | Will not start family | not wired; mode check optional via Not cooling |
| `ac.cool.airflow.returns_supplies` | Wave-2+ only | Weak airflow + clean filter → **terminal** `call_pro` (`weak_airflow_after_filter`); Not cooling + clean → outdoor fan |
| `ac.cool.outdoor.debris_clearance` | after fan spinning | continue ice / later call_pro |
| `ac.cool.indoor.thaw_off` | ice path | inlined Basic thaw next_step |
| `ac.gate.ice_keep_running` | ice keep-running | choice on ice node → `emergency_exit` |
| `ac.cool.condensate.*` | water elsewhere | ice node / call_pro |
| `ac.tstat.blank.power_steal_cwire` | blank tstat | `call_pro` |
| `ac.noise.*` | Unusual noise | early `call_pro` |
| Service-call-note-only guided choice | guided picker | `insufficient_info` / deferred product |

Live beta may already show deeper questions (e.g. Not cooling past Q9). Wave-1 does **not** mirror every live Q — only these 12 approved ids.

---

## Locks for Commander

- Hazard: no soft continue after gate fire.  
- Row 12 = `call_pro` for suspected capacitor/contactor — not Advanced DIY.  
- Activity sharing stays disabled.  
- Terms draft beta-2026-09-13 not attorney-approved (consent notes only).  
- Feedback online submit not connected (local save / email draft) — do not treat as safety reporting.

---

## Package status

**READY FOR IMPLEMENTATION SPECS** — 2026-09-22  
Commander review: **PASS** (minor wiring clarifications applied).  
Still **no application code** until SCM / coding path is open.

### Commander locks (post-review)
1. Unusual noise — early `call_pro` in Wave-1; no hum-only soft-route to `outdoor_silent_vs_hum` until Wave-2 clarifying choice.
2. Weak airflow + `filter_clean_ok` → terminal `call_pro` (`weak_airflow_after_filter`); Not cooling chain → `ac.cool.outdoor.fan_spinning` (session `landing` flag).
3. Outdoor silent — beta-safe `call_pro` until Wave-2 breaker/disconnect Basic ids approved.
4. Ice keep-running — choice on `ice_lines_coil` (no new Wave-1 id).
5. Service-call-note — outside diagnosis tree; guided picker may use `insufficient_info` stand-in.
