/* A1–A14 for the one-reset breaker branch and the heat-pump redirect. */
'use strict';
globalThis.SW_CONFIG = {
  advancedRepairsEnabled: false,
  aiThermostatEnabled: false,
  mirrorsEnabled: false,
  stageLatchStepsEnabled: false,
  contentVersion: 'breaker-reset',
  breakerResetOnceEnabled: true
};
const path = require('path');
const F = require(path.join(__dirname, '../assets/flow.js'));
const META = { agreed: true, termsVersion: 'public-beta-test' };
let failed = 0;
function assert(cond, id, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', id, msg);
  }
}
function go(choices) {
  const s = F.create('', 'test');
  for (const c of choices) {
    if (s.result) throw new Error('ended early at ' + s.result + ' before ' + c);
    if (s.node === 'sw.co.fast_exit' && c !== 'co_yes' && c !== 'co_no') F.answer(s, 'co_no', META);
    F.answer(s, c, META);
  }
  return s;
}
const GATE = ['none_of_these', 'agree_18_terms'];
const toHub = GATE.concat(['cooling_only_ac', 'split_central_cool_only', 'landing_will_not_start', 'outdoor_silent', 'begin_breaker_then_disconnect']);
const toGate = toHub.concat(['breaker_tripped_or_off']);
const heatToOutdoor = GATE.concat(['heat_pump', 'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off', 'band_mild_warm', 'cold_home_holding', 'no_heat_at_all', 'outdoor_not_running_when_should']);

function textOf(o) {
  return JSON.stringify(o);
}

// A1
SW_CONFIG.breakerResetOnceEnabled = false;
{
  const s = go(toGate);
  const v = F.viewNode(s.node, s);
  assert(s.node === 'ac.cool.power.breaker_reset_gate', 'A1', 'gate still opens for AC');
  assert(!v.options.some(o => o.id === 'breaker_tripped_first_time' || o.id === 'breaker_off_seasonal_by_me'), 'A1', 'flag off hides both reset choices');
  assert(!/You can reset it once only if all of these are true/.test(v.body), 'A1', 'flag off hides the reset paragraph');
  assert(/Don’t open the disconnect box or touch any fuses\./.test(v.body), 'A1', 'flag off keeps the disconnect line');
  let blocked = false;
  try { F.answer(JSON.parse(JSON.stringify(s)), 'breaker_tripped_first_time', META); } catch (e) { blocked = true; }
  assert(blocked, 'A1', 'hidden first-time choice is not a route');
  for (const o of v.options) {
    const t = JSON.parse(JSON.stringify(s));
    F.answer(t, o.id, META);
    assert(t.result !== 'breaker_reset_basic' && t.result !== 'breaker_seasonal_restore_basic', 'A1', o.id + ' reached a reset result');
  }
}
SW_CONFIG.breakerResetOnceEnabled = true;

// A2
{
  const s = go(toGate.concat(['breaker_tripped_first_time']));
  assert(s.node === 'ac.cool.power.breaker_reset_step' && s.reset_count === 0, 'A2', 'notice comes before the count changes');
  const notice = F.viewNode(s.node, s);
  assert(notice && notice.noticePrompt && !notice.warrantyPrompt, 'A2', 'pn-v1 notice is waiting and the warranty block is not');
  F.acknowledgeStep(s);
  const ack = s.notices && s.notices.breaker_ac_outdoor;
  assert(ack && ack.notice_ack === true && ack.version === 'pn-v1' && ack.at, 'A2', 'notice ack stores pn-v1 and the time');
  F.answer(s, 'show_reset', META);
  assert(s.result === 'breaker_reset_basic' && s.reset_count === 1, 'A2', 'display of the one reset sets the count to 1, got ' + s.result + ' ' + s.reset_count);
  assert(/won’t stay on/.test(F.presentResult(s).explanation), 'A2', 'the reset result leads with the breaker sentence');
}

// A3
{
  const s = go(toGate);
  s.reset_count = 1;
  const v = F.viewNode(s.node, s);
  for (const id of ['breaker_tripped_first_time', 'breaker_off_seasonal_by_me']) {
    const op = v.options.find(o => o.id === id);
    assert(op && op.next === '@breaker_retrip_pro', 'A3', id + ' still offers a second reset');
    const t = JSON.parse(JSON.stringify(s));
    F.answer(t, id, META);
    assert(t.result === 'breaker_retrip_pro' && t.reset_count === 1, 'A3', id + ' -> ' + t.result + ' count ' + t.reset_count);
  }
}

// A4
{
  const s = go(toGate.concat(['breaker_tripped_first_time']));
  F.acknowledgeStep(s);
  F.answer(s, 'show_reset', META);
  const count = s.reset_count;
  F.stop(s);
  assert(s.reset_count === count && count === 1, 'A4', 'stop lowered the count');
  F.answer(s, 'co_no', META);
  assert(s.reset_count === count, 'A4', 're-entry lowered the count');
  s.product = 'fn';
  s.product = 'ac';
  assert(s.reset_count === count, 'A4', 'a lane change lowered the count');
}

// A5
{
  const warn = go(toGate.concat(['breaker_panel_warning']));
  assert(warn.result === 'breaker_unsafe_stop', 'A5', 'panel warning -> ' + warn.result);
  const again = go(toHub.concat(['breaker_tripped_again']));
  assert(again.result === 'breaker_retrip_pro', 'A5', 'tripped again -> ' + again.result);
  const already = go(toGate.concat(['breaker_already_reset']));
  assert(already.result === 'breaker_retrip_pro', 'A5', 'already reset -> ' + already.result);
  const disconnect = go(toHub.concat(['breaker_on_confirmed']));
  const opt = F.viewNode(disconnect.node, disconnect).options.find(o => o.id === 'breaker_tripped_again');
  assert(opt && opt.next === '@breaker_retrip_pro', 'A5', 'disconnect visual lacks the tripped-again choice');
}

// A6–A14 heat-pump redirect
function triggerState(which) {
  const s = go(toHub.slice(0, -1));
  s.origin_lane = null;
  s.equipment = null;
  s.hpOutdoorNotRunning = false;
  s.product = 'ac';
  if (which === 'origin_lane') s.origin_lane = 'hp';
  if (which === 'equipment') s.equipment = 'heat_pump';
  if (which === 'hpOutdoorNotRunning') s.hpOutdoorNotRunning = true;
  return s;
}
for (const which of ['origin_lane', 'equipment', 'hpOutdoorNotRunning']) {
  const s = triggerState(which);
  const before = s.reset_count;
  F.answer(s, 'begin_breaker_then_disconnect', META);
  assert(s.result === 'hp_outdoor_not_running_wave1' && !s.node, 'A11', which + ' did not redirect, got ' + (s.node || s.result));
  assert(s.reset_count === before, 'A10', which + ' wrote reset_count');
  assert(F.viewNode('ac.cool.power.breaker_visual', s) === null, 'A14', which + ' still renders breaker_visual');
  assert(F.viewNode('ac.cool.power.breaker_reset_gate', s) === null, 'A14', which + ' still renders the gate');
  const forced = triggerState(which);
  forced.node = 'ac.cool.power.breaker_reset_gate';
  forced.reset_count = 2;
  F.answer(forced, 'breaker_tripped_first_time', META);
  assert(forced.result === 'hp_outdoor_not_running_wave1' && forced.reset_count === 2, 'A6', which + ' reset choice rendered a reset');
  assert(forced.result !== 'breaker_reset_basic' && forced.result !== 'breaker_seasonal_restore_basic', 'A9', which + ' reached a reset result');
}
SW_CONFIG.breakerResetOnceEnabled = false;
{
  const s = triggerState('origin_lane');
  F.answer(s, 'begin_breaker_then_disconnect', META);
  assert(s.result === 'hp_outdoor_not_running_wave1', 'A9', 'flag off still rendered a breaker node for HP');
  assert(F.viewNode('ac.cool.power.breaker_visual', s) === null && F.viewNode('ac.cool.power.breaker_reset_gate', s) === null, 'A14', 'flag off rendered a breaker node');
}
SW_CONFIG.breakerResetOnceEnabled = true;

{
  const heat = go(heatToOutdoor);
  assert(heat.result === 'hp_outdoor_not_running_wave1', 'A13', 'heat outdoor-silent edge -> ' + (heat.node || heat.result));
  assert(!heat.answers.some(a => a.node === 'ac.cool.power.breaker_visual' || a.node === 'ac.cool.power.breaker_reset_gate'), 'A13', 'an edge entered a breaker node');
  const coldAt = heat.answers.findIndex(a => a.node === 'hp.heat.cold_home_screen');
  assert(coldAt >= 0, 'A7', 'heat mode did not reach cold_home');
  const shown = F.presentResult(heat);
  const cold = F.nodes['hp.heat.cold_home_screen'];
  assert(shown.explanation.indexOf(cold.title) === 0 && shown.explanation.indexOf(cold.body) > 0 && shown.explanation.indexOf(cold.body) < shown.explanation.indexOf('You can look at the breaker door'), 'A12', 'cold-home content is not first on the heat-mode result');
  const cool = go(GATE.concat(['heat_pump', 'air_source_ducted_hp', 'landing_no_cool', 'mode_matches_complaint', 'emergency_already_off', 'band_mild_warm', 'leaving_air_matches_mode']));
  assert(cool.node !== 'ac.cool.power.breaker_visual', 'A7', 'cooling path was not the control');
}

// A8
{
  const ids = ['ac.cool.power.breaker_visual', 'ac.cool.power.breaker_reset_gate', 'ac.cool.power.breaker_reset_step', 'ac.cool.power.seasonal_restore_step'];
  const blobs = ids.map(id => textOf(F.nodes[id])).concat(['breaker_reset_basic', 'breaker_seasonal_restore_basic', 'breaker_retrip_pro', 'breaker_unsafe_stop'].map(id => textOf(F.results[id])));
  const blob = blobs.join('\n');
  const cover = blob.match(/[^.]{0,80}panel(?:’s|\\u2019s)? cover[^.]{0,40}/gi) || [];
  cover.forEach(bit => {
    const ok = /Never open the panel cover|Leave the panel’s cover on|panel’s cover stays on|panel’s own cover stays on|Don’t[^.]{0,90}(?:remove|open) the panel cover/.test(bit);
    assert(ok, 'A8', 'unexpected panel-cover line: ' + bit);
  });
  const openDisconnect = /open the disconnect (?:box|door)/gi;
  const hits = blob.match(openDisconnect) || [];
  hits.forEach(hit => {
    const at = blob.indexOf(hit);
    const window = blob.slice(Math.max(0, at - 40), at + hit.length);
    assert(/Never |Don’t |Do not |does not tell/.test(window), 'A8', 'instruction to open the disconnect: ' + window);
  });
}

console.log('breaker reset asserts: ' + failed + ' failures');
process.exitCode = failed ? 1 : 0;
