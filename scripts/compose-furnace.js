'use strict';
// Reconcile the handed-off Wave 2 draft. Raw drafts never become runtime copy.
module.exports = function buildFurnace(base, draft, CO) {
  const nodes = base.nodes, results = base.results;
  const hazard = {id:'hazard_now',label:'New hazard: gas or burning smell, CO or refrigerant leak alarm, smoke, sparks, or water near electrical parts',next:'fn.gate.combustion_co',fact:'New furnace or air-handler hazard reported.'};
  const op = (id,label,next,fact='') => ({id,label,next,fact,hint:''});
  const n = (id,title,body,options,extra={}) => nodes[id] = Object.assign({section:'Furnace and air handler',title,body,options:options.concat({...hazard}),diyTier:'basic',safetyGate:false,owner:'fn'},extra);
  const draftNode = id => draft.nodes.find(x=>x.id===id);
  // Preserve existing choices explicitly; placeholders are never user-facing.
  for (const d of draft.nodes) {
    if (/</.test(d.id) || d.id==='fn.code.brand_picker') continue;
    const old = nodes[d.id] || {};
    const options=[];
    for(const c of d.choices){
      if(c[0]==='(existing 8 choices)') {options.push(...old.options.filter(x=>x.id!=='hazard_now'));continue;}
      const original=(old.options||[]).find(x=>x.id===c[0])||{};
      if(c[0]==='hazard_now') continue;
      options.push(op(c[0],/unchanged/.test(c[1])?original.label:c[1],/unchanged/.test(c[2])?original.next:c[2],/unchanged/.test(c[4])?original.fact:c[4]));
    }
    n(d.id,/unchanged/.test(d.title)?old.title:d.title,/unchanged/.test(d.body)?old.body:d.body,options,{step:d.step,notice:d.notice});
  }
  for(const r of draft.results) {
    if(r.outcome==='handoff') continue;
    results[r.id]={tier:r.badge,title:r.title,explanation:r.exp,actions:r.act,avoid:r.avoid,reason:r.gate||r.id,outcome:r.outcome==='basic_success'?'next_step':r.outcome==='insufficient_info'?'insufficient_info':'call_pro',diyTier:r.outcome==='basic_success'?'basic':'pro_only',urgency:r.badge==='Stop / professional'?'Stop this check':'',owner:'fn'};
  }
  const get=(id,choice)=>nodes[id].options.find(x=>x.id===choice);
  const set=(id,choice,next,flags)=>Object.assign(get(id,choice),{next},flags?{set:flags}:{});
  const concl='fn.conclude.call_pro';
  const skipped={codeUnseen:'fn.code.window_look',default:concl};
  const intake='fn.intake.system_confirm';
  nodes['fn.tstat.mode_setpoint'].options.unshift(op('cold_risk','The house is getting cold, and someone is at risk','@fn_cold_exposure','Cold exposure reported before waiting for thermostat heat.'));
  set(intake,'gas_furnace','fn.intake.gas_supply',{fnFuel:'gas'});
  set(intake,'oil_furnace','fn.intake.home_type',{fnFuel:'oil'});
  set(intake,'electric_furnace','fn.intake.home_type',{fnFuel:'electric'});
  set(intake,'air_handler_hot_water','fn.ah.water_source',{fnFuel:'hydronic'});
  set(intake,'mini_split','ms.intake.system_confirm');
  for(const c of ['natural_gas','propane','not_sure']) set('fn.intake.gas_supply',c,'fn.intake.home_type',{fnGas:c});
  for(const c of ['site_built','manufactured_home','not_sure']) set('fn.intake.home_type',c,'fn.landing.picker',{fnHome:c});
  set('fn.landing.picker','landing_one_area_cold',{manufactured:'fn.mh.closet_return',default:'fn.airflow.returns'});
  set('fn.landing.picker','landing_fuel_low',{oil:'fn.fuel.oil_tank',propane:'fn.fuel.propane_gauge',default:concl});
  get('fn.landing.picker','landing_fuel_low').requires='fuelTank';
  set('fn.code.window_look','cant_see',concl);
  // A brand name does not identify a control board. Read the exact equipment
  // manual's interpretation instead of exposing unverified brand-wide tables.
  n('fn.code.brand_picker','What does the matching code chart say?', 'Use only the chart for the exact model and control in your owner’s manual, or a label already visible with every equipment cover closed. Record the full code first. A code identifies a condition to investigate, not a failed part. If the chart is behind a panel, leave it there.',[
    op('rollout','Rollout, flame out of sequence, or flame without a heat call','@fn_code_rollout_stop','Homeowner reports a flame-related warning in the matching manual.'),
    op('limit_unsure','Limit or rollout — the chart lists both','@fn_code_rollout_stop','Code may include rollout; cause unconfirmed.'),
    op('airflow','Airflow or high limit only','fn.airflow.filter_fit','Matching manual reportedly lists airflow or high limit, not rollout.'),
    op('vent','Vent, pressure switch, or condensate fault','fn.vent.outdoor_gate','Matching manual reportedly lists vent, pressure-switch, or condensate condition.'),
    op('oil_lockout','Oil burner lockout','@fn_oil_lockout_pro','Oil burner lockout reported.'),
    op('normal','Idle or normal operation','fn.tstat.mode_setpoint','Matching manual reportedly lists idle or normal; heating performance unconfirmed.'),
    op('other_or_cant_tell','Another message, no matching chart, or not sure','@fn_code_unlisted','Code meaning unconfirmed.')]);
  nodes['fn.code.window_look'].step.steps=['Look through an existing window or at an already-visible display without opening a cover.','Watch a complete repeating pattern. Record its colors, long and short flashes, or displayed characters. A phone video may help.'];
  nodes['fn.code.window_look'].step.watch='Do not delay an urgent heating-service call to collect a code.';
  nodes['fn.code.window_look'].step.source='Carrier 58-3T, service information label; checked October 12, 2026. Codes differ by model and control.';
  const vent=nodes['fn.vent.outdoor_gate'];
  vent.body='First check whether you can reach the exterior vent area from dry, level ground. Do not climb, enter deep snow, or go out in hazardous weather.';
  get('fn.vent.outdoor_gate','none_of_these').label='None of these. I can reach the vent area from dry, level ground';
  set('fn.vent.outdoor_gate','metal_chimney',concl,{fnReason:'vent_not_pvc'});
  const exterior=nodes['fn.vent.exterior_visual'];
  exterior.body='Some furnaces use plastic intake or exhaust pipes through an outside wall. There may be one or more pipes. Use the location shown in your owner’s manual; do not assume every nearby pipe belongs to this furnace.';
  exterior.step={what:'Removing loose snow around an exterior termination clears an obstruction.',caution:'Exhaust may be hot. A damaged or displaced pipe can let exhaust enter the home.',source:'Enbridge Gas, Keep your meter clear; checked October 12, 2026. Brief thermostat-Off and restart limits are Second Wrench policy.',steps:['Only if the house can tolerate a brief pause in heat, set the thermostat to Off and record its previous settings. Otherwise, call for service.','From dry, level ground, use a soft broom to gently move loose snow around the outside of the termination. Keep clear of the opening and hot exhaust.','Do not push fingers, tools, or the broom into a pipe. Do not chip or melt ice, move a pipe, or touch a gas meter or regulator.','If pipes are intact, free of ice and obstruction, and no hazard has appeared, restore only the thermostat settings you recorded. Otherwise leave the heat request Off and call a professional.'],watch:'If heat does not return promptly, call for service. Do not wait through an unknown lockout or cycle power.',stop:'For a gas smell or CO alarm, leave immediately and call from outside; do not operate switches. For damaged pipes or ice that remains, stop and call a professional.'};
  get('fn.vent.exterior_visual','blocked_cleared').fact='User reports clearing loose snow outside the termination; no pipe entry or reset reported.';
  set('fn.vent.exterior_visual','pipes_clear','fn.condensate.visual');
  set('fn.vent.exterior_visual','cant_reach',concl,{fnReason:'vent_check_inaccessible'});
  nodes['fn.vent.after_clear'].body='Do not reset or power-cycle the furnace. If useful heat has not returned, arrange service now; do not wait through an unknown lockout. Get anyone vulnerable to cold somewhere warm first.';
  nodes['fn.vent.after_clear'].title='Did useful heat return after clearing the snow?';
  get('fn.vent.after_clear','still_no_heat').label='Useful heat has not returned';
  const after=nodes['fn.vent.after_clear'].options; after.unshift(after.splice(after.findIndex(x=>x.id==='getting_too_cold'),1)[0]);
  set('fn.vent.after_clear','same_code_again',concl,{fnReason:'vent_cleared_code_repeats'});set('fn.vent.after_clear','still_no_heat',concl,{fnReason:'vent_cleared_still_no_heat'});
  const drain=nodes['fn.condensate.visual'];
  drain.body='From dry ground, look at the drain tubing and pump outside the furnace. A frozen, kinked, cracked, or overflowing drain can accompany a shutdown. Do not move tubing, pull a hose, open a pump, or try to thaw it.';
  drain.step=null;drain.notice='look';
  Object.assign(get('fn.condensate.visual','kinked_straightened'),{id:'kinked',label:'A tube looks kinked, sagging, or damaged',fact:'Drain tubing appears kinked, sagging, or damaged; not moved.',next:concl});
  for(const c of ['water_on_floor','looks_normal','cant_see']) set('fn.condensate.visual',c,concl,{fnReason:'condensate_drain_issue'});
  drain.options.unshift(op('water_near_wires','Water near electrical parts, or not sure','@fn_water_electrical'));
  for(const c of ['both_on','cant_find']) set('fn.power.switch_breaker_visual',c,skipped);
  get('fn.power.switch_breaker_visual','cant_find').label='I can’t identify them or reach them from dry ground';
  nodes['fn.power.switch_breaker_visual'].body='Look only at a clearly identified external furnace switch or closed breaker panel from dry ground. Off is not proof of a trip. Do not remove covers or operate any breaker. Leave a switch off unless you personally know it was turned off by mistake.';
  set('fn.power.switch_intentional','by_mistake',{oil:'@fn_switch_off_on_purpose',default:'fn.power.switch_on_step'});
  nodes['fn.power.switch_on_step'].body='Only a clearly identified external switch that you know was turned off by accident can use this step. This is not a way to clear a fault, restart an oil burner, or reset a breaker.';
  nodes['fn.power.switch_on_step'].step={what:'Restoring a mistakenly switched-off external furnace switch supplies power again.',caution:'Equipment can start when power returns. A shutdown for a fault or repair must not be overridden.',source:'Trane, Furnace Not Igniting?; checked October 12, 2026. Single-attempt limit and exclusions are Second Wrench policy.',steps:['Write down the thermostat settings and set the thermostat to Off.','Operate only the clearly identified external furnace switch once, to On. Keep every equipment and electrical-panel cover closed.','If no hazard appears, restore the thermostat settings you recorded and step away.'],watch:'If useful heat does not return promptly, call for service. Do not keep trying.',stop:'For gas smell, a CO alarm, smoke, or a bang, leave and call from outside. Do not operate another switch on the way out. If the breaker trips or the equipment stops again, leave it stopped and call a professional.'};
  set('fn.power.switch_on_step','no_heat','fn.code.window_look');
  nodes['fn.fuel.propane_gauge'].step.steps=['Read only a gauge already visible from ground level, or under the tank’s owner-access weather dome if your supplier’s instructions identify it. Do not remove another cover.','Do not touch a valve, regulator, fitting, or connection. Record the reading without treating it as proof that fuel reaches the furnace.','Close a weather dome you opened.'];
  nodes['fn.fuel.propane_gauge'].step.stop='If you smell gas or hear unexplained hissing, leave and call your supplier or 911 from outside.';
  for(const c of ['ok','cant_read'])set('fn.fuel.propane_gauge',c,skipped);
  get('fn.fuel.propane_gauge','ok').fact='Propane gauge reported above empty; delivery to furnace unconfirmed.';
  set('fn.fuel.oil_tank','some_oil','fn.code.window_look');
  const filter=nodes['fn.airflow.filter_fit'];
  filter.body='Use only an external owner-accessible filter slot or return grille identified in your manual. A tool-free furnace door is still an equipment compartment and stays closed. Filter size, quantity, and placement vary by equipment.';
  filter.step={what:'A properly fitted owner-replaceable filter allows air through its intended path.',caution:'The wrong size, quantity, or restriction can reduce airflow. Running without required filters allows dirt into equipment.',source:'Carrier 58-3T maintenance instructions; First Co HBXBX-HW specification (the 60 model uses two filters); checked October 12, 2026.',steps:['Record the thermostat settings, set the thermostat to Off, and wait for the blower to stop. This does not disconnect electricity; keep equipment compartments closed.','If the exact owner’s manual identifies an external, tool-free filter access, compare the filter size, quantity, and airflow direction with that manual. Otherwise stop.','Replace a dirty disposable filter only with the specified type and size. Do not stack extra filters, wash a disposable filter, or run without the required filters.','Close the filter access and leave the thermostat Off until the following restart check.'],watch:'Observe one heating cycle only if the home has enough heat and no one is at risk. If heat stays weak or the unit shuts off again, call for service.',stop:'Stop if access exposes wires or an equipment compartment, needs tools, or does not match the manual. For gas or a CO alarm, leave and call from outside.'};
  set('fn.airflow.filter_fit','fixed_fit','fn.airflow.after_filter',{fnFilterUnchanged:false});set('fn.airflow.filter_fit','fits_fine','fn.airflow.after_filter',{fnFilterUnchanged:true});set('fn.airflow.filter_fit','cant_check',concl);
  n('fn.airflow.after_filter','Before restarting the heat request','Keep the required filter installed and its access closed. Do not restart to test a hazard.',[
    op('hazard','Ice, a leak, unusual noise, burning, or another hazard','fn.gate.combustion_co'),
    op('cold','Someone is at risk from the cold','@fn_cold_exposure'),
    op('ready','No hazards; the correct filters and access are in place','fn.airflow.restore_request','Required filters and closed access reported; no warning signs reported before restoring settings.'),
    op('unsure','Not sure',concl)]);
  n('fn.airflow.restore_request','Restore only the recorded settings','With the specified filters in place, their access closed, and no warning signs, restore only the thermostat settings you recorded. Step away and allow at least five minutes for any normal thermostat delay. Do not repeatedly change modes or cycle power. Only wait while the home has enough heat and nobody is at risk.',[
    op('cold','Someone is at risk from the cold','@fn_cold_exposure'),
    op('filter_settings_restored','I restored the recorded settings; no warning signs appeared',{filterUnchanged:'fn.airflow.returns',default:'@fn_filter_fit_basic'},'Homeowner reports restoring the recorded thermostat settings after closing filter access; heating response not yet confirmed.'),
    op('cannot_restore','I cannot restore them or cannot wait',concl)]);
  n('fn.airflow.returns','Look at the air path','Look at the return grilles and supply registers from the room. Do not put fingers or objects through a grille. Keep the original duct layout and equipment covers in place.',[
    op('blocked','Furniture or a rug blocks a grille','fn.mh.closet_return','An obstruction at a room grille reported.'),
    op('one_area','Grilles are clear, but one area stays cold',{manufactured:'fn.mh.crossover_look',default:concl}),
    op('clear','Grilles are clear, but heat is still weak',{electric:'fn.elec.pattern',hydronic:'fn.hydro.air_side',default:concl}),
    op('unsure','Not sure',concl)]);
  const mh=nodes['fn.mh.closet_return'];
  mh.body='Manufactured-home furnaces may use louvers in a closet door or equipment front for return air. Keep equipment doors closed. Do not remove a front cover to reach a filter.';
  mh.step.steps=['Move ordinary furniture, rugs, and stored items that block room grilles or the outside of the louvered closet door, only if you can do so without going near hot equipment or another hazard.','Keep door louvers and existing under-door air gaps unobstructed. Do not cut doors or change ducts.','Use the separate filter check only for an external owner-accessible filter location shown in the manual.'];
  set('fn.mh.closet_return','filter_dirty','fn.airflow.filter_fit');get('fn.mh.closet_return','filter_dirty').label='I need to check the filter';get('fn.mh.closet_return','filter_dirty').fact='Filter check requested; filter condition unconfirmed.';
  set('fn.mh.closet_return','all_clear',{oneArea:'fn.mh.crossover_look',default:'fn.ah.blower_observe'});set('fn.mh.closet_return','cant_check',concl);
  for(const c of ['looks_ok','cant_see','single_wide'])set('fn.mh.crossover_look',c,concl,{fnReason:'mh_weak_heat_after_basics'});
  nodes['fn.mh.crossover_look'].body='In some multi-section homes, a crossover duct carries air between sections. Look only through an existing opening from outside the skirting. Do not remove skirting, enter a crawlspace, reach inside, or go under the home.';
  set('fn.elec.pattern','warm_not_hot',concl,{fnReason:'elec_partial_heat'});set('fn.elec.pattern','never_warm',concl,{fnReason:'electric_furnace_components'});
  nodes['fn.elec.pattern'].body='Some electric heaters stage on gradually. Air that warms after a delay does not by itself prove that every heating stage works. Observe only if the house has enough heat and no one is at risk.';
  nodes['fn.elec.pattern'].options.unshift(op('cold_risk','Someone is at risk from the cold','@fn_cold_exposure'));
  get('fn.elec.pattern','cool_then_warm').label='Air warms and the rooms maintain the requested temperature';
  nodes['fn.ah.blower_observe'].body='Listen from outside the unit and notice airflow near room vents without touching grilles. Weak or missing airflow can have several causes; it does not prove a dirty filter or failed motor.';
  set('fn.ah.blower_observe','runs_weak','fn.airflow.filter_fit');set('fn.ah.blower_observe','never_runs',{electric:'fn.power.switch_breaker_visual',hydronic:concl,default:'fn.code.window_look'});set('fn.ah.blower_observe','heat_pump_outdoor','hp.intake.system_confirm');
  for(const c of ['boiler','water_heater_tank','tankless_or_combi','not_sure'])set('fn.ah.water_source',c,'sw.handoff.hydronic_coil',{fnHydroSource:c});
  const hyd=nodes['fn.hydro.air_side'];
  hyd.body='We have not confirmed hot water circulation through the coil. This check covers only what the air handler does. Different controls delay the blower differently. Do not touch pipes or open the air handler.';
  hyd.step.steps=['If a normal heat call is already active and nobody is at risk from cold, listen from outside the air handler for the blower.','Notice air from a room vent without touching a grille.','Look from dry ground for ice or dripping. Do not test a freezestat or change its setting.'];
  hyd.step.watch='First Co HBXBX-HW lists a 45-second blower-on delay. Other models differ; use your exact manual. Do not wait if the home is too cold.';
  get('fn.hydro.air_side','delay_then_warm').label='Warm air follows the delay and rooms maintain the requested temperature';
  set('fn.hydro.air_side','blower_not_running',concl,{fnReason:'hydro_blower_not_running'});set('fn.hydro.air_side','air_weak','fn.airflow.filter_fit');set('fn.hydro.air_side','ice_or_drip','fn.hydro.leak');
  hyd.options.unshift(op('cold_risk','Someone is at risk from cold','@fn_cold_exposure'));
  hyd.options.splice(-1,0,op('air_cool','Air moves but stays cool','sw.handoff.hydronic_coil.source','Air moves but stays cool; coil-water temperature unconfirmed.'));
  n('fn.hydro.leak','Water or ice at the air handler','Stay back and do not touch water, pipes, or electrical equipment.',[op('near_electrical','Water near electrical parts, or not sure','@fn_water_electrical'),op('away','Water is clearly away from electrical parts','@fn_hydro_coil_freeze_pro')]);
  set('fn.tstat.new_furnace','older_or_ok','ts.gate.safety_stops');
  // Retain uncertainty and avoid ordering restarts after an unresolved fault.
  results.fn_call_pro.explanation='The cause has not been confirmed. Share the observations you actually made, and any checks you could not complete, with a licensed HVAC professional.';
  results.fn_call_pro.actions=['Call a licensed HVAC professional and share the service note below.','Use Stop / get help for a new smell, alarm, smoke, water at electrical parts, or cold exposure.'];
  results.fn_vent_cleared_basic.explanation='You reported clearing snow and heat returning. That observation does not rule out another fault.';
  results.fn_vent_cleared_basic.actions=['Keep the exterior terminations unobstructed.','If heat stops again, call for service; do not reset it.'];
  results.fn_condensate_pump_pro.actions=['Stay away from water and electrical parts.','Call a licensed HVAC professional or plumber about the pump and leak.'];
  delete results.fn_condensate_kink_basic;
  results.fn_code_rollout_stop.title='Stop using the furnace and report the flame-related warning';
  results.fn_code_rollout_stop.explanation='The matching chart you selected includes a flame-related condition. The cause is unconfirmed and needs professional investigation.';
  results.fn_code_flame_no_call_stop.explanation='The code interpretation reported by the homeowner includes flame without a heat call. The cause is unconfirmed.';
  results.fn_code_to_pro.explanation='Record the full displayed code and exact equipment model without opening covers.';
  results.fn_code_to_pro.actions=['Tell the service company the code, model, and what happened.','Do not deliberately clear error history. If a hazard appears, leaving and getting help takes priority over preserving a code.'];
  results.fn_code_unlisted.title='Record the code for your service company';
  results.fn_code_unlisted.explanation='Codes vary by exact model and control board. No meaning has been confirmed for this code.';
  results.fn_code_unlisted.actions=['Photograph an already-visible display or record the light through an existing window.','Send the full code and already-known model to a licensed HVAC professional.'];
  results.fn_breaker_tripped_pro.explanation='A tripped or unexpectedly off furnace breaker needs investigation. The cause is unconfirmed.';
  results.fn_breaker_tripped_pro.tier='Stop / professional';
  results.fn_switch_off_on_purpose.tier='Stop / professional';
  results.fn_switch_on_basic.actions=['Keep the switch identifiable and accessible; do not cover it.','If the furnace stops again, call for service. Do not cycle the switch again.'];
  results.fn_propane_out.explanation='An empty propane tank requires your supplier to check the system before restoring service.';
  results.fn_filter_fit_basic.actions=['You reported restoring the recorded thermostat settings with the required filters installed and access closed. Observe one heating cycle only while the home has enough heat and nobody is at risk.','If useful heat does not return or the furnace shuts off again, call for service. Do not reset it.'];
  results.fn_filter_fit_basic.explanation='You reported correcting the filter fit. Heating response has not yet been confirmed. Follow the exact manual’s filter size, quantity, and direction.';
  results.fn_hydro_fan_delay_normal.actions=['You reported warm air and rooms maintaining temperature after the delay. Continue normal observation.','If heat falls behind, call for service. A fan delay alone does not confirm water circulation or rule out a fault.'];
  results.fn_hydro_coil_freeze_pro.actions=['Call a licensed heating professional urgently. Describe the ice or leak and the location of the air handler.','Do not change freeze-protection controls, close water valves, thaw the coil, or attempt a reset. Ask the professional how to leave this installation while help is coming.'];
  results.fn_ask_installer_card.actions=['Ask the installer to verify thermostat compatibility, configuration, and any active warranty.','For a manufactured home, ask whether the equipment and its pairing are listed for that home. Give them any visible code.'];
  results.fn_meter_iced.actions=['Stay clear of the buried or iced gas meter or propane regulator. Do not brush, chip, heat, or touch it.','Call your gas utility or propane supplier now and describe the snow or ice.','If you smell gas or hear unexplained hissing, get everyone outside and call the utility emergency line or 911 from away from the equipment.'];
  results.fn_out_of_scope_equipment.explanation='This check covers gas, oil, and electric furnaces and hot-water air handlers. Wood, coal, pellet, wall and floor heaters, and rooftop equipment need a professional familiar with that equipment.';
  results.fn_mh_return_cleared_basic.explanation='You reported removing an obstruction from an existing air path. The home type and duct arrangement do not establish whether heat is restored.';
  results.fn_mh_return_cleared_basic.actions=['Keep the existing room grilles, return openings, and any closet-door louvers unobstructed. Keep equipment covers closed.','Follow the equipment manual’s storage and clearance rules.','If useful heat does not return or the equipment shuts off again, call a licensed HVAC professional. Do not reset it.'];
  results.fn_batteries_display_back.actions=['If no warning signs have appeared, restore the normal Heat setting, the recorded heating setpoint, and the recorded fan setting. Do not change a setting you cannot identify.','Allow at least five minutes for a normal thermostat delay, or the longer delay in your exact manual, only while the home has enough heat and nobody is at risk.','If useful heat does not return, arrange service. A restored display does not prove the equipment works.'];
  results.fn_returns_supplies_cleared.actions=['Keep the existing returns and registers clear of furniture, rugs, and curtains.','Observe only while the home has enough heat and nobody is at risk. If rooms remain short on heat, call a licensed HVAC professional.'];
  results.fn_elec_staging_normal.actions=['You reported warm air and rooms maintaining temperature; continue normal observation.','If useful heat falls behind or the equipment shuts off again, call a licensed HVAC professional. Do not reset it.'];
  get(intake,'boiler_radiators').fact='Boiler reported on the furnace screen; continuing with the boiler hazard check.';
  get(intake,'other_fuel').fact='Other heating fuel reported.';
  get('fn.power.switch_on_step','shut_off_again').fact='Equipment stopped again or a breaker tripped after one external-switch restoration.';
  get('fn.fuel.oil_tank','oil_smoke').fact='Oil smell, smoke, or soot reported.';
  get('fn.ah.blower_observe','heat_pump_outdoor').fact='Heat-pump air handler reported; continuing with the heat-pump check.';
  get('fn.ah.water_source','water_heater_tank').fact='Homeowner reports a tank water heater supplies the air-handler coil; circulation unconfirmed.';
  get('fn.ah.water_source','tankless_or_combi').fact='Homeowner reports tankless or combi equipment supplies the air-handler coil; circulation unconfirmed.';
  for(const [id,v] of Object.entries(nodes)) {
    v.owner='fn';v.options=v.options.map(o=>o.id==='hazard_now'?{...hazard}:o);
    if(v.step){v.step.undo='If you’re not sure what you changed, put back what you wrote down. If you can’t, leave it and call a licensed HVAC professional. Don’t guess. For a hazard, follow the emergency instructions instead of going back to equipment.';v.step.locked='Do not change gas valves, burner controls, wiring, blower or heat-stage setup, limits, rollout or pressure switches, freezestats, or stored error history. Do not enter installer passwords or access codes.';}
  }
  for(const r of Object.values(results)){if(!(r.actions||[]).includes(CO))r.actions.push(CO);}
  const serialized=JSON.stringify({nodes,results}).replace(/safely from the ground/g,'from dry, level ground').replace(/safely/g,'without approaching a hazard').replace(/a safe place/g,'outside');
  const compiled=JSON.parse(serialized);
  for(const [id,v] of Object.entries(compiled.nodes))for(const o of v.options)if(typeof o.next==='string'&&(/\(router\)|\(path|\(reason|FN_CODE|unchanged|→/.test(o.next)))throw Error('Unresolved furnace route '+id+'/'+o.id+': '+o.next);
  return compiled;
};
