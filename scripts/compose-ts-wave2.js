/* Authoring source for ts.settings.v1. Run once on ts.settings.v0 data.
 * Legal copy is 02 rev 8, plus the D-022 and D-027 strings in the PR #17 builder pass rev 3.
 * User copy is spec v2.2, with Legal replacements E7, E13, E19, and E20.
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
data.lc.lc23 = '**Don\u2019t change these. They protect your equipment and safety, and they\u2019re for professionals only:**\nCompressor protection or minimum off time\nSystem, equipment, or fuel type (including heat pump, furnace, boiler, gas, electric, or oil)\nFan operation for gas or electric heat (often shown as HG/HE or Fan in Heat)\nThe changeover point on a gas furnace plus heat pump system (often called dual fuel)\nHeat pump reversing valve (often shown as O/B)\nAnything about wiring, terminals, or accessories (humidifier, dehumidifier, ventilation)\nRaising the cooling or heat pump cycle rate (CPH) above where it was set\nIf a step would take you to one of these, stop. If a screen asks you to enter a password or access code, stop. That menu is for installers.';
data.lc.lc5 = 'Thanks. Stop here and don\u2019t keep pressing through menus. Your device may have a newer layout. Check [Brand]\u2019s official help page ([link]) or contact a licensed HVAC professional. Choosing this doesn\u2019t send us anything. To tell us this step is wrong, use Give beta feedback at the bottom of this page, or email support@secondwrench.co with the page link and what your screen shows. Don\u2019t include your address, phone number, or serial numbers. If you send a photo, show only the thermostat screen, with no faces, addresses, or other personal details.';
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
  { id: 'installer_setting_came_up', label: 'A step or screen is asking about a setting on the \u201CDon\u2019t change these\u201D list, or asks me to enter a password or access code', next: '@ts_installer_guard', hint: 'Don\u2019t change it.', fact: 'Locked installer setting came up.', gate: null },
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
  opt('wty_ask_installer', 'Ask my installer first', '@ts_ask_installer_first', '', ''),
  opt('wty_not_sure', 'Not sure', '@ts_ask_installer_first', '', '')
];
function stepTail(list) {
  return list.concat(TAIL.map(function (item) {
    return Object.assign({}, item, { fact: '' });
  }));
}
function doneOpts(resultId, extra) {
  const list = WTY.concat([
    opt('done_better', 'Done, and it\u2019s better after a day or so', resultId, '', ''),
    opt('no_change', 'I changed it, and nothing\u2019s better', '@ts_comfort_not_fixed_pro', '', ''),
    opt('worse_put_back', 'It got worse, so I put the old value back', '@ts_comfort_not_fixed_pro', '', ''),
    opt('not_on_my_model', 'My thermostat doesn\u2019t have this setting', '@ts_not_on_your_model', '', '')
  ]);
  return stepTail(list.concat(extra || []));
}
function homeOpts(resultId) {
  return stepTail([
    opt('done_better', 'Done, and it\u2019s better after a day or so', resultId, '', ''),
    opt('no_change', 'I changed it, and nothing\u2019s better', '@ts_comfort_not_fixed_pro', '', ''),
    opt('not_on_my_model', 'My thermostat doesn\u2019t have this setting', '@ts_not_on_your_model', '', '')
  ]);
}

const RECOV_TAIL = ' Write down On or Off first. **Watch:** the next few mornings. On: the house should be at temperature at the schedule time, and the screen may show Recovery or In Recovery before it. Off: it should start at the schedule time. It may take a few days to learn. **Stop** if the house stays cold or the bill rises; put it back.';
const SETBACK_LEAD = 'If you have a heat pump, make the night or away change smaller, one step at a time. Let early start do the work instead of moving the morning time earlier. Watch a few mornings: backup heat should come on less, and the house should be warm on time. If mornings get cold, put your old schedule back. ';
const CPH_T6_RULES = '4. Too many short cycles: lower it by 1. Furnace or boiler only: if the room swings or overshoots, you can raise the heat number by 1. Never raise 365 or 366. ';
const CPH_FP_RULES = '4. Too many short cycles: lower it by 1. Furnace or boiler only (Function 5, or Function 6 when it\u2019s a second furnace or boiler stage, not heat pump backup heat): if the room swings or overshoots, you can raise that number by 1. Never raise Function 9 or 10. On a heat pump, leave Functions 6 and 8 alone. ';
const CPH_TH_RULES = '4. Too many short cycles: lower it by 1. Furnace or boiler only (Function 5 on a TH4110D): if the room swings or overshoots, you can raise that number by 1. Never raise Function 9. On a TH4210D, leave Functions 6 and 8 alone. ';
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

const cphT6 = '1. Press and hold **Menu** for 5 seconds, then choose ISU. 2. Furnace or boiler: step to ISU **370 Heat 1 CPH** (and **371 Heat 2 CPH** for a second stage). Heat pump heating or cooling: ISU **365 Cool 1 CPH** (and **366**). Backup heat: **375 Aux Heat CPH**. Change nothing else. 3. Write down each number you\u2019ll change. ' + CPH_T6_RULES + '5. Save and go home. ' + CPH_WATCH;
const cphFp = '1. Press and hold **\u25B2** and **FAN** until the display changes. 2. Press **NEXT** to Function **5** (Stage 1 heat cycle rate); 6 is stage 2 or aux, 8 is emergency heat; **9** and **10** are compressor. Skip Functions 1, 2, 3 and 15. 3. Write down the number. ' + CPH_FP_RULES + '5. Press **DONE**. ' + CPH_WATCH;
const cphTh = '1. Press and hold **\u25B2** and **\u25BC** until the display changes. 2. Press \u25B2 to reach Function **5** (Heating cycle rate, TH4110D), **6** (Auxiliary heat, TH4210D), **8** (Emergency heat, TH4210D), or **9** (Compressor). Skip Functions 1 and 15. 3. Write down the number. ' + CPH_TH_RULES + '5. Hold \u25B2 and \u25BC to save and exit. ' + CPH_WATCH;
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
steps.AUTO['HW-X2P'] = textCell('HW-X2P', 'Hold bottom-left + **\u2191** 5 seconds; ISU **3000**: **1** enables Auto. Honeywell\u2019s guide advises against Auto where winter outdoor temperatures often stay below 50 °F (10 °C).', { installer_menu: true, fn: 'AUTO', settingName: 'Auto changeover', section: 'p.11', entry: 'bottom-left', num_sources: [{ label: 'MANUAL', item: 'Auto outdoor note', value: '50 °F' }] });
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
recov('HW-X2P', 'Hold bottom-left + **\u2191** 5 seconds; ISU **4090 Smart Response**: 1 Yes, 0 No.', { installer_menu: true, fn: 'RECOV', settingName: 'recovery', section: 'p.12', entry: 'bottom-left' });
steps.RECOV['HW-RTH76'] = Object.assign(blankCell('HW-RTH76', 'PDF p.22'), { held_text: 'RTH7600 recovery entry: button labels to be confirmed on the mirror check.' });
MODELS.forEach(function (model) { if (!steps.RECOV[model]) steps.RECOV[model] = blankCell(model, 'manual'); });

function holdNote(model) {
  const cell = data.steps.HOLD[model];
  if (cell && cell.text) return cell.text;
  const records = JSON.parse(fs.readFileSync(path.join(root, 'content/mirrors/compiled.json'), 'utf8'));
  const lines = [];
  records.forEach(function (rec) {
    if (rec.step_id === model + '.HOLD.01') (rec.our_instruction_text || []).forEach(function (line) { lines.push(line); });
  });
  if (!lines.length) throw new Error('missing HOLD copy ' + model);
  return lines.join(' ');
}
function setback(model, note, section, id) {
  steps.SETBACK[model] = textCell(model, SETBACK_LEAD + note, { installer_menu: false, fn: 'SETBACK', settingName: 'the schedule', section: section, fallback: fb(model, section, id) });
}
setback('ECB-PRM', 'Change your Comfort Settings in **MAIN MENU** > **COMFORT SETTINGS**. Away and \u201CI\u2019m Usually Away\u201D let the room drift 1 °F more before the system starts.', 'p.60');
NESTS.forEach(function (model) { setback(model, 'Change your **Eco Temperatures** in Settings > **Nest Sense**. Early-On waits until someone is home.', 'Eco Temperatures', 'F-NEST-SENSE'); });
['HW-T5', 'HW-T6', 'HW-T9'].forEach(function (model) { setback(model, 'Change your schedule in **Menu** > **Schedule**, or your Home and Away temperatures in the app.', 'schedule'); });
['HW-FP6', 'HW-TH4', 'HW-RTH76', 'HW-X2P', 'AMZ-AST'].forEach(function (model) { setback(model, holdNote(model), 'schedule'); });
steps.SETBACK['ECB-ESS'] = blankCell('ECB-ESS', 'support page');

const hplockEcb = '1. Check the thermostat is online (it uses outdoor weather). If not, stop. 2. **MAIN MENU** > **SETTINGS** > **INSTALLATION SETTINGS** > **THRESHOLDS**. 3. Write down **AUX HEAT MAX OUTDOOR TEMP** and **COMPRESSOR MIN OUTDOOR TEMP** (it may say Disabled). If you see **Aux Savings Optimization** instead (automatic staging), write down its level. 4. Backup heat runs in mild weather: lower **AUX HEAT MAX OUTDOOR TEMP** by one step, or move Aux Savings Optimization one level toward **Maximum**. Keep the aux maximum at or above the compressor minimum. 5. Go back to save. ' + WATCH_HP + ' ' + STOP_HP + ' ' + lc40('AUX HEAT MAX OUTDOOR TEMP') + ' ' + lc40('Aux Savings Optimization');
const hplockT6 = '1. Hold **Menu** 5 seconds, then ISU. 2. Look (don\u2019t change) at ISU **130**: it must say Wired or Internet. If it says None, stop. 3. Step to ISU **356 Aux Heat Lock Out** and **355 Balance Point**. If they aren\u2019t shown, your system isn\u2019t set up for them; stop. 4. Write down both. 5. Backup heat in mild weather: lower 356 by one step (5 °F). 356 must stay at or above 355 (Off on 356 means backup heat isn\u2019t limited by outdoor temperature). 6. Save. ' + WATCH_HP + ' ' + STOP_HP + ' ' + lc40('ISU 356') + ' Skip ISU 260 (dual fuel) and 340/350.';
const nestOff = ' If Heat Pump Balance is off, we don\u2019t guide the backup heat lockout temperature. Leave it as it is, or ask a licensed HVAC professional.';
const nestWifi = '1. Check that the thermostat is connected to Wi-Fi. Heat Pump Balance uses it to get your local weather. If it isn\u2019t connected, stop. ';
const nestTail = ' 3. Write down the choice (Max Comfort is the default). 4. Backup heat in mild weather: move one step toward **Max Savings**. House can\u2019t keep up: one step toward **Max Comfort**. Don\u2019t choose Off. ' + WATCH_HP + ' ' + STOP_HP + ' ' + lc40('Heat Pump Balance') + nestOff;
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
steps.HPLOCK['NEST-NT'] = textCell('NEST-NT', nestWifi + '2. Google Home app > your thermostat > **Settings** > **Temperature Preferences** > **Heat Pump Balance**.' + nestTail, { installer_menu: true, fn: 'HPLOCK', settingName: 'Heat Pump Balance', section: 'Heat Pump Balance', entry: 'Wi-Fi', fallback: fb('NEST-NT', 'Heat Pump Balance', 'F-NEST-HPB'), lc40: ['Heat Pump Balance'] });
steps.HPLOCK['NEST-LT4'] = textCell('NEST-LT4', nestWifi + '2. Home app > thermostat > **Equipment** > **Heat pump** > **Use Heat Pump Balance**. Change only Heat Pump Balance. Don\u2019t change anything else under Equipment. Don\u2019t open **Advanced configuration**.' + nestTail, { installer_menu: true, fn: 'HPLOCK', settingName: 'Heat Pump Balance', section: 'Heat Pump Balance', entry: 'Wi-Fi', fallback: fb('NEST-LT4', 'Heat Pump Balance', 'F-NEST-HPB'), lc40: ['Heat Pump Balance'] });
['NEST-LT3', 'NEST-E'].forEach(function (model) {
  steps.HPLOCK[model] = textCell(model, nestWifi + '2. Ring > **Settings** > **Nest Sense** > **Heat Pump Balance**.' + nestTail, { installer_menu: true, fn: 'HPLOCK', settingName: 'Heat Pump Balance', section: 'Heat Pump Balance', entry: 'Wi-Fi', fallback: fb(model, 'Heat Pump Balance', 'F-NEST-HPB'), lc40: ['Heat Pump Balance'] });
});
MODELS.forEach(function (model) { if (!steps.HPLOCK[model]) steps.HPLOCK[model] = blankCell(model, 'manual'); });

steps.DEHUM['ECB-PRM'] = textCell('ECB-PRM', '1. **MAIN MENU** > **SYSTEM** > **DEHUMIDIFY USING AC** > **Enable**, then pick a humidity level (homeowner menu). Write down what it was. 2. For more drying, **INSTALLATION SETTINGS** > **THRESHOLDS** > **AC OVERCOOL MAX**: write down the value, then raise it one step. It stops at the overcool limit or the humidity level, whichever comes first. 3. Too cold: lower AC Overcool Max one step. **Watch:** the indoor humidity on the thermostat and how the house feels, for a day. **Stop** if rooms get too cold or it runs much longer; put back your values. Dehumidifier accessory setup stays with a pro.', { installer_menu: true, fn: 'DEHUM', settingName: 'the dehumidify setting', section: 'p.105', entry: 'INSTALLATION SETTINGS' });
NESTS.forEach(function (model) {
  steps.DEHUM[model] = textCell(model, '**Cool to Dry** in Nest Sense (Settings). Write down whether it was on. Humidity Helper and accessory setup are pro-only.', { installer_menu: false, fn: 'DEHUM', settingName: 'Cool to Dry', section: 'Cool to Dry', fallback: fb(model, 'Cool to Dry', 'F-NEST-SENSE') });
});
['HW-T5', 'HW-T6', 'HW-T9', 'HW-FP6', 'HW-TH4', 'HW-RTH76', 'HW-X2P', 'AMZ-AST'].forEach(function (model) {
  steps.DEHUM[model] = pointerCell(model, 'Your thermostat has no dehumidify setting. Make sure the fan is on Auto, not On, while cooling.', 'manual');
});
steps.DEHUM['ECB-ESS'] = blankCell('ECB-ESS', 'support page');

steps.SENSORS['ECB-PRM'] = textCell('ECB-PRM', 'Sensor participation per Comfort Setting: **MAIN MENU** > **COMFORT SETTINGS** > tap the Comfort Setting > sensors; compare readings in **MAIN MENU** > **SETTINGS** > **SENSORS**. **Follow Me** gives priority to occupied rooms. Put a sensor about four feet up, away from vents, fans, outside walls, windows and sun. **Watch:** a day or two in the rooms you use most. **Stop** if a room still doesn\u2019t match after that, and put the sensor settings back the way they were.', { installer_menu: false, fn: 'SENSORS', settingName: 'sensors', section: 'p.89' });
steps.SENSORS['HW-T9'] = textCell('HW-T9', '**Set Sensor Priority** for each schedule period: active (motion) rooms or selected rooms. **Watch:** a day or two in those rooms. **Stop** if the priority rooms still don\u2019t match the rest of the home, and put the priority back the way it was.', { installer_menu: false, fn: 'SENSORS', settingName: 'sensor priority', section: 'p.5' });
steps.SENSORS['NEST-LT4'] = textCell('NEST-LT4', 'Sun: Home app > Settings > **Temperature Preferences** > Nest Sense > **Sunblock**. It needs a few days to learn. Temperature Sensor: change its schedule, or move it a couple of feet away from vents, windows, and outside doors, about chest height. **Watch:** a few days, while it learns. **Stop** if the reading still jumps when sun hits the thermostat, or the sensor room still doesn\u2019t match, and put the settings back the way they were.', { installer_menu: false, fn: 'SENSORS', settingName: 'Sunblock', section: 'Sunblock', fallback: fb('NEST-LT4', 'Sunblock', 'F-NEST-SUN') });
['NEST-LT3', 'NEST-E'].forEach(function (model) {
  steps.SENSORS[model] = textCell(model, 'Sun: ring > Settings > **Nest Sense** > **Sunblock**. It needs a few days to learn. Temperature Sensor: change its schedule, or move it a couple of feet away from vents, windows, and outside doors, about chest height. **Watch:** a few days, while it learns. **Stop** if the reading still jumps when sun hits the thermostat, or the sensor room still doesn\u2019t match, and put the settings back the way they were.', { installer_menu: false, fn: 'SENSORS', settingName: 'Sunblock', section: 'Sunblock', fallback: fb(model, 'Sunblock', 'F-NEST-SUN') });
});
steps.SENSORS['NEST-NT'] = textCell('NEST-NT', 'No Sunblock on this model. Temperature Sensor: change its schedule, or move it a couple of feet away from vents, windows, and outside doors, about chest height. **Watch:** a day or two. **Stop** if the sensor room still doesn\u2019t match, and put the sensor settings back the way they were.', { installer_menu: false, fn: 'SENSORS', settingName: 'Temperature Sensor', section: 'Temperature Sensor', fallback: fb('NEST-NT', 'Temperature Sensor', 'F-NEST-SENSOR') });
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
    opt('only_backup_heat', 'Only the backup heat limit, or Heat Pump Balance', 'ts.step.hp_lockouts', '', '', { flag: 'ts_rated_min=not_needed' }),
    opt('raise_hp_min', 'Raising the heat pump minimum, so backup heat takes over sooner', 'ts.step.hp_lockouts', '', '', { flag: 'ts_rated_min=not_needed' }),
    opt('lower_hp_min_rating_known', 'Lowering the heat pump minimum, and I found my outdoor unit\u2019s rated minimum in its manual', 'ts.step.hp_lockouts', '', '', { flag: 'ts_rated_min=known' }),
    opt('lower_hp_min_rating_unknown', 'Lowering the heat pump minimum, but I don\u2019t have the rating', '@ts_rated_min_unknown', '', '')
  ]));
node('ts.diag.humidity', 'What you noticed', 'What do you notice?', '',
  withTail([
    opt('fan_on', 'The fan is set to On all the time', 'ts.settings.fan', '', 'Fan On in cooling season.'),
    opt('want_dehumidify', 'I want the system to dry the air more', 'ts.step.dehumidify', '', ''),
    opt('overcool_cold', 'It gets too cold while it dries the air', 'ts.step.dehumidify', '', 'Overcool too cold.'),
    opt('ice_seen', 'I see ice on the copper lines or the indoor unit', '@ts_coil_ice_stop', '', '', { gate: 'ts_coil_ice' }),
    opt('short_runs_humid', 'It cools in short bursts and stays humid', 'ts.diag.cycling', '', '')
  ]));
node('ts.diag.stages', 'What you noticed', 'What do you notice?',
  'Two-stage systems usually run on low most of the time and use high when it\u2019s very hot or cold. You can usually tell by sound and airflow: high is louder and blows harder. Some are set to finish on high stage (some brands call this \u201Clatching\u201D): once high starts, it keeps running until the room reaches the setting. Others drop back to low first. This can be set at the thermostat, in the wiring, or at the equipment, and most of that is pro work.',
  withTail([
    opt('holds_high', 'It starts quieter, then gets louder and blows harder and stays that way until it shuts off, and the room overshoots or the bills went up', '@ts_stage_pro', '', 'Holds high stage until satisfied (sound/airflow).'),
    opt('bounces', 'During one run, the fan keeps speeding up and slowing down, again and again, or the room never quite reaches the setting', '@ts_stage_pro', '', 'Blower speed up and down within one call, or never satisfies.'),
    opt('geo_system', 'It\u2019s a geothermal or water-source system', '@ts_stage_pro', '', 'Geothermal system.', { flag: 'ts_geo' }),
    opt('after_big_change', 'It only runs on high after a big temperature change', 'ts.step.setback', '', 'High stage after big change.'),
    opt('check_stage_settings', 'Show me the stage settings on my thermostat', 'ts.step.stage_latch', '', '', { requiresFlag: 'stageLatchStepsEnabled' })
  ]));
node('ts.look.geo_lockouts', 'Before backup-heat settings', 'Look only: write down your lockout settings', '{step panel: GEO}',
  withTail([
    opt('geo_lock_temp', 'The heat pump or compressor lockout shows a temperature, not Off or Disabled', '@ts_geo_pro', '', 'Geo compressor lockout set to a temperature.'),
    opt('geo_aux_mild', 'Backup heat runs a lot when it\u2019s mild outside', '@ts_geo_pro', '', 'Geo backup heat runs in mild weather.'),
    opt('geo_all_off', 'It shows Off or Disabled (or isn\u2019t shown), and backup heat doesn\u2019t run much', '@ts_geo_noted_basic', '', 'Geo lockouts Off or not shown.'),
    opt('not_on_my_model', 'My thermostat doesn\u2019t show these', '@ts_geo_noted_basic', '', '')
  ]));

function stepBody(token) { return '{step panel: ' + token + '}'; }
node('ts.step.offset', 'Comfort settings', 'Temperature offset', stepBody('OFFSET'), doneOpts('@ts_offset_done_basic'));
node('ts.step.differential', 'Comfort settings', 'Temperature swing', stepBody('DIFF'), doneOpts('@ts_differential_done_basic', [opt('use_cph_instead', 'My thermostat uses cycle rate instead', 'ts.step.cph', '', '')]));
node('ts.step.cph', 'Comfort settings', 'Cycle rate', stepBody('CPH'), doneOpts('@ts_cph_done_basic', [opt('want_raise_compressor', 'I want to raise the cooling or heat pump cycle rate', '@ts_installer_guard', '', '')]));
node('ts.step.auto_deadband', 'Comfort settings', 'Auto heat and cool', stepBody('AUTO'), doneOpts('@ts_auto_deadband_done_basic'));
node('ts.step.recovery', 'Comfort settings', 'Early start and recovery', stepBody('RECOV'), doneOpts('@ts_recovery_done_basic'));
node('ts.step.setback', 'Comfort settings', 'Schedule and away temperatures', stepBody('SETBACK'), homeOpts('@ts_setback_done_basic'));
node('ts.step.hp_lockouts', 'Comfort settings', 'Backup heat settings', stepBody('HPLOCK'), doneOpts('@ts_hp_lockouts_done_basic', [opt('house_cold_after', 'The house got cold after the change', '@ts_hp_not_keeping_up_pro', '', '')]));
node('ts.step.dehumidify', 'Comfort settings', 'Dehumidify settings', stepBody('DEHUM'), doneOpts('@ts_dehumidify_done_basic', [opt('ice_seen', 'I see ice on the copper lines or the indoor unit', '@ts_coil_ice_stop', '', '', { gate: 'ts_coil_ice' })]));
node('ts.step.sensors', 'Comfort settings', 'Sensors and sunlight', stepBody('SENSORS'), homeOpts('@ts_sensors_done_basic'));
node('ts.step.stage_latch', 'Comfort settings', 'Finish on high stage', stepBody('LATCH'), doneOpts('@ts_latch_done_basic'));

function res(id, outcome, title, explanation, extra) {
  extra = extra || {};
  const tier = extra.tier || (outcome === 'emergency_exit' ? 'Emergency' : outcome === 'next_step' ? 'Basic homeowner check' : outcome === 'insufficient_info' ? 'More information needed' : 'Professional guidance');
  const row = {
    tier: tier, urgency: extra.urgency || (outcome === 'next_step' ? 'Keep the note' : 'Call a licensed HVAC professional'),
    title: u(title), explanation: u(explanation), actions: [], avoid: '',
    source: extra.source || 'maintenance', outcome: outcome, reason: id,
    diyTier: outcome === 'next_step' ? 'basic' : null, gate: extra.gate || null, continueTo: null
  };
  if (extra.nextAction) row.nextAction = { label: u(extra.nextAction.label), next: extra.nextAction.next };
  data.results[id] = row;
}
res('ts_offset_done_basic', 'next_step', 'Offset set', 'Check with your thermometer again in a few days, and again next season. If the difference changes, put the offset back to the value you wrote down and call a licensed HVAC professional. ' + data.lc.lc21 + ' ' + KEEP);
res('ts_differential_done_basic', 'next_step', 'Swing setting changed', 'Count how many times it starts in an hour again next week, at about the same time of day. Fewer starts and a comfortable room mean it worked. ' + data.lc.lc20.replace('[Setting]', 'differential') + ' ' + KEEP);
res('ts_cph_done_basic', 'next_step', 'Cycle rate changed', 'Count how many times it starts in an hour again next week. Remember, the cooling or heat pump cycle rate only goes down from where it was set. ' + data.lc.lc20c + ' ' + KEEP);
res('ts_auto_deadband_done_basic', 'next_step', 'Auto settings changed', 'Watch how it switches between heating and cooling over the next change of season. ' + KEEP);
res('ts_recovery_done_basic', 'next_step', 'Recovery setting changed', 'It can take a few days to learn how long your home takes to warm up or cool down. ' + KEEP);
res('ts_hp_lockouts_done_basic', 'next_step', 'Backup heat setting changed', 'Check this again before the first cold snap. If one is coming, put back the values you wrote down. ' + LC33 + ' ' + KEEP);
res('ts_dehumidify_done_basic', 'next_step', 'Dehumidify setting changed', 'Watch how the house feels for a day. If you see ice on the copper lines or the indoor unit, set cooling to Off, don\u2019t chip the ice, and call a licensed HVAC professional. ' + KEEP);
res('ts_latch_done_basic', 'next_step', 'Stage setting changed', 'Watch the next few times it heats or cools. If it runs worse, put back the value you wrote down. ' + KEEP);
res('ts_setback_done_basic', 'next_step', 'Schedule changed', 'If you have a heat pump, keep schedule changes small and let early start do the work. Watch a few mornings. ' + KEEP);
res('ts_sensors_done_basic', 'next_step', 'Sensor settings changed', 'Learning features can take a few days. ' + KEEP);
res('ts_location_fix_basic', 'next_step', 'Move what\u2019s near it, not the thermostat', 'Move the lamp, TV, or other device away from the thermostat. If sun hits it at one time of day, close a blind or curtain then. If an adjustable vent blows on it, point the vent away. Don\u2019t take the thermostat off the wall. Check again tomorrow with your thermometer.');
res('ts_compressor_wait_normal', 'next_step', 'That wait is normal', 'After your system stops, the thermostat keeps it off for a few minutes to protect the equipment. Wait about 5 minutes. This delay is set in the installer menu, so leave it as it is.');
res('ts_learning_period_wait', 'next_step', 'Give it a few days', 'Early start and sun features learn over the first few days. Check again after that.');
res('ts_recovery_explained_basic', 'next_step', 'Starting early is on purpose', 'Your thermostat learned how long your home takes to warm up or cool down, so it starts early to reach your temperature at the schedule time. The screen may show Recovery or In Recovery. If you\u2019d rather it start at the schedule time, you can turn this off.', { nextAction: { label: 'Open the early start steps', next: 'ts.step.recovery' } });
res('ts_defrost_normal_basic', 'next_step', 'Defrost is normal', 'In cold, damp weather, the outdoor unit melts frost off itself. It may steam, and backup heat may run for a few minutes. If it happens many times an hour, or ice keeps building up on the outdoor unit, call a licensed HVAC professional.');
res('ts_reading_fault_pro', 'call_pro', 'The reading needs a pro', 'A big or drifting difference isn\u2019t something to fix with an offset. A licensed HVAC professional can check the thermostat and its sensor.');
res('ts_location_pro', 'call_pro', 'The thermostat\u2019s spot needs a pro', 'Moving a thermostat or sealing the opening behind it means taking it off the wall. That\u2019s a job for a licensed HVAC professional.');
res('ts_equipment_cycling_pro', 'call_pro', 'The equipment may be shutting itself off', 'If it stops before the room reaches your setting, a thermostat setting won\u2019t fix it. The equipment may be stopping itself, for example because of a safety switch or airflow. Call a licensed HVAC professional.');
res('ts_setup_check_pro', 'call_pro', 'Ask a pro to check the setup', 'Some of what you\u2019re seeing can come from how the thermostat was set up. Ask a licensed HVAC professional to check these settings:');
res('ts_new_install_installer', 'call_pro', 'Call your installer first', 'A new system or thermostat may still be under your installer\u2019s warranty. Ask them to check the setup, and ask what each of these settings is set to:');
res('ts_ask_installer_first', 'call_pro', 'Ask your installer first', data.lc.lc17);
res('ts_hp_not_keeping_up_pro', 'call_pro', 'Your heat pump isn\u2019t keeping up', LC33);
res('ts_stage_pro', 'call_pro', 'Staging needs a pro', 'How your system moves between high and low can be set at the thermostat, in the wiring, or at the equipment. A pro can check it. One setting to ask about is ' + LATCH + ': once it steps up to high, it stays on high until it shuts off. That can be set on purpose. Mention it if the room overshoots or your bills went up, or if the fan keeps speeding up and slowing down during one run.');
res('ts_cold_weather_stop', 'call_pro', 'Leave backup heat settings for now', data.lc.lc39);
res('ts_comfort_not_fixed_pro', 'call_pro', 'It\u2019s time for a pro', 'Put back the values you wrote down. ' + data.lc.lc22);
res('ts_coil_ice_stop', 'emergency_exit', 'Ice on the cooling system', 'If you see ice on the copper lines or the indoor unit, set cooling to Off, don\u2019t chip the ice, and call a licensed HVAC professional.', { gate: 'ts_coil_ice' });
res('ts_rated_min_unknown', 'insufficient_info', 'Find the rating first', LC30, { urgency: 'Rating needed first' });
res('ts_not_on_your_model', 'insufficient_info', 'Not on your model', data.lc.lc10 + ' ' + data.lc.lc9, { urgency: 'Different model path' });
res('ts_geo_pro', 'call_pro', 'Ask a pro to check your geothermal or water-source system', 'Tell them what you wrote down. Ask them to check the water side too.');
res('ts_geo_noted_basic', 'next_step', 'Leave these as they are', 'On a geothermal or water-source system, these settings are for your installer. If backup heat starts running a lot, or the house isn\u2019t comfortable, call a licensed HVAC professional and tell them what you wrote down.');
res('ts_reading_unchecked', 'insufficient_info', 'Check with a thermometer first', 'Any separate thermometer works. Put it near the thermostat, wait 20 to 30 minutes, and compare. Then come back.', { urgency: 'Thermometer check first' });

Object.keys(data.v1Fns).forEach(function (fn) { data.fnOf[data.v1Fns[fn]] = fn; });
['landing_short_cycling', 'landing_swings', 'landing_never_catches_up', 'landing_wrong_reading', 'landing_auto_mode', 'landing_backup_heat_cost', 'landing_humid', 'landing_stages'].forEach(function (id) {
  data.landingOf[id] = id.replace('landing_', '');
});
data.v1 = data.v0.concat(['ts.diag.reading_check', 'ts.diag.location', 'ts.diag.cycling', 'ts.diag.swing', 'ts.diag.recovery', 'ts.diag.auto_mode', 'ts.diag.heat_pump_aux', 'ts.diag.humidity', 'ts.diag.stages', 'ts.diag.new_install', 'ts.guard.cold_weather', 'ts.guard.outdoor_rating', 'ts.step.offset', 'ts.step.differential', 'ts.step.cph', 'ts.step.auto_deadband', 'ts.step.recovery', 'ts.step.setback', 'ts.step.hp_lockouts', 'ts.step.dehumidify', 'ts.step.sensors', 'ts.step.stage_latch', 'ts.guard.hp_source', 'ts.look.geo_lockouts', 'ts.settings.em_aux_check']);
data.v1Generic = [];
Object.keys(data.steps).forEach(function (fn) {
  Object.keys(data.steps[fn]).forEach(function (key) {
    if (data.steps[fn][key].generic === true) data.v1Generic.push(fn + '|' + key);
  });
});

const COLD_HOME = opt('cold_home_risk', 'The house is getting cold, and someone at home is at risk from the cold (an infant, an older adult, or someone who is ill or medically fragile)', '@ts_cold_home_urgent', 'Warmth first.', 'House getting cold with someone at risk reported.');
node('ts.settings.em_aux_check', 'Emergency heat', 'Before you switch emergency heat off',
  'Emergency heat is sometimes left on for a reason. A technician may leave it on while the heat pump waits for a repair, or when the outdoor unit is iced over or not running. Switching back to Heat then can leave the house without enough heat. Answer from what you already know.',
  withTail([
    COLD_HOME,
    opt('eh_tech_left_on', 'A technician or installer left it on emergency heat, or told me to use it until a repair', '@ts_eheat_keep_pro', 'Leave it on.', 'Emergency heat was left on by a technician or on a pro\u2019s advice.'),
    opt('eh_outdoor_problem', 'The outdoor unit is iced over, damaged, or hasn\u2019t been running', '@ts_eheat_keep_pro', 'Leave it on. A pro checks the heat pump.', 'Outdoor unit reported iced over, damaged, or not running.'),
    opt('not_sure', 'I\u2019m not sure why it\u2019s on', '@ts_eheat_keep_pro', 'Leave it on. Ask your technician or installer why.', 'Not sure why emergency heat is on.'),
    opt('eh_no_reason', 'No one left it on for a repair, and the heat pump has been working', 'ts.settings.em_aux_heat', 'Steps to switch back to Heat.', 'No known reason for emergency heat; heat pump reported working.'),
    opt('eh_aux_only', 'It isn\u2019t on emergency heat. Backup heat (Aux) runs a lot in normal Heat', '@ts_aux_persistent', '', '')
  ]));
['ts.diag.cycling', 'ts.diag.heat_pump_aux', 'ts.diag.recovery'].forEach(function (id) {
  data.nodes[id].options.unshift(Object.assign({}, COLD_HOME));
});
const newIds = data.v1.slice(data.v0.length);
if (newIds.length !== 25) throw new Error('node count ' + newIds.length);
let optCount = 0;
newIds.forEach(function (id) { optCount += data.nodes[id].options.length; });
optCount += 8;
if (optCount !== 218) throw new Error('new options ' + optCount);
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
const HAZARD_LABEL = 'New hazard now (burning smell, smoke, sparks, gas smell, CO alarm, refrigerant leak alarm, or water at electrical parts)';
HAZARD.label = HAZARD_LABEL;
Object.keys(data.nodes).forEach(function (id) {
  data.nodes[id].options.forEach(function (op) {
    if (op.id === 'hazard_now') op.label = HAZARD_LABEL;
  });
});
const emNode = data.nodes['ts.settings.em_aux_heat'];
emNode.options.unshift(Object.assign({}, COLD_HOME));
const heatFail = emNode.options.filter(function (op) { return op.id === 'heat_pump_failure'; })[0];
if (heatFail) heatFail.label = u('It shows HEAT PUMP FAILURE, or after switching to Heat the outdoor unit isn\u2019t running or is iced');
const landingEm = data.nodes['ts.landing.picker'].options.filter(function (op) { return op.id === 'landing_em_aux_heat'; })[0];
landingEm.next = 'ts.settings.em_aux_check';
['ts.settings.mode_setpoint', 'ts.power.blank_screen', 'ts.status.wait_delay'].forEach(function (id) {
  data.nodes[id].options.unshift(Object.assign({}, COLD_HOME));
});
const stops = data.nodes['ts.gate.safety_stops'];
const noneAt = stops.options.findIndex(function (op) { return op.id === 'ts_none_of_these'; });
stops.options.splice(noneAt, 0, opt('refrigerant_alarm', 'A refrigerant leak alarm or alert is going off (some newer systems have a leak sensor that can show an alert on the thermostat)', '@ts_refrigerant_alarm', 'Leave the area. Don\u2019t reset it.', 'Refrigerant leak alarm or alert reported at the thermostat check.', { gate: 'ts_refrigerant_alarm' }));
const alertNode = data.nodes['ts.alert.capture'];
const recordedAt = alertNode.options.findIndex(function (op) { return op.id === 'code_recorded'; });
alertNode.options.splice(recordedAt, 0, opt('code_refrigerant_alarm', 'It says refrigerant leak, leak detected, or refrigerant sensor', '@ts_refrigerant_alarm', 'Leave the area. Don\u2019t reset it.', 'Thermostat showed a refrigerant leak alert.', { gate: 'ts_refrigerant_alarm' }));
const blank = data.nodes['ts.power.blank_screen'];
blank.body = u('First: any burning smell, smoke, scorched wires, or a refrigerant leak alarm? Choose the last option.\n\n' + blank.body.replace(/^First:[^\n]*\n\n/, ''));
const powerBack = blank.options.filter(function (op) { return op.id === 'power_back'; })[0];
powerBack.fact = 'The screen came back on during the floor checks.';
const stillBlank = blank.options.filter(function (op) { return op.id === 'still_blank'; })[0];
stillBlank.fact = 'The screen stayed blank after the floor checks.';
const landingPicker = data.nodes['ts.landing.picker'];
landingPicker.body = u(landingPicker.body.replace('If anything new comes up, like a burning smell, smoke, a CO alarm, or water at electrical parts, choose the last option.', 'If anything new comes up, like a burning smell, smoke, a CO alarm, a refrigerant leak alarm, or water at electrical parts, choose the last option.'));
const waitHint = landing.options.filter(function (op) { return op.id === 'landing_wait_delay'; })[0];
waitHint.hint = u('Usually a normal delay of a few minutes.');
const waitNode = data.nodes['ts.status.wait_delay'];
waitNode.title = u('Give it a few minutes');
waitNode.body = u('Many systems wait a few minutes, often about 5, before cooling (or heat-pump heating) starts again. That protects the equipment. Some models and setups wait longer. Changing the setting during the wait can start it over.\n\n1. Make one change, then don\u2019t touch it for 5 minutes.\n\n{step panel: WAIT}');
const waitCleared = waitNode.options.filter(function (op) { return op.id === 'wait_cleared'; })[0];
waitCleared.fact = 'User waited, and the system started.';
const waitPersists = waitNode.options.filter(function (op) { return op.id === 'wait_persists'; })[0];
waitPersists.label = u('It\u2019s still waiting after 5 minutes, or it happens every time');
waitPersists.fact = 'User waited 5 minutes. The wait message stayed, or it happens on every call.';
const modeNode = data.nodes['ts.settings.mode_setpoint'];
modeNode.body = u('1. Set the mode to Heat for heat, or Cool for cooling. Off stops normal heating and cooling. On a Google Nest, Off can still turn on heating or cooling when the home reaches a Safety Temperature that\u2019s turned on. Don\u2019t rely on it to keep pipes from freezing.\n2. Set the temperature at least 3°F above the room for Heat, or at least 3°F below the room for Cool.\n3. Wait 5 minutes. Many systems wait a few minutes to protect the equipment, and changing the setting again starts that wait over.\n\n{step panel: MODE}');
const calling = modeNode.options.filter(function (op) { return op.id === 'calling_nothing_runs'; })[0];
calling.label = u('The screen says it\u2019s heating or cooling, but nothing runs after 5 minutes');
calling.fact = 'User set the mode and temperature. The thermostat showed a call, but nothing ran after 5 minutes.';
const fanNode = data.nodes['ts.settings.fan'];
fanNode.body = u('Auto runs the fan only while heating or cooling. After heating or cooling stops, many systems keep the fan running for a few minutes to push out the warm or cool air left in the ducts. That\u2019s normal. On runs it all the time. Some thermostats also have Circulate, or a minimum fan time each hour, which runs it between cycles.\n\n1. Set the fan to Auto.\n2. Stop any fan timer or fan schedule.\n3. If your thermostat has a minimum fan time, turn it down to zero.\n\n{step panel: FAN}');
const fanAuto = fanNode.options.filter(function (op) { return op.id === 'fan_runs_on_auto'; })[0];
fanAuto.label = u('The fan keeps running with Fan on Auto and no heating or cooling');
fanAuto.fact = 'User set the fan to Auto. The fan kept running with no heating or cooling.';
const battery = data.nodes['ts.power.battery'];
battery.title = u('Low-battery warning');
battery.body = u('What to do depends on your model. Some take batteries you can replace. Others charge a built-in battery from the system, or have no battery at all. Follow the steps for your model below. If you\u2019d have to disconnect any wires to reach batteries, stop.\n\n{step panel: BATT}');
const nestBrand = data.nodes['ts.intake.brand_picker'].options.filter(function (op) { return op.id === 'brand_nest'; })[0];
nestBrand.hint = u('Round thermostats.');
const nest = data.nodes['ts.model.nest'];
const nestLt3 = nest.options.filter(function (op) { return op.id === 'nest_lt3'; })[0];
nestLt3.label = u('Nest Learning Thermostat (3rd gen)');
nestLt3.hint = u('Has a turning ring and a large screen, about 3.25 in (8.3 cm) across.');
nestLt3.fact = 'Thermostat model: Nest Learning Thermostat (3rd gen).';
const nestSure = nest.options.filter(function (op) { return op.id === 'not_sure'; })[0];
nestSure.hint = u('Check the box, or the Google Home app if it shows your thermostat.');
const lt12At = nest.options.findIndex(function (op) { return op.id === 'nest_lt3'; }) + 1;
nest.options.splice(lt12At, 0, opt('nest_lt12', 'Nest Learning Thermostat (1st or 2nd gen)', '@ts_nest_unsupported', 'Has a turning ring and a small screen, about 1.8 in (4.6 cm) across.', 'Thermostat model: Nest Learning Thermostat (1st or 2nd gen).'));
data.models['NEST-LT3'].label = 'Nest Learning Thermostat (3rd gen)';
const hw = data.nodes['ts.model.honeywell_smart'];
const hwT6 = hw.options.filter(function (op) { return op.id === 'hw_t6'; })[0];
hwT6.label = u('T6 Pro Smart (TH6320WF or TH6220WF)');
hwT6.fact = 'Thermostat model: Honeywell Home T6 Pro Smart (TH6320WF or TH6220WF).';
const t6OtherAt = hw.options.findIndex(function (op) { return op.id === 'hw_t6'; }) + 1;
hw.options.splice(t6OtherAt, 0, opt('hw_t6_other', 'Another T6 Pro model', '@ts_model_not_in_v0', 'Not covered in this first version.', 'Honeywell T6 Pro model outside the checked models.'));
data.models['HW-T6'].label = 'Honeywell Home T6 Pro Smart (TH6320WF or TH6220WF)';
const t6Power = 'This model has no batteries. It gets its power from the heating and cooling system.';
['POWER', 'BATT'].forEach(function (fn) {
  const cell = data.steps[fn]['HW-T6'];
  cell.text = u(t6Power);
  cell.generic = false;
  cell.kind = 'text';
  cell.fallback = [{ id: 'F-HW-T6', section: 'p.29' }];
});
data.steps.BATT['HW-T9'].text = u('The thermostat itself has no batteries. It gets its power from the heating and cooling system. If you have wireless room sensors, they use AAA batteries. If the thermostat shows LOW SENSOR BATTERIES or asks you to change the batteries in a sensor, put 2 fresh AAA alkaline batteries in the sensor it names.');
const fnByNode = {};
Object.keys(data.v1Fns).forEach(function (fn) { fnByNode[data.v1Fns[fn]] = fn; });
Object.keys(data.nodes).forEach(function (id) {
  data.nodes[id].options.forEach(function (op) {
    if (fnByNode[op.next]) op.requires = fnByNode[op.next];
  });
});
data.results.ts_screen_different.explanation = data.lc.lc5;
data.results.ts_blank_after_basics.explanation = u('If the screen stays blank or keeps losing power after the floor checks, the usual causes are a loose or missing power wire or a problem at the furnace or air-handler controls. A pro checks those.');
data.results.ts_wait_cleared_basic.explanation = u('Many systems wait a few minutes before starting again, to protect the equipment.');
data.results.ts_wait_cleared_basic.actions = [
  'Change the setting once, then give it 5 minutes.',
  'If the wait lasts longer than 5 minutes or happens every time, call a licensed HVAC professional.'
].map(u);
data.results.ts_wait_persists.explanation = u('A wait that lasts past 5 minutes, or comes back every time, can mean a power drop, a wiring fault, or an equipment problem that a pro should check.');
data.results.ts_fan_problem_pro.explanation = u('If the fan keeps running long after heating or cooling stops with the thermostat on Auto, or won\u2019t run at all, the cause is usually in the equipment or its controls, which a pro checks.');
const LEAK_ACTION = 'If a refrigerant leak alarm is going off, move people out of the affected area to fresh air without operating switches or creating ignition sources. Don\u2019t reset the alarm, cycle power, or turn off a blower that\u2019s running. Call a licensed HVAC professional from outside the affected area, and for breathing trouble or immediate danger, call 911.';
res('ts_eheat_keep_pro', 'call_pro', 'Leave emergency heat on until a pro checks the heat pump.', 'Emergency heat may be on for a reason: a technician left it on, or the outdoor unit is iced over, damaged, or not running. If so, it may be what\u2019s keeping the house warm, and switching back to Heat could leave you without enough heat. If you\u2019re not sure why it\u2019s on, leave it on until you know. Emergency heat costs more to run, so get the heat pump checked soon.');
data.results.ts_eheat_keep_pro.urgency = 'Leave emergency heat on for now';
data.results.ts_eheat_keep_pro.actions = [
  'Leave the mode on emergency heat.',
  'Call the technician or installer who last worked on your system, or a licensed HVAC professional. Ask whether emergency heat should stay on, and tell them what the thermostat shows and whether the outdoor unit runs.',
  'If the house is getting cold, call a licensed HVAC professional. If it\u2019s dangerously cold and anyone is at risk, get them somewhere warm first.'
].map(u);
data.results.ts_eheat_keep_pro.avoid = u('Don\u2019t switch back to Heat until your technician or a licensed HVAC professional says it\u2019s OK. Don\u2019t change backup-heat settings or clear ice from the outdoor unit yourself.');
res('ts_refrigerant_alarm', 'emergency_exit', 'Do not reset a refrigerant-leak alarm.', 'Some systems use automatic leak-mitigation controls. This beta cannot identify the refrigerant, concentration, or alarm cause.', { tier: 'Stop / professional', urgency: 'Leave the affected area', gate: 'ts_refrigerant_alarm' });
data.results.ts_refrigerant_alarm.reason = 'refrigerant_alarm';
data.results.ts_refrigerant_alarm.actions = [
  'Move people out of the affected area to fresh air without operating switches or creating ignition sources.',
  'Call a licensed HVAC professional with EPA 608 capability from outside the affected area and follow the equipment\u2019s alarm instructions. For breathing trouble or immediate danger, call 911.',
  'Do not DIY-seal a leak or add refrigerant.'
].map(u);
data.results.ts_refrigerant_alarm.avoid = u('Do not turn off a mitigation blower, cycle power, bypass a sensor, use flames, or open refrigerant lines.');
res('ts_cold_home_urgent', 'call_pro', 'Get warm first, then call a pro.', 'A house that\u2019s losing heat with someone at risk from the cold needs a licensed HVAC professional today. This check stops here.', { urgency: 'Warmth first \u00b7 call a pro today' });
data.results.ts_cold_home_urgent.actions = [
  'If the house is getting cold, call a licensed HVAC professional. If it\u2019s dangerously cold and anyone is at risk, get them somewhere warm first.',
  'Call a licensed HVAC professional and tell them someone at home is at risk from the cold.',
  'If the thermostat is on Heat or emergency heat, leave it there. If it\u2019s on Off or Cool and the screen works, you can set it to Heat. Don\u2019t change any other settings.'
].map(u);
data.results.ts_cold_home_urgent.avoid = u('Don\u2019t use an oven, stove, grill, or outdoor heater to warm the house.');
res('ts_nest_unsupported', 'call_pro', 'Google ended app support for this Nest model.', 'Since October 25, 2025, Nest Learning Thermostats (1st and 2nd gen) no longer connect to or work in the Google Home or Nest app. You can still change the mode, temperature, schedule, and other settings on the thermostat itself. We don\u2019t have checked steps for this model. If you have a Nest Protect, it no longer connects to this thermostat, and its emergency shut-off no longer runs. If a smoke or CO alarm sounds, leave the home and call 911 from outside.', { urgency: 'No app support for this model' });
data.results.ts_nest_unsupported.actions = [
  'Use the thermostat\u2019s own menu, or Google\u2019s help page for this model: Google Nest Help, \u201CEnd of support for Nest Learning Thermostats (1st & 2nd gen)\u201D (https://support.google.com/googlenest/answer/16233096).',
  'If heating or cooling isn\u2019t working after you check the mode and temperature, call a licensed HVAC professional.'
].map(u);
data.results.ts_nest_unsupported.avoid = u('Don\u2019t follow app steps meant for newer Nest models, and don\u2019t take the thermostat off the wall to check the model.');
data.results.ts_hazard_now.actions = [
  'If you smell gas or a carbon monoxide alarm is sounding, leave the building and call for help from outside. Do not operate switches inside.',
  'If there is smoke, fire, or sparks, get people away and call 911 from safety.',
  'If water is at electrical equipment, stay clear. Shut power only from a dry place you already know.',
  LEAK_ACTION,
  'Do not return to troubleshooting until the hazard has been handled.'
].map(u);
data.results.ts_eheat_off_basic.actions.push(u('If the outdoor unit doesn\u2019t run in Heat, or it ices up, switch back to emergency heat and call a licensed HVAC professional.'));

const banned = ['emergency heat mode', 'loop to rest', 'Installer Code', 'Installer Access', 'Once it switches to high, it stays on high until the room reaches the setting'];
const blob = JSON.stringify({ nodes: data.nodes, results: data.results, steps: data.steps, lc: data.lc, u1: data.u1 });
banned.forEach(function (phrase) { if (blob.indexOf(phrase) !== -1) throw new Error('banned phrase ' + phrase); });

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
const records = JSON.parse(fs.readFileSync(path.join(root, 'content/mirrors/compiled.json'), 'utf8'));
const serve = JSON.parse(fs.readFileSync(path.join(root, 'content/mirrors/serve-v0.json'), 'utf8'));
fs.writeFileSync(path.join(root, 'assets/ts-runtime.js'), 'window.SW_TS_BOOT=' + JSON.stringify({ data: data, records: records, serve: serve }) + ';\n');
console.log('composed v1 nodes', data.v1.length, 'generic', data.v1Generic.length, 'options+', optCount);
