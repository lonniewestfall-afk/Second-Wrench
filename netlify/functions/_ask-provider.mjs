/* Hosted LLM adapters. Phase 1 ships an OpenAI-compatible chat completions client.
 * Add another provider by registering a function with the same arguments. */

export async function openaiComplete({ baseUrl, apiKey, model, messages, maxTokens, fetchImpl, signal }) {
  const root = String(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  const res = await fetchImpl(root + '/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages
    }),
    signal
  });
  let data = null;
  try { data = await res.json(); } catch (err) { data = null; }
  if (!res.ok) {
    const error = new Error('provider');
    error.status = 502;
    throw error;
  }
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (typeof text !== 'string' || !text.trim()) {
    const error = new Error('empty');
    error.status = 502;
    throw error;
  }
  return text.trim();
}

const ADAPTERS = { openai: openaiComplete };

export function getAdapter(name) {
  const key = String(name || 'openai').trim().toLowerCase();
  return ADAPTERS[key] || null;
}

export function registerAdapter(name, fn) {
  ADAPTERS[String(name).trim().toLowerCase()] = fn;
}
