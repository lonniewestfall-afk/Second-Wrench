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
assert(chatText.includes('signIn: null') && chatText.includes('photoInput: null') && chatText.includes('voice: null'), 'later inputs stay unwired');
assert(!/localStorage|sessionStorage|FormData|FileReader/.test(chatText), 'chat does not store or attach files');
assert(!/\b(safe|safely|safer|safest|unsafe)\b/i.test(chatText), 'chat UI copy avoids safe as an adjective');

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
  assert(flags.requestAllowed('off', true) === false && flags.requestAllowed('preview', true) === true && flags.requestAllowed('preview', false) === false, 'preview request gate');

  const { JSDOM } = require('jsdom');
  const chat = require('../assets/ask-chat.js');
  assert(chat.chatVisible({ aiChatEnabled: false }, '?aichat=1') === false, 'flag off ignores the preview param');
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
  assert(shown.window.document.querySelector('.ask-disclaimer').textContent.includes('not a licensed HVAC tech'), 'disclaimer matches the existing pattern');
  assert(!shown.window.document.querySelector('input[type="file"]'), 'no photo input');
  shown.window.document.querySelector('.ask-launch').click();
  shown.window.document.querySelector('#ask-input').value = 'My filter looks dirty';
  shown.window.document.querySelector('.ask-compose').dispatchEvent(new shown.window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  assert(posted && posted.url === '/api/ask' && posted.body.includes('"gpc":true'), 'the panel posts to /api/ask and forwards GPC');
  assert(shown.window.document.querySelector('.ask-log').textContent.includes('not available right now'), 'the panel shows the 503 message');

  let fetches = 0;
  const fakeFetch = async () => {
    fetches += 1;
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Check the filter, then start the guided check at /#/.' } }] }) };
  };
  const logs = [];
  const quiet = event => logs.push(event);
  const baseEnv = { AI_CHAT_ENABLED: 'true', AI_MODEL: 'example-model', AI_API_KEY: 'test-key', AI_IP_HASH_SALT: 'salt', AI_DAILY_CAP: '5', AI_RATE_PER_HOUR: '5' };

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
