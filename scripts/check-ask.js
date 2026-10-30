/* Ask Second Wrench: safety layer, flag, and the no-key 503. No network. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', msg);
  }
}

const configText = read('assets/config.js');
const appText = read('assets/app.js');
const chatText = read('assets/ask-chat.js');
const tomlText = read('netlify.toml');

assert(/aiChatEnabled:\s*false/.test(configText) && !/aiChatEnabled:\s*true/.test(configText), 'aiChatEnabled stays false');
assert(/advancedRepairsEnabled:\s*false/.test(configText) && !/advancedRepairsEnabled:\s*true/.test(configText), 'advancedRepairsEnabled stays false');
assert(/catalogEnabled:\s*false/.test(configText) && !/catalogEnabled:\s*true/.test(configText), 'catalogEnabled stays false');
assert(/referralEnabled:\s*false/.test(configText) && !/referralEnabled:\s*true/.test(configText), 'referralEnabled stays false');
assert(configText.includes("privacyVersion: 'privacy-public-beta-2026-10-23.1'"), 'privacy version unchanged');
assert(configText.includes("termsVersion: 'public-beta-2026-10-20.1'"), 'terms version unchanged');
assert(appText.includes('function askChatWanted()') && appText.includes('if (askChatWanted())'), 'chat script loads only when the flag allows it');
assert(appText.includes("C.aiChatEnabled === true") && appText.includes("C.aiChatEnabled !== 'preview'") && appText.includes('aichat=1'), 'preview param is gated');
assert(/from = "\/api\/ask"/.test(tomlText) && /to = "\/\.netlify\/functions\/ask"/.test(tomlText), 'ask function route');
assert(chatText.includes('signIn: null') && chatText.includes('voice: null'), 'sign-in and voice stay unwired');
assert(chatText.includes("photoInput: 'jpeg'"), 'photo upload is a re-encoded jpeg');
assert(!/sessionStorage|FormData|FileReader/.test(chatText), 'chat does not store a session or attach original files');
assert(chatText.includes("const PREVIEW_STORE = 'sw_preview'") && chatText.includes('localStorage.getItem(PREVIEW_STORE)') && chatText.includes('localStorage.setItem(PREVIEW_STORE, token)'), 'a blocked cookie can keep the preview token locally');
assert(chatText.includes('createImageBitmap') && chatText.includes("toDataURL('image/jpeg'"), 'photos are re-encoded so EXIF and GPS are dropped');
assert(appText.includes('sw_preview') && appText.includes('previewInvitePresent'), 'invite link can load the chat script');
assert(!/\b(safe|safely|safer|safest|unsafe)\b/i.test(chatText), 'chat UI copy avoids safe as an adjective');
assert(!/createElement\(['"]style['"]\)/.test(chatText) && !chatText.includes('ask-chat-style'), 'chat script does not inject an inline style element');
const chatCss = read('assets/styles.css');
assert(chatCss.includes('.ask-panel{position:fixed;inset:0') && chatCss.includes('height:100dvh') && chatCss.includes('z-index:1000'), 'linked stylesheet has the fixed chat sheet');
assert(chatCss.includes('ask-lock') && chatCss.includes('overflow-y:auto') && chatCss.includes('max-height:none'), 'the message list scrolls and the page scroll locks');
assert(!/\.ask-log\{[^}]*max-height:(?!none)/.test(chatCss), 'the message list has no clipping max-height');
assert(chatCss.includes('flex-wrap:wrap') && chatCss.includes('gap:8px'), 'citation chips wrap with a gap');
assert(chatCss.includes('overflow-wrap:anywhere') && chatCss.includes('box-sizing:border-box') && chatCss.includes('max-width:100vw'), 'bubbles stay inside the viewport');
assert(chatCss.includes('-webkit-appearance:none') && chatCss.includes('background-color:#b82030'), 'send control is scarlet, not the iOS default');
assert(read('scripts/build-public.js').includes("'assets/styles.css'"), 'the publish step copies the stylesheet');
assert(appText.includes('ask-chat.js?v=2026-10-20.18&r=2026-10-30.3'), 'chat script url changes when the panel changes');
assert(read('index.html').includes('styles.css?v=2026-10-20.18&r=2026-10-30.3') && read('index.html').includes('app.js?v=2026-10-20.18&r=2026-10-30.3'), 'homepage css and app urls are cache-busted');
assert(!read('index.html').includes('nav-ask') && !read('index.html').includes('>Ask Second Wrench<'), 'the ask menu item is not in the static html');
assert(chatCss.includes('.nav-more-links button.nav-ask') && chatCss.includes('color:#d1d1d7'), 'ask menu item styles live in the stylesheet');
assert(chatText.includes("className = 'nav-ask'") && chatText.includes('menu.open = false'), 'the ask menu item is created by the chat mount and closes the menu');
assert(read('_headers').includes("style-src 'self'") && read('_headers').includes('no-store'), 'inline styles stay blocked and html is not stored');

function post(body, headers) {
  return new Request('http://secondwrench.test/api/ask', {
    method: 'POST',
    headers: Object.assign({ 'content-type': 'application/json' }, headers || {}),
    body: JSON.stringify(body)
  });
}

async function main() {
  const built = require('./build-ask-index').build();
  assert(built.count > 20 && built.bytes < 2500000, 'index is compact, got ' + built.count + ' ' + built.bytes);
  const index = JSON.parse(read('netlify/functions/_ask-index.json'));
  assert(!index.chunks.some(chunk => chunk.id.indexOf('ac.adv') !== -1), 'advanced capacitor nodes stay out of the index');
  assert(index.chunks.some(chunk => chunk.href === '/answers/hot-water-rotten-egg-smell/'), 'odor answer page is indexed');
  assert(index.chunks.some(chunk => chunk.pin && chunk.kind === 'safety'), 'safety rules are pinned');
  assert(index.chunks.some(chunk => chunk.kind === 'flow' && chunk.flow === 'water_heater'), 'water-heater flow is indexed');

  const safety = await import('../netlify/functions/_ask-safety.mjs');
  const retrieveMod = await import('../netlify/functions/_ask-retrieve.mjs');
  const flags = await import('../netlify/functions/_ask-flags.mjs');
  const hits = await import('../netlify/functions/hit.mjs');
  const ask = await import('../netlify/functions/ask.mjs');

  Object.values(safety.MESSAGES).forEach(message => {
    assert(!safety.outputHasSafeAdjective(message), 'safety copy uses safe as an adjective: ' + message.slice(0, 80));
  });

  const cases = [
    ['I smell gas in the kitchen', 'emergency', 'gas_air'],
    ['The CO alarm is going off', 'emergency', 'co_alarm'],
    ['I see smoke coming from the furnace', 'emergency', 'smoke_fire'],
    ['The disconnect is sparking', 'emergency', 'sparking'],
    ['How do I add refrigerant to my AC', 'refuse', 'refrigerant'],
    ['I hooked up the gauges', 'refuse', 'refrigerant'],
    ['I connected the gauges to the ports', 'refuse', 'refrigerant'],
    ['Can I open the service ports', 'refuse', 'refrigerant'],
    ['The manifold gauges are on the unit', 'refuse', 'refrigerant'],
    ['Can I turn the gas valves', 'refuse', 'gas_valve'],
    ['Please tape the pressure switches', 'refuse', 'bypass'],
    ['I took the panel off', 'refuse', 'panel_open'],
    ['I removed the access panel', 'refuse', 'panel_open'],
    ['The panel is off', 'refuse', 'panel_open'],
    ['Here is a photo of the live board', 'refuse', 'panel_open'],
    ['Can I open the breaker panel cover and look inside', 'refuse', 'panel'],
    ['Please jumper the pressure switch so it runs', 'refuse', 'bypass'],
    ['There is a rotten egg smell only in the hot water', 'water_odor', 'hot_water_odor'],
    ['I smell rotten eggs in the air near the furnace', 'emergency', 'gas_air'],
    ["I'm not sure if the rotten egg smell is only the hot water", 'emergency', 'gas_air'],
    ['Can I pressure wash the condenser', 'refuse', 'pressure_washer'],
    ['How do I reset the furnace breaker', 'breaker', 'breaker_non_ac'],
    ['The AC breaker tripped again after I reset it', 'breaker', 'breaker_repeat'],
    ['How do I reset my central AC breaker once', 'breaker', 'breaker_guide']
  ];
  cases.forEach(([text, action, code]) => {
    const hit = safety.screenUser(text);
    assert(hit.action === action && hit.code === code, text + ' -> ' + hit.action + '/' + hit.code + ' expected ' + action + '/' + code);
    assert(!safety.outputHasSafeAdjective(hit.message), text + ' message uses safe');
  });
  assert(safety.screenUser('The furnace will not fire').action === 'allow', 'a furnace that will not fire is not a fire emergency');
  assert(safety.screenUser('The boiler pressure gauge reads low').action === 'allow', 'a pressure gauge reading is not refrigerant handling');
  assert(safety.screenUser('Here is the board', { images: true }).code === 'panel_open', 'a board photo stops before the model');
  assert(safety.screenUser('What does this nameplate say', { images: true }).action === 'allow', 'a nameplate photo is not a live board');
  const openPanel = safety.screenModel('Take the access panel off and look at the board.');
  assert(!openPanel.ok && openPanel.code === 'panel_open' && /licensed HVAC professional or electrician/.test(openPanel.message), 'panel-off instruction in model text is replaced');
  const gaugeOut = safety.screenModel('Connect the gauges to the ports.');
  assert(!gaugeOut.ok && gaugeOut.code === 'refrigerant', 'plural gauges in model text are replaced');
  const rules = retrieveMod.SYSTEM_RULES;
  ['unit age', 'service history', 'leaks or recharges', 'brazing', 'past failures', 'when the symptom started', 'display code', 'critical-charge'].forEach(phrase => {
    assert(rules.includes(phrase), 'system prompt includes ' + phrase);
  });
  assert(/inverter/i.test(rules) && /Say what you can see/.test(rules), 'prompt asks instead of inventing a reading');
  assert(!safety.outputHasSafeAdjective(rules.replace('Do not use the words safe, safely, safer, safest, or unsafe.', '')), 'prompt does not use safe as an adjective');
  assert(safety.screenUser('There is a rotten egg smell only in the hot water').message.includes('/answers/hot-water-rotten-egg-smell/'), 'water odor points at the answer page');
  assert(safety.screenUser('There is a rotten egg smell only in the hot water').citations.some(item => item.href === '/answers/hot-water-rotten-egg-smell/'), 'water odor citation');
  assert(/leave the house now/i.test(safety.screenUser('I smell gas in the kitchen').message), 'gas stop says to leave');
  assert(/911/.test(safety.screenUser('I smell gas in the kitchen').message) && /gas utility/i.test(safety.screenUser('I smell gas in the kitchen').message), 'gas stop names 911 and the gas utility');

  const softened = safety.screenModel('This repair is safe to try.');
  assert(softened.ok && !safety.outputHasSafeAdjective(softened.message) && /safety/.test(safety.screenModel('This is a safety stop.').message), 'safe is removed and safety stays');
  const reviewed = safety.screenModel('A licensed HVAC professional and an attorney reviewed this answer.');
  assert(/not a review by a licensed HVAC professional or an attorney/i.test(reviewed.message), 'review claim is replaced');
  const relight = safety.screenModel('You can relight the pilot by holding the button.');
  assert(!relight.ok && relight.code === 'gas_valve' && !/holding the button/i.test(relight.message), 'pilot relight in model text is replaced');
  const panel = safety.screenModel('Open the electrical panel and look at the wires.');
  assert(!panel.ok && panel.code === 'panel', 'panel instruction in model text is replaced');
  const bypass = safety.screenModel('Jumper the float switch so the blower keeps running.');
  assert(!bypass.ok && bypass.code === 'bypass', 'bypass instruction in model text is replaced');
  const washer = safety.screenModel('It is safe to clean it with a pressure washer.');
  assert(!washer.ok && washer.code === 'pressure_washer' && !safety.outputHasSafeAdjective(washer.message), 'pressure washer instruction is replaced');
  const kept = safety.screenModel('Never use a pressure washer on the outdoor unit. Check the filter.');
  assert(kept.ok && /pressure washer/i.test(kept.message) && /filter/i.test(kept.message), 'a prohibition can stay');

  const odor = retrieveMod.retrieve(index, 'My hot water smells like rotten eggs');
  assert(odor.known && odor.chunks.some(chunk => chunk.href === '/answers/hot-water-rotten-egg-smell/'), 'rotten-egg question retrieves the answer page');
  const cooling = retrieveMod.retrieve(index, 'My central air conditioner is not cooling');
  assert(cooling.known && cooling.chunks.some(chunk => chunk.flow === 'cooling_only_ac' || /air condition/i.test(chunk.text + chunk.title)), 'cooling question retrieves the AC guide');
  const unknown = retrieveMod.retrieve(index, 'What is the capital of France');
  assert(!unknown.known, 'an unrelated question is not treated as known');
  assert(flags.chatMode(undefined) === 'off' && flags.chatMode('preview') === 'preview' && flags.chatMode('true') === 'on', 'server flag modes');
  assert(flags.requestAllowed('off', false) === false && flags.requestAllowed('off', true) === true && flags.requestAllowed('preview', false) === false && flags.requestAllowed('on', false) === true, 'a valid token opens preview and public-on stays separate');
  assert(flags.tokenMatches('invite-one', ' invite-one, invite-two ') && flags.tokenMatches('invite-two', 'invite-one,invite-two'), 'comma-separated preview tokens');
  assert(!flags.tokenMatches('invite', 'invite-one') && !flags.tokenMatches('nope', 'invite-one') && !flags.tokenMatches('', 'invite-one'), 'invalid preview tokens do not match');

  const { JSDOM } = require('jsdom');
  const chat = require('../assets/ask-chat.js');
  assert(chat.chatVisible({ aiChatEnabled: false }, '?aichat=1') === false, 'flag off ignores the preview param');
  assert(chat.chatVisible({ aiChatEnabled: false }, '?preview=invite-one') === false, 'a token does not show the panel before the server confirms');
  assert(chat.previewCandidate('?preview=invite-one', '') === 'invite-one', 'preview link is read');
  assert(chat.previewCandidate('', 'theme=dark; sw_preview=invite-one') === 'invite-one', 'preview cookie is read');
  assert(chat.previewCandidate('', '') === '', 'no invite is empty');
  const resized = chat.fitSize(4000, 2000, 1280);
  assert(resized.width === 1280 && resized.height === 640, 'long edge is resized to 1280');
  assert(chat.fitSize(100, 80, 1280).width === 100, 'small photos are not enlarged');
  const encoded = chat.reencodeImage({ width: 4000, height: 2000, src: 'ExifGPS' }, (width, height) => ({
    width: width,
    height: height,
    getContext: () => ({ drawImage() {} }),
    toDataURL: () => 'data:image/jpeg;base64,QUJD'
  }));
  assert(encoded.mediaType === 'image/jpeg' && encoded.data === 'QUJD' && encoded.data.indexOf('Exif') === -1 && encoded.data.indexOf('GPS') === -1, 'upload bytes are the re-encoded jpeg');
  assert(chat.chatVisible({ aiChatEnabled: 'preview' }, '') === false, 'preview flag without the param stays hidden');
  assert(chat.chatVisible({ aiChatEnabled: 'preview' }, '?aichat=1') === true, 'preview flag with the param is visible');
  assert(chat.chatVisible({ aiChatEnabled: true }, '') === true, 'flag on is visible');
  const hidden = new JSDOM('<!doctype html><head></head><body></body>', { url: 'http://127.0.0.1/?aichat=1' });
  assert(chat.mount(hidden.window.document, { aiChatEnabled: false }) === null, 'flag off does not mount');
  assert(!hidden.window.document.querySelector('.ask-launch'), 'flag off adds no button');
  const shown = new JSDOM('<!doctype html><head></head><body></body>', { url: 'https://secondwrench.co/' });
  let posted = null;
  shown.window.fetch = (url, init) => {
    posted = { url: String(url), body: init && init.body };
    return Promise.resolve({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ ok: false, error: 'unconfigured', message: 'Ask Second Wrench is not available right now because the assistant is not configured. The guided check still works: /#/' })
    });
  };
  shown.window.navigator.globalPrivacyControl = true;
  chat.mount(shown.window.document, { aiChatEnabled: true });
  assert(shown.window.document.querySelector('.ask-launch'), 'flag on shows the launcher');
  assert(shown.window.document.querySelector('.ask-disclaimer').textContent === chat.disclaimer, 'disclaimer is the legal text');
  assert(shown.window.document.querySelector('input[type="file"]'), 'photo input is in the panel');
  assert(!shown.window.document.querySelector('.ask-credit'), 'public-on panel has no provider line');
  shown.window.document.querySelector('.ask-launch').click();
  shown.window.document.querySelector('#ask-input').value = 'My filter looks dirty';
  shown.window.document.querySelector('.ask-compose').dispatchEvent(new shown.window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  assert(posted && posted.url === '/api/ask' && posted.body.includes('"gpc":true'), 'the panel posts to /api/ask and forwards GPC');
  assert(shown.window.document.querySelector('.ask-log').textContent.includes('not available right now'), 'the panel shows the 503 message');

  const wide = new JSDOM('<!doctype html><html><head></head><body><footer class="site-footer"><p class="footer-fine">Independent information. 0.1.0-beta</p></footer></body></html>', { url: 'https://secondwrench.co/', pretendToBeVisual: true });
  const longUrl = 'https://secondwrench.co/answers/furnace-blowing-cold-air/this-is-a-very-long-path-that-must-wrap-inside-the-bubble';
  const ending = 'the mode should be Heat, not Cool, and the rest of this sentence stays visible.';
  wide.window.fetch = () => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      ok: true,
      message: '## What to check\n\n- Look at the thermostat.\n- Read ' + longUrl + '\n\n' + ending,
      citations: [
        { title: 'Furnace checklist', href: '/answers/furnace-maintenance-checklist/' },
        { title: 'Geothermal heat pump', href: '/answers/geothermal-heat-pump-maintenance-checklist/' },
        { title: 'Start the guided check', href: '/#/' }
      ],
      safety: null
    })
  });
  Object.defineProperty(wide.window, 'innerWidth', { configurable: true, value: 390 });
  chat.mount(wide.window.document, { aiChatEnabled: true });
  wide.window.document.querySelector('.ask-launch').click();
  wide.window.document.querySelector('#ask-input').value = 'The room is cold';
  wide.window.document.querySelector('.ask-compose').dispatchEvent(new wide.window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  const wideLog = wide.window.document.querySelector('.ask-log');
  assert(wideLog.textContent.includes(ending), 'a long answer stays whole in the message list');
  assert(wideLog.textContent.includes(longUrl), 'a long url stays inside the bubble');
  const wideChips = [...wideLog.querySelectorAll('.ask-chips a')];
  assert(wideChips.length === 3 && wideChips[0].textContent === 'Furnace checklist' && wideChips[1].textContent === 'Geothermal heat pump', 'citation chips are separate links');
  assert(wide.window.document.body.classList.contains('ask-lock'), 'an open phone sheet locks page scroll');
  assert(wide.window.document.querySelector('.footer-fine').textContent.includes('0.1.0-beta'), 'footer copy stays in the page under the sheet');
  wide.window.close();

  let fetches = 0;
  const fakeFetch = async () => {
    fetches += 1;
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Check the filter, then start the guided check at /#/.' } }] }) };
  };
  const logs = [];
  const quiet = event => logs.push(event);
  const baseEnv = { AI_CHAT_ENABLED: 'true', AI_PROVIDER: 'openai', AI_MODEL: 'example-model', AI_API_KEY: 'test-key', AI_IP_HASH_SALT: 'salt', AI_DAILY_CAP: '5', AI_RATE_PER_HOUR: '5' };

  const missing = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My filter looks dirty. What should I check?' }] }), {
    env: { AI_CHAT_ENABLED: 'true' },
    fetch: fakeFetch,
    log: quiet,
    index
  });
  const missingBody = await missing.json();
  assert(missing.status === 503 && missingBody.error === 'unconfigured' && /not available/i.test(missingBody.message) && fetches === 0, 'no key returns 503 and does not call the model');

  const off = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My filter looks dirty. What should I check?' }] }), {
    env: { AI_API_KEY: 'test-key', AI_MODEL: 'example-model' },
    fetch: fakeFetch,
    log: quiet,
    index
  });
  assert(off.status === 404 && fetches === 0, 'flag off does not call the model');

  const previewOff = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My filter looks dirty. What should I check?' }], preview: false }), {
    env: { AI_CHAT_ENABLED: 'preview', AI_API_KEY: 'test-key', AI_MODEL: 'example-model' },
    fetch: fakeFetch,
    log: quiet,
    index
  });
  assert(previewOff.status === 404 && fetches === 0, 'preview mode ignores a normal request');

  const gas = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'I smell gas in the kitchen' }] }), {
    env: baseEnv,
    fetch: fakeFetch,
    log: quiet,
    index,
    store: hits.memoryStore()
  });
  const gasBody = await gas.json();
  assert(gas.status === 200 && gasBody.safety && gasBody.safety.code === 'gas_air' && fetches === 0, 'gas smell does not call the model');
  assert(!logs.some(event => JSON.stringify(event).includes('smell gas')), 'gas text is not logged');

  const store = hits.memoryStore();
  const when = () => new Date('2026-10-29T15:00:00Z');
  const limitedEnv = Object.assign({}, baseEnv, { AI_RATE_PER_HOUR: '1', AI_DAILY_CAP: '1', AI_LOG_CONTENT: 'true' });
  const first = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My central air conditioner is not cooling' }], gpc: true }, { 'x-nf-client-connection-ip': '203.0.113.50' }), {
    env: limitedEnv,
    fetch: fakeFetch,
    log: quiet,
    index,
    store,
    now: when
  });
  const firstBody = await first.json();
  assert(first.status === 200 && firstBody.ok === true && fetches === 1, 'a grounded question calls the model once, got ' + first.status + ' ' + JSON.stringify(firstBody).slice(0, 180));
  assert(firstBody.citations.some(item => item.href && item.href.indexOf('/answers/') === 0 || item.href === '/#/'), 'response cites a guide path');
  assert(!safety.outputHasSafeAdjective(firstBody.message), 'model path output has no safe adjective');
  const listed = await store.list();
  const keys = listed.blobs.map(blob => blob.key).join(' ');
  assert(keys && keys.indexOf('203.0.113.50') === -1 && keys.indexOf('d:2026-10-29') !== -1, 'rate keys store a hash, not the IP: ' + keys);
  const second = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My central air conditioner is not cooling' }] }, { 'x-nf-client-connection-ip': '203.0.113.50' }), {
    env: limitedEnv,
    fetch: fakeFetch,
    log: quiet,
    index,
    store,
    now: when
  });
  assert(second.status === 429 && fetches === 1, 'daily cap blocks the next model call');
  assert(!logs.some(event => event.gpc === true && event.content), 'GPC drops chat content even when content logging is on');
  assert(ask.capsFor({}).dailyCap === 200 && ask.capsFor({}).visitorCap === 40 && ask.capsFor({}).hourCap === 20, 'caps default to 200 a day, 40 a visitor, and 20 an hour');

  const limits = await import('../netlify/functions/_ask-limits.mjs');
  const provider = await import('../netlify/functions/_ask-provider.mjs');
  assert(limits.hashIp('203.0.113.50', 'salt', '2026-10-28') !== limits.hashIp('203.0.113.50', 'salt', '2026-10-29'), 'the IP hash rotates each day');
  const oldHash = limits.hashIp('198.51.100.10', 'salt', '2026-10-28');
  const purgeStore = hits.memoryStore();
  await purgeStore.setJSON('h:' + oldHash + ':2026-10-28T15', { count: 4 });
  await purgeStore.setJSON('v:' + oldHash + ':2026-10-28', { count: 4 });
  await purgeStore.setJSON('d:2026-10-28', { count: 4 });
  await purgeStore.setJSON('purge:2026-10-28', { done: true });
  const purged = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My central air conditioner is not cooling' }] }, { 'x-nf-client-connection-ip': '198.51.100.10' }), {
    env: baseEnv,
    fetch: fakeFetch,
    log: quiet,
    index,
    store: purgeStore,
    now: () => new Date('2026-10-29T12:00:00Z')
  });
  assert(purged.status === 200, 'a new day still answers');
  const left = (await purgeStore.list()).blobs.map(blob => blob.key);
  assert(!left.includes('h:' + oldHash + ':2026-10-28T15'), 'yesterday hash key is deleted: ' + left.join(' '));
  assert(!left.includes('v:' + oldHash + ':2026-10-28'), 'yesterday visitor key is deleted');
  assert(!left.includes('d:2026-10-28'), 'yesterday total is deleted');
  assert(!left.includes('purge:2026-10-28'), 'yesterday purge marker is deleted');
  assert(left.includes('purge:2026-10-29') && left.some(key => key.indexOf(limits.hashIp('198.51.100.10', 'salt', '2026-10-29')) !== -1), 'today hash is kept');
  assert(!left.some(key => key.indexOf('198.51.100.10') !== -1), 'the raw IP is not stored');

  const beforeCaps = fetches;
  const visitorStore = hits.memoryStore();
  const visitorEnv = Object.assign({}, baseEnv, { AI_DAILY_CAP: '10', AI_VISITOR_DAILY_CAP: '1', AI_RATE_PER_HOUR: '10' });
  const visitorWhen = () => new Date('2026-10-29T16:00:00Z');
  const visitorOne = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My central air conditioner is not cooling' }] }, { 'x-nf-client-connection-ip': '203.0.113.7' }), {
    env: visitorEnv, fetch: fakeFetch, log: quiet, index, store: visitorStore, now: visitorWhen
  });
  const visitorAgain = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My central air conditioner is not cooling' }] }, { 'x-nf-client-connection-ip': '203.0.113.7' }), {
    env: visitorEnv, fetch: fakeFetch, log: quiet, index, store: visitorStore, now: visitorWhen
  });
  const visitorOther = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My central air conditioner is not cooling' }] }, { 'x-nf-client-connection-ip': '203.0.113.8' }), {
    env: visitorEnv, fetch: fakeFetch, log: quiet, index, store: visitorStore, now: visitorWhen
  });
  assert(visitorOne.status === 200 && visitorAgain.status === 429 && visitorOther.status === 200 && fetches === beforeCaps + 2, 'per-visitor cap blocks that visitor and leaves room for another');

  const globalStore = hits.memoryStore();
  const globalEnv = Object.assign({}, baseEnv, { AI_DAILY_CAP: '1', AI_VISITOR_DAILY_CAP: '10', AI_RATE_PER_HOUR: '10' });
  const globalOne = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My central air conditioner is not cooling' }] }, { 'x-nf-client-connection-ip': '203.0.113.1' }), {
    env: globalEnv, fetch: fakeFetch, log: quiet, index, store: globalStore, now: visitorWhen
  });
  const globalTwo = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My central air conditioner is not cooling' }] }, { 'x-nf-client-connection-ip': '203.0.113.2' }), {
    env: globalEnv, fetch: fakeFetch, log: quiet, index, store: globalStore, now: visitorWhen
  });
  assert(globalOne.status === 200 && globalTwo.status === 429, 'the daily total cap blocks the next visitor');

  const tokenEnv = { AI_PROVIDER: 'openai', AI_MODEL: 'example-model', AI_API_KEY: 'test-key', AI_IP_HASH_SALT: 'salt', PREVIEW_TOKENS: 'invite-one, invite-two', AI_DAILY_CAP: '5', AI_VISITOR_DAILY_CAP: '5', AI_RATE_PER_HOUR: '5' };
  const beforeToken = fetches;
  const tokenLogs = [];
  const tokenStore = hits.memoryStore();
  const allowed = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My central air conditioner is not cooling' }] }, { cookie: 'sw_preview=invite-one', 'x-nf-client-connection-ip': '203.0.113.20' }), {
    env: tokenEnv, fetch: fakeFetch, log: event => tokenLogs.push(event), index, store: tokenStore, now: visitorWhen
  });
  const allowedBody = await allowed.json();
  assert(allowed.status === 200 && allowedBody.ok === true && fetches === beforeToken + 1, 'a valid preview token is served while the public flag is off, got ' + allowed.status);
  const denied = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My central air conditioner is not cooling' }] }, { cookie: 'sw_preview=not-the-token' }), {
    env: tokenEnv, fetch: fakeFetch, log: event => tokenLogs.push(event), index, store: tokenStore, now: visitorWhen
  });
  assert(denied.status === 404 && fetches === beforeToken + 1, 'an invalid token stays off');
  const absent = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My central air conditioner is not cooling' }] }), {
    env: tokenEnv, fetch: fakeFetch, log: quiet, index, store: tokenStore, now: visitorWhen
  });
  assert(absent.status === 404 && fetches === beforeToken + 1, 'no token stays off');
  assert(!tokenLogs.some(event => JSON.stringify(event).includes('invite-one')), 'the preview token is not logged');
  const previewGet = await ask.handleAsk(new Request('http://secondwrench.test/api/ask', { method: 'GET', headers: { cookie: 'sw_preview=invite-two' } }), {
    env: tokenEnv, fetch: fakeFetch, log: event => tokenLogs.push(event), index
  });
  const previewGetBody = await previewGet.json();
  const setCookie = typeof previewGet.headers.getSetCookie === 'function' ? previewGet.headers.getSetCookie().join(';') : previewGet.headers.get('set-cookie');
  assert(previewGet.status === 200 && previewGetBody.preview === true && setCookie.indexOf('sw_preview=invite-two') !== -1 && fetches === beforeToken + 1, 'GET confirms a token without spending a model call');
  const headerGet = await ask.handleAsk(new Request('http://secondwrench.test/api/ask', { method: 'GET', headers: { 'x-sw-preview': 'invite-one' } }), {
    env: tokenEnv, fetch: fakeFetch, log: event => tokenLogs.push(event), index
  });
  const headerBody = await headerGet.json();
  assert(headerGet.status === 200 && headerBody.preview === true && fetches === beforeToken + 1, 'GET accepts the preview token from the header when a cookie is not stored');
  assert(!tokenLogs.some(event => JSON.stringify(event).includes('invite-one')), 'the header token is not logged');
  const previewMiss = await ask.handleAsk(new Request('http://secondwrench.test/api/ask', { method: 'GET' }), {
    env: tokenEnv, fetch: fakeFetch, log: quiet, index
  });
  assert(previewMiss.status === 405, 'GET without a token stays a normal closed endpoint');

  const panelStop = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'I took the panel off', images: [{ mediaType: 'image/jpeg', data: 'not-a-jpeg' }] }] }), {
    env: baseEnv, fetch: fakeFetch, log: quiet, index, store: hits.memoryStore()
  });
  const panelBody = await panelStop.json();
  assert(panelStop.status === 200 && panelBody.safety && panelBody.safety.code === 'panel_open' && fetches === beforeToken + 1, 'an open panel stops before the model');

  function jpegWithExif() {
    const payload = Buffer.from('Exif\0\0GPSLATITUDE');
    const len = Buffer.alloc(2);
    len.writeUInt16BE(payload.length + 2);
    return Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      Buffer.from([0xff, 0xe1]),
      len,
      payload,
      Buffer.from([0xff, 0xda, 0x00, 0x02]),
      Buffer.from('SCANDATA'),
      Buffer.from([0xff, 0xd9])
    ]).toString('base64');
  }
  const dirty = jpegWithExif();
  assert(Buffer.from(provider.stripJpegMetadata(dirty), 'base64').indexOf(Buffer.from('GPSLATITUDE')) === -1, 'server strips EXIF GPS');
  assert(Buffer.from(provider.stripJpegMetadata(dirty), 'base64').indexOf(Buffer.from('SCANDATA')) !== -1, 'server keeps the photo itself');
  let anthropicCall = null;
  const anthropicFetch = async (url, init) => {
    anthropicCall = { url: String(url), headers: init.headers, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'How old is the outdoor unit, and when did this start?' }] }) };
  };
  const antLogs = [];
  const antStore = hits.memoryStore();
  const ant = await ask.handleAsk(post({
    messages: [{ role: 'user', content: 'My central air conditioner is not cooling' }, { role: 'assistant', content: 'When did it start?' }, { role: 'user', content: 'Yesterday. What does this nameplate say?', images: [{ mediaType: 'image/jpeg', data: dirty }] }]
  }, { cookie: 'sw_preview=invite-one', 'x-nf-client-connection-ip': '203.0.113.40' }), {
    env: { ANTHROPIC_API_KEY: 'sk-ant-test', AI_IP_HASH_SALT: 'salt', PREVIEW_TOKENS: 'invite-one', AI_LOG_CONTENT: 'true' },
    fetch: anthropicFetch,
    log: event => antLogs.push(event),
    index,
    store: antStore,
    now: visitorWhen
  });
  const antBody = await ant.json();
  assert(ant.status === 200 && antBody.ok === true, 'Anthropic is the default provider, got ' + ant.status + ' ' + JSON.stringify(antBody).slice(0, 180));
  assert(anthropicCall && anthropicCall.url === 'https://api.anthropic.com/v1/messages' && anthropicCall.body.model === 'claude-opus-5-5', 'default model is claude-opus-5-5 on the Messages API');
  assert(anthropicCall.headers['x-api-key'] === 'sk-ant-test' && anthropicCall.headers['anthropic-version'] === '2023-06-01', 'Anthropic auth headers');
  assert(!Object.prototype.hasOwnProperty.call(anthropicCall.body, 'temperature') && !Object.prototype.hasOwnProperty.call(anthropicCall.body, 'top_p') && !Object.prototype.hasOwnProperty.call(anthropicCall.body, 'top_k'), 'Opus requests omit sampling parameters');
  assert(typeof anthropicCall.body.system === 'string' && anthropicCall.body.system.includes('critical-charge') && !anthropicCall.body.messages.some(message => message.role === 'system'), 'system prompt is separate and includes the inverter rule');
  assert(anthropicCall.body.messages.some(message => message.content === 'Yesterday. What does this nameplate say?' || (Array.isArray(message.content) && message.content.some(block => block.text && block.text.indexOf('nameplate') !== -1))), 'the thread is sent to the model');
  const imageBlock = anthropicCall.body.messages.flatMap(message => Array.isArray(message.content) ? message.content : []).find(block => block.type === 'image');
  assert(imageBlock && Buffer.from(imageBlock.source.data, 'base64').indexOf(Buffer.from('GPSLATITUDE')) === -1, 'GPS is not sent to the model');
  assert(!antLogs.some(event => JSON.stringify(event).includes('GPSLATITUDE') || JSON.stringify(event).includes('sk-ant-test') || JSON.stringify(event).includes('invite-one')), 'image bytes, the key, and the token are not logged');
  const echo = 'UNIQUE_PROVIDER_ECHO temperature deprecated';
  const providerLogs = [];
  const providerFail = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My central air conditioner is not cooling' }] }), {
    env: { AI_CHAT_ENABLED: 'true', ANTHROPIC_API_KEY: 'sk-ant-test', AI_IP_HASH_SALT: 'salt' },
    fetch: async () => ({ ok: false, status: 400, json: async () => ({ type: 'error', error: { message: echo } }) }),
    log: event => providerLogs.push(event),
    index,
    store: hits.memoryStore(),
    now: () => new Date('2026-10-29T18:00:00Z')
  });
  const providerBody = await providerFail.json();
  const providerLine = ask.logLine(Object.assign({ logContent: true }, providerLogs[providerLogs.length - 1]));
  assert(providerFail.status === 502 && providerBody.error === 'provider' && providerLine.providerStatus === 400, 'a provider 400 is logged as a status code');
  assert(!JSON.stringify(providerBody).includes(echo) && !JSON.stringify(providerLine).includes(echo) && !JSON.stringify(providerLogs).includes(echo), 'provider error text is not logged or returned');
  const networkLogs = [];
  const networkFail = await ask.handleAsk(post({ messages: [{ role: 'user', content: 'My central air conditioner is not cooling' }] }), {
    env: { AI_CHAT_ENABLED: 'true', ANTHROPIC_API_KEY: 'sk-ant-test', AI_IP_HASH_SALT: 'salt' },
    fetch: async () => { throw new Error('connect ECONNREFUSED ' + echo); },
    log: event => networkLogs.push(event),
    index,
    store: hits.memoryStore(),
    now: () => new Date('2026-10-29T18:05:00Z')
  });
  const networkLine = ask.logLine(Object.assign({ logContent: false }, networkLogs[networkLogs.length - 1]));
  assert((await networkFail.json()).error === 'provider' && networkLine.providerStatus === 0 && !JSON.stringify(networkLine).includes(echo) && !JSON.stringify(networkLogs).includes('ECONNREFUSED'), 'a network failure logs status 0 and not the error text');
  assert(antLogs.some(event => event.content === 'Yesterday. What does this nameplate say?'), 'text logging keeps the question only');
  const stored = await antStore.list();
  for (const blob of stored.blobs) {
    const got = await antStore.getWithMetadata(blob.key);
    assert(JSON.stringify(got && got.data).indexOf('GPSLATITUDE') === -1 && JSON.stringify(got && got.data).indexOf('SCANDATA') === -1, 'image bytes are not stored');
  }

  const previewDom = new JSDOM('<!doctype html><head></head><body></body>', { url: 'http://127.0.0.1/?preview=invite-one' });
  let previewPost = null;
  previewDom.window.fetch = (url, init) => {
    if (!init || !init.method || init.method === 'GET') return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, preview: true }) });
    previewPost = init.body;
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, message: 'How old is the outdoor unit, and when did this start?', citations: [{ title: 'Start the guided check', href: '/#/' }] }) });
  };
  previewDom.window.createImageBitmap = async () => ({ width: 3000, height: 1500, close() {} });
  previewDom.window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage() {} });
  previewDom.window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,QUJD';
  const previewPanel = await chat.mountIfPreview(previewDom.window.document, { aiChatEnabled: false });
  assert(previewPanel && previewDom.window.document.querySelector('.ask-launch'), 'a confirmed invite shows the launcher');
  assert(previewDom.window.document.cookie.indexOf('sw_preview=invite-one') !== -1, 'the invite is stored in the cookie');
  assert(previewDom.window.document.querySelector('.ask-disclaimer').textContent === chat.disclaimer, 'preview disclaimer is verbatim');
  assert(previewDom.window.document.querySelector('.ask-credit').textContent === 'Powered by Claude', 'preview shows the plain-text credit');
  assert(!previewDom.window.document.querySelector('.ask-credit img') && !previewDom.window.document.querySelector('a[href*="anthropic"]'), 'no Anthropic logo or link');
  const upload = new previewDom.window.File([Uint8Array.from([1, 2, 3])], 'nameplate.jpg', { type: 'image/jpeg' });
  const fileInput = previewDom.window.document.querySelector('input[type="file"]');
  Object.defineProperty(fileInput, 'files', { configurable: true, value: [upload] });
  fileInput.dispatchEvent(new previewDom.window.Event('change'));
  await new Promise(resolve => setTimeout(resolve, 30));
  assert(previewDom.window.document.querySelector('.ask-thumbs img'), 'a prepared photo can be attached');
  previewDom.window.document.querySelector('.ask-launch').click();
  previewDom.window.document.querySelector('#ask-input').value = 'What does this nameplate say';
  previewDom.window.document.querySelector('.ask-compose').dispatchEvent(new previewDom.window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  assert(previewPost && previewPost.includes('QUJD') && previewPost.indexOf('AQID') === -1 && previewPost.indexOf('nameplate.jpg') === -1, 'the panel uploads the re-encoded photo only');
  assert(previewDom.window.document.querySelector('.ask-log').textContent.includes('How old is the outdoor unit'), 'the panel shows the mocked answer');

  const badInvite = new JSDOM('<!doctype html><head></head><body></body>', { url: 'http://127.0.0.1/?preview=not-a-real-token' });
  badInvite.window.fetch = () => Promise.resolve({ ok: false, status: 404, json: async () => ({ ok: false, error: 'disabled' }) });
  assert(await chat.mountIfPreview(badInvite.window.document, { aiChatEnabled: false }) === null, 'an invalid invite does not mount');
  assert(!badInvite.window.document.querySelector('.ask-launch'), 'an invalid invite shows no chat');
  const publicPage = new JSDOM('<!doctype html><head></head><body></body>', { url: 'http://127.0.0.1/' });
  let publicCalled = false;
  publicPage.window.fetch = () => { publicCalled = true; return Promise.resolve({ ok: false, status: 404, json: async () => ({}) }); };
  assert(await chat.mountIfPreview(publicPage.window.document, { aiChatEnabled: false }) === null && publicCalled === false, 'the public page does not call the ask API');
  const storedInvite = new JSDOM('<!doctype html><head></head><body></body>', { url: 'http://127.0.0.1/' });
  storedInvite.window.localStorage.setItem('sw_preview', 'invite-one');
  let storedHeader = '';
  storedInvite.window.fetch = (url, init) => {
    storedHeader = init && init.headers && init.headers['x-sw-preview'];
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, preview: true }) });
  };
  const storedPanel = await chat.mountIfPreview(storedInvite.window.document, { aiChatEnabled: false });
  assert(storedPanel && storedInvite.window.document.querySelector('.ask-launch') && storedHeader === 'invite-one', 'a stored preview token still asks the server and shows the button');
  const offline = new JSDOM('<!doctype html><head></head><body></body>', { url: 'http://127.0.0.1/?preview=invite-one' });
  offline.window.fetch = () => Promise.reject(new Error('offline'));
  assert(await chat.mountIfPreview(offline.window.document, { aiChatEnabled: false }) === null, 'a failed confirm does not mount');
  assert(offline.window.location.search.indexOf('preview=invite-one') !== -1, 'a failed confirm leaves the preview link in place');
  assert(offline.window.localStorage.getItem('sw_preview') === 'invite-one', 'a failed confirm keeps the stored token');

  const menuMarkup = '<!doctype html><head></head><body><details class="nav-more" open><summary aria-label="Menu" aria-expanded="true">Menu</summary><div class="nav-more-links"><a href="#/safety">Safety</a></div></details></body>';
  const menuPreview = new JSDOM(menuMarkup, { url: 'http://127.0.0.1/?preview=invite-one' });
  menuPreview.window.fetch = () => Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, preview: true }) });
  const menuPanel = await chat.mountIfPreview(menuPreview.window.document, { aiChatEnabled: false });
  const askItem = menuPreview.window.document.querySelector('.nav-more-links .nav-ask');
  assert(menuPanel && askItem && askItem.tagName === 'BUTTON' && askItem.textContent === 'Ask Second Wrench', 'a confirmed invite adds the ask menu item');
  assert(menuPreview.window.document.querySelector('.nav-more').open === true, 'the menu is open before the ask item is used');
  askItem.click();
  assert(menuPreview.window.document.querySelector('.nav-more').open === false, 'the ask menu item closes the menu');
  assert(menuPreview.window.document.querySelector('.ask-panel').hidden === false, 'the ask menu item opens the chat sheet');
  const menuPublic = new JSDOM(menuMarkup, { url: 'http://127.0.0.1/' });
  let menuPublicCalled = false;
  menuPublic.window.fetch = () => { menuPublicCalled = true; return Promise.resolve({ ok: false, status: 404, json: async () => ({}) }); };
  assert(await chat.mountIfPreview(menuPublic.window.document, { aiChatEnabled: false }) === null && menuPublicCalled === false && !menuPublic.window.document.querySelector('.nav-ask'), 'public visitors get no ask menu item and no ask request');
  const menuBad = new JSDOM(menuMarkup, { url: 'http://127.0.0.1/?preview=not-a-real-token' });
  menuBad.window.fetch = () => Promise.resolve({ ok: false, status: 404, json: async () => ({ ok: false, error: 'disabled' }) });
  assert(await chat.mountIfPreview(menuBad.window.document, { aiChatEnabled: false }) === null && !menuBad.window.document.querySelector('.nav-ask'), 'an invalid invite adds no ask menu item');
  const menuOffline = new JSDOM(menuMarkup, { url: 'http://127.0.0.1/?preview=invite-one' });
  menuOffline.window.fetch = () => Promise.reject(new Error('offline'));
  assert(await chat.mountIfPreview(menuOffline.window.document, { aiChatEnabled: false }) === null && !menuOffline.window.document.querySelector('.nav-ask'), 'a failed confirm adds no ask menu item');

  if (failed) {
    console.error(failed + ' ask check(s) failed');
    process.exit(1);
  }
  console.log('ask checks passed');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
