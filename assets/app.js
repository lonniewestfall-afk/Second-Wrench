(function () {
  'use strict';
  const C = window.SW_CONFIG, F = window.SW_FLOW;
  if (!C || !F) return;
  const main = document.getElementById('main');
  let state = null, toastTimer, feedbackDraft = {}, feedbackId = '', feedbackSent = false, note = {}, lastActivity = '', submitting = false;
  let termsChecked = false, feedbackConsent = false;
  let catalogChecked = false, serialStatus = '', photoHelperUsed = false, photoUrl = '', catalogSentFor = '';
  let catalogEvents = [], recordCode = '', catalogError = '', catalogDiscardUnit = false, repromptArmed = false;
  let catalogOffer = false, catalogRegion = '', catalogZip = '', catalogBrand = '', catalogBrandOther = '';
  let catalogModel = '', catalogSerial = '', catalogRole = '', catalogResultSeen = '', catalogResultTracked = '', catalogViewedRoute = '';
  let myDataCode = '', myDataMessage = '', myDataCopy = '', followupUnsure = false;
  let referralOpen = false, referralShare = false, referralPhoneOk = false, referralDeclined = false;
  let referralZip = '', referralName = '', referralEmail = '', referralPhone = '', referralError = '', referralStatus = '';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const local = location.protocol === 'file:' || ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
  const routes = new Set(['/', '/check', '/result', '/feedback', '/about', '/safety', '/terms', '/privacy', '/disclosures', '/sources']);
  document.getElementById('version').textContent = C.version;
  const advancedOn = C.advancedRepairsEnabled === true;
  if (advancedOn) {
    const bar = document.querySelector('.beta-bar');
    if (bar) bar.innerHTML = 'Private sandbox. Advanced capacitor path is enabled in this copy only. <span>Not the public beta · not an emergency service</span>';
  }
  const ADVANCED_OFF_LINE = 'Advanced repair steps are not enabled. Call a licensed HVAC professional.';
  const RESULT_FOOTER_LINE = 'General guidance only. Not a diagnosis. Call a licensed HVAC pro for repair.';
  const EMERGENCY_RESULT_LINE = 'Get to safety. Call 911 if there is fire, smoke, or immediate danger. This site is not an emergency service.';
  const HOME_START_LINE = 'Free beta · Informational only · Not a licensed HVAC tech · Not a diagnosis';
  const SOCIAL_FOLLOW = '<nav class="social-follow" aria-label="Follow Second Wrench"><span class="social-follow-label">Follow Second Wrench</span><a href="https://x.com/SecondWrench" target="_blank" rel="noopener noreferrer" aria-label="Second Wrench on X"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M14.7 10.3 21.4 3h-1.6l-5.8 6.4L9.2 3H3.5l7 9.9L3.5 21h1.6l6.2-6.8L14.8 21h5.7l-7.3-10.7Zm-2.2 2.4-.7-1-5.6-7.7h2.4l4.5 6.3.7 1 5.9 8.1h-2.4l-4.8-6.7Z"/></svg><span>X</span></a><a href="https://www.facebook.com/profile.php?id=61595153885270" target="_blank" rel="noopener noreferrer" aria-label="Second Wrench on Facebook"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M14.5 21v-7.2h2.4l.4-2.8h-2.8V9.2c0-.8.2-1.4 1.4-1.4H17.4V5.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2h-2.6v2.8h2.6V21h3.2Z"/></svg><span>Facebook</span></a><a href="https://www.reddit.com/user/SecondWrench/" target="_blank" rel="noopener noreferrer" aria-label="Second Wrench on Reddit"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="13.6" r="6.1" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="9.3" cy="13" r="1.05" fill="currentColor"/><circle cx="14.7" cy="13" r="1.05" fill="currentColor"/><path d="M9.2 15.8c.9.75 4.7.75 5.6 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 7.6 16.2 6.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="17.5" cy="6.4" r="1.25" fill="currentColor"/></svg><span>Reddit</span></a></nav>';
  const FEEDBACK_WARNING = 'Optional. Do not include passwords, serial photos you shouldn’t share, or medical details.';
  const icon = (name, cls = '') => {
    const shapes = {
      snow: '<path d="M12 2v20M3.4 7l17.2 10M3.4 17L20.6 7M8 4l4 3 4-3M8 20l4-3 4 3M3 11l4-2-1-5M21 13l-4 2 1 5M3 13l4 2-1 5M21 11l-4-2 1-5"/>',
      power: '<path d="M12 2v9M6.3 5.7a9 9 0 1 0 11.4 0"/>',
      screen: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h5M9 17h6"/>',
      air: '<path d="M3 8h12c6 0 6-6 2-6M3 12h16c5 0 5 7 0 7M3 16h8c5 0 5 6 1 6"/>',
      drop: '<path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
      noise: '<path d="M3 10h4l5-5v14l-5-5H3ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/>',
      shield: '<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6Z"/><path d="m8 12 3 3 5-6"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      note: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
      arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>'
    };
    return '<svg class="'+esc(cls)+'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(shapes[name] || shapes.shield)+'</svg>';
  };
  function toast(text) {
    const t = document.getElementById('toast'); t.textContent = text; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
  }
  function go(path) {
    if (location.hash === '#' + path) render(); else location.hash = path;
  }
  function start(seed = '', mode = 'real') {
    if (state && state.telemetry) sendActivity('end_by_user');
    state = F.create(seed, mode); note = {}; lastActivity = ''; feedbackSent = false;
    feedbackId = ''; feedbackDraft = {}; termsChecked = false; feedbackConsent = false; resetCatalogDraft(); resetReferralDraft(); go('/check');
  }
  function hostReady(formId) {
    // Netlify removes data-netlify after detecting the form. A generic static host
    // that returns index.html for POST must never look like successful collection.
    const schema = document.getElementById(formId);
    return !local && C.formsEnabled && schema && !schema.hasAttribute('data-netlify') &&
      schema.querySelector('[name="form-name"]');
  }
  async function postForm(name, data, formId, keepalive = false) {
    if (!hostReady(formId)) throw new Error('Online feedback is not connected in this copy. Your message has not been sent. Save it or open an email draft below.');
    const body = new URLSearchParams({ 'form-name': name, 'bot-field': '', ...data });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/thanks.html', { method: 'POST', headers: { 'Content-Type':'application/x-www-form-urlencoded' }, body: body.toString(), signal: controller.signal, keepalive });
      if (!response.ok) throw new Error('The server did not accept this submission. Your message is still here. Please save it or try again.');
      return true;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The request timed out. Delivery is unconfirmed; save your feedback before retrying.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  function sendActivity(event, exit = false) {
    if (!state || !state.telemetry || !hostReady('session-schema')) return;
    const data = { ...F.activity(state), event, version: C.version, content_version: C.contentVersion };
    const key = event + '|' + data.path;
    if (key === lastActivity) return;
    lastActivity = key;
    postForm('beta-session', data, 'session-schema', exit).catch(() => { /* Best effort, never block safety. */ });
  }
  function setContent(html, title) {
    main.innerHTML = html;
    document.title = title + ' — Second Wrench';
    main.focus({ preventScroll: true }); window.scrollTo({ top:0, behavior:'instant' });
  }
  function home() {
    return '<div class="wrap"><section class="hero"><div><div class="eyebrow">Second Wrench <span class="pill"><span class="dot"></span>Beta</span></div><h1>Why isn’t my<br>system<br><em>working?</em></h1><p class="intro">Heating, cooling, thermostat, or hot-water trouble? Answer a few straightforward questions, try eligible homeowner checks, and leave with a useful note for your service company.</p><p class="intro">Free home maintenance checklists — see what your manual asks for between pro visits.</p><p><a href="/maintenance/">Free Maintenance</a> · <a href="/answers/">Answers</a></p><p class="brand-promise">Know what to check. Know when to stop.<br>Know when to call.</p><div class="hero-cta"><div class="button-row"><button class="button" data-action="start">Start '+icon('arrow')+'</button></div><p class="cta-note legal-start">'+HOME_START_LINE+'</p><p class="cta-note">No account needed · Safety first · Choose your check</p><button class="text-button test-cta" data-action="test">Just testing? Answer hypothetically.</button>'+SOCIAL_FOLLOW+'</div></div><div class="hero-card"><p class="card-kicker">One check</p><h2>Find the help you need.</h2><ol class="start-steps"><li><strong>Safety first.</strong> Hazards stop the check before any troubleshooting.</li><li><strong>Choose your check.</strong> Thermostat help, heating and cooling, and hot water have their own sections. Pick your equipment directly, or get help identifying it.</li><li><strong>One question at a time.</strong> See the next useful check, the limits, and when to call.</li></ol><p class="fine">'+icon('shield')+'<span>You can always choose “not sure” or stop and get help.</span></p></div></section><div class="trust-strip"><span>'+icon('shield')+'Clear stopping points</span><span>'+icon('check')+'No guesswork on parts</span><span>'+icon('note')+'A brief service-call note</span></div><section class="section"><div class="section-heading"><div class="eyebrow">A little clarity goes a long way</div><h2>You do not need to<br>sound like a technician.</h2><p>Tell us what you notice. We will help separate a limited homeowner check from a job that needs a professional.</p></div><div class="three-grid"><article class="step-card"><span class="number">01 / NOTICE</span><h3>Name the system, then the symptom.</h3><p>Start with what you know: a blank thermostat, a cold room, weak airflow, no hot water, or equipment that will not heat or cool. We ask about things you can observe without opening equipment.</p></article><article class="step-card"><span class="number">02 / CHECK</span><h3>Stay within clear limits.</h3><p>Check normal settings or eligible owner maintenance. Uncertain access, alarms, electrical problems, and refrigerant work take a different path.</p></article><article class="step-card"><span class="number">03 / KNOW WHAT IS NEXT</span><h3>Leave with a useful next step.</h3><p>Understand the boundary, record any improvement, or copy a short note for your service company. Observations, not a guessed diagnosis.</p></article></div></section><section class="section"><div class="section-heading"><div class="eyebrow">More ways to find your next step</div><h2>Different systems. Clear questions.</h2></div><div class="three-grid"><article class="step-card"><h3>Thermostats</h3><p>Blank screens, schedules, holds, Wi-Fi, fan settings, and Emergency Heat, with menu guides for selected models. No wiring changes.</p></article><article class="step-card"><h3>Furnaces and air handlers</h3><p>Gas, oil, electric heat, and hydronic coils. Includes manufactured homes, room airflow, exterior vents, and codes already showing.</p></article><article class="step-card"><h3>Boilers and hydronic heat</h3><p>Radiators, hot-water baseboard, radiant floors, and steam. Water-side and air-side questions connect when an air handler uses a hot-water coil.</p></article><article class="step-card"><h3>Water heaters</h3><p>Tank, tankless, and heat pump water heaters, plus boilers that also heat tap water. Hot-water questions have their own starting point.</p></article><article class="step-card"><h3>AC and heat pumps</h3><p>Settings, filters, weak airflow, ice, and outdoor observations, with separate questions for heating, cooling, defrost, and backup heat. Includes side-discharge outdoor units.</p></article><article class="step-card"><h3>Mini-splits</h3><p>One indoor unit or several rooms: remote controls, conflicting modes, eligible filters, water, ice, and outdoor-unit concerns.</p></article><article class="step-card"><h3>Geothermal and water-source</h3><p>A dedicated starting point for indoor water-source and geothermal heat pumps, with hazard screening and a service note.</p></article></div></section><section class="safety-feature"><div><div class="eyebrow">A symptom is not a diagnosis</div><h2>No risky shortcuts.<br>No parts roulette.</h2></div><div><p>The guide covers common heating, cooling, thermostat, and hot-water concerns, including boilers and hydronic air handlers. It gives observations, limited owner steps, and clear handoffs for professional work. It does not guide electrical repairs, gas work, refrigerant handling, or bypassing a safety device. '+ADVANCED_OFF_LINE+'</p><a href="#/safety">Read the safety boundaries →</a></div></section><p class="quiet-note">Free public beta. Try it on your own system and tell us what was clear or confusing. <a href="#/feedback">Feedback is optional.</a></p></div>';
  }
  function sidebar() {
    const count = state.answers.filter(a=>!['ac.gate.cluster_entry','ac.session.consent','sw.intake.system_type','sw.intake.other_system'].includes(a.node)).length;
    const onHp = state.product === 'hp';
    const onAc = state.product === 'ac';
    const onWshp = state.product === 'wshp';
    const onFn = state.product === 'fn';
    const onMs = state.product === 'ms';
    const onTs = state.product === 'ts';
    const onBl = state.product === 'bl', onWh = state.product === 'wh', onSd = state.product === 'sd';
    const fnLimit = 'No furnace doors or panels off. Never relight a pilot, press a reset button, or touch the gas valve. Furnace breakers are never reset. An identified external switch uses a separate eligibility check. Advanced repairs are off.';
    const hpLimit = 'No covers off. No gauges or refrigerant. Do not force the reversing valve. Outdoor power checks are visual only. This heat-pump path does not include capacitor or contactor work.';
    const dualFuel = onHp && (state.hpGasFurnace === 'yes' || state.hpGasFurnace === 'not_sure');
    const limit = onBl
        ? 'Observe only. Do not touch hot pipes, add or drain water, bleed radiators, open valves, reset controls, or open equipment. A thermostat set to Off may not stop other zones or hot-water calls.'
      : onWh
        ? 'Keep away from hot water and steam. Do not open covers, relight a pilot, cycle a breaker, or flush the heater. Change a temperature dial, reset once, or lift a relief lever only when this guide shows that step.'
      : onSd
        ? 'Look from dry, level ground. Keep hands and tools outside grilles and away from fins. No ice removal, mounting changes, refrigerant, or electrical work.'
      : onFn
        ? fnLimit
      : onWshp
        ? 'Water-source / geothermal heat pumps, 6 tons or less, in a home. This beta gives safety screens and a service note for a pro. It gives no loop, well, water-treatment, refrigerant, or electrical steps.'
      : onTs
        ? 'Settings only. No wires, no covers. Some installer settings have steps; the ones that protect your equipment don’t. Low-voltage thermostats only.'
      : onMs
        ? 'No covers off. No ladders, chairs, or tools. Clean filters only when the manual shows a tool-free path from the floor. A breaker, outdoor disconnect, or service switch uses the shared power-off wording, and the panel cover and the disconnect box stay closed. Unplugging still stops here. No refrigerant or electrical work. No defrost buttons. Look at the outdoor unit only from a window or dry ground.'
      : dualFuel
        ? hpLimit + ' ' + fnLimit
      : onHp
        ? hpLimit
        : onAc
          ? 'No covers off. No fingers or objects through a grille. The outdoor disconnect step is visual only — it does not tell you to flip the lever. No wiring or refrigerant tests.'
          : 'No covers off. Safety comes first, then what kind of system this is. Do not open equipment to find out.';
    return '<aside class="sidebar"><div class="progress" aria-hidden="true"><span class="done"></span><span class="'+(state.consent?'done':'')+'"></span><span class="'+(count>4?'done':'')+'"></span></div><h2>Your pace. Your choice.</h2><p>Answer only what you know. Do not approach equipment to prove an answer.</p><div class="side-box"><h2>No tools needed to begin.</h2><p>'+limit+'</p>'+(!advancedOn && /capacitor|Advanced/i.test(limit) ? '<p class="fine advanced-off">'+ADVANCED_OFF_LINE+'</p>' : '')+'<button class="text-button" data-action="stop">Get help now</button></div><div class="side-box"><p>Something unclear?</p><a href="#/feedback">Flag this question</a><p class="fine">Feedback is not monitored for emergencies.</p></div></aside>';
  }
  function ownerStep(node) {
    if (node.noticePrompt) return '<section class="caution owner-notice"><h2>Before you start</h2>'+node.noticePrompt.split('\n').map(x=>'<p>'+esc(x)+'</p>').join('')+'<label class="check-label"><input type="checkbox" data-owner-notice="ack"><span>'+esc(node.ackLabel)+'</span></label></section>';
    const p=node.step;if(!p)return '';
    return '<section class="owner-step"><p class="fine">Do only the step shown. If anything looks different or you see a hazard sign, stop. You can always call a licensed HVAC professional.</p><p><strong>What this does:</strong> '+esc(p.what)+'</p><p class="caution"><strong>Caution:</strong> '+esc(p.caution)+'</p><p class="source-note">'+esc(p.source)+'</p><ol class="action-list">'+(p.steps||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol><p><strong>Watch:</strong> '+esc(p.watch)+'</p><p><strong>Stop:</strong> '+esc(p.stop)+'</p><p>'+esc(p.undo||'')+'</p><p class="fine">'+esc(p.locked||'')+'</p></section>';
  }
  function flow() {
    if (!state) { state = F.create(); }
    if (state.result) { go('/result'); return ''; }
    const node = (F.viewNode ? F.viewNode(state.node, state) : F.nodes[state.node]);
    const count = state.answers.filter(a=>!['ac.gate.cluster_entry','ac.session.consent','sw.intake.system_type','sw.intake.other_system','sw.co.fast_exit'].includes(a.node)).length + 1;
    const advancedLine = (!advancedOn && node && /Advanced/i.test([node.title, node.body, node.caution].concat((node.options||[]).map(function (op) { return (op.label||'') + ' ' + (op.hint||''); })).join(' '))) ? '<p class="fine advanced-off">'+ADVANCED_OFF_LINE+'</p>' : '';
    const systemUI = state.node === 'sw.intake.system_type';
    const consentUI = state.node === 'ac.session.consent';
    const coScreen = state.node === 'sw.co.fast_exit';
    const emergencyFirst = state.node === 'ac.gate.cluster_entry';
    syncReprompt();
    const repromptUI = !consentUI && needsReprompt();
    const blockAnswer = repromptUI && !termsChecked;
    const terms = '<label class="check-label"><input id="agree" type="checkbox"'+(termsChecked?' checked':'')+'><span>I am 18 or older. I have read the <a href="#/terms">Terms</a> and <a href="#/privacy">Privacy</a> notes. I understand this is free informational guidance — not a licensed HVAC tech, not a diagnosis, and not emergency help. Manufacturer instructions and a professional take priority. I may stop and call a pro anytime.</span></label>';
    const leadBody = String(systemUI ? 'Choose from what you already know. Do not open equipment or climb to identify it.' : node.body || '').replace(/\n*\{step panel:[^}]+\}\s*/g, '\n\n').trim();
    const panelHtml = (state.product === 'ts' && F.renderTsPanel && /\{step panel:/.test(node.body || '')) ? F.renderTsPanel(state.tsModel, state.node, { state: state }).html : ownerStep(node);
    const tsAffiliation = state.product === 'ts' && F.tsLc ? '<p class="fine ts-affiliation">'+esc(F.tsLc.lc1)+'</p>' : '';
    const renderOption = op => {const agreeBtn=consentUI&&op.id==='agree_18_terms';const pre=state.preselectChoice===op.id?' preselected':'';const hazardChoice=op.id==='hazard_now'||/^hazard_/.test(op.id)||op.id==='cold_exposure_risk'||op.id==='hot_water_or_steam'||op.id==='water_steam_release'||op.id==='bang_or_puffback'||op.id==='steam_glass_empty'||op.id==='soot_scorch_flame'||op.id==='pressure_at_relief';return '<button class="option'+(op.id==='none_of_these'?' safe':'')+((emergencyFirst&&op.id!=='none_of_these')||hazardChoice?' stop-option':'')+pre+'" data-answer="'+esc(op.id)+'" '+(op.disabled||blockAnswer?'disabled aria-disabled="true" ': '')+(blockAnswer?'data-reprompt-lock="1" ': '')+(agreeBtn?'id="continue-consent"'+(termsChecked?'':' disabled'):'')+'><span><strong>'+esc(op.label)+'</strong>'+(op.hint&&!agreeBtn?'<small>'+esc(op.hint)+'</small>':'')+'</span><span class="arrow" aria-hidden="true">→</span></button>';};
    const optionsHtml = systemUI ? '<div class="system-menu">'+F.systemMenu().map(group=>'<section class="system-group system-group--'+esc(group.id)+'" aria-labelledby="system-'+esc(group.id)+'"><h2 id="system-'+esc(group.id)+'">'+esc(group.title)+'</h2><div class="options system-options">'+group.choices.map(renderOption).join('')+'</div></section>').join('')+'</div>' : '<div class="options">'+node.options.map(renderOption).join('')+'</div>';
    return '<div class="flow-wrap"><div class="flow-top"><a href="#/">← Home</a><span>'+ (coScreen||emergencyFirst?'Safety comes first':systemUI?'Choose your check':'Question '+count+' · The length depends on your answers')+'</span></div>'+(state.mode==='test'?'<div class="mode-banner">TEST SCENARIO · Answer hypothetically. Do not perform work to test the website.</div>':'')+'<div class="flow-layout"><section class="flow-card" data-node="'+esc(state.node)+'"><div class="eyebrow">'+esc(node.section)+'</div><h1>'+esc(systemUI?'What would you like help with?':node.title)+'</h1><p class="lead">'+esc(leadBody)+'</p>'+panelHtml+(node.caution?'<div class="caution">'+esc(node.caution)+'</div>':'')+advancedLine+(consentUI?terms+catalogConsentHtml():'')+(repromptUI?terms:'')+optionsHtml+'<p id="flow-error" class="inline-error" role="alert"></p>'+(emergencyFirst?'<p class="source-note">For immediate danger in the U.S. or Canada, move away and call 911. Elsewhere, use your local emergency number. <a href="#/sources">Safety references</a></p>':'<p class="source-note">'+esc(C.contentVersion)+' · <a href="#/safety">Scope and safety</a></p>')+tsAffiliation+'</section>'+sidebar()+'</div></div>';
  }
  function analogResultExtras(r) {
    if (!r) return '';
    const linkPhrase = (text, link) => {
      const raw = String(text || '');
      if (!link || !link.phrase || String(link.href || '').indexOf('https://thermostat-recycle.org/') !== 0) return esc(raw);
      const phrase = String(link.phrase);
      const at = raw.indexOf(phrase);
      if (at < 0) return esc(raw);
      return esc(raw.slice(0, at)) + '<a href="' + esc(link.href) + '">' + esc(phrase) + '</a>' + esc(raw.slice(at + phrase.length));
    };
    const script = (r.script || []).map(line => '<p class="ta-script">' + linkPhrase(line.text, line.link) + '</p>').join('');
    const disposal = (r.disposal || []).map(line => '<p class="ta-disposal">' + linkPhrase(line.text, line.link) + '</p>').join('');
    const choices = (r.exits || []).map(op => '<button class="option' + (op.id === 'hazard_now' || op.id === 'broken_bulb' ? ' stop-option' : '') + '" data-result-choice="' + esc(op.id) + '"><span><strong>' + esc(op.label) + '</strong>' + (op.hint ? '<small>' + esc(op.hint) + '</small>' : '') + '</span><span class="arrow" aria-hidden="true">→</span></button>').join('');
    return script + disposal + (choices ? '<div class="options">' + choices + '</div>' : '');
  }
  function resultPage() {
    if (!state || !state.result) { go('/check'); return ''; }
    if (state.result !== catalogResultSeen) { catalogResultSeen = state.result; catalogDiscardUnit = false; }
    const r = F.presentResult ? F.presentResult(state) : F.results[state.result];
    const urgent = ['Emergency','Stop / professional'].includes(r.tier);
    const legalFooter = r.outcome === 'emergency_exit' ? EMERGENCY_RESULT_LINE : RESULT_FOOTER_LINE;
    const advancedFooter = (!advancedOn && /Advanced/i.test([r.title, r.explanation, r.avoid].concat(r.actions||[]).join(' '))) ? '<p class="fine advanced-off">'+ADVANCED_OFF_LINE+'</p>' : '';
    const resumeBtn = r.continueTo ? '<div class="button-row"><button class="button small secondary" data-action="resume-check">'+(r.continueTo==='ac.cool.power.disconnect_visual'?'Outdoor unit still silent — continue to the disconnect visual':'Continue this check')+'</button></div>' : '';
    const nextBtn = r.nextAction ? '<div class="button-row"><button class="button small" data-action="ts-next">'+esc(r.nextAction.label)+'</button></div>' : '';
    const bodyLines = r.body ? String(r.body).split('\n').map(x => x.trim()).filter(Boolean) : [];
    const bodyBlock = bodyLines.length ? '<h2>What to do now</h2>'+bodyLines.map(x => '<p>'+esc(x)+'</p>').join('')+(r.footer ? '<p>'+esc(r.footer)+'</p>' : '') : '';
    const actionBlock = bodyBlock || ((r.actions && r.actions.length) ? '<h2>What to do now</h2><ol class="action-list">'+r.actions.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>' : '');
    const explainHtml = '<p class="explanation">'+esc(r.explanation)+'</p>';
    const headingExplain = r.actionsFirst ? '' : explainHtml;
    const boxExplain = r.actionsFirst ? explainHtml : '';
    const avoidBlock = r.avoid ? '<div class="avoid"><strong>What not to do</strong>'+esc(r.avoid)+'</div>' : '';
    const hazardBtn = urgent ? '<div class="button-row"><button class="button secondary" data-action="stop">Something new or worse? Check for hazards</button></div>' : '';
    const helpNow = '<div class="button-row"><button class="button secondary" data-action="stop">Get help now</button></div>';
    const tsAffiliation = state.product === 'ts' && F.tsLc ? '<p class="fine ts-affiliation">'+esc(F.tsLc.lc1)+'</p>' : '';
    const tellPro = state.product === 'ts' && F.tsTellPro && String(state.result || '').indexOf('ta_') !== 0 ? '<h2>What to tell the pro</h2><ul class="tell-pro">'+F.tsTellPro.map(item => '<li>'+esc(item)+'</li>').join('')+'</ul>' : '';
    return '<div class="result-wrap" data-result="'+esc(state.result)+'"><div class="flow-top"><a href="#/">← Home</a><span>YOUR NEXT STEP · NOT A CONFIRMED DIAGNOSIS</span></div>'+(state.mode==='test'?'<div class="mode-banner">TEST SCENARIO · Do not use this hypothetical result as an equipment evaluation.</div>':'')+'<section class="result-heading '+(urgent?'emergency':'')+'"><span class="pill">'+esc(r.tier)+'</span><h1>'+esc(r.title)+'</h1><p class="urgency">'+esc(r.urgency)+'</p>'+headingExplain+'</section><div class="result-layout"><section class="result-box">'+analogResultExtras(r)+actionBlock+boxExplain+nextBtn+resumeBtn+avoidBlock+hazardBtn+helpNow+'<p class="source-note legal-footer">'+legalFooter+'</p>'+advancedFooter+'<p class="source-note"><a href="#/sources">Sources & content limits</a></p>'+(r.tier==='Emergency'?(state.mode==='test'?'<p class="fine">Test scenario only: do not place an emergency call for this hypothetical result.</p>':'<a class="button danger" href="tel:911">Call 911 from safety</a>'):'')+'</section><section class="result-box"><h2>Your service-call note</h2><p class="fine">Keep it brief for dispatch. Nothing below is a diagnosis. '+(urgent?'Only use this after everyone is out of danger.':'')+'</p><details><summary>Add already-known details (optional)</summary><div class="details-body"><label class="field">Main complaint<input data-note="complaint" maxlength="140" value="'+esc(note.complaint||'')+'" placeholder="Example: AC stopped cooling this morning"></label><label class="field">When it began<input data-note="began" maxlength="100" value="'+esc(note.began||'')+'" placeholder="Example: yesterday afternoon"></label><label class="field">Equipment model <span>— already known only</span><input data-note="model" maxlength="100" value="'+esc(note.model||'')+'" placeholder="Do not open covers or climb to find it"></label>'+('<label class="field">Code (homeowner typed)<input data-note="codes" maxlength="140" value="'+esc(note.codes||'')+'"><span class="fine">From the thermostat, wall control, remote, or app only — don’t open the unit.</span></label>')+'<p class="fine">These details remain in this open page. They are excluded from activity reports and feedback attachments.</p></div></details><pre id="service-note" class="note-pre" tabindex="0">'+esc(F.summary(state,note))+'</pre>'+tellPro+'<div class="button-row"><button class="button small" data-action="copy-note">Copy note</button><button class="button small secondary" data-action="save-note">Save text</button></div></section></div>'+tsAffiliation+catalogResultHtml()+referralResultHtml()+'<div class="result-bottom"><div><p>Was the next step clear?</p><a href="#/feedback">Give beta feedback →</a></div><button class="button secondary small" data-action="new">Start a new check</button></div><p class="fine result-fine">This site does not book a contractor, monitor your equipment, or receive emergency calls. <a class="report-safety" href="#/feedback" data-flag="safety">Report a safety concern in this guidance.</a></p></div>';
  }
  function feedbackData() {
    if (!feedbackId) feedbackId = 'SW-' + (globalThis.crypto?.randomUUID ? crypto.randomUUID().slice(0, 12) : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)).toUpperCase();
    return { report_id: feedbackId, version: C.version, mode: state?state.mode:'site-feedback',
      outcome: feedbackDraft.outcome || '', clarity: feedbackDraft.clarity || '', safety_concern: feedbackDraft.safety ? 'yes':'no',
      email: (feedbackDraft.email || '').trim().slice(0,254), message: (feedbackDraft.message || '').trim().slice(0,2000),
      path_attachment: feedbackDraft.attach && state ? JSON.stringify({mode:state.mode,last_step:state.node||'result',result:state.result||'',answers:state.answers.filter(a=>a.node!=='consent').map(a=>({question:a.node,answer:a.choice}))}) : '',
      use_consent: feedbackConsent ? 'yes' : 'no',
      use_consent_at: new Date().toISOString(),
      terms_version: C.termsVersion,
      privacy_version: C.privacyVersion };
  }
  function feedbackText() {
    const d = feedbackData();
    return 'SECOND WRENCH BETA FEEDBACK\n' + Object.entries(d).map(([k,v])=>k+': '+v).join('\n');
  }
  function feedbackPage() {
    const ready = !!hostReady('feedback-schema');
    const options = (list,value) => list.map(([v,l])=>'<option value="'+esc(v)+'" '+(v===value?'selected':'')+'>'+esc(l)+'</option>').join('');
    const feedbackExtra = '<p class="fine feedback-warning">'+FEEDBACK_WARNING+'</p><label class="check-label optional-check"><input id="feedback-consent" type="checkbox"'+(feedbackConsent?' checked':'')+'><span>Optional: Second Wrench may use this feedback, including in anonymized form, to improve the product.</span></label><p class="fine">Leaving this unchecked is fine. We’ll still read your feedback to look into what you reported and to reply if you asked. Your choice, the time you send, and the Terms and Privacy versions are saved with your report. Don’t include anything you’re not allowed to share. <a href="#/privacy">Privacy</a></p>';
    if(feedbackSent) return content('Thank you for testing.', '<div class="success-message"><h2>Feedback accepted by the form service.</h2><p>Report '+esc(feedbackId)+'. The team may not have read it yet. This is not an emergency or service request.</p><button class="button small secondary" data-action="another-feedback">Send another report</button></div><p><a href="#/">Return home →</a></p>');
    return content('Help make the next check better.', '<p class="lead">A confusing question is useful feedback. So is a result that did not fit. You can stop here without finishing a check.</p><div class="status-box">'+(ready?'Feedback is sent through Netlify Forms when you press Send. Please don’t include addresses, serial numbers, photos, or other personal household details here. If you want to share your equipment’s serial number, use the optional catalog step instead.':'Online submission is not connected in this copy. Nothing is sent automatically. Save your feedback or open an email draft below.')+'</div><form id="feedback-form">'+feedbackExtra+'<label class="field">What happened?<select name="outcome" data-feedback="outcome" required>'+options([['','Choose one'],['improved','The issue improved after a suggested check'],['unchanged','The problem is still there'],['called_pro','I contacted a professional'],['stopped','I stopped or got confused'],['test','I am testing, not troubleshooting equipment'],['other','General website feedback']],feedbackDraft.outcome)+'</select></label><label class="field">Was the next step clear?<select data-feedback="clarity" name="clarity">'+options([['','Optional'],['clear','Yes, clear'],['somewhat','Somewhat'],['unclear','No, unclear']],feedbackDraft.clarity)+'</select></label><label class="field">What should we know? <span>— up to 2,000 characters</span><textarea data-feedback="message" name="message" maxlength="2000" rows="5" placeholder="Example: I did not know what conventional controls meant.">'+esc(feedbackDraft.message||'')+'</textarea></label><label class="check-label optional-check"><input data-feedback="safety" type="checkbox" '+(feedbackDraft.safety?'checked':'')+'><span>This feedback concerns a potentially unsafe instruction or a missing safety stop.</span></label><p class="fine">For a current hazard, use <button type="button" class="text-button" data-action="stop">Stop / get help</button>. Feedback is not monitored for emergencies.</p><label class="field">Email for a reply <span>— optional</span><input type="email" name="email" data-feedback="email" autocomplete="email" maxlength="254" value="'+esc(feedbackDraft.email||'')+'" placeholder="you@example.com"></label>'+(state?'<label class="check-label optional-check"><input type="checkbox" data-feedback="attach" '+(feedbackDraft.attach?'checked':'')+'><span>Attach my answer choices and current result. This doesn’t include your service note or equipment details you typed. Catalog details are only shared through the catalog box.</span></label><details><summary>Preview the optional attachment</summary><pre id="attachment-preview" class="note-pre">'+esc(feedbackData().path_attachment || 'No answer choices will be attached unless you check the box above.')+'</pre></details>':'')+'<label class="hp" aria-hidden="true">Leave blank<input name="bot-field" tabindex="-1" autocomplete="off"></label><div class="button-row">'+(ready?'<button class="button" type="submit" id="send-feedback">Send feedback '+icon('arrow')+'</button>':'')+'<button class="button '+(ready?'secondary':'')+'" type="button" data-action="save-feedback">Save feedback file</button><button class="button secondary" type="button" data-action="email-feedback">Open email draft</button></div><p class="fine">'+(ready?'Sending shares this form with Second Wrench and its form-processing providers. ':'')+'An email draft is not sent until you send it in your mail app. <a href="#/privacy">Privacy details</a>.</p><p id="feedback-error" class="inline-error" role="alert"></p></form>'+(state?'<p><a href="#/'+(state.result?'result':'check')+'">← Return to my '+(state.result?'result':'check')+'</a></p>':''));
  }
  const TERMS_HTML = `<p><strong>Version:</strong> <code>public-beta-2026-10-20.1</code></p>
<p><strong>Effective:</strong> October 18, 2026</p>
<p><strong>Operator:</strong> Second Wrench · <a href="mailto:support@secondwrench.co">support@secondwrench.co</a> · secondwrench.co</p>
<p><strong>Product:</strong> Second Wrench (informational homeowner troubleshooting guides for several types of home HVAC equipment)</p>
<h3>1. What this is</h3>
<p>Second Wrench is a <strong>free public beta</strong> informational website. It helps adult homeowners notice symptoms, separate homeowner checks from professional-only work, and prepare a short note for a service call.</p>
<p>It is <strong>not</strong> a contractor, licensed HVAC technician, emergency service, remote inspection, warranty, insurance, or medical service. It does not remotely control your equipment.</p>
<h3>2. Who can use it</h3>
<p>You must be <strong>18 or older</strong>. Work only on equipment you are authorized to operate or maintain. Tenants should follow the owner’s rules and contact management when needed.</p>
<h3>3. Safety first</h3>
<p>Emergency / hazard help never requires this checkbox.</p>
<p>If you smell gas, see smoke or sparks, have burning smell, standing water near electrical, or any immediate danger: <strong>leave the area, call emergency services if needed, and call a licensed HVAC or electrical professional.</strong> Do not use this site to delay help.</p>
<p>When the site tells you to stop, Call a pro, or leave — <strong>stop</strong>. There is no “accept the risk and continue” bypass after a safety stop.</p>
<h3>4. Not a substitute for a licensed HVAC tech</h3>
<p>Results are general information based on your answers. They can be incomplete or wrong. Hidden problems exist. <strong>Do not treat any result as a confirmed diagnosis.</strong> Manufacturer manuals, codes, and a qualified professional take priority over anything here.</p>
<h3>5. DIY scope in this beta</h3>
<p>This public beta offers <strong>Basic</strong> homeowner observations and maintenance-style checks only (for example filter, thermostat, outdoor clearance, visual breaker/disconnect status — no panel interior work).</p>
<p><strong>Advanced DIY repair procedures are OFF</strong> in this release. The site will not show Advanced repair steps. Suspected capacitor/contactor issues route you to call a professional. Enabling Advanced later is a separate product decision and would require a new Terms version and a fresh agreement.</p>
<p>Do not perform refrigerant, sealed-system, live electrical, panel interior, gas appliance, or other professional-only work based on this site. Applicable refrigerant-certification and local licensing rules still apply. EPA Section 608 is a U.S. requirement.</p>
<p>You may switch a breaker or disconnect off at any time. If a breaker has tripped, you may reset it once: push it firmly all the way to OFF, then back to ON, by hand at the breaker face. Never open the panel cover. If it trips again, won’t stay on, or you notice a burning smell, heat, buzzing, scorch marks or water near the panel, stop and call a licensed pro. Never reset it a second time.</p>
<p>Some guides walk you through homeowner steps such as changing settings, replacing filters, clearing vents, reading codes, or a reset your owner’s manual describes. These steps are optional, general information, not a diagnosis. You choose whether to do them and are responsible for doing them as shown. Changes you make can affect comfort, energy use, equipment wear, and in some cases a warranty. Stop when a step looks different from your equipment or when a hazard appears. Second Wrench never guides refrigerant, gas, combustion-compartment, or live electrical work, or the bypassing of a safety device.</p>
<h3>6. You assume the risk</h3>
<p>HVAC equipment and home maintenance involve electrical, mechanical, fire, fall, and property-damage risk. You decide whether a suggested check fits your situation and skills. The site does not prove conditions are all right to proceed and does not take over your safety responsibility.</p>
<h3>7. No guarantee</h3>
<p>The beta is provided <strong>as available</strong>, without warranties of accuracy, availability, fitness for a particular purpose, or any particular outcome, to the extent the law allows. No savings, repair success, parts compatibility, or pricing outcome is promised.</p>
<h3>8. Limitation of liability</h3>
<p>To the fullest extent permitted by law, Second Wrench and its operator are not liable for indirect, incidental, special, consequential, or punitive damages, or for equipment damage, injury, or lost profits arising from use of (or inability to use) this beta, including following or ignoring any suggestion. Our total liability for any claim related to this beta is limited to <strong>$0</strong> (the service is free) or, if a court requires otherwise, the amount you paid us in the prior twelve months for this service (likely zero).</p>
<p><strong>Nothing in these Terms excludes liability that cannot lawfully be excluded</strong> (for example certain consumer or personal-injury rights under applicable law). If a limitation is unenforceable, the rest still applies.</p>
<h3>9. Feedback and surveys (optional)</h3>
<p>You may send optional feedback or survey answers to help improve the product. Feedback is <strong>voluntary</strong>. Do not include passwords, full account numbers, medical details, or other secrets you are not allowed to share. See the <a href="#/privacy">Privacy note</a> for what we store.</p>
<p>By sending feedback, you grant Second Wrench a <strong>worldwide, royalty-free license</strong> to use, copy, modify, and incorporate your feedback into the product and our operations, including in <strong>anonymized or de-identified</strong> form for product improvement and research. We will not sell your feedback as a lead list. We may quote anonymized snippets in internal notes or (with care) marketing only if they do not identify you.</p>
<p>If you leave the optional feedback box unchecked, we use your feedback only to look into what you reported and to reply to you.</p>
<h3>9A. Optional equipment catalog and statistics</h3>
<p>If you check the separate catalog box, you let Second Wrench store and use the check details and equipment information you choose to share, as described in the <a href="#/privacy">Privacy note</a>, to improve the product and to produce statistics about equipment, parts and outcomes. Sharing is optional, and declining doesn’t limit your use of the beta. Anything we publish is aggregated totals only, describes units reported to us rather than failure rates, and isn’t a rating of any brand or product. You can withdraw and delete your record as described in the Privacy note. We don’t sell your information.</p>
<h3>10. Acceptable use</h3>
<p>Do not misuse the site, scrape it abusively, attempt to bypass safety stops, or submit false emergency reports. We may disable abusive access.</p>
<h3>11. Changes</h3>
<p>We may update these Terms. The version label will change. Continuing to use the flow after a new version may require checking the box again.</p>
<h3>12. Contact</h3>
<p>Questions: <a href="mailto:support@secondwrench.co">support@secondwrench.co</a>. This email is <strong>not</strong> monitored for emergencies.</p>
<h3 id="corrections">Corrections and rights concerns</h3>
<p><strong>Corrections and rights concerns.</strong> If a thermostat guide is wrong, out of date, or uses material you believe you own, email support@secondwrench.co with the page link, what’s wrong, and how to reach you. We’ll acknowledge within 2 business days. We’ll pull or fix a guide within 5 business days for a rights concern, and right away for anything that could cause a safety problem.</p>
<h3>Thermostat menu guides</h3>
<p>Our thermostat guides show text recreations of menu labels so you can find a setting on your own device. They are written by Second Wrench, not by the manufacturer, and they are not images of the actual screen. Menus change with model and firmware updates, so a guide may not match your device. Verify each step on your own thermostat and stop if it doesn’t match.</p>
<p>Our guides cover homeowner settings and a short list of comfort settings that some thermostats keep in an installer menu (such as swing, differential, cycles per hour, temperature offset, Auto deadband, recovery, heat pump balance point and outdoor lockout temperatures, and dehumidify settings). Don’t use them to change equipment protection, equipment type, dual-fuel changeover, heat pump reversing valve, or wiring settings. If a step would lead you to one of those, stop and call a licensed HVAC professional.</p>
<p>Changing a thermostat setting, including a comfort setting in an installer menu, is your choice and at your own risk. A change can affect comfort, humidity, energy use (including how often backup or strip heat runs), how often your equipment runs, equipment wear, and whether your home stays warm enough in cold weather, and it may affect an installer’s or manufacturer’s warranty. Never set your outdoor unit to run below the minimum outdoor temperature in its manual. Write down current values before changing anything, change only the setting named in our steps, and stop if anything looks different. Our guides are general information, not a recommendation of a specific value for your home or equipment, and we don’t promise any comfort or energy result. If your system is new or under an installer’s warranty, ask your installer first.</p>
<p>Brand and model names identify devices only. Second Wrench is not affiliated with or endorsed by any thermostat manufacturer.</p>
<h3>Advanced homeowner procedures</h3>
<p>Some releases may offer optional Advanced paths for limited, like-for-like homeowner work on specific equipment. Only the paths listed in the Schedule of Enabled Paths below are covered, and only when the product shows them as available. If a path isn’t in the Schedule, or the product doesn’t show it, the service will direct you to a licensed professional instead of showing Advanced steps.</p>
<p>Advanced work is optional. You can stop and call a licensed professional at any time. The service never requires you to open equipment or replace parts.</p>
<p>If you enter an Advanced path, you agree to all of the following, in addition to the general Terms and the path’s own entry in the Schedule:</p>
<p>1. Eligibility. You are at least 18 years old, you are authorized to work on the equipment, and you can do the steps in a dry place with good light and a clear head.</p>
<p>2. Not a diagnosis, not professional services. Advanced guidance is general information about a procedure. It is not a remote inspection, a certified diagnosis, a warranty, engineering advice, or a promise to supervise your work. Hidden faults can exist. Results depend on what you observe and choose.</p>
<p>3. Maker and law come first. The equipment maker’s instructions, the nameplate and labels, local codes, EPA Section 608 rules for refrigerant, and a licensed professional’s advice take priority over this service. Don’t use this service as permission for regulated or professional-only work. That includes refrigerant or sealed-system work, any gas work, live electrical diagnosis, and work inside an electrical panel.</p>
<p>4. Power off and verified. Before any step that touches wiring or terminals, turn power off the way the path describes and check that the equipment is off. If you can’t turn it off or can’t confirm it’s off, stop and call a professional.</p>
<p>5. Never live work. Don’t touch terminals, wiring, or internal parts while equipment has power. Don’t defeat interlocks, and never bypass, jumper, tape, or hold any safety switch or limit, including to get the system running for a while.</p>
<p>6. Like-for-like only. Replace a part only with one that matches the old part’s label, as each path describes. Don’t guess ratings. If they don’t match, stop and call a professional.</p>
<p>7. Covers back on before power. Put covers, doors, and barriers back before turning power on. Don’t run equipment with a cover off. After the test the path describes, stop at any smell, spark, smoke, leak, or new noise, turn power off if you can do it without touching water or opening a cover, and call a professional, or call 911 from outside if there is fire or smoke.</p>
<p>8. Stops are final. When the product shows a call-a-professional or emergency result, that is where the path ends. There is no “accept the risk and continue” option after a check fails.</p>
<p>9. Your risk. Advanced work carries risk of electric shock, burns, scalding, chemical injury, fire, water damage, and damage to equipment and property. You choose to proceed at your own risk to the extent applicable law allows. Nothing here tries to limit rights or liabilities that Ohio or other applicable law doesn’t allow to be limited.</p>
<p>10. No transfer of duty. Using Advanced guidance doesn’t shift responsibility for how the work is done to Second Wrench, and doesn’t show that conditions at your home are free of hazards.</p>
<p>Schedule of Enabled Paths. Each Advanced path is listed below with its own limits. We add, change, or remove a path only by amending this Schedule and changing the Terms version shown in the product. You’ll be asked to agree again before you can use a new or changed path.</p>
<p>P-01 Capacitor (cool-only split air conditioner). Turn the thermostat Off and the outdoor disconnect Off, and confirm the outdoor unit is silent. Capacitors can hold a dangerous charge after power is off. Treat every capacitor as charged until it is discharged by the maker’s method or with insulated discharge tooling. Never short the terminals with a screwdriver, wire, or other bare metal. If you aren’t sure how to discharge it, stop and call a professional. The service doesn’t give a wait time as a substitute for discharge. Replace it only with a capacitor whose label matches the old one: microfarad rating within the maker’s tolerance, a voltage rating equal to or higher than the old one, and the same terminal markings (for example C, HERM, FAN).</p>
<p>Advanced paths are controlled by product configuration and stay off unless enabled. Enabling a path, or amending the Schedule, is a material Terms change. We will show the new Terms version in the product and ask you to agree again, with an unchecked box, before Advanced steps continue. We store the Terms version and the time you agreed, as described in the Privacy note.</p>
<p>Advanced repair steps are not enabled in this release. Call a licensed HVAC professional.</p>
<h3>13. Status label</h3>
<p>These Terms are an <strong>operator-authored public beta draft</strong>. They have <strong>not</strong> been reviewed or approved by an attorney. That does not make them less binding as our stated terms for using this free beta; it means we have not paid for outside counsel review before publishing.</p>`;
  const PUBLIC_BETA_NOTICE = `<h2>Public beta notice</h2>
<ol>
<li><strong>Not a licensed HVAC technician.</strong> Second Wrench is free informational software. It does not replace a qualified HVAC professional, electrician, or emergency responder.</li>
<li><strong>Not a diagnosis.</strong> Every result is a next-step suggestion based on what you told us. It can be wrong. Manufacturer instructions and a pro win.</li>
<li><strong>Emergency exits are mandatory.</strong> Gas, smoke, sparks, burning smell, flooding near electrical, or immediate danger → get to safety and call emergency services / a pro. Do not keep troubleshooting.</li>
<li><strong>Advanced DIY is OFF.</strong> This public beta does not enable Advanced repair procedures (including capacitor replacement). Those paths stay Call-pro.</li>
<li><strong>No guarantee.</strong> No promise of accuracy, repair success, savings, or of any particular outcome from waiting on a pro.</li>
<li><strong>You assume risk</strong> for any DIY check you choose to perform. Stop when unsure.</li>
<li><strong>Limitation of liability</strong> as stated in the <a href="#/terms">Terms of Use</a> (free service; no consequential damages to the extent law allows; non-excludable rights preserved).</li>
<li><strong>Feedback license.</strong> Optional feedback may be used to improve the product, including anonymized / de-identified use. We do not sell your feedback.</li>
<li><strong>Not medical or emergency.</strong> Do not use this site for medical advice, carbon monoxide poisoning treatment plans, or as an emergency call center.</li>
<li><strong>Manufacturer priority.</strong> Your equipment manual and local code control access, shutdown, and repair.</li>
</ol>`;
  const PRIVACY_HTML = `<p><strong>Version:</strong> <code>privacy-public-beta-2026-10-18.1</code></p>
<p><strong>Effective:</strong> October 18, 2026</p>
<p><strong>Contact / privacy requests:</strong> <a href="mailto:support@secondwrench.co">support@secondwrench.co</a></p>
<p><strong>Operated by:</strong> Second Wrench. <strong>Person in charge of personal information:</strong> Privacy Officer, Second Wrench, <a href="mailto:support@secondwrench.co">support@secondwrench.co</a>.</p>
<p>This notice describes this free public beta. It is shorter than a full commercial Privacy Policy.</p>
<h2>What we collect</h2>
<h3>During a normal check (default)</h3>
<p>Your answers and progress stay in the open browser page unless you choose to share them. Reloading usually starts over. We don\u2019t require an account. You never have to give us a ZIP or postal code, a serial number, or a photo to run a check.</p>
<h3>Anonymous visit counters</h3>
<p>We count page views, check starts, results shown, and Stop / get help presses as daily totals. These counts carry no session ID and we don\u2019t store your IP address with them. If your browser sends Global Privacy Control, we don\u2019t count you.</p>
<h3>Optional equipment catalog (only if you check the catalog box)</h3>
<p>We store: your answer codes and the result (not your typed service note); timing and how many times you pressed Stop / get help; the equipment type; and any of these you choose to enter: brand, model number, serial number, state or province, and the first 3 characters of your ZIP or postal code. Later, if you answer the follow-up, we store what fixed it, which part was replaced or suggested, and who did it. We also store the date, the app, content and tree versions, the Terms, Privacy and catalog-consent versions you agreed to, and the hour you agreed. From a serial or model number, we may estimate the unit\u2019s age or size using the maker\u2019s published formats. Every equipment field can be skipped, including the serial number.</p>
<h3>Contractor applications</h3>
<p>If a business sends a contractor application, we store the business and contact details on that form and the consent text version they agreed to. The application stays pending until a person reviews it. Homeowners do not see it unless it has been verified and contractor referrals are turned on. We do not store an IP address with the application.</p>
<h3>If you send feedback or a survey (optional)</h3>
<p>We may receive your outcome and clarity choices and your message, whether you flagged a safety concern, an optional reply email only if you type one, a random report ID, build and content version, test-mode status, and your answer choices and current result only if you check \u201cAttach my answer choices and current result\u201d (this doesn\u2019t include your service note or equipment details you typed). With each report we also store whether you checked the optional box letting us use your feedback to improve the product, the time you sent it, and the Terms and Privacy versions you saw. The box is optional. If you leave it unchecked, we use your feedback only to look into what you reported and to reply if you asked. Please don\u2019t put serial numbers, addresses or photos in feedback; use the catalog step for equipment details.</p>
<h3>Hosting data</h3>
<p>Our host, Netlify, receives technical data such as your IP address and browser request logs to deliver the site and protect it from abuse. Our catalog code doesn\u2019t read or store your IP address or any location from it.</p>
<h2>What we never collect in the catalog</h2>
<p>Names, email addresses, phone numbers, street addresses, full ZIP or postal codes, GPS or precise location, IP addresses, photos, cookies, or cross-site identifiers. If you type personal details into a free-text box, we delete what you typed there and keep the rest.</p>
<h3>Photo helper</h3>
<p>If you use a photo to help read a label, the photo stays on your device. We don\u2019t upload, store, or send it.</p>
<h2>How we use it</h2>
<p>To improve questions, safety stops and clarity; to fix bugs; to understand which paths people finish or leave; to count which equipment, ages and parts are reported with problems, and how often a result matched what happened later; and to reply if you asked. Incomplete checks aren\u2019t proof that anyone gave up.</p>
<h2>What we don\u2019t do</h2>
<p>We don\u2019t sell your information. We don\u2019t share it for advertising, and we don\u2019t run advertising pixels, third-party analytics scripts or ad networks. If we publish catalog numbers, they\u2019re totals only: no group with fewer than 10 records, and never serial numbers, ZIP or postal characters, or single records. Brand and model totals describe units reported to Second Wrench, not failure rates. We don\u2019t sell your information, we don\u2019t share it for advertising, and we don\u2019t let advertisers or data brokers use it. That includes serial numbers and catalog records.</p>
<h2>Who processes it</h2>
<p>Netlify hosts the site and stores catalog data (Netlify Functions and Blobs, U.S. region) and feedback (Netlify Forms). If we add an owner dashboard, Netlify Identity controls who can sign in. Data stored in the United States may be accessed under U.S. law.</p>
<h2>How long we keep it</h2>
<ul>
<li>Serial numbers: up to 24 months, then deleted. We keep only the estimated age.</li>
<li>Free text you type: up to 12 months, then deleted.</li>
<li>Other catalog records: up to 24 months in identifiable form. After that we remove the record code link and keep only coarse, de-identified records (equipment, symptom, result, parts, age band, state or province) and totals, which we may keep.</li>
<li>Records of your consent choices: as long as the related data exists, plus 3 years.</li>
<li>Test records: deleted within a day.</li>
<li>Feedback: until we delete it under our process; email us with your report ID to ask sooner.</li>
<li>Backups and provider logs: our host keeps its own logs and backups on its own schedule. Deleted records drop out of those as they expire, and we don\u2019t restore deleted records from them.</li>
</ul>
<h2>Your choices and rights</h2>
<ul>
<li>Leave the catalog box unchecked, or skip any field. Your check works the same.</li>
<li>Use your record code on the My data page to download or delete what you shared.</li>
<li>Lost your code? Email support@secondwrench.co with \u201cCatalog request\u201d and details of your check (date, state or province, model, serial). We reply within 30 days. We act only when the details match one record.</li>
<li>Withdraw consent at any time. That stops future use of your record and deletes it if we can still find it.</li>
<li>After a record is de-identified we may no longer be able to find or delete it individually. After our raw records are reduced to totals or stripped of serial numbers (see How long we keep it), we may no longer be able to find your record, so we can\u2019t send or delete it individually. Totals never show any one person\u2019s check.</li>
<li>Skip feedback, omit your email, or save notes locally instead.</li>
</ul>
<p>Clearing the page doesn\u2019t delete something already sent.</p>
<h2>If you live in Canada</h2>
<p><strong>If you live in Canada.</strong> We handle personal information under Canada\u2019s Personal Information Protection and Electronic Documents Act (PIPEDA) and, for Quebec residents, Quebec\u2019s Act respecting the protection of personal information in the private sector (as amended by Law 25). You can ask to see, correct, or delete your information, and you can withdraw catalog consent at any time with your record code or by email. We store catalog data with our host, Netlify, in the United States, where it may be accessed under U.S. law. The person in charge of protecting personal information at Second Wrench is Privacy Officer, Second Wrench, reachable at support@secondwrench.co. You can also complain to the Office of the Privacy Commissioner of Canada, or in Quebec to the Commission d\u2019acc\u00e8s \u00e0 l\u2019information.</p>
<h2>If you live in the United States</h2>
<p><strong>If you live in the United States.</strong> Some state privacy laws (for example in California, Colorado, Connecticut, Virginia, and others) give residents rights to know, access, correct, delete, and opt out of the sale or sharing of personal information, and to not be treated differently for using those rights. Whether or not a law applies to a free beta like ours, we give everyone the same choices: catalog sharing is opt-in, you can get a copy or delete it, we don\u2019t sell or share it for advertising, and we honor Global Privacy Control. Use your record code or email support@secondwrench.co. We reply within 30 days.</p>
<h2>Security and incidents</h2>
<p>We limit access to catalog data to the operator, keep the serial-matching key outside the code, and treat serial numbers as personal information. If we learn that catalog data was accessed without permission, we\u2019ll investigate, record it, and notify regulators and affected people where the law requires. Because the catalog holds no contact details, we may tell people by a notice on this site.</p>
<h2>Children</h2>
<p>This beta is for adults 18 and older and isn\u2019t directed to children. We don\u2019t knowingly collect children\u2019s information. If you think a child shared something, email us and we\u2019ll delete it.</p>
<h2>Thermostat menu guides</h2>
<p>Viewing a thermostat guide doesn’t send anything to us, and neither does tapping <strong>My screen looks different</strong>. To tell us a step is wrong, use beta feedback or email. If you send beta feedback and check Attach my answer choices and current result, we receive your answer choices, which include the guide, the step, and the thermostat you picked from our list. Don’t include personal details, and don’t send photos that show faces, addresses, or other personal information.</p>
<h2>Changes</h2>
<p>When this notice changes, the version above changes and we ask you to agree again before your next check.</p>
<h2>Emergencies</h2>
<p>Don\u2019t use feedback or email for emergencies. Call 911 or your utility or HVAC pro directly.</p>
<h2>Status label</h2>
<p>Operator-authored beta privacy note. <strong>Not</strong> attorney-reviewed or approved.</p>`;
  function publicBetaNotice() { return PUBLIC_BETA_NOTICE; }
  function thermostatGuideHtml() {
    if (!F.tsFallbacks) return '';
    return Object.keys(F.tsFallbacks).map(function (id) {
      const item = F.tsFallbacks[id];
      return '<div><a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">'+esc(item.title)+'</a></div>';
    }).join('');
  }
  function legalPage(title, status, body) {
    const back = !state ? '<p><a href="#/">← Home</a></p>'
      : state.result ? '<p><a href="#/result">← Return to your result</a></p>'
      : '<p><a href="#/check">← Return to your check</a></p>';
    return '<article class="content-wrap"><div class="eyebrow">Second Wrench · Free public beta</div><h1>'+esc(title)+'</h1><p class="lead legal-status">'+esc(status)+'</p><div class="document-panel">'+body+'</div>'+back+'</article>';
  }
  function content(title, body) { return '<article class="content-wrap"><div class="eyebrow">Second Wrench · Free public beta</div><h1>'+esc(title)+'</h1>'+body+'</article>'; }
  const pages = {
    '/about': () => content('Know what to check. Know when to call.', "<p class=\"lead\">Second Wrench helps homeowners find a clearer next step before a heating, cooling, or hot-water service call.</p><div class=\"document-panel\"><h2>How it works</h2><p>Hazards come first. Identify the equipment, answer one question at a time, and use only the owner steps offered for your situation. The result includes a short service-call note that separates your observations from what remains unknown.</p><h2>What the guide covers</h2><p>Central AC, ducted heat pumps, single-room and multi-room mini-splits, geothermal, thermostats, gas and oil furnaces, electric heat, and air handlers. Manufactured-home questions include closet return air and observations of crossover ducts from outside the skirting.</p><p>Boiler questions cover hot-water and steam heat, radiators, baseboard, and radiant floors. Tank, tankless, heat-pump, indirect, and combination water-heater questions start with their hazards. An ordinary air handler with a hydronic coil can move between air-side and water-side checks; each receiving system gets its own hazard screen.</p><h2>Useful homeowner steps, clear limits</h2><p>Eligible steps include ordinary settings, owner-accessible filters and batteries, moving ordinary room obstructions, and loose ground debris or snow. Each step states its access limits and stopping conditions. Codes and gauges are observations; they do not identify a failed part. Boiler and water-heater equipment work goes to a qualified professional.</p><p>A first or repeated breaker trip, an unknown shutdown, furnace breakers, electrical compartments, refrigerant, gas, and safety-device faults need a professional. A separate eligibility check covers one known seasonal AC power restoration or one accidentally switched-off external furnace switch. No generic fault reset is offered.</p><h2>What makes the decisions?</h2><p>The beta uses fixed, reviewable decision rules. It does not inspect equipment, interpret images, measure voltage, or verify your answers. Advanced repair procedures are off.</p><h2>Free public beta</h2><p>No account, payments, affiliate links, parts sales, or contractor booking. We are testing whether the questions, boundaries, and service notes help. Brand references identify equipment and source documents; manufacturers do not endorse this guide.</p>"+publicBetaNotice()+'<button class="button" data-action="test">Try a test scenario</button></div>'),
    '/safety': () => content('Safety is part of the path.', "<p class=\"lead\">Do not use a website as proof that equipment is all right to touch or operate.</p><div class=\"document-panel\"><h2>Emergency conditions come first</h2><p>Gas smell, a CO alarm, smoke, sparks, electrical danger, escaping hot water or steam, and serious illness from heat or cold take priority. Leave the affected area and get appropriate help. For a gas smell or CO alarm, get everyone outside and call from outside without operating switches. Call 911 in the U.S. or Canada; elsewhere use the local emergency number. Feedback is not an emergency channel.</p><button class=\"button danger\" data-action=\"stop\">Stop / get help</button><h2>Equipment stays closed</h2><p>No electrical or combustion-compartment access, live tests, gas work, refrigerant handling, pilot relighting, fuse work, safety bypasses, or reaching through grilles. Never use a pressure washer on an outdoor unit. It can flatten the fins and damage the coil. Trane, Daikin, and Amana outdoor coils get no water or chemical steps on this site. Do not touch coil fins or use ladders. Capacitor and contactor replacement are not guided.</p><h2>Off is not electrical isolation</h2><p>A thermostat or remote set to Off is a control request. Equipment can have multiple power sources and stored electrical energy. This guide does not verify absence of voltage. Where a check uses the shared power-off wording, switch off the breaker, outdoor disconnect, or service switch and leave both covers closed. Do not open the breaker panel cover or the disconnect box.</p><h2>Filter access must match the manual</h2><p>Ducted-system filters must be in an external, tool-free owner filter slot or return grille reachable from the floor. A tool-free furnace door is still an equipment compartment and stays closed. Use the exact size, quantity, and direction in the manual. A mini-split owner filter cover is eligible only when the manual permits the shown access without tools or climbing. If the manual says to switch the breaker, outdoor disconnect, or service switch off first, the shared power-off wording applies and the panel cover and the disconnect box stay closed. Unplugging still stops this check.</p><h2>Water heating and hydronic coils</h2><p>Do not touch pipes to test their temperature, add or drain boiler water, bleed radiators, flush a heater, change valves, or test a relief valve. Steam, spray, a leaking relief discharge, an empty steam sight glass, and water near electrical parts need prompt help. A room thermostat set to Off may leave other heating zones or hot-water calls active.</p><h2>Protective controls stay in place</h2><p>No furnace breaker resets, oil-primary resets, boiler fault resets, or repeat attempts. Leave an intentional shutdown or lock/tag alone. Do not defeat overflow switches, refrigerant alarms, leak-mitigation blowers, limits, rollout controls, or freeze protection. Never change a protected setting to make a warning go away.</p><h2>Choose the equipment you can confirm</h2><p>The guide includes thermostats, AC, heat pumps, mini-splits, geothermal, furnaces, air handlers, boilers, and water heaters. Coverage varies by equipment and model. Packaged rooftops, portable/window units, unknown equipment, and work outside a shown owner step go to a professional.</p><h2>Water-source limits</h2><p>Water-source / geothermal heat pumps up to 6 tons, residential water-to-air. Open-loop well, lake, or pond water-care problems always go to a pro, and there is no loop, pump, refrigerant, or electrical work. For water-source systems, this beta gives safety screens and a service note for a pro, not repairs.</p><h2>Keep people warm or cool while arranging help</h2><p>Do not wait through a test when someone is becoming ill or the home cannot maintain needed heating or cooling. Never use an oven, stove, grill, or generator indoors for heat. Use electric space heaters only as their instructions permit, directly in a wall outlet and clear of things that burn.</p><p>Always stop if access is unclear or an instruction conflicts with your exact owner’s manual.</p>"+publicBetaNotice()+'<p><a href="#/sources">Read the supporting references →</a></p></div>'),
    '/terms': () => legalPage('Terms of Use', 'Version '+C.termsVersion+'. Effective October 18, 2026. Operator-authored public beta terms. Not attorney-reviewed.', TERMS_HTML + publicBetaNotice()),
    '/privacy': () => legalPage('Privacy note', 'Version '+C.privacyVersion+'. Effective October 18, 2026. Operator-authored beta privacy note. Not attorney-reviewed or approved.', PRIVACY_HTML + referralPrivacyHtml()),
    '/disclosures': () => content('Independent by design.', '<div class="document-panel"><h2>No paid recommendation in this beta</h2><p>There are no affiliate links, paid contractor referrals, parts sales, repair sales, or subscription charges in this build. No payment or commercial relationship changes a safety decision.</p><h2>No manufacturer endorsement</h2><p>Second Wrench is not affiliated with or endorsed by an HVAC manufacturer. Brand references in supporting material identify sources only.</p><h2>Future commercial features</h2><p>Tools, supplies, or referrals may be considered in a later release. '+(advancedOn?'This private copy enables the gated capacitor guide only. It is not the public beta.':'Advanced repair guides are not enabled here. '+ADVANCED_OFF_LINE)+' Any future compensated recommendation will need an appropriate disclosure and a separately reviewed implementation.</p><h2>Beta limitations</h2><p>Results are not independently verified diagnoses. The site neither books nor dispatches a service company and makes no promise about pricing, availability, savings, or repair outcomes.</p></div>'),
    '/sources': () => content('What supports the guidance?', '<p class="lead">Primary safety references, plus a deliberately narrower beta scope. Sources do not certify or approve this website.</p><div class="document-panel source-list"><div><a href="https://www.cpsc.gov/safety-education/safety-guides/carbon-monoxide/carbon-monoxide-fact-sheet" target="_blank" rel="noopener noreferrer">CPSC · Carbon monoxide alarms</a><p>Get to fresh air, call for emergency help, and do not re-enter until cleared.</p></div><div><a href="https://www.mudomaha.com/safety/natural-gas-safety/carbon-monoxide-safety/" target="_blank" rel="noopener noreferrer">Metropolitan Utilities District · Gas safety</a><p>Leave a suspected gas area and avoid operating electrical switches or using a phone inside.</p></div><div><a href="https://www.osha.gov/heat-exposure/illness-first-aid" target="_blank" rel="noopener noreferrer">OSHA · Heat illness first aid</a><p>Emergency help for severe heat illness, including confusion or loss of consciousness.</p></div><div><a href="https://www.cpsc.gov/Newsroom/News-Releases/2022/CPSC-Issues-Carbon-Monoxide-Warning-Ahead-of-Hurricane-Ian" target="_blank" rel="noopener noreferrer">CPSC · Wet electrical equipment and generator safety</a><p>Keep away from wet energized appliances; do not use generators indoors.</p></div><div><a href="https://www.carrier.com/us/en/residential/hvac-resources/air-conditioners/will-frozen-ac-fix-itself/" target="_blank" rel="noopener noreferrer">Carrier · Frozen air conditioners</a><p>Turn cooling off; ice can have airflow or refrigerant-system causes. Thawing is not a repair.</p></div><div><a href="https://www.trane.com/residential/en/resources/troubleshooting/ductless-systems/mini-split-leaking-water/" target="_blank" rel="noopener noreferrer">Trane · Mini-split leaking water</a><p>Turn a frozen mini-split off and let it thaw. Have towels or a bucket ready. Thawing is not a repair.</p></div><div><a href="https://www.trane.com/residential/en/resources/troubleshooting/ductless-systems/do-mini-splits-have-filters/" target="_blank" rel="noopener noreferrer">Trane · Do mini-splits have filters?</a><p>Many indoor units have washable filters behind the front cover. Remote Off stops the unit running. It is not electrical isolation. Vacuum or rinse with lukewarm water only when the manual shows a tool-free path from the floor. If the manual asks for the breaker, outdoor disconnect, or service switch, the check shows the shared power-off wording and the covers stay closed. Unplugging still stops here. Those go to a licensed pro.</p></div><div><a href="https://www.carrier.com/us/en/residential/hvac-resources/heat-pumps/heat-pump-troubleshooting/" target="_blank" rel="noopener noreferrer">Carrier · Heat pump troubleshooting</a><p>A thin frost that clears during defrost is normal; thick ice, or ice that does not clear, is not. Never chip ice from the coil, and look for water runoff such as a leaky gutter. Call a professional.</p></div><div><a href="https://www.lennox.com/residential/lennox-life/consumer/heat-pump-defrost-cycle" target="_blank" rel="noopener noreferrer">Lennox · Heat pump defrost cycle</a><p>Defrost usually lasts 5 to 15 minutes and may bring steam and a whoosh. Repeated long defrost cycles need a professional.</p></div><div><a href="https://www.energy.gov/eere/geothermal/geothermal-heat-pumps" target="_blank" rel="noopener noreferrer">U.S. Department of Energy · Geothermal heat pumps</a><p>How geothermal heat pumps differ from air-source heat pumps. Used to describe the water-source / geothermal system type.</p></div><div><a href="https://www.waterfurnace.com/literature/collateral/om1500mw.pdf" target="_blank" rel="noopener noreferrer">WaterFurnace · Residential owner’s manual</a><p>Closed-loop and open-loop parts, lockouts, and why heat-exchanger cleaning and well-system service are left to the dealer.</p></div><div><a href="https://files.climatemaster.com/Unit-Owner-FAQ.pdf" target="_blank" rel="noopener noreferrer">ClimateMaster · Unit owner FAQ</a><p>Lockout indications and water temperatures. This beta records what is shown and does not interpret it.</p></div><div><a href="https://www.epa.gov/section608/section-608-technician-certification-requirements" target="_blank" rel="noopener noreferrer">EPA · Refrigerant technician certification</a><p>In the United States, activities that can release regulated refrigerant require applicable technician certification. This beta does not guide refrigerant handling.</p></div><div><a href="https://www.carrier.com/us/en/residential/hvac-resources/air-conditioners/how-to-perform-air-filter-replacement/" target="_blank" rel="noopener noreferrer">Carrier · Air-filter replacement</a><p>General filter guidance. Your actual equipment’s owner manual controls access, shutdown, specification, and installation.</p></div><div><a href="https://www.cpsc.gov/Newsroom/News-Releases/2025/Theres-a-Chill-in-the-Air-Stay-Warm-Safely-Be-Cautious-When-Using-Generators-Furnaces-and-Space-Heaters" target="_blank" rel="noopener noreferrer">CPSC · Generators, furnaces, and space heaters (2025)</a><p>Plug electric space heaters directly into a wall outlet, keep them three feet from things that burn, and never use a generator inside.</p></div><div><a href="https://pgealerts.alerts.pge.com/safety/gas/" target="_blank" rel="noopener noreferrer">PG&amp;E · Gas safety</a><p>Leave the area, avoid anything that could spark, and call 911 and the gas utility from outside.</p></div><div><a href="https://www.nfpa.org/education-and-research/home-fire-safety/carbon-monoxide" target="_blank" rel="noopener noreferrer">NFPA · Carbon monoxide safety</a><p>If the CO alarm sounds, move to a fresh air location outdoors.</p></div><div><a href="https://www.cdc.gov/natural-disasters/psa-toolkit/recognizing-hypothermia.html" target="_blank" rel="noopener noreferrer">CDC · Recognizing hypothermia</a><p>Confusion and drowsiness are warning signs. Seek immediate medical attention.</p></div><div><a href="https://www.carrier.com/us/en/residential/hvac-resources/furnaces/furnace-blowing-cold-air/" target="_blank" rel="noopener noreferrer">Carrier · Furnace blowing cold air</a><p>A fan set to On can circulate unheated air between heating calls. This beta does not follow its pilot-relight step.</p></div><div><a href="https://www.who.int/publications/i/item/9789241550376" target="_blank" rel="noopener noreferrer">WHO · Housing and health guidelines (2018)</a><p>The World Health Organization recommends at least 18 °C (64 °F) indoors in cold weather. Geneva: World Health Organization, 2018. Chapter 4, low indoor temperatures, NCBI Bookshelf NBK535294, https://www.ncbi.nlm.nih.gov/books/NBK535294/. Publication page checked October 11, 2026.</p></div><div><a href="https://firstco.com/wp-content/uploads/2021/08/HBXBX-HW420.pdf" target="_blank" rel="noopener noreferrer">First Co · HBXBX-HW hydronic air handlers</a><p>Hot-water coils, blower delay, freeze protection, and model-dependent filter requirements. Water and airflow concerns remain separate observations.</p></div><div><a href="https://www.enbridgegas.com/safety/keep-your-meter-clear" target="_blank" rel="noopener noreferrer">Enbridge Gas · Winter clearances</a><p>Exterior vent and meter obstructions. The guide limits snow clearing to loose material from dry, level ground and leaves ice and equipment work to a professional.</p></div><div><a href="https://www.shareddocs.com/hvac/docs/1009/Public/03/IM-38MURA-02.pdf" target="_blank" rel="noopener noreferrer">Carrier · 38MURA installation manual</a><p>Pages 8–9 describe snow and installation clearances. Changing mounting, drainage, or fixed obstacles is an installer task.</p></div><div><a href="https://www-origin.fujitsugeneral.com/us/resources/pdf/support/downloads/%28OM%299-12-15RLS3_English.pdf" target="_blank" rel="noopener noreferrer">Fujitsu · 9/12/15RLS3 operating manual</a><p>Pages 3, 5, and 7 cover remote batteries, matching the remote signal code, and defrost. Its electrical-isolation cleaning requirement is outside this guide’s filter steps.</p></div><div><a href="https://www.lennox.com/dA/f2cf40c8f3/DB68-12580A-00.pdf" target="_blank" rel="noopener noreferrer">Lennox · Mini-split user manual DB68-12580A-00</a><p>Pages 28 and 43 cover warm-up, defrost, and remote troubleshooting for the listed models. Page 44 does not support a generic remote-only fault restart.</p></div><div><a href="https://help.senville.com/support/solutions/articles/151000016892--on-the-display-mode-conflict-multi-zone-systems-" target="_blank" rel="noopener noreferrer">Senville · Multi-zone mode conflict</a><p>Compatible indoor units must use compatible modes. The guide screens for loss of needed heat before changing other rooms.</p></div><div><a href="https://help.pioneerminisplit.com/en-US/pa-error-code-multi-zone-1812395" target="_blank" rel="noopener noreferrer">Pioneer · Quantum Ultra PA indication</a><p>Model-specific mode conflict and compatible mode selection. A code on another model must be checked against its own manual.</p></div><div><a href="https://www.weil-mclain.com/wp-content/uploads/Evergreen-Series-2-550100580_0325-Users-Manaual.pdf" target="_blank" rel="noopener noreferrer">Weil-McLain · Evergreen Series 2 owner manual</a><p>Pages 6–7 cover model-dependent pressure, relief discharge, venting, and condensate concerns. This guide records observations and refers equipment work; it does not give a universal pressure range or a relief-valve test.</p></div><div><a href="https://www.weil-mclain.com/wp-content/uploads/SGO-Series-4-Boiler-Manual-2-B100-0225.pdf" target="_blank" rel="noopener noreferrer">Weil-McLain · SGO Series 4 steam boiler manual</a><p>Pages 4–6 address hot boilers, water level, flooding, and oil-reset hazards. This guide offers no water addition, oil-primary reset, draining, or valve work, even where the equipment manual describes a procedure.</p></div><div><a href="https://www.bosch-homecomfort.com/us/media/country_pool/documents/downloads-for-bosch-products/gas-fired-condensing-boilers-manuals/6720872363_greenstar_combi_100-151p_operating_instructions_en_05.2024.pdf" target="_blank" rel="noopener noreferrer">Bosch · Greenstar combi 100 p / 151 p operating instructions</a><p>Pages 5, 7, and 9 distinguish installation-specific pressure and heating/hot-water operation. Boiler controls and reset instructions are model-specific. This guide does not turn those instructions into a generic reset or filling step.</p></div><div><a href="https://www.aosmithatlowes.com/media/1017/100277324.pdf" target="_blank" rel="noopener noreferrer">A.O. Smith · Hybrid heat-pump water heater guide 100277324</a><p>Pages 4–5 cover scalding, electrical, and relief-discharge hazards. Page 30 requires breaker or fuse-box shutdown for that model’s filter maintenance. It does not support a generic filter-cleaning procedure; the guide records any work already reported.</p></div><div><a href="https://medlineplus.gov/ency/article/000030.htm" target="_blank" rel="noopener noreferrer">MedlinePlus · Burns</a><p>Emergency care for a severe or large burn, or uncertainty about severity. The hot-water flow prioritizes the injured person and does not use a water-temperature number as proof against scalding.</p></div><div><a href="https://health-infobase.canada.ca/datalab/carbon-monoxide-blog.html?wbdisable=true" target="_blank" rel="noopener noreferrer">Health Canada · Carbon monoxide response</a><p>For suspected CO exposure, leave, call 9-1-1, and wait for emergency responders before returning. This supports the Canadian emergency wording; it is not an equipment-code compliance review.</p></div><h2>Thermostat guides</h2>'+thermostatGuideHtml()+'<h2>How these sources are used</h2><p>Equipment manuals support specific observations and owner steps. They do not establish that your equipment matches, works properly, or has a particular fault. The exact manual controls. Second Wrench adds conservative limits for access, cold-weather waits, one-attempt power restoration, and professional handoffs.</p><p>Boiler and water-heater questions are observational. Mini-split mode matching uses the controls for compatible indoor units; cold-weather restrictions come first. No generic mini-split fault restart is provided. First-trip breaker resets, furnace breaker resets, equipment-compartment work, and refrigerant work are not guided.</p><p>Operator technical review: October 12, 2026. Content version: '+esc(C.contentVersion)+'. This is not a review by a licensed HVAC professional or an attorney. Manufacturers and source publishers do not approve this site.</p></div>')
  };
  const CATALOG_REGION_CODES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT","XX"];
  const CATALOG_REGION_LABELS = {AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",AB:"Alberta",BC:"British Columbia",MB:"Manitoba",NB:"New Brunswick",NL:"Newfoundland and Labrador",NS:"Nova Scotia",NT:"Northwest Territories",NU:"Nunavut",ON:"Ontario",PE:"Prince Edward Island",QC:"Quebec",SK:"Saskatchewan",YT:"Yukon",XX:"Prefer not to say"};
  const REFERRAL_COPY = {
    consentTextVersion: 'referral-consent-pending-legal-2026-10-20.1',
    cardTitle: 'PENDING LEGAL Find a pro for your equipment',
    cardBody: 'PENDING LEGAL This optional step asks whether you want help finding one contractor for the equipment in this check. It does not book a visit.',
    yesLabel: 'PENDING LEGAL Yes',
    noLabel: 'PENDING LEGAL No thanks',
    consentTitle: 'PENDING LEGAL Share this check with one contractor',
    zipLabel: 'PENDING LEGAL ZIP code',
    nameLabel: 'PENDING LEGAL Name',
    emailLabel: 'PENDING LEGAL Email',
    phoneLabel: 'PENDING LEGAL Phone (optional)',
    shareLabel: 'PENDING LEGAL Share my check summary and contact info with one contractor Second Wrench matches me with, so they can contact me about this repair.',
    phoneBoxLabel: 'PENDING LEGAL The contractor may call or text me at this number about this request. Message and data rates may apply. Reply STOP to opt out.',
    disclosure: 'PENDING LEGAL Second Wrench may be paid by contractors in this network. We do not do the repair, we do not guarantee work by the contractor, and you contract and pay the contractor directly.',
    submitLabel: 'PENDING LEGAL Send request',
    privacyHeading: 'PENDING LEGAL Contractor referrals',
    privacyBody: 'PENDING LEGAL If a referral request is offered later, this note will describe what is shared, with whom, and how long it is kept. This placeholder is not in effect.',
    zipError: 'PENDING LEGAL Enter a ZIP code, name, and email.',
    shareError: 'PENDING LEGAL Check the box to share this check with one contractor.',
    phoneError: 'PENDING LEGAL Enter a phone number before allowing a call or text.',
    saved: 'PENDING LEGAL Request saved. A person at Second Wrench will match it by hand. Nothing is emailed from this page.',
    failed: 'PENDING LEGAL That request was not saved.'
  };
  function referralOn() { return C.referralEnabled === true; }
  function resetReferralDraft() {
    referralOpen = false; referralShare = false; referralPhoneOk = false; referralDeclined = false;
    referralZip = ''; referralName = ''; referralEmail = ''; referralPhone = ''; referralError = ''; referralStatus = '';
  }
  function readReferralFields() {
    const zip = document.getElementById('referral-zip');
    if (!zip) return;
    referralZip = String(zip.value || '').replace(/\D/g, '').slice(0, 5);
    referralName = String((document.getElementById('referral-name') || {}).value || '').slice(0, 80);
    referralEmail = String((document.getElementById('referral-email') || {}).value || '').slice(0, 254);
    referralPhone = String((document.getElementById('referral-phone') || {}).value || '').slice(0, 20);
    const share = document.getElementById('referral-share');
    const phoneOk = document.getElementById('referral-phone-ok');
    if (share) referralShare = share.checked === true;
    if (phoneOk) referralPhoneOk = phoneOk.checked === true;
    if (!referralPhone.trim()) referralPhoneOk = false;
  }
  function referralBrand() {
    if (!state || state.product !== 'ts' || !F.catalogBrandChoices) return '';
    const choice = (state.answers || []).map(answer => answer.choice).find(id => F.catalogBrandChoices().some(item => item.id === id));
    const item = choice && F.catalogBrandChoices().find(row => row.id === choice);
    return item ? item.label : '';
  }
  function referralPrivacyHtml() {
    if (!referralOn()) return '';
    return '<h2>'+esc(REFERRAL_COPY.privacyHeading)+'</h2><p>'+esc(REFERRAL_COPY.privacyBody)+'</p>';
  }
  function referralResultHtml() {
    if (!referralOn() || !state || !F.referralEligible || !F.referralEligible(state, { code: note.codes || '' }) || referralDeclined) return '';
    if (!referralOpen) {
      return '<section class="referral-card" id="referral-card"><h2>'+esc(REFERRAL_COPY.cardTitle)+'</h2><p>'+esc(REFERRAL_COPY.cardBody)+'</p><div class="button-row"><button type="button" class="button small" data-action="referral-yes">'+esc(REFERRAL_COPY.yesLabel)+'</button><button type="button" class="button small secondary" data-action="referral-no">'+esc(REFERRAL_COPY.noLabel)+'</button></div></section>';
    }
    const phoneWrap = referralPhone.trim() ? '' : ' hidden';
    const saved = referralStatus === 'saved' ? '<p id="referral-saved">'+esc(REFERRAL_COPY.saved)+'</p>' : '';
    return '<section class="referral-card" id="referral-card"><h2>'+esc(REFERRAL_COPY.consentTitle)+'</h2><p>'+esc(REFERRAL_COPY.disclosure)+'</p><label class="field">'+esc(REFERRAL_COPY.zipLabel)+'<input id="referral-zip" inputmode="numeric" maxlength="5" autocomplete="postal-code" value="'+esc(referralZip)+'"></label><label class="field">'+esc(REFERRAL_COPY.nameLabel)+'<input id="referral-name" maxlength="80" autocomplete="name" value="'+esc(referralName)+'"></label><label class="field">'+esc(REFERRAL_COPY.emailLabel)+'<input id="referral-email" type="email" maxlength="254" autocomplete="email" value="'+esc(referralEmail)+'"></label><label class="field">'+esc(REFERRAL_COPY.phoneLabel)+'<input id="referral-phone" type="tel" maxlength="20" autocomplete="tel" value="'+esc(referralPhone)+'"></label><label class="check-label"><input id="referral-share" type="checkbox"'+(referralShare?' checked':'')+'><span>'+esc(REFERRAL_COPY.shareLabel)+'</span></label><div id="referral-phone-wrap"'+phoneWrap+'><label class="check-label"><input id="referral-phone-ok" type="checkbox"'+(referralPhoneOk?' checked':'')+'><span>'+esc(REFERRAL_COPY.phoneBoxLabel)+'</span></label></div><p class="fine"><a href="#/privacy">'+esc(REFERRAL_COPY.privacyHeading)+'</a></p><p id="referral-error" class="inline-error" role="alert">'+esc(referralError)+'</p>'+saved+'<div class="button-row"><button type="button" class="button" data-action="referral-submit">'+esc(REFERRAL_COPY.submitLabel)+'</button><button type="button" class="button secondary" data-action="referral-no">'+esc(REFERRAL_COPY.noLabel)+'</button></div></section>';
  }
  function sendReferral(payload) {
    if (!referralOn()) return Promise.resolve(null);
    return fetch('/api/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) { return { status: response.status, body: body }; });
    });
  }
  function catalogOn() { return C.catalogEnabled === true; }
  function gpcOn() { return typeof navigator !== "undefined" && navigator.globalPrivacyControl === true; }
  function versionPair() { return { terms: C.termsVersion, privacy: C.privacyVersion, catalog: C.catalogConsentVersion }; }
  function needsReprompt() { return !!(state && F.catalogReprompt && F.catalogReprompt(state, versionPair()).stale); }
  function syncReprompt() {
    if (!state || !F.catalogReprompt) return;
    const info = F.catalogReprompt(state, versionPair());
    if (info.stale && !repromptArmed) { termsChecked = false; repromptArmed = true; }
    if (!info.stale) repromptArmed = false;
    if (info.catalogStale) {
      catalogChecked = false;
      state.catalogConsent = false;
      state.catalogConsentVersion = null;
      state.catalogConsentAt = null;
    }
  }
  function resetCatalogDraft() {
    catalogChecked = false; serialStatus = ""; photoHelperUsed = false; catalogSentFor = "";
    catalogEvents = []; recordCode = ""; catalogError = ""; catalogDiscardUnit = false; repromptArmed = false;
    catalogOffer = false; catalogRegion = ""; catalogZip = ""; catalogBrand = ""; catalogBrandOther = "";
    catalogModel = ""; catalogSerial = ""; catalogRole = ""; catalogResultSeen = ""; catalogResultTracked = "";
    releaseNameplate();
  }
  function releaseNameplate() {
    if (photoUrl) { try { URL.revokeObjectURL(photoUrl); } catch (err) { /* The preview is already gone. */ } }
    photoUrl = "";
    photoHelperUsed = false;
    const preview = document.getElementById("nameplate-preview");
    if (preview) preview.removeAttribute("src");
  }
  function attachNameplate(file) {
    releaseNameplate();
    photoHelperUsed = true;
    try { photoUrl = URL.createObjectURL(file); } catch (err) { photoUrl = ""; }
    const preview = document.getElementById("nameplate-preview");
    const canvas = document.getElementById("nameplate-canvas");
    if (preview && photoUrl) { preview.src = photoUrl; preview.hidden = false; }
    if (canvas && canvas.getContext && photoUrl) {
      const image = new Image();
      image.onload = function () {
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(image, 0, 0);
      };
      image.src = photoUrl;
    }
    const input = document.getElementById("nameplate-file");
    if (input) input.value = "";
  }
  function track(name, props) {
    if (!catalogOn()) return;
    const tier1 = name === "page_view" || name === "check_start" || name === "result_view" || name === "stop_pressed";
    if (tier1 && gpcOn()) return;
    catalogEvents.push(Object.assign({ name: name }, props || {}));
    if (catalogEvents.length > 80) catalogEvents = catalogEvents.slice(-80);
  }
  function referrerClass() {
    if (!document.referrer) return "none";
    try {
      return new URL(document.referrer).host === location.host ? "same_site" : "external";
    } catch (err) { return "none"; }
  }
  function trackPage(route) {
    if (catalogViewedRoute === route) return;
    catalogViewedRoute = route;
    track("page_view", { route: route, referrer: referrerClass() });
  }
  function drainEvents() {
    const events = catalogEvents.slice(-80);
    catalogEvents = [];
    return events;
  }
  function catalogRequest(url, opts) {
    if (!catalogOn()) return Promise.resolve(null);
    return fetch(url, opts || {}).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) { return { status: response.status, body: body }; });
    });
  }
  function catalogConsentHtml() {
    if (!catalogOn()) return "";
    const gpc = gpcOn() ? "<p class=\"fine\" id=\"catalog-gpc\">Your browser is sending a privacy signal (Global Privacy Control), so we\u2019ve turned off our anonymous visit counters for you. Catalog sharing stays off unless you check the box below.</p>" : "";
    return gpc + "<label class=\"check-label optional-check\"><input id=\"catalog-consent\" type=\"checkbox\""+(catalogChecked?" checked":"")+"><span>Optional: Share my check with Second Wrench\u2019s equipment catalog. That\u2019s my answer choices, the result, and any equipment details I choose to enter (brand, model, serial number, state or province, and the first 3 characters of my ZIP or postal code), plus a later \u201cwhat fixed it\u201d answer if I give one. It helps Second Wrench learn which equipment and parts need help. No name, email, street address, or GPS location. I can get a copy or delete it with my record code. <a href=\"#/privacy\">Privacy</a></span></label><p class=\"fine\">Leaving this unchecked doesn\u2019t change your check. Nothing about your equipment is sent unless you check it.</p>";
  }
  function regionField() {
    const options = "<option value=\"\">State or province (optional)</option>" + CATALOG_REGION_CODES.map(function (code) {
      return "<option value=\""+code+"\""+(code===catalogRegion?" selected":"")+">"+esc(CATALOG_REGION_LABELS[code] || code)+"</option>";
    }).join("");
    return "<label class=\"field\">State or province (optional)<select id=\"catalog-region\">"+options+"</select></label>";
  }
  function serialBlock() {
    if (serialStatus === "entered" || serialStatus === "skipped" || serialStatus === "unreadable") {
      const label = serialStatus === "entered" ? "Serial saved for this check." : serialStatus === "unreadable" ? "Serial marked unreadable." : "Serial skipped.";
      return "<p class=\"fine\" id=\"serial-decided\">"+label+"</p>";
    }
    const preview = photoUrl ? "<img id=\"nameplate-preview\" class=\"nameplate-preview\" alt=\"Nameplate preview on this device\" src=\""+esc(photoUrl)+"\">" : "<img id=\"nameplate-preview\" class=\"nameplate-preview\" alt=\"\" hidden>";
    return "<div id=\"serial-ask\"><label class=\"field\">Serial number (optional)<input id=\"serial-number\" maxlength=\"40\" autocomplete=\"off\" value=\""+esc(catalogSerial)+"\"></label><p class=\"fine\">It helps us estimate how old the unit is. Skip it if you\u2019d rather not share it. Skipping doesn\u2019t change your check.</p><div class=\"serial-actions\"><button type=\"button\" id=\"serial-save\" class=\"button serial-choice\" data-action=\"serial-save\">Save serial</button><button type=\"button\" id=\"serial-skip\" class=\"button serial-choice\" data-action=\"serial-skip\">Skip</button></div><button type=\"button\" id=\"serial-unreadable\" class=\"text-button\" data-action=\"serial-unreadable\">I can\u2019t read it</button><button type=\"button\" class=\"text-button\" id=\"nameplate-photo\" data-action=\"nameplate-photo\">Use a photo to help you read it</button><p class=\"fine\">Your photo stays on this device. We don\u2019t upload, store, or send it, and it\u2019s cleared when you leave this step. Only what you type is shared.</p><input id=\"nameplate-file\" type=\"file\" accept=\"image/*\" hidden><canvas id=\"nameplate-canvas\" hidden></canvas>"+preview+"</div>";
  }
  function brandField() {
    if (state && state.product === "ts" && F.catalogBrandChoices) {
      const options = "<option value=\"\">Choose a brand</option>"+F.catalogBrandChoices().map(function (item) {
        return "<option value=\""+esc(item.id)+"\""+(item.id===catalogBrand?" selected":"")+">"+esc(item.label)+"</option>";
      }).join("");
      return "<label class=\"field\">Brand (optional)<select id=\"catalog-brand\">"+options+"</select></label>";
    }
    return "<label class=\"field\">Brand (optional)<input id=\"catalog-brand-other\" maxlength=\"40\" value=\""+esc(catalogBrandOther)+"\" placeholder=\"Equipment words only. Don\u2019t include names, phone numbers, emails, or addresses.\"></label><p class=\"fine\">Equipment words only. Don\u2019t include names, phone numbers, emails, or addresses. If we spot personal details, we delete what you typed here and keep the rest.</p>";
  }
  function roleField() {
    const selected = catalogRole || (F.catalogUnitRole ? F.catalogUnitRole(state) : "other");
    const roles = [["outdoor","Outdoor unit"],["indoor_air_handler","Indoor air handler"],["furnace","Furnace"],["boiler","Boiler"],["water_heater","Water heater"],["thermostat","Thermostat"],["mini_split_indoor","Mini-split indoor unit"],["mini_split_outdoor","Mini-split outdoor unit"],["other","Other"]];
    return "<label class=\"field\">Which unit is this?<select id=\"unit-role\">"+roles.map(function (item) {
      return "<option value=\""+item[0]+"\""+(item[0]===selected?" selected":"")+">"+item[1]+"</option>";
    }).join("")+"</select></label>";
  }
  function recordCodeHtml() {
    if (!recordCode) return "";
    return "<div id=\"record-code\"><p><strong>Your record code:</strong> <span id=\"record-code-value\">"+esc(recordCode)+"</span></p><div class=\"button-row\"><button type=\"button\" class=\"button small\" data-action=\"copy-record\">Copy</button><button type=\"button\" class=\"button small\" data-action=\"save-record\">Save</button></div><p class=\"fine\">Keep this code to see or delete what you shared. We don\u2019t store the code itself, so we can\u2019t show it to you again.</p></div>";
  }
  function followupLink() { return location.origin + location.pathname + "#/followup/" + recordCode; }
  function unitFormHtml() {
    return "<section class=\"catalog-block\" id=\"catalog-step\" data-serial-status=\""+esc(serialStatus)+"\"><h2>Tell us about your unit</h2><p><strong>Help us learn which equipment needs help (optional).</strong> If you checked the catalog box, what you enter here is stored with your check\u2019s answers and result. We use it to count which units and parts have problems. We don\u2019t sell it, and anything we publish is totals only. Every field can be skipped. <a href=\"#/privacy\">Privacy</a></p><p class=\"fine\">Only read the label if you can see it from where you\u2019d normally stand. Don\u2019t open panels, move the unit, reach behind it, or reach near a burner, flue, or wiring. If you can\u2019t see it, skip it. If you see a hazard sign, stop and use Stop / get help.</p>"+roleField()+brandField()+"<label class=\"field\">Model number (optional)<input id=\"catalog-model\" maxlength=\"40\" value=\""+esc(catalogModel)+"\" autocomplete=\"off\"></label><p class=\"fine\">Letters, numbers, dashes, slashes, and dots only. Leave it blank if you can\u2019t read it.</p>"+serialBlock()+regionField()+"<label class=\"field\">First 3 characters of your ZIP or postal code (optional)<input id=\"catalog-zip\" maxlength=\"3\" value=\""+esc(catalogZip)+"\" autocomplete=\"off\"></label><p class=\"fine\">We keep only the first 3 characters (for example 432 or K1A). Never type your full code or your address. We don\u2019t use GPS.</p><p id=\"catalog-error\" class=\"inline-error\" role=\"alert\">"+esc(catalogError)+"</p><div class=\"button-row\"><button type=\"button\" class=\"button\" id=\"catalog-submit\" data-action=\"catalog-submit\">Share this check</button><button type=\"button\" class=\"button secondary\" data-action=\"stop\">Stop / get help</button></div>"+recordCodeHtml()+"</section>";
  }
  function catalogResultHtml() {
    if (!catalogOn() || !state || !state.result) return "";
    if (catalogRegion === "QC") {
      return "<section class=\"catalog-block\" id=\"catalog-step\"><p>Catalog sharing isn\u2019t offered for Quebec.</p>"+regionField()+"<div class=\"button-row\"><button type=\"button\" class=\"button secondary\" data-action=\"stop\">Stop / get help</button></div></section>";
    }
    if (F.catalogHazardResult && F.catalogHazardResult(state)) {
      if (!state.catalogConsent) return "";
      return "<section class=\"catalog-block\" id=\"catalog-followup\"><p>Later, when everything\u2019s settled, you can tell us what happened and add your equipment details. "+(recordCode?"<button type=\"button\" class=\"text-button\" data-action=\"copy-followup\">Copy follow-up link</button>":"")+"</p>"+recordCodeHtml()+"</section>";
    }
    if (!state.catalogConsent) {
      if (!catalogOffer) return "<section class=\"catalog-block\" id=\"catalog-step\"><p>You didn\u2019t turn on catalog sharing, so nothing here will be sent. You can turn it on for this check, or keep going without it.</p><div class=\"button-row\"><button type=\"button\" class=\"button small\" data-action=\"catalog-offer\">Turn on for this check</button><button type=\"button\" class=\"button small\" data-action=\"catalog-decline\">No thanks</button></div></section>";
      return "<section class=\"catalog-block\" id=\"catalog-step\">"+catalogConsentHtml()+"</section>";
    }
    return unitFormHtml();
  }
  function readCatalogFields() {
    const region = document.getElementById("catalog-region");
    const zip = document.getElementById("catalog-zip");
    const model = document.getElementById("catalog-model");
    const brand = document.getElementById("catalog-brand");
    const other = document.getElementById("catalog-brand-other");
    const role = document.getElementById("unit-role");
    const serial = document.getElementById("serial-number");
    if (region) catalogRegion = region.value;
    if (zip) catalogZip = String(zip.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
    if (model) catalogModel = String(model.value || "").toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9\-\/.]/g, "").slice(0, 40);
    if (brand) catalogBrand = brand.value;
    if (other) catalogBrandOther = String(other.value || "").slice(0, 40);
    if (role) catalogRole = role.value;
    if (serial && !serialStatus) catalogSerial = String(serial.value || "").slice(0, 40);
  }
  function buildCheck(unitStep, followStatus) {
    return F.catalogPayload(state, {
      appVersion: C.version,
      contentVersion: C.contentVersion,
      catalogConsentVersion: state.catalogConsentVersion || C.catalogConsentVersion,
      catalogConsentAt: state.catalogConsentAt,
      unitStep: unitStep,
      followupStatus: followStatus
    });
  }
  function buildUnit() {
    const unit = {
      unit_role: catalogRole || (F.catalogUnitRole ? F.catalogUnitRole(state) : "other"),
      serial_status: serialStatus || "skipped",
      nameplate_source: photoHelperUsed ? "typed_with_photo_helper" : (state.product === "ts" && catalogBrand && (state.answers || []).some(function (answer) { return answer.choice === catalogBrand; }) ? "from_tree" : "typed")
    };
    if (state.product === "ts") { if (catalogBrand) unit.brand = catalogBrand; }
    else if (catalogBrandOther) { unit.brand = "other"; unit.brand_other = catalogBrandOther.slice(0, 40); }
    if (catalogModel) unit.model_number = catalogModel;
    if (serialStatus === "entered" && catalogSerial) unit.serial_number = catalogSerial;
    const fuel = F.catalogFuel ? F.catalogFuel(state) : "";
    if (fuel) unit.fuel = fuel;
    return unit;
  }
  function showRecord(body) {
    if (body && body.record_code) { recordCode = body.record_code; catalogError = ""; render(); return; }
    if (state) catalogSentFor = state.id;
    catalogError = body && body.error === "catalog_off" ? "Catalog sharing is off right now." : "Catalog sharing did not save. Your check result is still here.";
    render();
  }
  function sendCatalog(payload, keepalive) {
    if (!catalogOn()) return Promise.resolve(null);
    return catalogRequest("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: !!keepalive
    });
  }
  function maybeSendHazard() {
    if (!catalogOn() || !state || !state.result || !F.catalogHazardResult || !F.catalogHazardResult(state)) return;
    if (catalogSentFor === state.id) return;
    catalogSentFor = state.id;
    if (!state.catalogConsent || catalogRegion === "QC") {
      sendCatalog({ bot_field: "", gpc: gpcOn(), events: drainEvents() }, true);
      return;
    }
    const check = buildCheck("not_offered", "offered");
    sendCatalog({ bot_field: "", gpc: gpcOn(), events: drainEvents(), check: check }, true).then(function (result) {
      if (result && result.body) showRecord(result.body);
    });
  }
  function submitCatalog() {
    if (!catalogOn() || !state) return;
    readCatalogFields();
    if (catalogRegion === "QC") {
      catalogChecked = false;
      state.catalogConsent = false;
      state.catalogConsentVersion = null;
      state.catalogConsentAt = null;
      catalogError = "Catalog sharing isn\u2019t offered for Quebec.";
      render();
      return;
    }
    if (!serialStatus) {
      catalogError = "Choose Save serial or Skip before sharing.";
      render();
      return;
    }
    const check = buildCheck("submitted", "offered");
    if (catalogRegion) check.region_state = catalogRegion;
    if (catalogZip) check.zip3 = catalogZip.slice(0, 3);
    const unit = buildUnit();
    catalogSentFor = state.id;
    catalogError = "";
    releaseNameplate();
    track("unit_submitted", {});
    sendCatalog({ bot_field: "", gpc: gpcOn(), events: drainEvents(), check: check, units: [unit] }, false).then(function (result) {
      if (result && result.body) showRecord(result.body);
      else { catalogSentFor = ""; catalogError = "Catalog sharing did not save. Your check result is still here."; render(); }
    });
  }
  function myDataPage() {
    const lost = "<p>Lost your code? Email support@secondwrench.co with \u201cCatalog request\u201d in the subject and tell us whether you want a copy, a correction, or deletion. Because we don\u2019t collect names or emails in the catalog, we can only find a record from details you give us, such as the date of the check, your state or province, the model, and the serial number. We act only when those details match one record closely enough that we\u2019re not handing someone else\u2019s data to you. We reply within 30 days. If we can\u2019t match a record, we\u2019ll say so.</p>";
    if (!catalogOn()) return content("My data", "<p>Enter your record code to download a copy of what you shared or delete it. Deleting removes it from our records right away and from our totals at the next daily update.</p>"+lost+"<p>Catalog sharing is off in this copy. Nothing is sent.</p><div class=\"button-row\"><button type=\"button\" class=\"button secondary\" data-action=\"stop\">Stop / get help</button></div>");
    return content("My data", "<div id=\"my-data\"><p>Enter your record code to download a copy of what you shared or delete it. Deleting removes it from our records right away and from our totals at the next daily update.</p><label class=\"field\">Record code<input id=\"my-data-code\" autocomplete=\"off\" value=\""+esc(myDataCode)+"\"></label><div class=\"button-row\"><button type=\"button\" class=\"button\" data-action=\"download-record\">Download my data</button><button type=\"button\" class=\"button secondary\" data-action=\"delete-record\">Delete my data</button><button type=\"button\" class=\"button secondary\" data-action=\"stop\">Stop / get help</button></div><p id=\"my-data-error\" class=\"inline-error\" role=\"alert\">"+esc(myDataMessage)+"</p><pre id=\"my-data-copy\" class=\"note-pre\">"+esc(myDataCopy)+"</pre>"+lost+"</div>");
  }
  function followupPage(route) {
    const code = route.indexOf("/followup/") === 0 ? decodeURIComponent(route.slice("/followup/".length)) : "";
    const stop = "<button type=\"button\" class=\"button secondary\" data-action=\"stop\">Stop / get help</button>";
    if (!catalogOn()) return content("What fixed it?", "<div id=\"followup-step\"><p>Catalog sharing is off in this copy. Nothing is sent.</p><div class=\"button-row\">"+stop+"</div></div>");
    track("followup_shown", {});
    const statuses = [["","Choose one"],["fixed","Yes, it\u2019s fixed"],["still_broken_pro_coming","Not yet, a pro is coming"],["pro_fixed","A pro fixed it"],["replaced_equipment","The equipment was replaced"],["gave_up_or_unknown","Not sure / gave up"]];
    const who = [["","Choose one"],["pro","A professional"],["me","Me"],["someone_else","Someone else"],["not_sure","Not sure"]];
    return content("What fixed it?", "<div id=\"followup-step\"><p>Did your equipment issue get fixed?</p><label class=\"field\">What happened?<select id=\"followup-status\">"+statuses.map(function (item) { return "<option value=\""+item[0]+"\">"+item[1]+"</option>"; }).join("")+"</select></label><label class=\"field\">What was done? (optional)<input id=\"what-fixed-other\" maxlength=\"60\" placeholder=\"Equipment words only. Don\u2019t include names, phone numbers, emails, or addresses.\"></label><p class=\"fine\">Pick what was done, if you know. This helps us count which parts fail. It isn\u2019t advice to do any of this work yourself. Equipment words only. Don\u2019t include names, phone numbers, emails, or addresses. If we spot personal details, we delete what you typed here and keep the rest.</p><p class=\"fine\"><button type=\"button\" class=\"text-button\" data-action=\"followup-unsure\">Not sure</button></p><label class=\"field\">Who did it?<select id=\"who-did-it\">"+who.map(function (item) { return "<option value=\""+item[0]+"\">"+item[1]+"</option>"; }).join("")+"</select></label><p class=\"fine\">We ask only to count outcomes. Refrigerant, gas, and live electrical work need a licensed professional.</p><label class=\"field\">A pro said this part needs replacing, but it isn\u2019t done yet (optional)<input id=\"part-recommended\" maxlength=\"60\"></label><p id=\"followup-error\" class=\"inline-error\" role=\"alert\"></p><div class=\"button-row\"><button type=\"button\" class=\"button\" data-action=\"followup-send\" data-code=\""+esc(code)+"\">Send</button><button type=\"button\" class=\"button secondary\" data-action=\"followup-skip\">Skip</button>"+stop+"</div><p>Still broken? <button type=\"button\" class=\"button small secondary\" data-action=\"new\">Start a new check</button></p></div>");
  }

  function render() {
    readReferralFields();
    let route = location.hash.slice(1) || '/';
    const follow = route.indexOf('/followup') === 0;
    const mine = route === '/my-data';
    if (!follow && !mine && !routes.has(route)) { go('/'); return; }
    if (catalogViewedRoute === '/result' && route !== '/result') releaseNameplate();
    let html;
    let title = 'Beta information';
    if (follow) { html = followupPage(route); title = 'What fixed it?'; }
    else if (mine) { html = myDataPage(); title = 'My data'; }
    else if (route === '/') { html = home(); title = 'Heating, cooling, thermostat, and hot-water checks'; }
    else if (route === '/check') { html = flow(); title = state&&state.product==='wshp'?'Water-source / geothermal heat pump check':state&&state.product==='hp'?'Guided heat pump check':state&&state.product==='fn'?'Guided furnace check':state&&state.product==='ms'?'Guided mini-split check':state&&state.product==='ts'?'Guided thermostat check':state&&state.product==='ac'?'Guided AC check':'Guided check'; }
    else if (route === '/result') { html = resultPage(); title = 'Your next step'; }
    else if (route === '/feedback') { html = feedbackPage(); title = 'Beta feedback'; }
    else html = pages[route]();
    if (html) setContent(html, title);
    const shown = follow ? '/followup' : mine ? '/my-data' : route;
    if (catalogOn()) {
      trackPage(shown);
      if (route === '/result') {
        const seen = state && state.result || '';
        if (catalogResultTracked !== seen) {
          catalogResultTracked = seen;
          track('result_view', { result_id: seen, tier: state && state.result && F.results[state.result] ? F.results[state.result].tier : '' });
        }
        maybeSendHazard();
      }
    }
  }
  function download(text, filename) {
    const blob = new Blob([text], {type:'text/plain;charset=utf-8'}), url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  async function copyNote() {
    const text = F.summary(state,note);
    try { if(!navigator.clipboard) throw new Error('clipboard unavailable'); await navigator.clipboard.writeText(text); toast('Service note copied.'); }
    catch (_) { const block = document.getElementById('service-note'); const range = document.createRange(); range.selectNodeContents(block); const sel = window.getSelection();sel.removeAllRanges();sel.addRange(range);block.focus();toast('Note selected. Use your device’s Copy command.'); }
  }
  document.addEventListener('click', event => {
    const resultChoice = event.target.closest('[data-result-choice]');
    if (resultChoice && state && F.followResult) {
      try {
        F.followResult(state, resultChoice.dataset.resultChoice);
        go(state.result ? '/result' : '/check');
      } catch (error) {
        const el = document.getElementById('flow-error');
        if (el) el.textContent = error.message;
      }
      return;
    }
    const selected = event.target.closest('[data-answer]');
    if(selected){
      try{
        if(selected.disabled)return;
        const agreeing=!!(state&&state.node==='ac.session.consent'&&selected.dataset.answer==='agree_18_terms');
        const accepted=document.getElementById('agree')?.checked===true;
        if(agreeing&&!accepted){
          const el=document.getElementById('flow-error');
          if(el)el.textContent='Please read and accept the Terms and Privacy notes to continue.';
          return;
        }
        if(needsReprompt()&&!accepted){
          const el=document.getElementById('flow-error');
          if(el)el.textContent='Please read and accept the Terms and Privacy notes to continue.';
          return;
        }
        if(needsReprompt()&&accepted)F.acceptReprompt(state,{terms:C.termsVersion,privacy:C.privacyVersion});
        const wasConsent = state.node==='consent';
        if(catalogOn())track('answer',{node:state.node,choice:selected.dataset.answer});
        F.answer(state, selected.dataset.answer, { agreed: agreeing&&accepted, telemetry:false, termsVersion:C.termsVersion, privacyVersion:C.privacyVersion });
        sendActivity(wasConsent?'start':state.result?'result':'progress');
        go(state.result?'/result':'/check');
      }catch(error){const el=document.getElementById('flow-error');if(el)el.textContent=error.message;}
      return;
    }
    const tsChoice=event.target.closest('[data-ts-ack="warranty"]');
    if(tsChoice&&state){state.tsWarrantyAck=true;render();return;}
    const flag=event.target.closest('[data-flag]'); if(flag){feedbackDraft.safety=true;}
    const action=event.target.closest('[data-action]'); if(!action)return;
    const name=action.dataset.action;
    if(name==='start')start(action.dataset.seed||'', 'real');
    if(name==='test')start('Hypothetical concern. Do not perform work to test the website.','test');
    if(name==='stop'){
      termsChecked=false;
      catalogDiscardUnit=true;
      releaseNameplate();
      serialStatus='';
      catalogSerial='';
      if(!state)state=F.create();
      if(catalogOn())track('stop_pressed',{node:state.node||''});
      if(state.telemetry)sendActivity('stop');
      F.stop(state);go('/check');
    }
    if(name==='catalog-offer'){catalogOffer=true;render();}
    if(name==='referral-yes'){ if(!referralOn())return; referralOpen=true; referralError=''; render(); return; }
    if(name==='referral-no'){ referralDeclined=true; referralOpen=false; render(); return; }
    if(name==='referral-submit'){
      if(!referralOn()||!state||!F.referralEligible||!F.referralEligible(state,{code:note.codes||''}))return;
      readReferralFields();
      referralError='';
      if(!/^\d{5}$/.test(referralZip)||!referralName.trim()||!referralEmail.trim()){ referralError=REFERRAL_COPY.zipError; render(); return; }
      if(!referralShare){ referralError=REFERRAL_COPY.shareError; render(); return; }
      if(referralPhoneOk&&!referralPhone.trim()){ referralError=REFERRAL_COPY.phoneError; render(); return; }
      const summary=F.referralSummary?F.referralSummary(state,{brand:referralBrand(),model:note.model||'',code:note.codes||''}):{lane:state.product||'',result_id:state.result||'',brand:'',model:'',symptom:'',fuel:'',vent_type:'',home_type:'',fn_reason:'',code:''};
      sendReferral({
        bot_field:'',
        consent_text_version:REFERRAL_COPY.consentTextVersion,
        share_with_one_contractor:true,
        phone_contact:referralPhoneOk===true,
        zip:referralZip,
        name:referralName.trim(),
        email:referralEmail.trim(),
        phone:referralPhone.trim(),
        lane:summary.lane,
        result_id:summary.result_id,
        brand:summary.brand,
        model:summary.model,
        symptom:summary.symptom,
        fuel:summary.fuel||'',
        vent_type:summary.vent_type||'',
        home_type:summary.home_type||'',
        fn_reason:summary.fn_reason||'',
        code:summary.code||''
      }).then(function(result){
        if(result&&result.body&&result.body.stored){ referralStatus='saved'; referralError=''; }
        else referralError=REFERRAL_COPY.failed;
        render();
      });
      return;
    }
    if(name==='catalog-decline'){
      catalogOffer=false;
      if(state)catalogSentFor=state.id;
      sendCatalog({bot_field:'',gpc:gpcOn(),events:drainEvents()},false);
      render();
    }
    if(name==='serial-save'){
      const field=document.getElementById('serial-number');
      const norm=String(field&&field.value||'').toUpperCase().replace(/\s+/g,'');
      if(!norm){catalogError='Enter a serial or choose Skip.';render();return;}
      if(!/^[A-Z0-9\-\/.]{1,40}$/.test(norm)){catalogError='Use letters, numbers, dashes, slashes, and dots only.';render();return;}
      catalogSerial=norm;serialStatus='entered';catalogError='';
      track('serial_entered',{});
      render();
    }
    if(name==='serial-skip'){
      serialStatus='skipped';catalogSerial='';catalogError='';
      track('serial_skipped',{});
      render();
      const region=document.getElementById('catalog-region');
      if(region)region.focus();
    }
    if(name==='serial-unreadable'){
      serialStatus='unreadable';catalogSerial='';catalogError='';
      track('serial_unreadable',{});
      render();
    }
    if(name==='nameplate-photo'){
      const input=document.getElementById('nameplate-file');
      if(input)input.click();
    }
    if(name==='catalog-submit')submitCatalog();
    if(name==='copy-record'&&recordCode){
      const text=recordCode+'\n'+followupLink();
      if(navigator.clipboard)navigator.clipboard.writeText(text).then(()=>toast('Record code copied.'),()=>toast('Record code selected. Use your device\u2019s Copy command.'));
      else toast(recordCode);
    }
    if(name==='save-record'&&recordCode)download(recordCode+'\n'+followupLink(),'second-wrench-record-code.txt');
    if(name==='copy-followup'&&recordCode){
      track('followup_link_copied',{});
      const link=followupLink();
      if(navigator.clipboard)navigator.clipboard.writeText(link).then(()=>toast('Follow-up link copied.'),()=>toast(link));
      else toast(link);
    }
    if(name==='followup-skip'){const el=document.getElementById('followup-error');if(el)el.textContent='Skipped. Nothing else was sent.';}
    if(name==='followup-unsure'){const input=document.getElementById('what-fixed-other');if(input)input.value='';followupUnsure=true;toast('Marked not sure.');}
    if(name==='followup-send'){
      if(!catalogOn())return;
      const code=action.dataset.code||'';
      const status=(document.getElementById('followup-status')||{}).value||'';
      const who=(document.getElementById('who-did-it')||{}).value||'';
      const other=String((document.getElementById('what-fixed-other')||{}).value||'').slice(0,60);
      const part=String((document.getElementById('part-recommended')||{}).value||'').slice(0,60);
      const error=document.getElementById('followup-error');
      if(!status){if(error)error.textContent='Choose what happened, or skip.';return;}
      const payload={bot_field:'',status_now:status};
      if(who)payload.who_did_it=who;
      if(other)payload.what_fixed_other=other;
      else if(followupUnsure)payload.what_fixed_it='not_sure';
      if(part)payload.part_recommended_other=part;
      track('followup_answered',{});
      catalogRequest('/api/catalog/followup',{method:'POST',headers:{'Content-Type':'application/json','X-Record-Code':code},body:JSON.stringify(payload)}).then(function(result){
        if(error)error.textContent=result&&result.body&&result.body.stored?'Saved.':'That follow-up was not saved.';
      });
    }
    if(name==='download-record'||name==='delete-record'){
      if(!catalogOn())return;
      const code=(document.getElementById('my-data-code')||{}).value||'';
      myDataCode=code;
      if(name==='delete-record'&&!window.confirm('Delete this record? This can\u2019t be undone.'))return;
      const method=name==='delete-record'?'DELETE':'GET';
      catalogRequest('/api/catalog/record',{method:method,headers:{'X-Record-Code':code}}).then(function(result){
        if(!result){myDataMessage='Catalog sharing is off in this copy.';render();return;}
        if(method==='DELETE'){myDataMessage=result.body&&result.body.deleted?'Deleted.':'That record was not found.';myDataCopy='';}
        else {myDataCopy=JSON.stringify(result.body||{},null,2);myDataMessage=result.status===200?'Copy ready.':'That record was not found.';}
        track(method==='DELETE'?'record_deleted':'record_exported',{});
        render();
      });
    }
    if(name==='new'){
      if(window.confirm('Start a new check? Save any service note first. A new check always begins with safety.')){
        const mode = state && state.mode === 'test' ? 'test' : 'real';
        start('', mode);
      }
    }
    if(name==='resume-check'&&state){
      try{F.resume(state);go('/check');}
      catch(error){toast(error.message||'This result does not continue.');}
    }
    if(name==='ts-next'&&state&&state.result){
      const shown=F.presentResult?F.presentResult(state):F.results[state.result];
      const next=shown&&shown.nextAction&&shown.nextAction.next;
      if(next&&F.nodes[next]){state.result=null;state.node=next;go('/check');}
    }
    if(name==='copy-note'&&state)copyNote();
    if(name==='save-note'&&state)download(F.summary(state,note),'second-wrench-service-note.txt');
    if(name==='save-feedback'){download(feedbackText(),'second-wrench-feedback-'+feedbackId+'.txt');toast('Feedback file created. It has not been sent.');}
    if(name==='email-feedback'){
      const body=feedbackText();
      if(body.length>1600){download(body,'second-wrench-feedback-'+feedbackId+'.txt');toast('Feedback file created. Attach it to the email draft.');}
      const message=body.length>1600?'I have beta feedback. Report '+feedbackId+'.\nPlease attach the feedback file you just saved.':body;
      location.href='mailto:'+encodeURIComponent(C.contactEmail)+'?subject='+encodeURIComponent('Second Wrench beta feedback '+feedbackId)+'&body='+encodeURIComponent(message);
    }
    if(name==='disable-activity'){
      if(state)state.telemetry=false;toast('Activity sharing is off for this check. Already-sent records are not deleted.');
    }
    if(name==='another-feedback'){feedbackDraft={};feedbackId='';feedbackSent=false;feedbackConsent=false;render();}
  });
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.id==='agree'){
      termsChecked=el.checked;
      const btn=document.getElementById('continue-consent');
      if(btn)btn.disabled=!el.checked;
      document.querySelectorAll('[data-reprompt-lock]').forEach(function(op){op.disabled=!el.checked;if(el.checked)op.removeAttribute('aria-disabled');else op.setAttribute('aria-disabled','true');});
    }
    if(el.id==='referral-share') referralShare=el.checked===true;
    if(el.id==='referral-phone-ok') referralPhoneOk=el.checked===true;
    if(el.id==='referral-phone'){
      referralPhone=String(el.value||'').slice(0,20);
      const wrap=document.getElementById('referral-phone-wrap');
      if(wrap) wrap.hidden=!referralPhone.trim();
      if(!referralPhone.trim()){
        referralPhoneOk=false;
        const box=document.getElementById('referral-phone-ok');
        if(box) box.checked=false;
      }
    }
    if(el.id==='catalog-consent'){
      catalogChecked=el.checked;
      if(state){
        state.catalogConsent=el.checked;
        state.catalogConsentVersion=el.checked?C.catalogConsentVersion:null;
        state.catalogConsentAt=el.checked?new Date().toISOString():null;
      }
      if(state&&state.result)render();
    }
    if(el.id==='catalog-region'||el.id==='catalog-zip'||el.id==='catalog-model'||el.id==='catalog-brand'||el.id==='catalog-brand-other'||el.id==='unit-role'||el.id==='serial-number'){
      const wasQC=catalogRegion==='QC';
      readCatalogFields();
      if(el.id==='catalog-zip'&&el.value!==catalogZip)el.value=catalogZip;
      if(el.id==='catalog-model'&&el.value!==catalogModel)el.value=catalogModel;
      if(el.id==='catalog-region'){
        if(catalogRegion==='QC'&&state){catalogChecked=false;state.catalogConsent=false;state.catalogConsentVersion=null;state.catalogConsentAt=null;}
        else if(wasQC)catalogOffer=true;
        render();
      }
    }
    if(el.id==='my-data-code')myDataCode=el.value;
    if(el.id==='feedback-consent'){feedbackConsent=el.checked;}
    if(el.dataset.note){note[el.dataset.note]=el.value.slice(0,140);const pre=document.getElementById('service-note');if(pre)pre.textContent=F.summary(state,note);}
    if(el.dataset.feedback){feedbackDraft[el.dataset.feedback]=el.type==='checkbox'?el.checked:el.value;const p=document.getElementById('attachment-preview');if(p)p.textContent=feedbackData().path_attachment||'No answer choices will be attached unless you check the box above.';}
  });
  document.addEventListener('change',event=>{
    const el=event.target;
    if(el.id==='nameplate-file'&&el.files&&el.files[0])attachNameplate(el.files[0]);
    if(el.dataset.ownerNotice&&state&&el.checked){F.acknowledgeStep(state);render();}
    if(el.dataset.feedback)feedbackDraft[el.dataset.feedback]=el.type==='checkbox'?el.checked:el.value;
    if(el.dataset.tsAck&&state){
      if(el.dataset.tsAck==='warranty')state.tsWarrantyAck=!!el.checked;
      if(el.dataset.tsAck==='lc18')state.tsLc18=!!el.checked;
      render();
    }
  });
  document.addEventListener('submit',async event=>{
    if(event.target.id!=='feedback-form')return;
    event.preventDefault();if(submitting)return;
    const form=event.target;
    if(!form.reportValidity())return;
    if(form.querySelector('[name="bot-field"]').value)return;
    const error=document.getElementById('feedback-error');error.textContent='';
    const button=document.getElementById('send-feedback');
    submitting=true;if(button){button.disabled=true;button.textContent='Sending…';}
    try{await postForm('beta-feedback',feedbackData(),'feedback-schema');feedbackSent=true;render();}
    catch(err){if(error.isConnected)error.textContent=err.message||'Delivery is unconfirmed. Save your feedback before retrying.';}
    finally{submitting=false;if(button?.isConnected){button.disabled=false;button.textContent='Send feedback';}}
  });
  window.addEventListener('pagehide',()=>{
    sendActivity('exit',true);
    if(!catalogOn()||!state||catalogSentFor===state.id)return;
    track('exit',{node:state.node||'result'});
    if(!state.catalogConsent||catalogDiscardUnit||catalogRegion==='QC'){
      sendCatalog({bot_field:'',gpc:gpcOn(),events:drainEvents()},true);
      return;
    }
    if(!state.result){
      sendCatalog({bot_field:'',gpc:gpcOn(),events:drainEvents()},true);
      return;
    }
    const check=buildCheck(serialStatus?'skipped':'skipped','none');
    sendCatalog({bot_field:'',gpc:gpcOn(),events:drainEvents(),check:check},true);
  });
  window.addEventListener('hashchange',render);
  render();
})();
