'use strict';
module.exports=function(base,draft,CO){
 const nodes=JSON.parse(JSON.stringify(base.nodes)),results=JSON.parse(JSON.stringify(base.results));
 const cold='If the house is getting cold, call a licensed HVAC professional. If it’s dangerously cold and anyone is at risk, get them somewhere warm first.';
 const backup=cold+' '+CO;
 const undo='If you’re not sure what you changed, put back what you wrote down. If you can’t, leave it and call a licensed HVAC professional. Don’t guess.';
 const policy='Second Wrench doesn’t guide these changes when it’s 40 °F (4 °C) or colder outside, or will be in the next few days. That’s our own cautious cutoff, not a rating for your equipment. If anyone at home is an infant, elderly, or medically fragile, leave these to a professional.';
 const warranty='If your system or this part was installed recently, check with your installer first. Some warranties and installer agreements expect them to make changes. Changing things yourself may affect what they’ll cover.';
 const locked='Don’t change these. They protect your equipment and your safety, and they’re for professionals only: installer or service menus, unit addresses or priority, switches on the unit, electrical or refrigerant parts, stored error codes or history, and any setting behind a panel. If a step would take you to one of these, stop. If a screen asks you to enter a password or access code, stop. That’s for installers.';
 const hazard={...base.nodes['ms.intake.system_confirm'].options.find(o=>o.id==='hazard_now')};
 const risk={id:'cold_exposure_risk',label:'Someone’s at risk from the cold (a baby, an older adult, or a medical need) and there’s no working heat',hint:'Get them warm first.',fact:'Someone at risk from the cold with no working heat.',next:'@ms_cold_exposure',gate:'cold_exposure_911'};
 for(const [id,edges] of Object.entries(draft.edges)){
  const b=base.nodes[id],d=draft.nodes[id],n=nodes[id]=b?JSON.parse(JSON.stringify(b)):{section:d.section,title:d.title,body:d.body,caution:d.caution,diyTier:'basic',safetyGate:d.safetyGate};
  n.owner='ms';
  if(d.title)n.title=d.title;if(d.body)n.body=d.body;if(d.caution&&!/unchanged|exact|LK-/.test(d.caution))n.caution=d.caution;
  if(d.step){n.step=JSON.parse(JSON.stringify(d.step));n.notice=['ms.error.restart_once','ms.zone.mode_conflict','ms.zone.isolate_head'].includes(id)?'pn-full':'pn-short';n.step.undo=undo;n.step.locked=locked;}
  n.options=edges.map(e=>{
   if(e.id==='hazard_now')return {...hazard};
   if(e.id==='cold_exposure_risk')return {...risk};
   const prior=b&&b.options.find(o=>o.id===e.id),copy=d.options[e.id];
   if(!prior&&!copy)throw Error('Missing mini-split option copy '+id+'/'+e.id);
   const o={...(prior||{hint:'',fact:''}),...e};
   for(const key of ['label','hint','fact'])if(copy&&copy[key]&&copy[key]!=='—')o[key]=copy[key];
   if(!e.gate)delete o.gate;
   return o;
  });
 }
 const get=(n,id)=>nodes[n].options.find(o=>o.id===id);
 nodes['ms.intake.system_confirm'].body='A ductless mini-split has a wall-mounted, floor, or ceiling indoor unit with its own remote or wall control, connected to an outdoor unit. This check covers one or more indoor units on one outdoor unit. Answer from what you already know; do not climb or open equipment to identify it.';
 get('ms.intake.system_confirm','ductless_multi_zone').hint='We’ll ask which indoor units have the problem.';
 for(const id of ['ms.controls.mode_setpoint','ms.heat.mode_setpoint'])Object.assign(get(id,'remote_or_unit_not_responding'),{label:'The indoor unit shows no lights, and nothing responds',fact:'Indoor unit showed no lights, and nothing responded.'});
 for(const id of ['ms.controls.after_outage','ms.heat.defrost_indoor','ms.heat.defrost_sanity']){
  const opt=get(id,'cold_exposure_risk');opt.label='The house is getting cold, and someone at home is at risk from the cold (an infant, an older adult, or someone who is ill or medically fragile)';opt.fact='House getting cold, and someone at home at risk from the cold.';
 }
 nodes['ms.heat.defrost_sanity'].body+='\n\nIf ice is thick, growing, or closes the grille, stop now. Do not keep the system running to time an hour.';
 nodes['ms.heat.defrost_sanity'].body+='\n\n'+require('./sd-legal-cleared.json')['055'];
 get('ms.head.filter_path_ok','filter_ok_tool_free_floor').hint='First, make sure it has stopped, with no ice.';
 nodes['ms.head.filter_path_ok'].body=nodes['ms.head.filter_path_ok'].body.replace('4. The manual says to turn the unit off with the remote first.', '4. The exact manual explicitly permits this filter access after remote Off alone. If it requires disconnecting or isolating any electric power supply, unplugging, or you are unsure whether remote Off alone is enough, stop here.');
 get('ms.head.filter_path_ok','manual_says_cut_power').label='My manual requires disconnecting power, unplugging, a breaker or switch, or isolation is unclear';
 get('ms.head.filter_path_ok','filter_ok_tool_free_floor').next='ms.head.pause_guard';
 get('ms.head.filter_path_ok','filter_ok_tool_free_floor').hint='Next: can the home tolerate the entire cleaning and drying time?';
 nodes['ms.head.pause_guard']={section:'Indoor filter',title:'Can you leave this unit Off through cleaning and drying?',body:'Washed filters must dry fully before the unit runs again. This can take much longer than a brief stop. Do not begin if anyone needs uninterrupted heating or cooling, the home is getting too cold or hot, pipes may freeze, or you are unsure how long you can leave it Off. Arrange a professional visit instead.',owner:'ms',diyTier:'basic',safetyGate:true,options:[
  {...risk,label:'The house is getting cold, and someone is at risk',fact:'Cold exposure reported before the filter step.'},
  {id:'heat_illness',label:'Someone is confused, faint, or seriously ill from heat',hint:'Get help first.',fact:'Possible heat illness reported before the filter step.',next:'@heat',gate:'heat_illness'},
  {id:'cannot_pause',label:'Heating or cooling is needed during that time, or I’m not sure',hint:'Leave the filter task for a professional.',fact:'Homeowner cannot confirm the home can tolerate the cleaning and drying period.',next:'@ms_filter_pause_pro'},
  {id:'pause_ok',label:'The home can tolerate the full cleaning and drying time, with nobody and no pipes at risk',hint:'Record the current settings before switching Off.',fact:'Homeowner reports the home can tolerate the full cleaning and drying period with no person or pipe risk.',next:'ms.head.shutdown_thaw_check'},
  {...hazard}
 ]};
 nodes['ms.head.shutdown_thaw_check'].body=nodes['ms.head.shutdown_thaw_check'].body.replace('1. Turn the unit Off with the remote, wall control, or app.', '1. Write down or photograph the current mode, temperature, fan, and timer settings. Then turn the unit Off with the remote, wall control, or app.');
 nodes['ms.head.filter_clean'].body=nodes['ms.head.filter_clean'].body.replace(/1\. Turn the unit Off[^\n]+/,'1. Keep the unit Off with the remote. You checked that it stopped and no ice or water was visible.');
 nodes['ms.head.airflow_result'].body='Before restarting, check from the floor for ice, frost, dripping water, a code, or blinking lights. If any appears, choose that answer and leave the unit Off. Refit the fully dry filters and close their cover first.\n\nOnly with no warning signs, restore the recorded settings in the mode you need. Observe the air from the room for up to 15 minutes, only while everyone has enough heat or cooling. Do not delay help for anyone at risk.';
 nodes['ms.head.airflow_result'].title='Check for warning signs before restarting';
 nodes['ms.heat.force_heat'].options.unshift({...risk,label:'The house is getting cold, and someone is at risk',fact:'Cold exposure reported before waiting for Heat mode.'});
 get('ms.head.airflow_result','air_ok_not_heating').hint='Next: a look at the outdoor unit from a window or dry ground.';
 get('ms.head.water_observe','water_unsure_electrical').hint='Stop here.';
 nodes['ms.error.capture'].caution='Write down or photograph the code first. Don’t reset it here, and don’t clear the code or its history. No covers or meters.';
 get('ms.ice.stop_observe','ice_outdoor_heating_or_unsure').hint='Next steps, including what a normal defrost looks like.';
 nodes['ms.ice.stop_observe'].body=nodes['ms.ice.stop_observe'].body.replace(/^[^\n]+/,'Ice on the indoor unit or its pipes isn’t normal. Running it iced can damage it. A cause has not been confirmed.');
 // Keep a manual-dependent step from implying every system permits it.
 get('ms.zone.which_head','zone_display_conflict').label='An indoor unit shows a code my exact manual calls a mode conflict';
 for(const id of ['ms.zone.mode_conflict','ms.zone.isolate_head','ms.error.restart_once']){
  const n=nodes[id];n.coldGuard=true;n.coldPolicy=policy;n.warranty=id==='ms.error.restart_once';
  n.step.caution+=(id==='ms.error.restart_once'?' While Off, the unit cannot heat or cool.':' In cold weather, set every unit to Heat instead of turning a room Off.')+' '+cold;
  n.step.stop='If a code returns, the unit stops again, water or ice appears, or another room loses needed heat, stop this check and call a professional. Restore only ordinary comfort settings when no hazard is present. Never restart a faulted unit as an undo step.';
 }
 // Importer notes never become instructions.
 const reset=nodes['ms.error.restart_once'];reset.notice='pn-reset';reset.step.steps[4]='Reset once, only once. If it stops or shows the same code again, don’t reset it again. Call a licensed HVAC professional and tell them the code and what you saw.';
 reset.step.undo='Do not restart again to restore a prior setting. Keep the code and call a professional if it stops or the code returns.';
 for(const n of Object.values(nodes))if(n.step){
  n.step.source=n.step.source.replace(/checked Oct 11, 2026\./g,'reference reviewed October 11, 2026.');
  n.step.steps=n.step.steps.map(s=>s.replace(/^pn-v1 §5 verbatim: /,''));
  if(n.notice==='pn-short'&&/Stop and put things back/.test(n.step.stop))n.step.stop='If a hazard, a code, repeated shutdown, or an unexpected change appears, stop and call a professional. Do not restart, open equipment, or keep changing settings to clear a fault.';
 }
 // Remote signal-code matching is a separate one-time action, never a fault reset.
 nodes['ms.controls.remote_app'].step.source='Fujitsu 9/12/15RLS3 operating manual, pages 3 and 5, and Lennox DB68-12580A-00, page 43; checked October 12, 2026. Use the exact remote manual; the one-attempt limit is Second Wrench policy.';
 nodes['ms.controls.remote_app'].step.steps=nodes['ms.controls.remote_app'].step.steps.map(s=>s.replace('Stand within about 25 feet of the indoor unit, in the same room, and point the remote at it.', 'Stand in the same room, within the range in your exact remote manual, and point the remote at the indoor unit.'));
 nodes['ms.controls.remote_app'].step.stop='Stop for damage, a leaking battery, a blank screen after new batteries, or any installer menu, password, or access-code prompt. Call a professional; do not pry a cover or enter setup.';
 for(const [id,d] of Object.entries(draft.results)){results[id]={...d,actions:d.actions.map(a=>a==='$BACKUP'?backup:a)};}
 results.ms_filter_pause_pro={tier:'Professional guidance',urgency:'Arrange a filter-service visit',title:'Postpone filter cleaning until the home can manage without this unit',explanation:'Do not start a cleaning task that may leave needed heating or cooling unavailable while filters dry.',actions:['Leave the required filters and their cover in place. Do not run with filters removed.','Ask a licensed HVAC professional to plan the filter service around the home’s heating or cooling needs.','If the home is becoming too cold or hot, arrange help and get anyone at risk to a place with suitable heating or cooling first.'],avoid:'Do not remove filters before you can leave the unit Off through the full cleaning and drying time.',outcome:'call_pro',reason:'filter_pause_not_available',diyTier:'pro_only'};
 results.ms_cold_weather_stop.explanation=policy;results.ms_ask_installer.explanation=warranty;
 delete results.ms_multi_zone_pr2;
 for(const r of Object.values(results)){r.actions=(r.actions||[]).map(a=>a===CO?backup:a);}
 const ice='Don’t chip or pick at ice, use hot water, a hose, a heat gun, a hair dryer, or salt, or cover the unit.';
 results.ms_ice_heat_keep_running.avoid=ice+' Don’t keep the iced unit running.';
 Object.assign(results.ms_outdoor_freeze_heat_wave1,{tier:'Stop / professional',title:'Stop. Turn it off. Thick ice won’t clear by running it.',urgency:'Hard stop · call a pro',explanation:'Ice that stays or keeps building is not a normal defrost. Running it iced can damage it. Most mini-splits have no separate emergency heat.',actions:[...results.ms_ice_heat_keep_running.actions],avoid:results.ms_ice_heat_keep_running.avoid,outcome:'emergency_exit',reason:'ice_keep_running',gate:'ice_keep_running'});
 results.ms_defrost_normal_basic.avoid=ice;results.ms_ice_unclear_or_heat.avoid=ice+' Don’t open the outdoor unit.';
 const defrost='A normal defrost usually lasts about 5 to 15 minutes, and some models finish sooner. Ice that is still there after about an hour of running is not normal. Call a licensed HVAC professional.';
 results.ms_defrost_normal_basic.explanation='You reported a pause followed by heat returning. Steam, a pause, and a whoosh can match defrost, but do not confirm system performance. '+defrost;
 results.ms_ice_unclear_or_heat.explanation='Light frost while heating can be normal briefly. '+defrost;
 results.ms_ice_unclear_or_heat.actions[0]='For thick or growing ice, turn the unit Off with the remote and call a professional now. Do not keep it running to time an hour.';
 results.ms_ice_unclear_or_heat.actions[1]='If you cannot tell whether it is ice, describe the observation from a window or dry ground to a professional.';
 results.ms_landing_not_in_pr1.title='Something this check doesn’t cover.';results.ms_landing_not_in_pr1.explanation='This check covers heating, cooling, sounds, smells, water, codes, remote controls, and outdoor observations.';
 results.ms_advanced_off.urgency='Arrange HVAC service';results.ms_advanced_off.explanation='These jobs need a licensed HVAC professional.';
 // A result records what the owner reported, not a diagnosis or an inspection.
 results.ms_zone_mode_match_basic.title='You reported improvement after matching the modes.';
 results.ms_after_outage_normal_basic.title='You reported that it started after the wait.';
 results.ms_feature_fixed_basic.title='You reported improvement after a setting change.';
 results.ms_louver_sweat_basic.title='The louver may be collecting condensation.';
 results.ms_condensate_outside_normal_basic.title='That can match normal condensate drainage.';
 results.ms_app_support_info.title='Use the working remote while checking the app.';
 results.ms_restart_cleared_basic.explanation='You reported that the unit is running and the code cleared. The cause of the code has not been confirmed.';
 results.ms_remote_fixed_basic.explanation='The remote or app is responding again based on your answer. Which change helped has not been confirmed.';
 results.ms_error_code_returned_pro.explanation='Repeated shutdown or a returning code needs professional investigation. A restart does not establish the cause.';
 results.ms_filter_inaccessible.explanation='Let a professional handle filters that are out of reach from the floor, need tools or force, or require any power disconnection, unplugging, or electrical isolation in the manual.';
 results.ms_code_status_basic.actions=['Record the exact status and its meaning in your matching manual. A status message does not establish normal heating or cooling.','A filter reminder does not authorize opening the unit from this result. Use the separate filter check with its manual, access, power-isolation, and heating-or-cooling pause questions, or ask a professional.','For a timer, use only ordinary remote instructions in the exact owner’s manual. Do not clear a stored fault or enter a service menu.','If the equipment is not providing needed heating or cooling, arrange service.'];
 results.ms_sound_pro.actions[0]='For a steady outdoor hiss, turn the unit Off with the remote and call a professional. For an indoor chemical smell, steady indoor hiss, or a leak alarm, leave the affected area and use Stop / get help.';
 for(const id of ['ms_filter_drying_basic','ms_filter_replace_basic'])results[id].actions.unshift('Before restarting, fully dry and refit the specified filters and close the cover. For ice, water, a code, or another hazard, leave it Off and use Stop / get help.');
 results.ms_smell_room_odor_basic.actions=['Ventilate the room if outdoor conditions permit and there is no suspected gas or refrigerant release.','For filter cleaning, start a new check and follow the owner-access gates. Do not open equipment from this result.','If the smell persists, worsens, or cannot be identified, arrange service. Do not wait a week if someone feels unwell.'];
 results.ms_musty_dryout_basic.actions=['Refit only fully dry filters and close their cover before operation. Do not run with filters removed.','Only if the exact owner’s manual permits Fan or a remote self-dry function, no hazard or code is present, and nobody needs heating or cooling, follow those owner instructions. Do not select a freeze-cleaning function.','For persistent odor or visible growth, arrange professional cleaning. Do not spray or brush inside the unit.'];
 results.ms_zone_unsure.actions=['Do not guess at controls or switch off rooms to test them.','Call a professional with the modes and displays you could read.'];
 // Source correction: Lennox p.44 does not authorize the draft's restart.
 // Keep reporting and escalation, with no generic reset sequence in this build.
 reset.title='Check the exact restart instruction with your installer';
 reset.body='The code and its meaning must match the exact model. This guide has not verified a remote restart for your model. Keep the code and manual page, and ask your installer or a licensed HVAC professional. Do not restart it from a generic sequence.';
 delete reset.step;delete reset.notice;delete reset.coldGuard;delete reset.warranty;
 reset.options=reset.options.filter(o=>['cold_exposure_risk','restart_already_done','restart_needs_more','warranty_ask_installer','hazard_now'].includes(o.id));
 // No broad code interpretation or unverified examples in the note.
 nodes['ms.error.manual_lookup'].step.what='Compare an already-visible code with the exact owner’s manual and record its meaning for a professional.';
 nodes['ms.error.manual_lookup'].step.stop='Stop if the manual requires an installer menu, equipment access, a reset, or electrical or refrigerant work. Keep the code and call a professional.';
 for(const id of ['ms.zone.isolate_head','ms.zone.mode_conflict'])nodes[id].step.source='Senville mode-conflict guidance and Pioneer Quantum Ultra PA guidance; checked October 12, 2026. The ten-minute observation period is Second Wrench policy.';
 nodes['ms.heat.defrost_indoor'].body=nodes['ms.heat.defrost_indoor'].body.replace(/From Fujitsu[^]*$/, 'Lennox DB68-12580A-00, page 28, describes a 3–5 minute warm-up fan delay and defrost lasting 5–12 minutes for that model; checked October 12, 2026. Other models differ.');
 const somethingElse=nodes['ms.landing.picker'].options.find(o=>o.id==='landing_something_else');
 if(somethingElse){somethingElse.next='ms.landing.noise_or_smell';somethingElse.hint='A noise or a smell has its own short check.';somethingElse.label='Something else (a noise or a smell)';}
 nodes['ms.landing.noise_or_smell']={section:'What you noticed',title:'Is it a noise or a smell?',body:'Pick the closer match. If you notice both, start with the smell. If anything is burning, smoking, or alarming, use the hazard choice.',owner:'ms',diyTier:'basic',safetyGate:true,caution:'',options:[
  {id:'noise',label:'A noise',hint:'Next: what the sound is like.',fact:'Complaint: a noise from the mini-split.',next:'ms.sound.observe'},
  {id:'smell',label:'A smell',hint:'Next: what the smell is like.',fact:'Complaint: a smell from the mini-split.',next:'ms.smell.observe'},
  {...hazard}
 ]};
 if(results.ms_ice_cooling_wave1)results.ms_ice_cooling_wave1.avoid='Don’t chip or pick at the ice, or use a hair dryer, heat gun, hot water, a hose, or salt, or cover the unit. Don’t restart cooling while any ice remains.';
 if(results.ms_ice_keep_running)results.ms_ice_keep_running.avoid='Don’t chip or pick at the ice, use a hair dryer, heat gun, hot water, a hose, or salt, cover the unit, or keep restarting it.';
 return {nodes,results,backup,policy};
};
