'use strict';
/* Build a compact retrieval index from the decision trees, answer pages, and safety rules.
 * Run from scripts/build-public.js and before the ask tests. Do not hand-edit the JSON. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trim() + '…';
}

function prohibition(sentence) {
  return /\b(do not|don't|don’t|never|avoid|leave the|leave it)\b/i.test(sentence);
}

function keepSentence(sentence) {
  if (prohibition(sentence)) return true;
  const t = sentence.toLowerCase();
  if (/\b(relight|re-light|light the pilot)\b/.test(t)) return false;
  if (/\b(add|charge|recover) (the )?(refrigerant|freon)\b/.test(t)) return false;
  if (/\bopen the (breaker |electrical )?panel\b/.test(t)) return false;
  if (/\b(jumper|jump the|bypass the)\b/.test(t)) return false;
  if (/\bpressure[\s-]?washer\b/.test(t)) return false;
  if (/\b(push|flip) (it|the handle|that).{0,40}(off|on)\b/.test(t) && /\bbreaker\b/.test(t)) return false;
  return true;
}

function redact(text) {
  return String(text || '').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(keepSentence).join(' ');
}

function flowFor(id) {
  if (id.startsWith('ac.')) return 'cooling_only_ac';
  if (id.startsWith('hp.')) return 'heat_pump';
  if (id.startsWith('fn.')) return 'furnace';
  if (id.startsWith('ms.')) return 'ductless_mini_split';
  if (id.startsWith('bl.')) return 'boiler';
  if (id.startsWith('wh.')) return 'water_heater';
  if (id.startsWith('wshp.')) return 'water_source_geo';
  if (id.startsWith('ts.') || id.startsWith('ta.')) return 'thermostat_settings';
  if (id.startsWith('sd.')) return 'side_discharge';
  return null;
}

function includeId(id, node) {
  if (!id || !node) return false;
  if (node.diyTier === 'advanced') return false;
  if (id.indexOf('.adv.') !== -1 || id.indexOf('ac.adv.') === 0) return false;
  return true;
}

function textFromHtml(html) {
  const main = html.match(/<main[\s\S]*?<\/main>/i);
  const body = main ? main[0] : html;
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitText(text, size) {
  const parts = [];
  let rest = text;
  while (rest.length > size && parts.length < 3) {
    let at = rest.lastIndexOf('. ', size);
    if (at < size * 0.5) at = size;
    parts.push(rest.slice(0, at + 1).trim());
    rest = rest.slice(at + 1).trim();
  }
  if (rest && parts.length < 4) parts.push(rest);
  return parts;
}

const SAFETY = [
  {
    id: 'safety:gas-co',
    title: 'Gas smell and carbon monoxide',
    text: 'If you smell gas or rotten eggs in the air, not just from the hot water, leave the house now and call the gas utility or 911 from outside. Do not touch light switches or phones inside. If a carbon monoxide alarm sounds, or anyone has a headache, dizziness, nausea, or drowsiness, get everyone outside and call 911 from outside. Do not search for the leak. A rotten-egg smell only when the hot water runs is a water problem: /answers/hot-water-rotten-egg-smell/ . Gas, pilot, and flame limits: /answers/gas-smell-pilot-flame/ .'
  },
  {
    id: 'safety:smoke-spark',
    title: 'Smoke, fire, and sparking',
    text: 'If you can see smoke, a smoke alarm is going off, or there is fire or sparking, get everyone outside and call 911 from outside. Do not stay and troubleshoot. A light dusty smell the first time heat runs this season can fade within about an hour. A plastic, rubber, or electrical smell, or a smell that lasts, means turn the heat Off at the thermostat and call a licensed HVAC professional. See /answers/furnace-burning-smell/ .'
  },
  {
    id: 'safety:closed',
    title: 'What stays closed',
    text: 'No refrigerant handling, no gas-valve or burner work, no pilot relighting, no opening an electrical panel or disconnect box, no live electrical work, and no bypassing or jumpering a safety control. Covers stay on. Advanced repairs, the equipment catalog, and contractor referrals are off. This is not a review by a licensed HVAC professional or an attorney.'
  },
  {
    id: 'safety:breaker',
    title: 'Breaker rule',
    text: 'You may switch a breaker off. One reset of a tripped outdoor air-conditioner breaker exists only inside the guided check, with the panel cover left on, and only once. If it trips again or will not stay on, leave it off and call a licensed HVAC professional or electrician. Heat pumps, furnaces, boilers, water heaters, and mini-splits do not get a breaker reset here. Never open the breaker panel cover or the disconnect box. Never use a pressure washer on an outdoor unit. It can flatten the fins and damage the coil.'
  },
  {
    id: 'safety:scope',
    title: 'What this guide is',
    text: 'Free informational guidance. Not a licensed HVAC technician, not a diagnosis, and not emergency help. Manufacturer instructions and a professional take priority. Start the guided check at /#/ . Answer pages are at /answers/ .'
  }
];

function build() {
  global.SW_CONFIG = {
    advancedRepairsEnabled: false,
    aiThermostatEnabled: false,
    mirrorsEnabled: false,
    stageLatchStepsEnabled: false,
    breakerResetOnceEnabled: true,
    catalogEnabled: false,
    referralEnabled: false,
    aiChatEnabled: false,
    contentVersion: 'ask-index'
  };
  const flow = require('../assets/flow.js');
  const chunks = SAFETY.map(item => ({
    id: item.id,
    kind: 'safety',
    title: item.title,
    text: item.text,
    href: '/#/safety',
    flow: null,
    pin: true
  }));

  flow.systemMenu().forEach(group => {
    group.choices.forEach(choice => {
      chunks.push({
        id: 'flow:' + choice.id,
        kind: 'flow',
        title: choice.label,
        text: clip(choice.label + '. ' + choice.hint + ' Start the guided check at /#/ and choose this system. Group: ' + group.title + '.', 500),
        href: '/#/',
        flow: choice.id,
        pin: false
      });
    });
  });
  chunks.push({
    id: 'flow:side_discharge',
    kind: 'flow',
    title: 'Side-discharge heat pump',
    text: 'Outdoor unit whose fan is on the side and blows air out sideways, not up. Start the heat-pump check at /#/ . Error codes: /answers/side-discharge-outdoor-unit-error-code/ . Maintenance: /answers/side-discharge-heat-pump-maintenance-checklist/ .',
    href: '/answers/side-discharge-outdoor-unit-error-code/',
    flow: 'side_discharge',
    pin: false
  });
  chunks.push({
    id: 'flow:tankless',
    kind: 'flow',
    title: 'Tankless water heater',
    text: 'Tankless or on-demand water heater. Start the guided check and choose Water heater. Error codes: /answers/tankless-water-heater-error-code/ . No hot water: /answers/no-hot-water/ . Do not relight a pilot or turn a gas valve.',
    href: '/answers/tankless-water-heater-error-code/',
    flow: 'water_heater',
    pin: false
  });

  Object.keys(flow.nodes).sort().forEach(id => {
    const node = flow.nodes[id];
    if (!includeId(id, node)) return;
    const labels = (node.options || []).slice(0, 8).map(option => option.label).filter(Boolean).join('; ');
    const text = redact(clip((node.title || '') + '. ' + (node.body || '') + (labels ? ' Choices: ' + labels : ''), 420));
    if (!text) return;
    chunks.push({
      id: 'node:' + id,
      kind: 'node',
      title: clip(node.title || id, 120),
      text,
      href: '/#/',
      flow: flowFor(id),
      pin: false
    });
  });

  Object.keys(flow.results).sort().forEach(id => {
    const result = flow.results[id];
    if (!result || result.diyTier === 'advanced') return;
    const actions = Array.isArray(result.actions) ? result.actions.slice(0, 3).join(' ') : '';
    const text = redact(clip((result.title || '') + '. ' + (result.explanation || '') + ' ' + actions + ' ' + (result.avoid || ''), 480));
    if (!text) return;
    chunks.push({
      id: 'result:' + id,
      kind: 'result',
      title: clip(result.title || id, 120),
      text,
      href: '/#/',
      flow: null,
      pin: false
    });
  });

  const answersDir = path.join(root, 'answers');
  function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(ent => {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name === 'index.html') addAnswer(full);
    });
  }
  function addAnswer(file) {
    const html = fs.readFileSync(file, 'utf8');
    const rel = path.relative(answersDir, file).split(path.sep).join('/');
    const href = rel === 'index.html' ? '/answers/' : '/answers/' + rel.replace(/\/index\.html$/, '/');
    const slug = href.replace(/^\/answers\/|\/$/g, '') || 'index';
    const h1 = ((html.match(/<h1>([^<]+)<\/h1>/) || [])[1] || slug);
    const desc = ((html.match(/name="description" content="([^"]*)"/) || [])[1] || '');
    const plain = textFromHtml(html);
    splitText(plain, 700).forEach((part, index) => {
      chunks.push({
        id: 'answer:' + slug + ':' + index,
        kind: 'answer',
        title: clip(h1, 140),
        text: redact(clip(h1 + '. ' + desc + ' ' + part, 820)),
        href,
        flow: null,
        pin: false
      });
    });
  }
  walk(answersDir);

  chunks.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const index = { version: 1, builtFrom: 'trees+answers+safety', chunks };
  const out = path.join(root, 'netlify/functions/_ask-index.json');
  fs.writeFileSync(out, JSON.stringify(index));
  return { path: out, count: chunks.length, bytes: fs.statSync(out).size };
}

if (require.main === module) {
  const built = build();
  console.log('Ask index: ' + built.count + ' chunks, ' + built.bytes + ' bytes');
}

module.exports = { build };
