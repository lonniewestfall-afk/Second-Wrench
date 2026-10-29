import { timingSafeEqual } from 'node:crypto';

export const STORE_NAME = 'sw-hits';
export const SOURCE_VALUES = ['x', 'reddit', 'youtube', 'facebook'];
export const MEDIUM_VALUES = ['reply', 'post', 'bio', 'video'];
export const NAMES = new Set(['visit', 'feedback_sent']);
export const REFERRERS = new Set(['none', 'same_site', 'external']);
export const ROUTES = new Set([
  '/', '/check', '/result', '/feedback', '/about', '/safety', '/terms', '/privacy',
  '/disclosures', '/sources', '/my-data', '/followup'
]);
const SOURCES = new Set(SOURCE_VALUES.concat(['other']));
const MEDIUMS = new Set(MEDIUM_VALUES.concat(['other']));
const FIELDS = ['name', 'route', 'referrer', 'utm_source', 'utm_medium', 'utm_campaign'];
const BODY_MAX = 2048;
const CSV_HEADER = 'date,name,source,medium,campaign,referrer,count';

export function validDateCampaign(value) {
  const match = /^(\d{4})(\d{2})(\d{2})-(am|pm)$/.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

export function validSlug(value) {
  return typeof value === 'string' && value.length <= 20 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function acceptCampaign(value) {
  return validDateCampaign(value) || validSlug(value);
}

export function classifySource(value) {
  const text = String(value || '').trim().toLowerCase();
  return SOURCE_VALUES.indexOf(text) === -1 ? 'other' : text;
}

export function classifyMedium(value) {
  const text = String(value || '').trim().toLowerCase();
  return MEDIUM_VALUES.indexOf(text) === -1 ? 'other' : text;
}

export function classifyCampaign(value) {
  const text = String(value || '').trim().toLowerCase();
  return acceptCampaign(text) ? text : 'other';
}

export function acceptReferrer(value) {
  return REFERRERS.has(value) && value.indexOf('/') === -1 && value.indexOf(':') === -1 && value.indexOf('.') === -1;
}

function utcDay(date) {
  return date.toISOString().slice(0, 10);
}

export function counterKey(day, hit) {
  return [day, hit.name, hit.utm_source, hit.utm_medium, hit.utm_campaign, hit.referrer].join('|');
}

export function memoryStore() {
  const data = new Map();
  const etags = new Map();
  return {
    async getWithMetadata(key) {
      if (!data.has(key)) return null;
      return { data: JSON.parse(JSON.stringify(data.get(key))), etag: etags.get(key), metadata: {} };
    },
    async setJSON(key, value, opts) {
      const current = etags.get(key);
      const exists = data.has(key);
      if (opts && opts.onlyIfNew && exists) return { modified: false };
      if (opts && opts.onlyIfMatch != null && (!exists || current !== opts.onlyIfMatch)) return { modified: false };
      data.set(key, JSON.parse(JSON.stringify(value)));
      const next = String((Number(current) || 0) + 1);
      etags.set(key, next);
      return { etag: next, modified: true };
    },
    async list() {
      return {
        blobs: [...data.keys()].map(key => ({ key, etag: etags.get(key) })),
        directories: []
      };
    },
    async delete(key) {
      data.delete(key);
      etags.delete(key);
    }
  };
}

export async function openHitStore() {
  const blobs = await import('@netlify/blobs');
  return blobs.getStore({ name: STORE_NAME, region: 'us-east-2', consistency: 'strong' });
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function noContent() {
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}

function csvResponse(text) {
  return new Response(text, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'cache-control': 'no-store',
      'content-disposition': 'attachment; filename="hits.csv"'
    }
  });
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

function jsonType(value) {
  const type = String(value || '').toLowerCase().split(';')[0].trim();
  return type === '' || type === 'application/json' || type === 'text/plain';
}

function prepareHit(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const keys = Object.keys(body);
  if (keys.length !== FIELDS.length || FIELDS.some(field => !Object.prototype.hasOwnProperty.call(body, field))) return null;
  const hit = {};
  for (const field of FIELDS) {
    if (typeof body[field] !== 'string') return null;
    hit[field] = body[field];
  }
  if (!NAMES.has(hit.name) || !ROUTES.has(hit.route) || !acceptReferrer(hit.referrer)) return null;
  if (!SOURCES.has(hit.utm_source) || !MEDIUMS.has(hit.utm_medium) || !acceptCampaign(hit.utm_campaign)) return null;
  return hit;
}

function readCount(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (Object.keys(data).join(',') !== 'count') return null;
  if (!Number.isInteger(data.count) || data.count < 1) return null;
  return data.count;
}

export function hitsToCsv(rows) {
  const lines = [CSV_HEADER];
  rows.forEach(row => {
    lines.push([row.date, row.name, row.source, row.medium, row.campaign, row.referrer, String(row.count)].join(','));
  });
  return lines.join('\n') + '\n';
}

function exportToken(deps) {
  if (deps && Object.prototype.hasOwnProperty.call(deps, 'exportToken')) return deps.exportToken || '';
  return process.env.HITS_EXPORT_TOKEN || '';
}

function authorized(request, token) {
  if (!token) return false;
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(\S+)$/.exec(header);
  if (!match) return false;
  const left = Buffer.from(String(token));
  const right = Buffer.from(match[1]);
  if (!left.length || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function bumpCounter(store, key) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await store.getWithMetadata(key, { type: 'json' });
    const previous = current && current.data && Number.isInteger(current.data.count) ? current.data.count : 0;
    const next = { count: previous + 1 };
    const opts = current && current.etag ? { onlyIfMatch: current.etag } : { onlyIfNew: true };
    let result;
    try {
      result = await store.setJSON(key, next, opts);
    } catch (err) {
      const status = err && (err.status || err.statusCode);
      if (status !== 412 || attempt === 4) throw err;
      continue;
    }
    if (!result || result.modified !== false) return;
  }
  const err = new Error('conflict');
  err.status = 503;
  throw err;
}

async function exportCsv(store) {
  const listed = await store.list();
  const rows = [];
  for (const blob of (listed && listed.blobs) || []) {
    const parts = String(blob.key || '').split('|');
    if (parts.length !== 6) continue;
    const [date, name, source, medium, campaign, referrer] = parts;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !NAMES.has(name) || !SOURCES.has(source) || !MEDIUMS.has(medium)) continue;
    if (!acceptCampaign(campaign) || !REFERRERS.has(referrer)) continue;
    const current = await store.getWithMetadata(blob.key, { type: 'json' });
    const count = readCount(current && current.data);
    if (count == null) continue;
    rows.push({ date, name, source, medium, campaign, referrer, count });
  }
  rows.sort((a, b) => {
    const left = [a.date, a.name, a.source, a.medium, a.campaign, a.referrer].join('\0');
    const right = [b.date, b.name, b.source, b.medium, b.campaign, b.referrer].join('\0');
    return left < right ? -1 : left > right ? 1 : 0;
  });
  return hitsToCsv(rows);
}

export async function handleHit(request, deps) {
  try {
    return await dispatchHit(request, deps || {});
  } catch (err) {
    const status = err && err.status === 503 ? 503 : 500;
    return json(status, { error: status === 503 ? 'conflict' : 'error' });
  }
}

async function dispatchHit(request, deps) {
  if (!request || !request.method) return json(405, { error: 'method' });
  if (request.method === 'GET') {
    if (!authorized(request, exportToken(deps))) return json(401, { error: 'unauthorized' });
    const store = deps.store || await openHitStore();
    return csvResponse(await exportCsv(store));
  }
  if (request.method !== 'POST') return json(405, { error: 'method' });
  if (!sameOrigin(request)) return json(403, { error: 'origin' });
  if (!jsonType(request.headers.get('content-type'))) return json(415, { error: 'type' });
  const text = await request.text();
  if (text.length > BODY_MAX) return json(413, { error: 'too_large' });
  let body;
  try { body = JSON.parse(text); } catch (err) { return json(400, { error: 'invalid_json' }); }
  const hit = prepareHit(body);
  if (!hit) return json(400, { error: 'invalid' });
  if (request.headers.get('sec-gpc') === '1') return noContent();
  const store = deps.store || await openHitStore();
  const day = utcDay(deps.now || new Date());
  await bumpCounter(store, counterKey(day, hit));
  return noContent();
}

export default async function handler(request) {
  return handleHit(request);
}
