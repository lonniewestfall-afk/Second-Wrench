import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { LOGO_LIMIT, sniffLogo } from './_logo-type.mjs';

export const LOGO_STORE = 'contractor-logos';
const APP_PREFIX = 'applications/';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PHONE_RE = /^[0-9+().\-\s]{7,20}$/;
const COMPANY_RE = /^[A-Za-z0-9][A-Za-z0-9 .,'&()\-]{1,119}$/;
const NAME_RE = /^[A-Za-z][A-Za-z .'-]{0,79}$/;
const ZIP_RE = /^[0-9][0-9,\s-]{1,199}$/;
const FIELDS = new Set(['bot_field', 'company_name', 'contact_name', 'email', 'phone', 'service_zips', 'equipment', 'logo']);
const EXT = { pdf: '.pdf', png: '.png', jpeg: '.jpg', webp: '.webp', gif: '.gif', heic: '.heic' };

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
  });
}

function ipKey(key) {
  const norm = String(key || '').toLowerCase().replace(/-/g, '_');
  return norm === 'ip' || norm.endsWith('_ip') || norm.startsWith('ip_') || /user_?agent|forwarded|street|^address$|_address$/.test(norm);
}

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch (err) {
    return false;
  }
}

function clean(value, max) {
  if (value == null) return '';
  const text = String(value).replace(/[\r\n\t]+/g, ' ').trim();
  if (text.length > max) return null;
  return text;
}

function originalName(name) {
  const base = String(name || '').split(/[/\\]/).pop() || '';
  const cleanName = base.replace(/[^\x20-\x7E]/g, '').replace(/["\\]/g, '').trim().slice(0, 120);
  return cleanName || 'logo';
}

function downloadName(original, kind) {
  const stem = original.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60) || 'logo';
  return stem + (EXT[kind] || '');
}

function toBytes(data) {
  if (!data) return null;
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return null;
}

function tokenHash(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

function tokenMatches(stored, token) {
  if (!stored || !token) return false;
  const left = Buffer.from(String(stored), 'hex');
  const right = Buffer.from(tokenHash(token), 'hex');
  if (!left.length || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function listKeys(store, prefix) {
  if (typeof store.keys === 'function') return store.keys().filter(key => key.startsWith(prefix));
  const keys = [];
  let cursor;
  do {
    const listed = await store.list({ prefix, cursor });
    for (const blob of (listed && listed.blobs) || []) keys.push(blob.key);
    cursor = listed && (listed.nextCursor || listed.cursor);
    if (!listed || !listed.hasMore) break;
  } while (cursor);
  return keys;
}

export function memoryLogoStore() {
  const data = new Map();
  return {
    async get(key, opts) {
      const row = data.get(key);
      if (!row) return null;
      if (opts && opts.type === 'arrayBuffer') return row.bytes.buffer.slice(row.bytes.byteOffset, row.bytes.byteOffset + row.bytes.byteLength);
      return row.bytes;
    },
    async getMetadata(key) {
      const row = data.get(key);
      return row ? { metadata: Object.assign({}, row.metadata) } : null;
    },
    async getWithMetadata(key) {
      const row = data.get(key);
      if (!row) return { data: null, metadata: {} };
      return { data: row.bytes, metadata: Object.assign({}, row.metadata) };
    },
    async set(key, value, opts) {
      const bytes = toBytes(value) || new Uint8Array();
      data.set(key, { bytes, metadata: Object.assign({}, (opts && opts.metadata) || {}) });
    },
    async delete(key) {
      data.delete(key);
    },
    keys() {
      return [...data.keys()];
    }
  };
}

export async function openLogoStore() {
  const blobs = await import('@netlify/blobs');
  return blobs.getStore({ name: LOGO_STORE, region: 'us-east-2', consistency: 'strong' });
}

export async function openApplicationStore() {
  const blobs = await import('@netlify/blobs');
  return blobs.getStore({ name: 'referrals', region: 'us-east-2', consistency: 'strong' });
}

function publicApplication(row) {
  return {
    application_id: row.application_id,
    status: 'pending',
    timestamp: row.timestamp,
    company_name: row.company_name,
    contact_name: row.contact_name,
    email: row.email,
    phone: row.phone || '',
    service_zips: row.service_zips || '',
    equipment: row.equipment || '',
    logo_key: row.logo_key || null
  };
}

async function logoMetadata(store, key) {
  if (!store || !key) return null;
  if (typeof store.getMetadata === 'function') {
    const row = await store.getMetadata(key);
    return row && row.metadata ? row.metadata : null;
  }
  const row = await store.getWithMetadata(key);
  return row && row.metadata ? row.metadata : null;
}

export async function listPendingApplications(appStore, logoStore) {
  const keys = await listKeys(appStore, APP_PREFIX);
  const rows = [];
  for (const key of keys) {
    const row = await appStore.get(key, { type: 'json' });
    if (row && row.application_id) rows.push(publicApplication(row));
  }
  rows.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  if (!logoStore) return rows;
  for (const row of rows) {
    if (!row.logo_key) continue;
    const metadata = await logoMetadata(logoStore, row.logo_key);
    if (!metadata) continue;
    row.logo = {
      content_type: metadata.content_type || '',
      original_file_name: metadata.original_file_name || '',
      size: Number(metadata.size || 0),
      uploaded_at: metadata.uploaded_at || '',
      download: '/api/referral-admin?logo=' + row.application_id
    };
  }
  return rows;
}

async function readLogo(store, key) {
  if (typeof store.getWithMetadata === 'function') {
    const row = await store.getWithMetadata(key, { type: 'arrayBuffer' });
    const bytes = toBytes(row && row.data);
    if (!bytes) return null;
    return { bytes, metadata: (row && row.metadata) || {} };
  }
  const data = await store.get(key, { type: 'arrayBuffer' });
  const bytes = toBytes(data);
  if (!bytes) return null;
  const meta = await logoMetadata(store, key);
  return { bytes, metadata: meta || {} };
}

export async function downloadContractorLogo(applicationId, deps) {
  const extra = deps || {};
  if (!UUID_RE.test(String(applicationId || ''))) return json(404, { error: 'not_found' });
  const store = extra.store;
  const row = await store.get(APP_PREFIX + applicationId + '.json', { type: 'json' });
  if (!row || row.status !== 'pending' || !row.logo_key) return json(404, { error: 'not_found' });
  const logoStore = extra.logoStore || await openLogoStore();
  const logo = await readLogo(logoStore, row.logo_key);
  if (!logo) return json(404, { error: 'not_found' });
  const kind = Object.keys(EXT).find(name => EXT[name] && logo.metadata.content_type === {
    pdf: 'application/pdf', png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic'
  }[name]);
  const filename = downloadName(logo.metadata.original_file_name || 'logo', kind || '');
  return new Response(logo.bytes, {
    status: 200,
    headers: {
      'content-type': logo.metadata.content_type || 'application/octet-stream',
      'content-disposition': 'attachment; filename="' + filename + '"',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

function fieldError(form) {
  const names = [];
  for (const key of form.keys()) {
    if (ipKey(key)) return 'forbidden_field';
    if (!FIELDS.has(key)) return 'unknown_field';
    names.push(key);
  }
  if (names.includes('bot_field') && clean(form.get('bot_field'), 200)) return 'bot';
  const company = clean(form.get('company_name'), 120);
  const contact = clean(form.get('contact_name'), 80);
  const email = clean(form.get('email'), 254);
  const phone = clean(form.get('phone'), 20);
  const zips = clean(form.get('service_zips'), 200);
  const equipment = clean(form.get('equipment'), 200);
  if (company == null || contact == null || email == null || phone == null || zips == null || equipment == null) return 'invalid_field';
  if (!COMPANY_RE.test(company) || !NAME_RE.test(contact) || !EMAIL_RE.test(email)) return 'invalid_field';
  if (phone && !PHONE_RE.test(phone)) return 'invalid_field';
  if (zips && !ZIP_RE.test(zips)) return 'invalid_field';
  return { company, contact, email, phone, zips, equipment };
}

async function logoBytes(form) {
  const logo = form.get('logo');
  if (logo == null || logo === '') return { bytes: null };
  if (typeof logo === 'string') return { error: 'logo_type' };
  if (typeof logo.arrayBuffer !== 'function') return { error: 'logo_type' };
  if (!logo.size) return { bytes: null };
  if (logo.size > LOGO_LIMIT) return { error: 'logo_too_large' };
  const bytes = new Uint8Array(await logo.arrayBuffer());
  const sniffed = sniffLogo(bytes);
  if (sniffed.error) return sniffed;
  return { bytes, sniffed, original: originalName(logo.name) };
}

export async function handleProsJoin(request, deps) {
  const extra = deps || {};
  if (!request || (request.method !== 'POST' && request.method !== 'DELETE')) return json(405, { error: 'method' });
  if (!sameOrigin(request)) return json(403, { error: 'origin' });
  if (request.method === 'DELETE') return deleteApplication(request, extra);
  const contentType = request.headers.get('content-type') || '';
  if (contentType.indexOf('multipart/form-data') !== 0) return json(415, { error: 'type' });
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > LOGO_LIMIT + 256 * 1024) return json(413, { error: 'logo_too_large' });
  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return json(400, { error: 'invalid_form' });
  }
  const fields = fieldError(form);
  if (fields === 'bot') return json(200, { stored: false });
  if (typeof fields === 'string') return json(400, { error: fields });
  const logo = await logoBytes(form);
  if (logo.error) return json(400, { error: logo.error });
  const now = (extra.now || new Date()).toISOString();
  const applicationId = randomUUID();
  const deleteToken = randomBytes(32).toString('hex');
  const record = {
    application_id: applicationId,
    status: 'pending',
    timestamp: now,
    company_name: fields.company,
    contact_name: fields.contact,
    email: fields.email,
    phone: fields.phone,
    service_zips: fields.zips,
    equipment: fields.equipment,
    logo_key: logo.bytes ? applicationId : null,
    delete_token_sha256: tokenHash(deleteToken)
  };
  const appStore = extra.store || await openApplicationStore();
  const logoStore = extra.logoStore || (logo.bytes ? await openLogoStore() : null);
  if (logo.bytes) {
    const body = logo.bytes.buffer.slice(logo.bytes.byteOffset, logo.bytes.byteOffset + logo.bytes.byteLength);
    await logoStore.set(applicationId, body, {
      metadata: {
        content_type: logo.sniffed.contentType,
        original_file_name: logo.original,
        size: String(logo.bytes.length),
        uploaded_at: now
      }
    });
  }
  try {
    await appStore.setJSON(APP_PREFIX + applicationId + '.json', record);
  } catch (err) {
    if (logo.bytes && logoStore) await logoStore.delete(applicationId);
    return json(500, { error: 'store' });
  }
  return json(200, {
    stored: true,
    pending: true,
    application_id: applicationId,
    logo_key: record.logo_key,
    delete_token: deleteToken
  });
}

async function deleteApplication(request, extra) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.indexOf('application/json') !== 0) return json(415, { error: 'type' });
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json(400, { error: 'invalid_json' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { error: 'invalid_json' });
  if (Object.keys(body).some(ipKey)) return json(400, { error: 'forbidden_field' });
  const applicationId = String(body.application_id || '');
  if (!UUID_RE.test(applicationId)) return json(404, { error: 'not_found' });
  const appStore = extra.store || await openApplicationStore();
  const row = await appStore.get(APP_PREFIX + applicationId + '.json', { type: 'json' });
  if (!row) return json(404, { error: 'not_found' });
  if (!tokenMatches(row.delete_token_sha256, body.delete_token)) return json(401, { error: 'unauthorized' });
  if (row.logo_key) {
    const logoStore = extra.logoStore || await openLogoStore();
    await logoStore.delete(row.logo_key);
  }
  if (typeof appStore.delete === 'function') await appStore.delete(APP_PREFIX + applicationId + '.json');
  else await appStore.setJSON(APP_PREFIX + applicationId + '.json', null);
  return json(200, { deleted: true, application_id: applicationId });
}
