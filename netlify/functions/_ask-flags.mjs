/* Ask Second Wrench feature gate.
 * AI_CHAT_ENABLED: unset/false off, preview only with preview:true, true/1/on for everyone.
 * The public flag aiChatEnabled uses the same three states. Both default off. */

export function chatMode(value) {
  const raw = String(value == null ? '' : value).trim().toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'on') return 'on';
  if (raw === 'preview') return 'preview';
  return 'off';
}

export function requestAllowed(mode, preview) {
  if (mode === 'on') return true;
  if (mode === 'preview' && preview === true) return true;
  return false;
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
