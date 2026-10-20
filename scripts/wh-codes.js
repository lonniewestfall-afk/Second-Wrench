'use strict';
/* Cleared water-heater code rows. User-facing strings only. No policy ids. */

const RINNAI_TITLE = 'Troubleshooting Tankless Water Heater Diagnostic Codes';
const RINNAI_URL = 'https://media.rinnai.us/salsify_asset/s-30a549e1-7b9f-43cb-9b19-52764756638e/100000652-Troubleshooting%20TWH%20Diagnostic%20Codes%20(3).pdf';
const RINNAI_CAPTION = 'Rinnai’s diagnostic guide says only trained professionals should work on this code. Note the code exactly as shown and call a licensed plumber or water heater professional.';
const NORITZ_TITLE = 'GQ-C59 Error Code Index | Noritz Troubleshooting';
const NORITZ_URL = 'https://ezshoot.noritz.com/gq59/index.html';
const NORITZ_CAPTION = 'Noritz lists this code in its online troubleshooting guide for its GQ-C59 models, written for service professionals. Codes can mean different things on other models, so check your manual. Note the code and call a licensed plumber or water heater professional.';
const NORITZ_OG = 'https://noritz-www-public.s3.us-west-1.amazonaws.com/wp-content/uploads/2018/05/NCC199CDV-Owners-Guide.pdf';

function rinnaiCite(page) {
  return RINNAI_TITLE + ', ' + RINNAI_URL + ', p. ' + page;
}
function noritzCite(entry) {
  return 'Guide entry: ' + entry + '. ' + NORITZ_TITLE + ', ' + NORITZ_URL + ', checked October 20, 2026.';
}

const RINNAI_PRO = [
  ['05', 'Bypass Flow Control Device', '2'],
  ['07', 'Circulation Flow Rate Below 2.1 GPM', '2'],
  ['13', 'Combustion', '2'],
  ['15', 'Venturi Control', '2'],
  ['17', 'Venturi Blockage', '28'],
  ['18', 'Gas Valve Adjustment Limit', '2'],
  ['19', 'Electrical Grounding', '31'],
  ['21', 'Data Transfer Error', '2'],
  ['22', 'Gas Valve Adjustment', '2'],
  ['30', 'Flammable Vapor Sensor', '35'],
  ['31', 'Burner Thermocouple', '2'],
  ['32', 'Outgoing Water Temperature Thermistor Fault', '2'],
  ['33', 'Heat Exchanger Thermistor', '2'],
  ['34', 'Combustion Air Temperature Thermistor for Non-SENSEI Series Lime Detecting Thermistor for SENSEI RX/CX Series', '2'],
  ['35', 'Tank Temperature Sensor', '2'],
  ['38', 'Exhaust Gas Temperature Sensor', '42'],
  ['41', 'Freeze Protection Sensor (External Water Heaters for SENSEI and Non-SENSEI Series, All Water Heaters for SENSEI RX/CX Series)', '44'],
  ['51', 'Inlet Water Temperature Thermistor', '2'],
  ['54', 'High Exhaust Gas Temperature', '49'],
  ['57', 'Burner Overheat Bi-Metal Switch', '2'],
  ['58', 'Secondary Heat Exchanger Sensor', '2'],
  ['63', 'Recirculation Low Flow', '2'],
  ['66', 'Bypass Flow Servo', '2'],
  ['70', 'PC Board Fault', '2'],
  ['71', 'Gas Solenoid Valve', '2'],
  ['72', 'Flame Rod Fault', '2'],
  ['73', 'Burner Thermocouple Fault', '2'],
  ['FE', 'Flammable Vapors Detected', '63'],
  ['SE', 'Cascade Diagnostic Display', '2']
].map(([code, meaning, page]) => ({
  brand: 'rinnai',
  code,
  meaning,
  proGuide: true,
  caption: RINNAI_CAPTION,
  citation: rinnaiCite(page),
  title: RINNAI_TITLE,
  url: RINNAI_URL
}));

const NORITZ_PRO = [
  ['10', 'Air flow abnormality', 'Error Code 10/90'],
  ['12', 'Flame loss', 'Error Code 12'],
  ['16', 'Abnormally high input (output) temperature', 'Error Code 15/16'],
  ['20', 'High Limit Switch triggered', 'Error Code 20'],
  ['63', 'Recirculation abnormality', 'Error Code 06/63'],
  ['65', 'Water Servo — Main abnormality', 'Error Code 65'],
  ['66', 'Water Servo — Bypass abnormality', 'Error Code 66'],
  ['73', 'Circuit Board setting abnormality', 'Error Code 73'],
  ['99', 'How to reset the lock of the unit', 'Error Code 90[8] / 99'],
  ['F76', 'Multi system communication error', 'Error Code(F)76']
].map(([code, meaning, entry]) => ({
  brand: 'noritz',
  model: 'gq-c59',
  code,
  meaning,
  proGuide: true,
  caption: NORITZ_CAPTION,
  citation: noritzCite(entry),
  title: NORITZ_TITLE,
  url: NORITZ_URL
}));

function row(brand, code, meaning, ownerStep, citation, step) {
  return { brand, code, meaning, ownerStep: ownerStep || '', citation, step: step || null, proGuide: false };
}

const OWNER = [
  row('rinnai', '02', 'No burner operation during freeze protection', 'Keep power on.', rinnaiCite('6')),
  row('rinnai', '03', 'Power interruption during bath fill', 'Note it.', rinnaiCite('9')),
  row('rinnai', '10', 'Air supply or exhaust blockage', 'Clear snow or debris at the outside terminals by hand, from the ground.', rinnaiCite('12'), 'wh.tankless.vent_clear'),
  row('rinnai', '11', 'No ignition', 'Look only: is the gas handle in line with the pipe, and does gas work elsewhere? Don’t turn the handle.', rinnaiCite('16')),
  row('rinnai', '12', 'Flame failure', 'Look at the propane gauge. Don’t turn a gas valve.', rinnaiCite('20')),
  row('rinnai', '14', 'Thermal fuse or overheat', 'Stop using hot water.', rinnaiCite('23')),
  row('rinnai', '16', 'Outgoing water too hot', 'Stop using hot water. For a serious burn, call 911.', rinnaiCite('27')),
  row('rinnai', '25', 'Condensate pump error or a clogged drain', 'Look at the drain outlet. Don’t open the cover.', rinnaiCite('34')),
  row('rinnai', '52', 'Gas valve', '', rinnaiCite('46')),
  row('rinnai', '61', 'Combustion fan motor', '', rinnaiCite('52')),
  row('rinnai', '65', 'Water flow control device', '', rinnaiCite('55')),
  row('rinnai', '79', 'Water leakage detected', 'If water is near electrical parts, stay out and call 911 or your utility. Otherwise use the main shutoff steps.', rinnaiCite('62'), 'wh.water.shutoff'),
  row('rinnai', 'FF', 'Maintenance performed', 'This code is informational.', rinnaiCite('64')),
  row('rinnai', 'SS', 'Service soon', 'Schedule service.', rinnaiCite('66')),
  row('rinnai', '00', 'Scale build-up; may lock out', 'Schedule a descale.', rinnaiCite('67')),
  row('rinnai', 'LC', 'Scale build-up; may lock out', 'Schedule a descale.', rinnaiCite('67')),
  row('rinnai', 'SEt', 'Initial settings by a professional', '', rinnaiCite('5')),
  row('navien', 'E003', 'Ignition failure', 'Look at the gas handle and the propane gauge. Don’t turn the handle. One front-panel Reset, only if this is the first reset today.', 'Navien NPE-2 Installation and Operation Manual, section 5.2, p. 16; Reset, section 3.4, p. 9.', 'wh.tankless.reset_once'),
  row('navien', 'E004', 'False flame', 'One front-panel Reset, only if this is the first reset today.', 'Navien NPE-2 Installation and Operation Manual, p. 16.', 'wh.tankless.reset_once'),
  row('navien', 'E012', 'Flame loss', 'One front-panel Reset, and note the time. Only if this is the first reset today.', 'Navien NPE-2 Installation and Operation Manual, p. 16.', 'wh.tankless.reset_once'),
  row('navien', 'E016', 'Heat exchanger overheat', 'Stop using hot water.', 'Navien NPE-2 Installation and Operation Manual, p. 16.'),
  row('navien', 'E030', 'Exhaust overheat (over 149 °F)', 'Stop using hot water and look at the outside terminal. Don’t open the cover.', 'Navien NPE-2 Installation and Operation Manual, p. 16.'),
  row('navien', 'E110', 'Abnormal air pressure', 'Clear snow or debris at the outside terminals by hand, from the ground.', 'Navien NPE-2 Installation and Operation Manual, p. 16.', 'wh.tankless.vent_clear'),
  row('navien', 'E438', 'Recirculation pump', 'Check the recirculation mode setting on the normal user display. Don’t enter an installer menu.', 'Navien NPE-2 Installation and Operation Manual, p. 16.'),
  row('navien', 'E515', 'PCB', 'One front-panel Reset, only if this is the first reset today.', 'Navien NPE-2 Installation and Operation Manual, p. 16.', 'wh.tankless.reset_once'),
  row('navien', 'E517', 'DIP switch', '', 'Navien NPE-2 Installation and Operation Manual, p. 16.'),
  row('navien', 'E760', 'Flushing or service alarm', 'Schedule service with the installer.', 'Navien NPE-2 Installation and Operation Manual, p. 16.'),
  row('rheem', '1L', 'Lime build-up', 'Schedule a descale with the dealer.', 'Rheem RTGH Use and Care, p. 75.'),
  row('rheem', '11', 'Gas shut-off not fully open', 'Look only. A gas shut-off handle usually lines up with the pipe when open. Don’t turn it.', 'Rheem RTGH Use and Care, p. 75.'),
  row('rheem', '12', 'Gas interrupted or LP low', 'Refill propane, or call the gas utility for service. Don’t turn a gas valve on the heater.', 'Rheem RTGH Use and Care, p. 75.'),
  row('rheem', '14', 'Overheating', 'Stop using hot water.', 'Rheem RTGH Use and Care, p. 75.'),
  row('rheem', '29', 'Neutralizer clogged', 'Look at the drain. Don’t open the cover.', 'Rheem RTGH Use and Care, p. 75.'),
  row('rheem', '31', 'Inlet thermistor', '', 'Rheem RTGH Use and Care, p. 75.'),
  row('rheem', '33', 'Outlet thermistor', '', 'Rheem RTGH Use and Care, p. 75.'),
  row('rheem', '61', 'Blower', '', 'Rheem RTGH Use and Care, p. 75.'),
  row('rheem', '66', 'Bypass motor', '', 'Rheem RTGH Use and Care, p. 75.'),
  row('rheem', '71', 'Solenoid valve circuit', '', 'Rheem RTGH Use and Care, p. 75.'),
  row('rheem', '88', 'Flush or filter reminder', 'Schedule service.', 'Rheem RTGH Use and Care, p. 75.'),
  row('rheem', '90', 'Air intake or vent blocked', 'Remove any blockage. (Air intake requires 12 in. [30 cm] of clearance.) Clear it by hand, from the ground. Don’t reach into the pipe.', 'Rheem RTGH Use and Care, p. 75.', 'wh.tankless.vent_clear'),
  row('rheem', '99', 'Air intake or vent blocked', 'Remove any blockage. (Air intake requires 12 in. [30 cm] of clearance.) Clear it by hand, from the ground. Don’t reach into the pipe.', 'Rheem RTGH Use and Care, p. 75.', 'wh.tankless.vent_clear'),
  row('rheem', 'P1', 'Not enough water flow', 'Open the hot tap more.', 'Rheem RTGH Use and Care, p. 75.', 'wh.tankless.flow_check'),
  row('noritz', '11', 'Ignition error', 'Look at the gas valve. Don’t turn it. Then the one-time remote power restart, only for this code on an NCC199CDV.', 'Noritz NCC199CDV Owner’s Guide, p. 42, ' + NORITZ_OG + ', checked October 15, 2026.', 'wh.tankless.reset_noritz'),
  row('noritz', '90', 'Air supply or exhaust vent clogged, low gas pressure, or a condensate drain that is clogged or frozen', 'Look at the outside vent and clear loose snow or debris by hand. Look at the drain line. Don’t chip or melt ice. Gas supply pressure is a professional check.', 'Noritz NCC199CDV Owner’s Guide, p. 42, ' + NORITZ_OG + ', checked October 15, 2026.', 'wh.tankless.vent_clear'),
  row('noritz', 'C1', 'Service reminder (scale, or dust and lint in the fan)', 'Schedule maintenance. Noritz 866-766-7489.', 'Noritz NCC199CDV Owner’s Guide, p. 42, ' + NORITZ_OG + ', checked October 15, 2026.'),
  row('takagi', '031', 'Incorrect DIP switch', '', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 10.'),
  row('takagi', '101', 'Abnormal combustion (lockout imminent)', 'Stop using hot water.', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 10.'),
  row('takagi', '111', 'Ignition failure', 'Look at the gas handle and the propane gauge. Don’t turn the handle.', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 10.'),
  row('takagi', '121', 'Flame loss', 'Look at the gas handle and the propane gauge. Don’t turn the handle.', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 10.'),
  row('takagi', '311', 'Outlet thermistor', '', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 10.'),
  row('takagi', '321', 'Inlet thermistor', '', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 10.'),
  row('takagi', '341', 'Exhaust thermistor', '', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 10.'),
  row('takagi', '391', 'Air-fuel ratio rod', '', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 10.'),
  row('takagi', '510', 'Main gas valve', '', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 11.'),
  row('takagi', '551', 'Solenoid gas valve', '', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 11.'),
  row('takagi', '611', 'Fan motor', '', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 11.'),
  row('takagi', '701', 'Board or gas solenoid drive circuit', '', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 11.'),
  row('takagi', '711', 'Board or gas solenoid drive circuit', '', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 11.'),
  row('takagi', '721', 'False flame', '', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 11.'),
  row('takagi', '741', 'Remote or temperature controller communication', 'Look: is the controller cable connected? Don’t use tools.', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 11.'),
  row('takagi', '751', 'Remote or temperature controller communication', 'Look: is the controller cable connected? Don’t use tools.', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 11.'),
  row('takagi', '941', 'Abnormal exhaust temperature', 'Stop using hot water and look at the outside terminal.', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 11.'),
  row('takagi', '991', 'Imperfect combustion', 'Stop using hot water.', 'Takagi Condensing Models On-Demand Water Heater Service Handbook 100267626, p. 11.')
];

OWNER.forEach(item => {
  if (item.brand === 'noritz') item.model = 'ncc199';
});

const CODES = OWNER.concat(RINNAI_PRO, NORITZ_PRO);

function findCode(brand, model, code) {
  const want = String(code || '').toUpperCase();
  return CODES.find(item => {
    if (item.brand !== brand || String(item.code).toUpperCase() !== want) return false;
    if (item.model && item.model !== model) return false;
    if (item.proGuide && item.brand === 'noritz' && model !== 'gq-c59') return false;
    return true;
  }) || null;
}

module.exports = {
  CODES,
  RINNAI_PRO,
  NORITZ_PRO,
  RINNAI_TITLE,
  RINNAI_URL,
  RINNAI_CAPTION,
  NORITZ_TITLE,
  NORITZ_URL,
  NORITZ_CAPTION,
  NORITZ_OG,
  findCode
};
