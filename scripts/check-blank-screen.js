'use strict';
// Blank-screen v2 (d5). The public flag is on. This file turns it on for its own process.
globalThis.SW_CONFIG = {
  advancedRepairsEnabled: false,
  aiThermostatEnabled: false,
  mirrorsEnabled: false,
  stageLatchStepsEnabled: false,
  catalogEnabled: false,
  tsBlankScreenV2Enabled: true,
  contentVersion: '2026-10-20.18'
};
const F = require('../assets/flow.js');
const meta = { agreed: true, termsVersion: 'public-beta-2026-10-18.1' };
let failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed += 1;
  console.error('FAIL ' + msg);
}
function walk(choices) {
  const state = F.create('', 'test');
  choices.forEach(choice => {
    if (state.result) throw new Error('Ended at ' + state.result + ' before ' + choice);
    if (state.node === 'sw.co.fast_exit' && choice !== 'co_yes' && choice !== 'co_no') F.answer(state, 'co_no', meta);
    F.answer(state, choice, meta);
  });
  return state;
}
const gate = ['none_of_these', 'agree_18_terms'];
const B3 = 'If the house is getting cold, call a licensed HVAC professional. If it\u2019s dangerously cold and anyone is at risk, get them somewhere warm first.';
const B1 = 'If your thermostat has an Emergency Heat setting, switch to it to keep heat on without the outdoor unit while you wait for a pro. It usually costs more to run.';
function expectCode(label, code, fn) {
  let message = '';
  try { fn(); } catch (err) { message = String(err && err.message || err); }
  assert(message.indexOf(code) !== -1, label + ' expected ' + code + ' got ' + message.slice(0, 180));
}
function mut(label, code, apply, revert) {
  apply();
  try { expectCode(label, code, () => F.assertBlankScreen()); }
  finally { revert(); }
}

F.assertBlankScreen();
assert(F.nodes['ts.power.blank_screen'].options.length === 12, 'stored blank screen stays at 12 options');
assert(F.nodes['ts.power.blank_screen'].options.map(op => op.id).filter(id => id === 'float_or_pan_water').length === 0, 'stored graph has no float option');

const off = globalThis.SW_CONFIG.tsBlankScreenV2Enabled;
globalThis.SW_CONFIG.tsBlankScreenV2Enabled = false;
const legacy = walk(gate.concat(['heat_pump', 'air_source_ducted_hp', 'landing_no_heat', 'tstat_blank_or_unreadable']));
assert(legacy.node === 'ac.tstat.blank.batteries', 'flag off keeps the battery alias, got ' + legacy.node);
const fnLegacy = F.viewNode('ac.tstat.blank.batteries', legacy);
assert(fnLegacy.options.find(op => op.id === 'hardwired_or_no_batteries').hint.indexOf('Pro path') !== -1, 'flag off keeps the furnace hint');
globalThis.SW_CONFIG.tsBlankScreenV2Enabled = off;

function toBlank(choices) {
  const state = walk(choices);
  assert(state.node === 'ts.gate.safety_stops', choices[choices.length - 1] + ' reaches the thermostat gate, got ' + (state.node || state.result));
  assert(state.audit.some(row => row.event === 'alias:ac.tstat.blank.batteries'), 'alias audit');
  assert(!state.answers.some(row => row.node === 'ts.power.blank_screen'), 'gate comes before the blank screen');
  F.answer(state, 'ts_none_of_these', meta);
  F.answer(state, 'brand_amazon', meta);
  assert(state.node === 'ts.power.blank_screen', 'preset skips the landing picker, got ' + state.node);
  return state;
}

const acBlank = toBlank(gate.concat(['cooling_only_ac', 'split_central_cool_only', 'landing_blank_tstat']));
assert(acBlank.originLane === 'ac' && acBlank.hvacMode === 'cool', 'AC origin is cool');
const acView = F.viewNode(acBlank.node, acBlank);
assert(acView.options.some(op => op.id === 'door_not_seated' && op.next === 'ts.power.door_reseat'), 'AC origin shows the door step');
assert(acView.options[0].id === 'cold_home_risk' && acView.options[acView.options.length - 1].id === 'hazard_now', 'blank screen cold first and hazard last');

const acHeatBlank = toBlank(gate.concat(['cooling_only_ac', 'split_central_cool_only', 'landing_not_cooling', 'tstat_blank_or_unreadable']));
assert(acHeatBlank.originLane === 'ac', 'mode-screen blank stays an AC origin');

const hpBlank = toBlank(gate.concat(['heat_pump', 'air_source_ducted_hp', 'landing_no_heat', 'tstat_blank_or_unreadable']));
assert(hpBlank.originLane === 'hp' && hpBlank.hvacMode === 'heat' && hpBlank.equipment === 'heat_pump', 'HP no-heat origin');
assert(!hpBlank.answers.some(row => row.choice === 'hardwired_or_no_batteries'), 'HP blank does not reach the battery dead end');

const hpCool = toBlank(gate.concat(['heat_pump', 'air_source_ducted_hp', 'landing_no_cool', 'tstat_blank_or_unreadable']));
assert(hpCool.hvacMode === 'cool', 'HP no-cool origin is cool');

const fnBlank = toBlank(gate.concat(['furnace', 'none_of_these', 'gas_furnace', 'natural_gas', 'site_built', 'landing_blank_tstat']));
assert(fnBlank.originLane === 'fn' && fnBlank.hvacMode === 'heat', 'furnace landing origin');
const fnView = F.viewNode(fnBlank.node, fnBlank);
assert(!fnView.options.some(op => op.id === 'door_not_seated'), 'furnace origin hides the door step');
assert(fnView.options.find(op => op.id === 'furnace_switch_off').next === 'fn.power.switch_breaker_visual', 'furnace switch hands off');
assert(!fnView.options.some(op => String(op.next).indexOf('ac.cool.power.breaker_') === 0), 'furnace blank options avoid the AC breaker');

const fnMode = toBlank(gate.concat(['furnace', 'none_of_these', 'gas_furnace', 'natural_gas', 'site_built', 'landing_not_enough_heat', 'tstat_blank']));
assert(fnMode.originLane === 'fn', 'furnace mode-screen origin');

fnBlank.reset_count = 1;
F.answer(fnBlank, 'furnace_switch_off', meta);
assert(fnBlank.node === 'fn.power.switch_breaker_visual' && fnBlank.reset_count === 1, 'switch handoff carries reset_count, got ' + fnBlank.node + ' ' + fnBlank.reset_count);
assert(fnBlank.audit.some(row => row.event === 'handoff:ts_to_fn'), 'switch handoff audit');

const hpPower = toBlank(gate.concat(['heat_pump', 'air_source_ducted_hp', 'landing_no_heat', 'tstat_blank_or_unreadable']));
hpPower.reset_count = 1;
F.answer(hpPower, 'breaker_ac_outdoor', meta);
assert(hpPower.hpOutdoorNotRunning === true && hpPower.node === 'ac.cool.power.breaker_visual', 'HP breaker sets outdoor-not-running before the screen');
assert(hpPower.reset_count === 1 && hpPower.blankHandoff.reset_count === 1, 'AC breaker handoff carries reset_count');
const hpBreaker = F.viewNode(hpPower.node, hpPower);
assert(hpBreaker.options[0].id === 'cold_home_risk' && hpBreaker.options[0].next === '@ts_cold_home_urgent', 'heat HP breaker leads with cold-home');
assert(!/while Cool is calling/i.test(JSON.stringify(hpBreaker)), 'heat HP breaker does not render cool-only copy');
const coolBreaker = F.viewNode('ac.cool.power.breaker_visual', { product: 'ac', hvacMode: 'cool', originLane: 'ac' });
assert(coolBreaker.options[0].id !== 'cold_home_risk', 'cool breaker render stays unchanged');
const gateView = F.viewNode('ac.cool.power.breaker_reset_gate', hpPower);
assert(gateView.options[0].id === 'cold_home_risk', 'heat HP reset gate leads with cold-home');

F.answer(acBlank, 'door_not_seated', meta);
assert(acBlank.node === 'ts.power.door_reseat', 'AC door choice opens the reseat step');
const locked = F.viewNode(acBlank.node, acBlank);
assert(locked.step == null && locked.noticePrompt && locked.options.find(op => op.id === 'door_off').disabled, 'notice comes before the door steps');
let blocked = false;
try { F.answer(acBlank, 'door_off', meta); } catch (err) { blocked = true; }
assert(blocked && acBlank.node === 'ts.power.door_reseat', 'door answers wait for the notice');
F.acknowledgeStep(acBlank);
assert(acBlank.notices.ts.version === 'pn-v1' && acBlank.audit.some(row => row.event === 'notice_ack:ts:pn-v1'), 'door notice acknowledgement');
const openDoor = F.viewNode(acBlank.node, acBlank);
assert(openDoor.step && openDoor.step.steps.some(line => line.indexOf('never run the unit with the door off') !== -1), 'acked door step renders');
F.answer(acBlank, 'door_closed_still_blank', meta);
assert(acBlank.node === 'ts.power.blank_screen' && acBlank.doorChecked === true, 'closed door returns to the blank screen');
assert(!F.viewNode(acBlank.node, acBlank).options.some(op => op.id === 'door_not_seated'), 'door choice stays hidden after it is checked');

const directFn = { originLane: 'fn', audit: [], product: 'ts', notices: {}, answers: [], treeVersion: 'ts.settings.v1' };
assert(F.viewNode('ts.power.door_reseat', directFn).step == null, 'furnace origin does not render the door step');

F.answer(hpBlank, 'float_or_pan_water', meta);
assert(hpBlank.node === 'ts.power.float_mode' && hpBlank.preselectChoice === 'mode_heat', 'known heat mode is preselected');
F.answer(hpBlank, 'mode_heat', meta);
assert(hpBlank.result === 'ts_float_switch_seen', 'all-electric heat pump heat float stays out of the furnace lane, got ' + (hpBlank.result || hpBlank.node));
assert(!hpBlank.answers.some(row => String(row.node).indexOf('fn.') === 0) && !String(hpBlank.node || '').startsWith('fn.'), 'all-electric walk enters no furnace node');
const airOnly = F.presentResult(hpBlank);
assert(airOnly.drainLinks.length === 1 && airOnly.drainLinks[0].id === 'cool', 'all-electric result has only the air-handler link');
assert(airOnly.actions.indexOf(B3) !== -1 && airOnly.actions[airOnly.actions.indexOf(B3) + 1] === F.hpCoLine, 'HP heat result appends the cold-home line then the heat-pump carbon monoxide line');
assert(airOnly.actions.indexOf(B1) === -1 && airOnly.coLine === 'HP_CO_LINE', 'Emergency Heat lines stay off the result');
assert(airOnly.actions.join('\n').indexOf('space heaters only') === -1 && airOnly.actions.join('\n').indexOf('FN_CO_LINE') === -1, 'furnace-only backup wording stays off');

const dual = toBlank(gate.concat(['heat_pump', 'air_source_hp_gas_furnace', 'none_of_these', 'landing_no_heat', 'tstat_blank_or_unreadable']));
F.answer(dual, 'float_or_pan_water', meta);
F.answer(dual, 'mode_heat', meta);
assert(dual.result === 'ts_float_switch_seen', 'gas-furnace heat float falls back while the furnace drain screen is pending, got ' + (dual.result || dual.node));
const dualLinks = F.presentResult(dual);
assert(dualLinks.drainLinks.some(link => link.id === 'cool'), 'pending furnace drain keeps the air-handler link');
F.nodes['fn.drain.condensate_heat'] = { id: 'fn.drain.condensate_heat', options: [] };
try {
  const dualLive = toBlank(gate.concat(['heat_pump', 'air_source_hp_gas_furnace', 'none_of_these', 'landing_no_heat', 'tstat_blank_or_unreadable']));
  F.answer(dualLive, 'float_or_pan_water', meta);
  F.answer(dualLive, 'mode_heat', meta);
  assert(dualLive.node === 'sw.co.fast_exit' && dualLive.coReturn === 'fn.gate.combustion_co', 'gas-furnace heat float opens the carbon monoxide screen first, got ' + dualLive.node);
  assert(dualLive.blankHandoff && dualLive.blankHandoff.hazard_screen_done === false && dualLive.blankHandoff.cold_screen === 'unknown' && !dualLive.blankHandoff.fuel, 'heat handoff keeps fuel and cold screen unset');
} finally {
  delete F.nodes['fn.drain.condensate_heat'];
}

const oil = toBlank(gate.concat(['furnace', 'none_of_these', 'oil_furnace', 'site_built', 'landing_blank_tstat']));
assert(oil.fnFuel === 'oil', 'oil fuel is remembered, got ' + oil.fnFuel);
F.answer(oil, 'float_or_pan_water', meta);
F.answer(oil, 'mode_heat', meta);
assert(oil.result === 'ts_power_breaker_pro', 'oil heat float goes to a pro, got ' + (oil.result || oil.node));

const unknown = toBlank(gate.concat(['cooling_only_ac', 'split_central_cool_only', 'landing_blank_tstat']));
F.answer(unknown, 'float_or_pan_water', meta);
assert(unknown.preselectChoice === 'mode_cool', 'known cool mode is preselected');
F.answer(unknown, 'mode_unknown', meta);
const both = F.presentResult(unknown);
assert(unknown.result === 'ts_float_switch_seen' && both.drainLinks.map(link => link.id).join('|') === 'cool|heat', 'unknown mode shows both drain links');
assert(both.continueTo == null && !both.step, 'float result has no step panel and does not continue');
const stayed = F.followDrain(unknown, 'cool');
assert(stayed.result === 'ts_float_switch_seen', 'a missing drain screen stays on the result');

F.stop(unknown);
assert(unknown.node === 'sw.co.fast_exit' && unknown.coReturn === 'ts.gate.safety_stops', 'stop from the float result opens the thermostat hazard path');
const otherStop = toBlank(gate.concat(['cooling_only_ac', 'split_central_cool_only', 'landing_blank_tstat']));
F.answer(otherStop, 'still_blank', meta);
F.stop(otherStop);
assert(otherStop.coReturn === 'ac.gate.cluster_entry', 'other thermostat stops keep the main hazard gate, got ' + otherStop.coReturn);

const models = [
  ['brand_nest', 'nest_lt4'], ['brand_honeywell_smart', 'hw_t6'], ['brand_ecobee', 'ecb_premium'], ['brand_honeywell_buttons', 'hw_focuspro'], ['brand_amazon']
];
models.forEach(path => {
  const state = toBlank(gate.concat(['cooling_only_ac', 'split_central_cool_only', 'landing_blank_tstat']));
  // toBlank already chose Amazon. Walk the model from the gate instead.
  state.answers = state.answers;
});
['brand_nest', 'nest_lt4', 'brand_honeywell_smart', 'hw_t9', 'brand_ecobee', 'ecb_essential', 'brand_honeywell_buttons', 'hw_th4000'].forEach(() => {});
function throughModel(path) {
  const state = walk(gate.concat(['cooling_only_ac', 'split_central_cool_only', 'landing_blank_tstat', 'ts_none_of_these']).concat(path).concat(['still_blank']));
  assert(state.result === 'ts_blank_after_basics', path.join('/') + ' reaches a result, got ' + (state.result || state.node));
  assert(state.answers.some(row => row.node === 'ts.gate.safety_stops') && state.answers.findIndex(row => row.node === 'ts.gate.safety_stops') < state.answers.findIndex(row => row.node === 'ts.power.blank_screen'), path.join('/') + ' gate before blank screen');
  assert(state.answers.length <= 16, path.join('/') + ' bound ' + state.answers.length);
}
[
  ['brand_amazon'],
  ['brand_nest', 'nest_lt4'],
  ['brand_nest', 'nest_nt'],
  ['brand_honeywell_smart', 'hw_t6'],
  ['brand_honeywell_smart', 'hw_t9'],
  ['brand_ecobee', 'ecb_premium'],
  ['brand_ecobee', 'ecb_essential'],
  ['brand_honeywell_buttons', 'hw_focuspro'],
  ['brand_honeywell_buttons', 'hw_th4000']
].forEach(throughModel);

const rules = F.blankRules;
const screen = F.blankScreen;
const floatHeat = F.nodes['ts.power.float_mode'].options.find(op => op.id === 'mode_heat');
const floatCold = F.nodes['ts.power.float_mode'].options;
const doorBack = F.nodes['ts.power.door_reseat'].options.find(op => op.id === 'door_closed_still_blank');
const doorOff = F.nodes['ts.power.door_reseat'].options.find(op => op.id === 'door_off');
const tripped = screen.options.find(op => op.id === 'breaker_looks_tripped');
const outdoor = screen.options.find(op => op.id === 'breaker_ac_outdoor');
const stepLine = F.nodes['ts.power.door_reseat'].step.steps[2];
mut('M84', 'TS-G67', () => { screen.body += '\nReset the breaker'; }, () => { screen.body = screen.body.replace('\nReset the breaker', ''); });
mut('M85', 'TS-G68', () => { const first = floatCold.shift(); floatCold.splice(1, 0, first); }, () => { const moved = floatCold.splice(1, 1)[0]; floatCold.unshift(moved); });
mut('M86', 'TS-G68', () => { floatHeat.next = 'fn.condensate.visual'; }, () => { floatHeat.next = 'fn.drain.condensate_heat'; });
mut('M87', 'TS-G69', () => { rules.hazardDone = true; }, () => { rules.hazardDone = false; });
mut('M88', 'TS-G70', () => { rules.fallback = false; }, () => { rules.fallback = true; });
mut('M89', 'TS-A40', () => { rules.entry = 'ts.power.blank_screen'; }, () => { rules.entry = 'ts.gate.safety_stops'; });
mut('M90', 'TS-A42', () => { rules.alias = false; }, () => { rules.alias = true; });
mut('M91', 'TS-A43', () => { rules.fnRedirect = false; }, () => { rules.fnRedirect = true; });
mut('M92', 'TS-G72', () => { F.nodes['ts.power.door_reseat'].step.steps[2] = stepLine.replace('never run the unit with the door off', 'leave the unit alone'); }, () => { F.nodes['ts.power.door_reseat'].step.steps[2] = stepLine; });
mut('M93', 'TS-G72', () => { doorBack.next = 'ts.power.door_reseat'; }, () => { doorBack.next = 'ts.power.blank_screen'; });
mut('M94', 'TS-G73', () => { tripped.next = 'ac.cool.power.breaker_visual'; }, () => { tripped.next = '@ts_power_breaker_pro'; });
mut('M95', 'TS-G73', () => { outdoor.handoff.reset = 'zero'; rules.zeroReset = true; }, () => { outdoor.handoff.reset = 'carry'; rules.zeroReset = false; });
mut('M96', 'TS-G72', () => { doorOff.next = 'ts.power.blank_screen'; }, () => { doorOff.next = '@ts_open_cabinet_stop'; });
mut('M97', 'TS-G72', () => { F.nodes['ts.power.door_reseat'].step.steps[1] += ' lift it onto its tabs'; }, () => { F.nodes['ts.power.door_reseat'].step.steps[1] = F.nodes['ts.power.door_reseat'].step.steps[1].replace(' lift it onto its tabs', ''); });
mut('M98', 'TS-G71', () => { F.results.ts_float_switch_seen.actions.push('Use the drain check for cooling or for heating. Each has its own steps and stop lines.'); }, () => { F.results.ts_float_switch_seen.actions.pop(); });
mut('M99', 'TS-G69', () => { rules.skipCo = true; }, () => { rules.skipCo = false; });
mut('M100', 'TS-G69', () => { rules.deriveCold = true; }, () => { rules.deriveCold = false; });
mut('M101', 'TS-G69', () => { rules.defaultFuel = true; }, () => { rules.defaultFuel = false; });
mut('M102', 'TS-G74', () => { rules.showFnDoor = true; }, () => { rules.showFnDoor = false; });
mut('M103', 'TS-G74', () => { rules.fnDoorBlock = false; }, () => { rules.fnDoorBlock = true; });
mut('M104', 'TS-G74', () => { rules.hideAcDoor = true; }, () => { rules.hideAcDoor = false; });
mut('M105', 'TS-G75', () => { rules.fnSwitch = false; }, () => { rules.fnSwitch = true; });
mut('M106', 'TS-G75', () => { rules.zeroFnReset = true; }, () => { rules.zeroFnReset = false; });
mut('M107', 'TS-G73', () => { rules.fnNoAcBreaker = false; }, () => { rules.fnNoAcBreaker = true; });
mut('M108', 'TS-G76', () => { rules.hpOutdoor = false; }, () => { rules.hpOutdoor = true; });
mut('M109', 'TS-G77', () => { rules.omitB4 = true; }, () => { rules.omitB4 = false; });
mut('M110', 'TS-G77', () => { rules.showEmHeat = true; }, () => { rules.showEmHeat = false; });
mut('M111', 'TS-A44', () => { rules.forceFnHeat = true; }, () => { rules.forceFnHeat = false; });
mut('M112', 'TS-G78', () => { rules.coldFirst = false; }, () => { rules.coldFirst = true; });
F.assertBlankScreen();
assert(/tsBlankScreenV2Enabled:\s*true/.test(require('fs').readFileSync(require('path').join(__dirname, '../assets/config.js'), 'utf8')), 'public flag is on');
assert(/advancedRepairsEnabled:\s*false/.test(require('fs').readFileSync(require('path').join(__dirname, '../assets/config.js'), 'utf8')), 'advanced stays off');
assert(/catalogEnabled:\s*false/.test(require('fs').readFileSync(require('path').join(__dirname, '../assets/config.js'), 'utf8')), 'catalog stays off');

if (failed) {
  console.error(failed + ' blank-screen checks failed');
  process.exit(1);
}
console.log('blank-screen v2 checks passed');
