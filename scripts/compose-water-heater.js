'use strict';
const { CODES } = require('./wh-codes');
module.exports = function (CO) {
  const nodes = {}, results = {};
  const o = (id, label, next, fact = '', set = {}) => ({ id, label, next, fact, set, hint: '' });
  const hz = () => o('hazard_now', 'New smell, alarm, smoke, leak, steam, or another hazard', 'wh.gate.safety', 'New water-heater hazard reported.');
  const n = (id, title, body, options, gate = false) => nodes[id] = { section: 'Water heater', title, body, options: gate ? options : options.concat(hz()), diyTier: 'basic', safetyGate: gate, owner: 'wh' };
  const r = (id, title, explanation, actions, avoid, tier = 'Professional guidance', outcome = 'call_pro') => results[id] = { title, explanation, actions, avoid, tier, outcome, diyTier: outcome === 'next_step' ? 'basic' : 'pro_only', reason: id, urgency: outcome === 'emergency_exit' ? 'Act now' : '', owner: 'wh' };
  const pro = 'wh.conclude.call_pro';
  const ADV062 = 'Don’t change these. They protect your equipment and your safety, and they’re for professionals only: the relief valve itself and its pipe (lift the lever only as this step shows); the gas control, its temperature dial, the pilot and igniter buttons, the burner door, and every gas valve, including a propane tank valve; the covers over electric heating elements and thermostats (240 volts) and anything behind them; the anode rod; the drain valve, and any draining or flushing; the vent pipe, flue, and draft hood; the expansion tank and anything that changes water pressure; the water heater’s own water valves, filters, and service ports, except closing the cold water valve by hand if this step tells you to; the mixing valve; switches, installer menus, and settings resets; and breakers and GFCI outlets (look only). If a step would take you to one of these, stop. If a screen asks you to enter a password or access code, stop. That’s for installers.';
  const ADV063 = 'Don’t change these. They protect your equipment and your safety, and they’re for professionals only: the gas control knob and every position except the temperature dial marks this step shows; the pilot and igniter buttons, the burner door, and every gas valve, including a propane tank valve; the relief valve, its lever and its pipe; the anode rod; the drain valve, and any draining or flushing; the vent pipe, flue, and draft hood; the expansion tank and anything that changes water pressure; the water heater’s own water valves, filters, and service ports; the mixing valve; switches, installer menus, and settings resets; and breakers and GFCI outlets (look only). If a step would take you to one of these, stop. If a screen asks you to enter a password or access code, stop. That’s for installers.';
  const RESET_STOP = 'Reset once, only once. If it stops or shows the same code again, don’t reset it again. Repeated shutdowns mean a safety device is doing its job. Call a licensed plumber or water heater professional and tell them the code and what you saw.';
  const BEFORE_RESET = 'Before you reset, write down or photograph the code. Don’t clear the error history. Your pro needs it.';
  const REF = 'a licensed plumber or water heater professional';
  r('wh_gas_smell', 'Leave now and call from outside', 'Leave the house now and call the gas utility or 911 from outside. Gas, flammable vapors, or an unexplained strong smell near a water heater can mean immediate danger.', ['Leave the house now and call the gas utility or 911 from outside.', 'Do not use a phone, switch, thermostat, or flame inside. Do not look for the source.', 'Wait for emergency responders to say you may return.'], 'Do not operate gas controls, relight a pilot, or turn the appliance on.', 'Emergency', 'emergency_exit');
  r('wh_co_alarm', 'Get everyone outside to fresh air', 'A CO alarm or possible CO symptoms need immediate attention.', ['Leave now.', 'Call 911 or the fire department from outside.', 'Do not return until responders say you may.'], 'Do not silence the alarm and stay inside.', 'Emergency', 'emergency_exit');
  r('wh_burning_sparks', 'Leave and call 911', 'Smoke, burning, sparks, or flames outside the appliance can mean a fire.', ['Get everyone and pets outside.', 'Call 911 from outside.', 'Wait for responders before returning.'], 'Do not operate equipment or investigate the source.', 'Emergency', 'emergency_exit');
  r('wh_water_electrical', 'Stay away from water and electrical equipment', 'Water near electrical parts or previously flooded equipment must not be used.', ['Stay out of the water and away from the appliance.', 'For sparks, rising water, or immediate danger, leave and call 911 from outside.', 'Call a licensed water heater professional before any use resumes.'], 'Do not touch switches, cords, breakers, or the wet equipment.', 'Stop / professional', 'emergency_exit');
  r('wh_vent_damage', 'Stop using hot water and get help', 'Soot, exhaust fumes, scorching, or a damaged vent can indicate combustion or venting problems.', ['If there are fumes, a CO alarm, gas smell, smoke, or illness, get everyone out and call 911 from outside.', 'Keep away from the appliance and call a licensed water heater professional for urgent guidance.'], 'Do not touch vents, open covers, relight a pilot, or operate gas controls.', 'Stop / professional');
  r('wh_scald', 'Care for the burned person first', 'For a serious burn, call 911. Do not keep testing the hot water.', ['Move away from the hot water.', 'For a serious burn, call 911.', 'Arrange professional inspection before using unusually hot water again.'], 'Do not change a gas valve, mixing valve, or hidden thermostat.', 'Emergency', 'emergency_exit');
  r('wh_gate_unsure', 'Stop and get professional help', 'A hazard has not been ruled out.', ['For possible gas, fumes, CO, fire, or illness, get outside and call for emergency help.', 'Otherwise stay away and contact a licensed plumber or water heater professional.'], 'Do not approach equipment to prove an answer.', 'Stop / professional');
  n('wh.gate.safety', 'Check for water-heater hazards', 'Answer only from what you already know. Keep all covers closed and do not touch a valve or discharge pipe.', [
    o('gas_smell_or_unknown_smell', 'Gas, rotten-egg, gasoline, paint, solvent, or unexplained strong smell', '@wh_gas_smell'),
    o('co_alarm_or_symptoms', 'CO alarm, or headache, dizziness, nausea, or unusual drowsiness', '@wh_co_alarm'),
    o('burning_smoke_sparks', 'Smoke, sparks, burning, or flame outside the appliance', '@wh_burning_sparks'),
    o('fumes_backdraft', 'Exhaust fumes, soot, scorch marks, or a loose or damaged vent', '@wh_vent_damage'),
    o('water_electrical_or_flooded', 'Water near electrical parts, or equipment was flooded', '@wh_water_electrical'),
    o('hot_water_or_steam', 'Hot water or steam spraying or pouring from the heater or its relief pipe', '@hot_water_steam', 'Escaping hot water or steam reported.'),
    o('scald_injury', 'Someone has been burned by hot water', '@wh_scald'),
    o('refrigerant_alarm', 'A refrigerant leak alarm is sounding', '@leak', 'Refrigerant leak alarm reported.'),
    o('unsure', 'Not sure', '@wh_gate_unsure'),
    o('none_of_these', 'None of these', 'wh.gate.warning_signs', 'No listed immediate water-heater hazards reported.')
  ], true);
  n('wh.gate.warning_signs', 'Any leaks, ice, or unusual noise?', 'Stay back. Do not approach a leak to find its source.', [
    o('relief_valve_discharge', 'Dripping from a relief pipe', 'wh.water.shutoff', 'A drip from the relief pipe was reported.', { whLeakKind: 'relief', whLeakReported: true }),
    o('relief_spray', 'Hot water or steam spraying or pouring from the heater or its relief pipe', '@hot_water_steam', 'Spraying hot water or steam reported.'),
    o('leak_or_rust_base', 'A leak from the tank or wall unit, or water at its base', 'wh.water.shutoff', 'A leak at the tank or its base was reported.', { whLeakKind: 'tank', whLeakReported: true }),
    o('frozen_burst', 'Frozen pipes, ice, or a burst pipe', 'wh.water.shutoff', 'Frozen or burst piping was reported.', { whLeakKind: 'frozen', whLeakReported: true }),
    o('rumble_bang', 'Loud rumbling, popping, or banging', '@wh_rumble', 'Rumbling, popping, or banging reported.'),
    o('none_of_these', 'None of these', 'wh.intake.type'),
    hz()
  ], true);
  r('wh_relief_valve', 'Keep clear of the relief discharge', 'A drip needs inspection. The cause is unconfirmed.', ['Keep people away and leave the outlet unobstructed.', 'Call a licensed plumber or water heater professional now.'], 'Do not lift the lever, cap the pipe, or drain the heater while it is discharging.', 'Stop / professional');
  r('wh_tank_leak', 'Call a plumber about the leak', 'A.O. Smith says condensation on a gas tank usually clears in 1–2 hours (Use and Care 100277666, p. 23). A tank that leaks from its body can’t be patched; the tank has to be replaced.', ['Stay away from water and electrical equipment.', 'Call a licensed plumber or water heater professional promptly. Tell them whether water is spreading.'], 'Do not open covers, use the drain valve, or operate the heater’s water valves.', 'Stop / professional');
  r('wh_frozen', 'Leave frozen equipment stopped', 'Freeze damage can affect pipes and internal components even when no crack is visible.', ['Call a licensed plumber or water heater professional urgently.', 'Keep people away from leaks and electrical equipment.'], 'Do not thaw with a torch, heat gun, or boiling water, and do not restart the appliance.', 'Stop / professional');
  r('wh_rumble', 'Report the unusual noise', 'Popping or rumbling in a tank is often sediment. It’s common and not an emergency on its own. Not normal if you also see water at the base or a relief pipe that’s running.', ['Stop this check and call a licensed water heater professional if water is also present.', 'For a bang with smoke, gas, or fumes, leave and call from outside.', 'Don’t open the drain valve or try to drain or flush the tank yourself.'], 'Do not drain, flush, or reset the heater to investigate.');
  n('wh.intake.type', 'What kind of water heater is it?', 'Use an already-known model, manual, or label visible from dry ground. Do not climb or open equipment.', [
    o('tank', 'A tank — a tall cylinder', 'wh.intake.tank_kind', 'Tank water heater reported.', { whType: 'tank' }),
    o('tankless', 'A tankless wall unit', 'wh.intake.tankless_kind', 'Tankless water heater reported.', { whType: 'tankless' }),
    o('combi', 'A boiler that also makes tap hot water', 'wh.boiler.handoff', 'Combi boiler reported.', { whType: 'combi' }),
    o('maintenance', 'Maintenance and what a pro visit should include', 'wh.pm.menu', 'Maintenance check requested.'),
    o('unknown', 'Not sure', 'wh.identify.clues', 'Water heater type unconfirmed.')
  ]);
  n('wh.intake.tank_kind', 'What heats the tank?', 'Choose only what you know. A pipe or control is a clue, not proof.', [
    o('gas', 'Natural gas or propane', 'wh.tank.landing', 'Gas tank water heater reported.', { whFuel: 'gas' }),
    o('electric', 'Electric resistance', 'wh.tank.landing', 'Electric tank water heater reported.', { whFuel: 'electric' }),
    o('heat_pump', 'Heat pump or hybrid water heater', 'wh.hpwh.landing', 'Heat pump water heater reported.', { whFuel: 'electric', whType: 'hpwh' }),
    o('indirect', 'A separate boiler heats this tank', 'wh.boiler.handoff', 'Indirect tank reported.', { whType: 'indirect' }),
    o('unknown', 'Not sure', pro)
  ]);
  n('wh.intake.tankless_kind', 'Gas or electric tankless?', 'Use the exact manual or an already-visible rating label. Do not infer fuel from the absence of a visible vent.', [
    o('gas', 'Natural gas or propane', 'wh.tankless.landing', 'Gas tankless reported.', { whFuel: 'gas' }),
    o('electric', 'Electric', 'wh.tankless.landing', 'Electric tankless reported.', { whFuel: 'electric' }),
    o('unknown', 'Not sure', pro)
  ]);
  n('wh.identify.clues', 'Keep the equipment identification simple', 'An already-visible label or past invoice may say storage tank, tankless, hybrid, heat pump water heater, indirect, or combi. Do not open a cover to identify it.', [o('identified', 'I found the type in my manual or records', 'wh.intake.type'), o('unknown', 'Still not sure', pro)]);
  n('wh.hydro.cold_home', 'Is the home losing needed heat?', 'This water heater reportedly supplies a hot-water air-handler coil. Check the people and home before continuing. Do not wait for equipment observations if warmth is needed.', [
    o('cold_risk', 'Someone is at risk from the cold', '@bl_cold_exposure', 'Cold exposure reported in a water-heater-fed hydronic system.'),
    o('home_cooling', 'The home is getting colder, pipes may freeze, or I am unsure', '@bl_cold_home_urgent', 'Home losing heat, possible pipe risk, or uncertainty reported during hydronic source check.'),
    o('holding', 'The home has enough heat for now, with no one and no pipes at risk', 'wh.hydro.tap', 'Homeowner reports enough heat for now with no person or pipe risk.')
  ]);
  n('wh.hydro.observations', 'What have you already noticed at the heat source?', 'Warm tap water does not prove that hot water circulates through the air-handler coil. Use only observations from ordinary use and an already-visible display. Do not run taps as a test, touch pipes, change a temperature dial, or operate circulation controls.', [
    o('cold_risk', 'The home is now too cold or someone is at risk', '@bl_cold_home_urgent', 'Cold-home concern developed during hydronic source check.'),
    o('taps_work', 'Tap hot water works, but the air-handler heat is missing or weak', '>bl_to_fn', 'Tap hot water reportedly works; heat delivery to the air-handler coil remains unconfirmed.', { heaterOk: 'yes' }),
    o('taps_affected', 'Tap hot water is also missing or weak', '@wh_hydro_delivery_pro', 'Both tap hot water and air-handler heat reportedly missing or weak; cause unconfirmed.'),
    o('code', 'A code or message is already showing', 'wh.code.capture', 'Visible source code reported during hydronic heating concern.'),
    o('off', 'The display is blank or equipment appears off', 'wh.power.look', 'Source appears off or display blank during hydronic heating concern.'),
    o('no_air', 'Little or no air comes from the room vents; check the air side', '>bl_to_fn', 'Little or no airflow reported; water temperature and circulation unconfirmed.'),
    o('unsure', 'I’m not sure', 'sw.handoff.hydronic_both', 'Hydronic heat-source operation unconfirmed.', { heaterOk: 'unknown' })
  ]);
  r('wh_hydro_delivery_pro', 'Have the water-heater and coil connection checked', 'The guide has not confirmed water temperature or circulation through the air-handler coil. Tap hot water and room heat can behave differently.', ['Call a licensed heating professional who services water-heater-fed air handlers. Report the heater type, tap-water behavior, airflow, and visible code.', 'Ask them to check this installation’s heat-source, circulation, and coil controls. Do not adjust them yourself.', 'If the home is losing needed heat, arrange urgent service and get anyone at risk somewhere warm first.', CO], 'Do not raise the water temperature, touch pipes, operate valves, change a circulator or aquastat, or reset a control.');
  n('wh.hydro.tap', 'Does hot water come out of a sink tap right now?', 'Your heat comes from your water heater. Let’s check the water heater first, then the air handler.', [
    o('yes', 'Yes, hot water comes out of a sink tap', '>bl_to_fn', 'Tap hot water reportedly works.', { heaterOk: 'yes' }),
    o('no', 'No hot water at the tap', 'wh.intake.type', 'Tap hot water is missing while the coil needs heat.', { heaterOk: 'no' }),
    o('unsure', 'I’m not sure', 'sw.handoff.hydronic_both', 'Whether the tap has hot water is unconfirmed.', { heaterOk: 'unknown' })
  ]);
  const land = [
    o('no_hot', 'No hot water', 'wh.fixture.scope', 'No hot water reported.'),
    o('not_enough', 'Runs out or temperature varies', 'wh.fixture.scope', 'Insufficient or varying hot water reported.'),
    o('too_hot', 'Water is unexpectedly too hot', '@wh_too_hot', 'Unexpectedly hot water reported.'),
    o('code', 'A code or light is showing', 'wh.code.capture', 'Water-heater code or light reported.'),
    o('power', 'Display is blank or equipment appears off', 'wh.power.look', 'Water-heater display blank or equipment appears off.')
  ];
  n('wh.tank.landing', 'What is the hot-water problem?', 'Use observations from normal use. Do not touch water to measure its temperature.', land);
  n('wh.hpwh.landing', 'What is happening with the heat pump water heater?', 'This is a water heater, not the home’s heating heat pump. Modes, filter access, and temperature controls vary by exact model.', land.concat(o('filter', 'Filter reminder or visibly blocked air path', 'wh.hpwh.filter')));
  n('wh.tankless.landing', 'What is happening with the tankless heater?', 'Do not adjust service valves, remove a cover, or reset a code to start this check.', land.concat(o('flow', 'It warms only at some faucets or flow rates', 'wh.fixture.scope')));
  n('wh.fixture.scope', 'One fixture or the whole home?', 'Use what you have already noticed in ordinary use. Do not turn a faucet on to test for scalding water or increase the heater’s temperature.', [
    o('one', 'One shower or faucet only', '@wh_one_fixture', 'Problem reportedly limited to one fixture.'),
    o('all', 'Several or all fixtures', 'wh.usage.pattern', 'Several fixtures affected.'),
    o('unknown', 'Not sure', pro)
  ]);
  n('wh.usage.pattern', 'When does it happen?', 'Record the pattern rather than changing the heater. More than one issue can cause these symptoms.', [
    o('heavy', 'After several showers or other heavy hot-water use', '@wh_recovery', 'Problem follows heavy hot-water use.'),
    o('short', 'During short draws or very low flow', '@wh_low_flow', 'Problem reported at short draws or low flow.'),
    o('never_hot', 'Still no hot water in ordinary use on a gas tank', 'wh.tank.gas.dial', 'No hot water during ordinary use on a reported gas tank.', { whDialDir: 'up' }),
    o('cold_burst', 'A short cold burst between runs of hot water', '@wh_cold_sandwich', 'A cold burst between hot runs was reported.'),
    o('recirc', 'Long wait at the faucet, or a recirculation question', '@wh_recirc', 'Long wait or recirculation concern reported.'),
    o('always', 'Even during ordinary use, or not sure', pro, 'The pattern continues during ordinary use, or it is unconfirmed.', { whReason: 'scale' })
  ]);
  n('wh.code.capture', 'Record the whole code or light pattern', 'Write the code down exactly, or photograph it. Don’t clear it. Then we show what your maker’s manual says it means, the one owner step if there is one, and the exact reason a pro is needed. We only list codes from the maker’s own manual. If yours isn’t in our list yet, tell your pro the exact code.', [
    o('recorded', 'I recorded it', 'wh.code.brand', 'User reports recording the visible code.'),
    o('cannot', 'Cannot see it without opening something', pro)
  ]);
  n('wh.code.brand', 'Which maker is on the heater?', 'Use the name on the unit or in the manual you already have. Do not open a cover to find it.', [
    o('rinnai', 'Rinnai', 'wh.code.list', 'Rinnai reported.', { whBrand: 'rinnai', whModel: '' }),
    o('navien', 'Navien', 'wh.code.list', 'Navien reported.', { whBrand: 'navien', whModel: '' }),
    o('rheem', 'Rheem or Ruud', 'wh.code.list', 'Rheem or Ruud reported.', { whBrand: 'rheem', whModel: '' }),
    o('noritz', 'Noritz', 'wh.noritz.model', 'Noritz reported.', { whBrand: 'noritz' }),
    o('takagi', 'Takagi', 'wh.code.list', 'Takagi reported.', { whBrand: 'takagi', whModel: '' }),
    o('other', 'Another maker', '@wh_code_unlisted', 'Maker is not in this list.')
  ]);
  n('wh.noritz.model', 'Which Noritz model is it?', 'Noritz codes can mean different things on other models, so check your manual. These added codes are only for GQ-C59. The owner’s guide codes here are only for NCC199CDV.', [
    o('gq-c59', 'GQ-C59', 'wh.code.list', 'Noritz GQ-C59 reported.', { whModel: 'gq-c59' }),
    o('ncc199', 'NCC199CDV', 'wh.code.list', 'Noritz NCC199CDV reported.', { whModel: 'ncc199' }),
    o('other', 'Another Noritz model', '@wh_code_unlisted', 'Noritz model is not GQ-C59 or NCC199CDV.')
  ]);
  n('wh.code.list', 'Which code is showing?', 'We only list codes from the maker’s own manual. Pick the code exactly as it is shown.', [
    o('unlisted', 'My code isn’t in this list', '@wh_code_unlisted', 'The code is not in the maker list loaded for this model.')
  ]);
  n('wh.code.detail', 'What the manual says this code means', 'We only list codes from the maker’s own manual.', [
    o('call_pro', 'Call a licensed plumber or water heater professional', '@wh_call_pro', 'A pro is needed for this code.'),
    o('back', 'Back to the code list', 'wh.code.list', 'Returning to the code list.')
  ]);
  n('wh.power.look', 'Look at the display and power status', 'Read only a visible display or the position of a clearly labeled breaker from dry ground. Do not operate a breaker, GFCI, plug, switch, gas control, or pilot.', [
    o('trip', 'Breaker or GFCI looks tripped', '@wh_power_pro', 'Possible breaker or GFCI trip; not reset.'),
    o('pilot', 'Pilot appears out or a pilot message is showing', '@wh_pilot_pro', 'Pilot-out concern reported; not relit.', { whReason: 'gas_pilot' }),
    o('element', 'An electric tank may have a heating-element problem', pro, 'Heating element concern reported on an electric tank.', { whReason: 'element_upper' }),
    o('off', 'Display dark, switched off, or not sure', '@wh_power_pro', 'Power or display status unconfirmed.')
  ]);
  n('wh.hpwh.filter', 'Record the filter reminder and air path', 'The heat pump pulls heat from room air through this filter. A clogged filter can push the heater onto its costlier electric elements. Keep the heater’s top cover and fan enclosure closed unless your exact manual shows a tool-free filter.', [
    o('external', 'My exact manual shows an external tool-free air filter', 'wh.hpwh.filter_step'),
    o('ge_bw', 'GE GeoSpring or Bradford White AeroTherm, and the manual shows the filter step', 'wh.hpwh.filter_ge', 'GE GeoSpring or Bradford White AeroTherm filter path requested.'),
    o('aos', 'A.O. Smith', '@wh_hpwh_filter_aos', 'A.O. Smith heat pump water heater filter reminder reported.'),
    o('rheem_other', 'Rheem or another brand', '@wh_hpwh_filter_other', 'Filter reminder on a brand without a cleared filter step.'),
    o('mode', 'Check the heat pump mode', 'wh.hpwh.mode_check', 'Heat pump mode check requested.'),
    o('anode_alarm', 'An anode alarm is showing', 'wh.hpwh.anode_ask', 'Anode alarm reported.'),
    o('blocked', 'Furniture or stored items block the air path', '@wh_airpath'),
    o('unknown', 'Access needs a cover, tools, climbing, or is unclear', pro)
  ]);
  n('wh.hpwh.filter_step', 'Have you already followed your owner’s manual?', 'Answer only about work already completed. Different models require different power, stopping, and drying steps. This guide has not matched your model’s procedure. Do not remove or wash a filter, change power controls, or clear a reminder from this screen; ask your installer for the exact procedure.', [
    o('done', 'I already followed my manual and the reminder cleared', '@wh_filter_observed', 'User reports following their owner’s manual; filter reminder cleared.'),
    o('same', 'Reminder remains or hot water is still insufficient', pro),
    o('skip', 'I have not done this — I will ask a professional', pro)
  ]);
  n('wh.hpwh.filter_ge', 'Clean the GE or Bradford White filter with the power left on', 'Leave the power on. GE GeoSpring: hold FILTER to clear the reminder, as the manual describes (p. 10). Bradford White AeroTherm: follow the filter steps in the owner’s manual, page 24.', [
    o('done', 'I followed that manual step and the reminder cleared', '@wh_hpwh_filter_done', 'GE or Bradford White filter step reported complete.'),
    o('returns', 'The alert comes back within a few days', pro, 'Filter alert returned.', { whReason: 'hpwh_sealed_system' }),
    o('skip', 'I will ask a professional', pro)
  ]);
  nodes['wh.hpwh.filter_ge'].notice = 'pn-short';
  nodes['wh.hpwh.filter_ge'].step = {
    what: 'It clears the filter reminder the way the GE or Bradford White manual describes, with the power left on.',
    caution: 'Leave the power on. Do not open the fan enclosure.',
    source: 'GE GeoSpring owner’s manual, p. 10. Bradford White AeroTherm, p. 24.',
    steps: ['Leave the power on.', 'On a GE GeoSpring, hold FILTER to clear the reminder, as your manual describes (p. 10).', 'On a Bradford White AeroTherm, follow the filter steps in your manual, page 24. Leave the power on.'],
    watch: 'The filter reminder clears.',
    stop: 'If the alert returns within a few days, stop. Refrigerant work needs a certified technician by law.',
    undo: 'Stop and call ' + REF + '.',
    locked: ''
  };
  n('wh.hpwh.mode_check', 'Was Electric set on purpose?', 'Did a technician set it to Electric on purpose? A.O. Smith lists 45 °F (7 °C) room air as where its models switch to electric.', [
    o('yes', 'Yes, a technician set Electric on purpose', pro, 'Electric mode was set on purpose.', { whReason: 'hpwh_sealed_system' }),
    o('no', 'No', 'wh.hpwh.mode_step', 'Electric was not set on purpose.'),
    o('unsure', 'I’m not sure', pro, 'Whether Electric was set on purpose is unconfirmed.', { whReason: 'hpwh_sealed_system' })
  ]);
  n('wh.hpwh.mode_step', 'Set the mode your manual shows', 'Use the MODE button your manual shows. If Hybrid is set, the room is warm enough, and the filter is clean but the heat pump still doesn’t run, the fault is in the sealed refrigerant system or compressor.', [
    o('set', 'I set the mode my manual shows', '@wh_hpwh_mode_set', 'Heat pump water heater mode set from the manual.'),
    o('still', 'Hybrid is set, the room is warm, the filter is clean, and it still doesn’t run', pro, 'Heat pump still does not run.', { whReason: 'hpwh_sealed_system' })
  ]);
  nodes['wh.hpwh.mode_step'].notice = 'pn-short';
  nodes['wh.hpwh.mode_step'].step = {
    what: 'It selects the operating mode the owner’s manual shows on the normal display.',
    caution: 'Do not enter an installer menu. Do not cycle a breaker.',
    source: 'A.O. Smith Use and Care, pp. 20–21, lists 45 °F (7 °C) room air as where its models switch to electric.',
    steps: ['Use the MODE control your manual shows.', 'Leave it on the mode the manual recommends for the room you have.'],
    watch: 'The display shows the mode you selected.',
    stop: 'If Hybrid is set, the room is warm enough, and the filter is clean but the heat pump still doesn’t run, stop and call ' + REF + '.',
    undo: 'Set the mode back to what you wrote down, or call ' + REF + '.',
    locked: ''
  };
  n('wh.hpwh.anode_ask', 'Has the anode been serviced since this light came on?', 'Has the anode rod been serviced or replaced since this light came on?', [
    o('yes', 'Yes', 'wh.hpwh.anode_reset', 'Anode serviced or replaced since the light came on.', { whAnodeServiced: true }),
    o('no', 'No', pro, 'Anode has not been serviced since the light came on.'),
    o('unsure', 'I’m not sure', pro, 'Anode service since the light came on is unconfirmed.')
  ]);
  n('wh.hpwh.anode_reset', 'Clear the anode alarm only after service', 'Press and hold Anode Reset for 10 seconds, as your manual describes.', [
    o('done', 'I held Anode Reset for 10 seconds', '@wh_anode_reset_done', 'Anode Reset held after reported service.'),
    o('skip', 'Stop and call a professional', pro)
  ]);
  nodes['wh.hpwh.anode_reset'].notice = 'pn-short';
  nodes['wh.hpwh.anode_reset'].step = {
    what: 'It clears the anode alarm after the rod has been serviced or replaced.',
    caution: 'Do this only after the anode has been serviced or replaced. Do not clear the light only to silence it.',
    source: 'GE GeoSpring Owner’s Manual, p. 6, checked October 15, 2026.',
    steps: ['Press and hold Anode Reset for 10 seconds, as your manual describes.'],
    watch: 'The anode alarm clears.',
    stop: 'If the light returns, call ' + REF + '.',
    undo: 'Leave the light and call ' + REF + '.',
    locked: ''
  };
  n('wh.boiler.handoff', 'Check the boiler side next', 'A combi boiler or indirect tank uses the boiler as its heat source. Neither the boiler nor heat delivery to the taps or an air-handler coil has been confirmed. The boiler check begins with its full hazard screen.', [
    o('cold', 'The home also has no heat and someone is at risk', '@bl_cold_exposure'),
    o('continue', 'Continue to the boiler hazard check', 'bl.gate.safety', 'Water-heater concern handed to boiler; both sides unconfirmed.', { whBoilerHandoff: true }),
    o('pro', 'Stop and call a professional', pro)
  ]);
  n(pro, 'Call a licensed plumber or water heater professional', 'The cause is unconfirmed. The next checks need equipment-specific inspection. Your note will preserve observations and unknowns.', [
    o('call', 'Show my service note', '@wh_call_pro'),
    o('diy', 'I wanted a repair step', '@wh_call_pro', 'Homeowner asked for a repair step.')
  ]);
  n('wh.water.shutoff', 'Close the main house water shutoff', 'If water is near outlets, cords, the heater’s controls or the panel, stay out of it and call 911 or your utility. If water is spreading and you already know where your main water shutoff is, close it by hand (no tools, not in standing water; street/meter-pit valves belong to the water utility). Then call a licensed plumber or water heater professional.', [
    o('closed', 'I closed the main house shutoff by hand', '@wh_main_shutoff_closed', 'Main house water shutoff closed by hand.'),
    o('cannot', 'I can’t reach it by hand', '@wh_tank_leak', 'Main shutoff could not be closed by hand.')
  ]);
  nodes['wh.water.shutoff'].notice = 'pn-short';
  nodes['wh.water.shutoff'].step = {
    what: 'It closes the main house water shutoff so less water can leave the heater.',
    caution: 'Don’t use tools, and don’t reach into standing water. Street and meter-pit valves belong to the water utility.',
    source: 'Main house shutoff, not the water heater’s own valves.',
    steps: ['Close the main house water shutoff by hand if you already know where it is.'],
    watch: 'Water at the leak slows or stops.',
    stop: 'If water is near electrical parts, stay out and call 911 or your utility.',
    undo: 'Leave the valve closed. ' + REF.charAt(0).toUpperCase() + REF.slice(1) + ' can reopen it after the leak is fixed.',
    locked: ''
  };
  n('wh.tank.gas.dial', 'Turn only the temperature dial', 'It changes the water temperature setting on the gas control’s temperature dial. A gas tank heats to the dial mark, not to a number on a screen. One mark changes the water by roughly 5–10 °F on Rheem’s chart (p. 19), so small moves matter. Bradford White and other brands: this step is not shown.', [
    o('set', 'I turned only the temperature dial', '@wh_dial_set', 'Temperature dial moved one mark.'),
    o('wrong', 'The dial is right and the water is still too hot', pro, 'Water still too hot after the dial move.', { whReason: 'gas_control' }),
    o('not_this', 'This is not a gas tank, or it also heats the home', pro)
  ]);
  nodes['wh.tank.gas.dial'].notice = 'pn-full';
  nodes['wh.tank.gas.dial'].step = {
    what: 'It changes the water temperature setting on the gas control’s temperature dial.',
    caution: 'Hotter water can scald quickly, especially young children and older adults. If you turn it up, check the water at a tap before anyone uses it.',
    source: 'Rheem/Ruud gas FVIR Use and Care, pp. 18–19: Low about 91 °F, Hot about 125 °F, A about 130 °F, B about 140 °F, C about 150 °F, Very Hot about 155 °F. A serious burn can take more than 5 minutes at 120 °F, about 30 seconds at 130 °F, and less than 5 seconds at 140 °F. A.O. Smith 100277666, pp. 21–22: dial 55–155 °F; permanent burns in 5 seconds at 140 °F. GE 49-6000245, pp. 5 and 8: HOT = 120 °F; about 30 seconds at 130 °F, less than 5 seconds at 140 °F.',
    steps: ['Write down where the dial points now.', 'Turn only the temperature dial, by hand, to a lower mark / one mark higher, as your manual shows. Don’t push in or turn the gas control knob, and don’t press the pilot or igniter button.', 'Wait for the water to heat, then check it at a tap before anyone uses it.'],
    watch: 'Water at a tap after it has had time to heat.',
    stop: 'A blinking code or the heater stops: turn the dial back to your note. Gas smell: leave the house now and call the gas utility or 911 from outside. Still wrong: call a licensed plumber or water heater professional.',
    undo: 'Turn the dial back to the mark you wrote down, or call ' + REF + '.',
    locked: ADV063
  };
  n('wh.tank.tp_ask', 'Does your manual say to lift the lever?', 'Does your owner’s manual tell you to lift the relief valve lever? If your manual tells you to test the relief valve, we’ll walk you through it. If it doesn’t, leave the valve alone.', [
    o('yes', 'Yes, my manual says to lift the lever', 'wh.tank.tp_test', 'Owner’s manual tells the owner to lift the relief lever.'),
    o('no', 'No, or I’m not sure', pro, 'Manual does not say to lift the relief lever, or it is unconfirmed.')
  ]);
  n('wh.tank.tp_test', 'Lift the relief lever only as the manual shows', 'The relief valve is the tank’s last protection against too much heat or pressure. Makers ask owners to check that it moves, usually once a year. Verified-manual list: GE gas p. 10; GE GeoSpring p. 9; Rheem gas FVIR p. 20; Rheem ProTerra p. 23; A.O. Smith gas 100277666 p. 24; A.O. Smith HPWH 100277324 p. 29; Bradford White AeroTherm p. 22.', [
    o('opened', 'It opened and closed', '@wh_tp_test_ok', 'Relief lever opened and closed.'),
    o('stuck', 'It sticks or water keeps running', pro, 'Relief valve sticks or will not reseat.', { whReason: 'tp_stuck' })
  ]);
  nodes['wh.tank.tp_test'].notice = 'pn-full';
  nodes['wh.tank.tp_test'].step = {
    what: 'It checks that the relief lever moves and reseats, only when the owner’s manual says to.',
    caution: 'Only if the discharge pipe runs to a drain or a bucket below its end. Stand clear. The water that comes out is hot and can burn.',
    source: 'Owner’s manual lever test. GE gas p. 10; GE GeoSpring p. 9; Rheem gas FVIR p. 20; Rheem ProTerra p. 23; A.O. Smith gas 100277666 p. 24; A.O. Smith HPWH 100277324 p. 29; Bradford White AeroTherm p. 22.',
    steps: ['Lift the lever only as your manual describes, then let it snap back.', 'If water keeps running after you let go, don’t force the lever. Close the cold water valve to the heater if you can reach it by hand, and call a licensed plumber or water heater professional.'],
    watch: 'Water comes out and then stops after the lever snaps back.',
    stop: 'If water keeps running after you let go, don’t force the lever. Close the cold water valve to the heater if you can reach it by hand, and call a licensed plumber or water heater professional.',
    undo: 'Leave the lever snapped back. If water is running, close the cold water valve by hand and call ' + REF + '.',
    locked: ADV062
  };
  n('wh.tankless.vent_clear', 'Clear the outside vent by hand', 'Work from the ground only. Use a hand or a soft broom. Don’t reach into the pipe, don’t remove caps, and don’t chip or melt ice. Stop if the vent is damaged, loose, iced over, or out of reach, or if you smell exhaust. Remove any blockage. (Air intake requires 12 in. [30 cm] of clearance.)', [
    o('cleared', 'The outside opening is clear', '@wh_vent_cleared', 'Outside vent opening cleared by hand from the ground.'),
    o('stays', 'The vent is clear and the code or outage stays', pro, 'Code or outage remains after the outside vent was cleared.', { whReason: 'gas_vent' })
  ]);
  nodes['wh.tankless.vent_clear'].notice = 'pn-short';
  nodes['wh.tankless.vent_clear'].step = {
    what: 'It clears loose snow or debris at the outside vent opening, from the ground.',
    caution: 'Don’t reach into the pipe, don’t remove caps, and don’t chip or melt ice.',
    source: 'Remove any blockage. (Air intake requires 12 in. [30 cm] of clearance.)',
    steps: ['From the ground, clear loose snow or debris by hand or with a soft broom.', 'Leave caps in place. Do not chip or melt ice.'],
    watch: 'The outside opening is clear of loose debris.',
    stop: 'Stop if the vent is damaged, loose, iced, or out of reach, or if you smell exhaust. Leave the house now and call the gas utility or 911 from outside if you smell gas.',
    undo: 'Stop and call ' + REF + '.',
    locked: ''
  };
  n('wh.tankless.flow_check', 'Open the hot tap more', 'Tankless heaters start heating only above a minimum flow. Open the hot tap all the way for a minute, then try another faucet. Makers’ minimum flows: Navien at least 0.5 gal/min (NPE-2 manual, p. 15); Noritz NCC199CDV starts at 0.5 GPM and can keep running down to 0.29 GPM (Owner’s Guide, pp. 39, 46); Stiebel Eltron 0.37–0.77 gal/min by model (p. 15); EcoSmart ECO 27 about 0.3 gal/min (p. 9); Rheem P1: increase water flow from the fixtures (RTGH Use & Care, p. 75). Checked October 15, 2026. Check your unit’s manual.', [
    o('helped', 'Hot water came back at a higher flow', '@wh_min_flow_explained', 'Higher hot-water flow restored heat.'),
    o('all_weak', 'Every faucet is still weak', pro, 'Every faucet is weak.', { whReason: 'scale' })
  ]);
  nodes['wh.tankless.flow_check'].notice = 'pn-short';
  nodes['wh.tankless.flow_check'].step = {
    what: 'It raises the hot-water flow the heater can sense.',
    caution: 'Don’t raise the setting above what your household can use without scalding.',
    source: 'Makers’ minimum flows, checked October 15, 2026. Navien NPE-2 p. 15; Noritz NCC199CDV Owner’s Guide pp. 39, 46; Stiebel Eltron p. 15; EcoSmart ECO 27 p. 9; Rheem RTGH Use and Care p. 75.',
    steps: ['Open the hot tap more. Use the hot side only — a mixing valve set toward cold drops the hot flow the heater sees. On a Noritz, the Owner’s Guide (p. 39) discusses temperature swings and lists a temperature band that uses more hot water and less cold mix; check that page for the figure it shows, and feel the water at a tap before anyone uses it. Don’t raise the setting above what your household can use without scalding.'],
    watch: 'Hot water returns at that faucet.',
    stop: 'If every faucet is weak, stop. If every faucet is weak, the problem is upstream: a clogged inlet filter, scale in the heater or a supply valve. Those need the water shut off and parts opened.',
    undo: 'Set the tap back to how you use it.',
    locked: ''
  };
  n('wh.tankless.reset_once', 'One front-panel Reset', BEFORE_RESET + ' Press Reset on the front panel once.', [
    o('done', 'I pressed Reset once', '@wh_tankless_reset_ok', 'Front-panel Reset pressed once.', { reset_count: 1 }),
    o('again', 'The same code came back', pro, 'The same code returned after one reset.', { whReason: 'tankless_code_repeat', reset_count: 1 })
  ]);
  nodes['wh.tankless.reset_once'].notice = 'pn-reset';
  nodes['wh.tankless.reset_once'].step = {
    what: 'It sends one front-panel Reset.',
    caution: BEFORE_RESET,
    source: 'From Navien NPE-2 Installation and Operation Manual, section 3.4, page 9, checked October 11, 2026.',
    steps: ['Press Reset on the front panel once.'],
    watch: 'The code clears and hot water returns.',
    stop: RESET_STOP,
    undo: 'Do not reset it again. Call ' + REF + ' and tell them the code and what you saw.',
    locked: ''
  };
  n('wh.tankless.reset_rheem_ask', 'Is the cord, plug, and outlet dry?', 'Is the heater plugged into an outlet with a cord, and are the cord, plug and outlet dry and undamaged, with no water on the floor near the outlet?', [
    o('freeze', 'It is freezing weather, or freeze protection needs power', pro, 'Unplug step not shown because freeze protection needs power.'),
    o('yes', 'Yes, the cord, plug, and outlet are dry and undamaged', 'wh.tankless.reset_rheem', 'Cord, plug, and outlet reported dry and undamaged.'),
    o('no', 'No, or I’m not sure', pro, 'Cord, plug, or outlet is wet, damaged, or unconfirmed.')
  ]);
  n('wh.tankless.reset_rheem', 'Unplug once, about 30 seconds', BEFORE_RESET + ' Unplug the cord for about 30 seconds, then plug it back in.', [
    o('done', 'I unplugged it for about 30 seconds and plugged it back in', '@wh_tankless_reset_ok', 'Cord unplugged about 30 seconds and plugged back in once.', { reset_count: 1 }),
    o('again', 'The same code came back', pro, 'The same code returned after one unplug.', { whReason: 'tankless_code_repeat', reset_count: 1 })
  ]);
  nodes['wh.tankless.reset_rheem'].notice = 'pn-reset';
  nodes['wh.tankless.reset_rheem'].step = {
    what: 'It removes power for about 30 seconds on a cord-and-plug heater whose manual describes that step.',
    caution: BEFORE_RESET,
    source: 'From Rheem RTGH Use and Care, page 74.',
    steps: ['Unplug the cord for about 30 seconds, then plug it back in.'],
    watch: 'The code clears.',
    stop: RESET_STOP,
    undo: 'Do not unplug it again. Call ' + REF + ' and tell them the code and what you saw.',
    locked: ''
  };
  n('wh.tankless.reset_noritz', 'One remote power restart for code 11', BEFORE_RESET + ' Look at the gas valve. Don’t turn it. This restart is only for code 11 on an NCC199CDV.', [
    o('done', 'I turned it off at the remote, opened a hot tap, and turned it back on', '@wh_tankless_reset_ok', 'Noritz remote power restart done once for code 11.', { reset_count: 1 }),
    o('again', 'The same code came back', pro, 'The same code returned after one Noritz restart.', { whReason: 'tankless_code_repeat', reset_count: 1 })
  ]);
  nodes['wh.tankless.reset_noritz'].notice = 'pn-reset';
  nodes['wh.tankless.reset_noritz'].step = {
    what: 'It restarts the heater once from the remote, only for code 11 on an NCC199CDV.',
    caution: 'Look at the gas valve. Don’t turn it. Never restart from a breaker.',
    source: 'From Noritz NCC199CDV Owner’s Guide, page 42, checked October 15, 2026.',
    steps: ['Look at the gas valve. Don’t turn it.', 'Press the power button on the remote to turn the heater off.', 'Open a hot water tap.', 'Turn the heater back on.'],
    watch: 'The code clears and the heater lights.',
    stop: RESET_STOP,
    undo: 'Do not restart it again. Call ' + REF + ' and tell them the code and what you saw.',
    locked: ''
  };
  const HARDNESS = 'Your water’s hardness changes how often some heaters need care, but the schedule comes from your owner’s manual, not from a hardness label alone. On city water, look up your utility’s yearly water quality report (often called a Consumer Confidence Report) and find “hardness.” It may be in grains per gallon (gpg) or in ppm or mg/L. On a well, or if the report doesn’t list it, use a hardness test strip from a hardware store, following the package directions. Soft, moderately hard, hard, and very hard are plain-language categories from the U.S. Geological Survey for describing water (TRADE). They are not a service schedule. If you have a water softener, some manuals ask for more frequent anode checks — follow your owner’s manual. For flush, descale, and anode timing, follow your owner’s manual.';
  const FLUSH = 'Sediment settles at the bottom of a tank, more so with hard water. Your manual asks for a yearly flush. We don’t guide this one: it means draining very hot water through a valve that can clog open, and on gas or electric tanks it means shutting off and restoring the heat source. Book a plumber to flush the tank.';
  const FLUSH_WHY = 'Draining means hot water through a valve that sediment can jam open, and refilling before power or gas comes back. An electric element powered in an empty tank burns out, and a gas tank needs relighting. Those are plumber steps.';
  const ANODE = 'The anode rod is a metal rod that slowly wears away so the tank metal doesn’t. Your manual says how often to have it checked (for some models, every year). Checking it means taking it out of the tank, so we leave it to a plumber. Ask them how much core wire is showing. Your manual lists when it should be replaced. If a heat pump water heater shows an anode alarm, call a licensed plumber or water heater professional. Clearing that alarm is only for after the anode has been serviced or replaced, as your manual describes — otherwise leave it and call.';
  const ANODE_WHY = 'The rod is screwed tightly into the top of the tank and often seized. Removing it needs the gas or power and the water off, part of the tank drained, and a heavy wrench. Forcing it can damage the tank. A tank left without one rusts out faster.';
  const DESCALE = 'Hard water leaves scale inside a tankless heater. When your heater shows a service code for this, or your manual says it’s time, book a descale. The heater needs service valves on its water lines for this. If yours has none, a plumber can add them.';
  const DESCALE_WHY = 'Descaling means closing and opening four valves in the right order and pumping a cleaning solution through the heater. A wrong valve sends the solution into your pipes or hot water at the heater. The maker calls it a complicated procedure.';
  const INLET = 'Your tankless heater has a small screen where cold water comes in. If it clogs, you may get less hot water or an error code. Cleaning it means draining the heater, so book it with your descale.';
  const INLET_WHY = 'The filter sits in the water line under pressure. Reaching it means shutting the water off and draining the heater. A pinched or missing seal leaks when the water comes back on.';
  const PRO_VISIT = 'A water heater service visit should list what was done. For a tank: flush, anode checked against your manual’s replacement rule, relief valve checked, and for gas, the burner, venting and gas connections. For tankless: descale, inlet filter, venting, and the error history read (not cleared). For a heat pump model: filter, condensate drain and the system checked for alerts. Ask for the results in writing.';
  n('wh.pm.menu', 'Maintenance from your manual', 'Most water heater care is set by your owner’s manual. Here is what it asks for, what you can do yourself, and exactly why the rest is a plumber’s job. Pick a time you’ll remember. Your manual sets how often. Warranty note: Your warranty may require professional maintenance or product registration. Check your warranty and your owner’s manual before you do a task yourself. Some makers require service records or work by a licensed pro. When in doubt, ask your installer or the maker. Following a checklist here does not keep, protect, or extend a warranty.', [
    o('look', 'Look around', 'wh.pm.lookaround', 'Look-around requested.'),
    o('tp', 'Relief valve, if my manual says to test it', 'wh.tank.tp_ask', 'Relief lever test requested from maintenance.'),
    o('hardness', 'How to find water hardness', '@wh_pm_hardness', 'Water hardness lookup requested.'),
    o('flush', 'Tank flush', '@wh_pm_flush', 'Tank flush requested.', { whReason: 'tank_leak' }),
    o('anode', 'Anode rod', '@wh_pm_anode', 'Anode check requested.'),
    o('descale', 'Tankless descale', '@wh_pm_descale', 'Descale requested.', { whReason: 'scale' }),
    o('inlet', 'Tankless inlet screen', '@wh_pm_inlet', 'Inlet screen requested.', { whReason: 'scale' }),
    o('filter', 'Heat pump water heater filter', 'wh.hpwh.filter', 'Heat pump filter maintenance requested.'),
    o('visit', 'What a pro service visit should include', '@wh_pm_visit', 'Pro visit list requested.'),
    o('back', 'Back to the water heater type', 'wh.intake.type', 'Leaving the maintenance menu.')
  ]);
  n('wh.pm.lookaround', 'Look without touching', 'Once in a while, look without touching: water on the floor or in the pan, drips from the relief pipe’s end, rust at the fittings or top of the tank, or new popping sounds. Outside, check that vents aren’t blocked. If you smell gas, leave the house now and call the gas utility or 911 from outside. If you see any of the other signs, start a guided check.', [
    o('gas', 'I smell gas', '@wh_gas_smell', 'Gas smell reported during look-around.'),
    o('drip', 'The relief pipe is dripping', 'wh.water.shutoff', 'Relief pipe drip seen during look-around.', { whLeakKind: 'relief', whLeakReported: true }),
    o('spray', 'Hot water or steam is spraying', '@hot_water_steam', 'Spraying hot water or steam seen during look-around.'),
    o('leak', 'Water is on the floor or at the base', 'wh.water.shutoff', 'Water at the base seen during look-around.', { whLeakKind: 'tank', whLeakReported: true }),
    o('rumble', 'New popping or rumbling', '@wh_rumble', 'New popping or rumbling reported.'),
    o('none', 'None of these', 'wh.pm.menu', 'Look-around found none of the listed signs.')
  ]);
  const avoid = 'Do not open covers, work on gas or wiring, adjust appliance valves, drain or flush, or reset a breaker or safety control.';
  for (const [id, title, exp, acts, tier, outcome] of [
    ['wh_too_hot', 'Stop using unexpectedly hot water', 'There is a scalding risk. A displayed setting does not prove the temperature at the tap. Rheem’s chart shows about 30 seconds at 130 °F and less than 5 seconds at 140 °F (p. 18).', ['Keep people away from the hot water and call a licensed plumber or water heater professional.', 'If anyone is burned, care for them first. For a serious burn, call 911.'], 'Stop / professional', 'call_pro'],
    ['wh_one_fixture', 'Report the affected fixture', 'A problem at one fixture can involve its mixing control or plumbing. This does not confirm the water heater works.', ['Tell a plumber which fixtures are affected and whether the issue is recent.']],
    ['wh_recovery', 'Record demand and recovery', 'A tank reheats from cold after heavy use. Check again after the recovery time your manual lists, or later the same day.', ['Use the recovery information in your exact owner’s manual.', 'If the problem occurs under ordinary demand, contact a professional. Do not raise temperature as a workaround.']],
    ['wh_low_flow', 'Record the short-draw or low-flow pattern', 'Some tankless heaters require a minimum flow, but the threshold depends on the exact model. This symptom alone does not confirm a flow fault.', ['Tell a professional which fixtures and draw lengths are affected.', 'Do not remove flow restrictors, change service valves, or raise temperature to test it.']],
    ['wh_recirc', 'Record the delay and recirculation settings', 'Pipe distance, demand, and recirculation setup can affect the wait. The cause has not been confirmed.', ['Photograph the normal user display and record when the delay happens.', 'Use the exact manual or installer for recirculation and mode changes; do not enter installer menus.']],
    ['wh_code_pro', 'Give the professional the full code', 'A code needs the exact model and control context.', ['Share the full code, model, timing, and any already-observed leak or noise.', 'Do not reset it just to see whether it returns.']],
    ['wh_code_unlisted', 'Tell your pro the exact code', 'We only list codes from the maker’s own manual. Yours isn’t in our list yet. Tell your pro the exact code.', ['Tell your pro the exact code.', 'Don’t clear it.']],
    ['wh_power_pro', 'Leave power controls as they are', 'A dark display or possible trip needs professional investigation.', ['Call a licensed water heater professional or electrician. Report whether a breaker or GFCI appeared tripped.']],
    ['wh_pilot_pro', 'Have the pilot problem checked', 'An extinguished pilot needs an equipment-specific inspection. Gas parts need a gas-qualified pro and leak testing.', ['Call the gas utility or a licensed water heater professional.', 'If a smell appears, leave the house now and call the gas utility or 911 from outside. Do not relight it.']],
    ['wh_airpath', 'Keep the water heater’s air path clear', 'Heat pump water heaters need the air volume and clearance specified for the installation.', ['Move ordinary stored objects only if you can do so without going near a hazard. Follow the clearance in the exact manual.', 'Do not remove the top cover, duct the unit, or change installation openings.']],
    ['wh_filter_observed', 'Record the cleared filter reminder', 'You reported the reminder clearing after following your manual. This does not prove heating performance is restored.', ['If hot water remains insufficient or the reminder returns, contact a professional.']],
    ['wh_hpwh_filter_done', 'Filter reminder cleared', 'The heat pump pulls heat from room air through this filter. A clogged filter can push the heater onto its costlier electric elements.', ['If the alert returns within a few days, call a licensed plumber or water heater professional. Refrigerant work needs a certified technician by law.'], 'Owner step', 'next_step'],
    ['wh_hpwh_filter_aos', 'Call about the A.O. Smith filter', 'A.O. Smith’s manual starts this job at the breaker. This guide does not cycle breakers. Call a licensed plumber or water heater professional.', ['Call a licensed plumber or water heater professional.']],
    ['wh_hpwh_filter_other', 'Call about this filter', 'This model’s filter steps are not in this guide. Call a licensed plumber or water heater professional.', ['Call a licensed plumber or water heater professional.']],
    ['wh_hpwh_mode_set', 'Mode set', 'A.O. Smith lists 45 °F (7 °C) room air as where its models switch to electric.', ['If Hybrid is set, the room is warm enough, and the filter is clean but the heat pump still doesn’t run, the fault is in the sealed refrigerant system or compressor. Call a licensed plumber or water heater professional.'], 'Owner step', 'next_step'],
    ['wh_anode_reset_done', 'Anode alarm cleared after service', 'Press and hold Anode Reset for 10 seconds, as your manual describes. That step is only for after the anode has been serviced or replaced.', ['If the light returns, call a licensed plumber or water heater professional.'], 'Owner step', 'next_step'],
    ['wh_dial_set', 'Temperature dial set', 'Temperature dial set. Check the water at a tap again later today. If it’s still too hot or not hot enough, call a licensed plumber or water heater professional. If the dial is right and the water still runs too hot, the gas control’s thermostat may be failing. That part sits inside the gas control, which is gas work.', ['Check the water at a tap again later today.'], 'Owner step', 'next_step'],
    ['wh_tp_test_ok', 'The valve opened and closed', 'The valve opened and closed. Your manual lists how often to repeat this. If the pipe starts dripping later, call a licensed plumber or water heater professional.', ['Leave the lever snapped back.', 'If the pipe starts dripping later, call a licensed plumber or water heater professional.'], 'Owner step', 'next_step'],
    ['wh_vent_cleared', 'Vent cleared', 'Vent cleared. If hot water hasn’t come back within an hour, call a licensed plumber or water heater professional. If the vent is clear and the code or outage stays, the blockage or fault is inside the vent or the heater. Opening either risks exhaust (carbon monoxide) in the house.', ['If hot water hasn’t come back within an hour, call a licensed plumber or water heater professional.'], 'Owner step', 'next_step'],
    ['wh_main_shutoff_closed', 'Main shutoff closed', 'You’ve limited the water. Leave the valve closed and call a licensed plumber or water heater professional.', ['Leave the valve closed and call a licensed plumber or water heater professional.'], 'Owner step', 'next_step'],
    ['wh_min_flow_explained', 'Minimum flow', 'Tankless heaters start heating only above a minimum flow. Makers’ minimum flows: Navien at least 0.5 gal/min (NPE-2 manual, p. 15); Noritz NCC199CDV starts at 0.5 GPM and can keep running down to 0.29 GPM (Owner’s Guide, pp. 39, 46). If every faucet is weak, the problem is upstream: a clogged inlet filter, scale in the heater or a supply valve. Those need the water shut off and parts opened.', ['Open the hot tap more. Use the hot side only — a mixing valve set toward cold drops the hot flow the heater sees. On a Noritz, the Owner’s Guide (p. 39) discusses temperature swings and lists a temperature band that uses more hot water and less cold mix; check that page for the figure it shows, and feel the water at a tap before anyone uses it. Don’t raise the setting above what your household can use without scalding.'], 'Owner step', 'next_step'],
    ['wh_cold_sandwich', 'A short cold burst can be normal', 'Between back-to-back showers, leave a short gap or keep the hot tap running steadily instead of turning it off and on. If you have a recirculation pump, check that its schedule covers your shower times. Removing the burst for good means adding a small buffer tank or recirculation, which is plumbing work.', ['Between back-to-back showers, leave a short gap or keep the hot tap running steadily instead of turning it off and on. If you have a recirculation pump, check that its schedule covers your shower times.'], 'Owner step', 'next_step'],
    ['wh_tankless_reset_ok', 'One reset sent', 'Reset once, only once. If it stops or shows the same code again, don’t reset it again. Repeated shutdowns mean a safety device is doing its job. Call a licensed plumber or water heater professional and tell them the code and what you saw.', ['If the same code comes back, don’t reset it again. Call a licensed plumber or water heater professional and tell them the code and what you saw.'], 'Owner step', 'next_step'],
    ['wh_pm_hardness', 'Find your water hardness', HARDNESS, ['Follow your owner’s manual for flush, descale, and anode timing.'], 'Owner step', 'next_step'],
    ['wh_pm_flush', 'Book a tank flush', FLUSH, [FLUSH_WHY], FLUSH_WHY],
    ['wh_pm_anode', 'Book an anode check', ANODE, [ANODE_WHY], ANODE_WHY],
    ['wh_pm_descale', 'Book a descale', DESCALE, [DESCALE_WHY], DESCALE_WHY],
    ['wh_pm_inlet', 'Book the inlet screen with the descale', INLET, [INLET_WHY], INLET_WHY],
    ['wh_pm_visit', 'What a pro service visit should include', PRO_VISIT, ['Ask for the results in writing.']],
    ['wh_call_pro', 'Prepare for a water-heater service call', 'The cause has not been confirmed.', ['Tell the professional the heater type, exact model if already known, affected fixtures, timing, and any visible code.', 'New smell, CO alarm, smoke, steam, or water near electrical parts takes priority; use Stop / get help.']]
  ]) r(id, title, exp, acts, avoid, tier === 'Stop / professional' ? 'Stop / professional' : (outcome === 'next_step' ? 'Owner step' : 'Professional guidance'), outcome || 'call_pro');
  return { nodes, results, codes: CODES };
};
