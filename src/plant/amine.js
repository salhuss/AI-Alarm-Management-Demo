/**
 * Amine & Fuel Gas Sweetening — unit-level ESD trips
 *
 * SYNTHETIC DATA — see the note in ./effects.js. Tags and setpoints are
 * representative of a typical amine sweetening train, not any real
 * facility's. Real project values load from the gitignored
 * src/plant/real/amine.real.js when present.
 *
 * ARCHITECTURAL NOTE (this part is real, and matters):
 * Amine sweetening is deliberately NOT a plant-wide primary initiator. A
 * top-level C&E overview typically lists only the production separator,
 * flare KO drums, instrument air header and main pipelines as ESD-1/2/3
 * triggers. Amine safeguarding is instead a set of SIL-1 rated unit-level
 * ESD trip functions, captured here.
 *
 * Consequence for the simulation: these initiators trip their own equipment
 * and disturb the downstream train, but they do NOT actuate Effects 1-30.
 * The one path by which the sweetening area does reach a full plant
 * shutdown is its fire & gas detection, which votes 2ooN into the
 * plant-wide XTGA/XGA/XFA initiators — see AMINE_FGS_ZONE below.
 */

export const SIL = { SIL_1: 'SIL-1', SIL_2: 'SIL-2' }

/** Equipment in the sweetening unit, for grouping trips on the HMI. */
export const AMINE_EQUIPMENT = {
  'C-2201-01': 'Amine Absorber',
  'V-2201-02': 'Rich Amine Flash Drum',
  'C-2201-02': 'Amine Regenerator',
  'E-2201-03': 'Amine Reboiler',
  'V-2201-01': 'Fuel Gas Scrubber',
  'H-2201-01': 'Fuel Gas Heater',
  'V-2201-04': 'Lean Amine Surge Vessel',
}

/**
 * Unit-level ESD trip functions. `direction` is HH or LL; `unit` here means
 * engineering unit, not plant unit.
 */
export const AMINE_TRIPS = [
  { tag: 'LIT-2201-06', equipment: 'C-2201-01', service: 'Amine Absorber Level High-High', setpoint: 1780, unit: 'mm', direction: 'HH', sil: SIL.SIL_1 },

  { tag: 'PIT-2201-17', equipment: 'V-2201-02', service: 'Rich Amine Flash Drum Pressure High-High', setpoint: 8, unit: 'barg', direction: 'HH', sil: SIL.SIL_1 },
  { tag: 'LIT-2201-08', equipment: 'V-2201-02', service: 'Rich Amine Flash Drum Level High-High', setpoint: 1120, unit: 'mm', direction: 'HH', sil: SIL.SIL_1 },

  { tag: 'TIT-2201-16', equipment: 'C-2201-02', service: 'Amine Regenerator Temperature High-High', setpoint: 130, unit: 'degC', direction: 'HH', sil: SIL.SIL_1 },
  { tag: 'LIT-2201-10', equipment: 'E-2201-03', service: 'Reboiler Level Low-Low', setpoint: 430, unit: 'mm', direction: 'LL', sil: SIL.SIL_1 },

  { tag: 'PIT-2201-15', equipment: 'V-2201-01', service: 'Fuel Gas Scrubber Pressure High-High', setpoint: 9, unit: 'barg', direction: 'HH', sil: SIL.SIL_1 },
  { tag: 'LIT-2201-19', equipment: 'V-2201-01', service: 'Fuel Gas Scrubber Level High-High', setpoint: 500, unit: 'mm', direction: 'HH', sil: SIL.SIL_1 },

  { tag: 'LIT-2201-14', equipment: 'V-2201-04', service: 'Lean Amine Surge Vessel Level Low-Low', setpoint: 150, unit: 'mm', direction: 'LL', sil: SIL.SIL_1 },
  { tag: 'PIT-2201-20', equipment: 'V-2201-04', service: 'Lean Amine Circulation Pump Discharge Pressure High-High', setpoint: 60, unit: 'barg', direction: 'HH', sil: SIL.SIL_1 },
]

/**
 * Skin & flange high-high temperature trips on the fired equipment.
 * Modelled as present-but-unvalued: the HMI shows them as trip functions
 * without a numeric threshold, since inventing skin temperature setpoints
 * would misrepresent how these are actually set.
 */
export const AMINE_SKIN_TEMP_TRIPS = [
  { tags: ['TIT-2201-02', 'TIT-2201-27', 'TIT-2201-28', 'TIT-2201-29'], equipment: 'E-2201-03', service: 'Reboiler Skin & Flange Temperature High-High', sil: SIL.SIL_1, setpoint: null },
  { tags: ['TIT-2201-12', 'TIT-2201-13', 'TIT-2201-20', 'TIT-2201-26'], equipment: 'H-2201-01', service: 'Fuel Gas Heater Skin & Flange Temperature High-High', sil: SIL.SIL_1, setpoint: null },
]

/**
 * Fire & Gas detection covering the sweetening unit area, SIL-2 rated.
 *
 * `votesInto` is the important field: these field detectors raise the
 * plant-wide confirmed-gas/fire initiators on a 2ooN vote. So a release in
 * the sweetening area DOES reach the full 30-effect shutdown — by the FGS
 * voting chain, not as an amine unit trip. That distinction is what the AI
 * root-cause analysis demonstrates.
 */
export const AMINE_FGS_ZONE = {
  zone: 'FZ01_SZ01',
  area: 'Fuel Gas Sweetening Unit',
  sil: SIL.SIL_2,
  detectors: [
    { tags: ['XFD-5000-021', 'XFD-5000-022'], type: 'Flame', tripAt: null, unit: null, votesInto: 'XFA-5001-01' },
    { tags: ['XGD-5000-022', 'XGD-5000-023', 'XGD-5000-024', 'XGD-5000-025'], type: 'Flammable Gas', tripAt: 50, unit: '% LEL', votesInto: 'XGA-5001-01' },
    { tags: ['XTGD-5000-027', 'XTGD-5000-028', 'XTGD-5000-029', 'XTGD-5000-030'], type: 'Toxic H2S', tripAt: 15, unit: 'ppm', votesInto: 'XTGA-5001-01' },
  ],
}
