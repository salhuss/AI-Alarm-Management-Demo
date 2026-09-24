/**
 * Display metadata per plant unit, keyed to UNIT_ORDER from the plant
 * dataset. Kept out of PlantTrain.jsx so that file exports only components
 * and stays eligible for fast refresh.
 */
export const UNIT_META = {
  wellpads: { label: 'Wellpads', sublabel: 'WP-01/02/03', icon: '⛽' },
  separator: { label: 'Production Separator', sublabel: 'V-1001-01', icon: '⬛' },
  producedWater: { label: 'Produced Water', sublabel: 'V-2001-01', icon: '💧' },
  amine: { label: 'Amine Sweetening', sublabel: 'C-2201-01', icon: '🧪' },
  dehydration: { label: 'Gas Dehydration', sublabel: 'C-1101-01 (TEG)', icon: '🌀' },
  salesGas: { label: 'Sales Gas', sublabel: 'U-3001-01', icon: '🔥' },
}
