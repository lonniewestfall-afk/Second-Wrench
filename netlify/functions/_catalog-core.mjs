import { createHash, createHmac, randomBytes } from 'node:crypto';
import enums from '../../data/catalog-enums.json' with { type: 'json' };
import brandsDoc from '../../data/catalog-brands.json' with { type: 'json' };
import serialRulesDoc from '../../data/decode/serial-rules.json' with { type: 'json' };
import capacityRulesDoc from '../../data/decode/capacity-rules.json' with { type: 'json' };

const STORE = enums.store;
const LIMITS = enums.limits;
const VERSIONS = enums.versions;
const BRANDS = new Set(brandsDoc.brands);
const REGION = new Set(enums.region_state);
const HIDDEN = new Set(enums.catalog_hidden_regions || []);
const SERIAL_RE = /^[A-Z0-9\-\/.]{1,40}$/;
const ID_RE = /^[A-Za-z0-9_.:@/-]{1,80}$/;
const CHECK_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SW_ID_RE = /^sw-[a-z0-9-]{6,48}$/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_RE = /https?:\/\/|www\./i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{8,}\d)|\b\d{10,15}\b/;
const STREET_RE = /\b(?:st|street|ave|avenue|rd|road|blvd|boulevard|ln|lane|dr|drive|ct|court|way|pkwy|parkway|hwy|highway)\b/i;
const TOP_FIELDS = new Set(['bot_field', 'gpc', 'check', 'units', 'events']);
const CHECK_FIELDS = new Set([
  'check_id', 'app_version', 'content_version', 'tree_version', 'terms_version', 'privacy_version',
  'catalog_consent_version', 'catalog_consent_at', 'mode', 'equipment_type', 'lane_entered', 'symptom',
  'path', 'end_node', 'result_tier', 'outcome_code', 'stop_count', 'rechecks', 'reset_count',
  'elapsed_seconds', 'region_state', 'zip3', 'unit_step', 'followup_status'
]);
const UNIT_FIELDS = new Set([
  'unit_role', 'brand', 'brand_other', 'model_number', 'serial_number', 'serial_status',
  'nameplate_source', 'fuel'
]);
const EVENT_FIELDS = new Set(['name', 'route', 'referrer', 'entry', 'result_id', 'tier', 'node', 'choice', 'last_node']);
const FOLLOW_FIELDS = new Set([
  'bot_field', 'status_now', 'what_fixed_it', 'who_did_it', 'what_fixed_other', 'part_recommended_other'
]);
const ROUTES = new Set([
  '/', '/check', '/result', '/feedback', '/about', '/safety', '/terms', '/privacy',
  '/disclosures', '/sources', '/my-data', '/followup'
]);
const TIER1 = new Set(enums.tier1_events);
const TIER2 = new Set(enums.tier2_events);
const REFERRER = new Set(['none', 'same_site', 'external']);

export function memoryStore() {
  const data = new Map();
  const etags = new Map();
  return {
    async get(key, opts) {
      if (!data.has(key)) return null;
      const value = data.get(key);
      if (opts && opts.type === 'json') return JSON.parse(JSON.stringify(value));
      return value;
    },
    async getWithMetadata(key) {
      if (!data.has(key)) return { data: null, etag: undefined };
      return { data: JSON.parse(JSON.stringify(data.get(key))), etag: etags.get(key) };
    },
    async setJSON(key, value, opts) {
      const current = etags.get(key);
      if (opts && opts.onlyIfMatch != null) {
        const mismatch = opts.onlyIfMatch === '*' ? data.has(key) : current !== opts.onlyIfMatch;
        if (mismatch) {
          const err = new Error('precondition failed');
          err.status = 412;
          throw err;
        }
      }
      data.set(key, JSON.parse(JSON.stringify(value)));
      const next = String((Number(current) || 0) + 1);
      etags.set(key, next);
      return { etag: next };
    },
    async delete(key) {
      data.delete(key);
      etags.delete(key);
    },
    keys() {
      return [...data.keys()];
    }
  };
}

export async function openCatalogStore() {
  const blobs = await import('@netlify/blobs');
  return blobs.getStore({ name: STORE.name, region: 'us-east-2', consistency: 'strong' });
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function fail(status, error) {
  return { ok: false, status, body: { error } };
}

function inEnum(list, value) {
  return typeof value === 'string' && list.indexOf(value) !== -1;
}

function cappedString(value, max) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > max) return null;
  return text;
}

function looksPersonal(value) {
  return EMAIL_RE.test(value) || URL_RE.test(value) || PHONE_RE.test(value) || STREET_RE.test(value);
}

function unknownKeys(obj, allowed) {
  return Object.keys(obj).filter(key => !allowed.has(key));
}

function hourStamp(value) {
  const parsed = new Date(value || Date.now());
  const when = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  when.setUTCMinutes(0, 0, 0);
  return when.toISOString().replace('.000Z', 'Z');
}

function utcDay(date) {
  return date.toISOString().slice(0, 10);
}

function validCheckId(id) {
  return typeof id === 'string' && (CHECK_ID_RE.test(id) || SW_ID_RE.test(id));
}

function normalizeSerial(value) {
  return String(value || '').toUpperCase().replace(/\s+/g, '');
}

export function recordCode() {
  const hex = randomBytes(16).toString('hex').toUpperCase();
  return { code: hex.match(/.{4}/g).join('-'), hash: createHash('sha256').update(hex).digest('hex') };
}

export function hashRecordCode(code) {
  const hex = String(code || '').toUpperCase().replace(/[^0-9A-F]/g, '');
  if (hex.length !== 32) return '';
  return createHash('sha256').update(hex).digest('hex');
}

function outcomeAtResult(code) {
  if (code === 'call_pro' || code === 'emergency_exit') return 'needs_pro';
  if (code === 'next_step') return 'fixed_pending';
  return 'unknown';
}

export function outcomeReported(status) {
  if (status === 'fixed') return 'fixed';
  if (status === 'still_broken_pro_coming' || status === 'pro_fixed' || status === 'replaced_equipment') return 'needs_pro';
  return 'unknown';
}

function ageBand(year, nowYear) {
  const age = nowYear - year;
  if (age <= 4) return '0-4';
  if (age <= 9) return '5-9';
  if (age <= 14) return '10-14';
  if (age <= 19) return '15-19';
  return '20+';
}

export function deriveManufacture(serial, brand, rules, nowYear) {
  const list = (rules && rules.rules) || [];
  const base = { mfg_decode_status: 'no_rule', age_band: 'unknown' };
  if (!serial || !list.length) return base;
  const matches = list.filter(rule => {
    if (!rule || typeof rule.applies_if !== 'string' || !rule.rule_id) return false;
    if (rule.brand && brand && rule.brand !== brand) return false;
    let re;
    try { re = new RegExp(rule.applies_if); } catch (err) { return false; }
    return re.test(serial);
  });
  if (!matches.length) return base;
  if (matches.length > 1) return { mfg_decode_status: 'ambiguous', age_band: 'unknown' };
  const rule = matches[0];
  const from = rule.year_from;
  if (!from || typeof from.start !== 'number' || typeof from.length !== 'number') {
    return { mfg_decode_status: 'ambiguous', age_band: 'unknown', mfg_decode_rule_id: String(rule.rule_id).slice(0, 32) };
  }
  const slice = serial.slice(from.start, from.start + from.length);
  let year = null;
  if (from.map && Object.prototype.hasOwnProperty.call(from.map, slice)) year = Number(from.map[slice]);
  else if (/^\d{4}$/.test(slice)) year = Number(slice);
  else if (/^\d{2}$/.test(slice) && typeof from.century === 'number') year = from.century + Number(slice);
  if (!year || year < 1950 || year > nowYear + 1) {
    return { mfg_decode_status: 'ambiguous', age_band: 'unknown', mfg_decode_rule_id: String(rule.rule_id).slice(0, 32) };
  }
  const derived = {
    mfg_year: year,
    mfg_decode_status: 'decoded',
    mfg_decode_rule_id: String(rule.rule_id).slice(0, 32),
    age_band: ageBand(year, nowYear)
  };
  const week = rule.week_or_month_from;
  if (week && typeof week.start === 'number' && typeof week.length === 'number') {
    const token = serial.slice(week.start, week.start + week.length);
    if (/^\d{1,2}$/.test(token)) derived.mfg_week_or_month = Number(token);
  }
  return derived;
}

export function deriveCapacity(model, equipmentType, rules) {
  const list = (rules && rules.rules) || [];
  if (!model || !list.length) return {};
  const cooling = equipmentType === 'ac_split' || equipmentType === 'heat_pump_air' || equipmentType === 'mini_split' || equipmentType === 'side_discharge';
  const matches = list.filter(rule => {
    if (!rule || typeof rule.applies_if !== 'string' || typeof rule.btuh !== 'number') return false;
    let re;
    try { re = new RegExp(rule.applies_if); } catch (err) { return false; }
    return re.test(model);
  });
  if (matches.length !== 1) return {};
  const btuh = matches[0].btuh;
  const out = { nominal_capacity_btuh: btuh };
  if (cooling) out.nominal_tons = Math.round((btuh / 12000) * 10) / 10;
  return out;
}

function scrubText(value, max) {
  if (value == null || value === '') return { omit: true };
  if (typeof value !== 'string') return { bad: true };
  const text = value.trim();
  if (!text) return { omit: true };
  if (text.length > max || looksPersonal(text)) return { drop: true };
  return { value: text };
}

function coarsenZip(value) {
  if (value == null || value === '') return { omit: true };
  if (typeof value !== 'string') return { bad: true };
  const text = value.trim();
  if (!text) return { omit: true };
  if (text.length > 12 || looksPersonal(text)) return { drop: true };
  return { value: '000' };
}

function cleanEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
  if (unknownKeys(event, EVENT_FIELDS).length) return null;
  if (!inEnum(enums.tier1_events.concat(enums.tier2_events), event.name)) return null;
  const clean = { name: event.name };
  if (event.route != null) {
    if (!ROUTES.has(event.route)) return null;
    clean.route = event.route;
  }
  if (event.referrer != null) {
    if (!REFERRER.has(event.referrer)) return null;
    clean.referrer = event.referrer;
  }
  ['entry', 'result_id', 'tier', 'node', 'choice', 'last_node'].forEach(key => {
    if (event[key] == null || event[key] === '') return;
    if (typeof event[key] !== 'string' || !ID_RE.test(event[key])) return;
    clean[key] = event[key];
  });
  return clean;
}

function counterAdds(events) {
  const adds = {};
  events.forEach(event => {
    if (!TIER1.has(event.name)) return;
    adds[event.name] = (adds[event.name] || 0) + 1;
    if (event.route && ROUTES.has(event.route)) {
      const key = event.name + ':' + event.route;
      adds[key] = (adds[key] || 0) + 1;
    }
  });
  return adds;
}

export function prepareIngest(body, options) {
  const opts = options || {};
  const now = opts.now instanceof Date ? opts.now : new Date();
  const hmacKey = Object.prototype.hasOwnProperty.call(opts, 'hmacKey') ? opts.hmacKey : '';
  const serialRules = opts.serialRules || serialRulesDoc;
  const capacityRules = opts.capacityRules || capacityRulesDoc;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'invalid_json');
  if (unknownKeys(body, TOP_FIELDS).length) return fail(400, 'unknown_field');
  if (body.bot_field) return { ok: true, status: 200, body: { stored: false }, write: false };
  const gpc = body.gpc === true || opts.gpc === true;
  const events = [];
  if (body.events != null) {
    if (!Array.isArray(body.events) || body.events.length > LIMITS.events) return fail(400, 'invalid_events');
    body.events.forEach(event => {
      const clean = cleanEvent(event);
      if (clean) events.push(clean);
    });
  }
  const counters = gpc ? {} : counterAdds(events);
  if (body.units != null && body.check == null) return fail(400, 'invalid_check');
  if (body.check == null) {
    return { ok: true, status: 200, body: { stored: false }, write: false, counters };
  }
  const checkIn = body.check;
  if (!checkIn || typeof checkIn !== 'object' || Array.isArray(checkIn)) return fail(400, 'invalid_check');
  if (unknownKeys(checkIn, CHECK_FIELDS).length) return fail(400, 'unknown_field');
  if (!validCheckId(checkIn.check_id)) return fail(400, 'invalid_check');
  if (checkIn.terms_version !== VERSIONS.terms || checkIn.privacy_version !== VERSIONS.privacy || checkIn.catalog_consent_version !== VERSIONS.catalog_consent) {
    return fail(409, 'version_mismatch');
  }
  if (!inEnum(enums.mode, checkIn.mode)) return fail(400, 'invalid_check');
  if (!inEnum(enums.equipment_type, checkIn.equipment_type)) return fail(400, 'invalid_check');
  const lane = cappedString(checkIn.lane_entered, 24);
  if (!lane || !/^[a-z]{2,8}\.?$|^ask$/.test(lane)) return fail(400, 'invalid_check');
  if (!Array.isArray(checkIn.path) || checkIn.path.length > LIMITS.path_steps) return fail(400, 'invalid_path');
  const path = [];
  for (const step of checkIn.path) {
    if (!step || typeof step !== 'object' || unknownKeys(step, new Set(['node', 'choice'])).length) return fail(400, 'invalid_path');
    if (!ID_RE.test(step.node || '') || !ID_RE.test(step.choice || '')) return fail(400, 'invalid_path');
    path.push({ node: step.node, choice: step.choice });
  }
  const endNode = cappedString(checkIn.end_node, 64);
  if (!endNode || !ID_RE.test(endNode)) return fail(400, 'invalid_check');
  if (!inEnum(enums.unit_step, checkIn.unit_step)) return fail(400, 'invalid_check');
  if (!inEnum(enums.followup_status, checkIn.followup_status)) return fail(400, 'invalid_check');
  if (checkIn.followup_status === 'answered') return fail(400, 'invalid_check');
  if (['app_version', 'content_version', 'tree_version'].some(key => typeof checkIn[key] !== 'string' || checkIn[key].length > 32 || !checkIn[key])) {
    return fail(400, 'invalid_check');
  }
  if (!Number.isInteger(checkIn.stop_count) || checkIn.stop_count < 0 || checkIn.stop_count > 1000) return fail(400, 'invalid_check');
  if (!Number.isInteger(checkIn.elapsed_seconds) || checkIn.elapsed_seconds < 0) return fail(400, 'invalid_check');
  const check = {
    check_id: checkIn.check_id,
    schema_version: enums.schema_version,
    app_version: checkIn.app_version,
    content_version: checkIn.content_version,
    tree_version: checkIn.tree_version,
    terms_version: checkIn.terms_version,
    privacy_version: checkIn.privacy_version,
    catalog_consent_version: checkIn.catalog_consent_version,
    catalog_consent: true,
    catalog_consent_at: hourStamp(checkIn.catalog_consent_at),
    mode: checkIn.mode,
    created_date: utcDay(now),
    equipment_type: checkIn.equipment_type,
    lane_entered: lane,
    path,
    end_node: endNode,
    outcome_at_result: outcomeAtResult(checkIn.outcome_code),
    completed: inEnum(enums.result_tier, checkIn.result_tier),
    stop_count: checkIn.stop_count,
    elapsed_seconds: Math.min(LIMITS.elapsed_seconds, checkIn.elapsed_seconds),
    unit_step: checkIn.unit_step,
    followup_status: checkIn.followup_status,
    scrubbed: false
  };
  if (checkIn.symptom != null) {
    if (!inEnum(enums.symptom, checkIn.symptom)) return fail(400, 'invalid_check');
    check.symptom = checkIn.symptom;
  }
  if (checkIn.result_tier != null) {
    if (!inEnum(enums.result_tier, checkIn.result_tier)) return fail(400, 'invalid_check');
    check.result_tier = checkIn.result_tier;
  }
  if (checkIn.outcome_code != null) {
    if (!inEnum(enums.outcome_code, checkIn.outcome_code)) return fail(400, 'invalid_check');
    check.outcome_code = checkIn.outcome_code;
    check.outcome_at_result = outcomeAtResult(checkIn.outcome_code);
  }
  if (checkIn.reset_count != null) {
    if (!Number.isInteger(checkIn.reset_count) || checkIn.reset_count < 0 || checkIn.reset_count > 1000) return fail(400, 'invalid_check');
    check.reset_count = checkIn.reset_count;
  }
  if (checkIn.rechecks != null) {
    if (!Number.isInteger(checkIn.rechecks) || checkIn.rechecks < 0 || checkIn.rechecks > 1000) return fail(400, 'invalid_check');
    check.rechecks = checkIn.rechecks;
  }
  if (checkIn.region_state != null && checkIn.region_state !== '') {
    if (!REGION.has(checkIn.region_state)) return fail(400, 'invalid_check');
    check.region_state = checkIn.region_state;
  }
  const zip = coarsenZip(checkIn.zip3);
  if (zip.bad) return fail(400, 'invalid_check');
  if (zip.drop) check.scrubbed = true;
  if (zip.value) check.zip3 = zip.value;
  const unitsIn = body.units == null ? [] : body.units;
  if (!Array.isArray(unitsIn) || unitsIn.length > LIMITS.units) return fail(400, 'invalid_unit');
  if (check.unit_step !== 'submitted' && unitsIn.length) return fail(400, 'invalid_unit');
  if (check.unit_step === 'submitted' && !unitsIn.length) return fail(400, 'invalid_unit');
  let needsKey = false;
  const units = [];
  for (const unitIn of unitsIn) {
    if (!unitIn || typeof unitIn !== 'object' || Array.isArray(unitIn)) return fail(400, 'invalid_unit');
    if (unknownKeys(unitIn, UNIT_FIELDS).length) return fail(400, 'unknown_field');
    if (!inEnum(enums.unit_role, unitIn.unit_role)) return fail(400, 'invalid_unit');
    if (!inEnum(enums.serial_status, unitIn.serial_status)) return fail(400, 'invalid_unit');
    if (!inEnum(enums.nameplate_source, unitIn.nameplate_source)) return fail(400, 'invalid_unit');
    const unit = {
      unit_id: randomBytes(16).toString('hex'),
      check_id: check.check_id,
      unit_role: unitIn.unit_role,
      serial_status: unitIn.serial_status,
      nameplate_source: unitIn.nameplate_source,
      scrubbed: false
    };
    if (unitIn.brand != null && unitIn.brand !== '') {
      if (!BRANDS.has(unitIn.brand)) return fail(400, 'invalid_unit');
      unit.brand = unitIn.brand;
    }
    const brandOther = scrubText(unitIn.brand_other, LIMITS.brand_other);
    if (brandOther.bad) return fail(400, 'invalid_unit');
    if (brandOther.drop) unit.scrubbed = true;
    if (brandOther.value) {
      unit.brand = 'other';
      unit.brand_other = brandOther.value;
    }
    if (unitIn.model_number != null && unitIn.model_number !== '') {
      const model = normalizeSerial(unitIn.model_number);
      if (SERIAL_RE.test(model)) unit.model_number = model;
    }
    if (unitIn.fuel != null && unitIn.fuel !== '') {
      if (!inEnum(enums.fuel, unitIn.fuel)) return fail(400, 'invalid_unit');
      unit.fuel = unitIn.fuel;
    }
    if (unit.serial_status === 'entered') {
      const serial = normalizeSerial(unitIn.serial_number);
      if (SERIAL_RE.test(serial)) {
        if (!hmacKey) needsKey = true;
        else {
          unit.serial_number = serial;
          unit.serial_hmac = createHmac('sha256', hmacKey).update(serial).digest('hex');
        }
      }
    }
    Object.assign(unit, deriveManufacture(unit.serial_number, unit.brand, serialRules, now.getUTCFullYear()));
    Object.assign(unit, deriveCapacity(unit.model_number, check.equipment_type, capacityRules));
    units.push(unit);
  }
  if (check.region_state && HIDDEN.has(check.region_state)) {
    return { ok: true, status: 200, body: { stored: false, reason: 'quebec' }, write: false, counters };
  }
  if (needsKey) return fail(503, 'not_configured');
  const tier2 = events.filter(event => TIER2.has(event.name)).slice(-LIMITS.events);
  if (tier2.length) check.events = tier2;
  check.unit_ids = units.map(unit => unit.unit_id);
  const coded = recordCode();
  check.record_code_hash = coded.hash;
  return {
    ok: true,
    status: 200,
    body: { stored: true, record_code: coded.code },
    write: true,
    counters,
    check,
    units,
    codeHash: coded.hash
  };
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > LIMITS.body_bytes) return { error: json(413, { error: 'too_large' }) };
  try {
    const body = JSON.parse(text);
    return { body };
  } catch (err) {
    return { error: json(400, { error: 'invalid_json' }) };
  }
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

async function ingestEnabled(store) {
  const config = await store.get('config/catalog.json', { type: 'json' });
  return !!(config && config.ingest === true);
}

async function bumpCounters(store, adds, now) {
  const names = Object.keys(adds);
  if (!names.length) return;
  const key = 'counters/' + utcDay(now) + '.json';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await store.getWithMetadata(key);
    const next = Object.assign({}, current && current.data || {});
    names.forEach(name => { next[name] = (next[name] || 0) + adds[name]; });
    try {
      await store.setJSON(key, next, { onlyIfMatch: current && current.etag ? current.etag : '*' });
      return;
    } catch (err) {
      if (attempt === 4) throw err;
    }
  }
}

export async function handleIngest(request, deps) {
  const extra = deps || {};
  if (!request || request.method !== 'POST') return json(405, { error: 'method' });
  if (!sameOrigin(request)) return json(403, { error: 'origin' });
  const contentType = request.headers.get('content-type') || '';
  if (contentType.indexOf('application/json') !== 0) return json(415, { error: 'type' });
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const store = extra.store || await openCatalogStore();
  if (!(await ingestEnabled(store))) return json(503, { error: 'catalog_off' });
  const prepared = prepareIngest(parsed.body, {
    now: extra.now,
    hmacKey: Object.prototype.hasOwnProperty.call(extra, 'hmacKey') ? extra.hmacKey : process.env.CATALOG_HMAC_KEY,
    gpc: request.headers.get('sec-gpc') === '1',
    serialRules: extra.serialRules,
    capacityRules: extra.capacityRules
  });
  if (!prepared.ok) return json(prepared.status, prepared.body);
  if (!prepared.write) {
    if (prepared.counters) await bumpCounters(store, prepared.counters, extra.now || new Date());
    return json(prepared.status, prepared.body);
  }
  const month = prepared.check.created_date.slice(0, 7);
  const checkKey = 'checks/' + month + '/' + prepared.check.check_id + '.json';
  const existing = await store.get(checkKey, { type: 'json' });
  if (existing) return json(200, { stored: true, duplicate: true });
  if (prepared.counters) await bumpCounters(store, prepared.counters, extra.now || new Date());
  await store.setJSON(checkKey, prepared.check);
  for (const unit of prepared.units) {
    await store.setJSON('units/' + prepared.check.check_id + '/' + unit.unit_id + '.json', unit);
  }
  await store.setJSON('codes/' + prepared.codeHash, { check_id: prepared.check.check_id, month });
  return json(200, prepared.body);
}

function publicCheck(check) {
  const copy = Object.assign({}, check);
  delete copy.record_code_hash;
  return copy;
}

function publicUnit(unit) {
  const copy = Object.assign({}, unit);
  delete copy.serial_hmac;
  return copy;
}

async function loadByCode(store, code) {
  const hash = hashRecordCode(code);
  if (!hash) return null;
  const pointer = await store.get('codes/' + hash, { type: 'json' });
  const checkId = pointer && typeof pointer === 'object' ? pointer.check_id : pointer;
  const month = pointer && typeof pointer === 'object' ? pointer.month : '';
  if (!checkId || typeof checkId !== 'string' || !month) return null;
  const foundKey = 'checks/' + month + '/' + checkId + '.json';
  const found = await store.get(foundKey, { type: 'json' });
  if (!found) return { checkId, missing: true, hash };
  const units = [];
  for (const unitId of found.unit_ids || []) {
    const unit = await store.get('units/' + checkId + '/' + unitId + '.json', { type: 'json' });
    if (unit) units.push(unit);
  }
  const followup = await store.get('followups/' + checkId + '.json', { type: 'json' });
  return { checkId, hash, check: found, checkKey: foundKey, units, followup };
}

export async function handleRecord(request, deps) {
  const extra = deps || {};
  if (!request || (request.method !== 'GET' && request.method !== 'DELETE')) return json(405, { error: 'method' });
  if (!sameOrigin(request)) return json(403, { error: 'origin' });
  const code = request.headers.get('x-record-code');
  if (!code) return json(400, { error: 'code_required' });
  const store = extra.store || await openCatalogStore();
  const loaded = await loadByCode(store, code);
  if (!loaded || loaded.missing || !loaded.check) return json(404, { error: 'not_found' });
  if (request.method === 'GET') {
    return json(200, {
      check: publicCheck(loaded.check),
      units: loaded.units.map(publicUnit),
      followup: loaded.followup || null
    });
  }
  await store.delete(loaded.checkKey);
  for (const unit of loaded.units) {
    await store.delete('units/' + loaded.checkId + '/' + unit.unit_id + '.json');
  }
  await store.delete('followups/' + loaded.checkId + '.json');
  await store.delete('codes/' + loaded.hash);
  const deleted = extra.now instanceof Date ? extra.now : new Date();
  await store.setJSON('tombstones/' + loaded.checkId + '.json', {
    check_id: loaded.checkId,
    deleted_date: utcDay(deleted),
    month: (loaded.check.created_date || utcDay(deleted)).slice(0, 7)
  });
  return json(200, { deleted: true });
}

export function prepareFollowup(body, check, now) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'invalid_json');
  if (unknownKeys(body, FOLLOW_FIELDS).length) return fail(400, 'unknown_field');
  if (body.bot_field) return { ok: true, status: 200, body: { stored: false }, write: false };
  if (!inEnum(enums.status_now, body.status_now)) return fail(400, 'invalid_followup');
  if (body.what_fixed_it != null && body.what_fixed_it !== '' && !inEnum(enums.what_fixed_it, body.what_fixed_it)) {
    return fail(400, 'invalid_followup');
  }
  if (body.who_did_it != null && body.who_did_it !== '' && !inEnum(enums.who_did_it, body.who_did_it)) {
    return fail(400, 'invalid_followup');
  }
  const when = now instanceof Date ? now : new Date();
  const follow = {
    followup_id: randomBytes(16).toString('hex'),
    check_id: check.check_id,
    answered_date: utcDay(when),
    days_after_check: Math.max(0, Math.round((Date.parse(utcDay(when) + 'T00:00:00Z') - Date.parse(check.created_date + 'T00:00:00Z')) / 86400000)),
    status_now: body.status_now,
    scrubbed: false
  };
  if (body.what_fixed_it) follow.what_fixed_it = body.what_fixed_it;
  if (body.who_did_it) follow.who_did_it = body.who_did_it;
  const fixed = scrubText(body.what_fixed_other, LIMITS.what_fixed_other);
  const part = scrubText(body.part_recommended_other, LIMITS.part_recommended_other);
  if (fixed.bad || part.bad) return fail(400, 'invalid_followup');
  if (fixed.drop || part.drop) follow.scrubbed = true;
  if (fixed.value) {
    follow.what_fixed_other = fixed.value;
    follow.what_fixed_it = follow.what_fixed_it || 'other';
  }
  if (part.value) follow.part_recommended_other = part.value;
  return { ok: true, status: 200, body: { stored: true }, write: true, follow, outcome_reported: outcomeReported(body.status_now) };
}

export async function handleFollowup(request, deps) {
  const extra = deps || {};
  if (!request || request.method !== 'POST') return json(405, { error: 'method' });
  if (!sameOrigin(request)) return json(403, { error: 'origin' });
  const contentType = request.headers.get('content-type') || '';
  if (contentType.indexOf('application/json') !== 0) return json(415, { error: 'type' });
  const code = request.headers.get('x-record-code');
  if (!code) return json(400, { error: 'code_required' });
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const store = extra.store || await openCatalogStore();
  if (!(await ingestEnabled(store))) return json(503, { error: 'catalog_off' });
  const loaded = await loadByCode(store, code);
  if (!loaded || loaded.missing || !loaded.check) return json(404, { error: 'not_found' });
  const prepared = prepareFollowup(parsed.body, loaded.check, extra.now);
  if (!prepared.ok) return json(prepared.status, prepared.body);
  if (!prepared.write) return json(200, prepared.body);
  await store.setJSON('followups/' + loaded.checkId + '.json', prepared.follow);
  const next = Object.assign({}, loaded.check, {
    followup_status: 'answered',
    outcome_reported: prepared.outcome_reported
  });
  await store.setJSON(loaded.checkKey, next);
  return json(200, prepared.body);
}
