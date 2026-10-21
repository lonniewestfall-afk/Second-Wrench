'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const legal = require('./bl-legal-cleared.json');
global.SW_CONFIG = { advancedRepairsEnabled: false, aiThermostatEnabled: false, mirrorsEnabled: false, stageLatchStepsEnabled: false, catalogEnabled: false };
const F = require('../assets/flow');
const heating = require('../assets/heating-data.json');

const strings = legal.strings;
const ids = Object.keys(strings);
assert.equal(ids.length, 63, '63 legal-cleared strings');
const held = new Set(legal.held);
const SAFE = /\b(?:safe|safely|safer|safest)\b/i;
const BROKEN = /\[object|undefined/;

function collect(value, out) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach(v => collect(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => collect(v, out));
}
function renderedPieces() {
  const out = [];
  collect({ nodes: heating.boiler.nodes, results: heating.boiler.results, reasons: heating.boiler.reasons, co: heating.co }, out);
  return out;
}
function renderedBlob() {
  return renderedPieces().join('\n');
}
function renderedHas(text) {
  return renderedPieces().some(piece => piece.includes(text));
}
function guardFile(copy) {
  const blob = JSON.stringify(copy);
  assert.equal(BROKEN.test(blob), false, 'legal file render guard');
  assert.equal(SAFE.test(blob), false, 'legal file avoids safe as an adjective');
}
function oilResetInstruction(text) {
  if (/Don’t press the oil burner’s red button/.test(String(text))) return true;
  const say = String(text).replace(/\b(?:do not|don't|don’t|never)\b[^.]*/gi, '');
  return /\b(?:press|hold|push|hit)\b[^.]{0,80}\bred\b/i.test(say);
}
function guardRendered(blob) {
  assert.equal(BROKEN.test(blob), false, 'rendered boiler render guard');
  assert.equal(SAFE.test(blob), false, 'rendered boiler avoids safe as an adjective');
  assert.equal(oilResetInstruction(blob), false, 'L-32 oil red button stays off the page');
  assert.match(blob, /550-100-580/);
  assert.match(blob, /550-142-330/);
  assert.match(blob, /egg_sulfur_smell/);
  assert.match(blob, /reset_egg_smell/);
}
function touchInstruction(text) {
  const say = String(text).replace(/\b(?:do not|don't|don’t|never)\b[^.]*/gi, '');
  return /\b(?:touch|grab)\b/i.test(say) || /back of your hand|hold your hand/i.test(String(text));
}
function guardCoil(node) {
  const parts = [node.title, node.body].concat((node.options || []).map(o => [o.label, o.hint, o.fact].join(' ')));
  const blob = parts.join('\n');
  assert.match(blob, /Look, don’t touch/);
  assert.equal(touchInstruction(blob), false, 'SH-5 look-only coil');
}

guardFile(strings);
const live = renderedBlob();
guardRendered(live);
for (const [id, text] of Object.entries(strings)) {
  assert.equal(typeof text, 'string', id);
  assert.ok(text.trim().length > 0, id);
  if (held.has(id)) assert.equal(renderedHas(text), false, id + ' must not render');
  else assert.equal(renderedHas(text), true, id + ' renders word for word');
}

for (const id of ['bl.bleed.step', 'bl.reset.do', 'bl.reset.brand', 'bl.reset.check', 'bl.pn.notice', 'bl.pn.warranty', 'bl.zone.valve']) {
  assert.ok(F.nodes[id], id + ' is a page');
}
assert.equal(F.nodes['bl.gate.carryover'], undefined, 'carryover gate stays retired');
assert.ok(F.nodes['bl.gate.egg_split'], 'egg-smell split is a page');
for (const id of ['bl_bleed_done_basic', 'bl_reset_ok_basic', 'bl_vent_wont_close']) {
  assert.ok(F.results[id], id + ' is a result');
}
assert.equal(F.results.bl_pressure_relief_stop.source, 'safety');
assert.equal(F.results.bl_relief_weep_pro.source, 'safety');

const tap = F.nodes['bl.dhw.combi_call'].options.find(o => o.id === 'tap_only');
assert.equal(tap.heatingTarget, '>bl_to_wh');
assert.equal(F.nodes['bl.dhw.combi_call'].options.find(o => o.id === 'unsure').reason, 'combi_pattern_unclear');
const coil = F.nodes['sw.handoff.hydronic_coil'];
guardCoil(coil);
assert.equal(F.results.bl_water_electrical.tier, 'Stop / professional');
assert.equal(F.results.bl_refrigerant_alarm.tier, 'Stop / professional');
assert.equal(F.nodes['bl.gate.safety'].options.find(o => o.id === 'refrigerant_alarm').next, '@bl_refrigerant_alarm');

function assertM43() { guardFile(legal.strings); }
legal.strings = Object.assign({}, strings, { 'L-7': strings['L-7'] + ' [object Object]' });
assert.throws(assertM43);
legal.strings = Object.assign({}, strings, { 'L-9': 'undefined' });
assert.throws(assertM43);
legal.strings = strings;
assertM43();
assert.throws(() => guardRendered(renderedBlob() + '[object Object]'));
assert.throws(() => guardRendered(renderedBlob() + ' Don’t press the oil burner’s red button.'));

const plantedCoil = JSON.parse(JSON.stringify(coil));
plantedCoil.body += ' Touch the pipe with the back of your hand.';
function assertM46Plant() { guardCoil(plantedCoil); }
assert.throws(assertM46Plant);
function assertM47() {
  assert.equal(touchInstruction(coil.body), false);
  assert.match(coil.body, /Look, don’t touch/);
}
function assertM48() {
  for (const o of coil.options) assert.equal(touchInstruction([o.label, o.hint, o.fact].join(' ')), false, o.id);
}
assertM47();
assertM48();
const plantedOption = JSON.parse(JSON.stringify(coil));
plantedOption.options[0].label += ' Grab it.';
function assertM48Plant() { guardCoil(plantedOption); }
assert.throws(assertM48Plant);

const where = F.nodes['bl.heat.where'];
assert.equal(where.body, strings['L-34-where']);
assert.equal(touchInstruction(where.body), false, 'bl.heat.where is look-only');
assert.doesNotMatch(where.body, /hold your hand|a few inches from the pipe|Look, don’t touch/i);
for (const o of where.options) assert.equal(touchInstruction([o.label, o.hint, o.fact].join(' ')), false, 'heat.where ' + o.id);

const composeSrc = fs.readFileSync(path.join(__dirname, 'compose-heating-lanes.js'), 'utf8');
assert.match(composeSrc, /watchTag = 'POLICY'/);
assert.match(composeSrc, /watchBasis = 'POLICY: our own observation window; no manual cite'/);
assert.match(composeSrc, /policyTag = 'POLICY'/);
assert.equal(F.nodes['bl.reset.do'].watchTag, undefined);
assert.equal(F.nodes['bl.reset.do'].watchBasis, undefined);
assert.match(F.nodes['bl.reset.do'].watch.heat, /about 15 minutes/);
assert.match(F.nodes['bl.reset.do'].watch.dhw, /about 15 minutes/);
assert.equal(F.nodes['bl.bleed.step'].policyTag, undefined);
assert.match(F.nodes['bl.bleed.step'].coldPolicy, /40 °F/);
assert.equal(F.results.bl_type_unconfirmed.explanation, strings['L-29']);
assert.equal(F.results.bl_switch_off_pro.explanation, strings['L-30']);
assert.equal(F.results.bl_vent_blocked.explanation, strings['L-31']);
const boilerChoice = F.systemMenu().flatMap(group => group.choices).find(choice => choice.label === 'Boiler & hydronic heat');
assert.equal(boilerChoice.id, 'boiler');
assert.equal(F.nodes['fn.ah.water_source'].options.find(o => o.label === 'A boiler').id, 'boiler');
assert.equal(fs.readFileSync(path.join(__dirname, '../assets/config.js'), 'utf8').includes('advancedRepairsEnabled: false'), true);

const meta = { agreed: true, termsVersion: 'test' };
function reply(s, c) { if (s.node === 'sw.co.fast_exit' && c !== 'co_yes' && c !== 'co_no') F.answer(s, 'co_no', meta); F.answer(s, c, meta); }
function go(...choices) { const s = F.create('', 'test'); for (const c of choices) reply(s, c); return s; }
const base = ['none_of_these', 'agree_18_terms', 'other_heat_or_ductless', 'boiler', 'co_no', 'none_of_these'];
let session = go(...base, 'hot_water_standard', 'fuel_gas', 'landing_code', 'nobody_at_risk', 'cold_no', 'code_ignition_flame');
assert.equal(session.node, 'bl.reset.check');
assert.equal(session.reset_count, 0);
reply(session, 'reset_none');
reply(session, 'notice_ack');
reply(session, 'rs_bosch');
assert.equal(session.node, 'bl.reset.do');
const shown = F.viewNode(session.node, session);
assert.match(shown.body, /switch the boiler \*\*OFF\*\* and \*\*ON\*\*/);
assert.match(shown.body, /about 15 minutes/);
assert.equal(shown.body.includes('[RESET_STEPS'), false);
assert.equal(oilResetInstruction(shown.body), false);
reply(session, 'reset_ok');
assert.equal(session.result, 'bl_reset_ok_basic');
assert.equal(session.reset_count, 1);
assert.equal(F.presentResult(session).explanation, strings['L-18']);
session = go(...base, 'hot_water_standard', 'fuel_gas', 'landing_code', 'nobody_at_risk', 'cold_no');
session.reset_count = 1;
reply(session, 'code_ignition_flame');
assert.equal(session.node, 'bl.conclude.call_pro');
assert.equal(session.bl.reason, 'reset_already_used');
assert.ok(!session.answers.some(a => a.node === 'bl.reset.do'));

session = go(...base, 'hot_water_standard', 'fuel_gas', 'landing_some_rooms', 'nobody_at_risk', 'cold_no', 'gurgle_or_cold_top');
assert.equal(session.node, 'bl.pn.notice');
reply(session, 'notice_ack');
reply(session, 'warranty_ok');
assert.equal(session.node, 'bl.bleed.step');
assert.match(F.viewNode(session.node, session).body, /radiator key made for the vent, or a coin/);
reply(session, 'bleed_done_ok');
assert.equal(session.result, 'bl_bleed_done_basic');

session = go(...base, 'steam', 'fuel_gas', 'landing_some_rooms', 'nobody_at_risk', 'cold_no', 'gurgle_or_cold_top');
assert.equal(session.node, 'bl.conclude.call_pro');
assert.equal(session.bl.reason, 'steam_distribution_after_basics');
assert.ok(!session.answers.some(a => a.node === 'bl.bleed.step' || a.node === 'bl.pn.notice'));

session = go(...base, 'hot_water_standard', 'fuel_gas', 'landing_some_rooms', 'nobody_at_risk', 'cold_yes', 'gurgle_or_cold_top');
assert.equal(session.node, 'bl.conclude.call_pro');
assert.equal(session.bl.reason, 'guard_blocked');
assert.ok(!session.answers.some(a => a.node === 'bl.bleed.step'));

session = go(...base, 'hot_water_standard', 'fuel_gas', 'landing_some_rooms', 'nobody_at_risk', 'cold_no', 'one_zone_cold_ok_settings');
assert.equal(session.node, 'bl.zone.valve');
assert.match(F.viewNode(session.node, session).body, /Don’t press the button on top or move any lever/);
session = go(...base, 'steam', 'fuel_gas', 'landing_some_rooms', 'nobody_at_risk', 'cold_no', 'one_zone_cold_ok_settings');
assert.notEqual(session.node, 'bl.zone.valve');

assert.equal(fs.readFileSync(path.join(__dirname, 'bl-legal-cleared.json'), 'utf8').includes('[object'), false);
assert.match(fs.readFileSync(path.join(__dirname, '../assets/app.js'), 'utf8'), /option-caption/);
assert.match(fs.readFileSync(path.join(__dirname, '../assets/app.js'), 'utf8'), /option-source/);

const gate = F.nodes['bl.gate.safety'];
const split = F.nodes['bl.gate.egg_split'];
const reset = F.nodes['bl.reset.check'];
function choice(node, id) { return node.options.find(o => o.id === id); }
function assertGasPair(node, gasId, eggId) {
  const gas = choice(node, gasId);
  const egg = choice(node, eggId);
  assert.equal(node.options.indexOf(egg), node.options.indexOf(gas) + 1, eggId + ' sits under the gas choice');
  assert.equal(gas.label, strings['L-46']);
  assert.equal(gas.hint, strings['L-46-hint']);
  assert.equal(gas.fact, strings['L-46-fact']);
  assert.match(gas.label, /rotten-egg smell in the air/);
  assert.match(gas.label, /gasoline, paint, or solvent/);
  assert.equal(gas.heatingTarget || gas.next, '@bl_gas_smell');
  assert.notEqual(gas.label, egg.label);
  assert.equal(egg.label, strings['L-46e']);
  assert.equal(egg.hint, strings['L-46h']);
  assert.equal(egg.fact, strings['L-46f']);
  assert.equal(egg.heatingTarget || egg.next, 'bl.gate.egg_split');
}
assert.equal(gate.options.length, 14, 'safety gate has 14 choices');
assertGasPair(gate, 'gas_smell_or_unknown_smell', 'egg_sulfur_smell');
assertGasPair(reset, 'reset_gas_smell', 'reset_egg_smell');
const relief = choice(gate, 'pressure_at_relief');
assert.equal(relief.caption, strings['L-7f']);
assert.equal(relief.source, strings['L-7f-source']);
assert.doesNotMatch(relief.label + ' ' + relief.fact, /30 psi|15 psi/);
assert.equal(split.title, strings['L-47']);
assert.equal(split.body, strings['L-47b']);
assert.deepEqual(split.options.map(o => o.id), ['override_hiss_pilot_headache', 'smell_in_air', 'not_sure', 'hot_water_only']);
for (const [id, label, hint, fact] of [
  ['override_hiss_pilot_headache', 'L-47a', 'L-47a-h', 'L-47a-f'],
  ['smell_in_air', 'L-47air', 'L-47air-h', 'L-47air-f'],
  ['not_sure', 'L-47n', 'L-47n-h', 'L-47n-f']
]) {
  const row = choice(split, id);
  assert.equal(row.label, strings[label], id);
  assert.equal(row.hint, strings[hint], id);
  assert.equal(row.fact, strings[fact], id);
  assert.equal(row.heatingTarget, '@bl_gas_smell', id);
  assert.notEqual(row.heatingTarget, '>bl_to_wh', id);
}
const tapOnly = choice(split, 'hot_water_only');
assert.equal(tapOnly.label, strings['L-47t']);
assert.equal(tapOnly.hint, strings['L-47t-h']);
assert.equal(tapOnly.fact, strings['L-47t-f']);
assert.equal(tapOnly.heatingTarget, '>bl_to_wh');
assert.equal(tapOnly.next, 'wh.gate.safety');
assert.notEqual(tapOnly.heatingTarget, '@bl_gas_smell');
assert.equal(F.results.bl_gas_smell.actions[1], strings['D-056a']);

function assertSplitOrder(node) {
  assert.deepEqual(node.options.map(o => o.id), ['override_hiss_pilot_headache', 'smell_in_air', 'not_sure', 'hot_water_only']);
  assert.equal(choice(node, 'hot_water_only').heatingTarget, '>bl_to_wh');
  assert.equal(choice(node, 'smell_in_air').heatingTarget, '@bl_gas_smell');
}
assertSplitOrder(split);
const plantedTap = JSON.parse(JSON.stringify(split));
choice(plantedTap, 'hot_water_only').heatingTarget = '@bl_gas_smell';
assert.throws(() => assertSplitOrder(plantedTap));
const plantedAir = JSON.parse(JSON.stringify(split));
choice(plantedAir, 'smell_in_air').heatingTarget = '>bl_to_wh';
choice(plantedAir, 'not_sure').heatingTarget = '>bl_to_wh';
choice(plantedAir, 'override_hiss_pilot_headache').heatingTarget = '>bl_to_wh';
assert.throws(() => assertSplitOrder(plantedAir));
const plantedLabel = JSON.parse(JSON.stringify(gate));
choice(plantedLabel, 'gas_smell_or_unknown_smell').label = 'Gas smell only';
assert.throws(() => assertGasPair(plantedLabel, 'gas_smell_or_unknown_smell', 'egg_sulfur_smell'));
const plantedReset = JSON.parse(JSON.stringify(reset));
plantedReset.options = plantedReset.options.filter(o => o.id !== 'reset_egg_smell');
assert.throws(() => assertGasPair(plantedReset, 'reset_gas_smell', 'reset_egg_smell'));

const enter = ['none_of_these', 'agree_18_terms', 'other_heat_or_ductless', 'boiler', 'co_no'];
session = go(...enter, 'gas_smell_or_unknown_smell');
assert.equal(session.result, 'bl_gas_smell');
assert.equal(F.presentResult(session).actions[1], strings['D-056a']);
assert.equal(F.viewNode('bl.gate.safety', session).body, strings['L-7']);

for (const branch of ['override_hiss_pilot_headache', 'smell_in_air', 'not_sure']) {
  session = go(...enter, 'egg_sulfur_smell');
  assert.equal(session.node, 'bl.gate.egg_split');
  assert.equal(F.viewNode(session.node, session).body, strings['L-47b']);
  reply(session, branch);
  assert.equal(session.result, 'bl_gas_smell', branch);
  assert.equal(session.product, 'bl', branch);
  assert.ok(!session.answers.some(a => a.node === 'wh.gate.safety'), branch);
}
session = go(...enter, 'egg_sulfur_smell', 'hot_water_only');
assert.notEqual(session.result, 'bl_gas_smell');
assert.equal(session.node, 'sw.co.fast_exit');
assert.equal(session.coReturn, 'wh.gate.safety');
assert.equal(session.bl.mode, 'dhw');
assert.equal(session.bl.hotTapOdor, true);
assert.equal(session.hwType, 'unknown');
reply(session, 'co_no');
assert.equal(session.node, 'wh.gate.safety');
assert.equal(session.product, 'wh');
assert.equal(session.whHotTapOdor, true);
assert.equal(session.whType, 'unknown');
assert.equal(session.bl.mode, 'dhw');
if (F.nodes['wh.gate.egg_split']) {
  reply(session, 'none_of_these');
  assert.equal(session.node, 'wh.gate.egg_split');
  if (F.nodes['wh.water_odor']) {
    reply(session, 'hot_water_only');
    assert.equal(session.node, 'wh.water_odor');
  }
}

session = go(...enter, 'none_of_these', 'combi', 'hazard_now', 'egg_sulfur_smell', 'hot_water_only');
assert.equal(session.node, 'sw.co.fast_exit');
reply(session, 'co_no');
assert.equal(session.node, 'wh.gate.safety');
assert.equal(session.hwType, 'combi');
assert.equal(session.whType, 'tankless');
assert.equal(session.bl.mode, 'dhw');

session = go(...['none_of_these', 'agree_18_terms', 'other_heat_or_ductless', 'water_heater', 'co_no'], 'none_of_these', 'none_of_these', 'tank', 'indirect', 'continue');
assert.equal(session.node, 'sw.co.fast_exit');
reply(session, 'co_no');
assert.equal(session.node, 'bl.gate.safety');
assert.equal(F.viewNode(session.node, session).body, strings['L-8']);
reply(session, 'egg_sulfur_smell');
reply(session, 'hot_water_only');
reply(session, 'co_no');
assert.equal(session.node, 'wh.gate.safety');
assert.equal(session.hwType, 'indirect');
assert.equal(session.whType, 'tank');

session = go(...base, 'hot_water_standard', 'fuel_gas', 'landing_code', 'nobody_at_risk', 'cold_no', 'code_ignition_flame', 'reset_gas_smell');
assert.equal(session.result, 'bl_gas_smell');
session = go(...base, 'hot_water_standard', 'fuel_gas', 'landing_code', 'nobody_at_risk', 'cold_no', 'code_ignition_flame', 'reset_egg_smell');
assert.equal(session.node, 'bl.gate.egg_split');
reply(session, 'smell_in_air');
assert.equal(session.result, 'bl_gas_smell');
session = go(...base, 'hot_water_standard', 'fuel_gas', 'landing_code', 'nobody_at_risk', 'cold_no', 'code_ignition_flame', 'reset_egg_smell', 'not_sure');
assert.equal(session.result, 'bl_gas_smell');
session = go(...base, 'hot_water_standard', 'fuel_gas', 'landing_code', 'nobody_at_risk', 'cold_no', 'code_ignition_flame', 'reset_egg_smell', 'override_hiss_pilot_headache');
assert.equal(session.result, 'bl_gas_smell');
session = go(...base, 'combi', 'fuel_gas', 'landing_code', 'nobody_at_risk', 'cold_no', 'code_ignition_flame', 'reset_egg_smell', 'hot_water_only');
assert.equal(session.node, 'sw.co.fast_exit');
assert.equal(session.hwType, 'combi');
reply(session, 'co_no');
assert.equal(session.node, 'wh.gate.safety');
assert.equal(session.whType, 'tankless');
assert.notEqual(session.result, 'bl_gas_smell');

console.log('Boiler legal checks passed: ' + ids.length + ' strings, ' + held.size + ' held.');
