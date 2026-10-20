/* Invite-only contractor application. Flag off. No network. */
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

const page = read('pros/join/index.html');
const index = read('index.html');
const sitemap = read('sitemap.xml');
const schema = JSON.parse(read('data/referral/contractor.schema.json'));
assert(/noindex,\s*nofollow/.test(page), 'join page is noindex and nofollow');
assert(!index.includes('/pros/join') && !sitemap.includes('/pros/join'), 'join page is not linked from home or the sitemap');
assert(!/\bsafe\b/i.test(page) && !/donnie/i.test(page), 'join page avoids safe and a personal name');
assert(page.includes('support@secondwrench.co'), 'join page uses the support address');
assert(!page.includes('checked') || !/id="consent"[^>]*checked/.test(page), 'consent box is unchecked');
assert(!/gas_combustion|hydronic_hydro_air|bosch_ids_edge|referralEnabled/.test(page), 'join page does not show internal tags');
assert(page.includes('I agree Second Wrench may show my business name, phone, hours, location and brands to homeowners once the referral network launches.'), 'consent sentence is on the page');

function valid(extra) {
  return Object.assign({
    bot_field: '',
    business_name: 'Example HVAC',
    contact_name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '614-555-0100',
    website: 'https://example.com',
    street: '10 Main St',
    city: 'Columbus',
    state: 'oh',
    zip: '43215',
    service_area: '43215, 43004, or 25 miles',
    hours: { monday: '8-5', tuesday: '8-5', wednesday: '8-5', thursday: '8-5', friday: '8-5', saturday: '', sunday: '' },
    emergency_after_hours: 'yes',
    brands: ['Bosch', 'Carrier'],
    brand_other: '',
    equipment: ['furnace', 'central_ac'],
    license_numbers: 'HV.12345',
    license_authority: 'Ohio OCILB',
    insured: 'yes',
    epa_608: 'no',
    brand_programs: 'Bosch Home Comfort PRO',
    notes: 'Pilot application',
    consent: true,
    consent_text_version: 'pro-signup-consent-2026-10-20.1',
    consent_text: 'I agree Second Wrench may show my business name, phone, hours, location and brands to homeowners once the referral network launches. This is a free pilot; nothing is charged. Second Wrench verifies licenses before listing.'
  }, extra || {});
}

function post(body) {
  return new Request('http://127.0.0.1:8765/api/pro-signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function main() {
  const core = await import('../netlify/functions/_referral-core.mjs');
  const signup = await import('../netlify/functions/_pro-signup.mjs');
  const now = new Date('2026-10-20T22:00:00.000Z');
  assert(signup.STORE === 'contractor-applications', 'application store name');
  assert(page.includes(signup.CONSENT_TEXT) && signup.CONSENT_TEXT_VERSION === 'pro-signup-consent-2026-10-20.1', 'server consent matches the page');

  const store = core.memoryStore();
  const missing = await signup.handleProSignup(post(valid({ phone: '' })), { store, now });
  assert(missing.status === 400 && (await missing.json()).error === 'invalid_field' && store.keys().length === 0, 'a missing phone is rejected');
  const noConsent = await signup.handleProSignup(post(valid({ consent: false })), { store, now });
  assert(noConsent.status === 400 && (await noConsent.json()).error === 'consent_required' && store.keys().length === 0, 'unchecked consent is rejected');
  const badText = await signup.handleProSignup(post(valid({ consent_text: 'I agree' })), { store, now });
  assert(badText.status === 400 && (await badText.json()).error === 'consent_version', 'a changed consent sentence is rejected');
  const bot = await signup.handleProSignup(post(valid({ bot_field: 'spam' })), { store, now });
  assert(bot.status === 200 && (await bot.json()).stored === false && store.keys().length === 0, 'honeypot drops the application');
  const ip = await signup.handleProSignup(post(valid({ ip: '203.0.113.9' })), { store, now });
  assert(ip.status === 400 && (await ip.json()).error === 'forbidden_field', 'an IP field is rejected');

  const saved = await signup.handleProSignup(post(valid()), { store, now });
  const savedBody = await saved.json();
  assert(saved.status === 200 && savedBody.stored === true && savedBody.status === 'pending_verification', 'a valid application stores while referrals are off');
  const row = await store.get(savedBody.application_id, { type: 'json' });
  assert(row && row.contractor_id === savedBody.application_id && !String(savedBody.application_id).includes('/'), 'the blob key is the application id');
  schema.required.forEach(key => assert(Object.prototype.hasOwnProperty.call(row, key), 'directory field ' + key));
  assert(row.status === 'pending_verification' && row.submitted_at === now.toISOString() && row.consent_text_version === signup.CONSENT_TEXT_VERSION, 'status, time, and consent version are stored');
  assert(row.active === false && row.paused === true && row.example === false, 'a pending application is not a live listing');
  assert(row.address.state === 'OH' && row.service_zip3s.includes('432') && row.service_zip3s.includes('430'), 'state and service ZIP prefixes are kept');
  assert(!JSON.stringify(row).match(/"ip"|x-forwarded-for|user_agent/), 'the record has no IP');
  assert(row.equipment_tags.includes('furnace') && row.equipment_tags.includes('bosch') && row.equipment_tags.includes('ac'), 'equipment and brands are stored for later matching');

  const off = await core.handleReferral(post(valid()), {});
  assert(off.status === 503, 'homeowner referral stays off');
  const hidden = await core.handleReferralAdmin(new Request('http://127.0.0.1:8765/api/referral-admin'), { applicationStore: store });
  assert(hidden.status === 503, 'admin without a key stays off');
  const listed = await core.handleReferralAdmin(new Request('http://127.0.0.1:8765/api/referral-admin', { headers: { 'x-referral-admin-key': 'secret' } }), { applicationStore: store, adminKey: 'secret' });
  const listedBody = await listed.json();
  assert(listed.status === 200 && listedBody.referral_enabled === false && listedBody.applications.length === 1 && listedBody.applications[0].application_id === undefined && listedBody.applications[0].contractor_id === savedBody.application_id, 'admin lists the pending application while referrals are off');
  assert(!JSON.stringify(listedBody).includes(savedBody.delete_token) && !JSON.stringify(listedBody).includes('delete_token'), 'admin export omits the delete token');

  const again = valid({ email: 'rate@example.com' });
  let last;
  for (let i = 0; i < 3; i += 1) last = await signup.handleProSignup(post(again), { store, now });
  assert(last.status === 200, 'three applications from one email are allowed');
  const limited = await signup.handleProSignup(post(again), { store, now });
  assert(limited.status === 429 && (await limited.json()).error === 'rate_limited', 'a fourth application in the hour is limited');

  const removed = await signup.handleProSignup(new Request('http://127.0.0.1:8765/api/pro-signup', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ application_id: savedBody.application_id, delete_token: savedBody.delete_token })
  }), { store });
  assert(removed.status === 200 && !await store.get(savedBody.application_id, { type: 'json' }), 'the test application can be deleted');

  if (failed) {
    console.error(failed + ' pro signup check(s) failed');
    process.exit(1);
  }
  console.log('pro signup checks passed');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
