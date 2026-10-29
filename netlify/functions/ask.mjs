/* Ask Second Wrench. Phase 1 is text only.
 * Later phases can add sign-in, photo input, and real-time voice by extending
 * the request alongside `messages`. Those fields are rejected until then.
 * Chat text is not logged unless AI_LOG_CONTENT=true, and never when Global
 * Privacy Control is on. Rate-limit keys store a daily hash, not a raw IP. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allowedBase, chatMode, envInt, requestAllowed } from './_ask-flags.mjs';
import { clientIp, dayStamp, hashIp, hourStamp, takeSlot } from './_ask-limits.mjs';
import { getAdapter } from './_ask-provider.mjs';
import { buildMessages, citationsFor, retrieve } from './_ask-retrieve.mjs';
import { MESSAGES, outputHasSafeAdjective, screenModel, screenUser, stripSafeWords } from './_ask-safety.mjs';

const LATER = new Set(['photo', 'photos', 'image', 'images', 'audio', 'voice', 'auth', 'signin', 'signIn']);
const BODY_MAX = 12000;
let indexCache = null;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

export function logLine(event) {
  const line = {
    ask: true,
    status: event.status,
    action: event.action || '',
    gpc: event.gpc === true
  };
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

function gpcOn(request, body) {
  if (request.headers.get('sec-gpc') === '1') return true;
  return !!(body && body.gpc === true);
}

function laterField(body) {
  if (!body || typeof body !== 'object') return false;
  return Object.keys(body).some(key => LATER.has(key));
}

function normalizeMessages(body, maxChars) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'invalid' };
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 8) return { error: 'invalid' };
  const out = [];
  let total = 0;
  for (const message of messages) {
    if (!message || typeof message !== 'object') return { error: 'invalid' };
    if (message.role !== 'user' && message.role !== 'assistant') return { error: 'invalid' };
    if (typeof message.content !== 'string') return { error: 'invalid' };
    const content = message.content.trim();
    if (!content) return { error: 'invalid' };
    total += content.length;
    out.push({ role: message.role, content });
  }
  if (out[out.length - 1].role !== 'user') return { error: 'invalid' };
  if (out[out.length - 1].content.length > maxChars || total > maxChars * 4) return { error: 'too_long', messages: out };
  return { messages: out };
}

function userText(messages) {
  return messages.filter(message => message.role === 'user').map(message => message.content).join('\n');
}

function reply(status, payload, meta) {
  const event = Object.assign({ status, action: payload.safety && payload.safety.code || payload.error || '' }, meta || {});
  return { response: json(status, payload), event };
}

function configured(env) {
  const key = String(env.AI_API_KEY || '').trim();
  const model = String(env.AI_MODEL || '').trim();
  const base = String(env.AI_BASE_URL || 'https://api.openai.com/v1').trim();
  const provider = String(env.AI_PROVIDER || 'openai').trim();
  if (!key || !model || !getAdapter(provider) || !allowedBase(base)) return null;
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

  if (!request || request.method !== 'POST') return finish(reply(405, { ok: false, error: 'method', message: 'Use POST.' }));
  if (!sameOrigin(request)) return finish(reply(403, { ok: false, error: 'origin', message: MESSAGES.disabled }));
  if (!jsonType(request.headers.get('content-type'))) return finish(reply(415, { ok: false, error: 'type', message: 'Send JSON.' }));

  const text = await request.text();
  if (text.length > BODY_MAX) return finish(reply(413, { ok: false, error: 'too_large', message: 'That message is too long. Shorten it and try again, or use the guided check.' }));
  let body;
  try { body = JSON.parse(text); } catch (err) { return finish(reply(400, { ok: false, error: 'invalid_json', message: 'Send a JSON message.' })); }

  const gpc = gpcOn(request, body);
  const meta = { gpc, content: '' };
  const maxChars = envInt(env.AI_MAX_INPUT_CHARS, 800, 80, 4000);
  const parsed = normalizeMessages(body, maxChars);
  const candidate = parsed.messages || null;
  if (candidate) {
    const screened = screenUser(userText(candidate));
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
    return finish(reply(400, { ok: false, error: 'unsupported', message: 'Sign-in, photos, and voice are not part of this chat yet. Type your question instead.' }, meta));
  }

  const mode = chatMode(env.AI_CHAT_ENABLED);
  if (!requestAllowed(mode, body && body.preview)) {
    return finish(reply(404, { ok: false, error: 'disabled', message: MESSAGES.disabled }, meta));
  }
  if (parsed.error === 'too_long') {
    return finish(reply(400, { ok: false, error: 'too_long', message: 'That message is too long. Shorten it and try again, or use the guided check.' }, meta));
  }
  if (parsed.error) return finish(reply(400, { ok: false, error: 'invalid', message: 'Send a short text question.' }, meta));

  const setup = configured(env);
  if (!setup) return finish(reply(503, { ok: false, error: 'unconfigured', message: MESSAGES.unconfigured }, meta));

  const index = (deps && deps.index) || loadIndex();
  if (!index) return finish(reply(503, { ok: false, error: 'unconfigured', message: MESSAGES.unconfigured }, meta));

  const question = parsed.messages[parsed.messages.length - 1].content;
  const found = retrieve(index, question, 6);
  if (!found.known) {
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
  let slot;
  try {
    slot = await takeSlot(store, {
      day,
      hour: hourStamp(now),
      hash,
      dailyCap: envInt(env.AI_DAILY_CAP, 200, 1, 100000),
      hourCap: envInt(env.AI_RATE_PER_HOUR, 20, 1, 1000)
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
      messages: buildMessages(question, found.chunks),
      maxTokens,
      fetchImpl,
      signal
    });
  } catch (err) {
    return finish(reply(502, { ok: false, error: 'provider', message: 'The assistant did not answer. Please use the guided check: /#/' }, meta));
  }

  const clipped = String(raw).slice(0, maxTokens * 8);
  const after = screenModel(clipped);
  const message = outputHasSafeAdjective(after.message) ? stripSafeWords(after.message) : after.message;
  const citations = after.ok ? citationsFor(found.chunks) : (after.citations || []);
  return finish(reply(200, {
    ok: true,
    message,
    citations,
    flow: citations.find(item => item.flow) || null,
    safety: after.ok ? null : { action: 'refuse', code: after.code }
  }, Object.assign({}, meta, { action: after.code || 'answer', content: logContent && !gpc ? question : '' })));
}

export async function openAskStore() {
  const blobs = await import('@netlify/blobs');
  return blobs.getStore({ name: 'sw-ask', region: 'us-east-2', consistency: 'strong' });
}

export default async function handler(request) {
  return handleAsk(request);
}
