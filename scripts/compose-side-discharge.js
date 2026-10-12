'use strict';
module.exports=function(draft,CO){
 const nodes={},results={};
 const cold='If the house is getting cold, call a licensed HVAC professional. If it’s dangerously cold and anyone is at risk, get them somewhere warm first.';
 const hazard={id:'hazard_now',label:'New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, refrigerant leak alarm, water at electrical parts, or someone at risk)',hint:'Stop checking. We’ll show you where to get help.',fact:'New hazard reported during the outdoor-unit check.',next:'sd.gate.outdoor_hazard_screen'};
 const router=(bySd,otherwise)=>({bySd,default:otherwise});
 const routes={
 'R-cold':router({'ms:*':'@ms_cold_exposure','hp:*':'@hp_cold_exposure'},'@sd_cold_exposure'),
 'R-after-hazard':router({'hp:*':'sd.intake.cabinet_confirm','none:*':'sd.intake.cabinet_confirm'},'sd.landing.picker'),
 'R-ice-any':router({'ms:cool':'ms.ice.stop_observe','*:heat':'sd.observe.defrost_or_ice','*:unsure':'sd.observe.defrost_or_ice'},'@sd_ice_cool_stop'),
 'R-ice-heat':router({'ms:*':'@ms_ice_heat_keep_running'},'@sd_ice_heat_stop'),
 'R-ice-cool':router({'ms:*':'ms.ice.stop_observe'},'@sd_ice_cool_stop'),
 'R-ice-step':router({'ms:cool':'ms.ice.stop_observe','ms:*':'@ms_ice_heat_keep_running','*:cool':'@sd_ice_cool_stop'},'@sd_ice_heat_stop'),
 'R-defrost-ok':router({'ms:*':'@ms_defrost_normal_basic'},'@sd_defrost_looked_normal'),
 'R-cant-tell':router({'ms:*':'@ms_outdoor_unsure'},'@sd_unsure'),
 'R-not-running':router({'ms:*':'@ms_outdoor_not_running_wave1','hp:*':'@sd_not_running_hp_pro','*:heat':'@sd_not_running_heat_pro','*:unsure':'@sd_not_running_heat_pro'},'@sd_not_running_pro'),
 'R-fan-damage':router({'hp:*':'@sd_fan_damage_hp_pro','*:heat':'@sd_fan_damage_heat_pro','*:unsure':'@sd_fan_damage_heat_pro'},'@sd_fan_damage_pro')};
 const bodies={
 'sd.entry.outdoor':['What was the system supposed to be doing?','Pick the mode you selected or wanted when you noticed the problem.'],
 'sd.heat.cold_home_screen':['Is the house getting too cold?','People come first. A baby, an older adult, or someone with a medical need may need a warmer home. The WHO housing guideline uses 18°C (64°F) as a minimum during cold seasons; reaching that number does not rule out risk.'],
 'sd.gate.outdoor_hazard_screen':['Do you notice any of these hazards?','Answer from a few steps back or a window. Do not touch the unit, its disconnect, or its wiring.'],
 'sd.intake.cabinet_confirm':['Where is the outdoor fan?','Look from a window or dry ground. A side fan blows sideways; a top fan blows upward. Do not approach moving parts to identify it.'],
 'sd.landing.picker':['What did you notice outside?','Use observations from a window or dry, level ground. You can choose not sure without going closer.'],
 'sd.look.discharge_clearance':['Is the space in front of the fan open?','Air blows sideways out of this unit. Walls, fences, decks, and another unit can obstruct or recirculate air. Installation clearances depend on the exact model and arrangement. Compare your paperwork with the exact installation manual; do not move or modify the unit.'],
 'sd.look.intake_clearance':['Look at the back and sides','From a step back, look for crowding, debris on the fins, or a dryer vent or grill aimed at the unit. Do not touch fins, put anything through a grille, or turn the fan by hand, even with the thermostat Off. Stored electrical energy may remain.'],
 'sd.look.snow_height':['Where is the snow around the unit?','Look from a window or cleared, level ground. Do not climb a snowbank or walk on ice. The unit must remain above the expected snow level as its installation manual requires. Raising it, changing its stand, or directing roof runoff is an installer’s job.'],
 'sd.observe.defrost_or_ice':['Does the ice clear during defrost?','A normal defrost usually lasts about 5 to 15 minutes, and some models finish sooner. Ice that is still there after about an hour of running is not normal. Call a licensed HVAC professional.\n\nA pause, stopped outdoor fan, whoosh, and steam may occur during defrost. If you cannot distinguish steam from smoke, or smell burning, treat it as smoke. A solid block of ice, a grille iced shut, or ice that keeps growing is a stop now; do not keep running it to time an hour. Do not chip ice or use water, heat, or tools to speed defrost.'],
 'sd.look.base_ice_drain':['Is meltwater making ice below the unit?','Defrost water can refreeze under the unit or on a path. Stay off icy footing. Drain holes, base-pan heaters, mounting height, and drainage changes are for the installer.'],
 'sd.look.mount_condition':['Does the mounting look damaged?','Look from a few steps back. Do not push, lean on, prop, or try to level the unit. A visible tilt does not show whether the support is sound.'],
 'sd.observe.fan_state':['What does the outdoor fan do?','Observe only from a few steps back. Do not put hands, sticks, or tools through the grille, touch fins, or try to free the fan. It can start without warning.'],
 'sd.read.code_capture':['Record a code already showing','Write down the full code and where it appears, or take a photo. Observe a repeating blink pattern without opening a cover. Use only the thermostat, remote, wall control, app, or an already-visible indoor display. Do not clear code history, enter service menus, or cycle power to erase a code.'],
 'sd.read.code_compare':['What does your exact manual say?','Use the owner’s manual for the exact model and control. Code meanings differ by model. A code describes a detected condition, not a failed part. If you cannot match it, choose not listed. Do not open the outdoor unit, run a self-test, clear history, or reset it.'],
 'sd.gate.intent_screen':['What are you considering doing?','Choose an intended action before touching the equipment. These choices explain when a professional is needed.'],
 'sd.step.clear_outside':['Clear only around the outside','Keep hands and tools outside the grilles and away from the coil and fins. Stop if you cannot keep clear.'],
 'sd.step.clear_snow':['Clear loose snow from the ground around it','Do not clear snow off the coil or fins. Do not remove ice. If the home cannot tolerate a brief pause in heat, call a professional.']};
 for(const [id,d] of Object.entries(draft.nodes)){
  const [title,body]=bodies[id];
  const options=d.options.filter(o=>o.id!=='hazard_now').map(o=>({...o,next:routes[o.next]||o.next}));
  nodes[id]={section:'Side-discharge outdoor unit',title,body,owner:'sd',diyTier:'basic',safetyGate:/gate\.|cold_home|defrost/.test(id),options};
  if(id!=='sd.gate.outdoor_hazard_screen')options.push({...hazard});
 }
 const get=(n,c)=>nodes[n].options.find(x=>x.id===c);
 get('sd.observe.defrost_or_ice','want_keep_running').next=routes['R-ice-heat'];
 get('sd.step.clear_snow','ice_on_coil').next=routes['R-ice-step'];
 get('sd.observe.defrost_or_ice','actually_cooling').set={sdMode:'cool'};
 for(const [id,mode] of [['mode_heat','heat'],['mode_cool','cool'],['mode_unsure','unsure']])get('sd.entry.outdoor',id).set={sdMode:mode};
 const R11='The house is getting cold, and someone at home is at risk from the cold (an infant, an older adult, or someone who is ill or medically fragile)';
 for(const [n,c] of [['sd.heat.cold_home_screen','someone_at_risk'],['sd.gate.outdoor_hazard_screen','cold_exposure'],['sd.step.clear_snow','someone_at_risk_cold']])Object.assign(get(n,c),{label:R11,next:routes['R-cold'],gate:'cold_exposure_911'});
 nodes['sd.heat.cold_home_screen'].options.splice(-1,0,{id:'temperature_unknown',label:'I do not know the indoor temperature',hint:'Arrange help instead of waiting.',next:'@sd_no_heat_urgent_pro',fact:'Indoor temperature unconfirmed.'});
 for(const id of ['sd.look.intake_clearance','sd.look.snow_height','sd.look.base_ice_drain','sd.look.mount_condition'])nodes[id].options.splice(-1,0,{id:'not_sure',label:'I’m not sure',hint:'',fact:'Outdoor observation unconfirmed.',next:'@sd_unsure'});
 get('sd.intake.cabinet_confirm','side_fan_confirmed').set={sdSideConfirmed:true};
 get('sd.read.code_compare','listed_info_only').label='My exact manual says normal operation, defrost, or limited output';
 get('sd.read.code_compare','listed_refrigerant').label='My exact manual says low refrigerant or pressure';
 get('sd.read.code_compare','listed_other').label='My exact manual lists another meaning';
 for(const [id,v] of Object.entries(draft.results)){
  const outcome=v.outcome.includes('EE')?'emergency_exit':v.outcome.includes('NB')?'next_step':v.outcome.includes('II')?'insufficient_info':'call_pro';
  const copy=v.copy.filter(x=>!x.startsWith('REUSED')&&!x.startsWith('PENDING'));
  const title=outcome==='emergency_exit'?'Stop this check and get help.':outcome==='next_step'?'You reported clearing the area.':'Arrange an outdoor-unit check.';
  results[id]={tier:outcome==='emergency_exit'?'Stop / professional':outcome==='next_step'?'Basic homeowner check':'Professional guidance',title,urgency:'',explanation:'These are homeowner-reported observations; the cause has not been confirmed.',actions:copy.length?copy:['Ask the installer to compare the observed clearance, snow height, drainage, or mounting with the exact installation manual.','Describe only what you observed. Do not move, modify, or enter the unit.'],avoid:'Do not touch fins, reach through grilles, open equipment, or clear a stored code.',reason:v.reason,outcome,diyTier:outcome==='next_step'?'basic':'pro_only'};
 }
 for(const [id,r] of Object.entries(results)) {
  const m=draft.results[id].outcome.match(/`([^`]+)`/);if(m)r.gate=m[1];
 }
 results.sd_cold_exposure.tier='Emergency';results.sd_cold_exposure.gate='cold_exposure_911';
 results.sd_ice_heat_stop.actions=['If your thermostat has an Emergency Heat setting, switch to it to keep heat on without the outdoor unit while you wait for a pro. It usually costs more to run.','An automatic AUX indicator is not that setting. If no backup-only mode is available, set the thermostat to Off. Do not keep running an iced outdoor unit for heat.',cold,CO];
 results.sd_no_heat_urgent_pro.actions=[cold,'Call a licensed HVAC professional now and report the indoor temperature or that it is unknown.',CO];
 results.sd_code_recorded_pro.actions=['Share the exact code and where it appears with a licensed HVAC professional. No code meaning or cause has been confirmed here.','Do not clear history or cycle power to erase a code. Leaving a hazard and getting help takes priority over preserving a code.'];
 results.sd_code_info_pro.actions=['You reported a normal-status or limited-output meaning in your manual. That does not confirm the equipment is working.','If the system is not maintaining needed heating or cooling, arrange service.','Do not clear history or cycle power to erase a code.'];
 results.sd_refrigerant_pro.actions=['For steady outdoor hissing, set the thermostat to Off and call a qualified refrigerant technician. Do not touch pipes, valves, or caps.','For an indoor chemical smell or a refrigerant leak alarm, move outside the affected area and use Stop / get help.'];
 results.sd_defrost_looked_normal.actions=['You reported ice clearing and the fan returning. That observation alone does not confirm adequate heating.','If ice remains or grows, the home gets colder, or defrost repeatedly fails to finish, stop the check and arrange service.'];
 results.sd_cleared_basic.actions=['You reported moving items outside the grille and normal fan operation after the change. Heating and cooling performance have not been confirmed.','If performance stays poor or a new noise appears, arrange service. For rubbing or grinding, set the thermostat to Off.'];
 results.sd_snow_cleared_basic.actions=['You reported clearing loose snow from the ground around the unit. Heating performance has not been confirmed.','If ice grows, the unit stays buried, or heat falls behind, arrange service. Do not chip ice or brush the coil or fins.'];
 const locked='Do not remove a cover, open electrical controls, operate a disconnect or fuse, touch a fan, coil, fin, pipe or refrigerant valve, adjust a stand or bracket, or clear code history. Stop at installer passwords or access codes.';
 for(const id of ['sd.step.clear_outside','sd.step.clear_snow']){
  const snow=id.endsWith('clear_snow'),n=nodes[id];n.notice='pn-short';
  n.step={what:snow?'Moves loose ground snow away from the air path.':'Moves ordinary stored items and loose ground debris away from the air path.',caution:'The fan may start automatically. Fins bend easily, and snow or ice can cause a fall.',source:snow?'Carrier IM-38MURA-02, pages 8–9: snow and clearance requirements; checked October 12, 2026. Ground-only clearing limits are Second Wrench policy.':'LG Guide to Error Codes, CH61: clear obstacles around the outdoor unit; checked October 12, 2026. No power-cycle or unit work is included.',steps:[
   'Use only dry or cleared, level ground in daylight. Do not use a ladder, stool, roof, or snowbank.',
   'Record the thermostat settings and set the system to Off for this brief task. This is not electrical isolation. If someone needs uninterrupted heat, leave the task to a professional.',
   snow?'Move only loose snow on the ground around and in front of the unit, using a soft broom away from the unit. Do not brush the coil or fins, touch an electrical box, use a shovel near the unit, or remove ice.':'Move ordinary planters, toys, and loose ground debris away from the unit. Leave plants that need tools, fixed obstacles, anything on the fins, and anything behind a grille to a professional.',
   'Step away from the unit. Restore the recorded thermostat settings only if no hazard, ice on the unit, or abnormal fan noise has appeared. Otherwise leave the request Off and call a professional.'
  ],watch:snow?'Observe from inside for up to 15 minutes, only while the home has enough heat. Steam and a stopped fan may be defrost; uncertainty about smoke means leave and get help.':'Observe from a few steps back for about 10 minutes. If the fan scrapes, rubs, struggles, or makes a new noise, set the thermostat to Off and call a professional.',stop:'Stop for wet or icy electrical equipment, icy footing, ice on the unit, moving equipment, or any need to reach through a grille. Do not go back to equipment during a hazard.',undo:'If you are unsure what you changed, restore only the thermostat settings you recorded when no hazard is present. Otherwise stop and call a professional.',locked};
 }
 get('sd.step.clear_outside','done').label='The area is clear, and the fan runs without new noise or struggle';
 nodes['sd.step.clear_outside'].options.splice(-1,0,{id:'fan_noise_after',label:'After restoring the thermostat, the fan scrapes, rubs, struggles, or makes a new noise',hint:'',fact:'Homeowner reported new fan noise or struggling after clearing.',next:routes['R-fan-damage']});
 // Every detected emergency carries its gate into the audit trail.
 for(const n of Object.values(nodes)) for(const o of n.options) {
  if(typeof o.next==='string'&&o.next.startsWith('@')) {const r=results[o.next.slice(1)];if(r&&r.outcome==='emergency_exit')o.gate=r.gate||r.reason;}
 }
 return {nodes,results};
};
