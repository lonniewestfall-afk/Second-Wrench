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
    const checks={filterUnchanged:s.fnFilterUnchanged,afterHazardNow:b.retriage==='hazard_now',fromWhIndirect:b.entry==='wh_indirect',fromWhCode:b.entry==='wh_code',fromWhHeat:b.entry==='wh_heat',fromFnCoil:b.entry==='fn_coil',fromWhCoilOk:b.entry==='wh_coil_ok',fromBl:s.product==='bl',waterHeaterSource:s.fnHydroSource==='water_heater_tank'||s.fnHydroSource==='tankless_or_combi',sourceKnown:['boiler','water_heater_tank','tankless_or_combi'].includes(s.fnHydroSource),coil:b.coil,steam:b.type==='steam',oil:s.product==='bl'?b.fuel==='oil':s.fnFuel==='oil',propane:s.fnGas==='propane',electric:s.fnFuel==='electric',hydronic:s.fnFuel==='hydronic',manufactured:s.fnHome==='manufactured_home',oneArea:s.fnLanding==='one_area_cold',codeUnseen:!(s.answers||[]).some(a=>a.node==='fn.code.window_look'),fragileNoHeat:b.fragile&&b.cold&&b.mode!=='dhw',resetEligible:b.fuel==='gas'&&b.type!=='steam'&&!(s.reset_count>=1),fuelGas:b.fuel==='gas',highEffGas:b.fuel==='gas'&&(b.type==='he'||b.type==='combi'),landingPressure:b.landing==='landing_pressure',dhw:b.mode==='dhw',viaCode:b.sawCode};
    for(const k of Object.keys(next)){if(k==='default')continue;if(k==='byLanding'&&next[k][b.landing])return choose(next[k][b.landing],s);if(checks[k])return choose(next[k],s);}
    return choose(next.default,s);
  }
  const handoffs={'>bl_to_fn':FN,'>fn_to_bl':BL,'>bl_to_wh':WH,'>coil_to_wh':WH,'>fn_call_pro':'fn.conclude.call_pro'};
  function mapTargets(v){if(typeof v==='string')return v==='bl.gate.carryover'?BL:(handoffs[v]||v);if(v&&typeof v==='object')for(const k of Object.keys(v))v[k]=mapTargets(v[k]);return v;}
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
      if(o.id==='hazard_now'&&id!==BL&&id!=='bl.gate.carryover')s.bl.retriageFrom=id;
      const reason=choose(o.reason,s);if(reason)s.bl.reason=reason;
      if(o.set&&o.set.resetCount)s.reset_count=Math.max(s.reset_count||0,o.set.resetCount);
    }else Object.assign(s,o.set||{});
    if(id==='wh.conclude.call_pro'&&o.id==='diy')s.whWantedRepair=true;
    if(['wh.tankless.reset_once','wh.tankless.reset_rheem','wh.tankless.reset_noritz'].includes(id)&&['done','again'].includes(o.id))s.reset_count=Math.max(s.reset_count||0,1);
    if(id==='fn.airflow.filter_fit'&&['fixed_fit','fits_fine'].includes(o.id))s.fnFilterChecked=true;
    if(id==='fn.landing.picker'&&o.id.startsWith('landing_'))s.fnLanding=o.id.slice(8);
    if(id==='sd.entry.outdoor'&&o.set&&o.set.sdMode){if(s.sdModeHint&&s.sdModeHint!==o.set.sdMode)audit(s,'Mode answers differed between checks.');audit(s,'flag:sd_mode='+s.sdMode);}
    if(o.id==='hazard_now'||(id==='fn.airflow.after_filter'&&o.id==='hazard')){s.heatingHazardReported=true;s.noDiyLock=true; if(o.next==='ac.gate.cluster_entry')s.stopping=true;}
    if(id===FN||id===BL||id==='bl.gate.carryover'||id===WH)audit(s,'notes.gate:'+id+':'+o.id);
    if(o.set&&o.set.whBoilerHandoff){s.bl=s.bl||{};Object.assign(s.bl,{mode:s.whCoil?'heat':'dhw',entry:s.whCoil?'fn_coil':s.whType==='indirect'?'wh_indirect':'wh_heat',hwType:s.whType||s.bl.hwType,type:s.whType==='combi'?'combi':s.bl.type});if(s.whCoil)s.bl.coil=true;}
  }
  function target(s,id,o,fallback){
    let t=owns(id)&&!(id===FN&&s.product==='hp')?choose(o.heatingTarget===undefined?o.next:o.heatingTarget,s):fallback;
    if(t===undefined)t=fallback;
    if(id==='ac.cool.filter.check'&&s.product!=='fn'&&['filter_clean_ok','filter_clean_weak_airflow'].includes(o.id)){s.filterContinueTo=fallback;t='ac.cool.filter.clean_restart';}
    if(id==='ac.cool.filter.restore_request'&&o.id==='filter_settings_restored')t=s.filterContinueTo||'@filter_inaccessible';
    if(t==='bl.gate.carryover')t=BL;
    if(t==='>bl_to_fn'){s.fnHandoff='hydro';s.fnFuel='hydronic';s.bl=s.bl||{};s.bl.mode='heat';t=FN;}
    if(t==='>fn_to_bl'){s.bl=s.bl||{};s.bl.entry='fn_coil';s.bl.coil=true;t=BL;}
    if(t==='>bl_to_wh'||t==='>coil_to_wh'){if(s.product!=='wh')s.whHandoffEntry=true;s.whFrom=s.product;s.whCoil=t==='>coil_to_wh';s.bl=s.bl||{};if(s.whCoil)s.bl.coil=true;if(s.bl.hwType)s.hwType=s.bl.hwType;s.bl.mode=s.whCoil?'heat':'dhw';if(s.whCoil)audit(s,'flag:tankless_lead');t=WH;}
    if(id==='wh.gate.warning_signs'&&o.id==='none_of_these'&&s.whCoil)t='wh.hydro.cold_home';
    if(s.whCoil&&['wh.tank.landing','wh.tankless.landing','wh.hpwh.landing'].includes(t))t='wh.hydro.observations';
    if(t==='>fn_call_pro')t='fn.conclude.call_pro';
    if(id===FN&&o.id==='none_of_these'&&s.fnHandoff==='hydro'){s.fnHandoff=null;t='fn.hydro.air_side';}
    if(id===BL&&o.id==='none_of_these'&&s.bl&&s.bl.retriageFrom){t=s.bl.retriageFrom;s.bl.retriage=null;s.bl.retriageFrom=null;s.heatingHazardReported=false;}
    else if(s.heatingHazardReported&&o.id==='none_of_these'&&[FN,BL,'bl.gate.carryover',WH,'wh.gate.warning_signs'].includes(id))t=s.product==='fn'?'@fn_gate_unsure':s.product==='wh'?'@wh_gate_unsure':'@bl_gate_unsure';
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
    if(id==='fn.hydro.air_side'&&o.id==='air_cool'&&s.heaterOk==='yes'){s.bl=s.bl||{};s.bl.entry='wh_coil_ok';s.bl.coil=true;t=BL;}
    const nextLane=t===FN?'fn':t===BL||t==='bl.gate.carryover'?'bl':t===WH?'wh':t==='ts.gate.safety_stops'?'ts':t==='ms.intake.system_confirm'?'ms':t==='hp.intake.system_confirm'?'hp':null;
    // Dual-fuel heat-pump sessions visit the furnace gate while retaining HP context.
    if(nextLane&&!(t===FN&&s.product==='hp'&&id==='hp.intake.system_confirm')){
      const before=s.product;
      if(before!==nextLane){
        if(nextLane==='bl'&&t===BL)s.blHandoffEntry=true;
        if(before==='wh'&&nextLane==='fn'&&t===FN)s.fnHandoffEntry=true;
        s.product=nextLane;s.treeVersion=lanes[nextLane]||s.treeVersion;audit(s,'handoff:'+before+'_to_'+nextLane);
      }
    }
    if(t==='ms.error.restart_once'&&(s.reset_count||0)>=1)t='@ms_error_code_returned_pro';
    if(['fn.power.switch_on_step','ac.cool.power.seasonal_restore_step'].includes(t)&&(s.reset_count||0)>=1)t=s.product==='fn'?'@fn_breaker_tripped_pro':'@breaker_retrip_pro';
    const homeHeat=!!(s.whCoil||s.whType==='combi'||(s.bl&&s.bl.mode==='heat'));
    if(t==='@wh_too_hot'&&s.whFuel==='gas'&&s.whType==='tank'&&!homeHeat){s.whDialDir='down';t='wh.tank.gas.dial';}
    if(t==='wh.tank.gas.dial'&&(s.whFuel!=='gas'||homeHeat||['tankless','hpwh','combi','indirect'].includes(s.whType)))t='wh.conclude.call_pro';
    if(id==='wh.usage.pattern'&&o.id==='short'&&s.whType==='tankless')t='wh.tankless.flow_check';
    if(id==='wh.water.shutoff'&&o.id==='cannot')t=s.whLeakKind==='relief'?'@wh_relief_valve':s.whLeakKind==='frozen'?'@wh_frozen':'@wh_tank_leak';
    if(['wh.tankless.reset_once','wh.tankless.reset_rheem','wh.tankless.reset_noritz'].includes(t)&&(s.reset_count||0)>=1){s.whReason='tankless_code_repeat';t='wh.conclude.call_pro';}
    if(t==='wh.tankless.reset_noritz'&&!(s.whBrand==='noritz'&&s.whModel==='ncc199'&&String(s.whCode||'').toUpperCase()==='11'))t='wh.conclude.call_pro';
    if((t==='wh.tank.tp_test'||t==='wh.tank.tp_ask')&&(s.whLeakReported||['tankless','combi','indirect'].includes(s.whType)))t='wh.conclude.call_pro';
    if(id==='wh.power.look'&&o.id==='element'&&s.whFuel!=='electric')t='@wh_power_pro';
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
    const hazard=original.options.find(o=>o.id==='hazard_now');
    const whRows=((data.waterHeater&&data.waterHeater.codes)||[]).filter(item=>item.brand===s.whBrand&&(!item.model||item.model===s.whModel)&&!(item.proGuide&&item.brand==='noritz'&&s.whModel!=='gq-c59'));
    if(id==='wh.code.list'){
      const rows=whRows.slice().sort((a,b)=>Number(!!b.proGuide)-Number(!!a.proGuide)||String(a.code).localeCompare(String(b.code)));
      node.options=rows.map(item=>({id:'c_'+item.brand+'_'+String(item.code),label:item.code+' — '+item.meaning,next:'wh.code.detail',hint:'',fact:'Code selected from the maker list.',set:{whCode:item.code,whBrand:item.brand,whModel:item.model||s.whModel||''}}));
      node.options.push({id:'unlisted',label:'My code isn’t in this list',next:'@wh_code_unlisted',hint:'',fact:'The code is not in the maker list loaded for this model.',set:{}});
      node.options.push({id:'back',label:'Choose a different brand',next:'wh.code.brand',hint:'',fact:'Returning to the maker list.',set:{}});
      if(hazard)node.options.push(hazard);
    }
    if(id==='wh.code.detail'){
      const row=whRows.find(item=>String(item.code).toUpperCase()===String(s.whCode||'').toUpperCase());
      const call={id:'call_pro',label:'Call a licensed plumber or water heater professional',next:'@wh_call_pro',hint:'',fact:'A pro is needed for this code.',set:{}};
      const back={id:'back',label:'Back to the code list',next:'wh.code.list',hint:'',fact:'Returning to the code list.',set:{}};
      if(!row){
        node.body='We only list codes from the maker’s own manual. Yours isn’t in our list yet. Tell your pro the exact code.';
        node.step=null;
        node.options=[call,back];
      }else if(row.proGuide){
        node.body=row.meaning+'\n\n'+row.caption+'\n\n'+row.citation;
        node.step=null;
        node.options=[call,back];
      }else{
        node.body=row.meaning+(row.ownerStep?'\n\nOwner step: '+row.ownerStep:'')+'\n\n'+row.citation;
        node.step=null;
        node.options=[];
        if(row.step)node.options.push({id:'owner_step',label:'Show the owner step',next:row.step,hint:'',fact:'Owner step from the maker manual.',set:{whCode:row.code}});
        if(s.whBrand==='rheem')node.options.push({id:'rheem_reset',label:'My manual says one unplug on a cord-and-plug unit',next:'wh.tankless.reset_rheem_ask',hint:'',fact:'Cord-and-plug reset requested from the Rheem manual.',set:{}});
        const scale=['00','LC','1L','88','SS','C1'].includes(String(row.code).toUpperCase());
        if(scale)call.set={whReason:'scale'};
        node.options.push(call,back);
      }
      if(hazard)node.options.push(hazard);
    }
    if(id==='wh.pm.menu'){
      const tank=['tank','hpwh'].includes(s.whType)&&!s.whLeakReported;
      node.options=original.options.filter(opt=>opt.id!=='tp'||tank);
    }
    if(id==='wh.power.look'&&s.whFuel!=='electric')node.options=node.options.filter(opt=>opt.id!=='element');
    if((id==='wh.tank.tp_ask'||id==='wh.tank.tp_test')&&(s.whLeakReported||['tankless','combi','indirect'].includes(s.whType))){
      node.body='This check doesn’t include a relief-valve lever test after a leak, or on a tankless, combi, or indirect heater. Call a licensed plumber or water heater professional.';
      node.step=null;node.noticePrompt=null;node.warrantyPrompt=false;
      node.options=[{id:'call_pro',label:'Call a licensed plumber or water heater professional',next:'wh.conclude.call_pro',hint:'',fact:'Relief lever test is not available on this path.',set:{whReason:'relief_skipped'}}];
      if(hazard)node.options.push(hazard);
    }
    if(id==='wh.hpwh.anode_reset'&&!s.whAnodeServiced){
      node.step=null;
      node.body='Has the anode rod been serviced or replaced since this light came on? Only yes shows the hold step.';
      node.options=[{id:'back',label:'Answer the service question',next:'wh.hpwh.anode_ask',hint:'',fact:'Returning to the anode service question.',set:{}}];
      if(hazard)node.options.push(hazard);
    }
    if(id==='wh.tankless.reset_noritz'&&!(s.whBrand==='noritz'&&s.whModel==='ncc199'&&String(s.whCode||'').toUpperCase()==='11')){
      node.step=null;
      node.body='This restart is only for code 11 on an NCC199CDV. Note the code and call a licensed plumber or water heater professional.';
      node.options=[{id:'call_pro',label:'Call a licensed plumber or water heater professional',next:'@wh_call_pro',hint:'',fact:'Noritz restart is not for this code or model.',set:{}}];
      if(hazard)node.options.push(hazard);
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
    if(s.product==='wh'&&s.whWantedRepair&&s.result==='wh_call_pro'){
      const reason=String(s.whReason||'');
      const line=reason.indexOf('gas')===0?'Gas parts need a gas-qualified pro and leak testing.':reason==='hpwh_sealed_system'?'Refrigerant work requires a certified technician.':reason.indexOf('element')===0?'Elements sit behind covers at 240 volts.':reason==='tank_leak'?'A tank that leaks from its body can’t be patched; the tank has to be replaced. A leak at a fitting or valve may be repairable, but it needs the tank drained and depressurized first.':reason==='tankless_code_repeat'?'A code that comes back after one reset means the heater found a real fault, such as gas supply, flame sensing, venting or a sensor. Finding which needs gas pressure and electrical testing inside the cover.':reason.indexOf('tp')===0?'A valve that sticks or won’t reseat must be replaced, and that means draining the tank and working on a pressure-safety part. It’s a plumber job.':reason==='scale'?'Descaling means isolating the heater’s water valves and pumping cleaner through it; Rinnai and Rheem tell owners to call a pro (Rinnai LC p.67; Rheem 1L p.75).':'';
      if(line)return Object.assign({},r,{explanation:line});
    }
    return r;
  }
  function install(allNodes,allResults){delete allResults.ms_multi_zone_pr2;Object.assign(allNodes,nodes);Object.assign(allResults,results);}
  function reasonSentence(id,mode){
    const table=data.boiler&&data.boiler.reasons||{};
    const entry=table[id];
    if(!entry)return '';
    const row=Array.isArray(entry)?entry:(entry[mode]||entry.heat||entry.default);
    return Array.isArray(row)?(row[0]||''):'';
  }
  return {nodes,results,owns,install,record,target,view,acknowledge,before,entered,present,co:data.co,reasonSentence};
});
