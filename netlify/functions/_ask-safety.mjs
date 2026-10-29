/* Deterministic safety layer for Ask Second Wrench.
 * Runs on the homeowner's text before any model call, and again on model text.
 * Prompt wording is not this layer. Output must not use "safe" as an adjective. */

export const SAFE_WORD = /\b(safest|safer|safely|unsafe|safe)\b/gi;

const GAS_PAGE = { title: 'Gas smell, pilot, or flame', href: '/answers/gas-smell-pilot-flame/' };
const ODOR_PAGE = { title: 'Rotten-egg smell', href: '/answers/hot-water-rotten-egg-smell/' };
const BURN_PAGE = { title: 'Furnace burning smell', href: '/answers/furnace-burning-smell/' };
const CHECK = { title: 'Start the guided check', href: '/#/' };
const AC_MAINT = { title: 'AC maintenance checklist', href: '/answers/ac-maintenance-checklist/' };
const SAFETY = { title: 'Safety', href: '/#/safety' };

export const MESSAGES = {
  gas_air: 'Stop. If you smell gas or rotten eggs in the air, not just from the hot water, leave the house now and call the gas utility or 911 from outside. Do not touch light switches or phones, or use lighters, matches, or anything that could spark or flame while you are inside. This chat stops here.',
  co_alarm: 'Stop. If a carbon monoxide alarm sounds, or anyone has a headache, dizziness, nausea, or drowsiness that you think could be carbon monoxide, get everyone outside and call 911 from outside. If you also smell gas, call the gas utility from outside too. Do not go back in to turn equipment off. This chat stops here.',
  smoke_fire: 'Stop. If you can see smoke, a smoke alarm is going off, or there is fire, get everyone outside now and call 911 from outside. Do not go back in to turn equipment off. This chat stops here.',
  sparking: 'Stop. Sparking is not a troubleshooting step. Get everyone away from the equipment. If you see sparks, smoke, or fire, get everyone outside and call 911 from outside. Do not open a panel and do not stay to watch it. This chat stops here.',
  hot_water_odor: 'A rotten-egg or sulfur smell only when the hot water runs is a water-odor question, not a gas smell in the air. If you also smell it in the air, or you are not sure, leave the house now and call the gas utility or 911 from outside. Otherwise start the guided check and choose Water heater, and read the rotten-egg answer: /answers/hot-water-rotten-egg-smell/',
  refrigerant: 'Refrigerant handling is not a homeowner step in this guide. Do not add, remove, recover, or gauge refrigerant, and do not open the sealed system or a service port. In the United States that work takes an EPA-certified technician. Call a licensed HVAC professional. The guided check stays on owner steps: /#/',
  gas_valve: 'Gas valves, burners, and pilot relighting are not homeowner steps here. Do not relight a pilot, do not turn a gas valve to feed it, and do not hold a button down to keep a flame lit. Leave the gas control, the burner door, and every gas valve as they are, including a propane tank valve. Call a licensed HVAC professional. If you smell gas in the air, leave and call the gas utility or 911 from outside. Read /answers/gas-smell-pilot-flame/ and start the guided check.',
  panel: 'Do not open an electrical panel, the breaker panel cover, a disconnect box, or a deadfront, and do not work on a live circuit. Leave the covers on. Call a licensed HVAC professional or electrician.',
  live_circuit: 'Do not work on a live circuit, and do not test voltage or touch terminals, wiring, or internal parts while the equipment has power. Leave the covers on. Call a licensed HVAC professional or electrician.',
  bypass: 'Do not bypass, jumper, tape, or defeat a safety control, limit, rollout, spill switch, pressure switch, float switch, or interlock. Leave it in place and call a licensed HVAC professional.',
  pressure_washer: 'Never use a pressure washer on your outdoor unit. It can flatten the fins and damage the coil. Coil cleaning depends on the brand. Use the maintenance checklist and your owner’s manual: /answers/ac-maintenance-checklist/',
  breaker_repeat: 'A breaker that trips again is a stop. Leave it off. Do not reset it again. Call a licensed HVAC professional or electrician. Never open the panel cover or the disconnect box.',
  breaker_non_ac: 'This guide does not reset breakers on heat pumps, furnaces, boilers, water heaters, mini-splits, or air handlers. You may switch a breaker off. Leave a tripped breaker off and call a licensed HVAC professional or electrician. Never open the panel cover or the disconnect box. The one-time outdoor air-conditioner reset, when it applies, is only inside the guided check.',
  breaker_guide: 'Follow the breaker rule. You may switch a breaker off at any time. One reset of a tripped outdoor air-conditioner breaker exists only inside the guided check, with the panel cover left on, and only when that check offers it. Do it once. If it trips again or will not stay on, leave it off and call a licensed HVAC professional or electrician. Heat pumps, furnaces, boilers, water heaters, and mini-splits do not get a breaker reset here. Never open the breaker panel cover or the disconnect box. Start the guided check: /#/',
  review: 'This is not a review by a licensed HVAC professional or an attorney.',
  unknown: 'I do not have that in the Second Wrench guides, so I will not guess. Start the guided check (/#/) or browse the answers (/answers/). If you smell gas in the air, a carbon monoxide alarm is sounding, or you see smoke, fire, or sparking, leave and call 911 or the gas utility from outside.',
  unconfigured: 'Ask Second Wrench is not available right now because the assistant is not configured. The guided check still works: /#/',
  disabled: 'Ask Second Wrench is turned off.',
  limited: 'Ask Second Wrench has hit its limit for now. Please use the guided check: /#/'
};

const CITATIONS = {
  gas_air: [GAS_PAGE, Object.assign({ flow: 'furnace' }, CHECK)],
  co_alarm: [GAS_PAGE, Object.assign({ flow: 'furnace' }, CHECK)],
  smoke_fire: [BURN_PAGE, SAFETY],
  sparking: [SAFETY, CHECK],
  hot_water_odor: [ODOR_PAGE, { title: 'Start the water-heater check', href: '/#/', flow: 'water_heater' }],
  refrigerant: [CHECK],
  gas_valve: [GAS_PAGE, Object.assign({ flow: 'furnace' }, CHECK)],
  panel: [CHECK],
  live_circuit: [CHECK],
  bypass: [GAS_PAGE, CHECK],
  pressure_washer: [AC_MAINT],
  breaker_repeat: [CHECK],
  breaker_non_ac: [CHECK],
  breaker_guide: [CHECK]
};

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function mentionsRotten(t) {
  return /rotten[\s-]?eggs?|sulfur|sulphur|smells like eggs|egg smell/.test(t);
}

function explicitGas(t) {
  return /\b(smell|smelling|smelled|odou?r)\b[^.]{0,48}\bgas\b/.test(t)
    || /\bgas\b[^.]{0,40}\b(smell|smelling|smelled|odou?r|leak)\b/.test(t)
    || /\b(gas leak|smell of gas|smells like gas)\b/.test(t);
}

export function hotWaterOnly(text) {
  const t = norm(text);
  if (!mentionsRotten(t)) return false;
  if (/\b(not sure|unsure|don't know|do not know)\b/.test(t)) return false;
  if (explicitGas(t) || /\bin the air\b/.test(t)) return false;
  if (/\b(whole house|whole home|everywhere)\b/.test(t)) return false;
  if (/\bin the (house|home|basement|garage|room)\b/.test(t) && !/\bonly\b/.test(t)) return false;
  return /\b(hot water|from the (faucet|tap|shower)|when (the )?hot water runs|only (the )?hot|only when|only from|only in the hot)\b/.test(t);
}

function coAlarm(t) {
  const named = /\bcarbon monoxide\b/.test(t) || /\bc\.?\s*o\.?\b/.test(t);
  if (named && /\b(alarm|beeping|beeps|beep|going off|sounding|went off|chirp|chirping)\b/.test(t)) return true;
  if (/\bcarbon monoxide\b/.test(t) && /\b(headache|dizzy|dizziness|nausea|drowsy|drowsiness)\b/.test(t)) return true;
  return false;
}

function smokeOrFire(t) {
  if (/\bsmoke alarm\b/.test(t)) return true;
  if (/\b(smoke|smoking|smoky)\b/.test(t) && !/\b(no smoke|not smoking|without smoke)\b/.test(t)) return true;
  if (/\b(flames?|on fire|caught fire|catching fire|house fire)\b/.test(t)) return true;
  if (/\b(i see|i saw|there's|there is|visible) (a )?fire\b/.test(t)) return true;
  return false;
}

function sparking(t) {
  return /\b(sparking|sparks|sparked|arcing)\b/.test(t);
}

function refrigerantHandling(t) {
  const ref = /\b(refrigerant|freon|r-?410a|r-?22|r-?32|r-?454b|r-?134a)\b/.test(t);
  const ports = /\b(service port|schrader|manifold gauge)\b/.test(t);
  if (!ref && !ports) return false;
  if (/\b(add|charge|recharge|recover|vent|release|top off|top-off|put in|hook up|weigh in|pull a vacuum|vacuum down|handle)\b/.test(t)) return true;
  if (ports && /\b(gauge|manifold|connect|open|hook)\b/.test(t)) return true;
  if (/\b(reset|disable|silence|bypass)\b[^.]{0,40}\b(refrigerant|freon)\b[^.]{0,20}\b(alarm|sensor)\b/.test(t)) return true;
  return false;
}

function gasValveOrPilot(t) {
  if (/\b(relight|re-light|light the pilot|lighting the pilot|pilot relight)\b/.test(t)) return true;
  if (/\b(burner door|open the burner|remove the burner|adjust the air)\b/.test(t)) return true;
  if (/\b(gas valve|gas control|gas cock|pilot button|igniter button|tank valve)\b/.test(t) && /\b(turn|open|close|adjust|press|push|move|rotate|switch|hold)\b/.test(t)) return true;
  if (/\b(shut off|turn off|close) the gas\b/.test(t)) return true;
  if (/\bhow (do|can|to)\b[^.]{0,48}\b(pilot|gas valve|burner)\b/.test(t)) return true;
  return false;
}

function panelOrLive(t) {
  if (/\b(open|remove|unscrew|take off)\b[^.]{0,48}\b(panel cover|breaker panel|electrical panel|dead ?front|disconnect box|disconnect door|service panel|fuse panel)\b/.test(t)) return 'panel';
  if (/\btake\b[^.]{0,24}\b(panel cover|dead ?front|disconnect door)\b[^.]{0,16}\boff\b/.test(t)) return 'panel';
  if (/\b(look|see|reach) inside\b[^.]{0,30}\b(breaker panel|electrical panel|panel|disconnect box)\b/.test(t)) return 'panel';
  if (/\b(live circuit|live wire|live electrical|energized circuit|work (it )?hot|on a live)\b/.test(t)) return 'live_circuit';
  if (/\b(multimeter|test (the )?voltage|measure voltage)\b[^.]{0,40}\b(panel|breaker|circuit|wire|terminal)\b/.test(t)) return 'live_circuit';
  if (/\btouch (the )?(terminals|live wires|wiring)\b/.test(t)) return 'live_circuit';
  return null;
}

function bypassing(t) {
  if (/\b(jumper|jump the|jump out|jumper wire)\b/.test(t)) return true;
  if (/\bbypass\b/.test(t) && /\b(safety|limit|switch|control|rollout|float|pressure|interlock|spill)\b/.test(t)) return true;
  if (/\b(tape|hold|wedge|defeat)\b[^.]{0,36}\b(safety switch|limit switch|rollout|float switch|pressure switch|interlock|spill switch)\b/.test(t)) return true;
  return false;
}

function pressureWasher(t) {
  return /\b(pressure[\s-]?wash(?:er|ing)?|power[\s-]?washer)\b/.test(t);
}

function breakerCase(t) {
  if (!/\bbreakers?\b/.test(t)) return null;
  const electrical = panelOrLive(t);
  if (electrical) return null;
  const again = /\b(again|second time|another time|keeps tripping|tripped again|won't stay|will not stay|trips every)\b/.test(t);
  const reset = /\b(reset|flip|turn (it |the breaker )?(back )?on|switch (it )?back on)\b/.test(t);
  const nonAc = /\b(furnace|heat pumps?|heatpump|water heaters?|boiler|mini-?splits?|tankless|air handlers?|geothermal|thermostat)\b/.test(t);
  if (again) return 'breaker_repeat';
  if (nonAc && reset) return 'breaker_non_ac';
  if (reset) return 'breaker_guide';
  return null;
}

function hit(code) {
  return {
    action: code === 'hot_water_odor' ? 'water_odor' : (code.indexOf('breaker') === 0 ? 'breaker' : (code === 'gas_air' || code === 'co_alarm' || code === 'smoke_fire' || code === 'sparking' ? 'emergency' : 'refuse')),
    code,
    message: MESSAGES[code],
    citations: CITATIONS[code] || []
  };
}

export function screenUser(text) {
  const t = norm(String(text || '').slice(0, 4000));
  if (!t) return { action: 'allow', code: '', message: '', citations: [] };
  const gas = explicitGas(t) || (mentionsRotten(t) && !hotWaterOnly(t));
  const co = coAlarm(t);
  const smoke = smokeOrFire(t);
  const sparks = sparking(t);
  if (gas || co || smoke || sparks) {
    if (gas) return hit('gas_air');
    if (co) return hit('co_alarm');
    if (smoke) return hit('smoke_fire');
    return hit('sparking');
  }
  if (hotWaterOnly(t)) return hit('hot_water_odor');
  if (pressureWasher(t)) return hit('pressure_washer');
  if (refrigerantHandling(t)) return hit('refrigerant');
  if (gasValveOrPilot(t)) return hit('gas_valve');
  const electrical = panelOrLive(t);
  if (electrical) return hit(electrical);
  if (bypassing(t)) return hit('bypass');
  const breaker = breakerCase(t);
  if (breaker) return hit(breaker);
  return { action: 'allow', code: '', message: '', citations: [] };
}

export function stripSafeWords(text) {
  return String(text || '').replace(SAFE_WORD, word => {
    const lower = word.toLowerCase();
    if (lower === 'unsafe') return 'not allowed';
    if (lower === 'safely') return '';
    if (lower === 'safer') return 'better';
    if (lower === 'safest') return 'preferred';
    return 'acceptable';
  }).replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.;!?])/g, '$1').trim();
}

function sentences(text) {
  return String(text || '').split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
}

function prohibition(sentence) {
  return /\b(do not|don't|dont|never|avoid|leave the|leave it|stop using|not a homeowner|isn't a homeowner|is not a homeowner|aren't a homeowner)\b/i.test(sentence);
}

function sentenceViolation(sentence) {
  if (prohibition(sentence)) return '';
  const t = norm(sentence);
  if (pressureWasher(t)) return 'pressure_washer';
  if (refrigerantHandling(t) || /\b(add|charge|recover|vent) (the )?(refrigerant|freon|r-?410a)\b/.test(t)) return 'refrigerant';
  if (gasValveOrPilot(t)) return 'gas_valve';
  const electrical = panelOrLive(t);
  if (electrical) return electrical;
  if (bypassing(t)) return 'bypass';
  if (/\b(push|flip|reset)\b[^.]{0,50}\bbreaker\b|\bbreaker\b[^.]{0,40}\b(off then|to off, then|back to on)\b/.test(t)) {
    if (/\b(again|second|trips again|keep resetting)\b/.test(t)) return 'breaker_repeat';
    if (/\b(furnace|heat pump|water heater|boiler|mini-?split|tankless)\b/.test(t)) return 'breaker_non_ac';
    return 'breaker_guide';
  }
  if (/\b(search for the leak|find the leak|stay inside and)\b/.test(t)) return 'gas_air';
  return '';
}

function reviewClaim(sentence) {
  if (!/\b(attorney|lawyer|counsel|hvac professional|hvac pro|licensed hvac|hvac technician)\b/i.test(sentence)) return false;
  if (!/\b(review|reviewed|reviews|approved|approval|signed off|endorsed)\b/i.test(sentence)) return false;
  if (/\b(not|no|never|isn't|is not|aren't|are not|neither|nor)\b/i.test(sentence)) return false;
  return true;
}

function offersDisabled(sentence) {
  if (!/\b(equipment catalog|catalog sharing|contractor referral|refer you to a contractor|advanced repair|capacitor replacement|replace the capacitor)\b/i.test(sentence)) return false;
  if (/\b(not|no|never|off|don't|do not|without|isn't|is not|aren't|are not|not guided|stay off|stays off)\b/i.test(sentence)) return false;
  return true;
}

export function screenModel(text) {
  const parts = sentences(text);
  for (const sentence of parts) {
    const code = sentenceViolation(sentence);
    if (code) return { ok: false, code, message: MESSAGES[code], citations: CITATIONS[code] || [] };
  }
  const kept = [];
  let replacedReview = false;
  for (const sentence of parts) {
    if (offersDisabled(sentence)) continue;
    if (reviewClaim(sentence)) {
      if (!replacedReview) kept.push(MESSAGES.review);
      replacedReview = true;
      continue;
    }
    kept.push(sentence);
  }
  const message = stripSafeWords(kept.join(' '));
  if (!message) return { ok: true, code: 'unknown', message: MESSAGES.unknown, citations: [] };
  return { ok: true, code: replacedReview ? 'review' : '', message, citations: [] };
}

export function outputHasSafeAdjective(text) {
  SAFE_WORD.lastIndex = 0;
  return SAFE_WORD.test(String(text || ''));
}
