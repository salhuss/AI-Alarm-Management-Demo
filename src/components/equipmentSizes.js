/**
 * Rendered footprint per equipment type, so a unit page can place items
 * without overlap. Separate from Equipment.jsx so that file exports only
 * components and stays eligible for fast refresh.
 */
import { EQUIPMENT_TYPE as T } from '../plant/topology.js'

export const EQUIPMENT_SIZE = {
  [T.VESSEL]: { w: 230, h: 110 },
  [T.COLUMN]: { w: 90, h: 210 },
  [T.EXCHANGER]: { w: 70, h: 68 },
  [T.AIR_COOLER]: { w: 100, h: 78 },
  [T.FIRED_HEATER]: { w: 70, h: 94 },
  [T.PUMP]: { w: 70, h: 88 },
  [T.COMPRESSOR]: { w: 100, h: 88 },
  [T.FILTER]: { w: 50, h: 88 },
  [T.WELL]: { w: 50, h: 82 },
  [T.PIG]: { w: 70, h: 60 },
  [T.METER]: { w: 70, h: 60 },
  [T.TANK]: { w: 70, h: 90 },
  [T.FLARE]: { w: 70, h: 60 },
}
