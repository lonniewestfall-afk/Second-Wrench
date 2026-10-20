/* Final thermostat audit acceptance and the normative M56–M83 mutations.
 * Run alongside check-flows.js. All sessions are hypothetical; no network. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const clone = x => JSON.parse(JSON.stringify(x));
function load(overrides = {}) {
  const cache = {};
  const context = vm.createContext({ console, Date, URL, SW_CONFIG: { advancedRepairsEnabled: false, mirrorsEnabled: false, stageLatchStepsEnabled: false, aiThermostatEnabled: false } });
  function read(file) {
    file = path.resolve(file);
    if (cache[file]) return cache[file].exports;
    const module = { exports: {} }; cache[file] = module;
    const src = overrides[path.relative(root, file)] ?? fs.readFileSync(file, 'utf8');
    if (file.endsWith('.json')) module.exports = JSON.parse(src);
    else vm.runInContext('(function(module,exports,require){' + src + '\n})', context, { filename: file })(module, module.exports, request => read(path.resolve(path.dirname(file), request)));
    return module.exports;
  }
  return { F: read(path.join(root, 'assets/flow.js')), TS: read(path.join(root, 'assets/ts-lane.js')) };
}
const { F, TS } = load();
const option = (node, id) => F.nodes[node].options.find(o => o.id === id);
function checkRules() { F.assertTs(F.nodes, F.results); }
checkRules();
const label = 'TEST SCENARIO — not an actual equipment report.';
function walk(f) {
  const start = Object.assign(f.create('', 'test'), { node: 'ts.gate.safety_stops', product: 'ts', safetyCleared: true, consent: true });
  const q = [start], seen = new Set(), leaves = [];
  for (let i = 0; i < q.length; i++) {
    const state = q[i];
    const key = [state.node, state.result, state.tsModel, state.tsGeo, state.tsHpAir, state.tsRatedMin, state.tsWarrantyAck, state.tsLc18].join('|');
    if (seen.has(key)) continue; seen.add(key);
    if (state.result) { leaves.push(state); continue; }
    const view = f.viewNode(state.node, state);
    const fn = f.tsFnOf[state.node];
    if (fn && state.tsModel) assert.notEqual(f.tsSteps[fn][state.tsModel].kind, 'not_on_model', 'TS-A36 entered off-model step');
    const cell = fn && state.tsModel && f.tsSteps[fn][state.tsModel];
    if (cell && cell.kind === 'text' && cell.installer_menu) {
      const acknowledged = clone(state);
      if (!state.tsWarrantyAck) { acknowledged.tsWarrantyAck = true; q.push(acknowledged); }
      else if (!state.tsLc18) { acknowledged.tsLc18 = true; q.push(acknowledged); }
    }
    const nonTail = view.options.filter(o => !o.disabled && !['hazard_now', 'screen_looks_different', 'installer_setting_came_up'].includes(o.id));
    assert(nonTail.length, 'TS-A36 no enabled non-tail choice: ' + state.node);
    for (const op of view.options) {
      const next = clone(state);
      if (op.disabled) {
        assert.throws(() => f.answer(next, op.id), /Choose an answer shown/, 'TS-A36 accepted disabled option');
        assert.deepEqual(next, clone(state), 'TS-A36 disabled choice changed state');
        continue;
      }
      f.answer(next, op.id); q.push(next);
    }
  }
  assert(new Set(leaves.map(s => s.tsModel).filter(Boolean)).size === 14, 'All thermostat models reached');
  return { leaves, stateCount: seen.size };
}
function checkNotes(f, leaves) {
  for (const state of leaves) {
    assert(f.summary(state).endsWith(label), 'TS-A38 test note must end with the test label: ' + state.result);
    const live = Object.assign(clone(state), { mode: 'live' });
    assert(!f.summary(live).includes(label), 'TS-A38 test label on live note');
  }
}
function checkStops(f, leaves) {
  for (const state of leaves) for (const [hazard, result] of [['hazard_gas_co', 'gas'], ['hazard_refrigerant_alarm', 'leak']]) {
    const stopped = clone(state); f.stop(stopped);
    assert.equal(stopped.node, 'sw.co.fast_exit', 'TS-A39 Stop did not open the CO screen');
    f.answer(stopped, 'co_no');
    assert.equal(stopped.node, 'ac.gate.cluster_entry', 'TS-A39 Stop did not reach hazard screen');
    const op = f.viewNode(stopped.node, stopped).options.find(o => o.id === hazard || o.next === '@' + result);
    assert(op, 'TS-A39 hazard choice missing: ' + hazard);
    f.answer(stopped, op.id);
    assert.equal(stopped.result, result, 'TS-A39 hazard did not escalate');
  }
}
function checkWithdrawal(f) {
  let count = 0;
  for (const [node, fn] of Object.entries(f.tsFnOf)) for (const [model, cell] of Object.entries(f.tsSteps[fn])) {
    if (!cell.mirrors?.length || cell.text) continue;
    const byId = {};
    cell.mirrors.forEach(id => { byId[id] = Object.assign(clone(f.tsMirrors.byId[id]), { verified_status: 'verified', verified_by: 'a', second_check_by: 'b', verified_on: '2026-10-01', second_check_on: '2026-10-01', recheck_due: '2026-10-12' }); });
    for (const hold of [[], cell.mirrors.map(id => ({ id, reason: 'test' }))]) {
      const panel = f.renderTsPanel(model, node, { byId, today: '2026-10-13', mirrorsEnabled: false, hold });
      assert.equal(panel.steps.length, 0, 'TS-A37 expired instructions leaked');
      assert(panel.lc10 && panel.fallbacks.length, 'TS-A37 missing fallback');
    }
    count++;
  }
  assert(count > 0);
}
function checkPrivacy(app) {
  assert(app.includes('Viewing a thermostat guide doesn’t send anything to us, and neither does tapping <strong>My screen looks different</strong>.') && !app.includes('we receive the guide ID'), 'TS-G64 feedback privacy mismatch');
  assert(app.includes('href="#/feedback"'), 'TS-G60 feedback link missing');
}
const traversal = walk(F);
checkNotes(F, traversal.leaves); checkStops(F, traversal.leaves); checkWithdrawal(F);
const app = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8'); checkPrivacy(app);
let mutations = 0;
function mutation(id, change, restore, expected, check = checkRules) {
  change();
  try { assert.throws(check, expected, id + ' survived'); mutations++; }
  finally { restore(); }
}
function property(id, obj, key, value, expected) {
  const old = obj[key]; mutation(id, () => { obj[key] = value; }, () => { obj[key] = old; }, expected);
}
function drop(id, node, choiceId, expected) {
  property(id, F.nodes[node], 'options', F.nodes[node].options.filter(o => o.id !== choiceId), expected);
}
property('M56', option('ts.landing.picker', 'landing_em_aux_heat'), 'next', 'ts.settings.em_aux_heat', /TS-G53/);
property('M57', option('ts.settings.em_aux_check', 'eh_tech_left_on'), 'next', 'ts.settings.em_aux_heat', /TS-G53/);
drop('M58', 'ts.alert.capture', 'code_refrigerant_alarm', /TS-G54/);
property('M59', F.results.ts_refrigerant_alarm, 'avoid', F.results.ts_refrigerant_alarm.avoid + ' changed', /TS-G54/);
property('M60', option('ts.model.nest', 'nest_lt12'), 'next', 'ts.landing.picker', /TS-G56/);
property('M61', F.tsSteps.BATT['HW-T6'], 'text', 'Put in fresh AA batteries.', /TS-G57/);
property('M61a', F.tsSteps.BATT['HW-T9'], 'text', 'This model has no batteries to replace.', /TS-G57a/);
property('M62', option('ts.landing.picker', 'landing_wifi'), 'requires', undefined, /TS-G58/);
const laneSource = fs.readFileSync(path.join(root, 'assets/ts-lane.js'), 'utf8');
const flowSource = fs.readFileSync(path.join(root, 'assets/flow.js'), 'utf8');
function sourceMutation(id, file, original, replacement, check, expected) {
  const source = file === 'assets/flow.js' ? flowSource : laneSource;
  assert(source.includes(original), id + ' source target missing');
  const changed = source.replace(original, replacement);
  const overrides = { [file]: changed };
  // Exercise the consumer behavior even if the production startup validator
  // would reject the mutant before a screen could render.
  overrides['assets/flow.js'] = (overrides['assets/flow.js'] || flowSource).replace('  assertGraph();', '  /* startup validator omitted in isolated mutation fixture */');
  assert.throws(() => check(load(overrides).F), expected, id + ' survived'); mutations++;
}
sourceMutation('M63', 'assets/ts-lane.js', 'return !cell || cell.kind === \'not_on_model\';', 'if (fn === \'AUTO\' && state.tsModel === \'NEST-NT\') return false; return !cell || cell.kind === \'not_on_model\';', walk, /TS-A36/);
property('M64', F.nodes['ts.settings.mode_setpoint'], 'body', 'In Off, nothing runs.', /TS-G59/);
sourceMutation('M65', 'assets/ts-lane.js', 'if (textCurrent(record, opts)) (record.our_instruction_text || [])', 'if (record) (record.our_instruction_text || [])', checkWithdrawal, /TS-A37/);
property('M66', F.tsLc, 'lc5', 'We’ll review this step.', /TS-G60/);
sourceMutation('M67', 'assets/ts-lane.js', "state.mode === 'test' ? 'TEST SCENARIO — not an actual equipment report.' : ''", "''", f => checkNotes(f, traversal.leaves), /TS-A38/);
property('M68', option('ts.power.blank_screen', 'power_back'), 'fact', 'User checked batteries and the furnace door, and saw the furnace switch on. The screen came back.', /TS-G61/);
property('M69', F.nodes['ts.status.wait_delay'], 'title', 'Give it 5 minutes', /TS-G62/);
drop('M70', 'ts.settings.mode_setpoint', 'cold_home_risk', /TS-G63/);
sourceMutation('M71', 'assets/flow.js', 'function stop(state) {', 'function stop(state) { if (state.result) return state;', f => checkStops(f, traversal.leaves), /TS-A39/);
property('M72', F.tsSteps.POWER['HW-T6'].fallback[0], 'section', 'p.28', /TS-G65/);
property('M73', option('ts.model.honeywell_smart', 'hw_t6'), 'label', 'T6 Pro', /TS-G65/);
assert.throws(() => checkPrivacy(app.replace('Viewing a thermostat guide doesn’t send anything to us, and neither does tapping <strong>My screen looks different</strong>.', 'we receive the guide ID')), /TS-G64/); mutations++;
property('M75', option('ts.status.wait_delay', 'wait_persists'), 'label', 'It is still waiting after 10 minutes', /TS-G62/);
const secondCold = node => { const options = F.nodes[node].options.slice(); options.splice(1, 0, options.shift()); return options; };
property('M76', F.nodes['ts.status.wait_delay'], 'options', secondCold('ts.status.wait_delay'), /TS-G63/);
property('M77', option('ts.settings.mode_setpoint', 'installer_setting_came_up'), 'label', 'Installer settings came up', /TS-G66/);
drop('M78', 'ts.diag.cycling', 'cold_home_risk', /TS-G63/);
property('M79', F.nodes['ts.diag.heat_pump_aux'], 'options', secondCold('ts.diag.heat_pump_aux'), /TS-G63/);
property('M80', option('ts.diag.recovery', 'cold_home_risk'), 'next', '@ts_learning_period_wait', /TS-G63/);
drop('M81', 'ts.model.honeywell_smart', 'hw_t6_other', /TS-G65/);
property('M82', F.tsLc, 'lc23', F.tsLc.lc23.replace('If a screen asks you to enter a password or access code, stop. That menu is for installers.', ''), /TS-G66/);
property('M83', F.tsSteps.WAIT['AMZ-AST'], 'text', 'Wait 5 minutes.', /TS-G62/);
assert.equal(mutations, 29);
checkRules();
console.log('Thermostat final audit passed: ' + traversal.stateCount + ' reachable states, ' + traversal.leaves.length + ' model/result cases, all 29 normative mutations rejected.');
