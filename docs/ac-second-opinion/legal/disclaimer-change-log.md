# Disclaimer / Terms change log

**DRAFT FOR COUNSEL — NOT ATTORNEY-APPROVED.** Not legal advice. Not final law. For Leon Bass review only.

Living tracker. Update whenever Commander or Tree Lead ships a safety-sensitive wave.  
**Public Advanced enablement is blocked** until Terms supplement + Leon path is clear and Commander flips the flag.

| ID | Date | Product change | Disclaimer / Terms impact | Blocks public enable? | Status |
|----|------|----------------|---------------------------|----------------------|--------|
| D-001 | 2026-09-23 | Wave-1 live quiet beta (`contentVersion 2026-09-23.1`); Basic DIY + Call-pro / emergency exits; `advancedRepairsEnabled` FALSE | Live Terms `beta-2026-09-13` cover Basic informational DIY only; no Advanced electrical repair procedures; clickwrap unchecked consent in open page | N/A (Advanced already off) | **Live** — Terms not attorney-reviewed (`termsAndPrivacyReviewed: false`) |
| D-002 | 2026-09-23 | Capacitor **Advanced DIY** full gated **specs** in tree package (`ac.adv.cap.*`); public flag remains FALSE; private Netlify sandbox may enable after Commander safety pass | Need Terms/clickwrap **supplement**: lockout, residual charge, never live work, no screwdriver short, covers before restore, Call-pro exits, flag-gated enablement, assumption of risk, not a diagnosis, 18+, manufacturer priority | **YES** — do not set `advancedRepairsEnabled` true on **public** beta until attorney/Terms OK + Commander flip | **DRAFT ready** — see `terms-advanced-diy-supplement-DRAFT.md` + `leon-brief-advanced-diy-2026-09-23.md` |
| D-003 | 2026-09-23 | Wave-2 Basic nodes (power visuals / deeper Basic) — EOM floor with Advanced built but flag off | Review result copy for new Basic steps; usually covered by existing DIY risk language unless new hazards (panel-adjacent, wet electrical) appear | Only if a Wave-2 node softens a hard gate or adds Advanced-adjacent work | **Watch** — update when Wave-2 ships to public |
| D-004 | 2026-09-23 | Heat pump Wave-1 Basic public (`hp.air_source.v0`, content `2026-09-23.3`). Same consent text. HP Advanced electrical remains OFF (`call_pro` only). Mini-split / WSHP still later. | Existing beta terms still cover Basic informational DIY and professional stops. No new electrical procedure. Scope page now names air-source ducted heat pumps and the exclusions (capacitor, contactor, gauges, refrigerant, reversing-valve force-out). | No for this Basic wave. Advanced electrical on HP stays blocked with the public flag. | **Live Basic** — Terms still not attorney-reviewed |
| D-004b | 2026-09-24 | Unified Start (`contentVersion 2026-09-24.1`). One home Start. System type is asked after the same gate and consent. Not sure uses up to three identify questions; unclear answers use the heat-pump tree. No new DIY steps. `advancedRepairsEnabled` stays false. | Same consent body and beta terms. No new electrical procedure. | No. Advanced stays off. Unsure and heat-pump sessions do not enter the AC capacitor path. | **Live Basic** — Terms still not attorney-reviewed |
| D-005 | TBD | Affiliates / compensated referrals / kits | Disclosures + commercial Terms; Leon Phase 2 | Yes | **Deferred** (Leon closer-to-launch) |
| D-006 | TBD | Full launch Terms rewrite (limitation of liability, indemnity, venue, arbitration, server-side consent) | Replaces/extends `beta-2026-09-13` | Yes for commercial launch | **Deferred** per Leon 5 PM guidance — drafts welcome when Donnie wants them |

## Enablement gate (Advanced)

```
Public advancedRepairsEnabled = true
  ONLY IF:
    [ ] Commander safety pass on capacitor Advanced specs
    [ ] Terms Advanced DIY supplement reviewed path with Leon (or Donnie explicitly records accept-risk deferral — do not invent this)
    [ ] termsVersion bumped; clickwrap re-prompt for Advanced path (or full re-accept)
    [ ] Commander explicit product flip
```

Private sandbox testing with flag on does **not** authorize public ON.

## How to add a row

1. One line: what product changed.  
2. What users will newly be told or newly risk.  
3. Whether public enable must wait.  
4. Link draft file.  
5. Ping Commander if status = blocks public enable.
