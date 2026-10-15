'use strict';
module.exports = function (draft) {
  const nodes = {}, results = {};
  const hazard = {
    id: 'hazard_now',
    label: 'Something unsafe is happening now (burning smell, smoke, sparks, gas smell, an alarm, water or ice at electrical parts, or someone at risk)',
    hint: 'Stop checking. We’ll show you where to get help.',
    fact: 'New hazard reported during the outdoor-unit check.',
    next: 'sd.gate.outdoor_hazard_screen'
  };
  const LOCKED = 'Don’t change these. They protect your equipment and your safety, and they’re for professionals only: any side, top, or front panel or cover; the electrical or control box; the disconnect box and its handle or fuses; buttons, switches, or displays on the board inside the unit; the fan blade and fan motor; refrigerant valves, caps, and pipes; the pipe cover and insulation; the stand, wall bracket, and their bolts; any heater, sensor, or wire on the unit; service menus and anything that clears or deletes stored codes or error history. If a step would take you to one of these, stop. If a screen asks you to enter a password or access code, stop. That’s for installers. Writing down an error code that’s already showing is fine.';
  // Explicit per-node list. Do not infer this from an id pattern.
  const SAFETY = new Set([
    'sd.heat.cold_home_screen',
    'sd.gate.outdoor_hazard_screen',
    'sd.gate.intent_screen',
    'sd.observe.defrost_or_ice',
    'sd.look.intake_clearance',
    'sd.look.snow_height',
    'sd.step.clear_outside',
    'sd.step.clear_snow',
    'sd.read.code_compare'
  ]);
  const router = (bySd, otherwise) => ({ bySd, default: otherwise });
  const routes = {
    'R-cold': router({ 'ms:*': '@ms_cold_exposure', 'hp:*': '@hp_cold_exposure' }, '@sd_cold_exposure'),
    'R-after-hazard': router({ 'hp:*': 'sd.intake.cabinet_confirm', 'none:*': 'sd.intake.cabinet_confirm' }, 'sd.landing.picker'),
    'R-ice-any': router({ 'ms:cool': 'ms.ice.stop_observe', '*:heat': 'sd.observe.defrost_or_ice', '*:unsure': 'sd.observe.defrost_or_ice' }, '@sd_ice_cool_stop'),
    'R-ice-heat': router({ 'ms:*': '@ms_ice_heat_keep_running' }, '@sd_ice_heat_stop'),
    'R-ice-cool': router({ 'ms:*': 'ms.ice.stop_observe' }, '@sd_ice_cool_stop'),
    'R-ice-step': router({ 'ms:cool': 'ms.ice.stop_observe', 'ms:*': '@ms_ice_heat_keep_running', '*:cool': '@sd_ice_cool_stop' }, '@sd_ice_heat_stop'),
    'R-defrost-ok': router({ 'ms:*': '@ms_defrost_normal_basic' }, '@sd_defrost_looked_normal'),
    'R-cant-tell': router({ 'ms:*': '@ms_outdoor_unsure' }, '@sd_unsure'),
    'R-not-running': router({ 'ms:*': '@ms_outdoor_not_running_wave1', 'hp:*': '@sd_not_running_hp_pro', '*:heat': '@sd_not_running_heat_pro', '*:unsure': '@sd_not_running_heat_pro' }, '@sd_not_running_pro'),
    'R-fan-damage': router({ 'hp:*': '@sd_fan_damage_hp_pro', '*:heat': '@sd_fan_damage_heat_pro', '*:unsure': '@sd_fan_damage_heat_pro' }, '@sd_fan_damage_pro')
  };
  function quotes(source) {
    const out = [];
    const re = /[“"]([^”"]+)[”"]/g;
    let m;
    while ((m = re.exec(source || ''))) out.push(m[1]);
    return out;
  }
  function titleBody(source) {
    const s = source || '';
    let title = '';
    let body = '';
    const prompt = s.match(/prompt `([^`]+)`/i);
    const ticked = s.match(/\bbody `([^`]+)`/i);
    if (prompt) title = prompt[1];
    if (ticked) body = ticked[1];
    const lead = s.match(/Prompt \+ body [“"]([^”"]+)[”"]/);
    if (lead) {
      body = body || lead[1];
      if (!title) title = lead[1].split(':')[0];
    }
    if (!body) {
      const named = s.match(/Body[:\s]*[“"]([^”"]+)[”"]/);
      if (named) body = named[1];
    }
    const said = quotes(s).filter(q => q.length > 40 && !/^What this does/.test(q) && !/^From /.test(q));
    if (!body && said[0]) body = said[0];
    if (!title) title = 'Outdoor unit';
    if (!body) body = 'Answer from what you can already see. Don’t open or touch the unit.';
    return [title, body];
  }
  for (const [id, d] of Object.entries(draft.nodes)) {
    const [title, body] = titleBody(d.sourceText);
    let options = (d.options || []).map(o => ({ ...o, next: routes[o.next] || o.next }));
    const existing = options.find(o => o.id === 'hazard_now');
    options = options.filter(o => o.id !== 'hazard_now');
    if (id !== 'sd.gate.outdoor_hazard_screen') {
      options.push(Object.assign({}, hazard, existing && existing.fact ? { fact: existing.fact } : {}));
    }
    nodes[id] = { section: 'Side-discharge outdoor unit', title, body, owner: 'sd', diyTier: 'basic', safetyGate: SAFETY.has(id), options };
  }
  const get = (n, c) => nodes[n].options.find(x => x.id === c);
  get('sd.observe.defrost_or_ice', 'want_keep_running').next = routes['R-ice-heat'];
  get('sd.step.clear_snow', 'ice_on_coil').next = routes['R-ice-step'];
  get('sd.observe.defrost_or_ice', 'actually_cooling').set = { sdMode: 'cool' };
  for (const [id, mode] of [['mode_heat', 'heat'], ['mode_cool', 'cool'], ['mode_unsure', 'unsure']]) get('sd.entry.outdoor', id).set = { sdMode: mode };
  const LEGAL = require('./sd-legal-cleared.json');
  const R11 = 'The house is getting cold, and someone at home is at risk from the cold (an infant, an older adult, or someone who is ill or medically fragile)';
  for (const [n, c] of [['sd.heat.cold_home_screen', 'someone_at_risk'], ['sd.gate.outdoor_hazard_screen', 'cold_exposure']]) {
    Object.assign(get(n, c), { label: LEGAL['020'], next: routes['R-cold'], gate: 'cold_exposure_911' });
  }
  Object.assign(get('sd.step.clear_snow', 'someone_at_risk_cold'), { label: R11, next: routes['R-cold'], gate: 'cold_exposure_911' });
  const sideFan = get('sd.intake.cabinet_confirm', 'side_fan_confirmed');
  sideFan.set = { sdSideConfirmed: true };
  sideFan.hint = LEGAL['045'];
  get('sd.landing.picker', 'landing_code').hint = LEGAL['047'];
  for (const id of ['sd.step.clear_outside', 'sd.step.clear_snow']) {
    const snow = id.endsWith('clear_snow');
    const said = quotes(draft.nodes[id].sourceText);
    const steps = said.filter(q => /^\d+\.\s/.test(q) || /Clear loose snow|Move ordinary|Only go out/.test(q));
    const watch = said.find(q => /watch from inside|Observe from/i.test(q)) || '';
    const stop = said.find(q => /^Stop if/.test(q)) || '';
    const what = said.find(q => /What this does|Moves loose/.test(q)) || (snow ? 'Moves loose snow away from the unit so it can breathe and defrost water can drain.' : 'Moves ordinary stored items and loose ground debris away from the air path.');
    nodes[id].notice = 'pn-short';
    nodes[id].step = {
      what,
      caution: snow ? 'Snow and ice around the unit are slippery, and the fins bend easily.' : 'The fan may start automatically. Fins bend easily.',
      source: snow ? 'From Daikin 3P515859-5S (p. 6), Bosch BOVA20 IOM (§2.3), and NEEP’s cold-climate install guide, checked October 11, 2026.' : 'LG Guide to Error Codes, CH61: clear obstacles around the outdoor unit; checked October 12, 2026.',
      steps: steps.length ? steps : [what],
      watch,
      stop,
      undo: 'If you’re not sure what you changed, put back the thermostat settings you wrote down. If you can’t, leave it and call a licensed HVAC professional.',
      locked: LOCKED
    };
  }
  nodes['sd.step.clear_outside'].step.watch = LEGAL['108'];
  nodes['sd.step.clear_outside'].step.stop = LEGAL['103'];
  function addBody(id, keys) {
    const node = nodes[id];
    for (const key of keys) {
      const line = LEGAL[key];
      if (!String(node.body).includes(line)) node.body = String(node.body).replace(/\s+$/, '') + ' ' + line;
    }
  }
  addBody('sd.observe.defrost_or_ice', ['021', '056', '063']);
  addBody('sd.read.code_capture', ['025']);
  addBody('sd.look.discharge_clearance', ['029']);
  addBody('sd.look.snow_height', ['029']);
  for (const id of ['sd.look.discharge_clearance', 'sd.look.intake_clearance', 'sd.look.snow_height', 'sd.observe.defrost_or_ice', 'sd.look.base_ice_drain', 'sd.look.mount_condition', 'sd.observe.fan_state']) {
    addBody(id, ['005']);
  }
  for (const [id, v] of Object.entries(draft.results)) {
    const outcome = v.outcome.includes('EE') ? 'emergency_exit' : v.outcome.includes('NB') ? 'next_step' : v.outcome.includes('II') ? 'insufficient_info' : 'call_pro';
    const copy = (v.copy || []).filter(x => !x.startsWith('REUSED') && !x.startsWith('PENDING'));
    const title = outcome === 'emergency_exit' ? 'Stop this check and get help.' : outcome === 'next_step' ? 'You reported clearing the area.' : 'Arrange an outdoor-unit check.';
    results[id] = {
      tier: outcome === 'emergency_exit' ? 'Stop / professional' : outcome === 'next_step' ? 'Basic homeowner check' : 'Professional guidance',
      title,
      urgency: '',
      explanation: 'These are homeowner-reported observations; the cause has not been confirmed.',
      actions: copy.length ? copy : ['Call a licensed HVAC professional and describe only what you could already see. Do not move, modify, or open the unit.'],
      avoid: 'Do not touch fins, reach through grilles, open equipment, or clear a stored code.',
      reason: v.reason,
      outcome,
      diyTier: outcome === 'next_step' ? 'basic' : 'pro_only'
    };
  }
  for (const [id, r] of Object.entries(results)) {
    const m = draft.results[id].outcome.match(/`([^`]+)`/);
    if (m) r.gate = m[1];
  }
  results.sd_cold_exposure.tier = 'Emergency';
  results.sd_cold_exposure.gate = 'cold_exposure_911';
  for (const n of Object.values(nodes)) for (const o of n.options) {
    if (typeof o.next === 'string' && o.next.startsWith('@')) {
      const r = results[o.next.slice(1)];
      if (r && r.outcome === 'emergency_exit') o.gate = r.gate || r.reason;
    }
  }
  return { nodes, results };
};
