/* Cleared side-discharge code rows (D-059 / D-060). Homeowner strings are copied from those rulings. */
'use strict';
module.exports = {
  "rows": [
    {
      "brand": "climate5000",
      "id": "c_climate5000_dF",
      "code": "dF",
      "meaning": "Defrost",
      "showMeaning": true,
      "cell": "Bosch lists dF as “Defrost.” A cloud of steam and a stopped outdoor fan can be part of a normal defrost. If ice is still there after about an hour of running, call a licensed HVAC professional. If the house is getting cold, use the cold-home choice first.",
      "route": "info"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_EC_07",
      "code": "EC 07",
      "meaning": "The outdoor fan speed is operating outside of the normal range",
      "showMeaning": true,
      "cell": "Write the code down. From the ground, look for ice, snow, or debris at the outdoor fan grille. Don’t reach into the grille or touch the fan. Call a licensed HVAC professional.",
      "route": "pro"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_EC_51",
      "code": "EC 51",
      "meaning": "Outdoor unit EEPROM parameter error",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_EC_52",
      "code": "EC 52",
      "meaning": "Condenser coil temperature sensor T3 open/short",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_EC_53",
      "code": "EC 53",
      "meaning": "Outdoor room temperature sensor T4 open/short",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_EC_54",
      "code": "EC 54",
      "meaning": "Compressor discharge temperature sensor TP open/short",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_EC_56",
      "code": "EC 56",
      "meaning": "Evaporator coil outlet temperature sensor T2B open/short (multi)",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_EL_0C",
      "code": "EL 0C",
      "meaning": "System lacks refrigerant",
      "showMeaning": true,
      "cell": "Write the code down. Don’t touch the pipes, valves, or caps. Call a licensed HVAC professional (refrigerant work needs an EPA-certified technician).",
      "route": "refrigerant"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_FH_CC",
      "code": "FH CC",
      "meaning": "Refrigerant sensor error",
      "showMeaning": true,
      "cell": "Write the code down. If a refrigerant-leak alarm sounds, or you notice a sweet or chemical smell, use Stop / get help.",
      "route": "pro"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_EH_C1",
      "code": "EH C1",
      "meaning": "Refrigerant sensor detects leakage",
      "showMeaning": true,
      "cell": "Don’t reset or clear the code.",
      "route": "leak"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_EH_C2",
      "code": "EH C2",
      "meaning": "Sensor out of range and leakage detected",
      "showMeaning": true,
      "cell": "Don’t reset or clear the code.",
      "route": "leak"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_EH_C3",
      "code": "EH C3",
      "meaning": "Sensor working condition out of range",
      "showMeaning": true,
      "cell": "Write the code down. If a refrigerant-leak alarm sounds, or you notice a sweet or chemical smell, use Stop / get help.",
      "route": "pro"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_EC_C1",
      "code": "EC C1",
      "meaning": "Other indoor unit refrigerant leakage detection (Multi-zone)",
      "showMeaning": true,
      "cell": "Don’t reset or clear the code.",
      "route": "leak"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_PC_00",
      "code": "PC 00",
      "meaning": "IPM malfunction or IGBT over-strong current protection",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_PC_01",
      "code": "PC 01",
      "meaning": "Over voltage or over low voltage protection",
      "showMeaning": true,
      "cell": "Write the code down. If your lights dim or flicker too, tell the pro or your power company. You can switch the breaker off. If it has tripped, leave it as it is. Don’t reset it. Call a licensed HVAC professional. Never open the panel cover.",
      "route": "pro"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_PC_02",
      "code": "PC 02",
      "meaning": "High Temperature protection of IPM module",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_PC_03",
      "code": "PC 03",
      "meaning": "Pressure protection (low or high) (for some models)",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "climate5000",
      "id": "c_climate5000_PC_04",
      "code": "PC 04",
      "meaning": "Inverter compressor drive error",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "puz",
      "id": "c_puz_U1_Ud",
      "code": "U1 / Ud",
      "meaning": "Abnormal high pressure (63H) / Overheating protection",
      "showMeaning": true,
      "cell": "Write the code down. From the ground, look for blocked clearance, snow, or debris around the outdoor unit. Don’t reach into the grille. Call a licensed HVAC professional.",
      "route": "pro"
    },
    {
      "brand": "puz",
      "id": "c_puz_U2",
      "code": "U2",
      "meaning": "Abnormal high discharge temperature / 49C / insufficient refrigerant",
      "showMeaning": true,
      "cell": "Write the code down. Don’t touch the pipes, valves, or caps. Call a licensed HVAC professional.",
      "route": "refrigerant"
    },
    {
      "brand": "puz",
      "id": "c_puz_U3_U4",
      "code": "U3 / U4",
      "meaning": "Open/short of outdoor unit thermistors",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "puz",
      "id": "c_puz_U5",
      "code": "U5",
      "meaning": "Abnormal temperature of heatsink",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "puz",
      "id": "c_puz_U6",
      "code": "U6",
      "meaning": "Compressor overcurrent interruption / Abnormal of power module",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "puz",
      "id": "c_puz_U7",
      "code": "U7",
      "meaning": "Abnormality of super heat due to low discharge temperature",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "puz",
      "id": "c_puz_U8",
      "code": "U8",
      "meaning": "Outdoor unit fan protection stop",
      "showMeaning": true,
      "cell": "Write the code down. From the ground, look for ice, snow, or debris at the outdoor fan grille. Don’t reach into the grille or touch the fan. Call a licensed HVAC professional.",
      "route": "pro"
    },
    {
      "brand": "puz",
      "id": "c_puz_U9_UH",
      "code": "U9 / UH",
      "meaning": "Overvoltage / voltage shortage / synchronous signal / current sensor",
      "showMeaning": true,
      "cell": "Write the code down. If your lights dim or flicker too, tell the pro or your power company. You can switch the breaker off. If it has tripped, leave it as it is. Don’t reset it. Call a licensed HVAC professional. Never open the panel cover.",
      "route": "pro"
    },
    {
      "brand": "puz",
      "id": "c_puz_UF_UP",
      "code": "UF / UP",
      "meaning": "Compressor overcurrent interruption (locked / starting)",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "puz",
      "id": "c_puz_UE",
      "code": "UE",
      "meaning": "",
      "showMeaning": false,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "puz",
      "id": "c_puz_UL",
      "code": "UL",
      "meaning": "",
      "showMeaning": false,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "puz",
      "id": "c_puz_F5",
      "code": "F5",
      "meaning": "High-pressure switch connector open (power-on)",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "puz",
      "id": "c_puz_PA",
      "code": "PA",
      "meaning": "Forced compressor stop (water leakage)",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "puz",
      "id": "c_puz_PL",
      "code": "PL",
      "meaning": "Abnormal refrigerant circuit",
      "showMeaning": true,
      "cell": "Write the code down. Don’t touch the pipes, valves, or caps. Call a licensed HVAC professional.",
      "route": "refrigerant"
    },
    {
      "brand": "puz",
      "id": "c_puz_E0_E9_family",
      "code": "E0–E9 family",
      "meaning": "Remote / indoor–outdoor communication",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "puz",
      "id": "c_puz_P2_P5_P8_P9",
      "code": "P2 / P5 / P8 / P9",
      "meaning": "Indoor pipe / drain / condenser family",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_00",
      "code": "00",
      "meaning": "Normal",
      "showMeaning": true,
      "cell": "",
      "route": "info"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_U0",
      "code": "U0",
      "meaning": "Refrigerant shortage",
      "showMeaning": true,
      "cell": "Write the code down. Don’t touch the pipes, valves, or caps. Call a licensed HVAC professional (refrigerant work needs an EPA-certified technician).",
      "route": "refrigerant"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_U2",
      "code": "U2",
      "meaning": "Low-voltage detection or over-voltage detection",
      "showMeaning": true,
      "cell": "Write the code down. If your lights dim or flicker too, tell the pro or your power company. You can switch the breaker off. If it has tripped, leave it as it is. Don’t reset it. Call a licensed HVAC professional. Never open the panel cover.",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_U4",
      "code": "U4",
      "meaning": "Signal transmission error (indoor↔outdoor)",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_UA",
      "code": "UA",
      "meaning": "Unspecified voltage (indoor↔outdoor)",
      "showMeaning": true,
      "cell": "Write the code down. If your lights dim or flicker too, tell the pro or your power company. You can switch the breaker off. If it has tripped, leave it as it is. Don’t reset it. Call a licensed HVAC professional. Never open the panel cover.",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_E1",
      "code": "E1",
      "meaning": "Outdoor unit PCB abnormality",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_E5",
      "code": "E5",
      "meaning": "OL activation (compressor overload) / HPS activation (high pressure switch)",
      "showMeaning": true,
      "cell": "Write the code down. From the ground, look for blocked clearance, snow, or debris around the outdoor unit. Don’t reach into the grille. Call a licensed HVAC professional.",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_E6",
      "code": "E6",
      "meaning": "Compressor lock",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_E7",
      "code": "E7",
      "meaning": "DC fan lock",
      "showMeaning": true,
      "cell": "Write the code down. From the ground, look for ice, snow, or debris at the outdoor fan grille. Don’t reach into the grille or touch the fan. Call a licensed HVAC professional.",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_E8",
      "code": "E8",
      "meaning": "Input overcurrent detection",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_EA",
      "code": "EA",
      "meaning": "Four way valve abnormality",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_F3",
      "code": "F3",
      "meaning": "Discharge pipe temperature control",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_F6",
      "code": "F6",
      "meaning": "High pressure control in cooling",
      "showMeaning": true,
      "cell": "Write the code down. From the ground, look for blocked clearance, snow, or debris around the outdoor unit. Don’t reach into the grille. Call a licensed HVAC professional.",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_F8",
      "code": "F8",
      "meaning": "System shutdown due to temperature abnormality in the compressor",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_H0",
      "code": "H0",
      "meaning": "Compressor system sensor abnormality",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_H6",
      "code": "H6",
      "meaning": "Position sensor abnormality",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_H9_J3_J6_P4",
      "code": "H9 / J3 / J6 / P4",
      "meaning": "Outdoor / discharge / heat-exchanger / radiation-fin thermistors",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_L3_L4",
      "code": "L3 / L4",
      "meaning": "Electrical box temperature rise / Radiation fin temperature rise",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_L5",
      "code": "L5",
      "meaning": "Output overcurrent detection",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_U7",
      "code": "U7",
      "meaning": "Signal transmission error on outdoor unit PCB",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_A1_A3_A5_A6_A8_AF_C4_C5_C9_CJ",
      "code": "A1 / A3 / A5 / A6 / A8 / AF / C4 / C5 / C9 / CJ",
      "meaning": "Indoor PCB / drain / freeze-up / indoor fan / humidifier / indoor thermistors",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "aurora",
      "id": "c_aurora_U5_U8",
      "code": "U5 / U8",
      "meaning": "Indoor↔remote / MAIN↔SUB remote (FDMQ)",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "gszs6",
      "id": "c_gszs6_13_E13_14",
      "code": "13 / E13, 14",
      "meaning": "Frequent high-pressure faults (CRITICAL / MINOR). Causes include blocked/restricted outdoor coil, outdoor fan not running, stop valve, overcharge",
      "showMeaning": true,
      "cell": "Write the code down. From the ground, look for blocked clearance, snow, or debris around the outdoor unit. Don’t reach into the grille. Call a licensed HVAC professional.",
      "route": "pro"
    },
    {
      "brand": "gszs6",
      "id": "c_gszs6_19_E19",
      "code": "19 / E19",
      "meaning": "Frequent outdoor unit control board and/or motor faults. Causes include obstruction in fan rotation",
      "showMeaning": true,
      "cell": "Write the code down. From the ground, look for ice, snow, or debris at the outdoor fan grille. Don’t reach into the grille or touch the fan. Call a licensed HVAC professional.",
      "route": "pro"
    },
    {
      "brand": "gszs6",
      "id": "c_gszs6_32_E32_33",
      "code": "32 / E32, 33",
      "meaning": "High-temperature faults on outdoor control board",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "gszs6",
      "id": "c_gszs6_44_E44",
      "code": "44 / E44",
      "meaning": "",
      "showMeaning": false,
      "cell": "Write the code down. Goodman lists this when the outdoor temperature is outside the operating range. The unit may keep running. If heating or cooling is lost, or someone at home is at risk from the cold, use the cold-home choice. Call a licensed HVAC professional.",
      "route": "pro"
    },
    {
      "brand": "gszs6",
      "id": "c_gszs6_15_E15_16_41_E41",
      "code": "15 / E15, 16, 41 / E41",
      "meaning": "Frequent low-pressure faults / low refrigerant condition. Causes include leak, low charge",
      "showMeaning": true,
      "cell": "Write the code down. Don’t touch the pipes, valves, or caps. Call a licensed HVAC professional (refrigerant work needs an EPA-certified technician).",
      "route": "refrigerant"
    },
    {
      "brand": "gszs6",
      "id": "c_gszs6_42_E42_43_E43",
      "code": "42 / E42, 43 / E43",
      "meaning": "Low / high power supply voltage",
      "showMeaning": true,
      "cell": "Write the code down. If your lights dim or flicker too, tell the pro or your power company. You can switch the breaker off. If it has tripped, leave it as it is. Don’t reset it. Call a licensed HVAC professional. Never open the panel cover.",
      "route": "pro"
    },
    {
      "brand": "gszs6",
      "id": "c_gszs6_B0_Eb0_B9_Eb9",
      "code": "B0 / Eb0, B9 / Eb9",
      "meaning": "Indoor airflow near 0 CFM / lower than required",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "gszs6",
      "id": "c_gszs6_12_E12_17_E17_18_E18_20_30_34_40_45_47_49_50_E50_51_E51_56_E56_58_E58_",
      "code": "12 / E12, 17 / E17, 18 / E18, 20–30, 34–40, 45 / 47 / 49, 50 / E50, 51 / E51, 56 / E56, 58 / E58, 59 / E59",
      "meaning": "Memory, compressor, board, EEV, sensors, current, startup, mismatch, installer test/charge modes, comms, overload, reversing valve",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "gszs6",
      "id": "c_gszs6_52_55_57",
      "code": "52–55, 57",
      "meaning": "Minor stored faults (board “–”)",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "gszs6",
      "id": "c_gszs6_D0_Ed0_D1_Ed1",
      "code": "D0 / Ed0, D1 / Ed1",
      "meaning": "Communicating-system data missing/invalid",
      "showMeaning": true,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "gree",
      "id": "c_gree_U8_H6_H3_E1_E5_E6_E8",
      "code": "U8, H6, H3, E1, E5, E6, E8",
      "meaning": "",
      "showMeaning": false,
      "cell": "Write the code down exactly as it’s shown, or take a photo. Call a licensed HVAC professional.",
      "route": "pro"
    },
    {
      "brand": "gree",
      "id": "c_gree_C5_F0_F1_F2",
      "code": "C5, F0, F1, F2",
      "meaning": "",
      "showMeaning": false,
      "cell": "",
      "route": "pro"
    },
    {
      "brand": "gree",
      "id": "c_gree_E7",
      "code": "E7",
      "meaning": "",
      "showMeaning": false,
      "cell": "Write the code down. On a multi-zone system, Gree lists E7 as a mode conflict — every indoor unit needs the same Cool or Heat mode. Call a licensed HVAC professional if you’re not sure.",
      "route": "pro"
    },
    {
      "brand": "gree",
      "id": "c_gree_E2_E9",
      "code": "E2, E9",
      "meaning": "",
      "showMeaning": false,
      "cell": "Gree lists E2 and E9 as operational status codes, not error codes. If the unit still isn’t heating or cooling, write down what you see and call a licensed HVAC professional.",
      "route": "pro"
    },
    {
      "brand": "gree",
      "id": "c_gree_Any_other_code",
      "code": "Any other code",
      "meaning": "",
      "showMeaning": false,
      "cell": "",
      "route": "pro"
    }
  ]
};
