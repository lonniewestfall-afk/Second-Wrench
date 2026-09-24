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
assert(/contentVersion:\s*'2026-09-24\.1'/.test(configText), 'content version must be 2026-09-24.1');
assert(indexText.includes('config.js?v=2026-09-24.1') && indexText.includes('flow.js?v=2026-09-24.1') && indexText.includes('app.js?v=2026-09-24.1'), 'script cache-bust must match content version');
assert(F.treeVersion === 'ac.cool.v0', 'AC tree version');
assert(F.treeVersionHp === 'hp.air_source.v0', 'HP tree version');

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
assert(hpIntake.treeVersion === 'hp.air_source.v0' && hpIntake.product === 'hp', 'HP tree after system type');
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

const loop2 = F.create('', 'test');
['none_of_these', 'agree_18_terms', 'heat_pump', 'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off', 'band_near_freezing', 'not_cold_or_not_applicable', 'no_heat_at_all', 'still_in_defrost_or_weird'].forEach(c => F.answer(loop2, c, { agreed: true, termsVersion: 'beta-2026-09-13' }));
assert(loop2.node === 'hp.defrost.sanity', 'first defrost loop returns to defrost, got ' + loop2.node);
F.answer(loop2, 'not_sure', { agreed: true, termsVersion: 'beta-2026-09-13' });
/* not_sure on defrost is insufficient. Use a path that returns to observe. */
const loop3 = F.create('', 'test');
['none_of_these', 'agree_18_terms', 'heat_pump', 'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off', 'band_mild_warm', 'no_heat_at_all', 'still_in_defrost_or_weird', 'not_cold_or_not_applicable', 'no_heat_at_all', 'still_in_defrost_or_weird'].forEach(c => F.answer(loop3, c, { agreed: true, termsVersion: 'beta-2026-09-13' }));
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
      assert(state.product === 'hp' && state.node === 'hp.intake.system_confirm' && state.treeVersion === 'hp.air_source.v0', 'identify ' + [winter, em, heat].join('/') + ' got ' + state.product + ' ' + state.node);
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

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('AC Wave-2 and HP Wave-1 sanity passed');
