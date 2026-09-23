# DIY tiers

Three tiers. Tree assigns `diy_tier` per node and per conclusion. Live beta: **Advanced is NOT enabled**. Capacitor-first Advanced work stays gated until Commander enables it.

## Basic

Homeowner can do with common sense, no specialized HVAC tools, power off when touching equipment interiors is not required for the check itself (or check is external/visual only).

**Examples (AC):**

- Replace / inspect disposable air filter
- Confirm thermostat mode = Cool, setpoint below room temp, fan Auto/On
- Clear leaves / debris from outdoor unit exterior (power on OK for visual only; shut off if reaching into grille)
- Confirm outdoor unit has clearance (nothing blocking sides/top)
- Check supply registers open; returns not blocked by furniture/rugs
- Listen for outdoor fan spinning (from safe distance)
- Read breaker label / visually confirm breaker not tripped (panel door only — no panel interior work)
- Empty / check accessible condensate drain pan overflow switch if designed for homeowner access

## Advanced (OFF in live beta)

Requires meters, safe lockout, or component-level DIY after power kill. First enabled Advanced path planned: **capacitor** (after hard gates).

**Examples (AC) — when enabled:**

- Contactor inspection / replacement after disconnect kill and verify dead
- Dual/run capacitor discharge + replacement (correct µF, voltage, orientation)
- Condensate drain clearing with wet/dry vac at outdoor cleanout (non-electrical)
- Measuring amp draw only if product later authorizes and gates allow (often stays Pro)

Until Advanced is ON: any Advanced-bound conclusion must resolve to `call_pro` or `insufficient_info`, not DIY Advanced next_step.

## Professional-only (`pro_only`)

Never soften into DIY. Outcome: `call_pro` (reason) or `emergency_exit` if hazard.

**Never DIY list (explicit):**

- Refrigerant reclaim / charge / leak repair / sealed-system work
- Compressor diagnosis or replacement
- Energized electrical diagnostics inside equipment
- Breaker panel interior work, bus bars, aluminum wiring remediation
- Disconnect / whip / high-voltage (e.g. 240V) wiring changes
- Gas furnace / dual-fuel gas path work
- Mold remediation / asbestos disturbance
- Indoor coil chemical clean requiring cabinet teardown where refrigerant lines must be disturbed
- Any work requiring EPA Section 608 certification

## Mapping examples

| Task | Tier |
|---|---|
| Filter change | Basic |
| Thermostat settings | Basic |
| Outdoor clearance / debris (exterior) | Basic |
| Contactor | Advanced (when enabled) else call_pro |
| Capacitor | Advanced (when enabled) else call_pro |
| Refrigerant | Professional-only |
| Compressor | Professional-only |
| Disconnect wiring | Professional-only |
| Breaker panel interior | Professional-only |

## UI rule

When showing a DIY next step, display the tier label. When Advanced is off, do not show Advanced next steps — route to `call_pro` with reason that Advanced path is not enabled / hire pro.
