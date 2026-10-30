/* First-party hit counts. No network. */
'use strict';
const fs = require('fs');
const os = require('os');
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

const appText = read('assets/app.js');
const indexText = read('index.html');
const configText = read('assets/config.js');
const redirectsText = read('_redirects');
const headersText = read('_headers');
const tomlText = read('netlify.toml');
const hitText = read('netlify/functions/hit.mjs');
const enums = JSON.parse(read('data/catalog-enums.json'));
const PRIVACY = 'privacy-public-beta-2026-10-23.1';
const PRIVACY_LINE = "We count visits and feedback by campaign tag (source, medium, campaign) as daily totals. We don't use cookies for this, and we don't collect your IP address or a device ID for it. If you send us feedback, it also includes the campaign tag, the page you landed on, and the general type of site that sent you there (for example, search or social), but not the full address of that site. If your browser sends Global Privacy Control, we don't count your visit and we leave these details off your feedback.";

assert(/catalogEnabled:\s*false/.test(configText) && !/catalogEnabled:\s*true/.test(configText), 'catalogEnabled stays false');
assert(/advancedRepairsEnabled:\s*false/.test(configText) && !/advancedRepairsEnabled:\s*true/.test(configText), 'advancedRepairsEnabled stays false');
assert(/referralEnabled:\s*false/.test(configText) && !/referralEnabled:\s*true/.test(configText), 'referralEnabled stays false');
assert(configText.includes("privacyVersion: '" + PRIVACY + "'"), 'config privacy version');
assert(configText.includes("termsVersion: 'public-beta-2026-10-20.1'"), 'terms version stays October 20');
assert(enums.versions.privacy === PRIVACY, 'enum privacy version');
assert(appText.includes(PRIVACY_LINE), 'privacy note states the campaign counts');
assert(appText.includes('>' + PRIVACY + '<'), 'privacy body version');
assert(appText.includes('Effective October 23, 2026'), 'privacy effective date');
assert(appText.includes('Not attorney-reviewed or approved'), 'privacy page is not described as attorney-reviewed');
assert(!/attorney-reviewed and approved|attorney-approved|lawyer-reviewed/i.test(appText), 'pages do not claim an attorney review');
assert(!/googletagmanager|google-analytics|facebook\.net|doubleclick|plausible|segment\.com|hotjar/i.test(indexText + '\n' + appText + '\n' + hitText), 'no third-party analytics script');
assert(headersText.includes("connect-src 'self'") && headersText.includes("script-src 'self'"), 'CSP stays same-origin');
assert(/from = "\/api\/hit"/.test(tomlText) && /to = "\/\.netlify\/functions\/hit"/.test(tomlText) && /status = 200/.test(tomlText) && /force = true/.test(tomlText), 'hit function is a forced 200 route');

const feedbackForm = indexText.slice(indexText.indexOf('id="feedback-schema"'), indexText.indexOf('id="session-schema"'));
['utm_source', 'utm_medium', 'utm_campaign', 'landing', 'referrer'].forEach(name => {
  assert(feedbackForm.includes('name="' + name + '"'), 'beta-feedback has ' + name);
});
const sessionForm = indexText.slice(indexText.indexOf('id="session-schema"'), indexText.indexOf('</body>'));
assert(!/utm_source|utm_medium|utm_campaign|name="landing"|name="referrer"/.test(sessionForm), 'beta-session keeps its own fields');
const feedbackFn = appText.slice(appText.indexOf('function feedbackData'), appText.indexOf('function feedbackText'));
['utm_source: attr.utm_source', 'utm_medium: attr.utm_medium', 'utm_campaign: attr.utm_campaign', 'landing: attr.landing', 'referrer: attr.referrer', 'attributionFields()'].forEach(part => {
  assert(feedbackFn.includes(part), 'feedback payload includes ' + part);
});
assert(appText.includes("gpcOn()) return { utm_source: '', utm_medium: '', utm_campaign: '', landing: '', referrer: '' }"), 'GPC feedback fields are empty');
assert(appText.includes("hit('visit')") && appText.includes("hit('feedback_sent')") && appText.includes("navigator.sendBeacon('/api/hit'"), 'visit and feedback counts use sendBeacon');
assert(!/localStorage/.test(appText.replace(/\/\* sw-preview-store:start \*\/[\s\S]*?\/\* sw-preview-store:end \*\//, '')), 'attribution does not use localStorage');
assert(!/x-forwarded-for|x-nf-client-connection-ip|cf-connecting-ip|user-agent|document\.cookie/i.test(hitText), 'hit function does not read an address, user agent, or cookie');

['/feedback', '/safety', '/sources', '/terms', '/privacy', '/about'].forEach(route => {
  const line = route + ' /#' + route + ' 301';
  assert(redirectsText.includes(line), line);
  assert(!redirectsText.includes(route + ' /#' + route + ' 302'), route + ' is no longer a 302');
  const row = redirectsText.split('\n').find(item => item.startsWith(route + ' '));
  assert(row && row.indexOf('?') === -1, route + ' target does not replace the query string');
});

function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start !== -1, 'client has ' + name);
  let depth = 0;
  let seen = false;
  for (let i = source.indexOf('{', start); i < source.length; i += 1) {
    if (source[i] === '{') { depth += 1; seen = true; }
    else if (source[i] === '}') {
      depth -= 1;
      if (seen && depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('unclosed ' + name);
}

function post(body, headers) {
  return new Request('http://secondwrench.test/api/hit', {
    method: 'POST',
    headers: Object.assign({ 'content-type': 'application/json' }, headers || {}),
    body: JSON.stringify(body)
  });
}

function sample(extra) {
  return Object.assign({
    name: 'visit',
    route: '/privacy',
    referrer: 'external',
    utm_source: 'x',
    utm_medium: 'post',
    utm_campaign: '20261023-am'
  }, extra || {});
}

async function main() {
  const hits = await import('../netlify/functions/hit.mjs');
  const pull = require('./pull-hits.js');
  const classifyReferrer = new Function(extractFunction(appText, 'classifyReferrer') + '\nreturn classifyReferrer;')();
  const classifyLanding = new Function(extractFunction(appText, 'classifyLanding') + '\nreturn classifyLanding;')();
  [['none', 'none'], ['same_site', 'same_site'], ['external', 'external'], ['https://news.example/post', 'none'], ['news.example', 'none'], ['search', 'none'], ['social', 'none'], ['', 'none']].forEach(pair => {
    assert(classifyReferrer(pair[0]) === pair[1], 'client referrer class for ' + JSON.stringify(pair[0]));
  });
  ['none', 'same_site', 'external'].forEach(value => assert(hits.acceptReferrer(value), 'server referrer enum includes ' + value));
  ['https://news.example/post', 'news.example', 'search', 'social', ''].forEach(value => assert(!hits.acceptReferrer(value), 'server rejects referrer ' + JSON.stringify(value)));
  assert(classifyLanding('/maintenance/?utm_source=secret#frag') === '/maintenance/', 'landing drops the query and fragment');
  assert(classifyLanding('https://news.example/path?q=1#a') === '/' && classifyLanding('//news.example/path') === '/', 'landing drops a full address');
  ['classifySource', 'classifyMedium', 'classifyCampaign'].forEach(name => {
    const client = new Function(extractFunction(appText, name) + '\nreturn ' + name + ';')();
    ['', ' ', 'X', 'Facebook', 'POST', 'youtube', 'twitter', 'story', '20261023-AM', '20261023-am', '20261399-am', 'fall-note', 'Hello', 'has spaces', 'a'.repeat(21), 'other', '20260231-pm'].forEach(value => {
      assert(client(value) === hits[name](value), name + ' matches for ' + JSON.stringify(value));
    });
  });

  const now = new Date('2026-10-23T18:00:00Z');
  const store = hits.memoryStore();
  const bad = await hits.handleHit(post(sample({ utm_source: 'Twitter' })), { store, now });
  assert(bad.status === 400 && (await store.list()).blobs.length === 0, 'a source outside the allowlist is rejected');
  const extra = await hits.handleHit(post(Object.assign(sample(), { ip: '203.0.113.9', landing: '/secret' })), { store, now });
  assert(extra.status === 400 && (await store.list()).blobs.length === 0, 'unknown fields are rejected');
  const longCampaign = await hits.handleHit(post(sample({ utm_campaign: 'a'.repeat(21) })), { store, now });
  assert(longCampaign.status === 400, 'a 21 character campaign is rejected');
  const rawReferrer = await hits.handleHit(post(sample({ referrer: 'https://news.example/post' })), { store, now });
  assert(rawReferrer.status === 400 && (await store.list()).blobs.length === 0, 'a raw referrer URL is rejected');
  const hostReferrer = await hits.handleHit(post(sample({ referrer: 'news.example' })), { store, now });
  assert(hostReferrer.status === 400 && (await store.list()).blobs.length === 0, 'a referrer hostname is rejected');
  for (const value of ['search', 'social', 'External', 'same_site/extra']) {
    const rejected = await hits.handleHit(post(sample({ referrer: value })), { store, now });
    assert(rejected.status === 400, 'referrer outside the enum is rejected: ' + value);
  }
  assert((await store.list()).blobs.length === 0, 'rejected referrers write nothing');
  const foreign = await hits.handleHit(post(sample(), { origin: 'https://evil.test' }), { store, now });
  assert(foreign.status === 403 && (await store.list()).blobs.length === 0, 'another origin is rejected');
  const typed = await hits.handleHit(post(sample(), { 'content-type': 'text/html' }), { store, now });
  assert(typed.status === 415, 'a non-json body is rejected');
  const huge = new Request('http://secondwrench.test/api/hit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"name":"' + 'x'.repeat(3000) + '"}' });
  assert((await hits.handleHit(huge, { store, now })).status === 413, 'a large body is rejected');

  const ok = await hits.handleHit(post(sample(), { 'user-agent': 'Browser/1', 'x-forwarded-for': '203.0.113.9' }), { store, now });
  assert(ok.status === 204 && (await ok.text()) === '', 'a valid hit returns 204');
  assert(!ok.headers.get('set-cookie'), 'a hit does not set a cookie');
  const key = '2026-10-23|visit|x|post|20261023-am|external';
  const saved = await store.getWithMetadata(key);
  assert(saved && saved.data.count === 1 && Object.keys(saved.data).join(',') === 'count', 'the blob is a count');
  assert(!JSON.stringify(saved).includes('203.0.113.9') && !JSON.stringify(saved).includes('Browser/1'), 'the blob has no address or user agent');
  const second = await hits.handleHit(post(sample()), { store, now });
  assert(second.status === 204 && (await store.getWithMetadata(key)).data.count === 2, 'a second hit matches the etag and increments');
  let skipped = false;
  const soft = {
    getWithMetadata: (item, opts) => store.getWithMetadata(item, opts),
    setJSON: async (item, value, opts) => {
      if (!skipped) { skipped = true; return { modified: false }; }
      return store.setJSON(item, value, opts);
    }
  };
  const third = await hits.handleHit(post(sample()), { store: soft, now });
  assert(third.status === 204 && skipped && (await store.getWithMetadata(key)).data.count === 3, 'a conditional-write miss retries');

  let conflicts = 1;
  const retry = {
    getWithMetadata: (item, opts) => store.getWithMetadata(item, opts),
    list: () => store.list(),
    setJSON: async (item, value, opts) => {
      if (conflicts) {
        conflicts -= 1;
        const err = new Error('precondition failed');
        err.status = 412;
        throw err;
      }
      return store.setJSON(item, value, opts);
    }
  };
  const again = await hits.handleHit(post(sample({ name: 'feedback_sent', utm_medium: 'reply', utm_campaign: 'fall-note' })), { store: retry, now });
  assert(again.status === 204 && conflicts === 0, 'an etag conflict retries the write');
  const feedback = await store.getWithMetadata('2026-10-23|feedback_sent|x|reply|fall-note|external');
  assert(feedback && feedback.data.count === 1, 'feedback_sent is its own counter');

  const gpc = await hits.handleHit(post(sample({ utm_source: 'reddit' }), { 'sec-gpc': '1' }), { store, now });
  assert(gpc.status === 204 && !(await store.list()).blobs.some(blob => blob.key.includes('reddit')), 'GPC does not increment');

  await hits.handleHit(post(sample({ utm_campaign: 'zzz', referrer: 'none' }), {}), { store, now: new Date('2026-10-22T03:00:00Z') });
  const denied = await hits.handleHit(new Request('http://secondwrench.test/api/hit?token=secret'), { store, exportToken: 'secret' });
  assert(denied.status === 401 && !(await denied.text()).includes('fall-note'), 'export requires the bearer token');
  const wrong = await hits.handleHit(new Request('http://secondwrench.test/api/hit', { headers: { authorization: 'Bearer nope' } }), { store, exportToken: 'secret' });
  assert(wrong.status === 401, 'a wrong token is rejected');
  const csvRes = await hits.handleHit(new Request('http://secondwrench.test/api/hit', { headers: { authorization: 'Bearer secret' } }), { store, exportToken: 'secret' });
  const csv = await csvRes.text();
  assert(csvRes.status === 200 && csvRes.headers.get('content-type').includes('text/csv'), 'export is csv');
  assert(csv === 'date,name,source,medium,campaign,referrer,count\n2026-10-22,visit,x,post,zzz,none,1\n2026-10-23,feedback_sent,x,reply,fall-note,external,1\n2026-10-23,visit,x,post,20261023-am,external,3\n', 'csv columns and sort ' + JSON.stringify(csv));
  assert(pull.normalizeHitsCsv(csv) === csv, 'pull helper accepts the export');
  const dest = path.join(os.tmpdir(), 'sw-hits-' + Date.now() + '.csv');
  const written = await pull.pullHits({
    token: 'secret',
    base: 'https://secondwrench.test',
    dest,
    fetch: async (url, init) => {
      assert(String(url) === 'https://secondwrench.test/api/hit', 'pull helper requests /api/hit');
      assert(init.headers.authorization === 'Bearer secret' && !String(url).includes('secret'), 'pull helper sends the token as a header');
      return { ok: true, status: 200, text: async () => csv };
    }
  });
  assert(written === dest && fs.readFileSync(dest, 'utf8') === csv, 'pull helper writes analytics csv');
  let missing = '';
  try { await pull.pullHits({ token: '', fetch: async () => ({ ok: true, text: async () => csv }) }); }
  catch (err) { missing = err.message; }
  assert(missing.includes('HITS_EXPORT_TOKEN'), 'pull helper requires the token env');

  await pageChecks();
  if (failed) {
    console.error(failed + ' hit checks failed');
    process.exit(1);
  }
  console.log('hit checks passed');
}

function boot(url, options) {
  const opts = options || {};
  const { JSDOM, VirtualConsole } = require('jsdom');
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(String(error && error.stack || error)));
  const scripts = ['config.js', 'ts-runtime.js', 'ts-lane.js', 'ta-wave3.js', 'heating-data.js', 'heating-lanes.js', 'flow.js', 'app.js']
    .map(file => '<script>' + read('assets/' + file) + '</script>').join('');
  const html = read('index.html')
    .replace(/\s*<script src="assets\/(?:config|ts-runtime|ts-lane|ta-wave3|heating-data|heating-lanes|flow|app)\.js\?v=[^"]+" defer><\/script>/g, '')
    .replace(/ data-netlify="true"/g, '')
    .replace('</body>', scripts + '</body>');
  const dom = new JSDOM(html, {
    url,
    referrer: opts.referrer || undefined,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.scrollTo = () => {};
      window.__beacons = [];
      window.__sent = [];
      window.navigator.sendBeacon = (target, body) => {
        window.__beacons.push({ url: String(target), body });
        return true;
      };
      window.fetch = (target, init) => {
        window.__sent.push({ url: String(target), body: init && init.body != null ? String(init.body) : '', method: (init && init.method) || 'GET' });
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
      };
      window.HTMLFormElement.prototype.reportValidity = () => true;
      if (opts.gpc) Object.defineProperty(window.navigator, 'globalPrivacyControl', { configurable: true, get: () => true });
      if (opts.storage) window.sessionStorage.setItem('sw-attr', opts.storage);
    }
  });
  return { dom, errors, window: dom.window, doc: dom.window.document };
}

async function beaconBodies(page) {
  const out = [];
  for (const item of page.window.__beacons) {
    const text = typeof item.body === 'string' ? item.body : await item.body.text();
    out.push(JSON.parse(text));
  }
  return out;
}

async function pageChecks() {
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));
  const landed = boot('http://secondwrench.test/maintenance/?utm_source=Facebook&utm_medium=VIDEO&utm_campaign=has%20spaces#coil', { referrer: 'https://news.example/post' });
  assert(landed.errors.length === 0, 'landing page starts clean ' + landed.errors[0]);
  let bodies = await beaconBodies(landed);
  assert(bodies.length === 1 && bodies[0].name === 'visit' && bodies[0].route === '/' && bodies[0].referrer === 'external', 'visit uses the route and referrer class ' + JSON.stringify(bodies));
  assert(!JSON.stringify(bodies[0]).includes('news.example'), 'the hit does not send the referrer address');
  assert(bodies[0].utm_source === 'facebook' && bodies[0].utm_medium === 'video' && bodies[0].utm_campaign === 'other', 'unknown campaign becomes other');
  const landedAttr = JSON.parse(landed.window.sessionStorage.getItem('sw-attr'));
  assert(landedAttr.landing === '/maintenance/' && landedAttr.landing.indexOf('?') === -1 && landedAttr.landing.indexOf('#') === -1, 'landing path is the pathname');
  assert(!JSON.stringify(landedAttr).includes('coil'), 'the fragment is not stored');
  assert(!JSON.stringify(bodies[0]).includes('utm_') || Object.keys(bodies[0]).sort().join(',') === 'name,referrer,route,utm_campaign,utm_medium,utm_source', 'hit body is the aggregate fields');
  const stored = landed.window.sessionStorage.getItem('sw-attr');
  landed.window.location.hash = '#/about';
  landed.window.dispatchEvent(new landed.window.HashChangeEvent('hashchange'));
  await flush();
  assert((await beaconBodies(landed)).length === 1, 'visit is sent once on load');
  landed.window.close();

  const kept = boot('http://secondwrench.test/?utm_source=x&utm_medium=post&utm_campaign=20261023-am#/about', { storage: stored });
  bodies = await beaconBodies(kept);
  assert(bodies[0].utm_source === 'facebook' && bodies[0].utm_campaign === 'other', 'a tab keeps the first campaign tags');
  kept.window.close();

  const hashQuery = boot('http://secondwrench.test/#/feedback?utm_source=reddit&utm_medium=bio&utm_campaign=20261023-pm', { referrer: 'https://news.example/thread' });
  bodies = await beaconBodies(hashQuery);
  assert(bodies.length === 1 && bodies[0].route === '/feedback' && bodies[0].utm_source === 'reddit' && bodies[0].utm_medium === 'bio' && bodies[0].utm_campaign === '20261023-pm' && bodies[0].referrer === 'external', 'hash query tags are captured ' + JSON.stringify(bodies[0]));
  const select = hashQuery.doc.querySelector('[data-feedback="outcome"]');
  select.value = 'test';
  select.dispatchEvent(new hashQuery.window.Event('input', { bubbles: true }));
  hashQuery.doc.getElementById('feedback-form').dispatchEvent(new hashQuery.window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  await flush();
  bodies = await beaconBodies(hashQuery);
  assert(bodies.length === 2 && bodies[1].name === 'feedback_sent' && bodies[1].utm_source === 'reddit', 'feedback success counts feedback_sent');
  const sent = hashQuery.window.__sent.find(item => item.method === 'POST');
  const params = new URLSearchParams(sent ? sent.body : '');
  assert(params.get('utm_source') === 'reddit' && params.get('utm_medium') === 'bio' && params.get('utm_campaign') === '20261023-pm' && params.get('landing') === '/' && params.get('referrer') === 'external', 'feedback sends the pathname and referrer class');
  assert(sent.body.indexOf('news.example') === -1, 'feedback does not send the referrer address');
  hashQuery.window.close();

  const coded = boot('http://secondwrench.test/#/followup/ABCD-SECRET?utm_source=youtube&utm_medium=video&utm_campaign=clip');
  bodies = await beaconBodies(coded);
  const codedText = JSON.stringify(bodies[0]) + coded.window.sessionStorage.getItem('sw-attr');
  assert(bodies[0].route === '/followup' && JSON.parse(coded.window.sessionStorage.getItem('sw-attr')).landing === '/' && !codedText.includes('ABCD-SECRET'), 'a follow-up code is not stored');
  coded.window.close();

  const gpc = boot('http://secondwrench.test/?utm_source=x&utm_medium=reply&utm_campaign=20261023-am#/feedback', { gpc: true, referrer: 'https://news.example/post' });
  assert((await beaconBodies(gpc)).length === 0, 'GPC sends no hit');
  assert(JSON.parse(gpc.window.sessionStorage.getItem('sw-attr')).utm_source === 'x', 'GPC can keep tags in the tab');
  const gpcSelect = gpc.doc.querySelector('[data-feedback="outcome"]');
  gpcSelect.value = 'test';
  gpcSelect.dispatchEvent(new gpc.window.Event('input', { bubbles: true }));
  gpc.doc.getElementById('feedback-form').dispatchEvent(new gpc.window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  await flush();
  assert((await beaconBodies(gpc)).length === 0, 'GPC does not count feedback_sent');
  const gpcSent = gpc.window.__sent.find(item => item.method === 'POST');
  const gpcParams = new URLSearchParams(gpcSent ? gpcSent.body : '');
  ['utm_source', 'utm_medium', 'utm_campaign', 'landing', 'referrer'].forEach(name => {
    assert(gpcParams.get(name) === '', 'GPC feedback leaves ' + name + ' empty');
  });
  assert(gpcSent.body.indexOf('20261023-am') === -1 && gpcSent.body.indexOf('news.example') === -1 && gpcSent.body.indexOf('utm_source=x') === -1, 'GPC feedback carries no campaign details');
  gpc.window.close();

  const same = boot('http://secondwrench.test/?utm_source=x&utm_medium=post&utm_campaign=clip', { referrer: 'http://secondwrench.test/answers/' });
  bodies = await beaconBodies(same);
  assert(bodies[0].referrer === 'same_site' && !JSON.stringify(bodies[0]).includes('answers'), 'a same-site referrer stays a class');
  same.window.close();
  const direct = boot('http://secondwrench.test/?utm_source=x&utm_medium=bio&utm_campaign=clip');
  bodies = await beaconBodies(direct);
  assert(bodies[0].referrer === 'none', 'a missing referrer is none');
  direct.window.close();
  const dirty = boot('http://secondwrench.test/#/feedback', {
    referrer: 'https://news.example/post',
    storage: JSON.stringify({ utm_source: 'x', utm_medium: 'post', utm_campaign: 'clip', landing: '/answers/ac/?utm_source=secret#frag' })
  });
  const dirtySelect = dirty.doc.querySelector('[data-feedback="outcome"]');
  dirtySelect.value = 'test';
  dirtySelect.dispatchEvent(new dirty.window.Event('input', { bubbles: true }));
  dirty.doc.getElementById('feedback-form').dispatchEvent(new dirty.window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  await flush();
  const dirtySent = dirty.window.__sent.find(item => item.method === 'POST');
  const dirtyParams = new URLSearchParams(dirtySent ? dirtySent.body : '');
  assert(dirtyParams.get('landing') === '/answers/ac/' && dirtySent.body.indexOf('secret') === -1 && dirtySent.body.indexOf('frag') === -1 && dirtySent.body.indexOf('news.example') === -1, 'stored landing keeps the pathname only');
  dirty.window.close();
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exit(1);
});
