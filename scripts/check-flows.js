/* Local sanity for AC Wave-2 and HP Wave-1. No network. */
'use strict';
globalThis.SW_CONFIG = { advancedRepairsEnabled: false, aiThermostatEnabled: false, mirrorsEnabled: false, stageLatchStepsEnabled: false, contentVersion: '2026-10-11.2' };
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
const SHUT_OFF = /\b(shut|turn|switch|cut)\w*\s+(off\s+)?(the\s+)?(main\s+)?(power|breaker)\b|\bshut power\b|breaker\s+(off|on)\b|\bflip\b|\breset\w*\s+(the\s+)?breaker/i;
const SHUT_OFF_ALLOW = new Set([
  'If it says to switch off power at a breaker or switch, stop here.',
  'It doesn’t cut the power.',
  'My manual says to switch off power at a breaker or switch first',
  'Remote Off doesn’t cut the power.',
  'Don’t open covers, reset breakers, or open the outdoor unit to look for the cause.',
  'Don’t open the indoor or outdoor unit, rewire anything, or reset breakers to test it.',
  'Don’t add refrigerant, open the outdoor unit, or reset breakers to test it.',
  'Remote Off doesn’t cut the power, so stay away from the unit’s wiring.',
  'Don’t touch the indoor unit, any switch, a cord, or the breaker panel, and don’t stand in the water.',
  'Don’t touch the indoor unit, any switch, or the breaker panel.',
  'Don’t mop around the unit, and don’t touch the breaker panel.',
  'Stay clear of the indoor unit and any wet floor. Don’t touch the unit, a switch, a cord, or the breaker panel.',
  'Never flip the furnace switch or a breaker.',
  'Clean filters only when the manual shows a tool-free path from the floor and does not ask you to switch a breaker off.',
  'The outdoor disconnect step is visual only — it does not tell you to flip the lever.'
]);
function assertNoShutOff(text, where) {
  String(text || '').split(/(?<=[.!?])\s+|\n+/).map(sentence => sentence.trim()).filter(Boolean).forEach(sentence => {
    if (SHUT_OFF.test(sentence) && !SHUT_OFF_ALLOW.has(sentence)) assert(false, where + ': ' + sentence);
  });
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
const SHIP = '2026-10-11.2';
assert(configText.includes("contentVersion: '" + SHIP + "'"), 'content version must be ' + SHIP);
assert(['config', 'flow', 'app'].every(f => indexText.includes(f + '.js?v=' + SHIP)), 'script cache-bust must match content version');
assert(indexText.includes('HOME HVAC CHECKS') && !indexText.includes('AC + HEAT PUMP'), 'header lockup is HOME HVAC CHECKS');
assert(indexText.includes('rel="manifest"') && indexText.includes('manifest.webmanifest?v=' + SHIP), 'index links the web app manifest');
assert(indexText.includes('rel="apple-touch-icon"') && indexText.includes('apple-mobile-web-app-capable') && indexText.includes('apple-mobile-web-app-title') && indexText.includes('apple-mobile-web-app-status-bar-style'), 'apple web app tags are present');
let manifest;
try { manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.webmanifest'), 'utf8')); }
catch (err) { manifest = null; assert(false, 'manifest is valid JSON: ' + (err && err.message)); }
assert(manifest && manifest.name === 'Second Wrench' && manifest.short_name === 'Second Wrench', 'manifest name and short_name');
assert(manifest && manifest.start_url === '/#/' && manifest.display === 'standalone', 'manifest start_url and display');
assert(manifest && manifest.background_color === '#17181b' && manifest.theme_color === '#17181b', 'manifest background and theme colors');
function pngSize(file) {
  const buf = fs.readFileSync(file);
  assert(buf.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'PNG signature ' + file);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
function manifestIcon(pred) {
  const icon = (manifest && manifest.icons || []).find(pred);
  if (!icon) return null;
  const rel = String(icon.src).replace(/^\//, '').split('?')[0];
  const file = path.join(__dirname, '..', rel);
  assert(fs.existsSync(file), 'manifest icon file exists: ' + rel);
  return { icon, file, size: fs.existsSync(file) ? pngSize(file) : { w: 0, h: 0 } };
}
const icon192 = manifestIcon(i => i.sizes === '192x192' && i.purpose === 'any');
const icon512 = manifestIcon(i => i.sizes === '512x512' && i.purpose === 'any');
const iconMask = manifestIcon(i => i.sizes === '512x512' && i.purpose === 'maskable');
assert(icon192 && icon192.size.w === 192 && icon192.size.h === 192, 'manifest 192 icon');
assert(icon512 && icon512.size.w === 512 && icon512.size.h === 512, 'manifest 512 icon');
assert(iconMask && iconMask.size.w === 512 && iconMask.size.h === 512, 'manifest maskable 512 icon');
const appleIcon = path.join(__dirname, '../assets/icons/apple-touch-icon.png');
assert(fs.existsSync(appleIcon) && indexText.includes('assets/icons/apple-touch-icon.png?v=' + SHIP), 'apple touch icon is linked');
const appleSize = fs.existsSync(appleIcon) ? pngSize(appleIcon) : { w: 0, h: 0 };
assert(appleSize.w === 180 && appleSize.h === 180, 'apple touch icon is 180');
assert(/<meta name="robots" content="index, follow">/.test(indexText) && !/noindex/.test(indexText), 'home page allows indexing');
const headersText = fs.readFileSync(path.join(__dirname, '../_headers'), 'utf8');
assert(!/X-Robots-Tag/i.test(headersText) && !/noindex/i.test(headersText), '_headers does not send noindex');
assert(headersText.includes('X-Content-Type-Options: nosniff') && headersText.includes('X-Frame-Options: DENY') && headersText.includes('Content-Security-Policy:'), 'security headers stay');
const robotsText = fs.readFileSync(path.join(__dirname, '../robots.txt'), 'utf8');
assert(/User-agent:\s*\*/.test(robotsText) && /Allow:\s*\//.test(robotsText), 'robots.txt allows crawling');
assert(robotsText.includes('Sitemap: https://beta-secondwrench.netlify.app/sitemap.xml'), 'robots.txt points at the sitemap');
const sitemapText = fs.readFileSync(path.join(__dirname, '../sitemap.xml'), 'utf8');
assert(sitemapText.includes('<loc>https://beta-secondwrench.netlify.app/</loc>') && !/thanks\.html/.test(sitemapText), 'sitemap lists the home page and excludes thanks.html');
assert(indexText.includes('<link rel="canonical" href="https://beta-secondwrench.netlify.app/">'), 'canonical home URL');
const shareTitle = 'Second Wrench — free home HVAC checks';
const shareDesc = 'Free guided checks for AC, heat pumps, mini-splits, geothermal, and furnaces. Know what’s wrong, what’s safe, and when to call a pro. Informational only; not a licensed technician.';
assert(indexText.includes('property="og:title" content="' + shareTitle + '"'), 'og title');
assert(indexText.includes('property="og:description" content="' + shareDesc + '"'), 'og description');
assert(indexText.includes('property="og:image" content="https://beta-secondwrench.netlify.app/assets/icons/icon-512.png"'), 'og image is the 512 icon');
assert(indexText.includes('name="twitter:card" content="summary"'), 'twitter card is summary');
assert(indexText.includes('name="twitter:title" content="' + shareTitle + '"') && indexText.includes('name="twitter:description" content="' + shareDesc + '"'), 'twitter title and description');
const thanksText = fs.readFileSync(path.join(__dirname, '../thanks.html'), 'utf8');
assert(/<meta name="robots" content="[^"]*noindex/.test(thanksText), 'thanks.html is noindex');
assert(!/navigator\.serviceWorker|serviceWorker\.register/.test(indexText + '\n' + appText), 'no service worker; safety copy must not be served stale');
assert(/hvacContentReviewed:\s*false/.test(configText), 'hvac content review flag stays false');
assert(/formsEnabled:\s*true/.test(configText), 'forms are on after Netlify detects beta-feedback and beta-session');
assert(/liveFormsVerified:\s*false/.test(configText), 'live form submission stays unverified');
assert(F.treeVersion === 'ac.cool.v1', 'AC tree version');
assert(F.treeVersionHp === 'hp.air_source.v1', 'HP tree version');
assert(F.treeVersionWshp === 'wshp.water_to_air.v0', 'A-1 WSHP tree version');

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
assert(hpIntake.treeVersion === 'hp.air_source.v1' && hpIntake.product === 'hp', 'HP tree after system type');
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

// ---- Ice keep-running split (hp.air_source.v1) ----
const ICE_ROUTER = 'hp.ice.mode_location';
const flat = n => (n && typeof n === 'object') ? Object.keys(n).reduce((a, k) => a.concat(flat(n[k])), []) : [n];
const iceWalk = (band, routerChoice, landing) => walk('hp', gate.concat([
  'air_source_ducted_hp', landing || 'landing_ice_outdoor', 'mode_matches_complaint', 'emergency_already_off',
  band, 'want_keep_running_despite_ice'].concat(routerChoice ? [routerChoice] : [])));

// I1 inbound edge: defrost keep-running now enters the router; gate kept; hint no longer says Off
const dkr = F.nodes['hp.defrost.sanity'].options.find(o => o.id === 'want_keep_running_despite_ice');
assert(dkr.next === ICE_ROUTER && dkr.gate === 'ice_keep_running', 'I1 defrost keep-running -> router with ice_keep_running gate');
assert(!/Turn the system Off/.test(dkr.hint), 'I1 defrost keep-running hint must not say Off');
// I2 router shape
const rt = F.nodes[ICE_ROUTER] || { options: [] };
assert(!!F.nodes[ICE_ROUTER] && F.hpWave1.indexOf(ICE_ROUTER) !== -1, 'I2 router exists and is in hpWave1');
assert(rt.safetyGate === true && rt.diyTier === 'pro_only', 'I2 router safetyGate true, pro_only');
assert(rt.options.map(o => o.id).join('|') === 'ice_heat_outdoor|ice_heat_indoor_only|ice_cool_any|ice_mode_unsure_outdoor|ice_unsure', 'I2 router choice ids');
assert(rt.options.length === 5 && rt.options.every(o => flat(o.next).every(t => typeof t === 'string' && t.charAt(0) === '@')), 'I2 every router edge is a terminal');
assert(rt.options.every(o => !o.gate), 'I2 router choices do not re-fire a gate');
// I3 the old HP ice test, rewritten: keep-running stops at the router, not a result
const atRouter = iceWalk('band_near_freezing');
assert(atRouter.node === ICE_ROUTER && !atRouter.result, 'I3 HP keep-running reaches the router, got ' + (atRouter.result || atRouter.node));
const ev = atRouter.audit.map(a => a.event);
assert(ev.filter(e => e === 'gate_fired:ice_keep_running').length === 1 && ev.indexOf('node_entered:' + ICE_ROUTER) !== -1, 'I3 gate fires once, then router entered');
// I4 routing table: every router choice (cold band) + unsure-outdoor across all four bands + other landings
[
  ['band_near_freezing', 'ice_heat_outdoor', 'hp_ice_heat_outdoor'],
  ['band_near_freezing', 'ice_heat_indoor_only', 'ice_keep_running'],
  ['band_near_freezing', 'ice_cool_any', 'ice_keep_running'],
  ['band_near_freezing', 'ice_mode_unsure_outdoor', 'hp_ice_heat_outdoor'],
  ['band_near_freezing', 'ice_unsure', 'ice_keep_running'],
  ['band_well_below', 'ice_mode_unsure_outdoor', 'hp_ice_heat_outdoor'],
  ['band_mild_warm', 'ice_mode_unsure_outdoor', 'ice_keep_running'],
  ['not_sure_ambient', 'ice_mode_unsure_outdoor', 'ice_keep_running'],
  ['band_mild_warm', 'ice_heat_outdoor', 'hp_ice_heat_outdoor']
].forEach(([band, choice, want]) => {
  let s; try { s = iceWalk(band, choice); } catch (e) { s = { result: 'THREW: ' + e.message.slice(0, 60) }; }
  assert(s.result === want, 'I4 ' + band + '/' + choice + ' -> ' + want + ', got ' + s.result);
  assert(F.results[s.result] && F.results[s.result].outcome === 'emergency_exit', 'I4 ' + choice + ' outcome emergency_exit');
});
const safeIce = (b, c, l) => { try { return iceWalk(b, c, l).result; } catch (e) { return 'THREW'; } };
['landing_no_heat', 'landing_no_cool', 'landing_both_modes_fail'].forEach(l => {
  assert(safeIce('band_well_below', 'ice_heat_outdoor', l) === 'hp_ice_heat_outdoor', 'I4 ' + l + ' heat/outdoor -> HEAT');
  assert(safeIce('band_well_below', 'ice_unsure', l) === 'ice_keep_running', 'I4 ' + l + ' unsure -> COOL');
});
// I5 both screens: outcome, reason, tier
assert(F.results.ice_keep_running.outcome === 'emergency_exit' && F.results.ice_keep_running.reason === 'ice_keep_running' && F.results.ice_keep_running.tier === 'Stop / professional', 'I5 COOL emergency_exit / ice_keep_running');
assert(!!F.results.hp_ice_heat_outdoor && F.results.hp_ice_heat_outdoor.outcome === 'emergency_exit' && F.results.hp_ice_heat_outdoor.reason === 'hp_ice_heat_outdoor' && F.results.hp_ice_heat_outdoor.tier === 'Stop / professional', 'I5 HEAT emergency_exit / hp_ice_heat_outdoor');
// I6 copy guards
const H = F.results.hp_ice_heat_outdoor || { actions: [], avoid: '' }, C = F.results.ice_keep_running;
assert(/Emergency or Aux Heat/.test(H.actions[0] || '') && /Higher bills are OK/.test(H.actions[0]), 'I6 HEAT action 1 Em/Aux + Higher bills are OK');
assert(H.actions.some(a => /water dripping indoors\? Turn the system Off/i.test(a)), 'I6 HEAT indoor-water cross-check to Off');
assert(H.actions.some(a => /carbon monoxide/.test(a) && /generator indoors/.test(a)), 'I6 HEAT CO line');
assert(H.actions.some(a => /Never touch the coil or grille/.test(a)), 'I6 HEAT coil/grille line');
assert(/chip/.test(H.avoid) && /hot water/.test(H.avoid) && /hose/.test(H.avoid), 'I6 HEAT avoid: chip, hot water, hose');
assert(C.actions[0] === 'Set the system to Off at the thermostat.' && C.actions.some(a => /Emergency or Aux Heat/.test(a)), 'I6 COOL Off first + cold-weather line');
const db = F.nodes['hp.defrost.sanity'].body;
assert(/That can damage the system\./.test(db) && !/water damage/.test(db) && /solid block/.test(db), 'I6 defrost body: mode-neutral damage line + frost/block cue');
// I7 AC lane unchanged and never enters the HP router
assert(acIce.result === 'ice_keep_running' && acIce.answers.every(a => a.node !== ICE_ROUTER), 'I7 AC ice stays on ice_keep_running');
// I8 none of the five 6.5 places tells a cold-band heat user to go Off without the Em/Aux clause first
const OFF_INSTR = /(set the thermostat|turn the system|turn it|Thermostat) Off/;
const emBeforeOff = t => { const m = t.match(OFF_INSTR); if (!m) return true; const e = t.indexOf('Emergency or Aux Heat'); return e !== -1 && e < m.index; };
[
  ['hp_defrost_valve_ob_control', F.results.hp_defrost_valve_ob_control.actions.join(' ')],
  ['hp.conclude body', F.nodes['hp.conclude.call_pro_defrost_valve_control'].body],
  ['hp_defrost_recovered_ok', F.results.hp_defrost_recovered_ok.actions.join(' ')],
  ['hp_defrost_not_sure', F.results.hp_defrost_not_sure.actions.join(' ')],
  ['hp_weak_heat_deep_cold', F.results.hp_weak_heat_deep_cold.actions.join(' ')]
].forEach(([id, text]) => assert(emBeforeOff(text), 'I8 ' + id + ' says Off without the Em/Aux clause first'));
['hp_defrost_recovered_ok', 'hp_defrost_not_sure'].forEach(id =>
  assert(/Otherwise, or if there is no warm air in 15 minutes, turn the system Off/.test(F.results[id].actions.join(' ')), 'I8 ' + id + ' still gives warm-weather users Off'));
// I8b walked: a well-below-freezing heat user reaching each result sees Em/Aux before Off (presentResult = what renders)
[
  ['iced_solid_no_recover', 'ack_call_pro', 'hp_defrost_valve_ob_control'],
  ['not_sure', null, 'hp_defrost_not_sure'],
  ['looks_like_defrost_then_recover', null, 'hp_defrost_recovered_ok'],
  ['defrost_recovered_complaint_remains', 'weak_but_some_heat', 'hp_weak_heat_deep_cold']
].forEach(([dc, next, want]) => {
  const s = walk('hp', gate.concat(['air_source_ducted_hp', 'landing_no_heat', 'mode_matches_complaint', 'emergency_already_off', 'band_well_below', dc].concat(next ? [next] : [])));
  assert(s.result === want, 'I8b cold heat walk ' + dc + ' -> ' + want + ', got ' + s.result);
  assert(emBeforeOff(F.presentResult(s).actions.join(' ')), 'I8b ' + want + ' rendered copy says Off before Em/Aux');
});

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
assert(fromAc.node === 'hp.intake.system_confirm' && fromAc.product === 'hp' && fromAc.treeVersion === 'hp.air_source.v1', 'AC intake heat pump choice enters HP tree');

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
assert(coolingOnly.product === 'ac' && coolingOnly.treeVersion === 'ac.cool.v1', 'cooling-only stamps the AC tree');
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
      assert(state.product === 'hp' && state.node === 'hp.intake.system_confirm' && state.treeVersion === 'hp.air_source.v1', 'identify ' + [winter, em, heat].join('/') + ' got ' + state.product + ' ' + state.node);
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

assert(/termsVersion:\s*'public-beta-2026-10-11'/.test(configText), 'termsVersion is public-beta-2026-10-11');
assert(/advancedRepairsEnabled:\s*false/.test(configText) && !/advancedRepairsEnabled:\s*true/.test(configText), 'public advanced flag must stay false');
assert(appText.includes("'/terms'") && appText.includes("'/privacy'"), 'terms and privacy routes exist');
const termsRoute = appText.slice(appText.indexOf("'/terms':"), appText.indexOf("'/privacy':"));
const privacyRoute = appText.slice(appText.indexOf("'/privacy':"), appText.indexOf("'/disclosures':"));
const termsHtml = appText.slice(appText.indexOf('const TERMS_HTML'), appText.indexOf('const PUBLIC_BETA_NOTICE'));
const noticeHtml = appText.slice(appText.indexOf('const PUBLIC_BETA_NOTICE'), appText.indexOf('const PRIVACY_HTML'));
const privacyHtml = appText.slice(appText.indexOf('const PRIVACY_HTML'), appText.indexOf('function publicBetaNotice'));
const visible = html => html.replace(/<[^>]+>/g, '');
assert(termsRoute.includes('TERMS_HTML') && termsRoute.includes('publicBetaNotice'), 'terms route renders the terms body and beta notice');
assert(privacyRoute.includes('PRIVACY_HTML'), 'privacy route renders the privacy body');
assert(/not a licensed HVAC/i.test(visible(noticeHtml)), 'terms page says not a licensed HVAC');
assert(termsHtml.includes('Advanced DIY repair procedures are OFF'), 'terms page says Advanced DIY repair procedures are OFF');
assert(visible(privacyHtml).includes('We do not sell your feedback'), 'privacy page says we do not sell your feedback');
assert(termsHtml.includes('been reviewed or approved by an attorney') && termsRoute.includes('Not attorney-reviewed'), 'terms status says not attorney-reviewed');
assert(privacyHtml.includes('attorney-reviewed or approved') && privacyRoute.includes('Not attorney-reviewed'), 'privacy status says not attorney-reviewed');
assert(!/DRAFT FOR COUNSEL|attorney-approved|lawyer-reviewed/i.test(appText), 'pages do not claim attorney approval');
assert(/let termsChecked = false/.test(appText), 'start checkbox state begins unchecked');
assert(/id="agree" type="checkbox"'\+\(termsChecked\?' checked':''\)/.test(appText), 'checkbox checked attribute is off until the user checks it');
assert(/id="continue-consent"'\+\(termsChecked\?'':' disabled'\)/.test(appText), 'continue stays disabled until the checkbox is checked');
assert(/if\(selected\.disabled\)return;/.test(appText), 'a disabled continue control cannot submit');
assert(/agreeing&&!accepted/.test(appText), 'agree cannot continue while the checkbox is unchecked');
assert(/agreed:\s*agreeing&&accepted/.test(appText), 'the acceptance flag follows the checkbox');
assert(/termsVersion:\s*C\.termsVersion/.test(appText), 'the session records the configured terms version');
assert((appText.match(/F\.answer\(/g) || []).length === 1, 'the UI has one answer path');
assert(!/agreed:\s*true/.test(appText), 'the UI never hard-codes acceptance');
assert(!/localStorage|sessionStorage/.test(appText), 'acceptance is not written to browser storage');
const feedbackFn = appText.slice(appText.indexOf('function feedbackData'), appText.indexOf('function feedbackText'));
assert(!/feedbackConsent|feedback-consent/.test(feedbackFn), 'optional feedback consent is not added to the payload');
assert(/id="feedback-consent" type="checkbox"'\+\(feedbackConsent\?' checked':''\)/.test(appText), 'feedback consent starts unchecked');
assert(appText.includes('Free beta · Informational only · Not a licensed HVAC tech · Not a diagnosis'), 'home/start line');
assert(appText.includes('General guidance only. Not a diagnosis. Call a licensed HVAC pro for repair.'), 'result footer line');
assert(appText.includes('Get to safety. Call 911 if there is fire, smoke, or immediate danger. This site is not an emergency service.'), 'emergency result line');
assert(appText.includes('Advanced repair steps are not enabled. Call a licensed HVAC professional.'), 'advanced-off line');
assert(appText.includes('Optional. Do not include passwords, serial photos you shouldn’t share, or medical details.'), 'feedback warning');
assert(appText.includes('Optional: I agree Second Wrench may use my feedback to improve the product, including in anonymized form.'), 'feedback consent line');
assert(indexText.includes('href="#/terms"') && indexText.includes('href="#/privacy"'), 'every app page footer links to Terms and Privacy');
const SOCIAL_LINKS = [
  ['https://x.com/SecondWrench', 'Second Wrench on X'],
  ['https://www.facebook.com/profile.php?id=61595153885270', 'Second Wrench on Facebook'],
  ['https://www.reddit.com/user/SecondWrench/', 'Second Wrench on Reddit']
];
SOCIAL_LINKS.forEach(([href, label]) => {
  const anchor = 'href="' + href + '" target="_blank" rel="noopener noreferrer" aria-label="' + label + '"';
  assert(indexText.includes(anchor), 'site footer social link ' + label);
  assert(appText.includes(anchor), 'home social link ' + label);
});
assert((indexText.match(/class="social-follow"/g) || []).length === 1, 'site footer has one follow row');
assert((appText.match(/aria-label="Follow Second Wrench"/g) || []).length === 1, 'home has one follow row');
assert(!/instagram/i.test(indexText + '\n' + appText), 'no Instagram link or embed');

const gas = F.create();
F.answer(gas, 'hazard_gas_co');
assert(gas.result === 'gas' && gas.consent === false && gas.termsVersion == null && gas.consentAt == null, 'gas hazard exits without acceptance');
assert(F.results.gas.outcome === 'emergency_exit', 'gas hazard is an emergency exit');
const viaStop = F.create();
F.answer(viaStop, 'none_of_these');
assert(viaStop.node === 'ac.session.consent' && viaStop.consent === false, 'the safety gate does not imply acceptance');
F.stop(viaStop);
assert(viaStop.node === 'ac.gate.cluster_entry' && viaStop.consent === false, 'stop returns to the hazard gate without acceptance');
F.answer(viaStop, 'hazard_smoke_fire_sparks_burn');
assert(viaStop.result === 'fire' && viaStop.consent === false && viaStop.termsVersion == null, 'stop/get help reaches a hazard result without acceptance');
let blockedAgree = false;
try {
  const s = F.create();
  F.answer(s, 'none_of_these');
  F.answer(s, 'agree_18_terms', { agreed: false, termsVersion: 'public-beta-2026-10-08' });
} catch (err) { blockedAgree = /accept the beta terms/.test(err.message); }
assert(blockedAgree, 'the engine rejects continue without the checkbox');
let blockedVersion = false;
try {
  const s = F.create();
  F.answer(s, 'none_of_these');
  F.answer(s, 'agree_18_terms', { agreed: true, termsVersion: '' });
} catch (err) { blockedVersion = /accept the beta terms/.test(err.message); }
assert(blockedVersion, 'the engine rejects continue without a terms version');
let skippedConsent = false;
try {
  const s = F.create();
  F.answer(s, 'none_of_these');
  s.node = 'sw.intake.system_type';
  F.answer(s, 'cooling_only_ac', { agreed: true, termsVersion: 'public-beta-2026-10-08' });
} catch (err) { skippedConsent = /Safety and consent are required/.test(err.message); }
assert(skippedConsent, 'troubleshooting cannot skip the consent gate');
const accepted = F.create();
F.answer(accepted, 'none_of_these');
F.answer(accepted, 'agree_18_terms', { agreed: true, termsVersion: 'public-beta-2026-10-08' });
assert(accepted.consent === true && accepted.termsVersion === 'public-beta-2026-10-08' && /^\d{4}-\d{2}-\d{2}T/.test(accepted.consentAt), 'the session stores the terms version and acceptance time');

assert(indexText.includes('Second Wrench free public beta:'), 'meta description says free public beta');
assert(indexText.includes('Free public beta. A better next step. · Not an emergency service'), 'beta bar says free public beta and not an emergency service');
assert(!/<div class="beta-bar">[^<]*<span>/.test(indexText), 'the emergency clause is not hidden inside a beta-bar span');
assert(appText.includes('Free public beta. Try it on your own system and tell us what was clear or confusing.'), 'home note invites anyone to try the beta');
assert(appText.includes('Second Wrench · Free public beta'), 'content pages say free public beta');
assert(!appText.includes('Second Wrench · Private beta'), 'content pages do not say private beta');
assert(appText.includes('Emergency / hazard help never requires this checkbox.'), 'terms section 3 says hazard help does not require the checkbox');
const runtimeBan = [
  [/private beta/i, 'private beta'],
  [/\binvited\b/i, 'invited'],
  [/\binvite\b/i, 'invite'],
  [/\binvitation\b/i, 'invitation'],
  [/small circle/i, 'small circle'],
  [/\btesters?\b/i, 'tester'],
  [/small beta/i, 'small beta']
];
['index.html', '404.html', 'thanks.html'].concat(fs.readdirSync(path.join(__dirname, '../assets')).filter(name => name.endsWith('.js')).map(name => 'assets/' + name)).forEach(rel => {
  const text = rel === 'index.html' ? indexText : rel === 'assets/app.js' ? appText : fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  runtimeBan.forEach(([pattern, label]) => assert(!pattern.test(text), rel + ' still says ' + label));
  if (rel === '404.html' || rel === 'thanks.html') assert(text.includes('Second Wrench · Free public beta'), rel + ' eyebrow says free public beta');
});
const changeLog = fs.readFileSync(path.join(__dirname, '../docs/ac-second-opinion/legal/disclaimer-change-log.md'), 'utf8');
function changeRow(id) { return changeLog.split('\n').find(line => line.startsWith('| ' + id + ' |')); }
const d007 = changeRow('D-007');
const d010 = changeRow('D-010');
assert(d007 && d007.includes('Operator-authored beta Terms published; no attorney review yet.'), 'D-007 uses the neutral published wording');
assert(d007 && !/afford|Donnie|Leon/i.test(d007), 'D-007 has no internal business detail');
assert(d010 && d010.includes('Follow-up note only') && !/afford|Donnie|Leon/i.test(d010), 'D-010 has no internal business detail');

const EMERGENCY_LINE = 'Get to safety. Call 911 if there is fire, smoke, or immediate danger. This site is not an emergency service.';
const HAZARDS = [
  ['hazard_gas_co', 'Get everyone to fresh air.'],
  ['hazard_smoke_fire_sparks_burn', 'Stop. Treat smoke, sparks, or burning as a hazard.'],
  ['hazard_water_electrical', 'Do not touch wet or damaged electrical equipment.'],
  ['hazard_heat_illness', 'Help the person before the AC.'],
  ['hazard_refrigerant_alarm', 'Do not reset a refrigerant-leak alarm.'],
  ['hazard_unsure', 'Uncertainty is a good reason to stop.']
];
const TERMS_BODY_SHA256 = '8ff7e3f0817d83ce82c69e7b4d8afc5c6b2fc010d455732e7bc5758c62587bff';
const PRIVACY_BODY_SHA256 = '58f963ab7e545106de93893385495db6a52531a626534b346acd6dca4dca1532';

// ---- WSHP Wave-1 PR-1 (A-1..A-28, T-1..T-26) ----
const WSHP_IDS = ['wshp.hazard.flood_electrical', 'wshp.entry.equipment_gate', 'wshp.openloop.chemistry_gate', 'wshp.handback.call_pro'];
assert(Array.isArray(F.wshpWave1) && F.wshpWave1.join('|') === WSHP_IDS.join('|'), 'A-2 WSHP_WAVE1 export');
WSHP_IDS.forEach(id => {
  assert(!!F.nodes[id], 'A-2 node exists ' + id);
  assert(F.nodes[id].diyTier !== 'advanced', 'A-2 not advanced ' + id);
});
const systemType = F.nodes['sw.intake.system_type'];
const otherSystem = F.nodes['sw.intake.other_system'];
const wshpStart = otherSystem.options.find(o => o.id === 'water_source_geo');
assert(!!wshpStart && wshpStart.next === 'wshp.hazard.flood_electrical' && wshpStart.label === 'Water-source / geothermal heat pump', 'A-3 water-source choice, one level down');
assert(wshpStart.hint === 'No outdoor unit with a fan. Water pipes run to a ground loop, a well, or a pond.' && wshpStart.fact === 'Water-source or geothermal heat pump reported at system type.', 'A-3 water-source copy unchanged');
const typeIds = systemType.options.map(o => o.id);
assert(typeIds.join('|') === 'cooling_only_ac|heat_pump|furnace|other_heat_or_ductless|not_sure', 'A-4 start stays five choices');
assert(otherSystem.options.map(o => o.id).join('|') === 'ductless_mini_split|water_source_geo|thermostat_settings|not_listed', 'A-4 other-system order');
assert(systemType.options.find(o => o.id === 'other_heat_or_ductless').label === 'Something else: mini-split, geothermal, thermostat, other' && systemType.options.find(o => o.id === 'other_heat_or_ductless').next === 'sw.intake.other_system', 'A-4 something-else label');
assert(systemType.options.find(o => o.id === 'cooling_only_ac').next === 'ac.cool.intake.system_confirm', 'A-5 cooling-only edge unchanged');
assert(systemType.options.find(o => o.id === 'heat_pump').next === 'hp.intake.system_confirm', 'A-5 heat-pump edge unchanged');
assert(systemType.options.find(o => o.id === 'not_sure').next === 'sw.identify.winter_outdoor', 'A-5 not-sure edge unchanged');
WSHP_IDS.forEach(id => {
  F.nodes[id].options.forEach(op => {
    assert(typeof op.next === 'string', 'A-9 string edge ' + id + '/' + op.id);
    if (op.next.charAt(0) === '@') assert(!!F.results[op.next.slice(1)], 'A-9 result ' + op.next);
    else assert(!!F.nodes[op.next], 'A-9 node ' + op.next);
  });
});
const hz = F.nodes['wshp.hazard.flood_electrical'];
assert(hz.safetyGate === true, 'A-10 hazard safety gate');
hz.options.forEach(op => {
  if (op.id === 'wshp_hz_none') {
    assert(op.next === 'wshp.entry.equipment_gate', 'A-10 none continues');
    return;
  }
  assert(!!op.gate, 'A-11 hazard gate ' + op.id);
  assert(F.results[op.next.slice(1)].outcome === 'emergency_exit', 'A-10 hazard exits ' + op.id);
});
const eq = F.nodes['wshp.entry.equipment_gate'];
const eqNext = id => eq.options.find(o => o.id === id).next;
assert(eqNext('wshp_open_loop') === 'wshp.openloop.chemistry_gate', 'A-12 open loop');
assert(eqNext('wshp_closed_loop') === 'wshp.handback.call_pro' && eqNext('wshp_loop_unsure') === 'wshp.handback.call_pro', 'A-12 closed and unsure loops');
assert(eqNext('wshp_air_source') === 'hp.intake.system_confirm', 'A-12 air-source divert');
assert(F.results[eqNext('wshp_out_of_scope_size').slice(1)].outcome === 'call_pro', 'A-12 oversize call_pro');
assert(F.results[eqNext('wshp_system_unsure').slice(1)].outcome === 'insufficient_info', 'A-12 unsure system');
assert(eqNext('wshp_ductless') === '@wshp_divert_mini_split', 'A-12 mini-split interim');
assert(eqNext('wshp_furnace_combustion') === '@wshp_divert_furnace', 'A-12 furnace interim');
const chemGate = F.nodes['wshp.openloop.chemistry_gate'];
assert(chemGate.diyTier === 'pro_only' && chemGate.safetyGate === true, 'A-13 chemistry gate');
chemGate.options.forEach(op => {
  assert(op.next.charAt(0) === '@', 'A-14 no node after chemistry ' + op.id);
  const outcome = F.results[op.next.slice(1)].outcome;
  assert(outcome === 'call_pro' || outcome === 'emergency_exit', 'A-14 terminal ' + op.id);
  if (op.id !== 'hazard_now') assert(op.gate === 'wshp_openloop_chemistry', 'A-15 chemistry gate id ' + op.id);
});
const handbackNode = F.nodes['wshp.handback.call_pro'];
assert(handbackNode.diyTier === 'pro_only', 'A-16 handback pro_only');
handbackNode.options.forEach(op => {
  assert(op.next === (op.id === 'hazard_now' ? '@wshp_hazard_now' : '@wshp_handback_call_pro'), 'A-16 handback edge ' + op.id);
});
WSHP_IDS.forEach(id => {
  if (id === 'wshp.hazard.flood_electrical') return;
  const hazardNow = F.nodes[id].options.find(o => o.id === 'hazard_now');
  assert(hazardNow && hazardNow.next === '@wshp_hazard_now' && hazardNow.gate === 'wshp_new_hazard', 'A-17 hazard_now on ' + id);
});
function wshpReachable() {
  const seen = new Set();
  const queue = ['wshp.hazard.flood_electrical'];
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    if (id === 'hp.intake.system_confirm' || id === 'ms.intake.system_confirm') continue;
    const node = F.nodes[id];
    if (!node) continue;
    node.options.forEach(op => {
      if (typeof op.next !== 'string') return;
      if (op.next.charAt(0) === '@') seen.add(op.next);
      else queue.push(op.next);
    });
  }
  return seen;
}
const wshpSeen = wshpReachable();
wshpSeen.forEach(id => {
  assert(!(id.indexOf('ac.cool.') === 0 || id.indexOf('ac.start.') === 0 || id.indexOf('ac.noise.') === 0), 'A-18 no AC cooling node ' + id);
  assert(F.advanced.indexOf(id) === -1, 'A-18 no Advanced node ' + id);
  assert(!(id.indexOf('hp.') === 0 && id !== 'hp.intake.system_confirm'), 'A-18 no extra HP node ' + id);
  assert(id !== '@next_step_advanced' && id !== '@suspected_capacitor_contactor_advanced_off', 'A-18 no forbidden terminal ' + id);
  if (id.charAt(0) === '@') assert(F.results[id.slice(1)].outcome !== 'next_step', 'A-18 no next_step ' + id);
});
Object.keys(F.results).forEach(id => {
  if (id.indexOf('wshp_') !== 0) return;
  assert(F.results[id].outcome !== 'next_step' && F.results[id].diyTier !== 'advanced', 'A-19 ' + id);
});
['wshp.hazard.flood_electrical', 'wshp.entry.equipment_gate', 'wshp.openloop.chemistry_gate', 'wshp.handback.call_pro', '@fire', '@electrical', '@gas', '@uncertain', '@wshp_hazard_now', '@wshp_mech_room_flood', '@wshp_breaker_wont_reset', '@wshp_openloop_water_quality_pro', '@wshp_handback_call_pro', '@wshp_out_of_scope_call_pro', '@wshp_system_unconfirmed', '@wshp_divert_mini_split', '@wshp_divert_furnace'].forEach(id => {
  assert(wshpSeen.has(id), 'A-20 reachable ' + id);
});
const bannedDiy = /\b(acid|bleach|chlorin\w*|biocide|descal\w*|flush\w*|purg\w*|glycol|antifreeze|refrigerant|gauges?|jump\w*|bypass\w*)\b/ig;
const allowedPhrase = 'The water loop, pump, refrigerant, and controls';
const allowedStart = /^(?:Do not|Never|Not offered|This check will not|No )/;
const allowedExact = 'Capacitor, contactor, pump, wiring, and refrigerant work need a trained technician.';
function checkBanned(text, where, labelId) {
  if (!text) return;
  if (labelId && (labelId.indexOf('want_diy_') === 0 || labelId === 'openloop_want_diy_treatment')) return;
  const phraseAt = text.indexOf(allowedPhrase);
  bannedDiy.lastIndex = 0;
  let match;
  while ((match = bannedDiy.exec(text))) {
    const at = match.index;
    if (phraseAt !== -1 && at >= phraseAt && at < phraseAt + allowedPhrase.length) continue;
    const prior = text.slice(0, at);
    const start = Math.max(prior.lastIndexOf('.'), prior.lastIndexOf('!'), prior.lastIndexOf('?'), prior.lastIndexOf('\n'));
    const sentence = text.slice(start + 1).replace(/^[\s\-•]+/, '');
    assert(allowedStart.test(sentence) || sentence.indexOf(allowedExact) === 0, 'A-21 ' + match[0] + ' in ' + where);
  }
}
WSHP_IDS.forEach(id => {
  checkBanned(F.nodes[id].body, id + ' body');
  F.nodes[id].options.forEach(op => {
    checkBanned(op.label, id + '/' + op.id + ' label', op.id);
    checkBanned(op.hint, id + '/' + op.id + ' hint');
  });
});
Object.keys(F.results).forEach(id => {
  if (id.indexOf('wshp_') !== 0) return;
  checkBanned(F.results[id].explanation, id + ' explanation');
  (F.results[id].actions || []).forEach((action, index) => checkBanned(action, id + ' action ' + index));
});
const colorCallout = /\b(green|red|amber|yellow|blue)\b/i;
WSHP_IDS.forEach(id => {
  const node = F.nodes[id];
  const blob = [node.section, node.title, node.body, node.caution].concat(node.options.map(op => [op.label, op.hint, op.fact].join(' '))).join('\n');
  assert(!colorCallout.test(blob), 'A-22 color in ' + id);
});
Object.keys(F.results).forEach(id => {
  if (id.indexOf('wshp_') !== 0) return;
  const res = F.results[id];
  assert(!colorCallout.test([res.title, res.urgency, res.explanation, res.avoid].concat(res.actions || []).join('\n')), 'A-22 color in ' + id);
});
assert(F.results.wshp_advanced_off && F.results.wshp_advanced_off.outcome === 'call_pro' && F.results.wshp_advanced_off.reason === 'wshp_advanced_off', 'A-26 overlay terminal is call_pro');

function wshpEvents(state) { return state.audit.map(a => a.event); }
const t1 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo']));
assert(t1.node === 'wshp.hazard.flood_electrical' && t1.product === 'wshp' && t1.treeVersion === 'wshp.water_to_air.v0', 'T-1 hazard stub');
const t1Events = wshpEvents(t1);
assert(t1Events.indexOf('answer_selected:water_source_geo') !== -1 && t1Events.indexOf('answer_selected:water_source_geo') < t1Events.indexOf('product_lane:wshp') && t1Events.indexOf('product_lane:wshp') < t1Events.lastIndexOf('node_entered:wshp.hazard.flood_electrical'), 'T-1 audit order');
const t2 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_smoke_burn_spark']));
assert(t2.result === 'fire' && F.results[t2.result].outcome === 'emergency_exit' && wshpEvents(t2).indexOf('gate_fired:smoke_fire_sparks_burn') !== -1, 'T-2 smoke');
const t3 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_water_electrical']));
assert(t3.result === 'electrical' && F.results[t3.result].outcome === 'emergency_exit', 'T-3 water at electrical');
const t4 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_flooding']));
assert(t4.result === 'wshp_mech_room_flood' && wshpEvents(t4).indexOf('gate_fired:wet_hands_flood') !== -1, 'T-4 flood');
const t5 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_breaker_wont_reset']));
assert(t5.result === 'wshp_breaker_wont_reset' && wshpEvents(t5).indexOf('gate_fired:breaker_wont_reset') !== -1, 'T-5 breaker');
const t6 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_gas_co']));
assert(t6.result === 'gas', 'T-6 gas');
const t7 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_unsure']));
assert(t7.result === 'uncertain', 'T-7 unsure hazard');
const t8 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'wshp_closed_loop', 'wshp_cx_no_heat']));
assert(t8.result === 'wshp_handback_call_pro' && F.results[t8.result].outcome === 'call_pro', 'T-8 handback');
const t8note = F.summary(t8);
assert(t8note.indexOf('Loop type: closed loop.') !== -1 && t8note.indexOf('Complaint: No heat or not enough heat') !== -1, 'T-8 summary');
assert(t8note.indexOf('HOMEOWNER SERVICE NOTE — water-source / geothermal heat pump observations, not a diagnosis') === 0, 'A-24 header');
assert((t8note.split('Loop type:').length - 1) === 1, 'A-24 loop line once');
assert(!/air-source/i.test(t8note), 'A-24 no air-source');
assert(F.presentResult(t8) === F.results.wshp_handback_call_pro, 'A-23 raw WSHP result');
assert(F.activity(t8).tree_version === 'wshp.water_to_air.v0', 'A-25 tree version');
assert(!JSON.stringify(F.activity(t8)).includes('SECRET-NOTE') && F.summary(t8, { codes: 'SECRET-NOTE', model: 'SECRET-MODEL' }).includes('SECRET-NOTE'), 'A-25 activity excludes typed notes');
const t9 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'wshp_open_loop', 'openloop_ack_call_pro']));
assert(t9.result === 'wshp_openloop_water_quality_pro' && F.results[t9.result].outcome === 'call_pro' && wshpEvents(t9).indexOf('gate_fired:wshp_openloop_chemistry') !== -1, 'T-9 open loop');
assert(t9.answers.every(a => a.node !== 'wshp.handback.call_pro') && t9.node !== 'wshp.handback.call_pro', 'T-9 never visits handback');
const t10 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'wshp_open_loop', 'openloop_want_diy_treatment']));
assert(t10.result === 'wshp_openloop_water_quality_pro' && wshpEvents(t10).indexOf('notes.wshp_openloop_diy:refused') !== -1, 'T-10 DIY treatment refused');
const t11 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'wshp_open_loop', 'hazard_now']));
assert(t11.result === 'wshp_hazard_now' && F.results[t11.result].outcome === 'emergency_exit', 'T-11 chemistry hazard');
const t12 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'wshp_loop_unsure', 'wshp_cx_cycle_lockout']));
assert(t12.result === 'wshp_handback_call_pro' && F.summary(t12).indexOf('Loop type: not sure.') !== -1, 'T-12 unsure loop');
const t13 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'wshp_air_source']));
assert(t13.node === 'hp.intake.system_confirm' && t13.product === 'hp' && t13.treeVersion === 'hp.air_source.v1', 'T-13 air-source divert');
const t14 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'wshp_air_source', 'air_source_ducted_hp']));
assert(t14.node === 'hp.landing.picker', 'T-14 continues into the live heat-pump tree');
const t15 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'wshp_ductless']));
assert(t15.result === 'wshp_divert_mini_split' && F.results[t15.result].outcome === 'insufficient_info' && t15.product === 'wshp' && t15.treeVersion === 'wshp.water_to_air.v0', 'T-15 mini-split interim');
const t16 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'wshp_furnace_combustion']));
assert(t16.result === 'wshp_divert_furnace' && F.results[t16.result].outcome === 'call_pro', 'T-16 furnace interim');
const t17 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'wshp_out_of_scope_size']));
assert(t17.result === 'wshp_out_of_scope_call_pro', 'T-17 out of scope');
const t18 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'wshp_system_unsure']));
assert(t18.result === 'wshp_system_unconfirmed' && F.results[t18.result].outcome === 'insufficient_info', 'T-18 system unsure');
const t19 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'hazard_now']));
assert(t19.result === 'wshp_hazard_now', 'T-19 equipment hazard');
const t20 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'wshp_closed_loop', 'want_diy_refrigerant_anyway']));
assert(t20.result === 'wshp_handback_call_pro' && wshpEvents(t20).indexOf('gate_fired:refrigerant_intent') !== -1, 'T-20 refrigerant intent');
const t21 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'wshp_closed_loop', 'want_diy_pro_only']));
assert(t21.result === 'wshp_handback_call_pro' && wshpEvents(t21).indexOf('notes.advanced_diy:off') !== -1, 'T-21 advanced DIY off');
const t22 = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none', 'wshp_closed_loop', 'hazard_now']));
assert(t22.result === 'wshp_hazard_now', 'T-22 handback hazard');
let t23 = false;
try { F.answer(F.create(), 'water_source_geo', { agreed: true, termsVersion: 'public-beta-2026-10-08' }); }
catch (err) { t23 = true; }
assert(t23, 'T-23 water_source_geo before the gate throws');
let a27 = false;
try {
  const early = F.create();
  early.node = 'wshp.entry.equipment_gate';
  F.answer(early, 'wshp_closed_loop', { agreed: true, termsVersion: 'public-beta-2026-10-08' });
} catch (err) { a27 = /Safety and consent are required/.test(err.message); }
assert(a27, 'A-27 wshp answer before safety and consent throws');
const stopped = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_none']));
F.stop(stopped);
assert(stopped.node === 'ac.gate.cluster_entry' && stopped.safetyCleared === false, 'A-28 stop returns to the safety gate');
// Live stop() sets stopping, so the next "none of these" is the call-pro exit, not a new consent.
F.answer(stopped, 'none_of_these');
assert(stopped.result === 'professional' && F.results.professional.reason === 'stop_cleared_no_hazard', 'T-24 stop then none of these stays the live call-pro exit');
const t24 = walk('hp', gate);
assert(t24.product === 'hp' && t24.treeVersion === 'hp.air_source.v1', 'T-24 a new session can still choose the heat pump');
const floodStop = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_flooding']));
const floodBefore = floodStop.result;
F.stop(floodStop);
assert(floodStop.result === floodBefore && floodStop.result === 'wshp_mech_room_flood', 'A-28 stop on a Stop / professional result is a no-op');
const emergencyStop = walk('ask', gate.concat(['other_heat_or_ductless', 'water_source_geo', 'wshp_hz_smoke_burn_spark']));
F.stop(emergencyStop);
assert(emergencyStop.result === 'fire', 'A-28 stop on an Emergency result is a no-op');
const t26 = F.summary(t9, { codes: 'Lockout light; EWT 41' });
assert(t26.indexOf('Loop type: open loop (well, lake, or pond water).') !== -1 && t26.indexOf('Codes / lights / water temps already showing (homeowner supplied): Lockout light; EWT 41') !== -1, 'T-26 codes note');
assert(t26.indexOf('What I checked: safety screen — none of the listed hazards. No covers removed. No loop, well, refrigerant, or electrical work done.') !== -1, 'T-26 checked line');
assert((t26.split('Loop type:').length - 1) === 1, 'T-26 loop line once');

const floodShutoff = F.results.wshp_mech_room_flood.actions.find(action => action.indexOf('main water shutoff') !== -1);
assert(floodShutoff && floodShutoff.indexOf('only if you can reach it on a dry floor away from the equipment and any wiring') !== -1, 'N5 flood main-shutoff condition');
const smallLeak = F.nodes['wshp.handback.call_pro'].options.find(op => op.id === 'wshp_cx_small_leak');
assert(smallLeak && smallLeak.hint === 'Put a towel or pan down only if the floor is dry and it is away from wiring.', 'N7 small-leak hint');
const scopedEquipment = 'Equipment: water-to-air water-source / geothermal heat pump (home system; homeowner believes 6 tons or less).';
assert(t8note.indexOf(scopedEquipment) !== -1, 'in-scope note keeps the 6-ton water-to-air line');
assert(F.summary(t15).indexOf(scopedEquipment) === -1, 'N8 mini-split divert omits the in-scope equipment line');
assert(F.summary(t16).indexOf(scopedEquipment) === -1, 'N8 furnace divert omits the in-scope equipment line');
assert(F.summary(t17).indexOf(scopedEquipment) === -1, 'N8 oversize divert omits the in-scope equipment line');
assert(F.results.gas.avoid === 'Do not search for the leak, reset an alarm, or re-enter to switch the AC off.', 'AC gas avoid stays unchanged');
assert(F.presentResult(t6).avoid === 'Do not search for the leak, reset an alarm, or re-enter to switch the system off.', 'N9 WSHP gas avoid says the system');
assert(F.presentResult(t6) !== F.results.gas, 'N9 WSHP gas copy is a swap, not the shared result');
const pointer = 'Start again, choose Something else: mini-split, geothermal, thermostat, other, then Water-source / geothermal heat pump.';
const hpWater = F.results.hp_water_source_oos;
assert(!/later phase/i.test([hpWater.title, hpWater.explanation, hpWater.avoid].concat(hpWater.actions).join(' ')), 'hp water-source result drops later phase');
assert(!/geothermal/i.test(hpWater.title + ' ' + hpWater.explanation + ' ' + hpWater.avoid), 'hp water-source result drops geothermal from the out-of-scope wording');
assert(hpWater.actions.indexOf(pointer) !== -1, 'hp water-source result points back to the water-source check');
const acEquip = F.results.out_of_scope_equipment;
assert(!/geothermal/i.test(acEquip.explanation), 'AC out-of-scope explanation no longer lists geothermal');
assert(acEquip.actions.some(action => action.indexOf(pointer) !== -1 && /water-source or geothermal heat pump/.test(action.slice(0, action.indexOf(pointer)))), 'AC out-of-scope pointer is only for water-source or geothermal owners');
assert(acEquip.actions.some(action => /Hire a technician/.test(action)), 'AC out-of-scope still covers other unsupported equipment');
Object.keys(F.nodes).forEach(id => {
  F.nodes[id].options.forEach(op => {
    assert(typeof op.fact === 'string', 'option fact is a string at ' + id + '/' + op.id);
  });
});
const ductWork = walk('ac', gate.concat(['split_central_cool_only', 'landing_weak_airflow', 'filter_clean_ok', 'want_duct_work']));
assert(ductWork.result === 'duct_work_rejected_not_basic' && F.results[ductWork.result].outcome === 'call_pro', 'want_duct_work reaches call_pro');
assert(F.summary(ductWork).indexOf('HOMEOWNER SERVICE NOTE') === 0, 'want_duct_work service note builds');
const finComb = walk('ac', gate.concat(['split_central_cool_only', 'landing_not_cooling', 'mode_cool_setpoint_ok', 'filter_clean_ok', 'fan_spinning', 'want_fin_comb_deep_coil']));
assert(finComb.result === 'coil_service_pro_only' && F.results[finComb.result].outcome === 'call_pro', 'want_fin_comb_deep_coil reaches call_pro');
assert(F.summary(finComb).indexOf('HOMEOWNER SERVICE NOTE') === 0, 'want_fin_comb_deep_coil service note builds');
assert(/Five checks in this United States beta\./.test(appText), 'safety page names five checks');
assert(/Water-source \/ geothermal heat pumps up to 6 tons, residential water-to-air\./.test(appText), 'safety page includes the water-source check');
assert(/Open-loop well, lake, or pond water-care problems always go to a pro, and there is no loop, pump, refrigerant, or electrical work\./.test(appText), 'safety page states the water-source limits');
assert(/For water-source systems, this beta gives safety screens and a service note for a pro, not repairs\./.test(appText), 'safety page says water-source is screens and a note');
assert(!/water-source and geothermal equipment/.test(appText), 'safety page no longer lists water-source equipment as out of scope');
const geoOption = F.nodes['ac.cool.intake.system_confirm'].options.find(op => op.id === 'geo_packaged_other');
assert(geoOption && geoOption.next === '@out_of_scope_equipment', 'geothermal packaged option keeps its route');
assert(geoOption.hint === 'Geothermal or water-source: start again, choose Something else: mini-split, geothermal, thermostat, other, then Water-source / geothermal heat pump. Packaged or other systems are not covered yet.', 'geothermal packaged hint points back to the water-source check');
assert(F.results.out_of_scope_equipment.urgency === 'Not covered in this beta yet', 'out-of-scope equipment urgency is not a hard outside-the-beta title');
const geoMention = /water[-\s]?source|geothermal/i;
const oosClaim = /out of scope|outside this beta|outside these checks|not diagnosed|not covered|not part of this beta/i;
const redirect = /start again, choose Something else: mini-split, geothermal, thermostat, other, then Water-source \/ geothermal heat pump/i;
function sentencesOf(text) {
  return String(text || '').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}
function oosSentences(text) {
  return sentencesOf(text).filter(s => geoMention.test(s) && oosClaim.test(s) && !redirect.test(s));
}
Object.keys(F.nodes).forEach(id => {
  F.nodes[id].options.forEach(op => {
    const hintHit = geoMention.test(op.label) && oosClaim.test(op.hint) && !redirect.test(op.hint);
    const sentenceHits = oosSentences([op.label, op.hint, op.fact].join(' '));
    assert(!hintHit && sentenceHits.length === 0, 'option calls geothermal or water-source out of scope: ' + id + '/' + op.id + ' ' + sentenceHits.join(' | '));
  });
});
Object.keys(F.results).forEach(id => {
  const res = F.results[id];
  const blob = [res.tier, res.urgency, res.title, res.explanation, res.avoid].concat(res.actions || []).join('\n');
  const hits = oosSentences(blob);
  assert(hits.length === 0, 'result calls geothermal or water-source out of scope: ' + id + ' ' + hits.join(' | '));
});
assert(oosSentences(appText).length === 0, 'app page text calls geothermal or water-source out of scope: ' + oosSentences(appText).join(' | '));
const furnaceMention = /\bfurnace\b/i;
const furnaceRedirect = /start again and choose furnace \(gas or electric, with or without central AC\)/i;
const furnaceAllowed = /wall (?:or |and )?floor furnace|oil, wood, pellet, wall or floor furnace|boilers, radiant floors/i;
function furnaceOosSentences(text) {
  return sentencesOf(text).filter(s => furnaceMention.test(s) && oosClaim.test(s) && !furnaceRedirect.test(s) && !furnaceAllowed.test(s));
}
Object.keys(F.nodes).forEach(id => {
  const node = F.nodes[id];
  const nodeHits = furnaceOosSentences([node.title, node.body, node.caution].join('\n'));
  assert(nodeHits.length === 0, 'node calls a furnace out of scope: ' + id + ' ' + nodeHits.join(' | '));
  node.options.forEach(op => {
    const hits = furnaceOosSentences([op.label, op.hint, op.fact].join(' '));
    assert(hits.length === 0, 'option calls a furnace out of scope: ' + id + '/' + op.id + ' ' + hits.join(' | '));
  });
});
Object.keys(F.results).forEach(id => {
  const res = F.results[id];
  const blob = [res.tier, res.urgency, res.title, res.explanation, res.avoid].concat(res.actions || []).join('\n');
  const hits = furnaceOosSentences(blob);
  assert(hits.length === 0, 'result calls a furnace out of scope: ' + id + ' ' + hits.join(' | '));
});
assert(furnaceOosSentences(appText).length === 0, 'app page text calls a furnace out of scope: ' + furnaceOosSentences(appText).join(' | '));
assert(F.results.wshp_divert_furnace.actions.some(action => action.indexOf('start again and choose Furnace (gas or electric, with or without central AC)') !== -1), 'WSHP furnace divert points at the furnace Start choice');

// ---- Furnace fn.furnace.v0 (Wave-1 Slice 1) ----
const FN_GATE = 'fn.gate.combustion_co';
const META = { agreed: true, termsVersion: 'beta-2026-09-13' };
const clone = s => JSON.parse(JSON.stringify(s));
const fnStart = () => walk('ask', gate.concat(['furnace']));
const res = s => F.results[s.result] || {};
const outcomeOf = s => res(s).outcome;
// Explore every choice the UI can show (viewNode), using the real engine. stopAt ends a branch early.
function explore(start, stopAt) {
  const out = [];
  const stack = [[start, 0]];
  while (stack.length) {
    const [s, depth] = stack.pop();
    if (s.result || (stopAt && stopAt(s))) { out.push(s); continue; }
    if (depth > 40) throw new Error('explore depth at ' + s.node);
    F.viewNode(s.node, s).options.forEach(op => {
      const c = clone(s);
      try { F.answer(c, op.id, META); } catch (e) { failed += 1; console.error('FAIL shown choice threw', s.node, op.id, e.message); return; }
      stack.push([c, depth + 1]);
    });
  }
  return out;
}
const fnNodesSeen = s => s.answers.map(a => a.node).concat(s.node ? [s.node] : []);
// The part of a path that ran in the fn lane (from system type until a lane handoff).
const fnSegment = s => {
  const seg = [];
  let on = false;
  s.answers.forEach(a => {
    if (a.node === 'sw.intake.system_type' && a.choice === 'furnace') { on = true; return; }
    if (on) seg.push(a);
    if (on && ((a.node === 'fn.landing.picker' && a.choice === 'landing_cooling_problem') || (a.node === 'fn.intake.system_confirm' && a.choice === 'furnace_plus_heat_pump'))) on = false;
  });
  return seg;
};
const handedOff = s => s.answers.some(a => (a.node === 'fn.landing.picker' && a.choice === 'landing_cooling_problem') || (a.node === 'fn.intake.system_confirm' && a.choice === 'furnace_plus_heat_pump'));
const NEG = /(n['’]t\b|\bnot\b|\bnever\b|\bno\b)/i;
const FORBIDDEN_COPY = /gas valve|gas cock|pilot|relight|igniter|ignitor|flame sensor|inducer|limit switch|rollout switch|reset button|\breset\b|capacitor|contactor|panel interior|deadfront|burner (door|compartment)|furnace (door|panel)|amp draw|\bamps?\b|multimeter|flue|chimney|heating element|sequencer|ladder|\broof\b|switch on|turn (the )?(furnace )?switch|flip (the )?(switch|breaker)/i;
const sentences = t => String(t || '').split(/(?<=[.!?])\s+|\n+/).map(x => x.trim()).filter(Boolean);
const forbiddenHits = t => sentences(t).filter(x => FORBIDDEN_COPY.test(x) && !NEG.test(x));
const nodeText = id => { const nd = F.nodes[id]; return [nd.title, nd.body, nd.caution].concat(nd.options.map(op => op.label + '. ' + op.hint)).join('\n'); };
const resultText = r => [r.title, r.urgency, r.explanation].concat(r.actions).concat([r.avoid]).join('\n');

// F1 version pin + lane stamp
assert(F.treeVersionFn === 'fn.furnace.v0', 'F1 furnace tree version pin');
const fs0 = fnStart();
assert(fs0.node === FN_GATE && fs0.product === 'fn' && fs0.treeVersion === 'fn.furnace.v0', 'F1 furnace choice enters fn lane at the gate, got ' + fs0.node + ' ' + fs0.product);
assert(fs0.audit.some(e => e.event === 'product_lane:fn'), 'F1 audit product_lane:fn');

// F2 Start: five choices. Water-source moved under Something else. Furnace stays before that door.
const st = F.nodes['sw.intake.system_type'];
assert(st.options.map(op => op.id).join('|') === 'cooling_only_ac|heat_pump|furnace|other_heat_or_ductless|not_sure', 'F2 system type choice ids/order');
const stOp = id => st.options.find(op => op.id === id);
assert(stOp('furnace').label === 'Furnace (gas or electric, with or without central AC)' && stOp('furnace').next === FN_GATE, 'F2 furnace choice label and edge');
assert(stOp('cooling_only_ac').label === 'Cooling-only AC' && stOp('cooling_only_ac').hint === 'The outdoor unit is for cooling. A furnace, boiler, or other heater provides heat.', 'F2 cooling-only copy unchanged');
assert(stOp('heat_pump').label === 'Heat pump (heats and cools with the outdoor unit)' && stOp('heat_pump').hint === 'The outdoor unit runs for heat and for cooling.', 'F2 heat-pump copy unchanged');
assert(stOp('not_sure').label === 'Not sure' && /Up to three plain questions/.test(stOp('not_sure').hint), 'F2 not-sure copy unchanged');

// Exhaustive furnace walk (flag off), then flag on
const fnPaths = explore(fs0, s => handedOff(s) && s.product !== 'fn');
assert(fnPaths.length > 40, 'F walk produced paths: ' + fnPaths.length);

// F3 gate ordering: every furnace path is gate → consent → system type → fn gate, before any other fn node
fnPaths.forEach(s => {
  const seq = s.answers.map(a => a.node);
  assert(seq.slice(0, 4).join('|') === 'ac.gate.cluster_entry|ac.session.consent|sw.intake.system_type|' + FN_GATE, 'F3 order ' + seq.slice(0, 5).join('>'));
  const firstFn = seq.findIndex(id => id.indexOf('fn.') === 0);
  assert(seq[firstFn] === FN_GATE, 'F3 first fn node is the gate');
});

// F4 gate shape: no DIY or continue exits
const gateNode = F.nodes[FN_GATE];
assert(gateNode.safetyGate === true, 'F4 gate safetyGate');
assert(gateNode.options.map(op => op.id).join('|') === 'gas_smell_or_unknown_smell|co_alarm_or_symptoms|rollout_soot_scorch|burning_smoke_sparks|cold_exposure_risk|flame_yellow_orange|boom_at_ignition|unsure|none_of_these', 'F4 gate choice ids');
const GATE_WANT = { gas_smell_or_unknown_smell: 'emergency_exit', co_alarm_or_symptoms: 'emergency_exit', rollout_soot_scorch: 'emergency_exit', burning_smoke_sparks: 'emergency_exit', cold_exposure_risk: 'emergency_exit', unsure: 'emergency_exit', flame_yellow_orange: 'call_pro', boom_at_ignition: 'call_pro' };
Object.keys(GATE_WANT).forEach(id => {
  const s = clone(fs0); F.answer(s, id, META);
  assert(!!s.result && outcomeOf(s) === GATE_WANT[id], 'F4 gate ' + id + ' -> ' + GATE_WANT[id] + ', got ' + outcomeOf(s));
  assert(!res(s).continueTo && ['Emergency', 'Stop / professional'].indexOf(res(s).tier) !== -1, 'F4 gate ' + id + ' is a stop screen with no continue');
  let resumed = false; try { F.resume(s); resumed = true; } catch (e) { /* expected */ }
  assert(!resumed, 'F4 gate ' + id + ' cannot resume');
  assert(s.audit.some(e => e.event.indexOf('gate_fired:') === 0), 'F4 gate ' + id + ' fires gate audit');
  const before = s.result; F.stop(s); assert(s.result === before, 'F4 Stop does not clear the ' + id + ' screen');
});
const gc = clone(fs0); F.answer(gc, 'none_of_these', META);
assert(gc.node === 'fn.intake.system_confirm', 'F4 gate clear -> fn.intake.system_confirm in fn lane');
assert(forbiddenHits(nodeText(FN_GATE)).length === 0 && /don't go look at the flame/i.test(gateNode.body), 'F4 gate never asks the user to look at the flame');

// F5 gas-smell and CO copy locks
const fnGas = F.results.fn_gas_smell, fnCo = F.results.fn_co_alarm;
assert(/out now/.test(fnGas.actions[0]) && /switches/.test(fnGas.actions[1]) && /thermostat/.test(fnGas.actions[1]) && /phones/.test(fnGas.actions[1]) && /spark/.test(fnGas.actions[1]), 'F5 gas: leave first, no switches/phones/thermostat/spark');
assert(fnGas.actions.some(a => /find the leak/.test(a)) && fnGas.actions.some(a => /neighbor/.test(a) && /gas utility/.test(a) && /911/.test(a)), 'F5 gas: no leak hunting; utility or 911 from outside');
assert(/pets/.test(fnCo.actions[0]) && /fresh air/.test(fnCo.actions[0]) && /911 or the fire department/.test(fnCo.actions[1]) && /go back in/.test(fnCo.actions[2]), 'F5 CO: out, call from outside, stay out');

// F6 no AC cooling outdoor / capacitor / power / Advanced reachability from the fn lane (flag off and flag on)
function assertFnClean(paths, tag) {
  paths.forEach(s => {
    const seg = fnSegment(s).map(a => a.node).concat(!handedOff(s) && s.node ? [s.node] : []);
    seg.forEach(id => {
      assert(F.fnForbidden.indexOf(id) === -1 && id.indexOf('ac.adv.cap.') !== 0 && !/^ac\.(cool\.outdoor|start|cool\.power|cool\.indoor)/.test(id), tag + ' fn lane reached ' + id);
    });
    if (!handedOff(s) && s.result) {
      assert(F.fnForbidden.indexOf('@' + s.result) === -1, tag + ' fn lane ended on forbidden result ' + s.result);
      assert(res(s).diyTier !== 'advanced', tag + ' advanced terminal ' + s.result);
    }
  });
}
assertFnClean(fnPaths, 'F6 flag off');
globalThis.SW_CONFIG.advancedRepairsEnabled = true;
assertFnClean(explore(fnStart(), s => handedOff(s) && s.product !== 'fn'), 'F6 flag on');
globalThis.SW_CONFIG.advancedRepairsEnabled = false;
// direct overlay probe: any forbidden target is caught
const probe = fnStart(); F.answer(probe, 'none_of_these', META); F.answer(probe, 'gas_furnace', META); F.answer(probe, 'landing_no_heat', META); F.answer(probe, 'settings_ok_still_problem', META);
assert(probe.node === 'ac.cool.filter.check', 'F6 probe at filter');
const pf = clone(probe); F.answer(pf, 'filter_clean_ok', META);
assert(pf.node === 'fn.conclude.call_pro' && pf.fnReason === 'no_heat_after_basics', 'F6 clean filter (gas, no heat) -> fn.conclude no_heat_after_basics, got ' + pf.node + ' ' + pf.fnReason);

// F6b the fn_advanced_off catch-all is defense only: no authored furnace path may hit it, and every fn.conclude has a mapped reason
fnPaths.concat([]).forEach(s => {
  if (handedOff(s)) return;
  assert(s.fnReason !== 'fn_advanced_off', 'F6b authored path hit fn_advanced_off catch-all: ' + fnSegment(s).map(a => a.node + '/' + a.choice).join(' > '));
  if (s.result === 'fn_call_pro') assert(!!s.fnReason && !!F.fnReasonCopy[s.fnReason], 'F6b fn_call_pro without mapped reason');
});

// F7 hazard exit on every furnace question
const askedFn = new Set();
fnPaths.forEach(s => fnSegment(s).forEach(a => askedFn.add(a.node)));
askedFn.delete(FN_GATE);
['fn.intake.system_confirm', 'fn.landing.picker', 'fn.tstat.mode_setpoint', 'fn.conclude.call_pro'].concat(F.fnReused).forEach(id => assert(askedFn.has(id), 'F7 walk covers ' + id));
fnPaths.forEach(s => {
  const seg = fnSegment(s);
  seg.forEach((a, i) => {
    if (a.node === FN_GATE || a.node.indexOf('hp.') === 0) return;
    // rebuild the state just before this answer and check the shown choices
    const pre = fnStart();
    seg.slice(0, i).forEach(b => F.answer(pre, b.choice, META));
    const shown = F.viewNode(pre.node, pre).options.map(op => op.id);
    assert(shown.indexOf('hazard_now') !== -1, 'F7 hazard_now missing on ' + pre.node);
    const hz = clone(pre); F.answer(hz, 'hazard_now', META);
    assert(hz.result === 'fn_hazard_now' && outcomeOf(hz) === 'emergency_exit', 'F7 hazard_now on ' + pre.node + ' -> emergency_exit, got ' + hz.result);
  });
});

// F8 cooling-complaint handoff
const cool = fnStart(); ['none_of_these', 'gas_furnace', 'landing_cooling_problem'].forEach(c => F.answer(cool, c, META));
assert(cool.node === 'ac.cool.intake.system_confirm' && cool.product === 'ac' && cool.treeVersion === 'ac.cool.v1', 'F8 cooling problem -> AC intake, lane ac');
assert(cool.audit.some(e => e.event === 'handoff:fn_to_ac_cooling'), 'F8 handoff audit');
['split_central_cool_only', 'landing_unusual_noise', 'noise_no_hazard_symptoms'].forEach(c => F.answer(cool, c, META));
assert(cool.node === 'ac.noise.clarify_outdoor_hum', 'F8 after handoff the AC tree runs unchanged');
assert(!Object.keys(F.nodes).some(id => id.indexOf('fn.cool') === 0), 'F8 no fn cooling nodes');

// F9 HP + gas furnace: yes and not-sure pass the gate, no skips, return to HP
const hpIntake2 = walk('hp', gate);
['air_source_hp_gas_furnace', 'air_source_hp_gas_unsure'].forEach(ch => {
  const s = clone(hpIntake2); F.answer(s, ch, META);
  assert(s.node === FN_GATE && s.product === 'hp' && s.treeVersion === 'hp.air_source.v1', 'F9 ' + ch + ' -> fn gate (lane hp), got ' + s.node);
  const back = clone(s); F.answer(back, 'none_of_these', META);
  assert(back.node === 'hp.landing.picker' && back.product === 'hp', 'F9 ' + ch + ' gate clear returns to hp.landing.picker, got ' + back.node);
  assert(back.audit.some(e => e.event === 'notes.fn_gate:return_to_hp') && back.audit.some(e => e.event.indexOf('flag:hp_gas_furnace=') === 0), 'F9 audit flags');
  Object.keys(GATE_WANT).forEach(id => { const h = clone(s); F.answer(h, id, META); assert(!!h.result && outcomeOf(h) === GATE_WANT[id], 'F9 ' + ch + '/' + id + ' stops'); });
});
const plainHp = clone(hpIntake2); F.answer(plainHp, 'air_source_ducted_hp', META);
assert(plainHp.node === 'hp.landing.picker', 'F9 plain heat pump unchanged');
// every way into hp.landing.picker: plain HP, or the gate was cleared this session
const hpEntries = [walk('hp', gate), walk('ac', gate.concat(['heat_pump'])), identify('winter_outdoor_unsure', 'em_aux_unsure', 'heat_source_unsure')];
hpEntries.forEach(st0 => explore(st0, s => s.node === 'hp.landing.picker').forEach(s => {
  if (s.node !== 'hp.landing.picker') return;
  const conf = s.answers.find(a => a.node === 'hp.intake.system_confirm');
  const passed = s.answers.some(a => a.node === FN_GATE && a.choice === 'none_of_these');
  assert(conf.choice === 'air_source_ducted_hp' || passed, 'F9 gas/unsure reached HP landing without the gate');
}));
// dual-fuel from the furnace side: gate once, then HP intake gas choice goes straight to HP landing
const df = fnStart(); ['none_of_these', 'furnace_plus_heat_pump'].forEach(c => F.answer(df, c, META));
assert(df.node === 'hp.intake.system_confirm' && df.product === 'hp' && df.hpGasFurnace === 'yes', 'F9 dual-fuel handoff to HP intake');
F.answer(df, 'air_source_hp_gas_furnace', META);
assert(df.node === 'hp.landing.picker' && df.answers.filter(a => a.node === FN_GATE).length === 1, 'F9 gate is not repeated after the furnace side cleared it');

// F10 electric furnace skips flame/ignition questions and wording
const elec = fnStart(); ['none_of_these', 'electric_furnace'].forEach(c => F.answer(elec, c, META));
const FLAME = /flame|ignit|pilot|burner|burning cleanly/i;
explore(elec, s => handedOff(s) && s.product !== 'fn').forEach(s => {
  s.answers.slice(5).forEach(a => assert(!FLAME.test(nodeText(a.node).replace(/[^.\n]*(n['’]t|not|never|no)\b[^.\n]*/gi, '')), 'F10 electric path shows flame wording at ' + a.node));
  if (s.result === 'fn_call_pro') {
    assert(s.fnReason !== 'ignition_or_flame_suspected', 'F10 electric never gets the ignition reason');
    assert(!FLAME.test(F.presentResult(s).explanation), 'F10 electric conclusion copy has no flame wording');
  }
  assert(!fnNodesSeen(s).some(id => /^fn\.(vent|condensate|power)\./.test(id)), 'F10 Slice-2 nodes are not in this slice');
});
const ecold = clone(elec); ['landing_cold_air', 'settings_ok_still_problem', 'filter_clean_ok'].forEach(c => F.answer(ecold, c, META));
assert(ecold.fnReason === 'electric_furnace_components', 'F10 electric cold air -> electric_furnace_components, got ' + ecold.fnReason);

// F11 forbidden-word ban on furnace copy ('don't' lines allowed)
const fnCopy = F.fnWave1.map(id => ['node ' + id, nodeText(id)])
  .concat(Object.keys(F.results).filter(id => id.indexOf('fn_') === 0).map(id => ['result ' + id, resultText(F.results[id])]))
  .concat(Object.keys(F.fnReasonCopy).map(k => ['reason ' + k, F.fnReasonCopy[k]]))
  .concat([['system type furnace choice', stOp('furnace').label + '. ' + stOp('furnace').hint]]);
fnCopy.forEach(([where, text]) => forbiddenHits(text).forEach(hit => assert(false, 'F11 forbidden instruction in ' + where + ': ' + hit)));
assert(!/(turn|switch|flip) (it |the furnace switch )?on\b/i.test(fnCopy.map(x => x[1]).join('\n')), 'F11 no furnace-switch On instruction');

// F12 CO / backup-heat warning on every furnace conclusion (as rendered)
fnPaths.filter(s => s.result && !handedOff(s)).forEach(s => {
  assert(F.presentResult(s).actions.indexOf(F.fnCoLine) !== -1, 'F12 CO line missing on ' + s.result);
});
['fn_gas_smell', 'fn_co_alarm', 'fn_rollout_soot', 'fn_burning_sparks', 'fn_cold_exposure', 'fn_flame_abnormal', 'fn_ignition_bang', 'fn_gate_unsure'].forEach(id => {
  assert(F.results[id].actions.indexOf(F.fnCoLine) !== -1, 'F12 gate result ' + id + ' carries the CO line natively (HP lane too)');
});
assert(F.fnCoLine === "Until heat's back: never heat with an oven, stove, grill, or generator indoors. Plug electric space heaters into a wall, clear of anything that burns.", 'F12 CO line wording');

// F13 every fn terminal is one of the allowed outcomes; Basic successes stay Basic
fnPaths.filter(s => s.result).forEach(s => {
  assert(['next_step', 'call_pro', 'emergency_exit', 'insufficient_info'].indexOf(outcomeOf(s)) !== -1, 'F13 outcome ' + s.result);
  if (outcomeOf(s) === 'next_step') assert(res(s).diyTier === 'basic', 'F13 next_step must be Basic: ' + s.result);
});
// fn audits carry the fn tree until a handoff
fnPaths.filter(s => !handedOff(s)).forEach(s => {
  const i = s.audit.findIndex(e => e.event === 'product_lane:fn');
  assert(s.audit.slice(i).every(e => e.tree === 'fn.furnace.v0'), 'F13 audit tree stamp fn.furnace.v0');
});

// F14 regression: AC copy unchanged on reused nodes (data, not view)
assert(F.nodes['ac.cool.filter.check'].options.map(op => op.id).join('|') === 'filter_dirty_clogged|filter_clean_ok|filter_clean_weak_airflow|filter_missing|cannot_check_safely', 'F14 AC filter node unchanged');
assert(F.results.filter_replace_basic.actions[1] === 'Set the system to Cool and retest after 15–30 minutes.', 'F14 AC filter result copy unchanged');
assert(!F.viewNode('ac.cool.filter.check', walk('ac', gate.concat(['split_central_cool_only', 'landing_weak_airflow']))).options.some(op => op.id === 'hazard_now'), 'F14 AC lane does not show the furnace hazard choice');

// F15 furnace result length budget (explanation + actions + avoid, as rendered, per reason)
const words = t => String(t || '').split(/\s+/).filter(Boolean).length;
const fnRendered = (id, reason) => { const r = F.presentResult({ product: 'fn', fnFuel: 'gas', fnReason: reason || null, audit: [], answers: [], result: id }); return words([r.explanation].concat(r.actions).concat([r.avoid]).join(' ')); };
Object.keys(F.results).filter(id => id.indexOf('fn_') === 0 && id !== 'fn_call_pro').forEach(id => assert(fnRendered(id) <= 92, 'F15 ' + id + ' over 92 words: ' + fnRendered(id)));
Object.keys(F.fnReasonCopy).forEach(k => assert(fnRendered('fn_call_pro', k) <= 92, 'F15 fn_call_pro:' + k + ' over 92 words: ' + fnRendered('fn_call_pro', k)));

// F16 furnace water-at-electrical is its own stop. AC electrical copy stays.
const wetYes = F.nodes['ac.gate.water_near_electrical'].options.find(op => op.id === 'water_at_electrical_yes');
assert(wetYes.next === '@electrical', 'F16 AC water-yes edge unchanged');
assert(F.results.electrical.actions.some(a => a.indexOf('Shut off main power only if you can do it from a dry, safe location.') !== -1), 'F16 AC electrical result still has the dry main-power line');
assert(F.fnEdge['ac.gate.water_near_electrical/water_at_electrical_yes'] === '@fn_water_electrical', 'F16 furnace overlay routes water-yes to fn_water_electrical');
const wet = fnStart();
['none_of_these', 'gas_furnace', 'landing_water_near_furnace', 'water_at_electrical_yes'].forEach(c => F.answer(wet, c, META));
assert(wet.product === 'fn' && wet.result === 'fn_water_electrical' && outcomeOf(wet) === 'emergency_exit', 'F16 path ends at fn_water_electrical, got ' + wet.result);
const wetRes = F.results.fn_water_electrical;
assert(wetRes.tier === F.results.electrical.tier && wetRes.outcome === 'emergency_exit' && wetRes.gate === 'water_near_electrical' && !wetRes.continueTo, 'F16 same severity as electrical, no continue');
const wetShown = F.presentResult(wet);
const wetText = [wetShown.title, wetShown.explanation, wetShown.avoid].concat(wetShown.actions).join('\n');
assert(wetShown.explanation === "Water is at or near the furnace's electrical parts.", 'F16 explanation');
assert(wetShown.actions[0] === "Don't touch the furnace, any switch, or the breaker panel, and don't stand in the water.", 'F16 do-not-touch line');
assert(/call a licensed HVAC pro or an electrician/.test(wetText) && /call 911 from outside/.test(wetText), 'F16 calls a pro or 911 from outside');
fnPaths.filter(s => s.result && !handedOff(s)).forEach(s => {
  const shown = F.presentResult(s);
  const text = [shown.title, shown.urgency, shown.explanation, shown.avoid].concat(shown.actions).join('\n');
  assert(!/shut off main power/i.test(text), 'F16 furnace-lane result says shut off main power: ' + s.result);
});
assert(!/shut off main power/i.test(wetText), 'F16 fn_water_electrical says shut off main power');

// F17 furnace-lane display overrides. Stored AC copy stays.
const acFilterHint = F.nodes['ac.cool.filter.check'].options.find(op => op.id === 'filter_clean_ok').hint;
assert(acFilterHint === 'Weak airflow continues to returns and supplies. Not cooling continues to the outdoor fan.', 'F17 stored filter hint unchanged');
const fnAtFilter = fnStart();
['none_of_these', 'gas_furnace', 'landing_no_heat', 'settings_ok_still_problem'].forEach(c => F.answer(fnAtFilter, c, META));
assert(F.viewNode('ac.cool.filter.check', fnAtFilter).options.find(op => op.id === 'filter_clean_ok').hint === 'Not enough heat continues to returns and supplies. Other heat problems stop for a pro.', 'F17 furnace filter hint');
const batt = F.nodes['ac.tstat.blank.batteries'].options;
assert(batt.find(op => op.id === 'batteries_replaced_display_back').hint === 'Basic success — retest cool call.', 'F17 stored battery hint unchanged');
assert(batt.find(op => op.id === 'hardwired_or_no_batteries').hint === 'Pro path — C-wire / transformer / control power.', 'F17 stored hardwired hint unchanged');
const fnBlank = fnStart();
['none_of_these', 'gas_furnace', 'landing_blank_tstat'].forEach(c => F.answer(fnBlank, c, META));
const fnBatt = F.viewNode('ac.tstat.blank.batteries', fnBlank).options;
assert(fnBatt.find(op => op.id === 'batteries_replaced_display_back').hint === 'Basic success — retest the heat call.', 'F17 furnace battery hint');
assert(fnBatt.find(op => op.id === 'hardwired_or_no_batteries').hint === 'Pro path — a blank hardwired thermostat needs a pro. No wiring or panel work.', 'F17 furnace hardwired hint');
const fnHeatSet = F.results.fn_tstat_set_heat_basic;
assert(fnHeatSet.title === 'Set Heat and a higher setpoint.', 'furnace thermostat result title');
assert(fnHeatSet.actions.indexOf("Still no heat after 10 minutes? Start a new check and answer that heat still won't come on.") !== -1, 'furnace still-no-heat line stays in the furnace lane');
assert(!fnHeatSet.actions.some(a => /pick Furnace/.test(a)), 'furnace thermostat result does not say pick Furnace');
assert(F.results.hp_mode_wrong_basic.actions[2] === 'Wait 10–15 minutes and retest. If the complaint remains with the mode correct, start a new heat pump check and continue from the mode question.', 'HP thermostat wording unchanged');
assert(F.nodes['ac.cool.airflow.returns_supplies'].body.indexOf('rooms you want cooled') !== -1, 'F17 stored returns body unchanged');
const fnReturns = fnStart();
['none_of_these', 'gas_furnace', 'landing_not_enough_heat', 'settings_ok_still_problem', 'filter_clean_ok'].forEach(c => F.answer(fnReturns, c, META));
assert(fnReturns.node === 'ac.cool.airflow.returns_supplies', 'F17 not-enough-heat reaches returns, got ' + fnReturns.node);
const fnReturnsBody = F.viewNode(fnReturns.node, fnReturns).body;
assert(fnReturnsBody.indexOf('rooms you want heated') !== -1 && fnReturnsBody.indexOf('rooms you want cooled') === -1, 'F17 furnace returns body says heated');

// F18 public copy nits
assert(appText.includes('Cooling-only AC, a heat pump, a furnace, something else (a mini-split or geothermal), or not sure.'), 'F18 notice card names a furnace and a mini-split');
assert(/equipment-cabinet removal, gas valves, pilots, relighting, or reset buttons\./.test(appText), 'F18 safety list names gas valves, pilots, relighting, and reset buttons');
assert(appText.includes('Furnace checks are look-only: every session starts at the combustion and CO check, with no gas valve, pilot, relight, reset, or panel work.'), 'F18 sources furnace sentence');
assert(/const dualFuel = onHp && \(state\.hpGasFurnace === 'yes' \|\| state\.hpGasFurnace === 'not_sure'\)/.test(appText), 'F18 dual-fuel sidebar condition');
assert(appText.includes("hpLimit + ' ' + fnLimit"), 'F18 dual-fuel sidebar combines heat-pump and furnace limits');
const d012 = fs.readFileSync(path.join(__dirname, '../docs/ac-second-opinion/legal/disclaimer-change-log.md'), 'utf8').split('\n').find(line => line.indexOf('| D-012 |') === 0);
assert(d012 && d012.indexOf('**Added**') !== -1 && d012.indexOf('**Published**') === -1, 'F18 D-012 status is Added');
assert(/yellow or orange flame already seen/.test(d012) && /bang at ignition/.test(d012) && /call-a-pro/.test(d012), 'F18 D-012 notes yellow flame and bang end at call-a-pro');


// ---- Mini-split ms.ductless.v1 ----
assert(F.treeVersionMs === 'ms.ductless.v1', 'MS-A1 mini-split tree version');
assert(Array.isArray(F.msPr1) && F.msPr1.length === 10, 'MS-G1 ten original mini-split nodes exported');
assert(Array.isArray(F.msV1) && F.msV1.join('|') === 'ms.heat.mode_setpoint|ms.heat.force_heat|ms.heat.defrost_sanity|ms.outdoor.safe_observe', 'MS-G1 heat and outdoor nodes');
assert(Object.keys(F.nodes).length === 108, 'node count is 108');
assert(Object.keys(F.results).length === 234, 'result count is 234');
const ms1 = ['none_of_these', 'agree_18_terms', 'other_heat_or_ductless', 'ductless_mini_split', 'ductless_single_zone'];
const msGate = ms1.slice(0, 4);
const msAt = walk('ask', msGate);
assert(msAt.node === 'ms.intake.system_confirm' && msAt.product === 'ms' && msAt.treeVersion === 'ms.ductless.v1', 'MS-A2 start reaches mini-split intake');
assert(msAt.answers.map(a => a.node).join('|') === 'ac.gate.cluster_entry|ac.session.consent|sw.intake.system_type|sw.intake.other_system', 'MS-A2 answered nodes');
const msLaneAt = msAt.audit.findIndex(e => e.event === 'product_lane:ms');
assert(msLaneAt > msAt.audit.findIndex(e => e.event === 'answer_selected:other_heat_or_ductless') && msLaneAt < msAt.audit.findIndex(e => e.event === 'answer_selected:ductless_mini_split'), 'MS lane is entered before the ductless answer is recorded');
assert(msAt.audit.slice(msLaneAt).every(e => e.tree === 'ms.ductless.v1'), 'MS-A1 audit tree from product_lane:ms');
const eventsOf = s => s.audit.map(e => e.event);
const w1 = walk('ask', ms1.concat(['landing_weak_airflow', 'settings_right_still_problem', 'filter_ok_tool_free_floor', 'cleaned_were_dirty', 'nothing_blocking', 'improved_ok']));
assert(w1.result === 'ms_airflow_improved_basic' && F.results[w1.result].outcome === 'next_step' && F.results[w1.result].diyTier === 'basic', 'W1 basic success');
assert(eventsOf(w1).indexOf('conclusion_reached:next_step_basic') !== -1 && eventsOf(w1).indexOf('diy_tier_shown:basic') !== -1 && eventsOf(w1).indexOf('gate_fired:ms_new_hazard') === -1, 'W1 live basic audit');
assert(eventsOf(w1).indexOf('flag:ms_equipment=ductless_single_zone') !== -1 && eventsOf(w1).indexOf('flag:ms_landing=weak_airflow') !== -1, 'W1 flags');
const w2 = walk('ask', ms1.concat(['landing_weak_airflow', 'settings_right_still_problem', 'filter_ok_tool_free_floor', 'cleaned_were_dirty', 'nothing_blocking', 'still_weak_air']));
assert(w2.result === 'ms_weak_air_after_basics' && F.results[w2.result].outcome === 'call_pro' && eventsOf(w2).indexOf('diy_tier_shown:basic') === -1, 'W2 call_pro');
const w2note = F.summary(w2);
assert(w2note.indexOf('HOMEOWNER SERVICE NOTE — mini-split observations, not a diagnosis') === 0, 'MS-A13 header');
assert(w2note.indexOf('Equipment: ductless mini-split, one indoor unit (homeowner reported).') !== -1, 'MS-A13 equipment');
assert(w2note.indexOf('Tried:') !== -1 && w2note.indexOf('User cleaned the indoor-unit filters. They were dusty or dirty.') !== -1, 'MS-A13 tried');
assert(w2note.indexOf('Something else reported at system type.') !== -1, 'weak-air note keeps the Something else system-type line');
const w3 = walk('ask', ms1.concat(['landing_water_at_head', 'water_on_electrical']));
assert(w3.result === 'ms_water_electrical' && F.results[w3.result].outcome === 'emergency_exit' && !F.results[w3.result].continueTo, 'W3 water/electrical stop');
assertNoShutOff([F.results.ms_water_electrical.title, F.results.ms_water_electrical.explanation, F.results.ms_water_electrical.avoid].concat(F.results.ms_water_electrical.actions).join('\n'), 'W3 shut-off instruction');
const w3events = eventsOf(w3);
assert(w3events.indexOf('gate_fired:water_near_electrical') !== -1 && w3events.indexOf('gate_fired:water_near_electrical') < w3events.indexOf('exit_ramp:water_near_electrical') && w3events.indexOf('exit_ramp:water_near_electrical') < w3events.indexOf('conclusion_reached:emergency_exit'), 'MS-A12 W3 audit order');
assert(w3events.indexOf('diy_tier_shown:basic') === -1 && w3events.indexOf('diy_tier_shown:advanced') === -1, 'W3 shows no DIY tier');
const w4 = walk('ask', ms1.concat(['landing_error_code', 'code_recorded']));
assert(w4.result === 'ms_error_code_wave1' && eventsOf(w4).indexOf('flag:ms_landing=error_code') !== -1 && eventsOf(w4).every(e => e.indexOf('gate_fired:') !== 0), 'W4 error code');
const w4b = walk('ask', ms1.concat(['landing_error_code', 'code_refrigerant_leak_alert']));
assert(w4b.result === 'leak' && eventsOf(w4b).indexOf('gate_fired:refrigerant_alarm_or_release') !== -1, 'W4b leak code');
const w5a = walk('ask', ms1.concat(['landing_ice_seen', 'ice_want_keep_running']));
assert(w5a.result === 'ms_ice_keep_running' && F.results[w5a.result].outcome === 'emergency_exit', 'W5a keep running');
const w5aEvents = eventsOf(w5a);
assert(w5aEvents.indexOf('gate_fired:ice_keep_running') < w5aEvents.indexOf('exit_ramp:ice_keep_running') && w5aEvents.indexOf('exit_ramp:ice_keep_running') < w5aEvents.indexOf('conclusion_reached:emergency_exit'), 'MS-A12 W5a audit order');
const w5aBefore = w5a.result; F.stop(w5a); assert(w5a.result === w5aBefore, 'MS-A14 stop leaves the ice keep-running result');
const w3before = w3.result; F.stop(w3); assert(w3.result === w3before, 'MS-A14 stop leaves the water/electrical result');
const w5b = walk('ask', ms1.concat(['landing_ice_seen', 'ice_seen_cooling']));
assert(w5b.result === 'ms_ice_cooling_wave1' && F.results[w5b.result].tier === 'Stop / professional' && F.results[w5b.result].outcome === 'call_pro' && eventsOf(w5b).indexOf('diy_tier_shown:basic') === -1, 'W5b ice while cooling');
const w5bBefore = w5b.result; F.stop(w5b); assert(w5b.result === w5bBefore, 'MS-A14 stop leaves the ice call-pro result');
const w6 = walk('ask', ms1.concat(['landing_no_cool', 'settings_right_still_problem', 'filter_cleaned_recently', 'louver_stuck_wont_move']));
assert(w6.result === 'ms_louver_stuck' && F.results[w6.result].outcome === 'call_pro', 'W6 louver');
const w7 = walk('ask', ms1.concat(['landing_weak_airflow', 'settings_right_still_problem', 'filter_needs_ladder']));
assert(w7.result === 'ms_filter_inaccessible' && F.results[w7.result].outcome === 'call_pro', 'W7 ladder is call_pro');
['filter_needs_tools_or_force', 'manual_says_cut_power'].forEach(id => {
  const stepped = walk('ask', ms1.concat(['landing_weak_airflow', 'settings_right_still_problem', id]));
  assert(stepped.result === 'ms_filter_inaccessible' && F.results[stepped.result].outcome === 'call_pro', 'unsafe filter access ' + id);
});
const w8 = walk('ac', gate.concat(['ductless_mini_split', 'ductless_single_zone', 'landing_ice_seen', 'ice_want_keep_running']));
assert(w8.result === 'ms_ice_keep_running' && w8.treeVersion === 'ms.ductless.v1' && eventsOf(w8).filter(e => e === 'product_lane:ms').length === 1, 'W8 AC intake switches to the mini-split lane');
const wh1 = walk('ask', ms1.concat(['landing_no_heat', 'heat_fixed_after_setting']));
assert(wh1.result === 'ms_heat_settings_fixed_basic' && F.results[wh1.result].outcome === 'next_step' && F.results[wh1.result].diyTier === 'basic', 'WH1 heat settings basic success');
assert(eventsOf(wh1).indexOf('diy_tier_shown:basic') !== -1 && eventsOf(wh1).indexOf('gate_fired:ms_new_hazard') === -1 && eventsOf(wh1).indexOf('flag:ms_landing=no_heat') !== -1, 'WH1 basic audit');
const wh1note = F.summary(wh1);
assert(wh1note.indexOf('Tried:') !== -1 && wh1note.indexOf('User set Heat, a setting above the room, a normal fan, and no timer. Heating returned.') !== -1, 'WH1 tried line');
const wh1bare = JSON.parse(JSON.stringify(wh1));
wh1bare.answers.forEach(a => { if (String(a.fact || '').indexOf('Complaint:') === 0) a.fact = ''; });
assert(F.summary(wh1bare).indexOf('Mini-split heating concern; see reported observations.') !== -1, 'heat complaint fallback');
const wh2 = walk('ask', ms1.concat(['landing_no_heat', 'mode_was_auto', 'forced_heat_still_problem', 'defrost_then_heat_fine']));
assert(wh2.result === 'ms_defrost_normal_basic' && F.results[wh2.result].outcome === 'next_step' && F.results[wh2.result].diyTier === 'basic', 'WH2 normal defrost');
assert(/steam/i.test(F.results.ms_defrost_normal_basic.explanation) && /pause/i.test(F.results.ms_defrost_normal_basic.explanation) && /whoosh/i.test(F.results.ms_defrost_normal_basic.explanation), 'WH2 names steam, a pause, and a whoosh');
assert(eventsOf(wh2).indexOf('diy_tier_shown:basic') !== -1 && eventsOf(wh2).filter(e => e.indexOf('gate_fired:') === 0).length === 0, 'WH2 shows basic tier and no gate');
const wh3 = walk('ask', ms1.concat(['landing_no_heat', 'heat_settings_right_still_problem', 'ice_want_keep_running']));
assert(wh3.result === 'ms_ice_heat_keep_running' && F.results[wh3.result].outcome === 'emergency_exit' && F.results[wh3.result].gate === 'ice_keep_running', 'WH3 ice keep-running hard stop');
const wh3events = eventsOf(wh3);
assert(wh3events.indexOf('gate_fired:ice_keep_running') < wh3events.indexOf('exit_ramp:ice_keep_running') && wh3events.indexOf('exit_ramp:ice_keep_running') < wh3events.indexOf('conclusion_reached:emergency_exit') && wh3events.indexOf('diy_tier_shown:basic') === -1, 'WH3 audit order has no DIY tier');
const wh3before = wh3.result; F.stop(wh3); assert(wh3.result === wh3before, 'WH3 stop leaves the hard stop');
const whIce = walk('ask', ms1.concat(['landing_no_heat', 'heat_settings_right_still_problem', 'outdoor_iced_solid_no_recover']));
assert(whIce.result === 'ms_outdoor_freeze_heat_wave1' && F.results[whIce.result].outcome === 'call_pro' && eventsOf(whIce).indexOf('diy_tier_shown:basic') === -1, 'ice that keeps building calls a pro');
const wh4 = walk('ask', ms1.concat(['landing_no_heat', 'heat_settings_right_still_problem', 'no_frost_or_mild_weather', 'filter_cleaned_recently', 'nothing_blocking', 'air_ok_not_heating', 'outdoor_quiet_while_calling']));
assert(wh4.result === 'ms_outdoor_not_running_wave1' && F.results[wh4.result].outcome === 'call_pro', 'WH4 quiet outdoor unit calls a pro');
const wh5 = walk('ask', ms1.concat(['landing_no_heat', 'cold_exposure_risk']));
assert(wh5.result === 'ms_cold_exposure' && F.results[wh5.result].outcome === 'emergency_exit' && F.results[wh5.result].gate === 'cold_exposure_911' && wh5.result !== 'fn_cold_exposure', 'WH5 cold exposure reuses the 911 gate on an ms result');
assert(eventsOf(wh5).indexOf('gate_fired:cold_exposure_911') !== -1 && eventsOf(wh5).indexOf('diy_tier_shown:basic') === -1, 'WH5 gate audit and no DIY tier');
const wh5before = wh5.result; F.stop(wh5); assert(wh5.result === wh5before, 'WH5 stop leaves the cold-exposure result');
const wh5b = walk('ask', ms1.concat(['landing_outdoor_unit', 'steam_or_smoke_unsure']));
assert(wh5b.result === 'ms_hazard_now' && F.results[wh5b.result].outcome === 'emergency_exit' && F.results[wh5b.result].gate === 'ms_new_hazard', 'WH5b unsure steam is an emergency');
assert(eventsOf(wh5b).indexOf('diy_tier_shown:basic') === -1, 'WH5b shows no DIY tier');
const whWater = walk('ask', ms1.concat(['landing_outdoor_unit', 'water_near_outdoor_electrical']));
assert(whWater.result === 'ms_outdoor_water_electrical' && whWater.result !== 'electrical' && F.results[whWater.result].outcome === 'emergency_exit' && F.results[whWater.result].gate === 'water_near_electrical', 'outdoor water uses the look-only stop');
assertNoShutOff([F.results.ms_outdoor_water_electrical.title, F.results.ms_outdoor_water_electrical.explanation, F.results.ms_outdoor_water_electrical.avoid].concat(F.results.ms_outdoor_water_electrical.actions).join('\n'), 'outdoor water shut-off instruction');
const MS_BACKUP = 'If the home is getting dangerously cold, use safe backup heat per its manufacturer. Never run a space heater near water or the indoor unit. Never use an oven, stove, grill, or generator indoors (carbon monoxide).';
['ms_heat_auto_fixed_basic', 'ms_defrost_normal_basic', 'ms_outdoor_running_call_pro', 'ms_outdoor_not_running_wave1', 'ms_outdoor_freeze_heat_wave1', 'ms_ice_heat_keep_running', 'ms_cold_exposure', 'ms_heat_not_supported', 'ms_heat_wait_unsure', 'ms_outdoor_unsure', 'ms_ice_unclear_or_heat'].forEach(id => {
  assert(F.results[id].actions.indexOf(MS_BACKUP) !== -1, 'backup heat line on ' + id);
  assert(!/plugged into a wall|electric space heaters/i.test(JSON.stringify(F.results[id])), 'no space-heater how-to on ' + id);
});
assert(F.nodes['ms.intake.system_confirm'].options.find(op => op.id === 'ductless_multi_zone').next === '@ms_multi_zone_pr2', 'multi-zone stays deferred');
assert(!F.nodes['ms.zone.which_head'] && !F.nodes['ms.zone.others_ok'] && !F.nodes['ms.zone.isolate_head'], 'zone nodes stay absent');
assert(F.nodes['ms.ice.stop_observe'].options.find(op => op.id === 'ice_outdoor_heating_or_unsure').next === '@ms_ice_unclear_or_heat', 'ice screen does not loop back to defrost');
assert(/steam/i.test(F.nodes['ms.heat.defrost_sanity'].body) && /pause/i.test(F.nodes['ms.heat.defrost_sanity'].body) && /whoosh/i.test(F.nodes['ms.heat.defrost_sanity'].body), 'defrost node explains steam, a pause, and a whoosh');
const covered = new Set();
[w1, w2, w3, w4, w4b, w5a, w5b, w6, w7, w8].forEach(s => s.answers.forEach(a => { if (a.node.indexOf('ms.') === 0) covered.add(a.node); }));
F.msPr1.forEach(id => assert(covered.has(id), 'MS-A2 covered ' + id));
const heatCovered = new Set();
[wh1, wh2, wh3, whIce, wh4, wh5, wh5b, whWater].forEach(s => s.answers.forEach(a => { if (a.node.indexOf('ms.') === 0) heatCovered.add(a.node); }));
F.msV1.forEach(id => assert(heatCovered.has(id), 'MS-A2 covered ' + id));
const openMs = walk('ask', ms1);
const openAc = walk('ac', gate.concat(['split_central_cool_only']));
F.stop(openMs); F.stop(openAc);
assert(openMs.node === openAc.node && openMs.node === 'ac.gate.cluster_entry' && openMs.result === null && openMs.safetyCleared === false, 'MS-A14 stop on an open mini-split node matches the AC stop');
const agreeEdges = [];
Object.keys(F.nodes).forEach(id => F.nodes[id].options.forEach(op => { if (op.id === 'agree_18_terms') agreeEdges.push(id + ':' + op.next); }));
assert(agreeEdges.length === 1 && agreeEdges[0] === 'ac.session.consent:ac.cool.intake.system_confirm', 'consent is not forked');
assert(F.results.hp_mini_split_oos.actions[0] === 'Go back home, press Start, and choose “Something else: mini-split, geothermal, thermostat, other”, then “Ductless mini-split”. It covers cooling and heating problems on a single indoor unit.', 'MS-C14');
assert(F.results.hp_mini_split_oos.actions[1] === 'For a system with more than one indoor unit, use a technician who works on mini-splits or the manufacturer owner guidance.', 'HP mini-split pointer leaves multi-zone to a pro');
assert(F.results.out_of_scope_equipment.explanation === 'Window and portable units, packaged systems, and other types are not diagnosed here.', 'MS-C15');
assert(F.nodes['ms.intake.system_confirm'].body.indexOf('Don’t remove a cover or climb up to check.') !== -1, 'MS-C16');
assert(F.nodes['ms.head.filter_path_ok'].body.indexOf('If you’d need a ladder, chair, or step stool, stop here.') !== -1, 'MS-C1');
assert(F.nodes['ms.head.filter_path_ok'].body.indexOf('If it says to switch off power at a breaker or switch, stop here. This check doesn’t guide that step.') !== -1, 'MS-C2');
assert(F.nodes['ms.head.filter_path_ok'].body.indexOf('Turning the unit off with the remote stops it running. It doesn’t cut the power.') !== -1, 'MS-C3');
assert(F.nodes['ms.head.filter_clean'].body.indexOf('Remote Off doesn’t cut the power. Touch only the filters and the cover.') !== -1, 'MS-C4');
assert(F.nodes['ms.head.filter_clean'].body.indexOf('never hotter than 104°F (40°C)') !== -1, 'MS-C5');
assert(F.nodes['ms.head.discharge_clear'].body.indexOf('Don’t move it by hand.') !== -1, 'MS-C6');
assert(F.nodes['ms.head.water_observe'].caution === 'Water and electricity together is a stop, not a cleanup job.', 'MS-C7');
assert(F.nodes['ms.ice.stop_observe'].caution === 'No chipping ice, no covers, and no refrigerant or electrical work.', 'MS-C8');
assert(F.results.ms_ice_keep_running.title === 'Stop. Turn it off and let the ice melt.', 'MS-C9');
assert(F.results.ms_ice_keep_running.avoid === 'Don’t chip or pick at the ice, use a hair dryer, heat gun, or hot water, or keep restarting it.', 'MS-C10');
assert(F.results.ms_ice_cooling_wave1.avoid.indexOf('Don’t chip or pick at the ice') !== -1, 'MS-C11');
assert(F.results.ms_condensate_leak_wave1.actions[0] === 'Turn the unit Off with the remote to stop new water. Remote Off doesn’t cut the power, so stay away from the unit’s wiring.', 'MS-C12');
assert(F.results.ms_condensate_leak_wave1.actions.some(action => action === 'If you see sparks or smoke, or smell burning, get out and call 911 from outside.'), 'condensate call_pro says to call 911 for sparks or smoke');
assert(F.results.ms_ice_cooling_wave1.actions.some(action => action === 'If you see sparks or smoke, or smell burning, get out and call 911 from outside.'), 'ice call_pro says to call 911 for sparks or smoke');
assert(F.results.ms_error_code_wave1.avoid === 'Don’t follow repair steps from a code list.', 'error-code avoid line');
assert(F.nodes['ms.head.airflow_result'].options.find(op => op.id === 'improved_ok').label === 'Better. Strong air at the right temperature now.', 'airflow success is mode-neutral');
assert(F.nodes['ms.landing.picker'].options.find(op => op.id === 'landing_weak_airflow').label === 'Weak air from the indoor unit while cooling', 'weak-air landing stays a cooling path');
assert(appText.includes('cooling and heating checks for remote or app settings'), 'safety page names mini-split heating');
assert(appText.includes('Look at the outdoor unit only from a window or dry ground.'), 'sidebar names the outdoor look');
assert(fs.readFileSync(path.join(__dirname, '../docs/ac-second-opinion/legal/disclaimer-change-log.md'), 'utf8').indexOf('| D-014 |') !== -1, 'disclaimer log has D-014');
assert(F.nodes['ms.head.water_observe'].options.find(op => op.id === 'water_unsure_electrical').next === '@ms_unsure_water_electrical', 'mini-split unsure water uses the look-only twin');
assert(!/wet hands/i.test(JSON.stringify(F.results.ms_unsure_water_electrical)) && /wet hands/i.test(F.results.unsure_water_electrical.avoid), 'unsure-water twin drops wet-hands wording; the shared result keeps it');
assert(F.nodes['ac.cool.intake.system_confirm'].options.find(op => op.id === 'heat_pump').hint === 'A heat pump heats and cools. Leave this cooling-only check and continue on the air-source heat pump check.', 'AC heat-pump choice leaves the cooling-only check');
assert(appText.includes('A mini-split filter is only for a cover you can open by hand from the floor'), 'safety page states the mini-split filter rule');
assert(appText.includes('Remote Off stops the unit running. It is not electrical isolation.') && appText.includes('Those go to a licensed pro.'), 'Trane filter note says remote Off is not isolation');
const notListed = walk('ask', gate.concat(['other_heat_or_ductless', 'not_listed']));
assert(notListed.result === 'sw_other_not_listed' && F.summary(notListed).indexOf('AC concern') === -1 && F.summary(notListed).indexOf('Equipment this beta does not check yet; see reported observations.') !== -1, 'not-listed service note is neutral');
const weakFixed = walk('ask', ms1.concat(['landing_weak_airflow', 'settings_fixed_now_cooling']));
assert(F.presentResult(weakFixed).explanation.indexOf('Airflow is back to normal') !== -1 && F.summary(weakFixed).indexOf('airflow is back to normal') !== -1, 'weak-air settings success talks about airflow');
[0, 1, 3].forEach(index => assert(F.results.ms_hazard_now.actions[index] === F.results.hp_hazard_now.actions[index], 'MS-C13 action ' + index));
assert(F.results.ms_hazard_now.actions.length === 4 && F.results.ms_hazard_now.actions[2] === 'If water is at electrical equipment, stay clear and don’t touch anything. Leave the area and call a licensed HVAC pro or an electrician.', 'MS-C13 action 2');
const hardFail = /\bgreen\b|guarantee|\bcertified\b|\bwarranty\b|\bcure\b|you should be fine|safe to (keep|continue)|\bscrewdriver\b|multimeter|voltmeter|\bgauges?\b|\brecharge\b|\btop off\b|\bjumper\b|\bbypass\b|step ?ladder|ladder (to|and) |use a ladder|on a ladder|!/i;
const prohibWord = /refrigerant|breaker|capacitor|contactor|inverter|board|compressor|flare|line set|coil|motor|(?<!heat[ -])pump|float|bleach|vinegar|drill|panel|wiring|rewire|meter|heat gun|hair dryer|chip|ladder|chair|stool|tool|chemical|cleaner|unplug/i;
const prohibOk = /^(Don’t|Do not|No |Never)|stop here/i;
const prohibAllow = new Set([
  'Some newer units show a code for a refrigerant leak.',
  'Manual asks for power to be switched off at a breaker or switch before filter cleaning.',
  'Water in the wall or ceiling, or a condensate pump alarm or overflow.',
  'Water is in the wall or ceiling, or a small pump box is beeping or overflowing',
  'Let them dry in the shade, not in the sun or with a heater or hair dryer.',
  'Melting ice is dripping on or near an outlet, cord, or anything electrical',
  'My manual says to switch off power at a breaker or switch first',
  'First: is any water, or ice that is melting, on or near an outlet, a power cord, a light, a switch, or the unit’s wiring?',
  'When the remote or app can’t control it, or the indoor unit shows no lights, the cause can be power, wiring, or the controls inside.',
  'Spray cleaners and bleach can damage the unit.',
  'Remote Off doesn’t cut the power, so stay away from the unit’s wiring.',
  'Capacitor, contactor, inverter, and board work are not offered on a mini-split in this beta.',
  'The screen, app, or manual says it’s a refrigerant leak',
  'Mini-split showed a refrigerant leak alert.',
  'If the filters are out of reach from the floor, need tools or force, or need power switched off at a breaker first, let a pro do it.',
  'Clearing or fixing the drain, pump, or pan is a pro job.',
  'If you can’t tell whether water or melting ice is near an outlet, a cord, or the unit’s wiring, stop.',
  'Your owner’s manual shows the filter steps without tools.',
  'Owner’s manual shows a tool-free filter path reachable from the floor.',
  'I’d need a ladder, chair, or step stool',
  'The cover needs tools, feels stuck, or the clips might break',
  'Filter cover needs tools or force.'
]);
function msSentences(text) { return String(text || '').split(/(?<=[.!?])\s+|\n+/).map(x => x.trim()).filter(Boolean); }
function scanMsCopy(text, where) {
  assert(!hardFail.test(text), 'MS forbidden word in ' + where + ' ' + (String(text).match(hardFail) || [''])[0]);
  msSentences(text).forEach(sentence => {
    if (prohibWord.test(sentence) && !prohibOk.test(sentence) && !prohibAllow.has(sentence)) {
      assert(false, 'MS prohibition-only word in ' + where + ': ' + sentence);
    }
  });
}
F.msPr1.concat(F.msV1).forEach(id => {
  const node = F.nodes[id];
  scanMsCopy(node.title, id + ' title');
  scanMsCopy(node.body, id + ' body');
  scanMsCopy(node.caution, id + ' caution');
  node.options.forEach(op => {
    scanMsCopy(op.label, id + '/' + op.id + ' label');
    scanMsCopy(op.hint, id + '/' + op.id + ' hint');
    scanMsCopy(op.fact, id + '/' + op.id + ' fact');
  });
});
Object.keys(F.results).filter(id => id.indexOf('ms_') === 0).concat(['hp_mini_split_oos', 'out_of_scope_equipment', 'sw_other_not_listed']).forEach(id => {
  const res = F.results[id];
  [res.title, res.urgency, res.explanation, res.avoid].concat(res.actions || []).forEach((text, index) => scanMsCopy(text, id + ' field ' + index));
});
const otherNode = F.nodes['sw.intake.other_system'];
[otherNode.title, otherNode.body, otherNode.caution].forEach(text => scanMsCopy(text, 'other_system'));
otherNode.options.forEach(op => scanMsCopy([op.label, op.hint, op.fact].join('\n'), 'other_system/' + op.id));
Object.keys(F.results).filter(id => id.indexOf('ms_') === 0 || id === 'unsure_water_electrical' || id === 'leak').forEach(id => {
  const res = F.results[id];
  assertNoShutOff([res.title, res.urgency, res.explanation, res.avoid].concat(res.actions || []).join('\n'), 'shut-off instruction in ' + id);
});
F.msPr1.concat(F.msV1).forEach(id => {
  const node = F.nodes[id];
  assertNoShutOff([node.title, node.body, node.caution].concat(node.options.map(op => [op.label, op.hint, op.fact].join('\n'))).join('\n'), 'shut-off instruction in ' + id);
});
const heatBan = /ladder|chemical|unplug|\btools?\b|shut power|@electrical/i;
F.msV1.forEach(id => {
  const node = F.nodes[id];
  const blob = [node.title, node.body, node.caution].concat(node.options.map(op => [op.label, op.hint, op.fact].join('\n'))).join('\n');
  assert(!heatBan.test(blob), 'heat node avoids banned wording ' + id + ' ' + (blob.match(heatBan) || [''])[0]);
});
['ms_heat_settings_fixed_basic', 'ms_heat_auto_fixed_basic', 'ms_defrost_normal_basic', 'ms_outdoor_running_call_pro', 'ms_outdoor_not_running_wave1', 'ms_outdoor_freeze_heat_wave1', 'ms_ice_heat_keep_running', 'ms_cold_exposure', 'ms_heat_not_supported', 'ms_heat_wait_unsure', 'ms_outdoor_unsure', 'ms_outdoor_water_electrical'].forEach(id => {
  const res = F.results[id];
  const blob = [res.title, res.urgency, res.explanation, res.avoid].concat(res.actions || []).join('\n');
  assert(!heatBan.test(blob), 'heat result avoids banned wording ' + id + ' ' + (blob.match(heatBan) || [''])[0]);
});
const instruct = /\b(press|button|punch-?out|hot water|salt|cover the (outdoor )?unit)\b/i;
const instructOk = /^(Don’t|Do not|No |Never)/i;
function assertNoInstruct(text, where) {
  msSentences(text).forEach(sentence => {
    if (instruct.test(sentence) && !instructOk.test(sentence)) assert(false, 'instruction word in ' + where + ': ' + sentence);
  });
}
F.msV1.forEach(id => {
  const node = F.nodes[id];
  [node.title, node.body, node.caution].forEach(text => assertNoInstruct(text, id));
  node.options.forEach(op => ['label', 'hint', 'fact'].forEach(key => assertNoInstruct(op[key], id + '/' + op.id)));
});
['ms_heat_settings_fixed_basic', 'ms_heat_auto_fixed_basic', 'ms_defrost_normal_basic', 'ms_outdoor_running_call_pro', 'ms_outdoor_not_running_wave1', 'ms_outdoor_freeze_heat_wave1', 'ms_ice_heat_keep_running', 'ms_cold_exposure', 'ms_heat_not_supported', 'ms_heat_wait_unsure', 'ms_outdoor_unsure', 'ms_outdoor_water_electrical', 'ms_ice_unclear_or_heat'].forEach(id => {
  const res = F.results[id];
  [res.title, res.urgency, res.explanation, res.avoid].concat(res.actions || []).forEach((text, index) => assertNoInstruct(text, id + ' field ' + index));
});
assert(!/mini-splits? (are|is) (excluded|later)|later phase|aren't covered here yet|not part of this check yet/i.test(appText + '\n' + fs.readFileSync(path.join(__dirname, '../README.md'), 'utf8')), 'public copy still treats mini-splits as later');
function msLeaves(flag) {
  globalThis.SW_CONFIG.advancedRepairsEnabled = flag;
  const out = [];
  const start = walk('ask', msGate);
  const stack = [[start, 0]];
  let maxDepth = 0;
  while (stack.length) {
    const [s, depth] = stack.pop();
    if (depth > maxDepth) maxDepth = depth;
    if (s.result) {
      out.push(s.result);
      assert(F.advanced.indexOf(s.node) === -1 && s.result !== 'next_step_advanced' && F.results[s.result].diyTier !== 'advanced', 'MS-A4 advanced leaf ' + s.result);
      assert(['next_step', 'call_pro', 'emergency_exit', 'insufficient_info'].indexOf(F.results[s.result].outcome) !== -1 && !F.results[s.result].continueTo, 'MS-A5 leaf ' + s.result);
      let resumed = false;
      try { F.resume(JSON.parse(JSON.stringify(s))); resumed = true; } catch (e) { /* expected */ }
      assert(!resumed, 'MS-A5 resume ' + s.result);
      continue;
    }
    if (depth > 10) throw new Error('MS depth at ' + s.node);
    F.viewNode(s.node, s).options.forEach(op => {
      const c = JSON.parse(JSON.stringify(s));
      F.answer(c, op.id, { agreed: true, termsVersion: 'beta-2026-09-13' });
      stack.push([c, depth + 1]);
    });
  }
  return { out: out.sort(), maxDepth };
}
const msOff = msLeaves(false);
const msOn = msLeaves(true);
globalThis.SW_CONFIG.advancedRepairsEnabled = false;
assert(msOff.out.length === 1711 && msOff.out.join('|') === msOn.out.join('|'), 'MS-A4 leaf set is 1711 and identical with Advanced on');
assert(msOff.maxDepth === 11, 'MS-A5 depth ' + msOff.maxDepth);
const hpDigestLines = [];
Object.keys(F.nodes).filter(id => id.indexOf('hp.') === 0).sort().forEach(id => {
  F.nodes[id].options.forEach(op => {
    hpDigestLines.push(id + '|' + op.id + '>' + (typeof op.next === 'object' ? JSON.stringify(op.next) : op.next) + '>' + (op.gate || ''));
  });
});
hpDigestLines.sort();
assert(require('crypto').createHash('sha256').update(hpDigestLines.join('\n')).digest('hex').slice(0, 16) === '0a90560104be1a12', 'HP edge digest re-baselined to a3c2f60');
assert(hpDigestLines.length === 65, 'HP edge digest line count');

// ---- Thermostat ts.settings.v0 (TS-A1–TS-A21, mutations M1–M17) ----
assert(F.treeVersionTs === 'ts.settings.v1' && Array.isArray(F.tsV0) && F.tsV0.length === 16 && Array.isArray(F.tsV1) && F.tsV1.length === 40, 'TS-A1 tree and TS_V1');
assert(F.treeVersion === 'ac.cool.v1' && F.treeVersionHp === 'hp.air_source.v1' && F.treeVersionMs === 'ms.ductless.v1', 'TS-A1 AC HP ms versions');
const tsGate = ['none_of_these', 'agree_18_terms', 'other_heat_or_ductless', 'thermostat_settings'];
const ts0 = tsGate.concat(['ts_none_of_these']);
const tsStart = walk('ask', tsGate);
assert(tsStart.node === 'ts.gate.safety_stops' && tsStart.product === 'ts', 'TS-A2 reaches the thermostat gate');
assert(tsStart.answers.map(a => a.node).join(',') === 'ac.gate.cluster_entry,ac.session.consent,sw.intake.system_type,sw.intake.other_system', 'TS-A2 answered nodes');
assert(tsStart.audit.filter(e => e.event === 'product_lane:ts').length === 1, 'TS-A1 product_lane:ts once');
const tsLaneAt = tsStart.audit.findIndex(e => e.event === 'product_lane:ts');
assert(tsLaneAt >= 0 && tsStart.audit.slice(tsLaneAt).every(e => e.tree === 'ts.settings.v1'), 'TS-A1 tree field from product_lane:ts');
assert(Object.keys(F.nodes).filter(id => F.nodes[id].options.some(op => op.id === 'agree_18_terms')).length === 1, 'TS-A3 one consent option');
assert(F.nodes['ts.gate.safety_stops'].body.indexOf('Don’t take the thermostat off the wall or open any equipment to check.') !== -1, 'TS-C1');
assert(F.nodes['ts.power.blank_screen'].body.indexOf('Don’t reset breakers in this check.') !== -1, 'TS-C2');
assert(F.nodes['ts.power.blank_screen'].caution === 'Look only at the furnace door and power switch. Don’t remove the door, don’t flip the switch, and don’t touch thermostat wires.', 'TS-C3');
assert(F.tsV1.reduce((n, id) => n + F.nodes[id].options.length, 0) === 326, 'ts options');
assert(F.nodes['ts.power.blank_screen'].options.length === 11, 'blank screen options');
assert(F.nodes['ts.power.battery'].body.indexOf('If you’d have to disconnect any wires to reach them, stop.') !== -1, 'TS-C4');
assert(F.nodes['ts.status.wait_delay'].body.indexOf('Changing the setting during the wait can start it over.') !== -1, 'TS-C5');
assert(JSON.stringify(F.results.ts_hazard_now.actions) === JSON.stringify(F.results.hp_hazard_now.actions), 'TS-C6');
assert(F.results.ts_installer_guard.explanation === F.tsLc.lc6, 'TS-C7');
assert(F.results.ts_screen_different.explanation === F.tsLc.lc5, 'TS-C8');
['ts_co_gas_now', 'ts_burning_electrical', 'ts_hazard_now'].forEach(id => assert(F.results[id].explanation === F.tsLc.lc7, 'TS-C9 ' + id));
assert(F.nodes['ts.intake.brand_picker'].body.indexOf(F.tsLc.lc1) !== -1, 'TS-C10');
F.tsV0.filter(id => F.tsFnOf[id]).forEach(id => assert(F.nodes[id].options.some(op => op.label === 'My screen looks different'), 'TS-C11 ' + id));
function tsEvents(state) { return state.audit.map(e => e.event); }
function tsWalk(extra) { return walk('ask', ts0.concat(extra)); }
const tw1 = tsWalk(['brand_honeywell_buttons', 'hw_focuspro', 'landing_no_heat_cool', 'mode_fixed']);
assert(tw1.result === 'ts_mode_fixed_basic' && F.results[tw1.result].outcome === 'next_step' && F.results[tw1.result].diyTier === 'basic', 'W1 result');
assert(tsEvents(tw1).indexOf('flag:ts_model=HW-FP6') !== -1 && !tsEvents(tw1).some(e => e.indexOf('flag:ts_mirror=') === 0), 'W1 model flag and no mirror');
assert(tsEvents(tw1).indexOf('diy_tier_shown:basic') !== -1, 'W1 diy tier');
const ttw1Panel = F.renderTsPanel('HW-FP6', 'ts.settings.mode_setpoint');
assert(ttw1Panel.fallbacks.some(item => item.id === 'F-HW-FP6') && ttw1Panel.text.indexOf('Check your manual:') !== -1 && !ttw1Panel.served.length, 'W1 text plus LC-9');
const tw2 = tsWalk(['brand_honeywell_smart', 'hw_t9', 'landing_code_alert', 'code_wifi', 'wifi_device_error']);
assert(tw2.result === 'ts_wifi_device_fault' && F.results[tw2.result].outcome === 'call_pro', 'W2 result');
assert((F.tsSteps.ALERT['HW-T9'].mirrors || []).length === 0 && F.tsSteps.ALERT['HW-T9'].text.indexOf('NO INTERNET') !== -1, 'W2 alert text');
assert(F.tsSteps.WIFI['HW-T9'].mirrors.join('|') === 'HW-T9.WIFI.01/1|HW-T9.WIFI.01/2' && !F.renderTsPanel('HW-T9', 'ts.settings.wifi').served.length, 'W2 wifi mirrors cited and not rendered');
const tw3 = walk('ask', tsGate.concat(['co_alarm']));
assert(tw3.result === 'ts_co_gas_now' && F.results[tw3.result].outcome === 'emergency_exit', 'W3 result');
assert(tsEvents(tw3).indexOf('gate_fired:ts_co_or_gas') !== -1, 'W3 gate');
assert(tw3.answers.length === 5, 'W3 is 5 answers from Start');
const tw4 = tsWalk(['brand_nest', 'nest_nt', 'landing_no_heat_cool', 'calling_nothing_runs']);
assert(tw4.result === 'ts_calling_no_run' && !tsEvents(tw4).some(e => e.indexOf('flag:ts_mirror=') === 0), 'W4 result and no mirror');
const ttw4Panel = F.renderTsPanel('NEST-NT', 'ts.settings.mode_setpoint');
assert(ttw4Panel.lc3Plain.indexOf('Menus vary') !== -1 && ttw4Panel.fallbacks.some(item => item.id === 'F-NEST-MODES') && ttw4Panel.steps.length, 'W4 LC-3 text and link');
const tw5 = tsWalk(['brand_amazon', 'landing_blank_screen', 'breaker_looks_tripped']);
assert(tw5.result === 'ts_power_breaker_pro' && F.results[tw5.result].outcome === 'call_pro', 'W5 result');
assert(!tsEvents(tw5).some(e => e.indexOf('gate_fired:') === 0 || e === 'diy_tier_shown:basic' || e === 'diy_tier_shown:advanced'), 'W5 no gate and no diy tier');
assert(tw5.answers.some(a => a.fact === 'A breaker for the HVAC looked tripped. User did not reset it.'), 'W5 fact');
const tw6 = tsWalk(['brand_ecobee', 'ecb_premium', 'landing_em_aux_heat', 'installer_setting_came_up']);
assert(tw6.result === 'ts_installer_guard' && F.results[tw6.result].tier === 'Stop / professional', 'W6 result');
assert(F.renderTsPanel('ECB-PRM', 'ts.settings.em_aux_heat').lc6 === F.tsLc.lc6 && F.presentResult(tw6).explanation === F.tsLc.lc6, 'W6 LC-6 inline and explanation');
const ttw6Stopped = F.stop(JSON.parse(JSON.stringify(tw6)));
assert(ttw6Stopped.result === 'ts_installer_guard', 'TS-A15 stop leaves installer guard');
const ttw3Stopped = F.stop(JSON.parse(JSON.stringify(tw3)));
assert(ttw3Stopped.result === 'ts_co_gas_now', 'TS-A15 stop leaves CO result');
const tw7 = tsWalk(['brand_honeywell_smart', 'hw_t6', 'landing_schedule_hold', 'screen_looks_different']);
assert(tw7.result === 'ts_screen_different' && F.results[tw7.result].outcome === 'insufficient_info', 'W7 result');
assert(tsEvents(tw7).indexOf('flag:ts_mirror_mismatch=HOLD:HW-T6') !== -1, 'W7 mismatch flag');
const ttw7Shown = F.presentResult(tw7);
assert(ttw7Shown.explanation.indexOf('[Brand]') === -1 && ttw7Shown.explanation.indexOf('[link]') === -1 && ttw7Shown.explanation.indexOf('Honeywell Home (Resideo)') !== -1 && ttw7Shown.explanation.indexOf(F.tsFallbacks['F-HW-HELP'].url) !== -1, 'W7 LC-5 filled from the model help link');
const tw8 = tsWalk(['brand_ecobee', 'ecb_premium', 'landing_fan', 'fan_fixed']);
assert(tw8.result === 'ts_fan_fixed_basic' && !tsEvents(tw8).some(e => e.indexOf('flag:ts_mirror=') === 0), 'W8 basic and no mirror while the flag is off');
assert((F.tsSteps.FAN['ECB-PRM'].mirrors || []).indexOf('ECB-PRM.FAN.02/1') !== -1, 'W8 cell cites the fan mirror');
const tw9 = tsWalk(['brand_nest', 'nest_lt4', 'landing_code_alert', 'code_water_cooling']);
assert(tw9.result === 'ts_water_indoor_unit' && tsEvents(tw9).indexOf('gate_fired:ts_water_indoor_unit') !== -1, 'W9 water gate');
const ttw10a = tsWalk(['brand_honeywell_buttons', 'hw_rth7600d', 'landing_low_battery', 'battery_fixed']);
const ttw10b = tsWalk(['brand_honeywell_buttons', 'hw_x2p', 'landing_wait_delay', 'wait_persists']);
const ttw10c = tsWalk(['brand_honeywell_buttons', 'hw_th4000', 'landing_schedule_hold', 'hold_fixed']);
assert(ttw10a.result === 'ts_battery_fixed_basic' && ttw10b.result === 'ts_wait_persists' && ttw10c.result === 'ts_hold_fixed_basic', 'W10 results');
const tw11 = tsWalk(['brand_honeywell_smart', 'hw_t9', 'landing_blank_screen', 'furnace_switch_off']);
assert(tw11.result === 'ts_power_breaker_pro' && F.results[tw11.result].outcome === 'call_pro', 'W11 result');
assert(!tsEvents(tw11).some(e => e.indexOf('gate_fired:') === 0 || e.indexOf('diy_tier_shown') === 0), 'W11 no gate and no diy tier');
assert(tw11.answers.some(a => a.fact === 'Furnace power switch was off. User did not switch it on.'), 'W11 fact');
assert(F.results.ts_power_breaker_pro.title === 'A tripped breaker, a furnace switch that’s off, or missing power is a job for a pro.', 'W11 LC-15 title');
assert(F.results.ts_power_breaker_pro.explanation.indexOf('This check doesn’t include resetting breakers or turning switches on') === 0, 'W11 LC-15 explanation');
assert(F.results.ts_power_breaker_pro.actions[0] === 'Leave the breaker and the furnace switch as they are, and call a licensed HVAC professional or electrician.', 'W11 LC-15 action');
assert(F.results.ts_power_breaker_pro.avoid === 'Don’t reset breakers, turn the furnace switch on, open the electrical panel, or open the furnace or outdoor unit.', 'W11 LC-15 avoid');
const wVisited = new Set();
[tw1, tw2, tw3, tw4, tw5, tw6, tw7, tw8, tw9, ttw10a, ttw10b, ttw10c, tw11].forEach(state => visited(state).forEach(id => { if (id.indexOf('ts.') === 0) wVisited.add(id); }));
F.tsV0.forEach(id => assert(wVisited.has(id), 'W1–W11 visit ' + id));
const ttw2Note = F.summary(tw2);
assert(ttw2Note.indexOf('HOMEOWNER SERVICE NOTE — thermostat observations, not a diagnosis') === 0, 'TS-A14 line 1');
assert(ttw2Note.indexOf('Thermostat: Honeywell Home T9 (homeowner reported).') !== -1 && ttw2Note.indexOf('Tried:') !== -1, 'TS-A14 thermostat and tried');
const tsPaths = {};
(function mapTs() {
  const queue = [[walk('ask', tsGate), []]];
  while (queue.length) {
    const [state, path] = queue.shift();
    if (!state.node || tsPaths[state.node]) continue;
    tsPaths[state.node] = path;
    F.nodes[state.node].options.forEach(op => {
      if (op.next.charAt(0) === '@') return;
      const next = JSON.parse(JSON.stringify(state));
      F.answer(next, op.id, META);
      if (next.node && !tsPaths[next.node]) queue.push([next, path.concat(op.id)]);
    });
  }
})();
F.tsV0.forEach(id => {
  const state = walk('ask', tsGate.concat(tsPaths[id] || []).concat(['hazard_now']));
  assert(state.result === 'ts_hazard_now', 'TS-A6 hazard ' + id);
  const tail = tsEvents(state).slice(-4).join(',');
  assert(tail === 'answer_selected:hazard_now,gate_fired:ts_new_hazard,exit_ramp:ts_new_hazard,conclusion_reached:emergency_exit', 'TS-A6 tail ' + id + ' ' + tail);
  assert(tsEvents(state).indexOf('gate_fired:ts_new_hazard') < tsEvents(state).indexOf('exit_ramp:ts_new_hazard') && tsEvents(state).indexOf('exit_ramp:ts_new_hazard') < tsEvents(state).indexOf('conclusion_reached:emergency_exit'), 'TS-A13 ' + id);
  assert(!tsEvents(state).some(e => e.indexOf('diy_tier_shown') === 0), 'TS-A13 no diy tier ' + id);
});
F.tsV0.forEach(id => {
  F.nodes[id].options.filter(op => op.gate && op.id !== 'hazard_now').forEach(op => {
    const state = walk('ask', tsGate.concat(tsPaths[id] || []).concat([op.id]));
    assert(state.result && F.results[state.result].outcome === 'emergency_exit', 'TS-A6 gated ' + id + '/' + op.id);
    assert(tsEvents(state).indexOf('gate_fired:' + op.gate) !== -1 && tsEvents(state).indexOf('exit_ramp:' + op.gate) !== -1, 'TS-A6 gate audit ' + op.gate);
  });
});
['ts_co_gas_now', 'ts_burning_electrical', 'ts_breaker_retrip', 'ts_water_indoor_unit', 'ts_line_voltage_stop', 'ts_open_cabinet_stop', 'ts_hazard_now'].forEach(id => {
  const choice = F.nodes['ts.gate.safety_stops'].options.find(op => op.next === '@' + id || (id === 'ts_hazard_now' && op.id === 'hazard_now') || (id === 'ts_co_gas_now' && op.id === 'co_alarm'));
  const state = walk('ask', tsGate.concat([choice.id]));
  assert(state.result === id && state.answers.length === 5, 'TS-A7 ' + id + ' answers ' + state.answers.length);
});
const tsWave = { a22: [], a23: [], a24: [], a30: [], a31: [] };
function tsLeaves() {
  const out = [];
  const start = walk('ask', tsGate);
  const stack = [[start, 0, []]];
  let maxDepth = 0;
  while (stack.length) {
    const [state, depth, path] = stack.pop();
    if (path.indexOf(state.node) !== -1) {
      tsWave.a30.push(state.node);
      continue;
    }
    const choices = state.answers.map(a => a.choice);
    const answeredNodes = state.answers.map(a => a.node);
    if (state.node === 'ts.step.hp_lockouts' && (choices.indexOf('hp_air') === -1 || choices.indexOf('guard_ok') === -1)) tsWave.a22.push(choices.join('>'));
    if (state.node === 'ts.step.offset' && (answeredNodes.indexOf('ts.diag.reading_check') === -1 || answeredNodes.indexOf('ts.diag.location') === -1)) tsWave.a23.push(choices.join('>'));
    if (state.node === 'ts.step.stage_latch') tsWave.a24.push(state.node);
    if ((state.node === 'ts.step.hp_lockouts' || state.result === 'ts_hp_lockouts_done_basic') && (state.tsGeo || state.product === 'wshp')) tsWave.a31.push(state.node || state.result);
    if (state.result) {
      out.push(state.result);
      if (depth > maxDepth) maxDepth = depth;
      if (state.result === 'ts_latch_done_basic') tsWave.a24.push(state.result);
      const res = F.results[state.result];
      assert(res.diyTier !== 'advanced' && state.result !== 'next_step_advanced' && state.result !== 'ts_advanced_off', 'TS-A4 ' + state.result);
      assert(['next_step', 'call_pro', 'emergency_exit', 'insufficient_info'].indexOf(res.outcome) !== -1 && !res.continueTo, 'TS-A5 ' + state.result);
      let resumed = false;
      try { F.resume(JSON.parse(JSON.stringify(state))); resumed = true; } catch (err) { /* expected */ }
      assert(!resumed, 'TS-A5 resume ' + state.result);
      assert(!tsEvents(state).some(e => e === 'ai_explanation_shown'), 'TS-A17 ' + state.result);
      const renderedBits = [res.title, res.urgency, res.explanation, res.avoid].concat(res.actions || []);
      const shown = F.presentResult(state);
      renderedBits.push(shown.explanation);
      renderedBits.forEach((text, index) => {
        const hits = F.tsForbiddenScan(text, state.result + ' ' + index);
        assert(!hits.length, hits[0] || 'scan');
        assert(String(text || '').indexOf('\u0027') === -1, 'TS-A21 apostrophe ' + state.result);
      });
      continue;
    }
    if (depth > 12) throw new Error('TS-A5 depth at ' + state.node);
    const firstTs = visited(state).concat(state.node).find(id => String(id).indexOf('ts.') === 0);
    assert(firstTs === 'ts.gate.safety_stops', 'TS-A7 gate first');
    const nextPath = path.concat(state.node);
    F.viewNode(state.node, state).options.forEach(op => {
      const copy = JSON.parse(JSON.stringify(state));
      F.answer(copy, op.id, META);
      stack.push([copy, depth + 1, nextPath]);
    });
  }
  return { out: out.sort(), maxDepth };
}
const tsOff = tsLeaves();
globalThis.SW_CONFIG.advancedRepairsEnabled = true;
const tsOn = tsLeaves();
globalThis.SW_CONFIG.advancedRepairsEnabled = false;
const TS_LEAF_COUNT = 12482;
assert(tsOff.out.length === TS_LEAF_COUNT && tsOff.out.join('|') === tsOn.out.join('|'), 'TS-A4/A5 leaf count ' + tsOff.out.length);
assert(tsOff.maxDepth <= 12 && tsOn.maxDepth <= 12, 'TS-A5 depth ' + tsOff.maxDepth);
assert(!tsWave.a22.length, 'TS-A22 lockouts stay behind hp_air and guard_ok ' + tsWave.a22.slice(0, 2).join(' | '));
assert(!tsWave.a23.length, 'TS-A23 offset stays behind the reading and location checks');
assert(!tsWave.a24.length, 'TS-A24 stage latch stays off the shipped graph');
assert(!tsWave.a30.length, 'TS-A30 no cycle ' + tsWave.a30.join(','));
assert(!tsWave.a31.length, 'TS-A31 geo sessions do not reach a lockout change');
assert(!F.nodes['ts.step.cph'].options.some(op => op.next === 'ts.step.differential'), 'TS-A30 DIFF to CPH is one-way');
const wshpSource = tsWalk(['brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather']);
wshpSource.product = 'wshp';
const wshpOpts = F.viewNode(wshpSource.node, wshpSource).options.map(op => op.id);
assert(wshpSource.node === 'ts.guard.hp_source' && wshpOpts.indexOf('hp_air') === -1 && wshpOpts.indexOf('hp_geo') !== -1, 'TS-A31 wshp hides air-source ' + wshpOpts.join(','));
['guard_near_freezing', 'guard_fragile', 'guard_not_sure'].forEach(id => {
  const stopped = tsWalk(['brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_air', id]);
  assert(stopped.result === 'ts_cold_weather_stop', 'TS-A26 ' + id + ' ' + stopped.result);
});
const dualFuel = tsWalk(['brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_air', 'guard_dual_fuel']);
assert(dualFuel.result === 'ts_installer_guard', 'TS-A26 dual fuel ' + dualFuel.result);
['landing_humid', 'want_dehumidify'].forEach(extra => {
  const ice = tsWalk(['brand_ecobee', 'ecb_premium'].concat(extra === 'landing_humid' ? ['landing_humid', 'ice_seen'] : ['landing_humid', 'want_dehumidify', 'ice_seen']));
  assert(ice.result === 'ts_coil_ice_stop' && F.results[ice.result].outcome === 'emergency_exit' && tsEvents(ice).indexOf('gate_fired:ts_coil_ice') !== -1, 'TS-A27 ' + ice.result);
});
const lc40Exact = 'If the house is getting cold and neither the heat pump nor backup heat is running, put **[label]** back to the value you wrote down right away, then call a licensed HVAC professional. If it’s dangerously cold and anyone is at risk, get them somewhere warm first.';
assert(F.tsLc.lc40 === lc40Exact, 'LC-40 rev 8');
const stagesLabel = F.nodes['ts.landing.picker'].options.find(op => op.id === 'landing_stages').label;
assert(stagesLabel === 'Once it gets louder and blows harder, it stays that way until it shuts off, or the fan keeps speeding up and slowing down during one run', 'landing_stages v2.1');
const userBlob = JSON.stringify({ lc: F.tsLc, nodes: F.nodes, results: F.results, steps: F.tsSteps });
assert(userBlob.toLowerCase().indexOf('emergency heat mode') === -1 && userBlob.toLowerCase().indexOf('block emergency heat') === -1, 'emergency-heat blocking note stays out of user copy');
const v1NodeOf = {};
Object.keys(F.tsFnOf).forEach(id => { v1NodeOf[F.tsFnOf[id]] = id; });
const waveModels = Object.keys(F.tsSteps.OFFSET);
const kindCounts = { text: 0, held: 0, pointer: 0, not_on_model: 0 };
['OFFSET', 'DIFF', 'CPH', 'AUTO', 'RECOV', 'SETBACK', 'HPLOCK', 'DEHUM', 'SENSORS', 'LATCH'].forEach(fn => {
  waveModels.forEach(model => {
    const cell = F.tsSteps[fn][model];
    kindCounts[cell.kind] += 1;
    const panel = F.renderTsPanel(model, v1NodeOf[fn], { reveal: true, state: { tsWarrantyAck: true, tsLc18: true, tsRatedMin: 'known' } });
    assert(panel && panel.text, 'TS-A25 render ' + fn + ' ' + model);
    if (cell.installer_menu && cell.kind === 'text') {
      assert(panel.text.indexOf('These are comfort settings.') !== -1 && panel.text.indexOf(F.tsLc.lc22) !== -1, 'TS-A25 order ' + fn + ' ' + model);
    }
    if (cell.kind === 'not_on_model' || cell.kind === 'held') assert(panel.text.indexOf(F.tsLc.lc10) !== -1, 'TS-A25 held or missing ' + fn + ' ' + model);
  });
});
assert(kindCounts.text === 52 && kindCounts.held === 2 && kindCounts.pointer === 21 && kindCounts.not_on_model === 65, 'TS-A25 kinds ' + JSON.stringify(kindCounts));
const geoKinds = { text: 0, not_on_model: 0 };
waveModels.forEach(model => {
  const cell = F.tsSteps.GEO[model];
  geoKinds[cell.kind] += 1;
  const panel = F.renderTsPanel(model, 'ts.look.geo_lockouts', { reveal: true });
  assert(panel.text.indexOf('You can look, but') !== -1 || panel.text.indexOf(F.tsLc.lc10) !== -1, 'TS-A25 geo ' + model);
});
assert(geoKinds.text === 2 && geoKinds.not_on_model === 12, 'TS-A25 geo kinds');
['ECB-PRM', 'HW-T6'].forEach(model => {
  const locked = F.renderTsPanel(model, 'ts.step.hp_lockouts', { state: { tsGeo: true }, reveal: true });
  const look = F.renderTsPanel(model, 'ts.look.geo_lockouts', { reveal: true });
  assert(locked.text === look.text, 'TS-A32 ' + model + ' look-only body');
  assert(locked.text.indexOf(String(F.tsSteps.HPLOCK[model].text).slice(0, 24)) === -1, 'TS-A32 ' + model + ' hides change steps');
});
const holdsHigh = tsWalk(['brand_honeywell_smart', 'hw_t6', 'landing_stages', 'holds_high']);
const bounces = tsWalk(['brand_ecobee', 'ecb_premium', 'landing_stages', 'bounces']);
assert(holdsHigh.result === 'ts_stage_pro' && bounces.result === 'ts_stage_pro', 'TS-A33 stage results');
const geoStages = tsWalk(['brand_honeywell_smart', 'hw_t6', 'landing_stages', 'geo_system']);
assert(geoStages.result === 'ts_stage_pro' && geoStages.tsGeo && F.presentResult(geoStages).explanation.indexOf('Ask them to check the water side too.') !== -1, 'TS-A33 water side');
assert(F.presentResult(geoStages).explanation.indexOf('Finish on high stage (some brands call this \u201Clatching\u201D)') !== -1, 'TS-A33 label');
assert(!F.viewNode('ts.diag.stages', geoStages).options.some(op => op.id === 'check_stage_settings'), 'TS-A33 check hidden');
const hiddenLatch = F.renderTsPanel('HW-T6', 'ts.step.stage_latch', {});
assert(hiddenLatch.text.indexOf('ISU') === -1 && hiddenLatch.text.indexOf(F.tsLc.lc10) !== -1, 'TS-A33 latch steps hidden');
const waveWalks = [
  ['W12', ['brand_honeywell_buttons', 'hw_focuspro', 'landing_short_cycling', 'short_cycles_reaches_target', 'use_cph_instead', 'done_better'], 'ts_cph_done_basic'],
  ['W13', ['brand_ecobee', 'ecb_premium', 'landing_swings', 'big_swings', 'done_better'], 'ts_differential_done_basic'],
  ['W14', ['brand_honeywell_smart', 'hw_t9', 'landing_never_catches_up', 'not_caught_up_hp', 'big_setback', 'done_better'], 'ts_setback_done_basic'],
  ['W16', ['brand_honeywell_smart', 'hw_t6', 'landing_never_catches_up', 'early_start_ok'], 'ts_recovery_explained_basic'],
  ['W17', ['brand_honeywell_buttons', 'hw_rth7600d', 'landing_short_cycling', 'waits_then_starts'], 'ts_compressor_wait_normal'],
  ['W18', ['brand_ecobee', 'ecb_premium', 'landing_wrong_reading', 'reading_off_changes', 'sun_on_it', 'done_better'], 'ts_sensors_done_basic'],
  ['W19', ['brand_honeywell_smart', 'hw_t6', 'landing_short_cycling', 'short_cycles_reaches_target', 'use_cph_instead', 'want_raise_compressor'], 'ts_installer_guard'],
  ['W20', ['brand_ecobee', 'ecb_premium', 'landing_swings', 'big_swings', 'wty_ask_installer'], 'ts_ask_installer_first'],
  ['W21', ['brand_ecobee', 'ecb_premium', 'landing_auto_mode', 'auto_pushes_other', 'done_better'], 'ts_auto_deadband_done_basic'],
  ['W22', ['brand_nest', 'nest_lt3', 'landing_never_catches_up', 'not_caught_up_hp', 'aux_during_recovery', 'done_better'], 'ts_setback_done_basic'],
  ['W23', ['brand_honeywell_smart', 'hw_t6', 'landing_short_cycling', 'stops_before_target'], 'ts_equipment_cycling_pro'],
  ['TayA', ['brand_honeywell_smart', 'hw_t6', 'landing_swings', 'needs_big_setpoint', 'new_yes'], 'ts_new_install_installer'],
  ['TayB', ['brand_honeywell_smart', 'hw_t6', 'landing_wrong_reading', 'reading_off_steady', 'location_ok_steady_difference', 'done_better'], 'ts_offset_done_basic'],
  ['TayBoff', ['brand_honeywell_smart', 'hw_t6', 'landing_wrong_reading', 'reading_way_off'], 'ts_reading_fault_pro'],
  ['TayC', ['brand_honeywell_smart', 'hw_t6', 'landing_wrong_reading', 'reading_matches', 'needs_big_setpoint', 'old_setup_suspect'], 'ts_setup_check_pro'],
  ['TayCcph', ['brand_honeywell_smart', 'hw_t6', 'landing_swings', 'needs_big_setpoint', 'old_check_comfort', 'use_cph_instead', 'done_better'], 'ts_cph_done_basic'],
  ['TayCauto', ['brand_honeywell_smart', 'hw_t6', 'landing_auto_mode', 'auto_switches_too_soon', 'done_better'], 'ts_auto_deadband_done_basic'],
  ['Cold', ['brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_air', 'guard_ok', 'only_backup_heat', 'done_better'], 'ts_hp_lockouts_done_basic'],
  ['R1', ['brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_air', 'guard_near_freezing'], 'ts_cold_weather_stop'],
  ['R2', ['brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_air', 'guard_fragile'], 'ts_cold_weather_stop'],
  ['R3', ['brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_air', 'guard_ok', 'lower_hp_min_rating_unknown'], 'ts_rated_min_unknown'],
  ['R4', ['brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_air', 'guard_dual_fuel'], 'ts_installer_guard'],
  ['R5', ['brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_air', 'guard_ok', 'only_backup_heat', 'house_cold_after'], 'ts_hp_not_keeping_up_pro'],
  ['R6', ['brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_air', 'guard_ok', 'lower_hp_min_rating_known', 'done_better'], 'ts_hp_lockouts_done_basic'],
  ['R7', ['brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_not_sure'], 'ts_setup_check_pro'],
  ['Humid', ['brand_ecobee', 'ecb_premium', 'landing_humid', 'want_dehumidify', 'done_better'], 'ts_dehumidify_done_basic'],
  ['HumidNest', ['brand_nest', 'nest_lt4', 'landing_humid', 'want_dehumidify', 'done_better'], 'ts_dehumidify_done_basic'],
  ['HumidT6', ['brand_honeywell_smart', 'hw_t6', 'landing_humid', 'want_dehumidify', 'not_on_my_model'], 'ts_not_on_your_model'],
  ['GeoLock', ['brand_honeywell_smart', 'hw_t6', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_geo', 'geo_lock_temp'], 'ts_geo_pro'],
  ['GeoOff', ['brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_geo', 'geo_all_off'], 'ts_geo_noted_basic']
];
waveWalks.forEach(([name, path, result]) => {
  const state = tsWalk(path);
  assert(state.result === result, 'TS-A28 ' + name + ' ' + (state.result || state.node));
});
const w15 = tsWalk(['brand_amazon', 'landing_wrong_reading', 'reading_matches', 'feels_humid', 'fan_on']);
assert(w15.node === 'ts.settings.fan' && !w15.result, 'TS-A28 W15 ' + (w15.result || w15.node));
const tayCard = F.presentResult(tsWalk(['brand_honeywell_smart', 'hw_t6', 'landing_swings', 'needs_big_setpoint', 'new_yes']));
assert(tayCard.explanation.indexOf('ISU 200') !== -1 && tayCard.explanation.indexOf('1420') !== -1, 'TS-A28 Tayyycat card');
const coldPanel = F.renderTsPanel('ECB-PRM', 'ts.step.hp_lockouts', { reveal: true, state: { tsWarrantyAck: true, tsLc18: true, tsRatedMin: 'known' } });
assert(coldPanel.text.indexOf('AUX HEAT MAX OUTDOOR TEMP') !== -1 && coldPanel.text.indexOf('Aux Savings Optimization') !== -1, 'TS-A28 Cold LC-40 labels');
assert(coldPanel.text.indexOf(lc40Exact.split('[label]').join('AUX HEAT MAX OUTDOOR TEMP').replace(/\*\*/g, '')) !== -1, 'TS-A28 LC-40 sentence');
const ratedPanel = F.renderTsPanel('ECB-PRM', 'ts.step.hp_lockouts', { reveal: true, state: { tsWarrantyAck: true, tsLc18: true, tsRatedMin: 'known' } });
assert(ratedPanel.text.indexOf('never below your outdoor unit') !== -1, 'TS-A28 R6 rated block');
assert(F.renderTsPanel('NEST-LT4', 'ts.step.dehumidify', { reveal: true }).text.indexOf('Cool to Dry') !== -1, 'TS-A28 Nest dehumidify');
const geoShown = F.presentResult(tsWalk(['brand_honeywell_smart', 'hw_t6', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_geo', 'geo_lock_temp']));
assert(geoShown.explanation.indexOf('Ask them to check the water side too.') !== -1, 'TS-A28 geo pro');
globalThis.SW_CONFIG.stageLatchStepsEnabled = true;
const latchOn = tsWalk(['brand_honeywell_smart', 'hw_t6', 'landing_stages', 'check_stage_settings']);
assert(latchOn.node === 'ts.step.stage_latch', 'TS-A28 flag-on latch ' + (latchOn.node || latchOn.result));
const t6Latch = F.renderTsPanel('HW-T6', 'ts.step.stage_latch', { reveal: true, state: { tsWarrantyAck: true, tsLc18: true } });
const ecbLatch = F.renderTsPanel('ECB-PRM', 'ts.step.stage_latch', { reveal: true, state: { tsWarrantyAck: true, tsLc18: true } });
assert(t6Latch.text.indexOf('Finish on high stage (some brands call this \u201Clatching\u201D)') !== -1, 'TS-A28 T6 latch block');
assert(ecbLatch.text.indexOf('Finish on high stage (some brands call this \u201Clatching\u201D)') === -1, 'TS-A28 ecobee has no latching setting');
globalThis.SW_CONFIG.stageLatchStepsEnabled = false;
const tsTextRows = [];
Object.keys(F.tsSteps).forEach(fn => Object.keys(F.tsSteps[fn]).forEach(key => { const cell = F.tsSteps[fn][key]; if (!cell.generic) tsTextRows.push([fn + '|' + key, cell.text || '']); }));
tsTextRows.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
assert(tsTextRows.length === 177 && require('crypto').createHash('sha256').update(JSON.stringify(tsTextRows)).digest('hex') === 'b5981f7c33def0f900c3052e3dde6d4b8b789d413e0421692cb7319771bc488b', 'TS-G20 non-generic step text equals spec §3.17');
const tsModelPaths = [
  ['NEST-LT4', ['brand_nest', 'nest_lt4']], ['NEST-NT', ['brand_nest', 'nest_nt']], ['NEST-LT3', ['brand_nest', 'nest_lt3']], ['NEST-E', ['brand_nest', 'nest_e']],
  ['HW-T5', ['brand_honeywell_smart', 'hw_t5']], ['HW-T6', ['brand_honeywell_smart', 'hw_t6']], ['HW-T9', ['brand_honeywell_smart', 'hw_t9']],
  ['ECB-PRM', ['brand_ecobee', 'ecb_premium']], ['ECB-ESS', ['brand_ecobee', 'ecb_essential']],
  ['HW-FP6', ['brand_honeywell_buttons', 'hw_focuspro']], ['HW-RTH76', ['brand_honeywell_buttons', 'hw_rth7600d']], ['HW-TH4', ['brand_honeywell_buttons', 'hw_th4000']], ['HW-X2P', ['brand_honeywell_buttons', 'hw_x2p']],
  ['AMZ-AST', ['brand_amazon']]
];
assert(tsModelPaths.length === 14, '14 model keys');
function scanPanel(panel, where) {
  const hits = F.tsForbiddenScan(panel.text, where);
  assert(!hits.length, (hits[0] || '') + ' ' + where);
  assert(panel.text.indexOf('\u0027') === -1, 'TS-A21 panel ' + where);
  if (panel.lc6) assert(panel.text.indexOf(F.tsLc.lc6) !== -1, 'TS-A9 LC-6 ' + where);
}
F.tsV0.forEach(id => {
  const node = F.nodes[id];
  [node.title, node.body, node.caution].concat(node.options.map(op => [op.label, op.hint, op.fact].join('\n'))).forEach((text, index) => {
    const hits = F.tsForbiddenScan(text, id + ' ' + index);
    assert(!hits.length, hits[0] || id);
  });
});
Object.keys(F.results).filter(id => id.indexOf('ts_') === 0).forEach(id => {
  const res = F.results[id];
  [res.title, res.urgency, res.explanation, res.avoid].concat(res.actions || []).forEach((text, index) => {
    const hits = F.tsForbiddenScan(text, id + ' field ' + index);
    assert(!hits.length, hits[0] || id);
  });
});
tsModelPaths.forEach(([key, path]) => {
  const state = tsWalk(path.concat(['landing_no_heat_cool']));
  assert(state.tsModel === key, 'model key ' + key);
  Object.keys(F.tsFnOf).filter(nodeId => F.tsV0.indexOf(nodeId) !== -1).forEach(nodeId => {
    const panel = F.renderTsPanel(key, nodeId);
    scanPanel(panel, key + ' ' + nodeId);
    assert(!panel.html || panel.html.indexOf('class="ts-screen"') === -1, 'TS-A18 no mirror ' + key + ' ' + nodeId);
    assert(panel.text.indexOf('Menus vary') !== -1 && (panel.steps.length || panel.lc10) && panel.fallbacks.length && panel.text.indexOf('Check your manual:') !== -1, 'TS-A18 steps ' + key + ' ' + nodeId);
    assert(panel.text.indexOf('Independent guide.') === -1, 'TS-A18 no LC-2 ' + key);
  });
});
function withMirrors(extra) {
  const opts = Object.assign({}, extra);
  opts.mirrorsEnabled = !0;
  return opts;
}
const mirrorOn = withMirrors({ today: '2026-10-10' });
tsModelPaths.forEach(([key]) => {
  Object.keys(F.tsFnOf).filter(nodeId => F.tsV0.indexOf(nodeId) !== -1).forEach(nodeId => {
    const panel = F.renderTsPanel(key, nodeId, mirrorOn);
    panel.served.forEach(block => {
      assert(F.tsMirrors.serve.indexOf(block.id) !== -1, 'TS-A8 serve ' + block.id);
      assert(F.tsMirrors.byId[block.id].verified_status === 'verified', 'TS-A8 status ' + block.id);
      assert(!F.tsMirrors.hold.some(row => row.id === block.id), 'TS-A8 hold ' + block.id);
      assert(block.html.indexOf('unverified') === -1, 'TS-A8 unverified line ' + block.id);
    });
    scanPanel(panel, 'on ' + key + ' ' + nodeId);
  });
});
tsModelPaths.forEach(([key]) => {
  Object.keys(F.tsFnOf).filter(nodeId => F.tsV0.indexOf(nodeId) !== -1).forEach(nodeId => {
    const panel = F.renderTsPanel(key, nodeId, withMirrors({ today: '2026-10-10', serve: [] }));
    assert(!panel.served.length && (panel.steps.length || panel.lc10) && panel.fallbacks.length, 'TS-A8 empty serve still has text ' + key + ' ' + nodeId);
  });
});
function strippedRecords() {
  return JSON.parse(JSON.stringify(F.tsMirrors.records)).map(record => {
    record.second_check_by = null;
    record.second_check_on = null;
    return record;
  });
}
const strippedById = {};
strippedRecords().forEach(record => { strippedById[record.id] = record; });
assert(F.tsMirrors.records.every(record => !F.tsMirrorRenderable(strippedById[record.id], withMirrors({ today: '2026-10-10', byId: strippedById }))), 'TS-A19a no second check renders nothing');
const oneId = F.tsMirrors.serve[0];
const one = JSON.parse(JSON.stringify(F.tsMirrors.byId[oneId]));
one.second_check_by = 'Tree Lead';
one.second_check_on = one.verified_on;
const only = Object.assign({}, strippedById, { [oneId]: one });
const renderedIds = F.tsMirrors.records.filter(record => F.tsMirrorRenderable(only[record.id], withMirrors({ today: '2026-10-10', byId: only }))).map(record => record.id);
assert(renderedIds.join('|') === oneId, 'TS-A19b only one record ' + renderedIds.join('|'));
const same = JSON.parse(JSON.stringify(one));
same.second_check_by = same.verified_by;
assert(!F.tsMirrorRenderable(same, withMirrors({ today: '2026-10-10' })), 'TS-A19c same checker');
const held = JSON.parse(JSON.stringify(F.tsMirrors.byId[F.tsMirrors.hold[0].id]));
held.second_check_by = 'Tree Lead';
held.second_check_on = held.verified_on || '2026-10-10';
held.verified_on = held.second_check_on;
assert(!F.tsMirrorRenderable(held, withMirrors({ today: '2026-10-10' })), 'TS-A19d hold');
assert(!F.tsMirrorRenderable(one, withMirrors({ today: '2099-01-01' })), 'TS-A19e recheck');
const unver = JSON.parse(JSON.stringify(one));
unver.verified_status = 'unverified';
assert(!F.tsMirrorRenderable(unver, withMirrors({ today: '2026-10-10' })), 'TS-A19f unverified');
assert(!F.tsMirrors.records.some(record => F.tsMirrorRenderable(record)), 'TS-G16 shipped renderable is false');
const { execFileSync } = require('child_process');
execFileSync(process.execPath, ['--check', path.join(__dirname, '../assets/flow.js')]);
execFileSync(process.execPath, ['--check', path.join(__dirname, '../assets/ts-lane.js')]);
execFileSync(process.execPath, ['--check', path.join(__dirname, '../assets/app.js')]);
let straightCheckFailed = false;
try {
  execFileSync(process.execPath, ['--check', path.join(__dirname, '../assets/flow.js')], { input: '' });
  const scratch = path.join(__dirname, '../.ts-apostrophe-scratch.js');
  fs.writeFileSync(scratch, "const sample = 'isn\\'t';\nconst broken = 'isn't';\n");
  try { execFileSync(process.execPath, ['--check', scratch], { stdio: 'pipe' }); } catch (err) { straightCheckFailed = true; }
  fs.unlinkSync(scratch);
} catch (err) { straightCheckFailed = true; }
assert(straightCheckFailed, 'TS-A21 straight apostrophe fails node --check in a single-quoted file');
function expectTs(label, fn) {
  let message = '';
  try { fn(); } catch (err) { message = String(err && err.message || err); }
  assert(message.indexOf('TS-G') !== -1, label + ' threw ' + message.slice(0, 180));
  console.log('TS-MUT ' + label + ' ' + Array.from(new Set(message.match(/TS-G\d+/g) || [])).join(','));
  return message;
}
(function mutations() {
  const cell = F.tsSteps.MODE['HW-T9'];
  const mirrors = cell.mirrors.slice();
  cell.mirrors = mirrors.concat(['HW-T9.MODE.01/2']);
  expectTs('M1', () => F.assertTs(F.nodes, F.results));
  cell.mirrors = mirrors;
  const holdRow = F.tsMirrors.hold.find(row => row.id === 'HW-T5.MODE.01/1');
  const holdAt = F.tsMirrors.hold.indexOf(holdRow);
  F.tsMirrors.hold.splice(holdAt, 1);
  F.tsMirrors.serve.push('HW-T5.MODE.01/1');
  expectTs('M2', () => F.assertTs(F.nodes, F.results));
  F.tsMirrors.serve.pop();
  F.tsMirrors.hold.splice(holdAt, 0, holdRow);
  const gateOpt = F.nodes['ts.gate.safety_stops'].options.find(op => op.id === 'breaker_keeps_tripping');
  const gateNext = gateOpt.next;
  gateOpt.next = '@ts_blank_after_basics';
  expectTs('M3', () => F.assertTs(F.nodes, F.results));
  gateOpt.next = gateNext;
  const eheat = F.tsSteps.EHEAT['ECB-PRM'];
  const eheatText = eheat.text;
  eheat.text = eheatText + ' Open Installation Settings > Thresholds and lower the value.';
  expectTs('M4', () => F.assertTs(F.nodes, F.results));
  eheat.text = eheatText;
  const fan = F.nodes['ts.settings.fan'];
  const fanOpts = fan.options.slice();
  fan.options = fan.options.filter(op => op.id !== 'screen_looks_different');
  expectTs('M5', () => F.assertTs(F.nodes, F.results));
  fan.options = fanOpts;
  const startOpts = F.nodes['sw.intake.system_type'].options;
  startOpts.push({ id: 'extra', label: 'Extra', next: 'sw.intake.other_system', hint: '', fact: '', gate: null });
  expectTs('M6', () => F.assertTs(F.nodes, F.results));
  startOpts.pop();
  globalThis.SW_CONFIG.aiThermostatEnabled = true;
  expectTs('M7', () => F.assertTs(F.nodes, F.results));
  globalThis.SW_CONFIG.aiThermostatEnabled = false;
  const lc6 = F.tsLc.lc6;
  F.tsLc.lc6 = lc6.replace(/\u2019/g, "'");
  const m8 = expectTs('M8', () => F.assertTs(F.nodes, F.results));
  assert(m8.indexOf('TS-G14') !== -1 && m8.indexOf('TS-G18') !== -1, 'M8 mentions G14 and G18');
  F.tsLc.lc6 = lc6;
  const wifi = F.nodes['ts.settings.wifi'].options.find(op => op.id === 'wifi_fixed');
  const wifiNext = wifi.next;
  wifi.next = 'ts.alert.capture';
  expectTs('M9', () => F.assertTs(F.nodes, F.results));
  wifi.next = wifiNext;
  const blank = F.nodes['ts.power.blank_screen'];
  const blankBody = blank.body;
  blank.body = blankBody + '\nIf the breaker is tripped, you can reset it once.';
  expectTs('M10', () => F.assertTs(F.nodes, F.results));
  blank.body = blankBody;
  globalThis.SW_CONFIG.mirrorsEnabled = true;
  expectTs('M11', () => F.assertTs(F.nodes, F.results));
  globalThis.SW_CONFIG.mirrorsEnabled = false;
  const holdRec = F.tsMirrors.byId['HW-T9.HOLD.01/1'];
  const holdBy = holdRec.second_check_by;
  holdRec.second_check_by = holdRec.verified_by;
  expectTs('M12', () => F.assertTs(F.nodes, F.results));
  assert(!F.tsMirrorRenderable(holdRec, withMirrors({ today: '2026-10-10' })), 'M12 A19c no render');
  holdRec.second_check_by = holdBy;
  const door = F.nodes['sw.intake.system_type'].options.find(op => op.id === 'other_heat_or_ductless');
  const doorLabel = door.label;
  door.label = 'Something else: mini-split, geothermal' + ', other';
  expectTs('M13', () => F.assertTs(F.nodes, F.results));
  door.label = doorLabel;
  const burning = F.results.ts_burning_electrical;
  const burningText = burning.explanation;
  burning.explanation = burningText.replace(/\u2019/g, "'");
  const m14 = expectTs('M14', () => F.assertTs(F.nodes, F.results));
  assert(m14.indexOf('TS-G18') !== -1, 'M14 G18');
  burning.explanation = burningText;
  F.tsMirrors.serve.push('HW-FP6.MODE.01/1');
  const m15 = expectTs('M15', () => F.assertTs(F.nodes, F.results));
  assert(m15.indexOf('TS-G10') !== -1 && m15.indexOf('TS-G19') !== -1, 'M15 G10 and G19');
  F.tsMirrors.serve.pop();
  const th4 = F.tsMirrors.byId['HW-TH4.HOLD.01/1'];
  const th4By = th4.second_check_by;
  const th4On = th4.verified_on;
  th4.second_check_by = null;
  expectTs('M16a', () => F.assertTs(F.nodes, F.results));
  th4.second_check_by = th4By;
  th4.verified_on = '2026-10-09';
  expectTs('M16b', () => F.assertTs(F.nodes, F.results));
  th4.verified_on = th4On;
  const alertT5 = F.tsSteps.ALERT['HW-T5'];
  const alertText = alertT5.text;
  alertT5.text = 'Write down the exact code or message. This check doesn’t interpret it.';
  const m17a = expectTs('M17a', () => F.assertTs(F.nodes, F.results));
  assert(m17a.indexOf('TS-G20') !== -1, 'M17a G20');
  alertT5.text = alertText;
  const modeNest = F.tsSteps.MODE['NEST-LT4'];
  const modeText = modeNest.text;
  modeNest.text = modeText + ' Extra sentence.';
  const m17b = expectTs('M17b', () => F.assertTs(F.nodes, F.results));
  assert(m17b.indexOf('TS-G20') !== -1, 'M17b G20');
  modeNest.text = modeText;
  const scratchPath = path.join(__dirname, '../.ts-data-m17c.json');
  const shippedPath = path.join(__dirname, '../assets/ts-data.json');
  const shippedText = fs.readFileSync(shippedPath, 'utf8');
  const scratch = JSON.parse(shippedText);
  const scratchCell = scratch.steps.MODE['NEST-LT4'];
  assert(scratchCell && !scratchCell.generic && scratchCell.text, 'M17c source cell');
  scratchCell.text = scratchCell.text.slice(0, -1) + (scratchCell.text.slice(-1) === '.' ? '!' : '.');
  fs.writeFileSync(scratchPath, JSON.stringify(scratch));
  try {
    const scratchData = JSON.parse(fs.readFileSync(scratchPath, 'utf8'));
    const scratchRows = [];
    Object.keys(scratchData.steps).forEach(fn => Object.keys(scratchData.steps[fn]).forEach(key => {
      const cell = scratchData.steps[fn][key];
      if (!cell.generic) scratchRows.push([fn + '|' + key, cell.text || '']);
    }));
    scratchRows.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    const scratchHash = require('crypto').createHash('sha256').update(JSON.stringify(scratchRows)).digest('hex');
    const pin = 'b5981f7c33def0f900c3052e3dde6d4b8b789d413e0421692cb7319771bc488b';
    assert(scratchRows.length === 177 && scratchHash !== pin, 'M17c pin still matches ' + scratchHash);
    console.log('TS-MUT M17c PIN_MISMATCH');
  } finally {
    fs.unlinkSync(scratchPath);
  }
  assert(fs.readFileSync(shippedPath, 'utf8') === shippedText, 'M17c left shipped copy');
  function mut(label, apply, revert, code) {
    apply();
    try {
      const message = expectTs(label, () => F.assertTs(F.nodes, F.results));
      if (code) assert(message.indexOf(code) !== -1, label + ' missing ' + code);
    } finally {
      revert();
    }
  }
  const auxMild = F.nodes['ts.diag.heat_pump_aux'].options.find(op => op.id === 'aux_mild_weather');
  const auxNext = auxMild.next;
  mut('M18', () => { auxMild.next = 'ts.step.hp_lockouts'; }, () => { auxMild.next = auxNext; }, 'TS-G25');
  auxMild.next = 'ts.step.hp_lockouts';
  const m18path = tsWalk(['brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather']);
  assert(m18path.node === 'ts.step.hp_lockouts' && m18path.answers.every(row => row.choice !== 'hp_air' && row.choice !== 'guard_ok'), 'M18 A22');
  auxMild.next = auxNext;
  const coldNode = F.nodes['ts.guard.cold_weather'];
  mut('M19', () => { coldNode.safetyGate = false; }, () => { coldNode.safetyGate = true; }, 'TS-G24');
  const diffCell = F.tsSteps.DIFF['ECB-PRM'];
  const diffText = diffCell.text;
  mut('M20', () => { diffCell.text = diffText + ' Aux Heat Max Outdoor'; }, () => { diffCell.text = diffText; }, 'TS-G27');
  mut('M21', () => { F.tsWave2.forceRatedMin = true; }, () => { F.tsWave2.forceRatedMin = false; }, 'TS-G28');
  const cphCell = F.tsSteps.CPH['HW-T6'];
  const cphText = cphCell.text;
  mut('M22', () => { cphCell.text = cphText + ' Raise ISU 365 by 1.'; }, () => { cphCell.text = cphText; }, 'TS-G32');
  const readingMatch = F.nodes['ts.diag.reading_check'].options.find(op => op.id === 'reading_matches');
  const readingNext = readingMatch.next;
  mut('M23', () => { readingMatch.next = 'ts.step.offset'; }, () => { readingMatch.next = readingNext; }, 'TS-G31');
  readingMatch.next = 'ts.step.offset';
  const m23path = tsWalk(['brand_honeywell_smart', 'hw_t6', 'landing_wrong_reading', 'reading_matches']);
  assert(m23path.node === 'ts.step.offset' && !m23path.answers.some(row => row.node === 'ts.diag.location'), 'M23 A23');
  readingMatch.next = readingNext;
  mut('M24', () => { diffCell.text = diffText + ' A safe value is 3.'; }, () => { diffCell.text = diffText; }, 'TS-G33');
  const lockSources = F.tsSteps.HPLOCK['ECB-PRM'].num_sources;
  mut('M25', () => { lockSources.push({ label: 'TRADE', item: 'compressor min outdoor', typical: '25 °F', value: 25, low: 0, high: 10 }); }, () => { lockSources.pop(); }, 'TS-G34');
  const t6Lock = F.tsSteps.HPLOCK['HW-T6'];
  mut('M26', () => { t6Lock.omitLc32 = true; }, () => { t6Lock.omitLc32 = false; }, 'TS-G34');
  mut('M27', () => { globalThis.SW_CONFIG.stageLatchStepsEnabled = true; }, () => { globalThis.SW_CONFIG.stageLatchStepsEnabled = false; }, 'TS-G37');
  const eheatCell = F.tsSteps.EHEAT['ECB-PRM'];
  const eheatSaved = eheatCell.text;
  mut('M28', () => { eheatCell.text = eheatSaved + ' Don’t tap either.'; }, () => { eheatCell.text = eheatSaved; }, 'TS-G38');
  const swingNode = F.nodes['ts.diag.swing'];
  mut('M29', () => { swingNode.advancedNote = 'advancedRepairsEnabled'; }, () => { delete swingNode.advancedNote; }, 'TS-G35');
  mut('M30', () => { F.tsWave2.stepsBeforeCheckbox = true; }, () => { F.tsWave2.stepsBeforeCheckbox = false; }, 'TS-G29');
  const t6Neighbors = cphCell.neighbors;
  mut('M31', () => { cphCell.neighbors = ''; }, () => { cphCell.neighbors = t6Neighbors; }, 'TS-G30');
  const t5Offset = F.tsSteps.OFFSET['HW-T5'];
  const t5Kind = t5Offset.kind;
  mut('M32', () => { t5Offset.kind = 'text'; }, () => { t5Offset.kind = t5Kind; }, 'TS-G40');
  const t6LockText = t6Lock.text;
  mut('M33', () => { t6Lock.text = t6LockText.replace('ISU **130**', 'the outdoor source'); }, () => { t6Lock.text = t6LockText; }, 'TS-G39');
  const nearFreeze = coldNode.options.find(op => op.id === 'guard_near_freezing');
  const nearLabel = nearFreeze.label;
  mut('M34', () => { nearFreeze.label = 'Below 40 °F (4 °C) the heat pump can’t run efficiently'; }, () => { nearFreeze.label = nearLabel; }, 'TS-G33');
  const hpGeo = F.nodes['ts.guard.hp_source'].options.find(op => op.id === 'hp_geo');
  const hpGeoNext = hpGeo.next;
  mut('M35', () => { hpGeo.next = 'ts.guard.cold_weather'; }, () => { hpGeo.next = hpGeoNext; }, 'TS-G43');
  hpGeo.next = 'ts.guard.cold_weather';
  const m35path = tsWalk(['brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_geo', 'guard_ok', 'only_backup_heat']);
  assert(m35path.node === 'ts.step.hp_lockouts' && m35path.tsGeo, 'M35 A31');
  hpGeo.next = hpGeoNext;
  const geoTemp = F.nodes['ts.look.geo_lockouts'].options.find(op => op.id === 'geo_lock_temp');
  const geoTempNext = geoTemp.next;
  mut('M36', () => { geoTemp.next = 'ts.step.hp_lockouts'; }, () => { geoTemp.next = geoTempNext; }, 'TS-G43');
  geoTemp.next = 'ts.step.hp_lockouts';
  const m36path = tsWalk(['brand_honeywell_smart', 'hw_t6', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_geo', 'geo_lock_temp']);
  assert(m36path.node === 'ts.step.hp_lockouts' && m36path.tsGeo, 'M36 A31');
  geoTemp.next = geoTempNext;
  mut('M37', () => { F.tsWave2.geoRenderGuard = false; }, () => { F.tsWave2.geoRenderGuard = true; }, 'TS-G43');
  F.tsWave2.geoRenderGuard = false;
  const m37panel = F.renderTsPanel('ECB-PRM', 'ts.step.hp_lockouts', { state: { tsGeo: true }, reveal: true });
  assert(m37panel.text.indexOf('AUX HEAT MAX OUTDOOR TEMP') !== -1, 'M37 A32');
  F.tsWave2.geoRenderGuard = true;
  const hpAir = F.nodes['ts.guard.hp_source'].options.find(op => op.id === 'hp_air');
  mut('M38', () => { F.tsWave2.showHpAirInWshp = true; }, () => { F.tsWave2.showHpAirInWshp = false; }, 'TS-G43');
  F.tsWave2.showHpAirInWshp = true;
  assert(F.tsOptionVisible(hpAir, { product: 'wshp' }), 'M38 A31');
  F.tsWave2.showHpAirInWshp = false;
  const offsetText = F.tsSteps.OFFSET['ECB-PRM'].text;
  mut('M39', () => { F.tsSteps.OFFSET['ECB-PRM'].text = offsetText.replace('Don’t go past 3 °F (1.5 °C) either way in total. A bigger difference is a job for a professional.', ''); }, () => { F.tsSteps.OFFSET['ECB-PRM'].text = offsetText; }, 'TS-G41');
  mut('M40', () => { F.tsWave2.renderHeldText = true; }, () => { F.tsWave2.renderHeldText = false; }, 'TS-G45');
  mut('M41', () => { cphCell.omitLc38 = true; }, () => { cphCell.omitLc38 = false; }, 'TS-G44');
  const stageBlock = F.tsLatchBlocks.find(block => block.id === 'ecb-cs2');
  mut('M42', () => { stageBlock.live = true; }, () => { stageBlock.live = false; }, 'TS-G42');
  const stagePro = F.results.ts_stage_pro;
  const stageProText = stagePro.explanation;
  mut('M43', () => { stagePro.explanation = stageProText + ' lonnie@secondwrench.co'; }, () => { stagePro.explanation = stageProText; }, 'TS-G46');
  mut('M44', () => { stagePro.explanation = stageProText + ' If it always starts on high'; }, () => { stagePro.explanation = stageProText; }, 'TS-G47');
  const stageOpts = F.nodes['ts.diag.stages'].options;
  mut('M45', () => { stageOpts.splice(2, 0, { id: 'always_high', label: 'It always runs on high and never on low', next: '@ts_stage_pro', hint: '', fact: '' }); }, () => { stageOpts.splice(2, 1); }, 'TS-G47');
  stageOpts.splice(2, 0, { id: 'always_high', label: 'It always runs on high and never on low', next: '@ts_stage_pro', hint: '', fact: '' });
  let m45clean = true;
  try { if (stageOpts.some(op => op.id === 'always_high')) throw new Error('TS-A33 always_high'); } catch (err) { m45clean = false; }
  assert(!m45clean, 'M45 A33');
  stageOpts.splice(2, 1);
  const t9Latch = F.tsSteps.LATCH['HW-T9'];
  const t9Kind = t9Latch.kind;
  mut('M46', () => { t9Latch.kind = 'text'; }, () => { t9Latch.kind = t9Kind; }, 'TS-G48');
  const geoT6 = F.tsSteps.GEO['HW-T6'];
  const geoNeighbors = geoT6.neighbors;
  mut('M47', () => { geoT6.neighbors = ''; }, () => { geoT6.neighbors = geoNeighbors; }, 'TS-G43');
  const dehumText = F.tsSteps.DEHUM['ECB-PRM'].text;
  mut('M48', () => { F.tsSteps.DEHUM['ECB-PRM'].text = dehumText + ' Lower Aux Heat Max Outdoor Temp by one step.'; }, () => { F.tsSteps.DEHUM['ECB-PRM'].text = dehumText; }, 'TS-G49');
  const bounceOpt = stageOpts.find(op => op.id === 'bounces');
  const bounceLabel = bounceOpt.label;
  mut('M49', () => { bounceOpt.label = 'Your thermostat shows stage 2 turning on and off'; }, () => { bounceOpt.label = bounceLabel; }, 'TS-G50');
  const t6Block = F.tsLatchBlocks.find(block => block.id === 't6-finish');
  const t6BlockLabel = t6Block.label;
  mut('M50', () => { t6Block.label = 'Latching'; }, () => { t6Block.label = t6BlockLabel; }, 'TS-G47');
  const lc40Saved = t6Lock.lc40.slice();
  const lc40Sentence = F.tsLc.lc40.split('[label]').join('ISU 356').replace(/\*\*/g, '');
  mut('M51', () => { t6Lock.lc40 = []; t6Lock.text = t6LockText.split(lc40Sentence).join(''); }, () => { t6Lock.lc40 = lc40Saved; t6Lock.text = t6LockText; }, 'TS-G51');
  F.assertTs(F.nodes, F.results);
})();

function finish() {
  if (failed) {
    console.error(failed + ' failed');
    process.exit(1);
  }
  console.log('AC Wave-2, HP Wave-1, WSHP Wave-1 PR-1, furnace Wave-1, mini-split heat v1, and thermostat v1 sanity passed');
}

function bootPage() {
  const { JSDOM, VirtualConsole } = require('jsdom');
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(String(error && error.stack || error)));
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8')
    .replace(/\s*<script src="assets\/(?:config|ts-runtime|ts-lane|flow|app)\.js\?v=[^"]+" defer><\/script>/g, '')
    .replace('</body>', '<script>' + fs.readFileSync(path.join(__dirname, '../assets/config.js'), 'utf8') + '</script><script>' + fs.readFileSync(path.join(__dirname, '../assets/ts-runtime.js'), 'utf8') + '</script><script>' + fs.readFileSync(path.join(__dirname, '../assets/ts-lane.js'), 'utf8') + '</script><script>' + fs.readFileSync(path.join(__dirname, '../assets/flow.js'), 'utf8') + '</script><script>' + fs.readFileSync(path.join(__dirname, '../assets/app.js'), 'utf8') + '</script></body>');
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:8765/#/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) { window.scrollTo = () => {}; }
  });
  return { dom, errors };
}

function pageChecks() {
  const crypto = require('crypto');
  const { dom, errors } = bootPage();
  const window = dom.window;
  const doc = window.document;
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));
  const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const norm = el => (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
  const rendered = () => {
    const clone = doc.body.cloneNode(true);
    clone.querySelectorAll('script,style').forEach(node => node.remove());
    return norm(clone);
  };
  async function home() {
    if (window.location.hash !== '#/') window.location.hash = '#/';
    await flush();
    click(doc.querySelector('[data-action="start"]'));
    await flush();
  }
  function emergencyOk(label) {
    const footer = doc.querySelector('.legal-footer');
    assert(window.location.hash === '#/result', label + ' reaches a result');
    assert(footer && footer.textContent === EMERGENCY_LINE, label + ' shows the emergency result line');
    assert(doc.querySelector('.result-heading.emergency'), label + ' renders an emergency result');
    assert(!doc.getElementById('agree'), label + ' does not ask for the checkbox');
  }
  return (async () => {
    assert(errors.length === 0, 'page scripts load without error: ' + errors.join(' | '));
    assert(norm(doc.querySelector('.beta-bar')) === 'Free public beta. A better next step. · Not an emergency service', 'rendered beta bar');
    assert(norm(doc.querySelector('.quiet-note')).startsWith('Free public beta. Try it on your own system and tell us what was clear or confusing.'), 'rendered home note');
    function assertSocial(nav, where) {
      assert(nav && nav.getAttribute('aria-label') === 'Follow Second Wrench', where + ' follow row');
      const links = [...nav.querySelectorAll('a')];
      assert(links.length === SOCIAL_LINKS.length, where + ' follow row has only the three links');
      SOCIAL_LINKS.forEach(([href, label]) => {
        const link = links.find(el => el.getAttribute('href') === href);
        assert(link && link.getAttribute('target') === '_blank' && link.getAttribute('rel') === 'noopener noreferrer' && link.getAttribute('aria-label') === label, where + ' link ' + label);
      });
      assert(!links.some(el => /instagram/i.test(el.getAttribute('href') || '') || /instagram/i.test(el.textContent || '')), where + ' has no Instagram link');
    }
    const heroCta = doc.querySelector('.hero-cta');
    const startBtn = heroCta && heroCta.querySelector('[data-action="start"]');
    const heroFollow = heroCta && heroCta.querySelector('.social-follow');
    assert(startBtn && heroFollow && (startBtn.compareDocumentPosition(heroFollow) & window.Node.DOCUMENT_POSITION_FOLLOWING), 'follow row sits below Start');
    assertSocial(heroFollow, 'home');
    assertSocial(doc.querySelector('.site-footer .social-follow'), 'site footer');
    assert(![...doc.querySelectorAll('a')].some(el => /instagram/i.test(el.getAttribute('href') || '')), 'rendered page has no Instagram link');
    for (const [id, title] of HAZARDS) {
      await home();
      assert(!doc.getElementById('agree'), id + ' starts on the safety gate without a checkbox');
      click(doc.querySelector('[data-answer="' + id + '"]'));
      await flush();
      emergencyOk(id);
      assert(doc.querySelector('h1') && doc.querySelector('h1').textContent === title, id + ' result title');
    }
    for (const [id, title] of HAZARDS) {
      await home();
      click(doc.querySelector('[data-answer="none_of_these"]'));
      await flush();
      const box = doc.getElementById('agree');
      const cont = doc.getElementById('continue-consent');
      assert(box && box.checked === false && cont && cont.disabled, id + ' stop path leaves the checkbox unticked');
      click(doc.querySelector('header [data-action="stop"]'));
      await flush();
      assert(!doc.getElementById('agree') && doc.querySelector('h1').textContent === 'Is any of this happening right now?', 'Stop / get help returns to the hazard gate without the checkbox');
      click(doc.querySelector('[data-answer="' + id + '"]'));
      await flush();
      emergencyOk('Stop / get help then ' + id);
      assert(doc.querySelector('h1').textContent === title, 'Stop / get help then ' + id + ' result title');
    }
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    const cont = doc.getElementById('continue-consent');
    assert(cont.disabled && doc.getElementById('agree').checked === false, 'Continue starts disabled while the checkbox is unticked');
    click(cont);
    await flush();
    assert(doc.querySelector('h1').textContent === 'A guide, not an equipment inspection.', 'a disabled Continue does not leave consent');
    cont.disabled = false;
    click(cont);
    await flush();
    assert(window.location.hash === '#/check', 'Continue stays on the check route');
    assert(doc.querySelector('h1').textContent === 'A guide, not an equipment inspection.', 'Continue re-checks the checkbox and does not advance');
    assert(doc.getElementById('flow-error').textContent === 'Please read and accept the Terms and Privacy notes to continue.', 'Continue explains that the checkbox is required');
    assert(doc.querySelector('main h1').textContent !== 'What kind of system is this?', 'an unticked Continue does not open system type');
    async function acceptAndContinue() {
      const box = doc.getElementById('agree');
      box.checked = true;
      box.dispatchEvent(new window.Event('input', { bubbles: true }));
      await flush();
      click(doc.getElementById('continue-consent'));
      await flush();
    }
    function answer(id) {
      const button = doc.querySelector('[data-answer="' + id + '"]');
      assert(button, 'choice is on screen: ' + id);
      click(button);
    }
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    assert(doc.querySelector('h1').textContent === 'What kind of system is this?', 'consent opens system type');
    answer('other_heat_or_ductless');
    await flush();
    answer('water_source_geo');
    await flush();
    answer('wshp_hz_none');
    await flush();
    answer('wshp_closed_loop');
    await flush();
    answer('wshp_cx_no_heat');
    await flush();
    assert(window.location.hash === '#/result', 'WSHP closed loop reaches a result');
    assert(doc.querySelector('h1').textContent === 'Call a pro who works on geothermal or water-source heat pumps.', 'WSHP lane renders the call_pro result');
    assert(doc.querySelector('.pill').textContent === 'Professional guidance', 'WSHP call_pro tier renders');
    assert(doc.getElementById('service-note') && doc.getElementById('service-note').textContent.indexOf('HOMEOWNER SERVICE NOTE') === 0, 'WSHP call_pro note renders');
    assert(!doc.getElementById('flow-error'), 'WSHP lane result has no error');
    assert(errors.length === 0, 'WSHP lane page has no script error: ' + errors.join(' | '));
    async function clickPath(choices) {
      for (const id of choices) {
        answer(id);
        await flush();
      }
    }
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['cooling_only_ac', 'split_central_cool_only', 'landing_weak_airflow', 'filter_clean_ok', 'want_duct_work']);
    assert(window.location.hash === '#/result', 'want_duct_work reaches a result');
    assert(doc.querySelector('h1').textContent === 'Cutting ducts, opening a chase, or reaching the blower is not a Basic step.', 'want_duct_work renders call_pro');
    assert(doc.getElementById('service-note') && doc.getElementById('service-note').textContent.indexOf('HOMEOWNER SERVICE NOTE') === 0, 'want_duct_work note renders');
    assert(!doc.getElementById('flow-error'), 'want_duct_work result has no error');
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['cooling_only_ac', 'split_central_cool_only', 'landing_not_cooling', 'mode_cool_setpoint_ok', 'filter_clean_ok', 'fan_spinning', 'want_fin_comb_deep_coil']);
    assert(window.location.hash === '#/result', 'want_fin_comb_deep_coil reaches a result');
    assert(doc.querySelector('h1').textContent === 'Combing fins deep into the coil, or a chemical coil clean, is not part of this guide.', 'want_fin_comb_deep_coil renders call_pro');
    assert(doc.getElementById('service-note') && doc.getElementById('service-note').textContent.indexOf('HOMEOWNER SERVICE NOTE') === 0, 'want_fin_comb_deep_coil note renders');
    assert(!doc.getElementById('flow-error'), 'want_fin_comb_deep_coil result has no error');
    assert(errors.length === 0, 'AC call_pro pages have no script error: ' + errors.join(' | '));
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['furnace', 'none_of_these', 'gas_furnace', 'landing_no_heat', 'cannot_change_settings', 'ack_call_pro']);
    assert(window.location.hash === '#/result', 'furnace intake reaches a call_pro result');
    assert(doc.querySelector('h1').textContent === 'Call a licensed HVAC pro.', 'furnace call_pro title');
    assert(doc.querySelector('.pill').textContent === 'Professional guidance', 'furnace call_pro tier renders');
    assert(doc.getElementById('service-note') && doc.getElementById('service-note').textContent.indexOf('HOMEOWNER SERVICE NOTE — furnace observations, not a diagnosis') === 0, 'furnace call_pro note renders');
    assert(!doc.getElementById('flow-error'), 'furnace call_pro result has no error');
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['furnace', 'gas_smell_or_unknown_smell']);
    assert(window.location.hash === '#/result', 'gas smell reaches a result');
    assert(doc.querySelector('.result-heading.emergency'), 'gas smell renders an emergency result');
    assert(doc.querySelector('h1').textContent === 'Leave the house now.', 'gas smell emergency title');
    assert(doc.querySelector('.legal-footer') && doc.querySelector('.legal-footer').textContent === EMERGENCY_LINE, 'gas smell shows the emergency result line');
    assert(!doc.getElementById('flow-error'), 'gas smell result has no error');
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['furnace', 'none_of_these', 'gas_furnace', 'landing_water_near_furnace', 'water_at_electrical_yes']);
    assert(window.location.hash === '#/result', 'furnace water-at-electrical reaches a result');
    assert(doc.querySelector('h1').textContent === "Don't touch the furnace or stand in the water.", 'furnace water-at-electrical title');
    assert(doc.querySelector('.result-heading.emergency'), 'furnace water-at-electrical renders an emergency result');
    assert(norm(doc.querySelector('.explanation')) === "Water is at or near the furnace's electrical parts.", 'furnace water-at-electrical explanation');
    assertNoShutOff(rendered(), 'furnace water-at-electrical page shut-off instruction');
    assert(doc.querySelector('.legal-footer') && doc.querySelector('.legal-footer').textContent === EMERGENCY_LINE, 'furnace water-at-electrical shows the emergency result line');
    assert(!doc.getElementById('flow-error'), 'furnace water-at-electrical has no error');
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['heat_pump', 'air_source_hp_gas_furnace', 'none_of_these']);
    assert(doc.querySelector('h1').textContent === 'What is going on with the heat pump?', 'dual-fuel gate clear returns to the heat-pump check');
    const side = norm(doc.querySelector('.sidebar'));
    assert(side.indexOf('No gauges or refrigerant.') !== -1 && side.indexOf('Never relight a pilot') !== -1, 'dual-fuel sidebar shows heat-pump and furnace limits');
    assert(errors.length === 0, 'furnace page has no script error: ' + errors.join(' | '));
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['other_heat_or_ductless', 'ductless_mini_split', 'ductless_single_zone', 'landing_no_cool', 'settings_fixed_now_cooling']);
    assert(window.location.hash === '#/result', 'mini-split basic path reaches a result');
    assert(doc.querySelector('h1').textContent === 'A setting was the problem.', 'mini-split basic success title');
    assert(doc.querySelector('.pill').textContent === 'Basic homeowner check', 'mini-split basic tier renders');
    assert(doc.getElementById('service-note') && doc.getElementById('service-note').textContent.indexOf('HOMEOWNER SERVICE NOTE — mini-split observations, not a diagnosis') === 0, 'mini-split note renders');
    assert(!doc.getElementById('flow-error'), 'mini-split basic result has no error');
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['other_heat_or_ductless', 'ductless_mini_split', 'ductless_single_zone', 'landing_water_at_head', 'water_on_electrical']);
    assert(window.location.hash === '#/result', 'mini-split water/electrical reaches a result');
    assert(doc.querySelector('h1').textContent === 'Don’t touch the indoor unit or stand in the water.', 'mini-split water/electrical title');
    assert(doc.querySelector('.result-heading.emergency'), 'mini-split water/electrical renders an emergency result');
    assertNoShutOff(rendered(), 'mini-split water/electrical page shut-off instruction');
    assert(!doc.getElementById('flow-error'), 'mini-split water/electrical has no error');
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['other_heat_or_ductless', 'ductless_mini_split', 'ductless_single_zone', 'landing_no_heat']);
    assert(doc.querySelector('h1').textContent === 'Set Heat and give it time to warm up', 'heat-mode question is on screen');
    assert(norm(doc.querySelector('.sidebar')).indexOf('Look at the outdoor unit only from a window or dry ground.') !== -1, 'heat path sidebar keeps the outdoor look limit');
    answer('heat_fixed_after_setting');
    await flush();
    assert(window.location.hash === '#/result', 'heat-mode basic path reaches a result');
    assert(doc.querySelector('h1').textContent === 'Leave it in Heat.', 'heat-mode basic success title');
    assert(doc.querySelector('.pill').textContent === 'Basic homeowner check', 'heat-mode basic tier renders');
    assert(doc.getElementById('service-note') && doc.getElementById('service-note').textContent.indexOf('User set Heat, a setting above the room, a normal fan, and no timer. Heating returned.') !== -1, 'heat-mode note records the setting change');
    assert(!doc.getElementById('flow-error'), 'heat-mode basic result has no error');
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['other_heat_or_ductless', 'ductless_mini_split', 'ductless_single_zone', 'landing_no_heat', 'mode_was_auto', 'forced_heat_still_problem', 'defrost_then_heat_fine']);
    assert(window.location.hash === '#/result', 'normal defrost reaches a result');
    assert(doc.querySelector('h1').textContent === 'That pause was a normal defrost.', 'normal defrost title');
    assert(doc.querySelector('.pill').textContent === 'Basic homeowner check', 'normal defrost tier renders');
    const defrostText = rendered().toLowerCase();
    assert(defrostText.indexOf('steam') !== -1 && defrostText.indexOf('pause') !== -1 && defrostText.indexOf('whoosh') !== -1, 'normal defrost page names steam, a pause, and a whoosh');
    assert(!doc.getElementById('flow-error'), 'normal defrost result has no error');
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['other_heat_or_ductless', 'ductless_mini_split', 'ductless_single_zone', 'landing_no_heat', 'heat_settings_right_still_problem', 'outdoor_iced_solid_no_recover']);
    assert(window.location.hash === '#/result', 'ice that keeps building reaches a result');
    assert(doc.querySelector('h1').textContent === 'Thick ice on the outdoor unit in heat needs a pro.', 'ice that keeps building title');
    assert(doc.querySelector('.pill').textContent === 'Professional guidance', 'ice that keeps building is call_pro');
    assert(!doc.querySelector('.result-heading.emergency'), 'ice that keeps building is not an emergency result');
    assert(doc.getElementById('service-note') && doc.getElementById('service-note').textContent.indexOf('HOMEOWNER SERVICE NOTE — mini-split observations, not a diagnosis') === 0, 'ice that keeps building note renders');
    assertNoShutOff(rendered(), 'ice that keeps building page shut-off instruction');
    assert(!doc.getElementById('flow-error'), 'ice that keeps building has no error');
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['other_heat_or_ductless', 'ductless_mini_split', 'ductless_single_zone', 'landing_no_heat', 'cold_exposure_risk']);
    assert(window.location.hash === '#/result', 'cold exposure reaches a result');
    assert(doc.querySelector('h1').textContent === 'Get the person warm first.', 'cold exposure title');
    assert(doc.querySelector('.result-heading.emergency'), 'cold exposure renders an emergency result');
    assert(rendered().indexOf('call 911 now') !== -1, 'cold exposure says to call 911');
    assert(doc.querySelector('.legal-footer') && doc.querySelector('.legal-footer').textContent === EMERGENCY_LINE, 'cold exposure shows the emergency result line');
    assertNoShutOff(rendered(), 'cold exposure page shut-off instruction');
    assert(!doc.getElementById('flow-error'), 'cold exposure has no error');
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['cooling_only_ac', 'ductless_mini_split']);
    assert(doc.querySelector('h1').textContent === 'Is this a ductless mini-split with one indoor unit?', 'AC intake ductless answer opens the mini-split check');
    assert(norm(doc.querySelector('.sidebar')).indexOf('No ladders, chairs, or tools.') !== -1, 'mini-split sidebar limit');
    assert(doc.title.indexOf('Guided mini-split check') === 0, 'mini-split route title');
    assert(errors.length === 0, 'mini-split page has no script error: ' + errors.join(' | '));
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['other_heat_or_ductless', 'thermostat_settings', 'ts_none_of_these', 'brand_honeywell_smart', 'hw_t9', 'landing_no_heat_cool']);
    assert(doc.querySelector('h1').textContent === 'Check the mode and temperature', 'thermostat mode question is on screen');
    assert(doc.title.indexOf('Guided thermostat check') === 0, 'thermostat route title');
    assert(norm(doc.querySelector('.sidebar')).indexOf('Settings only. No wires, no covers. Some installer settings have steps; the ones that protect your equipment don’t. Low-voltage thermostats only.') !== -1, 'thermostat sidebar limit');
    assert(norm(doc.querySelector('.ts-lc3')).indexOf('Menus vary by model and firmware.') !== -1, 'thermostat panel shows menus vary');
    assert(!doc.querySelector('.ts-screen'), 'shipped config does not render a mirror box');
    const affiliation = [...doc.querySelectorAll('.ts-affiliation')].map(el => el.textContent);
    assert(affiliation.length === 1 && affiliation[0].indexOf('We’re not affiliated') !== -1, 'LC-1 appears once on the thermostat question');
    answer('mode_fixed');
    await flush();
    assert(window.location.hash === '#/result', 'thermostat basic path reaches a result');
    assert(doc.querySelector('h1').textContent === 'A setting was the problem.', 'thermostat basic success title');
    assert(doc.getElementById('service-note').textContent.indexOf('HOMEOWNER SERVICE NOTE — thermostat observations, not a diagnosis') === 0, 'thermostat note renders');
    assert(doc.querySelector('.tell-pro'), 'thermostat result lists what to tell the pro');
    assert([...doc.querySelectorAll('.ts-affiliation')].length === 1, 'LC-1 appears once on the thermostat result');
    assert(!doc.getElementById('flow-error'), 'thermostat basic result has no error');
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['other_heat_or_ductless', 'thermostat_settings', 'ts_none_of_these', 'brand_ecobee', 'ecb_premium']);
    assert(rendered().indexOf('Once it gets louder and blows harder, it stays that way until it shuts off') !== -1, 'stages landing label is on screen');
    answer('landing_stages');
    await flush();
    answer('holds_high');
    await flush();
    assert(doc.querySelector('h1').textContent === 'Staging needs a pro', 'stages path reaches the pro result');
    assert(rendered().indexOf('Finish on high stage (some brands call this “latching”)') !== -1, 'stages result uses the approved label');
    assert(rendered().toLowerCase().indexOf('emergency heat mode') === -1, 'stages result has no emergency-heat blocking note');
    await home();
    click(doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    await acceptAndContinue();
    await clickPath(['other_heat_or_ductless', 'thermostat_settings', 'ts_none_of_these', 'brand_ecobee', 'ecb_premium', 'landing_backup_heat_cost', 'aux_mild_weather', 'hp_air', 'guard_ok', 'only_backup_heat']);
    assert(rendered().indexOf('If the house is getting cold and neither the heat pump nor backup heat is running') === -1, 'lockout steps stay hidden before the notices');
    for (const ack of ['warranty', 'lc18']) {
      const box = doc.querySelector('[data-ts-ack="' + ack + '"]');
      assert(box && !box.checked, 'ack starts unchecked ' + ack);
      box.checked = true;
      box.dispatchEvent(new window.Event('change', { bubbles: true }));
      await flush();
    }
    assert(rendered().indexOf('AUX HEAT MAX OUTDOOR TEMP') !== -1, 'revealed lockout steps name the ecobee setting');
    assert(rendered().indexOf('If the house is getting cold and neither the heat pump nor backup heat is running, put AUX HEAT MAX OUTDOOR TEMP back') !== -1, 'LC-40 is next to the lockout steps');
    assert(rendered().toLowerCase().indexOf('emergency heat mode') === -1, 'lockout steps have no emergency-heat blocking note');
    window.location.hash = '#/sources';
    await flush();
    assert(norm(doc.querySelector('main')).indexOf('Thermostat guides') !== -1, 'sources list thermostat guides');
    window.location.hash = '#/terms';
    await flush();
    const termsBody = norm(doc.querySelector('.document-panel'));
    assert(termsBody.includes('Emergency / hazard help never requires this checkbox.'), 'rendered terms include the hazard checkbox sentence');
    const termsHash = crypto.createHash('sha256').update(termsBody).digest('hex');
    assert(termsHash === TERMS_BODY_SHA256, 'terms body matches the approved text ' + termsHash);
    window.location.hash = '#/privacy';
    await flush();
    const privacyBody = norm(doc.querySelector('.document-panel'));
    const privacyHash = crypto.createHash('sha256').update(privacyBody).digest('hex');
    assert(privacyHash === PRIVACY_BODY_SHA256, 'privacy body matches the approved text ' + privacyHash);
    window.close();
    finish();
  })().catch(error => {
    failed += 1;
    console.error('FAIL', error && error.stack || error);
    finish();
  });
}

pageChecks();
