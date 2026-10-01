/**
 * Footprint per equipment type, so a detail view can lay symbols out
 * without overlap. Kept out of EquipmentGraphic.jsx so that file exports
 * only components and stays eligible for fast refresh.
 */
import { EQUIPMENT_TYPE as T } from '../plant/topology.js'

export const SYMBOL_SIZE = {
  [T.VESSEL]: { w: 80, h: 100 },
  [T.COLUMN]: { w: 40, h: 132 },
  [T.EXCHANGER]: { w: 46, h: 60 },
  [T.AIR_COOLER]: { w: 56, h: 58 },
  [T.FIRED_HEATER]: { w: 46, h: 74 },
  [T.PUMP]: { w: 36, h: 56 },
  [T.COMPRESSOR]: { w: 62, h: 66 },
  [T.FILTER]: { w: 30, h: 62 },
  [T.WELL]: { w: 32, h: 58 },
  [T.PIG]: { w: 46, h: 46 },
  [T.METER]: { w: 46, h: 46 },
  [T.TANK]: { w: 46, h: 46 },
  [T.FLARE]: { w: 46, h: 46 },
}
