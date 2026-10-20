'use strict';
const assert = require('assert/strict');
global.SW_CONFIG = { advancedRepairsEnabled: false, aiThermostatEnabled: false, mirrorsEnabled: false, stageLatchStepsEnabled: false, catalogEnabled: false, contentVersion: '2026-10-20.13' };
const F = require('../assets/flow');
const meta = { agreed: true, termsVersion: 'test' };
const ACTION2 = 'Don’t touch light switches or phones, or use lighters, matches, or anything that could spark or flame while you’re inside.';
const CO_LINE = 'If a CO alarm sounds or anyone feels sick, dizzy, or sleepy, get everyone outside and call 911.';
const REF = 'a licensed plumber or water heater professional';
const HAZARD = 'New gas smell, CO alarm, refrigerant leak alarm, smoke, sparks, leaking hot water or steam, or another hazard';

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
const fired = s => (s.audit || []).some(row => row.event === 'gate_fired:gas_co');
const rendered = shown => [shown.title, shown.explanation, shown.avoid, shown.source, shown.locked].concat(shown.actions || []).join('\n');
function gasShape(s) {
  const r = F.presentResult(s);
  return { title: r.title, explanation: r.explanation, actions: r.actions, avoid: r.avoid, tier: r.tier, outcome: r.outcome };
}

const plain = act(water(), 'none_of_these');
assert.equal(plain.node, 'wh.gate.warning_signs');
assert.equal(plain.whHotTapOdor, undefined);

const egg1 = act(water(), 'egg_sulfur_smell', 'hot_water_only', 'hot_only', 'yes', 'steady');
assert.equal(egg1.result, 'wh_water_odor');
assert.equal(egg1.whSoftener, true);
assert.equal(egg1.answers.find(a => a.node === 'wh.water_odor.softener' && a.choice === 'yes').fact, 'Water softener: yes (homeowner report).');
const egg1Shown = F.presentResult(egg1);
assert.equal(egg1Shown.reason, 'water_odor_pro');
assert.match(egg1Shown.explanation, /anode rod/);
assert.match(egg1Shown.explanation, new RegExp(REF));
assert.equal(egg1Shown.actions[0], 'If you smell rotten eggs in the air, not just from the hot water, leave the house now and call the gas utility or 911 from outside.');
assert.equal(egg1Shown.avoid, 'Don’t remove the anode or add bleach or other chemicals to the tank. Makers say the tank needs an anode.');
assert.doesNotMatch(egg1Shown.actions.join(' '), new RegExp(CO_LINE));
assert.equal(egg1Shown.proNote, undefined);

const egg2 = act(water(), 'egg_sulfur_smell', 'smell_in_air');
assert.equal(egg2.result, 'wh_gas_smell');
assert.equal(fired(egg2), true);

const egg3 = act(water(), 'egg_sulfur_smell', 'not_sure');
assert.equal(egg3.result, 'wh_gas_smell');
assert.equal(fired(egg3), true);

const egg4 = act(water(), 'egg_sulfur_smell', 'override_hiss_pilot_headache');
assert.equal(egg4.result, 'wh_gas_smell');
assert.equal(fired(egg4), true);

for (const extra of [[], ['not_sure'], ['hot_only'], ['hot_only', 'yes']]) {
  const egg5 = act(water(), 'egg_sulfur_smell', 'hot_water_only', ...extra, 'override_now');
  assert.equal(egg5.result, 'wh_gas_smell', extra.join(','));
  assert.equal(fired(egg5), true, extra.join(','));
}

const egg6 = act(water(), 'egg_sulfur_smell', 'hot_water_only', 'hot_and_cold');
assert.equal(egg6.result, 'wh_water_supply_odor');
assert.match(F.presentResult(egg6).explanation, /leave the house and call the gas utility or 911 from outside/);
assert.equal(F.presentResult(egg6).avoid, 'Don’t add bleach or other chemicals to the well, the water heater, or the pipes.');
assert.match(F.presentResult(egg6).locked, /anode rod/);

const egg7 = act(water(), 'egg_sulfur_smell', 'hot_water_only', 'not_sure', 'still_unsure');
assert.equal(egg7.result, 'wh_water_odor');
assert.equal(egg7.answers.at(-1).fact, 'Still unsure whether cold water smells (homeowner report).');

const egg8 = act(water(), 'none_of_these', 'none_of_these', 'tank', 'gas', 'smelly');
assert.equal(egg8.node, 'wh.gate.egg_split');
assert.equal(egg8.result, null);
assert.equal(egg8.whFuel, 'gas');

const egg9 = act(water(), 'none_of_these', 'none_of_these', 'tank', 'electric', 'smelly', 'hot_water_only', 'hot_only', 'no', 'fades');
assert.equal(egg9.result, 'wh_water_odor');
assert.equal(egg9.whFuel, 'electric');
assert.equal(F.presentResult(egg9).actions.includes(CO_LINE), false);

const egg10 = act(water(), 'none_of_these', 'none_of_these', 'tankless', 'gas', 'smelly', 'hot_water_only', 'hot_only', 'not_sure', 'steady');
assert.equal(egg10.whType, 'tankless');
const egg10Shown = F.presentResult(egg10);
assert.equal(egg10Shown.continueTo, undefined);
const egg10Text = rendered(egg10Shown);
assert.doesNotMatch(egg10Text, /anode/i);
assert.match(egg10Shown.explanation, /not gas/);
assert.equal(egg10Shown.avoid, 'Don’t add bleach or other chemicals to the water heater or open its cover.');
assert.match(egg10Shown.actions.join('\n'), new RegExp(CO_LINE));

const egg11 = act(water(), 'egg_sulfur_smell', 'hot_water_only', 'hot_only', 'yes', 'after_away');
egg11.whType = 'tank';
assert.equal(egg11.result, 'wh_water_odor');
assert.equal(F.presentResult(egg11).continueTo, '@wh_hydrogen_caution');
F.resume(egg11);
assert.equal(egg11.result, 'wh_hydrogen_caution');
assert.match(F.presentResult(egg11).title, /two weeks/);
assert.match(F.presentResult(egg11).source, /\[MANUAL\]/);
assert.doesNotMatch(F.presentResult(egg11).source, /\[n\]|\[Month/);

const egg12 = act(water(), 'gas_smell_or_unknown_smell');
assert.equal(egg12.result, 'wh_gas_smell');
assert.equal(egg12.answers.some(a => a.node === 'wh.gate.egg_split'), false);

const odorNodes = Object.entries(F.nodes).filter(([id]) => id.startsWith('wh.water_odor'));
const lintBits = [];
for (const [id, node] of Object.entries(F.nodes)) {
  if (id !== 'wh.gate.egg_split' && !id.startsWith('wh.water_odor')) continue;
  lintBits.push(node.title, node.body);
  for (const option of node.options) lintBits.push(option.label, option.hint, option.fact);
}
for (const id of ['wh_water_odor', 'wh_water_supply_odor', 'wh_hydrogen_caution', 'wh_hazard_now']) {
  const result = F.results[id];
  lintBits.push(result.title, result.explanation, result.explanationTank, result.explanationT, result.explanationNeutral, result.avoid, result.avoidTank, result.avoidT, result.avoidNeutral, result.locked, result.genericSource, result.source, result.coLine, result.proNote);
  lintBits.push(...(result.actions || []), ...Object.values(result.sources || {}));
}
for (const bit of lintBits.filter(Boolean)) {
  assert.doesNotMatch(bit, /\b(safe|safely|safer|safest)\b/i, bit.slice(0, 80));
  assert.doesNotMatch(bit, /\b\d+\s*(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?|\$)/i, bit.slice(0, 80));
  assert.doesNotMatch(bit, /\(POLICY\b|\bPOLICY\b|\bPL-[A-Z0-9]|\bD-0\d{2}\b/);
  if (/bleach/i.test(bit)) assert.match(bit, /^Don’t add bleach|^Don’t remove the anode or add bleach/);
}
assert.match(F.results.wh_water_odor.explanationTank, new RegExp(REF));
assert.match(F.results.wh_water_odor.explanationT, new RegExp(REF));
assert.match(F.results.wh_water_odor.explanationNeutral, new RegExp(REF));

for (const [id, node] of odorNodes) {
  assert.equal(node.options[0].id, 'override_now', id);
  assert.equal(node.options.at(-1).id, 'hazard_now', id);
  assert.equal(node.options.at(-1).label, HAZARD, id);
  assert.equal(node.options.at(-1).next, '@wh_hazard_now', id);
  const stopped = water();
  stopped.node = id;
  F.stop(stopped);
  assert.equal(stopped.coReturn, 'wh.gate.safety', id);
  F.answer(stopped, 'co_no', meta);
  assert.equal(stopped.node, 'wh.gate.safety', id);
}

const advancedWas = global.SW_CONFIG.advancedRepairsEnabled;
global.SW_CONFIG.advancedRepairsEnabled = true;
assert.equal(F.advancedEnabled(), true);
const seen = new Set();
const queue = [act(water(), 'egg_sulfur_smell')];
while (queue.length) {
  const current = queue.shift();
  const key = current.result || current.node;
  if (seen.has(key)) continue;
  seen.add(key);
  if (current.result) {
    const shown = F.presentResult(current);
    const steps = [shown.title, shown.explanation].concat(shown.actions || []).join('\n');
    assert.doesNotMatch(steps, /saniti[sz]/i, current.result);
    assert.doesNotMatch(steps, /\b(remove|replace|swap|install)\b[^.]{0,40}\banode\b/i, current.result);
    continue;
  }
  const view = F.viewNode(current.node, current);
  const blob = [view.title, view.body, view.step].concat(view.options.map(option => [option.label, option.hint, option.next].join(' '))).join('\n');
  assert.doesNotMatch(blob, /saniti[sz]/i, current.node);
  assert.doesNotMatch(blob, /\b(remove|replace|swap|install)\b[^.]{0,48}\banode\b/i, current.node);
  for (const option of view.options) {
    if (option.disabled) continue;
    const next = F.create('', 'test');
    Object.assign(next, JSON.parse(JSON.stringify(current)));
    F.answer(next, option.id, meta);
    queue.push(next);
  }
}
global.SW_CONFIG.advancedRepairsEnabled = advancedWas;

const alias = water();
alias.result = 'wh_smelly_hot_water';
alias.node = null;
F.normalizeSession(alias);
assert.equal(alias.result, null);
assert.equal(alias.node, 'wh.gate.egg_split');
assert.equal(alias.product, 'wh');

const air = gasShape(egg12);
for (const path of [
  ['egg_sulfur_smell', 'override_hiss_pilot_headache'],
  ['egg_sulfur_smell', 'smell_in_air'],
  ['egg_sulfur_smell', 'not_sure'],
  ['egg_sulfur_smell', 'hot_water_only', 'override_now']
]) assert.deepEqual(gasShape(act(water(), ...path)), air);
const hazard = act(water(), 'egg_sulfur_smell', 'hot_water_only', 'hazard_now');
assert.equal(hazard.result, 'wh_hazard_now');
assert.notEqual(gasShape(hazard).title, air.title);

const egg18 = act(water(), 'gas_smell_or_unknown_smell');
assert.equal(egg18.result, 'wh_gas_smell');
assert.equal(egg18.answers.some(a => a.node === 'wh.gate.egg_split'), false);
assert.match(F.nodes['wh.gate.safety'].options.find(o => o.id === 'gas_smell_or_unknown_smell').label, /rotten-egg smell in the air/);

function odorHandoff(hwType) {
  const s = water();
  assert.equal(s.node, 'wh.gate.safety');
  s.whHotTapOdor = true;
  s.hwType = hwType;
  F.answer(s, 'none_of_these', meta);
  assert.equal(s.node, 'wh.gate.egg_split');
  F.answer(s, 'hot_water_only', meta);
  assert.equal(s.node, 'wh.water_odor');
  act(s, 'hot_only', 'yes', 'steady');
  return F.presentResult(s);
}
const combi = odorHandoff('combi');
assert.doesNotMatch(rendered(combi), /anode/i);
assert.match(combi.explanation, /not gas/);
const indirect = odorHandoff('indirect');
assert.match(indirect.explanation, /anode rod/);
assert.match(indirect.locked, /anode rod/);
const missing = odorHandoff('');
assert.doesNotMatch(rendered(missing), /anode/i);
assert.match(missing.explanation, /check the water heater/);
assert.doesNotMatch(missing.explanation, /not gas/);
const stillGas = water();
stillGas.whHotTapOdor = true;
stillGas.hwType = 'combi';
F.answer(stillGas, 'gas_smell_or_unknown_smell', meta);
assert.equal(stillGas.result, 'wh_gas_smell');
assert.equal(stillGas.answers.some(a => a.node === 'wh.gate.egg_split'), false);

const dhw = act(boiler(), 'none_of_these', 'hot_water_standard', 'fuel_gas', 'landing_no_hot_water', 'dhw_combi', 'co_no');
assert.equal(dhw.node, 'wh.gate.safety');
F.answer(dhw, 'none_of_these', meta);
assert.equal(dhw.node, 'wh.gate.warning_signs');

const split = F.nodes['wh.gate.egg_split'];
assert.deepEqual(split.options.map(o => o.id), ['override_hiss_pilot_headache', 'smell_in_air', 'not_sure', 'hot_water_only']);
assert.equal(split.safetyGate, true);
assert.equal(split.notice, undefined);
assert.equal(split.options.at(-1).label, 'Only when hot water runs from a faucet; cold water and the air smell fine.');
assert.doesNotMatch(split.title + '\n' + split.body, /anode|softener|water odor/i);
assert.equal(F.nodes['wh.gate.safety'].options[0].id, 'gas_smell_or_unknown_smell');
assert.equal(F.nodes['wh.gate.safety'].options[1].id, 'egg_sulfur_smell');
assert.equal(F.nodes['wh.tank.landing'].options.find(o => o.id === 'smelly').label, 'Hot water smells like rotten eggs or sulfur');
assert.equal(F.nodes['wh.tankless.landing'].options.find(o => o.id === 'smelly').next, 'wh.gate.egg_split');

assert.doesNotMatch(F.results.wh_water_odor.title, /not a gas leak/i);
for (const source of Object.values(F.results.wh_water_odor.sources).concat([F.results.wh_hydrogen_caution.source])) {
  if (/\d/.test(source)) assert.match(source, /\[MANUAL\]/, source);
}

assert.equal(F.results.wh_gas_smell.actions[1], ACTION2);
assert.equal(F.results.wh_gas_smell.actions[0], 'Leave the house now and call the gas utility or 911 from outside.');
assert.equal(F.results.wh_gas_smell.actions[2], 'Wait for emergency responders to say you may return.');
assert.doesNotMatch(JSON.stringify(F.results.wh_gas_smell), /WH-PL-100|D-056/);
assert.equal(F.presentResult(egg12).actions[1], ACTION2);

console.log('Egg-smell checks passed.');
