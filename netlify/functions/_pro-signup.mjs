import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { LOGO_LIMIT } from './_logo-type.mjs';
import { inspectLogo, logoDownloadResponse, logoSummary, openLogoStore, readStoredLogo } from './_contractor-join.mjs';

export const STORE = 'contractor-applications';
export const CONSENT_TEXT_VERSION = 'pro-signup-consent-2026-10-20.1';
export const CONSENT_TEXT = 'I agree Second Wrench may show my business name, phone, hours, location and brands to homeowners once the referral network launches. This is a free pilot; nothing is charged. Second Wrench verifies licenses before listing.';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const BRANDS = ['Bosch', 'York', 'Coleman', 'Luxaire', 'Carrier', 'Bryant', 'Trane', 'American Standard', 'Lennox', 'Goodman', 'Amana', 'Rheem', 'Ruud', 'Daikin', 'Mitsubishi', 'Fujitsu', 'LG', 'Rinnai', 'Navien', 'Noritz', 'Other'];
const EQUIPMENT = {
  central_ac: 'ac',
  heat_pump: 'heat_pump',
  ductless: 'mini_split',
  furnace: 'furnace',
  manufactured_home: 'manufactured_home',
  boiler_hydronic: 'boiler',
  water_heater: 'water_heater',
  geothermal_wshp: 'wshp'
};
const FIELDS = new Set([
  'bot_field', 'business_name', 'contact_name', 'email', 'phone', 'website', 'street', 'city', 'state', 'zip',
  'service_area', 'hours', 'emergency_after_hours', 'brands', 'brand_other', 'equipment', 'license_numbers',
  'license_authority', 'insured', 'epa_608', 'brand_programs', 'notes', 'consent', 'consent_text_version', 'consent_text'
]);
const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PHONE_RE = /^[0-9+().\-\s]{7,20}$/;
const NAME_RE = /^[A-Za-z][A-Za-z .'-]{0,79}$/;
const COMPANY_RE = /^[A-Za-z0-9][A-Za-z0-9 .,'&()\-]{1,119}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
  });
}

function ipKey(key) {
  const norm = String(key || '').toLowerCase().replace(/-/g, '_');
  return norm === 'ip' || norm.endsWith('_ip') || norm.startsWith('ip_') || /user_?agent|forwarded|street_address|^address$|_address$/.test(norm);
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

function clean(value, max, multiline) {
  if (value == null) return '';
  if (typeof value !== 'string') return null;
  const text = (multiline ? value.replace(/\r/g, '') : value.replace(/[\r\n\t]+/g, ' ')).trim();
  if (text.length > max) return null;
  return text;
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

function brandTag(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function zip3s(zip, serviceArea) {
  const found = new Set();
  const text = String(zip || '') + ' ' + String(serviceArea || '');
  for (const match of text.match(/\b\d{5}\b/g) || []) found.add(match.slice(0, 3));
  for (const match of text.match(/\b\d{3}\b/g) || []) found.add(match);
  return [...found].sort();
}

function yesNo(value) {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return null;
}

export function prepareProSignup(body, now) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'invalid_json' };
  const keys = Object.keys(body);
  if (keys.some(ipKey)) return { error: 'forbidden_field' };
  if (keys.some(key => !FIELDS.has(key))) return { error: 'unknown_field' };
  if (clean(body.bot_field, 200)) return { error: 'bot' };
  const business = clean(body.business_name, 120);
  const contact = clean(body.contact_name, 80);
  const email = clean(body.email, 254);
  const phone = clean(body.phone, 20);
  const website = clean(body.website, 200);
  const street = clean(body.street, 120);
  const city = clean(body.city, 80);
  const state = clean(body.state, 2);
  const zip = clean(body.zip, 5);
  const serviceArea = clean(body.service_area, 400, true);
  const licenseNumbers = clean(body.license_numbers, 80);
  const licenseAuthority = clean(body.license_authority, 80);
  const brandPrograms = clean(body.brand_programs, 400, true);
  const notes = clean(body.notes, 1000, true);
  const brandOther = clean(body.brand_other, 80);
  if ([business, contact, email, phone, website, street, city, state, zip, serviceArea, licenseNumbers, licenseAuthority, brandPrograms, notes, brandOther].some(value => value == null)) return { error: 'invalid_field' };
  if (!COMPANY_RE.test(business) || !NAME_RE.test(contact) || !EMAIL_RE.test(email) || !PHONE_RE.test(phone)) return { error: 'invalid_field' };
  if (!/^[A-Za-z]{2}$/.test(state) || !/^\d{5}$/.test(zip)) return { error: 'invalid_field' };
  if (!licenseNumbers || licenseNumbers.length < 2) return { error: 'invalid_field' };
  if (website && (/\s/.test(website) || /javascript:/i.test(website))) return { error: 'invalid_field' };
  if (!body.hours || typeof body.hours !== 'object' || Array.isArray(body.hours)) return { error: 'invalid_field' };
  if (Object.keys(body.hours).some(day => !DAYS.includes(day))) return { error: 'invalid_field' };
  const hours = {};
  for (const day of DAYS) {
    const value = clean(body.hours[day], 40);
    if (value == null) return { error: 'invalid_field' };
    hours[day] = value;
  }
  if (body.emergency_after_hours !== 'yes' && body.emergency_after_hours !== 'no') return { error: 'invalid_field' };
  if (!Array.isArray(body.brands) || body.brands.some(brand => !BRANDS.includes(brand))) return { error: 'invalid_field' };
  if (!Array.isArray(body.equipment) || body.equipment.some(item => !Object.prototype.hasOwnProperty.call(EQUIPMENT, item))) return { error: 'invalid_field' };
  const insured = yesNo(body.insured);
  const epa = yesNo(body.epa_608);
  if (insured == null || epa == null) return { error: 'invalid_field' };
  if (body.consent !== true) return { error: 'consent_required' };
  if (body.consent_text_version !== CONSENT_TEXT_VERSION || body.consent_text !== CONSENT_TEXT) return { error: 'consent_version' };
  const stamp = (now || new Date()).toISOString();
  const applicationId = randomUUID();
  const deleteToken = randomBytes(32).toString('hex');
  const stateCode = state.toUpperCase();
  const brands = [...new Set(body.brands)];
  const equipment = [...new Set(body.equipment)];
  const tags = new Set();
  equipment.forEach(item => tags.add(EQUIPMENT[item]));
  brands.forEach(brand => {
    if (brand === 'Other') return;
    const tag = brandTag(brand);
    if (tag) tags.add(tag);
  });
  const otherTag = brands.includes('Other') ? brandTag(brandOther) : '';
  if (otherTag) tags.add(otherTag);
  const record = {
    contractor_id: applicationId,
    example: false,
    data_notice: 'Pending application. Not a listed contractor.',
    company_name: business,
    active: false,
    paused: true,
    license: {
      state: stateCode,
      authority: licenseAuthority,
      number: licenseNumbers,
      status: 'pending_verification',
      expires_on: '',
      checked_on: '',
      source_url: ''
    },
    insurance: { general_liability_expires_on: '', insured },
    brand_certs: brandPrograms ? [{ program: brandPrograms, brand: '', verified_on: '', evidence_url: '' }] : [],
    service_zip3s: zip3s(zip, serviceArea),
    equipment_tags: [...tags].sort(),
    capacity_per_week: 0,
    leads_this_week: 0,
    status: 'pending_verification',
    submitted_at: stamp,
    logo_key: null,
    consent_text_version: CONSENT_TEXT_VERSION,
    consent_text: CONSENT_TEXT,
    contact_name: contact,
    email,
    phone,
    website,
    address: { street, city, state: stateCode, zip },
    service_area: serviceArea,
    hours,
    emergency_after_hours: body.emergency_after_hours,
    brands,
    brand_other: brandOther,
    equipment,
    epa_608: epa,
    notes,
    delete_token_sha256: tokenHash(deleteToken)
  };
  return { record, deleteToken, applicationId };
}

async function listKeys(store) {
  if (typeof store.keys === 'function') return store.keys();
  const listed = await store.list();
  return ((listed && listed.blobs) || []).map(blob => blob.key);
}

function rateKey(email) {
  return 'rate/' + createHash('sha256').update(String(email).toLowerCase()).digest('hex');
}

async function rateLimit(store, email, nowMs) {
  const key = rateKey(email);
  const row = await store.get(key, { type: 'json' });
  if (row && row.reset_at > nowMs && row.count >= RATE_LIMIT) return { limited: true, key };
  const open = row && row.reset_at > nowMs;
  await store.setJSON(key, { count: open ? row.count + 1 : 1, reset_at: open ? row.reset_at : nowMs + RATE_WINDOW_MS });
  return { limited: false, key };
}

export function publicApplication(row) {
  const copy = Object.assign({}, row);
  delete copy.delete_token_sha256;
  return copy;
}

export async function listProApplications(store, logoStore) {
  const keys = await listKeys(store);
  const rows = [];
  for (const key of keys) {
    if (String(key).startsWith('rate/')) continue;
    const row = await store.get(key, { type: 'json' });
    if (row && row.status === 'pending_verification') rows.push(publicApplication(row));
  }
  rows.sort((a, b) => String(a.submitted_at).localeCompare(String(b.submitted_at)));
  if (!logoStore) return rows;
  for (const row of rows) {
    if (!row.logo_key) continue;
    const summary = await logoSummary(logoStore, row.logo_key);
    if (!summary) continue;
    summary.download = '/api/referral-admin?logo=' + row.contractor_id;
    row.logo = summary;
  }
  return rows;
}

function textField(form, key) {
  const value = form.get(key);
  if (value == null) return '';
  if (typeof value !== 'string') return null;
  return value;
}

function listField(form, key) {
  const values = form.getAll(key);
  if (values.some(value => typeof value !== 'string')) return null;
  return values;
}

async function bodyFromMultipart(form) {
  for (const key of new Set(form.keys())) {
    if (ipKey(key)) return { error: 'forbidden_field' };
    if (key !== 'logo' && !FIELDS.has(key)) return { error: 'unknown_field' };
  }
  const hoursRaw = textField(form, 'hours');
  if (typeof hoursRaw !== 'string') return { error: 'invalid_field' };
  let hours;
  try {
    hours = JSON.parse(hoursRaw);
  } catch (err) {
    return { error: 'invalid_field' };
  }
  const brands = listField(form, 'brands');
  const equipment = listField(form, 'equipment');
  if (!brands || !equipment) return { error: 'invalid_field' };
  const bot = textField(form, 'bot_field');
  if (typeof bot === 'string' && bot.trim()) return { error: 'bot' };
  const consentRaw = textField(form, 'consent');
  const body = {
    bot_field: textField(form, 'bot_field') || '',
    business_name: textField(form, 'business_name'),
    contact_name: textField(form, 'contact_name'),
    email: textField(form, 'email'),
    phone: textField(form, 'phone'),
    website: textField(form, 'website'),
    street: textField(form, 'street'),
    city: textField(form, 'city'),
    state: textField(form, 'state'),
    zip: textField(form, 'zip'),
    service_area: textField(form, 'service_area'),
    hours,
    emergency_after_hours: textField(form, 'emergency_after_hours'),
    brands,
    brand_other: textField(form, 'brand_other'),
    equipment,
    license_numbers: textField(form, 'license_numbers'),
    license_authority: textField(form, 'license_authority'),
    insured: textField(form, 'insured'),
    epa_608: textField(form, 'epa_608'),
    brand_programs: textField(form, 'brand_programs'),
    notes: textField(form, 'notes'),
    consent: consentRaw === 'true' ? true : consentRaw === 'false' ? false : consentRaw,
    consent_text_version: textField(form, 'consent_text_version'),
    consent_text: textField(form, 'consent_text')
  };
  const logo = await inspectLogo(form.get('logo'));
  if (logo.error) return { error: logo.error };
  return { body, logo };
}

async function writeLogo(logoStore, applicationId, logo, uploadedAt) {
  const body = logo.bytes.buffer.slice(logo.bytes.byteOffset, logo.bytes.byteOffset + logo.bytes.byteLength);
  await logoStore.set(applicationId, body, {
    metadata: {
      content_type: logo.sniffed.contentType,
      original_file_name: logo.original,
      size: String(logo.bytes.length),
      uploaded_at: uploadedAt
    }
  });
}

export async function downloadProLogo(applicationId, deps) {
  const extra = deps || {};
  if (!UUID_RE.test(String(applicationId || ''))) return json(404, { error: 'not_found' });
  let store = extra.applicationStore || null;
  if (!store) {
    if (Object.keys(extra).length) return json(404, { error: 'not_found' });
    store = await openProSignupStore();
  }
  const row = await store.get(applicationId, { type: 'json' });
  if (!row || row.status !== 'pending_verification' || !row.logo_key) return json(404, { error: 'not_found' });
  let logoStore = extra.logoStore || null;
  if (!logoStore) {
    if (Object.keys(extra).length) return json(404, { error: 'not_found' });
    logoStore = await openLogoStore();
  }
  const logo = await readStoredLogo(logoStore, row.logo_key);
  if (!logo) return json(404, { error: 'not_found' });
  return logoDownloadResponse(logo.bytes, logo.metadata);
}

export async function openProSignupStore() {
  const blobs = await import('@netlify/blobs');
  return blobs.getStore({ name: STORE, region: 'us-east-2', consistency: 'strong' });
}

export async function handleProSignup(request, deps) {
  const extra = deps || {};
  if (!request || (request.method !== 'POST' && request.method !== 'DELETE')) return json(405, { error: 'method' });
  if (!sameOrigin(request)) return json(403, { error: 'origin' });
  if (request.method === 'DELETE') return deleteApplication(request, extra);
  const contentType = request.headers.get('content-type') || '';
  let body;
  let logo = { bytes: null };
  if (contentType.indexOf('multipart/form-data') === 0) {
    const declared = Number(request.headers.get('content-length') || 0);
    if (declared > LOGO_LIMIT + 256 * 1024) return json(413, { error: 'logo_too_large' });
    let form;
    try {
      form = await request.formData();
    } catch (err) {
      return json(400, { error: 'invalid_form' });
    }
    const parsed = await bodyFromMultipart(form);
    if (parsed.error === 'bot') return json(200, { stored: false });
    if (parsed.error) return json(400, { error: parsed.error });
    body = parsed.body;
    logo = parsed.logo;
  } else if (contentType.indexOf('application/json') === 0) {
    try {
      body = await request.json();
    } catch (err) {
      return json(400, { error: 'invalid_json' });
    }
  } else {
    return json(415, { error: 'type' });
  }
  const prepared = prepareProSignup(body, extra.now);
  if (prepared.error === 'bot') return json(200, { stored: false });
  if (prepared.error) return json(400, { error: prepared.error });
  const store = extra.store || await openProSignupStore();
  const nowMs = (extra.now || new Date()).getTime();
  const limit = await rateLimit(store, prepared.record.email, nowMs);
  if (limit.limited) return json(429, { error: 'rate_limited' });
  let logoStore = null;
  if (logo.bytes) {
    logoStore = extra.logoStore || null;
    if (!logoStore) {
      if (Object.keys(extra).length) return json(500, { error: 'store' });
      logoStore = await openLogoStore();
    }
    prepared.record.logo_key = prepared.applicationId;
    await writeLogo(logoStore, prepared.applicationId, logo, prepared.record.submitted_at);
  }
  try {
    await store.setJSON(prepared.applicationId, prepared.record);
  } catch (err) {
    if (logo.bytes && logoStore) await logoStore.delete(prepared.applicationId);
    return json(500, { error: 'store' });
  }
  return json(200, {
    stored: true,
    pending: true,
    application_id: prepared.applicationId,
    status: 'pending_verification',
    logo_key: prepared.record.logo_key,
    delete_token: prepared.deleteToken
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
  const store = extra.store || await openProSignupStore();
  const row = await store.get(applicationId, { type: 'json' });
  if (!row) return json(404, { error: 'not_found' });
  if (!tokenMatches(row.delete_token_sha256, body.delete_token)) return json(401, { error: 'unauthorized' });
  let logoDeleted = false;
  if (row.logo_key) {
    let logoStore = extra.logoStore || null;
    if (!logoStore) {
      if (Object.keys(extra).length) return json(500, { error: 'store' });
      logoStore = await openLogoStore();
    }
    await logoStore.delete(row.logo_key);
    logoDeleted = true;
  }
  if (typeof store.delete === 'function') {
    await store.delete(applicationId);
    if (row.email) await store.delete(rateKey(row.email));
  }
  return json(200, { deleted: true, logo_deleted: logoDeleted, application_id: applicationId });
}
