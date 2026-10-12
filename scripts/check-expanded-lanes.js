'use strict';
const A=require('assert/strict');
global.SW_CONFIG={advancedRepairsEnabled:false,aiThermostatEnabled:false,mirrorsEnabled:false,stageLatchStepsEnabled:false};
const F=require('../assets/flow'),H=require('../assets/heating-lanes');
const copy=s=>JSON.parse(JSON.stringify(s)),meta={agreed:true,termsVersion:'test'};
function act(s,...cs){for(const c of cs)F.answer(s,c,meta);return s;}
function start(...cs){return act(F.create('','test'),'none_of_these','agree_18_terms',...cs);}
const mini=(multi=false)=>start('other_heat_or_ductless','ductless_mini_split',multi?'ductless_multi_zone':'ductless_single_zone');
const hp=()=>start('heat_pump','air_source_ducted_hp','landing_side_discharge');
const ac=()=>start('cooling_only_ac','split_central_cool_only','landing_not_cooling','mode_cool_setpoint_ok','filter_clean_ok', 'clean_restart_ready', 'filter_settings_restored','fan_on_side');
// Mini-split: cooling mode survives the side-discharge handback and cannot
// inherit a ducted system's Emergency Heat instruction.
for(const mode of ['heat','cool','unsure']){
 const s=act(mini(),'landing_outdoor_unit','ctx_mode_'+mode,'outdoor_snow_or_low','mode_'+mode);
 A.equal(s.product,'sd');A.equal(s.sdFrom,'ms');A.equal(s.sdMode,mode);
 if(mode!=='cool')act(s,'warm_enough');act(s,'none_of_these','landing_snow_ice','ice_on_unit');
 if(mode==='cool'){A.equal(s.product,'ms');A.equal(s.node,'ms.ice.stop_observe');act(s,'ice_want_keep_running');}
 else act(s,'ice_stays');
 A.equal(s.product,'ms');A.ok(['ms_ice_keep_running','ms_ice_heat_keep_running'].includes(s.result));A.ok(!/switch to.*Emergency Heat/i.test(JSON.stringify(F.presentResult(s))));
}
// HP at-risk cold handback uses a real HP result; cabinet confirmation is required.
let s=act(hp(),'mode_heat','someone_at_risk');A.equal(s.product,'hp');A.equal(s.result,'hp_cold_exposure');A.equal(F.presentResult(s).outcome,'emergency_exit');
s=act(hp(),'mode_cool','none_of_these');A.equal(s.node,'sd.intake.cabinet_confirm');act(s,'not_sure');A.equal(s.result,'sd_not_side_discharge');
s=act(ac(),'mode_cool','none_of_these','landing_want_to_fix','reset_breaker');A.equal(s.result,'sd_breaker_not_guided');
s=act(ac(),'mode_cool','none_of_these','landing_crowded','items_or_plants');A.ok(F.viewNode(s.node,s).step);act(s,'hazard_now','none_of_these');A.equal(s.result,'uncertain');
// Multi-room changes: guard, notice, then procedure. Invalid choices cannot
// change the session, and hazard exits stay available before acknowledgement.
s=act(mini(true),'one_unit_problem','others_different_mode_or_auto');A.equal(s.node,'ms.zone.isolate_head');A.equal(F.viewNode(s.node,s).step,null);A.throws(()=>F.acknowledgeStep(s));
let before=JSON.stringify(s);A.throws(()=>F.answer(s,'unit_works_after_matching',meta));A.equal(JSON.stringify(s),before);
let t=copy(s);act(t,'cold_exposure_risk');A.equal(t.result,'ms_cold_exposure');
act(s,'cold_guard_ok');A.ok(F.viewNode(s.node,s).noticePrompt);before=JSON.stringify(s);A.throws(()=>F.answer(s,'unit_still_problem',meta));A.equal(JSON.stringify(s),before);
F.acknowledgeStep(s);A.ok(F.viewNode(s.node,s).step);act(s,'unit_still_problem','landing_error_code','code_check_manual');A.ok(F.viewNode(s.node,s).options.some(o=>o.id==='manual_mode_conflict'));
t=act(mini(),'landing_error_code','code_check_manual');before=JSON.stringify(t);A.throws(()=>F.answer(t,'manual_mode_conflict',meta));A.equal(JSON.stringify(t),before);
// Unsupported generic restart is not rendered. Already-restarted report sets the shared counter.
act(t,'manual_allows_restart');A.equal(t.node,'ms.error.restart_once');A.ok(!F.viewNode(t.node,t).step);A.ok(!F.viewNode(t.node,t).options.some(o=>o.id==='restart_cleared'));act(t,'restart_already_done');A.equal(t.reset_count,1);F.stop(t);A.equal(t.reset_count,1);
// Remote matching is once per session and is independent of reset_count.
s=act(mini(),'landing_no_cool','remote_ignored_unit_lit');A.ok(F.viewNode(s.node,s).step);act(s,'remote_works_still_not_cooling');A.equal(s.remoteCodeStepDone,true);A.equal(s.reset_count,0);
s.node='ms.controls.remote_app';s.result=null;A.equal(F.viewNode(s.node,s).step,null);A.ok(!F.viewNode(s.node,s).options.some(o=>o.id==='remote_works_now_ok'));
// Outdoor mode reversal: last answer wins, and contradictory answers are retained.
s=act(mini(),'landing_outdoor_unit','ctx_mode_heat','outdoor_blocked_close','mode_cool','none_of_these','landing_fan','still_no_sound');A.equal(s.msMode,'cool');A.equal(s.product,'ms');A.ok(!F.presentResult(s).actions.some(a=>/house is getting cold/.test(a)));A.match(F.summary(s),/Mode answered: heating/);A.match(F.summary(s),/Mode answered: cooling/);
// Filter access stops for ice before any cleaning instruction.
s=act(mini(),'landing_no_cool','settings_right_still_problem','filter_ok_tool_free_floor','pause_ok','thaw_ice_or_frost');A.equal(s.node,'ms.ice.stop_observe');A.ok(!s.answers.some(a=>a.node==='ms.head.filter_clean'));
// Both heating and cooling must tolerate the full filter-cleaning/drying
// interval. A passed access gate cannot itself reveal shutdown instructions.
for(const mode of ['heat','cool']){
 const path=mode==='heat'?['landing_no_heat','heat_settings_right_still_problem','no_frost_or_mild_weather']:['landing_no_cool','settings_right_still_problem'];
 const x=act(mini(),...path,'filter_ok_tool_free_floor');A.equal(x.node,'ms.head.pause_guard');
 const before=JSON.stringify(x);A.throws(()=>act(x,'thaw_off_stopped_no_ice'));A.equal(JSON.stringify(x),before);
 const no=copy(x);act(no,'cannot_pause');A.equal(no.result,'ms_filter_pause_pro');A.ok(!no.answers.some(a=>a.node==='ms.head.shutdown_thaw_check'));
 const hz=copy(x);act(hz,'hazard_now');A.equal(hz.result,'ms_hazard_now');
 act(x,'pause_ok');A.equal(x.node,'ms.head.shutdown_thaw_check');A.match(F.viewNode(x.node,x).body,/Write down or photograph/);act(x,'thaw_off_stopped_no_ice');A.equal(x.node,'ms.head.filter_clean');
 const isolation=act(mini(),...path,'manual_says_cut_power');A.equal(isolation.result,'ms_filter_inaccessible');A.match(F.presentResult(isolation).explanation,/any power disconnection, unplugging, or electrical isolation/);
}
A.match(F.nodes['ms.head.filter_path_ok'].body,/explicitly permits this filter access after remote Off alone/);A.match(F.nodes['ms.head.filter_path_ok'].body,/disconnecting or isolating any electric power supply, unplugging/);
s=act(mini(),'landing_error_code','code_check_manual','manual_normal_status');A.equal(s.result,'ms_code_status_basic');A.match(F.presentResult(s).actions.join(' '),/does not authorize opening the unit/);A.doesNotMatch(F.presentResult(s).actions.join(' '),/filter steps it shows by hand/);
s=act(mini(),'landing_no_heat','mode_was_auto');A.equal(F.viewNode(s.node,s).options[0].id,'cold_exposure_risk');act(s,'cold_exposure_risk');A.equal(s.result,'ms_cold_exposure');
// Geothermal cold and well-water conditions remain distinct from normal operation.
s=start('other_heat_or_ductless','water_source_geo','wshp_hz_none','home_pipes_at_risk');A.equal(s.result,'wshp_cold_home_urgent');A.ok(!/6 tons/.test(F.summary(s)));
s=start('other_heat_or_ductless','water_source_geo','wshp_hz_none','home_holding','wshp_open_loop','wshp_cx_well_water_out');A.equal(s.result,'wshp_well_water_out');A.match(F.presentResult(s).actions[0],/Off/);
// All AC side-fan entry points reach the SD mode and hazard screens.
for(const cs of [
 ['landing_will_not_start','fan_on_side'],
 ['landing_not_cooling','mode_cool_setpoint_ok','filter_clean_ok','clean_restart_ready','filter_settings_restored','fan_spinning','fan_on_side']
]){const x=start('cooling_only_ac','split_central_cool_only',...cs);A.equal(x.node,'sd.entry.outdoor');A.equal(x.sdFrom,'ac');act(x,'mode_cool','none_of_these');A.equal(x.node,'sd.landing.picker');}
// Clean-filter checks cannot silently leave the thermostat Off.
for(const warning of ['clean_restart_ice','clean_restart_water','clean_restart_unsure','hazard_now']){
 const x=start('cooling_only_ac','split_central_cool_only','landing_not_cooling','mode_cool_setpoint_ok','filter_clean_ok');A.equal(x.node,'ac.cool.filter.clean_restart');
 const before=JSON.stringify(x);A.throws(()=>act(x,'fan_spinning'));A.equal(JSON.stringify(x),before);act(x,warning);A.ok(x.result);A.notEqual(x.result,'cooling_not_established_basics_clear');
}
// Even a malformed continuation cannot take an SD result into another lane.
const guard=act(ac(),'mode_cool','none_of_these','landing_want_to_fix','reset_breaker');
const saved=F.results[guard.result].continueTo;F.results[guard.result].continueTo='ac.cool.power.breaker_visual';A.throws(()=>F.resume(guard));if(saved)F.results[guard.result].continueTo=saved;else delete F.results[guard.result].continueTo;
// Bounded context walk: every option, each notice state, every cross-lane mode.
const queue=[start('other_heat_or_ductless','ductless_mini_split'),mini(),mini(true),hp(),ac()],seen=new Set(),nodes=new Set(),results=new Set();
function key(s){return JSON.stringify([s.node,s.result,s.product,s.msMode,s.msLanding,s.msMultiZone,s.msSingleZone,s.remoteCodeStepDone,s.reset_count,s.sdFrom,s.sdMode,s.sdSideConfirmed,!!s.notices?.ms,s.coldGuardAck,s.warrantyAck,s.heatingHazardReported]);}
while(queue.length){const a=queue.shift(),k=key(a);if(seen.has(k))continue;seen.add(k);A.ok(seen.size<60000,'bounded expanded walk');if(a.result){results.add(a.result);A.ok(!F.results[a.result].continueTo);A.notEqual(F.results[a.result].diyTier,'advanced');A.match(F.summary(a),/TEST SCENARIO/);const t=copy(a);F.stop(t);act(t,'hazard_gas_co');A.equal(t.result,'gas');continue;}
 if(!/^(ms|sd)\./.test(a.node))continue;nodes.add(a.node);const v=F.viewNode(a.node,a);A.ok(v.title);if(v.noticePrompt){const t=copy(a);F.acknowledgeStep(t);queue.push(t);}
 for(const o of v.options){const t=copy(a);if(o.disabled){const saved=JSON.stringify(t);A.throws(()=>F.answer(t,o.id,meta));A.equal(JSON.stringify(t),saved);continue;}act(t,o.id);queue.push(t);}
}
for(const id of Object.keys(H.nodes).filter(id=>/^(ms|sd)\./.test(id)))A.ok(nodes.has(id),'reachable '+id);
for(const [id,n] of Object.entries(H.nodes).filter(([id])=>/^(ms|sd)\./.test(id))){const visible=JSON.stringify([n.title,n.body,n.caution,n.step,n.options.map(o=>[o.label,o.hint,o.fact])]);A.ok(!/\b(safe|safely|safer|safest)\b|PENDING LEGAL|MSU-L|LK-\d/.test(visible),'copy '+id);}
console.log('Expanded lanes passed: '+seen.size+' states, '+nodes.size+' questions, '+results.size+' results.');
