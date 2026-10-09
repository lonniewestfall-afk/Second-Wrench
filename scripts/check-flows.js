/* Local sanity for AC Wave-2 and HP Wave-1. No network. */
'use strict';
globalThis.SW_CONFIG = { advancedRepairsEnabled: false };
const fs = require('fs');
const path = require('path');
const F = require('../assets/flow.js');
const configText = fs.readFileSync(path.join(__dirname, '../assets/config.js'), 'utf8');
const indexText = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const appText = fs.readFileSync(path.join(__dirname, '../assets/app.js'), 'utf8');
let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', msg);
  }
}
function walk(lane, choices, mode) {
  const state = F.create('', mode || 'test');
  const steps = choices.slice();
  if (lane === 'ac' || lane === 'hp') {
    const at = steps.indexOf('agree_18_terms');
    if (at < 0) throw new Error('walk missing consent before system type');
    steps.splice(at + 1, 0, lane === 'hp' ? 'heat_pump' : 'cooling_only_ac');
  }
  steps.forEach(choice => {
    if (state.result) throw new Error('Ended early at ' + state.result + ' before ' + choice + ' path=' + state.answers.map(a => a.node + ':' + a.choice).join('|'));
    F.answer(state, choice, { agreed: true, termsVersion: 'beta-2026-09-13' });
  });
  return state;
}
const CAP_NODES = [
  'ac.cool.conclude.call_pro_capacitor_contactor',
  'ac.adv.cap.prereq_gate_cluster',
  'ac.adv.cap.confirm_pattern',
  'ac.adv.cap.lockout_verify',
  'ac.adv.cap.access_compartment',
  'ac.adv.cap.identify_label',
  'ac.adv.cap.discharge',
  'ac.adv.cap.replace_like_for_like',
  'ac.adv.cap.reassemble_restore_test'
];
function visited(state) {
  return state.answers.map(a => a.node).concat(state.node ? [state.node] : []);
}
function assertNoCap(state, msg) {
  CAP_NODES.forEach(id => assert(visited(state).indexOf(id) === -1, msg + ' reached ' + id));
  assert(state.result !== 'suspected_capacitor_contactor_advanced_off' && state.result !== 'next_step_advanced', msg + ' capacitor result ' + state.result);
}
const gate = ['none_of_these', 'agree_18_terms'];

assert(/advancedRepairsEnabled:\s*false/.test(configText), 'public advanced flag must stay false');
assert(/contentVersion:\s*'2026-10-09\.1'/.test(configText), 'content version must be 2026-10-09.1');
assert(indexText.includes('config.js?v=2026-10-09.1') && indexText.includes('flow.js?v=2026-10-09.1') && indexText.includes('app.js?v=2026-10-09.1'), 'script cache-bust must match content version');
assert(F.treeVersion === 'ac.cool.v0', 'AC tree version');
assert(F.treeVersionHp === 'hp.air_source.v1', 'HP tree version');

const ac = F.create('seed', 'real');
assert(ac.node === 'ac.gate.cluster_entry' && ac.product === 'ask' && !ac.treeVersion, 'every session starts at the safety gate before system type');
let blocked = false;
try { F.answer(F.create(), 'cooling_only_ac', { agreed: true, termsVersion: 'beta-2026-09-13' }); }
catch (err) { blocked = /Choose an answer/.test(err.message); }
assert(blocked, 'system type is not reachable before the safety gate');

const homeStart = appText.slice(appText.indexOf('function home'), appText.indexOf('function sidebar'));
assert((homeStart.match(/data-action="start"/g) || []).length === 1, 'home has one Start');
assert(!homeStart.includes('data-product'), 'home Start does not fork product');
assert(!/Check central AC|Check a heat pump|test-hp/.test(homeStart), 'home has no dual primary CTAs');

const consent = F.nodes['ac.session.consent'];
const agree = consent.options.find(o => o.id === 'agree_18_terms');
assert(agree.next === 'ac.cool.intake.system_confirm', 'consent node next stays AC');
assert(/18 or older/.test(agree.hint) && /beta terms/.test(consent.body), 'consent text intact');

const acCool = walk('ac', gate.concat(['split_central_cool_only', 'landing_not_cooling', 'mode_cool_setpoint_ok', 'filter_clean_ok']));
assert(acCool.node === 'ac.cool.outdoor.fan_spinning', 'AC clean filter not-cooling still goes to outdoor fan, got ' + acCool.node);

const acWeak = walk('ac', gate.concat(['split_central_cool_only', 'landing_weak_airflow', 'filter_clean_ok']));
assert(acWeak.node === 'ac.cool.airflow.returns_supplies', 'AC weak airflow still goes to returns');
const acWeakDone = walk('ac', gate.concat(['split_central_cool_only', 'landing_weak_airflow', 'filter_clean_ok', 'blocked_cleared_airflow_improved']));
assert(acWeakDone.result === 'returns_supplies_cleared', 'AC returns success stays Basic next_step');
assert(F.results[acWeakDone.result].outcome === 'next_step', 'AC returns outcome');

const acNoise = walk('ac', gate.concat(['split_central_cool_only', 'landing_unusual_noise', 'noise_no_hazard_symptoms']));
assert(acNoise.node === 'ac.noise.clarify_outdoor_hum', 'AC clear noise still clarifies outdoor hum');

const acHum = walk('ac', gate.concat(['split_central_cool_only', 'landing_will_not_start', 'outdoor_hum_no_fan', 'want_diy_capacitor_anyway']));
assert(acHum.result === 'suspected_capacitor_contactor_advanced_off', 'AC hum with Advanced off stays call_pro');
assert(F.results[acHum.result].outcome === 'call_pro', 'AC cap conclude outcome');

const acIce = walk('ac', gate.concat(['split_central_cool_only', 'landing_water_or_ice', 'water_clear_no_electrical_risk', 'want_keep_running_despite_ice']));
assert(acIce.result === 'ice_keep_running' && F.results.ice_keep_running.outcome === 'emergency_exit', 'AC ice keep-running still emergency');

const acView = F.viewNode('ac.cool.filter.check', F.create('', 'test', 'ac'));
assert(!acView.options.some(o => o.id === 'filter_clean_weak_airflow'), 'AC filter UI hides HP weak-airflow choice');

const afterConsent = walk('ask', gate);
assert(afterConsent.node === 'sw.intake.system_type', 'every start reaches system type only after gate and consent, got ' + afterConsent.node);
assert(afterConsent.answers.map(a => a.node).join('|') === 'ac.gate.cluster_entry|ac.session.consent', 'gate and consent are the only answers before system type');
assert(afterConsent.product === 'ask', 'product stays open on the system-type screen');

const hpIntake = walk('hp', gate);
assert(hpIntake.node === 'hp.intake.system_confirm', 'Heat pump choice reaches hp.intake.system_confirm, got ' + hpIntake.node);
assert(hpIntake.treeVersion === 'hp.air_source.v1' && hpIntake.product === 'hp', 'HP tree after system type');
assert(hpIntake.answers[0].node === 'ac.gate.cluster_entry' && hpIntake.answers[1].node === 'ac.session.consent' && hpIntake.answers[2].node === 'sw.intake.system_type', 'HP start order is gate, consent, system type');

const noHeat = walk('hp', gate.concat([
  'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off',
  'band_mild_warm', 'no_heat_at_all', 'outdoor_not_running_when_should',
  'breaker_on_confirmed', 'disconnect_appears_on'
]));
assert(noHeat.result === 'hp_outdoor_not_running_wave1', 'outdoor silent ends hp_outdoor_not_running_wave1, got ' + noHeat.result);
assert(!noHeat.answers.some(a => a.node === 'ac.cool.conclude.call_pro_capacitor_contactor' || String(a.node).indexOf('ac.adv.cap.') === 0), 'no cap conclude on HP outdoor path');
assert(F.results[noHeat.result].outcome === 'call_pro', 'outdoor silent is call_pro');

const noise = walk('hp', gate.concat(['air_source_ducted_hp', 'landing_unusual_noise', 'noise_no_hazard_symptoms']));
assert(noise.result === 'unusual_noise_hp_wave1', 'HP clear noise is call_pro unusual_noise_hp_wave1, got ' + noise.result);
assert(!noise.answers.some(a => a.node === 'ac.noise.clarify_outdoor_hum'), 'HP noise does not enter outdoor hum clarify');

const noiseHazard = walk('hp', gate.concat(['air_source_ducted_hp', 'landing_unusual_noise', 'noise_burning_sparks_smoke']));
assert(noiseHazard.result === 'noise_burning_sparks_smoke' && F.results[noiseHazard.result].outcome === 'emergency_exit', 'HP noise hazard stays emergency');

// ---- Ice keep-running split (hp.air_source.v1) ----
const ICE_ROUTER = 'hp.ice.mode_location';
const flat = n => (n && typeof n === 'object') ? Object.keys(n).reduce((a, k) => a.concat(flat(n[k])), []) : [n];
const iceWalk = (band, routerChoice, landing) => walk('hp', gate.concat([
  'air_source_ducted_hp', landing || 'landing_ice_outdoor', 'mode_matches_complaint', 'emergency_already_off',
  band, 'want_keep_running_despite_ice'].concat(routerChoice ? [routerChoice] : [])));

// I1 inbound edge: defrost keep-running now enters the router; gate kept; hint no longer says Off
const dkr = F.nodes['hp.defrost.sanity'].options.find(o => o.id === 'want_keep_running_despite_ice');
assert(dkr.next === ICE_ROUTER && dkr.gate === 'ice_keep_running', 'I1 defrost keep-running -> router with ice_keep_running gate');
assert(!/Turn the system Off/.test(dkr.hint), 'I1 defrost keep-running hint must not say Off');
// I2 router shape
const rt = F.nodes[ICE_ROUTER] || { options: [] };
assert(!!F.nodes[ICE_ROUTER] && F.hpWave1.indexOf(ICE_ROUTER) !== -1, 'I2 router exists and is in hpWave1');
assert(rt.safetyGate === true && rt.diyTier === 'pro_only', 'I2 router safetyGate true, pro_only');
assert(rt.options.map(o => o.id).join('|') === 'ice_heat_outdoor|ice_heat_indoor_only|ice_cool_any|ice_mode_unsure_outdoor|ice_unsure', 'I2 router choice ids');
assert(rt.options.length === 5 && rt.options.every(o => flat(o.next).every(t => typeof t === 'string' && t.charAt(0) === '@')), 'I2 every router edge is a terminal');
assert(rt.options.every(o => !o.gate), 'I2 router choices do not re-fire a gate');
// I3 the old HP ice test, rewritten: keep-running stops at the router, not a result
const atRouter = iceWalk('band_near_freezing');
assert(atRouter.node === ICE_ROUTER && !atRouter.result, 'I3 HP keep-running reaches the router, got ' + (atRouter.result || atRouter.node));
const ev = atRouter.audit.map(a => a.event);
assert(ev.filter(e => e === 'gate_fired:ice_keep_running').length === 1 && ev.indexOf('node_entered:' + ICE_ROUTER) !== -1, 'I3 gate fires once, then router entered');
// I4 routing table: every router choice (cold band) + unsure-outdoor across all four bands + other landings
[
  ['band_near_freezing', 'ice_heat_outdoor', 'hp_ice_heat_outdoor'],
  ['band_near_freezing', 'ice_heat_indoor_only', 'ice_keep_running'],
  ['band_near_freezing', 'ice_cool_any', 'ice_keep_running'],
  ['band_near_freezing', 'ice_mode_unsure_outdoor', 'hp_ice_heat_outdoor'],
  ['band_near_freezing', 'ice_unsure', 'ice_keep_running'],
  ['band_well_below', 'ice_mode_unsure_outdoor', 'hp_ice_heat_outdoor'],
  ['band_mild_warm', 'ice_mode_unsure_outdoor', 'ice_keep_running'],
  ['not_sure_ambient', 'ice_mode_unsure_outdoor', 'ice_keep_running'],
  ['band_mild_warm', 'ice_heat_outdoor', 'hp_ice_heat_outdoor']
].forEach(([band, choice, want]) => {
  let s; try { s = iceWalk(band, choice); } catch (e) { s = { result: 'THREW: ' + e.message.slice(0, 60) }; }
  assert(s.result === want, 'I4 ' + band + '/' + choice + ' -> ' + want + ', got ' + s.result);
  assert(F.results[s.result] && F.results[s.result].outcome === 'emergency_exit', 'I4 ' + choice + ' outcome emergency_exit');
});
const safeIce = (b, c, l) => { try { return iceWalk(b, c, l).result; } catch (e) { return 'THREW'; } };
['landing_no_heat', 'landing_no_cool', 'landing_both_modes_fail'].forEach(l => {
  assert(safeIce('band_well_below', 'ice_heat_outdoor', l) === 'hp_ice_heat_outdoor', 'I4 ' + l + ' heat/outdoor -> HEAT');
  assert(safeIce('band_well_below', 'ice_unsure', l) === 'ice_keep_running', 'I4 ' + l + ' unsure -> COOL');
});
// I5 both screens: outcome, reason, tier
assert(F.results.ice_keep_running.outcome === 'emergency_exit' && F.results.ice_keep_running.reason === 'ice_keep_running' && F.results.ice_keep_running.tier === 'Stop / professional', 'I5 COOL emergency_exit / ice_keep_running');
assert(!!F.results.hp_ice_heat_outdoor && F.results.hp_ice_heat_outdoor.outcome === 'emergency_exit' && F.results.hp_ice_heat_outdoor.reason === 'hp_ice_heat_outdoor' && F.results.hp_ice_heat_outdoor.tier === 'Stop / professional', 'I5 HEAT emergency_exit / hp_ice_heat_outdoor');
// I6 copy guards
const H = F.results.hp_ice_heat_outdoor || { actions: [], avoid: '' }, C = F.results.ice_keep_running;
assert(/Emergency or Aux Heat/.test(H.actions[0] || '') && /Higher bills are OK/.test(H.actions[0]), 'I6 HEAT action 1 Em/Aux + Higher bills are OK');
assert(H.actions.some(a => /water dripping indoors\? Turn the system Off/i.test(a)), 'I6 HEAT indoor-water cross-check to Off');
assert(H.actions.some(a => /carbon monoxide/.test(a) && /generator indoors/.test(a)), 'I6 HEAT CO line');
assert(H.actions.some(a => /Never touch the coil or grille/.test(a)), 'I6 HEAT coil/grille line');
assert(/chip/.test(H.avoid) && /hot water/.test(H.avoid) && /hose/.test(H.avoid), 'I6 HEAT avoid: chip, hot water, hose');
assert(C.actions[0] === 'Set the system to Off at the thermostat.' && C.actions.some(a => /Emergency or Aux Heat/.test(a)), 'I6 COOL Off first + cold-weather line');
const db = F.nodes['hp.defrost.sanity'].body;
assert(/That can damage the system\./.test(db) && !/water damage/.test(db) && /solid block/.test(db), 'I6 defrost body: mode-neutral damage line + frost/block cue');
// I7 AC lane unchanged and never enters the HP router
assert(acIce.result === 'ice_keep_running' && acIce.answers.every(a => a.node !== ICE_ROUTER), 'I7 AC ice stays on ice_keep_running');
// I8 none of the five 6.5 places tells a cold-band heat user to go Off without the Em/Aux clause first
const OFF_INSTR = /(set the thermostat|turn the system|turn it|Thermostat) Off/;
const emBeforeOff = t => { const m = t.match(OFF_INSTR); if (!m) return true; const e = t.indexOf('Emergency or Aux Heat'); return e !== -1 && e < m.index; };
[
  ['hp_defrost_valve_ob_control', F.results.hp_defrost_valve_ob_control.actions.join(' ')],
  ['hp.conclude body', F.nodes['hp.conclude.call_pro_defrost_valve_control'].body],
  ['hp_defrost_recovered_ok', F.results.hp_defrost_recovered_ok.actions.join(' ')],
  ['hp_defrost_not_sure', F.results.hp_defrost_not_sure.actions.join(' ')],
  ['hp_weak_heat_deep_cold', F.results.hp_weak_heat_deep_cold.actions.join(' ')]
].forEach(([id, text]) => assert(emBeforeOff(text), 'I8 ' + id + ' says Off without the Em/Aux clause first'));
['hp_defrost_recovered_ok', 'hp_defrost_not_sure'].forEach(id =>
  assert(/Otherwise, or if there is no warm air in 15 minutes, turn the system Off/.test(F.results[id].actions.join(' ')), 'I8 ' + id + ' still gives warm-weather users Off'));
// I8b walked: a well-below-freezing heat user reaching each result sees Em/Aux before Off (presentResult = what renders)
[
  ['iced_solid_no_recover', 'ack_call_pro', 'hp_defrost_valve_ob_control'],
  ['not_sure', null, 'hp_defrost_not_sure'],
  ['looks_like_defrost_then_recover', null, 'hp_defrost_recovered_ok'],
  ['defrost_recovered_complaint_remains', 'weak_but_some_heat', 'hp_weak_heat_deep_cold']
].forEach(([dc, next, want]) => {
  const s = walk('hp', gate.concat(['air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off', 'band_well_below', dc].concat(next ? [next] : [])));
  assert(s.result === want, 'I8b cold heat walk ' + dc + ' -> ' + want + ', got ' + s.result);
  assert(emBeforeOff(F.presentResult(s).actions.join(' ')), 'I8b ' + want + ' rendered copy says Off before Em/Aux');
});

const shortCycle = walk('hp', gate.concat([
  'air_source_ducted_hp', 'landing_short_cycle', 'mode_matches_complaint', 'emergency_already_off'
]));
assert(shortCycle.result === 'hp_short_cycle_after_mode_basics', 'short cycle after Emergency clear, got ' + shortCycle.result);
assert(!shortCycle.answers.some(a => a.node === 'hp.ambient.outdoor_band'), 'short cycle does not enter ambient');

const handback = walk('hp', gate.concat([
  'air_source_ducted_hp', 'landing_no_cool', 'mode_matches_complaint', 'emergency_already_off',
  'band_mild_warm', 'leaving_air_matches_mode', 'proceed_ac_filter', 'filter_clean_ok'
]));
assert(handback.result === 'hp_basics_clear_after_filter', 'clean filter without weak airflow is call_pro, got ' + handback.result + ' node ' + handback.node);
assert(!handback.answers.some(a => a.node === 'ac.cool.outdoor.fan_spinning' || a.node === 'ac.cool.outdoor.debris_clearance' || a.node === 'ac.cool.indoor.ice_lines_coil'), 'HP handback never enters fan/debris/ice');

const weak = walk('hp', gate.concat([
  'air_source_ducted_hp', 'landing_both_modes_fail', 'mode_matches_complaint', 'emergency_already_off',
  'band_mild_warm', 'leaving_air_matches_mode', 'proceed_ac_filter', 'filter_clean_weak_airflow',
  'blocked_cleared_still_weak'
]));
assert(weak.answers.some(a => a.node === 'ac.cool.airflow.returns_supplies'), 'weak airflow visits returns');
assert(weak.result === 'hp_basics_clear_after_filter', 'returns then hp_basics_clear, got ' + weak.result);

const deepCold = walk('hp', gate.concat([
  'air_source_ducted_hp', 'landing_no_heat', 'mode_wrong_for_complaint'
]));
assert(deepCold.result === 'hp_mode_wrong_basic' && F.results[deepCold.result].diyTier === 'basic', 'wrong mode is Basic next_step');

const weakDeep = walk('hp', gate.concat([
  'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off',
  'band_well_below', 'looks_like_defrost_then_recover'
]));
assert(weakDeep.result === 'hp_defrost_recovered_ok', 'recovered defrost with problem gone is Basic');

const weakRemains = walk('hp', gate.concat([
  'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off',
  'band_well_below', 'defrost_recovered_complaint_remains', 'weak_but_some_heat'
]));
assert(weakRemains.result === 'hp_weak_heat_deep_cold', 'deep-cold weak heat is Basic expectation, got ' + weakRemains.result);

const mildWeak = walk('hp', gate.concat([
  'air_source_ducted_hp', 'landing_no_heat', 'mode_auto', 'forced_problem_remains', 'emergency_already_off',
  'band_mild_warm', 'weak_but_some_heat'
]));
assert(mildWeak.node === 'hp.observe.leaving_air_vs_mode', 'mild weak heat continues to observe, got ' + mildWeak.node + ' ' + mildWeak.result);

const valve = walk('hp', gate.concat([
  'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off',
  'band_mild_warm', 'no_heat_at_all', 'mode_asymmetric_feel', 'asymmetric_pattern_confirmed', 'want_diy_valve_or_electrical_anyway'
]));
assert(valve.result === 'hp_defrost_valve_ob_control', 'valve DIY request stays call_pro, got ' + valve.result);
assert(F.results[valve.result].outcome === 'call_pro', 'valve outcome');
assert(F.results[valve.result].diyTier !== 'advanced', 'valve result is not Advanced');

const gauges = walk('hp', gate.concat([
  'air_source_ducted_hp', 'landing_no_cool', 'mode_matches_complaint', 'emergency_already_off',
  'band_mild_warm', 'mode_asymmetric_feel', 'recent_tstat_swap_ob_unsure', 'want_diy_refrigerant_anyway'
]));
assert(gauges.result === 'hp_refrigerant_intent' && F.results[gauges.result].outcome === 'call_pro', 'refrigerant intent is call_pro');

const loop2 = F.create('', 'test');
['none_of_these', 'agree_18_terms', 'heat_pump', 'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off', 'band_near_freezing', 'not_cold_or_not_applicable', 'no_heat_at_all', 'still_in_defrost_or_weird'].forEach(c => F.answer(loop2, c, { agreed: true, termsVersion: 'beta-2026-09-13' }));
assert(loop2.node === 'hp.defrost.sanity', 'first defrost loop returns to defrost, got ' + loop2.node);
F.answer(loop2, 'not_sure', { agreed: true, termsVersion: 'beta-2026-09-13' });
/* not_sure on defrost is insufficient. Use a path that returns to observe. */
const loop3 = F.create('', 'test');
['none_of_these', 'agree_18_terms', 'heat_pump', 'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off', 'band_mild_warm', 'no_heat_at_all', 'still_in_defrost_or_weird', 'not_cold_or_not_applicable', 'no_heat_at_all', 'still_in_defrost_or_weird'].forEach(c => F.answer(loop3, c, { agreed: true, termsVersion: 'beta-2026-09-13' }));
assert(loop3.node === 'hp.conclude.call_pro_defrost_valve_control', 'second defrost loop goes to conclude, got ' + loop3.node + ' ' + loop3.result);

const fromAc = walk('ac', gate.concat(['heat_pump']));
assert(fromAc.node === 'hp.intake.system_confirm' && fromAc.product === 'hp' && fromAc.treeVersion === 'hp.air_source.v1', 'AC intake heat pump choice enters HP tree');

const blank = walk('hp', gate.concat(['air_source_ducted_hp', 'landing_no_heat', 'tstat_blank_or_unreadable']));
assert(blank.node === 'ac.tstat.blank.batteries', 'blank tstat soft-links batteries');

const keepEmergency = walk('hp', gate.concat(['air_source_ducted_hp', 'landing_no_heat', 'mode_emergency_or_aux', 'keeping_emergency_on_purpose']));
assert(keepEmergency.node === 'hp.handback.ac_filter_airflow', 'keeping Emergency goes to handback');

const hpFilterView = walk('hp', gate.concat([
  'air_source_ducted_hp', 'landing_no_cool', 'mode_matches_complaint', 'emergency_already_off',
  'band_mild_warm', 'leaving_air_matches_mode', 'proceed_ac_filter'
]));
const shown = F.viewNode(hpFilterView.node, hpFilterView);
assert(shown.options.some(o => o.id === 'filter_clean_weak_airflow'), 'HP handback filter shows weak-airflow choice');

const coolingOnly = walk('ask', gate.concat(['cooling_only_ac', 'split_central_cool_only', 'landing_unusual_noise', 'noise_no_hazard_symptoms']));
assert(coolingOnly.product === 'ac' && coolingOnly.treeVersion === 'ac.cool.v0', 'cooling-only stamps the AC tree');
assert(coolingOnly.node === 'ac.noise.clarify_outdoor_hum', 'cooling-only still reaches outdoor-hum clarify, got ' + coolingOnly.node);
assert(coolingOnly.answers[2].choice === 'cooling_only_ac' && coolingOnly.answers[2].node === 'sw.intake.system_type', 'cooling-only is chosen on the system-type screen');

const hpSilent = walk('ask', gate.concat([
  'heat_pump', 'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off',
  'band_mild_warm', 'no_heat_at_all', 'outdoor_not_running_when_should',
  'breaker_on_confirmed', 'disconnect_appears_on'
]));
assert(hpSilent.result === 'hp_outdoor_not_running_wave1', 'heat pump outdoor-silent still ends call_pro, got ' + hpSilent.result);
assertNoCap(hpSilent, 'HP path');

function identify(winter, em, heat) {
  const choices = gate.concat(['not_sure', winter]);
  if (winter !== 'winter_outdoor_runs') {
    choices.push(em);
    if (em !== 'has_em_aux') choices.push(heat);
  }
  return walk('ask', choices);
}
const clearlyAc = identify('winter_outdoor_never', 'no_em_aux', 'separate_furnace_boiler');
assert(clearlyAc.product === 'ac' && clearlyAc.node === 'ac.cool.intake.system_confirm', 'strict cooling-only triad enters the AC tree, got ' + clearlyAc.product + ' ' + clearlyAc.node);
assert(clearlyAc.answers.filter(a => a.node.indexOf('sw.identify.') === 0).length === 3, 'identify stays within three questions');
const acFromIdentify = walk('ask', gate.concat([
  'not_sure', 'winter_outdoor_never', 'no_em_aux', 'separate_furnace_boiler',
  'split_central_cool_only', 'landing_unusual_noise', 'noise_no_hazard_symptoms'
]));
assert(acFromIdentify.node === 'ac.noise.clarify_outdoor_hum', 'identified cooling-only still clarifies outdoor hum');

['winter_outdoor_runs', 'winter_outdoor_never', 'winter_outdoor_unsure'].forEach(winter => {
  ['has_em_aux', 'no_em_aux', 'em_aux_unsure'].forEach(em => {
    ['separate_furnace_boiler', 'label_says_heat_pump', 'heat_source_unsure'].forEach(heat => {
      if (winter === 'winter_outdoor_runs' && (em !== 'has_em_aux' || heat !== 'separate_furnace_boiler')) return;
      if (winter !== 'winter_outdoor_runs' && em === 'has_em_aux' && heat !== 'separate_furnace_boiler') return;
      const state = identify(winter, em, heat);
      const strictAc = winter === 'winter_outdoor_never' && em === 'no_em_aux' && heat === 'separate_furnace_boiler';
      if (strictAc) {
        assert(state.product === 'ac' && state.node === 'ac.cool.intake.system_confirm', 'strict triad ' + winter);
        return;
      }
      assert(state.product === 'hp' && state.node === 'hp.intake.system_confirm' && state.treeVersion === 'hp.air_source.v1', 'identify ' + [winter, em, heat].join('/') + ' got ' + state.product + ' ' + state.node);
      assertNoCap(state, 'not-sure ' + [winter, em, heat].join('/'));
      assert(state.answers.filter(a => a.node.indexOf('sw.identify.') === 0).length <= 3, 'identify asked more than three questions');
    });
  });
});

const unsureSilent = walk('ask', gate.concat([
  'not_sure', 'winter_outdoor_unsure', 'em_aux_unsure', 'heat_source_unsure',
  'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off',
  'band_mild_warm', 'no_heat_at_all', 'outdoor_not_running_when_should',
  'breaker_on_confirmed', 'disconnect_appears_on'
]));
assert(unsureSilent.product === 'hp' && unsureSilent.result === 'hp_outdoor_not_running_wave1', 'still-unsure outdoor silent is the HP call_pro, got ' + unsureSilent.result);
assertNoCap(unsureSilent, 'still-unsure path');
assert(!unsureSilent.answers.some(a => a.node === 'ac.noise.clarify_outdoor_hum' || a.node === 'ac.cool.outdoor.fan_spinning'), 'still-unsure does not enter AC outdoor checks');

assert(!JSON.stringify(F.nodes).includes('2W'), 'no 2W brand');
const joined = JSON.stringify(F.hpWave1.map(id => F.nodes[id]));
assert(!/replace the capacitor/i.test(joined), 'HP nodes do not instruct capacitor replacement');

assert(/termsVersion:\s*'public-beta-2026-10-08'/.test(configText), 'termsVersion is public-beta-2026-10-08');
assert(/advancedRepairsEnabled:\s*false/.test(configText) && !/advancedRepairsEnabled:\s*true/.test(configText), 'public advanced flag must stay false');
assert(appText.includes("'/terms'") && appText.includes("'/privacy'"), 'terms and privacy routes exist');
const termsRoute = appText.slice(appText.indexOf("'/terms':"), appText.indexOf("'/privacy':"));
const privacyRoute = appText.slice(appText.indexOf("'/privacy':"), appText.indexOf("'/disclosures':"));
const termsHtml = appText.slice(appText.indexOf('const TERMS_HTML'), appText.indexOf('const PUBLIC_BETA_NOTICE'));
const noticeHtml = appText.slice(appText.indexOf('const PUBLIC_BETA_NOTICE'), appText.indexOf('const PRIVACY_HTML'));
const privacyHtml = appText.slice(appText.indexOf('const PRIVACY_HTML'), appText.indexOf('function publicBetaNotice'));
const visible = html => html.replace(/<[^>]+>/g, '');
assert(termsRoute.includes('TERMS_HTML') && termsRoute.includes('publicBetaNotice'), 'terms route renders the terms body and beta notice');
assert(privacyRoute.includes('PRIVACY_HTML'), 'privacy route renders the privacy body');
assert(/not a licensed HVAC/i.test(visible(noticeHtml)), 'terms page says not a licensed HVAC');
assert(termsHtml.includes('Advanced DIY repair procedures are OFF'), 'terms page says Advanced DIY repair procedures are OFF');
assert(visible(privacyHtml).includes('We do not sell your feedback'), 'privacy page says we do not sell your feedback');
assert(termsHtml.includes('been reviewed or approved by an attorney') && termsRoute.includes('Not attorney-reviewed'), 'terms status says not attorney-reviewed');
assert(privacyHtml.includes('attorney-reviewed or approved') && privacyRoute.includes('Not attorney-reviewed'), 'privacy status says not attorney-reviewed');
assert(!/DRAFT FOR COUNSEL|attorney-approved|lawyer-reviewed/i.test(appText), 'pages do not claim attorney approval');
assert(/let termsChecked = false/.test(appText), 'start checkbox state begins unchecked');
assert(/id="agree" type="checkbox"'\+\(termsChecked\?' checked':''\)/.test(appText), 'checkbox checked attribute is off until the user checks it');
assert(/id="continue-consent"'\+\(termsChecked\?'':' disabled'\)/.test(appText), 'continue stays disabled until the checkbox is checked');
assert(/if\(selected\.disabled\)return;/.test(appText), 'a disabled continue control cannot submit');
assert(/agreeing&&!accepted/.test(appText), 'agree cannot continue while the checkbox is unchecked');
assert(/agreed:\s*agreeing&&accepted/.test(appText), 'the acceptance flag follows the checkbox');
assert(/termsVersion:\s*C\.termsVersion/.test(appText), 'the session records the configured terms version');
assert((appText.match(/F\.answer\(/g) || []).length === 1, 'the UI has one answer path');
assert(!/agreed:\s*true/.test(appText), 'the UI never hard-codes acceptance');
assert(!/localStorage|sessionStorage/.test(appText), 'acceptance is not written to browser storage');
const feedbackFn = appText.slice(appText.indexOf('function feedbackData'), appText.indexOf('function feedbackText'));
assert(!/feedbackConsent|feedback-consent/.test(feedbackFn), 'optional feedback consent is not added to the payload');
assert(/id="feedback-consent" type="checkbox"'\+\(feedbackConsent\?' checked':''\)/.test(appText), 'feedback consent starts unchecked');
assert(appText.includes('Free beta · Informational only · Not a licensed HVAC tech · Not a diagnosis'), 'home/start line');
assert(appText.includes('General guidance only. Not a diagnosis. Call a licensed HVAC pro for repair.'), 'result footer line');
assert(appText.includes('Get to safety. Call 911 if there is fire, smoke, or immediate danger. This site is not an emergency service.'), 'emergency result line');
assert(appText.includes('Advanced repair steps are not enabled. Call a licensed HVAC professional.'), 'advanced-off line');
assert(appText.includes('Optional. Do not include passwords, serial photos you shouldn’t share, or medical details.'), 'feedback warning');
assert(appText.includes('Optional: I agree Second Wrench may use my feedback to improve the product, including in anonymized form.'), 'feedback consent line');
assert(indexText.includes('href="#/terms"') && indexText.includes('href="#/privacy"'), 'every app page footer links to Terms and Privacy');

const gas = F.create();
F.answer(gas, 'hazard_gas_co');
assert(gas.result === 'gas' && gas.consent === false && gas.termsVersion == null && gas.consentAt == null, 'gas hazard exits without acceptance');
assert(F.results.gas.outcome === 'emergency_exit', 'gas hazard is an emergency exit');
const viaStop = F.create();
F.answer(viaStop, 'none_of_these');
assert(viaStop.node === 'ac.session.consent' && viaStop.consent === false, 'the safety gate does not imply acceptance');
F.stop(viaStop);
assert(viaStop.node === 'ac.gate.cluster_entry' && viaStop.consent === false, 'stop returns to the hazard gate without acceptance');
F.answer(viaStop, 'hazard_smoke_fire_sparks_burn');
assert(viaStop.result === 'fire' && viaStop.consent === false && viaStop.termsVersion == null, 'stop/get help reaches a hazard result without acceptance');
let blockedAgree = false;
try {
  const s = F.create();
  F.answer(s, 'none_of_these');
  F.answer(s, 'agree_18_terms', { agreed: false, termsVersion: 'public-beta-2026-10-08' });
} catch (err) { blockedAgree = /accept the beta terms/.test(err.message); }
assert(blockedAgree, 'the engine rejects continue without the checkbox');
let blockedVersion = false;
try {
  const s = F.create();
  F.answer(s, 'none_of_these');
  F.answer(s, 'agree_18_terms', { agreed: true, termsVersion: '' });
} catch (err) { blockedVersion = /accept the beta terms/.test(err.message); }
assert(blockedVersion, 'the engine rejects continue without a terms version');
let skippedConsent = false;
try {
  const s = F.create();
  F.answer(s, 'none_of_these');
  s.node = 'sw.intake.system_type';
  F.answer(s, 'cooling_only_ac', { agreed: true, termsVersion: 'public-beta-2026-10-08' });
} catch (err) { skippedConsent = /Safety and consent are required/.test(err.message); }
assert(skippedConsent, 'troubleshooting cannot skip the consent gate');
const accepted = F.create();
F.answer(accepted, 'none_of_these');
F.answer(accepted, 'agree_18_terms', { agreed: true, termsVersion: 'public-beta-2026-10-08' });
assert(accepted.consent === true && accepted.termsVersion === 'public-beta-2026-10-08' && /^\d{4}-\d{2}-\d{2}T/.test(accepted.consentAt), 'the session stores the terms version and acceptance time');

assert(indexText.includes('Second Wrench free public beta:'), 'meta description says free public beta');
assert(indexText.includes('Free public beta. A better next step. · Not an emergency service'), 'beta bar says free public beta and not an emergency service');
assert(!/<div class="beta-bar">[^<]*<span>/.test(indexText), 'the emergency clause is not hidden inside a beta-bar span');
assert(appText.includes('Free public beta. Try it on your own system and tell us what was clear or confusing.'), 'home note invites anyone to try the beta');
assert(appText.includes('Second Wrench · Free public beta'), 'content pages say free public beta');
assert(!appText.includes('Second Wrench · Private beta'), 'content pages do not say private beta');
assert(appText.includes('Emergency / hazard help never requires this checkbox.'), 'terms section 3 says hazard help does not require the checkbox');
const runtimeBan = [
  [/private beta/i, 'private beta'],
  [/\binvited\b/i, 'invited'],
  [/\binvite\b/i, 'invite'],
  [/\binvitation\b/i, 'invitation'],
  [/small circle/i, 'small circle'],
  [/\btesters?\b/i, 'tester'],
  [/small beta/i, 'small beta']
];
['index.html', '404.html', 'thanks.html'].concat(fs.readdirSync(path.join(__dirname, '../assets')).filter(name => name.endsWith('.js')).map(name => 'assets/' + name)).forEach(rel => {
  const text = rel === 'index.html' ? indexText : rel === 'assets/app.js' ? appText : fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  runtimeBan.forEach(([pattern, label]) => assert(!pattern.test(text), rel + ' still says ' + label));
  if (rel === '404.html' || rel === 'thanks.html') assert(text.includes('Second Wrench · Free public beta'), rel + ' eyebrow says free public beta');
});
const changeLog = fs.readFileSync(path.join(__dirname, '../docs/ac-second-opinion/legal/disclaimer-change-log.md'), 'utf8');
function changeRow(id) { return changeLog.split('\n').find(line => line.startsWith('| ' + id + ' |')); }
const d007 = changeRow('D-007');
const d010 = changeRow('D-010');
assert(d007 && d007.includes('Operator-authored beta Terms published; no attorney review yet.'), 'D-007 uses the neutral published wording');
assert(d007 && !/afford|Donnie|Leon/i.test(d007), 'D-007 has no internal business detail');
assert(d010 && d010.includes('Follow-up note only') && !/afford|Donnie|Leon/i.test(d010), 'D-010 has no internal business detail');

const EMERGENCY_LINE = 'Get to safety. Call 911 if there is fire, smoke, or immediate danger. This site is not an emergency service.';
const HAZARDS = [
  ['hazard_gas_co', 'Get everyone to fresh air.'],
  ['hazard_smoke_fire_sparks_burn', 'Stop. Treat smoke, sparks, or burning as a hazard.'],
  ['hazard_water_electrical', 'Do not touch wet or damaged electrical equipment.'],
  ['hazard_heat_illness', 'Help the person before the AC.'],
  ['hazard_refrigerant_alarm', 'Do not reset a refrigerant-leak alarm.'],
  ['hazard_unsure', 'Uncertainty is a good reason to stop.']
];
const TERMS_BODY_SHA256 = '1627d50cf67e830e6dd3d1c19c8c307315c2d1dd550ee20a9a1cde326b780a09';
const PRIVACY_BODY_SHA256 = 'fd1c58dc308bb57f592bbf5deea72d8c3dc0be7a4b03084c8a8310912a7bb725';

function finish() {
  if (failed) {
    console.error(failed + ' failed');
    process.exit(1);
  }
  console.log('AC Wave-2 and HP Wave-1 sanity passed');
}

function bootPage() {
  const { JSDOM, VirtualConsole } = require('jsdom');
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(String(error && error.stack || error)));
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8')
    .replace(/\s*<script src="assets\/(?:config|flow|app)\.js\?v=[^"]+" defer><\/script>/g, '')
    .replace('</body>', '<script>' + fs.readFileSync(path.join(__dirname, '../assets/config.js'), 'utf8') + '</script><script>' + fs.readFileSync(path.join(__dirname, '../assets/flow.js'), 'utf8') + '</script><script>' + fs.readFileSync(path.join(__dirname, '../assets/app.js'), 'utf8') + '</script></body>');
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:8765/#/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) { window.scrollTo = () => {}; }
  });
  return { dom, errors };
}

function pageChecks() {
  const crypto = require('crypto');
  const { dom, errors } = bootPage();
  const window = dom.window;
  const doc = window.document;
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));
  const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const norm = el => (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
  async function home() {
    if (window.location.hash !== '#/') window.location.hash = '#/';
    await flush();
    click(doc.querySelector('[data-action="start"]'));
    await flush();
  }
  function emergencyOk(label) {
    const footer = doc.querySelector('.legal-footer');
    assert(window.location.hash === '#/result', label + ' reaches a result');
    assert(footer && footer.textContent === EMERGENCY_LINE, label + ' shows the emergency result line');
    assert(doc.querySelector('.result-heading.emergency'), label + ' renders an emergency result');
    assert(!doc.getElementById('agree'), label + ' does not ask for the checkbox');
  }
  return (async () => {
    assert(errors.length === 0, 'page scripts load without error: ' + errors.join(' | '));
    assert(norm(doc.querySelector('.beta-bar')) === 'Free public beta. A better next step. · Not an emergency service', 'rendered beta bar');
    assert(norm(doc.querySelector('.quiet-note')).startsWith('Free public beta. Try it on your own system and tell us what was clear or confusing.'), 'rendered home note');
    for (const [id, title] of HAZARDS) {
      await home();
      assert(!doc.getElementById('agree'), id + ' starts on the safety gate without a checkbox');
      click(doc.querySelector('[data-answer="' + id + '"]'));
      await flush();
      emergencyOk(id);
      assert(doc.querySelector('h1') && doc.querySelector('h1').textContent === title, id + ' result title');
    }
    for (const [id, title] of HAZARDS) {
      await home();
      click(doc.querySelector('[data-answer="none_of_these"]'));
      await flush();
      const box = doc.getElementById('agree');
      const cont = doc.getElementById('continue-consent');
      assert(box && box.checked === false && cont && cont.disabled, id + ' stop path leaves the checkbox unticked');
      click(doc.querySelector('header [data-action="stop"]'));
      await flush();
      assert(!doc.getElementById('agree') && doc.querySelector('h1').textContent === 'Is any of this happening right now?', 'Stop / get help returns to the hazard gate without the checkbox');
      click(doc.querySelector('[data-answer="' + id + '"]'));
      await flush();
      emergencyOk('Stop / get help then ' + id);
      assert(doc.querySelector('h1').textContent === title, 'Stop / get help then ' + id + ' result title');
    }
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    const cont = doc.getElementById('continue-consent');
    assert(cont.disabled && doc.getElementById('agree').checked === false, 'Continue starts disabled while the checkbox is unticked');
    click(cont);
    await flush();
    assert(doc.querySelector('h1').textContent === 'A guide, not an equipment inspection.', 'a disabled Continue does not leave consent');
    cont.disabled = false;
    click(cont);
    await flush();
    assert(window.location.hash === '#/check', 'Continue stays on the check route');
    assert(doc.querySelector('h1').textContent === 'A guide, not an equipment inspection.', 'Continue re-checks the checkbox and does not advance');
    assert(doc.getElementById('flow-error').textContent === 'Please read and accept the Terms and Privacy notes to continue.', 'Continue explains that the checkbox is required');
    assert(doc.querySelector('main h1').textContent !== 'Cooling-only AC, or a heat pump?', 'an unticked Continue does not open system type');
    window.location.hash = '#/terms';
    await flush();
    const termsBody = norm(doc.querySelector('.document-panel'));
    assert(termsBody.includes('Emergency / hazard help never requires this checkbox.'), 'rendered terms include the hazard checkbox sentence');
    assert(crypto.createHash('sha256').update(termsBody).digest('hex') === TERMS_BODY_SHA256, 'terms body matches the approved text');
    window.location.hash = '#/privacy';
    await flush();
    const privacyBody = norm(doc.querySelector('.document-panel'));
    assert(crypto.createHash('sha256').update(privacyBody).digest('hex') === PRIVACY_BODY_SHA256, 'privacy body matches the approved text');
    window.close();
    finish();
  })().catch(error => {
    failed += 1;
    console.error('FAIL', error && error.stack || error);
    finish();
  });
}

pageChecks();
