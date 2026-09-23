/* Deterministic decision engine. No model calls and no free-text diagnosis routing.
 * Browser or Node. Every action comes from the current node's choices.
 *
 * Tree ac.cool.v0 — node keys ARE the approved spec ids.
 * Session entry: ac.gate.cluster_entry → ac.session.consent →
 *   ac.cool.intake.system_confirm → ac.cool.landing.picker.
 * Terminals (only): next_step (DIY Basic, or DIY Advanced only when
 *   SW_CONFIG.advancedRepairsEnabled === true) | call_pro (reason) |
 *   emergency_exit | insufficient_info.
 *
 * Wave-2 Basic (2026-09-23), public:
 * - filter_clean_ok + landing weak_airflow → ac.cool.airflow.returns_supplies.
 *   Not cooling + clean filter → ac.cool.outdoor.fan_spinning.
 * - fan_spinning → ac.cool.outdoor.debris_clearance → ice.
 * - landing_unusual_noise → ac.noise.hazard_screen → ac.noise.clarify_outdoor_hum.
 *   Only outdoor hum while Cool is calling and the fan is not spinning →
 *   ac.start.outdoor_silent_vs_hum. Other noise → call_pro.
 * - outdoor_silent → ac.start.breaker_disconnect → breaker_visual →
 *   disconnect_visual (VISUAL ONLY — never instruct operating the lever) → call_pro.
 * - Ice keep-running stays inlined on ac.cool.indoor.ice_lines_coil.
 *
 * Advanced capacitor chain (8 nodes) is in this file and runs only when
 * advancedRepairsEnabled is true, and only from
 * ac.cool.conclude.call_pro_capacitor_contactor. Flag false: conclude →
 * call_pro (suspected_capacitor_contactor_advanced_off). No Advanced from
 * the silent Basic hub. Never a screwdriver short. No terminal contact
 * before discharge. Covers on before restore. Contactor is not in the path.
 *
 * "The outdoor unit seems inactive" is the Will-not-start family, not a new id.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SW_FLOW = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TREE_VERSION = 'ac.cool.v0';
  const ENTRY = 'ac.gate.cluster_entry';
  const CONSENT = 'ac.session.consent';
  const WAVE1 = [
    'ac.session.consent',
    'ac.gate.cluster_entry',
    'ac.cool.intake.system_confirm',
    'ac.cool.landing.picker',
    'ac.cool.tstat.mode_setpoint',
    'ac.cool.filter.check',
    'ac.cool.outdoor.fan_spinning',
    'ac.cool.indoor.ice_lines_coil',
    'ac.gate.water_near_electrical',
    'ac.start.outdoor_silent_vs_hum',
    'ac.tstat.blank.batteries',
    'ac.cool.conclude.call_pro_capacitor_contactor'
  ];
  const WAVE2 = [
    'ac.cool.power.breaker_visual',
    'ac.cool.power.disconnect_visual',
    'ac.start.breaker_disconnect',
    'ac.cool.airflow.returns_supplies',
    'ac.cool.outdoor.debris_clearance',
    'ac.noise.hazard_screen',
    'ac.noise.clarify_outdoor_hum'
  ];
  const ADVANCED = [
    'ac.adv.cap.prereq_gate_cluster',
    'ac.adv.cap.confirm_pattern',
    'ac.adv.cap.lockout_verify',
    'ac.adv.cap.access_compartment',
    'ac.adv.cap.identify_label',
    'ac.adv.cap.discharge',
    'ac.adv.cap.replace_like_for_like',
    'ac.adv.cap.reassemble_restore_test'
  ];
  const CONCLUDE = 'ac.cool.conclude.call_pro_capacitor_contactor';
  const LANDING = {
    landing_not_cooling: 'not_cooling',
    landing_will_not_start: 'will_not_start',
    landing_blank_tstat: 'blank_thermostat',
    landing_weak_airflow: 'weak_airflow',
    landing_water_or_ice: 'water_or_ice',
    landing_unusual_noise: 'unusual_noise'
  };

  const o = (id, label, next, hint = '', fact = '', extra = {}) =>
    ({ id, label, next, hint, fact, gate: extra.gate || null });
  const n = (section, title, body, options, extra = {}) =>
    ({ section, title, body, options, caution: extra.caution || '', diyTier: extra.diyTier || 'basic', safetyGate: !!extra.safetyGate });

  const nodes = {
    'ac.gate.cluster_entry': n('Safety first', 'Is any of this happening right now?',
      'Do not approach equipment to find out. Choose from what you already know. Emergency help never requires accepting our terms.\n\nUnited States beta. For immediate danger, get to safety and call 911.', [
        o('hazard_gas_co', 'Gas smell or a carbon monoxide alarm', '@gas', 'Leave the building. Get help from outside.', 'Gas smell or CO alarm reported.', { gate: 'gas_co' }),
        o('hazard_smoke_fire_sparks_burn', 'Smoke, fire, sparks, or a burning smell', '@fire', 'Stop troubleshooting and move away.', 'Smoke, sparks, fire, or burning smell reported.', { gate: 'smoke_fire_sparks_burn' }),
        o('hazard_water_electrical', 'Water at electrical equipment or damaged wiring', '@electrical', 'Do not touch equipment or enter standing water.', 'Water at electrical equipment or damaged wiring reported.', { gate: 'water_near_electrical' }),
        o('hazard_heat_illness', 'Someone is confused, fainting, or seriously ill in the heat', '@heat', 'Call 911. Do not wait on the AC.', 'Possible heat-related medical emergency reported.', { gate: 'heat_illness_911' }),
        o('hazard_refrigerant_alarm', 'A refrigerant-leak alarm or suspected refrigerant release', '@leak', 'Do not reset or disable the alarm.', 'Refrigerant alarm or suspected release reported.', { gate: 'refrigerant_alarm_or_release' }),
        o('hazard_unsure', 'I am not sure whether there is a hazard', '@uncertain', 'Prefer safe halt. Do not continue into DIY.', 'Homeowner was not sure whether a hazard was present.', { gate: 'unsure_hazard' }),
        o('none_of_these', 'None of these', CONSENT, 'Continue with basic, non-invasive checks.')
      ], { safetyGate: true }),

    'ac.session.consent': n('Before you begin', 'A guide, not an equipment inspection.',
      'This beta offers limited homeowner checks and a next step based on your answers. It does not confirm a diagnosis or authorize electrical or refrigerant work.\n\nRequired: confirm you are 18 or older and agree to the beta terms (DIY risks and limits; manufacturer instructions and professional evaluation take priority).', [
        o('agree_18_terms', 'Agree and continue', 'ac.cool.intake.system_confirm', 'I am 18 or older. I have read and agree to the beta terms, including the DIY risks and limits. I understand that manufacturer instructions and professional evaluation take priority.'),
        o('decline_terms', 'Decline / do not agree', '@consent_declined', 'End session. No diagnosis path without required consent.')
      ]),

    'ac.cool.intake.system_confirm': n('Your system', 'What kind of cooling system is this?',
      'Use an existing manual or what you already know. Do not remove a cover or climb to identify equipment.\n\nThis beta covers confirmed conventional, cooling-only split-system central AC (outdoor cooling-only condenser + indoor furnace or air handler).', [
        o('split_central_cool_only', 'Central AC with separate indoor and outdoor units', 'ac.cool.landing.picker', 'A cooling-only outdoor AC connected to an indoor furnace or air handler.', 'Residential split-system central AC reported.'),
        o('heat_pump', 'A heat pump', '@heat_pump_deferred', 'Heat-pump-specific operation is not covered in this beta.', 'Heat pump reported.'),
        o('mini_window_portable', 'A mini-split, window, or portable unit', '@out_of_scope_equipment', 'Out of scope for this beta.', 'Ductless, window, or portable equipment reported.'),
        o('geo_packaged_other', 'Geothermal, packaged, or another system', '@out_of_scope_equipment', 'Out of scope for this beta.', 'Geothermal, packaged, or other out-of-scope equipment reported.'),
        o('not_sure', 'I am not sure', '@system_unconfirmed', 'Do not open covers to find out.')
      ]),

    'ac.cool.landing.picker': n('What you noticed', 'What is going on?',
      'Pick the closest match. Every path already passed the safety gate. Answer only what you know. You can always choose a path that leads to “not sure” later.', [
        o('landing_not_cooling', 'Not cooling', 'ac.cool.tstat.mode_setpoint', 'System seems to run but space is not cooling enough.', 'Complaint: Not cooling — system seems to run but the space is not cooling enough.'),
        o('landing_will_not_start', 'Will not start', 'ac.start.outdoor_silent_vs_hum', 'Outdoor or system will not start / seems dead when it should cool.', 'Complaint: Will not start — outdoor unit or system seems dead when it should cool.'),
        o('landing_blank_tstat', 'Blank thermostat', 'ac.tstat.blank.batteries', 'Thermostat display is blank or dead.', 'Complaint: Thermostat display is blank or dead.'),
        o('landing_weak_airflow', 'Weak airflow', 'ac.cool.filter.check', 'Air from supplies feels weak or uneven.', 'Complaint: Weak airflow from the supplies.'),
        o('landing_water_or_ice', 'Water or ice', 'ac.gate.water_near_electrical', 'Water leak, wet area, or ice on lines / coil / outdoor.', 'Complaint: Water or ice noticed near the AC.'),
        o('landing_unusual_noise', 'Unusual noise', 'ac.noise.hazard_screen', 'Hazard screen first. Not an immediate parts guess.', 'Complaint: Unusual noise from indoor or outdoor equipment.')
      ]),

    'ac.cool.tstat.mode_setpoint': n('Thermostat', 'Cool mode and setpoint',
      'Without opening equipment: look at the thermostat you already use.\n\n1. Is the system mode set to Cool (not Heat, Off, or Emergency Heat)?\n2. Is the cool setpoint below the current room temperature (enough that the system should be calling for cool)?\n3. Fan set to Auto or On is fine for this check.\n\nDo not remove the thermostat from the wall. Do not open the furnace or air-handler cabinet.', [
        o('mode_wrong_or_setpoint_high', 'Mode is not Cool, or setpoint is at/above room temp', '@mode_setpoint_basic', 'Easy setting fix first.', 'Thermostat mode was not Cool, or the setpoint was at or above room temperature.'),
        o('mode_cool_setpoint_ok', 'Mode is Cool and setpoint is below room temp', 'ac.cool.filter.check', 'Continue checks.', 'Thermostat mode is Cool and setpoint is below room temperature.'),
        o('tstat_blank_or_unreadable', 'Thermostat is blank or I cannot read it', 'ac.tstat.blank.batteries', 'Route to blank-thermostat Basic path.', 'Thermostat display is blank or unreadable.'),
        o('not_sure', 'I am not sure', '@mode_setpoint_unsure', 'Do not guess. Do not pull the thermostat off the wall.')
      ]),

    'ac.cool.filter.check': n('Air filter', 'Is it dirty or clogged?',
      'Find the return grille or filter slot you already know (often at a wall/ceiling return or at the furnace/air-handler filter rack).\n\nPull the filter only if it is designed for homeowner swap (slide-out rack / grille). Look for heavy dust, debris, or blocked media. Do not open sealed cabinets, do not reach into the blower, and do not remove panels held by many screws if you are unsure.\n\nIf you cannot safely access the filter without tools or cabinet teardown, choose “I cannot check safely.”', [
        o('filter_dirty_clogged', 'Filter looks dirty or clogged', '@filter_replace_basic', 'Highest-yield Basic DIY.', 'Filter looks dirty or clogged.'),
        o('filter_clean_ok', 'Filter looks clean / recently replaced', {
          byLanding: { weak_airflow: 'ac.cool.airflow.returns_supplies' },
          default: 'ac.cool.outdoor.fan_spinning'
        }, 'Weak airflow continues to returns and supplies. Not cooling continues to the outdoor fan.', 'Filter looks clean or was recently replaced.'),
        o('filter_missing', 'No filter installed', '@filter_missing_basic', 'Install correct size filter before more DIY.', 'No filter installed.'),
        o('cannot_check_safely', 'I cannot check safely', '@filter_inaccessible', 'Do not force access.')
      ]),

    'ac.cool.outdoor.fan_spinning': n('Outdoor unit', 'Is the fan spinning?',
      'From a safe distance (do not put fingers or objects through the grille; no covers off):\n\nWith the thermostat calling for Cool, look and listen at the outdoor condenser.\n\nIs the top (or side) fan visibly spinning? Or is the outdoor unit silent / not moving? Or do you hear a hum or buzz from the outdoor cabinet while the fan is not spinning?\n\nStay clear of moving parts. Do not open the electrical compartment.', [
        o('fan_spinning', 'Outdoor fan is spinning', 'ac.cool.outdoor.debris_clearance', 'Clear exterior debris, then continue ice / cooling checks.', 'Outdoor fan was seen spinning.'),
        o('fan_not_spinning_silent', 'Outdoor unit is silent / fan not spinning', 'ac.start.outdoor_silent_vs_hum', 'Start / power family.', 'Outdoor unit silent; fan not spinning.'),
        o('fan_not_spinning_hum', 'Fan not spinning, but I hear a hum or buzz at the outdoor unit', 'ac.cool.conclude.call_pro_capacitor_contactor', 'Suspected contactor/capacitor path — Advanced OFF.', 'Outdoor fan not spinning; hum or buzz at the outdoor unit.'),
        o('cannot_observe', 'I cannot observe safely', '@outdoor_cannot_observe', 'Do not approach hazards (weather, dogs, locked yard, etc.).'),
        o('outdoor_inaccessible', 'Outdoor unit is inaccessible', '@outdoor_inaccessible', 'Same — no forcing access.', 'Outdoor unit inaccessible.')
      ]),

    'ac.cool.indoor.ice_lines_coil': n('Ice', 'Ice on lines or indoor coil?',
      'Without removing panels or chipping ice:\n\nLook at the larger refrigerant suction line (often insulated) near the outdoor unit or where lines enter the house — is there heavy frost or ice? If you can see the indoor coil area through an existing access designed for homeowner view only, is there ice buildup? Do not force cabinets open. Is water pooling from melting ice near equipment?\n\nIf you see ice: do not keep running the system to “force cool.” Do not chip ice with tools.', [
        o('ice_observed', 'Yes — ice or heavy frost on lines / coil', '@ice_thaw_basic', 'Thaw discipline required.', 'Ice or heavy frost seen on lines or coil.'),
        o('no_ice_observed', 'No ice seen', '@cooling_not_established_basics_clear', 'Cooling still not established → pro path.', 'No ice seen on lines or coil from a safe view.'),
        o('want_keep_running_despite_ice', 'There is ice, but I want to keep the system running', '@ice_keep_running', 'Hard stop.', 'Homeowner wanted to keep the system running despite ice.', { gate: 'ice_keep_running' }),
        o('not_sure_cannot_see', 'I am not sure / cannot see safely', '@ice_not_confirmed', 'Do not open covers to find ice.')
      ], { safetyGate: true }),

    'ac.gate.water_near_electrical': n('Water / electrical', 'Is there water at electrical equipment?',
      'Answer from what you already know. Do not enter standing water to check. Do not touch equipment, disconnects, or panels with wet hands or while standing on a wet floor.\n\nIs there standing water, active leaking onto, or obvious wetness at any of:\n\nIndoor furnace / air handler / electrical disconnect\nOutdoor disconnect or whip area\nBreaker panel\nDamaged or exposed wiring in a wet area', [
        o('water_at_electrical_yes', 'Yes — water at electrical equipment or damaged wiring in a wet area', '@electrical', 'Hard stop. Do not touch.', 'Water at electrical equipment or damaged wiring in a wet area.', { gate: 'water_near_electrical' }),
        o('water_clear_no_electrical_risk', 'No — no water at electrical equipment; area is dry enough to continue looking', 'ac.cool.indoor.ice_lines_coil', 'Continue ice / condensate observation only.', 'No water at electrical equipment; area dry enough to keep looking.'),
        o('water_elsewhere_not_electrical', 'Water or dampness elsewhere (away from electrical)', 'ac.cool.indoor.ice_lines_coil', 'Still caution; ice path may apply.', 'Water or dampness away from electrical equipment.'),
        o('not_sure_water_hazard', 'I am not sure', '@unsure_water_electrical', 'Prefer safe halt.', 'Homeowner was not sure whether water was at electrical equipment.', { gate: 'unsure_water_electrical' })
      ], { safetyGate: true }),

    'ac.start.outdoor_silent_vs_hum': n('Outdoor unit', 'Silent or humming when it should start?',
      'Thermostat should be calling for Cool (mode Cool, setpoint below room). From a safe distance at the outdoor unit (no covers off, nothing through the grille):\n\nWhen cool is calling, which best matches?\n\nCompletely silent (no fan, no obvious compressor sound)\nA hum or buzz from the outdoor cabinet while the fan is not spinning\nOutdoor fan / unit does run (may be the wrong landing)\nYou cannot tell safely', [
        o('outdoor_silent', 'Outdoor unit is silent when cool is calling', 'ac.start.breaker_disconnect', 'Basic power visuals: breaker door, then disconnect position only.', 'Outdoor unit silent while cool is calling.'),
        o('outdoor_hum_no_fan', 'Hum or buzz at outdoor unit; fan not spinning', 'ac.cool.conclude.call_pro_capacitor_contactor', 'Suspected capacitor / contactor — call_pro while Advanced OFF.', 'Hum or buzz at outdoor unit; fan not spinning.'),
        o('outdoor_runs_ok', 'Outdoor unit runs (fan and/or compressor seem active)', 'ac.cool.tstat.mode_setpoint', 'May be Not cooling rather than Will not start.', 'Outdoor unit runs while cool is calling.'),
        o('not_sure_listen', 'I am not sure / cannot observe safely', '@outdoor_listen_unsure', 'Do not force access.')
      ]),

    'ac.tstat.blank.batteries': n('Thermostat', 'Batteries first (Basic)',
      'If the thermostat display is blank:\n\n1. Check whether this thermostat uses replaceable batteries (often AA/AAA behind a pull-off face — only if the face is designed for homeowner battery access).\n2. If yes, replace with fresh batteries of the correct type.\n3. Do not open the furnace/air-handler control board. Do not pull thermostat wiring from the wall to “test” for power. Do not work inside the breaker panel.\n\nIf the thermostat is hardwired / powered by the system (C-wire / common) and stays blank after any designed battery check, that is usually a professional electrical / transformer path.', [
        o('batteries_replaced_display_back', 'Replaced batteries; display works again', '@batteries_display_back', 'Basic success — retest cool call.', 'User replaced thermostat batteries; display works again.'),
        o('batteries_replaced_still_blank', 'Replaced batteries (or no battery compartment); still blank', '@blank_tstat_after_batteries', 'Pro path.', 'Thermostat still blank after a battery check.'),
        o('hardwired_or_no_batteries', 'Hardwired / no batteries; display blank', '@blank_tstat_hardwired_power', 'Pro path — C-wire / transformer / control power.', 'Blank hardwired thermostat, or no battery compartment.'),
        o('cannot_access_safely', 'I cannot access batteries safely', '@tstat_inaccessible', 'Do not force the face off if unsure.'),
        o('not_sure', 'I am not sure', '@tstat_batteries_unsure', 'Do not open equipment.')
      ]),

    'ac.cool.conclude.call_pro_capacitor_contactor': n('Call a professional', 'Suspected start components',
      'Based on your answers (outdoor hum / buzz while the fan is not spinning, or equivalent start evidence while cool is calling), a common professional check is the outdoor contactor and/or capacitor.\n\nAdvanced DIY is OFF in this beta. Do not attempt capacitor discharge, capacitor replacement, contactor replacement, or any cover-off electrical work from this guide.\n\nWhat to do:\n\n1. Leave the system safe (Off at thermostat is fine; shut disconnect/breaker only if you already know how and conditions are dry/safe).\n2. Call a licensed HVAC tech.\n3. You may tell them: outdoor unit hummed or showed start symptoms while the condenser fan was not spinning; homeowner Basic checks only (no covers removed).\n\nThis is not a confirmed parts diagnosis — it is a ranked reason to stop DIY and get service.', [
        o('ack_call_pro', 'Understood — call a professional', '@suspected_capacitor_contactor_advanced_off', 'Terminal acknowledgment.'),
        o('want_diy_capacitor_anyway', 'I want to replace the capacitor myself', {
          whenAdvanced: 'ac.adv.cap.prereq_gate_cluster',
          default: '@suspected_capacitor_contactor_advanced_off'
        }, 'Not offered as live DIY while Advanced is off.')
      ], { diyTier: 'pro_only' }),

    'ac.noise.hazard_screen': n('Unusual noise', 'Hazard screen first',
      'Before clarifying the sound, rule out danger. Choose from what you already know. Do not approach equipment to find sparks or smoke.\n\nIf any of these are happening now:\n\n- Burning smell or electrical heat smell from equipment\n- Sparks\n- Smoke or fire\n- Grinding metal-on-metal (violent, new, or worsening)\n\n…stop troubleshooting. Prefer emergency help or a licensed professional over continuing.\n\nFor immediate danger, get safe and call 911.', [
        o('noise_burning_sparks_smoke', 'Burning smell, sparks, smoke, or fire', '@noise_burning_sparks_smoke', 'Emergency stop. Do not keep diagnosing.', 'Burning smell, sparks, smoke, or fire with the noise.', { gate: 'burning_smell' }),
        o('noise_grinding_metal', 'Grinding metal-on-metal', '@grinding_metal_noise', 'Turn the system Off if safe, then call a pro.', 'Grinding metal-on-metal noise.', { gate: 'grinding_metal_noise' }),
        o('noise_no_hazard_symptoms', 'None of those hazard signs — noise only', 'ac.noise.clarify_outdoor_hum', 'Continue to clarify the outdoor hum pattern.'),
        o('noise_unsure_hazard', 'Not sure if it is a hazard', '@uncertain', 'Prefer a safe halt. Do not continue into DIY.', 'Homeowner was not sure whether the noise was a hazard.', { gate: 'unsure_hazard' })
      ], { safetyGate: true }),

    'ac.noise.clarify_outdoor_hum': n('Unusual noise', 'Which noise is it?',
      'Hazard signs were ruled out. Only one pattern continues into the outdoor silent-versus-hum check:\n\n- Outdoor hum or buzz\n- While the thermostat is calling for Cool\n- And the outdoor fan is not spinning\n\nAny other noise — indoor screech, rattle, unknown sound, outdoor noise while the fan spins, or noise when Cool is not calling — stops here for a licensed professional. This step does not name a failed part.', [
        o('outdoor_hum_cool_calling_fan_not_spinning', 'Outdoor hum or buzz while Cool is calling; fan not spinning', 'ac.start.outdoor_silent_vs_hum', 'The only route into the silent-versus-hum check.', 'Outdoor hum or buzz while Cool is calling and the fan is not spinning.'),
        o('indoor_or_other_noise', 'Indoor noise, rattle, screech, or other / unknown', '@unusual_noise_unresolved', 'Stays with a professional.'),
        o('outdoor_noise_but_fan_spins_or_not_calling', 'Outdoor noise, but the fan spins or Cool is not calling', '@unusual_noise_unresolved', 'Not the start-hum pattern.'),
        o('not_sure_noise', 'Still not sure', '@unusual_noise_unresolved', 'Prefer a professional over a guess.')
      ]),

    'ac.cool.airflow.returns_supplies': n('Airflow', 'Returns and supplies',
      'The filter already looks clean or was just replaced. Check simple indoor airflow blockers.\n\nReturns (intake): is a return grille blocked by furniture, boxes, curtains, or a thick rug edge? Move furniture so the grille can breathe. Do not remove fixed drywall returns.\n\nSupplies (registers): are supply registers closed, covered by rugs, or blocked by furniture? Open closed vents that should be open for the rooms you want cooled.\n\nDo not cut or modify ducts, pull a register into a chase, open the blower cabinet, or seal ducts from this guide. If airflow is still weak after clearing furniture, rugs, and closed vents, call a licensed HVAC professional.', [
        o('blocked_cleared_airflow_improved', 'Blocked return or supply cleared; airflow improved', '@returns_supplies_cleared', 'Basic step done. Retest comfort.', 'Blocked return or supply cleared; airflow improved.'),
        o('blocked_cleared_still_weak', 'Cleared blockers; airflow still weak', '@weak_airflow_after_returns_supplies', 'No duct work from this guide.'),
        o('no_blockers_found_still_weak', 'No furniture, rug, or vent blockers; still weak', '@weak_airflow_after_returns_supplies', 'Call a professional.'),
        o('cannot_check_safely', 'I cannot check returns or supplies safely', '@airflow_check_inaccessible', 'Do not force access.'),
        o('want_duct_work', 'I want to cut ducts, open a chase, or reach the blower', '@duct_work_rejected_not_basic', 'Not a Basic step.', { gate: 'duct_work_rejected_not_basic' })
      ]),

    'ac.cool.outdoor.debris_clearance': n('Outdoor unit', 'Exterior debris and clearance',
      'From outside the cabinet only:\n\n- Remove leaves, grass clippings, and loose debris from the top and sides of the outdoor unit and from the pad.\n- Keep sides and the top from being smothered by shrubs, stored items, or piled debris. Follow the manufacturer clearance if you have the manual.\n- Work from outside the grille. Do not put hands or tools through the grille while power is on.\n\nIf debris is packed past the grille: set the thermostat to Off. Kill outdoor power only if you already know a safe, dry homeowner way and can verify Off. Otherwise stop and call a professional rather than reaching in while it is live. Do not comb coil fins deep into the coil from this guide.\n\nWet weather, water near electrical equipment, or damaged outdoor wiring: stop.', [
        o('exterior_cleared_ok', 'Exterior debris cleared; sides and top look open enough', 'ac.cool.indoor.ice_lines_coil', 'Continue the cooling checks.', 'Exterior debris cleared; sides and top look open enough.'),
        o('need_reach_into_grille', 'Debris requires reaching into or past the grille', '@debris_reach_in_basic', 'Shut off first. Do not reach in while it is running.', 'Debris is packed past the grille.'),
        o('wet_or_electrical_nearby', 'Wet conditions or an electrical concern outdoors', '@debris_wet_electrical', 'Hard stop.', 'Wet conditions or an electrical concern at the outdoor unit.', { gate: 'water_near_electrical' }),
        o('cannot_access_yard_unit', 'I cannot safely access the outdoor unit', '@outdoor_inaccessible', 'Do not force access.'),
        o('want_fin_comb_deep_coil', 'I want to comb fins deep into the coil with tools', '@coil_service_pro_only', 'Not a Basic step.', { gate: 'coil_service_pro_only' })
      ], { safetyGate: true }),

    'ac.start.breaker_disconnect': n('Will not start', 'Basic power visuals',
      'The outdoor unit is silent while Cool is calling. Before any further start check, confirm Basic power visuals in this order:\n\n1. Breaker panel door — visual On, Off, or tripped for the outdoor/AC circuit. No deadfront off.\n2. Outdoor disconnect — visual Off/On position only, from safe dry ground. This guide does not tell you to operate the lever, open the door, or pull a fuse.\n\nThis step does not open panels or pull fuses. If you cannot do either check safely (wet, unsure, inaccessible, or damaged), stop and call a licensed professional.\n\nCapacitor or cover-off work is not offered from this step.', [
        o('begin_breaker_then_disconnect', 'I can safely check the breaker door, then the disconnect', 'ac.cool.power.breaker_visual', 'Panel door first, then disconnect position only.'),
        o('cannot_safely_either', 'I cannot safely check the breaker or the disconnect', '@outdoor_silent_will_not_start', 'Stop rather than guess.', 'Could not safely check the breaker or the outdoor disconnect.', { gate: 'cannot_kill_power' }),
        o('already_did_breaker_go_disconnect', 'Breaker visual is already done — go to the disconnect visual', 'ac.cool.power.disconnect_visual', 'Only if the breaker door check already passed this session. Otherwise the breaker check comes first.'),
        o('want_advanced_or_covers_off', 'I want capacitor or cover-off electrical work from here', '@advanced_not_from_basic_hub', 'Not offered from this Basic step.', 'Asked for cover-off or capacitor work from the silent-path hub.', { gate: 'high_voltage_intent' })
      ], { safetyGate: true }),

    'ac.cool.power.breaker_visual': n('Breaker panel', 'Visual check only (door open)',
      'You are confirming whether the outdoor / AC circuit breaker looks tripped, Off, or On. This is a panel-door check only.\n\n- Stand on a dry floor with dry hands.\n- Open only the outer door of the breaker panel if you already know how and it is meant for reading labels.\n- Do not remove the deadfront / cover that exposes bus bars.\n- Do not probe, meter, or touch screw terminals.\n- Find the breaker labeled for the outdoor unit, AC, or condenser. If you cannot tell which breaker it is, stop and call a professional.\n\nA tripped handle is often midway between On and Off. That varies by brand.\n\nOptional reset: only if the floor and your hands are dry, you are certain which breaker is the outdoor/AC circuit, and it is a standard toggle you already know how to reset. If you are unsure which breaker, anything is wet or flooded, aluminum wiring is uncertain, or the panel looks damaged — do not reset. Call a professional.', [
        o('breaker_on_confirmed', 'Breaker for outdoor/AC looks On', 'ac.cool.power.disconnect_visual', 'Continue to the disconnect visual.', 'Outdoor/AC breaker looks On.'),
        o('breaker_tripped_or_off', 'Breaker looks tripped or Off', '@breaker_reset_basic', 'Optional safe reset only if it is dry and you know which breaker.', 'Outdoor/AC breaker looks tripped or Off.'),
        o('breaker_reset_ok_still_silent', 'I reset it safely; outdoor unit is still silent while Cool is calling', 'ac.cool.power.disconnect_visual', 'Continue to the disconnect visual.', 'Breaker was reset safely; outdoor unit still silent while Cool is calling.'),
        o('unsure_which_breaker', 'I cannot tell which breaker is for the outdoor unit', '@cannot_identify_ac_breaker', 'Do not guess.', 'Could not identify the outdoor/AC breaker.'),
        o('cannot_open_or_wet_unsafe', 'Wet floor or hands, flood, damaged panel, or I cannot open the door safely', '@breaker_unsafe_stop', 'Hard stop. No panel work.', 'Wet, flood, damaged panel, or breaker door could not be opened safely.', { gate: 'cannot_kill_power' }),
        o('want_panel_interior', 'I need to remove the deadfront or see inside the panel', '@panel_interior_rejected', 'Not a Basic step.', 'Asked to remove the breaker deadfront.', { gate: 'high_voltage_intent' })
      ], { caution: 'Panel door only. Do not remove the deadfront or touch terminals.', safetyGate: true }),

    'ac.cool.power.disconnect_visual': n('Outdoor disconnect', 'Visual position only',
      'From safe dry ground, look at the outdoor disconnect box near the condenser (usually on the wall within sight of the unit).\n\nCan you see whether the exterior handle or lever, or a visible On/Off marking, appears Off or On?\n\nStay back if the box is wet, damaged, buzzing, hot-smelling, or if weather makes the approach unsafe.\n\nThis step does not tell you to:\n\n- Operate or flip the exterior lever or handle\n- Open the disconnect door\n- Pull a fused pull-out block\n- Touch whip wires, lugs, or anything inside\n- Do any cover-off electrical work\n\nIf you would need to operate the disconnect, or the only path is a fused pull-out, an open door, or the inside of the box, or you cannot safely see Off/On from dry ground — call a licensed professional. Do not invent a manufacturer procedure you do not have.', [
        o('disconnect_appears_on', 'From safe ground, the disconnect appears On', '@outdoor_silent_will_not_start', 'Visual only. Basic power visuals are exhausted.', 'Outdoor disconnect appears On from safe ground; outdoor unit still silent.'),
        o('disconnect_appears_off', 'From safe ground, the disconnect appears Off', '@outdoor_disconnect_appears_off', 'Visual only. This may explain a silent outdoor unit.', 'Outdoor disconnect appears Off from safe ground.'),
        o('cannot_see_position_safely', 'I cannot see Off/On safely from dry ground', '@disconnect_visual_inaccessible', 'Do not force the approach.'),
        o('need_to_operate_lever', 'I would need to flip or operate the exterior lever to continue', '@disconnect_operate_not_basic', 'Basic does not include operating the lever.', 'Would need to operate the disconnect lever.', { gate: 'disconnect_operate_not_basic' }),
        o('fused_pullout_or_open_door', 'It is a fused pull-out, or I would need to open the door or see inside', '@disconnect_open_or_fused', 'Always a professional.', 'Fused pull-out or open-door disconnect.', { gate: 'high_voltage_intent' }),
        o('wet_damaged_or_unsafe', 'Wet, damaged, buzzing, or otherwise unsafe to approach', '@disconnect_unsafe_approach', 'Hard stop.', 'Outdoor disconnect is wet, damaged, buzzing, or unsafe to approach.', { gate: 'wet_hands_flood' })
      ], { caution: 'Visual only. This step does not tell you to flip, pull, or open the disconnect.', safetyGate: true }),

    'ac.adv.cap.prereq_gate_cluster': n('Advanced · capacitor', 'Hard prerequisites',
      'You are entering a gated Advanced path for like-for-like outdoor run/dual capacitor work only. Contactor replacement is not on this path.\n\nAll of the following must be true. Any fail stops the path. There is no “I accept the risk” override.\n\n1. The equipment is a cool-only residential split central air conditioner — not a heat pump, mini-split, packaged unit, or window unit.\n2. Safety gates are already clear. No burning, smoke, spark, gas, or flood is active now.\n3. You can safely kill power at the outdoor disconnect and verify Off on a manufacturer homeowner path, with dry hands and a dry floor.\n4. Conditions are dry, light is adequate, you are sober and 18 or older, and there is no flooding.\n5. Capacitor identity and microfarad values come only from the label after power is verified dead. Do not guess a value now.\n6. You will stop and call a professional if any step is unsure.\n\nA capacitor can hold a dangerous charge. Prefer a professional over a risky repair.', [
        o('all_prereqs_pass', 'All prerequisites pass — continue', 'ac.adv.cap.confirm_pattern', 'Next is a safe-distance pattern check. No covers off yet.'),
        o('wrong_equipment', 'Heat pump, mini-split, packaged, window, or I am not sure of the type', '@out_of_scope_equipment', 'Out of scope.'),
        o('cannot_kill_verify_off', 'I cannot safely kill outdoor power or verify Off', '@cannot_kill_power', 'Stop. Do not open covers.', 'Cannot safely kill outdoor power or verify Off.', { gate: 'cannot_kill_power' }),
        o('wet_flood_unsafe_conditions', 'Wet hands, flood, rain, or unsafe conditions', '@wet_hands_flood_stop', 'Stop. Do not touch equipment.', 'Wet hands, flood, rain, or unsafe conditions on the capacitor path.', { gate: 'wet_hands_flood' }),
        o('hazard_active_now', 'Burning, smoke, sparks, gas, or flood is active now', '@adv_hazard_active', 'Emergency stop.', 'Hazard active at the start of the capacitor path.', { gate: 'burning_smell' }),
        o('abort_call_pro', 'Call a professional instead', '@user_elected_call_pro_advanced_abort', 'Always allowed.')
      ], { diyTier: 'advanced', safetyGate: true, caution: 'Every gate must pass. Contactor replacement is not part of this path.' }),

    'ac.adv.cap.confirm_pattern': n('Advanced · capacitor', 'Confirm the start pattern',
      'Before any cover comes off, re-confirm the pattern from a safe distance. Nothing through the grille.\n\n- Thermostat mode is Cool and the setpoint is calling (below the room temperature).\n- The outdoor cabinet hums or buzzes.\n- The outdoor fan is not spinning.\n\nThis is the same observation as the silent-versus-hum check. It does not confirm a failed part. If the pattern is not there, stop. If a hazard shows up now, stop.', [
        o('pattern_confirmed_hum_no_fan', 'Confirmed: Cool is calling, outdoor hum, fan not spinning', 'ac.adv.cap.lockout_verify', 'Continue to lockout. Covers stay on.', 'Cool calling, outdoor hum, fan not spinning — reconfirmed.'),
        o('pattern_not_confirmed', 'That pattern is not confirmed', '@cap_pattern_not_confirmed', 'Do not open covers.'),
        o('hazard_seen_now', 'Burning, sparks, smoke, or another hazard now', '@adv_hazard_active', 'Emergency stop.', 'Hazard seen during pattern confirm.', { gate: 'burning_smell' }),
        o('want_call_pro', 'Call a professional instead', '@user_elected_call_pro_advanced_abort', 'Always allowed.')
      ], { diyTier: 'advanced', caution: 'No covers off. Safe distance only.' }),

    'ac.adv.cap.lockout_verify': n('Advanced · capacitor', 'Lock out and verify dead',
      'Before opening any outdoor electrical compartment:\n\n1. Set the thermostat to Off.\n2. Turn the outdoor disconnect Off using the manufacturer homeowner path you already know and can do safely on dry ground.\n3. Verify: no outdoor fan spin, and no hum or buzz that continues as if the unit is still energized.\n4. Wait the discharge / settle period in the manufacturer documentation you have for this equipment. Treat the capacitor as charged until it is verified discharged. The discharge step comes later. Do not treat a short wait you made up as “safe enough.”\n\nIf you cannot kill power, still hear hum or see spin after Off, are unsure about the wait, or conditions are wet — stop. Do not open covers.', [
        o('lockout_verified_dead', 'Thermostat Off, disconnect Off, no spin or hum, and I followed the manufacturer wait guidance', 'ac.adv.cap.access_compartment', 'Continue only while it stays verified dead.', 'Lockout verified: thermostat Off, disconnect Off, no spin or hum.'),
        o('cannot_kill_power', 'I cannot kill power or verify Off safely', '@cannot_kill_power', 'Stop. Do not open covers.', 'Could not kill power or verify Off.', { gate: 'cannot_kill_power' }),
        o('still_hum_or_spin', 'It is still humming or spinning after Off', '@still_live_symptoms_after_off', 'Do not open the compartment.', 'Hum or spin continued after Off.', { gate: 'still_live_symptoms_after_off' }),
        o('unsure_wait_discharge', 'I am unsure about the manufacturer wait, or I still treat it as charged', '@capacitor_discharge_unsure', 'Stop. Do not invent a short wait.', 'Unsure about manufacturer wait; capacitor still treated as charged.', { gate: 'capacitor_discharge_unsure' }),
        o('wet_or_unsafe', 'Wet hands, flood, or unsafe conditions', '@wet_hands_flood_stop', 'Stop.', 'Wet or unsafe conditions during lockout.', { gate: 'wet_hands_flood' })
      ], { diyTier: 'advanced', safetyGate: true, caution: 'Treat the capacitor as charged until it is verified discharged. Do not invent a short wait.' }),

    'ac.adv.cap.access_compartment': n('Advanced · capacitor', 'Open the compartment only while dead',
      'Lockout must already be verified. Open the outdoor electrical compartment only while power is verified dead.\n\n- Follow the manufacturer homeowner access for the service panel you are allowed to open when power is Off.\n- Do not defeat an interlock.\n- Do not do live work.\n- If you see burn marks, melted wires, standing water, or damaged insulation, stop. Leave the unit as safe as you can, with power Off, and get help.\n\nContactor replacement is not on this path.', [
        o('compartment_accessible_safe', 'Compartment is accessible safely after verified dead', 'ac.adv.cap.identify_label', 'Next is the label only. Do not touch terminals.', 'Electrical compartment opened only after lockout was verified.'),
        o('must_defeat_interlock_unsafely', 'I would need to defeat an interlock to continue', '@high_voltage_intent', 'Stop. Do not bypass it.', 'Would need to defeat an interlock.', { gate: 'high_voltage_intent' }),
        o('cannot_access', 'I cannot access the compartment safely', '@compartment_inaccessible', 'Leave power Off and call a professional.'),
        o('saw_damage_burn_water', 'Burn damage, melted wiring, or water inside', '@compartment_damage_water', 'Stop. Leave power Off.', 'Burn damage, melted wiring, or water inside the compartment.', { gate: 'burning_smell' })
      ], { diyTier: 'advanced', safetyGate: true, caution: 'Covers come off only after lockout is verified. No live work.' }),

    'ac.adv.cap.identify_label': n('Advanced · capacitor', 'Read the label — do not touch terminals',
      'Power must still be verified dead.\n\nDo not touch capacitor terminals or leads until the discharge step is finished. Looking at or photographing the label from a distance, with power Off, is OK.\n\nIdentify the outdoor run / dual-run capacitor by its label only:\n\n- Read the microfarad values and VAC rating from the label without touching terminals or leads.\n- Note terminal markings (often C, HERM, and FAN, or the manufacturer’s equivalents) from the printing. Do not probe terminals.\n- Write the label down for the matching replacement.\n\nIf the label is unreadable or the type is unknown, stop and call a professional. Do not guess a microfarad value. “Any capacitor will do” is not a match.\n\nIf you already touched terminals or leads before discharge, stop. If you are no longer sure power is dead, stop.', [
        o('label_readable_recorded', 'Label is readable from a distance; microfarad, VAC, and terminals are written down; I did not touch terminals', 'ac.adv.cap.discharge', 'Discharge is next, before any terminal contact.', 'Capacitor label read from a distance; no terminal contact.'),
        o('label_unreadable_unknown', 'Label is unreadable or the microfarad value is unknown', '@capacitor_label_unknown', 'Stop. Do not guess a value.'),
        o('not_a_standard_dual_run', 'This is not a standard dual-run capacitor, or I cannot match the type', '@capacitor_label_unknown', 'Stop. Do not force a match.'),
        o('already_touched_terminals', 'I already touched terminals or leads before discharge', '@premature_terminal_contact', 'Stop. Treat discharge as uncertain.', 'Terminals or leads were touched before discharge.', { gate: 'capacitor_discharge_unsure' }),
        o('want_call_pro', 'Call a professional instead', '@user_elected_call_pro_advanced_abort', 'Always allowed.'),
        o('power_uncertainty_again', 'I am no longer sure power is dead', '@cannot_kill_power', 'Stop. Do not continue on a guess.', 'Power-dead status became uncertain at the label step.', { gate: 'cannot_kill_power' })
      ], { diyTier: 'advanced', caution: 'Do not touch capacitor terminals or leads. Label only, from a distance, with power off.' }),

    'ac.adv.cap.discharge': n('Advanced · capacitor', 'Discharge — residual charge can injure',
      'The capacitor can hold a hazardous charge even after power is Off. Treat it as charged until it is verified discharged.\n\nUse only:\n\n- The manufacturer’s documented discharge method for this equipment, or\n- A proper insulated discharge / bleed tool made for capacitors, following that tool’s instructions\n\nNever:\n\n- Short the terminals with a screwdriver\n- Short them with a bare conductor, pliers, wire, or coin\n- Treat “it has been Off long enough” as discharged\n- Invent a resistor value or a short wait and call it safe enough\n\nIf you are unsure of the method, stop and call a professional. Do not improvise. If you see a spark, feel a shock, or see smoke, stop and get help.', [
        o('discharge_done_per_mfr_or_insulated_bleed', 'Discharged using the manufacturer method or a proper insulated bleed tool', 'ac.adv.cap.replace_like_for_like', 'Like-for-like replacement is next. Contactor stays untouched.', 'Capacitor discharged with the manufacturer method or an insulated bleed tool.'),
        o('unsure_discharge_method', 'I am unsure of the correct discharge method', '@capacitor_discharge_unsure', 'Stop now. Do not improvise.', 'Unsure of the discharge method.', { gate: 'capacitor_discharge_unsure' }),
        o('spark_shock_smoke_during', 'Spark, shock, or smoke during discharge', '@discharge_spark_shock_smoke', 'Emergency stop.', 'Spark, shock, or smoke during discharge.', { gate: 'sparking' }),
        o('abort_call_pro', 'Stop — call a professional', '@user_elected_call_pro_advanced_abort', 'Always allowed. Leave power Off.'),
        o('tempted_screwdriver_short', 'I was going to short it with a screwdriver or bare metal', '@capacitor_discharge_forbidden_method', 'That method is not in this guide. Stop.', 'Considered shorting the capacitor with a screwdriver or bare metal.', { gate: 'capacitor_discharge_unsure' })
      ], { diyTier: 'advanced', safetyGate: true, caution: 'Residual charge can injure. Never short terminals with a screwdriver or bare metal. If you are unsure of the method, stop and call a professional.' }),

    'ac.adv.cap.replace_like_for_like': n('Advanced · capacitor', 'Replace like-for-like only',
      'Power stays verified dead, and the capacitor is discharged from the previous step. Replace only the run/dual capacitor, like-for-like:\n\n- Microfarad within the tolerance on the label you recorded. Do not guess.\n- Equal or greater VAC rating.\n- Correct terminal markings (C, HERM, FAN, or the exact manufacturer equivalents). Note the leads before you move them.\n- Mount it the way the original was mounted. Leads go on the matching terminals only.\n\nDo not use “any capacitor will do.” Do not force a microfarad, VAC, or terminal mismatch. Do not replace the contactor on this path. Do not energize the unit to test the fit.', [
        o('replacement_matched_installed', 'Matched microfarad, VAC, and terminals, and installed it like-for-like', 'ac.adv.cap.reassemble_restore_test', 'Covers go on before power is restored.', 'Like-for-like capacitor installed from the recorded label.'),
        o('uf_or_vac_mismatch', 'Microfarad or VAC does not match', '@capacitor_mismatch_do_not_proceed', 'Do not install it. Leave power Off.', 'Microfarad or VAC mismatch. Replacement not installed as a mismatch.', { gate: 'capacitor_mismatch_do_not_proceed' }),
        o('wrong_terminals_uncertain', 'Terminals are wrong, or I am not sure where the leads go', '@capacitor_mismatch_do_not_proceed', 'Do not guess the terminals. Leave power Off.', 'Terminals wrong or lead placement uncertain.', { gate: 'capacitor_mismatch_do_not_proceed' }),
        o('want_replace_contactor_too', 'I also want to replace the contactor', '@contactor_not_in_advanced_cap_path', 'Contactor work is not on this path.', 'Asked to replace the contactor on the capacitor path.', { gate: 'contactor_not_in_advanced_cap_path' }),
        o('abort_call_pro', 'Stop — call a professional', '@user_elected_call_pro_advanced_abort', 'Always allowed. Leave power Off.')
      ], { diyTier: 'advanced', safetyGate: true, caution: 'Capacitor only. The contactor is not replaced on this path.' }),

    'ac.adv.cap.reassemble_restore_test': n('Advanced · capacitor', 'Covers on, then a brief Cool test',
      'All covers and compartment doors must be on before you restore power. Do not restore power with covers off.\n\n1. Reinstall the electrical compartment cover fully and securely.\n2. Confirm no tools or loose hardware are left inside.\n3. Restore the outdoor disconnect to On only after the covers are on.\n4. Set the thermostat to Cool and allow a brief call for cool.\n5. From a safe distance: does the outdoor fan start normally, without an abnormal smell, a spark, or a hum with no start?\n\nAbnormal smell or a spark: kill power if you can do that safely, then get help. Hum with no start after the replacement: kill power if safe, then call a professional. If you cannot reassemble the covers, leave power Off and call a professional.\n\nThis is a brief test, not a full commissioning.', [
        o('covers_on_test_ok', 'Covers are on, and the brief Cool test looks normal', '@next_step_advanced', 'Advanced path complete. Keep watching comfort.', 'Covers were on before power was restored; brief Cool test looked normal.'),
        o('abnormal_smell_spark', 'Abnormal smell or a spark after restore', '@restore_abnormal_smell_spark', 'Kill power if safe. Emergency stop.', 'Abnormal smell or spark after restore.', { gate: 'burning_smell' }),
        o('hum_no_start_after_replace', 'Hum and no start after the replacement', '@hum_no_start_after_cap_replace', 'Kill power if safe, then call a professional.', 'Hum with no start after capacitor replacement.', { gate: 'hum_no_start_after_cap_replace' }),
        o('cannot_reassemble', 'I cannot get the covers back on securely', '@cannot_reassemble_leave_power_off', 'Leave power Off.', 'Covers could not be reassembled. Power left Off.', { gate: 'cannot_reassemble_leave_power_off' })
      ], { diyTier: 'advanced', safetyGate: true, caution: 'Covers must be on before power is restored. Never restore power with covers off.' })
  };

  const r = (tier, urgency, title, explanation, actions, avoid, source, outcome, reason, extra = {}) =>
    ({ tier, urgency, title, explanation, actions, avoid, source, outcome, reason, diyTier: extra.diyTier || null, gate: extra.gate || null, continueTo: extra.continueTo || null });

  const results = {
    gas: r('Emergency', 'Leave now · call from outside', 'Get everyone to fresh air.',
      'A gas smell or carbon monoxide alarm takes priority over troubleshooting.',
      ['Leave the building immediately. Do not operate lights, thermostats, appliances, or phones inside.', 'From a safe location outside, call 911; for a gas smell, also contact the gas utility’s emergency line. Stay out until responders say it is safe.'],
      'Do not search for the leak, reset an alarm, or re-enter to switch the AC off.', 'gas',
      'emergency_exit', 'gas_co', { gate: 'gas_co' }),
    fire: r('Emergency', 'Move away · call 911', 'Stop. Treat smoke, sparks, or burning as a hazard.',
      'The source cannot be assessed remotely. Do not stay at the equipment to collect more information.',
      ['Leave the affected area and get others away. For smoke, fire, sparks, or an active burning smell, call 911 from safety.', 'Shut power only if it is safe: dry hands, dry floor, and a breaker you already know. If smoke or fire continues, evacuate and do not return to the equipment.', 'Do not return to operate equipment until the hazard has been assessed and the appropriate professional has cleared it.'],
      'Do not stay and troubleshoot, and do not attempt an electrical repair.', 'fire',
      'emergency_exit', 'smoke_fire_sparks_burn', { gate: 'smoke_fire_sparks_burn' }),
    heat: r('Emergency', 'Call 911 now', 'Help the person before the AC.',
      'Confusion, fainting, seizures, or severe illness during heat exposure can require emergency medical care.',
      ['Call 911. Move the person to a cooler place if it is safe, begin cooling with cool wet cloths, and follow the dispatcher’s instructions.', 'Stay with the person. Do not delay help while trying to repair the AC.'],
      'Do not leave a seriously ill person alone or wait for a troubleshooting result.', 'heat',
      'emergency_exit', 'heat_illness_911', { gate: 'heat_illness_911' }),
    electrical: r('Stop / professional', 'Keep away · urgent help', 'Do not touch wet or damaged electrical equipment.',
      'Water and damaged wiring create risks that this tool cannot assess.',
      ['Stay clear of standing water and the equipment. Keep other people away.', 'Shut off main power only if you can do it from a dry, safe location. Otherwise leave and get help.', 'Contact a licensed HVAC professional or electrician. For sparking, smoke, shock, or an immediate danger, call 911 from safety.'],
      'Do not step through water, touch switches on wet equipment, open an electrical cover, or try a reset.', 'electrical',
      'emergency_exit', 'water_near_electrical', { gate: 'water_near_electrical' }),
    leak: r('Stop / professional', 'Leave the affected area', 'Do not reset a refrigerant-leak alarm.',
      'Some systems use automatic leak-mitigation controls. This beta cannot identify the refrigerant, concentration, or alarm cause.',
      ['Move people out of the affected area to fresh air without operating switches or creating ignition sources.', 'Call a licensed HVAC professional with EPA 608 capability from a safe location and follow the equipment’s alarm instructions. For breathing trouble or immediate danger, call 911.', 'Do not DIY-seal a leak or add refrigerant.'],
      'Do not turn off a mitigation blower, cycle power, bypass a sensor, use flames, or open refrigerant lines.', 'refrigerant',
      'emergency_exit', 'refrigerant_alarm_or_release', { gate: 'refrigerant_alarm_or_release' }),
    uncertain: r('Stop / professional', 'Do not continue the check', 'Uncertainty is a good reason to stop.',
      'You do not need to approach equipment or guess an answer. This is a hard stop, not a path into DIY.',
      ['Stay in a safe location and describe what you already observed to a qualified professional.', 'If gas, smoke, an alarm, electrical danger, or serious heat illness may be present, get away and seek emergency help.'],
      'Do not operate equipment or controls just to find out whether a hazard exists.', 'safety',
      'emergency_exit', 'unsure_hazard', { gate: 'unsure_hazard' }),
    unsure_water_electrical: r('Stop / professional', 'Do not continue the check', 'Uncertainty around water and electricity is a reason to stop.',
      'Do not enter standing water or touch equipment to find out.',
      ['Stay clear of the equipment and any wet floor.', 'Call a licensed HVAC professional or electrician and describe what you already saw.', 'If there is sparking, smoke, shock, or you cannot get to a dry place, call 911 from safety.'],
      'Do not mop around equipment and keep diagnosing, and do not touch disconnects or panels with wet hands.', 'electrical',
      'emergency_exit', 'unsure_water_electrical', { gate: 'unsure_water_electrical' }),
    ice_keep_running: r('Stop / professional', 'Stop. Do not keep it running.', 'Ice plus forced running is not a DIY path.',
      'Keeping a system running with ice on the lines or coil risks compressor damage and water damage.',
      ['Turn the system Off at the thermostat. Do not chip ice with tools.', 'Let the ice thaw, and schedule a licensed HVAC diagnosis before you rely on cooling again.'],
      'Do not keep cooling on to force the house cold, and do not bypass this stop.', 'ice',
      'emergency_exit', 'ice_keep_running', { gate: 'ice_keep_running' }),
    consent_declined: r('More information needed', 'Session ended', 'The check stops without agreement.',
      'This guide does not continue into a diagnosis path unless you agree to the beta terms and confirm you are 18 or older.',
      ['You can close this page, or start again if you decide to agree.', 'For a current hazard, get to safety and call 911. This website is not an emergency service.'],
      'Do not use an unfinished check as permission to open equipment.', 'scope',
      'insufficient_info', 'consent_declined'),
    heat_pump_deferred: r('More information needed', 'Outside this beta', 'Heat-pump-specific operation is not covered here.',
      'This check is for cooling-only split central air conditioners. It will not guess a heat-pump diagnosis.',
      ['Use the manufacturer’s owner support or your HVAC company for heat-pump operation.', 'Do not apply cooling-only steps to a heat pump as if they were the same system.'],
      'Do not open covers to force an identification.', 'scope',
      'insufficient_info', 'heat_pump_out_of_scope'),
    out_of_scope_equipment: r('More information needed', 'Outside this beta', 'This equipment is outside the cooling-only split central AC check.',
      'Mini-splits, window and portable units, geothermal, packaged systems, and other types are not diagnosed here.',
      ['Hire a technician who works on that type of equipment, or use that manufacturer’s owner guidance.', 'You can write down an already-known model number yourself. Do not remove a cover or climb to find it.'],
      'Do not apply this central-AC guide to other equipment.', 'scope',
      'insufficient_info', 'out_of_scope_equipment'),
    system_unconfirmed: r('More information needed', 'Confirm the system first', 'This check needs a confirmed split central air conditioner.',
      'Do not open covers to find out what you have.',
      ['Use the manual, or ask someone who already knows the equipment, whether it is a cooling-only central AC with separate indoor and outdoor units.', 'Start again when you can confirm that. If you cannot confirm it, use your HVAC company rather than guessing.'],
      'Do not remove panels or climb to read a model number.', 'scope',
      'insufficient_info', 'system_unconfirmed'),
    mode_setpoint_unsure: r('More information needed', 'Confirm Cool and the setpoint', 'The next check waits on the thermostat display.',
      'Do not guess the mode, and do not pull the thermostat off the wall.',
      ['Read the mode and setpoint on the display, or use the thermostat manual.', 'Start the check again when you can say whether mode is Cool and the setpoint is below the room temperature.'],
      'Do not open the furnace or air-handler cabinet to answer this.', 'maintenance',
      'insufficient_info', 'mode_setpoint_unsure'),
    outdoor_cannot_observe: r('More information needed', 'Stop where you can see safely', 'The outdoor fan check needs a safe view.',
      'Do not move closer because of weather, a locked yard, animals, or anything else that makes the area unsafe.',
      ['Stay back. Try again later only from a safe distance if conditions change.', 'If the home still needs cooling and you cannot observe the outdoor unit, call a licensed HVAC professional.'],
      'Do not put fingers or objects through the grille, and do not take covers off.', 'safety',
      'insufficient_info', 'outdoor_cannot_observe'),
    ice_not_confirmed: r('More information needed', 'Do not open covers to look for ice', 'Ice was not confirmed from a safe view.',
      'Do not force a cabinet open to answer this.',
      ['If you can already see the lines without removing panels, look again from that safe view only.', 'If the home is still not cooling, or you cannot tell whether there is ice, call a licensed HVAC professional rather than opening equipment.'],
      'Do not remove panels or chip at anything to check for ice.', 'ice',
      'insufficient_info', 'ice_not_confirmed'),
    outdoor_listen_unsure: r('More information needed', 'Do not force a closer listen', 'Silent versus hum was not clear from a safe distance.',
      'Do not take covers off or put anything through the grille to decide.',
      ['Stay back. If you later can tell from a safe distance, start a new check.', 'If cooling is needed and you still cannot tell, call a licensed HVAC professional.'],
      'Do not open the electrical compartment to identify the sound.', 'safety',
      'insufficient_info', 'outdoor_listen_unsure'),
    tstat_batteries_unsure: r('More information needed', 'Do not open equipment to find out', 'The battery check needs a clearer answer.',
      'Do not pull the thermostat off the wall or open the furnace board to decide.',
      ['Use the thermostat manual to see whether the face is meant for homeowner battery access.', 'If you still cannot tell, call a licensed HVAC professional.'],
      'Do not pull thermostat wiring to test for power, and do not open the breaker panel.', 'safety',
      'insufficient_info', 'tstat_batteries_unsure'),
    unusual_noise_early: r('Stop / professional', 'Stop cooling if you safely can · call a pro', 'A new or concerning sound needs a professional.',
      'This check does not name a failed part from a sound. Screeching, grinding, or metal-on-metal means stop and call. An electrical buzz with heat or a burning smell belongs in the safety stop, not in more DIY.',
      ['If it is safe, set the system to Off at the thermostat and stay away from the fan and electrical covers.', 'Call a licensed HVAC professional. Tell them what you heard and whether the fan was moving.', 'If you also smell burning or see smoke or sparks, get to safety and call 911. Do not keep troubleshooting.'],
      'Do not open covers, spin the fan, or order a part from the sound alone.', 'safety',
      'call_pro', 'unusual_noise_early'),
    weak_airflow_after_filter: r('Professional guidance', 'Arrange HVAC service', 'Weak airflow with a clean filter needs a professional.',
      'A filter that already looks clean does not explain weak airflow. Further airflow checks are not part of this step.',
      ['Leave cooling Off if the system is running and airflow is weak.', 'Call a licensed HVAC professional. Tell them the filter looked clean or was recently replaced and the vents are still weak.'],
      'Do not remove the filter to test airflow, open the blower cabinet, or keep running cooling with no air moving.', 'maintenance',
      'call_pro', 'weak_airflow_after_filter'),
    filter_inaccessible: r('Professional guidance', 'Do not force the filter open', 'Skip a filter check you cannot do safely.',
      'This guide does not add panel-removal steps.',
      ['Leave the filter access alone.', 'Call a licensed HVAC professional and tell them you could not safely reach the filter.'],
      'Do not open sealed cabinets, reach into the blower, or remove panels you are unsure about.', 'maintenance',
      'call_pro', 'filter_inaccessible'),
    outdoor_inaccessible: r('Professional guidance', 'Do not force access', 'The outdoor unit cannot be reached safely.',
      'There is no DIY step that starts by forcing your way to the unit.',
      ['Call a licensed HVAC professional and tell them the outdoor unit is inaccessible.', 'Stay out of unsafe areas, including locked equipment yards, roofs, or anywhere you would need to climb.'],
      'Do not climb, remove covers, or reach through a grille.', 'safety',
      'call_pro', 'outdoor_inaccessible'),
    outdoor_silent_will_not_start: r('Professional guidance', 'Arrange HVAC service', 'The outdoor unit is silent while cool is calling.',
      'Basic visuals are exhausted, or they could not be done safely. A breaker that looks On and a disconnect that appears On, while the outdoor unit stays silent, is a professional visit. If you could not safely see either one, stop there.',
      ['Leave cooling Off if you can set that from a safe thermostat location.', 'Call a licensed HVAC professional. Tell them the outdoor unit is silent while the thermostat is calling for cool, and what you could see at the breaker door and the outdoor disconnect (On, Off, or not safely visible).', 'If the thermostat display is blank, you can start a new check and choose Blank thermostat for the battery step. Do not open the furnace board or the breaker interior.'],
      'Do not operate the disconnect. Do not open the panel interior, pull a fuse, or start capacitor work from this path.', 'electrical',
      'call_pro', 'outdoor_silent_will_not_start'),
    cooling_not_established_basics_clear: r('Professional guidance', 'Arrange HVAC service', 'Air may be moving, but cooling is not established.',
      'Mode, filter, and outdoor fan were in the checks you could do, and no ice was seen. That still does not prove the sealed system is working.',
      ['Set cooling to Off from a safe thermostat location if it keeps running without useful cooling.', 'Call a licensed HVAC professional. Report that the basic checks were done and you did not see ice.'],
      'Do not add refrigerant, attach gauges, or replace electrical parts from these symptoms.', 'refrigerant',
      'call_pro', 'cooling_not_established_basics_clear'),
    blank_tstat_after_batteries: r('Professional guidance', 'Arrange HVAC service', 'The display is still blank after batteries.',
      'That usually points to control power, a C-wire, the transformer, or the thermostat itself. Those are not Basic battery steps.',
      ['Leave wiring and the furnace or air-handler board alone.', 'Call a licensed HVAC professional and tell them the display stayed blank after fresh batteries, or that there was no battery compartment.'],
      'Do not open the control board, pull thermostat wires, or work inside the breaker panel.', 'safety',
      'call_pro', 'blank_tstat_after_batteries'),
    blank_tstat_hardwired_power: r('Professional guidance', 'Arrange HVAC service', 'A hardwired blank display is a professional path.',
      'Power from the system (C-wire / common), the transformer, or the thermostat can look the same from the screen. This beta does not open that equipment.',
      ['Do not open the furnace or air-handler control board.', 'Call a licensed HVAC professional and tell them the thermostat is hardwired, or has no batteries, and the display is blank.'],
      'Do not pull thermostat wiring from the wall to test for power, and do not work inside the breaker panel.', 'electrical',
      'call_pro', 'blank_tstat_hardwired_power'),
    tstat_inaccessible: r('Professional guidance', 'Do not force the thermostat face off', 'Battery access is not clear enough to do safely.',
      'If you are unsure the face is meant to come off, stop.',
      ['Leave the thermostat on the wall.', 'Call a licensed HVAC professional and tell them the display is blank and you could not safely reach the batteries.'],
      'Do not pry the thermostat off, and do not expose wiring to check.', 'safety',
      'call_pro', 'tstat_inaccessible'),
    suspected_capacitor_contactor_advanced_off: r('Professional guidance', 'Call a licensed HVAC professional', 'Suspected start components — not a homeowner repair in this beta.',
      'A hum or buzz at the outdoor unit while the fan is not spinning is a common reason a technician checks the outdoor contactor and capacitor. This is not a confirmed parts diagnosis. Advanced DIY is off, so this guide will not walk through capacitor or contactor work.',
      ['Leave the system in a safe state. Off at the thermostat is enough. Shut a disconnect or breaker only if you already know how and the area is dry and safe.', 'Call a licensed HVAC technician.', 'You may tell them: the outdoor unit hummed or showed start symptoms while the condenser fan was not spinning, and you did not remove covers.'],
      'Do not discharge or replace a capacitor, replace a contactor, or do any cover-off electrical work from this guide.', 'safety',
      'call_pro', 'suspected_capacitor_contactor_advanced_off', { diyTier: 'pro_only' }),
    professional: r('Professional guidance', 'Arrange HVAC service', 'You have enough to stop and call.',
      'Stop / get help ends the DIY path. The answers so far do not establish a failed part.',
      ['Use the note below to explain what you actually observed.', 'If operation is abnormal and it is safe to do so, leave cooling Off. Get urgent help for any new hazard.'],
      'Do not buy parts on a guess, open electrical covers, bypass a safety, or handle refrigerant.', 'safety',
      'call_pro', 'stop_cleared_no_hazard'),
    mode_setpoint_basic: r('Basic homeowner check', 'Adjust the thermostat, then retest', 'Set Cool and a lower setpoint.',
      'The mode was not Cool, or the setpoint was at or above the room temperature. Fix that before any other check.',
      ['Set the system mode to Cool (not Heat, Off, or Emergency Heat).', 'Lower the setpoint several degrees below the room temperature. Fan Auto or On is fine.', 'Wait and retest, often 10–15 minutes. If it still does not cool with mode and setpoint correct, start a new check and continue from the filter.'],
      'Do not pull the thermostat off the wall or change wiring.', 'maintenance',
      'next_step', 'mode_setpoint_basic', { diyTier: 'basic' }),
    filter_replace_basic: r('Basic homeowner check', 'Replace the filter, then retest', 'The filter looks dirty or clogged.',
      'Use the correct size and type. This is a Basic homeowner step, not an electrical repair.',
      ['Replace the filter with the correct size and type. Follow the arrow for airflow direction.', 'Set the system to Cool and retest after 15–30 minutes.', 'If weak airflow or no cooling remains after a clean, new filter, call a licensed HVAC professional. Do not move on to electrical parts.'],
      'Do not run the system for long with no filter, and do not open sealed electrical compartments.', 'maintenance',
      'next_step', 'filter_dirty_clogged', { diyTier: 'basic' }),
    filter_missing_basic: r('Basic homeowner check', 'Install the correct filter', 'No filter is installed.',
      'Running a long time without a filter is not a fix.',
      ['Install a correctly sized filter.', 'Do not run the system long-term without a filter.', 'Retest cooling and airflow after the filter is in place.'],
      'Do not guess a size, stack filters, or open sealed cabinets to force a fit.', 'maintenance',
      'next_step', 'filter_missing', { diyTier: 'basic' }),
    ice_thaw_basic: r('Basic homeowner check', 'Turn the system Off and let the ice thaw', 'Ice or heavy frost needs a thaw, not a harder run.',
      'Melting the ice is not a repair of the cause. If ice comes back, or the home still does not cool, that is a professional visit (metering, refrigerant, and deeper airflow stay with a licensed tech).',
      ['Set the thermostat to Off. Raising the setpoint is not enough.', 'Let the ice thaw naturally. Do not chip it. Keep people clear of meltwater and electrical equipment.', 'If you have not already checked the filter, check or replace it when you can do that safely.', 'After a full thaw (often hours), set Cool again and retest. If ice returns, or the home still does not cool, call a licensed HVAC professional.'],
      'Do not keep the system running to force cooling, apply heat, or open refrigerant lines.', 'ice',
      'next_step', 'ice_thaw_basic', { diyTier: 'basic' }),
    batteries_display_back: r('Basic homeowner check', 'Display is back · retest cooling', 'Fresh batteries brought the display back.',
      'That does not by itself prove the rest of the system is fine.',
      ['Confirm mode is Cool and the setpoint is below the room temperature.', 'Wait and retest.', 'If the system still will not cool or start, start a new check and choose Not cooling or Will not start.'],
      'Do not open the furnace or air-handler control board, and do not pull thermostat wires.', 'maintenance',
      'next_step', 'batteries_display_back', { diyTier: 'basic' }),
    returns_supplies_cleared: r('Basic homeowner check', 'Keep the returns and supplies clear', 'A blocked return or supply was cleared and airflow improved.',
      'Leave the system on Cool and retest comfort. If weak airflow comes back, that is a professional visit — not duct work from this guide.',
      ['Leave returns and supply registers clear of furniture, rugs, and closed vents that should be open.', 'Stay on Cool and retest after 15–30 minutes.', 'If airflow gets weak again, call a licensed HVAC professional.'],
      'Do not cut ducts, open a chase, or remove the blower panel.', 'maintenance',
      'next_step', 'returns_supplies_cleared', { diyTier: 'basic' }),
    breaker_reset_basic: r('Basic homeowner check', 'Reset only the known outdoor/AC breaker', 'The outdoor/AC breaker looks tripped or Off.',
      'Reset it only if the floor and your hands are dry and you are certain which breaker feeds the outdoor unit. If the outdoor unit is still silent afterward, the next look is the outdoor disconnect position — visual only.',
      ['On a dry floor with dry hands, move that standard toggle fully Off, then fully On.', 'Set Cool with the setpoint below the room temperature and see whether the outdoor unit starts.', 'If it is still silent, continue to the outdoor disconnect visual. That step only asks what position you can already see. It does not tell you to flip the lever.', 'If you are not sure which breaker, or the reset feels unsafe, stop and call a licensed HVAC professional or electrician.'],
      'Do not remove the deadfront, touch terminals, or reset a breaker you cannot identify.', 'electrical',
      'next_step', 'breaker_reset_basic', { diyTier: 'basic', continueTo: 'ac.cool.power.disconnect_visual' }),
    debris_reach_in_basic: r('Basic homeowner check', 'Shut the system off before you reach past the grille', 'Debris is packed past the grille.',
      'Do not reach through the grille while the outdoor unit can run. Deep coil-fin combing is not part of this check.',
      ['Set the thermostat to Off.', 'Kill outdoor power only if you already know a safe, dry way and can verify Off. If you cannot, stop and call a licensed HVAC professional instead of reaching in.', 'Clear only what you can reach without forcing the coil. Then restore Cool and retest.', 'If the home still does not cool, the next observation is ice on the lines or coil, or a call to a licensed HVAC professional.'],
      'Do not put hands or tools through the grille while power is on, and do not comb fins deep into the coil.', 'maintenance',
      'next_step', 'debris_reach_in_basic', { diyTier: 'basic' }),
    weak_airflow_after_returns_supplies: r('Professional guidance', 'Arrange HVAC service', 'Airflow is still weak after the simple blockers were checked.',
      'Furniture, rugs, closed vents, and a clean filter do not explain it. Duct changes and blower-cabinet work are not part of this step.',
      ['Leave returns and supplies as they are. Do not start duct work.', 'Call a licensed HVAC professional. Tell them the filter looked clean and returns or supplies were checked for furniture, rugs, and closed vents.'],
      'Do not cut ducts, open a chase, or run the system for long with almost no air moving.', 'maintenance',
      'call_pro', 'weak_airflow_after_returns_supplies'),
    airflow_check_inaccessible: r('Professional guidance', 'Do not force the vents', 'Returns or supplies could not be checked safely.',
      'There is no step here that starts by forcing access.',
      ['Leave the grilles alone.', 'Call a licensed HVAC professional and tell them airflow is weak and you could not safely check the returns and supplies.'],
      'Do not pull registers into a chase or open the blower cabinet.', 'maintenance',
      'call_pro', 'airflow_check_inaccessible'),
    duct_work_rejected_not_basic: r('Professional guidance', 'Duct and blower work stays with a professional', 'Cutting ducts, opening a chase, or reaching the blower is not a Basic step.',
      'This guide stops at furniture, rugs, and registers you can already reach.',
      ['Do not cut or seal ducts from this result.', 'Call a licensed HVAC professional and describe the weak airflow.'],
      'Do not open the blower cabinet or modify ductwork.', 'maintenance',
      'call_pro', 'duct_work_rejected_not_basic'),
    cannot_identify_ac_breaker: r('Professional guidance', 'Do not guess the breaker', 'The outdoor/AC breaker is not identified.',
      'Resetting the wrong breaker does not make a silent outdoor unit safe to keep testing.',
      ['Close the panel door. Do not remove the deadfront.', 'Call a licensed HVAC professional or electrician. Tell them the outdoor unit is silent while Cool is calling and you could not tell which breaker feeds it.'],
      'Do not flip breakers to see what happens, and do not open the panel interior.', 'electrical',
      'call_pro', 'cannot_identify_ac_breaker'),
    breaker_unsafe_stop: r('Stop / professional', 'Stay clear of the panel', 'The breaker check is not safe to continue.',
      'Wet hands, a wet floor, flooding, a damaged panel, or a door you cannot open safely all end this step. If water is at the panel, do not touch it.',
      ['Move to a dry place and keep other people away from the panel.', 'If you see sparks or smoke, or you cannot get clear, call 911 from safety.', 'Otherwise call a licensed electrician or HVAC professional. Do not reset anything first.'],
      'Do not stand on a wet floor and operate the panel, and do not remove the cover.', 'electrical',
      'call_pro', 'cannot_kill_power', { gate: 'cannot_kill_power' }),
    panel_interior_rejected: r('Professional guidance', 'The panel interior is not a homeowner step', 'Removing the deadfront is not part of this guide.',
      'Bus bars and the inside of the panel stay with a licensed electrician.',
      ['Leave the deadfront on. Close the door if it is open and safe to close.', 'Call a licensed electrician or HVAC professional.'],
      'Do not remove the deadfront, probe the panel, or touch terminals.', 'electrical',
      'call_pro', 'panel_interior_rejected', { gate: 'high_voltage_intent' }),
    outdoor_disconnect_appears_off: r('Professional guidance', 'The disconnect appears Off — do not operate it', 'From safe ground, the outdoor disconnect looks Off. That can explain a silent outdoor unit.',
      'This guide does not tell you to flip the lever, open the door, or pull a fuse. A licensed person restores that safely and continues the diagnosis.',
      ['Stay back from the box. Leave the handle as you found it.', 'Call a licensed HVAC professional or electrician. Tell them the outdoor unit is silent while Cool is calling and the disconnect appeared Off from a visual look only.'],
      'Do not flip the lever, open the disconnect door, or pull a fuse block.', 'electrical',
      'call_pro', 'outdoor_disconnect_appears_off'),
    disconnect_visual_inaccessible: r('Professional guidance', 'Do not force a closer look', 'Off/On on the outdoor disconnect could not be seen safely from dry ground.',
      'There is no step that starts by moving closer through a wet, damaged, or blocked approach.',
      ['Stay back.', 'Call a licensed HVAC professional and tell them the outdoor unit is silent and you could not safely see the disconnect position.'],
      'Do not open the door or operate the lever to get an answer.', 'safety',
      'call_pro', 'disconnect_visual_inaccessible'),
    disconnect_operate_not_basic: r('Professional guidance', 'Operating the disconnect is not a Basic step', 'This check only records the position you can already see.',
      'Flipping the exterior lever, opening the door, and pulling a fuse are not instructions in this guide.',
      ['Leave the disconnect as you found it.', 'Call a licensed HVAC professional or electrician and tell them what you could see without operating it.'],
      'Do not flip, pull, or open the disconnect from this result.', 'electrical',
      'call_pro', 'disconnect_operate_not_basic', { gate: 'disconnect_operate_not_basic' }),
    disconnect_open_or_fused: r('Professional guidance', 'Open-door and fused disconnects stay with a professional', 'A fused pull-out, an open door, or a look inside the disconnect is not a Basic step.',
      'That work is high-voltage equipment access. This guide stops.',
      ['Leave the door closed and the pull-out where it is.', 'Call a licensed HVAC professional or electrician.'],
      'Do not open the door, pull the fuse block, or touch lugs and whip wires.', 'electrical',
      'call_pro', 'high_voltage_intent', { gate: 'high_voltage_intent' }),
    disconnect_unsafe_approach: r('Stop / professional', 'Stay back from the disconnect', 'The outdoor disconnect is wet, damaged, buzzing, or unsafe to approach.',
      'Do not move closer to decide On or Off.',
      ['Keep people away. Do not touch the box.', 'If it is sparking, smoking, or you cannot get clear, call 911 from safety.', 'Otherwise call a licensed HVAC professional or electrician and describe what you already saw.'],
      'Do not operate the lever or open the door.', 'electrical',
      'emergency_exit', 'wet_hands_flood', { gate: 'wet_hands_flood' }),
    advanced_not_from_basic_hub: r('Professional guidance', 'Cover-off work does not start on the silent path', 'The silent-outdoor check does not open a capacitor or contactor repair.',
      'Capacitor work, when it is offered at all, starts only after a hum with the fan not spinning — and only from that later screen. It is not offered from breaker or disconnect visuals.',
      ['Leave covers on.', 'Call a licensed HVAC professional. Tell them the outdoor unit is silent while Cool is calling and you did not remove covers.'],
      'Do not remove an electrical cover from this result.', 'electrical',
      'call_pro', 'high_voltage_intent', { gate: 'high_voltage_intent' }),
    noise_burning_sparks_smoke: r('Emergency', 'Move away · call from safety', 'Burning, sparks, smoke, or fire is not a noise diagnosis.',
      'Stop troubleshooting. Do not stay at the equipment to listen again.',
      ['Get people away from the equipment. If smoke or fire continues, leave and call 911 from safety.', 'Shut power only if you can do it from a dry, safe place you already know. If you cannot, do not go back to try.', 'After the hazard is handled, a licensed HVAC professional can inspect the equipment. Do not restart it to hear the noise again.'],
      'Do not keep the system running, open covers, or keep diagnosing the sound.', 'fire',
      'emergency_exit', 'burning_smell', { gate: 'burning_smell' }),
    grinding_metal_noise: r('Stop / professional', 'Turn it Off if you safely can · call a pro', 'Grinding metal-on-metal needs a professional.',
      'Do not keep it running to hear the sound more clearly, and do not take a cover off to find the part.',
      ['If it is safe, set the thermostat to Off and stay away from the fan and electrical covers.', 'Call a licensed HVAC professional. Tell them you heard grinding metal-on-metal and whether the fan was moving.', 'If sparks, smoke, or a burning smell show up with the grind, get to safety and call 911.'],
      'Do not open covers, spin the fan by hand, or order a part from the sound.', 'safety',
      'call_pro', 'grinding_metal_noise', { gate: 'grinding_metal_noise' }),
    unusual_noise_unresolved: r('Professional guidance', 'This noise is not a homeowner parts path', 'The sound is not the outdoor hum with Cool calling and the fan stopped.',
      'Indoor noise, rattles, screeches, outdoor noise while the fan spins, and sounds you cannot place all stop here. This check does not name a failed part from a sound.',
      ['If it is safe, set the system to Off.', 'Call a licensed HVAC professional. Describe what you heard and whether the outdoor fan was spinning.', 'If you later smell burning or see smoke or sparks, get to safety and call 911. Do not return to this check.'],
      'Do not open covers or buy a part from the noise alone.', 'safety',
      'call_pro', 'unusual_noise_unresolved'),
    debris_wet_electrical: r('Stop / professional', 'Stay back from the outdoor unit', 'Wet conditions or an electrical concern outdoors ends the debris check.',
      'Do not keep clearing debris through water or near damaged wiring.',
      ['Move to a dry place and keep other people away.', 'If you see sparks or smoke, or you cannot get clear, call 911 from safety.', 'Otherwise call a licensed HVAC professional or electrician.'],
      'Do not touch the unit, the disconnect, or standing water.', 'electrical',
      'emergency_exit', 'water_near_electrical', { gate: 'water_near_electrical' }),
    coil_service_pro_only: r('Professional guidance', 'Deep coil work is not a Basic step', 'Combing fins deep into the coil, or a chemical coil clean, is not part of this guide.',
      'Exterior leaves and clearance are the limit of this check.',
      ['Leave the coil alone.', 'Call a licensed HVAC professional if the outdoor coil needs service.'],
      'Do not comb deep into the coil or open the cabinet for a chemical wash.', 'maintenance',
      'call_pro', 'coil_service_pro_only'),
    cannot_kill_power: r('Professional guidance', 'Stop — power cannot be verified Off', 'Any step that needs power Off waits until someone can kill power and verify Off safely.',
      'Do not open a compartment, touch a capacitor, or keep going on a guess.',
      ['Leave covers on and leave the equipment alone.', 'Call a licensed HVAC professional or electrician. Tell them you could not safely kill power or verify Off.'],
      'Do not open electrical covers or touch capacitor terminals.', 'electrical',
      'call_pro', 'cannot_kill_power', { gate: 'cannot_kill_power' }),
    wet_hands_flood_stop: r('Stop / professional', 'Get to dry ground', 'Wet hands, flooding, or rain at the equipment is a reason to stop.',
      'Do not touch switches, the disconnect, or the cabinet.',
      ['Move to a dry place. Keep other people away from standing water and the equipment.', 'If there is sparking, smoke, or you cannot get clear, call 911 from safety.', 'Otherwise call a licensed HVAC professional or electrician.'],
      'Do not keep the repair going with wet hands or in a flooded area.', 'electrical',
      'emergency_exit', 'wet_hands_flood', { gate: 'wet_hands_flood' }),
    adv_hazard_active: r('Emergency', 'Move away · call from safety', 'Burning, smoke, sparks, gas, or an active flood ends this path.',
      'Do not open covers or continue a capacitor repair.',
      ['Get people away. For smoke, fire, sparks, or a gas smell, call 911 from a safe place.', 'Shut power only if you can do it from a dry, safe location you already know.', 'Do not restart the equipment until a qualified person has cleared it.'],
      'Do not keep troubleshooting through the hazard.', 'fire',
      'emergency_exit', 'burning_smell', { gate: 'burning_smell' }),
    user_elected_call_pro_advanced_abort: r('Professional guidance', 'Call a licensed HVAC professional', 'You chose to stop the capacitor path.',
      'That is a complete stop. Leave the equipment safe: power Off if you already killed it, covers on if you can do that without further electrical work.',
      ['Leave power Off if the compartment was opened or power was killed.', 'If covers are off and you cannot put them back safely, leave power Off and tell the technician.', 'Call a licensed HVAC technician and describe how far you got. This was not a confirmed parts diagnosis.'],
      'Do not energize the unit with covers off, and do not replace the contactor on your own.', 'safety',
      'call_pro', 'user_elected_call_pro_advanced_abort'),
    cap_pattern_not_confirmed: r('Professional guidance', 'Do not open covers', 'The Cool-calling hum with the fan stopped was not confirmed.',
      'Without that pattern, this guide does not open the electrical compartment.',
      ['Stay back. Leave covers on.', 'Call a licensed HVAC professional and describe what you actually heard and saw.', 'A later check can repeat the safe-distance listen. It still does not start with covers off.'],
      'Do not remove the electrical cover to hunt for the sound.', 'safety',
      'call_pro', 'cap_pattern_not_confirmed'),
    still_live_symptoms_after_off: r('Professional guidance', 'Do not open the compartment', 'The outdoor unit still hummed or spun after it was set Off.',
      'That means it is not verified dead. Covers stay on.',
      ['Stay clear. Do not open the electrical compartment.', 'Call a licensed HVAC professional or electrician and tell them the unit still hummed or spun after Off.'],
      'Do not treat it as safe to open because the thermostat says Off.', 'electrical',
      'call_pro', 'still_live_symptoms_after_off', { gate: 'still_live_symptoms_after_off' }),
    capacitor_discharge_unsure: r('Professional guidance', 'Stop — do not improvise a discharge', 'The capacitor can still hold a charge. Unsure means stop.',
      'This guide does not fill in a wait time, a resistor value, or another method. “Off long enough” is not discharged.',
      ['Leave power Off if you already killed it. Do not touch the terminals.', 'Call a licensed HVAC professional and tell them the capacitor was not discharged because the method was not clear.'],
      'Do not short the terminals with a screwdriver, wire, pliers, or any bare metal, and do not invent a wait and continue.', 'electrical',
      'call_pro', 'capacitor_discharge_unsure', { gate: 'capacitor_discharge_unsure' }),
    capacitor_discharge_forbidden_method: r('Professional guidance', 'Do not short the capacitor', 'Shorting the terminals with a screwdriver or bare metal is not a step in this guide.',
      'Stop. Leave power Off. A charged capacitor can injure you.',
      ['Do not touch the terminals.', 'Leave power Off and the cover situation as safe as you can without further electrical work.', 'Call a licensed HVAC professional.'],
      'Do not short the terminals with a screwdriver, pliers, wire, coin, or any bare conductor.', 'electrical',
      'call_pro', 'capacitor_discharge_forbidden_method', { gate: 'capacitor_discharge_unsure' }),
    capacitor_label_unknown: r('Professional guidance', 'Do not guess the capacitor', 'The label could not be read, or this is not a standard dual-run capacitor you can match.',
      'There is no “close enough” value in this guide.',
      ['Leave power Off. Do not touch the terminals.', 'Write down only what you could actually read, if anything.', 'Call a licensed HVAC professional and bring that note. Do not buy a capacitor on a guess.'],
      'Do not guess microfarads or install a capacitor because the shape looks similar.', 'electrical',
      'call_pro', 'capacitor_label_unknown'),
    premature_terminal_contact: r('Professional guidance', 'Stop — terminals were touched before discharge', 'Touching capacitor terminals or leads before discharge makes this path unsafe to continue.',
      'Treat the capacitor as still charged and the discharge as uncertain. Do not go on to replacement.',
      ['Stop touching the terminals. Leave power Off.', 'Call a licensed HVAC professional and tell them terminals were touched before a verified discharge.'],
      'Do not continue the replacement, and do not short the terminals to “finish” the discharge.', 'electrical',
      'call_pro', 'premature_terminal_contact', { gate: 'capacitor_discharge_unsure' }),
    high_voltage_intent: r('Professional guidance', 'That access is not part of this path', 'Defeating an interlock, or other unsafe high-voltage access, stops the guide.',
      'Leave the equipment alone and call a licensed professional.',
      ['Do not bypass an interlock or force a cover.', 'Leave power Off if you already killed it.', 'Call a licensed HVAC professional or electrician.'],
      'Do not defeat safeties or work inside equipment that will not open on the normal homeowner path.', 'electrical',
      'call_pro', 'high_voltage_intent', { gate: 'high_voltage_intent' }),
    compartment_inaccessible: r('Professional guidance', 'Do not force the compartment', 'The outdoor electrical compartment could not be opened safely.',
      'Leave power Off if you already killed it.',
      ['Stop. Do not pry the panel or defeat an interlock.', 'Call a licensed HVAC professional.'],
      'Do not force the cover off.', 'safety',
      'call_pro', 'compartment_inaccessible'),
    compartment_damage_water: r('Stop / professional', 'Leave power Off', 'Burn marks, melted wiring, or water inside the compartment ends this repair.',
      'Do not keep identifying parts.',
      ['Leave power Off. Do not touch the damaged parts.', 'If you see active smoke, sparks, or you cannot get clear, call 911 from safety.', 'Otherwise call a licensed HVAC professional or electrician and describe the damage. Tell them power was left Off.'],
      'Do not energize a damaged compartment.', 'electrical',
      'emergency_exit', 'burning_smell', { gate: 'burning_smell' }),
    discharge_spark_shock_smoke: r('Emergency', 'Stop · get help', 'A spark, shock, or smoke during discharge is an emergency stop.',
      'Do not try the discharge again.',
      ['Stop contact with the equipment. Kill power if you can do that from a dry, safe place.', 'If you are injured, or smoke or sparks continue, call 911 from safety.', 'Do not restore power. A licensed HVAC professional or electrician has to take it from here.'],
      'Do not keep discharging, short the terminals, or turn power back on.', 'electrical',
      'emergency_exit', 'sparking', { gate: 'sparking' }),
    capacitor_mismatch_do_not_proceed: r('Professional guidance', 'Do not install a mismatched capacitor', 'The microfarad value, VAC rating, or terminals do not match the label you recorded.',
      'Leave the replacement uninstalled if it does not match. Leave power Off.',
      ['Do not force the leads onto different terminals to make it fit.', 'Call a licensed HVAC professional. Share the label values you wrote down and what the replacement shows.'],
      'Do not energize a mismatched capacitor, and do not replace the contactor to compensate.', 'electrical',
      'call_pro', 'capacitor_mismatch_do_not_proceed', { gate: 'capacitor_mismatch_do_not_proceed' }),
    contactor_not_in_advanced_cap_path: r('Professional guidance', 'The contactor is not replaced on this path', 'This path is the run/dual capacitor only.',
      'Contactor inspection or replacement is a different job and is not included here.',
      ['Stop. Leave power Off if the compartment is open.', 'Put covers back on only if you can do that safely without further wiring work. If you cannot, leave power Off.', 'Call a licensed HVAC professional and tell them the contactor was not replaced.'],
      'Do not replace the contactor from this guide.', 'electrical',
      'call_pro', 'contactor_not_in_advanced_cap_path', { gate: 'contactor_not_in_advanced_cap_path' }),
    hum_no_start_after_cap_replace: r('Professional guidance', 'Kill power if safe · call a pro', 'After the replacement, the outdoor unit hummed and did not start.',
      'That is not a cue to try another part. Shut it down and hand it to a professional.',
      ['Kill power if you can do that safely, then leave it Off.', 'Call a licensed HVAC professional. Tell them a like-for-like capacitor was installed, covers were on before power was restored, and the unit then hummed without starting.'],
      'Do not leave it humming, open the compartment while it is energized, or replace the contactor next.', 'electrical',
      'call_pro', 'hum_no_start_after_cap_replace'),
    cannot_reassemble_leave_power_off: r('Professional guidance', 'Leave power Off', 'The covers cannot go back on securely, so power stays Off.',
      'Do not restore power with a cover off or loose.',
      ['Leave the disconnect Off.', 'Keep people away from the open compartment.', 'Call a licensed HVAC professional and tell them the cover is not secure and power was left Off.'],
      'Do not turn the disconnect On with covers off.', 'electrical',
      'call_pro', 'cannot_reassemble_leave_power_off'),
    restore_abnormal_smell_spark: r('Emergency', 'Kill power if safe · get help', 'An abnormal smell or a spark after power was restored is an emergency stop.',
      'Do not keep the Cool test running.',
      ['Kill power if you can do that from a dry, safe place. If covers were on, leave them on while you shut power down.', 'If smoke or sparks continue, or someone is hurt, call 911 from safety.', 'Do not open the compartment while it may still be energized. Call a licensed HVAC professional or electrician after you are safe.'],
      'Do not ignore the smell and leave the system calling for cool.', 'electrical',
      'emergency_exit', 'burning_smell', { gate: 'burning_smell' }),
    next_step_advanced: r('Advanced DIY', 'Brief test looked normal', 'Covers were on before power was restored, and the short Cool test looked normal.',
      'Covers were on before power was restored. That does not certify the repair. If cooling fails, noise returns, or anything smells or sparks, stop and call a professional.',
      ['Leave the covers on.', 'Let the system run on Cool only as a normal call for cooling, and see whether comfort holds.', 'If the outdoor unit hums and does not start, or you smell something burning or see a spark, kill power if safe and call a licensed HVAC professional.'],
      'Do not run it with covers off, and do not replace the contactor because the first test looked fine.', 'electrical',
      'next_step', 'next_step_advanced', { diyTier: 'advanced' })
  };

  function advancedEnabled() {
    const cfg = typeof globalThis !== 'undefined' ? globalThis.SW_CONFIG : null;
    return !!(cfg && cfg.advancedRepairsEnabled === true);
  }
  function targetsOf(next) {
    if (next && typeof next === 'object') {
      const found = [];
      if (Object.prototype.hasOwnProperty.call(next, 'default')) found.push(next.default);
      if (Object.prototype.hasOwnProperty.call(next, 'whenAdvanced')) found.push(next.whenAdvanced);
      Object.keys(next.byLanding || {}).forEach(k => found.push(next.byLanding[k]));
      return found;
    }
    return [next];
  }
  function targetsForFlag(next, flag) {
    if (next && typeof next === 'object') {
      if (Object.prototype.hasOwnProperty.call(next, 'whenAdvanced')) return [flag ? next.whenAdvanced : next.default];
      return [next.default].concat(Object.keys(next.byLanding || {}).map(k => next.byLanding[k]));
    }
    return [next];
  }
  function reachable(flag) {
    const seen = new Set();
    const queue = [ENTRY];
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      const node = nodes[id];
      if (!node) continue;
      node.options.forEach(op => {
        targetsForFlag(op.next, flag).forEach(target => {
          if (!target || typeof target !== 'string') return;
          if (target.charAt(0) === '@') seen.add(target);
          else queue.push(target);
        });
      });
    }
    return seen;
  }
  function assertGraph() {
    const outcomes = ['next_step', 'call_pro', 'emergency_exit', 'insufficient_info'];
    WAVE1.forEach(id => { if (!nodes[id]) throw new Error('Missing Wave-1 node ' + id); });
    WAVE2.forEach(id => { if (!nodes[id]) throw new Error('Missing Wave-2 node ' + id); });
    ADVANCED.forEach(id => {
      if (!nodes[id]) throw new Error('Missing Advanced node ' + id);
      if (nodes[id].diyTier !== 'advanced') throw new Error('Advanced node tier drift ' + id);
    });
    Object.keys(results).forEach(id => {
      const res = results[id];
      if (outcomes.indexOf(res.outcome) === -1) throw new Error('Bad outcome on ' + id);
      if (res.outcome === 'next_step' && res.diyTier !== 'basic' && res.diyTier !== 'advanced') {
        throw new Error('Next step missing DIY tier: ' + id);
      }
      if (res.diyTier === 'advanced' && res.outcome !== 'next_step') throw new Error('Advanced tier on non-next_step ' + id);
    });
    if (results.next_step_advanced.diyTier !== 'advanced' || results.next_step_advanced.outcome !== 'next_step') {
      throw new Error('Advanced success terminal drifted');
    }
    Object.keys(nodes).forEach(id => {
      nodes[id].options.forEach(op => {
        targetsOf(op.next).forEach(target => {
          if (!target || typeof target !== 'string') throw new Error('Bad edge from ' + id + '/' + op.id);
          if (target.charAt(0) === '@') {
            if (!results[target.slice(1)]) throw new Error('Missing result ' + target + ' from ' + id);
          } else if (!nodes[target]) throw new Error('Missing node ' + target + ' from ' + id);
        });
      });
    });
    const off = reachable(false);
    ADVANCED.forEach(id => { if (off.has(id)) throw new Error('Advanced node reachable with flag off: ' + id); });
    off.forEach(id => {
      if (id.charAt(0) !== '@') return;
      const res = results[id.slice(1)];
      if (res && (res.diyTier === 'advanced' || (res.outcome === 'next_step' && res.diyTier !== 'basic'))) {
        throw new Error('Advanced terminal reachable with flag off: ' + id);
      }
    });
    const on = reachable(true);
    if (!on.has('ac.adv.cap.prereq_gate_cluster') || !on.has('@next_step_advanced')) {
      throw new Error('Advanced chain not reachable with flag on');
    }
    const disconnect = nodes['ac.cool.power.disconnect_visual'];
    const disconnectText = disconnect.body + '\n' + disconnect.options.map(op => op.label + ' ' + op.hint).join('\n');
    if (!/does not tell you to/i.test(disconnectText) || !/flip the exterior lever/i.test(disconnect.body)) {
      throw new Error('Disconnect visual lock missing');
    }
    if (/\b(flip|turn|pull) the (lever|handle|disconnect)\b/i.test(disconnect.options.map(op => op.hint).join('\n'))) {
      throw new Error('Disconnect choice hints must not instruct operating the lever');
    }
    const discharge = nodes['ac.adv.cap.discharge'];
    if (!/Never/i.test(discharge.body) || !/screwdriver/i.test(discharge.body) || !/bare conductor/i.test(discharge.body)) {
      throw new Error('Discharge never-short lock missing');
    }
    if (discharge.options.some(op => /short (it|the|terminals)/i.test(op.hint) && !/not in this guide|stop/i.test(op.hint + op.label))) {
      throw new Error('Discharge option instructs a short');
    }
    const identify = nodes['ac.adv.cap.identify_label'];
    if (!/Do not touch capacitor terminals/i.test(identify.body)) throw new Error('Terminal-touch ban missing');
    const restore = nodes['ac.adv.cap.reassemble_restore_test'];
    if (!/must be on before you restore power/i.test(restore.body)) throw new Error('Covers-on lock missing');
    const replace = nodes['ac.adv.cap.replace_like_for_like'];
    if (!/Do not replace the contactor/i.test(replace.body)) throw new Error('Contactor exclusion missing');
  }
  assertGraph();

  function create(seed = '', mode = 'real') {
    const state = {
      node: ENTRY, result: null, seed, mode, stopping: false, safetyCleared: false,
      consent: false, consentAt: null, termsVersion: null, telemetry: false,
      answers: [], startedAt: Date.now(), id: uuid(), landing: null,
      preselectChoice: null, treeVersion: TREE_VERSION, audit: []
    };
    pushAudit(state, 'node_entered:' + ENTRY);
    return state;
  }
  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'sw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }
  function pushAudit(state, event) {
    state.audit.push({ event, at: new Date().toISOString(), tree: state.treeVersion });
  }
  function resolveTarget(option, state) {
    const next = option.next;
    if (next && typeof next === 'object') {
      if (Object.prototype.hasOwnProperty.call(next, 'whenAdvanced')) {
        return advancedEnabled() ? next.whenAdvanced : next.default;
      }
      const landing = state.landing || '';
      if (next.byLanding && next.byLanding[landing]) return next.byLanding[landing];
      return next.default;
    }
    return next;
  }
  function breakerVisualPassed(state) {
    return state.answers.some(a => a.node === 'ac.cool.power.breaker_visual' &&
      (a.choice === 'breaker_on_confirmed' || a.choice === 'breaker_reset_ok_still_silent'));
  }
  function concludeBody(on) {
    if (!on) return nodes[CONCLUDE].body;
    return 'Based on your answers (outdoor hum or buzz while the fan is not spinning, or the same start evidence while cool is calling), a common professional check is the outdoor contactor and/or capacitor.\n\nYou can call a licensed HVAC technician and stop here. This copy can also offer a gated Advanced path for a like-for-like outdoor run/dual capacitor only. The contactor is not replaced on that path.\n\nAdvanced work stops unless every gate passes: kill power and verify Off, no terminal contact before discharge, discharge only by the manufacturer method or a proper insulated bleed tool (never a screwdriver or bare-metal short), and covers on before power is restored. Unsure means stop.\n\nThis is not a confirmed parts diagnosis.';
  }
  function viewNode(id) {
    const node = nodes[id];
    if (!node) return null;
    if (id !== CONCLUDE) return node;
    const on = advancedEnabled();
    return {
      section: node.section,
      title: node.title,
      body: concludeBody(on),
      caution: on ? 'Call-pro stays available. The gated path does not include the contactor.' : node.caution,
      diyTier: node.diyTier,
      safetyGate: node.safetyGate,
      options: node.options.map(op => {
        if (op.id !== 'want_diy_capacitor_anyway') return op;
        return Object.assign({}, op, {
          hint: on
            ? 'Gated capacitor path only. Lockout, discharge, and covers-on rules apply. You can still stop and call a pro.'
            : op.hint
        });
      })
    };
  }
  function answer(state, choice, meta = {}) {
    if (!state || state.result || !nodes[state.node]) throw new Error('This check has ended or is invalid.');
    if (nodes[state.node].diyTier === 'advanced' && !advancedEnabled()) {
      throw new Error('Advanced DIY is not available in this beta.');
    }
    const nodeId = state.node;
    const node = nodes[nodeId];
    const option = node.options.find(x => x.id === choice);
    if (!option) throw new Error('Choose an answer shown on the current screen.');
    if (nodeId !== ENTRY && nodeId !== CONSENT && (!state.safetyCleared || !state.consent)) {
      throw new Error('Safety and consent are required before troubleshooting.');
    }
    if (nodeId === CONSENT && choice === 'agree_18_terms') {
      if (!state.safetyCleared || meta.agreed !== true || !meta.termsVersion) throw new Error('Please read and accept the beta terms to continue.');
      state.consent = true;
      state.consentAt = new Date().toISOString();
      state.termsVersion = String(meta.termsVersion);
      state.telemetry = false;
    }
    if (nodeId === ENTRY) state.safetyCleared = choice === 'none_of_these';
    if (nodeId === 'ac.cool.landing.picker' && LANDING[choice]) state.landing = LANDING[choice];
    state.answers.push({ node: nodeId, choice, label: option.label, fact: option.fact, at: new Date().toISOString() });
    pushAudit(state, 'answer_selected:' + choice);
    let target = resolveTarget(option, state);
    if (nodeId === ENTRY && choice === 'none_of_these' && state.stopping) target = '@professional';
    if (option.gate) {
      pushAudit(state, 'gate_fired:' + option.gate);
      pushAudit(state, 'exit_ramp:' + option.gate);
    }
    if (nodeId === CONSENT && choice === 'decline_terms') pushAudit(state, 'session_closed:consent_declined');
    if (nodeId === 'ac.start.breaker_disconnect' && choice === 'already_did_breaker_go_disconnect' && !breakerVisualPassed(state)) {
      target = 'ac.cool.power.breaker_visual';
    }
    state.preselectChoice = choice === 'fan_not_spinning_silent' ? 'outdoor_silent'
      : choice === 'outdoor_hum_cool_calling_fan_not_spinning' ? 'outdoor_hum_no_fan'
      : null;
    if (typeof target !== 'string') throw new Error('Unknown next step.');
    if (target.indexOf('ac.adv.cap.') === 0 && !advancedEnabled()) {
      throw new Error('Advanced DIY is not available in this beta.');
    }
    if (target.charAt(0) === '@') {
      const id = target.slice(1);
      const res = results[id];
      if (!res) throw new Error('Unknown result.');
      if ((res.diyTier === 'advanced' || (res.outcome === 'next_step' && res.diyTier === 'advanced')) && !advancedEnabled()) {
        throw new Error('Advanced DIY is not available in this beta.');
      }
      if (res.outcome === 'next_step' && res.diyTier !== 'basic' && res.diyTier !== 'advanced') {
        throw new Error('Advanced DIY is not available in this beta.');
      }
      state.result = id;
      state.node = null;
      if (res.outcome === 'next_step' && res.diyTier === 'advanced') {
        pushAudit(state, 'conclusion_reached:next_step_advanced');
        pushAudit(state, 'diy_tier_shown:advanced');
        pushAudit(state, 'notes.advanced_diy:on');
      } else if (res.outcome === 'next_step') {
        pushAudit(state, 'conclusion_reached:next_step_basic');
        pushAudit(state, 'diy_tier_shown:basic');
      } else if (res.outcome === 'call_pro') {
        pushAudit(state, 'conclusion_reached:call_pro');
        if (id === 'suspected_capacitor_contactor_advanced_off') pushAudit(state, 'advanced_diy:off');
      } else if (res.outcome === 'insufficient_info') {
        pushAudit(state, 'conclusion_reached:insufficient_info');
      } else {
        pushAudit(state, 'conclusion_reached:emergency_exit');
      }
    } else {
      if (!nodes[target]) throw new Error('Unknown step.');
      state.node = target;
      if (target === CONSENT) pushAudit(state, 'session_started');
      if (target === CONCLUDE) {
        const on = advancedEnabled();
        pushAudit(state, 'advanced_flag_checked:' + (on ? 'true' : 'false'));
        pushAudit(state, on ? 'advanced_path_offered' : 'advanced_path_suppressed');
        pushAudit(state, 'notes.advanced_diy:' + (on ? 'on' : 'off'));
      }
      if (nodes[target].diyTier === 'advanced') {
        pushAudit(state, 'diy_tier_shown:advanced');
        if (target === 'ac.adv.cap.prereq_gate_cluster') pushAudit(state, 'advanced_path_entered');
      }
      if (nodeId === 'ac.adv.cap.identify_label' && choice === 'label_readable_recorded') {
        pushAudit(state, 'capacitor_label_recorded');
      }
      pushAudit(state, 'node_entered:' + target);
    }
    return state;
  }
  function resume(state) {
    if (!state || !state.result) throw new Error('This check has ended or is invalid.');
    const res = results[state.result];
    const target = res && res.continueTo;
    if (!target || !nodes[target]) throw new Error('This result does not continue.');
    if (target.indexOf('ac.adv.cap.') === 0 && !advancedEnabled()) throw new Error('Advanced DIY is not available in this beta.');
    state.result = null;
    state.node = target;
    pushAudit(state, 'session_resumed:' + target);
    pushAudit(state, 'node_entered:' + target);
    return state;
  }
  function stop(state) {
    if (!state) return state;
    if (state.result && ['Emergency', 'Stop / professional'].includes(results[state.result].tier)) return state;
    pushAudit(state, 'exit_ramp:stop_get_help');
    state.node = ENTRY;
    state.result = null;
    state.safetyCleared = false;
    state.consent = false;
    state.telemetry = false;
    state.stopping = true;
    state.preselectChoice = null;
    pushAudit(state, 'node_entered:' + ENTRY);
    return state;
  }
  function summary(state, extra = {}) {
    const clean = x => String(x || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 140);
    const facts = state.answers.map(x => x.fact).filter(Boolean);
    const complaint = clean(extra.complaint) || clean(state.seed) || facts.find(x => x.startsWith('Complaint:')) || 'AC concern; see reported observations.';
    const observations = [...new Set(facts.filter(x => !x.startsWith('Complaint:') && !x.startsWith('User ') && !x.startsWith('Residential ')))].slice(-5);
    const actions = [...new Set(facts.filter(x => x.startsWith('User ')))].slice(-2);
    return ['HOMEOWNER SERVICE NOTE — observations, not a diagnosis',
      'Complaint: ' + clean(complaint).replace(/^Complaint:\s*/i, ''),
      extra.began ? 'Began: ' + clean(extra.began) : '',
      extra.model ? 'Model (homeowner supplied): ' + clean(extra.model) : '',
      observations.length ? 'Observed: ' + observations.join(' ') : '',
      actions.length ? 'Tried: ' + actions.join(' ') : '',
      state.mode === 'test' ? 'TEST SCENARIO — not an actual equipment report.' : ''
    ].filter(Boolean).join('\n');
  }
  function activity(state) {
    return { session_id: state.id, mode: state.mode, last_step: state.node || 'result',
      result: state.result || '', path: state.answers.map(a => a.node + ':' + a.choice).join('|'),
      elapsed_seconds: Math.max(0, Math.round((Date.now() - state.startedAt) / 1000)),
      terms_version: state.termsVersion || '', consent_at: state.consentAt || '',
      tree_version: state.treeVersion || TREE_VERSION };
  }
  return {
    nodes, results, create, answer, stop, resume, summary, activity, viewNode, advancedEnabled,
    treeVersion: TREE_VERSION, wave1: WAVE1, wave2: WAVE2, advanced: ADVANCED
  };
});
