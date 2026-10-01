/**
 * Instrumentation, final elements, and operating envelopes.
 *
 * SYNTHETIC DATA — representative of a sour gas facility, not any real
 * plant's. Real project values load from the gitignored overlay at
 * src/plant/real/instruments.real.js when present — see ./index.js.
 *
 * Note on duplicated services: control and safeguarding are separate
 * transmitters on the same vessel. The control transmitter drives a valve;
 * the safety one is the ESD point, and where its trip sits above the
 * calibrated span that is deliberate — the trip asserts on an over-range
 * safety reading. Do not "correct" those to match.
 */

export const DUTY = { CONTROL: 'control', SAFEGUARDING: 'safeguarding', MONITORING: 'monitoring' }
export const SIL = { SIL_1: 'SIL-1', SIL_2: 'SIL-2', NONE: null }

/**
 * `envelope` drives idle simulation: normal is the setpoint, band is the
 * expected working range, noise the per-tick variation, and rate the
 * plausible rate of change on an upset (units per second).
 */
export const INSTRUMENTS = [
  // ------------------------------------------------------------ wellpads ---
  {
    tag: 'PIT-09A-01', unit: 'wellpads', service: 'Wellpad-01 Choke Upstream Pressure',
    range: [0, 690], eng: 'barg', alarms: { H: 585 }, duty: DUTY.MONITORING, sil: SIL.NONE,
  },
  {
    tag: 'PIT-09A-03', unit: 'wellpads', service: 'Wellpad-01 Choke Downstream Pressure',
    range: [0, 66], eng: 'barg',
    alarms: { L: 40, H: 55 }, trips: { LL: 36, HH: 59 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 48.5, band: [45, 55], noise: 2, rate: 5 },
  },
  {
    tag: 'XTGD-5001-001', unit: 'wellpads', service: 'Wellpad H2S Gas Detector',
    range: [0, 50], eng: 'ppm', alarms: { H: 5 }, trips: { HH: 15 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_2, voting: '2ooN',
    envelope: { normal: 2, band: [0, 4], noise: 0.5, rate: 3 },
  },

  // ----------------------------------------------------------- separator ---
  {
    tag: 'PIT-1001-01', unit: 'separator', service: 'Production Separator Pressure Control',
    range: [0, 65], eng: 'barg', setpoint: 47, alarms: { L: 40, H: 50 },
    duty: DUTY.CONTROL, sil: SIL.SIL_1, drives: 'PCV-1001-01',
    envelope: { normal: 47, band: [45, 50], noise: 0.5, rate: 2 },
  },
  {
    tag: 'PIT-1001-03', unit: 'separator', service: 'Production Separator Pressure Trip',
    range: [0, 65], eng: 'barg', trips: { HH: 55 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 47, band: [45, 50], noise: 0.5, rate: 2 },
  },
  {
    tag: 'LIT-1001-01', unit: 'separator', service: 'Production Separator Level Control',
    range: [0, 1300], eng: 'mm', setpoint: 610, alarms: { L: 457, H: 1175 },
    duty: DUTY.CONTROL, sil: SIL.SIL_1, drives: 'LCV-1001-01',
    envelope: { normal: 610, band: [550, 700], noise: 15, rate: 20 },
  },
  {
    tag: 'LIT-1001-02', unit: 'separator', service: 'Production Separator Level Trip',
    range: [0, 1300], eng: 'mm', trips: { LL: 305, HH: 1327 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    note: 'LAHH 1327mm is above the 0-1300mm span by design — over-range safety assertion',
    envelope: { normal: 610, band: [550, 700], noise: 15, rate: 20 },
  },
  {
    tag: 'TIT-1001-01', unit: 'separator', service: 'Feed Gas Cooler Outlet Temperature',
    range: [0, 120], eng: 'degC', setpoint: 60, alarms: { L: 22, H: 63 },
    duty: DUTY.CONTROL, sil: SIL.SIL_1, drives: 'TCV-1001-01',
    envelope: { normal: 60, band: [58, 63], noise: 0.4, rate: 0.008 },
  },
  {
    tag: 'TIT-1001-05', unit: 'separator', service: 'Feed Gas Cooler Outlet Temp Trip',
    range: [0, 120], eng: 'degC', trips: { HH: 66 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 60, band: [58, 63], noise: 0.4, rate: 0.008 },
  },

  // --------------------------------------------------------------- amine ---
  {
    tag: 'LIT-2201-05', unit: 'amine', service: 'Amine Absorber Level Control',
    range: [0, 1700], eng: 'mm', setpoint: 1065, alarms: { L: 710, H: 1425 },
    duty: DUTY.CONTROL, sil: SIL.SIL_1, drives: 'LCV-2201-05',
    envelope: { normal: 1065, band: [1000, 1150], noise: 20, rate: 10 },
  },
  {
    tag: 'LIT-2201-06', unit: 'amine', service: 'Amine Absorber Level Trip',
    range: [0, 1700], eng: 'mm', trips: { LL: 350, HH: 1780 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    note: 'LAHH 1780mm is above the 0-1700mm span by design — over-range safety assertion',
    envelope: { normal: 1065, band: [1000, 1150], noise: 20, rate: 10 },
  },
  {
    tag: 'PIT-2201-15', unit: 'amine', service: 'Fuel Gas Scrubber Pressure Trip',
    range: [0, 10], eng: 'barg', alarms: { L: 3 }, trips: { LL: 2, HH: 9 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 6, band: [5.5, 7], noise: 0.15, rate: 0.5 },
  },
  {
    tag: 'PIT-2201-17', unit: 'amine', service: 'Rich Amine Flash Drum Pressure Trip',
    range: [0, 10], eng: 'barg', trips: { HH: 8 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 5.5, band: [5, 6.5], noise: 0.2, rate: 0.4 },
  },
  {
    tag: 'LIT-2201-08', unit: 'amine', service: 'Rich Amine Flash Drum Level Trip',
    range: [0, 1200], eng: 'mm', trips: { HH: 1120 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 600, band: [520, 700], noise: 18, rate: 12 },
  },
  {
    tag: 'TIT-2201-05', unit: 'amine', service: 'Amine Reboiler Temperature',
    range: [50, 160], eng: 'degC', setpoint: 107, alarms: { L: 104, H: 110 },
    duty: DUTY.CONTROL, sil: SIL.NONE,
    envelope: { normal: 107, band: [104, 110], noise: 0.5, rate: 0.017 },
  },
  {
    tag: 'TIT-2201-16', unit: 'amine', service: 'Amine Regenerator Temperature Trip',
    range: [50, 160], eng: 'degC', setpoint: 107, alarms: { H: 126 }, trips: { HH: 130 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 107, band: [104, 110], noise: 0.5, rate: 0.017 },
  },
  {
    tag: 'LIT-2201-10', unit: 'amine', service: 'Amine Reboiler Level Trip',
    range: [0, 600], eng: 'mm', trips: { LL: 430 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 500, band: [460, 540], noise: 12, rate: 8 },
  },
  {
    tag: 'LIT-2201-19', unit: 'amine', service: 'Fuel Gas Scrubber Level Trip',
    range: [0, 550], eng: 'mm', trips: { HH: 500 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 250, band: [200, 320], noise: 10, rate: 10 },
  },
  {
    tag: 'LIT-2201-14', unit: 'amine', service: 'Lean Amine Surge Vessel Level Trip',
    range: [0, 1050], eng: 'mm', trips: { LL: 150 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 600, band: [540, 680], noise: 15, rate: 10 },
  },
  {
    tag: 'PIT-2201-20', unit: 'amine', service: 'Lean Amine Circulation Pump Discharge Pressure Trip',
    range: [0, 65], eng: 'barg', trips: { HH: 60 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 52, band: [50, 56], noise: 0.6, rate: 1.5 },
  },

  // --------------------------------------------------------- dehydration ---
  {
    tag: 'LIT-1101-01', unit: 'dehydration', service: 'Glycol Contactor Level Control',
    range: [0, 800], eng: 'mm', setpoint: 460, alarms: { L: 300, H: 610 },
    duty: DUTY.CONTROL, sil: SIL.SIL_1, drives: 'LCV-1101-01',
    envelope: { normal: 460, band: [400, 520], noise: 10, rate: 8 },
  },
  {
    tag: 'LIT-1101-03', unit: 'dehydration', service: 'Glycol Contactor Level Trip (HH)',
    range: [0, 800], eng: 'mm', trips: { HH: 760 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 460, band: [400, 520], noise: 10, rate: 8 },
  },
  {
    tag: 'LIT-1101-04', unit: 'dehydration', service: 'Glycol Contactor Level Trip (LL)',
    range: [0, 800], eng: 'mm', trips: { LL: 150 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 460, band: [400, 520], noise: 10, rate: 8 },
  },
  {
    tag: 'PIT-1101-01', unit: 'dehydration', service: 'TEG Flash Drum Pressure Trip',
    range: [0, 10], eng: 'barg', trips: { HH: 8 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 5.5, band: [5, 6.5], noise: 0.2, rate: 0.4 },
  },
  {
    tag: 'TIT-1101-06', unit: 'dehydration', service: 'Glycol Reboiler Temperature Trip',
    range: [160, 250], eng: 'degC', alarms: { H: 206 }, trips: { HH: 207 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 204.4, band: [195, 206], noise: 0.6, rate: 0.2 },
  },
  {
    tag: 'TIT-1101-07', unit: 'dehydration', service: 'Glycol Reboiler Temperature Control',
    range: [160, 250], eng: 'degC', setpoint: 204.4,
    duty: DUTY.CONTROL, sil: SIL.SIL_1, drives: 'TCV-1101-07',
    envelope: { normal: 204.4, band: [195, 206], noise: 0.6, rate: 0.2 },
  },
  {
    tag: 'PIT-1101-03', unit: 'dehydration', service: 'TEG Circulation Pump Discharge Pressure Trip',
    range: [0, 65], eng: 'barg', trips: { HH: 60 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 52, band: [50, 56], noise: 0.6, rate: 1.5 },
  },

  // ----------------------------------------------------------- sales gas ---
  {
    tag: 'PIT-3001-01', unit: 'salesGas', service: 'Export Gas Compressor Discharge Pressure',
    range: [0, 200], eng: 'barg', setpoint: 150, alarms: { L: 110, H: 160 },
    duty: DUTY.CONTROL, sil: SIL.SIL_1, drives: 'Compressor speed / PCV',
    envelope: { normal: 150, band: [145, 158], noise: 1.5, rate: 3 },
  },
  {
    tag: 'PIT-3001-02', unit: 'salesGas', service: 'Export Line Pressure Trip',
    range: [0, 200], eng: 'barg', trips: { LL: 100 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 150, band: [145, 158], noise: 1.5, rate: 3 },
  },

  // ------------------------------------------------------ produced water ---
  {
    tag: 'LIT-2001-01', unit: 'producedWater', service: 'PW Degasser Level Control',
    range: [0, 1450], eng: 'mm', setpoint: 695, alarms: { L: 475, H: 900 },
    duty: DUTY.CONTROL, sil: SIL.SIL_1, drives: 'LCV-2001-01',
    envelope: { normal: 695, band: [600, 800], noise: 25, rate: 15 },
  },
  {
    tag: 'LIT-2001-02', unit: 'producedWater', service: 'PW Degasser Level Trip',
    range: [0, 1450], eng: 'mm', trips: { LL: 203, HH: 1110 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 695, band: [600, 800], noise: 25, rate: 15 },
  },
  {
    tag: 'PIT-2001-01', unit: 'producedWater', service: 'PW Degasser Pressure Trip',
    range: [0, 1], eng: 'barg', alarms: { H: 0.25 }, trips: { HH: 0.5 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 0.15, band: [0.05, 0.20], noise: 0.03, rate: 0.05, noisy: true },
  },
  {
    tag: 'PIT-2001-02', unit: 'producedWater', service: 'PW Injection Line Pressure Trip',
    range: [0, 200], eng: 'barg', trips: { LL: 70, HH: 95 },
    duty: DUTY.SAFEGUARDING, sil: SIL.SIL_1,
    envelope: { normal: 85, band: [80, 92], noise: 1.2, rate: 2 },
  },
]

/** Fired-equipment skin and flange temperature trips, all ESD SIL-1. */
export const SKIN_TEMP_TRIPS = [
  { tag: 'TIT-2201-29', unit: 'amine', equipment: 'E-2201-03', service: 'Amine Reboiler Flange Temp', range: [0, 220], eng: 'degC', trips: { HH: 180 }, sil: SIL.SIL_1 },
  { tag: 'TIT-2201-02', unit: 'amine', equipment: 'E-2201-03', service: 'Amine Reboiler Skin Temp', range: [0, 220], eng: 'degC', trips: { HH: 170 }, sil: SIL.SIL_1 },
  { tag: 'TIT-2201-27', unit: 'amine', equipment: 'E-2201-03', service: 'Amine Reboiler Skin Temp', range: [0, 220], eng: 'degC', trips: { HH: 170 }, sil: SIL.SIL_1 },
  { tag: 'TIT-2201-28', unit: 'amine', equipment: 'E-2201-03', service: 'Amine Reboiler Skin Temp', range: [0, 220], eng: 'degC', trips: { HH: 170 }, sil: SIL.SIL_1 },
  { tag: 'TIT-2201-13', unit: 'amine', equipment: 'H-2201-01', service: 'Fuel Gas Heater Skin Temp', range: [0, 220], eng: 'degC', trips: { HH: 170 }, sil: SIL.SIL_1 },
  { tag: 'TIT-2201-26', unit: 'amine', equipment: 'H-2201-01', service: 'Fuel Gas Heater Skin Temp', range: [0, 220], eng: 'degC', trips: { HH: 170 }, sil: SIL.SIL_1 },
  { tag: 'TIT-2201-12', unit: 'amine', equipment: 'H-2201-01', service: 'Fuel Gas Heater Flange Temp', range: [0, 220], eng: 'degC', trips: { HH: 180 }, sil: SIL.SIL_1 },
  { tag: 'TIT-1101-11', unit: 'dehydration', equipment: 'H-1101-01', service: 'Glycol Heater Skin Temp', range: [0, 300], eng: 'degC', trips: { HH: 300 }, sil: SIL.SIL_1 },
  { tag: 'TIT-1101-14', unit: 'dehydration', equipment: 'H-1101-01', service: 'Glycol Heater Flange Temp', range: [0, 220], eng: 'degC', trips: { HH: 180 }, sil: SIL.SIL_1 },
]

/**
 * Flame detectors. 4-20mA optical: 4mA healthy, 18mA flame, <3.8mA fault.
 * Fault below the live zero is what distinguishes a dead detector from a
 * healthy one reading no flame.
 */
export const FLAME_DETECTORS = {
  tags: ['XFD-5000-021', 'XFD-5000-022'],
  signal: '4-20mA optical',
  range: [4, 20], eng: 'mA',
  healthy: 4, trips: { HH: 18 }, faultBelow: 3.8,
  sil: SIL.SIL_2, voting: '2ooN',
}

/** Final elements: fail state and normal operating position. */
export const VALVE_TYPE = { SDV: 'SDV', BDV: 'BDV', CONTROL: 'control' }

export const FINAL_ELEMENTS = [
  { tag: 'SDV-1001-01', type: VALVE_TYPE.SDV, unit: 'separator', service: 'Production Separator Inlet SDV', line: '8" sour gas from wellpads', failState: 'FC', normal: 'OPEN', isolates: 'raw feed gas entering V-1001-01' },
  { tag: 'SDV-1001-02', type: VALVE_TYPE.SDV, unit: 'separator', service: 'Separator Liquid Outlet SDV', line: 'liquid outlet', failState: 'FC', normal: 'OPEN', isolates: 'water/condensate to treatment' },
  { tag: 'SDV-1001-03', type: VALVE_TYPE.SDV, unit: 'separator', service: 'Production Separator Gas Outlet SDV', line: 'gas outlet', failState: 'FC', normal: 'OPEN', isolates: 'feed gas to coolers', note: 'Resolves the C&E Effect 8 tag typo — was listed as SDV-1001-04' },
  { tag: 'SDV-1001-04', type: VALVE_TYPE.SDV, unit: 'wellpads', service: 'Wellpad-02 Trunkline SDV', line: '12" pipeline from WP-02', failState: 'FC', normal: 'OPEN', isolates: 'WP-02 feed' },
  { tag: 'SDV-1001-05', type: VALVE_TYPE.SDV, unit: 'wellpads', service: 'Wellpad-03 Pipeline SDV', line: 'pipeline from WP-03', failState: 'FC', normal: 'OPEN', isolates: 'WP-03 feed' },
  { tag: 'BDV-1001-01', type: VALVE_TYPE.BDV, unit: 'separator', service: 'Separator Blowdown Valve', line: '6" to HP flare V-6001-02', failState: 'FO', normal: 'CLOSED', isolates: 'depressurizes V-1001-01' },
  { tag: 'SDV-1101-01', type: VALVE_TYPE.SDV, unit: 'dehydration', service: 'Rich TEG Outlet SDV', line: 'rich TEG C-1101-01 to V-1101-02', failState: 'FC', normal: 'OPEN', isolates: 'rich TEG to flash drum' },
  { tag: 'SDV-1101-02', type: VALVE_TYPE.SDV, unit: 'dehydration', service: 'Glycol Contactor Gas Inlet/Outlet SDV', line: 'gas across dehydration', failState: 'FC', normal: 'OPEN', isolates: 'sweet gas across the unit' },
  { tag: 'SDV-1101-03', type: VALVE_TYPE.SDV, unit: 'dehydration', service: 'Stripping Gas SDV', line: 'stripping gas to reboiler', failState: 'FC', normal: 'OPEN', isolates: 'stripping gas to E-1101-04' },
  { tag: 'SDV-1101-06', type: VALVE_TYPE.SDV, unit: 'dehydration', service: 'Flash Drum Rich TEG Outlet SDV', line: 'V-1101-02 to reboiler', failState: 'FC', normal: 'OPEN', isolates: 'rich TEG to regeneration' },
  { tag: 'BDV-1101-05', type: VALVE_TYPE.BDV, unit: 'dehydration', service: 'Gas/Glycol Exchanger Outlet BDV', line: 'to HP flare', failState: 'FO', normal: 'CLOSED', isolates: 'depressurizes dehydration unit' },
  { tag: 'SDV-2001-01', type: VALVE_TYPE.SDV, unit: 'producedWater', service: 'PW Injection Outlet SDV', line: '6" to disposal well DW-01', failState: 'FC', normal: 'OPEN', isolates: 'disposal line on PIT-2001-02 > 95 barg' },
  { tag: 'SDV-3001-01', type: VALVE_TYPE.SDV, unit: 'salesGas', service: 'Export Gas Line Inlet SDV', line: 'sales gas to export station', failState: 'FC', normal: 'OPEN', isolates: 'plant from export pipeline' },
  { tag: 'BDV-3001-02', type: VALVE_TYPE.BDV, unit: 'salesGas', service: 'Export Compressor BDV', line: 'to HP flare', failState: 'FO', normal: 'CLOSED', isolates: 'depressurizes U-3001-01' },

  { tag: 'PCV-1001-01', type: VALVE_TYPE.CONTROL, unit: 'separator', service: 'Separator Pressure Control', drivenBy: 'PIT-1001-01', setpoint: 47, eng: 'barg', normal: 'MODULATING' },
  { tag: 'LCV-1001-01', type: VALVE_TYPE.CONTROL, unit: 'separator', service: 'Separator Level Control', drivenBy: 'LIT-1001-01', setpoint: 610, eng: 'mm', normal: 'MODULATING' },
  { tag: 'TCV-1001-01', type: VALVE_TYPE.CONTROL, unit: 'separator', service: 'Feed Gas Cooler Temp Control', drivenBy: 'TIT-1001-01', setpoint: 60, eng: 'degC', normal: 'MODULATING' },
  { tag: 'LCV-2201-05', type: VALVE_TYPE.CONTROL, unit: 'amine', service: 'Amine Absorber Level Control', drivenBy: 'LIT-2201-05', setpoint: 1065, eng: 'mm', normal: 'MODULATING' },
  { tag: 'LCV-1101-01', type: VALVE_TYPE.CONTROL, unit: 'dehydration', service: 'Glycol Contactor Level Control', drivenBy: 'LIT-1101-01', setpoint: 460, eng: 'mm', normal: 'MODULATING' },
  { tag: 'TCV-1101-07', type: VALVE_TYPE.CONTROL, unit: 'dehydration', service: 'Glycol Reboiler Temp Control', drivenBy: 'TIT-1101-07', setpoint: 204.4, eng: 'degC', normal: 'MODULATING' },
  { tag: 'LCV-2001-01', type: VALVE_TYPE.CONTROL, unit: 'producedWater', service: 'PW Degasser Level Control', drivenBy: 'LIT-2001-01', setpoint: 695, eng: 'mm', normal: 'MODULATING' },
]

/** Duty/standby rotating equipment. Normal state is one running. */
export const ROTATING_EQUIPMENT = [
  { pair: ['PM-2001-01A', 'PM-2001-01B'], unit: 'producedWater', service: 'PW Booster Pumps', flow: 43.72, flowUnit: 'm3/hr', moves: 'degassed water through PW filters' },
  { pair: ['PM-2001-02A', 'PM-2001-02B'], unit: 'producedWater', service: 'PW Injection Pumps', press: 200, pressUnit: 'barg', moves: 'filtered water to disposal well DW-01' },
  { pair: ['P-1101-01A', 'P-1101-01B'], unit: 'dehydration', service: 'TEG Circulation Pumps', flow: 3.3, flowUnit: 'm3/hr', press: 60, pressUnit: 'barg', moves: 'lean TEG from V-1101-03 to contactor' },
  { pair: ['P-2201-03A', 'P-2201-03B'], unit: 'amine', service: 'Amine Booster Pumps', flow: 7.0, flowUnit: 'm3/hr', moves: 'lean amine from surge vessel through filters' },
  { pair: ['P-2201-01A', 'P-2201-01B'], unit: 'amine', service: 'Amine Circulation Pumps', flow: 6.0, flowUnit: 'm3/hr', press: 62, pressUnit: 'barg', moves: 'lean amine to absorber top' },
  { pair: ['P-2201-02A', 'P-2201-02B'], unit: 'amine', service: 'Amine Reflux Pumps', flow: 3.0, flowUnit: 'm3/hr', moves: 'condensate from reflux drum to regenerator' },
]

export const AIR_COOLERS = [
  { tag: 'E-1001-01', fans: ['FM-1001-01A', 'FM-1001-01B'], unit: 'separator', service: 'Feed Gas Air Cooler', cools: 'feed gas ~120degC to 60degC before amine' },
  { tag: 'E-1001-02', fans: ['FM-1001-02A', 'FM-1001-02B'], unit: 'producedWater', service: 'Produced Water Air Cooler', cools: 'separator water to ~62degC before degasser' },
  { tag: 'E-2201-01', fans: [], unit: 'amine', service: 'Lean Amine Air Cooler', cools: 'regenerated lean amine to 40-50degC' },
]

/** Mechanical stroke times, per FDS. Applied when actuating an effect. */
export const STROKE_TIMES_MS = { SDV: 4000, BDV: 2500, control: 1500 }
