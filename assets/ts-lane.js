/* Thermostat lane helpers for ts.settings.v0.
 * Look-only settings help. No AI. Mirrors stay off until Commander flips the flag.
 * Legal strings are 02-on-page-copy.md rev 4. LC-15 (`ts_power_breaker_pro`) is new in rev 4.
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
  var FURNACE_WORD = /furnace (power )?switch/i;
  var FURNACE_ON = /\b(switch|turn) (it|the (furnace )?(power )?switch) (back )?on\b|\bflip/i;
  var FURNACE_OK = /^(Don’t|Do not|Never)|If it’s off, don’t|This check doesn’t include/;
  var LC15 = {
    title: 'A tripped breaker, a furnace switch that’s off, or missing power is a job for a pro.',
    explanation: 'This check doesn’t include resetting breakers or turning switches on, so a pro takes it from here. A tripped breaker, a furnace power switch that’s off, or no power to the heating and cooling equipment can have a cause that a licensed HVAC professional or electrician should find. A switch may have been turned off on purpose, for service or because of a problem, so ask a pro before it goes back on.',
    actions: [
      'Leave the breaker and the furnace switch as they are, and call a licensed HVAC professional or electrician.',
      'Tell the pro what you saw: which breaker looked tripped, that the furnace switch was off, or which equipment and lights had no power.',
      'If you smell burning or see smoke, get people away and call 911 from safety.'
    ],
    avoid: 'Don’t reset breakers, turn the furnace switch on, open the electrical panel, or open the furnace or outdoor unit.'
  };
  var GENERIC_CELLS = {
    'MODE|HW-T6': 1, 'MODE|ECB-ESS': 1,
    'HOLD|ECB-ESS': 1,
    'FAN|HW-T6': 1, 'FAN|ECB-ESS': 1, 'FAN|HW-RTH76': 1,
    'EHEAT|HW-T6': 1, 'EHEAT|ECB-ESS': 1,
    'WAIT|NEST-LT4': 1, 'WAIT|NEST-NT': 1, 'WAIT|NEST-LT3': 1, 'WAIT|NEST-E': 1,
    'WAIT|HW-T5': 1, 'WAIT|HW-T9': 1, 'WAIT|HW-TH4': 1, 'WAIT|ECB-PRM': 1, 'WAIT|ECB-ESS': 1,
    'BATT|AMZ-AST': 1, 'BATT|ECB-PRM': 1, 'BATT|ECB-ESS': 1,
    'ALERT|HW-T5': 1, 'ALERT|HW-T6': 1, 'ALERT|HW-FP6': 1, 'ALERT|HW-RTH76': 1, 'ALERT|HW-TH4': 1, 'ALERT|ECB-ESS': 1
  };
  (data.v1Generic || []).forEach(function (id) { GENERIC_CELLS[id] = 1; });
  var V1_FN = { OFFSET: 1, DIFF: 1, CPH: 1, AUTO: 1, RECOV: 1, SETBACK: 1, HPLOCK: 1, DEHUM: 1, SENSORS: 1, LATCH: 1, GEO: 1 };
  var V1_MODELS = (data.modelKeys || Object.keys(data.models || {})).slice();
  var TEXT_EXPECTED = {};
  var NODE_OF = {};
  Object.keys(data.fnOf).forEach(function (nodeId) { NODE_OF[data.fnOf[nodeId]] = nodeId; });
  Object.keys(data.steps).forEach(function (fn) {
    Object.keys(data.steps[fn]).forEach(function (key) {
      var cell = data.steps[fn][key];
      if (!cell.generic) TEXT_EXPECTED[fn + '|' + key] = cell.text || '';
    });
  });
  var AI_BAN = [
    'I understand the AI helper is automated',
    'AI-generated. Can be wrong.',
    'AI answer',
    'Live help isn'
  ];
  var HARD_FAIL = /\bgreen\b|guarantee|\bcertified\b|\bcure\b|you should be fine|safe to (keep|continue)|\bscrewdriver\b|multimeter|voltmeter|\bjumper\b|\bbypass\b|ladder|!|lawyer|attorney-reviewed/;
  var WARRANTY_OK = /installer/i;
  var PROHIB = /\b(breaker|capacitor|contactor|board|compressor|wiring|rewire|panel|fuse|float|refrigerant)\b|C wire|\bPEK\b|\bslider\b/i;
  var PROHIB_OK = /^(Don’t|Do not|No |Never)|stop|\bpro\b|professional|electrician|installer/i;
  var PROHIB_ALLOW = {
    'A breaker for the heating or cooling keeps tripping': 1,
    'Breaker for the HVAC keeps tripping.': 1,
    'A breaker for the heating or cooling looks tripped': 1,
    'A breaker for the HVAC looked tripped.': 1,
    'If a breaker for the heating or cooling looks tripped, choose that option.': 1,
    'If a breaker for the heating or cooling trips, leave it as it is and call a licensed professional.': 1,
    'This check doesn’t include resetting breakers or turning switches on, so a pro takes it from here.': 1,
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
    'Waiting For Equipment means the thermostat is holding off to protect the equipment.': 1,
    '**Second Wrench doesn’t guide these changes when it’s 40 °F (4 °C) or colder outside, or will be in the next few days.** That’s our own cautious cutoff, not a rating for your equipment.': 1,
    'Look only: write down the lockout settings': 1
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
  function fillSetting(template, name) {
    return String(template || '').split('[Setting]').join(name || 'this setting');
  }
  function lc18Text(cell) {
    var body = data.lc.lc18;
    if (cell && cell.omitLc38) return body;
    var needle = 'These are comfort settings.';
    var at = body.indexOf(needle);
    if (at < 0) return data.lc.lc38 + '\n' + body;
    return body.slice(0, at) + data.lc.lc38 + '\n' + body.slice(at);
  }
  function lc40Text(label) {
    return data.lc.lc40.split('[label]').join(label);
  }
  function panelPush(bag, cls, text) {
    if (!text) return;
    bag.parts.push({ cls: cls, text: text });
  }
  function panelAfter(bag, cls, text) {
    if (!text) return;
    bag.after.push({ cls: cls, text: text });
  }
  function finishPanel(fn, modelKey, cell, bag, extra) {
    extra = extra || {};
    bag.after = bag.after || [];
    function blocks(list) {
      return list.map(function (part) {
        return '<p class="' + part.cls + '">' + htmlLc3(part.text) + '</p>';
      }).join('');
    }
    var html = blocks(bag.parts);
    if (bag.steps.length) {
      html += '<ol class="ts-steps">' + bag.steps.map(function (step) { return '<li>' + htmlLc3(step) + '</li>'; }).join('') + '</ol>';
    }
    html += blocks(bag.after);
    var text = bag.parts.map(function (part) { return plainLc3(part.text); }).concat(bag.steps.map(plainLc3), bag.after.map(function (part) { return plainLc3(part.text); })).join('\n');
    return {
      fn: fn, modelKey: modelKey, cell: cell, served: [], steps: bag.steps,
      lc3: extra.lc3 || '', lc3Plain: plainLc3(extra.lc3 || ''),
      lc10: extra.lc10 || '', fallbacks: extra.fallbacks || [], lc6: extra.lc6 || '',
      generic: !!(cell && cell.generic) || !!extra.asGeneric, html: html, text: text
    };
  }
  function fallbacksFor(cell) {
    var fallbacks = [];
    if (!cell) return fallbacks;
    (cell.fallback || []).forEach(function (entry) {
      var line = fallbackLine(entry);
      if (line) fallbacks.push({ id: entry.id, section: entry.section, line: line, url: data.fallbacks[entry.id] ? data.fallbacks[entry.id].url : '' });
    });
    return fallbacks;
  }
  function renderV1Panel(modelKey, nodeId, opts) {
    opts = opts || {};
    var fn = data.fnOf[nodeId];
    var ui = data.wave2ui || {};
    var st = opts.state || {};
    var geo = !!(st.tsGeo || opts.tsGeo || st.product === 'wshp' || opts.lane === 'wshp');
    if (fn === 'HPLOCK' && ui.geoRenderGuard !== false && geo) {
      return renderV1Panel(modelKey, 'ts.look.geo_lockouts', opts);
    }
    var cell = fn && data.steps[fn] ? data.steps[fn][modelKey] : null;
    var installer = !!(cell && cell.installer_menu);
    var ack = !!(st.tsWarrantyAck || opts.tsWarrantyAck);
    var checked = !!(st.tsLc18 || opts.tsLc18);
    var reveal = opts.reveal === true || (ack && checked) || ui.stepsBeforeCheckbox === true;
    var held = !!(cell && (cell.kind === 'held' || cell.held));
    var latchOff = config().stageLatchStepsEnabled !== true;
    var asGeneric = !!(cell && cell.generic) || (held && latchOff && ui.renderHeldText !== true);
    var bag = { parts: [], steps: [], after: [] };
    var fallbacks = fallbacksFor(cell);
    if (!cell) return finishPanel(fn, modelKey, cell, bag, {});
    if (fn === 'GEO' || cell.geoLook) {
      if (cell.kind === 'text' && cell.text) {
        panelPush(bag, 'ts-lc29geo', data.lc.lc29geo);
        panelPush(bag, 'ts-p26', data.lc.p26);
        panelPush(bag, 'ts-lc23', data.lc.lc23);
        if (cell.neighbors) panelPush(bag, 'ts-neighbors', cell.neighbors);
        bag.steps.push(cell.text);
        panelAfter(bag, 'ts-lc22', data.lc.lc22);
        fallbacks.forEach(function (item) { panelAfter(bag, 'ts-lc9', item.line); });
        return finishPanel(fn, modelKey, cell, bag, { fallbacks: fallbacks });
      }
      asGeneric = true;
    }
    if (asGeneric) {
      panelPush(bag, 'ts-lc3', data.lc.lc3);
      if (fn === 'CPH') {
        panelPush(bag, 'ts-lc24', data.lc.lc24);
        panelPush(bag, 'ts-lc25', data.lc.lc25);
      }
      panelPush(bag, 'ts-lc10', data.lc.lc10);
      fallbacks.forEach(function (item) { panelPush(bag, 'ts-lc9', item.line); });
      if (cell.lc6_inline) panelPush(bag, 'ts-lc6', data.lc.lc6);
      if (ui.renderHeldText && cell.held_text) panelPush(bag, 'ts-held', cell.held_text);
      return finishPanel(fn, modelKey, cell, bag, { lc3: data.lc.lc3, lc10: data.lc.lc10, lc6: cell.lc6_inline ? data.lc.lc6 : '', fallbacks: fallbacks, asGeneric: true });
    }
    if (installer && !reveal) {
      panelPush(bag, 'ts-lc16', data.lc.lc16);
      return finishPanel(fn, modelKey, cell, bag, {});
    }
    if (installer) {
      panelPush(bag, 'ts-lc16', data.lc.lc16);
      panelPush(bag, 'ts-lc18', lc18Text(cell));
    }
    panelPush(bag, 'ts-lc3', data.lc.lc3);
    if (installer) panelPush(bag, 'ts-lc19', fillSetting(data.lc.lc19, cell.settingName));
    if (fn === 'DIFF') panelPush(bag, 'ts-lc20', fillSetting(data.lc.lc20, 'differential'));
    if (fn === 'CPH') {
      panelPush(bag, 'ts-lc20c', data.lc.lc20c);
      panelPush(bag, 'ts-lc24', data.lc.lc24);
      panelPush(bag, 'ts-lc25', data.lc.lc25);
    }
    if (fn === 'OFFSET') panelPush(bag, 'ts-lc21', data.lc.lc21);
    if (fn === 'HPLOCK' && cell.kind === 'text') {
      panelPush(bag, 'ts-lc29', data.lc.lc29);
      panelPush(bag, 'ts-lc29b', data.lc.lc29b);
      panelPush(bag, 'ts-lc29c', data.lc.lc29c);
      panelPush(bag, 'ts-lc29d', data.lc.lc29d);
      panelPush(bag, 'ts-lc29geo', data.lc.lc29geo);
      panelPush(bag, 'ts-lc29check', data.lc.lc29check);
      panelPush(bag, 'ts-lc31', data.lc.lc31);
      panelPush(bag, 'ts-lc30', data.lc.lc30);
      if (!cell.omitLc32) panelPush(bag, 'ts-lc32', data.lc.lc32);
      panelPush(bag, 'ts-lc33', data.lc.lc33);
    }
    if (fn === 'DEHUM') {
      panelPush(bag, 'ts-lc35', data.lc.lc35);
      panelPush(bag, 'ts-lc36', data.lc.lc36);
    }
    (cell.captions || []).forEach(function (line) { panelPush(bag, 'ts-caption', line); });
    if (installer) {
      panelPush(bag, 'ts-lc23', data.lc.lc23);
      if (cell.neighbors) panelPush(bag, 'ts-neighbors', cell.neighbors);
    }
    var ratedKnown = st.tsRatedMin === 'known' || opts.tsRatedMin === 'known' || ui.forceRatedMin === true;
    if (cell.text) bag.steps.push(cell.text);
    if (fn === 'LATCH' && !latchOff) {
      (data.latchBlocks || []).forEach(function (block) {
        if (block.model !== modelKey) return;
        bag.steps.push([block.label, block.does, block.undo].join('\n'));
      });
    }
    if (fn === 'HPLOCK' && ratedKnown && cell.ratedMinText) bag.steps.push(cell.ratedMinText);
    if (installer || cell.undo) panelAfter(bag, 'ts-lc22', data.lc.lc22);
    fallbacks.forEach(function (item) { panelAfter(bag, 'ts-lc9', item.line); });
    return finishPanel(fn, modelKey, cell, bag, { lc3: data.lc.lc3, fallbacks: fallbacks });
  }
  function optionVisible(option, state) {
    state = state || {};
    var ui = data.wave2ui || {};
    if (!option) return false;
    if (option.requiresFlag === 'stageLatchStepsEnabled' && config().stageLatchStepsEnabled !== true) return false;
    if (option.hiddenIf && option.hiddenIf.length) {
      if (ui.showHpAirInWshp && option.id === 'hp_air') return true;
      if (option.hiddenIf.indexOf('ts_geo') !== -1 && state.tsGeo) return false;
      if (option.hiddenIf.indexOf('wshp') !== -1 && (state.product === 'wshp' || state.tsLane === 'wshp')) return false;
    }
    return true;
  }
  function renderTsPanel(modelKey, nodeId, opts) {
    opts = opts || {};
    var fn = data.fnOf[nodeId];
    if (fn && V1_FN[fn]) return renderV1Panel(modelKey, nodeId, opts);
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
    var explanation = res.explanation;
    if (state.result === 'ts_screen_different') explanation = fillLc5(state.tsModel);
    if (state.result === 'ts_ask_installer_first') explanation = fillSetting(explanation, 'this setting');
    if (state.result === 'ts_stage_pro' && state.tsGeo && explanation.indexOf('Ask them to check the water side too.') === -1) {
      explanation += ' Ask them to check the water side too.';
    }
    var cardResults = { ts_new_install_installer: 1, ts_setup_check_pro: 1, ts_stage_pro: 1, ts_geo_pro: 1 };
    if (cardResults[state.result] && state.tsModel && data.cards && data.cards[state.tsModel]) {
      explanation += '\n' + data.cardIntro + ' ' + data.cards[state.tsModel];
    }
    if (explanation === res.explanation) return res;
    return Object.assign({}, res, { explanation: explanation });
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
      'Guide: Second Wrench thermostat check ts.settings.v1, ' + (contentVersion || '') + ', step panels: ' + (fns.join(', ') || 'none') + '.'
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
    (data.v1 || data.v0).forEach(function (id) {
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
      if (FURNACE_WORD.test(sentence) && FURNACE_ON.test(sentence) && !FURNACE_OK.test(sentence)) {
        failures.push('TS-G15: ' + where + ': ' + sentence);
      }
    });
  }
  function lcSentences() {
    var bag = {};
    Object.keys(data.lc || {}).forEach(function (key) {
      sentences(String(data.lc[key] || '').replace(/\*\*/g, '')).forEach(function (sentence) { bag[sentence] = 1; });
    });
    return bag;
  }
  var LC_SENTENCES = lcSentences();
  function inCard(sentence) {
    if (!data.cards) return false;
    var blob = (data.cardIntro || '') + '\n' + Object.keys(data.cards).map(function (key) { return data.cards[key]; }).join('\n');
    return blob.indexOf(sentence) !== -1;
  }
  function forbiddenScan(text, where) {
    var failures = [];
    var raw = String(text || '').replace(/\{step panel:[^}]+\}/g, ' ').replace(/\*\*/g, '');
    if (HARD_FAIL.test(raw)) failures.push('TS-A10: ' + where + ' hard fail');
    sentences(raw).forEach(function (sentence) {
      if (/\bwarranty\b/i.test(sentence) && !WARRANTY_OK.test(sentence)) failures.push('TS-A10: ' + where + ' warranty');
      if (LC_SENTENCES[sentence]) return;
      if (inCard(sentence)) return;
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
    var nodeKeys = Object.keys(data.nodes);
    if (!data.v1 || data.v1.length !== nodeKeys.length || data.v1.slice().sort().join('|') !== nodeKeys.slice().sort().join('|')) fail('TS-G1', 'TS_V1 drifted');
    (data.v1 || data.v0).forEach(function (id) {
      if (!nodes[id]) fail('TS-G1', 'missing ' + id);
      else if (nodes[id].diyTier !== 'basic') fail('TS-G1', id + ' diyTier');
    });
    var gates = { 'ts.gate.safety_stops': 1, 'ts.power.blank_screen': 1, 'ts.alert.capture': 1, 'ts.guard.cold_weather': 1 };
    (data.v1 || data.v0).forEach(function (id) {
      var on = !!(nodes[id] && nodes[id].safetyGate);
      if (on !== !!gates[id]) fail('TS-G2', id);
    });
    (data.v1 || data.v0).forEach(function (id) {
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
    (data.v1 || data.v0).forEach(function (id) { if (!seen[id]) fail('TS-G5', 'unreachable ' + id); });
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
    (data.v1 || data.v0).forEach(function (id) {
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
    (data.v1 || data.v0).forEach(function (id) { scanInstaller(nodes[id].body, id, failures); scanInstaller(nodes[id].title, id + ' title', failures); });
    Object.keys(data.steps).forEach(function (fn) {
      if (V1_FN[fn]) return;
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
    if (powerTargets.join('|') !== 'breaker_looks_tripped|furnace_switch_off|other_power_off') fail('TS-G15', powerTargets.join('|'));
    var powerPro = results.ts_power_breaker_pro;
    if (!powerPro || powerPro.title !== LC15.title || powerPro.explanation !== LC15.explanation || powerPro.avoid !== LC15.avoid || JSON.stringify(powerPro.actions) !== JSON.stringify(LC15.actions)) fail('TS-G15', 'LC-15');
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
        if (!((cell.text || cell.generic === true) && cell.fallback && cell.fallback.length)) fail('TS-G19', 'text ' + fn + ' ' + key);
      });
    });
    var genericSeen = {};
    Object.keys(data.steps).forEach(function (fn) {
      Object.keys(data.steps[fn]).forEach(function (key) {
        var id = fn + '|' + key;
        var cell = data.steps[fn][key];
        if (cell.generic === true) {
          genericSeen[id] = 1;
          if (!GENERIC_CELLS[id]) fail('TS-G20', 'extra generic ' + id);
          if (cell.text) fail('TS-G20', 'text ' + id);
          if (cell.mirrors && cell.mirrors.length) fail('TS-G20', 'mirrors ' + id);
          if (!(cell.fallback && cell.fallback.length)) fail('TS-G20', 'fallback ' + id);
          var panel = renderTsPanel(key, NODE_OF[fn]);
          if (panel.html.indexOf('ts-lc3') === -1 || panel.html.indexOf('ts-lc10') === -1 || panel.html.indexOf('ts-lc9') === -1) fail('TS-G20', 'panel ' + id);
          if (cell.lc6_inline && panel.html.indexOf('ts-lc6') === -1) fail('TS-G20', 'lc6 ' + id);
          if (panel.html.indexOf('<li>') !== -1 || panel.steps.length) fail('TS-G20', 'step ' + id);
        } else if (GENERIC_CELLS[id]) {
          fail('TS-G20', 'missing generic ' + id);
        } else if ((cell.text || '') !== TEXT_EXPECTED[id]) {
          fail('TS-G20', 'spec text ' + id);
        }
      });
    });
    Object.keys(GENERIC_CELLS).forEach(function (id) {
      if (!genericSeen[id]) fail('TS-G20', 'missing ' + id);
    });
    assertV1(nodes, results, fail);
    if (failures.length) throw new Error(failures.join('\n'));
  }
  function predsOf(nodes, target) {
    var found = [];
    Object.keys(nodes).forEach(function (id) {
      if (id.indexOf('ts.') !== 0 || !nodes[id]) return;
      nodes[id].options.forEach(function (option) {
        if (option.next === target) found.push(id + '/' + option.id);
      });
    });
    return found;
  }
  function revealed(model, nodeId, state) {
    return renderV1Panel(model, nodeId, { reveal: true, state: state || { tsWarrantyAck: true, tsLc18: true } });
  }
  function assertV1(nodes, results, fail) {
    var ui = data.wave2ui || {};
    var fresh = ['landing_short_cycling', 'landing_swings', 'landing_never_catches_up', 'landing_wrong_reading', 'landing_auto_mode', 'landing_backup_heat_cost', 'landing_humid', 'landing_stages'];
    var landing = nodes['ts.landing.picker'];
    if (!landing || landing.options.length !== 19) fail('TS-G23', 'landing count');
    else {
      var ids = landing.options.map(function (option) { return option.id; });
      var something = ids.indexOf('landing_something_else');
      fresh.forEach(function (id) { if (ids.indexOf(id) === -1 || ids.indexOf(id) > something) fail('TS-G23', id); });
      if (ids[ids.length - 1] !== 'hazard_now' || ids[something + 1] !== 'hazard_now') fail('TS-G23', 'tail');
    }
    var newIds = (data.v1 || []).filter(function (id) { return data.v0.indexOf(id) === -1; });
    if (newIds.length !== 24) fail('TS-G21', 'count ' + newIds.length);
    newIds.forEach(function (id) {
      if (!/^ts\.(diag|guard|step|look)\./.test(id)) fail('TS-G21', id);
      var node = nodes[id];
      if (!node) { fail('TS-G21', 'missing ' + id); return; }
      var tail = node.options.slice(-3).map(function (option) { return option.id; }).join('|');
      if (tail !== 'screen_looks_different|installer_setting_came_up|hazard_now') fail('TS-G21', id + ' tail');
    });
    Object.keys(nodes).forEach(function (id) {
      if (id.indexOf('ts.') !== 0) return;
      nodes[id].options.forEach(function (option) {
        if (typeof option.next === 'string' && option.next.charAt(0) === '@' && option.next.indexOf('@ts_') === 0) {
          if (!results[option.next.slice(1)]) fail('TS-G22', option.next);
        }
      });
    });
    var cold = nodes['ts.guard.cold_weather'];
    if (!cold || !cold.safetyGate) fail('TS-G24', 'safety_gate');
    if (cold) {
      cold.options.forEach(function (option) {
        if (option.next.charAt(0) !== '@' && !(option.id === 'guard_ok' && option.next === 'ts.guard.outdoor_rating')) fail('TS-G24', option.id);
      });
    }
    var coldPred = predsOf(nodes, 'ts.guard.cold_weather');
    var ratePred = predsOf(nodes, 'ts.guard.outdoor_rating');
    var lockPred = predsOf(nodes, 'ts.step.hp_lockouts');
    if (coldPred.join('|') !== 'ts.guard.hp_source/hp_air') fail('TS-G25', coldPred.join('|'));
    if (ratePred.join('|') !== 'ts.guard.cold_weather/guard_ok') fail('TS-G25', ratePred.join('|'));
    if (lockPred.join('|') !== 'ts.guard.outdoor_rating/only_backup_heat|ts.guard.outdoor_rating/raise_hp_min|ts.guard.outdoor_rating/lower_hp_min_rating_known') fail('TS-G25', lockPred.join('|'));
    var raise = nodes['ts.step.cph'] && nodes['ts.step.cph'].options.filter(function (option) { return option.id === 'want_raise_compressor'; })[0];
    if (!raise || raise.next !== '@ts_installer_guard') fail('TS-G26', 'raise');
    var lockTerms = ['Aux Heat Max Outdoor', 'Compressor Min Outdoor', 'Balance Point', 'Aux Heat Lock', 'ISU 355', 'ISU 356', 'Heat Pump Balance', 'AUX lockout', 'Aux Savings Optimization', 'Override For 2 Hours', 'Modify'];
    function termHit(text) {
      var raw = String(text || '');
      return lockTerms.filter(function (term) { return raw.indexOf(term) !== -1; });
    }
    Object.keys(data.steps).forEach(function (fn) {
      Object.keys(data.steps[fn]).forEach(function (key) {
        var cell = data.steps[fn][key];
        var allowed = fn === 'HPLOCK' || fn === 'GEO' || (fn === 'EHEAT' && key === 'ECB-PRM');
        if (allowed) return;
        var hits = termHit(cell.text);
        if (hits.length) fail('TS-G27', fn + ' ' + key + ' ' + hits[0]);
      });
    });
    V1_MODELS.forEach(function (model) {
      var cell = data.steps.HPLOCK[model];
      if (!cell || cell.kind !== 'text') return;
      var hidden = revealed(model, 'ts.step.hp_lockouts', { tsWarrantyAck: true, tsLc18: true });
      var shown = revealed(model, 'ts.step.hp_lockouts', { tsWarrantyAck: true, tsLc18: true, tsRatedMin: 'known' });
      if (hidden.text.indexOf(data.lc.lc30) === -1 || shown.text.indexOf(data.lc.lc30) === -1) fail('TS-G28', model + ' LC-30');
      var ratedBit = plainLc3(cell.ratedMinText || '').slice(0, 20);
      if (ratedBit && hidden.text.indexOf(ratedBit) !== -1) fail('TS-G28', model + ' rated hidden');
      if (ratedBit && shown.text.indexOf(ratedBit) === -1) fail('TS-G28', model + ' rated shown');
      if (ui.forceRatedMin) fail('TS-G28', 'forceRatedMin');
    });
    V1_MODELS.forEach(function (model) {
      Object.keys(V1_FN).forEach(function (fn) {
        var cell = data.steps[fn][model];
        if (!cell || !cell.installer_menu || cell.kind === 'held' || cell.generic) return;
        var closed = renderV1Panel(model, data.v1Fns[fn], {});
        var open = revealed(model, data.v1Fns[fn]);
        if (ui.stepsBeforeCheckbox) fail('TS-G29', 'steps before checkbox');
        if (cell.text && closed.text.indexOf(cell.text.slice(0, 24)) !== -1) fail('TS-G29', fn + ' ' + model + ' open early');
        if (open.text.indexOf('These are comfort settings.') === -1) fail('TS-G29', fn + ' ' + model + ' notice');
        var markers = [plainLc3(data.lc.lc16).slice(0, 24), plainLc3(data.lc.lc38).slice(0, 24), 'These are comfort settings.', plainLc3(data.lc.lc3).slice(0, 16)];
        if (cell.text) markers.push(plainLc3(cell.text).slice(0, 24));
        markers.push(plainLc3(data.lc.lc22).slice(0, 16));
        var at = -1;
        markers.forEach(function (marker) {
          var next = open.text.indexOf(marker);
          if (cell.omitLc38 && marker === plainLc3(data.lc.lc38).slice(0, 24)) return;
          if (next === -1 || next < at) fail('TS-G29', fn + ' ' + model + ' order ' + marker);
          if (next !== -1) at = next;
        });
        if (!cell.omitLc38 && open.text.indexOf(data.lc.lc38) === -1) fail('TS-G44', fn + ' ' + model);
        if (cell.omitLc38) fail('TS-G44', fn + ' ' + model + ' dropped');
        if (!cell.record_original || open.text.indexOf(data.lc.lc22) === -1) fail('TS-G30', fn + ' ' + model + ' undo');
        if (!cell.neighbors || open.text.indexOf(plainLc3(data.lc.lc23).slice(0, 20)) === -1 || open.text.indexOf(plainLc3(cell.neighbors).slice(0, 24)) === -1) fail('TS-G30', fn + ' ' + model + ' neighbors');
        if (!cell.entry) fail('TS-G40', fn + ' ' + model + ' entry');
      });
    });
    var offsetIn = predsOf(nodes, 'ts.step.offset');
    if (offsetIn.join('|') !== 'ts.diag.location/location_ok_steady_difference') fail('TS-G31', offsetIn.join('|'));
    V1_MODELS.forEach(function (model) {
      var panel = revealed(model, 'ts.step.cph');
      if (panel.text.indexOf(data.lc.lc24) === -1 || panel.text.indexOf(data.lc.lc25) === -1) fail('TS-G32', model);
      sentences(data.steps.CPH[model].text).forEach(function (sentence) {
        if (/raise|higher/i.test(sentence) && /365|366|Fn 9|Fn 10|\bCool\b|compressor/i.test(sentence) && !/^(Never|Don|Don’t)/.test(sentence)) fail('TS-G32', model + ' ' + sentence);
      });
    });
    if (data.cphUnknown !== 'compressor') fail('TS-G32', 'unknown stage');
    var g33 = /\b(safe|safely|safest|recommended|ideal|best)\b|correct setting|right for your system/i;
    collectCopy(nodes, results).forEach(function (pair) {
      var id = String(pair[0]);
      var v1copy = id.indexOf('ts.diag.') === 0 || id.indexOf('ts.guard.') === 0 || id.indexOf('ts.step.') === 0 || id.indexOf('ts.look.') === 0 || /^(OFFSET|DIFF|CPH|AUTO|RECOV|SETBACK|HPLOCK|DEHUM|SENSORS|LATCH|GEO) /.test(id);
      if (!v1copy && id.indexOf('ts_') !== 0) return;
      if (g33.test(String(pair[1] || ''))) fail('TS-G33', id);
    });
    ['ts_offset_done_basic', 'ts_differential_done_basic', 'ts_cph_done_basic', 'ts_hp_lockouts_done_basic', 'ts_stage_pro', 'ts_cold_weather_stop', 'ts_geo_pro'].forEach(function (id) {
      if (results[id] && g33.test(JSON.stringify(results[id]))) fail('TS-G33', id);
    });
    var policy = '40 °F (4 °C)';
    var policyBad = /freez|frost|compressor|rated|damage|can’t run|won’t run|stops working|efficien|threshold/i;
    ['guard_ok', 'guard_near_freezing'].forEach(function (id) {
      var option = cold && cold.options.filter(function (item) { return item.id === id; })[0];
      if (!option || option.label.indexOf(policy) === -1) fail('TS-G33', id + ' label');
      [option && option.label, option && option.fact].forEach(function (text) {
        var at = String(text || '').indexOf(policy);
        if (at !== -1 && policyBad.test(String(text).slice(Math.max(0, at - 120), at + 120 + policy.length))) fail('TS-G33', id + ' near policy');
      });
    });
    Object.keys(data.steps).forEach(function (fn) {
      if (!V1_FN[fn]) return;
      Object.keys(data.steps[fn]).forEach(function (key) {
        var cell = data.steps[fn][key];
        (cell.num_sources || []).forEach(function (src) {
          if (src.label !== 'MANUAL' && src.label !== 'TRADE' && src.label !== 'POLICY') fail('TS-G33', fn + ' ' + key + ' label');
          if (src.label === 'ESTIMATE') fail('TS-G33', 'estimate');
          if (src.label === 'TRADE' && typeof src.low === 'number' && typeof src.high === 'number' && typeof src.value === 'number') {
            if (src.value < src.low || src.value > src.high) fail('TS-G33', fn + ' ' + key + ' trade range');
          }
          if (src.typical && /compressor min/i.test(src.item || '')) fail('TS-G34', 'typical compressor min');
        });
      });
    });
    V1_MODELS.forEach(function (model) {
      var cell = data.steps.HPLOCK[model];
      if (!cell || cell.kind !== 'text') return;
      var panel = revealed(model, 'ts.step.hp_lockouts');
      if (panel.text.indexOf(data.lc.lc32) === -1) fail('TS-G34', model);
      if (panel.text.indexOf(data.lc.lc33) === -1) fail('TS-G49', model + ' LC-33');
      (cell.num_sources || []).forEach(function (src) {
        if (/compressor min/i.test(src.item || '') && src.label === 'TRADE') fail('TS-G34', model);
      });
      if (!/Wi-Fi|ISU 130|1060|online/.test(plainLc3(cell.text || ''))) fail('TS-G39', model);
      (cell.lc40 || []).forEach(function (label) {
        if ((cell.text || '').indexOf(lc40Text(label).replace(/\*\*/g, '')) === -1 && panel.text.indexOf(label) === -1) fail('TS-G51', model + ' ' + label);
        if (panel.text.indexOf(lc40Text(label).replace(/\*\*/g, '')) === -1) fail('TS-G51', model + ' ' + label);
      });
      if (!(cell.lc40 && cell.lc40.length)) fail('TS-G51', model + ' missing LC-40');
    });
    var advancedBlob = JSON.stringify({ nodes: newIds.map(function (id) { return nodes[id]; }), results: results });
    if (advancedBlob.indexOf('advancedRepairsEnabled') !== -1) fail('TS-G35', 'flag read');
    (data.v1 || []).forEach(function (id) { if (nodes[id] && nodes[id].diyTier === 'advanced') fail('TS-G35', id); });
    collectCopy(nodes, results).forEach(function (pair) {
      if (String(pair[1] || '').indexOf('\u0027') !== -1 && String(pair[0]).indexOf('ts.') === 0) fail('TS-G36', pair[0]);
    });
    if (config().stageLatchStepsEnabled !== false) fail('TS-G37', 'flag');
    if (ui.renderHeldText) fail('TS-G45', 'held text rendered');
    var latchNode = nodes['ts.diag.stages'];
    var latchOpt = latchNode && latchNode.options.filter(function (option) { return option.id === 'check_stage_settings'; })[0];
    if (!latchOpt || latchOpt.requiresFlag !== 'stageLatchStepsEnabled') fail('TS-G37', 'requires flag');
    if (!data.latchBlocks || !data.latchBlocks.length) fail('TS-G37', 'blocks');
    (data.latchBlocks || []).forEach(function (block) {
      if (!block.held) fail('TS-G37', block.id + ' held');
      if (!block.source || !block.page || !block.label || !block.does || !block.undo || !block.tier) fail('TS-G48', block.id);
      if (block.model === 'HW-T6' && !block.latching) fail('TS-G48', 't6');
      if (block.model === 'ECB-PRM' && block.latching) fail('TS-G48', 'ecobee latch');
      if (block.live) fail('TS-G42', block.id);
    });
    V1_MODELS.forEach(function (model) {
      var cell = data.steps.LATCH[model];
      if (model !== 'HW-T6' && model !== 'ECB-PRM' && cell.kind !== 'not_on_model') fail('TS-G48', model);
    });
    var eheat = data.steps.EHEAT['ECB-PRM'].text || '';
    var oldLine = /don.?t tap either/i.test(eheat);
    var lc34 = eheat.indexOf(data.lc.lc34.replace(/\*\*/g, '')) !== -1 || eheat.indexOf('Override For 2 Hours') !== -1;
    if (oldLine === lc34) fail('TS-G38', 'both or neither');
    if (lc34 && data.steps.HPLOCK['ECB-PRM'].kind !== 'text') fail('TS-G38', 'hplock');
    V1_MODELS.forEach(function (model) {
      if (model !== 'HW-T5') return;
      Object.keys(V1_FN).forEach(function (fn) {
        var t5 = data.steps[fn][model];
        if (t5.installer_menu) fail('TS-G40', 'T5 installer');
        if (t5.kind === 'text' && fn !== 'SETBACK') fail('TS-G40', 'T5 text');
      });
    });
    V1_MODELS.forEach(function (model) {
      var cell = data.steps.OFFSET[model];
      if (!cell || cell.kind !== 'text') return;
      if (cell.text.indexOf('Don’t go past 3 °F (1.5 °C) either way in total. A bigger difference is a job for a professional.') === -1) fail('TS-G41', model);
    });
    ['HW-RTH76'].forEach(function (model) {
      ['CPH', 'AUTO', 'RECOV'].forEach(function (fn) {
        var cell = data.steps[fn][model];
        if (cell.kind !== 'not_on_model' || !cell.held_text) fail('TS-G45', fn);
        var panel = renderV1Panel(model, data.v1Fns[fn], {});
        if (/to be confirmed|labels to be confirmed/i.test(panel.text)) fail('TS-G45', fn + ' rendered');
      });
    });
    var emailBlob = JSON.stringify({ nodes: nodes, results: results, steps: data.steps, lc: data.lc });
    if (emailBlob.indexOf('lonnie@secondwrench.co') !== -1) fail('TS-G46', 'lonnie');
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(emailBlob)) {
      var emails = emailBlob.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
      emails.forEach(function (email) { if (email !== 'support@secondwrench.co') fail('TS-G46', email); });
    }
    var latchPhrase = 'Finish on high stage (some brands call this \u201Clatching\u201D)';
    var userBits = [];
    (data.v1 || []).filter(function (id) { return data.v0.indexOf(id) === -1; }).forEach(function (id) {
      var node = nodes[id];
      userBits.push(node.title, node.body);
      node.options.forEach(function (option) { userBits.push(option.label, option.hint, option.fact, option.id); });
    });
    Object.keys(results).forEach(function (id) { if (id.indexOf('ts_') === 0) userBits.push(JSON.stringify(results[id])); });
    (data.latchBlocks || []).forEach(function (block) { userBits.push(block.label, block.does, block.undo); });
    Object.keys(V1_FN).forEach(function (fn) {
      V1_MODELS.forEach(function (model) {
        var cell = data.steps[fn][model];
        userBits.push(cell.text, cell.held_text, (cell.captions || []).join('\n'));
      });
    });
    var latchBlob = userBits.join('\n');
    var stripped = latchBlob.split(latchPhrase).join('');
    if (/latching/i.test(stripped)) fail('TS-G47', 'bare latching');
    ['starts on high', 'always starts', 'start on stage 2', 'straight to', 'every call', 'whole call', 'never on low', 'always_high'].forEach(function (phrase) {
      if (latchBlob.toLowerCase().indexOf(phrase) !== -1) fail('TS-G47', phrase);
    });
    var stageBlob = latchBlob;
    ['shows stage', 'stage indicator', 'display says stage', 'Stage 2 on the screen', 'screen shows high'].forEach(function (phrase) {
      if (stageBlob.toLowerCase().indexOf(phrase.toLowerCase()) !== -1) fail('TS-G50', phrase);
    });
    var geo = nodes['ts.look.geo_lockouts'];
    if (!geo || geo.options.some(function (option) { return String(option.next).indexOf('ts.step.') === 0; })) fail('TS-G43', 'geo edge');
    var hpGeo = nodes['ts.guard.hp_source'].options.filter(function (option) { return option.id === 'hp_geo'; })[0];
    var hpAir = nodes['ts.guard.hp_source'].options.filter(function (option) { return option.id === 'hp_air'; })[0];
    if (!hpGeo || hpGeo.next !== 'ts.look.geo_lockouts') fail('TS-G43', 'hp_geo');
    if (!hpAir || !hpAir.hiddenIf || hpAir.hiddenIf.join('|') !== 'ts_geo|wshp') fail('TS-G43', 'hidden');
    if (ui.showHpAirInWshp || optionVisible(hpAir, { product: 'wshp' }) || optionVisible(hpAir, { tsGeo: true })) fail('TS-G43', 'air visible');
    if (ui.geoRenderGuard === false) fail('TS-G43', 'render guard off');
    var geoPanel = renderV1Panel('HW-T6', 'ts.step.hp_lockouts', { state: { tsGeo: true } });
    if (geoPanel.text.indexOf(data.lc.p26) === -1 || geoPanel.text.indexOf('lower 356') !== -1) fail('TS-G43', 'render');
    ['HW-T6', 'ECB-PRM'].forEach(function (model) {
      var cell = data.steps.GEO[model];
      var panel = renderV1Panel(model, 'ts.look.geo_lockouts', {});
      var order = [plainLc3(data.lc.lc29geo).slice(0, 20), plainLc3(data.lc.p26).slice(0, 20), plainLc3(data.lc.lc23).slice(0, 12), plainLc3(cell.neighbors).slice(0, 16), plainLc3(cell.text).slice(0, 16), plainLc3(data.lc.lc22).slice(0, 12)];
      var at = -1;
      order.forEach(function (marker) {
        var next = panel.text.indexOf(marker);
        if (next === -1 || next < at) fail('TS-G43', model + ' order');
        if (next !== -1) at = next;
      });
      if (/\b(lower|raise|set|change it to|move)\b/i.test(cell.text) && !/Don.t change/.test(cell.text)) fail('TS-G43', model + ' verb');
    });
    var changeNames = ['ISU 356', 'Aux Heat Max Outdoor Temp', 'Heat Pump Balance', 'AUX lockout', 'ISU 355', 'Compressor Min Outdoor Temp'];
    Object.keys(V1_FN).forEach(function (fn) {
      if (fn === 'HPLOCK' || fn === 'GEO') return;
      V1_MODELS.forEach(function (model) {
        var text = data.steps[fn][model].text || '';
        changeNames.forEach(function (name) { if (text.indexOf(name) !== -1) fail('TS-G49', fn + ' ' + model + ' ' + name); });
      });
    });
  }

  return {
    lc: data.lc,
    nodes: data.nodes,
    results: data.results,
    steps: data.steps,
    models: data.models,
    fallbacks: data.fallbacks,
    v0: data.v0,
    v1: data.v1,
    wave2ui: data.wave2ui,
    latchBlocks: data.latchBlocks,
    cards: data.cards,
    cardIntro: data.cardIntro,
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
    optionVisible: optionVisible,
    presentResult: presentResult,
    summary: summary,
    fillLc5: fillLc5,
    assertTs: assertTs,
    forbiddenScan: forbiddenScan,
    tsReachable: tsReachable,
    plainLc3: plainLc3
  };
});
