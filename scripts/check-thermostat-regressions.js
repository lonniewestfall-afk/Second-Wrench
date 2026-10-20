/* Regression checks for takeover findings. No network or deployment. */
'use strict';
const assert = require('node:assert/strict');
globalThis.SW_CONFIG = { advancedRepairsEnabled: false, aiThermostatEnabled: false, mirrorsEnabled: false, stageLatchStepsEnabled: false };
const F = require('../assets/flow.js');
const TS = require('../assets/ts-lane.js');
const clone = value => JSON.parse(JSON.stringify(value));
const meta = { agreed: true, termsVersion: 'regression-test' };
let hidden = 0;
// Every hidden model/feature option must be rejected before any session mutation.
for (const model of Object.keys(F.tsModels)) {
  for (const [id, node] of Object.entries(F.nodes)) {
    if (!id.startsWith('ts.')) continue;
    for (const geo of [false, true]) {
      const state = Object.assign(F.create('', 'test'), { product: 'ts', node: id, consent: true, safetyCleared: true, tsModel: model, tsGeo: geo });
      const visible = new Set(F.viewNode(id, state).options.filter(op => !op.disabled).map(op => op.id));
      for (const op of node.options.filter(op => !visible.has(op.id))) {
        const before = clone(state);
        assert.throws(() => F.answer(state, op.id, meta), /Choose an answer shown/, id + '/' + op.id);
        assert.deepEqual(state, before, 'Hidden choice changed session: ' + model + '/' + id + '/' + op.id);
        hidden++;
      }
    }
  }
}
assert(hidden > 0, 'Hidden-choice coverage must not be empty');

let completionCases = 0;
for (const [node, fn] of Object.entries(F.tsFnOf)) {
  if (!node.startsWith('ts.step.')) continue;
  for (const [model, cell] of Object.entries(F.tsSteps[fn])) {
    for (const acks of [{}, { tsWarrantyAck: true }, { tsWarrantyAck: true, tsLc18: true }]) {
      const state = Object.assign(F.create('', 'test'), { product: 'ts', node, tsModel: model, safetyCleared: true, consent: true }, acks);
      const shouldOffer = cell.kind === 'text' && !cell.generic && !cell.held && (!cell.installer_menu || !!(state.tsWarrantyAck && state.tsLc18));
      for (const op of F.nodes[node].options.filter(o => ['done_better', 'no_change', 'worse_put_back'].includes(o.id))) {
        const visible = F.viewNode(node, state).options.some(o => o.id === op.id && !o.disabled);
        assert.equal(visible, shouldOffer, 'Completion must match revealed instructions: ' + model + '/' + node + '/' + op.id);
        if (!shouldOffer) {
          const before = clone(state);
          assert.throws(() => F.answer(state, op.id, meta), /Choose an answer shown/);
          assert.deepEqual(state, before, 'Unshown-step completion mutated the session');
        }
        completionCases++;
      }
      assert(F.viewNode(node, state).options.some(o => o.id === 'hazard_now' && !o.disabled), 'Hazard exit hidden by completion guard');
    }
  }
}
assert(completionCases > 0);

// Exercise rendered text, not only the eligibility predicate. The previous
// tests passed even when expired records still supplied instructions to users.
let panels = 0;
for (const [fn, models] of Object.entries(F.tsSteps)) {
  const nodeId = Object.keys(F.tsFnOf).find(id => F.tsFnOf[id] === fn);
  if (!nodeId) continue;
  for (const [model, cell] of Object.entries(models)) {
    if (!cell.mirrors || !cell.mirrors.length || cell.text) continue;
    const byId = {};
    cell.mirrors.forEach(id => { byId[id] = Object.assign(clone(F.tsMirrors.byId[id]), { verified_status: 'verified', verified_by: 'reviewer-1', second_check_by: 'reviewer-2', verified_on: '2026-10-01', second_check_on: '2026-10-01', recheck_due: '2026-10-12' }); });
    const opts = { byId, today: '2026-10-12', mirrorsEnabled: false, hold: [] };
    const current = F.renderTsPanel(model, nodeId, opts);
    const expected = cell.mirrors.flatMap(id => byId[id].our_instruction_text || []);
    assert(expected.length > 0, 'Listed record has no testable text');
    expected.forEach(line => assert(current.steps.includes(line), 'Text must remain available on recheck date'));
    for (const reason of ['expired', 'held', 'unverified', 'same-reviewer', 'open-report']) {
      const changed = clone(byId);
      const overrides = Object.assign({}, opts, { byId: changed });
      if (reason === 'expired') overrides.today = '2026-10-13';
      if (reason === 'held') overrides.hold = cell.mirrors.map(id => ({ id, reason: 'test hold' }));
      if (reason === 'unverified') cell.mirrors.forEach(id => { changed[id].verified_status = 'unverified'; });
      if (reason === 'same-reviewer') cell.mirrors.forEach(id => { changed[id].second_check_by = changed[id].verified_by; });
      const reportsBefore = cell.mirrors.map(id => [id, TS.openReports[id]]);
      if (reason === 'open-report') cell.mirrors.forEach(id => { TS.openReports[id] = true; });
      try {
        const withdrawn = F.renderTsPanel(model, nodeId, overrides);
        assert.equal(withdrawn.steps.length, 0, model + '/' + fn + ' ' + reason + ' leaked instructions');
        assert.equal(withdrawn.withdrawn, true);
        assert(withdrawn.html.includes('ts-lc10'), 'Missing withdrawal notice');
        assert(withdrawn.html.includes('ts-lc9'), 'Missing manual fallback');
        expected.forEach(line => assert(!withdrawn.text.includes(line), 'Withheld instruction leaked into text'));
      } finally {
        reportsBefore.forEach(([id, value]) => { if (value === undefined) delete TS.openReports[id]; else TS.openReports[id] = value; });
      }
    }
    panels++;
  }
}
assert(panels > 0, 'Withdrawal coverage must not be empty');

// The thermostat lane still owns the session after Stop opens global triage.
// Its notes must resolve the new global result and keep the reported hazard.
function tsResult(choices) {
  const state = F.create('', 'test');
  for (const choice of ['none_of_these', 'agree_18_terms', 'other_heat_or_ductless', 'thermostat_settings', 'ts_none_of_these', 'brand_honeywell_buttons', 'hw_focuspro'].concat(choices)) {
    if (state.node === 'sw.co.fast_exit' && choice !== 'co_yes' && choice !== 'co_no') F.answer(state, 'co_no', meta);
    F.answer(state, choice, meta);
  }
  return state;
}
const waiting = tsResult(['landing_wait_delay', 'wait_persists']);
const escalated = clone(waiting);
F.stop(escalated); F.answer(escalated, 'co_no', meta); F.answer(escalated, 'hazard_gas_co', meta);
let note = F.summary(escalated);
assert.equal(escalated.result, 'gas');
assert(note.includes('Result: ' + F.results.gas.title + ' (Emergency)'), 'Global hazard result missing from TS note');
assert(note.includes('Gas smell or CO alarm reported.'), 'New hazard observation missing from TS note');
assert(!note.includes('Safety check at start:'), 'Earlier no-hazard statement obscures later report');
assert(note.includes('Earlier result: ' + F.results.ts_wait_persists.title), 'Earlier TS result missing');
F.stop(escalated); F.answer(escalated, 'co_no', meta); F.answer(escalated, 'none_of_these', meta);
note = F.summary(escalated);
assert.equal(escalated.result, 'professional');
assert(note.includes('Result: ' + F.results.professional.title), 'Locked professional result missing from TS note');
assert(note.includes('Earlier result: ' + F.results.gas.title), 'Earlier global hazard result missing');
assert(note.includes('Gas smell or CO alarm reported.'), 'Prior hazard was lost after stopping again');
assert(note.endsWith('TEST SCENARIO — not an actual equipment report.'), 'Escalated TS note lost test label');
const urgent = tsResult(['landing_em_aux_heat', 'eh_tech_left_on']);
F.stop(urgent); F.answer(urgent, 'co_no', meta); F.answer(urgent, 'none_of_these', meta);
assert.equal(urgent.result, 'professional');
assert(F.summary(urgent).includes('Result: ' + F.results.professional.title), 'Intentional-emergency-heat stop lost global result');

// Every optional detail offered by the UI is kept in the local note, bounded
// and stripped of line breaks. It must never enter the activity payload.
const supplied = { complaint: 'No heat\nupstairs', began: 'today\r\nafter work', model: 'EXACT-MODEL-SECRET', codes: 'CODE-SECRET\nsecond line' };
note = F.summary(waiting, supplied);
for (const text of ['Problem: No heat upstairs', 'Began (homeowner supplied): today after work', 'Model (homeowner supplied, unconfirmed): EXACT-MODEL-SECRET', 'Codes or messages on the thermostat (homeowner supplied): CODE-SECRET second line']) assert(note.includes(text), 'Missing or unclean typed detail: ' + text);
assert(!F.summary(waiting).includes('Problem: Complaint:'), 'Duplicated complaint prefix');
assert(!JSON.stringify(F.activity(waiting)).includes('SECRET'), 'Typed note leaked into activity');
const bounded = F.summary(waiting, { complaint: 'C'.repeat(160), began: 'B'.repeat(120), model: 'M'.repeat(120), codes: 'E'.repeat(160) });
for (const [char, count] of [['C', 140], ['B', 100], ['M', 100], ['E', 140]]) { assert(bounded.includes(char.repeat(count))); assert(!bounded.includes(char.repeat(count + 1))); }
console.log('Thermostat regressions passed: ' + hidden + ' hidden choices rejected without mutation; ' + panels + ' panels checked at expiry, hold, review, and report boundaries; escalated notes and typed details retained.');
