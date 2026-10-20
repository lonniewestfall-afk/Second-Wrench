/* Reviewed deterministic heating lane adapter. No AI calls. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./heating-data.json'));else root.SW_HEATING=factory(root.SW_HEATING_DATA);})(typeof globalThis!=='undefined'?globalThis:this,function(data){
  'use strict';
  if(!data)throw Error('Heating data failed to load');
  const nodes=Object.assign({},data.boiler.nodes,data.furnace.nodes,data.waterHeater.nodes,data.basic.nodes,data.wshp.nodes,data.sideDischarge.nodes,data.miniSplit.nodes), results=Object.assign({},data.boiler.results,data.furnace.results,data.waterHeater.results,data.wshp.results,data.sideDischarge.results,data.miniSplit.results);
  const FN='fn.gate.combustion_co', BL='bl.gate.safety', WH='wh.gate.safety';
  const lanes={fn:'fn.furnace.v3',bl:'bl.boiler.v1',wh:'wh.water_heater.v1'};
  const text='These steps are optional. You can stop and call a licensed HVAC professional at any time.\nWrite down or photograph how things are set now. You’ll need it to put things back.\nDo only the step shown, the way it’s shown. Don’t open panels, use tools on the equipment, or change anything else, even if it’s on the same screen or nearby.\nIf anything looks different from these steps, stop. Your equipment may not match what we describe. Check your owner’s manual.\nIf you smell gas or burning, hear a CO alarm, see smoke, or see water near wires, stop now and use the emergency steps.\nThese steps come from the equipment maker’s documents and common trade practice. They’re general information, not a diagnosis or an inspection of your system.';
  const ackLabel='I wrote down or photographed the current settings, I’ll do only the step shown, and I’ll stop if anything looks different or unsafe.';
  function audit(s,event){(s.audit||(s.audit=[])).push({event,at:new Date().toISOString(),tree:s.treeVersion});}
  function choose(next,s){
    if(!next||typeof next!=='object')return next;
    if(next.bySd&&s.product==='sd'){const from=s.sdFrom||'none',mode=s.sdMode||'unsure';for(const k of [from+':'+mode,from+':*','*:'+mode])if(next.bySd[k])return choose(next.bySd[k],s);}
    const b=s.bl||{};
    const checks={filterUnchanged:s.fnFilterUnchanged,afterHazardNow:b.retriage==='hazard_now',fromWhIndirect:b.entry==='wh_indirect',fromWhCode:b.entry==='wh_code',fromWhHeat:b.entry==='wh_heat',fromFnCoil:b.entry==='fn_coil',fromBl:s.product==='bl',waterHeaterSource:s.fnHydroSource==='water_heater_tank'||s.fnHydroSource==='tankless_or_combi',sourceKnown:['boiler','water_heater_tank','tankless_or_combi'].includes(s.fnHydroSource),coil:b.coil,steam:b.type==='steam',oil:s.product==='bl'?b.fuel==='oil':s.fnFuel==='oil',propane:s.fnGas==='propane',electric:s.fnFuel==='electric',hydronic:s.fnFuel==='hydronic',manufactured:s.fnHome==='manufactured_home',oneArea:s.fnLanding==='one_area_cold',codeUnseen:!(s.answers||[]).some(a=>a.node==='fn.code.window_look'),fragileNoHeat:b.fragile&&b.cold&&b.mode!=='dhw',resetEligible:b.fuel==='gas'&&b.type!=='steam'&&!(s.reset_count>=1),fuelGas:b.fuel==='gas',highEffGas:b.fuel==='gas'&&(b.type==='he'||b.type==='combi'),landingPressure:b.landing==='landing_pressure',dhw:b.mode==='dhw',viaCode:b.sawCode};
    for(const k of Object.keys(next)){if(k==='default')continue;if(k==='byLanding'&&next[k][b.landing])return choose(next[k][b.landing],s);if(checks[k])return choose(next[k],s);}
    return choose(next.default,s);
  }
  const handoffs={'>bl_to_fn':FN,'>fn_to_bl':'bl.gate.carryover','>bl_to_wh':WH,'>coil_to_wh':WH,'>fn_call_pro':'fn.conclude.call_pro'};
  function mapTargets(v){if(typeof v==='string')return handoffs[v]||v;if(v&&typeof v==='object')for(const k of Object.keys(v))v[k]=mapTargets(v[k]);return v;}
  for(const node of Object.values(nodes))for(const o of node.options){o.heatingTarget=o.next; o.next=mapTargets(JSON.parse(JSON.stringify(o.next)));}
  function owns(id){return !!nodes[id];}
  function record(s,id,o){
    if(!owns(id))return;
    if(id.startsWith('ms.')){
      if(id==='ms.intake.system_confirm'){s.msSingleZone=o.id==='ductless_single_zone';s.msMultiZone=o.id==='ductless_multi_zone';}
      if(o.id==='restart_already_done')s.reset_count=Math.max(s.reset_count||0,1);
      if(id==='ms.zone.which_head')s.msZone=({water_or_ice_at_a_unit:'water',one_unit_problem:'one',several_units_problem:'several',zone_display_conflict:'conflict',all_units_problem:'all',not_sure_which:'unsure'})[o.id];
      if(id==='ms.controls.remote_app'&&o.id!=='hazard_now'){s.remoteCodeStepDone=true;audit(s,'ms.remote_code_once');}
      if(id==='ms.landing.picker'&&o.id.startsWith('landing_'))s.msLanding=o.id.slice(8);
      const heat=['landing_no_heat','sound_heat_whoosh_pause','heat_comes_and_goes','outage_lit_not_heating','remote_works_still_not_heating','features_off_still_not_heating','air_ok_not_heating','water_from_outdoor_unit_heat','outdoor_thick_ice_heating','cold_exposure_risk','ctx_mode_heat'];
      const cool=['landing_no_cool','landing_weak_airflow','outage_lit_not_cooling','remote_works_still_not_cooling','features_off_still_not_cooling','air_ok_not_cooling','outdoor_ice_cooling','ice_seen_cooling','drip_normal_cooling','ctx_mode_cool'];
      let mode=heat.includes(o.id)?'heat':cool.includes(o.id)?'cool':o.id==='ctx_mode_unsure'?'unknown':null;
      if(mode){if(s.msMode&&s.msMode!=='unknown'&&s.msMode!==mode)audit(s,'Mode answers differed between checks.');s.msMode=mode;audit(s,'flag:ms_mode='+mode);}
    }
    if(id.startsWith('bl.')||id.startsWith('sw.handoff.')){
      s.bl=s.bl||{};Object.assign(s.bl,o.set||{});
      const reason=choose(o.reason,s);if(reason)s.bl.reason=reason;
      if(o.set&&o.set.resetCount)s.reset_count=Math.max(s.reset_count||0,o.set.resetCount);
    }else Object.assign(s,o.set||{});
    if(id==='fn.airflow.filter_fit'&&['fixed_fit','fits_fine'].includes(o.id))s.fnFilterChecked=true;
    if(id==='fn.landing.picker'&&o.id.startsWith('landing_'))s.fnLanding=o.id.slice(8);
    if(id==='sd.entry.outdoor'&&o.set&&o.set.sdMode){if(s.sdModeHint&&s.sdModeHint!==o.set.sdMode)audit(s,'Mode answers differed between checks.');audit(s,'flag:sd_mode='+s.sdMode);}
    if(o.id==='hazard_now'||(id==='fn.airflow.after_filter'&&o.id==='hazard')){s.heatingHazardReported=true;s.noDiyLock=true; if(o.next==='ac.gate.cluster_entry')s.stopping=true;}
    if(id===FN||id===BL||id==='bl.gate.carryover'||id===WH)audit(s,'notes.gate:'+id+':'+o.id);
    if(o.set&&o.set.whBoilerHandoff){s.bl=s.bl||{};Object.assign(s.bl,{mode:s.whCoil?'heat':'dhw',entry:s.whCoil?'fn_coil':s.whType==='indirect'?'wh_indirect':'wh_heat',type:s.whType==='combi'?'combi':s.bl.type});if(s.whCoil)s.bl.coil=true;}
  }
  function target(s,id,o,fallback){
    let t=owns(id)&&!(id===FN&&s.product==='hp')?choose(o.heatingTarget===undefined?o.next:o.heatingTarget,s):fallback;
    if(t===undefined)t=fallback;
    if(id==='ac.cool.filter.check'&&s.product!=='fn'&&['filter_clean_ok','filter_clean_weak_airflow'].includes(o.id)){s.filterContinueTo=fallback;t='ac.cool.filter.clean_restart';}
    if(id==='ac.cool.filter.restore_request'&&o.id==='filter_settings_restored')t=s.filterContinueTo||'@filter_inaccessible';
    if(t==='>bl_to_fn'){s.fnHandoff='hydro';s.fnFuel='hydronic';t=FN;}
    if(t==='>fn_to_bl'){s.bl=s.bl||{};s.bl.entry='fn_coil';s.bl.coil=true;t='bl.gate.carryover';}
    if(t==='>bl_to_wh'||t==='>coil_to_wh'){s.whFrom=s.product;s.whCoil=t==='>coil_to_wh';if(s.whCoil){s.bl=s.bl||{};s.bl.coil=true;}t=WH;}
    if(id==='wh.gate.warning_signs'&&o.id==='none_of_these'&&s.whCoil)t='wh.hydro.cold_home';
    if(s.whCoil&&['wh.tank.landing','wh.tankless.landing','wh.hpwh.landing'].includes(t))t='wh.hydro.observations';
    if(t==='>fn_call_pro')t='fn.conclude.call_pro';
    if(id===FN&&o.id==='none_of_these'&&s.fnHandoff==='hydro'){s.fnHandoff=null;t='fn.hydro.air_side';}
    if(s.heatingHazardReported&&o.id==='none_of_these'&&[FN,BL,'bl.gate.carryover',WH,'wh.gate.warning_signs'].includes(id))t=s.product==='fn'?'@fn_gate_unsure':s.product==='wh'?'@wh_gate_unsure':'@bl_gate_unsure';
    // Heating-specific ordering: the filter step precedes a report of its result.
    if(s.product==='fn'){
      if(id==='fn.tstat.mode_setpoint'&&o.id==='settings_ok_still_problem'){
        if(s.fnNoHeat==='silent')t='fn.power.switch_breaker_visual';
        else if(s.fnNoHeat==='cold_air')t='fn.noheat.warmup_wait';
        else t=s.fnFuel==='hydronic'?'fn.hydro.air_side':s.fnFuel==='electric'?'fn.elec.pattern':(s.answers||[]).some(a=>a.node==='fn.code.window_look')?'fn.airflow.filter_fit':'fn.code.window_look';
      }
      if(id==='ac.cool.filter.check'&&o.id!=='hazard_now'&&!o.gate)t=s.fnAfterWarmup?'fn.code.window_look':'fn.airflow.filter_fit';
    }
    if(s.product==='fn'&&t==='fn.airflow.filter_fit'&&s.fnFilterChecked){t='fn.conclude.call_pro';s.fnReason='airflow_after_filter';}
    if(t==='sd.entry.outdoor'){
      s.sdFrom=['ms','hp','ac'].includes(s.product)?s.product:'none';
      s.sdModeHint=s.product==='ms'?s.msMode:s.product==='ac'?'cool':undefined;
      s.sdSideConfirmed=s.product==='ac'||s.product==='ms';s.product='sd';s.treeVersion='sd.outdoor.v0';audit(s,'handoff:'+s.sdFrom+'_to_sd');
    }
    if(id.startsWith('sd.')&&s.heatingHazardReported&&o.id==='none_of_these')t='@uncertain';
    if(id.startsWith('sd.')&&(t.startsWith('ms.')||t.startsWith('@ms_'))){s.product='ms';s.msMode=s.sdMode==='unsure'?'unknown':s.sdMode;s.treeVersion='ms.ductless.v2';audit(s,'handoff:sd_to_ms');}
    if(id.startsWith('sd.')&&t==='@hp_cold_exposure'){s.product='hp';s.treeVersion='hp.air_source.v1';audit(s,'handoff:sd_to_hp');}
    const nextLane=t===FN?'fn':t===BL||t==='bl.gate.carryover'?'bl':t===WH?'wh':t==='ts.gate.safety_stops'?'ts':t==='ms.intake.system_confirm'?'ms':t==='hp.intake.system_confirm'?'hp':null;
    // Dual-fuel heat-pump sessions visit the furnace gate while retaining HP context.
    if(nextLane&&!(t===FN&&s.product==='hp'&&id==='hp.intake.system_confirm')){
      const before=s.product;
      if(before!==nextLane){s.product=nextLane;s.treeVersion=lanes[nextLane]||s.treeVersion;audit(s,'handoff:'+before+'_to_'+nextLane);}
    }
    if(t==='ms.error.restart_once'&&(s.reset_count||0)>=1)t='@ms_error_code_returned_pro';
    if(['fn.power.switch_on_step','ac.cool.power.seasonal_restore_step'].includes(t)&&(s.reset_count||0)>=1)t=s.product==='fn'?'@fn_breaker_tripped_pro':'@breaker_retrip_pro';
    return t;
  }
  function needsNotice(node,s){return node&&node.step&&(node.notice==='pn-full'||node.notice==='pn-reset')&&!(s.notices&&s.notices[node.owner]);}
  function view(id,s,original){
    if(!owns(id))return original;
    const node=Object.assign({},original);
    node.options=original.options.filter(o=>(o.requires!=='fuelTank'||s.fnFuel==='oil'||s.fnGas==='propane') && !(s.fnFuel==='electric' && ['landing_after_storm','landing_fuel','landing_fuel_level'].includes(o.id)));
    if (id==='fn.code.brand_picker' && s.fnFuel==='electric') node.options=node.options.filter(o=>['other_or_cant_tell','normal','airflow','hazard_now'].includes(o.id));
    if(id==='ms.error.manual_lookup'&&!s.msMultiZone)node.options=node.options.filter(o=>o.id!=='manual_mode_conflict');
    if(id==='ms.controls.remote_app'&&s.remoteCodeStepDone){node.step=null;node.body='You already did the remote signal-code step once in this check. Don’t repeat it.';node.options=node.options.filter(o=>['remote_still_dead','app_only_problem','hazard_now'].includes(o.id));}
    if(id==='ms.head.airflow_result')node.options=node.options.filter(o=>s.msMode==='heat'?o.id!=='air_ok_not_cooling':s.msMode==='cool'?o.id!=='air_ok_not_heating':true);
    if(typeof node.body==='object')node.body=node.body[(s.bl||{}).mode||'heat']||node.body.heat||'';
    if(id==='fn.tstat.mode_setpoint'&&s.fnNoHeat==='cold_air'){
      const fan=node.options.find(o=>o.id==='fan_on_not_auto');
      if(fan)node.options=[fan].concat(node.options.filter(o=>o.id!=='fan_on_not_auto'));
    }
    if(needsNotice(node,s)){
      node.body='Review this notice before revealing the optional step.';node.step=null;node.noticePrompt=text;node.ackLabel=ackLabel;
      node.options=node.options.map(o=>o.id==='hazard_now'||o.id==='cold_exposure_risk'||/cold_or_fragile|cold_risk/.test(o.id)?o:Object.assign({},o,{disabled:true}));
    }
    if(['pn-reset','pn-full'].includes(original.notice)&&(original.owner!=='ms'||original.warranty)&&!(s.warrantyAck&&s.warrantyAck[id])){
      node.body='If your system or this part was installed recently, check with your installer first. Some warranties and installer agreements expect them to make changes. Changing things yourself may affect what they’ll cover.';
      node.step=null;node.warrantyPrompt=true;
      delete node.noticePrompt;delete node.ackLabel;
      node.options=[{id:'ask_installer',label:'Ask my installer first',next:'@owner_ask_installer'},{id:'warranty_ok',label:'Not under warranty, or my installer said it’s OK',next:id},{id:'warranty_unsure',label:'I’m not sure',next:'@owner_ask_installer'},...node.options.filter(o=>o.id==='hazard_now'||o.id==='cold_exposure_risk'||/cold_or_fragile/.test(o.id))];
    }
    if(original.coldGuard&&!(s.coldGuardAck&&s.coldGuardAck[id])){
      node.body=original.coldPolicy;node.step=null;delete node.noticePrompt;delete node.warrantyPrompt;delete node.ackLabel;
      node.options=original.options.filter(o=>o.id==='hazard_now'||o.id==='cold_exposure_risk'||/cold_or_fragile/.test(o.id)).map(o=>({...o,disabled:false}));
      node.options.splice(-1,0,{id:'cold_guard_ok',label:'None of those conditions applies; the home can tolerate this brief step',hint:'',next:id,fact:'Homeowner reports no cold-weather or vulnerable-occupant restriction for this step.'},{id:'cold_guard_unsure',label:'I’m not sure; stop this step',hint:'',next:'@ms_cold_weather_stop'});
    }
    return node;
  }
  function acknowledge(s){
    const node=nodes[s.node];
    if(!node||!needsNotice(node,s))throw Error('No step notice is pending.');
    if(node.coldGuard&&!(s.coldGuardAck&&s.coldGuardAck[s.node]))throw Error('Cold-weather screen comes first.');
    if(['pn-reset','pn-full'].includes(node.notice)&&(node.owner!=='ms'||node.warranty)&&!(s.warrantyAck&&s.warrantyAck[s.node]))throw Error('Installer question comes first.');
    if(node.notice==='pn-reset'&&(s.reset_count||0)>=1)throw Error('Only one restoration attempt is allowed.');
    (s.notices||(s.notices={}))[node.owner]={notice_ack:true,version:'pn-v1',at:new Date().toISOString()};
    audit(s,'notice_ack:'+node.owner+':pn-v1');
  }
  function before(s,id,o){
    if(o.id==='cold_guard_ok'){(s.coldGuardAck||(s.coldGuardAck={}))[id]=true;audit(s,'cold_guard_ack:'+id);return true;}
    if(o.id==='cold_guard_unsure'){s.result='ms_cold_weather_stop';s.node=null;return true;}
    if(o.id==='warranty_ok'){(s.warrantyAck||(s.warrantyAck={}))[id]=true;audit(s,'warranty_ack:'+id);return true;}
    if(o.id==='ask_installer'||o.id==='warranty_unsure'){s.result=s.product==='fn'?'fn_ask_installer_card':s.product==='ms'?'ms_ask_installer':'owner_ask_installer';s.node=null;return true;}
    return false;
  }
  function entered(s,t){
    const mode=({'ms.controls.mode_setpoint':'cool','ms.heat.mode_setpoint':'heat','ms.heat.force_heat':'heat','ms.heat.defrost_indoor':'heat','ms.heat.defrost_sanity':'heat'})[t];if(mode){s.msMode=mode;audit(s,'flag:ms_mode='+mode);}
    if(nodes[t]&&nodes[t].step&&t==='ms.error.restart_once'&&s.coldGuardAck&&s.coldGuardAck[t]&&s.warrantyAck&&s.warrantyAck[t]&&s.notices&&s.notices.ms&&!s.msRestartReserved){s.reset_count=(s.reset_count||0)+1;s.msRestartReserved=true;audit(s,'reset_attempt_reserved:mini_split_remote');}
    // Reserve a single power-restoration attempt when its instructions become
    // eligible to display; acknowledgement itself never claims work was done.
    if(t==='ac.cool.power.seasonal_restore_step'&&s.warrantyAck&&s.warrantyAck[t]&&s.notices&&s.notices.ac&&!s.seasonalStepReserved){s.reset_count=(s.reset_count||0)+1;s.seasonalStepReserved=true;audit(s,'reset_attempt_reserved:seasonal');}
    if(t==='fn.power.switch_on_step'&&s.warrantyAck&&s.warrantyAck[t]&&s.notices&&s.notices.fn&&!s.switchStepReserved){s.reset_count=(s.reset_count||0)+1;s.switchStepReserved=true;audit(s,'reset_attempt_reserved:external_switch');}
  }
  function present(s,r){
    if(!r)return r;
    if(s.product==='ms'){
      if(r.outcome==='emergency_exit')return r;
      const copy={...r,actions:[...(r.actions||[])]},mode=s.msMode||'unknown';
      if(s.msLanding==='weak_airflow'&&s.result==='ms_settings_fixed_basic')copy.explanation='Airflow is back to normal according to your answer after changing a remote or app setting. The cause has not been independently confirmed.';
      if(s.result==='ms_airflow_unsure')copy.actions[0]=mode==='heat'?'Leave it in Heat, only while the home has enough heat, and observe for up to 15 minutes.':mode==='cool'?'Leave it in Cool, only while everyone has enough cooling, and observe for up to 15 minutes.':'Use the mode you need, only while everyone has enough heating or cooling, and observe for up to 15 minutes.';
      if(s.result==='ms_outdoor_running_call_pro')copy.actions[0]=mode==='heat'?'You can leave it in Heat if useful heat is coming. Otherwise turn it Off with the remote and arrange service.':mode==='cool'?'You can leave it in Cool if useful cooling is coming. Otherwise turn it Off with the remote and arrange service.':'If useful heating or cooling is coming, you can leave it running. Otherwise turn it Off with the remote and arrange service.';
      if(mode==='cool'){copy.actions=copy.actions.filter(a=>a!==data.miniSplit.backup);if(copy.outcome==='call_pro')copy.actions.push('If someone in the home becomes confused, faint, or seriously ill from the heat, call 911.');}
      else if(['call_pro','insufficient_info'].includes(copy.outcome)&&!['ms_use_central_check','ms_equipment_oos','ms_system_unconfirmed'].includes(s.result)&&!copy.actions.includes(data.miniSplit.backup))copy.actions.push(data.miniSplit.backup);
      return copy;
    }
    if(s.result==='bl_call_pro'){
      const why=(s.bl||{}).reason;
      return Object.assign({},r,{reason:why||r.reason,explanation:'The cause has not been confirmed. A licensed heating professional needs to check the equipment and water-side controls.'});
    }
    return r;
  }
  function install(allNodes,allResults){delete allResults.ms_multi_zone_pr2;Object.assign(allNodes,nodes);Object.assign(allResults,results);}
  return {nodes,results,owns,install,record,target,view,acknowledge,before,entered,present,co:data.co};
});
