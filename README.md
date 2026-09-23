# Second Wrench

**AC Second Opinion** is a rules-based guide for U.S. residential split central air conditioners (cooling only).

Tagline: Know what’s wrong. Know what’s safe. Know when to call.

Contact: [lonnie@secondwrench.co](mailto:lonnie@secondwrench.co)

## Netlify

The repository root is the site root. Connect the repo in Netlify and publish `.` with no build step (`netlify.toml` sets `publish = "."`).

Shipped site files: `index.html`, `assets/`, `_redirects`, `_headers`, `404.html`, `robots.txt`, `thanks.html`.

Quiet beta: pages send `noindex` (`robots` meta and `_headers`). Do not remove that for this release.

## Wave-1

**Implemented** for founder review. Tree `ac.cool.v0`. Content version `2026-09-23.1`.

Session entry:

1. `ac.gate.cluster_entry` (safety)
2. `ac.session.consent`
3. `ac.cool.intake.system_confirm`
4. `ac.cool.landing.picker`

Driving specs (approved 2026-09-22): [`docs/ac-second-opinion/`](docs/ac-second-opinion/). Product roadmap: [`docs/PRODUCT-ROADMAP.md`](docs/PRODUCT-ROADMAP.md).

The decision tree in `assets/flow.js` owns every conclusion. There is no model call and no free-text diagnosis.

## Locks

- **Advanced DIY is off.** `advancedRepairsEnabled` stays `false` in `assets/config.js`. Suspected capacitor or contactor paths are call-a-professional only. This build does not ship Advanced DIY repair steps.
- Terminals are only DIY Basic `next_step`, `call_pro` (with a reason), `emergency_exit`, and `insufficient_info`.
- Scope is cooling-only residential split central AC in the United States. Heat pumps, mini-splits, geothermal, and packaged equipment stay out of scope.
- `formsEnabled` stays `false`. No secrets and no `.env`.
- Brand: dark walnut, charcoal, and restrained scarlet. The mark is the existing white “2W” on a scarlet square. Never green.

## What changed from the previous beta tree

The previous beta kept going through thermostat delay, room-vent checks, a multi-step filter shutdown, and several early exits that were not in the approved 12 nodes. Wave-1 replaces that graph with the approved nodes and these locks:

- Unusual noise ends at `call_pro` (`unusual_noise_early`).
- Weak airflow plus a clean filter ends at `call_pro` (`weak_airflow_after_filter`). Not cooling continues to the outdoor fan after a clean filter.
- A silent outdoor unit ends at `call_pro` (`outdoor_silent_will_not_start`). Breaker and disconnect Basic steps are not in this wave.
- “Keep running anyway” stays a choice on the ice node and is an `emergency_exit`.
- A service-call note is the result-page note, not a diagnosis landing.
