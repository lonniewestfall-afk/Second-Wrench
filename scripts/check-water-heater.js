'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
global.SW_CONFIG = { advancedRepairsEnabled: false, aiThermostatEnabled: false, mirrorsEnabled: false, stageLatchStepsEnabled: false, catalogEnabled: false, contentVersion: '2026-10-20.18' };
const F = require('../assets/flow');
const heating = require('../assets/heating-data.json');
const codes = require('./wh-codes');
const meta = { agreed: true, termsVersion: 'test' };

function reply(s, c) {
  if (s.node === 'sw.co.fast_exit' && c !== 'co_yes' && c !== 'co_no') F.answer(s, 'co_no', meta);
  F.answer(s, c, meta);
}
function go(...choices) {
  const s = F.create('', 'test');
  for (const c of choices) reply(s, c);
  return s;
}
function act(s, ...choices) {
  for (const c of choices) reply(s, c);
  return s;
}
const base = ['none_of_these', 'agree_18_terms'];
const water = () => go(...base, 'other_heat_or_ductless', 'water_heater', 'co_no');
const boiler = () => go(...base, 'other_heat_or_ductless', 'boiler', 'co_no');
const furnace = () => go(...base, 'furnace', 'co_no');

assert.equal(codes.RINNAI_PRO.length, 29);
assert.equal(codes.NORITZ_PRO.length, 10);
assert.equal(heating.waterHeater.codes.filter(row => row.proGuide && row.brand === 'rinnai').length, 29);
assert.equal(heating.waterHeater.codes.filter(row => row.proGuide && row.brand === 'noritz').length, 10);

const config = fs.readFileSync(path.join(__dirname, '../assets/config.js'), 'utf8');
assert.match(config, /advancedRepairsEnabled:\s*false/);
assert.match(config, /catalogEnabled:\s*false/);
assert.match(config, /contentVersion:\s*'2026-10-20\.18'/);

const gate = F.nodes['wh.gate.safety'].options;
assert.deepEqual(gate.slice(-2).map(o => o.id), ['unsure', 'none_of_these']);
assert.ok(gate.findIndex(o => o.id === 'refrigerant_alarm') < gate.findIndex(o => o.id === 'unsure'));
const steam = gate.find(o => /steam/i.test(o.label));
assert.equal(steam.id, 'hot_water_or_steam');
assert.equal(steam.next, '@hot_water_steam');
assert.equal(steam.label, 'Hot water or steam spraying or pouring from the heater or its relief pipe');
for (const node of Object.values(F.nodes)) {
  for (const opt of node.options) {
    if (opt.id === 'hazard_now' && /steam/i.test(opt.label)) {
      assert.equal(steam.next, '@hot_water_steam');
    }
  }
}

const filter = F.nodes['wh.hpwh.filter_step'];
assert.match(filter.body, /Answer only about work already completed/);
assert.match(filter.body, /Do not remove or wash a filter/);
assert.equal(filter.step, undefined);

function detail(brand, model, code) {
  const s = water();
  s.whBrand = brand;
  s.whModel = model;
  s.whCode = code;
  s.node = 'wh.code.detail';
  return F.viewNode('wh.code.detail', s);
}
function list(brand, model) {
  const s = water();
  s.whBrand = brand;
  s.whModel = model;
  s.node = 'wh.code.list';
  return F.viewNode('wh.code.list', s);
}

for (const row of codes.RINNAI_PRO) {
  assert.equal(row.meaning, row.meaning.trim());
  assert.ok(!row.step, row.code + ' has no repair step');
  assert.match(row.citation, new RegExp(codes.RINNAI_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(row.citation.includes(codes.RINNAI_URL), row.code);
  assert.match(row.citation, /, p\. /);
  const view = detail('rinnai', '', row.code);
  assert.equal(view.step, null);
  assert.ok(!view.options.some(o => o.id === 'owner_step' || o.id === 'rheem_reset'), row.code);
  assert.ok(view.body.startsWith(row.meaning), row.code);
  assert.ok(!view.body.includes('Owner step:'), row.code);
  assert.ok(view.body.includes(row.caption) && view.body.includes(codes.RINNAI_URL), row.code);
}

for (const row of codes.NORITZ_PRO) {
  assert.ok(!row.step && !row.ownerStep, row.code);
  assert.ok(row.citation.includes(codes.NORITZ_TITLE) && row.citation.includes(codes.NORITZ_URL), row.code);
  const gq = detail('noritz', 'gq-c59', row.code);
  assert.equal(gq.step, null, row.code);
  assert.ok(!gq.options.some(o => o.id === 'owner_step'), row.code);
  assert.ok(gq.body.startsWith(row.meaning), row.code);
  assert.ok(!gq.body.includes('Owner step:'), row.code);
  assert.ok(gq.body.includes(codes.NORITZ_CAPTION) && gq.body.includes(codes.NORITZ_URL), row.code);
  const ncc = detail('noritz', 'ncc199', row.code);
  assert.match(ncc.body, /Yours isn’t in our list yet/);
  assert.equal(ncc.step, null);
  const other = detail('noritz', 'other', row.code);
  assert.match(other.body, /Yours isn’t in our list yet/);
}

const gqList = list('noritz', 'gq-c59');
assert.equal(gqList.options.filter(o => o.id.startsWith('c_noritz_')).length, 10);
assert.ok(gqList.options.some(o => o.label.includes('Water Servo — Main abnormality')));
const nccList = list('noritz', 'ncc199');
assert.ok(!nccList.options.some(o => /Water Servo|How to reset the lock|Multi system communication/.test(o.label)));
assert.ok(nccList.options.some(o => o.id === 'c_noritz_11'));
const ncc11 = detail('noritz', 'ncc199', '11');
assert.equal(ncc11.options.find(o => o.id === 'owner_step').next, 'wh.tankless.reset_noritz');
const gq99 = detail('noritz', 'gq-c59', '99');
assert.match(gq99.body, /^How to reset the lock of the unit/);
assert.doesNotMatch(gq99.body, /Press the power button|Open a hot water tap|owner step:/i);
assert.equal(gq99.step, null);

const rinnai10 = detail('rinnai', '', '10');
assert.match(rinnai10.body, /Owner step: Clear snow or debris/);
assert.equal(rinnai10.options.find(o => o.id === 'owner_step').next, 'wh.tankless.vent_clear');

const blob = JSON.stringify({ nodes: Object.fromEntries(Object.entries(F.nodes).filter(([id]) => id.startsWith('wh.'))), results: Object.fromEntries(Object.entries(F.results).filter(([id]) => id.startsWith('wh_'))) });
assert.doesNotMatch(blob, /\(POLICY\b|\bPOLICY\b|\bPL-[A-Z0-9]|\bFT-[A-Z0-9]|\bD-0\d{2}\b/);
assert.doesNotMatch(blob, /\b(safe|safely|safer|safest)\b/i);
assert.doesNotMatch(blob, /the gas valve, gas line and every gas fitting/);
assert.doesNotMatch(JSON.stringify(F.nodes['wh.hpwh.filter']) + JSON.stringify(F.nodes['wh.hpwh.filter_ge']) + JSON.stringify(F.results.wh_hpwh_filter_other), /ProTerra|remove or wash/);
assert.match(JSON.stringify(F.nodes['wh.tank.tp_test'].step), /Rheem ProTerra p\. 23/);
assert.match(F.nodes['wh.tank.gas.dial'].step.locked, /Don’t change these/);
assert.match(F.nodes['wh.tank.tp_test'].step.locked, /except closing the cold water valve by hand/);
assert.match(F.nodes['wh.tank.gas.dial'].step.caution, /Hotter water can scald quickly/);
assert.match(F.results.wh_gas_smell.explanation, /Leave the house now and call the gas utility or 911 from outside/);
assert.match(F.results.wh_scald.explanation, /For a serious burn, call 911/);
assert.match(F.nodes['wh.code.capture'].body, /Write the code down exactly, or photograph it/);
assert.match(F.results.wh_code_unlisted.explanation, /Yours isn’t in our list yet/);
assert.match(F.nodes['wh.tankless.flow_check'].step.steps[0], /Don’t raise the setting above what your household can use without scalding/);
assert.match(F.results.wh_cold_sandwich.explanation, /Between back-to-back showers/);
assert.match(F.results.wh_cold_sandwich.explanation, /Removing the burst for good means adding a small buffer tank/);
assert.match(F.results.wh_main_shutoff_closed.explanation, /You’ve limited the water/);
assert.match(F.nodes['wh.tankless.reset_once'].step.stop, /Reset once, only once/);
assert.match(F.nodes['wh.tankless.reset_rheem_ask'].body, /Is the heater plugged into an outlet with a cord/);
assert.match(F.nodes['wh.hpwh.anode_ask'].body, /Has the anode rod been serviced or replaced since this light came on/);
assert.match(F.results.wh_pm_flush.explanation, /We don’t guide this one/);
assert.match(F.results.wh_pm_hardness.explanation, /Consumer Confidence Report/);

const dial = act(water(), 'none_of_these', 'none_of_these', 'tank', 'gas', 'too_hot');
assert.equal(dial.node, 'wh.tank.gas.dial');
assert.equal(dial.whDialDir, 'down');
const electricHot = act(water(), 'none_of_these', 'none_of_these', 'tank', 'electric', 'too_hot');
assert.equal(electricHot.result, 'wh_too_hot');

const flow = act(water(), 'none_of_these', 'none_of_these', 'tankless', 'gas', 'no_hot', 'all', 'short');
assert.equal(flow.node, 'wh.tankless.flow_check');

let reset = act(water(), 'none_of_these', 'none_of_these', 'tankless', 'gas', 'code', 'recorded', 'navien', 'c_navien_E003', 'owner_step');
assert.equal(reset.node, 'wh.tankless.reset_once');
act(reset, 'warranty_ok');
F.acknowledgeStep(reset);
act(reset, 'done');
assert.equal(reset.result, 'wh_tankless_reset_ok');
assert.equal(reset.reset_count, 1);
const repeat = act(water(), 'none_of_these', 'none_of_these', 'tankless', 'gas', 'code', 'recorded', 'navien', 'c_navien_E003');
repeat.reset_count = 1;
act(repeat, 'owner_step');
assert.equal(repeat.node, 'wh.conclude.call_pro');
act(repeat, 'diy');
assert.equal(repeat.result, 'wh_call_pro');
assert.match(F.presentResult(repeat).explanation, /A code that comes back after one reset/);

const gqReset = water();
gqReset.whBrand = 'noritz';
gqReset.whModel = 'gq-c59';
gqReset.whCode = '99';
gqReset.node = 'wh.code.detail';
assert.equal(F.viewNode('wh.code.detail', gqReset).options.some(o => o.next === 'wh.tankless.reset_noritz'), false);

for (const id of Object.keys(F.nodes)) {
  if (!id.startsWith('wh.')) continue;
  const s = F.create('', 'test');
  s.product = 'wh';
  s.consent = true;
  s.safetyCleared = true;
  s.node = id;
  F.stop(s);
  assert.equal(s.node, 'sw.co.fast_exit', id);
  assert.equal(s.coReturn, 'wh.gate.safety', id);
}

function handoff(s, choice, hwType, heatMode) {
  s.safetyCleared = true;
  s.coSkip = 'wh.gate.safety';
  F.answer(s, choice, meta);
  assert.equal(s.node, 'sw.co.fast_exit', choice);
  assert.equal(s.coReturn, 'wh.gate.safety', choice);
  assert.equal(s.hwType, hwType, choice);
  assert.equal(s.bl.mode, heatMode, choice);
  F.answer(s, 'co_no', meta);
  assert.equal(s.node, 'wh.gate.safety', choice);
  assert.notEqual(s.node, 'wh.intake.type');
}
const dhw = act(boiler(), 'none_of_these', 'hot_water_standard', 'fuel_gas', 'landing_no_hot_water');
assert.equal(dhw.node, 'bl.dhw.source');
handoff(JSON.parse(JSON.stringify(dhw)), 'dhw_combi', 'combi', 'dhw');
handoff(JSON.parse(JSON.stringify(dhw)), 'dhw_indirect', 'indirect', 'dhw');
handoff(JSON.parse(JSON.stringify(dhw)), 'dhw_separate', 'tank_or_tankless', 'dhw');
handoff(JSON.parse(JSON.stringify(dhw)), 'dhw_not_sure', 'unknown', 'dhw');
const coilFurnace = act(furnace(), 'none_of_these', 'air_handler_hot_water', 'water_heater_tank');
handoff(coilFurnace, 'pipe_cold', undefined, 'heat');
const coilBoiler = act(boiler(), 'none_of_these', 'hydro_air', 'pipe_cold');
handoff(coilBoiler, 'src_water_heater', 'tank_or_tankless', 'heat');
const furnaceCoil = act(furnace(), 'none_of_these', 'air_handler_hot_water', 'boiler', 'pipe_cold');
assert.equal(furnaceCoil.node, 'sw.co.fast_exit');
assert.equal(furnaceCoil.coReturn, 'bl.gate.safety');
const toBoiler = act(water(), 'none_of_these', 'none_of_these', 'tank', 'indirect');
assert.equal(toBoiler.node, 'wh.boiler.handoff');
assert.equal(F.nodes['wh.boiler.handoff'].options.find(o => o.id === 'continue').next, 'bl.gate.safety');
toBoiler.safetyCleared = true;
toBoiler.coSkip = 'bl.gate.safety';
F.answer(toBoiler, 'continue', meta);
assert.equal(toBoiler.node, 'sw.co.fast_exit');
assert.equal(toBoiler.coReturn, 'bl.gate.safety');
F.answer(toBoiler, 'co_no', meta);
assert.equal(toBoiler.node, 'bl.gate.safety');
const tap = act(water(), 'none_of_these', 'none_of_these');
tap.whCoil = true;
tap.node = 'wh.gate.warning_signs';
F.answer(tap, 'none_of_these', meta);
assert.equal(tap.node, 'wh.hydro.cold_home');
F.answer(tap, 'holding', meta);
assert.equal(tap.node, 'wh.hydro.tap');
assert.match(F.nodes['wh.hydro.tap'].body, /Your heat comes from your water heater/);
assert.match(F.nodes['wh.hydro.tap'].title, /Does hot water come out of a sink tap right now/);
tap.safetyCleared = true;
tap.coSkip = 'fn.gate.combustion_co';
F.answer(tap, 'yes', meta);
assert.equal(tap.node, 'sw.co.fast_exit');
assert.equal(tap.coReturn, 'fn.gate.combustion_co');
assert.equal(tap.heaterOk, 'yes');
F.answer(tap, 'co_no', meta);
assert.equal(tap.node, 'fn.gate.combustion_co');
const unknownTap = act(water(), 'none_of_these', 'none_of_these');
unknownTap.whCoil = true;
unknownTap.node = 'wh.hydro.tap';
F.answer(unknownTap, 'unsure', meta);
assert.equal(unknownTap.node, 'sw.handoff.hydronic_both');
assert.equal(unknownTap.heaterOk, 'unknown');
const coilLoop = JSON.parse(JSON.stringify(tap));
coilLoop.node = 'fn.hydro.air_side';
coilLoop.heaterOk = 'yes';
coilLoop.safetyCleared = true;
coilLoop.coSkip = 'bl.gate.safety';
F.answer(coilLoop, 'air_cool', meta);
assert.equal(coilLoop.node, 'sw.co.fast_exit');
assert.equal(coilLoop.coReturn, 'bl.gate.safety');
assert.notEqual(coilLoop.result, 'bl_call_pro');
F.answer(coilLoop, 'co_no', meta);
assert.equal(coilLoop.node, 'bl.gate.safety');
F.answer(coilLoop, 'none_of_these', meta);
assert.equal(coilLoop.node, 'bl.conclude.call_pro');
assert.equal(coilLoop.bl.entry, 'wh_coil_ok');
assert.equal(coilLoop.bl.reason, 'coil_loop_wh_source');
assert.notEqual(coilLoop.result, 'bl_call_pro');

const page = fs.readFileSync(path.join(__dirname, '../answers/tankless-water-heater-error-code/index.html'), 'utf8');
assert.ok(page.includes(codes.RINNAI_CAPTION));
assert.ok(page.includes(codes.RINNAI_TITLE));
assert.ok(page.includes(codes.RINNAI_URL));
for (const row of codes.RINNAI_PRO) {
  assert.ok(page.includes(row.meaning), row.code);
  assert.ok(page.includes('p. ' + row.citation.split(', p. ')[1]), row.code);
}
assert.ok(!page.includes(codes.NORITZ_URL));
assert.ok(!page.includes('Water Servo — Main abnormality'));
assert.ok(!page.includes('ezshoot.noritz.com'));
assert.doesNotMatch(page, /Owner step:/);

console.log('Water heater checks passed.');
