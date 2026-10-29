'use strict';
/* Search-answer pages for homeowner questions. Loaded by render-static-pages.js. */
module.exports = function searchAnswerPages(ctx) {
  const { add, link, abs, GUIDE, CC1, UPDATED_SEARCH } = ctx;
  const CPSC = 'https://www.cpsc.gov/Newsroom/News-Releases/2026/CPSC-Issues-Winter-Weather-Safety-Tips-to-Prevent-Fires-and-Carbon-Monoxide-Poisoning';
  const ESTAR = 'https://www.energystar.gov/saveathome/heating-cooling';
  const DOE = 'https://www.energy.gov/sites/default/files/2022-08/energy-saver-guide-2022.pdf';
  const LIHEAP = 'https://www.acf.hhs.gov/ocs/programs/liheap';
  const page = (path, title, description, crumb, blocks) => add({
    path, title, description, crumb, kind: 'answer', updated: UPDATED_SEARCH, blocks
  });
  const a = (href, label) => link(abs(href), label);
  const start = (tail) => link(GUIDE, 'Start the guided check') + (tail ? ' ' + tail : '.');
  const furnace = (landing) => start('and choose Furnace or air handler' + (landing ? ', then ' + landing : '') + '.');
  const GAS = '**If you smell gas or rotten eggs in the air, not just from the hot water, leave the house now and call the gas utility or 911 from outside.** Don’t touch light switches or phones, or use lighters, matches, or anything that could spark or flame while you’re inside.';
  const EGG = 'A rotten-egg smell only when the hot water runs is a water problem. Use the ' + a('/answers/hot-water-rotten-egg-smell/', 'rotten-egg smell') + ' page.';
  const CO = 'If a carbon monoxide alarm sounds, or anyone has a headache, dizziness, nausea, or drowsiness, get everyone outside and call 911 from outside. Don’t go back in to turn equipment off.';
  const BREAKER = 'Furnace breakers are never reset. Look at the breaker marked for the furnace. If the handle is in the middle or off, leave it and call a licensed HVAC professional. Never open the breaker panel cover or a disconnect box.';
  const SHUTOFF = 'Turn the heat Off at the thermostat now. Then switch off the furnace’s service switch or its breaker (switch it Off only). Never open the panel cover. Don’t reset a breaker that trips again. Don’t run the heat again until a licensed HVAC professional has checked it. If you see smoke or the smell gets stronger, get everyone outside and call 911 from outside.';
  const TSTAT = 'Look at the thermostat you already use. Don’t take it off the wall. Set mode to Heat, fan to Auto, and the setpoint a few degrees above the room temperature. Fan On blows room-temperature air between heating cycles, which can feel cold. Some thermostats wait a few minutes before they start.';
  const FILTER = 'Turn the system Off at the thermostat and wait until the blower stops. That does not cut power. Use only a tool-free filter slot or return grille you can reach from the floor. Read the size printed on the filter frame, put in one filter of that size, and point the airflow arrow toward the furnace. Close the slot. Don’t open a burner door to find a filter.';
  const SNOW = 'On a high-efficiency furnace, two plastic pipes on an outside wall bring air in and send exhaust out. From the ground, brush snow and leaves away from both ends by hand or with a soft broom, and clear a wide area around them. Leave ice that is stuck to a pipe. Stop if a pipe is cracked, loose, pulled apart, or has ice inside it.';
  const DRAIN = 'A high-efficiency furnace makes water. A clear or white tube outside the cabinet carries it to a floor drain or a small pump. Look from outside the furnace. If a tube you can reach without tools is kinked, gently straighten it by hand. Don’t pull it off. Stop if the tube is frozen, cracked, or you would have to open the furnace.';
  const NO_OVEN = 'Never heat with an oven, stove, grill, charcoal, or generator indoors. Those can fill a room with carbon monoxide. [CPSC winter weather tips](' + CPSC + ').';
  const SPACE = 'If you use an electric space heater, plug it straight into a wall outlet. Don’t use a power strip or extension cord, and don’t run the cord under a rug or carpet. Keep all sides at least three feet from beds, clothes, curtains, papers, and furniture. Put it on a stable, level surface where it won’t be knocked over. Don’t leave it running unattended in a confined space. [CPSC](' + CPSC + ').';

  page(
    '/answers/furnace-not-turning-on/',
    'Furnace Not Turning On',
    'Thermostat, filter, switch, breaker, vent-pipe, and condensate checks when the furnace won’t start, and when to call a pro.',
    'Furnace not turning on',
    [
      { p: GAS },
      { p: EGG },
      { p: CO },
      { p: 'If you smell burning plastic or see smoke or sparks, use the ' + a('/answers/furnace-burning-smell/', 'burning smell') + ' steps and stop. If someone in the home is a baby, an older adult, or has a medical need and the home is getting cold, get them warm first. A website check comes second.' },
      { h2: 'Causes, most common first' },
      { ol: [
        '**The thermostat isn’t calling for heat.** Wrong mode, a setpoint at or below the room, or the fan left On.',
        '**A clogged filter or a blocked return.** The furnace can shut itself off. You can check a filter you reach from the floor.',
        '**The furnace switch or a tripped breaker.** Look only. A furnace breaker is not reset.',
        '**Snow, ice, or debris on the outside vent pipes,** or a kinked condensate tube.',
        '**A code or a blinking light.** Read it through the window. Don’t open the door to find it.',
        '**No gas, no propane, or no oil.** A stove that won’t light, or a tank gauge you can already see, is a clue. Don’t turn a gas valve.'
      ]},
      { h2: 'Checks you can do' },
      { ol: [
        TSTAT,
        FILTER + ' Details are on the ' + a('/answers/furnace-filter-size/', 'filter size') + ' page.',
        'Find the switch that looks like a light switch on or near the furnace. Look only. If it was turned off on purpose, or you aren’t sure, leave it off. The guided check is the place that walks through turning that switch back on, and only once, when it was switched off by mistake and there is no smell, water, or noise.',
        BREAKER,
        'If a light is blinking or a display shows a code, don’t turn the power off. Cutting power can erase the code on some furnaces. Count the flashes for a full minute or photograph the display, then use the ' + a('/answers/furnace-blinking-light/', 'blinking light') + ' page.',
        SNOW,
        DRAIN,
        'On propane or oil, read the tank gauge you can already see. Don’t adjust a valve, and don’t press a red reset button on an oil burner.'
      ]},
      { h2: 'It’s not normal if' },
      { p: 'The furnace starts and stops every few minutes, you hear a bang when it tries to light, the vent pipe is damaged, water is near a switch or outlet, or the same code comes back. Short cycling has its own page. Water near electrical parts means stay out of it and call. Don’t mop toward the panel.' },
      { h2: 'Call a pro for these' },
      { p: 'Don’t open the furnace, relight a pilot, turn a gas valve, or bypass a safety switch so it keeps running. Burners, the flame sensor, the igniter, the control board, and refrigerant lines are pro work. If you hear hissing at refrigerant pipes, turn the system Off at the thermostat and don’t touch the pipes, valves, or caps.' },
      { p: 'If the blower runs and the air stays cool, use ' + a('/answers/furnace-blowing-cold-air/', 'blowing cold air') + '. If this is a boiler or radiators, use ' + a('/answers/boiler-not-heating/', 'boiler not heating') + ' instead. A heat pump that heats with the outdoor unit belongs on the heat-pump check, not this one.' },
      { p: furnace('No heat: nothing seems to happen') },
      { h2: 'Sources' },
      { ul: [
        '[CPSC winter weather tips](' + CPSC + ')',
        '[ENERGY STAR: check the filter](' + ESTAR + ')'
      ]},
      { h2: 'Related' },
      { ul: [
        a('/answers/furnace-maintenance-checklist/', 'Furnace maintenance checklist'),
        a('/answers/furnace-short-cycling/', 'Furnace short cycling'),
        a('/answers/furnace-blowing-cold-air/', 'Blowing cold air'),
        a('/answers/smart-thermostat-no-power/', 'Smart thermostat no power'),
        a('/answers/space-heater-furnace-out/', 'Space heater while the furnace is out'),
        a('/answers/no-heat-apartment/', 'No heat in an apartment')
      ]}
    ]
  );

  page(
    '/answers/hvac-quote-second-opinion/',
    'Is This HVAC Quote Too High? How to Get a Second Opinion',
    'What to get in writing on a heating or cooling quote, and how to get a second look before you approve the work.',
    'HVAC quote second opinion',
    [
      { p: 'A quote can look high and still match the work, or look low and leave out a permit, a thermostat, or haul-away. This page does not price the job and does not say what a quote should cost. It lists what to get in writing so a second company can look at the same job.' },
      { h2: 'Before anyone comes' },
      { p: 'Write down what you already know: thermostat mode and setpoint, whether the filter looks dirty, any code you can see without opening a door, and what the system does (nothing, cold air, short cycling, a noise). ' + furnace() + ' That note is for you to read to the company. It is not a diagnosis.' },
      { h2: 'What the written quote should name' },
      { ul: [
        'The equipment model, or the repair part, and whether it is a repair or a replacement.',
        'Labor, permit, haul-away of the old equipment, a new thermostat, and any duct changes. Ask them to list what is not included.',
        'The warranty they are offering, and who you call if it fails. Your existing warranty may require a licensed pro. Check it before you approve work.',
        'What they say failed, and what they looked at. A quote that never mentions the thermostat, the filter, or the outside vents skipped the first checks on these pages.',
        'Whether a repair was considered, and why they moved on from it. You can ask for that in writing. You don’t have to accept the answer on the spot.'
      ]},
      { h2: 'Getting a second look' },
      { ol: [
        'Give the second company the same description of the symptom. Don’t hand them only the first company’s price and ask them to beat it.',
        'Ask both to separate what they observed from what they recommend.',
        'Compare the scope, not a single bottom line. Two quotes for different equipment are not the same job.',
        'Gas valves, burners, refrigerant, and live electrical work belong to a licensed pro. Ask who holds the license for that part of the job. Don’t agree to do those steps yourself to shrink the quote.',
        'If you are pressed to sign the same day, or the only reason given is that the equipment is “done” with nothing written down, get the second look before you approve.'
      ]},
      { h2: 'What this page will not do' },
      { p: 'It will not tell you the quote is too high or too low. It will not tell you to repair or replace. A cracked heat exchanger, a refrigerant leak, or a failed board is something the pro has to show you a reason for. Refrigerant work needs an EPA-certified technician. Don’t ask anyone to bypass a safety to keep the old unit running until you decide.' },
      { p: 'If the bill is the reason you’re considering a replacement, start with ' + a('/answers/high-heating-bill/', 'why a heating bill runs high') + '. A dirty filter or Emergency Heat can raise a bill without a failed furnace.' },
      { p: start('and choose the equipment you actually have, then the symptom that matches.') },
      { h2: 'Related' },
      { ul: [
        a('/answers/high-heating-bill/', 'High heating bill'),
        a('/answers/furnace-not-turning-on/', 'Furnace not turning on'),
        a('/answers/furnace-blinking-light/', 'Furnace blinking light'),
        a('/answers/furnace-maintenance-checklist/', 'Furnace maintenance checklist')
      ]}
    ]
  );

  page(
    '/answers/furnace-burning-smell/',
    'Furnace Smells Like Burning the First Time You Turn On the Heat',
    'How to tell a dusty first-run smell from burning plastic, rubber, or smoke, and when to shut the furnace off.',
    'Furnace burning smell',
    [
      { p: GAS },
      { p: EGG },
      { p: 'If you can see smoke, or a smoke alarm is going off, get everyone outside now and call 911 from outside. Don’t go back in to turn the furnace off.' },
      { p: CO },
      { h2: 'What the smell is telling you' },
      { ol: [
        '**Dusty or slightly burnt, and it started the first time the heat ran this season.** Dust on a heat exchanger can smell while it warms up. In the guided check, that path is for a smell that is light and fading, and the heat has run less than about an hour.',
        '**Burning plastic, rubber, or an electrical smell.** That is not a dust smell. Shut the furnace off with the steps below and call a licensed HVAC professional.',
        '**The dusty smell lasts about an hour or longer, or it isn’t fading.** Treat it the same as a plastic or electrical smell. Shut it off and call.',
        '**A bang, soot, or scorch marks.** Stop using the furnace. Don’t open a door to look at the flame.'
      ]},
      { h2: 'If you shut it off' },
      { p: SHUTOFF },
      { p: 'If the house is getting cold, call a licensed HVAC professional. If it’s dangerously cold and anyone is at risk, get them somewhere warm first. ' + NO_OVEN + ' ' + SPACE },
      { h2: 'After a dusty smell has faded' },
      { p: 'Only if the smell was light, faded inside about an hour, and there is no smoke: check the filter and make sure returns aren’t blocked. Don’t open the furnace to vacuum the heat exchanger or the burners. Those parts stay closed.' },
      { h2: 'Don’t do these' },
      { ul: [
        'Don’t keep the heat running “to burn the smell off” once it has lasted about an hour, gotten stronger, or smells like plastic, rubber, or wiring.',
        'Don’t open the furnace, pull a board, or spray anything into the cabinet.',
        'Don’t reset a furnace breaker to see if the smell goes away.',
        'Don’t bypass a limit or a rollout switch. Those switches turned the furnace off for a reason.'
      ]},
      { p: furnace('A smell when the heat first came on this season') },
      { h2: 'Related' },
      { ul: [
        a('/answers/furnace-not-turning-on/', 'Furnace not turning on'),
        a('/answers/gas-smell-pilot-flame/', 'Gas smell, pilot, or flame'),
        a('/answers/furnace-maintenance-checklist/', 'Furnace maintenance checklist'),
        a('/answers/space-heater-furnace-out/', 'Space heater while the furnace is out')
      ]}
    ]
  );

  page(
    '/answers/boiler-not-heating/',
    'Boiler or Radiators Not Heating',
    'Thermostat, switch, gauge, and room checks when a boiler, radiators, or baseboard stay cold. No bleeding steps.',
    'Boiler not heating',
    [
      { p: GAS },
      { p: EGG },
      { p: CO },
      { p: 'If hot water or steam is spraying or pouring, or a relief pipe is discharging, stay back. Don’t touch a valve or try to plug the pipe. Call a licensed heating professional. For a serious burn, call 911.' },
      { p: 'If someone is a baby, an older adult, or has a medical need and they don’t have enough heat, get them warm first.' },
      { h2: 'Causes, most common first' },
      { ol: [
        '**The thermostat isn’t calling.** Mode isn’t Heat, or the setpoint is at or below the room. Some homes have a thermostat for each zone.',
        '**A switch or breaker is off.** Look only. Don’t flip it.',
        '**A code or lockout on the display.** Write it down. Don’t clear it.',
        '**Furniture or covers against the baseboard or radiators.**',
        '**Air in the pipes, a closed zone valve, or a boiler that isn’t firing.** Those need a pro. This page does not include bleeding steps.'
      ]},
      { h2: 'Checks you can do' },
      { ul: [
        'Don’t take the thermostat off the wall. Set Heat and a setpoint a few degrees above the room. Radiators and floors can take a while to warm. If that room has its own thermostat, check that one too.',
        'At the boiler, look only. Many boilers have a power switch and a service switch nearby, often with a red plate. Don’t flip any switch or breaker, and don’t open the boiler. If a switch is off or a breaker looks tripped, leave it and call.',
        'Write down a code exactly. Don’t open the jacket to read a chart.',
        'If you can already read the gauge, write the number down. If it sits on a relief setting or warning mark identified for your boiler, don’t touch the boiler. Call a pro.',
        'On a steam boiler, if the sight glass shows no water, don’t add water. Call a pro.',
        'Move furniture, curtains, and covers off the cold baseboard or radiators, then give it time.',
        'Don’t turn a gas valve, relight a pilot, or press a red reset button on an oil burner.'
      ]},
      { h2: 'When some radiators stay cold' },
      { p: 'Gurgling, or a radiator that is warm at the bottom and cold at the top, can mean air in a hot-water system or a steam vent that isn’t working. Both are reasons to call a licensed heating professional. This page does not include radiator or baseboard bleeding steps.' },
      { h2: 'It’s not normal if' },
      { p: 'You hear a bang or boom when the boiler starts, you see soot or scorch marks, or flame where the burner area shouldn’t show it. Stop using the boiler and call. Don’t open a door to inspect the flame.' },
      { p: 'If the heat is forced air from a furnace, use ' + a('/answers/furnace-not-turning-on/', 'furnace not turning on') + ' instead.' },
      { p: start('and choose Something else, then Boiler, radiators, baseboard, or radiant floors, then No heat anywhere.') },
      { h2: 'Related' },
      { ul: [
        a('/answers/boiler-maintenance-checklist/', 'Boiler maintenance checklist'),
        a('/answers/furnace-not-turning-on/', 'Furnace not turning on'),
        a('/answers/hot-water-rotten-egg-smell/', 'Rotten-egg smell'),
        a('/answers/no-heat-apartment/', 'No heat in an apartment'),
        a('/answers/gas-smell-pilot-flame/', 'Gas smell, pilot, or flame')
      ]}
    ]
  );

  page(
    '/answers/space-heater-furnace-out/',
    'Space Heaters When the Furnace Is Out',
    'How to use an electric space heater while the furnace is out, and what not to burn indoors.',
    'Space heater while the furnace is out',
    [
      { p: GAS },
      { p: 'If a carbon monoxide alarm is sounding, leave first. A space heater does not fix that. Get everyone outside and call 911 from outside.' },
      { p: 'An electric space heater can warm a room while you wait for a repair. It does not make a damaged furnace all right to run. If the furnace smells like burning plastic, or a breaker keeps tripping, leave the furnace off.' },
      { h2: 'Do not heat the room this way' },
      { p: NO_OVEN + ' Don’t cook on a charcoal grill in a garage, even with the door open. Don’t run a generator in a garage, basement, crawlspace, or porch. CPSC says to keep a portable generator outside, at least 20 feet from the house, with the exhaust pointed away from doors and windows.' },
      { h2: 'If you use an electric space heater' },
      { ul: [
        'Plug it straight into a wall outlet. Don’t use a power strip or an extension cord.',
        'Don’t run the cord under a rug or carpet.',
        'Keep all sides at least three feet from beds, clothes, curtains, papers, sofas, and anything else that can burn.',
        'Put it on a stable, level surface where it won’t be knocked over.',
        'Don’t leave it running unattended in a confined space. CPSC also says to be mindful of children and pets around it.',
        'Keep it away from water. Don’t touch it if you are wet.',
        'One heater per outlet. If the cord, plug, or outlet gets hot, unplug the heater and have a licensed electrician check the outlet before you use it again.',
        'Follow the heater maker’s instructions. If the heater, cord, or plug is damaged, don’t use it.'
      ]},
      { h2: 'The furnace stays closed' },
      { p: SHUTOFF.replace('Turn the heat Off at the thermostat now. Then switch off the furnace’s service switch or its breaker (switch it Off only). ', 'If you still need to shut the furnace off: turn the heat Off at the thermostat, then switch off the furnace’s service switch or its breaker (switch it Off only). ') },
      { p: 'Don’t open the furnace, relight a pilot, or bypass a safety so it runs beside the space heater. If someone is at risk from the cold, get them somewhere warm. An apartment with no heat has a separate page.' },
      { p: furnace('No heat: nothing seems to happen') },
      { h2: 'Sources' },
      { ul: ['[CPSC winter weather tips](' + CPSC + ')'] },
      { h2: 'Related' },
      { ul: [
        a('/answers/furnace-not-turning-on/', 'Furnace not turning on'),
        a('/answers/no-heat-apartment/', 'No heat in an apartment'),
        a('/answers/furnace-burning-smell/', 'Furnace burning smell'),
        a('/answers/gas-smell-pilot-flame/', 'Gas smell, pilot, or flame')
      ]}
    ]
  );

  page(
    '/answers/no-heat-apartment/',
    'No Heat in an Apartment',
    'What a renter can check, what to write down for the landlord, and when to leave. Housing rules differ by city.',
    'No heat in an apartment',
    [
      { p: GAS },
      { p: EGG },
      { p: CO },
      { p: 'If someone is a baby, an older adult, or has a medical need and the apartment is getting cold, get them warm first. That can mean another room, a neighbor, or somewhere else. Don’t wait on a reply if people are at risk.' },
      { h2: 'What you can check without opening the building’s equipment' },
      { ul: [
        'If you have a thermostat in the apartment, set Heat, fan Auto, and a setpoint a few degrees above the room. Don’t take it off the wall. Don’t open a locked mechanical closet, a roof unit, or a boiler room.',
        'Look at supply vents and radiators in your unit. Move your own furniture off a vent or a baseboard. Don’t bleed a radiator. That can dump water into the apartment, and this site doesn’t give bleeding steps.',
        'Don’t reset a breaker in a building panel, and don’t open the panel cover. If your own unit’s filter is in a tool-free slot you can reach from the floor, the ' + a('/answers/furnace-filter-size/', 'filter page') + ' applies. If the filter is in a locked room, leave it.',
        'Write down a code you can see without removing a cover. Don’t clear it.'
      ]},
      { h2: 'What to send the landlord or manager' },
      { p: 'Housing rules differ by city and state. This page is not legal advice, and it does not say you should withhold rent. Ask in writing, and keep a copy. Include the date, the thermostat settings you used, whether any air or radiators get warm, and whether other apartments in the building have heat if you know that. If you smelled gas, say that you left and called the gas utility or 911. Don’t stay inside to finish the message.' },
      { p: 'A local housing or health office is the place that knows the no-heat complaint process where you live. [211](https://www.211.org/) can help you find that office. Bring the written note.' },
      { h2: 'While you wait' },
      { p: NO_OVEN + ' An electric space heater only helps if the building allows it and the outlet can take it. Use the ' + a('/answers/space-heater-furnace-out/', 'space heater') + ' page. Don’t run a generator on a balcony or in a hallway.' },
      { p: 'If the apartment has its own furnace and you can reach it from your rooms, the ' + a('/answers/furnace-not-turning-on/', 'furnace not turning on') + ' checks apply. If the heat is a boiler or radiators, use ' + a('/answers/boiler-not-heating/', 'boiler not heating') + '. Stop at any step that means opening equipment you don’t control.' },
      { p: start('and choose the equipment you can already identify. If you can’t, choose Furnace or air handler only for a unit you can see in your own space.') },
      { h2: 'Related' },
      { ul: [
        a('/answers/furnace-not-turning-on/', 'Furnace not turning on'),
        a('/answers/boiler-not-heating/', 'Boiler not heating'),
        a('/answers/space-heater-furnace-out/', 'Space heater while the furnace is out'),
        a('/answers/gas-smell-pilot-flame/', 'Gas smell, pilot, or flame'),
        a('/answers/high-heating-bill/', 'High heating bill')
      ]}
    ]
  );

  page(
    '/answers/furnace-short-cycling/',
    'Furnace Turns On, Then Shuts Off',
    'What to check when a furnace starts and stops after a few minutes: thermostat, filter, vents, condensate, and when to stop restarting it.',
    'Furnace short cycling',
    [
      { p: GAS },
      { p: CO },
      { p: 'Short cycling means the furnace starts, then stops quickly, or it keeps trying. Don’t stand at the furnace and restart it over and over. Each retry can be another attempt to light.' },
      { h2: 'Causes, most common first' },
      { ol: [
        '**Thermostat settings.** Fan On, a setpoint only a hair above the room, or a schedule that keeps changing the call for heat.',
        '**A dirty filter or a blocked return.** The furnace can overheat and open a limit. You don’t reset or bypass that limit. You can change a filter you reach from the floor and clear a return grille.',
        '**Snow, ice, or a blocked vent pipe,** or a condensate tube that is kinked or frozen. A pressure switch can shut the furnace off when it can’t breathe or can’t drain.',
        '**A flame sensor, a failing igniter, or a limit that keeps opening.** Those parts are inside the furnace. That’s a pro job after the checks above.'
      ]},
      { h2: 'Checks you can do' },
      { ol: [
        TSTAT + ' Then wait one full cycle. Don’t change installer settings such as cycles per hour to force it to stay on.',
        FILTER,
        'Walk the returns and supplies. Furniture, rugs, and closed doors can choke a return. Open the supplies in the rooms you use. Don’t close a pile of vents to push more air to one room. That can make the short cycling worse.',
        SNOW,
        DRAIN,
        'If a light is blinking, don’t cut power. Count it for a full minute and use the ' + a('/answers/furnace-blinking-light/', 'blinking light') + ' page.'
      ]},
      { h2: 'Stop and call' },
      { p: 'Stop using the furnace if you hear a bang or boom when it starts, you see soot or scorch marks, or the flame is somewhere it shouldn’t be. Don’t open a door to watch the burner. Don’t hold a door switch in with tape, and don’t jumper a safety. ' + BREAKER },
      { p: 'If the blower never stops and the air is cold, that’s a different problem: ' + a('/answers/furnace-blowing-cold-air/', 'blowing cold air') + '. If nothing starts at all, use ' + a('/answers/furnace-not-turning-on/', 'furnace not turning on') + '.' },
      { p: furnace('Starts, then shuts off quickly or keeps retrying') },
      { h2: 'Related' },
      { ul: [
        a('/answers/furnace-not-turning-on/', 'Furnace not turning on'),
        a('/answers/furnace-blinking-light/', 'Furnace blinking light'),
        a('/answers/furnace-filter-size/', 'Furnace filter size'),
        a('/answers/furnace-blowing-cold-air/', 'Blowing cold air'),
        a('/answers/furnace-maintenance-checklist/', 'Furnace maintenance checklist')
      ]}
    ]
  );

  page(
    '/answers/furnace-ac-loud-noise/',
    'Furnace or AC Making a Loud Noise',
    'What a hum, rattle, whistle, or bang can mean, which sounds mean stop, and what you can check from outside the cabinet.',
    'Furnace or AC loud noise',
    [
      { p: GAS },
      { p: CO },
      { p: 'If you smell burning, see smoke or sparks, or hear grinding metal, turn the system Off at the thermostat and call a licensed HVAC professional. If there is smoke or fire, get everyone outside and call 911. Don’t open a panel to find the noise, and don’t keep the system running so you can hear it better.' },
      { h2: 'Match the sound' },
      { ul: [
        '**Bang or boom when the furnace starts.** Stop using the furnace and call. That can be delayed ignition. Don’t open the burner door, and don’t relight anything.',
        '**Hum or buzz at the outdoor unit while the fan is not spinning.** Stay outside the grille. Don’t push the fan with a stick. This often points at a capacitor or contactor, which is pro work. Advanced repairs are off on this site. Call a licensed HVAC professional.',
        '**Rattle from the outdoor cabinet.** From dry ground, look for a leaf, a twig, or something leaning on the cabinet. Don’t reach through the grille and don’t touch the fins. **' + CC1 + '**',
        '**Whistle or a high whoosh indoors.** Check the filter and whether a return is blocked or a lot of supply vents are closed. A filter in backward or two filters stacked can whistle and then shut the system off.',
        '**Clicking, then silence, over and over.** That can be short cycling. Use the ' + a('/answers/furnace-short-cycling/', 'short cycling') + ' page instead of restarting it.',
        '**Banging pipes or radiators.** Use ' + a('/answers/boiler-not-heating/', 'boiler not heating') + '. Don’t bleed a radiator from these instructions.',
        '**Hissing at refrigerant pipes.** Turn the system Off at the thermostat. Don’t touch the pipes, valves, or caps. Refrigerant work needs an EPA-certified technician.'
      ]},
      { h2: 'Breakers' },
      { p: BREAKER + ' A heat pump breaker is not reset from this page either. A cooling-only outdoor unit has a separate one-time breaker step, and only inside the guided check, when that check offers it. Never open the breaker panel cover or the disconnect box. If water is near the outdoor disconnect, stay back and call.' },
      { h2: 'Ice and snow' },
      { p: 'Don’t chip ice off a coil or a fan. On a heat pump, a cloud of steam for a few minutes in cold weather can be defrost. Ice that is still there after about an hour of running is not normal. Clear loose snow from the ground around the unit. Leave ice that is frozen to the cabinet.' },
      { p: 'For a furnace noise, ' + furnace('An unusual noise') + ' For a cooling-only air conditioner, ' + start('and choose Cooling-only AC, then Unusual noise.') + ' For a heat pump, ' + start('and choose Heat pump.') },
      { h2: 'Related' },
      { ul: [
        a('/answers/furnace-short-cycling/', 'Furnace short cycling'),
        a('/answers/furnace-burning-smell/', 'Furnace burning smell'),
        a('/answers/ac-maintenance-checklist/', 'AC maintenance checklist'),
        a('/answers/heat-pump-maintenance-checklist/', 'Heat pump maintenance checklist'),
        a('/answers/side-discharge-outdoor-unit-error-code/', 'Side-discharge error code'),
        a('/answers/boiler-not-heating/', 'Boiler not heating')
      ]}
    ]
  );

  page(
    '/answers/smart-thermostat-no-power/',
    'Smart Thermostat Has No Power or Won’t Connect',
    'Blank screen, Wi-Fi, and no heat after a thermostat install: checks that don’t pull the thermostat off the wall.',
    'Smart thermostat no power',
    [
      { p: 'If you smell burning at the thermostat or the furnace, see sparks, or a carbon monoxide alarm is sounding, stop. Burning or sparks: get away and call 911 if there is smoke or fire. A CO alarm: get everyone outside and call 911. ' + GAS },
      { h2: 'Blank screen' },
      { ol: [
        'If your model takes batteries and the manual shows a cover that opens by hand, put in fresh batteries of the type it names. If the cover doesn’t match, stop.',
        'Don’t pull the thermostat off the wall to look for wires. A C wire, a power adapter, or a kit inside the furnace means opening equipment. That’s a stop. Call the installer or a licensed HVAC professional.',
        'Look at the furnace or air-handler blower door. Some systems stop when that door isn’t seated. Don’t take the door off. If it is hanging open and you can push it shut without tools and without reaching inside, push it shut. If you’d have to remove it, leave it and call.',
        'Look at the furnace switch. Don’t flip it. If it is off, leave it and call. People turn that switch off on purpose after a leak or a smell.',
        BREAKER,
        'If lights and other equipment in the house are out too, the thermostat isn’t the only thing without power. Check with the utility before you take the thermostat apart.'
      ]},
      { h2: 'Wi-Fi or the app won’t connect' },
      { ol: [
        'Restart the router and wait until it is back online.',
        'If your thermostat needs a 2.4 GHz network, check that one is on. Many phones use 5 GHz and the thermostat cannot join that band.',
        'Reconnect the thermostat to Wi-Fi using the maker’s steps on the screen you already see. If the screen doesn’t match, stop. Don’t keep pressing through menus.',
        'If it shows a Wi-Fi hardware error, or it still fails after a router restart, stop and call. Don’t open the thermostat.'
      ]},
      { h2: 'No heat after a new install' },
      { p: TSTAT + ' Wait a few minutes. A new thermostat can sit on a delay. If a screen asks you to pick equipment type, wiring, or an installer setting, or it asks for a password, stop and call the installer. Don’t guess. The furnace may be fine and the setup may be wrong.' },
      { p: 'If the screen looks normal and the furnace still doesn’t start, continue with ' + a('/answers/furnace-not-turning-on/', 'furnace not turning on') + '. Don’t change the furnace’s wiring to match a diagram from the internet.' },
      { p: start('and choose Something else, then Thermostat or settings problem. For a blank screen, choose The screen is blank or keeps restarting. For Wi-Fi, choose The app can’t reach the thermostat, or Wi-Fi is offline.') },
      { h2: 'Related' },
      { ul: [
        a('/answers/thermostat-maintenance-checklist/', 'Thermostat maintenance checklist'),
        a('/answers/furnace-not-turning-on/', 'Furnace not turning on'),
        a('/answers/furnace-blowing-cold-air/', 'Blowing cold air'),
        a('/answers/high-heating-bill/', 'High heating bill')
      ]}
    ]
  );

  page(
    '/answers/gas-smell-pilot-flame/',
    'Gas Smell, Pilot Light Out, or a Furnace Flame That Looks Wrong',
    'When to leave and call, and why a pilot, a gas valve, and a burner flame are not homeowner repairs.',
    'Gas smell, pilot, or flame',
    [
      { p: GAS },
      { p: 'Gas utilities odorize natural gas so a leak smells like rotten eggs. Treat a gas smell, a hiss you can’t place, or a strong smell you can’t identify the same way: leave, then call from outside. Don’t flip switches on the way out.' },
      { p: EGG },
      { p: CO },
      { h2: 'Pilot light out' },
      { p: 'Don’t relight a pilot. Don’t turn the gas valve to feed it, and don’t hold a button down to keep a flame lit. A pilot that won’t stay lit can be a thermocouple, a gas control, or a draft problem. Those are inside the combustion area. Call a licensed HVAC professional and leave the furnace off. The same rule is on the water-heater pages: relighting is a pro job here.' },
      { h2: 'Flame color, soot, or a bang' },
      { p: 'Don’t open a door and don’t go look at the flame to judge it. If you have already seen a yellow or orange flame, soot or scorch marks, or flame outside the burner area, stop using the furnace or boiler. If you heard a bang or boom when it started, stop using it. Call a licensed pro. Don’t try to “adjust the air” on a burner. That is gas-valve and burner work.' },
      { h2: 'What you may look at, only if you do not smell gas' },
      { ul: [
        'A gas shut-off handle usually lines up with the pipe when it is open, and sits across the pipe when it is closed. Look. Don’t turn it.',
        'On propane, read the tank gauge you can already see. Don’t open a tank valve to “wake up” the furnace.',
        TSTAT + ' Only if there is no gas smell and no CO alarm.',
        'A blinking light you can see through the window. Don’t clear it by cutting power. Use the ' + a('/answers/furnace-blinking-light/', 'blinking light') + ' page.'
      ]},
      { h2: 'Hard stops' },
      { p: 'Refrigerant valves stay closed. Don’t bypass a flame rollout switch, a spill switch, or a pressure switch so the furnace will run. Don’t open the electrical panel. If the vent pipe is cracked, disconnected, or rusted through, stop using the furnace and call. Don’t tape a flue back together.' },
      { p: furnace() + ' The first furnace screen is the combustion and carbon monoxide check. For a boiler, ' + start('and choose Something else, then Boiler, radiators, baseboard, or radiant floors.') },
      { h2: 'Sources' },
      { ul: ['[CPSC: if you smell gas, leave and call from outside](' + CPSC + ')'] },
      { h2: 'Related' },
      { ul: [
        a('/answers/hot-water-rotten-egg-smell/', 'Rotten-egg smell'),
        a('/answers/furnace-burning-smell/', 'Furnace burning smell'),
        a('/answers/furnace-not-turning-on/', 'Furnace not turning on'),
        a('/answers/boiler-not-heating/', 'Boiler not heating'),
        a('/answers/no-hot-water/', 'No hot water')
      ]}
    ]
  );

  page(
    '/answers/furnace-filter-size/',
    'What Size Furnace Filter Do I Need?',
    'Where furnace filters sit, how to read the size on the frame, and how often to check it.',
    'Furnace filter size',
    [
      { p: 'The size is printed on the filter’s frame, not guessed from the furnace brand. It is three numbers: length, width, and thickness. Buy that size. A thicker filter than the slot can crush the media or keep the door from closing, and the furnace may not run.' },
      { h2: 'Where to look' },
      { ul: [
        '**A slot on the furnace or air handler.** A cover on the side, bottom, or top slides or lifts by hand. The filter is in that slot, not in the burner compartment.',
        '**A return grille.** In a hallway, wall, or ceiling, the filter sits behind a grille that opens by hand. That’s the filter for some systems. There may be one in the slot and one in the grille. Use only the location your owner’s manual names. Two filters stacked in one slot choke the air.',
        '**A manufactured-home furnace.** Many pull room air through louvers on the closet door, and some hold the filter on that door. Don’t block the louvers with stored items. If the only filter is behind a panel that needs tools, or the panel opens onto the burners, stop and call.',
        'If you can’t find a slot without opening a burner door, stop. Don’t remove furnace doors to hunt for it.'
      ]},
      { h2: 'How to change it' },
      { ol: [
        'Set the thermostat to Off and wait until the blower stops. That does not disconnect power.',
        'Open only the filter cover. Note the arrow on the old filter. The new arrow points the same way, toward the furnace or blower.',
        'Put in one filter. The printed size should match the old frame. If the old filter has no printing, measure that frame. Don’t measure the empty slot by sticking a tape into the blower.',
        'Close the cover so it sits flat. A door that isn’t seated can stop the furnace.',
        'Put the thermostat back to Heat or Cool and the fan to Auto.'
      ]},
      { h2: 'How often' },
      { p: '[ENERGY STAR](' + ESTAR + ') says to check the filter every month in heavy-use seasons. If it looks dirty after a month, change it. At a minimum, change it every 3 months. Pets, smoke, and a renovation clog a filter sooner. Your owner’s manual wins if it gives a different interval. A washable filter is cleaned only the way that manual describes, then dried before it goes back. Don’t run the system with the slot empty.' },
      { p: 'A filter that is the right size and still filthy can cause ' + a('/answers/furnace-short-cycling/', 'short cycling') + ', weak air, or a ' + a('/answers/high-heating-bill/', 'higher bill') + '. It will not fix a furnace that never starts. Use ' + a('/answers/furnace-not-turning-on/', 'furnace not turning on') + ' for that.' },
      { p: furnace() },
      { h2: 'Sources' },
      { ul: ['[ENERGY STAR: Heat and cool efficiently](' + ESTAR + ')'] },
      { h2: 'Related' },
      { ul: [
        a('/answers/furnace-maintenance-checklist/', 'Furnace maintenance checklist'),
        a('/answers/furnace-not-turning-on/', 'Furnace not turning on'),
        a('/answers/furnace-short-cycling/', 'Furnace short cycling'),
        a('/answers/furnace-blowing-cold-air/', 'Blowing cold air'),
        a('/answers/ac-maintenance-checklist/', 'AC maintenance checklist')
      ]}
    ]
  );

  page(
    '/answers/furnace-blinking-light/',
    'Furnace Blinking Light or Error Code',
    'How to read a furnace light or code without opening the door, and which codes mean stop.',
    'Furnace blinking light',
    [
      { p: GAS },
      { p: CO },
      { p: 'A blinking light or a code means the furnace shut itself off or is warning you. Don’t clear it to make the light go steady. The code is what you tell the pro.' },
      { h2: 'Read it without opening the furnace' },
      { ol: [
        'Most furnaces have a small window in the lower door, or a display, or a code on the thermostat. Look only. Don’t remove the door. On some brands, cutting power or taking the door off erases the stored code.',
        'Watch for one full minute. Codes repeat, with a pause between them. Count short flashes and long flashes separately. A phone video helps.',
        'Write the brand name printed on the front of the furnace. Codes are not the same from one brand to the next, or even from one board to the next.',
        'If a chart is printed where you can read it without removing a door, and it disagrees with something you read online, trust the chart on the furnace. If the chart is inside the door, leave the door on and give the blink count to a licensed HVAC professional.',
        'Don’t flip the breaker to “reset the code.” ' + BREAKER
      ]},
      { h2: 'What you can check around the code' },
      { p: 'A blocked vent or a condensate problem is a common reason a high-efficiency furnace locks out. ' + SNOW + ' ' + DRAIN + ' Then wait and see if the furnace starts on its own. If the same code returns, stop. Don’t keep cycling power.' },
      { p: 'Also check the filter and the thermostat, using the ' + a('/answers/furnace-filter-size/', 'filter') + ' page and Heat / Auto / setpoint above the room. Those don’t clear a code by themselves. They remove two reasons the furnace may have shut off.' },
      { h2: 'Stop, don’t interpret it yourself, if' },
      { ul: [
        'You smell gas, exhaust, or burning, or a CO alarm sounds.',
        'The code comes back after the vents and the drain are clear.',
        'You see soot, scorch marks, or you heard a bang when it tried to start.',
        'The only way to see the code is to open a panel or a service menu that asks for a password.'
      ]},
      { p: 'This page does not list brand blink charts. A wrong chart can send you into the burner or the board. An outdoor heat pump or side-discharge unit uses a different code page: ' + a('/answers/side-discharge-outdoor-unit-error-code/', 'side-discharge error code') + '.' },
      { p: furnace('A light is blinking or a code is showing on the furnace') },
      { h2: 'Related' },
      { ul: [
        a('/answers/furnace-not-turning-on/', 'Furnace not turning on'),
        a('/answers/furnace-short-cycling/', 'Furnace short cycling'),
        a('/answers/gas-smell-pilot-flame/', 'Gas smell, pilot, or flame'),
        a('/answers/side-discharge-outdoor-unit-error-code/', 'Side-discharge error code'),
        a('/answers/tankless-water-heater-error-code/', 'Tankless water heater error code')
      ]}
    ]
  );

  page(
    '/answers/high-heating-bill/',
    'Why Is My Heating Bill So High?',
    'Thermostat, filter, Emergency Heat, and airflow checks that raise a heating bill, and where to ask about bill help.',
    'High heating bill',
    [
      { p: 'A high bill is not, by itself, a failed furnace. Start with settings and airflow you can see. This page does not say what your bill should be, and it does not compare you to a national average.' },
      { h2: 'Checks that change the bill' },
      { ol: [
        '**Setpoint and schedule.** The [U.S. Department of Energy Energy Saver guide](' + DOE + ') says you can save as much as 10% a year on heating and cooling by turning the thermostat down 7°–10°F for 8 hours a day in fall and winter, and up in spring and summer. The same guide says not to do that setback on a heat pump unless the thermostat is made for heat pumps. A deep setback can call on backup electric heat and wipe out the savings.',
        '**Fan On.** Auto runs the blower with a call for heat. On runs it all the time and moves room-temperature air between cycles. That feels cool and uses more electricity. Set Auto unless a pro told you otherwise.',
        '**Emergency Heat or Aux on a heat pump.** Those strips heat with electricity and usually cost more to run. Leave them off for everyday heat. Use them only the way the guided check describes while you wait for a pro, then turn them off.',
        '**A dirty filter.** [ENERGY STAR](' + ESTAR + ') says a dirty filter makes the system work harder. Check monthly in winter and change it at least every 3 months, or when it looks dirty. Steps are on the ' + a('/answers/furnace-filter-size/', 'filter size') + ' page.',
        '**Blocked returns and closed supplies.** Furniture against a return, or many closed vents, makes the blower work harder. Open the vents in the rooms you use. Don’t close most of them to force heat upstairs.',
        '**Snow on a heat pump or on furnace vent pipes.** A buried outdoor unit or a blocked exhaust pipe can stop heating or push the system onto backup heat. Brush loose snow away from the ground around the unit, or from both furnace pipes, from the ground. Don’t chip ice. **' + CC1 + '**',
        '**Drafts you can already see.** A gap under a door or a window that doesn’t latch lets heat out. A door sweep you already own is a house item, not a furnace repair. Duct sealing in an attic is a pro or a careful manual job, not a step on this page.'
      ]},
      { h2: 'Read your own bill' },
      { p: 'Compare this month with the same month you have a bill for, and look at the units used, not only the dollar total. A rate change and a cold snap can both raise the total. If usage jumped and the checks above didn’t change anything, call a licensed HVAC professional. Bring the thermostat settings and whether Emergency Heat has been on. Don’t open the furnace to hunt for a cause.' },
      { h2: 'If the bill is hard to pay' },
      { p: 'Ask your utility what payment plans it offers. The Low Income Home Energy Assistance Program is described at [LIHEAP](' + LIHEAP + '). Who qualifies, and for how much, is set where you live. This page does not say you qualify. A quote to replace the system is a separate decision: ' + a('/answers/hvac-quote-second-opinion/', 'how to get a second opinion') + '.' },
      { p: start('and choose Furnace or air handler, or Heat pump if the outdoor unit heats the house. For thermostat schedules, choose Something else, then Thermostat or settings problem.') },
      { h2: 'Sources' },
      { ul: [
        '[Energy Saver guide (DOE), thermostat setback](' + DOE + ')',
        '[ENERGY STAR: filters and heating](' + ESTAR + ')',
        '[LIHEAP](' + LIHEAP + ')'
      ]},
      { h2: 'Related' },
      { ul: [
        a('/answers/furnace-filter-size/', 'Furnace filter size'),
        a('/answers/thermostat-maintenance-checklist/', 'Thermostat maintenance checklist'),
        a('/answers/heat-pump-maintenance-checklist/', 'Heat pump maintenance checklist'),
        a('/answers/hvac-quote-second-opinion/', 'HVAC quote second opinion'),
        a('/answers/furnace-maintenance-checklist/', 'Furnace maintenance checklist')
      ]}
    ]
  );

  page(
    '/answers/furnace-blowing-cold-air/',
    'Furnace Running but Blowing Cold Air',
    'What to check when the blower runs and the air isn’t warm, or when no air comes out of the vents.',
    'Furnace blowing cold air',
    [
      { p: GAS },
      { p: EGG },
      { p: CO },
      { p: 'Two different problems get lumped together. The blower can be running while the air stays cool, or the vents can be quiet because the blower isn’t running. The checks overlap, and the ending doesn’t.' },
      { h2: 'Air is moving, and it isn’t warm' },
      { ol: [
        TSTAT + ' Wait one full heating cycle before you decide the air is cold. The blower often starts before the burner, and the first minute can feel cool.',
        'If this is a heat pump, a few minutes of cool air in cold weather can be defrost. Steam at the outdoor unit for a few minutes can be normal. If there is still no heat after about an hour, or ice stays on the outdoor unit, call a licensed HVAC professional. Don’t chip the ice. Emergency Heat usually costs more to run. Don’t leave it on as the everyday setting. ' + start('and choose Heat pump, then the no-heat path.'),
        FILTER,
        'Open supply vents and uncover return grilles. A system can blow hard from one vent and almost nothing from another if the others are closed or a duct has come loose. Don’t crawl a tight attic to reseat a duct. If you can see a duct joint that has fallen open in a basement you already walk through, leave it and call. Tape is not a repair this page teaches.',
        'If the blower keeps running and the air is still cool after a full cycle, the burner or the heat strips are not heating. Don’t open the furnace to look at the flame or the elements. Call a licensed HVAC professional. Give them the thermostat settings, whether you smell anything, and any blink code you could see through the window.'
      ]},
      { h2: 'No air from the vents' },
      { ol: [
        'Confirm the thermostat is on Heat, not Off, and the fan isn’t stuck in a mode the screen doesn’t explain. If the screen is blank, use ' + a('/answers/smart-thermostat-no-power/', 'smart thermostat no power') + '.',
        'Check the filter. A packed filter can leave the vents feeling dead.',
        'Look at the blower door. If it isn’t seated, some furnaces won’t run the blower. Don’t remove the door. Push it shut only if you can do that without tools and without reaching inside.',
        'Look at the furnace switch and the breaker. ' + BREAKER,
        SNOW + ' A blocked exhaust can keep the furnace from firing, and then there is no warm air. The blower may or may not run, depending on the furnace.',
        DRAIN
      ]},
      { h2: 'Don’t do these' },
      { ul: [
        'Don’t open the burner compartment or the electrical panel.',
        'Don’t turn a gas valve or relight a pilot to “get the flame back.”',
        'Don’t bypass a limit switch because the furnace starts and then stops. That’s ' + a('/answers/furnace-short-cycling/', 'short cycling') + '.',
        'Don’t set the fan to On and leave it there to force air. You will feel a steady cool breeze and the heat may still be off.'
      ]},
      { p: furnace('Blower runs, but the air isn’t warm') + ' If nothing is coming out of the vents, choose No heat: nothing seems to happen instead.' },
      { h2: 'Related' },
      { ul: [
        a('/answers/furnace-not-turning-on/', 'Furnace not turning on'),
        a('/answers/furnace-filter-size/', 'Furnace filter size'),
        a('/answers/furnace-short-cycling/', 'Furnace short cycling'),
        a('/answers/smart-thermostat-no-power/', 'Smart thermostat no power'),
        a('/answers/furnace-burning-smell/', 'Furnace burning smell'),
        a('/answers/heat-pump-maintenance-checklist/', 'Heat pump maintenance checklist')
      ]}
    ]
  );
};
