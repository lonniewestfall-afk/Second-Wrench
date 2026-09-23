# Gaps vs live beta

**Beta URL:** https://beta-secondwrench.netlify.app/#/  
**UI inventory:** 2026-09-22 evening (computer walkthrough + later guided-picker pass)  
**MVP approved:** 2026-09-22 · **Wave-1 nodes approved:** all 12 · **Deep-write:** DONE in `tree/nodes/` · **Advanced DIY:** OFF

Brand lock: dark walnut / charcoal / restrained scarlet; white wrench in scarlet square — never green. Live brand scarlet/walnut/charcoal OK; no green observed.

## Verified operable (live)

- Hash-routed SPA; dark charcoal UI; red wrench mark; “AC SECOND OPINION”; beta banner
- **Safety gate FIRST**, then consent, then system, then landings (wire specs this order)
- Safety gate choices: gas/CO, smoke/fire/sparks/burning, water/electrical, heat illness, refrigerant alarm, unsure → exits; “None of these” → consent
- Consent: 18+ / beta-terms required; optional activity-sharing checkbox **disabled** (“Activity collection is off in this copy”)
- Supported equipment: conventional cooling-only residential split AC; heat pump / mini-split-window-portable / geo-packaged → out of scope
- **Home / symptom cards (exact six):** Not cooling, Will not start, Blank thermostat, Weak airflow, Water or ice, Unusual noise
- **Later guided picker (different labels — map only, no 13th Wave-1 id):**
  - “It runs, but the house is not cooling” → Not cooling
  - “The AC will not start” → Will not start
  - “The thermostat display is blank” → Blank thermostat
  - “Airflow from the vents is weak” → Weak airflow
  - “The outdoor unit seems inactive” → Will not start / `ac.start.outdoor_silent_vs_hum` family
  - “I only need a service-call note” → out of wave / notes only (`insufficient_info` or deferred; not a diagnosis landing)
- Deep path exists (Not cooling reached Q9+ with real copy). Wave-1 specs cover the 12 approved ids only — do not mirror every live Q in this batch
- Result example (not cooling path): “Air is moving, but cooling is not established” → HVAC service + service-call note Copy/Save
- About: fixed decision rules (not AI); Basic on; Advanced DIY disabled / not exposed; Professional-only boundaries named
- Footer pages: Safety, Terms, Privacy, Disclosures, Sources, Feedback
- Emergency result can show “Call 911 from safety”
- No account required; support email **lonnie@secondwrench.co**; feedback not for emergencies
- Feedback form present; **online submit NOT connected** — local save / email draft only

## Gaps / stubs

| Gap | Notes | Spec / product action |
|---|---|---|
| Advanced DIY OFF / not exposed | Capacitor/contactor etc. | Wave-1 conclusion `ac.cool.conclude.call_pro_capacitor_contactor` stays `call_pro` |
| Feedback not connected | Explicit local save / email draft only; nothing sends automatically for online submit | Do not rely on feedback as safety reporting |
| Activity sharing off | Optional checkbox disabled | Leave off until product + privacy ready |
| Netlify badge | Visible third-party overlay | Polish pass — remove |
| Inactive outdoor unit | Guided label / possible home card | Map to Will not start / silent-vs-hum; **no new wave-1 id** |
| Service-call note only | Guided picker choice | Out of wave; not a 7th landing |
| Heat pump / mini-split / geothermal / window / packaged / communicating | Routed out of scope | Correct for beta; Phase 2–4 leads own later |
| Typography glitches on landing | e.g. “mycentral”, “safe.Know.” | Eng polish when SCM/coding path open |
| Console errors | Recurring errors noted in inventory | Engineering follow-up when SCM/coding path open |
| Audit trail wiring | Spec requires events; verify session events actually recorded | Tree Lead + eng when implementing |
| Brand polish | Confirm no green drift on rebuild | Match official logo — live OK so far |
| Live Q depth > Wave-1 | Not cooling deep path beyond 12 ids | Later waves; keep Wave-1 as approved set |

## Screenshots

`/workspace/screenshots/beta-home.png`, `beta-safety-gate.png`, `beta-consent.png`, `beta-terms-gate.png`, `beta-system.png`, `beta-result-not-cooling.png`

## Competitor note

Patched = cost/guide AI, not an AC rules tree. Own the gap: symptom → test → ranked cause → hard DIY gates.

## Schema reuse

HP / Mini Split / WSHP **extend** conventions (`hp.` / `ms.` / `wshp.`), do not fork.
