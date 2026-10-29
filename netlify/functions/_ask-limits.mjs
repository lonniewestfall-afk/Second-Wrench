/* Global daily request cap, a per-visitor daily cap, and a per-visitor hourly cap.
 * Keys hold counts only. The visitor key is a daily hash of salt + day + IP.
 * Yesterday's hash keys are deleted on the first request of the new UTC day. */
import { createHash } from 'node:crypto';

export const DEFAULT_DAILY_CAP = 200;
export const DEFAULT_VISITOR_CAP = 40;
export const DEFAULT_HOUR_CAP = 20;

export function clientIp(request) {
  if (!request || !request.headers) return '';
  const direct = request.headers.get('x-nf-client-connection-ip');
  if (direct && direct.trim()) return direct.trim();
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return '';
}

export function hashIp(ip, salt, day) {
  return createHash('sha256').update(String(salt || 'sw-ask-rate-v1') + '|' + day + '|' + String(ip || 'unknown')).digest('hex').slice(0, 24);
}

export function keyDay(key) {
  const named = /^(?:d|purge):(\d{4}-\d{2}-\d{2})$/.exec(key || '');
  if (named) return named[1];
  const visitor = /^v:[0-9a-f]{24}:(\d{4}-\d{2}-\d{2})$/.exec(key || '');
  if (visitor) return visitor[1];
  const hour = /^h:[0-9a-f]{24}:(\d{4}-\d{2}-\d{2})T\d{2}$/.exec(key || '');
  if (hour) return hour[1];
  return '';
}

function countOf(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 0;
  if (!Number.isInteger(data.count) || data.count < 0) return 0;
  return data.count;
}

async function addOne(store, key) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await store.getWithMetadata(key, { type: 'json' });
    const previous = countOf(current && current.data);
    const next = { count: previous + 1 };
    const opts = current && current.etag ? { onlyIfMatch: current.etag } : { onlyIfNew: true };
    const result = await store.setJSON(key, next, opts);
    if (!result || result.modified !== false) return next.count;
  }
  const err = new Error('conflict');
  err.status = 503;
  throw err;
}

export async function purgeExpired(store, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(today || ''))) return { purged: 0, skipped: true };
  if (!store || typeof store.list !== 'function' || typeof store.delete !== 'function' || typeof store.getWithMetadata !== 'function') {
    return { purged: 0, skipped: true };
  }
  const markerKey = 'purge:' + today;
  const marker = await store.getWithMetadata(markerKey, { type: 'json' });
  if (marker && marker.data && marker.data.done === true) return { purged: 0, skipped: true };
  const doomed = [];
  let cursor = '';
  for (let page = 0; page < 40; page += 1) {
    const result = await store.list(cursor ? { cursor } : {});
    const blobs = result && result.blobs || [];
    blobs.forEach(blob => {
      const day = keyDay(blob && blob.key);
      if (day && day < today) doomed.push(blob.key);
    });
    const next = result && result.cursor;
    if (!next || next === cursor) break;
    cursor = next;
  }
  for (const key of doomed) await store.delete(key);
  if (typeof store.setJSON === 'function') await store.setJSON(markerKey, { done: true, purged: doomed.length });
  return { purged: doomed.length, skipped: false };
}

export async function takeSlot(store, opts) {
  await purgeExpired(store, opts.day);
  const dailyCap = Number.isInteger(opts.dailyCap) ? opts.dailyCap : DEFAULT_DAILY_CAP;
  const visitorCap = Number.isInteger(opts.visitorCap) ? opts.visitorCap : DEFAULT_VISITOR_CAP;
  const hourCap = Number.isInteger(opts.hourCap) ? opts.hourCap : DEFAULT_HOUR_CAP;
  const dayKey = 'd:' + opts.day;
  const visitorKey = 'v:' + opts.hash + ':' + opts.day;
  const hourKey = 'h:' + opts.hash + ':' + opts.hour;
  const dayCurrent = await store.getWithMetadata(dayKey, { type: 'json' });
  if (countOf(dayCurrent && dayCurrent.data) >= dailyCap) return { ok: false, scope: 'day' };
  const visitorCurrent = await store.getWithMetadata(visitorKey, { type: 'json' });
  if (countOf(visitorCurrent && visitorCurrent.data) >= visitorCap) return { ok: false, scope: 'visitor' };
  const hourCurrent = await store.getWithMetadata(hourKey, { type: 'json' });
  if (countOf(hourCurrent && hourCurrent.data) >= hourCap) return { ok: false, scope: 'hour' };
  await addOne(store, dayKey);
  await addOne(store, visitorKey);
  await addOne(store, hourKey);
  return { ok: true, keys: [dayKey, visitorKey, hourKey] };
}

export function hourStamp(date) {
  return date.toISOString().slice(0, 13);
}

export function dayStamp(date) {
  return date.toISOString().slice(0, 10);
}
