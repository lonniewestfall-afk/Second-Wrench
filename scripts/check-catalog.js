/* Catalog phase 1. No network. */
'use strict';
globalThis.SW_CONFIG = { advancedRepairsEnabled: false, aiThermostatEnabled: false, mirrorsEnabled: false, stageLatchStepsEnabled: false, contentVersion: '2026-10-13.2' };
const fs = require('fs');
const path = require('path');
const F = require('../assets/flow.js');
const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const configText = read('assets/config.js');
const appText = read('assets/app.js');
const headerText = read('_headers');
const enums = JSON.parse(read('data/catalog-enums.json'));
const brands = JSON.parse(read('data/catalog-brands.json'));
const serialRules = JSON.parse(read('data/decode/serial-rules.json'));
const capacityRules = JSON.parse(read('data/decode/capacity-rules.json'));
const functionText = ['netlify/functions/_catalog-core.mjs', 'netlify/functions/catalog-ingest.mjs', 'netlify/functions/catalog-record.mjs', 'netlify/functions/catalog-followup.mjs'].map(read).join('\n');
let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', msg);
  }
}
const META = { agreed: true, termsVersion: 'public-beta-2026-10-18.1', privacyVersion: 'privacy-public-beta-2026-10-18.1' };
function walk(choices) {
  const state = F.create();
  choices.forEach(choice => F.answer(state, choice, META));
  state.privacyVersion = META.privacyVersion;
  state.catalogConsent = true;
  state.catalogConsentVersion = 'cat-consent-2026-10-18.1';
  state.catalogConsentAt = '2026-10-18T15:20:00.000Z';
  return state;
}
const BASIC = ['none_of_these', 'agree_18_terms', 'cooling_only_ac', 'split_central_cool_only', 'landing_not_cooling', 'mode_wrong_or_setpoint_high'];
const STOP_PRO = ['none_of_these', 'agree_18_terms', 'cooling_only_ac', 'split_central_cool_only', 'landing_water_or_ice', 'water_at_electrical_yes'];

assert(/catalogEnabled:\s*false/.test(configText), 'catalogEnabled defaults to false');
assert(/advancedRepairsEnabled:\s*false/.test(configText) && !/advancedRepairsEnabled:\s*true/.test(configText), 'advanced repairs stay off');
assert(configText.includes("termsVersion: 'public-beta-2026-10-18.1'"), 'config terms version');
assert(configText.includes("privacyVersion: 'privacy-public-beta-2026-10-18.1'"), 'config privacy version');
assert(configText.includes("catalogConsentVersion: 'cat-consent-2026-10-18.1'"), 'config catalog consent version');
assert(enums.versions.terms === 'public-beta-2026-10-18.1', 'enum terms version');
assert(enums.versions.privacy === 'privacy-public-beta-2026-10-18.1', 'enum privacy version');
assert(enums.versions.catalog_consent === 'cat-consent-2026-10-18.1', 'enum catalog consent version');
assert(Array.isArray(enums.low_population_zip3) && enums.low_population_zip3.length === 0, 'low-population ZIP3 list stays empty until a cited Census list exists');
assert(enums.zip3_policy === 'all_000_until_cited_census_list', 'ZIP3 policy stores 000 until that list exists');
assert(serialRules.rules.length === 0 && capacityRules.rules.length === 0, 'decoder files ship empty');
assert(enums.what_fixed_it.join() === 'other,not_sure', 'follow-up has no invented part names');
assert(enums.who_did_it.join() === 'pro,me,someone_else,not_sure', 'who did it drops the site-guided option');
assert(!enums.who_did_it.includes('me_following_this_site'), 'who did it does not imply the site guided a repair');
assert(headerText.includes("img-src 'self' data: blob:"), 'nameplate preview may use a blob URL');
assert(headerText.includes('camera=()'), 'camera permission stays closed');
assert((functionText.match(/getStore\s*\(/g) || []).length === 1, 'one getStore call');
assert(functionText.includes('region: "us-east-2"') || functionText.includes("region: 'us-east-2'"), 'store region is us-east-2');
assert(/consistency:\s*['"]strong['"]/.test(functionText), 'store consistency is strong');
assert(!/context\.ip|context\.geo|latitude|longitude|postalCode/.test(functionText), 'functions do not read a network address or precise location');
assert(appText.includes("postForm('beta-session'"), 'the existing session form path remains while the catalog flag is off');
assert(!/toDataURL|FormData|FileReader/.test(appText), 'the photo helper does not encode or attach the file');
assert(!/localStorage|sessionStorage/.test(appText), 'catalog code is not written to browser storage');
assert(appText.includes('9A. Optional equipment catalog and statistics'), 'terms include section 9A');
assert(appText.includes('public-beta-2026-10-18.1'), 'terms body uses the new version');
assert(appText.includes('Privacy Officer, Second Wrench'), 'privacy names the person in charge');
assert(appText.includes('support@secondwrench.co'), 'privacy keeps the support address');
assert(appText.includes('Operated by:</strong> Second Wrench'), 'privacy names the operator');
const catalogSlice = appText.slice(appText.indexOf('const CATALOG_REGION_CODES'), appText.indexOf('function render()'));
const legalSlice = appText.slice(appText.indexOf('<h3>9A.'), appText.indexOf('<h3>10. Acceptable use')) + appText.slice(appText.indexOf('const PRIVACY_HTML'), appText.indexOf('function publicBetaNotice'));
assert(!/\bsafe\b/i.test(catalogSlice + legalSlice), 'new catalog and legal copy does not use safe as an adjective');
assert(appText.includes('id=\\"serial-save\\" class=\\"button serial-choice\\"') && appText.includes('id=\\"serial-skip\\" class=\\"button serial-choice\\"'), 'serial buttons share one class');
assert(!/id=\\"serial-skip\\"[^>]*secondary/.test(appText), 'skip is not a weaker button');
const regionCodes = catalogSlice.slice(catalogSlice.indexOf('["AL"'), catalogSlice.indexOf('];') + 1);
assert(JSON.stringify(JSON.parse(regionCodes)) === JSON.stringify(enums.region_state), 'region codes match the enum');
const landingIds = new Set();
Object.entries(F.nodes).forEach(([id, node]) => {
  if (id.includes('landing')) (node.options || []).forEach(option => landingIds.add(option.id));
});
const missingSymptoms = [...landingIds].filter(id => !enums.symptom.includes(id));
assert(missingSymptoms.length === 0, 'landing option ids missing from the symptom enum: ' + missingSymptoms.join(','));
const treeBrands = F.catalogBrandChoices().map(item => item.id);
treeBrands.forEach(id => assert(brands.brands.includes(id), 'tree brand missing from the catalog list: ' + id));
brands.brands.forEach(id => assert(id === 'other' || treeBrands.includes(id), 'catalog brand is not a tree id or other: ' + id));
assert(F.nodes['ts.intake.brand_picker'].options.some(option => option.id === 'brand_nest'), 'thermostat brand picker still has Google Nest');

const stopped = F.create();
F.stop(stopped);
assert(stopped.stopCount === 1 && stopped.node === 'ac.gate.cluster_entry', 'stop counts and returns to hazard choices');
const basic = walk(BASIC);
const shown = F.results[basic.result];
assert(shown.tier === 'Basic homeowner check' && !F.catalogHazardResult(basic), 'basic result still offers the unit step');
const payload = F.catalogPayload(basic, { appVersion: '0.1.0-beta', contentVersion: '2026-10-13.2', catalogConsentVersion: 'cat-consent-2026-10-18.1', unitStep: 'submitted', followupStatus: 'offered' });
const fact = basic.answers.map(answer => answer.fact).find(Boolean);
const label = basic.answers.map(answer => answer.label).find(Boolean);
assert(fact && label, 'the sample check has a fact and a label');
const payloadText = JSON.stringify(payload);
assert(!payloadText.includes(fact) && !payloadText.includes(label), 'payload has no label, fact, or service-note text');
assert(!payloadText.includes('HOMEOWNER SERVICE NOTE'), 'payload has no service note');
assert(payload.path.every(step => Object.keys(step).sort().join(',') === 'choice,node'), 'path keeps node and choice only');
assert(payload.symptom === 'landing_not_cooling' && payload.equipment_type === 'ac_split' && payload.lane_entered === 'ac.', 'basic mapping');
const emergency = walk(['hazard_gas_co']);
assert(F.catalogHazardResult(emergency) && F.results[emergency.result].tier === 'Emergency', 'emergency is marked to skip the unit step');
const professional = walk(STOP_PRO);
assert(F.catalogHazardResult(professional) && F.results[professional.result].tier === 'Stop / professional', 'stop / professional is marked to skip the unit step');
const stale = F.create();
F.answer(stale, 'none_of_these');
F.answer(stale, 'agree_18_terms', { agreed: true, termsVersion: 'public-beta-2026-10-15.1', privacyVersion: 'privacy-public-beta-2026-10-12.1' });
F.answer(stale, 'cooling_only_ac', META);
const before = stale.node;
assert(F.catalogReprompt(stale, { terms: 'public-beta-2026-10-18.1', privacy: 'privacy-public-beta-2026-10-18.1', catalog: 'cat-consent-2026-10-18.1' }).stale, 'a version mismatch asks for agreement again');
F.acceptReprompt(stale, { terms: 'public-beta-2026-10-18.1', privacy: 'privacy-public-beta-2026-10-18.1' });
assert(stale.node === before && stale.termsVersion === 'public-beta-2026-10-18.1' && stale.privacyVersion === 'privacy-public-beta-2026-10-18.1', 're-prompt keeps the place in the check');

function request(url, method, body, headers) {
  return new Request(url, {
    method,
    headers: Object.assign({ origin: 'http://127.0.0.1:8765' }, headers || {}),
    body: body == null ? undefined : JSON.stringify(body)
  });
}
function sampleCheck(extra) {
  const check = Object.assign({}, payload, extra || {});
  delete check.fuel;
  return check;
}

async function serverChecks() {
  const core = await import('../netlify/functions/_catalog-core.mjs');
  const now = new Date('2026-10-18T16:05:00Z');
  async function ingest(body, opts) {
    opts = opts || {};
    const store = opts.store || core.memoryStore();
    if (!opts.skipSwitch) await store.setJSON('config/catalog.json', { ingest: opts.ingest !== false });
    const response = await core.handleIngest(request('http://127.0.0.1:8765/api/catalog', 'POST', body, Object.assign({ 'content-type': 'application/json' }, opts.headers || {})), {
      store, hmacKey: opts.hmacKey === undefined ? 'test-key' : opts.hmacKey, now
    });
    return { store, status: response.status, body: await response.json() };
  }
  const closed = await ingest(sampleCheck(), { skipSwitch: true, store: core.memoryStore() });
  assert(closed.status === 503 && closed.body.error === 'catalog_off', 'missing kill switch stores nothing');
  assert(!closed.store.keys().some(key => key.startsWith('checks/')), 'missing switch writes no check');
  const off = await ingest({ bot_field: '', events: [{ name: 'page_view', route: '/', referrer: 'none' }] }, { ingest: false });
  assert(off.status === 503 && !off.store.keys().some(key => key.startsWith('counters/')), 'ingest false stores nothing');
  const unknown = await ingest({ check: Object.assign(sampleCheck(), { email: 'person@example.com' }) });
  assert(unknown.status === 400 && unknown.body.error === 'unknown_field', 'unknown check fields are rejected');
  assert(!unknown.store.keys().some(key => key.startsWith('checks/')), 'a rejected check is not stored');
  const zip = '99999';
  const scrubbed = await ingest({
    bot_field: '',
    check: Object.assign(sampleCheck(), { region_state: 'OH', zip3: zip }),
    units: [{ unit_role: 'outdoor', serial_status: 'skipped', nameplate_source: 'typed', serial_number: 'ABC123', brand: 'other', brand_other: 'Call owner@example.com or 555-123-4567' }]
  });
  assert(scrubbed.status === 200 && scrubbed.body.stored === true, 'a scrubbed unit still stores the check');
  const storedKey = scrubbed.store.keys().find(key => key.startsWith('checks/'));
  const stored = await scrubbed.store.get(storedKey, { type: 'json' });
  const storedText = JSON.stringify(stored);
  assert(stored.zip3 === '000' && !storedText.includes(zip), 'ZIP3 is stored as 000 and the typed code is not kept');
  const unitKey = scrubbed.store.keys().find(key => key.startsWith('units/'));
  const unit = await scrubbed.store.get(unitKey, { type: 'json' });
  assert(unit.scrubbed === true && !unit.brand_other && !unit.serial_number && !unit.serial_hmac, 'email and phone text is dropped and a skipped serial is not stored');
  const entered = await ingest({
    check: sampleCheck({ unit_step: 'submitted' }),
    units: [{ unit_role: 'outdoor', serial_status: 'entered', nameplate_source: 'typed', serial_number: 'ab-12/3', brand: 'brand_nest' }]
  });
  const enteredUnit = await entered.store.get(entered.store.keys().find(key => key.startsWith('units/')), { type: 'json' });
  assert(enteredUnit.serial_number === 'AB-12/3' && /^[a-f0-9]{64}$/.test(enteredUnit.serial_hmac), 'a saved serial is normalized and keyed');
  const noKey = await ingest({
    check: sampleCheck(),
    units: [{ unit_role: 'outdoor', serial_status: 'entered', nameplate_source: 'typed', serial_number: 'AB123' }]
  }, { hmacKey: '' });
  assert(noKey.status === 503 && noKey.body.error === 'not_configured' && !noKey.store.keys().some(key => key.startsWith('checks/')), 'a serial without the key stores nothing');
  const quebec = await ingest({ check: sampleCheck({ region_state: 'QC', zip3: 'H2X', unit_step: 'not_offered' }), events: [{ name: 'page_view', route: '/result', referrer: 'none' }] });
  assert(quebec.status === 200 && quebec.body.stored === false && quebec.body.reason === 'quebec', 'Quebec is not stored');
  assert(!quebec.store.keys().some(key => key.startsWith('checks/')), 'a Quebec check writes no record');
  const gpc = await ingest({ gpc: true, events: [{ name: 'page_view', route: '/', referrer: 'none' }, { name: 'check_start', entry: 'start' }] });
  assert(gpc.status === 200 && !gpc.store.keys().some(key => key.startsWith('counters/')), 'GPC writes no counters');
  const mismatch = await ingest({ check: sampleCheck({ terms_version: 'public-beta-2026-10-15.1' }) });
  assert(mismatch.status === 409, 'version mismatch stores nothing');
  const code = scrubbed.body.record_code;
  assert(code.split('-').length === 8 && code.replace(/-/g, '').length === 32, 'record code is 128 bits');
  const got = await core.handleRecord(request('http://127.0.0.1:8765/api/catalog/record', 'GET', null, { 'x-record-code': code }), { store: scrubbed.store });
  const exported = await got.json();
  assert(got.status === 200 && exported.check && !exported.check.record_code_hash && exported.units.every(item => !item.serial_hmac), 'export omits the code hash and serial hmac');
  assert(!JSON.stringify(exported).includes(zip), 'export does not contain the typed ZIP');
  const removed = await core.handleRecord(request('http://127.0.0.1:8765/api/catalog/record', 'DELETE', null, { 'x-record-code': code }), { store: scrubbed.store, now });
  assert(removed.status === 200 && (await removed.json()).deleted === true, 'delete removes the record');
  const tomb = await scrubbed.store.get('tombstones/' + stored.check_id + '.json', { type: 'json' });
  assert(tomb && tomb.check_id === stored.check_id && !JSON.stringify(tomb).includes('serial'), 'tombstone has no serial');
  const followCheck = await ingest({
    check: sampleCheck({ followup_status: 'offered', unit_step: 'not_offered' })
  });
  const followCode = followCheck.body.record_code;
  const follow = await core.handleFollowup(request('http://127.0.0.1:8765/api/catalog/followup', 'POST', {
    status_now: 'fixed',
    what_fixed_it: 'other',
    who_did_it: 'pro',
    what_fixed_other: 'call 5551234567',
    part_recommended_other: 'board'
  }, { 'content-type': 'application/json', 'x-record-code': followCode }), { store: followCheck.store, now });
  assert(follow.status === 200 && (await follow.json()).stored === true, 'follow-up stores');
  const followRow = await followCheck.store.get('followups/' + sampleCheck().check_id + '.json', { type: 'json' });
  assert(followRow && followRow.scrubbed === true && !followRow.what_fixed_other && followRow.part_recommended_other === 'board', 'a phone in follow-up text is dropped');
  const badFollow = await core.handleFollowup(request('http://127.0.0.1:8765/api/catalog/followup', 'POST', {
    status_now: 'fixed', who_did_it: 'me_following_this_site'
  }, { 'content-type': 'application/json', 'x-record-code': followCode }), { store: followCheck.store, now });
  assert(badFollow.status === 400, 'the dropped who-did-it value is rejected');
}

function boot(options) {
  const opts = options || {};
  const { JSDOM, VirtualConsole } = require('jsdom');
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(String(error && error.stack || error)));
  let config = read('assets/config.js');
  let flow = read('assets/flow.js');
  if (opts.catalog) config = config.replace('catalogEnabled: false', 'catalogEnabled: true');
  if (opts.reprompt) {
    flow = flow.replace('function catalogReprompt(state, versions) {', 'function catalogReprompt(state, versions) {\n    if (globalThis.SW_FORCE_REPROMPT) return { stale: true, catalogStale: false };');
  }
  const html = read('index.html')
    .replace(/\s*<script src="assets\/(?:config|ts-runtime|ts-lane|heating-data|heating-lanes|flow|app)\.js\?v=[^"]+" defer><\/script>/g, '')
    .replace('</body>', '<script>' + config + '</script><script>' + read('assets/ts-runtime.js') + '</script><script>' + read('assets/ts-lane.js') + '</script><script>' + read('assets/heating-data.js') + '</script><script>' + read('assets/heating-lanes.js') + '</script><script>' + flow + '</script><script>' + read('assets/app.js') + '</script></body>');
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:8765/#/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.scrollTo = () => {};
      window.__sent = [];
      const record = (url, body, method) => window.__sent.push({ url: String(url), body: body == null ? '' : String(body), method: method || '' });
      window.fetch = (url, init) => {
        record(url, init && init.body, (init && init.method) || 'GET');
        const payload = String(url).indexOf('/api/catalog/record') !== -1 ? { check: { check_id: 'x' }, units: [], followup: null } : { stored: true, record_code: 'ABCD-EF01-2345-6789-ABCD-EF01-2345-6789' };
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload) });
      };
      window.XMLHttpRequest = function XHR() {
        this.open = (method, url) => { this._method = method; this._url = url; };
        this.setRequestHeader = () => {};
        this.send = body => record(this._url, body, this._method || 'xhr');
      };
      if (!window.navigator.sendBeacon) window.navigator.sendBeacon = () => true;
      const beacon = window.navigator.sendBeacon.bind(window.navigator);
      window.navigator.sendBeacon = (url, body) => { record(url, body, 'beacon'); return beacon(url, body); };
      if (opts.gpc) Object.defineProperty(window.navigator, 'globalPrivacyControl', { configurable: true, get: () => true });
    }
  });
  return { dom, errors, window: dom.window, doc: dom.window.document };
}

async function pageChecks() {
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));
  function click(el) { el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true })); }
  async function start(page) {
    click(page.doc.querySelector('[data-action="start"]'));
    await flush();
    click(page.doc.querySelector('[data-answer="none_of_these"]'));
    await flush();
  }
  async function accept(page, catalog) {
    const agree = page.doc.getElementById('agree');
    agree.checked = true;
    agree.dispatchEvent(new page.window.Event('input', { bubbles: true }));
    if (catalog) {
      const box = page.doc.getElementById('catalog-consent');
      assert(box && box.checked === false, 'catalog box starts unchecked');
      box.checked = true;
      box.dispatchEvent(new page.window.Event('input', { bubbles: true }));
    }
    click(page.doc.querySelector('[data-answer="agree_18_terms"]'));
    await flush();
  }
  async function choose(page, ids) {
    for (const id of ids) {
      const el = page.doc.querySelector('[data-answer="' + id + '"]');
      assert(el, 'missing choice ' + id + ' on ' + (page.doc.querySelector('h1') && page.doc.querySelector('h1').textContent));
      click(el);
      await flush();
    }
  }
  const off = boot();
  await start(off);
  assert(!off.doc.getElementById('catalog-consent'), 'flag off hides the catalog box');
  await accept(off, false);
  await choose(off, BASIC.slice(2));
  assert(off.window.location.hash === '#/result', 'flag off still reaches a result');
  assert(!off.doc.getElementById('catalog-step') && !off.doc.getElementById('serial-number'), 'flag off hides the unit step');
  off.window.location.hash = '#/my-data';
  await flush();
  assert(off.doc.getElementById('main').textContent.includes('Catalog request') && !off.doc.querySelector('[data-action="download-record"]'), 'my data does not send while the flag is off');
  off.window.location.hash = '#/followup/ABCD';
  await flush();
  assert(off.doc.getElementById('main').textContent.includes('Catalog sharing is off'), 'follow-up does not send while the flag is off');
  assert(!off.window.__sent.some(item => String(item.url).indexOf('/api/catalog') !== -1), 'flag off sends nothing to the catalog');
  off.window.close();

  const on = boot({ catalog: true });
  await start(on);
  await accept(on, true);
  await choose(on, BASIC.slice(2));
  const save = on.doc.getElementById('serial-save');
  const skip = on.doc.getElementById('serial-skip');
  assert(save && skip && save.className === skip.className && save.className.indexOf('secondary') === -1, 'save and skip have equal weight');
  const marker = 'PHOTO_MARKER_9f3c';
  const file = new on.window.File([marker], marker + '.png', { type: 'image/png' });
  const input = on.doc.getElementById('nameplate-file');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new on.window.Event('change', { bubbles: true }));
  await flush();
  click(skip);
  await flush();
  const step = on.doc.getElementById('catalog-step');
  assert(step && step.getAttribute('data-serial-status') === 'skipped' && !on.doc.getElementById('serial-number'), 'skip sets skipped and removes the serial field');
  on.window.dispatchEvent(new on.window.HashChangeEvent('hashchange'));
  await flush();
  assert(!on.doc.getElementById('serial-number'), 'the serial is not asked again in the same check');
  const zip = on.doc.getElementById('catalog-zip');
  zip.value = '99999';
  zip.dispatchEvent(new on.window.Event('input', { bubbles: true }));
  assert(zip.value.length <= 3, 'ZIP input keeps at most 3 characters');
  click(on.doc.getElementById('catalog-submit'));
  await flush();
  await flush();
  const catalogSends = on.window.__sent.filter(item => String(item.url).indexOf('/api/catalog') !== -1);
  assert(catalogSends.length >= 1, 'submitting shares the check in one catalog request');
  assert(on.window.__sent.every(item => !String(item.url).includes(marker) && !String(item.body).includes(marker)), 'the nameplate photo is not in any network request');
  assert(catalogSends.every(item => !String(item.body).includes('99999')), 'the catalog request does not include more than the ZIP3');
  const stopButton = on.doc.querySelector('#catalog-step [data-action="stop"]');
  click(stopButton);
  await flush();
  assert(on.doc.querySelector('[data-answer="hazard_gas_co"]'), 'stop from the unit step reaches hazard choices');
  on.window.close();

  const hazard = boot({ catalog: true });
  click(hazard.doc.querySelector('[data-action="start"]'));
  await flush();
  click(hazard.doc.querySelector('[data-answer="hazard_gas_co"]'));
  await flush();
  assert(!hazard.doc.getElementById('serial-number') && !hazard.doc.getElementById('main').textContent.includes('Tell us about your unit'), 'emergency result has no unit step');
  hazard.window.close();

  const professionalPage = boot({ catalog: true });
  await start(professionalPage);
  await accept(professionalPage, true);
  await choose(professionalPage, STOP_PRO.slice(2));
  assert(!professionalPage.doc.getElementById('serial-number') && professionalPage.doc.getElementById('main').textContent.includes('Later, when everything'), 'stop / professional offers follow-up without the serial');
  professionalPage.window.close();

  const follow = boot({ catalog: true });
  follow.window.location.hash = '#/followup/ABCD-EF01-2345-6789-ABCD-EF01-2345-6789';
  await flush();
  click(follow.doc.querySelector('#followup-step [data-action="stop"]'));
  await flush();
  assert(follow.doc.querySelector('[data-answer="hazard_gas_co"]'), 'stop from the follow-up reaches hazard choices');
  follow.window.close();

  const gpc = boot({ catalog: true, gpc: true });
  await start(gpc);
  assert(gpc.doc.getElementById('catalog-gpc'), 'GPC explains that visit counters are off');
  const gpcBox = gpc.doc.getElementById('catalog-consent');
  assert(gpcBox && gpcBox.checked === false, 'GPC leaves the catalog box available and unchecked');
  gpc.window.close();

  const again = boot({ catalog: true, reprompt: true });
  await start(again);
  await accept(again, false);
  assert(again.doc.querySelector('h1').textContent === 'What would you like help with?', 're-prompt fixture reaches the system menu');
  again.window.SW_FORCE_REPROMPT = true;
  again.window.dispatchEvent(new again.window.HashChangeEvent('hashchange'));
  await flush();
  const locked = again.doc.querySelector('[data-answer="cooling_only_ac"]');
  assert(again.doc.getElementById('agree') && again.doc.getElementById('agree').checked === false && locked.disabled, 'version mismatch shows an unchecked terms box and blocks the next answer');
  const box = again.doc.getElementById('agree');
  box.checked = true;
  box.dispatchEvent(new again.window.Event('input', { bubbles: true }));
  click(locked);
  await flush();
  assert(again.doc.querySelector('h1').textContent !== 'What would you like help with?' && again.doc.querySelector('h1').textContent !== 'Is any of this happening right now?', 'agreeing continues from the same check');
  again.window.close();
}

serverChecks().then(pageChecks).then(() => {
  if (failed) {
    console.error(failed + ' catalog checks failed');
    process.exit(1);
  }
  console.log('catalog phase 1 checks passed');
}).catch(error => {
  console.error(error && error.stack || error);
  process.exit(1);
});
