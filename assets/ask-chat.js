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

  const PREVIEW_STORE = 'sw_preview';
  let activePreview = '';

  function previewCandidate(search, cookie, stored) {
    const query = String(search || '');
    const match = /[?&]preview=([^&#]+)/.exec(query);
    if (match && match[1]) {
      try {
        const fromUrl = cleanToken(decodeURIComponent(match[1].replace(/\+/g, ' ')));
        if (fromUrl) return fromUrl;
      } catch (err) { /* fall through to the cookie or stored copy */ }
    }
    const parts = String(cookie || '').split(';');
    for (let i = 0; i < parts.length; i += 1) {
      const item = parts[i].trim();
      if (item.indexOf('sw_preview=') !== 0) continue;
      try {
        const fromCookie = cleanToken(decodeURIComponent(item.slice('sw_preview='.length)));
        if (fromCookie) return fromCookie;
      } catch (err) { /* try the stored copy */ }
    }
    return cleanToken(stored);
  }

  function readStored(view) {
    try { return cleanToken(view && view.localStorage && view.localStorage.getItem(PREVIEW_STORE)); }
    catch (err) { return ''; }
  }

  function writeStored(view, token) {
    try { if (view && view.localStorage) view.localStorage.setItem(PREVIEW_STORE, token); }
    catch (err) { /* the cookie may still be enough */ }
  }

  function clearStored(view) {
    try { if (view && view.localStorage) view.localStorage.removeItem(PREVIEW_STORE); }
    catch (err) { /* nothing was stored */ }
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

  function alertKind(safety) {
    if (!safety || typeof safety !== 'object') return '';
    const code = String(safety.code || '');
    if (safety.action === 'emergency') return 'stop';
    if (code === 'gas_air' || code === 'co_alarm' || code === 'gas_valve' || code === 'smoke_fire' || code === 'sparking') return 'stop';
    if (code === 'panel' || code === 'panel_open' || code === 'live_circuit' || code.indexOf('breaker') === 0) return 'stop';
    return '';
  }

  function appendInline(doc, parent, text) {
    const source = String(text || '');
    const re = /(\*\*[^*]+\*\*|\/answers\/[a-z0-9-]+\/|\/#\/[a-z0-9/-]*|\/maintenance\/)/ig;
    let last = 0;
    let match;
    while ((match = re.exec(source))) {
      if (match.index > last) parent.appendChild(doc.createTextNode(source.slice(last, match.index)));
      const token = match[0];
      if (token.charAt(0) === '*') {
        const strong = doc.createElement('strong');
        strong.textContent = token.slice(2, -2);
        parent.appendChild(strong);
      } else if (hrefOk(token)) {
        const link = doc.createElement('a');
        link.href = token;
        link.textContent = token;
        parent.appendChild(link);
      } else parent.appendChild(doc.createTextNode(token));
      last = match.index + token.length;
    }
    if (last < source.length) parent.appendChild(doc.createTextNode(source.slice(last)));
  }

  function renderRich(doc, container, text) {
    const lines = String(text || '').split('\n');
    let list = null;
    let listKind = '';
    function closeList() { list = null; listKind = ''; }
    if (!String(text || '').trim()) {
      const empty = doc.createElement('p');
      empty.textContent = '';
      container.appendChild(empty);
      return;
    }
    lines.forEach(line => {
      const trimmed = line.trim();
      const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
      const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
      const numbered = /^\d+[.)]\s+(.+)$/.exec(trimmed);
      if (!trimmed) { closeList(); return; }
      if (heading) {
        closeList();
        const h = doc.createElement('h3');
        appendInline(doc, h, heading[2]);
        container.appendChild(h);
        return;
      }
      if (bullet || numbered) {
        const kind = bullet ? 'ul' : 'ol';
        if (!list || listKind !== kind) {
          closeList();
          list = doc.createElement(kind);
          listKind = kind;
          container.appendChild(list);
        }
        const li = doc.createElement('li');
        appendInline(doc, li, (bullet || numbered)[1]);
        list.appendChild(li);
        return;
      }
      closeList();
      const p = doc.createElement('p');
      appendInline(doc, p, trimmed);
      container.appendChild(p);
    });
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

  function mount(doc, config, opts) {
    if (!doc || !doc.body) return null;
    const view = doc.defaultView;
    const search = view && view.location ? view.location.search : '';
    const preview = !!(opts && opts.preview);
    if (!preview && !chatVisible(config, search)) return null;
    if (doc.querySelector('.ask-panel')) return doc.querySelector('.ask-panel');
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
    panel.innerHTML = '<div class="ask-head"><div class="ask-head-copy"><h2 id="ask-title">Ask Second Wrench</h2></div><button type="button" class="ask-close">Close</button></div>'
      + '<div class="ask-notice"><p class="ask-notice-short">Free, AI-generated information. It can be wrong. Not a licensed HVAC tech, not a diagnosis, and not emergency help. <button type="button" class="ask-notice-toggle" aria-expanded="false" aria-controls="ask-disclaimer">Full notice</button></p>'
      + '<p id="ask-disclaimer" class="fine ask-disclaimer" hidden></p></div>'
      + '<div class="ask-log" aria-live="polite"></div>'
      + '<form class="ask-compose"><button type="button" class="ask-photo" aria-label="Add a photo"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 8h3l2-2h6l2 2h3v10H4Z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="13" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/></svg><span>Photo</span></button>'
      + '<input class="ask-file" type="file" accept="image/*" multiple hidden aria-label="Add a photo">'
      + '<label class="ask-sr" for="ask-input">Your question</label>'
      + '<textarea id="ask-input" maxlength="800" rows="2" placeholder="Heating, cooling, or hot water"></textarea>'
      + '<button type="submit">Send</button></form>'
      + '<div class="ask-thumbs"></div>';
    panel.querySelector('.ask-disclaimer').textContent = DISCLAIMER;
    if (preview) {
      const credit = doc.createElement('p');
      credit.className = 'ask-credit';
      credit.textContent = CREDIT;
      panel.querySelector('.ask-head-copy').appendChild(credit);
    }
    const noticeToggle = panel.querySelector('.ask-notice-toggle');
    const disclaimerEl = panel.querySelector('.ask-disclaimer');
    noticeToggle.addEventListener('click', () => {
      const open = disclaimerEl.hidden;
      disclaimerEl.hidden = !open;
      noticeToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      noticeToggle.textContent = open ? 'Hide notice' : 'Full notice';
    });

    const log = panel.querySelector('.ask-log');
    const form = panel.querySelector('form');
    const input = panel.querySelector('textarea');
    const send = panel.querySelector('button[type="submit"]');
    const fileInput = panel.querySelector('.ask-file');
    const thumbs = panel.querySelector('.ask-thumbs');

    function addRow(role, text, citations, safety) {
      const row = doc.createElement('div');
      const stop = role !== 'user' && alertKind(safety);
      row.className = 'ask-row' + (role === 'user' ? ' user' : ' assistant') + (stop ? ' ask-alert' : '');
      if (stop) {
        const kicker = doc.createElement('p');
        kicker.className = 'ask-kicker';
        kicker.textContent = 'Stop';
        row.appendChild(kicker);
      }
      const body = doc.createElement('div');
      body.className = 'ask-body';
      if (role === 'user') {
        const p = doc.createElement('p');
        p.textContent = text;
        body.appendChild(p);
      } else renderRich(doc, body, text);
      row.appendChild(body);
      if (citations && citations.length) {
        const chips = doc.createElement('div');
        chips.className = 'ask-chips';
        citations.forEach(item => {
          if (!item || !hrefOk(item.href)) return;
          const a = doc.createElement('a');
          a.href = item.href;
          a.textContent = item.title || item.href;
          chips.appendChild(a);
        });
        if (chips.childNodes.length) row.appendChild(chips);
      }
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
    }

    function showTyping() {
      const existing = log.querySelector('.ask-typing');
      if (existing) existing.remove();
      const row = doc.createElement('div');
      row.className = 'ask-row assistant ask-typing';
      row.innerHTML = '<span class="ask-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="ask-sr">Answering</span>';
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
    }
    function hideTyping() {
      const existing = log.querySelector('.ask-typing');
      if (existing) existing.remove();
    }
    let lockedScroll = 0;
    function lockPage(lock) {
      if (!doc.body || !view) return;
      if (lock) {
        lockedScroll = view.scrollY || doc.documentElement.scrollTop || 0;
        doc.documentElement.classList.add('ask-lock');
        doc.body.classList.add('ask-lock');
        doc.body.style.top = '-' + lockedScroll + 'px';
        return;
      }
      doc.documentElement.classList.remove('ask-lock');
      doc.body.classList.remove('ask-lock');
      doc.body.style.top = '';
      view.scrollTo(0, lockedScroll);
    }
    function fitPanel() {
      if (!view || panel.hidden) return;
      const narrow = view.innerWidth < 760;
      const vv = view.visualViewport;
      const keyboard = !!(narrow && vv && vv.height < view.innerHeight - 80);
      if (!keyboard) {
        panel.style.top = '';
        panel.style.right = '';
        panel.style.bottom = '';
        panel.style.left = '';
        panel.style.height = '';
        return;
      }
      panel.style.top = Math.round(vv.offsetTop) + 'px';
      panel.style.left = '0';
      panel.style.right = '0';
      panel.style.bottom = 'auto';
      panel.style.height = Math.max(180, Math.round(vv.height)) + 'px';
    }
    if (view) {
      view.addEventListener('resize', fitPanel);
      if (view.visualViewport) {
        view.visualViewport.addEventListener('resize', fitPanel);
        view.visualViewport.addEventListener('scroll', fitPanel);
      }
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
      lockPage(view && view.innerWidth < 760);
      if (!history.length) addRow('assistant', 'Ask about a heating, cooling, or hot-water problem. Answers stay inside the published guides.');
      fitPanel();
      input.focus();
    }
    function closePanel() {
      panel.hidden = true;
      launch.setAttribute('aria-expanded', 'false');
      dropPhotos();
      panel.style.top = '';
      panel.style.height = '';
      lockPage(false);
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
      showTyping();
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
          headers: Object.assign({ 'content-type': 'application/json' }, activePreview ? { 'x-sw-preview': activePreview } : {}),
          body: JSON.stringify({
            messages: messages,
            gpc: !!(view && view.navigator && view.navigator.globalPrivacyControl === true)
          })
        });
        let data = {};
        try { data = await res.json(); } catch (err) { data = {}; }
        const message = data && data.message ? data.message : 'The assistant did not answer. The guided check is still here.';
        const safety = data && data.safety;
        hideTyping();
        if (!res.ok && res.status !== 200) addRow('assistant', message, [{ title: 'Start the guided check', href: '/#/' }], safety);
        else addRow('assistant', message, data.citations || [], safety);
        if (data && data.ok !== false && data.message) history.push({ role: 'assistant', content: data.message });
      } catch (err) {
        hideTyping();
        addRow('assistant', 'The assistant did not answer. The guided check is still here.', [{ title: 'Start the guided check', href: '/#/' }]);
      } finally {
        hideTyping();
        send.disabled = false;
        send.textContent = previous;
      }
    });

    doc.body.classList.add('ask-available');
    doc.body.appendChild(launch);
    doc.body.appendChild(panel);
    return panel;
  }

  async function mountIfPreview(doc, config) {
    if (!doc || !doc.body) return null;
    const view = doc.defaultView;
    const search = view && view.location ? view.location.search : '';
    const token = previewCandidate(search, doc.cookie || '', readStored(view));
    if (!token) return null;
    writeCookie(doc, token);
    writeStored(view, token);
    activePreview = token;
    try {
      const fetchImpl = (view && view.fetch) || fetch;
      const res = await fetchImpl('/api/ask', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { accept: 'application/json', 'x-sw-preview': token }
      });
      let data = {};
      try { data = await res.json(); } catch (err) { data = {}; }
      if (!res.ok || !data || data.preview !== true) {
        clearCookie(doc);
        clearStored(view);
        activePreview = '';
        return null;
      }
    } catch (err) {
      /* Keep the link and the stored token so a later load can try again. */
      return null;
    }
    stripPreviewParam(view);
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
