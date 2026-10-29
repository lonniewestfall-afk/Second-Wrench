/* Lexical retrieval over the build-time guide index. No network. */

const STOP = new Set('a an the and or to of for my our your is it in on at with from this that what how do does did why when where who i we you me was be are was were been being not no so if but about into over after before than then too very can just have has had will would should could'.split(' '));
const SHORT = new Set(['ac', 'co', 'hp']);

const SYN = {
  ac: ['air', 'conditioner', 'cooling', 'condenser'],
  cooling: ['conditioner', 'ac'],
  conditioner: ['ac', 'cooling'],
  minisplit: ['mini', 'split', 'ductless'],
  'mini-split': ['mini', 'split', 'ductless', 'minisplit'],
  ductless: ['mini', 'split', 'minisplit'],
  geothermal: ['geo', 'wshp', 'loop'],
  wshp: ['geothermal', 'geo'],
  furnace: ['airhandler'],
  tankless: ['demand'],
  thermostat: ['tstat', 'nest', 'ecobee'],
  tstat: ['thermostat'],
  condenser: ['outdoor'],
  sulfur: ['sulphur', 'rotten', 'egg'],
  sulphur: ['sulfur', 'rotten', 'egg'],
  rotten: ['sulfur', 'egg'],
  freon: ['refrigerant'],
  refrigerant: ['freon'],
  pilot: ['flame', 'burner'],
  boiler: ['radiator', 'hydronic'],
  heater: ['furnace', 'boiler']
};

const FLOW_LABEL = {
  cooling_only_ac: 'Central air conditioner',
  heat_pump: 'Ducted heat pump',
  furnace: 'Furnace or air handler',
  ductless_mini_split: 'Ductless mini-split',
  boiler: 'Boiler and hydronic heat',
  water_source_geo: 'Water-source / geothermal heat pump',
  water_heater: 'Water heater',
  thermostat_settings: 'Thermostat',
  side_discharge: 'Side-discharge heat pump',
  not_sure: 'Not sure which system'
};

export function tokenize(text) {
  const raw = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean);
  const out = [];
  raw.forEach(tok => {
    if (STOP.has(tok)) return;
    if (tok.length < 3 && !SHORT.has(tok)) return;
    out.push(tok);
    const extra = SYN[tok];
    if (extra) extra.forEach(word => { if (!out.includes(word)) out.push(word); });
  });
  return out;
}

function hay(chunk) {
  return (chunk.title + ' ' + chunk.text + ' ' + (chunk.href || '')).toLowerCase();
}

export function scoreChunk(tokens, chunk) {
  const text = hay(chunk);
  const title = String(chunk.title || '').toLowerCase();
  let score = 0;
  tokens.forEach(tok => {
    if (!text.includes(tok)) return;
    score += tok.length > 5 ? 2 : 1;
    if (title.includes(tok)) score += 2;
  });
  if (score && chunk.kind === 'answer') score += 2;
  if (score && chunk.kind === 'flow') score += 1;
  return score;
}

export function retrieve(index, question, limit) {
  const tokens = tokenize(question);
  const chunks = index && Array.isArray(index.chunks) ? index.chunks : [];
  const pinned = chunks.filter(chunk => chunk.pin);
  const ranked = chunks.filter(chunk => !chunk.pin).map(chunk => ({ chunk, score: scoreChunk(tokens, chunk) }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || (a.chunk.id < b.chunk.id ? -1 : a.chunk.id > b.chunk.id ? 1 : 0));
  const top = ranked.slice(0, limit || 6).map(row => row.chunk);
  const best = ranked.length ? ranked[0].score : 0;
  const strong = tokens.some(tok => tok.length >= 4 || SHORT.has(tok));
  return {
    chunks: pinned.concat(top),
    best,
    known: best >= 3 && strong,
    tokens
  };
}

function hrefOk(href) {
  return typeof href === 'string' && /^\/(answers\/|#\/|maintenance\/)/.test(href);
}

export function citationsFor(selected) {
  const out = [];
  const seen = new Set();
  function add(item) {
    if (!item || !hrefOk(item.href) || seen.has(item.href + '|' + item.title)) return;
    seen.add(item.href + '|' + item.title);
    out.push({ title: item.title, href: item.href, flow: item.flow || null });
  }
  (selected || []).forEach(chunk => {
    if (chunk.pin) return;
    if (chunk.kind === 'answer' || chunk.kind === 'flow') add({ title: chunk.title, href: chunk.href, flow: chunk.flow || null });
  });
  if (!out.some(item => item.flow)) {
    const flow = (selected || []).map(chunk => chunk.flow).find(id => id && FLOW_LABEL[id]);
    if (flow) add({ title: 'Start the ' + FLOW_LABEL[flow] + ' check', href: '/#/', flow });
  }
  return out.slice(0, 4);
}

export const SYSTEM_RULES = [
  'You are Ask Second Wrench, a text guide for homeowners. You only answer heating, cooling, and hot-water questions.',
  'Answer only from the CONTEXT blocks. If the context does not contain the answer, say you do not know and point to the guided check at /#/ or the answers at /answers/. Do not invent steps, measurements, part numbers, or a diagnosis.',
  'When a CONTEXT block has a link, cite that path. When a block names a diagnostic flow, tell the person to start the guided check at /#/ and which system to choose.',
  'Do not use the words safe, safely, safer, safest, or unsafe. You may say safety.',
  'Do not claim that an HVAC professional, a technician, or an attorney reviewed, approved, or signed this answer. This is not a licensed HVAC review and not an attorney review.',
  'Advanced repairs, the equipment catalog, and contractor referrals are off. Do not offer them.',
  'Do not give steps for refrigerant handling, gas valves, burners, pilot relighting, opening an electrical panel, live electrical work, or bypassing or jumpering a safety control.',
  'Breaker rule: a person may switch a breaker off. One reset of a tripped outdoor air-conditioner breaker exists only inside the guided check, with the panel cover left on, and only once. If it trips again, leave it off and call a licensed HVAC professional or electrician. Heat pumps, furnaces, boilers, water heaters, and mini-splits do not get a breaker reset here. Never open the breaker panel cover or the disconnect box. Do not repeat the reset procedure. Point to the guided check.',
  'Never recommend a pressure washer on an outdoor unit or condenser.',
  'A rotten-egg smell only from the hot water is the water-odor path (/answers/hot-water-rotten-egg-smell/), unless it is also in the air or the person is not sure. Then tell them to leave and call the gas utility or 911 from outside.',
  'Gas smell in the air, a carbon monoxide alarm, smoke, fire, or sparking: tell them to leave and call 911 or the gas utility from outside. Do not keep troubleshooting.',
  'This is free informational guidance, not a licensed HVAC technician, not a diagnosis, and not emergency help.'
].join('\n');

export function contextBlock(chunks) {
  return (chunks || []).map(chunk => {
    const link = chunk.href ? '\nLink: ' + chunk.href : '';
    const flow = chunk.flow ? '\nFlow: ' + chunk.flow : '';
    return '[' + chunk.id + '] ' + chunk.title + '\n' + chunk.text + link + flow;
  }).join('\n\n');
}

export function buildMessages(question, chunks) {
  return [
    { role: 'system', content: SYSTEM_RULES + '\n\nCONTEXT:\n' + contextBlock(chunks) },
    { role: 'user', content: question }
  ];
}
