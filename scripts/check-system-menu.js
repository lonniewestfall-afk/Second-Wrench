'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
global.SW_CONFIG = { advancedRepairsEnabled: false, aiThermostatEnabled: false, mirrorsEnabled: false, stageLatchStepsEnabled: false };
const F = require('../assets/flow');
const meta = { agreed: true, termsVersion: 'test' };
const expected = {
  thermostat_settings: ['ts.gate.safety_stops', 'ts'],
  cooling_only_ac: ['ac.cool.intake.system_confirm', 'ac'],
  heat_pump: ['hp.intake.system_confirm', 'hp'],
  furnace: ['fn.gate.combustion_co', 'fn'],
  ductless_mini_split: ['ms.intake.system_confirm', 'ms'],
  boiler: ['bl.gate.safety', 'bl'],
  water_source_geo: ['wshp.hazard.flood_electrical', 'wshp'],
  water_heater: ['wh.gate.safety', 'wh'],
  not_sure: ['sw.identify.winter_outdoor', 'ask'],
  not_listed: ['@sw_other_not_listed', 'ask']
};
const menu = F.systemMenu();
assert.deepEqual(menu.map(g => g.title), ['Thermostat & controls', 'Heating & cooling', 'Hot water', 'Need help choosing?']);
assert.deepEqual(menu.flatMap(g => g.choices.map(c => c.id)), Object.keys(expected));
function ready() {
  const s=F.create('', 'test');
  F.answer(s,'none_of_these',meta); F.answer(s,'agree_18_terms',meta);
  return s;
}
function rejectsUnchanged(s,id) {
  const before=JSON.stringify(s);
  assert.throws(()=>F.selectSystem(s,id,meta));
  assert.equal(JSON.stringify(s),before,'rejected selection must not advance or alter a session');
}
for(const [id,[node,product]] of Object.entries(expected)) {
  const s=ready(); F.selectSystem(s,id,meta);
  assert.equal(s.result?'@'+s.result:s.node,node,id);
  assert.equal(s.product,product,id);
  assert.ok(!F.summary(s).includes('Something else reported'),id+' records actual equipment only');
  rejectsUnchanged(s,'boiler');
  F.stop(s); assert.equal(s.node,id==='boiler'?'bl.gate.safety':'ac.gate.cluster_entry');
  if(s.node==='ac.gate.cluster_entry')assert.ok(F.viewNode(s.node,s).options.some(o=>o.id==='hazard_hot_water_steam'));
  for(const key of ['consent','safetyCleared']) {
    const blocked=ready(); blocked[key]=false; rejectsUnchanged(blocked,id);
  }
}
rejectsUnchanged(F.create(),'thermostat_settings');
for(const id of ['other_heat_or_ductless','__proto__','', 'not-a-choice']) rejectsUnchanged(ready(),id);
// Both direct menu entries retain the receiving gate for a hydronic handoff.
let coil=ready(); F.selectSystem(coil,'furnace',meta);
for(const c of ['none_of_these','air_handler_hot_water','boiler','pipe_cold']) F.answer(coil,c,meta);
assert.equal(coil.node,'bl.gate.carryover');
coil=ready(); F.selectSystem(coil,'boiler',meta);
for(const c of ['none_of_these','hydro_air','pipe_hot_no_air']) F.answer(coil,c,meta);
assert.equal(coil.node,'fn.gate.combustion_co');

async function checkPage() {
  const {JSDOM,VirtualConsole}=require('jsdom');
  const errors=[];
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
  const files=['config','ts-runtime','ts-lane','heating-data','heating-lanes','flow','app'];
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8')
    .replace(/\s*<script src="assets\/(?:config|ts-runtime|ts-lane|heating-data|heating-lanes|flow|app)\.js\?v=[^"]+" defer><\/script>/g,'')
    .replace('</body>',files.map(f=>'<script>'+fs.readFileSync(path.join(root,'assets',f+'.js'),'utf8')+'</script>').join('')+'</body>');
  const dom=new JSDOM(html,{url:'http://127.0.0.1:8765/#/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};}});
  const w=dom.window,d=w.document,flush=()=>new Promise(r=>setTimeout(r,0));
  async function click(selector) {const el=d.querySelector(selector);assert.ok(el,selector);el.click();await flush();}
  for(const [id,[node]] of Object.entries(expected)) {
    w.location.hash='#/';await flush();
    await click('[data-action="test"]');await click('[data-answer="none_of_these"]');
    await click('#agree');await click('[data-answer="agree_18_terms"]');
    assert.equal(d.querySelector('h1').textContent,'What would you like help with?');
    assert.equal(d.querySelectorAll('.system-menu [data-answer]').length,10);
    assert.equal(d.querySelector('[data-answer="other_heat_or_ductless"]'),null);
    assert.deepEqual([...d.querySelectorAll('.system-group h2')].map(e=>e.textContent),menu.map(g=>g.title));
    if(id==='thermostat_settings' && process.env.SW_MENU_SNAPSHOT) {
      const copy=d.documentElement.cloneNode(true);copy.querySelectorAll('script').forEach(e=>e.remove());
      fs.writeFileSync(process.env.SW_MENU_SNAPSHOT,'<!doctype html>'+copy.outerHTML);
    }
    await click('[data-answer="'+id+'"]');
    const target=node.startsWith('@')?F.results[node.slice(1)]:F.nodes[node];
    assert.equal(d.querySelector('h1').textContent,target.title,id+' opens its entry directly');
    assert.ok(!d.querySelector('#flow-error')?.textContent);
    await click('[data-action="stop"]');
    if(id==='boiler'){
      for(const choice of ['water_steam_release','steam_glass_empty','bang_or_puffback','soot_scorch_flame','pressure_at_relief'])assert.ok(d.querySelector('[data-answer="'+choice+'"]'),choice);
    }else assert.ok(d.querySelector('[data-answer="hazard_hot_water_steam"]'));
  }
  assert.deepEqual(errors,[]);
  dom.window.close();
}
checkPage().then(()=>console.log('PASS: 10 direct menu choices, blocked bypasses, Stop escalation, hydronic handoffs, and rendered navigation.')).catch(e=>{console.error(e);process.exitCode=1;});
