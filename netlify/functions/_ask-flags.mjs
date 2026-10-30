/* Ask Second Wrench feature gate.
 * AI_CHAT_ENABLED: unset/false off, true/1/on for everyone.
 * Private preview does not use that flag. It requires a token from PREVIEW_TOKENS,
 * carried in the sw_preview cookie. A wrong or missing token stays closed. */

import { createHash, timingSafeEqual } from 'node:crypto';

export const PREVIEW_COOKIE = 'sw_preview';

export function chatMode(value) {
  const raw = String(value == null ? '' : value).trim().toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'on') return 'on';
  if (raw === 'preview') return 'preview';
  return 'off';
}

export function cookieSafe(token) {
  return typeof token === 'string' && /^[A-Za-z0-9._~-]{1,200}$/.test(token);
}

export function previewTokens(raw) {
  return String(raw || '').split(',').map(item => item.trim()).filter(cookieSafe);
}

export function tokenMatches(presented, raw) {
  const token = String(presented || '').trim();
  if (!cookieSafe(token)) return false;
  const list = previewTokens(raw);
  if (!list.length) return false;
  const digest = value => createHash('sha256').update('sw-preview-v1|' + value).digest();
  const got = digest(token);
  return list.some(item => timingSafeEqual(got, digest(item)));
}

/* Public on serves everyone. Any other mode serves only a valid preview token. */
export function requestAllowed(mode, tokenOk) {
  if (mode === 'on') return true;
  return tokenOk === true;
}

export function readPreviewToken(request) {
  if (!request || !request.headers || typeof request.headers.get !== 'function') return '';
  const fromCookie = readCookie(request.headers.get('cookie'), PREVIEW_COOKIE);
  if (cookieSafe(fromCookie)) return fromCookie;
  const header = String(request.headers.get('x-sw-preview') || '').trim();
  return cookieSafe(header) ? header : '';
}

export function readCookie(header, name) {
  const raw = String(header || '');
  const parts = raw.split(';');
  for (const part of parts) {
    const item = part.trim();
    const eq = item.indexOf('=');
    if (eq === -1) continue;
    if (item.slice(0, eq) !== name) continue;
    try { return decodeURIComponent(item.slice(eq + 1)); } catch (err) { return ''; }
  }
  return '';
}

export function previewSetCookie(token, secure) {
  const parts = [PREVIEW_COOKIE + '=' + encodeURIComponent(token), 'Path=/', 'Max-Age=2592000', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function previewClearCookie(secure) {
  return PREVIEW_COOKIE + '=; Path=/; Max-Age=0; SameSite=Lax' + (secure ? '; Secure' : '');
}

export function envInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isInteger(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function allowedBase(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) return true;
    return false;
  } catch (err) {
    return false;
  }
}
