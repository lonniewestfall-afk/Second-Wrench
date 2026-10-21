/* Thermostat Wave 3: analog dial and lever lane, TS-G79–G101, TS-A45–A47, M113–M145.
 * Hypothetical sessions only. No network.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const AP = '\u2019';

function load() {
  const cache = {};
  const SW_CONFIG = {
    advancedRepairsEnabled: false,
    aiThermostatEnabled: false,
    mirrorsEnabled: false,
    stageLatchStepsEnabled: false,
    tsAnalogWave3Enabled: true,
    contentVersion: '2026-10-20.15'
  };
  const context = vm.createContext({ console, Date, URL, SW_CONFIG });
  function read(file) {
    file = path.resolve(file);
    if (cache[file]) return cache[file].exports;
    const module = { exports: {} };
    cache[file] = module;
    const src = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.json')) module.exports = JSON.parse(src);
    else vm.runInContext('(function(module,exports,require){' + src + '\n})', context, { filename: file })(module, module.exports, request => read(path.resolve(path.dirname(file), request)));
    return module.exports;
  }
  return { F: read(path.join(root, 'assets/flow.js')), TA: read(path.join(root, 'assets/ta-wave3.js')), SW_CONFIG };
}

const { F, TA, SW_CONFIG } = load();
const G79 = /\b(remove|take (it |the cover )?off|unscrew|loosen|adjust|calibrat\w*|tilt|open (it|the thermostat))\b/ig;
const G84 = /\b(safe|safely|safer|safest|recommended|ideal|best)\b|correct setting/i;
const MINUTES = /\b\d+\s*(?:to\s*\d+\s+)?minutes?\b/i;
const PHONE = /\b\d{3}[-.\s)]\d{3}[-.\s]\d{4}\b|\b1-\d{3}-\d{3}-\d{4}\b|\(\d{3}\)\s*\d{3}/;
const CLEANUP = /scoop|tape|eyedropper|pick up|vacuum it/i;
const BATTERY = /\b(change|replace|put in|install)\b[^.]{0,40}\bbatter/i;
const WIRE = /^(Connect|Wire|Install|Rewire)\b/;
const PL58 = 'If the screen stays blank or keeps losing power after the floor checks, the usual causes are a loose or missing power wire or a problem at the furnace or air-handler controls. A pro checks those.';
const PL78 = 'The house is getting cold, and someone at home is at risk from the cold (an infant, an older adult, or someone who is ill or medically fragile)';
const PL85 = 'If the thermostat is on Heat or emergency heat, leave it there. If it' + AP + 's on Off or Cool and the screen works, you can set it to Heat. Don' + AP + 't change any other settings.';
const TA_NODES = [
  'ta.gate.look_only', 'ta.id.look', 'ta.diag.symptom', 'ta.check.switches', 'ta.check.thermometer',
  'ta.check.level', 'ta.check.location', 'ta.check.start_point', 'ta.check.batteries'
];

function sentences(text) {
  return String(text || '').split(/\n+/).flatMap(part => part.split(/(?<=[.!?])\s+/)).map(s => s.trim()).filter(Boolean);
}
function negated(text, index) {
  return /\b(Don['\u2019]t|Do not|Never)\b/i.test(text.slice(0, index));
}
function asks() {
  return ['PL102', 'PL103', 'PL104', 'PL105', 'PL106', 'PL107', 'PL108'].map(id => TA.copy[id]);
}
function g79hit(sentence) {
  if (asks().indexOf(sentence.trim()) !== -1) return null;
  const text = sentence.replace(/open it to the outside/ig, '');
  const screw = /\bscrewdriver\b/i.exec(text);
  if (screw && !negated(text, screw.index)) return 'screwdriver';
  const re = new RegExp(G79.source, 'ig');
  let match;
  while ((match = re.exec(text))) {
    if (!negated(text, match.index)) return match[0];
  }
  return null;
}
function digitOk(text) {
  if (!/\d/.test(text || '')) return true;
  if (String(text).indexOf('Skip step 1') !== -1 && String(text).indexOf('no batteries') !== -1) return true;
  if (String(text).indexOf('MANUAL:') !== -1 && String(text).indexOf('50') !== -1) return true;
  return false;
}
function bundle() {
  const out = [];
  TA_NODES.forEach(id => {
    const node = F.nodes[id];
    out.push(node.title, node.body, node.caution);
    node.options.forEach(op => out.push(op.label, op.hint, op.fact));
  });
  Object.keys(F.results).forEach(id => {
    if (id.indexOf('ta_') !== 0) return;
    const res = F.results[id];
    out.push(res.title, res.explanation, res.urgency, res.avoid);
    (res.actions || []).forEach(item => out.push(item));
  });
  Object.keys(TA.copy).forEach(id => out.push(TA.copy[id]));
  return out.filter(item => item != null && item !== '');
}
function base() {
  const state = F.create('analog check', 'test');
  state.product = 'ts';
  state.safetyCleared = true;
  state.consent = true;
  state.termsVersion = 'test';
  state.tsAnalog = true;
  state.tsModel = 'analog';
  state.tsOrigin = 'ta.gate.look_only';
  state.answers.push({
    node: 'ts.gate.safety_stops', choice: 'ts_none_of_these', label: 'None of these',
    fact: 'Thermostat safety check: none of the stops reported.', at: '2026-10-20T00:00:00.000Z'
  });
  return state;
}
function on(id) {
  const state = base();
  state.node = id;
  return state;
}
function clone(state) { return JSON.parse(JSON.stringify(state)); }

function check() {
  const errors = [];
  const fail = (id, msg) => errors.push(id + (msg ? ' ' + msg : ''));
  const texts = bundle();
  const askSet = asks();

  texts.forEach(text => {
    sentences(text).forEach(sentence => {
      if (askSet.indexOf(sentence.trim()) !== -1) return;
      const hit = g79hit(sentence);
      if (hit) fail('TS-G79', hit + ' in ' + sentence.slice(0, 80));
      if (WIRE.test(sentence)) fail('TS-G91', sentence.slice(0, 80));
    });
    if (G84.test(text)) fail('TS-G84', text.slice(0, 80));
    if (/'/.test(text)) fail('TS-G85', text.slice(0, 80));
    if (!digitOk(text)) fail('TS-G83', text.slice(0, 80));
    if (/ESTIMATE/i.test(text) && /\b(must|should be|needs to be)\b/i.test(text)) fail('TS-G83', 'ESTIMATE ' + text.slice(0, 60));
    if (MINUTES.test(text) || /\bESTIMATE\b/.test(text)) fail('TS-G95', text.slice(0, 80));
    if (BATTERY.test(text)) fail('TS-G92', text.slice(0, 80));
    if (/epa\.gov|tc\.canada\.ca/i.test(text)) fail('TS-G100', text.slice(0, 80));
    if (/\bscrewdriver\b/i.test(text)) fail('TS-G94', 'screwdriver');
  });
  if (TA.copy.PL62.indexOf('When its reading stops changing') === -1) fail('TS-G95', 'PL-TA-62');
  if (F.nodes['ta.check.thermometer'].body.indexOf('When its reading stops changing') === -1) fail('TS-G95', 'thermometer body');

  const mercury = F.results.ta_mercury_broken_stop;
  if (mercury.explanation !== TA.copy.PL116b || mercury.source !== 'S-HC' || mercury.gate !== 'ta_mercury') fail('TS-G82', 'mercury result');
  if (CLEANUP.test(mercury.explanation) || PHONE.test(mercury.explanation)) fail('TS-G82', 'cleanup or phone');
  const bulb = F.nodes['ta.gate.look_only'].options.find(op => op.id === 'broken_bulb');
  if (!bulb || bulb.next !== '@ta_mercury_broken_stop' || bulb.gate !== 'ta_mercury') fail('TS-G82', 'broken_bulb edge');

  TA_NODES.forEach(id => {
    const options = F.nodes[id].options;
    if (options[0].id !== 'cold_home_risk') fail('TS-G80', id + ' cold');
    const tail = options.slice(-3).map(op => op.id).join(',');
    if (tail !== 'analog_looks_different,analog_needs_cover_off,hazard_now') fail('TS-G80', id + ' tail');
    options.forEach(op => {
      if (typeof op.next === 'string' && (op.next.indexOf('ts.step.') === 0 || op.next === 'ts.landing.picker')) fail('TS-G88', id + '/' + op.id);
    });
  });
  if (F.nodes['ta.gate.look_only'].safetyGate !== true) fail('TS-G81', 'safety_gate');
  const replace = F.nodes['ta.diag.symptom'].options.find(op => op.id === 'want_replace');
  if (!replace || replace.next !== '@ta_replace_pro') fail('TS-G91', 'want_replace');
  const batt = F.nodes['ta.check.batteries'].options.find(op => op.id === 'batt_visible');
  if (!batt || batt.next !== '@ta_looks_different') fail('TS-G92', 'batt_visible');
  const stuck = F.nodes['ta.check.switches'].options.find(op => op.id === 'switch_stuck');
  if (!stuck || stuck.next !== '@ta_cover_off_stop') fail('TS-G94', 'switch_stuck');
  if (F.nodes['ta.check.switches'].body.indexOf('only with your finger') === -1) fail('TS-G94', 'finger');
  TA_NODES.forEach(id => {
    const cold = F.nodes[id].options.find(op => op.id === 'cold_home_risk');
    if (!cold || cold.label !== PL78) fail('TS-G98', id);
  });
  if (F.results.ts_blank_after_basics.explanation !== PL58) fail('TS-G98', 'PL-58');
  if (F.results.ts_cold_home_urgent.actions[2] !== PL85) fail('TS-G98', 'PL-85');
  if (F.nodes['ts.intake.brand_picker'].options.some(op => op.id === 'brand_analog')) fail('TS-G88', 'stored brand_analog');

  if (errors.length) throw new Error(errors.join('\n'));

  const unsafe = F.create('', 'test');
  unsafe.product = 'ts';
  unsafe.node = 'ts.intake.brand_picker';
  unsafe.safetyCleared = true;
  unsafe.consent = true;
  unsafe.answers = [];
  const brandTarget = TA.route(unsafe, 'ts.intake.brand_picker', 'brand_analog', { id: 'brand_analog' }, 'ta.gate.look_only');
  if (brandTarget !== 'ts.gate.safety_stops') fail('TS-G81', 'TS-A45 brand_analog skipped ts.gate.safety_stops');

  ['no_heat_any', 'start_never'].forEach(choice => {
    const nodeId = choice === 'start_never' ? 'ta.check.start_point' : 'ta.diag.symptom';
    const state = on(nodeId);
    const target = TA.route(state, nodeId, choice, { id: choice }, '@ts_blank_after_basics');
    const expected = SW_CONFIG.tsBlankScreenV2Enabled === true ? 'ts.gate.safety_stops' : '@ts_blank_after_basics';
    if (target !== expected) fail('TS-G90', choice + ' -> ' + target);
  });

  const plain = F.viewNode('ta.check.switches', on('ta.check.switches'));
  if (plain.body.indexOf(TA.copy.PL48a) !== -1) fail('TS-G94', '48a without ta_hp');
  if (plain.options.some(op => op.id === 'sys_was_off_or_cool') !== true) fail('TS-G94', 'heat session missing Off/Cool');
  const hp = on('ta.check.switches');
  hp.taHp = true;
  const hpView = F.viewNode('ta.check.switches', hp);
  if (hpView.options.some(op => op.id === 'sys_was_off_or_cool')) fail('TS-G94', 'Off/Cool offered with ta_hp');
  const at48 = hpView.body.indexOf(TA.copy.PL48);
  const at48a = hpView.body.indexOf(TA.copy.PL48a);
  const at49 = hpView.body.indexOf(TA.copy.PL49);
  if (!(at48 >= 0 && at48a > at48 && at49 > at48a)) fail('TS-G94', '48a order');
  const fan = on('ta.check.switches');
  fan.taSymptom = 'fan_issue';
  const fanIds = F.viewNode('ta.check.switches', fan).options.map(op => op.id);
  if (fanIds[0] !== 'cold_home_risk' || fanIds[1] !== 'fan_on_setting') fail('TS-G94', 'fan order');

  const hpPath = on('ta.diag.symptom');
  F.answer(hpPath, 'heat_pump_system');
  if (hpPath.node !== 'ta.check.switches' || !hpPath.taHp) fail('TS-G89', 'heat pump entry');
  F.answer(hpPath, 'sys_heat_no_change');
  if (hpPath.result !== 'ta_installer_script' || hpPath.node === 'ta.check.start_point') fail('TS-G89', 'start point with ta_hp');
  const loc = on('ta.check.location');
  loc.taHp = true;
  const skipped = TA.route(loc, 'ta.check.location', 'near_not_sure', { id: 'near_not_sure' }, 'ta.check.start_point');
  if (skipped === 'ta.check.start_point') fail('TS-G89', 'location entered start point');

  const inner = { html: 'POWER-CELL', text: 'POWER-CELL', steps: [] };
  const digitalPanel = TA.decoratePanel(inner, 'NEST-NT', 'ts.power.blank_screen', { state: { tsModel: 'NEST-NT', tsOrigin: '' } });
  if (digitalPanel !== inner || String(digitalPanel.text).indexOf(TA.copy.PL46) !== -1) fail('TS-G93', 'digital power cell');
  const unknownPanel = TA.decoratePanel(inner, 'unknown', 'ts.power.blank_screen', { state: { tsModel: 'unknown', tsOrigin: '' } });
  if (unknownPanel !== inner) fail('TS-G93', 'unknown model');
  const modelOnly = TA.decoratePanel(inner, 'analog', 'ts.power.blank_screen', { state: { tsModel: 'analog', tsOrigin: 'ts.power.blank_screen' } });
  if (modelOnly !== inner) fail('TS-G93', 'origin check dropped');
  const analogPanel = TA.decoratePanel(inner, 'analog', 'ts.power.blank_screen', { state: { tsModel: 'analog', tsOrigin: 'ta.diag.symptom' } });
  if (!analogPanel || analogPanel === inner || analogPanel.text.indexOf(TA.copy.PL46) === -1) fail('TS-G93', 'analog origin note');

  function presented(id, extra) {
    return TA.present(Object.assign({ result: id, product: 'ts' }, extra || {}), F.results[id]);
  }
  ['ta_installer_script', 'ta_replace_pro'].forEach(id => {
    const row = presented(id, { taNotes: { region: 'US' } });
    const exits = row.exits || [];
    if (!row.disposal || !row.disposal.length || !row.disposal[0] || row.disposal[0].id !== 'PL-TA-121') fail('TS-G87', id + ' card');
    if (exits.map(op => op.id).join(',') !== 'broken_bulb,hazard_now') fail('TS-G96', id + ' exits');
    if (!exits[0] || exits[0].next !== '@ta_mercury_broken_stop') fail('TS-G96', id + ' broken');
    if (!exits[1] || exits[1].next !== '@ts_hazard_now') fail('TS-G96', id + ' hazard');
  });
  const regions = {
    US: ['PL-TA-121', 'PL-TA-122'],
    Canada: ['PL-TA-121', 'PL-TA-123'],
    PEI: ['PL-TA-121', 'PL-TA-123', 'PL-TA-124'],
    unknown: ['PL-TA-121', 'PL-TA-122', 'PL-TA-123', 'PL-TA-124']
  };
  Object.keys(regions).forEach(region => {
    const ids = TA.disposalFor({ taNotes: { region: region } }, 'ta_installer_script').map(row => row.id);
    if (ids.join(',') !== regions[region].join(',')) fail('TS-G87', region + ' ' + ids.join(','));
  });
  const usCard = TA.disposalFor({ taRegion: 'US' }, 'ta_installer_script');
  const link = usCard[1] && usCard[1].link;
  if (!link || link.phrase !== 'thermostat-recycle.org' || link.href !== 'https://thermostat-recycle.org/program-info/faqs/') fail('TS-G87', 'TRC href');
  if (TA.disposalFor({ taNotes: { region: 'PEI' } }, 'ta_replace_pro').some(row => row.id === 'PL-TA-122')) fail('TS-G87', 'PEI showed US');

  const digitalCold = presented('ts_cold_home_urgent', { tsModel: 'NEST-NT', tsOrigin: '' });
  const analogCold = presented('ts_cold_home_urgent', { tsModel: 'analog', tsOrigin: 'ta.check.level' });
  if (digitalCold.actions[2] !== PL85) fail('TS-G97', 'digital PL-85');
  if (analogCold.actions[2] !== TA.copy.PL133 || /screen/i.test(analogCold.actions[2])) fail('TS-G97', 'analog cold');
  const digitalBlank = presented('ts_blank_after_basics', { tsModel: 'NEST-NT', tsOrigin: 'ts.power.blank_screen' });
  const analogBlank = presented('ts_blank_after_basics', { tsModel: 'analog', tsOrigin: 'ta.diag.symptom' });
  if (digitalBlank.explanation !== PL58) fail('TS-G97', 'digital PL-58');
  if (analogBlank.explanation !== TA.copy.PL132 || /screen/i.test(analogBlank.explanation)) fail('TS-G97', 'analog blank');

  const dropped = TA.scriptFor({ taLook: 'look_rect_dial', taNotes: { audience: 'installer', install_when: 'this summer' } });
  if (dropped.some(row => row.id === 'PL-TA-134')) fail('TS-G86', 'empty equipment rendered');
  const bare = TA.scriptFor({ taLook: 'look_round', taNotes: { audience: 'pro' } });
  if (bare.map(row => row.text).join('\n').indexOf('new furnace') !== -1) fail('TS-G86', 'unlogged slot');
  if (TA.rules.causeScript) fail('TS-G86', 'cause stated');
  bare.concat(dropped).forEach(row => {
    if (!row.id || String(row.id).indexOf('PL-TA-') !== 0) fail('TS-G99', 'untagged line');
    if (/set wrong|the cause is/i.test(row.text || '')) fail('TS-G86', row.text);
  });
  function lines140(location) {
    return TA.scriptFor({ taLocation: location, taLook: 'look_round', taNotes: { audience: 'pro' } }).filter(row => row.id === 'PL-TA-140');
  }
  if (lines140('clear').length || lines140('unknown').length) fail('TS-G101', 'clear location rendered');
  const once = lines140('register');
  if (once.length !== 1 || once[0].text !== 'Near it: register.') fail('TS-G101', 'register');
  const tilted = TA.scriptFor({ taLevel: 'tilted', taLook: 'look_round', taNotes: { audience: 'pro' } }).find(row => row.id === 'PL-TA-139');
  const levelLine = TA.scriptFor({ taLevel: 'ok', taLook: 'look_round', taNotes: { audience: 'pro' } }).find(row => row.id === 'PL-TA-139');
  if (!tilted || tilted.text !== 'Checked with a phone level, it looks tilted.') fail('TS-G101', 'tilted');
  if (!levelLine || levelLine.text !== 'Checked with a phone level, it looks level.') fail('TS-G101', 'level');

  if (errors.length) throw new Error(errors.join('\n'));

  SW_CONFIG.tsBlankScreenV2Enabled = true;
  try {
    const hand = on('ta.diag.symptom');
    const target = TA.route(hand, 'ta.diag.symptom', 'no_heat_any', { id: 'no_heat_any' }, '@ts_blank_after_basics');
    if (target !== 'ts.gate.safety_stops' || hand.tsHandoff !== 'blank' || hand.tsModel !== 'analog') fail('TS-G90', 'v2 reentry');
    hand.node = 'ts.gate.safety_stops';
    const screen = TA.route(hand, 'ts.gate.safety_stops', 'ts_none_of_these', { id: 'ts_none_of_these' }, 'ts.intake.brand_picker');
    if (screen !== 'ts.power.blank_screen') fail('TS-G90', 'v2 blank');
    const panel = F.renderTsPanel('analog', 'ts.power.blank_screen', { state: hand });
    if (panel.text.indexOf(TA.copy.PL46) === -1) fail('TS-G93', 'v2 power note');
  } finally {
    delete SW_CONFIG.tsBlankScreenV2Enabled;
  }
  if (errors.length) throw new Error(errors.join('\n'));

  const start = on('ts.intake.brand_picker');
  F.answer(start, 'brand_analog');
  if (start.node !== 'ta.gate.look_only') fail('TS-A45', 'brand did not reach look_only');
  if (!start.answers.some(row => row.node === 'ts.gate.safety_stops' && row.choice === 'ts_none_of_these')) fail('TS-A45', 'safety missing');
  const queue = [start];
  const seen = new Set();
  const looks = new Set();
  const symptoms = new Set();
  let guard = 0;
  while (queue.length) {
    const state = queue.shift();
    const key = [state.node, state.result, state.taHp ? 1 : 0, state.taSymptom || '', state.taLook || '', state.tsHandoff || '', state.taFan || ''].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    if (++guard > 4000) { fail('TS-A45', 'walk did not finish'); break; }
    if (state.result) continue;
    if (!state.node || !F.nodes[state.node]) { fail('TS-A45', 'dead ' + state.node); continue; }
    if (state.node === 'ts.landing.picker' || String(state.node).indexOf('ts.step.') === 0) { fail('TS-G88', state.node); continue; }
    if (String(state.node).indexOf('ts.') === 0 && state.node !== 'ts.gate.safety_stops') continue;
    const view = F.viewNode(state.node, state);
    if (!view || !view.options.length) { fail('TS-A45', 'no options ' + state.node); continue; }
    view.options.forEach(op => {
      const next = clone(state);
      try { F.answer(next, op.id); }
      catch (error) { fail('TS-A45', state.node + '/' + op.id + ' ' + error.message); return; }
      if (next.taLook) looks.add(next.taLook);
      if (next.taSymptom) symptoms.add(next.taSymptom);
      if (!next.result && next.node && !F.nodes[next.node] && String(next.node).indexOf('ts.') !== 0) fail('TS-A45', 'dead end ' + op.id);
      queue.push(next);
    });
  }
  ['look_rect_dial', 'look_round', 'look_lever', 'look_other_dial'].forEach(id => {
    if (!looks.has(id)) fail('TS-A45', 'look ' + id);
  });
  ['no_heat_any', 'high_set_overshoot', 'overshoot_only', 'short_cycles', 'fan_issue', 'needle_stuck', 'want_replace', 'heat_pump_system'].forEach(id => {
    if (!symptoms.has(id)) fail('TS-A45', 'symptom ' + id);
  });

  TA_NODES.forEach(id => {
    const stopped = on(id);
    F.stop(stopped);
    if (stopped.node !== 'sw.co.fast_exit') fail('TS-A46', id + ' stop');
    F.answer(stopped, 'co_no');
    if (stopped.node !== 'ac.gate.cluster_entry') fail('TS-A46', id + ' triage');
    const hazard = on(id);
    F.answer(hazard, 'hazard_now');
    if (hazard.result !== 'ts_hazard_now') fail('TS-A46', id + ' hazard');
    const cover = on(id);
    F.answer(cover, 'analog_needs_cover_off');
    if (cover.result !== 'ta_cover_off_stop') fail('TS-A46', id + ' cover');
  });
  ['ta_installer_script', 'ta_replace_pro'].forEach(id => {
    const stopped = on('ta.gate.look_only');
    stopped.node = null;
    stopped.result = id;
    F.stop(stopped);
    if (stopped.node !== 'sw.co.fast_exit') fail('TS-A46', id + ' stop');
    F.answer(stopped, 'co_no');
    if (stopped.node !== 'ac.gate.cluster_entry') fail('TS-A46', id + ' triage');
    const broken = on('ta.gate.look_only');
    broken.node = null;
    broken.result = id;
    F.followResult(broken, 'broken_bulb');
    if (broken.result !== 'ta_mercury_broken_stop') fail('TS-A46', id + ' broken_bulb');
    const hazard = on('ta.gate.look_only');
    hazard.node = null;
    hazard.result = id;
    F.followResult(hazard, 'hazard_now');
    if (hazard.result !== 'ts_hazard_now') fail('TS-A46', id + ' result hazard');
  });

  const example = on('ta.gate.look_only');
  example.taNotes = {
    audience: 'installer',
    equipment: 'new furnace',
    install_when: 'this summer',
    start_dial: '30 °C (86 °F)',
    builtin_reading: '20 °C (68 °F)',
    needleNotMoving: true,
    region: 'PEI'
  };
  ['look_only_ok', 'look_rect_dial', 'high_set_overshoot', 'sys_heat_no_change', 'thermo_differ', 'level_cant', 'near_not_sure', 'start_well_above'].forEach(choice => {
    F.answer(example, choice);
  });
  if (example.result !== 'ta_installer_script') fail('TS-A47', 'result ' + example.result);
  const shown = F.presentResult(example);
  if (shown.explanation !== TA.copy.PL110) fail('TS-A47', 'PL-TA-110');
  const expectIds = ['PL-TA-134', 'PL-TA-136', 'PL-TA-137', 'PL-TA-103', 'PL-TA-104', 'PL-TA-105', 'PL-TA-106', 'PL-TA-107', 'PL-TA-141'];
  const gotIds = (shown.script || []).map(row => row.id);
  if (gotIds.join(',') !== expectIds.join(',')) fail('TS-A47', 'ids ' + gotIds.join(','));
  if (gotIds.indexOf('PL-TA-102') !== -1 || gotIds.indexOf('PL-TA-108') !== -1) fail('TS-A47', 'extra ask');
  const expectText = [
    'Hi, you installed my new furnace this summer. The heat isn' + AP + 't working right with my old rectangle thermostat with a round dial and a separate small thermometer, and I' + AP + 'd like you to check it while the install is new.',
    'The heat doesn' + AP + 't come on until I turn the dial up to 30 °C (86 °F), then the house gets too warm.',
    'The thermostat' + AP + 's own thermometer reads about 20 °C (68 °F) and never moves.',
    TA.copy.PL103,
    TA.copy.PL104,
    TA.copy.PL105,
    TA.copy.PL106,
    TA.copy.PL107,
    'Thanks.'
  ];
  (shown.script || []).forEach((row, index) => {
    if (row.text !== expectText[index]) fail('TS-A47', 'line ' + index);
    if (index !== 0 && String(row.text).indexOf('new furnace') !== -1) fail('TS-A47', 'new furnace outside opening');
  });
  const cardIds = (shown.disposal || []).map(row => row.id);
  if (cardIds.join(',') !== 'PL-TA-121,PL-TA-123,PL-TA-124') fail('TS-A47', 'disposal ' + cardIds.join(','));

  const round = {
    result: 'ta_installer_script', product: 'ts', taLook: 'look_round', taSymptom: 'overshoot_only', taLevel: 'tilted',
    taNotes: { audience: 'pro', region: 'US' }
  };
  const w2 = TA.present(round, F.results.ta_installer_script);
  const w2Asks = (w2.script || []).filter(row => /^PL-TA-10[2-8]$/.test(row.id)).map(row => row.id);
  if (w2Asks.join(',') !== 'PL-TA-102,PL-TA-104,PL-TA-105,PL-TA-107') fail('TS-A47', 'W-A2 asks ' + w2Asks.join(','));
  if ((w2.disposal || []).map(row => row.id).join(',') !== 'PL-TA-121,PL-TA-122') fail('TS-G87', 'W-A2 card');

  const brokenWalk = on('ta.gate.look_only');
  F.answer(brokenWalk, 'broken_bulb');
  if (brokenWalk.result !== 'ta_mercury_broken_stop' || F.presentResult(brokenWalk).explanation !== TA.copy.PL116b) fail('TS-G82', 'walk');

  if (errors.length) throw new Error(errors.join('\n'));
}

const configText = fs.readFileSync(path.join(root, 'assets/config.js'), 'utf8');
assert(configText.includes('advancedRepairsEnabled: false'), 'advancedRepairsEnabled stays false');
assert(configText.includes('tsAnalogWave3Enabled: true'), 'tsAnalogWave3Enabled is on after the asserts');
assert(configText.includes("contentVersion: '2026-10-20.15'"), 'content version is 2026-10-20.15');
const waveSource = fs.readFileSync(path.join(root, 'assets/ta-wave3.js'), 'utf8');
assert(!/epa\.gov|tc\.canada\.ca/i.test(waveSource), 'analog lane has a dropped link');
const appText = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
const extras = appText.slice(appText.indexOf('function analogResultExtras'), appText.indexOf('function resultPage'));
assert(extras && !/epa\.gov|tc\.canada\.ca/i.test(extras), 'result extras have a dropped link');
const disposalAt = appText.indexOf('r.disposal');
const choiceAt = appText.indexOf('data-result-choice');
assert(disposalAt !== -1 && choiceAt !== -1 && disposalAt < choiceAt, 'disposal card renders before result exits');

check();

SW_CONFIG.tsAnalogWave3Enabled = false;
const storedBrand = F.nodes['ts.intake.brand_picker'].options.map(op => op.id + '>' + op.next);
const offBrand = F.viewNode('ts.intake.brand_picker', on('ts.intake.brand_picker')).options.map(op => op.id + '>' + op.next);
assert.deepEqual(offBrand, storedBrand, 'TS-A45 flag off brand picker');
assert(!offBrand.some(row => row.indexOf('brand_analog') === 0), 'TS-A45 flag off hides brand_analog');
['ts.gate.safety_stops', 'ts.landing.picker', 'ts.power.blank_screen'].forEach(id => {
  const state = on(id);
  SW_CONFIG.tsAnalogWave3Enabled = false;
  const off = F.viewNode(id, state).options.map(op => op.id + '>' + op.next);
  SW_CONFIG.tsAnalogWave3Enabled = true;
  const onIds = F.viewNode(id, state).options.map(op => op.id + '>' + op.next);
  assert.deepEqual(onIds, off, 'TS-A45 flag does not change ' + id);
});
SW_CONFIG.tsAnalogWave3Enabled = true;
const onBrand = F.viewNode('ts.intake.brand_picker', on('ts.intake.brand_picker')).options.map(op => op.id);
assert(onBrand.indexOf('brand_analog') !== -1 && onBrand.indexOf('brand_analog') < onBrand.indexOf('brand_other'), 'brand_analog sits before brand_other');
assert(!F.nodes['ts.intake.brand_picker'].options.some(op => op.id === 'brand_analog'), 'stored picker stays unchanged');

let mutations = 0;
function mutation(name, apply, revert, pattern) {
  apply();
  try {
    assert.throws(() => check(), pattern, name);
  } finally {
    revert();
  }
  mutations += 1;
}
function bodyAppend(id, extra, pattern, name) {
  const node = F.nodes[id];
  const saved = node.body;
  mutation(name, () => { node.body = saved + extra; }, () => { node.body = saved; }, pattern);
}
bodyAppend('ta.check.level', ' Remove the cover and move the anticipator lever', /TS-G79/, 'M113');
bodyAppend('ta.check.level', ' Tilt the thermostat to check the switch', /TS-G79/, 'M114');
{
  const options = F.nodes['ta.check.switches'].options;
  const saved = options.slice();
  mutation('M115', () => {
    const index = options.findIndex(op => op.id === 'cold_home_risk');
    const row = options.splice(index, 1)[0];
    options.splice(1, 0, row);
  }, () => { options.splice(0, options.length, ...saved); }, /TS-G80/);
}
{
  const options = F.nodes['ta.check.batteries'].options;
  const saved = options.slice();
  mutation('M116', () => {
    const index = options.findIndex(op => op.id === 'hazard_now');
    options.splice(index, 1);
  }, () => { options.splice(0, options.length, ...saved); }, /TS-G80/);
}
{
  const node = F.nodes['ta.gate.look_only'];
  const saved = node.safetyGate;
  mutation('M117', () => { node.safetyGate = false; }, () => { node.safetyGate = saved; }, /TS-G81/);
}
{
  const res = F.results.ta_mercury_broken_stop;
  const saved = res.explanation;
  mutation('M118', () => { res.explanation = saved + ' Scoop the beads onto paper'; }, () => { res.explanation = saved; }, /TS-G82/);
}
{
  const op = F.nodes['ta.check.thermometer'].options.find(item => item.id === 'thermo_match');
  const saved = op.label;
  mutation('M119', () => { op.label = 'must be within 1°'; }, () => { op.label = saved; }, /TS-G83/);
}
bodyAppend('ta.check.level', ' the recommended anticipator setting is 0.4 A', /TS-G84[\s\S]*TS-G83|TS-G83[\s\S]*TS-G84/, 'M120');
{
  const res = F.results.ta_cover_off_stop;
  const saved = res.explanation;
  mutation('M121', () => { res.explanation = saved.replace('\u2019', "'"); }, () => { res.explanation = saved; }, /TS-G85/);
}
{
  const saved = TA.rules.causeScript;
  mutation('M122', () => { TA.rules.causeScript = 'Your anticipator is set wrong.'; }, () => { TA.rules.causeScript = saved; }, /TS-G86/);
}
{
  const saved = TA.rules.disposalOnReplace;
  mutation('M123', () => { TA.rules.disposalOnReplace = false; }, () => { TA.rules.disposalOnReplace = saved; }, /TS-G87/);
}
{
  const op = F.nodes['ta.id.look'].options.find(item => item.id === 'look_round');
  const saved = op.next;
  mutation('M124', () => { op.next = 'ts.step.offset'; }, () => { op.next = saved; }, /TS-G88/);
}
{
  const saved = TA.rules.blankFallback;
  mutation('M125', () => { TA.rules.blankFallback = false; }, () => { TA.rules.blankFallback = saved; }, /TS-G90/);
}
{
  const res = F.results.ta_replace_pro;
  const saved = res.explanation;
  mutation('M126', () => { res.explanation = saved + ' Connect the R and W wires to the new thermostat'; }, () => { res.explanation = saved; }, /TS-G91/);
}
bodyAppend('ta.check.batteries', ' Put in fresh AA batteries', /TS-G92/, 'M127');
{
  const saved = TA.rules.requireSafety;
  mutation('M128', () => { TA.rules.requireSafety = false; }, () => { TA.rules.requireSafety = saved; }, /TS-A45[\s\S]*TS-G81|TS-G81[\s\S]*TS-A45/);
}
{
  const saved = TA.rules.powerNote;
  mutation('M129', () => { TA.rules.powerNote = 'unknown-too'; }, () => { TA.rules.powerNote = saved; }, /TS-G93/);
  mutation('M130', () => { TA.rules.powerNote = 'model-only'; }, () => { TA.rules.powerNote = saved; }, /TS-G93/);
}
{
  const saved = TA.rules.render48aOnlyWithHp;
  mutation('M131', () => { TA.rules.render48aOnlyWithHp = false; }, () => { TA.rules.render48aOnlyWithHp = saved; }, /TS-G94/);
}
{
  const saved = TA.rules.hpHideOffCool;
  mutation('M132', () => { TA.rules.hpHideOffCool = false; }, () => { TA.rules.hpHideOffCool = saved; }, /TS-G94/);
}
bodyAppend('ta.check.switches', ' Use a small screwdriver to move the switch', /TS-G79[\s\S]*TS-G94|TS-G94[\s\S]*TS-G79/, 'M133');
bodyAppend('ta.check.thermometer', ' Leave it 20 to 30 minutes', /TS-G95/, 'M134');
{
  const saved = TA.copy.PL104;
  mutation('M135', () => { TA.copy.PL104 = saved.replace('my heating system', 'the new furnace'); }, () => { TA.copy.PL104 = saved; }, /TS-A47/);
}
{
  const saved = TA.rules.levelAsk;
  mutation('M136', () => { TA.rules.levelAsk = 'not-ok'; }, () => { TA.rules.levelAsk = saved; }, /TS-A47/);
}
{
  const saved = TA.rules.replaceHasBroken;
  mutation('M137', () => { TA.rules.replaceHasBroken = false; }, () => { TA.rules.replaceHasBroken = saved; }, /TS-G96/);
}
{
  const saved = TA.rules.resultHazardNext;
  mutation('M138', () => { TA.rules.resultHazardNext = '@ta_installer_script'; }, () => { TA.rules.resultHazardNext = saved; }, /TS-G96/);
}
{
  const saved = TA.rules.analogVariant;
  mutation('M139', () => { TA.rules.analogVariant = 'always'; }, () => { TA.rules.analogVariant = saved; }, /TS-G97/);
  mutation('M140', () => { TA.rules.analogVariant = 'never'; }, () => { TA.rules.analogVariant = saved; }, /TS-G97/);
}
{
  const op = F.nodes['ta.gate.look_only'].options.find(item => item.id === 'cold_home_risk');
  const saved = op.label;
  mutation('M141', () => { op.label = 'The house is getting cold and someone needs warmth soon'; }, () => { op.label = saved; }, /TS-G98/);
}
{
  const saved = TA.rules.untaggedScript;
  mutation('M142', () => { TA.rules.untaggedScript = 'The house feels wrong today.'; }, () => { TA.rules.untaggedScript = saved; }, /TS-G99/);
}
{
  const res = F.results.ta_mercury_broken_stop;
  const saved = res.explanation;
  mutation('M143', () => { res.explanation = 'See https://www.epa.gov/mercury/what-do-if-mercury-thermometer-breaks'; }, () => { res.explanation = saved; }, /TS-G100/);
}
{
  const saved = TA.rules.locationClearRenders140;
  mutation('M144', () => { TA.rules.locationClearRenders140 = true; }, () => { TA.rules.locationClearRenders140 = saved; }, /TS-G101/);
}
{
  const saved = TA.rules.pl139;
  mutation('M145', () => { TA.rules.pl139 = 'd6'; }, () => { TA.rules.pl139 = saved; }, /TS-G101/);
}
assert.equal(mutations, 33, 'M113–M145');
check();
console.log('Thermostat wave 3 passed: TS-G79–G101, TS-A45–A47, M113–M145.');
