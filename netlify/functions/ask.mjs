/* Ask Second Wrench.
 * Public chat stays off unless AI_CHAT_ENABLED is on.
 * A private preview token from PREVIEW_TOKENS is carried in the sw_preview cookie.
 * Photos are resized and re-encoded by the browser, stripped of EXIF here, and
 * never written to the blob store or the log. Chat text is not logged unless
 * AI_LOG_CONTENT=true, and never when Global Privacy Control is on.
 * Rate-limit keys store a daily hash, not a raw IP, and the previous day's
 * hash keys are deleted. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allowedBase, chatMode, envInt, PREVIEW_COOKIE, previewClearCookie, previewSetCookie, readPreviewToken, requestAllowed, tokenMatches } from './_ask-flags.mjs';
import { clientIp, dayStamp, DEFAULT_DAILY_CAP, DEFAULT_HOUR_CAP, DEFAULT_VISITOR_CAP, hashIp, hourStamp, takeSlot } from './_ask-limits.mjs';
import { ANTHROPIC_MODEL, getAdapter, stripJpegMetadata } from './_ask-provider.mjs';
import { buildMessages, citationsFor, retrieve } from './_ask-retrieve.mjs';
import { MESSAGES, outputHasSafeAdjective, screenModel, screenUser, stripSafeWords } from './_ask-safety.mjs';

const LATER = new Set(['photo', 'photos', 'image', 'images', 'audio', 'voice', 'auth', 'signin', 'signIn']);
const BODY_TEXT = 12000;
const BODY_IMAGES = 3000000;
let indexCache = null;

function json(status, body, extraHeaders) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  (extraHeaders || []).forEach(pair => headers.append(pair[0], pair[1]));
  return new Response(JSON.stringify(body), { status, headers });
}

export function logLine(event) {
  const line = {
    ask: true,
    status: event.status,
    action: event.action || '',
    gpc: event.gpc === true
  };
  if (Number.isInteger(event.providerStatus)) line.providerStatus = event.providerStatus;
  if (event.logContent === true && event.gpc !== true && event.content) line.content = event.content;
  return line;
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

function secureRequest(request) {
  try {
    if (new URL(request.url).protocol === 'https:') return true;
  } catch (err) { /* ignore */ }
  return request.headers.get('x-forwarded-proto') === 'https';
}

function jsonType(value) {
  const type = String(value || '').toLowerCase().split(';')[0].trim();
  return type === '' || type === 'application/json' || type === 'text/plain';
}

export function loadIndex() {
  if (indexCache) return indexCache;
  const beside = join(dirname(fileURLToPath(import.meta.url)), '_ask-index.json');
  const candidates = [beside, join(process.cwd(), 'netlify/functions/_ask-index.json')];
  for (const path of candidates) {
    try {
      indexCache = JSON.parse(readFileSync(path, 'utf8'));
      return indexCache;
    } catch (err) {
      /* try the next location */
    }
  }
  return null;
}

export function resetIndexCache() {
  indexCache = null;
}

export function capsFor(env) {
  return {
    dailyCap: envInt(env.AI_DAILY_CAP, DEFAULT_DAILY_CAP, 1, 100000),
    visitorCap: envInt(env.AI_VISITOR_DAILY_CAP, DEFAULT_VISITOR_CAP, 1, 100000),
    hourCap: envInt(env.AI_RATE_PER_HOUR, DEFAULT_HOUR_CAP, 1, 1000)
  };
}

function gpcOn(request, body) {
  if (request.headers.get('sec-gpc') === '1') return true;
  return !!(body && body.gpc === true);
}

function laterField(body) {
  if (!body || typeof body !== 'object') return false;
  return Object.keys(body).some(key => LATER.has(key));
}

function roughUserText(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.messages)) return '';
  return body.messages.filter(message => message && message.role === 'user' && typeof message.content === 'string').map(message => message.content).join('\n');
}

function roughHasImages(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.messages)) return false;
  return body.messages.some(message => message && Array.isArray(message.images) && message.images.length > 0);
}

function normalizeImages(value) {
  if (value == null) return { list: [] };
  if (!Array.isArray(value)) return { error: 'invalid' };
  if (value.length > 2) return { error: 'invalid' };
  const list = [];
  for (const image of value) {
    if (!image || typeof image !== 'object') return { error: 'invalid' };
    const mediaType = String(image.mediaType || image.media_type || '').toLowerCase();
    if (mediaType !== 'image/jpeg') return { error: 'invalid' };
    const stripped = stripJpegMetadata(String(image.data || ''));
    if (!stripped) return { error: 'invalid' };
    list.push({ mediaType: 'image/jpeg', data: stripped });
  }
  return { list };
}

function normalizeMessages(body, maxChars) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'invalid' };
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 8) return { error: 'invalid' };
  const out = [];
  let total = 0;
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const last = index === messages.length - 1;
    if (!message || typeof message !== 'object') return { error: 'invalid' };
    if (message.role !== 'user' && message.role !== 'assistant') return { error: 'invalid' };
    if (typeof message.content !== 'string') return { error: 'invalid' };
    const content = message.content.trim();
    const hasImages = Array.isArray(message.images) ? message.images.length > 0 : message.images != null;
    if (hasImages && (!last || message.role !== 'user')) return { error: 'invalid' };
    const images = hasImages ? normalizeImages(message.images) : { list: [] };
    if (images.error) return { error: 'invalid' };
    if (!content && !images.list.length) return { error: 'invalid' };
    total += content.length;
    const row = { role: message.role, content };
    if (images.list.length) row.images = images.list;
    out.push(row);
  }
  if (out[out.length - 1].role !== 'user') return { error: 'invalid' };
  const latest = out[out.length - 1].content;
  if (latest.length > maxChars || total > maxChars * 4) return { error: 'too_long', messages: out };
  return { messages: out };
}

function userText(messages) {
  return messages.filter(message => message.role === 'user').map(message => message.content).join('\n');
}

function reply(status, payload, meta, extraHeaders) {
  const event = Object.assign({ status, action: payload.safety && payload.safety.code || payload.error || '' }, meta || {});
  return { response: json(status, payload, extraHeaders), event };
}

function configured(env) {
  const provider = String(env.AI_PROVIDER || 'anthropic').trim().toLowerCase() || 'anthropic';
  if (!getAdapter(provider)) return null;
  if (provider === 'anthropic') {
    const key = String(env.ANTHROPIC_API_KEY || '').trim();
    const model = String(env.AI_MODEL || ANTHROPIC_MODEL).trim();
    if (!key || !model) return null;
    return { key, model, base: 'https://api.anthropic.com', provider };
  }
  const key = String(env.AI_API_KEY || '').trim();
  const model = String(env.AI_MODEL || '').trim();
  const base = String(env.AI_BASE_URL || 'https://api.openai.com/v1').trim();
  if (!key || !model || !allowedBase(base)) return null;
  return { key, model, base, provider };
}

export async function handleAsk(request, deps) {
  const env = Object.assign({}, process.env, deps && deps.env);
  const fetchImpl = (deps && deps.fetch) || globalThis.fetch;
  const log = (deps && deps.log) || (event => console.log(JSON.stringify(logLine(event))));
  const now = (deps && deps.now) ? deps.now() : new Date();
  const logContent = String(env.AI_LOG_CONTENT || '').trim().toLowerCase() === 'true';
  const finish = result => {
    log(Object.assign({ logContent }, result.event));
    return result.response;
  };
  const presented = readPreviewToken(request);
  const tokenOk = tokenMatches(presented, env.PREVIEW_TOKENS);
  const mode = chatMode(env.AI_CHAT_ENABLED);
  const secure = request ? secureRequest(request) : false;
  const cookieHeaders = tokenOk && presented
    ? [['set-cookie', previewSetCookie(presented, secure)]]
    : (presented && mode !== 'on' ? [['set-cookie', previewClearCookie(secure)]] : []);

  if (!request || (request.method !== 'POST' && request.method !== 'GET')) {
    return finish(reply(405, { ok: false, error: 'method', message: 'Use POST.' }));
  }
  if (!sameOrigin(request)) return finish(reply(403, { ok: false, error: 'origin', message: MESSAGES.disabled }));

  if (request.method === 'GET') {
    if (!presented) return finish(reply(405, { ok: false, error: 'method', message: 'Use POST.' }));
    if (!tokenOk) return finish(reply(404, { ok: false, error: 'disabled', message: MESSAGES.disabled }, { gpc: false, content: '' }, cookieHeaders));
    return finish(reply(200, { ok: true, preview: true }, { gpc: false, content: '', action: 'preview' }, cookieHeaders));
  }

  if (!jsonType(request.headers.get('content-type'))) return finish(reply(415, { ok: false, error: 'type', message: 'Send JSON.' }));

  const bodyCap = (tokenOk || mode === 'on') ? BODY_IMAGES : BODY_TEXT;
  const text = await request.text();
  if (text.length > bodyCap) return finish(reply(413, { ok: false, error: 'too_large', message: 'That message is too long. Shorten it and try again, or use the guided check.' }));
  let body;
  try { body = JSON.parse(text); } catch (err) { return finish(reply(400, { ok: false, error: 'invalid_json', message: 'Send a JSON message.' })); }

  const gpc = gpcOn(request, body);
  const meta = { gpc, content: '' };
  const rough = roughUserText(body);
  if (rough || roughHasImages(body)) {
    const screened = screenUser(rough, { images: roughHasImages(body) });
    if (screened.action !== 'allow') {
      return finish(reply(200, {
        ok: true,
        message: screened.message,
        citations: screened.citations,
        flow: screened.citations.find(item => item.flow) || null,
        safety: { action: screened.action, code: screened.code }
      }, Object.assign({}, meta, { action: screened.code })));
    }
  }

  if (laterField(body)) {
    return finish(reply(400, { ok: false, error: 'unsupported', message: 'Sign-in and voice are not part of this chat. Add a photo with the photo button, or type your question.' }, meta));
  }
  if (!requestAllowed(mode, tokenOk)) {
    return finish(reply(404, { ok: false, error: 'disabled', message: MESSAGES.disabled }, meta, cookieHeaders));
  }

  const maxChars = envInt(env.AI_MAX_INPUT_CHARS, 800, 80, 4000);
  const parsed = normalizeMessages(body, maxChars);
  if (parsed.error === 'too_long') {
    return finish(reply(400, { ok: false, error: 'too_long', message: 'That message is too long. Shorten it and try again, or use the guided check.' }, meta));
  }
  if (parsed.error) return finish(reply(400, { ok: false, error: 'invalid', message: 'Send a short text question.' }, meta));

  const setup = configured(env);
  if (!setup) return finish(reply(503, { ok: false, error: 'unconfigured', message: MESSAGES.unconfigured }, meta));

  const index = (deps && deps.index) || loadIndex();
  if (!index) return finish(reply(503, { ok: false, error: 'unconfigured', message: MESSAGES.unconfigured }, meta));

  const hasImages = parsed.messages.some(message => message.images && message.images.length);
  const found = retrieve(index, userText(parsed.messages), 6);
  if (!found.known && !hasImages) {
    return finish(reply(200, { ok: true, message: MESSAGES.unknown, citations: [{ title: 'Answers', href: '/answers/' }, { title: 'Start the guided check', href: '/#/' }], flow: null, safety: null }, Object.assign({}, meta, { action: 'unknown' })));
  }

  let store = deps && deps.store;
  if (!store) {
    try {
      const blobs = await import('@netlify/blobs');
      store = blobs.getStore({ name: 'sw-ask', region: 'us-east-2', consistency: 'strong' });
    } catch (err) {
      return finish(reply(503, { ok: false, error: 'unconfigured', message: MESSAGES.unconfigured }, meta));
    }
  }

  const day = dayStamp(now);
  const hash = hashIp(clientIp(request), env.AI_IP_HASH_SALT, day);
  const caps = capsFor(env);
  let slot;
  try {
    slot = await takeSlot(store, {
      day,
      hour: hourStamp(now),
      hash,
      dailyCap: caps.dailyCap,
      visitorCap: caps.visitorCap,
      hourCap: caps.hourCap
    });
  } catch (err) {
    return finish(reply(503, { ok: false, error: 'unconfigured', message: MESSAGES.unconfigured }, meta));
  }
  if (!slot.ok) return finish(reply(429, { ok: false, error: 'limited', message: MESSAGES.limited }, Object.assign({}, meta, { action: 'limited' })));

  const maxTokens = envInt(env.AI_MAX_OUTPUT_TOKENS, 400, 64, 1000);
  const adapter = getAdapter(setup.provider);
  let raw;
  try {
    const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined;
    raw = await adapter({
      baseUrl: setup.base,
      apiKey: setup.key,
      model: setup.model,
      messages: buildMessages(parsed.messages, found.chunks),
      maxTokens,
      fetchImpl,
      signal
    });
  } catch (err) {
    const providerStatus = Number.isInteger(err && err.status) ? err.status : 0;
    return finish(reply(502, { ok: false, error: 'provider', message: 'The assistant did not answer. Please use the guided check: /#/' }, Object.assign({}, meta, { action: 'provider', providerStatus })));
  }

  const clipped = String(raw).slice(0, maxTokens * 8);
  const after = screenModel(clipped);
  const message = outputHasSafeAdjective(after.message) ? stripSafeWords(after.message) : after.message;
  const citations = after.ok ? citationsFor(found.chunks) : (after.citations || []);
  const question = parsed.messages[parsed.messages.length - 1].content;
  return finish(reply(200, {
    ok: true,
    message,
    citations,
    flow: citations.find(item => item.flow) || null,
    safety: after.ok ? null : { action: 'refuse', code: after.code }
  }, Object.assign({}, meta, { action: after.code || 'answer', content: logContent && !gpc ? question : '' }), cookieHeaders));
}

export async function openAskStore() {
  const blobs = await import('@netlify/blobs');
  return blobs.getStore({ name: 'sw-ask', region: 'us-east-2', consistency: 'strong' });
}

export default async function handler(request) {
  return handleAsk(request);
}
