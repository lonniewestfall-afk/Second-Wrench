/* Analog dial and lever thermostats (ta.*), Wave 3.
 * Look and use outside controls only. tsAnalogWave3Enabled gates every render.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SW_TA = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function q(text) { return String(text).replace(/'/g, '\u2019'); }

  const copy = {
    PL1: q('An old dial or lever thermostat (no screen)'),
    PL2: q('Like a round dial, or a sliding lever, often with a small thermometer.'),
    PL3: q('Old dial or lever thermostat.'),
    PL4: q('My thermostat looks different'),
    PL5: q('Stop here. You can email us a photo of the front.'),
    PL6: q('Thermostat look didn’t match.'),
    PL7: q('A step seems to need the cover off, a tool, or touching wires'),
    PL8: q('Don’t. That part is for a pro.'),
    PL9: q('Step would need the cover off.'),
    PL10: q('Before we start: look, don’t open'),
    PL11: q('Old dial and lever thermostats may contain a small glass tube of mercury. Everything here is done from the outside. Don’t take the cover off, pull or tilt the thermostat away from the wall, loosen screws, or touch wires.'),
    PL12: q('If you see broken glass or small silver beads on or below the thermostat, choose that answer now.'),
    PL13: q('I see broken glass or silver beads, or the thermostat is cracked open'),
    PL14: q('Possible broken mercury switch. User did not touch it.'),
    PL15: q('The cover is already off, or the thermostat is hanging off the wall'),
    PL16: q('Cover off or thermostat loose. User did not touch it.'),
    PL17: q('OK, I’ll only look and use the dial and switches'),
    PL18: q('Agreed to look-only checks.'),
    PL19: q('Which looks most like yours?'),
    PL20: q('Pick the closest look. You don’t need the model number, and don’t take it off the wall to look.'),
    PL21: q('A rectangle with a round dial and a separate small thermometer'),
    PL22: q('Rectangle, round dial, separate thermometer.'),
    PL23: q('Round, and the whole front turns'),
    PL24: q('Round thermostat.'),
    PL25: q('A rectangle with a sliding lever'),
    PL26: q('Lever thermostat.'),
    PL27: q('Another dial or lever with no screen'),
    PL28: q('Other dial or lever.'),
    PL29: q('What’s happening?'),
    PL30: q('Nothing runs at any setting'),
    PL31: q('Nothing runs at any dial setting.'),
    PL32: q('Heat doesn’t come on until I turn it way up, then the house gets too warm'),
    PL33: q('Heat starts only at a high setting, then overshoots.'),
    PL34: q('It starts near where I set it, but runs too long and gets too warm'),
    PL35: q('Starts near the setting, overshoots.'),
    PL36: q('It turns the heat on and off a lot'),
    PL37: q('Short heat cycles.'),
    PL38: q('The fan runs all the time, or never'),
    PL39: q('Fan runs constantly or not at all.'),
    PL40: q('The little thermometer never moves'),
    PL41: q('Built-in thermometer needle doesn’t move.'),
    PL42: q('I want to replace it with a newer thermostat'),
    PL43: q('Wants a replacement thermostat.'),
    PL44: q('It runs a heat pump, or I’m not sure what it runs'),
    PL45: q('Heat pump or system unknown.'),
    PL46: q('Dial and lever thermostats like yours usually have no batteries. Skip step 1.'),
    PL47: q('Check the switches on the front'),
    PL48: q('Some dial and lever thermostats have small switches on the front or bottom edge. Look for one marked Heat, Off, Cool, and one marked On and Auto. Not every model has them.'),
    PL48a: q('If the switch is set to Em Heat or Emer, leave it there. Ask a licensed HVAC professional before you change it.'),
    PL49: q('For heat, set the system switch to Heat. Off turns everything off. On runs the fan all the time; Auto runs it only while heating or cooling.'),
    PL50: q('Move a switch only with your finger. Don’t use cooling when it’s below 50 °F (10 °C) outside. (MANUAL: Honeywell T834 owner’s manual page 5, and T87F 60-0830-4 page 3.)'),
    PL51: q('It was on Off or Cool. I moved it to Heat and the heat came on'),
    PL52: q('System switch was not on Heat. User moved it to Heat; heat started.'),
    PL53: q('It’s on Heat (or there’s no switch), and nothing changed'),
    PL54: q('System switch on Heat or none.'),
    PL55: q('The fan switch was on On. I moved it to Auto'),
    PL56: q('Fan switch was On; user set Auto.'),
    PL57: q('The fan switch is on Auto (or there isn’t one), and the fan still runs all the time or never'),
    PL58f: q('Fan wrong with switch on Auto or no switch.'),
    PL59: q('A switch won’t move, or feels loose or broken'),
    PL60: q('Switch stuck or broken. User did not force it.'),
    PL61: q('Compare with a separate thermometer'),
    PL62: q('Put a separate thermometer on a shelf or table near the thermostat, at about the same height. Keep it out of the sun and away from vents, lamps, and your hands. Check it every so often. When its reading stops changing, write down what it says, and what the thermostat’s own little thermometer says.'),
    PL63: q('The little thermometer on the thermostat is a separate part. If it’s stuck or wrong, that alone doesn’t mean the thermostat is broken.'),
    PL64: q('They match within about a degree'),
    PL65: q('They don’t match, or the needle didn’t move'),
    PL66: q('I don’t have a separate thermometer'),
    PL67: q('Built-in thermometer matched a separate thermometer.'),
    PL68: q('Built-in thermometer differed or didn’t move.'),
    PL69: q('No separate thermometer.'),
    PL70: q('Is it level?'),
    PL71: q('Use a level app on your phone. Hold the phone’s edge lightly against the top edge of the case. Don’t press, pull, tilt, or loosen the thermostat. If the case moves, stop and choose that answer.'),
    PL72: q('If it looks tilted, leave it. A pro levels it with the cover off.'),
    PL73: q('Many older dial thermostats are meant to be mounted level. If one is tilted, it can turn the heat on and off away from the temperature you set.'),
    PL74: q('After heating or cooling stops, many systems keep the fan running for a few minutes to push out the warm or cool air left in the ducts. That’s normal.'),
    PL75: q('It looks level, or very close'),
    PL76: q('It’s clearly tilted'),
    PL77: q('I can’t tell, or I don’t have a level app'),
    PL78c: q('The case moved or feels loose'),
    PL79f: q('Case looks level.'),
    PL80f: q('Case looks tilted.'),
    PL81f: q('Case loose. User did not touch it further.'),
    PL81: q('What’s near the thermostat?'),
    PL82: q('Look, and don’t touch the thermostat. Check for a heat vent or register blowing on it or nearby, a lamp, TV, or other device close to it, sun on it at some time of day, a draft from a door or window, or a wall that feels warm, like a chimney or a wall with a heat duct behind it.'),
    PL83: q('A lamp, TV, or other device is close to it'),
    PL84: q('A heat vent blows on it or is close by'),
    PL85l: q('The wall feels warm, or it gets sun'),
    PL86: q('There’s a draft from a door or window'),
    PL87: q('None of these'),
    PL88: q('I haven’t checked, or I’m not sure'),
    PL89: q('Heat source near the thermostat (movable).'),
    PL90: q('Supply register near the thermostat.'),
    PL91: q('Warm wall or sun on the thermostat.'),
    PL92: q('Draft at the thermostat.'),
    PL93: q('Nothing near the thermostat.'),
    PL94: q('Where does the heat start?'),
    PL95: q('This check makes the heat run for a short time. Skip it if a warmer room for a little while would be hard on anyone at home. Start with the dial or lever a little below the room temperature (use your separate thermometer if you have one). Turn it up slowly, a little at a time, and listen for the heat to start. Write down the setting where it starts. Then turn it back to where you like it. Don’t leave it at the top.'),
    PL96: q('Does it have a battery compartment?'),
    PL97: q('Look only. The dial and lever thermostats in the guides we checked have no batteries. Don’t open it to look.'),
    PL98: q('No, I don’t see one'),
    PL99: q('No battery compartment seen.'),
    PL100: q('Yes, there’s a battery door on the outside'),
    PL101: q('Battery door seen; not one of the analog looks.'),
    PL102: q('Please check that the thermostat is level. Some dial thermostats need to be level to hold their setting.'),
    PL103: q('Please check the thermostat’s calibration against a thermometer.'),
    PL104: q('Please check whether the thermostat’s heat anticipator setting matches my heating system.'),
    PL105: q('If this thermostat can’t be set up to work well with my heating system, what would you replace it with that’s compatible?'),
    PL106: q('Is this covered under the installation warranty?'),
    PL107: q('If you replace it, please take the old one for mercury recycling.'),
    PL108: q('Please check the thermostat’s fan setting and fan wiring with my heating system.'),
    PL109: q('What to ask your installer'),
    PL110: q('Old dial thermostats can drift over the years, end up out of level, or have an inside setting (the heat anticipator) that doesn’t match the heating system. Checking and adjusting these means taking the cover off, which is a job for your installer or a licensed HVAC professional. Here’s what to tell them:'),
    PL111: q('Replacing an old dial thermostat'),
    PL112: q('A new thermostat means disconnecting the old one and connecting wires to the new one. Have a licensed HVAC professional do it, and ask them to check that the new one works with your system. Don’t take the old one off the wall yourself. It may contain mercury.'),
    PL113: q('The switch was the issue'),
    PL114: q('The thermostat’s switch was set so the heat or fan wouldn’t run the way you wanted. If it happens again, or the problem comes back, run this check again.'),
    PL115: q('Possible mercury: stop and keep people away'),
    PL116b: q('Don’t touch it, step in it, vacuum, or sweep. Keep children and pets out of the room. If you can reach a window without going near the glass or beads, open it to the outside. Then leave the room and close the door to the rest of the home. For cleanup advice, call your local public health office.'),
    PL117: q('Leave the cover on'),
    PL118: q('Inside the cover are parts that need a pro, and on many old thermostats a small glass tube of mercury. Don’t take it apart, tilt it, or loosen it. If the cover is already off, leave it as it is, keep children and pets away from it, and call your installer or a licensed HVAC professional.'),
    PL119: q('Your thermostat looks different'),
    PL120: q('Thanks. Stop here, and don’t open it to look. Choosing this doesn’t send us anything. If you’d like us to check whether these steps fit, email a photo of the front of the thermostat to support@secondwrench.co. Show only the thermostat, with no faces, addresses, or other personal details.'),
    PL121: q('When the old thermostat comes off the wall, keep it whole. Don’t open it, break it, or put it in the trash. Take it to a household hazardous waste site or a thermostat take-back program, or ask your HVAC professional to take it. Until it’s dropped off, keep it away from children and pets.'),
    PL122: q('In the US, Thermostat Recycling Corporation lists drop-off locations at thermostat-recycle.org.'),
    PL123: q('In Canada, the HVAC industry’s Thermostat Recovery Program takes them. Find a drop-off at hrai.ca/public-drop-off-locations.'),
    PL124: q('In PEI, Waste Watch Drop-Off Centers accept household hazardous waste from residents free of charge.'),
    PL125: q('It starts within a degree or two of the room temperature'),
    PL126: q('It only starts several degrees above the room temperature'),
    PL127: q('It didn’t start even at the top'),
    PL128: q('I’d rather not try this'),
    PL129: q('Heat started near room temperature.'),
    PL130: q('Heat started well above room temperature.'),
    PL131: q('No start at the top of the dial.'),
    PL132: q('If nothing runs at any setting after the floor checks, the usual causes are a loose or missing thermostat wire, a worn-out thermostat, or a problem at the furnace or air-handler controls. A pro checks those.'),
    PL133: q('If the switch on the thermostat is on Heat, Em Heat, or Emer, leave it there. If it’s on Off or Cool, you can move it to Heat with your finger. Don’t change anything else, and don’t take the cover off.'),
    PL134: q('Hi, you installed my [equipment] [install_when]. The heat isn’t working right with my old [thermostat_look] thermostat, and I’d like you to check it while the install is new.'),
    PL135: q('Hi, I’d like someone to check my old [thermostat_look] thermostat with my heating system.'),
    PL136: q('The heat doesn’t come on until I turn the dial up to [start_dial], then the house gets too warm.'),
    PL137: q('The thermostat’s own thermometer reads about [builtin_reading] and never moves.'),
    PL138: q('Heat started when the dial was at [start_dial]; my separate thermometer read [room_temp].'),
    PL139tilted: q('Checked with a phone level, it looks tilted.'),
    PL139level: q('Checked with a phone level, it looks level.'),
    PL140: q('Near it: [location].'),
    PL141: q('Thanks.')
  };

  const REUSE = {
    cold: 'The house is getting cold, and someone at home is at risk from the cold (an infant, an older adult, or someone who is ill or medically fragile)',
    coldHint: 'Warmth first.',
    coldFact: 'House getting cold with someone at risk reported.',
    hazard: 'New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, refrigerant leak alarm, or water at electrical parts)',
    hazardHint: q('Stop. Don’t keep checking.'),
    hazardFact: 'New hazard reported during the thermostat check.',
    PL58: 'If the screen stays blank or keeps losing power after the floor checks, the usual causes are a loose or missing power wire or a problem at the furnace or air-handler controls. A pro checks those.',
    PL85: q('If the thermostat is on Heat or emergency heat, leave it there. If it’s on Off or Cool and the screen works, you can set it to Heat. Don’t change any other settings.')
  };

  const rules = {
    requireSafety: true,
    blankFallback: true,
    hpHideOffCool: true,
    render48aOnlyWithHp: true,
    disposalOnReplace: true,
    replaceHasBroken: true,
    resultHazardNext: '@ts_hazard_now',
    levelAsk: 'tilted',
    analogVariant: 'origin',
    powerNote: 'both',
    locationClearRenders140: false,
    causeScript: '',
    untaggedScript: '',
    pl139: 'exact'
  };

  const TRC_HREF = 'https://thermostat-recycle.org/program-info/faqs/';
  const LOOK = {
    look_rect_dial: 'rectangle thermostat with a round dial and a separate small thermometer',
    look_round: 'round',
    look_lever: 'sliding lever',
    look_other_dial: 'dial or lever'
  };
  const TAIL_IDS = ['analog_looks_different', 'analog_needs_cover_off', 'hazard_now'];

  function enabled() {
    return !!(typeof globalThis !== 'undefined' && globalThis.SW_CONFIG && globalThis.SW_CONFIG.tsAnalogWave3Enabled === true);
  }
  function audit(state, event) {
    if (!state || !state.audit) return;
    state.audit.push({ event: event, at: new Date().toISOString(), tree: state.treeVersion || '' });
  }
  function option(id, label, next, fact, extra) {
    const row = { id: id, label: label, next: next, hint: '', fact: fact || '', gate: null };
    if (extra && extra.hint) row.hint = extra.hint;
    if (extra && extra.gate) row.gate = extra.gate;
    if (extra && extra.flag) row.flag = extra.flag;
    return row;
  }
  function cold() {
    return option('cold_home_risk', REUSE.cold, '@ts_cold_home_urgent', REUSE.coldFact, { hint: REUSE.coldHint });
  }
  function tail() {
    return [
      option('analog_looks_different', copy.PL4, '@ta_looks_different', copy.PL6, { hint: copy.PL5 }),
      option('analog_needs_cover_off', copy.PL7, '@ta_cover_off_stop', copy.PL9, { hint: copy.PL8 }),
      option('hazard_now', REUSE.hazard, '@ts_hazard_now', REUSE.hazardFact, { hint: REUSE.hazardHint, gate: 'ts_new_hazard' })
    ];
  }
  function node(title, body, middle, safety) {
    return {
      section: 'Thermostat',
      title: title,
      body: body,
      caution: '',
      diyTier: 'basic',
      safetyGate: !!safety,
      options: [cold()].concat(middle, tail())
    };
  }
  function result(fields) {
    return {
      tier: fields.tier,
      urgency: fields.urgency,
      title: fields.title,
      explanation: fields.explanation,
      actions: [],
      avoid: '',
      source: fields.source || 'maintenance',
      outcome: fields.outcome,
      reason: fields.reason,
      diyTier: fields.diyTier == null ? null : fields.diyTier,
      gate: fields.gate || null,
      continueTo: null
    };
  }

  const nodes = {
    'ta.gate.look_only': node(copy.PL10, copy.PL11 + '\n\n' + copy.PL12, [
      option('broken_bulb', copy.PL13, '@ta_mercury_broken_stop', copy.PL14, { gate: 'ta_mercury' }),
      option('cover_already_off', copy.PL15, '@ta_cover_off_stop', copy.PL16),
      option('look_only_ok', copy.PL17, 'ta.id.look', copy.PL18)
    ], true),
    'ta.id.look': node(copy.PL19, copy.PL20, [
      option('look_rect_dial', copy.PL21, 'ta.diag.symptom', copy.PL22),
      option('look_round', copy.PL23, 'ta.diag.symptom', copy.PL24),
      option('look_lever', copy.PL25, 'ta.diag.symptom', copy.PL26),
      option('look_other_dial', copy.PL27, 'ta.check.batteries', copy.PL28)
    ]),
    'ta.diag.symptom': node(copy.PL29, '', [
      option('no_heat_any', copy.PL30, '@ts_blank_after_basics', copy.PL31),
      option('high_set_overshoot', copy.PL32, 'ta.check.switches', copy.PL33),
      option('overshoot_only', copy.PL34, 'ta.check.switches', copy.PL35),
      option('short_cycles', copy.PL36, 'ta.check.switches', copy.PL37),
      option('fan_issue', copy.PL38, 'ta.check.switches', copy.PL39),
      option('needle_stuck', copy.PL40, 'ta.check.thermometer', copy.PL41),
      option('want_replace', copy.PL42, '@ta_replace_pro', copy.PL43),
      option('heat_pump_system', copy.PL44, 'ta.check.switches', copy.PL45)
    ]),
    'ta.check.switches': node(copy.PL47, copy.PL48 + '\n\n' + copy.PL49 + '\n\n' + copy.PL50, [
      option('sys_was_off_or_cool', copy.PL51, '@ta_switch_fixed', copy.PL52),
      option('sys_heat_no_change', copy.PL53, 'ta.check.thermometer', copy.PL54),
      option('fan_on_setting', copy.PL55, '@ta_switch_fixed', copy.PL56),
      option('fan_auto_still_wrong', copy.PL57, '@ta_installer_script', copy.PL58f, { hint: copy.PL74 }),
      option('switch_stuck', copy.PL59, '@ta_cover_off_stop', copy.PL60)
    ]),
    'ta.check.thermometer': node(copy.PL61, copy.PL62 + '\n\n' + copy.PL63, [
      option('thermo_match', copy.PL64, 'ta.check.level', copy.PL67),
      option('thermo_differ', copy.PL65, 'ta.check.level', copy.PL68),
      option('thermo_cant', copy.PL66, 'ta.check.level', copy.PL69)
    ]),
    'ta.check.level': node(copy.PL70, copy.PL71 + '\n\n' + copy.PL73 + '\n\n' + copy.PL72, [
      option('level_ok', copy.PL75, 'ta.check.location', copy.PL79f),
      option('level_off', copy.PL76, 'ta.check.location', copy.PL80f),
      option('level_cant', copy.PL77, 'ta.check.location', ''),
      option('case_moves', copy.PL78c, '@ta_cover_off_stop', copy.PL81f)
    ]),
    'ta.check.location': node(copy.PL81, copy.PL82, [
      option('near_movable', copy.PL83, '@ts_location_fix_basic', copy.PL89),
      option('near_register', copy.PL84, '@ts_location_fix_basic', copy.PL90),
      option('near_warm_wall', copy.PL85l, 'ta.check.start_point', copy.PL91),
      option('near_draft', copy.PL86, 'ta.check.start_point', copy.PL92),
      option('near_nothing', copy.PL87, 'ta.check.start_point', copy.PL93),
      option('near_not_sure', copy.PL88, 'ta.check.start_point', '')
    ]),
    'ta.check.start_point': node(copy.PL94, copy.PL95, [
      option('start_near_room', copy.PL125, '@ta_installer_script', copy.PL129),
      option('start_well_above', copy.PL126, '@ta_installer_script', copy.PL130),
      option('start_never', copy.PL127, '@ts_blank_after_basics', copy.PL131),
      option('start_skip', copy.PL128, '@ta_installer_script', '')
    ]),
    'ta.check.batteries': node(copy.PL96, copy.PL97, [
      option('no_batt_visible', copy.PL98, 'ta.diag.symptom', copy.PL99),
      option('batt_visible', copy.PL100, '@ta_looks_different', copy.PL101)
    ])
  };

  const results = {
    ta_installer_script: result({
      tier: 'Professional guidance', urgency: 'Arrange HVAC service', title: copy.PL109, explanation: copy.PL110,
      outcome: 'call_pro', reason: 'ta_installer_script'
    }),
    ta_replace_pro: result({
      tier: 'Professional guidance', urgency: 'Arrange HVAC service', title: copy.PL111, explanation: copy.PL112,
      outcome: 'call_pro', reason: 'ta_replace_pro'
    }),
    ta_switch_fixed: result({
      tier: 'Basic homeowner check', urgency: 'Keep the note', title: copy.PL113, explanation: copy.PL114,
      outcome: 'next_step', reason: 'ta_switch_fixed', diyTier: 'basic'
    }),
    ta_mercury_broken_stop: result({
      tier: 'Emergency', urgency: 'Stop. Keep people away.', title: copy.PL115, explanation: copy.PL116b,
      outcome: 'emergency_exit', reason: 'ta_mercury_broken_stop', source: 'S-HC', gate: 'ta_mercury'
    }),
    ta_cover_off_stop: result({
      tier: 'Professional guidance', urgency: 'Leave it as it is', title: copy.PL117, explanation: copy.PL118,
      outcome: 'call_pro', reason: 'ta_cover_off_stop'
    }),
    ta_looks_different: result({
      tier: 'More information needed', urgency: 'Stop here', title: copy.PL119, explanation: copy.PL120,
      outcome: 'insufficient_info', reason: 'ta_looks_different'
    })
  };

  function install(intoNodes, intoResults) {
    Object.keys(nodes).forEach(function (id) { intoNodes[id] = nodes[id]; });
    Object.keys(results).forEach(function (id) { intoResults[id] = results[id]; });
  }

  function blankV2() {
    return !!(typeof globalThis !== 'undefined' && globalThis.SW_CONFIG && globalThis.SW_CONFIG.tsBlankScreenV2Enabled === true);
  }
  function handoff(state, nodeId) {
    state.tsAnalog = true;
    state.tsModel = 'analog';
    state.tsOrigin = nodeId;
    state.tsLanding = 'blank_screen';
    if (blankV2()) {
      state.tsHandoff = 'blank';
      return 'ts.gate.safety_stops';
    }
    if (!rules.blankFallback) return 'ta.missing.blank_screen';
    return '@ts_blank_after_basics';
  }
  function passedSafety(state) {
    return (state.answers || []).some(function (row) {
      return row.node === 'ts.gate.safety_stops' && row.choice === 'ts_none_of_these';
    });
  }
  function routeBrand(state) {
    state.tsAnalog = true;
    state.tsModel = 'analog';
    state.tsPendingAnalog = true;
    audit(state, 'flag:ts_analog');
    if (rules.requireSafety && !passedSafety(state)) return 'ts.gate.safety_stops';
    state.tsOrigin = 'ta.gate.look_only';
    return 'ta.gate.look_only';
  }
  function routeSafetyClear(state, target) {
    if (state.tsHandoff === 'blank') {
      state.tsHandoff = null;
      state.tsLanding = 'blank_screen';
      state.tsModel = 'analog';
      return 'ts.power.blank_screen';
    }
    if (state.tsAnalog || state.tsPendingAnalog) {
      state.tsAnalog = true;
      state.tsPendingAnalog = false;
      state.tsModel = 'analog';
      if (!state.tsOrigin || String(state.tsOrigin).indexOf('ta.') !== 0) state.tsOrigin = 'ta.gate.look_only';
      return 'ta.gate.look_only';
    }
    return target;
  }
  function record(state, choice) {
    if (LOOK[choice]) state.taLook = choice;
    const symptoms = {
      no_heat_any: 1, high_set_overshoot: 1, overshoot_only: 1, short_cycles: 1,
      fan_issue: 1, needle_stuck: 1, want_replace: 1, heat_pump_system: 1
    };
    if (symptoms[choice]) state.taSymptom = choice;
    if (choice === 'heat_pump_system') {
      state.taHp = true;
      audit(state, 'flag:ta_hp');
    }
    if (choice === 'thermo_match') state.taThermo = 'match';
    if (choice === 'thermo_differ') state.taThermo = 'differ';
    if (choice === 'thermo_cant') state.taThermo = 'cant';
    if (choice === 'level_ok') state.taLevel = 'ok';
    if (choice === 'level_off') state.taLevel = 'tilted';
    if (choice === 'level_cant') state.taLevel = 'unknown';
    if (choice === 'case_moves') state.taLevel = 'loose';
    if (choice === 'fan_on_setting') state.taFan = 'fan_on_setting';
    if (choice === 'fan_auto_still_wrong') state.taFan = 'fan_auto_still_wrong';
    const where = {
      near_movable: 'a lamp, TV, or other device',
      near_register: 'register',
      near_warm_wall: 'a warm wall or sun',
      near_draft: 'a draft',
      near_nothing: 'clear',
      near_not_sure: 'unknown'
    };
    if (Object.prototype.hasOwnProperty.call(where, choice)) state.taLocation = where[choice];
    if (choice === 'start_near_room') state.taStart = 'near_room';
    if (choice === 'start_well_above') state.taStart = 'well_above';
    if (choice === 'start_never') state.taStart = 'never';
    if (choice === 'start_skip') state.taStart = 'skip';
  }
  function route(state, nodeId, choice, option, target) {
    if (!enabled() || !state) return target;
    if (choice === 'brand_analog') return routeBrand(state);
    if (nodeId === 'ts.gate.safety_stops' && choice === 'ts_none_of_these') return routeSafetyClear(state, target);
    if (String(nodeId).indexOf('ta.') === 0) {
      state.tsOrigin = nodeId;
      state.tsAnalog = true;
      if (!state.tsModel) state.tsModel = 'analog';
      record(state, choice);
      if (choice === 'no_heat_any' || choice === 'start_never') return handoff(state, nodeId);
      if (state.taHp && (choice === 'sys_heat_no_change' || choice === 'fan_on_setting' || choice === 'fan_auto_still_wrong')) {
        return '@ta_installer_script';
      }
      if (state.taHp && target === 'ta.check.start_point') return '@ta_installer_script';
    }
    if ((state.tsAnalog || state.tsPendingAnalog) && target === 'ts.landing.picker') return 'ta.gate.look_only';
    return target;
  }

  function fanFirst(options) {
    const tailMap = { analog_looks_different: 1, analog_needs_cover_off: 1, hazard_now: 1 };
    const fanMap = { fan_on_setting: 1, fan_auto_still_wrong: 1, switch_stuck: 1 };
    const coldRows = options.filter(function (op) { return op.id === 'cold_home_risk'; });
    const fanRows = options.filter(function (op) { return fanMap[op.id]; });
    const tailRows = options.filter(function (op) { return tailMap[op.id]; });
    const rest = options.filter(function (op) {
      return op.id !== 'cold_home_risk' && !fanMap[op.id] && !tailMap[op.id];
    });
    return coldRows.concat(fanRows, rest, tailRows);
  }
  function switchesView(state, view) {
    const hp = !!state.taHp;
    const show48 = rules.render48aOnlyWithHp ? hp : true;
    let body = view.body;
    if (show48 && body.indexOf(copy.PL48a) === -1) {
      const parts = body.split('\n\n');
      parts.splice(1, 0, copy.PL48a);
      body = parts.join('\n\n');
    }
    let options = view.options.map(function (op) { return Object.assign({}, op); });
    if (hp && rules.hpHideOffCool) options = options.filter(function (op) { return op.id !== 'sys_was_off_or_cool'; });
    if (hp) {
      options.forEach(function (op) {
        if (op.id === 'sys_heat_no_change' || op.id === 'fan_on_setting' || op.id === 'fan_auto_still_wrong') op.next = '@ta_installer_script';
      });
    }
    if (state.taSymptom === 'fan_issue') options = fanFirst(options);
    return Object.assign({}, view, { body: body, options: options });
  }
  function view(id, state, seen) {
    if (!enabled() || !seen) return seen;
    if (id === 'ts.intake.brand_picker') {
      const options = seen.options.slice();
      const at = options.findIndex(function (op) { return op.id === 'brand_other'; });
      const row = option('brand_analog', copy.PL1, 'ta.gate.look_only', copy.PL3, { hint: copy.PL2, flag: 'ts_analog' });
      options.splice(at < 0 ? options.length : at, 0, row);
      return Object.assign({}, seen, { options: options });
    }
    if (!state || id !== 'ta.check.switches') return seen;
    return switchesView(state, seen);
  }

  function notesOf(state) { return (state && state.taNotes) || {}; }
  function applyLook(template, phrase) {
    if (/thermometer$/.test(phrase)) return template.split('[thermostat_look] thermostat').join(phrase);
    return template.split('[thermostat_look]').join(phrase);
  }
  function wantLevel(level) {
    if (rules.levelAsk === 'not-ok') return !!level && level !== 'ok';
    return level === 'tilted';
  }
  function line(id, text) { return { id: id, text: text }; }
  function scriptFor(state) {
    state = state || {};
    const notes = notesOf(state);
    const symptom = state.taSymptom || notes.symptom || '';
    const level = state.taLevel != null ? state.taLevel : (notes.level || '');
    const thermo = state.taThermo || notes.thermo || '';
    const fan = state.taFan || notes.fan || '';
    const look = LOOK[state.taLook || notes.look || ''];
    const lines = [];
    if (look && notes.audience === 'installer' && notes.equipment && notes.install_when) {
      let text = applyLook(copy.PL134, look);
      text = text.split('[equipment]').join(notes.equipment).split('[install_when]').join(notes.install_when);
      lines.push(line('PL-TA-134', text));
    } else if (look && notes.audience === 'pro') {
      lines.push(line('PL-TA-135', applyLook(copy.PL135, look)));
    }
    let saw136 = false;
    if (symptom === 'high_set_overshoot' && notes.start_dial) {
      lines.push(line('PL-TA-136', copy.PL136.split('[start_dial]').join(notes.start_dial)));
      saw136 = true;
    }
    const needle = symptom === 'needle_stuck' || notes.needleNotMoving === true;
    if (notes.builtin_reading && needle) {
      lines.push(line('PL-TA-137', copy.PL137.split('[builtin_reading]').join(notes.builtin_reading)));
    }
    if (!saw136 && notes.start_dial && notes.room_temp) {
      lines.push(line('PL-TA-138', copy.PL138.split('[start_dial]').join(notes.start_dial).split('[room_temp]').join(notes.room_temp)));
    }
    if (level === 'ok' || level === 'tilted') {
      const text = rules.pl139 === 'd6'
        ? 'Checked with a phone level, it looks [tilted / level].'
        : (level === 'tilted' ? copy.PL139tilted : copy.PL139level);
      lines.push(line('PL-TA-139', text));
    }
    let location = state.taLocation != null ? state.taLocation : notes.location;
    if (Array.isArray(location)) location = location.filter(Boolean).join(', ');
    location = location == null ? '' : String(location);
    const skipLoc = location === '' || location === 'clear' || location === 'unknown';
    if (!skipLoc || rules.locationClearRenders140) {
      if (!(skipLoc && !rules.locationClearRenders140)) {
        const shown = skipLoc ? (location || 'clear') : location;
        if (shown) lines.push(line('PL-TA-140', copy.PL140.split('[location]').join(shown)));
      }
    }
    if (wantLevel(level)) lines.push(line('PL-TA-102', copy.PL102));
    if (thermo === 'differ' || symptom === 'needle_stuck') lines.push(line('PL-TA-103', copy.PL103));
    if (symptom === 'high_set_overshoot' || symptom === 'overshoot_only' || symptom === 'short_cycles') lines.push(line('PL-TA-104', copy.PL104));
    lines.push(line('PL-TA-105', copy.PL105));
    if (notes.audience === 'installer') lines.push(line('PL-TA-106', copy.PL106));
    lines.push(line('PL-TA-107', copy.PL107));
    if (fan === 'fan_auto_still_wrong') lines.push(line('PL-TA-108', copy.PL108));
    lines.push(line('PL-TA-141', copy.PL141));
    if (rules.causeScript) lines.push({ id: null, text: rules.causeScript });
    if (rules.untaggedScript) lines.push({ id: null, text: rules.untaggedScript });
    return lines;
  }
  function replaceScript() {
    return [line('PL-TA-105', copy.PL105), line('PL-TA-107', copy.PL107)];
  }
  function regionOf(state) {
    const notes = notesOf(state);
    return state.taRegion || notes.region || 'unknown';
  }
  function disposalFor(state, resultId) {
    const region = regionOf(state || {});
    const lines = [line('PL-TA-121', copy.PL121)];
    const us = region === 'US' || region === 'unknown';
    const canada = region === 'Canada' || region === 'PEI' || region === 'unknown';
    const pei = region === 'PEI' || region === 'unknown';
    if (us) lines.push({ id: 'PL-TA-122', text: copy.PL122, link: { phrase: 'thermostat-recycle.org', href: TRC_HREF } });
    if (canada) lines.push(line('PL-TA-123', copy.PL123));
    if (pei) lines.push(line('PL-TA-124', copy.PL124));
    if (resultId === 'ta_replace_pro' && !rules.disposalOnReplace) return lines.filter(function (row) { return row.id !== 'PL-TA-121'; });
    return lines;
  }
  function cardExits(resultId) {
    const exits = [];
    if (!(resultId === 'ta_replace_pro' && !rules.replaceHasBroken)) {
      exits.push({ id: 'broken_bulb', label: copy.PL13, next: '@ta_mercury_broken_stop', gate: 'ta_mercury', fact: copy.PL14 });
    }
    exits.push({
      id: 'hazard_now', label: REUSE.hazard, hint: REUSE.hazardHint, fact: REUSE.hazardFact,
      next: rules.resultHazardNext, gate: 'ts_new_hazard'
    });
    return exits;
  }
  function analogOrigin(state) {
    if (!state) return false;
    if (rules.analogVariant === 'always') return true;
    if (rules.analogVariant === 'never') return false;
    return state.tsModel === 'analog' && String(state.tsOrigin || '').indexOf('ta.') === 0;
  }
  function present(state, res) {
    if (!res || !state || !enabled()) return res;
    let out = res;
    if (analogOrigin(state) && state.result === 'ts_blank_after_basics') {
      out = Object.assign({}, res, { explanation: copy.PL132 });
    } else if (analogOrigin(state) && state.result === 'ts_cold_home_urgent') {
      const actions = (res.actions || []).slice();
      actions[2] = copy.PL133;
      out = Object.assign({}, res, { actions: actions });
    }
    if (state.result === 'ta_installer_script' || state.result === 'ta_replace_pro') {
      out = Object.assign({}, out, {
        script: state.result === 'ta_replace_pro' ? replaceScript() : scriptFor(state),
        disposal: disposalFor(state, state.result),
        exits: cardExits(state.result)
      });
    }
    return out;
  }
  function showPowerNote(modelKey, opts) {
    if (!enabled()) return false;
    const state = (opts && opts.state) || {};
    const model = modelKey || state.tsModel;
    const fromTa = String(state.tsOrigin || '').indexOf('ta.') === 0;
    if (rules.powerNote === 'unknown-too') return model === 'analog' || model === 'unknown' || model == null;
    if (rules.powerNote === 'model-only') return model === 'analog';
    return model === 'analog' && fromTa;
  }
  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function decoratePanel(panel, modelKey, nodeId, opts) {
    if (!panel || nodeId !== 'ts.power.blank_screen' || !showPowerNote(modelKey, opts)) return panel;
    const note = copy.PL46;
    return Object.assign({}, panel, {
      html: '<p class="ta-power-note">' + esc(note) + '</p>' + (panel.html || ''),
      text: note + '\n' + (panel.text || ''),
      steps: [note].concat(panel.steps || [])
    });
  }

  return {
    install: install,
    enabled: enabled,
    view: view,
    route: route,
    present: present,
    decoratePanel: decoratePanel,
    scriptFor: scriptFor,
    disposalFor: disposalFor,
    copy: copy,
    reuse: REUSE,
    rules: rules,
    nodes: nodes,
    results: results
  };
});
