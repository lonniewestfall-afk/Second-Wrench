/* Ask Second Wrench panel.
 * The public flag stays off. A preview token (?preview=<token>) is stored in
 * the sw_preview cookie and confirmed by the server before the panel is shown.
 * Photos are decoded and re-encoded in the browser so EXIF and GPS are not
 * uploaded. They are not saved in local storage or on the server. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.SW_ASK = api;
    const doc = root.document;
    const search = root.location && root.location.search;
    if (!doc || !doc.body) return;
    if (api.chatVisible(root.SW_CONFIG, search)) api.mount(doc, root.SW_CONFIG, { preview: !!(root.SW_CONFIG && root.SW_CONFIG.aiChatEnabled === 'preview') });
    else api.mountIfPreview(doc, root.SW_CONFIG);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DISCLAIMER = 'Ask Second Wrench is free, AI-generated information. It can be wrong. It is not a licensed HVAC tech, not a diagnosis, and not emergency help. It never overrides an on-page stop screen or the breaker and gas rules. Maker instructions and a licensed pro take priority. For a gas smell, a CO alarm, smoke, or sparks, leave and call 911 or your gas utility from outside. Do not type your address, phone number, or account numbers here.';
  const CREDIT = 'Powered by Claude';

  function chatVisible(config, search) {
    if (!config) return false;
    if (config.aiChatEnabled === true) return true;
    if (config.aiChatEnabled === 'preview') return /(?:^|[?&])aichat=1(?:&|$)/.test(String(search || ''));
    return false;
  }

  function cleanToken(value) {
    const token = String(value || '').trim();
    return /^[A-Za-z0-9._~-]{1,200}$/.test(token) ? token : '';
  }

  function previewCandidate(search, cookie) {
    const query = String(search || '');
    const match = /[?&]preview=([^&#]+)/.exec(query);
    if (match && match[1]) {
      try { return cleanToken(decodeURIComponent(match[1].replace(/\+/g, ' '))); } catch (err) { return ''; }
    }
    const parts = String(cookie || '').split(';');
    for (let i = 0; i < parts.length; i += 1) {
      const item = parts[i].trim();
      if (item.indexOf('sw_preview=') !== 0) continue;
      try { return cleanToken(decodeURIComponent(item.slice('sw_preview='.length))); } catch (err) { return ''; }
    }
    return '';
  }

  function secureSuffix(doc) {
    const view = doc && doc.defaultView;
    return view && view.location && view.location.protocol === 'https:' ? '; Secure' : '';
  }

  function writeCookie(doc, token) {
    doc.cookie = 'sw_preview=' + encodeURIComponent(token) + '; Path=/; Max-Age=2592000; SameSite=Lax' + secureSuffix(doc);
  }

  function clearCookie(doc) {
    doc.cookie = 'sw_preview=; Path=/; Max-Age=0; SameSite=Lax' + secureSuffix(doc);
  }

  function stripPreviewParam(view) {
    if (!view || !view.location || !view.history || !view.history.replaceState) return;
    if (!/[?&]preview=/.test(view.location.search || '')) return;
    const params = new view.URLSearchParams(view.location.search || '');
    params.delete('preview');
    const next = view.location.pathname + (params.toString() ? '?' + params.toString() : '') + (view.location.hash || '');
    try { view.history.replaceState(null, '', next); } catch (err) { /* the cookie already holds the token */ }
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function hrefOk(href) {
    return typeof href === 'string' && /^\/(answers\/|#\/|maintenance\/)/.test(href);
  }

  function fitSize(width, height, maxEdge) {
    const w = Math.max(0, Math.round(Number(width) || 0));
    const h = Math.max(0, Math.round(Number(height) || 0));
    const edge = Math.max(w, h);
    const limit = maxEdge || 1280;
    if (!edge || edge <= limit) return { width: w || 1, height: h || 1 };
    const scale = limit / edge;
    return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
  }

  function reencodeImage(image, canvasFactory) {
    const size = fitSize(image.width, image.height, 1280);
    const canvas = canvasFactory(size.width, size.height);
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof ctx.drawImage !== 'function' || typeof canvas.toDataURL !== 'function') throw new Error('canvas');
    ctx.drawImage(image, 0, 0, size.width, size.height);
    const dataUrl = String(canvas.toDataURL('image/jpeg', 0.82) || '').replace(/\s/g, '');
    const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
    if (!match) throw new Error('encode');
    return { mediaType: 'image/jpeg', data: match[1], dataUrl: dataUrl, width: size.width, height: size.height };
  }

  async function prepareImage(file, doc) {
    if (!file || !/^image\//.test(String(file.type || ''))) throw new Error('type');
    if (file.size > 8000000) throw new Error('large');
    const view = doc && doc.defaultView;
    if (!view || typeof view.createImageBitmap !== 'function') throw new Error('decode');
    const bitmap = await view.createImageBitmap(file);
    try {
      return reencodeImage(bitmap, (width, height) => {
        const canvas = doc.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
      });
    } finally {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
    }
  }

  function ensureStyle(doc) {
    if (doc.getElementById('ask-chat-style')) return;
    const style = doc.createElement('style');
    style.id = 'ask-chat-style';
    style.textContent = [
      '.ask-launch{position:fixed;right:16px;bottom:16px;z-index:80;min-height:44px;padding:10px 16px;border:0;border-radius:999px;background:var(--scarlet,#b82030);color:#fff;font:inherit;font-weight:700;box-shadow:0 8px 24px #00000040}',
      '.ask-launch:hover{background:var(--scarlet-hover,#ce2b3d);color:#fff}',
      '.ask-panel{position:fixed;inset:0;z-index:81;background:var(--paper,#17181b);color:var(--ink,#f2f2f3);display:flex;flex-direction:column}',
      '.ask-panel[hidden]{display:none}',
      '.ask-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:3px solid var(--scarlet,#b82030);background:#111215}',
      '.ask-head h2{margin:0;font-size:1.15rem}',
      '.ask-close{min-height:44px;min-width:44px;border:1px solid var(--line,#45464c);background:transparent;color:inherit;border-radius:9px}',
      '.ask-disclaimer{margin:0;padding:10px 16px;border-bottom:1px solid var(--line,#45464c);font-size:.85rem;line-height:1.4}',
      '.ask-log{flex:1;overflow:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px}',
      '.ask-row{max-width:36rem;padding:10px 12px;border-radius:12px;background:var(--surface,#222328);border:1px solid var(--line,#45464c)}',
      '.ask-row.user{align-self:flex-end;background:#2a1c20;border-color:#6a3038}',
      '.ask-row p{margin:0}',
      '.ask-cites{margin:8px 0 0;padding-left:1.1rem}',
      '.ask-compose{display:flex;gap:8px;padding:12px 16px 8px;border-top:1px solid var(--line,#45464c)}',
      '.ask-compose textarea{flex:1;min-height:44px;max-height:140px;resize:vertical;padding:10px;border-radius:9px;border:1px solid var(--line,#45464c);background:#111215;color:inherit;font-size:16px}',
      '.ask-compose button{min-height:44px;padding:10px 14px;border:0;border-radius:9px;background:var(--scarlet,#b82030);color:#fff;font-weight:700}',
      '.ask-tools{display:flex;align-items:center;gap:8px;padding:0 16px 8px}',
      '.ask-photo{min-height:44px;padding:8px 12px;border:1px solid var(--line,#45464c);background:transparent;color:inherit;border-radius:9px}',
      '.ask-thumbs{display:flex;gap:8px;padding:0 16px 8px;flex-wrap:wrap}',
      '.ask-thumbs img{width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--line,#45464c)}',
      '.ask-credit{margin:0;padding:0 16px 12px;font-size:.75rem;color:#b7b8be}',
      '@media(min-width:760px){.ask-panel{inset:auto 16px 16px auto;width:min(420px,calc(100vw - 32px));height:min(640px,calc(100vh - 32px));border:1px solid var(--line,#45464c);border-radius:16px;box-shadow:0 15px 50px #00000055}}'
    ].join('');
    doc.head.appendChild(style);
  }

  function mount(doc, config, opts) {
    if (!doc || !doc.body) return null;
    const view = doc.defaultView;
    const search = view && view.location ? view.location.search : '';
    const preview = !!(opts && opts.preview);
    if (!preview && !chatVisible(config, search)) return null;
    if (doc.querySelector('.ask-panel')) return doc.querySelector('.ask-panel');
    ensureStyle(doc);
    const history = [];
    const pending = [];
    const launch = doc.createElement('button');
    launch.type = 'button';
    launch.className = 'ask-launch';
    launch.textContent = 'Ask Second Wrench';
    launch.setAttribute('aria-expanded', 'false');
    launch.setAttribute('aria-controls', 'ask-panel');

    const panel = doc.createElement('section');
    panel.className = 'ask-panel';
    panel.id = 'ask-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'ask-title');
    panel.innerHTML = '<div class="ask-head"><h2 id="ask-title">Ask Second Wrench</h2><button type="button" class="ask-close">Close</button></div>'
      + '<p class="fine ask-disclaimer">' + esc(DISCLAIMER) + '</p>'
      + '<div class="ask-log" aria-live="polite"></div>'
      + '<form class="ask-compose"><label class="visually-hidden" for="ask-input" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Your question</label>'
      + '<textarea id="ask-input" maxlength="800" rows="2" placeholder="Heating, cooling, or hot water"></textarea>'
      + '<button type="submit">Send</button></form>'
      + '<div class="ask-tools"><button type="button" class="ask-photo">Add photo</button>'
      + '<input class="ask-file" type="file" accept="image/*" multiple hidden aria-label="Add a photo"></div>'
      + '<div class="ask-thumbs"></div>'
      + (preview ? '<p class="ask-credit">' + esc(CREDIT) + '</p>' : '');

    const log = panel.querySelector('.ask-log');
    const form = panel.querySelector('form');
    const input = panel.querySelector('textarea');
    const send = panel.querySelector('button[type="submit"]');
    const fileInput = panel.querySelector('.ask-file');
    const thumbs = panel.querySelector('.ask-thumbs');

    function addRow(role, text, citations) {
      const row = doc.createElement('div');
      row.className = 'ask-row' + (role === 'user' ? ' user' : '');
      const p = doc.createElement('p');
      p.textContent = text;
      row.appendChild(p);
      if (citations && citations.length) {
        const list = doc.createElement('ul');
        list.className = 'ask-cites';
        citations.forEach(item => {
          if (!item || !hrefOk(item.href)) return;
          const li = doc.createElement('li');
          const a = doc.createElement('a');
          a.href = item.href;
          a.textContent = item.title || item.href;
          li.appendChild(a);
          list.appendChild(li);
        });
        if (list.childNodes.length) row.appendChild(list);
      }
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
    }

    function renderThumbs() {
      thumbs.textContent = '';
      pending.forEach(image => {
        const img = doc.createElement('img');
        img.src = image.dataUrl;
        img.alt = 'Photo to send';
        thumbs.appendChild(img);
      });
    }

    function dropPhotos() {
      pending.splice(0, pending.length);
      renderThumbs();
    }

    function openPanel() {
      panel.hidden = false;
      launch.setAttribute('aria-expanded', 'true');
      if (!history.length) addRow('assistant', 'Ask about a heating, cooling, or hot-water problem. Answers stay inside the published guides.');
      input.focus();
    }
    function closePanel() {
      panel.hidden = true;
      launch.setAttribute('aria-expanded', 'false');
      dropPhotos();
      launch.focus();
    }

    launch.addEventListener('click', () => { if (panel.hidden) openPanel(); else closePanel(); });
    panel.querySelector('.ask-close').addEventListener('click', closePanel);
    panel.addEventListener('keydown', event => { if (event.key === 'Escape') closePanel(); });
    panel.querySelector('.ask-photo').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const files = Array.prototype.slice.call(fileInput.files || [], 0, 2);
      fileInput.value = '';
      for (let i = 0; i < files.length; i += 1) {
        if (pending.length >= 2) {
          addRow('assistant', 'You can add up to 2 photos.');
          break;
        }
        try {
          pending.push(await prepareImage(files[i], doc));
        } catch (err) {
          addRow('assistant', 'That photo could not be prepared, so it was not added.');
        }
      }
      renderThumbs();
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const question = input.value.trim();
      if ((!question && !pending.length) || send.disabled) return;
      input.value = '';
      const images = pending.map(image => ({ mediaType: image.mediaType, data: image.data }));
      const content = question || 'What do you see in this photo?';
      history.push({ role: 'user', content: content });
      addRow('user', content);
      dropPhotos();
      send.disabled = true;
      const previous = send.textContent;
      send.textContent = 'Sending…';
      try {
        const fetchImpl = (view && view.fetch) || fetch;
        const messages = history.slice(-6).map((item, index, list) => {
          const row = { role: item.role, content: item.content };
          if (index === list.length - 1 && images.length) row.images = images;
          return row;
        });
        const res = await fetchImpl('/api/ask', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            messages: messages,
            gpc: !!(view && view.navigator && view.navigator.globalPrivacyControl === true)
          })
        });
        let data = {};
        try { data = await res.json(); } catch (err) { data = {}; }
        const message = data && data.message ? data.message : 'The assistant did not answer. The guided check is still here.';
        if (!res.ok && res.status !== 200) addRow('assistant', message, [{ title: 'Start the guided check', href: '/#/' }]);
        else addRow('assistant', message, data.citations || []);
        if (data && data.ok !== false && data.message) history.push({ role: 'assistant', content: data.message });
      } catch (err) {
        addRow('assistant', 'The assistant did not answer. The guided check is still here.', [{ title: 'Start the guided check', href: '/#/' }]);
      } finally {
        send.disabled = false;
        send.textContent = previous;
      }
    });

    doc.body.appendChild(launch);
    doc.body.appendChild(panel);
    return panel;
  }

  async function mountIfPreview(doc, config) {
    if (!doc || !doc.body) return null;
    const view = doc.defaultView;
    const search = view && view.location ? view.location.search : '';
    const token = previewCandidate(search, doc.cookie || '');
    if (!token) return null;
    writeCookie(doc, token);
    stripPreviewParam(view);
    try {
      const fetchImpl = (view && view.fetch) || fetch;
      const res = await fetchImpl('/api/ask', { method: 'GET', credentials: 'same-origin', headers: { accept: 'application/json' } });
      let data = {};
      try { data = await res.json(); } catch (err) { data = {}; }
      if (!res.ok || !data || data.preview !== true) {
        clearCookie(doc);
        return null;
      }
    } catch (err) {
      clearCookie(doc);
      return null;
    }
    return mount(doc, config, { preview: true });
  }

  return {
    chatVisible,
    previewCandidate,
    fitSize,
    reencodeImage,
    mount,
    mountIfPreview,
    disclaimer: DISCLAIMER,
    credit: CREDIT,
    /* Sign-in and voice stay unwired. Photos are re-encoded JPEGs for one send. */
    extensions: { signIn: null, photoInput: 'jpeg', voice: null }
  };
});
