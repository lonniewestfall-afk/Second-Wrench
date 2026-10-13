// Thermostat lane: ts.settings.v1 (settings help, P1 brands, Basic only, no AI). Start → Something else: water heater, boiler, mini-split, geothermal, thermostat, other → Thermostat or settings problem.
/* Deterministic decision engine. No model calls and no free-text diagnosis routing.
 * Browser or Node. Every action comes from the current node's choices.
 *
 * Trees:
 * - ac.cool.v2 for cooling-only central AC sessions.
 * - hp.air_source.v1 for air-source ducted heat-pump sessions (Basic).
 * - wshp.water_to_air.v0 for residential water-to-air water-source / geothermal
 *   sessions (PR-1). Safety screen, equipment gate, open-loop chemistry
 *   gate, and a call-pro handback. No loop, well, refrigerant, or electrical steps.
 * - fn.furnace.v0 for gas and electric furnace sessions (Basic, look-only).
 *   fn.gate.combustion_co runs before any furnace diagnosis, and before further
 *   heat-pump diagnosis when the heat pump has a gas furnace (or not sure).
 * - ms.ductless.v1 for a residential single-zone ductless mini-split (cooling
 *   and heating, one indoor unit, Basic only). Heat settings, a normal-defrost
 *   look, and a window-or-dry-ground look at the outdoor unit are included.
 *   Multi-zone stays out. Start stays five choices. Something else
 *   opens the ductless check or the water-source check. A ductless answer on
 *   the cooling-system question, or on the water-source equipment question,
 *   also enters this lane. The furnace question points back to that Start
 *   path. No capacitor, refrigerant, breaker, disconnect, or panel-removal
 *   steps. Water on electrical parts is a look-only stop. Advanced stays off.
 * Session entry: ac.gate.cluster_entry → ac.session.consent →
 *   sw.intake.system_type. Consent text is shared and its stored agree
 *   edge stays ac.cool.intake.system_confirm (not a second consent node).
 *   The session overlay sends every agree to system type first:
 *   Cooling-only AC → ac.cool.intake.system_confirm → ac.cool.landing.picker.
 *   Heat pump → hp.intake.system_confirm → hp.landing.picker.
 *   Furnace → fn.gate.combustion_co, then look-only checks.
 *   Something else → sw.intake.other_system. Ductless mini-split →
 *   ms.intake.system_confirm. Water-source / geothermal →
 *   wshp.hazard.flood_electrical.
 *   Not sure → sw.identify.* (at most three questions). A heat-pump signal
 *   or a still-unclear answer enters the heat-pump tree. Cooling-only is
 *   only outdoor-off in winter AND a separate furnace or boiler AND no
 *   Emergency / Aux heat. Unsure and heat-pump sessions never enter the
 *   AC capacitor path.
 * Terminals (only): next_step (DIY Basic, or DIY Advanced only when
 *   SW_CONFIG.advancedRepairsEnabled === true) | call_pro (reason) |
 *   emergency_exit | insufficient_info.
 * HP Advanced electrical is off: outdoor-not-running never reaches the
 * capacitor/contactor conclude. HP handback never auto-enters outdoor
 * fan, debris, or ice.
 *
 * Basic (2026-09-23), public:
 * - filter_clean_ok + landing weak_airflow → ac.cool.airflow.returns_supplies.
 *   Not cooling + clean filter → ac.cool.outdoor.fan_spinning.
 * - fan_spinning → ac.cool.outdoor.debris_clearance → ice.
 * - landing_unusual_noise → ac.noise.hazard_screen → ac.noise.clarify_outdoor_hum.
 *   Only outdoor hum while the thermostat is calling and the fan is not spinning →
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

  const TS = (typeof module === 'object' && module.exports && typeof require === 'function')
    ? require('./ts-lane.js')
    : globalThis.SW_TS_LANE;
  if (!TS) throw new Error('Thermostat lane failed to load');
  const HEAT = (typeof module === 'object' && module.exports) ? require('./heating-lanes.js') : globalThis.SW_HEATING;
  if (!HEAT) throw new Error('Heating lanes failed to load');
  const TREE_TS = 'ts.settings.v1';
  const TS_V0 = TS.v0;
  const TS_V1 = TS.v1;
  const TREE_VERSION = 'ac.cool.v2';
  const TREE_HP = 'hp.air_source.v1';
  const TREE_WSHP = 'wshp.water_to_air.v1';
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
    'ac.cool.power.breaker_reset_gate',
    'ac.cool.filter.restart_check',
    'ac.cool.power.disconnect_visual',
    'ac.start.breaker_disconnect',
    'ac.cool.airflow.returns_supplies',
    'ac.cool.outdoor.debris_clearance',
    'ac.noise.hazard_screen',
    'ac.noise.clarify_outdoor_hum'
  ];
  const ADVANCED = [];
  const HP_WAVE1 = [
    'hp.intake.system_confirm',
    'hp.landing.picker',
    'hp.mode.thermostat_check',
    'hp.mode.force_match_complaint',
    'hp.mode.emergency_aux_off',
    'hp.ambient.outdoor_band',
    'hp.defrost.sanity',
    'hp.heat.capacity_vs_dead',
    'hp.observe.leaving_air_vs_mode',
    'hp.rv.mode_asymmetric',
    'hp.handback.ac_filter_airflow',
    'hp.conclude.call_pro_defrost_valve_control',
    'hp.ice.mode_location',
    'hp.heat.cold_home_screen'
  ];
  const WSHP_WAVE1 = [
    'wshp.hazard.flood_electrical',
    'wshp.entry.equipment_gate',
    'wshp.heat.cold_home_screen',
    'wshp.openloop.complaint',
    'wshp.openloop.chemistry_gate',
    'wshp.handback.call_pro'
  ];
  const CONCLUDE = 'ac.cool.conclude.call_pro_capacitor_contactor';
  const TREE_FN = 'fn.furnace.v2';
  const TREE_MS = 'ms.ductless.v2';
  const MS_PR1 = [
    'ms.intake.system_confirm',
    'ms.landing.picker',
    'ms.controls.mode_setpoint',
    'ms.head.filter_path_ok',
    'ms.head.filter_clean',
    'ms.head.discharge_clear',
    'ms.head.airflow_result',
    'ms.head.water_observe',
    'ms.error.capture',
    'ms.ice.stop_observe'
  ];
  const MS_V1 = [
    'ms.heat.mode_setpoint',
    'ms.heat.force_heat',
    'ms.heat.defrost_sanity',
    'ms.outdoor.safe_observe'
  ];
  const MS_LANDING = {
    landing_no_cool: 'no_cool',
    landing_no_heat: 'no_heat',
    landing_weak_airflow: 'weak_airflow',
    landing_water_at_head: 'water_at_head',
    landing_error_code: 'error_code',
    landing_ice_seen: 'ice_seen',
    landing_outdoor_unit: 'outdoor_unit',
    landing_something_else: 'something_else'
  };
  const FN_GATE = 'fn.gate.combustion_co';
  const FN_CONCLUDE = 'fn.conclude.call_pro';
  const FN_WAVE1 = [
    'fn.gate.combustion_co',
    'fn.intake.system_confirm',
    'fn.landing.picker',
    'fn.tstat.mode_setpoint',
    'fn.conclude.call_pro'
  ];
  const FN_FUEL = { gas_furnace: 'gas', electric_furnace: 'electric' };
  const FN_LANDING = {
    landing_no_heat: 'no_heat',
    landing_cold_air: 'cold_air',
    landing_not_enough_heat: 'not_enough_heat',
    landing_short_cycle: 'short_cycle',
    landing_blank_tstat: 'blank_tstat',
    landing_water_near_furnace: 'water_near_furnace',
    landing_unusual_noise: 'unusual_noise',
    landing_cooling_problem: 'cooling_problem'
  };
  // AC nodes the furnace lane reuses verbatim. In the fn lane each also shows a hazard_now choice (viewNode).
  const FN_REUSED = ['ac.cool.filter.check', 'ac.tstat.blank.batteries', 'ac.cool.airflow.returns_supplies', 'ac.gate.water_near_electrical', 'ac.noise.hazard_screen'];
  // Never reachable in the fn lane. The overlay sends any of these to fn.conclude.call_pro (fn_advanced_off).
  const FN_FORBIDDEN = [
    'ac.cool.outdoor.fan_spinning', 'ac.cool.outdoor.debris_clearance', 'ac.cool.indoor.ice_lines_coil',
    'ac.noise.clarify_outdoor_hum', 'ac.start.outdoor_silent_vs_hum', 'ac.start.breaker_disconnect',
    'ac.cool.power.breaker_visual', 'ac.cool.power.disconnect_visual', 'ac.cool.tstat.mode_setpoint',
    'ac.cool.landing.picker', CONCLUDE,
    '@next_step_advanced', '@suspected_capacitor_contactor_advanced_off', '@hp_advanced_electrical_off',
    '@breaker_reset_basic', '@breaker_seasonal_restore_basic', 'ac.cool.power.breaker_reset_gate', '@mode_setpoint_basic', '@filter_replace_basic', '@filter_missing_basic',
    '@batteries_display_back', '@returns_supplies_cleared', '@filter_inaccessible',
    '@blank_tstat_after_batteries', '@blank_tstat_hardwired_power', '@tstat_inaccessible',
    '@weak_airflow_after_returns_supplies', '@airflow_check_inaccessible', '@unusual_noise_unresolved',
    '@noise_burning_sparks_smoke', '@uncertain', '@electrical'
  ];
  const FN_CO_LINE = "Never heat with an oven, stove, grill, or generator indoors (carbon monoxide). If you use an electric space heater, plug it straight into a wall outlet, follow its maker’s instructions, and keep it clear of anything that can burn.";
  const LANDING = {
    landing_not_cooling: 'not_cooling',
    landing_will_not_start: 'will_not_start',
    landing_blank_tstat: 'blank_thermostat',
    landing_weak_airflow: 'weak_airflow',
    landing_water_or_ice: 'water_or_ice',
    landing_unusual_noise: 'unusual_noise'
  };
  const HP_LANDING = {
    landing_no_heat: 'no_heat',
    landing_no_cool: 'no_cool',
    landing_both_modes_fail: 'both_modes_fail',
    landing_ice_outdoor: 'ice_outdoor',
    landing_short_cycle: 'short_cycle',
    landing_unusual_noise: 'unusual_noise'
  };
  const HP_BAND = {
    band_mild_warm: 'mild_warm',
    band_near_freezing: 'near_freezing',
    band_well_below: 'well_below',
    not_sure_ambient: 'unknown'
  };

  const o = (id, label, next, hint = '', fact = '', extra = {}) =>
    ({ id, label, next, hint, fact, gate: extra.gate || null });
  const n = (section, title, body, options, extra = {}) =>
    ({ section, title, body, options, caution: extra.caution || '', diyTier: extra.diyTier || 'basic', safetyGate: !!extra.safetyGate });
  const FN_HAZARD = o('hazard_now', 'New gas smell, CO alarm, refrigerant leak alarm, smoke, sparks, or burning smell right now', '@fn_hazard_now', 'Stop. Get to safety.', 'New hazard reported during the furnace check.', { gate: 'fn_new_hazard' });
  const MS_HAZARD = o('hazard_now', 'New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, refrigerant leak alarm, or water at electrical parts)', '@ms_hazard_now', 'Stop. Don’t keep checking.', 'New hazard reported during the mini-split check.', { gate: 'ms_new_hazard' });
  const MS_BACKUP_HEAT = 'Never heat with an oven, stove, grill, or generator indoors (carbon monoxide). If you use an electric space heater, plug it straight into a wall outlet, follow its maker’s instructions, and keep it clear of anything that can burn.';

  const nodes = {
    'ac.gate.cluster_entry': n('Safety first', 'Is any of this happening right now?',
      'Do not approach equipment to find out. Choose from what you already know. Emergency help never requires accepting our terms.\n\nFor immediate danger in the U.S. or Canada, leave the affected area and call 911. Elsewhere, use your local emergency number.', [
        o('hazard_gas_co', 'Gas smell or a carbon monoxide alarm', '@gas', 'Leave the building. Get help from outside.', 'Gas smell or CO alarm reported.', { gate: 'gas_co' }),
        o('hazard_smoke_fire_sparks_burn', 'Smoke, fire, sparks, or a burning smell', '@fire', 'Stop troubleshooting and move away.', 'Smoke, sparks, fire, or burning smell reported.', { gate: 'smoke_fire_sparks_burn' }),
        o('hazard_water_electrical', 'Water at electrical equipment or damaged wiring', '@electrical', 'Do not touch equipment or enter standing water.', 'Water at electrical equipment or damaged wiring reported.', { gate: 'water_near_electrical' }),
        o('hazard_heat_illness', 'Someone is confused, fainting, or seriously ill in the heat', '@heat', 'Call 911. Do not wait on the AC.', 'Possible heat-related medical emergency reported.', { gate: 'heat_illness_911' }),
        o('hazard_cold_exposure', 'The house is getting cold, and someone at home is at risk from the cold (an infant, an older adult, or someone who is ill or medically fragile)', '@cold_exposure', 'Get them warm first.', 'Someone at risk from the cold reported.', { gate: 'cold_exposure_911' }),
        o('hazard_refrigerant_alarm', 'A refrigerant-leak alarm or suspected refrigerant release', '@leak', 'Do not reset or disable the alarm.', 'Refrigerant alarm or suspected release reported.', { gate: 'refrigerant_alarm_or_release' }),
        o('hazard_unsure', 'I am not sure whether there is a hazard', '@uncertain', 'Prefer a stop. Do not continue into DIY.', 'Homeowner was not sure whether a hazard was present.', { gate: 'unsure_hazard' }),
        o('none_of_these', 'None of these', CONSENT, 'Continue with basic, non-invasive checks.')
      ], { safetyGate: true }),

    'ac.session.consent': n('Before you begin', 'A guide, not an equipment inspection.',
      'This beta offers limited homeowner checks and a next step based on your answers. It does not confirm a diagnosis or authorize electrical or refrigerant work.\n\nRequired: confirm you are 18 or older and agree to the beta terms (DIY risks and limits; manufacturer instructions and professional evaluation take priority).', [
        o('agree_18_terms', 'Agree and continue', 'ac.cool.intake.system_confirm', 'I am 18 or older. I have read and agree to the beta terms, including the DIY risks and limits. I understand that manufacturer instructions and professional evaluation take priority.'),
        o('decline_terms', 'Decline / do not agree', '@consent_declined', 'End session. No diagnosis path without required consent.')
      ]),

    'sw.intake.system_type': n('Your system', 'What kind of system is this?',
      'Answer from what you already know. Do not remove a cover or climb to identify the equipment.\n\nA cooling-only air conditioner cools the house. Heat usually comes from a separate furnace or boiler, and the outdoor unit stays off in winter.\n\nA heat pump heats and cools with the outdoor unit.\n\nA furnace heats with gas, oil, or electricity. An air handler moves air and may use electric heat or a hot-water coil. Many homes have a furnace inside and a cooling-only AC outside.\n\nSomething else includes water heaters, boilers, ductless mini-splits, geothermal, and thermostat controls.', [
        o('cooling_only_ac', 'Cooling-only AC', 'ac.cool.intake.system_confirm', 'The outdoor unit is for cooling. A furnace, boiler, or other heater provides heat.', 'Cooling-only central AC reported.'),
        o('heat_pump', 'Heat pump (heats and cools with the outdoor unit)', 'hp.intake.system_confirm', 'The outdoor unit runs for heat and for cooling.', 'Heat pump reported at system type.'),
        o('furnace', 'Furnace or air handler (gas, oil, electric, or hot water)', 'fn.gate.combustion_co', 'Includes manufactured homes and hydronic coils. A furnace and air-handler safety check comes first.', 'Furnace or air handler reported at system type.'),
        o('other_heat_or_ductless', 'Something else: water heater, boiler, mini-split, geothermal, thermostat, other', 'sw.intake.other_system', 'Boilers, water heaters, ductless mini-splits, geothermal, thermostat controls, or another system.', ''),
        o('not_sure', 'Not sure', 'sw.identify.winter_outdoor', 'Up to three plain questions. If it is still unclear, the check uses the heat-pump path.')
      ]),

    'sw.intake.other_system': n('Your system', 'Which one is it?',
      'Answer from what you already know. Do not remove a cover or climb to identify the equipment.\n\nA ductless mini-split has an indoor unit on a wall, floor, or ceiling. It blows air into the room. There are no vents.\n\nA water-source or geothermal heat pump sits indoors, often in a basement or closet. There is no outdoor unit with a fan. Water or loop fluid comes in through pipes from the ground, a well, or a pond.\n\nThermostat problems on any kind of system, like a blank screen, the wrong mode, a schedule, the fan, or Wi-Fi, have their own check.', [
        o('ductless_mini_split', 'Ductless mini-split', 'ms.intake.system_confirm', 'Heating or cooling concerns on one indoor unit or several rooms, using a remote or wall control.', 'Ductless mini-split reported at Start.'),
        o('water_source_geo', 'Water-source / geothermal heat pump', 'wshp.hazard.flood_electrical',
          'No outdoor unit with a fan. Water pipes run to a ground loop, a well, or a pond.',
          'Water-source or geothermal heat pump reported at system type.'),
        o('thermostat_settings', 'Thermostat or settings problem', 'ts.gate.safety_stops',
          'Screen, mode, schedule, fan, Wi-Fi, or a message on a Nest, Honeywell Home, ecobee, or Amazon thermostat.',
          'Thermostat or settings problem reported at Start.'),
        o('not_listed', 'None of these', '@sw_other_not_listed', 'This beta does not check that equipment yet.', 'Equipment not listed in the system menu.')
      ]),

    'sw.identify.winter_outdoor': n('Your system', 'Does the outdoor unit run in winter to heat the house?',
      'Think about a cold day when the heat is on. You do not need to go outside to check. If you are not sure, say so.\n\nDo not remove a cover or climb to the unit.', [
        o('winter_outdoor_runs', 'Yes — it runs in winter to heat the house', 'hp.intake.system_confirm', 'That is a heat pump. Continue on the heat-pump check.', 'Outdoor unit runs in winter to heat the house.'),
        o('winter_outdoor_never', 'No — it stays off all winter', 'sw.identify.em_aux', 'The outdoor unit is not the heater.', 'Outdoor unit stays off in winter.'),
        o('winter_outdoor_unsure', 'Not sure', 'sw.identify.em_aux', 'We will use the other questions. Unclear answers stay on the heat-pump path.')
      ]),

    'sw.identify.em_aux': n('Your system', 'Does the thermostat have Emergency Heat, Aux Heat, or EM HT?',
      'Look at the thermostat mode you already use. Names vary: Emergency Heat, Aux Heat, Auxiliary, or EM HT.\n\nDo not pull the thermostat off the wall.', [
        o('has_em_aux', 'Yes — Emergency, Aux, or EM HT is there', 'hp.intake.system_confirm', 'That control is a heat-pump signal. Continue on the heat-pump check.', 'Thermostat shows Emergency Heat, Aux Heat, or EM HT.'),
        o('no_em_aux', 'No', 'sw.identify.heat_source', 'No Emergency Heat or Aux Heat on the thermostat.', 'No Emergency Heat, Aux Heat, or EM HT on the thermostat.'),
        o('em_aux_unsure', 'Not sure', 'sw.identify.heat_source', 'If the rest is also unclear, this check uses the heat-pump path.')
      ]),

    'sw.identify.heat_source': n('Your system', 'What heats the house?',
      'Use what you already know. A label you can already read from the ground counts. Do not open a cover to find one.\n\nCooling-only is only when the outdoor unit stays off in winter, a separate furnace or boiler provides the heat, and there is no Emergency Heat or Aux Heat. Anything still unclear uses the heat-pump check.', [
        o('separate_furnace_boiler', 'A separate furnace or boiler', {
          whenCoolingOnly: 'ac.cool.intake.system_confirm',
          default: 'hp.intake.system_confirm'
        }, 'Cooling-only when the outdoor unit stays off in winter and there is no Emergency Heat or Aux Heat. Otherwise the heat-pump check.', 'Separate furnace or boiler reported as the heat source.'),
        o('label_says_heat_pump', 'The outdoor unit label says heat pump', 'hp.intake.system_confirm', 'Continue on the heat-pump check. Do not open a cover to re-read it.', 'Outdoor unit label says heat pump.'),
        o('heat_source_unsure', 'Not sure', 'hp.intake.system_confirm', 'Still unclear, so this check uses the heat-pump path. No capacitor steps on that path.', 'Heat source still unclear. Using the heat-pump check.')
      ]),

    'ac.cool.intake.system_confirm': n('Your system', 'What kind of cooling system is this?',
      'Use an existing manual or what you already know. Do not remove a cover or climb to identify equipment.\n\nThis beta covers confirmed conventional, cooling-only split-system central AC (outdoor cooling-only condenser + indoor furnace or air handler).', [
        o('split_central_cool_only', 'Central AC with separate indoor and outdoor units', 'ac.cool.landing.picker', 'A cooling-only outdoor AC connected to an indoor furnace or air handler.', 'Residential split-system central AC reported.'),
        o('heat_pump', 'A heat pump', 'hp.intake.system_confirm', 'A heat pump heats and cools. Leave this cooling-only check and continue on the air-source heat pump check.', 'Heat pump reported. Switching to the heat pump tree.'),
        o('ductless_mini_split', 'A ductless mini-split', 'ms.intake.system_confirm', 'Indoor unit on the wall, floor, or ceiling, no vents. Continue on the mini-split check.', 'Ductless mini-split reported. Switching to the mini-split check.'),
        o('window_portable', 'A window or portable unit', '@out_of_scope_equipment', 'Out of scope for this beta.', 'Window or portable equipment reported.'),
        o('geo_packaged_other', 'Geothermal, packaged, or another system', '@out_of_scope_equipment', 'Geothermal or water-source: start again, choose Water-source / geothermal heat pump. Packaged or other systems are not covered yet.', 'Geothermal, packaged, or another system reported.'),
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
      'Record the thermostat settings, set the thermostat to Off, and wait for the blower to stop. This does not disconnect electricity.\n\nUse only an external, tool-free owner filter slot or return grille identified in the exact manual and reachable from the floor. Keep all equipment compartments closed, including tool-free furnace doors. Do not climb, touch wires, or reach inside equipment.\n\nIf you can access the specified filter, look for heavy dust or blocked media. Put a clean filter back in the specified direction and quantity and close its access. Leave the thermostat Off until the following restart check. Choose I cannot check if any part does not match.', [
        o('filter_dirty_clogged', 'Filter looks dirty or clogged', 'ac.cool.filter.replace_step', 'Read the owner-access and replacement steps first.', 'Filter looks dirty or clogged.'),
        o('filter_clean_ok', 'Filter looks clean / recently replaced', {
          byLanding: { weak_airflow: 'ac.cool.airflow.returns_supplies' },
          hpHandback: '@hp_basics_clear_after_filter',
          hpHandbackWeak: 'ac.cool.airflow.returns_supplies',
          default: 'ac.cool.outdoor.fan_spinning'
        }, 'Weak airflow continues to returns and supplies. Not cooling continues to the outdoor fan.', 'Filter looks clean or was recently replaced.'),
        o('filter_clean_weak_airflow', 'Filter looks clean, but airflow from the vents is weak', 'ac.cool.airflow.returns_supplies', 'Heat-pump handback only. Check returns and supplies, then stop for a professional.', 'Filter looks clean and supply airflow is weak.'),
        o('filter_missing', 'No filter installed', 'ac.cool.filter.replace_step', 'Review the specified filter and owner-access requirements.', 'No filter installed.'),
        o('cannot_check_safely', 'I cannot check', '@filter_inaccessible', 'Do not force access.')
      ]),

    'ac.cool.outdoor.fan_spinning': n('Outdoor unit', 'Is the fan spinning?',
      'From where you already stand (do not put fingers or objects through the grille; no covers off):\n\nWith the thermostat calling for Cool, look and listen at the outdoor condenser.\n\nIs the top (or side) fan visibly spinning? Or is the outdoor unit silent / not moving? Or do you hear a hum or buzz from the outdoor cabinet while the fan is not spinning?\n\nStay clear of moving parts. Do not open the electrical compartment.', [
        o('fan_spinning', 'Outdoor fan is spinning', 'ac.cool.outdoor.debris_clearance', 'Clear exterior debris, then continue ice / cooling checks.', 'Outdoor fan was seen spinning.'),
        o('fan_not_spinning_silent', 'Outdoor unit is silent / fan not spinning', 'ac.start.outdoor_silent_vs_hum', 'Start / power family.', 'Outdoor unit silent; fan not spinning.'),
        o('fan_not_spinning_hum', 'Fan not spinning, but I hear a hum or buzz at the outdoor unit', 'ac.cool.conclude.call_pro_capacitor_contactor', 'Suspected contactor/capacitor path — Advanced OFF.', 'Outdoor fan not spinning; hum or buzz at the outdoor unit.'),
        o('cannot_observe', 'I cannot observe from where I stand', '@outdoor_cannot_observe', 'Do not approach hazards (weather, dogs, locked yard, etc.).'),
        o('outdoor_inaccessible', 'Outdoor unit is inaccessible', '@outdoor_inaccessible', 'Same — no forcing access.', 'Outdoor unit inaccessible.')
      ]),

    'ac.cool.indoor.ice_lines_coil': n('Ice', 'Ice on lines or indoor coil?',
      'Without removing panels or chipping ice:\n\nLook at the larger refrigerant suction line (often insulated) near the outdoor unit or where lines enter the house — is there heavy frost or ice? If you can see the indoor coil area through an existing access designed for homeowner view only, is there ice buildup? Do not force cabinets open. Is water pooling from melting ice near equipment?\n\nIf you see ice: do not keep running the system to “force cool.” Do not chip ice with tools.', [
        o('ice_observed', 'Yes — ice or heavy frost on lines / coil', '@ice_thaw_basic', 'Thaw discipline required.', 'Ice or heavy frost seen on lines or coil.'),
        o('no_ice_observed', 'No ice seen', '@cooling_not_established_basics_clear', 'Cooling still not established → pro path.', 'No ice seen on lines or coil from where you can already see it.'),
        o('want_keep_running_despite_ice', 'There is ice, but I want to keep the system running', '@ice_keep_running', 'Hard stop.', 'Homeowner wanted to keep the system running despite ice.', { gate: 'ice_keep_running' }),
        o('not_sure_cannot_see', 'I am not sure / cannot see from where I stand', '@ice_not_confirmed', 'Do not open covers to find ice.')
      ], { safetyGate: true }),

    'ac.gate.water_near_electrical': n('Water / electrical', 'Is there water at electrical equipment?',
      'Answer from what you already know. Do not enter standing water to check. Do not touch equipment, disconnects, or panels with wet hands or while standing on a wet floor.\n\nIs there standing water, active leaking onto, or obvious wetness at any of:\n\nIndoor furnace / air handler / electrical disconnect\nOutdoor disconnect or whip area\nBreaker panel\nDamaged or exposed wiring in a wet area', [
        o('water_at_electrical_yes', 'Yes — water at electrical equipment or damaged wiring in a wet area', '@electrical', 'Hard stop. Do not touch.', 'Water at electrical equipment or damaged wiring in a wet area.', { gate: 'water_near_electrical' }),
        o('water_clear_no_electrical_risk', 'No — no water at electrical equipment; area is dry enough to continue looking', 'ac.cool.indoor.ice_lines_coil', 'Continue ice / condensate observation only.', 'No water at electrical equipment; area dry enough to keep looking.'),
        o('water_elsewhere_not_electrical', 'Water or dampness elsewhere (away from electrical)', 'ac.cool.indoor.ice_lines_coil', 'Still caution; ice path may apply.', 'Water or dampness away from electrical equipment.'),
        o('not_sure_water_hazard', 'I am not sure', '@unsure_water_electrical', 'Prefer a stop.', 'Homeowner was not sure whether water was at electrical equipment.', { gate: 'unsure_water_electrical' })
      ], { safetyGate: true }),

    'ac.start.outdoor_silent_vs_hum': n('Outdoor unit', 'Silent or humming when it should start?',
      'Thermostat should be calling for Cool (mode Cool, setpoint below room). From where you already stand at the outdoor unit (no covers off, nothing through the grille):\n\nWhen cool is calling, which best matches?\n\nCompletely silent (no fan, no obvious compressor sound)\nA hum or buzz from the outdoor cabinet while the fan is not spinning\nOutdoor fan / unit does run (may be the wrong landing)\nYou cannot tell from where you stand', [
        o('outdoor_silent', 'Outdoor unit is silent when cool is calling', 'ac.start.breaker_disconnect', 'Basic power visuals: breaker door, then disconnect position only.', 'Outdoor unit silent while cool is calling.'),
        o('outdoor_hum_no_fan', 'Hum or buzz at outdoor unit; fan not spinning', 'ac.cool.conclude.call_pro_capacitor_contactor', 'Suspected capacitor / contactor — call_pro while Advanced OFF.', 'Hum or buzz at outdoor unit; fan not spinning.'),
        o('outdoor_runs_ok', 'Outdoor unit runs (fan and/or compressor seem active)', 'ac.cool.tstat.mode_setpoint', 'May be Not cooling rather than Will not start.', 'Outdoor unit runs while cool is calling.'),
        o('not_sure_listen', 'I am not sure / cannot observe from where I stand', '@outdoor_listen_unsure', 'Do not force access.')
      ]),

    'ac.tstat.blank.batteries': n('Thermostat', 'Batteries first (Basic)',
      'If the thermostat display is blank:\n\n1. Check whether this thermostat uses replaceable batteries (often AA/AAA behind a pull-off face — only if the face is designed for homeowner battery access).\n2. If yes, replace with fresh batteries of the correct type.\n3. Do not open the furnace/air-handler control board. Do not pull thermostat wiring from the wall to “test” for power. Do not work inside the breaker panel.\n\nIf the thermostat is hardwired / powered by the system (C-wire / common) and stays blank after any designed battery check, that is usually a professional electrical / transformer path.', [
        o('batteries_replaced_display_back', 'Replaced batteries; display works again', '@batteries_display_back', 'Basic success — retest cool call.', 'User replaced thermostat batteries; display works again.'),
        o('batteries_replaced_still_blank', 'Replaced batteries (or no battery compartment); still blank', '@blank_tstat_after_batteries', 'Pro path.', 'Thermostat still blank after a battery check.'),
        o('hardwired_or_no_batteries', 'Hardwired / no batteries; display blank', '@blank_tstat_hardwired_power', 'Pro path — C-wire / transformer / control power.', 'Blank hardwired thermostat, or no battery compartment.'),
        o('cannot_access_safely', 'I cannot reach the batteries', '@tstat_inaccessible', 'Do not force the face off if unsure.'),
        o('not_sure', 'I am not sure', '@tstat_batteries_unsure', 'Do not open equipment.')
      ]),

    'ac.cool.conclude.call_pro_capacitor_contactor': n('Call a professional', 'Suspected start components',
      'Based on your answers (outdoor hum / buzz while the fan is not spinning, or equivalent start evidence while cool is calling), a common professional check is the outdoor contactor and/or capacitor.\n\nAdvanced DIY is OFF in this beta. Do not attempt capacitor discharge, capacitor replacement, contactor replacement, or any cover-off electrical work from this guide.\n\nWhat to do:\n\n1. Set the thermostat to Off and leave it Off until a licensed HVAC professional has checked the system.\n2. Call a licensed HVAC tech.\n3. You may tell them: outdoor unit hummed or showed start symptoms while the condenser fan was not spinning; homeowner Basic checks only (no covers removed).\n\nThis is not a confirmed parts diagnosis — it is a ranked reason to stop DIY and get service.', [
        o('ack_call_pro', 'Understood — call a professional', '@suspected_capacitor_contactor_advanced_off', 'Terminal acknowledgment.'),
        o('want_diy_capacitor_anyway', 'I want to replace the capacitor myself', '@suspected_capacitor_contactor_advanced_off', 'Not offered as live DIY while Advanced is off.')
      ], { diyTier: 'pro_only' }),

    'ac.noise.hazard_screen': n('Unusual noise', 'Hazard screen first',
      'Before clarifying the sound, rule out danger. Choose from what you already know. Do not approach equipment to find sparks or smoke.\n\nIf any of these are happening now:\n\n- Burning smell or electrical heat smell from equipment\n- Sparks\n- Smoke or fire\n- Grinding metal-on-metal (violent, new, or worsening)\n\n…stop troubleshooting. Prefer emergency help or a licensed professional over continuing.\n\nFor immediate danger, get clear and call 911.', [
        o('noise_burning_sparks_smoke', 'Burning smell, sparks, smoke, or fire', '@noise_burning_sparks_smoke', 'Emergency stop. Do not keep diagnosing.', 'Burning smell, sparks, smoke, or fire with the noise.', { gate: 'burning_smell' }),
        o('noise_grinding_metal', 'Grinding metal-on-metal', '@grinding_metal_noise', 'Turn the system Off if you can do it without getting closer, then call a pro.', 'Grinding metal-on-metal noise.', { gate: 'grinding_metal_noise' }),
        o('noise_no_hazard_symptoms', 'None of those hazard signs — noise only', {
          hpClear: '@unusual_noise_hp_wave1',
          default: 'ac.noise.clarify_outdoor_hum'
        }, 'Cooling-only AC continues to the outdoor hum check. A heat pump noise with no hazard stops for a professional.'),
        o('noise_unsure_hazard', 'Not sure if it is a hazard', '@uncertain', 'Prefer a stop. Do not continue into DIY.', 'Homeowner was not sure whether the noise was a hazard.', { gate: 'unsure_hazard' })
      ], { safetyGate: true }),

    'ac.noise.clarify_outdoor_hum': n('Unusual noise', 'Which noise is it?',
      'Hazard signs were ruled out. Only one pattern continues into the outdoor silent-versus-hum check:\n\n- Outdoor hum or buzz\n- While the thermostat is calling for Cool\n- And the outdoor fan is not spinning\n\nAny other noise — indoor screech, rattle, unknown sound, outdoor noise while the fan spins, or noise when Cool is not calling — stops here for a licensed professional. This step does not name a failed part.', [
        o('outdoor_hum_cool_calling_fan_not_spinning', 'Outdoor hum or buzz while the thermostat is calling; fan not spinning', 'ac.start.outdoor_silent_vs_hum', 'The only route into the silent-versus-hum check.', 'Outdoor hum or buzz while the thermostat is calling and the fan is not spinning.'),
        o('indoor_or_other_noise', 'Indoor noise, rattle, screech, or other / unknown', '@unusual_noise_unresolved', 'Stays with a professional.'),
        o('outdoor_noise_but_fan_spins_or_not_calling', 'Outdoor noise, but the fan spins or Cool is not calling', '@unusual_noise_unresolved', 'Not the start-hum pattern.'),
        o('not_sure_noise', 'Still not sure', '@unusual_noise_unresolved', 'Prefer a professional over a guess.')
      ]),

    'ac.cool.airflow.returns_supplies': n('Airflow', 'Returns and supplies',
      'The filter already looks clean or was just replaced. Check simple indoor airflow blockers.\n\nReturns (intake): is a return grille blocked by furniture, boxes, curtains, or a thick rug edge? Move furniture so the grille can breathe. Do not remove fixed drywall returns.\n\nSupplies (registers): are supply registers closed, covered by rugs, or blocked by furniture? Open closed vents that should be open for the rooms you want heated or cooled.\n\nDo not cut or modify ducts, pull a register into a chase, open the blower cabinet, or seal ducts from this guide. If airflow is still weak after clearing furniture, rugs, and closed vents, call a licensed HVAC professional.', [
        o('blocked_cleared_airflow_improved', 'Blocked return or supply cleared; airflow improved', {
          hpHandback: '@hp_basics_clear_after_filter',
          default: '@returns_supplies_cleared'
        }, 'Basic step done. Retest comfort. A heat-pump handback stops for a professional after this check.', 'Blocked return or supply cleared; airflow improved.'),
        o('blocked_cleared_still_weak', 'Cleared blockers; airflow still weak', {
          hpHandback: '@hp_basics_clear_after_filter',
          default: '@weak_airflow_after_returns_supplies'
        }, 'No duct work from this guide.'),
        o('no_blockers_found_still_weak', 'No furniture, rug, or vent blockers; still weak', {
          hpHandback: '@hp_basics_clear_after_filter',
          default: '@weak_airflow_after_returns_supplies'
        }, 'Call a professional.'),
        o('cannot_check_safely', 'I cannot check returns or supplies', '@airflow_check_inaccessible', 'Do not force access.'),
        o('want_duct_work', 'I want to cut ducts, open a chase, or reach the blower', '@duct_work_rejected_not_basic', 'Not a Basic step.', 'Asked to cut ducts, open a chase, or reach the blower.', { gate: 'duct_work_rejected_not_basic' })
      ]),

    'ac.cool.outdoor.debris_clearance': n('Outdoor unit', 'Exterior debris and clearance',
      'Look from dry, level ground. Clear only ordinary items and loose debris on the ground outside the cabinet. Anything on the coil or fins, against the fan guard, or inside a grille is for a professional. Do not touch the unit or its disconnect.', [
        o('exterior_cleared_ok', 'The surrounding area is clear; no new noise or warning signs', 'ac.cool.indoor.ice_lines_coil', 'Continue the cooling checks.', 'Homeowner reports surrounding area clear and no new warning signs; equipment performance unconfirmed.'),
        o('need_reach_into_grille', 'Debris is stuck inside, past the grille, where I’d have to reach in', '@debris_past_grille_pro', 'That’s a pro visit. Don’t reach in.', 'Debris packed inside the grille. Homeowner did not reach in.', { gate: 'reach_in' }),
        o('wet_or_electrical_nearby', 'Wet conditions or an electrical concern outdoors', '@debris_wet_electrical', 'Hard stop.', 'Wet conditions or an electrical concern at the outdoor unit.', { gate: 'water_near_electrical' }),
        o('cannot_access_yard_unit', 'I cannot access the outdoor unit', '@outdoor_inaccessible', 'Do not force access.'),
        o('want_fin_comb_deep_coil', 'I want to comb fins deep into the coil with tools', '@coil_service_pro_only', 'Not a Basic step.', 'Asked to comb fins deep into the coil.', { gate: 'coil_service_pro_only' })
      ], { safetyGate: true }),

    'ac.start.breaker_disconnect': n('Will not start', 'Basic power visuals',
      'The outdoor unit is silent while the thermostat is calling. Before any further start check, confirm Basic power visuals in this order:\n\n1. Breaker panel door — visual On, Off, or tripped for the outdoor/AC circuit. No deadfront off.\n2. Outdoor disconnect — visual Off/On position only, from dry ground. This guide does not tell you to operate the lever, open the door, or pull a fuse.\n\nThis step does not open panels or pull fuses. If you cannot do either check (wet, unsure, inaccessible, or damaged), stop and call a licensed professional.\n\nCapacitor or cover-off work is not offered from this step.', [
        o('begin_breaker_then_disconnect', 'I can check the breaker door, then the disconnect', 'ac.cool.power.breaker_visual', 'Panel door first, then disconnect position only.'),
        o('cannot_safely_either', 'I cannot check the breaker or the disconnect', '@outdoor_silent_will_not_start', 'Stop rather than guess.', 'Could not check the breaker or the outdoor disconnect.', { gate: 'cannot_kill_power' }),
        o('already_did_breaker_go_disconnect', 'Breaker visual is already done — go to the disconnect visual', 'ac.cool.power.disconnect_visual', 'Only if the breaker door check already passed this session. Otherwise the breaker check comes first.'),
        o('want_advanced_or_covers_off', 'I want capacitor or cover-off electrical work from here', '@advanced_not_from_basic_hub', 'Not offered from this Basic step.', 'Asked for cover-off or capacitor work from the silent-path hub.', { gate: 'high_voltage_intent' })
      ], { safetyGate: true }),

    'ac.cool.power.breaker_visual': n('Breaker panel', 'Visual check only (door open)',
      'You are confirming whether the outdoor / AC circuit breaker looks tripped, Off, or On. This is a panel-door check only.\n\n- Stand on a dry floor with dry hands.\n- Open only the outer door of the breaker panel if you already know how and it is meant for reading labels.\n- Do not remove the deadfront / cover that exposes bus bars.\n- Do not probe, meter, or touch screw terminals.\n- Find the breaker labeled for the outdoor unit, AC, or condenser. If you cannot tell which breaker it is, stop and call a professional.\n\nA tripped handle is often midway between On and Off. That varies by brand.\n\nDon’t reset anything yet. If the breaker looks tripped or Off, the next screen asks a few questions first. Never touch fuses or the outdoor disconnect.', [
        o('breaker_on_confirmed', 'Breaker for outdoor/AC looks On', 'ac.cool.power.disconnect_visual', 'Continue to the disconnect visual.', 'Outdoor/AC breaker looks On.'),
        o('breaker_tripped_or_off', 'Breaker looks tripped or Off', 'ac.cool.power.breaker_reset_gate', 'A few questions come before any reset.', 'Outdoor/AC breaker looks tripped or Off.'),
        o('breaker_reset_ok_still_silent', 'I already reset it once, it stayed On, and the outdoor unit is still silent', 'ac.cool.power.disconnect_visual', 'Continue to the disconnect visual.', 'Breaker was reset once and stayed On. Outdoor unit still silent while the thermostat is calling.'),
        o('breaker_tripped_again', 'The breaker tripped again', '@breaker_retrip_pro', 'Don’t reset it again.', 'The breaker tripped again.', { gate: 'breaker_wont_reset' }),
        o('unsure_which_breaker', 'I cannot tell which breaker is for the outdoor unit', '@cannot_identify_ac_breaker', 'Do not guess.', 'Could not identify the outdoor/AC breaker.'),
        o('cannot_open_or_wet_unsafe', 'Wet floor or hands, flood, damaged panel, or I cannot open the door', '@breaker_unsafe_stop', 'Hard stop. No panel work.', 'Wet, flood, damaged panel, or breaker door could not be opened.', { gate: 'cannot_kill_power' }),
        o('want_panel_interior', 'I need to remove the deadfront or see inside the panel', '@panel_interior_rejected', 'Not a Basic step.', 'Asked to remove the breaker deadfront.', { gate: 'high_voltage_intent' })
      ], { caution: 'Panel door only. Do not remove the deadfront or touch terminals.', safetyGate: true }),

    'ac.cool.power.disconnect_visual': n('Outdoor disconnect', 'Visual position only',
      'From dry ground, look at the outdoor disconnect box near the condenser (usually on the wall within sight of the unit).\n\nCan you see whether the exterior handle or lever, or a visible On/Off marking, appears Off or On?\n\nStay back if the box is wet, damaged, buzzing, hot-smelling, or if weather makes the approach unsafe.\n\nThis step does not tell you to:\n\n- Operate or flip the exterior lever or handle\n- Open the disconnect door\n- Pull a fused pull-out block\n- Touch whip wires, lugs, or anything inside\n- Do any cover-off electrical work\n\nIf you would need to operate the disconnect, or the only path is a fused pull-out, an open door, or the inside of the box, or you cannot see Off/On from dry ground — call a licensed professional. Do not invent a manufacturer procedure you do not have.', [
        o('disconnect_appears_on', 'From dry ground, the disconnect appears On', {
          hpOutdoor: '@hp_outdoor_not_running_wave1',
          default: '@outdoor_silent_will_not_start'
        }, 'Visual only. Basic power visuals are exhausted. A heat pump does not continue into capacitor or contactor work.', 'Outdoor disconnect appears On from dry ground; outdoor unit still silent.'),
        o('disconnect_appears_off', 'From dry ground, the disconnect appears Off', {
          hpOutdoor: '@hp_outdoor_not_running_wave1',
          default: '@outdoor_disconnect_appears_off'
        }, 'Visual only. This may explain a silent outdoor unit. Do not operate the lever.', 'Outdoor disconnect appears Off from dry ground.'),
        o('cannot_see_position_safely', 'I cannot see Off/On from dry ground', '@disconnect_visual_inaccessible', 'Do not force the approach.'),
        o('need_to_operate_lever', 'I would need to flip or operate the exterior lever to continue', '@disconnect_operate_not_basic', 'Basic does not include operating the lever.', 'Would need to operate the disconnect lever.', { gate: 'disconnect_operate_not_basic' }),
        o('fused_pullout_or_open_door', 'It is a fused pull-out, or I would need to open the door or see inside', '@disconnect_open_or_fused', 'Always a professional.', 'Fused pull-out or open-door disconnect.', { gate: 'high_voltage_intent' }),
        o('wet_damaged_or_unsafe', 'Wet, damaged, buzzing, or otherwise unsafe to approach', '@disconnect_unsafe_approach', 'Hard stop.', 'Outdoor disconnect is wet, damaged, buzzing, or unsafe to approach.', { gate: 'wet_hands_flood' })
      ], { caution: 'Visual only. This step does not tell you to flip, pull, or open the disconnect.', safetyGate: true }),

    'ac.cool.filter.restart_check': n('Air filter', 'After the new filter is in',
      'Keep the thermostat Off for this check. With the specified filter installed and its access closed, look for ice, water, or another hazard before restoring the thermostat settings. Do not open equipment.', [
        o('restart_all_clear', 'The filter access is closed, and I see none of these signs', '@filter_replace_basic', 'Read the restart and observation instructions.', 'User reports filter access closed and no listed warning signs; system operation not yet confirmed.'),
        o('restart_ice_seen', 'I see ice or frost on the pipes or the indoor or outdoor unit', '@ice_thaw_basic', 'Thaw first.', 'Ice or frost seen after the filter change.'),
        o('restart_water_electrical', 'Water is near wiring, the thermostat, or electrical parts', '@electrical', 'Stop. Don\u2019t touch it.', 'Water near electrical parts after the filter change.'),
        o('restart_water_other', 'There\u2019s water or a drip, away from any wiring', '@filter_water_pro', 'A pro checks the drain.', 'Water or a drip seen after the filter change, away from wiring.'),
        o('restart_code_alarm', 'A code, alarm, or warning light shows up', '@filter_code_pro', 'Write it down. A pro takes it from there.', 'A code, alarm, or warning appeared after the filter change.'),
        o('not_sure', 'I\u2019m not sure', '@ice_not_confirmed', 'Leave it Off and check again later.', '')
      ], { diyTier: 'basic' }),

    'ac.cool.power.breaker_reset_gate': n('Breaker panel', 'Before you touch that breaker',
      'A breaker can be Off for a reason. Answer from what you already know; do not touch it while deciding. A first trip, an unknown or intentional shutdown, a prior reset, or an uncertain panel condition needs a professional. A known seasonal Off position has a separate notice before any restoration instructions.', [
        o('breaker_panel_warning', 'There\u2019s a burning smell, smoke, scorch marks, buzzing, or heat at the panel, or water near the panel or where I\u2019d stand', '@breaker_unsafe_stop', 'Stop. Don\u2019t touch it.', 'Panel warning sign reported: burning smell, smoke, scorch marks, buzzing, heat, or water.', { gate: 'breaker_panel_hazard' }),
        o('breaker_tripped_first_time', 'It tripped by itself. Nobody turned it off on purpose, nobody has reset it, and none of the warning signs above are there', '@breaker_off_unexplained_pro', 'A pro takes a first trip until the maker\u2019s own reset caption is on file.', 'Outdoor/AC breaker tripped by itself. Not reset on this check. No panel warning signs reported.'),
        o('breaker_off_seasonal_by_me', 'I turned it off myself for the season, and nothing else is going on', 'ac.cool.power.seasonal_restore_step', 'Review the installer question and notice before any instructions. This is not a reset of a breaker that tripped.', 'Homeowner had turned the outdoor/AC breaker off for the season, and nothing else was going on.'),
        o('breaker_off_on_purpose_or_unknown', 'It\u2019s Off and I don\u2019t know why, or someone turned it off for a reason (a technician, a tag or lock, a storm, a leak, or a smell)', '@breaker_off_unexplained_pro', 'Leave it Off. A pro checks first.', 'Outdoor/AC breaker Off for an unknown or deliberate reason. Left Off.'),
        o('breaker_already_reset', 'Someone already reset it, or it has tripped before, including the last time the equipment started', '@breaker_retrip_pro', 'Don\u2019t reset it again. A pro takes it from here.', 'Outdoor/AC breaker already reset or has tripped before. Not reset again.'),
        o('panel_has_fuses', 'My home has fuses, not breaker handles', '@fuse_panel_pro', 'Leave the fuses alone.', 'Home has a fuse panel. Fuses not touched.'),
        o('not_sure', 'I\u2019m not sure', '@breaker_off_unexplained_pro', 'Leave it alone and call.', ''),
        o('hazard_now', 'New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, refrigerant leak alarm, or water at electrical parts)', '@hp_hazard_now', 'Stop. Don\u2019t keep checking.', 'New hazard reported during the breaker check.', { gate: 'hp_new_hazard' })
      ], { caution: 'Panel door only. The panel\u2019s cover stays on. Use the handle only, and don\u2019t touch anything else inside.', diyTier: 'basic' }),

    'hp.intake.system_confirm': n('Your system', 'Is this an air-source ducted heat pump?',
      'Use what you already know or the equipment manual. Do not remove covers, climb on the outdoor unit, or open the air-handler cabinet to identify it.\n\nThis path covers an air-source heat pump with a separate outdoor unit that can heat and cool, and ducted indoor air through a furnace or air handler.\n\nIt does not cover cooling-only central AC (use the central AC check), water-source or geothermal heat pumps, or packaged rooftop units you cannot confirm as an air-source ducted heat pump. A ductless mini-split has its own check: go back home, press Start, and choose Ductless mini-split.\n\nDo you also have a gas furnace for backup heat? Pick the choice that says so, or the not-sure choice. A short furnace safety check comes first, then the heat-pump check. Gas smell, a carbon monoxide alarm, or furnace combustion work is not DIY. Use Stop / get help.', [
        o('air_source_ducted_hp', 'Air-source ducted heat pump, no gas furnace', 'hp.landing.picker', 'Outdoor unit heats and cools. Air moves through ducts. Backup heat, if any, is electric.', 'Air-source ducted heat pump reported.'),
        o('air_source_hp_gas_furnace', 'Air-source ducted heat pump with a gas furnace for backup heat', { fnGateDone: 'hp.landing.picker', default: 'fn.gate.combustion_co' }, 'Dual-fuel or hybrid. A short furnace safety check comes first, then back to the heat pump.', 'Air-source ducted heat pump with a gas furnace for backup heat reported.'),
        o('air_source_hp_gas_unsure', "Air-source ducted heat pump, and I'm not sure if there's a gas furnace", { fnGateDone: 'hp.landing.picker', default: 'fn.gate.combustion_co' }, 'The furnace safety check comes first, then back to the heat pump.', 'Air-source ducted heat pump; gas furnace backup not confirmed.'),
        o('cool_only_split_ac', 'Cooling-only central AC', '@hp_cool_only_use_ac', 'Use the central AC check, not this path.', 'Cooling-only central AC reported on the heat pump check.'),
        o('mini_split_ductless', 'Ductless mini-split', '@hp_mini_split_oos', 'Not this path.', 'Ductless mini-split reported.'),
        o('water_source_geo', 'Water-source or geothermal', '@hp_water_source_oos', 'Not this path.', 'Water-source or geothermal equipment reported.'),
        o('packaged_or_other', 'Packaged, rooftop, or another system I cannot confirm', '@hp_packaged_oos', 'Out of scope for this check.', 'Packaged or unconfirmed equipment reported.'),
        o('not_sure', 'I am not sure', '@hp_system_unconfirmed', 'Do not open covers to find out.')
      ]),

    'hp.landing.picker': n('What you noticed', 'What is going on with the heat pump?',
      'Pick the closest match. You already passed the safety gate and confirmed an air-source ducted heat pump. Answer only what you know.\n\nIf anything new appears now — gas smell, smoke, sparks, a burning smell, or standing water at electrical equipment — use Stop / get help. Do not keep going.', [
        o('landing_no_heat', 'No heat / not heating enough', 'hp.mode.thermostat_check', 'Mode, Emergency heat, outdoor temperature, and defrost come before any “dead unit” conclusion.', 'Complaint: No heat or not heating enough.'),
        o('landing_no_cool', 'No cool / not cooling enough', 'hp.mode.thermostat_check', 'Mode first, then a leaving-air check.', 'Complaint: No cool or not cooling enough.'),
        o('landing_both_modes_fail', 'Both heat and cool fail', 'hp.mode.thermostat_check', 'After mode is cleared, shared filter and airflow checks are the Basic path.', 'Complaint: Both heat and cool fail.'),
        o('landing_ice_outdoor', 'Ice or heavy frost on the outdoor unit', 'hp.mode.thermostat_check', 'Defrost check later. Do not chip ice.', 'Complaint: Ice or heavy frost on the outdoor unit.'),
        o('landing_short_cycle', 'Short cycling (starts, then stops quickly)', 'hp.mode.thermostat_check', 'Mode and Emergency heat only, then a professional. No deep electrical DIY.', 'Complaint: Short cycling.'),
        o('landing_unusual_noise', 'Unusual noise', 'ac.noise.hazard_screen', 'Hazard screen first, then a professional. No capacitor, contactor, or inverter DIY.', 'Complaint: Unusual noise from the heat pump.')
      ]),

    'hp.mode.thermostat_check': n('Thermostat', 'Mode and call for your complaint',
      'Without opening equipment or pulling the thermostat off the wall, look at the thermostat you already use.\n\n1. What mode is it in right now? (Heat, Cool, Auto, or Emergency Heat. Emergency Heat may say EM Heat, E-Heat, or Aux Heat Only. An AUX light by itself isn’t a mode.)\n2. Is the setpoint in a direction that should actually call?\n   No heat: Heat, with the setpoint a few degrees above the room.\n   No cool: Cool, with the setpoint a few degrees below the room.\n3. Fan Auto or On is fine for this check.\n\nDo not open the furnace or air-handler cabinet. Do not change O/B jumper settings here.\n\nIf the display is blank or unreadable, say so. Do not pry the thermostat apart beyond normal battery access you already know from the manual.', [
        o('mode_auto', 'Mode is Auto', 'hp.mode.force_match_complaint', 'Auto can hide the real complaint. Force Heat or Cool first.'),
        o('mode_emergency_or_aux', 'Mode shows Emergency Heat (EM Heat, E-Heat, or Aux Heat Only), or an AUX light is on', 'hp.mode.emergency_aux_off', 'Next: tell the mode apart from the AUX light.'),
        o('mode_matches_complaint', 'Mode is Heat or Cool and matches my complaint; setpoint should be calling', 'hp.mode.emergency_aux_off', 'Next: confirm Emergency Heat isn’t also selected.', 'Thermostat mode matches the complaint and the setpoint should be calling.'),
        o('mode_wrong_for_complaint', 'Mode is wrong for my complaint (for example Cool when I need heat)', '@hp_mode_wrong_basic', 'Easy setting fix first.', 'Thermostat mode did not match the complaint.'),
        o('tstat_blank_or_unreadable', 'Thermostat is blank or I cannot read the mode', 'ac.tstat.blank.batteries', 'Battery check only. Do not open equipment to find the mode.', 'Thermostat display is blank or unreadable.'),
        o('not_sure', 'I am not sure', '@hp_mode_not_sure', 'Do not guess. Do not pull the thermostat off the wall.')
      ]),

    'hp.mode.force_match_complaint': n('Thermostat', 'Force Heat or Cool',
      'Auto mode can call the wrong thing, which makes a heat pump look like a failed outdoor unit.\n\nWithout opening equipment:\n\n1. Set the mode to Heat if the complaint is no heat, poor heat, or ice in heating season. Set Cool if the complaint is no cool or poor cool.\n2. Move the setpoint 2–3°F past the room temperature in the call direction (above for heat, below for cool).\n3. Wait 5–10 minutes. Longer in very cold weather is fine. Watch from where you already stand. Do not remove covers.\n\nDon’t select Emergency Heat just to get heat faster. It keeps the outdoor unit off and runs only the backup heat.\n\nIf you smell burning or see sparks while waiting, use Stop / get help.', [
        o('forced_problem_gone', 'Forced Heat or Cool — the problem went away', '@hp_auto_fixed_basic', 'Often an Auto or schedule issue, not a sealed-system repair.', 'Forced Heat or Cool and the problem went away.'),
        o('forced_problem_remains', 'Forced Heat or Cool — the problem is still there', 'hp.mode.emergency_aux_off', 'Continue to the Emergency Heat check.', 'Forced Heat or Cool and the problem remains.'),
        o('could_not_change_mode', 'I cannot change the mode', '@hp_thermostat_mode_locked', 'Do not open low-voltage wiring to force it.', 'Thermostat would not accept Heat or Cool.'),
        o('not_sure_waited', 'I am not sure / I did not wait', '@hp_force_not_waited', 'Do not judge the system after a few seconds.')
      ]),

    'hp.mode.emergency_aux_off': n('Thermostat', 'Is Emergency Heat selected?',
      'Two different things can show up on a heat pump thermostat:\n\n- Emergency Heat is a mode someone selects. It may say Emergency, EM Heat, E-Heat, or (on some thermostats) Aux Heat Only. It keeps the outdoor unit off on purpose, and only the backup heat runs. It stays on until someone switches it back.\n- An AUX light, or AUX HEAT ON, that comes on by itself is different. The thermostat is adding backup heat, and the outdoor unit keeps running. That\u2019s normal in cold weather, during a defrost, and after a big jump in the setting. You don\u2019t need to switch it off.\n\nCheck the mode on the display. Don\u2019t open the air handler, and don\u2019t change backup-heat or lockout settings.\n\nIf someone set Emergency Heat on purpose (a technician, or someone at home because the outdoor unit had a problem), leave it on.', [
        o('emergency_was_on_now_off', 'Emergency Heat was on by accident. I\u2019ve set it back to Heat (or Cool)', {
          byHpLanding: { short_cycle: '@hp_short_cycle_after_mode_basics' },
          default: 'hp.ambient.outdoor_band'
        }, 'Wait 10\u201315 minutes, then continue.', 'Emergency Heat was on by accident and was set back to normal Heat or Cool.'),
        o('em_set_on_purpose_by_someone', 'Someone set Emergency Heat on purpose, or I don\u2019t know why it\u2019s on', '@hp_em_intentional_keep', 'Leave it on. A pro checks the outdoor unit.', 'Emergency Heat was set on purpose, or the reason is unknown. Left on.'),
        o('aux_light_only', 'The mode is Heat. Only an AUX light comes on by itself', {
          byHpLanding: { short_cycle: '@hp_short_cycle_after_mode_basics' },
          default: 'hp.ambient.outdoor_band'
        }, 'That\u2019s often normal. Continue.', 'Mode is Heat. An AUX indicator comes on by itself.'),
        o('emergency_already_off', 'Emergency Heat isn\u2019t selected, or my thermostat doesn\u2019t have it', {
          byHpLanding: { short_cycle: '@hp_short_cycle_after_mode_basics' },
          default: 'hp.ambient.outdoor_band'
        }, 'Continue. Short cycling stops here for a professional.', 'Emergency Heat is not selected.'),
        o('not_sure_emergency', 'I can\u2019t tell which one it is', '@hp_emergency_not_sure', 'Don\u2019t open the air handler to find strip wiring.')
      ]),

    'hp.ambient.outdoor_band': n('Outdoor temperature', 'Ballpark only',
      'You do not need a precision thermometer. From what you already know (phone weather, an outdoor thermometer, or how it feels):\n\nMild / warm — well above freezing (roughly above 45°F / 7°C).\nNear freezing — frost possible (roughly 25–40°F / −4–4°C).\nWell below freezing — deep cold (roughly below 25°F / −4°C).\n\nThis is not a balance-point calculation. It only steers whether a normal defrost is plausible, and whether weak heat can be normal capacity drop versus no heat at all.\n\nDo not go outside into unsafe conditions just to answer. If you cannot estimate, say so.', [
        o('band_mild_warm', 'Mild / warm — well above freezing', {
          byHpLanding: {
            ice_outdoor: 'hp.defrost.sanity',
            no_heat: 'hp.heat.cold_home_screen',
            both_modes_fail: 'hp.heat.cold_home_screen'
          },
          default: 'hp.observe.leaving_air_vs_mode'
        }, 'Ice still gets a defrost check. A no-heat or both-modes complaint asks about the house first. Cooling complaints go to the leaving-air check.', 'Outdoor band: mild / warm.'),
        o('band_near_freezing', 'Near freezing — frost possible', {
          byHpLanding: { no_heat: 'hp.heat.cold_home_screen', both_modes_fail: 'hp.heat.cold_home_screen' },
          default: 'hp.defrost.sanity'
        }, 'Defrost check before calling the unit failed. A heating complaint asks about the house first.', 'Outdoor band: near freezing.'),
        o('band_well_below', 'Well below freezing — deep cold', {
          byHpLanding: { no_heat: 'hp.heat.cold_home_screen', both_modes_fail: 'hp.heat.cold_home_screen' },
          default: 'hp.defrost.sanity'
        }, 'A heating complaint asks about the house first.', 'Outdoor band: well below freezing.'),
        o('not_sure_ambient', 'I am not sure', {
          byHpLanding: {
            no_heat: 'hp.heat.cold_home_screen',
            both_modes_fail: 'hp.heat.cold_home_screen',
            ice_outdoor: 'hp.defrost.sanity'
          },
          default: 'hp.observe.leaving_air_vs_mode'
        }, 'A no-heat or both-modes complaint asks about the house first. Ice gets a defrost check. A cooling complaint continues to the leaving-air check.', 'Outdoor temperature band unknown.')
      ]),

    'hp.defrost.sanity': n('Cold weather', 'Could this be a normal defrost?',
      'In heat mode when outdoor air is cold, frost on the outdoor coil can be normal. During automatic defrost, many heat pumps temporarily stop the outdoor fan, make a whoosh, hiss, or steam sound, blow cooler air indoors for a short time, and turn on auxiliary heat while the outdoor coil clears.\n\nA normal defrost usually lasts about 5 to 15 minutes, and some models finish sooner. Ice that is still there after about an hour of running is not normal. Call a licensed HVAC professional.\n\nFrom where you already stand only:\n\nDo not reach into the grille.\nDo not chip ice with tools, screwdrivers, hammers, or hot water.\nDo not remove panels or jump defrost sensors.\n\nNormal frost is light and white, and it clears during a defrost. Not normal: a solid block where you cannot see the coil fins, ice on the top or fan grille, ice building up from the base, or the fan scraping ice.\n\nDoes the outdoor unit recover into normal heat afterward (fan resumes, steam settles, heat returns)?\n\nHeavy ice plus keeping the system running to force heat is not a DIY continue. That can damage the system.\n\nBurning smell, smoke, sparks, or standing water at electrical equipment: Stop / get help.', [
        o('looks_like_defrost_then_recover', 'Looked like defrost, then returned toward normal, and the original problem is gone', '@hp_defrost_recovered_ok', 'Occasional defrost in cold weather can be normal.', 'Defrost-like behavior, then the original problem was gone.'),
        o('defrost_recovered_complaint_remains', 'Looked like defrost and recovered, but the original problem is still there', {
          byHpLanding: { no_cool: 'hp.observe.leaving_air_vs_mode' },
          default: 'hp.heat.capacity_vs_dead'
        }, 'Heat, ice, or both-modes complaints continue to the capacity check. A cooling complaint goes to the leaving-air check.', 'Defrost-like behavior, then the original problem remained.'),
        o('iced_solid_no_recover', 'Outdoor unit is iced solid or stuck and never returns to normal heat', '@hp_ice_heat_outdoor', 'Backup heat, then a pro. Don\u2019t chip the ice.', 'Outdoor unit iced solid and did not recover.'),
        o('not_cold_or_not_applicable', 'Mild weather, no frost behavior, or this does not match', {
          byHpLanding: { no_heat: 'hp.heat.capacity_vs_dead' },
          default: 'hp.observe.leaving_air_vs_mode'
        }, 'Skip the defrost wait.', 'Defrost wait does not apply.'),
        o('want_keep_running_despite_ice', 'There is heavy ice, but I want to keep the system running', 'hp.ice.mode_location', 'Hard stop. Do not chip ice. One question, then the right shutdown steps.', 'Homeowner wanted to keep the heat pump running despite ice.', { gate: 'ice_keep_running' }),
        o('not_sure', 'I am not sure', '@hp_defrost_not_sure', 'Do not force a defrost or open the unit.')
      ], { safetyGate: true, caution: 'Do not chip ice, jump a sensor, or keep the system running through heavy ice.' }),

    'hp.ice.mode_location': n('Ice', "Heating or cooling, and where's the ice?",
      "One answer picks the right shutdown steps.\n\nPick heating or cooling by what you wanted the system to do. Where the ice is tells us the rest.\n\nOutdoor unit: the box outside. Indoor unit: the furnace or air handler inside, plus the pipes at it.\n\nDon't open panels or go out in unsafe weather to check.", [
        o('ice_heat_outdoor', 'Heating — ice is on the outdoor unit', '@hp_ice_heat_outdoor', 'Backup-heat steps next.', 'Ice on the outdoor unit while heating.'),
        o('ice_heat_indoor_only', 'Heating — but the ice is only on the indoor unit or its pipes', '@ice_keep_running', 'Unusual in heat. Shutdown steps, then a pro.', 'Ice only at the indoor unit while heating. It may have been cooling instead.'),
        o('ice_cool_any', 'Cooling — ice on the indoor unit, its pipes, or the outdoor unit', '@ice_keep_running', 'Shutdown and thaw steps next.', 'Ice while cooling (indoor unit, lines, or outdoor unit).'),
        o('ice_mode_unsure_outdoor', 'Not sure which — ice is on the outdoor unit', { byHpAmbient: { near_freezing: '@hp_ice_heat_outdoor', well_below: '@hp_ice_heat_outdoor' }, default: '@ice_keep_running' }, "We'll use the outdoor temperature you gave.", 'Mode unknown. Ice on the outdoor unit.'),
        o('ice_unsure', "I'm not sure", '@ice_keep_running', "We'll show the shutdown steps.", 'Mode and ice location unknown.')
      ], { diyTier: 'pro_only', safetyGate: true, caution: 'No chipping ice, no panels, and no refrigerant or electrical work.' }),

    'hp.heat.cold_home_screen': n('Your home', 'How warm is the house, and who\u2019s home?',
      'Answer from what you already know. You don\u2019t need a thermometer.\n\nIn cold weather, weak heat can be normal for a heat pump, but only if the house is holding steady. If it keeps getting colder, or someone at home is at risk from the cold, that comes first.\n\nThe World Health Organization recommends at least 18 \u00b0C (64 \u00b0F) indoors in cold weather.', [
        o('cold_person_at_risk', 'The house is getting cold, and someone at home is at risk from the cold (an infant, an older adult, or someone who is ill or medically fragile)', '@cold_exposure', 'Get them warm first.', 'Someone at risk from the cold is at home, and the house is getting cold.', { gate: 'cold_exposure_911' }),
        o('cold_home_falling', 'The house keeps getting colder, or it can\u2019t stay above about 64 \u00b0F (18 \u00b0C)', '@hp_cold_home_falling', 'Backup heat, and a pro today.', 'Indoor temperature falling, or below about 64 \u00b0F (18 \u00b0C).'),
        o('cold_home_holding', 'The house is holding steady or slowly warming, and no one is at risk', {
          byHpAmbient: {
            near_freezing: '@hp_weak_heat_deep_cold',
            well_below: '@hp_weak_heat_deep_cold',
            mild_warm: { byHpLanding: { no_heat: 'hp.heat.capacity_vs_dead', both_modes_fail: 'hp.observe.leaving_air_vs_mode' }, default: 'hp.defrost.sanity' },
            unknown: { byHpLanding: { no_heat: 'hp.defrost.sanity', both_modes_fail: 'hp.observe.leaving_air_vs_mode' }, default: 'hp.observe.leaving_air_vs_mode' }
          },
          default: 'hp.defrost.sanity'
        }, 'Continue the heat pump checks.', 'Indoor temperature holding steady. No one at risk from the cold.'),
        o('cold_home_not_sure', 'I\u2019m not sure', '@hp_cold_home_falling', 'We\u2019ll treat it as getting colder.', 'Indoor temperature trend not known.')
      ]),

    'hp.heat.capacity_vs_dead': n('Heat', 'Weak heat in the cold, or no heat at all?',
      'Heat pumps deliver less heat as outdoor air gets colder. That can feel like the system is dying when it is still running and may call auxiliary heat for help.\n\nFrom what you can tell without meters or panel work:\n\nIs there some warm air, or at least air that is not ice-cold, from the supplies after a proper Heat call for 10–15 minutes or more?\nOr does supply air stay at room temperature or cold, with no useful heat?\nIf you know you have electric strips or a gas furnace for backup: does the house warm only when that backup runs, while the outdoor unit stays idle in normal Heat with Emergency Off?\n\nDo not measure strip amps. Do not open sequencers. Do not add refrigerant. Do not declare a bad compressor from this screen.', [
        o('weak_but_some_heat', 'Some heat, but weak — especially in deep cold', {
          byHpAmbient: {
            near_freezing: 'hp.heat.cold_home_screen',
            well_below: 'hp.heat.cold_home_screen',
            mild_warm: 'hp.observe.leaving_air_vs_mode',
            unknown: 'hp.observe.leaving_air_vs_mode'
          },
          default: 'hp.observe.leaving_air_vs_mode'
        }, 'Deep cold asks about the house before any reassurance. Mild or unknown weather continues to the leaving-air check.', 'Some heat, but weak.'),
        o('no_heat_at_all', 'No useful heat — supply air stays cold or at room temperature', 'hp.observe.leaving_air_vs_mode', 'Continue the leaving-air check.', 'No useful heat from the supplies.'),
        o('aux_only_seems_to_heat', 'The house only warms on Aux, Emergency, or the furnace; the outdoor unit stays idle in normal Heat', 'hp.observe.leaving_air_vs_mode', 'Continue the leaving-air check. No strip-amp DIY.', 'Backup heat seems to be the only heat; outdoor unit idle in normal Heat.'),
        o('not_applicable_cool_landing', 'My complaint is cooling only, not a heat-capacity question', 'hp.observe.leaving_air_vs_mode', 'Skip to the leaving-air check.'),
        o('not_sure_capacity', 'I am not sure', 'hp.observe.leaving_air_vs_mode', 'Do not open the air handler to check strips.')
      ]),

    'hp.observe.leaving_air_vs_mode': n('Outdoor unit', 'Leaving air versus the mode that is calling',
      'With the thermostat calling Heat or Cool to match the complaint (not Auto, and Emergency Off), after the unit has been trying for several minutes and is not in an obvious defrost:\n\nFrom where you already stand (no covers off, nothing through the grille):\n\nIf Cool is calling, air leaving the outdoor coil often feels warmer than the surrounding outdoor air.\nIf Heat is calling and the unit is not in defrost, that air often feels cooler than the surrounding outdoor air.\n\nAlso note whether the outdoor unit seems to run at all, or stays silent when it should run.\n\nThis does not prove refrigerant charge or a reversing-valve part. It only sorts a one-mode problem, a both-modes airflow problem, or an outdoor unit that is not running.\n\nO versus B is specific to the manufacturer. Do not assume which way the valve is energized.\n\nBurning smell, sparks, smoke, or water at electrical equipment: Stop / get help.', [
        o('leaving_air_matches_mode', 'Leaving air roughly matches the mode that is calling', 'hp.handback.ac_filter_airflow', 'Not an obvious mode-swap pattern. Shared filter and airflow checks are next. No refrigerant DIY.', 'Outdoor leaving air roughly matched the calling mode.'),
        o('mode_asymmetric_feel', 'One mode feels right; the other blows the wrong-temperature air while the outdoor unit seems to run', 'hp.rv.mode_asymmetric', 'A professional pattern. Not a homeowner valve repair.', 'One mode felt right and the other felt wrong while the outdoor unit ran.'),
        o('outdoor_not_running_when_should', 'Outdoor unit stays silent when Heat or Cool is calling (Emergency Off)', 'ac.cool.power.breaker_visual', 'Breaker door, then disconnect position only, then a professional. No capacitor or contactor DIY.', 'Outdoor unit silent while Heat or Cool was calling.'),
        o('still_in_defrost_or_weird', 'It still looks like defrost, steam, or a stopped fan in the cold', {
          hpDefrostAgain: 'hp.conclude.call_pro_defrost_valve_control',
          default: 'hp.defrost.sanity'
        }, 'One return to the defrost check. A second loop stops for a professional. Do not chip ice.', 'Outdoor unit still looked like defrost.'),
        o('cannot_observe_safely', 'I cannot observe from where I stand / I am not sure', '@hp_cannot_observe', 'Do not force access or remove covers.')
      ], { caution: 'No covers off. This check does not prove refrigerant charge.' }),

    'hp.rv.mode_asymmetric': n('Call a professional', 'One mode works and the other does not',
      'You reported a pattern like one of these while the outdoor unit seemed to run:\n\nCool works, but heat blows cool or room-temperature air.\nHeat works, but cool blows warm air.\nA mode change used to make a brief whoosh or click, and now one mode never feels right.\n\nThat pattern often involves thermostat O/B configuration, outdoor control, or a reversing valve that is not shifting. It is not a homeowner refrigerant repair and not a magnet or jumper trick.\n\nDo not assume whether your brand energizes O or B in heat or cool.\nDo not force the valve with magnets or tools.\nDo not jump safeties or open electrical panels.\nDo not attach gauges or add or remove refrigerant.\n\nIf you recently replaced the thermostat, tell the professional. O/B setting mistakes are common. The outcome of a confirmed pattern is professional-only.', [
        o('asymmetric_pattern_confirmed', 'Yes — one mode is OK and the other is wrong while the outdoor unit runs', 'hp.conclude.call_pro_defrost_valve_control', 'Professional only. No valve force-out and no electrical DIY.', 'Mode-asymmetric pattern confirmed.'),
        o('pattern_not_really_asymmetric', 'On second thought, both modes fail and the outdoor unit does run', 'hp.handback.ac_filter_airflow', 'Shared filter and airflow checks. Not a valve diagnosis.', 'Pattern was not asymmetric; outdoor unit does run.'),
        o('pattern_outdoor_not_running', 'On second thought, the outdoor unit is not running', 'ac.cool.power.breaker_visual', 'Breaker door, then disconnect position only, then a professional. No capacitor or contactor DIY.', 'Outdoor unit is not running.'),
        o('recent_tstat_swap_ob_unsure', 'I replaced the thermostat and I am unsure about O/B', 'hp.conclude.call_pro_defrost_valve_control', 'A professional should verify it. Do not guess jumpers.', 'Thermostat was replaced and O/B is uncertain.'),
        o('not_sure_pattern', 'I am not sure the pattern holds', {
          hpFilterDone: '@hp_rv_pattern_unsure',
          default: 'hp.handback.ac_filter_airflow'
        }, 'If the filter was not checked yet, do that Basic step. Otherwise stop rather than invent a valve diagnosis.', 'Mode pattern uncertain.')
      ], { diyTier: 'pro_only', caution: 'Do not force the reversing valve, jump a safety, or attach gauges.' }),

    'hp.handback.ac_filter_airflow': n('Air filter', 'Shared filter and airflow checks',
      'Mode, Emergency / Aux, outdoor temperature, and defrost are clear enough that the next Basic checks are the filter and, if the vents are weak, returns and supplies.\n\nThe filter screen is the same Basic check used for central AC. It is not permission to do capacitor, contactor, refrigerant, or panel work.\n\nAfter a clean filter, this heat-pump path does not continue to the outdoor fan, debris, or ice checks. Defrost can stop the outdoor fan, so those cooling-only steps would mislead.\n\nIf one mode was wrong while the outdoor unit ran, you should not be here.', [
        o('proceed_ac_filter', 'Continue to the air filter check', 'ac.cool.filter.check', 'Shared Basic filter check.', 'Continuing to the shared filter check.'),
        o('filter_already_done_this_session', 'I already checked or replaced the filter in this session', '@hp_basics_clear_after_filter', 'Mode and filter basics are done. Deeper work is a professional visit.', 'Filter already checked this session.'),
        o('decline_handback', 'Skip — I want a professional without a filter check', '@hp_user_requests_pro_after_mode_clear', 'Allowed stop.', 'Asked for a professional without the filter check.'),
        o('hazard_now', 'New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, refrigerant leak alarm, or water at electrical parts)', '@hp_hazard_now', 'Stop. Do not keep diagnosing.', 'New hazard reported during the heat pump check.', { gate: 'hp_new_hazard' })
      ]),

    'hp.conclude.call_pro_defrost_valve_control': n('Call a professional', 'Defrost, reversing valve, or control',
      'Homeowner Basic checks are no longer the right next step. Common professional buckets for what you described include a failed or stuck defrost, a reversing valve or outdoor control that is not shifting modes, or thermostat O/B configuration after a thermostat swap.\n\nThis is not a confirmed parts diagnosis. It is a reason to stop DIY and get service.\n\nDo not attempt from this guide:\n\nCapacitor or contactor work. Heat-pump Advanced electrical is off.\nInverter board, amp draw, strip sequencers, or the panel interior.\nRefrigerant gauges, charge, or reclaim.\nMagnets, jumping safeties, or forcing the reversing valve.\n\nIf ice was involved: If your thermostat has an Emergency Heat setting, switch to it to keep heat on without the outdoor unit while you wait for a pro. It usually costs more to run. It may be labeled EM Heat, E-Heat, or Aux Heat Only. An AUX light that comes on by itself isn’t the same thing. Otherwise, or if there\u2019s no warm air in 15 minutes, set the thermostat to Off and leave it Off until a licensed HVAC professional has checked the system. If it’s dangerously cold and anyone is at risk, get them somewhere warm first. Never heat with an oven, stove, grill, or generator indoors (carbon monoxide). If you use an electric space heater, plug it straight into a wall outlet, follow its maker’s instructions, and keep it clear of anything that can burn.\n\nCall a licensed HVAC technician. You may tell them: heat-pump mode, Emergency, temperature, and defrost checks only; outdoor iced without recovery and/or one mode wrong; no covers removed; O versus B was not assumed.\n\nSupport: support@secondwrench.co', [
        o('ack_call_pro', 'Understood — call a professional', '@hp_defrost_valve_ob_control', 'Terminal acknowledgment.'),
        o('want_diy_valve_or_electrical_anyway', 'I want to force the valve or do electrical work myself', '@hp_defrost_valve_ob_control', 'Not offered. Advanced electrical is off, and valve force-outs are professional-only.', 'Asked to force the valve or do electrical DIY.'),
        o('want_diy_refrigerant_anyway', 'I want to add refrigerant or use gauges', '@hp_refrigerant_intent', 'Never a DIY step.', 'Asked to add refrigerant or use gauges.', { gate: 'refrigerant_intent' })
      ], { diyTier: 'pro_only', caution: 'No capacitor, contactor, gauges, or reversing-valve force-out. The disconnect step is not a lever lesson.' }),

    'wshp.hazard.flood_electrical': n('Safety first', 'Is any of this happening right now?',
      'Look from where you are. Do not walk into water, touch the unit, or open any cover to check.\n\nGeothermal and water-source systems have water pipes, a pump, and 240-volt power close together. Water and electricity together are dangerous.', [
        o('wshp_hz_smoke_burn_spark', 'Smoke, sparks, fire, or a burning smell', '@fire', 'Stop. Get away from the equipment.', 'Smoke, sparks, fire, or burning smell reported at the water-source hazard screen.', { gate: 'smoke_fire_sparks_burn' }),
        o('wshp_hz_water_electrical', 'Water on or near the unit’s wiring, a power switch, the breaker panel, or the pump box', '@electrical', 'Stay clear. Do not touch anything wet.', 'Water at or near electrical equipment reported.', { gate: 'water_near_electrical' }),
        o('wshp_hz_flooding', 'Water is spraying from a pipe or flooding the floor around the equipment', '@wshp_mech_room_flood', 'Stay out of the water.', 'Spraying water or flooding near the equipment reported.', { gate: 'wet_hands_flood' }),
        o('wshp_hz_breaker_wont_reset', 'A breaker for the heat pump or loop pump keeps tripping or will not stay on', '@wshp_breaker_wont_reset', 'Do not reset it again.', 'Breaker for the unit or pump keeps tripping or will not stay on.', { gate: 'breaker_wont_reset' }),
        o('wshp_hz_gas_co', 'A gas smell or a carbon monoxide alarm', '@gas', 'Leave the building first.', 'Gas smell or CO alarm reported at the water-source hazard screen.', { gate: 'gas_co' }),
        o('wshp_hz_unsure', 'I am not sure', '@uncertain', 'It is OK to stop here.', 'Homeowner unsure whether a hazard is present.', { gate: 'unsure_hazard' }),
        o('wshp_hz_none', 'None of these', 'wshp.entry.equipment_gate', 'Continue to the equipment questions.')
      ], { diyTier: 'basic', safetyGate: true, caution: 'Do not step into water or touch the unit to check.' }),

    'wshp.entry.equipment_gate': n('Your system', 'What kind of water-source or geothermal system is it?',
      'Answer from what you already know, your paperwork, or what you can see from the floor. Do not open covers, go into a well pit or crawlspace, or climb to check.\n\nThis check covers a home heat pump that sits indoors and blows warm or cool air through ducts, using water or loop fluid from pipes.\n\nHow to tell closed loop from open loop (just look — do not touch valves or pipes):\n\n- Closed loop: Two loop pipes go into the floor or wall and come back. There is often a box with one or two pumps on or near the unit (a “flow center” or pump module). The same fluid goes around and around. No water leaves the house. A shared water loop in a condo or apartment building also counts as closed loop.\n- Open loop: The unit uses well water (or lake or pond water). There is often a well pump and a pressure tank feeding it. The used water leaves through a pipe to a pond, ditch, drain tile, or a second well. Your paperwork may say “open loop” or “well water.”\n- Not sure? That is fine. Pick “not sure which loop.”', [
        o('wshp_closed_loop', 'Closed loop (ground loop, pond loop, or a building water loop)', 'wshp.handback.call_pro', 'Sealed pipes, often a pump box near the unit. No water leaves the house.', 'Loop type: closed loop (ground, pond, or building water loop).'),
        o('wshp_open_loop', 'Open loop (well, lake, or pond water)', 'wshp.openloop.chemistry_gate', 'Often a well pump and pressure tank. Used water drains away outside.', 'Loop type: open loop (well, lake, or pond water).'),
        o('wshp_loop_unsure', 'Water-source or geothermal, but I am not sure which loop', 'wshp.handback.call_pro', 'That is OK. A pro can tell.', 'Loop type: homeowner not sure.'),
        o('wshp_air_source', 'Actually, there is an outdoor unit with a big fan', 'hp.intake.system_confirm', 'That is an air-source heat pump. Use the heat pump check.', 'Outdoor unit with a fan reported; switched to the air-source heat pump check.'),
        o('wshp_ductless', 'Actually, it is a ductless mini-split (wall or ceiling units in rooms)', '@wshp_divert_mini_split', 'That is a different check.', 'Ductless mini-split reported at the water-source equipment question.'),
        o('wshp_furnace_combustion', 'The problem is a gas, oil, or propane furnace or boiler', '@wshp_divert_furnace', 'Start again: choose Furnace or air handler for gas, oil, or electric heat; choose Boiler & hydronic heat, for boiler heat.', 'Fuel-burning furnace or boiler problem reported at the water-source equipment question.'),
        o('wshp_out_of_scope_size', 'Something bigger or different: over 6 tons, a business or large building, or it heats water for floors or radiators', '@wshp_out_of_scope_call_pro', 'Outside this beta. A pro is the right next step.', 'Over 6 tons, commercial, or water-to-water system reported.'),
        o('wshp_system_unsure', 'I am not sure what kind of system I have', '@wshp_system_unconfirmed', 'Do not open covers to find out.', 'Homeowner unsure of system type at the water-source equipment question.'),
        o('hazard_now', 'New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, refrigerant leak alarm, flooding, or water at electrical parts)', '@wshp_hazard_now', 'Stop. Do not keep going.', 'New hazard reported during the water-source check.', { gate: 'wshp_new_hazard' })
      ], { diyTier: 'basic', safetyGate: true, caution: 'Look only. Do not open covers, touch valves, or go into a well pit or crawlspace.' }),

    'wshp.openloop.chemistry_gate': n('Open loop', 'Water care is a job for a pro',
      'Open-loop systems run well, lake, or pond water through the unit. Over time, minerals, iron, and slime in that water can build up inside the unit’s water coil and slow it down.\n\nTesting, cleaning, or treating that water — and any work on the well, well pump, or pressure tank — needs a pro who works on open-loop systems. That cleaning job uses special equipment and chemicals.\n\nThis check will not give cleaning, chemical, or well steps. That stays true even if a video, label, or store product suggests one.\n\nThe next screen shows how to leave the system as it is and what to tell the pro.', [
        o('openloop_ack_call_pro', 'Got it — show me what to do and what to tell the pro', '@wshp_openloop_water_quality_pro', 'Same next step for every open-loop problem.', 'Open-loop water-quality gate shown; homeowner acknowledged.', { gate: 'wshp_openloop_chemistry' }),
        o('openloop_want_diy_treatment', 'I want to clean, treat, or work on the water or well myself', '@wshp_openloop_water_quality_pro', 'Not offered. You will get the same pro result.', '', { gate: 'wshp_openloop_chemistry' }),
        o('hazard_now', 'New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, refrigerant leak alarm, flooding, or water at electrical parts)', '@wshp_hazard_now', 'Stop. Do not keep going.', 'New hazard reported during the water-source check.', { gate: 'wshp_new_hazard' })
      ], { diyTier: 'pro_only', safetyGate: true, caution: 'Do not add anything to the well, water lines, or unit. Do not open the well, pressure tank, or loop pipes.' }),

    'wshp.handback.call_pro': n('Call a professional', 'Get a geothermal pro. Here is what to tell them.',
      'In this beta, the water-source check ends with a visit from a pro who works on geothermal or water-source heat pumps. The water loop, pump, refrigerant, and controls all need a trained technician.\n\nPick the main problem. It goes at the top of your service note. Every choice leads to the same next step.\n\nWhile you wait:\n\n- If a light or code is already showing on the unit or thermostat, write it down exactly. Do not reset the system again and again to make it come back.\n- If your thermostat or unit display already shows water temperatures (often called entering and leaving water), write them down. Do not open panels to look.\n- Leave covers on. Leave loop valves, the pump box, and any well equipment alone.', [
        o('wshp_cx_no_heat', 'No heat, or not enough heat', '@wshp_handback_call_pro', '', 'Complaint: No heat or not enough heat (water-source / geothermal).'),
        o('wshp_cx_no_cool', 'No cooling, or not enough cooling', '@wshp_handback_call_pro', '', 'Complaint: No cooling or not enough cooling (water-source / geothermal).'),
        o('wshp_cx_both_weak', 'Heating and cooling are both weak', '@wshp_handback_call_pro', '', 'Complaint: Both heating and cooling weak (water-source / geothermal).'),
        o('wshp_cx_cycle_lockout', 'It starts and stops quickly, or shows a lockout light or code', '@wshp_handback_call_pro', 'Write the light or code down. Do not keep resetting.', 'Complaint: Short cycling or lockout light or code (water-source / geothermal).'),
        o('wshp_cx_noise', 'A new or unusual noise (no burning smell, smoke, or sparks)', '@wshp_handback_call_pro', '', 'Complaint: New or unusual noise, no hazard reported (water-source / geothermal).'),
        o('wshp_cx_small_leak', 'A small drip or leak, away from anything electrical', '@wshp_handback_call_pro', 'Put a towel or pan down only if the floor is dry and it is away from wiring.', 'Complaint: Small drip or leak away from electrical (water-source / geothermal).'),
        o('wshp_cx_other', 'Something else, or I just want a service note', '@wshp_handback_call_pro', '', 'Complaint: Other water-source / geothermal concern; see observations.'),
        o('want_diy_pro_only', 'I want to fix it myself (loop, pump, antifreeze, wiring, or parts)', '@wshp_handback_call_pro', 'Not offered. You will get the same pro result.'),
        o('want_diy_refrigerant_anyway', 'I want to add refrigerant or use gauges', '@wshp_handback_call_pro', 'Never a DIY step.', '', { gate: 'refrigerant_intent' }),
        o('hazard_now', 'New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, refrigerant leak alarm, flooding, or water at electrical parts)', '@wshp_hazard_now', 'Stop. Do not keep going.', 'New hazard reported during the water-source check.', { gate: 'wshp_new_hazard' })
      ], { diyTier: 'pro_only', safetyGate: false, caution: 'No loop, pump, antifreeze, refrigerant, wiring, or panel work from this guide.' }),

    'fn.gate.combustion_co': n('Furnace safety', "Is any of this true right now, or have you already noticed it?",
      "Answer from what you already know. Don't open any furnace door or panel, and don't go look at the flame, to answer this.\n\nNot sure you have a gas furnace? Answer for the whole home.\n\nFor immediate danger, get outside and call 911.", [
        o('gas_smell_or_unknown_smell', "Gas or rotten-egg smell, or a strong smell I can't place", '@fn_gas_smell', 'Leave now. Call from outside.', 'Gas, rotten-egg, or unknown strong smell reported.', { gate: 'gas_co' }),
        o('co_alarm_or_symptoms', 'CO alarm sounding, or headache, dizziness, nausea, or drowsiness, especially in more than one person or pet', '@fn_co_alarm', 'Get to fresh air. Call from outside.', 'CO alarm or possible CO symptoms reported.', { gate: 'co_alarm_or_symptoms' }),
        o('rollout_soot_scorch', "Soot or scorch marks on the furnace, or flame where it shouldn't be", '@fn_rollout_soot', 'Stop using the furnace.', 'Soot, scorch marks, or flame outside the burner area reported.', { gate: 'flame_rollout_soot' }),
        o('burning_smoke_sparks', 'Burning-plastic or electrical smell, smoke, or sparks', '@fn_burning_sparks', 'Move away. Call 911.', 'Burning or electrical smell, smoke, or sparks reported.', { gate: 'smoke_fire_sparks_burn' }),
        o('cold_exposure_risk', "Someone's at risk from the cold (a baby, an older adult, or a medical need)", '@fn_cold_exposure', 'Get them warm first.', 'Someone at risk from the cold.', { gate: 'cold_exposure_911' }),
        o('flame_yellow_orange', "I've already noticed the flame looks yellow or orange", '@fn_flame_abnormal', "Only if you already saw it. Don't go look.", 'Homeowner already noticed a yellow or orange flame.', { gate: 'combustion_flame_abnormal' }),
        o('boom_at_ignition', 'A bang or boom when the furnace starts', '@fn_ignition_bang', 'Stop using the furnace.', 'Bang or boom when the furnace starts reported.', { gate: 'delayed_ignition_bang' }),
        o('unsure', "I'm not sure", '@fn_gate_unsure', 'Not sure means stop.', 'Homeowner was not sure whether a furnace hazard was present.', { gate: 'unsure_hazard' }),
        o('none_of_these', 'None of these', { hpDualFuel: 'hp.landing.picker', default: 'fn.intake.system_confirm' }, 'Continue with look-only checks.')
      ], { safetyGate: true }),

    'fn.intake.system_confirm': n('Your furnace', 'What kind of furnace is it?',
      "Use what you already know, a manual, or a label you can read without opening anything. Don't remove a panel to find out.\n\nPropane counts as gas.", [
        o('gas_furnace', 'Gas furnace (natural gas or propane)', 'fn.landing.picker', '', 'Gas furnace reported.'),
        o('electric_furnace', 'Electric furnace (no gas line to it)', 'fn.landing.picker', '', 'Electric furnace reported.'),
        o('furnace_plus_heat_pump', 'Gas furnace plus an outdoor heat pump (dual-fuel)', 'hp.intake.system_confirm', 'The heat-pump check takes it from here.', 'Gas furnace plus heat pump (dual-fuel) reported.'),
        o('boiler_radiators', 'Boiler, radiators, or radiant floor heat', 'bl.gate.safety', 'The boiler hazard check comes first.', 'Boiler or radiant heat reported.'),
        o('oil_or_other', 'Oil furnace', 'fn.landing.picker', 'Oil heat stays in this check. Wood, pellet, wall, floor, and rooftop equipment need a professional for that equipment.', 'Oil furnace reported.'),
        o('mini_split', 'Ductless mini-split', '@fn_mini_split_oos', 'Use the mini-split check.', 'Ductless mini-split reported on the furnace check.'),
        o('not_sure', "I'm not sure", '@fn_system_unconfirmed', "Don't open panels to find out."),
        FN_HAZARD
      ]),

    'fn.landing.picker': n('What you noticed', "What's going on with the heat?",
      'Pick the closest match. If anything new shows up, like a gas smell, CO alarm, smoke, or a burning smell, pick the last choice.', [
        o('landing_no_heat', 'No heat: nothing seems to happen', 'fn.tstat.mode_setpoint', '', 'Complaint: No heat from the furnace.'),
        o('landing_cold_air', "Blower runs, but the air isn't warm", 'fn.tstat.mode_setpoint', '', 'Complaint: Blower runs but the air is not warm.'),
        o('landing_not_enough_heat', 'Some heat, but not enough', 'fn.tstat.mode_setpoint', '', 'Complaint: Some heat, but not enough.'),
        o('landing_short_cycle', 'Starts, then shuts off quickly or keeps retrying', 'fn.tstat.mode_setpoint', '', 'Complaint: Furnace starts, then shuts off quickly.'),
        o('landing_blank_tstat', 'Thermostat screen is blank', 'ac.tstat.blank.batteries', '', 'Complaint: Thermostat screen is blank.'),
        o('landing_water_near_furnace', 'Water on the floor near the furnace', 'ac.gate.water_near_electrical', 'Safety check first.', 'Complaint: Water near the furnace.'),
        o('landing_unusual_noise', 'An unusual noise', 'ac.noise.hazard_screen', 'Safety check first.', 'Complaint: Unusual noise from the furnace.'),
        o('landing_cooling_problem', "It's actually a cooling problem with my central AC", 'ac.cool.intake.system_confirm', 'The central AC check takes it from here.', 'Cooling problem on a furnace home. Switching to the AC check.'),
        FN_HAZARD
      ]),

    'fn.tstat.mode_setpoint': n('Thermostat', 'Is the thermostat calling for heat?',
      "Look at the thermostat you already use. Don't take it off the wall.\n\n1. Mode is Heat.\n2. Setpoint is a few degrees above the room temperature.\n3. Fan is Auto. On blows room-temperature air between heating cycles, which can feel cold.\n\nSome thermostats wait a few minutes before starting heat.", [
        o('tstat_not_calling', "It wasn't on Heat, or the setpoint was at or below room temperature", '@fn_tstat_set_heat_basic', 'Easy fix first.', 'Thermostat was not calling for heat.'),
        o('fan_on_not_auto', 'Fan was set to On', '@fn_fan_auto_basic', 'Set it to Auto.', 'Thermostat fan was set to On.'),
        o('settings_ok_still_problem', "Heat, setpoint above room, fan Auto, and the problem's still there", 'ac.cool.filter.check', 'Next: the filter.', 'Thermostat set to Heat, setpoint above room, fan Auto; problem remains.'),
        o('tstat_blank', "The screen is blank or I can't read it", 'ac.tstat.blank.batteries', 'Battery check next.', 'Thermostat screen blank or unreadable.'),
        o('cannot_change_settings', "I can't change the settings", 'fn.conclude.call_pro', "Don't pull it off the wall.", 'Thermostat settings could not be changed.'),
        o('not_sure', "I'm not sure", '@fn_tstat_unsure', "Don't guess."),
        FN_HAZARD
      ]),

    'fn.conclude.call_pro': n('Call a professional', 'Time for a licensed pro',
      "You've done the homeowner checks this guide offers. What's left is inside the furnace, and that's work for a licensed HVAC pro.\n\nDon't press reset buttons, keep restarting the furnace, or open any furnace door or panel. If it's acting strangely, set the thermostat to Off.\n\nThe next screen has a note to share with the pro.", [
        o('ack_call_pro', "Got it, I'll call a pro", '@fn_call_pro', ''),
        o('want_diy_anyway', 'I want to fix it myself', '@fn_call_pro', "This guide doesn't offer furnace repairs."),
        FN_HAZARD
      ], { diyTier: 'pro_only' }),

'ms.intake.system_confirm': n('Your system', 'Is this a ductless mini-split with one indoor unit?',
      'Answer from what you already know or the owner’s manual. Don’t remove a cover or climb up to check.\n\nA ductless mini-split has an indoor unit on a wall, floor, or ceiling that blows air straight into the room. There are no vents or ducts. Pipes and a cable run through the wall to a small outdoor unit.\n\nThis check covers cooling and heating problems on a system with one indoor unit and one outdoor unit.', [
        o('ductless_single_zone', 'Ductless mini-split, one indoor unit', 'ms.landing.picker', 'One indoor unit connected to its own outdoor unit.', 'Ductless mini-split with one indoor unit reported.'),
        o('ductless_multi_zone', 'Ductless, but two or more indoor units share one outdoor unit', '@ms_multi_zone_pr2', 'Systems with more than one indoor unit come in a later version.', 'Multi-zone ductless mini-split reported.'),
        o('ducted_central', 'Central AC or a heat pump with vents and ducts', '@ms_use_central_check', 'Use the central AC or heat pump check instead.', 'Ducted central system reported on the mini-split check.'),
        o('window_portable_other', 'Window, portable, through-the-wall, or another kind of unit', '@ms_equipment_oos', 'Not covered here.', 'Window, portable, through-the-wall, or other equipment reported.'),
        o('not_sure', 'I’m not sure', '@ms_system_unconfirmed', 'Don’t open covers to find out.', ''),
        MS_HAZARD
      ]),

    'ms.landing.picker': n('What you noticed', 'What’s going on with the mini-split?',
      'Pick the closest match. Answer only what you know.\n\nIf anything new comes up, like a burning smell, smoke, sparks, or water reaching an outlet or cord, choose the last option.', [
        o('landing_no_cool', 'Not cooling, or not cooling enough', 'ms.controls.mode_setpoint', 'Remote or app settings first, then the filters.', 'Complaint: Mini-split not cooling or not cooling enough.'),
        o('landing_no_heat', 'Not heating, or not heating enough', 'ms.heat.mode_setpoint', 'Remote or app settings first.', 'Complaint: Mini-split not heating or not heating enough.'),
        o('landing_weak_airflow', 'Weak air from the indoor unit while cooling', 'ms.controls.mode_setpoint', 'Settings first, then the filters and anything blocking the air.', 'Complaint: Weak airflow from the indoor unit while cooling.'),
        o('landing_water_at_head', 'Water dripping from or under the indoor unit', 'ms.head.water_observe', 'Electrical safety question first.', 'Complaint: Water dripping from or under the indoor unit.'),
        o('landing_error_code', 'A code or blinking lights on the indoor unit, remote, or app', 'ms.error.capture', 'Write it down. A pro reads it.', 'Complaint: Error code or blinking lights shown.'),
        o('landing_ice_seen', 'Ice or frost on the indoor unit or its pipes', 'ms.ice.stop_observe', 'Stop-and-thaw steps. Don’t chip ice.', 'Complaint: Ice or frost seen on the mini-split.'),
        o('landing_outdoor_unit', 'The outdoor unit: quiet, iced, or still not comfortable', 'ms.outdoor.safe_observe', 'Look from a window or dry ground only.', 'Complaint: Outdoor unit on a ductless mini-split.'),
        o('landing_something_else', 'Something else (a noise or a smell)', 'ms.landing.noise_or_smell', 'Noise and smell have their own look-only questions.', 'Complaint: A noise or a smell from the mini-split.'),
        MS_HAZARD
      ]),

    'ms.controls.mode_setpoint': n('Remote or app', 'Check the settings first',
      'Use the remote, wall control, or app you already use. Don’t open the indoor unit.\n\n1. Mode is Cool (a snowflake on many remotes). If it says Auto, Dry, Fan, or Heat, switch it to Cool for this check.\n2. The temperature is set at least 3°F below the room. In Cool, many units won’t start cooling if the setting is at or above room temperature.\n3. Fan is Auto or High, not Quiet, Silent, or Night.\n4. Timers, Sleep, and app schedules are off for now.\n5. If your remote has Follow Me or I Feel, keep the remote in the same room.\n\nAfter any change, wait 5 to 10 minutes. Many mini-splits run the fan slowly for the first few minutes.\n\nRemote screen blank? You can put in fresh batteries if the battery cover slides off by hand and nothing is cracked or leaking.', [
        o('settings_fixed_now_cooling', 'I changed a setting, and now it’s cooling', '@ms_settings_fixed_basic', 'Simple fix. We’ll show what to watch for.', 'User changed the remote or app settings, and cooling returned.'),
        o('remote_batteries_fixed', 'The remote was dead. Fresh batteries fixed it, and now it’s cooling', '@ms_settings_fixed_basic', 'Only if the cover slid off by hand.', 'User replaced the remote batteries, and cooling returned.'),
        o('settings_right_still_problem', 'Settings are right, and the problem is still there', 'ms.head.filter_path_ok', 'Next: the filters.', 'User set Cool, a setpoint below the room, a normal fan, and no timer. The problem remained.'),
        o('remote_or_unit_not_responding', 'The remote or app won’t change anything, or the indoor unit shows no lights', '@ms_no_response_wave1', 'A pro checks power and controls.', 'Remote or app would not control the unit, or the indoor unit showed no lights.'),
        o('not_sure', 'I’m not sure', '@ms_controls_unsure', 'Don’t guess. Don’t open the unit to find out.', ''),
        MS_HAZARD
      ]),

    'ms.heat.mode_setpoint': n('Heat', 'Set Heat and give it time to warm up',
      'Use the remote, wall control, or app you already use. Don’t open the indoor unit.\n\nIf someone is at risk from the cold (a baby, an older adult, or a medical need) , choose that first.\n\n1. Mode is Heat. A sun marks Heat on many remotes. If it says Auto, Cool, Dry, or Fan, this question asks about that next.\n2. The temperature is set at least 3°F above the room. In Heat, many units won’t start heating if the setting is at or below room temperature.\n3. Fan is Auto or High, not Quiet, Silent, or Night.\n4. Timers, Sleep, and schedules are off for now.\n5. After a change, wait about 10 to 15 minutes. In Heat, the indoor fan may stay off at first so it doesn’t blow cold air.\n\nIf the remote has no Heat setting, say so. Don’t guess that a cooling-only unit can heat.', [
        o('cold_exposure_risk', 'Someone’s at risk from the cold (a baby, an older adult, or a medical need) ', '@ms_cold_exposure', 'Get them warm first.', 'Someone at risk from the cold .', { gate: 'cold_exposure_911' }),
        o('heat_fixed_after_setting', 'I changed a setting, and now it’s heating', '@ms_heat_settings_fixed_basic', 'Simple fix. We’ll show what to watch for.', 'User set Heat, a setting above the room, a normal fan, and no timer. Heating returned.'),
        o('mode_was_auto', 'It was on Auto', 'ms.heat.force_heat', 'Set Heat and wait.', 'Mode was Auto while heat was needed.'),
        o('heat_settings_right_still_problem', 'Heat, a setting above the room, a normal fan, no timer, and the problem is still there', 'ms.heat.defrost_sanity', 'Next: a look at defrost.', 'User set Heat, a setting above the room, a normal fan, and no timer. The problem remained.'),
        o('no_heat_setting_on_remote', 'The remote or app has no Heat setting', '@ms_heat_not_supported', 'It may be cooling-only.', 'Remote or app has no Heat setting.'),
        o('remote_or_unit_not_responding', 'The remote or app won’t change anything, or the indoor unit shows no lights', '@ms_no_response_wave1', 'A pro checks power and controls.', 'Remote or app would not control the unit, or the indoor unit showed no lights.'),
        o('not_sure', 'I’m not sure', '@ms_controls_unsure', 'Don’t guess. Don’t open the unit to find out.', ''),
        MS_HAZARD
      ], { caution: 'If someone is at risk from the cold , that comes first.', safetyGate: true }),

    'ms.heat.force_heat': n('Heat', 'Set Heat, not Auto, and wait',
      'Auto can switch away from Heat. Set the mode to Heat on the remote, wall control, or app.\n\nSet the temperature at least 3°F above the room. Fan on Auto or High. Timers and Sleep off.\n\nWait 10 to 15 minutes. In Heat, the indoor fan may stay off for the first few minutes so it doesn’t blow cold air. That can be normal. Don’t switch modes while you wait.\n\nIf you can’t change the mode, stop. Don’t open the indoor unit.', [
        o('forced_heat_works', 'It’s heating after the wait', '@ms_heat_auto_fixed_basic', 'Leave it in Heat.', 'User set Heat instead of Auto and waited. Heating returned.'),
        o('forced_heat_still_problem', 'I waited, and it still isn’t heating', 'ms.heat.defrost_sanity', 'Next: a look at defrost.', 'User set Heat instead of Auto and waited 10 to 15 minutes. The problem remained.'),
        o('could_not_change_mode', 'I can’t change the mode to Heat', '@ms_no_response_wave1', 'A pro checks the controls.', 'User could not change the mode to Heat.'),
        o('not_sure_waited', 'I’m not sure I waited long enough', '@ms_heat_wait_unsure', 'Wait the full 10 to 15 minutes.', ''),
        MS_HAZARD
      ]),

    'ms.heat.defrost_sanity': n('Heat', 'Is this a normal defrost, or ice that stays?',
      'In Heat, a mini-split sometimes pauses to clear light frost on the outdoor unit. A normal defrost often lasts about 5 to 15 minutes. You may see steam, heating may pause, and you may hear a whoosh. Then heat should return. The remote may not change the mode until that pause ends. Leave it in Heat. Don’t switch modes during the pause.\n\nSteam from the outdoor unit in cold weather is usually that pause. If you aren’t sure it’s steam, or it smells like burning, or it comes from the indoor unit, choose that option.\n\nIce that keeps building, or a unit coated thickly that doesn’t recover after about an hour, is not a normal defrost.\n\nLook from a window or from dry, cleared ground. Don’t reach into the grille. Don’t go out in ice, deep snow, or the dark to get a closer look.\n\nIf the outdoor air is well above freezing and dry, a defrost is unlikely.', [
        o('defrost_then_heat_fine', 'It paused, then heat came back', '@ms_defrost_normal_basic', 'That can be normal.', 'User saw a short pause, then heat returned.'),
        o('defrost_seen_heat_still_weak', 'I saw a short pause or some steam, and heat is still weak', 'ms.head.filter_path_ok', 'Next: the filters.', 'A short defrost was seen, and heat stayed weak.'),
        o('no_frost_or_mild_weather', 'No frost, or it’s mild and dry outside', 'ms.head.filter_path_ok', 'Next: the filters.', 'No outdoor frost seen, or the weather was mild and dry.'),
        o('outdoor_iced_solid_no_recover', 'The outdoor unit is thick with ice, and heat doesn’t come back', '@ms_outdoor_freeze_heat_wave1', 'That’s a pro visit.', 'Outdoor unit stayed thick with ice in heat and did not recover.'),
        o('ice_want_keep_running', 'There’s ice, but I want to keep it running to force heat', '@ms_ice_heat_keep_running', 'Hard stop. Turn it off.', 'Homeowner wanted to keep the iced outdoor unit running for heat.', { gate: 'ice_keep_running' }),
        o('steam_or_smoke_unsure', 'I’m not sure the cloud is steam, or it smells like burning', '@ms_hazard_now', 'Stop. Don’t keep checking.', 'Steam or smoke at the outdoor unit was not confirmed as steam.', { gate: 'ms_new_hazard' }),
        o('not_sure', 'I’m not sure what I saw', '@ms_ice_unclear_or_heat', 'Next steps.', ''),
        MS_HAZARD
      ], { caution: 'No defrost buttons. Don’t chip ice, pour hot water, or use a heat gun. Don’t keep an iced unit running to force heat.', safetyGate: true }),

    'ms.head.filter_path_ok': n('Indoor unit filters', 'Can you reach the filters?',
      'Most mini-splits have washable filters behind the front cover of the indoor unit. Clean them only if all four of these are true:\n\n1. Your owner’s manual shows the filter steps without tools.\n2. The front cover lifts by hand. Nothing needs to be pried, unscrewed, or forced.\n3. You can reach it standing on the floor. If you’d need a ladder, chair, or step stool, stop here.\n4. The manual says to turn the unit off with the remote first. If it says to switch off power at a breaker or switch, stop here. This check doesn’t guide that step.\n\nTurning the unit off with the remote stops it running. It doesn’t cut the power. That’s why you’ll touch only the filters.', [
        o('filter_ok_tool_free_floor', 'Yes to all four', 'ms.head.filter_clean', 'Clean the filters next.', 'Owner’s manual shows a tool-free filter path reachable from the floor.'),
        o('filter_cleaned_recently', 'I cleaned the filters in the last two weeks', 'ms.head.discharge_clear', 'Skip ahead to what’s blocking the air.', 'User reports the filters were cleaned within the last two weeks.'),
        o('filter_needs_ladder', 'It’s mounted high. I’d need a ladder, chair, or step stool', '@ms_filter_inaccessible', 'Don’t climb. A pro can clean them.', 'Indoor unit too high to reach from the floor.'),
        o('filter_needs_tools_or_force', 'The cover needs tools, feels stuck, or the clips might break', '@ms_filter_inaccessible', 'Don’t force it.', 'Filter cover needs tools or force.'),
        o('manual_says_cut_power', 'My manual says to switch off power at a breaker or switch first', '@ms_filter_inaccessible', 'This check stops there.', 'Manual asks for power to be switched off at a breaker or switch before filter cleaning.'),
        o('no_manual_not_sure', 'I don’t have the manual, or I’m not sure', '@ms_filter_path_unconfirmed', 'Don’t guess at clips or covers.', 'Filter steps could not be confirmed from the manual.'),
        MS_HAZARD
      ], { caution: 'No ladders, chairs, or step stools. No tools. Touch only the filters.', safetyGate: true }),

    'ms.head.filter_clean': n('Indoor unit filters', 'Clean the filters the way your manual shows',
      '1. Turn the unit Off with the remote. Wait until the fan stops and the louver closes.\n2. Lift the front cover by hand, the way the manual shows.\n3. Slide the filters out. If the manual says a part shouldn’t get wet, keep it dry.\n4. Vacuum the dust off, or rinse with lukewarm water, never hotter than 104°F (40°C). Use mild soap only if the manual allows it. Don’t wring them.\n5. Let washed filters dry fully in the shade.\n6. Slide them back in and close the cover until it’s fully shut.\n\nRemote Off doesn’t cut the power. Touch only the filters and the cover. Don’t reach past them, and don’t spray anything on the parts inside.\n\nRun it only with the filters in place.', [
        o('cleaned_were_dirty', 'Done. The filters were dusty or dirty', 'ms.head.discharge_clear', 'Next: what’s in front of the unit.', 'User cleaned the indoor-unit filters. They were dusty or dirty.'),
        o('cleaned_looked_clean', 'Done. They looked mostly clean', 'ms.head.discharge_clear', 'Next: what’s in front of the unit.', 'User cleaned the indoor-unit filters. They looked mostly clean.'),
        o('filters_washed_still_drying', 'I washed them, and they’re still drying', '@ms_filter_drying_basic', 'Finish later. We’ll show how.', 'User washed the filters. They were still drying.'),
        o('filter_torn_or_missing', 'A filter is torn, damaged, or missing', '@ms_filter_replace_basic', 'Get the right replacement.', 'Indoor-unit filter torn, damaged, or missing.'),
        o('cover_or_filter_wont_go_back', 'The cover or a filter won’t go back the way it came out', '@ms_filter_inaccessible', 'Don’t force it.', 'Filter or front cover would not go back in place.'),
        o('saw_mold_or_slime', 'I see heavy mold, black buildup, or slime inside', '@ms_head_cleaning_pro', 'Inside cleaning is a pro job.', 'Heavy mold, black buildup, or slime seen inside the indoor unit.'),
        o('saw_ice_behind_filter', 'I see ice or frost behind the filters', 'ms.ice.stop_observe', 'Stop-and-thaw steps next.', 'Ice or frost seen behind the filters.'),
        MS_HAZARD
      ], { caution: 'Remote Off doesn’t cut the power. Touch only the filters and the cover.' }),

    'ms.head.discharge_clear': n('Indoor unit airflow', 'Is anything blocking the air?',
      'Look from the floor. Don’t climb.\n\n1. Curtains, furniture, shelves, or tall plants shouldn’t sit in front of the indoor unit or right under it. Nothing should hang on it or sit on top.\n2. The louver (the flap where the air comes out) should be open. If it’s closed or pointing straight up, use the swing or air-direction button on the remote. Don’t move it by hand.\n\nMove anything that’s in the way.', [
        o('blocker_moved', 'Something was in the way, and I moved it', 'ms.head.airflow_result', 'Next: a 15-minute check.', 'User moved something that was blocking the indoor unit.'),
        o('louver_opened_with_remote', 'The louver was closed or stuck in one spot. The remote fixed it', 'ms.head.airflow_result', 'Next: a 15-minute check.', 'User reset the louver with the remote.'),
        o('nothing_blocking', 'Nothing was blocking it', 'ms.head.airflow_result', 'Next: a 15-minute check.', 'Nothing blocking the indoor unit.'),
        o('louver_stuck_wont_move', 'The louver won’t move with the remote', '@ms_louver_stuck', 'Don’t force it by hand.', 'Louver would not move with the remote.'),
        MS_HAZARD
      ]),

    'ms.head.airflow_result': n('Indoor unit airflow', 'Run it for 15 minutes, then check',
      'Set the mode you need (Cool or Heat), at least 3°F past the room temperature, fan on High. Run it about 15 minutes.\n\nThen stand in front of the indoor unit and feel the air.\n\nIf you see ice or dripping water now, choose that option. Don’t keep it running.', [
        o('improved_ok', 'Better. Strong air at the right temperature now.', '@ms_airflow_improved_basic', 'Basic fix. We’ll show how to keep it that way.', 'Airflow is strong at the right temperature after the basic checks.'),
        o('still_weak_air', 'The air is still weak', '@ms_weak_air_after_basics', 'A pro checks the inside of the unit.', 'Airflow still weak after settings, filters, and clearance checks.'),
        o('air_ok_not_cooling', 'The air is strong, but it isn’t cold, or the room won’t cool', '@ms_no_cool_after_basics', 'A pro checks the system.', 'Airflow strong but not cooling after the basic checks.'),
        o('air_ok_not_heating', 'The air is strong, but the room isn’t warming', 'ms.outdoor.safe_observe', 'Next: a look at the outdoor unit.', 'Airflow strong but not heating after the basic checks.'),
        o('now_ice_or_water', 'Now I see ice or dripping water', 'ms.head.water_observe', 'Next: where the water or melting ice is. Electrical safety comes first.', 'Ice or dripping water appeared during the airflow check.'),
        o('not_sure_result', 'I’m not sure', '@ms_airflow_unsure', 'Don’t open the unit to check.', ''),
        MS_HAZARD
      ]),

    'ms.outdoor.safe_observe': n('Outdoor unit', 'What is the outdoor unit doing?',
      'Look from a window, or from dry, cleared ground. Don’t climb onto the unit, a roof, or a snowbank. Don’t reach into the grille. If the ground is icy, dark, or flooded, choose that you can’t look from where you stand.\n\nA unit that is calling for heat or cool should have the outdoor unit running, except during a short defrost pause.\n\nIf you see water, melt, or ice on or near the outdoor unit’s power box, cord, or outlet, choose that first. Don’t touch it.\n\nSteam in cold weather can be a normal defrost. If you aren’t sure it’s steam, or it smells like burning, choose that option.', [
        o('water_near_outdoor_electrical', 'Water, melt, or ice is on or near the power box, cord, or outlet', '@ms_outdoor_water_electrical', 'Stop. Don’t touch it.', 'Water, melt, or ice on or near the outdoor unit power box, cord, or outlet.', { gate: 'water_near_electrical' }),
        o('outdoor_running_still_problem', 'The outdoor unit is running, and the room still isn’t comfortable', '@ms_outdoor_running_call_pro', 'A pro tests the system.', 'Outdoor unit was running and the room was still not comfortable.'),
        o('outdoor_quiet_while_calling', 'The indoor unit is calling, and the outdoor unit is quiet', '@ms_outdoor_not_running_wave1', 'A pro checks why it’s quiet.', 'Indoor unit was calling and the outdoor unit was quiet.'),
        o('outdoor_thick_ice_heating', 'The outdoor unit is thick with ice while heating', '@ms_outdoor_freeze_heat_wave1', 'That’s a pro visit.', 'Outdoor unit was thick with ice while heating.'),
        o('ice_want_keep_running', 'There’s ice, but I want to keep it running', '@ms_ice_heat_keep_running', 'Hard stop. Turn it off.', 'Homeowner wanted to keep the iced outdoor unit running for heat.', { gate: 'ice_keep_running' }),
        o('outdoor_ice_cooling', 'I see ice while it’s set to Cool', 'ms.ice.stop_observe', 'Stop-and-thaw steps next.', 'Ice seen at the outdoor unit while cooling.'),
        o('steam_or_smoke_unsure', 'I’m not sure the cloud is steam, or it smells like burning', '@ms_hazard_now', 'Stop. Don’t keep checking.', 'Steam or smoke at the outdoor unit was not confirmed as steam.', { gate: 'ms_new_hazard' }),
        o('cannot_observe_safely', 'I can’t see it from where you stand from here', '@ms_outdoor_unsure', 'Don’t go closer.', ''),
        MS_HAZARD
      ], { caution: 'Look only from a window or dry ground. Don’t reach into the grille.', safetyGate: true }),

    'ms.head.water_observe': n('Water', 'Where is the water or melting ice?',
      'Answer from where you’re standing. Don’t step into water, touch the unit, or climb up to look. Don’t go into an attic or crawlspace. Ice that is melting counts as water for this question.\n\nFirst: is any water, or ice that is melting, on or near an outlet, a power cord, a light, a switch, or the unit’s wiring? Or dripping onto anything that plugs in?', [
        o('water_on_electrical', 'Yes, water is on or near something electrical', '@ms_water_electrical', 'Stop. Don’t touch it.', 'Water on or near electrical parts at the mini-split.', { gate: 'water_near_electrical' }),
        o('water_unsure_electrical', 'I can’t tell if it’s near anything electrical', '@ms_unsure_water_electrical', 'Stop. Don’t keep checking.', 'Not sure whether water was near electrical parts.', { gate: 'unsure_water_electrical' }),
        o('water_with_ice', 'Nothing electrical, but I also see ice on the unit or its pipes', 'ms.ice.stop_observe', 'Stop-and-thaw steps next.', 'Water and ice seen. No electrical contact reported.'),
        o('water_drip_away_from_electrical', 'It’s dripping or pooling under the unit, away from anything electrical', '@ms_condensate_leak_wave1', 'Towels down. A pro clears the drain.', 'Water dripping or pooling under the indoor unit, away from electrical parts.'),
        o('water_hidden_or_pump', 'Water is in the wall or ceiling, or a small pump box is beeping or overflowing', '@ms_condensate_leak_wave1', 'Near a light or outlet? Choose the first option.', 'Water in the wall or ceiling, or a condensate pump alarm or overflow.'),
        MS_HAZARD
      ], { caution: 'Water and electricity together is a stop, not a cleanup job.', safetyGate: true }),

    'ms.error.capture': n('Error code', 'Write down the code',
      'Codes help a pro. They aren’t a repair guide. Look from the floor at the indoor unit display, the remote, or the app.\n\n1. Write down the exact letters and numbers, or take a photo. If it’s blinking lights, count the blinks and note which light.\n2. Note what the unit was doing and when it started.\n3. Don’t keep turning it off and on to clear the code. Don’t open the unit to look for it.\n\nSome newer units show a code for a refrigerant leak. If the screen, app, or manual says that, choose the first option.', [
        o('code_refrigerant_leak_alert', 'The screen, app, or manual says it’s a refrigerant leak', '@leak', 'Leave the room. Don’t reset it.', 'Mini-split showed a refrigerant leak alert.', { gate: 'refrigerant_alarm_or_release' }),
        o('code_recorded', 'I wrote down or photographed the code', '@ms_error_code_wave1', 'We’ll package it for a pro.', 'User recorded the error code shown.'),
        o('lights_blinking_pattern', 'It’s blinking lights, and I noted the pattern', '@ms_error_code_wave1', 'We’ll package it for a pro.', 'User noted a blinking-light pattern.'),
        o('code_cleared_after_restart', 'The code went away after the unit restarted', '@ms_error_code_wave1', 'Still worth telling a pro.', 'Error code cleared after a restart.'),
        o('cannot_read_from_floor', 'I can’t read it from the floor', '@ms_error_code_wave1', 'Don’t climb. Check the app or remote.', 'Error code could not be read from the floor.'),
        MS_HAZARD
      ], { caution: 'Codes are for a pro to read. No resets, covers, or meters.', safetyGate: true }),

    'ms.ice.stop_observe': n('Ice', 'Ice on the mini-split: stop and thaw',
      'Ice on a mini-split while it’s cooling isn’t normal. A dirty filter can cause it, and so can problems only a pro can check. Running it iced can damage it.\n\nLook only from where you stand. Don’t open the unit, chip the ice, or go outside in unsafe weather to check.\n\nPick the one that fits best.', [
        o('ice_dripping_near_electrical', 'Melting ice is dripping on or near an outlet, cord, or anything electrical', '@ms_water_electrical', 'Stop. Don’t touch it.', 'Melting ice dripping near electrical parts.', { gate: 'water_near_electrical' }),
        o('ice_want_keep_running', 'There’s ice, but I want to keep it running', '@ms_ice_keep_running', 'Hard stop. Turn it off.', 'Homeowner wanted to keep the mini-split running despite ice.', { gate: 'ice_keep_running' }),
        o('ice_seen_cooling', 'There’s ice or frost on the indoor unit, its pipes, or the pipes at the outdoor unit', '@ms_ice_cooling_wave1', 'Turn it off, let it thaw, call a pro.', 'Ice or frost seen while cooling.'),
        o('ice_outdoor_heating_or_unsure', 'It’s frost on the outdoor unit while heating, or I’m not sure it’s ice', '@ms_ice_unclear_or_heat', 'Next, including what a normal defrost looks like.', 'Outdoor frost while heating, or ice not confirmed.'),
        MS_HAZARD
      ], { caution: 'No chipping ice, no covers, and no refrigerant or electrical work.', safetyGate: true })
  };

  const r = (tier, urgency, title, explanation, actions, avoid, source, outcome, reason, extra = {}) =>
    ({ tier, urgency, title, explanation, actions, avoid, source, outcome, reason, diyTier: extra.diyTier || null, gate: extra.gate || null, continueTo: extra.continueTo || null });

  const results = {
    gas: r('Emergency', 'Leave now · call from outside', 'Get everyone to fresh air.',
      'A gas smell or carbon monoxide alarm takes priority over troubleshooting.',
      ['Leave the building immediately. Do not operate lights, thermostats, appliances, or phones inside.', 'From outside, call 911; for a gas smell, also contact the gas utility’s emergency line. Stay out until responders say you can go back in.'],
      'Do not search for the leak, reset an alarm, or re-enter to switch the AC off.', 'gas',
      'emergency_exit', 'gas_co', { gate: 'gas_co' }),
    fire: r('Emergency', 'Move away · call 911', 'Stop. Treat smoke, sparks, or burning as a hazard.',
      'The source cannot be assessed remotely. Do not stay at the equipment to collect more information.',
      ['Leave the affected area and get others away. For smoke, fire, sparks, or an active burning smell, call 911 from safety.', 'Turn off the power only if you already know which breaker or disconnect switch feeds this equipment, and you can reach it without touching water, opening any panel or box cover (opening the breaker panel’s door is fine), or going near the burning or smoking equipment. Use the handle only. If you can’t, don’t try. Get everyone out and call 911 from outside.', 'Do not return to operate equipment until the hazard has been assessed and the appropriate professional has cleared it.'],
      'Do not stay and troubleshoot, and do not attempt an electrical repair.', 'fire',
      'emergency_exit', 'smoke_fire_sparks_burn', { gate: 'smoke_fire_sparks_burn' }),
    heat: r('Emergency', 'Call 911 now', 'Help the person before the AC.',
      'Confusion, fainting, seizures, or severe illness during heat exposure can require emergency medical care.',
      ['Call 911. Move the person to a cooler place if you can do it without getting closer, begin cooling with cool wet cloths, and follow the dispatcher’s instructions.', 'Stay with the person. Do not delay help while trying to repair the AC.'],
      'Do not leave a seriously ill person alone or wait for a troubleshooting result.', 'heat',
      'emergency_exit', 'heat_illness_911', { gate: 'heat_illness_911' }),
    electrical: r('Stop / professional', 'Keep away · urgent help', 'Do not touch wet or damaged electrical equipment.',
      'Water and damaged wiring create risks that this tool cannot assess.',
      ['Stay clear of standing water and the equipment. Keep other people away.', 'Shut off main power only if you can do it from a dry place away from the water. Otherwise leave and get help.', 'Contact a licensed HVAC professional or electrician. For sparking, smoke, shock, or an immediate danger, call 911 from safety.'],
      'Do not step through water, touch switches on wet equipment, open an electrical cover, or try a reset.', 'electrical',
      'emergency_exit', 'water_near_electrical', { gate: 'water_near_electrical' }),
    leak: r('Stop / professional', 'Leave the affected area', 'Do not reset a refrigerant-leak alarm.',
      'Some systems use automatic leak-mitigation controls. This beta cannot identify the refrigerant, concentration, or alarm cause.',
      ['Move people out of the affected area to fresh air without operating switches or creating ignition sources.', 'Call a licensed HVAC professional with EPA 608 capability from outside the affected area and follow the equipment’s alarm instructions. For breathing trouble or immediate danger, call 911.', 'Do not DIY-seal a leak or add refrigerant.'],
      'Do not turn off a mitigation blower, cycle power, bypass a sensor, use flames, or open refrigerant lines.', 'refrigerant',
      'emergency_exit', 'refrigerant_alarm_or_release', { gate: 'refrigerant_alarm_or_release' }),
    uncertain: r('Stop / professional', 'Do not continue the check', 'Uncertainty is a good reason to stop.',
      'You do not need to approach equipment or guess an answer. This is a hard stop, not a path into DIY.',
      ['Stay away from the equipment and describe what you already observed to a qualified professional.', 'If gas, smoke, an alarm, electrical danger, or serious heat illness may be present, get away and seek emergency help.'],
      'Do not operate equipment or controls just to find out whether a hazard exists.', 'safety',
      'emergency_exit', 'unsure_hazard', { gate: 'unsure_hazard' }),
    unsure_water_electrical: r('Stop / professional', 'Do not continue the check', 'Uncertainty around water and electricity is a reason to stop.',
      'Do not enter standing water or touch equipment to find out.',
      ['Stay clear of the equipment and any wet floor.', 'Call a licensed HVAC professional or electrician and describe what you already saw.', 'If there is sparking, smoke, shock, or you cannot get to a dry place, call 911 from safety.'],
      'Do not mop around equipment and keep diagnosing, and do not touch disconnects or panels with wet hands.', 'electrical',
      'emergency_exit', 'unsure_water_electrical', { gate: 'unsure_water_electrical' }),
    ice_keep_running: r('Stop / professional', 'Hard stop · call a pro', 'Stop. Turn it off and let the ice melt.',
      'Running on ice, or restarting too soon, can hurt the compressor. Melt can cause water damage.',
      ['Set the system to Off at the thermostat.', "No overflow, drips, or ceiling stains? Set the fan to On to thaw faster. Otherwise, use Auto. A fan that won't run may be a safety switch. That's OK.", "Put towels down. Watch the drain pan if visible, and the ceiling below. Don't open panels.", 'Leave cooling off and call a pro.', 'Heat pump only: If your thermostat has an Emergency Heat setting, switch to it to keep heat on without the outdoor unit while you wait for a pro. It usually costs more to run.'],
      "Don't chip or pick at the ice, or use a heat gun or hair dryer.", 'ice',
      'emergency_exit', 'ice_keep_running', { gate: 'ice_keep_running' }),
    hp_ice_heat_outdoor: r('Stop / professional', 'Hard stop · call a pro', 'Stop. Switch to backup heat and call a pro.',
      "Solid ice isn't normal frost. Running on it can cause damage.",
      ['If your thermostat has an Emergency Heat setting, switch to it to keep heat on without the outdoor unit while you wait for a pro. It usually costs more to run.', 'Otherwise, or if there is no warm air in 15 minutes, set the thermostat Off.', 'If the house is getting cold, call a licensed HVAC professional. If it’s dangerously cold and anyone is at risk, get them somewhere warm first.', 'Never heat with an oven, stove, grill, or generator indoors (carbon monoxide). If you use an electric space heater, plug it straight into a wall outlet, follow its maker’s instructions, and keep it clear of anything that can burn.', 'You may brush snow off the base. Never touch the coil or grille.', 'Call a licensed HVAC professional. Mention any roof drip above it. If water is dripping indoors, leave the system Off.'],
      "Don't chip or pick at ice, use hot water, a hose, a heat gun, a hair dryer, or salt, or cover the unit.", 'ice',
      'emergency_exit', 'hp_ice_heat_outdoor', { gate: 'ice_keep_running' }),
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
    out_of_scope_equipment: r('More information needed', 'Not covered in this beta yet', 'This equipment is outside the cooling-only split central AC check.',
      'Window and portable units, packaged systems, and other types are not diagnosed here.',
      ['Hire a technician who works on that type of equipment, or use that manufacturer’s owner guidance.', 'If this is a water-source or geothermal heat pump: Start again, choose Water-source / geothermal heat pump.', 'You can write down an already-known model number yourself. Do not remove a cover or climb to find it.'],
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
    outdoor_cannot_observe: r('More information needed', 'Stop where you can see from where I stand', 'The outdoor fan check needs a view from where you stand.',
      'Do not move closer because of weather, a locked yard, animals, or anything else that makes the area unsafe.',
      ['Stay back. Try again later only from where you already stand if conditions change.', 'If the home still needs cooling and you cannot observe the outdoor unit, call a licensed HVAC professional.'],
      'Do not put fingers or objects through the grille, and do not take covers off.', 'safety',
      'insufficient_info', 'outdoor_cannot_observe'),
    ice_not_confirmed: r('More information needed', 'Do not open covers to look for ice', 'Ice was not confirmed from where you can already see it.',
      'Do not force a cabinet open to answer this.',
      ['If you can already see the lines without removing panels, look again from that same view only.', 'If the home is still not cooling, or you cannot tell whether there is ice, call a licensed HVAC professional rather than opening equipment.'],
      'Do not remove panels or chip at anything to check for ice.', 'ice',
      'insufficient_info', 'ice_not_confirmed'),
    outdoor_listen_unsure: r('More information needed', 'Do not force a closer listen', 'Silent versus hum was not clear from where you already stand.',
      'Do not take covers off or put anything through the grille to decide.',
      ['Stay back. If you later can tell from where you already stand, start a new check.', 'If cooling is needed and you still cannot tell, call a licensed HVAC professional.'],
      'Do not open the electrical compartment to identify the sound.', 'safety',
      'insufficient_info', 'outdoor_listen_unsure'),
    tstat_batteries_unsure: r('More information needed', 'Do not open equipment to find out', 'The battery check needs a clearer answer.',
      'Do not pull the thermostat off the wall or open the furnace board to decide.',
      ['Use the thermostat manual to see whether the face is meant for homeowner battery access.', 'If you still cannot tell, call a licensed HVAC professional.'],
      'Do not pull thermostat wiring to test for power, and do not open the breaker panel.', 'safety',
      'insufficient_info', 'tstat_batteries_unsure'),
    unusual_noise_early: r('Stop / professional', 'Stop cooling if you can · call a pro', 'A new or concerning sound needs a professional.',
      'This check does not name a failed part from a sound. Screeching, grinding, or metal-on-metal means stop and call. An electrical buzz with heat or a burning smell belongs in the safety stop, not in more DIY.',
      ['If you can do it without getting closer, set the system to Off at the thermostat and stay away from the fan and electrical covers.', 'Call a licensed HVAC professional. Tell them what you heard and whether the fan was moving.', 'If you also smell burning or see smoke or sparks, get to safety and call 911. Do not keep troubleshooting.'],
      'Do not open covers, spin the fan, or order a part from the sound alone.', 'safety',
      'call_pro', 'unusual_noise_early'),
    weak_airflow_after_filter: r('Professional guidance', 'Arrange HVAC service', 'Weak airflow with a clean filter needs a professional.',
      'A filter that already looks clean does not explain weak airflow. Further airflow checks are not part of this step.',
      ['Leave cooling Off if the system is running and airflow is weak.', 'Call a licensed HVAC professional. Tell them the filter looked clean or was recently replaced and the vents are still weak.'],
      'Do not remove the filter to test airflow, open the blower cabinet, or keep running cooling with no air moving.', 'maintenance',
      'call_pro', 'weak_airflow_after_filter'),
    filter_inaccessible: r('Professional guidance', 'Do not force the filter open', 'Skip a filter check you cannot do.',
      'This guide does not add panel-removal steps.',
      ['Leave the filter access alone.', 'Call a licensed HVAC professional and tell them you could not reach the filter.'],
      'Do not open sealed cabinets, reach into the blower, or remove panels you are unsure about.', 'maintenance',
      'call_pro', 'filter_inaccessible'),
    outdoor_inaccessible: r('Professional guidance', 'Do not force access', 'The outdoor unit cannot be reached.',
      'There is no DIY step that starts by forcing your way to the unit.',
      ['Call a licensed HVAC professional and tell them the outdoor unit is inaccessible.', 'Stay out of unsafe areas, including locked equipment yards, roofs, or anywhere you would need to climb.'],
      'Do not climb, remove covers, or reach through a grille.', 'safety',
      'call_pro', 'outdoor_inaccessible'),
    outdoor_silent_will_not_start: r('Professional guidance', 'Arrange HVAC service', 'The outdoor unit is silent while cool is calling.',
      'Basic visuals are exhausted, or they could not be done. A breaker that looks On and a disconnect that appears On, while the outdoor unit stays silent, is a professional visit. If you could not see either one, stop there.',
      ['Leave cooling Off if you can set that from the thermostat.', 'Call a licensed HVAC professional. Tell them the outdoor unit is silent while the thermostat is calling for cool, and what you could see at the breaker door and the outdoor disconnect (On, Off, or not visible).', 'If the thermostat display is blank, you can start a new check and choose Blank thermostat for the battery step. Do not open the furnace board or the breaker interior.'],
      'Do not operate the disconnect. Do not open the panel interior, pull a fuse, or start capacitor work from this path.', 'electrical',
      'call_pro', 'outdoor_silent_will_not_start'),
    cooling_not_established_basics_clear: r('Professional guidance', 'Arrange HVAC service', 'Air may be moving, but cooling is not established.',
      'Mode, filter, and outdoor fan were in the checks you could do, and no ice was seen. That still does not prove the sealed system is working.',
      ['Set cooling to Off from the thermostat if it keeps running without useful cooling.', 'Call a licensed HVAC professional. Report that the basic checks were done and you did not see ice.'],
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
    tstat_inaccessible: r('Professional guidance', 'Do not force the thermostat face off', 'Battery access is not clear enough to do.',
      'If you are unsure the face is meant to come off, stop.',
      ['Leave the thermostat on the wall.', 'Call a licensed HVAC professional and tell them the display is blank and you could not reach the batteries.'],
      'Do not pry the thermostat off, and do not expose wiring to check.', 'safety',
      'call_pro', 'tstat_inaccessible'),
    suspected_capacitor_contactor_advanced_off: r('Professional guidance', 'Call a licensed HVAC professional', 'Suspected start components — not a homeowner repair in this beta.',
      'A hum or buzz at the outdoor unit while the fan is not spinning is a common reason a technician checks the outdoor contactor and capacitor. This is not a confirmed parts diagnosis. Advanced DIY is off, so this guide will not walk through capacitor or contactor work.',
      ['Set the thermostat to Off and leave it Off until a licensed HVAC professional has checked the system.', 'Call a licensed HVAC technician.', 'You may tell them: the outdoor unit hummed or showed start symptoms while the condenser fan was not spinning, and you did not remove covers.'],
      'Do not discharge or replace a capacitor, replace a contactor, or do any cover-off electrical work from this guide.', 'safety',
      'call_pro', 'suspected_capacitor_contactor_advanced_off', { diyTier: 'pro_only' }),
    professional: r('Professional guidance', 'Arrange HVAC service', 'You have enough to stop and call.',
      'Stop / get help ends the DIY path. The answers so far do not establish a failed part.',
      ['Use the note below to explain what you actually observed.', 'If operation is abnormal, leave the system Off. Get urgent help for any new hazard.'],
      'Do not buy parts on a guess, open electrical covers, bypass a safety, or handle refrigerant.', 'safety',
      'call_pro', 'stop_cleared_no_hazard'),
    mode_setpoint_basic: r('Basic homeowner check', 'Adjust the thermostat, then retest', 'Set Cool and a lower setpoint.',
      'The mode was not Cool, or the setpoint was at or above the room temperature. Fix that before any other check.',
      ['Set the system mode to Cool (not Heat, Off, or Emergency Heat).', 'Lower the setpoint several degrees below the room temperature. Fan Auto or On is fine.', 'Wait and retest, often 10–15 minutes. If it still does not cool with mode and setpoint correct, start a new check and continue from the filter.'],
      'Do not pull the thermostat off the wall or change wiring.', 'maintenance',
      'next_step', 'mode_setpoint_basic', { diyTier: 'basic' }),
    filter_replace_basic: r('Basic homeowner check', 'Replace the filter, then retest', 'The filter looks dirty or clogged.',
      'Use the correct size and type. This is a Basic homeowner step, not an electrical repair.',
      ['With the thermostat Off, slide the old filter out and the new one in, airflow arrow pointing toward the unit.', 'Set the system to Cool and retest after 15–30 minutes.', 'If weak airflow or no cooling remains after a clean, new filter, call a licensed HVAC professional. Do not move on to electrical parts.'],
      'Do not run the system for long with no filter, and do not open sealed electrical compartments.', 'maintenance',
      'next_step', 'filter_dirty_clogged', { diyTier: 'basic' }),
    filter_missing_basic: r('Basic homeowner check', 'Install the correct filter', 'No filter is installed.',
      'Running a long time without a filter is not a fix.',
      ['Install a correctly sized filter.', 'Do not run the system long-term without a filter.', 'Retest cooling and airflow after the filter is in place.'],
      'Do not guess a size, stack filters, or open sealed cabinets to force a fit.', 'maintenance',
      'next_step', 'filter_missing', { diyTier: 'basic' }),
    ice_thaw_basic: r('Basic homeowner check', 'Turn the system Off and let the ice thaw', 'Ice or heavy frost needs a thaw, not a harder run.',
      'Melting the ice is not a repair of the cause. If ice comes back, or the home still does not cool, that is a professional visit (metering, refrigerant, and deeper airflow stay with a licensed tech).',
      ['Set the thermostat to Off. Raising the setpoint is not enough.', 'Let the ice thaw naturally. Do not chip it. Keep people clear of meltwater and electrical equipment.', 'If you have not already checked the filter, check or replace it when you can do that without opening anything.', 'After a full thaw (often hours), set Cool again and retest. If ice returns, or the home still does not cool, call a licensed HVAC professional.'],
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
    breaker_reset_basic: r('Basic homeowner check', 'One reset only', 'Reset that breaker one time only.',
      'A breaker that tripped once can be reset one time. If it trips again, it’s protecting against a fault, and that’s a job for a licensed HVAC professional or electrician.',
      ['Set the thermostat to Off first.',
       'Stand on a dry floor with dry hands. Leave the panel’s cover on, and touch only the handle of that one breaker.',
       'Push the handle fully to Off, then fully to On. Do this once.',
       'Wait 15 minutes. Then set the thermostat back to the mode you were using and listen for the outdoor unit.',
       'If the breaker trips again, right away or the next time the equipment starts, don’t reset it again. Leave it Off and call a licensed HVAC professional or electrician.',
       'If it stays On and the outdoor unit is still silent, continue to the outdoor disconnect check. That step only asks what you can already see. Don’t touch the disconnect or any fuses.'],
      'Don’t reset it more than once, hold the handle On, swap breakers, remove the panel cover, reset a breaker you can’t identify, or touch fuses or the outdoor disconnect.', 'electrical',
      'next_step', 'breaker_reset_basic', { diyTier: 'basic', continueTo: 'ac.cool.power.disconnect_visual' }),
    debris_past_grille_pro: r('Professional guidance', 'Arrange HVAC service', 'Debris inside the grille needs a pro.',
      'Clearing debris inside the outdoor unit means reaching past the grille, near the fan and coil. That\u2019s a job for a licensed HVAC professional.',
      ['Set the thermostat to Off. Then clear only what\u2019s on the outside and what you can reach from the ground: leaves on top, and grass, leaves, or stored items against the sides. Use your hands or a soft brush, from outside the grille.',
       'When you\u2019re done, if the home was still cooling, you can set the thermostat back to Cool until the visit. If it wasn\u2019t cooling, leave it Off.',
       'Call a licensed HVAC professional. Tell them debris is packed inside the grille and that you didn\u2019t reach in or remove anything.'],
      'Don\u2019t put hands, tools, a hose, or a vacuum through the grille. Don\u2019t remove the grille, guard, or top, and don\u2019t switch the outdoor power off to reach in.', 'maintenance',
      'call_pro', 'debris_past_grille_pro'),
    filter_water_pro: r('Professional guidance', 'Arrange HVAC service', 'Water after a filter change needs a look.',
      'Water can come from a blocked drain or melting ice. A pro can check the drain.',
      ['Set the thermostat to Off.',
       'Put towels or a pan under the drip if you can reach it without opening anything.',
       'Call a licensed HVAC professional. Tell them where the water was and that you just changed the filter.'],
      'Don\u2019t open panels or touch wiring, and don\u2019t run the system to see if the drip stops.', 'maintenance',
      'call_pro', 'filter_water_pro'),
    filter_code_pro: r('Professional guidance', 'Arrange HVAC service', 'Note the code and call a pro.',
      'A code or alarm right after a restart is the system telling a pro something.',
      ['Write down or photograph the exact code or message.',
       'Set the thermostat to Off. If the message says refrigerant leak, don\u2019t change anything: leave the area and choose Stop / get help.',
       'Call a licensed HVAC professional and give them the code.'],
      'Don\u2019t clear the code, reset the system, or open any panels.', 'maintenance',
      'call_pro', 'filter_code_pro'),
    cold_exposure: r('Emergency', 'Get them warm first', 'Get the person warm first.',
      'Someone at risk from the cold matters more than the equipment.',
      ['If anyone is confused, very drowsy, hard to wake, or shivering hard and can\u2019t stop, call 911.',
       'Move them to the warmest room, or to a warm place outside the home.',
       'If you use an electric space heater, plug it straight into a wall outlet, follow its maker\u2019s instructions, and keep it clear of anything that can burn. Never heat with an oven, stove, grill, or generator indoors.',
       'Call a licensed HVAC professional once everyone is warm.'],
      'Don\u2019t open equipment, and don\u2019t use fuel-burning heaters indoors.', 'heat',
      'emergency_exit', 'cold_exposure_911', { gate: 'cold_exposure_911' }),
    hp_cold_home_falling: r('Professional guidance', 'Call a pro today', 'The house is getting colder. Call a pro today.',
      'When a heat pump can\u2019t keep the house from cooling off, waiting it out isn\u2019t the answer. Backup heat and a same-day visit are.',
      ['If your thermostat has an Emergency Heat setting, switch to it to keep heat on without the outdoor unit while you wait for a pro. It usually costs more to run. It may be labeled EM Heat, E-Heat, or Aux Heat Only. An AUX light that comes on by itself isn\u2019t the same thing.',
       'Call a licensed HVAC professional today. Tell them the house keeps getting colder and what the outdoor unit is doing.',
       'If it\u2019s dangerously cold and anyone is at risk, get them somewhere warm first.',
       'If you use an electric space heater, plug it straight into a wall outlet, follow its maker\u2019s instructions, and keep it clear of anything that can burn. Never heat with an oven, stove, grill, or generator indoors.',
       'To help protect pipes, open cabinet doors under sinks on outside walls.',
       'If anyone becomes confused, very drowsy, or hard to wake, call 911.'],
      'Don\u2019t chip ice, open the air handler, or change backup-heat or lockout settings.', 'heat',
      'call_pro', 'hp_cold_home_falling'),
    hp_em_intentional_keep: r('Stop / professional', 'Leave Emergency Heat on \u00b7 call a pro', 'Leave Emergency Heat on for now.',
      'Emergency Heat may be on for a reason: a technician left it on, or the outdoor unit is iced over, damaged, or not running. If so, it may be what\u2019s keeping the house warm, and switching back to Heat could leave you without enough heat or run a damaged unit. If you\u2019re not sure why it\u2019s on, leave it on until you know. Emergency Heat costs more to run, so get the heat pump checked soon.',
      ['Leave the thermostat on Emergency Heat.',
       'Call the technician or installer who last worked on your system, or a licensed HVAC professional. Ask whether Emergency Heat should stay on, and tell them what the thermostat shows and what the outdoor unit looks like from a window.',
       'If the house is getting cold, call a licensed HVAC professional. If it\u2019s dangerously cold and anyone is at risk, get them somewhere warm first.',
       'Never heat with an oven, stove, grill, or generator indoors.'],
      'Don\u2019t switch back to Heat until your technician or a licensed HVAC professional says it\u2019s OK. Don\u2019t change backup-heat, lockout, or balance-point settings, and don\u2019t clear ice from the outdoor unit yourself.', 'heat',
      'call_pro', 'hp_em_intentional_keep'),
    breaker_seasonal_restore_basic: r('Basic homeowner check', 'Turn it back on, then wait', 'Turn the breaker back on, then give it time.',
      'After a long time off, some outdoor units need power for a while before they run, so the compressor is ready to start. Your manual says how long.',
      ['Set the thermostat to Off.',
       'Stand on a dry floor with dry hands. Leave the panel\u2019s cover on, and push that one handle fully to On, once.',
       'Wait 24 hours after turning the power back on before you run cooling. If it’s urgent, wait as long as you can.',
       'Then set it back to the mode you want and listen for the outdoor unit.',
       'If the breaker trips, right away or the next time the equipment starts, don\u2019t reset it. Leave it Off and call a licensed HVAC professional or electrician.'],
      'Don\u2019t switch it more than once, remove the panel cover, switch a breaker you can\u2019t identify, or touch fuses or the outdoor disconnect.', 'electrical',
      'next_step', 'breaker_seasonal_restore_basic', { diyTier: 'basic', continueTo: 'ac.cool.power.disconnect_visual' }),
    breaker_off_unexplained_pro: r('Professional guidance', 'Leave it Off \u00b7 call a pro', 'Leave that breaker Off for now.',
      'A breaker that\u2019s Off for an unknown or deliberate reason may have been turned off to protect someone or to protect the equipment.',
      ['Leave the breaker as it is and close the panel door.',
       'Ask anyone at home whether they turned it off, and why.',
       'Call a licensed HVAC professional or electrician. Tell them the outdoor/AC breaker was Off and what you know about why.'],
      'Don\u2019t turn it on to test it, remove a tag or lock, or open the panel cover.', 'electrical',
      'call_pro', 'breaker_off_unexplained'),
    breaker_retrip_pro: r('Stop / professional', 'Don\u2019t reset it again', 'A breaker that trips again is a stop sign.',
      'A breaker that trips more than once is protecting the wiring or the equipment from a fault. Resetting it again can make things worse.',
      ['Leave the breaker Off. Don\u2019t reset it again.',
       'Set the thermostat to Off.',
       'Call a licensed HVAC professional or electrician. Tell them the outdoor/AC breaker tripped again after a reset.'],
      'Don\u2019t reset it again, hold it On, swap breakers, or open the panel cover.', 'electrical',
      'emergency_exit', 'breaker_retrip', { gate: 'breaker_wont_reset' }),
    fuse_panel_pro: r('Professional guidance', 'Leave fuses alone \u00b7 call a pro', 'Don\u2019t replace or touch fuses.',
      'Fuses aren\u2019t part of this check. A blown fuse can have a cause a licensed electrician or HVAC professional should find.',
      ['Set the thermostat to Off.',
       'Leave the fuses as they are and close the panel door.',
       'Call a licensed HVAC professional or electrician. Tell them the equipment has no power and your home has fuses.'],
      'Don\u2019t remove, replace, or swap fuses, and don\u2019t open the fuse panel cover or the outdoor disconnect.', 'electrical',
      'call_pro', 'fuse_panel'),

    weak_airflow_after_returns_supplies: r('Professional guidance', 'Arrange HVAC service', 'Airflow is still weak after the simple blockers were checked.',
      'Furniture, rugs, closed vents, and a clean filter do not explain it. Duct changes and blower-cabinet work are not part of this step.',
      ['Leave returns and supplies as they are. Do not start duct work.', 'Call a licensed HVAC professional. Tell them the filter looked clean and returns or supplies were checked for furniture, rugs, and closed vents.'],
      'Do not cut ducts, open a chase, or run the system for long with almost no air moving.', 'maintenance',
      'call_pro', 'weak_airflow_after_returns_supplies'),
    airflow_check_inaccessible: r('Professional guidance', 'Do not force the vents', 'Returns or supplies could not be checked.',
      'There is no step here that starts by forcing access.',
      ['Leave the grilles alone.', 'Call a licensed HVAC professional and tell them airflow is weak and you could not check the returns and supplies.'],
      'Do not pull registers into a chase or open the blower cabinet.', 'maintenance',
      'call_pro', 'airflow_check_inaccessible'),
    duct_work_rejected_not_basic: r('Professional guidance', 'Duct and blower work stays with a professional', 'Cutting ducts, opening a chase, or reaching the blower is not a Basic step.',
      'This guide stops at furniture, rugs, and registers you can already reach.',
      ['Do not cut or seal ducts from this result.', 'Call a licensed HVAC professional and describe the weak airflow.'],
      'Do not open the blower cabinet or modify ductwork.', 'maintenance',
      'call_pro', 'duct_work_rejected_not_basic'),
    cannot_identify_ac_breaker: r('Professional guidance', 'Do not guess the breaker', 'The outdoor/AC breaker is not identified.',
      'Resetting the wrong breaker does not make a silent outdoor unit all right to keep testing.',
      ['Close the panel door. Do not remove the deadfront.', 'Call a licensed HVAC professional or electrician. Tell them the outdoor unit is silent while the thermostat is calling and you could not tell which breaker feeds it.'],
      'Do not flip breakers to see what happens, and do not open the panel interior.', 'electrical',
      'call_pro', 'cannot_identify_ac_breaker'),
    breaker_unsafe_stop: r('Emergency', 'Move away · call from safety', 'Don’t touch that panel.',
      'A burning smell, smoke, scorch marks, buzzing, heat, or water at an electrical panel can mean a fault this check can’t assess.',
      ['Don’t touch the panel, the breakers, or anything near it. Keep everyone away.',
       'If there’s smoke, fire, sparks, or a burning smell, get everyone out and call 911 from outside.',
       'Otherwise, call a licensed electrician right away and tell them what you saw at the panel.'],
      'Don’t switch any breaker, open the panel, or touch it with wet hands.', 'electrical',
      'emergency_exit', 'breaker_panel_hazard', { gate: 'breaker_panel_hazard' }),
    panel_interior_rejected: r('Professional guidance', 'The panel interior is not a homeowner step', 'Removing the deadfront is not part of this guide.',
      'Bus bars and the inside of the panel stay with a licensed electrician.',
      ['Leave the deadfront on. Close the door if it is open and you can close it.', 'Call a licensed electrician or HVAC professional.'],
      'Do not remove the deadfront, probe the panel, or touch terminals.', 'electrical',
      'call_pro', 'panel_interior_rejected', { gate: 'high_voltage_intent' }),
    outdoor_disconnect_appears_off: r('Professional guidance', 'The disconnect appears Off — do not operate it', 'From dry ground, the outdoor disconnect looks Off. That can explain a silent outdoor unit.',
      'This guide does not tell you to flip the lever, open the door, or pull a fuse. A licensed person restores that and continues the diagnosis.',
      ['Stay back from the box. Leave the handle as you found it.', 'Call a licensed HVAC professional or electrician. Tell them the outdoor unit is silent while the thermostat is calling and the disconnect appeared Off from a visual look only.'],
      'Do not flip the lever, open the disconnect door, or pull a fuse block.', 'electrical',
      'call_pro', 'outdoor_disconnect_appears_off'),
    disconnect_visual_inaccessible: r('Professional guidance', 'Do not force a closer look', 'Off/On on the outdoor disconnect could not be seen from dry ground.',
      'There is no step that starts by moving closer through a wet, damaged, or blocked approach.',
      ['Stay back.', 'Call a licensed HVAC professional and tell them the outdoor unit is silent and you could not see the disconnect position.'],
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
      ['Leave covers on.', 'Call a licensed HVAC professional. Tell them the outdoor unit is silent while the thermostat is calling and you did not remove covers.'],
      'Do not remove an electrical cover from this result.', 'electrical',
      'call_pro', 'high_voltage_intent', { gate: 'high_voltage_intent' }),
    noise_burning_sparks_smoke: r('Emergency', 'Move away · call from safety', 'Burning, sparks, smoke, or fire is not a noise diagnosis.',
      'Stop troubleshooting. Do not stay at the equipment to listen again.',
      ['Get people away from the equipment. If smoke or fire continues, leave and call 911 from safety.', 'Turn off the power only if you already know which breaker or disconnect switch feeds this equipment, and you can reach it without touching water, opening any panel or box cover (opening the breaker panel’s door is fine), or going near the burning or smoking equipment. Use the handle only. If you can’t, don’t try. Get everyone out and call 911 from outside.', 'After the hazard is handled, a licensed HVAC professional can inspect the equipment. Do not restart it to hear the noise again.'],
      'Do not keep the system running, open covers, or keep diagnosing the sound.', 'fire',
      'emergency_exit', 'burning_smell', { gate: 'burning_smell' }),
    grinding_metal_noise: r('Stop / professional', 'Turn it Off if you can · call a pro', 'Grinding metal-on-metal needs a professional.',
      'Do not keep it running to hear the sound more clearly, and do not take a cover off to find the part.',
      ['If you can do it without getting closer, set the thermostat to Off and stay away from the fan and electrical covers.', 'Call a licensed HVAC professional. Tell them you heard grinding metal-on-metal and whether the fan was moving.', 'If sparks, smoke, or a burning smell show up with the grind, get to safety and call 911.'],
      'Do not open covers, spin the fan by hand, or order a part from the sound.', 'safety',
      'call_pro', 'grinding_metal_noise', { gate: 'grinding_metal_noise' }),
    unusual_noise_unresolved: r('Professional guidance', 'This noise is not a homeowner parts path', 'The sound is not the outdoor hum with Cool calling and the fan stopped.',
      'Indoor noise, rattles, screeches, outdoor noise while the fan spins, and sounds you cannot place all stop here. This check does not name a failed part from a sound.',
      ['If you can do it without getting closer, set the system to Off.', 'Call a licensed HVAC professional. Describe what you heard and whether the outdoor fan was spinning.', 'If you later smell burning or see smoke or sparks, get to safety and call 911. Do not return to this check.'],
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
    cannot_kill_power: r('Professional guidance', 'Stop — power cannot be verified Off', 'Any step that needs power Off waits until someone can kill power and verify Off.',
      'Do not open a compartment, touch a capacitor, or keep going on a guess.',
      ['Leave covers on and leave the equipment alone.', 'Call a licensed HVAC professional or electrician. Tell them you could not kill power or verify Off.'],
      'Do not open electrical covers or touch capacitor terminals.', 'electrical',
      'call_pro', 'cannot_kill_power', { gate: 'cannot_kill_power' }),
    wet_hands_flood_stop: r('Stop / professional', 'Get to dry ground', 'Wet hands, flooding, or rain at the equipment is a reason to stop.',
      'Do not touch switches, the disconnect, or the cabinet.',
      ['Move to a dry place. Keep other people away from standing water and the equipment.', 'If there is sparking, smoke, or you cannot get clear, call 911 from safety.', 'Otherwise call a licensed HVAC professional or electrician.'],
      'Do not keep the repair going with wet hands or in a flooded area.', 'electrical',
      'emergency_exit', 'wet_hands_flood', { gate: 'wet_hands_flood' }),
    adv_hazard_active: r('Emergency', 'Move away · call from safety', 'Burning, smoke, sparks, gas, or an active flood ends this path.',
      'Do not open covers or continue a capacitor repair.',
      ['Get people away. For smoke, fire, sparks, or a gas smell, call 911 from outside.', 'Shut power only if you can do it from a dry place away from the water you already know.', 'Do not restart the equipment until a qualified person has cleared it.'],
      'Do not keep troubleshooting through the hazard.', 'fire',
      'emergency_exit', 'burning_smell', { gate: 'burning_smell' }),
    user_elected_call_pro_advanced_abort: r('Professional guidance', 'Call a licensed HVAC professional', 'You chose to stop the capacitor path.',
      'That is a complete stop. Leave the equipment as you found it: power Off if you already killed it, covers on if you can do that without further electrical work.',
      ['Leave power Off if the compartment was opened or power was killed.', 'If covers are off and you cannot put them back, leave power Off and tell the technician.', 'Call a licensed HVAC technician and describe how far you got. This was not a confirmed parts diagnosis.'],
      'Do not energize the unit with covers off, and do not replace the contactor on your own.', 'safety',
      'call_pro', 'user_elected_call_pro_advanced_abort'),
    cap_pattern_not_confirmed: r('Professional guidance', 'Do not open covers', 'The Cool-calling hum with the fan stopped was not confirmed.',
      'Without that pattern, this guide does not open the electrical compartment.',
      ['Stay back. Leave covers on.', 'Call a licensed HVAC professional and describe what you actually heard and saw.', 'A later check can repeat the listen from where you stand. It still does not start with covers off.'],
      'Do not remove the electrical cover to hunt for the sound.', 'safety',
      'call_pro', 'cap_pattern_not_confirmed'),
    still_live_symptoms_after_off: r('Professional guidance', 'Do not open the compartment', 'The outdoor unit still hummed or spun after it was set Off.',
      'That means it is not verified dead. Covers stay on.',
      ['Stay clear. Do not open the electrical compartment.', 'Call a licensed HVAC professional or electrician and tell them the unit still hummed or spun after Off.'],
      'Do not treat it ready to open because the thermostat says Off.', 'electrical',
      'call_pro', 'still_live_symptoms_after_off', { gate: 'still_live_symptoms_after_off' }),
    capacitor_discharge_unsure: r('Professional guidance', 'Stop — do not improvise a discharge', 'The capacitor can still hold a charge. Unsure means stop.',
      'This guide does not fill in a wait time, a resistor value, or another method. “Off long enough” is not discharged.',
      ['Leave power Off if you already killed it. Do not touch the terminals.', 'Call a licensed HVAC professional and tell them the capacitor was not discharged because the method was not clear.'],
      'Do not short the terminals with a screwdriver, wire, pliers, or any bare metal, and do not invent a wait and continue.', 'electrical',
      'call_pro', 'capacitor_discharge_unsure', { gate: 'capacitor_discharge_unsure' }),
    capacitor_discharge_forbidden_method: r('Professional guidance', 'Do not short the capacitor', 'Shorting the terminals with a screwdriver or bare metal is not a step in this guide.',
      'Stop. Leave power Off. A charged capacitor can injure you.',
      ['Do not touch the terminals.', 'Leave power Off and the cover situation as steady as you can without further electrical work.', 'Call a licensed HVAC professional.'],
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
    compartment_inaccessible: r('Professional guidance', 'Do not force the compartment', 'The outdoor electrical compartment could not be opened.',
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
      ['Stop contact with the equipment. Kill power if you can do that from a dry place away from the water.', 'If you are injured, or smoke or sparks continue, call 911 from safety.', 'Do not restore power. A licensed HVAC professional or electrician has to take it from here.'],
      'Do not keep discharging, short the terminals, or turn power back on.', 'electrical',
      'emergency_exit', 'sparking', { gate: 'sparking' }),
    capacitor_mismatch_do_not_proceed: r('Professional guidance', 'Do not install a mismatched capacitor', 'The microfarad value, VAC rating, or terminals do not match the label you recorded.',
      'Leave the replacement uninstalled if it does not match. Leave power Off.',
      ['Do not force the leads onto different terminals to make it fit.', 'Call a licensed HVAC professional. Share the label values you wrote down and what the replacement shows.'],
      'Do not energize a mismatched capacitor, and do not replace the contactor to compensate.', 'electrical',
      'call_pro', 'capacitor_mismatch_do_not_proceed', { gate: 'capacitor_mismatch_do_not_proceed' }),
    contactor_not_in_advanced_cap_path: r('Professional guidance', 'The contactor is not replaced on this path', 'This path is the run/dual capacitor only.',
      'Contactor inspection or replacement is a different job and is not included here.',
      ['Stop. Leave power Off if the compartment is open.', 'Put covers back on only if you can do that without opening anything without further wiring work. If you cannot, leave power Off.', 'Call a licensed HVAC professional and tell them the contactor was not replaced.'],
      'Do not replace the contactor from this guide.', 'electrical',
      'call_pro', 'contactor_not_in_advanced_cap_path', { gate: 'contactor_not_in_advanced_cap_path' }),
    hum_no_start_after_cap_replace: r('Professional guidance', 'Kill power if you can do it without getting closer · call a pro', 'After the replacement, the outdoor unit hummed and did not start.',
      'That is not a cue to try another part. Shut it down and hand it to a professional.',
      ['Kill power if you can do that without opening anything, then leave it Off.', 'Call a licensed HVAC professional. Tell them a like-for-like capacitor was installed, covers were on before power was restored, and the unit then hummed without starting.'],
      'Do not leave it humming, open the compartment while it is energized, or replace the contactor next.', 'electrical',
      'call_pro', 'hum_no_start_after_cap_replace'),
    cannot_reassemble_leave_power_off: r('Professional guidance', 'Leave power Off', 'The covers cannot go back on securely, so power stays Off.',
      'Do not restore power with a cover off or loose.',
      ['Leave the disconnect Off.', 'Keep people away from the open compartment.', 'Call a licensed HVAC professional and tell them the cover is not secure and power was left Off.'],
      'Do not turn the disconnect On with covers off.', 'electrical',
      'call_pro', 'cannot_reassemble_leave_power_off'),
    restore_abnormal_smell_spark: r('Emergency', 'Kill power if you can do it without getting closer · get help', 'An abnormal smell or a spark after power was restored is an emergency stop.',
      'Do not keep the Cool test running.',
      ['Kill power if you can do that from a dry place away from the water. If covers were on, leave them on while you shut power down.', 'If smoke or sparks continue, or someone is hurt, call 911 from safety.', 'Do not open the compartment while it may still be energized. Call a licensed HVAC professional or electrician after you are outside.'],
      'Do not ignore the smell and leave the system calling for cool.', 'electrical',
      'emergency_exit', 'burning_smell', { gate: 'burning_smell' }),
    next_step_advanced: r('Advanced DIY', 'Brief test looked normal', 'Covers were on before power was restored, and the short Cool test looked normal.',
      'Covers were on before power was restored. That does not certify the repair. If cooling fails, noise returns, or anything smells or sparks, stop and call a professional.',
      ['Leave the covers on.', 'Let the system run on Cool only as a normal call for cooling, and see whether comfort holds.', 'If the outdoor unit hums and does not start, or you smell something burning or see a spark, kill power if you can do it without getting closer and call a licensed HVAC professional.'],
      'Do not run it with covers off, and do not replace the contactor because the first test looked fine.', 'electrical',
      'next_step', 'next_step_advanced', { diyTier: 'advanced' }),
    hp_cool_only_use_ac: r('More information needed', 'Use the central AC check', 'This path is for an air-source ducted heat pump.',
      'A cooling-only central air conditioner has its own check. This heat-pump path will not guess a cooling-only diagnosis.',
      ['Go back home and start the central AC check.', 'Do not remove a cover to re-identify the equipment.'],
      'Do not apply heat-pump mode steps to a cooling-only condenser.', 'scope',
      'insufficient_info', 'hp_cool_only_use_ac'),
    hp_mini_split_oos: r('More information needed', 'Outside this heat-pump check', 'Use the mini-split check instead.',
      'This ducted heat-pump check will not guess a mini-split diagnosis. Second Wrench has a separate mini-split check for cooling and heating on one indoor unit.',
      ['Go back home, press Start, and choose “Ductless mini-split”. It covers cooling and heating problems on a single indoor unit.', 'For a system with more than one indoor unit, use a technician who works on mini-splits or the manufacturer owner guidance.', 'Do not remove a cover to force an identification.'],
      'Do not apply this ducted heat-pump guide to a mini-split.', 'scope',
      'insufficient_info', 'hp_mini_split_oos'),
    hp_water_source_oos: r('More information needed', 'Outside this heat-pump check', 'This air-source check does not cover a water-source heat pump.',
      'Loop water and related work are not part of this check.',
      ['Start again, choose Water-source / geothermal heat pump.', 'Use a technician who works on that system.', 'Do not open covers or service a ground loop from this result.'],
      'Do not apply this air-source guide to a water-source heat pump.', 'scope',
      'insufficient_info', 'hp_water_source_oos'),
    hp_packaged_oos: r('More information needed', 'Outside this heat-pump check', 'Packaged or unconfirmed equipment is not covered in this check.',
      'This path needs a confirmed air-source ducted heat pump.',
      ['Use a technician for that equipment, or confirm the type from a manual you already have.', 'Do not climb or remove a cover to read a model number.'],
      'Do not pretend this check covers every outdoor unit.', 'scope',
      'insufficient_info', 'hp_packaged_oos'),
    hp_system_unconfirmed: r('More information needed', 'Confirm the equipment first', 'This check needs a confirmed air-source ducted heat pump.',
      'Do not open covers to find out what you have.',
      ['Use the manual, or ask someone who already knows the equipment.', 'Start again when you can confirm an outdoor unit that heats and cools, with air moving through ducts.', 'If you cannot confirm it, use your HVAC company rather than guessing.'],
      'Do not remove panels or climb to read a model number.', 'scope',
      'insufficient_info', 'hp_system_unconfirmed'),
    hp_mode_wrong_basic: r('Basic homeowner check', 'Set the mode that matches the complaint', 'The thermostat mode does not match what you need.',
      'Fix the setting before any other check. Do not change O/B jumpers and do not open the cabinet.',
      ['Set Heat if you need heat, or Cool if you need cool. Leave Emergency / Aux Off unless you already mean to use backup heat only.', 'Move the setpoint 2–3°F past the room temperature in the call direction.', 'Wait 10–15 minutes and retest. If the complaint remains with the mode correct, start a new heat pump check and continue from the mode question.'],
      'Do not pull the thermostat off the wall or change wiring.', 'maintenance',
      'next_step', 'hp_mode_wrong_basic', { diyTier: 'basic' }),
    hp_mode_not_sure: r('More information needed', 'Read the mode before continuing', 'The next check waits on the thermostat display.',
      'Do not guess the mode, and do not pull the thermostat off the wall.',
      ['Read the mode and setpoint on the display, or use the thermostat manual.', 'Start the heat pump check again when you can say whether the mode matches the complaint.'],
      'Do not open the furnace or air-handler cabinet, and do not change O/B jumpers.', 'maintenance',
      'insufficient_info', 'hp_mode_not_sure'),
    hp_auto_fixed_basic: r('Basic homeowner check', 'Leave it in Heat or Cool', 'Forcing Heat or Cool cleared the complaint.',
      'Auto can call the wrong thing or sit in a deadband. That is a control setting, not a reason to open the outdoor unit.',
      ['Leave the system in Heat or Cool to match what you need.', 'If you return to Auto later, follow the thermostat manual for the gap between the heat and cool setpoints.', 'Call a professional only if you want help programming the thermostat. If the problem returns while Heat or Cool is forced, start a new heat pump check.'],
      'Do not open the outdoor unit, force the reversing valve, or change O/B jumpers because Auto was the problem.', 'maintenance',
      'next_step', 'hp_auto_fixed_basic', { diyTier: 'basic' }),
    hp_thermostat_mode_locked: r('Professional guidance', 'Do not force the thermostat wiring', 'The thermostat will not accept Heat or Cool.',
      'Low-voltage wiring and O/B settings after a thermostat swap are a professional visit when you cannot change the mode from the display.',
      ['Leave the thermostat on the wall.', 'Call a licensed HVAC professional. Tell them the mode could not be changed to Heat or Cool and you did not open wiring.'],
      'Do not pull the thermostat off to move jumpers, and do not open the air handler.', 'safety',
      'call_pro', 'thermostat_mode_locked_or_unchangeable'),
    hp_force_not_waited: r('More information needed', 'Wait out the forced mode', 'A few seconds is not enough to judge a heat pump call.',
      'Do not guess, and do not open equipment to speed it up.',
      ['Stay in forced Heat or Cool, with the setpoint 2–3°F past the room temperature, for 5–10 minutes.', 'Then start the heat pump check again if the problem is still there.'],
      'Do not set Emergency heat just to see a faster result, and do not open covers.', 'maintenance',
      'insufficient_info', 'hp_force_not_waited'),
    hp_short_cycle_after_mode_basics: r('Professional guidance', 'Short cycling needs a professional', 'Mode and Emergency / Aux basics are as far as this check goes for short cycling.',
      'A system that starts and stops quickly can be a control, refrigerant, or electrical problem. Those are not homeowner steps in this check.',
      ['Leave the thermostat in the mode you already corrected. Off is fine if it keeps short cycling.', 'Call a licensed HVAC professional. Tell them the mode matched the complaint, Emergency / Aux was Off or you turned it Off, and the unit still short cycles. You did not open covers.'],
      'Do not open panels, attach gauges, or replace a capacitor or contactor from short cycling.', 'safety',
      'call_pro', 'short_cycle_after_mode_basics'),
    hp_emergency_not_sure: r('More information needed', 'Confirm Emergency / Aux on the display', 'This check needs a clear Emergency / Aux answer.',
      'Do not open the air handler to look at strip sequencers or measure amps.',
      ['Use the thermostat manual or the labels on the display.', 'Start again when you can say whether Emergency / Aux is on.', 'If you still cannot tell, call a licensed HVAC professional.'],
      'Do not open the cabinet or measure current to answer this.', 'safety',
      'insufficient_info', 'hp_emergency_not_sure'),
    hp_defrost_recovered_ok: r('Basic homeowner check', 'Leave it in normal Heat', 'The outdoor unit behaved like a defrost and then the complaint cleared.',
      'Frost and a short defrost can be normal in cold weather. Ice that returns and stays is a professional visit.',
      ['Leave the system in normal Heat, with Emergency / Aux Off unless you intentionally want backup heat only.', 'Expect an occasional defrost in cold weather: fan may stop, indoor air may cool briefly, then heat returns.', 'If ice comes back and the outdoor unit doesn’t recover: If your thermostat has an Emergency Heat setting, switch to it to keep heat on without the outdoor unit while you wait for a pro. It usually costs more to run. It may be labeled EM Heat, E-Heat, or Aux Heat Only. An AUX light that comes on by itself isn’t the same thing. If you don’t have Emergency Heat, or there’s no warm air in 15 minutes, turn the system Off at the thermostat. Don’t chip the ice. Call a licensed HVAC professional. If it’s dangerously cold and anyone is at risk, get them somewhere warm first. Never heat with an oven, stove, grill, or generator indoors.'],
      'Do not chip ice, jump a defrost sensor, or open the cabinet.', 'ice',
      'next_step', 'hp_defrost_recovered_ok', { diyTier: 'basic' }),
    hp_defrost_not_sure: r('More information needed', 'Do not force a defrost', 'It was not clear whether this was a normal defrost.',
      'Do not chip ice or open panels to decide.',
      ['Watch from where you already stand through one possible defrost, about 5–15 minutes, if you can do that without getting closer.', 'If you still can’t tell, or the ice is heavy: If your thermostat has an Emergency Heat setting, switch to it to keep heat on without the outdoor unit while you wait for a pro. It usually costs more to run. It may be labeled EM Heat, E-Heat, or Aux Heat Only. An AUX light that comes on by itself isn’t the same thing. If you don’t have Emergency Heat, or there’s no warm air in 15 minutes, turn the system Off at the thermostat. Call a licensed HVAC professional and tell them what the outdoor unit did. If it’s dangerously cold and anyone is at risk, get them somewhere warm first. Never heat with an oven, stove, grill, or generator indoors.'],
      'Do not chip ice, pour water on the coil, or jump a sensor.', 'ice',
      'insufficient_info', 'hp_defrost_not_sure'),
    hp_weak_heat_deep_cold: r('Basic homeowner check', 'Weak heat in deep cold can be normal capacity', 'There is some heat, and it is cold outside.',
      'Heat pumps move less heat as outdoor air gets colder, and they may use auxiliary heat for help. That is not proof of a failed compressor. Ice that never clears is a different problem.',
      ['Keep Emergency Heat off unless you mean to run only the backup heat. An AUX light that comes on by itself in cold weather is often normal.', 'Expect less heat, and possible auxiliary heat, in this outdoor temperature. Give a Heat call 10–15 minutes.', 'If airflow from the vents feels weak, check the filter you can already reach, with the thermostat set to Off while it’s out. If the outdoor unit is iced solid and never recovers: If your thermostat has an Emergency Heat setting, switch to it to keep heat on without the outdoor unit while you wait for a pro. It usually costs more to run. It may be labeled EM Heat, E-Heat, or Aux Heat Only. An AUX light that comes on by itself isn’t the same thing. If you don’t have Emergency Heat, or there’s no warm air in 15 minutes, turn the system Off at the thermostat. Don’t chip the ice. Call a licensed HVAC professional. If it’s dangerously cold and anyone is at risk, get them somewhere warm first. Never heat with an oven, stove, grill, or generator indoors.'],
      'Do not add refrigerant, measure strip amps, or open the air handler.', 'maintenance',
      'next_step', 'hp_weak_heat_deep_cold', { diyTier: 'basic' }),
    hp_cannot_observe: r('More information needed', 'Stop where you can see from where I stand', 'The outdoor check needs a view from where you stand.',
      'Do not move closer because of weather, ice, a locked yard, or anything else that makes the area unsafe.',
      ['Stay back. Note what you already saw for a professional.', 'If the home still needs heat or cooling and you cannot observe the outdoor unit, call a licensed HVAC professional.'],
      'Do not remove covers or put anything through the grille.', 'safety',
      'insufficient_info', 'hp_cannot_observe'),
    hp_outdoor_not_running_wave1: r('Professional guidance', 'Outdoor unit not running — call a professional', 'Basic power visuals are the end of the heat-pump start check.',
      'You can look at the breaker door and the outdoor disconnect position. This heat-pump path does not continue into capacitor or contactor work. Advanced electrical is off.',
      ['Leave the thermostat Off if the outdoor unit stays silent while it should run.', 'Call a licensed HVAC professional. Tell them whether the breaker door looked On, Off, or not identifiable, and whether the outdoor disconnect appeared On or Off from dry ground. You did not operate the disconnect as a test and you did not remove covers.'],
      'Do not flip the disconnect lever, open the disconnect door, pull a fuse, or replace a capacitor or contactor from this result.', 'electrical',
      'call_pro', 'hp_outdoor_not_running_wave1'),
    hp_rv_pattern_unsure: r('More information needed', 'Do not invent a valve diagnosis', 'The one-mode pattern was not clear, and the filter was already checked.',
      'Unsure is not a reason to force the reversing valve or attach gauges.',
      ['Write down which mode felt wrong, and whether the outdoor unit was running.', 'Call a licensed HVAC professional if comfort is still not acceptable. Tell them you did not change O/B jumpers or open covers.'],
      'Do not force the valve with a magnet or tool, and do not add refrigerant.', 'safety',
      'insufficient_info', 'hp_rv_pattern_unsure'),
    hp_basics_clear_after_filter: r('Professional guidance', 'Basic heat-pump checks are done', 'Filter and airflow basics are as far as this check goes.',
      'Mode, Emergency / Aux, and the defrost screen were already considered. A clean filter, or returns and supplies when airflow was weak, does not prove the sealed system. This path does not continue to the outdoor fan, debris, or ice checks.',
      ['Leave returns and supplies as they are. Do not start duct work.', 'Call a licensed HVAC professional if the home still does not heat or cool. Tell them the mode matched the complaint, what you saw for Emergency / Aux and outdoor ice or frost, and what the filter and vents looked like. No covers were removed.'],
      'Do not move on to capacitor, contactor, refrigerant, or outdoor-fan diagnosis from this result.', 'maintenance',
      'call_pro', 'hp_basics_clear_after_filter'),
    hp_user_requests_pro_after_mode_clear: r('Professional guidance', 'Call a licensed HVAC professional', 'You chose to stop before the filter check.',
      'That is a complete stop. Mode basics were the homeowner steps already offered.',
      ['Set the thermostat to Off and leave it Off until a licensed HVAC professional has checked the system.', 'Call a licensed HVAC professional and describe the complaint, the thermostat mode, and whether Emergency / Aux was on.'],
      'Do not open electrical covers or attach gauges because you skipped the filter.', 'safety',
      'call_pro', 'user_requests_pro_after_mode_clear'),
    hp_defrost_valve_ob_control: r('Professional guidance', 'Call a licensed HVAC professional', 'Defrost, reversing valve, or control — not a homeowner repair.',
      'This is a ranked reason to stop, not a confirmed parts diagnosis. Heat-pump Advanced electrical is off. Forcing the reversing valve is not a step in this guide.',
      ['If ice was involved: If your thermostat has an Emergency Heat setting, switch to it to keep heat on without the outdoor unit while you wait for a pro. It usually costs more to run. It may be labeled EM Heat, E-Heat, or Aux Heat Only. An AUX light that comes on by itself isn’t the same thing. If you don’t have Emergency Heat, or there’s no warm air in 15 minutes, set the thermostat to Off. Don’t chip the ice. If it’s dangerously cold and anyone is at risk, get them somewhere warm first. Never heat with an oven, stove, grill, or generator indoors.', 'For outdoor power, use only a shutoff you already know from storms, and only if it is dry. This guide does not teach operating the disconnect lever. If you are unsure, leave power alone.', 'Call a licensed HVAC technician. You may say: Basic heat-pump checks only, outdoor iced without recovery and/or one mode wrong, no covers removed, O versus B not assumed.'],
      'Do not replace a capacitor or contactor, open the panel, attach gauges, add refrigerant, or force the reversing valve with a magnet or jumper.', 'safety',
      'call_pro', 'hp_defrost_valve_ob_control', { diyTier: 'pro_only' }),
    hp_refrigerant_intent: r('Professional guidance', 'Do not add refrigerant or use gauges', 'Refrigerant work is not a homeowner step.',
      'Asking to add refrigerant or attach gauges stops this guide. It does not unlock a procedure.',
      ['Do not connect gauges, hoses, or a refrigerant cylinder.', 'Call a licensed HVAC professional with the certification required for that equipment.', 'If a leak alarm is sounding or you suspect a release, leave the area and use the safety stop. Do not keep diagnosing.'],
      'Do not add or remove refrigerant, and do not open refrigerant lines.', 'refrigerant',
      'call_pro', 'refrigerant_intent', { gate: 'refrigerant_intent' }),
    hp_advanced_electrical_off: r('Professional guidance', 'Heat-pump electrical DIY is off', 'Capacitor and contactor work is not offered on a heat pump in this beta.',
      'The cooling-only capacitor path does not apply here, even if that path exists for central AC. Advanced electrical stays off.',
      ['Leave covers on.', 'Call a licensed HVAC professional. Tell them what the outdoor unit was doing and that you did not remove covers.'],
      'Do not start a capacitor, contactor, inverter, or panel repair from this heat-pump check.', 'electrical',
      'call_pro', 'hp_advanced_electrical_off', { diyTier: 'pro_only' }),
    hp_hazard_now: r('Emergency', 'Stop. Get to safety.', 'A new hazard ends this check.',
      'Gas, smoke, sparks, a burning smell, a refrigerant leak alarm, or water at electrical equipment is not a DIY path.',
      ['If you smell gas or a carbon monoxide alarm is sounding, leave the building and call for help from outside. Do not operate switches inside.', 'If there is smoke, fire, or sparks, get people away and call 911 from safety.', 'If water is at electrical equipment, stay clear. Shut power only from a dry place you already know.', 'If a refrigerant leak alarm is going off, move people out of the affected area to fresh air without operating switches or creating ignition sources. Don’t reset the alarm, cycle power, or turn off a blower that’s running. Call a licensed HVAC professional from outside the affected area, and for breathing trouble or immediate danger, call 911.', 'Do not return to troubleshooting until the hazard has been handled.'],
      'Do not keep diagnosing, open covers, or touch wet equipment.', 'safety',
      'emergency_exit', 'hp_new_hazard', { gate: 'hp_new_hazard' }),
    unusual_noise_hp_wave1: r('Professional guidance', 'This noise is not a homeowner parts path', 'No hazard was reported, and this heat-pump check does not diagnose the sound.',
      'There is no heat-pump capacitor, contactor, or inverter repair on this path, and it does not continue into the cooling-only outdoor-hum check.',
      ['If you can do it without getting closer, set the thermostat Off.', 'Call a licensed HVAC professional. Describe what you heard and whether the outdoor fan was moving.', 'If you later smell burning or see smoke or sparks, get to safety and call 911. Do not return to this check.'],
      'Do not open covers or buy a part from the noise alone.', 'safety',
      'call_pro', 'unusual_noise_hp_wave1'),
    wshp_hazard_now: r('Emergency', 'Stop. Get to safety.', 'A new hazard ends this check.',
      'Gas, smoke, sparks, a burning smell, flooding, water at electrical equipment, or a breaker that will not stay on is not a do-it-yourself path.',
      ['If you smell gas or a carbon monoxide alarm is sounding, leave the building and call for help from outside. Do not use switches inside.', 'If there is smoke, fire, or sparks, get people away and call 911 from outside.', 'If a refrigerant leak alarm is going off, move people out of the affected area to fresh air without operating switches or creating ignition sources. Don’t reset the alarm, cycle power, or turn off a blower that’s running. Call a licensed HVAC professional from outside the affected area, and for breathing trouble or immediate danger, call 911.', 'If water is at electrical equipment or the floor is flooded, stay out of the water. Shut off power only from a dry place you already know.', 'If a breaker keeps tripping, leave it off. Do not reset it again.', 'Do not come back to this check until the hazard has been handled.'],
      'Do not keep troubleshooting, open covers, touch wet equipment, or reset a breaker again.', 'safety',
      'emergency_exit', 'wshp_new_hazard', { gate: 'wshp_new_hazard' }),
    wshp_mech_room_flood: r('Stop / professional', 'Stay out of the water · get help', 'Do not walk into water near this equipment.',
      'This system has water pipes, a pump, and 240-volt power in the same space. Standing or spraying water near them can cause a shock.',
      ['Stay out of the water and keep others away.', 'Shut off main power only if you can do it from a dry place away from the water you already know. Otherwise leave it.', 'If the water is coming from your home’s water supply and you already know where the main water shutoff is, close it only if you can reach it on a dry floor away from the equipment and any wiring. Do not touch valves on the heat pump, the loop, the well, or the pressure tank.', 'Call a licensed HVAC professional who works on geothermal systems, or an electrician or plumber. For sparks, smoke, shock, or immediate danger, call 911 from outside.'],
      'Do not step into water, mop around live equipment, touch switches with wet hands, or open loop or well valves.', 'electrical',
      'emergency_exit', 'wet_hands_flood', { gate: 'wet_hands_flood' }),
    wshp_breaker_wont_reset: r('Stop / professional', 'Leave it off · call a pro', 'A breaker that keeps tripping is a stop sign.',
      'A breaker that will not stay on is protecting the wiring. The cause is in the electrical system, the pump, or the unit. That is not a homeowner repair.',
      ['Leave the breaker off. Do not reset it again.', 'Set the thermostat to Off.', 'Never heat with an oven, stove, grill, or generator indoors (carbon monoxide). If you use an electric space heater, plug it straight into a wall outlet, follow its maker’s instructions, and keep it clear of anything that can burn.', 'Call a licensed HVAC professional who works on geothermal systems. If you smell burning or see smoke or sparks, get away and call 911.'],
      'Do not reset it again and again, open the breaker panel or a disconnect, or swap a breaker.', 'electrical',
      'emergency_exit', 'breaker_wont_reset', { gate: 'breaker_wont_reset' }),
    wshp_openloop_water_quality_pro: r('Professional guidance', 'Call a pro who works on open-loop systems', 'Open-loop water care needs a professional.',
      'Well, lake, or pond water can leave minerals or iron inside the unit’s water coil over time. Checking and cleaning it takes special equipment and chemicals. This is a reason to call, not a confirmed diagnosis.',
      ['Leave covers on. Leave water valves, the well, the well pump, and the pressure tank alone.', 'If the house is still getting some heat, leave the thermostat on Heat.', 'If your thermostat has an Emergency Heat setting, switch to it to keep heat on with backup heat while you wait for a pro. It usually costs more to run.', 'If the house is getting cold, call a licensed HVAC professional. If it’s dangerously cold and anyone is at risk, get them somewhere warm first.', 'Never heat with an oven, stove, grill, or generator indoors (carbon monoxide). If you use an electric space heater, plug it straight into a wall outlet, follow its maker’s instructions, and keep it clear of anything that can burn.', 'If the well water is also out for the house, tell the pro. Keep the heat pump off or on Emergency Heat until the well is working again.', 'Call a geothermal or water-source heat pump pro who services open-loop systems. Copy the note below for them.', 'If water starts flooding or reaches wiring, use Stop / get help.'],
      'Do not add acid, bleach, chlorine, descaler, or any chemical to the well, the water lines, or the unit. Do not try to clean the unit’s coil, and do not work on the well, pump, or pressure tank.', 'maintenance',
      'call_pro', 'wshp_openloop_water_quality_pro', { diyTier: 'pro_only' }),
    wshp_handback_call_pro: r('Professional guidance', 'Arrange service · geothermal / water-source pro', 'Call a pro who works on geothermal or water-source heat pumps.',
      'This beta does not yet guide homeowner checks for this system. The water loop, pump, refrigerant, and controls need a trained technician. This is a next step, not a diagnosis.',
      ['Leave covers on. Leave loop valves, the pump box, and any well equipment alone.', 'If the house is still getting some heat, leave the thermostat on Heat.', 'If your thermostat has an Emergency Heat setting, switch to it to keep heat on with backup heat while you wait for a pro. It usually costs more to run.', 'If the house is getting cold, call a licensed HVAC professional. If it’s dangerously cold and anyone is at risk, get them somewhere warm first.', 'Never heat with an oven, stove, grill, or generator indoors (carbon monoxide). If you use an electric space heater, plug it straight into a wall outlet, follow its maker’s instructions, and keep it clear of anything that can burn.', 'If the system keeps stopping or shows a lockout, leave it as it is. Do not reset it again and again.', 'Write down any light, code, or water temperature that is already showing.', 'Call a technician who services geothermal or water-source heat pumps. Copy the note below for them.'],
      'Do not open panels, add refrigerant or antifreeze, drain or refill the loop, open loop pipes, jump or bypass a safety switch, or work inside the electrical panel.', 'safety',
      'call_pro', 'wshp_handback_call_pro', { diyTier: 'pro_only' }),
    wshp_out_of_scope_call_pro: r('Professional guidance', 'Outside this beta · call a pro', 'This system is outside this check.',
      'This beta covers home water-to-air heat pumps of 6 tons or less. Larger systems, business buildings, and systems that heat water for floors or radiators need a pro who works on that equipment.',
      ['Leave covers, valves, and loop pipes alone.', 'Call a technician who works on water-source or geothermal systems of this type. In a business or apartment building, contact the building manager first.', 'If anything becomes unsafe, use Stop / get help.'],
      'Do not use this home guide on commercial or larger equipment.', 'scope',
      'call_pro', 'wshp_out_of_scope', { diyTier: 'pro_only' }),
    wshp_system_unconfirmed: r('More information needed', 'Confirm the equipment first', 'We need to know what system you have.',
      'Guessing the system type could send you to the wrong steps. Do not open covers to find out.',
      ['Check paperwork, the owner’s manual, or a label you can already see without opening anything.', 'Ask the company that installed or services it.', 'Start again when you know. If you cannot find out, call your HVAC company instead of guessing.'],
      'Do not remove panels, go into a well pit or crawlspace, or climb to read a model number.', 'scope',
      'insufficient_info', 'wshp_system_unconfirmed'),
    wshp_divert_mini_split: r('More information needed', 'Use the right check', 'A ductless mini-split has its own check.',
      'This check is for water-source and geothermal heat pumps. Mini-split heating and cooling concerns, on one indoor unit or several rooms, start from the home screen.',
      ['Go back home, press Start, and choose “Ductless mini-split”.', 'If anything is unsafe, use Stop / get help.'],
      'Do not use these water-source steps on a mini-split.', 'scope',
      'insufficient_info', 'wshp_divert_mini_split'),
    wshp_divert_furnace: r('Professional guidance', 'Use the furnace or boiler check', 'Furnaces, air handlers, and boilers have their own questions.',
      'For gas, oil, electric, or hydronic air heat, use Furnace or air handler on the system-type screen. For a boiler, choose Boiler & hydronic heat.',
      ['If you smell gas or a carbon monoxide alarm is sounding, leave the building now and call 911 or your gas company from outside.', 'For gas, oil, electric, or hydronic air heat, start again and choose Furnace or air handler.', 'For a boiler, start again and choose Boiler & hydronic heat. Each receiving check starts with its own hazard questions.', 'Leave covers on. Do not relight or reset fuel-burning equipment from this guide.'],
      'Do not open the furnace or boiler, relight a burner, or bypass a safety switch.', 'gas',
      'call_pro', 'wshp_divert_furnace', { diyTier: 'pro_only' }),
    wshp_advanced_off: r('Professional guidance', 'Repair steps are off for this system', 'Parts and electrical repairs are not offered for water-source heat pumps.',
      'Capacitor, contactor, pump, wiring, and refrigerant work need a trained technician.',
      ['Leave covers on.', 'Call a pro who works on geothermal or water-source heat pumps.'],
      'Do not start a parts, electrical, or refrigerant repair from this check.', 'electrical',
      'call_pro', 'wshp_advanced_off', { diyTier: 'pro_only' }),
    fn_gas_smell: r('Emergency', 'Leave now · call from outside', 'Leave the house now.',
      'A gas smell comes before anything else.',
      ['Get everyone, and pets, out now.', "Don't touch light switches, the thermostat, phones, or anything that could spark while you're inside.", "Don't try to find the leak.", "From outside or a neighbor's, call the gas utility's emergency line or 911.", "Don't go back in until they say you can go back in.", FN_CO_LINE],
      "Don't try to shut off the gas yourself.", 'gas',
      'emergency_exit', 'gas_co', { gate: 'gas_co' }),
    fn_co_alarm: r('Emergency', 'Get to fresh air · call 911', 'Get everyone out to fresh air now.',
      "A CO alarm or these symptoms can mean carbon monoxide. You can't see or smell it.",
      ['Get everyone, and pets, outside to fresh air now.', 'From outside, call 911 or the fire department.', "Don't go back in until responders say you can go back in.", FN_CO_LINE],
      "Don't silence the alarm and stay inside, and don't open windows instead of leaving.", 'gas',
      'emergency_exit', 'co_alarm_or_symptoms', { gate: 'co_alarm_or_symptoms' }),
    fn_rollout_soot: r('Emergency', 'Stop · keep away from the furnace', 'Stop using the furnace.',
      'Soot, scorch marks, or flame outside the burner can mean unsafe burning and carbon monoxide.',
      ["If you're at the thermostat and smell no gas, set it to Off.", 'If you smell gas, a CO alarm sounds, or anyone feels sick, get everyone out and call 911 from outside.', 'Call a licensed HVAC pro before using the furnace again.', FN_CO_LINE],
      "Don't open, reset, or restart the furnace.", 'gas',
      'emergency_exit', 'flame_rollout_soot', { gate: 'flame_rollout_soot' }),
    fn_burning_sparks: r('Emergency', 'Move away · call 911', 'Stop. Treat this as a fire risk.',
      "Smoke, sparks, or a burning-plastic or electrical smell can't be checked from here.",
      ["Get everyone away from the furnace. If there's smoke or fire, leave and call 911 from outside.", "Don't use the furnace until a licensed HVAC pro checks it.", FN_CO_LINE],
      "Don't stay to troubleshoot, open the furnace, or flip switches or breakers.", 'fire',
      'emergency_exit', 'smoke_fire_sparks_burn', { gate: 'smoke_fire_sparks_burn' }),
    fn_cold_exposure: r('Emergency', 'Get warm now · call 911 if needed', 'Get the person warm first.',
      'Someone at risk from the cold matters more than the furnace.',
      ['If anyone is confused, very drowsy, or hard to wake, call 911 now.', 'Otherwise, get them somewhere warm: a neighbor, family, or a warming center.', 'Add blankets and dry layers in the meantime.', FN_CO_LINE, "Call a licensed HVAC pro for the furnace once everyone is warm."],
      "Don't wait on a furnace repair to get someone warm.", 'safety',
      'emergency_exit', 'cold_exposure_911', { gate: 'cold_exposure_911' }),
    fn_flame_abnormal: r('Stop / professional', 'Stop · call a pro', 'Stop using the furnace and call a pro.',
      "A yellow or orange flame can mean the furnace isn't burning cleanly. That can make carbon monoxide.",
      ['Set the thermostat to Off.', "Don't use the furnace until a licensed HVAC pro checks it.", 'Make sure your CO alarms work. If one sounds or anyone feels sick, get everyone out and call 911 from outside.', FN_CO_LINE],
      "Don't open the furnace or go look at the flame again.", 'gas',
      'call_pro', 'combustion_flame_abnormal', { gate: 'combustion_flame_abnormal' }),
    fn_ignition_bang: r('Stop / professional', 'Stop · call a pro', 'Stop using the furnace and call a pro.',
      'A bang when it starts can mean gas is building up before it lights.',
      ['Set the thermostat to Off.', "Don't keep restarting it to see if it happens again.", 'Call a licensed HVAC pro. If you smell gas, leave and call from outside.', FN_CO_LINE],
      "Don't open the furnace, press reset buttons, or try to relight anything.", 'gas',
      'call_pro', 'delayed_ignition_bang', { gate: 'delayed_ignition_bang' }),
    fn_gate_unsure: r('Stop / professional', 'Stop here', 'Not sure is a good reason to stop.',
      "You don't need to check the furnace to answer. Stopping is the right stop.",
      ['If you smell gas or a CO alarm sounds, get everyone out and call 911 from outside.', "If not, set the thermostat to Off if you're already there, and call a licensed HVAC pro.", 'Tell them what you noticed.', FN_CO_LINE],
      "Don't open the furnace or look at the flame to find out.", 'safety',
      'emergency_exit', 'unsure_hazard', { gate: 'unsure_hazard' }),
    fn_hazard_now: r('Emergency', 'Stop · get to safety', 'A new hazard ends this check.',
      'Safety comes before the furnace.',
      ["Gas smell: leave now. Don't touch switches, phones, or anything that could spark. From outside, call the gas utility or 911.", 'CO alarm or feeling sick: get everyone and pets out to fresh air. Call 911 from outside.', 'Smoke, sparks, or burning smell: get away and call 911 from outside.', "If a refrigerant leak alarm is going off, move people out of the affected area to fresh air without operating switches or creating ignition sources. Don’t reset the alarm, cycle power, or turn off a blower that’s running. Call a licensed HVAC professional from outside the affected area, and for breathing trouble or immediate danger, call 911.", "Don't go back in until responders say you can go back in.", FN_CO_LINE],
      "Don't keep troubleshooting.", 'safety',
      'emergency_exit', 'fn_new_hazard', { gate: 'fn_new_hazard' }),
    fn_tstat_set_heat_basic: r('Basic homeowner check', 'Adjust the thermostat, then wait', 'Set Heat and a higher setpoint.',
      "The thermostat wasn't asking for heat. That's an easy fix.",
      ['Set the mode to Heat.', 'Raise the setpoint a few degrees above the room temperature. Fan on Auto.', "Still no heat after 10 minutes? Start a new check and answer that heat still won't come on.", FN_CO_LINE],
      "Don't take the thermostat off the wall or change wiring or installer settings.", 'maintenance',
      'next_step', 'fn_tstat_set_heat_basic', { diyTier: 'basic' }),
    fn_fan_auto_basic: r('Basic homeowner check', 'Change one setting, then wait', 'Set the fan to Auto.',
      'With the fan on On, the blower runs between heating cycles and moves room-temperature air. That can feel cold.',
      ['Set the fan to Auto. Leave the mode on Heat.', 'Wait for the next heating cycle. The air should feel warm while the heat runs.', 'Still cool air while the heat runs? Start a new check and pick Furnace.', FN_CO_LINE],
      "Don't change wiring or installer settings.", 'maintenance',
      'next_step', 'fn_fan_auto_basic', { diyTier: 'basic' }),
    fn_tstat_unsure: r('More information needed', 'Check the display first', 'Read the thermostat, then try again.',
      'The next step depends on the mode and setpoint.',
      ['Read the mode, setpoint, and fan setting on the screen, or check the thermostat manual.', 'Start a new check when you can.', FN_CO_LINE],
      "Don't take the thermostat off the wall or open the furnace to find out.", 'maintenance',
      'insufficient_info', 'fn_tstat_unsure'),
    fn_filter_replace_basic: r('Basic homeowner check', 'Replace the filter, then retest', 'The filter looks dirty or clogged.',
      'A clogged filter chokes airflow, and a furnace can shut itself off.',
      ['Put in the right size and type. Match the airflow arrow.', "Put any filter door or cover back fully. Don't run the furnace with it off.", 'Set Heat and retest in 15 to 30 minutes. No better? Call a licensed HVAC pro.', FN_CO_LINE],
      "Don't run it without a filter or reach into the blower.", 'maintenance',
      'next_step', 'fn_filter_dirty_clogged', { diyTier: 'basic' }),
    fn_filter_missing_basic: r('Basic homeowner check', 'Install a filter, then retest', 'No filter is installed.',
      'Running without a filter lets dust build up inside the furnace.',
      ['Install the right size and type. Match the airflow arrow.', 'Put any filter door or cover back fully before running heat.', 'Set Heat and retest in 15 to 30 minutes. No better? Call a licensed HVAC pro.', FN_CO_LINE],
      "Don't guess the size, stack filters, or force a fit.", 'maintenance',
      'next_step', 'fn_filter_missing', { diyTier: 'basic' }),
    fn_batteries_display_back: r('Basic homeowner check', "Display's back · retest heat", 'Fresh batteries brought the screen back.',
      "That doesn't prove the rest of the system is fine.",
      ['Set Heat, with the setpoint a few degrees above room temperature and the fan on Auto.', 'Give it 5 to 10 minutes. Still no heat? Start a new check and pick Furnace.', FN_CO_LINE],
      "Don't pull thermostat wires or open the furnace.", 'maintenance',
      'next_step', 'fn_batteries_display_back', { diyTier: 'basic' }),
    fn_returns_supplies_cleared: r('Basic homeowner check', 'Keep vents clear · retest', "A blocked vent was cleared, and airflow's better.",
      'Blocked returns and closed registers can leave rooms short on heat.',
      ['Keep returns and registers clear of furniture, rugs, and curtains.', 'Stay on Heat and retest in 15 to 30 minutes.', 'If rooms are still short on heat, call a licensed HVAC pro.', FN_CO_LINE],
      "Don't cut ducts, open a chase, or remove the blower panel.", 'maintenance',
      'next_step', 'fn_returns_supplies_cleared', { diyTier: 'basic' }),
    fn_out_of_scope_equipment: r('More information needed', 'Outside this beta', "This guide doesn't cover that heating system yet.",
      "Boilers, radiant floors, oil and wood heat, wall and floor furnaces, and rooftop units aren't covered.",
      ['Call a licensed pro who works on your type of system.', 'Fuel-burning heat needs working CO alarms. If one sounds, get everyone out and call 911 from outside.', FN_CO_LINE],
      "Don't open the equipment or relight anything to find out what's wrong.", 'scope',
      'insufficient_info', 'fn_out_of_scope_equipment'),
    fn_mini_split_oos: r('More information needed', 'Use the mini-split check', 'A ductless mini-split has its own check.',
      'This furnace check is for ducted furnaces and air handlers. Mini-split heating and cooling concerns, on one indoor unit or several rooms, start with Ductless mini-split in the system menu.',
      ['Go back home, press Start, and choose “Ductless mini-split”.', FN_CO_LINE],
      "Don't remove covers to identify the equipment.", 'scope',
      'insufficient_info', 'fn_mini_split_oos'),
    fn_system_unconfirmed: r('More information needed', 'Confirm the furnace first', 'We need to know the furnace type.',
      'Gas and electric furnaces need different checks.',
      ['Check the manual, a label you can read without opening anything, or ask someone who knows the system.', "Start a new check when you know. If you can't tell, call a licensed HVAC pro.", FN_CO_LINE],
      "Don't remove panels or climb to read a label.", 'scope',
      'insufficient_info', 'fn_system_unconfirmed'),
    fn_call_pro: r('Professional guidance', 'Call a licensed HVAC pro', 'Call a licensed HVAC pro.',
      'The homeowner checks are done. The next checks are inside the furnace.',
      ['If the furnace acts strangely, set the thermostat to Off.', 'Tell the pro what you checked. Your note below lists it.', 'If you smell gas or a CO alarm sounds, get everyone out and call 911 from outside.', FN_CO_LINE],
      "Don't press reset buttons, keep restarting, open panels, or relight anything.", 'safety',
      'call_pro', 'fn_call_pro', { diyTier: 'pro_only' }),
    fn_water_electrical: r('Stop / professional', 'Keep away · urgent help', "Don't touch the furnace or stand in the water.",
      "Water is at or near the furnace's electrical parts.",
      ["Don't touch the furnace, any switch, or the breaker panel, and don't stand in the water.", 'Leave the area, keep others and pets away, and call a licensed HVAC pro or an electrician.', 'If you see sparks, smoke, or smell burning, get out and call 911 from outside.', FN_CO_LINE],
      "Don't touch the furnace, any switch, or the breaker panel.", 'electrical',
      'emergency_exit', 'water_near_electrical', { gate: 'water_near_electrical' }),
    ms_multi_zone_pr2: r('More information needed', 'Not covered yet', 'This check covers one indoor unit for now.',
      'Systems where two or more indoor units share one outdoor unit need extra questions. They come in a later version.',
      ['Note which indoor units work and which don’t, and what each one shows.', 'Call a licensed HVAC pro who works on mini-splits, or use the maker’s owner support.'],
      'Don’t open covers or climb to check any indoor unit.', 'scope',
      'insufficient_info', 'ms_multi_zone_pr2'),
    ms_use_central_check: r('More information needed', 'Use the right check', 'This path is for ductless mini-splits.',
      'A system with vents and ducts has its own check.',
      ['Go back home, press Start, and choose Cooling-only AC or Heat pump.'],
      'Don’t remove a cover to re-check the equipment.', 'scope',
      'insufficient_info', 'ms_use_central_check'),
    ms_equipment_oos: r('More information needed', 'Outside this beta', 'This equipment isn’t covered here.',
      'Window, portable, and through-the-wall units, and other types, aren’t diagnosed in this beta.',
      ['Use the maker’s owner guidance, or a technician who works on that type of unit.', 'If you already know the model number, write it down. Don’t remove a cover or climb to find it.'],
      'Don’t apply this mini-split guide to other equipment.', 'scope',
      'insufficient_info', 'ms_equipment_oos'),
    ms_system_unconfirmed: r('More information needed', 'Confirm the system first', 'This check needs a confirmed ductless mini-split.',
      'Guessing the equipment type can send you down the wrong steps.',
      ['Check the owner’s manual, or ask someone who knows the equipment.', 'Start again when you can confirm it. If you can’t, call an HVAC company rather than guessing.'],
      'Don’t remove covers or climb to read labels.', 'scope',
      'insufficient_info', 'ms_system_unconfirmed'),
    ms_landing_not_in_pr1: r('More information needed', 'Not covered in this check', 'Noise and smell aren’t sorted out here.',
      'This check covers cooling, heating, and a look at the outdoor unit. It won’t guess at a noise or a smell.',
      ['If something smells like burning, or you see smoke or sparks, get people away and call 911 from safety.', 'Otherwise, call a licensed HVAC pro who works on mini-splits. Tell them what you noticed and when it started.'],
      'Don’t open covers, reset breakers, or open the outdoor unit to look for the cause.', 'safety',
      'insufficient_info', 'ms_landing_not_in_pr1'),
    ms_settings_fixed_basic: r('Basic homeowner check', 'Leave it set this way', 'A setting was the problem.',
      'Cool mode, a setting below the room, and a normal fan speed let the mini-split cool the way it should.',
      ['Leave it in Cool, not Auto, while you need cooling.', 'If you use Quiet, Sleep, or a schedule, check that it isn’t turning cooling off when you need it.', 'If it stops cooling again with the right settings, start a new check and choose Not cooling.'],
      'Don’t change installer settings or open the unit.', 'maintenance',
      'next_step', 'ms_settings_fixed_basic', { diyTier: 'basic' }),
    ms_no_response_wave1: r('Professional guidance', 'Arrange HVAC service', 'The unit isn’t responding to its controls.',
      'When the remote or app can’t control it, or the indoor unit shows no lights, the cause can be power, wiring, or the controls inside. Those are pro checks.',
      ['Call a licensed HVAC pro. Tell them whether the indoor unit shows any lights, and whether fresh remote batteries helped.', 'If you smell burning or see smoke or sparks, get people away and call 911 from safety.'],
      'Don’t open the indoor or outdoor unit, rewire anything, or reset breakers to test it.', 'electrical',
      'call_pro', 'ms_no_response_wave1'),
    ms_controls_unsure: r('More information needed', 'Check the settings first', 'The next steps depend on the remote or app settings.',
      'If the remote screen is hard to read, the app or the owner’s manual can show the current mode and setting.',
      ['Look at the app, or the remote in good light, and note the mode, temperature, and fan setting.', 'Start again when you can see them. If you can’t read them at all, call an HVAC pro.'],
      'Don’t open the unit to look for settings.', 'scope',
      'insufficient_info', 'ms_controls_unsure'),
    ms_filter_inaccessible: r('Professional guidance', 'Arrange HVAC service', 'Skip a filter step you can’t do.',
      'If the filters are out of reach from the floor, need tools or force, or need power switched off at a breaker first, let a pro do it.',
      ['If a cover is partly open, leave it and keep the unit Off with the remote.', 'From the floor, move curtains or furniture away from the indoor unit.', 'Call a licensed HVAC pro and ask them to clean the filters and check airflow. Tell them how the system is acting.'],
      'Don’t climb a ladder, chair, or stool, pry the cover, or run the unit without filters.', 'maintenance',
      'call_pro', 'ms_filter_inaccessible'),
    ms_filter_path_unconfirmed: r('More information needed', 'Find the filter steps first', 'The filter step waits on your owner’s manual.',
      'Covers and clips differ by model. Guessing can break them.',
      ['If you already know the model number, look up the owner’s manual from the maker. Don’t climb or remove a cover to find it.', 'Start a new check when you have the filter steps, or ask an HVAC pro to clean the filters.'],
      'Don’t pry or force the front cover.', 'maintenance',
      'insufficient_info', 'ms_filter_path_unconfirmed'),
    ms_filter_drying_basic: r('Basic homeowner check', 'Finish when the filters are dry', 'Washed filters need to dry fully first.',
      'Let them dry in the shade, not in the sun or with a heater or hair dryer.',
      ['Leave the unit Off until the filters are back in. Run it only with the filters in place.', 'When they’re dry, slide them back in and close the cover all the way.', 'Run it in the mode you need for about 15 minutes. If the air is still weak, or the room still isn’t comfortable, start a new check.'],
      'Don’t use heat to dry them, and don’t run the unit without filters.', 'maintenance',
      'next_step', 'ms_filter_drying_basic', { diyTier: 'basic' }),
    ms_filter_replace_basic: r('Basic homeowner check', 'Get the right replacement filter', 'A filter is torn, damaged, or missing.',
      'Replacement filters are made for each model. The maker or your installer can tell you which one fits.',
      ['Order the replacement filter for your model from the maker or a dealer.', 'Most manuals say not to run the unit without its filters. Follow yours until the new one arrives.', 'Put the new filter in the way the manual shows. If it doesn’t fit, don’t force it. Call your installer.'],
      'Don’t trim a different filter to fit, and don’t force the cover.', 'maintenance',
      'next_step', 'ms_filter_replace_basic', { diyTier: 'basic' }),
    ms_head_cleaning_pro: r('Professional guidance', 'Arrange a professional cleaning', 'Buildup inside the indoor unit is a pro cleaning job.',
      'Mold, slime, or heavy dirt inside the unit needs a pro cleaning. Spray cleaners and bleach can damage the unit.',
      ['Close the cover. Leave the unit Off if the air smells musty or bad.', 'Call a licensed HVAC pro and ask for an indoor-unit cleaning. Tell them what you saw.', 'Keep cleaning the washable filters on the schedule in your manual.'],
      'Don’t spray cleaners, bleach, or water into the unit, or take it apart.', 'maintenance',
      'call_pro', 'ms_head_cleaning_pro'),
    ms_louver_stuck: r('Professional guidance', 'Arrange HVAC service', 'The louver won’t move with the remote.',
      'Forcing a louver by hand can break it. A pro can check the louver and what drives it.',
      ['Leave the louver where it is.', 'If air still comes out, you can keep using the unit. If the louver is closed and blocking the air, turn it Off with the remote.', 'Call a licensed HVAC pro and tell them what the louver does.'],
      'Don’t push, pry, or bend the louver, or open the unit.', 'maintenance',
      'call_pro', 'ms_louver_stuck'),
    ms_airflow_improved_basic: r('Basic homeowner check', 'Keep the filters clean', 'The basic checks brought the air back.',
      'Clean filters and a clear path in front of the unit are common fixes for weak air.',
      ['Clean the filters as often as your manual says. Many say every two weeks when it runs a lot.', 'Keep curtains and furniture clear of the indoor unit.', 'If the air gets weak again soon after cleaning, or you see ice or water, start a new check.'],
      'Don’t spray cleaners into the unit or open it past the filters.', 'maintenance',
      'next_step', 'ms_airflow_improved_basic', { diyTier: 'basic' }),
    ms_weak_air_after_basics: r('Professional guidance', 'Arrange HVAC service', 'Air is still weak after the basic checks.',
      'Settings, filters, and a clear path are done. What’s left is inside the unit, and that needs a pro. This isn’t a confirmed diagnosis.',
      ['If you see ice or water, or it isn’t cooling or heating, turn it Off with the remote.', 'Call a licensed HVAC pro. Tell them what you checked: settings, filters, and anything blocking the unit.', 'Your service note below lists what you told this check.'],
      'Don’t open the unit, spray cleaners inside, or add refrigerant.', 'maintenance',
      'call_pro', 'ms_weak_air_after_basics'),
    ms_no_cool_after_basics: r('Professional guidance', 'Arrange HVAC service', 'Air is moving, but it isn’t cooling.',
      'Settings, filters, and a clear path are done. When strong air still isn’t cold, the cause needs a pro to test. This isn’t a confirmed diagnosis.',
      ['Turn it Off with the remote so it doesn’t run without cooling.', 'Call a licensed HVAC pro. Tell them the settings, filter, and airflow checks you did.', 'If someone in the home becomes confused, faint, or seriously ill from the heat, call 911.'],
      'Don’t add refrigerant, open the outdoor unit, or reset breakers to test it.', 'safety',
      'call_pro', 'ms_no_cool_after_basics'),
    ms_airflow_unsure: r('More information needed', 'Check again when you can', 'The airflow check needs a clearer answer.',
      'It’s fine not to know. Don’t open the unit to find out.',
      ['Run Cool with the fan on High for 15 minutes, then compare the air to how it felt before.', 'Start a new check if it’s still unclear, or call an HVAC pro and describe what you noticed.'],
      'Don’t open the unit or put anything into the air outlet.', 'safety',
      'insufficient_info', 'ms_airflow_unsure'),
    ms_condensate_leak_wave1: r('Professional guidance', 'Protect the area · arrange service', 'Water from the indoor unit needs a pro.',
      'The water usually comes from the drain that carries water away from the unit. Clearing or fixing the drain, pump, or pan is a pro job.',
      ['Turn the unit Off with the remote to stop new water. Remote Off doesn’t cut the power, so stay away from the unit’s wiring.', 'Put towels or a bucket under it. Keep water away from outlets and cords.', 'Call a licensed HVAC pro. Tell them where the water is and how much.', 'If water reaches an outlet, cord, or light, stay clear and call a pro or electrician.', 'If you see sparks or smoke, or smell burning, get out and call 911 from outside.'],
      'Don’t open the unit, pour bleach, vinegar, or other chemicals into the drain, push anything through it, or drill holes.', 'safety',
      'call_pro', 'ms_condensate_leak_wave1'),
    ms_error_code_wave1: r('Professional guidance', 'Arrange HVAC service', 'Give the code to a pro.',
      'Error codes point a pro to what to check. They aren’t a homeowner repair list, and the same code can mean different things on different brands.',
      ['If it isn’t cooling, or the code keeps coming back, turn it Off with the remote.', 'Call a licensed HVAC pro, or the installer or maker. Give them the code or light pattern, when it showed, and what the unit was doing.', 'If you couldn’t read it from the floor, say so. Don’t climb to read it.'],
      'Don’t follow repair steps from a code list.', 'safety',
      'call_pro', 'ms_error_code_wave1'),
    ms_ice_cooling_wave1: r('Stop / professional', 'Turn it off · call a pro', 'Turn it off and let the ice melt.',
      'Running a mini-split with ice on it can damage it, and the melt can drip. A dirty filter can cause ice, and so can problems only a pro can check.',
      ['Turn the unit Off with the remote or app.', 'Put towels or a bucket under the indoor unit. Keep water away from outlets and cords.', 'Let the ice melt on its own. It can take a few hours.', 'Call a licensed HVAC pro. Tell them where you saw ice and when the filters were last cleaned.', 'If water reaches an outlet, cord, or light, stay clear and call a pro or electrician.', 'If you see sparks or smoke, or smell burning, get out and call 911 from outside.'],
      'Don’t chip or pick at the ice, or use a hair dryer, heat gun, hot water, a hose, or salt, or cover the unit. Don’t restart cooling while any ice remains.', 'ice',
      'call_pro', 'ms_ice_cooling_wave1'),
    ms_ice_keep_running: r('Stop / professional', 'Hard stop · call a pro', 'Stop. Turn it off and let the ice melt.',
      'Running a mini-split with ice on it, or restarting it too soon, can damage it. Melting ice can drip from the indoor unit.',
      ['Turn the unit Off with the remote or app.', 'Put towels or a bucket under the indoor unit. Keep water away from outlets and cords.', 'Don’t open the front cover or any panel to check the ice.', 'Leave it off and call a licensed HVAC pro.', 'If water reaches an outlet or cord, stay clear and call a pro or electrician.'],
      'Don’t chip or pick at the ice, use a hair dryer, heat gun, hot water, a hose, or salt, cover the unit, or keep restarting it.', 'ice',
      'emergency_exit', 'ice_keep_running', { gate: 'ice_keep_running' }),
    ms_ice_unclear_or_heat: r('More information needed', 'Look only', 'This check can’t sort out this ice yet.',
      'Light frost on the outdoor unit while heating can be normal for a short time. A normal defrost can show steam, a pause in heating, and a whoosh, then heat returns. Thick ice that keeps building isn’t normal.',
      ['If the ice is thick, keeps building, or doesn’t clear within about an hour, turn the system Off with the remote and call a licensed HVAC pro.', 'If you’re not sure it’s ice, watch from where you already stand and describe it to a pro.', MS_BACKUP_HEAT],
      'Don’t chip ice, pour hot water on it, or open the outdoor unit.', 'ice',
      'insufficient_info', 'ms_ice_unclear_or_heat'),
    ms_hazard_now: r('Emergency', 'Stop. Get to safety.', 'A new hazard ends this check.',
      'Gas, smoke, sparks, a burning smell, or water at electrical equipment is not a mini-split DIY path.',
      ['If you smell gas or a carbon monoxide alarm is sounding, leave the building and call for help from outside. Do not operate switches inside.', 'If there is smoke, fire, or sparks, get people away and call 911 from safety.', 'If a refrigerant leak alarm is going off, move people out of the affected area to fresh air without operating switches or creating ignition sources. Don’t reset the alarm, cycle power, or turn off a blower that’s running. Call a licensed HVAC professional from outside the affected area, and for breathing trouble or immediate danger, call 911.', 'If water is at electrical equipment, stay clear and don’t touch anything. Leave the area and call a licensed HVAC pro or an electrician.', 'Do not return to troubleshooting until the hazard has been handled.'],
      'Do not keep diagnosing, open covers, or touch wet equipment.', 'safety',
      'emergency_exit', 'ms_new_hazard', { gate: 'ms_new_hazard' }),
    ms_unsure_water_electrical: r('Stop / professional', 'Do not continue the check', 'Don’t touch the indoor unit to find out.',
      'If you can’t tell whether water or melting ice is near an outlet, a cord, or the unit’s wiring, stop.',
      ['Stay clear of the indoor unit and any wet floor. Don’t touch the unit, a switch, a cord, or the breaker panel.', 'Leave the area and call a licensed HVAC pro or an electrician. Tell them what you already saw.', 'If you see sparks or smoke, or smell burning, get out and call 911 from outside.'],
      'Don’t mop around the unit, and don’t touch the breaker panel.', 'electrical',
      'emergency_exit', 'unsure_water_electrical', { gate: 'unsure_water_electrical' }),
    ms_water_electrical: r('Stop / professional', 'Keep away · urgent help', 'Don’t touch the indoor unit or stand in the water.',
      'Water is on or near the mini-split’s electrical parts.',
      ['Don’t touch the indoor unit, any switch, a cord, or the breaker panel, and don’t stand in the water.', 'Leave the area, keep others and pets away, and call a licensed HVAC pro or an electrician.', 'If you see sparks, smoke, or smell burning, get out and call 911 from outside.'],
      'Don’t touch the indoor unit, any switch, or the breaker panel.', 'electrical',
      'emergency_exit', 'water_near_electrical', { gate: 'water_near_electrical' }),
    ms_heat_settings_fixed_basic: r('Basic homeowner check', 'Leave it set this way', 'Leave it in Heat.',
      'Heat mode, a setting above the room, and a normal fan let the mini-split heat the way it should. A short warm-up is normal. So is an occasional defrost pause.',
      ['Leave it in Heat, not Auto, while you need heat.', 'Expect a short warm-up. The indoor fan may wait a few minutes so it doesn’t blow cold air.', 'An occasional pause with steam and a whoosh can be a normal defrost. If ice stays or keeps building, turn it Off with the remote and call a licensed HVAC pro.'],
      'Don’t change installer settings, open the unit, or switch modes during a defrost pause.', 'maintenance',
      'next_step', 'ms_heat_settings_fixed_basic', { diyTier: 'basic' }),
    ms_heat_auto_fixed_basic: r('Basic homeowner check', 'Leave it in Heat', 'Heat, not Auto, was the fix.',
      'Auto had the unit off Heat. Setting Heat and waiting brought the heat back.',
      ['Leave it in Heat, not Auto, during heating season.', 'If it stops heating again with Heat set, start a new check and choose Not heating.', MS_BACKUP_HEAT],
      'Don’t leave it on Auto when you need steady heat.', 'maintenance',
      'next_step', 'ms_heat_auto_fixed_basic', { diyTier: 'basic' }),
    ms_defrost_normal_basic: r('Basic homeowner check', 'Leave it in Heat', 'That pause was a normal defrost.',
      'Steam, a pause, and a whoosh, then heat returns, can be a normal defrost. It often lasts about 5 to 15 minutes.',
      ['Leave it in Heat. Don’t switch modes during a defrost pause.', 'If ice stays, keeps building, or heat doesn’t return after about an hour, turn it Off with the remote and call a licensed HVAC pro.', MS_BACKUP_HEAT],
      'Don’t chip ice, pour hot water, or use a heat gun. Don’t cover the outdoor unit.', 'ice',
      'next_step', 'ms_defrost_normal_basic', { diyTier: 'basic' }),
    ms_outdoor_running_call_pro: r('Professional guidance', 'Arrange HVAC service', 'The outdoor unit is running, and the room still isn’t comfortable.',
      'A pro needs to test the system. This isn’t a diagnosis.',
      ['You can leave it in Heat if some heat is coming. If no useful heat is coming, turn it Off with the remote.', 'Call a licensed HVAC pro. Tell them the outdoor unit was running and the room was still not comfortable.', MS_BACKUP_HEAT],
      'Don’t open either unit.', 'safety',
      'call_pro', 'ms_outdoor_running_call_pro'),
    ms_outdoor_not_running_wave1: r('Professional guidance', 'Arrange HVAC service', 'The outdoor unit is quiet while a unit is calling.',
      'When an indoor unit is asking for heat or cool and the outdoor unit stays quiet, the cause needs a pro. This isn’t a diagnosis.',
      ['Leave the indoor unit as it is, or turn it Off with the remote.', 'Call a licensed HVAC pro. Tell them the indoor unit was calling and the outdoor unit was quiet.', MS_BACKUP_HEAT],
      'Don’t reset a breaker, open a disconnect, or cover the outdoor unit.', 'safety',
      'call_pro', 'ms_outdoor_not_running_wave1'),
    ms_outdoor_freeze_heat_wave1: r('Stop / professional', 'Turn it Off · call a pro', 'Thick ice that won’t clear needs a pro.',
      'Ice that keeps building, or a unit that stays thickly coated after about an hour, isn’t a normal defrost. A normal defrost is a short pause with steam and a whoosh, then heat returns.',
      ['Turn the unit Off with the remote.', 'Call a licensed HVAC professional. Tell them the outdoor unit stayed thick with ice in heat and didn’t recover.', MS_BACKUP_HEAT],
      'Don’t chip the ice, pour hot water, use a heat gun or salt, or cover the outdoor unit.', 'ice',
      'call_pro', 'ms_outdoor_freeze_heat_wave1'),
    ms_ice_heat_keep_running: r('Stop / professional', 'Hard stop · call a pro', 'Stop. Turn it off. Don’t run it iced to force heat.',
      'Running an iced outdoor unit to force heat can damage it. Most mini-splits have no separate emergency heat.',
      ['Turn the unit Off with the remote or app.', MS_BACKUP_HEAT, 'Call a licensed HVAC pro once everyone is warm.'],
      'Don’t chip ice, pour hot water, use a heat gun or salt, or keep the iced unit running.', 'ice',
      'emergency_exit', 'ice_keep_running', { gate: 'ice_keep_running' }),
    ms_cold_exposure: r('Emergency', 'Get warm now · call 911 if needed', 'Get the person warm first.',
      'Someone at risk from the cold matters more than the mini-split.',
      ['If anyone is confused, very drowsy, or hard to wake, call 911 now.', 'Otherwise, get them somewhere warm: a neighbor, family, or a warming center.', 'Add blankets and dry layers in the meantime.', MS_BACKUP_HEAT, 'Call a licensed HVAC pro for the mini-split once everyone is warm.'],
      'Don’t wait on a mini-split repair to get someone warm.', 'safety',
      'emergency_exit', 'cold_exposure_911', { gate: 'cold_exposure_911' }),
    ms_heat_not_supported: r('More information needed', 'Confirm the equipment', 'This remote may have no heat.',
      'If the remote or app has no Heat setting, the unit may be cooling-only. This check won’t guess that it can heat.',
      ['Check the owner’s manual for the model you already know. Don’t open a cover or climb to find a model number.', 'If the manual has no Heat mode, call a licensed HVAC pro rather than guessing.', MS_BACKUP_HEAT],
      'Don’t force a mode the remote doesn’t offer, and don’t open the unit.', 'scope',
      'insufficient_info', 'ms_heat_not_supported'),
    ms_heat_wait_unsure: r('More information needed', 'Wait, then check again', 'Wait the full 10 to 15 minutes, then check again.',
      'Heat can take 10 to 15 minutes, and the indoor fan may stay off at first. Stopping early can look like no heat.',
      ['Leave it in Heat, at least 3°F above the room, and wait the full 10 to 15 minutes.', 'Start a new check after that if it still isn’t heating.', MS_BACKUP_HEAT],
      'Don’t switch modes during the wait, and don’t open the unit.', 'maintenance',
      'insufficient_info', 'ms_heat_wait_unsure'),
    ms_outdoor_unsure: r('More information needed', 'Stop where you can see from where I stand', 'Don’t go closer to see the outdoor unit.',
      'If you can’t see it from a window or from dry, cleared ground, stop there. Icy ground, deep snow, and darkness are reasons not to go out.',
      ['Stay inside. Describe what you already know to a licensed HVAC pro.', MS_BACKUP_HEAT],
      'Don’t climb, reach into the grille, or go out in unsafe conditions to look.', 'safety',
      'insufficient_info', 'ms_outdoor_unsure'),
    ms_outdoor_water_electrical: r('Stop / professional', 'Keep away · urgent help', 'Don’t touch the outdoor unit or stand in the water.',
      'Water, melt, or ice is on or near the outdoor unit’s power box, cord, or outlet.',
      ['Don’t touch the outdoor unit, any switch, a cord, or the breaker panel, and don’t stand in the water.', 'Leave the area, keep others and pets away, and call a licensed HVAC pro or an electrician.', 'If you see sparks, smoke, or smell burning, get out and call 911 from outside.'],
      'Don’t touch the outdoor unit, any switch, or the breaker panel.', 'electrical',
      'emergency_exit', 'water_near_electrical', { gate: 'water_near_electrical' }),
    ms_advanced_off: r('Professional guidance', 'Mini-split electrical DIY is off', 'Capacitor, contactor, inverter, and board work are not offered on a mini-split in this beta.',
      'Advanced electrical stays off for mini-splits.',
      ['Leave covers on.', 'Call a licensed HVAC professional. Tell them what the unit was doing and that you did not remove covers.'],
      'Do not start a capacitor, contactor, inverter, or board repair from this mini-split check.', 'electrical',
      'call_pro', 'ms_advanced_off', { diyTier: 'pro_only' }),
    sw_other_not_listed: r('More information needed', 'Not covered yet', 'This beta does not check that equipment yet.',
      'Ductless mini-splits and water-source or geothermal heat pumps each have a check on the previous screen. Anything else needs a technician who works on that equipment.',
      ['Go back and choose Ductless mini-split or Water-source / geothermal heat pump if that is what you have.', 'Otherwise use the maker’s owner guidance, or call a licensed pro who works on that equipment.', 'If you already know the model number, write it down. Don’t remove a cover or climb to find it.'],
      'Don’t open covers or climb to identify the equipment.', 'scope',
      'insufficient_info', 'sw_other_not_listed')
  };
  // Furnace-lane overlay for reused AC nodes. Key: '<nodeId>/<answerId>'. AC data and copy stay unchanged.
  const FN_EDGE = {
    'ac.cool.filter.check/filter_dirty_clogged': '@fn_filter_replace_basic',
    'ac.cool.filter.check/filter_missing': '@fn_filter_missing_basic',
    'ac.cool.filter.check/filter_clean_ok': s => (s.fnLanding === 'not_enough_heat' ? 'ac.cool.airflow.returns_supplies' : FN_CONCLUDE),
    'ac.cool.filter.check/filter_clean_weak_airflow': 'ac.cool.airflow.returns_supplies',
    'ac.cool.filter.check/cannot_check_safely': FN_CONCLUDE,
    'ac.tstat.blank.batteries/batteries_replaced_display_back': '@fn_batteries_display_back',
    'ac.tstat.blank.batteries/batteries_replaced_still_blank': FN_CONCLUDE,
    'ac.tstat.blank.batteries/hardwired_or_no_batteries': FN_CONCLUDE,
    'ac.tstat.blank.batteries/cannot_access_safely': FN_CONCLUDE,
    'ac.cool.airflow.returns_supplies/blocked_cleared_airflow_improved': '@fn_returns_supplies_cleared',
    'ac.cool.airflow.returns_supplies/blocked_cleared_still_weak': FN_CONCLUDE,
    'ac.cool.airflow.returns_supplies/no_blockers_found_still_weak': FN_CONCLUDE,
    'ac.cool.airflow.returns_supplies/cannot_check_safely': FN_CONCLUDE,
    'ac.gate.water_near_electrical/water_at_electrical_yes': '@fn_water_electrical',
    'ac.gate.water_near_electrical/water_clear_no_electrical_risk': FN_CONCLUDE,
    'ac.gate.water_near_electrical/water_elsewhere_not_electrical': FN_CONCLUDE,
    'ac.noise.hazard_screen/noise_burning_sparks_smoke': '@fn_burning_sparks',
    'ac.noise.hazard_screen/noise_no_hazard_symptoms': FN_CONCLUDE,
    'ac.noise.hazard_screen/noise_unsure_hazard': '@fn_gate_unsure'
  };
  const fnWaterReason = s => (s.fnFuel === 'electric' ? 'water_near_electric_furnace' : 'condensate_drain_issue');
  const FN_REASON = {
    'fn.tstat.mode_setpoint/cannot_change_settings': 'thermostat_control_issue',
    'ac.cool.filter.check/filter_clean_ok': s => (s.fnLanding === 'short_cycle' ? 'short_cycle_after_basics'
      : s.fnFuel === 'electric' ? 'electric_furnace_components'
        : s.fnLanding === 'cold_air' ? 'ignition_or_flame_suspected' : 'no_heat_after_basics'),
    'ac.cool.filter.check/cannot_check_safely': 'filter_inaccessible',
    'ac.tstat.blank.batteries/batteries_replaced_still_blank': 'blank_tstat_after_basics',
    'ac.tstat.blank.batteries/hardwired_or_no_batteries': 'blank_tstat_after_basics',
    'ac.tstat.blank.batteries/cannot_access_safely': 'tstat_inaccessible',
    'ac.cool.airflow.returns_supplies/blocked_cleared_still_weak': 'weak_heat_after_basics',
    'ac.cool.airflow.returns_supplies/no_blockers_found_still_weak': 'weak_heat_after_basics',
    'ac.cool.airflow.returns_supplies/cannot_check_safely': 'airflow_check_inaccessible',
    'ac.gate.water_near_electrical/water_clear_no_electrical_risk': fnWaterReason,
    'ac.gate.water_near_electrical/water_elsewhere_not_electrical': fnWaterReason,
    'ac.noise.hazard_screen/noise_no_hazard_symptoms': 'unusual_noise_furnace_wave1'
  };
  const FN_REASON_COPY = {
    no_heat_after_basics: "The thermostat and filter checks didn't bring the heat back. What's left is inside the furnace.",
    ignition_or_flame_suspected: "The blower runs but the air stays cool with the settings right. A pro should find out why.",
    short_cycle_after_basics: "It still starts and stops with the settings and filter checked. A pro should find out why.",
    weak_heat_after_basics: "Rooms are still short on heat with a clean filter and clear vents.",
    blank_tstat_after_basics: "The screen is still blank after the battery check, usually a power or control problem for a pro.",
    tstat_inaccessible: "The thermostat batteries couldn't be reached.",
    thermostat_control_issue: "The thermostat won't take Heat or a new setpoint.",
    filter_inaccessible: "The filter couldn't be reached.",
    airflow_check_inaccessible: "The vents couldn't be checked.",
    electric_furnace_components: "On an electric furnace, the next checks are high-voltage heating parts. That's work for a pro.",
    condensate_drain_issue: "There's water near the furnace, away from electrical parts. A pro should check the drain.",
    water_near_electric_furnace: "There's water near an electric furnace, away from electrical parts. A pro should find the source.",
    unusual_noise_furnace_wave1: "No hazard signs came with the noise. This guide doesn't diagnose furnace sounds.",
    fn_advanced_off: "That step isn't part of the furnace check. Advanced repairs are off."
  };

  function advancedEnabled() {
    const cfg = typeof globalThis !== 'undefined' ? globalThis.SW_CONFIG : null;
    return !!(cfg && cfg.advancedRepairsEnabled === true);
  }
  function targetsOf(next) {
    if (next && typeof next === 'object') {
      const found = [];
      const walk = value => {
        if (typeof value === 'string') found.push(value);
        else if (value && typeof value === 'object') Object.keys(value).forEach(k => walk(value[k]));
      };
      walk(next);
      return found;
    }
    return [next];
  }
  function targetsForFlag(next, flag) {
    if (next && typeof next === 'object' && Object.prototype.hasOwnProperty.call(next, 'whenAdvanced')) {
      return [flag ? next.whenAdvanced : next.default];
    }
    return targetsOf(next);
  }
  function hpEdges(next) {
    if (!next || typeof next !== 'object') return [next];
    const replacing = ['hpClear', 'hpOutdoor', 'hpHandback', 'hpHandbackWeak', 'hpDualFuel'].filter(k => typeof next[k] === 'string');
    if (replacing.length) return replacing.map(k => next[k]);
    const found = [];
    if (next.byHpLanding) Object.keys(next.byHpLanding).forEach(k => found.push(next.byHpLanding[k]));
    if (next.byHpAmbient) Object.keys(next.byHpAmbient).forEach(k => found.push(next.byHpAmbient[k]));
    if (typeof next.hpFilterDone === 'string') found.push(next.hpFilterDone);
    if (typeof next.hpDefrostAgain === 'string') found.push(next.hpDefrostAgain);
    if (typeof next.fnGateDone === 'string') found.push(next.fnGateDone);
    if (typeof next.default === 'string') found.push(next.default);
    if (!found.length && next.byLanding) Object.keys(next.byLanding).forEach(k => found.push(next.byLanding[k]));
    if (next.whenAdvanced && typeof next.default === 'string' && found.indexOf(next.default) === -1) found.push(next.default);
    return found;
  }
  function hpReachable() {
    const seen = new Set();
    const queue = ['hp.intake.system_confirm'];
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      const node = nodes[id];
      if (!node || id==='sd.entry.outdoor') continue;
      node.options.forEach(op => {
        hpEdges(op.next).forEach(target => {
          if (!target || typeof target !== 'string') return;
          if (target.charAt(0) === '@') seen.add(target);
          else queue.push(target);
        });
      });
    }
    return seen;
  }
  function wshpReachable() {
    const seen = new Set();
    const queue = ['wshp.hazard.flood_electrical'];
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      if (id === 'hp.intake.system_confirm' || id === 'ms.intake.system_confirm') continue;
      const node = nodes[id];
      if (!node) continue;
      node.options.forEach(op => {
        targetsOf(op.next).forEach(target => {
          if (!target || typeof target !== 'string') return;
          if (target.charAt(0) === '@') seen.add(target);
          else queue.push(target);
        });
      });
    }
    return seen;
  }

  function msReachable() {
    const seen = new Set();
    const queue = ['ms.intake.system_confirm'];
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      const node = nodes[id];
      if (!node || id.indexOf('ms.') !== 0) continue;
      node.options.forEach(op => {
        targetsOf(op.next).forEach(target => {
          if (!target || typeof target !== 'string') return;
          if (target.charAt(0) === '@') seen.add(target);
          else queue.push(target);
        });
      });
    }
    return seen;
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
      if (nodes[id]) throw new Error('Advanced node must not ship in the public bundle: ' + id);
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
          } else if (!nodes[target] && target.indexOf('ac.adv.cap.') !== 0) throw new Error('Missing node ' + target + ' from ' + id);
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
    reachable(true);
    const disconnect = nodes['ac.cool.power.disconnect_visual'];
    const disconnectText = disconnect.body + '\n' + disconnect.options.map(op => op.label + ' ' + op.hint).join('\n');
    if (!/does not tell you to/i.test(disconnectText) || !/flip the exterior lever/i.test(disconnect.body)) {
      throw new Error('Disconnect visual lock missing');
    }
    if (/\b(flip|turn|pull) the (lever|handle|disconnect)\b/i.test(disconnect.options.map(op => op.hint).join('\n'))) {
      throw new Error('Disconnect choice hints must not instruct operating the lever');
    }
    HP_WAVE1.forEach(id => {
      if (!nodes[id]) throw new Error('Missing HP node ' + id);
      if (nodes[id].diyTier === 'advanced') throw new Error('HP node must not be Advanced ' + id);
    });
    if (nodes['hp.defrost.sanity'].safetyGate !== true) throw new Error('Defrost safety gate must be true');
    if (nodes['hp.rv.mode_asymmetric'].diyTier !== 'pro_only') throw new Error('RV tier must be pro_only');
    if (nodes['hp.conclude.call_pro_defrost_valve_control'].diyTier !== 'pro_only') throw new Error('HP conclude tier must be pro_only');
    const agree = nodes[CONSENT].options.find(op => op.id === 'agree_18_terms');
    if (!agree || agree.next !== 'ac.cool.intake.system_confirm') throw new Error('Consent agree edge forked');
    if (!/18 or older/.test(agree.hint) || !/beta terms/.test(nodes[CONSENT].body)) throw new Error('Consent text forked');
    const SYSTEM_TYPE = 'sw.intake.system_type';
    const IDENTIFY = ['sw.identify.winter_outdoor', 'sw.identify.em_aux', 'sw.identify.heat_source'];
    [SYSTEM_TYPE].concat(IDENTIFY).forEach(id => {
      if (!nodes[id]) throw new Error('Missing unified-start node ' + id);
      if (nodes[id].diyTier === 'advanced') throw new Error('System-type node must not be Advanced ' + id);
    });
    const systemChoice = id => {
      const op = nodes[SYSTEM_TYPE].options.find(item => item.id === id);
      if (!op) throw new Error('Missing system-type choice ' + id);
      return op;
    };
    if (systemChoice('cooling_only_ac').next !== 'ac.cool.intake.system_confirm') throw new Error('Cooling-only must enter the AC tree');
    if (systemChoice('heat_pump').next !== 'hp.intake.system_confirm') throw new Error('Heat pump must enter hp.intake.system_confirm');
    if (systemChoice('not_sure').next !== 'sw.identify.winter_outdoor') throw new Error('Not sure must enter identify');
    const identifyChoice = (nodeId, id) => {
      const op = nodes[nodeId].options.find(item => item.id === id);
      if (!op) throw new Error('Missing identify choice ' + nodeId + '/' + id);
      return op;
    };
    if (identifyChoice('sw.identify.winter_outdoor', 'winter_outdoor_runs').next !== 'hp.intake.system_confirm') throw new Error('Winter outdoor run must enter HP');
    if (identifyChoice('sw.identify.winter_outdoor', 'winter_outdoor_never').next !== 'sw.identify.em_aux') throw new Error('Winter-off must ask Emergency heat');
    if (identifyChoice('sw.identify.winter_outdoor', 'winter_outdoor_unsure').next !== 'sw.identify.em_aux') throw new Error('Winter unsure must keep identifying');
    if (identifyChoice('sw.identify.em_aux', 'has_em_aux').next !== 'hp.intake.system_confirm') throw new Error('Emergency heat must enter HP');
    if (identifyChoice('sw.identify.em_aux', 'no_em_aux').next !== 'sw.identify.heat_source') throw new Error('No Emergency heat must ask the heat source');
    if (identifyChoice('sw.identify.em_aux', 'em_aux_unsure').next !== 'sw.identify.heat_source') throw new Error('Emergency unsure must keep identifying');
    if (identifyChoice('sw.identify.heat_source', 'label_says_heat_pump').next !== 'hp.intake.system_confirm') throw new Error('Heat-pump label must enter HP');
    if (identifyChoice('sw.identify.heat_source', 'heat_source_unsure').next !== 'hp.intake.system_confirm') throw new Error('Unsure heat source must enter HP');
    const furnace = identifyChoice('sw.identify.heat_source', 'separate_furnace_boiler').next;
    if (!furnace || furnace.whenCoolingOnly !== 'ac.cool.intake.system_confirm' || furnace.default !== 'hp.intake.system_confirm') {
      throw new Error('Separate furnace is cooling-only only on the strict triad; otherwise HP');
    }
    [SYSTEM_TYPE, 'sw.intake.other_system'].concat(IDENTIFY).forEach(id => {
      if (!nodes[id]) throw new Error('Missing unified-start node ' + id);
      nodes[id].options.forEach(op => {
        targetsOf(op.next).forEach(target => {
          if (target === CONCLUDE || (typeof target === 'string' && target.indexOf('ac.adv.cap.') === 0) || target === '@suspected_capacitor_contactor_advanced_off' || target === '@next_step_advanced') {
            throw new Error('System-type node edges into an AC capacitor path: ' + id + '/' + op.id);
          }
        });
      });
    });
    HP_WAVE1.forEach(id => {
      nodes[id].options.forEach(op => {
        targetsOf(op.next).forEach(target => {
          if (target === CONCLUDE || (typeof target === 'string' && target.indexOf('ac.adv.cap.') === 0)) {
            throw new Error('HP node edges into Advanced electrical: ' + id + '/' + op.id);
          }
        });
      });
    });
    const hpSeen = hpReachable();
    ['ac.cool.outdoor.fan_spinning', 'ac.cool.outdoor.debris_clearance', 'ac.cool.indoor.ice_lines_coil', 'ac.noise.clarify_outdoor_hum', 'ac.start.outdoor_silent_vs_hum', CONCLUDE].concat(ADVANCED).forEach(id => {
      if (hpSeen.has(id)) throw new Error('HP walk reached forbidden node ' + id);
    });
    ['@next_step_advanced', '@suspected_capacitor_contactor_advanced_off'].forEach(id => {
      if (hpSeen.has(id)) throw new Error('HP walk reached forbidden terminal ' + id);
    });
    ['hp.intake.system_confirm', 'hp.landing.picker', 'hp.mode.thermostat_check', 'hp.mode.force_match_complaint', 'hp.mode.emergency_aux_off', 'hp.ambient.outdoor_band', 'hp.defrost.sanity', 'hp.heat.capacity_vs_dead', 'hp.observe.leaving_air_vs_mode', 'hp.rv.mode_asymmetric', 'hp.handback.ac_filter_airflow', 'hp.conclude.call_pro_defrost_valve_control', 'hp.ice.mode_location', 'ac.noise.hazard_screen', 'ac.tstat.blank.batteries', 'ac.cool.power.breaker_visual', 'ac.cool.power.disconnect_visual', 'ac.cool.filter.check', 'ac.cool.airflow.returns_supplies', '@unusual_noise_hp_wave1', '@hp_outdoor_not_running_wave1', '@hp_basics_clear_after_filter', '@ice_keep_running', '@hp_ice_heat_outdoor', '@hp_short_cycle_after_mode_basics', '@hp_defrost_valve_ob_control', '@hp_refrigerant_intent'].forEach(id => {
      if (!hpSeen.has(id)) throw new Error('HP walk missing ' + id);
    });
    ['ac.cool.outdoor.fan_spinning', 'ac.noise.clarify_outdoor_hum', 'ac.cool.airflow.returns_supplies', 'ac.cool.power.disconnect_visual', 'ac.cool.landing.picker'].forEach(id => {
      if (!off.has(id)) throw new Error('AC path lost ' + id);
    });
    WSHP_WAVE1.forEach(id => {
      if (!nodes[id]) throw new Error('Missing WSHP node ' + id);
      if (nodes[id].diyTier === 'advanced') throw new Error('WSHP node must not be Advanced ' + id);
    });
    const wshpChoice = id => {
      const op = nodes['sw.intake.other_system'].options.find(item => item.id === id);
      if (!op) throw new Error('Missing other-system choice ' + id);
      return op;
    };
    if (wshpChoice('water_source_geo').next !== 'wshp.hazard.flood_electrical' || wshpChoice('water_source_geo').label !== 'Water-source / geothermal heat pump') {
      throw new Error('Water-source choice drifted');
    }
    if (wshpChoice('water_source_geo').hint !== 'No outdoor unit with a fan. Water pipes run to a ground loop, a well, or a pond.' || wshpChoice('water_source_geo').fact !== 'Water-source or geothermal heat pump reported at system type.') {
      throw new Error('Water-source choice copy drifted');
    }
    const typeIds = nodes['sw.intake.system_type'].options.map(item => item.id);
    if (typeIds.join('|') !== 'cooling_only_ac|heat_pump|furnace|other_heat_or_ductless|not_sure') {
      throw new Error('Start choices drifted');
    }
    if (systemChoice('furnace').next !== 'fn.gate.combustion_co') throw new Error('Furnace must enter the furnace gate');
    if (systemChoice('other_heat_or_ductless').next !== 'sw.intake.other_system' || systemChoice('other_heat_or_ductless').label !== 'Something else: water heater, boiler, mini-split, geothermal, thermostat, other') {
      throw new Error('Something else Start choice drifted');
    }
    if (wshpChoice('ductless_mini_split').next !== 'ms.intake.system_confirm') throw new Error('Ductless must enter the mini-split check');
    WSHP_WAVE1.forEach(id => {
      nodes[id].options.forEach(op => {
        if (typeof op.next !== 'string') throw new Error('WSHP edge must be a string: ' + id + '/' + op.id);
        targetsOf(op.next).forEach(target => {
          if (target.charAt(0) === '@') {
            if (!results[target.slice(1)]) throw new Error('Missing WSHP result ' + target);
          } else if (!nodes[target]) throw new Error('Missing WSHP node ' + target);
        });
      });
    });
    const hazard = nodes['wshp.hazard.flood_electrical'];
    if (hazard.safetyGate !== true) throw new Error('WSHP hazard stub must be a safety gate');
    hazard.options.forEach(op => {
      if (op.id === 'wshp_hz_none') {
        if (op.next !== 'wshp.heat.cold_home_screen') throw new Error('WSHP none must continue to the cold-home screen');
        return;
      }
      if (!op.gate) throw new Error('WSHP hazard choice missing a gate: ' + op.id);
      const res = results[op.next.slice(1)];
      if (!res || res.outcome !== 'emergency_exit') throw new Error('WSHP hazard choice must emergency-exit: ' + op.id);
    });
    const equip = nodes['wshp.entry.equipment_gate'];
    const equipNext = id => equip.options.find(op => op.id === id).next;
    if (equipNext('wshp_open_loop') !== 'wshp.openloop.complaint') throw new Error('Open loop must capture the complaint before the chemistry gate');
    if (equipNext('wshp_closed_loop') !== 'wshp.handback.call_pro' || equipNext('wshp_loop_unsure') !== 'wshp.handback.call_pro') {
      throw new Error('Closed and unsure loops must reach the handback');
    }
    if (equipNext('wshp_air_source') !== 'hp.intake.system_confirm') throw new Error('Air-source divert must enter the heat pump tree');
    if (results[equipNext('wshp_out_of_scope_size').slice(1)].outcome !== 'call_pro') throw new Error('Oversize must call a pro');
    if (results[equipNext('wshp_system_unsure').slice(1)].outcome !== 'insufficient_info') throw new Error('Unsure system must be insufficient_info');
    if (equipNext('wshp_ductless') !== '@wshp_divert_mini_split') throw new Error('Ductless divert must stay on the mini-split pointer');
    if (equipNext('wshp_furnace_combustion') !== '@wshp_divert_furnace' && equipNext('wshp_furnace_combustion') !== 'fn.gate.combustion_co') {
      throw new Error('Furnace divert drifted');
    }
    const chem = nodes['wshp.openloop.chemistry_gate'];
    if (chem.diyTier !== 'pro_only' || chem.safetyGate !== true) throw new Error('Chemistry gate must be pro_only and a safety gate');
    chem.options.forEach(op => {
      if (op.next.charAt(0) !== '@') throw new Error('Chemistry gate must not continue to a node');
      const res = results[op.next.slice(1)];
      if (!res || (res.outcome !== 'call_pro' && res.outcome !== 'emergency_exit')) throw new Error('Chemistry gate outcome drifted: ' + op.id);
      if (op.id !== 'hazard_now' && op.gate !== 'wshp_openloop_chemistry') throw new Error('Chemistry choice missing the chemistry gate: ' + op.id);
    });
    const handback = nodes['wshp.handback.call_pro'];
    if (handback.diyTier !== 'pro_only') throw new Error('Handback must be pro_only');
    handback.options.forEach(op => {
      const expected = op.id === 'hazard_now' ? '@wshp_hazard_now' : '@wshp_handback_call_pro';
      if (op.next !== expected) throw new Error('Handback edge drifted: ' + op.id);
    });
    WSHP_WAVE1.forEach(id => {
      if (id === 'wshp.hazard.flood_electrical') return;
      const hazardNow = nodes[id].options.find(op => op.id === 'hazard_now');
      if (!hazardNow || hazardNow.next !== '@wshp_hazard_now' || hazardNow.gate !== 'wshp_new_hazard') {
        throw new Error('WSHP node missing hazard_now: ' + id);
      }
    });
    const wshpSeen = wshpReachable();
    wshpSeen.forEach(id => {
      if (id.indexOf('ac.cool.') === 0 || id.indexOf('ac.start.') === 0 || id.indexOf('ac.noise.') === 0 || id === CONCLUDE) {
        throw new Error('WSHP walk reached a cooling node: ' + id);
      }
      if (ADVANCED.indexOf(id) !== -1) throw new Error('WSHP walk reached Advanced: ' + id);
      if (id.indexOf('hp.') === 0 && id !== 'hp.intake.system_confirm') throw new Error('WSHP walk reached an HP node: ' + id);
      if (id === '@next_step_advanced' || id === '@suspected_capacitor_contactor_advanced_off') throw new Error('WSHP walk reached a forbidden terminal: ' + id);
      if (id.charAt(0) === '@') {
        const res = results[id.slice(1)];
        if (res && res.outcome === 'next_step') throw new Error('WSHP walk reached a next_step result: ' + id);
      }
    });
    Object.keys(results).forEach(id => {
      if (id.indexOf('wshp_') !== 0) return;
      if (results[id].outcome === 'next_step' || results[id].diyTier === 'advanced') throw new Error('WSHP result tier drifted: ' + id);
    });
    ['wshp.hazard.flood_electrical', 'wshp.entry.equipment_gate', 'wshp.openloop.chemistry_gate', 'wshp.handback.call_pro', '@fire', '@electrical', '@gas', '@uncertain', '@wshp_hazard_now', '@wshp_mech_room_flood', '@wshp_breaker_wont_reset', '@wshp_openloop_water_quality_pro', '@wshp_handback_call_pro', '@wshp_out_of_scope_call_pro', '@wshp_system_unconfirmed', '@wshp_divert_mini_split', '@wshp_divert_furnace'].forEach(id => {
      if (!wshpSeen.has(id)) throw new Error('WSHP walk missing ' + id);
    });
    const bannedDiy = /\b(acid|bleach|chlorin\w*|biocide|descal\w*|flush\w*|purg\w*|glycol|antifreeze|refrigerant|gauges?|jump\w*|bypass\w*)\b/ig;
    const allowedPhrase = 'The water loop, pump, refrigerant, and controls';
    const allowedStart = /^(?:Do not|Don\u2019t|Don't|Never|Not offered|This check will not|No |If a refrigerant leak alarm)/;
    // Spec copy for @wshp_advanced_off names refrigerant in a technician-only sentence
    // that does not match the A-21 sentence-start list. Keep that sentence verbatim.
    const allowedExact = 'Capacitor, contactor, pump, wiring, and refrigerant work need a trained technician.';
    const checkBanned = (text, where, labelId) => {
      if (!text) return;
      if (labelId && (labelId.indexOf('want_diy_') === 0 || labelId === 'openloop_want_diy_treatment' || labelId === 'hazard_now')) return;
      const phraseAt = text.indexOf(allowedPhrase);
      bannedDiy.lastIndex = 0;
      let match;
      while ((match = bannedDiy.exec(text))) {
        const at = match.index;
        if (phraseAt !== -1 && at >= phraseAt && at < phraseAt + allowedPhrase.length) continue;
        const prior = text.slice(0, at);
        const start = Math.max(prior.lastIndexOf('.'), prior.lastIndexOf('!'), prior.lastIndexOf('?'), prior.lastIndexOf('\n'));
        const sentence = text.slice(start + 1).replace(/^[\s\-•]+/, '');
        if (allowedStart.test(sentence) || sentence.indexOf(allowedExact) === 0) continue;
        throw new Error('WSHP forbidden DIY word outside a prohibition: ' + match[0] + ' in ' + where);
      }
    };
    WSHP_WAVE1.forEach(id => {
      checkBanned(nodes[id].body, id + ' body');
      nodes[id].options.forEach(op => {
        checkBanned(op.label, id + '/' + op.id + ' label', op.id);
        checkBanned(op.hint, id + '/' + op.id + ' hint');
      });
    });
    Object.keys(results).forEach(id => {
      if (id.indexOf('wshp_') !== 0) return;
      checkBanned(results[id].explanation, id + ' explanation');
      (results[id].actions || []).forEach((action, index) => checkBanned(action, id + ' action ' + index));
    });
    const colorCallout = /\b(green|red|amber|yellow|blue)\b/i;
    WSHP_WAVE1.forEach(id => {
      const node = nodes[id];
      const blob = [node.section, node.title, node.body, node.caution].concat(node.options.map(op => [op.label, op.hint, op.fact].join(' '))).join('\n');
      if (colorCallout.test(blob)) throw new Error('WSHP color callout in ' + id);
    });
    Object.keys(results).forEach(id => {
      if (id.indexOf('wshp_') !== 0) return;
      const res = results[id];
      const blob = [res.title, res.urgency, res.explanation, res.avoid].concat(res.actions || []).join('\n');
      if (colorCallout.test(blob)) throw new Error('WSHP color callout in result ' + id);
    });
    const overlayProbe = { product: 'wshp' };
    ['ac.adv.cap.', '@next_step_advanced', '@suspected_capacitor_contactor_advanced_off', CONCLUDE].forEach(target => {
      if (applySessionOverlay(overlayProbe, 'wshp.handback.call_pro', 'probe', target) !== '@wshp_advanced_off') {
        throw new Error('WSHP overlay must map advanced targets to @wshp_advanced_off');
      }
    });
    if (applySessionOverlay({ product: 'hp' }, 'hp.landing.picker', 'probe', '@next_step_advanced') !== '@hp_advanced_electrical_off') {
      throw new Error('HP advanced overlay drifted');
    }
    FN_WAVE1.forEach(id => {
      if (!nodes[id]) throw new Error('Missing furnace node ' + id);
      if (nodes[id].diyTier === 'advanced') throw new Error('Furnace node must not be Advanced ' + id);
    });
    if (nodes[FN_GATE].safetyGate !== true) throw new Error('Furnace gate must be a safety gate');
    nodes[FN_GATE].options.forEach(op => {
      if (op.id === 'none_of_these') return;
      const res = typeof op.next === 'string' && op.next.charAt(0) === '@' ? results[op.next.slice(1)] : null;
      if (!res || (res.outcome !== 'emergency_exit' && res.outcome !== 'call_pro') || res.continueTo) throw new Error('Furnace gate choice must stop: ' + op.id);
    });
    if (nodes[FN_CONCLUDE].diyTier !== 'pro_only') throw new Error('Furnace conclude must be pro_only');
    Object.keys(results).filter(id => id.indexOf('fn_') === 0).forEach(id => {
      if (results[id].actions.indexOf(FN_CO_LINE) === -1) throw new Error('Furnace result missing CO line ' + id);
    });

    MS_PR1.forEach(id => {
      if (!nodes[id]) throw new Error('Missing mini-split node ' + id);
      if (nodes[id].diyTier !== 'basic') throw new Error('Mini-split node tier drifted ' + id);
    });
    if (MS_PR1.join('|') !== 'ms.intake.system_confirm|ms.landing.picker|ms.controls.mode_setpoint|ms.head.filter_path_ok|ms.head.filter_clean|ms.head.discharge_clear|ms.head.airflow_result|ms.head.water_observe|ms.error.capture|ms.ice.stop_observe') {
      throw new Error('MS_PR1 drifted');
    }
    if (MS_V1.join('|') !== 'ms.heat.mode_setpoint|ms.heat.force_heat|ms.heat.defrost_sanity|ms.outdoor.safe_observe') {
      throw new Error('MS_V1 drifted');
    }
    const MS_ALL = Object.keys(nodes).filter(id=>id.startsWith('ms.'));
    MS_V1.forEach(id => {
      if (!nodes[id]) throw new Error('Missing mini-split heat node ' + id);
      if (nodes[id].diyTier !== 'basic') throw new Error('Mini-split heat node tier drifted ' + id);
    });
    const msGates = ['ms.head.filter_path_ok', 'ms.head.water_observe', 'ms.error.capture', 'ms.ice.stop_observe', 'ms.heat.mode_setpoint', 'ms.heat.defrost_sanity', 'ms.outdoor.safe_observe'];
    MS_ALL.forEach(id => {
      if ((MS_PR1.includes(id)||MS_V1.includes(id))&&nodes[id].safetyGate !== (msGates.indexOf(id) !== -1)) throw new Error('Mini-split safety gate drifted ' + id);
      const last = nodes[id].options[nodes[id].options.length - 1];
      if (!last || last.id !== 'hazard_now' || last.next !== '@ms_hazard_now' || last.gate !== 'ms_new_hazard') {
        throw new Error('Mini-split hazard_now drifted ' + id);
      }
      nodes[id].options.forEach(op => {
        if (typeof op.next !== 'string') throw new Error('Mini-split edge must be a string: ' + id + '/' + op.id);
      });
    });
    const acIntakeIds = nodes['ac.cool.intake.system_confirm'].options.map(op => op.id);
    if (acIntakeIds.join('|') !== 'split_central_cool_only|heat_pump|ductless_mini_split|window_portable|geo_packaged_other|not_sure') {
      throw new Error('AC intake options drifted');
    }
    const acDuctless = nodes['ac.cool.intake.system_confirm'].options.find(op => op.id === 'ductless_mini_split');
    const acWindow = nodes['ac.cool.intake.system_confirm'].options.find(op => op.id === 'window_portable');
    if (!acDuctless || acDuctless.next !== 'ms.intake.system_confirm') throw new Error('AC ductless edge drifted');
    if (!acWindow || acWindow.next !== '@out_of_scope_equipment') throw new Error('Window unit edge drifted');
    if (nodes['ac.cool.intake.system_confirm'].options.some(op => op.id === 'mini_window_portable')) throw new Error('mini_window_portable remains');
    const hpMini = nodes['hp.intake.system_confirm'].options.find(op => op.id === 'mini_split_ductless');
    if (!hpMini || hpMini.next !== '@hp_mini_split_oos') throw new Error('HP mini-split edge drifted');
    if ([...hpReachable()].some(id => id.indexOf('ms.') === 0)) throw new Error('HP walk reached a mini-split node');
    const msSeen = msReachable();
    MS_ALL.forEach(id => { if (!msSeen.has(id)) throw new Error('Mini-split walk missing ' + id); });
    msSeen.forEach(id => {
      if (/^(ac\.|hp\.|sw\.|fn\.|wshp\.)/.test(id)) throw new Error('Mini-split walk left the lane: ' + id);
      if (ADVANCED.indexOf(id) !== -1 || id === CONCLUDE) throw new Error('Mini-split walk reached a forbidden node: ' + id);
      if (['@next_step_advanced', '@suspected_capacitor_contactor_advanced_off', '@hp_advanced_electrical_off', '@ice_keep_running', '@hp_ice_heat_outdoor', '@fn_cold_exposure', '@ms_advanced_off', '@electrical'].indexOf(id) !== -1) {
        throw new Error('Mini-split walk reached a forbidden terminal: ' + id);
      }
      if (id.charAt(0) === '@') {
        const res = results[id.slice(1)];
        if (!res) throw new Error('Mini-split walk missing result ' + id);
        if (['next_step', 'call_pro', 'emergency_exit', 'insufficient_info'].indexOf(res.outcome) === -1) throw new Error('Mini-split outcome drifted ' + id);
        if (res.continueTo) throw new Error('Mini-split result continues: ' + id);
        if (res.outcome === 'next_step' && res.diyTier !== 'basic') throw new Error('Mini-split next_step tier drifted ' + id);
      }
    });
    if (!msSeen.has('@ms_water_electrical') || results.ms_water_electrical.outcome !== 'emergency_exit' || results.ms_water_electrical.continueTo || results.ms_water_electrical.gate !== 'water_near_electrical') {
      throw new Error('Mini-split water/electrical stop drifted');
    }
    MS_ALL.forEach(id => {
      nodes[id].options.forEach(op => {
        const target = op.next;
        const res = target.charAt(0) === '@' ? results[target.slice(1)] : null;
        if (op.gate && (!res || res.outcome !== 'emergency_exit')) throw new Error('Gated mini-split choice must emergency-exit: ' + id + '/' + op.id);
        if (res && res.outcome === 'emergency_exit' && !op.gate) throw new Error('Emergency mini-split choice missing a gate: ' + id + '/' + op.id);
      });
    });
    const msChoice = (nodeId, optionId) => {
      const op = nodes[nodeId].options.find(item => item.id === optionId);
      if (!op) throw new Error('Missing mini-split choice ' + nodeId + '/' + optionId);
      return op;
    };
    const heatStop = (nodeId, optionId, resultId, gate) => {
      const op = msChoice(nodeId, optionId);
      const res = op.next.charAt(0) === '@' ? results[op.next.slice(1)] : null;
      if (op.next !== '@' + resultId || op.gate !== gate || !res || res.outcome !== 'emergency_exit' || res.gate !== gate) {
        throw new Error('Mini-split hard stop drifted ' + nodeId + '/' + optionId);
      }
    };
    heatStop('ms.heat.mode_setpoint', 'cold_exposure_risk', 'ms_cold_exposure', 'cold_exposure_911');
    heatStop('ms.heat.defrost_sanity', 'ice_want_keep_running', 'ms_ice_heat_keep_running', 'ice_keep_running');
    heatStop('ms.heat.defrost_sanity', 'steam_or_smoke_unsure', 'ms_hazard_now', 'ms_new_hazard');
    heatStop('ms.outdoor.safe_observe', 'ice_want_keep_running', 'ms_ice_heat_keep_running', 'ice_keep_running');
    heatStop('ms.outdoor.safe_observe', 'steam_or_smoke_unsure', 'ms_hazard_now', 'ms_new_hazard');
    heatStop('ms.outdoor.safe_observe', 'water_near_outdoor_electrical', 'ms_outdoor_water_electrical', 'water_near_electrical');
    const icedSolid = msChoice('ms.heat.defrost_sanity', 'outdoor_iced_solid_no_recover');
    if (icedSolid.next !== '@ms_outdoor_freeze_heat_wave1' || icedSolid.gate !== 'ice_keep_running' || results.ms_outdoor_freeze_heat_wave1.outcome !== 'emergency_exit') {
      throw new Error('Ice that keeps building must call a pro');
    }
    if (msChoice('ms.outdoor.safe_observe', 'outdoor_thick_ice_heating').next !== '@ms_outdoor_freeze_heat_wave1') {
      throw new Error('Outdoor thick ice must call a pro');
    }
    if (msChoice('ms.ice.stop_observe', 'ice_outdoor_heating_or_unsure').next !== '@ms_ice_unclear_or_heat') {
      throw new Error('Ice screen must not loop back into defrost');
    }
    ['filter_needs_ladder', 'filter_needs_tools_or_force', 'manual_says_cut_power'].forEach(id => {
      const op = nodes['ms.head.filter_path_ok'].options.find(item => item.id === id);
      if (!op || op.next !== '@ms_filter_inaccessible' || results.ms_filter_inaccessible.outcome !== 'call_pro') {
        throw new Error('Unsafe filter access must call a pro: ' + id);
      }
    });
    (function assertMsDag() {
      const visiting = new Set();
      const done = new Set();
      const walkMs = id => {
        if (done.has(id)) return;
        if (visiting.has(id)) throw new Error('Mini-split cycle at ' + id);
        visiting.add(id);
        const node = nodes[id];
        if (node && id.indexOf('ms.') === 0) {
          node.options.forEach(op => {
            if (op.next.charAt(0) !== '@') walkMs(op.next);
          });
        }
        visiting.delete(id);
        done.add(id);
      };
      walkMs('ms.intake.system_confirm');
    })();
    Object.keys(nodes).concat(Object.keys(results)).forEach(id => {
      if (/^ms\.(breaker|power|rv|inverter|refrigerant|adv)/.test(id)) throw new Error('Deferred mini-split id ' + id);
    });
    const multiZone = nodes['ms.intake.system_confirm'].options.find(op => op.id === 'ductless_multi_zone');
    if (!multiZone || multiZone.next !== 'ms.zone.which_head' || results.ms_multi_zone_pr2) {
      throw new Error('Multi-zone must stay on the later-version result');
    }
    ['ms_outdoor_not_running_wave1', 'ms_outdoor_freeze_heat_wave1'].forEach(id => {
      if (!results[id] || results[id].outcome !== (id==='ms_outdoor_freeze_heat_wave1'?'emergency_exit':'call_pro') || results[id].continueTo) throw new Error('Outdoor wave-1 result drifted ' + id);
    });
    Object.keys(nodes).forEach(id => {
      nodes[id].options.forEach(op => {
        if (op.id !== 'hazard_now') return;
        const res = typeof op.next === 'string' && op.next.charAt(0) === '@' ? results[op.next.slice(1)] : null;
        const receivingGate = op.next === ENTRY || (HEAT.owns(id) && nodes[op.next] && nodes[op.next].safetyGate);
        if ((!res || res.outcome !== 'emergency_exit') && !receivingGate) throw new Error('hazard_now must emergency-exit or re-triage: ' + id);
      });
    });
    MS_ALL.forEach(id => {
      nodes[id].options.forEach(op => {
        if (targetsForFlag(op.next, false).join('|') !== targetsForFlag(op.next, true).join('|')) {
          throw new Error('Mini-split edge changes with the advanced flag: ' + id + '/' + op.id);
        }
      });
    });
    ['@next_step_advanced', '@suspected_capacitor_contactor_advanced_off', CONCLUDE, 'ac.adv.cap.'].forEach(target => {
      if (applySessionOverlay({ product: 'ms' }, 'ms.landing.picker', 'probe', target) !== '@ms_advanced_off') {
        throw new Error('Mini-split overlay must map advanced targets to @ms_advanced_off');
      }
    });
    const shutOff = /\b(shut|turn|switch|cut)\w*\s+(off\s+)?(the\s+)?(main\s+)?(power|breaker)\b|\bshut power\b|breaker\s+(off|on)\b|\bflip\b|\breset\w*\s+(the\s+)?breaker/i;
    const shutOffAllow = new Set([
      'Don’t open the unit, clear codes or error history from any menu, or reset breakers.',
      'Don’t reset breakers or switches to hurry it.',
      'Don’t reset breakers.',
      'Don’t restart it again, and don’t reset breakers.',
      'Don’t turn it off and on again to clear the code, don’t clear its history, and don’t reset breakers.',
      'If it says to switch off power at a breaker or switch, stop here.',
      'It doesn’t cut the power.',
      'My manual says to switch off power at a breaker or switch first',
      'Remote Off doesn’t cut the power.',
      'Don’t open covers, reset breakers, or open the outdoor unit to look for the cause.',
      'Don’t open the indoor or outdoor unit, rewire anything, or reset breakers to test it.',
      'Don’t add refrigerant, open the outdoor unit, or reset breakers to test it.',
      'Remote Off doesn’t cut the power, so stay away from the unit’s wiring.',
      'Don’t touch the indoor unit, any switch, a cord, or the breaker panel, and don’t stand in the water.',
      'Don’t touch the indoor unit, any switch, or the breaker panel.',
      'Don’t mop around the unit, and don’t touch the breaker panel.',
      'Stay clear of the indoor unit and any wet floor. Don’t touch the unit, a switch, a cord, or the breaker panel.'
    ]);
    const assertNoShutOff = (text, where) => {
      String(text || '').split(/(?<=[.!?])\s+|\n+/).map(sentence => sentence.trim()).filter(Boolean).forEach(sentence => {
        if (shutOff.test(sentence) && !shutOffAllow.has(sentence)) throw new Error('Shut-off instruction in ' + where + ': ' + sentence);
      });
    };
    Object.keys(results).forEach(id => {
      if (id.indexOf('ms_') !== 0 && id !== 'unsure_water_electrical' && id !== 'leak') return;
      const res = results[id];
      [res.title, res.urgency, res.explanation, res.avoid].concat(res.actions || []).forEach((text, index) => assertNoShutOff(text, id + ' field ' + index));
    });
    MS_ALL.forEach(id => {
      const node = nodes[id];
      [node.title, node.body, node.caution].forEach((text, index) => assertNoShutOff(text, id + ' field ' + index));
      node.options.forEach(op => {
        assertNoShutOff(op.label, id + '/' + op.id + ' label');
        assertNoShutOff(op.hint, id + '/' + op.id + ' hint');
        assertNoShutOff(op.fact, id + '/' + op.id + ' fact');
      });
    });
    if (results.ms_advanced_off.outcome !== 'call_pro' || results.ms_advanced_off.diyTier !== 'pro_only') {
      throw new Error('Mini-split advanced defense drifted');
    }
    TS.assertTs(nodes, results);
  }
  Object.keys(TS.nodes).forEach(id => { nodes[id] = TS.nodes[id]; });
  Object.keys(TS.results).forEach(id => { results[id] = TS.results[id]; });
  HEAT.install(nodes, results);
  results.hp_cold_exposure=Object.assign({},results.cold_exposure);
  const sideEntry=()=>o('fan_on_side','My outdoor unit’s fan is on the side and blows air out sideways (not up)','sd.entry.outdoor','Start with mode and hazards before outdoor observations.','Side-discharge outdoor unit reported.');
  nodes['ac.cool.outdoor.fan_spinning'].options.splice(3,0,sideEntry());
  nodes['ac.start.outdoor_silent_vs_hum'].options.splice(2,0,sideEntry());
  nodes['hp.landing.picker'].options.push(o('landing_outdoor_side_unit','Snow or something close around the outdoor unit, ice under it, or it looks tilted, and its fan is on the side (it blows out sideways)','sd.entry.outdoor','For no heat, weak heat, ice on the unit itself, or an outdoor unit that won’t run, pick one of the choices above first.','Complaint: Side-discharge outdoor unit.'));
  Object.assign(nodes['ac.cool.outdoor.debris_clearance'],{notice:'pn-short',step:{what:'Moves loose ground debris and ordinary stored items away from the outdoor air path.',caution:'The fan can start automatically. Fins are sharp and easily damaged; thermostat Off does not disconnect electricity.',source:'LG outdoor-obstruction guidance, CH61; checked October 12, 2026. Ground-only access limits are Second Wrench policy.',steps:['Record the thermostat settings and set the thermostat to Off for this brief task. If the home cannot tolerate a pause in heating or cooling, call a professional.','From dry, level ground, move only ordinary items and loose ground debris away from the cabinet. Follow the exact installation manual for clearance. Do not brush the unit, touch fins, reach through a grille, use a hose, or prune plants with tools.','Step back. Restore the recorded thermostat settings only if no ice, water near electrical parts, smell, or abnormal fan noise is present. Otherwise leave the request Off and call for help.'],watch:'Observe from a few steps back for about ten minutes only while everyone has enough cooling. Stop for new noise, rubbing, struggling, smoke, or another warning.',stop:'Debris on the unit, damaged wiring, wet or icy access, or anything requiring equipment contact is a professional job.',undo:'If you cannot restore the settings you recorded, leave the request Off and call for help. Do not return to equipment during a hazard.',locked:'No covers, grilles, fins, electrical boxes, disconnects, refrigerant pipes or valves, mounting, or drainage work.'}});
  nodes['ac.cool.outdoor.debris_clearance'].options.push(sideEntry());
  nodes['ac.cool.outdoor.debris_clearance'].options.push(o('hazard_now','New hazard now (gas smell, CO or refrigerant leak alarm, smoke, sparks, or water at electrical parts)','ac.gate.cluster_entry','Stop the check.','New hazard reported during outdoor clearing.',{gate:'new_hazard'}));
  results.hp_mini_split_oos.actions=['Go back home, press Start, and choose “Ductless mini-split”. It covers cooling and heating problems on one or several indoor units.','Choose the number of indoor units you already know about. Do not open equipment to identify the system.'];
  nodes['wshp.hazard.flood_electrical'].options.find(o=>o.id==='wshp_hz_none').next='wshp.heat.cold_home_screen';
  nodes['wshp.entry.equipment_gate'].options.find(o=>o.id==='wshp_open_loop').next='wshp.openloop.complaint';
  results.owner_ask_installer=r('Professional guidance','Ask your installer first.','The optional step can wait.','Check the equipment instructions and any active installer agreement before changing it.', ['Ask your installer or licensed HVAC professional whether this step applies to the equipment.','For any new hazard, use Stop / get help.'], 'Do not change equipment while its condition or instructions are uncertain.', 'professional', 'call_pro','installer_first');
  results.breaker_seasonal_restore_basic.title='Power restored · keep the start-up wait';
  results.breaker_seasonal_restore_basic.explanation='You reported one seasonal power restoration. Equipment operation has not been confirmed.';
  results.breaker_seasonal_restore_basic.actions=['Keep the thermostat Off for the exact manual’s start-up wait. Second Wrench uses 24 hours before cooling after seasonal power restoration. If it’s urgent, wait as long as you can.','After the required wait, restore your normal thermostat settings only if no hazard or fault has appeared.','If the outdoor unit is still silent about 15 minutes after you start it, leave it Off and call a licensed HVAC professional.','If the breaker trips immediately or at the next start, do not reset it; leave it stopped and call a licensed HVAC professional or electrician.'];
  results.filter_replace_basic.title='Observe after the filter change';
  results.filter_replace_basic.explanation='The filter change and closed access are reported; operation has not yet been confirmed.';
  results.filter_replace_basic.actions=['With no warning signs, the specified filter in place, and its access closed, restore the thermostat settings you recorded.','Observe from where you normally stand for 10–15 minutes, only if the home has enough heating or cooling and nobody is at risk.','If ice, water, an alarm, an unusual noise, or a smell appears, stop the check and use Stop / get help. If airflow or comfort stays poor, call a licensed HVAC professional.'];
  results.hot_water_steam = r('Emergency','Stay away from hot water and steam.','Escaping hot water or steam can cause severe burns.','The source and cause have not been confirmed.', ['Keep everyone away from the equipment, water, steam, and discharge pipe. Do not touch a valve or try to plug the pipe.','For a gas smell, CO alarm, smoke, or illness, leave immediately and call 911 from outside. Do not operate switches on the way out.','Otherwise move away and call a licensed heating professional or plumber urgently for this equipment. A room thermostat set to Off may not stop water heating or other zones.'], 'Do not approach the equipment to investigate or attempt a reset.', 'hot_water_steam', 'emergency_exit', 'hot_water_steam', { gate: 'hot_water_steam' });
  nodes[ENTRY].options.splice(-1,0,o('hazard_hot_water_steam','Spraying hot water, escaping steam, or a relief pipe discharging','@hot_water_steam','Stay back from the discharge.','Hot water or steam release reported.',{gate:'hot_water_steam'}));
  nodes['sw.intake.other_system'].options.unshift(
    o('water_heater', 'Water heater or no hot water', 'wh.gate.safety', 'Tank, tankless, or heat pump water heater. A safety check comes first.', 'Water heater concern reported.'),
    o('boiler', 'Boiler, radiators, baseboard, or radiant floors', 'bl.gate.safety', 'Includes steam and hot-water heat, and water coils in air handlers.', 'Boiler or hydronic heating concern reported.')
  );
  nodes['sw.intake.other_system'].options.find(x => x.id === 'not_listed').label = 'None of these';
  assertGraph();

  function systemMenu() {
    const direct = id => [id];
    const other = id => ['other_heat_or_ductless', id];
    const choice = (id, label, hint, route) => ({ id, label, hint, route });
    return [
      { id: 'controls', title: 'Thermostat & controls', choices: [
        choice('thermostat_settings', 'Thermostat or settings problem', 'Blank screen, schedules, temperature settings, fan, Wi-Fi, or a message on the display.', other('thermostat_settings'))
      ] },
      { id: 'comfort', title: 'Heating & cooling', choices: [
        choice('cooling_only_ac', 'Central air conditioner', 'Cooling-only AC. Heat comes from a separate furnace, boiler, or other heater.', direct('cooling_only_ac')),
        choice('heat_pump', 'Ducted heat pump', 'An outdoor unit that heats and cools, with air coming through vents.', direct('heat_pump')),
        choice('furnace', 'Furnace or air handler', 'Gas, oil, electric, or hot-water coil. Includes manufactured homes and hydronic air handlers.', direct('furnace')),
        choice('ductless_mini_split', 'Ductless mini-split', 'Indoor units on a wall, floor, or ceiling, serving one room or several.', other('ductless_mini_split')),
        choice('boiler', 'Boiler & hydronic heat', 'Radiators, hot-water baseboard, radiant floors, steam, or the water side of an air-handler coil.', other('boiler')),
        choice('water_source_geo', 'Water-source / geothermal heat pump', 'An indoor heat pump connected to water or ground-loop pipes.', other('water_source_geo'))
      ] },
      { id: 'hot-water', title: 'Hot water', choices: [
        choice('water_heater', 'Water heater or no hot water', 'Tank, tankless, heat pump water heater, or a boiler that also heats tap water.', other('water_heater'))
      ] },
      { id: 'identify', title: 'Need help choosing?', choices: [
        choice('not_sure', 'Not sure what I have', 'A few questions about what you already know. No covers off or climbing.', direct('not_sure')),
        choice('not_listed', 'My equipment is not listed', 'Get the limits of this beta and a note for a professional.', other('not_listed'))
      ] }
    ];
  }
  function selectSystem(state, id, meta = {}) {
    if (!state || state.result || state.node !== 'sw.intake.system_type') throw new Error('Choose a system only from the system menu.');
    const selected = systemMenu().flatMap(group => group.choices).find(choice => choice.id === id);
    if (!selected) throw new Error('That system choice is not available.');
    const next = JSON.parse(JSON.stringify(state));
    selected.route.forEach(choice => answer(next, choice, meta));
    Object.assign(state, next);
    return state;
  }

  function create(seed = '', mode = 'real') {
    const state = {
      node: ENTRY, result: null, seed, mode, stopping: false, safetyCleared: false,
      consent: false, consentAt: null, termsVersion: null, telemetry: false,
      answers: [], startedAt: Date.now(), id: uuid(), landing: null,
      preselectChoice: null, treeVersion: '', audit: [],
      product: 'ask', hpLanding: null, hpAmbient: null, hpHandback: null,
      hpWeakAirflow: false, hpOutdoorNotRunning: false, hpConcludeFrom: null, defrostReturns: 0,
      idWinter: null, idEm: null, wshpLoop: null,
      fnFuel: null, fnLanding: null, fnReason: null, hpGasFurnace: null,
      msLanding: null, msSingleZone: false,
      tsModel: null, tsLanding: null, tsGeo: false, tsHpAir: false, tsRatedMin: null, tsWarrantyAck: false, tsLc18: false,
      reset_count: 0, priorResults: [], noDiyLock: false
    };
    pushAudit(state, 'node_entered:' + ENTRY);
    pushAudit(state, 'product_lane:ask');
    return state;
  }
  function enterLane(state, lane) {
    state.product = lane;
    state.treeVersion = lane === 'hp' ? TREE_HP : lane === 'wshp' ? TREE_WSHP : lane === 'fn' ? TREE_FN : lane === 'ms' ? TREE_MS : lane === 'ts' ? TREE_TS : TREE_VERSION;
    pushAudit(state, 'product_lane:' + lane);
  }
  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'sw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }
  function pushAudit(state, event) {
    state.audit.push({ event, at: new Date().toISOString(), tree: state.treeVersion });
  }
  function filterCheckedThisSession(state) {
    return state.answers.some(a => a.node === 'ac.cool.filter.check' ||
      (a.node === 'hp.handback.ac_filter_airflow' && a.choice === 'filter_already_done_this_session'));
  }
  function fnGateCleared(state) {
    return state.answers.some(a => a.node === FN_GATE && a.choice === 'none_of_these');
  }
  function fnOverlay(state, nodeId, choice, target) {
    const key = nodeId + '/' + choice;
    const mapped = FN_EDGE[key];
    if (mapped) target = typeof mapped === 'function' ? mapped(state) : mapped;
    if (FN_FORBIDDEN.indexOf(target) !== -1 || String(target).indexOf('ac.adv.cap.') === 0) {
      state.fnReason = 'fn_advanced_off';
      return FN_CONCLUDE;
    }
    if (target === FN_CONCLUDE) {
      const why = FN_REASON[key];
      state.fnReason = (typeof why === 'function' ? why(state) : why) || state.fnReason || 'no_heat_after_basics';
    }
    return target;
  }
  function resolveTarget(option, state) {
    const next = option.next;
    if (next && typeof next === 'object') {
      if (Object.prototype.hasOwnProperty.call(next, 'whenAdvanced')) {
        return advancedEnabled() ? next.whenAdvanced : next.default;
      }
      if (Object.prototype.hasOwnProperty.call(next, 'whenCoolingOnly')) {
        return (state.idWinter === 'never' && state.idEm === 'no') ? next.whenCoolingOnly : next.default;
      }
      if (Object.prototype.hasOwnProperty.call(next, 'hpDualFuel')) {
        return (state.product === 'hp' && state.hpGasFurnace) ? next.hpDualFuel : next.default;
      }
      if (Object.prototype.hasOwnProperty.call(next, 'fnGateDone')) {
        return fnGateCleared(state) ? next.fnGateDone : next.default;
      }
      if (state.product === 'hp' && state.hpHandback === 'filter_airflow' && (next.hpHandback || next.hpHandbackWeak)) {
        if (state.hpWeakAirflow && next.hpHandbackWeak) return next.hpHandbackWeak;
        if (next.hpHandback) return next.hpHandback;
      }
      if (state.product === 'hp' && next.hpClear) return next.hpClear;
      if (state.product === 'hp' && state.hpOutdoorNotRunning && next.hpOutdoor) return next.hpOutdoor;
      if (next.hpFilterDone && filterCheckedThisSession(state)) return next.hpFilterDone;
      if (next.hpDefrostAgain) {
        if ((state.defrostReturns || 0) >= 1) {
          state.hpConcludeFrom = state.hpConcludeFrom || 'defrost_failure_suspected';
          return next.hpDefrostAgain;
        }
        state.defrostReturns = 1;
        return next.default;
      }
      let picked = null;
      if (state.product === 'hp' && next.byHpLanding) {
        const key = state.hpLanding || '';
        if (next.byHpLanding[key]) picked = next.byHpLanding[key];
      }
      if (picked == null && state.product === 'hp' && next.byHpAmbient) {
        const key = state.hpAmbient || 'unknown';
        if (next.byHpAmbient[key]) picked = next.byHpAmbient[key];
      }
      if (picked == null) {
        const landing = state.landing || '';
        if (next.byLanding && next.byLanding[landing]) picked = next.byLanding[landing];
        else picked = next.default;
      }
      if (picked && typeof picked === 'object') return resolveTarget({ next: picked }, state);
      return picked;
    }
    return next;
  }
  function applySessionOverlay(state, nodeId, choice, target) {
    if (nodeId === CONSENT && choice === 'agree_18_terms') target = 'sw.intake.system_type';
    if (typeof target !== 'string') return target;
    if (state.product === 'fn') return fnOverlay(state, nodeId, choice, target);
    if (state.product !== 'ac' && (target === CONCLUDE || target.indexOf('ac.adv.cap.') === 0 || target === '@suspected_capacitor_contactor_advanced_off' || target === '@next_step_advanced')) {
      if (state.product === 'wshp') return '@wshp_advanced_off';
      if (state.product === 'ms') return '@ms_advanced_off';
      if (state.product === 'sd') return '@sd_panel_stop';
      if (state.product === 'ts') return '@ts_advanced_off';
      return '@hp_advanced_electrical_off';
    }
    if (state.product !== 'hp') return target;
    if(nodeId==='ac.cool.filter.restart_check'&&choice==='restart_ice_seen')return '@ice_keep_running';
    if (target === 'ac.noise.clarify_outdoor_hum') return '@unusual_noise_hp_wave1';
    if (target === 'ac.cool.outdoor.fan_spinning' || target === 'ac.cool.outdoor.debris_clearance' || target === 'ac.cool.indoor.ice_lines_coil') {
      return '@hp_basics_clear_after_filter';
    }
    return target;
  }
  function breakerVisualPassed(state) {
    return state.answers.some(a => a.node === 'ac.cool.power.breaker_visual' &&
      (a.choice === 'breaker_on_confirmed' || a.choice === 'breaker_reset_ok_still_silent'));
  }
  function concludeBody() {
    return nodes[CONCLUDE].body;
  }
  function viewNode(id, state) {
    const node = nodes[id];
    if (!node) return null;
    let view = node;
    if (id === CONCLUDE) {
      view = {
        section: node.section,
        title: node.title,
        body: concludeBody(),
        caution: node.caution,
        diyTier: node.diyTier,
        safetyGate: node.safetyGate,
        options: node.options
      };
    }
    if (id === 'ac.cool.filter.check') {
      const hpFilter = !!(state && state.product === 'hp' && state.hpHandback === 'filter_airflow');
      const options = view.options.filter(op => hpFilter || op.id !== 'filter_clean_weak_airflow').map(op => {
        if (!hpFilter || op.id !== 'filter_clean_ok') return op;
        return Object.assign({}, op, {
          hint: 'Clean filter on this heat-pump check. Next is a professional, unless airflow from the vents is weak.'
        });
      });
      view = Object.assign({}, view, { options: options });
    }
    if (state && state.product === 'fn' && id === 'ac.cool.filter.check') {
      view = Object.assign({}, view, {
        options: view.options.map(op => op.id !== 'filter_clean_ok' ? op : Object.assign({}, op, {
          hint: 'Not enough heat continues to returns and supplies. Other heat problems stop for a pro.'
        }))
      });
    }
    if (state && state.product === 'fn' && id === 'ac.tstat.blank.batteries') {
      view = Object.assign({}, view, {
        options: view.options.map(op => {
          if (op.id === 'batteries_replaced_display_back') return Object.assign({}, op, { hint: 'Basic success — retest the heat call.' });
          if (op.id === 'hardwired_or_no_batteries') return Object.assign({}, op, { hint: 'Pro path — a blank hardwired thermostat needs a pro. No wiring or panel work.' });
          return op;
        })
      });
    }
    if (state && state.product === 'fn' && id === 'ac.cool.airflow.returns_supplies') {
      view = Object.assign({}, view, { body: node.body.replace('rooms you want heated or cooled', 'rooms you want heated') });
    }
    if (state && state.product === 'fn' && FN_REUSED.indexOf(id) !== -1) {
      view = Object.assign({}, view, { options: view.options.concat([FN_HAZARD]) });
    }
    if (state && id === 'ms.head.airflow_result') {
      const heat = state.msMode === 'heat';
      const cool = state.msMode === 'cool';
      view = Object.assign({}, view, { options: view.options.filter(op => {
        if (op.id === 'air_ok_not_heating' && cool) return false;
        if (op.id === 'air_ok_not_cooling' && heat) return false;
        return true;
      }) });
    }
    if (state && id === 'ac.cool.power.breaker_reset_gate') {
      const hazardNext = state.product === 'wshp' ? '@wshp_hazard_now' : state.product === 'fn' ? '@fn_hazard_now' : '@hp_hazard_now';
      view = Object.assign({}, view, { options: view.options.map(op => op.id === 'hazard_now' ? Object.assign({}, op, { next: hazardNext }) : op) });
    }
    if (state && String(id).indexOf('ts.') === 0 && TS.optionVisible) {
      const options = view.options.filter(op => TS.optionVisible(op, state)).map(op =>
        TS.optionDisabled(op, state) ? Object.assign({}, op, { disabled: true, hint: 'Not on your model' }) : op);
      view = Object.assign({}, view, { options: options });
    }
    if (state && state.msLanding === 'weak_airflow' && id === 'ms.controls.mode_setpoint') {
      view = Object.assign({}, view, {
        options: view.options.map(op => {
          if (op.id === 'settings_fixed_now_cooling') return Object.assign({}, op, { label: 'I changed a setting, and airflow is back to normal', fact: 'User changed the remote or app settings, and airflow is back to normal.' });
          if (op.id === 'remote_batteries_fixed') return Object.assign({}, op, { label: 'The remote was dead. Fresh batteries fixed it, and airflow is back to normal', fact: 'User replaced the remote batteries, and airflow is back to normal.' });
          return op;
        })
      });
    }
    return state ? HEAT.view(id, state, view) : view;
  }
  function answer(state, choice, meta = {}) {
    if (!state || state.result || !nodes[state.node]) throw new Error('This check has ended or is invalid.');
    if (state.node === 'sw.intake.system_type') {
      const onNode = nodes[state.node].options.some(op => op.id === choice);
      const menuChoice = systemMenu().flatMap(group => group.choices).some(item => item.id === choice);
      if (menuChoice && !onNode) return selectSystem(state, choice, meta);
    }
    if (nodes[state.node].diyTier === 'advanced' && !advancedEnabled()) {
      throw new Error('Advanced DIY is not available in this beta.');
    }
    const nodeId = state.node;
    const node = nodes[nodeId];
    // Validate against the same options the homeowner can see, before recording
    // an answer or changing any flags. Hidden model/feature choices are not routes.
    const rendered = viewNode(nodeId, state);
    const option = rendered && rendered.options.find(x => x.id === choice);
    if (!option || option.disabled || (choice === 'filter_clean_weak_airflow' && state.product !== 'hp')) throw new Error('Choose an answer shown on the current screen.');
    if (nodeId !== ENTRY && nodeId !== CONSENT && !(state.stopping && nodeId === 'bl.gate.safety') && (!state.safetyCleared || !state.consent)) {
      throw new Error('Safety and consent are required before troubleshooting.');
    }
    if (HEAT.before(state, nodeId, option)) { HEAT.entered(state, state.node); return state; }
    if (nodeId === CONSENT && choice === 'agree_18_terms') {
      if (!state.safetyCleared || meta.agreed !== true || !meta.termsVersion) throw new Error('Please read and accept the beta terms to continue.');
      state.consent = true;
      state.consentAt = new Date().toISOString();
      state.termsVersion = String(meta.termsVersion);
      state.telemetry = false;
    }
    if (nodeId === ENTRY || (state.stopping && nodeId === 'bl.gate.safety')) state.safetyCleared = choice === 'none_of_these';
    if (nodeId === 'ac.cool.landing.picker' && LANDING[choice]) state.landing = LANDING[choice];
    if (nodeId === 'hp.landing.picker' && HP_LANDING[choice]) state.hpLanding = HP_LANDING[choice];
    if (nodeId === 'hp.ambient.outdoor_band' && HP_BAND[choice]) state.hpAmbient = HP_BAND[choice];
    if (nodeId === 'sw.intake.system_type' && choice === 'not_sure') {
      state.idWinter = null;
      state.idEm = null;
    }
    if (nodeId === 'sw.intake.system_type' && choice === 'cooling_only_ac') enterLane(state, 'ac');
    if (nodeId === 'sw.intake.system_type' && choice === 'heat_pump') enterLane(state, 'hp');
    if (nodeId === 'sw.intake.system_type' && choice === 'furnace') enterLane(state, 'fn');
    if (nodeId === 'sw.intake.other_system' && choice === 'ductless_mini_split') enterLane(state, 'ms');
    if (nodeId === 'sw.intake.other_system' && choice === 'thermostat_settings') enterLane(state, 'ts');
    if (nodeId === 'ac.cool.intake.system_confirm' && choice === 'ductless_mini_split') enterLane(state, 'ms');
    if (nodeId === 'hp.intake.system_confirm' && (choice === 'air_source_hp_gas_furnace' || choice === 'air_source_hp_gas_unsure')) {
      state.hpGasFurnace = choice === 'air_source_hp_gas_furnace' ? 'yes' : 'not_sure';
    }
    if (nodeId === 'fn.intake.system_confirm' && FN_FUEL[choice]) state.fnFuel = FN_FUEL[choice];
    if (nodeId === 'fn.intake.system_confirm' && choice === 'furnace_plus_heat_pump') {
      state.hpGasFurnace = 'yes';
      enterLane(state, 'hp');
    }
    if (nodeId === 'fn.landing.picker' && FN_LANDING[choice]) state.fnLanding = FN_LANDING[choice];
    if (nodeId === 'fn.landing.picker' && choice === 'landing_cooling_problem') enterLane(state, 'ac');
    if (nodeId === 'sw.identify.winter_outdoor') {
      if (choice === 'winter_outdoor_runs') enterLane(state, 'hp');
      else state.idWinter = choice === 'winter_outdoor_never' ? 'never' : 'unsure';
    }
    if (nodeId === 'sw.identify.em_aux') {
      if (choice === 'has_em_aux') enterLane(state, 'hp');
      else state.idEm = choice === 'no_em_aux' ? 'no' : 'unsure';
    }
    if (nodeId === 'sw.identify.heat_source') {
      const coolingOnly = choice === 'separate_furnace_boiler' && state.idWinter === 'never' && state.idEm === 'no';
      enterLane(state, coolingOnly ? 'ac' : 'hp');
    }
    if (nodeId === 'ac.cool.intake.system_confirm' && choice === 'heat_pump') {
      state.product = 'hp';
      state.treeVersion = TREE_HP;
    }
    if (nodeId === 'hp.handback.ac_filter_airflow' && choice === 'proceed_ac_filter') state.hpHandback = 'filter_airflow';
    if ((nodeId === 'hp.observe.leaving_air_vs_mode' && choice === 'outdoor_not_running_when_should') ||
        (nodeId === 'hp.rv.mode_asymmetric' && choice === 'pattern_outdoor_not_running')) {
      state.hpOutdoorNotRunning = true;
    }
    if (nodeId === 'ac.cool.filter.check' && choice === 'filter_clean_weak_airflow') {
      state.hpWeakAirflow = true;
      if (!state.hpHandback) state.hpHandback = 'filter_airflow';
    }
    if (nodeId === 'hp.defrost.sanity' && choice === 'iced_solid_no_recover') state.hpConcludeFrom = 'defrost_failure_suspected';
    if (nodeId === 'hp.rv.mode_asymmetric' && choice === 'asymmetric_pattern_confirmed') state.hpConcludeFrom = 'mode_asymmetric_rv_ob_control';
    if (nodeId === 'hp.rv.mode_asymmetric' && choice === 'recent_tstat_swap_ob_unsure') state.hpConcludeFrom = 'thermostat_ob_uncertain_after_swap';
    const shown = viewNode(nodeId, state);
    const shownOption = shown && shown.options.find(item => item.id === choice);
    state.answers.push({ node: nodeId, choice, label: shownOption ? shownOption.label : option.label, fact: shownOption && shownOption.fact != null ? shownOption.fact : option.fact, at: new Date().toISOString() });
    pushAudit(state, 'answer_selected:' + choice);
    if (TS.modelOf[choice]) {
      state.tsModel = TS.modelOf[choice];
      pushAudit(state, 'flag:ts_model=' + state.tsModel);
    }
    if (TS.landingOf[choice]) {
      state.tsLanding = TS.landingOf[choice];
      pushAudit(state, 'flag:ts_landing=' + state.tsLanding);
    }
    if (option.flag === 'ts_geo') {
      state.tsGeo = true;
      pushAudit(state, 'flag:ts_geo');
    }
    if (option.flag === 'ts_hp_air') {
      state.tsHpAir = true;
      pushAudit(state, 'flag:ts_hp_air');
    }
    if (option.flag && String(option.flag).indexOf('ts_rated_min=') === 0) {
      state.tsRatedMin = String(option.flag).split('=')[1];
      pushAudit(state, 'flag:ts_rated_min=' + state.tsRatedMin);
    }
    if (option.requiresFlag === 'stageLatchStepsEnabled' && !(typeof globalThis !== 'undefined' && globalThis.SW_CONFIG && globalThis.SW_CONFIG.stageLatchStepsEnabled === true)) {
      pushAudit(state, 'flag:stage_latch_hidden');
    }
    if (choice === 'screen_looks_different' && TS.fnOf[nodeId]) {
      pushAudit(state, 'flag:ts_mirror_mismatch=' + TS.fnOf[nodeId] + ':' + (state.tsModel || ''));
    }
    if (nodeId === 'hp.landing.picker' && state.hpLanding) pushAudit(state, 'flag:hp_landing=' + state.hpLanding);
    if (nodeId === 'hp.ambient.outdoor_band' && state.hpAmbient) pushAudit(state, 'flag:hp_ambient_band=' + state.hpAmbient);
    if (nodeId === 'hp.intake.system_confirm' && choice === 'air_source_ducted_hp') pushAudit(state, 'flag:hp_equipment=air_source_ducted');
    if (nodeId === 'hp.handback.ac_filter_airflow' && choice === 'proceed_ac_filter') {
      pushAudit(state, 'handback:ac.cool.filter.check');
      pushAudit(state, 'flag:hp_handback=filter_airflow');
    }
    if (nodeId === 'hp.landing.picker' && choice === 'landing_unusual_noise') pushAudit(state, 'handback:ac.noise.hazard_screen');
    if (nodeId === 'ac.cool.intake.system_confirm' && choice === 'heat_pump') pushAudit(state, 'product_lane:hp');
    if (nodeId === 'fn.intake.system_confirm' && state.fnFuel && FN_FUEL[choice]) pushAudit(state, 'flag:fn_fuel=' + state.fnFuel);
    if (nodeId === 'fn.intake.system_confirm' && choice === 'furnace_plus_heat_pump') pushAudit(state, 'handoff:fn_to_hp_dual_fuel');
    if (nodeId === 'fn.landing.picker' && FN_LANDING[choice]) pushAudit(state, 'flag:fn_landing=' + state.fnLanding);
    if (nodeId === 'fn.landing.picker' && choice === 'landing_cooling_problem') pushAudit(state, 'handoff:fn_to_ac_cooling');
    if (nodeId === 'hp.intake.system_confirm' && state.hpGasFurnace && (choice === 'air_source_hp_gas_furnace' || choice === 'air_source_hp_gas_unsure')) {
      pushAudit(state, 'flag:hp_equipment=air_source_ducted');
      pushAudit(state, 'flag:hp_gas_furnace=' + state.hpGasFurnace);
    }
    if (nodeId === FN_GATE && choice === 'none_of_these') {
      pushAudit(state, 'notes.fn_gate:cleared');
      if (state.product === 'hp') pushAudit(state, 'notes.fn_gate:return_to_hp');
    }
    if (nodeId === 'ms.intake.system_confirm' && choice === 'ductless_single_zone') {
      state.msSingleZone = true;
      pushAudit(state, 'flag:ms_equipment=ductless_single_zone');
    }
    if (nodeId === 'ms.landing.picker' && MS_LANDING[choice]) {
      state.msLanding = MS_LANDING[choice];
      pushAudit(state, 'flag:ms_landing=' + state.msLanding);
    }
    if (nodeId === 'sw.intake.other_system' && choice === 'water_source_geo') {
      enterLane(state, 'wshp');
      state.wshpLoop = null;
    }
    if (nodeId === 'wshp.entry.equipment_gate') {
      if (choice === 'wshp_closed_loop') state.wshpLoop = 'closed';
      else if (choice === 'wshp_open_loop') state.wshpLoop = 'open';
      else if (choice === 'wshp_loop_unsure') state.wshpLoop = 'unsure';
      if (choice === 'wshp_closed_loop' || choice === 'wshp_open_loop' || choice === 'wshp_loop_unsure') {
        pushAudit(state, 'flag:wshp_loop=' + state.wshpLoop);
      }
      if (choice === 'wshp_air_source') enterLane(state, 'hp');
    }
    if (nodeId === 'wshp.openloop.chemistry_gate' && choice === 'openloop_want_diy_treatment') {
      pushAudit(state, 'notes.wshp_openloop_diy:refused');
    }
    if (nodeId === 'wshp.handback.call_pro' && choice === 'want_diy_pro_only') {
      pushAudit(state, 'notes.advanced_diy:off');
    }
    HEAT.record(state, nodeId, option);
    let target = resolveTarget(option, state);
    target = applySessionOverlay(state, nodeId, choice, target);
    target = HEAT.target(state, nodeId, option, target);
    if (state.product === 'fn' && (FN_FORBIDDEN.indexOf(target) !== -1 || String(target).indexOf('ac.adv.cap.') === 0)) {
      throw new Error('That step is not part of this check.');
    }
    if (nodeId === ENTRY && state.stopping && state.noDiyLock && (choice === 'none_of_these' || choice === 'hazard_unsure')) target = '@professional';
    if (state.product === 'sd' && ['@breaker_reset_basic', 'ac.cool.power.breaker_reset_gate', 'ac.cool.power.seasonal_restore_step', '@breaker_seasonal_restore_basic'].indexOf(target) !== -1) {
      target = '@sd_breaker_not_guided';
    }
    if (choice === 'breaker_reset_ok_still_silent') state.reset_count = 1;
    if (target === '@breaker_reset_basic' && (state.reset_count || 0) >= 1) target = '@breaker_retrip_pro';
    if (target === '@breaker_reset_basic') state.reset_count = 1;
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
        if (id === 'suspected_capacitor_contactor_advanced_off' || id === 'hp_advanced_electrical_off' || id === 'hp_defrost_valve_ob_control') {
          pushAudit(state, 'notes.hp_advanced_electrical:off');
        }
        if (id === 'hp_defrost_valve_ob_control' || id === 'hp_refrigerant_intent') pushAudit(state, 'notes.rv_force_out:forbidden');
        if (id === 'suspected_capacitor_contactor_advanced_off') pushAudit(state, 'advanced_diy:off');
        if (id === 'fn_call_pro') {
          pushAudit(state, 'notes.fn_reason:' + (state.fnReason || ''));
          pushAudit(state, 'notes.fn_advanced_diy:off');
          if (choice === 'want_diy_anyway') pushAudit(state, 'diy_request_declined');
        }
      } else if (res.outcome === 'insufficient_info') {
        pushAudit(state, 'conclusion_reached:insufficient_info');
      } else {
        pushAudit(state, 'conclusion_reached:emergency_exit');
      }
    } else {
      if (!nodes[target]) throw new Error('Unknown step.');
      state.node = target;
      HEAT.entered(state, target);
      if (target === CONSENT) pushAudit(state, 'session_started');
      if (target === 'hp.conclude.call_pro_defrost_valve_control') {
        pushAudit(state, 'notes.hp_advanced_electrical:off');
        pushAudit(state, 'notes.rv_force_out:forbidden');
      }
      if (target === FN_CONCLUDE) pushAudit(state, 'notes.fn_reason:' + (state.fnReason || ''));
      if (target === CONCLUDE) {
        const on = advancedEnabled();
        pushAudit(state, 'advanced_flag_checked:' + (on ? 'true' : 'false'));
        pushAudit(state, on ? 'advanced_path_offered' : 'advanced_path_suppressed');
        pushAudit(state, 'notes.advanced_diy:' + (on ? 'on' : 'off'));
      }
      if (nodes[target].diyTier === 'advanced') {
        pushAudit(state, 'diy_tier_shown:advanced');
      }
      pushAudit(state, 'node_entered:' + target);
      if (state.product === 'ts' && TS.fnOf[target] && state.tsModel) {
        TS.renderTsPanel(state.tsModel, target).served.forEach(block => pushAudit(state, 'flag:ts_mirror=' + block.id));
      }
      if (target === 'wshp.handback.call_pro') pushAudit(state, 'handback:wshp.handback.call_pro');
    }
    return state;
  }
  function resume(state) {
    if (!state || !state.result) throw new Error('This check has ended or is invalid.');
    const res = results[state.result];
    const target = res && res.continueTo;
    if (!target || !nodes[target]) throw new Error('This result does not continue.');
    if (state.product === 'sd') throw new Error('This outdoor-unit check does not continue from a result.');
    if (target.indexOf('ac.adv.cap.') === 0 && !advancedEnabled()) throw new Error('Advanced DIY is not available in this beta.');
    if (state.product === 'fn' && FN_FORBIDDEN.indexOf(target) !== -1) throw new Error('That step is not part of this check.');
    if (state.product !== 'ac' && (target.indexOf('ac.adv.cap.') === 0 || target === CONCLUDE || (state.product === 'hp' && (target === 'ac.cool.outdoor.fan_spinning' || target === 'ac.cool.outdoor.debris_clearance' || target === 'ac.cool.indoor.ice_lines_coil' || target === 'ac.noise.clarify_outdoor_hum')))) {
      throw new Error('That step is not part of this check.');
    }
    state.result = null;
    state.node = target;
    pushAudit(state, 'session_resumed:' + target);
    pushAudit(state, 'node_entered:' + target);
    return state;
  }
  function stop(state) {
    if (!state) return state;
    const res = state.result && results[state.result];
    const lock = !!(res && (['Emergency', 'Stop / professional'].indexOf(res.tier) !== -1 || ['ts_eheat_keep_pro', 'ts_refrigerant_alarm', 'ts_cold_home_urgent'].indexOf(state.result) !== -1));
    const prior = state.result ? [state.result] : [];
    const keep = {
      seed: state.seed, mode: state.mode, product: state.product,
      priorResults: (state.priorResults || []).concat(prior),
      noDiyLock: !!state.noDiyLock || lock,
      reset_count: state.reset_count || 0,
      hpLanding: state.hpLanding, hpAmbient: state.hpAmbient, msLanding: state.msLanding, msMode:state.msMode,msMultiZone:state.msMultiZone,msSingleZone:state.msSingleZone,msZone:state.msZone,sdFrom:state.sdFrom,sdMode:state.sdMode,sdSideConfirmed:state.sdSideConfirmed,remoteCodeStepDone:state.remoteCodeStepDone,
      fnFuel: state.fnFuel, wshpLoop: state.wshpLoop, tsModel: state.tsModel,
      treeVersion: state.treeVersion, id: state.id, startedAt: state.startedAt,
      hpGasFurnace: state.hpGasFurnace, fnLanding: state.fnLanding, answers: state.answers, audit: state.audit
    };
    const fresh = create(keep.seed, keep.mode);
    const boilerStop = keep.product === 'bl';
    const reopen = boilerStop ? 'bl.gate.safety' : ENTRY;
    const hadConsent = !!state.consent;
    const consentAt = state.consentAt;
    const termsVersion = state.termsVersion;
    Object.assign(state, fresh, keep, {
      stopping: true, node: reopen, result: null, safetyCleared: false,
      consent: boilerStop ? hadConsent : false,
      consentAt: boilerStop ? consentAt : null,
      termsVersion: boilerStop ? termsVersion : null,
      telemetry: false, preselectChoice: null, heatingHazardReported: false
    });
    pushAudit(state, 'exit_ramp:stop_get_help');
    pushAudit(state, 'node_entered:' + reopen);
    return state;
  }
  function summary(state, extra = {}) {
    if (state && state.product === 'ts') {
      const version = (typeof globalThis !== 'undefined' && globalThis.SW_CONFIG && globalThis.SW_CONFIG.contentVersion) || '';
      return TS.summary(state, extra, version, { nodes, results });
    }
    const clean = x => String(x || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 140);
    const facts = state.answers.map(x => x.fact).filter(Boolean);
    const complaint = clean(extra.complaint) || clean(state.seed) || facts.find(x => x.startsWith('Complaint:')) || (state.result === 'sw_other_not_listed' ? 'Equipment this beta does not check yet; see reported observations.' : state.product === 'wshp' ? 'Water-source / geothermal heat pump concern; see reported observations.' : state.product === 'hp' ? 'Heat pump concern; see reported observations.' : state.product === 'fn' ? 'Furnace or air-handler concern; see reported observations.' : state.product === 'ms' ? (state.msLanding === 'no_heat' ? 'Mini-split heating concern; see reported observations.' : 'Mini-split concern; see reported observations.') : state.product === 'bl' ? 'Boiler or hydronic heating concern; see reported observations.' : state.product === 'sd' ? 'Side-discharge outdoor-unit concern; see reported observations.' : state.product === 'wh' ? 'Water-heater concern; see reported observations.' : 'AC concern; see reported observations.');
    const somethingElse = 'Something else reported at system type.';
    let observations = [...new Set(facts.filter(x => !x.startsWith('Complaint:') && !x.startsWith('User ') && !x.startsWith('Residential ') && !(state.product === 'wshp' && x.startsWith('Loop type:'))))];
    if (facts.indexOf(somethingElse) !== -1 && observations.indexOf(somethingElse) === -1) observations = [somethingElse].concat(observations);
    const actions = [...new Set(facts.filter(x => x.startsWith('User ')))];
    const loopLine = state.product !== 'wshp' || !state.wshpLoop ? ''
      : state.wshpLoop === 'closed' ? 'Loop type: closed loop.'
      : state.wshpLoop === 'open' ? 'Loop type: open loop (well, lake, or pond water).'
      : state.wshpLoop === 'unsure' ? 'Loop type: not sure.'
      : '';
    const codes = clean(extra.codes);
    const checked = state.product === 'wshp'
      && state.answers.some(a => a.node === 'wshp.hazard.flood_electrical' && a.choice === 'wshp_hz_none')
      && (state.result === 'wshp_handback_call_pro' || state.result === 'wshp_openloop_water_quality_pro')
      ? 'Safety screen: none of the listed hazards reported. This guide asked for no covers off and no loop, well, refrigerant, or electrical work.'
      : '';
    const shown = state.result && results[state.result];
    const header = state.product === 'wshp'
      ? 'HOMEOWNER SERVICE NOTE — water-source / geothermal heat pump observations, not a diagnosis'
      : state.product === 'hp'
        ? 'HOMEOWNER SERVICE NOTE — heat pump observations, not a diagnosis'
        : state.product === 'fn'
          ? 'HOMEOWNER SERVICE NOTE — furnace observations, not a diagnosis'
          : state.product === 'ms'
            ? 'HOMEOWNER SERVICE NOTE — mini-split observations, not a diagnosis'
            : 'HOMEOWNER SERVICE NOTE — observations, not a diagnosis';
    const inScopeWshpNote = state.product === 'wshp'
      && state.result !== 'wshp_out_of_scope_call_pro'
      && state.result !== 'wshp_divert_mini_split'
      && state.result !== 'wshp_divert_furnace'
      && state.result !== 'wshp_system_unconfirmed';
    const hpConfirmed = state.answers.some(a => ['air_source_ducted_hp','air_source_hp_gas_furnace','air_source_hp_gas_unsure'].includes(a.choice));
    const equipment = inScopeWshpNote
      ? (state.wshpLoop ? 'Equipment: water-source / geothermal heat pump, home water-to-air type (homeowner reported). Size: not stated.' : 'Equipment: not confirmed (homeowner started the water-source / geothermal check). Size: not stated.')
      : state.product === 'wshp' ? 'Equipment: not confirmed (homeowner started the water-source / geothermal check). Size: not stated.'
      : state.product === 'hp' ? (hpConfirmed ? 'Equipment: air-source ducted heat pump.' + (state.hpGasFurnace === 'yes' ? ' Gas furnace backup.' : state.hpGasFurnace === 'not_sure' ? ' Gas furnace backup not confirmed.' : '') : 'Equipment: homeowner wasn\u2019t sure of the system type.')
      : state.product === 'fn' && state.fnFuel ? 'Equipment: ' + state.fnFuel + (state.fnFuel === 'hydronic' ? ' air handler (homeowner reported).' : ' furnace / air handler (homeowner reported).')
      : state.product === 'ms' && state.msSingleZone ? 'Equipment: ductless mini-split, one indoor unit (homeowner reported).'
      : state.product === 'ms' ? (state.msMultiZone?'Equipment: ductless mini-split, multiple indoor units (homeowner reported).':'Equipment: ductless mini-split not confirmed.')
      : '';
    return [header,
      equipment,
      state.product==='sd' ? 'Outdoor fan position (reported): '+(state.sdSideConfirmed?'side-discharge':'not confirmed')+'. Mode: '+(state.sdMode||'not confirmed')+'. Incoming check: '+(state.sdFrom||'not stated')+'.' : '',
      state.fnHome ? 'Home type (reported): ' + state.fnHome.replace(/_/g,' ') : '',
      state.bl && state.bl.type ? 'Boiler type (reported): ' + state.bl.type + '; fuel: ' + (state.bl.fuel || 'unknown') : '',
      state.whType ? 'Water-heater type (reported): ' + state.whType + '; fuel: ' + (state.whFuel || 'unknown') : '',
      (state.fnFuel === 'hydronic' || state.bl && state.bl.coil) ? 'Water circulation and coil temperature have not been confirmed by this guide.' : '',
      state.product==='ms'?'Mode (reported): '+(state.msMode||'unknown')+'. Units affected (reported): '+(state.msZone||'not stated')+'.':'',
      loopLine,
      'Complaint: ' + clean(complaint).replace(/^Complaint:\s*/i, ''),
      extra.began ? 'Began: ' + clean(extra.began) : '',
      extra.model ? 'Model (homeowner supplied): ' + clean(extra.model) : '',
      codes ? 'Codes / lights / water temps already showing (homeowner supplied): ' + codes : '',
      observations.length ? 'Observed: ' + observations.join(' ') : '',
      actions.length ? 'Tried: ' + actions.join(' ') : '',
      checked,
      state.mode === 'test' ? 'TEST SCENARIO — not an actual equipment report.' : '',
      (state.priorResults || []).map(id => results[id] ? 'Earlier result: ' + results[id].title + ' (' + results[id].tier + ')' : '').filter(Boolean).join('\n'),
      shown ? 'Result: ' + shown.title + ' (' + shown.tier + ')' : '',
      shown && (shown.outcome === 'call_pro' || shown.tier === 'Emergency' || shown.tier === 'Stop / professional') ? 'Stop reason: ' + (shown.reason || '') : '',
      'Version: ' + ((typeof globalThis !== 'undefined' && globalThis.SW_CONFIG && globalThis.SW_CONFIG.contentVersion) || '')
    ].filter(Boolean).join('\n');
  }
  function activity(state) {
    return { session_id: state.id, mode: state.mode, last_step: state.node || 'result',
      result: state.result || '', path: state.answers.map(a => a.node + ':' + a.choice).join('|'),
      elapsed_seconds: Math.max(0, Math.round((Date.now() - state.startedAt) / 1000)),
      terms_version: state.termsVersion || '', consent_at: state.consentAt || '',
      tree_version: state.treeVersion || '' };
  }
  function presentResult(state) {
    const res = state && results[state.result];
    if (!res) return null;
    if (state && state.product === 'ts') return TS.presentResult(state, results);
    if (state && (state.product === 'bl' || state.product === 'wh' || state.product === 'ms')) return HEAT.present(state, res);
    if (state && state.product === 'wshp' && state.result === 'gas') {
      return Object.assign({}, res, {
        avoid: String(res.avoid).replace('switch the AC off', 'switch the system off')
      });
    }
    if (state && state.product === 'fn') {
      const fnCopy = Object.assign({}, res, { actions: (res.actions || []).slice() });
      if (state.result === 'fn_call_pro') fnCopy.explanation = 'The cause has not been confirmed. Share the observations you actually made, and any checks you could not complete, with a licensed HVAC professional.';
      if (fnCopy.actions.indexOf(FN_CO_LINE) === -1) fnCopy.actions.push(FN_CO_LINE);
      return fnCopy;
    }
    if (state && state.product === 'ms' && state.msLanding === 'weak_airflow' && state.result === 'ms_settings_fixed_basic') {
      return Object.assign({}, res, {
        explanation: 'Cool mode, a setting below the room, and a normal fan speed let the indoor unit move air the way it should. Airflow is back to normal.',
        actions: ['Leave it in Cool, not Auto, while you need cooling.', 'If you use Quiet, Sleep, or a schedule, check that it isn’t turning the fan down when you need air.', 'If the air gets weak again with the right settings, start a new check and choose Weak air from the indoor unit while cooling.']
      });
    }
    if (state && state.product === 'ms' && state.result === 'ms_airflow_unsure') {
      const heat = state.msMode === 'heat';
      const cool = state.msMode === 'cool';
      const line = heat
        ? 'Leave it in Heat with the fan on High for 15 minutes, then compare the air to how it felt before.'
        : cool
          ? 'Leave it in Cool with the fan on High for 15 minutes, then compare the air to how it felt before.'
          : 'Leave it in the mode you were using, with the fan on High, for 15 minutes, then compare the air to how it felt before.';
      const actions = (res.actions || []).slice();
      actions[0] = line;
      return Object.assign({}, res, { actions: actions });
    }
    if (state && state.product === 'ms' && state.result === 'ms_outdoor_running_call_pro') {
      const heat = state.msLanding === 'no_heat';
      const line = heat
        ? 'You can leave it in Heat if some heat is coming. If no useful heat is coming, turn it Off with the remote. If it\u2019s dangerously cold and anyone is at risk, get them somewhere warm first.'
        : 'You can leave it in Cool if some cooling is coming. If not, turn it Off with the remote.';
      const actions = (res.actions || []).slice();
      actions[0] = line;
      return Object.assign({}, res, { actions: actions });
    }
    if (!state || state.product !== 'hp') return res;
    const swap = s => String(s)
      .replace('Set the system to Cool and retest after 15–30 minutes.', 'Set Heat or Cool to match the complaint and retest after 15–30 minutes.')
      .replace('Retest cooling and airflow after the filter is in place.', 'Retest heating or cooling, and airflow, after the filter is in place.')
      .replace('Confirm mode is Cool and the setpoint is below the room temperature.', 'Confirm Heat or Cool matches the complaint, with the setpoint calling, then retest.')
      .replace('If the system still will not cool or start, start a new check and choose Not cooling or Will not start.', 'If the system still will not heat or cool, start a new heat pump check.')
      .replace('Set Cool with the setpoint below the room temperature and see whether the outdoor unit starts.', 'Set Heat or Cool so the thermostat is calling, and see whether the outdoor unit starts.');
    const copy = Object.assign({}, res, { actions: (res.actions || []).map(swap) });
    if (state.result === 'ice_keep_running') {
      const lead = [
        'If your thermostat has an Emergency Heat setting, switch to it to keep heat on without the outdoor unit while you wait for a pro. It usually costs more to run.',
        'Otherwise, or if there is no warm air in 15 minutes, set the thermostat Off.',
        'If the house is getting cold, call a licensed HVAC professional. If it’s dangerously cold and anyone is at risk, get them somewhere warm first.',
        FN_CO_LINE
      ];
      const rest = copy.actions.filter(a => !/^Heat pump only:/.test(a) && a !== 'Set the system to Off at the thermostat.' && lead.indexOf(a) === -1);
      copy.actions = lead.concat(rest);
    }
    if (state.result === 'hp_defrost_valve_ob_control' && state.hpConcludeFrom) {
      const note = {
        defrost_failure_suspected: 'Outdoor coil stayed iced and did not recover.',
        mode_asymmetric_rv_ob_control: 'One mode felt wrong while the outdoor unit ran.',
        thermostat_ob_uncertain_after_swap: 'The thermostat was replaced and O/B is uncertain.'
      }[state.hpConcludeFrom];
      if (note) copy.explanation = res.explanation + ' ' + note;
    }
    return copy;
  }
  return {
    acknowledgeStep: state => { HEAT.acknowledge(state); HEAT.entered(state, state.node); return state; },
    nodes, results, create, answer, selectSystem, systemMenu, stop, resume, summary, activity, viewNode, presentResult, advancedEnabled,
    treeVersion: TREE_VERSION, treeVersionHp: TREE_HP, treeVersionWshp: TREE_WSHP, treeVersionMs: TREE_MS, treeVersionTs: TREE_TS, tsV0: TS_V0, tsV1: TS_V1, msPr1: MS_PR1, msV1: MS_V1, wave1: WAVE1, wave2: WAVE2, advanced: ADVANCED,
    tsSteps: TS.steps, tsModels: TS.models, tsLc: TS.lc, tsFallbacks: TS.fallbacks, tsMirrors: { records: TS.records, byId: TS.byId, serve: TS.serve, hold: TS.hold },
    tsMirrorRenderable: TS.tsMirrorRenderable, renderTsPanel: TS.renderTsPanel, assertTs: TS.assertTs, assertGraph: assertGraph,
    tsFnOf: TS.fnOf, tsModelOf: TS.modelOf, tsLandingOf: TS.landingOf, tsU1: TS.u1, tsU2: TS.u2, tsTellPro: TS.tellPro, tsForbiddenScan: TS.forbiddenScan,
    tsWave2: TS.wave2ui, tsLatchBlocks: TS.latchBlocks, tsOptionVisible: TS.optionVisible, tsCards: TS.cards,
    hpWave1: HP_WAVE1, wshpWave1: WSHP_WAVE1, treeVersionFn: TREE_FN, fnWave1: FN_WAVE1, fnReused: FN_REUSED, fnForbidden: FN_FORBIDDEN,
    fnCoLine: FN_CO_LINE, fnReasonCopy: FN_REASON_COPY, fnEdge: FN_EDGE
  };
});
