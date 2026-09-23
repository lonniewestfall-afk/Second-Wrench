(function () {
  'use strict';
  const C = window.SW_CONFIG, F = window.SW_FLOW;
  if (!C || !F) return;
  const main = document.getElementById('main');
  let state = null, toastTimer, feedbackDraft = {}, feedbackId = '', feedbackSent = false, note = {}, lastActivity = '', submitting = false;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const local = location.protocol === 'file:' || ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
  const routes = new Set(['/', '/check', '/result', '/feedback', '/about', '/safety', '/terms', '/privacy', '/disclosures', '/sources']);
  document.getElementById('version').textContent = C.version;
  const advancedOn = C.advancedRepairsEnabled === true;
  if (advancedOn) {
    const bar = document.querySelector('.beta-bar');
    if (bar) bar.innerHTML = 'Private sandbox. Advanced capacitor path is enabled in this copy only. <span>Not the public beta · not an emergency service</span>';
  }
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
  function start(seed = '', mode = 'real', product = 'ac') {
    if (state && state.telemetry) sendActivity('end_by_user');
    state = F.create(seed, mode, product === 'hp' ? 'hp' : 'ac'); note = {}; lastActivity = ''; feedbackSent = false;
    feedbackId = ''; feedbackDraft = {}; go('/check');
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
    const acSymptoms = [ ['snow','Not cooling','AC runs but the home is not cooling.'], ['power','Will not start','AC will not start.'], ['screen','Blank thermostat','Thermostat display is blank.'], ['air','Weak airflow','Weak airflow from room vents.'], ['drop','Water or ice','Water or ice noticed near the AC.'], ['noise','Unusual noise','Unusual AC noise reported.'] ];
    const hpSymptoms = [ ['power','No heat','Heat pump is not heating.'], ['snow','No cool','Heat pump is not cooling.'], ['air','Both modes','Heat and cool both fail.'], ['drop','Ice outdoors','Ice or heavy frost on the outdoor unit.'], ['screen','Short cycling','Heat pump starts, then stops quickly.'], ['noise','Unusual noise','Unusual heat pump noise.'] ];
    const grid = (items, product) => items.map(([i,l,s])=>'<button class="symptom-button" data-action="start" data-product="'+product+'" data-seed="'+esc(s)+'">'+icon(i,'symptom-icon')+'<span>'+l+'</span></button>').join('');
    return '<div class="wrap"><section class="hero"><div><div class="eyebrow">Second Wrench <span class="pill"><span class="dot"></span>Beta</span></div><h1>Why isn’t my<br>system<br><em>working?</em></h1><p class="intro">A few straightforward questions for a cooling-only central air conditioner or an air-source ducted heat pump. Basic homeowner checks. A useful summary when it is time for a professional.</p><p class="brand-promise">Know what’s wrong. Know what’s safe.<br>Know when to call.</p><div class="hero-cta"><div class="button-row"><button class="button" data-action="start" data-product="ac">Check central AC '+icon('arrow')+'</button><button class="button secondary" data-action="start" data-product="hp">Check a heat pump</button></div><p class="cta-note">No account needed · One question at a time · Heat-pump electrical DIY stays off</p><button class="text-button test-cta" data-action="test">Just testing the AC check?</button><button class="text-button test-cta" data-action="test-hp">Just testing the heat pump check?</button></div></div><div class="hero-card"><p class="card-kicker">Choose the equipment</p><h2>What is going on?</h2><p class="lane-label">Cooling-only central AC</p><div class="symptom-grid">'+grid(acSymptoms,'ac')+'</div><p class="lane-label">Air-source ducted heat pump</p><div class="symptom-grid">'+grid(hpSymptoms,'hp')+'</div><p class="fine">'+icon('shield')+'<span>Every path starts with safety. You can always choose “not sure.”</span></p></div></section><div class="trust-strip"><span>'+icon('shield')+'Clear stopping points</span><span>'+icon('check')+'No guesswork on parts</span><span>'+icon('note')+'A brief service-call note</span></div><section class="section"><div class="section-heading"><div class="eyebrow">A little clarity goes a long way</div><h2>You do not need to<br>sound like a technician.</h2><p>Tell us what you notice. We will help separate a limited homeowner check from a job that needs a professional.</p></div><div class="three-grid"><article class="step-card"><span class="number">01 / NOTICE</span><h3>Start with the symptom.</h3><p>A blank thermostat. Weak airflow. A system that will not cool. We ask about things you can observe without opening equipment.</p></article><article class="step-card"><span class="number">02 / CHECK</span><h3>Stay within clear limits.</h3><p>Check normal settings or eligible owner maintenance. Uncertain access, alarms, electrical problems, and refrigerant work take a different path.</p></article><article class="step-card"><span class="number">03 / KNOW WHAT IS NEXT</span><h3>Leave with a useful next step.</h3><p>Understand the boundary, record any improvement, or copy a short note for your service company. Observations, not a guessed diagnosis.</p></article></div></section><section class="safety-feature"><div><div class="eyebrow">A symptom is not a diagnosis</div><h2>No risky shortcuts.<br>No parts roulette.</h2></div><div><p>This beta covers cooling-only split-system central AC, and a Basic check for air-source ducted heat pumps. It does not guide electrical repairs, safety bypasses, refrigerant work, or forcing a reversing valve. Heat-pump capacitor and contactor steps stay off.</p><a href="#/safety">Read the safety boundaries →</a></div></section><p class="quiet-note">Built for a small circle of testers. Found a confusing question or a missing option? <a href="#/feedback">Tell us about it.</a> Please share the link only with your invitation group.</p></div>';
  }
  function sidebar() {
    const count = state.answers.filter(a=>!['ac.gate.cluster_entry','ac.session.consent'].includes(a.node)).length;
    const onAdvanced = !!(state.node && String(state.node).indexOf('ac.adv.cap.') === 0);
    const onHp = state.product === 'hp';
    const limit = onAdvanced
      ? 'Covers stay on until lockout is verified. Do not touch capacitor terminals before discharge. Never short a capacitor with a screwdriver or bare metal. Covers must be on before power is restored. The contactor is not part of this path.'
      : onHp
        ? 'No covers off. No gauges or refrigerant. Do not force the reversing valve. Outdoor power checks are visual only. This heat-pump path does not include capacitor or contactor work.'
        : 'No covers off. No fingers or objects through a grille. The outdoor disconnect step is visual only — it does not tell you to flip the lever. No wiring or refrigerant tests.';
    return '<aside class="sidebar"><div class="progress" aria-hidden="true"><span class="done"></span><span class="'+(state.consent?'done':'')+'"></span><span class="'+(count>4?'done':'')+'"></span></div><h2>Your pace. Your choice.</h2><p>Answer only what you know. Do not approach equipment to prove an answer.</p><div class="side-box"><h2>'+(onAdvanced?'Advanced limits':'No tools needed to begin.')+'</h2><p>'+limit+'</p><button class="text-button" data-action="stop">Stop / get help</button></div><div class="side-box"><p>Something unclear?</p><a href="#/feedback">Flag this question</a><p class="fine">Feedback is not monitored for emergencies.</p></div></aside>';
  }
  function flow() {
    if (!state) { state = F.create(); }
    if (state.result) { go('/result'); return ''; }
    const node = (F.viewNode ? F.viewNode(state.node, state) : F.nodes[state.node]);
    const count = state.answers.filter(a=>!['ac.gate.cluster_entry','ac.session.consent'].includes(a.node)).length + 1;
    const consentUI = state.node === 'ac.session.consent';
    const emergencyFirst = state.node === 'ac.gate.cluster_entry';
    const terms = '<label class="check-label"><input id="agree" type="checkbox"><span>I am 18 or older. I have read and agree to the <a href="#/terms">beta terms</a>, including the DIY risks and limits. I understand that manufacturer instructions and professional evaluation take priority.</span></label>';
    return '<div class="flow-wrap"><div class="flow-top"><a href="#/">← Home</a><span>'+ (emergencyFirst?'Safety comes first':'Question '+count+' · The length depends on your answers')+'</span></div>'+(state.mode==='test'?'<div class="mode-banner">TEST SCENARIO · Answer hypothetically. Do not perform work to test the website.</div>':'')+'<div class="flow-layout"><section class="flow-card"><div class="eyebrow">'+esc(node.section)+'</div><h1>'+esc(node.title)+'</h1><p class="lead">'+esc(node.body)+'</p>'+(node.caution?'<div class="caution">'+esc(node.caution)+'</div>':'')+(consentUI?terms:'')+'<div class="options">'+node.options.map(op=>{const agreeBtn=consentUI&&op.id==='agree_18_terms';const pre=state.preselectChoice===op.id?' preselected':'';return '<button class="option'+(op.id==='none_of_these'?' safe':'')+(emergencyFirst&&op.id!=='none_of_these'?' stop-option':'')+pre+'" data-answer="'+esc(op.id)+'" '+(agreeBtn?'id="continue-consent" disabled':'')+'><span><strong>'+esc(op.label)+'</strong>'+(op.hint?'<small>'+esc(op.hint)+'</small>':'')+'</span><span class="arrow" aria-hidden="true">→</span></button>';}).join('')+'</div><p id="flow-error" class="inline-error" role="alert"></p>'+(emergencyFirst?'<p class="source-note">United States beta. For immediate danger, get to safety and call 911. <a href="#/sources">Safety references</a></p>':'<p class="source-note">'+esc(C.contentVersion)+' · <a href="#/safety">Scope and safety</a></p>')+'</section>'+sidebar()+'</div></div>';
  }
  function resultPage() {
    if (!state || !state.result) { go('/check'); return ''; }
    const r = F.presentResult ? F.presentResult(state) : F.results[state.result];
    const urgent = ['Emergency','Stop / professional'].includes(r.tier);
    const resumeBtn = r.continueTo ? '<div class="button-row"><button class="button small secondary" data-action="resume-check">Outdoor unit still silent — continue to the disconnect visual</button></div>' : '';
    return '<div class="result-wrap"><div class="flow-top"><a href="#/">← Home</a><span>YOUR NEXT STEP · NOT A CONFIRMED DIAGNOSIS</span></div>'+(state.mode==='test'?'<div class="mode-banner">TEST SCENARIO · Do not use this hypothetical result as an equipment evaluation.</div>':'')+'<section class="result-heading '+(urgent?'emergency':'')+'"><span class="pill">'+esc(r.tier)+'</span><h1>'+esc(r.title)+'</h1><p class="urgency">'+esc(r.urgency)+'</p><p class="explanation">'+esc(r.explanation)+'</p></section><div class="result-layout"><section class="result-box"><h2>What to do now</h2><ol class="action-list">'+r.actions.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>'+resumeBtn+'<div class="avoid"><strong>What not to do</strong>'+esc(r.avoid)+'</div><p class="source-note">General guidance only. <a href="#/sources">Sources & content limits</a></p>'+(r.tier==='Emergency'?(state.mode==='test'?'<p class="fine">Test scenario only: do not place an emergency call for this hypothetical result.</p>':'<a class="button danger" href="tel:911">Call 911 from safety</a>'):'')+'</section><section class="result-box"><h2>Your service-call note</h2><p class="fine">Keep it brief for dispatch. Nothing below is a diagnosis. '+(urgent?'Only use this after everyone is safe.':'')+'</p><details><summary>Add already-known details (optional)</summary><div class="details-body"><label class="field">Main complaint<input data-note="complaint" maxlength="140" value="'+esc(note.complaint||'')+'" placeholder="Example: AC stopped cooling this morning"></label><label class="field">When it began<input data-note="began" maxlength="100" value="'+esc(note.began||'')+'" placeholder="Example: yesterday afternoon"></label><label class="field">Equipment model <span>— already known only</span><input data-note="model" maxlength="100" value="'+esc(note.model||'')+'" placeholder="Do not open covers or climb to find it"></label><p class="fine">These details remain in this open page. They are excluded from activity reports and feedback attachments.</p></div></details><pre id="service-note" class="note-pre" tabindex="0">'+esc(F.summary(state,note))+'</pre><div class="button-row"><button class="button small" data-action="copy-note">Copy note</button><button class="button small secondary" data-action="save-note">Save text</button></div></section></div><div class="result-bottom"><div><p>Was the next step clear?</p><a href="#/feedback">Give beta feedback →</a></div><button class="button secondary small" data-action="new">Start a new check</button></div><p class="fine result-fine">This site does not book a contractor, monitor your equipment, or receive emergency calls. <a class="report-safety" href="#/feedback" data-flag="safety">Report a safety concern in this guidance.</a></p></div>';
  }
  function feedbackData() {
    if (!feedbackId) feedbackId = 'SW-' + (globalThis.crypto?.randomUUID ? crypto.randomUUID().slice(0, 12) : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)).toUpperCase();
    return { report_id: feedbackId, version: C.version, mode: state?state.mode:'site-feedback',
      outcome: feedbackDraft.outcome || '', clarity: feedbackDraft.clarity || '', safety_concern: feedbackDraft.safety ? 'yes':'no',
      email: (feedbackDraft.email || '').trim().slice(0,254), message: (feedbackDraft.message || '').trim().slice(0,2000),
      path_attachment: feedbackDraft.attach && state ? JSON.stringify({mode:state.mode,last_step:state.node||'result',result:state.result||'',answers:state.answers.filter(a=>a.node!=='consent').map(a=>({question:a.node,answer:a.choice}))}) : '' };
  }
  function feedbackText() {
    const d = feedbackData();
    return 'SECOND WRENCH BETA FEEDBACK\n' + Object.entries(d).map(([k,v])=>k+': '+v).join('\n');
  }
  function feedbackPage() {
    const ready = !!hostReady('feedback-schema');
    const options = (list,value) => list.map(([v,l])=>'<option value="'+esc(v)+'" '+(v===value?'selected':'')+'>'+esc(l)+'</option>').join('');
    if(feedbackSent) return content('Thank you for testing.', '<div class="success-message"><h2>Feedback accepted by the form service.</h2><p>Report '+esc(feedbackId)+'. The team may not have read it yet. This is not an emergency or service request.</p><button class="button small secondary" data-action="another-feedback">Send another report</button></div><p><a href="#/">Return home →</a></p>');
    return content('Help make the next check better.', '<p class="lead">A confusing question is useful feedback. So is a result that did not fit. You can stop here without finishing a check.</p><div class="status-box">'+(ready?'Feedback is sent through Netlify Forms when you press Send. Please avoid addresses, serial numbers, photos, or other sensitive household details.':'Online submission is not connected in this copy. Nothing is sent automatically. Save your feedback or open an email draft below.')+'</div><form id="feedback-form"><label class="field">What happened?<select name="outcome" data-feedback="outcome" required>'+options([['','Choose one'],['improved','The issue improved after a suggested check'],['unchanged','The problem is still there'],['called_pro','I contacted a professional'],['stopped','I stopped or got confused'],['test','I am testing, not troubleshooting equipment'],['other','General website feedback']],feedbackDraft.outcome)+'</select></label><label class="field">Was the next step clear?<select data-feedback="clarity" name="clarity">'+options([['','Optional'],['clear','Yes, clear'],['somewhat','Somewhat'],['unclear','No, unclear']],feedbackDraft.clarity)+'</select></label><label class="field">What should we know? <span>— up to 2,000 characters</span><textarea data-feedback="message" name="message" maxlength="2000" rows="5" placeholder="Example: I did not know what conventional controls meant.">'+esc(feedbackDraft.message||'')+'</textarea></label><label class="check-label optional-check"><input data-feedback="safety" type="checkbox" '+(feedbackDraft.safety?'checked':'')+'><span>This feedback concerns a potentially unsafe instruction or a missing safety stop.</span></label><p class="fine">For a current hazard, use <button type="button" class="text-button" data-action="stop">Stop / get help</button>. Feedback is not monitored for emergencies.</p><label class="field">Email for a reply <span>— optional</span><input type="email" name="email" data-feedback="email" autocomplete="email" maxlength="254" value="'+esc(feedbackDraft.email||'')+'" placeholder="you@example.com"></label>'+(state?'<label class="check-label optional-check"><input type="checkbox" data-feedback="attach" '+(feedbackDraft.attach?'checked':'')+'><span>Attach my answer choices and current result. This excludes the service note, model numbers, and other typed equipment details.</span></label><details><summary>Preview the optional attachment</summary><pre id="attachment-preview" class="note-pre">'+esc(feedbackData().path_attachment || 'No answer choices will be attached unless you check the box above.')+'</pre></details>':'')+'<label class="hp" aria-hidden="true">Leave blank<input name="bot-field" tabindex="-1" autocomplete="off"></label><div class="button-row">'+(ready?'<button class="button" type="submit" id="send-feedback">Send feedback '+icon('arrow')+'</button>':'')+'<button class="button '+(ready?'secondary':'')+'" type="button" data-action="save-feedback">Save feedback file</button><button class="button secondary" type="button" data-action="email-feedback">Open email draft</button></div><p class="fine">'+(ready?'Sending shares this form with Second Wrench and its form-processing providers. ':'')+'An email draft is not sent until you send it in your mail app. <a href="#/privacy">Privacy details</a>.</p><p id="feedback-error" class="inline-error" role="alert"></p></form>'+(state?'<p><a href="#/'+(state.result?'result':'check')+'">← Return to my '+(state.result?'result':'check')+'</a></p>':''));
  }
  function content(title, body) { return '<article class="content-wrap"><div class="eyebrow">Second Wrench · Private beta</div><h1>'+esc(title)+'</h1>'+body+'</article>'; }
  const pages = {
    '/about': () => content('A second set of questions. Not a second guess.', '<p class="lead">AC Second Opinion is a structured guide for homeowners who need a clearer next step before an HVAC service call.</p><div class="document-panel"><h2>How it works</h2><p>First, tell us about any hazards. Then identify the equipment and answer one question at a time. The result explains a limited next step and creates a short note you can share with your service company.</p><h2>What makes the decisions?</h2><p>This beta uses fixed, reviewable decision rules—not an open-ended AI repair chatbot. The same answers follow the same rules. It does not inspect equipment, interpret images, measure voltage, or verify what a user reports.</p><h2>Three levels, one boundary at a time</h2><p><strong>Basic homeowner checks:</strong> thermostat Cool mode and setpoint, user-serviceable thermostat batteries, a filter you can already reach safely, and letting ice thaw with the system Off. Also: returns and supplies blocked by furniture, rugs, or closed vents; exterior debris at the outdoor unit; a panel-door look at the outdoor/AC breaker (optional reset only when it is dry and you know which breaker); and a visual look at whether the outdoor disconnect appears On or Off. That disconnect step does not tell you to flip the lever. An unusual noise starts with a hazard screen. Air-source ducted heat pumps add mode, Emergency heat, a ballpark outdoor temperature, defrost discipline, and a leaving-air observation, then the same filter check. That heat-pump path does not continue into capacitor, contactor, gauge, or reversing-valve work.</p><p><strong>Advanced DIY:</strong> '+(advancedOn?'enabled in this private sandbox only, and only as a gated like-for-like capacitor path after a hum with the fan not spinning. The contactor is not included. Every gate must pass. Never short a capacitor with a screwdriver or bare metal. Do not touch terminals before discharge. Covers must be on before power is restored. You can call a professional instead at every step.':'not enabled in this beta. Suspected capacitor or contactor paths say to call a professional. Owning tools or checking a box will not unlock an electrical procedure here.')+'</p><p><strong>Professional only:</strong> panel interior work, operating or opening the outdoor disconnect, refrigerant work, contactor replacement, safety-device faults, unsafe access, and problems that cannot be established by the supported observations.</p><h2>Why the small beta?</h2><p>We are testing whether the wording, boundaries, and service notes are useful. There are no payments, affiliate links, parts recommendations, or contractor bookings in this version.</p><button class="button" data-action="test">Try a test scenario '+icon('arrow')+'</button></div>'),
    '/safety': () => content('Safety is part of the path.', '<p class="lead">Do not use a website as proof that equipment is safe to touch or operate.</p><div class="document-panel"><h2>Emergency conditions come first</h2><p>Gas smell, a carbon monoxide alarm, smoke, sparking, electrical danger, or serious heat illness take priority over diagnosis. Move to safety and use appropriate emergency help. Feedback forms are not an emergency channel.</p><button class="button danger" data-action="stop">Stop / get help</button><h2>This release does not guide</h2><p>Breaker-panel interior access, energized tests, motor or fuse replacement, compressor-terminal access, refrigerant handling, drain chemicals, coil washing, safety bypasses, ladder work, or equipment-cabinet removal. The outdoor disconnect check is visual only: it never tells you to flip the lever, open the door, or pull a fuse. '+(advancedOn?'Capacitor work exists only inside the gated Advanced path in this private copy: lockout first, no terminal contact before discharge, no screwdriver or bare-metal short, covers on before restore, and no contactor replacement.':'Capacitor discharge, capacitor replacement, and contactor replacement are not guided. Those paths say to call a professional.')+'</p><h2>OFF is not proof of isolation</h2><p>A thermostat set to OFF is a control request, not electrical isolation. Equipment may have more than one power source, and stored electrical energy may remain. This website does not verify absence of voltage and never uses a checkbox to authorize electrical work.</p><h2>Limited filter path</h2><p>Filter checks are Basic only: a filter you already know how to slide out (a return grille or a homeowner filter rack). Do not open sealed cabinets, reach into the blower, or remove panels if you are unsure. If you cannot check the filter safely, the path stops and points you to a professional.</p><h2>Alarms and protective controls</h2><p>Do not reset a breaker you cannot identify, and do not reset one with wet hands or a wet floor. Do not defeat an overflow switch, bypass a refrigerant sensor, or disable a leak-mitigation blower. A refrigerant alarm may require a response different from a routine “turn the system off” instruction.</p><h2>Scope</h2><p>Two checks in this United States beta. Cooling-only residential split-system central AC. And air-source ducted heat pumps: thermostat mode, Emergency heat, a ballpark outdoor temperature, defrost discipline, a leaving-air observation, and the shared filter and returns checks. The heat-pump check does not include capacitor, contactor, inverter, panel, gauge, or refrigerant work, and it does not tell you to force a reversing valve. Mini-splits, water-source and geothermal equipment, packaged units, window and portable units, and equipment you cannot confirm stay out of these checks.</p><h2>Always stop when access is unclear</h2><p>Use a qualified professional whenever an instruction conflicts with the owner manual, the area is unsafe, or you cannot confidently identify what the question describes.</p><p><a href="#/sources">Read the supporting references →</a></p></div>'),
    '/terms': () => content('Beta terms of use', '<p class="lead">Version '+esc(C.termsVersion)+' · Draft for this limited beta. These terms have not been represented as attorney-approved.</p><div class="document-panel"><h2>About this service</h2><p>'+esc(C.operatorName)+' is an independent informational project offering a limited, experimental homeowner guide. It is not a contractor, emergency service, equipment inspection, warranty, or professional diagnosis. Contact: <a href="mailto:'+esc(C.contactEmail)+'">'+esc(C.contactEmail)+'</a>.</p><h2>Eligibility and permission</h2><p>You must be at least 18 to use the troubleshooting flow. Work only on equipment you are authorized to operate or maintain. Tenants and other users should follow the property owner’s instructions and contact management when appropriate.</p><h2>Use within the stated scope</h2><p>Use the guide only for supported equipment and observations. Do not treat an answer as permission for regulated or professional-only work. Manufacturer instructions, applicable requirements, and qualified professional advice take priority.</p><h2>DIY risk and stopping</h2><p>Equipment and maintenance tasks may involve electrical, mechanical, chemical, fall, fire, and property-damage risks. You are responsible for deciding whether an allowed task is within your abilities and whether the conditions are safe. Stop whenever uncertain or directed to stop. The tool does not transfer safety responsibility or prove that a task is safe.</p><h2>Limits of a beta</h2><p>Content may contain errors or omissions. Results depend on user reports and cannot rule out hidden conditions. No outcome, savings, compatibility, or repair success is promised. Do not rely on this guide to delay necessary professional or emergency help.</p><h2>No guarantee</h2><p>The beta is offered as available without a promise of accuracy, availability, fitness for a particular purpose, or a particular outcome, to the extent permitted by applicable law. Nothing in these terms excludes rights or responsibilities that cannot lawfully be excluded. No arbitration requirement, indemnity, or blanket liability release is asserted by this draft.</p><h2>Feedback and information</h2><p>Feedback is voluntary and may be used to improve the site. Do not submit confidential information, sensitive household details, or material you are not authorized to share. The privacy notice describes the current data handling.</p><h2>Acceptance</h2><p>The troubleshooting flow asks for an unchecked affirmative agreement before continuing. The version and acceptance time are held in the open page. This release does not create a mandatory server-side acceptance record; optional activity reports can include that information.</p><h2>Changes and contact</h2><p>A future release may change these terms and ask for acceptance again. Contact the beta operator with questions before continuing.</p></div>'),
    '/privacy': () => content('Privacy, without the fine-print surprise.', '<p class="lead">This notice describes this beta build, not hypothetical future features.</p><div class="document-panel"><h2>Who to contact</h2><p>'+esc(C.operatorName)+' · <a href="mailto:'+esc(C.contactEmail)+'">'+esc(C.contactEmail)+'</a>. Use this address for support and privacy requests. Email is not an emergency service.</p><h2>Your check stays in the open page by default</h2><p>The site holds your answers, agreement, and optional service-note details in browser memory. It does not use localStorage, cookies, or an account to save your check. Reloading the page starts over at safety. A file that you choose to save remains wherever you save it.</p><h2>Hosting is not anonymous</h2><p>The web host necessarily receives technical information such as network address and request information when serving pages. This deployment package targets Netlify. Its infrastructure and security logs are governed by its services and policies. A noindex directive is not privacy or access control.</p><h2>Activity sharing is off</h2><p>This beta does not offer activity sharing. The consent screen has no option to send answer choices, timing, or results. Nothing in the check is posted as a session report while that stays off.</p><h2>Feedback you choose to submit</h2><p>Sending feedback shares its outcome, clarity answer, safety flag, optional message, optional reply email, build version, test/real mode, and a random report ID. Answer choices and current result are attached only when you check that separate box. Typed service notes and model numbers are excluded from the attachment.</p><h2>Providers</h2><p>When enabled, submissions are processed by Netlify Forms and its spam filtering, including Akismet. Those services can process technical request information in addition to the form fields. Emailing the operator also involves your mail provider and the operator’s mail provider; the proposed beta mailbox uses Google Workspace.</p><h2>Purpose and access</h2><p>The operator uses submitted feedback and optional activity to understand confusing wording, missed safety cases, completion paths, and reported outcomes. The operator controls access to its hosting and email accounts. This build contains no advertising pixels, third-party analytics script, sales of leads, or embedded AI service.</p><h2>Retention and deletion</h2><p>Records submitted online remain with the operator and relevant providers until deleted under the operator’s reviewed process and provider policies. This build does not automatically purge submissions or email, and does not promise a fixed retention period. Before inviting testers, the operator must confirm its review and deletion schedule. You may email a deletion request, including your report ID when available. Provider security records may follow different rules.</p><h2>Your choices</h2><p>You can omit an email, leave the answer attachment unchecked, or save feedback locally instead of sending it. Activity sharing is not offered. Clearing the open page does not delete a report already submitted. An email draft is not sent by this site.</p><h2>Not an emergency channel</h2><p>Do not submit medical information or use feedback for urgent help. Seek appropriate emergency or professional assistance directly.</p></div>'),
    '/disclosures': () => content('Independent by design.', '<div class="document-panel"><h2>No paid recommendation in this beta</h2><p>There are no affiliate links, paid contractor referrals, parts sales, repair sales, or subscription charges in this build. No payment or commercial relationship changes a safety decision.</p><h2>No manufacturer endorsement</h2><p>Second Wrench is not affiliated with or endorsed by an HVAC manufacturer. Brand references in supporting material identify sources only.</p><h2>Future commercial features</h2><p>Tools, supplies, or referrals may be considered in a later release. '+(advancedOn?'This private copy enables the gated capacitor guide only. It is not the public beta.':'Advanced repair guides are not enabled here.')+' Any future compensated recommendation will need an appropriate disclosure and a separately reviewed implementation.</p><h2>Beta limitations</h2><p>Results are not independently verified diagnoses. The site neither books nor dispatches a service company and makes no promise about pricing, availability, savings, or repair outcomes.</p></div>'),
    '/sources': () => content('What supports the guidance?', '<p class="lead">Primary safety references, plus a deliberately narrower beta scope. Sources do not certify or approve this website.</p><div class="document-panel source-list"><div><a href="https://www.cpsc.gov/safety-education/safety-guides/carbon-monoxide/carbon-monoxide-fact-sheet" target="_blank" rel="noopener noreferrer">CPSC · Carbon monoxide alarms</a><p>Get to fresh air, call for emergency help, and do not re-enter until cleared.</p></div><div><a href="https://www.mudomaha.com/safety/natural-gas-safety/carbon-monoxide-safety/" target="_blank" rel="noopener noreferrer">Metropolitan Utilities District · Gas safety</a><p>Leave a suspected gas area and avoid operating electrical switches or using a phone inside.</p></div><div><a href="https://www.osha.gov/heat-exposure/illness-first-aid" target="_blank" rel="noopener noreferrer">OSHA · Heat illness first aid</a><p>Emergency help for severe heat illness, including confusion or loss of consciousness.</p></div><div><a href="https://www.cpsc.gov/Newsroom/News-Releases/2022/CPSC-Issues-Carbon-Monoxide-Warning-Ahead-of-Hurricane-Ian" target="_blank" rel="noopener noreferrer">CPSC · Wet electrical equipment and generator safety</a><p>Keep away from wet energized appliances; do not use generators indoors.</p></div><div><a href="https://www.carrier.com/us/en/residential/hvac-resources/air-conditioners/will-frozen-ac-fix-itself/" target="_blank" rel="noopener noreferrer">Carrier · Frozen air conditioners</a><p>Turn cooling off; ice can have airflow or refrigerant-system causes. Thawing is not a repair.</p></div><div><a href="https://www.epa.gov/section608/section-608-technician-certification-requirements" target="_blank" rel="noopener noreferrer">EPA · Refrigerant technician certification</a><p>Activities that can release regulated refrigerant require applicable technician certification. This beta does not guide refrigerant handling.</p></div><div><a href="https://www.carrier.com/us/en/residential/hvac-resources/air-conditioners/how-to-perform-air-filter-replacement/" target="_blank" rel="noopener noreferrer">Carrier · Air-filter replacement</a><p>General filter guidance. Your actual equipment’s owner manual controls access, shutdown, specification, and installation.</p></div><h2>Release-specific rules</h2><p>Basic steps include a dirty or missing filter, thermostat Cool and setpoint, user-serviceable thermostat batteries, letting ice thaw with the system Off, clearing furniture or rugs from returns and supplies, exterior debris at the outdoor unit, a panel-door look at a known outdoor/AC breaker, and a visual look at the outdoor disconnect position. An optional breaker reset is only for a dry floor, dry hands, and a breaker you already know. The disconnect step does not tell you to operate the lever. Panel interior, fused pull-outs, and cover-off electrical work stay with a professional. '+(advancedOn?'This private copy can walk a gated capacitor replacement after those locks. It never tells you to short terminals with a screwdriver or bare metal, and it requires covers on before power is restored.':'Capacitor and contactor replacement are not guided in this public beta.')+' These choices are not claims that every manufacturer forbids all other homeowner maintenance.</p><p>Review date: September 23, 2026. Content version: '+esc(C.contentVersion)+'. A qualified human HVAC review of the full flow remains a release requirement.</p></div>')
  };
  function render() {
    let route = location.hash.slice(1) || '/';
    if (!routes.has(route)) { go('/'); return; }
    let html;
    if (route === '/') html = home();
    else if (route === '/check') html = flow();
    else if (route === '/result') html = resultPage();
    else if (route === '/feedback') html = feedbackPage();
    else html = pages[route]();
    if (html) setContent(html, route==='/'?'AC and heat pump checks':route==='/check'?(state&&state.product==='hp'?'Guided heat pump check':'Guided AC check'):route==='/result'?'Your next step':route==='/feedback'?'Beta feedback':'Beta information');
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
    const selected = event.target.closest('[data-answer]');
    if(selected){
      try{
        const wasConsent = state.node==='consent';
        F.answer(state, selected.dataset.answer, { agreed: document.getElementById('agree')?.checked===true, telemetry:false, termsVersion:C.termsVersion });
        sendActivity(wasConsent?'start':state.result?'result':'progress');
        go(state.result?'/result':'/check');
      }catch(error){const el=document.getElementById('flow-error');if(el)el.textContent=error.message;}
      return;
    }
    const flag=event.target.closest('[data-flag]'); if(flag){feedbackDraft.safety=true;}
    const action=event.target.closest('[data-action]'); if(!action)return;
    const name=action.dataset.action;
    if(name==='start')start(action.dataset.seed||'', 'real', action.dataset.product==='hp'?'hp':'ac');
    if(name==='test')start('Hypothetical AC concern.','test','ac');
    if(name==='test-hp')start('Hypothetical heat pump concern.','test','hp');
    if(name==='stop'){
      if(!state)state=F.create();
      if(state.telemetry)sendActivity('stop');
      F.stop(state);go('/check');
    }
    if(name==='new'){
      if(window.confirm('Start a new check? Save any service note first. A new check always begins with safety.')){
        const product = state && state.product === 'hp' ? 'hp' : 'ac';
        const mode = state && state.mode === 'test' ? 'test' : 'real';
        start('', mode, product);
      }
    }
    if(name==='resume-check'&&state){
      try{F.resume(state);go('/check');}
      catch(error){toast(error.message||'This result does not continue.');}
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
    if(name==='another-feedback'){feedbackDraft={};feedbackId='';feedbackSent=false;render();}
  });
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.id==='agree'){document.getElementById('continue-consent').disabled=!el.checked;}
    if(el.dataset.note){note[el.dataset.note]=el.value.slice(0,140);const pre=document.getElementById('service-note');if(pre)pre.textContent=F.summary(state,note);}
    if(el.dataset.feedback){feedbackDraft[el.dataset.feedback]=el.type==='checkbox'?el.checked:el.value;const p=document.getElementById('attachment-preview');if(p)p.textContent=feedbackData().path_attachment||'No answer choices will be attached unless you check the box above.';}
  });
  document.addEventListener('change',event=>{
    const el=event.target;
    if(el.dataset.feedback)feedbackDraft[el.dataset.feedback]=el.type==='checkbox'?el.checked:el.value;
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
  window.addEventListener('pagehide',()=>sendActivity('exit',true));
  window.addEventListener('hashchange',render);
  render();
})();
