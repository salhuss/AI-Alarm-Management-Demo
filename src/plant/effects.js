/**
 * Primary Effects (Output Actions) — ESD Cause & Effect Matrix
 *
 * SYNTHETIC DATA. Tags, descriptions and unit assignments here are
 * representative of a sour gas processing facility but are not any real
 * plant's. The structure mirrors a standard C&E matrix so the demo behaves
 * realistically without publishing project-confidential data.
 *
 * Real project values, when available, are loaded from the gitignored
 * overlay at src/plant/real/effects.real.js — see ./index.js.
 *
 * Numbering (1-30) and the four executive actions follow normal C&E
 * convention: each numbered effect is one output action on one target.
 */

export const EXECUTIVE_ACTION = {
  ACTIVATE: 'Activate',
  CLOSE: 'Close',
  OPEN: 'Open',
  TRIP: 'Trip',
}

export const EFFECTS = {
  // --- Wellpads: isolate the sources ---------------------------------------
  1: { tag: 'Wellpad-01', description: 'ESD 2 for Wellpad-01', action: EXECUTIVE_ACTION.ACTIVATE, unit: 'wellpads' },
  2: { tag: 'Wellpad-02', description: 'ESD 2 for Wellpad-02', action: EXECUTIVE_ACTION.ACTIVATE, unit: 'wellpads' },
  3: { tag: 'Wellpad-03', description: 'ESD 2 for Wellpad-03', action: EXECUTIVE_ACTION.ACTIVATE, unit: 'wellpads' },
  4: { tag: 'Export Tie-In', description: 'ESD for Export Receiver Tie-In Station', action: EXECUTIVE_ACTION.ACTIVATE, unit: 'salesGas' },
  5: { tag: 'SDV-1001-04', description: 'SDV at Wellpad-02 to Plant Pipeline', action: EXECUTIVE_ACTION.CLOSE, unit: 'wellpads' },
  6: { tag: 'SDV-1001-05', description: 'SDV at Wellpad-03 to Plant Pipeline', action: EXECUTIVE_ACTION.CLOSE, unit: 'wellpads' },

  // --- Production separator ------------------------------------------------
  7: { tag: 'SDV-1001-01', description: 'Production Separator Inlet SDV', action: EXECUTIVE_ACTION.CLOSE, unit: 'separator' },
  8: { tag: 'SDV-1001-06', description: 'Production Separator Gas Outlet SDV', action: EXECUTIVE_ACTION.CLOSE, unit: 'separator' },
  9: { tag: 'BDV-1001-01', description: 'Production Separator Outlet Blowdown Valve', action: EXECUTIVE_ACTION.OPEN, unit: 'separator' },
  10: { tag: 'SDV-1001-02', description: 'Production Separator Liquid Outlet SDV', action: EXECUTIVE_ACTION.CLOSE, unit: 'separator' },
  11: { tag: 'FM-1001-01A', description: 'Feed Gas Air Cooler Fan A', action: EXECUTIVE_ACTION.TRIP, unit: 'separator' },
  12: { tag: 'FM-1001-01B', description: 'Feed Gas Air Cooler Fan B', action: EXECUTIVE_ACTION.TRIP, unit: 'separator' },

  // --- Produced water ------------------------------------------------------
  13: { tag: 'FM-1001-02A', description: 'Produced Water Air Cooler Fan A', action: EXECUTIVE_ACTION.TRIP, unit: 'producedWater' },
  14: { tag: 'FM-1001-02B', description: 'Produced Water Air Cooler Fan B', action: EXECUTIVE_ACTION.TRIP, unit: 'producedWater' },
  15: { tag: 'PM-2001-01A', description: 'Produced Water Booster Pump A', action: EXECUTIVE_ACTION.TRIP, unit: 'producedWater' },
  16: { tag: 'PM-2001-01B', description: 'Produced Water Booster Pump B', action: EXECUTIVE_ACTION.TRIP, unit: 'producedWater' },
  17: { tag: 'PM-2001-02A', description: 'Produced Water Injection Pump A', action: EXECUTIVE_ACTION.TRIP, unit: 'producedWater' },
  18: { tag: 'PM-2001-02B', description: 'Produced Water Injection Pump B', action: EXECUTIVE_ACTION.TRIP, unit: 'producedWater' },
  19: { tag: 'SDV-2001-01', description: 'Produced Water Injection Pumps Outlet SDV', action: EXECUTIVE_ACTION.CLOSE, unit: 'producedWater' },

  // --- Gas dehydration (TEG) ----------------------------------------------
  20: { tag: 'SDV-1101-01', description: 'Glycol Contactor Rich TEG Outlet SDV', action: EXECUTIVE_ACTION.CLOSE, unit: 'dehydration' },
  21: { tag: 'SDV-1101-02', description: 'Glycol Contactor Inlet/Outlet SDV', action: EXECUTIVE_ACTION.CLOSE, unit: 'dehydration' },
  22: { tag: 'BDV-1101-05', description: 'Gas/Glycol Exchanger Outlet BDV', action: EXECUTIVE_ACTION.OPEN, unit: 'dehydration' },
  26: { tag: 'SDV-1101-06', description: 'Flash Drum Rich TEG Outlet SDV', action: EXECUTIVE_ACTION.CLOSE, unit: 'dehydration' },
  27: { tag: 'SDV-1101-03', description: 'Stripping Gas SDV', action: EXECUTIVE_ACTION.CLOSE, unit: 'dehydration' },
  28: { tag: 'H-1101-01', description: 'Glycol Heater Power Cutoff', action: EXECUTIVE_ACTION.TRIP, unit: 'dehydration' },
  29: { tag: 'PM-1101-01A', description: 'TEG Circulation Pump A', action: EXECUTIVE_ACTION.TRIP, unit: 'dehydration' },
  30: { tag: 'PM-1101-01B', description: 'TEG Circulation Pump B', action: EXECUTIVE_ACTION.TRIP, unit: 'dehydration' },

  // --- Sales / export gas --------------------------------------------------
  23: { tag: 'U-3001-01', description: 'Export Gas Compressor Package', action: EXECUTIVE_ACTION.TRIP, unit: 'salesGas' },
  24: { tag: 'BDV-3001-02', description: 'Export Gas Compressor Outlet BDV', action: EXECUTIVE_ACTION.OPEN, unit: 'salesGas' },
  25: { tag: 'SDV-3001-01', description: 'Export Gas Pipeline Inlet SDV at Plant', action: EXECUTIVE_ACTION.CLOSE, unit: 'salesGas' },
}

/** All 30 effect numbers, for the full-ESD initiators. */
export const ALL_EFFECTS = Object.keys(EFFECTS)
  .map(Number)
  .sort((a, b) => a - b)

/**
 * Effects grouped by unit, in effect-number order. Drives the staged
 * cascade animation: units actuate in train order, effects within a unit
 * actuate together.
 */
export const effectsByUnit = (effectNumbers) => {
  const grouped = {}
  for (const n of effectNumbers) {
    const effect = EFFECTS[n]
    if (!effect) continue
    if (!grouped[effect.unit]) grouped[effect.unit] = []
    grouped[effect.unit].push(n)
  }
  return grouped
}
