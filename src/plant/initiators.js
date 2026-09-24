/**
 * Primary Causes (Initiators) and Cause-to-Effect Interlock Mapping
 *
 * SYNTHETIC DATA — see the note in ./effects.js. Tags and setpoints are
 * representative, not any real facility's. Real project values load from
 * the gitignored src/plant/real/initiators.real.js when present.
 *
 * Three ESD levels, following normal practice:
 *   ESD-1  total facility shutdown — manual, or confirmed fire/gas
 *   ESD-2  major utility or pipeline failure
 *   ESD-3  selective unit trips
 *
 * Unit-level trips for the sweetening unit live in ./amine.js and
 * deliberately do not appear here: sweetening is not a plant-wide initiator.
 */

import { ALL_EFFECTS } from './effects.js'

export const ESD_LEVEL = { ESD_1: 'ESD-1', ESD_2: 'ESD-2', ESD_3: 'ESD-3' }

/** `effects` lists the effect numbers each initiator actuates. */
export const INITIATORS = [
  // --- ESD-1: total facility shutdown --------------------------------------
  {
    tag: 'HS-5001-01', level: ESD_LEVEL.ESD_1,
    description: 'ESD 1 Through Plant Control Room Push Button',
    voting: 'Manual', effects: ALL_EFFECTS, totalShutdown: true,
  },
  {
    tag: 'XTGA-5001-01', level: ESD_LEVEL.ESD_1,
    description: 'Confirmed H2S Gas at Plant Area',
    voting: '2ooN', effects: ALL_EFFECTS, totalShutdown: true,
  },
  {
    tag: 'XGA-5001-01', level: ESD_LEVEL.ESD_1,
    description: 'Confirmed Flammable Gas at Plant Area',
    voting: '2ooN', effects: ALL_EFFECTS, totalShutdown: true,
  },
  {
    tag: 'XFA-5001-01', level: ESD_LEVEL.ESD_1,
    description: 'Confirmed Fire at Plant Area',
    voting: '2ooN', effects: ALL_EFFECTS, totalShutdown: true,
  },

  // --- ESD-2: utility and pipeline failures --------------------------------
  {
    tag: 'HS-5001-02', level: ESD_LEVEL.ESD_2,
    description: 'ESD 2 Through Plant Control Room Push Button',
    voting: 'Manual', effects: ALL_EFFECTS, totalShutdown: true,
  },
  {
    tag: 'LAHH-6001-05A', level: ESD_LEVEL.ESD_2,
    description: 'Level High-High at HP Flare KO Drum',
    voting: 'LAHH', effects: ALL_EFFECTS, totalShutdown: true,
  },
  {
    tag: 'LAHH-6001-06A', level: ESD_LEVEL.ESD_2,
    description: 'Level High-High at LP Flare KO Drum',
    voting: 'LAHH', effects: ALL_EFFECTS, totalShutdown: true,
  },
  {
    tag: 'PALL-6101-02', level: ESD_LEVEL.ESD_2,
    description: 'Pressure Low-Low at Discharge Header of Instrument Air',
    voting: 'PALL', effects: ALL_EFFECTS, totalShutdown: true,
  },
  {
    tag: 'PALL-3901-01', level: ESD_LEVEL.ESD_2,
    description: 'Pressure Low-Low at WP-02 to Plant Pipeline',
    voting: 'PALL', effects: [1, 2, 5],
  },
  {
    tag: 'PALL-3001-02', level: ESD_LEVEL.ESD_2,
    description: 'Pressure Low-Low at Export Gas Pipeline',
    voting: 'PALL', effects: [4, 23, 25],
  },

  // --- ESD-3: selective unit trips -----------------------------------------
  {
    tag: 'HS-5001-03', level: ESD_LEVEL.ESD_3,
    description: 'ESD From Export Receiver Tie-In Station',
    voting: 'Manual', effects: [23, 25],
  },
  {
    tag: 'PAHH-1001-03', level: ESD_LEVEL.ESD_3,
    description: 'Pressure High-High at Production Separator (V-1001-01)',
    voting: 'PAHH', effects: [7, 8],
  },
  {
    tag: 'LAHH-1001-02', level: ESD_LEVEL.ESD_3,
    description: 'Level High-High at Production Separator (V-1001-01)',
    voting: 'LAHH', effects: [7],
  },
  {
    tag: 'LALL-1001-02', level: ESD_LEVEL.ESD_3,
    description: 'Level Low-Low at Production Separator (V-1001-01)',
    voting: 'LALL', effects: [10],
  },
]

export const initiatorByTag = (tag) => INITIATORS.find((i) => i.tag === tag)

/** Train order, used to stage the cascade animation left to right. */
export const UNIT_ORDER = ['wellpads', 'separator', 'producedWater', 'amine', 'dehydration', 'salesGas']
