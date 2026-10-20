import { randomUUID, timingSafeEqual } from 'node:crypto';
import copy from '../../data/referral/copy.json' with { type: 'json' };
import blockedResults from '../../data/referral/blocked-results.json' with { type: 'json' };
import { boschCodeClass, contractorError, directorySchema, equipmentTags, matchContractor } from './_referral-match.mjs';

export const referralEnabled = false;
export const consentTextVersion = copy.consentTextVersion;
export const referralCopy = copy;

const STORE = 'referrals';
const BLOCKED = new Set(blockedResults);
const LANES = new Set(['ac', 'hp', 'fn', 'ms', 'wshp', 'bl', 'wh', 'sd', 'ts']);
const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const ZIP_RE = /^\d{5}$/;
const PHONE_RE = /^[0-9+().\-\s]{7,20}$/;
const ID_RE = /^[a-z0-9_]{1,80}$/;
const MODEL_RE = /^[A-Za-z0-9 ./\-]{1,80}$/;
const NAME_RE = /^[A-Za-z][A-Za-z .'-]{0,79}$/;
const FIELDS = new Set([
  'bot_field', 'consent_text_version', 'share_with_one_contractor', 'phone_contact',
  'zip', 'name', 'email', 'phone', 'lane', 'result_id', 'brand', 'model', 'symptom',
  'fuel', 'vent_type', 'home_type', 'fn_reason', 'code'
]);
const FUELS = new Set(['', 'gas', 'propane', 'oil', 'electric', 'hydronic']);
const VENTS = new Set(['', 'pvc', 'metal', 'none', 'not_reported']);
const HOMES = new Set(['', 'site_built', 'manufactured_home', 'not_sure']);
const REASON_RE = /^[a-z0-9_]{0,80}$/;
function ipKey(key) {
  const norm = String(key || '').toLowerCase().replace(/-/g, '_');
  return norm === 'ip' || norm.endsWith('_ip') || norm.startsWith('ip_') || /user_?agent|forwarded|street|^address$|_address$/.test(norm);
}

export function memoryStore() {
  const data = new Map();
  return {
    async get(key, opts) {
      if (!data.has(key)) return null;
      const value = data.get(key);
      if (opts && opts.type === 'json') return JSON.parse(JSON.stringify(value));
      return value;
    },
    async setJSON(key, value) {
      data.set(key, JSON.parse(JSON.stringify(value)));
      return { etag: '1' };
    },
    keys() {
      return [...data.keys()];
    }
  };
}

export async function openReferralStore() {
  const blobs = await import('@netlify/blobs');
  return blobs.getStore({ name: STORE, region: 'us-east-2', consistency: 'strong' });
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function enabled(deps) {
  if (deps && Object.prototype.hasOwnProperty.call(deps, 'enabled')) return deps.enabled === true;
  return referralEnabled === true;
}

function adminKey(deps) {
  if (deps && Object.prototype.hasOwnProperty.call(deps, 'adminKey')) return deps.adminKey || '';
  return process.env.REFERRAL_ADMIN_KEY || '';
}

function authorized(request, key) {
  if (!key) return false;
  const header = request.headers.get('x-referral-admin-key') || '';
  const left = Buffer.from(String(key));
  const right = Buffer.from(String(header));
  if (!left.length || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function blockedResult(id) {
  if (BLOCKED.has(id)) return true;
  const codeClass = boschCodeClass(id);
  if (codeClass === 'safety' || codeClass === 'normal') return true;
  return /(?:^|_)(?:gas_smell|co_alarm|smoke|burning|spark|fast_exit|hazard_now)(?:_|$)|^(?:gas|fire)$/.test(String(id || ''));
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

function hasIpKey(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some(key => ipKey(key) || hasIpKey(value[key]));
}

function cleanText(value, max) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string') return null;
  const text = value.replace(/[\r\n\t]+/g, ' ').trim();
  if (text.length > max) return null;
  return text;
}

export function prepareReferral(body, now) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'invalid_json' };
  if (hasIpKey(body)) return { error: 'forbidden_field' };
  const extra = Object.keys(body).filter(key => !FIELDS.has(key));
  if (extra.length) return { error: 'unknown_field' };
  if (body.bot_field) return { error: 'bot', status: 200, stored: false };
  if (body.consent_text_version !== consentTextVersion) return { error: 'consent_version' };
  if (body.share_with_one_contractor !== true) return { error: 'consent_required' };
  if (typeof body.phone_contact !== 'boolean') return { error: 'phone_contact' };
  if (!ZIP_RE.test(body.zip || '')) return { error: 'zip' };
  if (!NAME_RE.test(body.name || '')) return { error: 'name' };
  if (!EMAIL_RE.test(body.email || '')) return { error: 'email' };
  const phone = cleanText(body.phone, 20);
  if (phone == null || (phone && !PHONE_RE.test(phone))) return { error: 'phone' };
  if (body.phone_contact === true && !phone) return { error: 'phone' };
  if (!LANES.has(body.lane)) return { error: 'lane' };
  if (!ID_RE.test(body.result_id || '') || blockedResult(body.result_id)) return { error: 'result' };
  const brand = cleanText(body.brand, 80);
  const model = cleanText(body.model, 80);
  const symptom = cleanText(body.symptom, 80);
  const code = cleanText(body.code, 80);
  if (brand == null || model == null || symptom == null || code == null) return { error: 'summary' };
  if (typeof body.fuel !== 'string' || !FUELS.has(body.fuel)) return { error: 'summary' };
  if (typeof body.vent_type !== 'string' || !VENTS.has(body.vent_type)) return { error: 'summary' };
  if (typeof body.home_type !== 'string' || !HOMES.has(body.home_type)) return { error: 'summary' };
  if (typeof body.fn_reason !== 'string' || !REASON_RE.test(body.fn_reason)) return { error: 'summary' };
  if (brand && EMAIL_RE.test(brand)) return { error: 'summary' };
  if (model && !MODEL_RE.test(model)) return { error: 'summary' };
  if (symptom && !ID_RE.test(symptom)) return { error: 'summary' };
  if (code && !MODEL_RE.test(code)) return { error: 'summary' };
  if (boschCodeClass(code) === 'safety' || boschCodeClass(body.result_id) === 'safety') return { error: 'result' };
  const timestamp = (now || new Date()).toISOString();
  const summary = {
    lane: body.lane,
    result_id: body.result_id,
    brand,
    model,
    symptom,
    fuel: body.fuel,
    vent_type: body.vent_type,
    home_type: body.home_type,
    fn_reason: body.fn_reason,
    code
  };
  const record = {
    referral_id: randomUUID(),
    timestamp,
    consent_text_version: consentTextVersion,
    fields: {
      zip: body.zip,
      name: body.name.trim(),
      email: body.email.trim(),
      phone,
      share_with_one_contractor: true,
      phone_contact: body.phone_contact
    },
    summary
  };
  if (hasIpKey(record)) return { error: 'forbidden_field' };
  return { record };
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > 8000) return { error: json(413, { error: 'too_large' }) };
  try {
    return { body: JSON.parse(text) };
  } catch (err) {
    return { error: json(400, { error: 'invalid_json' }) };
  }
}

async function listKeys(store, prefix) {
  if (typeof store.keys === 'function') return store.keys().filter(key => key.startsWith(prefix));
  const listed = await store.list({ prefix });
  return (listed.blobs || []).map(blob => blob.key);
}

export async function handleReferral(request, deps) {
  const extra = deps || {};
  if (!enabled(extra)) return json(503, { error: 'referral_off' });
  if (!request || request.method !== 'POST') return json(405, { error: 'method' });
  if (!sameOrigin(request)) return json(403, { error: 'origin' });
  const contentType = request.headers.get('content-type') || '';
  if (contentType.indexOf('application/json') !== 0) return json(415, { error: 'type' });
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const prepared = prepareReferral(parsed.body, extra.now);
  if (prepared.error === 'bot') return json(200, { stored: false });
  if (prepared.error) return json(400, { error: prepared.error });
  const store = extra.store || await openReferralStore();
  await store.setJSON('referrals/' + prepared.record.referral_id + '.json', prepared.record);
  return json(200, { stored: true, referral_id: prepared.record.referral_id });
}

export async function handleReferralAdmin(request, deps) {
  const extra = deps || {};
  if (!enabled(extra)) return json(503, { error: 'referral_off' });
  if (!request || request.method !== 'GET') return json(405, { error: 'method' });
  if (!authorized(request, adminKey(extra))) return json(401, { error: 'unauthorized' });
  const store = extra.store || await openReferralStore();
  const keys = await listKeys(store, 'referrals/');
  const referrals = [];
  for (const key of keys) {
    const row = await store.get(key, { type: 'json' });
    if (row) referrals.push(row);
  }
  referrals.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  const directory = await store.get(directorySchema.directory_key, { type: 'json' });
  const storedSchema = await store.get(directorySchema.schema_key, { type: 'json' });
  const contractors = Array.isArray(directory) ? directory : (directory && directory.contractors) || [];
  const today = (extra.now || new Date()).toISOString().slice(0, 10);
  const suggestions = referrals.map(row => {
    const match = matchContractor(contractors, {
      zip: row.fields && row.fields.zip,
      equipment_tags: equipmentTags(row.summary)
    }, { today, includeExample: false });
    return { referral_id: row.referral_id, contractor_id: match ? match.contractor_id : null };
  });
  return json(200, {
    schema: storedSchema || directorySchema,
    contractors: contractors.filter(row => !contractorError(row)),
    referrals,
    suggestions
  });
}
