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
const SHIP = '2026-10-10.1';
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

assert(/termsVersion:\s*'public-beta-2026-10-08'/.test(configText), 'termsVersion is public-beta-2026-10-08');
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
const TERMS_BODY_SHA256 = '1627d50cf67e830e6dd3d1c19c8c307315c2d1dd550ee20a9a1cde326b780a09';
const PRIVACY_BODY_SHA256 = 'fd1c58dc308bb57f592bbf5deea72d8c3dc0be7a4b03084c8a8310912a7bb725';

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
assert(otherSystem.options.map(o => o.id).join('|') === 'ductless_mini_split|water_source_geo|not_listed', 'A-4 other-system order');
assert(systemType.options.find(o => o.id === 'other_heat_or_ductless').label === 'Something else: mini-split, geothermal, other' && systemType.options.find(o => o.id === 'other_heat_or_ductless').next === 'sw.intake.other_system', 'A-4 something-else label');
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
const pointer = 'Start again, choose Something else: mini-split, geothermal, other, then Water-source / geothermal heat pump.';
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
assert(geoOption.hint === 'Geothermal or water-source: start again, choose Something else: mini-split, geothermal, other, then Water-source / geothermal heat pump. Packaged or other systems are not covered yet.', 'geothermal packaged hint points back to the water-source check');
assert(F.results.out_of_scope_equipment.urgency === 'Not covered in this beta yet', 'out-of-scope equipment urgency is not a hard outside-the-beta title');
const geoMention = /water[-\s]?source|geothermal/i;
const oosClaim = /out of scope|outside this beta|outside these checks|not diagnosed|not covered|not part of this beta/i;
const redirect = /start again, choose Something else: mini-split, geothermal, other, then Water-source \/ geothermal heat pump/i;
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


// ---- Mini-split ms.ductless.v0 ----
assert(F.treeVersionMs === 'ms.ductless.v0', 'MS-A1 mini-split tree version');
assert(Array.isArray(F.msPr1) && F.msPr1.length === 10, 'MS-G1 ten mini-split nodes exported');
assert(Object.keys(F.nodes).length === 64, 'node count is 64');
assert(Object.keys(F.results).length === 158, 'result count is 158');
const ms1 = ['none_of_these', 'agree_18_terms', 'other_heat_or_ductless', 'ductless_mini_split', 'ductless_single_zone'];
const msGate = ms1.slice(0, 4);
const msAt = walk('ask', msGate);
assert(msAt.node === 'ms.intake.system_confirm' && msAt.product === 'ms' && msAt.treeVersion === 'ms.ductless.v0', 'MS-A2 start reaches mini-split intake');
assert(msAt.answers.map(a => a.node).join('|') === 'ac.gate.cluster_entry|ac.session.consent|sw.intake.system_type|sw.intake.other_system', 'MS-A2 answered nodes');
const msLaneAt = msAt.audit.findIndex(e => e.event === 'product_lane:ms');
assert(msLaneAt > msAt.audit.findIndex(e => e.event === 'answer_selected:other_heat_or_ductless') && msLaneAt < msAt.audit.findIndex(e => e.event === 'answer_selected:ductless_mini_split'), 'MS lane is entered before the ductless answer is recorded');
assert(msAt.audit.slice(msLaneAt).every(e => e.tree === 'ms.ductless.v0'), 'MS-A1 audit tree from product_lane:ms');
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
assert(w8.result === 'ms_ice_keep_running' && w8.treeVersion === 'ms.ductless.v0' && eventsOf(w8).filter(e => e === 'product_lane:ms').length === 1, 'W8 AC intake switches to the mini-split lane');
const covered = new Set();
[w1, w2, w3, w4, w4b, w5a, w5b, w6, w7, w8].forEach(s => s.answers.forEach(a => { if (a.node.indexOf('ms.') === 0) covered.add(a.node); }));
F.msPr1.forEach(id => assert(covered.has(id), 'MS-A2 covered ' + id));
const openMs = walk('ask', ms1);
const openAc = walk('ac', gate.concat(['split_central_cool_only']));
F.stop(openMs); F.stop(openAc);
assert(openMs.node === openAc.node && openMs.node === 'ac.gate.cluster_entry' && openMs.result === null && openMs.safetyCleared === false, 'MS-A14 stop on an open mini-split node matches the AC stop');
const agreeEdges = [];
Object.keys(F.nodes).forEach(id => F.nodes[id].options.forEach(op => { if (op.id === 'agree_18_terms') agreeEdges.push(id + ':' + op.next); }));
assert(agreeEdges.length === 1 && agreeEdges[0] === 'ac.session.consent:ac.cool.intake.system_confirm', 'consent is not forked');
assert(F.results.hp_mini_split_oos.actions[0] === 'Go back home, press Start, and choose “Something else: mini-split, geothermal, other”, then “Ductless mini-split”. It covers cooling problems on a single indoor unit.', 'MS-C14');
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
assert(F.nodes['ms.head.airflow_result'].options.find(op => op.id === 'improved_ok').label === 'Better. Airflow is back to normal', 'weak-air success says airflow is back to normal');
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
const prohibWord = /refrigerant|breaker|capacitor|contactor|inverter|board|compressor|flare|line set|coil|motor|(?<!heat[ -])pump|float|bleach|vinegar|drill|panel|wiring|rewire|meter|heat gun|hair dryer|chip/i;
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
  'If you can’t tell whether water or melting ice is near an outlet, a cord, or the unit’s wiring, stop.'
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
F.msPr1.forEach(id => {
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
F.msPr1.forEach(id => {
  const node = F.nodes[id];
  assertNoShutOff([node.title, node.body, node.caution].concat(node.options.map(op => [op.label, op.hint, op.fact].join('\n'))).join('\n'), 'shut-off instruction in ' + id);
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
    if (depth > 9) throw new Error('MS depth at ' + s.node);
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
assert(msOff.out.length === 350 && msOff.out.join('|') === msOn.out.join('|'), 'MS-A4 leaf set is 350 and identical with Advanced on');
assert(msOff.maxDepth <= 9, 'MS-A5 depth ' + msOff.maxDepth);
const hpDigestLines = [];
Object.keys(F.nodes).filter(id => id.indexOf('hp.') === 0).sort().forEach(id => {
  F.nodes[id].options.forEach(op => {
    hpDigestLines.push(id + '|' + op.id + '>' + (typeof op.next === 'object' ? JSON.stringify(op.next) : op.next) + '>' + (op.gate || ''));
  });
});
hpDigestLines.sort();
assert(require('crypto').createHash('sha256').update(hpDigestLines.join('\n')).digest('hex').slice(0, 16) === '0a90560104be1a12', 'HP edge digest re-baselined to a3c2f60');
assert(hpDigestLines.length === 65, 'HP edge digest line count');

function finish() {
  if (failed) {
    console.error(failed + ' failed');
    process.exit(1);
  }
  console.log('AC Wave-2, HP Wave-1, WSHP Wave-1 PR-1, furnace Wave-1, and mini-split PR1 sanity passed');
}

function bootPage() {
  const { JSDOM, VirtualConsole } = require('jsdom');
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(String(error && error.stack || error)));
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8')
    .replace(/\s*<script src="assets\/(?:config|flow|app)\.js\?v=[^"]+" defer><\/script>/g, '')
    .replace('</body>', '<script>' + fs.readFileSync(path.join(__dirname, '../assets/config.js'), 'utf8') + '</script><script>' + fs.readFileSync(path.join(__dirname, '../assets/flow.js'), 'utf8') + '</script><script>' + fs.readFileSync(path.join(__dirname, '../assets/app.js'), 'utf8') + '</script></body>');
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
    await clickPath(['cooling_only_ac', 'ductless_mini_split']);
    assert(doc.querySelector('h1').textContent === 'Is this a ductless mini-split with one indoor unit?', 'AC intake ductless answer opens the mini-split check');
    assert(norm(doc.querySelector('.sidebar')).indexOf('No ladders, chairs, or tools.') !== -1, 'mini-split sidebar limit');
    assert(doc.title.indexOf('Guided mini-split check') === 0, 'mini-split route title');
    assert(errors.length === 0, 'mini-split page has no script error: ' + errors.join(' | '));
    window.location.hash = '#/terms';
    await flush();
    const termsBody = norm(doc.querySelector('.document-panel'));
    assert(termsBody.includes('Emergency / hazard help never requires this checkbox.'), 'rendered terms include the hazard checkbox sentence');
    assert(crypto.createHash('sha256').update(termsBody).digest('hex') === TERMS_BODY_SHA256, 'terms body matches the approved text');
    window.location.hash = '#/privacy';
    await flush();
    const privacyBody = norm(doc.querySelector('.document-panel'));
    assert(crypto.createHash('sha256').update(privacyBody).digest('hex') === PRIVACY_BODY_SHA256, 'privacy body matches the approved text');
    window.close();
    finish();
  })().catch(error => {
    failed += 1;
    console.error('FAIL', error && error.stack || error);
    finish();
  });
}

pageChecks();
