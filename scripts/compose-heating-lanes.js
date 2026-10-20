/* Authoring and reconciliation for boiler / hydro-air / furnace additions.
 * Input drafts are preserved separately. Corrections here take precedence.
 * Operator content review only; no attorney or licensed-reviewer claim. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const boiler = read('content/lanes/boiler-draft.json');
const B = boiler.nodes, R = boiler.results;
const CO = 'Never heat with an oven, stove, grill, or generator indoors (carbon monoxide). If you use an electric space heater, plug it straight into a wall outlet, follow its maker’s instructions, and keep it clear of anything that can burn.';
const oldCO = boiler.CO;
// These are editorial replacements, not a generic safety-word deletion: each
// replacement preserves the observation, uncertainty, or evacuation instruction.
const replacements = [
  [oldCO, CO], ['until they say it’s safe', 'until emergency responders say you may return'],
  ['until responders say it’s safe', 'until responders say you may return'],
  ['a warm, safe place', 'a warm place'], ['the safe move is to stop', 'stop the check'],
  ['with no safe heat', 'without enough heat'], ['with no safe heat.', 'without enough heat.'],
  ['I can’t get to the boiler safely', 'I can’t reach the boiler from dry, level ground'],
  ['Boiler could not be reached safely.', 'Boiler could not be reached from dry, level ground.'],
  ['couldn’t be reached safely', 'couldn’t be reached without opening anything'],
  ["couldn't be reached safely", "couldn't be reached without opening anything"],
  ['from safety', 'from outside'], ['licensed heating pro', 'licensed heating professional']
];
function copy(value) {
  if (typeof value === 'string') { for (const [a,b] of replacements) value = value.split(a).join(b); return value.replace(/'/g, '’'); }
  if (Array.isArray(value)) return value.map(copy);
  if (value && typeof value === 'object') { for (const k of Object.keys(value)) value[k] = copy(value[k]); }
  return value;
}
copy(boiler);
const option = (node,id) => B[node].options.find(o=>o.id===id);
const op = (id,label,next,hint='',fact='',set={}) => ({id,label,next,hint,fact,set,gate:null});
const hazard = () => op('hazard_now','New smell, alarm, smoke, sparks, or leaking hot water or steam','bl.gate.safety','Return to the hazard check.','New hazard reported.',{retriage:'hazard_now'});
const question = (title,body,options,extra={}) => Object.assign({section:'Boiler and hot-water heat',title,body,options:options.concat(hazard()),diyTier:'basic',safetyGate:false,owner:'bl',modes:['heat','dhw']},extra);
// Every entry into the boiler lane uses bl.gate.safety. The retired carryover
// id stays only as a runtime alias; no authored edge targets it.
delete B['bl.gate.carryover'];
const gateNone = option('bl.gate.safety','none_of_these');
gateNone.next = {
  fromWhIndirect: 'bl.dhw.indirect_call',
  fromWhCode: 'bl.cold.screen',
  fromWhHeat: 'bl.intake.fuel',
  fromFnCoil: 'bl.coil.type',
  // wh_coil_ok is recognized. coil_loop_wh_source stays unpublished.
  fromWhCoilOk: 'bl.coil.type',
  default: 'bl.intake.type'
};
for (const id of ['bl.gate.safety']) Object.assign(option(id,'pressure_at_relief'), {
  label:'The gauge is at a relief setting or warning mark identified for my boiler',
  fact:'Homeowner reports the gauge at the installation’s identified relief setting or warning mark; the numerical setting is not stated.'
});
// A falling-temperature report is an urgent condition, not just a flag for a
// later reset guard. Unknown risk must not become permission to keep waiting.
for (const id of ['cold_getting_colder','cold_not_sure']) option('bl.cold.screen',id).next='@bl_cold_home_urgent';
R.bl_cold_home_urgent={title:'Arrange urgent heating help now',explanation:'The home is losing heat, pipes may be at risk, or the risk to people is uncertain. Do not wait through more equipment checks.',actions:['Get anyone who needs warmth to a warm place first. Bring pets somewhere warm too.','Call a licensed heating professional for urgent service. For suspected frozen plumbing, also call a plumber; do not thaw it yourself.','For confusion, severe drowsiness, or difficulty waking someone, call 911.',CO],avoid:'Do not use equipment checks or repeated restarts to delay getting warmth and help.',tier:'Stop / professional',outcome:'call_pro',diyTier:'pro_only',reason:'cold_home_deteriorating_or_uncertain',urgency:'Urgent heating service',owner:'bl'};
// Combi tap-water complaints stay with the boiler after the receiving hazard
// gate. Sending them through the generic landing created a WH ↔ BL loop.
B['bl.dhw.combi_call']=question('Tap water, room heat, or both?', 'Use only what you have already noticed in ordinary use. Do not run hot water as a test, touch pipes, or change boiler settings. A combi boiler serves two demands; working room heat does not prove hot-water operation.', [
  op('cold_risk','Someone is at risk from the cold','@bl_cold_exposure','','Cold exposure reported during the combi check.'),
  op('home_also_cold','Room heat is also missing or the home is getting colder','bl.cold.screen','','Combi room heat and hot-water concern reported.',{mode:'heat',landing:'landing_no_heat'}),
  op('tap_only','The home has enough heat; the tap hot water is the problem','bl.power.look','','Hot-water complaint; homeowner reports enough room heat.',{mode:'dhw'}),
  op('code','A code or message is already showing','bl.code.read','','Combi code reported; meaning unconfirmed.',{mode:'dhw',landing:'landing_code',sawCode:true}),
  op('too_hot','Tap water is unexpectedly too hot','@wh_too_hot','','Unexpectedly hot tap water reported.',{mode:'dhw'}),
  op('unsure','I’m not sure','bl.conclude.call_pro','','Combi operating pattern unconfirmed.',{mode:'dhw'})
]);
for (const o of B['bl.intake.fuel'].options) if(o.id!=='hazard_now') o.next={fromWhHeat:'bl.dhw.combi_call',default:o.next};
// The later look-only draft and the prototype disagree here. Do not expose the
// prototype’s “let it cool and follow the label” water-addition escape hatch.
R.bl_steam_glass_empty.explanation = 'An empty or unreadable steam-boiler sight glass may mean dangerously low water. Stop using the boiler and call for urgent service. Do not add water, even after it cools.';
R.bl_steam_glass_empty.actions = [
  'Keep everyone away from the boiler.',
  'Only if there is no gas smell, smoke, spray, or water near electrical parts, use the clearly identified external boiler emergency shutoff if you can reach it from dry ground without going near the boiler. Do not open any cover or operate a gas or water valve.',
  'If you cannot shut it down without approaching a hazard, leave the area and call the fire department or 911 from outside. Otherwise, call a licensed heating professional for urgent service now.', CO
];
R.bl_steam_glass_empty.avoid = 'Don’t add water, drain water, open valves, press resets, or restart the boiler.';
R.bl_steam_glass_empty.urgency = 'Stop using it · urgent service';
const thermalShutdown = 'For a gas smell, a CO alarm, smoke, or possible CO illness, get everyone outside immediately and call 911 or the gas utility from outside. Do not operate a switch on the way out. Only when none of those signs is present, use only a clearly identified external boiler emergency shutoff that you can reach from dry ground without going near hot water, steam, or the boiler. Do not open a cover or operate a gas or water valve. If you cannot do that, move away and call for emergency help. A room thermostat set to Off may not stop a boiler that also serves other zones or hot water.';
for (const id of ['bl_soot_scorch','bl_water_steam_release','bl_pressure_relief_stop','bl_bang_puffback','bl_vent_blocked']) {
  R[id].actions = R[id].actions.filter(a => !/thermostat.*Off/.test(a));
  R[id].actions.unshift(thermalShutdown);
}
R.bl_pressure_relief_stop.title = 'Stay back and call for urgent boiler service.';
R.bl_vent_blocked.title = 'Stop using the boiler and call a professional.';
const electricalOff = 'Switch power off only at a known breaker or disconnect you can reach from dry ground, without touching water or going near the affected equipment. Use the handle only; do not remove covers. Otherwise, move away and call 911 from outside if there is immediate danger.';
R.bl_water_electrical.actions[1] = electricalOff;
R.bl_water_electrical.tier = 'Stop / professional';
R.bl_vent_wont_close.actions = ['Keep people away from the leak. Do not put your hands under hot water.', 'Call a licensed heating professional now. Tell them which vent is leaking.', 'If water reaches electrical parts, stay out of the water. ' + electricalOff, CO];
R.bl_relief_weep_pro.explanation = 'A dripping relief valve needs a professional to check pressure, temperature, the valve, and the expansion tank. The drip alone does not identify the cause.';
R.bl_relief_weep_pro.actions = ['Stay clear of the discharge pipe and keep its outlet unobstructed.', 'Record a gauge reading only if you can already see it without approaching the leak.', 'Call a licensed heating professional today. For spraying hot water or steam, stay back and seek urgent help.', CO];
R.bl_tstat_set_heat_basic.explanation = 'This thermostat controls a heating zone. A boiler may also run for other zones or to maintain domestic hot water; this one thermostat does not control every boiler function.';
R.bl_tstat_set_heat_basic.actions = ['For this room or zone, select Heat and set the temperature a little above the displayed room temperature.', 'Radiators and floors respond slowly. If the home is getting cold or someone is at risk, arrange heat and service now instead of waiting.', 'If heat does not begin returning, call a licensed heating professional. Record what the thermostat and boiler display show.', CO];
B['bl.tstat.call'].options.unshift(op('cold_risk','The house is getting cold, and someone is at risk','@bl_cold_exposure','','Cold exposure reported before waiting for thermostat heat.'));
// Model-specific resetting requires an exact homeowner manual and matching
// visible controls. The prototype’s broad brand families are not model matches.
B['bl.reset.brand'].title = 'Match the exact boiler and owner’s instructions';
B['bl.reset.brand'].body = 'This release can help record the fault, but does not provide brand-wide reset instructions. Different models use different controls. Don’t clear the code or reset the boiler from a generic internet sequence.';
B['bl.reset.brand'].options = [op('rs_not_listed','Record the code and contact a professional','bl.conclude.call_pro','','Model-specific reset instructions not established.',{reason:'reset_not_on_model'}),hazard()];
option('bl.reset.check','reset_none').next = 'bl.reset.brand';
// Bleeding has an unresolved tool exception and lacks a verified homeowner
// procedure for the exact installation. Keep all diagnostic coverage; refer the
// physical water-side work. No misleading acknowledgement unlocks that work.
option('bl.zone.look','gurgle_or_cold_top').next = 'bl.conclude.call_pro';
option('bl.zone.look','gurgle_or_cold_top').reason = {steam:'steam_distribution_after_basics',default:'air_in_system'};
for (const id of ['bl.pn.notice','bl.pn.warranty','bl.bleed.step','bl.reset.do']) delete B[id];
for (const id of ['bl_bleed_done_basic','bl_reset_ok_basic','bl_vent_wont_close']) delete R[id];
// Shared pipe check (handoffs.md). Ids describe the pipe, not the airflow.
B['sw.handoff.hydronic_coil'] = question('Is the pipe into the air handler hot?', 'With the heat calling for at least 5 minutes, find the pipe that carries hot water into the air handler. Check it without grabbing: hold your hand near it, or touch it briefly with the back of your hand. These pipes can be hotter than 160 °F and can burn you. Don’t grab the pipe. Don’t touch bare copper fittings near valves, and don’t open anything.', [
  op('pipe_cold','It’s cold or barely warm',{waterHeaterSource:'>coil_to_wh',sourceKnown:'>fn_to_bl',fromBl:'sw.handoff.hydronic_coil.source',default:'>fn_to_bl'},'Water side.','Coil supply pipe is cold or barely warm.',{hydroPipe:'cold'}),
  op('pipe_hot_no_air','It’s hot, but little or no warm air comes out',{fromBl:'>bl_to_fn',default:'fn.hydro.air_side'},'Air side.','Coil supply pipe is hot, with little or no warm air.',{hydroPipe:'hot'}),
  op('pipe_hot_air_warm','It’s hot, and warm air comes out, but rooms fall behind',{fromBl:'>bl_to_fn',default:'fn.hydro.air_side'},'Air side.','Coil supply pipe is hot and warm air comes out, but rooms fall behind.',{hydroPipe:'hot'}),
  op('unsure','I’m not sure, or I can’t reach it without climbing or reaching past other equipment','sw.handoff.hydronic_both','We’ll treat the pipe as not hot.','Hydronic-coil pipe temperature unconfirmed.',{hydroPipe:'unsure'})
],{owner:'shared',safetyGate:true});
B['sw.handoff.hydronic_both'] = question('Let’s check the water side first', 'We’ll treat the pipe as not hot. You can check the heat source first, or go straight to the air handler.', [
  op('water_side','Check the boiler or water heater',{waterHeaterSource:'>coil_to_wh',sourceKnown:'>fn_to_bl',fromBl:'>fn_to_bl',default:'sw.handoff.hydronic_coil.source'}),
  op('air_side','Check the air handler',{fromBl:'>bl_to_fn',default:'fn.hydro.air_side'})
],{owner:'shared'});
delete B['sw.handoff.hydronic_coil.both'];
B['sw.handoff.hydronic_coil.source'].owner = 'shared';
option('sw.handoff.hydronic_coil.source','src_boiler').next = '>fn_to_bl';
option('sw.handoff.hydronic_coil.source','src_combi').next = '>fn_to_bl';
B['bl.heat.where'].options.splice(-1,0,op('water_ok_no_airflow','This boiler feeds an air handler, and little or no air comes out','>bl_to_fn','The air handler has its own hazard check.','Hydronic air handler has little or no airflow; water circulation unconfirmed.',{coil:true,hydroPipe:'unsure'}));
// No “usual pressure” verdict without identifying hot-water vs steam and the
// installation-specific range. A plausible gauge reading does not clear a fault.
R.bl_pressure_in_range_basic.title = 'Record the reading and compare with your manual.';
R.bl_pressure_in_range_basic.explanation = 'A gauge reading alone cannot confirm that the boiler is operating properly. Steam and hot-water boilers use different ranges, and the installation matters.';
R.bl_pressure_in_range_basic.actions = ['Write down the reading, its units, and whether the boiler was running.', 'Use the range in your exact owner’s manual. If you cannot confirm it, or pressure changes unexpectedly, call a licensed heating professional.', 'Keep away from any leaking relief valve or discharge pipe.', CO];
for (const [id,node] of Object.entries(B)) {
  node.owner = node.owner || 'bl'; node.caution = node.caution || '';
  node.options.forEach(o=> { if (o.id === 'hazard_now') o.next = 'bl.gate.safety'; });
}
boiler.CO = CO;
// A gauge, light, or warm pipe is an observation, not proof of circulation.
B['bl.heat.where'].body='Read only an already-visible temperature display or gauge from dry ground. Do not approach, hover a hand near, or touch a pipe to judge temperature. Do not wait here if the home is losing needed heat.';
Object.assign(option('bl.heat.where','boiler_hot_rooms_cold'),{label:'The display shows the boiler heating, but rooms stay cold',fact:'Display reportedly shows boiler heating; delivery of heat to rooms unconfirmed.'});
Object.assign(option('bl.heat.where','boiler_cold'),{label:'The display does not show the boiler heating',fact:'Homeowner did not see heating on the display; boiler operation unconfirmed.'});
B['bl.pressure.read'].body='Read only an already-visible gauge without touching it or nearby pipes. Record the number, units, and whether the boiler is running. Compare it with the range in the exact owner’s manual for this installation. This hot-water question does not apply to a steam boiler. Do not add or drain water.';
for(const [id,label,fact] of [['pressure_low','Below the minimum in my exact owner’s manual','Pressure reported below the manual’s range.'],['pressure_normal','Within the range in my exact owner’s manual','Pressure reportedly within the owner’s manual range; operation not confirmed.'],['pressure_high','Above the manual’s operating range','Pressure reported above the manual’s operating range.'],['pressure_at_relief','At the relief setting or warning mark shown for my boiler','Pressure reported at the installation’s relief setting or warning mark.'],['pressure_cant_find','No matching range, unreadable gauge, or not sure','Gauge reading or matching range unconfirmed.']])Object.assign(option('bl.pressure.read',id),{label,fact,hint:''});
B['bl.zone.valve'].body='If a zone indicator is already visible, record its label and light pattern without touching the valve, lever, button, or pipes. Do not open a control box. A light alone does not prove a valve opened or water circulated.';
for(const [id,label,fact] of [['zv_solid','A light is on steady','Visible zone-indicator light reported steady; function unconfirmed.'],['zv_off','A light is off','Visible zone-indicator light reported off; cause unconfirmed.'],['zv_slow_or_double','A light is blinking','Visible zone-indicator light reported blinking; meaning unconfirmed.']])Object.assign(option('bl.zone.valve',id),{label,fact,reason:'zone_after_basics'});
B['bl.dhw.indirect_call'].body='An indirect tank receives heat from the boiler. Neither side has been confirmed to work. Use only what you have already noticed during normal hot-water use. Do not run a hot tap as a test, touch hot pipes, or change the tank’s temperature dial.';
option('bl.steam.glass','glass_cant_see').next='@bl_steam_glass_empty';
option('bl.steam.glass','glass_low_or_light').next='@bl_steam_glass_empty';
B['bl.code.read'].body='Record the full code and already-known model. Use the meaning in the exact owner’s manual; if you cannot match it, select not sure. A code is not a parts diagnosis. Do not clear error history or reset the boiler.';
B['bl.conclude.call_pro'].body='The next checks need a licensed heating professional. Record what you could observe and what remains unknown. Do not reset, add water, open compartments, or operate gas or water valves. A thermostat set to Off may not stop a boiler that also serves other zones or hot water.';
R.bl_call_pro.actions=['Call a licensed heating professional and describe the observations and remaining unknowns.','If a new smell, alarm, smoke, leak, steam, or bang appears, use Stop / get help immediately.',CO];
R.bl_call_pro.explanation='The cause has not been confirmed. The next checks need a licensed heating professional.';
R.bl_gate_unsure.actions=['Do not approach the boiler to investigate an uncertain hazard.','For a possible gas smell, CO alarm, smoke, or illness, get everyone outside and call for emergency help.','Otherwise stay away and call a licensed heating professional for guidance on shutdown. A thermostat set to Off may not stop other heating zones or hot-water operation.',CO];
R.bl_emitters_cleared_basic.actions=['Keep furniture and curtains outside the clearance specified in the emitter’s owner’s manual. Do not remove covers or touch hot surfaces.','If the rooms are falling behind, arrange service; do not delay help for a vulnerable person.',CO];
R.bl_batteries_display_back.actions=['Check the normal heating mode and setpoint on the restored display.','If needed heat does not return promptly, arrange service. A restored display does not prove the boiler works.',CO];
// Copy-only thermostat battery help is handed to the exact-model lane.
B['bl.tstat.blank'].body='Thermostats use different battery-access arrangements, and some do not use batteries. The model-specific thermostat check can help identify yours. Do not pull an unfamiliar faceplate or expose wires.';
B['bl.tstat.blank'].options=[op('thermostat_help','Check my thermostat model','ts.gate.safety_stops'),op('call_pro','Stop and call a professional','bl.conclude.call_pro','','Thermostat screen blank; homeowner chose a professional.',{reason:'notice_declined'}),hazard()];
for(const node of Object.values(B)) {
  // Draft pn blocks contain mismatched undo and timing text; look-only panels
  // use the reviewed question copy until a specific physical step is included.
  delete node.pn;delete node.legal;delete node.input;
  node.options.forEach(o=>{delete o.legal;delete o.cond;});
}
boiler.review = {date:'2026-10-12',type:'operator content review',notAttorneyReviewed:true,notLicensedHvacReviewed:true,held:['Model-specific boiler resets pending exact-model source verification','Radiator bleeding pending an exact homeowner procedure and tool exception'],sourceArchive:'second-wrench-handoff-supplement.zip'};
R.bl_refrigerant_alarm = {
  title: 'Leave the affected area',
  explanation: 'A refrigerant leak alarm needs people out of the affected area. This boiler check does not identify the refrigerant or the cause.',
  actions: [
    'Move people out of the affected area to fresh air without operating switches or creating ignition sources.',
    'Call a licensed HVAC professional with EPA 608 capability from outside the affected area and follow the equipment’s alarm instructions. For breathing trouble or immediate danger, call 911.',
    'Do not DIY-seal a leak or add refrigerant.'
  ],
  avoid: 'Do not turn off a mitigation blower, cycle power, bypass a sensor, use flames, or open refrigerant lines.',
  tier: 'Stop / professional',
  outcome: 'emergency_exit',
  diyTier: 'pro_only',
  reason: 'refrigerant_alarm_or_release',
  urgency: 'Leave the affected area',
  owner: 'bl',
  gate: 'refrigerant_alarm_or_release'
};
const furnace = require('./compose-furnace')(read('content/lanes/furnace-base.json'), read('content/lanes/furnace-draft.json'), CO);
// Publish only reviewed runtime fields. Raw reset instructions, routing notes,
// review packets and authoring metadata stay out of the delivered bundle.
const waterHeater = require('./compose-water-heater')(CO);
for (const group of [{nodes:B},furnace,waterHeater]) {
  for (const [id,node] of Object.entries(group.nodes)) {
    for (const option of node.options) if(option.id === 'hazard_now') option.label = 'New gas smell, CO alarm, refrigerant leak alarm, smoke, sparks, leaking hot water or steam, or another hazard';
    if (node.safetyGate && ['fn.gate.combustion_co','bl.gate.safety','wh.gate.safety'].includes(id) && !node.options.some(o => o.id === 'refrigerant_alarm')) {
      const refrigerantNext = id.startsWith('bl.') ? '@bl_refrigerant_alarm' : '@leak';
      const unsureAt = node.options.findIndex(o => o.id === 'unsure' || o.id === 'none_of_these');
      const at = unsureAt === -1 ? node.options.length - 1 : unsureAt;
      node.options.splice(at, 0, op('refrigerant_alarm','A refrigerant leak alarm is sounding',refrigerantNext,'Leave the affected area.','Refrigerant leak alarm reported.'));
    }
  }
}
const basic = require('./compose-basic-steps')();
const wshp = require('./compose-wshp')(CO);
const sideDischarge = require('./compose-side-discharge')(read('content/lanes/side-discharge-draft.json'),CO);
const miniSplit = require('./compose-mini-split')(read('content/lanes/mini-split-base.json'),read('content/lanes/mini-split-draft.json'),CO);
const output = {basic,wshp,sideDischarge,miniSplit,boiler:{nodes:B,results:R,reasons:boiler.REASON},furnace,waterHeater,co:CO};
fs.writeFileSync(path.join(root,'assets/heating-data.json'), JSON.stringify(output,null,2)+'\n');
fs.writeFileSync(path.join(root,'assets/heating-data.js'), '/* Generated by scripts/compose-heating-lanes.js. */\nwindow.SW_HEATING_DATA = '+JSON.stringify(output)+';\n');
console.log('Heating data generated: '+Object.keys(B).length+' boiler/shared nodes, '+Object.keys(R).length+' results.');
