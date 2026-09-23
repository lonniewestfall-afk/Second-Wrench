/* Deterministic decision engine. No model calls and no free-text diagnosis routing.
 * Browser or Node. Every action comes from the current node's choices.
 *
 * Wave-1 tree ac.cool.v0 — node keys ARE the approved spec ids.
 * Session entry: ac.gate.cluster_entry → ac.session.consent →
 *   ac.cool.intake.system_confirm → ac.cool.landing.picker.
 * Terminals (only): next_step (DIY Basic) | call_pro (reason) |
 *   emergency_exit | insufficient_info.
 * Advanced DIY is not a live terminal. Suspected capacitor/contactor
 * always ends at call_pro (suspected_capacitor_contactor_advanced_off).
 *
 * Commander locks (2026-09-22):
 * 1. Unusual noise → call_pro unusual_noise_early (no hum soft-route).
 * 2. filter_clean_ok + landing weak_airflow → call_pro weak_airflow_after_filter.
 *    Not cooling (and the Not-cooling chain) → ac.cool.outdoor.fan_spinning.
 * 3. Outdoor silent → call_pro outdoor_silent_will_not_start (no breaker DIY).
 * 4. Ice keep-running is a choice on ac.cool.indoor.ice_lines_coil, not a new id.
 * 5. Service-call note is not a diagnosis node (product/UI only).
 *
 * Live beta questions beyond these 12 ids are not mirrored.
 * "The outdoor unit seems inactive" is the Will-not-start family, not a 13th id.
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
        o('landing_unusual_noise', 'Unusual noise', '@unusual_noise_early', 'New or concerning sound from indoor or outdoor equipment.', 'Complaint: Unusual noise from indoor or outdoor equipment.')
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
          byLanding: { weak_airflow: '@weak_airflow_after_filter' },
          default: 'ac.cool.outdoor.fan_spinning'
        }, 'If weak airflow was the complaint and the filter is clean, this check stops for a professional. From Not cooling, the outdoor fan is next.', 'Filter looks clean or was recently replaced.'),
        o('filter_missing', 'No filter installed', '@filter_missing_basic', 'Install correct size filter before more DIY.', 'No filter installed.'),
        o('cannot_check_safely', 'I cannot check safely', '@filter_inaccessible', 'Do not force access.')
      ]),

    'ac.cool.outdoor.fan_spinning': n('Outdoor unit', 'Is the fan spinning?',
      'From a safe distance (do not put fingers or objects through the grille; no covers off):\n\nWith the thermostat calling for Cool, look and listen at the outdoor condenser.\n\nIs the top (or side) fan visibly spinning? Or is the outdoor unit silent / not moving? Or do you hear a hum or buzz from the outdoor cabinet while the fan is not spinning?\n\nStay clear of moving parts. Do not open the electrical compartment.', [
        o('fan_spinning', 'Outdoor fan is spinning', 'ac.cool.indoor.ice_lines_coil', 'Continue ice / cooling checks.', 'Outdoor fan was seen spinning.'),
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
        o('outdoor_silent', 'Outdoor unit is silent when cool is calling', '@outdoor_silent_will_not_start', 'Power / control / start family — Advanced OFF.', 'Outdoor unit silent while cool is calling.'),
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
        o('want_diy_capacitor_anyway', 'I want to replace the capacitor myself', '@suspected_capacitor_contactor_advanced_off', 'Not offered as live DIY while Advanced OFF.')
      ], { diyTier: 'pro_only' })
  };

  const r = (tier, urgency, title, explanation, actions, avoid, source, outcome, reason, extra = {}) =>
    ({ tier, urgency, title, explanation, actions, avoid, source, outcome, reason, diyTier: extra.diyTier || null, gate: extra.gate || null });

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
      'This beta does not guide breaker or disconnect checks. Those steps are not a homeowner path here.',
      ['Leave cooling Off if you can set that from a safe thermostat location.', 'Call a licensed HVAC professional. Tell them the outdoor unit is silent while the thermostat is calling for cool.', 'If the thermostat display is blank, you can start a new check and choose Blank thermostat for the battery step. Do not open the furnace board or the breaker panel.'],
      'Do not reset breakers, pull a disconnect, or open electrical covers to force a start.', 'electrical',
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
      'next_step', 'batteries_display_back', { diyTier: 'basic' })
  };

  function targetsOf(next) {
    if (next && typeof next === 'object') return [next.default].concat(Object.keys(next.byLanding || {}).map(k => next.byLanding[k]));
    return [next];
  }
  function assertGraph() {
    const outcomes = ['next_step', 'call_pro', 'emergency_exit', 'insufficient_info'];
    WAVE1.forEach(id => { if (!nodes[id]) throw new Error('Missing Wave-1 node ' + id); });
    Object.keys(results).forEach(id => {
      const res = results[id];
      if (outcomes.indexOf(res.outcome) === -1) throw new Error('Bad outcome on ' + id);
      if (res.diyTier === 'advanced' || (res.outcome === 'next_step' && res.diyTier !== 'basic')) {
        throw new Error('Advanced DIY terminal is not allowed: ' + id);
      }
    });
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
      const landing = state.landing || '';
      if (next.byLanding && next.byLanding[landing]) return next.byLanding[landing];
      return next.default;
    }
    return next;
  }
  function answer(state, choice, meta = {}) {
    if (!state || state.result || !nodes[state.node]) throw new Error('This check has ended or is invalid.');
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
    state.preselectChoice = choice === 'fan_not_spinning_silent' ? 'outdoor_silent' : null;
    if (typeof target !== 'string') throw new Error('Unknown next step.');
    if (target.charAt(0) === '@') {
      const id = target.slice(1);
      const res = results[id];
      if (!res) throw new Error('Unknown result.');
      if (res.diyTier === 'advanced' || (res.outcome === 'next_step' && res.diyTier !== 'basic')) {
        throw new Error('Advanced DIY is not available in this beta.');
      }
      state.result = id;
      state.node = null;
      if (res.outcome === 'next_step') {
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
      pushAudit(state, 'node_entered:' + target);
    }
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
  return { nodes, results, create, answer, stop, summary, activity, treeVersion: TREE_VERSION, wave1: WAVE1 };
});
