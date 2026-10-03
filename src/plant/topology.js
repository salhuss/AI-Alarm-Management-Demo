/**
 * Process topology — equipment and stream connections per stage.
 *
 * SYNTHETIC DATA. Representative of a sour gas processing facility but not
 * any real plant's. Real project values load from the gitignored overlay at
 * src/plant/real/topology.real.js when present — see ./index.js.
 *
 * `EQUIPMENT` gives the PFD's nodes, `STREAMS` its edges. Recycle legs are
 * flagged so circulation loops can be drawn as return paths and collapsed
 * to an indicator on the landing page.
 */

export const EQUIPMENT_TYPE = {
  WELL: 'well',
  VESSEL: 'vessel',
  COLUMN: 'column',
  EXCHANGER: 'exchanger',
  AIR_COOLER: 'airCooler',
  FIRED_HEATER: 'firedHeater',
  PUMP: 'pump',
  COMPRESSOR: 'compressor',
  FILTER: 'filter',
  TANK: 'tank',
  PIG: 'pig',
  METER: 'meter',
  FLARE: 'flare',
}

const T = EQUIPMENT_TYPE

export const EQUIPMENT = {
  wellpads: [
    { tag: 'GW-01', name: 'Well GW-01', type: T.WELL, pad: 'WP-01', flow: [0, 22], flowUnit: 'MMSCFD' },
    { tag: 'GW-02', name: 'Well GW-02', type: T.WELL, pad: 'WP-02', flow: [0, 22], flowUnit: 'MMSCFD' },
    { tag: 'GW-03', name: 'Well GW-03', type: T.WELL, pad: 'WP-03', flow: [0, 22], flowUnit: 'MMSCFD' },
    { tag: 'V-6001-01', name: 'Wellpad Flare KO Drum', type: T.VESSEL, level: [0, 1810], levelUnit: 'mm' },
    { tag: 'LP-3901-02', name: 'Mobile Pig Launcher (WP-02)', type: T.PIG },
  ],

  separator: [
    { tag: 'LP-3901-03', name: 'Mobile Pig Receiver', type: T.PIG },
    {
      tag: 'V-1001-01', name: 'Production Separator', type: T.VESSEL,
      detail: '3-Phase Horizontal', primary: true,
      level: [0, 1300], levelUnit: 'mm', press: [0, 65], pressUnit: 'barg',
      throughput: '0-30 MMSCFD gas, 0-7000 BWPD water',
    },
    { tag: 'E-1001-01', name: 'Feed Gas Air Cooler', type: T.AIR_COOLER, fans: ['FM-1001-01A', 'FM-1001-01B'], temp: [0, 120], tempUnit: 'degC' },
    { tag: 'E-1001-02', name: 'Produced Water Air Cooler', type: T.AIR_COOLER, fans: ['FM-1001-02A', 'FM-1001-02B'] },
  ],

  amine: [
    {
      tag: 'C-2201-01', name: 'Amine Absorber / Contactor', type: T.COLUMN,
      detail: 'Trayed / Packed', primary: true,
      level: [0, 1700], levelUnit: 'mm',
    },
    // The contactor is the only equipment modelled in this unit. The
    // regeneration side (flash drum, regenerator, reboiler, surge vessel,
    // filters and the circulation pumps) is intentionally out of scope: the
    // demo shows sour gas in, sweet gas out, amine circulating.
  ],

  dehydration: [
    {
      tag: 'C-1101-01', name: 'Glycol Contactor', type: T.COLUMN,
      detail: 'Column with integral inlet scrubber', primary: true,
      level: [0, 800], levelUnit: 'mm',
    },
    // The contactor is the only equipment modelled in this unit. The
    // regeneration side (gas/glycol exchanger, flash drum, reboiler, reflux
    // condenser, glycol heater, surge vessel and circulation pumps) is
    // intentionally out of scope: the demo shows wet gas in, dry gas out,
    // glycol circulating.
  ],


  salesGas: [
    {
      tag: 'U-3001-01', name: 'Export Gas Compressor Package', type: T.COMPRESSOR,
      detail: 'Reciprocating / Screw', primary: true,
      press: [0, 200], pressUnit: 'barg',
    },
    { tag: 'U-3001-02', name: 'Export Gas Metering Package', type: T.METER, detail: 'Custody transfer skid' },
    // Compressor and metering skid only. The pig launcher is
    // maintenance equipment outside the gas path, and the export
    // pipeline is a boundary rather than equipment.
  ],


  producedWater: [
    { tag: 'V-2001-01', name: 'Produced Water Degasser', type: T.VESSEL, primary: true, level: [0, 1450], levelUnit: 'mm', press: [0, 1], pressUnit: 'barg' },
    { tag: 'PM-2001-01A', name: 'PW Booster Pump A', type: T.PUMP, duty: 'duty', pair: 'PM-2001-01B', flow: [0, 43.72], flowUnit: 'm3/hr' },
    { tag: 'PM-2001-01B', name: 'PW Booster Pump B', type: T.PUMP, duty: 'standby', pair: 'PM-2001-01A', flow: [0, 43.72], flowUnit: 'm3/hr' },
    { tag: 'S-2001-01A', name: 'PW Filter A', type: T.FILTER, detail: 'Coalescing / media' },
    { tag: 'S-2001-01B', name: 'PW Filter B', type: T.FILTER, detail: 'Coalescing / media' },
    { tag: 'PM-2001-02A', name: 'PW Injection Pump A', type: T.PUMP, duty: 'duty', pair: 'PM-2001-02B', press: [0, 200], pressUnit: 'barg' },
    { tag: 'PM-2001-02B', name: 'PW Injection Pump B', type: T.PUMP, duty: 'standby', pair: 'PM-2001-02A', press: [0, 200], pressUnit: 'barg' },
    { tag: 'DW-01', name: 'Disposal Well DW-01 (WP-03)', type: T.WELL, press: [0, 101], pressUnit: 'barg' },
  ],
}

export const PHASE = {
  SOUR_GAS: 'sourGas',
  SWEET_GAS: 'sweetGas',
  DRY_GAS: 'dryGas',
  FUEL_GAS: 'fuelGas',
  STRIPPING_GAS: 'strippingGas',
  FLASH_GAS: 'flashGas',
  RICH_AMINE: 'richAmine',
  LEAN_AMINE: 'leanAmine',
  RICH_TEG: 'richTeg',
  LEAN_TEG: 'leanTeg',
  PRODUCED_WATER: 'producedWater',
  CONDENSATE: 'condensate',
  FLARE: 'flare',
}

export const STREAMS = [
  { from: 'GW-01', to: 'LP-3901-03', phase: PHASE.SOUR_GAS, label: 'Raw sour gas WP-01' },
  { from: 'GW-02', to: 'LP-3901-03', phase: PHASE.SOUR_GAS, label: 'Raw sour gas WP-02', via: 'SDV-1001-04' },
  { from: 'GW-03', to: 'LP-3901-03', phase: PHASE.SOUR_GAS, label: 'Raw sour gas WP-03', via: 'SDV-1001-05' },
  { from: 'LP-3901-03', to: 'V-1001-01', phase: PHASE.SOUR_GAS, label: 'Sour gas to separator', via: 'SDV-1001-01' },

  { from: 'V-1001-01', to: 'E-1001-01', phase: PHASE.SOUR_GAS, label: 'Sour gas overhead', via: 'SDV-1001-03' },
  { from: 'V-1001-01', to: 'E-1001-02', phase: PHASE.PRODUCED_WATER, label: 'Water boot outlet', via: 'SDV-1001-02' },
  { from: 'V-1001-01', to: 'FLARE-HP', phase: PHASE.FLARE, label: 'Blowdown', via: 'BDV-1001-01' },

  { from: 'E-1001-01', to: 'C-2201-01', phase: PHASE.SOUR_GAS, label: 'Cooled sour gas to contactor bottom' },
  { from: 'C-2201-01', to: 'C-1101-01', phase: PHASE.SWEET_GAS, label: 'Sweet gas to dehydration', via: 'SDV-1101-02' },
  { from: 'C-1101-01', to: 'U-3001-01', phase: PHASE.DRY_GAS, label: 'Dry gas to compression' },
  { from: 'U-3001-01', to: 'U-3001-02', phase: PHASE.DRY_GAS, label: 'Compressed export gas' },
  { from: 'U-3001-02', to: 'SALES-GAS-PIPELINE', phase: PHASE.DRY_GAS, label: 'Sales gas to export pipeline', via: 'SDV-3001-01' },

  { from: 'FUEL-GAS-HEADER', to: 'U-3001-01', phase: PHASE.FUEL_GAS, label: 'Fuel gas to compressor', utility: true },

  { from: 'C-2201-01', to: 'AMINE-REGEN', phase: PHASE.RICH_AMINE, label: 'Rich amine to regeneration', via: 'LCV-2201-05' },
  { from: 'AMINE-REGEN', to: 'C-2201-01', phase: PHASE.LEAN_AMINE, label: 'Lean amine to contactor top', recycle: true },

  { from: 'C-1101-01', to: 'TEG-REGEN', phase: PHASE.RICH_TEG, label: 'Rich TEG to regeneration', via: 'SDV-1101-01' },
  { from: 'TEG-REGEN', to: 'C-1101-01', phase: PHASE.LEAN_TEG, label: 'Lean TEG to contactor top', recycle: true },

  { from: 'E-1001-02', to: 'V-2001-01', phase: PHASE.PRODUCED_WATER, label: 'Cooled produced water to degasser' },
  { from: 'V-2001-01', to: 'FLARE-LP', phase: PHASE.FLARE, label: 'Degasser off-gas to LP flare' },
  { from: 'V-2001-01', to: 'PM-2001-01A', phase: PHASE.PRODUCED_WATER, label: 'Degassed water to booster pumps', via: 'LCV-2001-01' },
  { from: 'PM-2001-01A', to: 'S-2001-01A', phase: PHASE.PRODUCED_WATER, label: 'Boosted water to filters' },
  { from: 'S-2001-01A', to: 'PM-2001-02A', phase: PHASE.PRODUCED_WATER, label: 'Filtered water to injection pumps' },
  { from: 'PM-2001-02A', to: 'DW-01', phase: PHASE.PRODUCED_WATER, label: 'Injection to disposal well', via: 'SDV-2001-01' },

  { from: 'U-3001-01', to: 'FLARE-HP', phase: PHASE.FLARE, label: 'Compressor blowdown', via: 'BDV-3001-02' },
]

export const BOUNDARY_NODES = {
  'FLARE-HP': { name: 'HP Flare Header', detail: 'to HP flare KO drum and flare package' },
  'FLARE-LP': { name: 'LP Flare Header', detail: 'to LP flare KO drum and flare package' },
  'FUEL-GAS-HEADER': { name: 'Fuel Gas Header', detail: 'power generation, compression, TEG stripping gas' },
  'U-3801-01': { name: 'Vapour Recovery Unit', detail: 'flash gas and regenerator vents' },
  'SALES-GAS-PIPELINE': { name: 'Export Pipeline', detail: '6" line to the gas export station' },
  'TEG-REGEN': { name: 'TEG Regeneration', detail: 'flash drum, reboiler, surge vessel and circulation pumps — out of scope' },
  'AMINE-REGEN': { name: 'Amine Regeneration', detail: 'flash drum, regenerator, reboiler, surge vessel and circulation pumps — out of scope' },
  'EXPORT-PIPELINE': { name: 'Export Pipeline', detail: '6" to export station' },
}
