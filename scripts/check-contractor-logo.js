/* Contractor logo upload. Magic bytes, size limit, no public serving. */
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
const page = read('pros/join/index.html');
const toml = read('netlify.toml');
assert(/referralEnabled:\s*false/.test(configText) && !/referralEnabled:\s*true/.test(configText), 'referral flag stays false');
assert(read('netlify/functions/_contractor-join.mjs').includes("export const LOGO_STORE = 'contractor-logos'"), 'logo store name');
assert(!/\bsafe\b/i.test(page) && !page.includes('contractor-logos') && !page.includes('/api/referral-admin'), 'join page does not publish a logo URL');
assert(toml.includes('/api/pros/join') && !toml.includes('contractor-logos'), 'join API is redirected and logos have no public route');

function png(extra) {
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), extra || Buffer.from('PNG')]);
}
function jpeg() {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
}
function gif() {
  return Buffer.from('GIF89a' + 'logo', 'latin1');
}
function webp() {
  const bytes = Buffer.alloc(16);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(8, 4);
  bytes.write('WEBP', 8);
  return bytes;
}
function pdf() {
  return Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n');
}
function heic() {
  const bytes = Buffer.alloc(32);
  bytes.writeUInt32BE(24, 0);
  bytes.write('ftyp', 4);
  bytes.write('heic', 8);
  return bytes;
}
function svg() {
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
}

const accepted = [
  ['png', png(), 'image/png', 'logo.png'],
  ['jpeg', jpeg(), 'image/jpeg', 'logo.jpg'],
  ['jpeg-ext', jpeg(), 'image/jpeg', 'photo.jpeg'],
  ['gif', gif(), 'image/gif', 'logo.gif'],
  ['webp', webp(), 'image/webp', 'logo.webp'],
  ['pdf', pdf(), 'application/pdf', 'logo.pdf'],
  ['heic', heic(), 'image/heic', 'logo.heic'],
  ['png-named-svg', png(), 'image/png', 'logo.svg']
];

function formRequest(bytes, filename, type) {
  const form = new FormData();
  form.set('company_name', 'Example HVAC');
  form.set('contact_name', 'Ada Lovelace');
  form.set('email', 'ada@example.com');
  form.set('phone', '');
  form.set('service_zips', '43215');
  form.set('equipment', 'furnace');
  if (bytes) form.set('logo', new File([bytes], filename, { type: type || 'application/octet-stream' }));
  return new Request('http://127.0.0.1:8765/api/pros/join', { method: 'POST', body: form });
}

async function main() {
  const core = await import('../netlify/functions/_referral-core.mjs');
  const join = await import('../netlify/functions/_contractor-join.mjs');
  const logoType = await import('../netlify/functions/_logo-type.mjs');
  const now = new Date('2026-10-20T18:04:00.000Z');
  for (const [label, bytes, contentType, filename] of accepted) {
    const sniffed = logoType.sniffLogo(bytes);
    assert(sniffed.contentType === contentType, label + ' magic bytes map to ' + contentType + ' got ' + sniffed.contentType);
    const store = core.memoryStore();
    const logos = join.memoryLogoStore();
    const response = await join.handleProsJoin(formRequest(bytes, filename, 'image/svg+xml'), { store, logoStore: logos, now });
    const body = await response.json();
    assert(response.status === 200 && body.stored === true && body.pending === true && body.logo_key === body.application_id, label + ' stores a pending application');
    const saved = await store.get('applications/' + body.application_id + '.json', { type: 'json' });
    assert(saved.status === 'pending' && saved.logo_key === body.application_id && !saved.ip, label + ' record stays pending with logo_key');
    const meta = await logos.getMetadata(body.logo_key);
    assert(meta && meta.metadata.content_type === contentType && meta.metadata.original_file_name === filename && meta.metadata.size === String(bytes.length) && meta.metadata.uploaded_at === now.toISOString(), label + ' logo metadata');
  }

  const store = core.memoryStore();
  const logos = join.memoryLogoStore();
  const disguised = await join.handleProsJoin(formRequest(svg(), 'photo.png', 'image/png'), { store, logoStore: logos, now });
  assert(disguised.status === 400 && (await disguised.json()).error === 'logo_type', 'SVG disguised as PNG is rejected');
  assert(store.keys().length === 0 && logos.keys().length === 0, 'a rejected logo stores nothing');
  const scripted = png(Buffer.from('<script>alert(1)</script>'));
  const scriptResponse = await join.handleProsJoin(formRequest(scripted, 'clean.png', 'image/png'), { store, logoStore: logos, now });
  assert(scriptResponse.status === 400 && (await scriptResponse.json()).error === 'logo_type', 'a PNG with a script payload is rejected');
  assert(store.keys().length === 0, 'a script payload stores nothing');

  const limit = logoType.LOGO_LIMIT;
  const exact = Buffer.alloc(limit);
  png().copy(exact);
  const exactResponse = await join.handleProsJoin(formRequest(exact, 'big.png', 'image/png'), { store, logoStore: logos, now });
  const exactBody = await exactResponse.json();
  assert(exactResponse.status === 200 && exactBody.logo_key, 'a 5 MB logo is accepted');
  const over = Buffer.alloc(limit + 1);
  png().copy(over);
  const overResponse = await join.handleProsJoin(formRequest(over, 'over.png', 'image/png'), { store, logoStore: logos, now });
  assert(overResponse.status === 400 && (await overResponse.json()).error === 'logo_too_large', 'a logo over 5 MB is rejected');

  const plain = await join.handleProsJoin(formRequest(null), { store, logoStore: logos, now });
  const plainBody = await plain.json();
  assert(plain.status === 200 && plainBody.logo_key === null && plainBody.pending === true, 'a logo is optional');

  const adminOff = await core.handleReferralAdmin(new Request('http://127.0.0.1:8765/api/referral-admin?logo=' + exactBody.application_id, { headers: { 'x-referral-admin-key': 'secret' } }), { store, logoStore: logos, adminKey: 'secret' });
  assert(adminOff.status === 503, 'logo download is off while the referral flag is off');
  const denied = await core.handleReferralAdmin(new Request('http://127.0.0.1:8765/api/referral-admin?logo=' + exactBody.application_id), { enabled: true, store, logoStore: logos, adminKey: 'secret' });
  assert(denied.status === 401, 'logo download without the admin key is rejected');
  const admin = await core.handleReferralAdmin(new Request('http://127.0.0.1:8765/api/referral-admin', { headers: { 'x-referral-admin-key': 'secret' } }), { enabled: true, store, logoStore: logos, adminKey: 'secret', now });
  const adminBody = await admin.json();
  const listed = adminBody.applications.find(row => row.application_id === exactBody.application_id);
  assert(admin.status === 200 && listed && listed.status === 'pending' && listed.logo_key === exactBody.application_id && listed.logo.content_type === 'image/png' && listed.logo.download.indexOf('/api/referral-admin?logo=') === 0, 'admin export lists the pending logo download');
  assert(!JSON.stringify(adminBody).includes(exactBody.delete_token) && !JSON.stringify(adminBody).includes('delete_token'), 'admin export does not include the delete token');
  const download = await core.handleReferralAdmin(new Request('http://127.0.0.1:8765/api/referral-admin?logo=' + exactBody.application_id, { headers: { 'x-referral-admin-key': 'secret' } }), { enabled: true, store, logoStore: logos, adminKey: 'secret' });
  const downloaded = new Uint8Array(await download.arrayBuffer());
  assert(download.status === 200 && download.headers.get('content-type') === 'image/png' && /attachment/i.test(download.headers.get('content-disposition')) && downloaded.length === exact.length && downloaded[0] === 0x89, 'admin key downloads the logo');
  const publicGet = await join.handleProsJoin(new Request('http://127.0.0.1:8765/api/pros/join?logo=' + exactBody.application_id));
  assert(publicGet.status === 405, 'the join route does not serve the logo');

  const wrong = await join.handleProsJoin(new Request('http://127.0.0.1:8765/api/pros/join', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ application_id: exactBody.application_id, delete_token: 'nope' })
  }), { store, logoStore: logos });
  assert(wrong.status === 401, 'a wrong delete token is rejected');
  const removed = await join.handleProsJoin(new Request('http://127.0.0.1:8765/api/pros/join', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ application_id: exactBody.application_id, delete_token: exactBody.delete_token })
  }), { store, logoStore: logos });
  assert(removed.status === 200 && (await removed.json()).deleted === true, 'the delete token removes the test logo');
  assert(logos.keys().indexOf(exactBody.application_id) === -1 && !await store.get('applications/' + exactBody.application_id + '.json', { type: 'json' }), 'logo and application are gone');
  const again = await core.handleReferralAdmin(new Request('http://127.0.0.1:8765/api/referral-admin?logo=' + exactBody.application_id, { headers: { 'x-referral-admin-key': 'secret' } }), { enabled: true, store, logoStore: logos, adminKey: 'secret' });
  assert(again.status === 404, 'a deleted logo is not in the admin download');

  if (failed) {
    console.error(failed + ' contractor logo check(s) failed');
    process.exit(1);
  }
  console.log('contractor logo checks passed');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
