/* Referral phase 1. Flag off. No network. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
globalThis.SW_CONFIG = { advancedRepairsEnabled: false, aiThermostatEnabled: false, mirrorsEnabled: false, stageLatchStepsEnabled: false, catalogEnabled: false, referralEnabled: false, contentVersion: '2026-10-20.11' };
const F = require('../assets/flow.js');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', msg);
  }
}
function same(left, right, msg) {
  const a = JSON.stringify(left);
  const b = JSON.stringify(right);
  assert(a === b, msg + ' ' + a + ' != ' + b);
}

const configText = read('assets/config.js');
const appText = read('assets/app.js');
const flowText = read('assets/flow.js');
const coreText = read('netlify/functions/_referral-core.mjs');
const matchText = read('netlify/functions/_referral-match.mjs');
const functionText = [coreText, matchText, read('netlify/functions/referral.mjs'), read('netlify/functions/referral-admin.mjs'), read('netlify/functions/_contractor-join.mjs'), read('netlify/functions/_logo-type.mjs'), read('netlify/functions/pros-join.mjs'), read('netlify/functions/_pro-signup.mjs'), read('netlify/functions/pro-signup.mjs')].join('\n');
const copy = JSON.parse(read('data/referral/copy.json'));
const blocked = JSON.parse(read('data/referral/blocked-results.json'));
const examples = JSON.parse(read('data/referral/contractors.example.json'));
const META = { agreed: true, termsVersion: 'public-beta-2026-10-18.1', privacyVersion: 'privacy-public-beta-2026-10-18.1' };

function walk(choices) {
  const state = F.create('', 'test');
  choices.forEach(choice => {
    if (state.node === 'sw.co.fast_exit' && choice !== 'co_yes' && choice !== 'co_no') F.answer(state, 'co_no', META);
    F.answer(state, choice, META);
  });
  return state;
}
function resultState(id, extra) {
  const state = Object.assign(F.create('', 'test'), extra || {}, { node: null, result: id, product: (extra && extra.product) || 'fn' });
  return state;
}

const NEVER = [
  'fn_smell_shutoff', 'fn_code_flame_no_call_stop', 'fn_flame_abnormal', 'fn_ignition_bang',
  'fn_vent_damaged_stop', 'fn_water_electrical', 'fn_ask_installer_card', 'fn_vent_unsafe_wait',
  'fn_mh_animals_stop', 'fn_propane_out', 'fn_propane_low_supplier', 'fn_cold_exposure',
  'fn_code_rollout_stop', 'fn_meter_iced', 'fn_gate_unsure', 'fn_gas_smell', 'fn_co_alarm',
  'fn_rollout_soot', 'fn_burning_sparks', 'fn_hazard_now', 'fn_smell_smoke_exit', 'sw_co_symptom_exit',
  'gas', 'fire', 'a11', 'b7'
];

assert(/referralEnabled:\s*false/.test(configText) && !/referralEnabled:\s*true/.test(configText), 'browser referral flag stays false');
assert(/export const referralEnabled = false/.test(coreText) && !/export const referralEnabled = true/.test(coreText), 'server referral flag stays false');
assert(/advancedRepairsEnabled:\s*false/.test(configText) && !/advancedRepairsEnabled:\s*true/.test(configText), 'advanced repairs stay off');
assert(/catalogEnabled:\s*false/.test(configText) && !/catalogEnabled:\s*true/.test(configText), 'catalog stays off');
assert(configText.includes("contentVersion: '2026-10-20.11'"), 'content version is 2026-10-20.11');
assert(copy.consentTextVersion === 'referral-consent-pending-legal-2026-10-20.1' && appText.includes(copy.consentTextVersion), 'consent text version is the pending-legal id');
Object.keys(copy).forEach(key => {
  if (key === 'consentTextVersion') return;
  assert(String(copy[key]).includes('PENDING LEGAL'), 'copy ' + key + ' is pending legal');
  assert(appText.includes(copy[key]), 'app.js includes copy ' + key);
});
assert(!/\bsafe\b/i.test(Object.values(copy).join('\n') + '\n' + appText.slice(appText.indexOf('const REFERRAL_COPY'), appText.indexOf('function referralOn'))), 'referral copy does not use safe as an adjective');
assert(!/nodemailer|twilio|sendgrid|mailgun|sendSms|sendEmail|createTransport/i.test(functionText), 'referral functions do not send email or SMS');
assert(!/x-forwarded-for|x-nf-client-connection-ip|cf-connecting-ip|client-ip/i.test(functionText), 'referral functions do not read an IP header');
assert(coreText.includes("const STORE = 'referrals'") && coreText.includes('name: STORE'), 'referral store name');
assert(/region:\s*['"]us-east-2['"]/.test(functionText) && /consistency:\s*['"]strong['"]/.test(functionText), 'referral blobs region and consistency');
assert(examples.data_notice.includes('EXAMPLE DATA') && examples.contractors.every(row => row.example === true && /EXAMPLE DATA/.test(row.data_notice)), 'fixtures are example data');
NEVER.forEach(id => {
  assert(blocked.includes(id), 'blocked list includes ' + id);
  assert(flowText.includes(id + ': 1'), 'never-show list includes ' + id);
  assert(F.referralEligible(resultState(id)) === false, id + ' is not referral eligible');
});
['fn_smell_shutoff', 'fn_code_flame_no_call_stop', 'fn_flame_abnormal', 'fn_ignition_bang', 'fn_vent_damaged_stop', 'fn_ask_installer_card', 'fn_vent_unsafe_wait', 'fn_mh_animals_stop', 'fn_propane_out', 'fn_propane_low_supplier', 'fn_code_rollout_stop', 'fn_meter_iced'].forEach(id => {
  assert(F.results[id] && F.results[id].outcome === 'call_pro', id + ' would be a call-pro card without the never-show list');
});

const shut = walk(['none_of_these', 'agree_18_terms', 'furnace', 'none_of_these', 'gas_furnace', 'natural_gas', 'site_built', 'landing_first_heat_smell', 'dust', 'over_hour_or_stronger']);
assert(shut.result === 'fn_smell_shutoff' && F.referralEligible(shut) === false, 'walked smell shutoff hides the card');
const propaneOut = walk(['none_of_these', 'agree_18_terms', 'furnace', 'none_of_these', 'gas_furnace', 'propane', 'site_built', 'landing_fuel_low', 'empty']);
assert(propaneOut.result === 'fn_propane_out' && propaneOut.fnGas === 'propane' && F.referralEligible(propaneOut) === false, 'empty propane routes to the supplier with no card');
const propaneLow = walk(['none_of_these', 'agree_18_terms', 'furnace', 'none_of_these', 'gas_furnace', 'propane', 'manufactured_home', 'landing_fuel_low', 'low']);
assert(propaneLow.result === 'fn_propane_low_supplier' && F.referralEligible(propaneLow) === false, 'low propane routes to the supplier with no card');
const callPro = walk(['none_of_these', 'agree_18_terms', 'furnace', 'none_of_these', 'gas_furnace', 'natural_gas', 'site_built', 'landing_no_heat', 'silent', 'cannot_change_settings', 'ack_call_pro']);
assert(callPro.result === 'fn_call_pro' && callPro.fnReason === 'thermostat_control_issue' && F.referralEligible(callPro) === true, 'thermostat control call-pro can show the card');
const callNote = F.summary(callPro);
assert(callNote.includes('Fuel (reported): natural gas') && callNote.includes('Vent type (reported): not reported') && callNote.includes('Home type (reported): site built'), 'call-pro note records fuel, vent type, and home type');
assert(!/gas_combustion|hydronic_hydro_air|manufactured_home|bosch_ids_edge|fn_reason/.test(callNote), 'service note does not print internal tags');
assert(!/\bsafe\b/i.test(callNote.split('\n').filter(line => /Fuel \(reported\)|Vent type \(reported\)|Home type \(reported\)/.test(line)).join('\n')), 'new note lines do not use safe');
const basic = walk(['none_of_these', 'agree_18_terms', 'furnace', 'none_of_these', 'gas_furnace', 'natural_gas', 'site_built', 'landing_no_heat', 'silent', 'tstat_not_calling']);
assert(basic.result === 'fn_tstat_set_heat_basic' && !F.summary(basic).includes('Fuel (reported):'), 'a basic result does not gain the call-pro fuel lines');
const metal = resultState('fn_call_pro', { fnFuel: 'gas', fnGas: 'natural_gas', fnHome: 'manufactured_home', fnReason: 'vent_not_pvc', answers: [{ node: 'fn.vent.outdoor_gate', choice: 'metal_chimney', fact: '' }] });
const metalNote = F.summary(metal);
assert(metalNote.includes('Fuel (reported): natural gas') && metalNote.includes('Vent type (reported): metal chimney or vent') && metalNote.includes('Home type (reported): manufactured home'), 'metal vent and manufactured home are written in words');
const hydro = resultState('fn_hydro_coil_freeze_pro', { fnFuel: 'hydronic', fnHome: 'site_built', answers: [] });
assert(F.summary(hydro).includes('Fuel (reported): hydronic hot-water coil') && F.summary(hydro).includes('Vent type (reported): none for this equipment'), 'hydro-air call-pro names the coil and no combustion vent');
const summary = F.referralSummary(metal, { brand: 'Bosch', model: 'BGH97M060', code: 'dF' });
same({ fuel: summary.fuel, vent_type: summary.vent_type, home_type: summary.home_type, fn_reason: summary.fn_reason, code: summary.code }, {
  fuel: 'gas', vent_type: 'metal', home_type: 'manufactured_home', fn_reason: 'vent_not_pvc', code: 'dF'
}, 'referral summary stores fuel, vent, home, reason, and code');
assert(F.referralEligible(callPro, { code: 'A11' }) === false && F.referralEligible(callPro, { code: 'b7' }) === false, 'A11 and b7 leak codes suppress the card');
assert(F.referralEligible(callPro, { code: 'df' }) === true, 'a normal defrost code does not erase a real call-pro result');
assert(F.referralEligible(resultState('ms_defrost_normal_basic', { product: 'ms' })) === false, 'a normal defrost result is not a referral');
assert(F.referralCodeClass('A11') === 'safety' && F.referralCodeClass('b7') === 'safety' && F.referralCodeClass('df') === 'normal' && F.referralCodeClass('d35') === '', 'browser code classes match the Bosch never-refer list');
assert(F.referralEligible(resultState('fn_mh_listing_card', { fnHome: 'manufactured_home' })) === true, 'manufactured-home replacement card stays eligible');
const fast = F.create();
assert(fast.node === 'sw.co.fast_exit' && F.referralEligible(fast) === false, 'CO fast exit hides the card');

function launchGuard(source) {
  const flagOn = /referralEnabled\s*[:=]\s*true/.test(source);
  if (flagOn && /PENDING LEGAL/.test(appText + '\n' + JSON.stringify(copy))) throw new Error('pending_legal');
}
launchGuard(configText + '\n' + coreText);
let guardThrew = false;
try { launchGuard(configText.replace('referralEnabled: false', 'referralEnabled: true')); } catch (err) { guardThrew = err.message === 'pending_legal'; }
assert(guardThrew, 'turning the flag on while PENDING LEGAL remains fails the guard');

async function main() {
  const match = await import('../netlify/functions/_referral-match.mjs');
  const core = await import('../netlify/functions/_referral-core.mjs');
  const codes = ['A11', 'b7', 'df', 'dfx', 'dF', 'd0', 'd03', 'd11', 'd12', 'd13', 'd14', 'd34', 'dd', 'd61', 'd35', ''];
  codes.forEach(code => assert(match.boschCodeClass(code) === F.referralCodeClass(code), 'server and browser agree on ' + code));
  same(match.boschSeriesTags('BOHA-24RTB-M18S').sort(), ['bosch_ids_edge', 'edge_regular'], 'Edge Regular outdoor prefix');
  same(match.boschSeriesTags('BOHA-36MTB-M18S').sort(), ['bosch_ids_edge', 'edge_max'], 'Edge Max outdoor prefix');
  same(match.boschSeriesTags('BOHA-60RTB-M18S').sort(), ['bosch_ids_edge', 'edge_regular'], '5-ton Regular prefix');
  same(match.boschSeriesTags('BIVA-36VCB-M18X'), ['bosch_ids_edge'], 'Edge Multi air handler is strong evidence');
  same(match.boschSeriesTags('BIDA-09VCB-M18X'), ['bosch_ids_edge'], 'slim duct prefix');
  same(match.boschSeriesTags('BIWA-12VCB-M18X'), ['bosch_ids_edge'], 'wall prefix');
  same(match.boschSeriesTags('BISA-18VCB-M18X'), ['bosch_ids_edge'], 'cassette prefix');
  same(match.boschSeriesTags('BIKA-07VCB-M18X'), ['bosch_ids_edge'], 'compact cassette prefix');
  same(match.boschSeriesTags('BIVA-36RCB-M20X'), ['bosch_ids_premium_ahu'], 'premium air handler alone is not Edge');
  same(match.boschSeriesTags('BIVB48'), ['bosch_ids_premium_ahu'], 'BIVB premium air handler alone is not Edge');
  same(match.boschSeriesTags('BMAC3036BBTA'), [], 'cased coil alone is not Edge');
  same(match.boschSeriesTags('BGH97M060'), [], 'BGH97 furnace alone is not Edge');
  same(match.boschSeriesTags('BGH97M060 BOHA-24MTB-M18S').sort(), ['bosch_ids_edge', 'edge_max'], 'BGH97 is Edge when the outdoor unit is BOHA');
  same(match.boschSeriesTags('BIVA-24RCB-M20X / BOHA-60RTB-M18S').sort(), ['bosch_ids_edge', 'bosch_ids_premium_ahu', 'edge_regular'], 'premium air handler with a BOHA outdoor unit is Edge');
  same(match.furnaceSkillTags({ result_id: 'fn_call_pro', fn_reason: 'thermostat_control_issue', fuel: 'gas', home_type: 'site_built' }), ['electrical'], 'thermostat control is electrical');
  same(match.furnaceSkillTags({ result_id: 'fn_call_pro', fn_reason: 'no_heat_after_basics', fuel: 'propane', home_type: 'site_built' }).sort(), ['gas_combustion', 'propane'], 'propane fuel-dep adds both tags');
  same(match.furnaceSkillTags({ result_id: 'fn_call_pro', fn_reason: 'weak_heat_after_basics', fuel: 'gas', home_type: 'manufactured_home' }).sort(), ['gas_combustion', 'manufactured_home'], 'manufactured home is added from the session');
  same(match.furnaceSkillTags({ result_id: 'fn_call_pro', fn_reason: 'hydro_blower_not_running', fuel: 'hydronic' }).sort(), ['electrical', 'hydronic_hydro_air'], 'hydro-air blower uses the hydronic tag');
  same(match.furnaceSkillTags({ result_id: 'fn_hydro_coil_freeze_pro', fuel: 'hydronic' }).sort(), ['any_hvac', 'hydronic_hydro_air'], 'hydro coil freeze uses the hydronic tag');
  same(match.furnaceSkillTags({ result_id: 'fn_mh_crossover_pro', home_type: 'manufactured_home' }), ['manufactured_home'], 'crossover duct is manufactured home');
  same(match.furnaceSkillTags({ result_id: 'fn_mh_listing_card' }).sort(), ['manufactured_home', 'replacement'], 'listing card is a replacement lead');
  same(match.furnaceSkillTags({ result_id: 'fn_oil_lockout_pro', fuel: 'oil' }), ['oil'], 'oil lockout stays on oil');
  same(match.furnaceSkillTags({ result_id: 'fn_code_to_pro', fn_reason: 'code_to_pro_VENT_MH', fuel: 'gas' }).sort(), ['gas_combustion', 'manufactured_home'], 'Coleman vent code tags combustion and manufactured home');
  same(match.furnaceSkillTags({ result_id: 'fn_code_to_pro', fn_reason: 'code_to_pro_IGNITION', fuel: 'propane' }).sort(), ['gas_combustion', 'propane'], 'ignition on propane adds propane');
  assert(match.equipmentTags({ lane: 'fn', result_id: 'fn_propane_out', fuel: 'propane' }).length === 0, 'propane-out does not match an HVAC contractor');
  assert(match.equipmentTags({ lane: 'fn', result_id: 'fn_call_pro', code: 'A11', fuel: 'gas', fn_reason: 'no_heat_after_basics' }).length === 0, 'an A11 leak is not a contractor match');
  const edgeTags = match.equipmentTags({ lane: 'hp', brand: 'Bosch', model: 'BOHA-36MTB-M18S', result_id: 'hp_defrost_valve_ob_control', code: 'df' });
  assert(edgeTags.includes('heat_pump') && edgeTags.includes('bosch') && edgeTags.includes('bosch_ids_edge') && edgeTags.includes('edge_max') && !edgeTags.includes('defrost'), 'Edge Max prefix tags the series and a defrost status adds no referral tag');
  const today = '2026-10-20';
  const bosch = match.matchContractor(examples.contractors, { zip: '43215', equipment_tags: ['furnace', 'bosch'] }, { today, includeExample: true });
  assert(bosch && bosch.contractor_id === 'example-bosch-columbus', 'one Bosch example matches ZIP 432');
  const cooling = match.matchContractor(examples.contractors, { zip: '43215', equipment_tags: ['ac', 'carrier'] }, { today, includeExample: true });
  assert(cooling && cooling.contractor_id === 'example-ac-columbus', 'one cooling example matches ZIP 432');
  assert(match.matchContractor(examples.contractors, { zip: '44114', equipment_tags: ['furnace'] }, { today, includeExample: true }).contractor_id === 'example-furnace-cleveland', 'Cleveland stays in its ZIP3');
  assert(match.matchContractor(examples.contractors, { zip: '43215', equipment_tags: ['furnace', 'bosch'] }, { today, includeExample: false }) === null, 'example rows are not live matches');
  assert(Array.isArray(match.matchContractor(examples.contractors, { zip: '43215', equipment_tags: ['furnace'] }, { today, includeExample: true })) === false, 'matching returns one contractor');

  const base = {
    bot_field: '', consent_text_version: copy.consentTextVersion, share_with_one_contractor: true, phone_contact: false,
    zip: '43215', name: 'Ada Lovelace', email: 'ada@example.com', phone: '', lane: 'fn', result_id: 'fn_call_pro',
    brand: 'Bosch', model: 'BOHA-36RTB-M18S', symptom: 'landing_no_heat', fuel: 'gas', vent_type: 'pvc',
    home_type: 'manufactured_home', fn_reason: 'weak_heat_after_basics', code: ''
  };
  const prepared = core.prepareReferral(base, new Date('2026-10-20T18:00:00.000Z'));
  assert(prepared.record && prepared.record.summary.fuel === 'gas' && prepared.record.summary.vent_type === 'pvc' && prepared.record.summary.home_type === 'manufactured_home', 'stored referral keeps fuel, vent type, and home type');
  assert(!JSON.stringify(prepared.record).includes('user_agent') && !Object.prototype.hasOwnProperty.call(prepared.record, 'ip'), 'stored referral has no IP');
  assert(core.prepareReferral(Object.assign({}, base, { ip: '203.0.113.8' })).error === 'forbidden_field', 'an IP field is rejected');
  assert(core.prepareReferral(base).error !== 'forbidden_field', 'ZIP is not treated as an IP field');
  assert(core.prepareReferral(Object.assign({}, base, { result_id: 'fn_propane_out', fuel: 'propane' })).error === 'result', 'propane-out is rejected');
  assert(core.prepareReferral(Object.assign({}, base, { code: 'A11' })).error === 'result', 'A11 is rejected');
  assert(core.prepareReferral(Object.assign({}, base, { code: 'b7' })).error === 'result', 'b7 is rejected');
  assert(core.prepareReferral(Object.assign({}, base, { result_id: 'df', code: 'df' })).error === 'result', 'a defrost status is not a referral result');
  const normal = core.prepareReferral(Object.assign({}, base, { code: 'dF' }));
  assert(normal.record && normal.record.summary.code === 'dF', 'a defrost code on a real call-pro is stored and is not itself the referral');
  assert(core.blockedResult('df') === true && core.blockedResult('fn_call_pro') === false, 'normal status ids are blocked and call-pro is not');

  function request(url, method, body, headers) {
    return new Request(url, { method, headers: headers || {}, body: body == null ? undefined : JSON.stringify(body) });
  }
  const off = await core.handleReferral(request('http://127.0.0.1:8765/api/referral', 'POST', base, { 'content-type': 'application/json' }));
  assert(off.status === 503 && (await off.json()).error === 'referral_off', 'POST /api/referral is 503 while the flag is off');
  const store = core.memoryStore();
  const on = await core.handleReferral(request('http://127.0.0.1:8765/api/referral', 'POST', base, { 'content-type': 'application/json', origin: 'http://127.0.0.1:8765' }), { enabled: true, store, now: new Date('2026-10-20T18:00:00.000Z') });
  const onBody = await on.json();
  assert(on.status === 200 && onBody.stored === true, 'a flagged-on request stores');
  const saved = await store.get('referrals/' + onBody.referral_id + '.json', { type: 'json' });
  assert(saved.summary.fuel === 'gas' && saved.summary.vent_type === 'pvc' && saved.summary.home_type === 'manufactured_home' && !JSON.stringify(saved).match(/"ip"|user_agent|x-forwarded-for/), 'saved record has the furnace fields and no address');
  const adminOff = await core.handleReferralAdmin(request('http://127.0.0.1:8765/api/referral-admin', 'GET'));
  assert(adminOff.status === 503, 'admin is 503 while the flag is off');
  const adminDenied = await core.handleReferralAdmin(request('http://127.0.0.1:8765/api/referral-admin', 'GET'), { enabled: true, store, adminKey: '' });
  assert(adminDenied.status === 401, 'admin without a key is 401');
  await store.setJSON('directory/contractors.json', examples.contractors);
  const admin = await core.handleReferralAdmin(request('http://127.0.0.1:8765/api/referral-admin', 'GET', null, { 'x-referral-admin-key': 'secret' }), { enabled: true, store, adminKey: 'secret', now: new Date('2026-10-20T18:00:00.000Z') });
  const adminBody = await admin.json();
  assert(admin.status === 200 && adminBody.referrals.length === 1 && adminBody.suggestions[0].contractor_id === null, 'admin export does not attach example contractors');

  await pageChecks();
  if (failed) {
    console.error(failed + ' referral check(s) failed');
    process.exit(1);
  }
  console.log('referral checks passed');
}

function boot(flag) {
  const { JSDOM, VirtualConsole } = require('jsdom');
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(String(error && error.stack || error)));
  let config = read('assets/config.js');
  if (flag) config = config.replace('referralEnabled: false', 'referralEnabled: true');
  const html = read('index.html')
    .replace(/\s*<script src="assets\/(?:config|ts-runtime|ts-lane|ta-wave3|heating-data|heating-lanes|flow|app)\.js\?v=[^"]+" defer><\/script>/g, '')
    .replace('</body>', '<script>' + config + '</script><script>' + read('assets/ts-runtime.js') + '</script><script>' + read('assets/ts-lane.js') + '</script><script>' + read('assets/heating-data.js') + '</script><script>' + read('assets/heating-lanes.js') + '</script><script>' + read('assets/ta-wave3.js') + '</script><script>' + read('assets/flow.js') + '</script><script>' + read('assets/app.js') + '</script></body>');
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:8765/#/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.scrollTo = () => {};
      window.__sent = [];
      window.fetch = (url, init) => {
        window.__sent.push({ url: String(url), body: init && init.body ? String(init.body) : '' });
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ stored: true, referral_id: 'ref-test' }) });
      };
    }
  });
  return { errors, window: dom.window, doc: dom.window.document };
}

async function pageChecks() {
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));
  function click(el) { el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true })); }
  async function choose(page, ids) {
    for (const id of ids) {
      if (id !== 'co_yes' && id !== 'co_no' && page.doc.querySelector('[data-answer="co_no"]') && page.doc.querySelector('h1') && /carbon monoxide/i.test(page.doc.querySelector('h1').textContent)) {
        click(page.doc.querySelector('[data-answer="co_no"]'));
        await flush();
      }
      const button = page.doc.querySelector('[data-answer="' + id + '"]');
      if (!button) {
        const options = [...page.doc.querySelectorAll('[data-answer]')].map(el => el.getAttribute('data-answer')).join(',');
        const title = (page.doc.querySelector('h1') || {}).textContent || '';
        assert(false, 'missing choice ' + id + ' on ' + title + ' options ' + options);
        return;
      }
      click(button);
      await flush();
    }
  }
  async function reach(page, ids) {
    click(page.doc.querySelector('[data-action="start"]'));
    await flush();
    const co = page.doc.querySelector('[data-answer="co_no"]');
    if (co) { click(co); await flush(); }
    click(page.doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
    const agree = page.doc.getElementById('agree');
    agree.checked = true;
    agree.dispatchEvent(new page.window.Event('input', { bubbles: true }));
    click(page.doc.querySelector('[data-answer="agree_18_terms"]'));
    await flush();
    await choose(page, ids);
  }
  const off = boot(false);
  await reach(off, ['cooling_only_ac', 'split_central_cool_only', 'landing_will_not_start', 'outdoor_hum_no_fan', 'ack_call_pro']);
  const visible = () => off.doc.querySelector('main').textContent;
  assert(off.doc.querySelector('[data-result]') && !off.doc.querySelector('#referral-card'), 'flag off shows no referral card on call-pro');
  assert(!visible().includes('PENDING LEGAL'), 'flag off renders no pending legal copy');
  assert(!off.window.__sent.some(item => item.url.indexOf('/api/referral') !== -1), 'flag off does not call the referral API');
  off.window.location.hash = '#/privacy';
  off.window.dispatchEvent(new off.window.HashChangeEvent('hashchange'));
  await flush();
  assert(!off.doc.querySelector('main').textContent.includes('PENDING LEGAL'), 'privacy page has no referral placeholder while the flag is off');
  assert(off.errors.length === 0, 'flag-off page has no script error');

  const on = boot(true);
  await reach(on, ['cooling_only_ac', 'split_central_cool_only', 'landing_will_not_start', 'outdoor_hum_no_fan', 'ack_call_pro']);
  const card = on.doc.querySelector('#referral-card');
  assert(card && card.textContent.includes('Find a pro for your equipment'), 'flag on shows the card only after a call-pro result');
  click(on.doc.querySelector('[data-action="referral-yes"]'));
  await flush();
  const share = on.doc.getElementById('referral-share');
  const phoneOk = on.doc.getElementById('referral-phone-ok');
  assert(share && share.checked === false && phoneOk && phoneOk.checked === false, 'consent boxes start unchecked');
  assert(on.doc.getElementById('referral-phone-wrap').hidden === true, 'phone consent stays hidden until a phone is typed');
  on.doc.getElementById('referral-zip').value = '43215';
  on.doc.getElementById('referral-name').value = 'Ada Lovelace';
  on.doc.getElementById('referral-email').value = 'ada@example.com';
  share.checked = true;
  click(on.doc.querySelector('[data-action="referral-submit"]'));
  await flush();
  await flush();
  const sent = on.window.__sent.find(item => item.url.indexOf('/api/referral') !== -1);
  assert(sent, 'submit posts to /api/referral');
  const payload = JSON.parse(sent.body);
  assert(payload.share_with_one_contractor === true && payload.phone_contact === false && payload.fuel === '' && payload.vent_type === '' && payload.home_type === '' && payload.lane === 'ac', 'submit sends consent and the fuel fields');
  assert(!payload.ip && !payload.user_agent, 'submit does not send an IP');

  const gas = boot(true);
  click(gas.doc.querySelector('[data-action="start"]'));
  await flush();
  click(gas.doc.querySelector('[data-answer="co_no"]'));
  await flush();
  click(gas.doc.querySelector('[data-answer="hazard_gas_co"]'));
  await flush();
  assert(gas.doc.querySelector('[data-result="gas"]') && !gas.doc.querySelector('#referral-card'), 'gas exit shows no card');
  const smoke = boot(true);
  click(smoke.doc.querySelector('[data-action="start"]'));
  await flush();
  click(smoke.doc.querySelector('[data-answer="co_no"]'));
  await flush();
  click(smoke.doc.querySelector('[data-answer="none_of_these"]'));
  await flush();
  click(smoke.doc.querySelector('[data-action="stop"]'));
  await flush();
  click(smoke.doc.querySelector('[data-answer="co_no"]'));
  await flush();
  click(smoke.doc.querySelector('[data-answer="hazard_smoke_fire_sparks_burn"]'));
  await flush();
  assert(smoke.doc.querySelector('[data-result="fire"]') && !smoke.doc.querySelector('#referral-card'), 'smoke exit shows no card');
  const co = boot(true);
  click(co.doc.querySelector('[data-action="start"]'));
  await flush();
  click(co.doc.querySelector('[data-answer="co_yes"]'));
  await flush();
  assert(co.doc.querySelector('[data-result="sw_co_symptom_exit"]') && !co.doc.querySelector('#referral-card'), 'CO symptom exit shows no card');
  const smell = boot(true);
  await reach(smell, ['furnace', 'none_of_these', 'gas_furnace', 'natural_gas', 'site_built', 'landing_first_heat_smell', 'dust', 'over_hour_or_stronger']);
  assert(smell.doc.querySelector('[data-result="fn_smell_shutoff"]') && !smell.doc.querySelector('#referral-card'), 'smell shutoff shows no card');
  const supplier = boot(true);
  await reach(supplier, ['furnace', 'none_of_these', 'gas_furnace', 'propane', 'site_built', 'landing_fuel_low', 'empty']);
  assert(supplier.doc.querySelector('[data-result="fn_propane_out"]') && !supplier.doc.querySelector('#referral-card'), 'propane supplier result shows no contractor card');
  const note = supplier.doc.getElementById('service-note');
  assert(note && note.textContent.includes('Fuel (reported): propane'), 'propane call-pro note names the fuel');
  [on, gas, smoke, co, smell, supplier].forEach(page => assert(page.errors.length === 0, 'referral page has no script error: ' + page.errors.join(' | ')));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
