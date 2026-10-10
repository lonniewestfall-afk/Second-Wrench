/* Thermostat lane helpers for ts.settings.v0.
 * Look-only settings help. No AI. Mirrors stay off until Commander flips the flag.
 * Legal strings are 02-on-page-copy.md rev 3 (curly apostrophes). Spec citations that
 * still say "rev 2" mean this same text, plus the rev 3 breaker approval.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./ts-data.json'),
      require('../content/mirrors/compiled.json'),
      require('../content/mirrors/serve-v0.json')
    );
  } else {
    var boot = root.SW_TS_BOOT;
    if (!boot) throw new Error('Thermostat data failed to load');
    root.SW_TS_LANE = factory(boot.data, boot.records, boot.serve);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (data, records, serveDoc) {
  'use strict';

  var LC_EXPECTED = JSON.parse(JSON.stringify(data.lc));
  var SERVE_EXPECTED = serveDoc.TS_MIRROR_SERVE.slice();
  var HOLD_EXPECTED = serveDoc.TS_MIRROR_HOLD.map(function (row) { return { id: row.id, reason: row.reason }; });
  var VERIFIED_P1 = data.verifiedP1.slice();
  var UNOFFICIAL_URLS = [
    'https://comfort-pro.com/wp-content/uploads/Honeywell-6000-Tstat.pdf',
    'https://images.thdstatic.com/catalog/pdfImages/69/6945cb70-2440-45f8-805c-155a2d7126bb.pdf'
  ];
  var SMART_KEYS = {
    'NEST-LT4': 1, 'NEST-NT': 1, 'NEST-LT3': 1, 'NEST-E': 1,
    'HW-T5': 1, 'HW-T6': 1, 'HW-T9': 1, 'ECB-PRM': 1, 'ECB-ESS': 1, 'AMZ-AST': 1
  };
  var FUNCTION_NODES = Object.keys(data.fnOf);
  var INSTALLER_RE = /Installation Settings|Thresholds?|\bISU\b|Installer Options|Advanced configuration|Advanced Setup|Reversing Valve|\bO\/B\b|HVAC Type|System configuration|Equipment\b|function \d|Factory Reset|Reset All|lockout|balance point|staging|A\/C Protection|Reconfigure/i;
  var INSTALLER_OK = /^(Don’t|Do not|Never|No |Use only|Pick only)|installer|\bpro\b/i;
  var BREAKER_BAN = /reset (it )?once|after one reset|tripped again/i;
  var BREAKER_WORD = /breaker/i;
  var BREAKER_ACT = /\breset\b|\bflip\b|switch (it )?back|turn (it )?(back )?on/i;
  var BREAKER_OK = /^(Don’t|Do not|Never)|This check doesn’t include/;
  var AI_BAN = [
    'I understand the AI helper is automated',
    'AI-generated. Can be wrong.',
    'AI answer',
    'Live help isn'
  ];
  var HARD_FAIL = /\bgreen\b|guarantee|\bcertified\b|\bwarranty\b|\bcure\b|you should be fine|safe to (keep|continue)|\bscrewdriver\b|multimeter|voltmeter|\bjumper\b|\bbypass\b|ladder|!|lawyer|attorney-reviewed/;
  var PROHIB = /\b(breaker|capacitor|contactor|board|compressor|wiring|rewire|panel|fuse|float|refrigerant)\b|C wire|\bPEK\b|\bslider\b/i;
  var PROHIB_OK = /^(Don’t|Do not|No |Never)|stop|\bpro\b|professional|electrician|installer/i;
  var PROHIB_ALLOW = {
    'A breaker for the heating or cooling keeps tripping': 1,
    'Breaker for the HVAC keeps tripping.': 1,
    'A breaker for the heating or cooling looks tripped': 1,
    'A breaker for the HVAC looked tripped.': 1,
    'If a breaker for the heating or cooling looks tripped, choose that option.': 1,
    'If a breaker for the heating or cooling trips, leave it as it is and call a licensed professional.': 1,
    'This check doesn’t include resetting breakers.': 1,
    'I was told I need a C wire, a power adapter, or a kit inside the furnace': 1,
    'C wire, power adapter, or furnace kit suggested.': 1,
    'Capacitor, contactor, and board work are not offered in the thermostat check.': 1,
    'For wiring or electrical problems, turn the system off at the thermostat and call a licensed professional.': 1,
    'Leave the panel alone.': 1
  };
  /* Spec G12 treats the common noun "equipment" like an installer menu name.
   * These approved sentences stay verbatim. The allowlist is the adaptation. */
  var G12_ALLOW = {
    'Many systems wait a few minutes to protect the equipment, and changing the setting again starts that wait over.': 1,
    'That protects the equipment.': 1,
    'Notice whether other equipment has power: the furnace or air-handler light, the outdoor unit, or lights on the same part of the house.': 1,
    '4. Notice whether other equipment has power: the furnace or air-handler light, the outdoor unit, or lights on the same part of the house. Just look.': 1,
    'Cool On flashing (or Heat On on a heat pump) means the thermostat is waiting a few minutes to protect the equipment.': 1,
    'Wait on the display means the thermostat is holding off for about 5 minutes to protect the equipment.': 1,
    'Waiting For Equipment means the thermostat is holding off to protect the equipment.': 1
  };
  var byId = {};
  records.forEach(function (record) { byId[record.id] = record; });
  var openReports = {};

  function config() {
    return (typeof globalThis !== 'undefined' && globalThis.SW_CONFIG) || {};
  }
  function todayIso() {
    var now = new Date();
    var m = String(now.getUTCMonth() + 1);
    var d = String(now.getUTCDate());
    if (m.length < 2) m = '0' + m;
    if (d.length < 2) d = '0' + d;
    return now.getUTCFullYear() + '-' + m + '-' + d;
  }
  function addCadence(iso, cadence) {
    var parts = String(iso || '').split('-');
    var y = Number(parts[0]);
    var m = Number(parts[1]);
    var d = Number(parts[2]);
    if (!y || !m || !d) return '';
    var dt = new Date(Date.UTC(y, m - 1, d));
    if (cadence === '90d') dt.setUTCDate(dt.getUTCDate() + 90);
    else if (cadence === '12m') dt.setUTCMonth(dt.getUTCMonth() + 12);
    else return '';
    var mm = String(dt.getUTCMonth() + 1);
    var dd = String(dt.getUTCDate());
    if (mm.length < 2) mm = '0' + mm;
    if (dd.length < 2) dd = '0' + dd;
    return dt.getUTCFullYear() + '-' + mm + '-' + dd;
  }
  function formatDate(iso) {
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var parts = String(iso || '').split('-');
    var month = months[Number(parts[1]) - 1] || '';
    return month + ' ' + Number(parts[2]) + ', ' + parts[0];
  }
  function sentences(text) {
    return String(text || '').replace(/\{step panel:[^}]+\}/g, ' ').split(/(?<=[.!?])\s+|\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function plainLc3(text) {
    return String(text || '').replace(/\*\*/g, '');
  }
  function htmlLc3(text) {
    var parts = String(text || '').split('**');
    return parts.map(function (part, index) {
      return index % 2 ? '<strong>' + esc(part) + '</strong>' : esc(part);
    }).join('');
  }
  function fallbackLine(entry) {
    var src = data.fallbacks[entry.id];
    if (!src) return '';
    return data.lc.lc9
      .replace('[source title]', src.title)
      .replace('[page or section]', entry.section)
      .replace('[link]', src.url);
  }
  function recordRenderable(record, opts) {
    opts = opts || {};
    var enabled = Object.prototype.hasOwnProperty.call(opts, 'mirrorsEnabled') ? opts.mirrorsEnabled === true : config().mirrorsEnabled === true;
    if (!enabled || !record) return false;
    var serve = opts.serve || serveDoc.TS_MIRROR_SERVE;
    var hold = opts.hold || serveDoc.TS_MIRROR_HOLD;
    if (serve.indexOf(record.id) === -1) return false;
    if (hold.some(function (row) { return row.id === record.id; })) return false;
    if (!record.second_check_by || !record.second_check_on) return false;
    if (record.second_check_by === record.verified_by) return false;
    if (String(record.verified_on || '') < String(record.second_check_on)) return false;
    if (record.verified_status !== 'verified') return false;
    var today = opts.today || todayIso();
    if (String(today) > String(record.recheck_due || '')) return false;
    if (openReports[record.id]) return false;
    return true;
  }
  function visibleLines(record) {
    return (record.lines || []).filter(function (line) { return line.verified !== 'unverified'; });
  }
  function mirrorHtml(record) {
    var lines = visibleLines(record).map(function (line) {
      var selected = line.selected ? ' <span class="ts-selected">selected (example)</span>' : '';
      return '<li>' + esc(line.label) + selected + '</li>';
    }).join('');
    var buttons = (record.buttons || []).filter(function (button) { return button.verified !== 'unverified'; }).map(function (button) {
      return '<span class="ts-btn" role="presentation">' + esc(button.on_screen_text || button.label) + '</span>';
    }).join('');
    return '<figure class="ts-screen"><ol class="ts-lines">' + lines + '</ol><div class="ts-buttons">' + buttons + '</div></figure>';
  }
  function renderTsPanel(modelKey, nodeId, opts) {
    opts = opts || {};
    var fn = data.fnOf[nodeId];
    var cell = fn && data.steps[fn] ? data.steps[fn][modelKey] : null;
    var model = data.models[modelKey] || null;
    var serve = opts.serve || serveDoc.TS_MIRROR_SERVE;
    var listed = cell && cell.mirrors ? cell.mirrors.slice() : [];
    var served = [];
    listed.forEach(function (id) {
      var record = (opts.byId || byId)[id];
      if (record && recordRenderable(record, opts)) served.push(record);
    });
    var steps = [];
    if (served.length) {
      served.forEach(function (record) {
        (record.our_instruction_text || []).forEach(function (line) { steps.push(line); });
      });
    } else if (cell && cell.text) {
      steps.push(cell.text);
    } else if (listed.length) {
      listed.forEach(function (id) {
        var record = (opts.byId || byId)[id];
        if (record) (record.our_instruction_text || []).forEach(function (line) { steps.push(line); });
      });
    }
    var generic = !!(cell && cell.generic);
    var lc10 = generic ? data.lc.lc10 : '';
    var fallbacks = [];
    if (!served.length && cell) {
      (cell.fallback || []).forEach(function (entry) {
        var line = fallbackLine(entry);
        if (line) fallbacks.push({ id: entry.id, section: entry.section, line: line, url: data.fallbacks[entry.id] ? data.fallbacks[entry.id].url : '' });
      });
    }
    var lc6 = cell && cell.lc6_inline ? data.lc.lc6 : '';
    var blocks = [];
    served.forEach(function (record) {
      var lc2 = data.lc.lc2.replace('[Brand]', record.brand);
      var src = data.fallbacks[model && model.manual] || {};
      var lc4 = data.lc.lc4
        .replace('[source title]', record.source_version)
        .replace('[link]', record.source_url)
        .replace('[Month D, YYYY]', formatDate(record.verified_on));
      blocks.push({ id: record.id, lc2: lc2, lc4: lc4, html: mirrorHtml(record), manualTitle: src.title || '' });
    });
    var html = '';
    blocks.forEach(function (block) {
      html += '<p class="ts-lc2">' + esc(block.lc2) + '</p>' + block.html + '<p class="ts-lc4">' + esc(block.lc4) + '</p>';
    });
    if (fn) html += '<p class="ts-lc3">' + htmlLc3(data.lc.lc3) + '</p>';
    if (steps.length) {
      html += '<ol class="ts-steps">' + steps.map(function (step) { return '<li>' + esc(step) + '</li>'; }).join('') + '</ol>';
    }
    if (lc10) html += '<p class="ts-lc10">' + esc(lc10) + '</p>';
    fallbacks.forEach(function (item) {
      html += '<p class="ts-lc9">' + esc(item.line) + '</p>';
    });
    if (lc6) html += '<p class="ts-lc6">' + esc(lc6) + '</p>';
    var text = [plainLc3(fn ? data.lc.lc3 : '')].concat(steps, lc10 ? [lc10] : [], fallbacks.map(function (item) { return item.line; }), lc6 ? [lc6] : [], blocks.map(function (block) { return block.lc2 + ' ' + block.lc4; })).join('\n');
    return {
      fn: fn, modelKey: modelKey, cell: cell, served: blocks, steps: steps,
      lc3: fn ? data.lc.lc3 : '', lc3Plain: plainLc3(fn ? data.lc.lc3 : ''),
      lc10: lc10, fallbacks: fallbacks, lc6: lc6, generic: generic, html: html, text: text
    };
  }
  function fillLc5(modelKey) {
    var model = data.models[modelKey] || {};
    var help = data.fallbacks[model.help] || { url: '' };
    return data.lc.lc5.replace('[Brand]', model.legal_brand || '').replace('[link]', help.url || '');
  }
  function presentResult(state, results) {
    var res = results[state.result];
    if (!res) return null;
    if (state.result === 'ts_screen_different') {
      return Object.assign({}, res, { explanation: fillLc5(state.tsModel) });
    }
    return res;
  }
  function summary(state, extra, contentVersion) {
    var facts = (state.answers || []).map(function (row) { return row.fact; }).filter(Boolean);
    var model = data.models[state.tsModel];
    var complaint = (extra && extra.complaint) || facts.filter(function (fact) { return fact.indexOf('Complaint:') === 0; }).slice(-1)[0] || 'Thermostat concern; see reported observations.';
    var tried = facts.filter(function (fact) { return fact.indexOf('User ') === 0; });
    var stopFired = (state.answers || []).some(function (row) {
      var node = data.nodes[row.node];
      var option = node && node.options.filter(function (item) { return item.id === row.choice; })[0];
      return !!(option && option.gate);
    });
    var fns = [];
    (state.answers || []).concat(state.node ? [{ node: state.node }] : []).forEach(function (row) {
      var fn = data.fnOf[row.node];
      if (fn && fns.indexOf(fn) === -1) fns.push(fn);
    });
    var lines = [
      'HOMEOWNER SERVICE NOTE — thermostat observations, not a diagnosis',
      'Thermostat: ' + (model ? model.label : 'unconfirmed model') + ' (homeowner reported).',
      'Problem: ' + complaint,
      tried.length ? 'Tried: ' + tried.join(' ') : '',
      'Codes or messages on the thermostat: ______________________ (write the exact text)',
      stopFired ? '' : 'Safety check at start: no CO alarm, gas smell, burning smell, repeat breaker trip, water at the indoor unit, or high-voltage thermostat reported.',
      'This guide did not ask you to open equipment, touch wires, or change installer settings.',
      'Guide: Second Wrench thermostat check ts.settings.v0, ' + (contentVersion || '') + ', step panels: ' + (fns.join(', ') || 'none') + '.'
    ];
    return lines.filter(Boolean).join('\n');
  }
  function tsReachable(nodes) {
    var seen = {};
    var stack = ['ts.gate.safety_stops'];
    while (stack.length) {
      var id = stack.pop();
      if (!id || seen[id] || id.charAt(0) === '@') continue;
      seen[id] = 1;
      var node = nodes[id];
      if (!node) continue;
      node.options.forEach(function (option) {
        if (typeof option.next === 'string' && option.next.charAt(0) !== '@') stack.push(option.next);
        else if (typeof option.next === 'string') seen[option.next] = 1;
      });
    }
    return seen;
  }
  function hasImageRef(record) {
    var blob = JSON.stringify({ lines: record.lines || [], buttons: record.buttons || [] });
    return /\.(png|jpe?g|gif|svg|webp)\b/i.test(blob) || /"(?:image|icon_url|src)"\s*:/.test(blob);
  }
  function lineTooLong(record) {
    var items = (record.lines || []).concat(record.buttons || []);
    return items.some(function (item) {
      var label = String(item.label || item.on_screen_text || '');
      if (item.verified === 'placeholder' || label === '…' || /^\[[^\]]+\]$/.test(label)) return false;
      return label.length > 40;
    });
  }
  function collectCopy(nodes, results) {
    var out = [];
    data.v0.forEach(function (id) {
      var node = nodes[id];
      if (!node) return;
      ['title', 'body', 'caution'].forEach(function (key) { out.push([id + ' ' + key, node[key]]); });
      node.options.forEach(function (option) {
        ['label', 'hint', 'fact'].forEach(function (key) { out.push([id + '/' + option.id + ' ' + key, option[key]]); });
      });
    });
    Object.keys(results).forEach(function (id) {
      if (id.indexOf('ts_') !== 0) return;
      var res = results[id];
      ['title', 'urgency', 'explanation', 'avoid'].forEach(function (key) { out.push([id + ' ' + key, res[key]]); });
      (res.actions || []).forEach(function (action, index) { out.push([id + ' action ' + index, action]); });
    });
    Object.keys(data.steps).forEach(function (fn) {
      Object.keys(data.steps[fn]).forEach(function (key) {
        out.push([fn + ' ' + key + ' text', data.steps[fn][key].text]);
      });
    });
    records.forEach(function (record) {
      (record.our_instruction_text || []).forEach(function (line, index) {
        out.push([record.id + ' instruction ' + index, line]);
      });
    });
    Object.keys(data.lc).forEach(function (key) { out.push(['LC ' + key, data.lc[key]]); });
    out.push(['U1', data.u1]);
    out.push(['U2', data.u2]);
    return out;
  }
  function scanInstaller(text, where, failures) {
    sentences(text).forEach(function (sentence) {
      if (G12_ALLOW[sentence]) return;
      if (INSTALLER_RE.test(sentence) && !INSTALLER_OK.test(sentence)) failures.push('TS-G12: ' + where + ': ' + sentence);
    });
  }
  function scanBreaker(text, where, failures) {
    var raw = String(text || '');
    if (BREAKER_BAN.test(raw)) failures.push('TS-G15: ' + where + ': ' + raw);
    sentences(raw).forEach(function (sentence) {
      if (BREAKER_WORD.test(sentence) && BREAKER_ACT.test(sentence) && !BREAKER_OK.test(sentence)) {
        failures.push('TS-G15: ' + where + ': ' + sentence);
      }
    });
  }
  function forbiddenScan(text, where) {
    var failures = [];
    var raw = String(text || '').replace(/\{step panel:[^}]+\}/g, ' ');
    if (HARD_FAIL.test(raw)) failures.push('TS-A10: ' + where + ' hard fail');
    sentences(raw).forEach(function (sentence) {
      if (PROHIB.test(sentence) && !PROHIB_OK.test(sentence) && !PROHIB_ALLOW[sentence]) {
        failures.push('TS-A10: ' + where + ': ' + sentence);
      }
    });
    if (raw.indexOf('\u0027') !== -1) failures.push('TS-G18: ' + where);
    return failures;
  }
  function assertTs(nodes, results) {
    var failures = [];
    var fail = function (code, msg) { failures.push(code + ': ' + msg); };
    if (data.v0.join('|') !== Object.keys(data.nodes).join('|')) fail('TS-G1', 'TS_V0 drifted');
    data.v0.forEach(function (id) {
      if (!nodes[id]) fail('TS-G1', 'missing ' + id);
      else if (nodes[id].diyTier !== 'basic') fail('TS-G1', id + ' diyTier');
    });
    var gates = { 'ts.gate.safety_stops': 1, 'ts.power.blank_screen': 1, 'ts.alert.capture': 1 };
    data.v0.forEach(function (id) {
      var on = !!(nodes[id] && nodes[id].safetyGate);
      if (on !== !!gates[id]) fail('TS-G2', id);
    });
    data.v0.forEach(function (id) {
      var node = nodes[id];
      if (!node) return;
      var last = node.options[node.options.length - 1];
      if (!last || last.id !== 'hazard_now' || last.next !== '@ts_hazard_now' || last.gate !== 'ts_new_hazard') fail('TS-G3', id);
      if (FUNCTION_NODES.indexOf(id) !== -1) {
        var tail = node.options.slice(-3);
        if (!tail[0] || tail[0].id !== 'screen_looks_different' || tail[0].next !== '@ts_screen_different' || tail[0].label !== 'My screen looks different') fail('TS-G3', id + ' screen');
        if (!tail[1] || tail[1].id !== 'installer_setting_came_up' || tail[1].next !== '@ts_installer_guard') fail('TS-G3', id + ' installer');
      }
      node.options.forEach(function (option) {
        if (typeof option.next !== 'string') fail('TS-G4', id + '/' + option.id);
      });
    });
    var seen = tsReachable(nodes);
    data.v0.forEach(function (id) { if (!seen[id]) fail('TS-G5', 'unreachable ' + id); });
    Object.keys(seen).forEach(function (id) {
      if (/^(ac|hp|sw|fn|wshp|ms)\./.test(id)) fail('TS-G5', id);
      if (id === '@next_step_advanced' || id === '@ts_advanced_off') fail('TS-G5', id);
    });
    Object.keys(seen).forEach(function (id) {
      if (id.charAt(0) !== '@') return;
      var res = results[id.slice(1)];
      if (!res) { fail('TS-G6', id); return; }
      if (['next_step', 'call_pro', 'emergency_exit', 'insufficient_info'].indexOf(res.outcome) === -1) fail('TS-G6', id + ' outcome');
      if (res.continueTo != null) fail('TS-G6', id + ' continueTo');
      if (res.outcome === 'next_step' && res.diyTier !== 'basic') fail('TS-G6', id + ' tier');
    });
    data.v0.forEach(function (id) {
      nodes[id].options.forEach(function (option) {
        var res = typeof option.next === 'string' && option.next.charAt(0) === '@' ? results[option.next.slice(1)] : null;
        if (option.gate && (!res || res.outcome !== 'emergency_exit')) fail('TS-G7', id + '/' + option.id);
        if (res && res.outcome === 'emergency_exit' && !option.gate) fail('TS-G7', id + '/' + option.id + ' ungated');
      });
    });
    var color = {};
    var cyclic = false;
    function dfs(id) {
      if (cyclic || !nodes[id] || id.indexOf('ts.') !== 0) return;
      if (color[id] === 1) { cyclic = true; return; }
      if (color[id] === 2) return;
      color[id] = 1;
      nodes[id].options.forEach(function (option) {
        if (typeof option.next === 'string' && option.next.indexOf('ts.') === 0) dfs(option.next);
      });
      color[id] = 2;
    }
    dfs('ts.gate.safety_stops');
    if (cyclic) fail('TS-G8', 'cycle');
    var other = nodes['sw.intake.other_system'];
    var type = nodes['sw.intake.system_type'];
    if (!other || other.options.map(function (option) { return option.id; }).join('|') !== 'ductless_mini_split|water_source_geo|thermostat_settings|not_listed') fail('TS-G9', 'other order');
    var thermo = other && other.options.filter(function (option) { return option.id === 'thermostat_settings'; })[0];
    if (!thermo || thermo.next !== 'ts.gate.safety_stops') fail('TS-G9', 'thermostat edge');
    if (!type || type.options.map(function (option) { return option.id; }).join('|') !== 'cooling_only_ac|heat_pump|furnace|other_heat_or_ductless|not_sure') fail('TS-G9', 'start ids');
    if (type) type.options.forEach(function (option) { if (String(option.next).indexOf('ts.') === 0) fail('TS-G9', option.id); });
    var door = type && type.options.filter(function (option) { return option.id === 'other_heat_or_ductless'; })[0];
    if (!door || door.label !== 'Something else: mini-split, geothermal, thermostat, other') fail('TS-G9', 'start label');
    var mirrorIds = [];
    Object.keys(data.steps).forEach(function (fn) {
      Object.keys(data.steps[fn]).forEach(function (key) {
        (data.steps[fn][key].mirrors || []).forEach(function (id) { mirrorIds.push(id); });
      });
    });
    mirrorIds.forEach(function (id) {
      if (serveDoc.TS_MIRROR_SERVE.indexOf(id) === -1) fail('TS-G10', 'step mirror not served ' + id);
    });
    serveDoc.TS_MIRROR_SERVE.forEach(function (id) {
      if (serveDoc.TS_MIRROR_HOLD.some(function (row) { return row.id === id; })) fail('TS-G10', 'serve and hold ' + id);
    });
    if (serveDoc.TS_MIRROR_SERVE.join('|') !== SERVE_EXPECTED.join('|')) fail('TS-G10', 'serve list');
    serveDoc.TS_MIRROR_SERVE.forEach(function (id) {
      var record = byId[id];
      if (!record) { fail('TS-G10', 'missing record ' + id); return; }
      if (record.second_check_by !== 'Tree Lead' || record.second_check_by === record.verified_by) fail('TS-G10', 'second check ' + id);
      if (!record.second_check_on || record.verified_on !== record.second_check_on) fail('TS-G10', 'verified_on ' + id);
      if (record.verified_status !== 'verified') fail('TS-G10', 'status ' + id);
      if (VERIFIED_P1.indexOf(record.step_id) === -1) fail('TS-G10', 'p1 ' + record.step_id);
      if (!record.source_version) fail('TS-G10', 'source_version ' + id);
      if (lineTooLong(record)) fail('TS-G10', 'line length ' + id);
      if (hasImageRef(record)) fail('TS-G10', 'image ' + id);
    });
    Object.keys(data.steps).forEach(function (fn) {
      Object.keys(data.steps[fn]).forEach(function (key) {
        var cell = data.steps[fn][key];
        var servedHere = (cell.mirrors || []).some(function (id) { return serveDoc.TS_MIRROR_SERVE.indexOf(id) !== -1; });
        if (!servedHere) {
          if (!cell.fallback || !cell.fallback.length) fail('TS-G11', fn + ' ' + key);
          (cell.fallback || []).forEach(function (entry) {
            if (!data.fallbacks[entry.id] || !data.fallbacks[entry.id].url) fail('TS-G11', entry.id);
          });
        }
        if (cell.lc6_inline) {
          var panel = renderTsPanel(key, Object.keys(data.fnOf).filter(function (nodeId) { return data.fnOf[nodeId] === fn; })[0], { mirrorsEnabled: false });
          if (panel.lc6 !== data.lc.lc6) fail('TS-G11', 'LC-6 ' + fn + ' ' + key);
        }
      });
    });
    data.v0.forEach(function (id) { scanInstaller(nodes[id].body, id, failures); });
    Object.keys(data.steps).forEach(function (fn) {
      Object.keys(data.steps[fn]).forEach(function (key) { scanInstaller(data.steps[fn][key].text, fn + ' ' + key, failures); });
    });
    records.forEach(function (record) {
      (record.our_instruction_text || []).forEach(function (line) { scanInstaller(line, record.id, failures); });
    });
    if (config().aiThermostatEnabled !== false) fail('TS-G13', 'aiThermostatEnabled');
    collectCopy(nodes, results).forEach(function (pair) {
      var blob = String(pair[1] || '');
      AI_BAN.forEach(function (phrase) { if (blob.indexOf(phrase) !== -1) fail('TS-G13', pair[0]); });
    });
    Object.keys(LC_EXPECTED).forEach(function (key) {
      if (data.lc[key] !== LC_EXPECTED[key]) fail('TS-G14', key);
    });
    ['lc1', 'lc2', 'lc3', 'lc4', 'lc5', 'lc6', 'lc7', 'lc8'].forEach(function (key) {
      if (!data.lc[key]) fail('TS-G14', key + ' empty');
    });
    data.v0.forEach(function (id) {
      var node = nodes[id];
      scanBreaker(node.title, id + ' title', failures);
      scanBreaker(node.body, id + ' body', failures);
      scanBreaker(node.caution, id + ' caution', failures);
      node.options.forEach(function (option) {
        scanBreaker(option.label, id + '/' + option.id, failures);
        scanBreaker(option.hint, id + '/' + option.id + ' hint', failures);
        scanBreaker(option.fact, id + '/' + option.id + ' fact', failures);
      });
    });
    Object.keys(results).forEach(function (id) {
      if (id.indexOf('ts_') !== 0) return;
      var res = results[id];
      ['title', 'explanation', 'avoid'].forEach(function (key) { scanBreaker(res[key], id + ' ' + key, failures); });
      (res.actions || []).forEach(function (action) { scanBreaker(action, id + ' action', failures); });
    });
    Object.keys(data.steps).forEach(function (fn) {
      Object.keys(data.steps[fn]).forEach(function (key) { scanBreaker(data.steps[fn][key].text, fn + ' ' + key, failures); });
    });
    records.forEach(function (record) {
      (record.our_instruction_text || []).forEach(function (line) { scanBreaker(line, record.id, failures); });
    });
    var powerTargets = nodes['ts.power.blank_screen'].options.filter(function (option) { return option.next === '@ts_power_breaker_pro'; }).map(function (option) { return option.id; });
    if (powerTargets.join('|') !== 'breaker_looks_tripped|other_power_off') fail('TS-G15', powerTargets.join('|'));
    if (typeof config().mirrorsEnabled !== 'boolean' || config().mirrorsEnabled !== false) fail('TS-G16', 'mirrorsEnabled');
    records.forEach(function (record) {
      if (recordRenderable(record, { mirrorsEnabled: config().mirrorsEnabled === true })) fail('TS-G16', record.id);
    });
    records.forEach(function (record) {
      if (!record.verified_by) fail('TS-G17', 'verified_by ' + record.id);
      var pair = !!record.second_check_by === !!record.second_check_on;
      if (!pair && (record.second_check_by || record.second_check_on)) fail('TS-G17', 'pair ' + record.id);
      if (record.second_check_by && record.second_check_on && !record.second_check_by) fail('TS-G17', 'pair ' + record.id);
      if ((record.second_check_by && !record.second_check_on) || (!record.second_check_by && record.second_check_on)) fail('TS-G17', 'pair ' + record.id);
      var key = record.id.split('.')[0];
      var cadence = SMART_KEYS[key] ? '90d' : '12m';
      if (record.recheck_cadence !== cadence) fail('TS-G17', 'cadence ' + record.id);
      if (record.recheck_due !== addCadence(record.verified_on, record.recheck_cadence)) fail('TS-G17', 'due ' + record.id + ' ' + record.recheck_due);
      if (record.second_check_by) {
        if (record.second_check_by === record.verified_by) fail('TS-G17', 'same checker ' + record.id);
        if (String(record.verified_on) < String(record.second_check_on)) fail('TS-G17', 'verified before check ' + record.id);
      }
    });
    serveDoc.TS_MIRROR_HOLD.forEach(function (row) {
      if (row.reason !== 'label_case' && row.reason !== 'unofficial_host') fail('TS-G17', row.id + ' reason');
    });
    collectCopy(nodes, results).forEach(function (pair) {
      if (String(pair[1] || '').indexOf('\u0027') !== -1) fail('TS-G18', pair[0]);
    });
    records.forEach(function (record) {
      if (record.source_host !== 'official' && record.source_host !== 'unofficial') fail('TS-G19', record.id);
      if (UNOFFICIAL_URLS.indexOf(record.source_url) !== -1 && record.source_host !== 'unofficial') fail('TS-G19', record.id + ' url');
      if (record.source_host === 'unofficial') {
        if (serveDoc.TS_MIRROR_SERVE.indexOf(record.id) !== -1) fail('TS-G19', 'served unofficial ' + record.id);
        if (!serveDoc.TS_MIRROR_HOLD.some(function (row) { return row.id === record.id; })) fail('TS-G19', 'hold ' + record.id);
      }
    });
    ['HW-FP6', 'HW-T5', 'ECB-ESS'].forEach(function (key) {
      Object.keys(data.steps).forEach(function (fn) {
        var cell = data.steps[fn][key];
        if (cell.mirrors && cell.mirrors.length) fail('TS-G19', fn + ' ' + key);
        if (!cell.text || !(cell.fallback && cell.fallback.length)) fail('TS-G19', 'text ' + fn + ' ' + key);
      });
    });
    if (failures.length) throw new Error(failures.join('\n'));
  }

  return {
    lc: data.lc,
    nodes: data.nodes,
    results: data.results,
    steps: data.steps,
    models: data.models,
    fallbacks: data.fallbacks,
    v0: data.v0,
    fnOf: data.fnOf,
    modelOf: data.modelOf,
    landingOf: data.landingOf,
    u1: data.u1,
    u2: data.u2,
    tellPro: data.tellPro,
    verifiedP1: data.verifiedP1,
    records: records,
    byId: byId,
    serve: serveDoc.TS_MIRROR_SERVE,
    hold: serveDoc.TS_MIRROR_HOLD,
    serveExpected: SERVE_EXPECTED,
    holdExpected: HOLD_EXPECTED,
    openReports: openReports,
    tsMirrorRenderable: recordRenderable,
    renderTsPanel: renderTsPanel,
    presentResult: presentResult,
    summary: summary,
    fillLc5: fillLc5,
    assertTs: assertTs,
    forbiddenScan: forbiddenScan,
    tsReachable: tsReachable,
    plainLc3: plainLc3
  };
});
