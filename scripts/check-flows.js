/* Local sanity for AC Wave-2 and HP Wave-1. No network. */
'use strict';
globalThis.SW_CONFIG = { advancedRepairsEnabled: false };
const fs = require('fs');
const F = require('../assets/flow.js');
const configText = fs.readFileSync(require('path').join(__dirname, '../assets/config.js'), 'utf8');
let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', msg);
  }
}
function walk(product, choices, mode) {
  const state = F.create('', mode || 'test', product);
  choices.forEach(choice => {
    if (state.result) throw new Error('Ended early at ' + state.result + ' before ' + choice + ' path=' + state.answers.map(a => a.node + ':' + a.choice).join('|'));
    F.answer(state, choice, { agreed: true, termsVersion: 'beta-2026-09-13' });
  });
  return state;
}
const gate = ['none_of_these', 'agree_18_terms'];

assert(/advancedRepairsEnabled:\s*false/.test(configText), 'public advanced flag must stay false');
assert(!/contentVersion:\s*'2026-09-23\.2'/.test(configText), 'content version should move past 2026-09-23.2');
assert(F.treeVersion === 'ac.cool.v0', 'AC tree version');
assert(F.treeVersionHp === 'hp.air_source.v0', 'HP tree version');

const ac = F.create('seed', 'real', 'ac');
assert(ac.treeVersion === 'ac.cool.v0' && ac.product === 'ac', 'AC session defaults');
const hp0 = F.create('seed', 'real', 'hp');
assert(hp0.treeVersion === 'hp.air_source.v0' && hp0.product === 'hp', 'HP session tree');

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

const hpIntake = walk('hp', gate);
assert(hpIntake.node === 'hp.intake.system_confirm', 'HP agree routes to HP intake, got ' + hpIntake.node);
assert(hpIntake.treeVersion === 'hp.air_source.v0', 'HP tree after consent');

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

const ice = walk('hp', gate.concat([
  'air_source_ducted_hp', 'landing_ice_outdoor', 'mode_matches_complaint', 'emergency_already_off',
  'band_near_freezing', 'want_keep_running_despite_ice'
]));
assert(ice.result === 'ice_keep_running' && F.results.ice_keep_running.outcome === 'emergency_exit', 'HP ice keep-running is emergency_exit');

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

const loop2 = F.create('', 'test', 'hp');
['none_of_these', 'agree_18_terms', 'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off', 'band_near_freezing', 'not_cold_or_not_applicable', 'no_heat_at_all', 'still_in_defrost_or_weird'].forEach(c => F.answer(loop2, c, { agreed: true, termsVersion: 'beta-2026-09-13' }));
assert(loop2.node === 'hp.defrost.sanity', 'first defrost loop returns to defrost, got ' + loop2.node);
F.answer(loop2, 'not_sure', { agreed: true, termsVersion: 'beta-2026-09-13' });
/* not_sure on defrost is insufficient. Use a path that returns to observe. */
const loop3 = F.create('', 'test', 'hp');
['none_of_these', 'agree_18_terms', 'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off', 'band_mild_warm', 'no_heat_at_all', 'still_in_defrost_or_weird', 'not_cold_or_not_applicable', 'no_heat_at_all', 'still_in_defrost_or_weird'].forEach(c => F.answer(loop3, c, { agreed: true, termsVersion: 'beta-2026-09-13' }));
assert(loop3.node === 'hp.conclude.call_pro_defrost_valve_control', 'second defrost loop goes to conclude, got ' + loop3.node + ' ' + loop3.result);

const fromAc = walk('ac', gate.concat(['heat_pump']));
assert(fromAc.node === 'hp.intake.system_confirm' && fromAc.product === 'hp' && fromAc.treeVersion === 'hp.air_source.v0', 'AC intake heat pump choice enters HP tree');

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

assert(!JSON.stringify(F.nodes).includes('2W'), 'no 2W brand');
const joined = JSON.stringify(F.hpWave1.map(id => F.nodes[id]));
assert(!/replace the capacitor/i.test(joined), 'HP nodes do not instruct capacitor replacement');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('AC Wave-2 and HP Wave-1 sanity passed');
