/* Ask Second Wrench text panel.
 * Phase 1 is typed text only. Sign-in, photo input, and real-time voice are
 * extension points on SW_ASK.extensions and stay null until a later phase.
 * Do not surface advanced repairs, the equipment catalog, or contractor referrals. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.SW_ASK = api;
    const search = root.location && root.location.search;
    if (api.chatVisible(root.SW_CONFIG, search) && root.document && root.document.body) api.mount(root.document, root.SW_CONFIG);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DISCLAIMER = 'Free informational guidance — not a licensed HVAC tech, not a diagnosis, and not emergency help. Manufacturer instructions and a professional take priority. For a gas smell, a CO alarm, smoke, or sparks, leave and call 911 or your gas utility from outside.';

  function chatVisible(config, search) {
    if (!config) return false;
    if (config.aiChatEnabled === true) return true;
    if (config.aiChatEnabled === 'preview') return /(?:^|[?&])aichat=1(?:&|$)/.test(String(search || ''));
    return false;
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function hrefOk(href) {
    return typeof href === 'string' && /^\/(answers\/|#\/|maintenance\/)/.test(href);
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
      '.ask-disclaimer{margin:0;padding:10px 16px;border-bottom:1px solid var(--line,#45464c)}',
      '.ask-log{flex:1;overflow:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px}',
      '.ask-row{max-width:36rem;padding:10px 12px;border-radius:12px;background:var(--surface,#222328);border:1px solid var(--line,#45464c)}',
      '.ask-row.user{align-self:flex-end;background:#2a1c20;border-color:#6a3038}',
      '.ask-row p{margin:0}',
      '.ask-cites{margin:8px 0 0;padding-left:1.1rem}',
      '.ask-compose{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--line,#45464c)}',
      '.ask-compose textarea{flex:1;min-height:44px;max-height:140px;resize:vertical;padding:10px;border-radius:9px;border:1px solid var(--line,#45464c);background:#111215;color:inherit;font-size:16px}',
      '.ask-compose button{min-height:44px;padding:10px 14px;border:0;border-radius:9px;background:var(--scarlet,#b82030);color:#fff;font-weight:700}',
      '@media(min-width:760px){.ask-panel{inset:auto 16px 16px auto;width:min(420px,calc(100vw - 32px));height:min(640px,calc(100vh - 32px));border:1px solid var(--line,#45464c);border-radius:16px;box-shadow:0 15px 50px #00000055}}'
    ].join('');
    doc.head.appendChild(style);
  }

  function mount(doc, config) {
    if (!doc || !doc.body) return null;
    const view = doc.defaultView;
    const search = view && view.location ? view.location.search : '';
    if (!chatVisible(config, search)) return null;
    if (doc.querySelector('.ask-panel')) return doc.querySelector('.ask-panel');
    ensureStyle(doc);
    const history = [];
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
      + '<button type="submit">Send</button></form>';

    const log = panel.querySelector('.ask-log');
    const form = panel.querySelector('form');
    const input = panel.querySelector('textarea');
    const send = panel.querySelector('button[type="submit"]');

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

    function openPanel() {
      panel.hidden = false;
      launch.setAttribute('aria-expanded', 'true');
      if (!history.length) addRow('assistant', 'Ask about a heating, cooling, or hot-water problem. Answers stay inside the published guides.');
      input.focus();
    }
    function closePanel() {
      panel.hidden = true;
      launch.setAttribute('aria-expanded', 'false');
      launch.focus();
    }

    launch.addEventListener('click', () => { if (panel.hidden) openPanel(); else closePanel(); });
    panel.querySelector('.ask-close').addEventListener('click', closePanel);
    panel.addEventListener('keydown', event => { if (event.key === 'Escape') closePanel(); });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const question = input.value.trim();
      if (!question || send.disabled) return;
      input.value = '';
      history.push({ role: 'user', content: question });
      addRow('user', question);
      send.disabled = true;
      const previous = send.textContent;
      send.textContent = 'Sending…';
      try {
        const fetchImpl = (view && view.fetch) || fetch;
        const res = await fetchImpl('/api/ask', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            messages: history.slice(-6),
            gpc: !!(view && view.navigator && view.navigator.globalPrivacyControl === true),
            preview: config && config.aiChatEnabled === 'preview'
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

  return {
    chatVisible,
    mount,
    disclaimer: DISCLAIMER,
    /* Later phases assign these. Null means the control is not rendered. */
    extensions: { signIn: null, photoInput: null, voice: null }
  };
});
