/* Hosted LLM adapters.
 * Default provider is Anthropic Messages (claude-opus-5-5).
 * AI_PROVIDER=openai keeps the OpenAI-compatible chat completions path.
 * Another host with that API can register an adapter with the same arguments. */

export const ANTHROPIC_MODEL = 'claude-opus-5-5';
export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const IMAGE_CHARS = 1200000;

export function stripJpegMetadata(base64) {
  const clean = String(base64 || '').replace(/\s/g, '');
  if (!clean || clean.length > IMAGE_CHARS) return '';
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean) || clean.length % 4 !== 0) return '';
  let buf;
  try { buf = Buffer.from(clean, 'base64'); } catch (err) { return ''; }
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return '';
  const parts = [buf.subarray(0, 2)];
  let i = 2;
  while (i + 1 < buf.length) {
    if (buf[i] !== 0xff) return '';
    let marker = buf[i + 1];
    while (marker === 0xff && i + 2 < buf.length) {
      i += 1;
      marker = buf[i + 1];
    }
    if (marker === 0xd9) {
      parts.push(buf.subarray(i, i + 2));
      break;
    }
    if (marker === 0xda) {
      parts.push(buf.subarray(i));
      break;
    }
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(buf.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 4 > buf.length) return '';
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) return '';
    const drop = marker === 0xe1 || marker === 0xfe;
    if (!drop) parts.push(buf.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  const out = Buffer.concat(parts);
  if (out.length < 4 || out[0] !== 0xff || out[1] !== 0xd8) return '';
  return out.toString('base64');
}

function textOf(message) {
  const content = typeof message.content === 'string' ? message.content.trim() : '';
  return content || 'What do you see in this photo? If a code or a reading is unclear, say what you see and ask.';
}

function providerError(status) {
  const error = new Error('provider');
  error.status = Number.isInteger(status) ? status : 0;
  throw error;
}

export async function openaiComplete({ baseUrl, apiKey, model, messages, maxTokens, fetchImpl, signal }) {
  const root = String(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  let res;
  try {
    res = await fetchImpl(root + '/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: maxTokens,
        messages: messages.map(message => {
          if (message.role !== 'user' || !message.images || !message.images.length) {
            return { role: message.role, content: message.content };
          }
          return {
            role: 'user',
            content: [{ type: 'text', text: textOf(message) }].concat(message.images.map(image => ({
              type: 'image_url',
              image_url: { url: 'data:image/jpeg;base64,' + image.data }
            })))
          };
        })
      }),
      signal
    });
  } catch (err) {
    providerError(0);
  }
  let data = null;
  try { data = await res.json(); } catch (err) { data = null; }
  if (!res.ok) providerError(res.status);
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (typeof text !== 'string' || !text.trim()) providerError(res.status);
  return text.trim();
}

export async function anthropicComplete({ apiKey, model, messages, maxTokens, fetchImpl, signal }) {
  const system = messages.filter(message => message.role === 'system').map(message => message.content).join('\n\n');
  const chat = messages.filter(message => message.role === 'user' || message.role === 'assistant').map(message => {
    if (message.role === 'user' && message.images && message.images.length) {
      const blocks = message.images.map(image => ({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: image.data }
      }));
      blocks.push({ type: 'text', text: textOf(message) });
      return { role: 'user', content: blocks };
    }
    return { role: message.role, content: message.content };
  });
  let res;
  try {
    res = await fetchImpl(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(Object.assign({
        model: model || ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        messages: chat
      }, system ? { system } : {})),
      signal
    });
  } catch (err) {
    providerError(0);
  }
  let data = null;
  try { data = await res.json(); } catch (err) { data = null; }
  if (!res.ok) providerError(res.status);
  const blocks = data && Array.isArray(data.content) ? data.content : [];
  const text = blocks.filter(block => block && block.type === 'text' && typeof block.text === 'string').map(block => block.text).join('\n').trim();
  if (!text) providerError(res.status);
  return text;
}

const ADAPTERS = { openai: openaiComplete, anthropic: anthropicComplete };

export function getAdapter(name) {
  const key = String(name || 'anthropic').trim().toLowerCase();
  return ADAPTERS[key] || null;
}

export function registerAdapter(name, fn) {
  ADAPTERS[String(name).trim().toLowerCase()] = fn;
}
