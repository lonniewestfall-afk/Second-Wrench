'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
global.SW_CONFIG = { advancedRepairsEnabled: false, aiThermostatEnabled: false, mirrorsEnabled: false, stageLatchStepsEnabled: false, contentVersion: '2026-10-13.1' };
const F = require('../assets/flow');
const meta = { agreed: true, termsVersion: 'test' };
function go(choices) {
  const s = F.create('', 'test');
  for (const c of choices) {
    if (s.result) throw new Error('ended at ' + s.result + ' before ' + c);
    F.answer(s, c, meta);
  }
  return s;
}
const gate = ['none_of_these', 'agree_18_terms'];

// Water heater: the steam choice reaches the emergency result.
const whGate = F.nodes['wh.gate.safety'];
const steam = whGate.options.find(o => o.id === 'hot_water_or_steam');
assert.equal(steam && steam.next, '@hot_water_steam');
assert.ok(whGate.options.findIndex(o => o.id === 'refrigerant_alarm') < whGate.options.findIndex(o => o.id === 'unsure'));
const wh = go(gate.concat(['other_heat_or_ductless', 'water_heater', 'hot_water_or_steam']));
assert.equal(wh.result, 'hot_water_steam');
assert.equal(F.results.hot_water_steam.tier, 'Emergency');
assert.equal(F.results.hot_water_steam.outcome, 'emergency_exit');

// Side discharge strings match the Legal-cleared copy.
const sdSrc = fs.readFileSync(path.join(__dirname, 'compose-side-discharge.js'), 'utf8');
assert.match(sdSrc, /new Set\(/);
assert.doesNotMatch(sdSrc, /safetyGate\s*[:=][^\n]*\.test\(/);
const LINE_012 = 'Stop. Running an iced-up outdoor unit can damage it. If your thermostat doesn’t have an Emergency Heat setting, turn the system Off at the thermostat. Let the ice melt on its own. Don’t chip ice, pour hot water on it, or try to speed up the defrost. If the house is getting cold, call a licensed HVAC professional. If it’s dangerously cold and anyone is at risk, get them somewhere warm first.';
const PL = 'A normal defrost usually lasts about 5 to 15 minutes, and some models finish sooner. Ice that is still there after about an hour of running is not normal. Call a licensed HVAC professional.';
const iceStop = F.results.sd_ice_heat_stop;
const iceText = [iceStop.title, iceStop.explanation].concat(iceStop.actions || [], iceStop.avoid || '').join('\n');
assert.ok(iceText.includes(LINE_012), 'sd ice stop keeps line 012');
assert.doesNotMatch(iceText, /\bAUX\b|Aux Heat/);
for (const id of ['sd_code_info_pro', 'sd_defrost_looked_normal']) {
  const text = JSON.stringify(F.results[id]);
  assert.ok(text.includes(PL), id);
}
assert.ok(F.nodes['hp.defrost.sanity'].body.includes(PL));
const banned = /must remain above|World Health Organization|qualified refrigerant technician/;
for (const [id, node] of Object.entries(F.nodes)) {
  if (!id.startsWith('sd.')) continue;
  assert.equal(node.safetyGate, [
    'sd.heat.cold_home_screen', 'sd.gate.outdoor_hazard_screen', 'sd.gate.intent_screen',
    'sd.observe.defrost_or_ice', 'sd.look.intake_clearance', 'sd.look.snow_height',
    'sd.step.clear_outside', 'sd.step.clear_snow', 'sd.read.code_compare'
  ].includes(id), id);
  assert.doesNotMatch(JSON.stringify(node), banned);
}
for (const [id, res] of Object.entries(F.results)) {
  if (!id.startsWith('sd_')) continue;
  assert.doesNotMatch(JSON.stringify(res), banned);
}
const hazardOpt = Object.values(F.nodes).flatMap(n => n.options || []).find(o => o.id === 'hazard_now' && String(o.next || '').indexOf('sd.') === 0);
assert.ok(hazardOpt, 'side-discharge hazard choice exists');
assert.match(hazardOpt.label, /^Something unsafe is happening now/);
assert.match(hazardOpt.hint, /Stop checking/);

// Boiler Stop stays on a boiler hazard screen, and None keeps boiler context.
const boiler = go(gate.concat(['other_heat_or_ductless', 'boiler', 'none_of_these', 'hot_water_standard', 'fuel_gas']));
boiler.result = 'bl_call_pro';
boiler.node = null;
F.stop(boiler);
assert.equal(boiler.node, 'bl.gate.safety');
assert.equal(boiler.heatingHazardReported, false);
const ids = F.viewNode(boiler.node, boiler).options.map(o => o.id);
for (const id of ['pressure_at_relief', 'steam_glass_empty', 'bang_or_puffback', 'soot_scorch_flame']) {
  assert.ok(ids.includes(id), id);
}
F.answer(boiler, 'none_of_these', meta);
assert.equal(boiler.product, 'bl');
assert.ok(!boiler.result || String(boiler.result).startsWith('bl_'));
assert.ok(!boiler.node || boiler.node.startsWith('bl.') || boiler.node.startsWith('sw.'));
const refrig = F.nodes['bl.gate.safety'].options.find(o => o.id === 'refrigerant_alarm');
assert.equal(refrig.next, '@bl_refrigerant_alarm');
assert.notEqual(refrig.next, '@leak');

// Heat pump no-heat mild and not-sure answers hit the cold-home screen first.
for (const band of ['band_mild_warm', 'not_sure_ambient']) {
  const s = go(gate.concat(['heat_pump', 'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off', band]));
  assert.equal(s.node, 'hp.heat.cold_home_screen', band);
}
const both = go(gate.concat(['heat_pump', 'air_source_ducted_hp', 'landing_both_modes_fail', 'mode_matches_complaint', 'emergency_already_off', 'not_sure_ambient']));
assert.equal(both.node, 'hp.heat.cold_home_screen');

// No AC breaker reset is reachable while the session is still side discharge.
const sd = go(gate.concat(['cooling_only_ac', 'split_central_cool_only', 'landing_not_cooling', 'mode_cool_setpoint_ok', 'filter_clean_ok', 'clean_restart_ready', 'filter_settings_restored', 'fan_on_side', 'mode_cool', 'none_of_these']));
assert.equal(sd.product, 'sd');
const blocked = ['@breaker_reset_basic', 'ac.cool.power.breaker_reset_gate', 'ac.cool.power.seasonal_restore_step', '@breaker_seasonal_restore_basic'];
function walk(state, depth, seen) {
  if (!state || state.result || depth > 8) return;
  const view = F.viewNode(state.node, state);
  if (!view) return;
  for (const op of view.options) {
    if (op.disabled) continue;
    const key = state.node + '/' + op.id;
    if (seen.has(key)) continue;
    seen.add(key);
    const next = JSON.parse(JSON.stringify(state));
    try { F.answer(next, op.id, meta); } catch (e) { continue; }
    assert.ok(!blocked.includes(next.node) && !blocked.includes(next.result && ('@' + next.result)), 'SD reached ' + (next.node || next.result) + ' via ' + key);
    if (next.product === 'sd') walk(next, depth + 1, seen);
  }
}
walk(sd, 0, new Set());

// Filter restart stays reachable from a clean filter answer.
const filter = go(gate.concat(['cooling_only_ac', 'split_central_cool_only', 'landing_not_cooling', 'mode_cool_setpoint_ok', 'filter_clean_ok']));
assert.equal(filter.node, 'ac.cool.filter.clean_restart');

console.log('review 2026-10-13 regressions passed');
