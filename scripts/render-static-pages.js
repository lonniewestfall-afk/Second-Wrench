'use strict';
/* Static answer and maintenance pages. No app bundle. Regenerates sitemap.xml. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const ORIGIN = 'https://secondwrench.co';
const ICON = ORIGIN + '/assets/icons/icon-512.png';
const UPDATED = '2026-10-15';
const UPDATED_SEARCH = '2026-10-29';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function prettyDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return MONTHS[m - 1] + ' ' + d + ', ' + y;
}
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
      link(WH_PM, 'Water heater maintenance checklist'),
      link(abs('/answers/gas-smell-pilot-flame/'), 'Gas smell, pilot, or flame')
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
      link(abs('/answers/heat-pump-maintenance-checklist/'), 'Heat pump maintenance checklist'),
      link(abs('/answers/furnace-ac-loud-noise/'), 'Furnace or AC loud noise')
    ]}
  ]
});

function pmCoilPage(path, title, description, crumb, lead, related, before) {
  add({
    path, title, description, crumb, kind: 'pm', updated: UPDATED_SEARCH,
    blocks: [
      { p: lead },
      ...(before || []),
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
  'Filter, condensate, outdoor debris, and coil checks between pro visits for a cooling-only central air conditioner.',
  'AC maintenance checklist',
  'These are look-and-check tasks between visits from a licensed HVAC professional. Outdoor coil cleaning is below, split by brand. Other repairs stay with your owner’s manual.',
  [
    link(abs('/answers/heat-pump-maintenance-checklist/'), 'Heat pump maintenance checklist'),
    link(abs('/answers/furnace-ac-loud-noise/'), 'Furnace or AC loud noise'),
    link(abs('/answers/furnace-filter-size/'), 'Furnace filter size')
  ],
  [
    { h2: 'Thermostat' },
    { p: 'Set the system to Off at the thermostat and wait until the blower stops before you open a filter slot. This does not disconnect electricity. Don’t take the thermostat off the wall.' },
    { h2: 'Air filter' },
    { p: 'Use only a tool-free filter slot or return grille your owner’s manual names, reachable from the floor. Keep furnace and air-handler doors closed. The size is printed on the filter’s frame. Put one filter back with the airflow arrow pointing toward the blower, and close the slot. [ENERGY STAR](https://www.energystar.gov/saveathome/heating-cooling) says to check the filter every month in heavy-use seasons and to change it at least every 3 months, or sooner when it looks dirty. Your manual wins if it says something different.' },
    { h2: 'Condensate drain' },
    { p: 'Look at the drain tube or pan you can already see, outside the cabinet. If a tube you can reach without tools is kinked, gently straighten it by hand. Don’t pull it off. If water is near a switch, outlet, or the breaker panel, stay out of it and call a licensed HVAC professional. Don’t open the panel cover.' },
    { h2: 'Outdoor unit' },
    { p: 'From dry ground, move leaves, toys, and stored items away from the cabinet. Don’t reach through the grille or touch the fins. **' + CC1 + '** If the outdoor breaker looks tripped, leave it and use the guided check. That check is the only place a one-time outdoor reset is offered, and only for a cooling-only air conditioner. Never open the breaker panel cover or the disconnect box.' }
  ]
);
pmCoilPage(
  '/answers/heat-pump-maintenance-checklist/',
  'Heat pump maintenance checklist',
  'Filter, snow and ice, condensate, and coil checks between pro visits for an air-source heat pump.',
  'Heat pump maintenance checklist',
  'These are look-and-check tasks between visits from a licensed HVAC professional. Outdoor coil cleaning is below, split by brand. Refrigerant and electrical work stay with a pro.',
  [
    link(abs('/answers/ac-maintenance-checklist/'), 'AC maintenance checklist'),
    link(abs('/answers/side-discharge-heat-pump-maintenance-checklist/'), 'Side-discharge maintenance checklist'),
    link(abs('/answers/furnace-ac-loud-noise/'), 'Furnace or AC loud noise'),
    link(abs('/answers/high-heating-bill/'), 'High heating bill')
  ],
  [
    { h2: 'Thermostat' },
    { p: 'In heating season, mode is Heat, not Emergency Heat, unless a pro told you to use Emergency Heat while you wait. Emergency or Aux heat usually costs more to run. Don’t take the thermostat off the wall. A large overnight setback on a heat pump can call on backup electric heat. The [U.S. Department of Energy Energy Saver guide](https://www.energy.gov/sites/default/files/2022-08/energy-saver-guide-2022.pdf) says not to set a heat pump back 7°–10°F unless the thermostat is made for heat pumps.' },
    { h2: 'Air filter' },
    { p: 'Same rule as a furnace filter: thermostat Off, blower stopped, one filter, arrow toward the blower, tool-free slot you can reach from the floor. [ENERGY STAR](https://www.energystar.gov/saveathome/heating-cooling) says check monthly in heavy-use seasons and change at least every 3 months, or when the filter looks dirty.' },
    { h2: 'Snow, ice, and the outdoor unit' },
    { p: 'Brush loose snow off the ground around the unit. Don’t chip ice, don’t reach through the grille, and don’t try to turn the fan. In cold weather a cloud of steam during defrost can be normal and usually lasts a few minutes. Ice that is still there after about an hour of running is not normal. Call a licensed HVAC professional. **' + CC1 + '**' },
    { p: 'Heat-pump breakers are not reset from this page. If a breaker looks tripped or a disconnect is off, leave it and call a licensed HVAC professional or electrician. Never open the breaker panel cover or the disconnect box.' },
    { h2: 'Condensate' },
    { p: 'In cooling season, look at the indoor drain tube you can already see. Straighten a kink by hand only if the tube is outside the cabinet and you don’t need tools. Stop if water is near electrical parts.' }
  ]
);

add({
  path: '/answers/mini-split-maintenance-checklist/',
  title: 'Mini-split maintenance checklist',
  description: 'Floor-level filter, condensate, and outdoor-coil checks for a ductless mini-split between pro visits.',
  crumb: 'Mini-split maintenance checklist',
  kind: 'pm',
  updated: UPDATED_SEARCH,
  blocks: [
    { p: 'A ductless mini-split has an indoor unit on a wall, floor, or ceiling and a small outdoor unit. These checks stay outside the cabinets. Cleaning the coil inside the indoor unit is not on this page.' },
    { h2: 'Remote or app' },
    { p: 'Before a filter check, turn the unit off with the remote or app and wait until the fan stops. That stops it running. It does not cut power. Don’t climb on a chair or ladder to reach the indoor unit.' },
    { h2: 'Indoor filters' },
    { p: 'Most mini-splits have washable filters behind a front cover that lifts by hand. Clean them only when your owner’s manual shows the steps without tools, the cover lifts without prying or unscrewing, and you can reach it standing on the floor. If the manual says to switch power off at a breaker or disconnect first, use this wording and stop if it asks for anything else:' },
    { p: PO2 },
    { p: 'Rinse filters with water only if the manual says to, away from the electrical parts. Let them dry, put them back, and close the cover before you turn the unit on. If the cover needs tools, force, or a ladder, leave it for a licensed HVAC professional.' },
    { h2: 'Water from the indoor unit' },
    { p: 'A slow drip away from outlets can be a clogged condensate drain. Put down a towel and call a pro to clear the drain. If water reaches a cord, outlet, or switch, stay clear and don’t touch the unit or the breaker panel.' },
    { h2: 'Outdoor unit' },
    { p: 'Keep plants, snow, and stored items off the intake and the discharge. Don’t reach through the grille. **' + CC1 + '** Don’t reset a mini-split breaker to test it. If a breaker looks tripped, leave it and call a licensed HVAC professional or electrician. Never open the breaker panel cover or the disconnect box.' },
    { p: SCHEDULE },
    { note: WARRANTY },
    ...coilBlocks(),
    { p: link(GUIDE, 'Start the guided check') + ' and choose Something else, then Ductless mini-split.' },
    { h2: 'Related' },
    { ul: [
      link(abs('/answers/ac-maintenance-checklist/'), 'AC maintenance checklist'),
      link(abs('/answers/heat-pump-maintenance-checklist/'), 'Heat pump maintenance checklist'),
      link(abs('/answers/furnace-ac-loud-noise/'), 'Furnace or AC loud noise')
    ]}
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
  description: 'What to check before you turn the heat on for winter: thermostat, filter, vents, condensate, and outside pipes.',
  crumb: 'Furnace maintenance checklist',
  kind: 'pm',
  updated: UPDATED_SEARCH,
  blocks: [
    { p: 'Do this on a mild day, before you need the heat. It is a look-and-check list. It does not open the furnace, relight a pilot, or turn a gas valve.' },
    { p: '**If you smell gas or rotten eggs in the air, leave the house now and call the gas utility or 911 from outside.** Don’t touch light switches or phones until you are outside. A rotten-egg smell only from the hot water is a different problem: ' + link(abs('/answers/hot-water-rotten-egg-smell/'), 'hot water smells like rotten eggs') + '.' },
    { note: WARRANTY },
    { p: SCHEDULE },
    { h2: 'Alarms' },
    { p: 'Press the test button on each carbon monoxide alarm and smoke alarm. [CPSC](https://www.cpsc.gov/Newsroom/News-Releases/2026/CPSC-Issues-Winter-Weather-Safety-Tips-to-Prevent-Fires-and-Carbon-Monoxide-Poisoning) says to test them monthly. If a CO alarm sounds for real, get everyone outside and call 911. Don’t keep testing the furnace.' },
    { h2: 'Thermostat' },
    { p: 'Don’t take it off the wall. Set mode to Heat, fan to Auto, and the setpoint a few degrees above the room temperature. Wait one full cycle. Fan On blows room-temperature air between cycles and can feel like the heat failed. Some thermostats wait a few minutes before they start.' },
    { h2: 'Filter, returns, and supplies' },
    { p: 'Turn the system Off at the thermostat and wait until the blower stops. Use only a tool-free filter slot or return grille you can reach from the floor. Read the size on the old filter, put in one filter of that size, and point the arrow toward the furnace. Close the slot. Walk the house and make sure return grilles aren’t blocked by furniture and supply vents aren’t closed. Don’t open a burner door to find a filter. The ' + link(abs('/answers/furnace-filter-size/'), 'filter size page') + ' has the longer version.' },
    { h2: 'Outside vent pipes' },
    { p: 'A high-efficiency furnace has two plastic pipes on an outside wall. Brush snow, leaves, and shrub clippings away from both ends by hand or with a soft broom, from the ground. Leave ice that is stuck to a pipe. Stop if a pipe is cracked, loose, pulled apart, or full of ice, and call a licensed HVAC professional. [CPSC](https://www.cpsc.gov/Newsroom/News-Releases/2026/CPSC-Issues-Winter-Weather-Safety-Tips-to-Prevent-Fires-and-Carbon-Monoxide-Poisoning) says to clear snow from outside furnace vents so carbon monoxide does not build up in the house.' },
    { h2: 'Condensate tube' },
    { p: 'Look at the clear or white tube outside the cabinet. If it is kinked and you can reach it without tools, gently straighten it by hand. Don’t pull it off. Stop if it is frozen, cracked, or you would have to open the furnace. If water is near a switch or outlet, stay out of it and call a pro. Don’t open the breaker panel.' },
    { h2: 'Switch and breaker, look only' },
    { p: 'Many furnaces have a nearby switch that looks like a light switch. Look at it and at the breaker labeled for the furnace. Furnace breakers are never reset. If the breaker is in the middle or off, leave it and call a licensed HVAC professional. Never open the breaker panel cover. Don’t press a reset button on the furnace, and don’t open its doors.' },
    { h2: 'What stays with a pro' },
    { ul: [
      'Burners, the gas valve, the pilot, the igniter, and the flame sensor.',
      'Anything inside the electrical compartment, including a control board.',
      'A blinking code you cannot read without taking a door off. Write down what you can see through the window and use the ' + link(abs('/answers/furnace-blinking-light/'), 'blinking light page') + '.',
      'Refrigerant lines on a furnace that also has central air. If you hear hissing, turn the system Off at the thermostat and don’t touch the pipes, valves, or caps.'
    ]},
    { p: 'If the test run smells like burning, use the ' + link(abs('/answers/furnace-burning-smell/'), 'burning smell page') + ' before you leave the furnace running.' },
    { p: link(GUIDE, 'Start the guided check') + ' and choose Furnace or air handler.' },
    { h2: 'Related' },
    { ul: [
      link(abs('/answers/furnace-not-turning-on/'), 'Furnace not turning on'),
      link(abs('/answers/furnace-filter-size/'), 'Furnace filter size'),
      link(abs('/answers/thermostat-maintenance-checklist/'), 'Thermostat maintenance checklist'),
      link(abs('/answers/heat-pump-maintenance-checklist/'), 'Heat pump maintenance checklist')
    ]}
  ]
});
add({
  path: '/answers/boiler-maintenance-checklist/',
  title: 'Boiler maintenance checklist',
  description: 'Look-only boiler checks before heating season: thermostat, gauge, leaks, and what to leave for a pro. No radiator bleeding steps.',
  crumb: 'Boiler maintenance checklist',
  kind: 'pm',
  updated: UPDATED_SEARCH,
  blocks: [
    { p: 'This is a look-only list for a hot-water or steam boiler, baseboard, or radiators. It does not open the boiler, turn a gas valve, or bleed a radiator or baseboard.' },
    { p: '**If you smell gas or rotten eggs in the air, leave the house now and call the gas utility or 911 from outside.** Don’t touch light switches or phones until you are outside. A rotten-egg smell only from the hot water goes to the ' + link(abs('/answers/hot-water-rotten-egg-smell/'), 'rotten-egg smell') + ' page.' },
    { p: 'If hot water or steam is spraying, or the relief pipe is discharging, stay back. Don’t touch a valve or try to plug the pipe. Call a licensed heating professional. For a serious burn, call 911.' },
    { note: WARRANTY },
    { p: SCHEDULE },
    { h2: 'Alarms and the thermostat' },
    { p: 'Test carbon monoxide and smoke alarms with their test buttons. If a CO alarm sounds for real, get everyone outside and call 911. On the thermostat, don’t take it off the wall. Set Heat and a setpoint a few degrees above the room temperature. Radiators and floors can take a while to warm up. Some homes have more than one thermostat, one per zone.' },
    { h2: 'Around the boiler' },
    { ul: [
      'Look for water on the floor, rust at fittings, or a drip from the relief pipe. Don’t lift, cap, or plug the relief valve.',
      'If you can already read the gauge from where you stand, write the number down. If it sits on a relief setting or warning mark identified for your boiler, don’t touch it. Call a licensed heating professional.',
      'On a steam boiler, if the sight glass shows no water, don’t add water. Call a pro.',
      'Look at the boiler’s switch and any nearby service switch. Don’t flip a switch or a breaker. If one is off or a breaker looks tripped, leave it and call.',
      'Write down a code on the display. Don’t clear it, and don’t open the jacket to find a chart.'
    ]},
    { h2: 'Rooms' },
    { p: 'Move furniture, curtains, and covers off baseboards and radiators so air can move. Give the system time after you do. Gurgling, or a radiator that is warm at the bottom and cold at the top, needs a pro. This page does not include bleeding instructions for radiators or baseboard.' },
    { h2: 'What stays with a pro' },
    { ul: [
      'Burners, the gas valve, the pilot, and any oil-burner reset. Don’t press a red reset button.',
      'Opening the boiler, adding water, or adjusting pressure.',
      'Bleeding radiators or baseboard, and zone valves.',
      'Electrical work inside a panel. Never open the breaker panel cover.'
    ]},
    { p: 'If the heat is already out, use ' + link(abs('/answers/boiler-not-heating/'), 'boiler or radiators not heating') + ' and ' + link(GUIDE, 'start the guided check') + '. Choose Something else, then Boiler, radiators, baseboard, or radiant floors.' },
    { h2: 'Related' },
    { ul: [
      link(abs('/answers/boiler-not-heating/'), 'Boiler or radiators not heating'),
      link(abs('/answers/furnace-maintenance-checklist/'), 'Furnace maintenance checklist'),
      link(WH_PM, 'Water heater maintenance checklist'),
      link(abs('/answers/hot-water-rotten-egg-smell/'), 'Rotten-egg smell')
    ]}
  ]
});
add({
  path: '/answers/thermostat-maintenance-checklist/',
  title: 'Thermostat maintenance checklist',
  description: 'Battery, schedule, fan, and screen checks you can do without pulling the thermostat off the wall.',
  crumb: 'Thermostat maintenance checklist',
  kind: 'pm',
  updated: UPDATED_SEARCH,
  blocks: [
    { p: 'These checks use the thermostat you already have on the wall. Don’t pull it off, and don’t loosen wires. If a step asks for an installer menu, a password, or a wiring choice, stop and call the installer or a licensed HVAC professional.' },
    { note: WARRANTY },
    { p: SCHEDULE },
    { h2: 'Batteries' },
    { p: 'If your model takes batteries and the manual shows a cover that opens by hand, put in fresh batteries of the type it names. If the cover doesn’t match the manual, or you would have to take the thermostat off the wall, stop. A blank screen has its own page: ' + link(abs('/answers/smart-thermostat-no-power/'), 'smart thermostat has no power') + '.' },
    { h2: 'Mode, fan, and schedule' },
    { ul: [
      'Heat season: mode Heat, setpoint a few degrees above the room, fan Auto. Fan On runs the blower between cycles and can feel cold.',
      'Cool season: mode Cool, setpoint below the room temperature.',
      'A heat pump: leave Emergency Heat and Aux off unless you are waiting on a pro. They usually cost more to run. Don’t use a deep setback unless the thermostat is made for a heat pump. See ' + link(abs('/answers/high-heating-bill/'), 'why a heating bill runs high') + '.',
      'If the temperature changes on its own, check for a hold, a schedule, or an Eco or Away setting before you assume the equipment failed.'
    ]},
    { h2: 'What not to change' },
    { p: 'Don’t change equipment type, wiring, cycle rate, or other installer settings to chase a problem. Don’t reset a breaker for the furnace or air conditioner from this page. If a breaker looks tripped, leave it and call a licensed professional. Never open the breaker panel cover.' },
    { p: link(GUIDE, 'Start the guided check') + ' and choose Something else, then Thermostat or settings problem.' },
    { h2: 'Related' },
    { ul: [
      link(abs('/answers/smart-thermostat-no-power/'), 'Smart thermostat no power'),
      link(abs('/answers/furnace-maintenance-checklist/'), 'Furnace maintenance checklist'),
      link(abs('/answers/furnace-not-turning-on/'), 'Furnace not turning on')
    ]}
  ]
});
add({
  path: '/answers/geothermal-heat-pump-maintenance-checklist/',
  title: 'Geothermal heat pump maintenance checklist',
  description: 'Filter, condensate, and look-only checks for a geothermal or water-source heat pump. Loop fluid and refrigerant stay with a pro.',
  crumb: 'Geothermal maintenance checklist',
  kind: 'pm',
  updated: UPDATED_SEARCH,
  blocks: [
    { p: 'A geothermal or water-source heat pump sits indoors, often in a basement or closet. Water or loop fluid comes in through pipes. There is no outdoor fan unit to hose down. These checks stay outside the cabinet.' },
    { note: WARRANTY },
    { p: SCHEDULE },
    { h2: 'Thermostat and filter' },
    { p: 'Set the mode you mean to use and leave Emergency Heat off unless a pro told you to use it while you wait. Turn the system Off at the thermostat and wait for the blower to stop. Change the filter only in a tool-free slot you can reach from the floor, one filter, arrow toward the blower. Don’t open the cabinet to find a filter. [ENERGY STAR](https://www.energystar.gov/saveathome/heating-cooling) says to check a filter every month in heavy-use seasons and change it at least every 3 months, or when it looks dirty. Your manual wins if it differs.' },
    { h2: 'Condensate and water' },
    { p: 'Look at a condensate tube you can already see outside the cabinet. Straighten a kink by hand only if you don’t need tools and you don’t pull the tube off. If water is on or near wiring, an outlet, or the breaker panel, stay out of it and call a licensed HVAC professional. Don’t touch the panel.' },
    { h2: 'What stays with a pro' },
    { ul: [
      'Loop fluid, antifreeze, well water, and any chemical treatment. Don’t add anything to the loop.',
      'Refrigerant. If you hear hissing, turn the system Off at the thermostat. Don’t touch the pipes, valves, or caps.',
      'Opening the cabinet, resetting a breaker, or working on live wiring. Never open the breaker panel cover.',
      'A loop gauge you cannot already read from where you stand. If you can read it, write the number down and give it to your pro. Don’t adjust a valve to change it.'
    ]},
    { p: link(GUIDE, 'Start the guided check') + ' and choose Something else, then Water-source / geothermal heat pump.' },
    { h2: 'Related' },
    { ul: [
      link(abs('/answers/heat-pump-maintenance-checklist/'), 'Heat pump maintenance checklist'),
      link(abs('/answers/furnace-filter-size/'), 'Furnace filter size'),
      link(abs('/answers/high-heating-bill/'), 'High heating bill')
    ]}
  ]
});

require('./search-answer-pages')({ add, link, abs, GUIDE, CC1, UPDATED_SEARCH });

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
    updated: UPDATED_SEARCH,
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
      dateModified: page.updated || UPDATED,
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
  <link rel="stylesheet" href="/assets/styles.css?v=2026-10-20.18">
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
    <p class="fine">Last updated ${prettyDate(page.updated || UPDATED)}.</p>
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
