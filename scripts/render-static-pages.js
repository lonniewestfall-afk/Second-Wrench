'use strict';
/* Static answer and maintenance pages. No app bundle. Regenerates sitemap.xml. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const ORIGIN = 'https://secondwrench.co';
const ICON = ORIGIN + '/assets/icons/icon-512.png';
const UPDATED = '2026-10-15';
const PO2 = "Turn the system Off at the thermostat. Then switch off its breaker (or the outdoor disconnect or service switch near the unit). When you're done and everything is dry, switch it back on. If a breaker trips again or keeps tripping, leave it off and call a licensed HVAC professional. Never open the breaker panel cover or the disconnect box.";
const CC1 = 'Never use a pressure washer on your outdoor unit. It can flatten the fins and damage the coil.';
const CC2 = 'If you use a coil cleaner, use one sold for home AC coils and follow its label exactly: mixing, how long it sits, rinsing, gloves and eye protection. Keep it off plants, pets and the electrical parts. Never mix cleaners.';
const CC3 = "Use a garden hose with a gentle spray or a pump sprayer, from outside the grille. Don't brush, comb or touch the fins. Don't spray into the electrical box or the fan motor.";
const CC4 = "Your owner's manual recommends a qualified technician for this cleaning. You can choose to do it yourself, but it's your call.";
const CC5 = "Your manual says not to clean this unit with water because of the risk of electric shock or damage. Don't hose or spray it. Leave coil cleaning to a licensed HVAC professional.";
const CHECK_MANUAL = "Check your owner's manual first.";
const WARRANTY = '**Warranty note:** Your warranty may require professional maintenance or product registration. Check your warranty and your owner’s manual before you do a task yourself. Some makers require service records or work by a licensed pro. When in doubt, ask your installer or the maker. Following a checklist here does not keep, protect, or extend a warranty.';
const SCHEDULE = 'Pick a time you’ll remember. Your manual sets how often.';
const HERO = 'Free home maintenance checklists — see what your manual asks for between pro visits.';
const WH_SAFETY = '**Safety first:** If you smell gas, leave now and call the gas utility or 911 from outside. If a CO alarm sounds, get everyone outside and call 911. If hot water or steam is spraying from the heater or its relief pipe, stay back. For a serious burn, call 911.';
const { RINNAI_PRO, RINNAI_CAPTION, RINNAI_TITLE, RINNAI_URL } = require('./wh-codes');
const GUIDE = ORIGIN + '/#/';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function inline(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}
function blocksToHtml(blocks) {
  return blocks.map(b => {
    if (b.section) return `<section id="${esc(b.section)}">\n${blocksToHtml(b.blocks)}\n</section>`;
    if (b.h2) return `<h2>${inline(b.h2)}</h2>`;
    if (b.h3) return `<h3>${inline(b.h3)}</h3>`;
    if (b.p) return `<p>${inline(b.p)}</p>`;
    if (b.ul) return `<ul>\n${b.ul.map(i => `<li>${inline(i)}</li>`).join('\n')}\n</ul>`;
    if (b.ol) return `<ol>\n${b.ol.map(i => `<li>${inline(i)}</li>`).join('\n')}\n</ol>`;
    if (b.note) return `<aside class="warranty-note"><p>${inline(b.note)}</p></aside>`;
    throw new Error('Unknown block ' + JSON.stringify(b).slice(0, 80));
  }).join('\n');
}
function link(href, label) { return `[${label}](${href})`; }
function abs(p) { return ORIGIN + p; }

function coilSteps() {
  return [
    { p: PO2 },
    { p: '**' + CC1 + '**' },
    { p: CC2 },
    { p: CC3 }
  ];
}
function coilBlocks() {
  return [
    { h2: 'Outdoor coil cleaning' },
    { p: '**' + CC1 + '**' },
    { section: 'brand-cc5', blocks: [
      { h3: 'Trane, Daikin, and Amana' },
      { p: CC5 },
      { p: 'No water or chemical steps are shown for Trane, Daikin, or Amana.' }
    ]},
    { section: 'brand-carrier', blocks: [
      { h3: 'Carrier' },
      ...coilSteps()
    ]},
    { section: 'brand-cc4', blocks: [
      { h3: 'Bosch, Goodman, Lennox, and Rheem' },
      { p: CC4 },
      { note: WARRANTY },
      ...coilSteps()
    ]},
    { section: 'brand-silent', blocks: [
      { h3: 'Other brands' },
      { p: CHECK_MANUAL },
      ...coilSteps()
    ]},
    { h3: 'Sources for the brand split' },
    { ul: [
      '[Carrier, AC maintenance](https://www.carrier.com/us/en/residential/hvac-resources/air-conditioners/ac-maintenance/)',
      'Trane DLR-SVN004A-EN, page 3. The public URL was not recorded with that file, so it is not linked here.',
      '[Daikin 3P515859-5S](https://www.daikincity.com/document/Installation%20Manual/3P515859-5S)',
      '[Amana ASXS6/ASZS6 installation reference](https://www.gearypacific.com/ASSETS/DOCUMENTS/CMS/EN/Static_PDF/Amana_SSeries/AC%20Install%20man%20ASXS6.pdf)',
      '[Goodman IOG-4009P](https://mobile.goodmanmfg.com/mobileapp/stellent/pdf/infoPdf/Lit/IOG-4009P.pdf)',
      '[Lennox AC homeowner manual](https://www.lennox.com/dA/bd142ec100/Lennox%20AC%20Homeowners%20Manual.pdf)',
      '[Rheem 708367-0](https://files.rheem.com/LiteratureArchive/7083670.pdf)'
    ]}
  ];
}
function manualOnly(name, siblings) {
  return [
    { p: SCHEDULE },
    { note: WARRANTY },
    { p: `Follow your owner’s manual for ${name}. This page does not add tasks beyond the warranty note.` },
    { p: 'When something is wrong, ' + link(GUIDE, 'start the guided check') + '.' },
    { h2: 'Related' },
    { ul: siblings }
  ];
}

const WH_PM = abs('/answers/water-heater-maintenance-checklist/');
const pages = [];

function add(page) { pages.push(page); }

add({
  path: '/answers/no-hot-water/',
  title: 'No Hot Water? What to Check First',
  description: 'Gas or electric, tank or tankless: the first checks to make, and when to call a licensed plumber.',
  crumb: 'No hot water',
  kind: 'answer',
  blocks: [
    { p: WH_SAFETY },
    { p: 'Most no-hot-water calls come down to four things: the heater lost power or gas, it locked out on a code, it ran out of stored hot water, or (tankless) the flow is too low to start it. You can check all four without opening anything.' },
    { h2: 'Causes, most common first' },
    { ol: [
      '**A safety lockout or code.** Gas tanks blink a status light; tankless units show a code. Writing it down is the fastest route to a fix. See the tankless error-code page.',
      '**Gas supply.** Is the stove working? On propane, check the tank gauge. A gas shut-off handle usually lines up with the pipe when open. Look, don’t turn it.',
      '**Power.** Electric and heat-pump tanks need 240 V; many tankless units need a 120 V outlet. Look at the breaker. If it’s tripped, leave it and call (we never reset breakers on water heaters; a trip means a fault).',
      '**Ran out.** A tank needs time to recover after heavy use. Check again after the recovery time your manual lists, or later the same day.',
      '**Tankless minimum flow.** Navien needs at least 0.5 gal/min; Noritz starts at 0.5 GPM (manuals). A barely open tap may stay cold.',
      '**Heat pump in a cold room.** A.O. Smith switches to electric below 45 °F room air (Use & Care pp. 20–21).'
    ]},
    { h2: 'Checks and fixes you can try' },
    { ul: [
      'Read and record the code or blink count.',
      'Tankless: one front-panel **Reset** if your manual allows (Navien), the unplug-replug restart on a cord-and-plug Rheem RTGH when the cord, plug and outlet are dry and undamaged, or on a Noritz NCC199CDV code 11 the remote **power** off → open a hot tap → **power** on (Owner’s Guide, p. 42). Once only. Never flip a breaker to reset.',
      'Clear snow or leaves from an outside vent by hand, from the ground.',
      'Heat pump: check the mode is Hybrid or Heat Pump; clean the filter if your manual says to leave power on (GE, Bradford White).',
      'Gas tank warm but never hot: turn the temperature dial one mark, as your manual shows, and check the water at a tap before anyone uses it.'
    ]},
    { h2: 'It’s not normal if' },
    { p: 'The code comes back after one reset; the breaker trips; the pilot is out (relighting is a pro job here); you see water at the base; the vent is damaged or iced.' },
    { h2: 'Is this normal?' },
    { p: 'A short cold burst between runs of hot water is common on a tankless heater — the burner pauses and restarts. Between back-to-back showers, leave a short gap or keep the hot tap running steadily instead of turning it off and on. If it keeps happening every time, use the cold-water sandwich steps in this guide.' },
    { h2: 'Know exactly why not' },
    { p: 'A returning code means a real fault (gas pressure, flame sensing, venting or a sensor) that needs testing inside the cover. A tripped breaker on a water heater usually means a shorted element or wiring at 240 V. A pilot that won’t stay lit points at the thermocouple or gas control: gas work.' },
    { p: link(GUIDE, 'Start the guided check') + ' and choose Water heater.' },
    { h2: 'Sources' },
    { ul: [
      'Navien NPE-2, pp. 9, 15–16',
      'Noritz NCC199CDV Owner’s Guide, pp. 39, 42, checked October 15, 2026',
      'Rheem RTGH, pp. 74–75',
      'A.O. Smith 100277324, pp. 20–21',
      'GE GeoSpring, p. 10'
    ]},
    { h2: 'Related' },
    { ul: [
      link(abs('/answers/tankless-water-heater-error-code/'), 'Tankless water heater error code'),
      link(abs('/answers/water-heater-leaking/'), 'Water heater leaking'),
      link(WH_PM, 'Water heater maintenance checklist')
    ]}
  ]
});

add({
  path: '/answers/water-heater-leaking/',
  title: 'Water Heater Leaking: What to Do Right Now',
  description: 'The first steps when your water heater leaks, and how to tell a drip from a failure.',
  crumb: 'Water heater leaking',
  kind: 'answer',
  blocks: [
    { p: WH_SAFETY },
    { p: 'First make sure water isn’t near outlets or the panel. Then find where it’s coming from. A drip from the relief-valve pipe, a fitting, or condensation is often fixable; water from the tank body means the tank needs replacing.' },
    { h2: 'Right now' },
    { p: 'If water is near outlets, cords, the heater’s controls or the panel, stay out of it and call 911 or your utility. If water is spreading and you already know where your main water shutoff is, close it by hand (no tools, not in standing water; street/meter-pit valves belong to the water utility). Then call a licensed plumber or water heater professional.' },
    { h2: 'Causes, most common first' },
    { ol: [
      '**Relief valve pipe dripping or running.** Often high pressure or heat (thermal expansion). Don’t lift, cap or plug it.',
      '**Fittings at the top** (water lines, valve threads). Slow drips that run down the jacket look like a tank leak.',
      '**Condensation** on a gas tank after a big cold-water draw: A.O. Smith says it stops once the tank warms, usually 1–2 hours (Use & Care 100277666, p. 23).',
      '**Heat pump condensate tube** kinked or sitting in water.',
      '**Drain valve** at the bottom weeping.',
      '**Tank body corrosion:** the tank itself is leaking.'
    ]},
    { h2: 'Checks you can do' },
    { p: 'Dry the area with a towel and watch where water reappears in the next hour; straighten a kink in a heat pump’s outside drain tube by hand; place a pan or towels. Tankless Rinnai code 79 = leak detected: same steps.' },
    { h2: 'It’s not normal if' },
    { p: 'The relief pipe hisses or runs continuously; water is steaming; water reaches electrical parts.' },
    { h2: 'Is this normal?' },
    { p: 'A few drops of water on a new or recently cold gas tank after a big draw is often condensation. A.O. Smith says it usually stops once the tank warms, in about 1–2 hours (Use & Care 100277666, p. 23). Not normal if it keeps coming after that, or if it’s more than a few drops — treat that as a leak and call a licensed plumber or water heater professional.' },
    { h2: 'Know exactly why not' },
    { p: 'A leaking tank body can’t be patched; the tank must be replaced. Fittings and valves can be fixed, but only after the tank is drained and depressurized. A relief valve that discharges is reacting to too much pressure or heat; finding why (expansion tank, pressure, a failing control) takes gauges.' },
    { p: link(GUIDE, 'Start the guided check') + ' and choose Water heater, then water at the base.' },
    { h2: 'Sources' },
    { ul: ['A.O. Smith 100277666, p. 23', 'Rheem gas Use & Care, pp. 20–21', 'Rinnai tankless codes, p. 62'] },
    { h2: 'Related' },
    { ul: [
      link(abs('/answers/no-hot-water/'), 'No hot water'),
      link(abs('/answers/hot-water-rotten-egg-smell/'), 'Rotten-egg smell'),
      link(WH_PM, 'Water heater maintenance checklist')
    ]}
  ]
});

add({
  path: '/answers/tankless-water-heater-error-code/',
  title: 'Tankless Water Heater Error Code: What It Means',
  description: 'Look up common tankless error codes by brand from the manuals, and what you can do next.',
  crumb: 'Tankless error code',
  kind: 'answer',
  blocks: [
    { p: WH_SAFETY },
    { p: 'Write the code down exactly and look it up for your brand below. About a third of codes have a step you can do (clear a vent, open a tap wider, refill propane, one reset if your manual allows). The rest are a fault the heater caught on purpose, and the notes say why it needs a pro.' },
    { h2: 'Most common codes, by what they mean' },
    { ol: [
      '**Ignition / flame loss:** Rinnai 11/12, Navien E003/E012, Rheem 11/12, Noritz 11, Takagi 111/121. Check gas works elsewhere and propane level; look (don’t turn) at the gas handle.',
      '**Air/vent blocked:** Rinnai 10, Navien E110, Rheem 90/99, Noritz 90. Clear snow or debris at the outside ends by hand. Rheem asks for 12 in. clearance at the intake (p. 75).',
      '**Scale / service:** Rinnai LC/00/LC0–LC9, Rheem 1L/88, Navien E760, Noritz C1#. Schedule a descale.',
      '**Overheat:** Rinnai 14/16, Navien E016/E030, Rheem 14, Takagi 941/991. Stop using hot water and call.',
      '**Flow:** Rheem P1: open the tap more. Noritz starts at 0.5 GPM.'
    ]},
    { h2: 'One reset, only if your manual allows it' },
    { p: 'Navien front **Reset** button (p. 9); Rheem RTGH unplug about 30 s (p. 74; only a dry, undamaged cord, plug and outlet); Noritz code 11: power off at the remote, open a hot tap, power on (p. 42). Never flip a breaker to reset.' },
    { p: 'Makers’ minimum flows: Navien at least 0.5 gal/min (NPE-2 manual, p. 15); Noritz NCC199CDV starts at 0.5 GPM and can keep running down to 0.29 GPM (Owner’s Guide, pp. 39, 46); Stiebel Eltron 0.37–0.77 gal/min by model (p. 15); EcoSmart ECO 27 about 0.3 gal/min (p. 9); Rheem P1: increase water flow from the fixtures (RTGH Use & Care, p. 75). Checked October 15, 2026. Check your unit’s manual.' },
    { p: 'Open the hot tap more. Use the hot side only — a mixing valve set toward cold drops the hot flow the heater sees. On a Noritz, the Owner’s Guide (p. 39) discusses temperature swings and lists a temperature band that uses more hot water and less cold mix; check that page for the figure it shows, and feel the water at a tap before anyone uses it. Don’t raise the setting above what your household can use without scalding.' },
    { h2: 'It’s not normal if' },
    { p: 'The same code returns after one reset; you smell gas or exhaust; the code is an overheat.' },
    { h2: 'Is this normal?' },
    { p: 'A short cold burst between runs of hot water is common on a tankless heater — the burner pauses and restarts. Between back-to-back showers, leave a short gap or keep the hot tap running steadily instead of turning it off and on. If it keeps happening every time, use the cold-water sandwich steps in this guide.' },
    { h2: 'Know exactly why not' },
    { p: 'Ignition codes that repeat need gas-pressure and flame-sensor testing inside the sealed combustion section. Fan, gas valve, sensor and board codes are parts behind the cover with live wiring. Scale codes need the water valves isolated and a descaling pump. Descaling means isolating the heater’s water valves and pumping cleaner through it; Rinnai and Rheem tell owners to call a pro (Rinnai LC p. 67; Rheem 1L p. 75).' },
    { p: 'We only list codes from the maker’s own manual. If yours isn’t in this list yet, tell your pro the exact code. Don’t clear it.' },
    { h2: 'Rinnai codes for trained professionals' },
    { p: RINNAI_CAPTION },
    { p: RINNAI_TITLE },
    { p: RINNAI_URL },
    { ul: RINNAI_PRO.map(row => `**${row.code}** — ${row.meaning}. ${row.citation}`) },
    { p: link(GUIDE, 'Start the guided check') + ' and choose Water heater, then a code on the display.' },
    { h2: 'Sources' },
    { ul: [
      'Navien NPE-2, pp. 9, 15',
      'Noritz NCC199CDV Owner’s Guide, pp. 39, 42, 46, checked October 15, 2026',
      'Rheem RTGH Use & Care, pp. 74–75',
      'Rinnai LC, p. 67',
      'Stiebel Eltron, p. 15; EcoSmart ECO 27, p. 9'
    ]},
    { h2: 'Related' },
    { ul: [
      link(abs('/answers/no-hot-water/'), 'No hot water'),
      link(WH_PM, 'Water heater maintenance checklist')
    ]}
  ]
});

add({
  path: '/answers/hot-water-rotten-egg-smell/',
  title: 'Hot Water Smells Like Rotten Eggs? Here’s Why',
  description: 'The usual cause of a sulfur smell in hot water only, and when to call a pro. If you smell gas, leave first.',
  crumb: 'Rotten-egg smell',
  kind: 'answer',
  blocks: [
    { p: '**If you smell rotten eggs in the air, not just from the hot water, leave the house now and call the gas utility or 911 from outside.** Gas utilities add a rotten-egg odor to natural gas. A smell only when hot water runs is a water problem.' },
    { p: WH_SAFETY },
    { p: 'A sulfur smell only from the hot taps usually means sulfate in your water is reacting with the tank’s anode rod, often helped by bacteria, producing hydrogen sulfide. A.O. Smith’s fix is a special anode (Use & Care 100277666, p. 28).' },
    { h2: 'Causes, most common first' },
    { ol: [
      '**Sulfides plus the anode** (A.O. Smith p. 28 “SMELLY WATER — Sulfides in the water — Replace the anode with a special anode”; Rheem gas Use & Care p. 21).',
      '**Water sitting unused** (vacation, a spare bathroom).',
      '**Well water** with sulfur; if cold water smells too, it’s the supply, not the heater.'
    ]},
    { h2: 'Checks you can do' },
    { p: 'Run cold, then hot, at the same tap: smell only on hot points at the heater. Run hot taps for a few minutes after time away. If the house was empty two weeks or more, run a hot tap at a sink first for several minutes before the dishwasher or washer, with no flame or spark nearby: makers warn hydrogen gas can build up (Rheem gas Use & Care p. 18).' },
    { p: 'Don’t remove the anode or add bleach or chemicals to the tank. Makers say the tank needs an anode; Rheem says running without one greatly shortens tank life and voids warranty (p. 21).' },
    { p: 'Ask a licensed plumber or water heater professional to fit the anode your maker specifies.' },
    { h2: 'Know exactly why not' },
    { p: 'The anode is threaded into the top of a pressurized tank; swapping it means shutting off water and gas or power, relieving pressure, and often a breaker bar. The wrong rod can void the warranty. If cold water smells too, a water treatment pro, not a heater pro, fixes it.' },
    { p: link(GUIDE, 'Start the guided check') + ' and choose Water heater, then smelly hot water.' },
    { h2: 'Sources' },
    { ul: ['A.O. Smith Use & Care 100277666, p. 28', 'Rheem gas Use & Care, pp. 18, 21'] },
    { h2: 'Related' },
    { ul: [
      link(abs('/answers/no-hot-water/'), 'No hot water'),
      link(WH_PM, 'Water heater maintenance checklist')
    ]}
  ]
});

add({
  path: '/answers/water-heater-maintenance-checklist/',
  title: 'Water Heater Maintenance Checklist',
  description: 'Manual-based water heater checks you can do yourself, and what a pro service should include.',
  crumb: 'Water heater maintenance checklist',
  kind: 'pm',
  blocks: [
    { p: WH_SAFETY },
    { note: WARRANTY },
    { p: 'Most water heater care is set by your owner’s manual. Here is what it asks for, what you can do yourself, and exactly why the rest is a plumber’s job.' },
    { p: SCHEDULE },
    { h2: 'Water hardness' },
    { p: 'Your water’s hardness changes how often some heaters need care, but the schedule comes from your owner’s manual, not from a hardness label alone. On city water, look up your utility’s yearly water quality report (often called a Consumer Confidence Report) and find “hardness.” It may be in grains per gallon (gpg) or in ppm or mg/L. On a well, or if the report doesn’t list it, use a hardness test strip from a hardware store, following the package directions. Soft, moderately hard, hard, and very hard are plain-language categories from the U.S. Geological Survey for describing water (TRADE). They are not a service schedule. If you have a water softener, some manuals ask for more frequent anode checks — follow your owner’s manual. For flush, descale, and anode timing, follow your owner’s manual.' },
    { h2: 'Look around' },
    { p: 'Once in a while, look without touching: water on the floor or in the pan, drips from the relief pipe’s end, rust at the fittings or top of the tank, or new popping sounds. Outside, check that vents aren’t blocked. If you smell gas, leave the house now and call the gas utility or 911 from outside. If you see any of the other signs, start a guided check.' },
    { h2: 'Relief valve' },
    { p: 'If your manual tells you to test the relief valve, we’ll walk you through it. If it doesn’t, leave the valve alone.' },
    { p: link(GUIDE, 'Start the guided check') + ' and choose Water heater.' },
    { h2: 'Heat pump water heater filter' },
    { p: 'Heat pump water heaters have an air filter on top. Clean it when the filter light comes on, as your manual shows.' },
    { h2: 'Tank flush' },
    { p: 'Sediment settles at the bottom of a tank, more so with hard water. Your manual asks for a yearly flush. We don’t guide this one: it means draining very hot water through a valve that can clog open, and on gas or electric tanks it means shutting off and restoring the heat source. Book a plumber to flush the tank.' },
    { p: 'Draining means hot water through a valve that sediment can jam open, and refilling before power or gas comes back. An electric element powered in an empty tank burns out, and a gas tank needs relighting. Those are plumber steps.' },
    { h2: 'Anode rod' },
    { p: 'The anode rod is a metal rod that slowly wears away so the tank metal doesn’t. Your manual says how often to have it checked (for some models, every year). Checking it means taking it out of the tank, so we leave it to a plumber. Ask them how much core wire is showing. Your manual lists when it should be replaced. If a heat pump water heater shows an anode alarm, call a licensed plumber or water heater professional. Clearing that alarm is only for after the anode has been serviced or replaced, as your manual describes — otherwise leave it and call.' },
    { p: 'The rod is screwed tightly into the top of the tank and often seized. Removing it needs the gas or power and the water off, part of the tank drained, and a heavy wrench. Forcing it can damage the tank. A tank left without one rusts out faster.' },
    { h2: 'Tankless descale' },
    { p: 'Hard water leaves scale inside a tankless heater. When your heater shows a service code for this, or your manual says it’s time, book a descale. The heater needs service valves on its water lines for this. If yours has none, a plumber can add them.' },
    { p: 'Descaling means closing and opening four valves in the right order and pumping a cleaning solution through the heater. A wrong valve sends the solution into your pipes or hot water at the heater. The maker calls it a complicated procedure.' },
    { h2: 'Tankless inlet screen' },
    { p: 'Your tankless heater has a small screen where cold water comes in. If it clogs, you may get less hot water or an error code. Cleaning it means draining the heater, so book it with your descale.' },
    { p: 'The filter sits in the water line under pressure. Reaching it means shutting the water off and draining the heater. A pinched or missing seal leaks when the water comes back on.' },
    { h2: 'Is this normal?' },
    { p: 'Popping or rumbling in a tank is often sediment. It’s common and not an emergency on its own. Not normal if you also see water at the base or a relief pipe that’s running — then call a licensed plumber or water heater professional. Don’t open the drain valve or try to drain or flush the tank yourself.' },
    { h2: 'What a pro service visit should include' },
    { p: 'A water heater service visit should list what was done. For a tank: flush, anode checked against your manual’s replacement rule, relief valve checked, and for gas, the burner, venting and gas connections. For tankless: descale, inlet filter, venting, and the error history read (not cleared). For a heat pump model: filter, condensate drain and the system checked for alerts. Ask for the results in writing.' },
    { h2: 'Related' },
    { ul: [
      link(abs('/answers/no-hot-water/'), 'No hot water'),
      link(abs('/answers/water-heater-leaking/'), 'Water heater leaking'),
      link(abs('/answers/tankless-water-heater-error-code/'), 'Tankless error code'),
      link(abs('/answers/hot-water-rotten-egg-smell/'), 'Rotten-egg smell')
    ]}
  ]
});

add({
  path: '/answers/side-discharge-outdoor-unit-error-code/',
  title: 'Side-Discharge Outdoor Unit Error Code: What It Means',
  description: 'Where to find the code on a side-discharge outdoor unit, what it means, and what to do next.',
  crumb: 'Side-discharge error code',
  kind: 'answer',
  blocks: [
    { p: 'Most outdoor-unit codes mean a part needs a technician. A few have a real outdoor cause you can check from a few steps back: something blocking the air, snow or ice at the fan, or normal defrost. Write the code down, look from outside, and don’t reset it. That gives your technician a head start.' },
    { h2: 'First, stop for a hazard' },
    { p: 'Something unsafe is happening now (burning smell, smoke, sparks, gas smell, an alarm, water or ice at electrical parts, or someone at risk): stop checking. We’ll show you where to get help when you ' + link(GUIDE, 'start the guided check') + '.' },
    { h2: 'How to read the code' },
    { p: 'If a code is already showing on the thermostat, remote, wall control, or app, write it down or take a photo. Don’t open the outdoor unit to look for a code, and don’t open service menus or clear codes.' },
    { p: 'Write the code down exactly as it’s shown, or take a photo of it. For a blinking light, count the blinks for a full minute. A short phone video helps.' },
    { h2: 'Causes you can check, most likely first' },
    { ol: [
      '**Normal defrost (not a fault).** Carrier 38MURA shows DF; Bosch Edge shows dfx. “It is normal to display DF or FC, not a malfunction” (Carrier IM-38MURA-02 p. 18). In cold weather, a cloud of steam from the outdoor unit during defrost can be normal. If you’re not sure it’s steam, or you smell burning, treat it as smoke. A normal defrost usually lasts about 5 to 15 minutes, and some models finish sooner. Ice that is still there after about an hour of running is not normal. Call a licensed HVAC professional.',
      '**Blocked air.** Side-discharge units blow air out the front and pull it in at the back and side, so a fence, shrubs or stored items in front cause the unit to re-breathe hot air. Carrier lists at least 24 in. in front for 38MURA (IM-38MURA-02 p. 8). Bosch Edge lists 12 in. at the inlet and 24 in. above (IOM p. 12). These numbers are only for the models named. Your unit’s installation manual lists its own numbers. Check your unit’s manual. They describe how the unit should be installed. They aren’t a check of your unit.',
      '**Ice, snow or debris at the fan.** Don’t try to stop, turn, or free the fan, even with the system off. Don’t put hands, sticks, or tools through the grille or into the fins, even with the power off. Parts inside the outdoor unit can stay charged after the power is off, and wind turning the fan can charge them again.',
      '**Too cold or too hot outside.** The manufacturer describes this code as normal operation or as running in a limited range. If heating or cooling has stopped, or the house is getting uncomfortable, call a licensed HVAC professional now. If not, tell your technician about it.',
      '**Everything else** (sensors, boards, compressor, voltage, refrigerant). The display on the board inside the outdoor unit is for technicians. Reaching it means removing panels. Refrigerant work needs an EPA-certified technician. If you hear hissing, turn the system Off at the thermostat. Don’t touch the pipes, valves, or caps.'
    ]},
    { h2: 'What not to do' },
    { p: 'Don’t clear the code, delete the error history, reset the unit, or switch the power off and on to make the code go away. The code and its history help your technician.' },
    { p: 'This guide doesn’t cover resetting breakers or turning the disconnect back on. You can look, but don’t switch anything. If a breaker looks tripped or the disconnect is off, leave it as it is and call a licensed HVAC professional or electrician. It may have been turned off on purpose, or because of a problem a pro should find. A breaker that trips again is a warning sign. Don’t reset it.' },
    { h2: 'It’s not normal if' },
    { ul: [
      'Not normal: a solid block of ice that keeps growing, or a grille iced shut.',
      'Hissing at the pipe connections (not the whoosh during a defrost), or fresh oily spots at the pipes or valves.',
      'The unit is tipping, falling, or pulling away from the wall.'
    ]},
    { h2: 'If the house is cold' },
    { p: 'Before we look at the outdoor unit: is the house getting too cold for anyone in it? If anyone at home is a baby, an older adult, or has a medical need, or the indoor temperature keeps dropping, getting them warm comes first.' },
    { p: 'Never heat with an oven, stove, grill, or generator indoors (carbon monoxide). If you use an electric space heater, plug it straight into a wall outlet, follow its maker’s instructions, and keep it clear of anything that can burn.' },
    { h2: 'Is this normal?' },
    { p: 'Some outdoor units wait several minutes before starting. For example, Bosch lists a 7-minute startup delay on IDS Edge multi-zone systems (IOM p. 53). Switching the power off and on can restart the wait.' },
    { p: 'These code meanings come from manufacturers’ documents for some models. Your model may differ. A code explains what the unit detected. It isn’t a diagnosis.' },
    { p: link(GUIDE, 'Start the guided check') + '.' },
    { h2: 'Sources' },
    { ul: [
      'Carrier IM-38MURA-02, pp. 8, 18',
      'Bosch IDS Edge IOM BTC 762003323 B, pp. 12, 53',
      'Daikin 3P515859-5S'
    ]},
    { h2: 'Related' },
    { ul: [
      link(abs('/answers/side-discharge-heat-pump-maintenance-checklist/'), 'Side-discharge heat pump maintenance checklist'),
      link(abs('/answers/heat-pump-maintenance-checklist/'), 'Heat pump maintenance checklist')
    ]}
  ]
});

function pmCoilPage(path, title, description, crumb, lead, related) {
  add({
    path, title, description, crumb, kind: 'pm',
    blocks: [
      { p: lead },
      { p: SCHEDULE },
      { note: WARRANTY },
      ...coilBlocks(),
      { h2: 'Related' },
      { ul: related.concat(link(GUIDE, 'Start the guided check')) }
    ]
  });
}

pmCoilPage(
  '/answers/ac-maintenance-checklist/',
  'AC maintenance checklist',
  SCHEDULE + ' Outdoor coil cleaning is the task on this page.',
  'AC maintenance checklist',
  'Outdoor coil cleaning is the homeowner task published on this page. Other central-air tasks stay with your owner’s manual.',
  [link(abs('/answers/heat-pump-maintenance-checklist/'), 'Heat pump maintenance checklist')]
);
pmCoilPage(
  '/answers/heat-pump-maintenance-checklist/',
  'Heat pump maintenance checklist',
  SCHEDULE + ' Outdoor coil cleaning is the task on this page.',
  'Heat pump maintenance checklist',
  'Outdoor coil cleaning is the homeowner task published on this page. Other heat-pump tasks stay with your owner’s manual.',
  [
    link(abs('/answers/ac-maintenance-checklist/'), 'AC maintenance checklist'),
    link(abs('/answers/side-discharge-heat-pump-maintenance-checklist/'), 'Side-discharge maintenance checklist')
  ]
);

add({
  path: '/answers/mini-split-maintenance-checklist/',
  title: 'Mini-split maintenance checklist',
  description: SCHEDULE + ' Filter power-off uses the shared wording. Indoor coil cleaning is not on this page.',
  crumb: 'Mini-split maintenance checklist',
  kind: 'pm',
  blocks: [
    { p: 'Filter cleaning you can reach from the floor is in the guided check. If your manual says to switch power off at a breaker, outdoor disconnect, or service switch first, the check uses this wording:' },
    { p: PO2 },
    { p: 'Cleaning the coil inside the indoor unit is not on this page.' },
    { p: SCHEDULE },
    { note: WARRANTY },
    { h2: 'Outdoor unit' },
    ...coilBlocks(),
    { p: link(GUIDE, 'Start the guided check') + ' and choose Ductless mini-split.' },
    { h2: 'Related' },
    { ul: [link(abs('/answers/ac-maintenance-checklist/'), 'AC maintenance checklist')] }
  ]
});

add({
  path: '/answers/side-discharge-heat-pump-maintenance-checklist/',
  title: 'Side-Discharge Heat Pump Maintenance Checklist',
  description: 'Seasonal checks for side-discharge outdoor units, and what a pro visit should include.',
  crumb: 'Side-discharge maintenance checklist',
  kind: 'pm',
  blocks: [
    { p: 'In spring and fall, clear around the unit using your manual’s clearances, keep leaves and snow off the ground around it, check that the pad looks level, and check that the outdoor pipe insulation is intact. Coil cleaning follows the brand rules below. Have a licensed HVAC professional check refrigerant and electrical parts on the schedule your warranty and manual describe.' },
    { p: SCHEDULE },
    { note: WARRANTY },
    { p: '**' + CC1 + '**' },
    ...coilBlocks().slice(2),
    { h2: 'Why some jobs stay with a pro' },
    { ul: [
      'Re-leveling means lifting a unit that is still connected to refrigerant pipes and wiring. A bent pipe can leak refrigerant. Bosch lists a pad at least 1–2 in. larger than the unit on all sides (IDS Edge IOM, p. 20). Don’t push, lean on, or try to level the unit. Call a licensed HVAC professional.',
      'This needs meters on live high-voltage parts behind the panels.',
      'Raising the unit means disconnecting and reconnecting refrigerant pipes and wiring. That’s installer work.',
      'Refrigerant work needs an EPA-certified technician. If you hear hissing, turn the system Off at the thermostat. Don’t touch the pipes, valves, or caps.'
    ]},
    { p: link(GUIDE, 'Start the guided check') + '.' },
    { h2: 'Related' },
    { ul: [
      link(abs('/answers/side-discharge-outdoor-unit-error-code/'), 'Side-discharge error code'),
      link(abs('/answers/heat-pump-maintenance-checklist/'), 'Heat pump maintenance checklist')
    ]}
  ]
});

add({
  path: '/answers/furnace-maintenance-checklist/',
  title: 'Furnace maintenance checklist',
  description: SCHEDULE,
  crumb: 'Furnace maintenance checklist',
  kind: 'pm',
  blocks: manualOnly('a furnace', [
    link(abs('/answers/heat-pump-maintenance-checklist/'), 'Heat pump maintenance checklist'),
    link(abs('/answers/thermostat-maintenance-checklist/'), 'Thermostat maintenance checklist')
  ])
});
add({
  path: '/answers/boiler-maintenance-checklist/',
  title: 'Boiler maintenance checklist',
  description: SCHEDULE,
  crumb: 'Boiler maintenance checklist',
  kind: 'pm',
  blocks: manualOnly('a boiler', [
    link(WH_PM, 'Water heater maintenance checklist'),
    link(abs('/answers/furnace-maintenance-checklist/'), 'Furnace maintenance checklist')
  ])
});
add({
  path: '/answers/thermostat-maintenance-checklist/',
  title: 'Thermostat maintenance checklist',
  description: SCHEDULE,
  crumb: 'Thermostat maintenance checklist',
  kind: 'pm',
  blocks: manualOnly('a thermostat', [
    link(abs('/answers/furnace-maintenance-checklist/'), 'Furnace maintenance checklist')
  ])
});
add({
  path: '/answers/geothermal-heat-pump-maintenance-checklist/',
  title: 'Geothermal heat pump maintenance checklist',
  description: SCHEDULE,
  crumb: 'Geothermal maintenance checklist',
  kind: 'pm',
  blocks: manualOnly('a geothermal or water-source heat pump', [
    link(abs('/answers/heat-pump-maintenance-checklist/'), 'Heat pump maintenance checklist')
  ])
});

const equipment = [
  ['Central air', '/answers/ac-maintenance-checklist/'],
  ['Heat pump', '/answers/heat-pump-maintenance-checklist/'],
  ['Furnace', '/answers/furnace-maintenance-checklist/'],
  ['Boiler', '/answers/boiler-maintenance-checklist/'],
  ['Water heater or tankless', '/answers/water-heater-maintenance-checklist/'],
  ['Mini-split', '/answers/mini-split-maintenance-checklist/'],
  ['Geothermal or water-source', '/answers/geothermal-heat-pump-maintenance-checklist/'],
  ['Side-discharge', '/answers/side-discharge-heat-pump-maintenance-checklist/'],
  ['Thermostat', '/answers/thermostat-maintenance-checklist/']
];

const answerLinks = pages.filter(p => p.kind === 'answer').map(p => link(abs(p.path), p.crumb));
const pmLinks = pages.filter(p => p.kind === 'pm').map(p => link(abs(p.path), p.crumb));

const hubs = [
  {
    path: '/answers/',
    title: 'Answers',
    description: 'Homeowner answers for heating, cooling, and hot water, plus maintenance checklists.',
    crumb: 'Answers',
    kind: 'hub',
    blocks: [
      { p: 'These pages are the answers and checklists published in this release. Each one is ordinary HTML.' },
      { h2: 'Answers' },
      { ul: answerLinks },
      { h2: 'Maintenance checklists' },
      { ul: pmLinks },
      { p: link(abs('/maintenance/'), 'Free Maintenance') + ' opens the equipment list.' },
      { p: link(GUIDE, 'Start the guided check') + '.' }
    ]
  },
  {
    path: '/maintenance/',
    title: 'Free Maintenance',
    description: HERO,
    crumb: 'Free Maintenance',
    kind: 'hub',
    blocks: [
      { p: HERO },
      { p: 'Choose the equipment.' },
      { ul: equipment.map(([name, href]) => link(abs(href), name)) },
      { note: WARRANTY },
      { p: link(abs('/answers/'), 'All answers') + ' · ' + link(GUIDE, 'Start the guided check') }
    ]
  }
];

function jsonLd(page) {
  const url = abs(page.path);
  const graph = [];
  if (page.kind === 'answer' || page.kind === 'pm') {
    graph.push({
      '@type': 'Article',
      headline: page.title,
      dateModified: UPDATED,
      author: { '@type': 'Organization', name: 'Second Wrench' },
      publisher: {
        '@type': 'Organization',
        name: 'Second Wrench',
        url: ORIGIN + '/',
        logo: { '@type': 'ImageObject', url: ICON }
      },
      mainEntityOfPage: url
    });
  }
  const maintenanceCrumb = page.kind === 'pm' || (page.kind === 'hub' && page.path === '/maintenance/');
  const crumbs = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' },
    { '@type': 'ListItem', position: 2, name: maintenanceCrumb ? 'Free Maintenance' : 'Answers', item: maintenanceCrumb ? abs('/maintenance/') : abs('/answers/') }
  ];
  if (page.kind !== 'hub') crumbs.push({ '@type': 'ListItem', position: 3, name: page.crumb, item: url });
  graph.push({ '@type': 'BreadcrumbList', itemListElement: crumbs });
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

function pageHtml(page) {
  const url = abs(page.path);
  const maintenanceCrumb = page.kind === 'pm';
  const crumbs = page.kind === 'hub'
    ? `<a href="${ORIGIN}/">Home</a> › ${esc(page.crumb)}`
    : `<a href="${ORIGIN}/">Home</a> › <a href="${maintenanceCrumb ? abs('/maintenance/') : abs('/answers/')}">${maintenanceCrumb ? 'Free Maintenance' : 'Answers'}</a> › ${esc(page.crumb)}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="index, follow">
  <title>${esc(page.title)} — Second Wrench</title>
  <meta name="description" content="${esc(page.description)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:image" content="${ICON}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(page.title)}">
  <meta name="twitter:description" content="${esc(page.description)}">
  <meta name="twitter:image" content="${ICON}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/styles.css?v=2026-10-20.13">
  <script type="application/ld+json">${jsonLd(page)}</script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <a href="${ORIGIN}/" class="brand">Second Wrench</a>
    <nav aria-label="Main navigation"><a class="nav-maintenance" href="${abs('/maintenance/')}">Free Maintenance</a><a href="${abs('/answers/')}">Answers</a><a href="${ORIGIN}/#/safety">Safety</a></nav>
  </header>
  <main id="main" class="content-wrap" tabindex="-1">
    <p class="fine">${crumbs}</p>
    <h1>${esc(page.title)}</h1>
    <p class="fine">Last updated October 15, 2026.</p>
    ${blocksToHtml(page.blocks)}
    <p class="fine">Independent information, not an inspection or a confirmed diagnosis. Not attorney-reviewed and not a licensed HVAC review. <a href="mailto:support@secondwrench.co">support@secondwrench.co</a></p>
  </main>
</body>
</html>
`;
}

function banned(html, where) {
  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');
  const hit = text.match(/\b(safe|safely|safer|safest)\b/i);
  if (hit) throw new Error(where + ' uses banned word ' + hit[0]);
  if (/reviewed by an (hvac|attorney|lawyer)/i.test(text)) throw new Error(where + ' claims a professional review');
  if (/\$\d/.test(text)) throw new Error(where + ' includes a price');
  if (/beta-secondwrench\.netlify\.app/.test(html)) throw new Error(where + ' still links to the beta host');
  if (/assets\/(app|flow|heating-data|heating-lanes|ts-runtime|ts-lane|config)\.js/.test(html)) throw new Error(where + ' loads the app bundle');
}

function writePage(page) {
  const html = pageHtml(page);
  banned(html, page.path);
  const cc5 = html.match(/<section id="brand-cc5">[\s\S]*?<\/section>/);
  if (cc5 && /garden hose|coil cleaner|pump sprayer/i.test(cc5[0])) throw new Error(page.path + ' shows water or chemical steps for CC-5 brands');
  const dest = path.join(root, page.path.replace(/^\//, ''), 'index.html');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
}

const all = pages.concat(hubs);
for (const page of all) writePage(page);

const locs = [ORIGIN + '/'].concat(all.map(p => abs(p.path)));
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  locs.map(loc => `  <url><loc>${loc}</loc></url>`).join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(root, 'robots.txt'), '# secondwrench.co — batch release robots.txt\n# Crawling is allowed; this file is not access control.\nUser-agent: *\nAllow: /\nDisallow: /.netlify/\n\nSitemap: https://secondwrench.co/sitemap.xml\n');
console.log('Static pages: ' + all.length + ' plus home. Sitemap URLs: ' + locs.length);
