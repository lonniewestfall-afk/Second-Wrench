# Second Wrench

**AC Second Opinion** is a rules-based guide for U.S. residential split central air conditioners (cooling only).

Tagline: Know what’s wrong. Know what’s safe. Know when to call.

Contact: [lonnie@secondwrench.co](mailto:lonnie@secondwrench.co)

## Netlify

The repository root is the site root. Connect the repo in Netlify and publish `.` with no build step (`netlify.toml` sets `publish = "."`).

Shipped site files: `index.html`, `assets/`, `_redirects`, `_headers`, `404.html`, `robots.txt`, `thanks.html`.

Quiet beta: pages send `noindex` (`robots` meta and `_headers`). Do not remove that for this release.

## Wave-1 and Wave-2

**Implemented** for founder review. Cooling-only tree `ac.cool.v0`. Air-source ducted heat pump tree `hp.air_source.v0` (Wave-1 Basic). Content version `2026-09-24.1`.

Wave-1 is the original 12 nodes. Wave-2 Basic adds seven nodes: breaker-door visual, outdoor-disconnect visual (position only), the silent-path hub, returns and supplies, outdoor debris, the noise hazard screen, and outdoor-hum clarification. The capacitor Advanced chain (eight nodes) is in the tree and runs only when `advancedRepairsEnabled` is true.

Session entry is one Start:

1. `ac.gate.cluster_entry` (safety)
2. `ac.session.consent` (same text; stored agree edge stays on the AC intake; do not fork the consent node)
3. `sw.intake.system_type` — cooling-only AC, heat pump, or not sure
4. Cooling-only AC → `ac.cool.intake.system_confirm` → `ac.cool.landing.picker`. Heat pump → `hp.intake.system_confirm` → `hp.landing.picker`. Not sure → `sw.identify.winter_outdoor`, then Emergency/Aux, then heat source (three questions at most).

A winter outdoor run, Emergency/Aux/EM HT, or a heat-pump label enters the heat-pump tree. Cooling-only from “not sure” requires all three: the outdoor unit stays off in winter, a separate furnace or boiler provides heat, and there is no Emergency or Aux heat. Anything still unclear uses the heat-pump tree. Unsure and heat-pump sessions do not enter the AC capacitor path. Choosing “A heat pump” on the AC intake still enters the heat pump tree.

Driving specs (approved 2026-09-22): [`docs/ac-second-opinion/`](docs/ac-second-opinion/). Product roadmap: [`docs/PRODUCT-ROADMAP.md`](docs/PRODUCT-ROADMAP.md).

The decision tree in `assets/flow.js` owns every conclusion. There is no model call and no free-text diagnosis.

## Locks

- **Advanced DIY is off on this public build.** `advancedRepairsEnabled` stays `false` in `assets/config.js`. Suspected capacitor or contactor paths are call-a-professional only. The gated capacitor steps are in the tree for a private sandbox zip; they do not run while the flag is false.
- Terminals are only DIY Basic `next_step`, DIY Advanced `next_step` when the flag is true, `call_pro` (with a reason), `emergency_exit`, and `insufficient_info`.
- Scope is cooling-only residential split central AC, plus Wave-1 Basic triage for U.S. air-source ducted heat pumps (`hp.air_source.v0`). Mini-splits, water-source/geothermal, and packaged equipment stay out of scope. Heat-pump Advanced electrical stays off: outdoor-not-running ends at `call_pro` `hp_outdoor_not_running_wave1` after the breaker and disconnect visuals. No gauges, refrigerant DIY, or reversing-valve force-outs.
- `formsEnabled` stays `false`. No secrets and no `.env`.
- Brand matches the live beta: dark walnut/charcoal theme, scarlet `#b82030`, white wrench in a scarlet rounded square. Theme color `#17181b`.

## What changed from the previous beta tree

The previous beta kept going through thermostat delay, room-vent checks, a multi-step filter shutdown, and several early exits that were not in the approved nodes. This graph follows the approved specs:

- Unusual noise goes to `ac.noise.hazard_screen`, then `ac.noise.clarify_outdoor_hum`. Only an outdoor hum while Cool is calling and the fan is not spinning continues to `ac.start.outdoor_silent_vs_hum`. Other noise ends at `call_pro` (`unusual_noise_unresolved`). Burning, sparks, smoke, or grinding do not continue into DIY.
- Weak airflow plus a clean filter goes to `ac.cool.airflow.returns_supplies`. If airflow is still weak, that is `call_pro` (`weak_airflow_after_returns_supplies`). Not cooling with a clean filter still goes to the outdoor fan.
- A spinning outdoor fan goes through exterior debris clearance, then the ice check.
- A silent outdoor unit goes to `ac.start.breaker_disconnect`, then the breaker-door visual, then the disconnect visual. The disconnect step never tells the user to operate the lever. When those visuals are exhausted, the result is `call_pro`. There is no capacitor path from that hub.
- With `advancedRepairsEnabled` false, a hum with the fan not spinning still ends at `call_pro` (`suspected_capacitor_contactor_advanced_off`). With the flag true, that screen can enter `ac.adv.cap.prereq_gate_cluster` and the rest of the capacitor chain.
- “Keep running anyway” stays a choice on the ice node and is an `emergency_exit`.
- A service-call note is the result-page note, not a diagnosis landing.
