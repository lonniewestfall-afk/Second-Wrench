/* Deterministic decision engine. No model calls and no free-text diagnosis routing.
 * Browser or Node. Every action comes from the current node's choices.
 *
 * Trees:
 * - ac.cool.v0 for cooling-only central AC sessions.
 * - hp.air_source.v0 for air-source ducted heat-pump sessions (Wave-1 Basic).
 * Session entry: ac.gate.cluster_entry → ac.session.consent →
 *   sw.intake.system_type. Consent text is shared and its stored agree
 *   edge stays ac.cool.intake.system_confirm (not a second consent node).
 *   The session overlay sends every agree to system type first:
 *   Cooling-only AC → ac.cool.intake.system_confirm → ac.cool.landing.picker.
 *   Heat pump → hp.intake.system_confirm → hp.landing.picker.
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
  const TREE_HP = 'hp.air_source.v0';
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
    'hp.conclude.call_pro_defrost_valve_control'
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

    'sw.intake.system_type': n('Your system', 'Cooling-only AC, or a heat pump?',
      'Answer from what you already know. Do not remove a cover or climb to identify the equipment.\n\nA cooling-only air conditioner cools the house. Heat usually comes from a separate furnace or boiler, and the outdoor unit stays off in winter.\n\nA heat pump heats and cools with the outdoor unit.', [
        o('cooling_only_ac', 'Cooling-only AC', 'ac.cool.intake.system_confirm', 'The outdoor unit is for cooling. A furnace, boiler, or other heater provides heat.', 'Cooling-only central AC reported.'),
        o('heat_pump', 'Heat pump (heats and cools with the outdoor unit)', 'hp.intake.system_confirm', 'The outdoor unit runs for heat and for cooling.', 'Heat pump reported at system type.'),
        o('not_sure', 'Not sure', 'sw.identify.winter_outdoor', 'Up to three plain questions. If it is still unclear, the check uses the heat-pump path.')
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
        o('no_em_aux', 'No', 'sw.identify.heat_source', 'No Emergency or Aux heat on the thermostat.', 'No Emergency Heat, Aux Heat, or EM HT on the thermostat.'),
        o('em_aux_unsure', 'Not sure', 'sw.identify.heat_source', 'If the rest is also unclear, this check uses the heat-pump path.')
      ]),

    'sw.identify.heat_source': n('Your system', 'What heats the house?',
      'Use what you already know. A label you can already read from the ground counts. Do not open a cover to find one.\n\nCooling-only is only when the outdoor unit stays off in winter, a separate furnace or boiler provides the heat, and there is no Emergency or Aux heat. Anything still unclear uses the heat-pump check.', [
        o('separate_furnace_boiler', 'A separate furnace or boiler', {
          whenCoolingOnly: 'ac.cool.intake.system_confirm',
          default: 'hp.intake.system_confirm'
        }, 'Cooling-only when the outdoor unit stays off in winter and there is no Emergency or Aux heat. Otherwise the heat-pump check.', 'Separate furnace or boiler reported as the heat source.'),
        o('label_says_heat_pump', 'The outdoor unit label says heat pump', 'hp.intake.system_confirm', 'Continue on the heat-pump check. Do not open a cover to re-read it.', 'Outdoor unit label says heat pump.'),
        o('heat_source_unsure', 'Not sure', 'hp.intake.system_confirm', 'Still unclear, so this check uses the heat-pump path. No capacitor steps on that path.', 'Heat source still unclear. Using the heat-pump check.')
      ]),

    'ac.cool.intake.system_confirm': n('Your system', 'What kind of cooling system is this?',
      'Use an existing manual or what you already know. Do not remove a cover or climb to identify equipment.\n\nThis beta covers confirmed conventional, cooling-only split-system central AC (outdoor cooling-only condenser + indoor furnace or air handler).', [
        o('split_central_cool_only', 'Central AC with separate indoor and outdoor units', 'ac.cool.landing.picker', 'A cooling-only outdoor AC connected to an indoor furnace or air handler.', 'Residential split-system central AC reported.'),
        o('heat_pump', 'A heat pump', 'hp.intake.system_confirm', 'Continue on the air-source heat pump check. Cooling-only steps stay on this AC path.', 'Heat pump reported. Switching to the heat pump tree.'),
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
          hpHandback: '@hp_basics_clear_after_filter',
          hpHandbackWeak: 'ac.cool.airflow.returns_supplies',
          default: 'ac.cool.outdoor.fan_spinning'
        }, 'Weak airflow continues to returns and supplies. Not cooling continues to the outdoor fan.', 'Filter looks clean or was recently replaced.'),
        o('filter_clean_weak_airflow', 'Filter looks clean, but airflow from the vents is weak', 'ac.cool.airflow.returns_supplies', 'Heat-pump handback only. Check returns and supplies, then stop for a professional.', 'Filter looks clean and supply airflow is weak.'),
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
        o('noise_no_hazard_symptoms', 'None of those hazard signs — noise only', {
          hpClear: '@unusual_noise_hp_wave1',
          default: 'ac.noise.clarify_outdoor_hum'
        }, 'Cooling-only AC continues to the outdoor hum check. A heat pump noise with no hazard stops for a professional.'),
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
        o('disconnect_appears_on', 'From safe ground, the disconnect appears On', {
          hpOutdoor: '@hp_outdoor_not_running_wave1',
          default: '@outdoor_silent_will_not_start'
        }, 'Visual only. Basic power visuals are exhausted. A heat pump does not continue into capacitor or contactor work.', 'Outdoor disconnect appears On from safe ground; outdoor unit still silent.'),
        o('disconnect_appears_off', 'From safe ground, the disconnect appears Off', {
          hpOutdoor: '@hp_outdoor_not_running_wave1',
          default: '@outdoor_disconnect_appears_off'
        }, 'Visual only. This may explain a silent outdoor unit. Do not operate the lever.', 'Outdoor disconnect appears Off from safe ground.'),
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
      ], { diyTier: 'advanced', safetyGate: true, caution: 'Covers must be on before power is restored. Never restore power with covers off.' }),

    'hp.intake.system_confirm': n('Your system', 'Is this an air-source ducted heat pump?',
      'Use what you already know or the equipment manual. Do not remove covers, climb on the outdoor unit, or open the air-handler cabinet to identify it.\n\nThis path covers an air-source heat pump with a separate outdoor unit that can heat and cool, and ducted indoor air through a furnace or air handler.\n\nIt does not cover cooling-only central AC (use the central AC check), ductless mini-splits, water-source or geothermal heat pumps, or packaged rooftop units you cannot confirm as an air-source ducted heat pump.\n\nIf the home has a heat pump plus a gas furnace, you may continue here for heat-pump mode checks. Gas smell, a carbon monoxide alarm, or furnace combustion work is not DIY. Use Stop / get help.', [
        o('air_source_ducted_hp', 'Air-source ducted heat pump', 'hp.landing.picker', 'Outdoor unit heats and cools. Air moves through ducts. A gas furnace alongside it is OK for this confirm only.', 'Air-source ducted heat pump reported.'),
        o('cool_only_split_ac', 'Cooling-only central AC', '@hp_cool_only_use_ac', 'Use the central AC check, not this path.', 'Cooling-only central AC reported on the heat pump check.'),
        o('mini_split_ductless', 'Ductless mini-split', '@hp_mini_split_oos', 'Not this path.', 'Ductless mini-split reported.'),
        o('water_source_geo', 'Water-source or geothermal', '@hp_water_source_oos', 'Not this path.', 'Water-source or geothermal equipment reported.'),
        o('packaged_or_other', 'Packaged, rooftop, or another system I cannot confirm', '@hp_packaged_oos', 'Out of scope for this wave.', 'Packaged or unconfirmed equipment reported.'),
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
      'Without opening equipment or pulling the thermostat off the wall, look at the thermostat you already use.\n\n1. What mode is it in right now? (Heat, Cool, Auto, Emergency / Aux / Em Heat — wording varies by brand.)\n2. Is the setpoint in a direction that should actually call?\n   No heat: Heat, with the setpoint a few degrees above the room.\n   No cool: Cool, with the setpoint a few degrees below the room.\n3. Fan Auto or On is fine for this check.\n\nDo not open the furnace or air-handler cabinet. Do not change O/B jumper settings here.\n\nIf the display is blank or unreadable, say so. Do not pry the thermostat apart beyond normal battery access you already know from the manual.', [
        o('mode_auto', 'Mode is Auto', 'hp.mode.force_match_complaint', 'Auto can hide the real complaint. Force Heat or Cool first.'),
        o('mode_emergency_or_aux', 'Mode is Emergency / Aux / Em Heat', 'hp.mode.emergency_aux_off', 'The outdoor compressor is often commanded off on purpose.'),
        o('mode_matches_complaint', 'Mode is Heat or Cool and matches my complaint; setpoint should be calling', 'hp.mode.emergency_aux_off', 'Still confirm Emergency / Aux is not also on.', 'Thermostat mode matches the complaint and the setpoint should be calling.'),
        o('mode_wrong_for_complaint', 'Mode is wrong for my complaint (for example Cool when I need heat)', '@hp_mode_wrong_basic', 'Easy setting fix first.', 'Thermostat mode did not match the complaint.'),
        o('tstat_blank_or_unreadable', 'Thermostat is blank or I cannot read the mode', 'ac.tstat.blank.batteries', 'Battery check only. Do not open equipment to find the mode.', 'Thermostat display is blank or unreadable.'),
        o('not_sure', 'I am not sure', '@hp_mode_not_sure', 'Do not guess. Do not pull the thermostat off the wall.')
      ]),

    'hp.mode.force_match_complaint': n('Thermostat', 'Force Heat or Cool',
      'Auto mode can call the wrong thing, which makes a heat pump look like a failed outdoor unit.\n\nWithout opening equipment:\n\n1. Set the mode to Heat if the complaint is no heat, poor heat, or ice in heating season. Set Cool if the complaint is no cool or poor cool.\n2. Move the setpoint 2–3°F past the room temperature in the call direction (above for heat, below for cool).\n3. Wait 5–10 minutes. Longer in very cold weather is fine. Watch from a safe distance. Do not remove covers.\n\nDo not set Emergency / Aux just to make heat faster unless you already understand that it may shut the compressor off on purpose.\n\nIf you smell burning or see sparks while waiting, use Stop / get help.', [
        o('forced_problem_gone', 'Forced Heat or Cool — the problem went away', '@hp_auto_fixed_basic', 'Often an Auto or schedule issue, not a sealed-system repair.', 'Forced Heat or Cool and the problem went away.'),
        o('forced_problem_remains', 'Forced Heat or Cool — the problem is still there', 'hp.mode.emergency_aux_off', 'Continue to the Emergency / Aux check.', 'Forced Heat or Cool and the problem remains.'),
        o('could_not_change_mode', 'I cannot change the mode', '@hp_thermostat_mode_locked', 'Do not open low-voltage wiring to force it.', 'Thermostat would not accept Heat or Cool.'),
        o('not_sure_waited', 'I am not sure / I did not wait', '@hp_force_not_waited', 'Do not judge the system after a few seconds.')
      ]),

    'hp.mode.emergency_aux_off': n('Thermostat', 'Is Emergency or Aux heat on by accident?',
      'Many thermostats have Emergency Heat, Aux, or Em Heat. On a heat pump that often means the outdoor compressor is commanded off on purpose, and indoor heat comes from electric strips or a furnace only.\n\nCheck the display and any Aux / Emergency indicator. Do not open the air handler to look at strip sequencers. Do not measure amps.\n\nIf Emergency / Aux is on and you did not mean to use it, turn it Off and set normal Heat with the setpoint a few degrees above the room. Wait 10–15 minutes before judging the outdoor unit. If the complaint is cooling, set Cool instead and wait the same way.\n\nIf you are keeping Emergency / Aux on on purpose, an idle outdoor unit can be normal. The next Basic check is the filter and airflow.', [
        o('emergency_was_on_now_off', 'Emergency / Aux was on — I turned it Off and set normal Heat or Cool', {
          byHpLanding: { short_cycle: '@hp_short_cycle_after_mode_basics' },
          default: 'hp.ambient.outdoor_band'
        }, 'Wait 10–15 minutes in the prompt, then continue. Short cycling stops here for a professional.', 'Emergency or Aux was on and is now Off.'),
        o('emergency_already_off', 'Emergency / Aux is already Off, or my thermostat does not have it', {
          byHpLanding: { short_cycle: '@hp_short_cycle_after_mode_basics' },
          default: 'hp.ambient.outdoor_band'
        }, 'Continue. Short cycling stops here for a professional.', 'Emergency or Aux is already Off.'),
        o('keeping_emergency_on_purpose', 'I am keeping Emergency / Aux on on purpose', 'hp.handback.ac_filter_airflow', 'Outdoor idle may be normal. Check the filter and airflow next. No strip-amp diagnosis.', 'Keeping Emergency or Aux on on purpose.'),
        o('not_sure_emergency', 'I cannot tell if Emergency / Aux is on', '@hp_emergency_not_sure', 'Do not open the air handler to find strip wiring.')
      ]),

    'hp.ambient.outdoor_band': n('Outdoor temperature', 'Ballpark only',
      'You do not need a precision thermometer. From what you already know (phone weather, an outdoor thermometer, or how it feels):\n\nMild / warm — well above freezing (roughly above 45°F / 7°C).\nNear freezing — frost possible (roughly 25–40°F / −4–4°C).\nWell below freezing — deep cold (roughly below 25°F / −4°C).\n\nThis is not a balance-point calculation. It only steers whether a normal defrost is plausible, and whether weak heat can be normal capacity drop versus no heat at all.\n\nDo not go outside into unsafe conditions just to answer. If you cannot estimate, say so.', [
        o('band_mild_warm', 'Mild / warm — well above freezing', {
          byHpLanding: {
            ice_outdoor: 'hp.defrost.sanity',
            no_heat: 'hp.heat.capacity_vs_dead'
          },
          default: 'hp.observe.leaving_air_vs_mode'
        }, 'Ice still gets a defrost check. Mild no-heat skips the defrost wait. Cooling complaints go to the leaving-air check.', 'Outdoor band: mild / warm.'),
        o('band_near_freezing', 'Near freezing — frost possible', 'hp.defrost.sanity', 'Defrost check before calling the unit failed.', 'Outdoor band: near freezing.'),
        o('band_well_below', 'Well below freezing — deep cold', 'hp.defrost.sanity', 'Defrost check, then weak heat versus no heat.', 'Outdoor band: well below freezing.'),
        o('not_sure_ambient', 'I am not sure', {
          byHpLanding: {
            no_heat: 'hp.defrost.sanity',
            ice_outdoor: 'hp.defrost.sanity'
          },
          default: 'hp.observe.leaving_air_vs_mode'
        }, 'Heat or ice complaints get a conservative defrost check. A cooling complaint continues to the leaving-air check.', 'Outdoor temperature band unknown.')
      ]),

    'hp.defrost.sanity': n('Cold weather', 'Could this be a normal defrost?',
      'In heat mode when outdoor air is cold, frost on the outdoor coil can be normal. During automatic defrost, many heat pumps temporarily stop the outdoor fan, make a whoosh, hiss, or steam sound, blow cooler air indoors for a short time, and turn on auxiliary heat while the outdoor coil clears.\n\nFrom a safe distance only:\n\nDo not reach into the grille.\nDo not chip ice with tools, screwdrivers, hammers, or hot water.\nDo not remove panels or jump defrost sensors.\n\nWatch about 5–15 minutes. Does the outdoor unit recover into normal heat afterward (fan resumes, steam settles, heat returns)?\n\nHeavy ice plus keeping the system running to force heat is not a DIY continue. That risks compressor damage and water damage when the ice melts.\n\nBurning smell, smoke, sparks, or standing water at electrical equipment: Stop / get help.', [
        o('looks_like_defrost_then_recover', 'Looked like defrost, then returned toward normal, and the original problem is gone', '@hp_defrost_recovered_ok', 'Occasional defrost in cold weather can be normal.', 'Defrost-like behavior, then the original problem was gone.'),
        o('defrost_recovered_complaint_remains', 'Looked like defrost and recovered, but the original problem is still there', {
          byHpLanding: { no_cool: 'hp.observe.leaving_air_vs_mode' },
          default: 'hp.heat.capacity_vs_dead'
        }, 'Heat, ice, or both-modes complaints continue to the capacity check. A cooling complaint goes to the leaving-air check.', 'Defrost-like behavior, then the original problem remained.'),
        o('iced_solid_no_recover', 'Outdoor unit is iced solid or stuck and never returns to normal heat', 'hp.conclude.call_pro_defrost_valve_control', 'Possible defrost failure. No magnets, no jumping safeties, no gauges.', 'Outdoor unit iced solid and did not recover.'),
        o('not_cold_or_not_applicable', 'Mild weather, no frost behavior, or this does not match', {
          byHpLanding: { no_heat: 'hp.heat.capacity_vs_dead' },
          default: 'hp.observe.leaving_air_vs_mode'
        }, 'Skip the defrost wait.', 'Defrost wait does not apply.'),
        o('want_keep_running_despite_ice', 'There is heavy ice, but I want to keep the system running', '@ice_keep_running', 'Hard stop. Turn the system Off. Do not chip ice.', 'Homeowner wanted to keep the heat pump running despite ice.', { gate: 'ice_keep_running' }),
        o('not_sure', 'I am not sure', '@hp_defrost_not_sure', 'Do not force a defrost or open the unit.')
      ], { safetyGate: true, caution: 'Do not chip ice, jump a sensor, or keep the system running through heavy ice.' }),

    'hp.heat.capacity_vs_dead': n('Heat', 'Weak heat in the cold, or no heat at all?',
      'Heat pumps deliver less heat as outdoor air gets colder. That can feel like the system is dying when it is still running and may call auxiliary heat for help.\n\nFrom what you can tell without meters or panel work:\n\nIs there some warm air, or at least air that is not ice-cold, from the supplies after a proper Heat call for 10–15 minutes or more?\nOr does supply air stay at room temperature or cold, with no useful heat?\nIf you know you have electric strips or a gas furnace for backup: does the house warm only when that backup runs, while the outdoor unit stays idle in normal Heat with Emergency Off?\n\nDo not measure strip amps. Do not open sequencers. Do not add refrigerant. Do not declare a bad compressor from this screen.', [
        o('weak_but_some_heat', 'Some heat, but weak — especially in deep cold', {
          byHpAmbient: {
            near_freezing: '@hp_weak_heat_deep_cold',
            well_below: '@hp_weak_heat_deep_cold',
            mild_warm: 'hp.observe.leaving_air_vs_mode',
            unknown: 'hp.observe.leaving_air_vs_mode'
          },
          default: 'hp.observe.leaving_air_vs_mode'
        }, 'Deep cold with some heat is a capacity expectation. Mild or unknown weather continues to the leaving-air check.', 'Some heat, but weak.'),
        o('no_heat_at_all', 'No useful heat — supply air stays cold or at room temperature', 'hp.observe.leaving_air_vs_mode', 'Continue the leaving-air check.', 'No useful heat from the supplies.'),
        o('aux_only_seems_to_heat', 'The house only warms on Aux, Emergency, or the furnace; the outdoor unit stays idle in normal Heat', 'hp.observe.leaving_air_vs_mode', 'Continue the leaving-air check. No strip-amp DIY.', 'Backup heat seems to be the only heat; outdoor unit idle in normal Heat.'),
        o('not_applicable_cool_landing', 'My complaint is cooling only, not a heat-capacity question', 'hp.observe.leaving_air_vs_mode', 'Skip to the leaving-air check.'),
        o('not_sure_capacity', 'I am not sure', 'hp.observe.leaving_air_vs_mode', 'Do not open the air handler to check strips.')
      ]),

    'hp.observe.leaving_air_vs_mode': n('Outdoor unit', 'Leaving air versus the mode that is calling',
      'With the thermostat calling Heat or Cool to match the complaint (not Auto, and Emergency Off), after the unit has been trying for several minutes and is not in an obvious defrost:\n\nFrom a safe distance (no covers off, nothing through the grille):\n\nIf Cool is calling, air leaving the outdoor coil often feels warmer than the surrounding outdoor air.\nIf Heat is calling and the unit is not in defrost, that air often feels cooler than the surrounding outdoor air.\n\nAlso note whether the outdoor unit seems to run at all, or stays silent when it should run.\n\nThis does not prove refrigerant charge or a reversing-valve part. It only sorts a one-mode problem, a both-modes airflow problem, or an outdoor unit that is not running.\n\nO versus B is specific to the manufacturer. Do not assume which way the valve is energized.\n\nBurning smell, sparks, smoke, or water at electrical equipment: Stop / get help.', [
        o('leaving_air_matches_mode', 'Leaving air roughly matches the mode that is calling', 'hp.handback.ac_filter_airflow', 'Not an obvious mode-swap pattern. Shared filter and airflow checks are next. No refrigerant DIY.', 'Outdoor leaving air roughly matched the calling mode.'),
        o('mode_asymmetric_feel', 'One mode feels right; the other blows the wrong-temperature air while the outdoor unit seems to run', 'hp.rv.mode_asymmetric', 'A professional pattern. Not a homeowner valve repair.', 'One mode felt right and the other felt wrong while the outdoor unit ran.'),
        o('outdoor_not_running_when_should', 'Outdoor unit stays silent when Heat or Cool is calling (Emergency Off)', 'ac.cool.power.breaker_visual', 'Breaker door, then disconnect position only, then a professional. No capacitor or contactor DIY.', 'Outdoor unit silent while Heat or Cool was calling.'),
        o('still_in_defrost_or_weird', 'It still looks like defrost, steam, or a stopped fan in the cold', {
          hpDefrostAgain: 'hp.conclude.call_pro_defrost_valve_control',
          default: 'hp.defrost.sanity'
        }, 'One return to the defrost check. A second loop stops for a professional. Do not chip ice.', 'Outdoor unit still looked like defrost.'),
        o('cannot_observe_safely', 'I cannot observe safely / I am not sure', '@hp_cannot_observe', 'Do not force access or remove covers.')
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
        o('hazard_now', 'New hazard now (burning, smoke, sparks, water at electrical equipment, or gas)', '@hp_hazard_now', 'Stop. Do not keep diagnosing.', 'New hazard reported during the heat pump check.', { gate: 'hp_new_hazard' })
      ]),

    'hp.conclude.call_pro_defrost_valve_control': n('Call a professional', 'Defrost, reversing valve, or control',
      'Homeowner Basic checks are no longer the right next step. Common professional buckets for what you described include a failed or stuck defrost, a reversing valve or outdoor control that is not shifting modes, or thermostat O/B configuration after a thermostat swap.\n\nThis is not a confirmed parts diagnosis. It is a reason to stop DIY and get service.\n\nDo not attempt from this guide:\n\nCapacitor or contactor work. Heat-pump Advanced electrical is off.\nInverter board, amp draw, strip sequencers, or the panel interior.\nRefrigerant gauges, charge, or reclaim.\nMagnets, jumping safeties, or forcing the reversing valve.\n\nLeave the system safe. Thermostat Off is fine if ice was involved. For outdoor power: visual / familiar storm shutoff only. If you already safely use the outdoor disconnect or breaker as a storm shutoff and conditions are dry, you may leave it Off the way you already know. This guide does not teach operating the disconnect lever as a diagnostic procedure. If you are unsure, wet, or unfamiliar, leave power alone and call.\n\nCall a licensed HVAC technician. You may tell them: heat-pump mode, Emergency, temperature, and defrost checks only; outdoor iced without recovery and/or one mode wrong; no covers removed; O versus B was not assumed.\n\nSupport: lonnie@secondwrench.co', [
        o('ack_call_pro', 'Understood — call a professional', '@hp_defrost_valve_ob_control', 'Terminal acknowledgment.'),
        o('want_diy_valve_or_electrical_anyway', 'I want to force the valve or do electrical work myself', '@hp_defrost_valve_ob_control', 'Not offered. Advanced electrical is off, and valve force-outs are professional-only.', 'Asked to force the valve or do electrical DIY.'),
        o('want_diy_refrigerant_anyway', 'I want to add refrigerant or use gauges', '@hp_refrigerant_intent', 'Never a DIY step.', 'Asked to add refrigerant or use gauges.', { gate: 'refrigerant_intent' })
      ], { diyTier: 'pro_only', caution: 'No capacitor, contactor, gauges, or reversing-valve force-out. The disconnect step is not a lever lesson.' })
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
      ['Turn the system Off at the thermostat. Do not chip ice with tools.', 'Let the ice thaw, and schedule a licensed HVAC diagnosis before you rely on heating or cooling again.'],
      'Do not keep the system running to force heat or cooling, and do not bypass this stop.', 'ice',
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
      'next_step', 'next_step_advanced', { diyTier: 'advanced' }),
    hp_cool_only_use_ac: r('More information needed', 'Use the central AC check', 'This path is for an air-source ducted heat pump.',
      'A cooling-only central air conditioner has its own check. This heat-pump path will not guess a cooling-only diagnosis.',
      ['Go back home and start the central AC check.', 'Do not remove a cover to re-identify the equipment.'],
      'Do not apply heat-pump mode steps to a cooling-only condenser.', 'scope',
      'insufficient_info', 'hp_cool_only_use_ac'),
    hp_mini_split_oos: r('More information needed', 'Outside this heat-pump check', 'A ductless mini-split is not covered here.',
      'Mini-split guidance is a later phase. This check will not invent one.',
      ['Use a technician who works on that equipment, or the manufacturer owner guidance.', 'Do not remove a cover to force an identification.'],
      'Do not apply this ducted heat-pump guide to a mini-split.', 'scope',
      'insufficient_info', 'hp_mini_split_oos'),
    hp_water_source_oos: r('More information needed', 'Outside this heat-pump check', 'Water-source and geothermal equipment are not covered here.',
      'That equipment is a later phase. Loop water and related work are not part of this check.',
      ['Use a technician who works on that system.', 'Do not open covers or service a ground loop from this result.'],
      'Do not apply this air-source guide to a water-source heat pump.', 'scope',
      'insufficient_info', 'hp_water_source_oos'),
    hp_packaged_oos: r('More information needed', 'Outside this heat-pump check', 'Packaged or unconfirmed equipment is not covered in this wave.',
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
      'A system that starts and stops quickly can be a control, refrigerant, or electrical problem. Those are not homeowner steps in this wave.',
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
      ['Leave the system in normal Heat, with Emergency / Aux Off unless you intentionally want backup heat only.', 'Expect an occasional defrost in cold weather: fan may stop, indoor air may cool briefly, then heat returns.', 'If ice comes back and the unit does not recover, turn the system Off, do not chip the ice, and call a licensed HVAC professional.'],
      'Do not chip ice, jump a defrost sensor, or open the cabinet.', 'ice',
      'next_step', 'hp_defrost_recovered_ok', { diyTier: 'basic' }),
    hp_defrost_not_sure: r('More information needed', 'Do not force a defrost', 'It was not clear whether this was a normal defrost.',
      'Do not chip ice or open panels to decide.',
      ['Watch from a safe distance through one possible defrost, about 5–15 minutes, if you can do that without getting closer.', 'If you still cannot tell, or ice is heavy, turn the system Off and call a licensed HVAC professional. Tell them what the outdoor unit did.'],
      'Do not chip ice, pour water on the coil, or jump a sensor.', 'ice',
      'insufficient_info', 'hp_defrost_not_sure'),
    hp_weak_heat_deep_cold: r('Basic homeowner check', 'Weak heat in deep cold can be normal capacity', 'There is some heat, and it is cold outside.',
      'Heat pumps move less heat as outdoor air gets colder, and they may use auxiliary heat for help. That is not proof of a failed compressor. Ice that never clears is a different problem.',
      ['Keep Emergency / Aux Off unless you intentionally want backup heat only.', 'Expect less heat, and possible auxiliary heat, in this outdoor temperature. Give a Heat call 10–15 minutes.', 'If airflow from the vents feels weak, check the filter you can already reach. If the outdoor unit is iced solid and never recovers, turn it Off, do not chip the ice, and call a licensed HVAC professional.'],
      'Do not add refrigerant, measure strip amps, or open the air handler.', 'maintenance',
      'next_step', 'hp_weak_heat_deep_cold', { diyTier: 'basic' }),
    hp_cannot_observe: r('More information needed', 'Stop where you can see safely', 'The outdoor check needs a safe view.',
      'Do not move closer because of weather, ice, a locked yard, or anything else that makes the area unsafe.',
      ['Stay back. Note what you already saw for a professional.', 'If the home still needs heat or cooling and you cannot observe the outdoor unit, call a licensed HVAC professional.'],
      'Do not remove covers or put anything through the grille.', 'safety',
      'insufficient_info', 'hp_cannot_observe'),
    hp_outdoor_not_running_wave1: r('Professional guidance', 'Outdoor unit not running — call a professional', 'Basic power visuals are the end of the heat-pump start check.',
      'You can look at the breaker door and the outdoor disconnect position. This heat-pump path does not continue into capacitor or contactor work. Advanced electrical is off.',
      ['Leave the thermostat Off if the outdoor unit stays silent while it should run.', 'Call a licensed HVAC professional. Tell them whether the breaker door looked On, Off, or not identifiable, and whether the outdoor disconnect appeared On or Off from safe ground. You did not operate the disconnect as a test and you did not remove covers.'],
      'Do not flip the disconnect lever, open the disconnect door, pull a fuse, or replace a capacitor or contactor from this result.', 'electrical',
      'call_pro', 'hp_outdoor_not_running_wave1'),
    hp_rv_pattern_unsure: r('More information needed', 'Do not invent a valve diagnosis', 'The one-mode pattern was not clear, and the filter was already checked.',
      'Unsure is not a reason to force the reversing valve or attach gauges.',
      ['Write down which mode felt wrong, and whether the outdoor unit was running.', 'Call a licensed HVAC professional if comfort is still not acceptable. Tell them you did not change O/B jumpers or open covers.'],
      'Do not force the valve with a magnet or tool, and do not add refrigerant.', 'safety',
      'insufficient_info', 'hp_rv_pattern_unsure'),
    hp_basics_clear_after_filter: r('Professional guidance', 'Basic heat-pump checks are done', 'Filter and airflow basics are as far as this wave goes.',
      'Mode, Emergency / Aux, and the defrost screen were already considered. A clean filter, or returns and supplies when airflow was weak, does not prove the sealed system. This path does not continue to the outdoor fan, debris, or ice checks.',
      ['Leave returns and supplies as they are. Do not start duct work.', 'Call a licensed HVAC professional if the home still does not heat or cool. Tell them the mode matched the complaint, what you saw for Emergency / Aux and outdoor ice or frost, and what the filter and vents looked like. No covers were removed.'],
      'Do not move on to capacitor, contactor, refrigerant, or outdoor-fan diagnosis from this result.', 'maintenance',
      'call_pro', 'hp_basics_clear_after_filter'),
    hp_user_requests_pro_after_mode_clear: r('Professional guidance', 'Call a licensed HVAC professional', 'You chose to stop before the filter check.',
      'That is a complete stop. Mode basics were the homeowner steps already offered.',
      ['Leave the system in a safe mode. Off at the thermostat is enough.', 'Call a licensed HVAC professional and describe the complaint, the thermostat mode, and whether Emergency / Aux was on.'],
      'Do not open electrical covers or attach gauges because you skipped the filter.', 'safety',
      'call_pro', 'user_requests_pro_after_mode_clear'),
    hp_defrost_valve_ob_control: r('Professional guidance', 'Call a licensed HVAC professional', 'Defrost, reversing valve, or control — not a homeowner repair.',
      'This is a ranked reason to stop, not a confirmed parts diagnosis. Heat-pump Advanced electrical is off. Forcing the reversing valve is not a step in this guide.',
      ['If ice was involved, set the thermostat Off. Do not chip the ice.', 'For outdoor power, use only a shutoff you already know from storms, and only if it is dry. This guide does not teach operating the disconnect lever. If you are unsure, leave power alone.', 'Call a licensed HVAC technician. You may say: Basic heat-pump checks only, outdoor iced without recovery and/or one mode wrong, no covers removed, O versus B not assumed.'],
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
      'Gas, smoke, sparks, a burning smell, or water at electrical equipment is not a heat-pump DIY path.',
      ['If you smell gas or a carbon monoxide alarm is sounding, leave the building and call for help from outside. Do not operate switches inside.', 'If there is smoke, fire, or sparks, get people away and call 911 from safety.', 'If water is at electrical equipment, stay clear. Shut power only from a dry place you already know.', 'Do not return to troubleshooting until the hazard has been handled.'],
      'Do not keep diagnosing, open covers, or touch wet equipment.', 'safety',
      'emergency_exit', 'hp_new_hazard', { gate: 'hp_new_hazard' }),
    unusual_noise_hp_wave1: r('Professional guidance', 'This noise is not a homeowner parts path', 'No hazard was reported, and this heat-pump check does not diagnose the sound.',
      'There is no heat-pump capacitor, contactor, or inverter repair on this path, and it does not continue into the cooling-only outdoor-hum check.',
      ['If it is safe, set the thermostat Off.', 'Call a licensed HVAC professional. Describe what you heard and whether the outdoor fan was moving.', 'If you later smell burning or see smoke or sparks, get to safety and call 911. Do not return to this check.'],
      'Do not open covers or buy a part from the noise alone.', 'safety',
      'call_pro', 'unusual_noise_hp_wave1'),
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
    const replacing = ['hpClear', 'hpOutdoor', 'hpHandback', 'hpHandbackWeak'].filter(k => typeof next[k] === 'string');
    if (replacing.length) return replacing.map(k => next[k]);
    const found = [];
    if (next.byHpLanding) Object.keys(next.byHpLanding).forEach(k => found.push(next.byHpLanding[k]));
    if (next.byHpAmbient) Object.keys(next.byHpAmbient).forEach(k => found.push(next.byHpAmbient[k]));
    if (typeof next.hpFilterDone === 'string') found.push(next.hpFilterDone);
    if (typeof next.hpDefrostAgain === 'string') found.push(next.hpDefrostAgain);
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
      if (!node) continue;
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
    [SYSTEM_TYPE].concat(IDENTIFY).forEach(id => {
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
    ['hp.intake.system_confirm', 'hp.landing.picker', 'hp.mode.thermostat_check', 'hp.mode.force_match_complaint', 'hp.mode.emergency_aux_off', 'hp.ambient.outdoor_band', 'hp.defrost.sanity', 'hp.heat.capacity_vs_dead', 'hp.observe.leaving_air_vs_mode', 'hp.rv.mode_asymmetric', 'hp.handback.ac_filter_airflow', 'hp.conclude.call_pro_defrost_valve_control', 'ac.noise.hazard_screen', 'ac.tstat.blank.batteries', 'ac.cool.power.breaker_visual', 'ac.cool.power.disconnect_visual', 'ac.cool.filter.check', 'ac.cool.airflow.returns_supplies', '@unusual_noise_hp_wave1', '@hp_outdoor_not_running_wave1', '@hp_basics_clear_after_filter', '@ice_keep_running', '@hp_short_cycle_after_mode_basics', '@hp_defrost_valve_ob_control', '@hp_refrigerant_intent'].forEach(id => {
      if (!hpSeen.has(id)) throw new Error('HP walk missing ' + id);
    });
    ['ac.cool.outdoor.fan_spinning', 'ac.noise.clarify_outdoor_hum', 'ac.cool.airflow.returns_supplies', 'ac.cool.power.disconnect_visual', 'ac.cool.landing.picker'].forEach(id => {
      if (!off.has(id)) throw new Error('AC path lost ' + id);
    });
  }
  assertGraph();

  function create(seed = '', mode = 'real') {
    const state = {
      node: ENTRY, result: null, seed, mode, stopping: false, safetyCleared: false,
      consent: false, consentAt: null, termsVersion: null, telemetry: false,
      answers: [], startedAt: Date.now(), id: uuid(), landing: null,
      preselectChoice: null, treeVersion: '', audit: [],
      product: 'ask', hpLanding: null, hpAmbient: null, hpHandback: null,
      hpWeakAirflow: false, hpOutdoorNotRunning: false, hpConcludeFrom: null, defrostReturns: 0,
      idWinter: null, idEm: null
    };
    pushAudit(state, 'node_entered:' + ENTRY);
    pushAudit(state, 'product_lane:ask');
    return state;
  }
  function enterLane(state, lane) {
    state.product = lane;
    state.treeVersion = lane === 'hp' ? TREE_HP : TREE_VERSION;
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
  function resolveTarget(option, state) {
    const next = option.next;
    if (next && typeof next === 'object') {
      if (Object.prototype.hasOwnProperty.call(next, 'whenAdvanced')) {
        return advancedEnabled() ? next.whenAdvanced : next.default;
      }
      if (Object.prototype.hasOwnProperty.call(next, 'whenCoolingOnly')) {
        return (state.idWinter === 'never' && state.idEm === 'no') ? next.whenCoolingOnly : next.default;
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
      if (state.product === 'hp' && next.byHpLanding) {
        const key = state.hpLanding || '';
        if (next.byHpLanding[key]) return next.byHpLanding[key];
      }
      if (state.product === 'hp' && next.byHpAmbient) {
        const key = state.hpAmbient || 'unknown';
        if (next.byHpAmbient[key]) return next.byHpAmbient[key];
      }
      const landing = state.landing || '';
      if (next.byLanding && next.byLanding[landing]) return next.byLanding[landing];
      return next.default;
    }
    return next;
  }
  function applySessionOverlay(state, nodeId, choice, target) {
    if (nodeId === CONSENT && choice === 'agree_18_terms') target = 'sw.intake.system_type';
    if (typeof target !== 'string') return target;
    if (state.product !== 'ac' && (target === CONCLUDE || target.indexOf('ac.adv.cap.') === 0 || target === '@suspected_capacitor_contactor_advanced_off' || target === '@next_step_advanced')) {
      return '@hp_advanced_electrical_off';
    }
    if (state.product !== 'hp') return target;
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
  function concludeBody(on) {
    if (!on) return nodes[CONCLUDE].body;
    return 'Based on your answers (outdoor hum or buzz while the fan is not spinning, or the same start evidence while cool is calling), a common professional check is the outdoor contactor and/or capacitor.\n\nYou can call a licensed HVAC technician and stop here. This copy can also offer a gated Advanced path for a like-for-like outdoor run/dual capacitor only. The contactor is not replaced on that path.\n\nAdvanced work stops unless every gate passes: kill power and verify Off, no terminal contact before discharge, discharge only by the manufacturer method or a proper insulated bleed tool (never a screwdriver or bare-metal short), and covers on before power is restored. Unsure means stop.\n\nThis is not a confirmed parts diagnosis.';
  }
  function viewNode(id, state) {
    const node = nodes[id];
    if (!node) return null;
    let view = node;
    if (id === CONCLUDE) {
      const on = advancedEnabled();
      view = {
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
    return view;
  }
  function answer(state, choice, meta = {}) {
    if (!state || state.result || !nodes[state.node]) throw new Error('This check has ended or is invalid.');
    if (nodes[state.node].diyTier === 'advanced' && !advancedEnabled()) {
      throw new Error('Advanced DIY is not available in this beta.');
    }
    const nodeId = state.node;
    const node = nodes[nodeId];
    const option = node.options.find(x => x.id === choice);
    if (!option || (choice === 'filter_clean_weak_airflow' && state.product !== 'hp')) throw new Error('Choose an answer shown on the current screen.');
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
    if (nodeId === 'hp.landing.picker' && HP_LANDING[choice]) state.hpLanding = HP_LANDING[choice];
    if (nodeId === 'hp.ambient.outdoor_band' && HP_BAND[choice]) state.hpAmbient = HP_BAND[choice];
    if (nodeId === 'sw.intake.system_type' && choice === 'not_sure') {
      state.idWinter = null;
      state.idEm = null;
    }
    if (nodeId === 'sw.intake.system_type' && choice === 'cooling_only_ac') enterLane(state, 'ac');
    if (nodeId === 'sw.intake.system_type' && choice === 'heat_pump') enterLane(state, 'hp');
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
    state.answers.push({ node: nodeId, choice, label: option.label, fact: option.fact, at: new Date().toISOString() });
    pushAudit(state, 'answer_selected:' + choice);
    if (nodeId === 'hp.landing.picker' && state.hpLanding) pushAudit(state, 'flag:hp_landing=' + state.hpLanding);
    if (nodeId === 'hp.ambient.outdoor_band' && state.hpAmbient) pushAudit(state, 'flag:hp_ambient_band=' + state.hpAmbient);
    if (nodeId === 'hp.intake.system_confirm' && choice === 'air_source_ducted_hp') pushAudit(state, 'flag:hp_equipment=air_source_ducted');
    if (nodeId === 'hp.handback.ac_filter_airflow' && choice === 'proceed_ac_filter') {
      pushAudit(state, 'handback:ac.cool.filter.check');
      pushAudit(state, 'flag:hp_handback=filter_airflow');
    }
    if (nodeId === 'hp.landing.picker' && choice === 'landing_unusual_noise') pushAudit(state, 'handback:ac.noise.hazard_screen');
    if (nodeId === 'ac.cool.intake.system_confirm' && choice === 'heat_pump') pushAudit(state, 'product_lane:hp');
    let target = resolveTarget(option, state);
    target = applySessionOverlay(state, nodeId, choice, target);
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
        if (id === 'suspected_capacitor_contactor_advanced_off' || id === 'hp_advanced_electrical_off' || id === 'hp_defrost_valve_ob_control') {
          pushAudit(state, 'notes.hp_advanced_electrical:off');
        }
        if (id === 'hp_defrost_valve_ob_control' || id === 'hp_refrigerant_intent') pushAudit(state, 'notes.rv_force_out:forbidden');
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
      if (target === 'hp.conclude.call_pro_defrost_valve_control') {
        pushAudit(state, 'notes.hp_advanced_electrical:off');
        pushAudit(state, 'notes.rv_force_out:forbidden');
      }
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
    const complaint = clean(extra.complaint) || clean(state.seed) || facts.find(x => x.startsWith('Complaint:')) || (state.product === 'hp' ? 'Heat pump concern; see reported observations.' : 'AC concern; see reported observations.');
    const observations = [...new Set(facts.filter(x => !x.startsWith('Complaint:') && !x.startsWith('User ') && !x.startsWith('Residential ')))].slice(-5);
    const actions = [...new Set(facts.filter(x => x.startsWith('User ')))].slice(-2);
    return [(state.product === 'hp' ? 'HOMEOWNER SERVICE NOTE — heat pump observations, not a diagnosis' : 'HOMEOWNER SERVICE NOTE — observations, not a diagnosis'),
      state.product === 'hp' ? 'Equipment: air-source ducted heat pump.' : '',
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
      tree_version: state.treeVersion || '' };
  }
  function presentResult(state) {
    const res = state && results[state.result];
    if (!res) return null;
    if (!state || state.product !== 'hp') return res;
    const swap = s => String(s)
      .replace('Set the system to Cool and retest after 15–30 minutes.', 'Set Heat or Cool to match the complaint and retest after 15–30 minutes.')
      .replace('Retest cooling and airflow after the filter is in place.', 'Retest heating or cooling, and airflow, after the filter is in place.')
      .replace('Confirm mode is Cool and the setpoint is below the room temperature.', 'Confirm Heat or Cool matches the complaint, with the setpoint calling, then retest.')
      .replace('If the system still will not cool or start, start a new check and choose Not cooling or Will not start.', 'If the system still will not heat or cool, start a new heat pump check.')
      .replace('Set Cool with the setpoint below the room temperature and see whether the outdoor unit starts.', 'Set Heat or Cool so the thermostat is calling, and see whether the outdoor unit starts.');
    const copy = Object.assign({}, res, { actions: (res.actions || []).map(swap) });
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
    nodes, results, create, answer, stop, resume, summary, activity, viewNode, presentResult, advancedEnabled,
    treeVersion: TREE_VERSION, treeVersionHp: TREE_HP, wave1: WAVE1, wave2: WAVE2, advanced: ADVANCED,
    hpWave1: HP_WAVE1
  };
});
