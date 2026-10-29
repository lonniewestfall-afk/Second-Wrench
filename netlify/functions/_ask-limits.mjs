/* Per-hash hourly limit and a daily global cap. Keys hold counts only. No raw IP. */
import { createHash } from 'node:crypto';

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

export async function takeSlot(store, opts) {
  const dayKey = 'd:' + opts.day;
  const hourKey = 'h:' + opts.hash + ':' + opts.hour;
  const dayCurrent = await store.getWithMetadata(dayKey, { type: 'json' });
  if (countOf(dayCurrent && dayCurrent.data) >= opts.dailyCap) return { ok: false, scope: 'day' };
  const hourCurrent = await store.getWithMetadata(hourKey, { type: 'json' });
  if (countOf(hourCurrent && hourCurrent.data) >= opts.hourCap) return { ok: false, scope: 'hour' };
  await addOne(store, dayKey);
  await addOne(store, hourKey);
  return { ok: true, keys: [dayKey, hourKey] };
}

export function hourStamp(date) {
  return date.toISOString().slice(0, 13);
}

export function dayStamp(date) {
  return date.toISOString().slice(0, 10);
}
