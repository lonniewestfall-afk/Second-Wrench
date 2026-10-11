/* Authoring source for ts.settings.v1. Run once on ts.settings.v0 data.
 * Legal copy is 02 rev 8. Stages copy is spec v2.1 (the withdrawn landing label is not used).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dataPath = path.join(root, 'assets/ts-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
if (data.v1) throw new Error('ts-data.json is already v1');

function u(value) {
  return String(value == null ? '' : value).replace(/'/g, '\u2019');
}
const LATCH = 'Finish on high stage (some brands call this \u201Clatching\u201D)';
const MODELS = data.modelKeys.slice();
const T6ISU = 'https://customer.resideo.com/resources/techlit/TechLitDocuments/33-00000s/33-00392EFS.pdf';
const T5PD = 'https://customer.resideo.com/resources/techlit/TechLitDocuments/33-00000s/33-00474.pdf';
const FPISU = 'https://customer.resideo.com/resources/techlit/TechLitDocuments/69-0000s/69-1920EFS.pdf';
const THISU = 'https://customer.resideo.com/resources/techlit/TechLitDocuments/69-0000s/69-1849.pdf';
const RTH = 'https://customer.resideo.com/resources/techlit/TechLitDocuments/69-0000s/69-2206ES.pdf';
const TR1 = 'https://www.hvacrschool.com/cycle-rate-settings-a-quick-review/';
const TR3 = 'https://www.bpa.gov/-/media/Aep/energy-efficiency/residential/residential-ptcs-essentials/notes-on-auxiliary-heat-controls-and-thermostat.pdf';
const ECB = 'https://downloads.ctfassets.net/a3qyhfznts9y/55gpc6jhRTJ7KjXDjxDRzu/ad17b04461596be3b00b9c65d6e3a895/ecobee_Premium_install-setup-user_manual_v1.pdf';
const CHECKED = 'October 11, 2026';
const CAP = 'Don\u2019t go past 3 °F (1.5 °C) either way in total. A bigger difference is a job for a professional.';
const KEEP = 'Keep the note with the values you changed and what they were before. If anything gets worse later, put the old values back.';
const LC32 = 'Make sure backup heat can always run when the heat pump is locked out. The backup heat maximum must be the same as or higher than the heat pump minimum. If you\u2019re not sure how they fit together, stop and put back the values you wrote down.';
const LC33 = 'If your home isn\u2019t keeping up with heat, put back the values you wrote down right away. If it still can\u2019t keep up, call a licensed HVAC professional. If it\u2019s dangerously cold and anyone is at risk, get them somewhere warm first.';
const LC30 = 'Check your outdoor unit\u2019s manual first. Find the lowest outdoor temperature it\u2019s rated to run in. Don\u2019t set this below that number. If you don\u2019t have the manual or can\u2019t find the rating, stop and leave this setting as it is.';
const WATCH_HP = '**Watch:** for the next few days above your new backup heat limit, backup heat shouldn\u2019t run except briefly during defrost, and the house should keep up.';
const STOP_HP = '**Stop** right away if the house gets cold. ' + LC33;

function lc40(label) {
  return 'If the house is getting cold and neither the heat pump nor backup heat is running, put **' + label + '** back to the value you wrote down right away, then call a licensed HVAC professional. If it\u2019s dangerously cold and anyone is at risk, get them somewhere warm first.';
}

data.lc.lc16 = '**Is your system less than a year or two old, or still under an installer\u2019s warranty?** Some installers and equipment warranties don\u2019t cover problems after settings are changed from how they were set up. If you\u2019re not sure, ask your installer first.';
data.lc.lc17 = 'Good call. Ask your installer whether you can change [Setting], and what value they recommend. Come back anytime.';
data.lc.lc18 = 'Before you change anything:\n**Write down the current value** of every setting you\u2019ll change. You\u2019ll need it to put things back.\n**Change only the setting named in these steps.** Installer menus also hold settings that protect your equipment. Don\u2019t change anything else, even if it\u2019s on the same screen.\n**If anything looks different from these steps, stop.** Press back or exit the menu without saving.\nThese are comfort settings. They can change how often your system turns on and off, which affects wear on the equipment.';
data.lc.lc18check = 'I wrote down my current settings, and I\u2019ll change only the setting named here.';
data.lc.lc19 = 'Change [Setting] one step at a time, then wait a day before changing it again. Watch how the system runs. If it starts turning on and off more often, or the room gets uncomfortable, put back the value you wrote down.';
data.lc.lc20 = 'A wider [Setting] means fewer starts and bigger temperature changes in the room. A narrower one means more starts, which is harder on your equipment.';
data.lc.lc20c = 'A lower cycles-per-hour number means fewer starts. A higher number means more starts, which is harder on your equipment.';
data.lc.lc21 = 'An offset changes what the thermostat shows. It doesn\u2019t fix a sensor problem. If the reading seems far off, or keeps drifting, call a professional.';
data.lc.lc22 = 'To undo, go back to the same setting and enter the value you wrote down. If you can\u2019t get back to how it was, or you think you changed something else by mistake, stop and call a licensed HVAC professional. Don\u2019t use a factory reset to fix it. That can erase your system\u2019s setup.';
data.lc.lc23 = '**Don\u2019t change these. They protect your equipment and safety, and they\u2019re for professionals only:**\nCompressor protection or minimum off time\nSystem, equipment, or fuel type (including heat pump, furnace, boiler, gas, electric, or oil)\nFan operation for gas or electric heat (often shown as HG/HE or Fan in Heat)\nThe changeover point on a gas furnace plus heat pump system (often called dual fuel)\nHeat pump reversing valve (often shown as O/B)\nAnything about wiring, terminals, or accessories (humidifier, dehumidifier, ventilation)\nRaising the cooling or heat pump cycle rate (CPH) above where it was set\nIf a step would take you to one of these, stop. If you see a password or code prompt, stop. That menu is for installers.';
data.lc.lc24 = 'You can lower your cooling or heat pump cycle rate, within the range in your thermostat\u2019s manual. A lower number means fewer starts, which is easier on the outdoor unit. Don\u2019t raise it above the number it was set to. Raising it is a job for a professional.';
data.lc.lc25 = 'You can raise or lower the cycle rate for your furnace or boiler heat, within the range in your thermostat\u2019s manual. A higher number means shorter, more frequent cycles. A lower number means longer cycles and bigger temperature swings.';
data.lc.lc26 = 'Your thermostat\u2019s range for this setting: [low] to [high]. Source: [source title], [page or section] ([link]). Checked [Month D, YYYY].';
data.lc.lc27 = 'Typical starting point: [value] ([source name], [link]). This is a common starting value, not a setting chosen for your home or equipment. Stay within your thermostat\u2019s range, and put back your old value if anything gets worse.';
data.lc.lc28 = 'Typical starting point: [value] ([source name], [link]). We haven\u2019t confirmed this model\u2019s range. Check your manual before using it.';
data.lc.lc29 = 'These settings decide when your heat pump runs and when backup heat takes over. A wrong value can raise your bills, run your outdoor unit colder than it\u2019s built for, or leave your home without enough heat in cold weather.';
data.lc.lc29b = '**Second Wrench doesn\u2019t guide these changes when it\u2019s 40 °F (4 °C) or colder outside, or will be in the next few days.** That\u2019s our own cautious cutoff, not a rating for your equipment.';
data.lc.lc29c = '**If anyone at home is an infant, elderly, or medically fragile, leave these to a professional.**';
data.lc.lc29d = '**If you have a gas furnace with your heat pump, stop.** That setup is for a professional.';
data.lc.lc29geo = '**If your heat pump is geothermal or water-source, stop.** These settings work differently on those systems. Ask a professional.';
data.lc.lc29check = 'It\u2019s warmer than 40 °F (4 °C) outside and will stay that way for the next few days, I wrote down my current values, and I\u2019ll change only the setting named here.';
data.lc.lc30 = LC30;
data.lc.lc31 = 'Raising this lets backup heat run in milder weather. Backup heat usually costs more to run, so your bills can go up. Lowering it uses backup heat less, but your home may not keep up when it gets cold.';
data.lc.lc32 = LC32;
data.lc.lc33 = LC33;
data.lc.lc34 = '**Override For 2 Hours** and **Modify** change your backup heat settings. Follow the backup heat steps and cautions above before using them.';
data.lc.lc35 = 'Dehumidify settings can make rooms cooler than your setpoint and make the system run longer, which can raise your bills. Change one setting at a time and watch how the house feels for a day.';
data.lc.lc36 = 'A slower fan pulls out more moisture but moves less air. If you see ice on the copper lines or the indoor unit, set cooling to Off, don\u2019t chip the ice, and call a licensed HVAC professional.';
data.lc.lc38 = 'If your thermostat doesn\u2019t let you leave without saving, put back the value you wrote down before you leave the menu.';
data.lc.lc39 = 'Second Wrench doesn\u2019t guide these changes when it\u2019s 40 °F (4 °C) or colder outside, or will be in the next few days. That\u2019s our own cautious cutoff, not a rating for your equipment. If anyone at home is an infant, elderly, or medically fragile, leave these to a professional.\nIf your home isn\u2019t keeping up with heat now, call a licensed HVAC professional. If it\u2019s dangerously cold and anyone is at risk, get them somewhere warm first.';
data.lc.lc40 = 'If the house is getting cold and neither the heat pump nor backup heat is running, put **[label]** back to the value you wrote down right away, then call a licensed HVAC professional. If it\u2019s dangerously cold and anyone is at risk, get them somewhere warm first.';
data.lc.p26 = 'You can look, but don\u2019t change anything. Open the menu in the steps below, write down what it shows, then leave the menu without changing anything.';

Object.assign(data.fallbacks, {
  'F-HW-T5-PD': { title: 'T5+ Smart Product Data 33-00474', url: T5PD },
  'F-HW-T6-ISU': { title: 'T6 Pro Smart Professional Install Guide 33-00392EFS', url: T6ISU },
  'F-HW-FP6-ISU': { title: 'FocusPRO TH6000 Installation Guide 69-1920EFS', url: FPISU },
  'F-HW-TH4-ISU': { title: 'PRO 4000 Series Installation Guide 69-1849', url: THISU },
  'F-HW-RTH-ISU': { title: 'RTH7600 Installation Instructions 69-2206ES', url: RTH },
  'F-NEST-HPB': { title: 'Google Nest Help: Heat Pump Balance', url: 'https://support.google.com/googlenest/answer/9248719' },
  'F-NEST-EARLY': { title: 'Google Nest Help: Early-On', url: 'https://support.google.com/googlenest/answer/9246532' },
  'F-NEST-SUN': { title: 'Google Nest Help: Sunblock', url: 'https://support.google.com/googlenest/answer/9249796' },
  'F-NEST-SENSE': { title: 'Google Nest Help: thermostat settings', url: 'https://support.google.com/googlenest/answer/9244728' },
  'F-NEST-SENSOR': { title: 'Google Nest Help: Temperature Sensor', url: 'https://support.google.com/googlenest/answer/9235225' },
  'F-TR-1': { title: 'HVAC School: Cycle Rate Settings – A Quick Review', url: TR1 },
  'F-TR-3': { title: 'BPA: Notes on Auxiliary Heat Controls and Thermostats', url: TR3 },
  'F-AMZ-TEMP': { title: 'Amazon Help: The Amazon Smart Thermostat Shows the Wrong Temperature', url: 'https://www.amazon.com/gp/help/customer/display.html?nodeId=Tp4B91Hrurr1b69i26' }
});

const FBID = {
  'NEST-LT4': 'F-NEST-HPB', 'NEST-NT': 'F-NEST-HPB', 'NEST-LT3': 'F-NEST-SENSE', 'NEST-E': 'F-NEST-SENSE',
  'HW-T5': 'F-HW-T5-PD', 'HW-T6': 'F-HW-T6-ISU', 'HW-T9': 'F-HW-T9', 'ECB-PRM': 'F-ECB-MAN', 'ECB-ESS': 'F-ECB-HELP',
  'HW-FP6': 'F-HW-FP6-ISU', 'HW-RTH76': 'F-HW-RTH-ISU', 'HW-TH4': 'F-HW-TH4-ISU', 'HW-X2P': 'F-HW-X2P', 'AMZ-AST': 'F-AMZ-TEMP'
};
function fb(model, section, id) {
  return [{ id: id || FBID[model], section: section || 'manual' }];
}
function cap26(low, high, title, page, link) {
  return data.lc.lc26.replace('[low]', low).replace('[high]', high).replace('[source title]', title).replace('[page or section]', page).replace('[link]', link).replace('[Month D, YYYY]', CHECKED);
}
function cap27(value, name, link) {
  return data.lc.lc27.replace('[value]', value).replace('[source name]', name).replace('[link]', link);
}
function cap28(value, name, link) {
  return data.lc.lc28.replace('[value]', value).replace('[source name]', name).replace('[link]', link);
}

const NEI = {
  'HW-T5': 'ISU **200 System Type**, **205 Equipment Type**, **218 Reversing Valve**, **220 Cool Stages**, **221 Heat Stages/Aux/E Stages**, **230 Fan Control**, and any ISU about filters, UV, or accessories (1018, 1100–1106). Raising **365** or **366** above the current value.',
  'HW-T6': 'ISU **200**, **205**, **218**, **220**, **221**, **230**, **253 Aux/E Control**, **255 Aux Heat Type**, **256 EM Heat Type**, **260 Fossil Kit Control**, **340 Aux Heat Droop**, **350 Up Stage Timer Aux Heat**, **387 Compressor Protection**, **305** / **306** (held). Raising **365** or **366**.',
  'HW-T9': 'Advanced setup > modify configuration: ISU **2000 System Type**, **2010 Equipment**, **2060 Reversing**, **2070 Cool / Heat stages**, accessory ISUs (**8100**, **9120**). Only 4090 is touched in Advanced setup. Offset is done in Preferences, not ISU 14020.',
  'ECB-PRM': 'Installation Settings > **Equipment** (all of it). Thresholds: **Compressor Minimum Cycle Off Time**, **Compressor Minimum On Time**, **Heat Minimum On Time**, **Aux Heat Minimum On Time**, **Compressor to Aux Temperature Delta**, **Compressor to Aux Runtime**, **Compressor Stage 2 Temperature Delta**, **Compressor Stage 1 Max Runtime**, **Compressor Reverse Staging**, **Heat Stage 2 Temperature Delta**, **Heat Stage 1 Max Runtime**, **Aux Stage 2 Temperature Delta**, **Aux Reverse Staging**, **Thermal Protect**, **Configure Staging** (leave Automatic or Manual as you found it).',
  'HW-FP6': 'Function **1 System type**, **2 Changeover valve**, **3 Fan control**, **15 Compressor protection**. Raising **9** or **10**.',
  'HW-TH4': 'Function **1 System type**, **15 Compressor protection**. Raising **9**.',
  'HW-RTH76': 'Function **0170 Select System**, **0180 Heating Fan**, **0190 Heat Pump** (changeover).',
  'HW-X2P': 'ISU **2000 Heating System Type**, **2010 Heating Equipment Type**, **2060 Reversing Valve O/B**, **2070 Cool Stages**, **2071 Heat Stages/Backup Heat Stages**, **2180 Aux Backup Heat Type**, **4103 Minimum Heat Setpoint**.',
  'NEST-LT4': 'Settings > Equipment (heat configuration, wiring, system details). Advanced configuration: **Compressor lockout time**, **Minimum compressor on time**, **Minimum heat on time**, **Aux upstage timer**, **Droop**, **Minimum delay**. Dual-fuel lockout.',
  'NEST-NT': 'Settings > Equipment (heat configuration, wiring, system details). Advanced configuration: **Compressor lockout time**, **Minimum compressor on time**, **Minimum heat on time**. Dual-fuel lockout.',
  'NEST-LT3': 'Settings > Equipment (heat configuration, wiring, system details). Advanced configuration: **Compressor lockout time**, **Minimum compressor on time**, **Minimum heat on time**. Dual-fuel lockout.',
  'NEST-E': 'Settings > Equipment (heat configuration, wiring, system details). Advanced configuration: **Compressor lockout time**, **Minimum compressor on time**, **Minimum heat on time**. Dual-fuel lockout.',
  'AMZ-AST': 'Device Settings > Thermostat Configuration (every item other than Emergency Heat).'
};
function neighbors(model, fn) {
  let line = NEI[model] || '';
  if (model === 'ECB-PRM' && fn !== 'HPLOCK') line += ' Also leave **Aux Heat Max Outdoor Temperature** and **Compressor Min Outdoor Temperature** as you found them.';
  return line;
}

const HAZARD = {
  id: 'hazard_now',
  label: 'New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, or water at electrical parts)',
  next: '@ts_hazard_now',
  hint: 'Stop. Don\u2019t keep checking.',
  fact: 'New hazard reported during the thermostat check.',
  gate: 'ts_new_hazard'
};
const TAIL = [
  { id: 'screen_looks_different', label: 'My screen looks different', next: '@ts_screen_different', hint: 'Stop here. We\u2019ll point you to the maker\u2019s help.', fact: 'Thermostat screen did not match the guide.', gate: null },
  { id: 'installer_setting_came_up', label: 'A step or screen is asking about a setting on the \u201CDon\u2019t change these\u201D list, or for a password or code', next: '@ts_installer_guard', hint: 'Don\u2019t change it.', fact: 'Locked installer setting came up.', gate: null },
  HAZARD
];
function opt(id, label, next, hint, fact, extra) {
  return Object.assign({ id: id, label: u(label), next: next, hint: hint ? u(hint) : '', fact: fact ? u(fact) : '', gate: null }, extra || {});
}
function node(id, section, title, body, options, safety) {
  data.nodes[id] = {
    section: section, title: u(title), body: u(body), options: options,
    caution: '', diyTier: 'basic', safetyGate: !!safety
  };
}
function withTail(list) { return list.concat(TAIL); }

const WTY = [
  opt('wty_ask_installer', 'Ask my installer first', '@ts_ask_installer_first', '', 'Asked the installer before changing a comfort setting.'),
  opt('wty_not_sure', 'Not sure', '@ts_ask_installer_first', '', 'Not sure about the installer warranty.')
];
function doneOpts(resultId, extra) {
  const list = WTY.concat([
    opt('done_better', 'Done, and it\u2019s better after a day or so', resultId, '', 'Comfort change helped after a day or so.'),
    opt('no_change', 'I changed it, and nothing\u2019s better', '@ts_comfort_not_fixed_pro', '', 'Comfort change did not help.'),
    opt('worse_put_back', 'It got worse, so I put the old value back', '@ts_comfort_not_fixed_pro', '', 'Put the old comfort value back.'),
    opt('not_on_my_model', 'My thermostat doesn\u2019t have this setting', '@ts_not_on_your_model', '', 'Setting not on this thermostat.')
  ]);
  return withTail(list.concat(extra || []));
}
function homeOpts(resultId) {
  return withTail([
    opt('done_better', 'Done, and it\u2019s better after a day or so', resultId, '', 'Comfort change helped after a day or so.'),
    opt('no_change', 'I changed it, and nothing\u2019s better', '@ts_comfort_not_fixed_pro', '', 'Comfort change did not help.'),
    opt('not_on_my_model', 'My thermostat doesn\u2019t have this setting', '@ts_not_on_your_model', '', 'Setting not on this thermostat.')
  ]);
}

const RECOV_TAIL = ' Write down On or Off first. **Watch:** the next few mornings. On: the house should be at temperature at the schedule time, and the screen may show Recovery or In Recovery before it. Off: it should start at the schedule time. It may take a few days to learn. **Stop** if the house stays cold or the bill rises; put it back.';
const SETBACK_LEAD = 'On a heat pump, make the night or away temperature change smaller, one step at a time, and let recovery start early instead of setting the morning time earlier by hand. Watch a few mornings: does backup heat come on less, and is the house warm on time? Stop and put the old schedule back if mornings get cold. ';
const DEHUM_CLAIM = 'These settings can help lower indoor humidity. ';
const CPH_RULES = '4. Too many short cycles: lower the number by 1. Furnace or boiler only: if the room swings or overshoots, you can raise the heat number by 1. Never raise 365 or 366. ';
const CPH_WATCH = '**Watch:** count starts for an hour in similar weather, before and after; give it a day. **Stop** if it starts more often, the room gets uncomfortable, or nothing changes after two days. Put back your numbers.';

function blankCell(model, section) {
  return { step_ids: [], status: [], mirrors: [], text: '', generic: true, fallback: fb(model, section), lc6_inline: false, kind: 'not_on_model', installer_menu: false, held: false };
}
function textCell(model, text, extra) {
  extra = extra || {};
  return Object.assign({
    step_ids: [], status: extra.installer_menu ? ['U'] : ['H'], mirrors: [], text: u(text), generic: false,
    fallback: extra.fallback || fb(model, extra.section || 'manual'), lc6_inline: false, kind: 'text',
    installer_menu: !!extra.installer_menu, held: false, settingName: extra.settingName || '',
    neighbors: extra.installer_menu ? neighbors(model, extra.fn) : '',
    record_original: !!extra.installer_menu, undo: !!extra.installer_menu,
    captions: extra.captions || [], num_sources: extra.num_sources || [],
    ratedMinText: extra.ratedMinText ? u(extra.ratedMinText) : '',
    lc40: extra.lc40 || [], entry: extra.entry || '', omitLc38: false, steps: extra.steps || null
  }, extra.more || {});
}
function pointerCell(model, text, section) {
  return { step_ids: [], status: ['H'], mirrors: [], text: u(text), generic: false, fallback: fb(model, section), lc6_inline: false, kind: 'pointer', installer_menu: false, held: false, settingName: '', neighbors: '', captions: [], num_sources: [] };
}

const NESTS = ['NEST-LT4', 'NEST-NT', 'NEST-LT3', 'NEST-E'];
const steps = { OFFSET: {}, DIFF: {}, CPH: {}, AUTO: {}, RECOV: {}, SETBACK: {}, HPLOCK: {}, DEHUM: {}, SENSORS: {}, LATCH: {}, GEO: {} };

const offsetT6 = '1. Press and hold **Menu** for 5 seconds, then choose the ISU menu. 2. Step to ISU **1420 Temp Offset**. Change nothing else. 3. Write down the number shown (0 means no offset). 4. If the thermostat reads warmer than your thermometer, choose a minus number; if it reads colder, a plus number. Move one step (1 °F or 0.5 °C) at a time, up to the difference you measured. ' + CAP + ' 5. Save and go back to the home screen. **Watch:** tomorrow, repeat the thermometer check at both times of day. They should match within about a degree. **Stop** if the difference is bigger than the range, changes from day to day, or comes back. Put back your old number and call a pro.';
const offsetT9 = '1. Touch the screen, then **MENU**. 2. Scroll to **Preferences**. 3. Choose **Indoor display offsets**, then temperature. 4. Write down the number shown, then move one step (1 °F) toward the difference you measured: minus if the thermostat reads warm, plus if it reads cold. ' + CAP + ' **Watch:** tomorrow, repeat the thermometer check at both times of day. They should match within about a degree. **Stop** if the difference is bigger than the range, changes from day to day, or comes back. Put back your old number and call a pro. Don\u2019t use Advanced setup for this.';
const offsetEcb = '1. Go to **MAIN MENU** > **SETTINGS** > **INSTALLATION SETTINGS** > **THRESHOLDS**. 2. Choose **TEMPERATURE CORRECTION**. Change nothing else on Thresholds. 3. Write down the value. 4. Move one step toward the difference you measured. ' + CAP + ' If you have room sensors, compare your thermometer with the thermostat\u2019s own sensor reading (**MAIN MENU** > **SETTINGS** > **SENSORS**), not the average. 5. Go back to save. **Watch:** tomorrow, repeat the thermometer check at both times of day. They should match within about a degree. **Stop** if the difference is bigger than the range, changes from day to day, or comes back. Put back your old number and call a pro.';
steps.OFFSET['HW-T6'] = textCell('HW-T6', offsetT6, { installer_menu: true, fn: 'OFFSET', settingName: 'the temperature offset', section: 'PDF p.17', entry: 'Menu', captions: [cap26('\u22123 °F', '3 °F (\u22121.5 °C to 1.5 °C)', 'T6 Pro Smart Professional Install Guide 33-00392EFS', 'PDF p.17', T6ISU)], num_sources: [{ label: 'MANUAL', item: 'Temp Offset', low: -3, high: 3, unit: '°F' }] });
steps.OFFSET['HW-T9'] = textCell('HW-T9', offsetT9, { installer_menu: false, fn: 'OFFSET', settingName: 'the temperature offset', section: 'p.18', entry: 'Preferences', captions: [cap26('\u22123 °F', '3 °F', 'T9 guide 33-00478', 'p.18', data.fallbacks['F-HW-T9'].url)], num_sources: [{ label: 'MANUAL', item: 'Indoor Display Offset', low: -3, high: 3, unit: '°F' }], more: { homeownerOffset: true } });
steps.OFFSET['ECB-PRM'] = textCell('ECB-PRM', offsetEcb, { installer_menu: true, fn: 'OFFSET', settingName: 'the temperature offset', section: 'p.110', entry: 'INSTALLATION SETTINGS', captions: [cap26('\u221210 °F', '10 °F', 'ecobee Premium manual v1', 'p.110', ECB) + ' Maker\u2019s note: the sensor itself varies \u00B11 °F.'], num_sources: [{ label: 'MANUAL', item: 'Temperature Correction', low: -10, high: 10, unit: '°F', captionOnly: true }] });
MODELS.forEach(function (model) { if (!steps.OFFSET[model]) steps.OFFSET[model] = blankCell(model, 'manual'); });

const diffEcb = '1. Go to **MAIN MENU** > **SETTINGS** > **INSTALLATION SETTINGS** > **THRESHOLDS**. 2. For heating choose **HEAT DIFFERENTIAL TEMP**; for cooling, **COOL DIFFERENTIAL TEMP**. Change nothing else, and leave **Configure Staging** as it is. 3. Write down the value. 4. Short bursts: raise it by the smallest step the screen offers. Swings too big: lower it by one step. 5. Go back to save. **Watch:** for an hour at about the same time of day, count how many times it starts, before and after. Give it a day. Fewer starts with a wider setting is the sign it worked. **Stop** if the room swings more than you can live with, or starts don\u2019t drop after two days. Put back your old value. Note: Away and \u201CI\u2019m Usually Away\u201D add 1 °F on their own.';
const diffPointer = 'Your thermostat doesn\u2019t have a swing setting. It sets the on and off point at your setting on its own, and uses cycle rate to control how often it runs.';
steps.DIFF['ECB-PRM'] = textCell('ECB-PRM', diffEcb, { installer_menu: true, fn: 'DIFF', settingName: 'the differential', section: 'p.109', entry: 'INSTALLATION SETTINGS', num_sources: [{ label: 'MANUAL', item: 'Heat Differential default', value: '0.5 °F' }] });
['HW-T5', 'HW-T6', 'HW-FP6', 'HW-TH4', 'HW-RTH76'].forEach(function (model) { steps.DIFF[model] = pointerCell(model, diffPointer, 'manual'); });
MODELS.forEach(function (model) { if (!steps.DIFF[model]) steps.DIFF[model] = blankCell(model, 'manual'); });

const cphT6 = '1. Press and hold **Menu** for 5 seconds, then choose ISU. 2. Furnace or boiler: step to ISU **370 Heat 1 CPH** (and **371 Heat 2 CPH** for a second stage). Heat pump heating or cooling: ISU **365 Cool 1 CPH** (and **366**). Backup heat: **375 Aux Heat CPH**. Change nothing else. 3. Write down each number you\u2019ll change. ' + CPH_RULES + '5. Save and go home. ' + CPH_WATCH;
const cphFp = '1. Press and hold **\u25B2** and **FAN** until the display changes. 2. Press **NEXT** to Function **5** (Stage 1 heat cycle rate); 6 is stage 2 or aux, 8 is emergency heat; **9** and **10** are compressor. Skip Functions 1, 2, 3 and 15. 3. Write down the number. ' + CPH_RULES + '5. Press **DONE**. ' + CPH_WATCH;
const cphTh = '1. Press and hold **\u25B2** and **\u25BC** until the display changes. 2. Press \u25B2 to reach Function **5** (Heating cycle rate, TH4110D), **6** (Auxiliary heat, TH4210D), **8** (Emergency heat, TH4210D), or **9** (Compressor). Skip Functions 1 and 15. 3. Write down the number. ' + CPH_RULES + '5. Hold \u25B2 and \u25BC to save and exit. ' + CPH_WATCH;
const cphCap = [cap26('1 CPH', '12 CPH (heat) and 1 CPH to 6 CPH (compressor)', 'T6 Pro Smart Professional Install Guide 33-00392EFS', 'PDF p.14', T6ISU), cap27('3 CPH for furnace heat', 'HVAC School, Cycle Rate Settings', TR1), cap27('1 CPH for heat pump compressor, only if your current number is higher', 'HVAC School, Cycle Rate Settings', TR1)];
const cphNums = [{ label: 'MANUAL', item: 'heat CPH', low: 1, high: 12 }, { label: 'MANUAL', item: 'compressor CPH', low: 1, high: 6 }, { label: 'TRADE', item: 'furnace heat CPH', value: 3, low: 1, high: 12 }, { label: 'TRADE', item: 'heat pump compressor CPH', value: 1, low: 1, high: 6, lowerOnly: true }];
steps.CPH['HW-T6'] = textCell('HW-T6', cphT6, { installer_menu: true, fn: 'CPH', settingName: 'the cycle rate', section: 'PDF p.14', entry: 'Menu', captions: cphCap, num_sources: cphNums });
steps.CPH['HW-FP6'] = textCell('HW-FP6', cphFp, { installer_menu: true, fn: 'CPH', settingName: 'the cycle rate', section: 'PDF p.6', entry: 'FAN', captions: cphCap, num_sources: cphNums });
steps.CPH['HW-TH4'] = textCell('HW-TH4', cphTh, { installer_menu: true, fn: 'CPH', settingName: 'the cycle rate', section: 'PDF p.10', entry: 'display changes', captions: cphCap, num_sources: cphNums });
steps.CPH['HW-RTH76'] = Object.assign(blankCell('HW-RTH76', 'PDF p.20'), { held_text: 'RTH7600 installer entry: button labels to be confirmed on the mirror check.' });
steps.CPH['ECB-PRM'] = pointerCell('ECB-PRM', 'ecobee doesn\u2019t have a cycles-per-hour setting. Its Heat and Cool Differential settings do this job.', 'p.109');
MODELS.forEach(function (model) { if (!steps.CPH[model]) steps.CPH[model] = blankCell(model, 'manual'); });

steps.AUTO['ECB-PRM'] = textCell('ECB-PRM', '1. **MAIN MENU** > **SETTINGS** > **INSTALLATION SETTINGS** > **THRESHOLDS**. 2. If Auto is missing, choose **AUTO HEAT/COOL** and **Enable**. 3. To change the gap, choose **HEAT/COOL MIN DELTA**. Write down the value. 4. Settings push each other: lower it by one step. It switches too soon: raise it by one step. 5. Go back, then pick Auto from the system icon. **Watch:** a day or two of mixed weather. **Stop** if heat and cooling start running back to back. Put back the value.', { installer_menu: true, fn: 'AUTO', settingName: 'the Auto deadband', section: 'p.109', entry: 'INSTALLATION SETTINGS', num_sources: [{ label: 'MANUAL', item: 'Heat/Cool Min Delta', value: 'default 5 °F, lowest 2 °F' }] });
steps.AUTO['HW-T6'] = textCell('HW-T6', '1. Hold **Menu** 5 seconds, then ISU. 2. ISU **300 Auto Changeover**: On makes Auto available. 3. ISU **303 Auto Differential**: write down the value; it\u2019s how far the room must drift during an off cycle before it switches to the other mode. 4. Switches too soon: raise by one step. 5. Save. **Watch:** a day or two of mixed weather. **Stop** if heat and cooling start running back to back. Put back the value.', { installer_menu: true, fn: 'AUTO', settingName: 'the Auto deadband', section: 'PDF p.13', entry: 'Menu', captions: [cap26('0 °F', '5 °F (0.0 °C to 2.5 °C)', 'T6 Pro Smart Professional Install Guide 33-00392EFS', 'PDF p.13', T6ISU)], num_sources: [{ label: 'MANUAL', item: 'Auto Differential', low: 0, high: 5, unit: '°F' }] });
steps.AUTO['HW-T9'] = textCell('HW-T9', 'Menu > **Advanced setup** > **modify configuration** > NEXT to ISU **3000 Changeover**: **Automatic** makes Auto available. No gap setting. Change nothing else.', { installer_menu: true, fn: 'AUTO', settingName: 'Auto changeover', section: 'p.22', entry: 'Advanced setup' });
steps.AUTO['HW-FP6'] = textCell('HW-FP6', 'Hold **\u25B2** + **FAN**; NEXT to Function **12**: **1** adds Auto. Avoid 2 (Auto only), which locks out the other modes. The 3° gap is fixed.', { installer_menu: true, fn: 'AUTO', settingName: 'Auto changeover', section: 'PDF p.8', entry: 'FAN', num_sources: [{ label: 'MANUAL', item: 'Auto separation', value: '3 degrees, fixed' }] });
steps.AUTO['HW-X2P'] = textCell('HW-X2P', 'Hold the bottom-left button and **\u2191** for 5 seconds; ISU **3000**: **1** enables Auto. Honeywell\u2019s guide advises against Auto where winter outdoor temperatures often stay below 50 °F (10 °C).', { installer_menu: true, fn: 'AUTO', settingName: 'Auto changeover', section: 'p.11', entry: 'bottom-left', num_sources: [{ label: 'MANUAL', item: 'Auto outdoor note', value: '50 °F' }] });
steps.AUTO['HW-RTH76'] = Object.assign(blankCell('HW-RTH76', 'PDF p.21'), { held_text: 'RTH7600 Auto entry: button labels to be confirmed on the mirror check.' });
MODELS.forEach(function (model) { if (!steps.AUTO[model]) steps.AUTO[model] = blankCell(model, 'manual'); });

function recov(model, text, extra) {
  steps.RECOV[model] = textCell(model, text + RECOV_TAIL, extra);
}
recov('ECB-PRM', '**MAIN MENU** > **SETTINGS** > **PREFERENCES** > **Heating Smart Recovery** or **Cooling Smart Recovery** > Enable or Disable.', { installer_menu: false, fn: 'RECOV', settingName: 'recovery', section: 'p.68' });
recov('NEST-LT4', 'Google Home app > your thermostat > **Settings** > **Temperature preferences** > **Early-On**. Radiant heat uses **True Radiant** instead.', { installer_menu: false, fn: 'RECOV', settingName: 'Early-On', section: 'Early-On', fallback: fb('NEST-LT4', 'Early-On', 'F-NEST-EARLY') });
recov('NEST-NT', 'Google Home app > your thermostat > **Settings** > **Temperature preferences** > **Early-On**. Radiant heat uses **True Radiant** instead.', { installer_menu: false, fn: 'RECOV', settingName: 'Early-On', section: 'Early-On', fallback: fb('NEST-NT', 'Early-On', 'F-NEST-EARLY') });
recov('NEST-LT3', 'Nest app > Settings > thermostat > **Early-On** (or ring > Settings > **Nest Sense**).', { installer_menu: false, fn: 'RECOV', settingName: 'Early-On', section: 'Early-On', fallback: fb('NEST-LT3', 'Early-On', 'F-NEST-EARLY') });
recov('NEST-E', 'Nest app > Settings > thermostat > **Early-On** (or ring > Settings > **Nest Sense**).', { installer_menu: false, fn: 'RECOV', settingName: 'Early-On', section: 'Early-On', fallback: fb('NEST-E', 'Early-On', 'F-NEST-EARLY') });
recov('HW-T6', '**Menu** > arrows to **RECOVERY** > **Select** > **RECOVERY ON** or **RECOVERY OFF** > **Done**.', { installer_menu: false, fn: 'RECOV', settingName: 'recovery', section: 'user guide p.22', fallback: fb('HW-T6', 'p.22', 'F-HW-T6') });
recov('HW-T9', 'Menu > **Advanced setup** > **modify configuration** > NEXT to ISU **4090 Adaptive Intelligent Recovery** > Yes or No > **Done**. Change nothing else.', { installer_menu: true, fn: 'RECOV', settingName: 'recovery', section: 'p.22', entry: 'Advanced setup' });
recov('HW-FP6', 'Hold **\u25B2** + **FAN**; NEXT to Function **13**: 1 On, 0 Off; DONE.', { installer_menu: true, fn: 'RECOV', settingName: 'recovery', section: 'PDF p.8', entry: 'FAN' });
recov('HW-TH4', 'Hold **\u25B2** + **\u25BC**; \u25B2 to Function **13**: 1 On, 0 Off; hold both to save.', { installer_menu: true, fn: 'RECOV', settingName: 'recovery', section: 'PDF p.12', entry: 'display changes' });
recov('HW-X2P', 'Hold the bottom-left button and **\u2191** for 5 seconds; ISU **4090 Smart Response**: 1 Yes, 0 No.', { installer_menu: true, fn: 'RECOV', settingName: 'recovery', section: 'p.12', entry: 'bottom-left' });
steps.RECOV['HW-RTH76'] = Object.assign(blankCell('HW-RTH76', 'PDF p.22'), { held_text: 'RTH7600 recovery entry: button labels to be confirmed on the mirror check.' });
MODELS.forEach(function (model) { if (!steps.RECOV[model]) steps.RECOV[model] = blankCell(model, 'manual'); });

function setback(model, note, section, id) {
  steps.SETBACK[model] = textCell(model, SETBACK_LEAD + note, { installer_menu: false, fn: 'SETBACK', settingName: 'the schedule', section: section, fallback: fb(model, section, id) });
}
setback('ECB-PRM', 'Comfort Settings are at **MAIN MENU** > **COMFORT SETTINGS**. Smart Home & Away is in eco+. Away adds 1 °F before it calls.', 'p.60');
NESTS.forEach(function (model) { setback(model, '**Eco Temperatures** are in Settings > Nest Sense. Early-On waits until someone is home.', 'Eco Temperatures', 'F-NEST-SENSE'); });
['HW-T5', 'HW-T6', 'HW-T9'].forEach(function (model) { setback(model, 'Open Menu > Schedule. Home and Away temperatures are in the app when geofencing is on.', 'schedule'); });
['HW-FP6', 'HW-TH4', 'HW-RTH76', 'HW-X2P', 'AMZ-AST'].forEach(function (model) { setback(model, 'Use the hold and schedule steps for this model. Make the heat-pump setback smaller, one step at a time.', 'schedule'); });
steps.SETBACK['ECB-ESS'] = blankCell('ECB-ESS', 'support page');

const hplockEcb = '1. Check the thermostat is online (it uses outdoor weather). If not, stop. 2. **MAIN MENU** > **SETTINGS** > **INSTALLATION SETTINGS** > **THRESHOLDS**. 3. Write down **AUX HEAT MAX OUTDOOR TEMP** and **COMPRESSOR MIN OUTDOOR TEMP** (it may say Disabled). If you see **Aux Savings Optimization** instead (automatic staging), write down its level. 4. Backup heat runs in mild weather: lower **AUX HEAT MAX OUTDOOR TEMP** by one step, or move Aux Savings Optimization one level toward **Maximum**. Keep the aux maximum at or above the compressor minimum. 5. Go back to save. ' + WATCH_HP + ' ' + STOP_HP + ' ' + lc40('AUX HEAT MAX OUTDOOR TEMP') + ' ' + lc40('Aux Savings Optimization') + ' ' + LC32 + ' ' + LC30;
const hplockT6 = '1. Hold **Menu** 5 seconds, then ISU. Look (don\u2019t change) at ISU **130**: it must say Wired or Internet. If it says None, stop. 2. Step to ISU **356 Aux Heat Lock Out** and **355 Balance Point**. If they aren\u2019t shown, your system isn\u2019t set up for them; stop. 3. Write down both. The maker default for ISU **356** is Off. 4. Backup heat in mild weather: lower 356 by one step (5 °F). 356 must stay at or above 355. Off on 356 means backup heat isn\u2019t limited by outdoor temperature. 5. Save. ' + WATCH_HP + ' ' + STOP_HP + ' ' + lc40('ISU 356') + ' Skip ISU 260 (dual fuel) and 340/350. ' + LC32 + ' ' + LC30;
const nestOff = ' If Heat Pump Balance is off, we don\u2019t guide the backup heat lockout temperature. Leave it as it is, or ask a licensed HVAC professional.';
const nestMove = ' Write down the choice (Max Comfort is the maker default). Backup heat in mild weather: move one step toward **Max Savings**. House can\u2019t keep up: one step toward **Max Comfort**. Don\u2019t choose Off. ' + WATCH_HP + ' ' + STOP_HP + ' ' + lc40('Heat Pump Balance') + nestOff + ' ' + LC32 + ' ' + LC30;
steps.HPLOCK['ECB-PRM'] = textCell('ECB-PRM', hplockEcb, {
  installer_menu: true, fn: 'HPLOCK', settingName: 'the backup heat outdoor limit', section: 'p.111', entry: 'online',
  lc40: ['AUX HEAT MAX OUTDOOR TEMP', 'Aux Savings Optimization'],
  captions: [cap28('35 °F for aux max outdoor', 'BPA, Notes on Auxiliary Heat Controls and Thermostats', TR3), 'Aux Savings levels: Minimum 2.0 °F, Basic 2.3 °F, Balanced 2.6 °F, Super 2.9 °F (maker default), Maximum 3.2 °F. Compressor min outdoor default is Disabled. No typical value for the compressor minimum.'],
  num_sources: [{ label: 'TRADE', item: 'aux max outdoor', value: '35 °F', lc28: true }, { label: 'MANUAL', item: 'Aux Savings Optimization', value: '2.0 to 3.2 °F' }, { label: 'MANUAL', item: 'compressor min outdoor', value: 'Disabled', typical: false }],
  ratedMinText: '5a. Heat pump locks out too early: lower **COMPRESSOR MIN OUTDOOR TEMP** one step, never below your outdoor unit\u2019s rating. If it says Disabled, leave it.'
});
steps.HPLOCK['HW-T6'] = textCell('HW-T6', hplockT6, {
  installer_menu: true, fn: 'HPLOCK', settingName: 'the backup heat outdoor limit', section: 'PDF p.14', entry: 'ISU 130',
  lc40: ['ISU 356'],
  captions: [cap26('Off, 5 °F', '65 °F for ISU 356; Off, 5 °F to 60 °F for ISU 355', 'T6 Pro Smart Professional Install Guide 33-00392EFS', 'PDF p.14', T6ISU), cap27('35 °F for ISU 356', 'BPA, Notes on Auxiliary Heat Controls and Thermostats', TR3), 'ISU 355 defaults: 40 °F if backup is gas or oil, Off if electric or geothermal. No typical value for the compressor minimum.'],
  num_sources: [{ label: 'MANUAL', item: 'ISU 356', low: 5, high: 65, unit: '°F' }, { label: 'MANUAL', item: 'ISU 355', low: 5, high: 60, unit: '°F', typical: false }, { label: 'TRADE', item: 'aux lockout', value: 35, low: 5, high: 65 }],
  ratedMinText: '5a. Heat pump locks out early: lower 355 one step, never below your outdoor unit\u2019s rating, and keep 356 at or above it.'
});
steps.HPLOCK['NEST-NT'] = textCell('NEST-NT', '1. Google Home app > your thermostat > **Settings** > **Temperature Preferences** > **Heat Pump Balance**. The thermostat must be connected to Wi-Fi. If it isn\u2019t, stop.' + nestMove, { installer_menu: true, fn: 'HPLOCK', settingName: 'Heat Pump Balance', section: 'Heat Pump Balance', entry: 'Wi-Fi', fallback: fb('NEST-NT', 'Heat Pump Balance', 'F-NEST-HPB'), lc40: ['Heat Pump Balance'] });
steps.HPLOCK['NEST-LT4'] = textCell('NEST-LT4', '1. Home app > thermostat > **Equipment** > **Heat pump** > **Use Heat Pump Balance**, then the level. The thermostat must be connected to Wi-Fi. If it isn\u2019t, stop. Change only Heat Pump Balance. Don\u2019t change anything else under Equipment. Don\u2019t open **Advanced configuration**.' + nestMove, { installer_menu: true, fn: 'HPLOCK', settingName: 'Heat Pump Balance', section: 'Heat Pump Balance', entry: 'Wi-Fi', fallback: fb('NEST-LT4', 'Heat Pump Balance', 'F-NEST-HPB'), lc40: ['Heat Pump Balance'] });
['NEST-LT3', 'NEST-E'].forEach(function (model) {
  steps.HPLOCK[model] = textCell(model, '1. Ring > **Settings** > **Nest Sense** > **Heat Pump Balance**. The thermostat must be connected to Wi-Fi. If it isn\u2019t, stop.' + nestMove, { installer_menu: true, fn: 'HPLOCK', settingName: 'Heat Pump Balance', section: 'Heat Pump Balance', entry: 'Wi-Fi', fallback: fb(model, 'Heat Pump Balance', 'F-NEST-HPB'), lc40: ['Heat Pump Balance'] });
});
MODELS.forEach(function (model) { if (!steps.HPLOCK[model]) steps.HPLOCK[model] = blankCell(model, 'manual'); });

steps.DEHUM['ECB-PRM'] = textCell('ECB-PRM', DEHUM_CLAIM + '1. **MAIN MENU** > **SYSTEM** > **DEHUMIDIFY USING AC** > **Enable**, then pick a humidity level. Write down what it was. 2. For more drying, **INSTALLATION SETTINGS** > **THRESHOLDS** > **AC OVERCOOL MAX**: write down the value, then raise it one step. It stops at the overcool limit or the humidity level, whichever comes first. 3. Too cold: lower AC Overcool Max one step. **Watch:** the indoor humidity on the thermostat and how the house feels, for a day. **Stop** if rooms get too cold or it runs much longer; put back your values. Dehumidifier accessory setup stays with a pro.', { installer_menu: true, fn: 'DEHUM', settingName: 'the dehumidify setting', section: 'p.105', entry: 'INSTALLATION SETTINGS' });
NESTS.forEach(function (model) {
  steps.DEHUM[model] = textCell(model, DEHUM_CLAIM + '**Cool to Dry** is in Nest Sense (Settings). Write down whether it was on. Humidity Helper and accessory setup are for a pro.', { installer_menu: false, fn: 'DEHUM', settingName: 'Cool to Dry', section: 'Cool to Dry', fallback: fb(model, 'Cool to Dry', 'F-NEST-SENSE') });
});
['HW-T5', 'HW-T6', 'HW-T9', 'HW-FP6', 'HW-TH4', 'HW-RTH76', 'HW-X2P', 'AMZ-AST'].forEach(function (model) {
  steps.DEHUM[model] = pointerCell(model, 'Your thermostat has no dehumidify setting. Make sure the fan is on Auto, not On, while cooling.', 'manual');
});
steps.DEHUM['ECB-ESS'] = blankCell('ECB-ESS', 'support page');

steps.SENSORS['ECB-PRM'] = textCell('ECB-PRM', 'Sensor participation is per Comfort Setting: **MAIN MENU** > **COMFORT SETTINGS** > tap the Comfort Setting > sensors. Compare readings in **MAIN MENU** > **SETTINGS** > **SENSORS**. **Follow Me** gives priority to occupied rooms. Put a sensor about four feet up, away from vents, fans, outside walls, windows, and sun. **Watch:** a day in the rooms you use. **Stop** if a room still doesn\u2019t match, and call a pro before moving the thermostat.', { installer_menu: false, fn: 'SENSORS', settingName: 'sensors', section: 'p.89' });
steps.SENSORS['HW-T9'] = textCell('HW-T9', '**Set Sensor Priority** for each schedule period: active rooms (motion) or selected rooms. **Watch:** a day in those rooms. **Stop** if the priority room still doesn\u2019t match the rest of the home.', { installer_menu: false, fn: 'SENSORS', settingName: 'sensor priority', section: 'p.5' });
steps.SENSORS['NEST-LT4'] = textCell('NEST-LT4', 'Sun: Home app > Settings > **Temperature Preferences** > Nest Sense > **Sunblock**. It needs a few days to learn. Temperature Sensor: change its schedule, or move it a couple of feet away from vents, windows, and outside doors, about chest height.', { installer_menu: false, fn: 'SENSORS', settingName: 'Sunblock', section: 'Sunblock', fallback: fb('NEST-LT4', 'Sunblock', 'F-NEST-SUN') });
['NEST-LT3', 'NEST-E'].forEach(function (model) {
  steps.SENSORS[model] = textCell(model, 'Sun: ring > Settings > **Nest Sense** > **Sunblock**. It needs a few days to learn. Temperature Sensor: change its schedule, or move it a couple of feet away from vents, windows, and outside doors, about chest height.', { installer_menu: false, fn: 'SENSORS', settingName: 'Sunblock', section: 'Sunblock', fallback: fb(model, 'Sunblock', 'F-NEST-SUN') });
});
steps.SENSORS['NEST-NT'] = textCell('NEST-NT', 'This model has no Sunblock. Temperature Sensor: change its schedule, or move it a couple of feet away from vents, windows, and outside doors, about chest height.', { installer_menu: false, fn: 'SENSORS', settingName: 'Temperature Sensor', section: 'Temperature Sensor', fallback: fb('NEST-NT', 'Temperature Sensor', 'F-NEST-SENSOR') });
['HW-T5', 'HW-T6', 'HW-FP6', 'HW-TH4', 'HW-RTH76', 'HW-X2P', 'AMZ-AST'].forEach(function (model) {
  steps.SENSORS[model] = pointerCell(model, 'Your thermostat has no sun or room-sensor setting. Shade it at that time of day, like closing a blind. Don\u2019t cover the thermostat.', 'manual');
});
steps.SENSORS['ECB-ESS'] = blankCell('ECB-ESS', 'support page');

const latchBlocks = [
  { id: 'ecb-cs2', model: 'ECB-PRM', latching: false, live: false, held: true, tier: 'comfort', label: 'Compressor Stage 2 Temperature Delta', source: 'ecobee Premium manual v1', page: 'p.111', url: ECB, does: 'Sets how far the room must be from your setpoint before the second compressor stage starts. Default is auto. It doesn\u2019t decide whether stage 2 stays on until your setpoint. If it\u2019s set to auto, leave it on auto.', undo: 'Enter the value you wrote down (or set it back to auto if that\u2019s what it was).' },
  { id: 'ecb-runtime', model: 'ECB-PRM', latching: false, live: false, held: true, tier: 'comfort', label: 'Compressor Stage 1 Max Runtime', source: 'ecobee Premium manual v1', page: 'p.111', url: ECB, does: 'Sets the most minutes stage 1 runs before stage 2 starts. A shorter time brings on stage 2 sooner.', undo: 'Enter the value you wrote down.' },
  { id: 'ecb-reverse', model: 'ECB-PRM', latching: false, live: false, held: true, tier: 'comfort', label: 'Compressor Reverse Staging', source: 'ecobee Premium manual v1', page: 'p.111', url: ECB, does: 'When it\u2019s on, the thermostat starts stage 2 if the room is far from your setpoint, then drops back to stage 1 to finish. It cancels Compressor Stage 1 Max Runtime. With it on, stage 2 doesn\u2019t stay on until your setpoint.', undo: 'Set it back to how you wrote it down (on or off).' },
  { id: 'ecb-heat', model: 'ECB-PRM', latching: false, live: false, held: true, tier: 'comfort', label: 'Heat Stage 2 Temperature Delta / Heat Stage 1 Max Runtime', source: 'ecobee Premium manual v1', page: 'p.111', url: ECB, does: 'Same as the compressor items, for a two-stage furnace.', undo: 'Enter the values you wrote down.' },
  { id: 't6-finish', model: 'HW-T6', latching: true, live: false, held: true, tier: 'comfort', label: LATCH + ' High Cool Stage Finish / High Heat Stage Finish (ISU 305 / 306)', source: 'T6 Pro Smart Professional Install Guide 33-00392EFS', page: 'PDF p.13', url: T6ISU, does: 'When set to Yes, once the second stage starts it keeps running until the room reaches your setpoint, instead of dropping back to first stage. When set to No, it doesn\u2019t keep the second stage running to the setpoint.', undo: 'Set it back to Yes or No, as you wrote it down.' }
];
steps.LATCH['HW-T6'] = Object.assign(blankCell('HW-T6', 'PDF p.13'), { generic: false, text: null, kind: 'held', held: true, installer_menu: true, fn: 'LATCH', settingName: 'finish on high stage', neighbors: neighbors('HW-T6', 'LATCH'), blockIds: ['t6-finish'], entry: 'Menu' });
steps.LATCH['ECB-PRM'] = Object.assign(blankCell('ECB-PRM', 'p.111'), { generic: false, text: null, kind: 'held', held: true, installer_menu: true, fn: 'LATCH', settingName: 'stage timing', neighbors: neighbors('ECB-PRM', 'LATCH'), blockIds: ['ecb-cs2', 'ecb-runtime', 'ecb-reverse', 'ecb-heat'], entry: 'INSTALLATION SETTINGS' });
MODELS.forEach(function (model) { if (!steps.LATCH[model]) steps.LATCH[model] = blankCell(model, 'manual'); });

steps.GEO['HW-T6'] = textCell('HW-T6', 'Press and hold **Menu** for 5 seconds, then choose ISU. Step to ISU **355** and ISU **356**. Write down what each one shows. If they aren\u2019t shown, write that down. Don\u2019t change them.', { installer_menu: false, fn: 'GEO', settingName: 'lockout look', section: 'PDF p.14', more: { geoLook: true, neighbors: neighbors('HW-T6', 'GEO') } });
steps.GEO['ECB-PRM'] = textCell('ECB-PRM', 'Go to **MAIN MENU** > **SETTINGS** > **INSTALLATION SETTINGS** > **THRESHOLDS**. Write down what **COMPRESSOR MIN OUTDOOR TEMP** and **AUX HEAT MAX OUTDOOR TEMP** show. Don\u2019t change them.', { installer_menu: false, fn: 'GEO', settingName: 'lockout look', section: 'p.110', more: { geoLook: true, neighbors: neighbors('ECB-PRM', 'GEO') } });
MODELS.forEach(function (model) {
  if (!steps.GEO[model]) {
    const cell = blankCell(model, 'manual');
    cell.geoLook = true;
    cell.neighbors = neighbors(model, 'GEO');
    steps.GEO[model] = cell;
  }
});

Object.keys(steps).forEach(function (fn) { data.steps[fn] = steps[fn]; });
data.latchBlocks = latchBlocks;
data.cards = {
  'HW-T5': 'ISU 200 System Type, 205 Equipment Type, 220/221 stages, 230 Fan Control, 303 Auto Differential, 355/356 lockouts, 365/370 CPH, 425 Smart Response.',
  'HW-T6': 'ISU 200, 205, 220, 221, 230, 255/256 heat types, 260 Fossil Kit Control, 303, 305/306 High Stage Finish, 340 Aux Heat Droop, 350 Up Stage Timer Aux Heat, 355, 356, 365/366, 370/371, 387, 425, 1420. The TH6220WF supports only one compressor stage when it\u2019s set up for a heat pump. If your system has two compressor stages, ask your pro whether your thermostat supports both.',
  'HW-T9': 'ISU 2000 System Type, 2010 Equipment, 2070 stages, 3000 Changeover, 4090 Adaptive Intelligent Recovery, 14020 offset.',
  'ECB-PRM': 'Installation Settings > Equipment (system and staging). Thresholds: Heat/Cool Differential, Heat/Cool Min Delta, Temperature Correction, Compressor Min Outdoor Temp, Aux Heat Max Outdoor Temp, Compressor to Aux Delta/Runtime, Compressor Stage 2 Temperature Delta, Compressor Stage 1 Max Runtime, Reverse Staging.',
  'HW-FP6': 'Functions 1 (system type), 2, 3, 5–10 (cycle rates), 12, 13, 15.',
  'HW-TH4': 'Functions 1, 5/6/8, 9, 13, 15.',
  'HW-RTH76': 'Functions 0170, 0180, 0190, 0240, 0270, 0300, 0530.',
  'HW-X2P': 'ISU 2000, 2010, 2060, 2070, 2071, 2180, 3000, 4090.',
  'NEST-LT4': 'Equipment (heat configuration, wiring, system details), Heat Pump Balance, Advanced configuration timers.',
  'NEST-NT': 'Equipment (heat configuration, wiring, system details), Heat Pump Balance, Advanced configuration timers.',
  'NEST-LT3': 'Equipment (heat configuration, wiring, system details), Heat Pump Balance, Advanced configuration timers.',
  'NEST-E': 'Equipment (heat configuration, wiring, system details), Heat Pump Balance, Advanced configuration timers.',
  'AMZ-AST': 'Thermostat Configuration (HVAC type and wiring items).',
  'ECB-ESS': ''
};
data.cardIntro = 'Ask your installer to check these settings and tell you what each one is set to. Write the answers down.';
data.cphUnknown = 'compressor';
data.wave2ui = { stepsBeforeCheckbox: false, forceRatedMin: false, geoRenderGuard: true, renderHeldText: false };
data.latchLegalOk = [];
data.v1Fns = { OFFSET: 'ts.step.offset', DIFF: 'ts.step.differential', CPH: 'ts.step.cph', AUTO: 'ts.step.auto_deadband', RECOV: 'ts.step.recovery', SETBACK: 'ts.step.setback', HPLOCK: 'ts.step.hp_lockouts', DEHUM: 'ts.step.dehumidify', SENSORS: 'ts.step.sensors', LATCH: 'ts.step.stage_latch', GEO: 'ts.look.geo_lockouts' };

const landing = data.nodes['ts.landing.picker'];
const hazardAt = landing.options.findIndex(function (op) { return op.id === 'hazard_now'; });
const somethingAt = landing.options.findIndex(function (op) { return op.id === 'landing_something_else'; });
landing.options[somethingAt].label = 'Something else (app support, or a feature or model we don\u2019t cover yet)';
const fresh = [
  opt('landing_short_cycling', 'It turns on and off a lot, like \u201Cruns 5 minutes, off 5, all day\u201D', 'ts.diag.cycling', 'We\u2019ll look for the cause before changing anything.', 'Complaint: Short cycling.'),
  opt('landing_swings', 'The house swings too warm and too cold, or goes past the setting', 'ts.diag.swing', 'Swing, overshoot, and setup.', 'Complaint: Temperature swings or overshoot.'),
  opt('landing_never_catches_up', 'It never catches up after a schedule change, or it starts too early', 'ts.diag.recovery', 'Setback and recovery.', 'Complaint: Slow recovery or early start.'),
  opt('landing_wrong_reading', 'The temperature it shows doesn\u2019t match how it feels, like \u201Csays 72 but feels 76\u201D', 'ts.diag.reading_check', 'First, a simple check with a separate thermometer.', 'Complaint: Reading doesn\u2019t match the room.'),
  opt('landing_auto_mode', 'Auto mode won\u2019t switch between heat and cool, or moves my other setting', 'ts.diag.auto_mode', 'Auto heat and cool.', 'Complaint: Auto mode problem.'),
  opt('landing_backup_heat_cost', 'Backup heat runs when it\u2019s mild out, or the heat pump bill jumped', 'ts.diag.heat_pump_aux', 'Heat pump homes.', 'Complaint: Backup heat use or heat pump bill.'),
  opt('landing_humid', 'It feels sticky when cooling, or gets too cold trying to dry the air', 'ts.diag.humidity', 'Humidity and cooling.', 'Complaint: Humidity or overcooling.'),
  opt('landing_stages', 'Once it gets louder and blows harder, it stays that way until it shuts off, or the fan keeps speeding up and slowing down during one run', 'ts.diag.stages', 'Two-stage and geothermal systems.', 'Complaint: Staging problem.')
];
landing.options.splice(somethingAt, 0, fresh[0], fresh[1], fresh[2], fresh[3], fresh[4], fresh[5], fresh[6], fresh[7]);
if (landing.options[landing.options.length - 1].id !== 'hazard_now') throw new Error('hazard moved');
if (landing.options.length !== 19) throw new Error('landing count ' + landing.options.length);

Object.keys(data.nodes).forEach(function (id) {
  if (id.indexOf('ts.') !== 0) return;
  data.nodes[id].options.forEach(function (op) {
    if (op.id === 'installer_setting_came_up') {
      op.label = TAIL[1].label;
      op.hint = TAIL[1].hint;
      op.fact = TAIL[1].fact;
    }
  });
});
data.steps.EHEAT['ECB-PRM'].text = 'Switch the system mode from Aux to Heat. If the thermostat later shows a flame icon with an exclamation mark, ' + data.lc.lc34;
data.u1 = 'Settings only. No wires, no covers. Some installer settings have steps; the ones that protect your equipment don\u2019t. Low-voltage thermostats only.';

node('ts.diag.reading_check', 'What you noticed', 'Does the thermostat match a separate thermometer?',
  'Put a separate thermometer on a shelf or table near the thermostat, at about the same height. Keep it out of the sun and away from vents, lamps, and your hands. Leave it 20 to 30 minutes, then compare. Do it again at another time of day.\n\nDon\u2019t take the thermostat off the wall or open anything to check. If your thermostat uses room sensors, compare with the thermostat\u2019s own reading, not the average.',
  withTail([
    opt('reading_matches', 'They match within about a degree', 'ts.diag.swing', 'Then it\u2019s not the reading.', 'Reading matched a separate thermometer.'),
    opt('reading_off_steady', 'It\u2019s off by about the same amount both times', 'ts.diag.location', 'We\u2019ll check what\u2019s near it first.', 'Reading off by a steady amount.'),
    opt('reading_off_changes', 'The difference changes, like bigger in the afternoon or when the heat runs', 'ts.diag.location', 'Usually something near the thermostat.', 'Reading difference changes with time or equipment.'),
    opt('reading_way_off', 'It\u2019s off by more than a few degrees, or it keeps drifting', '@ts_reading_fault_pro', 'That\u2019s for a pro.', 'Reading far off or drifting.'),
    opt('cant_check', 'I don\u2019t have a separate thermometer', '@ts_reading_unchecked', '', '')
  ]));
node('ts.diag.location', 'What you noticed', 'What\u2019s near the thermostat?',
  'Look, don\u2019t touch. Don\u2019t take the thermostat off the wall, and don\u2019t poke at the hole behind it.\n\nIf you feel air coming from around the thermostat or the wall behind it, that\u2019s a job for a pro. Sealing it means taking the thermostat off the wall.',
  withTail([
    opt('sun_on_it', 'Sun shines on it at some time of day', 'ts.step.sensors', '', 'Sun reaches the thermostat.'),
    opt('heat_source_near', 'A lamp, TV, computer, or other warm device is near it, or a vent blows on it', '@ts_location_fix_basic', 'Move the device, not the thermostat.', 'Heat source or vent near the thermostat.'),
    opt('exterior_wall', 'It\u2019s on an outside wall, near a door or window, or in a spot warmer or colder than where we live', '@ts_location_pro', 'Moving a thermostat is pro work.', 'Thermostat on an outside wall or poor spot.'),
    opt('wall_draft', 'I can feel air coming from around it or from the wall behind it', '@ts_location_pro', 'Pro work.', 'Draft at the thermostat wall opening.'),
    opt('remote_sensor_room', 'It uses a separate room sensor, and that room is different', 'ts.step.sensors', '', 'Room sensor in a different spot.'),
    opt('location_ok_steady_difference', 'None of these, and the difference stays the same', 'ts.step.offset', 'Then an offset may fit.', 'Location looked fine; steady reading difference.')
  ]));
node('ts.diag.cycling', 'What you noticed', 'What does the cycling look like?',
  'Watch one or two cycles before you change anything. Note how long it runs, how long it\u2019s off, and whether the room reaches the setting.',
  withTail([
    opt('near_heat_or_vent', 'A vent blows on the thermostat, or a lamp or device sits near it', '@ts_location_fix_basic', 'That makes it stop early.', 'Heat source or vent near the thermostat.'),
    opt('waits_then_starts', 'It says Wait, or Heat On or Cool On flashes, then starts a few minutes later', '@ts_compressor_wait_normal', 'Usually a normal delay.', 'Compressor delay seen.'),
    opt('stops_before_target', 'It shuts off before the room reaches the setting, then starts again', '@ts_equipment_cycling_pro', 'The equipment may be stopping itself.', 'Equipment stops before setpoint.'),
    opt('short_cycles_reaches_target', 'It reaches the setting, then turns on and off in short bursts', 'ts.step.differential', 'Comfort settings.', 'Short cycles after reaching setpoint.'),
    opt('new_system_cycling', 'This started with a new system or a new thermostat', 'ts.diag.new_install', '', 'Cycling started after new install.')
  ]));
node('ts.diag.swing', 'What you noticed', 'What do you notice?', '',
  withTail([
    opt('big_swings', 'The room drifts several degrees before the system comes on', 'ts.step.differential', '', 'Large drift before the system starts.'),
    opt('overshoots', 'It goes past the setting after it shuts off', 'ts.step.cph', '', 'Overshoot after the cycle.'),
    opt('away_bigger', 'It only happens during Away, Eco, or Sleep', 'ts.step.setback', '', 'Swings during Away, Eco, or Sleep.'),
    opt('needs_big_setpoint', 'It won\u2019t heat or cool until I set it far past what I want, then it overshoots', 'ts.diag.new_install', 'Often a setup question.', 'Needs an extreme setpoint before it runs.'),
    opt('feels_different_room', 'The thermostat\u2019s room is fine, but other rooms aren\u2019t', 'ts.step.sensors', '', 'Other rooms differ from the thermostat room.'),
    opt('feels_humid', 'It reads right but feels clammy or warmer than the number', 'ts.diag.humidity', '', 'Feels warmer than the reading.')
  ]));
node('ts.diag.new_install', 'What you noticed', 'Was the system or the thermostat installed in the last year or two?', '',
  withTail([
    opt('new_yes', 'Yes', '@ts_new_install_installer', 'Your installer is the first call.', 'System or thermostat installed in the last two years.'),
    opt('not_sure_age', 'I\u2019m not sure', '@ts_new_install_installer', '', ''),
    opt('old_check_comfort', 'No. Show me the comfort settings first', 'ts.step.differential', '', 'Older install; checking comfort settings.'),
    opt('old_setup_suspect', 'No, and something in the setup seems wrong', '@ts_setup_check_pro', 'Like the wrong equipment running.', 'Setup problem suspected.')
  ]));
node('ts.diag.recovery', 'What you noticed', 'Which is closest?', '',
  withTail([
    opt('early_start_ok', 'It turns on before the schedule time, or shows Recovery or In Recovery', '@ts_recovery_explained_basic', 'Usually on purpose.', 'Early start seen.'),
    opt('early_start_off', 'It starts too early, and I want it to start at the schedule time', 'ts.step.recovery', '', 'Wants early start off.'),
    opt('not_caught_up_hp', 'It\u2019s a heat pump, and it\u2019s still cold well after the morning change', 'ts.diag.heat_pump_aux', '', 'Heat pump slow to recover.'),
    opt('not_caught_up_furnace', 'It\u2019s a furnace or boiler, and it\u2019s still cold well after the change', 'ts.step.recovery', '', 'Furnace or boiler slow to recover.'),
    opt('new_thermostat_learning', 'The thermostat is new, from the last few days', '@ts_learning_period_wait', 'It may still be learning.', 'New thermostat, learning period.'),
    opt('eco_away_issue', 'It stays in Eco or Away when we\u2019re home, or comes back too slowly', 'ts.step.setback', '', 'Eco or Away problem.')
  ]));
node('ts.diag.auto_mode', 'What you noticed', 'What happens in Auto?', '',
  withTail([
    opt('auto_pushes_other', 'When I change one setting, the other one moves', 'ts.step.auto_deadband', '', 'Auto setpoints push each other.'),
    opt('auto_no_option', 'I don\u2019t see Auto', 'ts.step.auto_deadband', '', 'Auto not offered.'),
    opt('auto_switches_too_soon', 'It switches to cooling right after heating, or the reverse', 'ts.step.auto_deadband', '', 'Auto switches too soon.')
  ]));
node('ts.diag.heat_pump_aux', 'What you noticed', 'What\u2019s happening with backup heat?',
  'Backup heat (often shown as Aux or Aux Heat) helps a heat pump when it\u2019s very cold, when the house is far below the setting, or during defrost. Big temperature changes make it come on more.',
  withTail([
    opt('big_setback', 'We turn it down a lot at night or when we\u2019re away', 'ts.step.setback', 'Start with the schedule.', 'Large setbacks on a heat pump.'),
    opt('aux_during_recovery', 'Backup heat comes on in the morning, or after we turn it up', 'ts.step.setback', 'Start with the schedule.', 'Aux during recovery.'),
    opt('aux_mild_weather', 'Backup heat runs even when it\u2019s mild outside', 'ts.guard.hp_source', '', 'Aux in mild weather.'),
    opt('hp_locks_out_early', 'The heat pump stops and only backup heat runs, even when it isn\u2019t very cold', 'ts.guard.hp_source', '', 'Heat pump locked out early.'),
    opt('defrost_seen', 'The outdoor unit steams or says defrost, then backup heat runs briefly', '@ts_defrost_normal_basic', 'Usually normal.', 'Defrost seen.'),
    opt('cant_keep_up', 'It can\u2019t keep up, even with backup heat', '@ts_hp_not_keeping_up_pro', '', 'Can\u2019t keep up with aux.'),
    opt('gas_furnace_backup', 'My backup heat is a gas furnace', '@ts_installer_guard', 'That setup is for a pro.', 'Dual fuel reported.')
  ]));
node('ts.guard.hp_source', 'Before backup-heat settings', 'What kind of heat pump do you have?', '',
  withTail([
    opt('hp_air', 'Air-source: there\u2019s an outdoor unit with a fan', 'ts.guard.cold_weather', '', 'Air-source heat pump.', { flag: 'ts_hp_air', hiddenIf: ['ts_geo', 'wshp'] }),
    opt('hp_geo', 'Geothermal or water-source: it uses pipes in the ground, or a well, pond, or water loop', 'ts.look.geo_lockouts', '', 'Geothermal or water-source heat pump.', { flag: 'ts_geo' }),
    opt('hp_not_sure', 'I\u2019m not sure', '@ts_setup_check_pro', '', 'Heat pump type unknown.')
  ]));
node('ts.guard.cold_weather', 'Before backup-heat settings', 'Before any backup-heat or heat pump limit step: what\u2019s the weather, and who\u2019s home?',
  data.lc.lc29 + '\n' + data.lc.lc29b + '\n' + data.lc.lc29c + '\n' + data.lc.lc29d + '\n' + data.lc.lc29geo + '\nPick the first answer only if all of it is true.',
  withTail([
    opt('guard_ok', 'It\u2019s above 40 °F (4 °C) now and for the next few days, no cold snap is coming, and no infant, elderly, or medically fragile person is at home', 'ts.guard.outdoor_rating', '', 'Cold-weather guard passed.'),
    opt('guard_near_freezing', 'It\u2019s 40 °F (4 °C) or colder, or will be in the next few days', '@ts_cold_weather_stop', '', 'At or below 40 °F (4 °C), or will be in the next few days.'),
    opt('guard_fragile', 'An infant, elderly, or medically fragile person is at home', '@ts_cold_weather_stop', '', 'Fragile occupant at home.'),
    opt('guard_not_sure', 'I\u2019m not sure about the weather or the forecast', '@ts_cold_weather_stop', '', 'Weather unknown.'),
    opt('guard_dual_fuel', 'My backup heat is a gas furnace', '@ts_installer_guard', '', 'Dual fuel reported.')
  ]), true);
node('ts.guard.outdoor_rating', 'Before backup-heat settings', 'Which change are you making?', LC30,
  withTail([
    opt('only_backup_heat', 'Only the backup heat limit, or Heat Pump Balance', 'ts.step.hp_lockouts', '', 'Backup heat limit only.', { flag: 'ts_rated_min=not_needed' }),
    opt('raise_hp_min', 'Raising the heat pump minimum, so backup heat takes over sooner', 'ts.step.hp_lockouts', '', 'Raising the heat pump minimum.', { flag: 'ts_rated_min=not_needed' }),
    opt('lower_hp_min_rating_known', 'Lowering the heat pump minimum, and I found my outdoor unit\u2019s rated minimum in its manual', 'ts.step.hp_lockouts', '', 'Rated minimum known.', { flag: 'ts_rated_min=known' }),
    opt('lower_hp_min_rating_unknown', 'Lowering the heat pump minimum, but I don\u2019t have the rating', '@ts_rated_min_unknown', '', 'Rated minimum unknown.')
  ]));
node('ts.diag.humidity', 'What you noticed', 'What do you notice about humidity?', '',
  withTail([
    opt('fan_on', 'The fan is set to On all the time', 'ts.settings.fan', '', 'Fan On in cooling season.'),
    opt('want_dehumidify', 'I want the system to dry the air more', 'ts.step.dehumidify', '', 'Wants more drying.'),
    opt('overcool_cold', 'It gets too cold while it dries the air', 'ts.step.dehumidify', '', 'Overcool too cold.'),
    opt('ice_seen', 'I see ice on the copper lines or the indoor unit', '@ts_coil_ice_stop', '', 'Ice seen on the cooling system.', { gate: 'ts_coil_ice' }),
    opt('short_runs_humid', 'It cools in short bursts and stays humid', 'ts.diag.cycling', '', 'Short cooling runs, still humid.')
  ]));
node('ts.diag.stages', 'What you noticed', 'How does high and low sound?',
  'Two-stage systems usually run on low most of the time and use high when it\u2019s very hot or cold. You can usually tell by sound and airflow: high is louder and blows harder. Some are set to finish on high stage (some brands call this \u201Clatching\u201D): once high starts, it keeps running until the room reaches the setting. Others drop back to low first. This can be set at the thermostat, in the wiring, or at the equipment, and most of that is pro work.',
  withTail([
    opt('holds_high', 'It starts quieter, then gets louder and blows harder and stays that way until it shuts off, and the room overshoots or the bills went up', '@ts_stage_pro', '', 'Holds high stage until satisfied (sound/airflow).'),
    opt('bounces', 'During one run, the fan keeps speeding up and slowing down, again and again, or the room never quite reaches the setting', '@ts_stage_pro', '', 'Blower speed up and down within one call, or never satisfies.'),
    opt('geo_system', 'It\u2019s a geothermal or water-source system', '@ts_stage_pro', '', 'Geothermal system.', { flag: 'ts_geo' }),
    opt('after_big_change', 'It only runs on high after a big temperature change', 'ts.step.setback', '', 'High stage after big change.'),
    opt('check_stage_settings', 'Show me the stage settings on my thermostat', 'ts.step.stage_latch', '', 'Stage settings requested.', { requiresFlag: 'stageLatchStepsEnabled' })
  ]));
node('ts.look.geo_lockouts', 'Before backup-heat settings', 'Look only: write down the lockout settings', '{step panel: GEO}',
  withTail([
    opt('geo_lock_temp', 'The heat pump or compressor lockout shows a temperature, not Off or Disabled', '@ts_geo_pro', '', 'Geo compressor lockout set to a temperature.'),
    opt('geo_aux_mild', 'Backup heat runs a lot when it\u2019s mild outside', '@ts_geo_pro', '', 'Geo backup heat runs in mild weather.'),
    opt('geo_all_off', 'It shows Off or Disabled (or isn\u2019t shown), and backup heat doesn\u2019t run much', '@ts_geo_noted_basic', '', 'Geo lockouts Off or not shown.'),
    opt('not_on_my_model', 'My thermostat doesn\u2019t show these', '@ts_geo_noted_basic', '', '')
  ]));

function stepBody(token) { return 'These steps match the model you picked.\n\n{step panel: ' + token + '}'; }
node('ts.step.offset', 'Comfort settings', 'Temperature offset', stepBody('OFFSET'), doneOpts('@ts_offset_done_basic'));
node('ts.step.differential', 'Comfort settings', 'Temperature swing', stepBody('DIFF'), doneOpts('@ts_differential_done_basic', [opt('use_cph_instead', 'My thermostat uses cycle rate instead', 'ts.step.cph', '', 'Model uses cycle rate instead of swing.')]));
node('ts.step.cph', 'Comfort settings', 'Cycle rate', stepBody('CPH'), doneOpts('@ts_cph_done_basic', [opt('want_raise_compressor', 'I want to raise the cooling or heat pump cycle rate', '@ts_installer_guard', '', 'Wants the compressor cycle rate raised.')]));
node('ts.step.auto_deadband', 'Comfort settings', 'Auto heat and cool', stepBody('AUTO'), doneOpts('@ts_auto_deadband_done_basic'));
node('ts.step.recovery', 'Comfort settings', 'Early start and recovery', stepBody('RECOV'), doneOpts('@ts_recovery_done_basic'));
node('ts.step.setback', 'Comfort settings', 'Schedule and away temperatures', stepBody('SETBACK'), homeOpts('@ts_setback_done_basic'));
node('ts.step.hp_lockouts', 'Comfort settings', 'Backup heat outdoor limit', stepBody('HPLOCK'), doneOpts('@ts_hp_lockouts_done_basic', [opt('house_cold_after', 'The house got cold after the change', '@ts_hp_not_keeping_up_pro', '', 'House got cold after the backup heat change.')]));
node('ts.step.dehumidify', 'Comfort settings', 'Dehumidify settings', stepBody('DEHUM'), doneOpts('@ts_dehumidify_done_basic', [opt('ice_seen', 'I see ice on the copper lines or the indoor unit', '@ts_coil_ice_stop', '', 'Ice seen on the cooling system.', { gate: 'ts_coil_ice' })]));
node('ts.step.sensors', 'Comfort settings', 'Sensors and sunlight', stepBody('SENSORS'), homeOpts('@ts_sensors_done_basic'));
node('ts.step.stage_latch', 'Comfort settings', 'Finish on high stage', stepBody('LATCH'), doneOpts('@ts_latch_done_basic'));

function res(id, outcome, title, explanation, actions, extra) {
  extra = extra || {};
  const tier = extra.tier || (outcome === 'emergency_exit' ? 'Emergency' : outcome === 'next_step' ? 'Basic homeowner check' : outcome === 'insufficient_info' ? 'More information needed' : 'Professional guidance');
  data.results[id] = {
    tier: tier, urgency: extra.urgency || (outcome === 'next_step' ? 'Keep the note' : 'Call a licensed HVAC professional'),
    title: u(title), explanation: u(explanation), actions: actions.map(u),
    avoid: u(extra.avoid || 'Don\u2019t open equipment, change wiring, or reset a breaker.'),
    source: extra.source || 'maintenance', outcome: outcome, reason: id,
    diyTier: outcome === 'next_step' ? 'basic' : null, gate: extra.gate || null, continueTo: null
  };
}
const doneLine = KEEP;
res('ts_offset_done_basic', 'next_step', 'Offset set', 'Check the thermometer again in a few days, and in the next season. If the difference changes, put the offset back to what you wrote down and call a pro. ' + data.lc.lc21 + ' ' + doneLine, ['Leave the note with the old number and the new number.', 'If the difference changes later, put the old number back.']);
res('ts_differential_done_basic', 'next_step', 'Swing setting changed', data.lc.lc20.replace('[Setting]', 'differential') + ' Count starts again next week. ' + doneLine, ['Leave the note with the old value and the new value.', 'If starts jump or the room swings more, put the old value back.']);
res('ts_cph_done_basic', 'next_step', 'Cycle rate changed', data.lc.lc20c + ' Cooling or heat pump cycle rate only goes down. ' + doneLine, ['Leave the note with the old number and the new number.', 'Don\u2019t raise the cooling or heat pump cycle rate above where it was.']);
res('ts_auto_deadband_done_basic', 'next_step', 'Auto settings changed', 'Watch the next change of season. ' + doneLine, ['Leave the note with the old Auto values.', 'If heat and cooling start running back to back, put the old value back.']);
res('ts_recovery_done_basic', 'next_step', 'Recovery setting changed', 'It can take a few days to learn. ' + doneLine, ['Leave the note with On or Off, before and after.', 'If mornings stay cold, put the old setting back.']);
res('ts_hp_lockouts_done_basic', 'next_step', 'Backup heat setting changed', LC33 + ' Check again before the first cold snap and put the old values back if a cold snap is coming. ' + doneLine, ['Leave the note with both outdoor values, before and after.', 'Put the old values back if the house gets cold.']);
res('ts_dehumidify_done_basic', 'next_step', 'Dehumidify setting changed', 'These settings can help lower indoor humidity. ' + data.lc.lc36.split('. ').slice(1).join('. ') + ' ' + doneLine, ['Leave the note with the old humidity and overcool values.', 'If you see ice, set cooling to Off and call a pro.']);
res('ts_latch_done_basic', 'next_step', 'Stage setting changed', doneLine, ['Leave the note with the old stage setting.', 'This result stays held until the stage steps are turned on.']);
res('ts_setback_done_basic', 'next_step', 'Schedule changed', 'On a heat pump, keep the change small and let recovery start early. ' + doneLine, ['Leave the note with the old schedule temperatures.', 'If mornings get cold, put the old schedule back.']);
res('ts_sensors_done_basic', 'next_step', 'Sensor settings changed', 'Learning features take a few days. ' + doneLine, ['Leave the note with which rooms participate.', 'Don\u2019t cover the thermostat.']);
res('ts_location_fix_basic', 'next_step', 'Move what\u2019s near it, not the thermostat', 'Move the lamp, TV, or device away. Close a blind at the sunny time. Point an adjustable vent away. Don\u2019t take the thermostat off the wall. Check again tomorrow with the thermometer.', ['Move the lamp, screen, or vent, not the thermostat.', 'Check again tomorrow with the thermometer.']);
res('ts_compressor_wait_normal', 'next_step', 'That wait is normal', 'The thermostat keeps the compressor off for a few minutes after it stops, to protect it. Wait about 5 minutes. This setting is for installers.', ['Wait about 5 minutes.', 'Don\u2019t change the compressor protection setting.'], { avoid: 'Don\u2019t change compressor protection or minimum off time.' });
res('ts_learning_period_wait', 'next_step', 'Give it a few days', 'Early start and sun features learn over the first few days. Leave the setting as it is while it learns.', ['Wait a few days before judging early start.', 'Come back if it still never starts early after that.']);
res('ts_recovery_explained_basic', 'next_step', 'Starting early is on purpose', 'It learned how long your home takes, so it starts early to be at your temperature on time. The screen may show Recovery or In Recovery. If you\u2019d rather it start at the schedule time, you can turn it off from the recovery steps.', ['Leave it on if you want the house ready at the schedule time.', 'Open the recovery steps later if you want it to start at the schedule time.']);
res('ts_defrost_normal_basic', 'next_step', 'Defrost is normal', 'In cold, damp weather the outdoor unit melts frost off itself. It may steam, and backup heat may run for a few minutes. If it happens many times an hour, or ice builds up on the outdoor unit, call a pro.', ['Let the defrost finish.', 'Call a pro if ice stays on the outdoor unit or defrost repeats many times an hour.']);
res('ts_reading_fault_pro', 'call_pro', 'The reading needs a pro', 'Big or drifting differences are not something to offset. ' + data.lc.lc21, ['Don\u2019t enter an offset for a drifting reading.', 'Call a licensed HVAC professional.']);
res('ts_location_pro', 'call_pro', 'The thermostat\u2019s spot needs a pro', 'Moving a thermostat or sealing the wall opening means taking it off the wall.', ['Leave the thermostat on the wall.', 'Call a licensed HVAC professional.']);
res('ts_equipment_cycling_pro', 'call_pro', 'The equipment may be shutting itself off', 'If it stops before the room reaches the setting, no thermostat setting fixes it. Causes include safety switches and airflow.', ['Don\u2019t keep changing comfort settings for this pattern.', 'Call a licensed HVAC professional.']);
res('ts_setup_check_pro', 'call_pro', 'Ask a pro to check the setup', 'Ask a licensed HVAC professional to check how the system is set up.', ['Call your installer or a licensed HVAC professional.', 'Write down what they say each setting is.']);
res('ts_new_install_installer', 'call_pro', 'Call your installer first', 'A new system or thermostat may still be under your installer\u2019s warranty. Ask them to check the setup, and ask what each of these settings is set to:', ['Call the installer who put the system in.', 'Ask what each listed setting is set to, and write the answers down.']);
res('ts_ask_installer_first', 'call_pro', 'Ask your installer first', data.lc.lc17, ['Ask your installer before changing that setting.', 'Come back after you have an answer.']);
res('ts_hp_not_keeping_up_pro', 'call_pro', 'Your heat pump isn\u2019t keeping up', LC33, ['Put back the values you wrote down.', 'Call a licensed HVAC professional if the house still can\u2019t keep up.']);
res('ts_stage_pro', 'call_pro', 'Staging needs a pro', 'How your system moves between high and low can be set at the thermostat, in the wiring, or at the equipment. A pro can check it. One setting to ask about is ' + LATCH + ': once it steps up to high, it stays on high until it shuts off. That can be set on purpose. Mention it if the room overshoots or your bills went up, or if the fan keeps speeding up and slowing down during one run.', ['Tell the pro what you heard and whether the room overshoots.', 'Ask about ' + LATCH + '.']);
res('ts_cold_weather_stop', 'call_pro', 'Leave backup heat settings for now', data.lc.lc39, ['Leave the backup heat settings as they are.', 'Call a licensed HVAC professional if the home isn\u2019t keeping up with heat now.']);
res('ts_comfort_not_fixed_pro', 'call_pro', 'It\u2019s time for a pro', 'Put back the values you wrote down. ' + data.lc.lc22, ['Put back the values you wrote down.', 'Call a licensed HVAC professional.']);
res('ts_coil_ice_stop', 'emergency_exit', 'Ice on the cooling system', 'If you see ice on the copper lines or the indoor unit, set cooling to Off, don\u2019t chip the ice, and call a licensed HVAC professional.', ['Set cooling to Off.', 'Don\u2019t chip the ice.', 'Call a licensed HVAC professional.'], { gate: 'ts_coil_ice', avoid: 'Don\u2019t chip the ice or keep running cooling.' });
res('ts_rated_min_unknown', 'insufficient_info', 'Find the rating first', LC30, ['Find the outdoor unit manual and the lowest outdoor temperature it is rated to run in.', 'Leave the heat pump minimum as it is until you have that number.'], { urgency: 'Rating needed first' });
res('ts_not_on_your_model', 'insufficient_info', 'Not on your model', data.lc.lc10, ['Stop on this setting.', 'Check the maker\u2019s help for your model.'], { urgency: 'Different model path' });
res('ts_geo_pro', 'call_pro', 'Ask a pro to check your geothermal or water-source system', 'Tell them what you wrote down. Ask them to check the water side too.', ['Tell the pro the numbers you wrote down.', 'Ask them to check the water side too.']);
res('ts_geo_noted_basic', 'next_step', 'Leave these as they are', 'On a geothermal or water-source system, these settings are for your installer. If backup heat starts running a lot, or the house isn\u2019t comfortable, call a licensed HVAC professional and tell them what you wrote down.', ['Leave the settings as they are.', 'Call a pro if backup heat starts running a lot.']);
res('ts_reading_unchecked', 'insufficient_info', 'Check with a thermometer first', 'Any separate thermometer works. Come back when you\u2019ve compared them.', ['Put a separate thermometer near the thermostat and compare twice.', 'Come back after you have both readings.'], { urgency: 'Thermometer check first' });

Object.keys(data.v1Fns).forEach(function (fn) { data.fnOf[data.v1Fns[fn]] = fn; });
['landing_short_cycling', 'landing_swings', 'landing_never_catches_up', 'landing_wrong_reading', 'landing_auto_mode', 'landing_backup_heat_cost', 'landing_humid', 'landing_stages'].forEach(function (id) {
  data.landingOf[id] = id.replace('landing_', '');
});
data.v1 = data.v0.concat(['ts.diag.reading_check', 'ts.diag.location', 'ts.diag.cycling', 'ts.diag.swing', 'ts.diag.recovery', 'ts.diag.auto_mode', 'ts.diag.heat_pump_aux', 'ts.diag.humidity', 'ts.diag.stages', 'ts.diag.new_install', 'ts.guard.cold_weather', 'ts.guard.outdoor_rating', 'ts.step.offset', 'ts.step.differential', 'ts.step.cph', 'ts.step.auto_deadband', 'ts.step.recovery', 'ts.step.setback', 'ts.step.hp_lockouts', 'ts.step.dehumidify', 'ts.step.sensors', 'ts.step.stage_latch', 'ts.guard.hp_source', 'ts.look.geo_lockouts']);
data.v1Generic = [];
Object.keys(data.steps).forEach(function (fn) {
  Object.keys(data.steps[fn]).forEach(function (key) {
    if (data.steps[fn][key].generic === true) data.v1Generic.push(fn + '|' + key);
  });
});

const newIds = data.v1.slice(data.v0.length);
if (newIds.length !== 24) throw new Error('node count ' + newIds.length);
let optCount = 0;
newIds.forEach(function (id) { optCount += data.nodes[id].options.length; });
optCount += 8;
if (optCount !== 206) throw new Error('new options ' + optCount);
const kinds = {};
['OFFSET', 'DIFF', 'CPH', 'AUTO', 'RECOV', 'SETBACK', 'HPLOCK', 'DEHUM', 'SENSORS', 'LATCH', 'GEO'].forEach(function (fn) {
  kinds[fn] = { text: 0, held: 0, pointer: 0, not_on_model: 0 };
  MODELS.forEach(function (model) {
    const cell = data.steps[fn][model];
    if (!cell) throw new Error('missing ' + fn + ' ' + model);
    kinds[fn][cell.kind] += 1;
    if (cell.text && cell.text.indexOf('\u0027') !== -1) throw new Error('apostrophe ' + fn + ' ' + model);
  });
});
const expectKinds = {
  OFFSET: { text: 3, held: 0, pointer: 0, not_on_model: 11 },
  DIFF: { text: 1, held: 0, pointer: 5, not_on_model: 8 },
  CPH: { text: 3, held: 0, pointer: 1, not_on_model: 10 },
  AUTO: { text: 5, held: 0, pointer: 0, not_on_model: 9 },
  RECOV: { text: 10, held: 0, pointer: 0, not_on_model: 4 },
  SETBACK: { text: 13, held: 0, pointer: 0, not_on_model: 1 },
  HPLOCK: { text: 6, held: 0, pointer: 0, not_on_model: 8 },
  DEHUM: { text: 5, held: 0, pointer: 8, not_on_model: 1 },
  SENSORS: { text: 6, held: 0, pointer: 7, not_on_model: 1 },
  LATCH: { text: 0, held: 2, pointer: 0, not_on_model: 12 },
  GEO: { text: 2, held: 0, pointer: 0, not_on_model: 12 }
};
Object.keys(expectKinds).forEach(function (fn) {
  if (JSON.stringify(kinds[fn]) !== JSON.stringify(expectKinds[fn])) throw new Error(fn + ' ' + JSON.stringify(kinds[fn]));
});
const banned = ['emergency heat mode', 'loop to rest', 'Installer Code', 'Installer Access', 'Once it switches to high, it stays on high until the room reaches the setting'];
const blob = JSON.stringify({ nodes: data.nodes, results: data.results, steps: data.steps, lc: data.lc, u1: data.u1 });
banned.forEach(function (phrase) { if (blob.indexOf(phrase) !== -1) throw new Error('banned phrase ' + phrase); });

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
const records = JSON.parse(fs.readFileSync(path.join(root, 'content/mirrors/compiled.json'), 'utf8'));
const serve = JSON.parse(fs.readFileSync(path.join(root, 'content/mirrors/serve-v0.json'), 'utf8'));
fs.writeFileSync(path.join(root, 'assets/ts-runtime.js'), 'window.SW_TS_BOOT=' + JSON.stringify({ data: data, records: records, serve: serve }) + ';\n');
console.log('composed v1 nodes', data.v1.length, 'generic', data.v1Generic.length, 'options+', optCount);
