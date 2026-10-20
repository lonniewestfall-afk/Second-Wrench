'use strict';
const assert=require('assert/strict');
global.SW_CONFIG={advancedRepairsEnabled:false,aiThermostatEnabled:false,mirrorsEnabled:false,stageLatchStepsEnabled:false};
const F=require('../assets/flow'),H=require('../assets/heating-lanes');
const clone=x=>JSON.parse(JSON.stringify(x));
const meta={agreed:true,termsVersion:'test'};
function reply(s,c){if(s.node==='sw.co.fast_exit'&&c!=='co_yes'&&c!=='co_no')F.answer(s,'co_no',meta);F.answer(s,c,meta);}
function go(...choices){const s=F.create('','test');for(const c of choices)reply(s,c);return s;}
const base=['none_of_these','agree_18_terms'];
const boiler=()=>go(...base,'other_heat_or_ductless','boiler','co_no');
const furnace=()=>go(...base,'furnace','co_no');
const water=()=>go(...base,'other_heat_or_ductless','water_heater','co_no');
function act(s,...choices){for(const c of choices)reply(s,c);return s;}
assert.equal(boiler().node,'bl.gate.safety');assert.equal(boiler().product,'bl');
assert.equal(water().node,'wh.gate.safety');assert.equal(water().product,'wh');
assert.equal(F.nodes['sw.intake.system_type'].options.length,5);
// Water / air handoffs always start at the receiving gate; uncertainty survives.
let s=act(furnace(),'none_of_these','air_handler_hot_water','boiler','pipe_cold');
assert.equal(s.node,'sw.co.fast_exit');assert.equal(s.coReturn,'bl.gate.safety');
act(s,'co_no');assert.equal(s.node,'bl.gate.safety');assert.equal(s.product,'bl');assert.equal(s.bl.hydroPipe,'cold');
act(s,'none_of_these');assert.equal(s.node,'bl.coil.type');
s=act(boiler(),'none_of_these','hydro_air','pipe_hot_no_air','co_no');assert.equal(s.node,'fn.gate.combustion_co');assert.equal(s.product,'fn');
act(s,'none_of_these');assert.equal(s.node,'fn.hydro.air_side');
assert.match(F.summary(s),/circulation and coil temperature have not been confirmed/);
assert.ok(!/hot water is reaching/i.test(F.viewNode(s.node,s).body));
s=act(furnace(),'none_of_these','air_handler_hot_water','not_sure','unsure');assert.equal(s.node,'sw.handoff.hydronic_both');
act(s,'water_side','src_not_sure');assert.equal(s.node,'fn.conclude.call_pro');
s=act(water(),'none_of_these','none_of_these','tank','indirect','continue');assert.equal(s.node,'sw.co.fast_exit');assert.equal(s.coReturn,'bl.gate.safety');
act(s,'co_no');assert.equal(s.node,'bl.gate.safety');assert.equal(s.bl.mode,'dhw');assert.equal(s.bl.hwType,'indirect');
act(s,'none_of_these');assert.equal(s.node,'bl.dhw.indirect_call');assert.equal(s.bl.mode,'dhw');assert.equal(s.mode,'test');
// A combi DHW complaint must make progress after WH -> BL, including when
// the session started in BL. It must not return to the same generic landing.
for(const fromBoiler of [false,true]){
 s=fromBoiler?act(boiler(),'none_of_these','combi','fuel_gas','landing_no_hot_water','dhw_combi'):water();
 act(s,'none_of_these','none_of_these','combi','continue');assert.equal(s.node,'sw.co.fast_exit');assert.equal(s.coReturn,'bl.gate.safety');
 act(s,'co_no');assert.equal(s.node,'bl.gate.safety');assert.equal(s.bl.mode,'dhw');assert.equal(s.bl.hwType,'combi');
 act(s,'none_of_these','fuel_gas');assert.equal(s.node,'bl.dhw.combi_call');
 const heat=clone(s);act(heat,'home_also_cold','cold_getting_colder');assert.equal(heat.result,'bl_cold_home_urgent');assert.equal(heat.bl.mode,'heat');
 act(s,'tap_only','display_normal','pressure_normal','ack_call_pro');assert.equal(s.result,'bl_call_pro');assert.equal(s.bl.mode,'dhw');
 assert.equal(s.answers.filter(a=>a.node==='wh.intake.type').length,1,'combi identification does not repeat');
}
// Coil-fed heating is not silently converted into a complaint about tap water.
const coilWater=fromBoiler=>fromBoiler?act(boiler(),'none_of_these','hydro_air','pipe_cold','src_water_heater','co_no'):act(furnace(),'none_of_these','air_handler_hot_water','water_heater_tank','pipe_cold','co_no');
for(const fromBoiler of [false,true]){
 s=coilWater(fromBoiler);assert.equal(s.node,'wh.gate.safety');assert.equal(s.whCoil,true);
 act(s,'none_of_these','none_of_these');assert.equal(s.node,'wh.hydro.cold_home');
 const cold=clone(s);act(cold,'home_cooling');assert.equal(cold.result,'bl_cold_home_urgent');
 act(s,'holding');assert.equal(s.node,'wh.hydro.tap');
 act(s,'no','tank','gas');assert.equal(s.node,'wh.hydro.observations');
 const air=clone(s);act(air,'no_air','co_no');assert.equal(air.node,'fn.gate.combustion_co');act(air,'none_of_these');assert.equal(air.node,'fn.hydro.air_side');
 const hot=clone(s);act(hot,'taps_work');assert.equal(hot.node,'sw.co.fast_exit');assert.equal(hot.coReturn,'fn.gate.combustion_co');act(hot,'co_no');assert.equal(hot.node,'fn.gate.combustion_co');assert.equal(hot.heaterOk,'yes');assert.match(F.summary(hot),/Water circulation and coil temperature have not been confirmed/);assert.match(F.summary(hot),/Tap hot water reportedly works/);
}
s=coilWater(false);act(s,'none_of_these','none_of_these','holding','no','combi','continue');assert.equal(s.node,'sw.co.fast_exit');assert.equal(s.coReturn,'bl.gate.safety');act(s,'co_no');assert.equal(s.node,'bl.gate.safety');act(s,'none_of_these');assert.equal(s.node,'bl.coil.type');assert.equal(s.bl.mode,'heat');
for(const risk of ['cold_getting_colder','cold_not_sure']){s=act(boiler(),'none_of_these','hot_water_standard','fuel_gas','landing_no_heat',risk);assert.equal(s.result,'bl_cold_home_urgent');assert.ok(!s.answers.some(a=>a.node==='bl.cold.weather'));}
{const pressure=F.nodes['bl.gate.safety'].options.find(o=>o.id==='pressure_at_relief');assert.doesNotMatch(pressure.label+' '+pressure.fact,/30 psi|15 psi/);assert.match(pressure.fact,/numerical setting is not stated/);}
assert.equal(F.nodes['bl.gate.carryover'],undefined);
// BH-1. Start id stays boiler. The legacy id is accepted as that same choice.
const other=F.nodes['sw.intake.other_system'];
const boilerChoice=other.options.find(o=>o.id==='boiler');
assert.equal(boilerChoice.label,'Boiler, radiators, baseboard, or radiant floors');
assert.equal(boilerChoice.next,'bl.gate.safety');
for(const [id,node] of Object.entries(F.nodes)){
 assert.notEqual(id,'boiler_hot_water_steam');
 for(const o of node.options||[])assert.notEqual(o.id,'boiler_hot_water_steam');
}
s=go(...base,'other_heat_or_ductless');
F.answer(s,'boiler_hot_water_steam',meta);
assert.equal(s.node,'sw.co.fast_exit');
act(s,'co_no');assert.equal(s.node,'bl.gate.safety');assert.equal(s.product,'bl');
assert.ok(s.answers.some(a=>a.choice==='boiler'));
assert.ok(!s.answers.some(a=>a.choice==='boiler_hot_water_steam'));
// BH-2. No live edge targets the retired gate. Handoffs land on bl.gate.safety after the CO screen.
for(const node of Object.values(F.nodes))for(const o of node.options||[]){
 const blob=JSON.stringify(o.next)+JSON.stringify(o.heatingTarget===undefined?'':o.heatingTarget);
 assert.equal(blob.includes('bl.gate.carryover'),false,node.title);
}
const gateNone=F.nodes['bl.gate.safety'].options.find(o=>o.id==='none_of_these');
const gateRoute=gateNone.heatingTarget||gateNone.next;
for(const key of ['fromWhIndirect','fromWhCode','fromWhHeat','fromFnCoil','fromWhCoilOk'])assert.ok(gateRoute[key],key);
assert.equal(gateRoute.fromWhIndirect,'bl.dhw.indirect_call');
assert.equal(gateRoute.fromWhCode,'bl.cold.screen');
assert.equal(gateRoute.fromWhHeat,'bl.intake.fuel');
assert.equal(gateRoute.fromFnCoil,'bl.coil.type');
assert.equal(gateRoute.fromWhCoilOk,'bl.coil.type');
assert.equal(JSON.stringify(gateRoute).includes('coil_loop_wh_source'),false);
// M31 / M39 / M40. A mis-tapped hazard returns to the step left, stays in the note, and the next boiler entry runs the gate again.
s=act(boiler(),'none_of_these','hydro_air','hazard_now');
assert.equal(s.node,'sw.co.fast_exit');assert.equal(s.bl.retriageFrom,'sw.handoff.hydronic_coil');
act(s,'co_no','none_of_these');assert.equal(s.node,'sw.handoff.hydronic_coil');
assert.match(F.summary(s),/New hazard reported/);
assert.doesNotMatch(F.summary(s),/bl\.gate|retriageFrom|hazard_now/);
act(s,'pipe_cold','src_boiler');assert.equal(s.node,'sw.co.fast_exit');assert.equal(s.coReturn,'bl.gate.safety');
act(s,'co_no');assert.equal(s.node,'bl.gate.safety');
// BH-3. Outgoing handoffs carry the mode the receiving lane needs.
s=act(boiler(),'none_of_these','hot_water_standard','fuel_gas','landing_no_hot_water','dhw_combi');
assert.equal(s.node,'sw.co.fast_exit');assert.equal(s.bl.mode,'dhw');assert.equal(s.bl.hwType,'combi');
s=act(boiler(),'none_of_these','hydro_air','pipe_hot_no_air');
assert.equal(s.bl.mode,'heat');assert.equal(s.node,'sw.co.fast_exit');assert.equal(s.coReturn,'fn.gate.combustion_co');
s=act(boiler(),'none_of_these','hydro_air','pipe_cold','src_water_heater');
assert.equal(s.bl.mode,'heat');assert.equal(s.whCoil,true);assert.equal(s.node,'sw.co.fast_exit');
// Water near wiring and the refrigerant alarm are Stop results. Copy stays put.
assert.equal(F.results.bl_water_electrical.tier,'Stop / professional');
assert.equal(F.results.bl_water_electrical.tier,F.results.electrical.tier);
assert.match(F.results.bl_water_electrical.explanation,/Water near wiring can shock/);
assert.match(F.results.bl_steam_glass_empty.explanation,/Do not add water, even after it cools/);
const refrigChoice=F.nodes['bl.gate.safety'].options.find(o=>o.id==='refrigerant_alarm');
const refrigCopy={title:F.results.bl_refrigerant_alarm.title,explanation:F.results.bl_refrigerant_alarm.explanation,actions:F.results.bl_refrigerant_alarm.actions.slice(),avoid:F.results.bl_refrigerant_alarm.avoid};
function assertM41(){
 assert.equal(F.results.bl_refrigerant_alarm.tier,'Stop / professional');
 assert.equal(F.results.bl_refrigerant_alarm.tier,F.results.leak.tier);
 assert.equal(F.results.bl_refrigerant_alarm.outcome,F.results.leak.outcome);
}
function assertM42(){
 const choice=F.nodes['bl.gate.safety'].options.find(o=>o.id==='refrigerant_alarm');
 assert.equal(choice.next,'@bl_refrigerant_alarm');
 assert.notEqual(choice.next,'@leak');
 const live=F.results.bl_refrigerant_alarm;
 assert.equal(live.title,refrigCopy.title);
 assert.equal(live.explanation,refrigCopy.explanation);
 assert.deepEqual(live.actions,refrigCopy.actions);
 assert.equal(live.avoid,refrigCopy.avoid);
}
assertM41();
assertM42();
const plantedTier=F.results.bl_refrigerant_alarm.tier;
F.results.bl_refrigerant_alarm.tier='Emergency';
assert.throws(assertM41);
F.results.bl_refrigerant_alarm.tier=plantedTier;
const plantedNext=refrigChoice.next;
refrigChoice.next='@leak';
assert.throws(assertM42);
refrigChoice.next=plantedNext;
const plantedExplanation=F.results.bl_refrigerant_alarm.explanation;
F.results.bl_refrigerant_alarm.explanation=plantedExplanation+' L-45';
assert.throws(assertM42);
F.results.bl_refrigerant_alarm.explanation=plantedExplanation;
// M36. The service note uses plain type words and a sentence, not a raw id.
s=act(boiler(),'none_of_these','hot_water_standard','fuel_gas','landing_no_heat','nobody_at_risk','cold_no','settings_ok_still_problem','display_dark','ack_call_pro');
let note=F.summary(s);
assert.match(note,/standard hot-water/);
assert.doesNotMatch(note,/\b(he|std)\b/);
assert.match(note,/Stop reason: /);
assert.doesNotMatch(note,/Stop reason: [a-z0-9_]+$/m);
assert.doesNotMatch(note,/code_pressure_ok|bl_call_pro/);
s=act(boiler(),'none_of_these','hot_water_high_eff','fuel_gas','landing_no_heat','cold_getting_colder');
note=F.summary(s);
assert.match(note,/high-efficiency hot-water/);
assert.doesNotMatch(note,/\b(he|std)\b/);
assert.match(note,/Stop reason: /);
assert.doesNotMatch(note,/Stop reason: [a-z0-9_]+$/m);
// HPWH content records prior work only; no generic filter procedure unlocks.
s=act(water(),'none_of_these','none_of_these','tank','heat_pump','filter','external');assert.equal(s.node,'wh.hpwh.filter_step');assert.match(F.viewNode(s.node,s).body,/Answer only about work already completed/);assert.match(F.viewNode(s.node,s).body,/Do not remove or wash a filter/);assert.ok(!F.viewNode(s.node,s).step);
// Empty / unreadable steam glass never routes to water addition or a reset.
for(const c of ['glass_empty','glass_cant_see','glass_low_or_light']){
 s=act(boiler(),'none_of_these','steam','fuel_gas','landing_pressure','nobody_at_risk','cold_no',c);
 assert.equal(s.result,'bl_steam_glass_empty');assert.match(F.presentResult(s).avoid,/Don’t add water/);
}
// The current optional step is hidden and cannot be answered before notice.
s=act(furnace(),'none_of_these','gas_furnace','natural_gas','site_built','landing_after_storm','none_of_these');
assert.equal(s.node,'fn.vent.exterior_visual');
let v=F.viewNode(s.node,s);assert.ok(v.warrantyPrompt);assert.throws(()=>F.acknowledgeStep(s));act(s,'warranty_ok');v=F.viewNode(s.node,s);assert.ok(v.noticePrompt);assert.equal(v.step,null);
let before=JSON.stringify(s);assert.throws(()=>F.answer(s,'blocked_cleared',meta));assert.equal(JSON.stringify(s),before);
let hazard=clone(s);act(hazard,'hazard_now','gas_smell_or_unknown_smell');assert.equal(hazard.result,'fn_gas_smell');
F.acknowledgeStep(s);v=F.viewNode(s.node,s);assert.ok(v.step.steps.length);assert.equal(s.notices.fn.version,'pn-v1');
act(s,'blocked_cleared','getting_too_cold');assert.equal(s.result,'fn_cold_exposure');
// No new hazard can be dismissed to unlock DIY.
s=act(furnace(),'none_of_these','hazard_now','none_of_these');assert.equal(s.result,'fn_gate_unsure');assert.equal(s.noDiyLock,true);
// Only a personally-known accidental external switch restoration is eligible.
const power=()=>act(furnace(),'none_of_these','gas_furnace','natural_gas','site_built','landing_code','light_off','switch_off','by_mistake');
s=power();assert.ok(F.viewNode(s.node,s).warrantyPrompt);act(s,'warranty_ok');assert.ok(F.viewNode(s.node,s).noticePrompt);
F.acknowledgeStep(s);assert.equal(s.reset_count,1);assert.ok(F.viewNode(s.node,s).step);
act(s,'shut_off_again');assert.equal(s.result,'fn_breaker_tripped_pro');
F.stop(s);assert.equal(s.reset_count,1);assert.equal(s.noDiyLock,true);
s=act(furnace(),'none_of_these','oil_furnace','site_built','landing_code','light_off','switch_off','by_mistake');assert.equal(s.result,'fn_switch_off_on_purpose');
// A high-limit/rollout combination must not lead to a filter reset.
s=act(furnace(),'none_of_these','gas_furnace','propane','manufactured_home','landing_code','light_blinking_or_code','limit_unsure');assert.equal(s.result,'fn_code_rollout_stop');
// Model-specific filter quantity, no compartment removal or pipe-touch test.
const filter=F.nodes['fn.airflow.filter_fit'];assert.match(filter.body,/quantity/);assert.match(filter.body,/tool-free furnace door/);assert.match(filter.step.steps[0],/Off/);assert.ok(!/only one filter|one filter of/.test(JSON.stringify(filter)));
for(const [id,node] of Object.entries(H.nodes)){
 assert.ok(!/\b(?:safe|safely|safer|safest)\b/i.test(JSON.stringify([node.title,node.body,node.step,node.options.map(x=>[x.label,x.hint,x.fact])])),id+' assurance');
 for(const o of node.options) assert.ok(!/\(unchanged\)|FN_CODE|\(router\)|\(path next/.test(JSON.stringify([o.label,o.hint,o.fact])),id+' placeholder');
}
// A filter observation cannot proceed to a running-equipment question until
// the homeowner passes the warning check and reports restoring the settings.
const fnFilter=()=>act(furnace(),'none_of_these','gas_furnace','natural_gas','site_built','landing_code','light_blinking_or_code','airflow');
for(const changed of [true,false]){
 const x=fnFilter();act(x,changed?'fixed_fit':'fits_fine');assert.equal(x.node,'fn.airflow.after_filter');
 const h=clone(x);act(h,'hazard','none_of_these');assert.equal(h.result,'fn_gate_unsure');assert.ok(h.noDiyLock);
 act(x,'ready');assert.equal(x.node,'fn.airflow.restore_request');assert.ok(!x.result);act(x,'filter_settings_restored');assert.equal(changed?x.result:x.node,changed?'fn_filter_fit_basic':'fn.airflow.returns');
 if(!changed)assert.ok(!/filter correction/.test(F.summary(x)));
}
// Clearing a site-built home's room return must not assert mobile-home ducts.
s=act(furnace(),'none_of_these','gas_furnace','natural_gas','site_built','landing_one_area_cold','blocked','cleared');assert.equal(s.result,'fn_mh_return_cleared_basic');assert.doesNotMatch(F.presentResult(s).explanation,/mobile-home furnace|pulls air through its door/);assert.match(F.presentResult(s).explanation,/reported removing an obstruction/);
s=act(furnace(),'none_of_these','gas_furnace','natural_gas','site_built','landing_after_storm','meter_buried_iced');assert.equal(s.result,'fn_meter_iced');assert.match(F.presentResult(s).actions.join(' '),/Do not brush, chip, heat, or touch it/);assert.doesNotMatch(F.results.fn_out_of_scope_equipment.explanation,/oil.*aren.t covered|Boilers.*aren.t covered/);assert.doesNotMatch(F.nodes['fn.vent.after_clear'].title,/time to restart/);
for(const n of Object.values(H.nodes))for(const o of n.options)assert.doesNotMatch(o.fact||'',/audit handoff:|flag tankless_lead|reset_count|reuses existing stop|replaces oil_or_other/,'No authoring markers in service-note facts');
// State walk includes all new lanes. Dedupe only on route-affecting state;
// timestamps and repeated narrative history cannot create infinite cycles.
function key(s){if(s.result)return JSON.stringify([s.result,s.product,s.fnFuel,s.fnReason,s.fnNoHeat,(s.bl||{}).reason,s.whFuel]);const b={};for(const k of ['type','fuel','landing','mode','entry','coil','fragile','cold','sawCode','retriage','retriageFrom'])b[k]=(s.bl||{})[k];const selected={node:s.node,result:s.result,product:s.product,fnFuel:s.fnFuel,fnGas:s.fnGas,fnHome:s.fnHome,fnLanding:s.fnLanding,fnHandoff:s.fnHandoff,fnNoHeat:s.fnNoHeat,fnAfterWarmup:s.fnAfterWarmup,coReturn:s.coReturn,fnFilterUnchanged:s.fnFilterUnchanged,fnFilterChecked:s.fnFilterChecked,whType:s.whType,whFuel:s.whFuel,whFrom:s.whFrom,whCoil:s.whCoil,bl:b,reset:s.reset_count,notice:!!(s.notices&&s.notices.fn),warranty:Object.keys(s.warrantyAck||{}).sort(),reserved:s.switchStepReserved,hazard:s.heatingHazardReported,codeSeen:s.answers.some(x=>x.node==='fn.code.window_look')};return JSON.stringify(selected);}
const queue=[furnace(),boiler(),water(),coilWater(false),coilWater(true),act(water(),'none_of_these','none_of_these','combi','continue'),act(water(),'none_of_these','none_of_these','tank','indirect','continue'),act(boiler(),'none_of_these','hydro_air','pipe_hot_no_air'),act(furnace(),'none_of_these','air_handler_hot_water','boiler','pipe_cold')].map(s=>Object.assign(s,{walkLane:s.product})),seen=new Set(),visited=new Set(),leaves=new Set();
while(queue.length){
 const a=queue.shift(),k=key(a);if(seen.has(k))continue;seen.add(k);if(seen.size%10000===0)console.log('Heating walk',seen.size,a.product,a.node,a.answers.length,queue.length);assert.ok(seen.size<100000,'bounded state walk');
 if(a.result){leaves.add(a.result);assert.match(F.summary(a),/TEST SCENARIO/);if(a.product==='bl'||String(a.result).startsWith('bl_')){assert.doesNotMatch(F.summary(a),/\b(he|std)\b/);assert.doesNotMatch(F.summary(a),/Stop reason: [a-z0-9_]+$/m);assert.doesNotMatch(F.summary(a),/\b(?:safe|safely|safer|safest)\b/i);}const stopped=clone(a);F.stop(stopped);assert.equal(stopped.node,'sw.co.fast_exit');assert.equal(stopped.result,null);continue;}
 if(!H.owns(a.node)||a.product!==a.walkLane)continue;
 visited.add(a.node);const view=F.viewNode(a.node,a);
 if(view.noticePrompt){const t=clone(a);F.acknowledgeStep(t);queue.push(t);}
 const heatOnly=/^(bl\.power\.look|bl\.tstat\.|bl\.heat\.where|bl\.zone\.look|bl\.noise\.screen|bl\.leak\.where)/;
 if(a.product==='bl'&&a.bl&&a.bl.mode==='dhw'&&heatOnly.test(a.node||'')&&!a.answers.some(x=>x.node==='bl.dhw.combi_call'&&x.choice==='tap_only'))throw Error('BH-4 '+a.node);
 for(const o of view.options){if(o.disabled)continue;const t=clone(a);try{F.answer(t,o.id,meta);}catch(e){throw Error(a.node+'/'+o.id+': '+e.message);}assert.ok(t.node||t.result,'valid transition');assert.ok(!String(t.node).startsWith('ac.adv.'),'no advanced');if(t.product==='bl'&&t.bl&&t.bl.mode==='dhw'&&heatOnly.test(t.node||'')&&!t.answers.some(x=>x.node==='bl.dhw.combi_call'&&x.choice==='tap_only'))throw Error('BH-4 '+a.node+'/'+o.id+' -> '+t.node);queue.push(t);}
}
function targetsOf(next,out){if(!next)return;if(typeof next==='string'){out.push(next);return;}if(typeof next==='object')for(const v of Object.values(next))targetsOf(v,out);}
for(const [id,node] of Object.entries(H.nodes)){
 if(!id.startsWith('bl.'))continue;
 for(const o of node.options){
  const targets=[];targetsOf(o.heatingTarget===undefined?o.next:o.heatingTarget,targets);
  if(!targets.includes('bl.conclude.call_pro'))continue;
  if(id==='bl.dhw.combi_call'&&o.id==='unsure')continue;
  assert.ok(o.reason||(o.set&&o.set.reason), 'BH-5 '+id+'/'+o.id);
 }
}
const heldTap=H.nodes['bl.dhw.combi_call'].options.find(o=>o.id==='tap_only');
assert.equal(heldTap.next,'bl.power.look');
function instructs(text){
 const lines=String(text||'').split(/\n/);
 return lines.some(line=>{
  const say=line.replace(/\b(?:do not|don't|don’t|never)\b[^.]*/gi,'');
  return /\b(?:turn|adjust|change)\b[^.]{0,40}\b(?:aquastat|temperature dial)\b/i.test(say)||/\bbleed\b/i.test(say)||/\badd water\b/i.test(say)||/\bdrain\b[^.]{0,40}\bfreeze/i.test(say)||/\breset (?:the|it|a)\b/i.test(say);
 });
}
for(const [id,node] of Object.entries(H.nodes)){
 if(!(id.startsWith('bl.')||id==='sw.handoff.hydronic_coil'||id==='sw.handoff.hydronic_both'))continue;
 const blob=[node.title,node.body,node.caution].concat((node.options||[]).map(o=>[o.label,o.hint,o.fact].join(' '))).join('\n');
 assert.equal(instructs(blob),false,'BH-6 '+id);
}
for(const [id,res] of Object.entries(H.results)){
 if(!id.startsWith('bl_'))continue;
 assert.equal(instructs([res.title,res.explanation,res.avoid].concat(res.actions||[]).join('\n')),false,'BH-6 '+id);
}
const required=['fn.airflow.after_filter','fn.airflow.restore_request','fn.airflow.returns','fn.hydro.air_side','fn.mh.closet_return','fn.elec.pattern','bl.gate.safety','bl.dhw.combi_call','wh.hydro.cold_home','wh.hydro.observations'];for(const id of required)assert.ok(visited.has(id),'walk reaches '+id);
assert.equal(visited.has('bl.gate.carryover'),false);
console.log('Heating checks passed: '+seen.size+' states; '+visited.size+' questions; '+leaves.size+' results.');
