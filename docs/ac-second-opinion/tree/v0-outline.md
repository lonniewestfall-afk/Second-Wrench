# Tree v0 outline — cooling-first + live-beta landings

**Status:** DRAFT outline + Wave-1 deep-write DONE 2026-09-22 (`tree/nodes/`). Commander reviews node specs next.  
**Tree version target:** `ac.cool.v0`  
**Scope:** U.S. residential split central AC, cooling-only. Heat pump primary deferred to Heat Pump Lead.  
**Disclaimer:** Not medical or legal advice. Not a substitute for a licensed HVAC tech or electrician.

All node ids below are **DRAFT**. Outcomes must map only to: `next_step` DIY Basic | `next_step` DIY Advanced (OFF) | `call_pro` | `emergency_exit` | `insufficient_info`.

---

## A. Session front matter (all landings)

**LIVE session order:** safety gate → consent → system confirm → landing picker (verified 2026-09-22).

1. **Safety gate cluster** — Wave-1 deep-written (`safety_gate: true`)  
   - `ac.gate.cluster_entry`  
   - Gas/CO, smoke/fire/sparks/burn, water/electrical, heat illness, refrigerant alarm, unsure → `emergency_exit` / halt  
   - None of these → consent  
   - Any affirmative → `emergency_exit` or `call_pro` per `conventions/safety-gates.md` — no soft continue

2. **Consent + quiet beta notice** — Wave-1 deep-written  
   - `ac.session.consent`  
   - Terms draft beta-2026-09-13 not attorney-approved; quiet beta.  
   - Outcome paths: accept → system confirm; decline → `insufficient_info` / end session.  
   - Optional activity sharing DISABLED.

3. **System confirmation** — Wave-1 deep-written  
   - `ac.cool.intake.system_confirm`  
   - Confirm: split central (indoor air handler/furnace coil + outdoor condenser), not window/PTAC/portable.  
   - Heat pump as primary heat/cool → hand off / `insufficient_info` + defer to Heat Pump Lead (do not invent HP diagnoses here).  
   - Non-split → `call_pro` or out-of-scope message.

4. **Symptom landing picker** — Wave-1 deep-written  
   - Maps to six live-beta landings below.  
   - Guided picker uses different wording; see `nodes/ac.cool.landing.picker.md` notes.  
   - **Inactive outdoor unit** (guided: “The outdoor unit seems inactive”) → Will not start / `ac.start.outdoor_silent_vs_hum` family — **no 13th Wave-1 id**.  
   - Guided “I only need a service-call note” → out of wave / `insufficient_info` or deferred — not a diagnosis landing.

---

## B. Cooling trunk — "AC not cooling / not freezing enough"

Root: `ac.cool.trunk.not_cooling` — DRAFT

### B1. Power / thermostat basics — DRAFT

| Node id (DRAFT) | Purpose | diy_tier |
|---|---|---|
| `ac.cool.power.breaker_visual` | Breaker not tripped (visual / door only) | basic |
| `ac.cool.power.disconnect_visual` | Outdoor disconnect present / not obviously off | basic |
| `ac.cool.tstat.mode_setpoint` | Cool mode, setpoint below room temp | basic |
| `ac.cool.tstat.blank` | Cross-link Blank thermostat landing | basic → or call_pro |

Fail power basics with unsafe access → gate / `call_pro`.

### B2. Airflow — DRAFT

| Node id (DRAFT) | Purpose | diy_tier |
|---|---|---|
| `ac.cool.filter.check` | Dirty/clogged filter | basic |
| `ac.cool.airflow.returns_supplies` | Blocked returns / closed supplies | basic |
| `ac.cool.airflow.weak` | Cross-link Weak airflow landing | basic |

Dirty filter → `next_step` DIY Basic (replace filter, retest cool). Persistent → continue trunk.

### B3. Outdoor unit — DRAFT

| Node id (DRAFT) | Purpose | diy_tier |
|---|---|---|
| `ac.cool.outdoor.debris_clearance` | Debris / clearance | basic |
| `ac.cool.outdoor.fan_spinning` | Condenser fan spinning (safe distance) | basic |
| `ac.cool.outdoor.ice` | Ice on outdoor unit / lines | basic observe → often call_pro |
| `ac.cool.outdoor.not_running` | Unit silent / won't start → Will not start landing | — |

Fan not spinning + compressor-area hum with gates clear → **not** Advanced in live beta → `call_pro` (contactor/capacitor likely; Advanced off).

### B4. Indoor coil freeze path — DRAFT

| Node id (DRAFT) | Purpose | diy_tier |
|---|---|---|
| `ac.cool.indoor.ice_lines_coil` | Ice on lines / suspect frozen coil | basic observe |
| `ac.cool.indoor.thaw_off` | System Off to thaw; no chipping ice | basic |
| `ac.gate.ice_keep_running` | User insists on keep-running | safety_gate → emergency_exit / call_pro |

After thaw + filter/airflow fixed, still no cool → `call_pro` (metering device / refrigerant / airflow deeper — pro_only).

### B5. Condensate — DRAFT

| Node id (DRAFT) | Purpose | diy_tier |
|---|---|---|
| `ac.cool.condensate.overflow_switch` | Float switch tripped / pan full | basic if accessible |
| `ac.cool.condensate.water_leak` | Cross-link Water or ice landing | — |

Water near electrical → gate, not DIY clear.

### B6. Early Professional-only branches — DRAFT

From trunk, short-circuit to `call_pro` (reason) when evidence points to:

- Refrigerant leak / undercharge symptoms after Basic airflow cleared  
- Compressor not pumping (pro diagnosis)  
- Contactor/capacitor suspected while Advanced OFF  
- Energized diagnostics required  
- Sealed-system or 240V work  

`diy_tier: pro_only`. Never soften.

---

## C. Six live-beta landings (parallel trunks)

Each landing: consent/gates if not already done → landing-specific DRAFT nodes → shared conclusions where possible.

### C1. Not cooling

→ Cooling trunk (Section B).

### C2. Will not start — DRAFT (+ Wave-1 silent/hum written)

- Also absorbs **inactive outdoor unit** home/guided labels → same family; no separate priority id.  
- `ac.start.tstat_calls` — thermostat calling cool? (deferred)  
- `ac.start.outdoor_silent_vs_hum` — silent vs hum (**Wave-1 written**)  
- `ac.start.breaker_disconnect` — Basic visual power (deferred; silent → call_pro for now)  
- Suspected contactor/capacitor → `ac.cool.conclude.call_pro_capacitor_contactor` / `call_pro` (Advanced off)  
- Burning/sparking → gates  

### C3. Blank thermostat — DRAFT

- `ac.tstat.blank.batteries` — batteries if battery-powered (Basic)  
- `ac.tstat.blank.power_steal_cwire` — common/C-wire / transformer issues → often `call_pro`  
- Do not open furnace control board (pro_only)  

### C4. Weak airflow — DRAFT

- Filter, returns, supplies (Basic)  
- Blower not running → `call_pro` (Advanced/pro)  
- Duct collapse / major imbalance → `call_pro`  

### C5. Water or ice — DRAFT

- Ice path → B4 + ice gate  
- Condensate overflow → B5  
- Water near electrical → `ac.gate.water_near_electrical`  
- Refrigerant ice patterns after Basic clear → `call_pro`  

### C6. Unusual noise — DRAFT

- Screech / metal-on-metal / grinding outdoor → shut off if safe → `call_pro`  
- Rattle debris → Basic exterior clear only  
- Electrical buzzing + heat/smell → gates  
- Never authorize bearing/compressor DIY  

---

## D. Conclusion patterns (all landings)

| Pattern | Outcome |
|---|---|
| Filter / thermostat / clearance fix | `next_step` DIY Basic |
| Capacitor / contactor likely | `call_pro` until Advanced enabled |
| Refrigerant / compressor / panel / 240V | `call_pro` (pro_only reason) |
| Hazard affirmative | `emergency_exit` |
| Ambiguous after Basic | `insufficient_info` or `call_pro` — do not invent |

---

## E. Explicit non-goals for v0

- No heat pump defrost logic  
- No Mini Split / WSHP (extend schema later)  
- No Advanced DIY next_steps while beta Advanced = OFF  
- No AI-authored edges or diagnoses  
