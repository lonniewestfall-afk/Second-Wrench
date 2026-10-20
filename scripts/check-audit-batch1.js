/* Independent audit regression walk. Adapted from the handed-off batch-1 assertions.
 * D-026 and the final HVAC rulings supersede the draft thermostat ids and breaker route.
 * Run locally: node scripts/check-audit-batch1.js. No network or deployment. */
'use strict';
globalThis.SW_CONFIG = { advancedRepairsEnabled: false, aiThermostatEnabled: false, mirrorsEnabled: false, stageLatchStepsEnabled: false, contentVersion: 'batch1', breakerResetOnceEnabled: true };
const fs = require('fs'), path = require('path');
const ROOT = process.env.SW_ROOT || path.join(__dirname, '..');
const F = require(path.join(ROOT, 'assets/flow.js'));
const appText = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
const cssText = fs.readFileSync(path.join(ROOT, 'assets/styles.css'), 'utf8');
const META = { agreed: true, termsVersion: 'public-beta-test' };
let failed = 0; const fails = {};
function assert(cond, id, msg) { if (!cond) { failed++; fails[id] = (fails[id] || 0) + 1; if (fails[id] <= 3) console.error('FAIL', id, msg); } }
const GATE = ['none_of_these', 'agree_18_terms'];
function go(choices, mode) { const s = F.create('', mode || 'test'); for (const c of choices) { if (s.result) throw new Error('ended early at ' + s.result + ' before ' + c); if (s.node === 'sw.co.fast_exit' && c !== 'co_yes' && c !== 'co_no') F.answer(s, 'co_no', META); F.answer(s, c, META); } return s; }
function tryGo(choices, mode) { try { return go(choices, mode); } catch (e) { return { error: e.message, result: null, node: null, answers: [] }; } }
function textOf(o) { const out = []; (function rec(x) { if (typeof x === 'string') out.push(x); else if (Array.isArray(x)) x.forEach(rec); else if (x && typeof x === 'object') for (const k in x) if (!['next', 'id', 'reason', 'gate', 'source', 'outcome', 'diyTier', 'tier', 'continueTo'].includes(k)) rec(x[k]); })(o); return out.join('\n'); }
const ALL_TEXT = Object.keys(F.nodes).filter(id => !id.startsWith('ac.adv.')).map(id => [id, textOf(F.nodes[id])]).concat(Object.keys(F.results).map(id => [id, textOf(F.results[id])]));
// Reachability sweep (same dedupe as the audit harness).
function sweep() {
  const KEYN = /filter\.check|ac_filter_airflow|breaker|gate|hazard/;
  const key = s => { if(s.result)return JSON.stringify([s.result,s.product,s.hpLanding,s.msLanding,s.fnFuel,s.tsModel]); const c = Object.assign({}, s); ['answers', 'audit', 'id', 'startedAt', 'consentAt'].forEach(k => delete c[k]); if(c.notices)c.notices=Object.keys(c.notices).sort();return JSON.stringify(c) + '|' + [...new Set(s.answers.filter(a => KEYN.test(a.node)).map(a => a.node + ':' + a.choice))].sort().join(','); };
  const clone = s => { const c = JSON.parse(JSON.stringify(s)); c.audit = []; return c; };
  const start = F.create('', 'test'); const seen = new Set([key(start)]); const q = [start]; const results = {}, nodes = {};
  while (q.length) { const s = q.shift(); if (s.result) { if (!results[s.result]) results[s.result] = s; continue; } if (!nodes[s.node]) nodes[s.node] = s;
    if(['fn','bl','wh','ms','sd'].includes(s.product)) continue; // New lanes have their own exhaustive walk.
    const v = F.viewNode(s.node, s); if(v.noticePrompt){const t=clone(s);F.acknowledgeStep(t);const k=key(t);if(!seen.has(k)){seen.add(k);q.push(t);}} for (const o of v.options) { const t = clone(s); try { F.answer(t, o.id, META); } catch (e) { continue; } const k = key(t); if (!seen.has(k)) { seen.add(k); q.push(t); } } }
  return { results, nodes, stateCount: seen.size };
}
const R = sweep();
// The global Stop control must escalate from every compiled result, including
// lanes walked separately and defensive results not normally reachable.
for(const id of Object.keys(F.results)){const s=F.create('','test');s.result=id;s.node=null;F.stop(s);assert(s.node==='sw.co.fast_exit'&&!s.result,'B1-A01-all',id+' cannot escalate');F.answer(s,'co_no',META);assert(s.node==='ac.gate.cluster_entry','B1-A01-all',id+' did not return to hazards');F.answer(s,'hazard_gas_co',META);assert(s.result==='gas','B1-A01-all',id+' did not reach gas response');}
const URGENT = ['Emergency', 'Stop / professional'];
const REACH_TEXT = Object.keys(R.nodes).map(id => [id, textOf(F.viewNode(id, R.nodes[id]))]).concat(Object.entries(R.results).map(([id, s]) => [id, textOf(F.presentResult(s))]));
const MS = ['cooling_only_ac', 'ductless_mini_split', 'ductless_single_zone'];
const TS = ['other_heat_or_ductless', 'thermostat_settings', 'ts_none_of_these', 'brand_honeywell_buttons', 'hw_focuspro'];

// B1-A01 Stop from every reachable result AND question reaches the hazard screen; urgent results keep no-DIY.
for (const [id, s0] of Object.entries(R.results).concat(Object.entries(R.nodes))) {
  const s = JSON.parse(JSON.stringify(s0)); const wasUrgent = !!(s.result && URGENT.includes(F.results[s.result].tier));
  F.stop(s);
  const v = s.node && F.viewNode(s.node, s);
  const hazards = ['co_yes', 'co_no'];
  assert(!s.result && s.node === 'sw.co.fast_exit' && v && hazards.every(h => v.options.some(o => o.id === h)), 'B1-A01', 'stop() from ' + id + ' did not open the CO screen');
  if (wasUrgent) { const t = JSON.parse(JSON.stringify(s)); F.answer(t, 'co_no', META); if (t.node === 'ac.gate.cluster_entry') { F.answer(t, 'none_of_these', META); assert(t.result && t.result !== null && !t.node, 'B1-A01b', 'after urgent ' + id + ', none_of_these must end at a no-DIY result, got node ' + t.node); } }
}
// B1-A02 No string claims Aux stops the outdoor unit / no "Emergency or Aux Heat" instruction.
REACH_TEXT.forEach(([id, t]) => { assert(!/Emergency or Aux Heat/i.test(t), 'B1-A02', id + ' still says "Emergency or Aux Heat"'); assert(!/Aux[^.]{0,40}stops the outdoor unit/i.test(t), 'B1-A02', id + ' says Aux stops the outdoor unit'); });
{ const n = F.nodes['hp.mode.emergency_aux_off']; assert(n && /AUX light|Aux light/i.test(n.body) && n.options.some(o => o.id === 'em_set_on_purpose_by_someone'), 'B1-A02b', 'hp.mode.emergency_aux_off must split the AUX light from the EM mode and ask about intentional EM'); }
// B1-A03 ts.settings.em_aux_heat asks "on purpose?" before telling anyone to switch back.
{ const n = F.nodes['ts.settings.em_aux_check']; assert(n && !/^1\. Switch the mode from emergency heat back to Heat/m.test(n.body) && n.options.some(o => o.id === 'eh_tech_left_on'), 'B1-A03', 'ts em_aux_heat must ask intentional-EM first');
  const s = tryGo(GATE.concat(TS.slice(0, 3), ['brand_honeywell_buttons', 'hw_focuspro', 'landing_em_aux_heat', 'eh_tech_left_on']));
  assert(s.result === 'ts_eheat_keep_pro', 'B1-A03b', 'intentional EM must end at ts_eheat_keep_pro, got ' + (s.result || s.error)); }
// B1-A04 Grille debris is a pro handoff; no "kill power"/"verify Off" anywhere public.
{ const s = tryGo(GATE.concat(['cooling_only_ac', 'split_central_cool_only', 'landing_not_cooling', 'mode_cool_setpoint_ok', 'filter_clean_ok', 'clean_restart_ready', 'filter_settings_restored', 'fan_spinning', 'need_reach_into_grille']));
  assert(s.result && F.results[s.result].outcome === 'call_pro', 'B1-A04', 'need_reach_into_grille must be call_pro, got ' + s.result); }
REACH_TEXT.forEach(([id, t]) => assert(!/\bkill (outdoor )?power\b|\bverify off\b|reach past the grille/i.test(t), 'B1-A04b', id + ' contains kill-power / verify-Off / reach-past-grille language'));
// B1-A05 Breaker: tripped -> gate node; intentional/unknown/already-reset -> pro; re-trip stated; same from HP.
{ const base = GATE.concat(['cooling_only_ac', 'split_central_cool_only', 'landing_will_not_start', 'outdoor_silent', 'begin_breaker_then_disconnect', 'breaker_tripped_or_off']);
  const s = tryGo(base); assert(s.node === 'ac.cool.power.breaker_reset_gate', 'B1-A05', 'breaker_tripped_or_off must reach ac.cool.power.breaker_reset_gate, got ' + (s.node || s.result || s.error));
  for (const [c, want] of [['breaker_off_on_purpose_or_unknown', 'breaker_off_unexplained_pro'], ['breaker_already_reset', 'breaker_retrip_pro'], ['breaker_panel_warning', 'breaker_unsafe_stop']]) { const t = tryGo(base.concat([c])); assert(t.result === want, 'B1-A05', c + ' -> ' + want + ', got ' + (t.result || t.error)); }
  const first = tryGo(base.concat(['breaker_tripped_first_time']));
  assert(first.node === 'ac.cool.power.breaker_reset_step', 'B1-A05', 'first trip opens the notice before the one reset, got ' + (first.node || first.result || first.error));
  const seasonal=go(base.concat(['breaker_off_seasonal_by_me']));assert(seasonal.node==='ac.cool.power.seasonal_restore_step'&&F.viewNode(seasonal.node,seasonal).warrantyPrompt,'B1-A05s','seasonal restoration requires installer question before notice and steps');
  const once = F.results.breaker_reset_basic; assert(once && /trips again/i.test(textOf(once)) && /only once|one time/i.test(textOf(once)), 'B1-A05b', 'one-reset result must say once only and re-trip -> pro');
  const hp = tryGo(GATE.concat(['heat_pump', 'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off', 'band_mild_warm', 'cold_home_holding', 'no_heat_at_all', 'outdoor_not_running_when_should']));
  assert(hp.result === 'hp_outdoor_not_running_wave1' && !hp.node, 'B1-A05c', 'HP path redirects before the breaker gate, got ' + (hp.node || hp.result || hp.error)); }
// B1-A06 Mode/context preservation.
{ const heat = go(GATE.concat(MS, ['landing_no_heat', 'heat_settings_right_still_problem', 'defrost_seen_heat_still_weak', 'filter_cleaned_recently', 'blocker_moved', 'not_sure_result']));
  const p = F.presentResult(heat); assert(!/Run Cool/.test(textOf(p)) && /Heat/.test(p.actions.join(' ')), 'B1-A06', 'ms_airflow_unsure on no_heat path still says Run Cool');
  const cool = go(GATE.concat(MS, ['landing_no_cool', 'settings_right_still_problem', 'filter_cleaned_recently', 'blocker_moved']));
  assert(!F.viewNode(cool.node, cool).options.some(o => o.id === 'air_ok_not_heating'), 'B1-A06b', 'cooling landing must not offer air_ok_not_heating');
  const out = go(GATE.concat(MS, ['landing_outdoor_unit', 'ctx_mode_unsure', 'outdoor_running_still_problem']));
  assert(!/basic checks are done/i.test(textOf(F.presentResult(out))), 'B1-A06c', 'direct outdoor path must not claim basic checks were done');
  const hp = tryGo(GATE.concat(['heat_pump', 'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off', 'band_mild_warm', 'cold_home_holding', 'no_heat_at_all', 'outdoor_not_running_when_should']));
  const shownHp = hp.result ? F.presentResult(hp) : null;
  assert(hp.result === 'hp_outdoor_not_running_wave1' && shownHp && !/Cool is calling/.test(textOf(shownHp)), 'B1-A06d', 'HP heating context must not record "Cool is calling"'); }
// B1-A07 Heavy persistent ice in heat = same stop tier everywhere, unconditional off/EM.
{ const ms = F.results.ms_outdoor_freeze_heat_wave1; assert(ms && URGENT.includes(ms.tier) && !/If no useful heat is coming/.test(ms.actions[0]), 'B1-A07', 'ms_outdoor_freeze_heat_wave1 must be Stop tier with unconditional Off');
  const hp = tryGo(GATE.concat(['heat_pump', 'air_source_ducted_hp', 'landing_ice_outdoor', 'mode_matches_complaint', 'emergency_already_off', 'band_well_below', 'iced_solid_no_recover']));
  assert(hp.result === 'hp_ice_heat_outdoor', 'B1-A07b', 'HP iced_solid_no_recover must end at hp_ice_heat_outdoor, got ' + (hp.result || hp.node || hp.error)); }
// B1-A08 Filter: Off before pulling; restart check before Cool.
{ assert(/thermostat to Off/i.test(F.nodes['ac.cool.filter.check'].body), 'B1-A08', 'filter check must say set thermostat Off first');
  const s = tryGo(GATE.concat(['cooling_only_ac', 'split_central_cool_only', 'landing_not_cooling', 'mode_cool_setpoint_ok', 'filter_dirty_clogged']));
  assert(s.node === 'ac.cool.filter.replace_step', 'B1-A08b', 'dirty filter must show replacement steps before restart check, got ' + (s.node || s.result));
  const t = tryGo(GATE.concat(['cooling_only_ac', 'split_central_cool_only', 'landing_not_cooling', 'mode_cool_setpoint_ok', 'filter_dirty_clogged', 'filter_installed', 'restart_ice_seen']));
  assert(t.result === 'ice_thaw_basic', 'B1-A08c', 'ice at restart check must go to ice_thaw_basic, got ' + (t.result || t.error)); }
// B1-A09 Cold-home screen: global gate option + HP indoor-trend screen before any cold-weather reassurance.
{ const g = F.nodes['ac.gate.cluster_entry']; const o = g.options.find(x => x.id === 'hazard_cold_exposure'); assert(o && o.next === '@cold_exposure' && F.results.cold_exposure && F.results.cold_exposure.tier === 'Emergency', 'B1-A09', 'global gate needs hazard_cold_exposure -> cold_exposure (Emergency)');
  const base = GATE.concat(['heat_pump', 'air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off', 'band_well_below']);
  const s = tryGo(base); assert(s.node === 'hp.heat.cold_home_screen', 'B1-A09b', 'cold-band heating complaint must hit hp.heat.cold_home_screen, got ' + (s.node || s.result));
  const t = tryGo(base.concat(['cold_person_at_risk'])); assert(t.result === 'cold_exposure', 'B1-A09c', 'person at risk -> cold_exposure, got ' + (t.result || t.error));
  const u = tryGo(base.concat(['cold_home_falling'])); assert(u.result === 'hp_cold_home_falling', 'B1-A09d', 'falling indoor temp -> hp_cold_home_falling, got ' + (u.result || u.error));
  Object.values(R.results).filter(x => x.result === 'hp_weak_heat_deep_cold').forEach(x => assert(x.answers.some(a => a.node === 'hp.heat.cold_home_screen' && a.choice === 'cold_home_holding'), 'B1-A09e', 'hp_weak_heat_deep_cold reached without cold_home_holding')); }
// B1-A10 Refrigerant alarm in every "New hazard now" option and in the thermostat alert branch.
for (const id in F.nodes) for (const o of F.nodes[id].options) if (o.id === 'hazard_now') assert(/refrigerant/i.test(o.label) || (id.startsWith('sd.') && /an alarm/.test(o.label)), 'B1-A10', id + ' hazard_now label lacks refrigerant');
{ const n = F.nodes['ts.alert.capture']; const o = n && n.options.find(x => x.id === 'code_refrigerant_alarm'); assert(o && o.next === '@ts_refrigerant_alarm' && F.results.ts_refrigerant_alarm && URGENT.includes(F.results.ts_refrigerant_alarm.tier), 'B1-A10b', 'ts.alert.capture needs code_refrigerant_alarm -> ts_refrigerant_alarm (urgent)'); }
// B1-A11 Service-note factuality.
for (const c of ['cool_only_split_ac', 'mini_split_ductless', 'water_source_geo', 'packaged_or_other', 'not_sure']) { const s = go(GATE.concat(['heat_pump', c])); assert(!/Equipment: air-source ducted heat pump\./.test(F.summary(s, {})), 'B1-A11', 'HP confirm=' + c + ' note still asserts air-source ducted'); }
{ const s = go(GATE.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'not_heat_problem', 'wshp_system_unsure'])); assert(!/6 tons or less/.test(F.summary(s, {})), 'B1-A11b', 'unconfirmed WSHP note asserts <=6 tons'); }
for (const [id, s] of Object.entries(R.results)) { const note = F.summary(s, {}); assert(/TEST SCENARIO/.test(note), 'B1-A11c', id + ' test note lacks TEST SCENARIO'); assert(/^Result: /m.test(note), 'B1-A11d', id + ' note lacks Result: line'); }
{ const n = F.nodes['ts.power.blank_screen']; const o = n.options.find(x => x.id === 'power_back'); assert(!/checked batteries and the furnace door/.test(o.fact), 'B1-A11e', 'power_back fact claims checks not confirmed'); }
// B1-A12 Brand leftover.
assert(!/AC Second Opinion/.test(appText), 'B1-A12', 'app.js still says AC Second Opinion');
// B1-A13 Print keeps actions and "What not to do".
assert(!/\.result-box:first-child\{display:none\}/.test(cssText.replace(/\s+/g, '')), 'B1-A13', 'print CSS hides the first result box');
console.log('Audit walked ' + R.stateCount + ' distinct states, ' + Object.keys(R.nodes).length + ' questions, ' + Object.keys(R.results).length + ' results.');
console.log('batch-1 asserts: ' + failed + ' failures');
Object.entries(fails).forEach(([k, v]) => console.log('  ' + k + ': ' + v));
process.exitCode = failed ? 1 : 0;
